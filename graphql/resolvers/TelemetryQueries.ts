/**
 * Telemetry Query GraphQL Resolvers
 * 
 * Resolvers for querying telemetry data from various sources
 */

import Reactory from '@reactorynet/reactory-core';
import { roles } from '@reactory/server-core/authentication/decorators';
import { resolver, query } from '@reactory/server-core/models/graphql/decorators/resolver';
import { TelemetryQueryService } from '../../services/TelemetryQueryService';
import type {
  TelemetryQueryInput,
  TelemetryMetricsFilter,
  TelemetryMetricStatsInput,
  TelemetryQueryResult,
  TelemetryMetric,
  TelemetryMetricStats,
  TelemetrySourceStatus,
  TelemetryLogQueryInput,
  TelemetryLogQueryResult,
  TelemetryTraceSearchInput,
  TelemetryTraceSummary,
  TelemetryTrace
} from '../../services/TelemetryQueryService';

/**
 * Get TelemetryQueryService from context
 */
const getTelemetryQueryService = (context: Reactory.Server.IReactoryContext) => {
  return context.getService<TelemetryQueryService>('reactory.TelemetryQueryService@1.0.0');
};

// @ts-ignore - resolver decorator pattern
@resolver
class TelemetryQueryResolvers {
  resolver: any;

  /**
   * Query telemetry data from various sources
   */
  @roles(['USER', 'ADMIN'], 'args.context')
  @query('queryTelemetry')
  async queryTelemetry(
    obj: any,
    params: { input: TelemetryQueryInput },
    context: Reactory.Server.IReactoryContext
  ): Promise<TelemetryQueryResult> {
    const service = getTelemetryQueryService(context);
    
    if (!service) {
      throw new Error('TelemetryQueryService not available');
    }

    try {
      context.log('Querying telemetry data', { input: params.input }, 'debug');
      const result = await service.queryTelemetry(params.input);
      return result;
    } catch (error) {
      context.log('Error querying telemetry data', { error, input: params.input }, 'error');
      throw error;
    }
  }

  /**
   * List available telemetry metrics
   */
  @roles(['USER', 'ADMIN'], 'args.context')
  @query('listTelemetryMetrics')
  async listTelemetryMetrics(
    obj: any,
    params: { filter?: TelemetryMetricsFilter },
    context: Reactory.Server.IReactoryContext
  ): Promise<TelemetryMetric[]> {
    const service = getTelemetryQueryService(context);
    
    if (!service) {
      throw new Error('TelemetryQueryService not available');
    }

    try {
      const metrics = await service.listMetrics(params.filter);
      return metrics;
    } catch (error) {
      context.log('Error listing telemetry metrics', { error, filter: params.filter }, 'error');
      throw error;
    }
  }

  /**
   * Get aggregated statistics for a metric
   */
  @roles(['USER', 'ADMIN'], 'args.context')
  @query('getTelemetryMetricStats')
  async getTelemetryMetricStats(
    obj: any,
    params: { input: TelemetryMetricStatsInput },
    context: Reactory.Server.IReactoryContext
  ): Promise<TelemetryMetricStats> {
    const service = getTelemetryQueryService(context);
    
    if (!service) {
      throw new Error('TelemetryQueryService not available');
    }

    try {
      const stats = await service.getMetricStats(params.input);
      return stats;
    } catch (error) {
      context.log('Error getting metric stats', { error, input: params.input }, 'error');
      throw error;
    }
  }

  /**
   * Get available telemetry sources and their status
   */
  @roles(['USER', 'ADMIN'], 'args.context')
  @query('getTelemetrySources')
  async getTelemetrySources(
    obj: any,
    params: {},
    context: Reactory.Server.IReactoryContext
  ): Promise<TelemetrySourceStatus[]> {
    const service = getTelemetryQueryService(context);
    
    if (!service) {
      throw new Error('TelemetryQueryService not available');
    }

    try {
      const sources = await service.getSources();
      return sources;
    } catch (error) {
      context.log('Error getting telemetry sources', { error }, 'error');
      throw error;
    }
  }

  /**
   * List dashboards on a live Grafana instance (import source)
   */
  @roles(['ADMIN', 'DEVELOPER'], 'args.context')
  @query('listTelemetryGrafanaDashboards')
  async listTelemetryGrafanaDashboards(
    obj: any,
    params: { connectionId?: string },
    context: Reactory.Server.IReactoryContext
  ): Promise<any[]> {
    const service = getTelemetryQueryService(context);
    if (!service) throw new Error('TelemetryQueryService not available');
    try {
      return await service.listGrafanaDashboards(params.connectionId);
    } catch (error) {
      context.log('Error listing Grafana dashboards', { error }, 'error');
      throw error;
    }
  }

