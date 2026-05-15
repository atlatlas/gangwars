import { Server } from "socket.io";
import { db, schema } from "../db";
import { eq, lt, and, sql } from "drizzle-orm";
import { PriceTick } from "./tradingTypes";

const TICK_INTERVAL = 5000; // 5 seconds
const HISTORY_RETENTION_MS = 1 * 60 * 60 * 1000; // 1 hour

const ASSET_SEEDS: {
  symbol: string; name: string; category: "drug" | "weapon" | "luxury" | "crypto" | "gang_stock" | "contraband";
  basePrice: number; volatility: number; minPrice?: number; maxPrice?: number; itemId?: number;
}[] = [
  { symbol: "WEED", name: "Weed", category: "drug", basePrice: 200, volatility: 0.25 },
  { symbol: "SPEED", name: "Speed", category: "drug", basePrice: 500, volatility: 0.30 },
  { symbol: "LSD", name: "LSD", category: "drug", basePrice: 1200, volatility: 0.35 },
  { symbol: "COKE", name: "Coke", category: "drug", basePrice: 3000, volatility: 0.25 },
  { symbol: "MOLLY", name: "Molly", category: "drug", basePrice: 5000, volatility: 0.30 },
  { symbol: "HEROIN", name: "Heroin", category: "drug", basePrice: 12000, volatility: 0.35 },
  { symbol: "AK47", name: "Assault Rifle", category: "weapon", basePrice: 35000, volatility: 0.15 },
  { symbol: "SNIPER", name: "Sniper Rifle", category: "weapon", basePrice: 150000, volatility: 0.20 },
  { symbol: "LAMBO", name: "Lamborghini", category: "luxury", basePrice: 400000, volatility: 0.10 },
  { symbol: "ROLEX", name: "Rolex Daytona", category: "luxury", basePrice: 50000, volatility: 0.15 },
  { symbol: "BTG", name: "BitGang Coin", category: "crypto", basePrice: 45000, volatility: 0.40, minPrice: 1000, maxPrice: 200000 },
  { symbol: "DGT", name: "Darknet Token", category: "crypto", basePrice: 8000, volatility: 0.50, minPrice: 100, maxPrice: 100000 },
  { symbol: "GNG1", name: "Gang Territory Bond", category: "gang_stock", basePrice: 10000, volatility: 0.05 },
  { symbol: "RNA", name: "Rare Narcotics", category: "contraband", basePrice: 25000, volatility: 0.35 },
  { symbol: "ART", name: "Stolen Artwork", category: "contraband", basePrice: 100000, volatility: 0.20 },
];

export class TradingEngine {
  private intervalId: NodeJS.Timeout | null = null;
  private io: Server;
  private priceCache: Map<number, PriceTick> = new Map();

  constructor(io: Server) {
    this.io = io;
  }

  start(): void {
    this.seedAssets();
    this.intervalId = setInterval(() => this.tick(), TICK_INTERVAL);
    console.log("[TradingEngine] Started — 5s tick interval");
  }

  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  private seedAssets(): void {
    const existing = db.select().from(schema.tradingAssets).all();
    if (existing.length > 0) return;

    // Map item names to IDs for drug linkage
    const itemMap = new Map<string, number>();
    const allItems = db.select({ id: schema.items.id, name: schema.items.name }).from(schema.items).all();
    for (const item of allItems) {
      itemMap.set(item.name.toLowerCase(), item.id);
    }

    const now = new Date().toISOString();
    for (const seed of ASSET_SEEDS) {
      const itemId = seed.itemId ?? itemMap.get(seed.name.toLowerCase());
      db.insert(schema.tradingAssets).values({
        symbol: seed.symbol,
        name: seed.name,
        category: seed.category,
        basePrice: seed.basePrice,
        currentPrice: seed.basePrice,
        priceVolatility: seed.volatility,
        lastTickAt: now,
        minPrice: seed.minPrice ?? 1,
        maxPrice: seed.maxPrice ?? null,
        itemId: itemId ?? null,
      }).run();
    }
    console.log(`[TradingEngine] Seeded ${ASSET_SEEDS.length} trading assets`);
  }

