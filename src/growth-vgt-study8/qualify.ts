// Qualification on the development door (S8/qualify.ts:89-223) and the sealed selection (S8/select.ts): each shortlist
// member's evidence (confirm 3 × 128 pooled, in-box pair, half/wide, 10/20 bps) and gates Q1–Q9, E1, E2; "infeasible on
// training" members forced unqualified; #4's evidence on the same labels (the tier comparator, never a seed); the
// development diagnostics of every member and #4 (profit sources, expanding folds, years, largest winner, profitable
// episodes, losses, exposure, time underwater, winner matching against #4); CSCV PBO (report-only) over the 64 best
// rung-2 configurations × half-years 2018H1 → 2024H2; the selection → confirmation decay.
// Roles (profit / robust / balanced / ≤ 2 ledger-distinct extras) at L∞ ≥ 0.10 in the selection-family order; ranking
// by tier (confirmation robust/yr ≥ #4's) then robust/yr, p90 DD, ID; the primary candidate is rank 1. The freeze seals
// FROZEN_SELECTION.json (committed before the full door opens).
import { pboOf } from '../d1-robust/pbo.ts';
import { spearman } from '../study8-expanded-regime-d1/stats.ts';
import {
  chronology,
  developmentDoor,
  diagnosticCosts,
  eligibility,
  execution,
  folds,
  frozenSelectionFile,
  fullDoor,
  numAxes,
  schedule,
  stresses,
  structAxes,
  testGates
} from './context.ts';
import { type RunOutput, runConfig } from './adapter.ts';
import { type Evidence, evidenceOf, foldConsistency, qualificationOf } from './evidence.ts';
import { compactFit, floorsOf } from './fitness.ts';
import type { Fit } from './fitness.ts';
import type { DoorView, Lab } from './lab.ts';
import { codeDigest, engineDigest, fileSha256, git, log, nowIso, readSealed, sha256, writeSealed } from './seal.ts';
import {
  type Effective,
  type Genome,
  configId,
  control4Genome,
  describe,
  distance,
  effectiveKey,
  effectiveOf,
  structureOf
} from './space.ts';
import { type TradeRow, matchWinners, maxLosingStreak, movesOf, tradesOf, underwaterOf } from './trades.ts';

interface SearchRecord {
  shortlist: {
    rank: number;
    pick: string;
    id: string;
    genome: Genome;
    describe: string;
    selection: { pooled: { nb: Fit['nb'] } };
  }[];
  rung2: { id: string; genome: Genome; violation: number; nb: Fit['nb'] }[];
  bodyHash: string;
}

export const compactEvidence = (ev: Evidence) => {
  const { neighbourNets, neighbourSignatures, fit, centre, ...rest } = ev;
  const { record, ...centreView } = centre;

  void neighbourNets;
  void neighbourSignatures;
  return {
    ...rest,
    fit: compactFit(fit),
    centre: { ...centreView, periods: record.periods, signature: record.signature, record }
  };
};

export const ledgerKeys = (trades: readonly TradeRow[]) =>
  trades.map((t) => `${t.entryTimeUtc}|${t.exitTimeUtc ?? 'open'}`);

