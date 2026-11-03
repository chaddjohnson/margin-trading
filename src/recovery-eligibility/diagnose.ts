// The diagnostic stages (research/vgt-recovery-eligibility/ROOT_CAUSE.md, LOOKBACK_CONTROLS.md and
// COUNTERFACTUALS.md): the Set 2 state trace through the missed 2023 recovery, the closest approach to the
// arming level, the lookback and threshold controls, and every mechanism at its predeclared defaults, with the
// base's six parameters frozen. Everything is written as Markdown tables and CSV under results/diagnostics.
import path from 'node:path';
import fs from 'fs-extra';
import {
  type Dataset,
  ReferenceHighCache,
  computeReferenceHighs,
  firstIndexOnOrAfter,
  lastIndexOnOrBefore
} from '../four-family/data.ts';
import { type Data, formatDollars, formatSignedDollars, fullSpec, protocol, stageDir, writeJson } from './context.ts';
import { type Detail, type Metrics, evaluateCandidate } from './evaluate.ts';
import { type IntParams, families, set2Params, trades2Params } from './families.ts';
import {
  type EpisodeMove,
  csvLine,
  episodeAttribution,
  episodeMoves,
  metricsHeader,
  metricsRow,
  pct,
  price,
  tradeRows,
  tradeTable
} from './report.ts';

const diagnosticsDir = stageDir('diagnostics');

export interface Candidate {
  label: string;
  familyKey: string;
  params: IntParams;
  armStart?: number;
  note?: string;
}

export interface CandidateResult {
  label: string;
  familyKey: string;
  params: IntParams;
  armStart: number;
  metrics: Metrics;
  detail: Detail;
}

export const runCandidate = (ds: Dataset, highs: ReferenceHighCache, candidate: Candidate): CandidateResult => {
  const armStart = candidate.armStart ?? protocol.eligibilityIndex;
  const spec = fullSpec(ds, protocol.stopFill, protocol.marginInterestRate, armStart);
  const { metrics, detail } = evaluateCandidate(ds, highs, candidate.familyKey, candidate.params, spec, true);

  return {
    label: candidate.label,
    familyKey: candidate.familyKey,
    params: candidate.params,
    armStart,
    metrics,
    detail: detail!
  };
};

// Markdown for one candidate: its summary row, its trades and its episode attribution.
export const candidateSection = (ds: Dataset, moves: EpisodeMove[], result: CandidateResult, heading: string) => {
  const rows = tradeRows(ds, result.detail.trades, result.detail.accounting);
  const attribution = episodeAttribution(rows, moves);
  const lines = [
    `### ${heading}`,
    '',
    metricsHeader('Candidate'),
    metricsRow(result.label, result.metrics),
    '',
    tradeTable(rows),
    '',
    '| Episode | Trades | First entry | Net | Share of the move captured | Worst trade |',
    '|---|---:|---|---:|---:|---:|',
    ...attribution.map(
      (row) =>
        `| ${row.name} | ${row.trades} | ${row.firstEntry || '—'} | ${formatSignedDollars(row.net)} | ${row.trades > 0 ? pct(row.capturedShare, 0) : '—'} | ${row.trades > 0 ? formatSignedDollars(row.worst) : '—'} |`
    ),
    ''
  ];

  return lines.join('\n');
};

const writeText = async (file: string, text: string) => {
  await fs.ensureDir(path.dirname(file));
  await fs.writeFile(file, text.endsWith('\n') ? text : `${text}\n`);
};

