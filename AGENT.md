# reactory-telemetry -- Server Module Agent Context

## What Is This Module

A full-featured observability module built on OpenTelemetry. Provides telemetry instrumentation (counters, histograms, gauges), a Prometheus exporter, a GraphQL query API for telemetry data from multiple backends, middleware for request instrumentation, and dashboard examples.

- **Module ID**: `reactory.ReactoryTelemetry@1.0.0`
- **Namespace**: `reactory`
- **FQN**: `reactory.ReactoryTelemetry@1.0.0`
- **Version**: `1.0.0`
- **Priority**: `1`
- **License**: MIT
- **Package**: `reactory-telemetry` v1.0.0

## Directory Structure

```
reactory-telemetry/
  index.ts                # ReactoryModuleDefinition entry point
  graphql/
    resolvers/            # Telemetry query resolvers
    schema/               # GraphQL type definitions
    ReactoryGraphQLTelemetryPlugin  # Apollo Server plugin
  services/
    TelemetryQueryService # Multi-source telemetry query service
  middleware/             # Request instrumentation middleware
  routes/                 # Prometheus metrics endpoint
  prometheus/             # Prometheus exporter configuration
  utils/                  # Telemetry utilities
  data/                   # Static data / dashboards
  docs/                   # Documentation
  examples/               # Usage examples
  demo/                   # Demo dashboards
  build/                  # Build artifacts
```

## Key Exports

| Export | Purpose |
|---|---|
| `ReactoryTelemetry` | Core instrumentation class |
| `ICounter` | Counter metric interface |
| `IHistogram` | Histogram metric interface |
| `IUpDownCounter` | Up/down counter interface |
| `IGauge` | Gauge metric interface |
| `IReactoryTelemetry` | Main telemetry interface |

## GraphQL Endpoints

| Query | Purpose |
|---|---|
| `queryTelemetry` | Main telemetry data query |
| `listTelemetryMetrics` | Metric discovery and listing |
| `getTelemetryMetricStats` | Aggregated statistics (AVG, SUM, MIN, MAX, P95, P99) |
| `getTelemetrySources` | Source availability status |

## Telemetry Sources

| Source | Status |
|---|---|
| Prometheus | Fully implemented |
| OpenTelemetry / Jaeger | Structure ready |
| Loki | Structure ready |
| Database metrics | Structure ready |

## Dependencies (package.json)

- `@opentelemetry/sdk-node` -- OTEL Node.js SDK
- `@opentelemetry/api` -- OTEL API
- `@opentelemetry/exporter-prometheus` -- Prometheus exporter
- `@opentelemetry/auto-instrumentations-node` -- Auto-instrumentation
- `@opentelemetry/sdk-metrics` -- Metrics SDK
- `@opentelemetry/sdk-trace-node` -- Tracing SDK
- `@opentelemetry/exporter-jaeger` -- Jaeger trace exporter
- `@opentelemetry/exporter-trace-otlp-proto` -- OTLP trace exporter
- `@opentelemetry/exporter-metrics-otlp-proto` -- OTLP metrics exporter

## Usage

Start the server with telemetry enabled:
```bash
bin/start-otel.sh
```

Other modules can use the telemetry service to create counters, histograms, and gauges for their own metrics.
