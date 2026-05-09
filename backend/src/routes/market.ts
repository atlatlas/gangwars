import { Router, Response } from "express";
import { z } from "zod";
import { db, schema } from "../db";
import { eq, and, sql } from "drizzle-orm";
import { authMiddleware, AuthRequest, jailCheck, hpCheck } from "../middleware/auth";
import { logActivityEvent } from "./activityEvents";

export const marketRouter = Router();

// ─── Helpers ───

interface ItemEffects {
  crimeBonus?: number;
  pvpPower?: number;
  arrestReduction?: number;
  hpBonus?: number;
  passiveIncome?: number;
  drugProduction?: number;
  incomePerHour?: number;
}

function getItemEffects(item: typeof schema.items.$inferSelect): ItemEffects {
  try {
    return JSON.parse(item.effects);
  } catch {
    return {};
  }
}

function refreshDrugPrices(): boolean {
  const drugs = db.select().from(schema.items).where(eq(schema.items.type, "drug")).all();
  const now = new Date();
  const needsRefresh = drugs.some(
    (d) => !d.lastPriceUpdate || (now.getTime() - new Date(d.lastPriceUpdate).getTime()) > 30 * 60 * 1000
  );
  if (!needsRefresh) return false;

  for (const drug of drugs) {
    const vol = (drug.priceVolatility ?? 25) / 100;
    const base = drug.basePrice ?? drug.buyPrice;
    const newPrice = Math.round(base * (1 + (Math.random() * 2 - 1) * vol));
    db.update(schema.items)
      .set({
        previousPrice: drug.currentPrice,
        currentPrice: Math.max(1, newPrice),
        lastPriceUpdate: now.toISOString(),
      })
      .where(eq(schema.items.id, drug.id))
      .run();
  }
  return true;
}

// ─── GET /api/market — list buyable items ───

