import { Router } from "express";
import { handleWebhook, generateLinkCode, setWebhook, getWebhookInfo } from "../controllers/telegram.controller";
import { authenticateUser } from "../middleware/auth";

const router = Router();

router.post("/webhook", handleWebhook);
router.post("/set-webhook", setWebhook);
router.get("/webhook-info", getWebhookInfo);
router.get("/link-code", authenticateUser, generateLinkCode);

export default router;
