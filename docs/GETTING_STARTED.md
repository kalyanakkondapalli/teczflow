# Getting Started with TeczFlow

This guide walks you from zero to a working TeczFlow setup in under 10 minutes.

## 1. Prerequisites

- **Node.js 20+** — [nodejs.org](https://nodejs.org)
- **npm 10+** (included with Node)

## 2. Install

```bash
git clone https://github.com/mytecz/teczflow.git
cd teczflow
npm install
npm run build
```

Verify tests pass:

```bash
npm test
```

## 3. Configuration

The repo includes a working `config.json`. To customize:

```bash
cp config.json.example config.json
```

Default config enables OpenAPI, Postman, telemetry mock, and all MCP tools.

## 4. Load Sample Data

ShopFlow is a sample e-commerce API domain (cart → payment → inventory → shipping → invoice → notification):

```bash
npm run cli -- load fixtures/shopflow.openapi.yaml
npm run cli -- load fixtures/shopflow.postman.json
```

Or rely on auto-load: the MCP server loads fixtures on startup.

## 5. Try the CLI

```bash
# Search for refund-related APIs
npm run cli -- query "refund"

# Infer checkout workflow
npm run cli -- workflow "checkout process"

# Debug a payment error
npm run cli -- debug "POST /payments failed 400"

# View API graph
npm run cli -- graph "ShopFlow"
```

## 6. Connect to Claude (MCP)

See [MCP_SETUP.md](MCP_SETUP.md) for Claude Desktop and Cursor configuration.

After connecting, try these prompts in Claude:

- "Use TeczFlow to list all APIs"
- "Why is checkout failing on POST /payments?"
- "Show the checkout workflow"
- "What breaks if payment schema changes?"

## 7. Optional Dashboard

```bash
npm run ui:api    # Terminal 1 — backend on :3847
npm run ui:dev    # Terminal 2 — UI on :5173
```

## 8. Enable Telemetry

Default mock telemetry is already enabled. To use log files:

1. Edit `config.json`
2. Set `telemetry.providers` → `payment-logs` → `enabled: true`
3. Restart MCP server or re-run CLI commands

See [TELEMETRY.md](TELEMETRY.md) for OTLP and future cloud providers.

## Troubleshooting

| Issue | Fix |
|-------|-----|
| `No adapter found` | Check file extension; use `teczflow load` with valid OpenAPI/Postman file |
| Empty search results | Load a spec first |
| MCP not connecting | Verify absolute paths in Claude config; run `npm run build` |
| Tests fail | Run from repo root; ensure `config.json` exists |

## Next Steps

- [CLI Reference](CLI.md)
- [Configuration](CONFIGURATION.md)
- [Architecture](ARCHITECTURE.md)
