/**
 * Telemetry Query Service
 * 
 * Provides a unified interface for querying telemetry data from various sources
 * including OpenTelemetry, Prometheus, logs, and database metrics
 */

import Reactory from '@reactorynet/reactory-core';
import logger from '@reactory/server-core/logging';

export interface TelemetryQueryParameter {
  key: string;
  value: string;
  type?: string;
}

export interface TelemetryTimeRange {
  start: string;
  end: string;
  timezone?: string;
}

export enum TelemetryDataSource {
  OTEL = 'OTEL',
  PROMETHEUS = 'PROMETHEUS',
  LOGS = 'LOGS',
  DATABASE = 'DATABASE'
}

export enum TelemetryAggregation {
  AVG = 'AVG',
  SUM = 'SUM',
  MIN = 'MIN',
  MAX = 'MAX',
  COUNT = 'COUNT',
  MEDIAN = 'MEDIAN',
  P95 = 'P95',
  P99 = 'P99',
  STDDEV = 'STDDEV'
}

export interface TelemetryQueryInput {
  connectionId?: string;
  source: TelemetryDataSource;
  query: string;
  parameters?: TelemetryQueryParameter[];
  timeRange?: TelemetryTimeRange;
  groupBy?: string[];
  aggregation?: TelemetryAggregation;
  limit?: number;
  offset?: number;
}

export interface PrometheusConnectionSettings {
  host: string;
  port: number;
  protocol: 'http' | 'https';
  username?: string;
  password?: string;
}

export interface LokiConnectionSettings {
  host: string;
  port: number;
  protocol: 'http' | 'https';
  username?: string;
  password?: string;
}

export interface JaegerConnectionSettings {
  host: string;
  port: number;
  protocol: 'http' | 'https';
  /**
   * Jaeger Query API port (default 16686). `port` is the ingest port
   * (agent 6831 / OTLP 4318) and is not usable for trace queries.
   */
  queryPort?: number;
}

export type TelemetryConnectionSettings = 
  | PrometheusConnectionSettings 
  | LokiConnectionSettings 
  | JaegerConnectionSettings;

export interface TelemetryDataPoint {
  timestamp: string;
  value: number;
  labels?: Record<string, any>;
}

export interface TelemetrySeries {
  name: string;
  labels?: Record<string, any>;
  data: TelemetryDataPoint[];
  unit?: string;
  metadata?: Record<string, any>;
}

export interface TelemetryQueryResult {
  query: string;
  connectionId?: string;
  source: TelemetryDataSource;
  series: TelemetrySeries[];
  totalSeries: number;
  totalDataPoints: number;
  executionTime?: number;
  warnings?: string[];
  metadata?: Record<string, any>;
}

export interface TelemetryMetric {
  name: string;
  description?: string;
  type: string;
  unit?: string;
  labels?: string[];
  source: TelemetryDataSource;
  connectionId?: string;
}

export interface TelemetryMetricsFilter {
  connectionId?: string;
  source?: TelemetryDataSource;
  type?: string;
  search?: string;
  labels?: string[];
}

export interface TelemetryMetricStats {
  metricName: string;
  timeRange: TelemetryTimeRange;
  avg?: number;
  min?: number;
  max?: number;
  sum?: number;
  count?: number;
  stddev?: number;
  percentiles?: Record<string, number>;
}

export interface TelemetryMetricStatsInput {
  metricName: string;
  source: TelemetryDataSource;
  timeRange: TelemetryTimeRange;
  filters?: TelemetryQueryParameter[];
}

export interface TelemetrySourceStatus {
  source: TelemetryDataSource;
  available: boolean;
  status: string;
  metricCount?: number;
  lastQuery?: string;
  metadata?: Record<string, any>;
}

// ── Logs (Loki) ──────────────────────────────────────────────────────────────

export interface TelemetryLogEntry {
  timestamp: string;
  line: string;
  level?: string;
}

export interface TelemetryLogStream {
  labels?: Record<string, any>;
  entries: TelemetryLogEntry[];
}

export interface TelemetryLogQueryInput {
  connectionId?: string;
  query: string;
  timeRange?: TelemetryTimeRange;
  limit?: number;
  direction?: 'backward' | 'forward';
}

export interface TelemetryLogQueryResult {
  query: string;
  connectionId?: string;
  streams: TelemetryLogStream[];
  totalEntries: number;
  executionTime?: number;
  warnings?: string[];
}

// ── Traces (Jaeger) ──────────────────────────────────────────────────────────

export interface TelemetryTraceSpan {
  spanId: string;
  parentSpanId?: string;
  operationName: string;
  serviceName?: string;
  startTime: string;
  /** milliseconds */
  duration: number;
  tags?: Record<string, any>;
  logs?: any[];
  status?: 'ok' | 'error';
}

