import ReactoryGraphqlTelemetetryPlugin from './ReactoryGraphQLTelemeteryPlugin';
import TelemetrySchemas from './schema';
import TelemetryQueryResolvers from './resolvers';

const ReactoryTelemetryGraphDefinition: Reactory.Graph.IGraphDefinitions = {
  Types: [...TelemetrySchemas],
  Resolvers: TelemetryQueryResolvers,
  Plugins: [
    ReactoryGraphqlTelemetetryPlugin
  ],
};

export default ReactoryTelemetryGraphDefinition;