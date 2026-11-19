// gpu-phase2 gate G7: compares two arms of the fixed-seed mini-optimization (tools/gpu-phase2/mini-opt.ts) — the
// extension rounds, every lane result (screen and promotion counts, islands and their trigger logs, rung-2/3 fits,
// refinement paths, shortlists, frontiers, top-by-net, failure reasons), every archived evaluation (key → record hash)
// and every archived configuration. Identity is required; timing fields (compute, minutes, finished) are excluded.
//   node --experimental-transform-types tools/gpu-phase2/mini-opt-compare.ts <runA>/<backendA> <runB>/<backendB> --out <json>
import fs from 'node:fs';
import path from 'node:path';
import { deepDiff } from '../../src/gpu-phase1/compare.ts';
import { canonHash } from '../../src/gpu-backend/canon.ts';
import { resultsDir, writeJson } from '../../src/gpu-phase2/context.ts';

const [a, b] = process.argv.slice(2, 4);
const out = process.argv[process.argv.indexOf('--out') + 1]!;
const load = (x: string) => ({
  result: JSON.parse(fs.readFileSync(path.join(resultsDir, 'optimizer', x, 'result.json'), 'utf8')),
  archive: JSON.parse(fs.readFileSync(path.join(resultsDir, 'raw-large', 'optimizer', x, 'archive.json'), 'utf8')) as { rows: Record<string, string>; configs: Record<string, string> }
});
const A = load(a!);
const B = load(b!);
const view = (r: Record<string, unknown>) => ({ budget: r.budget, extensionRounds: r.extensionRounds, lanes: r.lanes });
const lanesDiff = deepDiff(view(A.result), view(B.result), '$', [], 30);
const keysA = Object.keys(A.archive.rows);
const keysB = Object.keys(B.archive.rows);
const rowDiff = [...new Set([...keysA, ...keysB])].filter((k) => A.archive.rows[k] !== B.archive.rows[k]);
const cfgDiff = [...new Set([...Object.keys(A.archive.configs), ...Object.keys(B.archive.configs)])].filter((k) => A.archive.configs[k] !== B.archive.configs[k]);
const lanes = (A.result.lanes as { key: string; shortlist: { pick: string; cfg: unknown }[]; requested: number }[]).map((l) => ({
  key: l.key,
  requested: l.requested,
  shortlist: l.shortlist.map((p) => `${p.pick}:${canonHash(p.cfg)}`)
}));
const rec = {
  kind: 'gpu-phase2 G7 mini-optimization comparison',
  t: new Date().toISOString(),
  a: { arm: a, backend: A.result.backendId, minutes: A.result.minutes, compute: A.result.compute },
  b: { arm: b, backend: B.result.backendId, minutes: B.result.minutes, compute: B.result.compute },
  lanes: lanes.length,
  extensionRounds: (A.result.extensionRounds as unknown[]).length,
  archivedEvaluations: { a: keysA.length, b: keysB.length, differing: rowDiff.length },
  archivedConfigs: { a: Object.keys(A.archive.configs).length, b: Object.keys(B.archive.configs).length, differing: cfgDiff.length },
  laneResultDifferences: lanesDiff.map((d) => ({ path: d.path, ulps: d.ulps ?? null })),
  finalists: lanes,
  identical: lanesDiff.length === 0 && rowDiff.length === 0 && cfgDiff.length === 0 && keysA.length === keysB.length
};

writeJson(out, rec);
console.log(JSON.stringify({ identical: rec.identical, lanes: rec.lanes, archived: rec.archivedEvaluations, configs: rec.archivedConfigs, laneDiffs: lanesDiff.length }));
process.exitCode = rec.identical ? 0 : 2;
