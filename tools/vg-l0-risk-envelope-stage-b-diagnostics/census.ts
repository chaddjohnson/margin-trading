// RES-BD 1.0.0 Diagnostic A — the search-archive census of one cutoff (PROTOCOL.md §3; ZERO evaluations). It executes
// the design of Stage B's tools/vg-l0-risk-envelope-stage-b/census.ts (PROTOCOL §10 of RES-B) with Stage A's established
// capture (tools/vg-l0-risk-envelope-sensitivity/population.ts) and two disclosed corrections (AMENDMENTS D1, D2):
//   1. both arms' 64 lanes are replayed with Stage B's own runner (src/vg-l0-risk-envelope-stage-b/stages.ts runLanes,
//      one barrier loop, the official plan, budget, lane cap and finishing reserve) over a Lab bound exactly like the
//      official job to a sha256-verified COPY of its archive, with a pool that refuses (and counts) every evaluation;
//      every replayed lane must equal the sealed lane (compared in the store's own encoding, `plain`), each arm's
//      requested total must equal the sealed requestedByArm, fresh = 0, refusals = 0, the archive's row count unchanged;
//   2. every centre request (screen; rung 1 promoted screen / island; refinement start / move; rung 2; rung 3 /
//      refinement endpoint) is captured with its arm, lane and stage, de-duplicated by cfgId;
//   3. every measured rung neighbourhood (common random numbers: labels [rung, cutoff]) is regenerated exactly, read
//      from the copy (hits only) and assessed under BOTH arms with the frozen violationArm; each fitting arm must get
//      back its own search violation exactly.
// Output (git-ignored intermediate, large): .cache/vg-l0-risk-envelope-stage-b-diagnostics/population-<cut>.json.gz
//   GPU_POLICY_PURPOSE=diagnostic node --no-maglev --experimental-transform-types tools/…/census.ts --cutoff C21
import fs from 'node:fs';
import path from 'node:path';
import { deepDiff } from '../../src/gpu-phase1/compare.ts';
import { checkEnvelope } from '../../src/gpu-backend/lab.ts';
import { setQuiet as setA3Quiet } from '../../src/vg-l0-full-joint/context.ts';
import { budgets } from '../../src/vg-l0-full-joint/budgets.ts';
import { nbStats } from '../../src/vg-l0-full-joint/fitness.ts';
import { vOptions } from '../../src/vg-l0-full-joint/nl0.ts';
import { type Cfg, canonicalCfg, cfgId, neighbourhood } from '../../src/vg-l0-full-joint/space.ts';
import type { SRec } from '../../src/vg-l0-full-joint/evaluate.ts';
import { envNbStats, type Fit, violationArm } from '../../src/vg-l0-risk-envelope-pilot/fitness.ts';
import { Lane, type LaneResult } from '../../src/vg-l0-risk-envelope-pilot/search.ts';
import { type ArmKey, type CutoffKey, armKeys, arms, asPilotArm, cutoffs, setQuiet } from '../../src/vg-l0-risk-envelope-stage-b/context.ts';
import { finishReserve, laneCap } from '../../src/vg-l0-risk-envelope-stage-b/budget.ts';
import { researchSpecs, runLanes, searchFile } from '../../src/vg-l0-risk-envelope-stage-b/stages.ts';
import { plain, readSealed } from '../../src/vg-l0-risk-envelope-stage-b/records.ts';
import { archiveCopy, archiveOriginal, baselineOf, cacheRoot, purposeOf, repoRoot, replayLab, sha256Stream, utc, writeJsonGz } from './common.ts';

purposeOf(['diagnostic']);
setA3Quiet(true);
setQuiet(true);

const args = process.argv.slice(2);
const cut = args[args.indexOf('--cutoff') + 1] as CutoffKey;

if (!cutoffs[cut]) throw new Error('--cutoff C19|C21|C24');

const t0 = Date.now();
const job = `${cut}-search`;
const expect = baselineOf(job);
const originalAtStart = await sha256Stream(archiveOriginal(job));
const copyAtStart = await sha256Stream(archiveCopy(job));

if (originalAtStart !== expect) throw new Error(`${job}: original sha256 ${originalAtStart} ≠ baseline ${expect}`);
if (copyAtStart !== expect) throw new Error(`${job}: copy sha256 ${copyAtStart} ≠ baseline ${expect}`);

