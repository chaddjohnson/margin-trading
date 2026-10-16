// The one-time final pass: it reads the frozen choices, then evaluates them on the holdout, under next-open
// execution, costs and margin rates, on the pre-2014 VGT stress period and on six other ETFs. It also
// exports every rule's full-period trades and decisions (reported, never used for selection).

import fs from 'fs-extra';
import {
  type StrategySettings,
  baselineSettings,
  primaryHorizon,
  primaryThreshold,
  researchDir,
  resultsDir,
  robustnessSymbols,
  stressEnd,
  stressStart
} from './constants.ts';
import { lastIndexOnOrBefore } from './data.ts';
import type { Execution, SimulationResult } from './engine.ts';
import { type Episode, type EventSet, buildEvents, labelKey, thresholdTimingRows } from './events.ts';
import { windowMetrics } from './metrics.ts';
import { type PolicySpec, gridSpecs, specById } from './policies.ts';
import {
  type Context,
  buildContext,
  compareRow,
  episodeAttribution,
  familyLabel,
  phaseEvents,
  phaseIndicators,
  placeboRuns,
  placeboSummary,
  runRule,
  sha256File,
  summaryAlign,
  summaryHeaders,
  summaryRow
} from './study.ts';
import { dollars, markdownTable, percent, signedDollars, writeCsv, writeJson } from './tables.ts';

const tablesDir = `${resultsDir}/tables`;
const writeTable = async (name: string, content: string) => {
  await fs.ensureDir(tablesDir);
  await fs.writeFile(`${tablesDir}/${name}.md`, `${content}\n`);
};

const primaryKey = labelKey(primaryThreshold, primaryHorizon);

interface Rule {
  family: string;
  spec: PolicySpec;
}

interface Window {
  name: string;
  from: number;
  to: number;
  outcomeEnd: number;
}

const tradeRows = (context: Context, result: SimulationResult, extra: Record<string, string>) =>
  result.trades.map((trade) => ({
    ...extra,
    signal_date: context.bars.date[trade.signalIndex]!,
    entry_date: context.bars.date[trade.entryIndex]!,
    exit_date: trade.exitIndex === -1 ? '' : context.bars.date[trade.exitIndex]!,
    entry_reason: trade.entryReason,
    entry_price: trade.entryPrice,
    entry_fill: trade.entryFill,
    exit_price: trade.exitPrice,
    exit_fill: trade.exitFill,
    exit_reason: trade.reason,
    reference_high: trade.referenceHigh,
    entry_drawdown: 1 - trade.entryPrice / trade.referenceHigh,
    shares: trade.shares,
    interest: trade.interest,
    profit: trade.profit,
    price_return: trade.priceReturn,
    mae_low: trade.lowestLow / trade.entryPrice - 1,
    worst_open_mark: trade.worstMark,
    hold_sessions: (trade.exitIndex === -1 ? result.endIndex : trade.exitIndex) - trade.entryIndex,
    restricted_after: trade.restrictedAfter
  }));

const decisionRows = (result: SimulationResult, extra: Record<string, string>) =>
  result.decisions.map((row) => ({
    ...extra,
    date: row.date,
    close: row.close,
    drawdown: row.drawdown,
    ref_high: row.refHigh,
    peak_index: row.peakIndex,
    signal: row.signal,
    restricted: row.restricted,
    restriction_allows: row.restrictionAllows,
    policy_enter: row.enter,
    executed: row.executed,
    reason: row.reason
  }));

