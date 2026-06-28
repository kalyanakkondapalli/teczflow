import type {
  NormalizedLogEvent,
  NormalizedMetricPoint,
  NormalizedSignals,
  NormalizedSpan
} from '../types/index.js';

export class TelemetryNormalizer {
  static fromMockFixture(data: MockTelemetryFixture): NormalizedSignals {
    return {
      logs: (data.logs ?? []).map(normalizeLog),
      metrics: (data.metrics ?? []).map(normalizeMetric),
      traces: (data.traces ?? []).map(normalizeSpan)
    };
  }

  static fromLogLines(lines: string[], parser: string = 'json'): NormalizedSignals {
    const logs: NormalizedLogEvent[] = [];
    for (const line of lines) {
      if (!line.trim()) continue;
      try {
        if (parser === 'json') {
          const parsed = JSON.parse(line) as Record<string, unknown>;
          logs.push({
            timestamp: String(parsed.timestamp ?? new Date().toISOString()),
            method: String(parsed.method ?? parsed.httpMethod ?? ''),
            path: String(parsed.path ?? parsed.httpRoute ?? parsed.uri ?? ''),
            status: Number(parsed.status ?? parsed.statusCode ?? 0),
            latencyMs: Number(parsed.latencyMs ?? parsed.duration ?? 0),
            message: String(parsed.message ?? parsed.error ?? ''),
            service: String(parsed.service ?? parsed.serviceName ?? ''),
            requestId: String(parsed.requestId ?? parsed.traceId ?? '')
          });
        } else {
          logs.push(parseAccessLogLine(line));
        }
      } catch {
        logs.push(parseAccessLogLine(line));
      }
    }
    return { logs, metrics: [], traces: [] };
  }
}

export interface MockTelemetryFixture {
  logs?: Array<Record<string, unknown>>;
  metrics?: Array<Record<string, unknown>>;
  traces?: Array<Record<string, unknown>>;
}

function normalizeLog(raw: Record<string, unknown>): NormalizedLogEvent {
  return {
    timestamp: String(raw.timestamp ?? new Date().toISOString()),
    method: raw.method ? String(raw.method) : undefined,
    path: raw.path ? String(raw.path) : undefined,
    status: raw.status ? Number(raw.status) : undefined,
    latencyMs: raw.latencyMs ? Number(raw.latencyMs) : undefined,
    message: raw.message ? String(raw.message) : undefined,
    service: raw.service ? String(raw.service) : undefined,
    requestId: raw.requestId ? String(raw.requestId) : undefined
  };
}

function normalizeMetric(raw: Record<string, unknown>): NormalizedMetricPoint {
  return {
    name: String(raw.name ?? 'unknown'),
    value: Number(raw.value ?? 0),
    unit: raw.unit ? String(raw.unit) : undefined,
    timestamp: String(raw.timestamp ?? new Date().toISOString()),
    tags: raw.tags as Record<string, string> | undefined
  };
}

function normalizeSpan(raw: Record<string, unknown>): NormalizedSpan {
  return {
    traceId: String(raw.traceId ?? 'trace-unknown'),
    spanId: String(raw.spanId ?? 'span-unknown'),
    parentSpanId: raw.parentSpanId ? String(raw.parentSpanId) : undefined,
    serviceName: String(raw.serviceName ?? raw.service ?? 'unknown'),
    operationName: String(raw.operationName ?? raw.name ?? 'unknown'),
    httpMethod: raw.httpMethod ? String(raw.httpMethod) : undefined,
    httpRoute: raw.httpRoute ? String(raw.httpRoute) : undefined,
    statusCode: raw.statusCode ? Number(raw.statusCode) : undefined,
    durationMs: Number(raw.durationMs ?? raw.duration ?? 0),
    timestamp: String(raw.timestamp ?? new Date().toISOString())
  };
}

function parseAccessLogLine(line: string): NormalizedLogEvent {
  const parts = line.split(' ');
  const method = parts.find((p) => /^(GET|POST|PUT|PATCH|DELETE)$/i.test(p));
  const path = parts.find((p) => p.startsWith('/'));
  const status = parts.find((p) => /^[45]\d{2}$/.test(p));
  return {
    timestamp: new Date().toISOString(),
    method: method?.toUpperCase(),
    path,
    status: status ? parseInt(status, 10) : undefined,
    message: line
  };
}
