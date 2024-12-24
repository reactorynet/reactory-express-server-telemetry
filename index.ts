import middleware from "./middleware";
import graph from "./graphql";
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
  routes: {},
  services: [],
  translations: [],
  workflows: [],
  middleware,
};

export default ReactoryTelemetryModule;