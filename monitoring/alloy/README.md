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
| `.github/actions/alloy` | **Canonical traces action** — starts Alloy container, sleeps 5 s, exports `OTEL_*` env vars |
| `.github/actions/setup-alloy` | Full-featured traces variant — health-check polling instead of sleep |
| `.github/actions/teardown-alloy` | Dumps Alloy container logs and removes the container |
| `.github/actions/setup-alloy-metrics-logs` | Installs Alloy as a **system service** for metrics (Prometheus) and logs (Loki) |
| `.github/actions/teardown-alloy-metrics-logs` | Stops the Alloy system service and dumps its journald logs |

### Usage in any workflow (traces only)

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

### Usage in any workflow (traces + metrics + logs)

```yaml
steps:
  - uses: actions/checkout@v4

  - name: Start Alloy (traces)
    uses: ./.github/actions/setup-alloy
    with:
      grafana-endpoint: ${{ secrets.GRAFANA_CLOUD_OTLP_ENDPOINT }}
      grafana-auth: ${{ secrets.GRAFANA_CLOUD_AUTH }}
      service-name: my-workflow

  - name: Install Alloy (metrics + logs)
    uses: ./.github/actions/setup-alloy-metrics-logs
    with:
      gcloud-hosted-metrics-url: ${{ secrets.GCLOUD_HOSTED_METRICS_URL }}
      gcloud-hosted-metrics-id: ${{ secrets.GCLOUD_HOSTED_METRICS_ID }}
      gcloud-hosted-logs-url: ${{ secrets.GCLOUD_HOSTED_LOGS_URL }}
      gcloud-hosted-logs-id: ${{ secrets.GCLOUD_HOSTED_LOGS_ID }}
      gcloud-rw-api-key: ${{ secrets.GCLOUD_RW_API_KEY }}

  # … your build / test steps …

  - name: Teardown Alloy (traces)
    if: always()
    uses: ./.github/actions/teardown-alloy

  - name: Teardown Alloy (metrics + logs)
    if: always()
    uses: ./.github/actions/teardown-alloy-metrics-logs
```

## Auto-Injection

The workflow `.github/workflows/auto-inject-alloy.yml` triggers on every push that modifies a workflow file. It scans all workflows and **automatically injects** the `Start Alloy` step into any that are not yet instrumented, then commits the change back to the branch.

**Guard logic:** a workflow is considered already instrumented if it contains any of:
- `grafana/alloy`
- `actions/alloy`
- `setup-alloy`
- `teardown-alloy`

The injector skips itself (`auto-inject-alloy.yml`) and reusable/orchestrator workflows that contain no `steps:` block.

## Required GitHub Secrets

### Traces (OTLP)

| Secret | Description |
|---|---|
| `GRAFANA_CLOUD_OTLP_ENDPOINT` | OTLP endpoint for your Grafana Cloud stack, e.g. `https://otlp-gateway-prod-us-central-0.grafana.net/otlp` |
| `GRAFANA_CLOUD_AUTH` | Base64-encoded `<instance-id>:<api-token>` credentials for your Grafana Cloud stack |

### Metrics + Logs (Prometheus / Loki)

| Secret | Description |
|---|---|
| `GCLOUD_HOSTED_METRICS_URL` | Grafana Cloud Prometheus remote-write endpoint, e.g. `https://prometheus-prod-66-prod-us-east-3.grafana.net/api/prom/push` |
| `GCLOUD_HOSTED_METRICS_ID` | Grafana Cloud metrics instance ID (numeric) |
| `GCLOUD_HOSTED_LOGS_URL` | Grafana Cloud Loki log push endpoint, e.g. `https://logs-prod-042.grafana.net/loki/api/v1/push` |
| `GCLOUD_HOSTED_LOGS_ID` | Grafana Cloud logs instance ID (numeric) |
| `GCLOUD_RW_API_KEY` | Grafana Cloud read/write API key (do **not** hard-code; always pass as a secret) |

Add these in **Settings → Secrets and variables → Actions**.

> **Note:** When either secret is absent the Alloy exporter will be misconfigured. Alloy will log a startup error for the exporter component (visible in the "Dump Alloy logs" / teardown step), but the OTLP receiver continues to accept spans and all CI steps continue normally. Check the Alloy container logs if you expect traces in Grafana Cloud but see none.

## Emitting traces from your steps

Set the following environment variables in any step (or rely on the auto-exported values from the composite action):

```yaml
env:
  OTEL_EXPORTER_OTLP_ENDPOINT: http://localhost:4318
  OTEL_SERVICE_NAME: my-service-name
```

If your code is not instrumented with OpenTelemetry, no spans are sent — Alloy runs and logs normally regardless.

