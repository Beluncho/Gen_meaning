import {
  findArticleById,
} from '../db/article-repository.ts';
import {
  findCachedRewrite,
  saveRewrite,
} from '../db/rewrite-repository.ts';
import type { AppDatabase } from '../db/database.ts';
import {
  checkDeterministicFacts,
  extractFactLedger,
} from './facts.ts';
import type {
  DeterministicFactCheck,
  LlmClient,
  RewriteRequest,
  RewriteResult,
  SemanticAudit,
} from './types.ts';
import {
  PROMPT_VERSION,
} from './types.ts';

export class ArticleNotFoundError extends Error {
  constructor() {
    super('Article not found');
    this.name = 'ArticleNotFoundError';
  }
}

export class RewriteConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RewriteConfigurationError';
  }
}

export class RewriteValidationError extends Error {
  readonly deterministic: DeterministicFactCheck;
  readonly semantic: SemanticAudit;

  constructor(
    deterministic: DeterministicFactCheck,
    semantic: SemanticAudit,
  ) {
    super('Rewrite did not pass factual validation');
    this.name = 'RewriteValidationError';
    this.deterministic = deterministic;
    this.semantic = semantic;
  }
}

export interface RewriteServiceOptions {
  client: LlmClient;
  model: string;
  configured?: boolean;
  promptVersion?: string;
}

function issueList(
  deterministic: DeterministicFactCheck,
  semantic: SemanticAudit,
): string[] {
  const issues = [...semantic.issues];
  if (deterministic.missing.numbers?.length) {
    issues.push(`Пропущены числа: ${deterministic.missing.numbers.join(', ')}`);
  }
  if (deterministic.added.numbers?.length) {
    issues.push(`Добавлены числа: ${deterministic.added.numbers.join(', ')}`);
  }
  if (deterministic.missing.dates?.length) {
    issues.push(`Пропущены даты: ${deterministic.missing.dates.join(', ')}`);
  }
  if (deterministic.added.dates?.length) {
    issues.push(`Добавлены даты: ${deterministic.added.dates.join(', ')}`);
  }
  if (deterministic.missing.urls?.length) {
    issues.push(`Пропущены ссылки: ${deterministic.missing.urls.join(', ')}`);
  }
  if (deterministic.added.urls?.length) {
    issues.push(`Добавлены ссылки: ${deterministic.added.urls.join(', ')}`);
  }
  if (deterministic.missing.quotes?.length) {
    issues.push(`Изменены цитаты: ${deterministic.missing.quotes.join(', ')}`);
  }
  if (deterministic.added.quotes?.length) {
    issues.push(`Добавлены цитаты: ${deterministic.added.quotes.join(', ')}`);
  }
  if (deterministic.missing.entities?.length) {
    issues.push(`Пропущены сущности: ${deterministic.missing.entities.join(', ')}`);
  }
  if (deterministic.added.entities?.length) {
    issues.push(`Добавлены сущности: ${deterministic.added.entities.join(', ')}`);
  }
  return [...new Set(issues)].slice(0, 30);
}

function neutralResult(
  database: AppDatabase,
  articleId: string,
  request: RewriteRequest,
  article: NonNullable<ReturnType<typeof findArticleById>>,
): RewriteResult {
  const validation = {
    deterministic: {
      passed: true,
      missing: {},
      added: {},
    },
    semantic: {
      passed: true,
      issues: [],
    },
    repairAttempted: false,
  } satisfies RewriteResult['validation'];
  const cached = saveRewrite(
    database,
    articleId,
    request,
    {
      rewrittenTitle: article.title,
      rewrittenSummary: article.summary,
    },
    {
      model: 'none',
      promptVersion: 'neutral-v1',
      sourceHash: article.sourceHash,
      validation,
    },
  );

  return {
    articleId,
    tone: request.tone,
    customStyle: request.customStyle,
    rewrittenTitle: cached.rewrittenTitle,
    rewrittenSummary: cached.rewrittenSummary,
    model: cached.model,
    promptVersion: cached.promptVersion,
    sourceHash: cached.sourceHash,
    validationStatus: 'passed',
    validation,
    cached: false,
  };
}

