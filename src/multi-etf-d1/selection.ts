// The predeclared selection rule (PROTOCOL.md section 5), applied to a fold's candidate pool on the fold's TRAINING
// window only, probed for plateaus, and attributed to the validation window; on the final fold it produces the
// nominations that the freeze records. Every threshold is a protocol constant.
import path from 'node:path';
import fs from 'fs-extra';
import type { Metrics, SegmentSummary } from '../d1-refinement/evaluate.ts';
import type { IntParams } from '../d1-refinement/families.ts';
import { csvLine } from '../d1-refinement/report.ts';
import { type Ticker, formatDollars, log, protocol, stageDir, writeJson, writeText } from './context.ts';
import type { TickerData } from './data.ts';
import { cachesFor, developmentSpec, evaluateOne, trainLabel, validLabel } from './evaluation.ts';
import type { Candidate, SearchRecord } from './search.ts';
import type { Genome } from './space.ts';
import { d1Keys } from './context.ts';
import { d1Id, describe, fractionsOf, paramsToGenome, probeParams, probeCount } from './space.ts';
import { writeDetail } from './detail.ts';

// What the selection needs from the search cache (SearchCache satisfies it; tests use a fake).
export interface CandidatePool {
  readonly entries: Map<string, Candidate>;
  pool(foldIndex: number): Candidate[];
  evaluate(genomes: Genome[], origin: string, foldIndex: number): Promise<Candidate[]>;
}

export interface View {
  net: number;
  minuteDrawdown: number;
  dailyDrawdown: number;
  entries: number;
  exits: number;
  wins: number;
  losses: number;
  startDate: string;
  endDate: string;
}

const emptyView: View = {
  net: NaN,
  minuteDrawdown: NaN,
  dailyDrawdown: NaN,
  entries: 0,
  exits: 0,
  wins: 0,
  losses: 0,
  startDate: '',
  endDate: ''
};

const viewOfSegment = (segment: SegmentSummary | undefined): View =>
  segment
    ? {
        net: segment.net,
        minuteDrawdown: segment.minuteDrawdown,
        dailyDrawdown: segment.dailyDrawdown,
        entries: segment.entries,
        exits: segment.exits,
        wins: segment.wins,
        losses: segment.losses,
        startDate: segment.startDate,
        endDate: segment.endDate
      }
    : emptyView;

// A candidate's metrics restricted to one window of the development run.
export const viewOf = (metrics: Metrics, label: string): View =>
  viewOfSegment(metrics.segments.find((segment) => segment.label === label));

export const feasible = (view: View, minEntries: number) =>
  Number.isFinite(view.net) && view.minuteDrawdown <= protocol.drawdownCeiling && view.entries >= minEntries;

export interface PlateauStats {
  probes: number;
  inBox: number;
  feasibleShare: number;
  medianNetShare: number;
  minNetShare: number;
  pass: boolean;
}

export const plateauOf = (candidateView: View, probeViews: View[], minEntries: number): PlateauStats => {
  const nets = probeViews.map((view) => view.net).filter((value) => Number.isFinite(value));
  const sorted = [...nets].sort((a, b) => a - b);
  const median =
    sorted.length === 0
      ? NaN
      : sorted.length % 2 === 1
        ? sorted[(sorted.length - 1) / 2]!
        : (sorted[sorted.length / 2 - 1]! + sorted[sorted.length / 2]!) / 2;
  const feasibleShare =
    probeViews.length === 0 ? 0 : probeViews.filter((view) => feasible(view, minEntries)).length / probeViews.length;
  const medianNetShare = candidateView.net > 0 ? median / candidateView.net : NaN;
  const minNetShare = candidateView.net > 0 && sorted.length > 0 ? sorted[0]! / candidateView.net : NaN;

  return {
    probes: probeCount(),
    inBox: probeViews.length,
    feasibleShare,
    medianNetShare,
    minNetShare,
    pass:
      candidateView.net > 0 &&
      feasibleShare >= protocol.selection.plateauFeasibleShare &&
      medianNetShare >= protocol.selection.plateauMedianShare
  };
};

export type Policy = 'primary' | 'lowDd' | 'maxNet';

