# Focus Space

A calm, minimal focus timer with sessions, task lists, goals, landmarks and rewards. It runs as a Windows desktop app or in your browser, and everything stays on your device.

Made by San Milano ([@oli-the-hermit](https://github.com/oli-the-hermit)).

## Get started

**Desktop (Windows 10/11):** download `Focus Space_<version>_x64-setup.exe` from the [releases page](https://github.com/oli-the-hermit/Focus-Space/releases/latest) and run it. It installs for your user only; no admin rights needed. The first launch asks you to create the **main account**, which looks after every profile on this device.

**Linux and macOS:** ready-made versions are coming very soon. Until then, you can run Focus Space in your browser, which works on any system:

1. Install [Node.js](https://nodejs.org/) (version 24 or later).
2. Download the code: on this page, choose **Code → Download ZIP** and unzip it (or clone the repository).
3. Open a terminal in that folder and run `npm install`, then `npm start`.
4. Open http://localhost:4000 in your browser. Keep the terminal open while you use the app; your data stays in the `server/data` folder.

Prefer a desktop app on Linux or macOS already? You can build it yourself; see [Desktop app on Linux and macOS](#desktop-app-on-linux-and-macos).

A short tour opens on first use. You can replay it any time from **Help** (the `?` button, top right).

## How it works

| Page | What it's for |
|---|---|
| **Timer** | Sessions play like tracks: press play to focus, and the break comes right after. Each session has its own focus and break length, and can show one or more task lists while you work. |
| **Tasks** | Group tasks into lists that any session can reuse. Drag to reorder and tick them off; Focus Space times how long each task took. |
| **Calendar** | Schedule sessions by week, day or month, and drag them to move. You get a heads-up before each one starts. |
| **Stats** | Daily averages, your most productive days and a log of finished tasks. |
| **Goals** | Break bigger goals into landmarks and tick them off as you go. |
| **Rewards** | Link a reward to a session, goal or landmark. It unlocks when you finish that, then you claim it. Rewards with no link can be claimed right away. |

**Right-click** almost anything for its actions, or press <kbd>Shift</kbd>+<kbd>F10</kbd> on the focused item.

**Mini player:** keeps a small timer on top of your other windows. Resize it into a compact, tall or wide layout. In the browser it uses Picture-in-Picture (Chrome and Edge).

**Alerts:** choose when Focus Space nudges you, when a phase ends and before scheduled sessions, from the bell button.

### Keyboard shortcuts

| Keys | Action |
|---|---|
| <kbd>Space</kbd> | Start or pause the timer |
| <kbd>S</kbd> | Skip to the next phase |
| <kbd>R</kbd> | Reset the timer |
| <kbd>N</kbd> | New session |
| <kbd>M</kbd> | Open or close the mini player |
| <kbd>?</kbd> | Open help |
| <kbd>Shift</kbd>+<kbd>F10</kbd> | Open the menu for the focused item |

Shortcuts pause while a menu or dialog is open.

## Updates

The desktop app keeps itself up to date. When a new version is out, a card offers it the next time you open Focus Space: choose **Update and restart**, and it reopens where you left off a moment later. Your data stays as it is, and the app saves a copy of it first, just in case.

Prefer to decide yourself? In **Settings → Updates**, turn off **Tell me when an update is ready**, and use **Check for updates** whenever you like.

## Your data

- Everything is stored **on this device** and encrypted with your password. Your data never leaves it; the desktop app only contacts GitHub to check for updates (you can turn that off in Settings).
- Desktop data lives in `%APPDATA%\com.focusspace.desktop\focusspace.db`. Updating or reinstalling never touches it. For your own backup, copy that file while the app is closed; the app also keeps a copy from before each update in the `backups` folder next to it.
- **Keep your password safe.** Your data is encrypted with it, so a forgotten password can't be recovered. The main account can remove other profiles, but it can't read them.
- Up to 6 profiles can share one device, each with its own password and data.

## Troubleshooting

- **Something unexpected happened:** choose **Reload**. If it keeps happening, choose **Copy details** and include them in your report.
- **Desktop log:** `%LOCALAPPDATA%\com.focusspace.desktop\logs\`. Attach it when you report a problem.
- **Report a problem:** Help → **Report a problem** opens a pre-filled issue with your version and platform.

## Build from source

Requirements: Node.js 24 (22.18 or later also works). For the desktop app on Windows, also Rust (stable, MSVC) and WebView2 (preinstalled on Windows 11); for Linux and macOS, see [below](#desktop-app-on-linux-and-macos).

```bash
npm install
```

| Command | What it does |
|---|---|
| `npm run dev` | Web version with live reload: API on port 4000, app on http://localhost:3000 |
| `npm start` | Production web build, served with the API from one port (4000) |
| `npm run desktop` | Desktop app in development |
| `npm run desktop:build` | Windows installer in `src-tauri/target/release/bundle/nsis/` (releases are built by GitHub Actions; see [docs/releasing.md](docs/releasing.md)) |
| `npm run check` | Types, lint, unit tests, audits and the web API parity test |
| `npm run test:parity` | The same API scenarios against the web server and the desktop backend |
| `npm run check:csp` | Loads the production build under both security policies |
| `npm run visual:capture` then `npm run visual:diff` | Screenshot every view and compare with the baseline |

The web version stores its data in `server/data/`. Set `FOCUSSPACE_DATA_DIR` to use another folder.

### Desktop app on Linux and macOS

Official Linux and macOS versions are on the way. Building one yourself works the same way, but these builds haven't been tested yet, so expect some rough edges (for example, the window buttons follow the Windows style). Self-built copies don't update themselves: download the latest code and build again.

**Linux (Debian or Ubuntu):** install the system libraries and [Rust](https://rustup.rs/), then build an AppImage:

```bash
sudo apt install libwebkit2gtk-4.1-dev build-essential curl wget file libxdo-dev libssl-dev libayatana-appindicator3-dev librsvg2-dev
```
```bash
npm install
```
```bash
npm run tauri build -- --bundles appimage
```

The app is in `src-tauri/target/release/bundle/appimage/`. Your data lives in `~/.local/share/com.focusspace.desktop/`.

**macOS:** install Apple's command line tools and [Rust](https://rustup.rs/), then build the app:

```bash
xcode-select --install
```
```bash
npm install
```
```bash
npm run tauri build -- --bundles app
```

The app is in `src-tauri/target/release/bundle/macos/`. The first time, open it with right-click → **Open**, because it isn't signed yet. Your data lives in `~/Library/Application Support/com.focusspace.desktop/`.

### Project layout

- `src/`: the React app (shared by web and desktop). Text lives in `src/constants/strings.ts`; the voice guide is `docs/microcopy.md`.
- `server/`: the web API (Express + SQLite).
- `src-tauri/`: the desktop shell and a Rust port of the same API. `shared/api-scenarios.json` keeps the two backends in step.
- `shared/`: limits and test scenarios used by both backends and the app.

## About this project

I built Focus Space for two reasons. The first was personal: I wanted to stay focused and get more done, with a simple, clean app that does its job without adding distractions of its own.

The second was to learn. This is my first app built to a professional standard, or at least that's the goal. Focus timers aren't a new idea, and the app is small on purpose, which made it a good project for learning to build software the right way. I aim to keep my code clean, easy to grow and easy to maintain: every rule, text and design value lives in one place, parts are reused instead of copied, and everything stays as simple as it can be. The result should be a codebase almost anyone can read, extend or improve.

### Made for people, by people

AI did a large share of the work, but I reviewed every step, always with the person using the app in mind. The first version was built with Gemini 3.8 Flash; Claude Opus 5.5 later expanded and finished it.

### Your experience comes first

People matter more than features or looks. This is a first release: it has been tested and reviewed carefully, but some rough edges may remain. Your feedback shapes what comes next. For example:

- **First impressions:** was it clear what to do when you first opened the app? Did the tour help?
- **What you use:** which features do you use every day, and which ones do you never touch?
- **What got in the way:** was anything confusing, slow or harder than it should be?
- **Comfort:** is the text easy to read in light and dark mode? Does it work well with just the keyboard?
- **Your routine:** does the timer fit the way you work? What would you add, change or remove?

Share your thoughts by [opening an issue](https://github.com/oli-the-hermit/Focus-Space/issues/new).

### Something not working?

If you run into a bug, an error or trouble installing, please [open an issue](https://github.com/oli-the-hermit/Focus-Space/issues/new). The quickest way is **Help → Report a problem** in the app: it opens a new issue with the app version and your platform already filled in. Tell me what you did, what you expected and what happened instead; a screenshot helps too.

### Free, and staying free

Focus Space is free and will stay free. Use it for personal or professional work, change it and build on it as you like. The one thing that isn't allowed is selling it, or anything made from it. See [License](#license) for the details.

## License

Free to use, modify and build on, including for your own commercial work. You may not sell Focus Space or anything built from it, including as paid hosting or support. This is the MIT License with the [Commons Clause](https://commonsclause.com/); see [LICENSE](LICENSE). Because of that restriction, Focus Space is source-available rather than open source.
