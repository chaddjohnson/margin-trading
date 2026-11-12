// Phase 1 of the New L0 trading-session study (research/vg-l0-session-hold/brief/BRIEF.md §1): recover, from the sealed
// records of Priority 5B (research/vg-lifecycle-matched-optimization/), the exact New L0 primary, the executed search
// budget of the L0 arm that produced it, and reproduce its development evidence through the UNCHANGED engine (Priority
// 3's evaluate = 5B's L0 path) on Priority 3's D24 byte-prefix door. FULL (2025–2026) is not opened here.
//
//   node --experimental-transform-types --disable-warning=ExperimentalWarning --max-old-space-size=6144 \
//     tools/vg-l0-session-hold/recover-original.ts [--out research/vg-l0-session-hold/recovery]
//
// Read-only for every 5B file (each pinned by sha256 against 5B's own seals.jsonl); writes only into --out.
import fs from 'node:fs';
import path from 'node:path';
import { decode } from '../../src/growth140-vgt-s8m/store.ts';
import { openPrefixDoor } from '../../src/vg-d1-growth-joint/data.ts';
import { type EvalOptions, type Rec, evaluate } from '../../src/vg-d1-growth-joint/evaluate.ts';
import { quadId } from '../../src/vg-d1-growth-joint/space.ts';
import { cfgId } from '../../src/vg-lifecycle-matched-optimization/config.ts';
import { drawsOf, famOf, pooledStats } from '../../src/vg-lifecycle-matched-optimization/qualify.ts';
import { sha256File } from '../../src/vg-lifecycle-matched-optimization/records.ts';

const repoRoot = path.resolve(import.meta.dirname, '../..');
const p5b = path.join(repoRoot, 'research/vg-lifecycle-matched-optimization');
const outArg = process.argv.indexOf('--out');
const outDir = path.resolve(repoRoot, outArg > 0 ? process.argv[outArg + 1]! : 'research/vg-l0-session-hold/recovery');
const rel = (f: string) => path.relative(repoRoot, f);
const r2 = (x: number) => Math.round(x * 100) / 100;

// ----- the sealed 5B records, each verified against 5B's own seal log -----

const seals = fs
  .readFileSync(path.join(p5b, 'results/seals.jsonl'), 'utf8')
  .trim()
  .split('\n')
  .map((l) => JSON.parse(l) as { file: string; sha256: string; stage: string });
const pinned = <T>(relFile: string): { value: T; sha256: string } => {
  const file = path.join(repoRoot, relFile);
  const sha = sha256File(file);
  const seal = seals.find((s) => s.file === relFile);

  if (!seal) throw new Error(`${relFile} is not in 5B's seal log`);
  if (seal.sha256 !== sha) throw new Error(`${relFile}: sha256 ${sha} differs from its seal ${seal.sha256}`);
  return { value: decode<T>(fs.readFileSync(file, 'utf8')), sha256: sha };
};

type Any = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

const frozen = pinned<Any>('research/vg-lifecycle-matched-optimization/FROZEN_SELECTION.json');
const sel24 = pinned<Any>('research/vg-lifecycle-matched-optimization/results/folds/C24/selection.json');
const searches: Record<string, { value: Any; sha256: string }> = {};

for (const [cut, arm] of [
  ['C19', 'indep'],
  ['C21', 'indep'],
  ['C23', 'indep'],
  ['C24', 'indep'],
  ['C24', 'informed']
] as const)
  searches[`${cut}/${arm}`] = pinned<Any>(`research/vg-lifecycle-matched-optimization/results/search/${cut}/${arm}.json`);

const selections: Record<string, { value: Any; sha256: string }> = { C24: sel24 };

for (const cut of ['C19', 'C21', 'C23'])
  selections[cut] = pinned<Any>(`research/vg-lifecycle-matched-optimization/results/folds/${cut}/selection.json`);

// ----- 1. the exact candidate -----

const r01 = (frozen.value.crossTestSubjects as Any[]).find((x) => x.row === 'R01')!;
const primary = frozen.value.arms.L0.primary as Any;
const catalog = JSON.parse(fs.readFileSync(path.join(repoRoot, 'apps/strategy-lab/catalog/pooled-candidates.json'), 'utf8'));
const cat = (catalog.candidates as Any[]).find((c) => c.id === 'l0-primary')!;
const quad = r01.quad;
const options: EvalOptions = r01.options;
const cfg = { inc: 'V' as const, quad };

