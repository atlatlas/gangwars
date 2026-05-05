import { Router, Response } from "express";
import { z } from "zod";
import { db, schema } from "../db";
import { eq, and, desc, like, sql } from "drizzle-orm";
import { authMiddleware, AuthRequest } from "../middleware/auth";

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
gangsRouter.post("/", authMiddleware, (req: AuthRequest, res: Response) => {
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
      username: schema.users.username,
      level: schema.users.level,
      respect: schema.users.respect,
      cash: schema.users.cash,
      bank: schema.users.bank,
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

    const members = memberRows.map(m => ({
      userId: m.userId,
      gangId: m.gangId,
      role: m.role,
      joinedAt: m.joinedAt,
      username: m.username,
      level: m.level,
      respect: m.respect,
      netWorth: m.cash + m.respect * 10 + m.bank,
    }));

    res.json({
      ...gang,
      memberCount,
      members,
    });
  } catch (err) {
    console.error("Get gang error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// POST /api/gangs/:id/join — join a gang
gangsRouter.post("/:id/join", authMiddleware, (req: AuthRequest, res: Response) => {
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

    const now = new Date().toISOString();
    db.insert(schema.gangMembers).values({
      userId: req.userId!,
      gangId,
      role: "member",
      joinedAt: now,
    }).run();

    res.json({ gangId, role: "member" });
  } catch (err) {
    console.error("Join gang error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// POST /api/gangs/:id/leave — leave a gang
gangsRouter.post("/:id/leave", authMiddleware, (req: AuthRequest, res: Response) => {
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

    db.delete(schema.gangMembers)
      .where(eq(schema.gangMembers.id, membership.id))
      .run();

    res.json({ message: "Left the gang" });
  } catch (err) {
    console.error("Leave gang error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// POST /api/gangs/:id/kick/:userId — kick a member (leader only)
gangsRouter.post("/:id/kick/:userId", authMiddleware, (req: AuthRequest, res: Response) => {
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

    db.delete(schema.gangMembers)
      .where(eq(schema.gangMembers.id, targetMembership.id))
      .run();

    res.json({ message: "Member kicked" });
  } catch (err) {
    console.error("Kick member error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// POST /api/gangs/:id/transfer — transfer leadership
gangsRouter.post("/:id/transfer", authMiddleware, (req: AuthRequest, res: Response) => {
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
gangsRouter.post("/:id/disband", authMiddleware, (req: AuthRequest, res: Response) => {
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

    // Delete all members first, then the gang
    db.delete(schema.gangMembers)
      .where(eq(schema.gangMembers.gangId, gangId))
      .run();

    db.delete(schema.gangs)
      .where(eq(schema.gangs.id, gangId))
      .run();

    res.json({ message: "Gang disbanded" });
  } catch (err) {
    console.error("Disband gang error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// ─── Invite Routes ───

// POST /api/gangs/:id/invite/:userId — invite a user to the gang
gangsRouter.post("/:id/invite/:userId", authMiddleware, (req: AuthRequest, res: Response) => {
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
gangsRouter.post("/invite/:inviteId/accept", authMiddleware, (req: AuthRequest, res: Response) => {
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
gangsRouter.post("/invite/:inviteId/decline", authMiddleware, (req: AuthRequest, res: Response) => {
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

// ─── Rank Management Routes ───

// POST /api/gangs/:id/promote/:userId — promote a member (leader only)
gangsRouter.post("/:id/promote/:userId", authMiddleware, (req: AuthRequest, res: Response) => {
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

    res.json({ message: `${username} promoted to ${newRole}`, newRole });
  } catch (err) {
    console.error("Promote error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// POST /api/gangs/:id/demote/:userId — demote a member (leader only)
gangsRouter.post("/:id/demote/:userId", authMiddleware, (req: AuthRequest, res: Response) => {
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

    res.json({ message: `${username} demoted to ${newRole}`, newRole });
  } catch (err) {
    console.error("Demote error:", err);
    res.status(500).json({ error: "Server error" });
  }
});
