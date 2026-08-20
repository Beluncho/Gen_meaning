import fs from 'node:fs';
import path from 'node:path';

const DEFAULT_PORT = 8787;

const envFilePath = path.resolve(process.cwd(), '.env');
if (fs.existsSync(envFilePath)) {
  process.loadEnvFile(envFilePath);
}

function readPort(value: string | undefined): number {
  if (!value) return DEFAULT_PORT;

  const port = Number(value);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error(`Invalid PORT value: ${value}`);
  }

  return port;
}

function resolvePath(value: string | undefined, fallback: string): string {
  return path.resolve(process.cwd(), value || fallback);
}

function readPositiveInteger(value: string | undefined, fallback: number): number {
  if (!value) return fallback;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1) {
    throw new Error(`Invalid positive integer value: ${value}`);
  }
  return parsed;
}

export const config = {
  nodeEnv: process.env.NODE_ENV || 'development',
  host: process.env.HOST || '127.0.0.1',
  port: readPort(process.env.PORT),
  databasePath: resolvePath(process.env.DATABASE_PATH, 'data/news.sqlite'),
  rssFeedUrl:
    process.env.HABR_AI_NEWS_RSS_URL ||
    'https://habr.com/ru/rss/hubs/artificial_intelligence/news/?fl=ru',
  openaiApiKey: process.env.OPENAI_API_KEY || '',
  openaiBaseUrl:
    process.env.OPENAI_BASE_URL || 'https://openai.api.proxyapi.ru/v1',
  openaiModel: process.env.OPENAI_MODEL || '',
  openaiTimeoutMs: readPositiveInteger(process.env.OPENAI_TIMEOUT_MS, 45_000),
} as const;
