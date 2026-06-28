#!/usr/bin/env node
import { Command } from 'commander';
import { TeczFlowEngine, parseErrorDescription } from '@mytecz/teczflow-core';
import { resolve } from 'node:path';
import { existsSync } from 'node:fs';

const program = new Command();

program
  .name('teczflow')
  .description('TeczFlow — AI API Intelligence Platform CLI')
  .version('1.0.0')
  .option('-c, --config <path>', 'Path to config.json')
  .option('-t, --tenant <id>', 'Tenant ID');

function getEngine(opts: { config?: string }): TeczFlowEngine {
  return new TeczFlowEngine(opts.config);
}

function detectFormat(path: string): 'openapi' | 'postman' | 'graphql' | 'logs' | 'git' {
  if (path.includes('postman')) return 'postman';
  if (path.endsWith('.graphql') || path.endsWith('.gql')) return 'graphql';
  if (path.includes('git')) return 'git';
  if (path.includes('log') || path.includes('telemetry')) return 'logs';
  return 'openapi';
}

program
  .command('load')
  .description('Load an API spec or fixture into the knowledge graph')
  .argument('<spec>', 'Path to spec file (OpenAPI, Postman, GraphQL, logs, git)')
  .action(async (spec: string, _opts, cmd) => {
    const globalOpts = cmd.parent?.opts() ?? {};
    const engine = getEngine(globalOpts);
    if (globalOpts.tenant) engine.setActiveTenant(globalOpts.tenant);

    const path = resolve(spec);
    if (!existsSync(path)) {
      console.error(`File not found: ${path}`);
      process.exit(1);
    }

    const format = detectFormat(path);
    const result = await engine.load({ type: 'file', path, format });
    console.log(`Loaded ${format} spec: +${result.nodesAdded} nodes, +${result.edgesAdded} edges`);
  });

program
  .command('query')
  .description('Search APIs using natural language')
  .argument('<text>', 'Search query')
  .action(async (text: string, _opts, cmd) => {
    const globalOpts = cmd.parent?.opts() ?? {};
    const engine = getEngine(globalOpts);
    await bootstrapFixtures(engine);
    if (globalOpts.tenant) engine.setActiveTenant(globalOpts.tenant);

    const results = engine.getServices().search.search(text);
    if (results.length === 0) {
      console.log('No results found.');
      return;
    }
    for (const r of results) {
      console.log(`[${r.score}] ${r.type}: ${r.label}`);
      console.log(`  ${r.snippet}`);
    }
  });

program
  .command('debug')
  .description('Explain an API error')
  .argument('<description>', 'Error description e.g. "POST /order failed 400"')
  .action(async (description: string, _opts, cmd) => {
    const globalOpts = cmd.parent?.opts() ?? {};
    const engine = getEngine(globalOpts);
    await bootstrapFixtures(engine);
    if (globalOpts.tenant) engine.setActiveTenant(globalOpts.tenant);

    const parsed = parseErrorDescription(description);
    const result = engine.getServices().debug.explain(
      `${parsed.method ?? 'POST'} ${parsed.path ?? '/orders'}`,
      {},
      { status: parsed.status ?? 400 }
    );

    console.log(`Conclusion (${result.confidence}): ${result.conclusion}`);
    console.log('\nEvidence:');
    for (const e of result.evidence) {
      console.log(`  - [${e.type}] ${e.detail}`);
    }
    if (result.suggestedNextSteps?.length) {
      console.log('\nSuggested next steps:');
      for (const s of result.suggestedNextSteps) {
        console.log(`  - ${s}`);
      }
    }
  });

program
  .command('workflow')
  .description('Infer a business workflow')
  .argument('<goal>', 'Workflow goal e.g. "checkout process"')
  .action(async (goal: string, _opts, cmd) => {
    const globalOpts = cmd.parent?.opts() ?? {};
    const engine = getEngine(globalOpts);
    await bootstrapFixtures(engine);
    if (globalOpts.tenant) engine.setActiveTenant(globalOpts.tenant);

    const result = engine.getServices().workflow.infer(goal);
    console.log(`${result.conclusion} (${result.confidence})`);
    console.log('\nSteps:');
    for (const step of result.steps) {
      console.log(`  ${step.order}. ${step.method} ${step.path} — ${step.reason}`);
    }
  });

program
  .command('graph')
  .description('Show API graph for a service or API')
  .argument('<name>', 'API or service name')
  .action(async (name: string, _opts, cmd) => {
    const globalOpts = cmd.parent?.opts() ?? {};
    const engine = getEngine(globalOpts);
    await bootstrapFixtures(engine);
    if (globalOpts.tenant) engine.setActiveTenant(globalOpts.tenant);

    const graph = engine.getServices().graphService.getApiGraph(name);
    console.log(`Graph for: ${graph.api}`);
    console.log(`Nodes: ${graph.nodes.length}, Edges: ${graph.edges.length}`);
    console.log('\nNodes:');
    for (const n of graph.nodes) {
      console.log(`  [${n?.type}] ${n?.label}`);
    }
    console.log('\nEdges:');
    for (const e of graph.edges.slice(0, 20)) {
      console.log(`  ${e.source} --${e.type}--> ${e.target}`);
    }
  });

async function bootstrapFixtures(engine: TeczFlowEngine): Promise<void> {
  const config = engine.getConfigManager();
  const base = config.getBaseDir();
  const fixtures = [
    { path: resolve(base, 'fixtures/shopflow.openapi.yaml'), format: 'openapi' as const },
    { path: resolve(base, 'fixtures/shopflow.postman.json'), format: 'postman' as const },
    { path: resolve(base, 'fixtures/telemetry/checkout-errors.json'), format: 'logs' as const },
    { path: resolve(base, 'fixtures/git/payment-schema-change.json'), format: 'git' as const }
  ];

  for (const f of fixtures) {
    if (existsSync(f.path)) {
      try {
        await engine.load({ type: 'file', path: f.path, format: f.format });
      } catch {
        // ignore duplicate loads
      }
    }
  }
  await engine.refreshTelemetry();
}

program.parse();
