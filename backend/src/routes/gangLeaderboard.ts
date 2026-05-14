import { Router, Response } from "express";
import { db, schema } from "../db";
import { desc, eq, sql } from "drizzle-orm";
import { authMiddleware, AuthRequest } from "../middleware/auth";

export const gangLeaderboardRouter = Router();

// Subqueries used across multiple ranking types
const memberCountSubquery = sql<number>`(SELECT COUNT(*) FROM gang_members WHERE gang_members.gang_id = gangs.id)`;
const totalRespectSubquery = sql<number>`COALESCE((SELECT SUM(COALESCE(users.respect, 0)) FROM gang_members INNER JOIN users ON users.id = gang_members.user_id WHERE gang_members.gang_id = gangs.id), 0)`;
const turfCountSubquery = sql<number>`(SELECT COUNT(*) FROM gang_turf WHERE gang_turf.gang_id = gangs.id)`;

const baseFields = {
  id: schema.gangs.id,
  name: schema.gangs.name,
  tag: schema.gangs.tag,
  level: schema.gangs.level,
  vault: schema.gangs.vault,
  maxMembers: schema.gangs.maxMembers,
  memberCount: memberCountSubquery,
  totalRespect: totalRespectSubquery,
  turfCount: turfCountSubquery,
  investmentsOpen: schema.gangs.investmentsOpen,
};

// GET /api/gangs/leaderboard/:type
// Types: level, vault, members, respect, turf, rank
gangLeaderboardRouter.get("/leaderboard/:type", authMiddleware, (req: AuthRequest, res: Response) => {
  try {
    const type = req.params.type;
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);

    let rows: any[] = [];

    switch (type) {
      case "level": {
        rows = db.select(baseFields)
          .from(schema.gangs)
          .orderBy(desc(schema.gangs.level))
          .limit(limit)
          .all();
        break;
      }
      case "vault": {
        rows = db.select(baseFields)
          .from(schema.gangs)
          .orderBy(desc(schema.gangs.vault))
          .limit(limit)
          .all();
        break;
      }
      case "members": {
        rows = db.select(baseFields)
          .from(schema.gangs)
          .orderBy(desc(memberCountSubquery))
          .limit(limit)
          .all();
        break;
      }
      case "respect": {
        rows = db.select(baseFields)
          .from(schema.gangs)
          .orderBy(desc(totalRespectSubquery))
          .limit(limit)
          .all();
        break;
      }
      case "turf": {
        rows = db.select(baseFields)
          .from(schema.gangs)
          .orderBy(desc(turfCountSubquery))
          .limit(limit)
          .all();
        break;
      }
      case "rank": {
        // Composite rank score
        const allGangs = db.select(baseFields)
          .from(schema.gangs)
          .all();

        rows = allGangs.map(gang => {
          // Compute operation income contribution
          const activeOp = db.select()
            .from(schema.gangActiveOperations)
            .where(eq(schema.gangActiveOperations.gangId, gang.id))
            .all()[0];
          let opScore = 0;
          if (activeOp) {
            const def = db.select()
              .from(schema.gangOperationDefs)
              .where(eq(schema.gangOperationDefs.id, activeOp.operationDefId))
              .all()[0];
            if (def) {
              const members = gang.memberCount;
              if (activeOp.level === 3) {
                opScore = def.incomePerMemberL3 * members * 4;
              } else if (activeOp.level === 2) {
                opScore = def.incomePerMemberL2 * members * 2;
              } else {
                opScore = def.incomePerMemberL1 * members;
              }
            }
          }

          const rankScore = gang.level * 10000
            + gang.turfCount * 80000
            + Math.floor(gang.vault / 2000)
            + gang.memberCount * 3000
            + Math.floor(opScore / 5000);

          return { ...gang, rankScore: Math.floor(rankScore) };
        });

        rows.sort((a, b) => b.rankScore - a.rankScore);
        rows = rows.slice(0, limit);
        break;
      }
      default: {
        res.status(400).json({ error: "Invalid leaderboard type. Use: level, vault, members, respect, turf, rank" });
        return;
      }
    }

    // Find user's gang rank
    let myRank: number | null = null;
    let myGangId: number | null = null;
    const membership = db.select({ gangId: schema.gangMembers.gangId })
      .from(schema.gangMembers)
      .where(eq(schema.gangMembers.userId, req.userId!))
      .all()[0];

    if (membership) {
      myGangId = membership.gangId;
      const idx = rows.findIndex((r: any) => r.id === membership.gangId);
      myRank = idx !== -1 ? idx + 1 : null;
    }

    res.json({ type, rows, myRank, myGangId });
  } catch (err) {
    console.error("Gang leaderboard error:", err);
    res.status(500).json({ error: "Server error" });
  }
});
