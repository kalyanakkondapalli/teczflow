# CLI Reference

The TeczFlow CLI provides command-line access to the same intelligence engine as the MCP server.

## Global Options

```bash
teczflow [options] <command>
```

| Option | Description |
|--------|-------------|
| `-c, --config <path>` | Path to config.json |
| `-t, --tenant <id>` | Tenant ID |
| `-V, --version` | Show version |
| `-h, --help` | Show help |

Run via npm from repo root:

```bash
npm run cli -- <command> [args]
```

## Commands

### load

Load an API spec or fixture into the knowledge graph.

```bash
teczflow load <spec>
```

**Examples:**

```bash
teczflow load fixtures/shopflow.openapi.yaml
teczflow load fixtures/shopflow.postman.json
teczflow load fixtures/telemetry/checkout-errors.json
teczflow load fixtures/git/payment-schema-change.json
```

Supported formats (auto-detected): OpenAPI, Postman, GraphQL, logs, git.

### query

Search APIs using natural language.

```bash
teczflow query "<text>"
```

**Examples:**

```bash
teczflow query "refund order flow"
teczflow query "invoice APIs"
teczflow query "customer creation"
```

### debug

Explain an API error.

```bash
teczflow debug "<description>"
```

**Examples:**

```bash
teczflow debug "POST /order failed 400"
teczflow debug "POST /payments failed 401"
teczflow debug "GET /orders/123 failed 404"
```

Output includes conclusion, confidence, evidence, and suggested next steps.

### workflow

Infer a business workflow.

```bash
teczflow workflow "<goal>"
```

**Examples:**

```bash
teczflow workflow "checkout process"
teczflow workflow "refund flow"
teczflow workflow "order fulfillment"
```

### graph

Show API graph for a service or API name.

```bash
teczflow graph "<name>"
```

**Examples:**

```bash
teczflow graph "ShopFlow"
teczflow graph "payment"
```

## Exit Codes

- `0` — Success
- `1` — Error (file not found, load failure)
