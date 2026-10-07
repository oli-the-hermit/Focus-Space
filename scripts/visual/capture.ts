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
import { PNG } from 'pngjs';
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
  let checks = 0;

  try {
    const context = await browser.newContext({ viewport: VIEWPORT, deviceScaleFactor: 1, reducedMotion: 'reduce' });
    context.setDefaultTimeout(5000);
    const page = await context.newPage();
    await page.clock.setFixedTime(FROZEN_NOW);

    const shot = async (theme: string, name: string, action?: () => Promise<void>) => {
      try {
        if (action) await action();
        await settle(page);
        // Toasts and the bell's dot expire on timers, so they would make runs differ; hide
        // them, except in views taken with html.show-toasts (48-toast-success).
        await page.addStyleTag({ content: 'html:not(.show-toasts) .toast-container, html:not(.show-toasts) .bell-dot { visibility: hidden !important; }' });
        // A profile's "created" date comes from the API's real clock (not the frozen one).
        await page.addStyleTag({ content: '.profile-row-meta { visibility: hidden !important; }' });
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

    const openAppearance = async () => {
      await page.locator('.user-badge-btn').first().click();
      await page.getByRole('menuitem', { name: strings.userMenu.appearance }).click();
      await page.locator('.modal-backdrop').waitFor({ timeout: 3000 });
    };
    // A picked color also shows under Recent colors, so take the first match.
    const pickAccent = (id: keyof typeof strings.appearance.colors) =>
      page.getByRole('radio', { name: strings.appearance.colors[id], exact: true }).first().click();

    // ── Setup screen (both themes), then create the sandbox account ──
    // The first load waits for Vite to transform the app, which can take a while after edits.
    await page.goto(BASE, { timeout: 60_000 });
    await page.locator('.auth-form').waitFor({ timeout: 60_000 });
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

      // ── Hover state: the drag grip only shows on a hovered row ──
      await shot(theme, '17-grip-hover', async () => { await page.locator('#sessionsList .queue-item').nth(1).hover(); });
      // A hovered task row: its actions take room only now, pushing any time badge left.
      await shot(theme, '18-task-row-hover', async () => { await page.locator('#tab-timer .task-row').first().hover(); });
      await page.mouse.move(0, 0);

      // ── Menus ──
      await shot(theme, '20-context-menu', openGlobalMenu);
      await page.keyboard.press('Escape');

      // ── Modals and the pickers inside them ──
      const cm = strings.actions;
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
      // The picker loads its emoji catalog (a separate chunk) on first open.
      await shot(theme, '39-emoji-picker', async () => {
        await page.locator('.modal .emoji-field').click();
        await page.locator('.emoji-picker .emoji-cell').first().waitFor({ timeout: 10_000 });
      });
      await page.keyboard.press('Escape');
      await closeOverlays();

      await page.locator('.nav-rail [data-tab="timer"]').click();
      await settle(page);
      await shot(theme, '40-modal-notifications', async () => { await page.locator('[data-tour="alerts-btn"]').click(); });
      await closeOverlays();
      await shot(theme, '41-modal-help', async () => { await page.locator('[data-tour="help-btn"]').click(); });
      // About: the version, with the alpha badge and note while release.json marks a test version.
      await shot(theme, '49-help-about', async () => { await page.locator('.list-row', { hasText: strings.help.aboutDesc }).click(); });
      await closeOverlays();
      await shot(theme, '42-user-menu', async () => { await page.locator('.user-badge-btn').first().click(); });
      await closeOverlays();

      // ── Appearance: the default accent, a vibrant and a muted one; back to Solar lime after ──
      await shot(theme, '43-appearance', openAppearance);
      await shot(theme, '44-appearance-vibrant', () => pickAccent('nebula-purple'));
      await closeOverlays();
      await shot(theme, '45-timer-vibrant');
      await openAppearance();
      await shot(theme, '46-appearance-muted', () => pickAccent('slate'));
      await pickAccent('solar-lime');
      await closeOverlays();

      // ── Settings: notifications, profiles; saving shows a success toast and the bell's dot ──
      await shot(theme, '47-settings', async () => {
        await page.locator('.user-badge-btn').first().click();
        await page.getByRole('menuitem', { name: strings.userMenu.settings }).click();
        await page.locator('.modal .notif-form').waitFor({ timeout: 3000 });
      });
      const soundSwitch = page.locator('.modal .notif-form input.switch').last();
      const saveNotifications = () => page.locator('.modal .notif-form').getByRole('button', { name: strings.common.save, exact: true }).click();
      await soundSwitch.click();
      await saveNotifications();
      await page.evaluate(() => document.documentElement.classList.add('show-toasts'));
      await shot(theme, '48-toast-success');
      await page.evaluate(() => document.documentElement.classList.remove('show-toasts'));
      // Put the setting back so later views match.
      await soundSwitch.click();
      await saveNotifications();
      await closeOverlays();
    }

    // ── Wide window: the 12-column grid, the expanded drawer, a goal description being edited ──
    for (const theme of THEMES) {
      await page.emulateMedia({ colorScheme: theme });
      await page.setViewportSize({ width: 1920, height: 1080 });
      await page.locator('.nav-rail [data-tab="goals"]').click();
      await settle(page);
      await page.mouse.move(0, 0);
      await shot(theme, '54-goals-wide');
      await shot(theme, '55-drawer-expanded', async () => {
        await page.getByRole('button', { name: strings.rail.expand }).click();
      });
      // The drawer choice is stored per device: put the rail back for the views after this.
      await page.getByRole('button', { name: strings.rail.collapse }).click();
      await shot(theme, '56-goal-description', async () => {
        await page.locator('#tab-goals .goal-card').first()
          .getByRole('textbox', { name: strings.goals.descriptionLabel }).click();
        await page.keyboard.type('Four focused sessions before lunch.');
      });
      // Escape puts the saved (empty) text back, so nothing is saved.
      await page.keyboard.press('Escape');
      await page.setViewportSize(VIEWPORT);
      await page.locator('.nav-rail [data-tab="timer"]').click();
      await settle(page);
    }

    // ── Behavior checks: keyboard shortcuts pause while a menu is open ──
    const check = async (name: string, fn: () => Promise<boolean>) => {
      checks++;
      try { if (!(await fn())) failures.push(`check: ${name}`); } catch (err) { failures.push(`check: ${name}: ${(err as Error).message.split('\n')[0]}`); }
    };
    await check("A toast lights the bell's dot, and opening the bell clears it", async () => {
      // The Settings saves above just showed success toasts.
      const dot = page.locator('.bell-dot');
      const lit = (await dot.getAttribute('class'))?.split(' ').includes('is-success') ?? false;
      await page.locator('[data-tour="alerts-btn"]').click();
      await page.locator('.modal-backdrop').waitFor({ timeout: 3000 });
      const cleared = (await dot.count()) === 0;
      await closeOverlays();
      return lit && cleared;
    });
    await check('The emoji picker finds "coffee" and puts ☕ in the reward form', async () => {
      await fromGlobalMenu(strings.actions.newReward)();
      await page.locator('.modal .emoji-field').click();
      await page.locator('.emoji-picker input').fill('coffee');
      await page.locator('.emoji-picker').getByRole('button', { name: 'hot beverage', exact: true }).click();
      // Picking closes the picker (after its exit animation).
      await page.locator('.emoji-picker').waitFor({ state: 'detached', timeout: 2000 });
      const shown = ((await page.locator('.modal .emoji-field').textContent()) ?? '').replace(/️/g, '');
      await closeOverlays();
      return shown === '☕';
    });
    await check('N is ignored while a menu is open', async () => {
      await openGlobalMenu();
      await page.keyboard.press('n');
      await settle(page, 300);
      const opened = await page.locator('.modal-backdrop').count();
      await page.keyboard.press('Escape');
      await settle(page, 300);
      return opened === 0;
    });
    await check('N opens a new session when nothing is open', async () => {
      await page.locator('.app-main').click({ position: { x: 12, y: 12 } });
      await page.keyboard.press('n');
      await page.locator('.modal-backdrop').waitFor({ timeout: 3000 });
      await closeOverlays();
      return (await page.locator('.modal-backdrop').count()) === 0;
    });

    // ── A completed task (checked checkbox). Runs last on the main page: it changes stats. ──
    await page.locator('.nav-rail [data-tab="tasks"]').click();
    await settle(page);
    await page.locator('#tab-tasks input[type="checkbox"]').first().check();
    for (const theme of THEMES) {
      await page.emulateMedia({ colorScheme: theme });
      await shot(theme, '16-task-checked');
    }
    // ── Duplicate a scheduled session: a pre-filled form; the copy sits beside the original ──
    await page.locator('.nav-rail [data-tab="calendar"]').click();
    await settle(page);
    await check('Duplicate opens a pre-filled form and the copy sits beside the original', async () => {
      const original = page.locator('.cal-event-card').first();
      const title = (await original.locator('.cal-event-title').textContent())?.trim() ?? '';
      await original.click({ button: 'right' });
      await page.getByRole('menuitem', { name: strings.common.duplicate, exact: true }).click();
      await page.locator('.modal-backdrop').waitFor({ timeout: 3000 });
      const prefilled = await page.locator('#eventTitle').inputValue();
      await page.locator('.modal').getByRole('button', { name: strings.modals.scheduleEvent, exact: true }).click();
      await settle(page, 300);
      const copy = page.locator('.cal-event-card').filter({ has: page.locator('.cal-event-title', { hasText: prefilled }) });
      const [a, b] = [await original.boundingBox(), await copy.first().boundingBox()];
      return prefilled === strings.common.copyOf.replace('{name}', title)
        && !!a && !!b && Math.abs(a.y - b.y) < 1 && Math.abs(a.x - b.x) > 10;
    });
    for (const theme of THEMES) {
      await page.emulateMedia({ colorScheme: theme });
      await shot(theme, '19-calendar-duplicate');
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
        // The default window size, an enlarged window and a tall one with the progress ring
        // (the layout is container-query driven).
        const sizes = [
          ['50-mini', { width: MINI_WIDTH, height: MINI_HEIGHT }],
          ['51-mini-large', VIEWPORT],
          ['52-mini-portrait', { width: 320, height: 480 }]
        ] as const;
        for (const [name, size] of sizes) {
          await pip.setViewportSize(size);
          await settle(pip, 700);
          await pip.screenshot({ path: path.join(OUT_DIR, theme, `${name}.png`) });
          count++;
        }
        // A hovered task row in the large layout: the app's grip and row actions.
        await pip.setViewportSize(VIEWPORT);
        await settle(pip, 700);
        await pip.locator('.mini-task-list .task-row').nth(1).hover();
        await settle(pip, 300);
        await pip.screenshot({ path: path.join(OUT_DIR, theme, '53-mini-task-hover.png') });
        count++;
        await pip.close();
        await settle(page);
      } catch (err) {
        failures.push(`${theme}/50-mini: ${(err as Error).message.split('\n')[0]}`);
      }
    }

    await check('Picking an accent recolors the app and the open mini player', async () => {
      const [pip] = await Promise.all([
        context.waitForEvent('page', { timeout: 5000 }),
        page.locator('[data-tour="mini-player-btn"]').click()
      ]);
      await pip.locator('.mini-player').waitFor({ timeout: 5000 });
      await openAppearance();
      await pickAccent('nebula-purple');
      await settle(page, 300);
      const accentOf = (p: Page) => p.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--accent').trim());
      const resolved = await page.evaluate(() => document.documentElement.dataset.theme === 'light' ? 'light' : 'dark');
      const expected = (JSON.parse(fs.readFileSync(path.join(ROOT, 'src/constants/accentPalette.json'), 'utf8')) as Record<string, Record<string, string[]>>)['nebula-purple'][resolved][0];
      const [main, mini] = [await accentOf(page), await accentOf(pip)];
      await pickAccent('solar-lime');
      await closeOverlays();
      await pip.close();
      await settle(page);
      return main === expected && mini === expected;
    });

    // ── Behavior checks: the timer engine on a real clock. Runs last: it changes timer state. ──
    // The clock is frozen per context, so this uses a new one. Its storage state carries
    // the auth token, so it is already signed in.
    const liveContext = await browser.newContext({
      viewport: VIEWPORT, deviceScaleFactor: 1, reducedMotion: 'reduce', storageState: await context.storageState()
    });
    liveContext.setDefaultTimeout(5000);
    // Flows at normal speed; one check below jumps ahead. The ticker's interval runs in a
    // worker on real time, but each tick reads the page's Date.now(), which this controls.
    await liveContext.clock.install();
    const live = await liveContext.newPage();
    try {
      await live.goto(BASE);
      await live.locator('.app-shell').waitFor({ timeout: 15_000 });
      await live.locator('.nav-rail [data-tab="timer"]').click();
      const time = live.locator('.player-art-time');
      const status = live.locator('.status-chip');
      const focusMain = () => live.locator('.app-main').click({ position: { x: 12, y: 12 } });
      const before = (await time.textContent())?.trim();

      await check('Space starts the timer and it counts down', async () => {
        await focusMain();
        await live.keyboard.press(' ');
        await live.waitForTimeout(2500);
        const after = (await time.textContent())?.trim();
        const running = (await status.getAttribute('class'))?.split(' ').includes('is-running');
        return !!before && after !== before && !!running;
      });
      await check('Space again pauses the timer', async () => {
        await focusMain();
        await live.keyboard.press(' ');
        await settle(live, 300);
        return (await live.locator('#headerStatus .status-chip-label').textContent())?.trim() === strings.status.paused;
      });
      await check('S skips to the break', async () => {
        await focusMain();
        await live.keyboard.press('s');
        await settle(live, 300);
        return (await live.locator('.phase-chip').getAttribute('class'))?.split(' ').includes('is-break') ?? false;
      });
      await check('R resets to an idle focus phase', async () => {
        await focusMain();
        await live.keyboard.press('r');
        await settle(live, 300);
        const phase = (await live.locator('.phase-chip').getAttribute('class'))?.split(' ') ?? [];
        return !phase.includes('is-break')
          && (await live.locator('#headerStatus .status-chip-label').textContent())?.trim() === strings.status.ready
          && (await time.textContent())?.trim() === before;
      });
      const isRunning = async () => (await status.getAttribute('class'))?.split(' ').includes('is-running') ?? false;
      await check('A reload resumes the running timer', async () => {
        await focusMain();
        await live.keyboard.press(' ');
        await live.waitForTimeout(1200);
        await live.reload();
        await live.locator('.app-shell').waitFor({ timeout: 15_000 });
        await settle(live, 300);
        const resumed = (await isRunning()) && (await time.textContent())?.trim() !== before;
        await focusMain();
        await live.keyboard.press(' ');
        await live.keyboard.press('r');
        await settle(live, 300);
        return resumed;
      });
      await check('The mini player shows the run as soon as it starts', async () => {
        const [pip] = await Promise.all([
          liveContext.waitForEvent('page', { timeout: 5000 }),
          live.locator('[data-tour="mini-player-btn"]').click()
        ]);
        await pip.locator('.mini-player').waitFor({ timeout: 5000 });
        await focusMain();
        await live.keyboard.press(' ');
        // Well inside the first second: the end time must already be in the snapshot.
        await pip.locator('.mini-player.is-running').waitFor({ timeout: 400 });
        await live.keyboard.press(' ');
        await live.keyboard.press('r');
        await pip.close();
        await settle(live, 300);
        return true;
      });
      await check('Ticking a task in the mini player ticks it in the app', async () => {
        const checkedInApp = () => live.locator('#tab-timer .task-row input[type="checkbox"]:checked').count();
        const before = await checkedInApp();
        const [pip] = await Promise.all([
          liveContext.waitForEvent('page', { timeout: 5000 }),
          live.locator('[data-tour="mini-player-btn"]').click()
        ]);
        await pip.setViewportSize(VIEWPORT); // the large layout shows the session tasks
        await pip.locator('.mini-task-list .checkbox:not(:checked)').first().check();
        await settle(live, 300);
        const after = await checkedInApp();
        await pip.close();
        await settle(live, 300);
        return after === before + 1;
      });
      await check('Adding, renaming, duplicating and deleting a task in the mini player changes it in the app', async () => {
        const named = 'Renamed in the mini player';
        const inApp = () => live.locator('#tab-timer .task-text', { hasText: named }).count();
        const [pip] = await Promise.all([
          liveContext.waitForEvent('page', { timeout: 5000 }),
          live.locator('[data-tour="mini-player-btn"]').click()
        ]);
        await pip.setViewportSize(VIEWPORT);
        // Add from the field above the rows (the session has one list, so no list picker).
        const added = 'Added in the mini player';
        await pip.locator('.mini-add-task input').fill(added);
        await pip.locator('.mini-add-task input').press('Enter');
        await settle(live, 300);
        const addedInApp = await live.locator('#tab-timer .task-text', { hasText: added }).count();
        const row = (i: number) => pip.locator('.mini-task-list .task-row').nth(i);
        // Rename from the task's right-click menu, inline.
        await row(1).click({ button: 'right' });
        await pip.getByRole('menuitem', { name: strings.common.rename }).click();
        await pip.locator('.mini-task-edit input').fill(named);
        await pip.locator('.mini-task-edit input').press('Enter');
        await settle(live, 300);
        const renamed = await inApp();
        // Duplicate with the row's hover action; the copy lands right below.
        await row(1).hover();
        await row(1).getByRole('button', { name: strings.common.duplicate }).click();
        await settle(live, 300);
        const duplicated = await inApp();
        // Delete the copy, confirming inline.
        await row(2).hover();
        await row(2).getByRole('button', { name: strings.common.delete }).click();
        await pip.locator('.mini-task-confirm').getByRole('button', { name: strings.common.delete, exact: true }).click();
        await settle(live, 300);
        const deleted = await inApp();
        await pip.close();
        await settle(live, 300);
        return addedInApp === 1 && renamed === 1 && duplicated === 2 && deleted === 1;
      });
      await check('A large photo can be picked, is resized to a PNG and saved', async () => {
        // About 5 MB of noise: over the old 1 MB cap, and it doesn't compress away.
        const png = new PNG({ width: 1300, height: 1300 });
        for (let i = 0; i < png.data.length; i++) png.data[i] = (i % 4 === 3) ? 255 : Math.floor(Math.random() * 256);
        const file = path.join(os.tmpdir(), `focusspace-photo-${process.pid}.png`);
        fs.writeFileSync(file, PNG.sync.write(png));
        try {
          await live.locator('.user-badge-btn').first().click();
          await live.getByRole('menuitem', { name: strings.userMenu.profile }).click();
          await live.locator('.modal input[type="file"]').setInputFiles(file);
          const preview = live.locator('.avatar-picker-img img');
          await preview.waitFor({ timeout: 5000 });
          const isPng = ((await preview.getAttribute('src')) ?? '').startsWith('data:image/png;base64,');
          await live.locator('.modal').getByRole('button', { name: strings.common.saveChanges, exact: true }).click();
          await live.locator('.user-badge-btn .user-avatar-img').first().waitFor({ timeout: 5000 });
          // Form modals close only through their close button, not Escape.
          await live.locator('.modal-backdrop').getByRole('button', { name: strings.common.close }).first().click();
          await live.locator('.modal-backdrop').waitFor({ state: 'detached', timeout: 3000 });
          return isPng && fs.statSync(file).size > 1_000_000;
        } finally {
          fs.rmSync(file, { force: true });
        }
      });
      await check('Signing out clears the session and signing back in starts on the timer', async () => {
        await live.locator('.nav-rail [data-tab="tasks"]').click();
        await live.locator('.user-badge-btn').first().click();
        await live.getByRole('menuitem', { name: strings.userMenu.exit }).click();
        await live.locator('.auth-form').waitFor({ timeout: 10_000 });
        const inputs = live.locator('.auth-form input');
        await inputs.nth(0).fill(SANDBOX.username);
        await inputs.nth(1).fill(SANDBOX.password);
        await live.getByRole('button', { name: strings.auth.signInBtn }).click();
        await live.locator('.app-shell').waitFor({ timeout: 15_000 });
        return (await live.locator('.nav-rail [data-tab="timer"][aria-current="page"]').count()) === 1;
      });
      // Last: it completes a phase and changes rewards and stats.
      await check("Finishing a focus phase unlocks the session's reward and shows the alert ring", async () => {
        // The seeded active session ("Pomodoro Classic") unlocks the seeded reward r1.
        const reward = live.locator('.reward-card[data-rid="r1"]');
        await live.locator('.nav-rail [data-tab="rewards"]').click();
        const lockedBefore = !((await reward.getAttribute('class'))?.split(' ').includes('ready'));
        await live.locator('.nav-rail [data-tab="timer"]').click();
        await focusMain();
        await live.keyboard.press(' ');
        await live.clock.fastForward('25:01');
        await live.locator('.phase-chip.is-break').waitFor({ timeout: 4000 });
        // The phase-end island shows with its countdown ring (ui/ProgressRing), partly full.
        const fill = live.locator('.alert-card .alert-ring .progress-ring-fill');
        await fill.waitFor({ timeout: 3000 });
        const dash = Number(await fill.getAttribute('stroke-dasharray'));
        const offset = Number(await fill.getAttribute('stroke-dashoffset'));
        const ringOk = dash > 0 && offset >= 0 && offset < dash;
        await live.keyboard.press('Escape');
        await live.locator('.nav-rail [data-tab="rewards"]').click();
        await settle(live, 300);
        const readyAfter = (await reward.getAttribute('class'))?.split(' ').includes('ready') ?? false;
        return lockedBefore && readyAfter && ringOk;
      });
    } finally {
      await liveContext.close();
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

  console.log(`Captured ${count} screenshots → ${path.relative(ROOT, OUT_DIR)}; ran ${checks} behavior checks`);
  if (failures.length) {
    console.log(`\n${failures.length} view(s) failed:\n  ${failures.join('\n  ')}`);
    process.exitCode = 1;
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
