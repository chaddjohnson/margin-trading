// growth140-vgt-stable: exports the sealed job archives (SQLite, git-ignored) as gzip-compressed JSONL shards in key order, with a manifest of
// counts and sha256 (a post-freeze helper; it reads the archives in bounded pages and computes nothing).
//
//   node --experimental-transform-types tools/growth140-vgt-stable/export-archive.ts <job> [<job> ...]
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import zlib from 'node:zlib';

const root = path.resolve(import.meta.dirname, '../..');
const outRoot = path.join(root, 'research/growth140-vgt-stable/results/archive');
const shardBytes = 40 * 2 ** 20; // compressed bytes per shard (GitHub's 100 MB file limit)
const sha = (file: string) => createHash('sha256').update(fs.readFileSync(file)).digest('hex');

const manifest: Record<string, unknown> = {
  study: 'growth140-vgt-stable',
  exportedAt: new Date().toISOString(),
  format: 'gzip JSONL, one {"key", "value"} object per line, keys in ascending order; NaN/±Infinity encoded as "__NaN"/"__Inf"/"__-Inf"',
  jobs: {}
};

for (const job of process.argv.slice(2)) {
  const file = path.join(root, '.cache/growth140-vgt-stable/jobs', job, 'archive.sqlite');
  const db = new DatabaseSync(file, { readOnly: true });
  const dir = path.join(outRoot, job);
  const tables: Record<string, unknown> = {};

  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(dir, { recursive: true });

  for (const table of ['points', 'configs', 'fits']) {
    const shards: { file: string; rows: number; sha256: string }[] = [];
    let after = '';
    let shard = 0;
    let rows = 0;
    let gz: zlib.Gzip | null = null;
    let out: fs.WriteStream | null = null;
    let written = 0;
    const open = () => {
      const name = `${table}-${String(shard).padStart(3, '0')}.jsonl.gz`;

      out = fs.createWriteStream(path.join(dir, name));
      gz = zlib.createGzip({ level: 9 });
      gz.pipe(out);
      gz.on('data', (b: Buffer) => (written += b.length));
      shards.push({ file: name, rows: 0, sha256: '' });
    };
    const close = async () => {
      if (!gz) return;
      await new Promise<void>((resolve) => {
        out!.on('finish', () => resolve());
        gz!.end();
      });
      shards.at(-1)!.sha256 = sha(path.join(dir, shards.at(-1)!.file));
      gz = null;
      shard++;
      written = 0;
    };

    for (;;) {
      const page = db.prepare(`SELECT key, json FROM ${table} WHERE key > ? ORDER BY key LIMIT 5000`).all(after, ) as { key: string; json: string }[];

      if (page.length === 0) break;
      for (const r of page) {
        if (!gz) open();
        gz!.write(`{"key":${JSON.stringify(r.key)},"value":${r.json}}\n`);
        shards.at(-1)!.rows++;
        rows++;
      }
      after = page.at(-1)!.key;
      await new Promise((r) => setImmediate(r));
      if (written >= shardBytes) await close();
    }

    await close();
    tables[table] = { rows, shards };
  }

  db.close();
  (manifest.jobs as Record<string, unknown>)[job] = { sqlite: path.relative(root, file), sqliteSha256: sha(file), bytes: fs.statSync(file).size, tables };
  console.log(`${job}: exported`);
}

fs.writeFileSync(path.join(outRoot, 'MANIFEST.json'), `${JSON.stringify(manifest, null, 1)}\n`);
