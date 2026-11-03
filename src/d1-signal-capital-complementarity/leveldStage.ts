// Stage 4 Level D (PROTOCOL.md §6): from the sealed signal ledgers only (no data access): the 61×61 ordered pair
// matrices of each view-window, cross-ETF families (w = 10; 5 and 20 as sensitivities), the per-ETF summaries and first-
// order classes against B4 and B5, baseline occupancy with the Q7 split, overlap by regime, the Q1 lists and the H3
// U-vs-P comparison.
import fs from 'fs-extra';
import {
  type BaselineKey,
  type DataEnd,
  type ViewKey,
  type WindowKey,
  type WindowSpec,
  baselines,
  levelD,
  matrixViews,
  nowIso,
  resultFile,
  rubric,
  windows
} from './context.ts';
import { regimes } from './events.ts';
import { refuseOverrides, requireCodeFrozen, requireProtected } from './freeze.ts';
import { MinuteGrid } from './grid.ts';
import { type Interval, clip, complementOf, intersectionLength, lengthOf, normalize } from './intervals.ts';
import { fundedGateTrades } from './ledger.ts';
import {
  type SymbolSummary,
  familiesOfView,
  familyIndex,
  flagsOf,
  holdingInterval,
  inWindow,
  occupancyOf,
  summarize,
  timelineOf,
  windowIndexOf
} from './leveld.ts';
import { type PairRow, pairMatrix } from './pairs.ts';
import { type DataEndRuns, readSignals, signalsFile } from './pipeline.ts';
import { readSealed, sha256, writeGz, writeRecord, writeTextOnce } from './records.ts';
import { universeSymbols } from './doors.ts';

export const leveldFile = resultFile('leveld', 'LEVELD.json');

const dataEndOf = (window: WindowKey): DataEnd => (window === 'A' ? '2021-12-31' : '2023-12-29');

const spearman = (x: readonly number[], y: readonly number[]) => {
  const rank = (values: readonly number[]) => {
    const order = values.map((value, index) => ({ value, index })).sort((a, b) => a.value - b.value);
    const ranks = new Array<number>(values.length);
    let i = 0;

    while (i < order.length) {
      let j = i;

      while (j + 1 < order.length && order[j + 1]!.value === order[i]!.value) {
        j++;
      }

      for (let k = i; k <= j; k++) {
        ranks[order[k]!.index] = (i + j) / 2 + 1;
      }

      i = j + 1;
    }

    return ranks;
  };
  const rx = rank(x);
  const ry = rank(y);
  const n = x.length;

  if (n < 3) {
    return null;
  }

  const mean = (n + 1) / 2;
  let sxy = 0;
  let sxx = 0;
  let syy = 0;

  for (let k = 0; k < n; k++) {
    sxy += (rx[k]! - mean) * (ry[k]! - mean);
    sxx += (rx[k]! - mean) ** 2;
    syy += (ry[k]! - mean) ** 2;
  }

  return sxx > 0 && syy > 0 ? sxy / Math.sqrt(sxx * syy) : null;
};

const csvMatrix = (symbols: readonly string[], rows: readonly PairRow[], value: (row: PairRow) => number | null) => {
  const byPair = new Map(rows.map((row) => [`${row.a}|${row.b}`, row]));
  const lines = [['a \\ b', ...symbols].join(',')];

  for (const a of symbols) {
    lines.push(
      [
        a,
        ...symbols.map((b) => {
          const cell = value(byPair.get(`${a}|${b}`)!);

          return cell === null || cell === undefined || Number.isNaN(cell) ? 'NA' : cell.toFixed(4);
        })
      ].join(',')
    );
  }

  return `${lines.join('\n')}\n`;
};

