// Report-only analyses from sealed records (no evaluation): search coverage and budgets, the structural families, the
// activation study (each onset cell against its base counterpart), and the selection-method study (the 2 × 2 with the
// frozen labels of PROTOCOL.md §11.3). Post-freeze tooling; never a selection input.
//   node --experimental-transform-types tools/vg-l0-risk-families/analyses.ts <coverage|families|activation|selection|all> [--dry]
import type { Evidence } from '../../src/vg-l0-risk-families/qualify.ts';
import { failedScreens, populations, ra1Order, originalOrder } from '../../src/vg-l0-risk-families/select.ts';
import { allCells, baseCounterpart, cellOf, families, legacyCellId } from '../../src/vg-l0-risk-families/space.ts';
import {
  type SeqPath,
  allEvidence,
  cutoffKeys,
  exists,
  foldEvaluation,
  foldKeys,
  qualification,
  r2,
  refinePlan,
  searchRecord,
  selection,
  sequential,
  writeDiagnostic
} from './common.ts';

const dry = process.argv.includes('--dry');
const emit = (name: string, v: unknown) => (dry ? console.log(JSON.stringify(v, null, 1).slice(0, 6000)) : writeDiagnostic(name, v));
const ready = (cut: string) => exists('folds', cut, 'selection.json');
const best = (es: Evidence[]) => es.filter((e) => e.qualified).sort((a, b) => b.centre.net - a.centre.net || (a.label < b.label ? -1 : 1))[0];
const brief = (e: Evidence | undefined) =>
  e
    ? {
        label: e.label,
        cell: e.cell,
        centreNet: r2(e.centre.net),
        centreDd: r2(e.centre.dd),
        selectRobust: r2(e.select.robust),
        selectP90Dd: r2(e.select.p90Dd),
        confirmP10: r2(e.confirm.p10),
        confirmP90Dd: r2(e.confirm.p90Dd),
        confirmP95Dd: r2(e.confirmTail.p95Dd),
        confirmWorst10Mean: r2(e.confirmTail.worst10Mean),
        confirmBreachShare: e.confirmTail.breachShare,
        worstLotMae: r2(e.risk.mae.worst),
        conservativeNet: r2(e.risk.conservativeNet),
        openShare: e.risk.openShare === null ? null : r2(e.risk.openShare),
        openMultiple: e.risk.openLot ? r2(e.risk.openLot.multiple) : null,
        occupancy: r2(e.risk.occupancy),
        lots: e.centre.lots,
        protectiveExits: Object.values(e.centre.rc ?? {}).reduce((a, x) => a + (x?.protective ?? 0), 0),
        entryDayExits: Object.values(e.centre.rc ?? {}).reduce((a, x) => a + (x?.entryDay ?? 0), 0),
        maximumHoldExits: Object.values(e.centre.rc ?? {}).reduce((a, x) => a + (x?.maximumHold ?? 0), 0)
      }
    : null;

// ----- coverage and budgets -----

