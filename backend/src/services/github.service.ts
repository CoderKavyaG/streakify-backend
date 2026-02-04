import dotenv from "dotenv";

dotenv.config();

const GITHUB_GRAPHQL_URL = "https://api.github.com/graphql";
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;

export interface ContributionDay {
  date: string;
  contributionCount: number;
}

export interface ContributionWeek {
  contributionDays: ContributionDay[];
}

export interface ContributionCalendar {
  totalContributions: number;
  weeks: ContributionWeek[];
}

export interface GitHubContributionResponse {
  data: {
    user: {
      contributionsCollection: {
        contributionCalendar: ContributionCalendar;
      };
    } | null;
  };
  errors?: { message: string }[];
}

// GraphQL query to fetch contribution calendar
const CONTRIBUTIONS_QUERY = `
  query($username: String!) {
    user(login: $username) {
      contributionsCollection {
        contributionCalendar {
          totalContributions
          weeks {
            contributionDays {
              date
              contributionCount
            }
          }
        }
      }
    }
  }
`;

export class GitHubService {
  private token: string;

  constructor() {
    if (!GITHUB_TOKEN) {
      console.warn("WARNING: GITHUB_TOKEN is not set in environment variables");
    }
    this.token = GITHUB_TOKEN || "";
  }

  /**
   * Fetch contribution calendar for a GitHub user
   * Returns all contribution days for the past year
   */
  async getContributions(username: string): Promise<ContributionDay[]> {
    try {
      const response = await fetch(GITHUB_GRAPHQL_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.token}`,
        },
        body: JSON.stringify({
          query: CONTRIBUTIONS_QUERY,
          variables: { username },
        }),
      });

      if (!response.ok) {
        throw new Error(`GitHub API error: ${response.status} ${response.statusText}`);
      }

      const data = (await response.json()) as GitHubContributionResponse;

      if (data.errors) {
        throw new Error(`GraphQL errors: ${data.errors.map(e => e.message).join(", ")}`);
      }

      if (!data.data.user) {
        throw new Error(`GitHub user '${username}' not found`);
      }

      // Flatten weeks into a single array of days
      const calendar = data.data.user.contributionsCollection.contributionCalendar;
      const allDays: ContributionDay[] = [];

      for (const week of calendar.weeks) {
        for (const day of week.contributionDays) {
          allDays.push({
            date: day.date,
            contributionCount: day.contributionCount,
          });
        }
      }

      return allDays;
    } catch (error) {
      console.error("Error fetching GitHub contributions:", error);
      throw error;
    }
  }

  /**
   * Get total contributions for the year
   */
  async getTotalContributions(username: string): Promise<number> {
    try {
      const response = await fetch(GITHUB_GRAPHQL_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.token}`,
        },
        body: JSON.stringify({
          query: CONTRIBUTIONS_QUERY,
          variables: { username },
        }),
      });

      const data = (await response.json()) as GitHubContributionResponse;

      if (!data.data.user) {
        return 0;
      }

      return data.data.user.contributionsCollection.contributionCalendar.totalContributions;
    } catch (error) {
      console.error("Error fetching total contributions:", error);
      return 0;
    }
  }

  /**
   * Check if user has contributed today
   */
  async hasContributedToday(username: string): Promise<boolean> {
    const contributions = await this.getContributions(username);
    const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
    
    const todayContribution = contributions.find(day => day.date === today);
    return todayContribution ? todayContribution.contributionCount > 0 : false;
  }
}

export const githubService = new GitHubService();
