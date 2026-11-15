// Report-only analyses from sealed records (no evaluation; PROTOCOL.md §13 items 6, §15): search coverage, execution and
// budget accounting (per cutoff, track, job, lane, cell and stratum; stops; budget-bound lanes; stage allocation; budget
// equivalence against NL0, Priority 3B and Assignment 2); structure selection frequencies (families, gates, activations,
// K, Growth strata) among shortlisted and qualified members, primaries and finalists across seeds and folds; replicate
// variability; the selection-method study (NL0 versus RA1 on identical populations with the frozen labels of §11.3, and
// H1 against Assignment 2's Growth-frozen procedures); Track I versus Track N at C24. Never a selection input.
//   node --experimental-transform-types tools/vg-l0-full-joint/analyses.ts <coverage|structures|selection|tracks|all> [--dry]
import fs from 'node:fs';
import path from 'node:path';
import { repoRoot } from '../../src/vg-l0-full-joint/context.ts';
import type { Evidence } from '../../src/vg-l0-full-joint/qualify.ts';
import { failedScreensOf } from '../../src/vg-l0-full-joint/select.ts';
import { cellOf, families } from '../../src/vg-l0-full-joint/space.ts';
import { quantile } from '../../src/vg-l0-full-joint/fitness.ts';
import {
  type SeqPath,
  allEvidence,
  cutoffKeys,
  exists,
  finalKey,
  foldEvaluation,
  foldKeys,
  frozenSelection,
  qualification,
  r2,
  refinePlan,
  searchParts,
  searchRecord,
  selection,
  sequential,
  writeDiagnostic
} from './common.ts';

const dry = process.argv.includes('--dry');
const emit = (name: string, v: unknown) => (dry ? console.log(JSON.stringify(v, null, 1).slice(0, 6000)) : writeDiagnostic(name, v));
const best = (es: Evidence[]) => es.filter((e) => e.qualified).sort((a, b) => b.centre.net - a.centre.net || (a.label < b.label ? -1 : 1))[0];
export const brief = (e: Evidence | undefined) =>
  e
    ? {
        label: e.label,
        track: e.track,
        cell: e.cell,
        activation: e.activation,
        growthStratum: e.growthStratum,
        centreNet: r2(e.centre.net),
        centreDd: r2(e.centre.dd),
        lots: e.centre.lots,
        realized: r2(e.centre.realized),
        unrealized: r2(e.centre.unrealized),
        selectRobust: r2(e.select.robust),
        selectP90Dd: r2(e.select.p90Dd),
        confirmMedian: r2(e.confirm.median),
        confirmP10: r2(e.confirm.p10),
        confirmP90Dd: r2(e.confirm.p90Dd),
        confirmP95Dd: r2(e.confirmTail.p95Dd),
        confirmWorst10Mean: r2(e.confirmTail.worst10Mean),
        confirmWorstDd: r2(e.confirm.worstDd),
        confirmBreachShare: e.confirmTail.breachShare,
        confirmBreachInterval: e.confirmTail.breachInterval,
        confirmMeanExcess: r2(e.confirmTail.meanExcess),
        confirmBreachLedgers: e.confirmTail.breachLedgers,
        worstLotMae: r2(e.risk.mae.worst),
        conservativeNet: r2(e.risk.conservativeNet),
        occupancy: r2(e.risk.occupancy),
        openLot: e.risk.openLot ? { book: e.risk.openLot.book, multiple: r2(e.risk.openLot.multiple), mark: r2(e.risk.openLot.mark) } : null,
        openShare: e.risk.openShare === null ? null : r2(e.risk.openShare),
        failedScreens: failedScreensOf(e),
        interest: r2(e.centre.interest),
        costs: r2(e.centre.costs)
      }
    : null;

// ----- coverage and execution accounting -----

const allocationOf = (tallies: Record<string, { fresh: number }>) => {
  const sum = (pre: string) => Object.entries(tallies).filter(([k]) => k.startsWith(pre)).reduce((a, [, v]) => a + v.fresh, 0);
  const parts = { screen: sum('screen'), rung1: sum('r1'), rung2: sum('r2'), rung3: sum('r3'), refinement: sum('refine') };
  const total = Object.values(parts).reduce((a, b) => a + b, 0);

  return { ...parts, total, shares: Object.fromEntries(Object.entries(parts).map(([k, v]) => [k, r2(v / Math.max(1, total))])) };
};

