import type {
  EdgeType,
  EndpointInfo,
  GraphEdge,
  GraphNode,
  GraphSnapshot,
  NodeType,
  SearchResult
} from '../types/index.js';

export class GraphEngine {
  private nodes = new Map<string, GraphNode>();
  private edges = new Map<string, GraphEdge>();
  private tenantId: string;
  private searchIndex = new Map<string, Set<string>>();

  constructor(tenantId: string) {
    this.tenantId = tenantId;
  }

  static fromSnapshot(snapshot: GraphSnapshot): GraphEngine {
    const engine = new GraphEngine(snapshot.tenantId);
    for (const node of snapshot.nodes) {
      engine.addNode(node);
    }
    for (const edge of snapshot.edges) {
      engine.addEdge(edge);
    }
    engine.rebuildSearchIndex();
    return engine;
  }

  getTenantId(): string {
    return this.tenantId;
  }

  addNode(node: GraphNode): void {
    this.nodes.set(node.id, { ...node, properties: { ...node.properties } });
    this.indexNode(node);
  }

  addEdge(edge: GraphEdge): void {
    if (!this.nodes.has(edge.source) || !this.nodes.has(edge.target)) return;
    this.edges.set(edge.id, { ...edge });
  }

  getNode(id: string): GraphNode | undefined {
    const node = this.nodes.get(id);
    return node ? { ...node, properties: { ...node.properties } } : undefined;
  }

  getNodes(type?: NodeType): GraphNode[] {
    const nodes = Array.from(this.nodes.values());
    return type ? nodes.filter((n) => n.type === type) : nodes.map((n) => ({ ...n, properties: { ...n.properties } }));
  }

  getEdges(type?: EdgeType): GraphEdge[] {
    const edges = Array.from(this.edges.values());
    return type ? edges.filter((e) => e.type === type) : edges.map((e) => ({ ...e }));
  }

  getDependencies(nodeId: string, depth = 3): GraphNode[] {
    const visited = new Set<string>();
    const result: GraphNode[] = [];
    const queue: Array<{ id: string; d: number }> = [{ id: nodeId, d: 0 }];

    while (queue.length > 0) {
      const { id, d } = queue.shift()!;
      if (visited.has(id) || d > depth) continue;
      visited.add(id);

      if (id !== nodeId) {
        const node = this.getNode(id);
        if (node) result.push(node);
      }

      for (const edge of this.edges.values()) {
        if (edge.source === id && !visited.has(edge.target)) {
          queue.push({ id: edge.target, d: d + 1 });
        }
        if (edge.target === id && !visited.has(edge.source)) {
          queue.push({ id: edge.source, d: d + 1 });
        }
      }
    }
    return result;
  }

  getSubgraph(rootId: string, depth = 2): { nodes: GraphNode[]; edges: GraphEdge[] } {
    const nodeIds = new Set<string>([rootId]);
    const expand = (id: string, d: number) => {
      if (d >= depth) return;
      for (const edge of this.edges.values()) {
        if (edge.source === id || edge.target === id) {
          const neighbor = edge.source === id ? edge.target : edge.source;
          if (!nodeIds.has(neighbor)) {
            nodeIds.add(neighbor);
            expand(neighbor, d + 1);
          }
        }
      }
    };
    expand(rootId, 0);

    const nodes = Array.from(nodeIds)
      .map((id) => this.getNode(id))
      .filter((n): n is GraphNode => n !== undefined);
    const edges = this.getEdges().filter((e) => nodeIds.has(e.source) && nodeIds.has(e.target));
    return { nodes, edges };
  }

  listApis(): GraphNode[] {
    return this.getNodes('API');
  }

  listEndpoints(apiId?: string): EndpointInfo[] {
    const endpoints = this.getNodes('Endpoint');
    return endpoints
      .filter((ep) => !apiId || ep.properties.apiId === apiId)
      .map((ep) => ({
        id: ep.id,
        method: ep.properties.method as string,
        path: ep.properties.path as string,
        operationId: ep.properties.operationId as string | undefined,
        summary: ep.properties.summary as string | undefined,
        tags: (ep.properties.tags as string[]) ?? [],
        apiId: ep.properties.apiId as string
      }));
  }

