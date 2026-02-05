import cron from 'node-cron';
import { supabaseAdmin } from '../config/supabase';
import { githubService } from '../services/github.service';
import { emailService } from '../services/email.service';
import { telegramService } from '../services/telegram.service';
import { streakService } from '../services/streak.service';

// Track users who were notified (to send "saved" message later)
const notifiedUsersToday = new Map<string, boolean>();

// Run every hour to check users whose check_time matches current hour
export function startNotificationJob() {

  // ============================================
  // JOB 1: Hourly Check - Send friendly reminders
  // ============================================
  cron.schedule('0 * * * *', async () => {
    const currentHour = new Date().toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: false,
      timeZone: 'Asia/Kolkata' 
    }).slice(0, 5);

    console.log(`⏰ [${currentHour}] Running notification check...`);

    try {
      // Get users whose check_time is now
      const { data: users, error } = await supabaseAdmin
        .from('users')
        .select('*')
        .eq('check_time', currentHour);

      if (error) {
        console.error('Error fetching users:', error);
        return;
      }

      if (!users?.length) {
        console.log(`   No users with check_time ${currentHour}`);
        return;
      }

      console.log(`   Found ${users.length} users to check`);

      for (const user of users) {
        try {
          // Check if already contributed today
          const contributed = await githubService.hasContributedToday(
            user.github_username,
            user.github_access_token
          );

          if (!contributed) {
            // Get current streak for the email
            const contributions = await githubService.getContributions(
              user.github_username,
              user.github_access_token
            );
            const stats = streakService.calculateStreakStats(contributions);

            // Send reminders
            if (user.email) {
              await emailService.sendStreakReminder({
                to: user.email,
                username: user.github_username,
                currentStreak: stats.currentStreak,
                type: 'friendly'
              });
              console.log(`   📧 Sent friendly email to ${user.email}`);
            }

            if (user.telegram_chat_id) {
              await telegramService.sendMessage(
                user.telegram_chat_id,
                `⚠️ Hey ${user.github_username}!\n\nYou haven't contributed today yet.\n\n🔥 Current streak: ${stats.currentStreak} days\n\nDon't break it! Make a commit now.`
              );
              console.log(`   📱 Sent Telegram to ${user.github_username}`);
            }

            // Log notification
            await supabaseAdmin.from('notifications_log').insert({
              user_id: user.id,
              type: user.telegram_chat_id ? 'telegram' : 'email',
              date: new Date().toISOString().split('T')[0]
            });

            // Track this user for "saved" email later
            notifiedUsersToday.set(user.id, true);
          }
        } catch (userError) {
          console.error(`   Error processing user ${user.github_username}:`, userError);
        }
      }
    } catch (error) {
      console.error('Hourly check error:', error);
    }
  }, {
    timezone: 'Asia/Kolkata'
  });

  // ============================================
  // JOB 2: Urgent Reminder at 11 PM IST
  // ============================================
  cron.schedule('0 23 * * *', async () => {
    console.log('🚨 [23:00] Running urgent reminder check...');

    try {
      const { data: users, error } = await supabaseAdmin
        .from('users')
        .select('*');

      if (error) {
        console.error('Error fetching users:', error);
        return;
      }

      if (!users?.length) return;

      for (const user of users) {
        try {
          // Check if still hasn't contributed
          const contributed = await githubService.hasContributedToday(
            user.github_username,
            user.github_access_token
          );

          if (!contributed) {
            const contributions = await githubService.getContributions(
              user.github_username,
              user.github_access_token
            );
            const stats = streakService.calculateStreakStats(contributions);

            // Send URGENT reminders
            if (user.email) {
              await emailService.sendStreakReminder({
                to: user.email,
                username: user.github_username,
                currentStreak: stats.currentStreak,
                type: 'urgent'
              });
              console.log(`   🚨 Sent urgent email to ${user.email}`);
            }

            if (user.telegram_chat_id) {
              await telegramService.sendMessage(
                user.telegram_chat_id,
                `🚨 URGENT: Only 1 hour left!\n\n${user.github_username}, your ${stats.currentStreak}-day streak is about to break!\n\nMake a commit NOW! ⏰`
              );
            }
          }
        } catch (userError) {
          console.error(`   Error processing user ${user.github_username}:`, userError);
        }
      }
    } catch (error) {
      console.error('Urgent check error:', error);
    }
  }, {
    timezone: 'Asia/Kolkata'
  });

  // ============================================
  // JOB 3: Midnight Sync - Sync contributions & send "Streak Saved" emails
  // ============================================
  cron.schedule('5 0 * * *', async () => {
    console.log('🌙 [00:05] Running midnight sync...');

    try {
      const { data: users, error } = await supabaseAdmin
        .from('users')
        .select('*');

      if (error) {
        console.error('Error fetching users:', error);
        return;
      }

      if (!users?.length) return;

      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];

      for (const user of users) {
        try {
          // Sync contributions to database
          const contributions = await githubService.getContributions(
            user.github_username,
            user.github_access_token
          );

          // Store/update contributions in database
          for (const day of contributions.slice(-30)) { // Last 30 days
            await supabaseAdmin
              .from('contributions')
              .upsert({
                user_id: user.id,
                date: day.date,
                count: day.contributionCount
              }, {
                onConflict: 'user_id,date'
              });
          }

          // Check if user was notified yesterday and then contributed
          if (notifiedUsersToday.has(user.id)) {
            const yesterdayContribution = contributions.find(c => c.date === yesterdayStr);
            
            if (yesterdayContribution && yesterdayContribution.contributionCount > 0) {
              const stats = streakService.calculateStreakStats(contributions);
              
              // Send "Streak Saved" email
              if (user.email) {
                await emailService.sendStreakReminder({
                  to: user.email,
                  username: user.github_username,
                  currentStreak: stats.currentStreak,
                  type: 'saved'
                });
                console.log(`   ✅ Sent streak saved email to ${user.email}`);
              }

              if (user.telegram_chat_id) {
                await telegramService.sendMessage(
                  user.telegram_chat_id,
                  `🎉 Streak Saved!\n\nGreat job ${user.github_username}! You made it!\n\n🔥 Current streak: ${stats.currentStreak} days\n\nKeep it going! 💪`
                );
              }
            }
          }

          console.log(`   ✓ Synced ${user.github_username}`);
        } catch (userError) {
          console.error(`   Error syncing ${user.github_username}:`, userError);
        }
      }

      // Clear the notified users map for the new day
      notifiedUsersToday.clear();
      console.log('   🗑️ Cleared notification tracking for new day');

    } catch (error) {
      console.error('Midnight sync error:', error);
    }
  }, {
    timezone: 'Asia/Kolkata'
  });

  // ============================================
  // JOB 4: Cleanup expired link codes (daily)
  // ============================================
  cron.schedule('0 3 * * *', async () => {
    console.log('🧹 [03:00] Cleaning up expired link codes...');

    try {
      const { error } = await supabaseAdmin
        .from('telegram_link_codes')
        .delete()
        .lt('expires_at', new Date().toISOString());

      if (error) {
        console.error('Cleanup error:', error);
      } else {
        console.log('   ✓ Expired link codes cleaned up');
      }
    } catch (error) {
      console.error('Cleanup error:', error);
    }
  }, {
    timezone: 'Asia/Kolkata'
  });

  console.log('📅 Notification jobs scheduled:');
  console.log('   ⏰ Hourly check: Every hour at :00');
  console.log('   🚨 Urgent reminder: 11:00 PM IST');
  console.log('   🌙 Midnight sync: 12:05 AM IST');
  console.log('   🧹 Cleanup: 3:00 AM IST');
}