const identity = {
  study5bCfgId: cfgId(cfg),
  priority3QuadId: quadId(quad),
  frozenR01: { id: r01.id, label: r01.exportedBy[0].label, roles: r01.exportedBy[0].roles },
  frozenPrimary: { label: primary.label, id: primary.id },
  catalogQuadIdentical: JSON.stringify(cat.quad) === JSON.stringify(quad),
  catalogOptionsEnabled: cat.enabled
};

if (identity.study5bCfgId !== '67cfdd9b62d1e16f' || identity.priority3QuadId !== 'a2e385640ca61012')
  throw new Error(`New L0 identity ${identity.study5bCfgId} / ${identity.priority3QuadId}`);
if (primary.id !== r01.id || !identity.catalogQuadIdentical) throw new Error('New L0: frozen selection and catalog disagree');

// ----- 2. the executed budget of the L0 arm (and of the whole study, for context) -----

const laneRows: Any[] = [];

for (const [key, s] of Object.entries(searches))
  for (const lane of s.value.lanes as Any[]) {
    const c = lane.counts as Record<string, number>;
    const refineStarts = (lane.refinements as Any[]).length;

    laneRows.push({
      job: key,
      lane: lane.key,
      mode: lane.mode,
      replicate: lane.replicate,
      cell: lane.cell,
      screened: c.screened ?? 0,
      screenUnique: c.screenUnique ?? 0,
      plausible: c.plausible ?? 0,
      promoted: c.promoted ?? 0,
      seedDesigns: c.seedDesigns ?? 0,
      islandsRun: c.islandsRun ?? 0,
      islandConfigs: c.islandConfigs ?? 0,
      fillers: c.fillers ?? 0,
      proposals: (c.screened ?? 0) + (c.seedDesigns ?? 0) + (c.islandConfigs ?? 0) + (c.fillers ?? 0),
      r1Centres: c.r1Centres ?? 0,
      r1Measured: c.r1Measured ?? 0,
      r1Feasible: c.r1Feasible ?? 0,
      r2: c.r2 ?? 0,
      r3: c.r3 ?? 0,
      refineStarts,
      refineMoves: c.refineMoves ?? 0,
      shortlist: c.shortlist ?? 0,
      distinctCentres: c.distinctCentres ?? 0,
      requested: lane.requested,
      islandEvaluations: (lane.islands as Any[]).reduce((a, i) => a + i.evaluations, 0),
      stop: lane.extension.stop
    });
  }

const sum = (rows: Any[], k: string) => rows.reduce((a, r) => a + (r[k] as number), 0);
const keys = [
  'screened',
  'seedDesigns',
  'islandConfigs',
  'fillers',
  'proposals',
  'islandsRun',
  'r1Centres',
  'r1Measured',
  'r2',
  'r3',
  'refineStarts',
  'refineMoves',
  'shortlist',
  'requested',
  'islandEvaluations'
];
const byJob = (mode: string | null) =>
  Object.fromEntries(
    Object.keys(searches).map((job) => {
      const rows = laneRows.filter((r) => r.job === job && (mode === null || r.mode === mode));

      return [job, { lanes: rows.length, ...Object.fromEntries(keys.map((k) => [k, sum(rows, k)])) }];
    })
  );
const qualification = Object.fromEntries(
  Object.entries(selections).map(([cut, s]) => {
    const per: Record<string, { members: number; requested: number }> = {};

    for (const e of s.value.evidence as Any[]) {
      const n = 1 + Object.keys(e.stress).length + Object.keys(e.removal).length + e.selectDraws.drawn + e.confirmDraws.drawn;
      const p = (per[e.mode] ??= { members: 0, requested: 0 });

      p.members++;
      p.requested += n;
    }
    return [cut, { perArm: per, jobUniqueFresh: s.value.compute.unique }];
  })
);
const jobs = Object.fromEntries(
  Object.entries(searches).map(([k, s]) => [
    k,
    {
      uniqueFresh: s.value.compute.unique,
      archiveHits: s.value.compute.archiveHits,
      minutes: s.value.minutes,
      cap: s.value.cap,
      tallies: s.value.compute.tallies,
      extensionRounds: (s.value.extensionRounds as Any[]).length,
      budgets: s.value.budgets
    }
  ])
);

