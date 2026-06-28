import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { FeatureFlags, TeczFlowConfig, TelemetryProviderConfig } from '../types/index.js';

const DEFAULT_FEATURES: FeatureFlags = {
  openapi: true,
  postman: true,
  graphql: true,
  logs: true,
  git: true,
  observability: true,
  workflow_inference: true,
  impact_analysis: true,
  telemetry: true
};

const DEFAULT_CONFIG: TeczFlowConfig = {
  tenantMode: true,
  defaultTenant: 'default',
  features: DEFAULT_FEATURES,
  telemetry: {
    enabled: true,
    defaultWindow: '24h',
    providers: [
      {
        id: 'mock-shopflow',
        type: 'mock',
        enabled: true,
        fixture: './fixtures/telemetry/checkout-errors.json'
      }
    ]
  },
  telemetryProviders: {
    'aws-cloudwatch': { enabled: false },
    'azure-monitor': { enabled: false }
  },
  tenants: {}
};

export class ConfigManager {
  private config: TeczFlowConfig;
  private configPath: string;
  private baseDir: string;

  constructor(configPath?: string) {
    this.configPath = configPath ?? findDefaultConfigPath();
    this.baseDir = dirname(this.configPath);
    this.config = this.load();
  }

  getConfig(): TeczFlowConfig {
    return structuredClone(this.config);
  }

  getBaseDir(): string {
    return this.baseDir;
  }

  getDefaultTenant(): string {
    return this.config.defaultTenant;
  }

  isFeatureEnabled(feature: keyof FeatureFlags): boolean {
    return this.config.features[feature] ?? false;
  }

  getFeatureFlags(): FeatureFlags {
    return structuredClone(this.config.features);
  }

  listTenants(): string[] {
    const tenants = new Set<string>([this.config.defaultTenant]);
    if (this.config.tenants) {
      for (const id of Object.keys(this.config.tenants)) {
        tenants.add(id);
      }
    }
    return Array.from(tenants);
  }

  getTelemetryProviders(tenantId?: string): TelemetryProviderConfig[] {
    if (!this.config.telemetry.enabled) return [];

    let providers = this.config.telemetry.providers.filter((p) => p.enabled);

    if (tenantId && this.config.tenants?.[tenantId]?.telemetry?.providers) {
      const tenantProviders = this.config.tenants[tenantId].telemetry!.providers!.filter(
        (p) => p.enabled
      );
      if (tenantProviders.length > 0) {
        providers = tenantProviders;
      }
    }

    return providers.map((p) => ({
      ...p,
      fixture: p.fixture ? this.resolvePath(p.fixture) : undefined,
      path: p.path ? this.resolvePath(p.path) : undefined
    }));
  }

  resolvePath(relativePath: string): string {
    if (relativePath.startsWith('/') || /^[A-Za-z]:/.test(relativePath)) {
      return relativePath;
    }
    return resolve(this.baseDir, relativePath);
  }

  private load(): TeczFlowConfig {
    if (!existsSync(this.configPath)) {
      return structuredClone(DEFAULT_CONFIG);
    }
    const raw = readFileSync(this.configPath, 'utf-8');
    const parsed = JSON.parse(raw) as Partial<TeczFlowConfig>;
    return deepMerge(structuredClone(DEFAULT_CONFIG), parsed);
  }
}

function findDefaultConfigPath(): string {
  const cwd = process.cwd();
  const candidates = [
    resolve(cwd, 'config.json'),
    resolve(cwd, '../../config.json'),
    resolve(dirname(fileURLToPath(import.meta.url)), '../../../../config.json')
  ];
  for (const p of candidates) {
    if (existsSync(p)) return p;
  }
  return resolve(cwd, 'config.json');
}

function deepMerge(base: TeczFlowConfig, override: Partial<TeczFlowConfig>): TeczFlowConfig {
  return {
    ...base,
    ...override,
    features: { ...base.features, ...override.features },
    telemetry: override.telemetry
      ? {
          ...base.telemetry,
          ...override.telemetry,
          providers: override.telemetry.providers ?? base.telemetry.providers
        }
      : base.telemetry,
    tenants: { ...base.tenants, ...override.tenants },
    telemetryProviders: { ...base.telemetryProviders, ...override.telemetryProviders }
  };
}