export const policyDescriptions: Record<Policy, string> = {
  primary: `highest training net among plateau candidates that beat frozen D1, preferring minute DD ≤ $${protocol.preferredDrawdown.toLocaleString('en-US')} when one exists`,
  lowDd: `lowest minute DD among plateau candidates keeping ≥ ${protocol.selection.lowDdNetShare * 100}% of the primary's net, with a lower DD and a distinct trade signature`,
  maxNet: 'highest training net among plateau candidates, when it is not the primary and has a distinct trade signature'
};

export interface Pick {
  policy: Policy;
  id: string;
  params: IntParams;
  description: string;
  origin: string;
  train: View;
  validation?: View;
  development: View;
  plateau: PlateauStats;
  signature: string;
  closedTradesDevelopment: number;
  sparse: boolean;
}

export interface ProbedCandidate {
  candidate: Candidate;
  train: View;
  plateau: PlateauStats;
}

export interface FoldSelection {
  fold: string;
  foldIndex: number;
  trainLabel: string;
  validationLabel?: string;
  minEntries: number;
  pool: number;
  feasible: number;
  beatingD1: number;
  distinctSignatures: number;
  d1: { id: string; train: View; validation?: View; feasible: boolean };
  probed: { id: string; params: IntParams; train: View; plateau: PlateauStats; list: 'net' | 'drawdown' }[];
  policies: { policy: Policy; pick?: Pick; reason: string }[];
}

const distinctBySignature = (candidates: Candidate[]) => {
  const seen = new Set<string>();
  const out: Candidate[] = [];

  for (const candidate of candidates) {
    if (!seen.has(candidate.metrics.signature)) {
      seen.add(candidate.metrics.signature);
      out.push(candidate);
    }
  }

  return out;
};

const byId = (a: Candidate, b: Candidate) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);

// Probes a shortlist until at least one candidate passes the plateau check or the list is exhausted, extending it
// by `shortlistSize` at a time up to `maxShortlist`.
const probeShortlist = async (
  ordered: Candidate[],
  cache: CandidatePool,
  label: string,
  foldIndex: number,
  foldKey: string,
  minEntries: number,
  probed: Map<string, ProbedCandidate>
) => {
  const { shortlistSize, maxShortlist } = protocol.selection;
  const results: ProbedCandidate[] = [];

  for (let taken = 0; taken < Math.min(maxShortlist, ordered.length); taken += shortlistSize) {
    const batch = ordered.slice(taken, taken + shortlistSize);
    const genomes = batch.flatMap((candidate) =>
      probeParams(candidate.params).map((probe) => paramsToGenome(probe.params))
    );
    const evaluated = await cache.evaluate(genomes, `probe:${foldKey}`, foldIndex);
    let offset = 0;

    for (const candidate of batch) {
      const count = probeParams(candidate.params).length;
      const views = evaluated.slice(offset, offset + count).map((probe) => viewOf(probe.metrics, label));
      const train = viewOf(candidate.metrics, label);
      const entry: ProbedCandidate = { candidate, train, plateau: plateauOf(train, views, minEntries) };

      offset += count;
      probed.set(candidate.id, entry);
      results.push(entry);
    }

    if (results.some((entry) => entry.plateau.pass)) {
      break;
    }
  }

  return results;
};

const toPick = (policy: Policy, entry: ProbedCandidate, validationLabel: string | undefined): Pick => ({
  policy,
  id: entry.candidate.id,
  params: entry.candidate.params,
  description: describe(entry.candidate.params),
  origin: entry.candidate.origin,
  train: entry.train,
  validation: validationLabel ? viewOf(entry.candidate.metrics, validationLabel) : undefined,
  development: viewOf(entry.candidate.metrics, 'development'),
  plateau: entry.plateau,
  signature: entry.candidate.metrics.signature,
  closedTradesDevelopment: entry.candidate.metrics.closedTrades,
  sparse: entry.candidate.metrics.closedTrades < protocol.sparseTrades
});

