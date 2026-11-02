// The auditable per-lot ledger of one run (lots.csv, lots.json, lots.txt) and the run's diagnostics.
//
// Sources:
// - The engine's funded lots (result.lots), joined by lot id to the pools ledger rows (trades.csv). Same lots, same
//   order, same money values. The pools ledger (src/pools/trades.ts) is reused unchanged.
// - The engine's own lot fields add the entry setup, the entry and exit fill reasons and the decision price.
//
// MFE (maximum favourable excursion) is the only figure the engine does not record. It is replayed over exactly the
// marks the engine takes for its MAE (worstMark), using the engine's own price arrays and its FixedLedger.mark:
// - every regular-minute bar of the lot's ETF while the lot is held, from its fill bar;
// - each session close it is held through.
// The replay is accepted lot by lot only if the same pass reproduces the engine's MAE, its time and its mark count
// (heldMarks) exactly. Otherwise that lot's MFE is reported as unavailable, never estimated.
//
// Nothing here changes the engine's accounting; the export check re-reads the written files and reconciles them with
// the run's figures to the cent.
import fs from 'fs-extra';
import { formatNewYorkTime } from '#lib';
import { toCsv } from '../multi-etf-allocator/metrics.ts';
import { FixedLedger, type RealLot } from '../multi-etf-allocator/ledger.ts';
import type { NRunResult } from '../portfolio-aware-d1/nbook/engine.ts';
import type { PoolRunRecord } from '../pools/report.ts';

type EngineLot = NRunResult['lots'][number];
type PoolsRow = PoolRunRecord['trades'][number];

const iso = (seconds: number) =>
  Number.isFinite(seconds) && seconds > 0 ? new Date(seconds * 1000).toISOString() : '';
const ny = (seconds: number) => (Number.isFinite(seconds) && seconds > 0 ? formatNewYorkTime(seconds) : '');
const cents = (value: number) => Math.round(value * 100) / 100;

export const lotDefinitions = {
  timestamps:
    '…Utc columns are ISO-8601 UTC; …NewYork columns are New York wall-clock time (America/New_York, labelled ET). Minute bars are labelled by their start: an entry or exit time is the start of the minute bar that filled (the session close time for a closing print), and an MAE/MFE time is the start of the marked bar (the session close for a close mark)',
  status: 'closed = exited (realized); open = still held at the run end, marked at the last session close (unrealized)',
  entrySetup:
    "the D1 setup that armed the entry: 'deep' = the X% decline from the rolling L-session high; 'continuation' = the post-exit continuation pullback",
  decision:
    'the end of the completed minute whose close confirmed the rebound from the trailing low (bar start + 1 minute); the order fills at the first bar starting at or after it, so decision and entry often show the same clock minute',
  entryFillReason:
    "the engine's entry execution: 'first trade after decision' (the next minute's open), 'opening trade' (next session's open) or 'closing print'",
  exitReason: "the engine's exit rule: trailing stop, trailing stop gap, maximum hold, buffered intraday loss",
  exitFillReason:
    "the engine's exit execution: 'stop level', 'minute open through stop', 'trigger minute close', 'opening trade', 'first trade after decision' or 'closing print'",
  prices:
    "fill prices are the raw execution prices; …AfterFriction includes the per-side cost (and stop slippage, 0 bps here). Prices and shares are in the run's first-session share units (splits forward-adjusted); dollar amounts are unaffected",
  grossPnl: 'shares × (exit fill − entry fill) before costs; an open lot uses the as-of mark price',
  friction:
    'entryFriction = shares × (entry price after friction − entry fill); exitFriction = shares × (exit fill − exit price after friction), 0 for an open lot (not yet charged)',
  marginInterest:
    'principal × 11% × interestDays ÷ 365 (simple); paid at exit for a closed lot, accrued to the as-of session for an open lot',
  net: "the engine's net = gross − friction − interest; realizedNet for closed lots, unrealizedNet for open lots; cumulativeNet in entry order",
  mae: "the engine's maximum adverse excursion: the most negative mark while held (shares × last price − principal − accrued interest), floored at $0; percent of the $100,000 principal",
  mfe: 'the maximum favourable excursion: the most positive mark at the same marks, floored at $0. Replayed (see mfeStatus) because the engine does not record it',
  sessionsHeld: 'sessions from the entry session to the exit (or last) session, inclusive',
  calendarDaysHeld: 'exit time (or the last session close for an open lot) − entry time, in days',
  sameMinuteCandidates: 'books signalling in the funding decision minute (ties go alphabetically)',
  signalsRefusedWhileHeld: 'shadow-book signals refused because this lot held the single funded slot'
};

