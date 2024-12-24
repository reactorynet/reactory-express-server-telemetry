import { MeterProvider } from '@opentelemetry/sdk-metrics';
import exporter from './exporter';

const meterProvider = new MeterProvider({
  readers: [exporter],
});

export default meterProvider.getMeter('reactory-express-server');