export const selectOnFold = async (
  ticker: string,
  data: TickerData,
  cache: CandidatePool,
  fold: { key: string; validation?: { start: number; end: number } },
  foldIndex: number,
  minEntries: number
): Promise<FoldSelection> => {
  const label = trainLabel(fold.key);
  const validationLabel = fold.validation ? validLabel(fold.key) : undefined;
  const pool = cache.pool(foldIndex);
  const d1 = cache.entries.get(d1Id());

  if (!d1) {
    throw new Error(`${ticker}: the D1 control is not in the cache`);
  }

  const d1Train = viewOf(d1.metrics, label);
  const feasibleOnes = pool.filter(
    (candidate) => candidate.id !== d1.id && feasible(viewOf(candidate.metrics, label), minEntries)
  );
  const beating = feasibleOnes.filter((candidate) => viewOf(candidate.metrics, label).net > d1Train.net);
  const netOrder = (a: Candidate, b: Candidate) => {
    const va = viewOf(a.metrics, label);
    const vb = viewOf(b.metrics, label);

    return vb.net - va.net || va.minuteDrawdown - vb.minuteDrawdown || byId(a, b);
  };
  const byNet = distinctBySignature([...beating].sort(netOrder));
  const bestNet = byNet[0] ? viewOf(byNet[0].metrics, label).net : -Infinity;
  const byDrawdown = distinctBySignature(
    beating
      .filter((candidate) => viewOf(candidate.metrics, label).net >= protocol.selection.lowDdNetShare * bestNet)
      .sort((a, b) => {
        const va = viewOf(a.metrics, label);
        const vb = viewOf(b.metrics, label);

        return va.minuteDrawdown - vb.minuteDrawdown || vb.net - va.net || byId(a, b);
      })
  );
  const probed = new Map<string, ProbedCandidate>();
  const probedNet = await probeShortlist(byNet, cache, label, foldIndex, fold.key, minEntries, probed);
  const probedDd = await probeShortlist(byDrawdown, cache, label, foldIndex, fold.key, minEntries, probed);
  const eligibleNet = probedNet.filter((entry) => entry.plateau.pass);
  const eligibleDd = probedDd.filter((entry) => entry.plateau.pass);
  const policies: FoldSelection['policies'] = [];

  // Primary.
  const preferred = eligibleNet.filter((entry) => entry.train.minuteDrawdown <= protocol.preferredDrawdown);
  const primaryEntry = (preferred.length > 0 ? preferred : eligibleNet).sort((a, b) =>
    netOrder(a.candidate, b.candidate)
  )[0];
  const primary = primaryEntry ? toPick('primary', primaryEntry, validationLabel) : undefined;

  policies.push({
    policy: 'primary',
    pick: primary,
    reason: primary
      ? preferred.length > 0
        ? `highest net among ${preferred.length} plateau candidates with DD ≤ $${protocol.preferredDrawdown.toLocaleString('en-US')} (${eligibleNet.length} plateau candidates probed in the net list)`
        : `no plateau candidate under the preferred DD band; highest net among ${eligibleNet.length} plateau candidates`
      : beating.length === 0
        ? `no feasible candidate beats D1 on the training window (${feasibleOnes.length} feasible, D1 net ${Math.round(d1Train.net)})`
        : `none of the ${probedNet.length} probed candidates passed the plateau check`
  });

  // maxNet alternate: a higher-net plateau candidate than the primary with a distinct signature.
  const maxNetEntry = primary
    ? eligibleNet
        .filter(
          (entry) => entry.train.net > primary.train.net && entry.candidate.metrics.signature !== primary.signature
        )
        .sort((a, b) => netOrder(a.candidate, b.candidate))[0]
    : undefined;

  policies.push({
    policy: 'maxNet',
    pick: maxNetEntry ? toPick('maxNet', maxNetEntry, validationLabel) : undefined,
    reason: maxNetEntry
      ? 'higher training net than the primary, plateau, distinct signature'
      : primary
        ? 'the primary is already the highest-net plateau candidate (or no distinct one exists)'
        : 'no primary'
  });

  // lowDd alternate.
  const lowDdEntry = primary
    ? eligibleDd
        .filter(
          (entry) =>
            entry.train.minuteDrawdown < primary.train.minuteDrawdown &&
            entry.train.net >= protocol.selection.lowDdNetShare * primary.train.net &&
            entry.candidate.metrics.signature !== primary.signature &&
            entry.candidate.metrics.signature !== maxNetEntry?.candidate.metrics.signature
        )
        .sort(
          (a, b) =>
            a.train.minuteDrawdown - b.train.minuteDrawdown ||
            b.train.net - a.train.net ||
            byId(a.candidate, b.candidate)
        )[0]
    : undefined;

  policies.push({
    policy: 'lowDd',
    pick: lowDdEntry ? toPick('lowDd', lowDdEntry, validationLabel) : undefined,
    reason: lowDdEntry
      ? 'lowest DD among plateau candidates keeping the net share, distinct signature'
      : primary
        ? 'no plateau candidate with a lower DD keeps the net share (or none is distinct)'
        : 'no primary'
  });

  return {
    fold: fold.key,
    foldIndex,
    trainLabel: label,
    validationLabel,
    minEntries,
    pool: pool.length,
    feasible: feasibleOnes.length,
    beatingD1: beating.length,
    distinctSignatures: new Set(beating.map((candidate) => candidate.metrics.signature)).size,
    d1: {
      id: d1.id,
      train: d1Train,
      validation: validationLabel ? viewOf(d1.metrics, validationLabel) : undefined,
      feasible: feasible(d1Train, minEntries)
    },
    probed: [...probed.values()].map((entry) => ({
      id: entry.candidate.id,
      params: entry.candidate.params,
      train: entry.train,
      plateau: entry.plateau,
      list: probedNet.includes(entry) ? 'net' : 'drawdown'
    })),
    policies
  };
};

