// gpu-phase4 (PROTOCOL.md §9): correctness and isolation of one benchmark group (NON-OFFICIAL; zero tolerance). For
// every job of the group:
//   - every archived evaluation (key → record hash in the store's encoding) equals the REFERENCE map's — the canonical
//     CPU engine's archive of the same job where one exists (Assignment 3 C19 broad1: Phase 3's 12-worker CPU replay,
//     itself identical to the sealed record; the mini schedule: Phase 3's CPU arm), otherwise the accepted GPU replay
//     whose lanes equal the sealed CPU record (Assignment 2 C19 base) — and so does every archived configuration;
//   - a complete job: every lane result (screens, promotions, islands, trigger logs, rung fits, refinements, shortlists,
//     frontiers, failure reasons) equals the sealed record's lane at the same position, every lane's extension-round
//     history equals the sealed one, and a full job's archive digest equals the reference digest;
//   - a fixed-total-work group (MODE ftw, complete): the union of the parts' archives equals the reference archive key
//     for key (nothing missing, nothing extra, every hash identical), and the parts' lanes are exactly the job's lanes.
// Identity is required: exit 0; any difference exits 2 (the group's results are then not used).
//   node --experimental-transform-types tools/gpu-phase4/verify.ts --group <G>
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { deepDiff } from '../../src/gpu-phase1/compare.ts';
import { repoRoot, resultsDir, writeJson } from '../../src/gpu-phase4/context.ts';

const args = process.argv.slice(2);
const opt = (k: string, d: string) => (args.includes(`--${k}`) ? args[args.indexOf(`--${k}`) + 1]! : d);
const G = opt('group', '');
const groupDir = path.join(resultsDir, 'bench', G);
const group = JSON.parse(fs.readFileSync(path.join(groupDir, 'group.json'), 'utf8')) as {
  jobs: number;
  mode: string;
  job: string;
  runs: string[];
  exitStatus: (number | null)[];
  extra: string;
};
const p3 = path.join(repoRoot, 'research/gpu-phase3/results');
const references: Record<string, { map: string; result: string; sealed: string | null; digest: string }> = {
  'a3:C19:broad1': {
    map: path.join(p3, 'raw-large/optimizer/final-a3-cpu/cpu'),
    result: path.join(p3, 'optimizer/final-a3-cpu/cpu'),
    sealed: path.join(repoRoot, 'research/vg-l0-full-joint/results/search/C19/broad1.json'),
    digest: '9c2d710813db6524fd1108c0028eb041dddc16a111f65468fdccccb0687ee544'
  },
  'a2:C19:base': {
    map: path.join(p3, 'raw-large/optimizer/final-a2-r1/gpu'),
    result: path.join(p3, 'optimizer/final-a2-r1/gpu'),
    sealed: path.join(repoRoot, 'research/vg-l0-risk-families/results/search/C19/base.json'),
    digest: '4a8624fcae4d50f58584a25fe4f606cb855c85c2b58f605afe04cd895079f467'
  },
  mini: {
    map: path.join(p3, 'raw-large/optimizer/final-mini/cpu'),
    result: path.join(p3, 'optimizer/final-mini/cpu'),
    sealed: null, // the mini schedule has no sealed record: the CPU arm's own result is the reference
    digest: '014239d854f647b40e23bf7afa46000a549737f8a544927a8c61468804a95990'
  }
};

if (group.job === 'mini' && group.extra.trim()) throw new Error('verify: the mini reference covers the default schedule only');

const ref = references[group.job];

if (!ref) throw new Error(`verify: no reference for job ${group.job}`);

const readMap = (dir: string, name: 'rows' | 'configs') => {
  const m = new Map<string, string>();

  for (const line of fs.readFileSync(path.join(dir, `${name}.jsonl`), 'utf8').split('\n'))
    if (line) {
      const [k, h] = JSON.parse(line) as [string, string];

      m.set(k, h);
    }
  return m;
};
const digestOf = (m: Map<string, string>) => {
  const d = createHash('sha256');

  [...m.keys()].sort().forEach((k, i) => d.update(`${i ? '\n' : ''}${k}=${m.get(k)}`));
  return d.digest('hex');
};
const refRows = readMap(ref.map, 'rows');
const refConfigs = readMap(ref.map, 'configs');
const refResult = JSON.parse(
  fs.readFileSync(ref.sealed ?? path.join(ref.result, 'result.json'), 'utf8')
) as {
  lanes: { position: string }[];
  extensionRounds: { positions: { position: string; fired: boolean; extended: boolean; atCap: boolean }[] }[];
};
const refLane = new Map(refResult.lanes.map((l) => [l.position, l]));
const history = (rounds: typeof refResult.extensionRounds, pos: string) =>
  rounds.flatMap((r) => r.positions.filter((p) => p.position === pos).map((p) => [p.fired, p.extended, p.atCap]));

