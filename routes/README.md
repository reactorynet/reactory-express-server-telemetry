# Telemetry Routes Documentation

## Overview

The telemetry module now exposes health and metrics endpoints through the Express application. These endpoints are available at `/api/telemetry/*` and provide observability and health check capabilities.

## Available Endpoints

### 1. `/api/telemetry/metrics` (GET)

**Purpose**: Prometheus metrics endpoint  
**Format**: Prometheus text format (OpenMetrics)  
**Authentication**: None (consider adding in production)  

**Response Type**: `text/plain; version=0.0.4`

**Example Request**:
```bash
curl http://localhost:4000/api/telemetry/metrics
```

**Example Response**:
```
# HELP http_requests_total Total number of HTTP requests
# TYPE http_requests_total counter
http_requests_total{method="GET",route="/api/users",status_code="200",status_class="2xx"} 142

# HELP http_request_duration_seconds HTTP request duration in seconds
# TYPE http_request_duration_seconds histogram
http_request_duration_seconds_bucket{method="GET",route="/api/users",status_code="200",le="0.005"} 45
http_request_duration_seconds_bucket{method="GET",route="/api/users",status_code="200",le="0.01"} 89
http_request_duration_seconds_bucket{method="GET",route="/api/users",status_code="200",le="+Inf"} 142

# HELP process_memory_heap_used_bytes Process heap memory used in bytes
# TYPE process_memory_heap_used_bytes gauge
process_memory_heap_used_bytes 52428800
```

**Use Cases**:
- Configure Prometheus to scrape this endpoint
- Monitor application metrics
- Set up Grafana dashboards
- Create alerting rules

### 2. `/api/telemetry/health` (GET)

**Purpose**: Comprehensive health check  
**Format**: JSON  
**Authentication**: None

**Response Type**: `application/json`

**Example Request**:
```bash
curl http://localhost:4000/api/telemetry/health
```

**Example Response**:
```json
{
  "status": "healthy",
  "timestamp": "2024-11-27T10:30:45.123Z",
  "uptime": 3600.5,
  "memory": {
    "heapUsed": 52428800,
    "heapTotal": 104857600,
    "rss": 157286400,
    "external": 2097152
  },
  "cpu": {
    "user": 1250000,
    "system": 450000
  },
  "environment": "production",
  "nodeVersion": "v18.16.0",
  "pid": 12345
}
```

**Response Fields**:
- `status`: Overall health status (`healthy` or `unhealthy`)
- `timestamp`: Current ISO timestamp
- `uptime`: Process uptime in seconds
- `memory`: Memory usage breakdown in bytes
  - `heapUsed`: V8 heap memory used
  - `heapTotal`: V8 heap memory allocated
  - `rss`: Resident Set Size (total memory)
  - `external`: Memory used by C++ objects
- `cpu`: CPU usage in microseconds
  - `user`: User CPU time
  - `system`: System CPU time
- `environment`: NODE_ENV value
- `nodeVersion`: Node.js version
- `pid`: Process ID

**Use Cases**:
- Monitor application health
- Check memory usage
- Verify application is responsive
- Debug performance issues

### 3. `/api/telemetry/health/ready` (GET)

**Purpose**: Readiness probe (Kubernetes-compatible)  
**Format**: JSON  
**Authentication**: None

**Example Request**:
```bash
curl http://localhost:4000/api/telemetry/health/ready
```

**Example Response (Ready)**:
```json
{
  "status": "ready",
  "timestamp": "2024-11-27T10:30:45.123Z"
}
```

**Example Response (Not Ready)**:
```json
{
  "status": "not ready",
  "timestamp": "2024-11-27T10:30:45.123Z"
}
```

**HTTP Status Codes**:
- `200`: Application is ready to accept traffic
- `503`: Application is not ready (still initializing)

**Use Cases**:
- Kubernetes readiness probe
- Load balancer health checks
- Check if app can accept traffic
- Rolling deployment verification

**Kubernetes Configuration**:
```yaml
readinessProbe:
  httpGet:
    path: /api/telemetry/health/ready
    port: 4000
  initialDelaySeconds: 10
  periodSeconds: 5
  timeoutSeconds: 3
  failureThreshold: 3
```

### 4. `/api/telemetry/health/live` (GET)

**Purpose**: Liveness probe (Kubernetes-compatible)  
**Format**: JSON  
**Authentication**: None

**Example Request**:
```bash
curl http://localhost:4000/api/telemetry/health/live
```

**Example Response**:
```json
{
  "status": "alive",
  "timestamp": "2024-11-27T10:30:45.123Z"
}
```

**HTTP Status Codes**:
- `200`: Application is alive and responding

**Use Cases**:
- Kubernetes liveness probe
- Detect application deadlock/freeze
- Trigger automatic restarts
- Monitor application responsiveness

**Kubernetes Configuration**:
```yaml
livenessProbe:
  httpGet:
    path: /api/telemetry/health/live
    port: 4000
  initialDelaySeconds: 30
  periodSeconds: 10
  timeoutSeconds: 5
  failureThreshold: 3
```

## Configuration

### Prometheus Scrape Config

Add to your `prometheus.yml`:

```yaml
scrape_configs:
  - job_name: 'reactory-express'
    scrape_interval: 15s
    metrics_path: '/api/telemetry/metrics'
    static_configs:
      - targets: ['localhost:4000']
        labels:
          environment: 'production'
          service: 'reactory-server'
```

