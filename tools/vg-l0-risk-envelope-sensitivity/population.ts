// RES-A 1.0.0 stage S1a — the common candidate population of one cutoff, rebuilt from a COPY of the pilot's official search
// archive with ZERO evaluations (PROTOCOL.md §3; the pilot census's method, tools/vg-l0-risk-envelope-pilot/census.ts):
//   1. both arms' lanes are replayed with the pilot's frozen lane code (src/vg-l0-risk-envelope-pilot/stages.ts runLanes)
//      over a Lab whose pool refuses every evaluation; the replayed lane results must equal the sealed ones (envelopes
//      stripped), or the audit stops;
//   2. every centre request (screen, rung 1, rungs 2–3, refinement start / moves / endpoints) is captured with its arm,
//      lane, cell, replicate and stage; every fitMany call records whether the centre's neighbours were measured;
//   3. every measured rung neighbourhood (rung 1 = 16, rung 2 = 64, rung 3 = 128, refinement = 16; common random numbers
//      across centres and arms: labels [rung, cutoff]) is regenerated exactly, read from the archive copy, and condensed
//      into the statistics every policy's stage feasibility needs (the pilot's violationArm with the policy substituted).
// Output (git-ignored intermediate): .cache/vg-l0-risk-envelope-sensitivity/population-<cut>.json.gz
//   GPU_POLICY_PURPOSE=diagnostic node --no-maglev --experimental-transform-types tools/vg-l0-risk-envelope-sensitivity/population.ts --cutoff C21
import path from 'node:path';
import { deepDiff } from '../../src/gpu-phase1/compare.ts';
import { setQuiet as setA3Quiet } from '../../src/vg-l0-full-joint/context.ts';
import { nbStats } from '../../src/vg-l0-full-joint/fitness.ts';
import { vOptions } from '../../src/vg-l0-full-joint/nl0.ts';
import { type Cfg, canonicalCfg, cfgId, neighbourhood } from '../../src/vg-l0-full-joint/space.ts';
import type { SRec } from '../../src/vg-l0-full-joint/evaluate.ts';
import { budgets } from '../../src/vg-l0-full-joint/budgets.ts';
import { checkEnvelope } from '../../src/gpu-backend/lab.ts';
import { type ArmKey, type CutoffKey, armKeys, arms as pilotArms, cutoffs } from '../../src/vg-l0-risk-envelope-pilot/context.ts';
import { finishReserve, laneCap } from '../../src/vg-l0-risk-envelope-pilot/budget.ts';
import { envNbStats, violationArm } from '../../src/vg-l0-risk-envelope-pilot/fitness.ts';
import { laneSpecs, runLanes, searchFile, stripEnvelopes } from '../../src/vg-l0-risk-envelope-pilot/stages.ts';
import { Lane, type LaneResult } from '../../src/vg-l0-risk-envelope-pilot/search.ts';
import { readSealed } from '../../src/vg-l0-risk-envelope-pilot/records.ts';
import type { Fit } from '../../src/vg-l0-risk-envelope-pilot/fitness.ts';
import { archiveCopy, cacheRoot, purposeOf, replayLab, sha256File, utc, writeJsonGz } from './common.ts';
import { arms, policyKeys } from './policies.ts';

purposeOf(['diagnostic']);
setA3Quiet(true);

const args = process.argv.slice(2);
const cut = args[args.indexOf('--cutoff') + 1] as CutoffKey;

if (!cutoffs[cut]) throw new Error('--cutoff C21|C24');

const t0 = Date.now();
const job = `${cut}-search`;
const archiveSha256AtStart = sha256File(archiveCopy(job));
const sealed = Object.fromEntries(
  armKeys.map((a) => [a, readSealed<{ lanes: LaneResult[]; backend: string; codeDigest: string; requested?: number }>(searchFile(cut, a))])
) as Record<ArmKey, { lanes: LaneResult[]; backend: string; codeDigest: string }>;

if (sealed.CTRL.backend !== sealed.EXP.backend || sealed.CTRL.codeDigest !== sealed.EXP.codeDigest)
  throw new Error(`${cut}: the two arms' sealed search records name different backends or code digests`);

const lab = await replayLab(cut, job, { backend: sealed.CTRL.backend, codeDigest: sealed.CTRL.codeDigest });

