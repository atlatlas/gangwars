import { Router, Response } from "express";
import { eq, and, sql } from "drizzle-orm";
import { db, schema } from "../db";
import { authMiddleware, AuthRequest, jailCheck, hpCheck } from "../middleware/auth";

// Router for /:id/investments/* routes — mounted on /api/gangs
export const gangInvestmentsRouter = Router();

// Router for /my route — mounted on /api/investments
export const myInvestmentsRouter = Router();

// ─── GET /api/investments/open — all gangs open for investment ───

myInvestmentsRouter.get("/open",
  authMiddleware,
  async (req: AuthRequest, res: Response) => {
    try {
      const gangs = db.select({
        id: schema.gangs.id,
        name: schema.gangs.name,
        tag: schema.gangs.tag,
        level: schema.gangs.level,
        totalInvestments: schema.gangs.totalInvestments,
        investorShare: schema.gangs.investorShare,
      })
        .from(schema.gangs)
        .where(eq(schema.gangs.investmentsOpen, 1))
        .all();

      // Enrich with investor count, user's investment, and daily income per gang
      const enriched = gangs.map(gang => {
        const investorCount = db.select({ count: sql<number>`COUNT(*)` })
          .from(schema.gangInvestments)
          .where(and(
            eq(schema.gangInvestments.gangId, gang.id),
            sql`${schema.gangInvestments.amount} > 0`,
          ))
          .all()[0]?.count ?? 0;

        const myInvestment = req.userId
          ? db.select()
              .from(schema.gangInvestments)
              .where(and(
                eq(schema.gangInvestments.gangId, gang.id),
                eq(schema.gangInvestments.userId, req.userId),
              ))
              .all()[0] ?? null
          : null;

        // Calculate daily income from active operations
        const activeOps = db.select({
          id: schema.gangActiveOperations.id,
          level: schema.gangActiveOperations.level,
          incomeL1: schema.gangOperationDefs.incomePerMemberL1,
          incomeL2: schema.gangOperationDefs.incomePerMemberL2,
          incomeL3: schema.gangOperationDefs.incomePerMemberL3,
        })
          .from(schema.gangActiveOperations)
          .innerJoin(schema.gangOperationDefs,
            eq(schema.gangActiveOperations.operationDefId, schema.gangOperationDefs.id))
          .where(eq(schema.gangActiveOperations.gangId, gang.id))
          .all();

        let dailyIncome = 0;
        for (const op of activeOps) {
          const rate = op.level === 3 ? op.incomeL3 : op.level === 2 ? op.incomeL2 : op.incomeL1;
          const memberCount = db.select({ count: sql<number>`COUNT(*)` })
            .from(schema.gangOperationAssignments)
            .where(eq(schema.gangOperationAssignments.activeOperationId, op.id))
            .all()[0]?.count ?? 0;
          dailyIncome += rate * memberCount;
        }
        const share = gang.investorShare ?? 30;
        const dailyInvestorReturn = Math.floor(dailyIncome * share / 100);

        return {
          ...gang,
          totalInvestments: gang.totalInvestments ?? 0,
          investorShare: share,
          investorCount,
          dailyIncome,
          dailyInvestorReturn,
          investment: myInvestment && myInvestment.amount > 0
            ? { amount: myInvestment.amount, returnsEarned: myInvestment.returnsEarned }
            : null,
        };
      });

      res.json({ gangs: enriched });
    } catch (err) {
      console.error("Open investments error:", err);
      res.status(500).json({ error: "Server error" });
    }
  }
);

// ─── GET /api/investments — user's investments ───

myInvestmentsRouter.get("/",
  authMiddleware,
  async (req: AuthRequest, res: Response) => {
    try {
      const rows = db.select({
        gangId: schema.gangInvestments.gangId,
        gangName: schema.gangs.name,
        gangTag: schema.gangs.tag,
        amount: schema.gangInvestments.amount,
        returnsEarned: schema.gangInvestments.returnsEarned,
        investedAt: schema.gangInvestments.investedAt,
      })
        .from(schema.gangInvestments)
        .innerJoin(schema.gangs, eq(schema.gangInvestments.gangId, schema.gangs.id))
        .where(and(
          eq(schema.gangInvestments.userId, req.userId!),
          sql`${schema.gangInvestments.amount} > 0`,
        ))
        .all();

      res.json({ investments: rows });
    } catch (err) {
      console.error("My investments error:", err);
      res.status(500).json({ error: "Server error" });
    }
  }
);

// ─── Investment info ───

