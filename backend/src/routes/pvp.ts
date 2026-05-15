import { Router, Response } from "express";
import { z } from "zod";
import { db, schema } from "../db";
import { eq, and, like, sql, inArray } from "drizzle-orm";
import { authMiddleware, AuthRequest, jailCheck, hpCheck } from "../middleware/auth";
import { refreshTurns } from "./turns";
import { logActivityEvent } from "./activityEvents";
import { applyArsenalDurabilityLoss, getUserGangId } from "../utils/arsenalDurability";
import { addGangReputation } from "../utils/gangReputation";

export const pvpRouter = Router();

interface ItemEffects {
  crimeBonus?: number;
  pvpPower?: number;
  arrestReduction?: number;
}

// ─── Helpers ───

function getSkillLevel(userId: number, skillName: string): number {
  const skill = db.select({ level: schema.userSkills.level })
    .from(schema.userSkills)
    .innerJoin(schema.skillDefinitions, eq(schema.userSkills.skillId, schema.skillDefinitions.id))
    .where(and(eq(schema.userSkills.userId, userId), eq(schema.skillDefinitions.name, skillName)))
    .all()[0];
  return skill?.level ?? 0;
}

function calcWarfareRatings(user: typeof schema.users.$inferSelect) {
  const guerrilla = getSkillLevel(user.id, "Guerrilla Warfare");
  const chemistry = getSkillLevel(user.id, "Chemistry");
  const sixthSense = getSkillLevel(user.id, "Sixth Sense");
  const womensStudies = getSkillLevel(user.id, "Women's Studies");
  const sexualEd = getSkillLevel(user.id, "Sexual Education");

  let thug = user.strength * 2 + guerrilla * 3;
  let dealer = user.intelligence * 2 + chemistry * 2 + sixthSense * 1;
  let pimp = user.charisma * 2 + sexualEd * 3 + womensStudies * 2;

  if (user.specialization === "enforcer") thug = Math.round(thug * 1.1);
  if (user.specialization === "dealer") dealer = Math.round(dealer * 1.1);
  if (user.specialization === "hacker") pimp = Math.round(pimp * 1.1);

  return { thug, dealer, pimp };
}

function getCombatBonuses(userId: number): number {
  const weaponRow = db.select({
    inventory: schema.userInventory,
    item: schema.items,
  })
  .from(schema.userInventory)
  .innerJoin(schema.items, eq(schema.userInventory.itemId, schema.items.id))
  .where(and(eq(schema.userInventory.userId, userId), eq(schema.userInventory.equipped, true)))
  .all()
  .find((r) => r.item.type === "arm");

  const footmenRows = db.select({
    inventory: schema.userInventory,
    item: schema.items,
  })
  .from(schema.userInventory)
  .innerJoin(schema.items, eq(schema.userInventory.itemId, schema.items.id))
  .where(and(eq(schema.userInventory.userId, userId), eq(schema.items.type, "footman")))
  .all();

  let bonusPower = 0;
  if (weaponRow) {
    try {
      const effects = JSON.parse(weaponRow.item.effects) as ItemEffects;
      bonusPower += effects.pvpPower ?? 0;
    } catch {}
  }

  // Group footmen by itemId to cap each type at 3 effective copies
  const footmenByType = new Map<number, { count: number; power: number }>();
  for (const f of footmenRows) {
    try {
      const effects = JSON.parse(f.item.effects) as ItemEffects;
      const entry = footmenByType.get(f.item.id) || { count: 0, power: 0 };
      entry.count++;
      entry.power += effects.pvpPower ?? 0;
      footmenByType.set(f.item.id, entry);
    } catch {}
  }
  for (const entry of footmenByType.values()) {
    const capRatio = Math.min(entry.count, 3) / entry.count;
    bonusPower += entry.power * capRatio;
  }

  return bonusPower;
}

