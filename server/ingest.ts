import { createDatabase } from './db/database.ts';
import { ingestHabrNews } from './feeds/ingest.ts';

const database = createDatabase();

try {
  const result = await ingestHabrNews(database);
  console.log(JSON.stringify(result, null, 2));
} catch (error) {
  console.error(
    error instanceof Error ? error.message : 'News ingestion failed',
  );
  process.exitCode = 1;
} finally {
  database.close();
}