export interface TelemetryTrace {
  traceId: string;
  spans: TelemetryTraceSpan[];
  startTime?: string;
  /** milliseconds */
  duration?: number;
  services?: string[];
  warnings?: string[];
}

export interface TelemetryTraceSummary {
  traceId: string;
  rootOperation?: string;
  rootService?: string;
  startTime?: string;
  /** milliseconds */
  duration?: number;
  spanCount: number;
  errorCount: number;
  services?: string[];
}

export interface TelemetryTraceSearchInput {
  connectionId?: string;
  service: string;
  operation?: string;
  tags?: Record<string, any>;
  minDuration?: string;
  maxDuration?: string;
  limit?: number;
  timeRange?: TelemetryTimeRange;
}

/**
 * Telemetry Query Service Implementation
 */
export class TelemetryQueryService implements Reactory.Service.IReactoryService {
  name: string = 'TelemetryQueryService';
  nameSpace: string = 'reactory';
  version: string = '1.0.0';
  context: Reactory.Server.IReactoryContext;
  
  // Service registration properties
  serviceType?: string = 'data';
  service?: any = this;
  dependencies?: Reactory.Service.IReactoryServiceDefinition<any>[];
  
  constructor(props: any, context: Reactory.Server.IReactoryContext) {
    this.context = context;
  }

  /**
   * Get connection settings from partner context or environment
   */
  private getConnectionSettings<T = TelemetryConnectionSettings>(
    connectionId?: string,
    source?: TelemetryDataSource
  ): T | null {
    // If connectionId is provided, try to get from partner settings
    if (connectionId && this.context.partner) {
      const setting = this.context.partner.getSetting<T>(connectionId);
      if (setting?.data) {
        this.context.log(
          `Using connection settings from partner: ${connectionId}`,
          { connectionId, source },
          'debug'
        );
        return setting.data as T;
      }
    }

    // Fall back to environment-based settings based on source
    if (source) {
      return this.getEnvironmentConnectionSettings<T>(source);
    }

    return null;
  }

  /**
   * Get connection settings from environment variables
   */
  private getEnvironmentConnectionSettings<T = TelemetryConnectionSettings>(
    source: TelemetryDataSource
  ): T | null {
    switch (source) {
      case TelemetryDataSource.PROMETHEUS:
        return {
          host: process.env.REACTORY_PROMETHEUS_HOST || process.env.PROMETHEUS_HOST || 'localhost',
          port: Number.parseInt(
            process.env.REACTORY_PROMETHEUS_PORT || process.env.PROMETHEUS_PORT || '9090'
          ),
          protocol: (process.env.REACTORY_PROMETHEUS_PROTOCOL || process.env.PROMETHEUS_PROTOCOL || 'http') as 'http' | 'https',
          username: process.env.REACTORY_PROMETHEUS_USERNAME || process.env.PROMETHEUS_USERNAME,
          password: process.env.REACTORY_PROMETHEUS_PASSWORD || process.env.PROMETHEUS_PASSWORD,
        } as T;

      case TelemetryDataSource.LOGS:
        return {
          host: process.env.REACTORY_LOKI_HOST || process.env.LOKI_HOST || 'localhost',
          port: Number.parseInt(
            process.env.REACTORY_LOKI_PORT || process.env.LOKI_PORT || '3100'
          ),
          protocol: (process.env.REACTORY_LOKI_PROTOCOL || process.env.LOKI_PROTOCOL || 'http') as 'http' | 'https',
          username: process.env.REACTORY_LOKI_USERNAME || process.env.LOKI_USERNAME,
          password: process.env.REACTORY_LOKI_PASSWORD || process.env.LOKI_PASSWORD,
        } as T;

      case TelemetryDataSource.OTEL:
        return {
          host: process.env.REACTORY_JAEGER_HOST || process.env.JAEGER_HOST || 'localhost',
          port: Number.parseInt(
            process.env.REACTORY_JAEGER_PORT || process.env.JAEGER_PORT || '6831'
          ),
          protocol: (process.env.REACTORY_JAEGER_PROTOCOL || process.env.JAEGER_PROTOCOL || 'http') as 'http' | 'https',
        } as T;

      default:
        return null;
    }
  }

  /**
   * Build connection URL from settings
   */
  private buildConnectionUrl(settings: PrometheusConnectionSettings | LokiConnectionSettings): string {
    const auth = settings.username && settings.password 
      ? `${settings.username}:${settings.password}@` 
      : '';
    return `${settings.protocol}://${auth}${settings.host}:${settings.port}`;
  }

