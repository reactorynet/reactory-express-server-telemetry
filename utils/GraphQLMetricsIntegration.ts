import { createHistogram, createCounter } from './StatisticHelpers';
import type { Reactory } from '@reactory/server-core/types/reactory';

/**
 * Integration example showing how to use OTEL statistics with GraphQL operations
 * This demonstrates how to collect and export metrics that are compatible with
 * your existing Prometheus/Jaeger setup
 */

/**
 * Track GraphQL operation metrics
 */
export class GraphQLMetricsCollector {
  private operationDurations: Map<string, number[]> = new Map();
  private operationCounts: Map<string, number> = new Map();
  private errorCounts: Map<string, number> = new Map();

  /**
   * Record a GraphQL operation duration
   */
  recordOperation(
    operationName: string,
    duration: number,
    operationType: 'query' | 'mutation' | 'subscription',
    status: 'success' | 'error',
    errorType?: string
  ): void {
    const key = `${operationName}:${operationType}`;
    
    // Track durations for histogram
    if (!this.operationDurations.has(key)) {
      this.operationDurations.set(key, []);
    }
    this.operationDurations.get(key)!.push(duration);

    // Track total count
    const countKey = `${key}:${status}`;
    this.operationCounts.set(countKey, (this.operationCounts.get(countKey) || 0) + 1);

    // Track errors
    if (status === 'error' && errorType) {
      const errorKey = `${key}:${errorType}`;
      this.errorCounts.set(errorKey, (this.errorCounts.get(errorKey) || 0) + 1);
    }
  }

  /**
   * Generate histogram metrics for operation durations
   */
  getOperationDurationHistograms(): Reactory.Models.IStatistic[] {
    const histograms: Reactory.Models.IStatistic[] = [];

    this.operationDurations.forEach((durations, key) => {
      const [operationName, operationType] = key.split(':');
      
      histograms.push(
        createHistogram(
          'graphql_operation_duration_ms',
          durations,
          {
            service_name: 'reactory-server',
            graphql_operation_name: operationName,
            graphql_operation_type: operationType,
          },
          {
            description: 'GraphQL operation duration in milliseconds',
            unit: 'ms',
            buckets: [0, 5, 10, 25, 50, 75, 100, 250, 500, 750, 1000, 2500, 5000],
          }
        )
      );
    });

    return histograms;
  }

  /**
   * Generate counter metrics for operation counts
   */
  getOperationCounters(): Reactory.Models.IStatistic[] {
    const counters: Reactory.Models.IStatistic[] = [];

    this.operationCounts.forEach((count, key) => {
      const [operationName, operationType, status] = key.split(':');
      
      counters.push(
        createCounter(
          'graphql_operations_total',
          count,
          {
            service_name: 'reactory-server',
            graphql_operation_name: operationName,
            graphql_operation_type: operationType,
            status,
          },
          {
            description: 'Total number of GraphQL operations',
            unit: '1',
          }
        )
      );
    });

    return counters;
  }

  /**
   * Generate counter metrics for errors
   */
  getErrorCounters(): Reactory.Models.IStatistic[] {
    const counters: Reactory.Models.IStatistic[] = [];

    this.errorCounts.forEach((count, key) => {
      const [operationName, operationType, errorType] = key.split(':');
      
      counters.push(
        createCounter(
          'graphql_errors_total',
          count,
          {
            service_name: 'reactory-server',
            graphql_operation_name: operationName,
            graphql_operation_type: operationType,
            error_type: errorType,
          },
          {
            description: 'Total number of GraphQL errors',
            unit: '1',
          }
        )
      );
    });

    return counters;
  }

  /**
   * Get all collected metrics
   */
  getAllMetrics(): Reactory.Models.IStatistic[] {
    return [
      ...this.getOperationDurationHistograms(),
      ...this.getOperationCounters(),
      ...this.getErrorCounters(),
    ];
  }

  /**
   * Reset all collected metrics
   */
  reset(): void {
    this.operationDurations.clear();
    this.operationCounts.clear();
    this.errorCounts.clear();
  }
}

/**
 * Global metrics collector instance
 */
export const graphqlMetrics = new GraphQLMetricsCollector();

/**
 * Middleware function to track GraphQL operations
 */
export const trackGraphQLOperation = (
  operationName: string,
  operationType: 'query' | 'mutation' | 'subscription',
  startTime: number,
  error?: Error
): void => {
  const duration = Date.now() - startTime;
  const status = error ? 'error' : 'success';
  const errorType = error ? error.constructor.name : undefined;

  graphqlMetrics.recordOperation(
    operationName,
    duration,
    operationType,
    status,
    errorType
  );
};

/**
 * Example usage in a GraphQL resolver
 */
export const exampleResolverWithMetrics = async (
  parent: unknown,
  args: unknown,
  context: Reactory.Server.IReactoryContext
): Promise<unknown> => {
  const startTime = Date.now();
  const operationName = 'getUser';
  const operationType = 'query';

  try {
    // Your resolver logic here
    const result = await someAsyncOperation();
    
    // Track successful operation
    trackGraphQLOperation(operationName, operationType, startTime);
    
    return result;
  } catch (error) {
    // Track failed operation
    trackGraphQLOperation(operationName, operationType, startTime, error as Error);
    
    throw error;
  }
};

/**
 * Helper to get current metrics snapshot
 */
export const getMetricsSnapshot = (): {
  metrics: Reactory.Models.IStatistic[];
  timestamp: Date;
} => ({
  metrics: graphqlMetrics.getAllMetrics(),
  timestamp: new Date(),
});

// Mock async operation for example
async function someAsyncOperation(): Promise<unknown> {
  return Promise.resolve({ id: '123', name: 'Test User' });
}

export default {
  GraphQLMetricsCollector,
  graphqlMetrics,
  trackGraphQLOperation,
  exampleResolverWithMetrics,
  getMetricsSnapshot,
};
