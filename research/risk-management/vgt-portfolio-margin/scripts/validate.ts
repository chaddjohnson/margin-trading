// Validates one portfolio run from its output files, re-deriving everything it can independently:
//  1. initialization; 2. the daily balance-sheet identity in both books; 3. the core inventory of the
//  integrated account equals the core-only book; 4. trade identity with the frozen fixed-$100,000 control
//  (every non-dollar field equal, every dollar field scaled exactly); 5. sizing: 20% of the pre-entry NAV,
//  recomputed from the previous close's ledger, the day's entitlements and VOOG's raw minute file, with no
//  price from after the decision; 6. distribution entitlements and reinvestment; 7. the debit, cash and
//  interest paths recomputed day by day; 8. the open position at the end.
//
// Usage: node --experimental-transform-types scripts/validate.ts <run dir> <report json> [gross|netted] [minute|prior-close]
import fs from 'fs-extra';

const [, , runDir = '', reportFile = '', financing = 'gross', voogSizing = 'minute'] = process.argv;
const here = 'research/risk-management/vgt-portfolio-margin';
const reference = 'research/risk-management/allin-minute-conversion/results/current-params/minute-fullfile';
const rate = 0.11;
const failures: string[] = [];
const checks: Record<string, number> = {};
const check = (name: string, ok: boolean, detail = '') => {
  checks[name] = (checks[name] ?? 0) + 1;

  if (!ok) {
    failures.push(`${name}: ${detail}`);
  }
};
const near = (a: number, b: number, tolerance = 1e-6) =>
  Math.abs(a - b) <= tolerance * Math.max(1, Math.abs(a), Math.abs(b));

type Row = Record<string, string>;

const readCsv = async (file: string): Promise<Row[]> => {
  const [header, ...rows] = (await fs.readFile(file, 'utf8')).trim().split('\n');
  const keys = header!.split(',');

  return rows.map((row) => Object.fromEntries(row.split(',').map((v, i) => [keys[i]!, v])));
};
const n = (row: Row | undefined, key: string) => Number(row?.[key]);

const daily = await readCsv(`${runDir}/portfolio_daily.csv`);
const trades = await readCsv(`${runDir}/trades_dynamic.csv`);
const dividends = await readCsv(`${runDir}/dividends.csv`);
const distributions = await readCsv(`${here}/data/distributions.csv`);
const summary = JSON.parse(await fs.readFile(`${runDir}/summary.json`, 'utf8'));
const dayIndex = new Map(daily.map((r, i) => [r.date!, i]));

// 1. Initialization.
const first = daily[0]!;

check('init', first.date === '2016-01-04', first.date);
check('init', near(n(first, 'voog_value'), 240000) && near(n(first, 'vgt_core_value'), 160000), 'core values');
check('init', near(n(first, 'nav'), 400000) && near(n(first, 'core_nav'), 400000), 'NAV');
check('init', n(first, 'cash') === 0 && n(first, 'debit') === 0 && n(first, 'lot_shares') === 0, 'cash/debit/lot');

// 2 and 3. Balance sheet and core identity, every session.
for (const r of daily) {
  const securities =
    n(r, 'voog_shares') * n(r, 'voog_close') +
    (n(r, 'vgt_core_shares') + n(r, 'vgt_strategy_drip_shares') + n(r, 'lot_shares')) * n(r, 'vgt_close');

  check('identity: securities', near(securities, n(r, 'securities')), r.date);
  check(
    'identity: NAV',
    near(n(r, 'nav'), securities + n(r, 'receivables') + n(r, 'cash') - n(r, 'debit') - n(r, 'accrued_interest')),
    r.date
  );
  check(
    'identity: core-only NAV',
    near(
      n(r, 'core_nav'),
      n(r, 'core_voog_shares') * n(r, 'voog_close') +
        n(r, 'core_vgt_shares') * n(r, 'vgt_close') +
        n(r, 'core_receivables')
    ),
    r.date
  );
  check(
    'core inventory equals the core-only book',
    n(r, 'voog_shares') === n(r, 'core_voog_shares') && n(r, 'vgt_core_shares') === n(r, 'core_vgt_shares'),
    r.date
  );
  check(
    'no negative balances',
    n(r, 'cash') >= -1e-9 && n(r, 'debit') >= -1e-9 && n(r, 'accrued_interest') >= -1e-9,
    r.date
  );

  if (financing === 'netted') {
    check('netted: cash and debit never coexist', n(r, 'cash') < 1e-6 || n(r, 'debit') < 1e-6, r.date);
  }
}

