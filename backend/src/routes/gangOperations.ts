import { Router, Response } from "express";
import { z } from "zod";
import { db, schema } from "../db";
import { eq, and, sql, desc, inArray } from "drizzle-orm";
import { authMiddleware, AuthRequest, jailCheck, hpCheck } from "../middleware/auth";
import { logActivityEvent } from "./activityEvents";

export const gangOperationsRouter = Router();

// ─── Helpers ───

function getDateString(date: Date = new Date()): string {
  return date.toISOString().split("T")[0];
}

function isLeader(gang: { leaderId: number }, userId: number): boolean {
  return gang.leaderId === userId;
}

function getIncomeForLevel(opDef: any, level: number): number {
  if (level === 3) return opDef.incomePerMemberL3;
  if (level === 2) return opDef.incomePerMemberL2;
  return opDef.incomePerMemberL1;
}

function getMinSkillForLevel(opDef: any, level: number): number {
  if (level === 3) return opDef.minSkillLevelL3;
  if (level === 2) return opDef.minSkillLevelL2;
  return opDef.minSkillLevel;
}

// GET /api/gangs/:id/operations — list all operations with eligibility and active status
gangOperationsRouter.get("/:id/operations", authMiddleware, (req: AuthRequest, res: Response) => {
  try {
    const gangId = parseInt(req.params.id as string);
    const gang = db.select().from(schema.gangs).where(eq(schema.gangs.id, gangId)).all()[0];
    if (!gang) {
      res.status(404).json({ error: "Gang not found" });
      return;
    }

    const membership = db.select()
      .from(schema.gangMembers)
      .where(and(eq(schema.gangMembers.userId, req.userId!), eq(schema.gangMembers.gangId, gangId)))
      .all()[0];

    if (!membership) {
      res.status(403).json({ error: "You're not a member of this gang" });
      return;
    }

    const activeOps = db.select()
      .from(schema.gangActiveOperations)
      .where(eq(schema.gangActiveOperations.gangId, gangId))
      .all();

    const allMembers = db.select({
      userId: schema.gangMembers.userId,
      username: schema.users.username,
    })
      .from(schema.gangMembers)
      .innerJoin(schema.users, eq(schema.gangMembers.userId, schema.users.id))
      .where(eq(schema.gangMembers.gangId, gangId))
      .all();

    const allOpDefs = db.select()
      .from(schema.gangOperationDefs)
      .all();

    // Bulk-fetch assignments for all active ops
    const allAssignments = db.select()
      .from(schema.gangOperationAssignments)
      .where(eq(schema.gangOperationAssignments.gangId, gangId))
      .all();
    const assignmentsByOp = new Map<number, typeof allAssignments>();
    for (const a of allAssignments) {
      if (!assignmentsByOp.has(a.activeOperationId)) assignmentsByOp.set(a.activeOperationId, []);
      assignmentsByOp.get(a.activeOperationId)!.push(a);
    }
    const allAssignedUserIds = new Set(allAssignments.map(a => a.userId));

    // Look up skill names
    const allSkills = db.select({ id: schema.skillDefinitions.id, name: schema.skillDefinitions.name })
      .from(schema.skillDefinitions)
      .all();
    const skillMap = new Map(allSkills.map(s => [s.id, s.name]));

    // Bulk-fetch operation requirements
    const allReqs = db.select()
      .from(schema.gangOperationReqs)
      .all();
    const reqsByOp = new Map<number, typeof allReqs>();
    for (const req of allReqs) {
      if (!reqsByOp.has(req.operationDefId)) reqsByOp.set(req.operationDefId, []);
      reqsByOp.get(req.operationDefId)!.push(req);
    }

    // Get requesting user's skill levels for personal eligibility display
    const userSkills = db.select()
      .from(schema.userSkills)
      .where(eq(schema.userSkills.userId, req.userId!))
      .all();
    const userSkillBySkillId = new Map(userSkills.map((s: any) => [s.skillId, s.level]));

    // Bulk-fetch all gang members' skills
    const allUserIds = allMembers.map(m => m.userId);
    const allUserSkillsRows = db.select()
      .from(schema.userSkills)
      .where(inArray(schema.userSkills.userId, allUserIds))
      .all();
    const skillsByUser = new Map<number, Map<number, number>>();
    for (const row of allUserSkillsRows) {
      if (!skillsByUser.has(row.userId)) skillsByUser.set(row.userId, new Map());
      skillsByUser.get(row.userId)!.set(row.skillId, (row as any).level);
    }

    // Build set of active operation def IDs for catalog filtering
    const activeOpDefIds = new Set(activeOps.map(op => op.operationDefId));

    // Build catalog with eligibility
    const catalog = allOpDefs.map((def) => {
      const reqs = reqsByOp.get(def.id) ?? [];

      const memberEligibility = allMembers.map((m) => {
        const userSkillMap = skillsByUser.get(m.userId);
        const satisfiedReqs: number[] = [];
        for (const req of reqs) {
          const level = userSkillMap?.get(req.skillId) ?? 0;
          if (level >= req.minLevel) satisfiedReqs.push(req.sortOrder);
        }
        const maxSkillLevel = reqs.length > 0
          ? Math.max(...reqs.map(r => userSkillMap?.get(r.skillId) ?? 0))
          : 0;
        return {
          userId: m.userId,
          username: m.username,
          skillLevel: maxSkillLevel,
          isEligible: satisfiedReqs.length > 0,
          satisfiedReqs,
          isAssigned: allAssignedUserIds.has(m.userId),
        };
      });

      const requirements = reqs.map(r => ({
        skillId: r.skillId,
        skillName: skillMap.get(r.skillId) ?? "Unknown",
        minLevel: r.minLevel,
        sortOrder: r.sortOrder,
        satisfied: memberEligibility.some(m => m.satisfiedReqs.includes(r.sortOrder)),
        userLevel: userSkillBySkillId.get(r.skillId) ?? 0,
      }));

      return {
        def: {
          id: def.id,
          name: def.name,
          description: def.description,
          skillId: def.skillId,
          skillName: skillMap.get(def.skillId) ?? "Unknown",
          minSkillLevel: def.minSkillLevel,
          dailyTaskType: def.dailyTaskType,
          dailyTaskDescription: def.dailyTaskDescription,
          incomePerMemberL1: def.incomePerMemberL1,
          minSkillLevelL2: def.minSkillLevelL2,
          incomePerMemberL2: def.incomePerMemberL2,
          upgradeCostL1toL2: def.upgradeCostL1toL2,
          minSkillLevelL3: def.minSkillLevelL3,
          incomePerMemberL3: def.incomePerMemberL3,
          upgradeCostL2toL3: def.upgradeCostL2toL3,
          requirements,
        },
        eligibleMemberCount: memberEligibility.filter((m) => m.isEligible).length,
        allRequirementsSatisfied: requirements.every(r => r.satisfied),
        isActive: activeOpDefIds.has(def.id),
        userSkillLevel: userSkillBySkillId.get(def.skillId) ?? 0,
        memberEligibility,
      };
    });

    // Build active operations info
    const activeOperations = activeOps.map((activeOp) => {
      const def = allOpDefs.find((d) => d.id === activeOp.operationDefId);
      if (!def) return null;

      const today = getDateString();
      const incomeRate = getIncomeForLevel(def, activeOp.level);
      const reqsForDef = reqsByOp.get(def.id) ?? [];

      const opAssignments = assignmentsByOp.get(activeOp.id) ?? [];

      const todayTasks = db.select()
        .from(schema.gangDailyTasks)
        .where(and(
          eq(schema.gangDailyTasks.gangId, gangId),
          eq(schema.gangDailyTasks.operationDefId, def.id),
          eq(schema.gangDailyTasks.taskDate, today),
        ))
        .all();

      // Show status for assigned members
      const assignedMembers = opAssignments.map(a => {
        const member = allMembers.find(m => m.userId === a.userId);
        const task = todayTasks.find(t => t.userId === a.userId);
        const userSkillMap = skillsByUser.get(a.userId);
        const isEligible = reqsForDef.some(r => (userSkillMap?.get(r.skillId) ?? 0) >= r.minLevel);
        return {
          userId: a.userId,
          username: member?.username ?? "Unknown",
          completed: task ? !!task.completed : false,
          isEligible,
          assignedAt: a.assignedAt,
        };
      });

      const completedCount = assignedMembers.filter(m => m.completed).length;

      // Calculate pending payout (tasks completed since last payout)
      const pendingPayout = completedCount * incomeRate;

      return {
        id: activeOp.id,
        defId: def.id,
        name: def.name,
        description: def.description,
        skillName: skillMap.get(def.skillId) ?? "Unknown",
        requiredSkillLevel: getMinSkillForLevel(def, activeOp.level),
        requirements: reqsForDef.map(r => ({
          skillId: r.skillId,
          skillName: skillMap.get(r.skillId) ?? "Unknown",
          minLevel: r.minLevel,
          sortOrder: r.sortOrder,
          satisfied: assignedMembers.some(m => {
            const userSkillMap = skillsByUser.get(m.userId);
            return (userSkillMap?.get(r.skillId) ?? 0) >= r.minLevel;
          }),
        })),
        level: activeOp.level,
        upgradeCost: activeOp.level === 1 ? def.upgradeCostL1toL2 : def.upgradeCostL2toL3,
        currentIncome: incomeRate,
        totalDailyIncome: completedCount * incomeRate,
        dailyTaskDescription: def.dailyTaskDescription,
        dailyTaskType: def.dailyTaskType,
        dailyProgress: {
          completed: completedCount,
          total: assignedMembers.length,
          eligibleMembers: assignedMembers.length,
        },
        assignedMembers,
        pendingPayout,
        startedAt: activeOp.startedAt,
        lastPayoutAt: activeOp.lastPayoutAt,
      };
    }).filter((op): op is NonNullable<typeof op> => op !== null);

    // Get payout history (last 5)
    const payoutHistory = db.select()
      .from(schema.gangOperationPayouts)
      .where(eq(schema.gangOperationPayouts.gangId, gangId))
      .orderBy(desc(schema.gangOperationPayouts.paidAt))
      .limit(5)
      .all();

    // Filter active operations from catalog
    const filteredCatalog = catalog.filter(entry => !activeOpDefIds.has(entry.def.id));

    res.json({ catalog: filteredCatalog, activeOperations, payoutHistory });
  } catch (err) {
    console.error("List operations error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// POST /api/gangs/:id/operations/start — leader starts an operation with member assignment
gangOperationsRouter.post("/:id/operations/start", authMiddleware, jailCheck, hpCheck, (req: AuthRequest, res: Response) => {
  try {
    const gangId = parseInt(req.params.id as string);
    const { operationDefId, memberIds } = z.object({
      operationDefId: z.number().int().positive(),
      memberIds: z.array(z.number().int().positive()).min(1, "At least one member must be assigned"),
    }).parse(req.body);

    const gang = db.select().from(schema.gangs).where(eq(schema.gangs.id, gangId)).all()[0];
    if (!gang) {
      res.status(404).json({ error: "Gang not found" });
      return;
    }

    if (!isLeader(gang, req.userId!)) {
      res.status(403).json({ error: "Only the gang leader can start operations" });
      return;
    }

    const def = db.select().from(schema.gangOperationDefs).where(eq(schema.gangOperationDefs.id, operationDefId)).all()[0];
    if (!def) {
      res.status(404).json({ error: "Operation not found" });
      return;
    }

    // Validate all memberIds are in the gang
    const allMemberRows = db.select({ userId: schema.gangMembers.userId })
      .from(schema.gangMembers)
      .where(and(
        eq(schema.gangMembers.gangId, gangId),
        inArray(schema.gangMembers.userId, memberIds),
      ))
      .all();
    if (allMemberRows.length !== memberIds.length) {
      res.status(400).json({ error: "One or more selected members are not in your gang" });
      return;
    }

    // Check requirements are satisfied by selected members
    const reqs = db.select({
      skillId: schema.gangOperationReqs.skillId,
      minLevel: schema.gangOperationReqs.minLevel,
      sortOrder: schema.gangOperationReqs.sortOrder,
      skillName: schema.skillDefinitions.name,
    })
      .from(schema.gangOperationReqs)
      .innerJoin(schema.skillDefinitions, eq(schema.gangOperationReqs.skillId, schema.skillDefinitions.id))
      .where(eq(schema.gangOperationReqs.operationDefId, operationDefId))
      .all();

    const allUserSkillsRows = db.select()
      .from(schema.userSkills)
      .where(inArray(schema.userSkills.userId, memberIds))
      .all();

    const skillsByUser = new Map<number, Map<number, number>>();
    for (const row of allUserSkillsRows) {
      if (!skillsByUser.has(row.userId)) skillsByUser.set(row.userId, new Map());
      skillsByUser.get(row.userId)!.set(row.skillId, (row as any).level);
    }

    // Check each requirement is satisfied by at least one selected member
    for (const req of reqs) {
      const satisfied = memberIds.some(uid => {
        const level = skillsByUser.get(uid)?.get(req.skillId) ?? 0;
        return level >= req.minLevel;
      });
      if (!satisfied) {
        res.status(400).json({
          error: `No selected member meets the requirement: ${req.skillName} level ${req.minLevel}`
        });
        return;
      }
    }

    // Check each selected member is eligible (satisfies at least one requirement)
    const ineligibleMembers = memberIds.filter(uid => {
      return !reqs.some(r => (skillsByUser.get(uid)?.get(r.skillId) ?? 0) >= r.minLevel);
    });
    if (ineligibleMembers.length > 0) {
      res.status(400).json({
        error: "Some selected members don't meet any requirement for this operation",
        ineligibleMemberIds: ineligibleMembers,
      });
      return;
    }

    // Check none are already assigned to another active operation
    const existingAssignments = db.select()
      .from(schema.gangOperationAssignments)
      .where(and(
        eq(schema.gangOperationAssignments.gangId, gangId),
        inArray(schema.gangOperationAssignments.userId, memberIds),
      ))
      .all();
    if (existingAssignments.length > 0) {
      const alreadyAssigned = existingAssignments.map(a => a.userId);
      res.status(400).json({
        error: "Some selected members are already assigned to another operation",
        alreadyAssignedMemberIds: alreadyAssigned,
      });
      return;
    }

    const now = new Date().toISOString();

    const insertResult = db.insert(schema.gangActiveOperations).values({
      gangId,
      operationDefId,
      level: 1,
      startedAt: now,
      lastPayoutAt: now,
    }).run();

    const activeOperationId = insertResult.lastInsertRowid as number;

    // Insert assignments
    for (const uid of memberIds) {
      db.insert(schema.gangOperationAssignments).values({
        gangId,
        activeOperationId,
        userId: uid,
        assignedAt: now,
      }).run();
    }

    logActivityEvent(req.userId!, "operation_started",
      `Started ${def.name} operation for [${gang.tag}] ${gang.name} with ${memberIds.length} member(s) assigned`,
      { gangId, operationDefId, operationName: def.name, gangName: gang.name, gangTag: gang.tag, memberIds });

    res.status(201).json({
      id: activeOperationId,
      operationDefId,
      level: 1,
      startedAt: now,
      assignedMemberIds: memberIds,
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: err.errors[0].message });
      return;
    }
    console.error("Start operation error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// POST /api/gangs/:id/operations/stop — leader stops an active operation
gangOperationsRouter.post("/:id/operations/stop", authMiddleware, jailCheck, hpCheck, (req: AuthRequest, res: Response) => {
  try {
    const gangId = parseInt(req.params.id as string);
    const { activeOperationId } = z.object({
      activeOperationId: z.number().int().positive(),
    }).parse(req.body);

    const gang = db.select().from(schema.gangs).where(eq(schema.gangs.id, gangId)).all()[0];
    if (!gang) {
      res.status(404).json({ error: "Gang not found" });
      return;
    }

    if (!isLeader(gang, req.userId!)) {
      res.status(403).json({ error: "Only the gang leader can stop operations" });
      return;
    }

    const activeOp = db.select()
      .from(schema.gangActiveOperations)
      .where(and(
        eq(schema.gangActiveOperations.id, activeOperationId),
        eq(schema.gangActiveOperations.gangId, gangId),
      ))
      .all()[0];
    if (!activeOp) {
      res.status(400).json({ error: "Active operation not found" });
      return;
    }

    // Do a final payout
    const def = db.select().from(schema.gangOperationDefs).where(eq(schema.gangOperationDefs.id, activeOp.operationDefId)).all()[0];
    if (def && activeOp.lastPayoutAt) {
      const elapsedHours = (Date.now() - new Date(activeOp.lastPayoutAt).getTime()) / 3600000;
      if (elapsedHours >= 24) {
        const today = getDateString();
        const incomeRate = getIncomeForLevel(def, activeOp.level);

        const opAssignments = db.select({ userId: schema.gangOperationAssignments.userId })
          .from(schema.gangOperationAssignments)
          .where(eq(schema.gangOperationAssignments.activeOperationId, activeOp.id))
          .all();
        const assignedUserIds = opAssignments.map(a => a.userId);

        let completedCount = 0;
        if (assignedUserIds.length > 0) {
          const result = db.select({ count: sql<number>`COUNT(*)` })
            .from(schema.gangDailyTasks)
            .where(and(
              eq(schema.gangDailyTasks.gangId, gangId),
              eq(schema.gangDailyTasks.operationDefId, def.id),
              eq(schema.gangDailyTasks.taskDate, today),
              eq(schema.gangDailyTasks.completed, true),
              inArray(schema.gangDailyTasks.userId, assignedUserIds),
            ))
            .all()[0];
          completedCount = result?.count ?? 0;
        }

        if (completedCount > 0) {
          db.update(schema.gangs)
            .set({ vault: sql`vault + ${completedCount * incomeRate}` })
            .where(eq(schema.gangs.id, gangId))
            .run();
        }
      }
    }

    // Delete assignments first, then the active operation
    db.delete(schema.gangOperationAssignments)
      .where(eq(schema.gangOperationAssignments.activeOperationId, activeOp.id))
      .run();

    db.delete(schema.gangActiveOperations)
      .where(eq(schema.gangActiveOperations.id, activeOp.id))
      .run();

    res.json({ message: "Operation stopped" });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: err.errors[0].message });
      return;
    }
    console.error("Stop operation error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// POST /api/gangs/:id/operations/levelup — leader upgrades operation level
gangOperationsRouter.post("/:id/operations/levelup", authMiddleware, jailCheck, hpCheck, (req: AuthRequest, res: Response) => {
  try {
    const gangId = parseInt(req.params.id as string);
    const { activeOperationId } = z.object({
      activeOperationId: z.number().int().positive(),
    }).parse(req.body);

    const gang = db.select().from(schema.gangs).where(eq(schema.gangs.id, gangId)).all()[0];
    if (!gang) {
      res.status(404).json({ error: "Gang not found" });
      return;
    }

    if (!isLeader(gang, req.userId!)) {
      res.status(403).json({ error: "Only the gang leader can upgrade operations" });
      return;
    }

    const activeOp = db.select()
      .from(schema.gangActiveOperations)
      .where(and(
        eq(schema.gangActiveOperations.id, activeOperationId),
        eq(schema.gangActiveOperations.gangId, gangId),
      ))
      .all()[0];
    if (!activeOp) {
      res.status(400).json({ error: "Active operation not found" });
      return;
    }

    if (activeOp.level >= 3) {
      res.status(400).json({ error: "Operation is already at max level" });
      return;
    }

    const def = db.select().from(schema.gangOperationDefs).where(eq(schema.gangOperationDefs.id, activeOp.operationDefId)).all()[0];
    if (!def) {
      res.status(404).json({ error: "Operation definition not found" });
      return;
    }

    const upgradeCost = activeOp.level === 1 ? def.upgradeCostL1toL2 : def.upgradeCostL2toL3;
    if (gang.vault < upgradeCost) {
      res.status(400).json({ error: `Not enough funds in gang vault. Need $${upgradeCost.toLocaleString()}.` });
      return;
    }

    db.update(schema.gangs)
      .set({ vault: sql`vault - ${upgradeCost}` })
      .where(eq(schema.gangs.id, gangId))
      .run();

    const newLevel = activeOp.level + 1;
    db.update(schema.gangActiveOperations)
      .set({ level: newLevel })
      .where(eq(schema.gangActiveOperations.id, activeOp.id))
      .run();

    logActivityEvent(req.userId!, "operation_leveled_up",
      `Upgraded ${def.name} operation to level ${newLevel} for [${gang.tag}] ${gang.name}`,
      { gangId, operationName: def.name, newLevel, gangName: gang.name, gangTag: gang.tag });

    res.json({ level: newLevel });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: err.errors[0].message });
      return;
    }
    console.error("Levelup operation error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// POST /api/gangs/:id/operations/complete-task — member completes daily task
gangOperationsRouter.post("/:id/operations/complete-task", authMiddleware, jailCheck, hpCheck, (req: AuthRequest, res: Response) => {
  try {
    const gangId = parseInt(req.params.id as string);
    const { activeOperationId } = z.object({
      activeOperationId: z.number().int().positive(),
    }).parse(req.body);

    const membership = db.select()
      .from(schema.gangMembers)
      .where(and(eq(schema.gangMembers.userId, req.userId!), eq(schema.gangMembers.gangId, gangId)))
      .all()[0];
    if (!membership) {
      res.status(403).json({ error: "You're not a member of this gang" });
      return;
    }

    const activeOp = db.select()
      .from(schema.gangActiveOperations)
      .where(and(
        eq(schema.gangActiveOperations.id, activeOperationId),
        eq(schema.gangActiveOperations.gangId, gangId),
      ))
      .all()[0];
    if (!activeOp) {
      res.status(400).json({ error: "Active operation not found" });
      return;
    }

    // Check user is assigned to this operation
    const assignment = db.select()
      .from(schema.gangOperationAssignments)
      .where(and(
        eq(schema.gangOperationAssignments.activeOperationId, activeOp.id),
        eq(schema.gangOperationAssignments.userId, req.userId!),
      ))
      .all()[0];
    if (!assignment) {
      res.status(403).json({ error: "You are not assigned to this operation" });
      return;
    }

    const def = db.select().from(schema.gangOperationDefs).where(eq(schema.gangOperationDefs.id, activeOp.operationDefId)).all()[0];
    if (!def) {
      res.status(404).json({ error: "Operation not found" });
      return;
    }

    // Check eligibility
    const reqs = db.select()
      .from(schema.gangOperationReqs)
      .where(eq(schema.gangOperationReqs.operationDefId, activeOp.operationDefId))
      .all();

    const userSkills = db.select()
      .from(schema.userSkills)
      .where(eq(schema.userSkills.userId, req.userId!))
      .all();
    const userSkillMap = new Map(userSkills.map(s => [s.skillId, s.level]));

    const satisfied = reqs.some(r => (userSkillMap.get(r.skillId) ?? 0) >= r.minLevel);
    if (!satisfied) {
      res.status(400).json({ error: "You don't meet any skill requirement for this operation" });
      return;
    }

    // Check not already completed today
    const today = getDateString();
    const existingTask = db.select()
      .from(schema.gangDailyTasks)
      .where(and(
        eq(schema.gangDailyTasks.userId, req.userId!),
        eq(schema.gangDailyTasks.operationDefId, activeOp.operationDefId),
        eq(schema.gangDailyTasks.taskDate, today),
      ))
      .all()[0];

    if (existingTask && existingTask.completed) {
      res.status(400).json({ error: "You already completed your daily task today" });
      return;
    }

    // Verify task completion against game logs
    let verified = false;
    const startOfDay = `${today}T00:00:00.000Z`;
    const endOfDay = `${today}T23:59:59.999Z`;

    switch (def.dailyTaskType) {
      case "pvp_win": {
        const wins = db.select({ count: sql<number>`COUNT(*)` })
          .from(schema.pvpLog)
          .where(and(
            eq(schema.pvpLog.attackerId, req.userId!),
            eq(schema.pvpLog.attackerWin, true),
            sql`${schema.pvpLog.createdAt} >= ${startOfDay}`,
            sql`${schema.pvpLog.createdAt} <= ${endOfDay}`,
          ))
          .all()[0];
        verified = (wins?.count ?? 0) > 0;
        break;
      }
      case "crime": {
        const crimes = db.select({ count: sql<number>`COUNT(*)` })
          .from(schema.crimeLog)
          .where(and(
            eq(schema.crimeLog.userId, req.userId!),
            sql`${schema.crimeLog.createdAt} >= ${startOfDay}`,
            sql`${schema.crimeLog.createdAt} <= ${endOfDay}`,
          ))
          .all()[0];
        verified = (crimes?.count ?? 0) > 0;
        break;
      }
      case "train_skill": {
        const reqSkillIds = reqs.map(r => r.skillId);
        const trained = db.select()
          .from(schema.userSkills)
          .where(and(
            eq(schema.userSkills.userId, req.userId!),
            inArray(schema.userSkills.skillId, reqSkillIds.length > 0 ? reqSkillIds : [def.skillId]),
            sql`${schema.userSkills.lastTrainedAt} >= ${startOfDay}`,
            sql`${schema.userSkills.lastTrainedAt} <= ${endOfDay}`,
          ))
          .all()[0];
        verified = !!trained;
        break;
      }
      case "deposit_vault": {
        const depositTask = db.select()
          .from(schema.gangDailyTasks)
          .where(and(
            eq(schema.gangDailyTasks.userId, req.userId!),
            eq(schema.gangDailyTasks.operationDefId, activeOp.operationDefId),
            eq(schema.gangDailyTasks.taskDate, today),
            eq(schema.gangDailyTasks.completed, true),
          ))
          .all()[0];
        verified = !!depositTask;
        break;
      }
    }

    if (!verified) {
      res.status(400).json({
        error: "Task not completed yet. Complete the required action first, then try again.",
        taskDescription: def.dailyTaskDescription,
      });
      return;
    }

    const now = new Date().toISOString();
    if (existingTask) {
      db.update(schema.gangDailyTasks)
        .set({ completed: true, verifiedAt: now })
        .where(eq(schema.gangDailyTasks.id, existingTask.id))
        .run();
    } else {
      db.insert(schema.gangDailyTasks).values({
        gangId,
        userId: req.userId!,
        operationDefId: activeOp.operationDefId,
        taskDate: today,
        completed: true,
        verifiedAt: now,
      }).run();
    }

    res.json({ message: "Daily task completed!", taskDate: today });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: err.errors[0].message });
      return;
    }
    console.error("Complete task error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// POST /api/gangs/:id/operations/collect — collect pending payout to vault
gangOperationsRouter.post("/:id/operations/collect", authMiddleware, jailCheck, hpCheck, (req: AuthRequest, res: Response) => {
  try {
    const gangId = parseInt(req.params.id as string);
    const { activeOperationId } = z.object({
      activeOperationId: z.number().int().positive(),
    }).parse(req.body);

    const membership = db.select()
      .from(schema.gangMembers)
      .where(and(eq(schema.gangMembers.userId, req.userId!), eq(schema.gangMembers.gangId, gangId)))
      .all()[0];
    if (!membership) {
      res.status(403).json({ error: "You're not a member of this gang" });
      return;
    }

    const activeOp = db.select()
      .from(schema.gangActiveOperations)
      .where(and(
        eq(schema.gangActiveOperations.id, activeOperationId),
        eq(schema.gangActiveOperations.gangId, gangId),
      ))
      .all()[0];
    if (!activeOp) {
      res.status(400).json({ error: "Active operation not found" });
      return;
    }

    if (!activeOp.lastPayoutAt) {
      res.status(400).json({ error: "No payout history yet." });
      return;
    }

    const def = db.select().from(schema.gangOperationDefs).where(eq(schema.gangOperationDefs.id, activeOp.operationDefId)).all()[0];
    if (!def) {
      res.status(404).json({ error: "Operation definition not found" });
      return;
    }

    const incomeRate = getIncomeForLevel(def, activeOp.level);

    // Count completions from assigned members since last payout
    const opAssignments = db.select({ userId: schema.gangOperationAssignments.userId })
      .from(schema.gangOperationAssignments)
      .where(eq(schema.gangOperationAssignments.activeOperationId, activeOp.id))
      .all();
    const assignedUserIds = opAssignments.map(a => a.userId);

    let completedCount = 0;
    if (assignedUserIds.length > 0) {
      const result = db.select({ count: sql<number>`COUNT(*)` })
        .from(schema.gangDailyTasks)
        .where(and(
          eq(schema.gangDailyTasks.gangId, gangId),
          eq(schema.gangDailyTasks.operationDefId, def.id),
          eq(schema.gangDailyTasks.completed, true),
          sql`${schema.gangDailyTasks.verifiedAt} >= ${activeOp.lastPayoutAt}`,
          inArray(schema.gangDailyTasks.userId, assignedUserIds),
        ))
        .all()[0];
      completedCount = result?.count ?? 0;
    }

    if (completedCount === 0) {
      res.status(400).json({ error: "No assigned members completed their tasks since the last payout. Nothing to collect." });
      return;
    }

    const payout = completedCount * incomeRate;

    db.update(schema.gangs)
      .set({ vault: sql`vault + ${payout}` })
      .where(eq(schema.gangs.id, gangId))
      .run();

    const now = new Date().toISOString();
    db.update(schema.gangActiveOperations)
      .set({ lastPayoutAt: now })
      .where(eq(schema.gangActiveOperations.id, activeOp.id))
      .run();

    db.insert(schema.gangOperationPayouts).values({
      gangId,
      operationDefId: def.id,
      level: activeOp.level,
      amountPerMember: incomeRate,
      totalPayout: payout,
      eligibleMemberCount: completedCount,
      paidAt: now,
    }).run();

    const updatedGang = db.select({ vault: schema.gangs.vault })
      .from(schema.gangs)
      .where(eq(schema.gangs.id, gangId))
      .all()[0];

    logActivityEvent(req.userId!, "operation_payout_collected",
      `Collected $${payout.toLocaleString()} from ${def.name} operation`,
      { gangId, operationName: def.name, payout, level: activeOp.level, completedCount });

    res.json({ collected: payout, vault: updatedGang?.vault ?? 0, paidAt: now });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: err.errors[0].message });
      return;
    }
    console.error("Collect payout error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// POST /api/gangs/:id/operations/:opId/assign — assign a member to an operation
gangOperationsRouter.post("/:id/operations/:opId/assign", authMiddleware, jailCheck, hpCheck, (req: AuthRequest, res: Response) => {
  try {
    const gangId = parseInt(req.params.id as string);
    const opId = parseInt(req.params.opId as string);
    const { userId } = z.object({ userId: z.number().int().positive() }).parse(req.body);

    const gang = db.select().from(schema.gangs).where(eq(schema.gangs.id, gangId)).all()[0];
    if (!gang) {
      res.status(404).json({ error: "Gang not found" });
      return;
    }

    if (!isLeader(gang, req.userId!)) {
      res.status(403).json({ error: "Only the gang leader can assign members" });
      return;
    }

    const activeOp = db.select()
      .from(schema.gangActiveOperations)
      .where(and(
        eq(schema.gangActiveOperations.id, opId),
        eq(schema.gangActiveOperations.gangId, gangId),
      ))
      .all()[0];
    if (!activeOp) {
      res.status(400).json({ error: "Active operation not found" });
      return;
    }

    const member = db.select()
      .from(schema.gangMembers)
      .where(and(
        eq(schema.gangMembers.userId, userId),
        eq(schema.gangMembers.gangId, gangId),
      ))
      .all()[0];
    if (!member) {
      res.status(400).json({ error: "User is not a member of this gang" });
      return;
    }

    const existingAssignment = db.select()
      .from(schema.gangOperationAssignments)
      .where(and(
        eq(schema.gangOperationAssignments.gangId, gangId),
        eq(schema.gangOperationAssignments.userId, userId),
      ))
      .all()[0];
    if (existingAssignment) {
      res.status(400).json({ error: "Member is already assigned to an operation" });
      return;
    }

    const now = new Date().toISOString();
    db.insert(schema.gangOperationAssignments).values({
      gangId,
      activeOperationId: opId,
      userId,
      assignedAt: now,
    }).run();

    res.status(201).json({ message: "Member assigned", userId, assignedAt: now });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: err.errors[0].message });
      return;
    }
    console.error("Assign member error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// POST /api/gangs/:id/operations/:opId/unassign — unassign a member from an operation
gangOperationsRouter.post("/:id/operations/:opId/unassign", authMiddleware, jailCheck, hpCheck, (req: AuthRequest, res: Response) => {
  try {
    const gangId = parseInt(req.params.id as string);
    const opId = parseInt(req.params.opId as string);
    const { userId } = z.object({ userId: z.number().int().positive() }).parse(req.body);

    const gang = db.select().from(schema.gangs).where(eq(schema.gangs.id, gangId)).all()[0];
    if (!gang) {
      res.status(404).json({ error: "Gang not found" });
      return;
    }

    if (!isLeader(gang, req.userId!)) {
      res.status(403).json({ error: "Only the gang leader can unassign members" });
      return;
    }

    const existing = db.select()
      .from(schema.gangOperationAssignments)
      .where(and(
        eq(schema.gangOperationAssignments.activeOperationId, opId),
        eq(schema.gangOperationAssignments.userId, userId),
      ))
      .all()[0];
    if (!existing) {
      res.status(400).json({ error: "Assignment not found" });
      return;
    }

    db.delete(schema.gangOperationAssignments)
      .where(eq(schema.gangOperationAssignments.id, existing.id))
      .run();

    res.json({ message: "Member unassigned" });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: err.errors[0].message });
      return;
    }
    console.error("Unassign member error:", err);
    res.status(500).json({ error: "Server error" });
  }
});