type Sealed = { lanes: Record<ArmKey, LaneResult[]>; backend: string; codeDigest: string; door: string; requested: number; requestedByArm: Record<ArmKey, number> };
const sealed = readSealed<Sealed>(searchFile(cut));

if (sealed.door !== cutoffs[cut].door) throw new Error(`${cut}: the sealed search names door ${sealed.door}`);

const { lab, calls } = await replayLab(cut, job, { backend: sealed.backend, codeDigest: sealed.codeDigest });
const rowsAtOpen = lab.store.count('points');

console.log(`[${utc()}] ${cut}: copy verified (${expect.slice(0, 16)}…), ${rowsAtOpen} archived rows; replaying ${researchSpecs(cut).length * armKeys.length} lanes`);

// ----- capture -----
type Seen = { cfg: Cfg; rec: SRec; sources: Set<string> };
const centres = new Map<string, Seen>();
type FitCall = { arm: ArmKey; lane: string; rung: string; n: number; full: boolean; ids: string[]; measured: boolean[]; violations: number[] };
const fitCalls: FitCall[] = [];
const r1Calls = new Map<string, number>();
const r3Calls = new Map<string, number>();
const zero = () => ({ CTRL: 0, EXP30: 0 }) as Record<ArmKey, number>;
const requests = { screen: zero(), centre: zero(), neighbours: zero() };

const note = (cfg: Cfg, rec: SRec, source: string) => {
  const id = cfgId(cfg);
  const c = centres.get(id);

  if (c) {
    c.sources.add(source);
    if (c.rec.net !== rec.net || c.rec.dd !== rec.dd || c.rec.signature !== rec.signature) throw new Error(`${id}: two different archived records for one configuration`);
  } else centres.set(id, { cfg: canonicalCfg(cfg), rec, sources: new Set([source]) });
};

const plainEval = lab.evalMany.bind(lab);

lab.evalMany = (async (items: Parameters<typeof plainEval>[0], tag?: string) => {
  const recs = await plainEval(items, tag);
  const [arm, lane, stage] = (tag ?? '').split(' ') as [ArmKey, string, string];

  if (stage === 'screen') {
    items.forEach((x, i) => note(x.cfg, recs[i] as SRec, `${arm}|${lane}|screen`));
    requests.screen[arm] += items.length;
  } else if (stage?.endsWith(':centre')) requests.centre[arm] += items.length;
  else if (stage?.endsWith(':neighbours')) requests.neighbours[arm] += items.length;
  return recs;
}) as typeof lab.evalMany;

const fitMany0 = Lane.prototype.fitMany;

Lane.prototype.fitMany = async function (this: Lane, cfgs: readonly Cfg[], rung: string, n: number, full = false, gate?: (centre: SRec) => boolean) {
  const fits: Fit[] = await fitMany0.call(this, cfgs, rung, n, full, gate as never);
  const arm = (this as unknown as { arm: { key: ArmKey } }).arm.key;
  const laneKey = this.spec.key;
  const k = `${arm}|${laneKey}`;
  let stage = rung;

  if (rung === 'r1') {
    const i = r1Calls.get(k) ?? 0;

    r1Calls.set(k, i + 1);
    stage = i === 0 ? 'r1-promoted-screen' : 'r1-island';
  } else if (rung === 'r3') {
    const i = r3Calls.get(k) ?? 0;

    r3Calls.set(k, i + 1);
    stage = i === 0 ? 'r3' : 'r3-endpoint';
  } else if (rung === 'refine') stage = full ? 'refine-start' : 'refine-move';

  cfgs.forEach((c, i) => note(c, fits[i]!.centre as SRec, `${arm}|${laneKey}|${stage}`));
  fitCalls.push({ arm, lane: laneKey, rung, n, full, ids: fits.map((f) => f.id), measured: fits.map((f) => f.nb !== null), violations: fits.map((f) => f.violation) });
  return fits;
} as typeof Lane.prototype.fitMany;

