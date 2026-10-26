// The funded-trade ledger of one pool run: every lot the shared allocator actually funded (result.lots; shadow-book
// signals that received no capital are not lots), in chronological order, with the engine's own fills, shares,
// interest and net. Per trade, gross P&L before costs = shares × (raw exit fill − raw entry fill), friction = the two
// per-side cost amounts the engine applied to those fills, and gross − friction − interest = the engine's net (checked).
// A lot open at the run's end is marked by the engine at the last close (no exit fill, no exit friction), with its
// interest accrued to that session: it is unrealized. Totals are reconciled with the summary the frozen controls use
// (src/joint-16-etf-d1/figures.ts summaryOf) and, on the frozen canonical `all`, with the frozen controls themselves.
import fs from 'fs-extra';
import type { NRunResult } from '../portfolio-aware-d1/nbook/engine.ts';
import { newYork } from './run.ts';

const tolerance = 1e-6; // dollars: residuals of additive identities in floating point

const iso = (seconds: number) => (seconds > 0 ? new Date(seconds * 1000).toISOString() : '');
const minuteOf = (seconds: number) => newYork(seconds).slice(0, 16).replace('T', ' ');

export const tradeLedgerOf = (result: NRunResult) => {
  const lots = [...result.lots].sort((a, b) => a.entryTime - b.entryTime || a.id - b.id);
  const grants = new Map(
    result.signals
      .filter((signal) => signal.outcome === 'granted')
      .map((signal) => [`${signal.symbol}@${signal.decisionTime}`, signal])
  );
  const { dates } = result.universe;
  const { sTime } = Object.values(result.universe.instruments)[0]!.ds;
  let cumulative = 0;
  const rows = lots.map((lot, index) => {
    const open = lot.exitIndex < 0;
    const entryFriction = lot.shares * (lot.entryPrice - lot.entryRawPrice);
    const exitFriction = open ? 0 : lot.shares * (lot.exitRawPrice - lot.exitPrice);
    const exitFill = lot.exitRawPrice; // the raw exit fill, or the last close an open lot is marked at
    const grossBeforeCosts = lot.shares * (exitFill - lot.entryRawPrice);
    const friction = entryFriction + exitFriction;
    const residual = grossBeforeCosts - friction - lot.interest - lot.net;
    const endTime = open
      ? Object.values(result.universe.instruments)[0]!.ds.sCloseTime[result.endIndex]!
      : lot.exitTime;

    cumulative += lot.net;

    return {
      trade: index + 1,
      lot: lot.id,
      symbol: lot.symbol,
      phenotype: lot.trade.phenotype,
      status: open ? 'OPEN (unrealized, marked at the last close)' : 'realized',
      decisionUtc: iso(lot.decisionTime),
      entryUtc: iso(lot.entryTime),
      entryNewYork: minuteOf(lot.entryTime),
      exitUtc: open ? '' : iso(lot.exitTime),
      exitNewYork: open ? '' : minuteOf(lot.exitTime),
      markedAt: open ? `${dates[result.endIndex]} close` : '',
      entryFillPrice: lot.entryRawPrice,
      entryCostAdjustedPrice: lot.entryPrice,
      exitFillPrice: open ? NaN : lot.exitRawPrice,
      exitCostAdjustedPrice: open ? NaN : lot.exitPrice,
      markPrice: open ? lot.exitRawPrice : NaN,
      principal: lot.originalPrincipal,
      shares: lot.shares,
      holdingDays: (endTime - lot.entryTime) / 86400,
      sessionsHeld: (open ? result.endIndex : lot.exitIndex) - lot.entryIndex + 1,
      // The interest basis: whole days from the entry session's date to the exit (or last) session's date.
      interestDays: (sTime[open ? result.endIndex : lot.exitIndex]! - lot.entryTimestamp) / 86400,
      exitReason: open ? 'open' : lot.exitReason,
      grossBeforeCosts,
      interest: lot.interest,
      entryFriction,
      exitFriction,
      friction,
      net: lot.net,
      cumulativeNet: cumulative,
      engineGrossAfterFriction: lot.gross,
      identityResidual: residual,
      maximumAdverseExcursion: lot.worstMark,
      maximumAdverseExcursionUtc: iso(lot.worstMarkTime),
      maximumAdverseExcursionPercentOfPrincipal: lot.worstMark / lot.originalPrincipal,
      sameMinuteCandidates: grants.get(`${lot.symbol}@${lot.decisionTime}`)?.sameMinuteCandidates ?? 1,
      exitExecution: lot.exitExecution
    };
  });
  const bySymbol: Record<
    string,
    {
      trades: number;
      profitable: number;
      losing: number;
      flat: number;
      grossBeforeCosts: number;
      interest: number;
      friction: number;
      net: number;
      open: number;
    }
  > = {};

  for (const row of rows) {
    const item = (bySymbol[row.symbol] ??= {
      trades: 0,
      profitable: 0,
      losing: 0,
      flat: 0,
      grossBeforeCosts: 0,
      interest: 0,
      friction: 0,
      net: 0,
      open: 0
    });

    item.trades++;
    // Win/loss counts are of closed trades; an open lot's mark is unrealized and counted under `open`.
    item.profitable += row.status === 'realized' && row.net > 0 ? 1 : 0;
    item.losing += row.status === 'realized' && row.net < 0 ? 1 : 0;
    item.flat += row.net === 0 ? 1 : 0;
    item.grossBeforeCosts += row.grossBeforeCosts;
    item.interest += row.interest;
    item.friction += row.friction;
    item.net += row.net;
    item.open += row.status === 'realized' ? 0 : 1;
  }

  // Totals in the engine's own lot order, so that they equal summaryOf's sums bit for bit.
  const sum = (
    pick: (lot: NRunResult['lots'][number]) => number,
    filter: (lot: NRunResult['lots'][number]) => boolean = () => true
  ) => result.lots.filter(filter).reduce((total, lot) => total + pick(lot), 0);
  const realized = sum(
    (lot) => lot.net,
    (lot) => lot.exitIndex >= 0
  );
  const unrealized = sum(
    (lot) => lot.net,
    (lot) => lot.exitIndex < 0
  );
  const totals = {
    fundedTrades: rows.length,
    realizedTrades: rows.filter((row) => row.status === 'realized').length,
    openTrades: rows.filter((row) => row.status !== 'realized').length,
    profitable: rows.filter((row) => row.status === 'realized' && row.net > 0).length,
    losing: rows.filter((row) => row.status === 'realized' && row.net < 0).length,
    grossBeforeCosts: rows.reduce((total, row) => total + row.grossBeforeCosts, 0),
    interest: sum((lot) => lot.interest),
    friction: rows.reduce((total, row) => total + row.friction, 0),
    netRealized: realized,
    unrealizedOpen: unrealized,
    totalNet: sum((lot) => lot.net),
    largestWin: Math.max(0, ...rows.filter((row) => row.status === 'realized').map((row) => row.net)),
    largestLoss: Math.min(0, ...rows.filter((row) => row.status === 'realized').map((row) => row.net)),
    worstAdverseExcursion: Math.min(0, ...rows.map((row) => row.maximumAdverseExcursion))
  };

  return {
    rows,
    bySymbol,
    totals,
    openPositions: rows
      .filter((row) => row.status !== 'realized')
      .map((row) => ({
        symbol: row.symbol,
        entryNewYork: row.entryNewYork,
        entryFillPrice: row.entryFillPrice,
        shares: row.shares,
        markPrice: row.markPrice,
        accruedInterest: row.interest,
        unrealizedNet: row.net,
        markedAt: row.markedAt
      })),
    identity: {
      maximumResidual: Math.max(0, ...rows.map((row) => Math.abs(row.identityResidual))),
      pass: rows.every((row) => Math.abs(row.identityResidual) < tolerance)
    }
  };
};

