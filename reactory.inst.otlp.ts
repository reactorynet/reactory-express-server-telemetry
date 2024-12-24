import { NodeSDK } from '@opentelemetry/sdk-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-proto';
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-proto';
import { PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics';

const consumer = new NodeSDK({
  serviceName: process.env.REACTORY_SERVICE_NAME || 'reactory-server',
  traceExporter: new OTLPTraceExporter({
    url: `${process.env.REACTORY_JAEGER_TRACE_EXPORTER_URL}` || 'http://127.0.0.1:4318/v1/traces',
  }),
  metricReader: new PeriodicExportingMetricReader({
    exporter: new OTLPMetricExporter({
      url: `${process.env.REACTORY_JAEGER_METRIC_READER_URL}` || 'http://127.0.0.1:4318/v1/metrics',
    }),
  }),
});

consumer.start();
