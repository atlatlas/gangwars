import { Router, Response } from "express";
import { z } from "zod";
import { db, schema } from "../db";
import { eq, and, sql, desc, lt, gt } from "drizzle-orm";
import { authMiddleware, AuthRequest, jailCheck, hpCheck } from "../middleware/auth";
import { refreshTurns } from "./turns";
import { logActivityEvent } from "./activityEvents";

export const drugMarketRouter = Router();

// ─── News Templates ───

interface NewsTemplate {
  headline: string;
  body: string;
  drugName?: string; // undefined = global
  effectType: "up" | "down" | "random";
  effectMagnitude: number;
}

const newsTemplates: NewsTemplate[] = [
  { headline: "Major Drug Bust at Port", body: "Authorities seized a massive shipment at the docks. Supply disruptions expected across the board.", effectType: "up", effectMagnitude: 0.3 },
  { headline: "Record Seizure in International Waters", body: "Coast Guard intercepts multi-million dollar shipment. Market braces for shortage.", effectType: "up", effectMagnitude: 0.25 },
  { headline: "New Supply Route Opens", body: "Traffickers have established a new corridor. Increased supply expected to lower prices.", effectType: "down", effectMagnitude: 0.2 },
  { headline: "Government Announces New Task Force", body: "Federal anti-drug task force formed. Market uncertainty drives prices up.", effectType: "up", effectMagnitude: 0.15 },
  { headline: "Economic Downturn Fuels Demand", body: "Recession fears drive increased demand for escapism. Prices trending up.", effectType: "up", effectMagnitude: 0.15 },
  { headline: "Interagency Crackdown Intensifies", body: "Multiple agencies coordinating efforts. Supply lines under pressure.", effectType: "up", effectMagnitude: 0.2 },
  { headline: "Cartel Ceasefire Announced", body: "Rival cartels agree to truce. Stable supply expected to reduce prices.", effectType: "down", effectMagnitude: 0.25 },
  { headline: "Overproduction Floods Market", body: "Surplus product entering the market chain. Prices dropping across the board.", effectType: "down", effectMagnitude: 0.25 },
  // Drug-specific
  { headline: "Colombian Coke Production Disrupted", body: "Lab raids in Colombia have disrupted supply chains for cocaine.", drugName: "Coke", effectType: "up", effectMagnitude: 0.4 },
  { headline: "Cocaine Lab Raided in Jungle", body: "Massive lab taken down. Coke prices expected to surge.", drugName: "Coke", effectType: "up", effectMagnitude: 0.35 },
  { headline: "Weed Legalization Debate Heats Up", body: "Political momentum building. Market floods with supply ahead of potential legalization.", drugName: "Weed", effectType: "down", effectMagnitude: 0.3 },
  { headline: "California Harvest Exceeds Expectations", body: "Record-breaking outdoor grow season. Weed prices plummet.", drugName: "Weed", effectType: "down", effectMagnitude: 0.35 },
  { headline: "Synthetic Lab Discovered in Midwest", body: "Massive MDMA production facility taken down. Supply crunch expected.", drugName: "Molly", effectType: "up", effectMagnitude: 0.4 },
  { headline: "MDMA Purity at All-Time High", body: "New synthesis method produces purer product. Street prices rising.", drugName: "Molly", effectType: "up", effectMagnitude: 0.3 },
  { headline: "Heroin Drought Hits East Coast", body: "Supply routes from Afghanistan disrupted. Prices skyrocketing.", drugName: "Heroin", effectType: "up", effectMagnitude: 0.45 },
  { headline: "Fentanyl Seizure at Border", body: "Massive fentanyl bust. Heroin market in disarray.", drugName: "Heroin", effectType: "up", effectMagnitude: 0.35 },
  { headline: "Mexican Cartel Expands Speed Production", body: "New meth superlab operational. Supply glut expected.", drugName: "Speed", effectType: "down", effectMagnitude: 0.3 },
  { headline: "Pharmaceutical Precursor Crackdown", body: "New regulations on precursor chemicals. Speed production costs rising.", drugName: "Speed", effectType: "up", effectMagnitude: 0.3 },
  { headline: "LSD Renaissance Among Youth", body: "Psychedelic resurgence driving unprecedented demand.", drugName: "LSD", effectType: "up", effectMagnitude: 0.35 },
  { headline: "Research Chemical Flood", body: "New analogs flooding the market. LSD prices under pressure.", drugName: "LSD", effectType: "down", effectMagnitude: 0.3 },
];

