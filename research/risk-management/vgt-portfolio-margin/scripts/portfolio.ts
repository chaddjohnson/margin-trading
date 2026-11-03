// One Vanguard brokerage account: $240,000 of VOOG and $160,000 of VGT bought at the 2016-01-04 close, every
// distribution reinvested, plus the unchanged minute VGT strategy (src/app/allIn.ts) buying 20% of the
// account's net liquidation value on margin at each entry. A core-only account with the same start and the
// same distributions is the benchmark. See ACCOUNT_MODEL.md for the ledger.
//
// Usage: node --experimental-transform-types scripts/portfolio.ts <out dir> [gross|netted] [minute|prior-close]
//   financing: `gross` (default) finances each entry entirely with new margin debit and keeps cash
//     separately, as the brief specifies; `netted` lets account cash fund entries first.
//   VOOG sizing price: `minute` (default) uses VOOG's last completed minute at the decision; `prior-close`
//     uses its previous session close.
import type { BacktestPosition, MarketSession } from '#types';
import { groupMarketSessions, loadCsvMinuteBacktestData } from '#lib';
import type { PositionSizingContext } from '../../../../src/app/allIn.ts';
import { runAllIn } from '../../../../src/app/allIn.ts';
import fs from 'fs-extra';

const [, , outDir = '', financing = 'gross', voogSizing = 'minute'] = process.argv;

if (!['gross', 'netted'].includes(financing) || !['minute', 'prior-close'].includes(voogSizing)) {
  throw new Error('Usage: portfolio.ts <out dir> [gross|netted] [minute|prior-close]');
}

const here = 'research/risk-management/vgt-portfolio-margin';
const rate = 0.11; // annual margin rate, simple daily accrual on a 365-day year
const sizingFraction = 0.2;
const initial = { VOOG: 240000, VGT: 160000 };
const maintenanceRates = [0.25, 0.3, 0.4, 0.5];
const secondsPerDay = 86400;

type Etf = 'VOOG' | 'VGT';
type Source = 'core' | 'lot' | 'drip'; // core inventory, the open strategy lot, strategy-derived DRIP shares

interface Distribution {
  etf: Etf;
  exDate: string;
  payDate: string;
  amount: number;
  amountMethod: string;
  payDateMethod: string;
}

interface Receivable extends Distribution {
  source: Source;
  shares: number; // entitled shares
  value: number;
  lotEntryDate?: string;
}

const distributions: Distribution[] = (await fs.readFile(`${here}/data/distributions.csv`, 'utf8'))
  .trim()
  .split('\n')
  .slice(1)
  .map((line) => {
    const [etf, exDate, payDate, amount, amountMethod, , payDateMethod] = line.split(',');

    return {
      etf: etf as Etf,
      exDate: exDate!,
      payDate: payDate!,
      amount: Number(amount),
      amountMethod: amountMethod!,
      payDateMethod: payDateMethod!
    };
  });

const vgtSessions = groupMarketSessions(await loadCsvMinuteBacktestData('VGT', 'data/VGT/VGT-2016-2025-1-minute.csv'));
const voogSessions = groupMarketSessions(
  await loadCsvMinuteBacktestData('VOOG', 'data/VOOG/VOOG-2016-2025-1-minute.csv')
);

if (voogSessions.length !== vgtSessions.length || voogSessions.some((s, i) => s.date !== vgtSessions[i]!.date)) {
  throw new Error('VOOG and VGT sessions differ');
}

const sessionDates = vgtSessions.map((s) => s.date);
const priceOf = (etf: Etf, i: number) => (etf === 'VOOG' ? voogSessions[i]! : vgtSessions[i]!).close;
// Calendar days in [from, to), as dates.
const calendarDays = (from: string, to: string) => {
  const days: string[] = [];

  for (let t = Date.parse(from); t < Date.parse(to); t += secondsPerDay * 1000) {
    days.push(new Date(t).toISOString().slice(0, 10));
  }

  return days;
};
const isMonthEnd = (date: string) =>
  new Date(Date.parse(date) + secondsPerDay * 1000).toISOString().slice(8, 10) === '01';

interface Lot {
  position: BacktestPosition;
  entryDate: string;
  principal: number;
  shares: number;
  accountInterest: number; // account interest accrued while the lot was open (all debit, not only its loan)
  dividends: number; // distributions the lot was entitled to
}

interface DayRow {
  date: string;
  voogClose: number;
  vgtClose: number;
  voogShares: number;
  vgtCoreShares: number;
  vgtDripShares: number;
  lotShares: number;
  voogValue: number;
  vgtCoreValue: number;
  vgtDripValue: number;
  lotValue: number;
  securities: number;
  cash: number;
  receivables: number;
  debit: number;
  accruedInterest: number;
  nav: number;
  interestAccrued: number; // accrued at this session's close for the calendar days until the next session
  interestCharged: number; // charged to the debit at month ends inside those days
  dividendsPaid: number;
}

