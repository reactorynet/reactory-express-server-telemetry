# 📡 Reactory Telemetry Module (`reactory-telemetry`)

## 1. Overview & Architecture

The `reactory-telemetry` module provides full-stack observability for the Reactory Platform, integrating **OpenTelemetry**, **Prometheus**, **Jaeger (OTLP)**, **Grafana**, and the Reactory Context API.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                            REACTORY SERVER                                  │
│                                                                             │
│  ┌─────────────────────────┐          ┌──────────────────────────────────┐  │
│  │ ReactoryContext         │          │ OpenTelemetry Auto-Instrumentation│ │
│  │ context.telemetry       │          │ (HTTP, Express, Mongo, GraphQL,  │  │
│  │                         │          │  Redis, DNS, Net)                │  │
│  │ • Counters & Gauges     │          └────────────────┬─────────────────┘  │
│  │ • Latency Histograms    │                           │                    │
│  │ • Execution Timers      │                           │ OTLP Traces/Metrics│
│  └────────────┬────────────┘                           │                    │
│               │                                        │                    │
│               ▼                                        ▼                    │
│  ┌─────────────────────────┐          ┌──────────────────────────────────┐  │
│  │ OpenTelemetry Meter     │          │ Jaeger / Collector               │  │
│  │ (prometheus/meter.ts)   │          │ (Port 4318 OTLP HTTP)            │  │
│  └────────────┬────────────┘          └──────────────────────────────────┘  │
│               │                                                             │
│               ▼                                                             │
│  ┌─────────────────────────┐                                                │
│  │ Prometheus Exporter     │                                                │
│  │ (Port 9464: /metrics)   │                                                │
│  └────────────┬────────────┘                                                │
└───────────────┼─────────────────────────────────────────────────────────────┘
                │
                │ Scraped every 10s via
                │ host.containers.internal:9464 (host)
                │ or reactory-express-server:9464 (container)
                ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                       OBSERVABILITY INFRASTRUCTURE                          │
│                                                                             │
│  ┌─────────────────────────┐          ┌──────────────────────────────────┐  │
│  │ Prometheus Container    │◄─────────┤ Grafana Container                │  │
│  │ (Port 9090)             │          │ (Port 3001 Host -> 3000 Cont.)   │  │
│  └─────────────────────────┘          │                                  │  │
│                                       │ Provisioned Dashboards:          │  │
│                                       │ • Reactory Express Watch Tower   │  │
│                                       │ • Reactory GraphQL Engine        │  │
│                                       │ • Reactory System & Runtime      │  │
│                                       │ • Reactory Authentication        │  │
│                                       │ • Reactor AI & Agent Operations  │  │
│                                       └──────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Infrastructure Setup & Containers

Prometheus, Grafana, Jaeger, and Loki run as containers managed via `config/reactory/docker-compose-develop.yaml`.

### Start Containers
```bash
# Start all observability services
docker compose -f config/reactory/docker-compose-develop.yaml up -d \
  reactory_prometheus \
  reactory_grafana \
  reactory_jaeger \
  reactory_grafana_loki
```

### Port Map Reference

| Service | Container Port | Host Port | Purpose |
|---|---|---|---|
| **App Metrics Exporter** | `9464` | `9464` | Express server Prometheus scrape endpoint (`/metrics`) |
| **Prometheus** | `9090` | `9090` | Scrapes targets, stores TSDB metrics, answers PromQL |
| **Grafana** | `3000` | `3001` | Web UI, visualization, dashboards (`http://localhost:3001`) |
| **Jaeger OTLP HTTP** | `4318` | `4318` | Ingests OTLP traces (`/v1/traces`) and metrics (`/v1/metrics`) |
| **Jaeger UI** | `16686` | `16686` | Distributed trace inspection UI |
| **Jaeger Metrics** | `14269` | `14269` | Internal Prometheus scrape endpoint for Jaeger |
| **Grafana Loki** | `3100` | `3100` | Log aggregation |

---

## 3. Running the Server with Telemetry (`bin/run-otel.sh`)

The application can run on the host (for development) or inside a container.

### A. Run Under Bun (Recommended for Local Dev)
```bash
# Run from repository root or from build/server/reactory/local
bin/run-otel.sh --bun
```
Under Bun, `run-otel.sh` executes:
```bash
bun --preload "${OTLP_ENTRY}" "${APP_DIR}/index.js"
```

### B. Run Under Node.js
```bash
bin/run-otel.sh
```
Under Node.js, `run-otel.sh` executes:
```bash
node -r "${OTLP_ENTRY}" "${APP_DIR}/index.js"
```

