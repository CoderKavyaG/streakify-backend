import cron from 'node-cron';
import { supabaseAdmin } from '../config/supabase';
import { githubService } from '../services/github.service';
import { emailService } from '../services/email.service';
import { telegramService } from '../services/telegram.service';
import { streakService } from '../services/streak.service';

const notifiedUsersToday = new Map<string, boolean>();
const urgentRemindersToday = new Map<string, boolean>();
const emailSentToday = new Map<string, boolean>();

export function startNotificationJob() {
  // Run every minute to check for specific user times
  cron.schedule('* * * * *', async () => {
    // Get current time in HH:mm format (Asia/Kolkata)
    const now = new Date();
    const currentTime = now.toLocaleTimeString('en-US', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Asia/Kolkata'
    });

    // Handle "24:00" edge case if any, ensuring "HH:mm" format
    const formattedTime = currentTime.length === 5 ? currentTime : `0${currentTime}`;

    try {
      const { data: users, error } = await supabaseAdmin
        .from('users')
        .select('*')
        .eq('check_time', formattedTime); // Match exact HH:mm

      if (error || !users?.length) return;

      console.log(`🔔 Sending reminders to ${users.length} users at ${formattedTime}`);

      for (const user of users) {
        try {
          const timezone = user.timezone || 'Asia/Kolkata';
          const contributed = await githubService.hasContributedToday(
            user.github_username,
            user.github_access_token,
            timezone
          );

          if (!contributed) {
            console.log(`❌ User ${user.github_username} hasn't contributed. Sending reminder.`);
            const contributions = await githubService.getContributions(user.github_username, user.github_access_token);
            const stats = streakService.calculateStreakStats(contributions);

            // Check if email already sent today
            if (user.email && !emailSentToday.has(user.id)) {
              await emailService.sendStreakReminder({
                to: user.email,
                username: user.github_username,
                currentStreak: stats.currentStreak,
                type: 'friendly'
              });
              emailSentToday.set(user.id, true);
            }

            if (user.telegram_chat_id) {
              await telegramService.sendMessage(
                user.telegram_chat_id,
                `⚠️ Hey ${user.github_username}!\n\nYou haven't contributed today.\n\n🔥 Streak: ${stats.currentStreak} days\n\nMake a commit now!`
              );
            }

            await supabaseAdmin.from('notifications_log').insert({
              user_id: user.id,
              type: user.telegram_chat_id ? 'telegram' : 'email',
              date: new Date().toLocaleDateString("en-CA", { timeZone: timezone })
            });

            notifiedUsersToday.set(user.id, true);
          } else {
            console.log(`✅ User ${user.github_username} has already contributed.`);
          }
        } catch (e) { console.error(`Error processing user ${user.github_username}:`, e); }
      }
    } catch (e) { console.error('Notification check error:', e); }
  }, { timezone: 'Asia/Kolkata' });

  // 11 PM Urgent Reminder (Telegram ONLY)
  cron.schedule('0 23 * * *', async () => {
    console.log('🚨 [23:00] Urgent reminder check...');

    try {
      const { data: users } = await supabaseAdmin.from('users').select('*');
      if (!users?.length) return;

      for (const user of users) {
        try {
          const timezone = user.timezone || 'Asia/Kolkata';
          const contributed = await githubService.hasContributedToday(user.github_username, user.github_access_token, timezone);

          if (!contributed) {
            // Only proceed if user has Telegram, as email is disabled for urgent reminder
            if (user.telegram_chat_id) {
              const contributions = await githubService.getContributions(user.github_username, user.github_access_token);
              const stats = streakService.calculateStreakStats(contributions);

              await telegramService.sendMessage(
                user.telegram_chat_id,
                `1 hr to day end! Do commit the stuff ⏰\n\n${user.github_username}, your ${stats.currentStreak}-day streak is about to break!`
              );

              urgentRemindersToday.set(user.id, true);
            }
          }
        } catch (e) { console.error(`Error: ${user.github_username}`, e); }
      }
    } catch (e) { console.error('Urgent check error:', e); }
  }, { timezone: 'Asia/Kolkata' });

  // Midnight Sync & Saved Streak Check
  cron.schedule('5 0 * * *', async () => {
    console.log('🌙 [00:05] Midnight sync...');

    try {
      const { data: users } = await supabaseAdmin.from('users').select('*');
      if (!users?.length) return;

      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];

      for (const user of users) {
        try {
          const contributions = await githubService.getContributions(user.github_username, user.github_access_token);

          for (const day of contributions.slice(-30)) {
            await supabaseAdmin.from('contributions').upsert({ user_id: user.id, date: day.date, count: day.contributionCount }, { onConflict: 'user_id,date' });
          }

          if (urgentRemindersToday.has(user.id)) {
            const yesterdayContribution = contributions.find(c => c.date === yesterdayStr);
            if (yesterdayContribution && yesterdayContribution.contributionCount > 0) {
              const stats = streakService.calculateStreakStats(contributions);

              if (user.email) {
                // This is a new day, so sending email is fine and won't conflict with yesterday's limit
                await emailService.sendStreakReminder({ to: user.email, username: user.github_username, currentStreak: stats.currentStreak, type: 'saved' });
              }

              if (user.telegram_chat_id) {
                await telegramService.sendMessage(user.telegram_chat_id, `🎉 Streak Saved!\n\nGreat job ${user.github_username}!\n\n🔥 Streak: ${stats.currentStreak} days\n\nKeep going! 💪`);
              }

              // Log the streak save
              await supabaseAdmin.from('notifications_log').insert({
                user_id: user.id,
                type: 'streak_saved',
                date: yesterdayStr
              });
            }
          }
        } catch (e) { console.error(`Sync error: ${user.github_username}`, e); }
      }

      notifiedUsersToday.clear();
      urgentRemindersToday.clear();
      emailSentToday.clear();
    } catch (e) { console.error('Midnight sync error:', e); }
  }, { timezone: 'Asia/Kolkata' });

  cron.schedule('0 3 * * *', async () => {
    try {
      await supabaseAdmin.from('telegram_link_codes').delete().lt('expires_at', new Date().toISOString());
      console.log('🧹 Expired link codes cleaned');
    } catch (e) { console.error('Cleanup error:', e); }
  }, { timezone: 'Asia/Kolkata' });

  console.log('📅 Jobs: Hourly | 11PM Urgent | 12:05AM Sync | 3AM Cleanup');
}