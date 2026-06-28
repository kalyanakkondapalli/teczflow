import { describe, it, expect, beforeEach } from 'vitest';
import { GraphEngine } from '@teczflow/core';

describe('GraphEngine', () => {
  let graph: GraphEngine;

  beforeEach(() => {
    graph = new GraphEngine('test-tenant');
  });

  it('adds nodes and edges', () => {
    graph.addNode({ id: 'api:1', type: 'API', label: 'Test API', properties: {} });
    graph.addNode({ id: 'ep:1', type: 'Endpoint', label: 'GET /test', properties: { method: 'GET', path: '/test' } });
    graph.addEdge({ id: 'e1', source: 'ep:1', target: 'api:1', type: 'belongs_to' });

    expect(graph.getNodes()).toHaveLength(2);
    expect(graph.getEdges()).toHaveLength(1);
  });

  it('lists APIs and endpoints', () => {
    graph.addNode({ id: 'api:shop', type: 'API', label: 'ShopFlow', properties: {} });
    graph.addNode({
      id: 'ep:post:payments',
      type: 'Endpoint',
      label: 'POST /payments',
      properties: { method: 'POST', path: '/payments', apiId: 'api:shop', tags: ['payment'] }
    });

    expect(graph.listApis()).toHaveLength(1);
    expect(graph.listEndpoints('api:shop')).toHaveLength(1);
  });

  it('searches by keyword', () => {
    graph.addNode({
      id: 'ep:refund',
      type: 'Endpoint',
      label: 'POST /payments/refund',
      properties: { method: 'POST', path: '/payments/refund', summary: 'Refund payment', tags: ['payment'] }
    });
    graph.rebuildSearchIndex();

    const results = graph.search('refund');
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].label).toContain('refund');
  });

  it('finds endpoint by path', () => {
    graph.addNode({
      id: 'ep:pay',
      type: 'Endpoint',
      label: 'POST /payments',
      properties: { method: 'POST', path: '/payments' }
    });

    const found = graph.findEndpointByPath('POST', '/payments');
    expect(found).toBeDefined();
    expect(found!.id).toBe('ep:pay');
  });

  it('exports snapshot', () => {
    graph.addNode({ id: 'api:1', type: 'API', label: 'API', properties: {} });
    const snapshot = graph.toSnapshot();
    expect(snapshot.tenantId).toBe('test-tenant');
    expect(snapshot.nodes).toHaveLength(1);
  });
});