// ----- 3. development reproduction through the unchanged engine (D24, in-process) -----

const door = await openPrefixDoor('D24', 'vg-l0-session-hold Phase 1: New L0 development reproduction (read-only)', true);
const t0 = Date.now();
const centre = evaluate(door, quad, options);
const sealedEv = (sel24.value.evidence as Any[]).find((e) => e.label === primary.label)!;
const fields = Object.keys(sealedEv.centre) as (keyof Rec)[];
const centreDiffs = fields.filter((k) => JSON.stringify(centre[k]) !== JSON.stringify(sealedEv.centre[k]));

// the confirmation (3 × 128) and selection (2 × 128) families with 5B's own labels and namespace
const fam = (name: 'confirm' | 'select', reps: number) =>
  Array.from({ length: reps }, (_v, i) => {
    const draws = drawsOf(cfg, options, famOf(name, [name, i + 1, 'C24'], 'joint'));

    return { draws, recs: draws.map((d) => evaluate(door, d.quad, d.options)) };
  });
const confirm = pooledStats(centre, fam('confirm', 3));
const select = pooledStats(centre, fam('select', 2));
const cmp = (a: number, b: number) => ({ reproduced: r2(a), sealed: b, equal: r2(a) === r2(b) });
const evidence = {
  confirmP10: cmp(confirm.nb.p10, sealedEv.confirm.p10),
  confirmMedian: cmp(confirm.nb.median, sealedEv.confirm.median),
  confirmP90Dd: cmp(confirm.nb.p90Dd, sealedEv.confirm.p90Dd),
  confirmBreachShare: { reproduced: confirm.nb.breachShare, sealed: sealedEv.confirm.breachShare },
  confirmUnique: { reproduced: confirm.unique, sealed: sealedEv.confirmDraws.unique },
  selectRobust: cmp(select.nb.robust, sealedEv.select.robust),
  selectP90Dd: cmp(select.nb.p90Dd, sealedEv.select.p90Dd),
  selectUnique: { reproduced: select.unique, sealed: sealedEv.selectDraws.unique }
};
const seconds = Math.round((Date.now() - t0) / 100) / 10;

const out = {
  kind: 'vg-l0-session-hold Phase 1 recovery of the New L0 primary (5B C24/L0/informed/R1#1 profit)',
  generated: new Date().toISOString(),
  sources: {
    frozenSelection: { file: 'research/vg-lifecycle-matched-optimization/FROZEN_SELECTION.json', sha256: frozen.sha256 },
    selections: Object.fromEntries(Object.entries(selections).map(([k, s]) => [k, s.sha256])),
    searches: Object.fromEntries(Object.entries(searches).map(([k, s]) => [k, s.sha256])),
    catalogEntrySha256: cat.entrySha256
  },
  identity,
  candidate: { quad, options, settings: r01.settings },
  budget: {
    note:
      'Per lane: distinct proposals = screen + seed designs + island children + fillers (refinement moves apart); requested = every evaluation the lane asked for (centres and neighbours, archive hits included). Unique fresh simulations are counted per job (all three arms).',
    L0: byJob('L0'),
    allArms: byJob(null),
    jobs,
    qualification,
    lanes: laneRows
  },
  reproduction: {
    door: { name: door.name, sessions: door.sessions, sha256: { GDX: door.sym.GDX.dataSha256, VGT: door.sym.VGT.dataSha256 } },
    centre,
    sealedCentre: sealedEv.centre,
    centreFieldsCompared: fields.length,
    centreDiffs,
    evidence,
    evaluations: 1 + confirm.drawn + select.drawn,
    seconds
  }
};

fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, 'original-recovery.json'), `${JSON.stringify(out, null, 1)}\n`);
console.log(
  JSON.stringify(
    {
      written: rel(path.join(outDir, 'original-recovery.json')),
      identity,
      centre: { net: centre.net, dd: centre.dd, lots: centre.lots, diffs: centreDiffs },
      evidence,
      seconds
    },
    null,
    1
  )
);
