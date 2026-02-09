import dotenv from "dotenv";

dotenv.config();

const TELEGRAM_API_URL = "https://api.telegram.org/bot";
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

export interface TelegramMessage {
  update_id: number;
  message?: {
    message_id: number;
    from: {
      id: number;
      first_name: string;
      username?: string;
    };
    chat: {
      id: number;
      type: string;
    };
    text?: string;
    date: number;
  };
}

export interface SendMessageResponse {
  ok: boolean;
  result?: {
    message_id: number;
    chat: { id: number };
    text: string;
  };
  description?: string;
}

export class TelegramService {
  private token: string;
  private apiUrl: string;
  public botUsername: string = "streakify_bot"; // Default fallback

  // In-memory store for link codes (userId -> code)
  private linkCodes: Map<string, { code: string; expiresAt: number }> = new Map();
  // Reverse map (code -> userId)
  private codeToUser: Map<string, string> = new Map();

  constructor() {
    if (!TELEGRAM_BOT_TOKEN) {
      console.warn("WARNING: TELEGRAM_BOT_TOKEN is not set in environment variables");
    }
    this.token = TELEGRAM_BOT_TOKEN || "";
    this.apiUrl = `${TELEGRAM_API_URL}${this.token}`;

    // Fetch bot username on startup
    this.fetchBotUsername();
  }

  private async fetchBotUsername() {
    try {
      const response = await fetch(`${this.apiUrl}/getMe`);
      const data = await response.json() as { ok: boolean; result: { username: string } };
      if (data.ok && data.result?.username) {
        this.botUsername = data.result.username;
        console.log(`🤖 Bot username fetched: @${this.botUsername}`);
      }
    } catch (error) {
      console.error("Failed to fetch bot username:", error);
    }
  }

  /**
   * Send a message to a Telegram chat
   */
  async sendMessage(chatId: string | number, text: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.apiUrl}/sendMessage`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          chat_id: chatId,
          text: text,
          parse_mode: "HTML",
        }),
      });

      const data = (await response.json()) as SendMessageResponse;

      if (!data.ok) {
        console.error("Telegram API error:", data.description);
        return false;
      }

      return true;
    } catch (error) {
      console.error("Error sending Telegram message:", error);
      return false;
    }
  }

  /**
   * Generate a unique link code for a user
   */
  generateLinkCode(userId: string): string {
    // Remove existing code for this user if any
    const existing = this.linkCodes.get(userId);
    if (existing) {
      this.codeToUser.delete(existing.code);
    }

    // Generate random 6-character code
    const code = Math.random().toString(36).substring(2, 8).toUpperCase();

    // Store with 10-minute expiration
    const expiresAt = Date.now() + 10 * 60 * 1000;
    this.linkCodes.set(userId, { code, expiresAt });
    this.codeToUser.set(code, userId);

    return code;
  }

  /**
   * Validate a link code and return the associated userId
   */
  validateLinkCode(code: string): string | null {
    const userId = this.codeToUser.get(code.toUpperCase());

    if (!userId) {
      return null;
    }

    const linkData = this.linkCodes.get(userId);

    if (!linkData || Date.now() > linkData.expiresAt) {
      // Code expired, clean up
      this.codeToUser.delete(code.toUpperCase());
      if (userId) this.linkCodes.delete(userId);
      return null;
    }

    // Code is valid, clean up after use
    this.codeToUser.delete(code.toUpperCase());
    this.linkCodes.delete(userId);

    return userId;
  }

  /**
   * Set webhook URL for Telegram bot
   */
  async setWebhook(webhookUrl: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.apiUrl}/setWebhook`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          url: webhookUrl,
        }),
      });

      const data = (await response.json()) as { ok: boolean; description?: string };

      if (!data.ok) {
        console.error("Failed to set webhook:", data.description);
        return false;
      }

      console.log("Telegram webhook set successfully:", webhookUrl);
      return true;
    } catch (error) {
      console.error("Error setting webhook:", error);
      return false;
    }
  }

  /**
   * Delete webhook (for local development)
   */
  async deleteWebhook(): Promise<boolean> {
    try {
      const response = await fetch(`${this.apiUrl}/deleteWebhook`, {
        method: "POST",
      });

      const data = (await response.json()) as { ok: boolean };
      return data.ok;
    } catch (error) {
      console.error("Error deleting webhook:", error);
      return false;
    }
  }

  /**
   * Get webhook info
   */
  async getWebhookInfo(): Promise<any> {
    try {
      const response = await fetch(`${this.apiUrl}/getWebhookInfo`);
      return await response.json();
    } catch (error) {
      console.error("Error getting webhook info:", error);
      return null;
    }
  }
}

export const telegramService = new TelegramService();
