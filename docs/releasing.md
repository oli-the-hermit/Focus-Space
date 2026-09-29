# Releasing Focus Space

Desktop releases are built, signed and published by GitHub Actions (`.github/workflows/release.yml`). Installed apps check GitHub for a newer version each time they open and offer it in a card: **Update and restart** or **Maybe later**. People can turn this off, or check by hand, in **Settings → Updates**.

Before a new version opens the data for the first time, the app saves a copy to `%APPDATA%\com.focusspace.desktop\backups\` (the newest two are kept). Installing a new version never touches the data itself.

## One-time setup

1. **A public GitHub repository.** The app downloads updates without signing in, so the repository must be public. Its `owner/name` goes in [`shared/release.json`](../shared/release.json) as `githubRepo` (set: `oli-the-hermit/Focus-Space`). This also turns on the GitHub links in Help.
2. **An update key.** Updates are signed, and the app refuses anything not signed with your key. Run this yourself; it asks you to choose a password:
   ```bash
   npx tauri signer generate -w "%USERPROFILE%\.tauri\focus-space.key"
   ```
   Keep `focus-space.key` and its password in your password manager. **If you lose either, installed apps can't update any more,** and everyone would have to reinstall by hand once.
3. **The public half into the app.** Paste the one line inside `focus-space.key.pub` into `shared/release.json` as `updaterPubkey`. The `.pub` file is safe to share; the `.key` file never goes into the repository.
4. **The private half into GitHub.** In the repository, open **Settings → Secrets and variables → Actions** and add:
   - `TAURI_SIGNING_PRIVATE_KEY`: the whole contents of `focus-space.key`.
   - `TAURI_SIGNING_PRIVATE_KEY_PASSWORD`: its password.
5. Commit and push.

Builds made before `shared/release.json` was filled in can't update themselves, so anyone running one needs to install the next release by hand, once.

## Each release

1. **Bump the version** in `package.json` and `src-tauri/Cargo.toml` (`npm run audit:versions` checks they match; `tauri.conf.json` reads `package.json`). Update the "What's new" list (`help.whatsNew` in `src/constants/strings.ts`).
2. **Check it:** `npm run check`, `npm run test:rust`, `npm run check:csp`, and the visual diff.
3. **Commit, then tag and push the tag:**
   ```bash
   git tag v1.2.0
   ```
   ```bash
   git push origin v1.2.0
   ```
4. **Wait for the Release workflow** (Actions tab, about 10 minutes). It stops early if the tag doesn't match the version or `shared/release.json` is empty. It then runs the checks, builds the installer, signs it and creates a **draft** release with `latest.json`.
5. **Publish the draft:** review the notes and press **Publish release**. From then on, installed apps offer the update the next time they open.

## If a release goes wrong

- Don't delete a published release to "undo" it. Publish a fixed, higher version instead; the app never installs an older version over a newer one.
- The data from before the update is in `%APPDATA%\com.focusspace.desktop\backups\focusspace-before-<version>.db`. To restore it, close the app and copy it over `focusspace.db` in the folder above.
