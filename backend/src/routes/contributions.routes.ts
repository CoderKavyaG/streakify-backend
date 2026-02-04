import { Router } from "express";
import {
  getContributions,
  getTodayStatus,
  getStreakStats,
  syncContributions,
} from "../controllers/contributions.controller";
import { authenticateUser } from "../middleware/auth";

const router = Router();

// All routes require authentication
router.use(authenticateUser);

// Contribution routes
router.get("/", getContributions);           // GET /api/contributions
router.get("/today", getTodayStatus);        // GET /api/contributions/today
router.get("/stats", getStreakStats);        // GET /api/contributions/stats
router.post("/sync", syncContributions);     // POST /api/contributions/sync

export default router;
