import assert from 'node:assert/strict';
import test from 'node:test';
import { DatabaseSync } from 'node:sqlite';
import {
  findArticleById,
  listArticles,
  upsertArticle,
} from '../../server/db/article-repository.ts';
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
  const sourceGuid = `https://habr.com/ru/news/${3_000_000 + index}/`;
  return {
    source: 'habr-ai',
    sourceGuid,
    sourceUrl: sourceGuid,
    title: `Новость ${index}`,
    summary: `Краткий анонс новости ${index}.`,
    author: index % 2 === 0 ? 'editor' : null,
    publishedAt: `2026-08-18T10:0${index}:00.000Z`,
    categories: ['искусственный интеллект', `категория-${index}`],
    externalLinks: index === 1 ? ['https://example.com/source'] : [],
    rawPayload: {},
    sourceHash: `hash-${index}`,
  };
}

test('lists articles with pagination and maps JSON provenance fields', () => {
  const database = createDatabase();
  const fetchedAt = '2026-08-18T12:00:00.000Z';

  for (let index = 1; index <= 3; index += 1) {
    upsertArticle(database, createArticle(index), fetchedAt);
  }

  const page = listArticles(database, 2, 1);

  assert.equal(page.total, 3);
  assert.equal(page.items.length, 2);
  assert.equal(page.items[0].title, 'Новость 2');
  assert.equal(page.items[0].sourceName, 'Хабр');
  assert.deepEqual(page.items[0].categories, [
    'искусственный интеллект',
    'категория-2',
  ]);
  assert.deepEqual(page.items[0].externalLinks, []);
  assert.equal(page.items[1].sourceUrl, 'https://habr.com/ru/news/3000001/');

  database.close();
});

test('finds an article by local id, source GUID, or source URL', () => {
  const database = createDatabase();
  const article = createArticle(1);
  upsertArticle(database, article, '2026-08-18T12:00:00.000Z');

  const byGuid = findArticleById(database, article.sourceGuid);
  assert.ok(byGuid);
  assert.equal(byGuid.title, article.title);

  const byUrl = findArticleById(database, article.sourceUrl);
  assert.ok(byUrl);
  assert.equal(byUrl.id, byGuid.id);

  const byLocalId = findArticleById(database, byGuid.id);
  assert.ok(byLocalId);
  assert.equal(byLocalId.sourceHash, article.sourceHash);

  assert.equal(findArticleById(database, 'missing-article'), null);
  database.close();
});
