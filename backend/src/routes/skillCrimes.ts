import { Router, Response } from "express";
import { db, schema } from "../db";
import { eq, sql } from "drizzle-orm";
import { authMiddleware, AuthRequest, jailCheck, hpCheck } from "../middleware/auth";

export const skillCrimesRouter = Router();

// GET /api/skill-crimes — list all skill crimes
skillCrimesRouter.get("/skill-crimes", authMiddleware, (req: AuthRequest, res: Response) => {
  try {
    const user = db.select().from(schema.users).where(eq(schema.users.id, req.userId!)).all()[0];
    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    const allCrimes = db.select().from(schema.skillCrimeDefinitions).all();

    const available = allCrimes.filter((c) => user.level >= c.minLevel);
    const locked = allCrimes.filter((c) => user.level < c.minLevel);

    res.json({ turns: user.turns, crimes: available, locked });
  } catch (err) {
    console.error("Skill crimes list error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// POST /api/skill-crimes/:id/attempt — attempt a skill crime with your accuracy score
skillCrimesRouter.post("/skill-crimes/:id/attempt", authMiddleware, jailCheck, hpCheck, (req: AuthRequest, res: Response) => {
  try {
    const crimeId = parseInt(req.params.id as string);
    const { accuracy } = req.body;

    if (accuracy == null || typeof accuracy !== "number" || accuracy < 0 || accuracy > 100) {
      res.status(400).json({ error: "Accuracy must be a number between 0 and 100" });
      return;
    }

    const user = db.select().from(schema.users).where(eq(schema.users.id, req.userId!)).all()[0];
    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    const crime = db.select().from(schema.skillCrimeDefinitions).where(eq(schema.skillCrimeDefinitions.id, crimeId)).all()[0];
    if (!crime) {
      res.status(404).json({ error: "Skill crime not found" });
      return;
    }

    if (user.level < crime.minLevel) {
      res.status(400).json({ error: "Your level is too low for this crime" });
      return;
    }

    if (user.turns < crime.turnCost) {
      res.status(400).json({ error: "Not enough turns" });
      return;
    }

    // Calculate reward based on accuracy
    const range = crime.rewardMax - crime.rewardMin;
    const reward = crime.rewardMin + Math.floor(range * (accuracy / 100));

    // XP: 10% of reward + accuracy bonus (up to 50% extra for perfect)
    const accuracyBonus = 1 + (accuracy / 100) * 0.5;
    const xpGained = Math.max(1, Math.floor(reward * 0.1 * accuracyBonus));

    // Award result text based on accuracy
    let resultText: string;
    if (accuracy >= 95) resultText = "Perfect";
    else if (accuracy >= 80) resultText = "Great";
    else if (accuracy >= 60) resultText = "Good";
    else if (accuracy >= 40) resultText = "Decent";
    else resultText = "Sloppy";

    // Deduct turns
    db.update(schema.users)
      .set({ turns: sql`turns - ${crime.turnCost}` })
      .where(eq(schema.users.id, user.id))
      .run();

    // Award cash
    db.update(schema.users)
      .set({ cash: sql`cash + ${reward}` })
      .where(eq(schema.users.id, user.id))
      .run();

    // Award XP with level-up check (matching crimes.ts logic: newLevel * 100 + 50 threshold)
    const remainingXp = user.xp + xpGained;
    const xpNeeded = user.level * 100 + 50;
    let leveledUp = false;
    let newLevel = user.level;

    if (remainingXp >= xpNeeded) {
      leveledUp = true;
      newLevel = user.level + 1;
      db.update(schema.users)
        .set({
          level: newLevel,
          xp: remainingXp - xpNeeded,
          statPoints: sql`stat_points + 1`,
          maxHp: sql`max_hp + 20`,
          hp: sql`hp + 20`,
        })
        .where(eq(schema.users.id, user.id))
        .run();
    } else {
      db.update(schema.users)
        .set({ xp: remainingXp })
        .where(eq(schema.users.id, user.id))
        .run();
    }

    // Log the attempt
    db.insert(schema.skillCrimeLog).values({
      userId: user.id,
      crimeId: crime.id,
      accuracy,
      reward,
      xpGained,
      createdAt: new Date().toISOString(),
    }).run();

    // Get fresh turn count
    const updated = db.select({ turns: schema.users.turns }).from(schema.users).where(eq(schema.users.id, user.id)).all()[0];

    res.json({
      success: accuracy >= 40,
      crimeName: crime.name,
      result: resultText,
      reward,
      xpGained,
      accuracy,
      leveledUp,
      newLevel,
      turnsLeft: updated?.turns ?? 0,
    });
  } catch (err) {
    console.error("Skill crime attempt error:", err);
    res.status(500).json({ error: "Server error" });
  }
});
