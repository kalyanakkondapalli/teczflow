import { describe, it, expect, beforeEach } from 'vitest';
import { GraphEngine, ReasoningEngine } from '@teczflow/core';

describe('ReasoningEngine', () => {
  let graph: GraphEngine;
  let reasoning: ReasoningEngine;

  beforeEach(() => {
    graph = new GraphEngine('test');
    const endpoints = [
      { path: '/cart', method: 'POST', tags: ['cart', 'checkout'] },
      { path: '/orders', method: 'POST', tags: ['order', 'checkout'] },
      { path: '/payments', method: 'POST', tags: ['payment', 'checkout'], required: ['billingAddress'], auth: true },
      { path: '/inventory/reserve', method: 'POST', tags: ['inventory', 'checkout'] },
      { path: '/shipping', method: 'POST', tags: ['shipping', 'checkout'] },
      { path: '/invoices', method: 'POST', tags: ['invoice', 'checkout'] }
    ];

    for (const ep of endpoints) {
      graph.addNode({
        id: `endpoint:${ep.method}:${ep.path}`,
        type: 'Endpoint',
        label: `${ep.method} ${ep.path}`,
        properties: {
          method: ep.method,
          path: ep.path,
          tags: ep.tags,
          requiredFields: ep.required ?? [],
          authRequired: ep.auth ?? false
        }
      });
    }
    graph.rebuildSearchIndex();
    reasoning = new ReasoningEngine(graph);
  });

  it('infers checkout workflow', () => {
    const result = reasoning.inferWorkflowGoal('checkout process');
    expect(result.steps.length).toBeGreaterThan(2);
    expect(result.confidence).toMatch(/high|medium|low/);
    expect(result.evidence.length).toBeGreaterThan(0);
  });

  it('explains 400 missing field error', () => {
    const ep = graph.findEndpointByPath('POST', '/payments')!;
    const result = reasoning.explainError(ep, { orderId: '123', amount: 99 }, { status: 400 });
    expect(result.conclusion).toContain('billingAddress');
    expect(result.confidence).toBe('high');
  });

  it('explains 401 auth error', () => {
    const ep = graph.findEndpointByPath('POST', '/payments')!;
    const result = reasoning.explainError(ep, {}, { status: 401 });
    expect(result.conclusion.toLowerCase()).toMatch(/auth/);
  });

  it('analyzes impact', () => {
    const ep = graph.findEndpointByPath('POST', '/payments')!;
    const result = reasoning.analyzeImpact(ep.id);
    expect(result.evidence.length).toBeGreaterThan(0);
  });
});
