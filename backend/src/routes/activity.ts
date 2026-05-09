import { Router, Response } from "express";
import { db, schema } from "../db";
import { desc, eq, inArray } from "drizzle-orm";
import { authMiddleware, AuthRequest } from "../middleware/auth";

export const activityRouter = Router();

// GET /api/activity/feed — milestone activity feed
activityRouter.get("/feed", authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);

    // Collect user IDs to include (user + their gang members)
    const userIds = new Set<number>();
    userIds.add(req.userId!);

    const membership = db.select({ gangId: schema.gangMembers.gangId })
      .from(schema.gangMembers)
      .where(eq(schema.gangMembers.userId, req.userId!))
      .all();

    if (membership.length > 0) {
      const members = db.select({ userId: schema.gangMembers.userId })
        .from(schema.gangMembers)
        .where(eq(schema.gangMembers.gangId, membership[0].gangId))
        .all();
      members.forEach((m) => userIds.add(m.userId));
    }

    const ids = [...userIds];

    const feed = db.select({
      id: schema.activityEvents.id,
      userId: schema.activityEvents.userId,
      username: schema.users.username,
      type: schema.activityEvents.type,
      message: schema.activityEvents.message,
      metadata: schema.activityEvents.metadata,
      createdAt: schema.activityEvents.createdAt,
    })
      .from(schema.activityEvents)
      .innerJoin(schema.users, eq(schema.activityEvents.userId, schema.users.id))
      .where(inArray(schema.activityEvents.userId, ids))
      .orderBy(desc(schema.activityEvents.createdAt))
      .limit(limit)
      .all();

    res.json({ feed });
  } catch (err) {
    console.error("Activity feed error:", err);
    res.status(500).json({ error: "Server error" });
  }
});
