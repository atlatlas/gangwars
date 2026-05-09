import { Router, Response } from "express";
import { db, schema } from "../db";
import { eq, and, inArray, sql, desc } from "drizzle-orm";
import { authMiddleware, AuthRequest, jailCheck, hpCheck } from "../middleware/auth";

export const gangArsenalRouter = Router();

// Available arsenal item catalog
const ARSENAL_CATALOG: { name: string; type: "melee" | "firearm" | "explosive" | "armor"; pvpPower: number; crimeBonus: number; price: number }[] = [
  // Melee
  { name: "Brass Knuckles",    type: "melee",     pvpPower: 4,  crimeBonus: 1,  price: 3000 },
  { name: "Gang Knife",        type: "melee",     pvpPower: 8,  crimeBonus: 2,  price: 10000 },
  { name: "Machete",           type: "melee",     pvpPower: 14, crimeBonus: 4,  price: 40000 },
  { name: "Katana",            type: "melee",     pvpPower: 22, crimeBonus: 6,  price: 120000 },

  // Firearms
  { name: "Pistol",            type: "firearm",   pvpPower: 12, crimeBonus: 3,  price: 25000 },
  { name: "Sawed-off Shotgun", type: "firearm",   pvpPower: 20, crimeBonus: 5,  price: 50000 },
  { name: "SMG",               type: "firearm",   pvpPower: 28, crimeBonus: 7,  price: 100000 },
  { name: "Assault Rifle",     type: "firearm",   pvpPower: 35, crimeBonus: 10, price: 200000 },
  { name: "Sniper Rifle",      type: "firearm",   pvpPower: 45, crimeBonus: 12, price: 350000 },

  // Explosives
  { name: "Firecrackers",      type: "explosive", pvpPower: 6,  crimeBonus: 3,  price: 8000 },
  { name: "Molotov Cocktail",  type: "explosive", pvpPower: 15, crimeBonus: 8,  price: 35000 },
  { name: "Grenade",           type: "explosive", pvpPower: 25, crimeBonus: 14, price: 90000 },
  { name: "C4 Explosive",      type: "explosive", pvpPower: 40, crimeBonus: 20, price: 250000 },

  // Armor
  { name: "Leather Jacket",    type: "armor",     pvpPower: 2,  crimeBonus: 0,  price: 15000 },
  { name: "Bulletproof Vest",  type: "armor",     pvpPower: 5,  crimeBonus: 0,  price: 75000 },
  { name: "Tactical Armor",    type: "armor",     pvpPower: 10, crimeBonus: 2,  price: 180000 },
  { name: "Exoskeleton Plate", type: "armor",     pvpPower: 18, crimeBonus: 4,  price: 400000 },
];

function logArsenal(arsenalId: number, gangId: number, action: string, userId: number, details?: string): void {
  db.insert(schema.gangArsenalLog).values({
    arsenalId,
    gangId,
    action: action as any,
    userId,
    details: details ?? null,
    createdAt: new Date().toISOString(),
  }).run();
}

