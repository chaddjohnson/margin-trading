// Orchestrates the study. `dev` reads outcomes through 2022-12-30 only and writes results/frozen.json;
// `final` refuses to run without it and is the only code path that reads holdout outcomes.

import fs from 'fs-extra';
import crypto from 'node:crypto';
import {
  type StrategySettings,
  baselineSettings,
  developmentEnd,
  holdoutStart,
  primaryHorizon,
  primaryThreshold,
  researchDir,
  resultsDir,
  robustnessSymbols,
  stressEnd,
  stressStart,
  studyStart
} from './constants.ts';
import { type DailyBars, type StudyData, firstIndexOnOrAfter, lastIndexOnOrBefore, loadStudyData } from './data.ts';
import { type Execution, type ReferenceHighs, type SimulationResult, simulate } from './engine.ts';
import {
  type Candidate,
  type Episode,
  type EventSet,
  baselineInEpisode,
  buildEvents,
  labelKey,
  thresholdTimingRows,
  velocityBin
} from './events.ts';
import { type Features, computeFeatures, featureSpecs } from './features.ts';
import {
  candidateOutcomes,
  episodeAvoidance,
  episodeWorstMark,
  missedWinners,
  windowMetrics,
  type WindowMetrics
} from './metrics.ts';
import {
  type PolicySpec,
  combined,
  flagNames,
  flagText,
  gridSpecs,
  placebo,
  specById,
  stabilizerNames
} from './policies.ts';
import { auc, clusterBootstrap, spearman, wilson } from './stats.ts';
import { dollars, fixed, labelText, markdownTable, percent, signedDollars, writeCsv, writeJson } from './tables.ts';

export interface Context {
  symbol: string;
  data: StudyData;
  bars: DailyBars;
  features: Features;
  refs: ReferenceHighs;
  start: number;
  devEnd: number;
  holdoutStart: number;
  end: number;
}

export const buildContext = async (symbol = 'VGT', from = studyStart): Promise<Context> => {
  const data = await loadStudyData(symbol);
  const { features, refs } = computeFeatures(data);
  const bars = data.vgt;

  return {
    symbol,
    data,
    bars,
    features,
    refs,
    start: firstIndexOnOrAfter(bars, from),
    devEnd: lastIndexOnOrBefore(bars, developmentEnd),
    holdoutStart: firstIndexOnOrAfter(bars, holdoutStart),
    end: bars.date.length - 1
  };
};

export const runRule = (
  context: Context,
  spec: PolicySpec,
  options: { execution?: Execution; settings?: StrategySettings; start?: number; end: number }
) =>
  simulate({
    bars: context.bars,
    policy: spec.build(context.features),
    refs: context.refs,
    startIndex: options.start ?? context.start,
    endIndex: options.end,
    execution: options.execution ?? 'close',
    settings: options.settings ?? baselineSettings
  });

const primaryKey = labelKey(primaryThreshold, primaryHorizon);
const isSevere = (episode: Episode) => episode.labels[primaryKey] === true;
const isDeep = (episode: Episode) => episode.maxDrawdownClose >= 0.2;
const tablesDir = `${resultsDir}/tables`;

const writeTable = async (name: string, content: string) => {
  await fs.ensureDir(tablesDir);
  await fs.writeFile(`${tablesDir}/${name}.md`, `${content}\n`);
};

// ---------------------------------------------------------------- Phase 1: events

const episodeRow = (episode: Episode, baseline: SimulationResult) => {
  const outcome = baselineInEpisode(episode, baseline);
  const row: Record<string, string | number | boolean | null> = {
    id: episode.id,
    peak_date: episode.peakDate,
    peak_high: episode.peakHigh,
    signal_date: episode.signalDate,
    signal_close: episode.signalClose,
    signal_drawdown: episode.signalDrawdown,
    velocity_sessions: episode.velocitySessions,
    velocity_calendar_days: episode.velocityCalendarDays,
    velocity_bin: velocityBin(episode.velocitySessions),
    max_drawdown_close: episode.maxDrawdownClose,
    max_drawdown_low: episode.maxDrawdownLow,
    trough_date: episode.troughDate,
    sessions_signal_to_trough: episode.sessionsSignalToTrough,
    sessions_peak_to_trough: episode.sessionsPeakToTrough,
    recovered: episode.recovered,
    recovery_date: episode.recoveryDate,
    sessions_signal_to_recovery: episode.sessionsSignalToRecovery,
    sessions_trough_to_retrace38: episode.sessionsTroughToRetrace38,
    max_rally_before_trough: episode.maxRallyBeforeTrough,
    censored: episode.censored
  };

  for (const [key, value] of Object.entries(episode.labels)) row[key] = value;
  for (const [key, value] of Object.entries(episode.mae)) row[key] = value;

  Object.assign(row, {
    baseline_entries: outcome.entries,
    baseline_first_entry: outcome.firstEntryDate,
    baseline_first_entry_drawdown: outcome.firstEntryDrawdown,
    baseline_pnl: outcome.profit,
    baseline_interest: outcome.interest,
    baseline_worst_mtm_change: outcome.worstMtmChange,
    baseline_restrictions: outcome.restrictions,
    baseline_winners: outcome.winners
  });

  return row;
};

