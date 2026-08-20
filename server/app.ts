import express from 'express';
import type { Request, Response } from 'express';
import type { AppDatabase } from './db/database.ts';
import { createNewsRouter } from './routes/news.ts';
import { createRewriteRouter } from './routes/rewrite.ts';

export function createApp(database: AppDatabase) {
  const app = express();

  app.disable('x-powered-by');
  app.use(express.json({ limit: '32kb' }));
  app.use('/api/news', createNewsRouter(database));
  app.use('/api/news', createRewriteRouter(database));

  app.get('/api/health', (_request: Request, response: Response) => {
    try {
      database.prepare('SELECT 1 AS ok').get();

      response.json({
        status: 'ok',
        service: 'gen-meaning-api',
        database: 'ok',
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Health check failed:', error);
      response.status(503).json({
        status: 'error',
        service: 'gen-meaning-api',
        database: 'error',
        timestamp: new Date().toISOString(),
      });
    }
  });

  return app;
}
