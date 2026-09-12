/**
 * Telemetry Stream Service — SSE live tail for Loki logs (S10).
 *
 * Follows the platform's File-SSE pattern (core.FileSSETransportManager):
 * a session is minted over an AUTHENTICATED GraphQL mutation and returns an
 * opaque bearer token; the EventSource then attaches on a /telemetry route
 * (which bypasses client auth) presenting that token as ?token=.
 *
 * Sessions and subscribers live in a module-scoped map so the service works
 * regardless of service instantiation lifecycle. NOTE: like the File SSE
 * manager this is single-process — multi-worker deployments need the Redis
 * fan-out the reactor StreamingTransportManager uses.
 */
import crypto from 'crypto';
import type { Response } from 'express';
import Reactory from '@reactorynet/reactory-core';
import logger from '@reactory/server-core/logging';
import { TelemetryQueryService, TelemetryLogQueryInput } from './TelemetryQueryService';

const SESSION_TTL_MS = 60 * 60 * 1000; // 1 hour
const EVICTION_GRACE_MS = 60 * 1000;
const HEARTBEAT_INTERVAL_MS = 15 * 1000; // keep under nginx's 60s proxy_read_timeout
const DEFAULT_POLL_MS = 3_000;
const MIN_POLL_MS = 1_000;
const MAX_POLL_MS = 30_000;
const MAX_ENTRIES_PER_TICK = 1_000;

export interface TelemetryStreamSession {
  sessionId: string;
  token: string;
  expiry: Date;
  endpoint: string;
}

interface SubscriberState {
  res: Response;
  heartbeat: NodeJS.Timeout;
}

interface SessionState {
  sessionId: string;
  token: string;
  expiry: Date;
  lokiUrl: string;
  query: string;
  limit: number;
  intervalMs: number;
  /** Loki cursor in nanoseconds — only entries after this are emitted */
  cursorNs: bigint;
  subscribers: Map<Response, SubscriberState>;
  pollTimer: NodeJS.Timeout | null;
  evictionTimer: NodeJS.Timeout | null;
  polling: boolean;
}

// Module-scoped so every service instance shares the same session registry.
const SESSIONS = new Map<string, SessionState>();

const detectLevel = (labels: Record<string, any>, line: string): string | undefined => {
  const labelled = labels.level || labels.detected_level || labels.severity;
  if (labelled) return String(labelled).toLowerCase();
  const match = /\b(fatal|error|warn(?:ing)?|info|debug|trace)\b/i.exec(line);
  if (!match) return undefined;
  const level = match[1].toLowerCase();
  return level === 'warning' ? 'warn' : level;
};

const sseBaseUrl = (): string =>
  process.env.SSE_URI_ROOT || process.env.API_URI_ROOT || 'http://localhost:4000';

export class TelemetryStreamService implements Reactory.Service.IReactoryService {
  name: string = 'TelemetryStreamService';
  nameSpace: string = 'reactory';
  version: string = '1.0.0';
  context: Reactory.Server.IReactoryContext;

  serviceType?: string = 'data';
  service?: any = this;
  dependencies?: Reactory.Service.IReactoryServiceDefinition<any>[];

  constructor(props: any, context: Reactory.Server.IReactoryContext) {
    this.context = context;
  }

  /**
   * Mint a log-tail session. Caller is authenticated (GraphQL mutation);
   * the returned opaque token authorizes the SSE attach.
   */
  async openLogTailSession(
    input: TelemetryLogQueryInput,
    intervalMs?: number,
  ): Promise<TelemetryStreamSession> {
    const queryService = this.context.getService<TelemetryQueryService>('reactory.TelemetryQueryService@1.0.0');
    if (!queryService) throw new Error('TelemetryQueryService not available');

    const lokiUrl = queryService.getLokiBaseUrl(input.connectionId);
    const sessionId = crypto.randomBytes(16).toString('hex');
    const token = crypto.randomBytes(24).toString('hex');
    const expiry = new Date(Date.now() + SESSION_TTL_MS);

    const session: SessionState = {
      sessionId,
      token,
      expiry,
      lokiUrl,
      query: input.query,
      limit: input.limit && input.limit > 0 ? Math.min(input.limit, MAX_ENTRIES_PER_TICK) : MAX_ENTRIES_PER_TICK,
      intervalMs: Math.min(MAX_POLL_MS, Math.max(MIN_POLL_MS, intervalMs || DEFAULT_POLL_MS)),
      cursorNs: BigInt(Date.now()) * 1_000_000n,
      subscribers: new Map(),
      pollTimer: null,
      evictionTimer: null,
      polling: false,
    };
    SESSIONS.set(sessionId, session);

    // Unattached sessions are evicted after the grace period.
    session.evictionTimer = setTimeout(() => this.teardown(sessionId), EVICTION_GRACE_MS);

    logger.info('Telemetry log tail session opened', { sessionId, query: input.query });

    return {
      sessionId,
      token,
      expiry,
      endpoint: `${sseBaseUrl()}/telemetry/stream/${sessionId}`,
    };
  }

