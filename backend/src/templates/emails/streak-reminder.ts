// Email Templates for Streakify
// Using HTML strings for now, can be upgraded to React Email later

export interface StreakReminderData {
  username: string;
  currentStreak: number;
  checkTime: string;
}

/**
 * Friendly reminder email - sent first
 */
export const friendlyReminderTemplate = (data: StreakReminderData): string => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Streak Reminder</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0d1117; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #0d1117; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #161b22; border-radius: 12px; border: 1px solid #30363d;">
          <!-- Header -->
          <tr>
            <td style="padding: 40px 40px 20px 40px; text-align: center;">
              <h1 style="color: #58a6ff; margin: 0; font-size: 28px;">🔥 Streakify</h1>
            </td>
          </tr>
          
          <!-- Main Content -->
          <tr>
            <td style="padding: 20px 40px;">
              <h2 style="color: #f0f6fc; margin: 0 0 20px 0; font-size: 24px;">
                Hey ${data.username}! 👋
              </h2>
              <p style="color: #8b949e; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                Just a friendly reminder — we haven't seen any GitHub contributions from you today yet.
              </p>
              <p style="color: #8b949e; font-size: 16px; line-height: 1.6; margin: 0 0 30px 0;">
                Your current streak is <strong style="color: #f0f6fc;">${data.currentStreak} days</strong>. 
                Don't let it break! Even a small commit counts. 💪
              </p>
            </td>
          </tr>
          
          <!-- Streak Display -->
          <tr>
            <td style="padding: 0 40px 30px 40px;">
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #21262d; border-radius: 8px; border: 1px solid #30363d;">
                <tr>
                  <td style="padding: 25px; text-align: center;">
                    <p style="color: #8b949e; margin: 0 0 10px 0; font-size: 14px; text-transform: uppercase; letter-spacing: 1px;">Current Streak</p>
                    <p style="color: #f78166; margin: 0; font-size: 48px; font-weight: bold;">
                      ${data.currentStreak} 🔥
                    </p>
                    <p style="color: #8b949e; margin: 10px 0 0 0; font-size: 14px;">consecutive days</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- CTA Button -->
          <tr>
            <td style="padding: 0 40px 30px 40px; text-align: center;">
              <a href="https://github.com" style="display: inline-block; background-color: #238636; color: #ffffff; text-decoration: none; padding: 14px 30px; border-radius: 6px; font-size: 16px; font-weight: 600;">
                Open GitHub →
              </a>
            </td>
          </tr>
          
          <!-- Tips -->
          <tr>
            <td style="padding: 0 40px 30px 40px;">
              <p style="color: #8b949e; font-size: 14px; line-height: 1.6; margin: 0;">
                <strong style="color: #f0f6fc;">Quick ideas:</strong><br>
                • Fix a small bug 🐛<br>
                • Update documentation 📝<br>
                • Review a pull request 👀<br>
                • Commit that WIP code 🚧
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 30px 40px; border-top: 1px solid #30363d; text-align: center;">
              <p style="color: #484f58; font-size: 12px; margin: 0;">
                You're receiving this because you signed up for Streakify reminders.<br>
                <a href="#" style="color: #58a6ff; text-decoration: none;">Manage notification settings</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;

/**
 * Urgent warning email - sent if still no contribution
 */
