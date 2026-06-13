# Repository Instructions

## Project Overview

VOID Repo Docs is an AI-powered legal document generation platform for creating codebase-aware legal agreements, compliance policies, and documentation across multiple document types and tone profiles.

## Technology Stack

- Frontend: React 19, TypeScript, Vite, TailwindCSS, shadcn-style UI components
- Backend: Express, Node.js runtime, Zod validation
- Build: esbuild, tsx
- Markdown/rendering: react-markdown and custom formatting/export utilities
- LLM providers: Gemini, Mistral, OpenRouter, Groq
- External APIs: GitHub REST API and Notion API

## Development Workflow

```bash
npm install
npm run dev
npm run build
npm start
npm run lint
```

## Agent Guidelines

- Preserve the existing full-stack structure unless a refactor is explicitly scoped.
- Use Zod to validate backend inputs.
- Keep generated legal documents legally coherent even when tone is casual or sarcastic.
- Update relevant docs when behavior, APIs, setup, workflows, architecture, or export behavior changes.
- Do not hardcode user-specific company, jurisdiction, or contact data into generated templates.
- Test provider fallback behavior when modifying model routing.
