import { Router, Response } from "express";
import { db, schema } from "../db";
import { desc, eq, sql, inArray } from "drizzle-orm";
import { authMiddleware, AuthRequest } from "../middleware/auth";

export const leaderboardRouter = Router();

// GET /api/leaderboard/:type
// Types: level, respect, networth, pvp
leaderboardRouter.get("/:type", authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const type = req.params.type;
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);

    let rows: any[] = [];

    switch (type) {
      case "level": {
        rows = db.select({
          id: schema.users.id,
          username: schema.users.username,
          level: schema.users.level,
          xp: schema.users.xp,
        })
          .from(schema.users)
          .orderBy(desc(schema.users.level), desc(schema.users.xp))
          .limit(limit)
          .all();
        break;
      }
      case "respect": {
        rows = db.select({
          id: schema.users.id,
          username: schema.users.username,
          level: schema.users.level,
          respect: schema.users.respect,
        })
          .from(schema.users)
          .orderBy(desc(schema.users.respect))
          .limit(limit)
          .all();
        break;
      }
      case "networth": {
        // Net worth = cash + respect * 10 + bank
        rows = db.select({
          id: schema.users.id,
          username: schema.users.username,
          level: schema.users.level,
          cash: schema.users.cash,
          bank: schema.users.bank,
        })
          .from(schema.users)
          .orderBy(desc(sql`${schema.users.cash} + COALESCE(${schema.users.bank}, 0)`))
          .limit(limit)
          .all();

        rows = rows.map(r => ({
          id: r.id,
          username: r.username,
          level: r.level,
          netWorth: r.cash + (r.bank ?? 0),
        }));
        break;
      }
      case "pvp": {
        const stats = await db.query.playerStats.findMany({
          with: {
            // We'll map user info separately
          },
          limit,
        });

        // Get user info for each stat entry
        const userIds = stats.map(s => s.userId);
        if (userIds.length > 0) {
          const users = db.select({
            id: schema.users.id,
            username: schema.users.username,
            level: schema.users.level,
          })
            .from(schema.users)
            .where(inArray(schema.users.id, userIds))
            .all();

          const userMap = new Map(users.map(u => [u.id, u]));

          rows = stats
            .map(s => ({
              id: s.userId,
              username: userMap.get(s.userId)?.username || "Unknown",
              level: userMap.get(s.userId)?.level || 0,
              pvpWins: s.pvpWins,
              pvpLosses: s.pvpLosses,
              winRate: s.pvpWins + s.pvpLosses > 0
                ? Math.round((s.pvpWins / (s.pvpWins + s.pvpLosses)) * 100)
                : 0,
            }))
            .sort((a, b) => b.pvpWins - a.pvpWins);
        }
        break;
      }
      default: {
        res.status(400).json({ error: "Invalid leaderboard type. Use: level, respect, networth, pvp" });
        return;
      }
    }

    // Mark current user position
    const userIndex = rows.findIndex((r: any) => r.id === req.userId);
    const myRank = userIndex !== -1 ? userIndex + 1 : null;

    res.json({ type, rows, myRank });
  } catch (err) {
    console.error("Leaderboard error:", err);
    res.status(500).json({ error: "Server error" });
  }
});