// 4. Trade identity with the frozen fixed-$100,000 control.
const strategy = (name: string) => readCsv(`${runDir}/strategy/${name}`);
const fixed = (name: string) => readCsv(`${reference}/${name}`);
const [dynamicTrades, fixedTrades] = [await strategy('trades.csv'), await fixed('trades.csv')];
const dollarTradeFields = ['investment', 'shares', 'interest', 'profit'];

check(
  'trade identity: count',
  dynamicTrades.length === fixedTrades.length,
  `${dynamicTrades.length} vs ${fixedTrades.length}`
);
dynamicTrades.forEach((d, i) => {
  const f = fixedTrades[i]!;
  const scale = n(d, 'investment') / 100000;

  for (const key of Object.keys(f).filter((k) => !dollarTradeFields.includes(k))) {
    check(`trade identity: ${key}`, d[key] === f[key], `${d.entry_date} ${key} ${d[key]} vs ${f[key]}`);
  }

  for (const key of ['shares', 'interest', 'profit']) {
    check(
      `trade identity: ${key} scales with the investment`,
      near(n(d, key), n(f, key) * scale, 1e-9),
      `${d.entry_date} ${key}`
    );
  }
});

const [dynamicStates, fixedStates] = [await strategy('states.csv'), await fixed('states.csv')];

check('state identity: count', dynamicStates.length === fixedStates.length);
dynamicStates.forEach((d, i) => {
  for (const key of Object.keys(d).filter((k) => k !== 'trade_profit')) {
    check(`state identity: ${key}`, d[key] === fixedStates[i]![key], `${d.date} ${key}`);
  }
});

const [dynamicEpisodes, fixedEpisodes] = [await strategy('episodes.csv'), await fixed('episodes.csv')];

check('episode identity: count', dynamicEpisodes.length === fixedEpisodes.length);
dynamicEpisodes.forEach((d, i) => {
  for (const key of Object.keys(d).filter((k) => k !== 'loss')) {
    check(`episode identity: ${key}`, d[key] === fixedEpisodes[i]![key], `${d.exit_date} ${key}`);
  }
});

const [dynamicDaily, fixedDaily] = [await strategy('daily.csv'), await fixed('daily.csv')];

dynamicDaily.forEach((d, i) => {
  for (const key of ['date', 'close', 'recent_high', 'decision_price', 'signal']) {
    check(`signal identity: ${key}`, d[key] === fixedDaily[i]![key], `${d.date} ${key}`);
  }

  check('signal identity: held', n(d, 'borrowed') > 0 === n(fixedDaily[i], 'borrowed') > 0, d.date);
});

// 5. Sizing. The decision-time NAV is rebuilt from the previous close's ledger row: its shares and cash,
// its debit plus accrued interest including the overnight accrual, its receivables plus the day's new
// entitlements, VOOG at its last completed minute before the decision (from the raw file) and VGT at the
// decision price.
const voogBars = (await fs.readFile('data/VOOG/VOOG-2016-2025-1-minute.csv', 'utf8'))
  .trim()
  .split('\n')
  .map((line) => {
    const [stamp, , , , close] = line.split(',');

    return { time: Date.parse(stamp!.replaceAll('"', '')) / 1000, close: Number(close) };
  });

for (const t of trades) {
  const i = dayIndex.get(t.entry_date!)!;
  const previous = daily[i - 1]!;
  const decisionTime = Date.parse(t.decision_time!) / 1000;
  const sessionBars = voogBars.filter((b) => b.time > decisionTime - 7 * 3600 && b.time + 60 <= decisionTime);
  const voog = voogSizing === 'minute' && sessionBars.length ? sessionBars.at(-1)!.close : n(previous, 'voog_close');
  const newEntitlements = distributions
    .filter((d) => d.ex_date === t.entry_date)
    .reduce(
      (total, d) =>
        total +
        n(d, 'amount') *
          (d.etf === 'VOOG'
            ? n(previous, 'voog_shares')
            : n(previous, 'vgt_core_shares') + n(previous, 'vgt_strategy_drip_shares') + n(previous, 'lot_shares')),
      0
    );
  const liabilities = n(previous, 'debit') + n(previous, 'accrued_interest') + n(previous, 'interest_accrued');
  const nav =
    n(previous, 'voog_shares') * voog +
    (n(previous, 'vgt_core_shares') + n(previous, 'vgt_strategy_drip_shares')) * n(t, 'decision_price') +
    n(previous, 'receivables') +
    newEntitlements +
    n(previous, 'cash') -
    liabilities;

  check('sizing: flat before the entry', n(previous, 'lot_shares') === 0, t.entry_date);
  check(
    'sizing: VOOG price',
    near(voog, n(t, 'sizing_voog_price'), 1e-12),
    `${t.entry_date} ${voog} vs ${t.sizing_voog_price}`
  );
  check(
    'sizing: VOOG minute completed before the decision',
    Date.parse(t.sizing_voog_price_time!) / 1000 + 60 <= decisionTime,
    t.entry_date
  );
  check('sizing: decision before the fill', decisionTime <= Date.parse(t.entry_time!) / 1000, t.entry_date);
  check(
    'sizing: pre-entry NAV',
    near(nav, n(t, 'pre_entry_nav'), 1e-9),
    `${t.entry_date} ${nav} vs ${t.pre_entry_nav}`
  );
  check('sizing: 20% of NAV', near(n(t, 'principal'), 0.2 * n(t, 'pre_entry_nav'), 1e-12), t.entry_date);
  check(
    'sizing: buying on margin leaves NAV unchanged',
    near(
      n(t, 'securities_after') + n(t, 'cash_after') - n(t, 'debit_after') - n(t, 'accrued_before'),
      n(t, 'securities_before') + n(t, 'cash_before') - n(t, 'debit_before') - n(t, 'accrued_before')
    ),
    t.entry_date
  );
}

