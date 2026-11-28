// gpu-phase9 (copy of tools/gpu-phase5/parity-summary.ts with this study's namespace; itself a copy of tools/gpu-phase3/parity-summary.ts, this study's namespace) (Phase 2 summary + the host-path determinism checks): aggregates a parity campaign's records (results/parity/<campaign>/*.json, chains/parity.sh) into
// SUMMARY.json — per run: door, options, subjects by set, identical / mismatches, envelopes compared, determinism runs,
// binary sha256 and compat digest; totals: subjects, seeded random genomes (A), strata (G, B, N), references (R),
// fixtures (S), option sets (O), doors and windows covered, Growth structures covered, determinism batch sizes; checks:
// every run passed, one binary for all, the protocol's coverage targets (≥ 100,000 random genomes; every door/window of
// §4; determinism at 1, 7, 13, 16, 32, 50, 64, 128 and large, shuffled, repeat, restart).
//   node --experimental-transform-types tools/gpu-phase9/parity-summary.ts research/gpu-phase9/results/parity/final
import fs from 'node:fs';
import path from 'node:path';
import { writeJson } from '../../src/gpu-phase9/context.ts';

const dir = process.argv[2]!;
const files = fs
  .readdirSync(dir)
  .filter((f) => f.endsWith('.json') && f !== 'SUMMARY.json')
  .sort();
type Run = {
  door: string;
  options: string;
  detail: boolean;
  risk: boolean;
  growthFirst: boolean;
  sessions: number;
  subjects: { total: number; R: number; bySet: Record<string, number> };
  result: { identical: number; mismatches: number; envelopesCompared: number; pass: boolean };
  determinism: { subset: number; runs: { run: string; mismatches: number }[] };
  coverage: {
    growthStructures: Record<string, number>;
    features: Record<string, number>;
    reasons: Record<string, number>;
    kinds: Record<string, number>;
    trades: number;
    lots: number;
    fundingRecords: number;
    partialFills: number;
  };
  build: { binarySha256: string; compatDigest: string; uuid: string };
  hostPath: { workers: number; mode: string };
  seconds: { cpu: number; gpu: number; total: number };
};
const runs = files.map((f) => ({ file: f, r: JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')) as Run }));
const sum = (f: (r: Run) => number) => runs.reduce((a, x) => a + f(x.r), 0);
const union = (f: (r: Run) => Record<string, number>) => {
  const m: Record<string, number> = {};

  for (const { r } of runs) for (const [k, v] of Object.entries(f(r) ?? {})) m[k] = (m[k] ?? 0) + v;
  return m;
};
const binaries = [...new Set(runs.map((x) => x.r.build.binarySha256))];
const compat = [...new Set(runs.map((x) => x.r.build.compatDigest))];
const doors = [...new Set(runs.map((x) => x.r.door))].sort();
const detRuns = runs.flatMap((x) => x.r.determinism.runs.map((d) => d.run));
const requiredDoors = [
  'D19',
  'D21',
  'D23',
  'D24',
  'FULL',
  'W-QUIET',
  'W-CRASH',
  'W-BEAR',
  'W-TREND',
  'E-2020',
  'E-2022',
  'E-2025'
];
const requiredDet = [
  'batch 1',
  'batch 7',
  'batch 13',
  'batch 16',
  'batch 32',
  'batch 50',
  'batch 64',
  'batch 128',
  'shuffled order',
  'reversed order',
  'repeat (same process)',
  'server and host-path restart',
  'host workers 0',
  'host workers 1',
  'host workers 3',
  'host workers 12'
];
const random = sum((r) => r.subjects.bySet.A ?? 0);
const checks = {
  everyRunPassed: runs.every((x) => x.r.result.pass),
  oneBinary: binaries.length === 1,
  randomGenomesAtLeast100k: random >= 100_000,
  everyDoorAndWindow: requiredDoors.every((d) => doors.includes(d)),
  fixtures: doors.filter((d) => /^S\d$/.test(d)).length >= 8,
  determinismBatchSizes: requiredDet.every((d) => detRuns.includes(d)),
  determinismZero: runs.every((x) => x.r.determinism.runs.every((d) => d.mismatches === 0)),
  everyRunThroughTheParallelHostPath: runs.every((x) => x.r.hostPath?.mode === 'parallel')
};
const rec = {
  kind: 'gpu-phase9 parity campaign summary (H2, through the host pipeline)',
  t: new Date().toISOString(),
  campaign: dir,
  runs: runs.map(({ file, r }) => ({
    file,
    door: r.door,
    options: r.options,
    detail: r.detail,
    risk: r.risk,
    growthFirst: r.growthFirst,
    sessions: r.sessions,
    subjects: r.subjects.total,
    bySet: r.subjects.bySet,
    identical: r.result.identical,
    mismatches: r.result.mismatches,
    envelopes: r.result.envelopesCompared,
    determinism: r.determinism.runs.map((d) => `${d.run}:${d.mismatches}`),
    seconds: r.seconds
  })),
  totals: {
    runs: runs.length,
    subjects: sum((r) => r.subjects.total),
    identical: sum((r) => r.result.identical),
    mismatches: sum((r) => r.result.mismatches),
    envelopesCompared: sum((r) => r.result.envelopesCompared),
    bySet: union((r) => r.subjects.bySet),
    randomGenomes: random,
    doors,
    optionSets: [...new Set(runs.map((x) => x.r.options))].sort(),
    determinismRuns: detRuns.length,
    trades: sum((r) => r.coverage.trades),
    lots: sum((r) => r.coverage.lots),
    fundingRecords: sum((r) => r.coverage.fundingRecords),
    partialFills: sum((r) => r.coverage.partialFills),
    growthStructuresCovered: Object.keys(union((r) => r.coverage.growthStructures)).length,
    features: union((r) => r.coverage.features),
    exitReasons: union((r) => r.coverage.reasons),
    entryKinds: union((r) => r.coverage.kinds),
    cpuSeconds: sum((r) => r.seconds.cpu),
    gpuSeconds: sum((r) => r.seconds.gpu)
  },
  build: {
    binaries,
    compat,
    uuid: [...new Set(runs.map((x) => x.r.build.uuid))],
    hostWorkers: [...new Set(runs.map((x) => x.r.hostPath?.workers))]
  },
  checks,
  pass: Object.values(checks).every(Boolean)
};

writeJson(path.join(dir, 'SUMMARY.json'), rec);
console.log(
  JSON.stringify({
    runs: runs.length,
    subjects: rec.totals.subjects,
    mismatches: rec.totals.mismatches,
    random,
    doors: doors.length,
    checks,
    pass: rec.pass
  })
);
process.exitCode = rec.pass ? 0 : 2;
