# Grafana Alloy – CI Observability (OTLP Traces)

This directory contains the [Grafana Alloy](https://grafana.com/docs/alloy/latest/) configuration used by the `DOT Observability Layer` workflow to collect and forward OpenTelemetry traces during CI runs.

## How it works

1. The workflow starts a `grafana/alloy:latest` Docker container on each runner (ephemeral).
2. Alloy opens an OTLP receiver on ports **4317** (gRPC) and **4318** (HTTP).
3. Build and test steps can export traces to `http://localhost:4318` (or `grpc://localhost:4317`).
4. Alloy batches and forwards those traces to Grafana Cloud via OTLP.
5. When the job finishes the container is removed — **no state is retained between runs**.

> **Note:** Alloy only forwards traces to Grafana Cloud when both secrets below are present. If either secret is absent, the exporter client will be misconfigured and export will silently fail, but the rest of the workflow (build + tests) will still succeed.

## Required GitHub Secrets

| Secret | Description |
|---|---|
| `GRAFANA_CLOUD_OTLP_ENDPOINT` | OTLP endpoint for your Grafana Cloud stack, e.g. `https://otlp-gateway-prod-us-central-0.grafana.net/otlp` |
| `GRAFANA_CLOUD_AUTH` | Base64-encoded `<instance-id>:<api-token>` credentials for your Grafana Cloud stack |

Add these in **Settings → Secrets and variables → Actions** in this repository.

## Emitting traces from tests

Set the following environment variables in any step that should export telemetry:

```yaml
env:
  OTEL_EXPORTER_OTLP_ENDPOINT: http://localhost:4318
  OTEL_SERVICE_NAME: my-service-name
```

If your test code does not instrument with OpenTelemetry, no spans will be sent — Alloy will still run and log normally.
