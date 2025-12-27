/**
 * Reactory Telemetry Wrapper
 * 
 * Provides a unified interface for creating and managing OpenTelemetry metrics
 * with optional persistence to the StatisticsService.
 * 
 * Supports:
 * - Counter: Monotonically increasing values
 * - UpDownCounter: Values that can increase or decrease
 * - Histogram: Distribution of values (for latency, sizes, etc.)
 * - Gauge: Current value observations
 * - Summary: Statistical summaries (quantiles)
 */

import meter from '@reactory/server-modules/reactory-telemetry/prometheus/meter';
import logger from '@reactory/server-core/logging';
import Reactory from '@reactory/reactory-core';
import { 
  Counter, 
  Histogram, 
  UpDownCounter,
  ObservableGauge,
  Attributes,
  ObservableResult
} from '@opentelemetry/api';

// Re-export types from Reactory.Telemetry namespace for convenience
export type MetricAttributes = Reactory.Telemetry.MetricAttributes;
export type MetricOptions = Reactory.Telemetry.MetricOptions;
export type ICounter = Reactory.Telemetry.ICounter;
export type IHistogram = Reactory.Telemetry.IHistogram;
export type IUpDownCounter = Reactory.Telemetry.IUpDownCounter;
export type IGauge = Reactory.Telemetry.IGauge;
export type IReactoryTelemetry = Reactory.Telemetry.IReactoryTelemetry;

/**
 * Telemetry wrapper for Reactory Context
 * Implements the IReactoryTelemetry interface
 */
export class ReactoryTelemetry implements IReactoryTelemetry {
  private context: Reactory.Server.IReactoryContext;
  private counters: Map<string, Counter> = new Map();
  private histograms: Map<string, Histogram> = new Map();
  private upDownCounters: Map<string, UpDownCounter> = new Map();
  private gauges: Map<string, { gauge: ObservableGauge; values: Map<string, number> }> = new Map();
  private persistenceEnabled: boolean;

  constructor(context: Reactory.Server.IReactoryContext) {
    this.context = context;
    this.persistenceEnabled = process.env.DO_STORE_STATISTICS === 'true';
  }

  /**
   * Create or get a counter metric
   * Counters are monotonically increasing (always go up)
   */
  createCounter(name: string, options: MetricOptions = {}): ICounter {
    const fullName = this.prefixMetricName(name);
    
    if (!this.counters.has(fullName)) {
      const counter = meter.createCounter(fullName, {
        description: options.description,
        unit: options.unit,
        valueType: options.valueType,
      });
      this.counters.set(fullName, counter);
    }

    const counter = this.counters.get(fullName)!;
    const shouldPersist = options.persist !== false && this.persistenceEnabled;

    return {
      add: (value: number, attributes: Attributes = {}) => {
        try {
          // Add partner and user context
          const enrichedAttributes = this.enrichAttributes(attributes);
          counter.add(value, enrichedAttributes);

          // Persist if enabled
          if (shouldPersist) {
            this.persistMetric({
              name: fullName,
              type: 'counter',
              value,
              attributes: enrichedAttributes,
              description: options.description,
              unit: options.unit,
              ttl: options.ttl,
              resource: options.resource,
            });
          }
        } catch (error) {
          logger.error('Failed to record counter metric', { error, name: fullName, value });
        }
      },
    };
  }

  /**
   * Create or get an up-down counter metric
   * UpDownCounters can increase or decrease
   */
  createUpDownCounter(name: string, options: MetricOptions = {}): IUpDownCounter {
    const fullName = this.prefixMetricName(name);
    
    if (!this.upDownCounters.has(fullName)) {
      const counter = meter.createUpDownCounter(fullName, {
        description: options.description,
        unit: options.unit,
        valueType: options.valueType,
      });
      this.upDownCounters.set(fullName, counter);
    }

    const counter = this.upDownCounters.get(fullName)!;
    const shouldPersist = options.persist !== false && this.persistenceEnabled;

    return {
      add: (value: number, attributes: Attributes = {}) => {
        try {
          const enrichedAttributes = this.enrichAttributes(attributes);
          counter.add(value, enrichedAttributes);

          if (shouldPersist) {
            this.persistMetric({
              name: fullName,
              type: 'updowncounter',
              value,
              attributes: enrichedAttributes,
              description: options.description,
              unit: options.unit,
              ttl: options.ttl,
              resource: options.resource,
            });
          }
        } catch (error) {
          logger.error('Failed to record updowncounter metric', { error, name: fullName, value });
        }
      },
    };
  }

  /**
   * Create or get a histogram metric
   * Histograms track distributions of values (useful for latency, sizes, etc.)
   */
  createHistogram(name: string, options: MetricOptions = {}): IHistogram {
    const fullName = this.prefixMetricName(name);
    
    if (!this.histograms.has(fullName)) {
      const histogram = meter.createHistogram(fullName, {
        description: options.description,
        unit: options.unit,
        valueType: options.valueType,
      });
      this.histograms.set(fullName, histogram);
    }

    const histogram = this.histograms.get(fullName)!;
    const shouldPersist = options.persist !== false && this.persistenceEnabled;

    return {
      record: (value: number, attributes: Attributes = {}) => {
        try {
          const enrichedAttributes = this.enrichAttributes(attributes);
          histogram.record(value, enrichedAttributes);

          if (shouldPersist) {
            this.persistMetric({
              name: fullName,
              type: 'histogram',
              value,
              attributes: enrichedAttributes,
              description: options.description,
              unit: options.unit,
              ttl: options.ttl,
              resource: options.resource,
            });
          }
        } catch (error) {
          logger.error('Failed to record histogram metric', { error, name: fullName, value });
        }
      },
    };
  }

