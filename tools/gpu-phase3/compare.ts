// gpu-phase3: identity checks of optimizer-job replays (tools/gpu-phase3/replay.ts). Two modes:
//
//   sealed <run>/<backend> <a3|a2> <C> <part> --out <json>
//     the replay against the SEALED record of that study's job (read only): extension rounds and every lane result
//     (screen and promotion counts, islands, trigger logs, rung fits, refinement paths, shortlists, frontiers, top-by-net,
//     failure reasons) must be identical, and so must the unique fresh evaluations and archive hits. Timing fields are
//     excluded and reported side by side.
//   arms <runA>/<backendA> <runB>/<backendB> --out <json>
//     two replays of one job (CPU vs GPU, Phase 2 host path vs Phase 3 host path, uninterrupted vs resumed): the lane
//     results, every archived evaluation (key → record hash in the store's encoding) and every archived configuration.
//
// Identity is required (exit 0); a difference exits 2.
import fs from 'node:fs';
import path from 'node:path';
import { deepDiff } from '../../src/gpu-phase1/compare.ts';
import { canonHash } from '../../src/gpu-backend/canon.ts';
import { repoRoot, resultsDir, writeJson } from '../../src/gpu-phase3/context.ts';

const [mode, ...rest] = process.argv.slice(2);
const out = process.argv[process.argv.indexOf('--out') + 1]!;
const load = (x: string) => JSON.parse(fs.readFileSync(path.join(resultsDir, 'optimizer', x, 'result.json'), 'utf8'));

if (mode === 'sealed') {
  const [arm, fam, cut, part] = rest;
  const studyDir = fam === 'a2' ? 'research/vg-l0-risk-families' : 'research/vg-l0-full-joint';
  const sealedFile = path.join(repoRoot, studyDir, 'results/search', cut!, `${part}.json`);
  const sealed = JSON.parse(fs.readFileSync(sealedFile, 'utf8'));
  const replay = load(arm!);
  const diffs = deepDiff(
    { budget: sealed.budget, cap: sealed.cap, extensionRounds: sealed.extensionRounds, lanes: sealed.lanes },
    { budget: replay.budget, cap: replay.cap, extensionRounds: replay.extensionRounds, lanes: replay.lanes },
    '$',
    [],
    40
  );
  const freshSame = sealed.compute.fresh === replay.compute.fresh && sealed.compute.unique === replay.compute.unique && sealed.compute.archiveHits === replay.compute.archiveHits;
  const rec = {
    kind: 'gpu-phase3 replay of a sealed optimizer job',
    t: new Date().toISOString(),
    sealed: { file: path.relative(repoRoot, sealedFile), codeDigest: sealed.codeDigest, lanes: sealed.lanes.length, minutes: sealed.minutes, compute: { fresh: sealed.compute.fresh, unique: sealed.compute.unique, archiveHits: sealed.compute.archiveHits, workerSeconds: sealed.compute.workerSeconds, wallSeconds: sealed.compute.wallSeconds } },
    replay: { arm, backend: replay.backendId, server: replay.server, lanes: replay.lanes.length, minutes: replay.minutes, compute: { fresh: replay.compute.fresh, unique: replay.compute.unique, archiveHits: replay.compute.archiveHits, workerSeconds: replay.compute.workerSeconds, wallSeconds: replay.compute.wallSeconds } },
    laneDifferences: diffs.map((d) => ({ path: d.path, ulps: d.ulps ?? null })),
    freshCountsIdentical: freshSame,
    identical: diffs.length === 0 && freshSame,
    speedupVsSealedCpu: Math.round((sealed.compute.wallSeconds / replay.compute.wallSeconds) * 100) / 100
  };

  writeJson(out, rec);
  console.log(JSON.stringify({ identical: rec.identical, lanes: rec.replay.lanes, diffs: diffs.length, fresh: [sealed.compute.fresh, replay.compute.fresh], wall: [sealed.compute.wallSeconds, replay.compute.wallSeconds], speedup: rec.speedupVsSealedCpu }));
  process.exitCode = rec.identical ? 0 : 2;
} else if (mode === 'arms') {
  const [a, b] = rest;
  const arm = (x: string) => ({
    result: load(x),
    archive: JSON.parse(fs.readFileSync(path.join(resultsDir, 'raw-large', 'optimizer', x, 'archive.json'), 'utf8')) as { rows: Record<string, string>; configs: Record<string, string> }
  });
  const A = arm(a!);
  const B = arm(b!);
  const view = (r: Record<string, unknown>) => ({ budget: r.budget, cap: r.cap, extensionRounds: r.extensionRounds, lanes: r.lanes });
  const lanesDiff = deepDiff(view(A.result), view(B.result), '$', [], 30);
  const keysA = Object.keys(A.archive.rows);
  const keysB = Object.keys(B.archive.rows);
  const rowDiff = [...new Set([...keysA, ...keysB])].filter((k) => A.archive.rows[k] !== B.archive.rows[k]);
  const cfgDiff = [...new Set([...Object.keys(A.archive.configs), ...Object.keys(B.archive.configs)])].filter((k) => A.archive.configs[k] !== B.archive.configs[k]);
  const finalists = (A.result.lanes as { key: string; shortlist: { pick: string; cfg: unknown }[]; requested: number }[]).map((l) => ({
    key: l.key,
    requested: l.requested,
    shortlist: l.shortlist.map((p) => `${p.pick}:${canonHash(p.cfg)}`)
  }));
  const rec = {
    kind: 'gpu-phase3 optimizer-job arm comparison',
    t: new Date().toISOString(),
    a: { arm: a, backend: A.result.backendId, server: A.result.server, minutes: A.result.minutes, compute: A.result.compute },
    b: { arm: b, backend: B.result.backendId, server: B.result.server, minutes: B.result.minutes, compute: B.result.compute },
    lanes: finalists.length,
    extensionRounds: (A.result.extensionRounds as unknown[]).length,
    archivedEvaluations: { a: keysA.length, b: keysB.length, differing: rowDiff.length, examples: rowDiff.slice(0, 5) },
    archivedConfigs: { a: Object.keys(A.archive.configs).length, b: Object.keys(B.archive.configs).length, differing: cfgDiff.length },
    laneResultDifferences: lanesDiff.map((d) => ({ path: d.path, ulps: d.ulps ?? null })),
    freshCountsIdentical: A.result.compute.fresh === B.result.compute.fresh && A.result.compute.archiveHits === B.result.compute.archiveHits,
    finalists,
    identical: lanesDiff.length === 0 && rowDiff.length === 0 && cfgDiff.length === 0 && keysA.length === keysB.length
  };

  writeJson(out, rec);
  console.log(JSON.stringify({ identical: rec.identical, lanes: rec.lanes, archived: rec.archivedEvaluations.a, rowDiff: rowDiff.length, cfgDiff: cfgDiff.length, laneDiffs: lanesDiff.length }));
  process.exitCode = rec.identical ? 0 : 2;
} else {
  console.error('usage: compare.ts sealed <run>/<backend> <a3|a2> <C> <part> --out <json> | arms <a> <b> --out <json>');
  process.exit(1);
}
