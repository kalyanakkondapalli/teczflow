export type NodeType =
  | 'API'
  | 'Endpoint'
  | 'Schema'
  | 'Service'
  | 'Auth'
  | 'Workflow'
  | 'Tag'
  | 'Parameter'
  | 'Response';

export type EdgeType =
  | 'depends_on'
  | 'calls'
  | 'uses_schema'
  | 'belongs_to'
  | 'triggers'
  | 'observed_calls'
  | 'observed_error'
  | 'monitored_by'
  | 'tagged_with'
  | 'implements';

export interface GraphNode {
  id: string;
  type: NodeType;
  label: string;
  properties: Record<string, unknown>;
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  type: EdgeType;
  properties?: Record<string, unknown>;
}

export interface GraphSnapshot {
  tenantId: string;
  nodes: GraphNode[];
  edges: GraphEdge[];
  updatedAt: string;
}

export interface TenantContext {
  tenantId: string;
}

export interface Evidence {
  type: 'schema' | 'graph' | 'telemetry' | 'rule' | 'tag' | 'git' | 'log';
  detail: string;
  nodeId?: string;
  source?: string;
}

export type Confidence = 'high' | 'medium' | 'low';

export interface ReasoningResult {
  conclusion: string;
  confidence: Confidence;
  evidence: Evidence[];
  suggestedNextSteps?: string[];
}

export interface WorkflowStep {
  order: number;
  endpointId: string;
  method: string;
  path: string;
  label: string;
  reason: string;
}

export interface WorkflowResult extends ReasoningResult {
  steps: WorkflowStep[];
  goal: string;
}

export interface ImpactItem {
  nodeId: string;
  type: NodeType;
  label: string;
  impact: string;
  severity: 'high' | 'medium' | 'low';
}

export interface ImpactResult extends ReasoningResult {
  changedNodeId: string;
  affected: ImpactItem[];
}

export interface ApiSummary {
  apiId: string;
  name: string;
  description?: string;
  endpointCount: number;
  services: string[];
  tags: string[];
  authSchemes: string[];
}

export interface EndpointInfo {
  id: string;
  method: string;
  path: string;
  operationId?: string;
  summary?: string;
  tags: string[];
  apiId: string;
}

export interface SearchResult {
  nodeId: string;
  type: NodeType;
  label: string;
  score: number;
  snippet: string;
}

export interface NormalizedLogEvent {
  timestamp: string;
  method?: string;
  path?: string;
  status?: number;
  latencyMs?: number;
  message?: string;
  service?: string;
  requestId?: string;
}

export interface NormalizedMetricPoint {
  name: string;
  value: number;
  unit?: string;
  timestamp: string;
  tags?: Record<string, string>;
}

export interface NormalizedSpan {
  traceId: string;
  spanId: string;
  parentSpanId?: string;
  serviceName: string;
  operationName: string;
  httpMethod?: string;
  httpRoute?: string;
  statusCode?: number;
  durationMs: number;
  timestamp: string;
}

export interface NormalizedSignals {
  logs: NormalizedLogEvent[];
  metrics: NormalizedMetricPoint[];
  traces: NormalizedSpan[];
}

export interface TelemetryQuery {
  window?: string;
  endpoint?: string;
  service?: string;
}

export interface IngestResult {
  nodesAdded: number;
  edgesAdded: number;
  source: string;
}

export interface AdapterInput {
  type: 'file' | 'content';
  path?: string;
  content?: string;
  format?: 'openapi' | 'postman' | 'graphql' | 'logs' | 'git' | 'telemetry';
}

export interface SourceAdapter {
  name: string;
  format: string;
  canHandle(input: AdapterInput): boolean;
  ingest(input: AdapterInput, ctx: TenantContext): Promise<IngestResult>;
}

export interface TelemetryProviderConfig {
  id: string;
  type: 'mock' | 'logfile' | 'otlp' | 'aws-cloudwatch' | 'azure-monitor';
  enabled: boolean;
  fixture?: string;
  path?: string;
  parser?: string;
  endpoint?: string;
  headers?: Record<string, string>;
}

export interface FeatureFlags {
  openapi: boolean;
  postman: boolean;
  graphql: boolean;
  logs: boolean;
  git: boolean;
  observability: boolean;
  workflow_inference: boolean;
  impact_analysis: boolean;
  telemetry: boolean;
}

export interface TenantConfig {
  telemetry?: {
    providers?: TelemetryProviderConfig[];
  };
}

export interface TeczFlowConfig {
  tenantMode: boolean;
  defaultTenant: string;
  features: FeatureFlags;
  telemetry: {
    enabled: boolean;
    defaultWindow: string;
    providers: TelemetryProviderConfig[];
  };
  telemetryProviders?: Record<string, { enabled: boolean }>;
  tenants?: Record<string, TenantConfig>;
}

export interface GraphStore {
  load(tenantId: string): Promise<GraphSnapshot | null>;
  save(tenantId: string, snapshot: GraphSnapshot): Promise<void>;
  delete(tenantId: string): Promise<void>;
}