// The development diagnostics of one configuration's centre run (report-only, except Q9 which reads its folds).
export const developmentDetail = (out: RunOutput, controlTrades: readonly TradeRow[] | null) => {
  const trades = tradesOf(out);
  const m = out.summary.metrics;
  const winners = trades.filter((t) => t.net > 0).sort((a, b) => b.net - a.net);
  const net = m.pnl.totalMarkedNetUsd;
  const moves = movesOf(trades);
  const daily = out.run.simulation.daily.map((d) => ({ date: d.date, marked: d.marked }));

  return {
    totals: {
      net,
      realized: m.pnl.realizedNetUsd,
      open: net - m.pnl.realizedNetUsd,
      interest: m.pnl.totalInterestUsd,
      costs: m.pnl.totalCostsUsd,
      trades: m.trades.filled,
      closed: m.trades.closed,
      wins: m.trades.wins,
      losses: m.trades.losses,
      breakeven: m.trades.breakeven,
      openAtEnd: m.trades.open,
      exposurePercent: m.occupancy.sessionsInvestedPercent,
      calendarExposurePercent: m.occupancy.calendarTimeInvestedPercent
    },
    drawdown: { minute: m.drawdown.minute, daily: m.drawdown.daily },
    profitSources: {
      largestWinner: winners[0]?.net ?? 0,
      largestWinnerShare: net > 0 && winners[0] ? winners[0].net / net : NaN,
      netExLargest: net - (winners[0]?.net ?? 0),
      netExTop3: net - winners.slice(0, 3).reduce((a, t) => a + t.net, 0),
      moves: moves.length,
      profitableMoves: moves.filter((mv) => mv.reduce((a, t) => a + t.net, 0) > 0).length,
      losingClosed: trades.filter((t) => t.status === 'closed' && t.net < 0).length,
      lossesSum: trades.filter((t) => t.status === 'closed' && t.net < 0).reduce((a, t) => a + t.net, 0),
      worstTrade: trades.length ? Math.min(...trades.map((t) => t.net)) : 0,
      maxLosingStreak: maxLosingStreak(trades),
      byOrigin: Object.fromEntries(
        [...new Set(trades.map((t) => t.origin))].map((o) => [
          o,
          {
            trades: trades.filter((t) => t.origin === o).length,
            net: trades.filter((t) => t.origin === o).reduce((a, t) => a + t.net, 0)
          }
        ])
      )
    },
    underwater: underwaterOf(daily),
    trades,
    matchingVsControl: controlTrades
      ? matchWinners(trades, controlTrades, { first: 0, last: daily.length - 1, retainedTolerance: 2 })
      : null
  };
};

export const runQualification = async (lab: Lab, view: DoorView, searchFile: string, out: string) => {
  const search = await readSealed<SearchRecord>(searchFile);
  const floors = floorsOf(view.y, 2016, 2024);
  const options = { prefix: 'confirm' as const, fold: 'DEV' as const, floors, trainKey: 'DEV' };
  const control = control4Genome();
  const controlOut = runConfig(view.sessions, view.dataSha256, effectiveOf(control));
  const controlDetail = developmentDetail(controlOut, null);
  const candidates = [];

  for (const item of search.shortlist) {
    const evidence = await evidenceOf(lab, item.genome, options);
    const qualification = qualificationOf(evidence, floors, 'DEV');
    const detail = developmentDetail(
      runConfig(view.sessions, view.dataSha256, effectiveOf(item.genome)),
      controlDetail.trades
    );

    if (item.pick === 'infeasible on training') {
      qualification.qualified = false;
      qualification.failed.push('infeasible on training');
    }

    log(
      `${item.id} [${item.pick}] ${qualification.qualified ? 'qualified' : `failed ${qualification.failed.join(',')}`}`
    );
    candidates.push({
      rank: item.rank,
      pick: item.pick,
      id: item.id,
      genome: item.genome,
      structure: structureOf(item.genome),
      effective: effectiveOf(item.genome),
      describe: item.describe,
      trainingSelection: item.selection.pooled.nb,
      evidence: compactEvidence(evidence),
      folds: foldConsistency(evidence),
      qualification,
      detail,
      ledger: ledgerKeys(detail.trades)
    });
  }

  // #4's confirmation evidence on the same door and labels (the tier comparator)
  const controlEvidence = await evidenceOf(lab, control, options);
  const controls = {
    '#4': {
      id: configId(control),
      genome: control,
      effective: effectiveOf(control),
      describe: describe(effectiveOf(control)),
      evidence: compactEvidence(controlEvidence),
      folds: foldConsistency(controlEvidence),
      qualification: qualificationOf(controlEvidence, floors, 'DEV'),
      detail: controlDetail,
      ledger: ledgerKeys(controlDetail.trades)
    }
  };

  // PBO (report-only): the 64 best rung-2 configurations, half-year attributions 2018H1 → 2024H2
  const r2 = [...search.rung2]
    .sort(
      (a, b) =>
        (a.violation === 0 ? 0 : 1) - (b.violation === 0 ? 0 : 1) ||
        b.nb.robustPerYear - a.nb.robustPerYear ||
        (a.id < b.id ? -1 : 1)
    )
    .slice(0, 64);
  const halves = view.ranges.map((r) => r.key).filter((k) => /^\d{4}H[12]$/.test(k) && k >= '2018H1' && k <= '2024H2');
  const blocks = halves.length % 2 === 0 ? halves : halves.slice(1);
  const records = await lab.points(r2.map((item) => effectiveOf(item.genome)));
  const matrix = records.map((record) => blocks.map((key) => record.periods[key] ?? 0));
  const pbo =
    r2.length >= 2 && blocks.length >= 2 ? pboOf(matrix, blocks.length) : { pbo: NaN, splits: 0, configs: r2.length };
  const selectionRobust = candidates.map((c) => c.trainingSelection.robustPerYear);
  const confirmationRobust = candidates.map((c) => c.evidence.decisive.nb.robustPerYear);
  const record = await writeSealed(out, {
    stage: 'QUALIFICATION',
    at: nowIso(),
    search: { file: searchFile, bodyHash: search.bodyHash },
    door: {
      door: view.door,
      first: view.sessions[0]!.date,
      last: view.sessions.at(-1)!.date,
      sessions: view.sessions.length,
      dataSha256: view.dataSha256
    },
    floors,
    candidates,
    controls,
    pbo: { ...pbo, blocks },
    decay: {
      selectionRobustPerYear: selectionRobust,
      confirmationRobustPerYear: confirmationRobust,
      spearman: candidates.length >= 3 ? spearman(selectionRobust, confirmationRobust) : NaN
    }
  });

  log(`qualification sealed ${record.file} ${record.bodyHash.slice(0, 12)}`);
  return record;
};

