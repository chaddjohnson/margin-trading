// Stage L (PROTOCOL.md §5): the neutral vector library on every ETF. For each of the 16 ETFs and each library vector
// (the same controls and 1,024 Sobol vectors everywhere) the 5 bps trace is built and pinned in the evaluator's cache,
// and a record of its activity is written. The single-book fixed-pool figures are DIAGNOSTICS ONLY: nothing reads
// them to prune, rank or prefer a vector, and the discovery stage never sees them.
import fs from 'fs-extra';
import { log, stageDir, study, universe, writeJson } from './context.ts';
import type { JointEvaluator } from './evaluator.ts';
import type { Vector } from './space.ts';

const quantiles = (values: readonly number[]) => {
  if (values.length === 0) {
    return { min: NaN, p25: NaN, median: NaN, p75: NaN, max: NaN };
  }

  const sorted = [...values].sort((a, b) => a - b);
  const at = (q: number) => sorted[Math.min(sorted.length - 1, Math.floor(q * (sorted.length - 1)))]!;

  return { min: sorted[0]!, p25: at(0.25), median: at(0.5), p75: at(0.75), max: sorted.at(-1)! };
};

export interface LibraryRecord {
  symbol: string;
  id: string;
  origin: string;
  traceKey: string;
  signature: string;
  virtualTrades: number;
  signals: number;
  setups: number;
  closed: number;
  tradeYears: number;
  virtualHeldDays: number;
  regimeSignals: number[];
  fillDelaySeconds: { median: number; max: number };
  diagnostic: { net: number; minuteDrawdown: number; dailyDrawdown: number; worstTrade: number };
}

export const runLibrary = (evaluator: JointEvaluator, vectors: readonly Vector[], logFile?: string) => {
  const started = Date.now();
  const dates = evaluator.loaded.universe.dates;
  const records: LibraryRecord[] = [];

  if (logFile) {
    fs.outputFileSync(logFile, '');
  }

  for (const symbol of universe) {
    const ds = evaluator.ds(symbol);
    const lines: string[] = [];

    for (const vector of vectors) {
      const book = { symbol, vector };
      const trace = evaluator.trace(book, study.principalCostBps, true);
      const { evaluation } = evaluator.evaluate([book], study.principalCostBps);
      const closed = trace.trades.filter((trade) => trade.exitIndex >= 0);
      const delays = trace.trades
        .filter((trade) => trade.entryIndex >= 0)
        .map((trade) => trade.entryTime - trade.decisionTime)
        .sort((a, b) => a - b);
      const record: LibraryRecord = {
        symbol,
        id: vector.id,
        origin: vector.origin,
        traceKey: trace.key,
        signature: trace.signature,
        virtualTrades: trace.trades.length,
        signals: trace.signals,
        setups: trace.setups,
        closed: closed.length,
        tradeYears: new Set(closed.map((trade) => dates[trade.exitIndex]!.slice(0, 4))).size,
        virtualHeldDays: trace.trades
          .filter((trade) => trade.entryIndex >= 0)
          .reduce(
            (total, trade) =>
              total +
              (ds.sTime[trade.exitIndex >= 0 ? trade.exitIndex : trace.endIndex]! - ds.sTime[trade.entryIndex]!) /
                86400,
            0
          ),
        regimeSignals: evaluator.regimes.map(
          ({ first, last }) =>
            trace.trades.filter((trade) => trade.decisionIndex >= first && trade.decisionIndex <= last).length
        ),
        fillDelaySeconds: { median: delays[delays.length >> 1] ?? NaN, max: delays.at(-1) ?? NaN },
        diagnostic: {
          net: evaluation.net,
          minuteDrawdown: evaluation.minuteDrawdown,
          dailyDrawdown: evaluation.dailyDrawdown,
          worstTrade: evaluation.worstLot
        }
      };

      records.push(record);
      lines.push(JSON.stringify(record));
    }

    if (logFile) {
      fs.appendFileSync(logFile, `${lines.join('\n')}\n`);
    }

    log(`library ${symbol}: ${vectors.length} vectors traced (${evaluator.cacheStats().pinned} pinned traces)`);
  }

  // Activity coverage per ETF (counts and timing only; the diagnostics stay in the JSON lines).
  const coverage = universe.map((symbol) => {
    const own = records.filter((record) => record.symbol === symbol);

    return {
      symbol,
      vectors: own.length,
      inert: own.filter((record) => record.virtualTrades === 0).length,
      withClosedTradeInThreeYears: own.filter((record) => record.tradeYears >= 3).length,
      virtualTrades: quantiles(own.map((record) => record.virtualTrades)),
      signals: own.reduce((total, record) => total + record.signals, 0),
      regimeSignals: study.regimes.map((regime, index) => ({
        regime: regime.key,
        vectorsWithSignal: own.filter((record) => record.regimeSignals[index]! > 0).length
      })),
      fillDelaySeconds: quantiles(
        own
          .filter((record) => Number.isFinite(record.fillDelaySeconds.median))
          .map((record) => record.fillDelaySeconds.median)
      ),
      maxFillDelaySeconds: Math.max(0, ...own.map((record) => record.fillDelaySeconds.max).filter(Number.isFinite))
    };
  });

  return { seconds: (Date.now() - started) / 1000, records, coverage };
};

export const writeLibrarySummary = async (
  summary: Omit<ReturnType<typeof runLibrary>, 'records'> & Record<string, unknown>
) => writeJson(stageDir('library', 'library.json'), summary);
