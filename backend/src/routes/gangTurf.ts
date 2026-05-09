import { Router, Response } from "express";
import { z } from "zod";
import { db, schema } from "../db";
import { eq, and, sql } from "drizzle-orm";
import { authMiddleware, AuthRequest, jailCheck, hpCheck } from "../middleware/auth";

export const gangTurfRouter = Router();

// GET /api/gangs/:gangId/turf — list all districts with claim/challenge status
gangTurfRouter.get("/:gangId/turf", authMiddleware, (req: AuthRequest, res: Response) => {
  try {
    const gangId = parseInt(req.params.gangId as string);

    const gang = db.select().from(schema.gangs).where(eq(schema.gangs.id, gangId)).all()[0];
    if (!gang) {
      res.status(404).json({ error: "Gang not found" });
      return;
    }

    const membership = db.select()
      .from(schema.gangMembers)
      .where(and(eq(schema.gangMembers.userId, req.userId!), eq(schema.gangMembers.gangId, gangId)))
      .all()[0];
    if (!membership) {
      res.status(403).json({ error: "You're not a member of this gang" });
      return;
    }

    const districts = db.select().from(schema.turfDistricts).all();
    const allTurf = db.select().from(schema.gangTurf).all();
    const allGangs = db.select({ id: schema.gangs.id, name: schema.gangs.name, tag: schema.gangs.tag })
      .from(schema.gangs)
      .all();
    const allArsenal = db.select({ assignedTurfId: schema.gangArsenal.assignedTurfId, pvpPower: schema.gangArsenal.pvpPower })
      .from(schema.gangArsenal)
      .all();
    const gangMap = new Map(allGangs.map(g => [g.id, g]));

    const districtsWithOwners = districts.map((d) => {
      const turf = allTurf.find((t) => t.districtId === d.id);
      let owner = null;
      if (turf) {
        const g = gangMap.get(turf.gangId);
        const challengerGang = turf.challengedBy ? gangMap.get(turf.challengedBy) : null;
        // Defense power from arsenal items assigned to this district
        const defenseItems = allArsenal.filter((a) => a.assignedTurfId === d.id);
        const defensePower = defenseItems.reduce((sum, a) => sum + a.pvpPower, 0);
        owner = {
          districtId: d.id,
          districtName: d.name,
          gangId: turf.gangId,
          gangName: g?.name ?? "Unknown",
          gangTag: g?.tag ?? "???",
          claimedAt: turf.claimedAt,
          challengedBy: turf.challengedBy,
          challengedByGangName: challengerGang?.name ?? null,
          challengeExpiresAt: turf.challengeExpiresAt,
          defensePower,
        };
      }
      return { ...d, owner };
    });

    res.json({ districts: districtsWithOwners, vault: gang.vault });
  } catch (err) {
    console.error("Turf list error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// POST /api/gangs/:gangId/turf/claim/:districtId — claim a district
gangTurfRouter.post("/:gangId/turf/claim/:districtId", authMiddleware, jailCheck, hpCheck, (req: AuthRequest, res: Response) => {
  try {
    const gangId = parseInt(req.params.gangId as string);
    const districtId = parseInt(req.params.districtId as string);

    const gang = db.select().from(schema.gangs).where(eq(schema.gangs.id, gangId)).all()[0];
    if (!gang) {
      res.status(404).json({ error: "Gang not found" });
      return;
    }

    const membership = db.select()
      .from(schema.gangMembers)
      .where(and(eq(schema.gangMembers.userId, req.userId!), eq(schema.gangMembers.gangId, gangId)))
      .all()[0];
    if (!membership) {
      res.status(403).json({ error: "You're not a member of this gang" });
      return;
    }

    const district = db.select().from(schema.turfDistricts).where(eq(schema.turfDistricts.id, districtId)).all()[0];
    if (!district) {
      res.status(404).json({ error: "District not found" });
      return;
    }

    // Check not already claimed
    const existing = db.select().from(schema.gangTurf).where(eq(schema.gangTurf.districtId, districtId)).all()[0];
    if (existing) {
      res.status(400).json({ error: "District already claimed" });
      return;
    }

    // Check vault has enough
    if (gang.vault < district.claimCost) {
      res.status(400).json({ error: `Not enough vault funds. Need $${district.claimCost.toLocaleString()}.` });
      return;
    }

    // Deduct from vault and claim
    db.update(schema.gangs)
      .set({ vault: sql`vault - ${district.claimCost}` })
      .where(eq(schema.gangs.id, gangId))
      .run();

    db.insert(schema.gangTurf).values({
      gangId,
      districtId,
      claimedAt: new Date().toISOString(),
    }).run();

    res.json({ message: `Claimed ${district.name}!`, vault: gang.vault - district.claimCost });
  } catch (err) {
    console.error("Turf claim error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// POST /api/gangs/:gangId/turf/challenge/:districtId — challenge the current owner
gangTurfRouter.post("/:gangId/turf/challenge/:districtId", authMiddleware, jailCheck, hpCheck, (req: AuthRequest, res: Response) => {
  try {
    const gangId = parseInt(req.params.gangId as string);
    const districtId = parseInt(req.params.districtId as string);

    const gang = db.select().from(schema.gangs).where(eq(schema.gangs.id, gangId)).all()[0];
    if (!gang) {
      res.status(404).json({ error: "Gang not found" });
      return;
    }

    const membership = db.select()
      .from(schema.gangMembers)
      .where(and(eq(schema.gangMembers.userId, req.userId!), eq(schema.gangMembers.gangId, gangId)))
      .all()[0];
    if (!membership) {
      res.status(403).json({ error: "You're not a member of this gang" });
      return;
    }

    const district = db.select().from(schema.turfDistricts).where(eq(schema.turfDistricts.id, districtId)).all()[0];
    if (!district) {
      res.status(404).json({ error: "District not found" });
      return;
    }

    const turf = db.select().from(schema.gangTurf).where(eq(schema.gangTurf.districtId, districtId)).all()[0];
    if (!turf) {
      res.status(400).json({ error: "District is unclaimed. Claim it instead." });
      return;
    }

    if (turf.gangId === gangId) {
      res.status(400).json({ error: "Your gang already owns this district" });
      return;
    }

    if (turf.challengedBy) {
      res.status(400).json({ error: "District is already under challenge" });
      return;
    }

    // Challenge fee: 10% of claim cost
    const challengeFee = Math.floor(district.claimCost * 0.1);
    if (gang.vault < challengeFee) {
      res.status(400).json({ error: `Not enough vault funds for challenge fee. Need $${challengeFee.toLocaleString()}.` });
      return;
    }

    // Calculate power: member stats for attacker, member stats + assigned arsenal for defender
    function calcGangPower(gangId: number): number {
      const members = db.select({
        id: schema.users.id,
        strength: schema.users.strength,
        agility: schema.users.agility,
        intelligence: schema.users.intelligence,
        charisma: schema.users.charisma,
        endurance: schema.users.endurance,
        level: schema.users.level,
      })
        .from(schema.gangMembers)
        .innerJoin(schema.users, eq(schema.gangMembers.userId, schema.users.id))
        .where(eq(schema.gangMembers.gangId, gangId))
        .all();

      let power = 0;
      for (const m of members) {
        power += m.strength + m.agility + m.intelligence + m.charisma + m.endurance + m.level * 2;
      }
      return power;
    }

    function calcDefenseArsenalPower(gangId: number, districtId: number): number {
      const assigned = db.select({ pvpPower: schema.gangArsenal.pvpPower })
        .from(schema.gangArsenal)
        .where(and(
          eq(schema.gangArsenal.gangId, gangId),
          eq(schema.gangArsenal.assignedTurfId, districtId),
        ))
        .all();
      return assigned.reduce((sum, i) => sum + i.pvpPower, 0);
    }

    const ourPower = calcGangPower(gangId);
    const defMemberPower = calcGangPower(turf.gangId);
    const defArsenalPower = calcDefenseArsenalPower(turf.gangId, districtId);
    const defPower = defMemberPower + defArsenalPower;
    const defGang = db.select().from(schema.gangs).where(eq(schema.gangs.id, turf.gangId)).all()[0];

    // Deduct challenge fee
    db.update(schema.gangs)
      .set({ vault: sql`vault - ${challengeFee}` })
      .where(eq(schema.gangs.id, gangId))
      .run();

    if (ourPower > defPower) {
      // Immediate takeover
      db.update(schema.gangTurf)
        .set({ gangId, challengedBy: null, challengeExpiresAt: null, claimedAt: new Date().toISOString() })
        .where(eq(schema.gangTurf.id, turf.id))
        .run();
      res.json({
        message: `Challenge successful! Your gang seized ${district.name} from ${defGang?.name ?? "Unknown"}!`,
        ourPower, defMemberPower, defArsenalPower, defPower, vault: gang.vault - challengeFee,
      });
    } else {
      // Challenge placed — 24h timer
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
      db.update(schema.gangTurf)
        .set({ challengedBy: gangId, challengeExpiresAt: expiresAt })
        .where(eq(schema.gangTurf.id, turf.id))
        .run();
      res.json({
        message: `Challenge placed on ${district.name}! Your gang needs more power. Current: ${ourPower} vs ${defPower} (${defArsenalPower} from arsenal). Challenge expires in 24h.`,
        ourPower, defMemberPower, defArsenalPower, defPower, expiresAt, vault: gang.vault - challengeFee,
      });
    }
  } catch (err) {
    console.error("Turf challenge error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// POST /api/gangs/:gangId/turf/abandon/:districtId — abandon a district
gangTurfRouter.post("/:gangId/turf/abandon/:districtId", authMiddleware, jailCheck, hpCheck, (req: AuthRequest, res: Response) => {
  try {
    const gangId = parseInt(req.params.gangId as string);
    const districtId = parseInt(req.params.districtId as string);

    const gang = db.select().from(schema.gangs).where(eq(schema.gangs.id, gangId)).all()[0];
    if (!gang) {
      res.status(404).json({ error: "Gang not found" });
      return;
    }

    // Leader only
    if (gang.leaderId !== req.userId) {
      res.status(403).json({ error: "Only the gang leader can abandon districts" });
      return;
    }

    const district = db.select().from(schema.turfDistricts).where(eq(schema.turfDistricts.id, districtId)).all()[0];
    if (!district) {
      res.status(404).json({ error: "District not found" });
      return;
    }

    const turf = db.select().from(schema.gangTurf).where(and(
      eq(schema.gangTurf.districtId, districtId),
      eq(schema.gangTurf.gangId, gangId),
    )).all()[0];
    if (!turf) {
      res.status(400).json({ error: "Your gang doesn't own this district" });
      return;
    }

    // Refund 50% of claim cost to vault
    const refund = Math.floor(district.claimCost * 0.5);
    db.update(schema.gangs)
      .set({ vault: sql`vault + ${refund}` })
      .where(eq(schema.gangs.id, gangId))
      .run();

    // Unassign all arsenal items from this district
    db.update(schema.gangArsenal)
      .set({ assignedTurfId: null })
      .where(eq(schema.gangArsenal.assignedTurfId, districtId))
      .run();

    db.delete(schema.gangTurf).where(eq(schema.gangTurf.id, turf.id)).run();

    res.json({ message: `Abandoned ${district.name}. Refunded $${refund.toLocaleString()} to vault.`, vault: gang.vault + refund });
  } catch (err) {
    console.error("Turf abandon error:", err);
    res.status(500).json({ error: "Server error" });
  }
});
