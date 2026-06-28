import { describe, it, expect } from 'vitest';
import { TelemetryNormalizer, MockTelemetryAdapter } from '@mytecz/teczflow-core';
import { resolve } from 'node:path';

describe('TelemetryNormalizer', () => {
  it('normalizes mock fixture', () => {
    const signals = TelemetryNormalizer.fromMockFixture({
      logs: [{ timestamp: '2026-01-01', method: 'POST', path: '/payments', status: 400, message: 'error' }],
      metrics: [{ name: 'errors', value: 10 }],
      traces: [{ traceId: 't1', spanId: 's1', serviceName: 'pay', operationName: 'POST', durationMs: 100 }]
    });
    expect(signals.logs).toHaveLength(1);
    expect(signals.metrics).toHaveLength(1);
    expect(signals.traces).toHaveLength(1);
  });

  it('parses json log lines', () => {
    const lines = [
      '{"timestamp":"2026-01-01","method":"POST","path":"/payments","status":400,"message":"missing field"}'
    ];
    const signals = TelemetryNormalizer.fromLogLines(lines, 'json');
    expect(signals.logs[0].method).toBe('POST');
    expect(signals.logs[0].status).toBe(400);
  });
});

describe('MockTelemetryAdapter', () => {
  it('loads fixture file', async () => {
    const adapter = new MockTelemetryAdapter();
    await adapter.connect({
      id: 'test',
      type: 'mock',
      enabled: true,
      fixture: resolve(process.cwd(), 'fixtures/telemetry/checkout-errors.json')
    }, { tenantId: 'default' });
    const signals = await adapter.fetchSignals();
    expect(signals.logs.length).toBeGreaterThan(0);
  });
});
