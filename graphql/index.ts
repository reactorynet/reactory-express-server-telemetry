import ReactoryGraphqlTelemetetryPlugin from './ReactoryGraphQLTelemeteryPlugin';
import TelemetryQueriesSchema from './schema';
import TelemetryQueryResolvers from './resolvers';

const ReactoryTelemetryGraphDefinition: Reactory.Graph.IGraphDefinitions = { 
  Types: [TelemetryQueriesSchema],
  Resolvers: TelemetryQueryResolvers,
  Plugins: [
    ReactoryGraphqlTelemetetryPlugin
  ],
};

export default ReactoryTelemetryGraphDefinition;