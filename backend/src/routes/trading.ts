import { Router, Response } from "express";
import { and, desc, eq, sql } from "drizzle-orm";
import { db, schema } from "../db";
import { authMiddleware, AuthRequest, jailCheck, hpCheck } from "../middleware/auth";
import { refreshTurns } from "./turns";

export const tradingRouter = Router();

// Helper to get or create trading account
function getOrCreateAccount(userId: number) {
  let account = db.select()
    .from(schema.tradingAccounts)
    .where(eq(schema.tradingAccounts.userId, userId))
    .all()[0];
  if (!account) {
    db.insert(schema.tradingAccounts).values({
      userId,
      createdAt: new Date().toISOString(),
    }).run();
    account = db.select()
      .from(schema.tradingAccounts)
      .where(eq(schema.tradingAccounts.userId, userId))
      .all()[0]!;
  }
  return account;
}

// GET /api/trading/assets
tradingRouter.get("/assets", authMiddleware, async (_req: AuthRequest, res: Response) => {
  try {
    const assets = db.select().from(schema.tradingAssets).all();
    res.json(assets);
  } catch (err) {
    console.error("Trading assets error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// GET /api/trading/assets/:id
tradingRouter.get("/assets/:id", authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const asset = db.select()
      .from(schema.tradingAssets)
      .where(eq(schema.tradingAssets.id, parseInt(String(req.params.id))))
      .all()[0];
    if (!asset) { res.status(404).json({ error: "Asset not found" }); return; }
    res.json(asset);
  } catch (err) {
    console.error("Trading asset detail error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// GET /api/trading/account
tradingRouter.get("/account", authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const account = getOrCreateAccount(req.userId!);

    // Calculate total unrealized P&L across all positions
    const positions = db.select()
      .from(schema.tradingPositions)
      .where(eq(schema.tradingPositions.userId, req.userId!))
      .all();
    const totalUnrealizedPnl = positions.reduce((sum, p) => sum + p.unrealizedPnl, 0);

    res.json({
      ...account,
      equity: account.balance + totalUnrealizedPnl,
      unrealizedPnl: totalUnrealizedPnl,
      positionsCount: positions.length,
      openOrdersCount: db.select({ count: sql<number>`count(*)` })
        .from(schema.tradingOrders)
        .where(and(eq(schema.tradingOrders.userId, req.userId!), eq(schema.tradingOrders.status, "open")))
        .all()[0]?.count ?? 0,
    });
  } catch (err) {
    console.error("Trading account error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// POST /api/trading/deposit
tradingRouter.post("/deposit", authMiddleware, jailCheck, hpCheck, async (req: AuthRequest, res: Response) => {
  try {
    const amount = Math.floor(req.body?.amount ?? 0);
    if (isNaN(amount) || amount <= 0) {
      res.status(400).json({ error: "Invalid amount" });
      return;
    }

    const user = db.select()
      .from(schema.users)
      .where(eq(schema.users.id, req.userId!))
      .all()[0];
    if (!user) { res.status(404).json({ error: "User not found" }); return; }

    refreshTurns(user);

    if (user.cash < amount) {
      res.status(400).json({ error: "Not enough cash" });
      return;
    }

    // Re-fetch turns
    const refreshedUser = db.select()
      .from(schema.users)
      .where(eq(schema.users.id, req.userId!))
      .all()[0];
    const currentTurns = refreshedUser?.turns ?? user.turns;
    if (currentTurns < 1) {
      res.status(400).json({ error: "Not enough turns (need 1)" });
      return;
    }

    const account = getOrCreateAccount(req.userId!);

    db.update(schema.users)
      .set({ cash: user.cash - amount, turns: currentTurns - 1 })
      .where(eq(schema.users.id, user.id))
      .run();

    db.update(schema.tradingAccounts)
      .set({ balance: account.balance + amount })
      .where(eq(schema.tradingAccounts.id, account.id))
      .run();

    res.json({ success: true, amount, balance: account.balance + amount });
  } catch (err) {
    console.error("Trading deposit error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// POST /api/trading/withdraw
tradingRouter.post("/withdraw", authMiddleware, jailCheck, hpCheck, async (req: AuthRequest, res: Response) => {
  try {
    const amount = Math.floor(req.body?.amount ?? 0);
    if (isNaN(amount) || amount <= 0) {
      res.status(400).json({ error: "Invalid amount" });
      return;
    }

    const user = db.select()
      .from(schema.users)
      .where(eq(schema.users.id, req.userId!))
      .all()[0];
    if (!user) { res.status(404).json({ error: "User not found" }); return; }

    refreshTurns(user);

    const refreshedUser = db.select()
      .from(schema.users)
      .where(eq(schema.users.id, req.userId!))
      .all()[0];
    const currentTurns = refreshedUser?.turns ?? user.turns;
    if (currentTurns < 1) {
      res.status(400).json({ error: "Not enough turns (need 1)" });
      return;
    }

    const account = getOrCreateAccount(req.userId!);
    if (account.balance < amount) {
      res.status(400).json({ error: "Not enough trading capital" });
      return;
    }

    db.update(schema.users)
      .set({ cash: user.cash + amount, turns: currentTurns - 1 })
      .where(eq(schema.users.id, user.id))
      .run();

    db.update(schema.tradingAccounts)
      .set({ balance: account.balance - amount })
      .where(eq(schema.tradingAccounts.id, account.id))
      .run();

    res.json({ success: true, amount, balance: account.balance - amount, cash: user.cash + amount });
  } catch (err) {
    console.error("Trading withdraw error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// POST /api/trading/orders
tradingRouter.post("/orders", authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { assetId, type, side, quantity, price, stopPrice } = req.body;

    if (!assetId || !type || !side || !quantity) {
      res.status(400).json({ error: "Missing required fields: assetId, type, side, quantity" });
      return;
    }

    if (!["market", "limit", "stop_loss", "take_profit"].includes(type)) {
      res.status(400).json({ error: "Invalid order type" });
      return;
    }
    if (!["buy", "sell"].includes(side)) {
      res.status(400).json({ error: "Invalid side" });
      return;
    }

    const qty = Math.floor(quantity);
    if (qty <= 0) {
      res.status(400).json({ error: "Invalid quantity" });
      return;
    }

    const asset = db.select()
      .from(schema.tradingAssets)
      .where(eq(schema.tradingAssets.id, assetId))
      .all()[0];
    if (!asset) { res.status(404).json({ error: "Asset not found" }); return; }

    const now = new Date().toISOString();

    if (type === "market") {
      // Execute immediately
      const account = getOrCreateAccount(req.userId!);
      const totalCost = asset.currentPrice * qty;

      if (side === "buy" && account.balance < totalCost) {
        res.status(400).json({ error: `Not enough trading capital. Need $${totalCost.toLocaleString()}, have $${account.balance.toLocaleString()}` });
        return;
      }

      // Create order
      const result = db.insert(schema.tradingOrders).values({
        userId: req.userId!,
        assetId,
        type: "market",
        side,
        status: "filled",
        quantity: qty,
        filledQuantity: qty,
        price: asset.currentPrice,
        filledAt: now,
        createdAt: now,
      }).run();

      const orderId = Number(result.lastInsertRowid);

      if (side === "buy") {
        // Deduct balance
        db.update(schema.tradingAccounts)
          .set({ balance: account.balance - totalCost })
          .where(eq(schema.tradingAccounts.id, account.id))
          .run();

        // Create/update position
        const existing = db.select()
          .from(schema.tradingPositions)
          .where(and(eq(schema.tradingPositions.userId, req.userId!), eq(schema.tradingPositions.assetId, assetId)))
          .all()[0];

        if (existing) {
          const newQty = existing.quantity + qty;
          const newAvg = Math.round(((existing.avgEntryPrice * existing.quantity) + (asset.currentPrice * qty)) / newQty);
          db.update(schema.tradingPositions)
            .set({ quantity: newQty, avgEntryPrice: newAvg, updatedAt: now })
            .where(eq(schema.tradingPositions.id, existing.id))
            .run();
        } else {
          db.insert(schema.tradingPositions).values({
            userId: req.userId!, assetId, quantity: qty, avgEntryPrice: asset.currentPrice,
            unrealizedPnl: 0, openedAt: now, updatedAt: now,
          }).run();
        }

        // Record fill
        db.insert(schema.tradingFills).values({
          orderId, userId: req.userId!, assetId, side: "buy",
          quantity: qty, price: asset.currentPrice, total: totalCost, pnl: 0, createdAt: now,
        }).run();

        res.json({
          success: true, order: { id: orderId, type: "market", side, quantity: qty, price: asset.currentPrice, status: "filled" },
          position: { assetId, quantity: (existing?.quantity ?? 0) + qty, avgEntryPrice: existing ? Math.round(((existing.avgEntryPrice * existing.quantity) + (asset.currentPrice * qty)) / ((existing.quantity) + qty)) : asset.currentPrice },
        });
      } else {
        // Sell
        const position = db.select()
          .from(schema.tradingPositions)
          .where(and(eq(schema.tradingPositions.userId, req.userId!), eq(schema.tradingPositions.assetId, assetId)))
          .all()[0];

        if (!position || position.quantity < qty) {
          // Cancel order, not enough position
          db.update(schema.tradingOrders).set({ status: "cancelled" }).where(eq(schema.tradingOrders.id, orderId)).run();
          res.status(400).json({ error: `Not enough position. You have ${position?.quantity ?? 0} ${asset.symbol}` });
          return;
        }

        const pnl = (asset.currentPrice - position.avgEntryPrice) * qty;

        // Credit account
        db.update(schema.tradingAccounts)
          .set({ balance: account.balance + totalCost })
          .where(eq(schema.tradingAccounts.id, account.id))
          .run();

        // Update position
        const remaining = position.quantity - qty;
        if (remaining <= 0) {
          db.delete(schema.tradingPositions).where(eq(schema.tradingPositions.id, position.id)).run();
        } else {
          db.update(schema.tradingPositions)
            .set({ quantity: remaining, updatedAt: now })
            .where(eq(schema.tradingPositions.id, position.id))
            .run();
        }

        db.insert(schema.tradingFills).values({
          orderId, userId: req.userId!, assetId, side: "sell",
          quantity: qty, price: asset.currentPrice, total: totalCost, pnl, createdAt: now,
        }).run();

        res.json({
          success: true, order: { id: orderId, type: "market", side: "sell", quantity: qty, price: asset.currentPrice, status: "filled" },
          pnl, balance: account.balance + totalCost,
          remainingPosition: remaining > 0 ? { quantity: remaining } : null,
        });
      }
    } else {
      // Limit / stop-loss / take-profit — create open order
      const orderData: any = {
        userId: req.userId!,
        assetId,
        type,
        side,
        status: "open",
        quantity: qty,
        filledQuantity: 0,
        createdAt: now,
      };
      if (price !== undefined) orderData.price = Math.floor(price);
      if (stopPrice !== undefined) orderData.stopPrice = Math.floor(stopPrice);

      // For buy limit, reserve funds
      if (type === "limit" && side === "buy" && price) {
        const account = getOrCreateAccount(req.userId!);
        const reserved = Math.floor(price) * qty;
        if (account.balance < reserved) {
          res.status(400).json({ error: `Not enough trading capital. Need $${reserved.toLocaleString()}` });
          return;
        }
      }

      const result = db.insert(schema.tradingOrders).values(orderData).run();
      const orderId = Number(result.lastInsertRowid);

      res.json({
        success: true,
        order: { id: orderId, type, side, quantity: qty, price: price ?? null, stopPrice: stopPrice ?? null, status: "open" },
      });
    }
  } catch (err) {
    console.error("Trading order error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// GET /api/trading/orders
tradingRouter.get("/orders", authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const rawStatus = req.query.status as string | undefined;
    const conditions = [eq(schema.tradingOrders.userId, req.userId!)];
    if (rawStatus && ["open", "filled", "cancelled"].includes(rawStatus)) {
      conditions.push(eq(schema.tradingOrders.status, rawStatus as "open" | "filled" | "cancelled"));
    }

    const orders = db.select({
      id: schema.tradingOrders.id,
      assetId: schema.tradingOrders.assetId,
      symbol: schema.tradingAssets.symbol,
      name: schema.tradingAssets.name,
      type: schema.tradingOrders.type,
      side: schema.tradingOrders.side,
      status: schema.tradingOrders.status,
      quantity: schema.tradingOrders.quantity,
      filledQuantity: schema.tradingOrders.filledQuantity,
      price: schema.tradingOrders.price,
      stopPrice: schema.tradingOrders.stopPrice,
      filledAt: schema.tradingOrders.filledAt,
      createdAt: schema.tradingOrders.createdAt,
    })
      .from(schema.tradingOrders)
      .innerJoin(schema.tradingAssets, eq(schema.tradingOrders.assetId, schema.tradingAssets.id))
      .where(and(...conditions))
      .orderBy(desc(schema.tradingOrders.createdAt))
      .limit(50)
      .all();

    res.json(orders);
  } catch (err) {
    console.error("Trading orders error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// DELETE /api/trading/orders/:id
tradingRouter.delete("/orders/:id", authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const id = parseInt(String(req.params.id));
    const order = db.select()
      .from(schema.tradingOrders)
      .where(and(eq(schema.tradingOrders.id, id), eq(schema.tradingOrders.userId, req.userId!)))
      .all()[0];

    if (!order) { res.status(404).json({ error: "Order not found" }); return; }
    if (order.status !== "open") { res.status(400).json({ error: "Can only cancel open orders" }); return; }

    db.update(schema.tradingOrders)
      .set({ status: "cancelled" })
      .where(eq(schema.tradingOrders.id, id))
      .run();

    if (order.type !== "market") {
      // Refund the reserved balance for limit/stop orders
      if (order.side === "buy") {
        const account = db.select().from(schema.tradingAccounts).where(eq(schema.tradingAccounts.userId, req.userId!)).all()[0];
        if (account) {
          const refund = (order.price ?? 0) * order.quantity;
          db.update(schema.tradingAccounts).set({ balance: account.balance + refund }).where(eq(schema.tradingAccounts.id, account.id)).run();
        }
      }
    }

    res.json({ success: true });
  } catch (err) {
    console.error("Cancel order error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// GET /api/trading/positions
tradingRouter.get("/positions", authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const positions = db.select({
      id: schema.tradingPositions.id,
      assetId: schema.tradingPositions.assetId,
      symbol: schema.tradingAssets.symbol,
      name: schema.tradingAssets.name,
      quantity: schema.tradingPositions.quantity,
      avgEntryPrice: schema.tradingPositions.avgEntryPrice,
      currentPrice: schema.tradingAssets.currentPrice,
      currentValue: sql`${schema.tradingPositions.quantity} * ${schema.tradingAssets.currentPrice}`,
      unrealizedPnl: schema.tradingPositions.unrealizedPnl,
      unrealizedPnlPercent: sql`CASE WHEN ${schema.tradingPositions.avgEntryPrice} > 0 THEN ROUND(CAST(${schema.tradingPositions.unrealizedPnl} AS REAL) / (${schema.tradingPositions.avgEntryPrice} * ${schema.tradingPositions.quantity}) * 100, 2) ELSE 0 END`,
      openedAt: schema.tradingPositions.openedAt,
    })
      .from(schema.tradingPositions)
      .innerJoin(schema.tradingAssets, eq(schema.tradingPositions.assetId, schema.tradingAssets.id))
      .where(eq(schema.tradingPositions.userId, req.userId!))
      .orderBy(desc(schema.tradingPositions.openedAt))
      .all();

    res.json(positions);
  } catch (err) {
    console.error("Trading positions error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// GET /api/trading/fills
tradingRouter.get("/fills", authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const fills = db.select({
      id: schema.tradingFills.id,
      orderId: schema.tradingFills.orderId,
      assetId: schema.tradingFills.assetId,
      symbol: schema.tradingAssets.symbol,
      name: schema.tradingAssets.name,
      side: schema.tradingFills.side,
      quantity: schema.tradingFills.quantity,
      price: schema.tradingFills.price,
      total: schema.tradingFills.total,
      pnl: schema.tradingFills.pnl,
      createdAt: schema.tradingFills.createdAt,
    })
      .from(schema.tradingFills)
      .innerJoin(schema.tradingAssets, eq(schema.tradingFills.assetId, schema.tradingAssets.id))
      .where(eq(schema.tradingFills.userId, req.userId!))
      .orderBy(desc(schema.tradingFills.createdAt))
      .limit(50)
      .all();

    res.json(fills);
  } catch (err) {
    console.error("Trading fills error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// GET /api/trading/history/:assetId/:resolution
tradingRouter.get("/history/:assetId/:resolution", authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const assetId = parseInt(String(req.params.assetId));
    const resolution = req.params.resolution as string;

    const resolutionMs: Record<string, number> = {
      "1m": 60000,
      "5m": 300000,
      "15m": 900000,
      "1h": 3600000,
    };

    const interval = resolutionMs[resolution] ?? 60000;
    const now = Date.now();

    // Get ticks from the last 2 hours
    const since = new Date(now - 2 * 60 * 60 * 1000).toISOString();

    const ticks = db.select()
      .from(schema.tradingPriceHistory)
      .where(and(
        eq(schema.tradingPriceHistory.assetId, assetId),
        sql`${schema.tradingPriceHistory.recordedAt} >= ${since}`,
      ))
      .orderBy(schema.tradingPriceHistory.recordedAt)
      .all();

    // Aggregate into OHLCV candles
    const candles: { time: string; open: number; high: number; low: number; close: number; volume: number }[] = [];
    let currentBucket: typeof ticks = [];

    for (const tick of ticks) {
      const tickTime = new Date(tick.recordedAt).getTime();
      const bucketStart = Math.floor(tickTime / interval) * interval;

      if (currentBucket.length > 0) {
        const firstTickTime = new Date(currentBucket[0].recordedAt).getTime();
        const firstBucketStart = Math.floor(firstTickTime / interval) * interval;
        if (bucketStart !== firstBucketStart) {
          // Close bucket
          const open = currentBucket[0].price;
          const close = currentBucket[currentBucket.length - 1].price;
          const high = Math.max(...currentBucket.map(t => t.price));
          const low = Math.min(...currentBucket.map(t => t.price));
          const volume = currentBucket.reduce((s, t) => s + t.volume, 0);
          candles.push({
            time: new Date(firstBucketStart).toISOString(),
            open, high, low, close, volume,
          });
          currentBucket = [];
        }
      }
      currentBucket.push(tick);
    }

    // Last bucket
    if (currentBucket.length > 0) {
      const firstTickTime = new Date(currentBucket[0].recordedAt).getTime();
      const bucketStart = Math.floor(firstTickTime / interval) * interval;
      const open = currentBucket[0].price;
      const close = currentBucket[currentBucket.length - 1].price;
      const high = Math.max(...currentBucket.map(t => t.price));
      const low = Math.min(...currentBucket.map(t => t.price));
      const volume = currentBucket.reduce((s, t) => s + t.volume, 0);
      candles.push({
        time: new Date(bucketStart).toISOString(),
        open, high, low, close, volume,
      });
    }

    res.json(candles);
  } catch (err) {
    console.error("Trading history error:", err);
    res.status(500).json({ error: "Server error" });
  }
});