export type TradeLedger = ReturnType<typeof tradeLedgerOf>;

// Exact reconciliation with the run's summary, and with the frozen controls when the run is on the frozen `all`.
export const reconcileLedger = async (
  ledger: TradeLedger,
  summary: { net: number; interest: number; lots: number; minuteDrawdown: number; dailyDrawdown: number },
  frozen: { applicable: boolean; controlsFile?: string; benchmark?: string; controlKey: string }
) => {
  const checks: { name: string; expected: number; actual: number; pass: boolean }[] = [
    {
      name: 'ledger total net = run summary net (exact)',
      expected: summary.net,
      actual: ledger.totals.totalNet,
      pass: ledger.totals.totalNet === summary.net
    },
    {
      name: 'ledger interest = run summary interest (exact)',
      expected: summary.interest,
      actual: ledger.totals.interest,
      pass: ledger.totals.interest === summary.interest
    },
    {
      name: 'funded trades = run summary lots',
      expected: summary.lots,
      actual: ledger.totals.fundedTrades,
      pass: ledger.totals.fundedTrades === summary.lots
    },
    {
      name: 'realized + unrealized = total net (±$0.000001)',
      expected: ledger.totals.totalNet,
      actual: ledger.totals.netRealized + ledger.totals.unrealizedOpen,
      pass: Math.abs(ledger.totals.netRealized + ledger.totals.unrealizedOpen - ledger.totals.totalNet) < tolerance
    },
    {
      name: 'gross − friction − interest = total net (±$0.000001)',
      expected: ledger.totals.totalNet,
      actual: ledger.totals.grossBeforeCosts - ledger.totals.friction - ledger.totals.interest,
      pass:
        Math.abs(
          ledger.totals.grossBeforeCosts - ledger.totals.friction - ledger.totals.interest - ledger.totals.totalNet
        ) < tolerance
    },
    {
      name: 'per-ETF nets sum to the total net (±$0.000001)',
      expected: ledger.totals.totalNet,
      actual: Object.values(ledger.bySymbol).reduce((total, item) => total + item.net, 0),
      pass:
        Math.abs(Object.values(ledger.bySymbol).reduce((total, item) => total + item.net, 0) - ledger.totals.totalNet) <
        tolerance
    },
    {
      name: 'every trade: gross − friction − interest = engine net (±$0.000001)',
      expected: 0,
      actual: ledger.identity.maximumResidual,
      pass: ledger.identity.pass
    }
  ];

  if (frozen.applicable && frozen.controlsFile && frozen.benchmark) {
    const controls = (await fs.readJson(frozen.controlsFile)) as {
      all: Record<string, Record<string, { summary: Record<string, number> }>>;
    };
    const control = controls.all[frozen.benchmark]?.[frozen.controlKey]?.summary;

    if (control) {
      for (const [field, actual] of [
        ['net', ledger.totals.totalNet],
        ['interest', ledger.totals.interest],
        ['lots', ledger.totals.fundedTrades],
        ['minuteDrawdown', summary.minuteDrawdown],
        ['dailyDrawdown', summary.dailyDrawdown]
      ] as const) {
        checks.push({
          name: `${field} = frozen ${frozen.benchmark} control (${frozen.controlsFile} all.${frozen.benchmark}.${frozen.controlKey}, exact)`,
          expected: control[field]!,
          actual,
          pass: control[field] === actual
        });
      }
    }
  }

  return { checks, pass: checks.every((check) => check.pass) };
};

