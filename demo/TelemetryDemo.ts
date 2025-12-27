/**
 * ReactoryTelemetry Demo
 * 
 * This file demonstrates how to use the ReactoryTelemetry wrapper
 * in various scenarios within the Reactory framework.
 */

import Reactory from '@reactory/reactory-core';
import { service } from '@reactory/server-core/application/decorators';

/**
 * Demo Service showing telemetry usage patterns
 */
@service({
  name: "TelemetryDemoService",
  nameSpace: "demo",
  version: "1.0.0",
  description: "Demonstrates telemetry usage in Reactory services",
  id: "demo.TelemetryDemoService@1.0.0",
  serviceType: "utility",
  dependencies: []
})
class TelemetryDemoService implements Reactory.Service.IReactoryService {
  name: string = 'TelemetryDemoService';
  nameSpace: string = 'demo';
  version: string = '1.0.0';
  context: Reactory.Server.IReactoryContext;
  props: any;

  // Pre-created metrics for reuse
  private requestCounter: any;
  private errorCounter: any;
  private processingDuration: any;
  private activeJobs: any;
  private queueSize: any;

  constructor(props: any, context: Reactory.Server.IReactoryContext) {
    this.props = props;
    this.context = context;
    
    // Initialize commonly used metrics
    this.initializeMetrics();
  }

  /**
   * Initialize metrics once during service construction
   * This avoids recreating metrics on every method call
   */
  private initializeMetrics(): void {
    const { telemetry } = this.context;

    // Counter: Track total requests
    this.requestCounter = telemetry.createCounter('demo_requests_total', {
      description: 'Total number of demo service requests',
      persist: true, // Save to database
      ttl: 86400, // Keep for 24 hours
    });

    // Counter: Track errors
    this.errorCounter = telemetry.createCounter('demo_errors_total', {
      description: 'Total number of errors in demo service',
      persist: true,
    });

    // Histogram: Track processing duration
    this.processingDuration = telemetry.createHistogram('demo_processing_duration_seconds', {
      description: 'Time taken to process demo requests',
      unit: 'seconds',
    });

    // UpDownCounter: Track active jobs
    this.activeJobs = telemetry.createUpDownCounter('demo_active_jobs', {
      description: 'Number of currently active jobs',
    });

    // Gauge: Track queue size
    this.queueSize = telemetry.createGauge('demo_queue_size', {
      description: 'Current size of the processing queue',
    });
  }

  /**
   * Example 1: Simple counter usage
   */
  async simpleCounterExample(data: any): Promise<void> {
    // Increment counter with attributes
    this.requestCounter.add(1, {
      method: 'simpleCounterExample',
      data_type: typeof data,
    });
  }

  /**
   * Example 2: Timing an operation with histogram
   */
  async timedOperationExample(items: any[]): Promise<any[]> {
    // Use the built-in timing helper
    return await this.context.telemetry.measureAsync(
      'demo_batch_operation_duration',
      async () => {
        // Simulate work
        const results = [];
        for (const item of items) {
          results.push(await this.processItem(item));
        }
        return results;
      },
      {
        batch_size: items.length.toString(),
        operation: 'batch_process',
      },
      {
        description: 'Duration of batch processing operation',
        unit: 'seconds',
      }
    );
  }

  /**
   * Example 3: Tracking job lifecycle with UpDownCounter
   */
  async jobLifecycleExample(jobId: string): Promise<void> {
    // Job started
    this.activeJobs.add(1, { job_id: jobId.substring(0, 8) });

    try {
      // Simulate job work
      await this.simulateWork(1000);

      // Track success
      this.requestCounter.add(1, {
        method: 'jobLifecycleExample',
        status: 'success',
      });
    } catch (error) {
      // Track error
      this.errorCounter.add(1, {
        method: 'jobLifecycleExample',
        error_type: error instanceof Error ? error.constructor.name : 'Unknown',
      });
      throw error;
    } finally {
      // Job completed (decrement)
      this.activeJobs.add(-1, { job_id: jobId.substring(0, 8) });
    }
  }

  /**
   * Example 4: Using Gauge to track queue state
   */
  async queueManagementExample(queue: any[]): Promise<void> {
    // Update queue size gauge
    this.queueSize.set(queue.length, {
      queue_type: 'processing',
    });

    // Process items from queue
    while (queue.length > 0) {
      const item = queue.shift();
      await this.processItem(item);
      
      // Update gauge as queue shrinks
      this.queueSize.set(queue.length, {
        queue_type: 'processing',
      });
    }
  }