  /**
   * Get parameter value with type casting
   */
  private getParameterValue(param: TelemetryQueryParameter): any {
    const { value, type } = param;
    
    if (!type) return value;
    
    switch (type.toLowerCase()) {
      case 'number':
      case 'int':
      case 'float':
        return parseFloat(value);
      case 'boolean':
      case 'bool':
        return value.toLowerCase() === 'true';
      case 'json':
      case 'object':
        try {
          return JSON.parse(value);
        } catch (error) {
          logger.warn('Failed to parse JSON parameter', { value, error });
          return value;
        }
      case 'array':
        try {
          const parsed = JSON.parse(value);
          return Array.isArray(parsed) ? parsed : [value];
        } catch (error) {
          return value.split(',').map(v => v.trim());
        }
      default:
        return value;
    }
  }

  /**
   * Convert parameters array to object
   */
  private parametersToObject(parameters?: TelemetryQueryParameter[]): Record<string, any> {
    if (!parameters || parameters.length === 0) return {};
    
    return parameters.reduce((acc, param) => {
      acc[param.key] = this.getParameterValue(param);
      return acc;
    }, {} as Record<string, any>);
  }

  /**
   * Parse time range to timestamps
   */
  private parseTimeRange(timeRange?: TelemetryTimeRange): { startMs: number; endMs: number } {
    if (!timeRange) {
      const endMs = Date.now();
      const startMs = endMs - (24 * 60 * 60 * 1000); // Default to last 24 hours
      return { startMs, endMs };
    }

    const { start, end } = timeRange;
    
    // Try to parse as ISO 8601 or Unix timestamp
    const startMs = isNaN(Number(start)) ? new Date(start).getTime() : Number(start);
    const endMs = isNaN(Number(end)) ? new Date(end).getTime() : Number(end);
    
    return { startMs, endMs };
  }

  /**
   * Query telemetry data from the specified source
   */
  async queryTelemetry(input: TelemetryQueryInput): Promise<TelemetryQueryResult> {
    const startTime = Date.now();
    
    try {
      const params = this.parametersToObject(input.parameters);
      const timeRange = this.parseTimeRange(input.timeRange);
      
      let result: TelemetryQueryResult;
      
      switch (input.source) {
        case TelemetryDataSource.OTEL:
          result = await this.queryOTEL(input, params, timeRange);
          break;
        case TelemetryDataSource.PROMETHEUS:
          result = await this.queryPrometheus(input, params, timeRange);
          break;
        case TelemetryDataSource.LOGS:
          result = await this.queryLogs(input, params, timeRange);
          break;
        case TelemetryDataSource.DATABASE:
          result = await this.queryDatabase(input, params, timeRange);
          break;
        default:
          throw new Error(`Unsupported data source: ${input.source}`);
      }
      
      result.executionTime = Date.now() - startTime;
      return result;
      
    } catch (error) {
      logger.error('Error querying telemetry data', { error, input });
      throw error;
    }
  }

  /**
   * Query OpenTelemetry data
   */
  private async queryOTEL(
    input: TelemetryQueryInput,
    params: Record<string, any>,
    timeRange: { startMs: number; endMs: number }
  ): Promise<TelemetryQueryResult> {
    // TODO: Implement OTEL query logic
    // This would connect to OTEL collector or backend storage
    
    logger.warn('OTEL query not fully implemented', { input });
    
    return {
      query: input.query,
      source: TelemetryDataSource.OTEL,
      series: [],
      totalSeries: 0,
      totalDataPoints: 0,
      warnings: ['OTEL query support is under development']
    };
  }

