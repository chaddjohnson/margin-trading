// RES-BD 1.0.0 S4 — the analysis (NO evaluation; PROTOCOL.md §3.4, §4.4): reads the census / qualification
// intermediates (.cache/…/population-<cut>.json.gz, qualification-<cut>.json.gz), the giveback results
// (results/giveback/giveback-<cut>.json and the full .cache rows) and Stage B's sealed records, and writes the
// machine-readable census, draw and paired-giveback records plus results/analysis/TABLES.md.
//   GPU_POLICY_PURPOSE=diagnostic node --no-maglev --experimental-transform-types tools/…/analyze.ts [C19 C21 C24]
import fs from 'node:fs';
import path from 'node:path';
import { quantile } from '../../src/vg-d1-growth-joint/fitness.ts';
import { wilson } from '../../src/vg-d1-growth-diagnostic/risk.ts';
import { assessArm, plausibleArm } from '../../src/vg-l0-risk-envelope-pilot/fitness.ts';
import { type ArmKey, type CutoffKey, armKeys, arms, asPilotArm, cutoffKeys, cutoffs } from '../../src/vg-l0-risk-envelope-stage-b/context.ts';
import { selectionFile } from '../../src/vg-l0-risk-envelope-stage-b/doors.ts';
import { qualificationFile, searchFile } from '../../src/vg-l0-risk-envelope-stage-b/stages.ts';
import { readSealed } from '../../src/vg-l0-risk-envelope-stage-b/records.ts';
import type { Evidence } from '../../src/vg-l0-risk-envelope-stage-b/qualify.ts';
import type { LaneValue } from '../../src/vg-l0-risk-envelope-stage-b/select.ts';
import { type Pair, summarize } from '../../src/vg-l0-risk-envelope-stage-b/stats.ts';
import type { LaneResult } from '../../src/vg-l0-risk-envelope-pilot/search.ts';
import { cacheRoot, purposeOf, readJson, readJsonGz, repoRoot, resultsDir, utc, writeCsv, writeJson } from './common.ts';

purposeOf(['diagnostic']);

const argCuts = process.argv.slice(2).filter((a) => /^C(19|21|24)$/.test(a)) as CutoffKey[];
const cuts = (argCuts.length ? argCuts : cutoffKeys).filter((c) => fs.existsSync(path.join(cacheRoot, `population-${c}.json.gz`)));
const C = asPilotArm(arms.CTRL);
const E = asPilotArm(arms.EXP30);
const K35 = 35_000;
const K40 = 40_000;

// ---------------------------------------------------------------- helpers
const sortN = (xs: readonly number[]) => [...xs].sort((a, b) => a - b);
const mean = (xs: readonly number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);
const dist = (xs0: readonly (number | null | undefined)[]) => {
  const xs = sortN(xs0.filter((x): x is number => typeof x === 'number' && Number.isFinite(x)));

  if (!xs.length) return { n: 0 };

  const k = Math.max(1, Math.ceil(0.1 * xs.length));

  return {
    n: xs.length,
    mean: mean(xs),
    min: xs[0],
    p10: quantile(xs, 0.1),
    p25: quantile(xs, 0.25),
    median: quantile(xs, 0.5),
    p75: quantile(xs, 0.75),
    p90: quantile(xs, 0.9),
    p99: quantile(xs, 0.99),
    max: xs.at(-1),
    top10Mean: xs.slice(-10).reduce((a, b) => a + b, 0) / Math.min(10, xs.length),
    worst10PctMean: xs.slice(xs.length - k).reduce((a, b) => a + b, 0) / k
  };
};
const fmt$ = (x: number | null | undefined, d = 0) =>
  x === null || x === undefined || !Number.isFinite(x) ? '—' : `${x < 0 ? '−' : ''}$${Math.abs(x).toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d })}`;
const fmtS = (x: number | null | undefined, d = 0) => (x === null || x === undefined || !Number.isFinite(x) ? '—' : `${x > 0 ? '+' : x < 0 ? '−' : ''}$${Math.abs(x).toLocaleString('en-US', { maximumFractionDigits: d })}`);
const pct = (x: number | null | undefined, d = 1) => (x === null || x === undefined || !Number.isFinite(x) ? '—' : `${(100 * x).toFixed(d)} %`);
const n0 = (x: number) => x.toLocaleString('en-US');
const share = (k: number, n: number) => (n ? `${n0(k)} (${((100 * k) / n).toFixed(1)} %)` : '0');

// ---------------------------------------------------------------- census
type PopCentre = {
  id: string;
  cell: string;
  sources: string[];
  stageTags: string[];
  rec: { error: string | null; net: number; dd: number; lots: number; mixed: boolean; famLots: { D1: number; G: number }; signature: string; sessionsHeld?: number; sessions?: number; envelope: { bankedDdMarked: number; bankedDdLiquidation: number; principalLossMarked: number; principalLossLiquidation: number } | null };
};
type RungRow = {
  id: string;
  rung: string;
  n: number;
  unique: number;
  failed: number;
  by: ArmKey[];
  p90DdCents: number;
  env: { markedDd: { p90: number }; principalLoss: { liquidation: { p90: number } }; bankedDd: { liquidation: { p90: number } } };
  givebackLowerBound: { n: number; median: number | null; max: number | null };
  breach: { dd35: number; dd40: number; pl25: number; bd30: number };
  feasible: Record<ArmKey, boolean>;
  violation: Record<ArmKey, number>;
  parts: Record<ArmKey, Record<string, number>>;
};
type Pop = {
  cutoff: CutoffKey;
  archive: { original: string; copy: string; sha256: string; rows: number };
  binding: { backend: string; codeDigest: string };
  replay: { lanes: number; identicalToSealed: boolean; requestedByArm: Record<ArmKey, number>; sealedRequestedByArm: Record<ArmKey, number>; capturedRequests: Record<string, Record<ArmKey, number>>; extensionRounds: number };
  zeroEvaluations: { fresh: number; refusingPoolCalls: number; refusedTasks: number; laneArchiveHits: number; totalArchiveHits: number; neighbourhoodReads: number; rowsAtOpen: number; rowsAtClose: number };
  originalSha256AtEnd: string;
  centres: PopCentre[];
  rungs: RungRow[];
  seconds: number;
};

const stageRank: Record<string, number> = { screen: 0, 'r1-promoted-screen': 1, 'r1-island': 1, 'refine-start': 2, 'refine-move': 2, r2: 3, r3: 4, 'r3-endpoint': 4 };
const stageName = ['screen', 'rung 1', 'refinement', 'rung 2', 'rung 3 / endpoint', 'shortlist'];

