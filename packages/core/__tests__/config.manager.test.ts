import { describe, it, expect } from 'vitest';
import { ConfigManager } from '@teczflow/core';
import { resolve } from 'node:path';

describe('ConfigManager', () => {
  it('loads config with defaults', () => {
    const configPath = resolve(process.cwd(), 'config.json');
    const mgr = new ConfigManager(configPath);
    const config = mgr.getConfig();

    expect(config.tenantMode).toBe(true);
    expect(config.features.openapi).toBe(true);
    expect(config.features.telemetry).toBe(true);
  });

  it('returns feature flags', () => {
    const configPath = resolve(process.cwd(), 'config.json');
    const mgr = new ConfigManager(configPath);
    expect(mgr.isFeatureEnabled('workflow_inference')).toBe(true);
  });

  it('lists tenants', () => {
    const configPath = resolve(process.cwd(), 'config.json');
    const mgr = new ConfigManager(configPath);
    expect(mgr.listTenants()).toContain('default');
  });

  it('resolves telemetry providers', () => {
    const configPath = resolve(process.cwd(), 'config.json');
    const mgr = new ConfigManager(configPath);
    const providers = mgr.getTelemetryProviders();
    expect(providers.some((p) => p.type === 'mock')).toBe(true);
  });
});
