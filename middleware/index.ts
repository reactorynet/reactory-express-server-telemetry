import ReactoryPrometheus from './ReactoryPrometheus';

const ReactoryTelemetryMiddleware: Reactory.Server.ReactoryMiddlewareDefinition[] = [
  ReactoryPrometheus,
];

export default ReactoryTelemetryMiddleware;