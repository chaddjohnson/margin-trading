// gpu-phase2: compares a GPU replay of an Assignment 3 broad job (tools/gpu-phase2/mini-opt.ts --a3-job C:part) with
// Assignment 3's SEALED record of that job (research/vg-l0-full-joint/results/search/<C>/<part>.json, read only): the
// extension rounds and every lane result (screen and promotion counts, islands, trigger logs, rung fits, refinement
// paths, shortlists, frontiers, top-by-net, failure reasons) must be identical; so must the unique fresh evaluations.
// Timing fields are excluded and reported side by side (the end-to-end benchmark).
//   node --experimental-transform-types tools/gpu-phase2/a3-replay-compare.ts <run>/<backend> <C> <part> --out <json>
import fs from 'node:fs';
import path from 'node:path';
import { deepDiff } from '../../src/gpu-phase1/compare.ts';
import { repoRoot, resultsDir, writeJson } from '../../src/gpu-phase2/context.ts';

const [arm, cut, part] = process.argv.slice(2, 5);
const out = process.argv[process.argv.indexOf('--out') + 1]!;
const sealedFile = path.join(repoRoot, 'research/vg-l0-full-joint/results/search', cut!, `${part}.json`);
const sealed = JSON.parse(fs.readFileSync(sealedFile, 'utf8'));
const replay = JSON.parse(fs.readFileSync(path.join(resultsDir, 'optimizer', arm!, 'result.json'), 'utf8'));
const diffs = deepDiff({ budget: sealed.budget, cap: sealed.cap, extensionRounds: sealed.extensionRounds, lanes: sealed.lanes }, { budget: replay.budget, cap: replay.cap, extensionRounds: replay.extensionRounds, lanes: replay.lanes }, '$', [], 40);
const freshSame = sealed.compute.fresh === replay.compute.fresh && sealed.compute.unique === replay.compute.unique && sealed.compute.archiveHits === replay.compute.archiveHits;
const rec = {
  kind: 'gpu-phase2 replay of a sealed Assignment 3 job',
  t: new Date().toISOString(),
  sealed: { file: path.relative(repoRoot, sealedFile), codeDigest: sealed.codeDigest, lanes: sealed.lanes.length, minutes: sealed.minutes, compute: { fresh: sealed.compute.fresh, unique: sealed.compute.unique, archiveHits: sealed.compute.archiveHits, workerSeconds: sealed.compute.workerSeconds, wallSeconds: sealed.compute.wallSeconds }, backend: 'cpu: 12 workers (Assignment 3 chain)' },
  replay: { arm, backend: replay.backendId, lanes: replay.lanes.length, minutes: replay.minutes, compute: { fresh: replay.compute.fresh, unique: replay.compute.unique, archiveHits: replay.compute.archiveHits, workerSeconds: replay.compute.workerSeconds, wallSeconds: replay.compute.wallSeconds } },
  laneDifferences: diffs.map((d) => ({ path: d.path, ulps: d.ulps ?? null })),
  freshCountsIdentical: freshSame,
  identical: diffs.length === 0 && freshSame,
  speedup: Math.round((sealed.compute.wallSeconds / replay.compute.wallSeconds) * 100) / 100
};

writeJson(out, rec);
console.log(JSON.stringify({ identical: rec.identical, lanes: rec.replay.lanes, diffs: diffs.length, fresh: [sealed.compute.fresh, replay.compute.fresh], wall: [sealed.compute.wallSeconds, replay.compute.wallSeconds], speedup: rec.speedup }));
process.exitCode = rec.identical ? 0 : 2;
