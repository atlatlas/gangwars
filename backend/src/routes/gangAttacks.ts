import { Router, Response } from "express";
import { z } from "zod";
import { db, schema } from "../db";
import { eq, and, sql } from "drizzle-orm";
import { authMiddleware, AuthRequest } from "../middleware/auth";
import { getUserGangId } from "../utils/arsenalDurability";
import { addGangReputation } from "../utils/gangReputation";

export const gangAttacksRouter = Router();

function getGangCombatPower(gangId: number): { total: number; memberCount: number } {
  const members = db.select({
    userId: schema.gangMembers.userId,
  })
  .from(schema.gangMembers)
  .where(eq(schema.gangMembers.gangId, gangId))
  .all();

  if (members.length === 0) return { total: 0, memberCount: 0 };

  const userIds = members.map(m => m.userId);

  const users = db.select({
    id: schema.users.id,
    strength: schema.users.strength,
    agility: schema.users.agility,
    endurance: schema.users.endurance,
    level: schema.users.level,
  })
  .from(schema.users)
  .where(sql`${schema.users.id} IN (${sql.join(userIds, sql`, `)})`)
  .all();

  let power = 0;
  for (const u of users) {
    power += u.strength + u.agility + u.endurance + u.level * 2;
  }

  return { total: power, memberCount: users.length };
}

function getDefenderArsenalBonus(gangId: number): number {
  const equipped = db.select({
    pvpPower: schema.gangArsenal.pvpPower,
  })
  .from(schema.gangArsenal)
  .where(and(
    eq(schema.gangArsenal.gangId, gangId),
    sql`${schema.gangArsenal.equippedBy} IS NOT NULL`,
  ))
  .all();

  return equipped.reduce((sum, item) => sum + item.pvpPower, 0);
}

function getGangLevelMultiplier(attackerLevel: number, defenderLevel: number): number {
  return 1 + (defenderLevel - attackerLevel) * 0.1;
}

function getCooldown(gangId: number, targetGangId: number, attackType: string): { onCooldown: boolean; expiresAt: string | null } {
  const cooldown = db.select()
    .from(schema.gangAttackCooldowns)
    .where(and(
      eq(schema.gangAttackCooldowns.attackerGangId, gangId),
      eq(schema.gangAttackCooldowns.defenderGangId, targetGangId),
      eq(schema.gangAttackCooldowns.attackType, attackType as any),
    ))
    .all()[0];

  if (!cooldown) return { onCooldown: false, expiresAt: null };

  const now = new Date();
  const expires = new Date(cooldown.expiresAt);
  if (now >= expires) {
    db.delete(schema.gangAttackCooldowns)
      .where(eq(schema.gangAttackCooldowns.id, cooldown.id))
      .run();
    return { onCooldown: false, expiresAt: null };
  }

  return { onCooldown: true, expiresAt: cooldown.expiresAt };
}

// GET /api/gangs/:id/attacks — attack history for a gang
gangAttacksRouter.get("/:id/attacks", authMiddleware, (req: AuthRequest, res: Response) => {
  const gangId = parseInt(req.params.id as string);
  if (isNaN(gangId)) return res.status(400).json({ error: "Invalid gang ID" });

  const attacks = db.select()
    .from(schema.gangAttacks)
    .where(sql`${schema.gangAttacks.attackerGangId} = ${gangId} OR ${schema.gangAttacks.defenderGangId} = ${gangId}`)
    .orderBy(sql`${schema.gangAttacks.createdAt} DESC`)
    .limit(50)
    .all();

  const enriched = attacks.map(a => {
    const attacker = db.select({ name: schema.gangs.name, tag: schema.gangs.tag })
      .from(schema.gangs).where(eq(schema.gangs.id, a.attackerGangId)).all()[0];
    const defender = db.select({ name: schema.gangs.name, tag: schema.gangs.tag })
      .from(schema.gangs).where(eq(schema.gangs.id, a.defenderGangId)).all()[0];
    return {
      ...a,
      attackerGangName: attacker?.name ?? "Unknown",
      attackerGangTag: attacker?.tag ?? "???",
      defenderGangName: defender?.name ?? "Unknown",
      defenderGangTag: defender?.tag ?? "???",
    };
  });

  res.json(enriched);
});

