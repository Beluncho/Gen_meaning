import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { DatabaseSync } from 'node:sqlite';
import { upsertArticle } from '../../server/db/article-repository.ts';
import { checkDeterministicFacts, extractFactLedger } from '../../server/llm/facts.ts';
import { createRewriteService } from '../../server/llm/service.ts';
import type {
  GeneratedRewrite,
  LlmClient,
  RewriteAuditInput,
  RewritePromptInput,
  RewriteRepairInput,
} from '../../server/llm/types.ts';
import type { NormalizedArticle } from '../../server/shared/news.ts';

const migrationSql = readFileSync(
  new URL('../../server/db/migrations/001_initial.sql', import.meta.url),
  'utf8',
);

function createDatabase() {
  const database = new DatabaseSync(':memory:');
  database.exec(migrationSql);
  return database;
}

function createArticle(): NormalizedArticle {
  return {
    source: 'habr-ai',
    sourceGuid: 'https://habr.com/ru/news/5000001/',
    sourceUrl: 'https://habr.com/ru/news/5000001/',
    title: 'OpenAI представила режим 18 августа 2026 года',
    summary:
      'Компания сообщила о росте продуктивности на 12% и оставила ссылку https://example.com/report.',
    author: 'editor',
    publishedAt: '2026-08-18T10:00:00.000Z',
    categories: ['искусственный интеллект'],
    externalLinks: ['https://example.com/report'],
    rawPayload: {},
    sourceHash: 'llm-source-hash',
  };
}

class FakeClient implements LlmClient {
  generateCalls = 0;
  auditCalls = 0;
  repairCalls = 0;
  draft: GeneratedRewrite;
  repairedDraft: GeneratedRewrite;
  auditResults: boolean[];

  constructor(
    draft: GeneratedRewrite,
    repairedDraft = draft,
    auditResults: boolean[] = [true],
  ) {
    this.draft = draft;
    this.repairedDraft = repairedDraft;
    this.auditResults = auditResults;
  }

  async generateRewrite(_input: RewritePromptInput): Promise<GeneratedRewrite> {
    this.generateCalls += 1;
    return this.draft;
  }

  async auditRewrite(_input: RewriteAuditInput) {
    this.auditCalls += 1;
    const auditPassed =
      this.auditResults[Math.min(this.auditCalls - 1, this.auditResults.length - 1)];
    return {
      passed: auditPassed,
      issues: auditPassed ? [] : ['Семантическое несоответствие'],
    };
  }

  async repairRewrite(_input: RewriteRepairInput): Promise<GeneratedRewrite> {
    this.repairCalls += 1;
    return this.repairedDraft;
  }
}

const validDraft: GeneratedRewrite = {
  rewrittenTitle: 'OpenAI представила режим 18 августа 2026 года',
  rewrittenSummary:
    'Компания сообщила о росте продуктивности на 12% и оставила ссылку https://example.com/report.',
};

test('fact ledger detects missing and added protected facts', () => {
  const original =
    'OpenAI сообщила 18 августа 2026 года о росте на 12%. https://example.com/report';
  const rewritten =
    'OpenAI сообщила 18 августа 2026 года о росте на 15%. https://example.com/new';
  const result = checkDeterministicFacts(original, rewritten);

  assert.equal(result.passed, false);
  assert.deepEqual(result.missing.numbers, ['12%']);
  assert.deepEqual(result.added.numbers, ['15%']);
  assert.deepEqual(result.missing.urls, ['https://example.com/report']);
  assert.deepEqual(result.added.urls, ['https://example.com/new']);
  assert.deepEqual(extractFactLedger('«кризис доверия»').quotes, [
    '«кризис доверия»',
  ]);
});

test('deterministic fact check leaves entity equivalence to semantic audit', () => {
  const result = checkDeterministicFacts(
    'OpenAI сообщила о росте продуктивности.',
    'Американская компания OpenAI рассказала о росте продуктивности.',
  );

  assert.equal(result.passed, true);
  assert.deepEqual(result.missing, {});
  assert.deepEqual(result.added, {});
});

test('neutral mode does not call the LLM and is cached', async () => {
  const database = createDatabase();
  const article = createArticle();
  upsertArticle(database, article, '2026-08-18T12:00:00.000Z');
  const client = new FakeClient(validDraft);
  const service = createRewriteService(database, {
    client,
    model: 'test-model',
    configured: true,
  });

  const first = await service.rewrite(article.sourceGuid, {
    tone: 'neutral',
    customStyle: null,
  });
  const second = await service.rewrite(article.sourceGuid, {
    tone: 'neutral',
    customStyle: null,
  });

  assert.equal(first.rewrittenTitle, article.title);
  assert.equal(first.rewrittenSummary, article.summary);
  assert.equal(first.cached, false);
  assert.equal(second.cached, true);
  assert.equal(client.generateCalls, 0);
  assert.equal(client.auditCalls, 0);

  database.close();
});

test('validated generated rewrite is cached and reused', async () => {
  const database = createDatabase();
  const article = createArticle();
  upsertArticle(database, article, '2026-08-18T12:00:00.000Z');
  const client = new FakeClient(validDraft);
  const service = createRewriteService(database, {
    client,
    model: 'test-model',
    configured: true,
  });

  const first = await service.rewrite(article.sourceGuid, {
    tone: 'joyful',
    customStyle: null,
  });
  const second = await service.rewrite(article.sourceGuid, {
    tone: 'joyful',
    customStyle: null,
  });

  assert.equal(first.validationStatus, 'passed');
  assert.equal(first.cached, false);
  assert.equal(second.cached, true);
  assert.equal(client.generateCalls, 1);
  assert.equal(client.auditCalls, 1);
  assert.equal(client.repairCalls, 0);

  database.close();
});

test('failed deterministic or semantic validation gets one repair attempt', async () => {
  const database = createDatabase();
  const article = createArticle();
  upsertArticle(database, article, '2026-08-18T12:00:00.000Z');
  const invalidDraft: GeneratedRewrite = {
    rewrittenTitle: 'OpenAI представила режим',
    rewrittenSummary: 'Компания сообщила о росте продуктивности.',
  };
  const client = new FakeClient(invalidDraft, validDraft, [false, true]);
  const service = createRewriteService(database, {
    client,
    model: 'test-model',
    configured: true,
  });

  const result = await service.rewrite(article.sourceGuid, {
    tone: 'ironic',
    customStyle: null,
  });

  assert.equal(result.validationStatus, 'passed');
  assert.equal(result.validation.repairAttempted, true);
  assert.equal(client.generateCalls, 1);
  assert.equal(client.repairCalls, 1);
  assert.equal(client.auditCalls, 2);

  database.close();
});

test('missing model configuration stops generation before an LLM call', async () => {
  const database = createDatabase();
  const article = createArticle();
  upsertArticle(database, article, '2026-08-18T12:00:00.000Z');
  const client = new FakeClient(validDraft);
  const service = createRewriteService(database, {
    client,
    model: '',
    configured: false,
  });

  await assert.rejects(
    service.rewrite(article.sourceGuid, {
      tone: 'sad',
      customStyle: null,
    }),
    /OPENAI_API_KEY or OPENAI_MODEL is not configured/,
  );
  assert.equal(client.generateCalls, 0);

  database.close();
});
