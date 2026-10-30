// The one-time final evaluation (PROTOCOL.md §7.2–§7.3), refused unless FROZEN_SELECTION.json verifies: every frozen
// candidate and control on the continuous full history (2016-01-04 → 2026-10-29), FX and RECENT attribution, isolated
// FX runs, sensitivities, the nominees' neighbourhoods, leave-one-year-out, the classification, the March 2020 GDX
// diagnostic and the blocked-opportunity audit. `--confirm` re-runs it deterministically into confirmation.json.
import path from 'node:path';
import fs from 'fs-extra';
import type { Lot } from '../portfolio-aware-d1/nbook/ledger.ts';
import type { ReplayResult } from '../portfolio-aware-d1/replay.ts';
import {
  execution,
  finalSensitivities,
  frozenGrids,
  neighbourhood,
  resultFile,
  studyAControls,
  years
} from './context.ts';
import { openDoor, readVerifiedSelection } from './data.ts';
import { type Books, Evaluator, type RunMetrics, orderedSymbols, round, settingsWith } from './engine.ts';
import { type Grid, describe, jointNeighbourhoodOf, median, neighbourhoodOf, quantile } from './grid.ts';
import { log, nowIso, writeJsonl, writeSealed } from './records.ts';
import { metricsDigest } from './studyA.ts';

const newYork = (seconds: number) =>
  seconds > 0
    ? new Date(seconds * 1000).toLocaleString('sv-SE', { timeZone: 'America/New_York', hour12: false }).slice(0, 16)
    : '';

const fxSummary = (points: { fx: number; full: number; dd: number }[]) => {
  const fx = points.map((p) => p.fx);
  const dd = points.map((p) => p.dd);

  return {
    count: points.length,
    fxMedian: median(fx),
    fxP10: quantile(fx, 0.1),
    fxP90: quantile(fx, 0.9),
    fxPositive: fx.filter((value) => value > 0).length,
    fullMedian: median(points.map((p) => p.full)),
    ddMedian: median(dd),
    ddP90: quantile(dd, 0.9),
    ddMax: Math.max(...dd),
    share35: dd.filter((value) => value < execution.drawdownCeiling).length / Math.max(1, dd.length)
  };
};

const fxPoint = (m: RunMetrics) => ({ fx: m.periods.FX ?? NaN, full: m.periods.FULL ?? NaN, dd: m.minuteDrawdown });

const lotRows = (result: ReplayResult, label: string) =>
  (result.full?.lots ?? []).map((lot: Lot) => ({
    config: label,
    symbol: lot.symbol,
    decision: newYork(lot.decisionTime),
    entry: newYork(lot.entryTime),
    exit: newYork(lot.exitTime),
    entryRawPrice: lot.entryRawPrice,
    exitRawPrice: lot.exitRawPrice,
    exitReason: lot.exitReason,
    gross: lot.gross,
    interest: lot.interest,
    net: lot.net,
    worstMark: lot.worstMark,
    worstMarkTime: newYork(lot.worstMarkTime),
    open: lot.exitIndex < 0
  }));

const leaveOneYearOut = (m: RunMetrics) =>
  Object.fromEntries(
    years
      .map(String)
      .filter((year) => year in m.periods)
      .map((year) => [year, m.net - m.periods[year]!])
  );

const spearman = (a: number[], b: number[]) => {
  const rank = (values: number[]) => {
    const order = values.map((value, index) => [value, index] as const).sort((x, y) => x[0] - y[0]);
    const ranks = new Array<number>(values.length);

    order.forEach(([, index], position) => {
      ranks[index] = position + 1;
    });

    return ranks;
  };
  const ra = rank(a);
  const rb = rank(b);
  const mean = (values: number[]) => values.reduce((x, y) => x + y, 0) / values.length;
  const ma = mean(ra);
  const mb = mean(rb);
  let num = 0;
  let da = 0;
  let db = 0;

  for (let i = 0; i < ra.length; i++) {
    num += (ra[i]! - ma) * (rb[i]! - mb);
    da += (ra[i]! - ma) ** 2;
    db += (rb[i]! - mb) ** 2;
  }

  return num / Math.sqrt(da * db);
};