export const writeCandidatesCsv = async (file: string, candidates: Candidate[], folds: string[]) => {
  const header = [
    'id',
    'origin',
    'fold_index',
    ...d1Keys,
    'dev_net',
    'dev_minute_dd',
    'dev_daily_dd',
    'dev_entries',
    'dev_closed',
    'dev_wins',
    'dev_losses',
    'dev_worst_trade',
    'dev_worst_excursion',
    'dev_best_trade',
    'dev_net_without_best',
    'dev_interest',
    'dev_exposure',
    'dev_avg_hold_days',
    'signature',
    ...folds.flatMap((fold) => [
      `${fold}_train_net`,
      `${fold}_train_dd`,
      `${fold}_train_entries`,
      `${fold}_valid_net`,
      `${fold}_valid_dd`,
      `${fold}_valid_entries`
    ])
  ];
  const lines = [csvLine(header)];

  for (const candidate of [...candidates].sort(byId)) {
    const m = candidate.metrics;

    lines.push(
      csvLine([
        candidate.id,
        candidate.origin,
        candidate.foldIndex,
        ...d1Keys.map((key) => candidate.params[key]),
        m.net,
        m.minuteDrawdown,
        m.dailyDrawdown,
        m.entries,
        m.closedTrades,
        m.wins,
        m.losses,
        m.worstTrade,
        m.worstAdverseExcursion,
        m.bestTrade,
        m.netWithoutBestTrade,
        m.interest,
        m.exposure,
        m.averageHoldDays,
        m.signature,
        ...folds.flatMap((fold) => {
          const train = viewOf(m, trainLabel(fold));
          const valid = viewOf(m, validLabel(fold));

          return [train.net, train.minuteDrawdown, train.entries, valid.net, valid.minuteDrawdown, valid.entries];
        })
      ])
    );
  }

  await fs.outputFile(file, `${lines.join('\n')}\n`);
};

// The feasible non-dominated front on the development window (maximize net, minimize minute DD), distinct trade
// signatures, with the D1 control appended for reference.
export const paretoFront = (candidates: Candidate[]) => {
  const feasibleOnes = candidates.filter(
    (candidate) =>
      candidate.id !== d1Id() &&
      Number.isFinite(candidate.metrics.net) &&
      candidate.metrics.minuteDrawdown <= protocol.drawdownCeiling
  );
  const unique = distinctBySignature(
    [...feasibleOnes].sort(
      (a, b) => b.metrics.net - a.metrics.net || a.metrics.minuteDrawdown - b.metrics.minuteDrawdown || byId(a, b)
    )
  );
  const front: Candidate[] = [];
  let bestDrawdown = Infinity;

  for (const candidate of unique) {
    if (candidate.metrics.minuteDrawdown < bestDrawdown) {
      front.push(candidate);
      bestDrawdown = candidate.metrics.minuteDrawdown;
    }
  }

  return front;
};

