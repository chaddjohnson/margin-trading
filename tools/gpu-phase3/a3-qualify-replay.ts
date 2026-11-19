// gpu-phase3 (Phase 2 tool, host path selectable: --host-workers N, default 8): replays one of Assignment 3's SEALED qualification stages on the GPU (NON-OFFICIAL benchmark and identity
// check of the qualification / robustness path: detailed centres, the five stresses, removal reruns, selection and
// confirmation neighbourhoods). Assignment 3's own qualifyMembers (src/vg-l0-full-joint/qualify.ts, unchanged) runs on
// the GPU EvalLab + GpuPool with the stage's members rebuilt exactly as stages.ts runQualify builds them (the sealed
// shortlists of broad1 + broad2 + the New L0 control, one member per configuration) and its frozen cap; the evidence,
// in its sealed form, is compared with research/vg-l0-full-joint/results/folds/<C>/broad-qualification.json (read only).
//   node --expose-gc --experimental-transform-types tools/gpu-phase3/a3-qualify-replay.ts --cutoff C19 --run <name> [--host-workers 8] --out <json>
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { qualifyMembers, type Evidence } from '../../src/vg-l0-full-joint/qualify.ts';
import { encode } from '../../src/growth140-vgt-s8m/store.ts';
import type { LaneResult } from '../../src/vg-l0-full-joint/search.ts';
import { controlMembers, cutoffs } from '../../src/vg-l0-full-joint/stages.ts';
import { perMemberCap } from '../../src/vg-l0-full-joint/budgets.ts';
import { canonicalCfg, cfgId } from '../../src/vg-l0-full-joint/space.ts';
import { codeDigest as a3CodeDigest } from '../../src/vg-l0-full-joint/lab.ts';
import { doorSpecs } from '../../src/vg-d1-growth-joint/context.ts';
import { deepDiff } from '../../src/gpu-phase1/compare.ts';
import { cacheDir, openDoor, repoRoot, resultsDir, writeJson } from '../../src/gpu-phase3/context.ts';
import { EvalLab } from '../../src/gpu-backend/lab.ts';
import { GpuPool } from '../../src/gpu-backend/pool.ts';
import { GpuServer } from '../../src/gpu-backend/client.ts';
import { exportDataset } from '../../src/gpu-backend/dataset.ts';
import { compatManifest } from '../../src/gpu-backend/compat.ts';
import { serverBinary, toolkitLib } from '../../src/gpu-backend/toolchain.ts';

const args = process.argv.slice(2);
const opt = (k: string, d: string) => (args.includes(`--${k}`) ? args[args.indexOf(`--${k}`) + 1]! : d);
const cut = opt('cutoff', 'C19');
const out = opt('out', path.join(resultsDir, 'optimizer', `compare-a3-${cut}-broad-qualification.json`));
const a3 = path.join(repoRoot, 'research/vg-l0-full-joint/results');
const log = (s: string) => console.log(`[a3-qualify ${new Date().toISOString().slice(11, 19)}Z] ${s}`);
const read = <T>(f: string) => JSON.parse(fs.readFileSync(f, 'utf8')) as T;
type Member = Parameters<typeof qualifyMembers>[1][number];

// the stage's members, as runQualify builds them for the broad stage
const fromSearch = (part: string): Member[] =>
  read<{ lanes: LaneResult[] }>(path.join(a3, 'search', cut, `${part}.json`)).lanes.flatMap((l) =>
    l.shortlist.map(
      (p, i) =>
        ({
          label: `${l.key}#${i + 1} ${p.pick}`,
          lane: l.key,
          stage: l.stage,
          track: l.stage === 'informed' ? ('N' as const) : ('I' as const),
          replicate: l.replicate,
          cfg: canonicalCfg(p.cfg),
          pick: p.pick
        }) as Member
    )
  );
let members: Member[] = [...fromSearch('broad1'), ...fromSearch('broad2'), ...controlMembers()];
const seen = new Map<string, string>();

members = members.filter((m) => {
  const id = cfgId(m.cfg);

  if (seen.has(id)) return false;
  seen.set(id, m.label);
  return true;
});

