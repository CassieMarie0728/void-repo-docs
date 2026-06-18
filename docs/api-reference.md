# API Reference

The Express API exposes three JSON endpoints. All run on port `3000` and are mounted under `/api`.
There is no authentication layer in this repository.

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
  "customKeys": {
    "gemini": "",
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
| `provider` | enum | `auto`, `gemini`, `mistral`, `openrouter`, or `groq` |
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

When `repoUrl` is present, the server parses GitHub owner and repository names and requests:

- `/repos/{owner}/{repo}`
- `/repos/{owner}/{repo}/readme`
- `/repos/{owner}/{repo}/license`
- `/repos/{owner}/{repo}/contents/package.json`

README and license fetches can fail independently and become empty context. Failure of the repository
metadata request fails repository-mode generation.

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

Every draft starts with an HTML comment containing document type, repository URL, tone, length,
draft number, generation timestamp, provider, and model.

### Error examples

```json
{ "error": "A valid GitHub URL is required for standard Repository documents." }
```

```json
{ "error": "Gemini API key not configured. Set it in the App Settings > API Keys or in environment variables." }
```

```json
{ "error": "Document generation failed: Request refused by vendor endpoint." }
```

## `POST /api/refine`

Rewrites an existing Markdown document with Gemini.

### Request

```json
{
  "markdown": "# Existing document",
  "instruction": "Add a GDPR data-subject rights section.",
  "tone": "Professional",
  "customKeys": {
    "gemini": ""
  }
}
```

### Validation

`markdown` and `instruction` are checked manually for truthy values. This endpoint does not use a
Zod schema and does not impose explicit field length limits.

### Provider behavior

- Uses `customKeys.gemini` when supplied.
- Otherwise uses `GEMINI_API_KEY`.
- Uses model `gemini-3.5-flash`.
- Uses temperature `0.3`.
- Returns raw Markdown without code fences or commentary.

### Response

```json
{
  "markdown": "# Refined document"
}
```

### Errors

- `400` when Markdown or instruction is missing.
- `500` for missing Gemini configuration or provider failure.

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
  provider = "gemini"
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

- Authentication or a trusted gateway.
- Request-level rate limits and quotas.
- Provider timeouts and cancellation.
- Structured request IDs and logs.
- Input limits on refinement and Notion payloads.
- Secret redaction in logs.
- Abuse monitoring.

Without those controls, a public endpoint connected to paid AI keys is less "service" and more
"community-funded stress test."