const drugNames = ["Weed", "Speed", "LSD", "Coke", "Molly", "Heroin"];

// ─── Helpers ───

function getDrugItemId(name: string): number | undefined {
  const item = db.select().from(schema.items).where(eq(schema.items.name, name)).all()[0];
  return item?.id;
}

function getChemistryLevel(userId: number): number {
  const skill = db.select({ level: schema.userSkills.level })
    .from(schema.userSkills)
    .innerJoin(schema.skillDefinitions, eq(schema.userSkills.skillId, schema.skillDefinitions.id))
    .where(and(eq(schema.userSkills.userId, userId), eq(schema.skillDefinitions.name, "Chemistry")))
    .all()[0];
  return skill?.level ?? 0;
}

function getSkillLevel(userId: number, skillName: string): number {
  const skill = db.select({ level: schema.userSkills.level })
    .from(schema.userSkills)
    .innerJoin(schema.skillDefinitions, eq(schema.userSkills.skillId, schema.skillDefinitions.id))
    .where(and(eq(schema.userSkills.userId, userId), eq(schema.skillDefinitions.name, skillName)))
    .all()[0];
  return skill?.level ?? 0;
}

function refreshDrugPrices(): boolean {
  const drugs = db.select().from(schema.items).where(eq(schema.items.type, "drug")).all();
  const now = new Date();
  const needsRefresh = drugs.some(
    (d) => !d.lastPriceUpdate || (now.getTime() - new Date(d.lastPriceUpdate).getTime()) > 30 * 60 * 1000
  );
  if (!needsRefresh) return false;

  // Record current prices to history before changing them
  for (const drug of drugs) {
    const currPrice = drug.currentPrice ?? drug.basePrice ?? drug.buyPrice;
    db.insert(schema.drugPriceHistory).values({
      itemId: drug.id,
      price: currPrice,
      recordedAt: now.toISOString(),
    }).run();
  }

  // Clean very old history (keep 72h)
  const cutoff = new Date(now.getTime() - 72 * 60 * 60 * 1000).toISOString();
  db.delete(schema.drugPriceHistory).where(lt(schema.drugPriceHistory.recordedAt, cutoff)).run();

  // Apply active news effects
  const activeNews = db.select().from(schema.drugNews).where(eq(schema.drugNews.active, true)).all();
  const newsStart = activeNews.find(n => n.createdAt && (now.getTime() - new Date(n.createdAt).getTime()) < 30 * 60 * 1000);

  for (const drug of drugs) {
    const vol = (drug.priceVolatility ?? 25) / 100;
    const base = drug.basePrice ?? drug.buyPrice;

    // Base random fluctuation
    let change = (Math.random() * 2 - 1) * vol;

    // Add news-driven effects
    for (const news of activeNews) {
      if (news.effectType === "random") continue;
      if (news.drugItemId && news.drugItemId !== drug.id) continue;

      const magnitude = news.effectMagnitude ?? 0.1;
      const isExpired = news.expiresAt && new Date(news.expiresAt) < now;
      if (isExpired) {
        db.update(schema.drugNews).set({ active: false }).where(eq(schema.drugNews.id, news.id)).run();
        continue;
      }

      // News effects decay over time: full effect for first hour, then taper
      const ageHours = (now.getTime() - new Date(news.createdAt).getTime()) / (60 * 60 * 1000);
      const decay = Math.max(0.1, 1 - ageHours * 0.3);
      const newsEffect = news.effectType === "up" ? magnitude : -magnitude;

      change += newsEffect * decay;
    }

    const newPrice = Math.round(base * (1 + change));
    db.update(schema.items)
      .set({
        previousPrice: drug.currentPrice,
        currentPrice: Math.max(1, newPrice),
        lastPriceUpdate: now.toISOString(),
      })
      .where(eq(schema.items.id, drug.id))
      .run();
  }

  // Expire old news (>4 hours)
  const expireCutoff = new Date(now.getTime() - 4 * 60 * 60 * 1000).toISOString();
  db.update(schema.drugNews)
    .set({ active: false })
    .where(lt(schema.drugNews.createdAt, expireCutoff))
    .run();

  return true;
}

