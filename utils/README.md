# OTEL-Compatible Statistics

This module provides TypeScript interfaces and utilities for creating OpenTelemetry-compatible metrics that work seamlessly with Prometheus and Jaeger.

## Overview

The `IStatistic` interface follows OpenTelemetry conventions and supports:
- ✅ **Prometheus** - Full compatibility with Prometheus metric types and exposition format
- ✅ **Jaeger** - Compatible with Jaeger tags and dimensions for trace correlation
- ✅ **OpenTelemetry** - Follows OTEL Metrics API specification

## Metric Types

### 1. Counter
Monotonically increasing value (can only go up).

**Use cases:**
- Total HTTP requests
- Total errors
- Total bytes sent/received

**Example:**
```typescript
import { createCounter } from '@reactory/telemetry/utils';

const metric = createCounter(
  'http_requests_total',
  1,
  {
    service_name: 'reactory-server',
    http_method: 'POST',
    http_status_code: 200,
  },
  {
    description: 'Total number of HTTP requests',
    unit: '1',
  }
);
```

### 2. Gauge
Point-in-time value that can go up or down.

**Use cases:**
- Current memory usage
- Active connections
- Queue size
- Temperature

**Example:**
```typescript
import { createGauge } from '@reactory/telemetry/utils';

const metric = createGauge(
  'process_memory_bytes',
  process.memoryUsage().heapUsed,
  {
    service_name: 'reactory-server',
  },
  {
    description: 'Current heap memory usage',
    unit: 'bytes',
  }
);
```

### 3. Histogram
Distribution of values across predefined buckets.

**Use cases:**
- Request duration
- Response size
- Database query time

**Example:**
```typescript
import { createHistogram } from '@reactory/telemetry/utils';

const durations = [12, 45, 23, 67, 89]; // observed values

const metric = createHistogram(
  'http_request_duration_ms',
  durations,
  {
    service_name: 'reactory-server',
    http_method: 'POST',
  },
  {
    description: 'HTTP request duration distribution',
    unit: 'ms',
    buckets: [0, 10, 25, 50, 100, 250, 500, 1000],
  }
);
```

### 4. Summary
Similar to histogram but calculates quantiles (percentiles).

**Use cases:**
- API latency percentiles (p50, p95, p99)
- Service SLOs
- Response time analysis

**Example:**
```typescript
import { createSummary } from '@reactory/telemetry/utils';

const latencies = [5, 10, 15, 20, 25, 30];

const metric = createSummary(
  'graphql_operation_duration_ms',
  latencies,
  {
    service_name: 'reactory-server',
    graphql_operation_name: 'getUser',
  },
  {
    description: 'GraphQL operation duration with percentiles',
    unit: 'ms',
    quantiles: [0.5, 0.9, 0.95, 0.99],
  }
);
```

## Attributes (Labels/Tags)

Attributes provide dimensional data for metrics. They map to:
- **Prometheus**: Labels
- **Jaeger**: Tags
- **OpenTelemetry**: Attributes

### Common Attributes

```typescript
interface IOTelAttributes {
  // Service identification
  service_name?: string;
  service_version?: string;
  service_instance_id?: string;
  service_namespace?: string;

  // HTTP metrics
  http_method?: string;
  http_status_code?: number;
  http_route?: string;

  // GraphQL metrics
  graphql_operation_name?: string;
  graphql_operation_type?: string;

  // Error tracking
  error?: boolean;
  error_type?: string;

  // Custom attributes
  [key: string]: string | number | boolean | undefined;
}
```

### Best Practices for Attributes

1. **Keep cardinality low** - Avoid high-cardinality values like user IDs or session IDs
2. **Use consistent names** - Follow naming conventions across your application
3. **Semantic conventions** - Use OpenTelemetry semantic conventions when available

## Resource Attributes

Resource attributes identify the source of metrics (service, host, container):