function getCombatPower(user: typeof schema.users.$inferSelect, itemBonus: number = 0): number {
  const r = calcWarfareRatings(user);
  const highest = Math.max(r.thug, r.dealer, r.pimp);

  // Add turf PvP bonus if user is in a gang that owns districts
  let turfBonus = 0;
  const memberRow = db.select({ gangId: schema.gangMembers.gangId })
    .from(schema.gangMembers)
    .where(eq(schema.gangMembers.userId, user.id))
    .all()[0];
  if (memberRow) {
    const gangTurfRows = db.select({ districtId: schema.gangTurf.districtId })
      .from(schema.gangTurf)
      .where(and(eq(schema.gangTurf.gangId, memberRow.gangId), sql`${schema.gangTurf.challengedBy} IS NULL`))
      .all();
    if (gangTurfRows.length > 0) {
      const districtIds = gangTurfRows.map(t => t.districtId);
      const bonuses = db.select({ pvpBonus: schema.turfDistricts.pvpBonus })
        .from(schema.turfDistricts)
        .where(inArray(schema.turfDistricts.id, districtIds))
        .all();
      turfBonus = bonuses.reduce((sum, d) => sum + d.pvpBonus, 0);
    }
  }

  return Math.round(highest) + itemBonus + user.level * 0.5 + turfBonus;
}

function getHighestWarfare(user: typeof schema.users.$inferSelect): number {
  const r = calcWarfareRatings(user);
  return Math.max(r.thug, r.dealer, r.pimp);
}

// Respect intimidation: higher respect gives combat edge
function respectIntimidationModifier(attackerRespect: number, defenderRespect: number): number {
  const diff = attackerRespect - defenderRespect;
  return Math.max(0.7, Math.min(1.3, 1 + diff / 100000));
}

function threatLevel(power: number, targetPower: number): string {
  const ratio = power / Math.max(targetPower, 1);
  if (ratio > 1.3) return "Easy";
  if (ratio > 0.9) return "Medium";
  if (ratio > 0.6) return "Hard";
  return "Extreme";
}

// When attacker A attacks defender B, B gets free retaliation attacks against A.
// Entry stored as (originalAttackerId = A, defenderId = B, free = 3)
// To check if B can retaliate against A: look for entry WHERE originalAttackerId = A AND defenderId = B

function grantRetaliation(originalAttackerId: number, defenderId: number): void {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 12 * 60 * 60 * 1000).toISOString();
  const existing = db.select()
    .from(schema.retaliationLog)
    .where(and(
      eq(schema.retaliationLog.originalAttackerId, originalAttackerId),
      eq(schema.retaliationLog.defenderId, defenderId),
    ))
    .all()[0];

  if (existing) {
    db.update(schema.retaliationLog)
      .set({
        freeAttacksRemaining: 3,
        expiresAt,
        createdAt: now.toISOString(),
      })
      .where(eq(schema.retaliationLog.id, existing.id))
      .run();
  } else {
    db.insert(schema.retaliationLog).values({
      originalAttackerId,
      defenderId,
      freeAttacksRemaining: 3,
      createdAt: now.toISOString(),
      expiresAt,
    }).run();
  }
}

// Check if retaliator can use a free attack against target
// Returns true if there was a valid retaliation to consume
function useRetaliation(retaliatorId: number, targetId: number): boolean {
  // Look for entry where target was the original attacker and retaliator was the defender
  const existing = db.select()
    .from(schema.retaliationLog)
    .where(and(
      eq(schema.retaliationLog.originalAttackerId, targetId),
      eq(schema.retaliationLog.defenderId, retaliatorId),
    ))
    .all()[0];

  if (!existing) return false;

  const expiresAt = new Date(existing.expiresAt);
  if (expiresAt <= new Date()) {
    db.delete(schema.retaliationLog).where(eq(schema.retaliationLog.id, existing.id)).run();
    return false;
  }

  if (existing.freeAttacksRemaining <= 0) return false;

  db.update(schema.retaliationLog)
    .set({ freeAttacksRemaining: existing.freeAttacksRemaining - 1 })
    .where(eq(schema.retaliationLog.id, existing.id))
    .run();
  return true;
}

// ─── Routes ───