marketRouter.get("/", authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const user = await db.query.users.findFirst({ where: eq(schema.users.id, req.userId!) });
    if (!user) { res.status(404).json({ error: "User not found" }); return; }

    refreshDrugPrices();

    const allItems = db.select().from(schema.items).all();
    const available = allItems.filter(
      (item) => item.minLevel <= user.level && item.minRespect <= user.respect
    );

    const inventory = db.select().from(schema.userInventory).where(eq(schema.userInventory.userId, user.id)).all();
    const ownCount = new Map<number, number>();
    const equippedItemIds = new Set<number>();
    for (const inv of inventory) {
      ownCount.set(inv.itemId, (ownCount.get(inv.itemId) || 0) + inv.quantity);
      if (inv.equipped) equippedItemIds.add(inv.itemId);
    }

    const arms = available.filter((i) => i.type === "arm").map((i) => ({
      ...i,
      effects: getItemEffects(i),
      owned: (ownCount.get(i.id) || 0) > 0,
      equipped: equippedItemIds.has(i.id),
    }));

    const drugs = available.filter((i) => i.type === "drug").map((i) => {
      const prev = i.previousPrice ?? i.currentPrice ?? i.buyPrice;
      const curr = i.currentPrice ?? i.buyPrice;
      return {
        ...i,
        effects: getItemEffects(i),
        currentPrice: curr,
        previousPrice: prev,
        trend: (curr > prev ? "up" : curr < prev ? "down" : "stable") as "up" | "down" | "stable",
        owned: ownCount.get(i.id) || 0,
      };
    });

    const footmen = available.filter((i) => i.type === "footman").map((i) => ({
      ...i,
      effects: getItemEffects(i),
      owned: ownCount.get(i.id) || 0,
    }));

    const pimps = available.filter((i) => i.type === "pimp").map((i) => ({
      ...i,
      effects: getItemEffects(i),
      owned: ownCount.get(i.id) || 0,
    }));

    res.json({
      arms,
      drugs,
      footmen,
      pimps,
      playerCash: user.cash,
      playerRespect: user.respect,
      playerLevel: user.level,
    });
  } catch (err) {
    console.error("Market list error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// ─── GET /api/market/inventory — player inventory ───

marketRouter.get("/inventory", authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const user = await db.query.users.findFirst({ where: eq(schema.users.id, req.userId!) });
    if (!user) { res.status(404).json({ error: "User not found" }); return; }

    const rows = db
      .select({
        inventory: schema.userInventory,
        item: schema.items,
      })
      .from(schema.userInventory)
      .innerJoin(schema.items, eq(schema.userInventory.itemId, schema.items.id))
      .where(eq(schema.userInventory.userId, user.id))
      .all();

    const capacity = { max: 5 + user.level * 2, used: rows.length };

    const inventory = rows.map((row) => ({
      id: row.inventory.id,
      itemId: row.inventory.itemId,
      item: { ...row.item, effects: getItemEffects(row.item) },
      equipped: row.inventory.equipped,
      quantity: row.inventory.quantity,
      acquiredAt: row.inventory.acquiredAt,
    }));

    const equippedWeapon = inventory.find((i) => i.item.type === "arm" && i.equipped) || null;

    res.json({ inventory, capacity, equippedWeapon });
  } catch (err) {
    console.error("Inventory error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// ─── POST /api/market/buy/:itemId — purchase ───

marketRouter.post("/buy/:itemId", authMiddleware, jailCheck, hpCheck, async (req: AuthRequest, res: Response) => {
  try {
    const itemId = Number(req.params.itemId);
    const quantity = Math.max(1, Math.min(100, (req.body?.quantity ?? 1) as number));

    const user = await db.query.users.findFirst({ where: eq(schema.users.id, req.userId!) });
    if (!user) { res.status(404).json({ error: "User not found" }); return; }

    const itemRow = db.select().from(schema.items).where(eq(schema.items.id, itemId)).all();
    if (itemRow.length === 0) { res.status(404).json({ error: "Item not found" }); return; }
    const item = itemRow[0];

    if (item.minLevel > user.level) {
      res.status(400).json({ error: `Requires level ${item.minLevel}` });
      return;
    }
    if (item.minRespect > user.respect) {
      res.status(400).json({ error: `Requires ${item.minRespect} respect` });
      return;
    }

    // Chemistry skill: discount on drug purchases
    let chemDiscount = 0;
    if (item.type === "drug") {
      const chemSkill = db.select()
        .from(schema.userSkills)
        .innerJoin(schema.skillDefinitions, eq(schema.userSkills.skillId, schema.skillDefinitions.id))
        .where(and(eq(schema.userSkills.userId, user.id), eq(schema.skillDefinitions.name, "Chemistry")))
        .all()[0];
      if (chemSkill) {
        chemDiscount = Math.min(10, chemSkill.user_skills.level * 0.5); // max 10% discount
      }
    }

    const basePrice = item.type === "drug" ? (item.currentPrice ?? item.buyPrice) : item.buyPrice;
    const price = Math.round(basePrice * (1 - chemDiscount / 100));
    const totalCost = price * quantity;

    if (user.cash < totalCost) {
      res.status(400).json({ error: "Not enough cash" });
      return;
    }

    // Check capacity for non-drug items (drugs stack)
    if (item.type !== "drug") {
      const existingCount = db.select({ count: sql<number>`count(*)` })
        .from(schema.userInventory)
        .where(eq(schema.userInventory.userId, user.id))
        .all()[0]?.count ?? 0;

      const maxSlots = 5 + user.level * 2;
      if (existingCount >= maxSlots) {
        res.status(400).json({ error: "Inventory full" });
        return;
      }
    }

    db.update(schema.users)
      .set({ cash: user.cash - totalCost })
      .where(eq(schema.users.id, user.id))
      .run();

    const now = new Date().toISOString();

    if (item.type === "drug") {
      const existing = db.select()
        .from(schema.userInventory)
        .where(and(eq(schema.userInventory.userId, user.id), eq(schema.userInventory.itemId, item.id)))
        .all();

      if (existing.length > 0) {
        db.update(schema.userInventory)
          .set({ quantity: existing[0].quantity + quantity })
          .where(eq(schema.userInventory.id, existing[0].id))
          .run();
      } else {
        db.insert(schema.userInventory).values({
          userId: user.id,
          itemId: item.id,
          equipped: false,
          quantity,
          acquiredAt: now,
        }).run();
      }
    } else {
      const existing = db.select()
        .from(schema.userInventory)
        .where(and(eq(schema.userInventory.userId, user.id), eq(schema.userInventory.itemId, item.id)))
        .all();

      if (existing.length > 0) {
        db.update(schema.userInventory)
          .set({ quantity: existing[0].quantity + 1 })
          .where(eq(schema.userInventory.id, existing[0].id))
          .run();
      } else {
        const anyWeapon = item.type === "arm" ? db.select()
          .from(schema.userInventory)
          .where(and(eq(schema.userInventory.userId, user.id), eq(schema.userInventory.equipped, true)))
          .all() : [];

        db.insert(schema.userInventory).values({
          userId: user.id,
          itemId: item.id,
          equipped: item.type === "arm" && anyWeapon.length === 0,
          quantity: 1,
          acquiredAt: now,
        }).run();
      }
    }

    if ((item.type === "arm" || item.type === "footman") && item.buyPrice >= 50000) {
      logActivityEvent(user.id, "item_purchased",
        `Purchased ${item.name} for $${totalCost.toLocaleString()}`,
        { itemName: item.name, itemType: item.type, cost: totalCost });
    }

    res.json({ success: true, cash: user.cash - totalCost });
  } catch (err) {
    console.error("Buy error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// ─── POST /api/market/sell/:inventoryId — sell ───

marketRouter.post("/sell/:inventoryId", authMiddleware, jailCheck, hpCheck, async (req: AuthRequest, res: Response) => {
  try {
    const inventoryId = Number(req.params.inventoryId);
    const quantity = Math.max(1, Math.min(100, (req.body?.quantity ?? 1) as number));

    const user = await db.query.users.findFirst({ where: eq(schema.users.id, req.userId!) });
    if (!user) { res.status(404).json({ error: "User not found" }); return; }

    const invRow = db.select().from(schema.userInventory).where(eq(schema.userInventory.id, inventoryId)).all();
    if (invRow.length === 0) { res.status(404).json({ error: "Item not found in inventory" }); return; }
    const inv = invRow[0];

    if (inv.userId !== req.userId) { res.status(403).json({ error: "Not your item" }); return; }

    const itemRow = db.select().from(schema.items).where(eq(schema.items.id, inv.itemId)).all();
    if (itemRow.length === 0) { res.status(404).json({ error: "Item not found" }); return; }
    const item = itemRow[0];

    let cashAwarded: number;
    let remaining = 0;

    if (item.type === "drug") {
      // Chemistry skill: sell premium
      let chemPremium = 0;
      const chemSkill = db.select()
        .from(schema.userSkills)
        .innerJoin(schema.skillDefinitions, eq(schema.userSkills.skillId, schema.skillDefinitions.id))
        .where(and(eq(schema.userSkills.userId, user.id), eq(schema.skillDefinitions.name, "Chemistry")))
        .all()[0];
      if (chemSkill) {
        chemPremium = Math.min(10, chemSkill.user_skills.level * 0.5); // max 10% sell bonus
      }
      const price = Math.round((item.currentPrice ?? item.buyPrice) * (1 + chemPremium / 100));
      const toSell = Math.min(quantity, inv.quantity);
      cashAwarded = price * toSell;
      remaining = inv.quantity - toSell;
      if (remaining <= 0) {
        if (inv.equipped) db.update(schema.userInventory).set({ equipped: false }).where(eq(schema.userInventory.id, inv.id)).run();
        db.delete(schema.userInventory).where(eq(schema.userInventory.id, inv.id)).run();
      } else {
        db.update(schema.userInventory).set({ quantity: remaining }).where(eq(schema.userInventory.id, inv.id)).run();
      }
    } else if (item.sellPrice > 0) {
      cashAwarded = item.sellPrice;
      if (inv.equipped) db.update(schema.userInventory).set({ equipped: false }).where(eq(schema.userInventory.id, inv.id)).run();
      db.delete(schema.userInventory).where(eq(schema.userInventory.id, inv.id)).run();
    } else {
      res.status(400).json({ error: "This item cannot be sold" });
      return;
    }

    db.update(schema.users)
      .set({ cash: user.cash + cashAwarded })
      .where(eq(schema.users.id, user.id))
      .run();

    res.json({ success: true, cashAwarded, cash: user.cash + cashAwarded, quantityRemaining: Math.max(0, remaining) });
  } catch (err) {
    console.error("Sell error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// ─── POST /api/market/equip/:inventoryId — toggle equip ───

marketRouter.post("/equip/:inventoryId", authMiddleware, jailCheck, hpCheck, async (req: AuthRequest, res: Response) => {
  try {
    const inventoryId = Number(req.params.inventoryId);

    const user = await db.query.users.findFirst({ where: eq(schema.users.id, req.userId!) });
    if (!user) { res.status(404).json({ error: "User not found" }); return; }

    const invRow = db.select().from(schema.userInventory).where(eq(schema.userInventory.id, inventoryId)).all();
    if (invRow.length === 0) { res.status(404).json({ error: "Item not found in inventory" }); return; }
    const inv = invRow[0];

    if (inv.userId !== req.userId) { res.status(403).json({ error: "Not your item" }); return; }

    const itemRow = db.select().from(schema.items).where(eq(schema.items.id, inv.itemId)).all();
    if (itemRow.length === 0) { res.status(404).json({ error: "Item not found" }); return; }
    const item = itemRow[0];

    if (item.type !== "arm") { res.status(400).json({ error: "Only weapons can be equipped" }); return; }

    if (inv.equipped) {
      db.update(schema.userInventory).set({ equipped: false }).where(eq(schema.userInventory.id, inv.id)).run();
    } else {
      db.transaction(() => {
        db.update(schema.userInventory)
          .set({ equipped: false })
          .where(and(eq(schema.userInventory.userId, user.id), eq(schema.userInventory.equipped, true)))
          .run();
        db.update(schema.userInventory)
          .set({ equipped: true })
          .where(eq(schema.userInventory.id, inv.id))
          .run();
      });
    }

    res.json({ success: true, equipped: !inv.equipped });
  } catch (err) {
    console.error("Equip error:", err);
    res.status(500).json({ error: "Server error" });
  }
});
