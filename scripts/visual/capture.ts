/**
 * Visual baseline capture.
 *
 * Boots a throwaway API (fresh temp database) + Vite, drives the installed Chrome
 * through every screen with a frozen clock and reduced motion, and writes one PNG
 * per view and theme. Compare two runs with `npm run visual:diff`.
 *
 *   npm run visual:capture                 → documentation/visual/current
 *   npm run visual:capture -- --out <dir>  → any folder (e.g. the baseline)
 *
 * Never touches the real database: FOCUSSPACE_DATA_DIR points at a new temp folder.
 */
import { spawn, type ChildProcess } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium, type Page } from 'playwright-core';
import { createServer } from 'vite';
import { strings } from '../../src/constants/strings.ts';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const API_PORT = 4200;
const WEB_PORT = 3200;
const BASE = `http://localhost:${WEB_PORT}`;
const VIEWPORT = { width: 1440, height: 900 };
/** Frozen "now" so dates, timelines and default data render identically every run. */
const FROZEN_NOW = new Date('2026-09-28T10:30:00');
const THEMES = ['dark', 'light'] as const;
/** Sandbox-only account, created in a fresh temp database on every run. */
const SANDBOX = { displayName: 'Visual Test', username: 'visual.test', password: 'sandbox-pass-123' };

const outArg = process.argv.indexOf('--out');
const OUT_DIR = path.resolve(ROOT, outArg > -1 ? process.argv[outArg + 1] : 'documentation/visual/current');

const settle = (page: Page, ms = 450) => page.waitForTimeout(ms);

async function waitForHttp(url: string, timeoutMs = 20_000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url);
      if (res.ok) return;
    } catch { /* not up yet */ }
    await new Promise(r => setTimeout(r, 250));
  }
  throw new Error(`Timed out waiting for ${url}`);
}

function startApi(dataDir: string): ChildProcess {
  const child = spawn(process.execPath, ['server/index.js'], {
    cwd: ROOT,
    env: { ...process.env, PORT: String(API_PORT), FOCUSSPACE_DATA_DIR: dataDir },
    stdio: 'ignore'
  });
  return child;
}