// ----- capture -----
type CentreSeen = { cfg: Cfg; rec: SRec; sources: Set<string> };
const centres = new Map<string, CentreSeen>();
type FitCall = { arm: ArmKey; lane: string; rung: string; n: number; full: boolean; ids: string[]; measured: boolean[]; violations: number[]; call: number };
const fitCalls: FitCall[] = [];
const r1Calls = new Map<string, number>(); // per arm + lane: the count of rung-1 calls (the first is the promoted screen)
const r3Calls = new Map<string, number>(); // per arm + lane: the second rung-3 call is the refinement endpoints
let armNow: ArmKey = 'CTRL';
let requests = { centre: 0, neighbour: 0 };

const note = (cfg: Cfg, rec: SRec, source: string) => {
  const id = cfgId(cfg);
  const c = centres.get(id);

  if (c) {
    c.sources.add(source);
    if (c.rec.net !== rec.net || c.rec.dd !== rec.dd || c.rec.signature !== rec.signature)
      throw new Error(`${id}: two different archived records for one configuration`);
  } else centres.set(id, { cfg: canonicalCfg(cfg), rec, sources: new Set([source]) });
};

const plain = lab.evalMany.bind(lab);

lab.evalMany = (async (items: Parameters<typeof plain>[0], tag?: string) => {
  const recs = await plain(items, tag);

  if (tag?.endsWith(' screen')) {
    const lane = tag.slice(armNow.length + 1, -' screen'.length);

    items.forEach((x, i) => note(x.cfg, recs[i] as SRec, `${armNow}|${lane}|screen`));
    requests.centre += items.length;
  } else if (tag?.endsWith(':neighbours')) requests.neighbour += items.length;
  return recs;
}) as typeof lab.evalMany;

const fitMany0 = Lane.prototype.fitMany;

Lane.prototype.fitMany = async function (this: Lane, cfgs: readonly Cfg[], rung: string, n: number, full = false, gate?: (centre: SRec) => boolean) {
  const fits: Fit[] = await fitMany0.call(this, cfgs, rung, n, full, gate as never);
  const laneKey = this.spec.key;
  const k = `${armNow}|${laneKey}`;
  let stage: string = rung;

  if (rung === 'r1') {
    const i = r1Calls.get(k) ?? 0;

    r1Calls.set(k, i + 1);
    stage = i === 0 ? 'r1-promoted-screen' : 'r1-island';
  } else if (rung === 'r3') {
    const i = r3Calls.get(k) ?? 0;

    r3Calls.set(k, i + 1);
    stage = i === 0 ? 'r3' : 'r3-endpoint';
  } else if (rung === 'refine') stage = full ? 'refine-start' : 'refine-move';

  cfgs.forEach((c, i) => note(c, fits[i]!.centre as SRec, `${armNow}|${laneKey}|${stage}`));
  requests.centre += cfgs.length;
  fitCalls.push({
    arm: armNow,
    lane: laneKey,
    rung,
    n,
    full,
    ids: fits.map((f) => f.id),
    measured: fits.map((f) => f.nb !== null),
    violations: fits.map((f) => f.violation),
    call: fitCalls.length
  });
  return fits;
} as typeof Lane.prototype.fitMany;

// ----- 1. replay both arms (the census's exact call) -----
const replay: Record<string, { lanes: number; identical: boolean; differences: string[]; requested: number }> = {};
const results: Record<ArmKey, LaneResult[]> = { CTRL: [], EXP: [] };

for (const a of armKeys) {
  armNow = a;

  const { results: r } = await runLanes(lab, laneSpecs(cut), budgets.study.broad, pilotArms[a], laneCap, laneSpecs(cut).length * laneCap, finishReserve, `audit ${cut} ${a}`);
  const diffs = deepDiff(stripEnvelopes(sealed[a].lanes), stripEnvelopes(r), '$', [], 20);

  results[a] = r;
  replay[a] = { lanes: r.length, identical: diffs.length === 0, differences: diffs.map((d) => d.path), requested: r.reduce((s, l) => s + l.requested, 0) };
  if (diffs.length) throw new Error(`${cut} ${a}: the replayed lanes differ from the sealed lane results at ${diffs.map((d) => d.path).join(', ')}`);
  console.log(`[${utc()}] ${cut} ${a}: ${r.length} lanes replayed = sealed; requested ${replay[a].requested}; archive hits ${lab.hits}, fresh ${lab.fresh}`);
}
if (lab.fresh !== 0) throw new Error(`${cut}: the replay computed ${lab.fresh} evaluations (must be 0)`);

