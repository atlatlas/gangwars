import { Router, Response } from "express";
import { db, schema } from "../db";
import { eq, and, sql } from "drizzle-orm";
import { authMiddleware, AuthRequest, jailCheck, hpCheck } from "../middleware/auth";

export const skillCrimesRouter = Router();

// Map crime name → skill name for difficulty scaling
const CRIME_SKILL_MAP: Record<string, string> = {
  Lockpicking: "Lockpicking",
  Pickpocketing: "Pickpocketing",
  "Safe Cracking": "Safe Cracking",
  "Data Heist": "Hacking",
};

// Map crime name → stat name
const CRIME_STAT_MAP: Record<string, "agility" | "intelligence"> = {
  Lockpicking: "agility",
  Pickpocketing: "agility",
  "Safe Cracking": "intelligence",
  "Data Heist": "intelligence",
};

// GET /api/skill-crimes — list all skill crimes
skillCrimesRouter.get("/skill-crimes", authMiddleware, (req: AuthRequest, res: Response) => {
  try {
    const user = db.select().from(schema.users).where(eq(schema.users.id, req.userId!)).all()[0];
    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    // Fetch all skill definitions and user's skill levels
    const allSkillDefs = db.select().from(schema.skillDefinitions).all();
    const userSkillRows = db.select()
      .from(schema.userSkills)
      .where(eq(schema.userSkills.userId, user.id))
      .all();

    // Build skill name → level map
    const skillLevelMap = new Map<string, number>();
    for (const sk of allSkillDefs) {
      const us = userSkillRows.find((r) => r.skillId === sk.id);
      skillLevelMap.set(sk.name, us?.level ?? 0);
    }

    const allCrimes = db.select().from(schema.skillCrimeDefinitions).all();

    const enrich = (c: typeof allCrimes[number]) => ({
      id: c.id,
      name: c.name,
      description: c.description,
      minLevel: c.minLevel,
      turnCost: c.turnCost,
      rewardMin: c.rewardMin,
      rewardMax: c.rewardMax,
      timingSpeed: c.timingSpeed,
      statUsed: CRIME_STAT_MAP[c.name] || "agility",
      skillLevel: skillLevelMap.get(CRIME_SKILL_MAP[c.name]) ?? 0,
      statValue: user[CRIME_STAT_MAP[c.name] || "agility"] as number,
    });

    const crimes = allCrimes.filter((c) => user.level >= c.minLevel).map(enrich);
    const locked = allCrimes.filter((c) => user.level < c.minLevel).map(enrich);

    res.json({ turns: user.turns, crimes, locked });
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

    // Calculate reward based on accuracy (no reward below 40% — the success threshold)
    let reward: number;
    if (accuracy < 40) {
      reward = 0;
    } else {
      const range = crime.rewardMax - crime.rewardMin;
      reward = crime.rewardMin + Math.floor(range * ((accuracy - 40) / 60));
    }

    // XP: 10% of reward + accuracy bonus (up to 50% extra for perfect)
    const accuracyBonus = 1 + (accuracy / 100) * 0.5;
    const xpGained = accuracy < 40 ? 0 : Math.max(1, Math.floor(reward * 0.1 * accuracyBonus));

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
