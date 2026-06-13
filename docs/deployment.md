# Deployment and Operations

The production artifact contains a static Vite client and a bundled Express server. It needs a
Node.js host capable of listening on port `3000`, outbound HTTPS access, and environment secrets.

## Build

```powershell
npm ci
npm run lint
npm run build
```

The build command performs:

```text
vite build
esbuild server.ts --bundle --platform=node --format=cjs --packages=external
```

Output:

```text
dist/
|-- assets/
|-- index.html
|-- server.cjs
`-- server.cjs.map
```

## Run

```powershell
$env:NODE_ENV = "production"
npm start
```

In production mode, Express serves `dist/` and returns `index.html` for unmatched routes.

## Environment

Required: at least one generation provider key.

Recommended:

```dotenv
NODE_ENV=production
APP_URL=https://app.example.com
GITHUB_TOKEN=
GEMINI_API_KEY=
MISTRAL_API_KEY=
GROQ_API_KEY=
OPENROUTER_API_KEY=
```

`APP_URL` must match the browser origin exactly, including scheme and port. It is not a wildcard or a
comma-separated list.

## Hosting Contract

The host must:

- Run Node.js.
- Preserve installed production dependencies because esbuild externalizes packages.
- Expose Express port `3000` or map traffic to it.
- Permit outbound calls to GitHub, AI providers, and Notion.
- Inject secrets at runtime.
- Terminate TLS before public traffic reaches the application.

The server currently ignores a platform-provided `PORT` environment variable. Hosts that require a
dynamic port need a code change before deployment.

## Separate Frontend and API

The default deployment serves both from one process. To host the client separately:

1. Deploy the Express API.
2. Set `VITE_API_BASE_URL` to its public origin.
3. Set server `APP_URL` to the frontend origin.
4. Rebuild the client.
5. Deploy Vite assets to the static host.

Remember that `VITE_API_BASE_URL` is embedded at build time.

## CORS

Allowed origins:

- `http://localhost`
- `https://localhost`
- `capacitor://localhost`
- `APP_URL`, when configured

The middleware allows `GET`, `POST`, and `OPTIONS`, plus `Content-Type` and `Authorization` headers.
Unknown origins receive no access-control headers.

## Health and Readiness

No health endpoint currently exists. Production platforms can probe `/`, but that only verifies
static serving, not provider credentials or external connectivity.

A proper deployment should add:

- `/api/health` for process readiness.
- Optional dependency checks with short timeouts.
- Build/version metadata.
- A response that never leaks secret values.

## Logging

Current logs are plain console output:

- Server startup.
- OpenRouter candidate attempts and failures.
- GitHub fallback warnings.
- Provider generation errors.
- Notion export errors.

Production improvements:

- Structured JSON logs.
- Request IDs.
- Latency and status fields.
- Secret and prompt redaction.
- Central log retention.
- Alerts on provider failures and unexpected spending.

## Scaling

The server is stateless between requests, so multiple replicas are possible. Browser state remains
client-local.

Constraints:

- Each multi-draft request can create up to five parallel provider calls.
- No rate limiter or concurrency limiter exists.
- No timeout aborts slow provider requests.
- No queue smooths bursts.
- API keys are shared across all users when configured server-side.

Add gateway quotas, application rate limiting, provider budgets, and request cancellation before
inviting the internet to discover your billing ceiling.

## Release Checklist

1. Run `npm ci`.
2. Run `npm run lint`.
3. Run `npm run build`.
4. Start the production bundle locally.
5. Test all three API endpoints.
6. Verify the intended provider keys exist.
7. Verify `APP_URL`.
8. Verify TLS and secret injection.
9. Confirm logs do not expose credentials.
10. Test desktop and mobile layouts.
11. Build Android again if the API URL or frontend changed.
12. Record the deployed commit SHA.

## Rollback

Keep the previous build artifact and environment configuration. Rollback should replace the
application artifact without rotating valid provider keys unless compromise is suspected.

Because the application has no database migrations, rollback does not require data migration work.
Browser drafts created by a newer client may still be incompatible with older code if the storage
schema changes in the future; version persisted state before making such changes.
