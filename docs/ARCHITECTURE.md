# Architecture

## Packages

| Package | Purpose |
|---------|---------|
| `@teczflow/core` | Graph, reasoning, adapters, services — no MCP dependency |
| `@teczflow/mcp-server` | MCP protocol + tool registry |
| `@teczflow/cli` | Commander CLI |
| `@teczflow/ui` | React dashboard |

## Core Components

### GraphEngine

In-memory directed graph (graphology) with:

- **Nodes:** API, Endpoint, Schema, Service, Auth, Workflow, Tag, Response
- **Edges:** belongs_to, calls, uses_schema, depends_on, triggers, observed_*, tagged_with
- **Search index:** Token + synonym matching

### ReasoningEngine

Deterministic rules with evidence:

- Workflow inference from tags + path heuristics
- Error explanation from HTTP status + schema required fields
- Impact analysis via graph BFS
- Telemetry enrichment

### Adapters

Implement `SourceAdapter`:

```typescript
interface SourceAdapter {
  name: string;
  canHandle(input: AdapterInput): boolean;
  ingest(input: AdapterInput, ctx: TenantContext): Promise<IngestResult>;
}
```

Telemetry adapters implement `TelemetryAdapter` separately.

### TeczFlowEngine

Facade that wires config, graph store, adapters, telemetry, and per-tenant services.

## Data Flow

1. **Ingest** — Adapter parses input → adds nodes/edges to graph
2. **Telemetry** — Providers fetch signals → normalizer → reasoning enriches graph
3. **Query** — Services read graph → reasoning → structured results
4. **Expose** — MCP tools or CLI format results for users/AI

## Extension Points

- New spec adapters: implement `SourceAdapter`, register in engine
- New telemetry: implement `TelemetryAdapter`, register in `TelemetryRegistry`
- Storage: implement `GraphStore` interface
- SaaS: add HTTP transport wrapping same engine

## Testing

Vitest tests in `packages/core/__tests__/`. Run from root:

```bash
npm test
```