interface SessionTrades {
  start: { voog: number; vgt: number; lot: number; cash: number; debit: number; accrued: number; receivables: number };
  exit?: { time: number; cash: number; debit: number };
  entry?: { time: number; shares: number; cash: number; debit: number };
}

class Account {
  shares = { VOOG: { core: 0, drip: 0 }, VGT: { core: 0, drip: 0 } };
  lot: Lot | undefined;
  cash = 0;
  debit = 0;
  accrued = 0;
  receivables: Receivable[] = [];
  rows: DayRow[] = [];
  receivableLog: (Receivable & { paidShares: number; paidPrice: number; paid: boolean })[] = [];
  closedLots: (Lot & {
    exitDate: string;
    proceeds: number;
    repaid: number;
    debitBefore: number;
    debitAfter: number;
    cashAfter: number;
    navAfter: number;
    pendingDividends: number;
  })[] = [];
  sizing = new Map<string, Record<string, number | string>>();
  intraday = new Map<string, SessionTrades>();
  next = 0; // next session to process fully
  started = -1; // last session whose ex-date entitlements are recorded

  constructor(readonly name: string) {}

  // In netted financing, cash and debit never coexist.
  net() {
    if (financing === 'netted') {
      const offset = Math.min(this.cash, this.debit);

      this.cash -= offset;
      this.debit -= offset;
    }
  }

  receivableValue() {
    return this.receivables.reduce((total, r) => total + r.value, 0);
  }

  // Start of a session, before any trade: shares held at the previous close are entitled to the
  // distributions that go ex on this date.
  startSession(i: number) {
    if (this.started >= i) {
      return;
    }

    this.started = i;

    for (const d of distributions.filter((x) => x.exDate === sessionDates[i])) {
      const held: [Source, number][] = [
        ['core', this.shares[d.etf].core],
        ['drip', this.shares[d.etf].drip],
        ['lot', d.etf === 'VGT' ? (this.lot?.shares ?? 0) : 0]
      ];

      for (const [source, shares] of held.filter(([, s]) => s > 0)) {
        const receivable: Receivable = {
          ...d,
          source,
          shares,
          value: shares * d.amount,
          lotEntryDate: source === 'lot' ? this.lot!.entryDate : undefined
        };

        this.receivables.push(receivable);

        if (source === 'lot') {
          this.lot!.dividends += receivable.value;
        }
      }
    }

    this.intraday.set(sessionDates[i]!, {
      start: {
        voog: this.shares.VOOG.core + this.shares.VOOG.drip,
        vgt: this.shares.VGT.core + this.shares.VGT.drip,
        lot: this.lot?.shares ?? 0,
        cash: this.cash,
        debit: this.debit,
        accrued: this.accrued,
        receivables: this.receivableValue()
      }
    });
  }