export const coverage = () => {
  const out: Record<string, unknown> = {};

  for (const cut of cutoffKeys) {
    if (!exists('search', cut, 'onset2.json')) continue;

    const jobs: Record<string, unknown> = {};
    const cells: Record<string, Record<string, number | string>> = {};
    const reasons: Record<string, number> = {};
    const stops: Record<string, number> = {};
    let proposals = 0;
    let requested = 0;

    for (const part of ['base', 'onset1', 'onset2', 'refine']) {
      if (!exists('search', cut, `${part}.json`)) continue;

      const s = searchRecord(cut, part);

      jobs[part] = { lanes: s.lanes.length, fresh: s.compute.fresh, unique: s.compute.unique, hits: s.compute.archiveHits, minutes: s.minutes, cap: s.cap, peakCgroupGiB: r2(s.peaks.cgroup / 2 ** 30), tallies: s.compute.tallies };
      for (const l of s.lanes) {
        const c = (cells[`${l.cell}${part === 'refine' ? ' (refine)' : ''}`] ??= {});
        const add = (k: string, v: number) => (c[k] = ((c[k] as number) ?? 0) + v);
        const p = (l.counts.screened ?? 0) + (l.counts.islandConfigs ?? 0) + (l.counts.fillers ?? 0) + (l.counts.seedDesigns ?? 0);

        proposals += p;
        requested += l.requested;
        add('lanes', 1);
        add('proposals', p);
        add('screenPlausible', l.failure.screenPlausible);
        add('r1Centres', l.counts.r1Centres ?? 0);
        add('r1Feasible', l.counts.r1Feasible ?? 0);
        add('islands', l.extension.islands);
        add('refineMoves', l.counts.refineMoves ?? 0);
        add('shortlist', l.shortlist.length);
        add('requested', l.requested);
        stops[l.extension.stop] = (stops[l.extension.stop] ?? 0) + 1;
        for (const [k, v] of Object.entries(l.failure.screenReasons)) reasons[k] = (reasons[k] ?? 0) + v;
      }
    }

    for (const stage of ['broad', 'refine'] as const) {
      if (!exists('folds', cut, `${stage}-qualification.json`)) continue;
      for (const [cell, q] of Object.entries(qualification(cut, stage).byCell)) {
        const c = (cells[`${cell}${stage === 'refine' ? ' (refine)' : ''}`] ??= {});

        c.qualifiedMembers = q.qualified;
        c.members = q.members;
        c.failedGates = Object.entries(q.failed).map(([g, n]) => `${g}×${n}`).join(' ');
      }
    }

    out[cut] = {
      jobs,
      proposals,
      requested,
      screenReasons: reasons,
      stops,
      cellsWithoutShortlist: allCells.filter((c) => !((cells[c.id]?.shortlist as number) > 0)).map((c) => c.id),
      cellsWithoutQualified: allCells.filter((c) => !((cells[c.id]?.qualifiedMembers as number) > 0)).map((c) => c.id),
      refinePlan: exists('folds', cut, 'refine-plan.json') ? refinePlan(cut).cells.map((c) => ({ cell: c.cell, why: c.why })) : null,
      cells
    };
  }
  return out;
};

// ----- the structural families -----

export const familiesStudy = () => {
  const out: Record<string, unknown> = {};

  for (const cut of cutoffKeys) {
    if (!ready(cut)) continue;

    const ev = allEvidence(cut).filter((e) => e.stage !== 'control');
    const q = ev.filter((e) => e.qualified);
    const byCell = Object.fromEntries(allCells.map((c) => [c.id, brief(best(ev.filter((e) => e.cell === c.id)))]));
    const pairs: Record<string, unknown> = {};

    for (const g of families) for (const v of families) pairs[`GDX ${g} × VGT ${v}`] = brief(best(q.filter((e) => cellOf(e.cell).GDX.family === g && cellOf(e.cell).VGT.family === v)));

    const marginal: Record<string, unknown> = {};

    for (const s of ['GDX', 'VGT'] as const) {
      for (const fam of families) marginal[`${s} ${fam}`] = brief(best(q.filter((e) => cellOf(e.cell)[s].family === fam)));
      marginal[`${s} gate ON`] = brief(best(q.filter((e) => cellOf(e.cell)[s].gate)));
      marginal[`${s} gate OFF`] = brief(best(q.filter((e) => !cellOf(e.cell)[s].gate)));
    }

    const legacyBest = best(q.filter((e) => e.cell === legacyCellId));
    const dominatedBy = (x: Evidence, y: Evidence) =>
      (y.centre.net >= x.centre.net && y.centre.dd <= x.centre.dd && (y.centre.net > x.centre.net || y.centre.dd < x.centre.dd)) ||
      (y.select.p10 >= x.select.p10 && y.select.p90Dd <= x.select.p90Dd && (y.select.p10 > x.select.p10 || y.select.p90Dd < x.select.p90Dd));
    const nonLegacy = q.filter((e) => e.cell !== legacyCellId);

    out[cut] = {
      qualified: q.length,
      qualifiedCells: new Set(q.map((e) => e.cell)).size,
      legacyBest: brief(legacyBest),
      // H1: non-legacy qualified members not dominated by the legacy cell's best on either pair
      h1NotDominatedByLegacyBest: legacyBest ? nonLegacy.filter((e) => !dominatedBy(e, legacyBest)).length : null,
      h1BeatingLegacyOnBothPairs: legacyBest
        ? nonLegacy.filter((e) => e.centre.net > legacyBest.centre.net && e.centre.dd <= legacyBest.centre.dd && e.select.p10 >= legacyBest.select.p10 && e.select.p90Dd <= legacyBest.select.p90Dd).map((e) => e.label)
        : null,
      pairs,
      marginal,
      topCells: Object.entries(byCell)
        .filter(([, b]) => b)
        .sort((a, b) => (b[1]!.centreNet as number) - (a[1]!.centreNet as number))
        .slice(0, 25),
      byCell
    };
  }
  return out;
};

