import { Router, Response } from "express";
import { z } from "zod";
import { db, schema } from "../db";
import { eq, and, desc, like, sql } from "drizzle-orm";
import { authMiddleware, AuthRequest, jailCheck, hpCheck } from "../middleware/auth";
import { logActivityEvent } from "./activityEvents";
import { addGangReputation } from "../utils/gangReputation";

export const gangsRouter = Router();

// ─── Schemas ───

const ROLE_HIERARCHY: Record<string, number> = {
  member: 0,
  enforcer: 1,
  lieutenant: 2,
  leader: 3,
};

function getRoleRank(role: string): number {
  return ROLE_HIERARCHY[role] ?? -1;
}

function isLeader(gang: { leaderId: number }, userId: number): boolean {
  return gang.leaderId === userId;
}

function canInvite(gang: { leaderId: number }, membership: { role: string } | undefined): boolean {
  if (!membership) return false;
  return membership.role === "leader" || membership.role === "lieutenant";
}

function canKick(gang: { leaderId: number }, membership: { role: string } | undefined, targetRole: string): boolean {
  if (!membership) return false;
  if (membership.role === "leader") return true;
  if (membership.role === "lieutenant" && targetRole === "member") return true;
  return false;
}

const createGangSchema = z.object({
  name: z.string().min(3).max(25),
  tag: z.string().min(2).max(5).regex(/^[A-Z0-9]+$/, "Tag must be uppercase alphanumeric"),
  description: z.string().max(100).optional().default(""),
});

const transferSchema = z.object({
  userId: z.number(),
});

// ─── Helpers ───

function getMembership(userId: number) {
  return db.select()
    .from(schema.gangMembers)
    .where(eq(schema.gangMembers.userId, userId))
    .all()[0];
}

function getGang(gangId: number) {
  return db.select()
    .from(schema.gangs)
    .where(eq(schema.gangs.id, gangId))
    .all()[0];
}

function getMemberCount(gangId: number): number {
  const result = db.select({ count: sql<number>`COUNT(*)` })
    .from(schema.gangMembers)
    .where(eq(schema.gangMembers.gangId, gangId))
    .all()[0];
  return result?.count ?? 0;
}

// ─── Gang Leveling Helpers ───

function getRepToNext(level: number): number {
  return Math.floor(500 * Math.pow(level, 1.5));
}

function getLevelBenefits(level: number) {
  return {
    maxMembers: 10 + (level - 1) * 2,
    vaultCapacity: 100000 + (level - 1) * 50000,
    crimeBonus: (level - 1) * 1,
    pvpBonus: (level - 1) * 2,
    tagColor: level >= 10 ? "red" : level >= 5 ? "gold" : level >= 3 ? "cyan" : "purple",
  };
}