  // A full session: entitlements, the strategy's exit or entry, reinvested payments, the close, interest.
  processSession(
    i: number,
    positions: readonly BacktestPosition[],
    fills: Map<BacktestPosition, { exit?: number; entry?: number }>
  ) {
    const date = sessionDates[i]!;
    const time = vgtSessions[i]!.time;

    if (i === 0) {
      this.shares.VOOG.core = initial.VOOG / priceOf('VOOG', 0);
      this.shares.VGT.core = initial.VGT / priceOf('VGT', 0);
    }

    this.startSession(i);

    const trades = this.intraday.get(date)!;
    const exiting = positions.find((p) => p.exitTimestamp === time && this.lot?.position === p);

    if (exiting && this.lot) {
      const proceeds = exiting.shares * exiting.exitPrice!;
      const debitBefore = this.debit;
      const repaid = Math.min(proceeds, this.debit);

      this.debit -= repaid;
      this.cash += proceeds - repaid;
      this.net();
      trades.exit = { time: fills.get(exiting)?.exit ?? NaN, cash: this.cash, debit: this.debit };
      this.closedLots.push({
        ...this.lot,
        exitDate: date,
        proceeds,
        repaid,
        debitBefore,
        debitAfter: this.debit,
        cashAfter: this.cash,
        navAfter: NaN,
        pendingDividends: this.receivables
          .filter((r) => r.source === 'lot' && r.lotEntryDate === this.lot!.entryDate)
          .reduce((t, r) => t + r.value, 0)
      });
      this.lot = undefined;
    }

    const entering = positions.find((p) => p.entryTimestamp === time);

    if (entering) {
      const sized = this.sizing.get(date);

      if (!sized || Math.abs(Number(sized.principal) - entering.investment) > 1e-6) {
        throw new Error(`${date}: the engine bought ${entering.investment}, the account sized ${sized?.principal}`);
      }

      this.debit += entering.investment;
      this.net();
      this.lot = {
        position: entering,
        entryDate: date,
        principal: entering.investment,
        shares: entering.shares,
        accountInterest: 0,
        dividends: 0
      };
      trades.entry = {
        time: fills.get(entering)?.entry ?? NaN,
        shares: entering.shares,
        cash: this.cash,
        debit: this.debit
      };
    }

    // Payments are reinvested at the payment date's close into the same ETF. Shares from the open lot's or
    // from earlier strategy-derived distributions go to the strategy-derived DRIP inventory, never the lot.
    let dividendsPaid = 0;

    for (const r of this.receivables.filter((x) => x.payDate === date)) {
      const price = priceOf(r.etf, i);
      const shares = r.value / price;

      this.shares[r.etf][r.source === 'core' ? 'core' : 'drip'] += shares;
      dividendsPaid += r.value;
      this.receivableLog.push({ ...r, paidShares: shares, paidPrice: price, paid: true });
    }

    this.receivables = this.receivables.filter((x) => x.payDate !== date);

    const row = this.mark(i);

    row.dividendsPaid = dividendsPaid;

    if (exiting) {
      this.closedLots.at(-1)!.navAfter = row.nav;
    }

    // Interest on the debit at the close, for every calendar day until the next session. Month ends charge
    // the accrued interest to the debit, so it compounds from then on.
    const nextDate =
      sessionDates[i + 1] ?? new Date(Date.parse(date) + secondsPerDay * 1000).toISOString().slice(0, 10);

    for (const day of calendarDays(date, nextDate)) {
      const interest = (this.debit * rate) / 365;

      this.accrued += interest;
      row.interestAccrued += interest;

      if (this.lot) {
        this.lot.accountInterest += interest;
      }

      if (isMonthEnd(day) && i + 1 < sessionDates.length) {
        row.interestCharged += this.accrued;
        this.debit += this.accrued;
        this.accrued = 0;
        this.net();
      }
    }

    // The data's last session is marked before its own night's accrual, like the strategy's interest.
    if (i + 1 === sessionDates.length) {
      this.accrued -= row.interestAccrued;
      row.interestAccrued = 0;
    }

    this.rows.push(row);
    this.next = i + 1;
  }

  mark(i: number): DayRow {
    const voogClose = priceOf('VOOG', i);
    const vgtClose = priceOf('VGT', i);
    const voogShares = this.shares.VOOG.core + this.shares.VOOG.drip;
    const lotShares = this.lot?.shares ?? 0;
    const securities = voogShares * voogClose + (this.shares.VGT.core + this.shares.VGT.drip + lotShares) * vgtClose;
    const receivables = this.receivableValue();

    return {
      date: sessionDates[i]!,
      voogClose,
      vgtClose,
      voogShares,
      vgtCoreShares: this.shares.VGT.core,
      vgtDripShares: this.shares.VGT.drip,
      lotShares,
      voogValue: voogShares * voogClose,
      vgtCoreValue: this.shares.VGT.core * vgtClose,
      vgtDripValue: this.shares.VGT.drip * vgtClose,
      lotValue: lotShares * vgtClose,
      securities,
      cash: this.cash,
      receivables,
      debit: this.debit,
      accruedInterest: this.accrued,
      nav: securities + receivables + this.cash - this.debit - this.accrued,
      interestAccrued: 0,
      interestCharged: 0,
      dividendsPaid: 0
    };
  }

  processThrough(
    last: number,
    positions: readonly BacktestPosition[],
    fills: Map<BacktestPosition, { exit?: number; entry?: number }>
  ) {
    while (this.next <= last) {
      this.processSession(this.next, positions, fills);
    }
  }
}

// The latest completed minute's close at the decision, or the previous close when the session has none.
const voogPriceAt = (i: number, decisionTime: number) => {
  const bar = voogSessions[i]!.bars.findLast((b) => b.time + 60 <= decisionTime);

  return voogSizing === 'minute' && bar
    ? { price: bar.close, time: bar.time }
    : { price: voogSessions[i - 1]!.close, time: voogSessions[i - 1]!.closeTime };
};

const account = new Account('core+strategy');
const sessionIndex = new Map(sessionDates.map((d, i) => [d, i]));
const noFills = new Map<BacktestPosition, { exit?: number; entry?: number }>();

const sizePosition = ({ date, decisionTime, decisionPrice, positions }: PositionSizingContext) => {
  const i = sessionIndex.get(date)!;

  // Everything before this session is final; this session's ex-date entitlements apply from its open.
  account.processThrough(i - 1, positions, noFills);
  account.startSession(i);

  if (account.lot) {
    throw new Error(`${date}: an entry while a lot is open`);
  }

  const voog = voogPriceAt(i, decisionTime);
  const voogShares = account.shares.VOOG.core + account.shares.VOOG.drip;
  const vgtShares = account.shares.VGT.core + account.shares.VGT.drip;
  const securities = voogShares * voog.price + vgtShares * decisionPrice;
  const receivables = account.receivableValue();
  const nav = securities + receivables + account.cash - account.debit - account.accrued;
  const principal = sizingFraction * nav;

  account.sizing.set(date, {
    date,
    decisionTime,
    nav,
    principal,
    voogPrice: voog.price,
    voogPriceTime: voog.time,
    vgtPrice: decisionPrice,
    voogShares,
    vgtShares,
    securities,
    receivables,
    cash: account.cash,
    debit: account.debit,
    accrued: account.accrued
  });

  return principal;
};

