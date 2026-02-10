import { readFileSync } from 'fs';
import { join } from 'path';

const TelemetryQueriesSchema = readFileSync(
  join(__dirname, 'TelemetryQueries.graphql'),
  'utf8'
);

export default TelemetryQueriesSchema;
