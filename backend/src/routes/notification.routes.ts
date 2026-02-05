import { Router } from "express";
import { sendTestEmail, sendReminder, sendTelegramTest, getNotificationHistory } from "../controllers/notification.controller";
import { authenticateUser } from "../middleware/auth";
import { validateEmail, validateReminderType } from "../middleware/validation";
import { strictRateLimiter } from "../middleware/security";

const router = Router();

router.post("/test-email", strictRateLimiter, validateEmail, sendTestEmail);
router.post("/send-reminder", authenticateUser, strictRateLimiter, validateReminderType, sendReminder);
router.post("/send-telegram", authenticateUser, strictRateLimiter, sendTelegramTest);
router.get("/history", authenticateUser, getNotificationHistory);

export default router;
