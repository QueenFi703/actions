// Credits: QueenFi703
import { Octokit } from "@octokit/rest";
import { createSign } from "node:crypto";

/** Validity window for a generated app JWT, in minutes. */
const JWT_EXPIRATION_MINUTES = 9;

/**
 * Create a signed JSON Web Token (JWT) for GitHub App authentication.
 *
 * The token is valid for 9 minutes to give callers a comfortable window
 * before it must be refreshed.  An "iat" backdated by 60 seconds accounts
 * for the most common clock-skew scenarios.
 */
export function createAppJWT(appId: string, privateKeyPem: string): string {
  const now = Math.floor(Date.now() / 1000);

  const header = Buffer.from(
    JSON.stringify({ alg: "RS256", typ: "JWT" })
  ).toString("base64url");

  const payload = Buffer.from(
    JSON.stringify({
      iat: now - 60, // issued-at backdated 60 s for clock-skew tolerance
      exp: now + JWT_EXPIRATION_MINUTES * 60, // expires in 9 minutes
      iss: appId,
    })
  ).toString("base64url");

  const signingInput = `${header}.${payload}`;

  const sign = createSign("RSA-SHA256");
  sign.update(signingInput);
  const signature = sign.sign(privateKeyPem).toString("base64url");

  return `${signingInput}.${signature}`;
}

/**
 * Build an Octokit instance authenticated as the GitHub App itself (app-level JWT).
 *
 * App-level tokens are suitable for reading installation metadata
 * (e.g. `GET /repos/{owner}/{repo}/installation`).  For repo-scoped
 * operations (commits, PRs, etc.), obtain an installation token via
 * `getInstallationTokenOctokit` in `./getInstallationToken.ts`.
 */
function buildAppJwtOctokit(jwt: string): Octokit {
  const octokit = new Octokit();
  // @octokit/rest defaults to "token <auth>" — override to "Bearer <jwt>".
  octokit.hook.wrap("request", async (request, options) => {
    (options.headers as Record<string, string>)["authorization"] = `Bearer ${jwt}`;
    return request(options);
  });
  return octokit;
}

/**
 * Return an Octokit client suitable for GitHub App or GITHUB_TOKEN auth.
 *
 * Auth priority:
 *   1. GitHub App JWT   (GITHUB_APP_ID + GITHUB_APP_PRIVATE_KEY)
 *   2. GITHUB_TOKEN     (auto-injected in Actions)
 *
 * Use .trim() || to guard against empty-string secrets; GitHub Actions
 * exposes unset secrets as empty strings, making nullish coalescing unreliable.
 */
export function getOctokit(): Octokit {
  const appId = process.env.GITHUB_APP_ID?.trim();
  const privateKey = process.env.GITHUB_APP_PRIVATE_KEY?.trim();

  if (appId && privateKey) {
    const jwt = createAppJWT(appId, privateKey);
    return buildAppJwtOctokit(jwt);
  }

  const token = process.env.GITHUB_TOKEN?.trim();
  if (token) {
    return new Octokit({ auth: token });
  }

  throw new Error(`
No authentication available.

Options:
1. Set GITHUB_APP_ID and GITHUB_APP_PRIVATE_KEY for GitHub App auth
2. Or rely on GITHUB_TOKEN (auto in Actions)
`);
}
