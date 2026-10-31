import { test } from 'node:test';
import assert from 'node:assert/strict';
import { auditGrounding, groundedComplete } from './grounding.ts';
import type { RepositoryContext } from './repository.ts';

const context: RepositoryContext = {
  fullName: 'example/project',
  packageJson: { scripts: { dev: 'wrangler dev', 'db:local': 'wrangler d1 migrations apply DB --local' }, dependencies: { mysql2: 'legacy' } },
  sources: [{ path: 'drizzle.config.ts', content: 'export default defineConfig({\n dialect: "sqlite",\n});', truncated: false }],
  evidenceNotes: [],
};

test('the reported SQLite/Postgres mix-up and invented scripts are detected', () => {
  const bad = '```ts\nimport { pgTable } from "drizzle-orm/pg-core";\n```\nRun `pnpm db:push`.';
  const issues = auditGrounding(bad, context);
  assert.equal(issues.length, 2);
  assert.match(issues.join(' '), /sqlite/);
  assert.match(issues.join(' '), /db:push/);
});

test('verified commands, SQLite schemas, and clearly described leftover dependencies are allowed', () => {
  const good = 'A legacy mysql2 dependency remains installed; deployment uses D1.\n```sh\npnpm install\npnpm db:local\n```\n```ts\nimport { sqliteTable } from "drizzle-orm/sqlite-core";\n```';
  assert.deepEqual(auditGrounding(good, context), []);
});

test('missing evidence never becomes an inferred database dialect or script inventory', () => {
  assert.deepEqual(auditGrounding('```ts\npgTable("example", {});\n```', { fullName: 'manual', sources: [], evidenceNotes: [] }), []);
});

test('a consistent draft costs one call; a contradictory draft gets at most one repair on the same route', async () => {
  let calls = 0;
  const route = { provider: 'openrouter' as const };
  const run = (async (options: unknown, _system: string, prompt: string, temperature: number) => {
    assert.equal(options, route);
    calls++;
    if (calls === 1) return { markdown: '```ts\npgTable("posts", {});\n```', provider: 'openrouter', model: 'free' };
    assert.match(prompt, /dialect "sqlite"/);
    assert.ok(temperature <= 0.3);
    return { markdown: '# Draft\nRun `pnpm db:local`.', provider: 'openrouter', model: 'free' };
  }) as any;
  const result = await groundedComplete(route, context, 'system', 'write', 0.85, run);
  assert.equal(calls, 2);
  assert.match(result.markdown, /db:local/);
  calls = 0;
  await groundedComplete(route, context, 'system', 'write', 0.85, (async () => { calls++; return result; }) as any);
  assert.equal(calls, 1);
});

test('repeated contradictions are rejected rather than returned as a polished lie', async () => {
  let calls = 0;
  await assert.rejects(groundedComplete({ provider: 'openrouter' }, context, 'system', 'write', 0.85,
    (async () => { calls++; return { markdown: 'Run `pnpm nonexistent-script`.', provider: 'openrouter', model: 'free' }; }) as any),
    (error: any) => error.status === 422 && /not saved/.test(error.message));
  assert.equal(calls, 2);
});
