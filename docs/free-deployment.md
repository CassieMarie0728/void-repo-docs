# VOID on the broke-bitch budget

The default deployment uses OpenRouter's `openrouter/free` router for generation and refinement,
one Render **Free** web service for the UI and Express backend, and GitHub Actions for Android
debug APK builds. Your laptop runs neither model inference nor Android compilation.

## Deploy the web app

1. Push this repository, including `render.yaml`, to GitHub.
2. In Render, create a Blueprint from the repository and deploy the `main` branch.
3. Confirm the service plan is **Free**. No databases, disks, workers, or paid model fallbacks
   are required by this Blueprint.
4. Enter `OPENROUTER_API_KEY` in Render's secret prompt. Never commit it or put it in an Android
   build variable. `OPENROUTER_MODEL` is already `openrouter/free`.
5. Render generates `VOID_API_TOKEN`. Retrieve it privately from the service's Environment page.
   Open the live website, then use Setup → Server Connection to enter that server access token.
   Leave the backend URL blank when using the website on its own server.
6. Save and test the connection, then generate one short draft using **OpenRouter**.

The Blueprint uses `npm ci --include=dev`, runs lint and tests, builds the client/server,
then starts the production server. `/api/health` is the public health check. Other API routes
require the generated access token. The Render-provided origin is included in the CORS allowlist.

Free Render services sleep after 15 idle minutes. The connection test allows 90 seconds for a
cold start. Free allowances are finite: watch the account dashboard, avoid attaching a payment
method if you want usage exhaustion to suspend service instead of permitting overage charges,
and do not upgrade the service plan. This is suitable for personal/hobby use, with cold starts
and no uptime guarantee.

## Download the Android app

1. In the GitHub repository, open **Actions → Android debug APK**.
2. Run the workflow on `main`, or use the run triggered by a matching push.
3. Wait for the lint, tests, web build, and Gradle build to complete.
4. Download the `void-repo-docs-debug-apk` artifact and unzip it to obtain `app-debug.apk`.
5. Install on your Android device, then enter the live HTTPS Render URL and server access token
   in Setup → Server Connection.

Optional: set the repository Actions variable `VOID_API_BASE_URL` to the public Render URL before
building. This supplies a default URL; it must never contain a token or API key. The workflow
retains APK artifacts for three days and cancels superseded builds. A debug APK is for testing;
store distribution still requires your release signing configuration.

## Model behavior and spending

- New installations and API requests without a provider select **OpenRouter** directly.
- OpenRouter's default model is `openrouter/free`; there is no local-model timeout first.
- OpenRouter requests do not fall back to other providers, including when the Auto fallback
  checkbox is enabled. Exhausted free capacity returns an error instead.
- Each draft is a separate request; refinements and AI audit fixes also use requests.
- Repository drafts use [source grounding](grounding.md). Detected script/dialect contradictions
  allow one correction request per affected draft, consuming one additional free request.
- The output allowance defaults to 16,384 tokens (`AI_MAX_TOKENS`). OpenRouter requests use low
  reasoning effort to leave room for the document. Long targets 1,500–2,500 words; model-specific
  limits can still truncate a response, and incomplete output is rejected rather than exported.
- The router chooses the actual free model, so output quality and availability can vary. When
  OpenRouter returns the resolved model name, generated-document provenance records that model.
- The router can select Google-origin models. Removing the Gemini SDK does not exclude every
  Google-origin model from OpenRouter's pool. Pin a non-Google free model if that matters to you.
- Administrators can override `OPENROUTER_MODEL`. Choosing a paid model changes its costs.
  Other cloud providers remain available only when explicitly selected, or through opt-in Auto
  routing for a self-hosted setup. Keep **OpenRouter** selected for this free deployment.

Existing browsers retain any previously selected provider. Change it to OpenRouter in Setup.
Browser-entered provider keys are stored locally under the existing key-vault behavior; server
secrets are preferable for this deployment. The shared VOID access token is session-only.

Official references: [OpenRouter Free](https://openrouter.ai/docs/guides/routing/routers/free-router),
[Render Free](https://render.com/docs/free),
[GitHub Actions billing](https://docs.github.com/en/billing/concepts/product-billing/github-actions).
