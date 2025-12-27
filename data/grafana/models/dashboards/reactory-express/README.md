# Reactory Express Grafana Dashboards

This directory contains Grafana dashboard definitions that are automatically provisioned when the reactory-telemetry module starts.

## Available Dashboards

### 1. Reactory Express Watch Tower (`reactory-express-watch-tower.json`)

General monitoring dashboard for HTTP requests and server health.

**Metrics:**
- HTTP request counts
- Request paths
- Server activity

### 2. Reactory Authentication Monitor (`reactory-authentication.json`)

Comprehensive authentication monitoring dashboard covering all authentication strategies.

**Metrics:**
- Authentication attempts, successes, and failures
- Authentication duration (P50, P95, P99)
- Active sessions by provider
- OAuth callbacks and CSRF validation
- JWT token generation
- User creation rates
- Detailed failure analysis

**Providers Covered:**
- JWT
- Local (Basic Auth)
- Google OAuth2
- Facebook OAuth2
- GitHub OAuth2
- LinkedIn OAuth2
- Microsoft OIDC
- Okta OIDC

**Key Panels:**
1. **Overview** - Success rate, total attempts, failures, P95 duration
2. **Provider Trends** - Attempts and success/failure by provider
3. **Performance** - Duration percentiles and failure reasons
4. **Security** - OAuth callbacks and CSRF validation status
5. **User Activity** - Token generation and new user creation

**Refresh Rate**: 30 seconds  
**Time Window**: Last 15 minutes (configurable)

## Dashboard Provisioning

Dashboards in this directory are automatically provisioned via the Grafana provisioning configuration:

- **Config**: `/src/modules/reactory-telemetry/data/grafana/provisioning/dashboards/reactory-graph.yml`
- **Mount Path**: `/etc/grafana/dashboards` (in Grafana container)
- **Auto-reload**: Every 10 seconds

## Accessing Dashboards

Once Grafana is running:

1. Open Grafana in your browser (typically `http://localhost:3000`)
2. Navigate to **Dashboards** → **Browse**
3. Look for:
   - "Reactory Express Watch Tower"
   - "Reactory Authentication Monitor"

## Customizing Dashboards

### Option 1: Edit in Grafana UI (Temporary)

1. Open the dashboard in Grafana
2. Click the gear icon (⚙️) → **Settings**
3. Make your changes
4. Export JSON via **JSON Model** to save permanently

### Option 2: Edit JSON Directly (Permanent)

1. Open the JSON file in this directory
2. Make your changes
3. Save the file
4. Wait for Grafana to reload (10 seconds)

**Common Customizations:**
- Change time ranges
- Adjust refresh intervals
- Modify panel layouts
- Add new queries
- Change thresholds/colors

## Creating New Dashboards

1. Create a new dashboard in Grafana UI
2. Configure panels and queries
3. Export JSON:
   - Click Dashboard Settings (⚙️)
   - Go to **JSON Model**
   - Copy JSON
4. Save to this directory as `<dashboard-name>.json`
5. Dashboard will be auto-provisioned

## Prometheus Data Source

All dashboards use the Prometheus data source:

- **UID**: `PEFFA43120800B12A`
- **Type**: `prometheus`
- **Config**: `/src/modules/reactory-telemetry/data/grafana/provisioning/datasources/reactory-sources.yml`

## Troubleshooting

### Dashboard Not Appearing

1. Check Grafana logs for provisioning errors
2. Verify JSON syntax is valid
3. Ensure file is in correct directory
4. Wait for provisioning reload (10 seconds)

### Panels Show "No Data"

1. Verify Prometheus is running and accessible
2. Check metric names in queries match emitted metrics
3. Verify time range includes data
4. Check Prometheus targets are being scraped

### Queries Timing Out

1. Reduce time window
2. Increase Prometheus resources
3. Optimize queries (reduce cardinality)
4. Consider longer scrape intervals

## Related Documentation

- **Authentication Telemetry**: `/src/authentication/TELEMETRY_INTEGRATION_COMPLETE.md`
- **Authentication Strategies**: `/src/authentication/README.md`
- **Telemetry Module**: `/src/modules/reactory-telemetry/`

## Support

For issues or questions:
1. Check authentication telemetry documentation
2. Review Prometheus metrics: `http://localhost:4000/metrics`
3. Check Grafana provisioning logs
4. Verify dashboard JSON syntax

---

**Last Updated**: 2025-11-24  
**Dashboards**: 2  
**Auto-Provision**: ✅ Enabled


