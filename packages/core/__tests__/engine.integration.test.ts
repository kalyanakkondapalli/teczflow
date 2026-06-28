import { describe, it, expect } from 'vitest';
import { TeczFlowEngine } from '@mytecz/teczflow-core';
import { resolve } from 'node:path';

const configPath = resolve(process.cwd(), 'config.json');
const fixturesDir = resolve(process.cwd(), 'fixtures');

describe('TeczFlowEngine integration', () => {
  it('loads OpenAPI spec', async () => {
    const engine = new TeczFlowEngine(configPath);
    const result = await engine.load({
      type: 'file',
      path: resolve(fixturesDir, 'shopflow.openapi.yaml'),
      format: 'openapi'
    });
    expect(result.nodesAdded).toBeGreaterThan(0);
    expect(engine.getServices().discovery.listApis().length).toBeGreaterThan(0);
  });

  it('lists endpoints after load', async () => {
    const engine = new TeczFlowEngine(configPath);
    await engine.load({
      type: 'file',
      path: resolve(fixturesDir, 'shopflow.openapi.yaml'),
      format: 'openapi'
    });
    const apis = engine.getServices().discovery.listApis();
    const endpoints = engine.getServices().discovery.listEndpoints(apis[0].name);
    expect(endpoints.length).toBeGreaterThan(5);
  });

  it('searches APIs', async () => {
    const engine = new TeczFlowEngine(configPath);
    await engine.load({
      type: 'file',
      path: resolve(fixturesDir, 'shopflow.openapi.yaml'),
      format: 'openapi'
    });
    const results = engine.getServices().search.search('invoice');
    expect(results.length).toBeGreaterThan(0);
  });

  it('infers workflow', async () => {
    const engine = new TeczFlowEngine(configPath);
    await engine.load({
      type: 'file',
      path: resolve(fixturesDir, 'shopflow.openapi.yaml'),
      format: 'openapi'
    });
    const workflow = engine.getServices().workflow.infer('checkout');
    expect(workflow.steps.length).toBeGreaterThan(0);
    expect(workflow.conclusion).toContain('checkout');
  });

  it('explains payment error', async () => {
    const engine = new TeczFlowEngine(configPath);
    await engine.load({
      type: 'file',
      path: resolve(fixturesDir, 'shopflow.openapi.yaml'),
      format: 'openapi'
    });
    await engine.refreshTelemetry();
    const result = engine.getServices().debug.explain('POST /payments', { orderId: '1', amount: 50 }, { status: 400 });
    expect(result.conclusion).toBeTruthy();
    expect(result.evidence.length).toBeGreaterThan(0);
  });

  it('analyzes change impact', async () => {
    const engine = new TeczFlowEngine(configPath);
    await engine.load({
      type: 'file',
      path: resolve(fixturesDir, 'shopflow.openapi.yaml'),
      format: 'openapi'
    });
    const impact = engine.getServices().impact.analyze('POST /payments');
    expect(impact.conclusion).toBeTruthy();
  });

  it('returns api graph', async () => {
    const engine = new TeczFlowEngine(configPath);
    await engine.load({
      type: 'file',
      path: resolve(fixturesDir, 'shopflow.openapi.yaml'),
      format: 'openapi'
    });
    const graph = engine.getServices().graphService.getApiGraph('ShopFlow');
    expect(graph.nodes.length).toBeGreaterThan(0);
  });

  it('lists tenants and feature flags', () => {
    const engine = new TeczFlowEngine(configPath);
    expect(engine.listTenants()).toContain('default');
    expect(engine.getFeatureFlags().openapi).toBe(true);
  });

  it('loads postman collection', async () => {
    const engine = new TeczFlowEngine(configPath);
    const result = await engine.load({
      type: 'file',
      path: resolve(fixturesDir, 'shopflow.postman.json'),
      format: 'postman'
    });
    expect(result.nodesAdded).toBeGreaterThan(0);
  });

  it('enriches graph from telemetry', async () => {
    const engine = new TeczFlowEngine(configPath);
    await engine.load({
      type: 'file',
      path: resolve(fixturesDir, 'shopflow.openapi.yaml'),
      format: 'openapi'
    });
    const edges = await engine.refreshTelemetry();
    expect(edges).toBeGreaterThanOrEqual(0);
  });
});