export const unavailableFields = {
  orderIds: 'no broker orders exist: this is a backtest of the pools engine',
  commissions: 'the engine charges $0 commission; all friction is the per-side bps cost above',
  intrabarFillDetail: 'the engine fills at minute-bar prices; there is no tick-level fill detail',
  mfeWhenUnverified: 'a lot whose replay did not reproduce the engine MAE exactly has no MFE (mfeStatus says so)'
};

// The engine's minute marks of one fixed-pool lot, replayed with the engine's own arrays and ledger arithmetic.
export const excursionsOf = (result: NRunResult, lot: EngineLot) => {
  const anyDs = Object.values(result.universe.instruments)[0]!.ds;
  const ds = result.universe.instruments[lot.symbol]!.ds;
  const ledger = new FixedLedger(result.config.rate, result.config.costBps);
  const real = lot as unknown as RealLot;
  const last = lot.exitIndex < 0 ? result.endIndex : lot.exitIndex;
  let worst = 0;
  let worstTime = NaN;
  let best = 0;
  let bestTime = NaN;
  let marks = 0;
  const visit = (price: number, time: number, s: number) => {
    const mark = ledger.mark(real, price, anyDs.sTime[s]!);

    marks++;

    if (mark < worst) {
      worst = mark;
      worstTime = time;
    }

    if (mark > best) {
      best = mark;
      bestTime = time;
    }
  };

  for (let s = lot.entryIndex; s <= last; s++) {
    const start = ds.sBarStart[s]!;
    const count = ds.sBarCount[s]!;
    const from = s === lot.entryIndex ? lot.entryBar : 0;
    const to = s === lot.exitIndex ? Math.min(lot.exitBar, count) : count;

    for (let k = from; k < to; k++) visit(ds.bClose[start + k]!, ds.bTime[start + k]!, s);

    // the close mark is taken after the session's exits: a lot that exits this session is not marked at its close
    if (s !== lot.exitIndex) visit(ds.sClose[s]!, anyDs.sCloseTime[s]!, s);
  }

  const sameTime = worstTime === lot.worstMarkTime || (Number.isNaN(worstTime) && Number.isNaN(lot.worstMarkTime));
  const verified = worst === lot.worstMark && sameTime && marks === lot.heldMarks;

  return {
    verified,
    marks,
    mfe: best,
    mfeTime: bestTime,
    check: verified
      ? 'replay reproduces the engine MAE, its time and its mark count exactly'
      : `replay differs from the engine (MAE ${worst} vs ${lot.worstMark}; marks ${marks} vs ${lot.heldMarks})`
  };
};

export type LotRow = ReturnType<typeof lotRowsOf>[number];

