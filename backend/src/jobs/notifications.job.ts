import cron from 'node-cron';
import { supabase } from '../config/supabase';
import { githubService } from '../services/github.service';
import { emailService } from '../services/email.service';
import { telegramService } from '../services/telegram.service';

// Run every hour to check users whose check_time matches current hour
export function startNotificationJob() {
  // Runs at minute 0 of every hour
  cron.schedule('0 * * * *', async () => {
    console.log('⏰ Running notification check...');
    
    const now = new Date();
    const currentHour = now.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: false,
      timeZone: 'Asia/Kolkata' 
    }); // "18:00"

    // Get users whose check_time is now
    const { data: users } = await supabase
      .from('users')
      .select('*')
      .eq('check_time', currentHour.slice(0, 5)); // Compare "18:00"

    if (!users?.length) return;

    for (const user of users) {
      // Check if already contributed today
      const contributed = await githubService.hasContributedToday(
        user.github_username,
        user.github_access_token
      );

      if (!contributed) {
        // Send reminders
        if (user.email) {
          await emailService.sendStreakReminder({
            to: user.email,
            username: user.github_username,
            currentStreak: 0, // Will be calculated
            type: 'friendly'
          });
        }
        if (user.telegram_chat_id) {
          await telegramService.sendMessage(
            user.telegram_chat_id,
            `⚠️ Hey ${user.github_username}! You haven't contributed today. Don't break your streak!`
          );
        }

        // Log notification
        await supabase.from('notifications_log').insert({
          user_id: user.id,
          type: user.telegram_chat_id ? 'telegram' : 'email',
          date: new Date().toISOString().split('T')[0]
        });
      }
    }
  }, {
    timezone: 'Asia/Kolkata'
  });

  // Urgent reminder at 11 PM IST for users who still haven't contributed
  cron.schedule('0 23 * * *', async () => {
    console.log('🚨 Running urgent reminder check (11 PM)...');

    const { data: users } = await supabase
      .from('users')
      .select('*');

    if (!users?.length) return;

    const today = new Date().toISOString().split('T')[0];

    for (const user of users) {
      // Check if we already sent a notification today
      const { data: existingNotification } = await supabase
        .from('notifications_log')
        .select('id')
        .eq('user_id', user.id)
        .eq('date', today)
        .single();

      // Check if still hasn't contributed
      const contributed = await githubService.hasContributedToday(
        user.github_username,
        user.github_access_token
      );

      if (!contributed) {
        // Send URGENT reminders
        if (user.email) {
          await emailService.sendStreakReminder({
            to: user.email,
            username: user.github_username,
            currentStreak: 0,
            type: 'urgent'
          });
        }
        if (user.telegram_chat_id) {
          await telegramService.sendMessage(
            user.telegram_chat_id,
            `🚨 URGENT: Only 1 hour left! ${user.github_username}, make a commit NOW or lose your streak!`
          );
        }
      }
    }
  }, {
    timezone: 'Asia/Kolkata'
  });

  console.log('📅 Notification jobs scheduled');
  console.log('   - Hourly check: Every hour at :00');
  console.log('   - Urgent reminder: 11:00 PM IST');
}