// ----- 1. the replay (Stage B's official plan: both arms' lanes in one barrier loop) -----
const plan = researchSpecs(cut).flatMap((s) => armKeys.map((a) => ({ spec: s, arm: arms[a] })));
const { results, rounds } = await runLanes(lab, plan, budgets.study.broad, laneCap, plan.length * laneCap, finishReserve, `census ${cut}`);
const laneDiffs = results.map((r) => {
  const s = sealed.lanes[r.arm].find((x) => x.key === r.result.key);

  if (!s) throw new Error(`${cut} ${r.arm} ${r.result.key}: no sealed lane`);

  // the sealed record was written in the store's encoding (non-finite numbers as "__Inf" …): compare in that encoding
  const d = deepDiff(s, plain(r.result), '$', [], 10);

  return { arm: r.arm, lane: r.result.key, differences: d.length, paths: d.map((x) => x.path) };
});
const replayedByArm = Object.fromEntries(armKeys.map((a) => [a, results.filter((r) => r.arm === a).reduce((s, r) => s + r.result.requested, 0)])) as Record<ArmKey, number>;
const capturedByArm = Object.fromEntries(armKeys.map((a) => [a, requests.screen[a] + requests.centre[a] + requests.neighbours[a]])) as Record<ArmKey, number>;

if (laneDiffs.length !== 64 || laneDiffs.some((d) => d.differences > 0))
  throw new Error(`${cut}: the replayed lanes differ from the sealed lanes: ${JSON.stringify(laneDiffs.filter((d) => d.differences).slice(0, 5))}`);
for (const a of armKeys) {
  if (replayedByArm[a] !== sealed.requestedByArm[a]) throw new Error(`${cut} ${a}: replayed requested ${replayedByArm[a]} ≠ sealed ${sealed.requestedByArm[a]}`);
  if (capturedByArm[a] !== sealed.requestedByArm[a]) throw new Error(`${cut} ${a}: captured requests ${capturedByArm[a]} ≠ sealed ${sealed.requestedByArm[a]}`);
}
if (lab.fresh !== 0 || calls.run !== 0) throw new Error(`${cut}: the replay computed ${lab.fresh} evaluations / called the pool ${calls.run} times`);

const laneHits = lab.hits;

console.log(`[${utc()}] ${cut}: 64/64 lanes replayed = sealed; requested CTRL ${replayedByArm.CTRL} / EXP30 ${replayedByArm.EXP30}; hits ${laneHits}; fresh 0`);

// ----- 2. measured rung neighbourhoods, once per (centre, rung), assessed under both arms -----
const measured = new Map<string, { id: string; rung: string; n: number; by: Set<ArmKey>; violations: Partial<Record<ArmKey, number>> }>();

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

const env1 = (r: SRec) => checkEnvelope((r as SRec & { envelope?: unknown }).envelope, 'neighbour');
const rungRows = [];
let nbRead = 0;

for (const m of measured.values()) {
  const c = centres.get(m.id)!;
  const nb = neighbourhood(c.cfg, { name: m.rung, n: m.n, labels: [m.rung, cut], scope: 'joint' });
  const recs = (await lab.evalMany(nb.map((x) => ({ cfg: x.cfg, options: vOptions, risk: true })), `census ${m.rung} neighbours`)) as SRec[];

  nbRead += recs.length;

  const st = nbStats(c.rec, recs, nb.map((x) => x.clipped));
  const violation = {} as Record<ArmKey, number>;
  const parts = {} as Record<ArmKey, Record<string, number>>;

  for (const a of armKeys) {
    const v = violationArm(c.rec, st, recs, asPilotArm(arms[a]));

    violation[a] = v.violation;
    parts[a] = v.parts;
  }
  for (const a of m.by)
    if (violation[a] !== m.violations[a]) throw new Error(`${m.id} ${m.rung} ${a}: recomputed violation ${violation[a]} ≠ the search's ${m.violations[a]}`);

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
    env: envNbStats(recs),
    // DD − BD_marked per draw: a lower bound on each draw's unbanked giveback U (PROTOCOL §3.4)
    givebackLowerBound: (() => {
      const xs = recs.filter((r) => !r.error).map((r) => Math.max(0, r.dd - env1(r).bankedDdMarked));
      const s = [...xs].sort((a, b) => a - b);

      return { n: s.length, median: s.length ? s[Math.floor((s.length - 1) / 2)]! : null, max: s.at(-1) ?? null };
    })(),
    breach: {
      dd35: count((r) => r.dd > 35_000),
      dd40: count((r) => r.dd > 40_000),
      pl25: count((r) => env1(r).principalLossLiquidation > 25_000),
      bd30: count((r) => env1(r).bankedDdLiquidation > 30_000)
    },
    feasible: Object.fromEntries(armKeys.map((a) => [a, violation[a] === 0])),
    violation,
    parts
  });
}
if (lab.fresh !== 0 || calls.run !== 0) throw new Error(`${cut}: neighbourhood reads computed ${lab.fresh} evaluations / called the pool ${calls.run} times`);

