// Stage B report-only census (PROTOCOL.md §10) — ZERO evaluations: the sealed search of one cutoff is replayed with the
// study's own runner (stages.ts runLanes, both arms in one barrier loop, exactly as the official job) over a Lab bound like
// the official job to a COPY of its archive, with a pool that refuses every evaluation (every request must be an archive
// hit). The replayed lane results must equal the sealed ones, or the census stops. Every centre request (screen, rung
// centres) is captured with its arm, lane and tag; every unique centre is then assessed under BOTH policies (the
// common-candidate counterfactual at the centre): plausibility, the failing metrics and the binding metric, the 40 %
// DD admissions and the cases where the PL / BD gate offsets them. Output: results/analysis/census-<cut>.json.
//   GPU_POLICY_PURPOSE=diagnostic npm run vg-l0reb-tools … (or node --no-maglev … tools/vg-l0-risk-envelope-stage-b/census.ts --cutoff C21)
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { EvalLab, type PoolLike } from '../../src/gpu-backend/lab.ts';
import { doorSpecs } from '../../src/vg-d1-growth-joint/context.ts';
import { setQuiet as setA3Quiet } from '../../src/vg-l0-full-joint/context.ts';
import { budgets } from '../../src/vg-l0-full-joint/budgets.ts';
import { type Cfg, cfgId } from '../../src/vg-l0-full-joint/space.ts';
import type { SRec } from '../../src/vg-l0-full-joint/evaluate.ts';
import { deepDiff } from '../../src/gpu-phase1/compare.ts';
import { assessArm, plausibleArm } from '../../src/vg-l0-risk-envelope-pilot/fitness.ts';
import type { LaneResult } from '../../src/vg-l0-risk-envelope-pilot/search.ts';
import { type ArmKey, type CutoffKey, STUDY_ID, armKeys, arms, asPilotArm, cacheDir, cutoffs, resultsDir, setQuiet } from '../../src/vg-l0-risk-envelope-stage-b/context.ts';
import { finishReserve, laneCap } from '../../src/vg-l0-risk-envelope-stage-b/budget.ts';
import { researchSpecs, runLanes, searchFile } from '../../src/vg-l0-risk-envelope-stage-b/stages.ts';
import { readSealed } from '../../src/vg-l0-risk-envelope-stage-b/records.ts';
import { purposeOf, writeJson } from './common.ts';

purposeOf(['diagnostic']);
setA3Quiet(true);
setQuiet(true);

const args = process.argv.slice(2);
const cut = args[args.indexOf('--cutoff') + 1] as CutoffKey;

if (!cutoffs[cut]) throw new Error('--cutoff C19|C21|C24');

const t0 = Date.now();
const job = `${cut}-search`;
const sha = (f: string) => createHash('sha256').update(fs.readFileSync(f)).digest('hex');
const original = path.join(cacheDir, 'jobs', job, 'archive.sqlite');
const copyRoot = path.join(cacheDir, 'census');
const copy = path.join(copyRoot, 'jobs', job, 'archive.sqlite');
const before = sha(original);

if (!fs.existsSync(copy)) {
  fs.mkdirSync(path.dirname(copy), { recursive: true });
  fs.copyFileSync(original, copy);
}
if (sha(copy) !== before) throw new Error(`${copy}: the copy differs from the original archive`);

const sealed = readSealed<{ lanes: Record<ArmKey, LaneResult[]>; backend: string; codeDigest: string; door: string }>(searchFile(cut));
const missPool: PoolLike = {
  start: async () => undefined,
  run: async (tasks) => {
    throw new Error(`census: ${tasks.length} evaluations are not in the archive copy (a census evaluates nothing)`);
  },
  requestStop: () => undefined,
  stopping: null,
  close: async () => undefined
};
const pins = (doorSpecs as Record<string, { pins: Record<string, { sha256: string }> }>)[cutoffs[cut].door]!.pins;
const lab = new EvalLab({
  study: STUDY_ID,
  job,
  door: cutoffs[cut].door,
  doorPin: `GDX:${pins.GDX!.sha256},VGT:${pins.VGT!.sha256}`,
  purpose: `${STUDY_ID} census replay (no evaluation)`,
  pool: missPool,
  backend: sealed.backend,
  codeDigest: sealed.codeDigest,
  cacheRoot: copyRoot
});

await lab.open();

// capture every centre request
type Seen = { cfg: Cfg; rec: SRec; sources: Set<string> };
const centres = new Map<string, Seen>();
const plain = lab.evalMany.bind(lab);

lab.evalMany = (async (items: Parameters<typeof plain>[0], tag?: string) => {
  const recs = await plain(items, tag);

  if (tag && (tag.endsWith(' screen') || tag.endsWith(':centre'))) {
    const [arm, lane, stage] = tag.split(' ');

    items.forEach((x, i) => {
      const id = cfgId(x.cfg as Cfg);
      const c = centres.get(id);
      const src = `${arm}|${lane}|${stage}`;

      if (c) c.sources.add(src);
      else centres.set(id, { cfg: x.cfg as Cfg, rec: recs[i] as SRec, sources: new Set([src]) });
    });
  }
  return recs;
}) as typeof lab.evalMany;