  search(query: string, limit = 20): SearchResult[] {
    const tokens = tokenize(query);
    const scores = new Map<string, number>();

    for (const token of tokens) {
      const nodeIds = this.searchIndex.get(token);
      if (!nodeIds) continue;
      for (const nodeId of nodeIds) {
        scores.set(nodeId, (scores.get(nodeId) ?? 0) + 1);
      }
    }

    const results: SearchResult[] = [];
    for (const [nodeId, score] of scores) {
      const node = this.getNode(nodeId);
      if (!node) continue;
      results.push({
        nodeId,
        type: node.type,
        label: node.label,
        score,
        snippet: buildSnippet(node)
      });
    }

    return results.sort((a, b) => b.score - a.score).slice(0, limit);
  }

  findEndpointByPath(method: string, path: string): GraphNode | undefined {
    return this.getNodes('Endpoint').find(
      (ep) =>
        (ep.properties.method as string)?.toUpperCase() === method.toUpperCase() &&
        pathMatches(ep.properties.path as string, path)
    );
  }

  findNodesByLabel(query: string, type?: NodeType): GraphNode[] {
    const q = query.toLowerCase();
    return this.getNodes(type).filter(
      (n) =>
        n.label.toLowerCase().includes(q) ||
        n.id.toLowerCase().includes(q) ||
        JSON.stringify(n.properties).toLowerCase().includes(q)
    );
  }

  toSnapshot(): GraphSnapshot {
    return {
      tenantId: this.tenantId,
      nodes: this.getNodes(),
      edges: this.getEdges(),
      updatedAt: new Date().toISOString()
    };
  }

  rebuildSearchIndex(): void {
    this.searchIndex.clear();
    for (const node of this.getNodes()) {
      this.indexNode(node);
    }
  }

  private indexNode(node: GraphNode): void {
    const text = [node.label, node.id, node.type, JSON.stringify(node.properties)].join(' ');
    for (const token of tokenize(text)) {
      if (!this.searchIndex.has(token)) {
        this.searchIndex.set(token, new Set());
      }
      this.searchIndex.get(token)!.add(node.id);
    }
  }
}

const SYNONYMS: Record<string, string[]> = {
  refund: ['return', 'credit', 'reverse'],
  checkout: ['cart', 'purchase', 'order'],
  invoice: ['billing', 'receipt'],
  payment: ['pay', 'charge', 'transaction'],
  customer: ['user', 'client', 'account']
};

function tokenize(text: string): string[] {
  const base = text
    .toLowerCase()
    .replace(/[^a-z0-9/_\- ]/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length > 1);

  const expanded = new Set(base);
  for (const token of base) {
    for (const [key, syns] of Object.entries(SYNONYMS)) {
      if (token.includes(key) || syns.some((s) => token.includes(s))) {
        expanded.add(key);
        syns.forEach((s) => expanded.add(s));
      }
    }
  }
  return Array.from(expanded);
}

function buildSnippet(node: GraphNode): string {
  if (node.type === 'Endpoint') {
    return `${node.properties.method} ${node.properties.path} — ${node.properties.summary ?? node.label}`;
  }
  return node.properties.description ? String(node.properties.description) : node.label;
}

function pathMatches(template: string, actual: string): boolean {
  const tParts = template.split('/').filter(Boolean);
  const aParts = actual.split('/').filter(Boolean);
  if (tParts.length !== aParts.length) {
    return (
      actual.includes(template.replace(/\{[^}]+\}/g, '')) ||
      tParts.every((tp, i) => !aParts[i] || tp.startsWith('{') || tp === aParts[i])
    );
  }
  return tParts.every((tp, i) => tp.startsWith('{') || tp === aParts[i]);
}
