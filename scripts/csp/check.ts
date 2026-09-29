/**
 * Content Security Policy check. Serves the production build (dist/) from
 * server/index.js --static, then drives Chrome through the app twice:
 *   web      the policy the web server sends (server/security.js), mini player included
 *   desktop  the policy from src-tauri/tauri.conf.json, swapped in by request interception
 * Fails on any CSP violation. Run after a build:
 *
 *   npm run check:csp        (builds first)
 *
 * Never touches the real database: FOCUSSPACE_DATA_DIR points at a new temp folder.
 */
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium, type BrowserContext, type Page } from 'playwright-core';
import { strings } from '../../src/constants/strings.ts';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const SANDBOX = { displayName: 'CSP Test', username: 'csp.test', password: 'sandbox-pass-123' };
const DESKTOP_CSP: string = JSON.parse(fs.readFileSync(path.join(ROOT, 'src-tauri/tauri.conf.json'), 'utf8')).app.security.csp;

function freePort(): Promise<number> {
  return new Promise((res, rej) => {
    const srv = net.createServer();
    srv.once('error', rej);
    srv.listen(0, '127.0.0.1', () => {
      const { port } = srv.address() as net.AddressInfo;
      srv.close(() => res(port));
    });
  });
}

async function waitForHttp(url: string, timeoutMs = 20_000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      if ((await fetch(url)).ok) return;
    } catch { /* not up yet */ }
    await new Promise(r => setTimeout(r, 150));
  }
  throw new Error(`Timed out waiting for ${url}`);
}

/** Records every violation in the page (and in pages it opens, like the PiP window). */
async function watchViolations(context: BrowserContext, into: string[]) {
  await context.exposeBinding('__cspViolation', (_src, line: string) => { into.push(line); });
  await context.addInitScript(() => {
    document.addEventListener('securitypolicyviolation', e => {
      (window as unknown as { __cspViolation: (s: string) => void }).__cspViolation(
        `${e.effectiveDirective} blocked ${e.blockedURI || '(inline)'}${e.sourceFile ? ` in ${e.sourceFile}:${e.lineNumber}` : ''}`
      );
    });
  });
}

async function signIn(page: Page, firstRun: boolean) {
  const inputs = page.locator('.auth-form input');
  await inputs.first().waitFor({ timeout: 15_000 });
  if (firstRun) {
    await inputs.nth(0).fill(SANDBOX.displayName);
    await inputs.nth(1).fill(SANDBOX.username);
    await inputs.nth(2).fill(SANDBOX.password);
    await inputs.nth(3).fill(SANDBOX.password);
    await page.getByRole('button', { name: strings.auth.createAccountBtn }).click();
  } else {
    await inputs.nth(0).fill(SANDBOX.username);
    await inputs.nth(1).fill(SANDBOX.password);
    await page.getByRole('button', { name: strings.auth.signInBtn }).click();
  }
  await page.locator('.app-shell').waitFor({ timeout: 15_000 });
}

/** Touches every kind of resource the app uses: pages, modals, menus, the ticker worker, fonts. */
async function tour(page: Page, context: BrowserContext, withPip: boolean) {
  await page.locator('.tour-close').click({ timeout: 5000 }).catch(() => { /* already seen */ });
  for (const tab of ['timer', 'tasks', 'calendar', 'stats', 'goals', 'rewards', 'timer']) {
    await page.locator(`.nav-rail [data-tab="${tab}"]`).click();
    await page.waitForTimeout(250);
  }
  await page.locator('[data-tour="help-btn"]').click();
  await page.waitForTimeout(250);
  await page.keyboard.press('Escape');
  await page.locator('.user-badge-btn').first().click();
  await page.waitForTimeout(250);
  await page.keyboard.press('Escape');
  await page.locator('.app-main').click({ position: { x: 12, y: 12 } });
  await page.keyboard.press(' ');
  await page.waitForTimeout(1500);
  await page.keyboard.press(' ');
  if (withPip) {
    const [pip] = await Promise.all([
      context.waitForEvent('page', { timeout: 5000 }),
      page.locator('[data-tour="mini-player-btn"]').click()
    ]);
    await pip.locator('.mini-player').waitFor({ timeout: 5000 });
    await pip.waitForTimeout(500);
    await pip.close();
  }
  await page.evaluate(() => document.fonts.ready);
}

async function main() {
  if (!fs.existsSync(path.join(ROOT, 'dist/index.html'))) throw new Error('No dist/ build. Run `npm run build` first.');
  const port = await freePort();
  const base = `http://127.0.0.1:${port}`;
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'focusspace-csp-'));
  const api = spawn(process.execPath, ['server/index.js', '--static'], {
    cwd: ROOT,
    env: { ...process.env, PORT: String(port), FOCUSSPACE_DATA_DIR: dataDir },
    stdio: 'ignore'
  });
  const exited = new Promise<void>(res => api.once('exit', () => res()));
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const report: string[] = [];

  try {
    await waitForHttp(`${base}/api/health`);
    for (const [name, override] of [['web', null], ['desktop', DESKTOP_CSP]] as const) {
      const violations: string[] = [];
      const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
      context.setDefaultTimeout(8000);
      await watchViolations(context, violations);
      if (override) {
        // The desktop app runs the same bundle; only the policy differs.
        await context.route('**/*', async route => {
          const response = await route.fetch();
          const headers = { ...response.headers(), 'content-security-policy': override };
          await route.fulfill({ response, headers });
        });
      }
      const page = await context.newPage();
      const policy = await page.goto(base).then(r => r?.headers()['content-security-policy'] ?? '');
      if (!policy) violations.push('no Content-Security-Policy header was sent');
      await signIn(page, name === 'web');
      // Document Picture-in-Picture is the web mini player; the desktop one is a Tauri window.
      await tour(page, context, name === 'web');
      await context.close();
      report.push(`${name}: ${violations.length ? `${violations.length} violation(s)` : 'no violations'}`);
      for (const v of [...new Set(violations)]) report.push(`  ${v}`);
    }
  } finally {
    await browser.close();
    api.kill();
    // SQLite keeps the file locked until the API process has fully exited.
    await exited;
    fs.rmSync(dataDir, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
  }

  console.log(`CSP check (production build)\n${report.join('\n')}`);
  if (report.some(l => l.startsWith('  '))) process.exitCode = 1;
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
