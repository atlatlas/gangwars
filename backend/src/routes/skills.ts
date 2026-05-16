import { Router, Response } from "express";
import { db, schema } from "../db";
import { eq, and, sql } from "drizzle-orm";
import { authMiddleware, AuthRequest, hpCheck } from "../middleware/auth";
import { refreshTurns } from "./turns";
import { logActivityEvent } from "./activityEvents";

export const skillsRouter = Router();

// GET /api/skills — list all skills with user's progress
skillsRouter.get("/", authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const user = await db.query.users.findFirst({
      where: eq(schema.users.id, req.userId!),
    });
    if (!user) { res.status(404).json({ error: "User not found" }); return; }

    const refreshedTurns = refreshTurns(user);

    const allSkills = db.select().from(schema.skillDefinitions).all();
    const userSkillRows = db.select()
      .from(schema.userSkills)
      .where(eq(schema.userSkills.userId, user.id))
      .all();

    const skillMap = new Map(userSkillRows.map((s) => [s.skillId, s]));

    const skills = allSkills.map((skill) => {
      const us = skillMap.get(skill.id);
      const level = us?.level ?? 0;
      const xp = us?.xp ?? 0;
      const xpNeeded = Math.floor(10 * (level + 1) * skill.difficulty);
      const statValue = user[skill.statUsed as keyof typeof user] as number;
      const xpPerTrain = skill.baseXpPerTrain + Math.floor(statValue * 0.5);
      const currentTurnCost = getComputedTurnCost(skill.turnCost, level);

      return {
        id: skill.id,
        name: skill.name,
        description: skill.description,
        statUsed: skill.statUsed,
        turnCost: currentTurnCost,
        maxLevel: skill.maxLevel,
        difficulty: skill.difficulty,
        level,
        xp,
        xpNeeded,
        progressPercent: level >= skill.maxLevel ? 100 : Math.min(99, Math.floor((xp / xpNeeded) * 100)),
        xpPerTrain,
        trainingEffect: getTrainingEffect(skill.name, level + 1),
      };
    });

    res.json({ turns: refreshedTurns, skills });
  } catch (err) {
    console.error("Skills list error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// POST /api/skills/:id/train — train a skill (accepts optional `turns` body param for bulk training)
skillsRouter.post("/:id/train", authMiddleware, hpCheck, async (req: AuthRequest, res: Response) => {
  try {
    const skillId = parseInt(req.params.id as string);

    const user = await db.query.users.findFirst({
      where: eq(schema.users.id, req.userId!),
    });
    if (!user) { res.status(404).json({ error: "User not found" }); return; }

    const skill = db.select().from(schema.skillDefinitions).where(eq(schema.skillDefinitions.id, skillId)).all()[0];
    if (!skill) { res.status(404).json({ error: "Skill not found" }); return; }

    // Check jail
    if (user.jailUntil && new Date(user.jailUntil) > new Date()) {
      res.status(400).json({ error: "You're in jail! Wait for release." });
      return;
    }

    // Get or create user_skill row
    let userSkill = db.select()
      .from(schema.userSkills)
      .where(and(eq(schema.userSkills.userId, user.id), eq(schema.userSkills.skillId, skillId)))
      .all()[0];

    if (!userSkill) {
      db.insert(schema.userSkills).values({
        userId: user.id,
        skillId: skillId,
        level: 0,
        xp: 0,
        lastTrainedAt: new Date().toISOString(),
      }).run();
      userSkill = db.select()
        .from(schema.userSkills)
        .where(and(eq(schema.userSkills.userId, user.id), eq(schema.userSkills.skillId, skillId)))
        .all()[0]!;
    }

    const refreshedTurns = refreshTurns(user);

    // How many turns the user wants to spend (default = one cycle)
    const turnsToSpend = Math.min(
      (req.body.turns as number) ?? getComputedTurnCost(skill.turnCost, userSkill.level),
      refreshedTurns
    );

    const statValue = user[skill.statUsed as keyof typeof user] as number;
    const baseXpPerCycle = skill.baseXpPerTrain + Math.floor(statValue * 0.5);

    // Simulate training cycles (turn cost changes on level-up)
    let currentLevel = userSkill.level;
    let currentXp = userSkill.xp;
    let totalTurnsUsed = 0;
    let totalXpGained = 0;
    let totalLevelUps = 0;
    let totalStatPointsGained = 0;
    let totalRespectGained = 0;
    let maxedOut = false;
    const newMilestones: { type: string; level: number }[] = [];

    while (totalTurnsUsed < turnsToSpend) {
      if (currentLevel >= skill.maxLevel) { maxedOut = true; break; }

      const cost = getComputedTurnCost(skill.turnCost, currentLevel);
      const turnsLeft = turnsToSpend - totalTurnsUsed;
      if (turnsLeft < cost) break; // not enough turns for a full cycle

      totalTurnsUsed += cost;
      currentXp += baseXpPerCycle;
      totalXpGained += baseXpPerCycle;

      const xpNeeded = Math.floor(10 * (currentLevel + 1) * skill.difficulty);
      if (currentXp >= xpNeeded) {
        currentXp -= xpNeeded;
        currentLevel++;
        totalLevelUps++;

        // Stat point every 10 levels
        if (currentLevel % 10 === 0) totalStatPointsGained++;
        totalRespectGained += 3;

        if (currentLevel === skill.maxLevel) {
          newMilestones.push({ type: "maxed", level: currentLevel });
        } else if (currentLevel % 5 === 0) {
          newMilestones.push({ type: "milestone", level: currentLevel });
        }
      }
    }

    if (totalTurnsUsed === 0) {
      res.status(400).json({ error: "Not enough turns to train" });
      return;
    }

    // Apply all changes
    const now = new Date().toISOString();
    db.update(schema.users)
      .set({
        turns: refreshedTurns - totalTurnsUsed,
        respect: user.respect + totalRespectGained,
        statPoints: user.statPoints + totalStatPointsGained,
      })
      .where(eq(schema.users.id, user.id))
      .run();

    if (totalRespectGained > 0) {
      const skStats = await db.query.playerStats.findFirst({ where: eq(schema.playerStats.userId, user.id) });
      if (skStats) {
        db.update(schema.playerStats)
          .set({ respectSkills: skStats.respectSkills + totalRespectGained })
          .where(eq(schema.playerStats.userId, user.id))
          .run();
      }
    }

    db.update(schema.userSkills)
      .set({
        level: currentLevel,
        xp: currentXp,
        lastTrainedAt: now,
      })
      .where(eq(schema.userSkills.id, userSkill.id))
      .run();

    // Log activity events for milestones
    for (const m of newMilestones) {
      if (m.type === "maxed") {
        logActivityEvent(user.id, "skill_maxed", `Mastered ${skill.name} reaching level ${m.level}!`, { skillName: skill.name, maxLevel: skill.maxLevel });
      } else {
        logActivityEvent(user.id, "skill_milestone",
          `Reached level ${m.level} in ${skill.name}!`,
          { skillName: skill.name, newLevel: m.level });
      }
    }

    // Auto-track gang daily task for train_skill-type operations (if any level-up happened)
    if (totalLevelUps > 0) {
      const gm = db.select({ gangId: schema.gangMembers.gangId })
        .from(schema.gangMembers)
        .where(eq(schema.gangMembers.userId, user.id))
        .all()[0];
      if (gm) {
        const assignment = db.select({ activeOperationId: schema.gangOperationAssignments.activeOperationId })
          .from(schema.gangOperationAssignments)
          .where(and(
            eq(schema.gangOperationAssignments.userId, user.id),
            eq(schema.gangOperationAssignments.gangId, gm.gangId),
          ))
          .all()[0];
        if (assignment) {
          const activeOp = db.select()
            .from(schema.gangActiveOperations)
            .where(eq(schema.gangActiveOperations.id, assignment.activeOperationId))
            .all()[0];
          if (activeOp) {
            const opDef = db.select()
              .from(schema.gangOperationDefs)
              .where(eq(schema.gangOperationDefs.id, activeOp.operationDefId))
              .all()[0];
            if (opDef && opDef.dailyTaskType === "train_skill") {
              const today = new Date().toISOString().split("T")[0];
              const existingTask = db.select()
                .from(schema.gangDailyTasks)
                .where(and(
                  eq(schema.gangDailyTasks.userId, user.id),
                  eq(schema.gangDailyTasks.operationDefId, opDef.id),
                  eq(schema.gangDailyTasks.taskDate, today),
                ))
                .all()[0];
              if (!existingTask) {
                db.insert(schema.gangDailyTasks).values({
                  gangId: gm.gangId,
                  userId: user.id,
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
          }
        }
      }
    }

    const nextXpNeeded = currentLevel >= skill.maxLevel ? 0 : Math.floor(10 * (currentLevel + 1) * skill.difficulty);

    res.json({
      success: true,
      skillName: skill.name,
      cyclesCompleted: Math.max(1, totalLevelUps + (totalXpGained > 0 ? 1 : 0)),
      xpGained: totalXpGained,
      leveledUp: totalLevelUps > 0,
      totalLevelUps,
      newLevel: currentLevel,
      xp: currentXp,
      xpNeeded: nextXpNeeded,
      turnCost: getComputedTurnCost(skill.turnCost, currentLevel),
      turnsUsed: totalTurnsUsed,
      turnsLeft: refreshedTurns - totalTurnsUsed,
      statPointGained: totalStatPointsGained > 0,
      totalStatPointsGained,
      maxedOut,
    });
  } catch (err) {
    console.error("Train skill error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// Progressive turn cost: quadratic curve — barely increases early, ramps up fast at high levels
function getComputedTurnCost(baseCost: number, level: number): number {
  return Math.max(3, Math.floor(baseCost * (0.35 + 1.65 * Math.pow(level / 100, 2))));
}

function getTrainingEffect(skillName: string, nextLevel: number): string {
  switch (skillName) {
    case "Guerrilla Warfare":
      return `+${Math.floor(nextLevel * 0.3)} PvP attack power`;
    case "Chemistry":
      return `+${Math.min(20, Math.floor(nextLevel * 0.2))}% drug trade efficiency`;
    case "Sixth Sense":
      return `+${Math.min(20, Math.floor(nextLevel * 0.2))}% PvP damage reduction`;
    case "Women's Studies":
      return `+${Math.min(25, Math.floor(nextLevel * 0.25))}% passive income`;
    case "Sexual Education":
      return `+${Math.min(30, Math.floor(nextLevel * 0.3))}% passive income`;
    case "Lockpicking":
      return `+${Math.min(40, Math.floor(nextLevel * 0.4))}% lockpicking hit window`;
    case "Pickpocketing":
      return `+${Math.min(40, Math.floor(nextLevel * 0.4))}% pickpocketing reveal time`;
    case "Safe Cracking":
      return `+${Math.min(10, Math.floor(nextLevel * 0.1))} safe cracking attempts`;
    case "Hacking":
      return `+${Math.min(10, Math.floor(nextLevel * 0.1))} data heist attempts`;
    default:
      return "";
  }
}
