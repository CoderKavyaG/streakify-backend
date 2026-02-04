import { Router } from "express";
import {
  handleWebhook,
  generateLinkCode,
  setWebhook,
  getWebhookInfo,
} from "../controllers/telegram.controller";
import { authenticateUser } from "../middleware/auth";

const router = Router();

// Public webhook endpoint (Telegram sends here)
router.post("/webhook", handleWebhook);

// Webhook management (for setup)
router.post("/set-webhook", setWebhook);
router.get("/webhook-info", getWebhookInfo);

// Protected route - requires auth
router.get("/link-code", authenticateUser, generateLinkCode);

export default router;
