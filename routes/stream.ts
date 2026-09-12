import type { Router, Request, Response } from 'express';
import logger from '@reactory/server-core/logging';
import type { TelemetryStreamService } from '../services/TelemetryStreamService';

/**
 * SSE attach endpoint for telemetry stream sessions, mounted on the module's
 * /telemetry router → GET /telemetry/stream/:sessionId?token=...
 *
 * NOTE: /telemetry is in ReactoryClient.bypassUri, so no client/partner auth
 * runs here — authorization is the opaque per-session token minted by the
 * authenticated openTelemetryLogTailSession mutation (File-SSE pattern).
 */
export const registerStreamRoutes = (router: Router): void => {
  router.get('/stream/:sessionId', async (req: Request, res: Response) => {
    const context = (req as unknown as { context?: any }).context;
    const service = context?.getService?.('reactory.TelemetryStreamService@1.0.0') as TelemetryStreamService | undefined;

    if (!service) {
      res.status(500).json({ error: 'SERVICE_UNAVAILABLE', message: 'TelemetryStreamService not available' });
      return;
    }

    const { sessionId } = req.params;
    const token = String(
      (req.query.token as string | undefined) ?? (req.headers['x-telemetry-sse-token'] as string | undefined) ?? '',
    );

    try {
      await service.attachTransport(sessionId, token, res);
    } catch (attachError: any) {
      const code = attachError?.code ?? 'ATTACH_ERROR';
      const status = code === 'UNAUTHORIZED' || code === 'TOKEN_EXPIRED' ? 401 : code === 'UNKNOWN_SESSION' ? 404 : 500;
      logger.warn('Telemetry stream attach failed', { sessionId, code });
      if (!res.headersSent) {
        res.status(status).json({ error: code, message: attachError?.message });
      } else {
        res.write(`event: error\ndata: ${JSON.stringify({ code, message: attachError?.message })}\n\n`);
        res.end();
      }
    }
  });
};

export default registerStreamRoutes;