const money = (value: number) =>
  Number.isFinite(value)
    ? `${value <= -0.005 ? '−' : ''}$${Math.abs(value).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    : '';
const price = (value: number) => (Number.isFinite(value) ? value.toFixed(4) : '');
const pct = (value: number) => (Number.isFinite(value) ? `${(value * 100).toFixed(2)}%` : 'n/a');

const table = (headers: string[], rows: string[][], left = new Set<number>()) => {
  const widths = headers.map((header, index) => Math.max(header.length, ...rows.map((row) => row[index]!.length)));
  const line = (cells: string[]) =>
    cells
      .map((cell, index) => (left.has(index) ? cell.padEnd(widths[index]!) : cell.padStart(widths[index]!)))
      .join('  ');

  return [line(headers), line(widths.map((width) => '-'.repeat(width))), ...rows.map(line)]
    .map((text) => `  ${text}`.trimEnd())
    .join('\n');
};

// The terminal ledger: every funded trade, then per-ETF summaries, totals, drawdowns and any open position.
export const formatTradeLedger = (
  ledger: TradeLedger,
  context: {
    notional: number;
    costBps: number;
    minuteDrawdown: number;
    minuteDrawdownPeakUtc: string;
    minuteDrawdownTroughUtc: string;
    annualRate: number;
    dailyDrawdown: number;
    reconciliation: Awaited<ReturnType<typeof reconcileLedger>>;
    splits?: string[]; // e.g. 'VGT 2026-04-21 ×8'
  }
) => {
  const tradeTable = table(
    [
      '#',
      'ETF',
      'entry (New York)',
      'exit (New York)',
      'entry fill',
      'exit fill',
      'size',
      'shares',
      'days',
      'exit reason',
      'gross P&L',
      'interest',
      'friction',
      'net P&L',
      'cumulative net',
      'MAE'
    ],
    ledger.rows.map((row) => [
      String(row.trade),
      row.symbol,
      row.entryNewYork,
      row.status === 'realized' ? row.exitNewYork : `OPEN, ${row.markedAt}`,
      price(row.entryFillPrice),
      row.status === 'realized' ? price(row.exitFillPrice) : `${price(row.markPrice)} mark`,
      money(row.principal).replace('.00', ''),
      row.shares.toFixed(2),
      row.holdingDays.toFixed(1),
      row.exitReason,
      money(row.grossBeforeCosts),
      money(row.interest),
      money(row.friction),
      money(row.net),
      money(row.cumulativeNet),
      money(row.maximumAdverseExcursion)
    ]),
    new Set([1, 2, 3, 9])
  );
  const etfTable = table(
    ['ETF', 'trades', 'profitable', 'losing', 'open', 'gross P&L', 'interest', 'friction', 'net P&L'],
    [
      ...Object.entries(ledger.bySymbol).map(([symbol, item]) => [
        symbol,
        String(item.trades),
        String(item.profitable),
        String(item.losing),
        String(item.open),
        money(item.grossBeforeCosts),
        money(item.interest),
        money(item.friction),
        money(item.net)
      ]),
      [
        'all',
        String(ledger.totals.fundedTrades),
        String(ledger.totals.profitable),
        String(ledger.totals.losing),
        String(ledger.totals.openTrades),
        money(ledger.totals.grossBeforeCosts),
        money(ledger.totals.interest),
        money(ledger.totals.friction),
        money(ledger.totals.totalNet)
      ]
    ],
    new Set([0])
  );
  const { totals } = ledger;

  return [
    `FUNDED TRADES (${totals.fundedTrades}; only lots the shared allocator funded — refused shadow signals are in signals.csv; ${money(context.notional)} per trade, never compounded)`,
    `  fills: the engine's raw execution prices; friction = ${context.costBps} bps per side on each fill (commission $0); interest = ${(context.annualRate * 100).toFixed(2).replace(/\.?0+$/, '')}% simple on ${money(context.notional)} for the session-date days held (interestDays in the CSV);`,
    "  gross P&L = shares × (exit fill − entry fill) before costs; net = gross − friction − interest (the engine's net);",
    "  MAE = the engine's worst minute mark while held (shares × last price − principal − accrued interest).",
    ...(context.splits?.length
      ? [
          `  prices and shares are in the run's first-session share units (splits forward-adjusted: ${context.splits.join(', ')}); dollar figures are unaffected.`
        ]
      : []),
    tradeTable,
    '',
    'BY ETF:',
    etfTable,
    '',
    'TOTALS:',
    `  gross P&L before costs   ${money(totals.grossBeforeCosts).padStart(16)}`,
    `  margin interest          ${money(-totals.interest).padStart(16)}`,
    `  execution friction       ${money(-totals.friction).padStart(16)}`,
    `  net realized P&L         ${money(totals.netRealized).padStart(16)}   (${totals.realizedTrades} closed trades)`,
    `  unrealized (open) P&L    ${money(totals.unrealizedOpen).padStart(16)}   (${totals.openTrades} open)`,
    `  total net P&L            ${money(totals.totalNet).padStart(16)}`,
    `  largest closed win / loss ${money(totals.largestWin)} / ${money(totals.largestLoss)}; worst MAE ${money(totals.worstAdverseExcursion)} (profitable/losing count closed trades only)`,
    '',
    `DRAWDOWNS (the engine's existing definitions; % of the ${money(context.notional)} notional):`,
    `  max MINUTE-sampled drawdown ${money(context.minuteDrawdown)} = ${pct(context.minuteDrawdown / context.notional)}: the largest fall of the pool's marked P&L (realized + open position at each regular minute's price − accrued interest) from its running peak (peak ${minuteOf(Date.parse(context.minuteDrawdownPeakUtc) / 1000)}, trough ${minuteOf(Date.parse(context.minuteDrawdownTroughUtc) / 1000)} New York)`,
    `  max DAILY drawdown          ${money(context.dailyDrawdown)} = ${pct(context.dailyDrawdown / context.notional)}: the same mark sampled at session closes only`,
    '',
    ledger.openPositions.length === 0
      ? 'OPEN POSITION AT THE ENDPOINT: none (every funded trade is closed; all P&L is realized).'
      : [
          'OPEN POSITION AT THE ENDPOINT (unrealized; marked at the last close, no exit friction):',
          ...ledger.openPositions.map(
            (lot) =>
              `  ${lot.symbol}: entered ${lot.entryNewYork} at ${price(lot.entryFillPrice)}, ${lot.shares.toFixed(2)} shares; ${lot.markedAt} mark ${price(lot.markPrice)}; accrued interest ${money(lot.accruedInterest)}; marked net ${money(lot.unrealizedNet)}`
          )
        ].join('\n'),
    '',
    `RECONCILIATION: ${context.reconciliation.pass ? 'all checks pass' : 'FAILED'}`,
    ...context.reconciliation.checks.map(
      (check) =>
        `  ${check.pass ? 'PASS' : 'FAIL'} ${check.name}${check.pass ? '' : ` (expected ${check.expected}, got ${check.actual})`}`
    ),
    ''
  ].join('\n');
};
