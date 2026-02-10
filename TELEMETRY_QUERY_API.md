# Telemetry Query GraphQL API

This module provides a unified GraphQL API for querying telemetry data from various sources including OpenTelemetry (OTEL), Prometheus, application logs, and database-stored metrics.

## Features

- **Multi-Source Support**: Query data from OTEL, Prometheus, logs, and database
- **Flexible Querying**: Support for custom queries with parameters
- **Time-Series Data**: Built for time-series metrics and graphing
- **Aggregations**: Support for various aggregation functions (AVG, SUM, MIN, MAX, COUNT, etc.)
- **Statistics**: Get aggregated statistics for metrics
- **Source Discovery**: List available metrics and data sources

## GraphQL Schema

### Data Sources

```graphql
enum TelemetryDataSource {
  OTEL          # OpenTelemetry metrics and traces
  PROMETHEUS    # Prometheus metrics
  LOGS          # Application logs
  DATABASE      # Custom metrics stored in database
}
```

### Query Telemetry Data

Query telemetry data from any supported source:

```graphql
query QueryTelemetry($input: TelemetryQueryInput!) {
  queryTelemetry(input: $input) {
    query
    source
    series {
      name
      labels
      data {
        timestamp
        value
        labels
      }
      unit
      metadata
    }
    totalSeries
    totalDataPoints
    executionTime
    warnings
    metadata
  }
}
```

**Example Variables:**

```json
{
  "input": {
    "source": "PROMETHEUS",
    "query": "http_requests_total",
    "timeRange": {
      "start": "2024-01-01T00:00:00Z",
      "end": "2024-01-02T00:00:00Z"
    },
    "groupBy": ["method", "status"],
    "aggregation": "SUM",
    "limit": 100
  }
}
```

**Example with Partner Connection:**

```json
{
  "input": {
    "connectionId": "reactory.prometheus.connection",
    "source": "PROMETHEUS",
    "query": "http_requests_total",
    "timeRange": {
      "start": "2024-01-01T00:00:00Z",
      "end": "2024-01-02T00:00:00Z"
    },
    "groupBy": ["method", "status"],
    "aggregation": "SUM",
    "limit": 100
  }
}
```

### List Available Metrics

Discover available metrics from telemetry sources:

```graphql
query ListMetrics($filter: TelemetryMetricsFilter) {
  listTelemetryMetrics(filter: $filter) {
    name
    description
    type
    unit
    labels
    source
  }
}
```

**Example Variables:**

```json
{
  "filter": {
    "source": "PROMETHEUS",
    "type": "counter",
    "search": "http_requests"
  }
}
```

### Get Metric Statistics

Get aggregated statistics for a specific metric:

```graphql
query GetMetricStats($input: TelemetryMetricStatsInput!) {
  getTelemetryMetricStats(input: $input) {
    metricName
    timeRange {
      start
      end
    }
    avg
    min
    max
    sum
    count
    stddev
    percentiles
  }
}
```

**Example Variables:**

```json
{
  "input": {
    "metricName": "http_request_duration_ms",
    "source": "PROMETHEUS",
    "timeRange": {
      "start": "2024-01-01T00:00:00Z",
      "end": "2024-01-02T00:00:00Z"
    }
  }
}
```

### Get Data Source Status

Check which telemetry sources are available:

```graphql
query GetSources {
  getTelemetrySources {
    source
    available
    status
    metricCount
    lastQuery
    metadata
  }
}
```

## Usage Examples

### Query Prometheus Metrics

