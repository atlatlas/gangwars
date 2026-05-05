import { Router, Response } from "express";
import { z } from "zod";
import { db, schema } from "../db";
import { eq, and, sql } from "drizzle-orm";
import { authMiddleware, AuthRequest } from "../middleware/auth";

// ─── Warfare Rating Helpers ───

function getSkillLevel(userId: number, skillName: string): number {
  const skill = db.select({ level: schema.userSkills.level })
    .from(schema.userSkills)
    .innerJoin(schema.skillDefinitions, eq(schema.userSkills.skillId, schema.skillDefinitions.id))
    .where(and(eq(schema.userSkills.userId, userId), eq(schema.skillDefinitions.name, skillName)))
    .all()[0];
  return skill?.level ?? 0;
}

function calcWarfareRatings(userId: number, user: typeof schema.users.$inferSelect) {
  const guerrilla = getSkillLevel(userId, "Guerrilla Warfare");
  const chemistry = getSkillLevel(userId, "Chemistry");
  const sixthSense = getSkillLevel(userId, "Sixth Sense");
  const womensStudies = getSkillLevel(userId, "Women's Studies");
  const sexualEd = getSkillLevel(userId, "Sexual Education");

  let thug = user.strength * 2 + guerrilla * 3;
  let dealer = user.intelligence * 2 + chemistry * 2 + sixthSense * 1;
  let pimp = user.charisma * 2 + sexualEd * 3 + womensStudies * 2;

  // Specialization bonus
  if (user.specialization === "enforcer") thug = Math.round(thug * 1.1);
  if (user.specialization === "dealer") dealer = Math.round(dealer * 1.1);
  if (user.specialization === "hacker") pimp = Math.round(pimp * 1.1);

  return { thug, dealer, pimp, highest: Math.max(thug, dealer, pimp) };
}

const AVATAR_MAX_LENGTH = 2000000; // 2MB for base64 data URL

export const profileRouter = Router();

