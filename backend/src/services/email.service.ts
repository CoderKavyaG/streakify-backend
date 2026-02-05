import { Resend } from "resend";
import dotenv from "dotenv";
import {
  friendlyReminderTemplate,
  urgentReminderTemplate,
  streakSavedTemplate,
  StreakReminderData,
} from "../templates/emails/streak-reminder";

dotenv.config();

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FROM_EMAIL = process.env.FROM_EMAIL || "Streakify <onboarding@resend.dev>";

export type ReminderType = "friendly" | "urgent" | "saved";

export interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
}

export interface SendReminderOptions {
  to: string;
  username: string;
  currentStreak: number;
  type: ReminderType;
}

export class EmailService {
  private resend: Resend;
  private fromEmail: string;

  constructor() {
    if (!RESEND_API_KEY) {
      console.warn("WARNING: RESEND_API_KEY is not set in environment variables");
    }
    this.resend = new Resend(RESEND_API_KEY);
    this.fromEmail = FROM_EMAIL;
  }

  /**
   * Send a raw email
   */
  async sendEmail(options: SendEmailOptions): Promise<boolean> {
    try {
      const { data, error } = await this.resend.emails.send({
        from: this.fromEmail,
        to: options.to,
        subject: options.subject,
        html: options.html,
      });

      if (error) {
        console.error("Resend error:", error);
        return false;
      }

      console.log("Email sent successfully:", data?.id);
      return true;
    } catch (error) {
      console.error("Error sending email:", error);
      return false;
    }
  }

  /**
   * Send streak reminder email
   */
  async sendStreakReminder(options: SendReminderOptions): Promise<boolean> {
    const templateData: StreakReminderData = {
      username: options.username,
      currentStreak: options.currentStreak,
      checkTime: new Date().toISOString(),
    };

    let subject: string;
    let html: string;

    switch (options.type) {
      case "friendly":
        subject = `🔥 Hey ${options.username}, don't forget to code today!`;
        html = friendlyReminderTemplate(templateData);
        break;
      case "urgent":
        subject = `⚠️ URGENT: Your ${options.currentStreak}-day streak is about to break!`;
        html = urgentReminderTemplate(templateData);
        break;
      case "saved":
        subject = `🎉 Streak saved! You're now at ${options.currentStreak + 1} days!`;
        html = streakSavedTemplate(templateData);
        break;
      default:
        subject = `Streakify Reminder`;
        html = friendlyReminderTemplate(templateData);
    }

    return this.sendEmail({
      to: options.to,
      subject,
      html,
    });
  }

  /**
   * Send a test email
   */
  async sendTestEmail(to: string): Promise<boolean> {
    return this.sendEmail({
      to,
      subject: "🧪 Streakify Test Email",
      html: `
        <div style="font-family: sans-serif; padding: 20px;">
          <h1>✅ Email is working!</h1>
          <p>If you're seeing this, your Streakify email configuration is set up correctly.</p>
          <p>Sent at: ${new Date().toISOString()}</p>
        </div>
      `,
    });
  }
}

export const emailService = new EmailService();
