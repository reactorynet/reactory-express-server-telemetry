import ReactoryGraphqlTelemetetryPlugin from './ReactoryGraphQLTelemeteryPlugin';

const ReactoryTelemetryGraphDefinition: Reactory.Graph.IGraphDefinitions = { 
  Types: [],
  Resolvers: {},
  Plugins: [
    ReactoryGraphqlTelemetetryPlugin
  ],
};

export default ReactoryTelemetryGraphDefinition;