export const lotRowsOf = (result: NRunResult, record: PoolRunRecord) => {
  const byId = new Map(result.lots.map((lot) => [lot.id, lot]));
  const { dates } = result.universe;
  const anyDs = Object.values(result.universe.instruments)[0]!.ds;
  const endClose = anyDs.sCloseTime[result.endIndex]!;

  return record.trades.map((row: PoolsRow) => {
    const lot = byId.get(row.lot);

    if (!lot) throw new Error(`pools ledger lot ${row.lot} is not an engine lot`);

    const open = lot.exitIndex < 0;
    const excursion = excursionsOf(result, lot);

    return {
      trade: row.trade,
      lot: row.lot,
      symbol: row.symbol,
      status: open ? 'open' : 'closed',
      entrySetup: lot.trade.setupKind,
      decisionTimeUtc: iso(lot.decisionTime),
      decisionTimeNewYork: ny(lot.decisionTime),
      decisionPrice: lot.decisionPrice,
      entryTimeUtc: iso(lot.entryTime),
      entryTimeNewYork: ny(lot.entryTime),
      entryFillReason: lot.entryExecution,
      entryFillPrice: lot.entryRawPrice,
      entryPriceAfterFriction: lot.entryPrice,
      shares: lot.shares,
      principal: lot.originalPrincipal,
      exitTimeUtc: open ? '' : iso(lot.exitTime),
      exitTimeNewYork: open ? '' : ny(lot.exitTime),
      exitReason: open ? '' : lot.exitReason,
      exitFillReason: open ? '' : lot.exitExecution,
      exitFillPrice: open ? '' : lot.exitRawPrice,
      exitPriceAfterFriction: open ? '' : lot.exitPrice,
      asOfSession: open ? dates[result.endIndex]! : '',
      asOfMarkTimeUtc: open ? iso(endClose) : '',
      asOfMarkPrice: open ? lot.exitRawPrice : '',
      exitFrictionCharged: open ? 'no (open lot: charged only when it exits)' : 'yes',
      calendarDaysHeld: row.holdingDays,
      sessionsHeld: row.sessionsHeld,
      interestDays: row.interestDays,
      grossPnl: row.grossBeforeCosts,
      entryFriction: row.entryFriction,
      exitFriction: row.exitFriction,
      totalFriction: row.friction,
      marginInterest: row.interest,
      realizedNet: open ? '' : row.net,
      unrealizedNet: open ? row.net : '',
      net: row.net,
      cumulativeNet: row.cumulativeNet,
      maeDollars: lot.worstMark,
      maeTimeUtc: iso(lot.worstMarkTime),
      maeTimeNewYork: ny(lot.worstMarkTime),
      maePercentOfPrincipal: lot.worstMark / lot.originalPrincipal,
      mfeDollars: excursion.verified ? excursion.mfe : '',
      mfeTimeUtc: excursion.verified ? iso(excursion.mfeTime) : '',
      mfeTimeNewYork: excursion.verified ? ny(excursion.mfeTime) : '',
      mfePercentOfPrincipal: excursion.verified ? excursion.mfe / lot.originalPrincipal : '',
      excursionMarks: lot.heldMarks,
      mfeStatus: excursion.verified ? 'verified replay' : `unavailable: ${excursion.check}`,
      sameMinuteCandidates: row.sameMinuteCandidates,
      signalsRefusedWhileHeld: row.refusedWhileHeld,
      refusedSymbols: row.refusedSymbols
    };
  });
};

const count = <T>(items: T[], key: (item: T) => string) => {
  const out: Record<string, number> = {};

  for (const item of items) out[key(item)] = (out[key(item)] ?? 0) + 1;

  return out;
};
const median = (values: number[]) => {
  if (!values.length) return NaN;

  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);

  return sorted.length % 2 ? sorted[mid]! : (sorted[mid - 1]! + sorted[mid]!) / 2;
};