// Section 2 of the brief: the state trace and the closest approach.
export const rootCause = async ({ ds }: Data) => {
  const highs = new ReferenceHighCache(ds);
  const moves = episodeMoves(ds);
  const base = families.base!;
  const set2 = runCandidate(ds, highs, {
    label: 'Set 2 (file semantics, arming from session 74)',
    familyKey: 'base',
    params: set2Params(base),
    armStart: 74
  });
  const trace = set2.detail.trace;
  const lookbacks = [74, 90, 104, 183, 365];
  const highsByL = Object.fromEntries(lookbacks.map((L) => [L, computeReferenceHighs(ds, L, 0)])) as Record<
    number,
    Float64Array
  >;
  const from = firstIndexOnOrAfter(ds, '2022-10-01');
  const to = lastIndexOnOrBefore(ds, '2023-09-30');
  const X = 0.216;

  // The session-level trace.
  const traceLines = [
    '| Date | Close | Session low | Lowest minute close | Ref. high (L 74) | Arming level (21.6%) | Depth at close | Depth at lowest close | State | Setup | Trailing low | Rebound trigger | Ref. high L 90 | L 104 | L 183 | L 365 |',
    '|---|---:|---:|---:|---:|---:|---:|---:|---|---|---:|---:|---:|---:|---:|---:|'
  ];
  const csv = [
    'date,close,low,min_close,ref_high_74,x_level,depth_close,depth_min_close,state,setup,trailing_low,rebound_trigger,ref_high_90,ref_high_104,ref_high_183,ref_high_365'
  ];

  for (const row of trace) {
    if (row.index < from || row.index > to) {
      continue;
    }

    const date = ds.dates[row.index]!;
    const depthClose = 1 - row.close / row.recentHigh;
    const depthMin = 1 - row.minClose / row.recentHigh;

    traceLines.push(
      `| ${date} | ${price(row.close)} | ${price(row.low)} | ${price(row.minClose)} | ${price(row.recentHigh)} | ${price(row.xLevel)} | ${pct(depthClose, 2)} | ${pct(depthMin, 2)} | ${row.entryState} | ${row.setupKind} | ${price(row.trailingLow)} | ${price(row.reboundTrigger)} | ${price(highsByL[90]![row.index]!)} | ${price(highsByL[104]![row.index]!)} | ${price(highsByL[183]![row.index]!)} | ${price(highsByL[365]![row.index]!)} |`
    );
    csv.push(
      csvLine([
        date,
        row.close,
        row.low,
        row.minClose,
        row.recentHigh,
        row.xLevel,
        depthClose,
        depthMin,
        row.entryState,
        row.setupKind,
        row.trailingLow,
        row.reboundTrigger,
        highsByL[90]![row.index]!,
        highsByL[104]![row.index]!,
        highsByL[183]![row.index]!,
        highsByL[365]![row.index]!
      ])
    );
  }

  // The closest approach to the arming level between the 2022-12-15 exit and the 2025-04-04 entry, per
  // lookback, and against frozen anchors.
  const exitIndex = firstIndexOnOrAfter(ds, '2022-12-16');
  const nextEntry = lastIndexOnOrBefore(ds, '2025-04-03');
  const approach = (highsArray: Float64Array, label: string, until = nextEntry) => {
    let best = { depth: -Infinity, index: -1 };

    for (let s = exitIndex; s <= until; s++) {
      const depth = 1 - ds.sMinClose[s]! / highsArray[s]!;

      if (depth > best.depth) {
        best = { depth, index: s };
      }
    }

    const s = best.index;

    return `| ${label} | ${ds.dates[s]} | ${price(ds.sMinClose[s]!)} | ${price(highsArray[s]!)} | ${pct(best.depth, 2)} | ${price(highsArray[s]! * (1 - X))} | ${pct(X - best.depth, 2)} |`;
  };
  const frozen = (anchor: number) => new Float64Array(ds.sessionCount).fill(anchor);
  const approachLines = [
    '| Reference | Date of the closest approach | Lowest minute close | Reference high then | Depth | Level needed (21.6%) | Shortfall |',
    '|---|---|---:|---:|---:|---:|---:|',
    approach(highsByL[74]!, 'Rolling L 74 (Set 2)', lastIndexOnOrBefore(ds, '2023-12-29')),
    approach(highsByL[90]!, 'Rolling L 90', lastIndexOnOrBefore(ds, '2023-12-29')),
    approach(highsByL[104]!, 'Rolling L 104 (Trades2)', lastIndexOnOrBefore(ds, '2023-12-29')),
    approach(highsByL[183]!, 'Rolling L 183', lastIndexOnOrBefore(ds, '2023-12-29')),
    approach(highsByL[365]!, 'Rolling L 365', lastIndexOnOrBefore(ds, '2023-12-29')),
    approach(
      frozen(391.6),
      "Frozen 391.60 (the 2022-11-04 setup's reference high, the 2022-08-16 peak)",
      lastIndexOnOrBefore(ds, '2023-12-29')
    ),
    approach(
      frozen(467.06),
      "Frozen 467.06 (the 2021-12-28 peak, the first 2022 arming's reference)",
      lastIndexOnOrBefore(ds, '2023-12-29')
    )
  ];

  // Minute-level detail on the key sessions.
  const keyDates = ['2022-12-15', '2022-12-16', '2022-12-28', '2023-01-03', '2023-01-04', '2023-01-05'];
  const minuteLines = [
    '| Session | Ref. high (L 74) | Arming level | Lowest minute close (time) | Depth | Lowest minute low | Session close | Minutes at or below the level |',
    '|---|---:|---:|---|---:|---:|---:|---:|'
  ];

  for (const date of keyDates) {
    const s = firstIndexOnOrAfter(ds, date);
    const start = ds.sBarStart[s]!;
    const count = ds.sBarCount[s]!;
    const level = highsByL[74]![s]! * (1 - X);
    let minClose = Infinity;
    let minTime = 0;
    let below = 0;

    for (let k = 0; k < count; k++) {
      const close = ds.bClose[start + k]!;

      if (close < minClose) {
        minClose = close;
        minTime = ds.bTime[start + k]!;
      }

      if (close <= level) {
        below++;
      }
    }

    minuteLines.push(
      `| ${date} | ${price(highsByL[74]![s]!)} | ${price(level)} | ${price(minClose)} (${new Date(minTime * 1000).toISOString().slice(11, 16)} UTC) | ${pct(1 - minClose / highsByL[74]![s]!, 2)} | ${price(ds.sLow[s]!)} | ${price(ds.sClose[s]!)} | ${below} |`
    );
  }

  // The rolling high's composition: which session supplied the L 74 high on each key date.
  const supplierLines = [
    '| Date | Ref. high (L 74) | Supplied by the session high of | Sessions until it leaves the window |',
    '|---|---:|---|---:|'
  ];

  for (const date of [
    '2022-11-04',
    '2022-12-13',
    '2022-12-15',
    '2022-12-28',
    '2023-01-04',
    '2023-02-01',
    '2023-03-01'
  ]) {
    const s = firstIndexOnOrAfter(ds, date);
    const windowStart = Math.max(0, s - 74);
    let supplier = windowStart;

    for (let w = windowStart; w < s; w++) {
      if (ds.sHigh[w]! >= ds.sHigh[supplier]!) {
        supplier = w;
      }
    }

    supplierLines.push(
      `| ${date} | ${price(highsByL[74]![s]!)} | ${ds.dates[supplier]} (${price(ds.sHigh[supplier]!)}) | ${supplier + 74 - s + 1} |`
    );
  }

  // Comparators: allIn.ts-like thresholds through this architecture, one change at a time, on the file semantics.
  const comparators: Candidate[] = [
    { label: 'Set 2 (X 21.6%, L 74)', familyKey: 'base', params: set2Params(base), armStart: 74 },
    {
      label: 'Set 2 with L 90 (allIn.ts lookback)',
      familyKey: 'base',
      params: set2Params(base, { tickWindowSize: 90 }),
      armStart: 90
    },
    {
      label: 'Set 2 with X 10.0% (allIn.ts threshold)',
      familyKey: 'base',
      params: set2Params(base, { targetPercentChange: 100 }),
      armStart: 74
    },
    {
      label: 'Set 2 with X 10.0% and L 90',
      familyKey: 'base',
      params: set2Params(base, { targetPercentChange: 100, tickWindowSize: 90 }),
      armStart: 90
    },
    {
      label: 'Set 2 with X 20.0% (Trades2 threshold)',
      familyKey: 'base',
      params: set2Params(base, { targetPercentChange: 200 }),
      armStart: 74
    },
    {
      label: 'Set 2 with L 104 (Trades2 lookback)',
      familyKey: 'base',
      params: set2Params(base, { tickWindowSize: 104 }),
      armStart: 104
    },
    {
      label: 'Set 2 with X 20.0% and L 104',
      familyKey: 'base',
      params: set2Params(base, { targetPercentChange: 200, tickWindowSize: 104 }),
      armStart: 104
    },
    {
      label: 'Trades2 (X 20.0% Y 0.5% stop 7.8% hold 11 L 104 buffer 0.2%)',
      familyKey: 'base',
      params: trades2Params(base),
      armStart: 104
    }
  ];
  const comparatorResults = comparators.map((candidate) => runCandidate(ds, highs, candidate));
  const r2023 = (result: CandidateResult) => {
    const rows = tradeRows(ds, result.detail.trades, result.detail.accounting).filter((row) => row.episode === 'r2023');

    return rows.length > 0
      ? `${rows[0]!.entryDate} ${price(rows[0]!.entryPrice)} → ${rows.map((row) => `${row.exitDate || 'open'} ${formatSignedDollars(row.profit)}`).join('; ')}`
      : 'none';
  };
  const comparatorLines = [
    metricsHeader('Candidate (file semantics: arming from session L)', '2023 recovery trade(s)'),
    ...comparatorResults.map((result) => metricsRow(result.label, result.metrics, r2023(result)))
  ];

  const text = [
    '# Root-cause diagnostics (generated)',
    '',
    `Generated by \`npm run recovery-eligibility -- root-cause\` on ${protocol.dataFile} (${ds.sessionCount} sessions, ${ds.firstDate} → ${ds.lastDate}).`,
    '',
    '## Set 2 reproduction through the engine',
    '',
    metricsHeader('Candidate'),
    metricsRow(set2.label, set2.metrics),
    '',
    tradeTable(tradeRows(ds, set2.detail.trades, set2.detail.accounting), false),
    '',
    '## Closest approach to the 21.6% arming level after the 2022-12-15 exit (through 2023-12-29)',
    '',
    ...approachLines,
    '',
    '## Minute-level detail on the key sessions',
    '',
    ...minuteLines,
    '',
    '## Which session supplied the 74-session reference high',
    '',
    ...supplierLines,
    '',
    '## One-change comparators against allIn.ts and Trades2',
    '',
    ...comparatorLines,
    '',
    '## Session trace 2022-10-01 → 2023-09-30 (Set 2)',
    '',
    ...traceLines,
    ''
  ].join('\n');

  await writeText(path.join(diagnosticsDir, 'root-cause.md'), text);
  await writeText(path.join(diagnosticsDir, 'root-cause-trace.csv'), csv.join('\n'));
  await writeJson(path.join(diagnosticsDir, 'root-cause.json'), {
    set2: { metrics: set2.metrics, trades: tradeRows(ds, set2.detail.trades, set2.detail.accounting) },
    comparators: comparatorResults.map((result) => ({
      label: result.label,
      params: result.params,
      metrics: result.metrics,
      trades: tradeRows(ds, result.detail.trades, result.detail.accounting)
    })),
    moves
  });
  console.info(text.split('\n').slice(0, 60).join('\n'));
  console.info(`Wrote ${diagnosticsDir}/root-cause.md`);
};