function generateNews(): void {
  const now = new Date();
  // Check if we should generate news (40% chance)
  if (Math.random() > 0.4) return;

  // Don't generate if there's already very recent news
  const recentNews = db.select()
    .from(schema.drugNews)
    .where(eq(schema.drugNews.active, true))
    .all();
  if (recentNews.length >= 3) return; // max 3 active stories

  const template = newsTemplates[Math.floor(Math.random() * newsTemplates.length)];
  const drugItemId = template.drugName ? getDrugItemId(template.drugName) : null;

  // Apply effect directly if we want immediate price impact
  if (drugItemId) {
    const drug = db.select().from(schema.items).where(eq(schema.items.id, drugItemId)).all()[0];
    if (drug) {
      const base = drug.basePrice ?? drug.buyPrice;
      const effect = template.effectType === "up" ? (1 + template.effectMagnitude) : (1 - template.effectMagnitude);
      const newPrice = Math.max(1, Math.round(base * effect));
      db.update(schema.items)
        .set({
          previousPrice: drug.currentPrice,
          currentPrice: newPrice,
          lastPriceUpdate: now.toISOString(),
        })
        .where(eq(schema.items.id, drugItemId))
        .run();
    }
  }

  const expiresAt = new Date(now.getTime() + (2 + Math.floor(Math.random() * 3)) * 60 * 60 * 1000).toISOString();
  db.insert(schema.drugNews).values({
    headline: template.headline,
    body: template.body,
    drugItemId: drugItemId ?? undefined,
    effectType: template.effectType,
    effectMagnitude: template.effectMagnitude,
    active: true,
    createdAt: now.toISOString(),
    expiresAt,
  }).run();
}

// ─── GET /api/market/drugs — full drug market data ───

