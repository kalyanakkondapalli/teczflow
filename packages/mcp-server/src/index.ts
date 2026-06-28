#!/usr/bin/env node
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { bootstrapEngine, createMcpServer } from './tool.registry.js';

async function main(): Promise<void> {
  const engine = await bootstrapEngine();
  const server = createMcpServer(engine);
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((err) => {
  console.error('TeczFlow MCP Server failed:', err);
  process.exit(1);
});
