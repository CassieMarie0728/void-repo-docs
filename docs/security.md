# Security and Privacy

VOID processes repository content, application metadata, legal drafts, and third-party credentials.
That makes security a product feature, not the small policy file everyone remembers five minutes
before release.

## Trust Boundaries

1. User device and browser storage.
2. VOID frontend.
3. VOID Express API.
4. GitHub.
5. AI providers.
6. Notion.
7. Android WebView and remote API connection.

Data crossing any boundary may be logged, retained, or governed by a third party's terms.

## Secret Handling

### Server keys

Provider keys and `GITHUB_TOKEN` can be supplied as environment variables. This is the preferred
deployment approach.

### Browser keys

Keys entered in the UI are stored in `localStorage.void_custom_keys` as plain JSON and sent to the
server with generation/refinement requests.

The Notion token is stored in `localStorage.void_notion_token`.

Consequences:

- Any script executing in the same origin can read them.
- Browser extensions may access them depending on permissions.
- Shared machines retain them until site data is cleared.
- They are not encrypted at rest.
- The UI's "vault" terminology does not alter any of those facts.

Use low-privilege, revocable keys. Prefer server-side secret storage for shared deployments.

## Prompt Data Exposure

Generation sends the selected provider:

- Repository metadata.
- README excerpt.
- License excerpt.
- `package.json`.
- User-entered application descriptions.
- Tracking, authentication, permissions, and monetization selections.

Refinement sends the entire current Markdown document to Gemini.

Do not use confidential repositories or sensitive legal drafts without confirming the provider's
data handling, retention, contractual terms, and organizational approval.

## GitHub Access

`GITHUB_TOKEN` is attached server-side to GitHub REST requests. It should have the minimum necessary
scope.

The API accepts arbitrary GitHub URLs matching its parser. Consider:

- Restricting allowed organizations for private deployments.
- Adding request timeouts.
- Validating fetched content types and sizes.
- Avoiding high-scope personal tokens.

## API Exposure

The API has no authentication, rate limit, quota, CSRF token, or per-user authorization.

If publicly reachable with paid provider keys, anyone who can call it can consume those credentials'
quota. Protect it with an authenticated gateway or implement application authentication.

## CORS

The exact-origin allowlist reduces browser-based cross-origin abuse but is not authentication.
Non-browser clients ignore CORS entirely.

Keep `APP_URL` exact and HTTPS in production.

## Input Validation

`/api/generate` uses Zod and includes field limits.

`/api/refine` and `/api/export-notion` use manual truthy checks and should gain:

- Schemas.
- String length limits.
- Array and object constraints.
- Explicit request body size limits.

## Output Safety

Generated Markdown is rendered with `react-markdown`. The application does not enable raw HTML
rendering through a rehype plugin, which limits direct HTML injection.

Downloads and Notion exports still contain provider-generated content. Review links, legal claims,
and instructions before distributing output.

## Android

The manifest requests only internet access. Network traffic should use HTTPS.

Release builds currently:

- Are not minified.
- Do not define signing in source.
- Depend on a remote API.

Protect signing keys outside the repository and verify the API hostname before release.

## Notion

Use a dedicated internal integration shared only with the required parent page. Avoid workspace-wide
capabilities.

The server forwards the provided token to Notion but does not persist it. The browser does persist
it. Clear the saved value after use on shared devices.

## Logging Risks

Current error logging may include vendor response objects. Providers can echo request details.
Production logging should redact:

- Authorization headers.
- API keys.
- Notion tokens.
- Full prompts and generated legal documents.
- Sensitive repository excerpts.

## Dependency and Supply Chain

Recommended controls:

```powershell
npm audit
npm outdated
npm run lint
npm run build
```

Also monitor:

- GitHub dependency alerts.
- Android Gradle dependencies.
- Actions workflow pinning.
- Capacitor and WebView security releases.

Do not apply dependency upgrades blindly. A green version number can still arrive carrying a renamed
API and a small bag of broken exports.

## Hardening Priority

1. Add API authentication and rate limiting.
2. Move user secrets out of persistent browser storage.
3. Add Zod schemas to all endpoints.
4. Add provider and GitHub request timeouts.
5. Add structured redacted logging.
6. Add a restrictive Content Security Policy.
7. Add request size limits.
8. Add automated security and dependency checks.
9. Add health endpoints and operational alerts.
10. Document a credential rotation procedure.

## Vulnerability Reporting

Follow the process in the root [`SECURITY.md`](../SECURITY.md). Do not publish exploitable details in
a public issue before maintainers have had a reasonable chance to respond. Surprise parties are
already bad; surprise incident response is worse.
