import middleware from "./middleware";
import graph from "./graphql";
import routes from "./routes";
import TelemetryQueryService from "./services/TelemetryQueryService";

// Export telemetry class and types
export { 
  ReactoryTelemetry,
  type MetricAttributes,
  type MetricOptions,
  type ICounter,
  type IHistogram,
  type IUpDownCounter,
  type IGauge,
  type IReactoryTelemetry
} from "./ReactoryTelemetry";

const ReactoryTelemetryModule: Reactory.Server.IReactoryModule = {
  name: "ReactoryTelemetry",
  version: "1.0.0",
  nameSpace: "reactory",
  priority: 1,
  cli: [],
  clientPlugins: [],
  dependencies: [],
  description: "A module that provides telemetry services for Reactory",
  forms: [],
  graphDefinitions: graph,
  grpc: null,
  id: "reactory.ReactoryTelemetry@1.0.0",
  models: [],
  passportProviders: [],
  pdfs: [],
  routes,
  services: [
    {
      id: 'reactory.TelemetryQueryService@1.0.0',
      name: 'TelemetryQueryService',
      nameSpace: 'reactory',
      version: '1.0.0',
      description: 'Service for querying telemetry data from various sources',
      service: (props, context) => { return new TelemetryQueryService(props, context); },
      serviceType: 'data'
    }
  ],
  translations: [],
  workflows: [],
  middleware,
};

export default ReactoryTelemetryModule;