const episodeMarkdown = (episodes: Episode[], baseline: SimulationResult) =>
  markdownTable(
    [
      '#',
      'Peak',
      'First −10%',
      'Velocity (sess./cal. d)',
      'Max DD (close)',
      'Trough',
      'Peak→trough',
      'Recovery',
      '−15/−20/−25/−30% ≤40 sess.',
      'MAE 20 / 40 from entry',
      'Baseline entries',
      'Baseline P&L',
      'Worst MTM'
    ],
    episodes.map((episode) => {
      const outcome = baselineInEpisode(episode, baseline);

      return [
        episode.id,
        episode.peakDate,
        episode.signalDate,
        `${episode.velocitySessions} / ${episode.velocityCalendarDays}`,
        percent(episode.maxDrawdownClose),
        episode.troughDate,
        episode.sessionsPeakToTrough,
        episode.recovered ? `${episode.recoveryDate} (${episode.sessionsSignalToRecovery})` : 'not by end (censored)',
        [0.15, 0.2, 0.25, 0.3].map((threshold) => labelText(episode.labels[labelKey(threshold, 40)])).join(' / '),
        `${percent(episode.mae.mae20)} / ${percent(episode.mae.mae40)}`,
        outcome.entries,
        dollars(outcome.profit),
        dollars(outcome.worstMtmChange)
      ];
    }),
    ['r', 'l', 'l', 'r', 'r', 'l', 'r', 'l', 'l', 'r', 'r', 'r', 'r']
  );

const velocityBinTables = (events: EventSet, baseline: SimulationResult) => {
  const bins = ['≤15', '16–40', '>40'];
  const episodeRows = bins.map((bin) => {
    const members = events.episodes.filter((episode) => velocityBin(episode.velocitySessions) === bin);
    const labelled = members.filter((episode) => episode.labels[primaryKey] !== null);
    const severe = labelled.filter(isSevere).length;
    const [low, high] = wilson(severe, labelled.length);
    const deep = members.filter(isDeep).length;
    const pnl = members.reduce((sum, episode) => sum + baselineInEpisode(episode, baseline).profit, 0);
    const worst = members.reduce(
      (min, episode) => Math.min(min, baselineInEpisode(episode, baseline).worstMtmChange),
      0
    );
    const mae40 = members.map((episode) => episode.mae.mae40).filter((value): value is number => value !== null);

    return [
      bin,
      members.length,
      labelled.length
        ? `${severe}/${labelled.length} (${percent(severe / labelled.length, 0)}; 95% ${percent(low, 0)}–${percent(high, 0)})`
        : '–',
      `${deep}/${members.length}`,
      members.length ? percent(Math.max(...members.map((episode) => episode.maxDrawdownClose))) : '–',
      mae40.length ? percent(mae40.reduce((a, b) => a + b, 0) / mae40.length) : '–',
      mae40.length ? percent(Math.min(...mae40)) : '–',
      dollars(pnl),
      dollars(worst)
    ];
  });

  const clusterOf = (candidate: Candidate) => candidate.episodeId;
  const candidateRows = bins.map((bin) => {
    const members = events.candidates.filter(
      (candidate) => velocityBin(candidate.velocity) === bin && candidate.labels[primaryKey] !== null
    );
    const severe = members.filter((candidate) => candidate.labels[primaryKey]).length;
    const clusters = [...new Set(members.map(clusterOf))].map((id) =>
      members.filter((candidate) => clusterOf(candidate) === id)
    );
    const interval = clusterBootstrap(clusters, (sample) => {
      const flat = sample.flat();
      return flat.length ? flat.filter((candidate) => candidate.labels[primaryKey]).length / flat.length : NaN;
    });
    const further = members
      .map((candidate) => candidate.furtherDrop40)
      .filter((value): value is number => value !== null);

    return [
      bin,
      members.length,
      clusters.length,
      members.length
        ? `${severe}/${members.length} (${percent(severe / members.length, 0)}; cluster 95% ${percent(interval.low, 0)}–${percent(interval.high, 0)})`
        : '–',
      further.length ? percent(further.reduce((a, b) => a + b, 0) / further.length) : '–',
      further.length ? percent(Math.min(...further)) : '–'
    ];
  });

  return {
    episodes: markdownTable(
      [
        'Velocity bin (sessions peak → −10%)',
        'Episodes',
        '≥20% within 40 sessions',
        'Eventually ≥20%',
        'Deepest',
        'Mean MAE 40 from entry',
        'Worst MAE 40',
        'Baseline P&L in bin',
        'Worst baseline MTM'
      ],
      episodeRows,
      ['l', 'r', 'l', 'r', 'r', 'r', 'r', 'r', 'r']
    ),
    candidates: markdownTable(
      [
        'Velocity bin',
        'Candidates (uncensored)',
        'Episodes',
        '≥20% within 40 sessions',
        'Mean further close drop ≤40 sess.',
        'Worst'
      ],
      candidateRows,
      ['l', 'r', 'r', 'l', 'r', 'r']
    )
  };
};

