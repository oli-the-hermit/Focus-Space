/**
 * Backend parity, web half: runs shared/api-scenarios.json over HTTP against
 * server/index.js (fresh temp database, free port). The desktop half runs the
 * same file through dispatch() in src-tauri/src/backend/parity.rs.
 *
 *   node scripts/parity/run-web.ts
 *
 * Never touches the real database: FOCUSSPACE_DATA_DIR points at a new temp folder.
 */
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const readJson = (rel: string) => JSON.parse(fs.readFileSync(path.join(ROOT, rel), 'utf8'));
const LIMITS = readJson('shared/limits.json');
const { scenarios } = readJson('shared/api-scenarios.json') as { scenarios: Step[] };

type Json = null | boolean | number | string | Json[] | { [key: string]: Json };
interface Step {
  name: string;
  method: string;
  path: string;
  body?: Json;
  auth?: string;
  repeat?: Json;
  only?: 'web' | 'desktop';
  save?: Record<string, string>;
  expect: {
    status: number;
    code?: string;
    params?: Json;
    body?: Record<string, Json>;
    keys?: Record<string, string[]>;
  };
}
type Vars = Record<string, Json>;

// ── The scenario language (keep in sync with parity.rs) ──────────────

/** Looks up a dot path; negative array indexes count from the end, `length` works on arrays and strings. */
function getPath(value: Json | undefined, dotted: string): Json | undefined {
  if (dotted === '') return value;
  let cur = value;
  for (const seg of dotted.split('.')) {
    if (cur === null || cur === undefined) return undefined;
    if (seg === 'length' && (Array.isArray(cur) || typeof cur === 'string')) cur = cur.length;
    else if (Array.isArray(cur) && /^-?\d+$/.test(seg)) {
      const i = Number(seg);
      cur = cur[i < 0 ? cur.length + i : i];
    } else if (typeof cur === 'object' && !Array.isArray(cur)) cur = cur[seg];
    else return undefined;
  }
  return cur;
}

function resolve(value: Json | undefined, vars: Vars): Json | undefined {
  if (typeof value === 'string') {
    if (value.startsWith('$limits.')) {
      const n = getPath(LIMITS, value.slice('$limits.'.length));
      if (n === undefined) throw new Error(`unknown limit ${value}`);
      return n;
    }
    const whole = /^\{\{(\w+)\}\}$/.exec(value);
    if (whole) return lookupVar(vars, whole[1]);
    return value.replace(/\{\{(\w+)\}\}/g, (_, name: string) => String(lookupVar(vars, name)));
  }
  if (Array.isArray(value)) return value.map(v => resolve(v, vars) as Json);
  if (value && typeof value === 'object') {
    if ('$repeat' in value) return String(value.$repeat).repeat(resolve(value.times, vars) as number);
    if ('$add' in value) return (value.$add as Json[]).reduce<number>((sum, v) => sum + (resolve(v, vars) as number), 0);
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, resolve(v, vars) as Json]));
  }
  return value;
}

function lookupVar(vars: Vars, name: string): Json {
  if (!(name in vars)) throw new Error(`variable {{${name}}} is not set`);
  return vars[name];
}

const same = (a: Json | undefined, b: Json | undefined) => JSON.stringify(a) === JSON.stringify(b);

/** Every way the response differs from the expectation (empty when it matches). */
function compare(step: Step, status: number, body: Json | undefined, vars: Vars): string[] {
  const exp = step.expect;
  const errs: string[] = [];
  if (status !== exp.status) errs.push(`status ${status}, expected ${exp.status}`);
  if (exp.status === 204 && body !== undefined) errs.push(`204 with a body: ${JSON.stringify(body)}`);
  if (exp.code !== undefined) {
    const got = getPath(body, 'code');
    if (got !== exp.code) errs.push(`code ${JSON.stringify(got)}, expected ${exp.code}`);
    const params = resolve(exp.params, vars);
    const gotParams = getPath(body, 'params');
    if (!same(gotParams, params)) errs.push(`params ${JSON.stringify(gotParams)}, expected ${JSON.stringify(params)}`);
  }
  for (const [p, v] of Object.entries(exp.body ?? {})) {
    const want = resolve(v, vars);
    const got = getPath(body, p);
    if (!same(got, want)) errs.push(`${p || '<root>'} = ${JSON.stringify(got)}, expected ${JSON.stringify(want)}`);
  }
  for (const [p, keys] of Object.entries(exp.keys ?? {})) {
    const obj = getPath(body, p);
    const got = obj && typeof obj === 'object' && !Array.isArray(obj) ? Object.keys(obj).sort() : null;
    if (!same(got, [...keys].sort())) errs.push(`keys at ${p || '<root>'}: ${JSON.stringify(got)}, expected ${JSON.stringify([...keys].sort())}`);
  }
  return errs;
}

// ── Server ───────────────────────────────────────────────────────────

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

async function main() {
  const port = await freePort();
  const base = `http://127.0.0.1:${port}`;
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'focusspace-parity-'));
  const api = spawn(process.execPath, ['server/index.js'], {
    cwd: ROOT,
    env: { ...process.env, PORT: String(port), FOCUSSPACE_DATA_DIR: dataDir },
    stdio: ['ignore', 'ignore', 'inherit']
  });
  const exited = new Promise<void>(res => api.once('exit', () => res()));

  const failures: string[] = [];
  let ran = 0;
  let skipped = 0;
  try {
    await waitForHttp(`${base}/api/health`);
    const vars: Vars = {};
    for (const step of scenarios) {
      if (step.only && step.only !== 'web') { skipped++; continue; }
      const times = step.repeat === undefined ? 1 : (resolve(step.repeat, vars) as number);
      for (let i = 0; i < times; i++) {
        vars.i = i;
        const token = resolve(step.auth, vars) as string | undefined;
        const body = resolve(step.body, vars);
        const res = await fetch(base + (resolve(step.path, vars) as string), {
          method: step.method,
          headers: {
            ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
            ...(token ? { Authorization: `Bearer ${token}` } : {})
          },
          body: body !== undefined ? JSON.stringify(body) : undefined
        });
        const text = await res.text();
        const json: Json | undefined = text ? JSON.parse(text) : undefined;
        ran++;
        const errs = compare(step, res.status, json, vars);
        const label = times > 1 ? `${step.name} [${i}]` : step.name;
        if (errs.length) failures.push(`${label}: ${errs.join('; ')}`);
        for (const [name, p] of Object.entries(step.save ?? {})) {
          const v = getPath(json, p);
          if (v === undefined) failures.push(`${label}: nothing at "${p}" to save as {{${name}}}`);
          else vars[name] = v;
        }
      }
    }
  } finally {
    api.kill();
    // SQLite keeps the file locked until the API process has fully exited.
    await exited;
    fs.rmSync(dataDir, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
  }

  console.log(`API parity (web): ${ran} requests from ${scenarios.length} steps${skipped ? `, ${skipped} desktop-only skipped` : ''}`);
  if (failures.length) {
    console.log(`\n${failures.length} failure(s):\n  ${failures.join('\n  ')}`);
    process.exitCode = 1;
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
