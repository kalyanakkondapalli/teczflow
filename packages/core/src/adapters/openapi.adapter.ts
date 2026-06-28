import SwaggerParser from '@apidevtools/swagger-parser';
import YAML from 'yaml';
import type { AdapterInput, IngestResult, SourceAdapter, TenantContext } from '../types/index.js';
import type { GraphEngine } from '../core/graph.engine.js';

export class OpenApiAdapter implements SourceAdapter {
  name = 'openapi';
  format = 'openapi';

  constructor(private getGraph: (ctx: TenantContext) => GraphEngine) {}

  canHandle(input: AdapterInput): boolean {
    if (input.format === 'openapi') return true;
    if (input.format !== undefined) return false;
    const p = input.path?.toLowerCase() ?? '';
    return (
      p.endsWith('.yaml') ||
      p.endsWith('.yml') ||
      p.includes('openapi') ||
      p.includes('swagger')
    );
  }

  async ingest(input: AdapterInput, ctx: TenantContext): Promise<IngestResult> {
    const graph = this.getGraph(ctx);
    let api: OpenApiDocument;

    if (input.path) {
      api = (await SwaggerParser.parse(input.path)) as OpenApiDocument;
    } else {
      const raw = input.content!;
      const doc = raw.trim().startsWith('{') ? JSON.parse(raw) : YAML.parse(raw);
      api = (await SwaggerParser.parse(doc)) as OpenApiDocument;
    }

    const apiId = `api:${api.info?.title ?? 'unknown'}`;
    let nodesAdded = 0;
    let edgesAdded = 0;

    graph.addNode({
      id: apiId,
      type: 'API',
      label: api.info?.title ?? 'API',
      properties: {
        description: api.info?.description,
        version: api.info?.version
      }
    });
    nodesAdded++;

    const authSchemes = Object.keys(api.components?.securitySchemes ?? {});
    for (const scheme of authSchemes) {
      const authId = `auth:${scheme}`;
      graph.addNode({
        id: authId,
        type: 'Auth',
        label: scheme,
        properties: { scheme: api.components!.securitySchemes![scheme] }
      });
      graph.addEdge({ id: `${apiId}-${authId}`, source: apiId, target: authId, type: 'uses_schema' });
      nodesAdded++;
      edgesAdded++;
    }

    for (const [path, methods] of Object.entries(api.paths ?? {})) {
      for (const [method, operation] of Object.entries(methods as Record<string, OpenApiOperation>)) {
        if (['get', 'post', 'put', 'patch', 'delete'].indexOf(method) === -1) continue;
        const op = operation;
        const endpointId = `endpoint:${method.toUpperCase()}:${path}`;
        const tags = op.tags ?? [];
        const requiredFields = extractRequiredFields(op);

        graph.addNode({
          id: endpointId,
          type: 'Endpoint',
          label: `${method.toUpperCase()} ${path}`,
          properties: {
            method: method.toUpperCase(),
            path,
            operationId: op.operationId,
            summary: op.summary ?? op.description,
            tags,
            apiId,
            requiredFields,
            authRequired: Boolean(op.security?.length ?? api.security?.length)
          }
        });
        nodesAdded++;

        graph.addEdge({
          id: `${endpointId}-belongs-${apiId}`,
          source: endpointId,
          target: apiId,
          type: 'belongs_to'
        });
        edgesAdded++;

        for (const tag of tags) {
          const tagId = `tag:${tag}`;
          if (!graph.getNode(tagId)) {
            graph.addNode({ id: tagId, type: 'Tag', label: tag, properties: { name: tag } });
            nodesAdded++;
          }
          graph.addEdge({
            id: `${endpointId}-tag-${tagId}`,
            source: endpointId,
            target: tagId,
            type: 'tagged_with'
          });
          edgesAdded++;
        }

        inferDependencies(graph, endpointId, path, method.toUpperCase());
        edgesAdded++;
      }
    }

    graph.rebuildSearchIndex();
    return { nodesAdded, edgesAdded, source: this.name };
  }
}

interface OpenApiDocument {
  info?: { title?: string; description?: string; version?: string };
  paths?: Record<string, Record<string, OpenApiOperation>>;
  components?: { securitySchemes?: Record<string, unknown> };
  security?: unknown[];
}

interface OpenApiOperation {
  operationId?: string;
  summary?: string;
  description?: string;
  tags?: string[];
  security?: unknown[];
  requestBody?: {
    content?: Record<string, { schema?: { required?: string[]; properties?: Record<string, unknown> } }>;
  };
  parameters?: Array<{ name: string; required?: boolean; in?: string }>;
}

function extractRequiredFields(op: OpenApiOperation): string[] {
  const required: string[] = [];
  const schema = op.requestBody?.content?.['application/json']?.schema;
  if (schema?.required) required.push(...schema.required);
  for (const p of op.parameters ?? []) {
    if (p.required && p.in === 'query') required.push(p.name);
  }
  return required;
}

function inferDependencies(graph: GraphEngine, endpointId: string, path: string, _method: string): void {
  const workflowOrder = ['cart', 'order', 'payment', 'inventory', 'shipping', 'invoice', 'notification'];
  const pathLower = path.toLowerCase();
  const idx = workflowOrder.findIndex((w) => pathLower.includes(w));
  if (idx <= 0) return;

  const endpoints = graph.getNodes('Endpoint');
  for (const ep of endpoints) {
    const epPath = (ep.properties.path as string)?.toLowerCase() ?? '';
    const epIdx = workflowOrder.findIndex((w) => epPath.includes(w));
    if (epIdx >= 0 && epIdx === idx - 1) {
      graph.addEdge({
        id: `${ep.id}-calls-${endpointId}`,
        source: ep.id,
        target: endpointId,
        type: 'calls'
      });
    }
  }
}

export { OpenApiAdapter as default };