export const writeParetoCsv = async (file: string, candidates: Candidate[]) => {
  const d1 = candidates.find((candidate) => candidate.id === d1Id());
  const rows = [...paretoFront(candidates), ...(d1 ? [d1] : [])];
  const lines = [
    csvLine([
      'id',
      'origin',
      ...d1Keys,
      'dev_net',
      'dev_minute_dd',
      'dev_daily_dd',
      'dev_entries',
      'dev_closed',
      'dev_wins',
      'dev_losses',
      'dev_worst_trade',
      'dev_exposure',
      'signature'
    ])
  ];

  for (const candidate of rows) {
    const m = candidate.metrics;

    lines.push(
      csvLine([
        candidate.id,
        candidate.origin,
        ...d1Keys.map((key) => candidate.params[key]),
        m.net,
        m.minuteDrawdown,
        m.dailyDrawdown,
        m.entries,
        m.closedTrades,
        m.wins,
        m.losses,
        m.worstTrade,
        m.exposure,
        m.signature
      ])
    );
  }

  await fs.outputFile(file, `${lines.join('\n')}\n`);
};

export interface Nomination {
  role: 'primary' | 'alternate-lowDd' | 'alternate-maxNet';
  policy: Policy;
  id: string;
  params: IntParams;
  fractions: Record<string, number>;
  description: string;
  origin: string;
  development: View;
  metrics: {
    net: number;
    minuteDrawdown: number;
    dailyDrawdown: number;
    interest: number;
    entries: number;
    closedTrades: number;
    wins: number;
    losses: number;
    openAtEnd: boolean;
    exposure: number;
    averageHoldDays: number;
    bestTrade: number;
    worstTrade: number;
    worstAdverseExcursion: number;
    netWithoutBestTrade: number;
    maximumLosingStreak: number;
    exitReasons: Record<string, number>;
    signature: string;
  };
  years: Record<string, View>;
  plateau: PlateauStats;
  sparse: boolean;
  walkForward: { fold: string; policy: Policy; pickId: string; validation?: View; d1Validation?: View }[];
}

export interface TickerSelection {
  ticker: string;
  dataHash: string;
  selectedAt: string;
  eligibilityDate: string;
  developmentEndDate: string;
  candidatesEvaluated: number;
  control: Nomination['metrics'] & { id: string; params: IntParams; description: string; years: Record<string, View> };
  nominations: Nomination[];
  walkForward: {
    folds: {
      fold: string;
      validationStart?: string;
      validationEnd?: string;
      minEntries: number;
      d1Validation?: View;
      picks: { policy: Policy; id?: string; validation?: View; trainNet?: number; trainDd?: number }[];
    }[];
    stitched: Record<Policy, { net: number; folds: number; foldsBeatingD1: number; pass: boolean; d1Net: number }>;
  };
  notes: string[];
}

const metricsOf = (metrics: Metrics): Nomination['metrics'] => ({
  net: metrics.net,
  minuteDrawdown: metrics.minuteDrawdown,
  dailyDrawdown: metrics.dailyDrawdown,
  interest: metrics.interest,
  entries: metrics.entries,
  closedTrades: metrics.closedTrades,
  wins: metrics.wins,
  losses: metrics.losses,
  openAtEnd: metrics.openAtEnd,
  exposure: metrics.exposure,
  averageHoldDays: metrics.averageHoldDays,
  bestTrade: metrics.bestTrade,
  worstTrade: metrics.worstTrade,
  worstAdverseExcursion: metrics.worstAdverseExcursion,
  netWithoutBestTrade: metrics.netWithoutBestTrade,
  maximumLosingStreak: metrics.maximumLosingStreak,
  exitReasons: metrics.exitReasons,
  signature: metrics.signature
});

