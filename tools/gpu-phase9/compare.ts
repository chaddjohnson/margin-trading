// gpu-phase9 (copy of tools/gpu-phase5/compare.ts on the job namespaces): identity checks of optimizer jobs (tools/gpu-phase9/job.ts),
// read from research/gpu-phase9/results/jobs/<job>/result.json and results/raw-large/jobs/<job>/. Two modes:
//
//   sealed <job> <a3|a2> <C> <part> --out <json>
//     the replay against the SEALED record of that study's job (read only): extension rounds and every lane result
//     (screen and promotion counts, islands, trigger logs, rung fits, refinement paths, shortlists, frontiers, top-by-net,
//     failure reasons) must be identical, and so must the unique fresh evaluations and archive hits. Timing fields are
//     excluded and reported side by side.
//   arms <jobA> <jobB> --out <json>
//     two replays of one job (CPU vs GPU, Phase 2 host path vs Phase 3 host path, uninterrupted vs resumed): the lane
//     results, every archived evaluation (key → record hash in the store's encoding) and every archived configuration.
//
//   --strip-envelope (GPU Phase 7, either mode): the `envelope` fields a risk job's lane results carry (records returned
//     with the risk-envelope delivery) are removed from BOTH sides before the comparison and counted; in arms mode the
//     archived rows are then compared by key only (`|risk` suffix removed; their values differ by the envelope).
//
// Identity is required (exit 0); a difference exits 2.
import fs from 'node:fs';
import path from 'node:path';
import { deepDiff } from '../../src/gpu-phase1/compare.ts';
import { canonHash } from '../../src/gpu-backend/canon.ts';
import { repoRoot, resultsDir, writeJson } from '../../src/gpu-phase9/context.ts';

