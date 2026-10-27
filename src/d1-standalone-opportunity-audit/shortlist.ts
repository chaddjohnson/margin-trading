// Stage B (PROTOCOL.md §5): the predeclared shortlist rule applied to the stored final-window census only. No run of
// this study enters it: every input is a stored source metric (or pure arithmetic on stored metrics) and the stored
// same-window VGT primary control. Top-trade concentration is reported but enters neither a gate nor a grade.
import fs from 'fs-extra';
import {
  clusterOf,
  contrastClusters,
  controlInstrument,
  jsonReplacer,
  log,
  nowIso,
  protocolFreezeFile,
  readJson,
  semiconductorFunds,
  shortlistFile,
  shortlistRule,
  vgtPrimaryFinalWindow,
  windows
} from './context.ts';
import { censusFile } from './census.ts';
import type { CensusRow } from './inventory.ts';

const rule = shortlistRule;
const anchorNet = vgtPrimaryFinalWindow.net;
const anchorPerDay = vgtPrimaryFinalWindow.net / vgtPrimaryFinalWindow.heldDays;

export interface Grades {
  merit: number; // S1
  efficiency: number; // S2
  resilience: number; // S3
  persistence: number; // S4
  breadth: number; // S5
  downside: number; // S6
}

export interface Candidate {
  symbol: string;
  cluster: string;
  eligible: boolean;
  gateFailures: string[];
  slotExclusion: string | null; // scored, never placed in a slot
  grades: Grades | null;
  score: number | null;
  order: number | null; // position in the eligible ordering (score desc, net desc, symbol)
  inputs: Record<string, number | string | boolean | null>;
  missing: string[];
  decision: 'merit' | 'diversity' | 'sparse' | 'contrast' | 'not selected' | 'ineligible' | 'excluded from slots';
  reason: string;
  representative: { candidateId: string; description: string; file: string; sha256: string } | null;
  alternative: { candidateId: string; description: string; file: string; sha256: string } | null;
  evidenceCutoffs: { final: string; persistence: string[] };
}

export const gradesOf = (row: CensusRow, survivorWindows: number): Grades => {
  const m = row.representative!.metrics;
  const perDay = m.occupiedDays > 0 ? m.net / m.occupiedDays : 0;
  const share = row.representative!.neighbourhood?.credibleShare ?? 0;
  const yearsWith10k = Object.values(m.yearly).filter((value) => value >= rule.breadthYearNet).length;
  const worst = m.worstTrade ?? 0;

  return {
    merit: m.net >= rule.merit.high * anchorNet ? 2 : m.net >= rule.merit.mid * anchorNet ? 1 : 0,
    efficiency:
      perDay >= rule.efficiency.high * anchorPerDay ? 2 : perDay >= rule.efficiency.mid * anchorPerDay ? 1 : 0,
    resilience: share >= rule.resilience.high - 1e-12 ? 2 : share >= rule.resilience.mid - 1e-12 ? 1 : 0,
    persistence: survivorWindows >= 3 ? 2 : survivorWindows === 2 ? 1 : 0,
    // more than one profitable period, never more points for spreading profit over more years
    breadth: yearsWith10k >= 2 ? 2 : yearsWith10k === 1 ? 1 : 0,
    downside:
      m.minuteDrawdown <= rule.downside.high.minuteDrawdown && worst >= rule.downside.high.worstTrade
        ? 2
        : m.minuteDrawdown <= rule.downside.mid.minuteDrawdown && worst >= rule.downside.mid.worstTrade
          ? 1
          : 0
  };
};

const sumGrades = (grades: Grades) => Object.values(grades).reduce((total, value) => total + value, 0);