const censusOf = (cut: CutoffKey) => {
  const pop = readJsonGz<Pop>(path.join(cacheRoot, `population-${cut}.json.gz`));
  const search = readSealed<{ lanes: Record<ArmKey, LaneResult[]>; requestedByArm: Record<ArmKey, number>; requested: number }>(searchFile(cut));
  const q = readSealed<{ evidence: Evidence[] }>(qualificationFile(cut));
  const rows = pop.centres.map((c) => {
    const src = c.sources.map((s) => s.split('|') as [ArmKey, string, string]);
    const armsReq = [...new Set(src.map((s) => s[0]))].sort();
    const post = [...new Set(src.filter((s) => s[2] !== 'screen').map((s) => s[0]))].sort();
    const screen = src.some((s) => s[2] === 'screen');
    let highest = Math.max(...src.map((s) => stageRank[s[2]] ?? -1));

    if (src.some((s) => stageRank[s[2]] === undefined)) throw new Error(`${cut} ${c.id}: unknown stage ${c.sources.join(' ')}`);
    if (c.stageTags.some((t) => t.includes('|shortlist'))) highest = 5;

    const r = c.rec;
    const ok = !r.error && r.net > 0 && r.mixed && r.envelope !== null;
    const recLike = { ...r, error: r.error ?? undefined } as never;
    const p0 = ok && plausibleArm(recLike, C);
    const p3 = ok && plausibleArm(recLike, E);
    const a3 = ok ? assessArm(recLike, E) : null;
    const failing3 = a3 ? a3.checks.filter((x) => x.pass === false) : [];
    const binding3 = failing3.length ? [...failing3].sort((a, b) => b.excess - a.excess)[0]!.metric : null;
    const env = r.envelope;

    return {
      id: c.id,
      cell: c.cell,
      origin: armsReq.length === 2 ? 'both' : armsReq[0]!,
      postScreenBy: post.length === 2 ? 'both' : post.length ? post[0]! : 'none',
      screen,
      highest,
      reason: r.error ? 'error' : !r.mixed ? 'a family unfunded' : r.net <= 0 ? 'net ≤ 0' : !env ? 'no envelope' : 'scope',
      ok,
      net: r.net,
      dd: r.dd,
      plLiq: env?.principalLossLiquidation ?? null,
      bdLiq: env?.bankedDdLiquidation ?? null,
      bdMarked: env?.bankedDdMarked ?? null,
      givebackLowerBound: ok && env ? Math.max(0, r.dd - env.bankedDdMarked) : null,
      p0,
      p3,
      failP3: failing3.map((x) => x.metric).join('+'),
      bindingP3: binding3,
      ddBand: ok && r.dd > K35 && r.dd <= K40,
      lots: r.lots,
      occupancy: r.sessions ? (r.sessionsHeld ?? 0) / r.sessions : null
    };
  });
  const ok = rows.filter((r) => r.ok);
  const count = (xs: typeof rows, f: (r: (typeof rows)[number]) => boolean) => xs.filter(f).length;
  const overlap = (xs: typeof rows) => ({ n: xs.length, both: count(xs, (r) => r.p0 && r.p3), p0Only: count(xs, (r) => r.p0 && !r.p3), p3Only: count(xs, (r) => !r.p0 && r.p3), neither: count(xs, (r) => !r.p0 && !r.p3) });
  const band = (xs: typeof rows) => {
    const b = xs.filter((r) => r.ddBand);

    return { centres: b.length, admittedByP3: count(b, (r) => r.p3), offsetByPlOrBd: count(b, (r) => !r.p3), offsetByPl: count(b, (r) => r.failP3.includes('principalLoss')), offsetByBd: count(b, (r) => r.failP3.includes('bankedDd')) };
  };
  const lbShare = (xs: typeof rows) => dist(xs.filter((r) => r.dd > 0).map((r) => (r.givebackLowerBound ?? 0) / r.dd));
  const netDist = (xs: typeof rows) => dist(xs.map((r) => r.net));
  const failCombos: Record<string, number> = {};
  const bindingCounts: Record<string, number> = {};

  for (const r of ok.filter((x) => !x.p3)) {
    failCombos[r.failP3 || '(none: unfunded)'] = (failCombos[r.failP3 || '(none: unfunded)'] ?? 0) + 1;
    bindingCounts[r.bindingP3 ?? 'none'] = (bindingCounts[r.bindingP3 ?? 'none'] ?? 0) + 1;
  }

  // rung-fit level (centre + measured neighbourhood p90 gates), under both arms
  const rungs = pop.rungs;
  const rungKinds = [...new Set(rungs.map((r) => r.rung))];
  const rungTable = rungKinds.map((k) => {
    const xs = rungs.filter((r) => r.rung === k);
    const bothF = xs.filter((r) => r.feasible.CTRL && r.feasible.EXP30).length;
    const cOnly = xs.filter((r) => r.feasible.CTRL && !r.feasible.EXP30).length;
    const eOnly = xs.filter((r) => !r.feasible.CTRL && r.feasible.EXP30).length;
    const parts = (a: ArmKey, ys: RungRow[]) => {
      const o: Record<string, number> = {};

      for (const y of ys) for (const [p, v] of Object.entries(y.parts[a])) if (v > 0) o[p] = (o[p] ?? 0) + 1;
      return o;
    };
    const eOnlyRows = xs.filter((r) => !r.feasible.CTRL && r.feasible.EXP30);

    return {
      rung: k,
      n: xs[0]?.n ?? null,
      measured: xs.length,
      fittedBy: { CTRL: xs.filter((r) => r.by.length === 1 && r.by[0] === 'CTRL').length, EXP30: xs.filter((r) => r.by.length === 1 && r.by[0] === 'EXP30').length, both: xs.filter((r) => r.by.length === 2).length },
      feasible: { both: bothF, ctrlOnly: cOnly, exp30Only: eOnly, neither: xs.length - bothF - cOnly - eOnly },
      exp30OnlyCtrlFailingParts: parts('CTRL', eOnlyRows),
      exp30OnlyP90DdBand: eOnlyRows.filter((r) => r.env.markedDd.p90 > K35 && r.env.markedDd.p90 <= K40).length,
      ctrlInfeasibleParts: parts('CTRL', xs.filter((r) => !r.feasible.CTRL)),
      exp30InfeasibleParts: parts('EXP30', xs.filter((r) => !r.feasible.EXP30))
    };
  });

  // finalist qualification (Stage B's sealed counterfactual, recomputed from the sealed verdicts)
  const members = q.evidence.filter((e) => e.lane !== 'benchmark');
  const qOrigin = (e: Evidence) => [...new Set(e.shortlistedBy.map((s) => s.arm))].sort().join('+');
  const finalists = {
    members: members.length,
    both: members.filter((e) => e.arms.CTRL.qualified && e.arms.EXP30.qualified).length,
    p0Only: members.filter((e) => e.arms.CTRL.qualified && !e.arms.EXP30.qualified).length,
    p3Only: members.filter((e) => !e.arms.CTRL.qualified && e.arms.EXP30.qualified).length,
    neither: members.filter((e) => !e.arms.CTRL.qualified && !e.arms.EXP30.qualified).length,
    byOrigin: Object.fromEntries(
      ['CTRL', 'EXP30'].map((o) => {
        const xs = members.filter((e) => qOrigin(e) === o);

        return [o, { members: xs.length, both: xs.filter((e) => e.arms.CTRL.qualified && e.arms.EXP30.qualified).length, p0Only: xs.filter((e) => e.arms.CTRL.qualified && !e.arms.EXP30.qualified).length, p3Only: xs.filter((e) => !e.arms.CTRL.qualified && e.arms.EXP30.qualified).length, neither: xs.filter((e) => !e.arms.CTRL.qualified && !e.arms.EXP30.qualified).length }];
      })
    ),
    bestQualifiedCentreNet: {
      P0: Math.max(...members.filter((e) => e.arms.CTRL.qualified).map((e) => e.centre.net)),
      P3: Math.max(...members.filter((e) => e.arms.EXP30.qualified).map((e) => e.centre.net))
    }
  };

  const screenRows = ok.filter((r) => r.screen);
  const postRows = (a: ArmKey) => ok.filter((r) => r.postScreenBy === a || r.postScreenBy === 'both');
  const summary = {
    cutoff: cut,
    door: cutoffs[cut].door,
    archive: pop.archive,
    replay: pop.replay,
    zeroEvaluations: pop.zeroEvaluations,
    originalSha256AtEnd: pop.originalSha256AtEnd,
    requests: {
      sealedRequestedByArm: search.requestedByArm,
      sealedRequested: search.requested,
      captured: pop.replay.capturedRequests,
      lanes: Object.fromEntries(armKeys.map((a) => [a, search.lanes[a].length]))
    },
    centres: {
      unique: rows.length,
      byOrigin: { CTRL: count(rows, (r) => r.origin === 'CTRL'), EXP30: count(rows, (r) => r.origin === 'EXP30'), both: count(rows, (r) => r.origin === 'both') },
      reasons: Object.fromEntries(['error', 'a family unfunded', 'net ≤ 0', 'no envelope', 'scope'].map((k) => [k, count(rows, (r) => r.reason === k)])),
      scope: ok.length,
      scopeByOrigin: { CTRL: count(ok, (r) => r.origin === 'CTRL'), EXP30: count(ok, (r) => r.origin === 'EXP30'), both: count(ok, (r) => r.origin === 'both') },
      scopeByHighestStage: Object.fromEntries(stageName.map((s, i) => [s, count(ok, (r) => r.highest === i)]))
    },
    centrePlausibility: {
      all: overlap(ok),
      byOrigin: { CTRL: overlap(ok.filter((r) => r.origin === 'CTRL')), EXP30: overlap(ok.filter((r) => r.origin === 'EXP30')), both: overlap(ok.filter((r) => r.origin === 'both')) },
      byHighestStage: Object.fromEntries(stageName.map((s, i) => [s, overlap(ok.filter((r) => r.highest === i))])),
      screenProposals: overlap(screenRows),
      postScreenByArm: { CTRL: overlap(postRows('CTRL')), EXP30: overlap(postRows('EXP30')) }
    },
    limits: {
      ddOver35: count(ok, (r) => r.dd > K35),
      ddOver40: count(ok, (r) => r.dd > K40),
      plOver25: count(ok, (r) => (r.plLiq ?? 0) > 25_000),
      bdOver30: count(ok, (r) => (r.bdLiq ?? 0) > 30_000),
      p3FailCombos: failCombos,
      p3Binding: bindingCounts,
      p0FailReason: { 'DD > $35k': count(ok, (r) => !r.p0) }
    },
    ddBand35to40: { all: band(ok), screen: band(screenRows), postScreenCTRL: band(postRows('CTRL')), postScreenEXP30: band(postRows('EXP30')), byOrigin: { CTRL: band(ok.filter((r) => r.origin === 'CTRL')), EXP30: band(ok.filter((r) => r.origin === 'EXP30')), both: band(ok.filter((r) => r.origin === 'both')) } },
    p0PassP3Fail: { centres: count(ok, (r) => r.p0 && !r.p3), byBankedDd: count(ok, (r) => r.p0 && !r.p3 && r.failP3.includes('bankedDd')), byPrincipalLoss: count(ok, (r) => r.p0 && !r.p3 && r.failP3.includes('principalLoss')), maxNet: Math.max(0, ...ok.filter((r) => r.p0 && !r.p3).map((r) => r.net)) },
    netDistribution: {
      scope: netDist(ok),
      p0Plausible: netDist(ok.filter((r) => r.p0)),
      p3Plausible: netDist(ok.filter((r) => r.p3)),
      bothPlausible: netDist(ok.filter((r) => r.p0 && r.p3)),
      p3OnlyPlausible: netDist(ok.filter((r) => r.p3 && !r.p0)),
      postScreenCTRL_p0: netDist(postRows('CTRL').filter((r) => r.p0)),
      postScreenEXP30_p3: netDist(postRows('EXP30').filter((r) => r.p3)),
      postScreenEXP30_p0: netDist(postRows('EXP30').filter((r) => r.p0)),
      bandAdmittedByP3: netDist(ok.filter((r) => r.ddBand && r.p3)),
      bandOffsetByPlOrBd: netDist(ok.filter((r) => r.ddBand && !r.p3)),
      p0PassP3Fail: netDist(ok.filter((r) => r.p0 && !r.p3))
    },
    highestStageOf: {
      p3Only: Object.fromEntries(stageName.map((x, i) => [x, count(ok, (r) => r.p3 && !r.p0 && r.highest === i)])),
      p0PassP3Fail: Object.fromEntries(stageName.map((x, i) => [x, count(ok, (r) => r.p0 && !r.p3 && r.highest === i)])),
      bandOffsetByPlOrBd: Object.fromEntries(stageName.map((x, i) => [x, count(ok, (r) => r.ddBand && !r.p3 && r.highest === i)]))
    },
    ddDistribution: { postScreenCTRL: dist(postRows('CTRL').map((r) => r.dd)), postScreenEXP30: dist(postRows('EXP30').map((r) => r.dd)), p3OnlyPlausible: dist(ok.filter((r) => r.p3 && !r.p0).map((r) => r.dd)) },
    givebackLowerBoundShare: {
      note: 'max(0, DD − banked DD marked) ÷ DD: a lower bound on the unbanked-giveback share U ÷ DD of each centre’s maximum-DD window (PROTOCOL §3.4)',
      scope: lbShare(ok),
      p3OnlyPlausible: lbShare(ok.filter((r) => r.p3 && !r.p0)),
      ddBand: lbShare(ok.filter((r) => r.ddBand)),
      bothPlausible: lbShare(ok.filter((r) => r.p0 && r.p3)),
      provablyGivebackDominated: { scope: count(ok, (r) => r.dd > 0 && (r.givebackLowerBound ?? 0) >= 0.5 * r.dd), both: count(ok, (r) => r.p0 && r.p3 && r.dd > 0 && (r.givebackLowerBound ?? 0) >= 0.5 * r.dd), p3Only: count(ok, (r) => r.p3 && !r.p0 && (r.givebackLowerBound ?? 0) >= 0.5 * r.dd), ddBand: count(ok, (r) => r.ddBand && (r.givebackLowerBound ?? 0) >= 0.5 * r.dd) }
    },
    rungFits: rungTable,
    finalists
  };

  writeJson(path.join(resultsDir, 'census', `census-${cut}.json`), summary);
  writeCsv(
    path.join(resultsDir, 'census', `centres-${cut}.csv.gz`),
    rows.map((r) => ({ ...r, highest: stageName[r.highest] })),
    ['id', 'cell', 'origin', 'postScreenBy', 'screen', 'highest', 'reason', 'ok', 'net', 'dd', 'plLiq', 'bdLiq', 'bdMarked', 'givebackLowerBound', 'p0', 'p3', 'failP3', 'bindingP3', 'ddBand', 'lots', 'occupancy'],
    true
  );
  writeCsv(
    path.join(resultsDir, 'census', `rungs-${cut}.csv.gz`),
    rungs.map((r) => ({
      id: r.id,
      rung: r.rung,
      n: r.n,
      unique: r.unique,
      failed: r.failed,
      fittedBy: r.by.join('+'),
      feasibleCTRL: r.feasible.CTRL,
      feasibleEXP30: r.feasible.EXP30,
      violationCTRL: r.violation.CTRL,
      violationEXP30: r.violation.EXP30,
      p90DdCents: r.p90DdCents,
      p90DdUnrounded: r.env.markedDd.p90,
      p90PlLiq: r.env.principalLoss.liquidation.p90,
      p90BdLiq: r.env.bankedDd.liquidation.p90,
      breachDd35: r.breach.dd35,
      breachDd40: r.breach.dd40,
      breachPl25: r.breach.pl25,
      breachBd30: r.breach.bd30,
      givebackLowerBoundMedian: r.givebackLowerBound.median
    })),
    undefined,
    true
  );
  return summary;
};

