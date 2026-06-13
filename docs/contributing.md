# Contributing

Contributions are welcome when they improve correctness, usability, maintainability, or documented
behavior. Random abstraction confetti will be admired briefly and then asked to leave.

## Setup

```powershell
npm install
Copy-Item .env.example .env
npm run dev
```

Before submitting changes:

```powershell
npm run lint
npm run build
```

Run Android validation when changing:

- `src/api.ts`
- `capacitor.config.ts`
- Android configuration
- Build scripts
- Responsive layout
- Any browser API used inside the WebView

## Branch and Commit Style

Use focused branches and Conventional Commit messages:

```text
feat(ui): add draft search
fix(api): handle empty provider response
docs(android): clarify release signing
```

Keep unrelated formatting and generated-file churn out of functional commits.

## Engineering Rules

- Follow existing React, TypeScript, Express, and Tailwind patterns.
- Keep validation at the API boundary.
- Prefer explicit data structures over fragile string parsing.
- Preserve the single API client in `src/api.ts`.
- Keep mobile and desktop behavior aligned.
- Never hard-code real credentials.
- Update documentation with behavior changes.
- Avoid adding dependencies for work supported cleanly by the platform or current stack.

## Change Checklists

### New document type

1. Add the enum value in `src/types.ts`.
2. Add glossary metadata in `DocToneGlossary.tsx`.
3. Confirm generation prompts handle it.
4. Test all target platforms.
5. Update [User Guide](user-guide.md) and [Repository Reference](repository-reference.md).

### New provider

1. Update shared provider types.
2. Update the Zod enum.
3. Add environment and custom-key handling.
4. Implement provider request and response parsing.
5. Add UI selection and key input.
6. Define Auto ordering.
7. Add mocked success and error tests.
8. Update [AI Providers](ai-providers.md).

### New API endpoint

1. Define a Zod schema.
2. Add explicit input limits.
3. Return consistent JSON errors.
4. Add timeout and external error mapping.
5. Add frontend client behavior.
6. Document the contract in [API Reference](api-reference.md).
7. Evaluate authentication and abuse risk.

### Frontend workflow

1. Verify desktop layout.
2. Verify width below `768px`.
3. Test both mobile drawers.
4. Test restored local storage state.
5. Test empty, loading, success, and error states.
6. Check keyboard and focus behavior.

### Android change

1. Run `npm run android:apk`.
2. Install the APK.
3. Check `adb logcat`.
4. Verify remote API calls.
5. Confirm release configuration remains valid.
6. Update [Android](android.md).

## Tone Contributions

The repository intentionally uses irreverent copy. Keep it:

- Original.
- Concise enough not to obscure controls.
- Accurate.
- Free of copyrighted character names, franchise references, or copied catchphrases.
- Out of security errors where clarity matters more than performance art.

The joke serves the interface. The interface does not serve the joke.

## Testing Expectations

The repository currently has TypeScript validation and generated Android example tests, but no
comprehensive frontend or backend automated test suite.

For behavior changes, add focused tests when introducing a test framework is already justified, or
provide reproducible manual verification. High-value future coverage includes:

- Zod generation schema.
- Provider selection and error mapping.
- GitHub URL parsing.
- Markdown-to-Notion conversion.
- Placeholder extraction and replacement.
- Table formatting.
- Draft persistence and switching.
- Mobile drawer exclusivity.

## Pull Request Description

Include:

- What changed.
- Why it changed.
- User-visible effects.
- Commands run.
- Manual test coverage.
- Security or migration notes.
- Screenshots for layout changes.

Do not write "various fixes." Future maintainers are not being paid by the mystery.

## Documentation

Documentation must match the current code. When changing an existing guide, scan the whole page for
newly stale statements. A fresh paragraph sitting beside obsolete instructions is not an update; it
is an archaeological layer.
