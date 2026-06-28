import type {
  Confidence,
  Evidence,
  GraphNode,
  NormalizedSignals,
  ReasoningResult
} from '../types/index.js';
import type { GraphEngine } from './graph.engine.js';

export class ReasoningEngine {
  constructor(private graph: GraphEngine) {}

  inferWorkflowGoal(goal: string): {
    steps: Array<{ endpoint: GraphNode; order: number; reason: string }>;
    evidence: Evidence[];
    confidence: Confidence;
  } {
    const tokens = goal.toLowerCase().split(/\s+/);
    const endpoints = this.graph.getNodes('Endpoint');

    const scored = endpoints.map((ep) => {
      let score = 0;
      const tags = (ep.properties.tags as string[]) ?? [];
      const path = (ep.properties.path as string)?.toLowerCase() ?? '';
      const summary = (ep.properties.summary as string)?.toLowerCase() ?? '';
      const method = (ep.properties.method as string)?.toUpperCase() ?? '';

      for (const token of tokens) {
        if (tags.some((t) => t.toLowerCase().includes(token))) score += 3;
        if (path.includes(token)) score += 2;
        if (summary.includes(token)) score += 2;
        if (ep.label.toLowerCase().includes(token)) score += 1;
      }

      if (method === 'POST') score += 1;
      return { ep, score };
    });

    const relevant = scored.filter((s) => s.score > 0).sort((a, b) => b.score - a.score);

    const workflowOrder = ['cart', 'payment', 'inventory', 'shipping', 'invoice', 'notification', 'order', 'checkout'];
    const ordered = relevant.sort((a, b) => {
      const pathA = (a.ep.properties.path as string)?.toLowerCase() ?? '';
      const pathB = (b.ep.properties.path as string)?.toLowerCase() ?? '';
      const idxA = workflowOrder.findIndex((w) => pathA.includes(w));
      const idxB = workflowOrder.findIndex((w) => pathB.includes(w));
      if (idxA === -1 && idxB === -1) return b.score - a.score;
      if (idxA === -1) return 1;
      if (idxB === -1) return -1;
      return idxA - idxB;
    });

    const steps = ordered.map((item, i) => ({
      endpoint: item.ep,
      order: i + 1,
      reason: `Matched goal "${goal}" via tags/path (score: ${item.score})`
    }));

    const traceEvidence = this.getTraceWorkflowEvidence(steps.map((s) => s.endpoint));

    const evidence: Evidence[] = [
      ...steps.slice(0, 3).map((s) => ({
        type: 'tag' as const,
        detail: `${s.endpoint.properties.method} ${s.endpoint.properties.path}`,
        nodeId: s.endpoint.id
      })),
      ...traceEvidence
    ];

    const confidence: Confidence =
      steps.length >= 4 ? 'high' : steps.length >= 2 ? 'medium' : 'low';

    return { steps, evidence, confidence };
  }

  explainError(
    endpoint: GraphNode | undefined,
    request: Record<string, unknown>,
    response: { status: number; body?: unknown }
  ): ReasoningResult {
    const evidence: Evidence[] = [];
    const nextSteps: string[] = [];
    let conclusion = '';
    let confidence: Confidence = 'medium';

    if (!endpoint) {
      return {
        conclusion: 'Endpoint not found in knowledge graph. Load an OpenAPI spec first.',
        confidence: 'low',
        evidence: [{ type: 'rule', detail: 'No matching endpoint node' }],
        suggestedNextSteps: ['Run: teczflow load <spec.json>', 'Use list_endpoints to verify']
      };
    }

    const status = response.status;
    const required = (endpoint.properties.requiredFields as string[]) ?? [];
    const authRequired = endpoint.properties.authRequired as boolean;
    const body = (request.body ?? request) as Record<string, unknown>;

    evidence.push({
      type: 'graph',
      detail: `Endpoint ${endpoint.properties.method} ${endpoint.properties.path}`,
      nodeId: endpoint.id
    });

    if (status === 401 || status === 403) {
      conclusion = authRequired
        ? `Authentication failure on ${endpoint.label}. The endpoint requires authorization.`
        : `Received ${status} but endpoint may not require auth — check token validity and scopes.`;
      evidence.push({ type: 'rule', detail: `HTTP ${status} indicates auth/authorization issue` });
      if (authRequired) {
        evidence.push({ type: 'schema', detail: 'Endpoint marked as authRequired in spec' });
      }
      nextSteps.push('Verify Authorization header', 'Check token expiry and scopes');
      confidence = 'high';
    } else if (status === 400) {
      const missing = required.filter((f) => body[f] === undefined || body[f] === null);
      if (missing.length > 0) {
        conclusion = `Bad request: missing required field(s): ${missing.join(', ')}`;
        evidence.push({
          type: 'schema',
          detail: `Required fields: ${required.join(', ')}; missing: ${missing.join(', ')}`,
          nodeId: endpoint.id
        });
        confidence = 'high';
      } else {
        conclusion = `Bad request (400) on ${endpoint.label}. Request body may not match schema.`;
        evidence.push({ type: 'schema', detail: 'Validate request against endpoint schema' });
      }
      nextSteps.push('Compare request body with schema required fields', 'Check Content-Type header');
    } else if (status === 404) {
      conclusion = `Resource not found for ${endpoint.label}. Verify path parameters and resource ID.`;
      evidence.push({ type: 'rule', detail: 'HTTP 404 — resource or route not found' });
      nextSteps.push('Verify URL path and path parameters');
    } else if (status >= 500) {
      conclusion = `Server error (${status}) on ${endpoint.label}. Likely downstream dependency failure.`;
      const deps = this.graph.getDependencies(endpoint.id, 2);
      if (deps.length > 0) {
        evidence.push({
          type: 'graph',
          detail: `Dependencies: ${deps.map((d) => d.label).join(', ')}`
        });
      }
      nextSteps.push('Check dependent services', 'Review server logs for stack trace');
      confidence = 'medium';
    } else {
      conclusion = `Unexpected status ${status} on ${endpoint.label}.`;
      evidence.push({ type: 'rule', detail: `HTTP status ${status}` });
    }

    const telemetryEvidence = this.getTelemetryErrorEvidence(endpoint);
    evidence.push(...telemetryEvidence);

    return { conclusion, confidence, evidence, suggestedNextSteps: nextSteps };
  }