// ---------------------------------------------------------------- confirmation draws (zero evaluations)
type Draw = { error?: string; net: number; dd: number; plL: number; plM: number; bdL: number; bdM: number };
const drawsOf = (cut: CutoffKey) => {
  const qrep = readJsonGz<{ members: { id: string; label: string; confirm: { draws: Draw[] } }[]; reproduction: Record<string, unknown>; zeroEvaluations: Record<string, number>; archive: Record<string, unknown> }>(path.join(cacheRoot, `qualification-${cut}.json.gz`));
  const sel = readSealed<{ laneValues: Record<ArmKey, LaneValue[]> }>(selectionFile(cut));
  const byId = new Map(qrep.members.map((m) => [m.id, m]));
  const perArm = Object.fromEntries(
    armKeys.map((a) => {
      const reps = sel.laneValues[a].filter((v) => v.representative).map((v) => byId.get(v.representative!.id)!);
      const draws = reps.flatMap((m) => m.confirm.draws.filter((d) => !d.error));
      const failed = reps.reduce((s, m) => s + m.confirm.draws.filter((d) => d.error).length, 0);
      const over35 = draws.filter((d) => d.dd > K35);
      const lb = (d: Draw) => Math.max(0, d.dd - d.bdM);

      return [
        a,
        {
          representatives: reps.length,
          draws: draws.length,
          failedDraws: failed,
          ddOver35: over35.length,
          ddOver35Wilson: wilson(over35.length, draws.length),
          ddOver40: draws.filter((d) => d.dd > K40).length,
          over35ProvablyGivebackDominated: over35.filter((d) => lb(d) >= 0.5 * d.dd).length,
          over35GivebackLowerBound: dist(over35.map(lb)),
          over35GivebackLowerBoundShare: dist(over35.map((d) => lb(d) / d.dd)),
          over35BankedDdMarked: dist(over35.map((d) => d.bdM)),
          over35BankedDdLiq: dist(over35.map((d) => d.bdL)),
          over35PrincipalLossLiq: dist(over35.map((d) => d.plL)),
          over35Net: dist(over35.map((d) => d.net)),
          allGivebackLowerBoundShare: dist(draws.filter((d) => d.dd > 0).map((d) => lb(d) / d.dd)),
          allProvablyGivebackDominated: draws.filter((d) => d.dd > 0 && lb(d) >= 0.5 * d.dd).length,
          dd: dist(draws.map((d) => d.dd)),
          bdLiq: dist(draws.map((d) => d.bdL)),
          plLiq: dist(draws.map((d) => d.plL)),
          bdOver30: draws.filter((d) => d.bdL > 30_000).length,
          plOver25: draws.filter((d) => d.plL > 25_000).length,
          // per representative: its confirmation p90 DD and the p90 of its giveback lower bound
          perRepresentative: reps.map((m) => {
            const ds = m.confirm.draws.filter((d) => !d.error);

            return { id: m.id, label: m.label, p90Dd: quantile(sortN(ds.map((d) => d.dd)), 0.9), p90GivebackLowerBound: quantile(sortN(ds.map(lb)), 0.9), p90BdMarked: quantile(sortN(ds.map((d) => d.bdM)), 0.9), over35: ds.filter((d) => d.dd > K35).length };
          })
        }
      ];
    })
  ) as unknown as Record<ArmKey, Record<string, unknown> & { perRepresentative: { id: string; p90Dd: number; p90GivebackLowerBound: number; p90BdMarked: number; over35: number }[] }>;
  // paired, per (cell, replicate): the representatives' confirmation-family quantiles (zero evaluations)
  const selP = readSealed<{ pairs: Pair[] }>(selectionFile(cut)).pairs.filter((p) => !p.zeroLane);
  const repStat = (a: ArmKey, cell: string, r: number) => {
    const v = sel.laneValues[a].find((x) => x.cell === cell && x.replicate === r)!;
    const m = byId.get(v.representative!.id)!;
    const ds = m.confirm.draws.filter((d) => !d.error);
    const lb = (d: Draw) => Math.max(0, d.dd - d.bdM);

    return {
      p90Dd: quantile(sortN(ds.map((d) => d.dd)), 0.9),
      p90GivebackLowerBound: quantile(sortN(ds.map(lb)), 0.9),
      p90BdMarked: quantile(sortN(ds.map((d) => d.bdM)), 0.9),
      p90PlLiq: quantile(sortN(ds.map((d) => d.plL)), 0.9),
      over35: ds.filter((d) => d.dd > K35).length,
      over35Bound: ds.filter((d) => d.dd > K35).reduce((s2, d) => s2 + lb(d), 0),
      over35BdMarked: ds.filter((d) => d.dd > K35).reduce((s2, d) => s2 + d.bdM, 0)
    };
  };
  const pairedDraws = Object.fromEntries(
    (['p90Dd', 'p90GivebackLowerBound', 'p90BdMarked', 'p90PlLiq', 'over35'] as const).map((k) => {
      const ps = selP.map((p) => {
        const c = repStat('CTRL', p.cell, p.replicate)[k];
        const e = repStat('EXP30', p.cell, p.replicate)[k];

        return { ...p, ctrl: c, exp: e, d: e - c };
      });

      return [k, { ...summarize(ps, (p) => p.d, 0.1, ['giveback-draws', k, cut]), meanCtrl: mean(ps.map((p) => p.ctrl)), meanExp30: mean(ps.map((p) => p.exp)) }];
    })
  );
  const out = { cutoff: cut, archive: qrep.archive, reproduction: qrep.reproduction, zeroEvaluations: qrep.zeroEvaluations, members: qrep.members.length, perArm, pairedDraws };

  writeJson(path.join(resultsDir, 'qualification', `draws-${cut}.json`), out);
  return out;
};

