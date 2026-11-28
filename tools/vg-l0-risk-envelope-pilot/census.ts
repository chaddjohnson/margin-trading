// The search census of the risk-envelope pilot (PROTOCOL.md §15; report-only, NO evaluation): a deterministic replay of
// both arms' lanes from a COPY of the official search job's archive (every request must be an archive hit — the pool
// refuses any task), which (1) verifies that the sealed lane results reproduce from the archive, and (2) captures every
// centre each arm requested (screen, rung 1 / islands, rungs 2–3, refinement) with its record and envelope. From it:
//   - the policy disagreement of every evaluated centre (both pass / CTRL-only / EXP-only / neither, with the failing
//     metric), at the screen (identical proposals in both arms) and over all centres;
//   - per arm, lane and stage: proposals, plausible, feasible, per-metric rejection rates, Growth boundedness strata;
//   - the cross-assessment of each arm's rung-3 fits, refinement endpoints and shortlists under the OTHER arm's
//     feasibility (their 128-draw rung-3 neighbourhoods are regenerated exactly and read from the archive).
//   GPU_POLICY_PURPOSE=diagnostic node --no-maglev --experimental-transform-types tools/vg-l0-risk-envelope-pilot/census.ts --cutoff C21
import fs from 'node:fs';
import path from 'node:path';
import { EvalLab, type PoolLike } from '../../src/gpu-backend/lab.ts';
import { doorSpecs } from '../../src/vg-d1-growth-joint/context.ts';
import { deepDiff } from '../../src/gpu-phase1/compare.ts';
import { setQuiet as setA3Quiet } from '../../src/vg-l0-full-joint/context.ts';
import { nbStats } from '../../src/vg-l0-full-joint/fitness.ts';
import { vOptions } from '../../src/vg-l0-full-joint/nl0.ts';
import { type Cfg, cfgId, neighbourhood } from '../../src/vg-l0-full-joint/space.ts';
import type { SRec } from '../../src/vg-l0-full-joint/evaluate.ts';
import { budgets } from '../../src/vg-l0-full-joint/budgets.ts';
import { type ArmKey, type CutoffKey, STUDY_ID, armKeys, arms, cacheDir, cutoffs, resultsDir } from '../../src/vg-l0-risk-envelope-pilot/context.ts';
import { finishReserve, laneCap } from '../../src/vg-l0-risk-envelope-pilot/budget.ts';
import { failingMetrics, plausibleArm, violationArm } from '../../src/vg-l0-risk-envelope-pilot/fitness.ts';
import { laneSpecs, runLanes, searchFile, stripEnvelopes } from '../../src/vg-l0-risk-envelope-pilot/stages.ts';
import type { LaneResult } from '../../src/vg-l0-risk-envelope-pilot/search.ts';
import { readSealed } from '../../src/vg-l0-risk-envelope-pilot/records.ts';
import { purposeOf, writeJson } from './common.ts';

purposeOf(['diagnostic']);
setA3Quiet(true);

const args = process.argv.slice(2);
const cut = args[args.indexOf('--cutoff') + 1] as CutoffKey;

if (!cutoffs[cut]) throw new Error('--cutoff C21|C24');

const spec = cutoffs[cut];
const job = `${cut}-search`;
const official = path.join(cacheDir, 'jobs', job, 'archive.sqlite');
const area = path.join(cacheDir, 'analysis');
const copyDir = path.join(area, 'jobs', job);

if (!fs.existsSync(official)) throw new Error(`${official}: the official archive is missing`);
fs.rmSync(copyDir, { recursive: true, force: true });
fs.mkdirSync(copyDir, { recursive: true });
fs.copyFileSync(official, path.join(copyDir, 'archive.sqlite'));

const missPool: PoolLike = {
  start: async () => undefined,
  run: async (tasks) => {
    throw new Error(`census: ${tasks.length} evaluations are not in the archive (the census evaluates nothing)`);
  },
  requestStop: () => undefined,
  stopping: null,
  close: async () => undefined
};
const records = Object.fromEntries(armKeys.map((a) => [a, readSealed<{ lanes: LaneResult[]; backend: string; codeDigest: string }>(searchFile(cut, a))])) as Record<ArmKey, { lanes: LaneResult[]; backend: string; codeDigest: string }>;
const pins = doorSpecs[spec.door].pins;
const lab = new EvalLab({
  study: STUDY_ID,
  job,
  door: spec.door,
  doorPin: `GDX:${pins.GDX.sha256},VGT:${pins.VGT.sha256}`,
  purpose: 'census (archive replay; no evaluation)',
  pool: missPool,
  backend: records.CTRL.backend,
  codeDigest: records.CTRL.codeDigest,
  cacheRoot: area
});

await lab.open();

