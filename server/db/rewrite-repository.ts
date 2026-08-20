import type { AppDatabase } from './database.ts';
import type { GeneratedRewrite, Tone } from '../llm/types.ts';
import { randomUUID } from 'node:crypto';

export interface CachedRewrite {
  id: string;
  articleId: string;
  tone: Tone;
  customStyle: string | null;
  rewrittenTitle: string;
  rewrittenSummary: string;
  model: string;
  promptVersion: string;
  sourceHash: string;
  validationStatus: string;
  validation: Record<string, unknown>;
  createdAt: string;
}

interface RewriteRow {
  id: string;
  article_id: string;
  tone: Tone;
  custom_style: string | null;
  rewritten_title: string;
  rewritten_summary: string;
  model: string;
  prompt_version: string;
  source_hash: string;
  validation_status: string;
  validation_json: string;
  created_at: string;
}

function toCachedRewrite(row: RewriteRow): CachedRewrite {
  let validation: Record<string, unknown> = {};
  try {
    const parsed: unknown = JSON.parse(row.validation_json);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      validation = parsed as Record<string, unknown>;
    }
  } catch {
    validation = {};
  }

  return {
    id: row.id,
    articleId: row.article_id,
    tone: row.tone,
    customStyle: row.custom_style,
    rewrittenTitle: row.rewritten_title,
    rewrittenSummary: row.rewritten_summary,
    model: row.model,
    promptVersion: row.prompt_version,
    sourceHash: row.source_hash,
    validationStatus: row.validation_status,
    validation,
    createdAt: row.created_at,
  };
}

export function findCachedRewrite(
  database: AppDatabase,
  articleId: string,
  tone: Tone,
  customStyle: string | null,
  sourceHash: string,
  model: string,
  promptVersion: string,
): CachedRewrite | null {
  const row = database
    .prepare(
      `SELECT *
       FROM rewrites
       WHERE article_id = ?
         AND tone = ?
         AND custom_style IS ?
         AND source_hash = ?
         AND model = ?
         AND prompt_version = ?
         AND validation_status = 'passed'
       ORDER BY created_at DESC
       LIMIT 1`,
    )
    .get(
      articleId,
      tone,
      customStyle,
      sourceHash,
      model,
      promptVersion,
    ) as unknown as RewriteRow | undefined;

  return row ? toCachedRewrite(row) : null;
}

export function saveRewrite(
  database: AppDatabase,
  articleId: string,
  request: {
    tone: Tone;
    customStyle: string | null;
  },
  output: GeneratedRewrite,
  metadata: {
    model: string;
    promptVersion: string;
    sourceHash: string;
    validation: Record<string, unknown>;
  },
): CachedRewrite {
  const createdAt = new Date().toISOString();
  const id = randomUUID();
  database
    .prepare(
      `INSERT INTO rewrites (
        id,
        article_id,
        tone,
        custom_style,
        rewritten_title,
        rewritten_summary,
        model,
        prompt_version,
        source_hash,
        validation_status,
        validation_json,
        created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'passed', ?, ?)`,
    )
    .run(
      id,
      articleId,
      request.tone,
      request.customStyle,
      output.rewrittenTitle,
      output.rewrittenSummary,
      metadata.model,
      metadata.promptVersion,
      metadata.sourceHash,
      JSON.stringify(metadata.validation),
      createdAt,
    );

  return {
    id,
    articleId,
    tone: request.tone,
    customStyle: request.customStyle,
    rewrittenTitle: output.rewrittenTitle,
    rewrittenSummary: output.rewrittenSummary,
    model: metadata.model,
    promptVersion: metadata.promptVersion,
    sourceHash: metadata.sourceHash,
    validationStatus: 'passed',
    validation: metadata.validation,
    createdAt,
  };
}
