# Focus Space

A calm, minimal focus timer with sessions, task lists, goals, landmarks and rewards. It runs as a Windows desktop app or in your browser, and everything stays on your device.

## Get started

**Desktop (Windows 10/11):** download `Focus Space_<version>_x64-setup.exe` from the releases page and run it. It installs for your user only; no admin rights needed. The first launch asks you to create the **main account**, which looks after every profile on this device.

**Web:** see [Build from source](#build-from-source).

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

## Your data

- Everything is stored **on this device** and encrypted with your password. Nothing is sent anywhere.
- Desktop data lives in `%APPDATA%\com.focusspace.desktop\focusspace.db`. To back it up, copy that file while the app is closed.
- **Keep your password safe.** Your data is encrypted with it, so a forgotten password can't be recovered. The main account can remove other profiles, but it can't read them.
- Up to 6 profiles can share one device, each with its own password and data.

## Troubleshooting

- **Something unexpected happened:** choose **Reload**. If it keeps happening, choose **Copy details** and include them in your report.
- **Desktop log:** `%LOCALAPPDATA%\com.focusspace.desktop\logs\`. Attach it when you report a problem.
- **Report a problem:** Help → **Report a problem** opens a pre-filled issue with your version and platform.

## Build from source

Requirements: Node.js 24 (22.18 or later also works). For the desktop app, also Rust (stable, MSVC) and WebView2 (preinstalled on Windows 11).

```bash
npm install
```

| Command | What it does |
|---|---|
| `npm run dev` | Web version with live reload: API on port 4000, app on http://localhost:3000 |
| `npm start` | Production web build, served with the API from one port (4000) |
| `npm run desktop` | Desktop app in development |
| `npm run desktop:build` | Windows installer in `src-tauri/target/release/bundle/nsis/` |
| `npm run check` | Types, lint, unit tests, audits and the web API parity test |
| `npm run test:parity` | The same API scenarios against the web server and the desktop backend |
| `npm run check:csp` | Loads the production build under both security policies |
| `npm run visual:capture` then `npm run visual:diff` | Screenshot every view and compare with the baseline |

The web version stores its data in `server/data/`. Set `FOCUSSPACE_DATA_DIR` to use another folder.

### Project layout

- `src/`: the React app (shared by web and desktop). Text lives in `src/constants/strings.ts`; the voice guide is `docs/microcopy.md`.
- `server/`: the web API (Express + SQLite).
- `src-tauri/`: the desktop shell and a Rust port of the same API. `shared/api-scenarios.json` keeps the two backends in step.
- `shared/`: limits and test scenarios used by both backends and the app.

## License

Free to use, modify and build on, including for your own commercial work. You may not sell Focus Space or anything built from it, including as paid hosting or support. This is the MIT License with the [Commons Clause](https://commonsclause.com/); see [LICENSE](LICENSE). Because of that restriction, Focus Space is source-available rather than open source.
