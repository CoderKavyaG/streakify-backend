import { Router } from "express";
import { getMe, updateSettings, linkTelegram } from "../controllers/user.controller";
import { authenticateUser } from "../middleware/auth";

const router = Router();

// All routes require authentication
router.use(authenticateUser);

// User routes
router.get("/me", getMe);
router.patch("/settings", updateSettings);
router.post("/telegram", linkTelegram);

export default router;