// GET /api/gangs/:gangId/arsenal — list owned arsenal + catalog
gangArsenalRouter.get("/:gangId/arsenal", authMiddleware, (req: AuthRequest, res: Response) => {
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

    const items = db.select()
      .from(schema.gangArsenal)
      .where(eq(schema.gangArsenal.gangId, gangId))
      .orderBy(desc(schema.gangArsenal.purchasedAt))
      .all();

    const logs = db.select()
      .from(schema.gangArsenalLog)
      .where(eq(schema.gangArsenalLog.gangId, gangId))
      .orderBy(desc(schema.gangArsenalLog.createdAt))
      .limit(20)
      .all();

    // Resolve turf names for assigned items
    const turfIds = items.filter(i => i.assignedTurfId).map(i => i.assignedTurfId!);
    const turfNames = new Map<number, string>();
    if (turfIds.length > 0) {
      const turfs = db.select({ id: schema.turfDistricts.id, name: schema.turfDistricts.name })
        .from(schema.turfDistricts)
        .where(inArray(schema.turfDistricts.id, turfIds))
        .all();
      for (const t of turfs) turfNames.set(t.id, t.name);
    }

    const itemsWithAssignment = items.map(i => ({
      ...i,
      assignedTurfName: i.assignedTurfId ? turfNames.get(i.assignedTurfId) ?? "Unknown" : null,
    }));

    res.json({
      catalog: ARSENAL_CATALOG,
      items: itemsWithAssignment,
      logs,
      vault: gang.vault,
    });
  } catch (err) {
    console.error("Arsenal list error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// POST /api/gangs/:gangId/arsenal/buy — buy an arsenal item from catalog
gangArsenalRouter.post("/:gangId/arsenal/buy", authMiddleware, jailCheck, hpCheck, (req: AuthRequest, res: Response) => {
  try {
    const gangId = parseInt(req.params.gangId as string);
    const { name } = req.body;
    if (!name) {
      res.status(400).json({ error: "Item name is required" });
      return;
    }

    const gang = db.select().from(schema.gangs).where(eq(schema.gangs.id, gangId)).all()[0];
    if (!gang) {
      res.status(404).json({ error: "Gang not found" });
      return;
    }

    // Only leader/lieutenant can buy
    const membership = db.select()
      .from(schema.gangMembers)
      .where(and(eq(schema.gangMembers.userId, req.userId!), eq(schema.gangMembers.gangId, gangId)))
      .all()[0];
    if (!membership || (membership.role !== "leader" && membership.role !== "lieutenant")) {
      res.status(403).json({ error: "Only the leader or lieutenants can buy arsenal items" });
      return;
    }

    const catalogItem = ARSENAL_CATALOG.find(i => i.name === name);
    if (!catalogItem) {
      res.status(404).json({ error: "Item not found in arsenal catalog" });
      return;
    }

    if (gang.vault < catalogItem.price) {
      res.status(400).json({ error: `Not enough vault funds. Need $${catalogItem.price.toLocaleString()}.` });
      return;
    }

    // Deduct from vault
    db.update(schema.gangs)
      .set({ vault: sql`vault - ${catalogItem.price}` })
      .where(eq(schema.gangs.id, gangId))
      .run();

    // Create arsenal item
    const now = new Date().toISOString();
    const result = db.insert(schema.gangArsenal).values({
      gangId,
      name: catalogItem.name,
      type: catalogItem.type,
      durability: 100,
      maxDurability: 100,
      pvpPower: catalogItem.pvpPower,
      crimeBonus: catalogItem.crimeBonus,
      purchasePrice: catalogItem.price,
      purchasedAt: now,
    }).run();

    logArsenal(Number(result.lastInsertRowid), gangId, "purchase", req.userId!, `Purchased ${catalogItem.name} for $${catalogItem.price}`);

    res.json({ message: `Purchased ${catalogItem.name} for the gang!`, vault: gang.vault - catalogItem.price });
  } catch (err) {
    console.error("Arsenal buy error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// POST /api/gangs/:gangId/arsenal/:arsenalId/assign-turf/:turfId — assign item to a turf (leader only)
gangArsenalRouter.post("/:gangId/arsenal/:arsenalId/assign-turf/:turfId", authMiddleware, jailCheck, hpCheck, (req: AuthRequest, res: Response) => {
  try {
    const gangId = parseInt(req.params.gangId as string);
    const arsenalId = parseInt(req.params.arsenalId as string);
    const turfId = parseInt(req.params.turfId as string);

    // Verify leader, lieutenant, or enforcer
    const membership = db.select()
      .from(schema.gangMembers)
      .where(and(eq(schema.gangMembers.userId, req.userId!), eq(schema.gangMembers.gangId, gangId)))
      .all()[0];
    if (!membership || (membership.role !== "leader" && membership.role !== "lieutenant" && membership.role !== "enforcer")) {
      res.status(403).json({ error: "Only leaders, lieutenants, and enforcers can assign arsenal to turfs" });
      return;
    }

    // Verify item exists and belongs to gang
    const item = db.select()
      .from(schema.gangArsenal)
      .where(and(eq(schema.gangArsenal.id, arsenalId), eq(schema.gangArsenal.gangId, gangId)))
      .all()[0];
    if (!item) {
      res.status(404).json({ error: "Arsenal item not found" });
      return;
    }

    // Verify turf is owned by this gang
    const turf = db.select().from(schema.gangTurf).where(and(
      eq(schema.gangTurf.districtId, turfId),
      eq(schema.gangTurf.gangId, gangId),
    )).all()[0];
    if (!turf) {
      res.status(400).json({ error: "Your gang doesn't own this district" });
      return;
    }

    const district = db.select().from(schema.turfDistricts).where(eq(schema.turfDistricts.id, turfId)).all()[0];

    // Assign item to turf
    db.update(schema.gangArsenal)
      .set({ assignedTurfId: turfId })
      .where(eq(schema.gangArsenal.id, arsenalId))
      .run();

    logArsenal(arsenalId, gangId, "equip", req.userId!, `Assigned ${item.name} to ${district?.name ?? "Turf"}`);

    res.json({ message: `Assigned ${item.name} to ${district?.name ?? "Turf"}!` });
  } catch (err) {
    console.error("Arsenal assign error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// POST /api/gangs/:gangId/arsenal/:arsenalId/unassign-turf — unassign item from its turf (leader only)
gangArsenalRouter.post("/:gangId/arsenal/:arsenalId/unassign-turf", authMiddleware, jailCheck, hpCheck, (req: AuthRequest, res: Response) => {
  try {
    const gangId = parseInt(req.params.gangId as string);
    const arsenalId = parseInt(req.params.arsenalId as string);

    // Verify leader, lieutenant, or enforcer
    const membership = db.select()
      .from(schema.gangMembers)
      .where(and(eq(schema.gangMembers.userId, req.userId!), eq(schema.gangMembers.gangId, gangId)))
      .all()[0];
    if (!membership || (membership.role !== "leader" && membership.role !== "lieutenant" && membership.role !== "enforcer")) {
      res.status(403).json({ error: "Only leaders, lieutenants, and enforcers can unassign arsenal from turfs" });
      return;
    }

    // Verify item exists
    const item = db.select()
      .from(schema.gangArsenal)
      .where(and(eq(schema.gangArsenal.id, arsenalId), eq(schema.gangArsenal.gangId, gangId)))
      .all()[0];
    if (!item) {
      res.status(404).json({ error: "Arsenal item not found" });
      return;
    }

    if (!item.assignedTurfId) {
      res.status(400).json({ error: "Item is not assigned to any turf" });
      return;
    }

    db.update(schema.gangArsenal)
      .set({ assignedTurfId: null })
      .where(eq(schema.gangArsenal.id, arsenalId))
      .run();

    logArsenal(arsenalId, gangId, "unequip", req.userId!, `Unassigned ${item.name} from turf`);

    res.json({ message: `Unassigned ${item.name} from turf!` });
  } catch (err) {
    console.error("Arsenal unassign error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// POST /api/gangs/:gangId/arsenal/:arsenalId/repair — repair item from vault
gangArsenalRouter.post("/:gangId/arsenal/:arsenalId/repair", authMiddleware, jailCheck, hpCheck, (req: AuthRequest, res: Response) => {
  try {
    const gangId = parseInt(req.params.gangId as string);
    const arsenalId = parseInt(req.params.arsenalId as string);

    const gang = db.select().from(schema.gangs).where(eq(schema.gangs.id, gangId)).all()[0];
    if (!gang) {
      res.status(404).json({ error: "Gang not found" });
      return;
    }

    // Only leader/lieutenant can repair
    const membership = db.select()
      .from(schema.gangMembers)
      .where(and(eq(schema.gangMembers.userId, req.userId!), eq(schema.gangMembers.gangId, gangId)))
      .all()[0];
    if (!membership || (membership.role !== "leader" && membership.role !== "lieutenant")) {
      res.status(403).json({ error: "Only the leader or lieutenants can repair arsenal items" });
      return;
    }

    const item = db.select()
      .from(schema.gangArsenal)
      .where(and(eq(schema.gangArsenal.id, arsenalId), eq(schema.gangArsenal.gangId, gangId)))
      .all()[0];
    if (!item) {
      res.status(404).json({ error: "Arsenal item not found" });
      return;
    }

    if (item.durability >= item.maxDurability) {
      res.status(400).json({ error: "Item is already at full durability" });
      return;
    }

    // Repair cost: 50% of purchasePrice * (1 - durability/maxDurability)
    const dmgRatio = 1 - item.durability / item.maxDurability;
    const repairCost = Math.max(100, Math.floor(item.purchasePrice * 0.5 * dmgRatio));

    if (gang.vault < repairCost) {
      res.status(400).json({ error: `Not enough vault funds. Need $${repairCost.toLocaleString()}.` });
      return;
    }

    db.update(schema.gangs)
      .set({ vault: sql`vault - ${repairCost}` })
      .where(eq(schema.gangs.id, gangId))
      .run();

    db.update(schema.gangArsenal)
      .set({ durability: item.maxDurability, lastRepairAt: new Date().toISOString() })
      .where(eq(schema.gangArsenal.id, arsenalId))
      .run();

    logArsenal(arsenalId, gangId, "repair", req.userId!,
      `Repaired ${item.name} for $${repairCost} (was ${item.durability}/${item.maxDurability})`);

    res.json({ message: `Repaired ${item.name} for $${repairCost}!`, vault: gang.vault - repairCost });
  } catch (err) {
    console.error("Arsenal repair error:", err);
    res.status(500).json({ error: "Server error" });
  }
});