gangInvestmentsRouter.get("/:id/investments",
  authMiddleware,
  async (req: AuthRequest, res: Response) => {
    try {
      const gangId = parseInt(req.params.id as string);
      if (isNaN(gangId)) {
        res.status(400).json({ error: "Invalid gang ID" });
        return;
      }

      const gang = await db.query.gangs.findFirst({
        where: eq(schema.gangs.id, gangId),
      });
      if (!gang) {
        res.status(404).json({ error: "Gang not found" });
        return;
      }

      const investorCount = db.select({ count: sql<number>`COUNT(*)` })
        .from(schema.gangInvestments)
        .where(and(eq(schema.gangInvestments.gangId, gangId), sql`amount > 0`))
        .all()[0]?.count ?? 0;

      const myInvestment = req.userId
        ? db.select()
            .from(schema.gangInvestments)
            .where(and(
              eq(schema.gangInvestments.gangId, gangId),
              eq(schema.gangInvestments.userId, req.userId),
            ))
            .all()[0] ?? null
        : null;

      res.json({
        investmentsOpen: !!gang.investmentsOpen,
        investorShare: gang.investorShare ?? 30,
        totalInvestments: gang.totalInvestments ?? 0,
        investorCount,
        myInvestment: myInvestment && myInvestment.amount > 0
          ? { amount: myInvestment.amount, returnsEarned: myInvestment.returnsEarned }
          : null,
      });
    } catch (err) {
      console.error("Investments info error:", err);
      res.status(500).json({ error: "Server error" });
    }
  }
);

// ─── Toggle investments open/closed ───

gangInvestmentsRouter.post("/:id/investments/toggle",
  authMiddleware,
  jailCheck,
  hpCheck,
  async (req: AuthRequest, res: Response) => {
    try {
      const gangId = parseInt(req.params.id as string);
      if (isNaN(gangId)) {
        res.status(400).json({ error: "Invalid gang ID" });
        return;
      }

      const gang = await db.query.gangs.findFirst({
        where: eq(schema.gangs.id, gangId),
      });
      if (!gang) {
        res.status(404).json({ error: "Gang not found" });
        return;
      }
      if (gang.leaderId !== req.userId) {
        res.status(403).json({ error: "Only the gang leader can toggle investments" });
        return;
      }

      const newState = gang.investmentsOpen ? 0 : 1;
      db.update(schema.gangs)
        .set({ investmentsOpen: newState })
        .where(eq(schema.gangs.id, gangId))
        .run();

      res.json({ investmentsOpen: !!newState });
    } catch (err) {
      console.error("Toggle investments error:", err);
      res.status(500).json({ error: "Server error" });
    }
  }
);

// ─── Set investor share ───

gangInvestmentsRouter.put("/:id/investments/share",
  authMiddleware,
  jailCheck,
  hpCheck,
  async (req: AuthRequest, res: Response) => {
    try {
      const gangId = parseInt(req.params.id as string);
      if (isNaN(gangId)) {
        res.status(400).json({ error: "Invalid gang ID" });
        return;
      }

      const share = Math.floor(req.body?.share ?? 30);
      if (isNaN(share) || share < 10 || share > 50) {
        res.status(400).json({ error: "Investor share must be between 10 and 50" });
        return;
      }

      const gang = await db.query.gangs.findFirst({
        where: eq(schema.gangs.id, gangId),
      });
      if (!gang) {
        res.status(404).json({ error: "Gang not found" });
        return;
      }
      if (gang.leaderId !== req.userId) {
        res.status(403).json({ error: "Only the gang leader can change investor share" });
        return;
      }

      db.update(schema.gangs)
        .set({ investorShare: share })
        .where(eq(schema.gangs.id, gangId))
        .run();

      res.json({ investorShare: share });
    } catch (err) {
      console.error("Set investor share error:", err);
      res.status(500).json({ error: "Server error" });
    }
  }
);

// ─── Invest cash ───

