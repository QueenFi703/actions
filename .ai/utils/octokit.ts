import { Octokit } from "@octokit/rest";
import { DOT_OWNER } from "../identity/owner.js";
import { getOctokit as getGitHubAppOctokit } from "../../src/githubAppAuth.js";
import { getInstallationTokenOctokit } from "../../src/getInstallationToken.js";

/**
 * Resolve the GitHub App installation ID for the given `owner/repo`.
 * Returns `undefined` when the app is not installed or the request fails.
 */
async function resolveInstallationId(
  appOctokit: Octokit,
  owner: string,
  repo: string
): Promise<number | undefined> {
  try {
    const { data } = await appOctokit.request(
      "GET /repos/{owner}/{repo}/installation",
      { owner, repo }
    );
    return data.id;
  } catch {
    return undefined;
  }
}

/**
 * Build an authenticated Octokit instance for DOT operations.
 *
 * Auth priority:
 *   1. GitHub App installation token (GITHUB_APP_ID + GITHUB_APP_PRIVATE_KEY)
 *      – installation is resolved for TARGET_REPO, falling back to GITHUB_REPOSITORY
 *   2. GH_PAT  (cross-repo personal access token)
 *   3. GITHUB_TOKEN (auto-injected in Actions)
 *
 * Uses `.trim() ||` instead of `??` because GitHub Actions may expose unset
 * secrets as empty strings, making nullish coalescing unreliable.
 */
export async function buildOctokit(): Promise<Octokit> {
  const appId = process.env.GITHUB_APP_ID?.trim();
  const privateKey = process.env.GITHUB_APP_PRIVATE_KEY?.trim();

  if (appId && privateKey) {
    const targetRepo =
      process.env.TARGET_REPO?.trim() || process.env.GITHUB_REPOSITORY?.trim();

    if (targetRepo) {
      const parts = targetRepo.split("/");
      const [owner, repo] = parts;
      if (parts.length === 2 && owner && repo) {
        const appOctokit = getGitHubAppOctokit();
        const installationId = await resolveInstallationId(appOctokit, owner, repo);
        if (installationId !== undefined) {
          return getInstallationTokenOctokit(appId, privateKey, installationId);
        }
      }
    }
    // Fall through to token auth if installation could not be resolved.
  }

  const token =
    process.env.GH_PAT?.trim() || process.env.GITHUB_TOKEN?.trim();

  if (!token) {
    throw new Error(
      "No authentication found. Set GITHUB_APP_ID + GITHUB_APP_PRIVATE_KEY, GH_PAT, or GITHUB_TOKEN."
    );
  }

  return new Octokit({
    auth: token,
    userAgent: `DOT-Agent/1.0 (${DOT_OWNER.name})`,
  });
}
