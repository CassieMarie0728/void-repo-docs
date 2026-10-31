# AI Providers

See [Self-hosting](self-hosting.md) for the current model configuration, routing order,
privacy controls, cloud fallback, web deployment and Android setup.

The default provider is OpenRouter with model `openrouter/free`. It is selected directly; requests do not try local inference first. See [Free deployment](free-deployment.md).

All document generation, refinement, and audit fixes use the shared provider router in
`server/ai.ts`. Auto uses the self-hosted endpoint by default. Cloud fallback must be
explicitly enabled. Explicit provider selection always uses only that provider.

Request routing fields:

```json
{"provider":"auto","allowCloudFallback":false,"customKeys":{"selfhosted":"","mistral":"","groq":"","openrouter":""}}
```

The same fields apply to `/api/generate` and `/api/refine`. Self-hosted endpoint and model
selection are server configuration; clients cannot supply arbitrary inference URLs.
