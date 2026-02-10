/**
 * Example React components demonstrating telemetry query integration
 * These examples show how to use the telemetry GraphQL API with Apollo Client
 */

import React from 'react';
import { useQuery, gql } from '@apollo/client';

// ============================================
// GraphQL Queries
// ============================================

const QUERY_TELEMETRY = gql`
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
      }
      totalSeries
      totalDataPoints
      executionTime
      warnings
    }
  }
`;

const GET_TELEMETRY_SOURCES = gql`
  query GetTelemetrySources {
    getTelemetrySources {
      source
      available
      status
      metricCount
      lastQuery
      metadata
    }
  }
`;

const LIST_TELEMETRY_METRICS = gql`
  query ListTelemetryMetrics($filter: TelemetryMetricsFilter) {
    listTelemetryMetrics(filter: $filter) {
      name
      description
      type
      unit
      labels
      source
    }
  }
`;

const GET_METRIC_STATS = gql`
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
`;

// ============================================
// Example 1: Basic Telemetry Chart
// ============================================

interface TelemetryChartProps {
  metricName: string;
  source?: 'PROMETHEUS' | 'OTEL' | 'LOGS' | 'DATABASE';
  hours?: number;
}

export const TelemetryChart: React.FC<TelemetryChartProps> = ({ 
  metricName, 
  source = 'PROMETHEUS',
  hours = 24 
}) => {
  const endTime = new Date();
  const startTime = new Date(endTime.getTime() - hours * 60 * 60 * 1000);

  const { data, loading, error } = useQuery(QUERY_TELEMETRY, {
    variables: {
      input: {
        source,
        query: metricName,
        timeRange: {
          start: startTime.toISOString(),
          end: endTime.toISOString()
        }
      }
    },
    pollInterval: 30000 // Refresh every 30 seconds
  });

  if (loading) return <div>Loading telemetry data...</div>;
  if (error) return <div>Error: {error.message}</div>;

  const { series, executionTime, warnings } = data.queryTelemetry;

  return (
    <div>
      <h3>{metricName}</h3>
      {warnings && warnings.length > 0 && (
        <div style={{ color: 'orange' }}>
          {warnings.map((w, i) => <div key={i}>{w}</div>)}
        </div>
      )}
      <p>Execution time: {executionTime}ms</p>
      {/* Render your chart here with series data */}
      <pre>{JSON.stringify(series, null, 2)}</pre>
    </div>
  );
};

// ============================================
// Example 2: Data Source Status Dashboard
// ============================================