export const coverage = () => {
  const jobs: Record<string, unknown>[] = [];
  const cells: Record<string, Record<string, Record<string, number>>> = {};
  const classes: Record<string, Record<string, { screened: number; plausible: number; promoted: number; centres: number; feasible: number }>> = {};
  const replicateNoise: Record<string, { cells: number; medianAbsDiff: number | null; p90AbsDiff: number | null; maxAbsDiff: number | null }> = {};
  const totals = { proposals: 0, requested: 0, uniqueFresh: 0, archiveHits: 0, qualificationFresh: 0, lanes: 0, islands: 0, refinementStarts: 0, refinementMoves: 0 };

  for (const cut of cutoffKeys) {
    for (const part of searchParts(cut)) {
      const s = searchRecord(cut, part);
      const stops: Record<string, number> = {};
      let proposals = 0;
      let starts = 0;
      let moves = 0;

      for (const l of s.lanes) {
        const stop = l.extension.stop.split(' (')[0]!;

        stops[stop] = (stops[stop] ?? 0) + 1;
        proposals += (l.counts.screened ?? 0) + (l.counts.seedDesigns ?? 0) + (l.counts.islandConfigs ?? 0) + (l.counts.fillers ?? 0);
        starts += l.refinements.length;
        moves += l.counts.refineMoves ?? 0;

        const c = ((cells[cut] ??= {})[l.structure] ??= { lanes: 0, requested: 0, islands: 0, screened: 0, plausible: 0, r1Feasible: 0, shortlisted: 0 });

        c.lanes!++;
        c.requested! += l.requested;
        c.islands! += l.islands.length;
        c.screened! += l.counts.screened ?? 0;
        c.plausible! += l.counts.plausible ?? 0;
        c.r1Feasible! += l.counts.r1Feasible ?? 0;
        c.shortlisted! += l.shortlist.length;
        for (const [k, v] of Object.entries(l.byClass)) {
          const key = k.split('|').slice(1).join('|');
          const row = ((classes[`${cut}/${s.track}`] ??= {})[key] ??= { screened: 0, plausible: 0, promoted: 0, centres: 0, feasible: 0 });

          for (const f of Object.keys(row) as (keyof typeof row)[]) row[f] += v[f];
        }
      }

      totals.proposals += proposals;
      totals.requested += s.lanes.reduce((a, l) => a + l.requested, 0);
      totals.uniqueFresh += s.compute.unique;
      totals.archiveHits += s.compute.archiveHits;
      totals.lanes += s.lanes.length;
      totals.islands += s.lanes.reduce((a, l) => a + l.islands.length, 0);
      totals.refinementStarts += starts;
      totals.refinementMoves += moves;
      jobs.push({
        cutoff: cut,
        part,
        track: s.track,
        lanes: s.lanesCount,
        minutes: s.minutes,
        proposals,
        requested: s.lanes.reduce((a, l) => a + l.requested, 0),
        requestedPerLane: { median: r2(quantile(s.lanes.map((l) => l.requested).sort((a, b) => a - b), 0.5)), max: Math.max(...s.lanes.map((l) => l.requested)) },
        uniqueFresh: s.compute.unique,
        freshAllRuns: s.compute.freshAllRuns,
        retries: s.compute.freshAllRuns - s.compute.unique,
        archiveHits: s.compute.archiveHits,
        priorRuns: s.compute.priorRuns,
        cap: s.cap,
        perLaneCap: s.perLaneCap,
        islands: s.lanes.reduce((a, l) => a + l.islands.length, 0),
        refinementStarts: starts,
        refinementMoves: moves,
        stops,
        budgetBound: s.lanes.filter((l) => l.extension.stop.startsWith('extension cap') || l.extension.stop.startsWith('resource guard')).length,
        resourceGuard: s.lanes.filter((l) => l.extension.stop.startsWith('resource guard')).length,
        allocation: allocationOf(s.compute.tallies),
        peakCgroupGiB: r2(s.peaks.cgroup / 2 ** 30),
        evaluationsPerSecond: r2(s.compute.unique / Math.max(1, s.compute.wallSeconds))
      });
    }

    for (const st of ['broad', 'refine', 'informed'] as const) if (exists('folds', cut, `${st}-qualification.json`)) totals.qualificationFresh += qualification(cut, st).compute.unique;

    if (exists('folds', cut, 'broad-qualification.json')) {
      const ev = qualification(cut, 'broad').evidence.filter((e) => e.stage === 'broad');
      const diffs: number[] = [];

      for (const cell of [...new Set(ev.map((e) => e.cell))]) {
        const r = [1, 2].map((rep) => best(ev.filter((e) => e.cell === cell && e.replicate === rep))?.centre.net);

        if (r[0] !== undefined && r[1] !== undefined) diffs.push(Math.abs(r[0]! - r[1]!));
      }
      diffs.sort((a, b) => a - b);
      replicateNoise[cut] = { cells: diffs.length, medianAbsDiff: diffs.length ? r2(quantile(diffs, 0.5)) : null, p90AbsDiff: diffs.length ? r2(quantile(diffs, 0.9)) : null, maxAbsDiff: diffs.length ? r2(diffs.at(-1)!) : null };

      for (const [cell, b] of Object.entries(qualification(cut, 'broad').byCell)) {
        const c = ((cells[cut] ??= {})[cell] ??= {});

        c.members = b.members;
        c.qualified = b.qualified;
      }
    }
    if (exists('folds', cut, 'refine-plan.json')) (cells[cut] ??= {}).__refinePlan = Object.fromEntries(refinePlan(cut).cells.map((c) => [c.cell, c.seeds.length])) as never;
  }

  // NL0's effective budget (5B's L0 arm, NEW_L0_METHOD.md §4.1) and the two predecessors, for equivalence in matching units
  const references = {
    nl0L0Arm: { proposalsExecuted: 49_346, islands: 121, refinementStarts: 70, refinementMoves: 11_137, requestedSearch: 489_695, qualification: 64_554, independentBasePerCutoff: 8_192 },
    priority3B: { independentBasePerCutoff: 131_072, proposals: 602_111, evaluations: 5_830_000 },
    assignment2: { executedProposals: 2_333_780, freshPooledSimulations: 34_210_000, resourceBoundLanesPerCutoffFromC21: '117–155' }
  };

  emit('coverage', { jobs, totals, cells, classes, replicateNoise, references });
};