  /**
   * Example 5: Manual timing with startTimer
   */
  async manualTimingExample(): Promise<void> {
    // Start timer
    const endTimer = this.context.telemetry.startTimer(
      'demo_manual_timing_seconds',
      {
        operation: 'complex_calculation',
      },
      {
        description: 'Manually timed operation',
        unit: 'seconds',
      }
    );

    try {
      // Do work
      await this.complexCalculation();
    } finally {
      // Always stop the timer
      endTimer();
    }
  }

  /**
   * Example 6: Comprehensive service method with multiple metrics
   */
  async comprehensiveExample(
    userId: string,
    data: any[]
  ): Promise<{ processed: number; errors: number }> {
    // Track request
    this.requestCounter.add(1, {
      method: 'comprehensiveExample',
      user_type: userId ? 'authenticated' : 'anonymous',
    });

    // Track batch size
    const batchSizeHistogram = this.context.telemetry.createHistogram('demo_batch_size', {
      description: 'Size of processing batches',
      unit: 'items',
    });
    batchSizeHistogram.record(data.length);

    // Start timing
    const endTimer = this.context.telemetry.startTimer(
      'demo_comprehensive_duration_seconds',
      { method: 'comprehensiveExample' }
    );

    // Track active processing
    this.activeJobs.add(1, { type: 'comprehensive' });

    let processed = 0;
    let errors = 0;

    try {
      for (const item of data) {
        try {
          await this.processItem(item);
          processed++;
        } catch (error) {
          errors++;
          this.errorCounter.add(1, {
            method: 'comprehensiveExample',
            error_type: error instanceof Error ? error.constructor.name : 'Unknown',
          });
        }
      }

      // Track completion metrics
      const successRate = processed / data.length;
      const successRateGauge = this.context.telemetry.createGauge('demo_success_rate', {
        description: 'Success rate of processing (0-1)',
      });
      successRateGauge.set(successRate, {
        method: 'comprehensiveExample',
      });

      return { processed, errors };
    } finally {
      // Clean up
      endTimer();
      this.activeJobs.add(-1, { type: 'comprehensive' });
    }
  }

  /**
   * Example 7: Integration with GraphQL resolver
   */
  async graphqlResolverExample(
    parent: any,
    args: any,
    context: Reactory.Server.IReactoryContext
  ): Promise<any> {
    const { telemetry } = context;

    // Track GraphQL query
    const queryCounter = telemetry.createCounter('demo_graphql_queries_total', {
      description: 'Total GraphQL queries executed',
    });

    queryCounter.add(1, {
      query: 'demoQuery',
      authenticated: context.user ? 'true' : 'false',
      partner: context.partner?.key || 'unknown',
    });

    // Time the resolver
    return await telemetry.measureAsync(
      'demo_graphql_resolver_duration_seconds',
      async () => {
        // Resolver logic
        return await this.fetchData(args.id);
      },
      {
        query: 'demoQuery',
        has_user: context.user ? 'true' : 'false',
      },
      {
        description: 'GraphQL resolver execution time',
        unit: 'seconds',
        persist: true,
      }
    );
  }

  /**
   * Example 8: Background job with progress tracking
   */
  async backgroundJobExample(taskId: string, totalItems: number): Promise<void> {
    const { telemetry } = this.context;

    // Progress gauge
    const progressGauge = telemetry.createGauge('demo_job_progress', {
      description: 'Job completion progress (0-100)',
    });

    // Items processed counter
    const itemsCounter = telemetry.createCounter('demo_job_items_processed', {
      description: 'Number of items processed in background jobs',
      persist: true,
    });

    // Track job start
    this.activeJobs.add(1, { task_id: taskId.substring(0, 8) });

    try {
      for (let i = 0; i < totalItems; i++) {
        // Process item
        await this.processItem({ index: i });

        // Update metrics
        itemsCounter.add(1, {
          task_id: taskId.substring(0, 8),
        });

        const progress = ((i + 1) / totalItems) * 100;
        progressGauge.set(progress, {
          task_id: taskId.substring(0, 8),
        });
      }
    } finally {
      // Job complete
      this.activeJobs.add(-1, { task_id: taskId.substring(0, 8) });
      progressGauge.set(100, {
        task_id: taskId.substring(0, 8),
      });
    }
  }

  // Helper methods
  private async processItem(item: any): Promise<any> {
    await this.simulateWork(10);
    return { ...item, processed: true };
  }

  private async complexCalculation(): Promise<number> {
    await this.simulateWork(100);
    return Math.random();
  }

  private async fetchData(id: string): Promise<any> {
    await this.simulateWork(50);
    return { id, name: 'Demo Data' };
  }

  private async simulateWork(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Required interface methods
  getExecutionContext(): any {
    return {
      service: this,
      context: this.context,
      user: this.context.user,
      partner: this.context.partner,
      started: new Date(),
    };
  }

  setContext(context: Reactory.Server.IReactoryContext): void {
    this.context = context;
  }
}

export default TelemetryDemoService;

