import { Router } from "express";
import { 
  getMe, 
  updateSettings, 
  linkTelegram,
  getGithubStatus,
  updateGithubToken,
} from "../controllers/user.controller";
import { authenticateUser } from "../middleware/auth";
import { 
  validateUserSettings, 
  validateTelegramLink, 
  validateGithubToken 
} from "../middleware/validation";
import { strictRateLimiter } from "../middleware/security";

const router = Router();

// All routes require authentication
router.use(authenticateUser);

// User routes
router.get("/me", getMe);
router.patch("/settings", validateUserSettings, updateSettings);
router.post("/telegram", validateTelegramLink, linkTelegram);

// GitHub token routes (rate limited - sensitive)
router.get("/github-status", getGithubStatus);
router.post("/github-token", strictRateLimiter, validateGithubToken, updateGithubToken);

export default router;
