import { getOctokit } from "../src/githubAppAuth.js";
import { resolveInstallation } from "../src/getInstallationId.js";

const octokit = getOctokit();

const isGitHubAppAuth =
  !!process.env.GITHUB_APP_ID &&
  !!process.env.GITHUB_APP_PRIVATE_KEY;

console.log("Authentication method:", isGitHubAppAuth ? "GitHub App" : "GITHUB_TOKEN");

if (isGitHubAppAuth) {
  const installationId = await resolveInstallation(octokit);
  console.log("Installation ID:", installationId ?? "not found");
}

console.log("Status: OK");
