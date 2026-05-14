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
import { db, schema } from "./db";
import { eq } from "drizzle-orm";
import Database from "better-sqlite3";
import path from "path";

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

// TEMP: Cleanup demo user
app.post("/api/cleanup-demo", async (_req, res) => {
  try {
    const sqlite = new Database(path.join(__dirname, "..", "data", "gangwars.db"));
    sqlite.pragma("journal_mode = WAL");
    const users = sqlite.prepare("SELECT id, username FROM users").all() as Record<string,any>[];
    const demo = sqlite.prepare("SELECT id FROM users WHERE username = ?").get("demo") as { id: number } | undefined;
    if (!demo) return res.json({ message: "No demo user found", users: users.map(u => u.username) });
    sqlite.prepare("DELETE FROM crime_log WHERE user_id = ?").run(demo.id);
    sqlite.prepare("DELETE FROM skill_crime_log WHERE user_id = ?").run(demo.id);
    sqlite.prepare("DELETE FROM player_stats WHERE user_id = ?").run(demo.id);
    sqlite.prepare("DELETE FROM notifications WHERE user_id = ?").run(demo.id);
    sqlite.prepare("DELETE FROM activity_events WHERE user_id = ?").run(demo.id);
    sqlite.prepare("DELETE FROM user_inventory WHERE user_id = ?").run(demo.id);
    sqlite.prepare("DELETE FROM user_skills WHERE user_id = ?").run(demo.id);
    sqlite.prepare("DELETE FROM pvp_log WHERE attacker_id = ? OR defender_id = ?").run(demo.id, demo.id);
    sqlite.prepare("DELETE FROM retaliation_log WHERE original_attacker_id = ? OR defender_id = ?").run(demo.id, demo.id);
    sqlite.prepare("DELETE FROM gang_invites WHERE user_id = ? OR invited_by = ?").run(demo.id, demo.id);
    sqlite.prepare("DELETE FROM gang_join_requests WHERE user_id = ?").run(demo.id);
    sqlite.prepare("DELETE FROM gang_operation_assignments WHERE user_id = ?").run(demo.id);
    sqlite.prepare("DELETE FROM gang_daily_tasks WHERE user_id = ?").run(demo.id);
    sqlite.prepare("DELETE FROM gang_arsenal WHERE equipped_by = ?").run(demo.id);
    sqlite.prepare("DELETE FROM gang_contract_contributors WHERE user_id = ?").run(demo.id);
    sqlite.prepare("DELETE FROM gang_members WHERE user_id = ?").run(demo.id);
    sqlite.prepare("DELETE FROM users WHERE id = ?").run(demo.id);
    const remaining = sqlite.prepare("SELECT id, username FROM users").all();
    sqlite.close();
    res.json({ message: "Demo user deleted", remaining: remaining.map((u: Record<string,any>) => u.username) });
  } catch (e: any) {
    res.status(500).json({ error: e.message, stack: e.stack });
  }
});

// Health check
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
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