// Depth versus time from peak to trough, as an SVG scatter.
const depthChart = (episodes: Episode[], title: string) => {
  const width = 760;
  const height = 420;
  const margin = { left: 64, right: 24, top: 56, bottom: 52 };
  const maxX = Math.max(60, ...episodes.map((episode) => episode.sessionsPeakToTrough)) * 1.08;
  const maxY = Math.max(0.35, ...episodes.map((episode) => episode.maxDrawdownClose)) * 1.08;
  const x = (value: number) => margin.left + (value / maxX) * (width - margin.left - margin.right);
  const y = (value: number) => margin.top + (value / maxY) * (height - margin.top - margin.bottom);
  const colors: Record<string, string> = { '≤15': '#eb6834', '16–40': '#2a78d6', '>40': '#1baf7a' };
  const ticksY = [0.1, 0.15, 0.2, 0.25, 0.3, 0.35].filter((value) => value <= maxY);
  const stepX = maxX > 200 ? 50 : 20;
  const ticksX = Array.from({ length: Math.floor(maxX / stepX) + 1 }, (_, index) => index * stepX);
  const parts: string[] = [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" font-family="system-ui, sans-serif" font-size="12">`,
    `<rect width="${width}" height="${height}" fill="#fcfcfb"/>`,
    `<text x="${margin.left}" y="22" font-size="14" font-weight="600" fill="#0b0b0b">${title}</text>`
  ];

  for (const tick of ticksY) {
    parts.push(
      `<line x1="${margin.left}" x2="${width - margin.right}" y1="${y(tick)}" y2="${y(tick)}" stroke="#e5e7eb"/>`
    );
    parts.push(
      `<text x="${margin.left - 8}" y="${y(tick) + 4}" text-anchor="end" fill="#4b5563">−${Math.round(tick * 100)}%</text>`
    );
  }

  for (const tick of ticksX) {
    parts.push(
      `<text x="${x(tick)}" y="${height - margin.bottom + 18}" text-anchor="middle" fill="#4b5563">${tick}</text>`
    );
  }

  parts.push(
    `<line x1="${margin.left}" x2="${width - margin.right}" y1="${y(0.2)}" y2="${y(0.2)}" stroke="#9ca3af" stroke-dasharray="4 3"/>`
  );
  parts.push(
    `<text x="${width / 2}" y="${height - 12}" text-anchor="middle" fill="#374151">Trading sessions from reference-high bar to trough (close)</text>`
  );
  parts.push(
    `<text transform="translate(16 ${height / 2}) rotate(-90)" text-anchor="middle" fill="#374151">Maximum drawdown from the episode peak (close)</text>`
  );

  // Direct labels only where they cannot collide: deep (≥15%) or long (≥40 sessions) episodes. Every
  // point has a hover title, and the episode table lists all of them.
  for (const episode of episodes) {
    const bin = velocityBin(episode.velocitySessions);
    const cx = x(episode.sessionsPeakToTrough);
    const cy = y(episode.maxDrawdownClose);

    parts.push(
      `<circle cx="${cx}" cy="${cy}" r="${episode.censored ? 6 : 5}" fill="${episode.censored ? '#fcfcfb' : colors[bin]}" stroke="${colors[bin]}" stroke-width="2"><title>${episode.signalDate}: velocity ${episode.velocitySessions} sessions, max ${percent(episode.maxDrawdownClose)}, ${episode.sessionsPeakToTrough} sessions to trough</title></circle>`
    );

    if (episode.maxDrawdownClose >= 0.15 || episode.sessionsPeakToTrough >= 40) {
      parts.push(`<text x="${cx + 9}" y="${cy + 4}" fill="#0b0b0b">${episode.signalDate.slice(0, 7)}</text>`);
    }
  }

  const unlabelled = episodes.filter(
    (episode) => episode.maxDrawdownClose < 0.15 && episode.sessionsPeakToTrough < 40
  ).length;

  if (unlabelled) {
    parts.push(
      `<text x="${x(maxX * 0.2)}" y="${y(0.122)}" fill="#52514e">↖ ${unlabelled} shallow, short episodes (hover for dates)</text>`
    );
  }

  let legendX = margin.left;

  for (const [bin, color] of Object.entries(colors)) {
    if (!episodes.some((episode) => velocityBin(episode.velocitySessions) === bin)) continue;
    parts.push(`<circle cx="${legendX + 5}" cy="${margin.top - 6}" r="5" fill="${color}"/>`);
    parts.push(`<text x="${legendX + 14}" y="${margin.top - 2}" fill="#52514e">${bin} sessions peak → −10%</text>`);
    legendX += 200;
  }

  parts.push('</svg>');

  return parts.join('\n');
};

export const phaseEvents = async (context: Context, mode: 'dev' | 'full') => {
  const analysisEnd = mode === 'dev' ? context.devEnd : context.end;
  const events = buildEvents(context.bars, context.refs, context.features, context.start, analysisEnd, analysisEnd);
  const baseline = runRule(context, specById('A_original'), { end: analysisEnd });

  await writeCsv(
    `${resultsDir}/episodes_${mode}.csv`,
    events.episodes.map((episode) => episodeRow(episode, baseline))
  );
  await writeCsv(
    `${resultsDir}/candidates_${mode}.csv`,
    events.candidates.map((candidate) => {
      const row: Record<string, string | number | boolean | null> = {
        id: candidate.id,
        signal_date: candidate.signalDate,
        peak_date: candidate.peakDate,
        ref_high: candidate.refHigh,
        close: candidate.close,
        drawdown: candidate.drawdown,
        velocity: candidate.velocity,
        velocity_bin: velocityBin(candidate.velocity),
        episode_id: candidate.episodeId,
        is_episode_start: candidate.isEpisodeStart,
        further_close_drop_40: candidate.furtherDrop40
      };

      for (const [key, value] of Object.entries(candidate.labels)) row[key] = value;
      for (const [key, value] of Object.entries(candidate.mae)) row[key] = value;
      for (const spec of featureSpecs) row[`f_${spec.name}`] = context.features[spec.name]![candidate.signalIndex]!;

      const trade = baseline.trades.find((value) => value.signalIndex === candidate.signalIndex);

      row.baseline_entered = Boolean(trade);
      row.baseline_trade_profit = trade ? trade.profit : null;

      return row;
    })
  );
  await writeCsv(
    `${resultsDir}/signals_${mode}.csv`,
    events.signals.map((signal) => {
      const row: Record<string, string | number | boolean | null> = {
        date: signal.date,
        ref_high: signal.refHigh,
        drawdown: signal.drawdown,
        episode_id: signal.episodeId,
        candidate_id: signal.candidateId
      };

      for (const [key, value] of Object.entries(signal.labels)) row[key] = value;
      for (const spec of featureSpecs) row[`f_${spec.name}`] = context.features[spec.name]![signal.index]!;

      return row;
    })
  );

  const bins = velocityBinTables(events, baseline);

  await writeTable(`episodes_${mode}`, episodeMarkdown(events.episodes, baseline));
  await writeTable(`velocity_bins_episodes_${mode}`, bins.episodes);
  await writeTable(`velocity_bins_candidates_${mode}`, bins.candidates);

  await writeTable(
    `threshold_timing_${mode}`,
    markdownTable(
      ['First −10%', 'Sessions to −15%', 'to −20%', 'to −25%', 'to −30%', 'Calendar days to −20%', 'Episode'],
      thresholdTimingRows(context.bars, events.episodes),
      ['l', 'r', 'r', 'r', 'r', 'r', 'l']
    )
  );

  // Robustness of the label: every threshold × horizon at the episode level.
  const labelRows = [0.15, 0.2, 0.25, 0.3].map((threshold) => [
    `−${threshold * 100}%`,
    ...[10, 20, 40, 60].map((horizon) => {
      const key = labelKey(threshold, horizon);
      const labelled = events.episodes.filter((episode) => episode.labels[key] !== null);
      const hits = labelled.filter((episode) => episode.labels[key]).length;
      const censored = events.episodes.length - labelled.length;

      return `${hits}/${labelled.length}${censored ? ` (+${censored} cens.)` : ''}`;
    })
  ]);

  await writeTable(
    `label_grid_${mode}`,
    markdownTable(
      ['Depth vs reference high', '≤10 sessions', '≤20 sessions', '≤40 sessions', '≤60 sessions'],
      labelRows,
      ['l', 'r', 'r', 'r', 'r']
    )
  );
  await fs.ensureDir(`${researchDir}/charts`);
  await fs.writeFile(
    `${researchDir}/charts/depth_vs_time_${mode}.svg`,
    depthChart(
      events.episodes,
      `VGT correction episodes ${context.bars.date[context.start]!.slice(0, 4)}–${context.bars.date[analysisEnd]!.slice(0, 4)}: depth vs time to trough`
    )
  );

  return { events, baseline };
};

