// The causal opportunity map (PROTOCOL.md §4.5), descriptive and non-decisional, training only:
//
//   - the S0 pool at 5 bps minute by minute: funded lots (decision, fill, exit), reservations, refusals and their
//     holders, idle time, busy share by regime;
//   - each candidate's major declines (≥ 10% below the 74-session reference high, closing within 5% of it);
//   - up to six representative actual D1 phenotypes per candidate from the Stage A pool, each virtual trade classified
//     at its decision minute as busy / idle-clean / idle-displacing against S0's exact occupancy, by regime, with its
//     actual outcome in the pool replay (funded or not, and the S0 lots it displaced).
import path from 'node:path';
import fs from 'fs-extra';
import { toCsv } from '../multi-etf-allocator/metrics.ts';
import { baselineBooks, candidates, log, stageDir, study, writeJson } from './context.ts';
import { trainingUniverse } from './data.ts';
import { StudyEvaluator, periodIndices } from './evaluate.ts';
import { requireProtocolFrozen } from './freeze.ts';
import { candidateBook } from './phenotypes.ts';
import { readPool } from './stageA.ts';
import { feasibleP, feasibleS } from './tracks.ts';

const principal = study.principalCostBps;

interface Interval {
  symbol: string;
  tradeId: number;
  start: number; // decision bar start (the pool is reserved from here)
  fill: number;
  end: number; // exit (bar start or the close), Infinity while open
  net: number;
}