  private tick(): void {
    const now = new Date();
    const assets = db.select().from(schema.tradingAssets).all();

    for (const asset of assets) {
      const prevPrice = asset.currentPrice;
      const vol = asset.priceVolatility;
      const base = asset.basePrice;

      // Mean-reverting random walk
      let change = (Math.random() * 2 - 1) * vol * 0.1;
      const deviation = (prevPrice - base) / base;
      change -= deviation * 0.02;

      let newPrice = Math.round(prevPrice * (1 + change));
      newPrice = Math.max(asset.minPrice ?? 1, newPrice);
      if (asset.maxPrice) newPrice = Math.min(asset.maxPrice, newPrice);

      const simulatedVolume = Math.max(1, Math.round(Math.abs(change) * 1000 + Math.random() * 100));

      // Update asset price
      db.update(schema.tradingAssets)
        .set({
          previousPrice: prevPrice,
          currentPrice: newPrice,
          lastTickAt: now.toISOString(),
        })
        .where(eq(schema.tradingAssets.id, asset.id))
        .run();

      // Record history
      db.insert(schema.tradingPriceHistory).values({
        assetId: asset.id,
        price: newPrice,
        volume: simulatedVolume,
        recordedAt: now.toISOString(),
      }).run();

      // Update position P&L
      this.updatePositionPnl(asset.id, newPrice);

      this.priceCache.set(asset.id, {
        price: newPrice,
        previousPrice: prevPrice,
        change,
        volume: simulatedVolume,
        timestamp: now.toISOString(),
      });
    }

    // Check open orders
    this.checkOpenOrders();

    // Prune old price history
    const pruneCutoff = new Date(now.getTime() - HISTORY_RETENTION_MS).toISOString();
    db.delete(schema.tradingPriceHistory)
      .where(lt(schema.tradingPriceHistory.recordedAt, pruneCutoff))
      .run();

    // Broadcast
    this.broadcastPrices(now.toISOString());
  }

  private updatePositionPnl(assetId: number, currentPrice: number): void {
    const positions = db.select()
      .from(schema.tradingPositions)
      .where(eq(schema.tradingPositions.assetId, assetId))
      .all();

    for (const pos of positions) {
      const pnl = (currentPrice - pos.avgEntryPrice) * pos.quantity;
      db.update(schema.tradingPositions)
        .set({ unrealizedPnl: pnl, updatedAt: new Date().toISOString() })
        .where(eq(schema.tradingPositions.id, pos.id))
        .run();
    }
  }

  private checkOpenOrders(): void {
    const openOrders = db.select()
      .from(schema.tradingOrders)
      .where(eq(schema.tradingOrders.status, "open"))
      .all();

    for (const order of openOrders) {
      const asset = db.select()
        .from(schema.tradingAssets)
        .where(eq(schema.tradingAssets.id, order.assetId))
        .all()[0];
      if (!asset) continue;

      const price = asset.currentPrice;
      let shouldExecute = false;
      let executePrice = price;

      switch (order.type) {
        case "limit":
          if (order.side === "buy" && price <= (order.price ?? price)) {
            shouldExecute = true;
            executePrice = order.price ?? price;
          } else if (order.side === "sell" && price >= (order.price ?? price)) {
            shouldExecute = true;
            executePrice = order.price ?? price;
          }
          break;
        case "stop_loss":
          if (order.side === "sell" && price <= (order.stopPrice ?? 0)) {
            shouldExecute = true;
          }
          break;
        case "take_profit":
          if (order.side === "sell" && price >= (order.stopPrice ?? 0)) {
            shouldExecute = true;
          }
          break;
      }

      if (shouldExecute) {
        this.executeOrder(order, executePrice);
      }
    }
  }

