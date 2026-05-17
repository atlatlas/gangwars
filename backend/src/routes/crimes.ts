import { Router, Response } from "express";
import { z } from "zod";
import { db, schema } from "../db";
import { eq, and, gte, inArray, sql } from "drizzle-orm";
import { authMiddleware, AuthRequest, hpCheck } from "../middleware/auth";
import { refreshTurns } from "./turns";
import { logActivityEvent } from "./activityEvents";
import { applyArsenalDurabilityLoss, getUserGangId } from "../utils/arsenalDurability";
import { addGangReputation, recordGangDailyTask } from "../utils/gangReputation";
import { getCrimeRespectBonus } from "../utils/respect";
import { parseItemEffects } from "../utils/itemEffects";

interface CrimeBonuses {
  crimeBonus: number;
  arrestReduction: number;
}

function getCrimeBonuses(userId: number): CrimeBonuses {
  const invRows = db.select({
    inventory: schema.userInventory,
    item: schema.items,
  })
  .from(schema.userInventory)
  .innerJoin(schema.items, eq(schema.userInventory.itemId, schema.items.id))
  .where(and(eq(schema.userInventory.userId, userId), eq(schema.userInventory.equipped, true)))
  .all();

  // Equipped weapon
  const weaponRow = invRows.find((r) => r.item.type === "arm");
  // All footmen (not equipped per se, just owned)
  const footmenRows = db.select({
    inventory: schema.userInventory,
    item: schema.items,
  })
  .from(schema.userInventory)
  .innerJoin(schema.items, eq(schema.userInventory.itemId, schema.items.id))
  .where(and(eq(schema.userInventory.userId, userId), eq(schema.items.type, "footman")))
  .all();

  let crimeBonus = 0;
  let arrestReduction = 0;

  if (weaponRow) {
    const effects = parseItemEffects(weaponRow.item.effects);
    crimeBonus += effects.crimeBonus ?? 0;
  }

  // Group footmen by itemId to cap each type at 3 effective copies
  const footmenByType = new Map<number, { count: number; bonus: number; reduction: number }>();
  for (const f of footmenRows) {
    const effects = parseItemEffects(f.item.effects);
    const entry = footmenByType.get(f.item.id) || { count: 0, bonus: 0, reduction: 0 };
    entry.count++;
    entry.bonus += effects.crimeBonus ?? 0;
    entry.reduction += effects.arrestReduction ?? 0;
    footmenByType.set(f.item.id, entry);
  }
  // Apply cap: each footman type contributes at most 3 copies worth
  for (const entry of footmenByType.values()) {
    const capRatio = Math.min(entry.count, 3) / entry.count;
    crimeBonus += entry.bonus * capRatio;
    arrestReduction += entry.reduction * capRatio;
  }

  // Add turf crime bonuses (gang districts)
  const memberRow = db.select({ gangId: schema.gangMembers.gangId })
    .from(schema.gangMembers)
    .where(eq(schema.gangMembers.userId, userId))
    .all()[0];
  if (memberRow) {
    const gangTurfRows = db.select({ districtId: schema.gangTurf.districtId })
      .from(schema.gangTurf)
      .where(and(eq(schema.gangTurf.gangId, memberRow.gangId), sql`${schema.gangTurf.challengedBy} IS NULL`))
      .all();
    if (gangTurfRows.length > 0) {
      const districtIds = gangTurfRows.map(t => t.districtId);
      const districtBonuses = db.select({ crimeBonus: schema.turfDistricts.crimeBonus })
        .from(schema.turfDistricts)
        .where(inArray(schema.turfDistricts.id, districtIds))
        .all();
      for (const d of districtBonuses) {
        crimeBonus += d.crimeBonus;
      }
    }
  }

  return { crimeBonus, arrestReduction };
}

export const crimesRouter = Router();

// Helper: deduct turns
function useTurns(userId: number, currentTurns: number, cost: number): boolean {
  if (currentTurns < cost) return false;
  db.update(schema.users)
    .set({ turns: currentTurns - cost })
    .where(eq(schema.users.id, userId))
    .run();
  return true;
}

