// Replays of the fold primaries of 5B L0 and the shadow study's B1 / B2, and of the fixed New L0 control on the same
// slices (PROTOCOL.md §6 D3, D4, D8; gate G3). Each subject runs with its own study's code at this checkout:
//   5B L0     — Priority 3's `run` / `recordOf` (= 5B's `runLife(…, 'L0')`), options = 5B's `optionsOfInc`;
//   B1, B2    — the shadow study's `run` / `recordOf` with the subject's toggles, options = its `optionsOfInc`;
//   New L0    — the shadow study's 'control: NL0' row (toggles 000; descriptive: chosen with later data).
// Per subject: (1) the evaluation-door run with boundaries [cutoff end] reproduces the sealed fold row's record field
// for field (G3); (2) the training-door run reproduces the sealed selection centre (fold primaries; D8 causal prefix);
// (3) the slice chronology (lots, refusals, occupancy, episodes with lot contributions) and training features; (4)
// complete pooled replays with each enabled book disabled (D4: causal removal on the slice).
// Run from the repository root (see RUN_COMMANDS.md); --dry writes unsealed copies to WFD_SCRATCH.
import path from 'node:path';
import { type Door, openPrefixDoor } from '../../src/vg-d1-growth-joint/data.ts';
import { type EvalOptions, recordOf as p3RecordOf, run as p3Run } from '../../src/vg-d1-growth-joint/evaluate.ts';
import type { PrefixDoor } from '../../src/vg-d1-growth-joint/context.ts';
import type { Quad } from '../../src/vg-d1-growth-joint/space.ts';
import { optionsOfInc as vglmoOptions } from '../../src/vg-lifecycle-matched-optimization/config.ts';
import { optionsOfInc as shOptions } from '../../src/vg-l0-shadow-eligibility/config.ts';
import { recordOf as shRecordOf, run as shRun } from '../../src/vg-l0-shadow-eligibility/evaluate.ts';
import { audited, folds, logDoor, r2, readRecord, repoRoot, resultsDir, sealJson } from './common.ts';
import { compareRecords, type DoorLike, type ResultLike, sliceAnalysis, trainingAnalysis } from './core.ts';

type Inc = 'V' | 'G' | 'B' | 'D';
interface Cfg {
  inc: Inc;
  quad: Quad;
  sh?: string;
}
interface Engine {
  options: (inc: Inc) => EvalOptions;
  run: (door: Door, cfg: Cfg, o: EvalOptions) => { result: unknown };
  record: (door: Door, cfg: Cfg, x: { result: unknown }, o: EvalOptions) => Record<string, unknown>;
}

const engines: Record<'5B' | 'SH', Engine> = {
  '5B': {
    options: (inc) => vglmoOptions(inc as 'V' | 'G' | 'B'),
    run: (door, cfg, o) => p3Run(door, cfg.quad, o, true, true),
    record: (door, cfg, x, o) => p3RecordOf(door, cfg.quad, x as ReturnType<typeof p3Run>, o) as unknown as Record<string, unknown>
  },
  SH: {
    options: (inc) => shOptions(inc),
    run: (door, cfg, o) => shRun(door, cfg.quad, o, cfg.sh!, true, true),
    record: (door, cfg, x, o) =>
      shRecordOf(door, cfg.quad, x as ReturnType<typeof shRun>, o, cfg.sh!) as unknown as Record<string, unknown>
  }
};

const toggleBooks = ['D1:GDX', 'D1:VGT', 'G:VGT']; // the shadow study's toggle order
const enabledBooks = (inc: Inc) =>
  ['D1:GDX', 'D1:VGT', ...(inc === 'B' || inc === 'G' ? ['G:GDX'] : []), ...(inc === 'B' || inc === 'V' ? ['G:VGT'] : [])];

interface Subject {
  path: string;
  fold: (typeof folds)[number];
  label: string;
  role: 'fold primary' | 'control (descriptive)';
  engine: '5B' | 'SH';
  cfg: Cfg;
  sealedRow: { record: Record<string, unknown>; sliceNet: number; sliceDd: number };
  sealedCentre: Record<string, unknown> | null;
}

const subjects: Subject[] = [];

for (const f of folds) {
  const ev5 = readRecord<{ primary: Record<string, string>; rows: { label: string; mode: string; cfg: Cfg; record: Record<string, unknown>; sliceNet: number; sliceDd: number }[] }>(
    path.join(repoRoot, audited['5B-L0'].path, 'results/folds', f.fold, 'evaluation.json')
  );
  const sel5 = readRecord<{ evidence: { label: string; centre: Record<string, unknown> }[] }>(
    path.join(repoRoot, audited['5B-L0'].path, 'results/folds', f.fold, 'selection.json')
  );
  const l5 = ev5.primary.L0!;
  const r5 = ev5.rows.find((r) => r.label === l5 && r.mode === 'L0')!;

  subjects.push({
    path: '5B-L0',
    fold: f,
    label: l5,
    role: 'fold primary',
    engine: '5B',
    cfg: r5.cfg,
    sealedRow: r5,
    sealedCentre: sel5.evidence.find((e) => e.label === l5)!.centre
  });

  const evS = readRecord<{ primary: Record<string, string>; rows: { label: string; cfg: Cfg; record: Record<string, unknown>; sliceNet: number; sliceDd: number }[] }>(
    path.join(repoRoot, audited.B1.path, 'results/folds', f.fold, 'evaluation.json')
  );

  for (const [track, dir] of [
    ['B1', 'B1'],
    ['B2', 'B2-g']
  ] as const) {
    const label = evS.primary[track]!;
    const row = evS.rows.find((r) => r.label === label)!;
    const sel = readRecord<{ evidence: { label: string; centre: Record<string, unknown> }[] }>(
      path.join(repoRoot, audited.B1.path, 'results/folds', f.fold, dir, 'selection.json')
    );

    subjects.push({
      path: track,
      fold: f,
      label,
      role: 'fold primary',
      engine: 'SH',
      cfg: row.cfg,
      sealedRow: row,
      sealedCentre: sel.evidence.find((e) => e.label === label)!.centre
    });
  }

  const nl0 = evS.rows.find((r) => r.label === 'control: NL0')!;

  subjects.push({ path: 'NL0', fold: f, label: 'control: NL0', role: 'control (descriptive)', engine: 'SH', cfg: nl0.cfg, sealedRow: nl0, sealedCentre: null });
}

