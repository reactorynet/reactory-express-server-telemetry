import { GraphQLRequestContext, GraphQLRequestContextWillSendResponse } from "@apollo/server";
import meter from '../prometheus/meter';
import { ValueType } from "@opentelemetry/api";
// Initialize OpenTelemetry metric


const graphqlRequestDuration = meter.createHistogram('graphql_request_duration_ms',{  
  description: 'Duration of GraphQL requests',
  unit: 'ms',
  valueType: ValueType.INT
});

const graphqlRequestCount = meter.createCounter('graphql_request_count',{
  description: 'Total number of GraphQL requests',
  valueType: ValueType.INT
});

const ReactoryGraphQLTelemetryPlugin: Reactory.Graph.TReactoryGraphPlugin = {
  requestDidStart: async (requestContext: GraphQLRequestContext<Reactory.Server.IReactoryContext>) => {
    const labels = {
      service: process.env.SERVER_ID || 'reactory-local',
      operationName: requestContext?.request?.operationName,
    };
    const startTime = Date.now();
    graphqlRequestCount.add(1, labels);

    return {
      willSendResponse: async (_: GraphQLRequestContextWillSendResponse<Reactory.Server.IReactoryContext>) => {
        const duration = (Date.now() - startTime);
        graphqlRequestDuration.record(duration, labels);
        requestContext.contextValue.info("GraphQL request completed in " + duration + " seconds");
      },
    };
  },
};

const ReactoryGraphQLTelemetryComponent: Reactory.Graph.IGraphPlugin = {
  nameSpace: 'reactory',
  name: 'ReactoryGraphQLTelemetryPlugin',
  version: '1.0.0',
  ordinal: 99,
  component: ReactoryGraphQLTelemetryPlugin,
};

export default ReactoryGraphQLTelemetryComponent;
