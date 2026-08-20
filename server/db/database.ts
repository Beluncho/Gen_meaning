import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { fileURLToPath } from 'node:url';
import { config } from '../config.ts';

export type AppDatabase = DatabaseSync;

const migrationPath = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  'migrations',
  '001_initial.sql',
);

export function createDatabase(databasePath = config.databasePath): AppDatabase {
  fs.mkdirSync(path.dirname(databasePath), { recursive: true });

  const database = new DatabaseSync(databasePath);
  database.exec('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');

  database.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id TEXT PRIMARY KEY,
      applied_at TEXT NOT NULL
    );
  `);

  const migrationId = '001_initial';
  const migration = database
    .prepare('SELECT id FROM schema_migrations WHERE id = ?')
    .get(migrationId);

  if (!migration) {
    const sql = fs.readFileSync(migrationPath, 'utf8');
    database.exec('BEGIN IMMEDIATE;');

    try {
      database.exec(sql);
      database
        .prepare(
          'INSERT INTO schema_migrations (id, applied_at) VALUES (?, ?)',
        )
        .run(migrationId, new Date().toISOString());
      database.exec('COMMIT;');
    } catch (error) {
      database.exec('ROLLBACK;');
      database.close();
      throw error;
    }
  }

  return database;
}
