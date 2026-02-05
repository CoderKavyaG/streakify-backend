import express from "express";
import cors from "cors";
import dotenv from "dotenv";

// Load environment variables first
dotenv.config();

// Import routes
import userRoutes from "./routes/user.routes";
import contributionsRoutes from "./routes/contributions.routes";
import telegramRoutes from "./routes/telegram.routes";
import notificationRoutes from "./routes/notification.routes";

// Import middleware
import {
  helmetMiddleware,
  generalRateLimiter,
  hppMiddleware,
  securityHeaders,
  sanitizeRequest,
  logSuspiciousActivity,
} from "./middleware/security";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler";
import { startNotificationJob } from "./jobs/notifications.job";

const app = express();
const PORT = process.env.PORT || 5000;
const isProduction = process.env.NODE_ENV === "production";

// ============================================
// SECURITY MIDDLEWARE (Applied First)
// ============================================

// Helmet - Set security HTTP headers
app.use(helmetMiddleware);

// Trust proxy (needed for rate limiting behind reverse proxy)
if (isProduction) {
  app.set("trust proxy", 1);
}

// Rate limiting
app.use(generalRateLimiter);

// HPP - Prevent HTTP Parameter Pollution
app.use(hppMiddleware);

// Custom security headers
app.use(securityHeaders);

// Log suspicious activity
app.use(logSuspiciousActivity);

// ============================================
// BODY PARSING & CORS
// ============================================

// CORS
app.use(cors({
  origin: isProduction 
    ? process.env.FRONTEND_URL 
    : [process.env.FRONTEND_URL || "http://localhost:3000", "http://localhost:3001"],
  credentials: true,
  methods: ["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
  maxAge: 86400, // 24 hours
}));

// Body parsing with size limits
app.use(express.json({ limit: "10kb" }));
app.use(express.urlencoded({ extended: true, limit: "10kb" }));

// Sanitize request bodies
app.use(sanitizeRequest);

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

// ============================================
// ERROR HANDLING (Applied Last)
// ============================================

// 404 handler for undefined routes
app.use(notFoundHandler);

// Global error handler
app.use(errorHandler);

// ============================================
// START SERVER
// ============================================

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`🔒 Security middleware: enabled`);
  console.log(`🌍 Environment: ${isProduction ? "production" : "development"}`);
  
  // Start cron jobs
  startNotificationJob();
});