export const runOpportunityMap = async () => {
  await requireProtocolFrozen();

  const loaded = await trainingUniverse();
  const evaluator = await StudyEvaluator.create(loaded);
  const { dates } = loaded.universe;
  const regimes = periodIndices(dates, study.regimes);
  const regimeOf = (index: number) =>
    regimes.find((regime) => regime.first <= index && index <= regime.last)?.key ?? 'pre';
  const vgt = evaluator.ds('VGT');

  // ----- S0 -----

  const s0 = evaluator.replay(evaluator.frozenBooks(principal), [...baselineBooks], principal, true);
  const full = s0.full!;
  const intervals: Interval[] = full.lots.map((lot) => ({
    symbol: lot.symbol,
    tradeId: lot.trade.id,
    start: lot.decisionTime - 60,
    fill: lot.entryTime,
    end: lot.exitIndex >= 0 ? lot.exitTime : Infinity,
    net: lot.net
  }));
  const eligible = full.daily.filter((row) => row.index >= evaluator.window.armStart);
  const busyAtClose = (index: number) => full.daily.find((row) => row.index === index)!.openLots > 0;
  const busyByRegime = regimes.map((regime) => {
    const rows = eligible.filter((row) => row.index >= regime.first && row.index <= regime.last);

    return {
      regime: regime.key,
      sessions: rows.length,
      busy: rows.filter((row) => row.openLots > 0).length,
      lots: full.lots.filter((lot) => lot.entryIndex >= regime.first && lot.entryIndex <= regime.last).length
    };
  });
  const firstTime = vgt.bTime[vgt.sBarStart[evaluator.window.armStart]!]!;
  const lastTime = vgt.sCloseTime[evaluator.window.endIndex]!;
  const occupiedSeconds = intervals.reduce(
    (total, interval) => total + Math.max(0, Math.min(interval.end, lastTime) - Math.max(interval.start, firstTime)),
    0
  );
  const refusalHolders: Record<string, Record<string, number>> = {};

  for (const refusal of s0.refusals) {
    refusalHolders[refusal.decider] ??= {};
    refusalHolders[refusal.decider]![refusal.holder] = (refusalHolders[refusal.decider]![refusal.holder] ?? 0) + 1;
  }

  const idleGaps: { from: string; to: string; days: number }[] = [];

  for (let index = 0; index <= intervals.length; index++) {
    const from = index === 0 ? firstTime : intervals[index - 1]!.end;
    const to = index === intervals.length ? lastTime : intervals[index]!.start;

    if (Number.isFinite(from) && to > from) {
      idleGaps.push({
        from: new Date(from * 1000).toISOString(),
        to: new Date(to * 1000).toISOString(),
        days: (to - from) / 86400
      });
    }
  }

  const occupiedAt = (time: number) => intervals.find((interval) => interval.start <= time && time < interval.end);

  // ----- per candidate -----

  const perCandidate = [];
  const tradeRows: Record<string, unknown>[] = [];

  for (const symbol of candidates) {
    const ds = evaluator.ds(symbol);
    const episodes: {
      start: string;
      trough: string;
      end: string;
      depth: number;
      sessions: number;
      s0BusyShare: number;
    }[] = [];
    let s = evaluator.window.armStart;

    while (s <= evaluator.window.endIndex) {
      let reference = -Infinity;

      for (let back = Math.max(0, s - 74); back < s; back++) {
        reference = Math.max(reference, ds.sHigh[back]!);
      }

      if (s >= 74 && ds.sLow[s]! <= 0.9 * reference) {
        let low = ds.sLow[s]!;
        let trough = s;
        let end = s;

        for (let k = s + 1; k <= evaluator.window.endIndex && k - s <= 250; k++) {
          end = k;

          if (ds.sLow[k]! < low) {
            low = ds.sLow[k]!;
            trough = k;
          }

          if (ds.sClose[k]! >= 0.95 * reference) {
            break;
          }
        }

        let busy = 0;

        for (let k = s; k <= end; k++) {
          busy += busyAtClose(k) ? 1 : 0;
        }

        episodes.push({
          start: dates[s]!,
          trough: dates[trough]!,
          end: dates[end]!,
          depth: 1 - low / reference,
          sessions: end - s + 1,
          s0BusyShare: busy / (end - s + 1)
        });
        s = end + 1;
      } else {
        s++;
      }
    }

    // Representative phenotypes from the Stage A pool at 5 bps.
    const pool = await readPool(symbol);
    const at = (index: number) => pool[index]!.results[principal]!;
    const indices = pool.map((_record, index) => index);
    const bestBy = (filter: (index: number) => boolean, value: (index: number) => number) =>
      indices.filter(filter).sort((a, b) => value(b) - value(a))[0];
    const representatives = new Map<number, string[]>();
    const addRepresentative = (index: number | undefined, label: string) => {
      if (index !== undefined) {
        representatives.set(index, [...(representatives.get(index) ?? []), label]);
      }
    };

    addRepresentative(
      indices.find((index) => pool[index]!.vector.origin === 'control:D1 shipped constants'),
      'unchanged D1'
    );
    addRepresentative(
      bestBy(
        (index) => feasibleS(at(index).standalone),
        (index) => at(index).standalone.net
      ),
      'best Track S'
    );
    addRepresentative(
      bestBy(
        (index) => feasibleP(at(index).pool),
        (index) => at(index).pool.delta
      ),
      'best Track P'
    );

    for (const [label, test] of [
      ['best P, tight stop (≤ 5.0%)', (grid: number) => grid <= 50],
      ['best P, medium stop (5.1–9.0%)', (grid: number) => grid > 50 && grid <= 90],
      ['best P, wide stop (≥ 9.1%)', (grid: number) => grid > 90]
    ] as const) {
      addRepresentative(
        bestBy(
          (index) => feasibleP(at(index).pool) && test(pool[index]!.vector.grid.trailingStopPercentage),
          (index) => at(index).pool.delta
        ),
        label
      );
    }

    const representativeRows = [];

    for (const [index, labels] of representatives) {
      const record = pool[index]!;
      const phenotype = candidateBook(symbol, record.vector.id, record.vector.grid);
      const trace = evaluator.trace(phenotype, principal);
      const { result } = evaluator.evaluateConfiguration(
        [...baselineBooks.map((book) => ({ symbol: book, phenotype: evaluator.books[book]! })), { symbol, phenotype }],
        principal
      );
      const fundedIds = new Set(result.lots.filter((lot) => lot.symbol === symbol).map((lot) => lot.tradeId));
      const counts = { busy: 0, idleClean: 0, idleDisplacing: 0, funded: 0 };
      const byRegime: Record<string, { busy: number; idleClean: number; idleDisplacing: number }> = {};
      const holdDays: number[] = [];

      for (const trade of trace.trades) {
        const T = trade.decisionTime - 60;
        const exit = trade.exitIndex >= 0 ? trade.exitTime : Infinity;
        const holder = occupiedAt(T);
        const blocked = holder ? [] : intervals.filter((interval) => interval.start > T && interval.start < exit);
        const kind = holder ? 'busy' : blocked.length > 0 ? 'idleDisplacing' : 'idleClean';
        const regime = regimeOf(trade.decisionIndex);
        const funded = fundedIds.has(trade.id);

        counts[kind]++;
        counts.funded += funded ? 1 : 0;
        byRegime[regime] ??= { busy: 0, idleClean: 0, idleDisplacing: 0 };
        byRegime[regime]![kind]++;

        if (trade.exitIndex >= 0) {
          holdDays.push((vgt.sTime[trade.exitIndex]! - vgt.sTime[trade.entryIndex]!) / 86400);
        }

        tradeRows.push({
          symbol,
          representative: labels.join(' / '),
          vector: record.vector.id,
          trade: trade.id,
          decision: new Date(trade.decisionTime * 1000).toISOString(),
          exit: Number.isFinite(exit) ? new Date(exit * 1000).toISOString() : 'open',
          regime,
          class: kind,
          held_by: holder ? `${holder.symbol} #${holder.tradeId}` : '',
          would_block: blocked
            .map((interval) => `${interval.symbol} #${interval.tradeId} (${Math.round(interval.net)})`)
            .join('; '),
          virtual_net: trade.net,
          funded_in_pool: funded
        });
      }

      representativeRows.push({
        labels,
        id: record.vector.id,
        origin: record.vector.origin,
        grid: record.vector.grid,
        standaloneNet5: at(index).standalone.net,
        delta5: at(index).pool.delta,
        virtualTrades: trace.trades.length,
        counts,
        byRegime,
        medianHoldDays: holdDays.length ? holdDays.sort((a, b) => a - b)[holdDays.length >> 1] : NaN,
        displacedLots: at(index).pool.displacedLots,
        displacedNet: at(index).pool.displacedNet,
        gainedLots: at(index).pool.gainedLots
      });
    }

    perCandidate.push({ symbol, episodes, representatives: representativeRows });
    log(`${symbol}: ${episodes.length} declines, ${representativeRows.length} representative phenotypes`);
  }

  const record = {
    generatedAt: new Date().toISOString(),
    nature: 'descriptive, non-decisional; training partition only; 5 bps per side',
    s0: {
      net: s0.net,
      lots: full.lots.length,
      virtualTrades: full.trades.length,
      refused: s0.refused,
      eligibleSessions: eligible.length,
      busySessions: eligible.filter((row) => row.openLots > 0).length,
      occupiedTimeShare: occupiedSeconds / (lastTime - firstTime),
      busyByRegime,
      refusalHolders,
      idleGaps: idleGaps.length,
      longestIdleGaps: [...idleGaps].sort((a, b) => b.days - a.days).slice(0, 10)
    },
    candidates: perCandidate
  };
  const dir = stageDir('opportunity');

  await writeJson(path.join(dir, 'opportunity.json'), record);
  await fs.outputFile(path.join(dir, 'representative-trades.csv'), toCsv(tradeRows));
  await fs.outputFile(
    path.join(dir, 's0-lots.csv'),
    toCsv(
      full.lots.map((lot) => ({
        lot: lot.id,
        symbol: lot.symbol,
        trade: lot.trade.id,
        decision: new Date(lot.decisionTime * 1000).toISOString(),
        entry: new Date(lot.entryTime * 1000).toISOString(),
        exit: lot.exitIndex >= 0 ? new Date(lot.exitTime * 1000).toISOString() : 'open',
        reason: lot.exitReason,
        net: lot.net,
        regime: regimeOf(lot.entryIndex)
      }))
    )
  );
  await fs.outputFile(
    path.join(dir, 's0-signals.csv'),
    toCsv(
      full.signals.map((signal) => ({
        symbol: signal.symbol,
        date: signal.date,
        decision: new Date(signal.decisionTime * 1000).toISOString(),
        outcome: signal.outcome,
        reason: signal.reason,
        virtual_net: signal.trade?.net ?? NaN
      }))
    )
  );

  return record;
};
