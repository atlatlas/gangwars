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

// POST /api/skills/:id/train — train a skill
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

    // Get or create user_skill row (needed to compute progressive turn cost)
    let userSkill = db.select()
      .from(schema.userSkills)
      .where(and(eq(schema.userSkills.userId, user.id), eq(schema.userSkills.skillId, skillId)))
      .all()[0];

    const userSkillLevel = userSkill?.level ?? 0;

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

    // Check max level
    if (userSkill.level >= skill.maxLevel) {
      res.status(400).json({ error: "Skill already at max level" });
      return;
    }

    const refreshedTurns = refreshTurns(user);
    const turnCost = getComputedTurnCost(skill.turnCost, userSkillLevel);

    // Check turns
    if (refreshedTurns < turnCost) {
      res.status(400).json({ error: "Not enough turns" });
      return;
    }

    // Deduct turns
    db.update(schema.users)
      .set({ turns: refreshedTurns - turnCost })
      .where(eq(schema.users.id, user.id))
      .run();

    // Calculate XP gained
    const statValue = user[skill.statUsed as keyof typeof user] as number;
    const xpGained = skill.baseXpPerTrain + Math.floor(statValue * 0.5);
    const newXp = userSkill.xp + xpGained;
    const xpNeeded = Math.floor(10 * (userSkill.level + 1) * skill.difficulty);

    let leveledUp = false;
    let newLevel = userSkill.level;
    let remainingXp = newXp;

    if (newXp >= xpNeeded) {
      leveledUp = true;
      newLevel = Math.min(userSkill.level + 1, skill.maxLevel);
      remainingXp = newXp - xpNeeded;

      // Give stat point every 10 levels
      if (newLevel % 10 === 0) {
        db.update(schema.users)
          .set({ statPoints: user.statPoints + 1 })
          .where(eq(schema.users.id, user.id))
          .run();
      }

      // +3 respect per skill level-up
      db.update(schema.users)
        .set({ respect: user.respect + 3 })
        .where(eq(schema.users.id, user.id))
        .run();

      if (newLevel === skill.maxLevel) {
        logActivityEvent(user.id, "skill_maxed", `Mastered ${skill.name} reaching level ${newLevel}!`, { skillName: skill.name, maxLevel: skill.maxLevel });
      } else if (newLevel % 5 === 0) {
        logActivityEvent(user.id, "skill_milestone",
          `Reached level ${newLevel} in ${skill.name}!`,
          { skillName: skill.name, newLevel });
      }
    }

    db.update(schema.userSkills)
      .set({
        level: newLevel,
        xp: leveledUp ? remainingXp : newXp,
        lastTrainedAt: new Date().toISOString(),
      })
      .where(eq(schema.userSkills.id, userSkill.id))
      .run();

    // Auto-track gang daily task for train_skill-type operations
    if (leveledUp) {
      const gm = db.select({ gangId: schema.gangMembers.gangId })
        .from(schema.gangMembers)
        .where(eq(schema.gangMembers.userId, user.id))
        .all()[0];
      if (gm) {
        const activeOp = db.select()
          .from(schema.gangActiveOperations)
          .where(eq(schema.gangActiveOperations.gangId, gm.gangId))
          .all()[0];
        if (activeOp) {
          const opDef = db.select()
            .from(schema.gangOperationDefs)
            .where(eq(schema.gangOperationDefs.id, activeOp.operationDefId))
            .all()[0];
          if (opDef && opDef.dailyTaskType === "train_skill") {
            const today = new Date().toISOString().split("T")[0];
            const now = new Date().toISOString();
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

    const nextXpNeeded = newLevel >= skill.maxLevel ? 0 : Math.floor(10 * (newLevel + 1) * skill.difficulty);

    res.json({
      success: true,
      skillName: skill.name,
      xpGained,
      leveledUp,
      newLevel,
      xp: leveledUp ? remainingXp : newXp,
      xpNeeded: nextXpNeeded,
      turnCost,
      turnsLeft: refreshedTurns - turnCost,
      statPointGained: leveledUp && newLevel % 10 === 0,
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