  /**
   * Query Prometheus data
   */
  private async queryPrometheus(
    input: TelemetryQueryInput,
    params: Record<string, any>,
    timeRange: { startMs: number; endMs: number }
  ): Promise<TelemetryQueryResult> {
    // Get connection settings from partner or environment
    const connectionSettings = this.getConnectionSettings<PrometheusConnectionSettings>(
      input.connectionId,
      TelemetryDataSource.PROMETHEUS
    );
    
    if (!connectionSettings) {
      throw new Error('Prometheus connection not configured. Please configure connection settings or set PROMETHEUS_URL environment variable.');
    }

    const prometheusUrl = this.buildConnectionUrl(connectionSettings);

    try {
      // Build Prometheus query
      const query = this.buildPrometheusQuery(input, params);
      const url = `${prometheusUrl}/api/v1/query_range`;
      
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          query,
          start: (timeRange.startMs / 1000).toString(),
          end: (timeRange.endMs / 1000).toString(),
          step: this.calculateStep(timeRange.startMs, timeRange.endMs).toString()
        })
      });

      if (!response.ok) {
        throw new Error(`Prometheus query failed: ${response.statusText}`);
      }

      const data = await response.json();

      return this.applyPagination(this.formatPrometheusResponse(data, input), input);

    } catch (error) {
      logger.error('Error querying Prometheus', { error, input });
      throw error;
    }
  }

  /**
   * Query application logs via Loki's query_range API.
   *
   * Metric-style LogQL (rate, count_over_time, ...) returns a matrix and maps
   * onto TelemetrySeries like Prometheus results, so the LOGS source works
   * from the generic charting pipeline. Stream results (raw log lines) are
   * mapped to per-entry value=1 points — use queryTelemetryLogs to read the
   * actual lines.
   */
  private async queryLogs(
    input: TelemetryQueryInput,
    params: Record<string, any>,
    timeRange: { startMs: number; endMs: number }
  ): Promise<TelemetryQueryResult> {
    const lokiUrl = this.getLokiUrl(input.connectionId);
    const warnings: string[] = [];

    const url = new URL(`${lokiUrl}/loki/api/v1/query_range`);
    url.searchParams.set('query', input.query);
    url.searchParams.set('start', `${timeRange.startMs}000000`); // ns
    url.searchParams.set('end', `${timeRange.endMs}000000`);
    url.searchParams.set('step', `${this.calculateStep(timeRange.startMs, timeRange.endMs)}s`);
    if (input.limit && input.limit > 0) url.searchParams.set('limit', String(input.limit));

    const response = await fetch(url.toString());
    if (!response.ok) {
      const body = await response.text().catch(() => '');
      throw new Error(`Loki query failed: ${response.statusText}${body ? ` — ${body.slice(0, 200)}` : ''}`);
    }

    const data = await response.json();
    const series: TelemetrySeries[] = [];

    if (data.status === 'success' && data.data?.result) {
      const resultType = data.data.resultType;

      if (resultType === 'matrix') {
        for (const result of data.data.result) {
          series.push({
            name: this.lokiStreamName(result.metric),
            labels: result.metric,
            data: (result.values || []).map(([timestamp, value]: [number, string]) => ({
              timestamp: new Date(timestamp * 1000).toISOString(),
              value: parseFloat(value),
              labels: result.metric,
            })),
          });
        }
      } else if (resultType === 'streams') {
        warnings.push('Stream (log line) result mapped to event points — use queryTelemetryLogs to read log lines');
        for (const stream of data.data.result) {
          series.push({
            name: this.lokiStreamName(stream.stream),
            labels: stream.stream,
            data: (stream.values || []).map(([timestampNs]: [string, string]) => ({
              timestamp: new Date(Number(timestampNs) / 1e6).toISOString(),
              value: 1,
              labels: stream.stream,
            })),
          });
        }
      }
    }

    const result: TelemetryQueryResult = {
      query: input.query,
      connectionId: input.connectionId,
      source: TelemetryDataSource.LOGS,
      series,
      totalSeries: series.length,
      totalDataPoints: series.reduce((sum, s) => sum + s.data.length, 0),
      ...(warnings.length > 0 ? { warnings } : {}),
    };

    return this.applyPagination(result, input);
  }

  /**
   * Query raw log lines from Loki (LogQL streams).
   */
  async queryTelemetryLogs(input: TelemetryLogQueryInput): Promise<TelemetryLogQueryResult> {
    const startTime = Date.now();
    const lokiUrl = this.getLokiUrl(input.connectionId);
    const { startMs, endMs } = this.parseTimeRange(input.timeRange);

    const url = new URL(`${lokiUrl}/loki/api/v1/query_range`);
    url.searchParams.set('query', input.query);
    url.searchParams.set('start', `${startMs}000000`); // ns
    url.searchParams.set('end', `${endMs}000000`);
    url.searchParams.set('limit', String(input.limit && input.limit > 0 ? Math.min(input.limit, 5000) : 500));
    url.searchParams.set('direction', input.direction === 'forward' ? 'forward' : 'backward');

    const response = await fetch(url.toString());
    if (!response.ok) {
      const body = await response.text().catch(() => '');
      throw new Error(`Loki query failed: ${response.statusText}${body ? ` — ${body.slice(0, 200)}` : ''}`);
    }

    const data = await response.json();
    const streams: TelemetryLogStream[] = [];
    const warnings: string[] = [];

    if (data.status === 'success' && data.data?.result) {
      if (data.data.resultType !== 'streams') {
        warnings.push(`Expected a streams result, got ${data.data.resultType} — use queryTelemetry for metric LogQL`);
      } else {
        for (const stream of data.data.result) {
          const labels = stream.stream || {};
          streams.push({
            labels,
            entries: (stream.values || []).map(([timestampNs, line]: [string, string]) => ({
              timestamp: new Date(Number(timestampNs) / 1e6).toISOString(),
              line,
              level: this.detectLogLevel(labels, line),
            })),
          });
        }
      }
    }

    return {
      query: input.query,
      connectionId: input.connectionId,
      streams,
      totalEntries: streams.reduce((sum, stream) => sum + stream.entries.length, 0),
      executionTime: Date.now() - startTime,
      ...(warnings.length > 0 ? { warnings } : {}),
    };
  }

  /**
   * Query database metrics
   */
  private async queryDatabase(
    input: TelemetryQueryInput,
    params: Record<string, any>,
    timeRange: { startMs: number; endMs: number }
  ): Promise<TelemetryQueryResult> {
    // TODO: Implement database query logic for stored metrics
    // This would query metrics stored via ReactoryTelemetry persistence
    
    logger.warn('Database query not fully implemented', { input });
    
    return {
      query: input.query,
      source: TelemetryDataSource.DATABASE,
      series: [],
      totalSeries: 0,
      totalDataPoints: 0,
      warnings: ['Database query support is under development']
    };
  }

  /**
   * List available metrics.
   *
   * PROMETHEUS (the default) is served from the Prometheus HTTP API:
   * /api/v1/label/__name__/values for the catalogue and /api/v1/metadata for
   * type/help/unit enrichment. Other sources return [] until their query
   * backends are implemented (OTEL/LOGS/DATABASE).
   */
  async listMetrics(filter?: TelemetryMetricsFilter): Promise<TelemetryMetric[]> {
    const source = filter?.source ?? TelemetryDataSource.PROMETHEUS;

    if (source !== TelemetryDataSource.PROMETHEUS) {
      logger.warn('listMetrics is only implemented for PROMETHEUS', { filter });
      return [];
    }

    const connectionSettings = this.getConnectionSettings<PrometheusConnectionSettings>(
      filter?.connectionId,
      TelemetryDataSource.PROMETHEUS
    );

    if (!connectionSettings) {
      logger.warn('listMetrics: Prometheus connection not configured', { filter });
      return [];
    }

    const prometheusUrl = this.buildConnectionUrl(connectionSettings);

    try {
      const [namesResponse, metadataResponse] = await Promise.all([
        fetch(`${prometheusUrl}/api/v1/label/__name__/values`),
        fetch(`${prometheusUrl}/api/v1/metadata`),
      ]);

      if (!namesResponse.ok) {
        throw new Error(`Prometheus label values request failed: ${namesResponse.statusText}`);
      }

      const namesData = await namesResponse.json();
      const names: string[] = namesData.status === 'success' && Array.isArray(namesData.data)
        ? namesData.data
        : [];

      // Metadata is best-effort enrichment — a failure should not empty the catalogue
      let metadata: Record<string, { type?: string; help?: string; unit?: string }[]> = {};
      if (metadataResponse.ok) {
        const metadataData = await metadataResponse.json();
        if (metadataData.status === 'success' && metadataData.data) {
          metadata = metadataData.data;
        }
      }

      let metrics: TelemetryMetric[] = names.map((name) => {
        const meta = metadata[name]?.[0];
        return {
          name,
          description: meta?.help || undefined,
          type: meta?.type || 'unknown',
          unit: meta?.unit || undefined,
          source: TelemetryDataSource.PROMETHEUS,
          connectionId: filter?.connectionId,
        };
      });

      if (filter?.type) {
        const type = filter.type.toLowerCase();
        metrics = metrics.filter((metric) => metric.type.toLowerCase() === type);
      }

      if (filter?.search) {
        const search = filter.search.toLowerCase();
        metrics = metrics.filter(
          (metric) =>
            metric.name.toLowerCase().includes(search) ||
            (metric.description || '').toLowerCase().includes(search)
        );
      }

      return metrics;
    } catch (error) {
      logger.error('Error listing Prometheus metrics', { error, filter });
      return [];
    }
  }

  /**
   * Get metric statistics
   */
  async getMetricStats(input: TelemetryMetricStatsInput): Promise<TelemetryMetricStats> {
    // Query the metric data
    const queryInput: TelemetryQueryInput = {
      source: input.source,
      query: input.metricName,
      timeRange: input.timeRange,
      parameters: input.filters
    };
    
    const result = await this.queryTelemetry(queryInput);
    
    // Calculate statistics from the result
    return this.calculateStats(result, input.metricName, input.timeRange);
  }

  /**
   * Get telemetry source status
   */
  async getSources(): Promise<TelemetrySourceStatus[]> {
    const sources: TelemetrySourceStatus[] = [];
    
    // Check Prometheus
    const prometheusSettings = this.getConnectionSettings<PrometheusConnectionSettings>(
      undefined,
      TelemetryDataSource.PROMETHEUS
    );
    const prometheusUrl = prometheusSettings ? this.buildConnectionUrl(prometheusSettings) : null;
    
    // Also check for partner-specific Prometheus connections
    const partnerPrometheusSettings = this.context.partner?.settings?.filter(
      s => s.name?.includes('prometheus') || s.componentFqn?.includes('Prometheus')
    ) || [];
    
    sources.push({
      source: TelemetryDataSource.PROMETHEUS,
      available: !!prometheusUrl || partnerPrometheusSettings.length > 0,
      status: prometheusUrl ? 'configured' : partnerPrometheusSettings.length > 0 ? 'partner_configured' : 'not_configured',
      metricCount: partnerPrometheusSettings.length,
      metadata: { 
        url: prometheusUrl,
        partnerConnections: partnerPrometheusSettings.map(s => s.name)
      }
    });
    
    // Check OTEL/Jaeger
    const jaegerSettings = this.getConnectionSettings<JaegerConnectionSettings>(
      undefined,
      TelemetryDataSource.OTEL
    );
    const partnerJaegerSettings = this.context.partner?.settings?.filter(
      s => s.name?.includes('jaeger') || s.componentFqn?.includes('Jaeger')
    ) || [];
    
    sources.push({
      source: TelemetryDataSource.OTEL,
      available: !!jaegerSettings || partnerJaegerSettings.length > 0,
      status: jaegerSettings ? 'configured' : partnerJaegerSettings.length > 0 ? 'partner_configured' : 'not_configured',
      metricCount: partnerJaegerSettings.length,
      metadata: {
        partnerConnections: partnerJaegerSettings.map(s => s.name)
      }
    });
    
    // Check Logs/Loki
    const lokiSettings = this.getConnectionSettings<LokiConnectionSettings>(
      undefined,
      TelemetryDataSource.LOGS
    );
    const partnerLokiSettings = this.context.partner?.settings?.filter(
      s => s.name?.includes('loki') || s.componentFqn?.includes('Loki')
    ) || [];
    
    sources.push({
      source: TelemetryDataSource.LOGS,
      available: !!lokiSettings || partnerLokiSettings.length > 0,
      status: lokiSettings ? 'configured' : partnerLokiSettings.length > 0 ? 'partner_configured' : 'not_configured',
      metricCount: partnerLokiSettings.length,
      metadata: {
        partnerConnections: partnerLokiSettings.map(s => s.name)
      }
    });
    
    // Check Database
    sources.push({
      source: TelemetryDataSource.DATABASE,
      available: false,
      status: 'not_implemented'
    });
    
    return sources;
  }

  // ── Traces (Jaeger Query API) ──────────────────────────────────────────────

  /**
   * Search traces by service/operation/tags/duration.
   */
  async searchTraces(input: TelemetryTraceSearchInput): Promise<TelemetryTraceSummary[]> {
    const jaegerUrl = this.getJaegerQueryUrl(input.connectionId);
    const { startMs, endMs } = this.parseTimeRange(input.timeRange);

    const url = new URL(`${jaegerUrl}/api/traces`);
    url.searchParams.set('service', input.service);
    if (input.operation) url.searchParams.set('operation', input.operation);
    if (input.tags && Object.keys(input.tags).length > 0) url.searchParams.set('tags', JSON.stringify(input.tags));
    if (input.minDuration) url.searchParams.set('minDuration', input.minDuration);
    if (input.maxDuration) url.searchParams.set('maxDuration', input.maxDuration);
    url.searchParams.set('limit', String(input.limit && input.limit > 0 ? input.limit : 20));
    url.searchParams.set('start', `${startMs}000`); // µs
    url.searchParams.set('end', `${endMs}000`);

    const response = await fetch(url.toString());
    if (!response.ok) {
      throw new Error(`Jaeger trace search failed: ${response.statusText}`);
    }

    const data = await response.json();
    return (data.data || []).map((trace: any) => this.summarizeJaegerTrace(trace));
  }

  /**
   * Fetch one trace with all its spans.
   */
  async getTrace(traceId: string, connectionId?: string): Promise<TelemetryTrace> {
    const jaegerUrl = this.getJaegerQueryUrl(connectionId);

    const response = await fetch(`${jaegerUrl}/api/traces/${encodeURIComponent(traceId)}`);
    if (!response.ok) {
      throw new Error(`Jaeger trace lookup failed: ${response.statusText}`);
    }

    const data = await response.json();
    const trace = (data.data || [])[0];
    if (!trace) {
      throw new Error(`Trace not found: ${traceId}`);
    }

    return this.mapJaegerTrace(trace);
  }

  /**
   * List the service names known to Jaeger.
   */
  async listTraceServices(connectionId?: string): Promise<string[]> {
    const jaegerUrl = this.getJaegerQueryUrl(connectionId);

    const response = await fetch(`${jaegerUrl}/api/services`);
    if (!response.ok) {
      throw new Error(`Jaeger services request failed: ${response.statusText}`);
    }

    const data = await response.json();
    return (data.data || []).filter((service: unknown) => typeof service === 'string');
  }

  // Helper methods

  private getLokiUrl(connectionId?: string): string {
    const settings = this.getConnectionSettings<LokiConnectionSettings>(connectionId, TelemetryDataSource.LOGS);
    if (!settings) {
      throw new Error('Loki connection not configured. Configure a partner connection or REACTORY_LOKI_HOST/PORT.');
    }
    return this.buildConnectionUrl(settings);
  }

  /**
   * Resolve the Jaeger QUERY API base URL. The stored connection's `port` is
   * the ingest port (agent/OTLP); trace queries use `queryPort` when set,
   * else REACTORY_JAEGER_QUERY_PORT, else Jaeger's default 16686.
   */
  private getJaegerQueryUrl(connectionId?: string): string {
    const settings = this.getConnectionSettings<JaegerConnectionSettings>(connectionId, TelemetryDataSource.OTEL);
    if (!settings) {
      throw new Error('Jaeger connection not configured. Configure a partner connection or REACTORY_JAEGER_HOST.');
    }
    const queryPort = settings.queryPort
      || Number.parseInt(process.env.REACTORY_JAEGER_QUERY_PORT || '16686');
    return `${settings.protocol}://${settings.host}:${queryPort}`;
  }

  private lokiStreamName(labels: Record<string, any> = {}): string {
    const pairs = Object.entries(labels)
      .filter(([key]) => key !== '__name__')
      .map(([key, value]) => `${key}="${value}"`);
    return labels.__name__ || (pairs.length > 0 ? `{${pairs.join(',')}}` : 'logs');
  }

  private detectLogLevel(labels: Record<string, any>, line: string): string | undefined {
    const labelled = labels.level || labels.detected_level || labels.severity;
    if (labelled) return String(labelled).toLowerCase();
    const match = /\b(fatal|error|warn(?:ing)?|info|debug|trace)\b/i.exec(line);
    if (!match) return undefined;
    const level = match[1].toLowerCase();
    return level === 'warning' ? 'warn' : level;
  }

  private summarizeJaegerTrace(trace: any): TelemetryTraceSummary {
    const spans: any[] = trace.spans || [];
    const processes: Record<string, { serviceName?: string }> = trace.processes || {};

    const root = spans.reduce((earliest: any, span: any) => {
      const isRoot = !(span.references || []).some((ref: any) => ref.refType === 'CHILD_OF');
      if (isRoot && (!earliest || span.startTime < earliest.startTime)) return span;
      return earliest;
    }, null) || spans.reduce((earliest: any, span: any) => (!earliest || span.startTime < earliest.startTime ? span : earliest), null);

    const startUs = spans.length > 0 ? Math.min(...spans.map((span: any) => span.startTime)) : undefined;
    const endUs = spans.length > 0 ? Math.max(...spans.map((span: any) => span.startTime + (span.duration || 0))) : undefined;

    return {
      traceId: trace.traceID,
      rootOperation: root?.operationName,
      rootService: root ? processes[root.processID]?.serviceName : undefined,
      startTime: startUs !== undefined ? new Date(startUs / 1000).toISOString() : undefined,
      duration: startUs !== undefined && endUs !== undefined ? (endUs - startUs) / 1000 : undefined,
      spanCount: spans.length,
      errorCount: spans.filter((span: any) => this.isErrorSpan(span)).length,
      services: Array.from(new Set(Object.values(processes).map((process) => process.serviceName).filter(Boolean))) as string[],
    };
  }

  private mapJaegerTrace(trace: any): TelemetryTrace {
    const processes: Record<string, { serviceName?: string }> = trace.processes || {};
    const spans: TelemetryTraceSpan[] = (trace.spans || []).map((span: any) => {
      const parentRef = (span.references || []).find((ref: any) => ref.refType === 'CHILD_OF');
      const tags = (span.tags || []).reduce((acc: Record<string, any>, tag: any) => {
        acc[tag.key] = tag.value;
        return acc;
      }, {});
      return {
        spanId: span.spanID,
        parentSpanId: parentRef?.spanID,
        operationName: span.operationName,
        serviceName: processes[span.processID]?.serviceName,
        startTime: new Date(span.startTime / 1000).toISOString(),
        duration: (span.duration || 0) / 1000,
        tags,
        logs: span.logs || [],
        status: this.isErrorSpan(span) ? 'error' : 'ok',
      };
    });

    spans.sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());

    const summary = this.summarizeJaegerTrace(trace);

    return {
      traceId: trace.traceID,
      spans,
      startTime: summary.startTime,
      duration: summary.duration,
      services: summary.services,
      ...(trace.warnings && trace.warnings.length > 0 ? { warnings: trace.warnings } : {}),
    };
  }

  private isErrorSpan(span: any): boolean {
    return (span.tags || []).some(
      (tag: any) =>
        (tag.key === 'error' && (tag.value === true || tag.value === 'true')) ||
        (tag.key === 'otel.status_code' && tag.value === 'ERROR'),
    );
  }

  /**
   * TelemetryAggregation -> PromQL aggregation operator. Quantile-style
   * aggregations (MEDIAN/P95/P99) need a parameter — `quantile(0.95, expr)` —
   * the enum value lowercased is NOT a valid PromQL function for those.
   */
  private static readonly PROMQL_AGGREGATIONS: Record<TelemetryAggregation, { fn: string; param?: number }> = {
    [TelemetryAggregation.AVG]: { fn: 'avg' },
    [TelemetryAggregation.SUM]: { fn: 'sum' },
    [TelemetryAggregation.MIN]: { fn: 'min' },
    [TelemetryAggregation.MAX]: { fn: 'max' },
    [TelemetryAggregation.COUNT]: { fn: 'count' },
    [TelemetryAggregation.MEDIAN]: { fn: 'quantile', param: 0.5 },
    [TelemetryAggregation.P95]: { fn: 'quantile', param: 0.95 },
    [TelemetryAggregation.P99]: { fn: 'quantile', param: 0.99 },
    [TelemetryAggregation.STDDEV]: { fn: 'stddev' },
  };

  private buildPrometheusQuery(input: TelemetryQueryInput, params: Record<string, any>): string {
    let query = input.query;

    if (input.aggregation) {
      const aggregation = TelemetryQueryService.PROMQL_AGGREGATIONS[input.aggregation];
      if (!aggregation) {
        throw new Error(`Unsupported aggregation: ${input.aggregation}`);
      }
      const byClause = input.groupBy && input.groupBy.length > 0
        ? ` by (${input.groupBy.join(',')})`
        : '';
      const args = aggregation.param !== undefined ? `${aggregation.param}, ${query}` : query;
      query = `${aggregation.fn}${byClause} (${args})`;
    }

    return query;
  }

  /**
   * Apply limit/offset pagination to the series list. totalSeries keeps the
   * pre-pagination count so clients can page.
   */
  private applyPagination(result: TelemetryQueryResult, input: TelemetryQueryInput): TelemetryQueryResult {
    const { limit, offset } = input;
    if (limit === undefined && offset === undefined) return result;

    const start = offset && offset > 0 ? offset : 0;
    const end = limit && limit > 0 ? start + limit : undefined;
    const page = result.series.slice(start, end);

    return {
      ...result,
      series: page,
      totalDataPoints: page.reduce((sum, s) => sum + s.data.length, 0),
      metadata: {
        ...(result.metadata || {}),
        pagination: { offset: start, limit: limit ?? null, returnedSeries: page.length },
      },
    };
  }

  private calculateStep(startMs: number, endMs: number): number {
    const durationMs = endMs - startMs;
    const maxPoints = 1000; // Limit resolution
    return Math.max(Math.floor(durationMs / maxPoints / 1000), 1);
  }

  private formatPrometheusResponse(data: any, input: TelemetryQueryInput): TelemetryQueryResult {
    const series: TelemetrySeries[] = [];
    
    if (data.status === 'success' && data.data?.result) {
      for (const result of data.data.result) {
        const seriesData: TelemetryDataPoint[] = result.values.map(([timestamp, value]: [number, string]) => ({
          timestamp: new Date(timestamp * 1000).toISOString(),
          value: parseFloat(value),
          labels: result.metric
        }));
        
        series.push({
          name: result.metric.__name__ || 'unknown',
          labels: result.metric,
          data: seriesData,
          unit: result.metric.unit
        });
      }
    }
    
    const totalDataPoints = series.reduce((sum, s) => sum + s.data.length, 0);
    
    return {
      query: input.query,
      connectionId: input.connectionId,
      source: TelemetryDataSource.PROMETHEUS,
      series,
      totalSeries: series.length,
      totalDataPoints
    };
  }

  private calculateStats(result: TelemetryQueryResult, metricName: string, timeRange: TelemetryTimeRange): TelemetryMetricStats {
    const allValues: number[] = [];
    
    for (const series of result.series) {
      for (const point of series.data) {
        allValues.push(point.value);
      }
    }
    
    if (allValues.length === 0) {
      return {
        metricName,
        timeRange,
        count: 0
      };
    }
    
    allValues.sort((a, b) => a - b);
    
    const sum = allValues.reduce((a, b) => a + b, 0);
    const avg = sum / allValues.length;
    const min = allValues[0];
    const max = allValues[allValues.length - 1];
    
    // Calculate standard deviation
    const variance = allValues.reduce((acc, val) => acc + Math.pow(val - avg, 2), 0) / allValues.length;
    const stddev = Math.sqrt(variance);
    
    // Calculate percentiles
    const p50 = allValues[Math.floor(allValues.length * 0.5)];
    const p95 = allValues[Math.floor(allValues.length * 0.95)];
    const p99 = allValues[Math.floor(allValues.length * 0.99)];
    
    return {
      metricName,
      timeRange,
      avg,
      min,
      max,
      sum,
      count: allValues.length,
      stddev,
      percentiles: { p50, p95, p99 }
    };
  }

  // Lifecycle methods
  async onStart?(): Promise<void> {
    logger.info('TelemetryQueryService started');
  }

  async onStartComplete?(): Promise<void> {
    // Nothing to do
  }
}

export default TelemetryQueryService;