// ----- the activation study: each onset cell against its base counterpart (equal budgets) -----

export const activationStudy = () => {
  const out: Record<string, unknown> = {};

  for (const cut of cutoffKeys) {
    if (!ready(cut)) continue;

    const ev = allEvidence(cut).filter((e) => e.stage !== 'control');
    const bestOf = (cell: string) => best(ev.filter((e) => e.cell === cell));
    const rows = allCells
      .filter((c) => !c.base)
      .map((c) => {
        const onset = bestOf(c.id);
        const base = bestOf(baseCounterpart(c));
        const pattern = c.GDX.entryDay && c.VGT.entryDay ? 'both books entry-day' : c.GDX.entryDay ? 'GDX entry-day only' : 'VGT entry-day only';
        const d = (k: (e: Evidence) => number) => (onset && base ? r2(k(onset) - k(base)) : null);

        return {
          cell: c.id,
          base: baseCounterpart(c),
          pattern,
          onsetQualified: ev.filter((e) => e.cell === c.id && e.qualified).length,
          baseQualified: ev.filter((e) => e.cell === baseCounterpart(c) && e.qualified).length,
          onset: brief(onset),
          baseBest: brief(base),
          dNet: d((e) => e.centre.net),
          dDd: d((e) => e.centre.dd),
          dSelectRobust: d((e) => e.select.robust),
          dConfirmP90Dd: d((e) => e.confirm.p90Dd),
          dConfirmP95Dd: d((e) => e.confirmTail.p95Dd),
          dWorst10Mean: d((e) => e.confirmTail.worst10Mean),
          dWorstLotMae: d((e) => e.risk.mae.worst)
        };
      });
    const summary: Record<string, unknown> = {};

    for (const p of ['GDX entry-day only', 'VGT entry-day only', 'both books entry-day', 'all']) {
      const rs = rows.filter((r) => (p === 'all' || r.pattern === p) && r.dNet !== null);
      const med = (k: keyof (typeof rows)[number]) => {
        const xs = rs.map((r) => r[k] as number).sort((a, b) => a - b);

        return xs.length ? r2(xs[Math.floor((xs.length - 1) / 2)]!) : null;
      };

      summary[p] = {
        pairs: rs.length,
        onsetOnlyQualified: rows.filter((r) => (p === 'all' || r.pattern === p) && r.onsetQualified > 0 && r.baseQualified === 0).length,
        baseOnlyQualified: rows.filter((r) => (p === 'all' || r.pattern === p) && r.baseQualified > 0 && r.onsetQualified === 0).length,
        higherNet: rs.filter((r) => r.dNet! > 2500).length,
        lowerNet: rs.filter((r) => r.dNet! < -2500).length,
        lowerWorstLotLoss: rs.filter((r) => (r.dWorstLotMae ?? 0) > 2500).length,
        higherWorstLotLoss: rs.filter((r) => (r.dWorstLotMae ?? 0) < -2500).length,
        lowerWorst10: rs.filter((r) => (r.dWorst10Mean ?? 0) < -2500).length,
        higherWorst10: rs.filter((r) => (r.dWorst10Mean ?? 0) > 2500).length,
        medianDNet: med('dNet'),
        medianDWorst10Mean: med('dWorst10Mean'),
        medianDWorstLotMae: med('dWorstLotMae')
      };
    }

    const q = ev.filter((e) => e.qualified);

    out[cut] = {
      bestBase: brief(best(q.filter((e) => cellOf(e.cell).base))),
      bestOnset: brief(best(q.filter((e) => !cellOf(e.cell).base))),
      summary,
      rows
    };
  }
  return out;
};

// ----- the selection-method study (§11.3 labels) -----

const band = 2500;
export const label = (x: SeqPath, y: SeqPath) => {
  const risk = x.sequentialDd < y.sequentialDd - band && x.parts.every((p, i) => p.sliceDd <= y.parts[i]!.sliceDd + band);
  const none = Math.abs(x.net - y.net) <= band && Math.abs(x.sequentialDd - y.sequentialDd) <= band;

  return {
    label: risk ? 'risk improvement' : none ? 'no material difference' : x.net < y.net - band ? 'profit sacrifice without clear benefit' : 'mixed',
    dNet: r2(x.net - y.net),
    dSequentialDd: r2(x.sequentialDd - y.sequentialDd),
    dSliceDd: x.parts.map((p, i) => r2(p.sliceDd - y.parts[i]!.sliceDd)),
    dSliceNet: x.parts.map((p, i) => r2(p.sliceNet - y.parts[i]!.sliceNet))
  };
};