function getActiveContract(gangId: number) {
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

function generateContract(gangId: number, level: number) {
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

// GET /api/gangs — list all gangs with member count
gangsRouter.get("/", authMiddleware, (req: AuthRequest, res: Response) => {
  try {
    const allGangs = db.select({
      id: schema.gangs.id,
      name: schema.gangs.name,
      tag: schema.gangs.tag,
      description: schema.gangs.description,
      level: schema.gangs.level,
      maxMembers: schema.gangs.maxMembers,
      leaderId: schema.gangs.leaderId,
      createdAt: schema.gangs.createdAt,
      memberCount: sql<number>`(SELECT COUNT(*) FROM gang_members WHERE gang_members.gang_id = gangs.id)`,
    })
    .from(schema.gangs)
    .orderBy(desc(schema.gangs.level))
    .all();

    res.json(allGangs);
  } catch (err) {
    console.error("List gangs error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// POST /api/gangs — create a gang
gangsRouter.post("/", authMiddleware, jailCheck, hpCheck, (req: AuthRequest, res: Response) => {
  try {
    const data = createGangSchema.parse(req.body);

    // Check not already in a gang
    const existing = getMembership(req.userId!);
    if (existing) {
      res.status(400).json({ error: "You're already in a gang" });
      return;
    }

    // Check unique name
    const nameTaken = db.select()
      .from(schema.gangs)
      .where(eq(schema.gangs.name, data.name))
      .all()[0];
    if (nameTaken) {
      res.status(400).json({ error: "A gang with that name already exists" });
      return;
    }

    // Check unique tag
    const tagTaken = db.select()
      .from(schema.gangs)
      .where(eq(schema.gangs.tag, data.tag))
      .all()[0];
    if (tagTaken) {
      res.status(400).json({ error: "A gang with that tag already exists" });
      return;
    }

    const now = new Date().toISOString();

    const result = db.insert(schema.gangs).values({
      name: data.name,
      tag: data.tag,
      description: data.description,
      level: 1,
      maxMembers: 10,
      leaderId: req.userId!,
      createdAt: now,
    }).run();

    const gangId = result.lastInsertRowid as number;

    // Add creator as leader
    db.insert(schema.gangMembers).values({
      userId: req.userId!,
      gangId,
      role: "leader",
      joinedAt: now,
    }).run();

    logActivityEvent(req.userId!, "gang_created",
      `Created [${data.tag}] ${data.name}`,
      { gangId, gangName: data.name, gangTag: data.tag });

    const gang = getGang(gangId);
    res.status(201).json(gang);
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: err.errors[0].message });
      return;
    }
    console.error("Create gang error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// GET /api/gangs/invites — pending invites for current user
gangsRouter.get("/invites", authMiddleware, (req: AuthRequest, res: Response) => {
  try {
    const invites = db.select({
      id: schema.gangInvites.id,
      gangId: schema.gangInvites.gangId,
      gangName: schema.gangs.name,
      gangTag: schema.gangs.tag,
      invitedBy: schema.gangInvites.invitedBy,
      status: schema.gangInvites.status,
      createdAt: schema.gangInvites.createdAt,
    })
    .from(schema.gangInvites)
    .innerJoin(schema.gangs, eq(schema.gangInvites.gangId, schema.gangs.id))
    .where(and(
      eq(schema.gangInvites.userId, req.userId!),
      eq(schema.gangInvites.status, "pending")
    ))
    .orderBy(desc(schema.gangInvites.createdAt))
    .all();

    // Enrich with inviter usernames
    const enriched = invites.map(invite => {
      const inviter = db.select({ username: schema.users.username })
        .from(schema.users)
        .where(eq(schema.users.id, invite.invitedBy))
        .all()[0];
      return { ...invite, invitedByUsername: inviter?.username ?? "Unknown" };
    });

    res.json(enriched);
  } catch (err) {
    console.error("List invites error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// GET /api/gangs/search — search users by username
gangsRouter.get("/search", authMiddleware, (req: AuthRequest, res: Response) => {
  try {
    const query = (req.query.q as string) || "";
    if (query.length < 1) {
      res.status(400).json({ error: "Search query must be at least 1 character" });
      return;
    }

    const users = db.select({
      id: schema.users.id,
      username: schema.users.username,
      level: schema.users.level,
    })
    .from(schema.users)
    .where(like(schema.users.username, `%${query}%`))
    .limit(20)
    .all();

    res.json(users);
  } catch (err) {
    console.error("Search users error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// GET /api/gangs/:id/invites — list pending invites for a gang (leader/lieutenant only)
gangsRouter.get("/:id/invites", authMiddleware, (req: AuthRequest, res: Response) => {
  try {
    const gangId = parseInt(req.params.id as string);
    const gang = getGang(gangId);
    if (!gang) {
      res.status(404).json({ error: "Gang not found" });
      return;
    }

    const requesterMembership = db.select()
      .from(schema.gangMembers)
      .where(and(
        eq(schema.gangMembers.userId, req.userId!),
        eq(schema.gangMembers.gangId, gangId)
      ))
      .all()[0];

    if (!canInvite(gang, requesterMembership)) {
      res.status(403).json({ error: "You don't have permission" });
      return;
    }

    const invites = db.select({
      id: schema.gangInvites.id,
      gangId: schema.gangInvites.gangId,
      userId: schema.gangInvites.userId,
      username: schema.users.username,
      invitedBy: schema.gangInvites.invitedBy,
      status: schema.gangInvites.status,
      createdAt: schema.gangInvites.createdAt,
    })
    .from(schema.gangInvites)
    .innerJoin(schema.users, eq(schema.gangInvites.userId, schema.users.id))
    .where(and(
      eq(schema.gangInvites.gangId, gangId),
      eq(schema.gangInvites.status, "pending")
    ))
    .orderBy(desc(schema.gangInvites.createdAt))
    .all();

    res.json(invites);
  } catch (err) {
    console.error("List gang invites error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// GET /api/gangs/:id — gang detail with members
gangsRouter.get("/:id", authMiddleware, (req: AuthRequest, res: Response) => {
  try {
    const gangId = parseInt(req.params.id as string);
    const gang = getGang(gangId);
    if (!gang) {
      res.status(404).json({ error: "Gang not found" });
      return;
    }

    const memberRows = db.select({
      userId: schema.gangMembers.userId,
      gangId: schema.gangMembers.gangId,
      role: schema.gangMembers.role,
      joinedAt: schema.gangMembers.joinedAt,
      lastRespectPayout: schema.gangMembers.lastRespectPayout,
      username: schema.users.username,
      level: schema.users.level,
      respect: schema.users.respect,
      cash: schema.users.cash,
      bank: schema.users.bank,
      avatarUrl: schema.users.avatarUrl,
    })
    .from(schema.gangMembers)
    .innerJoin(schema.users, eq(schema.gangMembers.userId, schema.users.id))
    .where(eq(schema.gangMembers.gangId, gangId))
    .orderBy(
      sql`CASE ${schema.gangMembers.role}
        WHEN 'leader' THEN 0
        WHEN 'lieutenant' THEN 1
        WHEN 'enforcer' THEN 2
        WHEN 'member' THEN 3
      END`,
      schema.gangMembers.joinedAt
    )
    .all();

    const memberCount = memberRows.length;

    const now = new Date();
    const RESPECT_PER_HOUR: Record<string, number> = {
      member: 2,
      enforcer: 4,
      lieutenant: 6,
      leader: 10,
    };

    // Gang level multiplier: each level adds +10% to passive respect
    const gangLevelMultiplier = 1 + (gang.level - 1) * 0.1;

    // Process passive respect payouts for all members
    for (const m of memberRows) {
      const lastPayout = m.lastRespectPayout ? new Date(m.lastRespectPayout) : null;
      if (lastPayout) {
        const elapsedHours = (now.getTime() - lastPayout.getTime()) / 3600000;
        if (elapsedHours >= 1) {
          const hourlyRate = RESPECT_PER_HOUR[m.role] ?? 2;
          const respectEarned = Math.floor(elapsedHours * hourlyRate * gangLevelMultiplier);
          if (respectEarned > 0) {
            db.update(schema.users)
              .set({ respect: m.respect + respectEarned })
              .where(eq(schema.users.id, m.userId))
              .run();
            db.update(schema.gangMembers)
              .set({ lastRespectPayout: now.toISOString() })
              .where(eq(schema.gangMembers.userId, m.userId))
              .run();
          }
        }
      } else {
        // First time — just stamp the timestamp, no back-pay
        db.update(schema.gangMembers)
          .set({ lastRespectPayout: now.toISOString() })
          .where(eq(schema.gangMembers.userId, m.userId))
          .run();
      }
    }

    // Auto-payout for gang operations (24h cycle)
    const activeOp = db.select()
      .from(schema.gangActiveOperations)
      .where(eq(schema.gangActiveOperations.gangId, gangId))
      .all()[0];
    if (activeOp && activeOp.lastPayoutAt) {
      const elapsedHours = (Date.now() - new Date(activeOp.lastPayoutAt).getTime()) / 3600000;
      if (elapsedHours >= 24) {
        const def = db.select()
          .from(schema.gangOperationDefs)
          .where(eq(schema.gangOperationDefs.id, activeOp.operationDefId))
          .all()[0];
        if (def) {
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
          if (completedCount > 0) {
            const totalIncome = completedCount * incomeRate;
            const investorSharePct = gang.investorShare ?? 30;
            const investorPortion = Math.floor(totalIncome * investorSharePct / 100);
            const vaultPortion = totalIncome - investorPortion;

            // Pay investors proportionally
            if (investorPortion > 0 && (gang.totalInvestments ?? 0) > 0) {
              const investors = db.select()
                .from(schema.gangInvestments)
                .where(and(
                  eq(schema.gangInvestments.gangId, gangId),
                  sql`${schema.gangInvestments.amount} > 0`,
                ))
                .all();
              for (const inv of investors) {
                const share = Math.floor(investorPortion * inv.amount / gang.totalInvestments!);
                if (share > 0) {
                  db.update(schema.gangInvestments)
                    .set({ returnsEarned: sql`${schema.gangInvestments.returnsEarned} + ${share}` })
                    .where(eq(schema.gangInvestments.id, inv.id))
                    .run();
                  db.update(schema.users)
                    .set({ cash: sql`cash + ${share}` })
                    .where(eq(schema.users.id, inv.userId))
                    .run();
                }
              }
            }

            db.update(schema.gangs)
              .set({ vault: sql`vault + ${vaultPortion}` })
              .where(eq(schema.gangs.id, gangId))
              .run();
            // Record payout history (total income, not just vault portion)
            db.insert(schema.gangOperationPayouts).values({
              gangId,
              operationDefId: def.id,
              level: activeOp.level,
              amountPerMember: incomeRate,
              totalPayout: totalIncome,
              eligibleMemberCount: completedCount,
              paidAt: now.toISOString(),
            }).run();
          }
          db.update(schema.gangActiveOperations)
            .set({ lastPayoutAt: now.toISOString() })
            .where(eq(schema.gangActiveOperations.id, activeOp.id))
            .run();
        }
      }
    }

    // ─── Auto-payout for salaries (24h cycle) ───
    if (gang.accountantId && gang.lastSalaryPayout) {
      const elapsedHours = (Date.now() - new Date(gang.lastSalaryPayout).getTime()) / 3600000;
      if (elapsedHours >= 24) {
        const salaryMembers = db.select({
          userId: schema.gangMembers.userId,
          username: schema.users.username,
          salary: schema.gangMembers.salary,
        })
          .from(schema.gangMembers)
          .innerJoin(schema.users, eq(schema.gangMembers.userId, schema.users.id))
          .where(and(
            eq(schema.gangMembers.gangId, gangId),
            sql`${schema.gangMembers.salary} > 0`,
          ))
          .all();

        if (salaryMembers.length > 0) {
          const totalSalaries = salaryMembers.reduce((sum, m) => sum + (m.salary ?? 0), 0);
          const accountantFee = Math.ceil(totalSalaries * 0.02);
          const totalCost = totalSalaries + accountantFee;

          if (gang.vault >= totalCost) {
            db.transaction(() => {
              // Deduct from vault
              db.update(schema.gangs)
                .set({ vault: gang.vault - totalCost })
                .where(eq(schema.gangs.id, gangId))
                .run();

              // Pay each member
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

            gang.vault -= totalCost;
          }
        }

        db.update(schema.gangs)
          .set({ lastSalaryPayout: now.toISOString() })
          .where(eq(schema.gangs.id, gangId))
          .run();
      }
    }

    // Re-fetch members with updated respect values
    const updatedMembers = db.select({
      userId: schema.gangMembers.userId,
      gangId: schema.gangMembers.gangId,
      role: schema.gangMembers.role,
      joinedAt: schema.gangMembers.joinedAt,
      salary: schema.gangMembers.salary,
      username: schema.users.username,
      level: schema.users.level,
      respect: schema.users.respect,
      cash: schema.users.cash,
      bank: schema.users.bank,
      avatarUrl: schema.users.avatarUrl,
    })
    .from(schema.gangMembers)
    .innerJoin(schema.users, eq(schema.gangMembers.userId, schema.users.id))
    .where(eq(schema.gangMembers.gangId, gangId))
    .orderBy(
      sql`CASE ${schema.gangMembers.role}
        WHEN 'leader' THEN 0
        WHEN 'lieutenant' THEN 1
        WHEN 'enforcer' THEN 2
        WHEN 'member' THEN 3
      END`,
      schema.gangMembers.joinedAt
    )
    .all();

    const members = updatedMembers.map(m => ({
      userId: m.userId,
      gangId: m.gangId,
      role: m.role,
      joinedAt: m.joinedAt,
      salary: m.salary ?? 0,
      username: m.username,
      level: m.level,
      respect: m.respect,
      avatarUrl: m.avatarUrl,
      netWorth: m.cash + m.respect * 10 + m.bank,
    }));

    // ─── Gang Leveling: reputation, contract, benefits ───
    const reputationToNext = getRepToNext(gang.level);
    let contract = null;
    let levelBenefits = getLevelBenefits(gang.level);

    // Check if deadline passed on active contract → reset progress
    const existingContract = db.select()
      .from(schema.gangContracts)
      .where(eq(schema.gangContracts.gangId, gangId))
      .all()[0];
    if (existingContract) {
      const now2 = new Date();
      if (new Date(existingContract.deadline) < now2 && !existingContract.completed) {
        // Reset progress
        db.update(schema.gangContracts)
          .set({ progress: 0, completed: 0 })
          .where(eq(schema.gangContracts.id, existingContract.id))
          .run();
        // Delete stale contributor records
        db.delete(schema.gangContractContributors)
          .where(eq(schema.gangContractContributors.contractId, existingContract.id))
          .run();
        contract = {
          type: existingContract.contractType,
          target: existingContract.target,
          progress: 0,
          deadline: existingContract.deadline,
          completed: false,
          contributors: [],
        };
      } else {
        contract = getActiveContract(gangId);
      }
    }

    // Auto-generate contract if at threshold and no active contract
    if (!existingContract && gang.reputation >= reputationToNext) {
      generateContract(gangId, gang.level);
      contract = getActiveContract(gangId);
    }

    // Count pending join requests for leaders
    const pendingRequestCount = db.select({ count: sql<number>`COUNT(*)` })
      .from(schema.gangJoinRequests)
      .where(and(
        eq(schema.gangJoinRequests.gangId, gangId),
        eq(schema.gangJoinRequests.status, "pending"),
      ))
      .all()[0]?.count ?? 0;

    res.json({
      ...gang,
      memberCount,
      members,
      reputation: gang.reputation ?? 0,
      reputationToNext,
      contract,
      levelBenefits,
      pendingRequestCount,
      bannerUrl: gang.bannerUrl,
      accountantId: gang.accountantId,
    });
  } catch (err) {
    console.error("Get gang error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// POST /api/gangs/:id/deposit — deposit cash into gang vault
gangsRouter.post("/:id/deposit", authMiddleware, jailCheck, hpCheck, (req: AuthRequest, res: Response) => {
  try {
    const gangId = parseInt(req.params.id as string);
    const { amount } = z.object({ amount: z.number().int().positive() }).parse(req.body);

    const gang = getGang(gangId);
    if (!gang) {
      res.status(404).json({ error: "Gang not found" });
      return;
    }

    const membership = db.select()
      .from(schema.gangMembers)
      .where(and(
        eq(schema.gangMembers.userId, req.userId!),
        eq(schema.gangMembers.gangId, gangId)
      ))
      .all()[0];

    if (!membership) {
      res.status(403).json({ error: "You're not a member of this gang" });
      return;
    }

    const user = db.select()
      .from(schema.users)
      .where(eq(schema.users.id, req.userId!))
      .all()[0];

    if (!user || user.cash < amount) {
      res.status(400).json({ error: "Not enough cash" });
      return;
    }

    db.update(schema.users)
      .set({ cash: user.cash - amount })
      .where(eq(schema.users.id, req.userId!))
      .run();

    db.update(schema.gangs)
      .set({ vault: gang.vault + amount })
      .where(eq(schema.gangs.id, gangId))
      .run();

    // If gang has a deposit_vault operation active, auto-mark today's task
    const activeOp = db.select()
      .from(schema.gangActiveOperations)
      .where(eq(schema.gangActiveOperations.gangId, gangId))
      .all()[0];
    if (activeOp) {
      const opDef = db.select()
        .from(schema.gangOperationDefs)
        .where(eq(schema.gangOperationDefs.id, activeOp.operationDefId))
        .all()[0];
      if (opDef && opDef.dailyTaskType === "deposit_vault") {
        const today = new Date().toISOString().split("T")[0];
        const existingTask = db.select()
          .from(schema.gangDailyTasks)
          .where(and(
            eq(schema.gangDailyTasks.userId, req.userId!),
            eq(schema.gangDailyTasks.operationDefId, opDef.id),
            eq(schema.gangDailyTasks.taskDate, today),
          ))
          .all()[0];
        if (!existingTask) {
          db.insert(schema.gangDailyTasks).values({
            gangId,
            userId: req.userId!,
            operationDefId: opDef.id,
            taskDate: today,
            completed: true,
            verifiedAt: new Date().toISOString(),
          }).run();
        } else if (!existingTask.completed) {
          db.update(schema.gangDailyTasks)
            .set({ completed: true, verifiedAt: new Date().toISOString() })
            .where(eq(schema.gangDailyTasks.id, existingTask.id))
            .run();
        }
      }
    }

    // Grant gang reputation (1 per $500 deposited)
    const repGain = Math.floor(amount / 500);
    if (repGain > 0) {
      addGangReputation(req.userId!, repGain, "vault_deposits", amount);
    }

    // Grant personal respect (1 per $500 deposited)
    const personalRespect = Math.floor(amount / 500);
    if (personalRespect > 0) {
      db.update(schema.users)
        .set({ respect: user.respect + personalRespect })
        .where(eq(schema.users.id, req.userId!))
        .run();
    }

    res.json({ vault: gang.vault + amount, amount });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: err.errors[0].message });
      return;
    }
    console.error("Deposit error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// POST /api/gangs/:id/levelup — level up the gang (leader only, contract must be completed)
gangsRouter.post("/:id/levelup", authMiddleware, jailCheck, hpCheck, (req: AuthRequest, res: Response) => {
  try {
    const gangId = parseInt(req.params.id as string);
    const gang = getGang(gangId);
    if (!gang) {
      res.status(404).json({ error: "Gang not found" });
      return;
    }

    if (!isLeader(gang, req.userId!)) {
      res.status(403).json({ error: "Only the gang leader can level up the gang" });
      return;
    }

    // Check reputation threshold
    const repToNext = getRepToNext(gang.level);
    if ((gang.reputation ?? 0) < repToNext) {
      res.status(400).json({ error: "Not enough reputation to level up. Earn more reputation first." });
      return;
    }

    // Check active contract is completed
    const contract = db.select()
      .from(schema.gangContracts)
      .where(eq(schema.gangContracts.gangId, gangId))
      .all()[0];
    if (!contract || !contract.completed) {
      res.status(400).json({ error: "Complete the weekly contract before leveling up." });
      return;
    }

    const newLevel = gang.level + 1;
    const surplus = (gang.reputation ?? 0) - repToNext;
    const benefits = getLevelBenefits(newLevel);

    db.update(schema.gangs)
      .set({
        level: newLevel,
        reputation: Math.max(0, surplus),
        maxMembers: benefits.maxMembers,
      })
      .where(eq(schema.gangs.id, gangId))
      .run();

    // Delete completed contract
    db.delete(schema.gangContractContributors)
      .where(eq(schema.gangContractContributors.contractId, contract.id))
      .run();
    db.delete(schema.gangContracts)
      .where(eq(schema.gangContracts.id, contract.id))
      .run();

    logActivityEvent(req.userId!, "gang_leveled_up",
      `[${gang.tag}] ${gang.name} reached level ${newLevel}!`,
      { gangId, gangName: gang.name, gangTag: gang.tag, newLevel, benefits });

    res.json({ level: newLevel, reputation: Math.max(0, surplus), levelBenefits: benefits });
  } catch (err) {
    console.error("Level up gang error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// POST /api/gangs/:id/join — request to join a gang (creates a join request for leader approval)
gangsRouter.post("/:id/join", authMiddleware, jailCheck, hpCheck, (req: AuthRequest, res: Response) => {
  try {
    const gangId = parseInt(req.params.id as string);
    const gang = getGang(gangId);
    if (!gang) {
      res.status(404).json({ error: "Gang not found" });
      return;
    }

    // Check not already in a gang
    const existing = getMembership(req.userId!);
    if (existing) {
      res.status(400).json({ error: "You're already in a gang" });
      return;
    }

    // Check capacity
    const count = getMemberCount(gangId);
    if (count >= gang.maxMembers) {
      res.status(400).json({ error: "Gang is full" });
      return;
    }

    // Check for existing pending request
    const existingRequest = db.select()
      .from(schema.gangJoinRequests)
      .where(and(
        eq(schema.gangJoinRequests.gangId, gangId),
        eq(schema.gangJoinRequests.userId, req.userId!),
        eq(schema.gangJoinRequests.status, "pending"),
      ))
      .all()[0];
    if (existingRequest) {
      res.status(400).json({ error: "You already have a pending join request for this gang" });
      return;
    }

    const now = new Date().toISOString();
    const result = db.insert(schema.gangJoinRequests).values({
      gangId,
      userId: req.userId!,
      status: "pending",
      createdAt: now,
    }).run();

    // Notify all leaders and lieutenants
    const leaders = db.select({ userId: schema.gangMembers.userId })
      .from(schema.gangMembers)
      .where(and(
        eq(schema.gangMembers.gangId, gangId),
        sql`${schema.gangMembers.role} IN ('leader', 'lieutenant')`,
      ))
      .all();
    for (const l of leaders) {
      db.insert(schema.notifications).values({
        userId: l.userId,
        type: "gang_join_request",
        title: "Join Request",
        body: `A player wants to join [${gang.tag}] ${gang.name}`,
        read: false,
        createdAt: now,
      }).run();
    }

    logActivityEvent(req.userId!, "gang_join_requested",
      `Requested to join [${gang.tag}] ${gang.name}`,
      { gangId, gangName: gang.name, gangTag: gang.tag });

    res.status(201).json({ requestId: result.lastInsertRowid, status: "pending" });
  } catch (err) {
    console.error("Join request error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// GET /api/gangs/:id/requests — list pending join requests (leader/lieutenant only)
gangsRouter.get("/:id/requests", authMiddleware, (req: AuthRequest, res: Response) => {
  try {
    const gangId = parseInt(req.params.id as string);
    const gang = getGang(gangId);
    if (!gang) {
      res.status(404).json({ error: "Gang not found" });
      return;
    }

    const requesterMembership = db.select()
      .from(schema.gangMembers)
      .where(and(
        eq(schema.gangMembers.userId, req.userId!),
        eq(schema.gangMembers.gangId, gangId),
      ))
      .all()[0];

    if (!canInvite(gang, requesterMembership)) {
      res.status(403).json({ error: "You don't have permission" });
      return;
    }

    const rows = db.select()
      .from(schema.gangJoinRequests)
      .where(and(
        eq(schema.gangJoinRequests.gangId, gangId),
        eq(schema.gangJoinRequests.status, "pending"),
      ))
      .orderBy(desc(schema.gangJoinRequests.createdAt))
      .all();

    // Enrich with user data, stats, and skills
    const enriched = rows.map(row => {
      const userData = db.select({
        username: schema.users.username,
        level: schema.users.level,
        respect: schema.users.respect,
        cash: schema.users.cash,
        hp: schema.users.hp,
        maxHp: schema.users.maxHp,
        strength: schema.users.strength,
        agility: schema.users.agility,
        intelligence: schema.users.intelligence,
        charisma: schema.users.charisma,
        endurance: schema.users.endurance,
      })
        .from(schema.users)
        .where(eq(schema.users.id, row.userId))
        .all()[0];

      const skills = db.select({
        skillId: schema.userSkills.skillId,
        level: schema.userSkills.level,
        xp: schema.userSkills.xp,
        name: schema.skillDefinitions.name,
        description: schema.skillDefinitions.description,
      })
        .from(schema.userSkills)
        .innerJoin(schema.skillDefinitions, eq(schema.userSkills.skillId, schema.skillDefinitions.id))
        .where(eq(schema.userSkills.userId, row.userId))
        .all();

      return {
        id: row.id,
        userId: row.userId,
        createdAt: row.createdAt,
        ...(userData ?? {}),
        stats: userData ? {
          strength: userData.strength,
          agility: userData.agility,
          intelligence: userData.intelligence,
          charisma: userData.charisma,
          endurance: userData.endurance,
        } : {},
        skills: skills.map(s => ({
          skillId: s.skillId,
          name: s.name,
          level: s.level,
          xp: s.xp,
          description: s.description,
        })),
      };
    });

    res.json(enriched);
  } catch (err) {
    console.error("List join requests error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// POST /api/gangs/:id/requests/:userId/accept — accept a join request (leader/lieutenant only)
gangsRouter.post("/:id/requests/:userId/accept", authMiddleware, jailCheck, hpCheck, (req: AuthRequest, res: Response) => {
  try {
    const gangId = parseInt(req.params.id as string);
    const targetId = parseInt(req.params.userId as string);

    const gang = getGang(gangId);
    if (!gang) {
      res.status(404).json({ error: "Gang not found" });
      return;
    }

    const requesterMembership = db.select()
      .from(schema.gangMembers)
      .where(and(
        eq(schema.gangMembers.userId, req.userId!),
        eq(schema.gangMembers.gangId, gangId),
      ))
      .all()[0];

    if (!canInvite(gang, requesterMembership)) {
      res.status(403).json({ error: "You don't have permission" });
      return;
    }

    // Find the pending request
    const request = db.select()
      .from(schema.gangJoinRequests)
      .where(and(
        eq(schema.gangJoinRequests.gangId, gangId),
        eq(schema.gangJoinRequests.userId, targetId),
        eq(schema.gangJoinRequests.status, "pending"),
      ))
      .all()[0];

    if (!request) {
      res.status(404).json({ error: "No pending join request from this user" });
      return;
    }

    // Check target isn't already in a gang
    const existingMembership = db.select()
      .from(schema.gangMembers)
      .where(eq(schema.gangMembers.userId, targetId))
      .all()[0];
    if (existingMembership) {
      // Auto-decline since they joined elsewhere
      db.update(schema.gangJoinRequests)
        .set({ status: "declined" })
        .where(eq(schema.gangJoinRequests.id, request.id))
        .run();
      res.status(400).json({ error: "This player is already in a gang" });
      return;
    }

    // Check capacity
    const count = getMemberCount(gangId);
    if (count >= gang.maxMembers) {
      res.status(400).json({ error: "Gang is full" });
      return;
    }

    const now = new Date().toISOString();

    // Atomic: add member + update request + notify
    db.transaction(() => {
      db.insert(schema.gangMembers).values({
        userId: targetId,
        gangId,
        role: "member",
        joinedAt: now,
      }).run();

      db.update(schema.gangJoinRequests)
        .set({ status: "accepted" })
        .where(eq(schema.gangJoinRequests.id, request.id))
        .run();

      logActivityEvent(targetId, "gang_member_joined",
        `Joined [${gang.tag}] ${gang.name}`,
        { gangId, gangName: gang.name, gangTag: gang.tag });

      db.insert(schema.notifications).values({
        userId: targetId,
        type: "gang_join_accepted",
        title: "Join Request Accepted",
        body: `Your request to join [${gang.tag}] ${gang.name} was accepted!`,
        read: false,
        createdAt: now,
      }).run();
    });

    res.json({ gangId, role: "member" });
  } catch (err) {
    console.error("Accept join request error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// POST /api/gangs/:id/requests/:userId/decline — decline a join request (leader/lieutenant only)
gangsRouter.post("/:id/requests/:userId/decline", authMiddleware, jailCheck, hpCheck, (req: AuthRequest, res: Response) => {
  try {
    const gangId = parseInt(req.params.id as string);
    const targetId = parseInt(req.params.userId as string);

    const gang = getGang(gangId);
    if (!gang) {
      res.status(404).json({ error: "Gang not found" });
      return;
    }

    const requesterMembership = db.select()
      .from(schema.gangMembers)
      .where(and(
        eq(schema.gangMembers.userId, req.userId!),
        eq(schema.gangMembers.gangId, gangId),
      ))
      .all()[0];

    if (!canInvite(gang, requesterMembership)) {
      res.status(403).json({ error: "You don't have permission" });
      return;
    }

    // Find the pending request
    const request = db.select()
      .from(schema.gangJoinRequests)
      .where(and(
        eq(schema.gangJoinRequests.gangId, gangId),
        eq(schema.gangJoinRequests.userId, targetId),
        eq(schema.gangJoinRequests.status, "pending"),
      ))
      .all()[0];

    if (!request) {
      res.status(404).json({ error: "No pending join request from this user" });
      return;
    }

    db.update(schema.gangJoinRequests)
      .set({ status: "declined" })
      .where(eq(schema.gangJoinRequests.id, request.id))
      .run();

    // Notify the requester
    const now = new Date().toISOString();
    db.insert(schema.notifications).values({
      userId: targetId,
      type: "gang_join_declined",
      title: "Join Request Declined",
      body: `Your request to join [${gang.tag}] ${gang.name} was declined.`,
      read: false,
      createdAt: now,
    }).run();

    res.json({ message: "Join request declined" });
  } catch (err) {
    console.error("Decline join request error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// POST /api/gangs/:id/leave — leave a gang
gangsRouter.post("/:id/leave", authMiddleware, jailCheck, hpCheck, (req: AuthRequest, res: Response) => {
  try {
    const gangId = parseInt(req.params.id as string);
    const membership = db.select()
      .from(schema.gangMembers)
      .where(and(
        eq(schema.gangMembers.userId, req.userId!),
        eq(schema.gangMembers.gangId, gangId)
      ))
      .all()[0];

    if (!membership) {
      res.status(404).json({ error: "You're not a member of this gang" });
      return;
    }

    if (membership.role === "leader") {
      res.status(409).json({ error: "Transfer leadership or disband the gang first" });
      return;
    }

    const leftGang = db.select().from(schema.gangs).where(eq(schema.gangs.id, gangId)).all()[0];

    db.delete(schema.gangMembers)
      .where(eq(schema.gangMembers.id, membership.id))
      .run();

    if (leftGang) {
      logActivityEvent(req.userId!, "gang_member_left",
        `Left [${leftGang.tag}] ${leftGang.name}`,
        { gangId, gangName: leftGang.name, gangTag: leftGang.tag });
    }

    res.json({ message: "Left the gang" });
  } catch (err) {
    console.error("Leave gang error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// POST /api/gangs/:id/kick/:userId — kick a member (leader only)
gangsRouter.post("/:id/kick/:userId", authMiddleware, jailCheck, hpCheck, (req: AuthRequest, res: Response) => {
  try {
    const gangId = parseInt(req.params.id as string);
    const targetId = parseInt(req.params.userId as string);

    const gang = getGang(gangId);
    if (!gang) {
      res.status(404).json({ error: "Gang not found" });
      return;
    }

    // Verify requester can kick
    const requesterMembership = db.select()
      .from(schema.gangMembers)
      .where(and(
        eq(schema.gangMembers.userId, req.userId!),
        eq(schema.gangMembers.gangId, gangId)
      ))
      .all()[0];

    const targetMembership = db.select()
      .from(schema.gangMembers)
      .where(and(
        eq(schema.gangMembers.userId, targetId),
        eq(schema.gangMembers.gangId, gangId)
      ))
      .all()[0];

    if (!requesterMembership || !canKick(gang, requesterMembership, targetMembership?.role ?? "member")) {
      res.status(403).json({ error: "You don't have permission to kick this member" });
      return;
    }

    if (targetId === req.userId) {
      res.status(400).json({ error: "You can't kick yourself" });
      return;
    }

    if (!targetMembership) {
      res.status(404).json({ error: "User is not a member of this gang" });
      return;
    }

    const kickTarget = db.select({ username: schema.users.username })
      .from(schema.users)
      .where(eq(schema.users.id, targetId))
      .all()[0];

    db.delete(schema.gangMembers)
      .where(eq(schema.gangMembers.id, targetMembership.id))
      .run();

    if (kickTarget) {
      logActivityEvent(targetId, "gang_member_kicked",
        `Was kicked from [${gang.tag}] ${gang.name}`,
        { gangId, gangName: gang.name, gangTag: gang.tag });

      logActivityEvent(req.userId!, "gang_member_kicked",
        `Kicked ${kickTarget.username} from [${gang.tag}] ${gang.name}`,
        { gangId, gangName: gang.name, gangTag: gang.tag, targetUsername: kickTarget.username });
    }

    res.json({ message: "Member kicked" });
  } catch (err) {
    console.error("Kick member error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// POST /api/gangs/:id/transfer — transfer leadership
gangsRouter.post("/:id/transfer", authMiddleware, jailCheck, hpCheck, (req: AuthRequest, res: Response) => {
  try {
    const gangId = parseInt(req.params.id as string);
    const data = transferSchema.parse(req.body);

    const gang = getGang(gangId);
    if (!gang) {
      res.status(404).json({ error: "Gang not found" });
      return;
    }

    // Verify requester is leader
    if (gang.leaderId !== req.userId) {
      res.status(403).json({ error: "Only the gang leader can transfer leadership" });
      return;
    }

    // Verify target is a member
    const targetMembership = db.select()
      .from(schema.gangMembers)
      .where(and(
        eq(schema.gangMembers.userId, data.userId),
        eq(schema.gangMembers.gangId, gangId)
      ))
      .all()[0];

    if (!targetMembership) {
      res.status(404).json({ error: "Target user is not in your gang" });
      return;
    }

    // Demote current leader
    db.update(schema.gangMembers)
      .set({ role: "member" })
      .where(and(
        eq(schema.gangMembers.userId, req.userId!),
        eq(schema.gangMembers.gangId, gangId)
      ))
      .run();

    // Promote target to leader
    db.update(schema.gangMembers)
      .set({ role: "leader" })
      .where(and(
        eq(schema.gangMembers.userId, data.userId),
        eq(schema.gangMembers.gangId, gangId)
      ))
      .run();

    // Update gang leaderId
    db.update(schema.gangs)
      .set({ leaderId: data.userId })
      .where(eq(schema.gangs.id, gangId))
      .run();

    logActivityEvent(data.userId, "gang_leadership_transferred",
      `Became the leader of [${gang.tag}] ${gang.name}`,
      { gangId, gangName: gang.name, gangTag: gang.tag });

    logActivityEvent(req.userId!, "gang_leadership_transferred",
      `Transferred leadership of [${gang.tag}] ${gang.name}`,
      { gangId, gangName: gang.name, gangTag: gang.tag, newLeaderId: data.userId });

    res.json({ message: "Leadership transferred" });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: err.errors[0].message });
      return;
    }
    console.error("Transfer leadership error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// POST /api/gangs/:id/disband — disband gang (leader only)
gangsRouter.post("/:id/disband", authMiddleware, jailCheck, hpCheck, (req: AuthRequest, res: Response) => {
  try {
    const gangId = parseInt(req.params.id as string);
    const gang = getGang(gangId);
    if (!gang) {
      res.status(404).json({ error: "Gang not found" });
      return;
    }

    if (gang.leaderId !== req.userId) {
      res.status(403).json({ error: "Only the gang leader can disband" });
      return;
    }

    // Collect members before deleting
    const disbandedMembers = db.select({ userId: schema.gangMembers.userId })
      .from(schema.gangMembers)
      .where(eq(schema.gangMembers.gangId, gangId))
      .all();

    // Delete all members first, then the gang
    db.delete(schema.gangMembers)
      .where(eq(schema.gangMembers.gangId, gangId))
      .run();

    db.delete(schema.gangs)
      .where(eq(schema.gangs.id, gangId))
      .run();

    // Log event for each member
    for (const m of disbandedMembers) {
      if (m.userId !== req.userId) {
        logActivityEvent(m.userId, "gang_disbanded",
          `[${gang.tag}] ${gang.name} was disbanded`,
          { gangName: gang.name, gangTag: gang.tag });
      }
    }

    res.json({ message: "Gang disbanded" });
  } catch (err) {
    console.error("Disband gang error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// ─── POST /api/gangs/:id/banner — set gang banner image (leader only) ───

const BANNER_MAX_LENGTH = 2000000; // 2MB for base64 data URL

const bannerSchema = z.object({
  bannerUrl: z.string().max(BANNER_MAX_LENGTH).optional().nullable(),
});

gangsRouter.post("/:id/banner", authMiddleware, jailCheck, hpCheck, (req: AuthRequest, res: Response) => {
  try {
    const gangId = parseInt(req.params.id as string);
    const gang = getGang(gangId);
    if (!gang) {
      res.status(404).json({ error: "Gang not found" });
      return;
    }

    if (!isLeader(gang, req.userId!)) {
      res.status(403).json({ error: "Only the gang leader can set the banner" });
      return;
    }

    const data = bannerSchema.parse(req.body);

    db.update(schema.gangs)
      .set({ bannerUrl: data.bannerUrl ?? null })
      .where(eq(schema.gangs.id, gangId))
      .run();

    res.json({ success: true, bannerUrl: data.bannerUrl ?? null });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: err.errors[0].message });
      return;
    }
    console.error("Set banner error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// ─── Invite Routes ───

// POST /api/gangs/:id/invite/:userId — invite a user to the gang
gangsRouter.post("/:id/invite/:userId", authMiddleware, jailCheck, hpCheck, (req: AuthRequest, res: Response) => {
  try {
    const gangId = parseInt(req.params.id as string);
    const targetId = parseInt(req.params.userId as string);

    const gang = getGang(gangId);
    if (!gang) {
      res.status(404).json({ error: "Gang not found" });
      return;
    }

    const requesterMembership = db.select()
      .from(schema.gangMembers)
      .where(and(
        eq(schema.gangMembers.userId, req.userId!),
        eq(schema.gangMembers.gangId, gangId)
      ))
      .all()[0];

    if (!canInvite(gang, requesterMembership)) {
      res.status(403).json({ error: "You don't have permission to invite" });
      return;
    }

    // Target must exist
    const targetUser = db.select()
      .from(schema.users)
      .where(eq(schema.users.id, targetId))
      .all()[0];
    if (!targetUser) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    // Target must not already be in a gang
    const existingMembership = db.select()
      .from(schema.gangMembers)
      .where(eq(schema.gangMembers.userId, targetId))
      .all()[0];
    if (existingMembership) {
      res.status(400).json({ error: "User is already in a gang" });
      return;
    }

    // Check capacity
    const count = getMemberCount(gangId);
    if (count >= gang.maxMembers) {
      res.status(400).json({ error: "Gang is full" });
      return;
    }

    // Check for existing pending invite
    const existingInvite = db.select()
      .from(schema.gangInvites)
      .where(and(
        eq(schema.gangInvites.gangId, gangId),
        eq(schema.gangInvites.userId, targetId),
        eq(schema.gangInvites.status, "pending")
      ))
      .all()[0];
    if (existingInvite) {
      res.status(400).json({ error: "Invite already sent to this user" });
      return;
    }

    const now = new Date().toISOString();
    const result = db.insert(schema.gangInvites).values({
      gangId,
      userId: targetId,
      invitedBy: req.userId!,
      status: "pending",
      createdAt: now,
    }).run();

    // Create notification
    db.insert(schema.notifications).values({
      userId: targetId,
      type: "gang_invite",
      title: "Gang Invite",
      body: `You've been invited to join [${gang.tag}] ${gang.name}`,
      read: false,
      createdAt: now,
    }).run();

    res.status(201).json({
      id: result.lastInsertRowid,
      message: `Invite sent to ${targetUser.username}`,
    });
  } catch (err) {
    console.error("Invite error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// POST /api/gangs/invite/:inviteId/accept — accept an invite
gangsRouter.post("/invite/:inviteId/accept", authMiddleware, jailCheck, hpCheck, (req: AuthRequest, res: Response) => {
  try {
    const inviteId = parseInt(req.params.inviteId as string);

    const invite = db.select()
      .from(schema.gangInvites)
      .where(eq(schema.gangInvites.id, inviteId))
      .all()[0];

    if (!invite || invite.userId !== req.userId) {
      res.status(404).json({ error: "Invite not found" });
      return;
    }

    if (invite.status !== "pending") {
      res.status(400).json({ error: "Invite is no longer pending" });
      return;
    }

    const gang = getGang(invite.gangId);
    if (!gang) {
      res.status(404).json({ error: "Gang no longer exists" });
      return;
    }

    // Check not already in a gang
    const existing = getMembership(req.userId!);
    if (existing) {
      res.status(400).json({ error: "You're already in a gang" });
      return;
    }

    // Check capacity
    const count = getMemberCount(invite.gangId);
    if (count >= gang.maxMembers) {
      res.status(400).json({ error: "Gang is full" });
      return;
    }

    const now = new Date().toISOString();

    // Add as member
    db.insert(schema.gangMembers).values({
      userId: req.userId!,
      gangId: invite.gangId,
      role: "member",
      joinedAt: now,
    }).run();

    logActivityEvent(req.userId!, "gang_member_joined",
      `Joined [${gang.tag}] ${gang.name}`,
      { gangId: invite.gangId, gangName: gang.name, gangTag: gang.tag });

    // Mark invite as accepted
    db.update(schema.gangInvites)
      .set({ status: "accepted" })
      .where(eq(schema.gangInvites.id, inviteId))
      .run();

    res.json({ gangId: invite.gangId, role: "member" });
  } catch (err) {
    console.error("Accept invite error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// POST /api/gangs/invite/:inviteId/decline — decline an invite
gangsRouter.post("/invite/:inviteId/decline", authMiddleware, jailCheck, hpCheck, (req: AuthRequest, res: Response) => {
  try {
    const inviteId = parseInt(req.params.inviteId as string);

    const invite = db.select()
      .from(schema.gangInvites)
      .where(eq(schema.gangInvites.id, inviteId))
      .all()[0];

    if (!invite || invite.userId !== req.userId) {
      res.status(404).json({ error: "Invite not found" });
      return;
    }

    if (invite.status !== "pending") {
      res.status(400).json({ error: "Invite is no longer pending" });
      return;
    }

    db.update(schema.gangInvites)
      .set({ status: "declined" })
      .where(eq(schema.gangInvites.id, inviteId))
      .run();

    res.json({ message: "Invite declined" });
  } catch (err) {
    console.error("Decline invite error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// DELETE /api/gangs/:id/invite/:inviteId — cancel a pending invite (leader/lieutenant only)
gangsRouter.delete("/:id/invite/:inviteId", authMiddleware, (req: AuthRequest, res: Response) => {
  try {
    const gangId = parseInt(req.params.id as string);
    const inviteId = parseInt(req.params.inviteId as string);

    const gang = getGang(gangId);
    if (!gang) {
      res.status(404).json({ error: "Gang not found" });
      return;
    }

    const requesterMembership = db.select()
      .from(schema.gangMembers)
      .where(and(
        eq(schema.gangMembers.userId, req.userId!),
        eq(schema.gangMembers.gangId, gangId)
      ))
      .all()[0];

    if (!canInvite(gang, requesterMembership)) {
      res.status(403).json({ error: "You don't have permission" });
      return;
    }

    const invite = db.select()
      .from(schema.gangInvites)
      .where(and(
        eq(schema.gangInvites.id, inviteId),
        eq(schema.gangInvites.gangId, gangId)
      ))
      .all()[0];

    if (!invite) {
      res.status(404).json({ error: "Invite not found" });
      return;
    }

    db.delete(schema.gangInvites)
      .where(eq(schema.gangInvites.id, inviteId))
      .run();

    res.json({ message: "Invite cancelled" });
  } catch (err) {
    console.error("Cancel invite error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// ─── POST /api/gangs/:id/withdraw — withdraw from vault (leader/enforcer) ───

gangsRouter.post("/:id/withdraw", authMiddleware, jailCheck, hpCheck, (req: AuthRequest, res: Response) => {
  try {
    const gangId = parseInt(req.params.id as string);
    const { amount } = z.object({ amount: z.number().int().positive() }).parse(req.body);

    const gang = getGang(gangId);
    if (!gang) {
      res.status(404).json({ error: "Gang not found" });
      return;
    }

    const membership = db.select()
      .from(schema.gangMembers)
      .where(and(
        eq(schema.gangMembers.userId, req.userId!),
        eq(schema.gangMembers.gangId, gangId)
      ))
      .all()[0];

    if (!membership || (membership.role !== "leader" && membership.role !== "enforcer")) {
      res.status(403).json({ error: "Only the leader and enforcer can withdraw from the vault" });
      return;
    }

    if (gang.vault < amount) {
      res.status(400).json({ error: "Not enough in the vault" });
      return;
    }

    db.update(schema.gangs)
      .set({ vault: gang.vault - amount })
      .where(eq(schema.gangs.id, gangId))
      .run();

    db.update(schema.users)
      .set({ cash: sql`cash + ${amount}` })
      .where(eq(schema.users.id, req.userId!))
      .run();

    logActivityEvent(req.userId!, "vault_withdrew",
      `Withdrew $${amount.toLocaleString()} from the gang vault`,
      { gangId, gangName: gang.name, gangTag: gang.tag, amount });

    res.json({ vault: gang.vault - amount, amount });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: err.errors[0].message });
      return;
    }
    console.error("Withdraw error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// ─── POST /api/gangs/:id/pay/:userId — pay a member from the vault (leader/enforcer) ───

gangsRouter.post("/:id/pay/:userId", authMiddleware, jailCheck, hpCheck, (req: AuthRequest, res: Response) => {
  try {
    const gangId = parseInt(req.params.id as string);
    const targetId = parseInt(req.params.userId as string);
    const { amount } = z.object({ amount: z.number().int().positive() }).parse(req.body);

    const gang = getGang(gangId);
    if (!gang) {
      res.status(404).json({ error: "Gang not found" });
      return;
    }

    const requesterMembership = db.select()
      .from(schema.gangMembers)
      .where(and(
        eq(schema.gangMembers.userId, req.userId!),
        eq(schema.gangMembers.gangId, gangId)
      ))
      .all()[0];

    if (!requesterMembership || (requesterMembership.role !== "leader" && requesterMembership.role !== "enforcer")) {
      res.status(403).json({ error: "Only the leader and enforcer can pay members from the vault" });
      return;
    }

    if (req.userId === targetId) {
      res.status(400).json({ error: "Use withdraw instead" });
      return;
    }

    const targetMembership = db.select()
      .from(schema.gangMembers)
      .where(and(
        eq(schema.gangMembers.userId, targetId),
        eq(schema.gangMembers.gangId, gangId)
      ))
      .all()[0];

    if (!targetMembership) {
      res.status(404).json({ error: "User is not a member of this gang" });
      return;
    }

    if (gang.vault < amount) {
      res.status(400).json({ error: "Not enough in the vault" });
      return;
    }

    const targetUser = db.select({ username: schema.users.username })
      .from(schema.users)
      .where(eq(schema.users.id, targetId))
      .all()[0];

    db.transaction(() => {
      db.update(schema.gangs)
        .set({ vault: gang.vault - amount })
        .where(eq(schema.gangs.id, gangId))
        .run();

      db.update(schema.users)
        .set({ cash: sql`cash + ${amount}` })
        .where(eq(schema.users.id, targetId))
        .run();
    });

    logActivityEvent(req.userId!, "vault_paid_member",
      `Paid $${amount.toLocaleString()} from the vault to ${targetUser?.username ?? "member"}`,
      { gangId, gangName: gang.name, gangTag: gang.tag, amount, targetId });

    logActivityEvent(targetId, "vault_received_payment",
      `Received $${amount.toLocaleString()} from the gang vault`,
      { gangId, gangName: gang.name, gangTag: gang.tag, amount, paidBy: req.userId! });

    res.json({ vault: gang.vault - amount, amount, targetUsername: targetUser?.username });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: err.errors[0].message });
      return;
    }
    console.error("Pay member error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// ─── POST /api/gangs/:id/accountant — hire/fire the accountant bot (leader only) ───

gangsRouter.post("/:id/accountant", authMiddleware, jailCheck, hpCheck, (req: AuthRequest, res: Response) => {
  try {
    const gangId = parseInt(req.params.id as string);
    const data = z.object({ hire: z.boolean() }).parse(req.body);

    const gang = getGang(gangId);
    if (!gang) {
      res.status(404).json({ error: "Gang not found" });
      return;
    }

    if (!isLeader(gang, req.userId!)) {
      res.status(403).json({ error: "Only the gang leader can manage the accountant" });
      return;
    }

    db.update(schema.gangs)
      .set({
        accountantId: data.hire ? 1 : null,
        lastSalaryPayout: data.hire && !gang.lastSalaryPayout ? new Date().toISOString() : gang.lastSalaryPayout,
      })
      .where(eq(schema.gangs.id, gangId))
      .run();

    logActivityEvent(req.userId!, data.hire ? "accountant_hired" : "accountant_fired",
      data.hire ? "Hired a gang accountant" : "Fired the gang accountant",
      { gangId });

    res.json({ success: true, hired: data.hire });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: err.errors[0].message });
      return;
    }
    console.error("Set accountant error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// ─── POST /api/gangs/:id/salary/:userId — set a member's salary (leader only) ───

gangsRouter.post("/:id/salary/:userId", authMiddleware, jailCheck, hpCheck, (req: AuthRequest, res: Response) => {
  try {
    const gangId = parseInt(req.params.id as string);
    const targetId = parseInt(req.params.userId as string);
    const data = z.object({ amount: z.number().int().min(0).max(1000000) }).parse(req.body);

    const gang = getGang(gangId);
    if (!gang) {
      res.status(404).json({ error: "Gang not found" });
      return;
    }

    if (!isLeader(gang, req.userId!)) {
      res.status(403).json({ error: "Only the gang leader can set salaries" });
      return;
    }

    const targetMembership = db.select()
      .from(schema.gangMembers)
      .where(and(
        eq(schema.gangMembers.userId, targetId),
        eq(schema.gangMembers.gangId, gangId)
      ))
      .all()[0];

    if (!targetMembership) {
      res.status(404).json({ error: "User is not a member of this gang" });
      return;
    }

    if (targetId === req.userId) {
      res.status(400).json({ error: "The leader cannot set their own salary" });
      return;
    }

    db.update(schema.gangMembers)
      .set({ salary: data.amount })
      .where(eq(schema.gangMembers.id, targetMembership.id))
      .run();

    const targetUser = db.select({ username: schema.users.username })
      .from(schema.users)
      .where(eq(schema.users.id, targetId))
      .all()[0];

    logActivityEvent(req.userId!, "salary_set",
      `Set ${targetUser?.username ?? "member"}'s salary to $${data.amount}/day`,
      { gangId, targetId, amount: data.amount });

    res.json({ success: true, userId: targetId, salary: data.amount });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: err.errors[0].message });
      return;
    }
    console.error("Set salary error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// ─── Rank Management Routes ───

// POST /api/gangs/:id/promote/:userId — promote a member (leader only)
gangsRouter.post("/:id/promote/:userId", authMiddleware, jailCheck, hpCheck, (req: AuthRequest, res: Response) => {
  try {
    const gangId = parseInt(req.params.id as string);
    const targetId = parseInt(req.params.userId as string);

    const gang = getGang(gangId);
    if (!gang) {
      res.status(404).json({ error: "Gang not found" });
      return;
    }

    if (!isLeader(gang, req.userId!)) {
      res.status(403).json({ error: "Only the gang leader can promote members" });
      return;
    }

    if (targetId === req.userId) {
      res.status(400).json({ error: "You can't promote yourself" });
      return;
    }

    const targetMembership = db.select()
      .from(schema.gangMembers)
      .where(and(
        eq(schema.gangMembers.userId, targetId),
        eq(schema.gangMembers.gangId, gangId)
      ))
      .all()[0];

    if (!targetMembership) {
      res.status(404).json({ error: "User is not a member of this gang" });
      return;
    }

    const currentRank = getRoleRank(targetMembership.role);
    const newRole = currentRank === 0 ? "enforcer" : currentRank === 1 ? "lieutenant" : null;

    if (!newRole) {
      res.status(400).json({ error: "This member cannot be promoted further" });
      return;
    }

    db.update(schema.gangMembers)
      .set({ role: newRole })
      .where(eq(schema.gangMembers.id, targetMembership.id))
      .run();

    const username = db.select({ username: schema.users.username })
      .from(schema.users)
      .where(eq(schema.users.id, targetId))
      .all()[0]?.username;

    logActivityEvent(targetId, "gang_member_promoted",
      `Promoted to ${newRole} in [${gang.tag}] ${gang.name}`,
      { gangId, gangName: gang.name, gangTag: gang.tag, newRole, oldRole: targetMembership.role });

    res.json({ message: `${username} promoted to ${newRole}`, newRole });
  } catch (err) {
    console.error("Promote error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// POST /api/gangs/:id/demote/:userId — demote a member (leader only)
gangsRouter.post("/:id/demote/:userId", authMiddleware, jailCheck, hpCheck, (req: AuthRequest, res: Response) => {
  try {
    const gangId = parseInt(req.params.id as string);
    const targetId = parseInt(req.params.userId as string);

    const gang = getGang(gangId);
    if (!gang) {
      res.status(404).json({ error: "Gang not found" });
      return;
    }

    if (!isLeader(gang, req.userId!)) {
      res.status(403).json({ error: "Only the gang leader can demote members" });
      return;
    }

    if (targetId === req.userId) {
      res.status(400).json({ error: "You can't demote yourself" });
      return;
    }

    const targetMembership = db.select()
      .from(schema.gangMembers)
      .where(and(
        eq(schema.gangMembers.userId, targetId),
        eq(schema.gangMembers.gangId, gangId)
      ))
      .all()[0];

    if (!targetMembership) {
      res.status(404).json({ error: "User is not a member of this gang" });
      return;
    }

    const currentRank = getRoleRank(targetMembership.role);
    const newRole = currentRank === 2 ? "enforcer" : currentRank === 1 ? "member" : null;

    if (!newRole) {
      res.status(400).json({ error: "This member cannot be demoted further" });
      return;
    }

    db.update(schema.gangMembers)
      .set({ role: newRole })
      .where(eq(schema.gangMembers.id, targetMembership.id))
      .run();

    const username = db.select({ username: schema.users.username })
      .from(schema.users)
      .where(eq(schema.users.id, targetId))
      .all()[0]?.username;

    logActivityEvent(targetId, "gang_member_demoted",
      `Demoted to ${newRole} in [${gang.tag}] ${gang.name}`,
      { gangId, gangName: gang.name, gangTag: gang.tag, newRole, oldRole: targetMembership.role });

    res.json({ message: `${username} demoted to ${newRole}`, newRole });
  } catch (err) {
    console.error("Demote error:", err);
    res.status(500).json({ error: "Server error" });
  }
});
