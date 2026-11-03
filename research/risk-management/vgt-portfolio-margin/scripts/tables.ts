// Renders the report tables from the run outputs into results/tables.json ({ name: markdown }), which
// scripts/assemble-reports.ts substitutes into the report templates.
// Usage: node --experimental-transform-types scripts/tables.ts <results dir>
import fs from 'fs-extra';

const [, , results = ''] = process.argv;
const reference = 'research/risk-management/allin-minute-conversion/results/current-params/minute-fullfile';

type Row = Record<string, string>;

const readCsv = async (file: string): Promise<Row[]> => {
  const [header, ...rows] = (await fs.readFile(file, 'utf8')).trim().split('\n');
  const keys = header!.split(',');

  return rows.map((row) => Object.fromEntries(row.split(',').map((v, i) => [keys[i]!, v])));
};
const n = (row: Row | undefined, key: string) => Number(row?.[key]);
const json = async (file: string) => JSON.parse(await fs.readFile(file, 'utf8'));
const usd = (v: number) => `${v < 0 ? '−' : ''}$${Math.abs(v).toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
const signed = (v: number) => (v > 0 ? `+${usd(v)}` : usd(v));
const pct = (v: number, d = 2) => `${v < 0 ? '−' : ''}${Math.abs(v * 100).toFixed(d)}%`;
const x = (v: number) => `${v.toFixed(3)}×`;
const table = (header: string[], rows: (string | number)[][]) =>
  [
    `| ${header.join(' | ')} |`,
    `|${header.map((h, i) => (i === 0 ? '---' : '---:')).join('|')}|`,
    ...rows.map((r) => `| ${r.join(' | ')} |`)
  ].join('\n');
const et = (iso: string) =>
  iso
    ? new Date(iso).toLocaleString('en-US', {
        timeZone: 'America/New_York',
        hourCycle: 'h23',
        hour: '2-digit',
        minute: '2-digit'
      })
    : '';

const main = await json(`${results}/main/summary.json`);
const netted = await json(`${results}/netted/summary.json`);
const priorClose = await json(`${results}/prior-close/summary.json`);
const daily = await readCsv(`${results}/main/portfolio_daily.csv`);
const trades = await readCsv(`${results}/main/trades_dynamic.csv`);
const dividends = await readCsv(`${results}/main/dividends.csv`);
const distributions = await readCsv('research/risk-management/vgt-portfolio-margin/data/distributions.csv');
const fixedTrades = await readCsv(`${reference}/trades.csv`);
const dynamicStrategy = await readCsv(`${results}/main/strategy/trades.csv`);
const out: Record<string, string> = {};

// Headline.
const dd = (s: {
  drawdown: {
    dollars: { value: number; peak: string; trough: string };
    percent: { value: number; peak: string; trough: string };
  };
}) => [
  `${usd(s.drawdown.dollars.value)} (${s.drawdown.dollars.peak} → ${s.drawdown.dollars.trough})`,
  `${pct(s.drawdown.percent.value)} (${s.drawdown.percent.peak} → ${s.drawdown.percent.trough})`
];

out.headline = table(
  ['', 'Core only', 'Core + strategy', 'Difference'],
  [
    ['Start (2016-01-04 close)', usd(main.coreOnly.start), usd(main.integrated.start), '$0'],
    [`End (${main.dates.last} close)`, usd(main.coreOnly.end), usd(main.integrated.end), signed(main.uplift.dollars)],
    [
      'Total return',
      pct(main.coreOnly.totalReturn, 1),
      pct(main.integrated.totalReturn, 1),
      `+${((main.integrated.totalReturn - main.coreOnly.totalReturn) * 100).toFixed(1)} pts`
    ],
    [
      'CAGR',
      pct(main.coreOnly.cagr),
      pct(main.integrated.cagr),
      `+${(main.uplift.cagrDifference * 100).toFixed(2)} pts`
    ],
    [
      'Max drawdown, $ (daily close)',
      ...[dd(main.coreOnly)[0], dd(main.integrated)[0]],
      signed(main.uplift.maximumDrawdownDollarsDifference)
    ],
    [
      'Max drawdown, % (daily close)',
      ...[dd(main.coreOnly)[1], dd(main.integrated)[1]],
      `${(main.uplift.maximumDrawdownPercentDifference * 100).toFixed(2)} pts`
    ],
    [
      'Largest $ drawdown, minute-sampled (its % of peak)',
      `${usd(main.coreOnly.minute.maximumDrawdown)} (${pct(main.coreOnly.minute.maximumDrawdownPercent)})`,
      `${usd(main.integrated.minute.maximumDrawdown)} (${pct(main.integrated.minute.maximumDrawdownPercent)})`,
      signed(main.integrated.minute.maximumDrawdown - main.coreOnly.minute.maximumDrawdown)
    ],
    [
      'Longest time underwater',
      `${main.coreOnly.drawdown.longestUnderwater.days} days`,
      `${main.integrated.drawdown.longestUnderwater.days} days`,
      ''
    ],
    [
      'Annualized volatility (daily)',
      pct(main.coreOnly.annualizedVolatility),
      pct(main.integrated.annualizedVolatility),
      ''
    ],
    [
      'Return / volatility (0% rate)',
      main.coreOnly.sharpeAtZeroRate.toFixed(3),
      main.integrated.sharpeAtZeroRate.toFixed(3),
      ''
    ],
    ['CAGR / max % drawdown', main.coreOnly.calmar.toFixed(3), main.integrated.calmar.toFixed(3), ''],
    [
      'Dividends reinvested',
      usd(main.coreOnly.dividends),
      usd(main.integrated.dividends),
      signed(main.integrated.dividends - main.coreOnly.dividends)
    ],
    ['Margin interest (accrued)', '$0', usd(main.integrated.interestAccrued), ''],
    [
      'Highest gross securities / NAV',
      '1.000×',
      `${x(main.margin.highestGrossToNav.gross)} (${main.margin.highestGrossToNav.date})`,
      ''
    ],
    [
      'Highest total debt / NAV',
      '0',
      `${pct(main.margin.highestDebtToNav.debt)} (${main.margin.highestDebtToNav.date})`,
      ''
    ],
    [
      'Lowest equity / securities (daily close)',
      '100%',
      `${pct(main.margin.lowestEquityToSecurities.ratio)} (${main.margin.lowestEquityToSecurities.date})`,
      ''
    ],
    [
      'Days below a 25%–50% maintenance requirement',
      '0',
      String(Object.values(main.margin.breachDays).reduce((a: number, b) => a + Number(b), 0)),
      ''
    ]
  ]
);

out.sensitivities = table(
  ['Variant', 'End NAV', 'Uplift vs core', 'Interest', 'Max DD $', 'Max DD %', 'Cash at end', 'Debit at end'],
  [
    ['Main: gross financing, VOOG minute at decision', main, main],
    ['Netted financing (cash funds entries first)', netted, netted],
    ['VOOG prior close for sizing', priorClose, priorClose]
  ].map(([label, s]) => [
    String(label),
    usd(s.integrated.end),
    signed(s.uplift.dollars),
    usd(s.integrated.interestAccrued),
    usd(s.integrated.drawdown.dollars.value),
    pct(s.integrated.drawdown.percent.value),
    usd(s.integrated.cashAtEnd),
    usd(s.integrated.debitAtEnd)
  ])
);

// Every entry.
out.entries = table(
  [
    'Entry (ET)',
    'Pre-entry NAV',
    '20% borrowed',
    'Dividends reinvested so far',
    'Debt after entry',
    'Debt / NAV',
    'Gross / NAV',
    'Exit',
    'Reason',
    'Price return',
    'Strategy profit',
    'Account interest'
  ],
  trades.map((t) => [
    `${t.entry_date} ${et(t.entry_time!)}`,
    usd(n(t, 'pre_entry_nav')),
    usd(n(t, 'principal')),
    usd(n(t, 'cumulative_dividends_reinvested')),
    usd(n(t, 'debit_after') + n(t, 'accrued_before')),
    pct(n(t, 'total_debt_to_nav_after'), 1),
    x(n(t, 'gross_to_nav_after')),
    t.exit_date ? `${t.exit_date} ${et(t.exit_time!)}` : `open, marked ${main.dates.last}`,
    t.exit_reason!,
    pct(n(t, 'price_return')),
    usd(n(t, 'strategy_profit')),
    usd(n(t, 'account_interest_while_open'))
  ])
);

// Exits, the account side.
out.exits = table(
  [
    'Entry',
    'Exit',
    'Proceeds',
    'Debit before',
    'Repaid',
    'Residual debit',
    'Cash after',
    'Gain before financing',
    'Strategy interest',
    'Account interest while open',
    'Difference',
    'NAV after exit',
    'Lot dividends'
  ],
  trades
    .filter((t) => t.status === 'closed')
    .map((t) => [
      t.entry_date!,
      t.exit_date!,
      usd(n(t, 'proceeds')),
      usd(n(t, 'debit_before_exit')),
      usd(n(t, 'debit_repaid')),
      usd(n(t, 'debit_after_exit')),
      usd(n(t, 'cash_after_exit')),
      signed(n(t, 'gain_before_financing')),
      usd(n(t, 'strategy_interest')),
      usd(n(t, 'account_interest_while_open')),
      signed(n(t, 'interest_difference')),
      usd(n(t, 'nav_after_exit')),
      usd(n(t, 'lot_dividends'))
    ])
);

// Annual.
out.annual = table(
  [
    'Year',
    'Core-only NAV',
    'Core return',
    'Core max DD',
    'Integrated NAV',
    'Integrated return',
    'Integrated max DD',
    'Strategy contribution',
    'Interest',
    'Dividends (integrated)',
    'Lowest equity / securities'
  ],
  main.annual.map(
    (a: {
      year: string;
      coreOnly: Record<string, number>;
      integrated: Record<string, number>;
      strategyContribution: number;
    }) => [
      a.year === main.dates.last.slice(0, 4) ? `${a.year} (to ${main.dates.last.slice(5)})` : a.year,
      usd(a.coreOnly.endNav!),
      pct(a.coreOnly.return!),
      pct(a.coreOnly.maximumDrawdownPercent!),
      usd(a.integrated.endNav!),
      pct(a.integrated.return!),
      `${pct(a.integrated.maximumDrawdownPercent!)} (${usd(a.integrated.maximumDrawdown!)})`,
      signed(a.strategyContribution),
      usd(a.integrated.interest!),
      usd(a.integrated.dividends!),
      pct(a.integrated.lowestEquityToSecurities!)
    ]
  )
);

// Stress periods.
const periods = [
  ['COVID crash', '2020-02-19', '2020-04-30'],
  ['2022 bear market', '2022-01-03', '2022-12-30'],
  ['April 2025 tariff sell-off', '2025-02-19', '2025-05-30']
];

out.stress = table(
  [
    'Period',
    'Book',
    'Start NAV',
    'Lowest NAV (date)',
    'End NAV',
    'Peak-to-trough in period',
    'Highest debt',
    'Lowest equity / securities',
    'Smallest excess over 30%',
    'Smallest fall to a 30% call'
  ],
  periods.flatMap(([label, from, to]) => {
    const rows = daily.filter((r) => r.date! >= from! && r.date! <= to!);
    const stats = (key: string) => {
      let peak = -Infinity;
      let worst = 0;

      for (const r of rows) {
        peak = Math.max(peak, n(r, key));
        worst = Math.max(worst, 1 - n(r, key) / peak);
      }

      const low = rows.reduce((a, b) => (n(b, key) < n(a, key) ? b : a));

      return { worst, low };
    };
    const core = stats('core_nav');
    const integrated = stats('nav');
    const lowRatio = rows.reduce((a, b) => (n(b, 'equity_to_securities') < n(a, 'equity_to_securities') ? b : a));
    const lowExcess = rows.reduce((a, b) => (n(b, 'excess_30') < n(a, 'excess_30') ? b : a));
    const lowFall = rows.reduce((a, b) => (n(b, 'fall_to_30') < n(a, 'fall_to_30') ? b : a));
    const highDebt = rows.reduce((a, b) =>
      n(b, 'debit') + n(b, 'accrued_interest') > n(a, 'debit') + n(a, 'accrued_interest') ? b : a
    );

    return [
      [
        `${label} (${from} → ${to})`,
        'Core only',
        usd(n(rows[0], 'core_nav')),
        `${usd(n(core.low, 'core_nav'))} (${core.low.date})`,
        usd(n(rows.at(-1), 'core_nav')),
        pct(core.worst),
        '$0',
        '100%',
        '',
        ''
      ],
      [
        '',
        'Core + strategy',
        usd(n(rows[0], 'nav')),
        `${usd(n(integrated.low, 'nav'))} (${integrated.low.date})`,
        usd(n(rows.at(-1), 'nav')),
        pct(integrated.worst),
        `${usd(n(highDebt, 'debit') + n(highDebt, 'accrued_interest'))} (${highDebt.date})`,
        `${pct(n(lowRatio, 'equity_to_securities'))} (${lowRatio.date})`,
        `${usd(n(lowExcess, 'excess_30'))} (${lowExcess.date})`,
        `${pct(n(lowFall, 'fall_to_30'), 1)} (${lowFall.date})`
      ]
    ];
  })
);

// Worst margin dates per year of interest.
out.worstByYear = table(
  [
    'Year',
    'Lowest equity / securities',
    'Highest debt / NAV',
    'Highest gross / NAV',
    'Smallest uniform fall to a 25% / 30% / 40% / 50% requirement'
  ],
  ['2016', '2018', '2019', '2020', '2021', '2022', '2023', '2024', '2025'].map((year) => {
    const rows = daily.filter((r) => r.date!.startsWith(year));
    const low = (key: string) => rows.reduce((a, b) => (n(b, key) < n(a, key) ? b : a));
    const high = (key: string) => rows.reduce((a, b) => (n(b, key) > n(a, key) ? b : a));
    const ratio = low('equity_to_securities');
    const debt = high('debt_to_nav');
    const gross = high('gross_to_nav');

    return [
      year,
      `${pct(n(ratio, 'equity_to_securities'))} (${ratio.date})`,
      `${pct(n(debt, 'debt_to_nav'))} (${debt.date})`,
      `${x(n(gross, 'gross_to_nav'))} (${gross.date})`,
      [25, 30, 40, 50].map((m) => pct(n(low(`fall_to_${m}`), `fall_to_${m}`), 1)).join(' / ')
    ];
  })
);

out.maintenance = table(
  [
    'Requirement (equity ÷ long market value)',
    'Status',
    'Days breached',
    'Smallest excess equity (date)',
    'Smallest uniform fall in both ETFs that would breach it (date)'
  ],
  [0.25, 0.3, 0.4, 0.5].map((m) => {
    const key = m * 100;
    const lowExcess = daily.reduce((a, b) => (n(b, `excess_${key}`) < n(a, `excess_${key}`) ? b : a));
    const fall = main.margin.smallestFallTo[String(m)];

    return [
      `${key}%`,
      m === 0.25 ? 'FINRA Rule 4210 regulatory minimum' : 'hypothetical house requirement',
      main.margin.breachDays[String(m)],
      `${usd(n(lowExcess, `excess_${key}`))} (${lowExcess.date})`,
      `${pct(fall[`fall_to_${key}`], 1)} (${fall.date})`
    ];
  })
);

// Trade reconciliation: fixed control against dynamic sizing.
out.reconciliation = table(
  [
    'Entry (ET)',
    'Exit (ET)',
    'Reason',
    'Entry price',
    'Exit price',
    'Fixed shares',
    'Dynamic shares',
    'Fixed investment',
    'Dynamic investment',
    'Fixed profit',
    'Dynamic profit',
    'Profit / investment (both)'
  ],
  fixedTrades.map((f, i) => {
    const d = dynamicStrategy[i]!;
    const same = [
      'entry_date',
      'exit_date',
      'entry_price',
      'exit_price',
      'reason',
      'entry_time',
      'exit_time',
      'decision_time',
      'decision_price',
      'exit_execution',
      'exit_stop_price'
    ].every((k) => f[k] === d[k]);

    return [
      `${f.entry_date} ${et(f.entry_time!)}`,
      f.exit_date ? `${f.exit_date} ${et(f.exit_time!)}` : 'open',
      f.reason!,
      Number(f.entry_price).toFixed(2),
      Number(f.exit_price).toFixed(2),
      Number(f.shares).toFixed(3),
      Number(d.shares).toFixed(3),
      usd(n(f, 'investment')),
      usd(n(d, 'investment')),
      usd(n(f, 'profit')),
      usd(n(d, 'profit')),
      `${pct(n(f, 'profit') / n(f, 'investment'), 3)}${same && Math.abs(n(f, 'profit') / n(f, 'investment') - n(d, 'profit') / n(d, 'investment')) < 1e-12 ? ' ✓' : ' ✗'}`
    ];
  })
);

// Distributions.
const yearsOf = [...new Set(distributions.map((d) => d.ex_date!.slice(0, 4)))];

out.distributionsByYear = table(
  [
    'Year',
    'VOOG distributions',
    'VOOG $ / share',
    'VOOG yield (sum)',
    'VGT distributions',
    'VGT $ / share',
    'VGT yield (sum)',
    'Estimated amounts'
  ],
  yearsOf.map((year) => {
    const of = (etf: string) => distributions.filter((d) => d.etf === etf && d.ex_date!.startsWith(year));

    return [
      year,
      of('VOOG').length,
      `$${of('VOOG')
        .reduce((t, d) => t + n(d, 'amount'), 0)
        .toFixed(4)}`,
      pct(of('VOOG').reduce((t, d) => t + n(d, 'yield'), 0)),
      of('VGT').length,
      `$${of('VGT')
        .reduce((t, d) => t + n(d, 'amount'), 0)
        .toFixed(4)}`,
      pct(of('VGT').reduce((t, d) => t + n(d, 'yield'), 0)),
      String([...of('VOOG'), ...of('VGT')].filter((d) => d.amount_method === 'estimated').length)
    ];
  })
);

out.distributions = table(
  ['ETF', 'Ex-date', 'Pay date (est.)', '$ / share', 'Yield', 'Amount', 'Step ÷ noise'],
  distributions.map((d) => [
    d.etf!,
    d.ex_date!,
    d.pay_date!,
    `$${n(d, 'amount').toFixed(4)}`,
    pct(n(d, 'yield'), 3),
    d.amount_method!,
    d.amount_method === 'derived' ? (n(d, 'step') / n(d, 'noise')).toFixed(0) : '—'
  ])
);

const lotRows = dividends.filter((d) => d.source === 'lot');

out.lotDividends = table(
  [
    'Ex-date',
    'Lot entered',
    'Entitled shares',
    'Receivable',
    'Paid',
    'Reinvest price',
    'DRIP shares (strategy inventory)'
  ],
  lotRows.map((d) => [
    d.ex_date!,
    d.lot_entry_date!,
    Number(d.eligible_shares).toFixed(3),
    usd(n(d, 'receivable')),
    d.reinvest_date!,
    d.reinvest_price ? Number(d.reinvest_price).toFixed(2) : '',
    d.new_shares ? Number(d.new_shares).toFixed(4) : ''
  ])
);

// Correlation of the strategy with the core: daily change of (integrated − core) against the core return.
const pairs = daily.slice(1).map((r, i) => ({
  held: n(daily[i], 'lot_shares') > 0,
  core: n(r, 'core_nav') / n(daily[i], 'core_nav') - 1,
  strategy: (n(r, 'nav_minus_core') - n(daily[i], 'nav_minus_core')) / n(daily[i], 'nav')
}));
const correlation = (list: typeof pairs) => {
  const mx = list.reduce((t, p) => t + p.core, 0) / list.length;
  const my = list.reduce((t, p) => t + p.strategy, 0) / list.length;
  const sxy = list.reduce((t, p) => t + (p.core - mx) * (p.strategy - my), 0);
  const sxx = list.reduce((t, p) => t + (p.core - mx) ** 2, 0);
  const syy = list.reduce((t, p) => t + (p.strategy - my) ** 2, 0);

  return { correlation: sxy / Math.sqrt(sxx * syy), beta: sxy / sxx, days: list.length };
};
const allDays = correlation(pairs);
const heldDays = correlation(pairs.filter((p) => p.held));

out.correlation = table(
  ['Sessions', 'Days', 'Correlation with the core portfolio', 'Beta (strategy % of NAV per 1% core move)'],
  [
    ['All', allDays.days, allDays.correlation.toFixed(3), allDays.beta.toFixed(3)],
    ['With a lot open', heldDays.days, heldDays.correlation.toFixed(3), heldDays.beta.toFixed(3)]
  ]
);

await fs.writeFile(`${results}/tables.json`, `${JSON.stringify(out, null, 1)}\n`);
await fs.writeFile(
  `${results}/tables.md`,
  Object.entries(out)
    .map(([name, md]) => `## ${name}\n\n${md}\n`)
    .join('\n')
);
console.info(`Wrote ${Object.keys(out).length} tables`);
