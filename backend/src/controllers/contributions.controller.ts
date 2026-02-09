import { Request, Response } from "express";
import { githubService } from "../services/github.service";
import { streakService } from "../services/streak.service";
import { supabaseAdmin } from "../config/supabase";

// GET /api/contributions - Get user's GitHub contribution heatmap data
export const getContributions = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    const githubUsername = req.user?.github_username;
    const githubToken = req.user?.github_access_token;

    if (!userId || !githubUsername) {
      res.status(401).json({ error: "Unauthorized or GitHub username not found" });
      return;
    }

    // Fetch contributions from GitHub (use user's token for private repo access)
    const contributions = await githubService.getContributions(githubUsername, githubToken);

    // Optionally store today's contribution in database for tracking
    const today = new Date().toISOString().split("T")[0];
    const todayContrib = contributions.find(c => c.date === today);

    if (todayContrib) {
      await supabaseAdmin
        .from("contributions")
        .upsert(
          {
            user_id: userId,
            date: today,
            count: todayContrib.contributionCount,
          },
          { onConflict: "user_id,date" }
        );
    }

    res.json({
      contributions,
      total: contributions.reduce((sum, d) => sum + d.contributionCount, 0),
    });
  } catch (error) {
    console.error("Get contributions error:", error);
    res.status(500).json({ error: "Failed to fetch contributions" });
  }
};

// GET /api/contributions/today - Check if user contributed today
export const getTodayStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const githubUsername = req.user?.github_username;
    const githubToken = req.user?.github_access_token;

    if (!githubUsername) {
      res.status(401).json({ error: "GitHub username not found" });
      return;
    }

    const timezone = req.user?.timezone || "UTC";

    const hasContributed = await githubService.hasContributedToday(githubUsername, githubToken, timezone);
    const today = new Date().toLocaleDateString("en-CA", { timeZone: timezone });

    res.json({
      date: today,
      hasContributed,
    });
  } catch (error) {
    console.error("Get today status error:", error);
    res.status(500).json({ error: "Failed to check today's status" });
  }
};

// GET /api/contributions/stats - Get streak statistics
export const getStreakStats = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    const githubUsername = req.user?.github_username;
    const githubToken = req.user?.github_access_token;

    if (!userId || !githubUsername) {
      res.status(401).json({ error: "Unauthorized or GitHub username not found" });
      return;
    }

    // Fetch contributions from GitHub (use user's token for private repo access)
    const contributions = await githubService.getContributions(githubUsername, githubToken);

    // Get saved days count (days where we sent URGENT reminder and user still contributed)
    const { count: savedDays } = await supabaseAdmin
      .from("notifications_log")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("type", "streak_saved"); // Only count actual saves, not just reminders sent

    // Calculate streak stats
    const stats = streakService.calculateStreakStats(contributions, savedDays || 0);

    res.json(stats);
  } catch (error) {
    console.error("Get streak stats error:", error);
    res.status(500).json({ error: "Failed to calculate streak stats" });
  }
};

// GET /api/contributions/sync - Force sync contributions from GitHub
export const syncContributions = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    const githubUsername = req.user?.github_username;
    const githubToken = req.user?.github_access_token;

    if (!userId || !githubUsername) {
      res.status(401).json({ error: "Unauthorized or GitHub username not found" });
      return;
    }

    // Fetch all contributions from GitHub (use user's token for private repo access)
    const contributions = await githubService.getContributions(githubUsername, githubToken);

    // Store last 30 days in database
    const last30Days = contributions.slice(-30);

    for (const contrib of last30Days) {
      await supabaseAdmin
        .from("contributions")
        .upsert(
          {
            user_id: userId,
            date: contrib.date,
            count: contrib.contributionCount,
          },
          { onConflict: "user_id,date" }
        );
    }

    res.json({
      message: "Contributions synced successfully",
      syncedDays: last30Days.length,
    });
  } catch (error) {
    console.error("Sync contributions error:", error);
    res.status(500).json({ error: "Failed to sync contributions" });
  }
};