const yearsOf = (metrics: Metrics) =>
  Object.fromEntries(
    metrics.segments
      .filter((segment) => /^\d{4}$/.test(segment.label))
      .map((segment) => [segment.label, viewOfSegment(segment)])
  );

// The final fold's picks become the nominations; the walk-forward of every earlier fold is summarized alongside.
export const finalizeSelection = async (
  ticker: Ticker | string,
  data: TickerData,
  record: SearchRecord,
  candidates: Candidate[]
) => {
  const { ds } = data;
  const byIdMap = new Map(candidates.map((candidate) => [candidate.id, candidate]));
  const finalFold = record.selections.find((selection) => selection.fold === 'final');
  const d1 = byIdMap.get(d1Id());

  if (!finalFold || !d1) {
    throw new Error(`${ticker}: no final selection or no D1 control`);
  }

  const validationFolds = record.selections.filter((selection) => selection.validationLabel);
  const policyList: Policy[] = ['primary', 'lowDd', 'maxNet'];
  const stitched = Object.fromEntries(
    policyList.map((policy) => {
      let net = 0;
      let d1Net = 0;
      let folds = 0;
      let beating = 0;

      for (const selection of validationFolds) {
        const pick = selection.policies.find((entry) => entry.policy === policy)?.pick;
        const d1Validation = selection.d1.validation!;

        d1Net += d1Validation.net;

        if (pick?.validation) {
          folds++;
          net += pick.validation.net;

          if (pick.validation.net >= d1Validation.net) {
            beating++;
          }
        }
      }

      return [
        policy,
        {
          net,
          folds,
          foldsBeatingD1: beating,
          pass: folds > 0 && beating * 2 >= validationFolds.length && net > d1Net,
          d1Net
        }
      ];
    })
  ) as TickerSelection['walkForward']['stitched'];
  const nominations: Nomination[] = [];
  const roles: Record<Policy, Nomination['role']> = {
    primary: 'primary',
    lowDd: 'alternate-lowDd',
    maxNet: 'alternate-maxNet'
  };

  for (const policy of policyList) {
    const pick = finalFold.policies.find((entry) => entry.policy === policy)?.pick;

    if (!pick) {
      continue;
    }

    const candidate = byIdMap.get(pick.id)!;

    nominations.push({
      role: roles[policy],
      policy,
      id: pick.id,
      params: pick.params,
      fractions: fractionsOf(pick.params),
      description: pick.description,
      origin: pick.origin,
      development: pick.development,
      metrics: metricsOf(candidate.metrics),
      years: yearsOf(candidate.metrics),
      plateau: pick.plateau,
      sparse: pick.sparse,
      walkForward: validationFolds.map((selection) => {
        const foldPick = selection.policies.find((entry) => entry.policy === policy)?.pick;

        return {
          fold: selection.fold,
          policy,
          pickId: foldPick?.id ?? '',
          validation: foldPick?.validation,
          d1Validation: selection.d1.validation
        };
      })
    });
  }

  const notes: string[] = [];

  if (nominations.length === 0) {
    notes.push(
      'no defensible candidate: nothing feasible beats frozen D1 on the development window, or nothing passes the plateau check'
    );
  }

  for (const nomination of nominations) {
    if (nomination.sparse) {
      notes.push(
        `${nomination.role} ${nomination.id}: ${nomination.metrics.closedTrades} closed trades on the development window — insufficient evidence`
      );
    }
  }

  if (d1.metrics.closedTrades < protocol.sparseTrades) {
    notes.push(`frozen D1: ${d1.metrics.closedTrades} closed trades on the development window — insufficient evidence`);
  }

  const selection: TickerSelection = {
    ticker: String(ticker),
    dataHash: data.dataHash,
    selectedAt: new Date().toISOString(),
    eligibilityDate: ds.dates[data.eligibility]!,
    developmentEndDate: ds.lastDate,
    candidatesEvaluated: candidates.length,
    control: {
      id: d1.id,
      params: d1.params,
      description: describe(d1.params),
      ...metricsOf(d1.metrics),
      years: yearsOf(d1.metrics)
    },
    nominations,
    walkForward: {
      folds: validationFolds.map((selection) => ({
        fold: selection.fold,
        validationStart: selection.d1.validation?.startDate,
        validationEnd: selection.d1.validation?.endDate,
        minEntries: selection.minEntries,
        d1Validation: selection.d1.validation,
        picks: policyList.map((policy) => {
          const pick = selection.policies.find((entry) => entry.policy === policy)?.pick;

          return {
            policy,
            id: pick?.id,
            validation: pick?.validation,
            trainNet: pick?.train.net,
            trainDd: pick?.train.minuteDrawdown
          };
        })
      })),
      stitched
    },
    notes
  };
  const dir = stageDir('selection', String(ticker));

  await writeJson(path.join(dir, 'selection.json'), selection);

  // Detail artifacts of the control and every nomination on the development run.
  const caches = cachesFor(ds);
  const spec = developmentSpec(data);

  for (const entry of [
    { role: 'control', id: d1.id, params: d1.params, label: 'D1 unchanged' },
    ...nominations.map((nomination) => ({
      role: nomination.role,
      id: nomination.id,
      params: nomination.params,
      label: nomination.description
    }))
  ]) {
    const { metrics, detail } = evaluateOne(ds, caches, entry.params, spec, true);

    await writeDetail(
      path.join(dir, entry.role),
      ds,
      {
        ticker: String(ticker),
        label: entry.label,
        role: entry.role,
        params: entry.params,
        dataHash: data.dataHash,
        dataFile: data.dataFile
      },
      spec,
      metrics,
      detail!,
      data.developmentEnd
    );
  }

  await writeText(path.join(dir, 'selection.md'), selectionMarkdown(selection, record));
  await writeParetoCsv(path.join(dir, 'pareto.csv'), candidates);
  log(
    `${ticker}: ${nominations.length} nominations (${nominations.map((nomination) => `${nomination.role} ${nomination.description} net ${formatDollars(nomination.metrics.net)} DD ${formatDollars(nomination.metrics.minuteDrawdown)}`).join('; ') || 'none'})`
  );

  return selection;
};

