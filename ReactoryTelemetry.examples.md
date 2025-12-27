# ReactoryTelemetry Usage Examples

The `ReactoryTelemetry` class provides a unified interface for creating and managing OpenTelemetry metrics with optional persistence to the StatisticsService.

## Accessing Telemetry from Context

The telemetry wrapper is automatically available on the Reactory context:

```typescript
const myService = {
  async myMethod(args: any, context: Reactory.Server.IReactoryContext) {
    // Access telemetry from context
    const telemetry = context.telemetry;
    
    // Use telemetry methods...
  }
};
```

## Counter Metrics

Counters are monotonically increasing values (always go up). Perfect for tracking total counts.

```typescript
// Create a counter
const requestCounter = context.telemetry.createCounter('api_requests_total', {
  description: 'Total number of API requests',
  persist: true, // Optionally persist to database
  ttl: 86400, // 24 hour TTL for persisted metrics
});

// Increment the counter
requestCounter.add(1, {
  method: 'GET',
  endpoint: '/api/users',
  status: '200',
});
```

## UpDownCounter Metrics

UpDownCounters can increase or decrease. Useful for tracking current states.

```typescript
// Create an up-down counter for active connections
const activeConnections = context.telemetry.createUpDownCounter('active_connections', {
  description: 'Number of active WebSocket connections',
});

// Connection opened
activeConnections.add(1, { type: 'websocket' });

// Connection closed
activeConnections.add(-1, { type: 'websocket' });
```

## Histogram Metrics

Histograms track distributions of values. Perfect for latency, sizes, etc.

```typescript
// Create a histogram for request duration
const requestDuration = context.telemetry.createHistogram('request_duration_seconds', {
  description: 'HTTP request duration in seconds',
  unit: 'seconds',
});

// Record a value
const startTime = Date.now();
// ... do work ...
const duration = (Date.now() - startTime) / 1000;
requestDuration.record(duration, {
  method: 'POST',
  endpoint: '/api/data',
});
```

## Gauge Metrics

Gauges track current values that can go up or down independently.

```typescript
// Create a gauge for memory usage
const memoryGauge = context.telemetry.createGauge('memory_usage_bytes', {
  description: 'Current memory usage in bytes',
  unit: 'bytes',
});

// Set current value
memoryGauge.set(process.memoryUsage().heapUsed, {
  type: 'heap',
});

// Get current value
const currentValue = memoryGauge.get({ type: 'heap' });
```

## Timing Helpers

### Manual Timer

```typescript
// Start a timer
const endTimer = context.telemetry.startTimer('database_query_duration', {
  query_type: 'SELECT',
  table: 'users',
});

// ... perform database query ...

// Stop timer (automatically records duration)
endTimer();
```

### Measure Async Function

```typescript
const result = await context.telemetry.measureAsync(
  'cache_operation_duration',
  async () => {
    return await cache.get('some-key');
  },
  { operation: 'get' },
  { description: 'Cache operation duration', unit: 'seconds' }
);
```

### Measure Sync Function

```typescript
const result = context.telemetry.measure(
  'calculation_duration',
  () => {
    return complexCalculation(data);
  },
  { calculation_type: 'matrix' }
);
```

## Complete Service Example

```typescript
import Reactory from '@reactory/reactory-core';

class MyService implements Reactory.Service.IReactoryService {
  name = 'MyService';
  nameSpace = 'example';
  version = '1.0.0';
  context: Reactory.Server.IReactoryContext;

  constructor(props: any, context: Reactory.Server.IReactoryContext) {
    this.context = context;
  }

  async processData(data: any[]): Promise<any> {
    // Create metrics
    const processCounter = this.context.telemetry.createCounter('data_processed_total', {
      description: 'Total number of data items processed',
    });

    const errorCounter = this.context.telemetry.createCounter('processing_errors_total', {
      description: 'Total number of processing errors',
    });

    const batchSizeHistogram = this.context.telemetry.createHistogram('batch_size', {
      description: 'Size of processing batches',
      unit: 'items',
    });

    // Record batch size
    batchSizeHistogram.record(data.length);

    // Process with timing
    return await this.context.telemetry.measureAsync(
      'batch_processing_duration',
      async () => {
        const results = [];
        
        for (const item of data) {
          try {
            const result = await this.processItem(item);
            results.push(result);
            
            // Track successful processing
            processCounter.add(1, { status: 'success' });
          } catch (error) {
            // Track errors
            errorCounter.add(1, { 
              error_type: error.constructor.name,
            });
            throw error;
          }
        }
        
        return results;
      },
      { batch_size: data.length.toString() }
    );
  }

  private async processItem(item: any): Promise<any> {
    // Item processing logic
    return item;
  }
}
```

