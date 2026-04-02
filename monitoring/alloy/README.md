# Grafana Alloy – Platform-Wide CI Observability (OTLP Traces)

This directory contains the [Grafana Alloy](https://grafana.com/docs/alloy/latest/) configuration and documentation for the autonomous observability system running across all CI workflows in this repository.

## Architecture

```
GitHub Actions runner (ephemeral)
│
├── grafana/alloy:latest  (Docker container, ports 4317/4318)
│     ├── otelcol.receiver.otlp "ci"     ← receives traces from build/test steps
│     ├── otelcol.processor.batch        ← batches spans before exporting
│     └── otelcol.exporter.otlp "grafana" → Grafana Cloud (when secrets present)
│
└── CI steps (build, test, deploy, heal…)
      OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318  (auto-set by composite action)
```

Alloy runs **ephemerally** for the duration of each job. No state is retained between runs.

## Composite Actions

| Action | Purpose |
|---|---|
| `.github/actions/alloy` | **Canonical action** — starts Alloy, sleeps 5 s, exports `OTEL_*` env vars |
| `.github/actions/setup-alloy` | Full-featured variant — health-check polling instead of sleep |
| `.github/actions/teardown-alloy` | Dumps Alloy logs and removes the container |

### Usage in any workflow

```yaml
steps:
  - uses: actions/checkout@v4

  - name: Start Alloy
    uses: ./.github/actions/alloy
    with:
      grafana-endpoint: ${{ secrets.GRAFANA_CLOUD_OTLP_ENDPOINT }}
      grafana-auth: ${{ secrets.GRAFANA_CLOUD_AUTH }}
      service-name: my-workflow

  # … your build / test steps …

  - name: Teardown Alloy
    if: always()
    uses: ./.github/actions/teardown-alloy
```

`OTEL_EXPORTER_OTLP_ENDPOINT` and `OTEL_SERVICE_NAME` are automatically exported to `$GITHUB_ENV` by the action, so all subsequent steps inherit them without extra configuration.

## Auto-Injection

The workflow `.github/workflows/auto-inject-alloy.yml` triggers on every push that modifies a workflow file. It scans all workflows and **automatically injects** the `Start Alloy` step into any that are not yet instrumented, then commits the change back to the branch.

**Guard logic:** a workflow is considered already instrumented if it contains any of:
- `grafana/alloy`
- `actions/alloy`
- `setup-alloy`
- `teardown-alloy`

The injector skips itself (`auto-inject-alloy.yml`) and reusable/orchestrator workflows that contain no `steps:` block.

## Required GitHub Secrets

| Secret | Description |
|---|---|
| `GRAFANA_CLOUD_OTLP_ENDPOINT` | OTLP endpoint for your Grafana Cloud stack, e.g. `https://otlp-gateway-prod-us-central-0.grafana.net/otlp` |
| `GRAFANA_CLOUD_AUTH` | Base64-encoded `<instance-id>:<api-token>` credentials for your Grafana Cloud stack |

Add these in **Settings → Secrets and variables → Actions**.

> **Note:** When either secret is absent the Alloy exporter will be misconfigured. Alloy will log a startup error for the exporter component (visible in the "Dump Alloy logs" / teardown step), but the OTLP receiver continues to accept spans and all CI steps continue normally. Check the Alloy container logs if you expect traces in Grafana Cloud but see none.

## Linux Host Installation

Use the official one-line installer to install Grafana Alloy on a Linux host and connect it to your Grafana Cloud stack.

> **⚠️ Security warning:** `GCLOUD_RW_API_KEY` is a sensitive credential.
> **Never commit API keys to version control.** Replace the placeholder below with your own key supplied at runtime via a secrets manager or environment variable — do not hard-code it.
> If a real key has been shared publicly, rotate it immediately in the Grafana Cloud portal.

```sh
GCLOUD_HOSTED_METRICS_ID="3084064" GCLOUD_HOSTED_METRICS_URL="https://prometheus-prod-66-prod-us-east-3.grafana.net/api/prom/push" GCLOUD_HOSTED_LOGS_ID="1537707" GCLOUD_HOSTED_LOGS_URL="https://logs-prod-042.grafana.net/loki/api/v1/push" GCLOUD_FM_URL="https://fleet-management-prod-028.grafana.net" GCLOUD_FM_POLL_FREQUENCY="60s" GCLOUD_FM_HOSTED_ID="1579918" ARCH="amd64" GCLOUD_RW_API_KEY="<YOUR_GCLOUD_RW_API_KEY>" /bin/sh -c "$(curl -fsSL https://storage.googleapis.com/cloud-onboarding/alloy/scripts/install-linux.sh)"
```

### Environment variables

| Variable | Example value | Purpose |
|---|---|---|
| `GCLOUD_HOSTED_METRICS_ID` | `3084064` | Grafana Cloud Prometheus (Mimir) instance ID used to identify the remote write target |
| `GCLOUD_HOSTED_METRICS_URL` | `https://prometheus-prod-66-…/api/prom/push` | Remote write endpoint for Prometheus metrics |
| `GCLOUD_HOSTED_LOGS_ID` | `1537707` | Grafana Cloud Loki instance ID used to identify the log push target |
| `GCLOUD_HOSTED_LOGS_URL` | `https://logs-prod-042.…/loki/api/v1/push` | Push endpoint for Loki logs |
| `GCLOUD_FM_URL` | `https://fleet-management-prod-028.grafana.net` | Fleet Management endpoint used for centralized Alloy configuration |
| `GCLOUD_FM_POLL_FREQUENCY` | `60s` | How often Alloy polls Fleet Management for configuration updates |
| `GCLOUD_FM_HOSTED_ID` | `1579918` | Fleet Management stack ID that identifies this installation |
| `ARCH` | `amd64` | CPU architecture of the target host (`amd64` or `arm64`) |
| `GCLOUD_RW_API_KEY` | `glc_…` | **Sensitive.** Grafana Cloud read/write API key used to authenticate metrics, logs, and fleet management requests |

### Security guidance

- **Do not commit `GCLOUD_RW_API_KEY` (or any API key) to source code or documentation.** Always substitute a real key at runtime — never embed it in files that are committed to version control.
- Store the key in a secrets manager (HashiCorp Vault, AWS Secrets Manager, GCP Secret Manager, etc.) and inject it into the environment at installation time.
- When running this command in a CI/CD pipeline, supply the key via a masked secret variable (e.g. `${{ secrets.GCLOUD_RW_API_KEY }}` in GitHub Actions) rather than embedding it in the workflow file.
- Prefer **short-lived tokens** where your Grafana Cloud plan supports them, and rotate long-lived keys regularly.
- Audit which identities have access to the key and apply the principle of least privilege.

## Emitting traces from your steps

Set the following environment variables in any step (or rely on the auto-exported values from the composite action):

```yaml
env:
  OTEL_EXPORTER_OTLP_ENDPOINT: http://localhost:4318
  OTEL_SERVICE_NAME: my-service-name
```

If your code is not instrumented with OpenTelemetry, no spans are sent — Alloy runs and logs normally regardless.

