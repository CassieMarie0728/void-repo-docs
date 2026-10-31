import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import { DocumentType, Tone, Length, TargetPlatform } from '../src/types.ts';

test('HTTP generation, refinement, authentication and validation', async () => {
  process.env.NODE_ENV = 'test';
  process.env.VOID_API_TOKEN = 'test-access';
  process.env.AI_MAX_TOKENS = '16384';
  const requests: any[] = [];
  const model = createServer(async (req, res) => {
    let body = '';
    for await (const part of req) body += part;
    requests.push({ url: req.url, ...JSON.parse(body) });
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ choices: [{ message: { content: '# Draft\n\n[Company Name]\n\nDisclaimer: Review before use.' }, finish_reason: 'stop' }] }));
  });
  await new Promise<void>(resolve => model.listen(0, '127.0.0.1', resolve));
  process.env.AI_BASE_URL = `http://127.0.0.1:${(model.address() as AddressInfo).port}/v1`;
  process.env.AI_MODEL = 'test-model';
  const { app } = await import('../server.ts');
  const backend = app.listen(0, '127.0.0.1');
  await new Promise<void>(resolve => backend.once('listening', resolve));
  const base = `http://127.0.0.1:${(backend.address() as AddressInfo).port}`;
  const post = (path: string, body: unknown) => fetch(base + path, {
    method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer test-access' }, body: JSON.stringify(body),
  });
  try {
    assert.equal((await fetch(base + '/api/health')).status, 200);
    assert.equal((await fetch(base + '/api/ai/status')).status, 401);
    const status = await fetch(base + '/api/ai/status', { headers: { Authorization: 'Bearer test-access', Origin: 'https://localhost' } });
    assert.equal(status.headers.get('access-control-allow-origin'), 'https://localhost');
    const configuration = await status.json();
    assert.equal(configuration.app, 'VOID Repo Docs');
    assert.equal(configuration.model, 'openrouter/free');
    assert.equal(configuration.primary, 'openrouter');
    assert.equal(configuration.outputTokenLimit, 16384);
    assert.equal((await post('/api/refine', { markdown: 123, instruction: 'edit' })).status, 400);
    assert.equal((await post('/api/refine', { markdown: 'draft', instruction: 'edit', provider: 'gemini' })).status, 400);
    const input = { provider: 'selfhosted', targetPlatform: TargetPlatform.WebApp, appName: 'Test App', docType: DocumentType.Readme, tone: Tone.Professional, length: Length.Short, versionCount: 2 };
    assert.equal((await post('/api/generate', { ...input, targetPlatform: TargetPlatform.GithubRepo, repoUrl: 'https://notgithub.com/example/project' })).status, 400);
    assert.equal((await post('/api/refine', { markdown: 'draft', instruction: 'edit', repoUrl: 'https://notgithub.com/example/project' })).status, 400);
    assert.equal((await post('/api/generate', { ...input, versionCount: 1.5 })).status, 400);
    const generated = await post('/api/generate', input);
    assert.equal(generated.status, 200);
    const drafts = await generated.json();
    assert.equal(drafts.markdowns.length, 2);
    assert.match(drafts.markdown, /SELFHOSTED \(test-model\)/);
    assert.match(drafts.markdown, /\[Company Name\]/);
    const refined = await post('/api/refine', { markdown: drafts.markdown, instruction: 'Preserve placeholders', provider: 'selfhosted' });
    assert.equal(refined.status, 200);
    assert.equal((await refined.json()).provider, 'selfhosted');
    assert.equal(requests.length, 3);
    assert.ok(requests.every(request => request.url === '/v1/chat/completions' && request.model === 'test-model'));
    assert.equal((await fetch(base + '/api/missing', { headers: { Authorization: 'Bearer test-access' } })).status, 404);
  } finally {
    await Promise.all([
      new Promise<void>((resolve, reject) => backend.close(error => error ? reject(error) : resolve())),
      new Promise<void>((resolve, reject) => model.close(error => error ? reject(error) : resolve())),
    ]);
  }
});
