// Interactive Preview cache maintenance (docs/strategy-lab/INTERACTIVE_PREVIEW.md §Operations):
//
//   npm --prefix apps/strategy-lab run preview-cache -- status   entries, bytes, limits, oldest/newest use
//   npm --prefix apps/strategy-lab run preview-cache -- verify   re-hash every entry; evict the broken ones
//   npm --prefix apps/strategy-lab run preview-cache -- prune    apply the retention limits now (least recently used)
//   npm --prefix apps/strategy-lab run preview-cache -- clear    remove every entry (the cache is disposable)
//
// It reads the same configuration as the server (STRATEGY_LAB_STATE_DIR, STRATEGY_LAB_PREVIEW_CACHE_DIR, limits) and
// touches ONLY the preview cache directory, and only if it carries the cache's marker file: never the database, saved
// runs, imports, market data. Safe while the server runs (an entry being written is a work directory, not an entry; a
// removed entry is simply recomputed on its next use). `verify` checks integrity (format, key, files, events) without
// the current code and data; a hit additionally requires the identity to match them, so a stale entry is never served.

import { existsSync } from 'node:fs';

import { loadConfig } from '../server/config.ts';
import { PreviewCache } from '../server/preview-cache.ts';

const command = process.argv[2] ?? 'status';
if (!['status', 'verify', 'prune', 'clear'].includes(command)) {
  console.error('usage: preview-cache.ts status|verify|prune|clear');
  process.exit(2);
}
const cfg = loadConfig({ ...process.env, STRATEGY_LAB_STATIC_DIR: '' });
if (!existsSync(cfg.previewCacheDir)) {
  console.log(JSON.stringify({ dir: cfg.previewCacheDir, entries: 0, note: 'no preview cache yet (created at the first server start)' }, null, 2));
  process.exit(0);
}
const cache = new PreviewCache(cfg.previewCacheDir, { maxEntries: cfg.previewCacheMaxEntries, maxBytes: cfg.previewCacheMaxBytes }, (m) =>
  console.error(m)
);
cache.init({ cleanup: false }); // refuses a directory without the marker; never touches a running server's work
const out: Record<string, unknown> = { command };
if (command === 'verify') out.verify = cache.verifyAll();
if (command === 'prune') out.evicted = cache.prune();
if (command === 'clear') out.removed = cache.clear();
out.status = cache.status();
console.log(JSON.stringify(out, null, 2));