// ----- structure selection frequencies -----

const tallyBy = (es: Evidence[], key: (e: Evidence) => string) => es.reduce<Record<string, number>>((a, e) => ((a[key(e)] = (a[key(e)] ?? 0) + 1), a), {});
const dims = {
  'GDX family': (e: Evidence) => cellOf(e.cell).GDX.family,
  'VGT family': (e: Evidence) => cellOf(e.cell).VGT.family,
  'family pair': (e: Evidence) => `${cellOf(e.cell).GDX.family}×${cellOf(e.cell).VGT.family}`,
  gates: (e: Evidence) => `GDX ${cellOf(e.cell).GDX.gate ? 'on' : 'off'} / VGT ${cellOf(e.cell).VGT.gate ? 'on' : 'off'}`,
  activation: (e: Evidence) => e.activation || '(no protected book)',
  K: (e: Evidence) => e.controlPattern.split('|').find((x) => x.includes('K')) ?? '(no gate)',
  'Growth stratum': (e: Evidence) => e.growthStratum,
  'Growth entry': (e: Evidence) => e.growthEntry
};

export const structures = () => {
  const out: Record<string, unknown> = {};

  for (const cut of cutoffKeys) {
    const ev = allEvidence(cut).filter((e) => e.stage !== 'control');

    if (!ev.length) continue;

    const row: Record<string, unknown> = {};

    for (const track of ['I', 'N'] as const) {
      const t = ev.filter((e) => e.track === track && e.stage !== 'incumbent');

      if (!t.length) continue;
      row[`Track ${track}`] = Object.fromEntries(
        Object.entries(dims).map(([k, fn]) => [k, { shortlisted: tallyBy(t, fn), qualified: tallyBy(t.filter((e) => e.qualified), fn), bestNetOfEach: Object.fromEntries(Object.entries(tallyBy(t, fn)).map(([v]) => [v, r2(best(t.filter((e) => fn(e) === v))?.centre.net ?? NaN)])) }])
      );
    }

    if (exists('folds', cut, 'selection.json')) {
      const sel = selection(cut);
      const prim = Object.entries(sel.primaries).flatMap(([p, ss]) => Object.entries(ss).map(([s, l]) => ({ p, s, e: l ? sel.subjects[l] : undefined })));

      row.primaries = prim.map((x) => ({ procedure: `${x.p}/${x.s}`, ...(x.e ? Object.fromEntries(Object.entries(dims).map(([k, fn]) => [k, fn(x.e!)])) : { none: true }) }));
    }
    out[cut] = row;
  }

  if (exists('..', 'FROZEN_SELECTION.json') || fs.existsSync(path.join(repoRoot, 'research/vg-l0-full-joint/FROZEN_SELECTION.json'))) {
    try {
      const fz = frozenSelection();
      const ev = new Map(allEvidence(finalKey).map((e) => [e.label, e]));

      out.finalists = fz.finalists.map((f) => {
        const e = ev.get(f.label);

        return { label: f.label, why: f.why, ...(e ? Object.fromEntries(Object.entries(dims).map(([k, fn]) => [k, fn(e)])) : {}) };
      });
    } catch {
      // the frozen selection does not exist yet
    }
  }

  emit('structures', out);
};

