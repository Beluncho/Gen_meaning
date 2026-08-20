import { Router } from 'express';
import type { Request, Response } from 'express';
import type { AppDatabase } from '../db/database.ts';
import {
  createNewsHandlers,
  type NewsRequest,
  type NewsResponse,
} from './news-handlers.ts';

function asNewsRequest(request: Request): NewsRequest {
  return request;
}

function asNewsResponse(response: Response): NewsResponse {
  return response;
}

export function createNewsRouter(database: AppDatabase) {
  const router = Router();
  const handlers = createNewsHandlers(database);

  router.get('/', (request, response) =>
    handlers.list(asNewsRequest(request), asNewsResponse(response)),
  );
  router.get('/:id', (request, response) =>
    handlers.detail(asNewsRequest(request), asNewsResponse(response)),
  );

  return router;
}
