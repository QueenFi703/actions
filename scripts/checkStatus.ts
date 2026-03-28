import { getOctokit } from "../src/githubAppAuth.js";
import { resolveInstallation } from "../src/getInstallationId.js";

const octokit = getOctokit();

console.log("Authentication method:", process.env.GITHUB_APP_ID ? "GitHub App" : "GITHUB_TOKEN");

if (process.env.GITHUB_APP_ID) {
  const installationId = await resolveInstallation(octokit);
  console.log("Installation ID:", installationId ?? "not found");
}

console.log("Status: OK");
