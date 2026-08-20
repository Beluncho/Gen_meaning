import assert from 'node:assert/strict';
import test from 'node:test';
import { DatabaseSync } from 'node:sqlite';
import { upsertArticle } from '../../server/db/article-repository.ts';
import { createNewsHandlers } from '../../server/routes/news-handlers.ts';
import type {
  NewsRequest,
  NewsResponse,
} from '../../server/routes/news-handlers.ts';
import type { NormalizedArticle } from '../../server/shared/news.ts';

const migrationSql = `
  CREATE TABLE schema_migrations (
    id TEXT PRIMARY KEY,
    applied_at TEXT NOT NULL
  );
  CREATE TABLE articles (
    id TEXT PRIMARY KEY,
    source TEXT NOT NULL,
    source_guid TEXT NOT NULL,
    source_url TEXT NOT NULL,
    title TEXT NOT NULL,
    summary TEXT NOT NULL,
    author TEXT,
    published_at TEXT NOT NULL,
    categories_json TEXT NOT NULL DEFAULT '[]',
    external_links_json TEXT NOT NULL DEFAULT '[]',
    raw_payload_json TEXT,
    source_hash TEXT NOT NULL,
    fetched_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    UNIQUE (source, source_guid),
    UNIQUE (source_url)
  );
`;

function createDatabase() {
  const database = new DatabaseSync(':memory:');
  database.exec(migrationSql);
  return database;
}

function createArticle(index: number): NormalizedArticle {
  const sourceGuid = `https://habr.com/ru/news/${4_000_000 + index}/`;
  return {
    source: 'habr-ai',
    sourceGuid,
    sourceUrl: sourceGuid,
    title: `Новость API ${index}`,
    summary: `Анонс новости API ${index}.`,
    author: 'editor',
    publishedAt: `2026-08-18T10:0${index}:00.000Z`,
    categories: ['искусственный интеллект'],
    externalLinks: index === 1 ? ['https://example.com/source'] : [],
    rawPayload: {},
    sourceHash: `api-hash-${index}`,
  };
}

class TestResponse implements NewsResponse {
  statusCode = 200;
  body: unknown;

  status(statusCode: number): NewsResponse {
    this.statusCode = statusCode;
    return this;
  }

  json(body: unknown): NewsResponse {
    this.body = body;
    return this;
  }
}

function request(
  query: Record<string, unknown> = {},
  id = '',
): NewsRequest {
  return { query, params: { id } };
}

test('GET /api/news handler returns paginated provenance-aware response', () => {
  const database = createDatabase();
  upsertArticle(database, createArticle(1), '2026-08-18T12:00:00.000Z');
  upsertArticle(database, createArticle(2), '2026-08-18T12:00:00.000Z');
  const handlers = createNewsHandlers(database);
  const response = new TestResponse();

  handlers.list(request({ limit: '1', offset: '1' }), response);

  assert.equal(response.statusCode, 200);
  assert.deepEqual(response.body, {
    items: [
      {
        id: 'habr-ai:https://habr.com/ru/news/4000001/',
        source: 'habr-ai',
        sourceName: 'Хабр',
        sourceGuid: 'https://habr.com/ru/news/4000001/',
        sourceUrl: 'https://habr.com/ru/news/4000001/',
        title: 'Новость API 1',
        summary: 'Анонс новости API 1.',
        author: 'editor',
        publishedAt: '2026-08-18T10:01:00.000Z',
        categories: ['искусственный интеллект'],
        externalLinks: ['https://example.com/source'],
        sourceHash: 'api-hash-1',
        fetchedAt: '2026-08-18T12:00:00.000Z',
        updatedAt: '2026-08-18T12:00:00.000Z',
      },
    ],
    pagination: {
      limit: 1,
      offset: 1,
      total: 2,
      hasMore: false,
    },
    source: {
      id: 'habr-ai',
      name: 'Хабр',
      feedUrl: 'https://habr.com/ru/rss/hubs/artificial_intelligence/news/?fl=ru',
      newsUrl: 'https://habr.com/ru/hubs/artificial_intelligence/news/',
    },
  });

  database.close();
});

test('news handlers validate pagination and return structured errors', () => {
  const database = createDatabase();
  const handlers = createNewsHandlers(database);

  const invalidLimit = new TestResponse();
  handlers.list(request({ limit: '0' }), invalidLimit);
  assert.equal(invalidLimit.statusCode, 400);
  assert.deepEqual(invalidLimit.body, {
    error: {
      code: 'INVALID_LIMIT',
      message: 'limit must be an integer between 1 and 50',
    },
  });

  const invalidOffset = new TestResponse();
  handlers.list(request({ offset: '-1' }), invalidOffset);
  assert.equal(invalidOffset.statusCode, 400);
  assert.deepEqual(invalidOffset.body, {
    error: {
      code: 'INVALID_OFFSET',
      message: 'offset must be an integer between 0 and 1000000',
    },
  });

  database.close();
});

test('GET /api/news/:id handler accepts encoded IDs and returns 404 for missing item', () => {
  const database = createDatabase();
  const article = createArticle(1);
  upsertArticle(database, article, '2026-08-18T12:00:00.000Z');
  const handlers = createNewsHandlers(database);

  const found = new TestResponse();
  handlers.detail(
    request({}, encodeURIComponent(article.sourceGuid)),
    found,
  );
  assert.equal(found.statusCode, 200);
  assert.equal(
    (found.body as { item: { title: string } }).item.title,
    'Новость API 1',
  );

  const missing = new TestResponse();
  handlers.detail(request({}, encodeURIComponent('missing')), missing);
  assert.equal(missing.statusCode, 404);
  assert.deepEqual(missing.body, {
    error: {
      code: 'ARTICLE_NOT_FOUND',
      message: 'Новость не найдена',
    },
  });

  database.close();
});
