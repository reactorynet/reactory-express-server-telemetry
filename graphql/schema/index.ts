import { readFileSync } from 'fs';
import { join } from 'path';

const TelemetryQueriesSchema = readFileSync(
  join(__dirname, 'TelemetryQueries.graphql'),
  'utf8'
);

const TelemetryLogsTracesSchema = readFileSync(
  join(__dirname, 'TelemetryLogsTraces.graphql'),
  'utf8'
);

export { TelemetryQueriesSchema, TelemetryLogsTracesSchema };

export default [TelemetryQueriesSchema, TelemetryLogsTracesSchema];
