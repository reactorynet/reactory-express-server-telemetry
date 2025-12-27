# ReactoryTelemetry Context Integration

## Overview

The `ReactoryTelemetry` wrapper has been integrated into the `ReactoryContext`, providing seamless access to OpenTelemetry metrics throughout your Reactory application. This integration allows you to easily create and manage counters, histograms, gauges, and other metrics with optional persistence to the StatisticsService.

## Key Features

✅ **Direct Context Access** - Telemetry is available on every context via `context.telemetry`  
✅ **OpenTelemetry Integration** - Uses industry-standard OpenTelemetry APIs  
✅ **Prometheus Exporter** - Metrics automatically exported for Prometheus scraping  
✅ **Optional Persistence** - Metrics can be saved to MongoDB via StatisticsService  
✅ **Automatic Context Enrichment** - Partner and user info automatically added  
✅ **Type-Safe API** - Full TypeScript support with proper types  
✅ **Easy Timing Helpers** - Built-in functions for measuring duration  

## Architecture

```
┌─────────────────────────────────────────────────────┐
│            ReactoryContext                          │
│  ┌──────────────────────────────────────────────┐  │
│  │         context.telemetry                    │  │
│  │                                              │  │
│  │  • createCounter()                           │  │
│  │  • createHistogram()                         │  │
│  │  • createGauge()                             │  │
│  │  • createUpDownCounter()                     │  │
│  │  • measureAsync()                            │  │
│  │  • startTimer()                              │  │
│  └──────────────────────────────────────────────┘  │
└────────────────┬──────────────────┬─────────────────┘
                 │                  │
         ┌───────▼──────┐   ┌───────▼──────────┐
         │ OpenTelemetry│   │  StatisticsService│
         │    Meter     │   │   (Optional)      │
         └───────┬──────┘   └──────────────────┘
                 │
         ┌───────▼──────────┐
         │ Prometheus       │
         │ Exporter         │
         │ (Port 9464)      │
         └──────────────────┘
```

## Implementation Details

### Files Changed/Created

1. **`src/modules/reactory-telemetry/ReactoryTelemetry.ts`** (NEW)
   - Core telemetry wrapper class
   - Implements counter, histogram, gauge, and updowncounter creation
   - Handles optional persistence to StatisticsService
   - Enriches metrics with context data

2. **`src/context/ReactoryContextProvider.ts`** (MODIFIED)
   - Added `telemetry: ReactoryTelemetry` property
   - Initializes telemetry in constructor
   - Fixed import for telemetry module

3. **`src/modules/reactory-core/services/Statistics/StatisticsService.ts`** (MODIFIED)
   - Fixed validation to validate each statistic individually
   - Optimized `insertMany` with `ordered: false` and `lean: true`
   - Added `DO_STORE_STATISTICS` environment variable support

4. **Supporting Files** (NEW)
   - `ReactoryTelemetry.examples.md` - Usage examples
   - `demo/TelemetryDemo.ts` - Complete demo service
   - `TELEMETRY_CONTEXT_INTEGRATION.md` - This file

### Key Design Decisions

#### 1. Context Integration
The telemetry wrapper is instantiated once per context, ensuring:
- Consistent metric collection across the request lifecycle
- Automatic enrichment with partner/user data
- Clean separation of concerns

#### 2. Metric Reuse
Metrics are cached in Maps to avoid recreating them:
```typescript
private counters: Map<string, Counter> = new Map();
private histograms: Map<string, Histogram> = new Map();
```

This ensures efficient memory usage and consistent metric identity.

#### 3. Gauge Implementation
Gauges use OpenTelemetry's `ObservableGauge` with callbacks:
```typescript
gauge.addCallback((observableResult: ObservableResult<Attributes>) => {
  values.forEach((value, attributesKey) => {
    const attributes = JSON.parse(attributesKey);
    observableResult.observe(value, attributes);
  });
});
```

This allows for point-in-time value tracking while maintaining OpenTelemetry compatibility.

#### 4. Optional Persistence
Each metric creation accepts a `persist` option:
```typescript
const counter = context.telemetry.createCounter('my_metric', {
  persist: true,  // Save to StatisticsService
  ttl: 86400,     // Keep for 24 hours
});
```

Persistence is controlled by:
- Per-metric `persist` option (default: true if enabled globally)
- Global `DO_STORE_STATISTICS` environment variable

#### 5. Error Handling
Telemetry operations never throw errors that would break application flow:
```typescript
try {
  // Record metric
} catch (error) {
  logger.error('Failed to record metric', { error });
  // Continue execution
}
```

