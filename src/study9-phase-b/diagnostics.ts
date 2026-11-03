// Post-test analyses (PROTOCOL.md §11; report-only), after test-F24-confirm, on the `post` door (one continuous run
// 2016-01-04 → 2026-10-29, the F24 test run). For every sealed F24 role holder and VG #2, VG #1, B1 and B5:
//   (a) complementarity: all 2^n − 1 membership subsets with the sealed vectors held fixed (net, DD, lots, refusals,
//       interest, training- and test-window net), leave-one-out deltas and Shapley values — conditional on the vectors
//       and the shared-slot order, not intrinsic ETF alpha; accepted and refused decisions per book;
//   (b) liquidity: each funded lot's entry and exit fill bar from the raw minute file (volume is not in the loaded
//       dataset): the bar's dollar volume against the $100k notional, the notional that would stay ≤ 10% of it, the
//       ETF's median regular-session minute dollar volume (training and test windows), stop-through-open fills and
//       their cost beyond the stop, and held sessions with fewer bars than the session's minutes. The engine has no
//       partial fills and nothing is changed;
//   (c) risk and events: the five worst lot MAEs and largest lot loss, the five largest drawdown episodes with lot
//       attribution, the worst overnight gaps while holding, the longest losing streak, the worst calendar year,
//       ex-best-year and ex-2020 net, early/late training halves, event windows (M2020, 2022, the 2023 regional-bank
//       episode, T2025Q2, G2026), per-book profit and drawdown contributions, top-lot and top-5-lot shares.
// The run must reproduce the sealed F24 centres (net, DD, lots) or the stage fails. Nothing here can change a sealed
// record, a ranking or a gate.
import path from 'node:path';
import fs from 'fs-extra';
import { bootstrapComparators, canonicalRoot, evaluationEnd, frozenSelectionFile, resultFile } from './context.ts';
import { controlsOf, symbolsOf } from './controls.ts';
import { familyDesign, uniquePoints } from './designs.ts';
import { openDoor } from './door.ts';
import { type Books, Lab, P9Evaluator, PointCache, baseSettings } from './engine.ts';
import { prefixOf, requireIntegrity } from './integrity.ts';
import { log, nowIso, readSealed, writeSealed } from './records.ts';
import { drawdownEpisodes, lotContributions, minuteSeries, newYork, seriesLabOf } from './series.ts';
import { testFile } from './test.ts';

export const diagnosticsFile = () => resultFile('diagnostics', 'diagnostics.json');

const r2 = (v: number) => (Number.isFinite(v) ? Math.round(v * 100) / 100 : v);
const median = (values: number[]) => {
  const s = [...values].sort((a, b) => a - b);

  return s.length ? (s.length % 2 ? s[(s.length - 1) / 2]! : (s[s.length / 2 - 1]! + s[s.length / 2]!) / 2) : NaN;
};

// Raw regular-session minute volumes through the door's end: time (s) → [close, volume].
const volumesOf = async (symbol: string, end: string) => {
  const file = path.join(canonicalRoot, symbol, 'data.csv');
  const cut = await prefixOf(file, end);
  const text = (await fs.readFile(file)).subarray(0, cut.bytes).toString('latin1');
  const map = new Map<number, [number, number]>();

  for (const line of text.split('\n')) {
    if (!line) continue;

    const parts = line.split(',');
    const t = Date.parse(parts[0]!.slice(1, -1)) / 1000;

    map.set(t, [Number(parts[4]), Number(parts[5])]);
  }

  return map;
};

const subsetsOf = (symbols: readonly string[]) => {
  const out: string[][] = [];

  for (let mask = 1; mask < 1 << symbols.length; mask++) out.push(symbols.filter((_s, i) => mask & (1 << i)));

  return out;
};

const factorial = (n: number): number => (n <= 1 ? 1 : n * factorial(n - 1));

export const shapleyOf = (symbols: readonly string[], value: (subset: readonly string[]) => number) => {
  const n = symbols.length;
  const cache = new Map<string, number>();
  const v = (subset: readonly string[]) => {
    if (!subset.length) return 0;

    const key = [...subset].sort().join('+');

    if (!cache.has(key)) cache.set(key, value(subset));
    return cache.get(key)!;
  };

  return Object.fromEntries(
    symbols.map((symbol) => {
      const others = symbols.filter((s) => s !== symbol);
      let total = 0;

      for (const subset of [[], ...subsetsOf(others)]) {
        const weight = (factorial(subset.length) * factorial(n - subset.length - 1)) / factorial(n);

        total += weight * (v([...subset, symbol]) - v(subset));
      }

      return [symbol, r2(total)];
    })
  );
};

