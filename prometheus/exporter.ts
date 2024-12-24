import { ExporterConfig, PrometheusExporter } from '@opentelemetry/exporter-prometheus';

const exporterOptions: ExporterConfig = { 
  port: parseInt(process.env.REACTORY_PROMETHEUS_EXPORTER_PORT || '9464'),
};
const exporter = new PrometheusExporter(exporterOptions);

export default exporter;