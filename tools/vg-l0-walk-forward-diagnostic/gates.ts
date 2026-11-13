// Gates G1, G2, G4 and diagnostic D2 (PROTOCOL.md §6, §12):
//   G1 every audited record used verifies against its study's results/seals.jsonl;
//   G2 the evaluation digests of Priority 3, 5B and the shadow study at this checkout, beside their sealed values;
//   G4/D2 every sequential path recomputed independently (this file's own strict tracker) from the fold mark caches the
//         sealed DDs were computed from: net, DD, peak, trough, and each fold's reset slice DD; plus the sequential
//         path's drawdown episodes (peak → trough → recovery), which the sealed records do not list.
// Run from the repository root: node --experimental-transform-types tools/vg-l0-walk-forward-diagnostic/gates.ts
import fs from 'node:fs';
import path from 'node:path';
import { codeDigest as p3Digest } from '../../src/vg-d1-growth-joint/lab.ts';
import { codeDigest as vglmoDigest } from '../../src/vg-lifecycle-matched-optimization/lab.ts';
import { codeDigest as shDigest } from '../../src/vg-l0-shadow-eligibility/lab.ts';
import { episodesOf } from './episodes.ts';
import { audited, folds, isoMin, pathKeys, r2, readRecord, rel, repoRoot, resultsDir, sealJson, sha256File } from './common.ts';

// ----- G1 -----

const sealedRecords: Record<string, string[]> = {
  'vg-lifecycle-matched-optimization': [
    ...['C19', 'C21', 'C23'].flatMap((c) => [`results/folds/${c}/selection.json`, `results/folds/${c}/evaluation.json`]),
    'results/folds/sequential.json',
    'FROZEN_SELECTION.json'
  ],
  'vg-l0-session-hold': [
    ...['C19', 'C21', 'C23'].flatMap((c) => [`results/folds/${c}/selection.json`, `results/folds/${c}/evaluation.json`]),
    'results/folds/sequential.json',
    'FROZEN_SELECTION.json'
  ],
  'vg-l0-shadow-eligibility': [
    ...['C19', 'C21', 'C23'].flatMap((c) => [
      `results/folds/${c}/B1/selection.json`,
      `results/folds/${c}/B2-d1/selection.json`,
      `results/folds/${c}/B2-g/selection.json`,
      `results/folds/${c}/evaluation.json`
    ]),
    'results/folds/sequential.json',
    'FROZEN_SELECTION.json'
  ],
  'vgt-d1-growth-joint': ['results/folds/sequential.json'],
  'vg-d1-growth-joint': ['results/folds/sequential.json'],
  'vg-d1-growth-expanded': ['results/folds/sequential.json'],
  'c4-gdx-growth-partner': ['results/folds/sequential.json'],
  'gdx-growth-standalone': ['results/folds/sequential.json'],
  'growth-etf-screening': ['results/folds/sequential.json']
};

const g1 = Object.entries(sealedRecords).flatMap(([study, files]) => {
  const seals = new Map<string, string>();

  for (const line of fs.readFileSync(path.join(repoRoot, 'research', study, 'results', 'seals.jsonl'), 'utf8').split('\n'))
    if (line.trim()) {
      const s = JSON.parse(line) as { file: string; sha256: string };

      seals.set(s.file, s.sha256); // the latest seal of a path (a sealed record is never rewritten)
    }

  return files.map((f) => {
    const file = path.join('research', study, f);
    const sha = sha256File(path.join(repoRoot, file));
    const sealed = seals.get(file) ?? null;

    return { file, sha256: sha, sealed, ok: sealed === sha };
  });
});

// ----- G2 -----

const g2 = {
  priority3: { digest: p3Digest(), sealed: '147cad7c17eff3fa50442d2cb0ffb9c22cb7ba5091a46d1e14d3351d5cff4e88' },
  '5B': {
    digest: vglmoDigest(),
    sealed: '3f902532b651da1939f67d650d381bcf1e27ad3b76b3f2dedef95403fba23e3b',
    note: "5B's evaluation digest after its amendment A1 (NL0 §3.7)"
  },
  shadow: {
    digest: shDigest(),
    sealed: readRecord<{ evaluationDigest: string }>(
      path.join(repoRoot, 'research/vg-l0-shadow-eligibility/results/protocol-freeze.json')
    ).evaluationDigest,
    note: "the shadow study's frozen evaluation digest (results/protocol-freeze.json)"
  }
};

// ----- G4 / D2: an independent strict tracker -----

class Strict {
  peak: number;
  peakT: number;
  max = 0;
  ddPeakT: number;
  troughT: number;
  peakValue: number;
  recoveryT = Number.NaN;
  private open = false;

  constructor(v: number, t: number) {
    this.peak = v;
    this.peakT = t;
    this.ddPeakT = t;
    this.troughT = t;
    this.peakValue = v;
  }

  add(v: number, t: number) {
    if (v > this.peak) {
      if (this.open && v >= this.peakValue) {
        this.recoveryT = t;
        this.open = false;
      }
      this.peak = v;
      this.peakT = t;
    }
    if (this.peak - v > this.max) {
      this.max = this.peak - v;
      this.ddPeakT = this.peakT;
      this.troughT = t;
      this.peakValue = this.peak;
      this.recoveryT = Number.NaN;
      this.open = true;
    }
  }
}

