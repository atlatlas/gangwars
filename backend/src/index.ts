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
import { skillsRouter } from "./routes/skills";
import { skillCrimesRouter } from "./routes/skillCrimes";
import { drugMarketRouter } from "./routes/drugmarket";
import { bankRouter } from "./routes/bank";
import { hoesRouter } from "./routes/hoes";
import { casinoRouter } from "./routes/casino";
import { activityRouter } from "./routes/activity";
import { db, schema, sqlite } from "./db";
import { eq, sql } from "drizzle-orm";

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
app.use("/api/market/drugs", drugMarketRouter);
app.use("/api/bank", bankRouter);
app.use("/api/hoes", hoesRouter);
app.use("/api/casino", casinoRouter);
app.use("/api/activity", activityRouter);

// Health check
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// TEMP: cleanup demo users and gang
app.post("/api/cleanup-demo", (_req, res) => {
  try {
    const demoUsernames = ["demo", "testuser", "player1"];
    const demoGangName = "DemoGang";

    // Find user IDs
    const demoUsers = db.select({ id: schema.users.id, username: schema.users.username })
      .from(schema.users)
      .where(sql`username IN ('demo','testuser','player1')`)
      .all();

    // Find gang ID
    const demoGang = db.select({ id: schema.gangs.id })
      .from(schema.gangs)
      .where(eq(schema.gangs.name, demoGangName))
      .all()[0];

    if (!demoUsers.length && !demoGang) {
      res.json({ message: "No demo users or DemoGang found, nothing to clean up." });
      return;
    }

    const userIds = demoUsers.map(u => u.id);

    // Wrap in transaction
    sqlite.exec("BEGIN TRANSACTION");
    try {
      // Delete DemoGang related records
      if (demoGang) {
        const gid = demoGang.id;
        sqlite.exec(`DELETE FROM gang_operation_assignments WHERE gang_id = ${gid}`);
        sqlite.exec(`DELETE FROM gang_daily_tasks WHERE gang_id = ${gid}`);
        sqlite.exec(`DELETE FROM gang_active_operations WHERE gang_id = ${gid}`);
        sqlite.exec(`DELETE FROM gang_operation_payouts WHERE gang_id = ${gid}`);
        sqlite.exec(`DELETE FROM gang_contract_contributors WHERE contract_id IN (SELECT id FROM gang_contracts WHERE gang_id = ${gid})`);
        sqlite.exec(`DELETE FROM gang_contracts WHERE gang_id = ${gid}`);
        sqlite.exec(`DELETE FROM gang_arsenal_log WHERE gang_id = ${gid}`);
        sqlite.exec(`DELETE FROM gang_arsenal WHERE gang_id = ${gid}`);
        sqlite.exec(`DELETE FROM gang_turf WHERE gang_id = ${gid}`);
        sqlite.exec(`DELETE FROM gang_join_requests WHERE gang_id = ${gid}`);
        sqlite.exec(`DELETE FROM gang_invites WHERE gang_id = ${gid}`);
        sqlite.exec(`DELETE FROM gang_members WHERE gang_id = ${gid}`);
        sqlite.exec(`DELETE FROM gangs WHERE id = ${gid}`);
      }

      // Delete demo user records
      for (const uid of userIds) {
        sqlite.exec(`DELETE FROM activity_events WHERE user_id = ${uid}`);
        sqlite.exec(`DELETE FROM notifications WHERE user_id = ${uid}`);
        sqlite.exec(`DELETE FROM user_skills WHERE user_id = ${uid}`);
        sqlite.exec(`DELETE FROM user_inventory WHERE user_id = ${uid}`);
        sqlite.exec(`DELETE FROM player_stats WHERE user_id = ${uid}`);
        sqlite.exec(`DELETE FROM crime_log WHERE user_id = ${uid}`);
        sqlite.exec(`DELETE FROM skill_crime_log WHERE user_id = ${uid}`);
        sqlite.exec(`DELETE FROM pvp_log WHERE attacker_id = ${uid} OR defender_id = ${uid}`);
        sqlite.exec(`DELETE FROM retaliation_log WHERE original_attacker_id = ${uid} OR defender_id = ${uid}`);
        sqlite.exec(`DELETE FROM gang_join_requests WHERE user_id = ${uid}`);
        sqlite.exec(`DELETE FROM gang_invites WHERE user_id = ${uid}`);
        sqlite.exec(`DELETE FROM gang_operation_assignments WHERE user_id = ${uid}`);
        sqlite.exec(`DELETE FROM gang_daily_tasks WHERE user_id = ${uid}`);
        sqlite.exec(`DELETE FROM gang_contract_contributors WHERE user_id = ${uid}`);
        sqlite.exec(`DELETE FROM users WHERE id = ${uid}`);
      }

      sqlite.exec("COMMIT");
    } catch (e) {
      sqlite.exec("ROLLBACK");
      throw e;
    }

    const deletedUsers = demoUsers.map(u => u.username).join(", ");
    const deletedGang = demoGang ? ` and ${demoGangName}` : "";
    res.json({ message: `Cleaned up: ${deletedUsers}${deletedGang}` });
  } catch (err) {
    console.error("Cleanup error:", err);
    res.status(500).json({ error: "Cleanup failed" });
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

export { io };

const PORT = process.env.PORT || 3006;
httpServer.listen(PORT, () => {
  console.log(`Gang Wars backend running on http://localhost:${PORT}`);
});
