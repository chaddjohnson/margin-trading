// Strategy Lab server configuration, from environment variables only (no secrets in the repository). See
// docs/strategy-lab/OPERATIONS.md for every variable, defaults and the Apollo/Tailscale setup.

import { randomBytes } from 'node:crypto';
import { chmodSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { hostname, networkInterfaces } from 'node:os';
import { dirname, isAbsolute, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

export interface Config {
  repoRoot: string;
  appRoot: string;
  stateDir: string;
  dbFile: string;
  hosts: string[];
  port: number;
  /** API token (Authorization: Bearer). Required whenever any bound host is not loopback. */
  token: string | null;
  tokenFile: string;
  allowedHostHeaders: string[];
  allowedClientCidrs: string[];
  maxConcurrentRuns: number;
  runTimeoutSeconds: number;
  staticDir: string | null;
  seedDemo: boolean;
  /** Interactive Preview: the cache directory (disposable; never a saved run), its limits, concurrent executions. */
  previewCacheDir: string;
  previewCacheMaxEntries: number;
  previewCacheMaxBytes: number;
  maxConcurrentPreviews: number;
  /** Pooled portfolio candidates: the replay cache directory (disposable; never a saved run) and its limits. */
  portfolioCacheDir: string;
  portfolioCacheMaxEntries: number;
  portfolioCacheMaxBytes: number;
}

const here = dirname(fileURLToPath(import.meta.url));
export const APP_ROOT = resolve(here, '..');
export const REPO_ROOT = resolve(APP_ROOT, '..', '..');

export const DEFAULT_PORT = 4317;
const LOOPBACK = new Set(['127.0.0.1', '::1', 'localhost']);
// Tailscale assigns 100.64.0.0/10 (CGNAT) and fd7a:115c:a1e0::/48 addresses.
export const DEFAULT_CLIENT_CIDRS = ['127.0.0.0/8', '::1/128', '100.64.0.0/10', 'fd7a:115c:a1e0::/48'];

export const isLoopbackHost = (h: string) => LOOPBACK.has(h) || h.startsWith('127.');

/** The IPv4 address of the Tailscale interface (`tailscale0`), if any. */
export function tailscaleAddress(): string | null {
  const ifaces = networkInterfaces();
  for (const [name, list] of Object.entries(ifaces)) {
    if (!name.startsWith('tailscale')) continue;
    const v4 = list?.find((a) => a.family === 'IPv4' && !a.internal);
    if (v4) return v4.address;
  }
  return null;
}

/**
 * Loopback addresses that /etc/hosts gives this machine's own name. Debian and Ubuntu map the hostname to 127.0.1.1, so
 * on apollo itself http://apollo:4317 goes to 127.0.1.1, not 127.0.0.1; the server binds those aliases too.
 */
export function hostnameLoopbacks(hostsText?: string, name: string = hostname()): string[] {
  let text = hostsText;
  if (text === undefined) {
    try {
      text = readFileSync('/etc/hosts', 'utf8');
    } catch {
      return [];
    }
  }
  const me = name.toLowerCase();
  const out: string[] = [];
  for (const line of text.split('\n')) {
    const [addr, ...names] = line.replace(/#.*/, '').trim().split(/\s+/);
    if (!addr || !/^127\.\d+\.\d+\.\d+$/.test(addr) || addr === '127.0.0.1') continue;
    if (names.some((n) => n.toLowerCase() === me || n.toLowerCase().startsWith(`${me}.`)) && !out.includes(addr))
      out.push(addr);
  }
  return out;
}

const int = (v: string | undefined, d: number, min: number, max: number, name: string) => {
  if (v === undefined || v === '') return d;
  const n = Number(v);
  if (!Number.isInteger(n) || n < min || n > max) throw new Error(`${name} must be an integer in [${min}, ${max}]`);
  return n;
};

const list = (v: string | undefined) =>
  (v ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

/** Reads (or, for non-loopback serving, creates with mode 0600) the API token file. */
function loadToken(tokenFile: string, needed: boolean, env: NodeJS.ProcessEnv): string | null {
  if (env.STRATEGY_LAB_TOKEN) return env.STRATEGY_LAB_TOKEN;
  if (existsSync(tokenFile)) {
    const t = readFileSync(tokenFile, 'utf8').trim();
    if (t.length < 24) throw new Error(`${tokenFile} holds a token shorter than 24 characters`);
    return t;
  }
  if (!needed) return null;
  mkdirSync(dirname(tokenFile), { recursive: true });
  writeFileSync(tokenFile, `${randomBytes(24).toString('base64url')}\n`, { mode: 0o600 });
  chmodSync(tokenFile, 0o600);
  return readFileSync(tokenFile, 'utf8').trim();
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const abs = (p: string) => (isAbsolute(p) ? p : resolve(REPO_ROOT, p));
  const stateDir = abs(env.STRATEGY_LAB_STATE_DIR ?? 'state/strategy-lab');
  const dbFile = abs(env.STRATEGY_LAB_DB ?? join(stateDir, 'strategy-lab.sqlite'));
  const ts = tailscaleAddress();
  const hosts = list(env.STRATEGY_LAB_HOSTS ?? '127.0.0.1').map((h) => {
    if (h !== 'tailscale') return h;
    if (!ts) throw new Error('STRATEGY_LAB_HOSTS names "tailscale" but no tailscale interface address was found');
    return ts;
  });
  if (hosts.length === 0) throw new Error('STRATEGY_LAB_HOSTS is empty');
  // Serving 127.0.0.1 also serves the machine's own name on this machine (e.g. apollo → 127.0.1.1).
  if (hosts.includes('127.0.0.1'))
    for (const alias of hostnameLoopbacks()) if (!hosts.includes(alias)) hosts.push(alias);
  if (hosts.includes('0.0.0.0') || hosts.includes('::'))
    throw new Error('Refusing to bind every interface (0.0.0.0 / ::): name loopback and the Tailscale address instead');
  const needsToken = hosts.some((h) => !isLoopbackHost(h));
  const tokenFile = abs(env.STRATEGY_LAB_TOKEN_FILE ?? join(stateDir, 'api-token'));
  const token = loadToken(tokenFile, needsToken, env);
  if (needsToken && !token) throw new Error('A non-loopback host needs an API token');

  const staticDir =
    env.STRATEGY_LAB_STATIC_DIR === '' ? null : abs(env.STRATEGY_LAB_STATIC_DIR ?? join(APP_ROOT, 'dist'));

  return {
    repoRoot: REPO_ROOT,
    appRoot: APP_ROOT,
    stateDir,
    dbFile,
    hosts,
    port: int(env.STRATEGY_LAB_PORT, DEFAULT_PORT, 1, 65535, 'STRATEGY_LAB_PORT'),
    token,
    tokenFile,
    allowedHostHeaders: [
      'localhost',
      '127.0.0.1',
      '[::1]',
      'apollo',
      ...hosts.map((h) => (h.includes(':') ? `[${h}]` : h)),
      ...list(env.STRATEGY_LAB_ALLOWED_HOSTS)
    ],
    allowedClientCidrs: list(env.STRATEGY_LAB_ALLOWED_CIDRS).length
      ? list(env.STRATEGY_LAB_ALLOWED_CIDRS)
      : DEFAULT_CLIENT_CIDRS,
    maxConcurrentRuns: int(env.STRATEGY_LAB_MAX_CONCURRENT_RUNS, 1, 1, 2, 'STRATEGY_LAB_MAX_CONCURRENT_RUNS'),
    runTimeoutSeconds: int(
      env.STRATEGY_LAB_RUN_TIMEOUT_SECONDS,
      1800,
      30,
      6 * 3600,
      'STRATEGY_LAB_RUN_TIMEOUT_SECONDS'
    ),
    staticDir: staticDir && existsSync(staticDir) ? staticDir : null,
    seedDemo: (env.STRATEGY_LAB_SEED_DEMO ?? '1') !== '0',
    previewCacheDir: previewCacheDirOf(stateDir, env.STRATEGY_LAB_PREVIEW_CACHE_DIR ? abs(env.STRATEGY_LAB_PREVIEW_CACHE_DIR) : null),
    previewCacheMaxEntries: int(env.STRATEGY_LAB_PREVIEW_CACHE_MAX_ENTRIES, 200, 1, 100_000, 'STRATEGY_LAB_PREVIEW_CACHE_MAX_ENTRIES'),
    previewCacheMaxBytes:
      int(env.STRATEGY_LAB_PREVIEW_CACHE_MAX_MB, 2048, 16, 1_048_576, 'STRATEGY_LAB_PREVIEW_CACHE_MAX_MB') * 1024 * 1024,
    maxConcurrentPreviews: int(env.STRATEGY_LAB_MAX_CONCURRENT_PREVIEWS, 1, 1, 2, 'STRATEGY_LAB_MAX_CONCURRENT_PREVIEWS'),
    portfolioCacheDir: ownCacheDirOf(
      stateDir,
      env.STRATEGY_LAB_PORTFOLIO_CACHE_DIR ? abs(env.STRATEGY_LAB_PORTFOLIO_CACHE_DIR) : null,
      'portfolio-cache',
      'STRATEGY_LAB_PORTFOLIO_CACHE_DIR'
    ),
    portfolioCacheMaxEntries: int(env.STRATEGY_LAB_PORTFOLIO_CACHE_MAX_ENTRIES, 40, 1, 10_000, 'STRATEGY_LAB_PORTFOLIO_CACHE_MAX_ENTRIES'),
    portfolioCacheMaxBytes:
      int(env.STRATEGY_LAB_PORTFOLIO_CACHE_MAX_MB, 512, 16, 1_048_576, 'STRATEGY_LAB_PORTFOLIO_CACHE_MAX_MB') * 1024 * 1024
  };
}

/**
 * The preview cache directory: <stateDir>/preview-cache by default. Never the state directory itself, an ancestor of
 * it, the repository, market data, or a directory inside the saved runs, imports or deletion trash.
 */
export function previewCacheDirOf(stateDir: string, override: string | null): string {
  return ownCacheDirOf(stateDir, override, 'preview-cache', 'STRATEGY_LAB_PREVIEW_CACHE_DIR');
}

/**
 * A disposable cache directory of its own: <stateDir>/<name> by default (the preview cache, the pooled-candidate
 * replay cache). Never the state directory itself, an ancestor of it, the repository, market data, or a directory inside
 * the saved runs, imports or deletion trash.
 */
export function ownCacheDirOf(stateDir: string, override: string | null, name: string, variable: string): string {
  const dir = resolve(override ?? join(stateDir, name));
  const within = (p: string, parent: string) => p === parent || p.startsWith(`${parent}${sep}`);
  const state = resolve(stateDir);
  const bad =
    within(state, dir) ||
    within(REPO_ROOT, dir) ||
    within(dir, resolve(REPO_ROOT, 'data')) ||
    ['runs', 'imports', 'trash'].some((d) => within(dir, resolve(state, d)));
  if (bad) throw new Error(`${variable} must be a directory of its own, not ${dir}`);
  return dir;
}
