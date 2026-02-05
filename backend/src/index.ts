import express from "express";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

import userRoutes from "./routes/user.routes";
import contributionsRoutes from "./routes/contributions.routes";
import telegramRoutes from "./routes/telegram.routes";
import notificationRoutes from "./routes/notification.routes";
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

app.use(helmetMiddleware);
if (isProduction) app.set("trust proxy", 1);
app.use(generalRateLimiter);
app.use(hppMiddleware);
app.use(securityHeaders);
app.use(logSuspiciousActivity);

app.use(cors({
  origin: isProduction 
    ? process.env.FRONTEND_URL 
    : [process.env.FRONTEND_URL || "http://localhost:3000", "http://localhost:3001"],
  credentials: true,
  methods: ["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
  maxAge: 86400,
}));

app.use(express.json({ limit: "10kb" }));
app.use(express.urlencoded({ extended: true, limit: "10kb" }));
app.use(sanitizeRequest);

app.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.get("/api/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString(), version: "1.0.0" });
});

app.use("/api/user", userRoutes);
app.use("/api/contributions", contributionsRoutes);
app.use("/api/telegram", telegramRoutes);
app.use("/api/notifications", notificationRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`🚀 Server: http://localhost:${PORT}`);
  console.log(`🌍 Environment: ${isProduction ? "production" : "development"}`);
  startNotificationJob();
});