const viewCell = (view?: View) =>
  view && Number.isFinite(view.net)
    ? `${formatDollars(view.net)} / DD ${formatDollars(view.minuteDrawdown)} / ${view.entries}e`
    : '—';

export const selectionMarkdown = (selection: TickerSelection, record: SearchRecord) => {
  const lines = [
    `# ${selection.ticker}: development selection (generated ${selection.selectedAt})`,
    '',
    `Candidates evaluated: ${selection.candidatesEvaluated.toLocaleString('en-US')} (Sobol ${record.sobol.unique}, GA ${record.ga.map((summary) => `${summary.fold} ${summary.newEvaluations}`).join(', ')}). Development window ${selection.eligibilityDate} → ${selection.developmentEndDate}.`,
    '',
    '## Control and nominations (development window)',
    '',
    '| Role | Parameters | Net | Minute DD | Daily DD | Entries | W/L | Worst trade | Worst excursion | Best trade | Net w/o best | Interest | Exposure | Avg hold | Plateau (feasible share / median share) | Sparse |',
    '|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|---|',
    `| control (D1) | ${selection.control.description} | ${formatDollars(selection.control.net)} | ${formatDollars(selection.control.minuteDrawdown)} | ${formatDollars(selection.control.dailyDrawdown)} | ${selection.control.entries}${selection.control.openAtEnd ? ' (1 open)' : ''} | ${selection.control.wins}/${selection.control.losses} | ${formatDollars(selection.control.worstTrade)} | ${formatDollars(selection.control.worstAdverseExcursion)} | ${formatDollars(selection.control.bestTrade)} | ${formatDollars(selection.control.netWithoutBestTrade)} | ${formatDollars(selection.control.interest)} | ${(selection.control.exposure * 100).toFixed(0)}% | ${selection.control.averageHoldDays.toFixed(0)} d | — | ${selection.control.closedTrades < protocol.sparseTrades ? 'yes' : 'no'} |`,
    ...selection.nominations.map(
      (nomination) =>
        `| ${nomination.role} | ${nomination.description} | ${formatDollars(nomination.metrics.net)} | ${formatDollars(nomination.metrics.minuteDrawdown)} | ${formatDollars(nomination.metrics.dailyDrawdown)} | ${nomination.metrics.entries}${nomination.metrics.openAtEnd ? ' (1 open)' : ''} | ${nomination.metrics.wins}/${nomination.metrics.losses} | ${formatDollars(nomination.metrics.worstTrade)} | ${formatDollars(nomination.metrics.worstAdverseExcursion)} | ${formatDollars(nomination.metrics.bestTrade)} | ${formatDollars(nomination.metrics.netWithoutBestTrade)} | ${formatDollars(nomination.metrics.interest)} | ${(nomination.metrics.exposure * 100).toFixed(0)}% | ${nomination.metrics.averageHoldDays.toFixed(0)} d | ${nomination.plateau.pass ? 'pass' : 'fail'} (${(nomination.plateau.feasibleShare * 100).toFixed(0)}% / ${(nomination.plateau.medianNetShare * 100).toFixed(0)}%) | ${nomination.sparse ? 'yes' : 'no'} |`
    ),
    '',
    '## Net by year (development)',
    '',
    `| Role | ${Object.keys(selection.control.years).join(' | ')} |`,
    `|---|${Object.keys(selection.control.years)
      .map(() => '---:')
      .join('|')}|`,
    `| control (D1) | ${Object.values(selection.control.years)
      .map((view) => `${formatDollars(view.net)} (${view.entries}e)`)
      .join(' | ')} |`,
    ...selection.nominations.map(
      (nomination) =>
        `| ${nomination.role} | ${Object.values(nomination.years)
          .map((view) => `${formatDollars(view.net)} (${view.entries}e)`)
          .join(' | ')} |`
    ),
    '',
    '## Walk-forward of the selection rule (training-only picks attributed to the next window)',
    '',
    '| Fold | Validation | Min entries | D1 | primary pick | lowDd pick | maxNet pick |',
    '|---|---|---:|---|---|---|---|',
    ...selection.walkForward.folds.map(
      (fold) =>
        `| ${fold.fold} | ${fold.validationStart} → ${fold.validationEnd} | ${fold.minEntries} | ${viewCell(fold.d1Validation)} | ${fold.picks.map((pick) => (pick.id ? `${viewCell(pick.validation)} (train ${formatDollars(pick.trainNet ?? NaN)} / DD ${formatDollars(pick.trainDd ?? NaN)})` : 'none')).join(' | ')} |`
    ),
    '',
    '| Policy | Stitched validation net | D1 stitched | Folds with a pick | Folds ≥ D1 | Pass |',
    '|---|---:|---:|---:|---:|---|',
    ...(['primary', 'lowDd', 'maxNet'] as Policy[]).map((policy) => {
      const row = selection.walkForward.stitched[policy];

      return `| ${policy} | ${formatDollars(row.net)} | ${formatDollars(row.d1Net)} | ${row.folds} | ${row.foldsBeatingD1} | ${row.pass ? 'yes' : 'no'} |`;
    }),
    '',
    '## Fold details',
    '',
    ...record.selections.flatMap((fold) => [
      `### ${fold.fold} (training through ${fold.d1.train.endDate}; pool ${fold.pool}, feasible ${fold.feasible}, beating D1 ${fold.beatingD1}, distinct signatures ${fold.distinctSignatures}; min entries ${fold.minEntries})`,
      '',
      ...fold.policies.map(
        (policy) =>
          `- ${policy.policy}: ${policy.pick ? `${policy.pick.id} ${policy.pick.description} — train ${viewCell(policy.pick.train)}; plateau ${policy.pick.plateau.pass ? 'pass' : 'fail'} (${(policy.pick.plateau.feasibleShare * 100).toFixed(0)}% feasible, median ${(policy.pick.plateau.medianNetShare * 100).toFixed(0)}%, min ${(policy.pick.plateau.minNetShare * 100).toFixed(0)}%)` : 'none'} — ${policy.reason}`
      ),
      ''
    ]),
    '## Notes',
    '',
    ...(selection.notes.length > 0 ? selection.notes.map((note) => `- ${note}`) : ['- none'])
  ];

  return lines.join('\n');
};
