import { Router, Response } from "express";
import { db, schema } from "../db";
import { eq, and, sql } from "drizzle-orm";
import { authMiddleware, AuthRequest } from "../middleware/auth";
import { refreshTurns } from "./turns";

export const hoesRouter = Router();

function getSkillLevel(userId: number, skillName: string): number {
  const skill = db.select({ level: schema.userSkills.level })
    .from(schema.userSkills)
    .innerJoin(schema.skillDefinitions, eq(schema.userSkills.skillId, schema.skillDefinitions.id))
    .where(and(eq(schema.userSkills.userId, userId), eq(schema.skillDefinitions.name, skillName)))
    .all()[0];
  return skill?.level ?? 0;
}

// ─── GET /api/hoes — list owned hoes with pending earnings ───

hoesRouter.get("/", authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const user = await db.query.users.findFirst({ where: eq(schema.users.id, req.userId!) });
    if (!user) { res.status(404).json({ error: "User not found" }); return; }

    const rows = db.select({
      inventory: schema.userInventory,
      item: schema.items,
    })
    .from(schema.userInventory)
    .innerJoin(schema.items, eq(schema.userInventory.itemId, schema.items.id))
    .where(and(eq(schema.userInventory.userId, user.id), eq(schema.items.type, "hoe")))
    .all();

    const charLevel = user.charisma;
    const womensStudies = getSkillLevel(user.id, "Women's Studies");
    const sexualEd = getSkillLevel(user.id, "Sexual Education");

    let totalPending = 0;
    const hoes = rows.map(row => {
      let baseIncome = 0;
      try {
        const effects = JSON.parse(row.item.effects);
        baseIncome = effects.incomePerHour ?? 0;
      } catch {}

      // Skill multipliers
      const charBonus = 1 + charLevel * 0.01;      // up to 2x at 100 charisma
      const wsBonus = 1 + womensStudies * 0.008;    // up to 1.8x at 100 Women's Studies
      const seBonus = 1 + sexualEd * 0.01;          // up to 2x at 100 Sexual Education
      const effectiveIncome = Math.round(baseIncome * charBonus * wsBonus * seBonus);

      // Pending earnings since last collection
      const lastCollected = new Date(row.inventory.acquiredAt).getTime();
      const now = Date.now();
      const hoursElapsed = Math.max(0, (now - lastCollected) / (60 * 60 * 1000));
      const maxHours = 12;
      const pendingHours = Math.min(hoursElapsed, maxHours);
      const pendingEarnings = Math.floor(effectiveIncome * pendingHours);
      totalPending += pendingEarnings;

      return {
        id: row.inventory.id,
        itemId: row.item.id,
        name: row.item.name,
        description: row.item.description,
        baseIncome,
        effectiveIncome,
        pendingEarnings,
        lastCollectedAt: row.inventory.acquiredAt,
        hoursElapsed: Math.round(hoursElapsed * 100) / 100,
      };
    });

    // Available hoes not yet owned
    const allHoes = db.select().from(schema.items).where(eq(schema.items.type, "hoe")).all();
    const ownedIds = new Set(rows.map(r => r.item.id));
    const available = allHoes
      .filter(h => !ownedIds.has(h.id) && h.minLevel <= user.level)
      .map(h => ({
        id: h.id,
        name: h.name,
        description: h.description,
        buyPrice: h.buyPrice,
        minLevel: h.minLevel,
        incomePerHour: (() => { try { return JSON.parse(h.effects).incomePerHour ?? 0; } catch { return 0; } })(),
      }));

    res.json({
      hoes,
      available,
      totalPending,
      playerCash: user.cash,
      charisma: charLevel,
      womensStudiesLevel: womensStudies,
      sexualEdLevel: sexualEd,
    });
  } catch (err) {
    console.error("Hoes list error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// ─── POST /api/hoes/collect — collect pending earnings ───

hoesRouter.post("/collect", authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const user = await db.query.users.findFirst({ where: eq(schema.users.id, req.userId!) });
    if (!user) { res.status(404).json({ error: "User not found" }); return; }

    const rows = db.select({
      inventory: schema.userInventory,
      item: schema.items,
    })
    .from(schema.userInventory)
    .innerJoin(schema.items, eq(schema.userInventory.itemId, schema.items.id))
    .where(and(eq(schema.userInventory.userId, user.id), eq(schema.items.type, "hoe")))
    .all();

    if (rows.length === 0) {
      res.status(400).json({ error: "You don't have any hoes" });
      return;
    }

    const charLevel = user.charisma;
    const womensStudies = getSkillLevel(user.id, "Women's Studies");
    const sexualEd = getSkillLevel(user.id, "Sexual Education");
    const now = new Date();
    let totalCollected = 0;
    const results: { name: string; earned: number }[] = [];

    for (const row of rows) {
      let baseIncome = 0;
      try {
        const effects = JSON.parse(row.item.effects);
        baseIncome = effects.incomePerHour ?? 0;
      } catch {}

      const charBonus = 1 + charLevel * 0.01;
      const wsBonus = 1 + womensStudies * 0.008;
      const seBonus = 1 + sexualEd * 0.01;
      const effectiveIncome = Math.round(baseIncome * charBonus * wsBonus * seBonus);

      const lastCollected = new Date(row.inventory.acquiredAt).getTime();
      const hoursElapsed = Math.max(0, (now.getTime() - lastCollected) / (60 * 60 * 1000));
      const maxHours = 12;
      const earned = Math.floor(effectiveIncome * Math.min(hoursElapsed, maxHours));

      if (earned <= 0) continue;

      // Reset collection timer
      db.update(schema.userInventory)
        .set({ acquiredAt: now.toISOString() })
        .where(eq(schema.userInventory.id, row.inventory.id))
        .run();

      totalCollected += earned;
      results.push({ name: row.item.name, earned });
    }

    if (totalCollected <= 0) {
      res.json({
        success: true,
        results: [],
        totalCollected: 0,
        cash: user.cash,
        collectedAt: new Date().toISOString(),
        message: "Nothing to collect yet. Give your hoes some time to work.",
      });
      return;
    }

    // Add cash
    db.update(schema.users)
      .set({ cash: user.cash + totalCollected })
      .where(eq(schema.users.id, user.id))
      .run();

    res.json({
      success: true,
      results,
      totalCollected,
      cash: user.cash + totalCollected,
      collectedAt: now.toISOString(),
    });
  } catch (err) {
    console.error("Hoes collect error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// ─── POST /api/hoes/buy/:itemId — buy a hoe ───

hoesRouter.post("/buy/:itemId", authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const itemId = Number(req.params.itemId);

    const user = await db.query.users.findFirst({ where: eq(schema.users.id, req.userId!) });
    if (!user) { res.status(404).json({ error: "User not found" }); return; }

    const itemRow = db.select().from(schema.items).where(eq(schema.items.id, itemId)).all();
    if (itemRow.length === 0) { res.status(404).json({ error: "Item not found" }); return; }
    const item = itemRow[0];

    if (item.type !== "hoe") {
      res.status(400).json({ error: "Only hoes can be bought here" });
      return;
    }

    if (item.minLevel > user.level) {
      res.status(400).json({ error: `Requires level ${item.minLevel}` });
      return;
    }

    // Refresh turns before checking
    const refreshedTurns = refreshTurns(user);

    if (user.cash < item.buyPrice) {
      res.status(400).json({ error: "Not enough cash" });
      return;
    }

    // Turn cost: 3 turns to recruit
    if (refreshedTurns < 3) {
      res.status(400).json({ error: "Not enough turns (need 3 turns to recruit)" });
      return;
    }

    db.update(schema.users)
      .set({ cash: user.cash - item.buyPrice, turns: refreshedTurns - 3 })
      .where(eq(schema.users.id, user.id))
      .run();

    const now = new Date().toISOString();
    db.insert(schema.userInventory).values({
      userId: user.id,
      itemId: item.id,
      equipped: false,
      quantity: 1,
      acquiredAt: now,
    }).run();

    res.json({
      success: true,
      itemName: item.name,
      cost: item.buyPrice,
      cash: user.cash - item.buyPrice,
      turns: refreshedTurns - 3,
    });
  } catch (err) {
    console.error("Hoes buy error:", err);
    res.status(500).json({ error: "Server error" });
  }
});
