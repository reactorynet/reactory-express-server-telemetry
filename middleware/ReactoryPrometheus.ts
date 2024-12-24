import Express from 'express'
import meter from '../prometheus/meter';
import logger from '@reactory/server-core/logging';

const ReactoryPrometheus = (app: Express.Application) => {  
  const httpRequestCounter = meter.createCounter('http_requests_total', {
    description: 'Total number of HTTP requests',
  });
  
  app.use((req, _, next) => {    
    httpRequestCounter.add(1, { method: req.method, path: req.path });
    next();
  });
  logger.info("Prometheus metrics exporter initialized");
};

const ReactoryPrometheusMiddlewareDefinition: Reactory.Server.ReactoryMiddlewareDefinition = {
  name: 'ReactoryPrometheus',
  nameSpace: 'Reactory',
  version: '1.0.0',
  ordinal: 99,
  type: 'configuration',
  async: false,
  component: ReactoryPrometheus,
};

export default ReactoryPrometheusMiddlewareDefinition;
