import { Octokit } from "@octokit/rest";

export function getOctokit(): Octokit {
  if (
    process.env.GITHUB_APP_ID &&
    process.env.GITHUB_APP_PRIVATE_KEY &&
    process.env.GITHUB_APP_INSTALLATION_ID
  ) {
    // TODO: implement app auth
    return new Octokit({ auth: "app" });
  }

  if (process.env.GITHUB_TOKEN) {
    return new Octokit({ auth: process.env.GITHUB_TOKEN });
  }

  throw new Error(`
No authentication available.

Options:
1. Run publish workflow → generate-registration-url
2. Or rely on GITHUB_TOKEN (auto in Actions)
`);
}
