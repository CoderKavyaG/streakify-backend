import cron from 'node-cron';
import { supabaseAdmin } from '../config/supabase';
import { githubService } from '../services/github.service';
import { emailService } from '../services/email.service';
import { telegramService } from '../services/telegram.service';
import { streakService } from '../services/streak.service';

const notifiedUsersToday = new Map<string, boolean>();

export function startNotificationJob() {
  cron.schedule('0 * * * *', async () => {
    const currentHour = new Date().toLocaleTimeString('en-US', { 
      hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Asia/Kolkata' 
    }).slice(0, 5);

    console.log(`⏰ [${currentHour}] Running notification check...`);

    try {
      const { data: users, error } = await supabaseAdmin.from('users').select('*').eq('check_time', currentHour);
      if (error || !users?.length) return;

      for (const user of users) {
        try {
          const contributed = await githubService.hasContributedToday(user.github_username, user.github_access_token);

          if (!contributed) {
            const contributions = await githubService.getContributions(user.github_username, user.github_access_token);
            const stats = streakService.calculateStreakStats(contributions);

            if (user.email) {
              await emailService.sendStreakReminder({ to: user.email, username: user.github_username, currentStreak: stats.currentStreak, type: 'friendly' });
            }

            if (user.telegram_chat_id) {
              await telegramService.sendMessage(user.telegram_chat_id, `⚠️ Hey ${user.github_username}!\n\nYou haven't contributed today.\n\n🔥 Streak: ${stats.currentStreak} days\n\nMake a commit now!`);
            }

            await supabaseAdmin.from('notifications_log').insert({ user_id: user.id, type: user.telegram_chat_id ? 'telegram' : 'email', date: new Date().toISOString().split('T')[0] });
            notifiedUsersToday.set(user.id, true);
          }
        } catch (e) { console.error(`Error: ${user.github_username}`, e); }
      }
    } catch (e) { console.error('Hourly check error:', e); }
  }, { timezone: 'Asia/Kolkata' });

  cron.schedule('0 23 * * *', async () => {
    console.log('🚨 [23:00] Urgent reminder check...');

    try {
      const { data: users } = await supabaseAdmin.from('users').select('*');
      if (!users?.length) return;

      for (const user of users) {
        try {
          const contributed = await githubService.hasContributedToday(user.github_username, user.github_access_token);

          if (!contributed) {
            const contributions = await githubService.getContributions(user.github_username, user.github_access_token);
            const stats = streakService.calculateStreakStats(contributions);

            if (user.email) {
              await emailService.sendStreakReminder({ to: user.email, username: user.github_username, currentStreak: stats.currentStreak, type: 'urgent' });
            }

            if (user.telegram_chat_id) {
              await telegramService.sendMessage(user.telegram_chat_id, `🚨 URGENT: 1 hour left!\n\n${user.github_username}, your ${stats.currentStreak}-day streak is about to break!\n\nCommit NOW! ⏰`);
            }
          }
        } catch (e) { console.error(`Error: ${user.github_username}`, e); }
      }
    } catch (e) { console.error('Urgent check error:', e); }
  }, { timezone: 'Asia/Kolkata' });

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

          if (notifiedUsersToday.has(user.id)) {
            const yesterdayContribution = contributions.find(c => c.date === yesterdayStr);
            if (yesterdayContribution && yesterdayContribution.contributionCount > 0) {
              const stats = streakService.calculateStreakStats(contributions);

              if (user.email) {
                await emailService.sendStreakReminder({ to: user.email, username: user.github_username, currentStreak: stats.currentStreak, type: 'saved' });
              }

              if (user.telegram_chat_id) {
                await telegramService.sendMessage(user.telegram_chat_id, `🎉 Streak Saved!\n\nGreat job ${user.github_username}!\n\n🔥 Streak: ${stats.currentStreak} days\n\nKeep going! 💪`);
              }
            }
          }
        } catch (e) { console.error(`Sync error: ${user.github_username}`, e); }
      }

      notifiedUsersToday.clear();
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