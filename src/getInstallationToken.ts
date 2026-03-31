// Credits: QueenFi703
import { Octokit } from "@octokit/rest";
import { createAppJWT } from "./githubAppAuth.js";

/**
 * Exchange a GitHub App JWT for a short-lived installation access token
 * scoped to the given installation.
 *
 * The access token allows repo-scoped operations (push commits, open PRs,
 * etc.) without requiring a long-lived personal-access token.
 */
export async function getInstallationToken(
  appId: string,
  privateKeyPem: string,
  installationId: number
): Promise<string> {
  const jwt = createAppJWT(appId, privateKeyPem);

  const response = await fetch(
    `https://api.github.com/app/installations/${installationId}/access_tokens`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${jwt}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        "User-Agent": "queenfi-github-app-core/0.2.0",
      },
    }
  );

  if (!response.ok) {
    const body = await response.text();
    throw new Error(
      `Failed to get installation access token: ${response.status} ${response.statusText}: ${body}`
    );
  }

  const data = (await response.json()) as { token: string };
  return data.token;
}

/**
 * Return an Octokit client authenticated with a short-lived installation
 * access token for the given GitHub App installation.
 *
 * This client has the same permissions as the App installation and is
 * suitable for repo-scoped write operations (commits, PRs, etc.).
 */
export async function getInstallationTokenOctokit(
  appId: string,
  privateKeyPem: string,
  installationId: number
): Promise<Octokit> {
  const token = await getInstallationToken(appId, privateKeyPem, installationId);
  return new Octokit({ auth: token });
}