export const analyzeViewWindow = (
  runs: DataEndRuns,
  view: ViewKey,
  window: WindowKey,
  symbols: readonly string[],
  spec: WindowSpec = windows[window]
) => {
  const grid = new MinuteGrid({
    sCloseTime: Float64Array.from(runs.calendar.sCloseTime),
    sessionCount: runs.calendar.dates.length,
    dates: runs.calendar.dates
  });
  const dates = runs.calendar.dates;
  const w = windowIndexOf(dates, grid, spec);
  const records = new Map((runs.views[view] ?? []).map((record) => [record.symbol, record]));
  const timelines = symbols.map((symbol) => {
    const record = records.get(symbol);

    return timelineOf(
      symbol,
      Boolean(record),
      record?.trades ?? [],
      record?.setups ?? [],
      grid,
      { sClose: Float64Array.from(runs.closes[symbol]!) },
      w
    );
  });
  const pairs = pairMatrix(timelines);
  const allTrades = [...records.values()].flatMap((record) => record.trades);
  const families = familiesOfView(allTrades, w, levelD.familyWindow);
  const index = familyIndex(families);
  const sensitivities = Object.fromEntries(
    levelD.familyWindowSensitivity.map((width) => {
      const clusters = familiesOfView(allTrades, w, width);

      return [
        `w${width}`,
        {
          families: clusters.length,
          solo: clusters.filter((family) => family.symbols.length === 1).length,
          marketWide: clusters.filter((family) => family.symbols.length >= levelD.marketWide).length
        }
      ];
    })
  );
  const familyRows = families.map((family) => ({
    id: family.id,
    start: dates[family.anchorSession]!,
    end: dates[family.lastSession]!,
    sessions: family.lastSession - family.anchorSession + 1,
    decisions: family.items.length,
    symbols: family.symbols,
    regime:
      regimes.find(
        (regime) => regime.start <= dates[family.anchorSession]! && dates[family.anchorSession]! <= regime.end
      )?.key ?? 'none',
    first: family.items[0]!.symbol
  }));

  // Per baseline: the per-ETF summaries, occupancy, the Q7 split and regime overlap.
  const perBaseline: Record<string, unknown> = {};

  for (const baseline of baselines) {
    const base = runs.baselines[baseline];
    const funded = fundedGateTrades(base.records);
    const summaries: SymbolSummary[] = [];

    for (const symbol of symbols) {
      const record = records.get(symbol);

      summaries.push(
        summarize(symbol, Boolean(record), record?.trades ?? [], record?.setups ?? [], funded, index, dates, w)
      );
    }

    const fundedRecords = base.records.filter((record) => record.fundedLot > 0);
    const occupancy = occupancyOf(baseline, window, fundedRecords, base.daily, grid, w);
    const baseHolding = clip(
      fundedRecords.map((record) => holdingInterval(grid, record)),
      w.span
    );
    const idle = complementOf(baseHolding, w.span);
    const anyArmedOrHolding = normalize(timelines.flatMap((timeline) => [...timeline.armed, ...timeline.holding]));
    const q7 = {
      idleMinutes: lengthOf(idle),
      idleWithSomeEtfArmedOrHolding: intersectionLength(idle, anyArmedOrHolding),
      idleWithNoEtfArmedOrHolding: lengthOf(idle) - intersectionLength(idle, anyArmedOrHolding)
    };
    const regimeOverlap = Object.fromEntries(
      timelines.map((timeline) => [
        timeline.symbol,
        Object.fromEntries(
          regimes.map((regime) => {
            const first = dates.findIndex((date) => date >= regime.start);
            let last = -1;

            for (let s = 0; s < dates.length; s++) {
              if (dates[s]! <= regime.end) {
                last = s;
              }
            }

            if (first < 0 || last < first) {
              return [regime.key, null];
            }

            const span = grid.span(Math.max(first, w.first), Math.min(last, w.end));

            if (span[1] <= span[0]) {
              return [regime.key, null];
            }

            const own = clip(timeline.holding, span as Interval);
            const ownMinutes = lengthOf(own);

            return [
              regime.key,
              ownMinutes > 0 ? intersectionLength(own, clip(baseHolding, span as Interval)) / ownMinutes : null
            ];
          })
        )
      ])
    );
    const idleStretchDecisions = occupancy.idleStretches.slice(0, 15).map((stretch) => {
      const inside = allTrades.filter(
        (trade) =>
          inWindow(trade, w) &&
          dates[trade.decisionIndex]! >= stretch.start &&
          dates[trade.decisionIndex]! <= stretch.end
      );

      return {
        ...stretch,
        decisions: inside.length,
        symbols: [...new Set(inside.map((trade) => trade.symbol))].sort()
      };
    });

    perBaseline[baseline] = {
      summaries,
      flags: Object.fromEntries(
        summaries.map((summary) => [summary.symbol, flagsOf(summary, rubric.minClean, rubric.minIndependent)])
      ),
      occupancy: {
        ...occupancy,
        idleStretches: idleStretchDecisions,
        idleStretchCount: occupancy.idleStretches.length
      },
      q7,
      regimeOverlap
    };
  }

  // Price-defined dip episodes in the window (per ETF).
  const dips = Object.fromEntries(
    symbols.map((symbol) => {
      const episodes = runs.catalogs[symbol]!.filter(
        (episode) => episode.eligible && episode.troughIndex >= w.first && episode.troughIndex <= w.end
      );

      return [
        symbol,
        {
          episodes: episodes.length,
          major: episodes.filter((episode) => episode.major).length,
          families: new Set(episodes.map((episode) => episode.family)).size
        }
      ];
    })
  );

  // Leading: the share of an ETF's families where it has the family's first decision.
  const leading = Object.fromEntries(
    symbols.map((symbol) => {
      const own = families.filter((family) => family.symbols.includes(symbol) && family.symbols.length > 1);

      return [
        symbol,
        own.length > 0 ? own.filter((family) => family.items[0]!.symbol === symbol).length / own.length : null
      ];
    })
  );

  return { view, window, pairs, families: familyRows, sensitivities, perBaseline, dips, leading, symbols };
};