  analyzeImpact(changedEndpointId: string): {
    affected: Array<{ node: GraphNode; impact: string; severity: 'high' | 'medium' | 'low' }>;
    evidence: Evidence[];
    confidence: Confidence;
  } {
    const node = this.graph.getNode(changedEndpointId);
    if (!node) {
      const found = this.graph.findNodesByLabel(changedEndpointId, 'Endpoint')[0];
      if (!found) {
        return {
          affected: [],
          evidence: [{ type: 'rule', detail: 'Changed endpoint not found' }],
          confidence: 'low'
        };
      }
      changedEndpointId = found.id;
    }

    const deps = this.graph.getDependencies(changedEndpointId, 4);
    const affected = deps.map((d) => ({
      node: d,
      impact: d.type === 'Schema' ? 'Schema change may break validation' : 'May fail if dependency contract changes',
      severity: (d.type === 'Endpoint' ? 'high' : d.type === 'Schema' ? 'high' : 'medium') as
        | 'high'
        | 'medium'
        | 'low'
    }));

    const evidence: Evidence[] = [
      { type: 'graph', detail: `Impact radius: ${affected.length} nodes`, nodeId: changedEndpointId },
      ...affected.slice(0, 5).map((a) => ({
        type: 'graph' as const,
        detail: `${a.node.type}: ${a.node.label} — ${a.impact}`,
        nodeId: a.node.id
      }))
    ];

    return {
      affected,
      evidence,
      confidence: affected.length > 0 ? 'medium' : 'low'
    };
  }

  enrichFromTelemetry(signals: NormalizedSignals): number {
    let edgesAdded = 0;

    for (const log of signals.logs) {
      if (!log.method || !log.path) continue;
      const ep = this.graph.findEndpointByPath(log.method, log.path);
      if (!ep) continue;

      if (log.status && log.status >= 400) {
        this.graph.addEdge({
          id: `${ep.id}-error-${log.status}`,
          source: ep.id,
          target: `error:${log.status}`,
          type: 'observed_error',
          properties: { message: log.message, count: 1, timestamp: log.timestamp }
        });
        if (!this.graph.getNode(`error:${log.status}`)) {
          this.graph.addNode({
            id: `error:${log.status}`,
            type: 'Response',
            label: `HTTP ${log.status} Error`,
            properties: { status: log.status }
          });
        }
        edgesAdded++;
      }
    }

    for (const span of signals.traces) {
      if (!span.httpMethod || !span.httpRoute) continue;
      const ep = this.graph.findEndpointByPath(span.httpMethod, span.httpRoute);
      if (!ep) continue;

      const serviceId = `service:${span.serviceName}`;
      if (!this.graph.getNode(serviceId)) {
        this.graph.addNode({
          id: serviceId,
          type: 'Service',
          label: span.serviceName,
          properties: { name: span.serviceName }
        });
      }
      this.graph.addEdge({
        id: `${ep.id}-observed-${serviceId}`,
        source: ep.id,
        target: serviceId,
        type: 'observed_calls',
        properties: { durationMs: span.durationMs, timestamp: span.timestamp }
      });
      edgesAdded++;
    }

    this.graph.rebuildSearchIndex();
    return edgesAdded;
  }

  private getTraceWorkflowEvidence(endpoints: GraphNode[]): Evidence[] {
    const evidence: Evidence[] = [];
    for (let i = 0; i < endpoints.length - 1; i++) {
      const edges = this.graph.getEdges('observed_calls');
      const hasObserved = edges.some(
        (e) => e.source === endpoints[i].id && e.target === endpoints[i + 1]?.id
      );
      if (hasObserved) {
        evidence.push({
          type: 'telemetry',
          detail: `Observed call chain: ${endpoints[i].label} → ${endpoints[i + 1].label}`,
          source: 'traces'
        });
      }
    }
    return evidence;
  }

  private getTelemetryErrorEvidence(endpoint: GraphNode): Evidence[] {
    const evidence: Evidence[] = [];
    const errorEdges = this.graph
      .getEdges('observed_error')
      .filter((e) => e.source === endpoint.id);

    for (const edge of errorEdges) {
      const msg = edge.properties?.message as string | undefined;
      evidence.push({
        type: 'telemetry',
        detail: msg ?? `Observed error on endpoint`,
        nodeId: endpoint.id,
        source: 'logs'
      });
    }
    return evidence;
  }
}

export function parseErrorDescription(desc: string): {
  method?: string;
  path?: string;
  status?: number;
} {
  const methodMatch = desc.match(/\b(GET|POST|PUT|PATCH|DELETE)\b/i);
  const pathMatch = desc.match(/(\/[a-zA-Z0-9_/{}\-]+)/);
  const statusMatch = desc.match(/\b(400|401|403|404|500|502|503)\b/);

  return {
    method: methodMatch?.[1]?.toUpperCase(),
    path: pathMatch?.[1],
    status: statusMatch ? parseInt(statusMatch[1], 10) : undefined
  };
}
