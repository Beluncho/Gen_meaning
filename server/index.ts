import { createApp } from './app.ts';
import { config } from './config.ts';
import { createDatabase } from './db/database.ts';

const database = createDatabase();
const app = createApp(database);

const server = app.listen(config.port, config.host, () => {
  console.log(
    `Gen Meaning API listening on http://${config.host}:${config.port}`,
  );
});

function shutdown(signal: string) {
  console.log(`Received ${signal}, shutting down`);

  server.close(() => {
    database.close();
    process.exit(0);
  });
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
