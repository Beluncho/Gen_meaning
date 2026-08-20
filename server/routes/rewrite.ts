import { Router } from 'express';
import type { Request, Response } from 'express';
import type { AppDatabase } from '../db/database.ts';
import { createOpenAIClient } from '../llm/openai-client.ts';
import { createRewriteService } from '../llm/service.ts';
import { config } from '../config.ts';
import {
  createRewriteHandlers,
  createRewriteRateLimiter,
  type RewriteRequestLike,
  type RewriteResponseLike,
} from './rewrite-handlers.ts';

function asRequest(request: Request): RewriteRequestLike {
  return request;
}

function asResponse(response: Response): RewriteResponseLike {
  return response;
}

export function createRewriteRouter(database: AppDatabase) {
  const router = Router();
  const service = createRewriteService(database, {
    client: createOpenAIClient(),
    model: config.openaiModel,
    configured: Boolean(config.openaiApiKey && config.openaiModel),
  });
  const handlers = createRewriteHandlers(
    service,
    createRewriteRateLimiter(),
  );

  router.post('/:id/rewrite', (request, response) =>
    handlers.rewrite(asRequest(request), asResponse(response)),
  );

  return router;
}