const doorName = cutoffs[cut]!.door as 'D19' | 'D21' | 'D23' | 'D24';
const door = await openDoor(doorName, `A3 ${cut} broad qualification replay (GPU, non-official)`);
const ds = exportDataset(door, cacheDir);
const server = GpuServer.start({ binary: serverBinary, libDir: toolkitLib });
const info = await server.info();

if (!(await server.smoke()).ok) throw new Error('smoke failed');
await server.load(ds.file);
const binarySha = createHash('sha256').update(fs.readFileSync(serverBinary)).digest('hex');
const backendId = `gpu:${info.uuid}:${binarySha.slice(0, 16)}:${compatManifest().digest.slice(0, 16)}`;
const run = opt('run', `a3-${cut}-broad-qualification`);
const hostWorkers = Number(opt('host-workers', '8'));
const outDir = path.join(resultsDir, 'optimizer', run, 'gpu');

fs.mkdirSync(outDir, { recursive: true });
const pool = new GpuPool({
  door,
  session: null,
  server,
  uuid: info.uuid,
  ledgerFile: path.join(outDir, 'receipts.jsonl'),
  telemetryFile: path.join(outDir, 'telemetry.jsonl'),
  batchSize: 8192,
  lingerMs: 30,
  log,
  hostWorkers
});
const lab = new EvalLab({
  study: 'research/gpu-phase3',
  job: `qualify-replay-${run}`,
  door: doorName,
  doorPin: `GDX:${doorSpecs[doorName].pins.GDX.sha256},VGT:${doorSpecs[doorName].pins.VGT.sha256}`,
  purpose: `benchmark: replay of Assignment 3 qualify ${cut} broad`,
  pool,
  backend: backendId,
  codeDigest: a3CodeDigest(),
  cacheRoot: path.join(cacheDir, 'a3-qualify', run),
  maxFresh: members.length * perMemberCap,
  log
});

await lab.open();
const t0 = Date.now();
const evidence = await qualifyMembers(lab as never, members, cut);
const minutes = Math.round((Date.now() - t0) / 600) / 100;
const compute = lab.compute;

await lab.close('job-end');

const sealedForm = (e: Evidence) =>
  e.risk.rows ? { ...e, risk: { ...e.risk, rows: undefined, rowsKept: e.risk.rows.length } } : e;
const mine = JSON.parse(encode(evidence.map(sealedForm))); // the sealed records' encoding (±Infinity / NaN as strings)
const sealed = read<{
  members: number;
  qualified: number;
  evidence: unknown[];
  compute: { fresh: number; unique: number; wallSeconds: number; workerSeconds: number };
}>(path.join(a3, 'folds', cut, 'broad-qualification.json'));
const diffs = deepDiff(sealed.evidence, mine, '$', [], 40);
const rec = {
  kind: 'gpu-phase3 replay of a sealed Assignment 3 qualification stage',
  t: new Date().toISOString(),
  cutoff: cut,
  stage: 'broad',
  members: { replay: members.length, sealed: sealed.members },
  qualified: { replay: evidence.filter((e) => e.qualified && e.stage !== 'control').length, sealed: sealed.qualified },
  evaluations: { replayFresh: compute.fresh, sealedFresh: sealed.compute.fresh },
  wallSeconds: { replay: compute.wallSeconds, sealed: sealed.compute.wallSeconds },
  speedup: Math.round((sealed.compute.wallSeconds / compute.wallSeconds) * 100) / 100,
  minutes,
  backend: backendId,
  hostWorkers,
  evidenceDifferences: diffs.map((d) => ({ path: d.path, ulps: d.ulps ?? null })),
  identical: diffs.length === 0 && compute.fresh === sealed.compute.fresh && members.length === sealed.members
};

writeJson(out, rec);
log(
  JSON.stringify({
    identical: rec.identical,
    members: rec.members,
    qualified: rec.qualified,
    evaluations: rec.evaluations,
    wall: rec.wallSeconds,
    speedup: rec.speedup,
    diffs: diffs.length
  })
);
process.exitCode = rec.identical ? 0 : 2;