// GET /api/gangs/:targetId/attack/status — cooldown and power info
gangAttacksRouter.get("/:targetId/attack/status", authMiddleware, (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const targetGangId = parseInt(req.params.targetId as string);
    if (isNaN(targetGangId)) return res.status(400).json({ error: "Invalid gang ID" });

    const myGangId = getUserGangId(userId);
    if (!myGangId) return res.status(400).json({ error: "You are not in a gang" });
    if (myGangId === targetGangId) return res.status(400).json({ error: "Cannot attack your own gang" });

    const targetGang = db.select({ level: schema.gangs.level, vault: schema.gangs.vault })
      .from(schema.gangs)
      .where(eq(schema.gangs.id, targetGangId))
      .all()[0];
    if (!targetGang) return res.status(404).json({ error: "Gang not found" });

    const myGang = db.select({ level: schema.gangs.level })
      .from(schema.gangs)
      .where(eq(schema.gangs.id, myGangId))
      .all()[0];
    if (!myGang) return res.status(404).json({ error: "Your gang not found" });

    const raidCooldown = getCooldown(myGangId, targetGangId, "raid");
    const sabotageCooldown = getCooldown(myGangId, targetGangId, "sabotage");

    const myPower = getGangCombatPower(myGangId);
    const targetPower = getGangCombatPower(targetGangId);
    const arsenalBonus = getDefenderArsenalBonus(targetGangId);
    const levelMultiplier = getGangLevelMultiplier(myGang.level, targetGang.level);

    const effectiveDefenderPower = Math.round((targetPower.total + arsenalBonus) * levelMultiplier);

    res.json({
      myGangId,
      myPower: myPower.total,
      myMemberCount: myPower.memberCount,
      targetPower: targetPower.total,
      targetMemberCount: targetPower.memberCount,
      targetArsenalBonus: arsenalBonus,
      targetLevelMultiplier: levelMultiplier,
      effectiveDefenderPower,
      targetVault: targetGang.vault,
      targetLevel: targetGang.level,
      myLevel: myGang.level,
      raidCooldown,
      sabotageCooldown,
    });
  } catch (err: any) {
    console.error("Attack status error:", err);
    res.status(500).json({ error: err.message || "Failed to load attack info" });
  }
});