drugMarketRouter.get("/", authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const user = await db.query.users.findFirst({ where: eq(schema.users.id, req.userId!) });
    if (!user) { res.status(404).json({ error: "User not found" }); return; }

    // 1. Refresh prices + record history
    refreshDrugPrices();

    // 2. Maybe generate news
    generateNews();

    // 3. Get active news
    const news = db.select()
      .from(schema.drugNews)
      .where(eq(schema.drugNews.active, true))
      .orderBy(desc(schema.drugNews.createdAt))
      .all()
      .map(n => ({
        id: n.id,
        headline: n.headline,
        body: n.body,
        drugItemId: n.drugItemId,
        effectType: n.effectType,
        effectMagnitude: n.effectMagnitude,
        createdAt: n.createdAt,
        expiresAt: n.expiresAt,
      }));

    // 4. Get all drugs with current/previous prices
    const allDrugs = db.select().from(schema.items).where(eq(schema.items.type, "drug")).all();
    const drugs = allDrugs.map(d => {
      const prev = d.previousPrice ?? d.currentPrice ?? d.buyPrice;
      const curr = d.currentPrice ?? d.buyPrice;
      const hourlyChange = prev > 0 ? Math.round(((curr - prev) / prev) * 10000) / 100 : 0;
      return {
        id: d.id,
        name: d.name,
        description: d.description,
        basePrice: d.basePrice ?? d.buyPrice,
        currentPrice: curr,
        previousPrice: prev,
        hourlyChange,
        trend: (curr > prev ? "up" : curr < prev ? "down" : "stable") as "up" | "down" | "stable",
        priceVolatility: d.priceVolatility,
        minLevel: d.minLevel,
      };
    });

    // 5. Get user's drug holdings with P&L
    const inventoryRows = db.select({
      inventory: schema.userInventory,
      item: schema.items,
    })
    .from(schema.userInventory)
    .innerJoin(schema.items, eq(schema.userInventory.itemId, schema.items.id))
    .where(and(eq(schema.userInventory.userId, user.id), eq(schema.items.type, "drug")))
    .all();

    const holdings = inventoryRows.map(row => {
      const currPrice = row.item.currentPrice ?? row.item.buyPrice;
      const qty = row.inventory.quantity;
      const avgPrice = row.inventory.avgPurchasePrice ?? currPrice;
      return {
        inventoryId: row.inventory.id,
        itemId: row.item.id,
        name: row.item.name,
        quantity: qty,
        avgPurchasePrice: avgPrice,
        currentPrice: currPrice,
        currentValue: currPrice * qty,
        totalCost: avgPrice * qty,
        profitLoss: (currPrice - avgPrice) * qty,
        profitLossPercent: avgPrice > 0 ? Math.round(((currPrice - avgPrice) / avgPrice) * 10000) / 100 : 0,
      };
    });

    // 6. Get user's drug dealers
    const dealerRows = db.select({
      inventory: schema.userInventory,
      item: schema.items,
    })
    .from(schema.userInventory)
    .innerJoin(schema.items, eq(schema.userInventory.itemId, schema.items.id))
    .where(and(eq(schema.userInventory.userId, user.id), eq(schema.items.type, "drug_dealer")))
    .all();

    const chemLevel = getChemistryLevel(user.id);
    const sixthSense = getSkillLevel(user.id, "Sixth Sense");
    const intLevel = user.intelligence;

    const dealers = dealerRows.map(row => {
      let baseProduction = 0;
      try {
        const effects = JSON.parse(row.item.effects);
        baseProduction = effects.drugProduction ?? 0;
      } catch {}

      // Skill multipliers
      const intBonus = 1 + intLevel * 0.005; // up to 1.5x at 100 int
      const chemBonus = 1 + chemLevel * 0.005; // up to 1.5x at 100 chem
      const sixthBonus = 1 + sixthSense * 0.003; // up to 1.3x at 100 sixth
      const effectiveProduction = Math.round(baseProduction * intBonus * chemBonus * sixthBonus);

      // Calculate pending production since last collection
      const lastCollected = new Date(row.inventory.acquiredAt).getTime();
      const now = Date.now();
      const hoursElapsed = Math.max(0, (now - lastCollected) / (60 * 60 * 1000));
      const maxHours = 12; // cap at 12 hours
      const pendingHours = Math.min(hoursElapsed, maxHours);
      const pendingUnits = Math.floor(effectiveProduction * pendingHours);

      return {
        id: row.inventory.id,
        itemId: row.item.id,
        name: row.item.name,
        baseProduction,
        effectiveProduction,
        pendingUnits,
        lastCollectedAt: row.inventory.acquiredAt,
        hoursElapsed: Math.round(hoursElapsed * 100) / 100,
      };
    });

    // 7. Total portfolio value
    const totalDrugValue = holdings.reduce((sum, h) => sum + h.currentValue, 0);

    res.json({
      drugs,
      news,
      holdings,
      dealers,
      playerCash: user.cash,
      totalDrugValue,
      chemLevel,
    });
  } catch (err) {
    console.error("Drug market error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// ─── POST /api/market/drugs/buy/:itemId — buy drugs ───

drugMarketRouter.post("/buy/:itemId", authMiddleware, jailCheck, hpCheck, async (req: AuthRequest, res: Response) => {
  try {
    const itemId = Number(req.params.itemId);
    const quantity = Math.max(1, Math.min(1000, (req.body?.quantity ?? 1) as number));

    const user = await db.query.users.findFirst({ where: eq(schema.users.id, req.userId!) });
    if (!user) { res.status(404).json({ error: "User not found" }); return; }

    const itemRow = db.select().from(schema.items).where(eq(schema.items.id, itemId)).all();
    if (itemRow.length === 0) { res.status(404).json({ error: "Item not found" }); return; }
    const item = itemRow[0];

    if (item.type !== "drug") {
      res.status(400).json({ error: "Only drugs can be bought here" });
      return;
    }

    if (item.minLevel > user.level) {
      res.status(400).json({ error: `Requires level ${item.minLevel}` });
      return;
    }

    // Refresh prices
    refreshDrugPrices();

    const currPrice = item.currentPrice ?? item.buyPrice;
    const chemLevel = getChemistryLevel(user.id);
    const chemDiscount = Math.min(10, chemLevel * 0.5);
    const effectivePrice = Math.round(currPrice * (1 - chemDiscount / 100));
    const totalCost = effectivePrice * quantity;

    if (user.cash < totalCost) {
      res.status(400).json({ error: "Not enough cash" });
      return;
    }

    // Turn cost: 1 turn per drug transaction
    const refreshedTurns = refreshTurns(user);
    if (refreshedTurns < 1) {
      res.status(400).json({ error: "Not enough turns (need 1 turn to buy drugs)" });
      return;
    }

    // Deduct cash and turns
    db.update(schema.users)
      .set({ cash: user.cash - totalCost, turns: refreshedTurns - 1 })
      .where(eq(schema.users.id, user.id))
      .run();

    const now = new Date().toISOString();

    // Add to inventory with purchase price tracking
    const existing = db.select()
      .from(schema.userInventory)
      .where(and(eq(schema.userInventory.userId, user.id), eq(schema.userInventory.itemId, item.id)))
      .all();

    if (existing.length > 0) {
      const inv = existing[0];
      const oldQty = inv.quantity;
      const oldAvg = inv.avgPurchasePrice ?? 0;
      const newAvg = oldAvg > 0
        ? Math.round(((oldQty * oldAvg) + (quantity * effectivePrice)) / (oldQty + quantity))
        : effectivePrice;
      db.update(schema.userInventory)
        .set({ quantity: oldQty + quantity, avgPurchasePrice: newAvg })
        .where(eq(schema.userInventory.id, inv.id))
        .run();
    } else {
      db.insert(schema.userInventory).values({
        userId: user.id,
        itemId: item.id,
        equipped: false,
        quantity,
        acquiredAt: now,
        avgPurchasePrice: effectivePrice,
      }).run();
    }

    res.json({
      success: true,
      itemName: item.name,
      quantity,
      pricePerUnit: effectivePrice,
      totalCost,
      cash: user.cash - totalCost,
      turns: refreshedTurns - 1,
    });
  } catch (err) {
    console.error("Drug buy error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// ─── POST /api/market/drugs/sell/:inventoryId — sell drugs ───

drugMarketRouter.post("/sell/:inventoryId", authMiddleware, jailCheck, hpCheck, async (req: AuthRequest, res: Response) => {
  try {
    const inventoryId = Number(req.params.inventoryId);
    const rawQuantity = (req.body?.quantity as number) ?? -1;

    const user = await db.query.users.findFirst({ where: eq(schema.users.id, req.userId!) });
    if (!user) { res.status(404).json({ error: "User not found" }); return; }

    const invRow = db.select().from(schema.userInventory).where(eq(schema.userInventory.id, inventoryId)).all();
    if (invRow.length === 0) { res.status(404).json({ error: "Item not found in inventory" }); return; }
    const inv = invRow[0];

    if (inv.userId !== req.userId) { res.status(403).json({ error: "Not your item" }); return; }

    const itemRow = db.select().from(schema.items).where(eq(schema.items.id, inv.itemId)).all();
    if (itemRow.length === 0) { res.status(404).json({ error: "Item not found" }); return; }
    const item = itemRow[0];

    if (item.type !== "drug") {
      res.status(400).json({ error: "Only drugs can be sold here" });
      return;
    }

    // Refresh prices
    refreshDrugPrices();

    const sellQty = rawQuantity === -1 ? inv.quantity : Math.max(1, Math.min(rawQuantity, inv.quantity));

    if (sellQty <= 0) {
      res.status(400).json({ error: "Nothing to sell" });
      return;
    }

    // Turn cost: 1 turn per sell transaction
    const refreshedTurns = refreshTurns(user);
    if (refreshedTurns < 1) {
      res.status(400).json({ error: "Not enough turns (need 1 turn to sell drugs)" });
      return;
    }

    const currPrice = item.currentPrice ?? item.buyPrice;
    const chemLevel = getChemistryLevel(user.id);
    const chemPremium = Math.min(10, chemLevel * 0.5);
    const effectivePrice = Math.round(currPrice * (1 + chemPremium / 100));
    const cashAwarded = effectivePrice * sellQty;

    // Calculate P&L for the sold portion
    const avgPrice = inv.avgPurchasePrice ?? currPrice;
    const profitLoss = (effectivePrice - avgPrice) * sellQty;

    // Respect from profitable deals (1 per $1,000 profit)
    const respectGained = profitLoss > 0 ? Math.floor(profitLoss / 1000) : 0;

    const remaining = inv.quantity - sellQty;
    if (remaining <= 0) {
      db.delete(schema.userInventory).where(eq(schema.userInventory.id, inv.id)).run();
    } else {
      db.update(schema.userInventory).set({ quantity: remaining }).where(eq(schema.userInventory.id, inv.id)).run();
    }

    db.update(schema.users)
      .set({
        cash: user.cash + cashAwarded,
        turns: refreshedTurns - 1,
        respect: user.respect + respectGained,
      })
      .where(eq(schema.users.id, user.id))
      .run();

    res.json({
      success: true,
      itemName: item.name,
      quantity: sellQty,
      pricePerUnit: effectivePrice,
      cashAwarded,
      profitLoss,
      cash: user.cash + cashAwarded,
      turns: refreshedTurns - 1,
      remaining,
    });
  } catch (err) {
    console.error("Drug sell error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// ─── POST /api/market/drugs/collect — collect from dealers ───

drugMarketRouter.post("/collect", authMiddleware, jailCheck, hpCheck, async (req: AuthRequest, res: Response) => {
  try {
    const user = await db.query.users.findFirst({ where: eq(schema.users.id, req.userId!) });
    if (!user) { res.status(404).json({ error: "User not found" }); return; }

    const dealerRows = db.select({
      inventory: schema.userInventory,
      item: schema.items,
    })
    .from(schema.userInventory)
    .innerJoin(schema.items, eq(schema.userInventory.itemId, schema.items.id))
    .where(and(eq(schema.userInventory.userId, user.id), eq(schema.items.type, "drug_dealer")))
    .all();

    if (dealerRows.length === 0) {
      res.status(400).json({ error: "You don't have any drug dealers" });
      return;
    }

    const chemLevel = getChemistryLevel(user.id);
    const sixthSense = getSkillLevel(user.id, "Sixth Sense");
    const intLevel = user.intelligence;
    const allDrugs = db.select().from(schema.items).where(eq(schema.items.type, "drug")).all();
    const now = new Date();
    const results: { name: string; produced: { drugName: string; units: number }[] }[] = [];

    for (const row of dealerRows) {
      let baseProduction = 0;
      try {
        const effects = JSON.parse(row.item.effects);
        baseProduction = effects.drugProduction ?? 0;
      } catch {}

      const intBonus = 1 + intLevel * 0.005;
      const chemBonus = 1 + chemLevel * 0.005;
      const sixthBonus = 1 + sixthSense * 0.003;
      const effectiveProduction = Math.round(baseProduction * intBonus * chemBonus * sixthBonus);

      const lastCollected = new Date(row.inventory.acquiredAt).getTime();
      const hoursElapsed = Math.max(0, (now.getTime() - lastCollected) / (60 * 60 * 1000));
      const maxHours = 12;
      const collectHours = Math.min(hoursElapsed, maxHours);
      const totalUnits = Math.floor(effectiveProduction * collectHours);

      if (totalUnits <= 0) continue;

      // Distribute units among random drugs
      const produced: { drugName: string; units: number }[] = [];
      let remaining = totalUnits;
      const shuffledDrugs = [...allDrugs].sort(() => Math.random() - 0.5);

      for (let i = 0; i < shuffledDrugs.length && remaining > 0; i++) {
        const portion = i === shuffledDrugs.length - 1 ? remaining : Math.floor(totalUnits / shuffledDrugs.length);
        if (portion <= 0) continue;

        const drug = shuffledDrugs[i];
        const existingInv = db.select()
          .from(schema.userInventory)
          .where(and(eq(schema.userInventory.userId, user.id), eq(schema.userInventory.itemId, drug.id)))
          .all();

        if (existingInv.length > 0) {
          db.update(schema.userInventory)
            .set({ quantity: existingInv[0].quantity + portion })
            .where(eq(schema.userInventory.id, existingInv[0].id))
            .run();
        } else {
          db.insert(schema.userInventory).values({
            userId: user.id,
            itemId: drug.id,
            equipped: false,
            quantity: portion,
            acquiredAt: now.toISOString(),
            avgPurchasePrice: 0, // produced, not purchased
          }).run();
        }

        produced.push({ drugName: drug.name, units: portion });
        remaining -= portion;
      }

      // Update dealer's last collection time
      db.update(schema.userInventory)
        .set({ acquiredAt: now.toISOString() })
        .where(eq(schema.userInventory.id, row.inventory.id))
        .run();

      results.push({ name: row.item.name, produced });
    }

    const totalCollected = results.reduce((sum, r) => sum + r.produced.reduce((s, p) => s + p.units, 0), 0);

    if (totalCollected >= 50) {
      logActivityEvent(user.id, "drug_collected",
        `Collected ${totalCollected} units from drug dealers`,
        { totalCollected, dealerCount: results.length });
    }

    res.json({
      success: true,
      results,
      totalCollected,
      collectedAt: now.toISOString(),
    });
  } catch (err) {
    console.error("Drug collect error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// ─── GET /api/market/drugs/history/:itemId — 48h price history ───

drugMarketRouter.get("/history/:itemId", authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const itemId = Number(req.params.itemId);
    const cutoff = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();

    const history = db.select()
      .from(schema.drugPriceHistory)
      .where(and(eq(schema.drugPriceHistory.itemId, itemId), gt(schema.drugPriceHistory.recordedAt, cutoff)))
      .orderBy(schema.drugPriceHistory.recordedAt)
      .all();

    res.json({ history });
  } catch (err) {
    console.error("Price history error:", err);
    res.status(500).json({ error: "Server error" });
  }
});