const strategyDir = `${outDir}/strategy`;
const result = await runAllIn({ dataFile: 'data/VGT/VGT-2016-2025-1-minute.csv', outDir: strategyDir, sizePosition });
const fills = new Map(
  result.positions.map((p) => [p, { entry: result.entryFills.get(p)?.time, exit: result.exitFills.get(p)?.time }])
);

account.processThrough(sessionDates.length - 1, result.positions, fills);

// The core-only benchmark: the same ledger with no strategy.
const core = new Account('core-only');

core.processThrough(sessionDates.length - 1, [], noFills);

// Minute-sampled account values: every minute either ETF traded, each marked at its last observed trade
// (VOOG and VGT both have minute data, so nothing is interpolated), with the lot, cash and debit changing at
// the fill minutes. A sample at a fill's minute already reflects the fill, as in allIn's own marks.
const minuteRisk = (book: Account) => {
  let peak = initial.VOOG + initial.VGT;
  let worst = { drawdown: 0, peakTime: 0, troughTime: 0, peakNav: peak, troughNav: peak };
  let peakTime = vgtSessions[0]!.closeTime;
  let lowestRatio = { ratio: Infinity, time: 0 };

  for (let i = 1; i < sessionDates.length; i++) {
    const trades = book.intraday.get(sessionDates[i]!)!;
    const times = [
      ...new Set([...voogSessions[i]!.bars.map((b) => b.time), ...vgtSessions[i]!.bars.map((b) => b.time)])
    ].sort((a, b) => a - b);
    const voogBars = new Map(voogSessions[i]!.bars.map((b) => [b.time, b.close]));
    const vgtBars = new Map(vgtSessions[i]!.bars.map((b) => [b.time, b.close]));
    let voog = priceOf('VOOG', i - 1);
    let vgt = priceOf('VGT', i - 1);

    for (const t of times) {
      voog = voogBars.get(t) ?? voog;
      vgt = vgtBars.get(t) ?? vgt;

      const afterExit = trades.exit && t >= trades.exit.time;
      const afterEntry = trades.entry && t >= trades.entry.time;
      const lot = afterEntry ? trades.entry!.shares : afterExit ? 0 : trades.start.lot;
      const cash = afterEntry ? trades.entry!.cash : afterExit ? trades.exit!.cash : trades.start.cash;
      const debit = afterEntry ? trades.entry!.debit : afterExit ? trades.exit!.debit : trades.start.debit;
      const securities = trades.start.voog * voog + (trades.start.vgt + lot) * vgt;
      const nav = securities + trades.start.receivables + cash - debit - trades.start.accrued;

      if (nav > peak) {
        peak = nav;
        peakTime = t;
      }

      if (peak - nav > worst.drawdown) {
        worst = { drawdown: peak - nav, peakTime, troughTime: t, peakNav: peak, troughNav: nav };
      }

      if (nav / securities < lowestRatio.ratio) {
        lowestRatio = { ratio: nav / securities, time: t };
      }
    }

    const close = book.rows[i]!;

    if (close.nav > peak) {
      peak = close.nav;
      peakTime = vgtSessions[i]!.closeTime;
    }
  }

  return {
    maximumDrawdown: worst.drawdown,
    maximumDrawdownPercent: worst.drawdown / worst.peakNav,
    peakTime: new Date(worst.peakTime * 1000).toISOString(),
    troughTime: new Date(worst.troughTime * 1000).toISOString(),
    lowestEquityToSecurities: lowestRatio.ratio,
    lowestEquityToSecuritiesTime: new Date(lowestRatio.time * 1000).toISOString()
  };
};