// Risk and execution diagnostics of one run, from the lot rows and the engine's figures (nothing re-simulated).
export const diagnosticsOf = (rows: LotRow[], record: PoolRunRecord, result: NRunResult) => {
  const closed = rows.filter((row) => row.status === 'closed');
  const wins = closed.filter((row) => row.net > 0);
  const losses = closed.filter((row) => row.net < 0);
  const winSum = wins.reduce((total, row) => total + row.net, 0);
  const lossSum = losses.reduce((total, row) => total + row.net, 0);
  const byReason: Record<string, { lots: number; net: number }> = {};

  for (const row of closed) {
    const item = (byReason[row.exitReason as string] ??= { lots: 0, net: 0 });

    item.lots++;
    item.net += row.net;
  }

  const bySymbol: Record<
    string,
    {
      lots: number;
      closed: number;
      open: number;
      wins: number;
      losses: number;
      gross: number;
      interest: number;
      friction: number;
      net: number;
      signalsRefused: number;
    }
  > = {};

  for (const book of record.books) {
    bySymbol[book.symbol] = {
      lots: 0,
      closed: 0,
      open: 0,
      wins: 0,
      losses: 0,
      gross: 0,
      interest: 0,
      friction: 0,
      net: 0,
      signalsRefused: (record.figures.bySymbol as Record<string, { refusals: number }>)[book.symbol]?.refusals ?? 0
    };
  }

  for (const row of rows) {
    const item = bySymbol[row.symbol]!;

    item.lots++;
    item.closed += row.status === 'closed' ? 1 : 0;
    item.open += row.status === 'open' ? 1 : 0;
    item.wins += row.status === 'closed' && row.net > 0 ? 1 : 0;
    item.losses += row.status === 'closed' && row.net < 0 ? 1 : 0;
    item.gross += row.grossPnl;
    item.interest += row.marginInterest;
    item.friction += row.totalFriction;
    item.net += row.net;
  }

  const mfeRows = rows.filter((row) => row.mfeDollars !== '');
  const daily = result.dailyDrawdown;
  const minute = result.minuteDrawdown;
  const dateOf = (seconds: number) =>
    Number.isFinite(seconds) ? new Date(seconds * 1000).toISOString().slice(0, 10) : '';

  return {
    closedLots: closed.length,
    openLots: rows.length - closed.length,
    wins: wins.length,
    losses: losses.length,
    flat: closed.length - wins.length - losses.length,
    winRate: closed.length ? wins.length / closed.length : NaN,
    grossWins: winSum,
    grossLosses: lossSum,
    profitFactor: lossSum < 0 ? winSum / -lossSum : NaN,
    averageClosedNet: closed.length ? closed.reduce((total, row) => total + row.net, 0) / closed.length : NaN,
    medianClosedNet: median(closed.map((row) => row.net)),
    largestWin: Math.max(0, ...closed.map((row) => row.net)),
    largestLoss: Math.min(0, ...closed.map((row) => row.net)),
    averageCalendarDaysHeld: closed.length
      ? closed.reduce((total, row) => total + row.calendarDaysHeld, 0) / closed.length
      : NaN,
    medianCalendarDaysHeld: median(closed.map((row) => row.calendarDaysHeld)),
    longestCalendarDaysHeld: Math.max(0, ...rows.map((row) => row.calendarDaysHeld)),
    exitReasons: byReason,
    exitFillReasons: count(closed, (row) => String(row.exitFillReason)),
    entryFillReasons: count(rows, (row) => row.entryFillReason),
    entrySetups: count(rows, (row) => row.entrySetup),
    worstMae: Math.min(0, ...rows.map((row) => row.maeDollars)),
    medianMae: median(rows.map((row) => row.maeDollars)),
    bestMfe: mfeRows.length ? Math.max(0, ...mfeRows.map((row) => row.mfeDollars as number)) : NaN,
    medianMfe: median(mfeRows.map((row) => row.mfeDollars as number)),
    mfeVerifiedLots: mfeRows.length,
    bySymbol,
    signals: {
      virtualTrades: record.figures.virtualTrades,
      decisions: record.figures.decisions,
      funded: record.figures.granted,
      refused: record.figures.refused,
      refusalReasons: record.figures.refusalReasons,
      sameMinuteDecisions: record.figures.sameMinuteDecisions
    },
    occupancy: {
      sessionsFromFirstEligible: record.figures.sessions,
      sessionsHoldingALot: record.figures.heldSessions,
      timeInMarket: record.figures.timeInMarket,
      maxSimultaneousFundedLots: record.figures.maxSimultaneousFundedLots,
      overlappingLots: record.figures.overlappingLots
    },
    drawdowns: {
      minute: {
        dollars: minute.maximum,
        percentOf100k: minute.maximum / record.run.notionalPerTrade,
        peakNewYork: ny(minute.peakTime),
        troughNewYork: ny(minute.troughTime),
        recoveredNewYork: ny(minute.recoveryTime) || 'not recovered by the run end'
      },
      daily: {
        dollars: daily.maximum,
        percentOf100k: daily.maximum / record.run.notionalPerTrade,
        peakSession: dateOf(daily.peakTime),
        troughSession: dateOf(daily.troughTime),
        recoveredSession: dateOf(daily.recoveryTime) || 'not recovered by the run end'
      }
    }
  };
};

export type Diagnostics = ReturnType<typeof diagnosticsOf>;