```graphql
query PrometheusExample {
  queryTelemetry(input: {
    source: PROMETHEUS
    query: "rate(http_requests_total[5m])"
    timeRange: {
      start: "2024-01-01T00:00:00Z"
      end: "2024-01-01T01:00:00Z"
    }
    groupBy: ["endpoint"]
    aggregation: AVG
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

### Query with Parameters

```graphql
query ParameterizedQuery {
  queryTelemetry(input: {
    source: DATABASE
    query: "SELECT * FROM metrics WHERE name = :metricName AND value > :threshold"
    parameters: [
      { key: "metricName", value: "cpu_usage", type: "string" }
      { key: "threshold", value: "80", type: "number" }
    ]
    timeRange: {
      start: "2024-01-01T00:00:00Z"
      end: "2024-01-02T00:00:00Z"
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
```

### Get Statistics for Performance Metrics

```graphql
query PerformanceStats {
  getTelemetryMetricStats(input: {
    metricName: "api_response_time"
    source: PROMETHEUS
    timeRange: {
      start: "2024-01-01T00:00:00Z"
      end: "2024-01-02T00:00:00Z"
    }
    filters: [
      { key: "endpoint", value: "/api/users", type: "string" }
    ]
  }) {
    avg
    min
    max
    percentiles
  }
}
```

## Client Integration

### React Component Example

```typescript
import { useQuery } from '@apollo/client';
import { gql } from '@apollo/client';

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

function TelemetryChart() {
  const { data, loading, error } = useQuery(QUERY_TELEMETRY, {
    variables: {
      input: {
        source: 'PROMETHEUS',
        query: 'http_requests_total',
        timeRange: {
          start: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
          end: new Date().toISOString()
        }
      }
    }
  });

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  // Render chart with data.queryTelemetry.series
  return <Chart data={data.queryTelemetry.series} />;
}
```

### With Chart Library (e.g., Recharts)

```typescript
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';

function TelemetryLineChart({ series }) {
  // Transform series data for charting
  const chartData = series.flatMap(s => 
    s.data.map(point => ({
      time: new Date(point.timestamp).getTime(),
      [s.name]: point.value
    }))
  );

  return (
    <LineChart width={800} height={400} data={chartData}>
      <CartesianGrid strokeDasharray="3 3" />
      <XAxis 
        dataKey="time" 
        type="number"
        domain={['dataMin', 'dataMax']}
        tickFormatter={(time) => new Date(time).toLocaleTimeString()}
      />
      <YAxis />
      <Tooltip labelFormatter={(time) => new Date(time).toLocaleString()} />
      <Legend />
      {series.map(s => (
        <Line 
          key={s.name}
          type="monotone" 
          dataKey={s.name} 
          stroke={getColor(s.name)} 
        />
      ))}
    </LineChart>
  );
}
```

## Configuration

### Environment Variables

Set these environment variables to configure telemetry sources globally:

```bash
# Prometheus configuration
REACTORY_PROMETHEUS_HOST=localhost
REACTORY_PROMETHEUS_PORT=9090
REACTORY_PROMETHEUS_PROTOCOL=http
REACTORY_PROMETHEUS_USERNAME=optional
REACTORY_PROMETHEUS_PASSWORD=optional

# Alternative environment variable names (legacy support)
PROMETHEUS_URL=http://localhost:9090

# OTEL/Jaeger configuration
REACTORY_JAEGER_HOST=localhost
REACTORY_JAEGER_PORT=6831
REACTORY_JAEGER_PROTOCOL=http

# Loki (Log aggregation) configuration
REACTORY_LOKI_HOST=localhost
REACTORY_LOKI_PORT=3100
REACTORY_LOKI_PROTOCOL=http
REACTORY_LOKI_USERNAME=optional
REACTORY_LOKI_PASSWORD=optional

# Enable metric persistence to database
DO_STORE_STATISTICS=true
```

### Partner-Specific Connection Settings

You can configure telemetry connections per partner/organization using the Reactory settings system. Add connection settings to your partner configuration:

```typescript
// In your partner settings file (e.g., settings.ts)
export default [
  {
    name: 'reactory.prometheus.connection',
    componentFqn: 'reactory-telemetry.PrometheusConnectionForm@1.0.0',
    data: {
      host: 'prometheus.example.com',
      port: 9090,
      protocol: 'https',
      username: 'optional',
      password: 'optional'
    },
    roles: ['ADMIN'],
  },
  {
    name: 'reactory.loki.connection',
    componentFqn: 'reactory-telemetry.LokiConnectionForm@1.0.0',
    data: {
      host: 'loki.example.com',
      port: 3100,
      protocol: 'https',
      username: 'optional',
      password: 'optional'
    },
    roles: ['ADMIN'],
  },
  {
    name: 'reactory.jaeger.connection',
    componentFqn: 'reactory-telemetry.JaegerConnectionForm@1.0.0',
    data: {
      host: 'jaeger.example.com',
      port: 6831,
      protocol: 'http',
    },
    roles: ['ADMIN'],
  }
];
```

### Using Connection ID in Queries

To use partner-specific connection settings, provide the `connectionId` parameter:

```graphql
query {
  queryTelemetry(input: {
    connectionId: "reactory.prometheus.connection"
    source: PROMETHEUS
    query: "http_requests_total"
    timeRange: {
      start: "2024-01-01T00:00:00Z"
      end: "2024-01-02T00:00:00Z"
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
```

**Connection Resolution Order:**
1. If `connectionId` is provided, use partner settings with that name
2. Otherwise, use environment variables
3. If neither is available, return an error

## Aggregation Functions

The following aggregation functions are supported:

- **AVG**: Average value
- **SUM**: Sum of all values
- **MIN**: Minimum value
- **MAX**: Maximum value
- **COUNT**: Count of data points
- **MEDIAN**: Median value
- **P95**: 95th percentile
- **P99**: 99th percentile
- **STDDEV**: Standard deviation

## Time Range Formats

Time ranges can be specified in multiple formats:

- **ISO 8601**: `2024-01-01T00:00:00Z`
- **Unix Timestamp**: `1704067200000` (milliseconds)
- **Relative**: Future support for relative times like "now-1h"

## Best Practices

1. **Limit Data Points**: Use `limit` parameter to avoid querying too much data
2. **Appropriate Time Ranges**: Query smaller time windows for detailed data
3. **Use Aggregations**: Apply aggregations for large datasets
4. **Cache Results**: Cache query results on the client side
5. **Error Handling**: Always handle errors and warnings in responses

## Permissions

All telemetry queries require authentication. Users must have one of the following roles:

- `USER`: Can query telemetry data
- `ADMIN`: Full access to all telemetry features

## Limitations & Future Enhancements

### Current Limitations

- OTEL query support is under development
- Log query support is under development
- Database query support is under development
- Limited to 1000 data points per series (configurable)

### Planned Features

- [ ] OTEL Collector integration
- [ ] Loki log aggregation support
- [ ] Advanced filtering and transformations
- [ ] Real-time streaming queries
- [ ] Custom metric calculations
- [ ] Alert threshold queries
- [ ] Data export functionality
- [ ] Query templates and saved queries

## Error Handling

The API returns warnings in the response for non-critical issues:

```json
{
  "queryTelemetry": {
    "series": [],
    "warnings": [
      "OTEL query support is under development"
    ]
  }
}
```

Critical errors will throw GraphQL errors:

```json
{
  "errors": [
    {
      "message": "Prometheus URL not configured",
      "path": ["queryTelemetry"]
    }
  ]
}
```

## Service Architecture

The telemetry query system consists of:

1. **GraphQL Schema** (`TelemetryQueries.graphql`): Type definitions
2. **Service Layer** (`TelemetryQueryService.ts`): Business logic and data source integration
3. **Resolvers** (`TelemetryQueries.ts`): GraphQL resolver implementation
4. **Module Registration**: Registered in `reactory-telemetry` module

## Contributing

When adding support for new data sources:

1. Add the source to `TelemetryDataSource` enum
2. Implement query method in `TelemetryQueryService`
3. Update `getSources()` to include the new source
4. Add configuration documentation
5. Write tests for the new integration

## Support

For issues or questions:
- Check the Reactory documentation
- Review example queries in this README
- Check telemetry service logs for detailed error messages
