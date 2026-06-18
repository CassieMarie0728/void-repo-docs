# Getting Started

This guide takes the repository from fresh clone to working development server, then proves the
production bundle can survive outside the warm emotional support of hot reload.

## Requirements

### Web development

- Node.js 20 or newer is recommended.
- npm matching the installed Node.js release.
- A network connection for provider and GitHub API calls.
- At least one supported AI provider key.

### Android development

- Android Studio with its bundled JDK 17 or newer.
- Android SDK with platform tools.
- Windows PowerShell for the repository helper scripts.
- The web requirements above, because the Android app packages the Vite build.

See [Android](android.md) for the complete native toolchain.

## Install

```powershell
git clone https://github.com/CassieMarie0728/void-repo-docs.git
Set-Location void-repo-docs
npm install
```

`npm install` restores both web dependencies and Capacitor tooling. It may download a noticeable
portion of civilization. This is normal for modern JavaScript, apparently.

## Configure Environment

Create a local environment file:

```powershell
Copy-Item .env.example .env
```

Configure at least one generation provider:

```dotenv
GEMINI_API_KEY=
MISTRAL_API_KEY=
GROQ_API_KEY=
OPENROUTER_API_KEY=
```

Optional server configuration:

```dotenv
GITHUB_TOKEN=
APP_URL=
NODE_ENV=development
VITE_API_BASE_URL=
```

### Variable behavior

| Variable | Used by | Purpose |
| --- | --- | --- |
| `GEMINI_API_KEY` | Server | Gemini generation and default refinement |
| `MISTRAL_API_KEY` | Server | Mistral generation |
| `GROQ_API_KEY` | Server | Groq generation |
| `OPENROUTER_API_KEY` | Server | OpenRouter generation |
| `GITHUB_TOKEN` | Server | Raises GitHub API limits for repository context fetches |
| `APP_URL` | Server | Adds one exact browser origin to the CORS allowlist |
| `NODE_ENV` | Server | Uses Vite middleware unless set to `production` |
| `VITE_API_BASE_URL` | Client build | Overrides the API base URL |

Never commit `.env`. Secrets in source control are less "configuration" and more "public donation."

## Run Development

```powershell
npm run dev
```

The Express server starts at [http://localhost:3000](http://localhost:3000) and mounts Vite in
middleware mode. Frontend and API traffic therefore share one origin during local development.

## Generate the First Document

1. Open the application.
2. Keep **Repo File** selected.
3. Enter a public GitHub repository URL.
4. Select a document class, tone, length, draft count, and provider.
5. Open **API Vault** if the server environment does not already hold the selected key.
6. Select **Forge Document**.
7. Review every placeholder and factual claim before export.

For web or Android targets, choose the matching platform and provide the application metadata. A
repository URL is optional for those modes; application name is not.

## Verify the Repository

Type-check:

```powershell
npm run lint
```

Create the production frontend and server bundle:

```powershell
npm run build
```

Run the production bundle:

```powershell
$env:NODE_ENV = "production"
npm start
```

The build writes:

- Vite client assets under `dist/`.
- The bundled Express entry point at `dist/server.cjs`.
- A server source map at `dist/server.cjs.map`.

## Useful Commands

| Command | Result |
| --- | --- |
| `npm run dev` | Express plus Vite development server |
| `npm run lint` | TypeScript validation with no output files |
| `npm run build` | Production web and server bundle |
| `npm start` | Run `dist/server.cjs` |
| `npm run cap:sync` | Copy web output and update Android plugins |
| `npm run android:apk` | Build the web app, sync Capacitor, assemble debug APK |
| `npm run android:aab` | Build a release Android App Bundle |
| `npm run android:open` | Open the native project in Android Studio |

## Next

- Learn the full workspace in [User Guide](user-guide.md).
- Understand the process boundaries in [Architecture](architecture.md).
- Diagnose failures in [Troubleshooting](troubleshooting.md).