// ---------------------------------------------------------------- giveback (paired)
type GRow = Record<string, unknown> & { id: string; label: string; dd: number; net: number; unbankedGiveback: number; bankedErosion: number; capitalLoss: number; givebackDominated: boolean; passesP0: boolean; passesP3: boolean; givebackLowerBound: number; kind: string; window: { peakDate: string; troughDate: string } | null; liquidation: Record<string, number> };
const pairedMetrics = [
  'net',
  'dd',
  'ddLiquidation',
  'unbankedGiveback',
  'bankedErosion',
  'capitalLoss',
  'erosionPlusCapitalLoss',
  'unbankedGivebackShare',
  'givebackLowerBound',
  'lotProfitGiveback',
  'lotPrincipalLoss',
  'bankedDdMarked',
  'bankedDdLiquidation',
  'principalLossLiquidation',
  'maxTradeGivebackAboveBreakeven',
  'maxTradePeakProfit',
  'worstTradeNet',
  'windowGivebackClosedProfitable',
  'windowGivebackClosedLoss',
  'windowPrincipalLossClosedLoss',
  'occupancy',
  'lots',
  'liq.unbankedGiveback',
  'liq.bankedErosion',
  'liq.capitalLoss'
] as const;
const valueOf = (r: GRow, k: string): number | null => {
  const v = k.startsWith('liq.') ? (r.liquidation as Record<string, number>)[k.slice(4)] : (r as Record<string, unknown>)[k];

  return typeof v === 'number' && Number.isFinite(v) ? v : null;
};

