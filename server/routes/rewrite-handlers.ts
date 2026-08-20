import type { RewriteRequest, Tone } from '../llm/types.ts';
import {
  MAX_CUSTOM_STYLE_LENGTH,
  TONES,
} from '../llm/types.ts';
import {
  ArticleNotFoundError,
  RewriteConfigurationError,
  RewriteValidationError,
} from '../llm/service.ts';

export interface RewriteRequestLike {
  params: Record<string, string>;
  body: unknown;
  ip?: string;
}

export interface RewriteResponseLike {
  status(statusCode: number): RewriteResponseLike;
  json(body: unknown): RewriteResponseLike;
  setHeader?(name: string, value: string): RewriteResponseLike;
}

export interface RewriteServiceLike {
  rewrite(articleId: string, request: RewriteRequest): Promise<unknown>;
}

export interface RewriteRateLimiter {
  check(key: string): {
    allowed: boolean;
    retryAfterSeconds: number;
  };
}

function sendApiError(
  response: RewriteResponseLike,
  status: number,
  code: string,
  message: string,
  details?: unknown,
) {
  response.status(status).json({
    error: {
      code,
      message,
      ...(details === undefined ? {} : { details }),
    },
  });
}

function parseTone(value: unknown): Tone | null {
  return typeof value === 'string' &&
    (TONES as readonly string[]).includes(value)
    ? (value as Tone)
    : null;
}

function parseRequestBody(body: unknown): RewriteRequest | null {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return null;
  const record = body as Record<string, unknown>;
  const tone = parseTone(record.tone);
  if (!tone) return null;

  let customStyle: string | null = null;
  if (record.customStyle !== undefined && record.customStyle !== null) {
    if (typeof record.customStyle !== 'string') return null;
    customStyle = record.customStyle.trim();
    if (
      !customStyle ||
      customStyle.length > MAX_CUSTOM_STYLE_LENGTH
    ) {
      return null;
    }
  }

  if (tone === 'custom' && !customStyle) return null;
  if (tone !== 'custom' && customStyle) return null;

  return { tone, customStyle };
}

export function createRewriteRateLimiter(
  maxRequests = 5,
  windowMs = 60_000,
): RewriteRateLimiter {
  const requests = new Map<string, number[]>();

  return {
    check(key: string) {
      const now = Date.now();
      const threshold = now - windowMs;
      const recent = (requests.get(key) || []).filter(
        (timestamp) => timestamp > threshold,
      );

      if (recent.length >= maxRequests) {
        requests.set(key, recent);
        return {
          allowed: false,
          retryAfterSeconds: Math.max(
            1,
            Math.ceil((recent[0] + windowMs - now) / 1_000),
          ),
        };
      }

      recent.push(now);
      requests.set(key, recent);
      return { allowed: true, retryAfterSeconds: 0 };
    },
  };
}

function decodeIdentifier(value: string): string | null {
  try {
    return decodeURIComponent(value);
  } catch {
    return null;
  }
}

export function createRewriteHandlers(
  service: RewriteServiceLike,
  rateLimiter: RewriteRateLimiter,
) {
  return {
    async rewrite(
      request: RewriteRequestLike,
      response: RewriteResponseLike,
    ): Promise<void> {
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

      const parsedRequest = parseRequestBody(request.body);
      if (!parsedRequest) {
        sendApiError(
          response,
          400,
          'INVALID_REWRITE_REQUEST',
          'Укажите допустимый tone и параметры customStyle',
        );
        return;
      }

      const limit = rateLimiter.check(request.ip || 'unknown');
      if (!limit.allowed) {
        response.setHeader?.(
          'Retry-After',
          String(limit.retryAfterSeconds),
        );
        sendApiError(
          response,
          429,
          'REWRITE_RATE_LIMITED',
          'Слишком много запросов на переписывание',
        );
        return;
      }

      try {
        const result = await service.rewrite(identifier, parsedRequest);
        response.json({ result });
      } catch (error) {
        if (error instanceof ArticleNotFoundError) {
          sendApiError(response, 404, 'ARTICLE_NOT_FOUND', 'Новость не найдена');
          return;
        }

        if (error instanceof RewriteConfigurationError) {
          sendApiError(
            response,
            503,
            'LLM_NOT_CONFIGURED',
            'LLM не настроена на сервере',
          );
          return;
        }

        if (error instanceof RewriteValidationError) {
          sendApiError(
            response,
            422,
            'REWRITE_FACT_CHECK_FAILED',
            'Рерайт не прошел проверку сохранения фактов',
            {
              deterministic: error.deterministic,
              semantic: error.semantic,
            },
          );
          return;
        }

        console.error(
          'Rewrite request failed:',
          error instanceof Error ? error.message : 'unknown error',
        );
        sendApiError(
          response,
          502,
          'LLM_REQUEST_FAILED',
          'Не удалось получить проверенный рерайт',
        );
      }
    },
  };
}