async function main() {
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'focusspace-visual-'));
  fs.rmSync(OUT_DIR, { recursive: true, force: true });
  fs.mkdirSync(OUT_DIR, { recursive: true });

  const api = startApi(dataDir);
  process.env.FOCUSSPACE_API_URL = `http://127.0.0.1:${API_PORT}`;
  const vite = await createServer({ root: ROOT, logLevel: 'error', server: { port: WEB_PORT, strictPort: true, open: false } });
  await vite.listen();
  await waitForHttp(`http://127.0.0.1:${API_PORT}/api/health`);
  // App modules with bundler-style imports load through Vite, exactly as the app resolves them.
  const { MINI_WIDTH, MINI_HEIGHT } = await vite.ssrLoadModule('/src/lib/desktop.ts') as { MINI_WIDTH: number; MINI_HEIGHT: number };

  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const failures: string[] = [];
  let count = 0;

  try {
    const context = await browser.newContext({ viewport: VIEWPORT, deviceScaleFactor: 1, reducedMotion: 'reduce' });
    context.setDefaultTimeout(5000);
    const page = await context.newPage();
    await page.clock.setFixedTime(FROZEN_NOW);

    const shot = async (theme: string, name: string, action?: () => Promise<void>) => {
      try {
        if (action) await action();
        await settle(page);
        // Toasts expire on a timer, so they would make runs differ; hide them.
        await page.addStyleTag({ content: '.toast-container { visibility: hidden !important; }' });
        const dir = path.join(OUT_DIR, theme);
        fs.mkdirSync(dir, { recursive: true });
        await page.screenshot({ path: path.join(dir, `${name}.png`) });
        count++;
      } catch (err) {
        failures.push(`${theme}/${name}: ${(err as Error).message.split('\n')[0]}`);
      }
    };

    const closeOverlays = async () => {
      // Form modals only close through Cancel / X, so try those before Escape.
      for (let i = 0; i < 3; i++) {
        const cancel = page.locator('.modal-backdrop').getByRole('button', { name: strings.common.cancel, exact: true });
        if (await cancel.count()) { await cancel.first().click(); await settle(page, 200); continue; }
        const close = page.locator('.modal-backdrop').getByRole('button', { name: strings.common.close });
        if (await close.count()) { await close.first().click(); await settle(page, 200); continue; }
        await page.keyboard.press('Escape');
        await settle(page, 150);
      }
    };

    const openGlobalMenu = async () => {
      await page.locator('.app-main').click({ button: 'right', position: { x: 12, y: 12 } });
      await page.locator('.popover[role="menu"]').waitFor({ timeout: 3000 });
    };

    const fromGlobalMenu = (label: string) => async () => {
      await openGlobalMenu();
      // Match the label element: the item's accessible name also contains its shortcut hint.
      const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      await page.locator('[role="menuitem"]', {
        has: page.locator('.menu-item-label', { hasText: new RegExp(`^${escaped}$`) })
      }).click();
      await page.locator('.modal-backdrop').waitFor({ timeout: 3000 });
    };

    // ── Setup screen (both themes), then create the sandbox account ──
    await page.goto(BASE);
    await page.locator('.auth-form').waitFor();
    await page.getByRole('button', { name: strings.auth.createAccountBtn }).waitFor();
    for (const theme of THEMES) {
      await page.emulateMedia({ colorScheme: theme });
      await shot(theme, '00-setup');
    }
    await page.emulateMedia({ colorScheme: 'dark' });
    const inputs = page.locator('.auth-form input');
    await inputs.nth(0).fill(SANDBOX.displayName);
    await inputs.nth(1).fill(SANDBOX.username);
    await inputs.nth(2).fill(SANDBOX.password);
    await inputs.nth(3).fill(SANDBOX.password);
    await page.getByRole('button', { name: strings.auth.createAccountBtn }).click();
    await page.locator('.app-shell').waitFor({ timeout: 15_000 });

    // The first-run tour opens by itself.
    await page.locator('.tour-close').waitFor({ timeout: 5000 });
    for (const theme of THEMES) {
      await page.emulateMedia({ colorScheme: theme });
      await shot(theme, '01-tour');
    }
    await page.locator('.tour-close').click();
    await settle(page);

    for (const theme of THEMES) {
      await page.emulateMedia({ colorScheme: theme });

      // ── Pages ──
      const tabs = ['timer', 'tasks', 'calendar', 'stats', 'goals', 'rewards'];
      for (const [i, tab] of tabs.entries()) {
        await shot(theme, `1${i}-tab-${tab}`, async () => {
          await page.locator(`.nav-rail [data-tab="${tab}"]`).click();
        });
      }
      await page.locator('.nav-rail [data-tab="timer"]').click();
      await settle(page);

      // ── Menus ──
      await shot(theme, '20-context-menu', openGlobalMenu);
      await page.keyboard.press('Escape');

      // ── Modals and the pickers inside them ──
      const cm = strings.contextMenu;
      await shot(theme, '30-modal-new-session', fromGlobalMenu(cm.newSession));
      await shot(theme, '31-select-open', async () => { await page.locator('.modal .select-trigger').first().click(); });
      await closeOverlays();

      await shot(theme, '32-modal-new-list', fromGlobalMenu(cm.newList));
      await closeOverlays();

      await page.locator('.nav-rail [data-tab="tasks"]').click();
      await settle(page);
      await shot(theme, '33-modal-new-task', fromGlobalMenu(cm.newTask));
      await closeOverlays();

      await shot(theme, '34-modal-schedule', fromGlobalMenu(cm.scheduleSession));
      await shot(theme, '35-datepicker-open', async () => { await page.locator('.modal .picker-trigger').first().click(); });
      await page.keyboard.press('Escape');
      await shot(theme, '36-timepicker-open', async () => { await page.locator('.modal .picker-trigger').nth(1).click(); });
      await closeOverlays();

      await shot(theme, '37-modal-new-goal', fromGlobalMenu(cm.newGoal));
      await closeOverlays();
      await shot(theme, '38-modal-new-reward', fromGlobalMenu(cm.newReward));
      await closeOverlays();

      await page.locator('.nav-rail [data-tab="timer"]').click();
      await settle(page);
      await shot(theme, '40-modal-notifications', async () => { await page.locator('[data-tour="alerts-btn"]').click(); });
      await closeOverlays();
      await shot(theme, '41-modal-help', async () => { await page.locator('[data-tour="help-btn"]').click(); });
      await closeOverlays();
      await shot(theme, '42-user-menu', async () => { await page.locator('.user-badge-btn').first().click(); });
      await closeOverlays();
    }

    // ── A completed task (checked checkbox). Runs last on the main page: it changes stats. ──
    await page.locator('.nav-rail [data-tab="tasks"]').click();
    await settle(page);
    await page.locator('#tab-tasks input[type="checkbox"]').first().check();
    for (const theme of THEMES) {
      await page.emulateMedia({ colorScheme: theme });
      await shot(theme, '16-task-checked');
    }
    await page.locator('.nav-rail [data-tab="timer"]').click();
    await settle(page);

    // ── Mini player: opened by the main window through Document Picture-in-Picture ──
    for (const theme of THEMES) {
      await page.emulateMedia({ colorScheme: theme });
      try {
        const [pip] = await Promise.all([
          context.waitForEvent('page', { timeout: 5000 }),
          page.locator('[data-tour="mini-player-btn"]').click()
        ]);
        await pip.waitForLoadState();
        await pip.locator('.mini-player').waitFor({ timeout: 5000 });
        fs.mkdirSync(path.join(OUT_DIR, theme), { recursive: true });
        // The default window size, then an enlarged window (the layout is container-query driven).
        for (const [name, size] of [['50-mini', { width: MINI_WIDTH, height: MINI_HEIGHT }], ['51-mini-large', VIEWPORT]] as const) {
          await pip.setViewportSize(size);
          await settle(pip, 700);
          await pip.screenshot({ path: path.join(OUT_DIR, theme, `${name}.png`) });
          count++;
        }
        await pip.close();
        await settle(page);
      } catch (err) {
        failures.push(`${theme}/50-mini: ${(err as Error).message.split('\n')[0]}`);
      }
    }
  } finally {
    await browser.close();
    await vite.close();
    // SQLite keeps the file locked until the API process has fully exited.
    await new Promise<void>(resolve => {
      api.once('exit', () => resolve());
      api.kill();
    });
    fs.rmSync(dataDir, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
  }

  console.log(`Captured ${count} screenshots → ${path.relative(ROOT, OUT_DIR)}`);
  if (failures.length) {
    console.log(`\n${failures.length} view(s) failed:\n  ${failures.join('\n  ')}`);
    process.exitCode = 1;
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