// Section 4 of the brief: lookback and threshold controls, one parameter at a time.
export const controls = async ({ ds }: Data) => {
  const highs = new ReferenceHighCache(ds);
  const moves = episodeMoves(ds);
  const base = families.base!;
  const sections: string[] = [];
  const summary: Record<string, unknown>[] = [];

  // Lookback controls: file semantics (arming from session L, as the user ran them) and the common run.
  for (const mode of ['file', 'common'] as const) {
    const lines = [
      metricsHeader(
        `L (${mode === 'file' ? 'file semantics, arming from session L' : `common run, arming from session ${protocol.eligibilityIndex}`})`,
        '2023 recovery'
      )
    ];

    for (const L of [45, 60, 74, 90, 104, 120, 150, 183, 250, 365]) {
      const result = runCandidate(ds, highs, {
        label: `L ${L}`,
        familyKey: 'base',
        params: set2Params(base, { tickWindowSize: L }),
        armStart: mode === 'file' ? L : protocol.eligibilityIndex
      });
      const rows = tradeRows(ds, result.detail.trades, result.detail.accounting);
      const r2023 = episodeAttribution(rows, moves).find((row) => row.key === 'r2023')!;

      lines.push(
        metricsRow(
          result.label,
          result.metrics,
          r2023.trades > 0 ? `${r2023.firstEntry}: ${formatSignedDollars(r2023.net)}` : 'none'
        )
      );
      summary.push({ control: 'lookback', mode, L, metrics: result.metrics, trades: rows });

      if ([74, 90, 183, 365].includes(L)) {
        sections.push(
          candidateSection(
            ds,
            moves,
            result,
            `Set 2 with L ${L} (${mode === 'file' ? 'file semantics' : 'common run'})`
          )
        );
      }
    }

    sections.unshift(lines.join('\n'));
  }

  // The full L sweep on the common run, for the curve.
  const sweep = ['L,net,minute_dd,daily_dd,entries,wins,losses,worst_trade,r2023_net,r2023_first_entry'];

  for (let L = 45; L <= 365; L++) {
    const result = runCandidate(ds, highs, {
      label: `L ${L}`,
      familyKey: 'base',
      params: set2Params(base, { tickWindowSize: L })
    });
    const rows = tradeRows(ds, result.detail.trades, result.detail.accounting);
    const r2023 = episodeAttribution(rows, moves).find((row) => row.key === 'r2023')!;

    sweep.push(
      csvLine([
        L,
        result.metrics.net,
        result.metrics.minuteDrawdown,
        result.metrics.dailyDrawdown,
        result.metrics.entries,
        result.metrics.wins,
        result.metrics.losses,
        result.metrics.worstTrade,
        r2023.net,
        r2023.firstEntry
      ])
    );
  }

  // Threshold-only controls at L 74.
  const xLines = [metricsHeader('X (L 74, common run)', '2023 recovery')];
  const xSweep = ['X,net,minute_dd,daily_dd,entries,wins,losses,worst_trade,r2023_net,r2023_first_entry'];

  for (let X = 50; X <= 300; X++) {
    const result = runCandidate(ds, highs, {
      label: `X ${(X / 10).toFixed(1)}%`,
      familyKey: 'base',
      params: set2Params(base, { targetPercentChange: X })
    });
    const rows = tradeRows(ds, result.detail.trades, result.detail.accounting);
    const r2023 = episodeAttribution(rows, moves).find((row) => row.key === 'r2023')!;

    xSweep.push(
      csvLine([
        X / 10,
        result.metrics.net,
        result.metrics.minuteDrawdown,
        result.metrics.dailyDrawdown,
        result.metrics.entries,
        result.metrics.wins,
        result.metrics.losses,
        result.metrics.worstTrade,
        r2023.net,
        r2023.firstEntry
      ])
    );

    if ([50, 80, 100, 120, 140, 150, 160, 170, 180, 190, 200, 205, 210, 216, 220, 230, 240, 250, 300].includes(X)) {
      xLines.push(
        metricsRow(
          result.label,
          result.metrics,
          r2023.trades > 0 ? `${r2023.firstEntry}: ${formatSignedDollars(r2023.net)}` : 'none'
        )
      );
      summary.push({ control: 'threshold', X: X / 10, metrics: result.metrics, trades: rows });
    }

    if ([100, 150, 200].includes(X)) {
      sections.push(candidateSection(ds, moves, result, `Set 2 with X ${(X / 10).toFixed(1)}% (common run)`));
    }
  }

  const text = [
    '# Lookback and threshold controls (generated)',
    '',
    `Generated by \`npm run recovery-eligibility -- controls\`. Set 2's other five parameters are frozen in every row.`,
    '',
    '## Lookback controls',
    '',
    sections[1]!,
    '',
    sections[0]!,
    '',
    '## Threshold controls',
    '',
    xLines.join('\n'),
    '',
    '## Trade lists',
    '',
    ...sections.slice(2),
    ''
  ].join('\n');

  await writeText(path.join(diagnosticsDir, 'controls.md'), text);
  await writeText(path.join(diagnosticsDir, 'lookback-sweep.csv'), sweep.join('\n'));
  await writeText(path.join(diagnosticsDir, 'threshold-sweep.csv'), xSweep.join('\n'));
  await writeJson(path.join(diagnosticsDir, 'controls.json'), summary);
  console.info(text.split('\n').slice(0, 45).join('\n'));
  console.info(`Wrote ${diagnosticsDir}/controls.md`);
};