// Daily statistics.
const drawdownStats = (rows: { date: string; nav: number }[]) => {
  let peak = rows[0]!;
  let dollars = { value: 0, peak: '', trough: '', peakNav: 0, troughNav: 0 };
  let percent = { value: 0, peak: '', trough: '', peakNav: 0, troughNav: 0 };
  let longestUnderwater = { days: 0, from: '', to: '' };
  let underwaterFrom = '';

  for (const row of rows) {
    if (row.nav >= peak.nav) {
      if (underwaterFrom) {
        const days = (Date.parse(row.date) - Date.parse(underwaterFrom)) / 86400000;

        if (days > longestUnderwater.days) {
          longestUnderwater = { days, from: underwaterFrom, to: row.date };
        }
      }

      peak = row;
      underwaterFrom = '';
      continue;
    }

    underwaterFrom ||= peak.date;

    if (peak.nav - row.nav > dollars.value) {
      dollars = { value: peak.nav - row.nav, peak: peak.date, trough: row.date, peakNav: peak.nav, troughNav: row.nav };
    }

    if (1 - row.nav / peak.nav > percent.value) {
      percent = {
        value: 1 - row.nav / peak.nav,
        peak: peak.date,
        trough: row.date,
        peakNav: peak.nav,
        troughNav: row.nav
      };
    }
  }

  if (underwaterFrom) {
    const days = (Date.parse(rows.at(-1)!.date) - Date.parse(underwaterFrom)) / 86400000;

    if (days > longestUnderwater.days) {
      longestUnderwater = { days, from: underwaterFrom, to: `${rows.at(-1)!.date} (still underwater)` };
    }
  }

  const recovery = (episode: typeof dollars) =>
    rows.find((r) => r.date > episode.trough && r.nav >= episode.peakNav)?.date ?? 'not recovered';

  return {
    dollars: { ...dollars, recovered: recovery(dollars) },
    percent: { ...percent, recovered: recovery(percent) },
    longestUnderwater
  };
};

const years = (Date.parse(sessionDates.at(-1)!) - Date.parse(sessionDates[0]!)) / (365.25 * 86400000);
const returnStats = (rows: DayRow[]) => {
  const returns = rows.slice(1).map((r, i) => r.nav / rows[i]!.nav - 1);
  const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
  const volatility =
    Math.sqrt(returns.reduce((a, b) => a + (b - mean) ** 2, 0) / (returns.length - 1)) * Math.sqrt(252);
  const end = rows.at(-1)!.nav;
  const cagr = (end / rows[0]!.nav) ** (1 / years) - 1;
  const drawdown = drawdownStats(rows);

  return {
    start: rows[0]!.nav,
    end,
    totalReturn: end / rows[0]!.nav - 1,
    cagr,
    annualizedVolatility: volatility,
    sharpeAtZeroRate: (mean * 252) / volatility,
    calmar: cagr / drawdown.percent.value,
    drawdown
  };
};

const annual = [...new Set(sessionDates.map((d) => d.slice(0, 4)))].map((year) => {
  const of = (rows: DayRow[]) => {
    const inYear = rows.filter((r) => r.date.startsWith(year));
    const before = rows.filter((r) => r.date < `${year}-01-01`).at(-1) ?? rows[0]!;
    const stats = drawdownStats([before, ...inYear]);

    return {
      startNav: before.nav,
      endNav: inYear.at(-1)!.nav,
      return: inYear.at(-1)!.nav / before.nav - 1,
      maximumDrawdown: stats.dollars.value,
      maximumDrawdownPercent: stats.percent.value,
      interest: inYear.reduce((t, r) => t + r.interestAccrued, 0),
      dividends: inYear.reduce((t, r) => t + r.dividendsPaid, 0),
      maximumDebit: Math.max(...inYear.map((r) => r.debit + r.accruedInterest)),
      lowestEquityToSecurities: Math.min(...inYear.map((r) => r.nav / r.securities))
    };
  };
  const coreYear = of(core.rows);
  const integratedYear = of(account.rows);

  return {
    year,
    coreOnly: coreYear,
    integrated: integratedYear,
    strategyContribution: integratedYear.endNav - coreYear.endNav - (integratedYear.startNav - coreYear.startNav)
  };
});

// Margin: equity / long market value against maintenance requirements, and the uniform price fall in
// both ETFs that would bring equity down to each requirement.
const marginOf = (row: DayRow) => {
  const liabilities = row.debit + row.accruedInterest - row.cash - row.receivables;

  return Object.fromEntries(
    maintenanceRates.flatMap((m) => [
      [`excess_${m * 100}`, row.nav - m * row.securities],
      [`fall_to_${m * 100}`, liabilities > 0 ? 1 - liabilities / ((1 - m) * row.securities) : Infinity]
    ])
  ) as Record<string, number>;
};

const coreByDate = new Map(core.rows.map((r) => [r.date, r]));
const coreDrawdownRows = drawdownStats(core.rows);
let corePeak = 0;
let integratedPeak = 0;
const dailyLines = [
  [
    'date',
    'voog_close',
    'vgt_close',
    'core_voog_shares',
    'core_vgt_shares',
    'core_receivables',
    'core_nav',
    'core_drawdown',
    'core_drawdown_pct',
    'voog_shares',
    'vgt_core_shares',
    'vgt_strategy_drip_shares',
    'lot_shares',
    'voog_value',
    'vgt_core_value',
    'vgt_strategy_drip_value',
    'lot_value',
    'securities',
    'cash',
    'receivables',
    'debit',
    'accrued_interest',
    'nav',
    'drawdown',
    'drawdown_pct',
    'gross_to_nav',
    'debt_to_nav',
    'equity_to_securities',
    ...maintenanceRates.flatMap((m) => [`excess_${m * 100}`, `fall_to_${m * 100}`]),
    'interest_accrued',
    'interest_charged',
    'dividends_paid',
    'core_dividends_paid',
    'nav_minus_core'
  ].join(',')
];