```typescript
const metric = createGauge(
  'custom_metric',
  42,
  { custom_dimension: 'value' },
  {
    resource: {
      'service.name': 'reactory-server',
      'service.version': '1.0.0',
      'deployment.environment': 'production',
      'host.name': 'server-01',
    },
  }
);
```

## Prometheus Format Export

Convert metrics to Prometheus text exposition format:

```typescript
import { toPrometheusFormat } from '@reactory/telemetry/utils';

const prometheusText = toPrometheusFormat(metric);
console.log(prometheusText);
```

**Output example:**
```
# HELP http_requests_total Total number of HTTP requests
# TYPE http_requests_total counter
http_requests_total{service_name="reactory-server",http_method="POST",http_status_code="200"} 1 1700000000000
```

## Integration with Existing OTEL Setup

The statistics interface works alongside your existing OpenTelemetry instrumentation:

```typescript
// Your existing OTEL setup in reactory.inst.otlp.ts
import { NodeSDK } from '@opentelemetry/sdk-node';
import { PrometheusExporter } from '@opentelemetry/exporter-prometheus';

// Your metrics can be recorded alongside OTEL's automatic instrumentation
import { createCounter } from '@reactory/telemetry/utils';

const customMetric = createCounter('my_custom_metric', 1, {
  service_name: 'reactory-server',
});
```

## Trace Correlation

Link metrics to distributed traces:

```typescript
const metric = createCounter(
  'errors_total',
  1,
  {
    service_name: 'reactory-server',
    error_type: 'ValidationError',
  },
  {
    description: 'Total errors',
  }
);

// Add trace context
metric.traceContext = {
  traceId: 'a1b2c3d4e5f6g7h8',
  spanId: 'i9j0k1l2',
  traceFlags: 1,
};
```

## Naming Conventions

Follow these conventions for metric names:

1. **Use snake_case** - `http_requests_total`, not `httpRequestsTotal`
2. **Include unit suffix** - `_bytes`, `_ms`, `_total`, `_ratio`
3. **Be descriptive** - `graphql_query_duration_ms` not `query_time`
4. **Use prefixes** - `http_`, `graphql_`, `db_`, `process_`

### Examples:
- ✅ `http_requests_total`
- ✅ `graphql_operation_duration_ms`
- ✅ `db_query_errors_total`
- ✅ `process_memory_bytes`
- ❌ `httpRequests`
- ❌ `queryTime`

## Complete Example

```typescript
import { 
  createCounter, 
  createGauge, 
  createHistogram,
  toPrometheusFormat 
} from '@reactory/telemetry/utils';

// Track total requests
const requestCounter = createCounter(
  'http_requests_total',
  1,
  {
    service_name: 'reactory-server',
    http_method: 'POST',
    http_route: '/graphql',
    http_status_code: 200,
  }
);

// Track memory usage
const memoryGauge = createGauge(
  'process_memory_bytes',
  process.memoryUsage().heapUsed,
  {
    service_name: 'reactory-server',
    service_instance_id: process.pid.toString(),
  }
);

// Track request durations
const durations = [12, 45, 23, 67, 89, 34, 56, 78, 90, 123];
const durationHistogram = createHistogram(
  'http_request_duration_ms',
  durations,
  {
    service_name: 'reactory-server',
    http_method: 'POST',
  },
  {
    buckets: [0, 10, 25, 50, 100, 250, 500, 1000],
  }
);

// Export to Prometheus format
console.log(toPrometheusFormat(requestCounter));
console.log(toPrometheusFormat(memoryGauge));
console.log(toPrometheusFormat(durationHistogram));
```

## References

- [OpenTelemetry Metrics Specification](https://opentelemetry.io/docs/specs/otel/metrics/)
- [Prometheus Metric Types](https://prometheus.io/docs/concepts/metric_types/)
- [OpenTelemetry Semantic Conventions](https://opentelemetry.io/docs/specs/semconv/)
- [Jaeger Documentation](https://www.jaegertracing.io/docs/)
