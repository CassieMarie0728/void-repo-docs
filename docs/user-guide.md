# User Guide

VOID turns repository or application context into editable Markdown documents. The workflow is:
configure, generate, inspect, refine, audit, replace placeholders, export, and then hand the result
to a qualified human before it acquires legal consequences.

## Workspace Layout

### Navigation panel

The left panel contains product branding and navigation placeholders. On screens below `768px`, it
starts closed and opens as a drawer from the header.

### Document workspace

The center panel contains:

- Preview, edit, split, and diff modes.
- Draft tabs when multiple versions exist.
- Word and character counts.
- Copy and export actions.
- Generation controls and status.

### Configuration panel

The right panel contains three tabs:

- **Setup:** target, document class, tone, length, provider, keys, and editor preferences.
- **Refiner:** AI rewrite presets, custom instructions, formatters, placeholders, and undo.
- **Audit:** local checks for common legal, privacy, and technical clauses.

On mobile, this panel also starts closed. Only one side drawer can be open at a time, because
overlapping menus are not a user interface; they are a hostage situation.

## Choose a Target

### Repo File

Use this for a public GitHub repository. A valid `github.com/{owner}/{repository}` URL is required.
The server fetches:

- Repository metadata.
- Up to 5,000 characters of README content.
- Up to 3,000 characters of license content.
- `package.json`, when present.

Private repositories are not supported through user authentication. A server `GITHUB_TOKEN` only
changes GitHub API authorization and rate limits; it does not provide a per-user repository picker.

### Web App

Provide:

- Application name.
- Application description.
- Public URL, when available.
- Tracking or analytics services.
- Authentication provider.
- Optional GitHub repository context.

The generated prompt emphasizes cookies, browser storage, tracking, account controls, cloud service
limits, and web acceptable-use restrictions.

### Android App

Provide:

- Application name.
- Application description.
- Android package name.
- Requested device permissions.
- Monetization or third-party SDK services.
- Optional GitHub repository context.

The generated prompt emphasizes permission disclosures, Play policy concerns, reverse engineering,
side-loading, application integrity, and store responsibility boundaries.

## Select Output Parameters

### Document class

VOID supports:

- Acceptable Use Policy
- API Agreement
- Code of Conduct
- Contributing Guidelines
- Cookie Policy
- Data Processing Agreement
- Disclaimer
- End User License Agreement
- LICENSE
- Non-Disclosure Agreement
- Privacy Policy
- README
- Security Policy
- Service Level Agreement
- Terms of Service

### Tone

| Tone | Intended result |
| --- | --- |
| Formal | Traditional, distant, legalistic prose |
| Professional | Corporate, direct, readable prose |
| Friendly | Warm, collaborative guidance |
| Casual | Everyday developer-to-developer language |
| Laid-back | Simplified, low-stress explanations |
| Deadpool-cool | Original fourth-wall-breaking mercenary sarcasm with strict IP exclusions |

The last option is a product label. Its implementation explicitly prohibits copyrighted names and
references. The attitude is original; the legal review requirement remains depressingly real.

### Length

- **Short:** under 500 words.
- **Medium:** approximately 800 to 1,200 words.
- **Long:** approximately 1,500 to 2,500 words with expanded sections.

Provider token limits can still truncate ambitious output. "Long" is an instruction, not a blood
oath from a remote API.

### Draft count

Generate one to five drafts. Drafts run in parallel and use different temperature and focus
profiles:

1. Standard.
2. Detailed and exhaustive.
3. Concise and modern.
4. Strong legal shields.
5. Modern telemetry, cookies, and API concerns.

## Select a Provider

Choose Auto, Gemini, Mistral, Groq, or OpenRouter. Auto selects the first configured provider in
this order:

1. Mistral
2. Gemini
3. Groq
4. OpenRouter

Keys entered in the UI override server environment keys for that request. See
[AI Providers](ai-providers.md) before deciding where secrets should live.

## Work With Drafts

### Preview

Renders Markdown through `react-markdown`. Placeholder replacements are applied before rendering.

### Edit

Provides a full Markdown textarea with soft-wrap and no-wrap controls.

### Split

Shows editor and live preview side by side. The control is hidden on small screens because two
columns on a phone are a prank, not productivity.

### Diff

Compares the current draft with the original generated version and highlights additions,
deletions, and unchanged lines.

### Auto-save

The active session is saved to `localStorage` after a one-second debounce. On the next visit, VOID
restores the saved document, versions, source parameters, and active draft.

Generating over edited content requires a second confirmation click. This prevents one enthusiastic
button press from vaporizing local work.

## Refine and Format

The AI Refiner uses Gemini, even when the original document came from another provider.

Presets include:

- Polish and proofread.
- Boost legal rigor.
- Increase cynical tone.
- Condense.
- Expand.

Custom instructions can request targeted changes. The previous text is pushed into an in-memory
undo history capped at ten entries.

Local formatters do not call an AI:

- **Align Tables** normalizes Markdown table widths.
- **Spacing Fix** removes excessive blank lines and repairs heading separation.

## Replace Template Variables

VOID detects bracketed values such as:

```text
[Company Name]
[Contact Email]
[Jurisdiction]
```

Enter replacements in the Refiner panel. Replacements affect preview, clipboard output, and
downloads without rewriting the stored raw draft.

The detector accepts letters, numbers, spaces, `_`, `-`, `@`, and `.`, with a length between 3 and
39 characters. Numeric-only and URL-like values are ignored.

## Run the Compliance Audit

The audit is heuristic, not a legal engine. It searches the current Markdown for indicators of:

- Liability limitations.
- Warranty disclaimers.
- Governing law or dispute resolution.
- GDPR, CCPA, cookies, or privacy rights.
- Data security and breach handling.
- Contact information.
- Acceptance or effective-date language.

Missing checks can trigger specialized Gemini refinement prompts. Passing a keyword check proves
that relevant words exist, not that the clause is valid in your jurisdiction. A spellchecker can
find "indemnification"; it cannot represent you in court.

## Export

### Clipboard

Copies the rendered Markdown with placeholder replacements.

### Markdown

Downloads a `.md` file named from the document class.

### Word-compatible document

Creates an HTML document with Microsoft Office namespaces and downloads it with a `.docx`
extension. This is Word-compatible HTML, not a zipped Office Open XML package.

### PDF

Creates a temporary print layout and opens the browser print dialog. Choose **Save as PDF**.

### Notion

Enter an internal integration token and a parent page ID. The server converts supported Markdown
lines to Notion blocks and creates a child page.

Current limitations:

- The export is capped at 95 blocks.
- Markdown parsing is line-oriented.
- Complex nested lists and rich inline formatting are not preserved.
- The token and page ID are saved in browser local storage.

See [Security](security.md) before using a high-privilege Notion token.