// ---------------------------------------------------------------- Phase 3: indicators

const signalOutcomeFurther = (bars: DailyBars, index: number, refHigh: number, outcomeEnd: number) => {
  if (index + 40 > outcomeEnd) return null;
  let lowest = Infinity;
  for (let i = index; i <= index + 40; i++) lowest = Math.min(lowest, bars.close[i]!);
  return 1 - lowest / refHigh; // max drawdown vs the reference high within 40 sessions
};

export const phaseIndicators = async (
  context: Context,
  events: EventSet,
  baseline: SimulationResult,
  mode: 'dev' | 'full'
) => {
  const outcomeEnd = mode === 'dev' ? context.devEnd : context.end;
  const f = context.features;
  const signals = events.signals.filter((signal) => signal.labels[primaryKey] !== null);
  const candidates = events.candidates.filter((candidate) => candidate.labels[primaryKey] !== null);
  const episodes = events.episodes.filter((episode) => episode.labels[primaryKey] !== null);
  const rows: (string | number)[][] = [];
  const csvRows: Record<string, string | number>[] = [];

  for (const spec of featureSpecs) {
    const value = (index: number) => f[spec.name]![index]!;
    const sign = spec.danger === 'high' ? 1 : -1;
    const episodeAuc = auc(
      episodes.map((episode) => sign * value(episode.signalIndex)),
      episodes.map(isSevere)
    );
    const candidateAuc = auc(
      candidates.map((candidate) => sign * value(candidate.signalIndex)),
      candidates.map((candidate) => Boolean(candidate.labels[primaryKey]))
    );
    const signalAuc = auc(
      signals.map((signal) => sign * value(signal.index)),
      signals.map((signal) => Boolean(signal.labels[primaryKey]))
    );
    const clusters = [...new Set(signals.map((signal) => signal.episodeId))].map((id) =>
      signals.filter((signal) => signal.episodeId === id)
    );
    const interval = clusterBootstrap(
      clusters,
      (sample) => {
        const flat = sample.flat();
        return auc(
          flat.map((signal) => sign * value(signal.index)),
          flat.map((signal) => Boolean(signal.labels[primaryKey]))
        );
      },
      1000
    );
    const further = signals.map(
      (signal) => signalOutcomeFurther(context.bars, signal.index, signal.refHigh, outcomeEnd) ?? NaN
    );
    const rho = spearman(
      signals.map((signal) => sign * value(signal.index)),
      further
    );

    rows.push([
      spec.name,
      spec.family.replace(/^._/, ''),
      spec.danger,
      fixed(episodeAuc),
      fixed(candidateAuc),
      fixed(signalAuc),
      `${fixed(interval.low)}–${fixed(interval.high)}`,
      fixed(rho)
    ]);
    csvRows.push({
      feature: spec.name,
      family: spec.family,
      danger_direction: spec.danger,
      formula: spec.formula,
      episodes: episodes.length,
      episode_auc: episodeAuc,
      candidates: candidates.length,
      candidate_auc: candidateAuc,
      signal_sessions: signals.length,
      signal_auc: signalAuc,
      signal_auc_cluster_low: interval.low,
      signal_auc_cluster_high: interval.high,
      spearman_vs_max_dd_40: rho
    });
  }

  await writeCsv(`${resultsDir}/feature_diagnostics_${mode}.csv`, csvRows);
  await writeTable(
    `feature_diagnostics_${mode}`,
    markdownTable(
      [
        'Feature',
        'Family',
        'Danger if',
        `AUC episodes (n=${episodes.length})`,
        `AUC candidates (n=${candidates.length})`,
        `AUC signal sessions (n=${signals.length})`,
        'Cluster-bootstrap 95%',
        'Spearman vs max DD ≤40'
      ],
      rows,
      ['l', 'l', 'l', 'r', 'r', 'r', 'r', 'r']
    )
  );

  // Feature values at each episode's first signal.
  const keyFeatures = [
    'candVelocity',
    'ret5',
    'accel5',
    'relVol20',
    'volRatio',
    'atr14',
    'xDdFrac10',
    'spyDd',
    'vixPrev',
    'distSma200',
    'failedRallies'
  ];

  await writeTable(
    `episode_features_${mode}`,
    markdownTable(
      ['First −10%', 'Severe (≥20% ≤40)', 'Max DD', ...keyFeatures],
      events.episodes.map((episode) => [
        episode.signalDate,
        labelText(episode.labels[primaryKey]),
        percent(episode.maxDrawdownClose),
        ...keyFeatures.map((name) => {
          const value = f[name]![episode.signalIndex]!;
          return ['ret5', 'accel5', 'atr14', 'spyDd', 'distSma200', 'xDdFrac10'].includes(name)
            ? percent(value)
            : fixed(value, name === 'vixPrev' ? 1 : 2);
        })
      ]),
      ['l', 'l', 'r', ...keyFeatures.map(() => 'r' as const)]
    )
  );

  // Pre-specified flags as danger classifiers, plus the velocity-only benchmark.
  const flagTests: { name: string; text: string; test: (t: number) => boolean }[] = [
    { name: 'velocity_le_15', text: 'velocity ≤15 sessions (benchmark)', test: (t) => f.candVelocity![t]! <= 15 },
    { name: 'velocity_gt_40', text: 'velocity >40 sessions (benchmark)', test: (t) => f.candVelocity![t]! > 40 },
    ...flagNames.map((name) => {
      const spec = specById(`C_gate_${name}`);
      const policy = spec.build(f);
      return {
        name,
        text: flagText(name),
        test: (t: number) =>
          policy.decide({
            index: t,
            close: 0,
            signal: true,
            drawdown: 0.1,
            refHigh: 0,
            peakIndex: 0,
            restricted: false,
            restrictionAllows: true
          }).enter === false
      };
    })
  ];
  const baseRate = signals.filter((signal) => signal.labels[primaryKey]).length / signals.length;
  const trades = baseline.trades.filter((trade) => trade.signalIndex <= outcomeEnd);
  const flagRows: (string | number)[][] = [];
  const flagCsv: Record<string, string | number>[] = [];

  for (const flag of flagTests) {
    const counts = (units: { index: number; severe: boolean }[]) => {
      let tp = 0,
        fp = 0,
        fn = 0,
        tn = 0;
      for (const unit of units) {
        const raised = flag.test(unit.index);
        if (raised && unit.severe) tp++;
        else if (raised) fp++;
        else if (unit.severe) fn++;
        else tn++;
      }
      return { tp, fp, fn, tn };
    };
    const signalUnits = signals.map((signal) => ({ index: signal.index, severe: Boolean(signal.labels[primaryKey]) }));
    const episodeUnits = episodes.map((episode) => ({ index: episode.signalIndex, severe: isSevere(episode) }));
    const s = counts(signalUnits);
    const e = counts(episodeUnits);
    const flaggedTrades = trades.filter((trade) => flag.test(trade.signalIndex));
    const winners = trades.filter((trade) => trade.profit > 0);
    const losers = trades.filter((trade) => trade.profit <= 0);
    // The deepest drawdown reached within 40 sessions by severe signals the flag missed.
    const missedDepth = signals
      .filter((signal) => signal.labels[primaryKey] && !flag.test(signal.index))
      .reduce(
        (max, signal) =>
          Math.max(max, signalOutcomeFurther(context.bars, signal.index, signal.refHigh, outcomeEnd) ?? 0),
        0
      );
    const precision = s.tp / (s.tp + s.fp);
    const recall = s.tp / (s.tp + s.fn);
    const falseAlarm = s.fp / (s.fp + s.tn);

    flagRows.push([
      flag.text,
      `${e.tp}/${e.tp + e.fn} sev., ${e.fp}/${e.fp + e.tn} non-sev.`,
      s.tp + s.fp,
      percent(precision, 0),
      percent(recall, 0),
      percent(falseAlarm, 0),
      `${winners.filter((trade) => flag.test(trade.signalIndex)).length}/${winners.length}`,
      `${losers.filter((trade) => flag.test(trade.signalIndex)).length}/${losers.length}`,
      dollars(flaggedTrades.reduce((sum, trade) => sum + trade.profit, 0)),
      missedDepth ? percent(missedDepth) : '–'
    ]);
    flagCsv.push({
      flag: flag.name,
      description: flag.text,
      episode_tp: e.tp,
      episode_fp: e.fp,
      episode_fn: e.fn,
      episode_tn: e.tn,
      signal_tp: s.tp,
      signal_fp: s.fp,
      signal_fn: s.fn,
      signal_tn: s.tn,
      signal_base_rate: baseRate,
      precision,
      recall,
      false_alarm_rate: falseAlarm,
      winners_flagged: winners.filter((trade) => flag.test(trade.signalIndex)).length,
      winners: winners.length,
      losers_flagged: losers.filter((trade) => flag.test(trade.signalIndex)).length,
      losers: losers.length,
      flagged_trade_pnl: flaggedTrades.reduce((sum, trade) => sum + trade.profit, 0),
      deepest_missed_severe_dd40: missedDepth
    });
  }

  await writeCsv(`${resultsDir}/flag_diagnostics_${mode}.csv`, flagCsv);
  await writeTable(
    `flag_diagnostics_${mode}`,
    `Signal sessions: ${signals.length} uncensored (base rate of ≥20% within 40 sessions: ${percent(baseRate)}), ${new Set(signals.map((signal) => signal.episodeId)).size} episodes. Baseline trades: ${trades.length}.\n\n` +
      markdownTable(
        [
          'Danger flag at the decision close',
          'Episodes flagged at first signal',
          'Signal sessions flagged',
          'Precision',
          'Recall',
          'False-alarm rate',
          'Baseline winners flagged',
          'Baseline losers flagged',
          'P&L of flagged baseline trades',
          'Deepest DD of a missed severe signal'
        ],
        flagRows,
        ['l', 'l', 'r', 'r', 'r', 'r', 'r', 'r', 'r', 'r']
      )
  );
};