gangInvestmentsRouter.post("/:id/investments/invest",
  authMiddleware,
  jailCheck,
  hpCheck,
  async (req: AuthRequest, res: Response) => {
    try {
      const gangId = parseInt(req.params.id as string);
      if (isNaN(gangId)) {
        res.status(400).json({ error: "Invalid gang ID" });
        return;
      }

      const amount = Math.floor(req.body?.amount ?? 0);
      if (isNaN(amount) || amount < 10000) {
        res.status(400).json({ error: "Minimum investment is $10,000" });
        return;
      }

      const gang = await db.query.gangs.findFirst({
        where: eq(schema.gangs.id, gangId),
      });
      if (!gang) {
        res.status(404).json({ error: "Gang not found" });
        return;
      }
      if (!gang.investmentsOpen) {
        res.status(400).json({ error: "This gang is not accepting investments" });
        return;
      }

      const user = await db.query.users.findFirst({
        where: eq(schema.users.id, req.userId!),
      });
      if (!user) {
        res.status(404).json({ error: "User not found" });
        return;
      }
      if (user.cash < amount) {
        res.status(400).json({ error: "Not enough cash" });
        return;
      }

      db.update(schema.users)
        .set({ cash: user.cash - amount })
        .where(eq(schema.users.id, user.id))
        .run();

      db.update(schema.gangs)
        .set({
          totalInvestments: sql`total_investments + ${amount}`,
          vault: sql`vault + ${amount}`,
        })
        .where(eq(schema.gangs.id, gangId))
        .run();

      const existing = db.select()
        .from(schema.gangInvestments)
        .where(and(
          eq(schema.gangInvestments.gangId, gangId),
          eq(schema.gangInvestments.userId, user.id),
        ))
        .all()[0];

      if (existing) {
        db.update(schema.gangInvestments)
          .set({ amount: existing.amount + amount })
          .where(eq(schema.gangInvestments.id, existing.id))
          .run();
      } else {
        db.insert(schema.gangInvestments).values({
          gangId,
          userId: user.id,
          amount,
          returnsEarned: 0,
          investedAt: new Date().toISOString(),
        }).run();
      }

      res.json({
        success: true,
        amount,
        cash: user.cash - amount,
        totalInvestments: (gang.totalInvestments ?? 0) + amount,
      });
    } catch (err) {
      console.error("Invest error:", err);
      res.status(500).json({ error: "Server error" });
    }
  }
);

// ─── Withdraw principal ───

gangInvestmentsRouter.post("/:id/investments/withdraw",
  authMiddleware,
  jailCheck,
  hpCheck,
  async (req: AuthRequest, res: Response) => {
    try {
      const gangId = parseInt(req.params.id as string);
      if (isNaN(gangId)) {
        res.status(400).json({ error: "Invalid gang ID" });
        return;
      }

      const investment = db.select()
        .from(schema.gangInvestments)
        .where(and(
          eq(schema.gangInvestments.gangId, gangId),
          eq(schema.gangInvestments.userId, req.userId!),
        ))
        .all()[0];

      if (!investment || investment.amount <= 0) {
        res.status(400).json({ error: "No active investment to withdraw" });
        return;
      }

      const user = await db.query.users.findFirst({
        where: eq(schema.users.id, req.userId!),
      });
      if (!user) {
        res.status(404).json({ error: "User not found" });
        return;
      }

      const refundAmount = investment.amount;

      db.update(schema.users)
        .set({ cash: user.cash + refundAmount })
        .where(eq(schema.users.id, user.id))
        .run();

      db.update(schema.gangInvestments)
        .set({ amount: 0 })
        .where(eq(schema.gangInvestments.id, investment.id))
        .run();

      db.update(schema.gangs)
        .set({
          totalInvestments: sql`MAX(0, total_investments - ${refundAmount})`,
          vault: sql`MAX(0, vault - ${refundAmount})`,
        })
        .where(eq(schema.gangs.id, gangId))
        .run();

      res.json({
        success: true,
        refunded: refundAmount,
        returnsEarned: investment.returnsEarned,
        cash: user.cash + refundAmount,
      });
    } catch (err) {
      console.error("Withdraw investment error:", err);
      res.status(500).json({ error: "Server error" });
    }
  }
);

// ─── Collect returns ───

gangInvestmentsRouter.post("/:id/investments/collect",
  authMiddleware,
  jailCheck,
  hpCheck,
  async (req: AuthRequest, res: Response) => {
    try {
      const gangId = parseInt(req.params.id as string);
      if (isNaN(gangId)) {
        res.status(400).json({ error: "Invalid gang ID" });
        return;
      }

      const investment = db.select()
        .from(schema.gangInvestments)
        .where(and(
          eq(schema.gangInvestments.gangId, gangId),
          eq(schema.gangInvestments.userId, req.userId!),
        ))
        .all()[0];

      if (!investment || investment.returnsEarned <= 0) {
        res.status(400).json({ error: "No returns to collect" });
        return;
      }

      const user = await db.query.users.findFirst({
        where: eq(schema.users.id, req.userId!),
      });
      if (!user) {
        res.status(404).json({ error: "User not found" });
        return;
      }

      const collected = investment.returnsEarned;

      db.transaction(() => {
        db.update(schema.users)
          .set({ cash: user.cash + collected })
          .where(eq(schema.users.id, user.id))
          .run();

        db.update(schema.gangInvestments)
          .set({ returnsEarned: 0 })
          .where(eq(schema.gangInvestments.id, investment.id))
          .run();
      });

      res.json({
        success: true,
        collected,
        cash: user.cash + collected,
      });
    } catch (err) {
      console.error("Collect returns error:", err);
      res.status(500).json({ error: "Server error" });
    }
  }
);
