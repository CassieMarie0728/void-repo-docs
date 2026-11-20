# API Reference

The Express API exposes three JSON endpoints. All run on port `3000` and are mounted under `/api`.
When VOID_API_TOKEN is configured, send it as a Bearer token on every API request except /api/health.

## Common Behavior

- Request content type: `application/json`
- Success content type: `application/json`
- Validation failures: HTTP `400`
- Provider rate limit: HTTP `429`
- Provider credit failure: HTTP `402`
- Unexpected or vendor errors: HTTP `500`

The server allows CORS for `http://localhost`, `https://localhost`, `capacitor://localhost`, and the
exact value of `APP_URL`.

## `POST /api/generate`

Generates one to five Markdown drafts.

### Request

```json
{
  "repoUrl": "https://github.com/owner/repository",
  "docType": "Privacy Policy",
  "tone": "Professional",
  "length": "medium",
  "versionCount": 1,
  "provider": "auto",
  "allowCloudFallback": false,
  "customKeys": {
    "selfhosted": "",
    "mistral": "",
    "openrouter": "",
    "groq": ""
  },
  "targetPlatform": "github_repo",
  "appName": "",
  "appDescription": "",
  "webUrl": "",
  "analyticsAndTracking": [],
  "authProvider": "none",
  "packageName": "",
  "androidPermissions": [],
  "monetizationServices": []
}
```

### Fields

| Field | Type | Rules |
| --- | --- | --- |
| `repoUrl` | string | Valid URL, maximum 255 characters, required for `github_repo` |
| `docType` | enum | One of the 15 values in `DocumentType` |
| `tone` | enum | Formal, Professional, Friendly, Casual, Laid-back, or Deadpool-cool |
| `length` | enum | `short`, `medium`, or `long` |
| `versionCount` | number | Integer-like value from 1 through 5 |
| `provider` | enum | Default `openrouter`; also `auto`, `selfhosted`, `mistral`, or `groq` |
| `model` | string | Optional exact cloud model ID, 1–200 characters; not a URL. Omit blank values. Auto/selfhosted reject overrides. OpenRouter overrides must be `openrouter/free` or end in `:free`. |
| `allowCloudFallback` | boolean | Default false; permits cloud attempts in Auto mode |
| `customKeys` | object | Optional per-request provider key overrides |
| `targetPlatform` | enum | `github_repo`, `web_app`, or `android_app` |
| `appName` | string | Maximum 100 characters; required for web and Android targets |
| `appDescription` | string | Maximum 1,000 characters |
| `webUrl` | string | Valid URL, maximum 255 characters, or empty |
| `analyticsAndTracking` | string[] | Web tracking and analytics selections |
| `authProvider` | string | Maximum 50 characters |
| `packageName` | string | Maximum 100 characters |
| `androidPermissions` | string[] | Declared target application permissions |
| `monetizationServices` | string[] | Target SDK or monetization services |

### Repository context

When `repoUrl` is present, the backend resolves the default branch to a commit and reads its
file inventory plus a bounded set of source blobs. Deployment config, explicit database dialect,
runtime entry point, schema, auth, and routing evidence take precedence over dependency guesses.
Unreadable or partial evidence is marked unknown. Snapshots are cached for five minutes.

See [Source grounding](grounding.md) for file/size limits, request costs, and validation limits.
A detected script/dialect contradiction permits one correction attempt. Repeated contradictions
return 422; no inconsistent draft is returned. Optional `repoUrl` on `/api/refine` supplies the
same evidence to refinement; the existing draft alone is not independently verified evidence.

### Response

```json
{
  "repo": "https://github.com/owner/repository",
  "docType": "Privacy Policy",
  "tone": "Professional",
  "length": "medium",
  "markdown": "<!-- provenance -->\n\n# Privacy Policy",
  "markdowns": [
    "<!-- provenance -->\n\n# Privacy Policy"
  ]
}
```

Narrative drafts start with an HTML comment containing document type, repository URL, tone, length,
draft number, generation timestamp, provider, and model.

### Error examples

```json
{ "error": "A valid GitHub URL is required for standard Repository documents." }
```

```json
{ "error": "No configured AI engine completed the request. Check your model server and AI_MODEL. Cloud fallback is off." }
```

```json
{ "error": "Document generation failed: Request refused by vendor endpoint." }
```

## `POST /api/refine`

Rewrites Markdown using the shared provider router and the requested provider/fallback settings.
Both routes accept `model` with the same validation. A pinned model failure does not switch models
or providers. Omit `model` to retain administrator-configured defaults.

### Request

