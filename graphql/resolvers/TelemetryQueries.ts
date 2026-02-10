/**
 * Telemetry Query GraphQL Resolvers
 * 
 * Resolvers for querying telemetry data from various sources
 */

import Reactory from '@reactory/reactory-core';
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
  TelemetrySourceStatus
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
}

const TelemetryQueryResolverExport = new TelemetryQueryResolvers();
export default TelemetryQueryResolverExport.resolver;
