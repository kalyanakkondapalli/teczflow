import { readFileSync } from 'node:fs';
import type { AdapterInput, IngestResult, SourceAdapter, TenantContext } from '../types/index.js';
import type { GraphEngine } from '../core/graph.engine.js';

export class GitAdapter implements SourceAdapter {
  name = 'git';
  format = 'git';

  constructor(private getGraph: (ctx: TenantContext) => GraphEngine) {}

  canHandle(input: AdapterInput): boolean {
    return input.format === 'git';
  }

  async ingest(input: AdapterInput, ctx: TenantContext): Promise<IngestResult> {
    const graph = this.getGraph(ctx);
    const content = input.path ? readFileSync(input.path, 'utf-8') : input.content!;
    const data = JSON.parse(content) as GitCommitFixture;

    let nodesAdded = 0;
    let edgesAdded = 0;

    const commitId = `git:${data.commit?.sha ?? 'unknown'}`;
    graph.addNode({
      id: commitId,
      type: 'Schema',
      label: `Commit ${data.commit?.sha?.slice(0, 7) ?? 'unknown'}`,
      properties: {
        message: data.commit?.message,
        author: data.commit?.author,
        changes: data.changes,
        source: 'github-mock'
      }
    });
    nodesAdded++;

    for (const change of data.changes ?? []) {
      const affected = graph.findNodesByLabel(change.file ?? '', 'Endpoint');
      for (const ep of affected) {
        graph.addEdge({
          id: `${commitId}-affects-${ep.id}`,
          source: commitId,
          target: ep.id,
          type: 'triggers',
          properties: { change: change.description }
        });
        edgesAdded++;
      }

      if (change.schema) {
        const schemas = graph.getNodes('Schema').filter((s) =>
          s.label.toLowerCase().includes(change.schema!.toLowerCase())
        );
        for (const schema of schemas) {
          graph.addEdge({
            id: `${commitId}-schema-${schema.id}`,
            source: commitId,
            target: schema.id,
            type: 'triggers',
            properties: { change: change.description }
          });
          edgesAdded++;
        }
      }
    }

    graph.rebuildSearchIndex();
    return { nodesAdded, edgesAdded, source: this.name };
  }
}

interface GitCommitFixture {
  commit?: { sha?: string; message?: string; author?: string };
  changes?: Array<{ file?: string; schema?: string; description?: string }>;
}