// POST /api/gangs/:targetId/attack/raid — launch a raid
gangAttacksRouter.post("/:targetId/attack/raid", authMiddleware, (req: AuthRequest, res: Response) => {
  const userId = req.userId!;
  const targetGangId = parseInt(req.params.targetId as string);
  if (isNaN(targetGangId)) return res.status(400).json({ error: "Invalid gang ID" });

  const myGangId = getUserGangId(userId);
  if (!myGangId) return res.status(400).json({ error: "You are not in a gang" });
  if (myGangId === targetGangId) return res.status(400).json({ error: "Cannot attack your own gang" });

  // Check cooldown
  const cd = getCooldown(myGangId, targetGangId, "raid");
  if (cd.onCooldown) {
    return res.status(429).json({ error: `Raid on cooldown until ${cd.expiresAt}` });
  }

  // Check turn cost (10 turns per attack)
  const user = db.select({ turns: schema.users.turns })
    .from(schema.users).where(eq(schema.users.id, userId)).all()[0];
  if (!user || user.turns < 10) {
    return res.status(400).json({ error: "Need at least 10 turns to raid" });
  }

  // Verify attacker is a gang member
  const myMembership = db.select({ role: schema.gangMembers.role })
    .from(schema.gangMembers)
    .where(and(eq(schema.gangMembers.userId, userId), eq(schema.gangMembers.gangId, myGangId)))
    .all()[0];
  if (!myMembership) return res.status(400).json({ error: "You are not a member of this gang" });

  const targetGang = db.select({ level: schema.gangs.level, vault: schema.gangs.vault, reputation: schema.gangs.reputation })
    .from(schema.gangs)
    .where(eq(schema.gangs.id, targetGangId))
    .all()[0];
  if (!targetGang) return res.status(404).json({ error: "Target gang not found" });

  const myGang = db.select({ level: schema.gangs.level })
    .from(schema.gangs)
    .where(eq(schema.gangs.id, myGangId))
    .all()[0];

  // Calculate powers
  const myPower = getGangCombatPower(myGangId).total;
  const targetBasePower = getGangCombatPower(targetGangId).total;
  const arsenalBonus = getDefenderArsenalBonus(targetGangId);
  const levelMultiplier = getGangLevelMultiplier(myGang.level, targetGang.level);
  const effectiveDefenderPower = Math.round((targetBasePower + arsenalBonus) * levelMultiplier);

  // Roll for outcome: attacker wins if power > defender * (0.8 + random * 0.4)
  const roll = 0.8 + Math.random() * 0.4;
  const attackerWon = myPower > effectiveDefenderPower * roll;

  // Deduct turns
  db.update(schema.users)
    .set({ turns: sql`turns - 10` })
    .where(eq(schema.users.id, userId))
    .run();

  let loot = 0;
  let attackerRepChange = 0;
  let defenderRepChange = 0;
  let cost = 0;

  const now = new Date().toISOString();

  if (attackerWon) {
    // Steal 5-15% of target vault
    const stealPercent = 5 + Math.random() * 10;
    loot = Math.floor(targetGang.vault * (stealPercent / 100));
    const maxLoot = myGang.level * 50000;
    loot = Math.min(loot, maxLoot);

    // Transfer vault
    db.update(schema.gangs)
      .set({ vault: sql`vault - ${loot}` })
      .where(eq(schema.gangs.id, targetGangId))
      .run();
    db.update(schema.gangs)
      .set({ vault: sql`vault + ${loot}` })
      .where(eq(schema.gangs.id, myGangId))
      .run();

    attackerRepChange = 10 + Math.floor(Math.random() * 15);
    defenderRepChange = -(5 + Math.floor(Math.random() * 10));
  } else {
    // Loss: lose some cash from vault
    cost = Math.floor(myGang.level * 5000 * (0.5 + Math.random()));
    db.update(schema.gangs)
      .set({ vault: sql`vault - ${cost}` })
      .where(eq(schema.gangs.id, myGangId))
      .run();

    attackerRepChange = -(3 + Math.floor(Math.random() * 5));
    defenderRepChange = 5 + Math.floor(Math.random() * 10);
  }

  // Apply reputation changes
  if (attackerRepChange !== 0) {
    db.update(schema.gangs)
      .set({ reputation: sql`MAX(0, reputation + ${attackerRepChange})` })
      .where(eq(schema.gangs.id, myGangId))
      .run();
  }
  if (defenderRepChange !== 0) {
    db.update(schema.gangs)
      .set({ reputation: sql`MAX(0, reputation + ${defenderRepChange})` })
      .where(eq(schema.gangs.id, targetGangId))
      .run();
  }

  // Set cooldown (24 hours)
  const cooldownExpires = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

  // Upsert cooldown
  const existingCd = db.select()
    .from(schema.gangAttackCooldowns)
    .where(and(
      eq(schema.gangAttackCooldowns.attackerGangId, myGangId),
      eq(schema.gangAttackCooldowns.defenderGangId, targetGangId),
      eq(schema.gangAttackCooldowns.attackType, "raid" as any),
    ))
    .all()[0];

  if (existingCd) {
    db.update(schema.gangAttackCooldowns)
      .set({ expiresAt: cooldownExpires })
      .where(eq(schema.gangAttackCooldowns.id, existingCd.id))
      .run();
  } else {
    db.insert(schema.gangAttackCooldowns).values({
      attackerGangId: myGangId,
      defenderGangId: targetGangId,
      attackType: "raid" as any,
      expiresAt: cooldownExpires,
    }).run();
  }

  // Log the attack
  db.insert(schema.gangAttacks).values({
    attackerGangId: myGangId,
    defenderGangId: targetGangId,
    attackType: "raid" as any,
    attackerPower: myPower,
    defenderPower: effectiveDefenderPower,
    attackerWon,
    lootVault: loot,
    reputationChange: attackerRepChange,
    createdAt: now,
  }).run();

  res.json({
    attackerWon,
    attackerGangId: myGangId,
    defenderGangId: targetGangId,
    attackerPower: myPower,
    defenderPower: effectiveDefenderPower,
    lootVault: loot,
    cost,
    attackerRepChange,
    defenderRepChange,
    cooldownExpires,
  });
});