type Slim = { id: string; cfg: Cfg; rec: SRec; tag: string };
const centres: Record<ArmKey, Slim[]> = { CTRL: [], EXP: [] };
let armNow: ArmKey = 'CTRL';
const plain = lab.evalMany.bind(lab);

lab.evalMany = (async (items: Parameters<typeof plain>[0], tag?: string) => {
  const recs = await plain(items, tag);

  if (tag && (tag.endsWith(':centre') || tag.endsWith(' screen')))
    items.forEach((x, i) => centres[armNow].push({ id: cfgId(x.cfg), cfg: x.cfg, rec: recs[i] as SRec, tag }));
  return recs;
}) as typeof lab.evalMany;

const replay: Record<string, { lanes: number; identical: boolean; differences: string[] }> = {};
const results: Record<ArmKey, LaneResult[]> = { CTRL: [], EXP: [] };

for (const a of armKeys) {
  armNow = a;

  const { results: r } = await runLanes(lab, laneSpecs(cut), budgets.study.broad, arms[a], laneCap, laneSpecs(cut).length * laneCap, finishReserve, `census ${cut} ${a}`);
  const diffs = deepDiff(stripEnvelopes(records[a].lanes), stripEnvelopes(r), '$', [], 20);

  results[a] = r;
  replay[a] = { lanes: r.length, identical: diffs.length === 0, differences: diffs.map((d) => d.path) };
}

// ----- the policy disagreement of centres -----
const verdict = (r: SRec, a: ArmKey) => plausibleArm(r, arms[a]);
const failing = (r: SRec, a: ArmKey) => (r.error ? ['error'] : failingMetrics(r, arms[a]));
const bucketOf = (r: SRec) => {
  const c = verdict(r, 'CTRL');
  const e = verdict(r, 'EXP');

  return c && e ? 'both' : c ? 'CTRL-only' : e ? 'EXP-only' : 'neither';
};
const why = (r: SRec) => {
  const b = bucketOf(r);
  const fc = failing(r, 'CTRL');
  const fe = failing(r, 'EXP');

  if (b === 'EXP-only') return 'DD in (35 %, 40 %] of C0 with PL and BD within 25 %';
  if (b === 'CTRL-only') return `DD ≤ 35 % of C0 but ${fe.map((m) => (m === 'principalLoss' ? 'PL > 25 %' : m === 'bankedDd' ? 'BD > 25 %' : m)).join(' & ')}`;
  if (b === 'neither')
    return r.error || r.net <= 0 || !r.mixed
      ? r.error
        ? 'error'
        : r.net <= 0
          ? 'net ≤ 0'
          : 'a family unfunded'
      : `CTRL: ${fc.join('+') || '—'}; EXP: ${fe.join('+') || '—'}`;
  return 'both';
};
const tally = (rows: Slim[]) => {
  const seen = new Set<string>();
  const out = { centres: 0, both: 0, 'CTRL-only': 0, 'EXP-only': 0, neither: 0, reasons: {} as Record<string, number>, withRiskShape: { both: 0, 'CTRL-only': 0, 'EXP-only': 0, neither: 0 } };

  for (const x of rows) {
    if (seen.has(x.id)) continue;
    seen.add(x.id);
    out.centres++;

    const b = bucketOf(x.rec) as 'both' | 'CTRL-only' | 'EXP-only' | 'neither';

    out[b]++;
    out.reasons[why(x.rec)] = (out.reasons[why(x.rec)] ?? 0) + 1;
    // among centres with net > 0, both families funded and no error: the risk shape alone decides
    if (!x.rec.error && x.rec.net > 0 && x.rec.mixed) out.withRiskShape[b]++;
  }
  return out;
};
const perMetric = (rows: Slim[], a: ArmKey) => {
  const seen = new Set<string>();
  const out = { centres: 0, profitableMixed: 0, plausible: 0, failDd: 0, failPl: 0, failBd: 0 };

  for (const x of rows) {
    if (seen.has(x.id)) continue;
    seen.add(x.id);
    out.centres++;
    if (x.rec.error || x.rec.net <= 0 || !x.rec.mixed) continue;
    out.profitableMixed++;

    const f = failingMetrics(x.rec, arms[a]);

    if (!f.length) out.plausible++;
    if (f.includes('markedDd')) out.failDd++;
    if (f.includes('principalLoss')) out.failPl++;
    if (f.includes('bankedDd')) out.failBd++;
  }
  return out;
};
const bounded = (c: Cfg) => c.g.maximumHoldEnabled === true || c.g.initialStopEnabled === true;
const lanesOf = (a: ArmKey) =>
  results[a].map((l) => {
    const mine = centres[a].filter((x) => x.tag.startsWith(`${a} ${l.key} `));
    const screen = mine.filter((x) => x.tag.endsWith(' screen'));
    const fitted = mine.filter((x) => !x.tag.endsWith(' screen'));

    return {
      lane: l.key,
      requested: l.requested,
      islands: l.islands.length,
      stop: l.extension.stop,
      screen: { proposals: screen.length, plausible: screen.filter((x) => verdict(x.rec, a)).length, perMetric: perMetric(screen, a) },
      fittedCentres: new Set(fitted.map((x) => x.id)).size,
      rung1Feasible: l.counts.r1Feasible ?? 0,
      r2Feasible: l.r2.filter((x) => x.feasible).length,
      r3Feasible: l.r3.filter((x) => x.feasible).length,
      shortlist: l.shortlist.map((p) => ({ pick: p.pick, id: p.id, net: p.centre.net, dd: p.centre.dd, bounded: bounded(p.cfg) })),
      growthBoundedness: {
        boundedCentres: new Set(fitted.filter((x) => bounded(x.cfg)).map((x) => x.id)).size,
        openEndedCentres: new Set(fitted.filter((x) => !bounded(x.cfg)).map((x) => x.id)).size
      },
      perMetricAllCentres: perMetric(mine, a),
      screenReasons: l.failure.screenReasons
    };
  });

