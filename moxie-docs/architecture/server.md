# Repository Architecture Documentation Refresh

This doc describes the server-side components and client-side build configuration that underpin the repository’s automated document generation for repository documents. It explains how requests flow from API routes through validation, data gathering (including GitHub data), and into provider-specific generation, plus how the build config wires environment keys through to the runtime.


## Architecture

- Entry points and request flow:
  - API route: POST /api/generate (server.ts) is the main entry for generating repository documents. It validates input, optionally fetches GitHub repo data, selects a generator provider, and then constructs an instruction/request payload for the chosen provider.
  - Build/server glue: server.ts hosts an Express app listening on port 3000, uses json body parsing, and holds a Gemini (GenAI) client cache.
  - Provider orchestration: Based on inputs (provider/customKeys/ENV vars) the code chooses an active provider (gemini, mistral, groq, openrouter) and ensures an API key is present before issuing any requests.
- Data sources and validation:
  - Validation is performed with Zod against a schema named `genSchema` (in server.ts). It describes fields such as repoUrl, docType, tone, length, versionCount, provider, customKeys, targetPlatform, and app-related metadata.
  - If a GitHub URL is provided (repoUrl), the code extracts owner/repo and fetches repo metadata from GitHub APIs (repo, readme, license, package.json) to populate a repoContext object that feeds document generation.
- GitHub integration:
  - Helper `parseGitHubUrl` extracts owner and repo from a GitHub URL.
  - `fetchRepoInfo(owner, repo)` calls GitHub API endpoints to collect repository data, readme, license, and package.json (where available). It respects GITHUB_TOKEN if provided and formats a compact summary for the generator.
- Fallback behavior:
  - If GitHub fetch fails or is unavailable, the code can synthesize a minimal repoContext from inputs (appName, appDescription, targetPlatform) to continue generation.
- Environment and authentication:
  - Gemini is configured via a Gemini API key from GEMINI_API_KEY (either env or in customKeys). The Gemini client is lazy-initialized in `getGeminiClient()` with a custom User-Agent header.
  - GitHub API requests optionally rely on GITHUB_TOKEN env var for higher rate limits.
  - Other providers (mistral, groq, openrouter) use keys sourced from either customKeys or environment variables (e.g., MISTRAL_API_KEY, GROQ_API_KEY, OPENROUTER_API_KEY).
- Vite / Web build configuration:
  - vite.config.ts wires environment keys (GEMINI_API_KEY) into the client bundle using define, configures React and Tailwind plugins, and sets up an HMR/watch strategy controlled by DISABLE_HMR env var.
  - It also defines an alias so imports using @ resolve to project root.


## Files and Routes

### /server.ts

- Path: server.ts
- What it is: Standalone Express server backend that powers the document-generation API and bootstraps the Gemini client.
- Key behavior:
  - Exposes a single API route: POST /api/generate.
  - Validates input with the Zod schema `genSchema` including fields: `repoUrl` (string URL), `docType` (DocumentType), `tone` (Tone), `length` (Length), `versionCount` (number 1–5, default 1), `provider` (enum), `customKeys` (object with provider keys), `targetPlatform` (TargetPlatform), `appName`, `appDescription`, `webUrl`, `analyticsAndTracking`, `authProvider`, `packageName`, `androidPermissions`, `monetizationServices`.
  - Entry logic: determine if the request targets a GitHub-backed repo or a manual app flow via `targetPlatform`. If a GitHub URL is provided, it calls `parseGitHubUrl` and `fetchRepoInfo` to obtain repoContext; otherwise it synthesizes a repoContext from inputs.
  - Provider selection: derives `activeProvider` from `provider` or environment/customKeys, with a fallback chain (mistral, gemini, groq, openrouter). It validates that an API key exists for the chosen provider; otherwise responds with 400 and a clear error message.
  - Length and tone handling: builds instruction strings based on `Length` and `Tone` enums to control how the generated documentation should be written.
  - Platform-specific scaffolding: builds a section of instructions depending on `TargetPlatform` (WebApp, AndroidApp, etc.) with fields like `webUrl`, `analyticsAndTracking`, `authProvider`, `packageName`, `androidPermissions`, and monetization data. The code contains long, explicit strings customizing platform configuration prompts.
- Requests/Responses:
  - Method: POST
  - Path: /api/generate
  - Auth: provider API keys are read from env or `customKeys`; there is no user-auth in this route. If a GitHub URL is used, GitHub API access may require a `GITHUB_TOKEN` env var.
  - Input: JSON body must conform to `genSchema` (fields described above).
  - Output: on success, returns a JSON payload containing the generated document plan/instructions (not shown in the snippet); on validation or missing keys, returns 400 with `{ error: string }`.
- Notable error cases:
  - 400 if a GitHub URL is required but invalid (or repo not found/private).
  - 400 if no API key available for the chosen provider (Mistral/Gemini/OpenRouter/GROQ) and keys are not supplied.
  - 400 for missing required appName when targetPlatform is not Github-backed.
- Notable side effects:
  - Potential network requests to GitHub API and provider endpoints; environment keys need to be configured; dependencies on external services.
  - Logs may warn when GitHub fetch fails but manual app details are provided.


### /vite.config.ts

- Path: vite.config.ts
- What it is: Vite configuration used for the frontend build that accompanies the repository document system.
- Key behavior:
  - Uses Tailwind CSS and React plugin.
  - Exposes `GEMINI_API_KEY` to the client bundle via define, sourced from environment during build with loadEnv.
  - Sets up alias `@` to project root for imports.
  - Server options:
    - HMR is controlled by DISABLE_HMR env var: if DISABLE_HMR is not 'true', HMR is enabled; otherwise HMR is disabled.
    - When DISABLE_HMR is 'true', file watching is disabled (watch: null) to reduce CPU during agent edits.
- Notable details:
  - Comments indicate HMR and file watching behavior are tuned for the AI Studio environment.
  - The config is minimal and focused on enabling env-key propagation and a stable dev experience.


## Gotchas

- Environment/key management:
  - Gemini, Mistral, Groq, OpenRouter, etc. depend on API keys that must be supplied either in environment variables or via the request's `customKeys` object. If you refactor the provider selection logic, ensure you preserve the fallback priority so that a missing key yields a helpful 400 error rather than a silent failure.
- GitHub data fetching:
  - If a GitHub repository is private or inaccessible, the code will return a 400 unless manual app data can be supplied. The flow prioritizes repoContext from GitHub when available, otherwise falls back to manual inputs.
- Validation surface:
  - The `genSchema` uses Zod with a mix of optional fields and enums. Ensure upstream changes keep the same enum values for `DocumentType`, `Tone`, `Length`, and `TargetPlatform` otherwise validation will fail.
- External dependencies:
  - The code relies on several external services: GitHub API and multiple AI generation providers. Any rate limits, auth changes, or API changes can impact generation quality or success.
- Build environment:
  - The client bundle receives `GEMINI_API_KEY` via Vite's define. If you introduce a new environment key, propagate it similarly to avoid undefined values in the frontend code.


This page ties together the current server and build configuration as they exist in the repository sources. It focuses on the concrete flow and contracts present in server.ts and vite.config.ts, ensuring you can start producing or modifying repository documents with a clear understanding of the control/data flow and the key failure modes to watch for.