// POST /api/gangs/:targetId/attack/sabotage — sabotage another gang
gangAttacksRouter.post("/:targetId/attack/sabotage", authMiddleware, (req: AuthRequest, res: Response) => {
  const userId = req.userId!;
  const targetGangId = parseInt(req.params.targetId as string);
  if (isNaN(targetGangId)) return res.status(400).json({ error: "Invalid gang ID" });

  const myGangId = getUserGangId(userId);
  if (!myGangId) return res.status(400).json({ error: "You are not in a gang" });
  if (myGangId === targetGangId) return res.status(400).json({ error: "Cannot sabotage your own gang" });

  // Check cooldown
  const cd = getCooldown(myGangId, targetGangId, "sabotage");
  if (cd.onCooldown) {
    return res.status(429).json({ error: `Sabotage on cooldown until ${cd.expiresAt}` });
  }

  // Money cost: $50k base, scales with target level
  const targetGang = db.select({ level: schema.gangs.level, reputation: schema.gangs.reputation })
    .from(schema.gangs).where(eq(schema.gangs.id, targetGangId)).all()[0];
  if (!targetGang) return res.status(404).json({ error: "Target gang not found" });

  const cost = 50000 + targetGang.level * 10000;

  // Check attacker's gang vault can pay
  const myGang = db.select({ vault: schema.gangs.vault })
    .from(schema.gangs).where(eq(schema.gangs.id, myGangId)).all()[0];
  if (!myGang || myGang.vault < cost) {
    return res.status(400).json({ error: `Gang vault needs $${cost.toLocaleString()} for sabotage` });
  }

  // Deduct cost
  db.update(schema.gangs)
    .set({ vault: sql`vault - ${cost}` })
    .where(eq(schema.gangs.id, myGangId))
    .run();

  // Reduce target reputation (5-15%)
  const repLoss = Math.floor(targetGang.reputation * (0.05 + Math.random() * 0.1));
  db.update(schema.gangs)
    .set({ reputation: sql`MAX(0, reputation - ${repLoss})` })
    .where(eq(schema.gangs.id, targetGangId))
    .run();

  // Set cooldown (12 hours)
  const cooldownExpires = new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString();

  const existingCd = db.select()
    .from(schema.gangAttackCooldowns)
    .where(and(
      eq(schema.gangAttackCooldowns.attackerGangId, myGangId),
      eq(schema.gangAttackCooldowns.defenderGangId, targetGangId),
      eq(schema.gangAttackCooldowns.attackType, "sabotage" as any),
    ))
    .all()[0];

  if (existingCd) {
    db.update(schema.gangAttackCooldowns)
      .set({ expiresAt: cooldownExpires })
      .where(eq(schema.gangAttackCooldowns.id, existingCd.id))
      .run();
  } else {
    db.insert(schema.gangAttackCooldowns).values({
      attackerGangId: myGangId,
      defenderGangId: targetGangId,
      attackType: "sabotage" as any,
      expiresAt: cooldownExpires,
    }).run();
  }

  // Log the attack
  db.insert(schema.gangAttacks).values({
    attackerGangId: myGangId,
    defenderGangId: targetGangId,
    attackType: "sabotage" as any,
    attackerPower: 0,
    defenderPower: 0,
    attackerWon: true,
    lootVault: 0,
    reputationChange: -repLoss,
    createdAt: new Date().toISOString(),
  }).run();

  res.json({
    success: true,
    reputationReduced: repLoss,
    cost,
    cooldownExpires,
  });
});
