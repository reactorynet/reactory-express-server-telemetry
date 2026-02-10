# Partner Connection Settings Integration - Update Summary

## Overview

The TelemetryQueryService has been enhanced to support partner-specific connection settings in addition to environment-based configuration. This allows different organizations/partners to have their own telemetry backend configurations while maintaining backward compatibility with environment variables.

## Changes Made

### 1. GraphQL Schema Updates
**File**: `graphql/schema/TelemetryQueries.graphql`

- Added `connectionId: String` field to `TelemetryQueryInput`
- Added `TelemetryTimeRange` output type (in addition to input type)

### 2. Service Layer Enhancements
**File**: `services/TelemetryQueryService.ts`

#### New Interfaces
```typescript
export interface PrometheusConnectionSettings {
  host: string;
  port: number;
  protocol: 'http' | 'https';
  username?: string;
  password?: string;
}

export interface LokiConnectionSettings {
  host: string;
  port: number;
  protocol: 'http' | 'https';
  username?: string;
  password?: string;
}

export interface JaegerConnectionSettings {
  host: string;
  port: number;
  protocol: 'http' | 'https';
}

export type TelemetryConnectionSettings = 
  | PrometheusConnectionSettings 
  | LokiConnectionSettings 
  | JaegerConnectionSettings;
```

#### New Methods

1. **`getConnectionSettings<T>(connectionId?, source?): T | null`**
   - Retrieves connection settings from partner context if `connectionId` is provided
   - Falls back to environment variables if no `connectionId`
   - Returns typed connection settings

2. **`getEnvironmentConnectionSettings<T>(source): T | null`**
   - Extracts connection settings from environment variables
   - Supports both `REACTORY_*` and legacy environment variable names
   - Returns settings based on data source type (PROMETHEUS, LOGS, OTEL)

3. **`buildConnectionUrl(settings): string`**
   - Constructs connection URL from settings
   - Supports authentication (username/password)
   - Handles protocol, host, and port

#### Updated Methods

1. **`queryPrometheus()`**
   - Now uses `getConnectionSettings()` instead of direct environment access
   - Supports partner-specific Prometheus connections
   - Better error messages indicating configuration source

2. **`getSources()`**
   - Checks both environment and partner settings
   - Returns status as `configured`, `partner_configured`, or `not_configured`
   - Includes metadata with available partner connections
   - Lists all partner-specific connections per source type

### 3. Documentation Updates

#### TELEMETRY_QUERY_API.md
- Added comprehensive configuration section
- Documented partner-specific connection settings
- Provided examples of both environment and partner-based configurations
- Added connection resolution order documentation

#### README.md
- Updated environment setup section
- Added partner connection configuration examples
- Updated query examples to show `connectionId` usage

## Usage Examples

### Environment-Based Configuration (Legacy)

```bash
# Set environment variables
export REACTORY_PROMETHEUS_HOST=localhost
export REACTORY_PROMETHEUS_PORT=9090
export REACTORY_PROMETHEUS_PROTOCOL=http
```

```graphql
query {
  queryTelemetry(input: {
    source: PROMETHEUS
    query: "http_requests_total"
    timeRange: {
      start: "2024-12-27T00:00:00Z"
      end: "2024-12-27T23:59:59Z"
    }
  }) {
    series { name data { timestamp value } }
  }
}
```

### Partner-Based Configuration (New)

```typescript
// In partner settings.ts
export default [
  {
    name: 'custom.prometheus.prod',
    componentFqn: 'reactory-telemetry.PrometheusConnectionForm@1.0.0',
    data: {
      host: 'prometheus.production.com',
      port: 9090,
      protocol: 'https',
      username: 'metrics_reader',
      password: 'secure_password'
    },
    roles: ['ADMIN'],
  }
];
```

```graphql
query {
  queryTelemetry(input: {
    connectionId: "custom.prometheus.prod"
    source: PROMETHEUS
    query: "http_requests_total"
    timeRange: {
      start: "2024-12-27T00:00:00Z"
      end: "2024-12-27T23:59:59Z"
    }
  }) {
    series { name data { timestamp value } }
  }
}
```

## Connection Resolution Order

1. **If `connectionId` is provided:**
   - Look for setting in `context.partner.getSetting(connectionId)`
   - Extract `data` property from setting
   - Use these connection details

2. **If no `connectionId` (or setting not found):**
   - Check environment variables based on source type
   - Use environment-based configuration

3. **If neither is available:**
   - Throw configuration error with helpful message

## Supported Environment Variables

