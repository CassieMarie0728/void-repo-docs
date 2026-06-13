# Troubleshooting

Start with the symptom. Follow the checks in order. Randomly reinstalling everything can work, but so
can hitting a television, and neither deserves to be called a diagnostic method.

## Development Server Does Not Start

### `npm` or `node` is not recognized

Install Node.js and reopen the terminal:

```powershell
node --version
npm --version
```

### Port 3000 is already in use

Find the process:

```powershell
Get-NetTCPConnection -LocalPort 3000 | Select-Object OwningProcess
Get-Process -Id <PID>
```

Stop the conflicting process or modify the server to accept a configurable port.

### Module not found

```powershell
Remove-Item -Recurse -Force node_modules
npm ci
```

Use `npm install` instead if intentionally updating the lockfile.

## Type Check Fails

Run:

```powershell
npm run lint
```

Read the first error, not the last fifty consequences. Common causes:

- A provider enum changed in only one location.
- A component prop no longer matches its interface.
- A dependency removed or renamed an export.
- Path aliases are used outside Vite/esbuild-aware code.

## Production Build Fails

```powershell
npm run build
```

Confirm:

- `package-lock.json` matches `package.json`.
- Node.js is current enough for Vite 8.
- `esbuild` and Vite dependencies installed successfully.
- Antivirus did not quarantine a native esbuild binary.

## Generation Button Rejects Input

### Repository mode

Use a complete public GitHub URL:

```text
https://github.com/owner/repository
```

### Web or Android mode

Application name is required. Repository URL is optional.

### Overwrite warning

When the current draft differs from the original, press Forge a second time to confirm replacement.

## Missing API Key

Configure the selected provider in `.env` or the UI.

Auto mode chooses Mistral first, so a configured Gemini key will only be selected when no Mistral
key exists.

Restart the development server after editing `.env`.

## Provider Returns `429`

The vendor rate limit was reached.

- Wait for reset.
- Reduce draft count.
- Check provider quota.
- Use another configured provider.
- Add application-level throttling for shared deployments.

## Provider Returns `402`

The provider reports insufficient credits. Add credits, change provider, or stop asking a remote
model to produce five legal epics simultaneously.

## Generation Returns `500`

Inspect the server terminal. Likely causes:

- Vendor model no longer exists.
- Provider returned an unexpected response.
- Network or DNS failure.
- OpenRouter exhausted all candidate models.
- Request content exceeded provider limits.

Test one draft with a shorter length and explicit provider.

## GitHub Context Fails

- Confirm the repository exists and is public.
- Check the URL format.
- Add `GITHUB_TOKEN` for higher rate limits.
- Verify the token can read the repository.
- Test GitHub API reachability from the server host.

Web and Android targets can continue with manual app details when repository fetch fails.

## Refinement Fails

Refinement always uses Gemini.

- Configure `GEMINI_API_KEY` or a Gemini UI key.
- Confirm the draft and instruction are non-empty.
- Reduce document size.
- Check the server log for model or quota errors.

Selecting Mistral for generation does not make Mistral the refiner. The code is stubbornly specific.

## Draft Was Lost

Check browser site data for `void_editor_draft`.

Drafts disappear when:

- Site data is cleared.
- The application origin changes.
- Private browsing closes.
- Another session overwrites the same origin's storage.
- The user selects the clear-draft control.

There is no server backup.

## Notion Export Fails

Verify:

1. The token belongs to an internal integration.
2. The parent page ID is 32 hexadecimal characters after removing hyphens.
3. The integration is connected to the target page.
4. The token has not been revoked.
5. The document is not empty.

Large documents are truncated to 95 blocks. Copy and paste Markdown manually when richer formatting
or more blocks are required.

## Word Download Is Not a Native DOCX Package

The export is HTML labeled with a `.docx` extension. Microsoft Word generally opens it, but strict
Office Open XML validators may reject it. Implement a real DOCX library if native package fidelity
is required.

## PDF Export Looks Wrong

PDF export uses the browser print dialog.

- Choose Save as PDF.
- Enable background graphics if needed.
- Check print margins.
- Use desktop Chrome or Edge for the most predictable output.

## Android Build Cannot Find Java

```powershell
$env:JAVA_HOME = "C:\Program Files\Android\Android Studio\jbr"
Test-Path "$env:JAVA_HOME\bin\java.exe"
```

Then rerun:

```powershell
npm run android:apk
```

## Android Build Cannot Find the SDK

```powershell
$env:ANDROID_SDK_ROOT = "$env:LOCALAPPDATA\Android\Sdk"
$env:ANDROID_HOME = $env:ANDROID_SDK_ROOT
Test-Path "$env:ANDROID_SDK_ROOT\platform-tools"
```

## APK Opens to a Black Screen

1. Run `npm run build`.
2. Confirm `dist/index.html` exists.
3. Run `npm run cap:sync`.
4. Rebuild the APK.
5. Reinstall it with `adb install -r`.
6. Inspect `adb logcat` for `chromium`, `Capacitor`, and `AndroidRuntime`.
7. Verify `capacitor.config.ts` uses `webDir: 'dist'`.

## Android UI Loads but API Calls Fail

- Confirm internet permission remains in the manifest.
- Confirm the API uses HTTPS.
- Open the API host from the device browser.
- Verify native API URL selection in `src/api.ts`.
- Verify the server allows `capacitor://localhost`.
- Rebuild after changing `VITE_API_BASE_URL`.

## Mobile Menus Cover the Workspace

Below `768px`, both sidebars should begin closed and behave as mutually exclusive overlay drawers.

If stale behavior appears:

- Hard refresh the browser.
- Clear old deployed assets.
- Rebuild and resync Android.
- Confirm the installed APK contains the latest web bundle.

## Still Broken

Collect:

- Exact command.
- Full first error.
- Node and npm versions.
- `npm run lint` result.
- `npm run build` result.
- Relevant server log.
- `adb logcat` excerpt for Android.
- Current commit SHA from `git rev-parse HEAD`.

That evidence turns "it broke" into a solvable engineering problem, which is a dramatic improvement
for only seven bullet points.