const plan = researchSpecs(cut).flatMap((s) => armKeys.map((a) => ({ spec: s, arm: arms[a] })));
const { results } = await runLanes(lab, plan, budgets.study.broad, laneCap, plan.length * laneCap, finishReserve, `census ${cut}`);
const diffs = armKeys.flatMap((a) =>
  results
    .filter((r) => r.arm === a)
    .map((r) => {
      const s = sealed.lanes[a].find((x) => x.key === r.result.key)!;

      return { arm: a, lane: r.result.key, differences: deepDiff(JSON.parse(JSON.stringify(s)), JSON.parse(JSON.stringify(r.result)), '$', [], 10).length };
    })
);

await lab.close('census-end');
if (diffs.some((d) => d.differences > 0)) throw new Error(`${cut}: the replayed lanes differ from the sealed lanes: ${JSON.stringify(diffs.filter((d) => d.differences))}`);
if (sha(original) !== before) throw new Error('the original archive changed during the census');

// assess every unique profitable, funded centre under both policies
const C = asPilotArm(arms.CTRL);
const E = asPilotArm(arms.EXP30);
const rows = [...centres.entries()].map(([id, c]) => {
  const r = c.rec;
  const origin = [...new Set([...c.sources].map((s) => s.split('|')[0]))].sort().join('+');
  const ok = !r.error && r.net > 0 && r.mixed;
  const ea = ok ? assessArm(r, E) : null;
  const failing = ea ? ea.checks.filter((x) => x.pass === false).map((x) => x.metric) : [];

  return {
    id,
    origin,
    ok,
    net: r.net,
    dd: r.dd,
    ctrl: ok && plausibleArm(r, C),
    exp: ok && plausibleArm(r, E),
    failing,
    ddBand: ok && r.dd > arms.CTRL.markedDdLimit && r.dd <= arms.EXP30.markedDdLimit
  };
});
const ok = rows.filter((r) => r.ok);
const count = (f: (r: (typeof rows)[number]) => boolean) => ok.filter(f).length;
const byOrigin = Object.fromEntries(
  ['CTRL', 'EXP30', 'CTRL+EXP30'].map((o) => {
    const xs = ok.filter((r) => r.origin === o);

    return [o, { centres: xs.length, both: xs.filter((r) => r.ctrl && r.exp).length, ctrlOnly: xs.filter((r) => r.ctrl && !r.exp).length, exp30Only: xs.filter((r) => !r.ctrl && r.exp).length, neither: xs.filter((r) => !r.ctrl && !r.exp).length }];
  })
);
const best = (f: (r: (typeof rows)[number]) => boolean) => ok.filter(f).reduce<number | null>((a, r) => (a === null || r.net > a ? r.net : a), null);
const record = {
  kind: 'Stage B census (report-only; zero evaluations; replayed from a copy of the official search archive)',
  cutoff: cut,
  archive: { original: path.relative(path.join(resultsDir, '..', '..', '..'), original), sha256: before, copy: path.relative(path.join(resultsDir, '..', '..', '..'), copy) },
  replay: { lanes: diffs.length, identicalToSealed: diffs.every((d) => d.differences === 0), archivedRows: lab.store.count('points') },
  centres: { unique: rows.length, profitableFunded: ok.length },
  overlap: { both: count((r) => r.ctrl && r.exp), ctrlOnly: count((r) => r.ctrl && !r.exp), exp30Only: count((r) => !r.ctrl && r.exp), neither: count((r) => !r.ctrl && !r.exp) },
  byOrigin,
  exp30FailingMetric: {
    markedDd: count((r) => r.failing.includes('markedDd')),
    principalLoss: count((r) => r.failing.includes('principalLoss')),
    bankedDd: count((r) => r.failing.includes('bankedDd')),
    principalLossOnly: count((r) => r.failing.length === 1 && r.failing[0] === 'principalLoss'),
    bankedDdOnly: count((r) => r.failing.length === 1 && r.failing[0] === 'bankedDd'),
    principalLossWithoutBankedDd: count((r) => r.failing.includes('principalLoss') && !r.failing.includes('bankedDd'))
  },
  ddBand35to40: { centres: count((r) => r.ddBand), admittedByP3: count((r) => r.ddBand && r.exp), offsetByPlOrBd: count((r) => r.ddBand && !r.exp) },
  ctrlPassButP3Fails: { centres: count((r) => r.ctrl && !r.exp), byBankedDd: count((r) => r.ctrl && !r.exp && r.failing.includes('bankedDd')), byPrincipalLoss: count((r) => r.ctrl && !r.exp && r.failing.includes('principalLoss')) },
  bestCentreNet: { ctrlPlausible: best((r) => r.ctrl), exp30Plausible: best((r) => r.exp), both: best((r) => r.ctrl && r.exp) },
  seconds: Math.round((Date.now() - t0) / 1000),
  finished: new Date().toISOString()
};

writeJson(path.join(resultsDir, 'analysis', `census-${cut}.json`), record);
console.log(JSON.stringify({ cutoff: cut, replay: record.replay, centres: record.centres, overlap: record.overlap, seconds: record.seconds }));
