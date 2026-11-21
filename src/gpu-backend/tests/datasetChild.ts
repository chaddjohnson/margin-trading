// gpu-backend tests: the synthetic doors of dataset.test.ts and, run as a script, one concurrent WRITER or READER
// process of those tests (a child process: the atomic publication is a cross-process contract).
//   node --experimental-transform-types src/gpu-backend/tests/datasetChild.ts write <root> <tag> <rounds> <startAt> <gapMs>
//   node --experimental-transform-types src/gpu-backend/tests/datasetChild.ts read  <root> <rounds> <untilMs> <sha256,sha256…>
//   node --experimental-transform-types src/gpu-backend/tests/datasetChild.ts loop  <root>          (exports until killed)
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fixtureDoorOf } from '../../vg-d1-growth-joint/data.ts';
import { sessionOf, weekdays } from '../../d1-risk-controls/tests/fixtures.ts';
import { Rng, deriveSeed } from '../../optimizer/rng.ts';
import { DatasetCacheError, exportDataset, isCompleteDataset } from '../dataset.ts';

// a small seeded two-symbol door; `tag` changes the prices (another dataset under the same door name)
export const testDoor = (name: string, tag: string, sessions: number) => {
  const rng = new Rng(deriveSeed('gpu-backend', 'dataset-test', tag));
  const dates = weekdays(sessions, '2017-01-02');
  const make = (p0: number) => {
    let p = p0;

    return dates.map((date) => {
      p = Math.max(1, Math.round(p * (1 + (rng.next() - 0.5) * 0.04) * 4) / 4);
      const bars = Array.from({ length: 5 }, () => {
        const o = p;

        p = Math.max(1, Math.round(p * (1 + (rng.next() - 0.5) * 0.01) * 4) / 4);
        return { o, c: p };
      });

      return sessionOf(date, bars);
    });
  };

  return fixtureDoorOf(name, { GDX: make(40), VGT: make(100) });
};

export const NAME = 'dataset-test';
export const targetOf = (dir: string) => path.join(dir, `fixture_${NAME}.gb2ds`);

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(import.meta.filename)) {
  const [mode, root, ...rest] = process.argv.slice(2);

  if (mode === 'write') {
    const [tag, rounds, startAt, gapMs] = rest;
    const door = testDoor(NAME, tag!, 120);
    const out: { round: number; outcome: string; sha256?: string }[] = [];

    for (let r = 0; r < Number(rounds); r++) {
      while (Date.now() < Number(startAt) + r * Number(gapMs)); // every writer of a round starts at the same instant
      try {
        const d = exportDataset(door, path.join(root!, `r${r}`));

        out.push({ round: r, outcome: d.published, sha256: d.sha256 });
      } catch (e) {
        out.push({ round: r, outcome: e instanceof DatasetCacheError ? e.code : `ERROR ${(e as Error).message}` });
      }
    }
    process.stdout.write(`${JSON.stringify({ tag, out })}\n`);
  } else if (mode === 'read') {
    const [rounds, untilMs, shas] = rest;
    const ok = new Set(shas!.split(','));
    let reads = 0;
    let absent = 0;
    const bad: string[] = [];

    while (Date.now() < Number(untilMs))
      for (let r = 0; r < Number(rounds); r++) {
        let b: Buffer;

        try {
          b = fs.readFileSync(targetOf(path.join(root!, `r${r}`)));
        } catch {
          absent++;
          continue;
        }
        reads++;
        if (!isCompleteDataset(b) || !ok.has(createHash('sha256').update(b).digest('hex')))
          bad.push(`round ${r}: ${b.length} bytes`);
      }
    process.stdout.write(`${JSON.stringify({ reads, absent, bad: bad.slice(0, 10), badCount: bad.length })}\n`);
  } else if (mode === 'loop') {
    const door = testDoor(NAME, 'a', 260);

    process.stdout.write('ready\n');
    for (let i = 0; ; i++) exportDataset(door, path.join(root!, `k${i}`));
  }
}