// A line chart of cumulative mark-to-market P&L (three series at most, direct-labelled).
const mtmChart = (
  context: Context,
  series: { label: string; color: string; result: SimulationResult }[],
  markerIndex: number
) => {
  const width = 820;
  const height = 400;
  const margin = { left: 72, right: 130, top: 40, bottom: 40 };
  const from = context.start;
  const to = context.end;
  const values = series.flatMap(({ result }) => Array.from(result.mtm.subarray(from, to + 1)));
  const minY = Math.min(0, ...values);
  const maxY = Math.max(...values);
  const x = (index: number) => margin.left + ((index - from) / (to - from)) * (width - margin.left - margin.right);
  const y = (value: number) => margin.top + ((maxY - value) / (maxY - minY)) * (height - margin.top - margin.bottom);
  const parts = [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" font-family="system-ui, sans-serif" font-size="12">`,
    `<rect width="${width}" height="${height}" fill="#fcfcfb"/>`,
    `<text x="${margin.left}" y="22" font-size="14" font-weight="600" fill="#0b0b0b">VGT cumulative mark-to-market P&amp;L, same-close execution (development | holdout)</text>`
  ];
  const step = 50000;

  for (let tick = Math.ceil(minY / step) * step; tick <= maxY; tick += step) {
    parts.push(
      `<line x1="${margin.left}" x2="${width - margin.right}" y1="${y(tick)}" y2="${y(tick)}" stroke="#e7e6e2"/>`
    );
    parts.push(
      `<text x="${margin.left - 8}" y="${y(tick) + 4}" text-anchor="end" fill="#52514e">${tick < 0 ? '−' : ''}$${Math.abs(tick / 1000)}k</text>`
    );
  }

  for (let year = 2014; year <= 2026; year += 2) {
    const index = context.bars.date.findIndex((date) => date >= `${year}-01-01`);
    if (index >= from && index <= to)
      parts.push(`<text x="${x(index)}" y="${height - 16}" text-anchor="middle" fill="#52514e">${year}</text>`);
  }

  parts.push(
    `<line x1="${x(markerIndex)}" x2="${x(markerIndex)}" y1="${margin.top}" y2="${height - margin.bottom}" stroke="#8a8984" stroke-dasharray="4 3"/>`
  );
  parts.push(`<text x="${x(markerIndex) + 4}" y="${margin.top + 12}" fill="#52514e">holdout →</text>`);

  for (const { label, color, result } of series) {
    const points: string[] = [];
    for (let i = from; i <= to; i += 2) points.push(`${x(i).toFixed(1)},${y(result.mtm[i]!).toFixed(1)}`);
    points.push(`${x(to).toFixed(1)},${y(result.mtm[to]!).toFixed(1)}`);
    parts.push(`<polyline points="${points.join(' ')}" fill="none" stroke="${color}" stroke-width="2"/>`);
    parts.push(`<circle cx="${x(to)}" cy="${y(result.mtm[to]!)}" r="4" fill="${color}"/>`);
  }

  // Direct labels, nudged apart.
  const labels = series
    .map(({ label, result }) => ({ label: `${label} ${dollars(result.mtm[to]!)}`, y: y(result.mtm[to]!) }))
    .sort((a, b) => a.y - b.y);
  for (let i = 1; i < labels.length; i++) labels[i]!.y = Math.max(labels[i]!.y, labels[i - 1]!.y + 16);
  for (const label of labels)
    parts.push(`<text x="${width - margin.right + 10}" y="${label.y + 4}" fill="#0b0b0b">${label.label}</text>`);

  parts.push('</svg>');
  return parts.join('\n');
};