const doors = new Map<string, Door>();
const doorOf = async (name: PrefixDoor) => {
  if (!doors.has(name)) {
    const d = await openPrefixDoor(name, 'vg-l0-walk-forward-diagnostic replay', true);

    logDoor(name, 'replay of sealed fold selections (development door; FULL never opened)', {
      GDX: d.sym.GDX.dataSha256,
      VGT: d.sym.VGT.dataSha256
    });
    doors.set(name, d);
  }
  return doors.get(name)!;
};

let simulations = 0;
const out: Record<string, unknown>[] = [];

for (const s of subjects) {
  const e = engines[s.engine];
  const base = e.options(s.cfg.inc);
  const evalDoor = await doorOf(s.fold.evalDoor as PrefixDoor);
  const o: EvalOptions = { ...base, boundaries: [s.fold.boundary] };
  const x = e.run(evalDoor, s.cfg, o);
  const rec = e.record(evalDoor, s.cfg, x, o);

  simulations++;

  const g3 = compareRecords(rec, s.sealedRow.record);
  const b = evalDoor.dates.indexOf(s.fold.boundary);
  let causal: { fields: number; diffs: string[] } | null = null;

  if (s.sealedCentre) {
    const trainDoor = await doorOf(s.fold.trainDoor as PrefixDoor);
    const y = e.run(trainDoor, s.cfg, base);

    simulations++;
    causal = compareRecords(e.record(trainDoor, s.cfg, y, base), s.sealedCentre);
  }

  // D4: each enabled book disabled (a disabled book's shadow toggle is 0, the shadow study's canonical form)
  // plus the whole D1 pair, and (B structures) both Growth books
  const removals: string[][] = [
    ...enabledBooks(s.cfg.inc).map((bk) => [bk]),
    ['D1:GDX', 'D1:VGT'],
    ...(s.cfg.inc === 'B' ? [['G:GDX', 'G:VGT']] : [])
  ];
  const removal = removals.map((bks) => {
    const bk = bks.join(' + ');
    const sh = s.cfg.sh ? toggleBooks.map((tb, i) => (bks.includes(tb) ? '0' : s.cfg.sh![i])).join('') : undefined;
    const cfg: Cfg = { ...s.cfg, ...(sh ? { sh } : {}) };
    const ro: EvalOptions = { ...o, enabled: { ...(o.enabled ?? {}), ...Object.fromEntries(bks.map((x) => [x, false])) } };
    const rr = e.record(evalDoor, cfg, e.run(evalDoor, cfg, ro), ro) as unknown as {
      net: number;
      periods: { after: number; dd: number; equity: number }[];
      dd: number;
    };

    simulations++;
    return {
      without: bk,
      sliceNet: rr.periods[0]!.after,
      sliceDd: rr.periods[0]!.dd,
      boundaryEquity: rr.periods[0]!.equity,
      wholeNet: rr.net,
      wholeDd: rr.dd,
      causalSliceNet: r2(s.sealedRow.sliceNet - rr.periods[0]!.after),
      causalSliceDd: r2(s.sealedRow.sliceDd - rr.periods[0]!.dd)
    };
  });
  const r = x.result as ResultLike;
  const row = {
    path: s.path,
    fold: s.fold.fold,
    label: s.label,
    role: s.role,
    engine: s.engine,
    cfg: s.cfg,
    sealed: { sliceNet: s.sealedRow.sliceNet, sliceDd: s.sealedRow.sliceDd },
    g3: { ok: g3.diffs.length === 0, ...g3 },
    causalPrefix: causal ? { ok: causal.diffs.length === 0, ...causal } : null,
    slice: sliceAnalysis(evalDoor as unknown as DoorLike, r, s.fold.boundary),
    training: trainingAnalysis(r, b),
    removal
  };

  out.push(row);
  console.log(
    `${s.path} ${s.fold.fold} ${s.label}: G3 ${row.g3.ok ? 'ok' : `DIFF ${g3.diffs.join(',')}`}; causal ${causal ? (causal.diffs.length ? `DIFF ${causal.diffs.join(',')}` : 'ok') : 'n/a'}; slice ${row.slice.sliceNet} (sealed ${s.sealedRow.sliceNet})`
  );
}

sealJson(
  path.join(resultsDir, 'replays', 'primaries.json'),
  {
    stage: 'replays: fold primaries of 5B L0, B1, B2 and the New L0 control (D3, D4, D8, G3)',
    simulations,
    g3Failed: out.filter((x) => !(x.g3 as { ok: boolean }).ok).length,
    causalFailed: out.filter((x) => x.causalPrefix && !(x.causalPrefix as { ok: boolean }).ok).length,
    subjects: out,
    finished: new Date().toISOString()
  },
  'replays primaries'
);
console.log(`simulations ${simulations}`);
