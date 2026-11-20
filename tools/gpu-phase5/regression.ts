// gpu-phase5 (PROTOCOL.md §10.4): the regression benchmark of the final binary — the campaign's two Assignment 3 C19
// broad1 replays (final binary gb5, 8 host workers, batch 8,192) against this study's runs of the same job on the
// accepted Phase 3 configuration (the binary gb3 with V8's Maglev enabled: groups p3-a3-r1, p3-a3-r2). Pass iff both final replays are identical to the sealed record and
// their mean wall is within ±3 % of the accepted configuration's mean.
//   node --experimental-transform-types tools/gpu-phase5/regression.ts
import fs from 'node:fs';
import path from 'node:path';
import { resultsDir, writeJson } from '../../src/gpu-phase5/context.ts';

const j = (f: string) => JSON.parse(fs.readFileSync(path.join(resultsDir, f), 'utf8'));
const before = ['p3-a3-r1', 'p3-a3-r2'].map((g) => ({
  group: g,
  wall: j(`bench/${g}/summary.json`).makespanSeconds as number,
  binary: j(`optimizer/${g}-j0/gpu/result.json`).server.binarySha256 as string,
  identical: j(`bench/${g}/verify.json`).identical as boolean
}));
const after = ['final-a3-r1', 'final-a3-r2'].map((r) => ({
  run: r,
  wall: j(`optimizer/${r}/gpu/profile.json`).wallSeconds as number,
  binary: j(`optimizer/${r}/gpu/result.json`).server.binarySha256 as string,
  identical: j(`optimizer/compare-${r}-vs-sealed.json`).identical as boolean
}));
const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
const mb = mean(before.map((x) => x.wall));
const ma = mean(after.map((x) => x.wall));
const ratio = ma / mb;
const pass =
  before.every((x) => x.identical && x.binary.startsWith('06a4a04a')) &&
  after.every((x) => x.identical && !x.binary.startsWith('06a4a04a')) &&
  Math.abs(ratio - 1) <= 0.03;
const rec = {
  kind: 'gpu-phase5 final-binary regression benchmark',
  t: new Date().toISOString(),
  accepted: before,
  final: after,
  meanWallSeconds: { accepted: Math.round(mb * 10) / 10, final: Math.round(ma * 10) / 10 },
  ratio: Math.round(ratio * 10000) / 10000,
  tolerance: '±3 %',
  pass,
  summary: `final ${ma.toFixed(1)} s vs accepted ${mb.toFixed(1)} s (×${ratio.toFixed(4)}), identical ${after.every((x) => x.identical)}`
};

writeJson(path.join(resultsDir, 'optimizer', 'regression.json'), rec);
console.log(JSON.stringify(rec));
process.exitCode = pass ? 0 : 2;