const laneRequests = { ...requests };

// ----- 2. the measured rung neighbourhoods, once per (centre, rung) -----
const measured = new Map<string, { id: string; rung: string; n: number; by: Set<string>; violations: Record<string, number> }>();

for (const c of fitCalls)
  c.ids.forEach((id, i) => {
    if (!c.measured[i]) return;

    const k = `${id}|${c.rung}`;
    const m = measured.get(k) ?? measured.set(k, { id, rung: c.rung, n: c.n, by: new Set(), violations: {} }).get(k)!;

    if (m.n !== c.n) throw new Error(`${k}: two fidelities`);
    m.by.add(c.arm);
    if (m.violations[c.arm] !== undefined && m.violations[c.arm] !== c.violations[i]) throw new Error(`${k}: two violations for ${c.arm}`);
    m.violations[c.arm] = c.violations[i]!;
  });

const quantiles = (xs: number[]) => {
  const s = [...xs].sort((a, b) => a - b);
  const q = (p: number) => {
    if (!s.length) return NaN;

    const h = (s.length - 1) * p;
    const lo = Math.floor(h);

    return s[lo]! + (h - lo) * ((s[Math.min(lo + 1, s.length - 1)] ?? s[lo]!) - s[lo]!);
  };

  return { n: s.length, median: q(0.5), p90: q(0.9), worst: s.at(-1) ?? NaN };
};

type RungRow = {
  id: string;
  rung: string;
  n: number;
  unique: number;
  failed: number;
  by: string[];
  robust: number;
  p10: number;
  median: number;
  p90DdCents: number;
  env: ReturnType<typeof envNbStats>;
  breach: { dd35: number; dd40: number; pl25: number; bd25: number; bd30: number; bd35: number };
  feasible: Record<string, boolean>;
  violation: Record<string, number>;
  checkedAgainstSearch: Record<string, boolean>;
};
const rungRows: RungRow[] = [];
let nbRead = 0;

for (const m of measured.values()) {
  const c = centres.get(m.id)!;
  const nb = neighbourhood(c.cfg, { name: m.rung, n: m.n, labels: [m.rung, cut], scope: 'joint' });
  const recs = (await lab.evalMany(nb.map((x) => ({ cfg: x.cfg, options: vOptions, risk: true })), `audit ${m.rung} neighbours`)) as SRec[];

  nbRead += recs.length;

  const st = nbStats(c.rec, recs, nb.map((x) => x.clipped));
  const env = envNbStats(recs);
  const feasible: Record<string, boolean> = {};
  const violation: Record<string, number> = {};

  for (const k of policyKeys) {
    const v = violationArm(c.rec, st, recs, arms[k]);

    violation[k] = v.violation;
    feasible[k] = v.violation === 0;
  }

  // the arms that fitted this centre at this rung must get back their own sealed-run violation exactly
  const checked: Record<string, boolean> = {};

  for (const a of m.by) {
    const v = violationArm(c.rec, st, recs, pilotArms[a as ArmKey]).violation;

    checked[a] = v === m.violations[a];
    if (!checked[a]) throw new Error(`${m.id} ${m.rung} ${a}: recomputed violation ${v} ≠ the search's ${m.violations[a]}`);
  }

  const env1 = (r: SRec) => checkEnvelope((r as SRec & { envelope?: unknown }).envelope, 'neighbour');
  const count = (f: (r: SRec) => boolean) => recs.filter((r) => r.error || f(r)).length;

  rungRows.push({
    id: m.id,
    rung: m.rung,
    n: m.n,
    unique: recs.length,
    failed: recs.filter((r) => r.error).length,
    by: [...m.by].sort(),
    robust: st.robust,
    p10: st.p10,
    median: st.median,
    p90DdCents: st.p90Dd,
    env,
    breach: {
      dd35: count((r) => r.dd > 35_000),
      dd40: count((r) => r.dd > 40_000),
      pl25: count((r) => env1(r).principalLossLiquidation > 25_000),
      bd25: count((r) => env1(r).bankedDdLiquidation > 25_000),
      bd30: count((r) => env1(r).bankedDdLiquidation > 30_000),
      bd35: count((r) => env1(r).bankedDdLiquidation > 35_000)
    },
    feasible,
    violation,
    checkedAgainstSearch: checked
  });
}
if (lab.fresh !== 0) throw new Error(`${cut}: neighbourhood reads computed ${lab.fresh} evaluations (must be 0)`);

