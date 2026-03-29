# Architecture

## Overview

The `queenfi703/github-bootstrap-app-core` system provides a zero-configuration GitHub App bootstrap layer with automatic fallback to `GITHUB_TOKEN` and progressive capability escalation.

## Components

```
queenfi-github-app-core/
├── manifest/app.yml          # GitHub App definition
├── src/
│   ├── githubAppAuth.ts      # Auth fallback logic (crown jewel 👑)
│   ├── getInstallationId.ts  # Auto-healing installation resolver
│   └── octokit.ts            # Unified Octokit export
├── scripts/
│   ├── generateManifestUrl.ts  # Encode manifest → registration URL
│   └── exchangeCodeForToken.ts # Exchange OAuth code → app credentials
└── .github/workflows/
    ├── publish-github-app.yml  # Entry-point bootstrap workflow
    └── reusable-inspector.yml  # Callable workflow for other repos
```

## Auth Escalation

The system resolves authentication in the following priority order:

1. **GITHUB_TOKEN** — Standard Actions token. Available automatically in every workflow run.
2. **Error** — Thrown when no authentication is available, with actionable instructions.

> **Note:** GitHub App auth is not yet implemented. If `GITHUB_APP_ID` and `GITHUB_APP_PRIVATE_KEY` are set, an error is raised directing you to use `GITHUB_TOKEN` instead.

## Installation Resolution

`getInstallationId.ts` queries `GET /repos/{owner}/{repo}/installation` (derived from `GITHUB_REPOSITORY`) to look up the installation for the current repository. This endpoint requires the Octokit client to be authenticated as a GitHub App.

## Reusability

Any repository can consume the reusable inspector workflow:

```yaml
jobs:
  use:
    uses: QueenFi703/queenfi-github-app-core/.github/workflows/reusable-inspector.yml@v0.2.0
```

See `templates/install.yml` for a ready-to-use example.

## Future Expansion

This layer is designed to host the DOT agent system:
- Anomaly detection
- Workflow repair
- Autonomous pull requests