// GET /api/profile — current user full profile
profileRouter.get("/", authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const user = await db.query.users.findFirst({
      where: eq(schema.users.id, req.userId!),
    });
    if (!user) { res.status(404).json({ error: "User not found" }); return; }

    const stats = await db.query.playerStats.findFirst({
      where: eq(schema.playerStats.userId, req.userId!),
    });

    // Regen calc — 4 turns per tick, 5000 cap
    const now = new Date();
    const lastRegen = new Date(user.lastTurnRegen);
    const elapsedSeconds = (now.getTime() - lastRegen.getTime()) / 1000;
    const ticks = Math.floor(elapsedSeconds / 300);
    const turnsGained = ticks * 4;
    const effectiveTurns = Math.min(user.turns + turnsGained, 5000);
    const nextTurnIn = 300 - (elapsedSeconds % 300);
    const jailTime = user.jailUntil ? Math.max(0, Math.ceil((new Date(user.jailUntil).getTime() - now.getTime()) / 60000)) : 0;
    const hospitalTime = user.hospitalUntil ? Math.max(0, Math.ceil((new Date(user.hospitalUntil).getTime() - now.getTime()) / 60000)) : 0;

    const { passwordHash, ...safeUser } = user;

    // Inventory info
    const inventoryCount = db.select({ count: sql<number>`count(*)` })
      .from(schema.userInventory)
      .where(eq(schema.userInventory.userId, user.id))
      .all()[0]?.count ?? 0;
    const inventoryCapacity = 5 + user.level * 2;

    const equippedWeaponRow = db.select({
      inventory: schema.userInventory,
      item: schema.items,
    })
      .from(schema.userInventory)
      .innerJoin(schema.items, eq(schema.userInventory.itemId, schema.items.id))
      .where(and(eq(schema.userInventory.userId, user.id), eq(schema.userInventory.equipped, true)))
      .all();

    const equippedWeapon = equippedWeaponRow.length > 0
      ? { name: equippedWeaponRow[0].item.name, id: equippedWeaponRow[0].item.id }
      : null;

    const footmenCount = db.select({ count: sql<number>`count(*)` })
      .from(schema.userInventory)
      .innerJoin(schema.items, eq(schema.userInventory.itemId, schema.items.id))
      .where(and(eq(schema.userInventory.userId, user.id), eq(schema.items.type, "footman")))
      .all()[0]?.count ?? 0;

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

    res.json({
      ...safeUser,
      effectiveTurns,
      nextTurnIn: Math.ceil(nextTurnIn),
      turnsGained,
      stats,
      jailTime,
      hospitalTime,
      xpNeeded: user.level * 100 + 50,
      inventoryCapacity,
      inventoryUsed: inventoryCount,
      equippedWeapon,
      footmenCount,
      gangId,
      gangName,
      gangTag,
      gangRole,
    });
  } catch (err) {
    console.error("Profile error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// POST /api/profile/assign-stats
const assignStatsSchema = z.object({
  strength: z.number().int().min(0).optional(),
  agility: z.number().int().min(0).optional(),
  intelligence: z.number().int().min(0).optional(),
  charisma: z.number().int().min(0).optional(),
  endurance: z.number().int().min(0).optional(),
});

profileRouter.post("/assign-stats", authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const data = assignStatsSchema.parse(req.body);
    const user = await db.query.users.findFirst({
      where: eq(schema.users.id, req.userId!),
    });
    if (!user) { res.status(404).json({ error: "User not found" }); return; }

    const totalPoints = (data.strength || 0) + (data.agility || 0) + (data.intelligence || 0) + (data.charisma || 0) + (data.endurance || 0);

    if (totalPoints > user.statPoints) {
      res.status(400).json({ error: "Not enough stat points" });
      return;
    }

    // Check caps
    const maxStat = 100;
    const newStr = Math.min(user.strength + (data.strength || 0), maxStat);
    const newAgi = Math.min(user.agility + (data.agility || 0), maxStat);
    const newInt = Math.min(user.intelligence + (data.intelligence || 0), maxStat);
    const newCha = Math.min(user.charisma + (data.charisma || 0), maxStat);
    const newEnd = Math.min(user.endurance + (data.endurance || 0), maxStat);

    db.update(schema.users)
      .set({
        strength: newStr,
        agility: newAgi,
        intelligence: newInt,
        charisma: newCha,
        endurance: newEnd,
        maxHp: 50 + newEnd * 5,
        statPoints: user.statPoints - totalPoints,
      })
      .where(eq(schema.users.id, user.id))
      .run();

    res.json({
      strength: newStr,
      agility: newAgi,
      intelligence: newInt,
      charisma: newCha,
      endurance: newEnd,
      statPoints: user.statPoints - totalPoints,
      maxHp: 50 + newEnd * 5,
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: err.errors[0].message });
      return;
    }
    console.error("Assign stats error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// POST /api/profile/heal — heal HP using cash
profileRouter.post("/heal", authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const user = await db.query.users.findFirst({
      where: eq(schema.users.id, req.userId!),
    });
    if (!user) { res.status(404).json({ error: "User not found" }); return; }

    if (user.hp >= user.maxHp) {
      res.status(400).json({ error: "Already at full HP" });
      return;
    }

    const hpMissing = user.maxHp - user.hp;
    const costPerHp = 2;
    const totalCost = hpMissing * costPerHp;

    if (user.cash < totalCost) {
      res.status(400).json({ error: "Not enough cash to heal" });
      return;
    }

    db.update(schema.users)
      .set({
        hp: user.maxHp,
        cash: user.cash - totalCost,
      })
      .where(eq(schema.users.id, user.id))
      .run();

    res.json({ hp: user.maxHp, cash: user.cash - totalCost, cost: totalCost });
  } catch (err) {
    console.error("Heal error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// POST /api/profile/avatar — update avatar (base64 data URL)
const avatarSchema = z.object({
  avatarUrl: z.string().max(AVATAR_MAX_LENGTH).nullable(),
});

profileRouter.post("/avatar", authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { avatarUrl } = avatarSchema.parse(req.body);
    db.update(schema.users)
      .set({ avatarUrl })
      .where(eq(schema.users.id, req.userId!))
      .run();
    res.json({ avatarUrl });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: err.errors[0].message });
      return;
    }
    console.error("Avatar error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// GET /api/profile/warfare — warfare ratings
profileRouter.get("/warfare", authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const user = await db.query.users.findFirst({
      where: eq(schema.users.id, req.userId!),
    });
    if (!user) { res.status(404).json({ error: "User not found" }); return; }

    const ratings = calcWarfareRatings(user.id, user);
    res.json(ratings);
  } catch (err) {
    console.error("Warfare error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// POST /api/profile/choose-specialization — one-time specialization choice
const chooseSpecSchema = z.object({
  specialization: z.enum(["enforcer", "dealer", "hacker"]),
});

profileRouter.post("/choose-specialization", authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { specialization } = chooseSpecSchema.parse(req.body);
    const user = await db.query.users.findFirst({
      where: eq(schema.users.id, req.userId!),
    });
    if (!user) { res.status(404).json({ error: "User not found" }); return; }

    if (user.specialization) {
      res.status(400).json({ error: "Specialization already chosen — cannot change" });
      return;
    }

    db.update(schema.users)
      .set({ specialization })
      .where(eq(schema.users.id, user.id))
      .run();

    res.json({ specialization });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: err.errors[0].message });
      return;
    }
    console.error("Specialization error:", err);
    res.status(500).json({ error: "Server error" });
  }
});
