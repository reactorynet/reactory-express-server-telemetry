import { NodeSDK } from '@opentelemetry/sdk-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-proto';
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-proto';
import { PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics';
import { PrometheusExporter } from '@opentelemetry/exporter-prometheus';
import logger from '@reactory/server-core/logging';

const {
  REACTORY_SERVICE_NAME = 'reactory-server',
  REACTORY_JAEGER_TRACE_EXPORTER_URL = 'http://localhost:4318/v1/traces',
  REACTORY_JAEGER_METRIC_READER_URL = 'http://localhost:4318/v1/metrics',
  REACTORY_PROMETHEUS_EXPORTER_PORT = '9464',
  REACTORY_PROMETHEUS_EXPORTER_HOST = '0.0.0.0',
} = process.env;

const start = () => {
  logger.info('Starting Reactory telemetry consumer', { 
    REACTORY_SERVICE_NAME,
    REACTORY_JAEGER_TRACE_EXPORTER_URL,
    REACTORY_JAEGER_METRIC_READER_URL,
    REACTORY_PROMETHEUS_EXPORTER_PORT,
    REACTORY_PROMETHEUS_EXPORTER_HOST,
  });

  // Create Prometheus exporter that exposes /metrics endpoint
  const prometheusExporter = new PrometheusExporter({
    port: parseInt(REACTORY_PROMETHEUS_EXPORTER_PORT),
    host: REACTORY_PROMETHEUS_EXPORTER_HOST,
    preventServerStart: false,
  });

  const consumer = new NodeSDK({
    serviceName: REACTORY_SERVICE_NAME,
    traceExporter: new OTLPTraceExporter({
      url: REACTORY_JAEGER_TRACE_EXPORTER_URL,
    }),
    metricReader: new PeriodicExportingMetricReader({
      exporter: new OTLPMetricExporter({
        url: REACTORY_JAEGER_METRIC_READER_URL,
      }),
      exportIntervalMillis: 10000,
    }),
  });

  // Start Prometheus exporter (creates HTTP server on specified port)
  prometheusExporter.startServer();
  logger.info(`Prometheus metrics endpoint started on http://${REACTORY_PROMETHEUS_EXPORTER_HOST}:${REACTORY_PROMETHEUS_EXPORTER_PORT}/metrics`);

  consumer.start();

  logger.info('Reactory telemetry consumer started');
}

start();