### Load Balancer Health Checks

**AWS Application Load Balancer**:
```
Health Check Path: /api/telemetry/health/ready
Health Check Interval: 30 seconds
Unhealthy Threshold: 2
Healthy Threshold: 5
Timeout: 5 seconds
Success Codes: 200
```

**NGINX**:
```nginx
upstream reactory_backend {
  server localhost:4000;
}

server {
  location / {
    proxy_pass http://reactory_backend;
    health_check uri=/api/telemetry/health/ready interval=10s;
  }
}
```

## Security Considerations

### Production Recommendations

1. **Restrict Metrics Endpoint**:
```typescript
// Add authentication middleware
router.get('/metrics', authMiddleware, async (req, res) => {
  // ... metrics logic
});
```

2. **IP Whitelist**:
```typescript
// Only allow Prometheus server
const metricsWhitelist = ['10.0.1.100', '10.0.1.101'];

router.get('/metrics', (req, res, next) => {
  const clientIp = req.ip;
  if (metricsWhitelist.includes(clientIp)) {
    next();
  } else {
    res.status(403).json({ error: 'Forbidden' });
  }
});
```

3. **Rate Limiting**:
```typescript
import rateLimit from 'express-rate-limit';

const metricsLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 100, // 100 requests per minute
});

router.get('/metrics', metricsLimiter, async (req, res) => {
  // ... metrics logic
});
```

4. **Separate Port** (already implemented):
   - Metrics also available on dedicated port: `http://localhost:9464/metrics`
   - Use firewall rules to restrict access to this port

## Monitoring Integration

### Grafana Dashboard Setup

1. Add Prometheus data source
2. Import dashboard or create custom queries:

```promql
# Request rate
rate(http_requests_total[5m])

# Error rate
rate(http_requests_by_status_total{status_class="5xx"}[5m])

# P95 latency
histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))

# Memory usage
process_memory_heap_used_bytes / process_memory_heap_total_bytes * 100
```

### Alertmanager Rules

Create alerting rules based on metrics:

```yaml
groups:
  - name: reactory_alerts
    rules:
      - alert: HighErrorRate
        expr: rate(http_requests_by_status_total{status_class="5xx"}[5m]) > 0.05
        for: 5m
        annotations:
          summary: "High error rate detected"
      
      - alert: HighMemoryUsage
        expr: process_memory_heap_used_bytes / process_memory_heap_total_bytes > 0.9
        for: 10m
        annotations:
          summary: "Memory usage above 90%"
```

## Testing

### Manual Testing

```bash
# Test metrics endpoint
curl http://localhost:4000/api/telemetry/metrics

# Test health endpoint
curl http://localhost:4000/api/telemetry/health | jq

# Test readiness
curl http://localhost:4000/api/telemetry/health/ready | jq

# Test liveness
curl http://localhost:4000/api/telemetry/health/live | jq

# Check response times
time curl -s http://localhost:4000/api/telemetry/health > /dev/null
```

### Automated Testing

```typescript
import request from 'supertest';
import app from './app';

describe('Telemetry Routes', () => {
  it('should return metrics in Prometheus format', async () => {
    const response = await request(app)
      .get('/api/telemetry/metrics')
      .expect(200)
      .expect('Content-Type', /text\/plain/);
    
    expect(response.text).toContain('http_requests_total');
  });

  it('should return health status', async () => {
    const response = await request(app)
      .get('/api/telemetry/health')
      .expect(200)
      .expect('Content-Type', /application\/json/);
    
    expect(response.body).toHaveProperty('status', 'healthy');
    expect(response.body).toHaveProperty('uptime');
  });

  it('should return readiness status', async () => {
    const response = await request(app)
      .get('/api/telemetry/health/ready')
      .expect(200);
    
    expect(response.body.status).toBe('ready');
  });

  it('should return liveness status', async () => {
    const response = await request(app)
      .get('/api/telemetry/health/live')
      .expect(200);
    
    expect(response.body.status).toBe('alive');
  });
});
```

## Troubleshooting

### Metrics Not Appearing

**Problem**: `/api/telemetry/metrics` returns empty or error

**Solutions**:
1. Check if middleware is initialized:
   ```bash
   # Look for log message
   grep "Enhanced Prometheus metrics middleware initialized" logs/app.log
   ```

2. Verify metrics are being collected:
   ```typescript
   // Add debug logging
   logger.debug('Metrics endpoint hit', { metricsCount: Object.keys(register).length });
   ```

3. Check if Prometheus exporter is running:
   ```bash
   curl http://localhost:9464/metrics
   ```

### Health Check Returning 503

**Problem**: `/api/telemetry/health` or `/health/ready` returns 503

**Solutions**:
1. Check application logs for errors
2. Verify all required services are connected
3. Increase `initialDelaySeconds` in Kubernetes probes
4. Add custom readiness checks for critical dependencies

### High Response Times

**Problem**: Health endpoints are slow to respond

**Solutions**:
1. Reduce metrics collection frequency
2. Optimize health check logic
3. Cache health status (with TTL)
4. Use separate Express instance for health checks

## Summary

The telemetry routes provide:
- ✅ `/api/telemetry/metrics` - Prometheus metrics
- ✅ `/api/telemetry/health` - Comprehensive health check
- ✅ `/api/telemetry/health/ready` - Readiness probe
- ✅ `/api/telemetry/health/live` - Liveness probe

All endpoints are production-ready and Kubernetes-compatible!