```json
{
  "markdown": "# Existing document",
  "instruction": "Add a GDPR data-subject rights section.",
  "docType": "Privacy Policy",
  "tone": "Professional",
  "customKeys": {
    "selfhosted": ""
  }
}
```

### Validation

Zod requires `markdown` (1–500,000 characters) and `instruction` (1–10,000 characters).
Optional `docType` uses the same document enum as generation and applies its audience, purpose and
depth profile; older callers without it preserve the existing document's purpose. The editor sends
the generated document type. Invalid document types return 400. Optional `repoUrl` reloads evidence.

Generation and refinement keep tone separate from audience. Technical documentation omits generic
legal placeholders and attorney-review footers; legal templates retain their review disclaimer.
Machine-oriented generation omits the HTML provenance comment to preserve native syntax. Native
format correctness remains a model responsibility, not a full schema validation guarantee.

### Provider behavior

- Accepts `provider`, `customKeys`, and `allowCloudFallback`, just like generation.
- Auto defaults to self-hosted only. Explicit cloud consent enables fallback.
- `AI_BASE_URL`, `AI_MODEL`, and optional `AI_API_KEY` configure local inference on the server.
- Both routes validate input with Zod and reject empty or truncated model output.
- Authentication uses `Authorization: Bearer <VOID_API_TOKEN>` when configured.
- Configuration errors return 400, quota errors 402/429, and upstream failures 502.


### Response

```json
{
  "markdown": "# Refined document"
}
```

### Errors

- `400` when Markdown or instruction is missing.
- `400` for missing selected cloud configuration, `502` for provider failure.

### Actual provider and model

Refinement returns the actual `provider` and `model`. Generation returns `usedEngines`, an array
of `{ provider, model }` in the same order as `markdowns`. The editor displays this metadata per
draft and persists it with saved drafts, updating it after refinement.

### Provider errors

Sanitized errors name the attempted provider without vendor response text or credentials:
401 for rejected keys, 403 for access denial, 400 for rejected request/model settings (including
upstream 404), 413 for oversized requests, 402 for billing, 429 for rate limits and 502 for
upstream/network failures. Auto summaries list attempted routes. Explicit cloud requests do not
claim self-hosted failure or fallback attempts, even if the Auto fallback toggle is enabled.

## `POST /api/export-notion`

Creates a child page under a Notion parent page.

### Request

```json
{
  "token": "secret_...",
  "parentPageId": "0123456789abcdef0123456789abcdef",
  "title": "Privacy Policy",
  "markdown": "# Privacy Policy\n\nContent"
}
```

Hyphens are removed from `parentPageId` before the request.

### Conversion

The parser recognizes:

- Heading levels 1 through 3.
- Blockquotes.
- Bulleted list items.
- Numbered list items.
- Fenced code blocks.
- Plain paragraphs.

Supported code labels are JavaScript, TypeScript, Python, HTML, CSS, SQL, shell, JSON, Markdown, and
YAML. Other labels become `plain text`.

Only the first 95 generated blocks are sent. Nested structures and rich inline Markdown are not
modeled.

### Response

```json
{
  "success": true,
  "url": "https://www.notion.so/..."
}
```

### Errors

- `400` when token, parent page ID, or Markdown is missing.
- `500` when Notion rejects the request.

## Example With PowerShell

```powershell
$body = @{
  repoUrl = "https://github.com/CassieMarie0728/void-repo-docs"
  docType = "README"
  tone = "Deadpool-cool"
  length = "long"
  versionCount = 1
  provider = "selfhosted"
  targetPlatform = "github_repo"
} | ConvertTo-Json

Invoke-RestMethod `
  -Method Post `
  -Uri "http://localhost:3000/api/generate" `
  -ContentType "application/json" `
  -Body $body
```

## Production Hardening Notes

Before exposing the API publicly, add:

- Per-user authorization, rate limits, and a trusted gateway for shared deployments.
- Request-level rate limits and quotas.
- Provider timeouts and cancellation.
- Structured request IDs and logs.
- Input limits on refinement and Notion payloads.
- Secret redaction in logs.
- Abuse monitoring.

Without those controls, a public endpoint connected to paid AI keys is less "service" and more
"community-funded stress test."

## GET /api/ai/status

Returns the app identifier, default provider (`openrouter`), model (`openrouter/free` unless
configured otherwise), configured cloud provider names, and fallback default. Requires the
server access token when configured. Does not perform a model call or expose credentials.

### Evidence URL in generation responses

`evidenceRepoUrl` identifies the repository actually used as evidence. It is empty when generation
used manual app details, including fallback after an optional repository could not be read. Clients
should use this field for repository-backed refinement rather than the original requested `repo`.
Persist the distinction when saving a draft. Older responses without the field retain legacy behavior.