### Prometheus
- `REACTORY_PROMETHEUS_HOST` / `PROMETHEUS_HOST`
- `REACTORY_PROMETHEUS_PORT` / `PROMETHEUS_PORT`
- `REACTORY_PROMETHEUS_PROTOCOL` / `PROMETHEUS_PROTOCOL`
- `REACTORY_PROMETHEUS_USERNAME` / `PROMETHEUS_USERNAME` (optional)
- `REACTORY_PROMETHEUS_PASSWORD` / `PROMETHEUS_PASSWORD` (optional)
- `PROMETHEUS_URL` (legacy, parsed if no individual vars)

### Loki (Logs)
- `REACTORY_LOKI_HOST` / `LOKI_HOST`
- `REACTORY_LOKI_PORT` / `LOKI_PORT`
- `REACTORY_LOKI_PROTOCOL` / `LOKI_PROTOCOL`
- `REACTORY_LOKI_USERNAME` / `LOKI_USERNAME` (optional)
- `REACTORY_LOKI_PASSWORD` / `LOKI_PASSWORD` (optional)

### Jaeger (OTEL)
- `REACTORY_JAEGER_HOST` / `JAEGER_HOST`
- `REACTORY_JAEGER_PORT` / `JAEGER_PORT`
- `REACTORY_JAEGER_PROTOCOL` / `JAEGER_PROTOCOL`

## Partner Settings Structure

Partner settings should follow this structure:

```typescript
{
  name: string;                    // Connection identifier
  componentFqn: string;            // Form component FQN
  data: {                          // Connection details
    host: string;
    port: number;
    protocol: 'http' | 'https';
    username?: string;             // Optional
    password?: string;             // Optional
  };
  roles: string[];                 // Access control
}
```

### Standard Connection Names

For consistency, use these naming conventions:

- `reactory.prometheus.connection` - Default Prometheus
- `reactory.loki.connection` - Default Loki
- `reactory.jaeger.connection` - Default Jaeger
- `{partner}.prometheus.{environment}` - Partner-specific (e.g., `acme.prometheus.prod`)

## Benefits

### Multi-Tenancy Support
- Different partners can have different telemetry backends
- Isolated metrics per organization
- Centralized configuration management

### Security
- Credentials stored in partner settings (encrypted at rest)
- No need to expose credentials in environment variables
- Role-based access control via settings

### Flexibility
- Mix of global and partner-specific configurations
- Easy switching between environments
- Support for multiple connections per partner

### Backward Compatibility
- Existing environment-based configurations continue to work
- No breaking changes to existing queries
- Gradual migration path

## Migration Guide

### For Existing Deployments

No changes required! Existing environment-based configurations will continue to work.

### For New Multi-Tenant Deployments

1. Create partner settings:
   ```typescript
   // In partner settings file
   {
     name: 'reactory.prometheus.connection',
     componentFqn: 'reactory-telemetry.PrometheusConnectionForm@1.0.0',
     data: { host: '...', port: 9090, protocol: 'https' },
     roles: ['ADMIN']
   }
   ```

2. Update queries to use `connectionId`:
   ```graphql
   queryTelemetry(input: {
     connectionId: "reactory.prometheus.connection"
     source: PROMETHEUS
     query: "..."
   })
   ```

3. Remove environment variables (optional):
   - Keep as fallback for development
   - Remove from production if using partner settings

## Testing

### Check Available Sources
```graphql
query {
  getTelemetrySources {
    source
    available
    status
    metricCount
    metadata
  }
}
```

Expected output will show:
- `status: "configured"` - Environment-based config
- `status: "partner_configured"` - Partner settings available
- `status: "not_configured"` - No configuration
- `metadata.partnerConnections` - List of available partner connections

### Test Connection
```graphql
query {
  queryTelemetry(input: {
    connectionId: "reactory.prometheus.connection"
    source: PROMETHEUS
    query: "up"
    timeRange: { start: "...", end: "..." }
  }) {
    series { name }
    executionTime
  }
}
```

## Future Enhancements

- [ ] Connection pooling for partner connections
- [ ] Connection health checks
- [ ] Automatic failover to backup connections
- [ ] Connection usage metrics
- [ ] Admin UI for managing partner connections
- [ ] Connection testing endpoint
- [ ] Connection caching for performance

## Files Modified

1. `graphql/schema/TelemetryQueries.graphql` - Added connectionId field
2. `services/TelemetryQueryService.ts` - Added partner settings support
3. `TELEMETRY_QUERY_API.md` - Updated documentation
4. `README.md` - Updated quick start guide
5. `PARTNER_CONNECTION_UPDATE.md` - This file

## Backward Compatibility

✅ **Fully backward compatible**
- All existing queries work without changes
- Environment variables still supported
- No breaking changes to API

## Security Considerations

- Partner settings should be encrypted at rest
- Credentials in settings are more secure than environment variables
- Role-based access control enforced
- Audit logging of connection usage recommended

---

**Date**: December 28, 2024  
**Version**: 1.1.0  
**Status**: Complete ✅
