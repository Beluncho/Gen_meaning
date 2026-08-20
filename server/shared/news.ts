export const NEWS_SOURCE = 'habr-ai';

export interface ParsedFeedItem {
  title: string;
  guid: string;
  link: string;
  descriptionHtml: string;
  publishedAt: string;
  author: string | null;
  categories: string[];
}

export interface NormalizedArticle {
  source: typeof NEWS_SOURCE;
  sourceGuid: string;
  sourceUrl: string;
  title: string;
  summary: string;
  author: string | null;
  publishedAt: string;
  categories: string[];
  externalLinks: string[];
  rawPayload: Record<string, unknown>;
  sourceHash: string;
}

export interface IngestionResult {
  runId: string;
  source: typeof NEWS_SOURCE;
  status: 'completed';
  fetchedCount: number;
  insertedCount: number;
  updatedCount: number;
  skippedCount: number;
  failedCount: number;
  articleCount: number;
}

export interface NewsArticle {
  id: string;
  source: typeof NEWS_SOURCE;
  sourceName: 'Хабр';
  sourceGuid: string;
  sourceUrl: string;
  title: string;
  summary: string;
  author: string | null;
  publishedAt: string;
  categories: string[];
  externalLinks: string[];
  sourceHash: string;
  fetchedAt: string;
  updatedAt: string;
}

export interface NewsSource {
  id: typeof NEWS_SOURCE;
  name: 'Хабр';
  feedUrl: string;
  newsUrl: string;
}
