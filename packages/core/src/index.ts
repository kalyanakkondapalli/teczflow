import { ConfigManager } from './core/config.manager.js';
import { GraphEngine } from './core/graph.engine.js';
import { InMemoryGraphStore } from './core/graph.store.js';
import { ReasoningEngine } from './core/reasoning.engine.js';
import { OpenApiAdapter } from './adapters/openapi.adapter.js';
import { PostmanAdapter } from './adapters/postman.adapter.js';
import { GraphqlAdapter } from './adapters/graphql.adapter.js';
import { LogsAdapter } from './adapters/logs.adapter.js';
import { GitAdapter } from './adapters/git.adapter.js';
import { TelemetryRegistry } from './adapters/telemetry.adapter.js';
import {
  DebugService,
  DiscoveryService,
  GraphService,
  ImpactService,
  SearchService,
  WorkflowService
} from './services/index.js';
import type { AdapterInput, FeatureFlags, IngestResult, TenantContext } from './types/index.js';
import type { SourceAdapter } from './types/index.js';

export class TeczFlowEngine {
  private config: ConfigManager;
  private store: InMemoryGraphStore;
  private graphs = new Map<string, GraphEngine>();
  private reasoning = new Map<string, ReasoningEngine>();
  private services = new Map<string, TenantServices>();
  private adapters: SourceAdapter[];
  private telemetryRegistry: TelemetryRegistry;
  private activeTenant: string;

  constructor(configPath?: string) {
    this.config = new ConfigManager(configPath);
    this.store = new InMemoryGraphStore();
    this.telemetryRegistry = TelemetryRegistry.createDefault();
    this.activeTenant = this.config.getDefaultTenant();

    const getGraph = (ctx: TenantContext) => this.getOrCreateGraph(ctx.tenantId);

    this.adapters = [
      new OpenApiAdapter(getGraph),
      new PostmanAdapter(getGraph),
      new GraphqlAdapter(getGraph),
      new LogsAdapter(getGraph),
      new GitAdapter(getGraph)
    ];
  }

  getConfigManager(): ConfigManager {
    return this.config;
  }

  setActiveTenant(tenantId: string): void {
    this.activeTenant = tenantId;
    this.getOrCreateServices(tenantId);
  }

  getActiveTenant(): string {
    return this.activeTenant;
  }

  getGraph(tenantId?: string): GraphEngine {
    return this.getOrCreateGraph(tenantId ?? this.activeTenant);
  }

  getServices(tenantId?: string): TenantServices {
    return this.getOrCreateServices(tenantId ?? this.activeTenant);
  }

  async load(input: AdapterInput, tenantId?: string): Promise<IngestResult> {
    const ctx: TenantContext = { tenantId: tenantId ?? this.activeTenant };
    const adapter = this.adapters.find((a) => a.canHandle(input));
    if (!adapter) {
      throw new Error(`No adapter found for input: ${input.format ?? input.path}`);
    }
    const result = await adapter.ingest(input, ctx);
    await this.persistGraph(ctx.tenantId);
    await this.refreshTelemetry(ctx.tenantId);
    return result;
  }

  async loadAll(
    paths: Array<{ path: string; format: AdapterInput['format'] }>,
    tenantId?: string
  ): Promise<IngestResult[]> {
    const results: IngestResult[] = [];
    for (const p of paths) {
      results.push(await this.load({ type: 'file', path: p.path, format: p.format }, tenantId));
    }
    return results;
  }

  async refreshTelemetry(tenantId?: string): Promise<number> {
    const tid = tenantId ?? this.activeTenant;
    if (!this.config.isFeatureEnabled('telemetry')) return 0;

    const providers = this.config.getTelemetryProviders(tid);
    const ctx: TenantContext = { tenantId: tid };
    let totalEdges = 0;

    for (const providerConfig of providers) {
      const adapter = this.telemetryRegistry.get(providerConfig.type);
      if (!adapter) continue;
      await adapter.connect(providerConfig, ctx);
      const signals = await adapter.fetchSignals();
      const reasoning = this.getOrCreateReasoning(tid);
      totalEdges += reasoning.enrichFromTelemetry(signals);
    }

    if (totalEdges > 0) {
      await this.persistGraph(tid);
    }
    return totalEdges;
  }

  listTenants(): string[] {
    return this.config.listTenants();
  }

  getFeatureFlags(): FeatureFlags {
    return this.config.getFeatureFlags();
  }

  private getOrCreateGraph(tenantId: string): GraphEngine {
    if (!this.graphs.has(tenantId)) {
      this.graphs.set(tenantId, new GraphEngine(tenantId));
    }
    return this.graphs.get(tenantId)!;
  }

  private getOrCreateReasoning(tenantId: string): ReasoningEngine {
    if (!this.reasoning.has(tenantId)) {
      this.reasoning.set(tenantId, new ReasoningEngine(this.getOrCreateGraph(tenantId)));
    }
    return this.reasoning.get(tenantId)!;
  }

  private getOrCreateServices(tenantId: string): TenantServices {
    if (!this.services.has(tenantId)) {
      const graph = this.getOrCreateGraph(tenantId);
      const reasoning = this.getOrCreateReasoning(tenantId);
      this.services.set(tenantId, {
        discovery: new DiscoveryService(graph),
        search: new SearchService(graph),
        workflow: new WorkflowService(reasoning),
        debug: new DebugService(graph, reasoning),
        impact: new ImpactService(graph, reasoning),
        graphService: new GraphService(graph)
      });
    }
    return this.services.get(tenantId)!;
  }

  private async persistGraph(tenantId: string): Promise<void> {
    const graph = this.graphs.get(tenantId);
    if (graph) {
      await this.store.save(tenantId, graph.toSnapshot());
    }
  }
}

export interface TenantServices {
  discovery: DiscoveryService;
  search: SearchService;
  workflow: WorkflowService;
  debug: DebugService;
  impact: ImpactService;
  graphService: GraphService;
}

export { ConfigManager } from './core/config.manager.js';
export { GraphEngine } from './core/graph.engine.js';
export { ReasoningEngine, parseErrorDescription } from './core/reasoning.engine.js';
export { TelemetryNormalizer } from './core/telemetry.normalizer.js';
export { MockTelemetryAdapter } from './adapters/telemetry.adapter.js';
export * from './types/index.js';