// The predeclared mechanism counterfactuals: each mechanism at its defaults and on a small predeclared grid,
// with Set 2's six parameters frozen (PROTOCOL.md section 3).
export const counterfactualGrid = (): Candidate[] => {
  const list: Candidate[] = [];
  const add = (familyKey: string, label: string, overrides: IntParams, note = '') =>
    list.push({ label, familyKey, params: set2Params(families[familyKey]!, overrides), note });

  add('base', 'Set 2 (base)', {});

  // A: persistent correction reference = latch depth X (21.6%), both anchor policies; E: shallower latches.
  for (const anchorPolicy of [0, 1]) {
    add(
      'latch',
      `A: anchored arming at X, anchor ${anchorPolicy === 0 ? 'highest' : 'latest'} (reset 50%, expiry 250)`,
      { latchDepth: 216, anchorPolicy }
    );
  }

  for (const U of [150, 100, 50, 0]) {
    add('latch', `E: latch depth ${(U / 10).toFixed(1)}% (reset 50%, expiry 250)`, { latchDepth: U });
  }

  for (const reset of [380, 700, 1000]) {
    add('latch', `E: latch depth 10.0%, reset ${(reset / 10).toFixed(0)}%`, { latchDepth: 100, episodeReset: reset });
  }

  for (const expiry of [60, 120, 500]) {
    add('latch', `E: latch depth 10.0%, expiry ${expiry}`, { latchDepth: 100, episodeExpiry: expiry });
  }

  // B: trough recovery.
  for (const T of [30, 50, 80, 100, 150]) {
    add('trough', `B: trough recovery ${(T / 10).toFixed(1)}% (reset 50%, expiry 250)`, { troughRecovery: T });
  }

  for (const F of [200, 300]) {
    add('trough', `B: trough recovery 5.0% and retrace ${(F / 10).toFixed(0)}%`, {
      troughRecovery: 50,
      troughRetrace: F
    });
  }

  // C: dual mode, against the global-X control.
  for (const X2 of [100, 120, 150]) {
    for (const Y2 of [3, 10, 30]) {
      add('dual', `C: shallow X2 ${(X2 / 10).toFixed(1)}% / Y2 ${(Y2 / 10).toFixed(1)}%`, {
        shallowDepth: X2,
        shallowRebound: Y2
      });
    }

    add('base', `control: global X ${(X2 / 10).toFixed(1)}%`, { targetPercentChange: X2 });
  }

  // D: post-exit continuation.
  for (const P of [30, 50, 80, 100]) {
    for (const W of [30, 60, 120]) {
      add('postExit', `D: pullback ${(P / 10).toFixed(1)}% within ${W} sessions`, {
        pullback: P,
        continuationWindow: W
      });
    }
  }

  // Amendment 1 (after the first run showed every episode mechanism inert at a 50% reset, because the
  // 2022 episode had reset during the November 2022 rally while a position was open): resets of 60–100%,
  // and the reset tested only at flat closes.
  for (const resetPolicy of [0, 1]) {
    for (const reset of [500, 600, 700, 800, 1000]) {
      const policy = resetPolicy === 0 ? 'any close' : 'flat closes only';

      add('latch', `A1: anchored arming at X, anchor highest, reset ${(reset / 10).toFixed(0)}% at ${policy}`, {
        latchDepth: 216,
        episodeReset: reset,
        resetPolicy
      });
      add('latch', `A1: anchored arming at X, anchor latest, reset ${(reset / 10).toFixed(0)}% at ${policy}`, {
        latchDepth: 216,
        episodeReset: reset,
        resetPolicy,
        anchorPolicy: 1
      });
      add('latch', `E1: latch depth 10.0%, reset ${(reset / 10).toFixed(0)}% at ${policy}`, {
        latchDepth: 100,
        episodeReset: reset,
        resetPolicy
      });
      add('latch', `E1: latch depth 0.0%, reset ${(reset / 10).toFixed(0)}% at ${policy}`, {
        latchDepth: 0,
        episodeReset: reset,
        resetPolicy
      });
      add('trough', `B1: trough recovery 5.0%, reset ${(reset / 10).toFixed(0)}% at ${policy}`, {
        troughRecovery: 50,
        episodeReset: reset,
        resetPolicy
      });
      add('trough', `B1: trough recovery 10.0%, reset ${(reset / 10).toFixed(0)}% at ${policy}`, {
        troughRecovery: 100,
        episodeReset: reset,
        resetPolicy
      });
    }
  }

  for (const expiry of [60, 120, 500]) {
    add('latch', `A1: anchored arming at X, reset 100%, expiry ${expiry}`, {
      latchDepth: 216,
      episodeReset: 1000,
      episodeExpiry: expiry
    });
    add('trough', `B1: trough recovery 5.0%, reset 100%, expiry ${expiry}`, {
      troughRecovery: 50,
      episodeReset: 1000,
      episodeExpiry: expiry
    });
  }

  return list;
};