// ---------------------------------------------------------------- Phases 4–5: strategies

export interface RuleRun {
  spec: PolicySpec;
  execution: Execution;
  result: SimulationResult;
}

export const compareRow = (
  context: Context,
  run: SimulationResult,
  baseline: SimulationResult,
  events: EventSet,
  from: number,
  to: number,
  outcomeEnd: number
) => {
  const metrics = windowMetrics(run, context.bars, from, to, outcomeEnd);
  const base = windowMetrics(baseline, context.bars, from, to, outcomeEnd);
  const windowEpisodes = events.episodes.filter((episode) => episode.signalIndex >= from && episode.signalIndex <= to);
  const severe = episodeAvoidance(run, baseline, windowEpisodes, isSevere);
  const deep = episodeAvoidance(run, baseline, windowEpisodes, isDeep);
  const missed = missedWinners(run, baseline, from, to);
  const decisions = candidateOutcomes(run, from, to);

  return {
    metrics,
    base,
    severe,
    deep,
    missed,
    decisions,
    deltaNet: metrics.netProfit - base.netProfit,
    deltaDrawdown: metrics.maxDrawdown - base.maxDrawdown,
    deltaObjective: metrics.objective - base.objective
  };
};

export type Comparison = ReturnType<typeof compareRow>;

