import { config } from '../config.ts';
import {
  auditSystemPrompt,
  auditUserPrompt,
  repairSystemPrompt,
  repairUserPrompt,
  rewriteSystemPrompt,
  rewriteUserPrompt,
} from './prompts.ts';
import type {
  GeneratedRewrite,
  LlmClient,
  RewriteAuditInput,
  RewritePromptInput,
  RewriteRepairInput,
  SemanticAudit,
} from './types.ts';

interface OpenAIClientOptions {
  apiKey: string;
  baseUrl: string;
  model: string;
  timeoutMs?: number;
}

type JsonRecord = Record<string, unknown>;

function parseStrictJson(content: string): JsonRecord {
  const trimmed = content.trim();
  if (!trimmed || trimmed.startsWith('```') || !trimmed.startsWith('{')) {
    throw new Error('LLM returned non-JSON content');
  }

  try {
    const parsed: unknown = JSON.parse(trimmed);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      throw new Error('LLM JSON must be an object');
    }
    return parsed as JsonRecord;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'invalid JSON';
    throw new Error(`LLM returned invalid JSON: ${message}`);
  }
}

function requiredString(
  record: JsonRecord,
  key: string,
  maxLength: number,
): string {
  const value = record[key];
  if (typeof value !== 'string' || !value.trim() || value.length > maxLength) {
    throw new Error(`LLM JSON field "${key}" is invalid`);
  }
  return value.trim();
}

function parseGeneratedRewrite(record: JsonRecord): GeneratedRewrite {
  return {
    rewrittenTitle: requiredString(record, 'rewrittenTitle', 500),
    rewrittenSummary: requiredString(record, 'rewrittenSummary', 8_000),
  };
}

function parseSemanticAudit(record: JsonRecord): SemanticAudit {
  if (typeof record.passed !== 'boolean') {
    throw new Error('LLM audit field "passed" is invalid');
  }

  if (
    !Array.isArray(record.issues) ||
    record.issues.some((issue) => typeof issue !== 'string')
  ) {
    throw new Error('LLM audit field "issues" is invalid');
  }

  return {
    passed: record.passed,
    issues: record.issues
      .map((issue) => issue.trim())
      .filter(Boolean)
      .slice(0, 20),
  };
}

export function createOpenAIClient(
  options: OpenAIClientOptions = {
    apiKey: config.openaiApiKey,
    baseUrl: config.openaiBaseUrl,
    model: config.openaiModel,
    timeoutMs: config.openaiTimeoutMs,
  },
): LlmClient {
  let clientPromise: Promise<any> | null = null;

  async function getClient(): Promise<any> {
    if (!options.apiKey) {
      throw new Error('OPENAI_API_KEY is not configured');
    }

    if (!options.model) {
      throw new Error('OPENAI_MODEL is not configured');
    }

    if (!clientPromise) {
      clientPromise = import('openai').then(({ default: OpenAI }) => {
        return new OpenAI({
          apiKey: options.apiKey,
          baseURL: options.baseUrl,
          timeout: options.timeoutMs ?? config.openaiTimeoutMs,
          maxRetries: 0,
        });
      });
    }

    return clientPromise;
  }

  async function requestJson(
    system: string,
    user: string,
    temperature: number,
  ): Promise<JsonRecord> {
    const client = await getClient();
    try {
      const completion = await client.chat.completions.create({
        model: options.model,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user },
        ],
        response_format: { type: 'json_object' },
        temperature,
      });
      const content = completion.choices?.[0]?.message?.content;
      if (typeof content !== 'string') {
        throw new Error('LLM returned an empty response');
      }
      return parseStrictJson(content);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'unknown upstream error';
      throw new Error(`OpenAI-compatible LLM request failed: ${message}`);
    }
  }

  return {
    async generateRewrite(input: RewritePromptInput) {
      return parseGeneratedRewrite(
        await requestJson(
          rewriteSystemPrompt(),
          rewriteUserPrompt(input),
          0.75,
        ),
      );
    },
    async auditRewrite(input: RewriteAuditInput) {
      return parseSemanticAudit(
        await requestJson(
          auditSystemPrompt(),
          auditUserPrompt(input),
          0.1,
        ),
      );
    },
    async repairRewrite(input: RewriteRepairInput) {
      return parseGeneratedRewrite(
        await requestJson(
          repairSystemPrompt(),
          repairUserPrompt(input),
          0.65,
        ),
      );
    },
  };
}
