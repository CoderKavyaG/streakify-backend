import { Request, Response } from "express";
import { telegramService, TelegramMessage } from "../services/telegram.service";
import { supabaseAdmin } from "../config/supabase";

// POST /api/telegram/webhook - Receive messages from Telegram
export const handleWebhook = async (req: Request, res: Response): Promise<void> => {
  try {
    const update: TelegramMessage = req.body;

    // Always respond 200 to Telegram quickly
    res.status(200).json({ ok: true });

    // Process the message
    if (!update.message || !update.message.text) {
      return;
    }

    const chatId = update.message.chat.id;
    const text = update.message.text.trim();
    const firstName = update.message.from.first_name;

    // Handle /start command with link code
    if (text.startsWith("/start")) {
      const parts = text.split(" ");
      
      if (parts.length === 1) {
        // Just /start without code
        await telegramService.sendMessage(
          chatId,
          `👋 Welcome to <b>Streakify</b>, ${firstName}!\n\n` +
          `To link your account, please use the link code from the website.\n\n` +
          `Send: <code>/start YOUR_CODE</code>`
        );
        return;
      }

      const linkCode = parts[1];
      const userId = telegramService.validateLinkCode(linkCode);

      if (!userId) {
        await telegramService.sendMessage(
          chatId,
          `❌ Invalid or expired link code.\n\n` +
          `Please generate a new code from the Streakify website.`
        );
        return;
      }

      // Save chat_id to user's record
      const { error } = await supabaseAdmin
        .from("users")
        .update({ telegram_chat_id: chatId.toString() })
        .eq("id", userId);

      if (error) {
        console.error("Error linking Telegram:", error);
        await telegramService.sendMessage(
          chatId,
          `❌ Something went wrong. Please try again later.`
        );
        return;
      }

      await telegramService.sendMessage(
        chatId,
        `✅ <b>Successfully linked!</b>\n\n` +
        `You'll now receive streak reminders here, ${firstName}.\n\n` +
        `Keep coding and maintain your streak! 🔥`
      );
      return;
    }

    // Handle /status command
    if (text === "/status") {
      // Check if this chat is linked to any user
      const { data: user } = await supabaseAdmin
        .from("users")
        .select("github_username")
        .eq("telegram_chat_id", chatId.toString())
        .single();

      if (user) {
        await telegramService.sendMessage(
          chatId,
          `✅ Your account is linked!\n\n` +
          `GitHub: <b>${user.github_username}</b>\n\n` +
          `You'll receive reminders if you haven't contributed.`
        );
      } else {
        await telegramService.sendMessage(
          chatId,
          `❌ This chat is not linked to any Streakify account.\n\n` +
          `Use <code>/start YOUR_CODE</code> to link.`
        );
      }
      return;
    }

    // Handle /unlink command
    if (text === "/unlink") {
      const { data: user, error } = await supabaseAdmin
        .from("users")
        .update({ telegram_chat_id: null })
        .eq("telegram_chat_id", chatId.toString())
        .select()
        .single();

      if (error || !user) {
        await telegramService.sendMessage(
          chatId,
          `❌ This chat is not linked to any account.`
        );
        return;
      }

      await telegramService.sendMessage(
        chatId,
        `✅ Account unlinked successfully.\n\n` +
        `You won't receive reminders anymore.`
      );
      return;
    }

    // Handle /help command
    if (text === "/help") {
      await telegramService.sendMessage(
        chatId,
        `🤖 <b>Streakify Bot Commands</b>\n\n` +
        `/start CODE - Link your account\n` +
        `/status - Check link status\n` +
        `/unlink - Unlink your account\n` +
        `/help - Show this message\n\n` +
        `Visit streakify.com to manage your settings.`
      );
      return;
    }

    // Default response for unknown commands
    await telegramService.sendMessage(
      chatId,
      `I don't understand that command.\n\nSend /help to see available commands.`
    );

  } catch (error) {
    console.error("Telegram webhook error:", error);
    // Already sent 200, so just log the error
  }
};

// GET /api/user/telegram/link-code - Generate link code for user
export const generateLinkCode = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const code = telegramService.generateLinkCode(userId);

    res.json({
      code,
      expiresIn: "10 minutes",
      instructions: `Send this message to @streakify_bot on Telegram:\n/start ${code}`,
    });
  } catch (error) {
    console.error("Generate link code error:", error);
    res.status(500).json({ error: "Failed to generate link code" });
  }
};

// POST /api/telegram/set-webhook - Set webhook URL (admin only, for setup)
export const setWebhook = async (req: Request, res: Response): Promise<void> => {
  try {
    const { url } = req.body;

    if (!url) {
      res.status(400).json({ error: "Webhook URL is required" });
      return;
    }

    const success = await telegramService.setWebhook(url);

    if (success) {
      res.json({ message: "Webhook set successfully", url });
    } else {
      res.status(500).json({ error: "Failed to set webhook" });
    }
  } catch (error) {
    console.error("Set webhook error:", error);
    res.status(500).json({ error: "Failed to set webhook" });
  }
};

// GET /api/telegram/webhook-info - Get current webhook info
export const getWebhookInfo = async (req: Request, res: Response): Promise<void> => {
  try {
    const info = await telegramService.getWebhookInfo();
    res.json(info);
  } catch (error) {
    console.error("Get webhook info error:", error);
    res.status(500).json({ error: "Failed to get webhook info" });
  }
};
