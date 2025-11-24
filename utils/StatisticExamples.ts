import { createCounter, createGauge, createHistogram, createSummary, toPrometheusFormat } from './StatisticHelpers';

/**
 * Example usage of OTEL-compatible statistics
 * These examples demonstrate how to create and use metrics that work with
 * Prometheus and Jaeger
 */

// Example 1: Counter - Tracking total HTTP requests
export const httpRequestCounter = createCounter(
  'http_requests_total',
  1,
  {
    service_name: 'reactory-server',
    http_method: 'POST',
    http_route: '/graphql',
    http_status_code: 200,
  },
  {
    description: 'Total number of HTTP requests',
    unit: '1',
  }
);

// Example 2: Gauge - Current memory usage
export const memoryUsageGauge = createGauge(
  'process_memory_bytes',
  process.memoryUsage().heapUsed,
  {
    service_name: 'reactory-server',
    service_instance_id: process.pid.toString(),
  },
  {
    description: 'Current heap memory usage in bytes',
    unit: 'bytes',
  }
);

// Example 3: Histogram - Request duration distribution
const requestDurations = [12, 45, 23, 67, 89, 34, 56, 78, 90, 123];
export const requestDurationHistogram = createHistogram(
  'http_request_duration_ms',
  requestDurations,
  {
    service_name: 'reactory-server',
    http_method: 'POST',
    http_route: '/graphql',
  },
  {
    description: 'HTTP request duration in milliseconds',
    unit: 'ms',
    buckets: [0, 10, 25, 50, 75, 100, 250, 500, 1000],
  }
);

// Example 4: Summary - GraphQL operation latency with percentiles
const graphqlLatencies = [5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 100, 200];
export const graphqlLatencySummary = createSummary(
  'graphql_operation_duration_ms',
  graphqlLatencies,
  {
    service_name: 'reactory-server',
    graphql_operation_name: 'getUser',
    graphql_operation_type: 'query',
  },
  {
    description: 'GraphQL operation duration in milliseconds',
    unit: 'ms',
    quantiles: [0.5, 0.9, 0.95, 0.99], // median, 90th, 95th, 99th percentiles
  }
);

// Example 5: Error counter with trace context
export const errorCounter = createCounter(
  'errors_total',
  1,
  {
    service_name: 'reactory-server',
    error_type: 'ValidationError',
    http_route: '/graphql',
  },
  {
    description: 'Total number of errors',
    unit: '1',
  }
);

// Example: Converting to Prometheus format
export const prometheusOutput = () => {
  console.log('=== Counter Example ===');
  console.log(toPrometheusFormat(httpRequestCounter));
  console.log('\n=== Gauge Example ===');
  console.log(toPrometheusFormat(memoryUsageGauge));
  console.log('\n=== Histogram Example ===');
  console.log(toPrometheusFormat(requestDurationHistogram));
  console.log('\n=== Summary Example ===');
  console.log(toPrometheusFormat(graphqlLatencySummary));
};

// Example: Custom metric with resource attributes
export const customMetricWithResource = createGauge(
  'custom_business_metric',
  42,
  {
    service_name: 'reactory-server',
    custom_dimension: 'value1',
  },
  {
    description: 'Custom business metric',
    unit: '1',
    resource: {
      'service.name': 'reactory-server',
      'service.version': '1.0.0',
      'deployment.environment': 'production',
      'host.name': process.env.HOSTNAME || 'unknown',
    },
  }
);

export default {
  httpRequestCounter,
  memoryUsageGauge,
  requestDurationHistogram,
  graphqlLatencySummary,
  errorCounter,
  customMetricWithResource,
  prometheusOutput,
};