  /**
   * Fetch one Grafana dashboard's raw JSON model by uid
   */
  @roles(['ADMIN', 'DEVELOPER'], 'args.context')
  @query('getTelemetryGrafanaDashboard')
  async getTelemetryGrafanaDashboard(
    obj: any,
    params: { uid: string; connectionId?: string },
    context: Reactory.Server.IReactoryContext
  ): Promise<any> {
    const service = getTelemetryQueryService(context);
    if (!service) throw new Error('TelemetryQueryService not available');
    try {
      return await service.getGrafanaDashboard(params.uid, params.connectionId);
    } catch (error) {
      context.log('Error fetching Grafana dashboard', { error, uid: params.uid }, 'error');
      throw error;
    }
  }

  /**
   * List the values of one label (Prometheus/Loki) for filters and variables
   */
  @roles(['USER', 'ADMIN'], 'args.context')
  @query('listTelemetryLabelValues')
  async listTelemetryLabelValues(
    obj: any,
    params: {
      source: TelemetryQueryInput['source'];
      label: string;
      match?: string;
      connectionId?: string;
      timeRange?: { start: string; end: string; timezone?: string };
    },
    context: Reactory.Server.IReactoryContext
  ): Promise<string[]> {
    const service = getTelemetryQueryService(context);

    if (!service) {
      throw new Error('TelemetryQueryService not available');
    }

    try {
      return await service.listLabelValues(params);
    } catch (error) {
      context.log('Error listing telemetry label values', { error, params }, 'error');
      throw error;
    }
  }

  /**
   * Query raw log lines from Loki (LogQL streams)
   */
  @roles(['USER', 'ADMIN'], 'args.context')
  @query('queryTelemetryLogs')
  async queryTelemetryLogs(
    obj: any,
    params: { input: TelemetryLogQueryInput },
    context: Reactory.Server.IReactoryContext
  ): Promise<TelemetryLogQueryResult> {
    const service = getTelemetryQueryService(context);

    if (!service) {
      throw new Error('TelemetryQueryService not available');
    }

    try {
      context.log('Querying telemetry logs', { input: params.input }, 'debug');
      return await service.queryTelemetryLogs(params.input);
    } catch (error) {
      context.log('Error querying telemetry logs', { error, input: params.input }, 'error');
      throw error;
    }
  }

  /**
   * Search traces in Jaeger
   */
  @roles(['USER', 'ADMIN'], 'args.context')
  @query('searchTelemetryTraces')
  async searchTelemetryTraces(
    obj: any,
    params: { input: TelemetryTraceSearchInput },
    context: Reactory.Server.IReactoryContext
  ): Promise<TelemetryTraceSummary[]> {
    const service = getTelemetryQueryService(context);

    if (!service) {
      throw new Error('TelemetryQueryService not available');
    }

    try {
      context.log('Searching telemetry traces', { input: params.input }, 'debug');
      return await service.searchTraces(params.input);
    } catch (error) {
      context.log('Error searching telemetry traces', { error, input: params.input }, 'error');
      throw error;
    }
  }

  /**
   * Fetch one trace with all its spans
   */
  @roles(['USER', 'ADMIN'], 'args.context')
  @query('getTelemetryTrace')
  async getTelemetryTrace(
    obj: any,
    params: { traceId: string; connectionId?: string },
    context: Reactory.Server.IReactoryContext
  ): Promise<TelemetryTrace> {
    const service = getTelemetryQueryService(context);

    if (!service) {
      throw new Error('TelemetryQueryService not available');
    }

    try {
      return await service.getTrace(params.traceId, params.connectionId);
    } catch (error) {
      context.log('Error fetching telemetry trace', { error, traceId: params.traceId }, 'error');
      throw error;
    }
  }

  /**
   * List the service names known to Jaeger
   */
  @roles(['USER', 'ADMIN'], 'args.context')
  @query('listTelemetryTraceServices')
  async listTelemetryTraceServices(
    obj: any,
    params: { connectionId?: string },
    context: Reactory.Server.IReactoryContext
  ): Promise<string[]> {
    const service = getTelemetryQueryService(context);

    if (!service) {
      throw new Error('TelemetryQueryService not available');
    }

    try {
      return await service.listTraceServices(params.connectionId);
    } catch (error) {
      context.log('Error listing trace services', { error }, 'error');
      throw error;
    }
  }
}

const TelemetryQueryResolverExport = new TelemetryQueryResolvers();
export default TelemetryQueryResolverExport.resolver;