## Usage Patterns

### Basic Usage in Services

```typescript
class MyService implements Reactory.Service.IReactoryService {
  async myMethod(args: any, context: Reactory.Server.IReactoryContext) {
    // Create counter
    const counter = context.telemetry.createCounter('my_operation_total', {
      description: 'Total operations performed',
    });
    
    // Increment
    counter.add(1, { status: 'success' });
  }
}
```

### Timing Operations

```typescript
// Using measureAsync helper
const result = await context.telemetry.measureAsync(
  'database_query_duration',
  async () => {
    return await db.query('SELECT * FROM users');
  },
  { operation: 'select' }
);

// Or manual timing
const endTimer = context.telemetry.startTimer('manual_operation_duration');
// ... do work ...
endTimer();
```

### GraphQL Resolvers

```typescript
const Resolvers = {
  Query: {
    getUsers: async (parent: any, args: any, context: Reactory.Server.IReactoryContext) => {
      const counter = context.telemetry.createCounter('graphql_queries_total');
      counter.add(1, { query: 'getUsers' });
      
      return await context.telemetry.measureAsync(
        'graphql_query_duration',
        async () => UserModel.find({}),
        { query: 'getUsers' }
      );
    },
  },
};
```

### Workflow/Background Jobs

```typescript
class SyncWorkflow {
  async execute(context: Reactory.Server.IReactoryContext) {
    const progress = context.telemetry.createGauge('sync_progress');
    const counter = context.telemetry.createCounter('sync_items_processed', {
      persist: true,
      ttl: 604800, // 7 days
    });
    
    for (let i = 0; i < items.length; i++) {
      await processItem(items[i]);
      counter.add(1);
      progress.set((i + 1) / items.length * 100);
    }
  }
}
```

## Configuration

### Environment Variables

```bash
# Enable/disable metric persistence to database
DO_STORE_STATISTICS=true

# Metric name prefix (default: 'reactory')
REACTORY_METRICS_PREFIX=myapp

# Prometheus exporter configuration
REACTORY_PROMETHEUS_EXPORTER_PORT=9464
REACTORY_PROMETHEUS_EXPORTER_HOST=0.0.0.0
REACTORY_PROMETHEUS_EXPORTER_PREFIX=myapp_
```

### Prometheus Scrape Config

Add to your `prometheus.yml`:

```yaml
scrape_configs:
  - job_name: 'reactory-express'
    static_configs:
      - targets: ['localhost:9464']
```

## Metric Types Guide

### Counter
**When to use:** Monotonically increasing values (always goes up)

**Examples:**
- HTTP requests total
- Errors total
- Bytes sent
- Items processed

```typescript
const counter = context.telemetry.createCounter('requests_total');
counter.add(1, { method: 'GET', path: '/api/users' });
```

### UpDownCounter
**When to use:** Values that can increase or decrease

**Examples:**
- Active connections
- Queue size
- Items in cache
- Active sessions

```typescript
const connections = context.telemetry.createUpDownCounter('active_connections');
connections.add(1);  // New connection
// ... later ...
connections.add(-1); // Connection closed
```

### Histogram
**When to use:** Distribution of values (for latency, sizes, etc.)

**Examples:**
- Request duration
- Response size
- Database query time
- File sizes

```typescript
const histogram = context.telemetry.createHistogram('request_duration_seconds', {
  unit: 'seconds',
});
histogram.record(0.253, { method: 'POST', endpoint: '/api/data' });
```

### Gauge
**When to use:** Current value observations

**Examples:**
- Memory usage
- CPU utilization
- Temperature
- Current progress percentage

```typescript
const gauge = context.telemetry.createGauge('memory_usage_bytes', {
  unit: 'bytes',
});
gauge.set(process.memoryUsage().heapUsed);
```

## Automatic Enrichment

All metrics are automatically enriched with context data:

```typescript
{
  partner_id: "507f1f77bcf86cd799439011",
  partner_name: "Acme Corp",
  user_id: "12345678" // Truncated for privacy
}
```

You don't need to manually add these attributes - they're included automatically.

## Persistence Details

When `persist: true` is set, metrics are saved to the StatisticsService with the following structure:

```typescript
{
  name: 'reactory_my_metric_total',
  type: 'counter',
  value: 1,
  attributes: {
    partner_id: '...',
    partner_name: '...',
    custom_attribute: 'value'
  },
  timestamp: new Date(),
  resource: {
    serviceName: 'reactory-express-server',
    serviceVersion: '1.0.0',
    deploymentEnvironment: 'production'
  },
  expiresAt: new Date(Date.now() + 86400000) // If TTL set
}
```

