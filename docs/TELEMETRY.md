# Telemetry

TeczFlow enriches the knowledge graph with runtime signals from configurable telemetry providers.

## Why Telemetry?

OpenAPI specs describe intended behavior. Telemetry describes **actual** behavior:

- Error rates and messages from logs
- Call chains from traces
- Latency and SLO metrics

This makes `explain_api_error`, `infer_workflow`, and `analyze_change` more accurate.

## Default: Mock Provider

Out of the box, TeczFlow uses a mock fixture — no external services required.

```json
{
  "telemetry": {
    "enabled": true,
    "providers": [
      {
        "id": "mock-shopflow",
        "type": "mock",
        "enabled": true,
        "fixture": "./fixtures/telemetry/checkout-errors.json"
      }
    ]
  }
}
```

The fixture includes:

- Logs showing `POST /payments` 400 with missing `billingAddress`
- Metrics for 4xx error counts
- Traces showing cart → order → payment chain

## Log File Provider

Enable in `config.json`:

```json
{
  "id": "payment-logs",
  "type": "logfile",
  "enabled": true,
  "path": "./fixtures/logs/payment-access.log",
  "parser": "json"
}
```

Each line should be JSON with fields: `timestamp`, `method`, `path`, `status`, `message`, `service`.

## OTLP Provider

Minimal in-memory OTLP buffer for future push ingest:

```json
{
  "id": "local-otel",
  "type": "otlp",
  "enabled": true,
  "endpoint": "http://localhost:4318"
}
```

Extend via the `OtlpTelemetryAdapter.ingestSignals()` API for custom integrations.

## Graph Enrichment

Telemetry adds edges to the graph:

| Edge Type | Source |
|-----------|--------|
| `observed_error` | Log events with status >= 400 |
| `observed_calls` | Trace spans linked to endpoints |

Reasoning outputs include telemetry evidence:

```json
{
  "type": "telemetry",
  "detail": "missing required field: billingAddress",
  "source": "logs"
}
```

## Future: Cloud Providers

AWS CloudWatch and Azure Monitor are stubbed in config:

```json
{
  "telemetryProviders": {
    "aws-cloudwatch": { "enabled": false },
    "azure-monitor": { "enabled": false }
  }
}
```

Optional adapter packages will be added without changing the core normalizer.

## Disabling Telemetry

Set `telemetry.enabled` to `false` or disable all providers. The graph uses spec-only reasoning.