## GraphQL Resolver Example

```typescript
const QueryResolvers = {
  getUsers: async (
    parent: any,
    args: any,
    context: Reactory.Server.IReactoryContext
  ) => {
    const queryCounter = context.telemetry.createCounter('graphql_queries_total', {
      description: 'Total GraphQL queries executed',
    });

    queryCounter.add(1, {
      query: 'getUsers',
      authenticated: context.user ? 'true' : 'false',
    });

    return await context.telemetry.measureAsync(
      'graphql_query_duration',
      async () => {
        // Query logic
        return await UserModel.find({}).limit(args.limit);
      },
      { query: 'getUsers' },
      { description: 'GraphQL query execution time', unit: 'seconds' }
    );
  },
};
```

## Workflow/Background Job Example

```typescript
class DataSyncWorkflow {
  async execute(context: Reactory.Server.IReactoryContext) {
    const syncCounter = context.telemetry.createCounter('sync_operations_total', {
      description: 'Total sync operations',
      persist: true, // Persist for long-term tracking
      ttl: 604800, // 7 days
    });

    const syncGauge = context.telemetry.createGauge('sync_progress', {
      description: 'Current sync progress percentage',
    });

    const recordsProcessed = context.telemetry.createUpDownCounter('sync_records_in_flight', {
      description: 'Number of records currently being synced',
    });

    try {
      syncCounter.add(1, { status: 'started' });
      
      const totalRecords = 1000;
      for (let i = 0; i < totalRecords; i++) {
        recordsProcessed.add(1);
        
        // Update progress
        const progress = ((i + 1) / totalRecords) * 100;
        syncGauge.set(progress);
        
        // Sync record...
        
        recordsProcessed.add(-1);
      }
      
      syncCounter.add(1, { status: 'completed' });
      syncGauge.set(100);
    } catch (error) {
      syncCounter.add(1, { status: 'failed' });
      throw error;
    }
  }
}
```

## Resource Attributes

You can add custom resource attributes to provide more context:

```typescript
const metric = context.telemetry.createCounter('custom_metric', {
  description: 'Custom metric with resource attributes',
  resource: {
    serviceName: 'my-custom-service',
    serviceVersion: '2.0.0',
    deploymentEnvironment: 'production',
  },
});
```

## Automatic Context Enrichment

All metrics are automatically enriched with:
- `partner_id`: Current partner/client ID
- `partner_name`: Current partner/client name
- `user_id`: Current user ID (truncated for privacy)

You don't need to manually add these attributes.

## Configuration

Control telemetry behavior via environment variables:

```bash
# Enable/disable metric persistence to database
DO_STORE_STATISTICS=true

# Metric name prefix
REACTORY_METRICS_PREFIX=myapp

# Prometheus exporter settings
REACTORY_PROMETHEUS_EXPORTER_PORT=9464
REACTORY_PROMETHEUS_EXPORTER_HOST=0.0.0.0
```

## Best Practices

1. **Use descriptive metric names**: Follow OpenTelemetry naming conventions
   - Use snake_case
   - Include units in name (e.g., `_bytes`, `_seconds`)
   - Use common suffixes (`_total` for counters, `_duration` for histograms)

2. **Keep cardinality low**: Don't use high-cardinality values (like user IDs or timestamps) as attribute values

3. **Use appropriate metric types**:
   - Counter: Total counts (requests, errors, bytes)
   - UpDownCounter: Current states (connections, queue size)
   - Histogram: Distributions (latency, sizes)
   - Gauge: Point-in-time values (temperature, memory usage)

4. **Add useful attributes**: Include dimensions that help with debugging and analysis

5. **Use timing helpers**: Prefer `measureAsync()` and `measure()` over manual timing

6. **Handle errors gracefully**: Telemetry failures won't break your application flow

