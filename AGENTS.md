# Repository Instructions

<!-- moxie-docs:start -->
## Moxie Docs Agent Guidance

Use the Moxie Docs MCP server before editing CassieMarie0728/void-repo-docs. Load conventions, documentation patterns, documentation gaps, documentation update opportunities, and verified commands before changing code.

When your Moxie Docs token serves more than one repository, pass `repository: "CassieMarie0728/void-repo-docs"` in every Moxie tool call from this repo so the context targets CassieMarie0728/void-repo-docs.

### Documentation expectation

- Update human-readable docs when a change alters behavior, APIs, workflows, architecture, operational runbooks, or setup paths.
- Follow the repository's detected documentation placement and style.
- Prefer small source-cited docs updates over broad rewrites.
- Avoid filler docs that only restate file names, component names, or code that is already obvious.
- When you edit an existing doc, scan the whole file and correct any other section your change makes stale or wrong — don't leave known-outdated content next to a fresh update.

<!-- moxie-docs:end -->

---

## Project Overview

**VOID Repo Docs** (Voice of Intense Disdain) is an AI-powered legal document generation platform.
It generates customized, codebase-aware legal agreements, compliance policies, and documentation
across 15+ document types with 6 distinct tone profiles.

**Current Status:** Full-stack TypeScript/React application with Express backend, Vite frontend, and
multi-LLM provider support (Gemini, Mistral, OpenRouter, Groq).

---

## Technology Stack

- **Frontend:** React 19 + TypeScript 5.8, Vite 8, TailwindCSS 4.1
- **Backend:** Express 4.21, Node.js runtime
- **Build Tools:** esbuild, tsx
- **Styling:** Tailwind + Geist font variable + custom dark theme CSS variables
- **UI Components:** shadcn/ui patterns (Button, Input, Select, Dialog, ScrollArea, Card)
- **Animations:** Motion (Framer Motion alternative)
- **Markdown:** react-markdown for rendering, custom parsers for formatting/export
- **Icons:** lucide-react (18+ icons used)
- **Notifications:** sonner (toast notifications)
- **HTTP Client:** axios
- **Validation:** Zod (schema validation on backend)
- **LLM APIs:** Google Gemini, Mistral AI, OpenRouter (multi-model fallback), Groq
- **External APIs:** GitHub REST API, Notion API

---

## Architecture

### Backend (server.ts)

**Core Responsibility:** AI document generation coordination, LLM provider management, GitHub/Notion
integrations.

#### Key Endpoints

- `POST /api/generate` – Main document generation endpoint
  - Input: repoUrl, docType, tone, length, versionCount, provider, customKeys, platform config
  - Output: Single or multiple markdown documents with provenance comments
  - Supports multi-version parallel generation with variation profiles
  - Zod-validated request body

- `POST /api/refine` – AI-powered document refinement
  - Input: markdown content, refinement instruction, tone, custom API keys
  - Output: Refined markdown from Gemini
  - Used for polish, legal rigor, tone adjustment, compression, elaboration

- `POST /api/export-notion` – Notion integration
  - Converts markdown to Notion block structure
  - Limits output to 95 blocks to stay within API constraints
  - Supports headings, lists, quotes, code blocks, paragraphs

#### LLM Provider Fallback Logic

- **Auto-pilot mode:** Tries providers in priority order: Mistral → Gemini → Groq → OpenRouter
- **Temperature variation:** Deadpool-cool tone uses higher temps (0.85–1.0) for variety; others use
  moderate (0.3–0.8)
- **OpenRouter multi-model strategy:** Cycles through free model candidates (Gemini 2.5 Flash, Llama
  3.3, DeepSeek R1) on failure
- **Custom API keys** override environment variables

#### Repository Context Extraction

- Fetches README (first 5000 chars), LICENSE (3000 chars), package.json from GitHub API
- Gracefully degrades to manual input if GitHub fetch fails
- Uses tokens from `GITHUB_TOKEN` env var for higher rate limits

#### Platform-Specific Configuration

- **GitHub Repo:** Standard document generation with repo context
- **Web App:** Includes tracking disclosure, GDPR compliance, CCPA mentions, payment processor
  specifics
