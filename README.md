# Telemetry Query Feature - Quick Start Guide

## Overview

The Telemetry Query GraphQL API provides a unified interface for querying telemetry data from multiple sources (Prometheus, OTEL, Logs, Database) through a single GraphQL endpoint. This enables client applications to build powerful dashboards and monitoring tools with support for multiple telemetry backends.

## Quick Start

### 1. Environment Setup

Configure your telemetry sources via environment variables (global configuration):

```bash
# Prometheus
REACTORY_PROMETHEUS_HOST=localhost
REACTORY_PROMETHEUS_PORT=9090
REACTORY_PROMETHEUS_PROTOCOL=http

# Loki (Logs)
REACTORY_LOKI_HOST=localhost
REACTORY_LOKI_PORT=3100
REACTORY_LOKI_PROTOCOL=http

# Jaeger (OTEL)
REACTORY_JAEGER_HOST=localhost
REACTORY_JAEGER_PORT=6831
REACTORY_JAEGER_PROTOCOL=http

# Enable metric persistence to database
DO_STORE_STATISTICS=true
```

**OR** configure partner-specific connections in your partner settings file:

```typescript
// In settings.ts
export default [
  {
    name: 'reactory.prometheus.connection',
    componentFqn: 'reactory-telemetry.PrometheusConnectionForm@1.0.0',
    data: {
      host: 'prometheus.example.com',
      port: 9090,
      protocol: 'https',
      username: 'optional',
   

**With Partner Connection:**

```graphql
query {
  queryTelemetry(input: {
    connectionId: "reactory.prometheus.connection"
    source: PROMETHEUS
    query: "http_requests_total"
    timeRange: {
      start: "2024-12-27T00:00:00Z"
      end: "2024-12-27T23:59:59Z"
    }
  }) {
    series {
      name
      data {
        timestamp
        value
      }
    }
  }
}
```   password: 'optional'
    },
    roles: ['ADMIN'],
  }
];
```

### 2. Basic Query

Query telemetry data using GraphQL:

```graphql
query {
  queryTelemetry(input: {
    source: PROMETHEUS
    query: "http_requests_total"
    timeRange: {
      start: "2024-12-27T00:00:00Z"
      end: "2024-12-27T23:59:59Z"
    }
  }) {
    series {
      name
      data {
        timestamp
        value
      }
    }
    totalDataPoints
    executionTime
  }
}
```

### 3. Check Available Sources

See which telemetry sources are configured:

```graphql
query {
  getTelemetrySources {
    source
    available
    status
    metricCount
  }
}
```

## Key Features

### ✅ Implemented
- **Prometheus Integration**: Full support for querying Prometheus metrics
- **Flexible Parameters**: Type-safe parameter system (string, number, boolean, JSON, array)
- **Time Range Filtering**: Support for ISO 8601 and Unix timestamps
- **Aggregations**: AVG, SUM, MIN, MAX, COUNT, MEDIAN, P95, P99, STDDEV
- **Statistics**: Get aggregated stats for any metric
- **Metric Discovery**: List available metrics
- **Source Status**: Check availability of data sources

### 🚧 Coming Soon
- OTEL Collector integration
- Log aggregation (Loki/Elasticsearch)
- Database metrics queries
- Real-time streaming
- Query templates

## Files & Structure

```
reactory-telemetry/
├── graphql/
│   ├── schema/
│   │   ├── TelemetryQueries.graphql    # GraphQL schema definitions
│   │   └── index.ts                     # Schema exports
│   ├── resolvers/
│   │   ├── TelemetryQueries.ts         # Resolver implementation
│   │   └── index.ts                     # Resolver exports
│   └── index.ts                         # Graph definitions
├── services/
│   └── TelemetryQueryService.ts        # Service layer implementation
├── examples/
│   └── TelemetryComponents.example.tsx # React component examples
├── TELEMETRY_QUERY_API.md             # Complete API documentation
├── IMPLEMENTATION_SUMMARY.md          # Technical implementation details
└── README.md                           # This file
```

