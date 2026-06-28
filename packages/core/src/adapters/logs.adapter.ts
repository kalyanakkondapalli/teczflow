import { readFileSync } from 'node:fs';
import type { AdapterInput, IngestResult, SourceAdapter, TenantContext } from '../types/index.js';
import type { GraphEngine } from '../core/graph.engine.js';

export class LogsAdapter implements SourceAdapter {
  name = 'logs';
  format = 'logs';

  constructor(private getGraph: (ctx: TenantContext) => GraphEngine) {}

  canHandle(input: AdapterInput): boolean {
    return input.format === 'logs';
  }

  async ingest(input: AdapterInput, ctx: TenantContext): Promise<IngestResult> {
    const graph = this.getGraph(ctx);
    const content = input.path ? readFileSync(input.path, 'utf-8') : input.content!;
    const data = JSON.parse(content) as { events?: LogEvent[] };

    let nodesAdded = 0;
    let edgesAdded = 0;

    for (const event of data.events ?? []) {
      if (!event.method || !event.path) continue;
      const ep = graph.findEndpointByPath(event.method, event.path);
      if (!ep) continue;

      if (event.status && event.status >= 400) {
        const errorId = `log-error:${event.requestId ?? Date.now()}`;
        graph.addNode({
          id: errorId,
          type: 'Response',
          label: `Log Error ${event.status}`,
          properties: { ...event, source: 'splunk-mock' }
        });
        nodesAdded++;
        graph.addEdge({
          id: `${ep.id}-log-${errorId}`,
          source: ep.id,
          target: errorId,
          type: 'observed_error',
          properties: { message: event.message }
        });
        edgesAdded++;
      }
    }

    graph.rebuildSearchIndex();
    return { nodesAdded, edgesAdded, source: this.name };
  }
}

interface LogEvent {
  timestamp?: string;
  method?: string;
  path?: string;
  status?: number;
  message?: string;
  requestId?: string;
  service?: string;
}
