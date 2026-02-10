/**
 * Telemetry Query Service
 * 
 * Provides a unified interface for querying telemetry data from various sources
 * including OpenTelemetry, Prometheus, logs, and database metrics
 */

import Reactory from '@reactory/reactory-core';
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
}

export interface TelemetryMetricsFilter {
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
      
      return this.formatPrometheusResponse(data, input);
      
    } catch (error) {
      logger.error('Error querying Prometheus', { error, input });
      throw error;
    }
  }

  /**
   * Query application logs
   */
  private async queryLogs(
    input: TelemetryQueryInput,
    params: Record<string, any>,
    timeRange: { startMs: number; endMs: number }
  ): Promise<TelemetryQueryResult> {
    // TODO: Implement log query logic
    // This would connect to log aggregation service (Loki, Elasticsearch, etc.)
    
    logger.warn('Log query not fully implemented', { input });
    
    return {
      query: input.query,
      source: TelemetryDataSource.LOGS,
      series: [],
      totalSeries: 0,
      totalDataPoints: 0,
      warnings: ['Log query support is under development']
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
   * List available metrics
   */
  async listMetrics(filter?: TelemetryMetricsFilter): Promise<TelemetryMetric[]> {
    const metrics: TelemetryMetric[] = [];
    
    // TODO: Aggregate metrics from all sources
    // For now, return a placeholder
    
    logger.warn('List metrics not fully implemented', { filter });
    
    return metrics;
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

  // Helper methods

  private buildPrometheusQuery(input: TelemetryQueryInput, params: Record<string, any>): string {
    let query = input.query;
    
    // Apply grouping
    if (input.groupBy && input.groupBy.length > 0) {
      const groupByClause = input.groupBy.join(',');
      
      if (input.aggregation) {
        const aggFunc = input.aggregation.toLowerCase();
        query = `${aggFunc} by (${groupByClause}) (${query})`;
      }
    }
    
    return query;
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
