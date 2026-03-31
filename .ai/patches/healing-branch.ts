import { buildOctokit } from "../utils/octokit.js";

export async function createOrUpdateHealingBranch(params: {
  owner: string;
  repo: string;
  branchName: string;
  sha: string; // commit SHA to point the branch at
}) {
  const { owner, repo, branchName, sha } = params;
  const octokit = buildOctokit();

  const ref = `refs/heads/${branchName}`;

  try {
    await octokit.git.createRef({ owner, repo, ref, sha });
  } catch (err: unknown) {
    // 422 typically means ref already exists
    if ((err as { status?: number })?.status === 422) {
      await octokit.git.updateRef({
        owner,
        repo,
        ref: `heads/${branchName}`,
        sha,
        force: true,
      });
    } else {
      throw err;
    }
  }

  return branchName;
}
