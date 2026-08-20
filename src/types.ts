export type Tone = 'neutral' | 'joyful' | 'sad' | 'ironic' | 'custom';

export interface NewsArticle {
  id: string;
  source: 'habr-ai';
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
  id: 'habr-ai';
  name: 'Хабр';
  feedUrl: string;
  newsUrl: string;
}

export interface NewsListResponse {
  items: NewsArticle[];
  pagination: {
    limit: number;
    offset: number;
    total: number;
    hasMore: boolean;
  };
  source: NewsSource;
}

export interface NewsDetailResponse {
  item: NewsArticle;
  source: NewsSource;
}

export interface RewriteResult {
  articleId: string;
  tone: Tone;
  customStyle: string | null;
  rewrittenTitle: string;
  rewrittenSummary: string;
  model: string;
  promptVersion: string;
  sourceHash: string;
  validationStatus: 'passed';
  validation: {
    deterministic: {
      passed: boolean;
      missing: Record<string, string[]>;
      added: Record<string, string[]>;
    };
    semantic: {
      passed: boolean;
      issues: string[];
    };
    repairAttempted: boolean;
  };
  cached: boolean;
}
