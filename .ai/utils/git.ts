import { Octokit } from "@octokit/rest";

/**
 * Build an authenticated Octokit instance from the GH_PAT or GITHUB_TOKEN
 * environment variables.
 */
export function buildOctokit(): Octokit {
  const token = process.env.GH_PAT ?? process.env.GITHUB_TOKEN;
  if (!token) {
    throw new Error(
      "No GitHub token found. Set GH_PAT (for cross-repo access) or GITHUB_TOKEN."
    );
  }
  return new Octokit({ auth: token });
}

/**
 * Parse a "owner/repo" string into its constituent parts.
 * Throws when the format is invalid.
 */
export function parseRepo(ownerRepo: string): { owner: string; repo: string } {
  const parts = ownerRepo.split("/");
  if (parts.length !== 2 || !parts[0] || !parts[1]) {
    throw new Error(
      `Invalid repository format "${ownerRepo}". Expected "owner/repo".`
    );
  }
  return { owner: parts[0], repo: parts[1] };
}

/**
 * Return the base branch of a repository (defaults to "main" when unset).
 */
export async function defaultBranch(
  octokit: Octokit,
  owner: string,
  repo: string
): Promise<string> {
  const { data } = await octokit.repos.get({ owner, repo });
  return data.default_branch ?? "main";
}