- **Android App:** Google Play Store compliance, permission disclosure framework, reverseEngineering
  prohibitions

### Frontend (src/App.tsx)

**Core Responsibility:** Document generation UI, real-time editing, multi-draft versioning, local
persistence, AI refinement interface.

#### Key State Management

- **Generation:** repoUrl, docType, tone, length, versionCount, provider, customKeys, targetPlatform
- **Editor:** editedMarkdown, originalMarkdown, versions array, activeVersionIndex, viewMode
- **Auto-save:** editedMarkdown syncs to localStorage every 1000ms with diff check to avoid
  redundant saves
- **History:** undo stack (max 10 entries) for text transformations
- **Refinement:** customInstruction, isRefining, isLoading
- **Rendering:** placeholderReplacements object for live template variable filling

#### View Modes

1. **Preview:** Rendered markdown with word/char count, export buttons (Markdown, DOCX, PDF)
2. **Edit:** Full-screen textarea with soft/hard wrap toggle, auto-save status
3. **Split Screen:** Editor left, live preview right, sync'd editing
4. **Diff Comparison:** Original vs. edited markdown with visual diff highlighting

#### Sidebar Architecture

- **Left:** VOID branding, navigation placeholder (01/02/03 sections), personality quote
- **Right (3 tabs):**
  - **SETUP:** Document generation config, API key vault (encrypted visibility toggle), target
    platform UI
  - **REFINER:** AI refinement presets, custom instruction executor, formatting tools (table align,
    spacing fix), undo history
  - **AUDIT:** Compliance audit component (separate file)

#### Storage & Persistence

- `localStorage.void_editor_draft` – Entire session state (markdown, versions, config, timestamps)
- `localStorage.void_custom_keys` – Encrypted API keys (stored as plain JSON, so educate users on
  security)
- `localStorage.void_selected_provider` – Last selected LLM provider

#### Utility Functions

- `getWordCount()` – Strips comments, markdown syntax; counts words by whitespace
- `extractPlaceholders()` – Regex `/\[([A-Za-z0-9\s_\-@\.]+?)\]/g` to find template variables like
  `[Company Name]`
- `getReplacedMarkdown()` – Safe regex replacement with escaping
- `formatMarkdownTables()` – Aligns pipe-delimited tables to equal column widths
- `cleanMarkdownSpacing()` – Reduces excessive line breaks, fixes header spacing

---

## Development Workflow

### Setup

```bash
npm install
```

### Development Server

```bash
npm run dev
```

Starts Express on `:3000` with Vite middleware for hot-reload. Visit `http://localhost:3000`.

### Optional Environment Variables

```bash
GEMINI_API_KEY=<your-key>
MISTRAL_API_KEY=<your-key>
GROQ_API_KEY=<your-key>
OPENROUTER_API_KEY=<your-key>
GITHUB_TOKEN=<optional-for-higher-rate-limits>
NODE_ENV=development
```

### Build

```bash
npm run build
```

- Vite outputs static assets to `dist/`
- esbuild bundles `server.ts` to `dist/server.cjs` (Node compatible)

### Production Server

```bash
npm start
```

Runs compiled `dist/server.cjs`, serves static `dist/` frontend on `:3000`.

### Type Checking

```bash
npm run lint
```

Runs `tsc --noEmit` (TypeScript validation without emitting files).

---

## Key Patterns & Conventions

### Document Type System (types.ts)

15 document types defined as enum:

- Legal: Privacy Policy, Terms of Service, EULA, NDA, DPA, SLA, API Agreement
- Governance: Code of Conduct, Contributing Guidelines, Security Policy, Acceptable Use Policy
- Utility: README, LICENSE, Cookie Policy, Disclaimer

### Tone Profiles

- **Formal** – Academic, legalese-heavy ("hereinafter", "pursuant to")
- **Professional** – Corporate, polished, business-ready
- **Friendly** – Warm, guiding, encouraging
- **Casual** – Direct, jargon-free, peer-to-peer
- **Laid-back** – Relaxed, stress-free, simplified warnings
- **Deadpool-cool** – Unhinged sarcasm, 4th-wall breaks, cynical meta-humor, legally watertight but
  disrespectful

