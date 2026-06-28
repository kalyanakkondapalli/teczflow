# TeczFlow — AI API Intelligence Platform

**By [MyTecz](https://github.com/mytecz)** · Open Source · MCP Compatible · SaaS Ready

TeczFlow turns any API ecosystem into a **reasoning engine** for Claude and other MCP clients. It does not just call APIs — it **understands** them.

---

## The Problem

Modern systems expose dozens or hundreds of APIs across OpenAPI specs, Postman collections, microservices, and observability tools. When something breaks — checkout fails, a refund returns 400, a schema change breaks clients — developers manually trace:

- API documentation
- Request/response schemas
- Logs and metrics
- Git history
- Service dependencies

This is slow, error-prone, and impossible for AI assistants without structured context.

---

## The Solution

TeczFlow ingests API specs and operational signals into a **knowledge graph**, runs **deterministic reasoning**, and exposes **MCP tools** so Claude can:

- Discover and search APIs
- Infer business workflows
- Explain API errors with evidence
- Analyze change impact
- Traverse dependency graphs

---

## Features

- **MCP Server** — Claude-compatible, JSON-schema validated tools
- **Knowledge Graph** — APIs, endpoints, schemas, services, auth, workflows
- **Reasoning Engine** — Workflow inference, error explanation, impact analysis
- **Adapters** — OpenAPI, Postman, GraphQL (basic), logs, git, observability mocks
- **Configurable Telemetry** — Mock (default), log file, OTLP ingest; AWS/Azure stubs for later
- **CLI** — Load specs, query, debug, workflow, graph
- **Multi-tenancy** — Tenant-scoped graphs, feature flags, SaaS-ready config
- **Dashboard UI** — API list, search, workflow viewer, graph preview
- **Unit Tests** — Vitest suite with fixtures

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     MCP Clients (Claude, Cursor)                 │
└─────────────────────────────┬───────────────────────────────────┘
                              │ stdio MCP
┌─────────────────────────────▼───────────────────────────────────┐
│                      TeczFlow MCP Server                         │
│  list_apis · search_apis · infer_workflow · explain_api_error   │
│  analyze_change · get_api_graph · get_dependencies · ...       │
└─────────────────────────────┬───────────────────────────────────┘
                              │
┌─────────────────────────────▼───────────────────────────────────┐
│                       TeczFlow Core                              │
│  ┌──────────────┐  ┌─────────────────┐  ┌───────────────────┐   │
│  │ Graph Engine │  │ Reasoning Engine│  │ Telemetry Norm.   │   │
│  └──────────────┘  └─────────────────┘  └───────────────────┘   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ Services: Discovery · Search · Workflow · Debug · Impact │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────┬───────────────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        ▼                     ▼                     ▼
  ┌───────────┐        ┌────────────┐        ┌─────────────┐
  │  OpenAPI  │        │  Postman   │        │  Telemetry  │
  │  Adapter  │        │  Adapter   │        │ mock/log/   │
  └───────────┘        └────────────┘        │    OTLP     │
        │                     │              └─────────────┘
        └─────────────────────┴─────────────────────┘
                              │
                    ┌─────────▼─────────┐
                    │  Knowledge Graph   │
                    │  (in-memory store) │
                    └───────────────────┘
```

---

## MCP Tools

| Tool | Description |
|------|-------------|
| `list_apis` | List all APIs in the graph |
| `list_endpoints` | List endpoints for an API |
| `get_api_summary` | Summary with tags, auth, endpoint count |
| `search_apis` | Natural language search |
| `infer_workflow` | Infer business workflow for a goal |
| `explain_api_error` | Explain 400/401/500 errors with evidence |
| `analyze_change` | Impact analysis for endpoint changes |
| `get_api_graph` | Export API subgraph |
| `get_dependencies` | Dependency traversal |
| `list_tenants` | List configured tenants |
| `get_feature_flags` | Current feature configuration |

---

## Example Prompts (Claude)

- *"Why is checkout failing?"*
- *"Show me the invoice workflow"*
- *"What breaks if the payment schema changes?"*
- *"Explain the refund process"*
- *"What APIs handle customer creation?"*
- *"What depends on the payment service?"*

---

## Quick Start

### Prerequisites

- Node.js 20+

### Installation

```bash
git clone https://github.com/mytecz/teczflow.git
cd teczflow
npm install
npm run build
npm test
```

### CLI Usage

```bash
# Load a spec
npm run cli -- load fixtures/shopflow.openapi.yaml

# Search APIs
npm run cli -- query "refund order flow"

# Debug an error
npm run cli -- debug "POST /payments failed 400"

# Infer workflow
npm run cli -- workflow "checkout process"

# View graph
npm run cli -- graph "ShopFlow"
```

### MCP Server (Claude Desktop)

Add to `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "teczflow": {
      "command": "node",
      "args": ["C:/Development/teczflow/packages/mcp-server/dist/index.js"],
      "cwd": "C:/Development/teczflow"
    }
  }
}
```

Start the server:

```bash
npm start
```

See [docs/MCP_SETUP.md](docs/MCP_SETUP.md) for Cursor and troubleshooting.

### Dashboard UI

```bash
# Terminal 1 — API backend
npm run ui:api

# Terminal 2 — React dashboard
npm run ui:dev
```

Open http://localhost:5173

---

## Configuration

Copy `config.json.example` to `config.json`. Key options:

```json
{
  "tenantMode": true,
  "features": {
    "openapi": true,
    "telemetry": true,
    "workflow_inference": true
  },
  "telemetry": {
    "enabled": true,
    "providers": [
      { "id": "mock-shopflow", "type": "mock", "enabled": true, "fixture": "./fixtures/telemetry/checkout-errors.json" }
    ]
  }
}
```

See [docs/CONFIGURATION.md](docs/CONFIGURATION.md) and [docs/TELEMETRY.md](docs/TELEMETRY.md).

---

## Documentation

| Guide | Description |
|-------|-------------|
| [Getting Started](docs/GETTING_STARTED.md) | Step-by-step setup |
| [MCP Setup](docs/MCP_SETUP.md) | Claude Desktop & Cursor |
| [CLI Reference](docs/CLI.md) | All CLI commands |
| [Configuration](docs/CONFIGURATION.md) | config.json reference |
| [Telemetry](docs/TELEMETRY.md) | Mock, logfile, OTLP |
| [Architecture](docs/ARCHITECTURE.md) | For contributors |

---

## SaaS Vision

TeczFlow is designed for self-hosted open source **and** future MyTecz Cloud:

- **Multi-tenancy** — `tenantId` on all operations
- **Feature flags** — Enable/disable capabilities per deployment
- **Stateless MCP** — Tenant from tool params or headers
- **Pluggable storage** — In-memory today; Redis/Postgres later
- **Optional cloud telemetry** — AWS CloudWatch & Azure Monitor stubs in config

---

## Roadmap

- [ ] Persistent graph storage (Redis, Postgres)
- [ ] AWS CloudWatch telemetry adapter
- [ ] Azure Monitor / App Insights adapter
- [ ] Streamable HTTP MCP transport for hosted SaaS
- [ ] Embedding-based semantic search
- [ ] Webhook & SDK consumer modeling in impact analysis
- [ ] MyTecz Cloud hosted MCP

---

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). PRs welcome — especially new telemetry adapters.

---

## License

MIT — see [LICENSE](LICENSE)

---

<p align="center"><strong>TeczFlow</strong> — Turn your API ecosystem into a reasoning engine for Claude.</p>
