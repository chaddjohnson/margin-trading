// gpu-phase4 isolation test I7 (PROTOCOL.md §9.3): the engine's dataset export (src/gpu-backend/dataset.ts
// exportDataset, a plain write of <dir>/<door>.gb2ds) into ONE shared directory by several concurrent processes — the
// collision that concurrent jobs sharing a cache directory would cause. NON-OFFICIAL; a scratch directory under this
// study's cache; no evaluation. Each child process, in a loop: exports the door into the shared directory, then has its
// own GPU server LOAD the file (the server reads the whole file and verifies its size and checksum). Every LOAD must
// either verify — and then the dataset the server holds is checked against the expected one (its session and bar counts
// from the LOAD reply, and the file's sha256 read back right after) — or be refused; a load that is accepted with other
// content would be a silent corruption.
//   node --experimental-transform-types tools/gpu-phase4/dataset-race.ts --procs 4 --loops 25 --door D19 --out <json>
//   (child mode: --child <i> --dir <shared> …)
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { spawn } from 'node:child_process';
import { type DoorKey, cacheDir, openDoor, writeJson } from '../../src/gpu-phase4/context.ts';
import { exportDataset } from '../../src/gpu-backend/dataset.ts';
import { GpuServer } from '../../src/gpu-backend/client.ts';
import { serverBinary, toolkitLib } from '../../src/gpu-backend/toolchain.ts';

const args = process.argv.slice(2);
const opt = (k: string, d: string) => (args.includes(`--${k}`) ? args[args.indexOf(`--${k}`) + 1]! : d);
const doorKey = opt('door', 'D19') as DoorKey;
const loops = Number(opt('loops', '25'));

if (args.includes('--child')) {
  const i = Number(opt('child', '0'));
  const dir = opt('dir', '');
  const door = await openDoor(doorKey, `gpu-phase4 I7 dataset race (child ${i}, no evaluation)`);
  // the expected dataset: exported once into this child's PRIVATE directory
  const own = exportDataset(door, path.join(dir, '..', `private-${i}`));
  const server = GpuServer.start({ binary: serverBinary, libDir: toolkitLib });

  await server.info();
  const rows: { loop: number; outcome: 'verified' | 'refused' | 'wrong'; detail: string }[] = [];

  for (let n = 0; n < loops; n++) {
    exportDataset(door, dir); // the shared write (the collision)
    const file = path.join(dir, `${doorKey}.gb2ds`);

    try {
      const r = (await server.load(file)) as { sessions?: number; bars?: number[] };
      const now = createHash('sha256').update(fs.readFileSync(file)).digest('hex');
      const same =
        r.sessions === own.sessions && JSON.stringify(r.bars) === JSON.stringify([own.bars.GDX, own.bars.VGT]);

      rows.push({
        loop: n,
        outcome: same ? 'verified' : 'wrong',
        detail: `${r.sessions} sessions; file now ${now === own.sha256 ? 'equal' : 'different'}`
      });
    } catch (e) {
      rows.push({ loop: n, outcome: 'refused', detail: (e as Error).message.split('\n')[0]!.slice(0, 160) });
    }
  }
  await server.close();
  process.stdout.write(`${JSON.stringify({ child: i, rows })}\n`);
  process.exit(0);
}

const procs = Number(opt('procs', '4'));
const out = opt('out', '');
const shared = path.join(cacheDir, 'dataset-race', 'shared');

fs.rmSync(path.dirname(shared), { recursive: true, force: true });
fs.mkdirSync(shared, { recursive: true });

const t0 = new Date().toISOString();
const results = await Promise.all(
  Array.from(
    { length: procs },
    (_v, i) =>
      new Promise<{ child: number; rows: { outcome: string; detail: string }[] }>((resolve, reject) => {
        const c = spawn(
          process.execPath,
          [
            '--experimental-transform-types',
            '--disable-warning=ExperimentalWarning',
            import.meta.filename,
            '--child',
            String(i),
            '--dir',
            shared,
            '--door',
            doorKey,
            '--loops',
            String(loops)
          ],
          { stdio: ['ignore', 'pipe', 'inherit'] }
        );
        let buf = '';

        c.stdout.on('data', (d: Buffer) => (buf += d.toString()));
        c.on('exit', (code) => {
          const line = buf.trim().split('\n').at(-1) ?? '';

          if (code !== 0 || !line.startsWith('{')) reject(new Error(`child ${i} exited ${code}`));
          else resolve(JSON.parse(line));
        });
      })
  )
);
const all = results.flatMap((r) => r.rows);
const count = (o: string) => all.filter((r) => r.outcome === o).length;
const rec = {
  kind: 'gpu-phase4 isolation test I7: concurrent dataset export into one shared directory',
  t0,
  t1: new Date().toISOString(),
  door: doorKey,
  procs,
  loops,
  loads: all.length,
  verified: count('verified'),
  refused: count('refused'),
  wrong: count('wrong'),
  refusalReasons: [...new Set(all.filter((r) => r.outcome === 'refused').map((r) => r.detail.replace(/\d+/g, 'N')))],
  pass: count('wrong') === 0,
  interpretation:
    'pass = no load was ever accepted with other content (every load verified or was refused: fail closed); refusals show the collision is reachable when concurrent jobs share a cache directory'
};

fs.rmSync(path.dirname(shared), { recursive: true, force: true });
if (out) writeJson(out, rec);
console.log(JSON.stringify(rec));
process.exitCode = rec.pass ? 0 : 2;