for (const row of account.rows) {
  const c = coreByDate.get(row.date)!;
  const margin = marginOf(row);

  corePeak = Math.max(corePeak, c.nav);
  integratedPeak = Math.max(integratedPeak, row.nav);
  dailyLines.push(
    [
      row.date,
      row.voogClose,
      row.vgtClose,
      c.voogShares,
      c.vgtCoreShares,
      c.receivables,
      c.nav,
      corePeak - c.nav,
      1 - c.nav / corePeak,
      row.voogShares,
      row.vgtCoreShares,
      row.vgtDripShares,
      row.lotShares,
      row.voogValue,
      row.vgtCoreValue,
      row.vgtDripValue,
      row.lotValue,
      row.securities,
      row.cash,
      row.receivables,
      row.debit,
      row.accruedInterest,
      row.nav,
      integratedPeak - row.nav,
      1 - row.nav / integratedPeak,
      row.securities / row.nav,
      (row.debit + row.accruedInterest) / row.nav,
      row.nav / row.securities,
      ...maintenanceRates.flatMap((m) => [margin[`excess_${m * 100}`], margin[`fall_to_${m * 100}`]]),
      row.interestAccrued,
      row.interestCharged,
      row.dividendsPaid,
      c.dividendsPaid,
      row.nav - c.nav
    ].join(',')
  );
}

// Trades.
const tradeLines = [
  [
    'entry_date',
    'entry_time',
    'decision_time',
    'reference_high',
    'decision_price',
    'entry_price',
    'entry_execution',
    'pre_entry_nav',
    'sizing_voog_price',
    'sizing_voog_price_time',
    'principal',
    'principal_to_nav',
    'new_debit',
    'shares',
    'account_vgt_shares_after',
    'cash_before',
    'debit_before',
    'accrued_before',
    'cash_after',
    'debit_after',
    'total_debt_to_nav_after',
    'securities_before',
    'securities_after',
    'gross_to_nav_after',
    'cumulative_dividends_reinvested',
    'exit_date',
    'exit_time',
    'exit_price',
    'exit_reason',
    'exit_execution',
    'proceeds',
    'debit_before_exit',
    'debit_repaid',
    'debit_after_exit',
    'cash_after_exit',
    'gain_before_financing',
    'strategy_interest',
    'strategy_profit',
    'account_interest_while_open',
    'interest_difference',
    'price_return',
    'nav_after_exit',
    'lot_dividends',
    'lot_dividends_pending_at_exit',
    'status'
  ].join(',')
];
const lotsByEntry = new Map(
  [...account.closedLots, ...(account.lot ? [account.lot] : [])].map((l) => [l.entryDate, l])
);
const dividendsBefore = (date: string) =>
  account.receivableLog.filter((r) => r.payDate < date).reduce((t, r) => t + r.value, 0);
const referenceHighOf = (i: number) =>
  Math.max(...vgtSessions.slice(Math.max(0, i - 90), i).map((s: MarketSession) => s.high));

