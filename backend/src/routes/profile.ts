import { Router, Response } from "express";
import { z } from "zod";
import { db, schema } from "../db";
import { eq, and, sql } from "drizzle-orm";
import { authMiddleware, AuthRequest, jailCheck, hpCheck } from "../middleware/auth";
import { refreshTurns } from "./turns";
import { logActivityEvent } from "./activityEvents";
import { calcWarfareRatings, getSkillLevel } from "../utils/combat";
import { getRespectBonuses } from "../utils/respect";

// ─── Respect Tier System ───

const RESPECT_TIERS: { min: number; title: string }[] = [
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

function getRespectTitle(respect: number): string {
  for (const tier of RESPECT_TIERS) {
    if (respect >= tier.min) return tier.title;
  }
  return "Street Rat";
}

function getRespectProgress(respect: number): { current: number; next: number; title: string; nextTitle: string; percent: number } {
  for (let i = 0; i < RESPECT_TIERS.length; i++) {
    if (respect >= RESPECT_TIERS[i].min) {
      if (i === 0) {
        return { current: RESPECT_TIERS[i].min, next: RESPECT_TIERS[i].min, title: RESPECT_TIERS[i].title, nextTitle: RESPECT_TIERS[i].title, percent: 100 };
      }
      const currentTier = RESPECT_TIERS[i];
      const nextTier = RESPECT_TIERS[i - 1];
      const range = nextTier.min - currentTier.min;
      const progress = respect - currentTier.min;
      return {
        current: currentTier.min,
        next: nextTier.min,
        title: currentTier.title,
        nextTitle: nextTier.title,
        percent: Math.min(100, Math.round((progress / range) * 100)),
      };
    }
  }
  return { current: 0, next: 100, title: "Street Rat", nextTitle: "Hustler", percent: 0 };
}

function applyRespectDecay(user: typeof schema.users.$inferSelect): number {
  // Skip decay for Kingpin tier and below
  if (user.respect <= 10000) return user.respect;
  const now = new Date();
  const lastActive = new Date(user.lastActive);
  const daysInactive = (now.getTime() - lastActive.getTime()) / 86400000;
  if (daysInactive < 7) return user.respect;

  // Check if in a gang (gang membership protects from decay)
  const membership = db.select()
    .from(schema.gangMembers)
    .where(eq(schema.gangMembers.userId, user.id))
    .all()[0];
  if (membership) return user.respect;

  const missedDays = Math.floor(daysInactive - 7);
  const totalDecay = Math.min(missedDays * Math.max(1, Math.floor(user.respect * 0.02)), missedDays * 20);
  const newRespect = Math.max(0, user.respect - totalDecay);

  if (newRespect !== user.respect) {
    db.update(schema.users)
      .set({ respect: newRespect })
      .where(eq(schema.users.id, user.id))
      .run();
  }
  return newRespect;
}

// ─── Warfare Rating Helpers ───

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
    const turnsGained = ticks * 8;
    const effectiveTurns = Math.min(user.turns + turnsGained, 5000);
    const nextTurnIn = 300 - (elapsedSeconds % 300);
    const jailTime = user.jailUntil ? Math.max(0, Math.ceil((new Date(user.jailUntil).getTime() - now.getTime()) / 60000)) : 0;
    const hospitalTime = user.hospitalUntil ? Math.max(0, Math.ceil((new Date(user.hospitalUntil).getTime() - now.getTime()) / 60000)) : 0;

    // Asset valuations — drugs use currentPrice, everything else uses buyPrice
    type ItemType = "arm" | "drug" | "footman" | "drug_dealer" | "hoe" | "pimp";
    const assetVal = (type: ItemType) =>
      db.select({ value: sql<number>`COALESCE(SUM(${schema.userInventory.quantity} * ${schema.items.currentPrice}), 0)` })
        .from(schema.userInventory)
        .innerJoin(schema.items, eq(schema.userInventory.itemId, schema.items.id))
        .where(and(
          eq(schema.userInventory.userId, req.userId!),
          eq(schema.items.type, type),
        ))
        .all()[0]?.value ?? 0;

    const fixedAssetVal = (type: ItemType) =>
      db.select({ value: sql<number>`COALESCE(SUM(${schema.userInventory.quantity} * ${schema.items.buyPrice}), 0)` })
        .from(schema.userInventory)
        .innerJoin(schema.items, eq(schema.userInventory.itemId, schema.items.id))
        .where(and(
          eq(schema.userInventory.userId, req.userId!),
          eq(schema.items.type, type),
        ))
        .all()[0]?.value ?? 0;

    const drugAssets = assetVal('drug');
    const armsAssets = fixedAssetVal('arm');
    const footmenAssets = fixedAssetVal('footman');
    const dealerAssets = fixedAssetVal('drug_dealer');
    const hoeAssets = fixedAssetVal('hoe');
    const pimpAssets = fixedAssetVal('pimp');
    const blackMarketValue = drugAssets + armsAssets + footmenAssets + dealerAssets + hoeAssets + pimpAssets;

    // Net worth milestone checks
    const netWorth = user.cash + user.bank + blackMarketValue;
    const MILESTONES: { netWorth: number; respect: number }[] = [
      { netWorth: 10000, respect: 10 },
      { netWorth: 50000, respect: 25 },
      { netWorth: 100000, respect: 50 },
      { netWorth: 500000, respect: 100 },
      { netWorth: 1000000, respect: 250 },
      { netWorth: 5000000, respect: 500 },
      { netWorth: 10000000, respect: 1000 },
      { netWorth: 50000000, respect: 2500 },
      { netWorth: 100000000, respect: 5000 },
    ];

    if (netWorth > user.highestNetWorth) {
      const oldHighest = user.highestNetWorth;
      const totalRespectFor = (nw: number) =>
        MILESTONES.filter((m) => nw >= m.netWorth).reduce((sum, m) => sum + m.respect, 0);
      const newRespectAward = totalRespectFor(netWorth) - totalRespectFor(oldHighest);

      db.update(schema.users)
        .set({
          highestNetWorth: netWorth,
          ...(newRespectAward > 0 ? { respect: user.respect + newRespectAward } : {}),
        })
        .where(eq(schema.users.id, user.id))
        .run();

      if (newRespectAward > 0) {
        user.respect += newRespectAward;
        // Track milestone respect
        const mStats = await db.query.playerStats.findFirst({ where: eq(schema.playerStats.userId, user.id) });
        if (mStats) {
          db.update(schema.playerStats)
            .set({ respectMilestones: mStats.respectMilestones + newRespectAward })
            .where(eq(schema.playerStats.userId, user.id))
            .run();
        }
      }
    }

    // Apply respect decay if inactive
    const currentRespect = applyRespectDecay(user);

    const { passwordHash, ...safeUser } = user;
    safeUser.respect = currentRespect;

    // Respect tier info
    const respectTitle = getRespectTitle(currentRespect);
    const respectProgress = getRespectProgress(currentRespect);
    const respectBonuses = getRespectBonuses(currentRespect);

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
      respectTitle,
      respectProgress,
      respectBonuses,
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

profileRouter.post("/assign-stats", authMiddleware, jailCheck, hpCheck, async (req: AuthRequest, res: Response) => {
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
        maxHp: Math.max(100, 50 + newEnd * 5),
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
      maxHp: Math.max(100, 50 + newEnd * 5),
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

// POST /api/profile/heal — heal HP using cash or turns
profileRouter.post("/heal", authMiddleware, jailCheck, async (req: AuthRequest, res: Response) => {
  try {
    let user = await db.query.users.findFirst({
      where: eq(schema.users.id, req.userId!),
    });
    if (!user) { res.status(404).json({ error: "User not found" }); return; }

    // Refresh turns before proceeding
    refreshTurns(user);
    // Re-fetch with updated values
    const freshUser = await db.query.users.findFirst({
      where: eq(schema.users.id, req.userId!),
    });
    if (!freshUser) { res.status(404).json({ error: "User not found" }); return; }
    user = freshUser;

    if (user.hp >= user.maxHp) {
      res.status(400).json({ error: "Already at full HP" });
      return;
    }

    const method = req.body?.method ?? "cash";

    if (method === "turns") {
      // Sacrifice up to 10 turns at 5% max HP per turn
      if (user.turns < 1) {
        res.status(400).json({ error: "You need at least 1 turn to sacrifice" });
        return;
      }

      const turnsToUse = Math.min(user.turns, 10);
      const healPerTurn = Math.floor(user.maxHp * 0.05);
      const healAmount = turnsToUse * healPerTurn;
      const newHp = Math.min(user.hp + healAmount, user.maxHp);

      db.update(schema.users)
        .set({
          hp: newHp,
          turns: user.turns - turnsToUse,
        })
        .where(eq(schema.users.id, user.id))
        .run();

      res.json({
        hp: newHp,
        cash: user.cash,
        turns: user.turns - turnsToUse,
        healTurns: turnsToUse,
        healAmount: newHp - user.hp,
        method: "turns",
      });
      return;
    }

    // Cash method (default)
    const hpMissing = user.maxHp - user.hp;
    const costPerHp = 2;
    const totalCost = hpMissing * costPerHp;

    if (user.cash < totalCost) {
      res.status(400).json({
        error: `Not enough cash to heal. Need $${totalCost.toLocaleString()}. You can sacrifice up to 10 turns to heal 5% HP per turn instead.`,
        turnHealAvailable: user.turns > 0,
        turnCost: Math.min(user.turns, 10),
      });
      return;
    }

    db.update(schema.users)
      .set({
        hp: user.maxHp,
        cash: user.cash - totalCost,
      })
      .where(eq(schema.users.id, user.id))
      .run();

    res.json({ hp: user.maxHp, cash: user.cash - totalCost, cost: totalCost, method: "cash" });
  } catch (err) {
    console.error("Heal error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// POST /api/profile/avatar — update avatar (base64 data URL)
const avatarSchema = z.object({
  avatarUrl: z.string().max(AVATAR_MAX_LENGTH).nullable(),
});

profileRouter.post("/avatar", authMiddleware, jailCheck, hpCheck, async (req: AuthRequest, res: Response) => {
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

    const ratings = calcWarfareRatings(user);
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

profileRouter.post("/choose-specialization", authMiddleware, jailCheck, hpCheck, async (req: AuthRequest, res: Response) => {
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

    logActivityEvent(user.id, "specialization_chosen",
      `Chose the ${specialization} specialization`, { specialization });

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

// ─── POST /api/profile/hack/:targetId — Hacker-exclusive: steal respect ───
const hackCooldowns = new Map<number, number>();

profileRouter.post("/hack/:targetId", authMiddleware, jailCheck, hpCheck, async (req: AuthRequest, res: Response) => {
  try {
    const targetId = parseInt(req.params.targetId as string);
    if (targetId === req.userId) {
      res.status(400).json({ error: "Can't hack yourself" });
      return;
    }

    const user = await db.query.users.findFirst({ where: eq(schema.users.id, req.userId!) });
    if (!user) { res.status(404).json({ error: "User not found" }); return; }

    if (user.specialization !== "hacker") {
      res.status(403).json({ error: "Only hackers can perform data heists" });
      return;
    }

    // Refresh turns
    refreshTurns(user);
    const freshUser = await db.query.users.findFirst({ where: eq(schema.users.id, user.id) });
    if (!freshUser) { res.status(404).json({ error: "User not found" }); return; }
    const turnCost = 15;
    if (freshUser.turns < turnCost) {
      res.status(400).json({ error: "Not enough turns (need 15)" });
      return;
    }

    const target = await db.query.users.findFirst({ where: eq(schema.users.id, targetId) });
    if (!target) { res.status(404).json({ error: "Target not found" }); return; }

    // Level range check
    if (Math.abs(user.level - target.level) > 10) {
      res.status(400).json({ error: "Target is too far outside your level range (10 levels)" });
      return;
    }

    // New player protection
    if (target.level < 10) {
      res.status(400).json({ error: "This player is under protection (below level 10)" });
      return;
    }

    // Cooldown check
    const lastHack = hackCooldowns.get(req.userId!) ?? 0;
    const cooldownMs = 30 * 60 * 1000; // 30 minutes
    const elapsed = Date.now() - lastHack;
    if (elapsed < cooldownMs) {
      const remainingMin = Math.ceil((cooldownMs - elapsed) / 60000);
      res.status(429).json({ error: `Data heist on cooldown. ${remainingMin} minutes remaining.` });
      return;
    }

    // Success formula: intelligence + hacking skill vs target intelligence
    const hackingSkill = getSkillLevel(user.id, "Hacking");
    const atkScore = user.intelligence * 2 + hackingSkill * 3;
    const defScore = target.intelligence * 2;
    const successChance = atkScore / (atkScore + Math.max(1, defScore));
    const success = Math.random() < successChance;

    // Deduct turns
    db.update(schema.users)
      .set({ turns: sql`turns - ${turnCost}` })
      .where(eq(schema.users.id, user.id))
      .run();

    hackCooldowns.set(req.userId!, Date.now());

    if (success) {
      // Steal respect: base 5-15, scaled by target's respect
      const stolenRespect = Math.max(2, Math.min(50, Math.floor((5 + Math.random() * 10) * (target.respect / Math.max(1, user.respect)))));

      db.update(schema.users)
        .set({ respect: Math.max(0, target.respect - stolenRespect) })
        .where(eq(schema.users.id, target.id))
        .run();
      db.update(schema.users)
        .set({ respect: user.respect + stolenRespect })
        .where(eq(schema.users.id, user.id))
        .run();

      logActivityEvent(user.id, "data_heist",
        `Hacked ${target.username} and stole ${stolenRespect} respect`,
        { targetUsername: target.username, stolenRespect, success: true });
      logActivityEvent(target.id, "data_heist_loss",
        `Your data was stolen by ${user.username}. Lost ${stolenRespect} respect`,
        { attackerUsername: user.username, stolenRespect });

      const updatedUser = db.select({ turns: schema.users.turns }).from(schema.users).where(eq(schema.users.id, user.id)).all()[0];

      res.json({
        success: true,
        targetUsername: target.username,
        respectStolen: stolenRespect,
        turnsLeft: updatedUser?.turns ?? 0,
      });
    } else {
      // Failed: no respect stolen, but turn cost is lost
      logActivityEvent(user.id, "data_heist_fail",
        `Failed to hack ${target.username}`,
        { targetUsername: target.username, success: false });

      // Notify target they were targeted
      db.insert(schema.notifications).values({
        userId: target.id,
        type: "hack_attempt",
        title: "Hack attempt detected",
        body: `${user.username} tried to hack your data but failed.`,
        createdAt: new Date().toISOString(),
      }).run();

      const updatedUser = db.select({ turns: schema.users.turns }).from(schema.users).where(eq(schema.users.id, user.id)).all()[0];

      res.json({
        success: false,
        targetUsername: target.username,
        respectStolen: 0,
        turnsLeft: updatedUser?.turns ?? 0,
      });
    }
  } catch (err) {
    console.error("Hack error:", err);
    res.status(500).json({ error: "Server error" });
  }
});
