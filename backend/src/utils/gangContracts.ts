import { db, schema } from "../db";
import { eq, and, sql } from "drizzle-orm";

export function getRepToNext(level: number): number {
  return Math.floor(500 * Math.pow(level, 1.5));
}

export function getLevelBenefits(level: number) {
  return {
    maxMembers: 10 + (level - 1) * 2,
    crimeBonus: (level - 1) * 1,
    pvpBonus: (level - 1) * 2,
    incomeBonus: 0,
    tagColor: level >= 10 ? "red" : level >= 5 ? "gold" : level >= 3 ? "cyan" : "purple",
  };
}

export function getActiveContract(gangId: number) {
  const contract = db.select()
    .from(schema.gangContracts)
    .where(eq(schema.gangContracts.gangId, gangId))
    .all()[0];
  if (!contract) return null;

  const contributors = db.select({
    userId: schema.gangContractContributors.userId,
    username: schema.users.username,
    contribution: schema.gangContractContributors.contribution,
  })
    .from(schema.gangContractContributors)
    .innerJoin(schema.users, eq(schema.gangContractContributors.userId, schema.users.id))
    .where(eq(schema.gangContractContributors.contractId, contract.id))
    .all();

  return {
    type: contract.contractType,
    target: contract.target,
    progress: contract.progress,
    deadline: contract.deadline,
    completed: contract.completed === 1,
    contributors,
  };
}

export function generateContract(gangId: number, level: number) {
  const types: Array<"earn_cash" | "pvp_wins" | "vault_deposits" | "crimes"> = [
    "earn_cash", "pvp_wins", "vault_deposits", "crimes",
  ];
  const type = types[Math.floor(Math.random() * types.length)];

  let target: number;
  switch (type) {
    case "earn_cash": target = level * 20000 + 10000; break;
    case "pvp_wins": target = level * 5 + 3; break;
    case "vault_deposits": target = level * 15000 + 5000; break;
    case "crimes": target = level * 15; break;
  }

  const now = new Date();
  const dayOfWeek = now.getDay();
  const daysUntilSunday = dayOfWeek === 0 ? 0 : 7 - dayOfWeek;
  const deadline = new Date(now);
  deadline.setDate(deadline.getDate() + daysUntilSunday);
  deadline.setHours(23, 59, 59, 999);

  const weekStart = new Date(now);
  weekStart.setDate(weekStart.getDate() - dayOfWeek);
  weekStart.setHours(0, 0, 0, 0);

  db.insert(schema.gangContracts).values({
    gangId,
    contractType: type,
    target,
    progress: 0,
    weekStart: weekStart.toISOString(),
    deadline: deadline.toISOString(),
    completed: 0,
    createdAt: now.toISOString(),
  }).run();
}

/**
 * Check if an active contract has expired, and if so reset its progress.
 * Returns the (possibly reset) contract data, or null if no contract exists.
 */
export function checkAndResetExpiredContract(gangId: number): {
  type: string; target: number; progress: number; deadline: string; completed: boolean; contributors: any[];
} | null {
  const existingContract = db.select()
    .from(schema.gangContracts)
    .where(eq(schema.gangContracts.gangId, gangId))
    .all()[0];
  if (!existingContract) return null;

  const now = new Date();
  if (new Date(existingContract.deadline) < now && !existingContract.completed) {
    db.update(schema.gangContracts)
      .set({ progress: 0, completed: 0 })
      .where(eq(schema.gangContracts.id, existingContract.id))
      .run();
    db.delete(schema.gangContractContributors)
      .where(eq(schema.gangContractContributors.contractId, existingContract.id))
      .run();
    return {
      type: existingContract.contractType,
      target: existingContract.target,
      progress: 0,
      deadline: existingContract.deadline,
      completed: false,
      contributors: [],
    };
  }

  return getActiveContract(gangId);
}