const givebackOf = (cut: CutoffKey) => {
  const file = path.join(resultsDir, 'giveback', `giveback-${cut}.json`);

  if (!fs.existsSync(file)) return null;

  const g = readJson<{ subjects: GRow[]; pairs: Pair[]; lanes: Record<ArmKey, { lane: string; cell: string; replicate: number; value: number; representative: { id: string; label: string } | null }[]>; pooledPrimaries: Record<ArmKey, Record<string, string>>; cpuEqualsGpu: Record<string, unknown> }>(file);
  const full = readJsonGz<{ rows: { key: string; ext: { trades: { id: number; reason: string; net: number; open: boolean }[]; window: { peakDate: string; troughDate: string; rows: { lot: number; book: string; entry: string; exit: string | null; role: string; atPeak: number; atTrough: number; contribution: number; profitGiveback: number; principalLoss: number; lotNet: number | null }[] } | null; d3: { marked: { window: { peakValue: number; troughValue: number; bankedHigh: number } | null } } } }[] }>(path.join(cacheRoot, `giveback-${cut}.json.gz`));
  const fullById = new Map(full.rows.map((r) => [r.key, r]));
  const q = readSealed<{ evidence: Evidence[] }>(qualificationFile(cut));
  const ev = new Map(q.evidence.map((e) => [e.id, e]));
  const byId = new Map(g.subjects.map((s) => [s.id, s]));
  const repOf = (a: ArmKey, cell: string, rep: number) => {
    const l = g.lanes[a].find((x) => x.cell === cell && x.replicate === rep)!;

    return l.representative ? byId.get(l.representative.id)! : null;
  };
  const pairs = g.pairs.filter((p) => !p.zeroLane).map((p) => ({ p, c: repOf('CTRL', p.cell, p.replicate)!, e: repOf('EXP30', p.cell, p.replicate)! }));
  const paired = Object.fromEntries(
    pairedMetrics.map((k) => {
      const ps: Pair[] = [];

      for (const x of pairs) {
        const c = valueOf(x.c, k);
        const e = valueOf(x.e, k);

        if (c !== null && e !== null) ps.push({ ...x.p, ctrl: c, exp: e, d: e - c });
      }
      return [k, ps.length ? { ...summarize(ps, (p) => p.d, 0.1, ['giveback', k, cut]), ctrl: dist(ps.map((p) => p.ctrl)), exp30: dist(ps.map((p) => p.exp)), meanCtrl: mean(ps.map((p) => p.ctrl)), meanExp30: mean(ps.map((p) => p.exp)) } : null];
    })
  );
  // the identity: mean ΔDD = mean ΔU + mean ΔE + mean ΔF (arm-level component magnitudes; different episodes)
  const m = (k: string) => (paired[k] as { mean: number } | null)?.mean ?? NaN;
  const identity = { meanDeltaDd: m('dd'), meanDeltaU: m('unbankedGiveback'), meanDeltaE: m('bankedErosion'), meanDeltaF: m('capitalLoss'), residual: m('dd') - (m('unbankedGiveback') + m('bankedErosion') + m('capitalLoss')) };
  const armRows = (a: ArmKey) => pairs.map((x) => (a === 'CTRL' ? x.c : x.e));
  const componentShares = (xs: GRow[]) => {
    const dd = xs.reduce((s, r) => s + r.dd, 0);

    return { sumDd: dd, U: xs.reduce((s, r) => s + r.unbankedGiveback, 0) / dd, E: xs.reduce((s, r) => s + r.bankedErosion, 0) / dd, F: xs.reduce((s, r) => s + r.capitalLoss, 0) / dd };
  };
  const arm = Object.fromEntries(
    armKeys.map((a) => {
      const xs = armRows(a);

      return [
        a,
        {
          representatives: xs.length,
          givebackDominated: xs.filter((r) => r.givebackDominated).length,
          givebackDominatedWilson: wilson(xs.filter((r) => r.givebackDominated).length, xs.length),
          capitalLossPositive: xs.filter((r) => r.capitalLoss > 0).length,
          componentSharesOfSummedDd: componentShares(xs),
          passesP0: xs.filter((r) => r.passesP0).length,
          passesP3: xs.filter((r) => r.passesP3).length,
          // diag-core's row values are cent-rounded separately (U, DD, BD): the bound is checked to two cents
          boundHolds: xs.filter((r) => r.unbankedGiveback >= r.givebackLowerBound - 0.02).length,
          boundGapMax: Math.max(0, ...xs.map((r) => r.givebackLowerBound - r.unbankedGiveback))
        }
      ];
    })
  );
  // the EXP-30 representatives P0 would reject (Stage B §5: sealed verdicts) and their paired CTRL representatives
  const rejected = pairs.filter((x) => !ev.get(x.e.id)!.arms.CTRL.qualified);
  const sub = (xs: typeof pairs) => ({
    pairs: xs.length,
    exp30: { dd: dist(xs.map((x) => x.e.dd)), U: dist(xs.map((x) => x.e.unbankedGiveback)), E: dist(xs.map((x) => x.e.bankedErosion)), F: dist(xs.map((x) => x.e.capitalLoss)), shares: xs.length ? componentShares(xs.map((x) => x.e)) : null, givebackDominated: xs.filter((x) => x.e.givebackDominated).length },
    ctrl: { dd: dist(xs.map((x) => x.c.dd)), U: dist(xs.map((x) => x.c.unbankedGiveback)), E: dist(xs.map((x) => x.c.bankedErosion)), F: dist(xs.map((x) => x.c.capitalLoss)), shares: xs.length ? componentShares(xs.map((x) => x.c)) : null, givebackDominated: xs.filter((x) => x.c.givebackDominated).length },
    meanDelta: xs.length ? { dd: mean(xs.map((x) => x.e.dd - x.c.dd)), U: mean(xs.map((x) => x.e.unbankedGiveback - x.c.unbankedGiveback)), E: mean(xs.map((x) => x.e.bankedErosion - x.c.bankedErosion)), F: mean(xs.map((x) => x.e.capitalLoss - x.c.capitalLoss)), net: mean(xs.map((x) => x.e.net - x.c.net)) } : null,
    labels: xs.map((x) => ({ cell: x.p.cell, replicate: x.p.replicate, exp30: x.e.label, ctrl: x.c.label }))
  });
  const rest = pairs.filter((x) => ev.get(x.e.id)!.arms.CTRL.qualified);
  // episode illustrations: the pooled P0 primaries, and the pair with the largest ΔDD
  const episode = (r: GRow) => {
    const f = fullById.get(r.id)!;
    const w = f.ext.window;
    const wd = f.ext.d3.marked.window;

    return {
      label: r.label,
      net: r.net,
      dd: r.dd,
      U: r.unbankedGiveback,
      E: r.bankedErosion,
      F: r.capitalLoss,
      window: w ? { peakDate: w.peakDate, troughDate: w.troughDate, peakNet: wd?.peakValue, troughNet: wd?.troughValue, bankedHigh: wd?.bankedHigh } : null,
      topLots: w ? [...w.rows].sort((a, b) => b.contribution - a.contribution).slice(0, 4).map((x) => ({ book: x.book, entry: x.entry, exit: x.exit, role: x.role, atPeak: x.atPeak, atTrough: x.atTrough, profitGiveback: x.profitGiveback, principalLoss: x.principalLoss, lotNet: x.lotNet })) : []
    };
  };
  const primaries = Object.fromEntries(armKeys.map((a) => [a, g.subjects.find((s) => s.label === g.pooledPrimaries[a].P0)!]));
  const maxDelta = [...pairs].sort((a, b) => b.e.dd - b.c.dd - (a.e.dd - a.c.dd))[0]!;
  // the lots of each representative's maximum-DD window, by their recorded exit reason and outcome (lot lens)
  const byReason = (a: ArmKey) => {
    const o: Record<string, { lots: number; giveback: number; principalLoss: number; givebackLotsClosedProfitable: number; principalLossLotsClosedLoss: number }> = {};

    for (const r of armRows(a)) {
      const f = fullById.get(r.id)!;
      const reason = new Map(f.ext.trades.map((t) => [t.id, t.reason]));

      for (const w of f.ext.window?.rows ?? []) {
        const k = reason.get(w.lot) ?? 'unknown';
        const x = (o[k] ??= { lots: 0, giveback: 0, principalLoss: 0, givebackLotsClosedProfitable: 0, principalLossLotsClosedLoss: 0 });

        x.lots++;
        x.giveback += Math.max(0, w.profitGiveback);
        x.principalLoss += Math.max(0, w.principalLoss);
        if (w.profitGiveback > 0 && w.exit !== null && (w.lotNet ?? 0) > 0) x.givebackLotsClosedProfitable++;
        if (w.principalLoss > 0 && w.exit !== null && (w.lotNet ?? 0) <= 0) x.principalLossLotsClosedLoss++;
      }
    }
    return o;
  };
  const windowByExitReason = Object.fromEntries(armKeys.map((a) => [a, byReason(a)]));
  const out = {
    cutoff: cut,
    cpuEqualsGpu: g.cpuEqualsGpu,
    windowByExitReason,
    pairs: pairs.length,
    paired,
    identity,
    arm,
    p0RejectedExp30: sub(rejected),
    otherPairs: sub(rest),
    illustrations: {
      pooledP0Primaries: { CTRL: episode(primaries.CTRL!), EXP30: episode(primaries.EXP30!) },
      largestPairedDdIncrease: { cell: maxDelta.p.cell, replicate: maxDelta.p.replicate, CTRL: episode(maxDelta.c), EXP30: episode(maxDelta.e) }
    },
    benchmarks: g.subjects.filter((s) => s.kind === 'benchmark').map((s) => ({ label: s.label, net: s.net, dd: s.dd, U: s.unbankedGiveback, E: s.bankedErosion, F: s.capitalLoss, givebackDominated: s.givebackDominated, bdLiq: s.bankedDdLiquidation as number, plLiq: s.principalLossLiquidation as number, window: s.window })),
    winnersVsLosers: Object.fromEntries(
      armKeys.map((a) => {
        const xs = armRows(a);
        const sum = (k: string) => xs.reduce((s, r) => s + ((r as Record<string, number>)[k] ?? 0), 0);

        return [a, { windowGivebackClosedProfitable: sum('windowGivebackClosedProfitable'), windowGivebackClosedLoss: sum('windowGivebackClosedLoss'), windowGivebackOpenAtEnd: sum('windowGivebackOpenAtEnd'), windowPrincipalLossClosedLoss: sum('windowPrincipalLossClosedLoss'), lotProfitGiveback: sum('lotProfitGiveback'), lotPrincipalLoss: sum('lotPrincipalLoss'), tradesWithGiveback: sum('tradesWithGiveback'), tradesGivebackEndedProfitable: sum('tradesGivebackEndedProfitable'), tradesGivebackEndedLoss: sum('tradesGivebackEndedLoss'), tradesLosing: sum('tradesLosing'), lots: sum('lots') }];
      })
    )
  };

  writeJson(path.join(resultsDir, 'giveback', `paired-${cut}.json`), out);
  writeCsv(
    path.join(resultsDir, 'giveback', `subjects-${cut}.csv`),
    g.subjects.map((s) => ({ ...s, roles: undefined, envelope: undefined, liquidation: undefined, window: undefined, bankedEpisode: undefined, byBook: undefined, windowPeak: s.window?.peakDate ?? null, windowTrough: s.window?.troughDate ?? null, liqU: s.liquidation.unbankedGiveback, liqE: s.liquidation.bankedErosion, liqF: s.liquidation.capitalLoss }))
  );
  writeCsv(
    path.join(resultsDir, 'giveback', `pairs-${cut}.csv`),
    pairs.map((x) => ({ cell: x.p.cell, replicate: x.p.replicate, ctrl: x.c.label, exp30: x.e.label, exp30RejectedByP0: !ev.get(x.e.id)!.arms.CTRL.qualified, ...Object.fromEntries(pairedMetrics.flatMap((k) => [[`ctrl.${k}`, valueOf(x.c, k)], [`exp30.${k}`, valueOf(x.e, k)]])) }))
  );
  return out;
};

