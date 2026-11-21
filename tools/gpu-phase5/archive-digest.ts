// gpu-phase5 (copy of tools/gpu-phase3/archive-digest.ts, this study's namespace) (recovery tool): recomputes a replay's archive digest and its raw key → record-hash maps from the job's
// own archive (read only), exactly as tools/gpu-phase5/replay.ts writes them at the end of a job. Used once for
// p2-a2-r1, whose job completed (runs.jsonl "job-end") but whose final dump failed (a 2.2 M-row map serialized as one
// JSON string exceeded V8's string limit; replay.ts now streams it).
//   node --experimental-transform-types tools/gpu-phase5/archive-digest.ts <run>/<backend>
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { Store, encode } from '../../src/growth140-vgt-s8m/store.ts';
import { cacheDir, resultsDir, writeJson } from '../../src/gpu-phase5/context.ts';

const arm = process.argv[2]!;
const [run, backend] = arm.split('/') as [string, string];
const jobDir = path.join(cacheDir, 'replay', run, backend, 'jobs', `replay-${run}`);
const meta = new Store(path.join(jobDir, 'archive.sqlite'), {
  binding: {},
  lruCapacity: 1,
  commitRows: 1,
  commitMs: 1,
  readOnly: true
});
const rawDir = path.join(resultsDir, 'raw-large', 'optimizer', run, backend);
const archived = { rows: 0, configs: 0, rowsSha256: '', configsSha256: '', recomputedFromArchive: true };

fs.mkdirSync(rawDir, { recursive: true });
for (const table of ['points', 'configs'] as const) {
  const fd = fs.openSync(path.join(rawDir, `${table === 'points' ? 'rows' : 'configs'}.jsonl`), 'w');
  const hashes = new Map<string, string>();

  for (const [k, v] of meta.iterate(table)) {
    const h = createHash('sha256').update(encode(v)).digest('hex').slice(0, 20);

    hashes.set(k, h);
    fs.writeSync(fd, `${JSON.stringify([k, h])}\n`);
  }
  fs.closeSync(fd);
  const keys = [...hashes.keys()].sort();
  const d = createHash('sha256');

  keys.forEach((k, i) => d.update(`${i ? '\n' : ''}${k}=${hashes.get(k)}`));
  if (table === 'points') [archived.rows, archived.rowsSha256] = [keys.length, d.digest('hex')];
  else [archived.configs, archived.configsSha256] = [keys.length, d.digest('hex')];
}
meta.close();
writeJson(path.join(resultsDir, 'optimizer', run, backend, 'archive-digest.json'), archived);
console.log(JSON.stringify(archived));
