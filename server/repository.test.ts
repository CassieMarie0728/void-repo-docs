import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fetchRepoInfo, selectEvidencePaths } from './repository.ts';

test('a repo snapshot reads actual deployment/schema/auth evidence, with timeouts and redacted env examples', async () => {
  const files: Record<string, string> = {
    'package.json': JSON.stringify({ scripts: { dev: 'vite build && wrangler dev', 'db:local': 'wrangler d1 migrations apply DB --local' }, dependencies: { mysql2: 'legacy' }, packageManager: 'pnpm@10.4.1' }),
    'README.md': '# Example project',
    'wrangler.jsonc': '{"main":"server/worker.ts","d1_databases":[{"binding":"DB"}]}',
    'drizzle.config.ts': 'export default defineConfig({\n dialect: "sqlite",\n schema: "./drizzle/schema.ts"\n});',
    'server/worker.ts': 'export default { fetch(request, env) { return env.DB.prepare("SELECT 1"); } };',
    'drizzle/schema.ts': 'import { sqliteTable } from "drizzle-orm/sqlite-core";',
    'server/_core/oauth.ts': 'const authUrl = "https://github.com/login/oauth/authorize";',
    '.env.example': 'JWT_SECRET=do-not-send-this-value\n export API_TOKEN=exported-private-token\n  INDENTED_SECRET=indented-private-token\nPRIVATE_KEY="first-secret-line\nSENSITIVEBASE64=\nlast-secret-line"\nPUBLIC_URL=https://example.test',
  };
  const paths = Object.keys(files);
  const calls: string[] = [];
  const get = (async (url: string, options: any) => {
    calls.push(url);
    assert.equal(options.timeout, 15000);
    assert.equal(options.maxRedirects, 0);
    if (url.endsWith('/commits/main')) return { data: { sha: 'commit-snapshot', commit: { tree: { sha: 'tree-snapshot' } } } };
    if (url.includes('/git/trees/')) return { data: { tree: paths.map((path, index) => ({ path, type: 'blob', sha: `blob-${index}`, size: files[path].length })) } };
    if (url.includes('/git/blobs/')) {
      const index = Number(url.split('blob-')[1]);
      return { data: { encoding: 'base64', content: Buffer.from(files[paths[index]]).toString('base64') } };
    }
    return { data: { full_name: 'example/project', default_branch: 'main', language: 'TypeScript' } };
  }) as any;
  const context = await fetchRepoInfo('example', 'project', { get });
  assert.equal(context.revision, 'commit-snapshot');
  assert.ok(context.sources.find(source => source.path === 'wrangler.jsonc')?.content.includes('d1_databases'));
  assert.ok(context.sources.find(source => source.path === 'drizzle.config.ts')?.content.includes('sqlite'));
  assert.ok(context.sources.find(source => source.path.endsWith('oauth.ts'))?.content.includes('github.com/login'));
  assert.equal(context.packageJson?.dependencies.mysql2, 'legacy');
  assert.ok(!JSON.stringify(context.sources).includes('do-not-send-this-value'));
  const environment = context.sources.find(source => source.path === '.env.example')!.content;
  assert.match(environment, /API_TOKEN=\[configure privately\]/);
  assert.match(environment, /INDENTED_SECRET=\[configure privately\]/);
  assert.match(environment, /PRIVATE_KEY=\[configure privately\]/);
  assert.ok(!environment.includes('exported-private-token'));
  assert.ok(!environment.includes('indented-private-token'));
  assert.ok(!environment.includes('secret-line'));
  assert.ok(!environment.includes('SENSITIVEBASE64'));
  assert.ok(calls.every(url => url.startsWith('https://api.github.com/repos/example/project')));
  assert.ok(context.sources.reduce((size, source) => size + source.content.length, 0) <= 36000);
});

test('only bounded relevant files are selected; real secret files and dependency trees are excluded', () => {
  const result = selectEvidencePaths(['package.json', 'README.md', 'wrangler.toml', 'drizzle.config.ts', 'server/worker.ts', '.env', '.env.production', 'secret.pem', 'node_modules/secret.ts', '.env.example']);
  assert.ok(result.includes('wrangler.toml'));
  assert.ok(result.includes('drizzle.config.ts'));
  assert.ok(result.includes('.env.example'));
  assert.ok(!result.includes('.env'));
  assert.ok(!result.includes('secret.pem'));
  assert.ok(!result.some(path => path.startsWith('node_modules/')));
  assert.ok(result.length <= 12);
});

test('partial inventories and unreadable files are marked unknown rather than invented', async () => {
  const get = (async (url: string) => {
    if (url.includes('/commits/')) return { data: { sha: 'snapshot', commit: { tree: { sha: 'tree' } } } };
    if (url.includes('/git/trees/')) return { data: { truncated: true, tree: [{ type: 'blob', path: 'package.json', sha: 'broken', size: 100 }] } };
    if (url.includes('/git/blobs/')) throw new Error('unavailable');
    return { data: { full_name: 'example/project', default_branch: 'main' } };
  }) as any;
  const context = await fetchRepoInfo('example', 'project', { get });
  assert.equal(context.packageJson, undefined);
  assert.deepEqual(context.sources, []);
  assert.match(context.evidenceNotes.join(' '), /partial file inventory/);
  assert.match(context.evidenceNotes.join(' '), /could not be read/);
});