export const counterfactuals = async ({ ds }: Data) => {
  const highs = new ReferenceHighCache(ds);
  const moves = episodeMoves(ds);
  const results = counterfactualGrid().map((candidate) => runCandidate(ds, highs, candidate));
  const baseResult = results[0]!;
  const baseRows = tradeRows(ds, baseResult.detail.trades, baseResult.detail.accounting);
  const baseByEpisode = Object.fromEntries(episodeAttribution(baseRows, moves).map((row) => [row.key, row.net]));
  const lines = [
    '| Candidate | Net | Δ vs Set 2 | Minute DD | Daily DD | Entries | W/L | Worst trade | Worst streak | Interest | 2023 recovery | Δ 2019 | Δ 2020 | Δ 2022 bear | Δ 2024 | Δ 2025 | Δ other |',
    '|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|---:|---:|---:|---:|---:|---:|'
  ];
  const json: Record<string, unknown>[] = [];

  for (const result of results) {
    const rows = tradeRows(ds, result.detail.trades, result.detail.accounting);
    const attribution = episodeAttribution(rows, moves);
    const by = Object.fromEntries(attribution.map((row) => [row.key, row]));
    const otherNet = rows.filter((row) => row.episode === 'other').reduce((total, row) => total + row.profit, 0);
    const baseOther = baseRows.filter((row) => row.episode === 'other').reduce((total, row) => total + row.profit, 0);
    const delta = (key: string) => formatSignedDollars(by[key]!.net - baseByEpisode[key]!);
    const r2023 = by.r2023!;

    lines.push(
      `| ${result.label} | ${formatDollars(result.metrics.net)} | ${formatSignedDollars(result.metrics.net - baseResult.metrics.net)} | ${formatDollars(result.metrics.minuteDrawdown)} | ${formatDollars(result.metrics.dailyDrawdown)} | ${result.metrics.entries}${result.metrics.openAtEnd ? ' (1 open)' : ''} | ${result.metrics.wins}/${result.metrics.losses} | ${formatDollars(result.metrics.worstTrade)} | ${formatDollars(result.metrics.worstEpisodeLoss)} | ${formatDollars(result.metrics.interest)} | ${r2023.trades > 0 ? `${r2023.firstEntry}: ${formatSignedDollars(r2023.net)} (${pct(r2023.capturedShare, 0)})` : 'none'} | ${delta('r2019')} | ${delta('r2020')} | ${delta('bear2022')} | ${delta('r2024')} | ${delta('r2025')} | ${formatSignedDollars(otherNet - baseOther)} |`
    );
    json.push({
      label: result.label,
      familyKey: result.familyKey,
      params: result.params,
      metrics: result.metrics,
      attribution,
      trades: rows
    });
  }

  const sections = results
    .filter((result) =>
      /^(Set 2|A1: anchored arming at X, anchor highest, reset (70|100)% at any close|E1: latch depth 10\.0%, reset 100% at any close|E1: latch depth 10\.0%, reset 50% at flat|B1: trough recovery 5\.0%, reset (70|100)% at any close|B1: trough recovery 10\.0%, reset 100% at any close|C: shallow X2 10\.0% \/ Y2 3\.0%|control: global X 10\.0%|D: pullback 8\.0% within 120)/.test(
        result.label
      )
    )
    .map((result) => candidateSection(ds, moves, result, result.label));
  const text = [
    '# Mechanism counterfactuals at predeclared settings (generated)',
    '',
    `Generated by \`npm run recovery-eligibility -- counterfactuals\`. Set 2's six parameters are frozen in every row; the common run arms from session ${protocol.eligibilityIndex} (${protocol.eligibilityDate}). Δ columns are the change in net profit of the trades entered in each recovery episode against Set 2.`,
    '',
    lines.join('\n'),
    '',
    '## Trade lists of the headline settings',
    '',
    ...sections,
    ''
  ].join('\n');

  await writeText(path.join(diagnosticsDir, 'counterfactuals.md'), text);
  await writeJson(path.join(diagnosticsDir, 'counterfactuals.json'), json);
  console.info(lines.join('\n'));
  console.info(`Wrote ${diagnosticsDir}/counterfactuals.md`);
};