// Profit vs drawdown on development: every grid rule, the placebo cloud, A and the frozen picks.
const paretoChart = (
  grid: { id: string; net: number; dd: number }[],
  placebo: { net: number; dd: number }[],
  picks: string[]
) => {
  const width = 760;
  const height = 460;
  const margin = { left: 72, right: 30, top: 44, bottom: 52 };
  const all = [...grid, ...placebo];
  const minX = Math.min(...all.map((p) => p.dd)) * 0.95;
  const maxX = Math.max(...all.map((p) => p.dd)) * 1.03;
  const minY = Math.min(...all.map((p) => p.net));
  const maxY = Math.max(...all.map((p) => p.net));
  const x = (value: number) => margin.left + ((value - minX) / (maxX - minX)) * (width - margin.left - margin.right);
  const y = (value: number) => margin.top + ((maxY - value) / (maxY - minY)) * (height - margin.top - margin.bottom);
  const parts = [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" font-family="system-ui, sans-serif" font-size="12">`,
    `<rect width="${width}" height="${height}" fill="#fcfcfb"/>`,
    `<text x="${margin.left}" y="22" font-size="14" font-weight="600" fill="#0b0b0b">Development 2014–2022 (in-sample): net P&amp;L vs max MTM drawdown</text>`,
    `<circle cx="${margin.left + 4}" cy="34" r="3" fill="#c3c2b7"/><text x="${margin.left + 12}" y="38" fill="#52514e">random 0–5 session deferral (placebo, 500)</text>`,
    `<circle cx="${margin.left + 290}" cy="34" r="4" fill="#2a78d6"/><text x="${margin.left + 298}" y="38" fill="#52514e">grid rule</text>`,
    `<circle cx="${margin.left + 370}" cy="34" r="5" fill="#eb6834"/><text x="${margin.left + 378}" y="38" fill="#52514e">frozen family pick</text>`
  ];

  for (let tick = Math.ceil(minY / 25000) * 25000; tick <= maxY; tick += 25000) {
    parts.push(
      `<line x1="${margin.left}" x2="${width - margin.right}" y1="${y(tick)}" y2="${y(tick)}" stroke="#e7e6e2"/>`
    );
    parts.push(
      `<text x="${margin.left - 8}" y="${y(tick) + 4}" text-anchor="end" fill="#52514e">${tick < 0 ? '−' : ''}$${Math.abs(tick / 1000)}k</text>`
    );
  }

  for (let tick = Math.ceil(minX / 5000) * 5000; tick <= maxX; tick += 5000) {
    parts.push(
      `<text x="${x(tick)}" y="${height - margin.bottom + 18}" text-anchor="middle" fill="#52514e">$${tick / 1000}k</text>`
    );
  }

  parts.push(
    `<text x="${width / 2}" y="${height - 10}" text-anchor="middle" fill="#0b0b0b">Maximum mark-to-market drawdown (lower is better)</text>`
  );
  parts.push(
    `<text transform="translate(18 ${height / 2}) rotate(-90)" text-anchor="middle" fill="#0b0b0b">Net P&amp;L</text>`
  );

  for (const point of placebo)
    parts.push(`<circle cx="${x(point.dd).toFixed(1)}" cy="${y(point.net).toFixed(1)}" r="2.5" fill="#c3c2b7"/>`);

  for (const point of grid) {
    const isPick = picks.includes(point.id);
    const isA = point.id === 'A_original';
    parts.push(
      `<circle cx="${x(point.dd)}" cy="${y(point.net)}" r="${isPick || isA ? 5 : 4}" fill="${isA ? '#0b0b0b' : isPick ? '#eb6834' : '#2a78d6'}" stroke="#fcfcfb" stroke-width="2"><title>${point.id}: net ${dollars(point.net)}, DD ${dollars(point.dd)}</title></circle>`
    );
    if (isPick || isA)
      parts.push(
        // A and B_skipSlow_60 coincide on development; A's label goes to the left of the point.
        `<text x="${x(point.dd) + (isA ? -9 : 8)}" y="${y(point.net) + (isA ? 4 : -6)}" text-anchor="${isA ? 'end' : 'start'}" fill="#0b0b0b">${isA ? 'A original' : point.id}</text>`
      );
  }

  parts.push('</svg>');
  return parts.join('\n');
};

const parseCsv = (text: string) => {
  const [header, ...lines] = text.trim().split('\n');
  const keys = header!.split(',');
  return lines.map((line) => Object.fromEntries(line.split(',').map((value, index) => [keys[index]!, value])));
};