  /**
   * Create or get a gauge metric
   * Gauges track current values that can go up or down
   */
  createGauge(name: string, options: MetricOptions = {}): IGauge {
    const fullName = this.prefixMetricName(name);
    
    if (!this.gauges.has(fullName)) {
      const values = new Map<string, number>();
      
      const gauge = meter.createObservableGauge(fullName, {
        description: options.description,
        unit: options.unit,
        valueType: options.valueType,
      });

      // Set up callback to report current values
      gauge.addCallback((observableResult: ObservableResult<Attributes>) => {
        values.forEach((value, attributesKey) => {
          const attributes = JSON.parse(attributesKey);
          observableResult.observe(value, attributes);
        });
      });

      this.gauges.set(fullName, { gauge, values });
    }

    const { values } = this.gauges.get(fullName)!;
    const shouldPersist = options.persist !== false && this.persistenceEnabled;

    return {
      set: (value: number, attributes: Attributes = {}) => {
        try {
          const enrichedAttributes = this.enrichAttributes(attributes);
          const attributesKey = JSON.stringify(enrichedAttributes);
          values.set(attributesKey, value);

          if (shouldPersist) {
            this.persistMetric({
              name: fullName,
              type: 'gauge',
              value,
              attributes: enrichedAttributes,
              description: options.description,
              unit: options.unit,
              ttl: options.ttl,
              resource: options.resource,
            });
          }
        } catch (error) {
          logger.error('Failed to record gauge metric', { error, name: fullName, value });
        }
      },
      get: (attributes: Attributes = {}) => {
        try {
          const enrichedAttributes = this.enrichAttributes(attributes);
          const attributesKey = JSON.stringify(enrichedAttributes);
          return values.get(attributesKey);
        } catch (error) {
          logger.error('Failed to get gauge value', { error, name: fullName });
          return undefined;
        }
      },
    };
  }

  /**
   * Helper to measure execution time with a histogram
   * Returns a function to call when the operation completes
   */
  startTimer(
    metricName: string,
    attributes: MetricAttributes = {},
    options: MetricOptions = {}
  ): () => void {
    const histogram = this.createHistogram(metricName, {
      description: options.description || 'Operation duration',
      unit: options.unit || 'seconds',
      ...options,
    });

    const startTime = Date.now();

    return () => {
      const duration = (Date.now() - startTime) / 1000;
      histogram.record(duration, attributes);
    };
  }

  /**
   * Helper to wrap an async function with timing metrics
   */
  async measureAsync<T>(
    metricName: string,
    operation: () => Promise<T>,
    attributes: MetricAttributes = {},
    options: MetricOptions = {}
  ): Promise<T> {
    const endTimer = this.startTimer(metricName, attributes, options);
    try {
      const result = await operation();
      endTimer();
      return result;
    } catch (error) {
      endTimer();
      throw error;
    }
  }

  /**
   * Helper to wrap a sync function with timing metrics
   */
  measure<T>(
    metricName: string,
    operation: () => T,
    attributes: MetricAttributes = {},
    options: MetricOptions = {}
  ): T {
    const endTimer = this.startTimer(metricName, attributes, options);
    try {
      const result = operation();
      endTimer();
      return result;
    } catch (error) {
      endTimer();
      throw error;
    }
  }

  /**
   * Enrich attributes with context information
   */
  private enrichAttributes(attributes: Attributes): Attributes {
    const enriched: Attributes = { ...attributes };

    if (this.context.partner) {
      enriched.partner_id = this.context.partner._id.toString();
      enriched.partner_name = this.context.partner.name;
    }

    if (this.context.user) {
      enriched.user_id = this.context.user._id.toString().substring(0, 8); // Truncate for privacy
    }

    return enriched;
  }

  /**
   * Prefix metric name with partner/service context
   */
  private prefixMetricName(name: string): string {
    const prefix = process.env.REACTORY_METRICS_PREFIX || 'reactory';
    return `${prefix}_${name}`;
  }

  /**
   * Persist metric to StatisticsService
   */
  private async persistMetric(metric: {
    name: string;
    type: 'counter' | 'gauge' | 'histogram' | 'summary' | 'updowncounter';
    value: number;
    attributes: Attributes;
    description?: string;
    unit?: string;
    ttl?: number;
    resource?: any;
  }): Promise<void> {
    try {
      const statisticsService = this.context.getService<any>(
        'core.ReactoryStatisticsService@1.0.0'
      );

      if (!statisticsService) {
        return;
      }

      await statisticsService.publishStatistics(
        [
          {
            name: metric.name,
            type: metric.type,
            value: metric.value,
            attributes: metric.attributes,
            description: metric.description,
            unit: metric.unit,
            timestamp: new Date(),
            resource: {
              serviceName: metric.resource?.serviceName || 'reactory-express-server',
              serviceVersion: metric.resource?.serviceVersion || process.env.npm_package_version,
              deploymentEnvironment:
                metric.resource?.deploymentEnvironment || process.env.NODE_ENV || 'development',
              ...metric.resource,
            },
          } as any,
        ],
        undefined
      );
    } catch (error) {
      // Log but don't throw - telemetry should not break application flow
      logger.debug('Failed to persist metric to StatisticsService', {
        error: error instanceof Error ? error.message : String(error),
        metricName: metric.name,
      });
    }
  }

  /**
   * Clean up resources
   */
  dispose(): void {
    this.counters.clear();
    this.histograms.clear();
    this.upDownCounters.clear();
    this.gauges.clear();
  }
}

export default ReactoryTelemetry;

