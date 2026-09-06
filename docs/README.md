# Reactory Express Server Telemetry

The `reactory-telemetry` module provides enterprise-grade observability and runtime metrics for `reactory-express-server`.

## Documentation Index

- **[Module README](../README.md)** - Primary module documentation, installation, and troubleshooting memory.
- **[Quick Reference](./QUICK_REFERENCE.md)** - Developer cheat-sheet for `context.telemetry` methods (`startTimer`, `measureAsync`, `increment`, `recordGauge`).
- **[Telemetry Context Integration](./TELEMETRY_CONTEXT_INTEGRATION.md)** - Architecture and design patterns for `context.telemetry`.
- **[Telemetry Query API](../TELEMETRY_QUERY_API.md)** - GraphQL API reference for querying telemetry backends from client apps.
- **[Code Examples](../ReactoryTelemetry.examples.md)** - Practical TypeScript examples for services and middleware.

## Key Observability Components

- **Grafana (Port 3001 Host / 3000 Container):** Pre-provisioned dashboards covering HTTP traffic, GraphQL operations, runtime health, authentication, and AI agent operations.
- **Prometheus (Port 9090):** Scrapes port `9464` via `host.containers.internal:9464` (host mode) or `reactory-express-server:9464` (container mode).
- **OpenTelemetry / Jaeger (Port 4318 OTLP / 16686 UI):** Distributed tracing and OTLP metrics.
- **Application Exporter (Port 9464):** Prometheus scrape endpoint initialized by `prometheus/meter.ts`.