export const runFinal = async () => {
  if (!(await fs.pathExists(`${resultsDir}/frozen.json`))) {
    throw new Error('results/frozen.json is missing: run the dev command first');
  }

  const frozen = await fs.readJson(`${resultsDir}/frozen.json`);
  const startedAt = new Date().toISOString();
  const context = await buildContext('VGT');
  const { events } = await phaseEvents(context, 'full');
  const fullBaseline = runRule(context, specById('A_original'), { end: context.end });

  await phaseIndicators(context, events, fullBaseline, 'full');

  const rules: Rule[] = [
    { family: 'A', spec: specById('A_original') },
    ...Object.entries(frozen.picks as Record<string, { id: string }>).map(([family, pick]) => ({
      family,
      spec: specById(pick.id)
    }))
  ];
  const devEvents = buildEvents(
    context.bars,
    context.refs,
    context.features,
    context.start,
    context.devEnd,
    context.devEnd
  );
  const windows: Window[] = [
    { name: 'development', from: context.start, to: context.devEnd, outcomeEnd: context.devEnd },
    { name: 'holdout', from: context.holdoutStart, to: context.end, outcomeEnd: context.end },
    { name: 'full', from: context.start, to: context.end, outcomeEnd: context.end }
  ];
  const eventsFor = (window: Window): EventSet => (window.name === 'development' ? devEvents : events);
  const runFor = (rule: Rule, window: Window, execution: Execution, settings: StrategySettings = baselineSettings) =>
    runRule(context, rule.spec, {
      execution,
      settings,
      end: window.name === 'development' ? context.devEnd : context.end
    });

  // Summary tables and the comparison CSV for the frozen rules.
  const comparisonCsv: Record<string, string | number>[] = [];
  const deltaJ: Record<string, { deltaJ: number; deltaNet: number; deltaDrawdown: number }> = {};

  for (const execution of ['close', 'nextOpen'] as const) {
    for (const window of windows) {
      const baseline = runFor(rules[0]!, window, execution);
      const rows: (string | number)[][] = [];

      for (const rule of rules) {
        const result = runFor(rule, window, execution);
        const comparison = compareRow(
          context,
          result,
          baseline,
          eventsFor(window),
          window.from,
          window.to,
          window.outcomeEnd
        );
        const label = rule.family === 'A' ? familyLabel.A! : `${familyLabel[rule.family]}: ${rule.spec.id}`;

        rows.push(summaryRow(label, comparison));
        deltaJ[`${rule.family}|${execution}|${window.name}`] = {
          deltaJ: comparison.deltaObjective,
          deltaNet: comparison.deltaNet,
          deltaDrawdown: comparison.deltaDrawdown
        };
        comparisonCsv.push({
          family: rule.family,
          policy: rule.spec.id,
          execution,
          window: window.name,
          from: comparison.metrics.from,
          to: comparison.metrics.to,
          net_pnl: comparison.metrics.netProfit,
          margin_interest: comparison.metrics.interest,
          max_mtm_drawdown: comparison.metrics.maxDrawdown,
          delta_net_vs_A: comparison.deltaNet,
          delta_drawdown_vs_A: comparison.deltaDrawdown,
          delta_objective_vs_A: comparison.deltaObjective,
          entries: comparison.metrics.entries,
          winners: comparison.metrics.winners,
          exposure_sessions: comparison.metrics.exposureSessions,
          worst_trade: comparison.metrics.worstTrade,
          worst_trade_mae: comparison.metrics.worstTradeMae,
          worst_open_mark: comparison.metrics.worstOpenMark,
          severe_entry_rate_20: comparison.metrics.severeEntryRate20,
          severe_entry_rate_25: comparison.metrics.severeEntryRate25,
          severe_entry_rate_30: comparison.metrics.severeEntryRate30,
          deep_further_drop_rate: comparison.metrics.deepFurtherDropRate,
          severe_episodes: comparison.severe.severeEpisodes,
          severe_episodes_avoided: comparison.severe.avoided,
          severe_pre_trough_entries: comparison.severe.strategyPreTrough,
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
      }

      await writeTable(`summary_${window.name}_${execution}`, markdownTable(summaryHeaders, rows, summaryAlign));
    }
  }

  await writeCsv(`${resultsDir}/frozen_comparison.csv`, comparisonCsv);

  await writeTable(
    'decision_counts',
    markdownTable(
      [
        'Rule',
        'Execution',
        'Window',
        'Candidates faced while flat',
        'Entered',
        'Deferred, then entered',
        'Rejected',
        'Never entered',
        'Severe-entry rate 20 / 25 / 30%',
        'Entries followed by a further ≥10% close drop (≤40 sess.)'
      ],
      comparisonCsv
        .filter((row) => row.window !== 'full')
        .map((row) => [
          row.policy as string,
          row.execution as string,
          row.window as string,
          row.candidates as number,
          row.candidates_entered as number,
          row.candidates_deferred_then_entered as number,
          row.candidates_rejected as number,
          row.candidates_never_entered as number,
          `${percent(row.severe_entry_rate_20 as number, 0)} / ${percent(row.severe_entry_rate_25 as number, 0)} / ${percent(row.severe_entry_rate_30 as number, 0)}`,
          percent(row.deep_further_drop_rate as number, 0)
        ]),
      ['l', 'l', 'l', 'r', 'r', 'r', 'r', 'r', 'r', 'r']
    )
  );

  // Holdout started flat on 2023-01-03 (sensitivity to the carried-over position).
  const flatRows: (string | number)[][] = [];
  const flatBaseline = runRule(context, rules[0]!.spec, { start: context.holdoutStart, end: context.end });

  for (const rule of rules) {
    const result = runRule(context, rule.spec, { start: context.holdoutStart, end: context.end });
    const comparison = compareRow(
      context,
      result,
      flatBaseline,
      events,
      context.holdoutStart,
      context.end,
      context.end
    );
    flatRows.push([
      rule.spec.id,
      dollars(comparison.metrics.netProfit),
      dollars(comparison.metrics.maxDrawdown),
      comparison.metrics.entries,
      signedDollars(comparison.deltaObjective)
    ]);
  }

  await writeTable(
    'holdout_flat_start',
    markdownTable(['Rule', 'Net P&L', 'Max MTM DD', 'Entries', 'Δ J vs A'], flatRows, ['l', 'r', 'r', 'r', 'r'])
  );

  // Costs and margin-rate sensitivities (same-close).
  const sensitivityRows: (string | number)[][] = [];
  const sensitivities: { name: string; settings: StrategySettings }[] = [
    { name: '5 bp per side', settings: { ...baselineSettings, costBps: 5 } },
    { name: '10 bp per side', settings: { ...baselineSettings, costBps: 10 } },
    { name: 'margin 8%', settings: { ...baselineSettings, marginRate: 0.08 } },
    { name: 'margin 14%', settings: { ...baselineSettings, marginRate: 0.14 } }
  ];

  for (const { name, settings } of sensitivities) {
    for (const window of windows.slice(0, 2)) {
      const baseline = runFor(rules[0]!, window, 'close', settings);
      const base = windowMetrics(baseline, context.bars, window.from, window.to, window.outcomeEnd);
      const cells = rules.slice(1).map((rule) => {
        const metrics = windowMetrics(
          runFor(rule, window, 'close', settings),
          context.bars,
          window.from,
          window.to,
          window.outcomeEnd
        );
        return `${signedDollars(metrics.objective - base.objective)} (${signedDollars(metrics.netProfit - base.netProfit)} / ${signedDollars(metrics.maxDrawdown - base.maxDrawdown)})`;
      });
      sensitivityRows.push([
        name,
        window.name,
        `${dollars(base.netProfit)} / ${dollars(base.maxDrawdown)} / ${dollars(base.interest)}`,
        ...cells
      ]);
    }
  }

  await writeTable(
    'sensitivities',
    markdownTable(
      [
        'Assumption',
        'Window',
        'A net / DD / interest',
        ...rules.slice(1).map((rule) => `${rule.family} Δ J (Δ net / Δ DD)`)
      ],
      sensitivityRows,
      ['l', 'l', 'r', ...rules.slice(1).map(() => 'r' as const)]
    )
  );

  // Placebo on the holdout window of continuous runs.
  const placebo = placeboRuns(context, fullBaseline, context.holdoutStart, context.end, context.end);

  await writeCsv(`${resultsDir}/placebo_holdout.csv`, placebo.rows);

  const placeboTable: (string | number)[][] = [];

  for (const name of ['jitter5', 'jitter10']) {
    const summary = placeboSummary(placebo.rows, name);
    placeboTable.push([
      name,
      `${signedDollars(summary.objective.p5)} / ${signedDollars(summary.objective.p50)} / ${signedDollars(summary.objective.p95)}`,
      rules
        .slice(1)
        .map(
          (rule) => `${rule.family} ${percent(summary.percentileOf(deltaJ[`${rule.family}|close|holdout`]!.deltaJ), 0)}`
        )
        .join(', ')
    ]);
  }

  await writeTable(
    'placebo_holdout',
    markdownTable(
      ['Placebo', 'Δ J vs A: 5th / 50th / 95th pct', 'Frozen picks’ holdout Δ J percentile'],
      placeboTable,
      ['l', 'r', 'l']
    )
  );

  // Validation criteria.
  const walkForward = (await fs.readJson(`${resultsDir}/walk_forward.json`)).stitchedOutOfSample as Record<
    string,
    { objective: number }
  >;
  const devBaseline = runFor(rules[0]!, windows[0]!, 'close');
  const validationRows: (string | number)[][] = [];
  const validation: Record<string, unknown> = {};

  for (const rule of rules.slice(1)) {
    const devRun = runFor(rule, windows[0]!, 'close');
    const attribution = episodeAttribution(
      devRun,
      devBaseline,
      devEvents.episodes,
      devEvents.episodeOf,
      context.start,
      context.devEnd
    );
    const wf = walkForward[rule.family]!.objective - walkForward.A!.objective;
    const holdout = deltaJ[`${rule.family}|close|holdout`]!.deltaJ;
    const devClose = deltaJ[`${rule.family}|close|development`]!.deltaJ;
    const devNext = deltaJ[`${rule.family}|nextOpen|development`]!.deltaJ;
    const holdNext = deltaJ[`${rule.family}|nextOpen|holdout`]!.deltaJ;
    const criteria = {
      walkForward: wf > 0,
      holdout: holdout > 0,
      notOneEpisode: attribution.withoutLargest >= 0,
      nextOpenSign: Math.sign(devNext) === Math.sign(devClose) && Math.sign(holdNext) === Math.sign(holdout)
    };
    const validated = Object.values(criteria).every(Boolean);

    validation[rule.family] = {
      id: rule.spec.id,
      wf,
      holdout,
      withoutLargest: attribution.withoutLargest,
      devClose,
      devNext,
      holdNext,
      criteria,
      validated
    };
    validationRows.push([
      `${rule.family}: ${rule.spec.id}`,
      signedDollars(devClose),
      `${signedDollars(wf)} ${criteria.walkForward ? '✓' : '✗'}`,
      `${signedDollars(holdout)} ${criteria.holdout ? '✓' : '✗'}`,
      `${signedDollars(attribution.withoutLargest)} ${criteria.notOneEpisode ? '✓' : '✗'}`,
      `${signedDollars(devNext)} / ${signedDollars(holdNext)} ${criteria.nextOpenSign ? '✓' : '✗'}`,
      validated ? 'yes' : 'no'
    ]);
  }

  await writeJson(`${resultsDir}/validation.json`, validation);
  await writeTable(
    'validation',
    markdownTable(
      [
        'Frozen pick',
        'Dev Δ J (in-sample)',
        '1. Walk-forward Δ J',
        '2. Holdout Δ J',
        '3. Dev Δ net without largest episode',
        '4. Next-open Δ J dev / holdout',
        'Validated'
      ],
      validationRows,
      ['l', 'r', 'r', 'r', 'r', 'r', 'l']
    )
  );

  // Episode attribution over the full period (same-close).
  const fullRuns = rules.map((rule) => ({ rule, result: runFor(rule, windows[2]!, 'close') }));
  const attributions = fullRuns
    .slice(1)
    .map(({ result }) =>
      episodeAttribution(result, fullBaseline, events.episodes, events.episodeOf, context.start, context.end)
    );

  await writeTable(
    'attribution_full',
    markdownTable(
      [
        'Episode (first −10%)',
        'Max DD',
        'Severe',
        'A trades P&L',
        'A worst MTM',
        ...fullRuns.slice(1).map(({ rule }) => `${rule.family} Δ P&L / worst MTM`)
      ],
      events.episodes.map((episode, index) => {
        const aRow = attributions[0]!.rows[index]!;
        return [
          episode.signalDate,
          percent(episode.maxDrawdownClose),
          episode.labels[primaryKey] === null ? 'cens.' : episode.labels[primaryKey] ? 'yes' : 'no',
          dollars(aRow.baseline),
          dollars(aRow.baselineWorst),
          ...attributions.map(
            (attribution) =>
              `${signedDollars(attribution.rows[index]!.delta)} / ${dollars(attribution.rows[index]!.strategyWorst)}`
          )
        ];
      }),
      ['l', 'r', 'l', 'r', 'r', ...attributions.map(() => 'r' as const)]
    )
  );

  // Pre-2014 stress test (VGT 2006–2013), frozen rules only.
  const stress = await buildContext('VGT', stressStart);
  const stressEndIndex = lastIndexOnOrBefore(stress.bars, stressEnd);
  const stressEvents = buildEvents(
    stress.bars,
    stress.refs,
    stress.features,
    stress.start,
    stressEndIndex,
    stressEndIndex
  );
  const stressBaseline = runRule(stress, rules[0]!.spec, { end: stressEndIndex });
  const stressRows: (string | number)[][] = [];

  for (const rule of rules) {
    const result = runRule(stress, rule.spec, { end: stressEndIndex });
    stressRows.push(
      summaryRow(
        rule.family === 'A' ? familyLabel.A! : `${rule.family}: ${rule.spec.id}`,
        compareRow(stress, result, stressBaseline, stressEvents, stress.start, stressEndIndex, stressEndIndex)
      )
    );
  }

  await writeTable('stress_2006_2013', markdownTable(summaryHeaders, stressRows, summaryAlign));
  await writeTable(
    'stress_episodes_2006_2013',
    markdownTable(
      ['First −10%', 'Velocity', 'Max DD', 'Trough', '≥20% ≤40 sess.', 'Recovered'],
      stressEvents.episodes.map((episode: Episode) => [
        episode.signalDate,
        episode.velocitySessions,
        percent(episode.maxDrawdownClose),
        episode.troughDate,
        episode.labels[primaryKey] === null ? 'cens.' : episode.labels[primaryKey] ? 'yes' : 'no',
        episode.recovered ? episode.recoveryDate : 'no (censored)'
      ]),
      ['l', 'r', 'r', 'l', 'l', 'l']
    )
  );

  await writeTable(
    'threshold_timing_2006_2013',
    markdownTable(
      ['First −10%', 'Sessions to −15%', 'to −20%', 'to −25%', 'to −30%', 'Calendar days to −20%', 'Episode'],
      thresholdTimingRows(stress.bars, stressEvents.episodes),
      ['l', 'r', 'r', 'r', 'r', 'r', 'l']
    )
  );

  // Cross-ETF robustness, frozen rules, no retuning.
  const etfRows: (string | number)[][] = [];
  const etfCsv: Record<string, string | number>[] = [];

  for (const symbol of robustnessSymbols) {
    const etf = await buildContext(symbol);
    const etfEvents = buildEvents(etf.bars, etf.refs, etf.features, etf.start, etf.end, etf.end);
    const severe = etfEvents.episodes.filter((episode) => episode.labels[primaryKey]).length;

    for (const execution of ['close', 'nextOpen'] as const) {
      const base = runRule(etf, rules[0]!.spec, { end: etf.end, execution });
      const baseMetrics = windowMetrics(base, etf.bars, etf.start, etf.end, etf.end);
      const cells: string[] = [];

      for (const rule of rules.slice(1)) {
        const comparison = compareRow(
          etf,
          runRule(etf, rule.spec, { end: etf.end, execution }),
          base,
          etfEvents,
          etf.start,
          etf.end,
          etf.end
        );
        cells.push(
          `${signedDollars(comparison.deltaObjective)} (${signedDollars(comparison.deltaNet)} / ${signedDollars(comparison.deltaDrawdown)})`
        );
        etfCsv.push({
          symbol,
          execution,
          policy: rule.spec.id,
          family: rule.family,
          delta_net: comparison.deltaNet,
          delta_drawdown: comparison.deltaDrawdown,
          delta_objective: comparison.deltaObjective,
          entries: comparison.metrics.entries,
          baseline_entries: baseMetrics.entries
        });
      }

      etfRows.push([
        symbol,
        execution,
        `${etf.bars.date[etf.start]} → ${etf.bars.date[etf.end]}`,
        `${etfEvents.episodes.length} (${severe})`,
        `${dollars(baseMetrics.netProfit)} / ${dollars(baseMetrics.maxDrawdown)}`,
        ...cells
      ]);
    }
  }

  await writeCsv(`${resultsDir}/cross_etf.csv`, etfCsv);
  await writeTable(
    'cross_etf',
    markdownTable(
      [
        'ETF',
        'Execution',
        'Window',
        'Episodes (severe)',
        'A net / DD',
        ...rules.slice(1).map((rule) => `${rule.family} Δ J (Δ net / Δ DD)`)
      ],
      etfRows,
      ['l', 'l', 'l', 'r', 'r', ...rules.slice(1).map(() => 'r' as const)]
    )
  );

  // Full-period exports for every rule (reported only; selection was frozen before this ran).
  const trades: Record<string, string | number | boolean>[] = [];
  const decisions: Record<string, string | number | boolean>[] = [];
  const gridHoldout: Record<string, string | number>[] = [];
  const allSpecs = [...gridSpecs, ...rules.filter((rule) => rule.family === 'F').map((rule) => rule.spec)];

  for (const execution of ['close', 'nextOpen'] as const) {
    const base = runRule(context, rules[0]!.spec, { end: context.end, execution });

    for (const spec of allSpecs) {
      const result = runRule(context, spec, { end: context.end, execution });
      trades.push(...tradeRows(context, result, { policy: spec.id, family: spec.family, execution }));
      decisions.push(...decisionRows(result, { policy: spec.id, execution }));
      const comparison = compareRow(context, result, base, events, context.holdoutStart, context.end, context.end);
      gridHoldout.push({
        policy: spec.id,
        family: spec.family,
        execution,
        net_pnl: comparison.metrics.netProfit,
        max_mtm_drawdown: comparison.metrics.maxDrawdown,
        delta_net_vs_A: comparison.deltaNet,
        delta_drawdown_vs_A: comparison.deltaDrawdown,
        delta_objective_vs_A: comparison.deltaObjective,
        entries: comparison.metrics.entries
      });
    }
  }

  await writeCsv(`${resultsDir}/trades_all_rules.csv`, trades);
  await writeCsv(`${resultsDir}/decisions_all_rules.csv`, decisions);
  await writeCsv(`${resultsDir}/grid_holdout_not_for_selection.csv`, gridHoldout);

  // Nearby rules: each frozen pick with its grid neighbours, development and holdout, both executions.
  const devGrid = parseCsv(await fs.readFile(`${resultsDir}/grid_development.csv`, 'utf8'));
  const neighbours = [
    ['B_skipSlow_20', 'B_skipSlow_40', 'B_skipSlow_60'],
    ['C_gate_accel_3', 'C_gate_accel_5', 'C_gate_ret5_4', 'C_gate_ret5_6', 'C_gate_ret5_8'],
    ['D_upClose_rebound', 'D_upClose_zone', 'D_rebound_2_rebound', 'D_noNewLow_2_rebound', 'D_volContract_rebound'],
    ['E_ret5_15', 'E_ret5_15_stab', 'E_score', 'E_score_stab', 'E_score_skip', 'E_flat15', 'E_fast15']
  ].flat();
  const devDelta = (id: string, execution: string) =>
    Number(devGrid.find((row) => row.policy === id && row.execution === execution)!.delta_objective_vs_A);
  const holdDelta = (id: string, execution: string) =>
    gridHoldout.find((row) => row.policy === id && row.execution === execution)!.delta_objective_vs_A as number;

  await writeTable(
    'neighbours',
    markdownTable(
      ['Rule', 'Dev Δ J (same-close)', 'Dev Δ J (next open)', 'Holdout Δ J (same-close)', 'Holdout Δ J (next open)'],
      neighbours.map((id) => [
        id,
        signedDollars(devDelta(id, 'close')),
        signedDollars(devDelta(id, 'nextOpen')),
        signedDollars(holdDelta(id, 'close')),
        signedDollars(holdDelta(id, 'nextOpen'))
      ]),
      ['l', 'r', 'r', 'r', 'r']
    )
  );

  for (const { rule } of fullRuns) {
    for (const execution of ['close', 'nextOpen'] as const) {
      const result = runRule(context, rule.spec, { end: context.end, execution });
      await writeCsv(
        `${resultsDir}/trades/${rule.spec.id}_${execution}.csv`,
        tradeRows(context, result, { policy: rule.spec.id, execution })
      );
      await writeCsv(
        `${resultsDir}/decisions/${rule.spec.id}_${execution}.csv`,
        decisionRows(result, { policy: rule.spec.id, execution })
      );
    }
  }

  // Charts.
  const gridDev = parseCsv(await fs.readFile(`${resultsDir}/grid_development.csv`, 'utf8'))
    .filter((row) => row.execution === 'close')
    .map((row) => ({ id: row.policy!, net: Number(row.net_pnl), dd: Number(row.max_mtm_drawdown) }));
  const placeboDev = parseCsv(await fs.readFile(`${resultsDir}/placebo_development.csv`, 'utf8'))
    .filter((row) => row.placebo === 'jitter5')
    .map((row) => ({ net: Number(row.net_pnl), dd: Number(row.max_mtm_drawdown) }));

  await fs.writeFile(
    `${researchDir}/charts/pareto_development.svg`,
    paretoChart(
      gridDev,
      placeboDev,
      rules.slice(1).map((rule) => rule.spec.id)
    )
  );

  const chartSeries = [
    { label: 'A', color: '#2a78d6', result: fullRuns[0]!.result },
    {
      label: 'E',
      color: '#eb6834',
      result: fullRuns.find(({ rule }) => rule.family === 'E')!.result
    },
    { label: `F`, color: '#1baf7a', result: fullRuns.find(({ rule }) => rule.family === 'F')!.result }
  ];

  await fs.writeFile(`${researchDir}/charts/mtm_full.svg`, mtmChart(context, chartSeries, context.holdoutStart));
  await writeJson(`${resultsDir}/final_run.json`, {
    startedAt,
    finishedAt: new Date().toISOString(),
    frozen,
    protocolSha256: await sha256File(`${researchDir}/PROTOCOL.md`),
    dataEnd: context.bars.date[context.end]
  });
  console.info(JSON.stringify(validation, null, 1));
};
