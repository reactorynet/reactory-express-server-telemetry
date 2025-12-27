import express, { Request, Response } from 'express';
import logger from '@reactory/server-core/logging';
import { register } from '../prometheus/meter';

const router = express.Router();

/**
 * GET /metrics
 * Prometheus metrics endpoint
 * Returns metrics in Prometheus text format
 */
router.get('/metrics', async (req: Request, res: Response) => {
  try {
    res.set('Content-Type', register.contentType);
    const metrics = await register.metrics();
    res.end(metrics);
  } catch (error) {
    logger.error('Error generating Prometheus metrics', { error });
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to generate metrics',
    });
  }
});

/**
 * GET /health
 * Health check endpoint
 * Returns application health status
 */
router.get('/health', (req: Request, res: Response) => {
  try {
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: {
        heapUsed: process.memoryUsage().heapUsed,
        heapTotal: process.memoryUsage().heapTotal,
        rss: process.memoryUsage().rss,
        external: process.memoryUsage().external,
      },
      cpu: process.cpuUsage(),
      environment: process.env.NODE_ENV || 'development',
      nodeVersion: process.version,
      pid: process.pid,
    };

    res.status(200).json(health);
  } catch (error) {
    logger.error('Error generating health check', { error });
    res.status(503).json({
      status: 'unhealthy',
      error: 'Health check failed',
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * GET /health/ready
 * Readiness probe endpoint
 * Checks if the application is ready to accept traffic
 */
router.get('/health/ready', (req: Request, res: Response) => {
  try {
    // Check if critical services are available
    const isReady = true; // Add your readiness checks here

    if (isReady) {
      res.status(200).json({
        status: 'ready',
        timestamp: new Date().toISOString(),
      });
    } else {
      res.status(503).json({
        status: 'not ready',
        timestamp: new Date().toISOString(),
      });
    }
  } catch (error) {
    logger.error('Error checking readiness', { error });
    res.status(503).json({
      status: 'not ready',
      error: 'Readiness check failed',
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * GET /health/live
 * Liveness probe endpoint
 * Checks if the application is alive (for Kubernetes)
 */
router.get('/health/live', (req: Request, res: Response) => {
  // Simple liveness check - if we can respond, we're alive
  res.status(200).json({
    status: 'alive',
    timestamp: new Date().toISOString(),
  });
});

export default router;