export const buildShortlist = (rows: readonly CensusRow[]) => {
  const finals = rows.filter((row) => row.window === 'final');
  const survivorWindowsOf = (symbol: string) =>
    rows.filter((row) => row.symbol === symbol && row.status === 'survivor').length;
  const candidates: Candidate[] = finals.map((row) => {
    const rep = row.representative;
    const m = rep?.metrics;
    const share = rep?.neighbourhood?.credibleShare ?? null;
    const gateFailures: string[] = [];
    const missing: string[] = [];

    if (!rep) {
      gateFailures.push('G1: no representative (no trade in any evaluated vector: unrankable)');
    } else if (!m!.credible) {
      gateFailures.push(
        `G1: representative not credible (trades ${m!.trades} vs ≥ ${row.minTrades}, net ${Math.round(m!.net)}, minute DD ${Math.round(m!.minuteDrawdown)} vs ≤ 35000)`
      );
    }

    if (rep && !rep.neighbourhood) {
      missing.push('stored neighbourhood (the representative was not neighbourhood-checked)');
      gateFailures.push('G2: no stored neighbourhood');
    } else if (share !== null && share < rule.neighbourhoodCredibleShareGate) {
      gateFailures.push(
        `G2: stored neighbourhood credible share ${share.toFixed(4)} < ${rule.neighbourhoodCredibleShareGate}`
      );
    }

    const eligible = gateFailures.length === 0;
    const survivorWindows = survivorWindowsOf(row.symbol);
    const grades = eligible ? gradesOf(row, survivorWindows) : null;
    const alternative = row.library.find((entry) => entry.role === 'alternative-1');
    const slotExclusion =
      row.symbol === controlInstrument
        ? 'the control instrument: its research representative is an unregistered alternative VGT vector; VGT primary is the external control'
        : semiconductorFunds.includes(row.symbol)
          ? 'semiconductor fund: research-only, not presumed eligible for the user’s holdings'
          : null;

    return {
      symbol: row.symbol,
      cluster: clusterOf(row.symbol),
      eligible,
      gateFailures,
      slotExclusion,
      grades,
      score: grades ? sumGrades(grades) : null,
      order: null,
      inputs: {
        status: row.status,
        uncertain: row.uncertain,
        trades: m?.trades ?? null,
        net: m?.net ?? null,
        netShareOfVgtPrimary: m ? m.net / anchorNet : null,
        netPerOccupiedDay: m && m.occupiedDays > 0 ? m.net / m.occupiedDays : null,
        perDayShareOfVgtPrimary: m && m.occupiedDays > 0 ? m.net / m.occupiedDays / anchorPerDay : null,
        neighbourhoodCredibleShare: share,
        neighbourhoodMedianJ: rep?.neighbourhood?.medianJ ?? null,
        survivorWindows,
        statuses: rows
          .filter((other) => other.symbol === row.symbol)
          .map((other) => `${other.window}:${other.status}${other.uncertain ? '*' : ''}`)
          .join(' '),
        yearsWith10k: m ? Object.values(m.yearly).filter((value) => value >= rule.breadthYearNet).length : null,
        minuteDrawdown: m?.minuteDrawdown ?? null,
        worstTrade: m?.worstTrade ?? null,
        top3Share: rep?.derived.top3Share ?? null, // reported only; never a gate or a grade
        coverageMedian: row.liquidity.coverageMedian,
        medianDollarVolume: row.liquidity.medianDollarVolume
      },
      missing,
      decision: eligible ? (slotExclusion ? 'excluded from slots' : 'not selected') : 'ineligible',
      reason: eligible ? '' : gateFailures.join('; '),
      representative: rep
        ? {
            candidateId: rep.candidateId,
            description: rep.description,
            file: rep.phenotypeFile,
            sha256: rep.phenotypeSha256
          }
        : null,
      alternative: alternative
        ? {
            candidateId: alternative.candidateId,
            description: alternative.description,
            file: alternative.file,
            sha256: alternative.sha256
          }
        : null,
      evidenceCutoffs: {
        final: windows.final.searchEnd,
        persistence: [windows['fold-a'].searchEnd, windows['fold-b'].searchEnd, windows.final.searchEnd]
      }
    };
  });

  // The eligible ordering (every eligible symbol, slot-excluded ones included, so their would-be rank is visible).
  const ordered = candidates
    .filter((candidate) => candidate.eligible)
    .sort(
      (a, b) =>
        b.score! - a.score! || (b.inputs.net as number) - (a.inputs.net as number) || (a.symbol < b.symbol ? -1 : 1)
    );

  ordered.forEach((candidate, index) => {
    candidate.order = index + 1;
  });

  // 1. Merit slots: every slot-allowed eligible ETF whose stored final net is at least VGT primary's stored
  //    same-window net (the only ones that could, on the stored record, claim more historical profit than the
  //    control). They do not occupy a cluster for the diversity picks.
  const selected: Candidate[] = [];

  for (const candidate of ordered) {
    if (!candidate.slotExclusion && (candidate.inputs.net as number) >= rule.meritShare * anchorNet) {
      candidate.decision = 'merit';
      candidate.reason = `merit slot: stored final net ${Math.round(candidate.inputs.net as number)} ≥ VGT primary's same-window ${Math.round(anchorNet)} (order ${candidate.order})`;
      selected.push(candidate);
    }
  }

  // 2. Diversity core: in order, at most one ETF per cluster among these picks, until the core is filled.
  const taken = new Map<string, string>();

  for (const candidate of ordered) {
    if (candidate.decision === 'merit') {
      continue;
    }

    if (candidate.slotExclusion) {
      candidate.reason = `scored (order ${candidate.order}) but excluded from slots: ${candidate.slotExclusion}`;
      continue;
    }

    if (selected.length >= rule.coreSlots) {
      candidate.reason = `order ${candidate.order}: the ${rule.coreSlots} merit and diversity slots were filled`;
      continue;
    }

    const holder = taken.get(candidate.cluster);

    if (holder) {
      candidate.reason = `order ${candidate.order}: cluster ${candidate.cluster} already represented by ${holder}`;
      continue;
    }

    taken.set(candidate.cluster, candidate.symbol);
    candidate.decision = 'diversity';
    candidate.reason = `diversity slot ${selected.length + 1}: order ${candidate.order}, the highest-ordered eligible non-merit ETF of cluster ${candidate.cluster}`;
    selected.push(candidate);
  }

  // 3. Sparse slot: a higher-upside candidate with fewer than 10 trades, if the core has none.
  if (!selected.some((candidate) => (candidate.inputs.trades as number) < rule.sparseTrades)) {
    const sparse = ordered
      .filter((candidate) => !candidate.slotExclusion && candidate.decision === 'not selected')
      .filter((candidate) => (candidate.inputs.trades as number) < rule.sparseTrades)
      .sort(
        (a, b) =>
          (b.inputs.net as number) - (a.inputs.net as number) || b.score! - a.score! || (a.symbol < b.symbol ? -1 : 1)
      )[0];

    if (sparse) {
      sparse.decision = 'sparse';
      sparse.reason = `sparse-trade slot: the eligible ETF with fewer than ${rule.sparseTrades} trades and the highest net (order ${sparse.order}); uncertain by construction`;
      selected.push(sparse);
    }
  }

  // 4. Contrast slot: a well-supported defensive/rates ETF, if no selected ETF comes from those clusters.
  if (!selected.some((candidate) => contrastClusters.includes(candidate.cluster))) {
    const contrast = ordered.find(
      (candidate) =>
        !candidate.slotExclusion &&
        candidate.decision === 'not selected' &&
        contrastClusters.includes(candidate.cluster) &&
        candidate.grades!.resilience === 2 &&
        candidate.grades!.persistence >= 1
    );

    if (contrast) {
      contrast.decision = 'contrast';
      contrast.reason = `contrast slot: the highest-ordered eligible ETF of ${contrastClusters.join(' / ')} with full neighbourhood resilience and persistence (order ${contrast.order})`;
      selected.push(contrast);
    }
  }

  // Disclosed counterfactual (not used): the same rule if the merit picks also occupied their clusters.
  const occupied = new Set(
    selected.filter((candidate) => candidate.decision === 'merit').map((candidate) => candidate.cluster)
  );
  const counterfactual = selected
    .filter((candidate) => candidate.decision === 'merit')
    .map((candidate) => candidate.symbol);

  for (const candidate of ordered) {
    if (counterfactual.length >= rule.coreSlots) {
      break;
    }

    if (!candidate.slotExclusion && candidate.decision !== 'merit' && !occupied.has(candidate.cluster)) {
      occupied.add(candidate.cluster);
      counterfactual.push(candidate.symbol);
    }
  }

  if (selected.length > rule.maximumSymbols) {
    throw new Error(`the rule selected ${selected.length} symbols, more than ${rule.maximumSymbols}`);
  }

  return { candidates, ordered, selected, counterfactual };
};