// ----- the selection-method study -----

const band = 2_500;
export const label = (x: SeqPath, y: SeqPath) => {
  const dDd = x.sequentialDd - y.sequentialDd;
  const dNet = x.net - y.net;
  const risk = x.sequentialDd < y.sequentialDd - band && x.parts.every((p, i) => p.sliceDd <= y.parts[i]!.sliceDd + band);

  if (risk) return 'risk improvement';
  if (dNet < -band) return 'profit sacrifice without clear benefit';
  if (Math.abs(dNet) <= band && Math.abs(dDd) <= band) return 'no material difference';
  return 'mixed';
};

export const selectionStudy = () => {
  if (!exists('folds', 'sequential.json')) throw new Error('the sequential record is not sealed');

  const seq = sequential();
  const path0 = (p: string, s: string) => seq.procedures.find((x) => x.population === p && x.selector === s)!.path;
  const cmp = (name: string, a: SeqPath, b: SeqPath) => ({ comparison: name, label: label(a, b), dNet: r2(a.net - b.net), dDd: r2(a.sequentialDd - b.sequentialDd), a: { net: a.net, dd: a.sequentialDd }, b: { net: b.net, dd: b.sequentialDd } });
  const labels = [
    cmp('RA1 vs original, L', path0('L', 'RA1'), path0('L', 'original')),
    cmp('RA1 vs original, B', path0('B', 'RA1'), path0('B', 'original')),
    cmp('RA1 vs original, F', path0('F', 'RA1'), path0('F', 'original')),
    cmp('F vs L, original', path0('F', 'original'), path0('L', 'original')),
    cmp('F vs L, RA1', path0('F', 'RA1'), path0('L', 'RA1')),
    cmp('F/RA1 vs L/original', path0('F', 'RA1'), path0('L', 'original')),
    cmp('RA2 vs RA1, F', path0('F', 'RA2'), path0('F', 'RA1'))
  ];
  // H1 (report-only): each Track I procedure against Assignment 2's same population × selector (Growth·VGT frozen there;
  // conditional; its neighbourhood instrument differed; same engine, doors and folds)
  const a2File = path.join(repoRoot, 'research/vg-l0-risk-families/results/folds/sequential.json');
  const a2 = JSON.parse(fs.readFileSync(a2File, 'utf8')) as { procedures: { population: string; selector: string; path: SeqPath; verdict: string }[] };
  const h1 = seq.procedures.map((p) => {
    const o = a2.procedures.find((x) => x.population === p.population && x.selector === p.selector);

    return o ? { procedure: `${p.population}/${p.selector}`, ...cmp(`Assignment 3 vs Assignment 2 (${p.population}/${p.selector})`, p.path, o.path), assignment2Verdict: o.verdict, assignment3Verdict: p.verdict } : null;
  });
  const folds = foldKeys
    .filter((c) => exists('folds', c, 'selection.json') && exists('folds', c, 'evaluation.json'))
    .map((cut) => {
      const sel = selection(cut);
      const ev = foldEvaluation(cut);
      const rowOf = (l: string | null) => (l ? ev.rows.find((r) => r.label === l) : undefined);

      return {
        cutoff: cut,
        populations: Object.fromEntries(
          (['L', 'B', 'F'] as const).map((p) => [
            p,
            {
              counts: sel.counts[p],
              bySelector: Object.fromEntries(
                (['original', 'RA1', 'RA2'] as const).map((s) => {
                  const l = sel.primaries[p][s];
                  const r = rowOf(l);

                  return [s, { primary: brief(l ? sel.subjects[l] : undefined), nextSlice: r ? { net: r2(r.sliceNet), dd: r2(r.sliceDd), openAtBoundary: r.openAtBoundary, giveBack: r.giveBack, nextSliceExcursions: r.nextSlice } : null, nextSliceNeighbourhood: l ? (ev.nextSliceNeighbourhoods.rows[l] ?? null) : null }];
                })
              ),
              sameBehaviour: sel.primaries[p].original && sel.primaries[p].RA1 ? sel.subjects[sel.primaries[p].original!]!.centre.signature === sel.subjects[sel.primaries[p].RA1!]!.centre.signature : null,
              originalPrimaryRankUnderRA1: (() => {
                const o = sel.primaries[p].original;
                const r = sel.rankings[p].RA1.findIndex((x) => x.label === o);

                return o ? (r >= 0 ? r + 1 : '> 10') : null;
              })()
            }
          ])
        ),
        newL0Control: (() => {
          const r = ev.rows.find((x) => x.label === 'control: New L0');

          return r ? { net: r2(r.sliceNet), dd: r2(r.sliceDd) } : null;
        })()
      };
    });

  emit('selection-study', { band, procedures: seq.procedures.map((p) => ({ procedure: `${p.population}/${p.selector}`, verdict: p.verdict, path: p.path })), descriptive: seq.descriptive, labels, h1, folds });
};