### ⚠️ Critical Runtime Isolation Rule
`env-cmd` is itself a Node.js CLI script. **Never export `NODE_OPTIONS="-r ${OTLP_ENTRY}"` globally into the shell environment before invoking `env-cmd`**. Doing so causes Node to execute OpenTelemetry instrumentation *inside the parent `env-cmd` process*, which binds port `9464` on IPv4 without an active application `MeterProvider` (resulting in `# failed to export metrics: Error: MetricReader is not bound to a MetricProducer`). `run-otel.sh` safely strips `-r` flags from `NODE_OPTIONS` and passes the preloader directly to the target runtime (`--preload` for Bun, `-r` for Node).

---

## 4. Container vs. Host Networking

When Prometheus runs inside a Podman/Docker container and the application runs on the host machine:
- **Host Target:** Prometheus inside the container reaches the host at `host.containers.internal:9464` (Podman) or `host.docker.internal:9464` (Docker Desktop).
- **Container Target:** If running inside the container network, Prometheus reaches `reactory-express-server:9464`.
- **Peer Services:** Grafana is reached via container DNS at `http://reactory-grafana:3000`; Prometheus is at `http://reactory-prometheus:9090`. Inside containers, `localhost` is the container itself.

`data/prometheus/prometheus.yml` is preconfigured to handle both environments:
```yaml
scrape_configs:
  - job_name: 'reactory-express-server'
    metrics_path: '/metrics'
    scrape_interval: 10s
    static_configs:
      - targets: ['host.containers.internal:9464']
        labels:
          instance: 'host'
      - targets: ['reactory-express-server:9464']
        labels:
          instance: 'container'
```

---

## 5. Provisioned Grafana Dashboards

Dashboards live in `data/grafana/models/dashboards/` and are automatically provisioned into Grafana:

### 1. `Reactory Express Watch Tower` (`reactory-express-watch-tower.json`)
- **UID:** `ce7uvb2l5aqyob`
- **Scope:** HTTP traffic volume (RPS), 5xx server error rate %, 4xx client error rate %, p50/p90/p95/p99 latency percentiles, in-flight active requests, inbound/outbound payload bandwidth (Bytes/s), slowest routes ranking.

### 2. `Reactory GraphQL Engine` (`reactory-graph.json`)
- **UID:** `ce7rbm3rmbksgf`
- **Scope:** Total GraphQL request rate, P95 execution times, average query durations, top 10 GraphQL operations by call volume, slowest operations ranking, execution latency distribution.

### 3. `Reactory System & Runtime Health` (`reactory-system-runtime.json`)
- **UID:** `reactory-system-runtime`
- **Scope:** Process CPU utilization gauge, event loop latency (starvation/blocked I/O detection), resident memory (RSS), heap allocated vs. used, external buffers, active handles (sockets/timers/FDs), and active async requests under Bun / Node.js.

### 4. `Reactory Authentication Monitor` (`reactory-authentication.json`)
- **UID:** `reactory-auth-monitor`
- **Scope:** Authentication success rate gauge, active sessions by provider, login attempts and failure rates, JWT token issuance rate, P95 authentication latency.

### 5. `Reactor AI & Agent Operations` (`reactor-ai-operations.json`)
- **UID:** `reactor-ai-operations`
- **Scope:** Conversation turn rate, tool execution rate, P95 upstream LLM latency, P95 tool execution latency, top 10 most invoked tools, slowest tools, tool calls by environment (server vs. client), tool errors by tool & error type, P90 tool iterations per turn, and token consumption rate by persona.

### ⚠️ Datasource UID Alignment
All dashboard models require the Prometheus datasource to have UID **`PEFFA43120800B12A`**. This is enforced in `data/grafana/provisioning/datasources/reactory-sources.yml`:
```yaml
datasources:
  - name: Reactory Prometheus
    type: prometheus
    uid: PEFFA43120800B12A
    url: http://reactory-prometheus:9090
    access: proxy
```

---

## 6. Developer Usage Guide: `context.telemetry`

Every Reactory request context provides direct access to the telemetry API via `context.telemetry` (`IReactoryTelemetry`).

### Core Methods

```typescript
// 1. Measuring Execution Time (Histogram Timer)
const stopTimer = context.telemetry.startTimer('operation_duration_seconds', {
  operation: 'data_sync',
});
try {
  await doWork();
} finally {
  stopTimer(); // Records duration in seconds to Prometheus histogram
}

// 2. Measuring Async Blocks Directly
const result = await context.telemetry.measureAsync(
  'external_api_duration_seconds',
  async () => await fetchExternalData(),
  { endpoint: 'stripe' }
);

// 3. Incrementing Counters
context.telemetry.increment('records_processed_total', 1, {
  status: 'success',
  entity: 'user',
});

// 4. Recording Gauge Values
context.telemetry.recordGauge('active_queue_depth', queue.length, {
  queue_name: 'email_dispatch',
});
```