*Note:* Deadpool tone uses custom prompts to mock developers, framework choices, npm packages, and
Google Play policies while maintaining legal integrity. No copyrighted Marvel terms allowed; use
original mercenary-grade snark.

### Length Levels

- **Short** (<500 words) – Concise, essentials-only
- **Medium** (800–1200 words) – Balanced, standard business document
- **Long** (1500–2500 words) – Exhaustive, comprehensive sections, detailed disclaimers

### Multi-Draft Generation

- Users can generate 1–5 drafts in parallel
- Each draft uses different temperature and variation profile (e.g., "Focus on verbose", "Focus on
  concise", "Focus on legal shields")
- Drafts persist in `versions` array; user can switch between tabs
- Original versions stored separately for diff comparison

### Placeholder System

- AI generates documents with `[Placeholder]` syntax (e.g., `[Company Name]`, `[Contact Email]`,
  `[Jurisdiction]`)
- Frontend extracts via regex and provides live fill-in UI
- On copy/download, placeholders replace if user provided values
- Prevents hardcoding company-specific data

### Error Handling

- **Rate Limit (429):** Toast message "Rate limited? Chill out."
- **Insufficient Credits (402):** Toast message "Broke? Add credits."
- **API Key Missing:** Clear error mentioning settings location
- **GitHub Fetch Failure:** Gracefully degrades to manual input (for non-GitHub targets)
- **Notion Export Failure:** Returns full error detail from Notion API

---

## Frontend Styling

- **Theme Variables:** CSS custom properties in `src/index.css`
  - `--brand-bg`, `--brand-text`, `--brand-border`, `--brand-accent` (#981518 maroon)
  - `--brand-muted`, `--brand-sidebar`, `--brand-config`
- **Typography:** Courier New (monospace for code), serif font (italic headers)
- **Scrollbars:** Custom thin scrollbar styling (`custom-scrollbar` class)
- **Animations:** Motion/Framer Motion for sidebar slide-in/out, view transitions, status indicators
- **Skeleton UI:** Ghost icon + bounce animation while waiting for document generation

---

## Common Implementation Details

### Markdown Export to DOCX

- Creates HTML wrapper with `office:` XML namespace
- Applies font family (Courier New body, Special Elite headings)
- Styles blockquotes, code blocks with maroon accents
- Downloads as `.docx` (Office XML format)

### Markdown Export to PDF

- Scopes HTML to `.markdown-body` div
- Injects temporary print container
- Triggers `window.print()` with system print dialog
- User selects "Save as PDF" in printer options

### Notion Block Parsing

- Splits markdown by line, identifies block types (heading 1/2/3, list, code, paragraph)
- Code language detection with fallback to "plain text"
- Notion API supports limited language list; unmapped languages reset to plain text
- Max 95 blocks per page to avoid API bloat

---

## Making Changes: Guidelines for Agents

### When Adding New Document Types

1. Add enum value to `DocumentType` in `src/types.ts`
2. Update `documentTypes` array sort in `App.tsx`
3. Add description in `DOCUMENT_DESCRIPTIONS` object if using DocToneGlossary
4. Server automatically routes to generation; ensure system prompt covers new type

### When Adding LLM Providers

1. Add provider to Zod schema `provider` enum in `server.ts`
2. Implement new provider case in generation loop (temperature, request format, response parsing)
3. Add to provider dropdown in `src/App.tsx` config panel
4. Add custom key input in Key Vault section
5. Update fallback priority in auto-pilot logic

### When Modifying Tone Instructions

- Edit tone instruction strings in `server.ts` (~line 202–234)
- Ensure system prompt includes full tone guidance
- Test Deadpool-cool specifically to verify 4th-wall breaks and legal rigidity coexist
- Update `TONE_DESCRIPTIONS` in `DocToneGlossary` component for UI hints

### When Extending UI Components

- Import from `components/ui/` (shadcn pattern)
- Use Tailwind classes with custom brand colors
- Maintain dark theme aesthetic
- Use Motion for transitions to match existing UX

### When Modifying Backend Endpoints

- Use Zod to validate all inputs
- Return JSON with consistent shape: `{ success?, error?, data }`
- Log errors with context (model, temperature, vendor error)
- Handle timeout and 503 gracefully with user-facing messages

