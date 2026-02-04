// GitHub GraphQL API service for fetching contributions
// Will be implemented in Phase 2

export interface ContributionDay {
  date: string;
  contributionCount: number;
}

export interface ContributionData {
  totalContributions: number;
  weeks: {
    contributionDays: ContributionDay[];
  }[];
}

export class GitHubService {
  // Placeholder - will implement in Phase 2
  async getContributions(username: string): Promise<ContributionDay[]> {
    // TODO: Implement GitHub GraphQL API call
    console.log(`Fetching contributions for ${username}`);
    return [];
  }
}

export const githubService = new GitHubService();
