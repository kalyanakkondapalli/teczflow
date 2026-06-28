# MCP Setup

TeczFlow exposes an MCP server over **stdio** for Claude Desktop, Cursor, and other MCP clients.

## Build First

```bash
npm install
npm run build
```

## Claude Desktop

Edit your Claude Desktop config:

**Windows:** `%APPDATA%\Claude\claude_desktop_config.json`  
**macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "teczflow": {
      "command": "node",
      "args": ["ABSOLUTE/PATH/TO/teczflow/packages/mcp-server/dist/index.js"],
      "cwd": "ABSOLUTE/PATH/TO/teczflow"
    }
  }
}
```

Replace paths with your clone location, e.g.:

- Windows: `C:/Development/teczflow/packages/mcp-server/dist/index.js`
- macOS/Linux: `/home/you/teczflow/packages/mcp-server/dist/index.js`

Restart Claude Desktop after saving.

## Cursor

Add to Cursor MCP settings (`.cursor/mcp.json` or Settings → MCP):

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

## Verify Connection

In Claude, ask:

> "Use list_apis from TeczFlow"

You should see ShopFlow API data (fixtures auto-load on startup).

## Available Tools

| Tool | Example usage |
|------|---------------|
| `list_apis` | "List all APIs" |
| `list_endpoints` | "List endpoints for ShopFlow" |
| `search_apis` | "Search for invoice APIs" |
| `infer_workflow` | "Infer workflow for checkout" |
| `explain_api_error` | "Explain POST /payments 400 with orderId only" |
| `analyze_change` | "Analyze impact of changing POST /payments" |
| `get_api_graph` | "Show graph for ShopFlow" |
| `get_dependencies` | "Dependencies of POST /payments" |
| `list_tenants` | "List tenants" |
| `get_feature_flags` | "Show feature flags" |

## Multi-Tenant

Pass `tenantId` in tool calls when `tenantMode` is enabled:

> "List APIs for tenant acme"

Configure tenants in `config.json` under `tenants`.

## Troubleshooting

- **Server not listed** — Check JSON syntax; use forward slashes in paths on Windows
- **Tools empty** — Run `npm run build`; ensure `cwd` points to repo root (for config.json + fixtures)
- **No API data** — Fixtures load from `fixtures/` relative to `cwd`
