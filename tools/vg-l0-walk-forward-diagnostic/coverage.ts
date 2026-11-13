// D10 (amendment A3): New L0 evaluated as if it had been a C21 member, on the C21 training door D21 only — centre, the
// 10 bps stress and the confirmation family the shadow study would have drawn for a C21 member — gates Q1–Q6 as NL0
// defines them, and its rank by centre net among the C21 qualified sets of the calendar studies (5B L0, B1, B2).
// HINDSIGHT, report-only: New L0 was chosen with later data and was in no C21 archive; this asks only whether the space
// held a better-scoring, gate-passing region that the fresh C21 searches did not find (coverage), never what C21 could
// have selected.
import path from 'node:path';
import { openPrefixDoor } from '../../src/vg-d1-growth-joint/data.ts';
import { optionsOfInc } from '../../src/vg-l0-shadow-eligibility/config.ts';
import { evaluate } from '../../src/vg-l0-shadow-eligibility/evaluate.ts';
import { drawsOf, famOf, pooledStats, stresses } from '../../src/vg-l0-shadow-eligibility/qualify.ts';
import { audited, ceiling, logDoor, readRecord, repoRoot, resultsDir, sealJson } from './common.ts';

const door = await openPrefixDoor('D21', 'wfd D10 coverage', true);

logDoor('D21', 'D10 New L0 as a hypothetical C21 member (training door; hindsight, report-only)', {
  GDX: door.sym.GDX.dataSha256,
  VGT: door.sym.VGT.dataSha256
});

const ev = readRecord<{ rows: { label: string; cfg: any }[] }>(path.join(repoRoot, audited.B1.path, 'results/folds/C21/evaluation.json'));
const cfg = ev.rows.find((r) => r.label === 'control: NL0')!.cfg;
const o = optionsOfInc(cfg.inc);
let simulations = 0;
const centre = evaluate(door, cfg.quad, o, cfg.sh);
const stress = evaluate(door, cfg.quad, { ...o, friction: { ...(o.friction ?? {}), ...stresses['cost 10 bps']! } }, cfg.sh);

simulations += 2;

const fams = [1, 2, 3].map((rep) => {
  const draws = drawsOf(cfg, o, famOf('confirm', ['confirm', rep, 'C21'], 'joint'));
  const recs = draws.map((d) => {
    simulations++;
    return evaluate(door, d.quad, o, cfg.sh);
  });

  return { draws, recs };
});
const confirm = pooledStats(centre, fams);
const books = centre.books as Record<string, { lots: number }>;
const gates = {
  Q1: centre.net > 0,
  Q2: centre.dd <= ceiling,
  Q3: confirm.nb.p90Dd <= ceiling,
  Q4: confirm.nb.p10 > 0,
  Q5: stress.net > 0 && stress.dd <= ceiling,
  Q6: (books['D1:GDX']!.lots + books['D1:VGT']!.lots > 0) && books['G:VGT']!.lots > 0
};
const sets = [
  ['5B-L0', path.join(audited['5B-L0'].path, 'results/folds/C21/selection.json'), 'L0/independent'],
  ['B1', path.join(audited.B1.path, 'results/folds/C21/B1/selection.json'), 'B1'],
  ['B2', path.join(audited.B2.path, 'results/folds/C21/B2-g/selection.json'), 'B2-g']
].map(([key, file, set]) => {
  const s = readRecord<{ roles: Record<string, { ranked: { label: string; net: number }[] }> }>(path.join(repoRoot, file!)).roles[set!]!;
  const above = s.ranked.filter((x) => x.net > centre.net).length;

  return { path: key, qualified: s.ranked.length, rank1: s.ranked[0], newL0WouldRank: above + 1 };
});

sealJson(
  path.join(resultsDir, 'coverage', 'newl0-at-c21.json'),
  {
    stage: 'D10 New L0 as a hypothetical C21 member on D21 (hindsight, report-only)',
    simulations,
    centre: { net: centre.net, realized: centre.realized, unrealized: centre.unrealized, dd: centre.dd, lots: centre.lots, topEpisodeShare: centre.topEpisodeShare, books: centre.books },
    stress10bps: { net: stress.net, dd: stress.dd },
    confirmation: { unique: confirm.unique, drawn: confirm.drawn, median: confirm.nb.median, p10: confirm.nb.p10, p90Dd: confirm.nb.p90Dd, breachShare: confirm.tail.breachShare, worst10Mean: confirm.tail.worst10Mean, worstDd: confirm.tail.worstDd },
    gates,
    qualifies: Object.values(gates).every(Boolean),
    rankAmongC21QualifiedSets: sets,
    finished: new Date().toISOString()
  },
  'D10 coverage'
);
console.log(JSON.stringify({ centre: { net: centre.net, dd: centre.dd }, stress: { net: stress.net, dd: stress.dd }, confirm: { p10: confirm.nb.p10, p90Dd: confirm.nb.p90Dd, breach: confirm.tail.breachShare }, gates, sets, simulations }));
