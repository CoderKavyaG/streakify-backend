import { Router } from "express";
import {
  sendTestEmail,
  sendReminder,
  sendTelegramTest,
  getNotificationHistory,
} from "../controllers/notification.controller";
import { authenticateUser } from "../middleware/auth";

const router = Router();

// Public test endpoint (for quick testing without auth)
router.post("/test-email", sendTestEmail);

// Protected routes
router.post("/send-reminder", authenticateUser, sendReminder);
router.post("/send-telegram", authenticateUser, sendTelegramTest);
router.get("/history", authenticateUser, getNotificationHistory);

export default router;