const comparisonCsv = (spec: PolicySpec, execution: Execution, window: string, comparison: Comparison) => ({
  policy: spec.id,
  family: spec.family,
  execution,
  window,
  from: comparison.metrics.from,
  to: comparison.metrics.to,
  net_pnl: comparison.metrics.netProfit,
  margin_interest: comparison.metrics.interest,
  max_mtm_drawdown: comparison.metrics.maxDrawdown,
  objective: comparison.metrics.objective,
  delta_net_vs_A: comparison.deltaNet,
  delta_drawdown_vs_A: comparison.deltaDrawdown,
  delta_objective_vs_A: comparison.deltaObjective,
  entries: comparison.metrics.entries,
  winners: comparison.metrics.winners,
  exposure_sessions: comparison.metrics.exposureSessions,
  mean_hold_sessions: comparison.metrics.meanHoldSessions,
  worst_trade: comparison.metrics.worstTrade,
  worst_trade_mae: comparison.metrics.worstTradeMae,
  severe_entry_rate_20: comparison.metrics.severeEntryRate20,
  severe_entry_rate_25: comparison.metrics.severeEntryRate25,
  severe_entry_rate_30: comparison.metrics.severeEntryRate30,
  severe_entries_20: comparison.metrics.severeEntries20,
  labelled_entries: comparison.metrics.labelledEntries,
  deep_further_drop_rate: comparison.metrics.deepFurtherDropRate,
  severe_episodes: comparison.severe.severeEpisodes,
  severe_episodes_avoided: comparison.severe.avoided,
  severe_pre_trough_entries: comparison.severe.strategyPreTrough,
  baseline_severe_pre_trough_entries: comparison.severe.baselinePreTrough,
  deep_episodes: comparison.deep.severeEpisodes,
  deep_episodes_avoided: comparison.deep.avoided,
  profitable_baseline_entries_missed: comparison.missed.length,
  missed_winner_pnl: comparison.missed.reduce((sum, trade) => sum + trade.profit, 0),
  candidates: comparison.decisions.candidates,
  candidates_entered: comparison.decisions.entered,
  candidates_rejected: comparison.decisions.rejected,
  candidates_deferred_then_entered: comparison.decisions.deferredThenEntered,
  candidates_never_entered: comparison.decisions.neverEntered
});

const pickBest = (runs: { spec: PolicySpec; objective: number }[]) =>
  runs.reduce((best, run) => (run.objective > best.objective ? run : best), runs[0]!);

// Family picks on a window, by the pre-specified objective, from same-close runs.
export const familyPicks = (
  context: Context,
  runs: RuleRun[],
  from: number,
  to: number,
  outcomeEnd: number,
  runComposite: (spec: PolicySpec) => SimulationResult
) => {
  const scored = runs
    .filter((run) => run.execution === 'close')
    .map((run) => ({
      spec: run.spec,
      objective: windowMetrics(run.result, context.bars, from, to, outcomeEnd).objective
    }));
  const picks: Record<string, PolicySpec> = {};

  for (const family of ['B', 'C', 'D', 'E'] as const) {
    picks[family] = pickBest(scored.filter((run) => run.spec.family === family)).spec;
  }

  const flag = pickBest(scored.filter((run) => run.spec.id.startsWith('C_gate_'))).spec.id.replace('C_gate_', '');
  const stabilizer = pickBest(scored.filter((run) => run.spec.family === 'D' && run.spec.id.endsWith('_zone')))
    .spec.id.replace(/^D_/, '')
    .replace(/_zone$/, '');
  const composite = combined(flag, stabilizer);

  runComposite(composite);
  picks.F = composite;

  return picks;
};

