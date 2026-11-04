// Reproducibility of stored Growth runs: re-executes a stored run's request.json with the CURRENT runner in a scratch
// directory and compares the execution facts with the stored, immutable artifacts. Read-only towards the state
// directory: nothing is written next to the stored run.
//
// What must be identical: every field the stored artifacts have, in trades.json, daily.json and metrics.json, and every
// stored event (id, kind, instant, price, reason, values, linkage, meta) — after removing only the fields a later
// engine version ADDED (the origin attribution of v1.1.0, and the continuation signals, which an OFF run never has).
// A legacy rise-from-recent-low-trading@1.0.0 run is replayed by 1.1.0 with continuation OFF.

import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { gunzipSync } from 'node:zlib';

import type { LabEvent } from '../shared/contract.ts';

/** Event values and meta keys added by rise-from-recent-low-trading@1.1.0. */
export const ADDED_EVENT_VALUE_KEYS = ['origin', 'method', 'episode', 'opensContinuationWindow'];
export const ADDED_EVENT_META_KEYS = ['origin', 'method', 'episode'];

const readJson = (dir: string, file: string): unknown => {
  const plain = join(dir, file);
  if (existsSync(plain)) return JSON.parse(readFileSync(plain, 'utf8'));
  return JSON.parse(gunzipSync(readFileSync(`${plain}.gz`)).toString('utf8'));
};

/** `current` reduced to the shape of `stored`: keys stored never had are left out, recursively (arrays by position). */
export function projectOnto(stored: unknown, current: unknown): unknown {
  if (stored === null || typeof stored !== 'object') return current;
  if (Array.isArray(stored))
    return Array.isArray(current) && current.length === stored.length
      ? stored.map((s, i) => projectOnto(s, current[i]))
      : current;
  const c = (current ?? {}) as Record<string, unknown>;
  return Object.fromEntries(Object.keys(stored).map((k) => [k, projectOnto((stored as Record<string, unknown>)[k], c[k])]));
}

export function legacyEventProjection(events: readonly LabEvent[]): LabEvent[] {
  return events
    .filter((e) => !e.id.includes(':continuation:'))
    .map((e) => ({
      ...e,
      values: e.values.filter((v) => !ADDED_EVENT_VALUE_KEYS.includes(v.key)),
      meta: Object.fromEntries(Object.entries(e.meta ?? {}).filter(([k]) => !ADDED_EVENT_META_KEYS.includes(k)))
    }));
}

const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

export interface ReplayVerdict {
  file: string;
  identical: boolean;
  detail: string;
}

/**
 * Compares a fresh output directory with a stored run directory (plain or .gz files on either side). `legacy`: the
 * stored run is an earlier engine version — compare every stored field, ignoring only what later versions added;
 * `exact`: the same engine version — the files must be identical in full.
 */
export function compareRunOutputs(storedDir: string, freshDir: string, mode: 'legacy' | 'exact'): ReplayVerdict[] {
  const verdicts: ReplayVerdict[] = [];
  for (const file of ['trades.json', 'daily.json', 'metrics.json']) {
    const stored = readJson(storedDir, file) as Record<string, unknown>;
    const fresh = readJson(freshDir, file) as Record<string, unknown>;
    const compared = mode === 'legacy' ? (projectOnto(stored, fresh) as Record<string, unknown>) : fresh;
    // a legacy replay records engineVersion/legacyReplay in metrics.strategy; the stored strategy is the reference
    if (mode === 'legacy' && file === 'metrics.json') compared.strategy = stored.strategy;
    const identical = same(compared, stored);
    verdicts.push({ file, identical, detail: identical ? `identical (${mode === 'legacy' ? 'every stored field' : 'in full'})` : 'differs' });
  }
  const storedEvents = (readJson(storedDir, 'events.json') as { events: LabEvent[] }).events;
  const freshEvents = (readJson(freshDir, 'events.json') as { events: LabEvent[] }).events;
  const a = mode === 'legacy' ? legacyEventProjection(storedEvents) : storedEvents;
  const b = mode === 'legacy' ? legacyEventProjection(freshEvents) : freshEvents;
  const identical = same(a, b);
  let detail = `${storedEvents.length} stored events: ${identical ? 'identical' : 'differ'}`;
  if (!identical) {
    const i = a.findIndex((e, k) => !same(e, b[k]));
    detail += ` (first difference at #${i}: ${a[i]?.id ?? '—'} vs ${b[i]?.id ?? '—'})`;
  }
  verdicts.push({ file: 'events.json', identical, detail });
  return verdicts;
}

/** Re-executes a stored run's request with the current runner in `scratchDir` (created; must not exist). */
export function replayStoredRun(
  repoRoot: string,
  storedDir: string,
  scratchDir: string,
  runner: string,
  mode: 'legacy' | 'exact'
) {
  if (existsSync(scratchDir)) throw new Error(`${scratchDir} exists: choose a new scratch directory`);
  mkdirSync(scratchDir, { recursive: true });
  const request = readJson(storedDir, 'request.json') as Record<string, unknown>;
  writeFileSync(join(scratchDir, 'request.json'), `${JSON.stringify(request, null, 2)}\n`);
  const r = spawnSync(
    process.execPath,
    ['--experimental-transform-types', '--disable-warning=ExperimentalWarning', '--max-old-space-size=6144', join(repoRoot, runner), scratchDir],
    { cwd: repoRoot, encoding: 'utf8', timeout: 1_800_000, env: { PATH: process.env.PATH ?? '/usr/bin:/bin', TZ: 'UTC', LANG: 'C.UTF-8' } }
  );
  writeFileSync(join(scratchDir, 'run.log'), `${r.stdout ?? ''}${r.stderr ?? ''}`);
  if (r.status !== 0) throw new Error(`the runner failed (exit ${r.status}); see ${join(scratchDir, 'run.log')}`);
  return { request, verdicts: compareRunOutputs(storedDir, scratchDir, mode) };
}