export const TelemetrySourceStatus: React.FC = () => {
  const { data, loading, error } = useQuery(GET_TELEMETRY_SOURCES);

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <div>
      <h3>Telemetry Data Sources</h3>
      <table>
        <thead>
          <tr>
            <th>Source</th>
            <th>Status</th>
            <th>Available</th>
            <th>Metrics</th>
          </tr>
        </thead>
        <tbody>
          {data.getTelemetrySources.map(source => (
            <tr key={source.source}>
              <td>{source.source}</td>
              <td>{source.status}</td>
              <td>{source.available ? '✅' : '❌'}</td>
              <td>{source.metricCount || 'N/A'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

// ============================================
// Example 3: Metric Statistics Display
// ============================================

interface MetricStatsProps {
  metricName: string;
  source?: 'PROMETHEUS' | 'OTEL' | 'LOGS' | 'DATABASE';
  hours?: number;
}

export const MetricStatistics: React.FC<MetricStatsProps> = ({
  metricName,
  source = 'PROMETHEUS',
  hours = 24
}) => {
  const endTime = new Date();
  const startTime = new Date(endTime.getTime() - hours * 60 * 60 * 1000);

  const { data, loading, error } = useQuery(GET_METRIC_STATS, {
    variables: {
      input: {
        metricName,
        source,
        timeRange: {
          start: startTime.toISOString(),
          end: endTime.toISOString()
        }
      }
    }
  });

  if (loading) return <div>Loading statistics...</div>;
  if (error) return <div>Error: {error.message}</div>;

  const stats = data.getTelemetryMetricStats;

  return (
    <div>
      <h3>Statistics: {metricName}</h3>
      <table>
        <tbody>
          <tr>
            <td>Average:</td>
            <td>{stats.avg?.toFixed(2)}</td>
          </tr>
          <tr>
            <td>Min:</td>
            <td>{stats.min?.toFixed(2)}</td>
          </tr>
          <tr>
            <td>Max:</td>
            <td>{stats.max?.toFixed(2)}</td>
          </tr>
          <tr>
            <td>Sum:</td>
            <td>{stats.sum?.toFixed(2)}</td>
          </tr>
          <tr>
            <td>Count:</td>
            <td>{stats.count}</td>
          </tr>
          <tr>
            <td>Std Dev:</td>
            <td>{stats.stddev?.toFixed(2)}</td>
          </tr>
          {stats.percentiles && (
            <>
              <tr>
                <td>P50:</td>
                <td>{stats.percentiles.p50?.toFixed(2)}</td>
              </tr>
              <tr>
                <td>P95:</td>
                <td>{stats.percentiles.p95?.toFixed(2)}</td>
              </tr>
              <tr>
                <td>P99:</td>
                <td>{stats.percentiles.p99?.toFixed(2)}</td>
              </tr>
            </>
          )}
        </tbody>
      </table>
    </div>
  );
};

// ============================================
// Example 4: Metric Browser
// ============================================

interface MetricBrowserProps {
  source?: 'PROMETHEUS' | 'OTEL' | 'LOGS' | 'DATABASE';
}

export const MetricBrowser: React.FC<MetricBrowserProps> = ({ source }) => {
  const [search, setSearch] = React.useState('');

  const { data, loading, error } = useQuery(LIST_TELEMETRY_METRICS, {
    variables: {
      filter: {
        source,
        search: search || undefined
      }
    }
  });

  if (error) return <div>Error: {error.message}</div>;

  const metrics = data?.listTelemetryMetrics || [];

  return (
    <div>
      <h3>Available Metrics</h3>
      <input
        type="text"
        placeholder="Search metrics..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
      {loading ? (
        <div>Loading...</div>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Type</th>
              <th>Source</th>
              <th>Description</th>
            </tr>
          </thead>
          <tbody>
            {metrics.map(metric => (
              <tr key={`${metric.source}-${metric.name}`}>
                <td>{metric.name}</td>
                <td>{metric.type}</td>
                <td>{metric.source}</td>
                <td>{metric.description}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

// ============================================
// Example 5: Advanced Query Builder
// ============================================

interface QueryBuilderProps {
  onQueryChange?: (result: any) => void;
}

export const TelemetryQueryBuilder: React.FC<QueryBuilderProps> = ({ onQueryChange }) => {
  const [source, setSource] = React.useState<'PROMETHEUS' | 'OTEL' | 'LOGS' | 'DATABASE'>('PROMETHEUS');
  const [query, setQuery] = React.useState('');
  const [hours, setHours] = React.useState(24);
  const [groupBy, setGroupBy] = React.useState('');
  const [aggregation, setAggregation] = React.useState('AVG');

  const endTime = new Date();
  const startTime = new Date(endTime.getTime() - hours * 60 * 60 * 1000);

  const { data, loading, error, refetch } = useQuery(QUERY_TELEMETRY, {
    variables: {
      input: {
        source,
        query,
        timeRange: {
          start: startTime.toISOString(),
          end: endTime.toISOString()
        },
        groupBy: groupBy ? groupBy.split(',').map(g => g.trim()) : undefined,
        aggregation: aggregation || undefined
      }
    },
    skip: !query
  });

  React.useEffect(() => {
    if (data && onQueryChange) {
      onQueryChange(data.queryTelemetry);
    }
  }, [data, onQueryChange]);

  const handleExecute = () => {
    if (query) {
      refetch();
    }
  };

  return (
    <div>
      <h3>Query Builder</h3>
      <div>
        <label>
          Data Source:
          <select value={source} onChange={(e) => setSource(e.target.value as any)}>
            <option value="PROMETHEUS">Prometheus</option>
            <option value="OTEL">OpenTelemetry</option>
            <option value="LOGS">Logs</option>
            <option value="DATABASE">Database</option>
          </select>
        </label>
      </div>
      <div>
        <label>
          Query:
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="e.g., http_requests_total"
          />
        </label>
      </div>
      <div>
        <label>
          Time Range (hours):
          <input
            type="number"
            value={hours}
            onChange={(e) => setHours(Number(e.target.value))}
            min="1"
            max="168"
          />
        </label>
      </div>
      <div>
        <label>
          Group By (comma-separated):
          <input
            type="text"
            value={groupBy}
            onChange={(e) => setGroupBy(e.target.value)}
            placeholder="e.g., method, status"
          />
        </label>
      </div>
      <div>
        <label>
          Aggregation:
          <select value={aggregation} onChange={(e) => setAggregation(e.target.value)}>
            <option value="">None</option>
            <option value="AVG">Average</option>
            <option value="SUM">Sum</option>
            <option value="MIN">Minimum</option>
            <option value="MAX">Maximum</option>
            <option value="COUNT">Count</option>
          </select>
        </label>
      </div>
      <button onClick={handleExecute} disabled={!query}>
        Execute Query
      </button>

      {loading && <div>Executing query...</div>}
      {error && <div style={{ color: 'red' }}>Error: {error.message}</div>}
      {data && (
        <div>
          <h4>Results</h4>
          <p>Series: {data.queryTelemetry.totalSeries}</p>
          <p>Data Points: {data.queryTelemetry.totalDataPoints}</p>
          <p>Execution Time: {data.queryTelemetry.executionTime}ms</p>
          <pre>{JSON.stringify(data.queryTelemetry.series, null, 2)}</pre>
        </div>
      )}
    </div>
  );
};

// ============================================
// Example Usage in App
// ============================================

export const TelemetryDashboard: React.FC = () => {
  return (
    <div>
      <h1>Telemetry Dashboard</h1>
      
      <section>
        <TelemetrySourceStatus />
      </section>

      <section>
        <TelemetryChart metricName="http_requests_total" hours={12} />
      </section>

      <section>
        <MetricStatistics metricName="api_response_time" hours={24} />
      </section>

      <section>
        <MetricBrowser source="PROMETHEUS" />
      </section>

      <section>
        <TelemetryQueryBuilder 
          onQueryChange={(result) => console.log('Query result:', result)}
        />
      </section>
    </div>
  );
};
