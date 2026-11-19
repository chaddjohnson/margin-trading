// The persistent preview cache (server/preview-cache.ts) on synthetic entries: commit and hit, persistence across a
// new instance (a restart), recovery from interrupted work and partial entries, eviction of tampered, foreign-identity
// and older-format entries, deterministic LRU retention by count and bytes that never touches anything outside the
// cache directory, and the refusal to use (or clear) a directory that is not a preview cache.

import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import { loadConfig, previewCacheDirOf } from '../server/config.ts';
import { PreviewCache } from '../server/preview-cache.ts';
import { identityKey, PREVIEW_CACHE_FORMAT, type PreviewIdentity, previewIdOf } from '../server/preview-identity.ts';
import type { LabEvent } from '../shared/contract.ts';

const identity = (x: number): PreviewIdentity =>
  ({
    schema: 'strategy-lab.preview-identity',
    format: PREVIEW_CACHE_FORMAT,
    eventContract: 2,
    strategy: { key: 'rise-from-recent-low-trading', version: '1.2.0', kind: 'trades', runner: 'r.ts', schemaSha256: 'a'.repeat(64) },
    params: { advanceFromRecentLowPercent: x },
    symbols: ['VGT'],
    window: { from: '2020-01-02', to: '2020-12-31' },
    resolution: '1d',
    data: { symbols: { VGT: { 'data/VGT/data.csv': 'b'.repeat(64) } }, inputs: {} },
    implementation: { sha256: 'c'.repeat(64), runner: 'r.ts', node: 'v24', platform: 'linux', arch: 'x64', flags: [], env: {}, files: {}, packages: {} }
  }) as PreviewIdentity;

const event = (runId: string, i: number): LabEvent => ({
  id: `VGT:entry_signal:2020-01-0${i + 2}T21:00:00Z`,
  runId,
  symbol: 'VGT',
  kind: 'entry_signal',
  t: `2020-01-0${i + 2}T21:00:00Z`,
  timePrecision: 'session-close',
  timeMeaning: 'close',
  price: 100 + i,
  priceBasis: 'bar-close',
  reason: null,
  values: [],
  tradeId: null,
  linkedEventId: null,
  meta: {}
});

function work(cache: PreviewCache, id: PreviewIdentity, padding = 0) {
  const key = identityKey(id);
  const dir = cache.newWorkDir();
  const pv = previewIdOf(key);
  writeFileSync(join(dir, 'request.json'), JSON.stringify({ runId: pv }));
  writeFileSync(join(dir, 'events.json'), JSON.stringify({ contractVersion: 2, runId: pv, events: [event(pv, 0), event(pv, 1)] }));
  writeFileSync(join(dir, 'metrics.json'), JSON.stringify({ kind: 'entry-signal outcomes', pad: 'x'.repeat(padding) }));
  writeFileSync(join(dir, 'provenance.json'), '{}');
  return { key, dir };
}

const commit = (cache: PreviewCache, id: PreviewIdentity, padding = 0) => {
  const { key, dir } = work(cache, id, padding);
  return cache.commit(dir, { key, identity: id, executedAt: new Date().toISOString(), executionMs: 5, codeRevision: null, sourceRun: null }, [
    'request.json',
    'events.json',
    'metrics.json',
    'provenance.json'
  ]);
};

const fresh = (limits = { maxEntries: 50, maxBytes: 1e9 }) => {
  const root = mkdtempSync(join(tmpdir(), 'preview-cache-'));
  const cache = new PreviewCache(join(root, 'preview-cache'), limits);
  cache.init();
  return { root, cache };
};

const tree = (dir: string): Record<string, string> => {
  const out: Record<string, string> = {};
  const walk = (d: string) => {
    for (const e of readdirSync(d, { withFileTypes: true }))
      if (e.isDirectory()) walk(join(d, e.name));
      else out[join(d, e.name)] = createHash('sha256').update(readFileSync(join(d, e.name))).digest('hex');
  };
  walk(dir);
  return out;
};