interface ManifestA {
  id: string;
  grid: Grid;
  control: boolean;
  score: number;
  passes: boolean;
  list: string;
}
interface ManifestB {
  key: string;
  books: Books;
  control: boolean;
  score: number;
  passes: boolean;
  source: string;
}

export const runFinal = async (confirm: boolean) => {
  const started = Date.now();
  const output = resultFile('final', confirm ? 'confirmation.json' : 'final.json');

  if (!confirm && (await fs.pathExists(resultFile('final', 'final.json')))) {
    throw new Error('the final evaluation already ran (final.json exists); only `final --confirm` may re-run it');
  }

  if (confirm && !(await fs.pathExists(resultFile('final', 'final.json')))) {
    throw new Error('nothing to confirm: final.json does not exist');
  }

  const manifest = (await readVerifiedSelection()) as unknown as {
    bodyHash: string;
    studyA: {
      nominees: (ManifestA & { role: string })[];
      shortlistAndControls: ManifestA[];
      nearMisses: { id: string }[];
    };
    studyB: {
      nominees: (ManifestB & { role: string })[];
      candidatesAndControls: ManifestB[];
      nearMisses: { key: string }[];
    };
  };
  const door = await openDoor('final', ['VGT', 'KRE', 'GDX'], `final evaluation${confirm ? ' (confirmation)' : ''}`);
  const ev = new Evaluator(door);
  const door5 = await openDoor(
    'final',
    ['VGT', 'XBI', 'XRT', 'KRE', 'GDX'],
    `final evaluation C5 only${confirm ? ' (confirmation)' : ''}`
  );
  const ev5 = new Evaluator(door5);
  const csvDir = resultFile('final', confirm ? 'confirmation-files' : 'files');
  const allLots: Record<string, unknown>[] = [];

  // ----- Study A -----
  const aNominees = new Set(manifest.studyA.nominees.map((nominee) => nominee.id));
  const aNear = new Set(manifest.studyA.nearMisses.map((item) => item.id));
  const aRoles = Object.fromEntries(manifest.studyA.nominees.map((nominee) => [nominee.id, nominee.role]));
  const studyA = manifest.studyA.shortlistAndControls.map((item) => {
    const books = { GDX: item.grid };
    const detail = ev.replay(books, settingsWith({}), true);
    const m = ev.metricsOf(detail);
    const isolated = ev.metrics(books, settingsWith({ startDate: '2024-01-01' }));
    const deep = aNominees.has(item.id) || item.control || aNear.has(item.id);
    const out: Record<string, unknown> = {
      id: item.id,
      role:
        aRoles[item.id] ??
        (item.control ? 'control' : aNear.has(item.id) ? 'not nominated (fails exactly one gate; A1)' : 'shortlist'),
      list: item.list,
      grid: item.grid,
      short: describe(item.grid),
      valScore: item.score,
      passedGates: item.passes,
      metrics: metricsDigest(m),
      isolatedFx: {
        net: isolated.net,
        dd: isolated.minuteDrawdown,
        ddDaily: isolated.dailyDrawdown,
        lots: isolated.lots,
        wins: isolated.wins
      },
      leaveOneYearOut: leaveOneYearOut(m)
    };

    if (deep) {
      const lots = lotRows(detail, `A:${item.id}`);

      allLots.push(...lots);
      out.sensitivities = Object.fromEntries(
        finalSensitivities.map(({ key, ...overrides }) => {
          const s = ev.metrics(books, settingsWith(overrides));

          return [key, { net: s.net, dd: s.minuteDrawdown, fx: s.periods.FX, lots: s.lots }];
        })
      );
      out.n1 = fxSummary(
        neighbourhoodOf(item.grid, neighbourhood.n1, 1, 'A', 'main', item.id).map((grid) =>
          fxPoint(ev.metrics({ GDX: grid }))
        )
      );
      out.march2020 = lots.filter((lot) => lot.entry >= '2020-02-01' && lot.entry <= '2020-05-31');

      const fx = m.periods.FX ?? NaN;
      const n1 = out.n1 as ReturnType<typeof fxSummary>;

      out.classification =
        m.minuteDrawdown >= execution.drawdownCeiling
          ? 'risk breach'
          : fx <= 0
            ? 'fails'
            : n1.fxMedian > 0
              ? 'holds'
              : 'mixed';
    }

    log(
      `final A ${item.id}: full ${round(m.net, 0)} FX ${round(m.periods.FX ?? NaN, 0)} RECENT ${round(m.periods.RECENT ?? NaN, 0)} dd ${round(m.minuteDrawdown, 0)}${out.classification ? ` → ${out.classification}` : ''}`
    );

    return out;
  });
  const shortlist = studyA.filter(
    (item) => !manifest.studyA.shortlistAndControls.find((entry) => entry.id === item.id)?.control
  );
  const rankCorrelation = spearman(
    shortlist.map((item) => item.valScore as number),
    shortlist.map((item) => (item.metrics as { periods: Record<string, number> }).periods.FX ?? 0)
  );

  // ----- Study B -----
  const bNominees = new Set(manifest.studyB.nominees.map((nominee) => nominee.key));
  const bNear = new Set(manifest.studyB.nearMisses.map((item) => item.key));
  const bRoles = Object.fromEntries(manifest.studyB.nominees.map((nominee) => [nominee.key, nominee.role]));
  const c5Detail = ev5.replay({ ...frozenGrids }, settingsWith({}), true);
  const c5 = ev5.metricsOf(c5Detail);
  const runs: Record<string, ReplayResult> = { C5: c5Detail };
  const studyB = manifest.studyB.candidatesAndControls.map((item) => {
    const detail = ev.replay(item.books, settingsWith({}), true);
    const m = ev.metricsOf(detail);
    const isolated = ev.metrics(item.books, settingsWith({ startDate: '2024-01-01' }));
    const deep = bNominees.has(item.key) || bNear.has(item.key) || item.key === 'C3' || item.key === 'C2';
    const out: Record<string, unknown> = {
      key: item.key,
      role:
        bRoles[item.key] ??
        (item.control ? 'control' : bNear.has(item.key) ? 'not nominated (fails exactly one gate; A1)' : 'candidate'),
      source: item.source,
      books: item.books,
      short: Object.fromEntries(Object.entries(item.books).map(([symbol, grid]) => [symbol, describe(grid)])),
      valScore: item.score,
      passedGates: item.passes,
      metrics: metricsDigest(m),
      isolatedFx: {
        net: isolated.net,
        dd: isolated.minuteDrawdown,
        ddDaily: isolated.dailyDrawdown,
        lots: isolated.lots
      },
      leaveOneYearOut: leaveOneYearOut(m)
    };

    runs[item.key] = detail;

    if (deep) {
      allLots.push(...lotRows(detail, `B:${item.key}`));

      const symbols = orderedSymbols(item.books);

      out.sensitivities = Object.fromEntries(
        finalSensitivities.map(({ key, ...overrides }) => {
          const s = ev.metrics(item.books, settingsWith(overrides));

          return [key, { net: s.net, dd: s.minuteDrawdown, fx: s.periods.FX, lots: s.lots }];
        })
      );
      out.jointN1 = fxSummary(
        jointNeighbourhoodOf(item.books, symbols, neighbourhood.joint, 1, 'B', item.key).map((books) =>
          fxPoint(ev.metrics(books))
        )
      );
      out.perBookN1 = Object.fromEntries(
        symbols.map((symbol) => [
          symbol,
          fxSummary(
            neighbourhoodOf(item.books[symbol]!, neighbourhood.perBook, 1, 'B', item.key, symbol).map((grid) =>
              fxPoint(ev.metrics({ ...item.books, [symbol]: grid }))
            )
          )
        ])
      );
    }

    log(
      `final B ${item.key}: full ${round(m.net, 0)} FX ${round(m.periods.FX ?? NaN, 0)} RECENT ${round(m.periods.RECENT ?? NaN, 0)} dd ${round(m.minuteDrawdown, 0)}`
    );

    return out;
  });
  const c3Full = studyB.find((item) => item.key === 'C3')!;
  const c3Fx = (c3Full.metrics as { periods: Record<string, number> }).periods.FX!;

  for (const item of studyB) {
    const m = item.metrics as { minuteDrawdown: number; periods: Record<string, number> };
    const delta = m.periods.FX! - c3Fx;

    Object.assign(item, {
      fxDeltaVsC3: delta,
      fxDeltaVsC5: m.periods.FX! - c5.periods.FX!,
      classification: {
        risk: m.minuteDrawdown < execution.drawdownCeiling ? 'pass' : 'fail',
        fxVsC3: delta >= 2500 ? 'persists' : delta <= -2500 ? 'reverses' : 'disappears'
      }
    });
  }

  allLots.push(...lotRows(c5Detail, 'B:C5'));

  const c5Out = {
    metrics: metricsDigest(c5),
    isolatedFx: (() => {
      const isolated = ev5.metrics({ ...frozenGrids }, settingsWith({ startDate: '2024-01-01' }));

      return { net: isolated.net, dd: isolated.minuteDrawdown, lots: isolated.lots };
    })(),
    sensitivities: Object.fromEntries(
      finalSensitivities.map(({ key, ...overrides }) => {
        const s = ev5.metrics({ ...frozenGrids }, settingsWith(overrides));

        return [key, { net: s.net, dd: s.minuteDrawdown, fx: s.periods.FX, lots: s.lots }];
      })
    ),
    newSessionsEffect: { netThrough20261013Frozen: 486207.77, netNow: c5.net, difference: c5.net - 486207.77 }
  };

  // ----- blocked-opportunity audit (§6.5) -----
  const audit = blockedAudit(runs, ev, ev5);
  const lotsFile = await writeJsonl(path.join(csvDir, 'lots.jsonl'), allLots);
  const record = await writeSealed(
    output,
    {
      stage: confirm ? 'final-confirmation' : 'final',
      at: nowIso(),
      manifestBodyHash: manifest.bodyHash,
      doors: [door.key, door5.key],
      window: { first: door.dates[0], last: door.dates[door.lastIndex], sessions: door.dates.length },
      studyA,
      studyARankCorrelation: { valScoreVsFxNet: rankCorrelation, n: shortlist.length },
      studyAControls: studyAControls.map((control) => control.id),
      studyB,
      c5: c5Out,
      audit,
      files: { lots: lotsFile },
      traces: ev.traces + ev5.traces,
      seconds: (Date.now() - started) / 1000
    },
    { overwrite: confirm }
  );

  log(`final: ${record.file} ${record.bodyHash.slice(0, 12)} in ${((Date.now() - started) / 1000).toFixed(0)} s`);
};