const stitched = (segments: { result: SimulationResult; from: number; to: number }[]) => {
  let mark = 0;
  let peak = 0;
  let maxDrawdown = 0;

  for (const { result, from, to } of segments) {
    for (let i = from; i <= to; i++) {
      const increment = result.mtm[i]! - (i - 1 >= result.startIndex ? result.mtm[i - 1]! : 0);
      mark += increment;
      peak = Math.max(peak, mark);
      maxDrawdown = Math.max(maxDrawdown, peak - mark);
    }
  }

  return { net: mark, maxDrawdown, objective: mark - maxDrawdown };
};

export const phaseStrategiesDev = async (context: Context, events: EventSet, baseline: SimulationResult) => {
  const end = context.devEnd;
  const runs: RuleRun[] = [];

  for (const spec of gridSpecs) {
    for (const execution of ['close', 'nextOpen'] as const) {
      runs.push({ spec, execution, result: runRule(context, spec, { execution, end }) });
    }
  }

  const composites = new Map<string, RuleRun>();
  const runComposite = (spec: PolicySpec) => {
    if (!composites.has(spec.id)) {
      composites.set(spec.id, { spec, execution: 'close', result: runRule(context, spec, { end }) });
    }
    return composites.get(spec.id)!.result;
  };

  // Walk-forward over the development years.
  const yearBounds = (year: number) => ({
    from: firstIndexOnOrAfter(context.bars, `${year}-01-01`),
    to: lastIndexOnOrBefore(context.bars, `${year}-12-31`)
  });
  const folds: Record<string, unknown>[] = [];
  const segments: Record<string, { result: SimulationResult; from: number; to: number }[]> = {
    A: [],
    B: [],
    C: [],
    D: [],
    E: [],
    F: []
  };
  const baselineRun = runs.find((run) => run.spec.id === 'A_original' && run.execution === 'close')!.result;

  for (const year of [2018, 2019, 2020, 2021, 2022]) {
    const train = { from: context.start, to: lastIndexOnOrBefore(context.bars, `${year - 1}-12-31`) };
    const test = yearBounds(year);
    // Training labels are censored at the training end, so no test-year outcome leaks into the pick.
    const picks = familyPicks(context, runs, train.from, train.to, train.to, runComposite);
    const fold: Record<string, unknown> = {
      testYear: year,
      trainFrom: context.bars.date[train.from],
      trainTo: context.bars.date[train.to]
    };

    segments.A!.push({ result: baselineRun, ...test });

    for (const [family, spec] of Object.entries(picks)) {
      const result =
        family === 'F'
          ? runComposite(spec)
          : runs.find((run) => run.spec.id === spec.id && run.execution === 'close')!.result;
      const metrics = windowMetrics(result, context.bars, test.from, test.to, end);
      const base = windowMetrics(baselineRun, context.bars, test.from, test.to, end);

      segments[family]!.push({ result, ...test });
      fold[family] = {
        pick: spec.id,
        testNet: metrics.netProfit,
        testDrawdown: metrics.maxDrawdown,
        testObjective: metrics.objective,
        baselineNet: base.netProfit,
        baselineDrawdown: base.maxDrawdown
      };
    }

    folds.push(fold);
  }

  const walkForward = Object.fromEntries(Object.entries(segments).map(([family, list]) => [family, stitched(list)]));

  // Sensitivity (review): each test year started flat with that year's pick, so the stitched path is one a
  // trader could have followed.
  const flatSegments: Record<string, { result: SimulationResult; from: number; to: number }[]> = {};

  for (const fold of folds) {
    const year = fold.testYear as number;
    const test = yearBounds(year);
    const picked: [string, string][] = [
      ['A', 'A_original'],
      ...['B', 'C', 'D', 'E', 'F'].map(
        (family) => [family, (fold[family] as { pick: string }).pick] as [string, string]
      )
    ];

    for (const [family, id] of picked) {
      (flatSegments[family] ??= []).push({
        result: runRule(context, specById(id), { start: test.from, end: test.to }),
        ...test
      });
    }
  }

  const walkForwardFlat = Object.fromEntries(
    Object.entries(flatSegments).map(([family, list]) => [family, stitched(list)])
  );

  // Frozen picks on all of development.
  const frozenPicks = familyPicks(context, runs, context.start, end, end, runComposite);
  const allRuns = [...runs, ...composites.values()];
  const comparisons: Record<string, unknown>[] = [];

  for (const run of allRuns) {
    const base = runs.find((other) => other.spec.id === 'A_original' && other.execution === run.execution)!.result;
    comparisons.push(
      comparisonCsv(
        run.spec,
        run.execution,
        'development',
        compareRow(context, run.result, base, events, context.start, end, end)
      )
    );
  }

  await writeCsv(`${resultsDir}/grid_development.csv`, comparisons as Record<string, string | number>[]);

  const placebos = placeboRuns(context, baselineRun, context.start, end, end);

  await writeCsv(`${resultsDir}/placebo_development.csv`, placebos.rows);
  await writeJson(`${resultsDir}/walk_forward.json`, {
    objective: 'net − max MTM drawdown',
    folds,
    stitchedOutOfSample: walkForward,
    stitchedOutOfSampleFlatStart: walkForwardFlat
  });

  return {
    runs: allRuns,
    frozenPicks,
    walkForward,
    walkForwardFlat,
    folds,
    baselineRun,
    runComposite,
    placebos: placebos.rows
  };
};

// Amendment 1: uninformed random deferrals of 0–5 and 0–10 sessions, 500 seeds each.
export const placeboSeeds = 500;

