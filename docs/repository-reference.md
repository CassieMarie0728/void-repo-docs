# Repository Reference

This is the map for maintainers who need to know where behavior lives before changing three files
and discovering a fourth one at build time.

## Top-Level Map

```text
.
|-- android/                 Capacitor Android project
|-- assets/                  Banner and showcase media
|-- components/ui/           Shared UI primitives
|-- docs/                    Maintainer and operator documentation
|-- lib/                     Shared class-name utility
|-- scripts/                 Build helpers
|-- src/                     React application
|-- server.ts                Express API and production host
|-- capacitor.config.ts      Capacitor application configuration
|-- vite.config.ts           Vite, React, Tailwind, and aliases
|-- package.json             Scripts and dependency declarations
|-- tsconfig.json            TypeScript compiler configuration
|-- .env.example             Environment template
```

## Source Files

| Path | Responsibility |
| --- | --- |
| `src/main.tsx` | React mount point |
| `src/App.tsx` | Primary workspace, generation, editing, persistence, and export logic |
| `src/api.ts` | Axios API base URL selection |
| `src/types.ts` | Shared enums and request/response interfaces |
| `src/index.css` | Tailwind theme and application styling |
| `src/components/ComplianceAudit.tsx` | Heuristic clause audit |
| `src/components/DiffViewer.tsx` | Line-based original/current comparison |
| `src/components/DocToneGlossary.tsx` | Document and tone reference |
| `src/components/NotionExportDialog.tsx` | Notion export UI and storage |
| `server.ts` | Validation, context fetch, provider calls, refinement, Notion export |

## Shared Types

### `DocumentType`

Fifteen values define all supported output classes. When adding one, update:

- `src/types.ts`.
- Glossary descriptions.
- Any UI assumptions or tests.
- Documentation.

The server's native enum validation automatically accepts the new value after import.

### `TargetPlatform`

```text
github_repo
web_app
android_app
```

### `Tone`

```text
Formal
Professional
Friendly
Casual
Laid-back
Deadpool-cool
```

### `Length`

```text
short
medium
long
```

## npm Scripts

| Script | Implementation |
| --- | --- |
| `dev` | `tsx server.ts` |
| `build` | Vite build, then esbuild server bundle |
| `start` | Run `dist/server.cjs` |
| `lint` | `tsc --noEmit` |
| `cap:sync` | Sync web assets and plugins to Android |
| `cap:copy` | Copy web assets to Android |
| `android:gradle` | Run a task through the PowerShell Gradle helper |
| `android:build` | Build web, sync, and run Gradle `build` |
| `android:apk` | Build web, sync, and assemble debug APK |
| `android:apk:release` | Build unsigned release APK |
| `android:aab` | Build release AAB |
| `android:clean` | Run Gradle clean |
| `android:open` | Open Android Studio |

The `clean` script uses Unix `rm -rf` and is not portable to stock PowerShell. Use
`Remove-Item -Recurse -Force dist` on Windows or prefer build-tool-specific cleanup.

## Android Configuration

| Setting | Value |
| --- | --- |
| Application ID | `com.c728.voidrepodocs` |
| Application name | `VOID Repo Docs` |
| Web directory | `dist` |
| Minimum SDK | 24 |
| Target SDK | 36 |
| Compile SDK | 36 |
| Version code | 1 |
| Version name | 1.0 |
| Android Gradle Plugin | 8.13.0 |
| Manifest permissions | `INTERNET` |

## Browser Storage

| Key | Owner |
| --- | --- |
| `void_editor_draft` | `App.tsx` |
| `void_custom_keys` | `App.tsx` |
| `void_selected_provider` | `App.tsx` |
| `void_notion_token` | `NotionExportDialog.tsx` |
| `void_notion_page_id` | `NotionExportDialog.tsx` |

Clearing site data removes all of them. There is no cloud synchronization.

## Build Outputs

| Output | Path |
| --- | --- |
| Production web assets | `dist/` |
| Production server | `dist/server.cjs` |
| Debug APK | `android/app/build/outputs/apk/debug/app-debug.apk` |
| Unsigned release APK | `android/app/build/outputs/apk/release/app-release-unsigned.apk` |
| Release AAB | `android/app/build/outputs/bundle/release/app-release.aab` |

## Major Dependencies

### Runtime

- React and React DOM.
- Express.
- Axios.
- Zod.
- Google GenAI.
- Capacitor.
- Motion.
- React Markdown.
- Lucide React.
- Sonner.
- Base UI and shadcn-style primitives.

### Build

- TypeScript.
- Vite.
- esbuild.
- Tailwind CSS.
- tsx.

## Known Hotspots

Repository history and current size identify:

- `README.md` as the most frequently changed file.
- `src/App.tsx` as the main behavior hotspot.
- `server.ts` as the provider and API hotspot.
- `package.json` and `package-lock.json` as build-risk files.

Changes in those areas deserve broader verification than a cosmetic component edit.
