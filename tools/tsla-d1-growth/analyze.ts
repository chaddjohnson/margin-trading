// P6-TSLA analysis tables (report-only; NO evaluation): reads the sealed records under research/tsla-d1-growth/results and
// the report-only diagnostics, writes machine-readable tables under reports/tables/ (JSON, CSV). Run after the outcome (or
// on partial records: absent stages are skipped). Never a selection input.
//   GPU_POLICY_PURPOSE=diagnostic node --no-maglev --experimental-transform-types tools/tsla-d1-growth/analyze.ts
import fs from 'node:fs';
import path from 'node:path';
import { quantile } from '../../src/vg-d1-growth-joint/fitness.ts';
import { type ArmKey, cutoffKeys, researchDir, resultsDir } from '../../src/tsla-d1-growth/context.ts';
import type { Evidence } from '../../src/tsla-d1-growth/qualify.ts';
import type { LaneResult } from '../../src/tsla-d1-growth/search.ts';
import * as S from '../../src/tsla-d1-growth/space.ts';
import { ensureAllFrozen } from '../../src/tsla-d1-growth/stages.ts';
import { writeJson } from './common.ts';

// arm S cells name a sealed frozen D1 finalist: register every cutoff's before any S configuration is read
ensureAllFrozen();

const tables = path.join(researchDir, 'reports', 'tables');
const exists = (f: string) => fs.existsSync(f);
const readJ = <T>(f: string) => JSON.parse(fs.readFileSync(f, 'utf8')) as T;
const r2 = (x: number) => Math.round(x * 100) / 100;
const r4 = (x: number) => Math.round(x * 1e4) / 1e4;
const csv = (file: string, rows: Record<string, unknown>[]) => {
  if (!rows.length) return;

  const keys = Object.keys(rows[0]!);
  const esc = (v: unknown) => {
    const s = v === null || v === undefined ? '' : typeof v === 'object' ? JSON.stringify(v) : String(v);

    return /[",\n]/.test(s) ? `"${s.replaceAll('"', '""')}"` : s;
  };

  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${keys.join(',')}\n${rows.map((r) => keys.map((k) => esc(r[k])).join(',')).join('\n')}\n`);
};
const searchArms = ['D', 'G', 'J', 'S'] as const;
const arms = ['D', 'G', 'C', 'J', 'S'] as const;

// ----- search, convergence and effort -----

type SearchRec = { arm: ArmKey; part: string; cutoff: string; lanes: LaneResult[]; requested: number; compute: { fresh: number; archiveHits: number; wallSeconds: number }; extensionRounds: unknown[] };

const searchRecords = () => {
  const out: SearchRec[] = [];

  for (const c of cutoffKeys) {
    const d = path.join(resultsDir, 'search', c);

    if (!exists(d)) continue;
    for (const f of fs.readdirSync(d).sort()) out.push(readJ<SearchRec>(path.join(d, f)));
  }
  return out;
};

// progress per unit of compute (PROTOCOL §16): the lane's cumulative best feasible centre net after each island against its
// cumulative island evaluations (the trajectories carry the lane's best so far)
type Island = { evaluations: number; bestNetTrajectory: number[]; bestRobustTrajectory: number[] };
const progressOf = (l: LaneResult) => {
  const isl = l.islands as unknown as Island[];
  let cum = 0;

  return isl.map((i) => {
    cum += i.evaluations;
    return { evaluations: cum, bestNet: i.bestNetTrajectory.at(-1) ?? null, bestRobust: i.bestRobustTrajectory.at(-1) ?? null };
  });
};
const med = (xs: number[]) => (xs.length ? quantile([...xs].sort((a, b) => a - b), 0.5) : null);

const searchTables = () => {
  const recs = searchRecords();
  const lanes: Record<string, unknown>[] = [];
  const summary: Record<string, unknown>[] = [];

  for (const s of recs) {
    for (const l of s.lanes)
      lanes.push({
        cutoff: s.cutoff,
        arm: s.arm,
        part: s.part,
        lane: l.key,
        cell: l.structure,
        replicate: l.replicate,
        requested: l.requested,
        islands: l.islands.length,
        stop: l.extension.stop,
        r3Feasible: l.r3.filter((f) => f.feasible).length,
        shortlisted: l.shortlist.length,
        bestFeasibleR3Net: l.r3.filter((f) => f.feasible).reduce<number | null>((a, f) => (a === null || f.net > a ? f.net : a), null),
        islandProgress: progressOf(l).map((x) => `${x.evaluations}:${x.bestNet ?? ''}`).join(' '),
        screenPlausible: l.failure?.screenPlausible ?? null
      });
  }

  for (const c of cutoffKeys)
    for (const a of searchArms) {
      const rs = recs.filter((s) => s.cutoff === c && s.arm === a);

      if (!rs.length) continue;

      const ls = rs.flatMap((s) => s.lanes);
      const stops: Record<string, number> = {};
      const isl: Record<number, number> = {};

      for (const l of ls) {
        const k = l.extension.stop.startsWith('extension cap') ? 'budget-bound (extension cap reached)' : l.extension.stop.startsWith('class trigger') ? 'coverage-limited (class only beyond NL0 cap)' : l.extension.stop;

        stops[k] = (stops[k] ?? 0) + 1;
        isl[l.islands.length] = (isl[l.islands.length] ?? 0) + 1;
      }

      const broad = ls.filter((l) => l.stage === 'broad');
      const rounds: { k: number; fired: boolean; stop: string | null }[] = [];

      for (let k = 1; k <= 4; k++) {
        const f = path.join(resultsDir, 'rounds', c, `${a}-${k}.json`);

        if (!exists(f)) break;

        const r = readJ<{ fired: boolean; stop: string | null }>(f);

        rounds.push({ k, fired: r.fired, stop: r.stop });
      }

      const budgetBound = ls.filter((l) => l.extension.stop.startsWith('extension cap')).length;
      // the last island's gain of the lane's best centre net, per 10,000 island evaluations (%); the base islands' share of
      // the lane's final best; the spread of each cell's best feasible rung-3 net across its broad replicates
      const lastGain: number[] = [];
      const baseShare: number[] = [];

      for (const l of ls) {
        const pr = progressOf(l);

        if (pr.length >= 2 && pr.at(-2)!.bestNet && pr.at(-1)!.bestNet) {
          const a = pr.at(-2)!.bestNet!;
          const b = pr.at(-1)!.bestNet!;
          const ev = pr.at(-1)!.evaluations - pr.at(-2)!.evaluations;

          if (a > 0 && ev > 0) lastGain.push((((b - a) / a) * 100 * 10_000) / ev);
        }
        if (pr.length >= 2 && pr[1]!.bestNet && pr.at(-1)!.bestNet && pr.at(-1)!.bestNet! > 0) baseShare.push(pr[1]!.bestNet! / pr.at(-1)!.bestNet!);
      }

      const spread: Record<string, { replicates: number; min: number; median: number; max: number }> = {};

      for (const cell of [...new Set(broad.map((l) => l.structure))]) {
        const xs = broad
          .filter((l) => l.structure === cell)
          .map((l) => l.r3.filter((f) => f.feasible).reduce<number | null>((x, f) => (x === null || f.net > x ? f.net : x), null))
          .filter((x): x is number => x !== null)
          .sort((p, q) => p - q);

        if (xs.length) spread[cell] = { replicates: xs.length, min: r2(xs[0]!), median: r2(quantile(xs, 0.5)), max: r2(xs.at(-1)!) };
      }

      const rel = Object.values(spread).filter((x) => x.replicates >= 2 && x.max > 0).map((x) => (x.max - x.min) / x.max);

      summary.push({
        cutoff: c,
        arm: a,
        lanes: ls.length,
        broadLanes: broad.length,
        refineLanes: ls.length - broad.length,
        replicates: [...new Set(broad.map((l) => l.replicate))].length,
        rounds,
        roundStop: rounds.length ? (rounds.at(-1)!.fired ? 'replicate cap reached (budget-bound across seeds)' : 'replicate triggers not met (converged by the 2 % rule)') : 'no round',
        requested: rs.reduce((x, s) => x + s.requested, 0),
        fresh: rs.reduce((x, s) => x + (s.compute?.fresh ?? 0), 0),
        archiveHits: rs.reduce((x, s) => x + (s.compute?.archiveHits ?? 0), 0),
        wallSeconds: r2(rs.reduce((x, s) => x + (s.compute?.wallSeconds ?? 0), 0)),
        proposals: ls.reduce((x, l) => x + (l.counts.screened ?? 0) + (l.counts.islandConfigs ?? 0) + (l.counts.seedDesigns ?? 0), 0),
        refineMoves: ls.reduce((x, l) => x + (l.counts.refineMoves ?? 0), 0),
        islands: isl,
        stops,
        budgetBoundShare: r4(budgetBound / Math.max(1, ls.length)),
        budgetLimitedLabel: budgetBound / Math.max(1, ls.length) > 0.1 || (rounds.length === 4 && rounds[3]!.fired) ? 'budget-limited (not converged)' : 'converged by the frozen rules',
        progress: {
          lastIslandGainPctPer10k: { median: lastGain.length ? r4(med(lastGain)!) : null, lanes: lastGain.length },
          baseIslandsShareOfFinalBest: { median: baseShare.length ? r4(med(baseShare)!) : null, lanes: baseShare.length }
        },
        replicateSpread: { cells: spread, medianRelativeRange: rel.length ? r4(med(rel)!) : null },
        cellsWithFeasible: [...new Set(ls.filter((l) => l.r3.some((f) => f.feasible)).map((l) => l.structure))].length,
        cells: [...new Set(ls.map((l) => l.structure))].length
      });
    }

  csv(path.join(tables, 'lanes.csv'), lanes);
  writeJson(path.join(tables, 'search-summary.json'), { kind: 'search, convergence and effort per cutoff and arm (report-only)', rows: summary });
  return summary;
};

// ----- qualification -----

const qualificationTables = () => {
  const rows: Record<string, unknown>[] = [];

  for (const c of cutoffKeys) {
    const d = path.join(resultsDir, 'qualification', c);

    if (!exists(d)) continue;
    for (const f of fs.readdirSync(d).sort()) {
      const q = readJ<{ arm: ArmKey; qualificationStage: string; evidence: Evidence[]; requested: number }>(path.join(d, f));
      const ms = q.evidence.filter((e) => e.stage !== 'control');
      const failed: Record<string, number> = {};

      for (const e of ms) for (const g of e.failed) failed[g] = (failed[g] ?? 0) + 1;
      rows.push({ cutoff: c, arm: q.arm, stage: q.qualificationStage, members: ms.length, qualified: ms.filter((e) => e.qualified).length, failedByGate: failed, requested: q.requested, controls: q.evidence.filter((e) => e.stage === 'control').map((e) => ({ label: e.label, qualified: e.qualified, failed: e.failed })) });
    }
  }
  writeJson(path.join(tables, 'qualification.json'), { kind: 'qualification per cutoff, arm and stage (report-only)', rows });
  return rows;
};

// ----- members (summary rows of evidence) -----

// the parameter vector of a configuration: the cell, D1's eight genes, the risk controls and D1's arming day (D1 books),
// Growth's genome (Growth books)
export const vectorOf = (cfg: S.Cfg) => {
  const c = S.canonicalCfg(cfg);
  const cell = S.cellOf(c.cell);
  const p = S.partsOf(c);
  const g = Object.fromEntries(Object.entries(p.g as Record<string, unknown>).filter(([k]) => k !== 'costBpsPerSide'));

  return {
    cell: c.cell,
    d1: S.hasD1(cell.arm) ? Object.fromEntries(S.d1Box.map((b) => [b.key, p.d1[b.key as keyof typeof p.d1]])) : null,
    controls: S.hasD1(cell.arm) ? p.ctl : null,
    d1EntryDay: S.hasD1(cell.arm) ? p.entryDay : null,
    growth: S.hasGrowth(cell.arm) ? g : null,
    describe: S.describeCfg(c)
  };
};

const memberRow = (e: Evidence) => ({
  label: e.label,
  arm: e.arm,
  cell: e.cell,
  d1Structure: e.d1Structure,
  growthProtection: e.growthProtection,
  unrestricted: e.unrestrictedGrowth,
  qualified: e.qualified,
  failed: e.failed.join(' '),
  centreNet: e.centre.net,
  centreDd: e.centre.dd,
  centreDdPct: r4(e.centre.dd / 100_000),
  realized: e.centre.realized,
  unrealized: e.centre.unrealized,
  gross: r2(e.centre.net + e.centre.interest + e.centre.costs),
  interest: e.centre.interest,
  costs: e.centre.costs,
  lots: e.centre.lots,
  wins: e.centre.wins,
  losses: e.centre.losses,
  worstLoss: e.centre.worstLoss,
  largestWin: e.centre.largestWin,
  d1Lots: e.centre.fam.D1.lots,
  growthLots: e.centre.fam.G.lots,
  d1Booked: e.centre.fam.D1.booked,
  growthBooked: e.centre.fam.G.booked,
  topEpisodeShare: e.centre.topEpisodeShare,
  occupancy: e.risk.occupancy,
  conservativeNet: e.risk.conservativeNet,
  openShare: e.risk.openShare,
  openLotMultiple: e.risk.openLot?.multiple ?? null,
  worstLotMae: e.risk.mae.worst,
  principalLossMarked: r2(e.envelope.centre.principalLossMarked),
  principalLossLiquidation: r2(e.envelope.centre.principalLossLiquidation),
  bankedDdMarked: r2(e.envelope.centre.bankedDdMarked),
  bankedDdLiquidation: r2(e.envelope.centre.bankedDdLiquidation),
  selectRobust: e.select.robust,
  selectMedian: e.select.median,
  selectP10: e.select.p10,
  selectP90Dd: e.select.p90Dd,
  confirmRobust: e.confirm.robust,
  confirmMedian: e.confirm.median,
  confirmP10: e.confirm.p10,
  confirmP90Dd: e.confirm.p90Dd,
  confirmP95Dd: e.confirmTail.p95Dd,
  confirmWorstDd: e.confirmTail.worstDd,
  confirmWorst10MeanDd: e.confirmTail.worst10Mean,
  confirmMeanExcess: e.confirmTail.meanExcess,
  confirmBreachInterval: e.confirmTail.breachInterval,
  selectBreachShare: e.selectTail.breachShare,
  confirmBreachShare: e.confirmTail.breachShare,
  confirmDraws: e.confirmDraws.unique,
  stress: Object.fromEntries(Object.entries(e.stress).map(([k, v]) => [k, { net: v.net, dd: v.dd }])),
  removal: Object.fromEntries(Object.entries(e.removal).map(([k, v]) => [k, { net: v.net, dd: v.dd }])),
  participation: e.participation,
  years: e.centre.years,
  replicate: e.replicate,
  lane: e.lane,
  stage: e.stage,
  vector: vectorOf(e.cfg)
});

// ----- selections, finalists, chronology -----

const selectionTables = () => {
  const out: Record<string, unknown>[] = [];

  for (const c of cutoffKeys) {
    const f = path.join(resultsDir, 'selection', `${c}.json`);

    for (const a of arms) {
      const af = path.join(resultsDir, 'selection', `${c}-${a}.json`);

      if (!exists(af)) continue;

      const s = readJ<{ primaries: Record<string, string | null>; roles: Record<string, { roles: Record<string, string | null>; qualified: number; members: number }>; ra1: Record<string, { first: string | null }>; subjects: Evidence[]; counts: Record<string, { members: number; qualified: number }>; finalists: unknown[] }>(af);
      const byLabel = new Map(s.subjects.map((e) => [e.label, e]));

      for (const [p, l] of Object.entries(s.primaries))
        out.push({
          cutoff: c,
          population: p,
          members: s.counts[p]?.members,
          qualified: s.counts[p]?.qualified,
          primary: l,
          primaryRow: l ? memberRow(byLabel.get(l)!) : null,
          roles: s.roles[p]?.roles,
          ra1First: s.ra1[p]?.first ?? null,
          ra1AgreesWithPrimary: (s.ra1[p]?.first ?? null) === l,
          finalists: a === p ? s.finalists : undefined
        });
    }
    void f;
  }
  writeJson(path.join(tables, 'selections.json'), { kind: 'every cutoff’s populations: primaries (NL0 original rule), roles and RA1’s first member (report-only)', rows: out });
  return out;
};

const finalistTables = () => {
  const f = path.join(researchDir, 'FROZEN_SELECTION.json');

  if (!exists(f)) return null;

  const fz = readJ<{ finalists: { label: string; arm: ArmKey; roles: string[] }[]; preDetermination: unknown }>(f);
  const sel = readJ<{ subjects: Evidence[]; controls: Evidence[] }>(path.join(resultsDir, 'selection', 'C24.json'));
  const v = exists(path.join(resultsDir, 'validation', 'validation.json')) ? readJ<{ rows: Record<string, unknown>[] }>(path.join(resultsDir, 'validation', 'validation.json')).rows : [];
  const rowOf = (e: Evidence, roles: string[], kind: string) => {
    const vr = v.find((r) => r.label === e.label && r.arm === e.arm) as Record<string, unknown> | undefined;

    return {
      kind,
      roles: roles.join('; '),
      ...memberRow(e),
      validationNet: vr?.sliceNet ?? null,
      validationResetDd: vr?.sliceDd ?? null,
      fullNet: vr?.wholeNet ?? null,
      fullDd: vr?.wholeDd ?? null,
      validationTests: vr?.validation ?? null,
      validationYears: vr?.years ?? null,
      validationNeighbourhood: vr?.neighbourhood ?? null,
      validationStresses: vr?.stresses ?? null,
      fullEnvelope: vr?.wholeEnvelope ?? null
    };
  };
  const rows = [
    ...fz.finalists.map((x) => rowOf(sel.subjects.find((e) => e.label === x.label && e.arm === x.arm)!, x.roles, 'finalist')),
    ...sel.controls.map((e) => rowOf(e, ['external control'], 'control'))
  ];

  writeJson(path.join(tables, 'finalists.json'), { kind: 'C24 finalists and external controls: development (D24) evidence, validation (FULL, once) and full-history figures (report)', rows });
  csv(path.join(tables, 'finalists.csv'), rows.map((r) => Object.fromEntries(Object.entries(r).filter(([, x]) => typeof x !== 'object' || x === null))));
  return rows;
};

const chronologyTables = () => {
  const f = path.join(resultsDir, 'sequential.json');
  const out: Record<string, unknown> = {};

  if (exists(f)) out.sequential = readJ<Record<string, unknown>>(f);

  const slices: Record<string, unknown> = {};

  for (const c of ['C19', 'C21', 'C23'] as const) {
    const sf = path.join(resultsDir, 'slices', `${c}.json`);

    if (!exists(sf)) continue;

    const s = readJ<{ rows: Record<string, unknown>[] }>(sf);

    slices[c] = s.rows.map((r) => ({
      label: r.label,
      arm: r.arm,
      kind: r.kind,
      roles: r.roles,
      boundaryEquity: r.boundaryEquity,
      sliceNet: r.sliceNet,
      sliceDd: r.sliceDd,
      wholeNet: r.wholeNet,
      wholeDd: r.wholeDd,
      openAtBoundary: r.openAtBoundary,
      nextSlice: r.nextSlice,
      neighbourhood: r.neighbourhood
    }));
  }
  out.slices = slices;
  writeJson(path.join(tables, 'chronology.json'), { kind: 'fold slices and the sequential procedures (report)', ...out });
  return out;
};

// ----- §5.9 exposure of fold primaries (training evidence + next slice) -----

const exposureTables = () => {
  const rows: Record<string, unknown>[] = [];

  for (const c of ['C19', 'C21', 'C23', 'C24'] as const) {
    const sf = path.join(resultsDir, 'selection', `${c}.json`);

    if (!exists(sf)) continue;

    const sel = readJ<{ primaries: Record<string, string | null>; subjects: Evidence[] }>(sf);
    const slice = c === 'C24' ? path.join(resultsDir, 'validation', 'validation.json') : path.join(resultsDir, 'slices', `${c}.json`);
    const srows = exists(slice) ? readJ<{ rows: Record<string, unknown>[] }>(slice).rows : [];

    for (const a of arms) {
      const l = sel.primaries[a];

      if (!l) {
        rows.push({ cutoff: c, arm: a, primary: null });
        continue;
      }

      const e = sel.subjects.find((x) => x.label === l)!;
      const sr = srows.find((r) => r.label === l && r.arm === a) as Record<string, unknown> | undefined;
      // the sealed evidence keeps the per-lot MAE summary (rows are stripped at sealing; rowsKept counts them)
      const mae = (e.risk as unknown as { mae?: { count: number; median: number | null; p90: number | null; worst: number | null } }).mae;
      const m2 = (x: number | null | undefined) => (typeof x === 'number' ? r2(x) : null);
      const open = e.risk.openLot;
      const carried = (sr?.openAtBoundary as { net: number; exit: string | null; reason: string }[] | undefined)?.[0];

      rows.push({
        cutoff: c,
        arm: a,
        primary: l,
        trainingNet: e.risk.net,
        openLotShare: e.risk.net > 0 ? r4(e.risk.unrealized / e.risk.net) : `undefined (training net ≤ 0): unrealized ${r2(e.risk.unrealized)}, net ${r2(e.risk.net)}`,
        largestOpenLot: open ? { book: open.book, entry: open.entry, entryRaw: open.entryRaw, multiple: r4(open.multiple), mark: r2(open.mark) } : 'none open',
        // the carried lot's change on the next slice = the slice P&L minus the lots entered after the boundary (one slot: at most
        // one lot is carried). Not finalNet − the unrealized mark: a lot with partial exits before the cutoff had already
        // realized part of its net inside the training net (the mark is only the open remnant's unrealized gain)
        openLotGivebackNextSlice: open && carried && sr ? (() => {
          const after = (sr.lots as { entry: string; net: number }[]).filter((x) => x.entry > (sr.boundary as string)).reduce((s, x) => s + x.net, 0);
          const change = (sr.sliceNet as number) - after;

          return { unrealizedMarkAtCutoff: r2(open.mark), lotNetAtCutoff: r2(carried.net - change), finalNet: r2(carried.net), exit: carried.exit, reason: carried.reason, change: r2(change) };
        })() : open ? 'open lot not found in the slice row' : 'none open',
        trainingMae: mae ? { count: mae.count, median: m2(mae.median), p90: m2(mae.p90), worst: m2(mae.worst) } : null,
        nextSliceMae: sr ? { lots: (sr.nextSlice as Record<string, unknown>).lots, median: (sr.nextSlice as Record<string, unknown>).maeMedian, worst: (sr.nextSlice as Record<string, unknown>).worstLotMae } : null,
        trainingNeighbourhoodOnNextSlice: sr ? sr.neighbourhood : null,
        worstRealized: e.risk.worstRealized,
        meanLosing: e.risk.meanLosing
      });
    }
  }
  writeJson(path.join(tables, 'exposure-5-9.json'), { kind: 'standard §5.9 chronological exposure disclosure of every fold primary and the C24 primaries (report-only; training vs next slice labelled)', rows });
  return rows;
};

const main = () => {
  fs.mkdirSync(tables, { recursive: true });

  const s = searchTables();
  const q = qualificationTables();
  const sel = selectionTables();
  const fin = finalistTables();
  const chr = chronologyTables();
  const exp = exposureTables();

  console.log(JSON.stringify({ search: s.length, qualification: q.length, selections: sel.length, finalists: fin?.length ?? null, chronology: Object.keys(chr), exposure: exp.length }));
};

main();
