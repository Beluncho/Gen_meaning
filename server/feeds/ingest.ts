import { randomUUID } from 'node:crypto';
import { config } from '../config.ts';
import type { AppDatabase } from '../db/database.ts';
import {
  countArticles,
  upsertArticle,
} from '../db/article-repository.ts';
import { fetchRss } from './client.ts';
import { normalizeFeedItem } from './normalize.ts';
import { parseRssFeed } from './rss-parser.ts';
import type { IngestionResult } from '../shared/news.ts';

const MINIMUM_FRESH_ARTICLES = 10;

function createRun(database: AppDatabase, runId: string, startedAt: string) {
  database
    .prepare(
      `INSERT INTO ingestion_runs (
        id, source, status, started_at
      ) VALUES (?, ?, ?, ?)`,
    )
    .run(runId, 'habr-ai', 'running', startedAt);
}

function finishRun(
  database: AppDatabase,
  runId: string,
  result: Omit<IngestionResult, 'runId' | 'source' | 'status' | 'articleCount'>,
  finishedAt: string,
) {
  database
    .prepare(
      `UPDATE ingestion_runs
       SET status = ?,
           finished_at = ?,
           fetched_count = ?,
           inserted_count = ?,
           updated_count = ?,
           skipped_count = ?,
           failed_count = ?
       WHERE id = ?`,
    )
    .run(
      'completed',
      finishedAt,
      result.fetchedCount,
      result.insertedCount,
      result.updatedCount,
      result.skippedCount,
      result.failedCount,
      runId,
    );
}

function failRun(
  database: AppDatabase,
  runId: string,
  error: unknown,
  finishedAt: string,
) {
  const message =
    error instanceof Error ? error.message : 'Unknown ingestion error';

  database
    .prepare(
      `UPDATE ingestion_runs
       SET status = ?, finished_at = ?, error_summary = ?
       WHERE id = ?`,
    )
    .run('failed', finishedAt, message.slice(0, 1_000), runId);
}

export async function ingestHabrNews(
  database: AppDatabase,
  options: { feedUrl?: string; xml?: string } = {},
): Promise<IngestionResult> {
  const runId = randomUUID();
  const startedAt = new Date().toISOString();
  createRun(database, runId, startedAt);

  try {
    const xml = options.xml ?? (await fetchRss(options.feedUrl ?? config.rssFeedUrl));
    const feed = parseRssFeed(xml);
    const normalized = feed.items.map(normalizeFeedItem);
    const validArticles = normalized.filter(
      (article): article is NonNullable<typeof article> => Boolean(article),
    );
    const failedCount = normalized.length - validArticles.length;

    if (
      countArticles(database) === 0 &&
      validArticles.length < MINIMUM_FRESH_ARTICLES
    ) {
      throw new Error(
        `RSS feed contains only ${validArticles.length} valid articles; at least ${MINIMUM_FRESH_ARTICLES} are required`,
      );
    }

    let insertedCount = 0;
    let updatedCount = 0;
    let skippedCount = 0;

    database.exec('BEGIN IMMEDIATE;');
    try {
      for (const article of validArticles) {
        const status = upsertArticle(database, article, startedAt);
        if (status === 'inserted') insertedCount += 1;
        if (status === 'updated') updatedCount += 1;
        if (status === 'skipped') skippedCount += 1;
      }
      database.exec('COMMIT;');
    } catch (error) {
      database.exec('ROLLBACK;');
      throw error;
    }

    const result = {
      runId,
      source: 'habr-ai' as const,
      status: 'completed' as const,
      fetchedCount: feed.items.length,
      insertedCount,
      updatedCount,
      skippedCount,
      failedCount,
      articleCount: countArticles(database),
    };

    finishRun(database, runId, result, new Date().toISOString());
    return result;
  } catch (error) {
    failRun(database, runId, error, new Date().toISOString());
    throw error;
  }
}
