import Express from 'express';
import meter from '../prometheus/meter';
import logger from '@reactory/server-core/logging';
import { Attributes } from '@opentelemetry/api';

/**
 * Enhanced Prometheus middleware with comprehensive Node.js and Express metrics
 */
const ReactoryPrometheus = (app: Express.Application) => {
  // ==================== HTTP Metrics ====================
  
  // Counter: Total HTTP requests
  const httpRequestCounter = meter.createCounter('http_requests_total', {
    description: 'Total number of HTTP requests',
  });

  // Counter: HTTP requests by status code
  const httpRequestsByStatus = meter.createCounter('http_requests_by_status_total', {
    description: 'Total number of HTTP requests grouped by status code',
  });

  // Histogram: HTTP request duration
  const httpRequestDuration = meter.createHistogram('http_request_duration_seconds', {
    description: 'HTTP request duration in seconds',
    unit: 'seconds',
  });

  // Histogram: HTTP request size
  const httpRequestSize = meter.createHistogram('http_request_size_bytes', {
    description: 'HTTP request size in bytes',
    unit: 'bytes',
  });

  // Histogram: HTTP response size
  const httpResponseSize = meter.createHistogram('http_response_size_bytes', {
    description: 'HTTP response size in bytes',
    unit: 'bytes',
  });

  // UpDownCounter: Active HTTP requests
  const activeRequests = meter.createUpDownCounter('http_requests_active', {
    description: 'Number of active HTTP requests',
  });

  // ==================== Node.js Process Metrics ====================
  
  // Gauge: Process CPU usage
  const processCpuUsage = meter.createObservableGauge('process_cpu_usage_percent', {
    description: 'Process CPU usage percentage',
  });

  // Gauge: Process memory (multiple metrics)
  const processMemoryHeapUsed = meter.createObservableGauge('process_memory_heap_used_bytes', {
    description: 'Process heap memory used in bytes',
  });

  const processMemoryHeapTotal = meter.createObservableGauge('process_memory_heap_total_bytes', {
    description: 'Process heap memory total in bytes',
  });

  const processMemoryRss = meter.createObservableGauge('process_memory_rss_bytes', {
    description: 'Process resident set size in bytes',
  });

  const processMemoryExternal = meter.createObservableGauge('process_memory_external_bytes', {
    description: 'Process external memory in bytes',
  });

  // Gauge: Event loop lag
  const eventLoopLag = meter.createObservableGauge('nodejs_eventloop_lag_seconds', {
    description: 'Event loop lag in seconds',
  });

  // Gauge: Active handles
  const activeHandles = meter.createObservableGauge('nodejs_active_handles_total', {
    description: 'Number of active handles',
  });

  // Gauge: Active requests to libuv
  const activeRequestsUv = meter.createObservableGauge('nodejs_active_requests_total', {
    description: 'Number of active requests to libuv',
  });

  // ==================== Metric Collection ====================

  // Track event loop lag
  let lastLoopTime = Date.now();
  const lagCheckInterval = 100; // Check every 100ms
  
  setInterval(() => {
    const now = Date.now();
    const lag = Math.max(0, now - lastLoopTime - lagCheckInterval);
    lastLoopTime = now;
    
    eventLoopLag.addCallback((observableResult) => {
      observableResult.observe(lag / 1000); // Convert to seconds
    });
  }, lagCheckInterval);

  // Collect process metrics periodically
  const collectProcessMetrics = () => {
    const memUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();
    
    // Memory metrics
    processMemoryHeapUsed.addCallback((observableResult) => {
      observableResult.observe(memUsage.heapUsed);
    });

    processMemoryHeapTotal.addCallback((observableResult) => {
      observableResult.observe(memUsage.heapTotal);
    });

    processMemoryRss.addCallback((observableResult) => {
      observableResult.observe(memUsage.rss);
    });

    processMemoryExternal.addCallback((observableResult) => {
      observableResult.observe(memUsage.external);
    });

    // CPU usage (convert to percentage)
    const cpuPercent = (cpuUsage.user + cpuUsage.system) / 1000000 / process.uptime() * 100;
    processCpuUsage.addCallback((observableResult) => {
      observableResult.observe(cpuPercent);
    });

    // Active handles and requests
    if (process._getActiveHandles) {
      activeHandles.addCallback((observableResult) => {
        observableResult.observe(process._getActiveHandles().length);
      });
    }

    if (process._getActiveRequests) {
      activeRequestsUv.addCallback((observableResult) => {
        observableResult.observe(process._getActiveRequests().length);
      });
    }
  };

  // Collect process metrics every 10 seconds
  setInterval(collectProcessMetrics, 10000);
  collectProcessMetrics(); // Initial collection

  // ==================== HTTP Middleware ====================

  app.use((req, res, next) => {
    const startTime = Date.now();
    
    // Track active requests
    activeRequests.add(1);

    // Track request size
    const requestSize = parseInt(req.headers['content-length'] || '0', 10);
    if (requestSize > 0) {
      httpRequestSize.record(requestSize, {
        method: req.method,
        route: req.route?.path || req.path,
      });
    }

    // Build attributes for metrics
    const getAttributes = (statusCode?: number): Attributes => ({
      method: req.method,
      route: req.route?.path || req.path,
      status_code: statusCode ? statusCode.toString() : 'unknown',
      status_class: statusCode ? `${Math.floor(statusCode / 100)}xx` : 'unknown',
    });

    // Override res.end to capture response metrics
    const originalEnd = res.end.bind(res);
    res.end = function(chunk?: any, encoding?: any, callback?: any) {
      // Calculate duration
      const duration = (Date.now() - startTime) / 1000;
      const attributes = getAttributes(res.statusCode);

      // Record metrics
      httpRequestCounter.add(1, attributes);
      httpRequestsByStatus.add(1, {
        status_code: res.statusCode.toString(),
        status_class: `${Math.floor(res.statusCode / 100)}xx`,
      });
      httpRequestDuration.record(duration, attributes);

      // Track response size
      const responseSize = parseInt(res.getHeader('content-length') as string || '0', 10);
      if (responseSize > 0) {
        httpResponseSize.record(responseSize, attributes);
      }

      // Decrement active requests
      activeRequests.add(-1);

      // Call original end
      return originalEnd(chunk, encoding, callback);
    };

    next();
  });

  logger.info('Enhanced Prometheus metrics middleware initialized', {
    metrics: {
      http: ['requests_total', 'requests_by_status', 'request_duration', 'request_size', 'response_size', 'active_requests'],
      process: ['cpu_usage', 'memory_heap', 'memory_rss', 'memory_external'],
      nodejs: ['eventloop_lag', 'active_handles', 'active_requests'],
    },
  });
};

const ReactoryPrometheusMiddlewareDefinition: Reactory.Server.ReactoryMiddlewareDefinition = {
  name: 'ReactoryPrometheus',
  nameSpace: 'Reactory',
  version: '2.0.0',
  ordinal: 99,
  type: 'configuration',
  async: false,
  component: ReactoryPrometheus,
};

export default ReactoryPrometheusMiddlewareDefinition;

