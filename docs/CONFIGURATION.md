# Configuration Reference

TeczFlow is driven by `config.json` at the repository root.

## Full Example

See `config.json.example` in the repo root.

## Top-Level Options

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| `tenantMode` | boolean | `true` | Enable multi-tenant support |
| `defaultTenant` | string | `"default"` | Default tenant ID |
| `features` | object | — | Feature flags |
| `telemetry` | object | — | Telemetry configuration |
| `telemetryProviders` | object | — | Cloud provider stubs |
| `tenants` | object | `{}` | Per-tenant overrides |

## Feature Flags

```json
{
  "features": {
    "openapi": true,
    "postman": true,
    "graphql": true,
    "logs": true,
    "git": true,
    "observability": true,
    "workflow_inference": true,
    "impact_analysis": true,
    "telemetry": true
  }
}
```

When a feature is `false`:

- Related adapters skip loading
- MCP tools gated by that feature are not registered

## Telemetry

```json
{
  "telemetry": {
    "enabled": true,
    "defaultWindow": "24h",
    "providers": [
      {
        "id": "mock-shopflow",
        "type": "mock",
        "enabled": true,
        "fixture": "./fixtures/telemetry/checkout-errors.json"
      },
      {
        "id": "payment-logs",
        "type": "logfile",
        "enabled": false,
        "path": "./fixtures/logs/payment-access.log",
        "parser": "json"
      },
      {
        "id": "local-otel",
        "type": "otlp",
        "enabled": false,
        "endpoint": "http://localhost:4318"
      }
    ]
  }
}
```

### Provider Types

| Type | Description |
|------|-------------|
| `mock` | JSON fixture with logs, metrics, traces |
| `logfile` | Parse JSON lines from a log file |
| `otlp` | In-memory OTLP buffer (extensible) |
| `aws-cloudwatch` | Stub — enable when adapter package available |
| `azure-monitor` | Stub — enable when adapter package available |

## Per-Tenant Overrides

```json
{
  "tenants": {
    "acme": {
      "telemetry": {
        "providers": [
          { "id": "acme-mock", "type": "mock", "enabled": true, "fixture": "./fixtures/acme/telemetry.json" }
        ]
      }
    }
  }
}
```

## Cloud Provider Stubs

```json
{
  "telemetryProviders": {
    "aws-cloudwatch": { "enabled": false },
    "azure-monitor": { "enabled": false }
  }
}
```

These document future integrations without requiring cloud SDKs in the open-source core.

## Environment Variables

Not required for local use. Future SaaS deployments may use:

- `TEczFLOW_CONFIG` — Config file path
- `TEczFLOW_TENANT` — Default tenant override
