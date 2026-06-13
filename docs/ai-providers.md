# AI Providers

VOID supports four providers for initial generation and one provider for refinement.

## Provider Matrix

| Provider | Generation model | Refinement | API style |
| --- | --- | --- | --- |
| Mistral | `mistral-large-latest` | No | Mistral chat completions |
| Gemini | `gemini-3.5-flash` | Yes | Google GenAI SDK |
| Groq | `llama-3.3-70b-versatile` | No | OpenAI-compatible chat completions |
| OpenRouter | Candidate list | No | OpenAI-compatible chat completions |

Model availability and naming are controlled by external vendors and can change. If a vendor retires
a model, the code does not negotiate with reality; it fails until updated.

## Auto Selection

Auto mode checks custom request keys and server environment keys in this order:

1. Mistral
2. Gemini
3. Groq
4. OpenRouter

If no key exists, Auto selects Mistral so the server returns a specific missing-key error.

Auto mode is selection, not cross-provider fallback. Once selected, a Mistral or Gemini failure does
not automatically retry Groq or OpenRouter.

## Key Precedence

For generation:

1. Matching key in `customKeys`.
2. Matching server environment variable.

For refinement:

1. `customKeys.gemini`.
2. `GEMINI_API_KEY`.

UI-entered keys are saved to browser local storage in plain text. Server environment variables are
the safer default for controlled deployments.

## OpenRouter Fallback

OpenRouter is the only path with model-level fallback. It tries candidates in order until one
returns content:

1. `google/gemini-2.5-flash`
2. `google/gemini-2.5-flash:free`
3. `google/gemini-2.5-pro:free`
4. `meta-llama/llama-3.3-70b-instruct:free`
5. `google/gemini-1.5-flash-8b:free`
6. `deepseek/deepseek-r1:free`
7. `mistralai/mistral-7b-instruct:free`

Every failed candidate is logged, and the final error includes the last vendor message. Free model
availability is especially volatile, because "free" and "reliable production dependency" rarely
share a lease.

## Prompt Construction

Generation combines:

- Document class.
- Target platform.
- Tone instructions.
- Length instructions.
- Application metadata.
- Repository metadata and excerpts.
- Draft variation profile.
- A rule requiring placeholders for unknown facts.
- A legal-review disclaimer requirement.

The requested output is raw Markdown with no introductory conversation.

## Tone Safety

The `Deadpool-cool` product setting requests:

- High-density sarcasm.
- Fourth-wall breaks.
- Software-specific jokes.
- Parenthetical asides.
- Preserved legal structure.

The prompt also prohibits copyrighted names, franchises, catchphrases, and associated references.
Contributors should preserve this boundary when adjusting tone instructions.

## Multi-Draft Execution

Drafts are generated concurrently with `Promise.all`.

Temperatures for standard tones:

```text
0.5, 0.7, 0.3, 0.6, 0.8
```

Temperatures for the sarcastic tone:

```text
0.85, 0.95, 0.8, 0.9, 1.0
```

One provider rejection rejects the entire batch. Partial successes are not returned.

## Error Mapping

| Vendor condition | HTTP response |
| --- | --- |
| Missing selected key | `400` |
| Vendor `429` | `429` with rate-limit message |
| Vendor `402` | `402` with credits message |
| Other provider failure | `500` with available vendor detail |

## Operational Recommendations

- Use server-managed keys for shared deployments.
- Restrict API access before attaching paid keys.
- Configure billing alerts with every provider.
- Monitor rate-limit and credit responses.
- Add request timeouts before production.
- Review repository excerpts for sensitive data before sending prompts.
- Keep model names centralized if provider churn becomes frequent.
- Add provider contract tests using mocked HTTP responses.

## Adding a Provider

1. Add the provider value to `ProviderType` in `src/types.ts`.
2. Add it to the Zod provider enum in `server.ts`.
3. Add key handling and missing-key errors.
4. Implement request and response parsing.
5. Add the provider to the Setup selector and key UI.
6. Decide its position in Auto mode.
7. Add error tests and update this guide.

Do not add a logo and call it integration. The request path, response parser, failure handling, UI,
types, and documentation all have to arrive at the same party.
