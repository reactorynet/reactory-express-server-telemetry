import { MeterProvider } from '@opentelemetry/sdk-metrics';
import exporter from './exporter';

const meterProvider = new MeterProvider({
  readers: [exporter],
});

const meter = meterProvider.getMeter('reactory-express-server');

// Export the meter and register for metrics endpoint
export const register = {
  contentType: 'text/plain; version=0.0.4',
  metrics: async () => {
    return exporter.getMetricsRequestHandler(null as any, null as any);
  },
};

export default meter;