export const stageLevelD = async () => {
  refuseOverrides();

  const { protocol, code } = await requireCodeFrozen();

  await requireProtected();

  if (await fs.pathExists(leveldFile)) {
    throw new Error(`${leveldFile} exists`);
  }

  for (const end of ['2021-12-31', '2023-12-29'] as const) {
    await readSealed(signalsFile(end));
  }

  const startedAt = nowIso();
  const symbols = await universeSymbols();
  const cache = new Map<DataEnd, DataEndRuns>();
  const runsAt = async (end: DataEnd) => {
    if (!cache.has(end)) {
      cache.set(end, await readSignals(end));
    }

    return cache.get(end)!;
  };
  const outputs: Record<string, unknown> = {};
  const payloads: Record<string, { file: string; sha256: string; bytes: number }> = {};
  const matrices: Record<string, Record<string, { file: string; sha256: string }>> = {};
  const analyses = new Map<string, ReturnType<typeof analyzeViewWindow>>();

  for (const { view, window } of [...matrixViews]) {
    const runs = await runsAt(dataEndOf(window));
    const analysis = analyzeViewWindow(runs, view, window, symbols);
    const key = `${view}-${window}`;

    analyses.set(key, analysis);
    payloads[key] = await writeGz(resultFile('leveld', `${key}.json.gz`), analysis);
    matrices[key] = {};

    for (const [metric, value] of [
      ['decision-match-s5', (row: PairRow) => row.matchShare.s5 ?? null],
      ['decision-match-s20', (row: PairRow) => row.matchShare.s20 ?? null],
      ['decision-match-session', (row: PairRow) => row.matchShare.session ?? null],
      ['armed-share', (row: PairRow) => row.armedShare],
      ['holding-share', (row: PairRow) => row.holdShare],
      ['holding-jaccard', (row: PairRow) => row.holdJaccard],
      ['return-correlation', (row: PairRow) => row.returnCorrelation]
    ] as const) {
      matrices[key]![metric] = await writeTextOnce(
        resultFile('leveld', 'matrices', `${key}-${metric}.csv`),
        csvMatrix(symbols, analysis.pairs, value)
      );
    }

    outputs[key] = {
      families: analysis.families.length,
      solo: analysis.families.filter((family) => family.symbols.length === 1).length,
      marketWide: analysis.families.filter((family) => family.symbols.length >= levelD.marketWide).length,
      sensitivities: analysis.sensitivities
    };
  }

  // Q1 lists on U-T (PROTOCOL.md §6.6).
  const ut = analyses.get('U-T')!;
  const decisionsOf = new Map(
    (ut.perBaseline.B5 as { summaries: SymbolSummary[] }).summaries.map((summary) => [
      summary.symbol,
      summary.decisions
    ])
  );
  const eligiblePair = (row: PairRow) =>
    row.a !== row.b && (decisionsOf.get(row.a) ?? 0) >= 4 && (decisionsOf.get(row.b) ?? 0) >= 4;
  const q1 = {
    lowCorrelationColliding: ut.pairs
      .filter(
        (row) =>
          eligiblePair(row) &&
          row.returnCorrelation !== null &&
          row.returnCorrelation <= 0.3 &&
          (row.matchShare.s5 ?? -1) >= 0.5
      )
      .map((row) => ({ a: row.a, b: row.b, rho: row.returnCorrelation, s5: row.matchShare.s5 })),
    correlatedAsynchronous: ut.pairs
      .filter(
        (row) =>
          eligiblePair(row) &&
          row.returnCorrelation !== null &&
          row.returnCorrelation >= 0.7 &&
          (row.matchShare.s5 ?? 2) <= 0.2
      )
      .map((row) => ({ a: row.a, b: row.b, rho: row.returnCorrelation, s5: row.matchShare.s5 })),
    asynchronousRelativeTo: Object.fromEntries(
      baselines.map((baseline) => [
        baseline,
        (ut.perBaseline[baseline] as { summaries: SymbolSummary[] }).summaries
          .filter((summary) => summary.decisions >= 4)
          .map((summary) => ({
            symbol: summary.symbol,
            decisions: summary.decisions,
            idleShare: (summary.idleClean.count + summary.idleDisplacing.count) / summary.decisions
          }))
          .filter((item) => item.idleShare >= 0.5)
      ])
    )
  };

  // H3: U vs P on the fold windows (common members, both with ≥ 1 decision).
  const h3 = Object.fromEntries(
    (['A', 'B'] as const).map((window) => {
      const u = analyses.get(`U-${window}`)!;
      const pv = analyses.get(window === 'A' ? 'P-A-A' : 'P-B-B')!;
      const pRows = new Map(pv.pairs.map((row) => [`${row.a}|${row.b}`, row]));
      const x: number[] = [];
      const y: number[] = [];

      for (const row of u.pairs) {
        const other = pRows.get(`${row.a}|${row.b}`);

        if (row.a !== row.b && other && row.matchShare.s5 !== null && other.matchShare.s5 !== null) {
          x.push(row.matchShare.s5!);
          y.push(other.matchShare.s5!);
        }
      }

      return [
        window,
        {
          pairs: x.length,
          spearmanS5: spearman(x, y),
          perEtf: Object.fromEntries(
            baselines.map((baseline) => [
              baseline,
              (u.perBaseline[baseline] as { summaries: SymbolSummary[] }).summaries.map((summary) => {
                const ps = (pv.perBaseline[baseline] as { summaries: SymbolSummary[] }).summaries.find(
                  (item) => item.symbol === summary.symbol
                )!;

                return {
                  symbol: summary.symbol,
                  uDecisions: summary.decisions,
                  uIdleClean: summary.idleClean.count,
                  uIdleCleanNet: summary.idleClean.net,
                  pMember: ps.member,
                  pDecisions: ps.decisions,
                  pIdleClean: ps.idleClean.count,
                  pIdleCleanNet: ps.idleClean.net
                };
              })
            ])
          )
        }
      ];
    })
  );

  return writeRecord(leveldFile, {
    stage: 'leveld',
    startedAt,
    finishedAt: nowIso(),
    guard: { protocolFreeze: protocol.bodyHash, codeFreeze: code.bodyHash },
    viewWindows: outputs,
    payloads,
    matrices,
    q1,
    h3,
    digest: sha256(JSON.stringify(payloads))
  });
};

export type BaselineAnalysis = {
  summaries: SymbolSummary[];
  flags: Record<string, { T: boolean; E: boolean; breadth: boolean }>;
  occupancy: unknown;
  q7: { idleMinutes: number; idleWithSomeEtfArmedOrHolding: number; idleWithNoEtfArmedOrHolding: number };
  regimeOverlap: Record<string, Record<string, number | null>>;
};

export const baselineKeys: readonly BaselineKey[] = baselines;
