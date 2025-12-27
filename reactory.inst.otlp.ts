import { NodeSDK } from '@opentelemetry/sdk-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-proto';
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-proto';
import { PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics';
import { PrometheusExporter } from '@opentelemetry/exporter-prometheus';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { Resource } from '@opentelemetry/resources';
import { 
  ATTR_SERVICE_NAME, 
  ATTR_SERVICE_VERSION } from '@opentelemetry/semantic-conventions';
import logger from '@reactory/server-core/logging';

const {
  REACTORY_SERVICE_NAME = 'reactory-server',
  REACTORY_SERVICE_VERSION = '1.0.0',
  REACTORY_DEPLOYMENT_ENVIRONMENT = 'development',
  REACTORY_JAEGER_TRACE_EXPORTER_URL = 'http://localhost:4318/v1/traces',
  REACTORY_JAEGER_METRIC_READER_URL = 'http://localhost:4318/v1/metrics',
  REACTORY_PROMETHEUS_EXPORTER_PORT = '9464',
  REACTORY_PROMETHEUS_EXPORTER_HOST = '0.0.0.0',
  REACTORY_TELEMETRY_ENABLED = 'true',
} = process.env;

const start = () => {
  if (REACTORY_TELEMETRY_ENABLED !== 'true') {
    logger.info('Telemetry is disabled via REACTORY_TELEMETRY_ENABLED');
    return;
  }

  logger.info('Starting Reactory telemetry consumer', {
    service: REACTORY_SERVICE_NAME,
    version: REACTORY_SERVICE_VERSION,
    environment: REACTORY_DEPLOYMENT_ENVIRONMENT,
    jaegerTraces: REACTORY_JAEGER_TRACE_EXPORTER_URL,
    jaegerMetrics: REACTORY_JAEGER_METRIC_READER_URL,
    prometheusPort: REACTORY_PROMETHEUS_EXPORTER_PORT,
    prometheusHost: REACTORY_PROMETHEUS_EXPORTER_HOST,
  });

  // Create resource with service information
  const resource = new Resource({
    [ATTR_SERVICE_NAME]: REACTORY_SERVICE_NAME,
    [ATTR_SERVICE_VERSION]: REACTORY_SERVICE_VERSION,
    'deployment.environment': REACTORY_DEPLOYMENT_ENVIRONMENT,
  });

  // Create Prometheus exporter that exposes /metrics endpoint
  const prometheusExporter = new PrometheusExporter({
    port: parseInt(REACTORY_PROMETHEUS_EXPORTER_PORT),
    host: REACTORY_PROMETHEUS_EXPORTER_HOST,
    preventServerStart: false,
  });

  // Create OTLP metric exporter for Jaeger
  const otlpMetricExporter = new OTLPMetricExporter({
    url: REACTORY_JAEGER_METRIC_READER_URL,
  });

  // Create metric reader with both exporters
  const metricReader = new PeriodicExportingMetricReader({
    exporter: otlpMetricExporter,
    exportIntervalMillis: 10000,
  });

  // Configure auto-instrumentations
  const instrumentations = getNodeAutoInstrumentations({
    // Enable/disable specific instrumentations
    '@opentelemetry/instrumentation-http': {
      enabled: true,
      ignoreIncomingRequestHook: (request) => {
        const url = (request as any).url || '';
        return url.includes('/health') || 
               url.includes('/metrics') || 
               url.includes('/favicon.ico');
      },
      requestHook: (span, request) => {
        span.setAttribute('http.route', (request as any).route?.path || 'unknown');
      },
    },
    '@opentelemetry/instrumentation-express': {
      enabled: true,
    },
    '@opentelemetry/instrumentation-mongodb': {
      enabled: true,
      enhancedDatabaseReporting: true,
    },
    '@opentelemetry/instrumentation-graphql': {
      enabled: true,
      allowValues: false, // Don't capture query variables for privacy
      depth: -1, // Capture all depths
      mergeItems: true,
    },
    '@opentelemetry/instrumentation-ioredis': {
      enabled: true,
    },
    '@opentelemetry/instrumentation-dns': {
      enabled: true,
    },
    '@opentelemetry/instrumentation-fs': {
      enabled: false, // Usually too noisy
    },
    '@opentelemetry/instrumentation-net': {
      enabled: true,
    },
  });

  // Create and configure NodeSDK
  const consumer = new NodeSDK({
    resource,
    serviceName: REACTORY_SERVICE_NAME,
    traceExporter: new OTLPTraceExporter({
      url: REACTORY_JAEGER_TRACE_EXPORTER_URL,
    }),
    metricReader,
    instrumentations: [instrumentations],
  });

  // Start Prometheus exporter (creates HTTP server on specified port)
  prometheusExporter.startServer()
    .then(() => {
      logger.info(`Prometheus metrics endpoint started`, {
        url: `http://${REACTORY_PROMETHEUS_EXPORTER_HOST}:${REACTORY_PROMETHEUS_EXPORTER_PORT}/metrics`,
      });
    })
    .catch((error) => {
      logger.error('Failed to start Prometheus exporter', { error });
    });

  // Start the SDK (synchronous)
  try {
    consumer.start();
    
    logger.info('Reactory telemetry consumer started successfully', {
      instrumentations: [
        'http',
        'express',
        'mongodb',
        'graphql',
        'ioredis',
        'dns',
        'net',
      ],
    });

    // Handle graceful shutdown
    process.on('SIGTERM', async () => {
      logger.info('SIGTERM received, shutting down telemetry...');
      await consumer.shutdown();
      logger.info('Telemetry shutdown complete');
      process.exit(0);
    });

    process.on('SIGINT', async () => {
      logger.info('SIGINT received, shutting down telemetry...');
      await consumer.shutdown();
      logger.info('Telemetry shutdown complete');
      process.exit(0);
    });
  } catch (error) {
    logger.error('Error starting telemetry consumer', { error });
  }
};

start();

