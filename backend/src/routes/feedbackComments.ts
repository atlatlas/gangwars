import { Router, Response } from "express";
import { db, schema } from "../db";
import { eq, sql, and } from "drizzle-orm";
import { authMiddleware, AuthRequest } from "../middleware/auth";

export const feedbackCommentsRouter = Router();

// ─── GET /api/feedback/:feedbackId/comments ───

feedbackCommentsRouter.get("/:feedbackId/comments",
  authMiddleware,
  async (req: AuthRequest, res: Response) => {
    try {
      const feedbackId = parseInt(req.params.feedbackId as string);
      if (isNaN(feedbackId)) {
        res.status(400).json({ error: "Invalid feedback ID" });
        return;
      }

      const exists = db.select().from(schema.feedback).where(eq(schema.feedback.id, feedbackId)).get();
      if (!exists) {
        res.status(404).json({ error: "Feedback not found" });
        return;
      }

      const rows = db.select({
        id: schema.feedbackComments.id,
        feedbackId: schema.feedbackComments.feedbackId,
        userId: schema.feedbackComments.userId,
        content: schema.feedbackComments.content,
        createdAt: schema.feedbackComments.createdAt,
        username: schema.users.username,
        votes: sql<number>`COUNT(DISTINCT ${schema.feedbackCommentVotes.id})`,
        userVoted: sql<boolean>`MAX(CASE WHEN ${schema.feedbackCommentVotes.userId} = ${req.userId!} THEN 1 ELSE 0 END) > 0`,
      })
        .from(schema.feedbackComments)
        .leftJoin(schema.users, eq(schema.feedbackComments.userId, schema.users.id))
        .leftJoin(schema.feedbackCommentVotes, eq(schema.feedbackComments.id, schema.feedbackCommentVotes.commentId))
        .where(eq(schema.feedbackComments.feedbackId, feedbackId))
        .groupBy(schema.feedbackComments.id)
        .orderBy(schema.feedbackComments.createdAt)
        .all();

      res.json(rows);
    } catch (err) {
      console.error("Comments list error:", err);
      res.status(500).json({ error: "Server error" });
    }
  }
);

// ─── POST /api/feedback/:feedbackId/comments — create comment ───

feedbackCommentsRouter.post("/:feedbackId/comments",
  authMiddleware,
  async (req: AuthRequest, res: Response) => {
    try {
      const feedbackId = parseInt(req.params.feedbackId as string);
      if (isNaN(feedbackId)) {
        res.status(400).json({ error: "Invalid feedback ID" });
        return;
      }

      const exists = db.select().from(schema.feedback).where(eq(schema.feedback.id, feedbackId)).get();
      if (!exists) {
        res.status(404).json({ error: "Feedback not found" });
        return;
      }

      const content = (req.body?.content ?? "").trim();
      if (!content) {
        res.status(400).json({ error: "Content is required" });
        return;
      }
      if (content.length > 1000) {
        res.status(400).json({ error: "Comment max 1000 characters" });
        return;
      }

      const result = db.insert(schema.feedbackComments).values({
        feedbackId,
        userId: req.userId!,
        content,
        createdAt: new Date().toISOString(),
      }).run();

      const created = db.select({
        id: schema.feedbackComments.id,
        feedbackId: schema.feedbackComments.feedbackId,
        userId: schema.feedbackComments.userId,
        content: schema.feedbackComments.content,
        createdAt: schema.feedbackComments.createdAt,
        username: schema.users.username,
        votes: sql<number>`0`,
        userVoted: sql<boolean>`1`,
      })
        .from(schema.feedbackComments)
        .leftJoin(schema.users, eq(schema.feedbackComments.userId, schema.users.id))
        .where(eq(schema.feedbackComments.id, Number(result.lastInsertRowid)))
        .get();

      res.status(201).json(created);
    } catch (err) {
      console.error("Comment create error:", err);
      res.status(500).json({ error: "Server error" });
    }
  }
);

// ─── POST /api/feedback/comments/:commentId/vote — toggle upvote ───

feedbackCommentsRouter.post("/comments/:commentId/vote",
  authMiddleware,
  async (req: AuthRequest, res: Response) => {
    try {
      const commentId = parseInt(req.params.commentId as string);
      if (isNaN(commentId)) {
        res.status(400).json({ error: "Invalid comment ID" });
        return;
      }

      const comment = db.select().from(schema.feedbackComments).where(eq(schema.feedbackComments.id, commentId)).get();
      if (!comment) {
        res.status(404).json({ error: "Comment not found" });
        return;
      }

      const existingVote = db.select()
        .from(schema.feedbackCommentVotes)
        .where(and(
          eq(schema.feedbackCommentVotes.commentId, commentId),
          eq(schema.feedbackCommentVotes.userId, req.userId!),
        ))
        .get();

      if (existingVote) {
        db.delete(schema.feedbackCommentVotes)
          .where(eq(schema.feedbackCommentVotes.id, existingVote.id))
          .run();
      } else {
        db.insert(schema.feedbackCommentVotes).values({
          commentId,
          userId: req.userId!,
          createdAt: new Date().toISOString(),
        }).run();
      }

      const voteCount = db.select({ count: sql<number>`COUNT(*)` })
        .from(schema.feedbackCommentVotes)
        .where(eq(schema.feedbackCommentVotes.commentId, commentId))
        .get()?.count ?? 0;

      res.json({ success: true, voted: !existingVote, votes: voteCount });
    } catch (err) {
      console.error("Comment vote error:", err);
      res.status(500).json({ error: "Server error" });
    }
  }
);

// ─── DELETE /api/feedback/comments/:commentId — delete own comment ───

feedbackCommentsRouter.delete("/comments/:commentId",
  authMiddleware,
  async (req: AuthRequest, res: Response) => {
    try {
      const commentId = parseInt(req.params.commentId as string);
      if (isNaN(commentId)) {
        res.status(400).json({ error: "Invalid comment ID" });
        return;
      }

      const comment = db.select().from(schema.feedbackComments).where(eq(schema.feedbackComments.id, commentId)).get();
      if (!comment) {
        res.status(404).json({ error: "Comment not found" });
        return;
      }
      if (comment.userId !== req.userId) {
        res.status(403).json({ error: "You can only delete your own comments" });
        return;
      }

      db.delete(schema.feedbackCommentVotes)
        .where(eq(schema.feedbackCommentVotes.commentId, commentId))
        .run();
      db.delete(schema.feedbackComments)
        .where(eq(schema.feedbackComments.id, commentId))
        .run();

      res.json({ success: true });
    } catch (err) {
      console.error("Comment delete error:", err);
      res.status(500).json({ error: "Server error" });
    }
  }
);