export function createRewriteService(
  database: AppDatabase,
  options: RewriteServiceOptions,
) {
  async function rewrite(
    articleId: string,
    request: RewriteRequest,
  ): Promise<RewriteResult> {
    const article = findArticleById(database, articleId);
    if (!article) throw new ArticleNotFoundError();
    const storedArticleId = article.id;

    if (request.tone === 'neutral') {
      const cached = findCachedRewrite(
        database,
        storedArticleId,
        request.tone,
        request.customStyle,
        article.sourceHash,
        'none',
        'neutral-v1',
      );
      if (cached) {
        return {
          articleId: storedArticleId,
          tone: request.tone,
          customStyle: request.customStyle,
          rewrittenTitle: cached.rewrittenTitle,
          rewrittenSummary: cached.rewrittenSummary,
          model: cached.model,
          promptVersion: cached.promptVersion,
          sourceHash: cached.sourceHash,
          validationStatus: 'passed',
          validation: cached.validation as RewriteResult['validation'],
          cached: true,
        };
      }
      return neutralResult(database, storedArticleId, request, article);
    }

    if (!options.configured || !options.model) {
      throw new RewriteConfigurationError(
        'OPENAI_API_KEY or OPENAI_MODEL is not configured',
      );
    }

    const cached = findCachedRewrite(
      database,
      storedArticleId,
      request.tone,
      request.customStyle,
      article.sourceHash,
      options.model,
      options.promptVersion || PROMPT_VERSION,
    );
    if (cached) {
      return {
        articleId: storedArticleId,
        tone: request.tone,
        customStyle: request.customStyle,
        rewrittenTitle: cached.rewrittenTitle,
        rewrittenSummary: cached.rewrittenSummary,
        model: cached.model,
        promptVersion: cached.promptVersion,
        sourceHash: cached.sourceHash,
        validationStatus: 'passed',
        validation: cached.validation as RewriteResult['validation'],
        cached: true,
      };
    }

    const facts = extractFactLedger(`${article.title}\n${article.summary}`);
    const input = {
      article,
      request,
      facts,
    };
    let draft = await options.client.generateRewrite(input);
    let deterministic = checkDeterministicFacts(
      `${article.title}\n${article.summary}`,
      `${draft.rewrittenTitle}\n${draft.rewrittenSummary}`,
    );
    let semantic = await options.client.auditRewrite({
      article,
      draft,
      facts,
    });
    let repairAttempted = false;

    if (!deterministic.passed || !semantic.passed) {
      repairAttempted = true;
      draft = await options.client.repairRewrite({
        ...input,
        draft,
        issues: issueList(deterministic, semantic),
      });
      deterministic = checkDeterministicFacts(
        `${article.title}\n${article.summary}`,
        `${draft.rewrittenTitle}\n${draft.rewrittenSummary}`,
      );
      semantic = await options.client.auditRewrite({
        article,
        draft,
        facts,
      });
    }

    if (!deterministic.passed || !semantic.passed) {
      throw new RewriteValidationError(deterministic, semantic);
    }

    const validation = {
      deterministic,
      semantic,
      repairAttempted,
    } satisfies RewriteResult['validation'];
    const saved = saveRewrite(
      database,
      storedArticleId,
      request,
      draft,
      {
        model: options.model,
        promptVersion: options.promptVersion || PROMPT_VERSION,
        sourceHash: article.sourceHash,
        validation,
      },
    );

    return {
      articleId: storedArticleId,
      tone: request.tone,
      customStyle: request.customStyle,
      rewrittenTitle: saved.rewrittenTitle,
      rewrittenSummary: saved.rewrittenSummary,
      model: saved.model,
      promptVersion: saved.promptVersion,
      sourceHash: saved.sourceHash,
      validationStatus: 'passed',
      validation,
      cached: false,
    };
  }

  return { rewrite };
}