// GET /api/pvp/search?q=username
pvpRouter.get("/search", authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const query = req.query.q as string;
    if (!query || query.length < 1) {
      res.json({ players: [] });
      return;
    }

    const players = await db.query.users.findMany({
      where: like(schema.users.username, `%${query}%`),
      columns: { id: true, username: true, level: true },
      limit: 20,
    });

    res.json({ players: players.filter(p => p.id !== req.userId) });
  } catch (err) {
    console.error("Search error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// GET /api/pvp/players/:id — intel
pvpRouter.get("/players/:id", authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const targetId = parseInt(req.params.id as string);
    if (targetId === req.userId) {
      res.status(400).json({ error: "Can't target yourself" });
      return;
    }

    const target = await db.query.users.findFirst({
      where: eq(schema.users.id, targetId),
    });
    if (!target) { res.status(404).json({ error: "Player not found" }); return; }

    const attacker = await db.query.users.findFirst({
      where: eq(schema.users.id, req.userId!),
    });
    if (!attacker) { res.status(404).json({ error: "User not found" }); return; }

    const atkBonus = getCombatBonuses(attacker.id);
    const defBonus = getCombatBonuses(target.id);
    const respectMod = respectIntimidationModifier(attacker.respect, target.respect);
    const atkPower = getCombatPower(attacker, atkBonus) * respectMod;
    const defPower = getCombatPower(target, defBonus);
    const winChance = Math.round((atkPower / (atkPower + Math.max(1, defPower))) * 100);

    res.json({
      id: target.id,
      username: target.username,
      level: target.level,
      threat: threatLevel(atkPower, defPower),
      estimatedWinChance: winChance,
      combatPower: Math.round(atkPower),
      targetCombatPower: Math.round(defPower),
      respectModifier: respectMod,
      yourRespect: attacker.respect,
      targetRespect: target.respect,
    });
  } catch (err) {
    console.error("Player intel error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// POST /api/pvp/players/:id/attack
pvpRouter.post("/players/:id/attack", authMiddleware, jailCheck, hpCheck, async (req: AuthRequest, res: Response) => {
  try {
    const targetId = parseInt(req.params.id as string);
    const attackType = (req.body.type as string) || "mug";

    const validTypes = ["mug", "ambush", "rob", "hit", "spy", "house_raid"];
    if (!validTypes.includes(attackType)) {
      res.status(400).json({ error: "Invalid attack type" });
      return;
    }

    if (targetId === req.userId) {
      res.status(400).json({ error: "Can't attack yourself" });
      return;
    }

    const attacker = await db.query.users.findFirst({
      where: eq(schema.users.id, req.userId!),
    });
    if (!attacker) { res.status(404).json({ error: "User not found" }); return; }

    // Refresh turns before using them
    refreshTurns(attacker);
    // Re-fetch attacker with updated values
    const refreshedAttacker = await db.query.users.findFirst({
      where: eq(schema.users.id, req.userId!),
    });
    if (!refreshedAttacker) { res.status(404).json({ error: "User not found" }); return; }
    // Replace attacker with fresh data
    (attacker as any).turns = refreshedAttacker.turns;
    (attacker as any).hp = refreshedAttacker.hp;
    (attacker as any).cash = refreshedAttacker.cash;

    const defender = await db.query.users.findFirst({
      where: eq(schema.users.id, targetId),
    });
    if (!defender) { res.status(404).json({ error: "Target not found" }); return; }

    // Level check — 10 level bracket (applies to all attacks including spy)
    if (Math.abs(attacker.level - defender.level) > 10) {
      res.status(400).json({ error: "Target is too far outside your level range (10 levels)" });
      return;
    }

    // New player protection
    if (defender.level < 10) {
      res.status(400).json({ error: "This player is under protection (below level 10)" });
      return;
    }

    // Check hospital
    if (defender.hospitalUntil && new Date(defender.hospitalUntil) > new Date()) {
      res.status(400).json({ error: "Target is hospitalized and cannot be attacked" });
      return;
    }

    // Turn costs
    const turnCosts: Record<string, number> = { mug: 5, ambush: 8, rob: 8, hit: 10, spy: 2, house_raid: 15 };
    const cost = turnCosts[attackType];

    // Check if using retaliation (free attack) — only for non-spy attacks
    let usingRetaliation = false;
    if (attackType !== "spy") {
      // Check if defender has retaliation against attacker
      // Note: the retal is from defender's perspective (they have free attacks on attacker)
      // But here attacker is initiating, so we check if attacker has retal against defender
      // Actually: retaliation means the person who was attacked gets free attacks back.
      // So if A attacked B before, B now gets free attacks against A.
      // When B attacks A: B is the attacker now, and B has retal against A.
      // So we check if the current attacker (req.userId) has retal against the defender (targetId)
      usingRetaliation = useRetaliation(req.userId!, targetId);
    }

    if (!usingRetaliation) {
      if (attacker.turns < cost) {
        res.status(400).json({ error: "Not enough turns" });
        return;
      }

      // Deduct turns
      db.update(schema.users)
        .set({ turns: attacker.turns - cost })
        .where(eq(schema.users.id, attacker.id))
        .run();
    }

    // ─── SPY — special case, always succeeds ───
    if (attackType === "spy") {
      const spyResult = {
        success: true,
        attackType: "spy",
        targetUsername: defender.username,
        targetLevel: defender.level,
        targetCash: defender.cash,
        targetStats: {
          strength: defender.strength,
          agility: defender.agility,
          intelligence: defender.intelligence,
          charisma: defender.charisma,
          endurance: defender.endurance,
        },
        targetHp: defender.hp,
        targetMaxHp: defender.maxHp,
        targetEquipment: (() => {
          const eqRow = db.select({ item: schema.items })
            .from(schema.userInventory)
            .innerJoin(schema.items, eq(schema.userInventory.itemId, schema.items.id))
            .where(and(eq(schema.userInventory.userId, defender.id), eq(schema.userInventory.equipped, true)))
            .all()[0];
          return eqRow?.item.name ?? null;
        })(),
        targetFootmenCount: db.select({ count: sql<number>`count(*)` })
          .from(schema.userInventory)
          .innerJoin(schema.items, eq(schema.userInventory.itemId, schema.items.id))
          .where(and(eq(schema.userInventory.userId, defender.id), eq(schema.items.type, "footman")))
          .all()[0]?.count ?? 0,
        turnsLeft: usingRetaliation ? attacker.turns : attacker.turns - cost,
        usingRetaliation,
      };

      // Log spy
      const now = new Date().toISOString();
      db.insert(schema.pvpLog).values({
        attackerId: attacker.id,
        defenderId: defender.id,
        attackType: "spy",
        attackerWin: true,
        lootCash: null,
        respectChange: 0,
        damageDealt: 0,
        damageTaken: 0,
        createdAt: now,
      }).run();

      res.json(spyResult);
      return;
    }

    // ─── COMBAT ───
    const atkBonus = getCombatBonuses(attacker.id);
    const defBonus = getCombatBonuses(defender.id);
    const respectMod = respectIntimidationModifier(attacker.respect, defender.respect);
    const atkPower = getCombatPower(attacker, atkBonus) * respectMod;
    const defPower = getCombatPower(defender, defBonus);
    const hitChance = atkPower / (atkPower + Math.max(1, defPower));
    const attackerWins = Math.random() < hitChance;

    let damageDealt = 0;
    let damageTaken = 0;
    let lootCash = 0;
    let respectChange = 0;
    let itemStolen: { name: string; quantity: number } | null = null;
    let isCrit = false;

    if (attackerWins) {
      damageDealt = Math.max(1, Math.floor((atkPower - defPower * 0.5) * (0.8 + Math.random() * 0.4)));

      // Agility-based critical hit chance: 0-15% at 0-100 agility
      const critChance = attacker.agility * 0.15;
      isCrit = Math.random() * 100 < critChance;
      if (isCrit) damageDealt = Math.floor(damageDealt * 2);

      damageTaken = Math.floor(Math.random() * 10);

      if (attackType === "mug") {
        lootCash = Math.min(Math.floor(defender.cash * 0.1), Math.max(500, defender.level * 50));
        db.update(schema.users)
          .set({ cash: Math.max(0, defender.cash - lootCash) })
          .where(eq(schema.users.id, defender.id))
          .run();
        db.update(schema.users)
          .set({ cash: attacker.cash + lootCash })
          .where(eq(schema.users.id, attacker.id))
          .run();
      } else if (attackType === "ambush") {
        respectChange = 5 + Math.floor(Math.random() * 10);
        // Scale by target respect: beating someone more respected pays more
        const respectRatio = defender.respect / Math.max(1, attacker.respect);
        respectChange = Math.round(respectChange * Math.max(0.5, Math.min(3, respectRatio)));
        // Bonus if target has more respect (+50%)
        if (defender.respect > attacker.respect) respectChange = Math.round(respectChange * 1.5);
        const ambushBaseRespect = 2; // base respect created on ambush win
        db.update(schema.users)
          .set({ respect: Math.max(0, defender.respect - respectChange) })
          .where(eq(schema.users.id, defender.id))
          .run();
        db.update(schema.users)
          .set({ respect: attacker.respect + respectChange + ambushBaseRespect })
          .where(eq(schema.users.id, attacker.id))
          .run();
        respectChange += ambushBaseRespect;
      } else if (attackType === "rob") {
        lootCash = Math.min(Math.floor(defender.cash * 0.15), Math.max(1000, defender.level * 100));
        db.update(schema.users)
          .set({ cash: Math.max(0, defender.cash - lootCash) })
          .where(eq(schema.users.id, defender.id))
          .run();
        db.update(schema.users)
          .set({ cash: attacker.cash + lootCash })
          .where(eq(schema.users.id, attacker.id))
          .run();
      } else if (attackType === "hit") {
        respectChange = 10 + Math.floor(Math.random() * 15);
        // Scale by target strength
        const hitRatio = defender.respect / Math.max(1, attacker.respect);
        respectChange = Math.round(respectChange * Math.max(0.5, Math.min(3, hitRatio)));
        if (defender.respect > attacker.respect) respectChange = Math.round(respectChange * 1.5);
        const hitBaseRespect = 3; // base respect created on hit win
        db.update(schema.users)
          .set({ respect: Math.max(0, defender.respect - respectChange) })
          .where(eq(schema.users.id, defender.id))
          .run();
        db.update(schema.users)
          .set({ respect: attacker.respect + respectChange + hitBaseRespect })
          .where(eq(schema.users.id, attacker.id))
          .run();
        respectChange += hitBaseRespect;
      } else if (attackType === "house_raid") {
        // Steal 30% carried cash (max 5000 or level*500)
        lootCash = Math.min(Math.floor(defender.cash * 0.3), Math.max(5000, defender.level * 500));
        db.update(schema.users)
          .set({ cash: Math.max(0, defender.cash - lootCash) })
          .where(eq(schema.users.id, defender.id))
          .run();
        db.update(schema.users)
          .set({ cash: attacker.cash + lootCash })
          .where(eq(schema.users.id, attacker.id))
          .run();

        // 10% chance to steal a random non-equipped item
        if (Math.random() < 0.1) {
          const stealable = db.select({
            inventory: schema.userInventory,
            item: schema.items,
          })
          .from(schema.userInventory)
          .innerJoin(schema.items, eq(schema.userInventory.itemId, schema.items.id))
          .where(and(
            eq(schema.userInventory.userId, defender.id),
            eq(schema.userInventory.equipped, false),
            sql`${schema.items.type} IN ('arm', 'drug')`
          ))
          .all();

          if (stealable.length > 0) {
            const stolen = stealable[Math.floor(Math.random() * stealable.length)];
            const stolenQty = stolen.item.type === "arm" ? 1 : Math.max(1, Math.ceil(stolen.inventory.quantity * 0.25));
            const remaining = stolen.inventory.quantity - stolenQty;

            if (remaining <= 0) {
              db.delete(schema.userInventory).where(eq(schema.userInventory.id, stolen.inventory.id)).run();
            } else {
              db.update(schema.userInventory)
                .set({ quantity: remaining })
                .where(eq(schema.userInventory.id, stolen.inventory.id))
                .run();
            }

            // Give stolen item to attacker
            const existingInv = db.select()
              .from(schema.userInventory)
              .where(and(eq(schema.userInventory.userId, attacker.id), eq(schema.userInventory.itemId, stolen.item.id)))
              .all()[0];
            if (existingInv) {
              db.update(schema.userInventory)
                .set({ quantity: existingInv.quantity + stolenQty })
                .where(eq(schema.userInventory.id, existingInv.id))
                .run();
            } else {
              db.insert(schema.userInventory).values({
                userId: attacker.id,
                itemId: stolen.item.id,
                equipped: false,
                quantity: stolenQty,
                acquiredAt: new Date().toISOString(),
              }).run();
            }

            itemStolen = { name: stolen.item.name, quantity: stolenQty };
          }
        }
      }

      // Apply damage to defender
      const newDefHp = Math.max(0, defender.hp - damageDealt);
      if (newDefHp <= 0) {
        const hospitalUntil = new Date(Date.now() + 15 * 60000).toISOString();
        db.update(schema.users)
          .set({ hp: 1, hospitalUntil })
          .where(eq(schema.users.id, defender.id))
          .run();
      } else {
        db.update(schema.users)
          .set({ hp: newDefHp })
          .where(eq(schema.users.id, defender.id))
          .run();
      }

      // Grant retaliation to defender (not for spy — already handled above)
      grantRetaliation(attacker.id, defender.id);
    } else {
      damageTaken = Math.max(1, Math.floor((defPower - atkPower * 0.5) * (0.8 + Math.random() * 0.4)));
      damageDealt = Math.floor(Math.random() * 5);

      if (attackType === "hit" || attackType === "ambush") {
        respectChange = Math.floor(Math.random() * 5);
        db.update(schema.users)
          .set({ respect: Math.max(0, attacker.respect - respectChange) })
          .where(eq(schema.users.id, attacker.id))
          .run();
      }

      // House raid loss penalty
      if (attackType === "house_raid") {
        const cashLost = Math.floor(attacker.cash * 0.2);
        db.update(schema.users)
          .set({ cash: Math.max(0, attacker.cash - cashLost) })
          .where(eq(schema.users.id, attacker.id))
          .run();
      }

      // Hospitalize attacker
      const newAtkHp = Math.max(0, attacker.hp - damageTaken);
      if (newAtkHp <= 0) {
        const hospitalUntil = new Date(Date.now() + 15 * 60000).toISOString();
        db.update(schema.users)
          .set({ hp: 1, hospitalUntil })
          .where(eq(schema.users.id, attacker.id))
          .run();
      } else {
        db.update(schema.users)
          .set({ hp: newAtkHp })
          .where(eq(schema.users.id, attacker.id))
          .run();
      }

      // Grant retaliation to defender (they got attacked and won, but still get retaliation)
      grantRetaliation(attacker.id, defender.id);
    }

    // Log PvP
    const now = new Date().toISOString();
    db.insert(schema.pvpLog).values({
      attackerId: attacker.id,
      defenderId: defender.id,
      attackType: attackType as "mug" | "ambush" | "rob" | "hit" | "spy" | "house_raid",
      attackerWin: attackerWins,
      lootCash: lootCash || null,
      respectChange,
      damageDealt,
      damageTaken,
      createdAt: now,
    }).run();

    // Arsenal durability loss for attacker and defender
    const atkGangId = getUserGangId(attacker.id);
    const defGangId = getUserGangId(defender.id);
    if (atkGangId) applyArsenalDurabilityLoss(attacker.id, atkGangId, `pvp_${attackType}`);
    if (defGangId) applyArsenalDurabilityLoss(defender.id, defGangId, `pvp_defense_${attackType}`);

    // Gang reputation grant on PvP win (10 GR + bump pvp_wins contract)
    if (attackerWins) {
      addGangReputation(attacker.id, 10, "pvp_wins", 1);
    }

    // Auto-track gang daily task for pvp_win-type operations
    if (attackerWins) {
      const gm = db.select({ gangId: schema.gangMembers.gangId })
        .from(schema.gangMembers)
        .where(eq(schema.gangMembers.userId, attacker.id))
        .all()[0];
      if (gm) {
        const activeOp = db.select()
          .from(schema.gangActiveOperations)
          .where(eq(schema.gangActiveOperations.gangId, gm.gangId))
          .all()[0];
        if (activeOp) {
          const opDef = db.select()
            .from(schema.gangOperationDefs)
            .where(eq(schema.gangOperationDefs.id, activeOp.operationDefId))
            .all()[0];
          if (opDef && opDef.dailyTaskType === "pvp_win") {
            const today = new Date().toISOString().split("T")[0];
            const existingTask = db.select()
              .from(schema.gangDailyTasks)
              .where(and(
                eq(schema.gangDailyTasks.userId, attacker.id),
                eq(schema.gangDailyTasks.operationDefId, opDef.id),
                eq(schema.gangDailyTasks.taskDate, today),
              ))
              .all()[0];
            if (!existingTask) {
              db.insert(schema.gangDailyTasks).values({
                gangId: gm.gangId,
                userId: attacker.id,
                operationDefId: opDef.id,
                taskDate: today,
                completed: true,
                verifiedAt: now,
              }).run();
            } else if (!existingTask.completed) {
              db.update(schema.gangDailyTasks)
                .set({ completed: true, verifiedAt: now })
                .where(eq(schema.gangDailyTasks.id, existingTask.id))
                .run();
            }
          }
        }
      }
    }

    // Update stats
    const atkStats = await db.query.playerStats.findFirst({
      where: eq(schema.playerStats.userId, attacker.id),
    });
    if (atkStats) {
      db.update(schema.playerStats)
        .set({
          pvpWins: atkStats.pvpWins + (attackerWins ? 1 : 0),
          pvpLosses: atkStats.pvpLosses + (attackerWins ? 0 : 1),
          totalMoneyEarned: atkStats.totalMoneyEarned + (lootCash || 0),
          earnedPvp: atkStats.earnedPvp + (lootCash || 0),
          respectPvp: atkStats.respectPvp + respectChange,
        })
        .where(eq(schema.playerStats.userId, attacker.id))
        .run();
    }

    const defStats = await db.query.playerStats.findFirst({
      where: eq(schema.playerStats.userId, defender.id),
    });
    if (defStats) {
      db.update(schema.playerStats)
        .set({
          pvpWins: defStats.pvpWins + (attackerWins ? 0 : 1),
          pvpLosses: defStats.pvpLosses + (attackerWins ? 1 : 0),
          totalMoneyLost: defStats.totalMoneyLost + (lootCash || 0),
        })
        .where(eq(schema.playerStats.userId, defender.id))
        .run();
    }

    // ─── Activity Feed Logging for PvP ───
    if (attackerWins) {
      if (lootCash >= 500) {
        logActivityEvent(attacker.id, "pvp_win",
          `Won a ${attackType} against ${defender.username} and stole $${lootCash.toLocaleString()}`,
          { attackType, targetUsername: defender.username, lootCash });
      }
      if (defender.hp - damageDealt <= 0) {
        logActivityEvent(attacker.id, "pvp_win",
          `Defeated ${defender.username} in a ${attackType} and sent them to the hospital`,
          { attackType, targetUsername: defender.username, damageDealt });
        logActivityEvent(defender.id, "pvp_loss",
          `Was hospitalized by ${attacker.username} in a ${attackType}`,
          { attackerUsername: attacker.username, attackType });
      }
      if (itemStolen) {
        logActivityEvent(attacker.id, "pvp_item_stolen",
          `Stole ${itemStolen.quantity}x ${itemStolen.name} from ${defender.username}`,
          { attackType, targetUsername: defender.username, itemName: itemStolen.name, quantity: itemStolen.quantity });
        logActivityEvent(defender.id, "pvp_item_stolen",
          `Had ${itemStolen.quantity}x ${itemStolen.name} stolen by ${attacker.username}`,
          { attackerUsername: attacker.username, itemName: itemStolen.name, quantity: itemStolen.quantity });
      }
    } else if (attacker.hp - damageTaken <= 0) {
      logActivityEvent(attacker.id, "pvp_loss",
        `Lost a ${attackType} against ${defender.username} and got hospitalized`,
        { attackType, targetUsername: defender.username });
    }

    // Create notification for defender
    db.insert(schema.notifications).values({
      userId: defender.id,
      type: "attack_received",
      title: "You were attacked!",
      body: `${attacker.username} ${attackerWins ? "defeated" : "failed to defeat"} you in a ${attackType}.`,
      createdAt: now,
    }).run();

    res.json({
      attackerWin: attackerWins,
      isCrit: attackerWins && isCrit,
      attackType,
      targetUsername: defender.username,
      damageDealt,
      damageTaken,
      lootCash: lootCash || 0,
      respectChange,
      itemStolen,
      targetHp: Math.max(0, defender.hp - damageDealt),
      yourHp: Math.max(0, attacker.hp - damageTaken),
      hospitalized: attackerWins ? (defender.hp - damageDealt <= 0) : (attacker.hp - damageTaken <= 0),
      attackerPower: Math.round(atkPower),
      defenderPower: Math.round(defPower),
      respectModifier: respectMod,
      turnsLeft: usingRetaliation ? attacker.turns : attacker.turns - cost,
      usingRetaliation,
    });
  } catch (err) {
    console.error("Attack error:", err);
    res.status(500).json({ error: "Server error" });
  }
});
