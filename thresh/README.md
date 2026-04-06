# Thresh Agent

[![GitHub Marketplace](https://img.shields.io/badge/Marketplace-Thresh%20Agent-blue?logo=github)](https://github.com/marketplace/actions/thresh-agent)

One brain, many repos, self-healing pipelines.

One brain, many repos, self-healing pipelines.

Thresh is an event-driven GitHub App + modular patch registry that automatically detects and fixes common GitHub Actions problems across every repository it is installed on.

---

## Marketplace usage

Once published, any repo can add Thresh in one step:

```yaml
# .github/workflows/thresh-agent.yml
name: Thresh Agent
on:
  pull_request:
  push:
    branches: [main, master]

jobs:
  thresh:
    runs-on: ubuntu-latest
    permissions:
      contents: write
      pull-requests: write
    steps:
      - uses: actions/checkout@v4
        with:
          token: ${{ secrets.GITHUB_TOKEN }}

      - uses: QueenFi703/actions/thresh@v1
        with:
          github-token: ${{ secrets.GITHUB_TOKEN }}
```

### Inputs

| Input | Default | Description |
|---|---|---|
| `github-token` | `${{ github.token }}` | Token used to push committed fixes |
| `node-version` | `20` | Node.js version for running the agent |
| `commit-fixes` | `true` | Auto-commit patches after applying them |
| `commit-message` | `🛠 Thresh: auto-fix workflow issues` | Commit message for applied patches |

### Outputs

| Output | Description |
|---|---|
| `patches-applied` | Number of patches applied (`0` = already healthy) |

---

## Publishing to the GitHub Marketplace

### From this repository (sub-action, available now)

The action lives at `thresh/action.yml` and is immediately usable as:
```yaml
uses: QueenFi703/actions/thresh@v1
```

### As a dedicated top-level Marketplace listing

For a standalone Marketplace card (users can search "Thresh Agent" directly):

1. Create a **public** repo: `QueenFi703/thresh-agent`
2. Copy the `thresh/` directory contents to the **root** of that repo
3. Push and [create a tagged release](https://docs.github.com/en/repositories/releasing-projects-on-github/managing-releases-in-a-repository) (e.g. `v1.0.0`)
4. On the release page, tick **"Publish this Action to the GitHub Marketplace"**
5. Select a category (e.g. *Utilities*) and confirm

GitHub indexes `action.yml` at the root of a public repo for Marketplace discovery.

---

## System overview

```
thresh/
├── app/                 # GitHub App webhook server (Probot)
├── agent/               # Core decision engine + local CI runner
├── patches/             # Modular patch registry
│   └── github-actions/  # Built-in patches
├── shared/              # Shared types
└── github-app-manifest.json   # One-click GitHub App install manifest
```

---

## Built-in patches

| Patch ID | What it fixes |
|---|---|
| `enforce-linux-runner` | Replaces `windows-latest` runners with `ubuntu-latest` for cost and compatibility |
| `fix-missing-permissions` | Adds a minimal `permissions:` block to workflows that don't have one |

---

## Two modes of operation

### 1. Local CI runner (no deployment needed)

The `.github/workflows/thresh-agent.yml` workflow runs Thresh directly inside GitHub Actions.  It reads workflow files from disk, applies patches, and commits any changes back to the branch.

This is the fastest way to get started — just push the workflow file and Thresh runs automatically on every PR and push.

### 2. Deployed GitHub App (full real-time mode)

Deploy `thresh/app/server.ts` to receive live webhook events from GitHub across all your repositories.

#### Deploy to Railway

1. Push this repo to GitHub.
2. Create a new Railway project linked to the repo.
3. Railway will pick up `thresh/railway.toml` automatically.
4. Set the following environment variables in Railway → Variables:
   - `APP_ID` — your GitHub App's numeric ID
   - `PRIVATE_KEY` — the RSA private key PEM (paste with literal `\n` characters)
   - `WEBHOOK_SECRET` — the secret you set in the GitHub App webhook settings
5. Set your GitHub App's webhook URL to `https://<your-railway-url>/api/github/hooks`.

#### Deploy to Vercel

1. Import the repo in Vercel.
2. Vercel will pick up `thresh/vercel.json` automatically.
3. Set the same environment variables in Vercel → Settings → Environment Variables.

---

## Creating the GitHub App (one-click)

1. Edit `thresh/github-app-manifest.json` — replace `YOUR_DEPLOY_URL` with your deployed server URL.
2. Use [GitHub's App manifest flow](https://docs.github.com/en/apps/sharing-github-apps/registering-a-github-app-from-a-manifest) to create the App from the manifest.
3. Install the App on the repositories you want Thresh to watch.

---

## Adding new patches

1. Create a new file under `thresh/patches/` (mirror the existing structure).
2. Implement the `Patch` interface from `thresh/shared/types.ts`.
3. Register it in `thresh/patches/index.ts`.

```typescript
// thresh/patches/github-actions/my-patch.ts
import type { Patch, RepoAnalysis, PatchResult } from "../../shared/types.js";

export const myPatch: Patch = {
  id: "my-patch",

  detect(analysis: RepoAnalysis): boolean {
    return analysis.workflows.some((wf) => wf.raw.includes("something-bad"));
  },

  apply(_ctx: unknown, analysis: RepoAnalysis): PatchResult | undefined {
    for (const wf of analysis.workflows) {
      if (wf.raw.includes("something-bad")) {
        return {
          path: `.github/workflows/${wf.name}`,
          content: wf.raw.replace("something-bad", "something-good"),
          sha: wf.sha,
          commit: true,
          comment: "✅ Fixed something.",
        };
      }
    }
    return undefined;
  },
};
```

---

## Required secrets

| Secret | Where | Purpose |
|---|---|---|
| `GITHUB_TOKEN` | Auto-injected in Actions | Used by the local CI runner to push commits |
| `APP_ID` | Server env | GitHub App ID |
| `PRIVATE_KEY` | Server env | GitHub App private key |
| `WEBHOOK_SECRET` | Server env | Webhook HMAC secret |

---

## Future evolutions

- 🧠 AI patch ranking — let an LLM score and select the best fix
- 🧩 Remote patch registry — load patches from a central plugin host
- 📊 GitHub Checks API — inline annotations instead of PR comments
- 🔁 PR-based fixes — open a PR instead of pushing directly (safer for main)
- 🛡 Defender / SARIF auto-repair loop
- ☁️ Multi-repo orchestration dashboard
