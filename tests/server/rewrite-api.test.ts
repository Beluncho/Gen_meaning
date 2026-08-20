import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createRewriteHandlers,
  createRewriteRateLimiter,
} from '../../server/routes/rewrite-handlers.ts';
import type {
  RewriteRequestLike,
  RewriteResponseLike,
} from '../../server/routes/rewrite-handlers.ts';

class TestResponse implements RewriteResponseLike {
  statusCode = 200;
  body: unknown;
  headers = new Map<string, string>();

  status(statusCode: number): RewriteResponseLike {
    this.statusCode = statusCode;
    return this;
  }

  json(body: unknown): RewriteResponseLike {
    this.body = body;
    return this;
  }

  setHeader(name: string, value: string): RewriteResponseLike {
    this.headers.set(name, value);
    return this;
  }
}

function request(
  body: unknown,
  id = 'habr-ai%3Ahttps%3A%2F%2Fhabr.com%2Fru%2Fnews%2F1%2F',
): RewriteRequestLike {
  return {
    body,
    params: { id },
    ip: '127.0.0.1',
  };
}

test('rewrite handler validates tone and custom style', async () => {
  const service = {
    rewrite: async (_id: string, payload: unknown) => payload,
  };
  const handlers = createRewriteHandlers(service, createRewriteRateLimiter());

  const invalid = new TestResponse();
  await handlers.rewrite(request({ tone: 'unknown' }), invalid);
  assert.equal(invalid.statusCode, 400);

  const missingCustomStyle = new TestResponse();
  await handlers.rewrite(request({ tone: 'custom' }), missingCustomStyle);
  assert.equal(missingCustomStyle.statusCode, 400);

  const valid = new TestResponse();
  await handlers.rewrite(
    request({ tone: 'custom', customStyle: 'Сдержанно и коротко' }),
    valid,
  );
  assert.equal(valid.statusCode, 200);
  assert.deepEqual(valid.body, {
    result: {
      tone: 'custom',
      customStyle: 'Сдержанно и коротко',
    },
  });
});

test('rewrite handler applies rate limiting and Retry-After', async () => {
  const service = {
    rewrite: async () => ({ ok: true }),
  };
  const handlers = createRewriteHandlers(
    service,
    createRewriteRateLimiter(1, 60_000),
  );

  const first = new TestResponse();
  await handlers.rewrite(request({ tone: 'joyful' }), first);
  assert.equal(first.statusCode, 200);

  const second = new TestResponse();
  await handlers.rewrite(request({ tone: 'joyful' }), second);
  assert.equal(second.statusCode, 429);
  assert.equal(second.headers.get('Retry-After'), '60');
});
