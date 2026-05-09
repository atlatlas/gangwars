import { Router, Response } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { db, schema } from "../db";
import { eq, sql } from "drizzle-orm";
import { generateToken, authMiddleware, AuthRequest } from "../middleware/auth";

export const authRouter = Router();

const registerSchema = z.object({
  username: z.string().min(3).max(20).regex(/^[a-zA-Z0-9_]+$/),
  email: z.string().email(),
  password: z.string().min(6).max(100),
});

const loginSchema = z.object({
  login: z.string().min(1), // username or email
  password: z.string().min(1),
});

// POST /api/auth/register
authRouter.post("/register", async (req, res: Response) => {
  try {
    const data = registerSchema.parse(req.body);

    const existingUser = await db.query.users.findFirst({
      where: eq(schema.users.username, data.username),
    });
    if (existingUser) {
      res.status(400).json({ error: "Username already taken" });
      return;
    }

    const existingEmail = await db.query.users.findFirst({
      where: eq(schema.users.email, data.email),
    });
    if (existingEmail) {
      res.status(400).json({ error: "Email already registered" });
      return;
    }

    const passwordHash = await bcrypt.hash(data.password, 10);
    const now = new Date().toISOString();

    const result = db.insert(schema.users).values({
      username: data.username,
      email: data.email,
      passwordHash,
      lastTurnRegen: now,
      createdAt: now,
      lastActive: now,
    }).run();

    const userId = Number(result.lastInsertRowid);

    db.insert(schema.playerStats).values({
      userId,
    }).run();

    const token = generateToken(userId);
    res.status(201).json({ token, userId });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: err.errors[0].message });
      return;
    }
    console.error("Register error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// POST /api/auth/login
authRouter.post("/login", async (req, res: Response) => {
  try {
    const data = loginSchema.parse(req.body);

    const user = await db.query.users.findFirst({
      where: eq(schema.users.username, data.login),
    }) || await db.query.users.findFirst({
      where: eq(schema.users.email, data.login),
    });

    if (!user) {
      res.status(400).json({ error: "Invalid credentials" });
      return;
    }

    const valid = await bcrypt.compare(data.password, user.passwordHash);
    if (!valid) {
      res.status(400).json({ error: "Invalid credentials" });
      return;
    }

    // Update last active
    db.update(schema.users)
      .set({ lastActive: new Date().toISOString() })
      .where(eq(schema.users.id, user.id))
      .run();

    const token = generateToken(user.id);
    res.json({ token, userId: user.id });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: err.errors[0].message });
      return;
    }
    console.error("Login error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

	// GET /api/auth/me
authRouter.get("/me", authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const user = await db.query.users.findFirst({
      where: eq(schema.users.id, req.userId!),
    });

    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    const stats = await db.query.playerStats.findFirst({
      where: eq(schema.playerStats.userId, req.userId!),
    });

    // Regen calc — 4 turns per tick, 5000 cap
    const now = new Date();
    const lastRegen = new Date(user.lastTurnRegen);
    const elapsedSeconds = (now.getTime() - lastRegen.getTime()) / 1000;
    const ticks = Math.floor(elapsedSeconds / 300);
    const turnsGained = ticks * 8;
    const effectiveTurns = Math.min(user.turns + turnsGained, 5000);
    const nextTurnIn = 300 - (elapsedSeconds % 300);
    const jailTime = user.jailUntil ? Math.max(0, Math.ceil((new Date(user.jailUntil).getTime() - now.getTime()) / 60000)) : 0;
    const hospitalTime = user.hospitalUntil ? Math.max(0, Math.ceil((new Date(user.hospitalUntil).getTime() - now.getTime()) / 60000)) : 0;

    // Respect tier info
    const RESPTECT_TIERS: { min: number; title: string }[] = [
      { min: 100000, title: "Godfather" },
      { min: 50000, title: "Legend" },
      { min: 25000, title: "Untouchable" },
      { min: 10000, title: "Kingpin" },
      { min: 5000, title: "Boss" },
      { min: 2500, title: "Enforcer" },
      { min: 1000, title: "Hoodlum" },
      { min: 500, title: "Gangster" },
      { min: 100, title: "Hustler" },
      { min: 0, title: "Street Rat" },
    ];
    const respectTitle = RESPTECT_TIERS.find(t => user.respect >= t.min)?.title ?? "Street Rat";
    const respectBonuses = {
      crimeSuccessBonus: Math.min(10, Math.floor(user.respect / 1000)),
      combatIntimidation: Math.min(30, Math.floor(user.respect / 3333)),
      drugTradeBonus: Math.min(10, Math.floor(user.respect / 10000)),
    };

    // Gang info
    let gangId: number | null = null;
    let gangName: string | null = null;
    let gangTag: string | null = null;
    let gangRole: string | null = null;
    const membership = db.select()
      .from(schema.gangMembers)
      .where(eq(schema.gangMembers.userId, user.id))
      .all()[0];
    if (membership) {
      const gang = db.select()
        .from(schema.gangs)
        .where(eq(schema.gangs.id, membership.gangId))
        .all()[0];
      if (gang) {
        gangId = gang.id;
        gangName = gang.name;
        gangTag = gang.tag;
        gangRole = membership.role;
      }
    }

    // Remove password hash from response
    const { passwordHash, ...safeUser } = user;
    res.json({
      ...safeUser,
      stats,
      effectiveTurns,
      nextTurnIn: Math.ceil(nextTurnIn),
      turnsGained,
      jailTime,
      hospitalTime,
      xpNeeded: user.level * 100 + 50,
      gangId,
      gangName,
      gangTag,
      gangRole,
      respectTitle,
      respectBonuses,
      inventoryCapacity: 5 + user.level * 2,
      inventoryUsed: db.select({ count: sql<number>`count(*)` })
        .from(schema.userInventory)
        .where(eq(schema.userInventory.userId, user.id))
        .all()[0]?.count ?? 0,
    });
  } catch (err) {
    console.error("Me error:", err);
    res.status(500).json({ error: "Server error" });
  }
});
