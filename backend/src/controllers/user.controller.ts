import { Request, Response } from "express";
import { supabaseAdmin } from "../config/supabase";

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
      .select("*")
      .eq("id", userId)
      .single();

    if (error || !user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    res.json({ user });
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
      res.status(500).json({ error: "Failed to update settings" });
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
