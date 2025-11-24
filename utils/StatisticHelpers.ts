import type { Reactory } from '@reactory/server-core/types/reactory';

/**
 * Helper utilities for creating OTEL-compatible statistics
 */

/**
 * Creates a counter metric
 */
export const createCounter = (
  name: string,
  value: number,
  attributes?: Reactory.Models.IOTelAttributes,
  options?: {
    description?: string;
    unit?: string;
    resource?: Reactory.Models.IStatistic['resource'];
  }
): Reactory.Models.IStatistic => ({
  name,
  type: 'counter',
  value,
  attributes,
  description: options?.description,
  unit: options?.unit || '1',
  timestamp: new Date(),
  resource: options?.resource,
});

/**
 * Creates a gauge metric
 */
export const createGauge = (
  name: string,
  value: number,
  attributes?: Reactory.Models.IOTelAttributes,
  options?: {
    description?: string;
    unit?: string;
    resource?: Reactory.Models.IStatistic['resource'];
  }
): Reactory.Models.IStatistic => ({
  name,
  type: 'gauge',
  value,
  attributes,
  description: options?.description,
  unit: options?.unit,
  timestamp: new Date(),
  resource: options?.resource,
});

/**
 * Creates a histogram metric
 */
export const createHistogram = (
  name: string,
  observations: number[],
  attributes?: Reactory.Models.IOTelAttributes,
  options?: {
    description?: string;
    unit?: string;
    buckets?: number[];
    resource?: Reactory.Models.IStatistic['resource'];
  }
): Reactory.Models.IStatistic => {
  const defaultBuckets = options?.buckets || [0, 5, 10, 25, 50, 75, 100, 250, 500, 750, 1000, 2500, 5000, 7500, 10000];
  
  const count = observations.length;
  const sum = observations.reduce((acc, val) => acc + val, 0);
  
  const buckets: Reactory.Models.IHistogramBucket[] = defaultBuckets.map(le => ({
    le,
    count: observations.filter(val => val <= le).length,
  }));

  return {
    name,
    type: 'histogram',
    histogramData: {
      count,
      sum,
      buckets,
    },
    attributes,
    description: options?.description,
    unit: options?.unit || 'ms',
    timestamp: new Date(),
    resource: options?.resource,
  };
};

/**
 * Creates a summary metric with quantiles
 */
export const createSummary = (
  name: string,
  observations: number[],
  attributes?: Reactory.Models.IOTelAttributes,
  options?: {
    description?: string;
    unit?: string;
    quantiles?: number[];
    resource?: Reactory.Models.IStatistic['resource'];
  }
): Reactory.Models.IStatistic => {
  const defaultQuantiles = options?.quantiles || [0.5, 0.9, 0.95, 0.99];
  
  const sorted = [...observations].sort((a, b) => a - b);
  const count = sorted.length;
  const sum = sorted.reduce((acc, val) => acc + val, 0);
  
  const quantiles: Reactory.Models.ISummaryQuantile[] = defaultQuantiles.map(q => {
    const index = Math.ceil(count * q) - 1;
    return {
      quantile: q,
      value: sorted[index] || 0,
    };
  });

  return {
    name,
    type: 'summary',
    summaryData: {
      count,
      sum,
      quantiles,
    },
    attributes,
    description: options?.description,
    unit: options?.unit || 'ms',
    timestamp: new Date(),
    resource: options?.resource,
  };
};

/**
 * Converts a statistic to Prometheus text format
 */
export const toPrometheusFormat = (stat: Reactory.Models.IStatistic): string => {
  const lines: string[] = [];
  
  const formatLabels = (attrs?: Reactory.Models.IOTelAttributes): string => {
    if (!attrs || Object.keys(attrs).length === 0) return '';
    const labelPairs = Object.entries(attrs)
      .filter(([_, value]) => value !== undefined)
      .map(([key, value]) => `${key}="${value}"`)
      .join(',');
    return `{${labelPairs}}`;
  };

  if (stat.description) {
    lines.push(`# HELP ${stat.name} ${stat.description}`);
  }
  lines.push(`# TYPE ${stat.name} ${stat.type}`);

  const labels = formatLabels(stat.attributes);
  const timestamp = stat.timestamp ? ` ${stat.timestamp.getTime()}` : '';

  if (stat.type === 'histogram' && stat.histogramData) {
    const { buckets, count, sum } = stat.histogramData;
    buckets.forEach(bucket => {
      lines.push(`${stat.name}_bucket${labels.replace('}', `,le="${bucket.le}"`)} ${bucket.count}${timestamp}`);
    });
    lines.push(`${stat.name}_bucket${labels.replace('}', ',le="+Inf"}')} ${count}${timestamp}`);
    lines.push(`${stat.name}_sum${labels} ${sum}${timestamp}`);
    lines.push(`${stat.name}_count${labels} ${count}${timestamp}`);
  } else if (stat.type === 'summary' && stat.summaryData) {
    const { quantiles, count, sum } = stat.summaryData;
    quantiles.forEach(q => {
      lines.push(`${stat.name}${labels.replace('}', `,quantile="${q.quantile}"`)} ${q.value}${timestamp}`);
    });
    lines.push(`${stat.name}_sum${labels} ${sum}${timestamp}`);
    lines.push(`${stat.name}_count${labels} ${count}${timestamp}`);
  } else if (stat.value !== undefined) {
    lines.push(`${stat.name}${labels} ${stat.value}${timestamp}`);
  }

  return lines.join('\n');
};

export default {
  createCounter,
  createGauge,
  createHistogram,
  createSummary,
  toPrometheusFormat,
};
