// Supplementary, report-only (outside the frozen plan; disclosed in REPORT.md): the causal chain of the largest
// lifecycle × phenotype interaction in the chronological paths — L2's C19 fold primary in its 2020–2021 slice (door D21,
// already opened by the sealed fold evaluation) under L0, L1 and L2. Three continuous runs; nothing is selected or sealed.
import fs from 'node:fs';
import path from 'node:path';
import { decode } from '../../src/growth140-vgt-s8m/store.ts';
import { recordOf } from '../../src/vg-d1-growth-joint/evaluate.ts';
import { matchLots } from '../../src/vg-d1-growth-joint/post.ts';
import { ledgerOf, requestsOf, retainedOf, summaryOf } from '../../src/vg-growth-funding-lifecycle/evaluate.ts';
import { optionsOf } from '../../src/vg-lifecycle-matched-optimization/config.ts';
import { openStudyDoor } from '../../src/vg-lifecycle-matched-optimization/doors.ts';
import { runLife } from '../../src/vg-lifecycle-matched-optimization/life.ts';

const res = path.resolve(import.meta.dirname, '../../research/vg-lifecycle-matched-optimization/results');
const sel = decode<{ primary: Record<string, string>; evidence: { label: string; cfg: { inc: 'V' | 'G' | 'B'; quad: never } }[] }>(fs.readFileSync(path.join(res, 'folds/C19/selection.json'), 'utf8'));
const e = sel.evidence.find((x) => x.label === sel.primary.L2)!;
const door = await openStudyDoor('D21', 'supplementary report-only mechanism of the L2 C19 fold primary (2020–2021 slice)');
const o = { ...optionsOf(e.cfg), boundaries: ['2019-12-31'] };
const runs = Object.fromEntries((['L0', 'L1', 'L2'] as const).map((m) => [m, runLife(door, e.cfg.quad, o, m)]));
const b = door.dates.indexOf('2019-12-31');
const inSlice = (l: { entryS: number; fills: { s: number }[]; open: boolean }) => l.open || l.fills.at(-1)!.s > b;
const out = {
  kind: 'supplementary report-only mechanism (not in the frozen plan)',
  subject: e.label,
  door: 'D21',
  slice: '2020-01-02 → 2021-12-31',
  runs: Object.fromEntries(
    Object.entries(runs).map(([m, x]) => {
      const rec = recordOf(door, e.cfg.quad, x, o);

      return [
        m,
        {
          sliceNet: rec.periods[0]!.after,
          sliceDd: rec.periods[0]!.dd,
          summary: summaryOf(door, m as 'L0', x, b),
          lotsInSlice: ledgerOf(door, x.result).filter((l, i) => inSlice(x.result.lots[i]!)),
          growthRequests: Object.fromEntries(Object.entries(x.life).map(([bk, l]) => [bk, requestsOf(door, l).filter((q) => q.date >= '2019-12-01')])),
          retained: Object.fromEntries(Object.entries(x.life).map(([bk, l]) => [bk, retainedOf(door, l).filter((q) => q.refusedDate >= '2019-12-01')]))
        }
      ];
    })
  ),
  l2VersusL0: matchLots(runs.L2!.result, runs.L0!.result)
};
fs.mkdirSync(path.join(res, 'supplementary'), { recursive: true });
fs.writeFileSync(path.join(res, 'supplementary/c19-l2-primary-mechanism.json'), `${JSON.stringify(out, null, 1)}\n`);
console.log(JSON.stringify({ subject: out.subject, ...Object.fromEntries(Object.entries(out.runs).map(([m, r]) => [m, { net: r.sliceNet, dd: r.sliceDd, lots: r.lotsInSlice.length }])) }));
