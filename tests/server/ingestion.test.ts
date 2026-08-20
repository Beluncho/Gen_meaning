import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { DatabaseSync } from 'node:sqlite';
import { countArticles } from '../../server/db/article-repository.ts';
import { ingestHabrNews } from '../../server/feeds/ingest.ts';
import {
  canonicalizeUrl,
  extractExternalLinks,
  htmlToPlainText,
  normalizeFeedItem,
} from '../../server/feeds/normalize.ts';
import { parseRssFeed } from '../../server/feeds/rss-parser.ts';

const migrationSql = readFileSync(
  new URL('../../server/db/migrations/001_initial.sql', import.meta.url),
  'utf8',
);
const fixtureXml = readFileSync(
  new URL('../fixtures/habr-ai-news.xml', import.meta.url),
  'utf8',
);

function createDatabase() {
  const database = new DatabaseSync(':memory:');
  database.exec(migrationSql);
  return database;
}

function createFeedWithItemCount(itemCount: number) {
  const items = Array.from({ length: itemCount }, (_, index) => {
    const id = 2_000_000 + index;
    return `
      <item>
        <title><![CDATA[Новость об ИИ ${index + 1}]]></title>
        <guid isPermaLink="true">https://habr.com/ru/news/${id}/</guid>
        <link>https://habr.com/ru/news/${id}/?utm_source=rss</link>
        <description><![CDATA[<p>Факт номер ${index + 1}: модель обработала ${index + 10} документов.</p>]]></description>
        <pubDate>Tue, 18 Aug 2026 10:${String(index).padStart(2, '0')}:00 GMT</pubDate>
        <dc:creator><![CDATA[editor-${index + 1}]]></dc:creator>
        <category><![CDATA[искусственный интеллект]]></category>
      </item>`;
  }).join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
    <rss version="2.0" xmlns:dc="http://purl.org/dc/elements/1.1/">
      <channel>
        <title><![CDATA[AI news]]></title>
        <link>https://habr.com/ru/hubs/artificial_intelligence/news/</link>
        <language>ru</language>
        ${items}
      </channel>
    </rss>`;
}

test('parses Habr RSS fields from fixture', () => {
  const feed = parseRssFeed(fixtureXml);

  assert.equal(feed.language, 'ru');
  assert.equal(feed.items.length, 2);
  assert.equal(
    feed.items[0].guid,
    'https://habr.com/ru/news/1000001/',
  );
  assert.equal(feed.items[0].author, 'editor');
  assert.deepEqual(feed.items[0].categories, [
    'искусственный интеллект',
    'новости',
  ]);
});

test('sanitizes RSS descriptions and retains external provenance links', () => {
  const feed = parseRssFeed(fixtureXml);
  const article = normalizeFeedItem(feed.items[0]);

  assert.ok(article);
  assert.equal(
    article.summary,
    'Компания представила режим 18 августа 2026 года. Подробнее опубликовано\nв источнике.',
  );
  assert.equal(
    article.sourceUrl,
    'https://habr.com/ru/news/1000001/',
  );
  assert.deepEqual(article.externalLinks, ['https://example.com/source']);
  assert.equal(
    htmlToPlainText('<p>Первый факт.</p><a href="/articles/1/#habracut">Читать далее</a>'),
    'Первый факт.',
  );
  assert.deepEqual(
    extractExternalLinks(
      '<a href="https://example.com/a">Источник</a><a href="/articles/1/#habracut">Читать далее</a>',
    ),
    ['https://example.com/a'],
  );
  assert.equal(
    canonicalizeUrl(
      'https://habr.com/ru/news/1/?utm_source=rss&utm_campaign=1',
    ),
    'https://habr.com/ru/news/1/',
  );
});

test('ingests valid feed idempotently without duplicates', async () => {
  const database = createDatabase();
  const xml = createFeedWithItemCount(10);

  const first = await ingestHabrNews(database, { xml });
  const second = await ingestHabrNews(database, { xml });

  assert.deepEqual(
    {
      fetched: first.fetchedCount,
      inserted: first.insertedCount,
      updated: first.updatedCount,
      skipped: first.skippedCount,
      failed: first.failedCount,
      persisted: first.articleCount,
    },
    {
      fetched: 10,
      inserted: 10,
      updated: 0,
      skipped: 0,
      failed: 0,
      persisted: 10,
    },
  );
  assert.deepEqual(
    {
      inserted: second.insertedCount,
      updated: second.updatedCount,
      skipped: second.skippedCount,
      failed: second.failedCount,
      persisted: second.articleCount,
    },
    {
      inserted: 0,
      updated: 0,
      skipped: 10,
      failed: 0,
      persisted: 10,
    },
  );
  assert.equal(countArticles(database), 10);

  database.close();
});

test('records a failed ingestion run when a fresh feed has fewer than ten valid items', async () => {
  const database = createDatabase();

  await assert.rejects(
    ingestHabrNews(database, { xml: fixtureXml }),
    /at least 10 are required/,
  );

  const run = database
    .prepare(
      'SELECT status, error_summary FROM ingestion_runs ORDER BY started_at DESC LIMIT 1',
    )
    .get() as { status: string; error_summary: string };

  assert.equal(run.status, 'failed');
  assert.match(run.error_summary, /at least 10 are required/);

  database.close();
});
