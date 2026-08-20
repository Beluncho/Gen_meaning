import type { NewsArticle } from '../shared/news.ts';

export const TONES = ['neutral', 'joyful', 'sad', 'ironic', 'custom'] as const;
export type Tone = (typeof TONES)[number];

export const PROMPT_VERSION = 'rewrite-v2';
export const AUDIT_PROMPT_VERSION = 'audit-v2';
export const MAX_CUSTOM_STYLE_LENGTH = 240;

export interface RewriteRequest {
  tone: Tone;
  customStyle: string | null;
}

export interface FactLedger {
  numbers: string[];
  dates: string[];
  urls: string[];
  quotes: string[];
  entities: string[];
}

export interface DeterministicFactCheck {
  passed: boolean;
  missing: Partial<FactLedger>;
  added: Partial<FactLedger>;
}

export interface GeneratedRewrite {
  rewrittenTitle: string;
  rewrittenSummary: string;
}

export interface SemanticAudit {
  passed: boolean;
  issues: string[];
}

export interface RewritePromptInput {
  article: Pick<NewsArticle, 'title' | 'summary'>;
  request: RewriteRequest;
  facts: FactLedger;
}

export interface RewriteRepairInput extends RewritePromptInput {
  draft: GeneratedRewrite;
  issues: string[];
}

export interface RewriteAuditInput {
  article: Pick<NewsArticle, 'title' | 'summary'>;
  draft: GeneratedRewrite;
  facts: FactLedger;
}

export interface LlmClient {
  generateRewrite(input: RewritePromptInput): Promise<GeneratedRewrite>;
  auditRewrite(input: RewriteAuditInput): Promise<SemanticAudit>;
  repairRewrite(input: RewriteRepairInput): Promise<GeneratedRewrite>;
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
    deterministic: DeterministicFactCheck;
    semantic: SemanticAudit;
    repairAttempted: boolean;
  };
  cached: boolean;
}