export const placeboRuns = (
  context: Context,
  baseline: SimulationResult,
  from: number,
  to: number,
  outcomeEnd: number
) => {
  const base = windowMetrics(baseline, context.bars, from, to, outcomeEnd);
  const rows: Record<string, string | number>[] = [];

  for (const maxDelay of [5, 10]) {
    for (let seed = 1; seed <= placeboSeeds; seed++) {
      const spec = placebo(seed, maxDelay);
      const result = runRule(context, spec, { end: to });
      const metrics = windowMetrics(result, context.bars, from, to, outcomeEnd);

      rows.push({
        placebo: `jitter${maxDelay}`,
        seed,
        net_pnl: metrics.netProfit,
        max_mtm_drawdown: metrics.maxDrawdown,
        delta_net_vs_A: metrics.netProfit - base.netProfit,
        delta_drawdown_vs_A: metrics.maxDrawdown - base.maxDrawdown,
        delta_objective_vs_A: metrics.objective - base.objective,
        entries: metrics.entries
      });
    }
  }

  return { rows };
};

export const placeboSummary = (rows: Record<string, string | number>[], placeboName: string) => {
  const values = rows
    .filter((row) => row.placebo === placeboName)
    .map((row) => row.delta_objective_vs_A as number)
    .sort((a, b) => a - b);
  const nets = rows
    .filter((row) => row.placebo === placeboName)
    .map((row) => row.delta_net_vs_A as number)
    .sort((a, b) => a - b);
  const q = (list: number[], p: number) => list[Math.min(list.length - 1, Math.floor(p * list.length))]!;

  return {
    n: values.length,
    objective: { p5: q(values, 0.05), p50: q(values, 0.5), p95: q(values, 0.95), max: values.at(-1)!, min: values[0]! },
    net: { p5: q(nets, 0.05), p50: q(nets, 0.5), p95: q(nets, 0.95), max: nets.at(-1)!, min: nets[0]! },
    percentileOf: (value: number) => values.filter((other) => other < value).length / values.length
  };
};

// Per-episode attribution of the difference to A, with a leave-one-episode-out check and a cluster
// bootstrap of the total difference over episodes.
// Trade-based: each trade's whole P&L (its final outcome in the run, or its mark at the run's end if still
// open; callers pass `to` = the run's end) belongs to the episode containing
// its signal session. Every signal falls inside an episode window, so the rows add up to the difference
// in net P&L for runs that start flat at `from`.
export const episodeAttribution = (
  run: SimulationResult,
  baseline: SimulationResult,
  episodes: Episode[],
  episodeOf: Int32Array,
  from: number,
  to: number
) => {
  const tradePnl = (result: SimulationResult, id: number) =>
    result.trades
      .filter((trade) => trade.entryIndex >= from && trade.entryIndex <= to && episodeOf[trade.signalIndex] === id)
      .reduce((sum, trade) => sum + trade.profit, 0);
  const rows = episodes
    .filter((episode) => episode.signalIndex >= from && episode.signalIndex <= to)
    .map((episode) => ({
      episode,
      delta: tradePnl(run, episode.id) - tradePnl(baseline, episode.id),
      strategy: tradePnl(run, episode.id),
      baseline: tradePnl(baseline, episode.id),
      strategyWorst: episodeWorstMark(run, episode, to),
      baselineWorst: episodeWorstMark(baseline, episode, to)
    }));
  const before = from - 1 >= run.startIndex ? run.mtm[from - 1]! : 0;
  const baseBefore = from - 1 >= baseline.startIndex ? baseline.mtm[from - 1]! : 0;
  const totalDelta = run.mtm[to]! - before - (baseline.mtm[to]! - baseBefore);
  const inEpisodes = rows.reduce((sum, row) => sum + row.delta, 0);
  // Trades whose signal lies outside every episode window (only possible at the window edges).
  const outside = totalDelta - inEpisodes;
  // The leave-one-out check removes the episode that helped most (largest positive difference).
  const largest = rows.reduce<(typeof rows)[number] | undefined>(
    (best, row) => (row.delta > (best?.delta ?? 0) ? row : best),
    undefined
  );
  const interval = clusterBootstrap(rows, (sample) => sample.reduce((sum, row) => sum + row.delta, 0) + outside);

  return {
    rows,
    totalDelta,
    outside,
    largest,
    withoutLargest: totalDelta - (largest?.delta ?? 0),
    bootstrapLow: interval.low,
    bootstrapHigh: interval.high
  };
};

export const familyLabel: Record<string, string> = {
  A: 'A — Original',
  B: 'B — Velocity gate',
  C: 'C — Deterioration gate',
  D: 'D — Stabilization confirmation',
  E: 'E — Adaptive threshold',
  F: 'F — Simple combination'
};

export const summaryRow = (label: string, comparison: Comparison) => [
  label,
  dollars(comparison.metrics.netProfit),
  dollars(comparison.metrics.interest),
  dollars(comparison.metrics.maxDrawdown),
  comparison.metrics.entries,
  `${percent(comparison.metrics.severeEntryRate20, 0)} (${comparison.metrics.severeEntries20}/${comparison.metrics.labelledEntries})`,
  `${comparison.severe.avoided}/${comparison.severe.severeEpisodes}`,
  comparison.missed.length,
  comparison.metrics.exposureSessions
];

export const summaryHeaders = [
  'Approach',
  'Net P&L',
  'Margin interest',
  'Max MTM drawdown',
  'Trades',
  'Severe-entry rate',
  'Severe episodes avoided',
  'Profitable entries missed',
  'Exposure days'
];
export const summaryAlign: ('l' | 'r')[] = ['l', 'r', 'r', 'r', 'r', 'r', 'r', 'r', 'r'];

export const sha256File = async (file: string) =>
  crypto
    .createHash('sha256')
    .update(await fs.readFile(file))
    .digest('hex');

export { signedDollars, stabilizerNames, stressEnd, stressStart, robustnessSymbols };