export const writeShortlist = async (options: { force?: boolean } = {}) => {
  if (await fs.pathExists(protocolFreezeFile)) {
    throw new Error(
      `${protocolFreezeFile} exists: the shortlist is frozen (a change is an amendment, never a rewrite)`
    );
  }

  if ((await fs.pathExists(shortlistFile)) && !options.force) {
    throw new Error(`${shortlistFile} exists: the shortlist is written once (PROTOCOL.md §5)`);
  }

  const census = await readJson<{ rows: CensusRow[] }>(censusFile);
  const { candidates, selected, counterfactual } = buildShortlist(census.rows);
  const phenotypes = selected.flatMap((candidate) => [
    {
      id: `${candidate.symbol}:representative`,
      symbol: candidate.symbol,
      role: 'representative',
      ...candidate.representative!
    },
    ...(candidate.alternative
      ? [
          {
            id: `${candidate.symbol}:alternative-1`,
            symbol: candidate.symbol,
            role: 'alternative-1',
            ...candidate.alternative
          }
        ]
      : [])
  ]);
  const record = {
    schema: 'd1-standalone-opportunity-shortlist',
    schemaVersion: 1,
    writtenAt: nowIso(),
    rule: { ...shortlistRule, anchorNet, anchorPerDay, contrastClusters },
    source: censusFile,
    selected: selected.map((candidate) => ({
      symbol: candidate.symbol,
      slot: candidate.decision,
      cluster: candidate.cluster
    })),
    phenotypes,
    control: { id: 'VGT-primary', file: 'config/phenotypes/D1/VGT.json', note: 'registered; the external control' },
    procedureMatchedControl: {
      id: 'VGT:research-representative',
      note: 'VGT final-window research representative: same source procedure and window; research-only, never a candidate'
    },
    counterfactualIfMeritOccupiedClusters: counterfactual,
    candidates
  };

  await fs.outputFile(shortlistFile, `${JSON.stringify(record, jsonReplacer, 1)}\n`);
  log(`shortlist: ${selected.map((candidate) => `${candidate.symbol} (${candidate.decision})`).join(', ')}`);
  log(`phenotypes: ${phenotypes.length} + VGT-primary → ${shortlistFile}`);

  return record;
};