export const jaccard = (a: readonly string[], b: readonly string[]) => {
  const left = new Set(a);
  const right = new Set(b);
  let both = 0;

  for (const key of left) if (right.has(key)) both++;

  const union = left.size + right.size - both;

  return union ? both / union : 1;
};

export interface Candidate {
  id: string;
  genome: Genome;
  pick: string;
  describe: string;
  effective: Effective;
  trainingSelection: Fit['nb'];
  qualification: { qualified: boolean; failed: string[]; marginal: boolean };
  ledger: string[];
  evidence: { decisive: { nb: Fit['nb'] } };
}

// S8/select.ts assignRoles, on this genome's distance.
export const assignRoles = (list: readonly Candidate[]) => {
  const byId = (a: Candidate, b: Candidate) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
  const taken: Candidate[] = [];
  const out: { role: string; holder: Candidate | null }[] = [];
  const assign = (role: string, ordered: readonly Candidate[]) => {
    const holder = ordered.find(
      (c) =>
        c.qualification.qualified &&
        !taken.includes(c) &&
        taken.every((t) => distance(c.genome, t.genome) >= schedule.distinct) &&
        (role !== 'extra' || taken.every((t) => jaccard(c.ledger, t.ledger) < 0.5))
    );

    if (holder) {
      taken.push(holder);
      out.push({ role, holder });
    } else if (role !== 'extra') out.push({ role, holder: null });

    return holder;
  };
  const sel = (c: Candidate) => c.trainingSelection;
  const profitOrder = [...list].sort(
    (a, b) => sel(b).robustPerYear - sel(a).robustPerYear || sel(a).p90Dd - sel(b).p90Dd || byId(a, b)
  );

  assign('profit', profitOrder);

  const leader = taken[0] ?? profitOrder[0];

  assign(
    'robust',
    list
      .filter((c) => !leader || sel(c).medianPerYear >= 0.5 * sel(leader).medianPerYear)
      .sort((a, b) => sel(b).share - sel(a).share || sel(a).p90Dd - sel(b).p90Dd || byId(a, b))
  );
  assign(
    'balanced',
    [...list].sort(
      (a, b) =>
        sel(b).robustPerYear / sel(b).p90Dd - sel(a).robustPerYear / sel(a).p90Dd ||
        sel(a).p90Dd - sel(b).p90Dd ||
        byId(a, b)
    )
  );

  for (let k = 0; k < 2; k++) if (!assign('extra', list)) break;

  return out;
};

export const rulebook = () => ({
  eligibility,
  testGates,
  stresses,
  diagnosticCosts,
  schedule,
  execution,
  chronology,
  folds,
  developmentDoor,
  fullDoor,
  box: { structural: structAxes, numeric: numAxes }
});

