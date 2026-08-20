import {
  findArticleById,
  listArticles,
} from '../db/article-repository.ts';
import type { AppDatabase } from '../db/database.ts';
import type { NewsSource } from '../shared/news.ts';
import { config } from '../config.ts';

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;
const MAX_OFFSET = 1_000_000;

export const NEWS_SOURCE_INFO: NewsSource = {
  id: 'habr-ai',
  name: 'Хабр',
  feedUrl: config.rssFeedUrl,
  newsUrl: 'https://habr.com/ru/hubs/artificial_intelligence/news/',
};

export interface NewsRequest {
  query: unknown;
  params: Record<string, string>;
}

export interface NewsResponse {
  status(statusCode: number): NewsResponse;
  json(body: unknown): NewsResponse;
}

function sendApiError(
  response: NewsResponse,
  status: number,
  code: string,
  message: string,
) {
  response.status(status).json({
    error: {
      code,
      message,
    },
  });
}

function queryValue(value: unknown): string | undefined {
  if (typeof value === 'string') return value;
  if (Array.isArray(value) && typeof value[0] === 'string') return value[0];
  return undefined;
}

function parseNonNegativeInteger(
  value: unknown,
  fallback: number,
  maximum: number,
): number | null {
  const stringValue = queryValue(value);
  if (stringValue === undefined || stringValue === '') return fallback;
  if (!/^\d+$/.test(stringValue)) return null;

  const parsed = Number(stringValue);
  if (!Number.isSafeInteger(parsed) || parsed > maximum) return null;
  return parsed;
}

function parseLimit(value: unknown): number | null {
  const parsed = parseNonNegativeInteger(value, DEFAULT_LIMIT, MAX_LIMIT);
  if (parsed === null || parsed < 1) return null;
  return parsed;
}

function parseOffset(value: unknown): number | null {
  return parseNonNegativeInteger(value, 0, MAX_OFFSET);
}

function decodeIdentifier(value: string): string | null {
  try {
    return decodeURIComponent(value);
  } catch {
    return null;
  }
}

export function createNewsHandlers(database: AppDatabase) {
  function list(request: NewsRequest, response: NewsResponse): void {
    const query =
      request.query && typeof request.query === 'object'
        ? (request.query as Record<string, unknown>)
        : {};
    const limit = parseLimit(query.limit);
    const offset = parseOffset(query.offset);

    if (limit === null) {
      sendApiError(
        response,
        400,
        'INVALID_LIMIT',
        `limit must be an integer between 1 and ${MAX_LIMIT}`,
      );
      return;
    }

    if (offset === null) {
      sendApiError(
        response,
        400,
        'INVALID_OFFSET',
        `offset must be an integer between 0 and ${MAX_OFFSET}`,
      );
      return;
    }

    try {
      const result = listArticles(database, limit, offset);
      response.json({
        items: result.items,
        pagination: {
          limit,
          offset,
          total: result.total,
          hasMore: offset + result.items.length < result.total,
        },
        source: NEWS_SOURCE_INFO,
      });
    } catch (error) {
      console.error('News list failed:', error);
      sendApiError(
        response,
        500,
        'NEWS_LIST_FAILED',
        'Не удалось получить новости',
      );
    }
  }

  function detail(request: NewsRequest, response: NewsResponse): void {
    const identifier = decodeIdentifier(request.params.id);
    if (!identifier) {
      sendApiError(
        response,
        400,
        'INVALID_ARTICLE_ID',
        'Некорректный идентификатор новости',
      );
      return;
    }

    try {
      const article = findArticleById(database, identifier);
      if (!article) {
        sendApiError(response, 404, 'ARTICLE_NOT_FOUND', 'Новость не найдена');
        return;
      }

      response.json({
        item: article,
        source: NEWS_SOURCE_INFO,
      });
    } catch (error) {
      console.error('News detail failed:', error);
      sendApiError(
        response,
        500,
        'NEWS_DETAIL_FAILED',
        'Не удалось получить новость',
      );
    }
  }

  return { list, detail };
}
