// Strategy Lab server configuration, from environment variables only (no secrets in the repository). See
// docs/strategy-lab/OPERATIONS.md for every variable, defaults and the Apollo/Tailscale setup.

import { randomBytes } from 'node:crypto';
import { chmodSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { networkInterfaces } from 'node:os';
import { dirname, isAbsolute, join, resolve } from 'node:path';
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
    seedDemo: (env.STRATEGY_LAB_SEED_DEMO ?? '1') !== '0'
  };
}
