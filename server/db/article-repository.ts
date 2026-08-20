import type { AppDatabase } from './database.ts';
import type {
  NewsArticle,
  NormalizedArticle,
} from '../shared/news.ts';

interface ArticleRow {
  id: string;
  source: string;
  source_guid: string;
  source_url: string;
  title: string;
  summary: string;
  author: string | null;
  published_at: string;
  categories_json: string;
  external_links_json: string;
  raw_payload_json: string | null;
  source_hash: string;
  fetched_at: string;
  updated_at: string;
}

export interface ArticleListResult {
  items: NewsArticle[];
  total: number;
}

export type UpsertStatus = 'inserted' | 'updated' | 'skipped';

function articleId(article: NormalizedArticle): string {
  return `${article.source}:${article.sourceGuid}`;
}

function categoriesJson(article: NormalizedArticle): string {
  return JSON.stringify(article.categories);
}

function externalLinksJson(article: NormalizedArticle): string {
  return JSON.stringify(article.externalLinks);
}

function rawPayloadJson(article: NormalizedArticle): string {
  return JSON.stringify(article.rawPayload);
}

function parseStringArray(value: string): string[] {
  try {
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed)
      ? parsed.filter((item): item is string => typeof item === 'string')
      : [];
  } catch {
    return [];
  }
}

function toNewsArticle(row: ArticleRow): NewsArticle {
  return {
    id: row.id,
    source: 'habr-ai',
    sourceName: 'Хабр',
    sourceGuid: row.source_guid,
    sourceUrl: row.source_url,
    title: row.title,
    summary: row.summary,
    author: row.author,
    publishedAt: row.published_at,
    categories: parseStringArray(row.categories_json),
    externalLinks: parseStringArray(row.external_links_json),
    sourceHash: row.source_hash,
    fetchedAt: row.fetched_at,
    updatedAt: row.updated_at,
  };
}

function hasSameContent(
  existing: ArticleRow,
  article: NormalizedArticle,
): boolean {
  return (
    existing.title === article.title &&
    existing.summary === article.summary &&
    existing.author === article.author &&
    existing.published_at === article.publishedAt &&
    existing.categories_json === categoriesJson(article) &&
    existing.external_links_json === externalLinksJson(article) &&
    existing.source_hash === article.sourceHash
  );
}

export function countArticles(database: AppDatabase): number {
  const row = database
    .prepare('SELECT COUNT(*) AS count FROM articles')
    .get() as { count: number };
  return Number(row.count);
}

export function listArticles(
  database: AppDatabase,
  limit: number,
  offset: number,
): ArticleListResult {
  const rows = database
    .prepare(
      `SELECT *
       FROM articles
       ORDER BY published_at DESC, id DESC
       LIMIT ? OFFSET ?`,
    )
    .all(limit, offset) as unknown as ArticleRow[];
  const total = countArticles(database);

  return {
    items: rows.map(toNewsArticle),
    total,
  };
}

export function findArticleById(
  database: AppDatabase,
  identifier: string,
): NewsArticle | null {
  const row = database
    .prepare(
      `SELECT *
       FROM articles
       WHERE id = ? OR source_guid = ? OR source_url = ?
       LIMIT 1`,
    )
    .get(identifier, identifier, identifier) as unknown as ArticleRow | undefined;

  return row ? toNewsArticle(row) : null;
}

export function upsertArticle(
  database: AppDatabase,
  article: NormalizedArticle,
  fetchedAt: string,
): UpsertStatus {
  const existing = database
    .prepare(
      `SELECT *
       FROM articles
       WHERE (source = ? AND source_guid = ?) OR source_url = ?
       LIMIT 1`,
    )
    .get(article.source, article.sourceGuid, article.sourceUrl) as unknown as
    | ArticleRow
    | undefined;

  if (existing && hasSameContent(existing, article)) {
    database
      .prepare('UPDATE articles SET fetched_at = ? WHERE id = ?')
      .run(fetchedAt, existing.id);
    return 'skipped';
  }

  if (existing) {
    database
      .prepare(
        `UPDATE articles
         SET source = ?,
             source_guid = ?,
             source_url = ?,
             title = ?,
             summary = ?,
             author = ?,
             published_at = ?,
             categories_json = ?,
             external_links_json = ?,
             raw_payload_json = ?,
             source_hash = ?,
             fetched_at = ?,
             updated_at = ?
         WHERE id = ?`,
      )
      .run(
        article.source,
        article.sourceGuid,
        article.sourceUrl,
        article.title,
        article.summary,
        article.author,
        article.publishedAt,
        categoriesJson(article),
        externalLinksJson(article),
        rawPayloadJson(article),
        article.sourceHash,
        fetchedAt,
        fetchedAt,
        existing.id,
      );
    return 'updated';
  }

  database
    .prepare(
      `INSERT INTO articles (
        id,
        source,
        source_guid,
        source_url,
        title,
        summary,
        author,
        published_at,
        categories_json,
        external_links_json,
        raw_payload_json,
        source_hash,
        fetched_at,
        updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      articleId(article),
      article.source,
      article.sourceGuid,
      article.sourceUrl,
      article.title,
      article.summary,
      article.author,
      article.publishedAt,
      categoriesJson(article),
      externalLinksJson(article),
      rawPayloadJson(article),
      article.sourceHash,
      fetchedAt,
      fetchedAt,
    );

  return 'inserted';
}