// 6. Distributions: entitlement from the previous close's holdings by source, reinvestment at the pay
// date's close, and the core-only book's core distributions equal to the integrated core distributions.
const heldBySource = (r: Row, etf: string, source: string) =>
  etf === 'VOOG'
    ? source === 'core'
      ? n(r, 'voog_shares')
      : 0
    : source === 'core'
      ? n(r, 'vgt_core_shares')
      : source === 'drip'
        ? n(r, 'vgt_strategy_drip_shares')
        : n(r, 'lot_shares');

for (const d of dividends) {
  const i = dayIndex.get(d.ex_date!)!;
  const previous = daily[i - 1]!;
  const expected =
    d.book === 'core-only'
      ? d.etf === 'VOOG'
        ? n(previous, 'core_voog_shares')
        : n(previous, 'core_vgt_shares')
      : heldBySource(previous, d.etf!, d.source!);

  check(
    'dividends: entitled shares held at the previous close',
    near(n(d, 'eligible_shares'), expected, 1e-12),
    `${d.book} ${d.etf} ${d.ex_date} ${d.source}`
  );
  check('dividends: receivable', near(n(d, 'receivable'), n(d, 'amount') * n(d, 'eligible_shares'), 1e-12), d.ex_date);

  if (d.reinvest_date !== 'pending at end') {
    const pay = daily[dayIndex.get(d.pay_date!)!]!;

    check(
      'dividends: reinvested at the pay date close',
      n(d, 'reinvest_price') === n(pay, d.etf === 'VOOG' ? 'voog_close' : 'vgt_close'),
      d.pay_date
    );
    check(
      'dividends: new shares',
      near(n(d, 'new_shares'), n(d, 'receivable') / n(d, 'reinvest_price'), 1e-12),
      d.pay_date
    );
  }
}

for (const dist of distributions) {
  const of = (book: string, source?: string) =>
    dividends.filter(
      (d) => d.book === book && d.etf === dist.etf && d.ex_date === dist.ex_date && (!source || d.source === source)
    );

  check(
    'dividends: one core receivable per distribution and book',
    of('core-only').length === 1 && of('core+strategy', 'core').length === 1,
    `${dist.etf} ${dist.ex_date}`
  );
  check(
    'dividends: core-only equals integrated core',
    of('core-only')[0]?.receivable === of('core+strategy', 'core')[0]?.receivable,
    `${dist.etf} ${dist.ex_date}`
  );
}

const lotEntitlements = dividends.filter((d) => d.source === 'lot');

for (const d of lotEntitlements) {
  const trade = trades.find((t) => t.entry_date === d.lot_entry_date)!;

  check(
    'dividends: a lot is entitled only if bought before the ex-date',
    trade.entry_date! < d.ex_date!,
    `${d.ex_date} lot ${d.lot_entry_date}`
  );
  check(
    'dividends: and not sold before it',
    !trade.exit_date || trade.exit_date >= d.ex_date!,
    `${d.ex_date} lot ${d.lot_entry_date}`
  );
}

for (const t of trades) {
  const exDates = distributions
    .filter((d) => d.etf === 'VGT' && d.ex_date! > t.entry_date! && (!t.exit_date || d.ex_date! <= t.exit_date))
    .map((d) => d.ex_date);
  const got = lotEntitlements.filter((d) => d.lot_entry_date === t.entry_date).map((d) => d.ex_date);

  check(
    'dividends: every lot entitlement found',
    exDates.join() === got.join(),
    `${t.entry_date}: ${exDates.join(' ')} vs ${got.join(' ')}`
  );
}

