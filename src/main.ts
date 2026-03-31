// Credits: QueenFi703
import * as core from "@actions/core";
import { Octokit } from "@octokit/rest";
import { createAppJWT } from "./githubAppAuth.js";
import { resolveInstallation } from "./getInstallationId.js";
import { getInstallationToken } from "./getInstallationToken.js";

async function main(): Promise<void> {
  const appId =
    core.getInput("app-id").trim() || process.env.GITHUB_APP_ID?.trim();
  const privateKey =
    core.getInput("private-key").trim() ||
    process.env.GITHUB_APP_PRIVATE_KEY?.trim();

  if (appId && privateKey) {
    // Mask the private key immediately so it never appears in logs.
    // Credits: QueenFi703
    core.setSecret(privateKey);
    core.info("Authenticating as GitHub App");

    const jwt = createAppJWT(appId, privateKey);
    const octokit = new Octokit();
    octokit.hook.wrap("request", async (request, options) => {
      (options.headers as Record<string, string>)[
        "authorization"
      ] = `Bearer ${jwt}`;
      return request(options);
    });

    const installationId = await resolveInstallation(octokit);
    if (!installationId) {
      core.setFailed(
        "Could not find a GitHub App installation for this repository"
      );
      return;
    }

    const token = await getInstallationToken(appId, privateKey, installationId);
    core.setSecret(token);
    core.setOutput("token", token);
    core.info("Successfully obtained GitHub App installation access token");
  } else {
    const token = process.env.GITHUB_TOKEN ?? "";
    if (!token) {
      core.warning(
        "No GitHub App credentials or GITHUB_TOKEN found; outputting empty token"
      );
    }
    core.setOutput("token", token);
    core.info("Using GITHUB_TOKEN (no GitHub App credentials configured)");
  }
}

main().catch((err: unknown) => {
  core.setFailed(err instanceof Error ? err.message : String(err));
});
