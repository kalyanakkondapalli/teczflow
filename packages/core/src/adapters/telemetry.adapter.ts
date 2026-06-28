import { readFileSync, existsSync } from 'node:fs';
import type {
  NormalizedSignals,
  TelemetryProviderConfig,
  TelemetryQuery,
  TenantContext
} from '../types/index.js';
import { TelemetryNormalizer, type MockTelemetryFixture } from '../core/telemetry.normalizer.js';

export interface TelemetryAdapter {
  readonly type: string;
  connect(config: TelemetryProviderConfig, ctx: TenantContext): Promise<void>;
  fetchSignals(query?: TelemetryQuery): Promise<NormalizedSignals>;
}

export class MockTelemetryAdapter implements TelemetryAdapter {
  readonly type = 'mock';
  private fixture: MockTelemetryFixture = {};

  async connect(config: TelemetryProviderConfig, _ctx: TenantContext): Promise<void> {
    if (config.fixture && existsSync(config.fixture)) {
      this.fixture = JSON.parse(readFileSync(config.fixture, 'utf-8')) as MockTelemetryFixture;
    }
  }

  async fetchSignals(_query?: TelemetryQuery): Promise<NormalizedSignals> {
    return TelemetryNormalizer.fromMockFixture(this.fixture);
  }
}

export class LogfileTelemetryAdapter implements TelemetryAdapter {
  readonly type = 'logfile';
  private config: TelemetryProviderConfig = { id: '', type: 'logfile', enabled: true };

  async connect(config: TelemetryProviderConfig, _ctx: TenantContext): Promise<void> {
    this.config = config;
  }

  async fetchSignals(_query?: TelemetryQuery): Promise<NormalizedSignals> {
    if (!this.config.path || !existsSync(this.config.path)) {
      return { logs: [], metrics: [], traces: [] };
    }
    const content = readFileSync(this.config.path, 'utf-8');
    const lines = content.split('\n').filter(Boolean);
    return TelemetryNormalizer.fromLogLines(lines, this.config.parser ?? 'json');
  }
}

export class OtlpTelemetryAdapter implements TelemetryAdapter {
  readonly type = 'otlp';
  private buffer: NormalizedSignals = { logs: [], metrics: [], traces: [] };

  async connect(_config: TelemetryProviderConfig, _ctx: TenantContext): Promise<void> {
    this.buffer = { logs: [], metrics: [], traces: [] };
  }

  async fetchSignals(_query?: TelemetryQuery): Promise<NormalizedSignals> {
    return structuredClone(this.buffer);
  }

  ingestSignals(signals: NormalizedSignals): void {
    this.buffer.logs.push(...signals.logs);
    this.buffer.metrics.push(...signals.metrics);
    this.buffer.traces.push(...signals.traces);
  }
}

export class TelemetryRegistry {
  private adapters = new Map<string, TelemetryAdapter>();

  register(adapter: TelemetryAdapter): void {
    this.adapters.set(adapter.type, adapter);
  }

  get(type: string): TelemetryAdapter | undefined {
    return this.adapters.get(type);
  }

  static createDefault(): TelemetryRegistry {
    const registry = new TelemetryRegistry();
    registry.register(new MockTelemetryAdapter());
    registry.register(new LogfileTelemetryAdapter());
    registry.register(new OtlpTelemetryAdapter());
    return registry;
  }
}
