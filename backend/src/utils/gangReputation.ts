import { db, schema } from "../db";
import { eq, and, sql } from "drizzle-orm";

/**
 * Grant gang reputation to the user's gang (if they are in one).
 * Also bumps contract progress for the specified contract type.
 */
export function addGangReputation(
  userId: number,
  repAmount: number,
  contractType?: string,
  contractAmount?: number,
): void {
  const membership = db.select({ gangId: schema.gangMembers.gangId })
    .from(schema.gangMembers)
    .where(eq(schema.gangMembers.userId, userId))
    .all()[0];
  if (!membership) return;

  db.update(schema.gangs)
    .set({ reputation: sql`reputation + ${repAmount}` })
    .where(eq(schema.gangs.id, membership.gangId))
    .run();

  if (contractType && contractAmount && contractAmount > 0) {
    updateContractProgress(membership.gangId, userId, contractType as "earn_cash" | "pvp_wins" | "vault_deposits" | "crimes", contractAmount);
  }
}

function updateContractProgress(gangId: number, userId: number, type: "earn_cash" | "pvp_wins" | "vault_deposits" | "crimes", amount: number) {
  const contract = db.select()
    .from(schema.gangContracts)
    .where(and(
      eq(schema.gangContracts.gangId, gangId),
      eq(schema.gangContracts.contractType, type),
      eq(schema.gangContracts.completed, 0),
    ))
    .all()[0];
  if (!contract) return;

  const newProgress = Math.min(contract.progress + amount, contract.target);
  const completed = newProgress >= contract.target ? 1 : 0;

  db.update(schema.gangContracts)
    .set({ progress: newProgress, completed })
    .where(eq(schema.gangContracts.id, contract.id))
    .run();

  // Upsert contributor
  const existing = db.select()
    .from(schema.gangContractContributors)
    .where(and(
      eq(schema.gangContractContributors.contractId, contract.id),
      eq(schema.gangContractContributors.userId, userId),
    ))
    .all()[0];

  const now = new Date().toISOString();
  if (existing) {
    db.update(schema.gangContractContributors)
      .set({ contribution: existing.contribution + amount, updatedAt: now })
      .where(eq(schema.gangContractContributors.id, existing.id))
      .run();
  } else {
    db.insert(schema.gangContractContributors).values({
      contractId: contract.id,
      userId,
      contribution: amount,
      updatedAt: now,
    }).run();
  }
}

/**
 * Record a gang daily task completion for the user, if they are assigned
 * to an active operation whose dailyTaskType matches `requiredTaskType`.
 */
export function recordGangDailyTask(userId: number, requiredTaskType: string): void {
  const gm = db.select({ gangId: schema.gangMembers.gangId })
    .from(schema.gangMembers)
    .where(eq(schema.gangMembers.userId, userId))
    .all()[0];
  if (!gm) return;

  const assignment = db.select({ activeOperationId: schema.gangOperationAssignments.activeOperationId })
    .from(schema.gangOperationAssignments)
    .where(and(
      eq(schema.gangOperationAssignments.userId, userId),
      eq(schema.gangOperationAssignments.gangId, gm.gangId),
    ))
    .all()[0];
  if (!assignment) return;

  const activeOp = db.select()
    .from(schema.gangActiveOperations)
    .where(eq(schema.gangActiveOperations.id, assignment.activeOperationId))
    .all()[0];
  if (!activeOp) return;

  const opDef = db.select()
    .from(schema.gangOperationDefs)
    .where(eq(schema.gangOperationDefs.id, activeOp.operationDefId))
    .all()[0];
  if (!opDef || opDef.dailyTaskType !== requiredTaskType) return;

  const today = new Date().toISOString().split("T")[0];
  const existingTask = db.select()
    .from(schema.gangDailyTasks)
    .where(and(
      eq(schema.gangDailyTasks.userId, userId),
      eq(schema.gangDailyTasks.operationDefId, opDef.id),
      eq(schema.gangDailyTasks.taskDate, today),
    ))
    .all()[0];
  const now = new Date().toISOString();
  if (!existingTask) {
    db.insert(schema.gangDailyTasks).values({
      gangId: gm.gangId,
      userId,
      operationDefId: opDef.id,
      taskDate: today,
      completed: true,
      verifiedAt: now,
    }).run();
  } else if (!existingTask.completed) {
    db.update(schema.gangDailyTasks)
      .set({ completed: true, verifiedAt: now })
      .where(eq(schema.gangDailyTasks.id, existingTask.id))
      .run();
  }
}