  private executeOrder(order: typeof schema.tradingOrders.$inferSelect, executionPrice: number): void {
    const now = new Date().toISOString();
    const totalCost = executionPrice * order.quantity;
    let fillPnl = 0;

    if (order.side === "buy") {
      // Check user has enough in trading account
      const account = db.select()
        .from(schema.tradingAccounts)
        .where(eq(schema.tradingAccounts.userId, order.userId))
        .all()[0];
      if (!account || account.balance < totalCost) {
        // Not enough funds — cancel the order
        db.update(schema.tradingOrders)
          .set({ status: "cancelled" })
          .where(eq(schema.tradingOrders.id, order.id))
          .run();
        return;
      }

      // Deduct from trading account
      db.update(schema.tradingAccounts)
        .set({ balance: account.balance - totalCost })
        .where(eq(schema.tradingAccounts.id, account.id))
        .run();

      // Create or update position
      const existing = db.select()
        .from(schema.tradingPositions)
        .where(and(
          eq(schema.tradingPositions.userId, order.userId),
          eq(schema.tradingPositions.assetId, order.assetId),
        ))
        .all()[0];

      if (existing) {
        const newQty = existing.quantity + order.quantity;
        const newAvg = Math.round(((existing.avgEntryPrice * existing.quantity) + (executionPrice * order.quantity)) / newQty);
        db.update(schema.tradingPositions)
          .set({ quantity: newQty, avgEntryPrice: newAvg, updatedAt: now })
          .where(eq(schema.tradingPositions.id, existing.id))
          .run();
      } else {
        db.insert(schema.tradingPositions).values({
          userId: order.userId,
          assetId: order.assetId,
          quantity: order.quantity,
          avgEntryPrice: executionPrice,
          unrealizedPnl: 0,
          openedAt: now,
          updatedAt: now,
        }).run();
      }
    } else {
      // Sell side
      const position = db.select()
        .from(schema.tradingPositions)
        .where(and(
          eq(schema.tradingPositions.userId, order.userId),
          eq(schema.tradingPositions.assetId, order.assetId),
        ))
        .all()[0];

      if (!position || position.quantity < order.quantity) {
        db.update(schema.tradingOrders)
          .set({ status: "cancelled" })
          .where(eq(schema.tradingOrders.id, order.id))
          .run();
        return;
      }

      // Calculate P&L
      fillPnl = (executionPrice - position.avgEntryPrice) * order.quantity;

      // Credit trading account
      const account = db.select()
        .from(schema.tradingAccounts)
        .where(eq(schema.tradingAccounts.userId, order.userId))
        .all()[0];
      if (account) {
        db.update(schema.tradingAccounts)
          .set({ balance: account.balance + totalCost })
          .where(eq(schema.tradingAccounts.id, account.id))
          .run();
      }

      // Update or close position
      const remaining = position.quantity - order.quantity;
      if (remaining <= 0) {
        db.delete(schema.tradingPositions)
          .where(eq(schema.tradingPositions.id, position.id))
          .run();
      } else {
        db.update(schema.tradingPositions)
          .set({ quantity: remaining, updatedAt: now })
          .where(eq(schema.tradingPositions.id, position.id))
          .run();
      }
    }

    // Record fill
    db.insert(schema.tradingFills).values({
      orderId: order.id,
      userId: order.userId,
      assetId: order.assetId,
      side: order.side,
      quantity: order.quantity,
      price: executionPrice,
      total: totalCost,
      pnl: fillPnl,
      createdAt: now,
    }).run();

    // Mark order as filled
    db.update(schema.tradingOrders)
      .set({
        status: "filled",
        filledQuantity: order.quantity,
        filledAt: now,
      })
      .where(eq(schema.tradingOrders.id, order.id))
      .run();
  }

  private broadcastPrices(timestamp: string): void {
    const assets = db.select()
      .from(schema.tradingAssets)
      .all();

    const tickerData = assets.map(a => ({
      id: a.id,
      symbol: a.symbol,
      name: a.name,
      category: a.category,
      price: a.currentPrice,
      previousPrice: a.previousPrice,
      change: a.previousPrice ? parseFloat(((a.currentPrice - a.previousPrice) / a.previousPrice * 100).toFixed(2)) : 0,
      volume: this.priceCache.get(a.id)?.volume ?? 0,
      timestamp,
    }));

    this.io.emit("market:ticker", tickerData);

    for (const asset of assets) {
      const tick = this.priceCache.get(asset.id);
      if (tick) {
        this.io.emit("market:tick", { assetId: asset.id, ...tick });
      }
    }
  }
}