// ----- 3. stage membership from the replayed (= sealed) lane results -----
const stageTags = new Map<string, Set<string>>();
const tag = (id: string, t: string) => (stageTags.get(id) ?? stageTags.set(id, new Set()).get(id)!).add(t);

for (const r of results) {
  const l = r.result;
  const a = r.arm;

  for (const x of l.r2) tag(x.id, `${a}|${l.key}|r2 ${x.feasible ? 'feasible' : 'infeasible'}`);
  for (const x of l.r3) tag(x.id, `${a}|${l.key}|r3 ${x.feasible ? 'feasible' : 'infeasible'}`);
  for (const x of l.refinements) tag(x.endpoint, `${a}|${l.key}|refinement endpoint (${x.kind})`);
  l.shortlist.forEach((p, i) => tag(p.id, `${a}|${l.key}|shortlist #${i + 1} ${p.pick}`));
}

const missingTagged = [...stageTags.keys()].filter((id) => !centres.has(id));

if (missingTagged.length) throw new Error(`${cut}: ${missingTagged.length} sealed lane ids were never requested as centres`);

const rowsAtClose = lab.store.count('points');

if (rowsAtClose !== rowsAtOpen) throw new Error(`${cut}: the archive copy's row count changed ${rowsAtOpen} → ${rowsAtClose}`);

const out = {
  kind: 'RES-BD 1.0.0 census population (Stage B search-archive replay; zero evaluations)',
  cutoff: cut,
  door: cutoffs[cut].door,
  archive: { original: path.relative(repoRoot, archiveOriginal(job)), copy: path.relative(repoRoot, archiveCopy(job)), sha256: expect, rows: rowsAtOpen },
  binding: { backend: sealed.backend, codeDigest: sealed.codeDigest },
  replay: {
    lanes: laneDiffs.length,
    identicalToSealed: laneDiffs.every((d) => d.differences === 0),
    comparedIn: "the store's encoding (plain): non-finite numbers as \"__Inf\" / \"__-Inf\" / \"__NaN\", as sealed",
    requestedByArm: replayedByArm,
    sealedRequestedByArm: sealed.requestedByArm,
    capturedRequests: requests,
    extensionRounds: rounds.length
  },
  zeroEvaluations: { fresh: lab.fresh, refusingPoolCalls: calls.run, refusedTasks: calls.tasks, laneArchiveHits: laneHits, totalArchiveHits: lab.hits, neighbourhoodReads: nbRead, rowsAtOpen, rowsAtClose },
  centres: [...centres.entries()].map(([id, c]) => {
    const r = c.rec;

    return {
      id,
      cell: c.cfg.cell,
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
        envelope: r.error ? null : checkEnvelope((r as SRec & { envelope?: unknown }).envelope, `centre ${id}`)
      }
    };
  }),
  rungs: rungRows,
  seconds: Math.round((Date.now() - t0) / 1000),
  finished: utc()
};

await lab.close('census-end');

const originalAtEnd = await sha256Stream(archiveOriginal(job));

if (originalAtEnd !== expect) throw new Error(`${job}: the ORIGINAL archive changed during the census (${originalAtEnd})`);
(out as Record<string, unknown>).originalSha256AtEnd = originalAtEnd;

const file = path.join(cacheRoot, `population-${cut}.json.gz`);

fs.mkdirSync(cacheRoot, { recursive: true });

const sha = writeJsonGz(file, out);

console.log(JSON.stringify({ cut, lanes: laneDiffs.length, identical: true, centres: out.centres.length, rungs: rungRows.length, nbRead, fresh: lab.fresh, refusals: calls.run, hits: lab.hits, rows: rowsAtOpen, file: path.relative(repoRoot, file), sha256: sha, seconds: out.seconds }));
