# Reactory Telemetry — Graph & UI Specification

The full specification for the telemetry GraphQL surface and the UI component
suite lives with the client plugin that consumes it:

**`reactory-pwa-client/src/components/plugins/reactory-telemetry/SPECIFICATION.md`**
(repo: `reactorynet/reactory-telemetry-pwa-plugin`)

Status: ✅ implemented (2026-09-12) — all four delivery phases and all ten
server work items (S1–S10). The GraphQL contract this module serves is
documented in [`../TELEMETRY_QUERY_API.md`](../TELEMETRY_QUERY_API.md),
including the extended API: logs (`queryTelemetryLogs`), traces
(`searchTelemetryTraces` / `getTelemetryTrace` / `listTelemetryTraceServices`),
label values (`listTelemetryLabelValues`), Grafana import
(`listTelemetryGrafanaDashboards` / `getTelemetryGrafanaDashboard`), and SSE
live tail (`openTelemetryLogTailSession` → `GET /telemetry/stream/:sessionId`).

Remaining backlog (tracked in the plugin spec §0): visual dashboard editor UX,
`db` FormStore for runtime form persistence, Redis fan-out for multi-worker
SSE, OTEL Collector metric integration, alert threshold queries.
