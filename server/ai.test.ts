import { test } from 'node:test';
import assert from 'node:assert/strict';
import { AIError, complete, enginesFor, routingSchema } from './ai.ts';

test('Auto is local-only unless cloud fallback is explicitly enabled', () => {
  const env = { MISTRAL_API_KEY: 'private-key' };
  assert.deepEqual(enginesFor({ provider: 'auto' }, env).map(e => e.provider), ['selfhosted']);
  assert.deepEqual(enginesFor({ provider: 'auto', allowCloudFallback: true }, env).map(e => e.provider), ['selfhosted', 'mistral']);
});

test('explicit providers do not cross-route, and missing keys are configuration errors', () => {
  assert.deepEqual(enginesFor({ provider: 'groq', allowCloudFallback: true }, { GROQ_API_KEY: 'key' }).map(e => e.provider), ['groq']);
  assert.throws(() => enginesFor({ provider: 'mistral' }, {}), (e: AIError) => e.status === 400);
});

test('local completion uses admin endpoint/model and omits Authorization without a key', async () => {
  const calls: any[] = [];
  const result = await complete({ provider: "selfhosted" }, 'system', 'draft', 0.3, {
    env: { AI_BASE_URL: 'http://localhost:1234/v1/', AI_MODEL: 'my-model' },
    post: (async (...args: any[]) => {
      calls.push(args);
      return { data: { choices: [{ message: { content: '# My draft' }, finish_reason: 'stop' }] } };
    }) as any,
  });
  assert.equal(result.provider, 'selfhosted');
  assert.equal(result.model, 'my-model');
  assert.equal(calls[0][0], 'http://localhost:1234/v1/chat/completions');
  assert.equal(calls[0][1].messages[1].content, 'draft');
  assert.equal(calls[0][2].headers.Authorization, undefined);
  assert.equal(calls[0][2].maxRedirects, 0);
  assert.equal(calls[0][1].reasoning, undefined);
});

test('a local failure never contacts cloud with default privacy settings', async () => {
  let count = 0;
  await assert.rejects(complete({ provider: "selfhosted" }, 'system', 'draft', 0.5, {
    env: { GROQ_API_KEY: 'key' },
    post: (async () => { count++; throw new Error('unreachable'); }) as any,
  }), /Cloud fallback is off/);
  assert.equal(count, 1);
});

test('opted-in fallback recovers from local and first cloud failures in order', async () => {
  const calls: string[] = [];
  const result = await complete({ provider: "auto", allowCloudFallback: true }, 'system', 'draft', 0.5, {
    env: { MISTRAL_API_KEY: 'one', GROQ_API_KEY: 'two' },
    post: (async (url: string) => {
      calls.push(url);
      if (calls.length < 3) throw new Error('unavailable');
      return { data: { choices: [{ message: { content: '# Recovered' } }] } };
    }) as any,
  });
  assert.equal(result.provider, 'groq');
  assert.match(calls[0], /127.0.0.1/);
  assert.match(calls[1], /mistral/);
  assert.match(calls[2], /groq/);
});

test('empty and truncated responses fail rather than returning damaged legal documents', async () => {
  for (const choice of [{ message: { content: '' } }, { message: { content: '# Cut off' }, finish_reason: 'length' }]) {
    await assert.rejects(complete({ provider: "selfhosted" }, 'system', 'draft', 0.5, {
      env: {}, post: (async () => ({ data: { choices: [choice] } })) as any,
    }), AIError);
  }
});

test('vendor errors are sanitized and quota status is retained', async () => {
  await assert.rejects(complete({ provider: 'groq' }, 'system', 'private draft', 0.5, {
    env: { GROQ_API_KEY: 'secret' },
    post: (async () => { throw { isAxiosError: true, response: { status: 429 }, message: 'secret private draft' }; }) as any,
  }), (e: AIError) => e.status === 429 && !e.message.includes('secret'));
});

test('request validation rejects removed providers and non-boolean cloud consent', () => {
  assert.equal(routingSchema.safeParse({ provider: 'gemini' }).success, false);
  assert.equal(routingSchema.safeParse({ allowCloudFallback: 'true' }).success, false);
  assert.equal(routingSchema.parse({}).allowCloudFallback, false);
  assert.equal(routingSchema.parse({}).provider, 'openrouter');
});

test('default requests go straight to OpenRouter Free without local or paid-provider attempts', async () => {
  const calls: any[] = [];
  const result = await complete({}, 'system', 'draft', 0.5, {
    env: { OPENROUTER_API_KEY: 'free-key', GROQ_API_KEY: 'other-key', MISTRAL_API_KEY: 'another-key' },
    post: (async (...args: any[]) => {
      calls.push(args);
      return { data: { model: 'actual-free-model', choices: [{ message: { content: '# Free draft' } }] } };
    }) as any,
  });
  assert.equal(calls.length, 1);
  assert.equal(calls[0][0], 'https://openrouter.ai/api/v1/chat/completions');
  assert.equal(calls[0][1].model, 'openrouter/free');
  assert.equal(calls[0][1].max_tokens, 16384);
  assert.deepEqual(calls[0][1].reasoning, { effort: 'low' });
  assert.equal(result.model, 'actual-free-model');
  assert.equal(result.provider, 'openrouter');
});

test('configured output allowance is honored and reasoning-only truncation has an actionable error', async () => {
  await assert.rejects(complete({ provider: 'openrouter' }, 'system', 'draft', 0.5, {
    env: { OPENROUTER_API_KEY: 'free-key', AI_MAX_TOKENS: '20000' },
    post: (async (_url: string, body: any) => {
      assert.equal(body.max_tokens, 20000);
      return { data: { choices: [{ message: { content: '' }, finish_reason: 'length' }] } };
    }) as any,
  }), /output limit before finishing/);
});

test('OpenRouter failure does not switch to a paid provider even when fallback is enabled', async () => {
  let calls = 0;
  await assert.rejects(complete({ provider: 'openrouter', allowCloudFallback: true }, 'system', 'draft', 0.5, {
    env: { OPENROUTER_API_KEY: 'free-key', GROQ_API_KEY: 'other-key' },
    post: (async () => { calls++; throw new Error('busy'); }) as any,
  }), /No paid fallback was attempted/);
  assert.equal(calls, 1);
});