// Helper: success calculation with item bonuses
function calcSuccess(
  user: typeof schema.users.$inferSelect,
  crime: typeof schema.crimeDefinitions.$inferSelect,
  bonuses: CrimeBonuses = { crimeBonus: 0, arrestReduction: 0 }
): number {
  const statValue = user[crime.statUsed as keyof typeof user] as number;
  const baseChance = (statValue / crime.baseDifficulty) * 50 + user.level * 0.2 + 20 + bonuses.crimeBonus;
  const respectBonus = getCrimeRespectBonus(user.respect);
  return Math.min(95, Math.max(5, Math.round(baseChance + respectBonus)));
}

// GET /api/crimes — list available crimes
crimesRouter.get("/", authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const user = await db.query.users.findFirst({
      where: eq(schema.users.id, req.userId!),
    });
    if (!user) { res.status(404).json({ error: "User not found" }); return; }

    const refreshedTurns = refreshTurns(user);
    const bonuses = getCrimeBonuses(user.id);
    const allCrimes = await db.query.crimeDefinitions.findMany({
      where: gte(schema.crimeDefinitions.minLevel, 0),
      orderBy: schema.crimeDefinitions.minLevel,
    });

    const available = allCrimes
      .filter((c) => user.level >= c.minLevel)
      .map((c) => ({
        ...c,
        successChance: calcSuccess(user, c, bonuses),
      }));

    // Separate locked (level too low) crimes
    const locked = allCrimes
      .filter((c) => user.level < c.minLevel)
      .map((c) => ({
        ...c,
        successChance: 0,
      }));

    // Player crime statistics
    const stats = db.select({
      totalCrimes: sql<number>`COUNT(*)`,
      totalSuccesses: sql<number>`SUM(CASE WHEN ${schema.crimeLog.success} = 1 THEN 1 ELSE 0 END)`,
      totalCash: sql<number>`COALESCE(SUM(${schema.crimeLog.reward}), 0)`,
    })
      .from(schema.crimeLog)
      .where(eq(schema.crimeLog.userId, req.userId!))
      .all()[0];

    res.json({ turns: refreshedTurns, crimes: available, locked, stats });
  } catch (err) {
    console.error("Crimes list error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// POST /api/crimes/:id/commit
crimesRouter.post("/:id/commit", authMiddleware, hpCheck, async (req: AuthRequest, res: Response) => {
  try {
    const crimeId = parseInt(req.params.id as string);
    const { times } = z.object({
      times: z.number().int().min(1).max(500).default(1),
    }).parse(req.body);

    const user = await db.query.users.findFirst({
      where: eq(schema.users.id, req.userId!),
    });
    if (!user) { res.status(404).json({ error: "User not found" }); return; }

    const crime = await db.query.crimeDefinitions.findFirst({
      where: eq(schema.crimeDefinitions.id, crimeId),
    });
    if (!crime) { res.status(404).json({ error: "Crime not found" }); return; }

    if (user.level < crime.minLevel) {
      res.status(400).json({ error: "Level too low for this crime" });
      return;
    }

    // Check jail
    if (user.jailUntil && new Date(user.jailUntil) > new Date()) {
      res.status(400).json({ error: "You're in jail! Wait for release." });
      return;
    }

    const refreshedTurns = refreshTurns(user);
    const totalTurnCost = crime.turnCost * times;
    if (refreshedTurns < totalTurnCost) {
      res.status(400).json({ error: `Not enough turns. Need ${totalTurnCost}.` });
      return;
    }

    // Deduct total turns once
    useTurns(user.id, refreshedTurns, totalTurnCost);
    const bonuses = getCrimeBonuses(user.id);

    let totalSuccesses = 0;
    let totalFailures = 0;
    let totalReward = 0;
    let totalXpGained = 0;
    let totalHpLost = 0;
    let totalArrests = 0;
    let totalRespectGained = 0;
    let drugsConfiscatedFinal: { name: string; quantity: number } | null = null;

    // Track mutable state in-memory instead of re-fetching every iteration
    let mutableHp = user.hp;
    let mutableJailUntil = user.jailUntil;

    for (let i = 0; i < times; i++) {
      if (mutableJailUntil && new Date(mutableJailUntil) > new Date()) break;
      if (mutableHp <= 0) break;

      const successChance = calcSuccess(user, crime, bonuses);
      const success = Math.random() * 100 < successChance;

      let reward = 0;
      let xpGained = 0;
      let arrested = false;
      let hpLost = 0;
      let drugsConfiscated: { name: string; quantity: number } | null = null;

      if (success) {
        reward = crime.rewardMin + Math.floor(Math.random() * (crime.rewardMax - crime.rewardMin));
        xpGained = Math.floor(reward * 0.1 + crime.turnCost * 5);

        let respectGained = 0;
        if (crime.riskLevel === "low") respectGained = 1 + Math.floor(Math.random() * 3);
        else if (crime.riskLevel === "medium") respectGained = 3 + Math.floor(Math.random() * 6);
        else respectGained = 8 + Math.floor(Math.random() * 8);
        respectGained += Math.floor(user.level / 10);
        totalRespectGained += respectGained;

        user.cash += reward;
        user.xp += xpGained;
        user.respect += respectGained;

        // Log big scores to activity feed
        if (reward >= 10000) {
          logActivityEvent(user.id, "crime_score",
            `Pulled off a ${crime.name} and earned $${reward.toLocaleString()}!`,
            { crimeName: crime.name, reward });
        }
      } else {
        // Failure
        if (crime.riskLevel === "low") {
          hpLost = 5 + Math.floor(Math.random() * 10);
        } else if (crime.riskLevel === "medium") {
          hpLost = 15 + Math.floor(Math.random() * 15);
          const cashLost = Math.floor(Math.max(0, user.cash) * (0.1 + Math.random() * 0.1));
          user.cash = Math.max(0, user.cash - cashLost);
        } else {
          hpLost = 30 + Math.floor(Math.random() * 20);
          if (Math.random() < 0.3) {
            const jailMinutes = 10 + Math.floor(Math.random() * 20);
            arrested = true;
            mutableJailUntil = new Date(Date.now() + jailMinutes * 60000).toISOString();
            db.update(schema.users)
              .set({ jailUntil: mutableJailUntil })
              .where(eq(schema.users.id, user.id))
              .run();

            logActivityEvent(user.id, "crime_arrested",
              `Got arrested attempting ${crime.name}! Sentenced to ${jailMinutes} minutes.`,
              { crimeName: crime.name, jailMinutes });
          }
          const cashLost = Math.floor(Math.max(0, user.cash) * (0.15 + Math.random() * 0.15));
          user.cash = Math.max(0, user.cash - cashLost);
        }

        // Apply HP loss (keep DB write for crash recovery)
        const newHp = Math.max(0, mutableHp - hpLost);
        mutableHp = newHp;
        db.update(schema.users)
          .set({ hp: newHp })
          .where(eq(schema.users.id, user.id))
          .run();

        // Drug confiscation on failure
        const drugInv = db.select({
          inventory: schema.userInventory,
          item: schema.items,
        })
        .from(schema.userInventory)
        .innerJoin(schema.items, eq(schema.userInventory.itemId, schema.items.id))
        .where(and(eq(schema.userInventory.userId, user.id), eq(schema.items.type, "drug")))
        .all();

        let confiscationChance = 0.3;
        const chemSkill = db.select()
          .from(schema.userSkills)
          .innerJoin(schema.skillDefinitions, eq(schema.userSkills.skillId, schema.skillDefinitions.id))
          .where(and(eq(schema.userSkills.userId, user.id), eq(schema.skillDefinitions.name, "Chemistry")))
          .all()[0];
        if (chemSkill) {
          confiscationChance = 0.3 * Math.max(0.1, 1 - chemSkill.user_skills.level * 0.005);
        }

        if (drugInv.length > 0) {
          if (arrested) {
            for (const d of drugInv) {
              drugsConfiscated = { name: d.item.name, quantity: d.inventory.quantity };
              db.delete(schema.userInventory).where(eq(schema.userInventory.id, d.inventory.id)).run();
            }
          } else if (Math.random() < confiscationChance) {
            const randomDrug = drugInv[Math.floor(Math.random() * drugInv.length)];
            const lostQty = Math.max(1, Math.ceil(randomDrug.inventory.quantity * (0.2 + Math.random() * 0.3)));
            const remaining = randomDrug.inventory.quantity - lostQty;
            drugsConfiscated = { name: randomDrug.item.name, quantity: lostQty };
            if (remaining <= 0) {
              db.delete(schema.userInventory).where(eq(schema.userInventory.id, randomDrug.inventory.id)).run();
            } else {
              db.update(schema.userInventory).set({ quantity: remaining }).where(eq(schema.userInventory.id, randomDrug.inventory.id)).run();
            }
          }
        }

        if (drugsConfiscated) {
          logActivityEvent(user.id, "crime_drugs_confiscated",
            `Had ${drugsConfiscated.quantity}x ${drugsConfiscated.name} confiscated during a failed ${crime.name}`,
            { crimeName: crime.name, drugName: drugsConfiscated.name, quantity: drugsConfiscated.quantity });
        }
      }

      // Log crime
      db.insert(schema.crimeLog).values({
        userId: user.id,
        crimeId: crime.id,
        success,
        reward,
        xpGained,
        createdAt: new Date().toISOString(),
      }).run();

      totalSuccesses += success ? 1 : 0;
      totalFailures += success ? 0 : 1;
      totalReward += reward;
      totalXpGained += xpGained;
      totalHpLost += hpLost;
      if (arrested) totalArrests++;
      if (drugsConfiscated) drugsConfiscatedFinal = drugsConfiscated;

      // Stop if arrested
      if (arrested) break;
    }

    // Batch-write accumulated cash/xp/respect
    db.update(schema.users)
      .set({ cash: user.cash, xp: user.xp, respect: user.respect })
      .where(eq(schema.users.id, user.id))
      .run();

    // Update player stats
    const pStats = await db.query.playerStats.findFirst({
      where: eq(schema.playerStats.userId, user.id),
    });
    if (pStats) {
      db.update(schema.playerStats)
        .set({
          crimesCommitted: pStats.crimesCommitted + totalSuccesses + totalFailures,
          totalMoneyEarned: pStats.totalMoneyEarned + totalReward,
          timesArrested: pStats.timesArrested + totalArrests,
          earnedCrimes: pStats.earnedCrimes + totalReward,
          respectCrimes: pStats.respectCrimes + totalRespectGained,
        })
        .where(eq(schema.playerStats.userId, user.id))
        .run();
    }

    // Arsenal durability loss (once per batch)
    const gangId = getUserGangId(user.id);
    if (gangId) {
      applyArsenalDurabilityLoss(user.id, gangId, `crime: ${crime.name} (x${times})`);
    }

    // Gang reputation grant (once per batch, with total reward)
    if (totalReward > 0) {
      const repGain = Math.floor(totalReward / 100) + 1;
      addGangReputation(user.id, repGain, "earn_cash", totalReward);
      addGangReputation(user.id, 0, "crimes", totalSuccesses + totalFailures);
    }

    // Auto-track gang daily task for crime-type operations (once)
    recordGangDailyTask(user.id, "crime");

    // Get final user state for level-up check
    const finalUser = await db.query.users.findFirst({
      where: eq(schema.users.id, req.userId!),
    });
    if (!finalUser) { res.status(404).json({ error: "User not found" }); return; }

    // Level-up check
    let levelsGained = 0;
    let remainingXp = finalUser.xp;
    let newLevel = finalUser.level;
    let newMaxHp = finalUser.maxHp;
    let newStatPoints = finalUser.statPoints;
    let newTurns = finalUser.turns;

    while (remainingXp >= newLevel * 100 + 50) {
      remainingXp -= (newLevel * 100 + 50);
      newLevel++;
      newMaxHp += 20;
      newStatPoints += 1;
      newTurns = Math.min(newTurns + 20, 5000);
      levelsGained++;
    }

    if (levelsGained > 0) {
      db.update(schema.users)
        .set({
          level: newLevel,
          xp: remainingXp,
          statPoints: newStatPoints,
          turns: newTurns,
          maxHp: newMaxHp,
          hp: newMaxHp,
        })
        .where(eq(schema.users.id, user.id))
        .run();

      logActivityEvent(user.id, "level_up",
        `Reached level ${newLevel}!`,
        { levelsGained, oldLevel: finalUser.level, newLevel });
    }

    res.json({
      success: totalSuccesses > 0,
      totalSuccesses,
      totalFailures,
      crimeName: crime.name,
      reward: totalReward,
      xpGained: totalXpGained,
      hpLost: totalHpLost,
      arrested: totalArrests > 0,
      totalArrests,
      leveledUp: levelsGained > 0,
      newLevel: levelsGained > 0 ? newLevel : finalUser.level,
      turnsLeft: Math.max(0, refreshedTurns - totalTurnCost),
      drugsConfiscated: drugsConfiscatedFinal,
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: err.errors[0].message });
      return;
    }
    console.error("Commit crime error:", err);
    res.status(500).json({ error: "Server error" });
  }
});
