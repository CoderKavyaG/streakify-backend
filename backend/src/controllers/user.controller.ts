import { Request, Response } from "express";
import { supabaseAdmin } from "../config/supabase";
import { githubService } from "../services/github.service";

// GET /api/user/me - Get current user profile
export const getMe = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const { data: user, error } = await supabaseAdmin
      .from("users")
      .select("id, github_id, github_username, avatar_url, email, telegram_chat_id, check_time, timezone, created_at, updated_at")
      .eq("id", userId)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        res.status(404).json({ error: "User not found" });
        return;
      }
      console.error("Supabase user fetch error:", error);
      res.status(500).json({ error: "Database error", details: error.message });
      return;
    }

    if (!user) {
      // Should not happen with .single() unless table is empty and no error thrown?
      res.status(404).json({ error: "User not found" });
      return;
    }

    // Check if GitHub token is valid (don't expose the token itself)
    const hasGithubToken = !!req.user?.github_access_token;

    res.json({
      user,
      hasGithubToken,
    });
  } catch (error) {
    console.error("Get user error:", error);
    res.status(500).json({ error: "Failed to fetch user" });
  }
};

// PATCH /api/user/settings - Update user settings
export const updateSettings = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    const { check_time, timezone } = req.body;

    if (!userId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const updates: Record<string, string> = {};
    if (check_time) updates.check_time = check_time;
    if (timezone) updates.timezone = timezone;

    if (Object.keys(updates).length === 0) {
      res.status(400).json({ error: "No valid fields to update" });
      return;
    }

    const { data: user, error } = await supabaseAdmin
      .from("users")
      .update(updates)
      .eq("id", userId)
      .select()
      .single();

    if (error) {
      console.error("Supabase update settings error:", error);
      res.status(500).json({ error: "Failed to update settings", details: error.message });
      return;
    }

    res.json({ user });
  } catch (error) {
    console.error("Update settings error:", error);
    res.status(500).json({ error: "Failed to update settings" });
  }
};

// POST /api/user/telegram - Link Telegram chat ID
export const linkTelegram = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    const { telegram_chat_id } = req.body;

    if (!userId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    if (!telegram_chat_id) {
      res.status(400).json({ error: "Telegram chat ID is required" });
      return;
    }

    const { data: user, error } = await supabaseAdmin
      .from("users")
      .update({ telegram_chat_id })
      .eq("id", userId)
      .select()
      .single();

    if (error) {
      res.status(500).json({ error: "Failed to link Telegram" });
      return;
    }

    res.json({ user, message: "Telegram linked successfully" });
  } catch (error) {
    console.error("Link Telegram error:", error);
    res.status(500).json({ error: "Failed to link Telegram" });
  }
};

// GET /api/user/github-status - Check GitHub token status
export const getGithubStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    const githubToken = req.user?.github_access_token;

    if (!userId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    if (!githubToken) {
      res.json({
        hasToken: false,
        isValid: false,
        message: "No GitHub token stored. Please re-authenticate with GitHub.",
      });
      return;
    }

    // Validate the token
    const isValid = await githubService.validateToken(githubToken);

    res.json({
      hasToken: true,
      isValid,
      message: isValid
        ? "GitHub token is valid"
        : "GitHub token has expired. Please re-authenticate with GitHub.",
    });
  } catch (error) {
    console.error("GitHub status error:", error);
    res.status(500).json({ error: "Failed to check GitHub status" });
  }
};

// POST /api/user/github-token - Update GitHub access token
export const updateGithubToken = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    const { github_access_token } = req.body;

    if (!userId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    if (!github_access_token) {
      res.status(400).json({ error: "GitHub access token is required" });
      return;
    }

    // Validate the token before storing
    const isValid = await githubService.validateToken(github_access_token);

    if (!isValid) {
      res.status(400).json({ error: "Invalid GitHub token provided" });
      return;
    }

    const { error } = await supabaseAdmin
      .from("users")
      .update({ github_access_token })
      .eq("id", userId);

    if (error) {
      res.status(500).json({ error: "Failed to update GitHub token" });
      return;
    }

    res.json({ message: "GitHub token updated successfully" });
  } catch (error) {
    console.error("Update GitHub token error:", error);
    res.status(500).json({ error: "Failed to update GitHub token" });
  }
};
