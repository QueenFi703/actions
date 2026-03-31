// Credits: QueenFi703
import { Octokit } from "@octokit/rest";

/** Narrow an unknown catch value to its HTTP status code, if present. */
function httpStatus(error: unknown): number | undefined {
  if (typeof error === "object" && error !== null && "status" in error) {
    const { status } = error as { status: unknown };
    return typeof status === "number" ? status : undefined;
  }
  return undefined;
}

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
  } catch (error: unknown) {
    const status = httpStatus(error);
    if (status === 401 || status === 403) {
      throw new Error(
        `Unable to resolve GitHub App installation for ${owner}/${repo}. ` +
          "Ensure the GitHub App is installed on this repository and that the provided token has GitHub App permissions."
      );
    }
    throw error;
  }
}
