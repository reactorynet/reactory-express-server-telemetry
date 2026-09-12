import healthRouter from './health';
import registerStreamRoutes from './stream';

// SSE live-tail attach endpoint shares the /telemetry router
registerStreamRoutes(healthRouter);

export default {
  '/telemetry': healthRouter,
};
