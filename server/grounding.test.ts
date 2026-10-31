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
    (async () => { calls++; return { markdown: 'Run `pnpm run nonexistent-script`.', provider: 'openrouter', model: 'free' }; }) as any),
    (error: any) => error.status === 422 && /not saved/.test(error.message));
  assert.equal(calls, 2);
});

test('built-ins and binary execution are not mistaken for missing scripts', () => {
  assert.deepEqual(auditGrounding('Use `pnpm outdated`, `yarn workspace api build`, `pnpm tsc`, `yarn run eslint`, or `bun run server.ts`.', context), []);
  assert.equal(auditGrounding('Run `pnpm run outdated` or `npm run install`.', context).length, 2);
});

test('reported self-certification is rejected while source citations and limitations survive', () => {
  for (const draft of [
    '*(All OAuth procedures grounded in `server/_core/oauth.ts` and `server/routers.ts` evidence. No invented scopes, endpoints, or token formats beyond what is declared.)*',
    'All claims grounded in package.json evidence.',
    'No hallucinated minor versions.',
    "I won't hallucinate missing columns.",
  ]) assert.equal(auditGrounding(draft, context).length, 1, draft);
  assert.deepEqual(auditGrounding('See [OAuth](server/_core/oauth.ts). The supplied schema excerpt ends here.\n<!-- No invented endpoints -->\n```text\nNo invented endpoints\n```', context), []);
});

test('ordinary legal claims clauses are not model self-certification', () => {
  assert.deepEqual(auditGrounding('All claims derived from this Agreement shall be subject to binding arbitration. All claims grounded in this Agreement must be filed within the applicable limitation period.', context), []);
});

test('self-commentary gets one repair and repeated self-certification fails closed', async () => {
  let calls = 0;
  const route = { provider: 'openrouter' as const };
  const run = (async (options: unknown, _system: string, prompt: string) => {
    assert.equal(options, route);
    calls++;
    if (calls === 1) return { markdown: 'All claims grounded in evidence.', provider: 'openrouter', model: 'free' };
    assert.match(prompt, /self-certification/);
    return { markdown: '# Project\nSee `server/worker.ts` for routing.', provider: 'openrouter', model: 'free' };
  }) as any;
  assert.match((await groundedComplete(route, context, 'system', 'write', 0.85, run)).markdown, /# Project/);
  assert.equal(calls, 2);
  await assert.rejects(groundedComplete(route, context, 'system', 'write', 0.85,
    (async () => ({ markdown: 'No invented endpoints.', provider: 'openrouter', model: 'free' })) as any),
    (error: any) => error.status === 422 && /not saved/.test(error.message));
});