// ---------------------------------------------------------------- run + tables
const census: Record<string, ReturnType<typeof censusOf>> = {};
const draws: Record<string, ReturnType<typeof drawsOf>> = {};
const giveback: Record<string, NonNullable<ReturnType<typeof givebackOf>>> = {};

for (const c of cuts) {
  census[c] = censusOf(c);
  if (fs.existsSync(path.join(cacheRoot, `qualification-${c}.json.gz`))) draws[c] = drawsOf(c);

  const g = givebackOf(c);

  if (g) giveback[c] = g;
  console.log(`[${utc()}] analysed ${c}`);
}

const L: string[] = [];
const T = (header: string[], rows: (string | number)[][]) => {
  L.push(`| ${header.join(' | ')} |`, `|${header.map((h, i) => (i === 0 ? '---' : '---:')).join('|')}|`, ...rows.map((r) => `| ${r.join(' | ')} |`), '');
};

L.push('# RES-BD 1.0.0 — generated tables (tools/vg-l0-risk-envelope-stage-b-diagnostics/analyze.ts; zero-evaluation archive replays and the bounded CPU replays)', '', `Generated ${utc()}. Report-only; never official Stage B evidence. Cutoffs: ${cuts.join(', ')}.`, '');

L.push('## A1. Census replay and zero-evaluation evidence', '');
T(
  ['Cutoff', 'Archive rows', 'Lanes = sealed', 'Requested CTRL / EXP30 (replayed = sealed)', 'Lane archive hits', 'Neighbourhood reads', 'Fresh', 'Pool calls', 'Rows open → close', 'Original sha256 unchanged'],
  cuts.map((c) => {
    const s = census[c]!;

    return [c, n0(s.archive.rows), `${s.replay.lanes}/64 ${s.replay.identicalToSealed ? 'yes' : 'NO'}`, `${n0(s.replay.requestedByArm.CTRL)} / ${n0(s.replay.requestedByArm.EXP30)}`, n0(s.zeroEvaluations.laneArchiveHits), n0(s.zeroEvaluations.neighbourhoodReads), s.zeroEvaluations.fresh, s.zeroEvaluations.refusingPoolCalls, `${n0(s.zeroEvaluations.rowsAtOpen)} → ${n0(s.zeroEvaluations.rowsAtClose)}`, s.originalSha256AtEnd === s.archive.sha256 ? 'yes' : 'NO'];
  })
);

L.push('## A2. Centres visited (unique by canonical identity)', '');
T(
  ['Cutoff', 'Unique centres', 'Requested by CTRL only / EXP30 only / both', 'Error', 'Family unfunded', 'Net ≤ 0', 'Scope (profitable, funded)', 'Scope by origin CTRL / EXP30 / both', 'Scope by highest stage (screen / r1 / refine / r2 / r3 / shortlist)'],
  cuts.map((c) => {
    const s = census[c]!.centres;
    const h = s.scopeByHighestStage as Record<string, number>;

    return [c, n0(s.unique), `${n0(s.byOrigin.CTRL)} / ${n0(s.byOrigin.EXP30)} / ${n0(s.byOrigin.both)}`, n0(s.reasons.error!), n0(s.reasons['a family unfunded']!), n0(s.reasons['net ≤ 0']!), n0(s.scope), `${n0(s.scopeByOrigin.CTRL)} / ${n0(s.scopeByOrigin.EXP30)} / ${n0(s.scopeByOrigin.both)}`, stageName.map((x) => n0(h[x]!)).join(' / ')];
  })
);

L.push('## A3. Centre plausibility under both policies on the identical candidate set (scope)', '', 'P0 = !error ∧ net > 0 ∧ DD ≤ $35k ∧ both families funded; P3 = the same with DD ≤ $40k ∧ PL (liq.) ≤ $25k ∧ BD (liq.) ≤ $30k. **Centre plausibility is not qualification.**', '');
for (const c of cuts) {
  const s = census[c]!.centrePlausibility;
  const row = (name: string, o: { n: number; both: number; p0Only: number; p3Only: number; neither: number }) => [name, n0(o.n), n0(o.both), n0(o.p0Only), n0(o.p3Only), n0(o.neither)];

  L.push(`**${c}**`, '');
  T(['Population', 'Centres', 'Both', 'P0 only', 'P3 only', 'Neither'], [
    row('all (scope)', s.all),
    row('requested by CTRL only', s.byOrigin.CTRL),
    row('requested by EXP30 only', s.byOrigin.EXP30),
    row('requested by both', s.byOrigin.both),
    row('screen proposals (identical in both arms: pure eligibility)', s.screenProposals),
    row('post-screen centres requested by CTRL lanes', s.postScreenByArm.CTRL),
    row('post-screen centres requested by EXP30 lanes', s.postScreenByArm.EXP30),
    ...stageName.map((x) => row(`highest stage: ${x}`, (s.byHighestStage as Record<string, { n: number; both: number; p0Only: number; p3Only: number; neither: number }>)[x]!))
  ]);
}