  /**
   * Attach an EventSource response to a session. Throws coded errors the
   * route maps to HTTP statuses.
   */
  async attachTransport(sessionId: string, token: string, res: Response): Promise<void> {
    const session = SESSIONS.get(sessionId);
    if (!session) throw Object.assign(new Error('Unknown stream session'), { code: 'UNKNOWN_SESSION' });
    if (!token || session.token !== token) throw Object.assign(new Error('Invalid stream token'), { code: 'UNAUTHORIZED' });
    if (session.expiry.getTime() < Date.now()) {
      this.teardown(sessionId);
      throw Object.assign(new Error('Stream session expired'), { code: 'TOKEN_EXPIRED' });
    }

    if (session.evictionTimer) {
      clearTimeout(session.evictionTimer);
      session.evictionTimer = null;
    }

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    if (typeof (res as any).flushHeaders === 'function') (res as any).flushHeaders();

    const heartbeat = setInterval(() => {
      try {
        res.write(': heartbeat\n\n');
      } catch {
        /* best-effort */
      }
    }, HEARTBEAT_INTERVAL_MS);

    session.subscribers.set(res, { res, heartbeat });

    const detach = () => {
      const subscriber = session.subscribers.get(res);
      if (!subscriber) return;
      clearInterval(subscriber.heartbeat);
      session.subscribers.delete(res);
      if (session.subscribers.size === 0) {
        if (session.pollTimer) {
          clearInterval(session.pollTimer);
          session.pollTimer = null;
        }
        session.evictionTimer = setTimeout(() => this.teardown(sessionId), EVICTION_GRACE_MS);
      }
    };
    res.on('close', detach);
    res.on('error', detach);

    this.sendEventTo(res, 'opened', { sessionId, query: session.query, intervalMs: session.intervalMs });

    if (!session.pollTimer) {
      session.pollTimer = setInterval(() => {
        void this.poll(session);
      }, session.intervalMs);
    }
  }

  async closeSession(sessionId: string): Promise<boolean> {
    const existed = SESSIONS.has(sessionId);
    this.teardown(sessionId);
    return existed;
  }

  private teardown(sessionId: string): void {
    const session = SESSIONS.get(sessionId);
    if (!session) return;
    if (session.pollTimer) clearInterval(session.pollTimer);
    if (session.evictionTimer) clearTimeout(session.evictionTimer);
    session.subscribers.forEach((subscriber) => {
      clearInterval(subscriber.heartbeat);
      try {
        subscriber.res.write('event: close\ndata: {}\n\n');
        subscriber.res.end();
      } catch {
        /* best-effort */
      }
    });
    session.subscribers.clear();
    SESSIONS.delete(sessionId);
    logger.debug('Telemetry log tail session closed', { sessionId });
  }

  /** One incremental Loki poll: entries after the cursor, forward direction. */
  private async poll(session: SessionState): Promise<void> {
    if (session.polling || session.subscribers.size === 0) return;
    session.polling = true;
    try {
      const nowNs = BigInt(Date.now()) * 1_000_000n;
      const url = new URL(`${session.lokiUrl}/loki/api/v1/query_range`);
      url.searchParams.set('query', session.query);
      url.searchParams.set('start', (session.cursorNs + 1n).toString());
      url.searchParams.set('end', nowNs.toString());
      url.searchParams.set('limit', String(session.limit));
      url.searchParams.set('direction', 'forward');

      const response = await fetch(url.toString());
      if (!response.ok) {
        this.broadcast(session, 'stream_error', { message: `Loki tail failed: ${response.statusText}` });
        return;
      }

      const data = await response.json();
      if (data.status !== 'success' || data.data?.resultType !== 'streams') return;

      let maxTs = session.cursorNs;
      const streams = (data.data.result || [])
        .map((stream: any) => {
          const labels = stream.stream || {};
          const entries = (stream.values || [])
            .filter(([timestampNs]: [string, string]) => BigInt(timestampNs) > session.cursorNs)
            .map(([timestampNs, line]: [string, string]) => {
              const ts = BigInt(timestampNs);
              if (ts > maxTs) maxTs = ts;
              return {
                timestamp: new Date(Number(ts / 1_000_000n)).toISOString(),
                line,
                level: detectLevel(labels, line),
              };
            });
          return { labels, entries };
        })
        .filter((stream: { entries: unknown[] }) => stream.entries.length > 0);

      session.cursorNs = maxTs;

      if (streams.length > 0) {
        this.broadcast(session, 'log_entries', {
          streams,
          totalEntries: streams.reduce((sum: number, s: { entries: unknown[] }) => sum + s.entries.length, 0),
        });
      }
    } catch (pollError) {
      logger.warn('Telemetry log tail poll failed', { sessionId: session.sessionId, error: pollError });
    } finally {
      session.polling = false;
    }
  }

  private broadcast(session: SessionState, type: string, payload: unknown): void {
    session.subscribers.forEach((subscriber) => this.sendEventTo(subscriber.res, type, payload));
  }

  private sendEventTo(res: Response, type: string, payload: unknown): void {
    try {
      res.write(`event: ${type}\ndata: ${JSON.stringify(payload)}\n\n`);
    } catch {
      /* best-effort */
    }
  }

  async onStart?(): Promise<void> {
    logger.info('TelemetryStreamService started');
  }
}

export default TelemetryStreamService;