const [mode, ...rest] = process.argv.slice(2);
const out = process.argv[process.argv.indexOf('--out') + 1]!;
const strip = process.argv.includes('--strip-envelope');
let stripped = 0;
const dropEnvelopes = (x: unknown): unknown => {
  if (Array.isArray(x)) return x.map(dropEnvelopes);
  if (x && typeof x === 'object') {
    const o: Record<string, unknown> = {};

    for (const [k, v] of Object.entries(x)) {
      if (k === 'envelope') {
        stripped++;
        continue;
      }
      o[k] = dropEnvelopes(v);
    }
    return o;
  }
  return x;
};
const load = (x: string) => {
  const r = JSON.parse(fs.readFileSync(path.join(resultsDir, 'jobs', x, 'result.json'), 'utf8'));

  return strip ? (dropEnvelopes(r) as typeof r) : r;
};

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
  const freshSame =
    sealed.compute.fresh === replay.compute.fresh &&
    sealed.compute.unique === replay.compute.unique &&
    sealed.compute.archiveHits === replay.compute.archiveHits;
  const rec = {
    kind: 'gpu-phase9 job against a sealed optimizer job',
    t: new Date().toISOString(),
    envelopesStripped: strip ? stripped : null,
    sealed: {
      file: path.relative(repoRoot, sealedFile),
      codeDigest: sealed.codeDigest,
      lanes: sealed.lanes.length,
      minutes: sealed.minutes,
      compute: {
        fresh: sealed.compute.fresh,
        unique: sealed.compute.unique,
        archiveHits: sealed.compute.archiveHits,
        workerSeconds: sealed.compute.workerSeconds,
        wallSeconds: sealed.compute.wallSeconds
      }
    },
    replay: {
      arm,
      backend: replay.backendId,
      server: replay.server,
      lanes: replay.lanes.length,
      minutes: replay.minutes,
      compute: {
        fresh: replay.compute.fresh,
        unique: replay.compute.unique,
        archiveHits: replay.compute.archiveHits,
        workerSeconds: replay.compute.workerSeconds,
        wallSeconds: replay.compute.wallSeconds
      }
    },
    laneDifferences: diffs.map((d) => ({ path: d.path, ulps: d.ulps ?? null })),
    freshCountsIdentical: freshSame,
    identical: diffs.length === 0 && freshSame,
    speedupVsSealedCpu: Math.round((sealed.compute.wallSeconds / replay.compute.wallSeconds) * 100) / 100
  };

  writeJson(out, rec);
  console.log(
    JSON.stringify({
      identical: rec.identical,
      lanes: rec.replay.lanes,
      diffs: diffs.length,
      fresh: [sealed.compute.fresh, replay.compute.fresh],
      wall: [sealed.compute.wallSeconds, replay.compute.wallSeconds],
      speedup: rec.speedupVsSealedCpu
    })
  );
  process.exitCode = rec.identical ? 0 : 2;
} else if (mode === 'arms') {
  const [a, b] = rest;
  // the archive's key → record-hash maps: JSONL (rows.jsonl, configs.jsonl) or, from the first runs, one archive.json
  const mapOf = (x: string, name: 'rows' | 'configs'): Record<string, string> => {
    const dir = path.join(resultsDir, 'raw-large', 'jobs', x);
    const jsonl = path.join(dir, `${name}.jsonl`);

    if (!fs.existsSync(jsonl))
      return (
        JSON.parse(fs.readFileSync(path.join(dir, 'archive.json'), 'utf8')) as Record<string, Record<string, string>>
      )[name]!;
    const m: Record<string, string> = {};

    for (const line of fs.readFileSync(jsonl, 'utf8').split('\n'))
      if (line) {
        const [k, h] = JSON.parse(line) as [string, string];

        m[k] = h;
      }
    return m;
  };
  const arm = (x: string) => ({ result: load(x), archive: { rows: mapOf(x, 'rows'), configs: mapOf(x, 'configs') } });
  const A = arm(a!);
  const B = arm(b!);
  const view = (r: Record<string, unknown>) => ({
    budget: r.budget,
    cap: r.cap,
    extensionRounds: r.extensionRounds,
    lanes: r.lanes
  });
  const lanesDiff = deepDiff(view(A.result), view(B.result), '$', [], 30);
  const keysA = Object.keys(A.archive.rows);
  const keysB = Object.keys(B.archive.rows);
  // --strip-envelope: rows by key only (the `|risk` suffix removed), their values differ by the envelope
  const base = (k: string) => (strip ? k.replace(/\|risk$/, '') : k);
  const setA = new Set(keysA.map(base));
  const setB = new Set(keysB.map(base));
  const rowDiff = strip
    ? [...new Set([...setA, ...setB])].filter((k) => !(setA.has(k) && setB.has(k)))
    : [...new Set([...keysA, ...keysB])].filter((k) => A.archive.rows[k] !== B.archive.rows[k]);
  const cfgDiff = [...new Set([...Object.keys(A.archive.configs), ...Object.keys(B.archive.configs)])].filter(
    (k) => A.archive.configs[k] !== B.archive.configs[k]
  );
  const finalists = (
    A.result.lanes as { key: string; shortlist: { pick: string; cfg: unknown }[]; requested: number }[]
  ).map((l) => ({
    key: l.key,
    requested: l.requested,
    shortlist: l.shortlist.map((p) => `${p.pick}:${canonHash(p.cfg)}`)
  }));
  const rec = {
    kind: 'gpu-phase9 optimizer-job comparison',
    t: new Date().toISOString(),
    envelopesStripped: strip ? stripped : null,
    rowsCompared: strip ? 'keys only (|risk suffix removed)' : 'key → record hash',
    a: {
      arm: a,
      backend: A.result.backendId,
      server: A.result.server,
      minutes: A.result.minutes,
      compute: A.result.compute
    },
    b: {
      arm: b,
      backend: B.result.backendId,
      server: B.result.server,
      minutes: B.result.minutes,
      compute: B.result.compute
    },
    lanes: finalists.length,
    extensionRounds: (A.result.extensionRounds as unknown[]).length,
    archivedEvaluations: { a: keysA.length, b: keysB.length, differing: rowDiff.length, examples: rowDiff.slice(0, 5) },
    archivedConfigs: {
      a: Object.keys(A.archive.configs).length,
      b: Object.keys(B.archive.configs).length,
      differing: cfgDiff.length
    },
    laneResultDifferences: lanesDiff.map((d) => ({ path: d.path, ulps: d.ulps ?? null })),
    freshCountsIdentical:
      A.result.compute.fresh === B.result.compute.fresh &&
      A.result.compute.archiveHits === B.result.compute.archiveHits,
    finalists,
    identical: lanesDiff.length === 0 && rowDiff.length === 0 && cfgDiff.length === 0 && keysA.length === keysB.length
  };

  writeJson(out, rec);
  console.log(
    JSON.stringify({
      identical: rec.identical,
      lanes: rec.lanes,
      archived: rec.archivedEvaluations.a,
      rowDiff: rowDiff.length,
      cfgDiff: cfgDiff.length,
      laneDiffs: lanesDiff.length
    })
  );
  process.exitCode = rec.identical ? 0 : 2;
} else {
  console.error('usage: compare.ts sealed <run>/<backend> <a3|a2> <C> <part> --out <json> | arms <a> <b> --out <json>');
  process.exit(1);
}
