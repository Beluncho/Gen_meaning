import type {
  NewsArticle,
  NewsDetailResponse,
  NewsListResponse,
  RewriteResult,
  Tone,
} from '../types';

const API_BASE = '/api';

interface ApiErrorBody {
  error?: {
    code?: string;
    message?: string;
  };
}

export class NewsApiError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(message: string, status: number, code = 'API_REQUEST_FAILED') {
    super(message);
    this.name = 'NewsApiError';
    this.status = status;
    this.code = code;
  }
}

async function requestJson<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  let response: Response;

  try {
    response = await fetch(`${API_BASE}${path}`, {
      ...init,
      headers: {
        Accept: 'application/json',
        ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
        ...init?.headers,
      },
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw error;
    }

    throw new NewsApiError(
      'Сервер новостей недоступен. Проверьте, запущен ли backend.',
      0,
      'NETWORK_ERROR',
    );
  }

  let payload: unknown = null;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  if (!response.ok) {
    const errorBody = payload as ApiErrorBody | null;
    throw new NewsApiError(
      errorBody?.error?.message || 'Не удалось выполнить запрос',
      response.status,
      errorBody?.error?.code || 'API_REQUEST_FAILED',
    );
  }

  return payload as T;
}

export async function fetchNews(
  limit = 20,
  offset = 0,
  signal?: AbortSignal,
): Promise<NewsListResponse> {
  return requestJson<NewsListResponse>(
    `/news?limit=${encodeURIComponent(limit)}&offset=${encodeURIComponent(offset)}`,
    { signal },
  );
}

export async function fetchArticle(
  articleId: string,
  signal?: AbortSignal,
): Promise<NewsArticle> {
  const response = await requestJson<NewsDetailResponse>(
    `/news/${encodeURIComponent(articleId)}`,
    { signal },
  );
  return response.item;
}

export async function rewriteArticle(
  articleId: string,
  tone: Tone,
  customStyle: string | null,
  signal?: AbortSignal,
): Promise<RewriteResult> {
  const response = await requestJson<{ result: RewriteResult }>(
    `/news/${encodeURIComponent(articleId)}/rewrite`,
    {
      method: 'POST',
      body: JSON.stringify({ tone, customStyle }),
      signal,
    },
  );
  return response.result;
}