for (const position of result.positions) {
  const entryDate = new Date(position.entryTimestamp * 1000).toISOString().slice(0, 10);
  const i = sessionIndex.get(entryDate)!;
  const entryFill = result.entryFills.get(position)!;
  const exitFill = result.exitFills.get(position);
  const sized = account.sizing.get(entryDate)!;
  const lot = lotsByEntry.get(entryDate)! as Lot & Partial<(typeof account.closedLots)[number]>;
  const lastRow = account.rows.at(-1)!;
  const isOpen = position.isOpen;
  const debitAfter =
    Number(sized.debit) +
    Number(sized.principal) -
    (financing === 'netted' ? Math.min(Number(sized.cash), Number(sized.principal)) : 0);
  const cashAfter =
    financing === 'netted' ? Math.max(0, Number(sized.cash) - Number(sized.principal)) : Number(sized.cash);
  const exitPrice = isOpen ? lastRow.vgtClose : position.exitPrice!;
  const strategyInterest = isOpen
    ? (position.investment * rate * (vgtSessions.at(-1)!.time - position.entryTimestamp)) / (365 * secondsPerDay)
    : position.interest!;

  tradeLines.push(
    [
      entryDate,
      new Date(entryFill.time * 1000).toISOString(),
      new Date(entryFill.decisionTime * 1000).toISOString(),
      referenceHighOf(i),
      entryFill.decisionPrice,
      position.entryPrice,
      entryFill.execution,
      sized.nav,
      sized.voogPrice,
      new Date(Number(sized.voogPriceTime) * 1000).toISOString(),
      position.investment,
      position.investment / Number(sized.nav),
      debitAfter - Number(sized.debit),
      position.shares,
      Number(sized.vgtShares) + position.shares,
      sized.cash,
      sized.debit,
      sized.accrued,
      cashAfter,
      debitAfter,
      (debitAfter + Number(sized.accrued)) / Number(sized.nav),
      sized.securities,
      Number(sized.securities) + position.investment,
      (Number(sized.securities) + position.investment) / Number(sized.nav),
      dividendsBefore(entryDate),
      isOpen ? '' : new Date(position.exitTimestamp! * 1000).toISOString().slice(0, 10),
      exitFill ? new Date(exitFill.time * 1000).toISOString() : '',
      exitPrice,
      isOpen ? 'open' : (exitFill?.reason ?? ''),
      exitFill?.execution ?? 'last close',
      isOpen ? '' : lot.proceeds,
      isOpen ? '' : lot.debitBefore,
      isOpen ? '' : lot.repaid,
      isOpen ? '' : lot.debitAfter,
      isOpen ? '' : lot.cashAfter,
      position.shares * exitPrice - position.investment,
      strategyInterest,
      position.shares * exitPrice - position.investment - strategyInterest,
      lot.accountInterest,
      lot.accountInterest - strategyInterest,
      exitPrice / position.entryPrice - 1,
      isOpen ? lastRow.nav : lot.navAfter,
      lot.dividends,
      isOpen
        ? account.receivables.filter((r) => r.source === 'lot').reduce((t, r) => t + r.value, 0)
        : lot.pendingDividends,
      isOpen ? 'open at end' : 'closed'
    ].join(',')
  );
}

// Distributions, both books.
const dividendLines = [
  'book,etf,ex_date,pay_date,amount,amount_method,pay_date_method,source,lot_entry_date,eligible_shares,receivable,reinvest_date,reinvest_price,new_shares,inventory'
];

for (const [book, ledger] of [
  ['core-only', core],
  ['core+strategy', account]
] as const) {
  const all = [
    ...ledger.receivableLog,
    ...ledger.receivables.map((r) => ({ ...r, paidShares: NaN, paidPrice: NaN, paid: false }))
  ];

  for (const r of all) {
    dividendLines.push(
      [
        book,
        r.etf,
        r.exDate,
        r.payDate,
        r.amount,
        r.amountMethod,
        r.payDateMethod,
        r.source,
        r.lotEntryDate ?? '',
        r.shares,
        r.value,
        r.paid ? r.payDate : 'pending at end',
        r.paid ? r.paidPrice : '',
        r.paid ? r.paidShares : '',
        r.source === 'core' ? 'core' : 'strategy DRIP'
      ].join(',')
    );
  }
}

// Summary.
const last = account.rows.at(-1)!;
const lastCore = core.rows.at(-1)!;
const closedTrades = result.positions.filter((p) => !p.isOpen);
const openPosition = result.positions.find((p) => p.isOpen);
const worstBy = <T>(rows: T[], value: (r: T) => number) => rows.reduce((a, b) => (value(b) < value(a) ? b : a));
const margins = account.rows.map((r) => ({
  date: r.date,
  ...marginOf(r),
  ratio: r.nav / r.securities,
  debt: (r.debit + r.accruedInterest) / r.nav,
  gross: r.securities / r.nav,
  debit: r.debit + r.accruedInterest
}));
const integratedStats = returnStats(account.rows);
const coreStats = returnStats(core.rows);
const strategyDaily = (await fs.readFile(`${strategyDir}/daily.csv`, 'utf8'))
  .trim()
  .split('\n')
  .slice(1)
  .map((l) => l.split(','));
let strategyPeak = 0;
let strategyDrawdown = { value: 0, peak: '', trough: '' };
let strategyPeakDate = '';

for (const [, date, , , mtm] of strategyDaily) {
  const value = Number(mtm);

  if (value > strategyPeak) {
    strategyPeak = value;
    strategyPeakDate = date!;
  }

  if (strategyPeak - value > strategyDrawdown.value) {
    strategyDrawdown = { value: strategyPeak - value, peak: strategyPeakDate, trough: date! };
  }
}