export const selectionStudy = () => {
  const folds: Record<string, unknown> = {};

  for (const cut of [...foldKeys, 'C24']) {
    if (!ready(cut)) continue;

    const sel = selection(cut);
    const ev = exists('folds', cut, 'evaluation.json') ? foldEvaluation(cut) : null;
    const pops: Record<string, unknown> = {};

    for (const p of ['L', 'B', 'F'] as const) {
      const pop = allEvidence(cut).filter((e) => e.stage !== 'control').filter(populations[p]);
      const orig = originalOrder(pop);
      const ra1 = ra1Order(pop);
      const row = (l: string | null) => (l && ev ? ev.rows.find((r) => r.label === l) ?? null : null);
      const o = orig[0];
      const r = ra1[0];

      pops[p] = {
        qualified: pop.filter((e) => e.qualified).length,
        same: o?.label === r?.label,
        original: o ? { ...brief(o), failedScreens: failedScreens(o), ra1Rank: ra1.findIndex((e) => e.label === o.label) + 1, next: row(o.label) && { sliceNet: row(o.label)!.sliceNet, sliceDd: row(o.label)!.sliceDd, giveBack: row(o.label)!.giveBack }, nextNeighbourhood: ev?.nextSliceNeighbourhoods.rows[o.label] ?? null } : null,
        RA1: r ? { ...brief(r), failedScreens: failedScreens(r), originalRank: orig.findIndex((e) => e.label === r.label) + 1, next: row(r.label) && { sliceNet: row(r.label)!.sliceNet, sliceDd: row(r.label)!.sliceDd, giveBack: row(r.label)!.giveBack }, nextNeighbourhood: ev?.nextSliceNeighbourhoods.rows[r.label] ?? null } : null,
        RA2: sel.primaries[p].RA2,
        // how many qualified members pass every RA1 screen
        passingAllScreens: pop.filter((e) => e.qualified && failedScreens(e).length === 0).length,
        screenFailures: Object.fromEntries((['S1', 'S2', 'S3', 'S4'] as const).map((s) => [s, pop.filter((e) => e.qualified && failedScreens(e).includes(s)).length]))
      };
    }
    folds[cut] = pops;
  }

  if (!exists('folds', 'sequential.json')) return { folds };

  const seq = sequential();
  const pathOf = (p: string, s: string) => seq.procedures.find((x) => x.population === p && x.selector === s)!.path;
  const verdicts = Object.fromEntries(seq.procedures.map((x) => [`${x.population}/${x.selector}`, { verdict: x.verdict, net: x.path.net, sequentialDd: x.path.sequentialDd, parts: x.path.parts }]));

  return {
    folds,
    verdicts,
    labels: {
      'selection effect within L (RA1 vs original)': label(pathOf('L', 'RA1'), pathOf('L', 'original')),
      'selection effect within B (RA1 vs original)': label(pathOf('B', 'RA1'), pathOf('B', 'original')),
      'selection effect within F (RA1 vs original)': label(pathOf('F', 'RA1'), pathOf('F', 'original')),
      'mechanics effect under the original rule (F vs L)': label(pathOf('F', 'original'), pathOf('L', 'original')),
      'mechanics effect under RA1 (F vs L)': label(pathOf('F', 'RA1'), pathOf('L', 'RA1')),
      'base mechanics effect under the original rule (B vs L)': label(pathOf('B', 'original'), pathOf('L', 'original')),
      'activation effect under the original rule (F vs B)': label(pathOf('F', 'original'), pathOf('B', 'original')),
      'combined (F/RA1 vs L/original)': label(pathOf('F', 'RA1'), pathOf('L', 'original')),
      'RA2 ablation within F (RA2 vs RA1)': label(pathOf('F', 'RA2'), pathOf('F', 'RA1'))
    },
    descriptive: seq.descriptive.map((d) => ({ name: d.name, net: d.net, sequentialDd: d.sequentialDd, parts: d.parts }))
  };
};

const which = process.argv[2];

if (which) {
  if (which === 'coverage' || which === 'all') emit('coverage', coverage());
  if (which === 'families' || which === 'all') emit('families', familiesStudy());
  if (which === 'activation' || which === 'all') emit('activation', activationStudy());
  if (which === 'selection' || which === 'all') emit('selection', selectionStudy());
}
