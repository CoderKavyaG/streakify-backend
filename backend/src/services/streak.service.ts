import { ContributionDay } from "./github.service";

export interface StreakStats {
  currentStreak: number;
  longestStreak: number;
  totalThisMonth: number;
  totalThisYear: number;
  savedDays: number; // Days where reminder helped (contribution made after reminder)
}

export class StreakService {
  /**
   * Calculate streak statistics from contribution data
   */
  calculateStreakStats(contributions: ContributionDay[], savedDaysCount: number = 0): StreakStats {
    if (!contributions || contributions.length === 0) {
      return {
        currentStreak: 0,
        longestStreak: 0,
        totalThisMonth: 0,
        totalThisYear: 0,
        savedDays: savedDaysCount,
      };
    }

    // Sort by date descending (most recent first)
    const sorted = [...contributions].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    // Calculate current streak
    let currentStreak = 0;
    let checkDate = today;

    // Check if today has contributions, if not start from yesterday
    const todayStr = today.toISOString().split("T")[0];
    const todayContrib = sorted.find(d => d.date === todayStr);
    
    if (!todayContrib || todayContrib.contributionCount === 0) {
      // No contribution today, check if yesterday had one to continue streak
      const yesterdayStr = yesterday.toISOString().split("T")[0];
      const yesterdayContrib = sorted.find(d => d.date === yesterdayStr);
      
      if (!yesterdayContrib || yesterdayContrib.contributionCount === 0) {
        currentStreak = 0;
      } else {
        checkDate = yesterday;
        currentStreak = this.countConsecutiveDays(sorted, checkDate);
      }
    } else {
      currentStreak = this.countConsecutiveDays(sorted, checkDate);
    }

    // Calculate longest streak
    const longestStreak = this.calculateLongestStreak(sorted);

    // Calculate monthly total
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();
    const totalThisMonth = contributions
      .filter(d => {
        const date = new Date(d.date);
        return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
      })
      .reduce((sum, d) => sum + d.contributionCount, 0);

    // Calculate yearly total
    const totalThisYear = contributions
      .filter(d => new Date(d.date).getFullYear() === currentYear)
      .reduce((sum, d) => sum + d.contributionCount, 0);

    return {
      currentStreak,
      longestStreak,
      totalThisMonth,
      totalThisYear,
      savedDays: savedDaysCount,
    };
  }

  /**
   * Count consecutive days with contributions starting from a date
   */
  private countConsecutiveDays(sortedContributions: ContributionDay[], startDate: Date): number {
    let streak = 0;
    let checkDate = new Date(startDate);

    while (true) {
      const dateStr = checkDate.toISOString().split("T")[0];
      const dayContrib = sortedContributions.find(d => d.date === dateStr);

      if (!dayContrib || dayContrib.contributionCount === 0) {
        break;
      }

      streak++;
      checkDate.setDate(checkDate.getDate() - 1);
    }

    return streak;
  }

  /**
   * Calculate the longest streak in the contribution history
   */
  private calculateLongestStreak(sortedContributions: ContributionDay[]): number {
    // Sort by date ascending for this calculation
    const ascending = [...sortedContributions].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    let longestStreak = 0;
    let currentStreak = 0;
    let prevDate: Date | null = null;

    for (const day of ascending) {
      if (day.contributionCount === 0) {
        currentStreak = 0;
        prevDate = null;
        continue;
      }

      const currentDate = new Date(day.date);

      if (prevDate === null) {
        currentStreak = 1;
      } else {
        const diffDays = Math.round(
          (currentDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24)
        );

        if (diffDays === 1) {
          currentStreak++;
        } else {
          currentStreak = 1;
        }
      }

      longestStreak = Math.max(longestStreak, currentStreak);
      prevDate = currentDate;
    }

    return longestStreak;
  }
}

export const streakService = new StreakService();