type Mark = { label: string; mode?: string; unit?: string; t: number[]; v: number[] };
type Part = { fold: string; label: string | null; sliceNet: number; sliceDd: number; charge: number };
type Proc = { name: string; parts: Part[]; net: number; netBeforeCharges: number; charges: number; sequentialDd: number; ddPeak: string; ddTrough: string };

const procedureOf = (key: (typeof pathKeys)[number]): Proc => {
  const a = audited[key];
  const seq = readRecord<Record<string, unknown>>(path.join(repoRoot, a.path, 'results/folds/sequential.json'));

  if (key === '5B-L0')
    return (seq.arms as { mode: string; procedure: Proc }[]).find((x) => x.mode === 'L0')!.procedure;
  if (key === 'SES')
    return (seq.arms as { unit?: string; procedure: Proc }[]).find((x) => x.procedure.name.startsWith('ses:'))!.procedure;
  return (seq.procedures as { track: string; procedure: Proc }[]).find((x) => x.track === key)!.procedure;
};

const marksOf = (key: (typeof pathKeys)[number], fold: string, label: string): Mark => {
  const a = audited[key];
  const file = path.join(repoRoot, '.cache', a.study, 'folds', 'study', `${fold}-closes.json`);
  const rows = JSON.parse(fs.readFileSync(file, 'utf8')) as Mark[];
  const m = rows.find(
    (r) =>
      r.label === label &&
      ('mode' in a ? r.mode === a.mode : true) &&
      ('unit' in a ? r.unit === a.unit : true)
  );

  if (!m) throw new Error(`${key} ${fold}: no marks for ${label}`);
  return m;
};

const cacheShas: Record<string, string> = {};
const g4 = pathKeys.map((key) => {
  const p = procedureOf(key);
  const tr = new Strict(0, 0);
  const seqT: number[] = [];
  const seqV: number[] = [];
  let offset = 0;
  const parts = p.parts.map((part, i) => {
    const f = folds[i]!;
    const file = path.join('.cache', audited[key].study, 'folds', 'study', `${f.fold}-closes.json`);

    cacheShas[file] ??= sha256File(path.join(repoRoot, file));

    const m = part.label ? marksOf(key, f.fold, part.label) : { t: [], v: [] };
    const reset = new Strict(0, 0);

    offset -= part.charge;
    for (let k = 0; k < m.t.length; k++) {
      tr.add(offset + m.v[k]!, m.t[k]!);
      reset.add(m.v[k]!, m.t[k]!);
      seqT.push(m.t[k]!);
      seqV.push(offset + m.v[k]!);
    }

    const sliceNet = m.v.at(-1) ?? 0;

    offset += sliceNet;
    return {
      fold: f.fold,
      label: part.label,
      sliceNet: r2(sliceNet),
      sealedSliceNet: part.sliceNet,
      resetDd: r2(reset.max),
      sealedSliceDd: part.sliceDd,
      resetPeak: isoMin(reset.ddPeakT),
      resetTrough: isoMin(reset.troughT),
      resetRecovery: isoMin(reset.recoveryT),
      charge: part.charge,
      marks: m.t.length,
      ok: r2(sliceNet) === part.sliceNet && r2(reset.max) === part.sliceDd
    };
  });
  const net = r2(offset);
  const eps = episodesOf(seqT, seqV, 0).slice(0, 6).map((e) => ({
    peak: isoMin(e.peakT),
    trough: isoMin(e.troughT),
    recovery: isoMin(e.recoveryT),
    depth: r2(e.depth),
    peakValue: r2(e.peak),
    troughValue: r2(e.trough),
    breach: e.depth > 35000
  }));

  return {
    path: key,
    procedure: p.name,
    parts,
    net,
    sealedNet: p.net,
    dd: r2(tr.max),
    sealedDd: p.sequentialDd,
    peak: isoMin(tr.ddPeakT),
    sealedPeak: p.ddPeak,
    trough: isoMin(tr.troughT),
    sealedTrough: p.ddTrough,
    recovery: isoMin(tr.recoveryT),
    episodes: eps,
    ok:
      net === p.net &&
      r2(tr.max) === p.sequentialDd &&
      isoMin(tr.ddPeakT) === p.ddPeak &&
      isoMin(tr.troughT) === p.ddTrough &&
      parts.every((x) => x.ok)
  };
});

const record = {
  stage: 'gates G1 G2 G4 (D2)',
  g1: { checked: g1.length, failed: g1.filter((x) => !x.ok).length, records: g1 },
  g2: { ...g2, priority3Ok: g2.priority3.digest === g2.priority3.sealed, vglmoOk: g2['5B'].digest === g2['5B'].sealed, shadowOk: g2.shadow.digest === g2.shadow.sealed },
  g4: { checked: g4.length, failed: g4.filter((x) => !x.ok).length, caches: cacheShas, paths: g4 },
  finished: new Date().toISOString()
};

sealJson(path.join(resultsDir, 'gates', 'gates.json'), record, 'gates G1 G2 G4 (D2)');
console.log(
  `G1 ${record.g1.checked - record.g1.failed}/${record.g1.checked} verified; G2 P3 ${record.g2.priority3Ok} 5B ${record.g2.vglmoOk} shadow ${record.g2.shadowOk}; G4 ${record.g4.checked - record.g4.failed}/${record.g4.checked}`
);
for (const x of g4)
  console.log(`${x.path}: net ${x.net} (sealed ${x.sealedNet}), DD ${x.dd} (sealed ${x.sealedDd}) ${x.peak} → ${x.trough}, recovery ${x.recovery}; ${rel(path.join(resultsDir, 'gates', 'gates.json'))}`);