const blockedAudit = (runs: Record<string, ReplayResult>, ev: Evaluator, ev5: Evaluator) => {
  const window = { start: '2025-11-12', end: '2026-03-03' };
  const describeRun = (key: string, evaluator: Evaluator) => {
    const result = runs[key]!;
    const full = result.full!;
    const { dates } = evaluator.door;
    const trades = full.trades;
    const tradeOf = (symbol: string, id: number) => trades.find((trade) => trade.symbol === symbol && trade.id === id);
    const refusals = result.refusals.map((refusal) => {
      const trade = tradeOf(refusal.decider, refusal.tradeId);

      return {
        decider: refusal.decider,
        holder: refusal.holder,
        decisionDate: dates[refusal.decisionIndex],
        decisionTime: trade ? newYork(trade.decisionTime) : '',
        virtualEntry: trade ? newYork(trade.entryTime) : '',
        virtualExit: trade ? newYork(trade.exitTime) : '',
        virtualExitReason: trade?.exitReason ?? '',
        virtualNet: trade?.net ?? NaN, // the book's own virtual outcome; NOT executed, NOT counted
        setupKind: trade?.setupKind ?? ''
      };
    });
    const matrix: Record<string, number> = {};

    for (const refusal of refusals) {
      matrix[`${refusal.decider}<${refusal.holder}`] = (matrix[`${refusal.decider}<${refusal.holder}`] ?? 0) + 1;
    }

    const lots = full.lots.map((lot) => ({
      symbol: lot.symbol,
      entry: newYork(lot.entryTime),
      exit: newYork(lot.exitTime),
      exitReason: lot.exitReason,
      net: lot.net,
      interest: lot.interest,
      worstMark: lot.worstMark
    }));
    const virtualInWindow = trades
      .filter((trade) => {
        const date = newYork(trade.decisionTime).slice(0, 10);

        return date >= window.start && date <= window.end;
      })
      .map((trade) => ({
        symbol: trade.symbol,
        decision: newYork(trade.decisionTime),
        allocator: trade.allocator,
        virtualEntry: newYork(trade.entryTime),
        virtualExit: newYork(trade.exitTime),
        virtualExitReason: trade.exitReason,
        virtualNet: trade.net
      }));

    return { key, matrix, refusals, lots, virtualInWindow };
  };
  const c5 = describeRun('C5', ev5);
  const c3 = describeRun('C3', ev);
  const xrtLot = c5.lots.find((lot) => lot.symbol === 'XRT' && lot.entry.startsWith('2025-11-12'));
  const during = (lot: { entry: string; exit: string }) =>
    lot.entry.slice(0, 10) >= window.start && lot.entry.slice(0, 10) <= window.end;
  const lotKey = (lot: { symbol: string; entry: string }) => `${lot.symbol}|${lot.entry}`;
  const c5Keys = new Set(c5.lots.map(lotKey));
  const c3Keys = new Set(c3.lots.map(lotKey));
  const after = (lot: { entry: string }) => lot.entry.slice(0, 10) >= window.start;
  const others = Object.keys(runs)
    .filter((key) => key !== 'C5' && key !== 'C3')
    .map((key) => {
      const run = describeRun(key, ev);

      return {
        key,
        matrix: run.matrix,
        lotsDuringXrtInterval: run.lots.filter(during),
        virtualGdxInWindow: run.virtualInWindow.filter((trade) => (trade.symbol as string) === 'GDX')
      };
    });

  return {
    xrtInterval: window,
    xrtLot: xrtLot ?? null,
    c5RefusalMatrix: c5.matrix,
    c3RefusalMatrix: c3.matrix,
    c5RefusedWhileXrtHeld: c5.refusals.filter(
      (refusal) =>
        refusal.holder === 'XRT' && refusal.decisionDate! >= window.start && refusal.decisionDate! <= window.end
    ),
    c5RefusedByXrtOrXbiAllHistory: c5.refusals.filter(
      (refusal) => refusal.holder === 'XRT' || refusal.holder === 'XBI'
    ),
    c5VirtualInWindow: c5.virtualInWindow,
    c3VirtualInWindow: c3.virtualInWindow,
    c3LotsDuringXrtInterval: c3.lots.filter(during),
    c5LotsDuringXrtInterval: c5.lots.filter(during),
    sinceIntervalStart: {
      onlyInC3: c3.lots.filter((lot) => after(lot) && !c5Keys.has(lotKey(lot))),
      onlyInC5: c5.lots.filter((lot) => after(lot) && !c3Keys.has(lotKey(lot))),
      common: c3.lots.filter((lot) => after(lot) && c5Keys.has(lotKey(lot))).length
    },
    allRefusalsC5: c5.refusals,
    allRefusalsC3: c3.refusals,
    otherPools: others
  };
};
