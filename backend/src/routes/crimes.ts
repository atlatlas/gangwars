import { Router, Response } from "express";
import { z } from "zod";
import { db, schema } from "../db";
import { eq, and, gte } from "drizzle-orm";
import { authMiddleware, AuthRequest } from "../middleware/auth";
import { refreshTurns } from "./turns";

interface ItemEffects {
  crimeBonus?: number;
  pvpPower?: number;
  arrestReduction?: number;
}

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
    try {
      const effects = JSON.parse(weaponRow.item.effects) as ItemEffects;
      crimeBonus += effects.crimeBonus ?? 0;
    } catch {}
  }

  for (const f of footmenRows) {
    try {
      const effects = JSON.parse(f.item.effects) as ItemEffects;
      crimeBonus += effects.crimeBonus ?? 0;
      arrestReduction += effects.arrestReduction ?? 0;
    } catch {}
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
  return Math.min(95, Math.max(5, Math.round(baseChance)));
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

    res.json({ turns: refreshedTurns, crimes: available, locked });
  } catch (err) {
    console.error("Crimes list error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// POST /api/crimes/:id/commit
crimesRouter.post("/:id/commit", authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const crimeId = parseInt(req.params.id as string);
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
    if (refreshedTurns < crime.turnCost) {
      res.status(400).json({ error: "Not enough turns" });
      return;
    }

    // Re-fetch user after refreshTurns to get updated HP/cash
    const freshUser = await db.query.users.findFirst({
      where: eq(schema.users.id, req.userId!),
    });
    if (!freshUser) { res.status(404).json({ error: "User not found" }); return; }
    // Update the user object with fresh values
    (user as any).hp = freshUser.hp;
    (user as any).cash = freshUser.cash;
    (user as any).xp = freshUser.xp;

    // Commit crime
    useTurns(user.id, refreshedTurns, crime.turnCost);

    const bonuses = getCrimeBonuses(user.id);
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

      db.update(schema.users)
        .set({
          cash: user.cash + reward,
          xp: user.xp + xpGained,
        })
        .where(eq(schema.users.id, user.id))
        .run();

      // Update player stats
      const pStats = await db.query.playerStats.findFirst({
        where: eq(schema.playerStats.userId, user.id),
      });
      if (pStats) {
        db.update(schema.playerStats)
          .set({
            crimesCommitted: pStats.crimesCommitted + 1,
            totalMoneyEarned: pStats.totalMoneyEarned + reward,
          })
          .where(eq(schema.playerStats.userId, user.id))
          .run();
      }
    } else {
      // Failure
      if (crime.riskLevel === "low") {
        hpLost = 5 + Math.floor(Math.random() * 10);
      } else if (crime.riskLevel === "medium") {
        hpLost = 15 + Math.floor(Math.random() * 15);
        // Lose some cash
        const cashLost = Math.floor(user.cash * (0.1 + Math.random() * 0.1));
        db.update(schema.users)
          .set({ cash: Math.max(0, user.cash - cashLost) })
          .where(eq(schema.users.id, user.id))
          .run();
      } else {
        hpLost = 30 + Math.floor(Math.random() * 20);
        // Possible arrest
        if (Math.random() < 0.3) {
          const jailMinutes = 10 + Math.floor(Math.random() * 20);
          arrested = true;
          const jailUntil = new Date(Date.now() + jailMinutes * 60000).toISOString();
          db.update(schema.users)
            .set({ jailUntil })
            .where(eq(schema.users.id, user.id))
            .run();
        }
        const cashLost = Math.floor(user.cash * (0.15 + Math.random() * 0.15));
        db.update(schema.users)
          .set({ cash: Math.max(0, user.cash - cashLost) })
          .where(eq(schema.users.id, user.id))
          .run();
      }

      // Apply HP loss
      const newHp = Math.max(0, user.hp - hpLost);
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

      // Chemistry skill reduces confiscation rate
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
          // Confiscate ALL drugs on arrest
          for (const d of drugInv) {
            drugsConfiscated = { name: d.item.name, quantity: d.inventory.quantity };
            db.delete(schema.userInventory).where(eq(schema.userInventory.id, d.inventory.id)).run();
          }
        } else if (Math.random() < confiscationChance) {
          // Chance to lose some of a random drug
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

      // Update stats
      const pStats = await db.query.playerStats.findFirst({
        where: eq(schema.playerStats.userId, user.id),
      });
      if (pStats) {
        db.update(schema.playerStats)
          .set({
            crimesCommitted: pStats.crimesCommitted + 1,
            timesArrested: arrested ? pStats.timesArrested + 1 : pStats.timesArrested,
          })
          .where(eq(schema.playerStats.userId, user.id))
          .run();
      }
    }

    // Log crime
    const now = new Date().toISOString();
    db.insert(schema.crimeLog).values({
      userId: user.id,
      crimeId: crime.id,
      success,
      reward,
      xpGained,
      createdAt: now,
    }).run();

    // Check level up (loop to handle multiple level-ups)
    let levelsGained = 0;
    let remainingXp = user.xp + (success ? xpGained : 0);
    let newLevel = user.level;
    let newMaxHp = user.maxHp;
    let newStatPoints = user.statPoints;
    let newTurnsAfterLevel = Math.max(0, refreshedTurns - crime.turnCost);

    while (remainingXp >= newLevel * 100 + 50) {
      remainingXp -= (newLevel * 100 + 50);
      newLevel++;
      newMaxHp += 20;
      newStatPoints += 1;
      newTurnsAfterLevel = Math.min(newTurnsAfterLevel + 20, 5000);
      levelsGained++;
    }

    if (levelsGained > 0) {
      db.update(schema.users)
        .set({
          level: newLevel,
          xp: remainingXp,
          statPoints: newStatPoints,
          turns: newTurnsAfterLevel,
          maxHp: newMaxHp,
          hp: newMaxHp, // Full heal on first level-up
        })
        .where(eq(schema.users.id, user.id))
        .run();
    }

    res.json({
      success,
      crimeName: crime.name,
      reward,
      xpGained,
      hpLost,
      arrested,
      leveledUp: levelsGained > 0,
      newLevel: levelsGained > 0 ? newLevel : user.level,
      turnsLeft: Math.max(0, refreshedTurns - crime.turnCost),
      drugsConfiscated,
    });
  } catch (err) {
    console.error("Commit crime error:", err);
    res.status(500).json({ error: "Server error" });
  }
});
