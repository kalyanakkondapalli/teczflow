import { readFileSync } from 'node:fs';
import type { AdapterInput, IngestResult, SourceAdapter, TenantContext } from '../types/index.js';
import type { GraphEngine } from '../core/graph.engine.js';

interface PostmanCollection {
  info?: { name?: string; description?: string };
  item?: PostmanItem[];
}

interface PostmanItem {
  name?: string;
  request?: {
    method?: string;
    url?: string | { raw?: string; path?: string[] };
    description?: string;
  };
  item?: PostmanItem[];
}

export class PostmanAdapter implements SourceAdapter {
  name = 'postman';
  format = 'postman';

  constructor(private getGraph: (ctx: TenantContext) => GraphEngine) {}

  canHandle(input: AdapterInput): boolean {
    return input.format === 'postman' || Boolean(input.path?.endsWith('.postman.json'));
  }

  async ingest(input: AdapterInput, ctx: TenantContext): Promise<IngestResult> {
    const graph = this.getGraph(ctx);
    const content = input.path ? readFileSync(input.path, 'utf-8') : input.content!;
    const collection = JSON.parse(content) as PostmanCollection;

    const apiId = `api:postman:${collection.info?.name ?? 'collection'}`;
    let nodesAdded = 0;
    let edgesAdded = 0;

    graph.addNode({
      id: apiId,
      type: 'API',
      label: collection.info?.name ?? 'Postman Collection',
      properties: { description: collection.info?.description, source: 'postman' }
    });
    nodesAdded++;

    const processItems = (items: PostmanItem[] | undefined) => {
      for (const item of items ?? []) {
        if (item.item) {
          processItems(item.item);
          continue;
        }
        const req = item.request;
        if (!req?.method) continue;

        const path = extractPath(req.url);
        const endpointId = `endpoint:${req.method.toUpperCase()}:${path}`;

        if (!graph.getNode(endpointId)) {
          graph.addNode({
            id: endpointId,
            type: 'Endpoint',
            label: `${req.method.toUpperCase()} ${path}`,
            properties: {
              method: req.method.toUpperCase(),
              path,
              summary: item.name ?? req.description,
              tags: [collection.info?.name ?? 'postman'],
              apiId
            }
          });
          nodesAdded++;
        }

        graph.addEdge({
          id: `${endpointId}-belongs-${apiId}`,
          source: endpointId,
          target: apiId,
          type: 'belongs_to'
        });
        edgesAdded++;
      }
    };

    processItems(collection.item);
    graph.rebuildSearchIndex();
    return { nodesAdded, edgesAdded, source: this.name };
  }
}

function extractPath(url: string | { raw?: string; path?: string[] } | undefined): string {
  if (!url) return '/';
  let path = '/';
  if (typeof url === 'string') {
    path = parseUrlPath(url);
  } else if (url.path) {
    path = '/' + url.path.join('/');
  } else if (url.raw) {
    path = parseUrlPath(url.raw);
  }
  return path.replace(/\{\{baseUrl\}\}/g, '').replace(/\/+/g, '/') || '/';
}

function parseUrlPath(raw: string): string {
  const stripped = raw.replace(/\{\{baseUrl\}\}/g, '');
  try {
    return new URL(stripped.startsWith('http') ? stripped : `http://x${stripped.startsWith('/') ? '' : '/'}${stripped}`).pathname;
  } catch {
    const match = stripped.match(/(\/[a-zA-Z0-9_/\-{}]+)/);
    return match?.[1] ?? '/';
  }
}