const jobs = group.runs.map((run, i) => {
  const out = path.join(resultsDir, 'optimizer', run, 'gpu');
  const raw = path.join(resultsDir, 'raw-large', 'optimizer', run, 'gpu');
  const status = group.exitStatus[i];

  if (!fs.existsSync(path.join(out, 'result.json')) || !fs.existsSync(path.join(raw, 'rows.jsonl')))
    return { run, status, present: false, identical: false };

  const result = JSON.parse(fs.readFileSync(path.join(out, 'result.json'), 'utf8')) as {
    stopped?: string;
    lanes?: { position: string }[];
    extensionRounds?: typeof refResult.extensionRounds;
    compute: { fresh: number; archiveHits: number };
    lanesCount: number;
  };
  const rows = readMap(raw, 'rows');
  const configs = readMap(raw, 'configs');
  let rowMismatch = 0;
  let rowUnknown = 0;
  let cfgMismatch = 0;
  let cfgUnknown = 0;
  const examples: string[] = [];

  for (const [k, h] of rows) {
    const r = refRows.get(k);

    if (r === undefined) rowUnknown++;
    else if (r !== h) rowMismatch++;
    else continue;
    if (examples.length < 5) examples.push(k.slice(0, 160));
  }
  for (const [k, h] of configs) {
    const r = refConfigs.get(k);

    if (r === undefined) cfgUnknown++;
    else if (r !== h) cfgMismatch++;
  }

  const complete = !result.stopped && Array.isArray(result.lanes);
  let laneDiffs: { position: string; path: string }[] = [];
  let historyDiffs: string[] = [];

  if (complete) {
    for (const l of result.lanes!) {
      const s = refLane.get(l.position);

      if (!s) laneDiffs.push({ position: l.position, path: '<no sealed lane>' });
      else for (const d of deepDiff(s, l, '$', [], 10)) laneDiffs.push({ position: l.position, path: d.path });
      if (
        JSON.stringify(history(refResult.extensionRounds, l.position)) !==
        JSON.stringify(history(result.extensionRounds!, l.position))
      )
        historyDiffs.push(l.position);
    }
    laneDiffs = laneDiffs.slice(0, 40);
    historyDiffs = historyDiffs.slice(0, 40);
  }

  const fullJob = complete && result.lanesCount === refResult.lanes.length;
  const digest = fullJob ? digestOf(rows) : null;
  const identical =
    status !== null &&
    (status === 0 || (status === 75 && Boolean(result.stopped))) &&
    rowMismatch === 0 &&
    rowUnknown === 0 &&
    cfgMismatch === 0 &&
    cfgUnknown === 0 &&
    laneDiffs.length === 0 &&
    historyDiffs.length === 0 &&
    (!fullJob || digest === ref.digest);

  return {
    run,
    status,
    present: true,
    complete,
    stopped: result.stopped ?? null,
    lanes: result.lanesCount,
    fresh: result.compute.fresh,
    archiveHits: result.compute.archiveHits,
    rows: rows.size,
    configs: configs.size,
    rowMismatch,
    rowUnknown,
    cfgMismatch,
    cfgUnknown,
    examples,
    lanesCompared: complete ? result.lanes!.length : 0,
    laneDiffs,
    extensionHistoryDiffs: historyDiffs,
    archiveDigest: digest,
    archiveDigestEqualsReference: fullJob ? digest === ref.digest : null,
    identical,
    keys: [...rows.keys()],
    positions: complete ? result.lanes!.map((l) => l.position) : []
  };
});

// fixed-total-work: the parts together are exactly the job
let union: Record<string, unknown> | null = null;

if (group.mode === 'ftw' && jobs.every((j) => j.present && 'complete' in j && j.complete)) {
  const keys = new Set<string>();
  const positions = new Set<string>();

  for (const j of jobs as { keys: string[]; positions: string[] }[]) {
    for (const k of j.keys) keys.add(k);
    for (const p of j.positions) positions.add(p);
  }
  const missing = [...refRows.keys()].filter((k) => !keys.has(k)).length;
  const extra = [...keys].filter((k) => !refRows.has(k)).length;
  const lanesExact =
    positions.size === refResult.lanes.length && refResult.lanes.every((l) => positions.has(l.position));
  const freshSum = jobs.reduce((a, j) => a + ((j as { fresh?: number }).fresh ?? 0), 0);

  union = {
    keys: keys.size,
    referenceKeys: refRows.size,
    missing,
    extra,
    lanesExact,
    freshSum,
    duplicateFreshAcrossParts: freshSum - keys.size,
    identical: missing === 0 && extra === 0 && lanesExact
  };
}

const rec = {
  kind: 'gpu-phase4 group verification',
  t: new Date().toISOString(),
  group: G,
  mode: group.mode,
  job: group.job,
  reference: {
    map: path.relative(repoRoot, ref.map),
    lanes: path.relative(repoRoot, ref.sealed ?? path.join(ref.result, 'result.json')),
    rows: refRows.size,
    digest: ref.digest
  },
  jobs: jobs.map(({ keys: _k, positions: _p, ...j }) => j),
  union,
  identical: jobs.every((j) => j.identical) && (union === null || union.identical === true)
};

writeJson(path.join(groupDir, 'verify.json'), rec);
console.log(
  JSON.stringify({
    group: G,
    identical: rec.identical,
    jobs: rec.jobs.map((j) => [j.run, j.status, (j as { rows?: number }).rows, j.identical]),
    union
  })
);
process.exitCode = rec.identical ? 0 : 2;
