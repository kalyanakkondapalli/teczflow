import type { ApiSummary, EndpointInfo, WorkflowResult } from '../types/index.js';
import type { GraphEngine } from '../core/graph.engine.js';
import type { ReasoningEngine } from '../core/reasoning.engine.js';

export class WorkflowService {
  constructor(private reasoning: ReasoningEngine) {}

  infer(goal: string): WorkflowResult {
    const { steps, evidence, confidence } = this.reasoning.inferWorkflowGoal(goal);

    const workflowSteps = steps.map((s) => ({
      order: s.order,
      endpointId: s.endpoint.id,
      method: s.endpoint.properties.method as string,
      path: s.endpoint.properties.path as string,
      label: s.endpoint.label,
      reason: s.reason
    }));

    const conclusion =
      workflowSteps.length > 0
        ? `Inferred workflow for "${goal}": ${workflowSteps.map((s) => s.label).join(' → ')}`
        : `No workflow inferred for "${goal}". Try loading more API specs or using more specific terms.`;

    return {
      conclusion,
      confidence,
      evidence,
      steps: workflowSteps,
      goal,
      suggestedNextSteps:
        workflowSteps.length === 0
          ? ['Load OpenAPI spec with checkout-related tags', 'Enable telemetry for observed flows']
          : undefined
    };
  }
}

export class DiscoveryService {
  constructor(private graph: GraphEngine) {}

  listApis(): ApiSummary[] {
    return this.graph.listApis().map((api) => {
      const apiId = api.id;
      const endpoints = this.graph.listEndpoints(apiId);
      const tags = new Set<string>();
      const services = new Set<string>();
      const authSchemes = new Set<string>();

      for (const ep of endpoints) {
        ep.tags.forEach((t) => tags.add(t));
      }

      for (const edge of this.graph.getEdges('observed_calls')) {
        const target = this.graph.getNode(edge.target);
        if (target?.type === 'Service') services.add(target.label);
      }

      for (const node of this.graph.getNodes('Auth')) {
        authSchemes.add(node.label);
      }

      return {
        apiId,
        name: api.label,
        description: api.properties.description as string | undefined,
        endpointCount: endpoints.length,
        services: Array.from(services),
        tags: Array.from(tags),
        authSchemes: Array.from(authSchemes)
      };
    });
  }

  listEndpoints(api?: string): EndpointInfo[] {
    const apiNode = api
      ? this.graph.listApis().find((a) => a.id === api || a.label.toLowerCase() === api.toLowerCase())
      : undefined;
    return this.graph.listEndpoints(apiNode?.id);
  }

  getApiSummary(api: string): ApiSummary | null {
    const summaries = this.listApis();
    return (
      summaries.find(
        (s) => s.apiId === api || s.name.toLowerCase() === api.toLowerCase()
      ) ?? null
    );
  }
}

export class SearchService {
  constructor(private graph: GraphEngine) {}

  search(query: string) {
    return this.graph.search(query);
  }
}

export class DebugService {
  constructor(
    private graph: GraphEngine,
    private reasoning: ReasoningEngine
  ) {}

  explain(
    endpointRef: string,
    request: Record<string, unknown> = {},
    response: { status: number; body?: unknown } = { status: 400 }
  ) {
    const parsed = parseEndpointRef(endpointRef);
    const endpoint =
      this.graph.findEndpointByPath(parsed.method ?? 'POST', parsed.path ?? endpointRef) ??
      this.graph.findNodesByLabel(parsed.path ?? endpointRef, 'Endpoint')[0];

    return this.reasoning.explainError(endpoint, request, {
      status: parsed.status ?? response.status,
      body: response.body
    });
  }
}

export class ImpactService {
  constructor(
    private graph: GraphEngine,
    private reasoning: ReasoningEngine
  ) {}

  analyze(endpointRef: string) {
    const endpoint =
      this.graph.findNodesByLabel(endpointRef, 'Endpoint')[0] ??
      this.graph.findEndpointByPath('POST', endpointRef);

    const nodeId = endpoint?.id ?? endpointRef;
    const { affected, evidence, confidence } = this.reasoning.analyzeImpact(nodeId);

    return {
      conclusion:
        affected.length > 0
          ? `Changing ${endpoint?.label ?? endpointRef} may impact ${affected.length} dependent node(s).`
          : `No significant dependencies found for ${endpointRef}.`,
      confidence,
      evidence,
      changedNodeId: nodeId,
      affected: affected.map((a) => ({
        nodeId: a.node.id,
        type: a.node.type,
        label: a.node.label,
        impact: a.impact,
        severity: a.severity
      }))
    };
  }
}

export class GraphService {
  constructor(private graph: GraphEngine) {}

  getApiGraph(api: string) {
    const apiNode =
      this.graph.listApis().find(
        (a) => a.id === api || a.label.toLowerCase().includes(api.toLowerCase())
      ) ?? this.graph.listApis()[0];

    if (!apiNode) return { nodes: [], edges: [] };

    const endpoints = this.graph.listEndpoints(apiNode.id);
    const nodeIds = new Set<string>([apiNode.id]);
    for (const ep of endpoints) nodeIds.add(ep.id);

    for (const edge of this.graph.getEdges()) {
      if (nodeIds.has(edge.source) || nodeIds.has(edge.target)) {
        nodeIds.add(edge.source);
        nodeIds.add(edge.target);
      }
    }

    return {
      api: apiNode.label,
      nodes: Array.from(nodeIds)
        .map((id) => this.graph.getNode(id))
        .filter(Boolean),
      edges: this.graph.getEdges().filter((e) => nodeIds.has(e.source) && nodeIds.has(e.target))
    };
  }

  getDependencies(endpointRef: string) {
    const endpoint =
      this.graph.findNodesByLabel(endpointRef, 'Endpoint')[0] ??
      this.graph.findEndpointByPath('GET', endpointRef);

    if (!endpoint) {
      return { endpoint: endpointRef, dependencies: [] };
    }

    return {
      endpoint: endpoint.label,
      endpointId: endpoint.id,
      dependencies: this.graph.getDependencies(endpoint.id)
    };
  }
}

function parseEndpointRef(ref: string): { method?: string; path?: string; status?: number } {
  const methodMatch = ref.match(/^(GET|POST|PUT|PATCH|DELETE)\s+/i);
  const pathMatch = ref.match(/(\/[a-zA-Z0-9_/{}\-]+)/);
  const statusMatch = ref.match(/\b(400|401|403|404|500)\b/);
  return {
    method: methodMatch?.[1]?.toUpperCase(),
    path: pathMatch?.[1],
    status: statusMatch ? parseInt(statusMatch[1], 10) : undefined
  };
}