// ----- cross-assessment of rung-3 fits, refinement endpoints and shortlists under the other arm -----
const cfgById = new Map<string, Cfg>();

for (const a of armKeys) for (const x of centres[a]) cfgById.set(x.id, x.cfg);

const cross = async (a: ArmKey) => {
  const other: ArmKey = a === 'CTRL' ? 'EXP' : 'CTRL';
  const ids = new Map<string, string>();

  for (const l of results[a]) {
    for (const f of l.r3) ids.set(f.id, `${l.key} r3`);
    for (const r of l.refinements) ids.set(r.endpoint, `${l.key} refinement endpoint`);
    for (const p of l.shortlist) ids.set(p.id, `${l.key} shortlist ${p.pick}`);
  }

  const rows = [];

  for (const [id, where] of ids) {
    const cfg = cfgById.get(id);

    if (!cfg) continue;

    const nb = neighbourhood(cfg, { name: 'r3', n: budgets.study.broad.r3, labels: ['r3', cut], scope: 'joint' });
    const [centre] = await lab.evalMany<SRec>([{ cfg, options: vOptions, risk: true }], 'census r3 centre');
    const nbRecs = await lab.evalMany<SRec>(nb.map((x) => ({ cfg: x.cfg, options: vOptions, risk: true })), 'census r3 neighbours');
    const st = nbStats(centre!, nbRecs, nb.map((x) => x.clipped));
    const own = violationArm(centre!, st, nbRecs, arms[a]);
    const oth = violationArm(centre!, st, nbRecs, arms[other]);

    rows.push({ id, where, net: centre!.net, dd: centre!.dd, envelope: (centre as SRec & { envelope: unknown }).envelope, p90Dd: st.p90Dd, robust: st.robust, feasible: { [a]: own.violation === 0, [other]: oth.violation === 0 }, parts: { [a]: own.parts, [other]: oth.parts } });
  }
  return rows;
};

const crossRows = { CTRL: await cross('CTRL'), EXP: await cross('EXP') };
const screenAll = centres.CTRL.filter((x) => x.tag.endsWith(' screen'));
const record = {
  kind: 'risk-envelope pilot search census (report-only; archive replay, no evaluation)',
  cutoff: cut,
  archive: { official: path.relative(path.join(resultsDir, '..', '..', '..'), official), copy: path.relative(path.join(resultsDir, '..', '..', '..'), path.join(copyDir, 'archive.sqlite')) },
  replayEqualsSealed: replay,
  compute: lab.compute,
  disagreement: {
    screen: tally(screenAll),
    allCentres: tally([...centres.CTRL, ...centres.EXP]),
    byArmSearched: { CTRL: tally(centres.CTRL), EXP: tally(centres.EXP) }
  },
  lanes: { CTRL: lanesOf('CTRL'), EXP: lanesOf('EXP') },
  cross: crossRows,
  crossSummary: Object.fromEntries(
    armKeys.map((a) => {
      const o: ArmKey = a === 'CTRL' ? 'EXP' : 'CTRL';

      return [a, { fits: crossRows[a].length, feasibleOwn: crossRows[a].filter((x) => x.feasible[a]).length, feasibleUnderOther: crossRows[a].filter((x) => x.feasible[o]).length, feasibleBoth: crossRows[a].filter((x) => x.feasible[a] && x.feasible[o]).length }];
    })
  ),
  finished: new Date().toISOString()
};

await lab.close('census-end');
writeJson(path.join(resultsDir, 'analysis', `census-${cut}.json`), record);
console.log(JSON.stringify({ cut, replay, screen: record.disagreement.screen, all: { ...record.disagreement.allCentres, reasons: undefined }, crossSummary: record.crossSummary }));
