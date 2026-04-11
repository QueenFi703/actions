# Grafana Alloy – Platform-Wide CI Observability (OTLP Traces, Prometheus Metrics & Loki Logs)

This directory contains the [Grafana Alloy](https://grafana.com/docs/alloy/latest/) configuration and documentation for the autonomous observability system running across all CI workflows in this repository.

## Architecture

```
GitHub Actions runner (ephemeral)
│
├── grafana/alloy:latest  (Docker container, ports 4317/4318/3100)
│     ├── otelcol.receiver.otlp "ci"          ← receives OTLP traces (gRPC 4317, HTTP 4318)
│     ├── otelcol.processor.batch             ← batches spans before exporting
│     ├── otelcol.exporter.otlp "grafana"     → Grafana Cloud OTLP (traces)
│     │
│     ├── prometheus.scrape "alloy_self"       ← scrapes Alloy's own metrics (internal port 12345)
│     ├── prometheus.remote_write "grafana"   → Grafana Cloud Prometheus remote write
│     │
│     ├── loki.source.api "ci"                ← receives log pushes via HTTP (port 3100)
│     └── loki.write "grafana"               → Grafana Cloud Loki push
│
└── CI steps (build, test, deploy, heal…)
      OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318  (auto-set by composite action)
      Loki push endpoint: http://localhost:3100/loki/api/v1/push  (set manually if needed)
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
      grafana-metrics-url: ${{ secrets.GCLOUD_HOSTED_METRICS_URL }}
      grafana-metrics-id: ${{ secrets.GCLOUD_HOSTED_METRICS_ID }}
      grafana-logs-url: ${{ secrets.GCLOUD_HOSTED_LOGS_URL }}
      grafana-logs-id: ${{ secrets.GCLOUD_HOSTED_LOGS_ID }}
      grafana-rw-api-key: ${{ secrets.GCLOUD_RW_API_KEY }}
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
| `GCLOUD_HOSTED_METRICS_URL` | Prometheus remote-write URL, e.g. `https://prometheus-prod-66-prod-us-east-3.grafana.net/api/prom/push` |
| `GCLOUD_HOSTED_METRICS_ID` | Hosted-metrics instance ID (used as the basic-auth username) |
| `GCLOUD_RW_API_KEY` | Grafana Cloud read/write API key (used as the basic-auth password for both Prometheus and Loki) |

### Loki logs

| Secret | Description |
|---|---|
| `GCLOUD_HOSTED_LOGS_URL` | Loki push URL, e.g. `https://logs-prod-042.grafana.net/loki/api/v1/push` |
| `GCLOUD_HOSTED_LOGS_ID` | Hosted-logs instance ID (used as the basic-auth username) |

### Metrics + Logs (Prometheus / Loki)

| Secret | Description |
|---|---|
| `GCLOUD_HOSTED_METRICS_URL` | Grafana Cloud Prometheus remote-write endpoint, e.g. `https://prometheus-prod-66-prod-us-east-3.grafana.net/api/prom/push` |
| `GCLOUD_HOSTED_METRICS_ID` | Grafana Cloud metrics instance ID (numeric) |
| `GCLOUD_HOSTED_LOGS_URL` | Grafana Cloud Loki log push endpoint, e.g. `https://logs-prod-042.grafana.net/loki/api/v1/push` |
| `GCLOUD_HOSTED_LOGS_ID` | Grafana Cloud logs instance ID (numeric) |
| `GCLOUD_RW_API_KEY` | Grafana Cloud read/write API key (do **not** hard-code; always pass as a secret) |

Add these in **Settings → Secrets and variables → Actions**.

---

## `integrations_node_exporter.alloy` — Host Metrics & Logs Integration

`integrations_node_exporter.alloy` adds a **node_exporter + journald** integration that ships host-level metrics to a Prometheus remote-write endpoint and system journal logs to Grafana Cloud Loki.

### What it does

#### Metrics pipeline
1. **`prometheus.exporter.unix`** — runs the built-in node_exporter with a curated set of collectors:
   - Disables: `ipvs`, `btrfs`, `infiniband`, `xfs`, `zfs`
   - Restricts filesystem, netclass, and netdev collection to exclude virtual/container interfaces and transient mounts.
2. **`discovery.relabel`** — stamps every scrape target with `instance = <hostname>` and `job = integrations/node_exporter`.
3. **`prometheus.scrape`** — scrapes the relabeled targets.
4. **`prometheus.relabel`** — keeps only the curated allowlist of node_exporter metric names before forwarding to `prometheus.remote_write.metrics_service`.

#### Logs pipeline
1. **`loki.source.journal`** (inside the `journal_module` declare) — reads the systemd journal (up to 12 h old) and maps journal fields (`__journal__systemd_unit`, `__journal__boot_id`, `__journal__transport`, `__journal_priority_keyword`) to Loki labels (`unit`, `boot_id`, `transport`, `level`).
2. **`loki.relabel "integrations_node_exporter"`** — sets `job = integrations/node_exporter` and `instance = <hostname>` so logs and metrics share the same identity labels.
3. Forwards logs to `loki.write.grafana_cloud_loki`.

### Required components (defined elsewhere)

| Component | Purpose |
|---|---|
| `prometheus.remote_write.metrics_service` | Remote-write destination for metrics |
| `loki.write.grafana_cloud_loki` | Loki write destination for logs |

These must be defined in your main Alloy configuration (e.g. `config.alloy`) before loading this file.

### Usage

Load this file alongside your main Alloy config, or `import.file` / concatenate it into your primary config:

```bash
alloy run monitoring/alloy/config.alloy monitoring/alloy/integrations_node_exporter.alloy
```

Your main `config.alloy` (or equivalent) must define:

```alloy
prometheus.remote_write "metrics_service" {
  endpoint {
    url = env("PROMETHEUS_REMOTE_WRITE_URL")
    basic_auth {
      username = env("PROMETHEUS_USERNAME")
      password = env("PROMETHEUS_PASSWORD")
    }
  }
}

loki.write "grafana_cloud_loki" {
  endpoint {
    url = env("LOKI_URL")
    basic_auth {
      username = env("LOKI_USERNAME")
      password = env("LOKI_PASSWORD")
    }
  }
}
```

Adjust the environment variable names to match your Grafana Cloud stack credentials.

> **Note:** When either secret is absent the Alloy exporter will be misconfigured. Alloy will log a startup error for the exporter component (visible in the "Dump Alloy logs" / teardown step), but the OTLP receiver continues to accept spans and all CI steps continue normally. Check the Alloy container logs if you expect traces in Grafana Cloud but see none.

## Emitting traces from your steps

Set the following environment variables in any step (or rely on the auto-exported values from the composite action):

```yaml
env:
  OTEL_EXPORTER_OTLP_ENDPOINT: http://localhost:4318
  OTEL_SERVICE_NAME: my-service-name
```

## Pushing logs from your steps

Send log entries to Alloy's Loki API on port 3100:

```bash
curl -s -X POST http://localhost:3100/loki/api/v1/push \
  -H 'Content-Type: application/json' \
  -d '{"streams":[{"stream":{"job":"my-job"},"values":[["'"$(date +%s%N)"'","my log line"]]}]}'
```

If your code is not instrumented with OpenTelemetry or does not push logs, Alloy runs and logs normally regardless.

