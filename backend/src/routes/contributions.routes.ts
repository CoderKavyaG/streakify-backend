import { Router } from "express";
import { getContributions, getTodayStatus, getStreakStats, syncContributions } from "../controllers/contributions.controller";
import { authenticateUser } from "../middleware/auth";

const router = Router();
router.use(authenticateUser);

router.get("/", getContributions);
router.get("/today", getTodayStatus);
router.get("/stats", getStreakStats);
router.post("/sync", syncContributions);

export default router;
