# TeczFlow — AI API Intelligence Platform

**By [MyTecz](https://www.npmjs.com/~mytecz)** · Open Source · MCP Compatible · SaaS Ready

[![GitHub](https://img.shields.io/github/stars/kalyanakkondapalli/teczflow?style=social)](https://github.com/kalyanakkondapalli/teczflow)
[![npm cli](https://img.shields.io/npm/v/@mytecz/teczflow-cli?label=cli)](https://www.npmjs.com/package/@mytecz/teczflow-cli)
[![npm mcp](https://img.shields.io/npm/v/@mytecz/teczflow-mcp-server?label=mcp-server)](https://www.npmjs.com/package/@mytecz/teczflow-mcp-server)
[![npm core](https://img.shields.io/npm/v/@mytecz/teczflow-core?label=core)](https://www.npmjs.com/package/@mytecz/teczflow-core)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

| | Links |
|---|---|
| **GitHub** | https://github.com/kalyanakkondapalli/teczflow |
| **npm CLI** | [`@mytecz/teczflow-cli`](https://www.npmjs.com/package/@mytecz/teczflow-cli) |
| **npm MCP** | [`@mytecz/teczflow-mcp-server`](https://www.npmjs.com/package/@mytecz/teczflow-mcp-server) |
| **npm Core** | [`@mytecz/teczflow-core`](https://www.npmjs.com/package/@mytecz/teczflow-core) |

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

---

## npm Packages

TeczFlow is published on npm under the **@mytecz** scope by [MyTecz](https://www.npmjs.com/~mytecz).

| Package | Description | Install |
|---------|-------------|---------|
| [`@mytecz/teczflow-cli`](https://www.npmjs.com/package/@mytecz/teczflow-cli) | Command-line tool (`teczflow`) | `npm install -g @mytecz/teczflow-cli` |
| [`@mytecz/teczflow-mcp-server`](https://www.npmjs.com/package/@mytecz/teczflow-mcp-server) | MCP server for Claude / Cursor (`teczflow-mcp`) | `npm install -g @mytecz/teczflow-mcp-server` |
| [`@mytecz/teczflow-core`](https://www.npmjs.com/package/@mytecz/teczflow-core) | Graph, reasoning, adapters (library) | `npm install @mytecz/teczflow-core` |

Bundled **ShopFlow sample fixtures** ship with `@mytecz/teczflow-core` — no repo clone required for a first run.

---

## Installation

### Option A — npm (recommended)

**CLI + MCP (global):**
```bash
npm install -g @mytecz/teczflow-cli @mytecz/teczflow-mcp-server
```

**CLI only:**
```bash
npm install -g @mytecz/teczflow-cli
```

**Core library (in your project):**
```bash
npm install @mytecz/teczflow-core
```

**Run MCP without global install (npx):**
```bash
npx @mytecz/teczflow-mcp-server
```

### Option B — From source (contributors)

```bash
git clone https://github.com/kalyanakkondapalli/teczflow.git
cd teczflow
npm install
npm run build
npm test
```

See [docs/NPM.md](docs/NPM.md) for publishing and release workflow.

---

## Usage

### CLI (npm global)

After `npm install -g @mytecz/teczflow-cli`:

```bash
# Load your OpenAPI or Postman spec
teczflow load ./path/to/openapi.yaml

# Search APIs with natural language
teczflow query "refund order flow"

# Debug an API error
teczflow debug "POST /payments failed 400"

# Infer a business workflow
teczflow workflow "checkout process"

# View API knowledge graph
teczflow graph "ShopFlow"
```

**Try the bundled sample** (fixtures included in the core package):
```bash
teczflow workflow "checkout"
teczflow debug "POST /payments failed 400"
teczflow query "invoice"
```

**Optional flags:**
```bash
teczflow --config ./config.json --tenant acme workflow "checkout"
```

Full reference: [docs/CLI.md](docs/CLI.md)

### MCP Server (Claude Desktop)

**Recommended — npx (no paths to configure):**

Add to `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "teczflow": {
      "command": "npx",
      "args": ["-y", "@mytecz/teczflow-mcp-server"]
    }
  }
}
```

**Or global install:**

```json
{
  "mcpServers": {
    "teczflow": {
      "command": "teczflow-mcp"
    }
  }
}
```

Restart Claude Desktop, then try:

- *"Use TeczFlow to list all APIs"*
- *"Why is POST /payments returning 400?"*
- *"Show the checkout workflow"*
- *"What breaks if the payment schema changes?"*

Cursor and troubleshooting: [docs/MCP_SETUP.md](docs/MCP_SETUP.md)

### Core library (Node.js / TypeScript)

```typescript
import { TeczFlowEngine } from '@mytecz/teczflow-core';

const engine = new TeczFlowEngine();

await engine.load({
  type: 'file',
  path: './openapi.yaml',
  format: 'openapi'
});

const apis = engine.getServices().discovery.listApis();
const workflow = engine.getServices().workflow.infer('checkout');
const debug = engine.getServices().debug.explain('POST /payments', {}, { status: 400 });

console.log(apis, workflow.conclusion, debug.conclusion);
```

**Environment variable:** set `TECZFLOW_CONFIG` to use a custom `config.json` path.

### CLI from source (repo clone)

```bash
npm run cli -- load fixtures/shopflow.openapi.yaml
npm run cli -- query "refund order flow"
npm run cli -- debug "POST /payments failed 400"
npm run cli -- workflow "checkout process"
npm run cli -- graph "ShopFlow"
```

### MCP from source (repo clone)

Add to `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "teczflow": {
      "command": "node",
      "args": ["ABSOLUTE/PATH/teczflow/packages/mcp-server/dist/index.js"],
      "cwd": "ABSOLUTE/PATH/teczflow"
    }
  }
}
```

Or run locally:

```bash
npm start
```

### Dashboard UI (source only)

```bash
npm run ui:api    # Terminal 1 — API backend
npm run ui:dev    # Terminal 2 — http://localhost:5173
```

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
| [npm Packages](docs/NPM.md) | Install, publish, release workflow |
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
