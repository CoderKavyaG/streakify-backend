import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import userRoutes from "./routes/user.routes";
import contributionsRoutes from "./routes/contributions.routes";
import telegramRoutes from "./routes/telegram.routes";
import notificationRoutes from "./routes/notification.routes";
import { startNotificationJob } from "./jobs/notifications.job";

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || "http://localhost:3000",
  credentials: true,
}));
app.use(express.json());

// Health check
app.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Test endpoint to verify GitHub API works (remove in production)
app.get("/api/test/github/:username", async (req, res) => {
  try {
    const { githubService } = await import("./services/github.service");
    const contributions = await githubService.getContributions(req.params.username);
    const { streakService } = await import("./services/streak.service");
    const stats = streakService.calculateStreakStats(contributions);
    res.json({
      username: req.params.username,
      totalDays: contributions.length,
      stats,
      recentDays: contributions.slice(-7), // Last 7 days
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// API Routes
app.use("/api/user", userRoutes);
app.use("/api/contributions", contributionsRoutes);
app.use("/api/telegram", telegramRoutes);
app.use("/api/notifications", notificationRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: "Route not found" });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  
  // Start cron jobs
  startNotificationJob();
});
