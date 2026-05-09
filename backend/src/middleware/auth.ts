import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { db, schema } from "../db";
import { eq } from "drizzle-orm";

const JWT_SECRET = process.env.JWT_SECRET || "gangwars-dev-secret-change-in-prod";

export interface AuthRequest extends Request {
  userId?: number;
}

export function generateToken(userId: number): string {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: "24h" });
}

export function authMiddleware(req: AuthRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) {
    res.status(401).json({ error: "No token provided" });
    return;
  }

  try {
    const token = header.slice(7);
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: number };
    req.userId = decoded.userId;
    next();
  } catch {
    res.status(401).json({ error: "Invalid token" });
  }
}

export function jailCheck(req: AuthRequest, res: Response, next: NextFunction) {
  if (!req.userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const user = db.select()
    .from(schema.users)
    .where(eq(schema.users.id, req.userId))
    .all()[0];

  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  if (!user.jailUntil) {
    next();
    return;
  }

  const jailExpiry = new Date(user.jailUntil);
  if (jailExpiry <= new Date()) {
    // Jail expired — clear it and reset phonecall flag
    db.update(schema.users)
      .set({ jailUntil: null, jailPhonecallUsed: 0 })
      .where(eq(schema.users.id, req.userId))
      .run();
    next();
    return;
  }

  res.status(400).json({ error: "You're in jail! Wait for release." });
}

export function hpCheck(req: AuthRequest, res: Response, next: NextFunction) {
  if (!req.userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const user = db.select()
    .from(schema.users)
    .where(eq(schema.users.id, req.userId))
    .all()[0];

  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  if (user.hp <= 0) {
    res.status(400).json({ error: "You're too injured to do anything! Heal up first." });
    return;
  }

  next();
}