### Context Enrichment
All calls through `context.telemetry` automatically enrich the metric with:
- `partner_id` & `partner_name`
- `user_id` (truncated hash for privacy)

### Attribute Best Practices
- **Use Low Cardinality:** Labels become dimensions in Prometheus. Use categories, names, and status codes (e.g. `tool_name="shell"`, `status="success"`, `personaId="Reactor"`).
- **Avoid High Cardinality:** Never pass user inputs, raw error stack traces, UUIDs, or timestamps as metric attributes.

---

## 7. Telemetry in the Reactor Module (`reactory-reactor`)

The `reactory-reactor` module tracks AI agent operations and conversation turns:

- **Tool & Macro Executions (`executeMacro`):**
  - Metric: `reactory_reactor_tool_execution_total` `{ tool_name, personaId, runat: "server", status }`
  - Metric: `reactory_reactor_tool_execution_duration_seconds` (Histogram)
  - Metric: `reactory_reactor_tool_execution_errors_total` `{ tool_name, personaId, error_type }`
- **Client-Side Tool Approvals (`completeClientToolCalls`):**
  - Metric: `reactory_reactor_tool_execution_total` `{ tool_name, personaId, runat: "client", status }`
- **LLM Upstream Invocations (`executeProviderChat`):**
  - Metric: `reactory_reactor_llm_request_duration_seconds` `{ provider, model, personaId }`
- **Conversation Turns (`sendMessage`):**
  - Metric: `reactory_reactor_conversation_turns_total` `{ personaId, provider, model, status }`
  - Metric: `reactory_reactor_conversation_turn_duration_seconds` (Histogram)
  - Metric: `reactory_reactor_tokens_total` `{ personaId, provider, model, type: "prompt" | "completion" }`
  - Metric: `reactory_reactor_tool_calls_per_turn` (Histogram)
- **Session Lifecycle:**
  - Metric: `reactory_reactor_chat_sessions_created_total` & `reactory_reactor_chat_sessions_deleted_total`

---

## 8. GraphQL Telemetry Query Feature

Client applications can query Prometheus, OTEL, logs, and database metrics through a unified GraphQL endpoint:

```graphql
query QueryTelemetryData {
  queryTelemetry(input: {
    source: PROMETHEUS
    query: "sum(rate(http_requests_total[5m]))"
    timeRange: {
      start: "2026-09-06T00:00:00Z"
      end: "2026-09-06T23:59:59Z"
    }
    aggregation: AVG
  }) {
    series {
      name
      data {
        timestamp
        value
      }
    }
    totalDataPoints
    executionTime
  }
}
```

---

## 9. Operational Memory & Troubleshooting Checklist

| Symptom | Cause | Solution |
|---|---|---|
| `MetricReader is not bound to a MetricProducer` | Redundant unbound `PrometheusExporter` created in script, or `NODE_OPTIONS` loaded in wrapper process (`env-cmd`). | Use `prometheus/meter.ts` exclusively for Prometheus exports. Do not export `NODE_OPTIONS` before running `env-cmd`. |
| Port `9464` `EADDRINUSE` | Multiple processes attempting to bind the metrics port (e.g. `env-cmd` parent and child Node process). | Pass `-r` or `--preload` directly to the child runtime argument list in `run-otel.sh`. |
| Grafana shows `unsupported protocol scheme` | Datasource URL in `reactory-sources.yml` missing `http://` scheme (e.g. `localhost:9090`). | Update datasource URL to `http://reactory-prometheus:9090`. |
| Grafana Dashboard panels show HTTP 400 Error | Dashboard panels query a fixed UID (e.g. `PEFFA43120800B12A`), but datasource was provisioned without `uid`. | Ensure `reactory-sources.yml` explicitly sets `uid: PEFFA43120800B12A`. |
| Prometheus shows scrape target `DOWN` (Connection refused) | Target configured as `localhost:3001` or `localhost:9464` inside the container network. | Use `host.containers.internal:9464` for host services; use container DNS names (e.g. `reactory-grafana:3000`) for peer containers. |
| Bun ignores `NODE_OPTIONS="-r ..."` | Bun does not support Node's `-r` flag via `NODE_OPTIONS`. | Pass `--preload <path>` directly to `bun` (`bun --preload ...`). |
