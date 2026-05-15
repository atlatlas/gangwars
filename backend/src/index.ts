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
import { eq } from "drizzle-orm";

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