export const runFreeze = async (qualificationFile: string, searchFile: string, protocolCommit: string) => {
  const qualification = await readSealed<{
    candidates: (Candidate & { pick: string; rank: number })[];
    controls: { '#4': { id: string; evidence: { decisive: { nb: Fit['nb'] } } } };
    bodyHash: string;
  }>(qualificationFile);
  const roles = assignRoles(qualification.candidates);
  const control = qualification.controls['#4'].evidence.decisive.nb;
  const holders = roles
    .filter((r) => r.holder)
    .map((r) => {
      const h = r.holder!;

      return {
        role: r.role,
        id: h.id,
        genome: h.genome,
        effective: h.effective,
        describe: h.describe,
        tier: h.evidence.decisive.nb.robustPerYear >= control.robustPerYear ? 'strong' : 'modest',
        robustPerYear: h.evidence.decisive.nb.robustPerYear,
        controlRobustPerYear: control.robustPerYear,
        confirmation: h.evidence.decisive.nb,
        selection: h.trainingSelection,
        marginal: h.qualification.marginal
      };
    })
    .sort(
      (a, b) =>
        (a.tier === b.tier ? 0 : a.tier === 'strong' ? -1 : 1) ||
        b.robustPerYear - a.robustPerYear ||
        a.confirmation.p90Dd - b.confirmation.p90Dd ||
        (a.id < b.id ? -1 : 1)
    )
    .map((row, index) => ({ rank: index + 1, ...row }));
  const book = rulebook();
  const record = await writeSealed(frozenSelectionFile, {
    stage: 'FROZEN_SELECTION',
    at: nowIso(),
    git: { head: git('rev-parse HEAD'), protocolCommit },
    protocol: { sha256: await fileSha256('research/growth-vgt-study8/PROTOCOL.md') },
    code: await codeDigest(),
    engine: await engineDigest(),
    data: { developmentPrefixSha256: developmentDoor.prefixSha256, fullFileSha256: fullDoor.fileSha256 },
    rulebook: { sha256: sha256(JSON.stringify(book)), values: book },
    records: {
      search: { file: searchFile, sha256: await fileSha256(searchFile) },
      qualification: {
        file: qualificationFile,
        sha256: await fileSha256(qualificationFile),
        bodyHash: qualification.bodyHash
      }
    },
    shortlist: qualification.candidates.map((c) => ({
      rank: c.rank,
      pick: c.pick,
      id: c.id,
      configSha256: sha256(effectiveKey(c.effective)),
      describe: c.describe,
      effective: c.effective,
      qualified: c.qualification.qualified,
      failed: c.qualification.failed,
      marginal: c.qualification.marginal
    })),
    roles: roles.map((r) => ({ role: r.role, id: r.holder?.id ?? null })),
    ranked: holders,
    primary: holders[0] ? { id: holders[0].id, role: holders[0].role, describe: holders[0].describe } : null,
    outcome: holders.length
      ? 'qualified role holders exist'
      : 'no candidate qualified (pre-registered outcome: no challenger)',
    control4: { id: qualification.controls['#4'].id, confirmation: control },
    validationPlan: {
      first: 'browser parity replay of #4 on 2016-01-04 → 2026-10-30 through the unchanged Strategy Lab runner (P2)',
      door: 'the whole canonical file (sha256 pinned), recorded splits forward-adjusted; opened once, after this file is committed',
      window: `${chronology.validationStart} → ${chronology.validationEnd} inside one continuous causal run from ${chronology.firstSession}`,
      evaluated: 'every shortlist member (role holders first, in rank order) and #4, including failures',
      gates: 'T1–T7 (Study 8, single book; T4 at 10 bps), veto only: never reorder, replace or rescue',
      families: 'test 1–3 (3 × 128) + in-box pair + half/wide; labels test/V/VAL/rep',
      reported:
        'development and validation columns; validation net from the 2024 close mark; validation drawdown from a peak initialized at that mark on minute marks; carried-in position split at the boundary; winner matching against #4 on the same dates'
    }
  });

  log(
    `selection frozen ${record.file} ${record.bodyHash.slice(0, 12)}; primary ${holders[0]?.id ?? 'none'} ${holders[0] ? describe(holders[0].effective) : ''}`
  );
  return record;
};
