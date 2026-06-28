import { readFileSync } from 'node:fs';
import type { AdapterInput, IngestResult, SourceAdapter, TenantContext } from '../types/index.js';
import type { GraphEngine } from '../core/graph.engine.js';

export class GraphqlAdapter implements SourceAdapter {
  name = 'graphql';
  format = 'graphql';

  constructor(private getGraph: (ctx: TenantContext) => GraphEngine) {}

  canHandle(input: AdapterInput): boolean {
    return input.format === 'graphql' || Boolean(input.path?.match(/\.(graphql|gql)$/i));
  }

  async ingest(input: AdapterInput, ctx: TenantContext): Promise<IngestResult> {
    const graph = this.getGraph(ctx);
    const content = input.path ? readFileSync(input.path, 'utf-8') : input.content!;
    const apiId = 'api:graphql:schema';
    let nodesAdded = 0;
    let edgesAdded = 0;

    graph.addNode({
      id: apiId,
      type: 'API',
      label: 'GraphQL Schema',
      properties: { source: 'graphql' }
    });
    nodesAdded++;

    const typeMatches = content.matchAll(/type\s+(\w+)\s*\{([^}]+)\}/g);
    for (const match of typeMatches) {
      const typeName = match[1];
      const schemaId = `schema:graphql:${typeName}`;
      graph.addNode({
        id: schemaId,
        type: 'Schema',
        label: typeName,
        properties: { kind: 'graphql-type', fields: match[2].trim() }
      });
      nodesAdded++;
      graph.addEdge({
        id: `${schemaId}-belongs-${apiId}`,
        source: schemaId,
        target: apiId,
        type: 'belongs_to'
      });
      edgesAdded++;
    }

    const queryMatch = content.match(/type\s+Query\s*\{([^}]+)\}/);
    const mutationMatch = content.match(/type\s+Mutation\s*\{([^}]+)\}/);

    if (queryMatch) {
      for (const field of parseFields(queryMatch[1])) {
        const endpointId = `endpoint:QUERY:${field}`;
        graph.addNode({
          id: endpointId,
          type: 'Endpoint',
          label: `QUERY ${field}`,
          properties: { method: 'QUERY', path: `/${field}`, apiId, tags: ['graphql'] }
        });
        nodesAdded++;
        graph.addEdge({ id: `${endpointId}-${apiId}`, source: endpointId, target: apiId, type: 'belongs_to' });
        edgesAdded++;
      }
    }

    if (mutationMatch) {
      for (const field of parseFields(mutationMatch[1])) {
        const endpointId = `endpoint:MUTATION:${field}`;
        graph.addNode({
          id: endpointId,
          type: 'Endpoint',
          label: `MUTATION ${field}`,
          properties: { method: 'MUTATION', path: `/${field}`, apiId, tags: ['graphql'] }
        });
        nodesAdded++;
        graph.addEdge({ id: `${endpointId}-${apiId}`, source: endpointId, target: apiId, type: 'belongs_to' });
        edgesAdded++;
      }
    }

    graph.rebuildSearchIndex();
    return { nodesAdded, edgesAdded, source: this.name };
  }
}

function parseFields(body: string): string[] {
  return body
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith('#'))
    .map((l) => l.split(/[:(]/)[0].trim())
    .filter(Boolean);
}
