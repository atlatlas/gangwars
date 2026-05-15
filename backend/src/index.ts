import express from "express";
import cors from "cors";
import { createServer } from "http";
import { Server } from "socket.io";
import { authRouter } from "./routes/auth";
import { crimesRouter } from "./routes/crimes";
import { pvpRouter } from "./routes/pvp";
import { profileRouter } from "./routes/profile";
import { leaderboardRouter } from "./routes/leaderboard";
import { marketRouter } from "./routes/market";
import { gangsRouter } from "./routes/gangs";
import { gangOperationsRouter } from "./routes/gangOperations";
import { gangTurfRouter } from "./routes/gangTurf";
import { gangArsenalRouter } from "./routes/gangArsenal";
import { gangLeaderboardRouter } from "./routes/gangLeaderboard";
import { gangInvestmentsRouter, myInvestmentsRouter } from "./routes/gangInvestments";
import { skillsRouter } from "./routes/skills";
import { skillCrimesRouter } from "./routes/skillCrimes";
import { drugMarketRouter } from "./routes/drugmarket";
import { bankRouter } from "./routes/bank";
import { hoesRouter } from "./routes/hoes";
import { casinoRouter } from "./routes/casino";
import { activityRouter } from "./routes/activity";
import { feedbackRouter } from "./routes/feedback";
import { feedbackCommentsRouter } from "./routes/feedbackComments";
import { tradingRouter } from "./routes/trading";
import { TradingEngine } from "./engine/tradingEngine";
import { db, schema } from "./db";
import { eq, inArray } from "drizzle-orm";

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: "*", methods: ["GET", "POST"] },
});

app.use(cors());
app.use(express.json({ limit: "2mb" }));

// API routes
app.use("/api/auth", authRouter);
app.use("/api/crimes", crimesRouter);
app.use("/api/pvp", pvpRouter);
app.use("/api/profile", profileRouter);
app.use("/api/leaderboard", leaderboardRouter);
app.use("/api/market", marketRouter);
app.use("/api/gangs", gangsRouter);
app.use("/api/gangs", gangOperationsRouter);
app.use("/api/skills", skillsRouter);
app.use("/api", skillCrimesRouter);
app.use("/api/gangs", gangTurfRouter);
app.use("/api/gangs", gangArsenalRouter);
app.use("/api/gangs", gangLeaderboardRouter);
app.use("/api/gangs", gangInvestmentsRouter);
app.use("/api/investments", myInvestmentsRouter);
app.use("/api/market/drugs", drugMarketRouter);
app.use("/api/bank", bankRouter);
app.use("/api/hoes", hoesRouter);
app.use("/api/casino", casinoRouter);
app.use("/api/activity", activityRouter);
app.use("/api/feedback", feedbackRouter);
app.use("/api/feedback", feedbackCommentsRouter);
app.use("/api/trading", tradingRouter);

// Health check
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// ⚠️ TEMPORARY: cleanup test users
app.post("/api/cleanup", async (_req, res) => {
  try {
    const names = ["gacheck1778794242", "testinvest"];
    const found = db.select().from(schema.users).where(inArray(schema.users.username, names)).all();
    const ids = found.map(u => u.id);
    if (ids.length === 0) { res.json({ removed: [] }); return; }
    for (const id of ids) {
      // Delete from all tables with FK references to users
      db.delete(schema.feedbackCommentVotes).where(eq(schema.feedbackCommentVotes.userId, id)).run();
      db.delete(schema.feedbackComments).where(eq(schema.feedbackComments.userId, id)).run();
      db.delete(schema.feedback).where(eq(schema.feedback.userId, id)).run();
      db.delete(schema.tradingFills).where(eq(schema.tradingFills.userId, id)).run();
      db.delete(schema.tradingOrders).where(eq(schema.tradingOrders.userId, id)).run();
      db.delete(schema.tradingPositions).where(eq(schema.tradingPositions.userId, id)).run();
      db.delete(schema.tradingAccounts).where(eq(schema.tradingAccounts.userId, id)).run();
      db.delete(schema.gangContractContributors).where(eq(schema.gangContractContributors.userId, id)).run();
      db.delete(schema.gangDailyTasks).where(eq(schema.gangDailyTasks.userId, id)).run();
      db.delete(schema.gangOperationAssignments).where(eq(schema.gangOperationAssignments.userId, id)).run();
      db.delete(schema.gangArsenalLog).where(eq(schema.gangArsenalLog.userId, id)).run();
      db.delete(schema.gangInvestments).where(eq(schema.gangInvestments.userId, id)).run();
      db.delete(schema.gangJoinRequests).where(eq(schema.gangJoinRequests.userId, id)).run();
      db.delete(schema.gangInvites).where(eq(schema.gangInvites.userId, id)).run();
      db.delete(schema.gangInvites).where(eq(schema.gangInvites.invitedBy, id)).run();
      db.delete(schema.gangMembers).where(eq(schema.gangMembers.userId, id)).run();
      db.update(schema.gangArsenal).set({ equippedBy: null }).where(eq(schema.gangArsenal.equippedBy, id)).run();
      db.delete(schema.gangs).where(eq(schema.gangs.leaderId, id)).run();
      db.delete(schema.notifications).where(eq(schema.notifications.userId, id)).run();
      db.delete(schema.userSkills).where(eq(schema.userSkills.userId, id)).run();
      db.delete(schema.retaliationLog).where(eq(schema.retaliationLog.originalAttackerId, id)).run();
      db.delete(schema.retaliationLog).where(eq(schema.retaliationLog.defenderId, id)).run();
      db.delete(schema.pvpLog).where(eq(schema.pvpLog.attackerId, id)).run();
      db.delete(schema.pvpLog).where(eq(schema.pvpLog.defenderId, id)).run();
      db.delete(schema.skillCrimeLog).where(eq(schema.skillCrimeLog.userId, id)).run();
      db.delete(schema.crimeLog).where(eq(schema.crimeLog.userId, id)).run();
      db.delete(schema.playerStats).where(eq(schema.playerStats.userId, id)).run();
      db.delete(schema.activityEvents).where(eq(schema.activityEvents.userId, id)).run();
      db.delete(schema.userInventory).where(eq(schema.userInventory.userId, id)).run();
    }
    db.delete(schema.users).where(inArray(schema.users.id, ids)).run();
    res.json({ removed: found.map(u => u.username) });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});


// Socket.io — basic presence
io.on("connection", (socket) => {
  console.log("Player connected:", socket.id);

  socket.on("user:online", (userId: number) => {
    socket.join(`user:${userId}`);
  });

  socket.on("disconnect", () => {
    console.log("Player disconnected:", socket.id);
  });
});

// Start trading engine
const tradingEngine = new TradingEngine(io);
tradingEngine.start();

export { io };

const PORT = process.env.PORT || 3006;
httpServer.listen(PORT, () => {
  console.log(`Gang Wars backend running on http://localhost:${PORT}`);
});