const summary = {
  configuration: { financing, voogSizing, rate, sizingFraction, initial, maintenanceRates },
  dates: { first: sessionDates[0], last: sessionDates.at(-1), sessions: sessionDates.length, years },
  initialization: {
    voogPrice: priceOf('VOOG', 0),
    vgtPrice: priceOf('VGT', 0),
    voogPriceIsClosingPrint: voogSessions[0]!.closingPrint !== undefined,
    vgtPriceIsClosingPrint: vgtSessions[0]!.closingPrint !== undefined,
    voogShares: core.rows[0]!.voogShares,
    vgtShares: core.rows[0]!.vgtCoreShares,
    nav: core.rows[0]!.nav
  },
  coreOnly: {
    ...coreStats,
    dividends: core.rows.reduce((t, r) => t + r.dividendsPaid, 0),
    pendingReceivables: lastCore.receivables,
    minute: minuteRisk(core)
  },
  integrated: {
    ...integratedStats,
    dividends: account.rows.reduce((t, r) => t + r.dividendsPaid, 0),
    dividendsFromStrategyLots: account.receivableLog.filter((r) => r.source === 'lot').reduce((t, r) => t + r.value, 0),
    dividendsFromStrategyDrip: account.receivableLog
      .filter((r) => r.source === 'drip')
      .reduce((t, r) => t + r.value, 0),
    pendingReceivables: last.receivables,
    interestAccrued: account.rows.reduce((t, r) => t + r.interestAccrued, 0),
    interestCharged: account.rows.reduce((t, r) => t + r.interestCharged, 0),
    accruedUnpaidAtEnd: last.accruedInterest,
    cashAtEnd: last.cash,
    debitAtEnd: last.debit,
    lotValueAtEnd: last.lotValue,
    strategyDripValueAtEnd: last.vgtDripValue,
    minute: minuteRisk(account)
  },
  uplift: {
    dollars: last.nav - lastCore.nav,
    percentOfCoreEnd: last.nav / lastCore.nav - 1,
    cagrDifference: integratedStats.cagr - coreStats.cagr,
    maximumDrawdownDollarsDifference: integratedStats.drawdown.dollars.value - coreDrawdownRows.dollars.value,
    maximumDrawdownPercentDifference: integratedStats.drawdown.percent.value - coreDrawdownRows.percent.value
  },
  strategy: {
    trades: result.positions.length,
    closed: closedTrades.length,
    open: openPosition ? 1 : 0,
    winning: closedTrades.filter((p) => p.profit! > 0).length,
    losing: closedTrades.filter((p) => p.profit! <= 0).length,
    principalTotal: result.positions.reduce((t, p) => t + p.investment, 0),
    largestPrincipal: Math.max(...result.positions.map((p) => p.investment)),
    smallestPrincipal: Math.min(...result.positions.map((p) => p.investment)),
    realizedProfitStrategyInterest: closedTrades.reduce((t, p) => t + p.profit!, 0),
    realizedGainBeforeFinancing: closedTrades.reduce((t, p) => t + p.shares * p.exitPrice! - p.investment, 0),
    unrealizedGainBeforeFinancing: openPosition ? openPosition.shares * last.vgtClose - openPosition.investment : 0,
    strategyInterestClosed: closedTrades.reduce((t, p) => t + p.interest!, 0),
    standaloneDrawdown: strategyDrawdown
  },
  margin: {
    lowestEquityToSecurities: worstBy(margins, (m) => m.ratio),
    highestDebtToNav: worstBy(margins, (m) => -m.debt),
    highestGrossToNav: worstBy(margins, (m) => -m.gross),
    largestDebit: worstBy(margins, (m) => -m.debit),
    smallestFallTo: Object.fromEntries(
      maintenanceRates.map((m) => [m, worstBy(margins, (x) => x[`fall_to_${m * 100}`]!)])
    ),
    breachDays: Object.fromEntries(
      maintenanceRates.map((m) => [m, margins.filter((x) => x[`excess_${m * 100}`]! < 0).length])
    ),
    daysWithDebit: margins.filter((m) => m.debit > 0).length,
    daysWithDebitWhileFlat: account.rows.filter((r) => r.debit + r.accruedInterest > 1e-9 && r.lotShares === 0).length,
    largestDebitWhileFlat: Math.max(
      0,
      ...account.rows.filter((r) => r.lotShares === 0).map((r) => r.debit + r.accruedInterest)
    )
  },
  annual
};

await fs.ensureDir(outDir);
await fs.writeFile(`${outDir}/portfolio_daily.csv`, `${dailyLines.join('\n')}\n`);
await fs.writeFile(`${outDir}/trades_dynamic.csv`, `${tradeLines.join('\n')}\n`);
await fs.writeFile(`${outDir}/dividends.csv`, `${dividendLines.join('\n')}\n`);
await fs.writeFile(`${outDir}/summary.json`, `${JSON.stringify(summary, null, 1)}\n`);
await fs.writeFile(`${outDir}/sizing.json`, `${JSON.stringify([...account.sizing.values()], null, 1)}\n`);
console.info(
  `${financing}/${voogSizing}: core-only ${Math.round(lastCore.nav)}, core+strategy ${Math.round(last.nav)}, uplift ${Math.round(last.nav - lastCore.nav)}; max DD ${Math.round(coreDrawdownRows.dollars.value)} vs ${Math.round(integratedStats.drawdown.dollars.value)}`
);