const money = (value: number | string) =>
  typeof value === 'number' && Number.isFinite(value)
    ? `${value <= -0.005 ? '−' : ''}$${Math.abs(value).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    : 'n/a';
const price = (value: number | string) => (typeof value === 'number' && Number.isFinite(value) ? value.toFixed(4) : '');
const pct = (value: number | string) =>
  typeof value === 'number' && Number.isFinite(value)
    ? `${value * 100 <= -0.005 ? '−' : ''}${Math.abs(value * 100).toFixed(2)}%`
    : 'n/a';

// lots.txt: one block per lot, every field labelled.
export const formatLots = (rows: LotRow[]) =>
  rows
    .map((row) =>
      [
        `#${row.trade} ${row.symbol} (engine lot ${row.lot}) — ${row.status === 'open' ? `OPEN at the run end, marked at the ${row.asOfSession} close` : `CLOSED by ${row.exitReason}`}`,
        `  decision ${row.decisionTimeNewYork} (${row.decisionTimeUtc}) at ${price(row.decisionPrice)}; setup: ${row.entrySetup}`,
        `  entry    ${row.entryTimeNewYork} (${row.entryTimeUtc}) fill ${price(row.entryFillPrice)} (${row.entryFillReason}); after friction ${price(row.entryPriceAfterFriction)}; ${row.shares.toFixed(4)} shares; principal ${money(row.principal)}`,
        row.status === 'open'
          ? `  as of    ${row.asOfSession} close (${row.asOfMarkTimeUtc}) mark ${price(row.asOfMarkPrice)}; exit friction NOT charged (charged only when the lot exits)`
          : `  exit     ${row.exitTimeNewYork} (${row.exitTimeUtc}) fill ${price(row.exitFillPrice)} (${row.exitFillReason}); after friction ${price(row.exitPriceAfterFriction)}; reason: ${row.exitReason}`,
        `  held     ${row.calendarDaysHeld.toFixed(2)} calendar days, ${row.sessionsHeld} sessions; interest days ${row.interestDays}`,
        `  P&L      gross ${money(row.grossPnl)} − friction ${money(row.totalFriction)} (entry ${money(row.entryFriction)} + exit ${money(row.exitFriction)}) − interest ${money(row.marginInterest)} = ${row.status === 'open' ? 'unrealized' : 'realized'} net ${money(row.net)}; cumulative ${money(row.cumulativeNet)}`,
        `  MAE      ${money(row.maeDollars)} (${pct(row.maePercentOfPrincipal)} of principal)${row.maeTimeNewYork ? ` at ${row.maeTimeNewYork}` : ' (never below $0)'}; MFE ${row.mfeDollars === '' ? row.mfeStatus : `${money(row.mfeDollars)} (${pct(row.mfePercentOfPrincipal)})${row.mfeTimeNewYork ? ` at ${row.mfeTimeNewYork}` : ' (never above $0)'}`}; ${row.excursionMarks} marks`,
        `  slot     ${row.sameMinuteCandidates} same-minute candidate(s); ${row.signalsRefusedWhileHeld} signal(s) refused while held${row.refusedSymbols ? ` (${row.refusedSymbols})` : ''}`
      ].join('\n')
    )
    .join('\n\n');

export const writeLots = async (dir: string, rows: LotRow[], context: Record<string, unknown>) => {
  await fs.outputFile(`${dir}/lots.csv`, toCsv(rows));
  await fs.writeJson(
    `${dir}/lots.json`,
    { kind: 'study8-runner-lots', ...context, definitions: lotDefinitions, unavailable: unavailableFields, lots: rows },
    { spaces: 2 }
  );
  await fs.outputFile(
    `${dir}/lots.txt`,
    `Every funded lot, in entry order (definitions: lots.json "definitions"; the same lots as trades.csv)\n\n${formatLots(rows)}\n`
  );
};

const parseCsv = (text: string) => {
  const lines = text.trim().split('\n');
  const split = (line: string) => {
    const out: string[] = [];
    let cell = '';
    let quoted = false;

    for (let i = 0; i < line.length; i++) {
      const c = line[i]!;

      if (quoted) {
        if (c === '"' && line[i + 1] === '"') {
          cell += '"';
          i++;
        } else if (c === '"') quoted = false;
        else cell += c;
      } else if (c === '"') quoted = true;
      else if (c === ',') {
        out.push(cell);
        cell = '';
      } else cell += c;
    }

    out.push(cell);

    return out;
  };
  const headers = split(lines[0]!);

  return lines.slice(1).map((line) => Object.fromEntries(split(line).map((cell, i) => [headers[i]!, cell])));
};

