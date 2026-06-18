# VOID Documentation Command Center

Welcome to the whole shebang: the operator manual, developer map, API contract, Android field guide,
security briefing, and troubleshooting kit for VOID Repo Docs.

These pages document the repository as it exists in code. Aspirational features are not smuggled in
under cover of confident prose. The software already has enough moving parts without imaginary ones
asking for maintenance.

## Reading Paths

### I want to run the application

1. [Getting Started](getting-started.md)
2. [User Guide](user-guide.md)
3. [Troubleshooting](troubleshooting.md)

### I want to understand or modify the code

1. [Architecture](architecture.md)
2. [Repository Reference](repository-reference.md)
3. [API Reference](api-reference.md)
4. [AI Providers](ai-providers.md)
5. [Contributing](contributing.md)

### I want to ship it

1. [Deployment](deployment.md)
2. [Security](security.md)
3. [Android](android.md)

## Document Set

| Document | Coverage |
| --- | --- |
| [Getting Started](getting-started.md) | Requirements, install, environment, development, build, first generation |
| [User Guide](user-guide.md) | Configuration, generation, drafts, editor modes, refiner, audit, exports |
| [Architecture](architecture.md) | Process model, frontend/backend boundaries, data flows, persistence |
| [API Reference](api-reference.md) | `/api/generate`, `/api/refine`, `/api/export-notion`, errors |
| [AI Providers](ai-providers.md) | Auto selection, provider models, OpenRouter fallback, cost/rate failures |
| [Android](android.md) | Native shell, remote API, Gradle tasks, artifacts, signing, device testing |
| [Deployment](deployment.md) | Production bundle, hosting contract, environment, observability |
| [Security](security.md) | Secrets, CORS, external APIs, local storage, Notion, release hardening |
| [Repository Reference](repository-reference.md) | Directory map, scripts, enums, storage keys, major dependencies |
| [Contributing](contributing.md) | Workflow, implementation patterns, test expectations, review checklist |
| [Troubleshooting](troubleshooting.md) | Web, provider, Android, export, and build failures |

## Documentation Principles

- **Code wins arguments.** Runtime code is the source of truth.
- **Commands must be runnable.** Decorative terminal fiction belongs in movies.
- **Security limitations are explicit.** Browser storage is convenient, not a vault.
- **Legal limitations are explicit.** Generated documents require professional review.
- **The tone can bite; the facts cannot wobble.**

## Scope Snapshot

VOID currently contains:

- One React single-page application.
- One Express server on port `3000`.
- Three JSON API endpoints.
- Four generation providers.
- One Gemini-only refinement path.
- Fifteen document types.
- Six tone profiles.
- Three target platform profiles.
- One Capacitor Android application with package ID `com.c728.voidrepodocs`.

That is the documented boundary. No database, user authentication service, queue, WebSocket layer,
or magical compliance certification exists in this repository.
