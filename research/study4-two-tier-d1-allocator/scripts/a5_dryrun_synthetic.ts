// The A5 pre-rerun dry run (AMENDMENTS.md A5): the 4E evaluation core with the REAL sealed fold selections and stage
// records on a SYNTHETIC 61-symbol market (no door, no bar read; outcome lines are synthetic). Read-only. Run from the
// repository root: node --experimental-transform-types research/study4-two-tier-d1-allocator/scripts/a5_dryrun_synthetic.ts
// (as run on 2026-10-30 from the scratchpad with absolute imports; the imports are now repository-relative).
import { syntheticMarket } from '../../../src/study3-vgt-momentum-stage1b/tests/synthetic.ts';
import { loadB5 } from '../../../src/study4-two-tier-d1-allocator/books.ts';
import { foldKeys, resultFile, study } from '../../../src/study4-two-tier-d1-allocator/context.ts';
import { selectionFile } from '../../../src/study4-two-tier-d1-allocator/doors.ts';
import { type World, evaluateWorld } from '../../../src/study4-two-tier-d1-allocator/evaluation.ts';
import { readSealed } from '../../../src/study4-two-tier-d1-allocator/records.ts';

const datasets = Object.fromEntries(
  study.universe.map((symbol: string, i: number) => {
    const ds = syntheticMarket(2012, 900 + i, 30);

    ds.id = `dry-${symbol}`;
    return [symbol, ds];
  })
);
const dates = datasets.VGT!.dates;
const yearEnd = Object.fromEntries(
  ['2019', '2020', '2021', '2022', '2023'].map((year) => [year, Math.max(...dates.map((d: string, i: number) => (d.startsWith(year) ? i : -1)))])
);
const b5 = await loadB5();
const world: World = { datasets, dates, armStart: dates.findIndex((d: string) => d >= '2017-06-15'), endIndex: dates.length - 1, yearEnd, b5: b5.books };
const selections = Object.fromEntries(foldKeys.map((fold) => [fold, readSealed(selectionFile(fold))])) as never;
const t0 = Date.now();
const { rubric, referenceChecks } = await evaluateWorld(world, selections, (fold, stage) => readSealed(resultFile(fold, stage, 'RECORD.json')) as never, (line) => console.log('[synthetic] ' + line.slice(0, 60)));

console.log('dry run complete; reference checks', referenceChecks.length, 'pass', referenceChecks.every((c) => c.pass), 'stages', Object.keys(rubric).length, 'seconds', ((Date.now() - t0) / 1000).toFixed(0));
