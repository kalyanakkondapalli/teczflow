import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { TeczFlowEngine } from '@mytecz/teczflow-core';
import { resolve } from 'node:path';
import { existsSync } from 'node:fs';

export function createMcpServer(engine: TeczFlowEngine): McpServer {
  const server = new McpServer({
    name: 'teczflow',
    version: '1.0.0'
  });

  const config = engine.getConfigManager();
  const features = config.getFeatureFlags();
  server.registerTool(
    'list_apis',
    {
      title: 'List APIs',
      description: 'List all APIs in the TeczFlow knowledge graph for the current tenant.',
      inputSchema: { tenantId: z.string().optional().describe('Tenant ID') }
    },
    async (params) => {
      if (params.tenantId) engine.setActiveTenant(params.tenantId);
      const apis = engine.getServices().discovery.listApis();
      return { content: [{ type: 'text', text: JSON.stringify(apis, null, 2) }] };
    }
  );

  server.registerTool(
    'list_endpoints',
    {
      title: 'List Endpoints',
      description: 'List all endpoints for a given API name or ID.',
      inputSchema: {
        api: z.string().describe('API name or ID'),
        tenantId: z.string().optional().describe('Tenant ID')
      }
    },
    async ({ api, tenantId }) => {
      if (tenantId) engine.setActiveTenant(tenantId);
      const endpoints = engine.getServices().discovery.listEndpoints(api);
      return { content: [{ type: 'text', text: JSON.stringify(endpoints, null, 2) }] };
    }
  );

  server.registerTool(
    'get_api_summary',
    {
      title: 'Get API Summary',
      description: 'Get a summary of an API including endpoint count, tags, and auth schemes.',
      inputSchema: {
        api: z.string().describe('API name or ID'),
        tenantId: z.string().optional()
      }
    },
    async ({ api, tenantId }) => {
      if (tenantId) engine.setActiveTenant(tenantId);
      const summary = engine.getServices().discovery.getApiSummary(api);
      return {
        content: [{ type: 'text', text: JSON.stringify(summary ?? { error: 'API not found' }, null, 2) }]
      };
    }
  );

  server.registerTool(
    'search_apis',
    {
      title: 'Search APIs',
      description: 'Search APIs and endpoints using natural language query (e.g. "refund flow", "invoice APIs").',
      inputSchema: {
        query: z.string().describe('Search query'),
        tenantId: z.string().optional()
      }
    },
    async ({ query, tenantId }) => {
      if (tenantId) engine.setActiveTenant(tenantId);
      const results = engine.getServices().search.search(query);
      return { content: [{ type: 'text', text: JSON.stringify(results, null, 2) }] };
    }
  );

  if (features.workflow_inference) {
    server.registerTool(
      'infer_workflow',
      {
        title: 'Infer Workflow',
        description: 'Infer a business workflow from API endpoints for a given goal (e.g. "checkout process").',
        inputSchema: {
          goal: z.string().describe('Workflow goal'),
          tenantId: z.string().optional()
        }
      },
      async ({ goal, tenantId }) => {
        if (tenantId) engine.setActiveTenant(tenantId);
        const result = engine.getServices().workflow.infer(goal);
        return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
      }
    );
  }

  server.registerTool(
    'explain_api_error',
    {
      title: 'Explain API Error',
      description: 'Explain why an API call failed based on endpoint, request, and response.',
      inputSchema: {
        endpoint: z.string().describe('Endpoint reference e.g. POST /payments'),
        request: z.record(z.unknown()).optional().describe('Request payload'),
        response: z
          .object({ status: z.number(), body: z.unknown().optional() })
          .optional()
          .describe('Response details'),
        tenantId: z.string().optional()
      }
    },
    async ({ endpoint, request, response, tenantId }) => {
      if (tenantId) engine.setActiveTenant(tenantId);
      const result = engine.getServices().debug.explain(endpoint, request ?? {}, response);
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    }
  );

  if (features.impact_analysis) {
    server.registerTool(
      'analyze_change',
      {
        title: 'Analyze Change Impact',
        description: 'Analyze what breaks if an endpoint or schema changes.',
        inputSchema: {
          endpoint: z.string().describe('Endpoint to analyze'),
          tenantId: z.string().optional()
        }
      },
      async ({ endpoint, tenantId }) => {
        if (tenantId) engine.setActiveTenant(tenantId);
        const result = engine.getServices().impact.analyze(endpoint);
        return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
      }
    );
  }

  server.registerTool(
    'get_api_graph',
    {
      title: 'Get API Graph',
      description: 'Get the knowledge graph subgraph for an API.',
      inputSchema: {
        api: z.string().describe('API name or ID'),
        tenantId: z.string().optional()
      }
    },
    async ({ api, tenantId }) => {
      if (tenantId) engine.setActiveTenant(tenantId);
      const graph = engine.getServices().graphService.getApiGraph(api);
      return { content: [{ type: 'text', text: JSON.stringify(graph, null, 2) }] };
    }
  );

  server.registerTool(
    'get_dependencies',
    {
      title: 'Get Dependencies',
      description: 'Get dependencies for an endpoint from the knowledge graph.',
      inputSchema: {
        endpoint: z.string().describe('Endpoint reference'),
        tenantId: z.string().optional()
      }
    },
    async ({ endpoint, tenantId }) => {
      if (tenantId) engine.setActiveTenant(tenantId);
      const deps = engine.getServices().graphService.getDependencies(endpoint);
      return { content: [{ type: 'text', text: JSON.stringify(deps, null, 2) }] };
    }
  );

  if (config.getConfig().tenantMode) {
    server.registerTool(
      'list_tenants',
      {
        title: 'List Tenants',
        description: 'List configured tenants (SaaS admin).',
        inputSchema: {}
      },
      async () => {
        const tenants = engine.listTenants();
        return { content: [{ type: 'text', text: JSON.stringify(tenants, null, 2) }] };
      }
    );
  }

  server.registerTool(
    'get_feature_flags',
    {
      title: 'Get Feature Flags',
      description: 'Get current feature flag configuration.',
      inputSchema: {}
    },
    async () => {
      const flags = engine.getFeatureFlags();
      return { content: [{ type: 'text', text: JSON.stringify(flags, null, 2) }] };
    }
  );

  return server;
}

export async function bootstrapEngine(): Promise<TeczFlowEngine> {
  const engine = new TeczFlowEngine();
  await loadDefaultFixtures(engine);
  await engine.refreshTelemetry();
  return engine;
}

async function loadDefaultFixtures(engine: TeczFlowEngine): Promise<void> {
  const base = engine.getConfigManager().getBaseDir();
  const fixtures = [
    { path: resolve(base, 'fixtures/shopflow.openapi.yaml'), format: 'openapi' as const },
    { path: resolve(base, 'fixtures/shopflow.postman.json'), format: 'postman' as const },
    { path: resolve(base, 'fixtures/telemetry/checkout-errors.json'), format: 'logs' as const },
    { path: resolve(base, 'fixtures/git/payment-schema-change.json'), format: 'git' as const }
  ];

  for (const f of fixtures) {
    if (existsSync(f.path) && engine.getFeatureFlags()[f.format === 'openapi' ? 'openapi' : f.format === 'postman' ? 'postman' : f.format === 'logs' ? 'logs' : 'git']) {
      try {
        await engine.load({ type: 'file', path: f.path, format: f.format });
      } catch {
        // optional fixtures
      }
    }
  }
}
