import axios from 'axios';

export interface RepositorySource {
  path: string;
  content: string;
  truncated: boolean;
}
export interface RepositoryContext {
  fullName: string;
  description?: string;
  language?: string;
  topics?: string[];
  homepage?: string;
  revision?: string;
  sources: RepositorySource[];
  evidenceNotes: string[];
  packageJson?: Record<string, any>;
}

const cache = new Map<string, { expires: number; context: RepositoryContext }>();

export function selectEvidencePaths(paths: string[]): string[] {
  const selected: string[] = [];
  const add = (path: string | undefined) => { if (path && !selected.includes(path)) selected.push(path); };
  const first = (names: string[]) => add(names.find(name => paths.includes(name)));
  first(['package.json', 'pyproject.toml', 'Cargo.toml', 'go.mod']);
  add(paths.find(path => /^readme(?:\.md|\.rst|\.txt)?$/i.test(path)));
  add(paths.find(path => /^(?:license|licence|copying)(?:\.md|\.txt)?$/i.test(path)));
  first(['wrangler.jsonc', 'wrangler.json', 'wrangler.toml']);
  first(['drizzle.config.ts', 'drizzle.config.js', 'drizzle.config.mjs']);
  first(['server/worker.ts', 'src/worker.ts', 'src/index.ts', 'server/index.ts', 'server.ts', 'app.py', 'main.py', 'main.go', 'src/main.rs']);
  first(['drizzle/schema.ts', 'src/db/schema.ts', 'server/db/schema.ts', 'prisma/schema.prisma']);
  first(['server/_core/oauth.ts', 'server/auth.ts', 'src/auth.ts', 'src/auth/index.ts']);
  first(['server/db.ts', 'src/db/index.ts', 'server/database.ts']);
  first(['server/routers.ts', 'src/server/routers.ts', 'server/routes.ts', 'src/routes.ts']);
  first(['.env.example', '.env.sample']);
  first(['Dockerfile', 'render.yaml', 'netlify.toml', 'vercel.json', 'compose.yaml']);
  return selected.slice(0, 12);
}

// Read a bounded snapshot through GitHub's API, never arbitrary download_url hosts.
export async function fetchRepoInfo(owner: string, repo: string, dependencies: {
  get?: typeof axios.get;
  token?: string;
} = {}): Promise<RepositoryContext> {
  const key = `${owner}/${repo}`;
  const get = dependencies.get || axios.get;
  if (!dependencies.get) {
    const cached = cache.get(key);
    if (cached && cached.expires > Date.now()) return cached.context;
  }
  const token = dependencies.token ?? process.env.GITHUB_TOKEN;
  const options = {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    timeout: 15000,
    maxRedirects: 0,
    maxContentLength: 2_000_000,
  };
  const base = `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`;
  const notes: string[] = [];
  try {
    const { data: metadata } = await get(base, options);
    const { data: commit } = await get(`${base}/commits/${encodeURIComponent(metadata.default_branch || 'main')}`, options);
    const { data: tree } = await get(`${base}/git/trees/${commit.commit.tree.sha}?recursive=1`, options);
    const entries = (tree.tree || []).filter((entry: any) => entry.type === 'blob');
    if (tree.truncated) notes.push('GitHub returned a partial file inventory. Files outside it were not inspected.');
    const selected = selectEvidencePaths(entries.map((entry: any) => entry.path));
    const loaded = await Promise.all(selected.map(async path => {
      const entry = entries.find((candidate: any) => candidate.path === path);
      if (entry.size > 150000) { notes.push(`${path}: omitted because the file exceeds the evidence size limit.`); return null; }
      try {
        const { data: blob } = await get(`${base}/git/blobs/${entry.sha}`, options);
        if (blob.encoding !== 'base64') throw new Error('Unsupported file encoding');
        let content = Buffer.from(blob.content.replace(/\s/g, ''), 'base64').toString('utf8');
        if (/^\.env\./.test(path)) content = content.replace(/^([A-Za-z_][A-Za-z0-9_]*\s*=).*$/gm, '$1[configure privately]');
        return { path, content, truncated: false };
      } catch { notes.push(`${path}: could not be read; its contents are unknown.`); return null; }
    }));
    let remaining = 36000;
    let packageJson: Record<string, any> | undefined;
    const sources: RepositorySource[] = [];
    for (const source of loaded) {
      if (!source) continue;
      if (source.path === 'package.json') {
        try { packageJson = JSON.parse(source.content); } catch { notes.push('package.json is not valid JSON; script names could not be verified.'); }
      }
      const limit = Math.min(source.path === 'package.json' ? 12000 : 5000, remaining);
      if (limit <= 0) { notes.push(`${source.path}: omitted because the total evidence budget was reached.`); continue; }
      sources.push({ ...source, content: source.content.slice(0, limit), truncated: source.content.length > limit });
      remaining -= Math.min(source.content.length, limit);
    }
    const context: RepositoryContext = {
      fullName: metadata.full_name,
      description: metadata.description,
      language: metadata.language,
      topics: metadata.topics,
      homepage: metadata.homepage,
      revision: commit.sha,
      packageJson,
      sources,
      evidenceNotes: notes,
    };
    if (!dependencies.get) {
      if (cache.size >= 20) cache.delete(cache.keys().next().value!);
      cache.set(key, { expires: Date.now() + 5 * 60_000, context });
    }
    return context;
  } catch (error) {
    const status = axios.isAxiosError(error) ? error.response?.status : undefined;
    if (status === 404) throw new Error('Repository not found or is private.');
    if (status === 403 || status === 429) throw new Error('GitHub access or rate limit prevented reading repository evidence. Configure GITHUB_TOKEN or try later.');
    throw new Error('Failed to read repository evidence from GitHub.');
  }
}