export const runDiagnostics = async () => {
  const out = diagnosticsFile();

  if (await fs.pathExists(out)) throw new Error(`${out} exists (sealed)`);

  await requireIntegrity('diagnostics', { canonical: true });

  const frozen = await readSealed<{
    rankedByFold: Record<string, { rank: number; track: string; role: string; id: string; books: Books }[]>;
  }>(frozenSelectionFile);
  const test = await readSealed<{
    holders: {
      rank: number;
      evidence: { centre: { net: number; dd: number; lots: number } };
      gates: { status: string };
    }[];
    controls: Record<string, { evidence: { centre: { net: number; dd: number; lots: number } } }>;
  }>(testFile('F24'));
  const comparators = await controlsOf([...bootstrapComparators]);
  const configs: {
    who: string;
    kind: string;
    books: Books;
    sealed?: { net: number; dd: number; lots: number };
    status?: string;
  }[] = [
    ...(frozen.rankedByFold.F24 ?? []).map((h) => {
      const t = test.holders.find((x) => x.rank === h.rank);

      return {
        who: `#${h.rank} ${h.track} ${h.role} ${h.id}`,
        kind: 'holder',
        books: h.books,
        sealed: t?.evidence.centre,
        status: t?.gates.status
      };
    }),
    ...Object.entries(comparators).map(([key, books]) => ({
      who: key,
      kind: 'control',
      books,
      sealed: test.controls[key]?.evidence.centre
    }))
  ];
  const symbols = [...new Set(configs.flatMap((c) => Object.keys(c.books)))];
  const door = await openDoor(
    'post',
    [...new Set([...symbols, ...symbolsOf(comparators)])],
    'post-test analyses (report-only)'
  );
  const ev = new P9Evaluator(door);
  const lab = new Lab(ev, PointCache.memory(door, 'post'));
  const volumes = Object.fromEntries(
    await Promise.all(symbols.map(async (s) => [s, await volumesOf(s, evaluationEnd)] as const))
  );
  const testStart = door.indexOf('2025-01-01');
  const medianDollar = Object.fromEntries(
    symbols.map((s) => {
      const ds = door.loaded.universe.instruments[s]!.ds;
      const window = (from: number, to: number) => {
        const values: number[] = [];

        for (let i = from; i <= to; i++) {
          for (let k = 0; k < ds.sBarCount[i]!; k++) {
            const row = volumes[s]!.get(ds.bTime[ds.sBarStart[i]! + k]!);

            if (row) values.push(row[0] * row[1]);
          }
        }

        return r2(median(values));
      };

      return [s, { training: window(door.eligibilityIndex, testStart - 1), test: window(testStart, door.lastIndex) }];
    })
  );
  const window = (
    record: { periods: Record<string, number> },
    result: { marks: Float64Array },
    start: string,
    end: string
  ) => {
    const first = door.indexOf(start);
    const last = door.lastIndexOn(end);

    return first <= last ? r2(result.marks[last]! - (first > 0 ? result.marks[first - 1]! : 0)) : NaN;
  };

  const rows = configs.map((config) => {
    const books = config.books;
    const members = Object.keys(books);
    const record = lab.point(books);
    const result = ev.replay(books, baseSettings, true);

    if (
      config.sealed &&
      !(
        Math.abs(config.sealed.net - record.net) < 0.005 &&
        Math.abs(config.sealed.dd - record.dd) < 0.005 &&
        config.sealed.lots === record.lots
      )
    )
      throw new Error(`diagnostics: ${config.who} does not reproduce its sealed F24 centre`);

    // (a) complementarity
    const subsets = subsetsOf(members).map((subset) => {
      const sub = Object.fromEntries(subset.map((s) => [s, books[s]!]));
      const r = lab.point(sub);

      return {
        books: subset.join('+'),
        net: r.net,
        train: r.periods['TRAIN-F24'] ?? NaN,
        test: r.periods['TEST-F24'] ?? NaN,
        dd: r2(r.dd),
        lots: r.lots,
        refused: r.refused,
        interest: r.interest
      };
    });
    const valueOf = (key: 'net' | 'train' | 'test') => (subset: readonly string[]) =>
      subsets.find((s) => s.books === members.filter((m) => subset.includes(m)).join('+'))?.[key] ?? 0;
    const full = subsets.at(-1)!;
    const leaveOneOut =
      members.length > 1
        ? Object.fromEntries(
            members.map((s) => {
              const rest = subsets.find((x) => x.books === members.filter((m) => m !== s).join('+'))!;

              return [
                s,
                {
                  net: r2(full.net - rest.net),
                  test: r2(full.test - rest.test),
                  dd: r2(full.dd - rest.dd),
                  interest: r2(full.interest - rest.interest)
                }
              ];
            })
          )
        : {};
    const decisions = Object.fromEntries(
      members.map((s) => {
        const trades = ev
          .trace(s, books[s]!, baseSettings)
          .trades.filter((t) => t.decisionIndex >= door.eligibilityIndex);
        const accepted = result.lots.filter((l) => l.symbol === s).length;

        return [
          s,
          {
            virtualTrades: trades.length,
            accepted,
            refused: Object.entries(record.refusalsBy)
              .filter(([k]) => k.startsWith(`${s}<`))
              .reduce((a, [, n]) => a + n, 0)
          }
        ];
      })
    );

    // (b) liquidity, per funded lot
    const trades = Object.fromEntries(
      members.map((s) => [s, new Map(ev.trace(s, books[s]!, baseSettings).trades.map((t) => [t.id, t]))])
    );
    const lotRows = result.lots.map((lot) => {
      const trade = trades[lot.symbol]!.get(lot.tradeId)!;
      const bar = (time: number) => volumes[lot.symbol]!.get(time);
      const entryBar = bar(lot.entryTime);
      const exitBar = lot.exitTime > 0 ? bar(lot.exitTime) : undefined;
      const ds = door.loaded.universe.instruments[lot.symbol]!.ds;
      let sparseSessions = 0;

      for (let i = lot.entryIndex; i <= (lot.exitIndex >= 0 ? lot.exitIndex : door.lastIndex); i++)
        if (ds.sBarCount[i]! < 300) sparseSessions++;

      return {
        symbol: lot.symbol,
        entry: newYork(lot.entryTime),
        exit: lot.exitTime > 0 ? newYork(lot.exitTime) : '',
        net: lot.net,
        exitReason: trade.exitReason,
        entryExecution: trade.entryExecution,
        exitExecution: trade.exitExecution,
        entryBarDollars: entryBar ? r2(entryBar[0] * entryBar[1]) : null,
        exitBarDollars: exitBar ? r2(exitBar[0] * exitBar[1]) : null,
        entryNotionalAt10Pct: entryBar ? r2(0.1 * entryBar[0] * entryBar[1]) : null,
        exitNotionalAt10Pct: exitBar ? r2(0.1 * exitBar[0] * exitBar[1]) : null,
        gapLossBeyondStop:
          trade.exitReason === 'trailing stop gap' ? r2(trade.shares * (trade.exitStopPrice - trade.exitRawPrice)) : 0,
        heldSessions: (lot.exitIndex >= 0 ? lot.exitIndex : door.lastIndex) - lot.entryIndex + 1,
        sparseHeldSessions: sparseSessions,
        inTest: lot.entryIndex >= testStart
      };
    });
    const fills = lotRows.flatMap((l) => [l.entryBarDollars, l.exitBarDollars]).filter((v): v is number => v !== null);
    const liquidity = {
      fills: fills.length,
      fillsBelowNotional: fills.filter((v) => v < 100000).length,
      fillsBelow10xNotional: fills.filter((v) => v < 1000000).length,
      medianFillBarDollars: r2(median(fills)),
      missingFillBars:
        lotRows.filter((l) => l.entryBarDollars === null).length +
        lotRows.filter((l) => l.exit && l.exitBarDollars === null).length,
      gapStops: lotRows.filter((l) => l.exitReason === 'trailing stop gap').length,
      gapLossBeyondStop: r2(lotRows.reduce((a, l) => a + l.gapLossBeyondStop, 0)),
      lotsWithSparseHeldSessions: lotRows.filter((l) => l.sparseHeldSessions > 0).length,
      byEtf: Object.fromEntries(
        members.map((s) => {
          const mine = lotRows.filter((l) => l.symbol === s);
          const f = mine.flatMap((l) => [l.entryBarDollars, l.exitBarDollars]).filter((v): v is number => v !== null);

          return [
            s,
            {
              lots: mine.length,
              medianMinuteDollars: medianDollar[s],
              medianFillBarDollars: r2(median(f)),
              fillsBelowNotional: f.filter((v) => v < 100000).length,
              gapStops: mine.filter((l) => l.exitReason === 'trailing stop gap').length
            }
          ];
        })
      )
    };

    // (c) risk and events
    const series = minuteSeries(seriesLabOf(lab), result, books, baseSettings);
    const worst = new Map<number, { mae: number; time: number }>();

    for (const point of series.points) {
      if (point.openLot < 0) continue;

      const current = worst.get(point.openLot);

      if (!current || point.unrealized < current.mae)
        worst.set(point.openLot, { mae: point.unrealized, time: point.time });
    }

    const maes = series.lots
      .map((lot) => ({
        symbol: lot.symbol,
        entry: newYork(lot.entryTime),
        net: lot.net,
        mae: r2(worst.get(lot.id)?.mae ?? 0),
        at: newYork(worst.get(lot.id)?.time ?? 0)
      }))
      .sort((a, b) => a.mae - b.mae);
    const episodes = drawdownEpisodes(series, 5).map((e) => {
      const contributions = lotContributions(series, e.peakIndex, e.troughIndex);
      const bySymbol: Record<string, number> = {};

      for (const row of contributions.rows) bySymbol[row.symbol] = r2((bySymbol[row.symbol] ?? 0) + row.contribution);

      return {
        depth: r2(e.depth),
        peak: newYork(series.points[e.peakIndex]?.time ?? 0),
        trough: newYork(series.points[e.troughIndex]?.time ?? 0),
        recovery: e.recoveryIndex >= 0 ? newYork(series.points[e.recoveryIndex]!.time) : 'not recovered',
        lots: contributions.rows.length,
        bySymbol
      };
    });
    const gaps: { symbol: string; date: string; gap: number }[] = [];

    for (const lot of series.lots) {
      const ds = door.loaded.universe.instruments[lot.symbol]!.ds;
      const last = lot.exitIndex >= 0 ? lot.exitIndex : door.lastIndex;

      for (let i = lot.entryIndex + 1; i <= last; i++) {
        if (!(ds.sBarCount[i]! > 0)) continue;

        const open = ds.bOpen[ds.sBarStart[i]!]!;
        const close = ds.sClose[i - 1]!;

        gaps.push({ symbol: lot.symbol, date: door.dates[i]!, gap: r2(lot.shares * (open - close)) });
      }
    }

    let streak = 0;
    let longest = 0;

    for (const lot of result.lots.filter((l) => !l.open)) {
      streak = lot.net < 0 ? streak + 1 : 0;
      longest = Math.max(longest, streak);
    }

    const yearKeys = Object.keys(record.periods).filter((k) => /^\d{4}(~partial)?$/.test(k));
    const yearsNet = Object.fromEntries(yearKeys.map((k) => [k, record.periods[k]!]));
    const sortedLots = result.lots.map((l) => l.net).sort((a, b) => b - a);
    const risk = {
      net: record.net,
      dd: r2(record.dd),
      ddDaily: r2(record.ddDaily),
      worstMaes: maes.slice(0, 5),
      largestLotLoss: r2(Math.min(0, ...result.lots.map((l) => l.net))),
      episodes,
      worstOvernightGaps: gaps.sort((a, b) => a.gap - b.gap).slice(0, 5),
      longestLosingStreak: longest,
      years: yearsNet,
      worstYear: Object.entries(yearsNet).sort((a, b) => a[1] - b[1])[0] ?? null,
      exBestYear: r2(record.net - record.bestYear),
      ex2020: r2(record.net - (record.periods['2020'] ?? 0)),
      early: window(record, result, '2017-06-15', '2020-12-31'),
      late: window(record, result, '2021-01-01', '2024-12-31'),
      events: {
        M2020: record.periods.M2020 ?? NaN,
        Y2022: record.periods['2022'] ?? NaN,
        R2223: record.periods.R2223 ?? NaN,
        KRE2023: window(record, result, '2023-03-01', '2023-05-31'),
        T2025Q2: record.periods.T2025Q2 ?? NaN,
        G2026: record.periods.G2026 ?? NaN,
        Y2025: record.periods.Y2025 ?? NaN,
        Y2026YTD: record.periods.Y2026YTD ?? NaN
      },
      topLotShare: record.net > 0 ? r2((sortedLots[0] ?? 0) / record.net) : NaN,
      top5LotShare: record.net > 0 ? r2(sortedLots.slice(0, 5).reduce((a, b) => a + b, 0) / record.net) : NaN,
      perBook: Object.fromEntries(
        members.map((s) => [
          s,
          {
            net: record.books[s]?.net ?? 0,
            lots: record.books[s]?.lots ?? 0,
            worstEpisodeContribution: episodes[0]?.bySymbol[s] ?? 0
          }
        ])
      )
    };

    // (d) the decisive F24 test families' neighbours (3 × 128, unique; review m16): test-window net, test-window
    // daily-close drawdown, whole-run minute DD and refused signals per neighbour
    const neighbours = uniquePoints(
      [1, 2, 3].flatMap((rep) => familyDesign(books, members, { n: 128, labels: ['test', 'sets', 'F24', rep] })),
      books
    );
    const nRows = neighbours.map((point) => {
      const r = ev.replay(point.books);
      const p = lab.point(point.books);
      let peak = r.marks[testStart - 1]!;
      let dd = 0;

      for (let i = testStart; i <= door.lastIndex; i++) {
        peak = Math.max(peak, r.marks[i]!);
        dd = Math.max(dd, peak - r.marks[i]!);
      }

      return {
        net: p.net,
        testNet: r.marks[door.lastIndex]! - r.marks[testStart - 1]!,
        testDailyDd: dd,
        runDd: p.dd,
        refused: p.refused
      };
    });
    const q = (values: number[], p: number) => {
      const sorted = [...values].sort((a, b) => a - b);

      return r2(sorted[Math.min(sorted.length - 1, Math.max(0, Math.round(p * (sorted.length - 1))))] ?? NaN);
    };
    const neighbourhood = {
      n: nRows.length,
      net: {
        min: q(
          nRows.map((x) => x.net),
          0
        ),
        p10: q(
          nRows.map((x) => x.net),
          0.1
        ),
        median: q(
          nRows.map((x) => x.net),
          0.5
        )
      },
      testNet: {
        min: q(
          nRows.map((x) => x.testNet),
          0
        ),
        p10: q(
          nRows.map((x) => x.testNet),
          0.1
        ),
        median: q(
          nRows.map((x) => x.testNet),
          0.5
        ),
        positive: nRows.filter((x) => x.testNet > 0).length / Math.max(1, nRows.length)
      },
      testDailyDd: {
        median: q(
          nRows.map((x) => x.testDailyDd),
          0.5
        ),
        p90: q(
          nRows.map((x) => x.testDailyDd),
          0.9
        ),
        max: q(
          nRows.map((x) => x.testDailyDd),
          1
        )
      },
      runMinuteDd: {
        median: q(
          nRows.map((x) => x.runDd),
          0.5
        ),
        p90: q(
          nRows.map((x) => x.runDd),
          0.9
        ),
        max: q(
          nRows.map((x) => x.runDd),
          1
        ),
        shareBelow35k: nRows.filter((x) => x.runDd < 35000).length / Math.max(1, nRows.length)
      },
      refused: {
        median: q(
          nRows.map((x) => x.refused),
          0.5
        ),
        max: q(
          nRows.map((x) => x.refused),
          1
        )
      }
    };

    log(`diagnostics: ${config.who} done`);

    return {
      who: config.who,
      kind: config.kind,
      status: config.status ?? null,
      books,
      complementarity: {
        subsets,
        leaveOneOut,
        shapley:
          members.length > 1
            ? {
                net: shapleyOf(members, valueOf('net')),
                train: shapleyOf(members, valueOf('train')),
                test: shapleyOf(members, valueOf('test'))
              }
            : null,
        decisions
      },
      liquidity,
      lots: lotRows,
      risk,
      neighbourhood
    };
  });

  const record = await writeSealed(out, {
    stage: 'POST_TEST_DIAGNOSTICS',
    at: nowIso(),
    note: 'report-only; conditional on the sealed vectors and the shared-slot order; nothing here changes a sealed result',
    door: { id: door.id, last: door.dates[door.lastIndex], sessions: door.dates.length },
    medianMinuteDollars: medianDollar,
    rows
  });

  log(`diagnostics sealed ${record.file} ${record.bodyHash.slice(0, 12)}`);
};