// Re-reads the written lots.csv, lots.json, trades.csv, yearly.csv and monthly.csv and reconciles them with the run's
// figures (to the cent; counts exactly) and with each other (lot by lot, and per ETF).
export const exportCheck = async (dir: string, record: PoolRunRecord) => {
  const csv = parseCsv(await fs.readFile(`${dir}/lots.csv`, 'utf8'));
  const json = ((await fs.readJson(`${dir}/lots.json`)) as { lots: LotRow[] }).lots;
  const trades = parseCsv(await fs.readFile(`${dir}/trades.csv`, 'utf8'));
  const f = record.figures;
  const num = (value: string | undefined) => (value === undefined || value === '' ? 0 : Number(value));
  const sum = (rows: Record<string, string>[], key: string) => rows.reduce((total, row) => total + num(row[key]), 0);
  const checks: { name: string; expected: number; actual: number; pass: boolean }[] = [];
  const add = (name: string, expected: number, actual: number, exact = false) =>
    checks.push({ name, expected, actual, pass: exact ? expected === actual : cents(expected) === cents(actual) });

  add('lots.csv rows = funded lots', f.fundedLots, csv.length, true);
  add('lots.json lots = funded lots', f.fundedLots, json.length, true);
  add('trades.csv rows = funded lots', f.fundedLots, trades.length, true);
  add('open lots in lots.csv', f.openLots, csv.filter((row) => row.status === 'open').length, true);
  add('Σ net (lots.csv) = net', f.net, sum(csv, 'net'));
  add('Σ realizedNet (lots.csv) = realized', f.realized, sum(csv, 'realizedNet'));
  add('Σ unrealizedNet (lots.csv) = unrealized', f.unrealized, sum(csv, 'unrealizedNet'));
  add('Σ marginInterest (lots.csv) = interest', f.interest, sum(csv, 'marginInterest'));
  add('Σ totalFriction (lots.csv) = friction', f.frictionDollars, sum(csv, 'totalFriction'));
  add('Σ grossPnl (lots.csv) = ledger gross', record.tradeLedger.totals.grossBeforeCosts, sum(csv, 'grossPnl'));
  add('last cumulativeNet = net', f.net, num(csv.at(-1)?.cumulativeNet));

  for (const period of ['yearly', 'monthly']) {
    const rows = parseCsv(await fs.readFile(`${dir}/${period}.csv`, 'utf8'));

    add(`Σ strategyChange (${period}.csv) = net`, f.net, sum(rows, 'strategyChange'));
    add(`Σ interest (${period}.csv) = interest`, f.interest, sum(rows, 'interest'));
    add(`Σ lotsEntered (${period}.csv) = funded lots`, f.fundedLots, sum(rows, 'lotsEntered'), true);
  }

  for (const [symbol, item] of Object.entries(record.tradeLedger.bySymbol)) {
    const own = csv.filter((row) => row.symbol === symbol);

    add(`${symbol}: Σ net (lots.csv) = pools ledger by-ETF net`, item.net, sum(own, 'net'));
    add(`${symbol}: lots (lots.csv) = pools ledger by-ETF trades`, item.trades, own.length, true);
  }
  add(
    'Σ net (lots.json) = net',
    f.net,
    json.reduce((total, row) => total + row.net, 0)
  );

  let mismatches = 0;

  csv.forEach((row, index) => {
    const other = trades[index];

    if (
      !other ||
      row.lot !== other.lot ||
      row.symbol !== other.symbol ||
      row.net !== other.net ||
      row.marginInterest !== other.interest ||
      row.totalFriction !== other.friction ||
      row.grossPnl !== other.grossBeforeCosts
    )
      mismatches++;
  });
  add('lots.csv = trades.csv lot by lot (id, symbol, gross, friction, interest, net; exact text)', 0, mismatches, true);

  return { pass: checks.every((check) => check.pass), checks };
};
