import { db, schema } from "../db";
import { eq, and, sql } from "drizzle-orm";

/**
 * Process gang salary auto-payouts (24h cycle).
 * Called from gang detail when accountant is hired and 24h have elapsed.
 * Returns true if salaries were paid.
 */
export function processSalaryPayout(gangId: number): boolean {
  const salaryMembers = db.select({
    userId: schema.gangMembers.userId,
    salary: schema.gangMembers.salary,
  })
    .from(schema.gangMembers)
    .where(and(
      eq(schema.gangMembers.gangId, gangId),
      sql`${schema.gangMembers.salary} > 0`,
    ))
    .all();

  if (salaryMembers.length === 0) return false;

  const gang = db.select({ vault: schema.gangs.vault })
    .from(schema.gangs)
    .where(eq(schema.gangs.id, gangId))
    .all()[0];
  if (!gang) return false;

  const totalSalaries = salaryMembers.reduce((sum, m) => sum + (m.salary ?? 0), 0);
  const accountantFee = Math.ceil(totalSalaries * 0.02);
  const totalCost = totalSalaries + accountantFee;

  if (gang.vault < totalCost) return false;

  db.transaction(() => {
    db.update(schema.gangs)
      .set({ vault: sql`vault - ${totalCost}` })
      .where(eq(schema.gangs.id, gangId))
      .run();

    for (const m of salaryMembers) {
      if (m.salary > 0) {
        db.update(schema.users)
          .set({ cash: sql`cash + ${m.salary}` })
          .where(eq(schema.users.id, m.userId))
          .run();
      }
    }
    // 2% accountant fee is burnt (overhead cost)
  });

  return true;
}

/**
 * Process gang operation 24h payout.
 * Returns the payout amounts or null if no payout occurred.
 */
export function processOperationPayout(
  gangId: number,
  activeOp: { id: number; level: number; lastPayoutAt: string | null; operationDefId: number },
  def: { incomePerMemberL1: number; incomePerMemberL2: number; incomePerMemberL3: number; id: number },
  investorShare: number,
  totalInvestments: number,
): { vaultPortion: number; totalIncome: number } | null {
  const elapsedHours = (Date.now() - new Date(activeOp.lastPayoutAt!).getTime()) / 3600000;
  if (elapsedHours < 24) return null;

  const today = new Date().toISOString().split("T")[0];
  const incomeRate = activeOp.level === 3 ? def.incomePerMemberL3
    : activeOp.level === 2 ? def.incomePerMemberL2
    : def.incomePerMemberL1;

  const completedCount = db.select({ count: sql<number>`COUNT(*)` })
    .from(schema.gangDailyTasks)
    .where(and(
      eq(schema.gangDailyTasks.gangId, gangId),
      eq(schema.gangDailyTasks.operationDefId, def.id),
      eq(schema.gangDailyTasks.taskDate, today),
      eq(schema.gangDailyTasks.completed, true),
    ))
    .all()[0]?.count ?? 0;

  if (completedCount === 0) return null;

  const totalIncome = completedCount * incomeRate;
  const investorSharePct = investorShare ?? 30;
  const investorPortion = Math.floor(totalIncome * investorSharePct / 100);
  const vaultPortion = totalIncome - investorPortion;

  // Track investor returns
  if (investorPortion > 0 && totalInvestments > 0) {
    const investors = db.select()
      .from(schema.gangInvestments)
      .where(and(
        eq(schema.gangInvestments.gangId, gangId),
        sql`${schema.gangInvestments.amount} > 0`,
      ))
      .all();
    for (const inv of investors) {
      const share = Math.floor(investorPortion * inv.amount / totalInvestments);
      if (share > 0) {
        db.update(schema.gangInvestments)
          .set({ returnsEarned: sql`${schema.gangInvestments.returnsEarned} + ${share}` })
          .where(eq(schema.gangInvestments.id, inv.id))
          .run();
      }
    }
  }

  db.update(schema.gangs)
    .set({ vault: sql`vault + ${vaultPortion}` })
    .where(eq(schema.gangs.id, gangId))
    .run();

  db.insert(schema.gangOperationPayouts).values({
    gangId,
    operationDefId: def.id,
    level: activeOp.level,
    amountPerMember: incomeRate,
    totalPayout: totalIncome,
    eligibleMemberCount: completedCount,
    paidAt: new Date().toISOString(),
  }).run();

  db.update(schema.gangActiveOperations)
    .set({ lastPayoutAt: new Date().toISOString() })
    .where(eq(schema.gangActiveOperations.id, activeOp.id))
    .run();

  return { vaultPortion, totalIncome };
}