export const urgentReminderTemplate = (data: StreakReminderData): string => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>⚠️ Streak Warning</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0d1117; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #0d1117; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #161b22; border-radius: 12px; border: 2px solid #f85149;">
          <!-- Header -->
          <tr>
            <td style="padding: 40px 40px 20px 40px; text-align: center; background-color: #3d1418; border-radius: 10px 10px 0 0;">
              <h1 style="color: #f85149; margin: 0; font-size: 28px;">⚠️ STREAK ALERT</h1>
            </td>
          </tr>
          
          <!-- Main Content -->
          <tr>
            <td style="padding: 30px 40px;">
              <h2 style="color: #f0f6fc; margin: 0 0 20px 0; font-size: 24px;">
                ${data.username}, your streak is in danger! 😰
              </h2>
              <p style="color: #f85149; font-size: 18px; line-height: 1.6; margin: 0 0 20px 0; font-weight: 600;">
                Time is running out! You haven't contributed to GitHub today.
              </p>
              <p style="color: #8b949e; font-size: 16px; line-height: 1.6; margin: 0 0 30px 0;">
                Your <strong style="color: #f0f6fc;">${data.currentStreak}-day streak</strong> will reset to zero at midnight 
                if you don't make a contribution. All that hard work — gone! 💔
              </p>
            </td>
          </tr>
          
          <!-- Streak Display -->
          <tr>
            <td style="padding: 0 40px 30px 40px;">
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #3d1418; border-radius: 8px; border: 1px solid #f85149;">
                <tr>
                  <td style="padding: 25px; text-align: center;">
                    <p style="color: #f85149; margin: 0 0 10px 0; font-size: 14px; text-transform: uppercase; letter-spacing: 1px;">At Risk</p>
                    <p style="color: #f85149; margin: 0; font-size: 48px; font-weight: bold;">
                      ${data.currentStreak} 💀
                    </p>
                    <p style="color: #f0f6fc; margin: 10px 0 0 0; font-size: 14px;">days about to be lost</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- CTA Button -->
          <tr>
            <td style="padding: 0 40px 30px 40px; text-align: center;">
              <a href="https://github.com" style="display: inline-block; background-color: #f85149; color: #ffffff; text-decoration: none; padding: 16px 40px; border-radius: 6px; font-size: 18px; font-weight: 700; text-transform: uppercase;">
                🚨 Save Your Streak NOW
              </a>
            </td>
          </tr>
          
          <!-- Countdown -->
          <tr>
            <td style="padding: 0 40px 30px 40px; text-align: center;">
              <p style="color: #8b949e; font-size: 14px; margin: 0;">
                ⏰ Make any commit, push, PR, or issue before midnight!
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 30px 40px; border-top: 1px solid #30363d; text-align: center;">
              <p style="color: #484f58; font-size: 12px; margin: 0;">
                This is an urgent reminder from Streakify.<br>
                <a href="#" style="color: #58a6ff; text-decoration: none;">Manage notification settings</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;

/**
 * Streak saved celebration email
 */
export const streakSavedTemplate = (data: StreakReminderData): string => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Streak Saved!</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0d1117; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #0d1117; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #161b22; border-radius: 12px; border: 2px solid #238636;">
          <!-- Header -->
          <tr>
            <td style="padding: 40px 40px 20px 40px; text-align: center; background-color: #0f2d1a; border-radius: 10px 10px 0 0;">
              <h1 style="color: #3fb950; margin: 0; font-size: 48px;">🎉</h1>
              <h2 style="color: #3fb950; margin: 10px 0 0 0; font-size: 28px;">STREAK SAVED!</h2>
            </td>
          </tr>
          
          <!-- Main Content -->
          <tr>
            <td style="padding: 30px 40px; text-align: center;">
              <h2 style="color: #f0f6fc; margin: 0 0 20px 0; font-size: 24px;">
                Way to go, ${data.username}! 🚀
              </h2>
              <p style="color: #8b949e; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                You made it! Your contribution was recorded and your streak lives on.
              </p>
            </td>
          </tr>
          
          <!-- Streak Display -->
          <tr>
            <td style="padding: 0 40px 30px 40px;">
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #0f2d1a; border-radius: 8px; border: 1px solid #238636;">
                <tr>
                  <td style="padding: 25px; text-align: center;">
                    <p style="color: #3fb950; margin: 0 0 10px 0; font-size: 14px; text-transform: uppercase; letter-spacing: 1px;">Current Streak</p>
                    <p style="color: #3fb950; margin: 0; font-size: 48px; font-weight: bold;">
                      ${data.currentStreak + 1} 🔥
                    </p>
                    <p style="color: #8b949e; margin: 10px 0 0 0; font-size: 14px;">and counting!</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 30px 40px; border-top: 1px solid #30363d; text-align: center;">
              <p style="color: #8b949e; font-size: 14px; margin: 0;">
                Keep up the great work! See you tomorrow. 💪
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;
