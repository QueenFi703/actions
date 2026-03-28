import { Octokit } from "@octokit/rest";

export async function resolveInstallation(octokit: Octokit): Promise<number | undefined> {
  const installs = await octokit.request("GET /app/installations");

  return installs.data[0]?.id;
}