// ----- Track I versus Track N at the final cutoff -----

export const tracks = () => {
  const ev = allEvidence(finalKey).filter((e) => e.stage !== 'control');
  const sel = selection(finalKey);
  const effort = (track: 'I' | 'N') => {
    const parts = searchParts(finalKey).filter((p) => searchRecord(finalKey, p).track === track);
    const rs = parts.map((p) => searchRecord(finalKey, p));

    return {
      jobs: parts,
      lanes: rs.reduce((a, s) => a + s.lanes.length, 0),
      proposals: rs.reduce((a, s) => a + s.lanes.reduce((b, l) => b + (l.counts.screened ?? 0) + (l.counts.seedDesigns ?? 0) + (l.counts.islandConfigs ?? 0) + (l.counts.fillers ?? 0), 0), 0),
      islands: rs.reduce((a, s) => a + s.lanes.reduce((b, l) => b + l.islands.length, 0), 0),
      refinementStarts: rs.reduce((a, s) => a + s.lanes.reduce((b, l) => b + l.refinements.length, 0), 0),
      refinementMoves: rs.reduce((a, s) => a + s.lanes.reduce((b, l) => b + (l.counts.refineMoves ?? 0), 0), 0),
      requested: rs.reduce((a, s) => a + s.lanes.reduce((b, l) => b + l.requested, 0), 0),
      uniqueFresh: rs.reduce((a, s) => a + s.compute.unique, 0),
      archiveHits: rs.reduce((a, s) => a + s.compute.archiveHits, 0),
      minutes: r2(rs.reduce((a, s) => a + s.minutes, 0))
    };
  };
  const I = ev.filter((e) => e.track === 'I');
  const N = ev.filter((e) => e.track === 'N' && e.stage !== 'incumbent');
  const inc = ev.filter((e) => e.stage === 'incumbent');
  const byPair = (es: Evidence[]) =>
    Object.fromEntries(families.flatMap((g) => families.map((v) => [`${g}×${v}`, brief(best(es.filter((e) => cellOf(e.cell).GDX.family === g && cellOf(e.cell).VGT.family === v)))])));

  emit('tracks', {
    effort: { I: effort('I'), N: effort('N') },
    members: { I: { members: I.length, qualified: I.filter((e) => e.qualified).length }, N: { members: N.length, qualified: N.filter((e) => e.qualified).length } },
    bestQualified: { I: brief(best(I)), N: brief(best(N)), incumbents: inc.map(brief) },
    h2: (() => {
      const bi = best(I);
      const bn = best(N);

      return bi && bn ? { dNet: r2(bn.centre.net - bi.centre.net), informedAdvantage: bn.centre.net > bi.centre.net + 2_500 } : null;
    })(),
    primaries: Object.fromEntries(Object.entries(sel.primaries).map(([p, ss]) => [p, Object.fromEntries(Object.entries(ss).map(([s, l]) => [s, brief(l ? sel.subjects[l] : undefined)]))])),
    roles: sel.roles,
    bestByFamilyPair: { I: byPair(I), N: byPair(N) },
    control: brief(sel.control ?? undefined)
  });
};

const which = process.argv[2];

if (which === 'coverage' || which === 'all') coverage();
if (which === 'structures' || which === 'all') structures();
if (which === 'selection' || which === 'all') selectionStudy();
if (which === 'tracks' || which === 'all') tracks();
