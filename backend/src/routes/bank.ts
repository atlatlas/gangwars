import { Router, Response } from "express";
import { eq, sql } from "drizzle-orm";
import { db, schema } from "../db";
import { authMiddleware, AuthRequest, jailCheck, hpCheck } from "../middleware/auth";
import { refreshTurns } from "./turns";
import { logActivityEvent } from "./activityEvents";

export const bankRouter = Router();

// GET /api/bank — balance
bankRouter.get("/", authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const user = await db.query.users.findFirst({
      where: eq(schema.users.id, req.userId!),
    });
    if (!user) { res.status(404).json({ error: "User not found" }); return; }

    res.json({
      bank: user.bank,
      cash: user.cash,
      totalNetworth: user.cash + user.bank,
    });
  } catch (err) {
    console.error("Bank balance error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// POST /api/bank/deposit — move cash pocket -> bank (or one phonecall from jail)
bankRouter.post("/deposit", authMiddleware, hpCheck, async (req: AuthRequest, res: Response) => {
  try {
    const amount = Math.floor(req.body?.amount ?? 0);
    if (isNaN(amount) || amount <= 0) {
      res.status(400).json({ error: "Invalid amount" });
      return;
    }

    const user = await db.query.users.findFirst({
      where: eq(schema.users.id, req.userId!),
    });
    if (!user) { res.status(404).json({ error: "User not found" }); return; }

    // Check jail
    const jailed = user.jailUntil && new Date(user.jailUntil) > new Date();
    if (jailed) {
      if (user.jailPhonecallUsed) {
        res.status(400).json({ error: "You already used your one phonecall. Wait for release." });
        return;
      }
      // One phonecall — deposit without turn cost, mark used
      if (user.cash < amount) {
        res.status(400).json({ error: "Not enough cash" });
        return;
      }
      db.update(schema.users)
        .set({
          cash: user.cash - amount,
          bank: user.bank + amount,
          jailPhonecallUsed: 1,
        })
        .where(eq(schema.users.id, user.id))
        .run();
      res.json({
        success: true,
        amount,
        cash: user.cash - amount,
        bank: user.bank + amount,
        phonecallUsed: true,
      });
      return;
    }

    refreshTurns(user);

    if (user.cash < amount) {
      res.status(400).json({ error: "Not enough cash" });
      return;
    }

    // Re-fetch turns after refresh
    const refreshedUser = await db.query.users.findFirst({
      where: eq(schema.users.id, req.userId!),
    });
    const currentTurns = refreshedUser?.turns ?? user.turns;

    if (currentTurns < 1) {
      res.status(400).json({ error: "Not enough turns (need 1 to deposit)" });
      return;
    }

    db.update(schema.users)
      .set({
        cash: user.cash - amount,
        bank: user.bank + amount,
        turns: currentTurns - 1,
      })
      .where(eq(schema.users.id, user.id))
      .run();

    if (amount >= 100000) {
      logActivityEvent(user.id, "bank_deposit",
        `Deposited $${amount.toLocaleString()} into the bank`,
        { amount });
    }

    res.json({
      success: true,
      amount,
      cash: user.cash - amount,
      bank: user.bank + amount,
      turns: currentTurns - 1,
    });
  } catch (err) {
    console.error("Bank deposit error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// POST /api/bank/withdraw — move cash bank -> pocket
bankRouter.post("/withdraw", authMiddleware, jailCheck, hpCheck, async (req: AuthRequest, res: Response) => {
  try {
    const amount = Math.floor(req.body?.amount ?? 0);
    if (isNaN(amount) || amount <= 0) {
      res.status(400).json({ error: "Invalid amount" });
      return;
    }

    const user = await db.query.users.findFirst({
      where: eq(schema.users.id, req.userId!),
    });
    if (!user) { res.status(404).json({ error: "User not found" }); return; }

    refreshTurns(user);

    if (user.bank < amount) {
      res.status(400).json({ error: "Not enough in bank" });
      return;
    }

    // Re-fetch turns after refresh
    const refreshedUser = await db.query.users.findFirst({
      where: eq(schema.users.id, req.userId!),
    });
    const currentTurns = refreshedUser?.turns ?? user.turns;

    if (currentTurns < 1) {
      res.status(400).json({ error: "Not enough turns (need 1 to withdraw)" });
      return;
    }

    db.update(schema.users)
      .set({
        bank: user.bank - amount,
        cash: user.cash + amount,
        turns: currentTurns - 1,
      })
      .where(eq(schema.users.id, user.id))
      .run();

    if (amount >= 100000) {
      logActivityEvent(user.id, "bank_withdraw",
        `Withdrew $${amount.toLocaleString()} from the bank`,
        { amount });
    }

    res.json({
      success: true,
      amount,
      cash: user.cash + amount,
      bank: user.bank - amount,
      turns: currentTurns - 1,
    });
  } catch (err) {
    console.error("Bank withdraw error:", err);
    res.status(500).json({ error: "Server error" });
  }
});
