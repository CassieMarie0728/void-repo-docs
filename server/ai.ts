import axios from "axios";
import { z } from "zod";

export const providerSchema = z.enum(["auto", "selfhosted", "mistral", "groq", "openrouter"]);
export const keysSchema = z.object({
  selfhosted: z.string().max(4096).optional(),
  mistral: z.string().max(4096).optional(),
  groq: z.string().max(4096).optional(),
  openrouter: z.string().max(4096).optional(),
});
export const routingSchema = z.object({
  provider: providerSchema.default("openrouter"),
  customKeys: keysSchema.optional(),
  allowCloudFallback: z.boolean().default(false),
});
type Routing = z.input<typeof routingSchema>;
type Provider = Exclude<z.infer<typeof providerSchema>, "auto">;
type Env = Record<string, string | undefined>;
type Engine = { provider: Provider; baseUrl: string; model: string; key?: string };

export class AIError extends Error {
  constructor(message: string, public status = 502) { super(message); }
}

// Endpoint URLs are administrator-controlled. Never accept a model URL from a request.
export function enginesFor(options: Routing, env: Env = process.env): Engine[] {
  const keys = options.customKeys || {};
  const engines: Engine[] = [{
    provider: "selfhosted",
    baseUrl: env.AI_BASE_URL || "http://127.0.0.1:11434/v1",
    model: env.AI_MODEL || "llama3.2:3b",
    key: keys.selfhosted || env.AI_API_KEY,
  }];
  const clouds = [
    ["mistral", "https://api.mistral.ai/v1", "mistral-large-latest"],
    ["groq", "https://api.groq.com/openai/v1", "llama-3.3-70b-versatile"],
    ["openrouter", "https://openrouter.ai/api/v1", "openrouter/free"],
  ] as const;
  for (const [provider, baseUrl, defaultModel] of clouds) {
    const key = keys[provider] || env[`${provider.toUpperCase()}_API_KEY`];
    if (key) engines.push({ provider, baseUrl, key, model: env[`${provider.toUpperCase()}_MODEL`] || defaultModel });
  }
  const selectedProvider = options.provider || "openrouter";
  if (selectedProvider === "auto") {
    return options.allowCloudFallback ? engines : engines.slice(0, 1);
  }
  const chosen = engines.find(engine => engine.provider === selectedProvider);
  if (!chosen) throw new AIError(`${selectedProvider} is not configured. Add its key in Settings or on the server.`, 400);
  return [chosen];
}

export async function complete(
  options: Routing,
  system: string,
  user: string,
  temperature = 0.5,
  dependencies: { env?: Env; post?: typeof axios.post } = {},
) {
  const env = dependencies.env || process.env;
  const engines = enginesFor(options, env);
  const post = dependencies.post || axios.post;
  let lastStatus = 502;
  let lastMessage = "";
  for (const engine of engines) {
    try {
      const endpoint = new URL(`${engine.baseUrl.replace(/\/+$/, "")}/chat/completions`);
      if (!["http:", "https:"].includes(endpoint.protocol) || endpoint.username || endpoint.password) {
        throw new AIError("AI_BASE_URL must be an HTTP(S) URL without embedded credentials.", 400);
      }
      const response = await post(endpoint.href, {
        model: engine.model,
        messages: [{ role: "system", content: system }, { role: "user", content: user }],
        temperature,
        max_tokens: Number(env.AI_MAX_TOKENS) || 16384,
        // Leave most of the output allowance for the document, including on reasoning models.
        ...(engine.provider === "openrouter" ? { reasoning: { effort: "low" } } : {}),
        stream: false,
      }, {
        timeout: Number(env.AI_TIMEOUT_MS) || 120000,
        maxRedirects: 0,
        headers: {
          "Content-Type": "application/json",
          ...(engine.key ? { Authorization: `Bearer ${engine.key}` } : {}),
          ...(engine.provider === "openrouter" ? { "X-Title": "VOID Repo Docs" } : {}),
        },
      });
      const markdown = response.data?.choices?.[0]?.message?.content;
      if (response.data?.choices?.[0]?.finish_reason === "length") {
        throw new AIError("The model hit its output limit before finishing. The incomplete draft was not saved. Retry the request or choose a different model.");
      }
      if (typeof markdown !== "string" || !markdown.trim()) throw new AIError("The model returned an empty document.");
      return { markdown, provider: engine.provider, model: typeof response.data.model === "string" ? response.data.model : engine.model };
    } catch (error) {
      if (error instanceof AIError && error.status === 400) throw error;
      const status = axios.isAxiosError(error) ? error.response?.status : undefined;
      lastMessage = error instanceof AIError ? error.message : "";
      lastStatus = status === 429 || status === 402 ? status : 502;
      // Log routing metadata only; vendor errors can contain credentials and full drafts.
      console.warn(`AI request failed: provider=${engine.provider}, status=${lastStatus}`);
    }
  }
  throw new AIError(
    lastStatus === 429 ? "AI rate limit reached." : lastStatus === 402 ? "AI provider credits exhausted." :
      lastMessage || (engines[0].provider === "openrouter"
        ? "OpenRouter Free did not complete the request. Free models may be busy; try again shortly. No paid fallback was attempted."
        : `No configured AI engine completed the request. Check your model server and AI_MODEL.${options.allowCloudFallback ? " Cloud fallback attempts also failed." : " Cloud fallback is off."}`),
    lastStatus,
  );
}