// ----- 3. lane-level stage membership from the sealed lane results -----
const stageTags = new Map<string, Set<string>>();
const tag = (id: string, t: string) => (stageTags.get(id) ?? stageTags.set(id, new Set()).get(id)!).add(t);

for (const a of armKeys)
  for (const l of results[a]) {
    for (const x of l.r2) tag(x.id, `${a}|${l.key}|r2${x.feasible ? ' feasible' : ' infeasible'}`);
    for (const x of l.r3) tag(x.id, `${a}|${l.key}|r3${x.feasible ? ' feasible' : ' infeasible'}`);
    for (const r of l.refinements) tag(r.endpoint, `${a}|${l.key}|refinement endpoint (${r.kind})`);
    l.shortlist.forEach((p, i) => tag(p.id, `${a}|${l.key}|shortlist #${i + 1} ${p.pick}`));
    for (const x of l.topByNet) tag(x.id, `${a}|${l.key}|top-net`);
    for (const x of l.visibleInfeasible) tag(x.id, `${a}|${l.key}|visible infeasible`);
    for (const x of l.frontier) tag(x.id, `${a}|${l.key}|frontier`);
  }

const missingTagged = [...stageTags.keys()].filter((id) => !centres.has(id));

if (missingTagged.length) throw new Error(`${cut}: ${missingTagged.length} sealed lane ids were never requested as centres`);

// ----- 4. write -----
const envelopeOf = (r: SRec) => (r.error ? null : checkEnvelope((r as SRec & { envelope?: unknown }).envelope, `centre ${r.id}`));
const out = {
  kind: 'RES-A 1.0.0 population (archive replay; zero evaluations)',
  cutoff: cut,
  door: cutoffs[cut].door,
  archive: { copy: path.relative(cacheRoot, archiveCopy(job)), sha256AtStart: archiveSha256AtStart },
  binding: { backend: sealed.CTRL.backend, codeDigest: sealed.CTRL.codeDigest },
  replay,
  requests: { lanes: laneRequests, neighbourhoodReads: nbRead },
  compute: { fresh: lab.fresh, archiveHits: lab.hits },
  archivedRows: lab.store.count('points'),
  centres: [...centres.entries()].map(([id, c]) => {
    const r = c.rec;

    return {
      id,
      cfg: c.cfg,
      cell: c.cfg.cell,
      growthBounded: c.cfg.g.maximumHoldEnabled === true || c.cfg.g.initialStopEnabled === true,
      sources: [...c.sources].sort(),
      stageTags: [...(stageTags.get(id) ?? [])].sort(),
      rec: {
        error: r.error ?? null,
        net: r.net,
        dd: r.dd,
        lots: r.lots,
        mixed: r.mixed,
        famLots: { D1: r.fam?.D1?.lots ?? 0, G: r.fam?.G?.lots ?? 0 },
        signature: r.signature,
        sessionsHeld: r.sessionsHeld,
        sessions: r.sessions,
        partials: r.partials,
        topEpisode: r.topEpisode,
        largestWin: r.largestWin,
        worstLoss: r.worstLoss,
        envelope: envelopeOf(r)
      }
    };
  }),
  rungs: rungRows,
  seconds: Math.round((Date.now() - t0) / 1000),
  finished: utc()
};

await lab.close('audit-population-end');

const file = path.join(cacheRoot, `population-${cut}.json.gz`);
const sha = writeJsonGz(file, out);

console.log(
  JSON.stringify({ cut, replay, centres: out.centres.length, rungs: rungRows.length, nbRead, requests: laneRequests, fresh: lab.fresh, hits: lab.hits, file: path.relative(cacheRoot, file), sha256: sha, seconds: out.seconds })
);