// 7. Debit, cash and interest, recomputed day by day from the trades and the month-end rule.
let debit = 0;
let cash = 0;
let accrued = 0;
const net = () => {
  if (financing === 'netted') {
    const offset = Math.min(cash, debit);

    cash -= offset;
    debit -= offset;
  }
};

daily.forEach((r, i) => {
  for (const t of trades.filter((x) => x.exit_date === r.date)) {
    const proceeds = n(t, 'shares') * n(t, 'exit_price');
    const repaid = Math.min(proceeds, debit);

    check(
      'debit: proceeds repay the debit first',
      near(repaid, n(t, 'debit_repaid')) && near(proceeds, n(t, 'proceeds')),
      r.date
    );
    debit -= repaid;
    cash += proceeds - repaid;
    net();
  }

  for (const t of trades.filter((x) => x.entry_date === r.date)) {
    debit += n(t, 'principal');
    net();
  }

  check('debit path', near(debit, n(r, 'debit')), `${r.date} ${debit} vs ${r.debit}`);
  check('cash path', near(cash, n(r, 'cash')), `${r.date} ${cash} vs ${r.cash}`);
  check('accrued interest path', near(accrued, n(r, 'accrued_interest')), r.date);

  const nextDate = daily[i + 1]?.date;
  let interest = 0;

  if (nextDate) {
    for (let t = Date.parse(r.date!); t < Date.parse(nextDate); t += 86400000) {
      interest += (debit * rate) / 365;
      accrued += (debit * rate) / 365;

      if (new Date(t + 86400000).getUTCDate() === 1) {
        debit += accrued;
        accrued = 0;
        net();
      }
    }
  }

  check('interest accrual', near(interest, n(r, 'interest_accrued')), r.date);
});

const totalAccrued = daily.reduce((t, r) => t + n(r, 'interest_accrued'), 0);
const totalCharged = daily.reduce((t, r) => t + n(r, 'interest_charged'), 0);

check(
  'interest: charged + still accrued = accrued',
  near(totalCharged + n(daily.at(-1), 'accrued_interest'), totalAccrued)
);
check('summary: interest', near(summary.integrated.interestAccrued, totalAccrued));

// 8. The open position at the end.
const last = daily.at(-1)!;
const open = trades.filter((t) => t.status === 'open at end');

check('end: one open lot', open.length === 1 && n(last, 'lot_shares') === n(open[0], 'shares'));
check('end: lot marked at the last close', near(n(last, 'lot_value'), n(open[0], 'shares') * n(last, 'vgt_close')));
check(
  'end: pending receivables in NAV',
  near(
    n(last, 'receivables'),
    dividends
      .filter((d) => d.book === 'core+strategy' && d.reinvest_date === 'pending at end')
      .reduce((t, d) => t + n(d, 'receivable'), 0)
  )
);
check(
  'end: summary NAV',
  near(summary.integrated.end, n(last, 'nav')) && near(summary.coreOnly.end, n(last, 'core_nav'))
);

// Spot checks of representative trades for the report: the account arithmetic by hand.
const spot = ['2018-11-12', '2020-03-12', '2022-09-15', '2025-03-03'].map((date) => {
  const t = trades.find((x) => x.entry_date === date)!;
  const shares = n(t, 'principal') / n(t, 'entry_price');
  const proceeds = shares * n(t, 'exit_price');

  check('spot check: shares', near(shares, n(t, 'shares'), 1e-12), date);
  check(
    'spot check: debit after exit',
    near(n(t, 'debit_before_exit') - Math.min(proceeds, n(t, 'debit_before_exit')), n(t, 'debit_after_exit')),
    date
  );

  return {
    entry: date,
    preEntryNav: n(t, 'pre_entry_nav'),
    principal: n(t, 'principal'),
    entryPrice: n(t, 'entry_price'),
    shares,
    exit: t.exit_date,
    reason: t.exit_reason,
    exitPrice: n(t, 'exit_price'),
    proceeds,
    debitBeforeExit: n(t, 'debit_before_exit'),
    debitAfterExit: n(t, 'debit_after_exit'),
    strategyInterest: n(t, 'strategy_interest'),
    accountInterest: n(t, 'account_interest_while_open')
  };
});

const total = Object.values(checks).reduce((a, b) => a + b, 0);

await fs.writeFile(
  reportFile,
  `${JSON.stringify({ runDir, financing, voogSizing, total, failures: failures.length, checks, failureDetails: failures, spot }, null, 1)}\n`
);
console.info(`${runDir}: ${total} checks, ${failures.length} failures`);
failures.slice(0, 20).forEach((f) => console.info(`FAIL ${f}`));
process.exitCode = failures.length ? 1 : 0;
