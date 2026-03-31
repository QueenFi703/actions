// Credits: QueenFi703
import { Octokit } from "@octokit/rest";

export function getOctokit(): Octokit {
  if (process.env.GITHUB_APP_ID && process.env.GITHUB_APP_PRIVATE_KEY) {
    throw new Error(
      "GitHub App auth is not yet implemented. Use GITHUB_TOKEN authentication instead."
    );
  }

  // Use .trim() || to guard against empty-string secrets (GitHub Actions
  // exposes unset secrets as empty strings, making a plain truthiness check
  // or ?? unreliable).
  const token = process.env.GITHUB_TOKEN?.trim();
  if (token) {
    return new Octokit({ auth: token });
  }

  throw new Error(`
No authentication available.

Options:
1. Run publish workflow → generate-registration-url
2. Or rely on GITHUB_TOKEN (auto in Actions)
`);
}
