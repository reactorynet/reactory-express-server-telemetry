# ReactoryTelemetry Quick Reference

## Access Telemetry

```typescript
// Available on every context
context.telemetry
```

## Counter (Monotonically Increasing)

**Use for:** Total counts (requests, errors, items processed)

```typescript
const counter = context.telemetry.createCounter('my_metric_total', {
  description: 'Description of what this counts',
  persist: true,  // Optional: save to database
  ttl: 86400,     // Optional: TTL in seconds for DB storage
});

counter.add(1, { status: 'success', operation: 'create' });
```

## UpDownCounter (Can Increase/Decrease)

**Use for:** Current states (active connections, queue size)

```typescript
const connections = context.telemetry.createUpDownCounter('active_connections');

connections.add(1);   // New connection
connections.add(-1);  // Connection closed
```

## Histogram (Value Distribution)

**Use for:** Latency, sizes, durations

```typescript
const histogram = context.telemetry.createHistogram('request_duration_seconds', {
  unit: 'seconds',
});

histogram.record(0.234, { method: 'POST', endpoint: '/api/users' });
```

## Gauge (Point-in-Time Value)

**Use for:** Current readings (memory, temperature, progress)

```typescript
const gauge = context.telemetry.createGauge('memory_usage_bytes', {
  unit: 'bytes',
});

gauge.set(process.memoryUsage().heapUsed);
```

## Timing Helpers

### Async Function

```typescript
const result = await context.telemetry.measureAsync(
  'operation_duration_seconds',
  async () => {
    // Your async work here
    return await doWork();
  },
  { operation_type: 'query' }
);
```

### Sync Function

```typescript
const result = context.telemetry.measure(
  'calculation_duration_seconds',
  () => {
    // Your sync work here
    return calculate();
  },
  { calc_type: 'matrix' }
);
```

### Manual Timer

```typescript
const endTimer = context.telemetry.startTimer('manual_operation_seconds');

// Do work...

endTimer(); // Automatically records duration
```

## Complete Example

```typescript
class MyService {
  async processData(data: any[], context: Reactory.Server.IReactoryContext) {
    // Create metrics
    const counter = context.telemetry.createCounter('items_processed_total');
    const errorCounter = context.telemetry.createCounter('processing_errors_total');
    const duration = context.telemetry.createHistogram('processing_duration_seconds');
    
    // Time the operation
    const endTimer = context.telemetry.startTimer('batch_processing_seconds', {
      batch_size: data.length.toString(),
    });
    
    try {
      for (const item of data) {
        try {
          await this.processItem(item);
          counter.add(1, { status: 'success' });
        } catch (error) {
          errorCounter.add(1, { 
            error_type: error.constructor.name 
          });
        }
      }
    } finally {
      endTimer();
    }
  }
}
```

## Attribute Best Practices

✅ **DO:** Use low cardinality values
```typescript
counter.add(1, { 
  status: 'success',           // Few possible values
  operation: 'create',         // Limited set
  partner_type: 'enterprise'   // Category
});
```

❌ **DON'T:** Use high cardinality values
```typescript
counter.add(1, { 
  user_id: 'exact-id-12345',   // Too many unique values
  timestamp: Date.now(),       // Infinite unique values
  email: 'user@example.com'    // Too many unique values
});
```

## Metric Naming Conventions

- Use `snake_case`
- Include units: `_bytes`, `_seconds`, `_count`
- Use suffixes:
  - `_total` for counters
  - `_duration` or `_latency` for histograms
  - `_bytes` or `_size` for sizes
  - `_active` or `_current` for gauges

**Examples:**
- `api_requests_total`
- `database_query_duration_seconds`
- `memory_usage_bytes`
- `active_connections`

## Configuration

```bash
# Enable metric persistence to database
DO_STORE_STATISTICS=true

# Metric prefix (default: 'reactory')
REACTORY_METRICS_PREFIX=myapp

# Prometheus exporter
REACTORY_PROMETHEUS_EXPORTER_PORT=9464
REACTORY_PROMETHEUS_EXPORTER_HOST=0.0.0.0
```

## Automatic Context Enrichment

All metrics automatically include:
- `partner_id` - Current partner ID
- `partner_name` - Current partner name
- `user_id` - Current user ID (truncated for privacy)

You don't need to add these manually!

## View Metrics

**Prometheus Endpoint:**
```bash
curl http://localhost:9464/metrics
```

**Database Query (if persistence enabled):**
```graphql
query GetStatistics {
  getStatistics(filter: { names: ["my_metric_total"] }) {
    name
    value
    attributes
    timestamp
  }
}
```

## Common Patterns

### Track Success/Failure
```typescript
const counter = context.telemetry.createCounter('operations_total');

try {
  await operation();
  counter.add(1, { status: 'success' });
} catch (error) {
  counter.add(1, { status: 'error', error_type: error.constructor.name });
  throw error;
}
```

### Track Job Progress
```typescript
const progress = context.telemetry.createGauge('job_progress');
const processed = context.telemetry.createCounter('items_processed_total');

for (let i = 0; i < items.length; i++) {
  await processItem(items[i]);
  processed.add(1);
  progress.set((i + 1) / items.length * 100);
}
```

### Track Active Workers
```typescript
const workers = context.telemetry.createUpDownCounter('active_workers');

workers.add(1);  // Worker started
try {
  await doWork();
} finally {
  workers.add(-1);  // Worker finished
}
```

## Troubleshooting

**Metrics not appearing?**
- Check Prometheus exporter: `curl http://localhost:9464/metrics`
- Verify environment variables are set
- Check logs for telemetry errors

**Metrics not persisting?**
- Ensure `DO_STORE_STATISTICS=true`
- Check StatisticsService is available
- Review logs (persistence errors logged at debug level)

**High memory usage?**
- Reduce attribute cardinality
- Set shorter TTLs
- Disable persistence for high-frequency metrics

## More Information

- Full examples: `ReactoryTelemetry.examples.md`
- Complete demo service: `demo/TelemetryDemo.ts`
- Integration guide: `TELEMETRY_CONTEXT_INTEGRATION.md`