L.push('## A4. Limits, the ($35k, $40k] band and P0-pass-P3-fail (scope centres)', '');
T(
  ['Cutoff', 'DD > $35k', 'DD > $40k', 'PL > $25k', 'BD > $30k', 'Band centres', 'Band admitted by P3', 'Band offset by PL / BD', 'P0 pass ∧ P3 fail (by BD / by PL)', 'P3 binding metric among P3 failures (DD / PL / BD)'],
  cuts.map((c) => {
    const s = census[c]!;
    const b = s.ddBand35to40.all;
    const bind = s.limits.p3Binding;

    return [c, n0(s.limits.ddOver35), n0(s.limits.ddOver40), n0(s.limits.plOver25), n0(s.limits.bdOver30), n0(b.centres), n0(b.admittedByP3), `${n0(b.offsetByPlOrBd)} (PL ${b.offsetByPl}, BD ${b.offsetByBd})`, `${n0(s.p0PassP3Fail.centres)} (${s.p0PassP3Fail.byBankedDd} / ${s.p0PassP3Fail.byPrincipalLoss})`, `${n0(bind.markedDd ?? 0)} / ${n0(bind.principalLoss ?? 0)} / ${n0(bind.bankedDd ?? 0)}`];
  })
);
for (const c of cuts) {
  const s = census[c]!;

  L.push(`${c} P3 failing combinations (scope centres failing P3): ${Object.entries(s.limits.p3FailCombos).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k || '—'} ${n0(v)}`).join('; ')}. Band by origin: CTRL ${s.ddBand35to40.byOrigin.CTRL.centres}, EXP30 ${s.ddBand35to40.byOrigin.EXP30.centres}, both ${s.ddBand35to40.byOrigin.both.centres}; screen ${s.ddBand35to40.screen.centres}; post-screen CTRL ${s.ddBand35to40.postScreenCTRL.centres} / EXP30 ${s.ddBand35to40.postScreenEXP30.centres}.`, '');
}

L.push('## A5. Centre net on the common population (centre plausibility, not qualified finalists)', '');
T(
  ['Cutoff', 'Population', 'n', 'median', 'p90', 'p99', 'max', 'top-10 mean'],
  cuts.flatMap((c) => {
    const d = census[c]!.netDistribution as Record<string, ReturnType<typeof dist>>;

    return (['p0Plausible', 'p3Plausible', 'bothPlausible', 'p3OnlyPlausible', 'p0PassP3Fail', 'bandAdmittedByP3', 'bandOffsetByPlOrBd', 'postScreenCTRL_p0', 'postScreenEXP30_p0', 'postScreenEXP30_p3'] as const).map((k) => {
      const x = d[k] as { n: number; median?: number; p90?: number; p99?: number; max?: number; top10Mean?: number };

      return [c, k, n0(x.n), fmt$(x.median), fmt$(x.p90), fmt$(x.p99), fmt$(x.max), fmt$(x.top10Mean)];
    });
  })
);
T(
  ['Cutoff', 'Finalists (192 searched members): both / P0 only / P3 only / neither', 'by origin CTRL', 'by origin EXP30', 'best qualified centre net P0 / P3'],
  cuts.map((c) => {
    const f = census[c]!.finalists;
    const o = (x: { members: number; both: number; p0Only: number; p3Only: number; neither: number }) => `${x.members}: ${x.both} / ${x.p0Only} / ${x.p3Only} / ${x.neither}`;

    return [c, `${f.both} / ${f.p0Only} / ${f.p3Only} / ${f.neither}`, o(f.byOrigin.CTRL!), o(f.byOrigin.EXP30!), `${fmt$(f.bestQualifiedCentreNet.P0)} / ${fmt$(f.bestQualifiedCentreNet.P3)}`];
  })
);

L.push('## A6. Rung fits under both policies (centre + measured neighbourhood p90 gates; frozen violationArm)', '');
T(
  ['Cutoff', 'Rung (draws)', 'Measured fits', 'Fitted by CTRL / EXP30 / both', 'Feasible both', 'CTRL only', 'EXP30 only', 'Neither', 'EXP30-only: CTRL failing parts', 'EXP30-only with p90 DD in ($35k, $40k]', 'EXP30 infeasible: failing parts'],
  cuts.flatMap((c) =>
    census[c]!.rungFits.map((r) => [c, `${r.rung} (${r.n})`, n0(r.measured), `${r.fittedBy.CTRL} / ${r.fittedBy.EXP30} / ${r.fittedBy.both}`, n0(r.feasible.both), n0(r.feasible.ctrlOnly), n0(r.feasible.exp30Only), n0(r.feasible.neither), Object.entries(r.exp30OnlyCtrlFailingParts).map(([k, v]) => `${k} ${v}`).join(', ') || '—', n0(r.exp30OnlyP90DdBand), Object.entries(r.exp30InfeasibleParts).map(([k, v]) => `${k} ${v}`).join(', ') || '—'])
  )
);

L.push('## A7. Zero-evaluation giveback bound on centres: max(0, DD − BD_marked) ÷ DD ≤ U ÷ DD', '');
T(
  ['Cutoff', 'Population', 'n', 'mean bound share', 'median', 'provably giveback-dominated (bound ≥ ½ DD)'],
  cuts.flatMap((c) => {
    const s = census[c]!.givebackLowerBoundShare;
    const r = (k: 'scope' | 'bothPlausible' | 'p3OnlyPlausible' | 'ddBand', name: string, dom: number) => {
      const x = s[k] as { n: number; mean?: number; median?: number };

      return [c, name, n0(x.n), pct(x.mean), pct(x.median), share(dom, x.n)];
    };

    return [r('scope', 'all scope', s.provablyGivebackDominated.scope), r('bothPlausible', 'plausible under both', s.provablyGivebackDominated.both), r('p3OnlyPlausible', 'P3-only plausible', s.provablyGivebackDominated.p3Only), r('ddBand', 'DD in ($35k, $40k]', s.provablyGivebackDominated.ddBand)];
  })
);

if (Object.keys(draws).length) {
  L.push('## A8. Representatives’ confirmation draws (zero evaluations; 3 × 128 per representative, sealed draws)', '');
  T(
    ['Cutoff', 'Arm', 'Draws', '> $35k DD', 'of which bound ≥ ½ DD', 'mean bound share among > $35k', 'mean BD_marked among > $35k', 'mean PL (liq.) among > $35k', 'BD (liq.) > $30k', 'PL (liq.) > $25k'],
    Object.keys(draws).flatMap((c) =>
      armKeys.map((a) => {
        const x = draws[c]!.perArm[a] as unknown as { draws: number; ddOver35: number; over35ProvablyGivebackDominated: number; over35GivebackLowerBoundShare: { mean?: number }; over35BankedDdMarked: { mean?: number }; over35PrincipalLossLiq: { mean?: number }; bdOver30: number; plOver25: number };

        return [c, a, n0(x.draws), share(x.ddOver35, x.draws), share(x.over35ProvablyGivebackDominated, x.ddOver35), pct(x.over35GivebackLowerBoundShare.mean), fmt$(x.over35BankedDdMarked.mean), fmt$(x.over35PrincipalLossLiq.mean), n0(x.bdOver30), n0(x.plOver25)];
      })
    )
  );
}

if (Object.keys(draws).length) {
  L.push('## A9. Paired representatives’ confirmation families (EXP-30 − CTRL; 32 pairs; zero evaluations; stratified paired bootstrap, 80 % interval)', '', 'Quantiles do not add: the p90 of the bound and the p90 of BD are reported beside the p90 DD, not as its parts.', '');
  T(
    ['Cutoff', 'Statistic', 'CTRL mean', 'EXP-30 mean', 'Mean diff', '80 % interval', 'Diff > 0 / < 0'],
    Object.keys(draws).flatMap((c) =>
      Object.entries((draws[c] as unknown as { pairedDraws: Record<string, { meanCtrl: number; meanExp30: number; mean: number; ci80: [number, number]; signs: { positive: number; negative: number } }> }).pairedDraws).map(([k, p]) => {
        const money = k !== 'over35';
        const f = (x: number) => (money ? fmt$(x) : x.toFixed(1));
        const g = (x: number) => (money ? fmtS(x) : `${x > 0 ? '+' : ''}${x.toFixed(1)}`);

        return [c, k, f(p.meanCtrl), f(p.meanExp30), g(p.mean), `${g(p.ci80[0])} … ${g(p.ci80[1])}`, `${p.signs.positive} / ${p.signs.negative}`];
      })
    )
  );
}

if (Object.keys(giveback).length) {
  L.push('## B1. Parity of the CPU replays', '');
  T(['Cutoff', 'Subjects', 'To the cent (net, DD, 4 envelope values)', 'Bit for bit (canonical record + envelope)'], Object.keys(giveback).map((c) => [c, String(giveback[c]!.cpuEqualsGpu.subjects), String(giveback[c]!.cpuEqualsGpu.toTheCent), String(giveback[c]!.cpuEqualsGpu.bitForBit)]));
  L.push('## B2. Paired representatives (EXP-30 − CTRL; 32 pairs; stratified paired bootstrap, B = 100,000; 80 % interval)', '');
  T(
    ['Cutoff', 'Metric', 'CTRL mean', 'EXP-30 mean', 'Mean diff', '80 % interval', 'Diff > 0 / < 0', 'CTRL median', 'EXP-30 median'],
    Object.keys(giveback).flatMap((c) =>
      pairedMetrics.map((k) => {
        const p = giveback[c]!.paired[k] as { mean: number; ci80: [number, number]; signs: { positive: number; negative: number }; meanCtrl: number; meanExp30: number; ctrl: { median?: number }; exp30: { median?: number } } | null;
        const money = !['unbankedGivebackShare', 'occupancy', 'lots'].includes(k);
        const f = (x: number | null | undefined) => (money ? fmt$(x) : k === 'lots' ? (x ?? NaN).toFixed(1) : pct(x));
        const fs2 = (x: number | null | undefined) => (money ? fmtS(x) : k === 'lots' ? (x ?? NaN).toFixed(1) : `${(100 * (x ?? NaN)).toFixed(1)} pp`);

        return p ? [c, k, f(p.meanCtrl), f(p.meanExp30), fs2(p.mean), `${fs2(p.ci80[0])} … ${fs2(p.ci80[1])}`, `${p.signs.positive} / ${p.signs.negative}`, f(p.ctrl.median), f(p.exp30.median)] : [c, k, '—', '—', '—', '—', '—', '—', '—'];
      })
    )
  );
  L.push('## B3. Arm-level decomposition of the representatives’ maximum drawdowns (shares of the summed DD; giveback-dominated = U ≥ ½ DD)', '');
  T(
    ['Cutoff', 'Arm', 'Summed DD', 'U share', 'E share', 'F share', 'Giveback-dominated', 'F > 0', 'Bound U ≥ DD − BD_marked holds (to 2 cents)'],
    Object.keys(giveback).flatMap((c) =>
      armKeys.map((a) => {
        const x = giveback[c]!.arm[a] as { representatives: number; givebackDominated: number; capitalLossPositive: number; componentSharesOfSummedDd: { sumDd: number; U: number; E: number; F: number }; boundHolds: number };

        return [c, a, fmt$(x.componentSharesOfSummedDd.sumDd), pct(x.componentSharesOfSummedDd.U), pct(x.componentSharesOfSummedDd.E), pct(x.componentSharesOfSummedDd.F), `${x.givebackDominated} / ${x.representatives}`, `${x.capitalLossPositive} / ${x.representatives}`, `${x.boundHolds} / ${x.representatives}`];
      })
    )
  );
  L.push('## B4. Identity of the mean paired DD increase (arm-level magnitudes of different episodes, not one shared episode)', '', 'The residual is cent rounding: diag-core rounds DD, U, E and F to cents separately.', '');
  T(['Cutoff', 'Mean ΔDD', 'Mean ΔU', 'Mean ΔE', 'Mean ΔF', 'Residual'], Object.keys(giveback).map((c) => {
    const i = giveback[c]!.identity;

    return [c, fmtS(i.meanDeltaDd), fmtS(i.meanDeltaU), fmtS(i.meanDeltaE), fmtS(i.meanDeltaF), i.residual.toExponential(2)];
  }));
  L.push('## B5. EXP-30 representatives that P0 would reject (sealed verdicts) versus the other pairs', '');
  T(
    ['Cutoff', 'Subset', 'Pairs', 'EXP-30 mean DD', 'EXP-30 U / E / F shares', 'EXP-30 giveback-dominated', 'CTRL mean DD', 'CTRL U / E / F shares', 'Mean ΔDD', 'Mean ΔU / ΔE / ΔF', 'Mean Δnet'],
    Object.keys(giveback).flatMap((c) =>
      (['p0RejectedExp30', 'otherPairs'] as const).map((k) => {
        const s = giveback[c]![k];
        const sh = (x: { U: number; E: number; F: number } | null) => (x ? `${pct(x.U, 0)} / ${pct(x.E, 0)} / ${pct(x.F, 0)}` : '—');

        return [c, k === 'p0RejectedExp30' ? 'EXP-30 rep. rejected by P0' : 'other pairs', s.pairs, fmt$((s.exp30.dd as { mean?: number }).mean), sh(s.exp30.shares), `${s.exp30.givebackDominated} / ${s.pairs}`, fmt$((s.ctrl.dd as { mean?: number }).mean), sh(s.ctrl.shares), fmtS(s.meanDelta?.dd), s.meanDelta ? `${fmtS(s.meanDelta.U)} / ${fmtS(s.meanDelta.E)} / ${fmtS(s.meanDelta.F)}` : '—', fmtS(s.meanDelta?.net)];
      })
    )
  );
  L.push('## B6. Winning versus losing positions inside the maximum-DD windows (lot lens; sums over the 32 representatives)', '');
  T(
    ['Cutoff', 'Arm', 'Window giveback, lots closed profitable', 'closed at a loss', 'open at the door end', 'Window principal loss, lots closed at a loss', 'Trades with giveback: ended profitable / at a loss', 'Losing trades', 'Lots'],
    Object.keys(giveback).flatMap((c) =>
      armKeys.map((a) => {
        const w = giveback[c]!.winnersVsLosers[a] as Record<string, number>;

        return [c, a, fmt$(w.windowGivebackClosedProfitable), fmt$(w.windowGivebackClosedLoss), fmt$(w.windowGivebackOpenAtEnd), fmt$(w.windowPrincipalLossClosedLoss), `${n0(w.tradesGivebackEndedProfitable!)} / ${n0(w.tradesGivebackEndedLoss!)}`, n0(w.tradesLosing!), n0(w.lots!)];
      })
    )
  );
  L.push('## B6b. Lots of the maximum-DD windows by their recorded exit reason (gross giveback above break-even / gross deepening below principal; sums over the 32 representatives)', '', '“open” = still held at the training door’s end; “… gap” = filled at a gapped open below the stop level (recorded by the engine).', '');
  T(
    ['Cutoff', 'Arm', 'Exit reason', 'Window lots', 'Gross giveback', 'Gross below-principal', 'Giveback lots that closed profitable', 'Below-principal lots that closed at a loss'],
    Object.keys(giveback).flatMap((c) =>
      armKeys.flatMap((a) =>
        Object.entries((giveback[c] as unknown as { windowByExitReason: Record<ArmKey, Record<string, { lots: number; giveback: number; principalLoss: number; givebackLotsClosedProfitable: number; principalLossLotsClosedLoss: number }>> }).windowByExitReason[a])
          .sort((x, y) => y[1].giveback + y[1].principalLoss - (x[1].giveback + x[1].principalLoss))
          .map(([k, v]) => [c, a, k, n0(v.lots), fmt$(v.giveback), fmt$(v.principalLoss), n0(v.givebackLotsClosedProfitable), n0(v.principalLossLotsClosedLoss)])
      )
    )
  );
  L.push('## B7. Benchmarks (descriptive frozen references; never selectable)', '');
  T(['Cutoff', 'Benchmark', 'Net', 'DD', 'U / E / F', 'Giveback-dominated', 'BD (liq.)', 'PL (liq.)', 'Window'], Object.keys(giveback).flatMap((c) => giveback[c]!.benchmarks.map((b) => [c, b.label, fmt$(b.net), fmt$(b.dd), `${fmt$(b.U)} / ${fmt$(b.E)} / ${fmt$(b.F)}`, String(b.givebackDominated), fmt$(b.bdLiq), fmt$(b.plLiq), b.window ? `${b.window.peakDate} → ${b.window.troughDate}` : '—'])));
  L.push('## B8. Episode illustrations (each arm’s own maximum-DD window; side by side, never subtracted)', '');
  for (const c of Object.keys(giveback)) {
    const il = giveback[c]!.illustrations;
    const ep = (name: string, e: ReturnType<typeof Object>) => {
      const x = e as { label: string; net: number; dd: number; U: number; E: number; F: number; window: { peakDate: string; troughDate: string; peakNet: number; troughNet: number; bankedHigh: number } | null; topLots: { book: string; entry: string; exit: string | null; role: string; atPeak: number; atTrough: number; profitGiveback: number; principalLoss: number; lotNet: number | null }[] };

      L.push(`- **${c} ${name}: ${x.label}** — net ${fmt$(x.net)}, DD ${fmt$(x.dd)} = U ${fmt$(x.U)} + E ${fmt$(x.E)} + F ${fmt$(x.F)}; window ${x.window ? `${x.window.peakDate} → ${x.window.troughDate} (net ${fmt$(x.window.peakNet)} → ${fmt$(x.window.troughNet)}, banked high ${fmt$(x.window.bankedHigh)})` : '—'}. Largest lots: ${x.topLots.map((l) => `${l.book} ${l.entry}→${l.exit ?? 'open'} (${l.role}; ${fmt$(l.atPeak)} → ${fmt$(l.atTrough)}; giveback ${fmt$(l.profitGiveback)}, below principal ${fmt$(l.principalLoss)}; lot net ${fmt$(l.lotNet)})`).join('; ')}`);
    };

    ep('CTRL pooled P0 primary', il.pooledP0Primaries.CTRL);
    ep('EXP-30 pooled P0 primary', il.pooledP0Primaries.EXP30);
    ep(`largest paired ΔDD (${il.largestPairedDdIncrease.cell} R${il.largestPairedDdIncrease.replicate}) CTRL`, il.largestPairedDdIncrease.CTRL);
    ep(`largest paired ΔDD (${il.largestPairedDdIncrease.cell} R${il.largestPairedDdIncrease.replicate}) EXP-30`, il.largestPairedDdIncrease.EXP30);
    L.push('');
  }
}

fs.mkdirSync(path.join(resultsDir, 'analysis'), { recursive: true });
fs.writeFileSync(path.join(resultsDir, 'analysis', 'TABLES.md'), `${L.join('\n')}\n`);
console.log(JSON.stringify({ cuts, census: Object.keys(census), draws: Object.keys(draws), giveback: Object.keys(giveback), tables: path.relative(repoRoot, path.join(resultsDir, 'analysis', 'TABLES.md')) }));
