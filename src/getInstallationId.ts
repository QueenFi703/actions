import { Octokit } from "@octokit/rest";

export async function resolveInstallation(octokit: Octokit): Promise<number | undefined> {
  const repoEnv = process.env.GITHUB_REPOSITORY;
  if (!repoEnv) {
    throw new Error(
      "GITHUB_REPOSITORY environment variable is not set; cannot resolve installation for current repository."
    );
  }

  const [owner, repo] = repoEnv.split("/");
  if (!owner || !repo) {
    throw new Error(
      `GITHUB_REPOSITORY environment variable is malformed ("${repoEnv}"); expected "owner/repo".`
    );
  }

  try {
    const installation = await octokit.request("GET /repos/{owner}/{repo}/installation", {
      owner,
      repo,
    });

    return installation.data.id;
  } catch (error: any) {
    const status = error?.status;
    if (status === 401 || status === 403) {
      throw new Error(
        `Unable to resolve GitHub App installation for ${owner}/${repo}. ` +
          "Ensure the GitHub App is installed on this repository and that the provided token has GitHub App permissions."
      );
    }
    throw error;
  }
}
