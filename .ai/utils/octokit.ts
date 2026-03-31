import { Octokit } from "@octokit/rest";
import { DOT_OWNER } from "../identity/owner.js";

export function buildOctokit(): Octokit {
  const token = process.env.GH_PAT ?? process.env.GITHUB_TOKEN;
  if (!token) throw new Error("No GitHub token found (GH_PAT or GITHUB_TOKEN).");

  return new Octokit({
    auth: token,
    userAgent: `DOT-Agent/1.0 (${DOT_OWNER.name})`,
  });
}
