import { ExporterConfig, PrometheusExporter } from '@opentelemetry/exporter-prometheus';

const exporterOptions: ExporterConfig = {
  prefix: process.env.REACTORY_PROMETHEUS_EXPORTER_PREFIX || '',
  host: process.env.REACTORY_PROMETHEUS_EXPORTER_HOST || undefined,
  port: parseInt(process.env.REACTORY_PROMETHEUS_EXPORTER_PORT || '9464'),
};
const exporter = new PrometheusExporter(exporterOptions);

export default exporter;