# System Specification & Operational Constraints Sheet

> **Last Updated / Timestamp:** 2026-08-18
> **Project:** FocusSpace Time Tracker (`focus-space-time-tracker`)

===============================================================================
FOCUSSPACE ACCOUNTS & PRIVACY ARCHITECTURE (2026-08-18)
===============================================================================

[PURPOSE]
- Multi-profile support with username/password login, hierarchical
  permissions, and encrypted per-profile data. No email or phone is
  collected or stored anywhere.

[ARCHITECTURE]
- The app is now a two-process local stack:
  * API server: `server/index.js` (Express 5 + better-sqlite3),
    binds to `127.0.0.1:4000`.
  * Web app: Vite dev server (`npm run dev`, port 3000) proxies `/api`
    to the API. Production: `npm run start` builds and serves `dist/`
    from the API itself (single port 4000, `--static` mode).

[RUNBOOK]
- `npm run dev`      -> starts API + Vite together (concurrently).
- `npm run server`   -> API only.
- `npm run start`    -> production mode (build + serve on :4000).
- Database file: `server/data/focusspace.db` (gitignored, WAL mode).
  Backup = copy the file while the server is stopped.

[DATABASE SCHEMA (SQLite)]
- profiles(id, username UNIQUE NOCASE, display_name, avatar,
    role CHECK('owner'|'user'), salt, password_hash,
    data_iv, data_cipher, created_at, updated_at)
- sessions(token_hash PK, profile_id FK CASCADE, created_at, expires_at)
- The first created profile is `owner` (main account). All subsequent
  profiles default to `user`. MAX_PROFILES = 6 (server-enforced).

[SECURITY MODEL]
- Passwords: PBKDF2-SHA256, 16-byte random salt, 310,000 iterations,
  constant-time comparison. Stored as hashes only; never logged.
- Per-profile data: AES-256-GCM, key derived client-side from the
  profile password (WebCrypto PBKDF2, same parameters). Plaintext never
  leaves the browser; the database contains only ciphertext + hashes.
- Consequence (by design): the owner CANNOT read or reset another
  profile's password or data. Owner may only rename/delete profiles.
- Password change requires the current password and re-encrypts the
  blob under a new salt+key; all other sessions of that profile are
  invalidated.
- Sessions: 32-byte random tokens, SHA-256 hashed in the DB, 30-day
  sliding expiry, persisted in browser localStorage with exported data
  encryption key until explicit logout.
- Brute-force protection on all auth/password endpoints: 5 failures ->
  30 s lockout per IP+username, plus min-delay on failures.
- Rate limiting is in-memory; sessions and files are local.

[THREAT MODEL / HONEST LIMITS]
- Protects against: casual snooping of the DB file, other local users
  reading your profiles, stolen/copied database files.
- Does NOT protect against: someone with full control of your OS user
  session while the app is unlocked (keys live in browser memory), or
  keylogging. This is inherent to any local app without a hardware
  keystore.

[PERMISSIONS MATRIX]
- owner: add profiles, rename any profile, delete any profile (never
  itself), reset all user profiles (requires its own password),
  manage appearance and its own data/full profile editing.
- user: rename/delete ONLY its own profile (delete requires password),
  edit its own photo/name/username/password, appearance setting.
- Other profiles are only reachable through their own username +
  password login.

[LEGACY MIGRATION]
- On first-run setup, a previous `focusspace_v1` localStorage payload
  (if present) is imported into the new owner profile and the key is
  removed.

===============================================================================
ENVIRONMENT SPECIFICATION & OPERATIONAL CONSTRAINTS
===============================================================================

[SYSTEM CONTEXT]
- Operating System: Windows 11 IoT Enterprise LTSC (Version 10.0.26100, 64-bit)
- Shell Environment: PowerShell 7.6.3 (pwsh)
- Node.js Version: v24.15.0
- Package Manager: npm (v11.12.1)
- React Version / Setup: React 18.2.0, Vite 5.2.0, TypeScript 5.2.2
- Primary Python/Tooling Versions (if applicable): Python 3.13.0, Git 2.54.0

[INSTALLED TOOLING & ENVIRONMENT CAPABILITIES]
- Available CLI Tools: git (v2.54.0), node (v24.15.0), npm (v11.12.1), npx (v11.12.1), vite (v5.4.21), tsc / typescript (v5.9.3), python (v3.13.0)
- Missing/Unavailable Tools: pnpm, yarn, eslint, prettier (DO NOT attempt to use tools outside this list unless instructed to install them).
- Package Manager Command Standard: Always use npm run for executing scripts. Never mix package managers.

===============================================================================
WORKSPACE BOUNDARIES & DIRECTORY CONSTRAINTS
===============================================================================

1. STRICT SCOPE ENFORCEMENT:
   - You MUST NOT read, search, modify, or execute commands outside the current workspace directory (`./`).
   - Do NOT attempt to scan global system paths, system node_modules, `~/.config`, `/usr/bin`, or user root paths.
   - Do NOT run system diagnostic commands to check installed global software unless explicitly asked. Assume the environment declared above is accurate.

2. PATH RESOLUTION:
   - Always reference relative paths from the root of the React workspace (e.g., `./src/components/Timer.jsx`).
   - Never generate absolute paths specific to the host machine.

===============================================================================
EXECUTION & CODE MODIFICATION GUIDELINES
===============================================================================

1. NO BLIND SHELL ATTEMPTS:
   - Do NOT execute commands that probe system-wide configurations or run unapproved global installers.
   - For package additions, propose the exact `npm install` command first or edit `package.json` directly.

2. REACT PORTING & PARITY PARADIGM:
   - Use declarative React state/hooks (`useState`, `useReducer`, `useEffect`, `useCallback`) instead of imperatively manipulating the DOM (`document.getElementById`, `innerHTML`).
   - Keep global application state structured in React Context or custom hooks to mirror the original `focusspace_v1` LocalStorage schema.
   - Maintain strict UI and feature parity with the legacy single-file codebase without inventing external dependencies.

3. COMMAND EXECUTION RUNTIME & LOCAL TOOLING (TESTED LOG):
   - 📁 Workspace-Local Node Runtime `./npm/nodejs/` (gitignored):
     Contains full local Node.js binaries (`node.exe`, `npm.cmd`, `npx.cmd`, `node_modules/npm`).
     Future agents can run commands directly using this workspace-local path:
     * `& ".\npm\nodejs\npm.cmd" run build`
     * `& ".\npm\nodejs\npm.cmd" run dev`
     * `& ".\npm\nodejs\node.exe" server/index.js`
     * Or prepending to PATH: `$env:PATH = "$PWD\npm\nodejs;$PWD\npm;$env:PATH"`
   - ⚠️ Sandbox Settings Note:
     Remove `C:\Program Files\nodejs` from the IDE's Sandbox Allowed Paths to prevent Windows ACL access errors (`granting access to C:\Program Files\nodejs: Access is denied`). All tools are now fully available within the workspace `./npm/nodejs/`.