## Documentation

- **[TELEMETRY_QUERY_API.md](./TELEMETRY_QUERY_API.md)** - Complete API reference with examples
- **[IMPLEMENTATION_SUMMARY.md](./IMPLEMENTATION_SUMMARY.md)** - Technical implementation details
- **[examples/TelemetryComponents.example.tsx](./examples/TelemetryComponents.example.tsx)** - React component examples

## Example Usage

### Query with Aggregation

```graphql
query {
  queryTelemetry(input: {
    source: PROMETHEUS
    query: "http_requests_total"
    timeRange: {
      start: "2024-12-27T00:00:00Z"
      end: "2024-12-27T23:59:59Z"
    }
    groupBy: ["method", "status"]
    aggregation: AVG
  }) {
    series {
      name
      labels
      data {
        timestamp
        value
      }
    }
  }
}
```

### Get Metric Statistics

```graphql
query {
  getTelemetryMetricStats(input: {
    metricName: "api_response_time"
    source: PROMETHEUS
    timeRange: {
      start: "2024-12-27T00:00:00Z"
      end: "2024-12-27T23:59:59Z"
    }
  }) {
    avg
    min
    max
    percentiles
  }
}
```

### Client Integration (React)

```typescript
import { useQuery, gql } from '@apollo/client';

const QUERY_TELEMETRY = gql`
  query QueryTelemetry($input: TelemetryQueryInput!) {
    queryTelemetry(input: $input) {
      series {
        name
        data {
          timestamp
          value
        }
      }
    }
  }
`;

function MetricChart() {
  const { data, loading } = useQuery(QUERY_TELEMETRY, {
    variables: {
      input: {
        source: 'PROMETHEUS',
        query: 'http_requests_total',
        timeRange: {
          start: new Date(Date.now() - 24*60*60*1000).toISOString(),
          end: new Date().toISOString()
        }
      }
    }
  });

  if (loading) return <div>Loading...</div>;
  
  return <Chart data={data.queryTelemetry.series} />;
}
```

## Supported Data Sources

| Source | Status | Description |
|--------|--------|-------------|
| PROMETHEUS | ✅ Implemented | Full Prometheus PromQL support |
| OTEL | 🚧 Structure Ready | OpenTelemetry metrics/traces |
| LOGS | 🚧 Structure Ready | Log aggregation queries |
| DATABASE | 🚧 Structure Ready | Persisted metrics queries |

## Permissions

All queries require authentication with one of these roles:
- `USER` - Can query telemetry data
- `ADMIN` - Full access to all features

## Next Steps

1. **Configure Prometheus**
   ```bash
   export PROMETHEUS_URL=http://your-prometheus:9090
   ```

2. **Test the API**
   - Use GraphiQL: `http://localhost:4000/graphql`
   - Run example queries from documentation

3. **Build a Dashboard**
   - Use example React components
   - Integrate with charting library (Recharts, Chart.js, D3)

4. **Extend for Your Needs**
   - Add custom metrics
   - Implement additional data sources
   - Create query templates

## Support & Contributing

- See [TELEMETRY_QUERY_API.md](./TELEMETRY_QUERY_API.md) for detailed API documentation
- Check [IMPLEMENTATION_SUMMARY.md](./IMPLEMENTATION_SUMMARY.md) for architecture details
- Review [examples/](./examples/) for integration patterns

## Related Modules

- **reactory-telemetry** - Core telemetry instrumentation
- **ReactoryTelemetry** - Metric creation and persistence
- **Prometheus** - Metrics collection and storage

## GraphQL Endpoints

All queries are available at your GraphQL endpoint (typically `/graphql`):

- `queryTelemetry` - Main telemetry query
- `listTelemetryMetrics` - Metric discovery
- `getTelemetryMetricStats` - Statistics
- `getTelemetrySources` - Source status

---

**Created**: December 27, 2024  
**Module**: reactory-telemetry  
**Version**: 1.0.0
