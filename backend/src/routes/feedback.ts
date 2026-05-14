import { Router, Response } from "express";
import { db, schema } from "../db";
import { desc, eq } from "drizzle-orm";
import { authMiddleware, AuthRequest } from "../middleware/auth";

export const feedbackRouter = Router();

// GET /api/feedback — list all feedback
feedbackRouter.get("/", authMiddleware, async (_req: AuthRequest, res: Response) => {
  try {
    const rows = db.select({
      id: schema.feedback.id,
      userId: schema.feedback.userId,
      type: schema.feedback.type,
      title: schema.feedback.title,
      description: schema.feedback.description,
      votes: schema.feedback.votes,
      status: schema.feedback.status,
      createdAt: schema.feedback.createdAt,
      username: schema.users.username,
    })
      .from(schema.feedback)
      .leftJoin(schema.users, eq(schema.feedback.userId, schema.users.id))
      .orderBy(desc(schema.feedback.createdAt))
      .all();

    res.json(rows);
  } catch (err) {
    console.error("Feedback list error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// POST /api/feedback — create feedback
feedbackRouter.post("/", authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { type, title, description } = req.body;
    if (!type || !title || !description) {
      res.status(400).json({ error: "type, title, and description are required" });
      return;
    }
    if (type !== "suggestion" && type !== "bug") {
      res.status(400).json({ error: "type must be 'suggestion' or 'bug'" });
      return;
    }
    if (title.length > 100) {
      res.status(400).json({ error: "Title max 100 characters" });
      return;
    }
    if (description.length > 1000) {
      res.status(400).json({ error: "Description max 1000 characters" });
      return;
    }

    const result = db.insert(schema.feedback).values({
      userId: req.userId!,
      type,
      title: title.trim(),
      description: description.trim(),
      createdAt: new Date().toISOString(),
    }).run();

    const created = db.select().from(schema.feedback).where(eq(schema.feedback.id, Number(result.lastInsertRowid))).get();
    res.status(201).json(created);
  } catch (err) {
    console.error("Feedback create error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// DELETE /api/feedback/:id — delete own feedback
feedbackRouter.delete("/:id", authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const id = parseInt(req.params.id as string);
    const item = db.select().from(schema.feedback).where(eq(schema.feedback.id, id)).get();
    if (!item) {
      res.status(404).json({ error: "Feedback not found" });
      return;
    }
    if (item.userId !== req.userId) {
      res.status(403).json({ error: "You can only delete your own feedback" });
      return;
    }

    db.delete(schema.feedbackComments).where(eq(schema.feedbackComments.feedbackId, id)).run();
    db.delete(schema.feedback).where(eq(schema.feedback.id, id)).run();
    res.json({ success: true });
  } catch (err) {
    console.error("Feedback delete error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// POST /api/feedback/:id/vote — toggle vote
feedbackRouter.post("/:id/vote", authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const id = parseInt(req.params.id as string);
    const item = db.select().from(schema.feedback).where(eq(schema.feedback.id, id)).get();
    if (!item) {
      res.status(404).json({ error: "Feedback not found" });
      return;
    }

    db.update(schema.feedback)
      .set({ votes: item.votes + (req.body.up ? 1 : -1) })
      .where(eq(schema.feedback.id, id))
      .run();

    res.json({ success: true });
  } catch (err) {
    console.error("Feedback vote error:", err);
    res.status(500).json({ error: "Server error" });
  }
});