## Best Practices

### 1. Metric Naming
Follow OpenTelemetry conventions:
- Use `snake_case`
- Include units in name (e.g., `_bytes`, `_seconds`)
- Use common suffixes:
  - `_total` for counters
  - `_duration` for histograms
  - `_bytes`/`_size` for sizes

### 2. Keep Cardinality Low
❌ **BAD:** High cardinality
```typescript
counter.add(1, { 
  user_id: 'exact-user-id-12345',  // Too many unique values
  timestamp: Date.now()             // Infinite unique values
});
```

✅ **GOOD:** Low cardinality
```typescript
counter.add(1, { 
  user_type: 'authenticated',  // Few unique values
  status: 'success'            // Limited set of values
});
```

### 3. Reuse Metrics
Initialize metrics once in constructor or at module level:

```typescript
class MyService {
  private requestCounter: any;
  
  constructor(props: any, context: Reactory.Server.IReactoryContext) {
    this.context = context;
    // Initialize once
    this.requestCounter = context.telemetry.createCounter('service_requests_total');
  }
  
  async myMethod() {
    // Reuse multiple times
    this.requestCounter.add(1);
  }
}
```

### 4. Use Timing Helpers
Prefer built-in helpers over manual timing:

✅ **GOOD:**
```typescript
await context.telemetry.measureAsync('operation_duration', async () => {
  return await doWork();
});
```

❌ **LESS IDEAL:**
```typescript
const start = Date.now();
const result = await doWork();
histogram.record((Date.now() - start) / 1000);
```

### 5. Handle Errors Gracefully
Telemetry is supplementary - don't let it break your app:

```typescript
try {
  await businessLogic();
  counter.add(1, { status: 'success' });
} catch (error) {
  counter.add(1, { status: 'error' });
  throw error; // Rethrow business error
}
```

## Viewing Metrics

### Prometheus Endpoint
Metrics are exposed at: `http://localhost:9464/metrics`

### Grafana Dashboards
Pre-configured dashboards are available in:
`src/modules/reactory-telemetry/data/grafana/models/dashboards/`

### Database Queries
If persistence is enabled, query via GraphQL:

```graphql
query GetStatistics {
  getStatistics(
    filter: {
      names: ["reactory_my_metric_total"]
      from: "2024-01-01T00:00:00Z"
      till: "2024-01-31T23:59:59Z"
    }
  ) {
    name
    type
    value
    attributes
    timestamp
  }
}
```

## Testing

See `demo/TelemetryDemo.ts` for comprehensive examples of all metric types and usage patterns.

## Migration Guide

### Before (Manual OpenTelemetry)
```typescript
import meter from '@reactory/server-modules/reactory-telemetry/prometheus/meter';

class MyService {
  private counter = meter.createCounter('my_counter');
  
  async myMethod() {
    this.counter.add(1, { 
      // Manual attribute enrichment
      partner_id: this.context.partner._id.toString(),
    });
  }
}
```

### After (Context Telemetry)
```typescript
class MyService {
  async myMethod(args: any, context: Reactory.Server.IReactoryContext) {
    const counter = context.telemetry.createCounter('my_counter', {
      persist: true,  // Optional persistence
    });
    
    counter.add(1);  // Automatic attribute enrichment!
  }
}
```

## Troubleshooting

### Metrics Not Appearing in Prometheus
1. Check exporter is running: `curl http://localhost:9464/metrics`
2. Verify Prometheus scrape config points to correct port
3. Check environment variables are set correctly

### Metrics Not Persisting to Database
1. Ensure `DO_STORE_STATISTICS=true` in environment
2. Check StatisticsService is registered and available
3. Review logs for persistence errors (logged as debug level)

### High Memory Usage
1. Reduce metric cardinality (fewer unique attribute combinations)
2. Set shorter TTLs for persisted metrics
3. Consider disabling persistence for high-frequency metrics

## Future Enhancements

Potential future improvements:
- [ ] Tracing integration (spans and traces)
- [ ] Automatic service-level metrics (request rate, error rate, duration)
- [ ] Metric aggregation and rollup
- [ ] Custom exporters (DataDog, New Relic, etc.)
- [ ] Metric sampling for high-volume scenarios
- [ ] Dashboard generation from metric definitions

## Support

For questions or issues:
1. Review examples in `ReactoryTelemetry.examples.md`
2. Check demo service in `demo/TelemetryDemo.ts`
3. See existing auth telemetry in `authentication/strategies/telemetry.ts`