describe('preview cache', () => {
  it('commits atomically, hits only for the same identity, and persists across a restart', () => {
    const { cache } = fresh();
    const a = identity(5);
    const entry = commit(cache, a);
    expect(entry.meta.previewId).toBe(previewIdOf(identityKey(a)));
    expect(readdirSync(cache.workDir)).toEqual([]); // the work directory became the entry
    expect(cache.lookup(identityKey(a), a).hit).toBe(true);
    // another identity under the same key (never the case in practice) is not a hit, and the entry is evicted
    const restarted = new PreviewCache(cache.dir, cache.limits);
    restarted.init();
    expect(restarted.lookup(identityKey(a), a).hit).toBe(true);
    expect(restarted.lookup(identityKey(a), identity(6))).toEqual({ hit: false, reason: 'the identity differs' });
    expect(existsSync(join(cache.entriesDir, identityKey(a)))).toBe(false);
  });

  it('a tampered file, a damaged entry.json or an older format are misses (evicted), never hits', () => {
    const { cache } = fresh();
    const ids = [identity(1), identity(2), identity(3), identity(4)];
    for (const id of ids) commit(cache, id);
    const dirOf = (id: PreviewIdentity) => join(cache.entriesDir, identityKey(id));
    const ev = join(dirOf(ids[0]!), 'events.json');
    writeFileSync(ev, readFileSync(ev, 'utf8').replace('"price":100', '"price":101'));
    expect(cache.lookup(identityKey(ids[0]!), ids[0]!)).toEqual({ hit: false, reason: 'events.json does not match its recorded sha256' });
    writeFileSync(join(dirOf(ids[1]!), 'entry.json'), '{ broken');
    expect(cache.lookup(identityKey(ids[1]!), ids[1]!)).toEqual({ hit: false, reason: 'entry.json is missing or corrupt' });
    const meta = JSON.parse(readFileSync(join(dirOf(ids[2]!), 'entry.json'), 'utf8'));
    writeFileSync(join(dirOf(ids[2]!), 'entry.json'), JSON.stringify({ ...meta, format: PREVIEW_CACHE_FORMAT - 1 }));
    expect(cache.lookup(identityKey(ids[2]!), ids[2]!).hit).toBe(false);
    writeFileSync(join(dirOf(ids[3]!), 'entry.json'), JSON.stringify({ ...JSON.parse(readFileSync(join(dirOf(ids[3]!), 'entry.json'), 'utf8')), identity: identity(99) }));
    expect(cache.lookup(identityKey(ids[3]!), ids[3]!)).toEqual({ hit: false, reason: 'the stored identity does not hash to its key' });
    expect(readdirSync(cache.entriesDir)).toEqual([]);
    // a served file is verified too
    const e = commit(cache, identity(7));
    writeFileSync(join(e.dir, 'metrics.json'), '{}');
    expect(() => cache.readFile(e, 'metrics.json')).toThrow(/modified after it was cached/);
    expect(cache.get(identityKey(identity(7)))).toBeNull();
  });

  it('recovers from an interrupted execution and a partial entry at start', () => {
    const { cache } = fresh();
    const kept = commit(cache, identity(1));
    const { dir } = work(cache, identity(2)); // an execution that never finished
    writeFileSync(join(dir, 'events.json'), '{"partial'); // half-written
    mkdirSync(join(cache.entriesDir, 'f'.repeat(64))); // an entry directory without entry.json
    mkdirSync(join(cache.entriesDir, 'not-a-key'));
    const restarted = new PreviewCache(cache.dir, cache.limits);
    restarted.init();
    expect(readdirSync(cache.workDir)).toEqual([]);
    expect(readdirSync(cache.entriesDir)).toEqual([kept.meta.key]);
    expect(restarted.lookup(kept.meta.key, identity(1)).hit).toBe(true);
  });

  it('LRU retention by count and bytes is deterministic and touches nothing outside the cache', async () => {
    const tick = () => new Promise((r) => setTimeout(r, 3)); // distinct lastUsedAt stamps (ms resolution)
    const { root, cache } = fresh({ maxEntries: 3, maxBytes: 1e9 });
    // a neighbouring saved run and data must survive any eviction
    mkdirSync(join(root, 'runs', 'R-000001'), { recursive: true });
    writeFileSync(join(root, 'runs', 'R-000001', 'events.json'), 'saved');
    writeFileSync(join(root, 'strategy-lab.sqlite'), 'db');
    const outside = () => ({ ...tree(join(root, 'runs')), db: readFileSync(join(root, 'strategy-lab.sqlite'), 'utf8') });
    const before = outside();
    const keys: string[] = [];
    for (const x of [1, 2, 3]) {
      keys.push(commit(cache, identity(x)).meta.key);
      await tick();
    }
    cache.lookup(keys[0]!, identity(1)); // 1 is now the most recently used
    await tick();
    const k4 = commit(cache, identity(4)).meta.key; // evicts the least recently used: 2
    expect(new Set(cache.keys())).toEqual(new Set([keys[0], keys[2], k4]));
    await tick();
    // bytes: the oldest go first until the total fits; the entry just committed is protected
    const bytes = cache.status().bytes;
    const one = bytes / 3;
    const byBytes = new PreviewCache(cache.dir, { maxEntries: 10, maxBytes: Math.round(bytes + one * 0.5) });
    byBytes.init();
    const k5 = commit(byBytes, identity(5)).meta.key; // 4 entries > 3.5 entries' bytes: the LRU one (3) goes
    expect(new Set(byBytes.keys())).toEqual(new Set([keys[0], k4, k5]));
    await tick();
    const big = commit(byBytes, identity(6), 60_000).meta.key; // alone larger than the limit: kept (protected), all others go
    expect(byBytes.keys()).toEqual([big]);
    expect(outside()).toEqual(before);
    // clear: every entry, nothing else
    expect(byBytes.clear()).toBe(1);
    expect(readdirSync(byBytes.entriesDir)).toEqual([]);
    expect(existsSync(join(byBytes.dir, 'PREVIEW_CACHE.md'))).toBe(true);
    expect(outside()).toEqual(before);
  });

  it('the maintenance CLI mode (cleanup off) never touches work in progress', () => {
    const { cache } = fresh();
    const { dir } = work(cache, identity(1));
    const cli = new PreviewCache(cache.dir, cache.limits);
    cli.init({ cleanup: false });
    expect(existsSync(join(dir, 'events.json'))).toBe(true);
    cli.clear();
    expect(existsSync(join(dir, 'events.json'))).toBe(true);
  });

  it('refuses a directory that is not a preview cache, and a cache directory that is a store of the state', () => {
    const root = mkdtempSync(join(tmpdir(), 'preview-cache-'));
    writeFileSync(join(root, 'precious.txt'), 'x');
    expect(() => new PreviewCache(root, { maxEntries: 1, maxBytes: 1 }).init()).toThrow(/not a preview cache/);
    expect(readFileSync(join(root, 'precious.txt'), 'utf8')).toBe('x');
    const state = mkdtempSync(join(tmpdir(), 'state-'));
    for (const bad of [state, join(state, 'runs'), join(state, 'runs', 'cache'), join(state, 'imports'), join(state, '..')])
      expect(() => previewCacheDirOf(state, bad)).toThrow(/a directory of its own/);
    expect(previewCacheDirOf(state, null)).toBe(join(state, 'preview-cache'));
    expect(loadConfig({ STRATEGY_LAB_STATE_DIR: state, STRATEGY_LAB_STATIC_DIR: '' }).previewCacheDir).toBe(join(state, 'preview-cache'));
  });
});
