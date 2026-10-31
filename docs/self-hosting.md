# Own the engine

The app now defaults to OpenRouter Free. For the recommended laptop-friendly setup, see [Free deployment](free-deployment.md). The instructions below apply when you explicitly select Self-hosted or Auto.

VOID runs as one Express backend and a shared React client for the web and Android. Generation,
refinement and audit fixes use the same provider router. No Google AI SDK, AI Studio runtime,
or hardcoded Cloud Run service is required.

## Local development

Install Node.js 22.12+ and Ollama. From this repository in PowerShell:

```powershell
npm install
Copy-Item .env.example .env
ollama pull llama3.2:3b
npm run dev
```

Open `http://localhost:3000` and select **Self-hosted model** in Setup. The local endpoint is `http://127.0.0.1:11434/v1`.
The model must already be downloaded. Choose a larger model if your hardware permits;
the small default is an approachable starting point, not a legal quality guarantee.

Other OpenAI-compatible inference servers can be used by setting `AI_BASE_URL`, `AI_MODEL`
and, if required, `AI_API_KEY` on the backend. Set the base through `/v1`, without
`/chat/completions`. The backend appends that path. The model is never executed inside
the Android APK or browser.

## Routing and privacy

- **Auto, default:** self-hosted only.
- **Auto, cloud fallback enabled:** self-hosted → Mistral → Groq → OpenRouter, skipping
  unconfigured cloud providers. Repository context and drafts may leave your server.
- **Explicit provider:** uses only that provider, with no automatic cross-provider retry.
- The fallback switch starts off on every app load and applies to generation and refinement.
- Model URLs come only from server environment configuration, never from request bodies.
- Each attempt has a timeout (`AI_TIMEOUT_MS`, default 120000 ms), rejects empty or truncated
  responses and does not follow redirects with credentials.
- Browser key overrides retain the existing local-storage behavior. Prefer server-side environment
  keys for shared deployments. Server access tokens are stored only in session storage.

Cloud model IDs are configurable through `MISTRAL_MODEL`, `GROQ_MODEL`, and `OPENROUTER_MODEL`.
Cloud provider availability and model permissions depend on your account.

## Production web

```powershell
npm ci
npm run lint
npm test
npm run build
$env:NODE_ENV="production"
npm start
```

The browser files are in `dist/client`; the backend is `dist/server.cjs`. Put an HTTPS reverse
proxy in front of port 3000. Set `APP_URL` to the web origin and `VOID_API_TOKEN` to a long random
secret before allowing other devices to connect. Add the access token in Setup → Server Connection.
`GET /api/health` is public and reports backend liveness only; other API routes require the token
when configured. `GET /api/ai/status` reports configuration, not model readiness.

The web manifest supports installation as an app. The service worker caches the shell and static
assets after they have been loaded. Existing local drafts remain available offline; generation,
refinement, GitHub reads and Notion exports need a reachable backend and their respective services.
This is not on-device inference. Never cache API responses or credentials in the service worker.

## Docker Compose

```sh
docker compose up -d --build
docker compose exec ollama ollama pull llama3.2:3b
```

Open `http://localhost:3000`. The Compose service binds to loopback. Add a reverse proxy for remote
HTTPS access. Models persist in the `models` volume. The default configuration uses CPU inference;
GPU configuration depends on the deployment host. Docker Desktop is required on Windows.

## Android

The Android client packages `dist/client` using Capacitor. It does not bundle the Express backend,
server secrets, or model weights. Configure a reachable HTTPS VOID backend inside Setup → Server
Connection, then save and test the connection. A blank URL uses the current web origin on the web;
Android requires an explicit backend URL or `VITE_API_BASE_URL` at build time.

```powershell
npm run android:apk
```

Requires Android Studio, the Android SDK and JDK 21+. The helper discovers the Studio JDK and SDK
or uses `JAVA_HOME` and `ANDROID_SDK_ROOT`. Debug APK output:
`android/app/build/outputs/apk/debug/app-debug.apk`. Release signing remains a deployment step;
configure your own signing key before publishing. `npm run android:aab` builds a release bundle
after signing is configured. Native installation and device testing require an Android device or emulator.

The Android WebView uses HTTPS by default. HTTP localhost addresses are accepted for browser
development, but Android may block cleartext traffic; use HTTPS for native testing. Localhost on a
phone means the phone, not the computer running Ollama.

## Verification

`npm test` checks default privacy, fallback ordering, explicit-provider isolation, endpoint/model
configuration, missing keys, empty/truncated output, and sanitized quota failures with mocked
provider responses. Real model quality and provider credentials need a live inference smoke test.
Generated legal language is a draft for review; tone never makes it legally guaranteed.

## Current verification limits

The application test suite uses controlled model responses; it does not certify model-generated
legal quality. Browser QA covers desktop/mobile layout and the generation/connection flow.
Native plugin synchronization can be checked without an Android SDK. APK compilation and device
behavior require JDK 21+, the Android SDK, and a device or emulator.

The dependency refresh removed all reported critical/high advisories at implementation time.
Six moderate advisories remain in Express/qs and Capacitor CLI filesystem dependencies. No major
version downgrade was forced to silence the audit. Re-run `npm audit` when preparing a release.
