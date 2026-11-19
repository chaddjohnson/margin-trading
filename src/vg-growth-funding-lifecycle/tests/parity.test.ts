// The lifecycle engine against the canonical one (PROTOCOL.md §5.3, §12): the copied orchestrator differs from the
// canonical simulateTrading only by the recorded LIFECYCLE insertions (results/engine/orchestrator.diff), the canonical
// source is the pinned v1.4.0 file, and (real data, skipped without the development door) the lifecycle engine in L0
// mode reproduces runGrowthBook for the three core Growth books on D24.
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { describe, test } from 'node:test';
import { encode } from '../../growth140-vgt-s8m/store.ts';
import { runGrowthBook } from '../../vg-d1-growth-joint/books.ts';
import { doorFile } from '../../vg-d1-growth-joint/context.ts';
import { openPrefixDoor } from '../../vg-d1-growth-joint/data.ts';
import { repoRoot, researchDir } from '../context.ts';
import { lifeBookOf } from '../growthBook.ts';
import { loadSubjects } from '../subjects.ts';

const canonical = path.join(repoRoot, 'src/growth-trading/riseTrading.ts');
const mine = path.join(repoRoot, 'src/vg-growth-funding-lifecycle/lifecycle.ts');

describe('the copied orchestrator', () => {
  test('the canonical source is the pinned riseTrading.ts v1.4.0', () => {
    assert.equal(
      createHash('sha256').update(fs.readFileSync(canonical)).digest('hex'),
      '78b3423caf2ec09f17be4a35ceac01b5d510ca9370cb2d7fbb5b162e48e4018b'
    );
  });

  test('it differs from simulateTrading only by the recorded LIFECYCLE insertions', () => {
    const lines = fs.readFileSync(mine, 'utf8').split('\n');
    const start = lines.findIndex((l) => l.startsWith('export const simulateLifecycle'));
    const a = fs.readFileSync(canonical, 'utf8').split('\n').slice(495, 1062).join('\n');
    const b = lines.slice(start).join('\n');
    const dir = fs.mkdtempSync(path.join(path.dirname(mine), '.diff-'));

    try {
      fs.writeFileSync(path.join(dir, 'a'), `${a}\n`);
      fs.writeFileSync(path.join(dir, 'b'), b);

      let diff = '';

      try {
        execFileSync('diff', [path.join(dir, 'a'), path.join(dir, 'b')], { encoding: 'utf8' });
      } catch (e) {
        diff = (e as { stdout: string }).stdout;
      }
      assert.equal(diff, fs.readFileSync(path.join(researchDir, 'results/engine/orchestrator.diff'), 'utf8'));
      for (const l of diff.split('\n').filter((x) => x.startsWith('> ')))
        assert.ok(
          !/^> .*\b(ShadowBook|book\.)\b.*=/.test(l) || /LIFECYCLE|lifecycle|LifecycleBook|ShadowBook\(/.test(l),
          l
        );
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe(
  'real data (D24): L0 lifecycle books equal the canonical books',
  { skip: !fs.existsSync(doorFile('D24', 'VGT')) },
  () => {
    test('#4, 08500a60 and Appendix A', async () => {
      const door = await openPrefixDoor('D24', 'test: lifecycle L0 parity', true);
      const s = loadSubjects();

      for (const [k, sym] of [
        ['A', 'GDX'],
        ['A', 'VGT'],
        ['B', 'VGT']
      ] as const) {
        const q = s.find((x) => x.key === k)!.quad;
        const a = runGrowthBook(door.sym[sym], door, q.g[sym]);
        const b = lifeBookOf(door.sym[sym], door, q.g[sym], 'L0', () => true);

        assert.equal(encode(a.trades), encode(b.trades), `${k} ${sym}`);
        assert.deepEqual(a.standalone, b.standalone);
      }
    });
  }
);
