import { NodeSDK } from '@opentelemetry/sdk-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-proto';
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-proto';
import { PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics';
import logger from '@reactory/server-core/logging';

const {
  REACTORY_SERVICE_NAME = 'reactory-server',
  REACTORY_JAEGER_TRACE_EXPORTER_URL = 'http://localhost:4318/v1/traces',
  REACTORY_JAEGER_METRIC_READER_URL = 'http://localhost:4318/v1/metrics',
} = process.env;

const start = () => {
  logger.info('Starting Reactory telemetry consumer', { 
    REACTORY_SERVICE_NAME,
    REACTORY_JAEGER_TRACE_EXPORTER_URL,
    REACTORY_JAEGER_METRIC_READER_URL,
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
    }),
  });

  consumer.start();

  logger.info('Reactory telemetry consumer started');
}

start();