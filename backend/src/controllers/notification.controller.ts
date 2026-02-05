import { Request, Response } from "express";
import { emailService } from "../services/email.service";
import { telegramService } from "../services/telegram.service";
import { supabaseAdmin } from "../config/supabase";
import { githubService } from "../services/github.service";
import { streakService } from "../services/streak.service";

// POST /api/notifications/test-email - Send a test email
export const sendTestEmail = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email } = req.body;

    if (!email) {
      res.status(400).json({ error: "Email address is required" });
      return;
    }

    const success = await emailService.sendTestEmail(email);

    if (success) {
      res.json({ message: "Test email sent successfully", to: email });
    } else {
      res.status(500).json({ error: "Failed to send test email" });
    }
  } catch (error) {
    console.error("Send test email error:", error);
    res.status(500).json({ error: "Failed to send test email" });
  }
};

// POST /api/notifications/send-reminder - Send reminder to a specific user (for testing)
export const sendReminder = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    const { type = "friendly" } = req.body; // "friendly" | "urgent"

    if (!userId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    // Get user data
    const { data: user, error } = await supabaseAdmin
      .from("users")
      .select("*")
      .eq("id", userId)
      .single();

    if (error || !user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    if (!user.email) {
      res.status(400).json({ error: "User has no email address" });
      return;
    }

    // Get current streak
    const contributions = await githubService.getContributions(
      user.github_username,
      user.github_access_token
    );
    const stats = streakService.calculateStreakStats(contributions);

    // Send email
    const emailSent = await emailService.sendStreakReminder({
      to: user.email,
      username: user.github_username,
      currentStreak: stats.currentStreak,
      type: type as "friendly" | "urgent",
    });

    // Log the notification
    if (emailSent) {
      await supabaseAdmin.from("notifications_log").insert({
        user_id: userId,
        type: "email",
        date: new Date().toISOString().split("T")[0],
      });
    }

    res.json({
      success: emailSent,
      message: emailSent ? "Reminder sent successfully" : "Failed to send reminder",
      sentTo: user.email,
      currentStreak: stats.currentStreak,
    });
  } catch (error) {
    console.error("Send reminder error:", error);
    res.status(500).json({ error: "Failed to send reminder" });
  }
};

// POST /api/notifications/send-telegram - Send Telegram message to current user (for testing)
export const sendTelegramTest = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    const { message } = req.body;

    if (!userId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    // Get user data
    const { data: user, error } = await supabaseAdmin
      .from("users")
      .select("telegram_chat_id, github_username")
      .eq("id", userId)
      .single();

    if (error || !user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    if (!user.telegram_chat_id) {
      res.status(400).json({ error: "User has not linked Telegram" });
      return;
    }

    const testMessage = message || `🧪 Test message from Streakify!\n\nHey ${user.github_username}, this is a test notification. If you see this, Telegram is working! ✅`;

    const success = await telegramService.sendMessage(user.telegram_chat_id, testMessage);

    res.json({
      success,
      message: success ? "Telegram message sent" : "Failed to send Telegram message",
    });
  } catch (error) {
    console.error("Send Telegram test error:", error);
    res.status(500).json({ error: "Failed to send Telegram message" });
  }
};

// GET /api/notifications/history - Get user's notification history
export const getNotificationHistory = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const { data: notifications, error } = await supabaseAdmin
      .from("notifications_log")
      .select("*")
      .eq("user_id", userId)
      .order("sent_at", { ascending: false })
      .limit(50);

    if (error) {
      res.status(500).json({ error: "Failed to fetch notification history" });
      return;
    }

    res.json({ notifications });
  } catch (error) {
    console.error("Get notification history error:", error);
    res.status(500).json({ error: "Failed to fetch notification history" });
  }
};
