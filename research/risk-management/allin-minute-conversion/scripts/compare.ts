// Compares the runs in a results directory and prints Markdown tables:
// - A: the original daily implementation on the original (split- and dividend-adjusted) daily file;
// - B: the original daily implementation on sessions aggregated from the raw minute file;
// - M: the minute implementation; M2: the minute implementation with next-open stop fills.
// All four cover the same sessions. B and M share prices, so B -> M isolates the execution changes and
// A -> B the change of data source.
// Usage: node --experimental-transform-types scripts/compare.ts <results dir>
import fs from 'fs-extra';

const [, , resultsDir = ''] = process.argv;

type Row = Record<string, string>;

const readCsv = async (file: string): Promise<Row[]> => {
  const [header, ...rows] = (await fs.readFile(file, 'utf8')).trim().split('\n');
  const keys = header!.split(',');

  return rows.map((row) => Object.fromEntries(row.split(',').map((value, index) => [keys[index]!, value])));
};

const load = async (name: string) => ({
  name,
  trades: await readCsv(`${resultsDir}/${name}/trades.csv`),
  daily: await readCsv(`${resultsDir}/${name}/daily.csv`),
  states: await readCsv(`${resultsDir}/${name}/states.csv`),
  episodes: await readCsv(`${resultsDir}/${name}/episodes.csv`),
  summary: JSON.parse(await fs.readFile(`${resultsDir}/${name}/summary.json`, 'utf8'))
});

const runs = {
  A: await load('original-daily-common'),
  B: await load('original-aggregated-common'),
  M: await load('minute-common'),
  M2: await load('minute-common-next-open')
};
type Run = (typeof runs)['A'];

const dollars = (value: number) =>
  `${value < 0 ? '−' : ''}$${Math.abs(value).toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
const signedDollars = (value: number) => (value > 0 ? `+${dollars(value)}` : dollars(value));
const percent = (value: number, digits = 2) => `${value < 0 ? '−' : ''}${Math.abs(value * 100).toFixed(digits)}%`;
const bps = (value: number) => `${(value * 10000).toFixed(1)}`;
const days = (from: string, to: string) => (Date.parse(to) - Date.parse(from)) / 86400000;
const table = (header: string[], rows: (string | number)[][]) =>
  [
    `| ${header.join(' | ')} |`,
    `|${header.map(() => '---').join('|')}|`,
    ...rows.map((r) => `| ${r.join(' | ')} |`)
  ].join('\n');
const etTime = (iso: string) => {
  if (!iso) {
    return '';
  }

  const t = Date.parse(iso);
  const local = new Date(t).toLocaleString('en-US', {
    timeZone: 'America/New_York',
    hourCycle: 'h23',
    hour: '2-digit',
    minute: '2-digit'
  });

  return local;
};
const closed = (run: Run) => run.trades.filter((t) => t.reason !== 'open');
const out: string[] = [];

// Headline metrics.
const metrics = (run: Run) => {
  const s = run.summary;
  const wins = closed(run).filter((t) => Number(t.profit) > 0).length;
  const holds = closed(run).map((t) => days(t.entry_date!, t.exit_date!));

  return [
    dollars(s.netProfit),
    dollars(s.realizedProfit),
    dollars(s.unrealizedProfit),
    dollars(s.marginInterest),
    dollars(s.maximumDrawdown),
    s.minuteMaximumDrawdown === undefined ? 'n/a' : dollars(s.minuteMaximumDrawdown),
    `${closed(run).length}${s.openAtEnd ? ' + 1 open' : ''}`,
    `${wins} / ${closed(run).length - wins}`,
    (holds.reduce((a, b) => a + b, 0) / holds.length).toFixed(1),
    `${s.restrictions} (${s.lowerPriceReentries} / ${s.recoveryResets})`
  ];
};

out.push(
  `## Headline metrics, ${runs.M.summary.firstDate} to ${runs.M.summary.lastDate} (${runs.M.summary.sessions} sessions)\n`
);
out.push(
  table(
    [
      'Run',
      'Net profit',
      'Realized',
      'Unrealized',
      'Margin interest',
      'Max DD (daily)',
      'Max DD (minute)',
      'Trades',
      'Wins / losses',
      'Avg hold (days)',
      'Restrictions (re-entries / resets)'
    ],
    [
      ['A: original, daily file', ...metrics(runs.A)],
      ['B: original, minute sessions', ...metrics(runs.B)],
      ['M: minute implementation', ...metrics(runs.M)],
      ['M2: minute, next-open stop fills', ...metrics(runs.M2)]
    ]
  )
);
out.push(
  `\nDrawdown windows: A ${runs.A.summary.drawdownPeakDate} → ${runs.A.summary.drawdownTroughDate}; B ${runs.B.summary.drawdownPeakDate} → ${runs.B.summary.drawdownTroughDate}; M ${runs.M.summary.drawdownPeakDate} → ${runs.M.summary.drawdownTroughDate} (minute: ${runs.M.summary.minuteDrawdownPeakTime} → ${runs.M.summary.minuteDrawdownTroughTime}).\n`
);

// Exit reasons.
const reasons = ['trailing stop', 'trailing stop gap', 'maximum hold'];

out.push('## Exit reasons\n');
out.push(
  table(
    ['Run', ...reasons],
    Object.entries(runs).map(([key, run]) => [
      key,
      ...reasons.map((r) => closed(run).filter((t) => t.reason === r).length)
    ])
  )
);

// Entry prices against the session's official close (raw prices).
const entryGaps = runs.M.trades.map((t) => Number(t.entry_price) / Number(t.entry_session_close) - 1);
const decisionGaps = runs.M.trades.map((t) => Number(t.decision_price) / Number(t.entry_session_close) - 1);
const absMean = (values: number[]) => values.reduce((a, b) => a + Math.abs(b), 0) / values.length;
const mean = (values: number[]) => values.reduce((a, b) => a + b, 0) / values.length;
const sortedAbs = (values: number[]) => values.map(Math.abs).sort((a, b) => a - b);

out.push('\n## Minute entry prices against the official close of the same session\n');
out.push(
  table(
    ['Measure', 'Fill (15:59 open) vs close, bps', 'Decision price (15:58 close) vs close, bps'],
    [
      ['Mean (signed)', bps(mean(entryGaps)), bps(mean(decisionGaps))],
      ['Mean absolute', bps(absMean(entryGaps)), bps(absMean(decisionGaps))],
      [
        'Median absolute',
        bps(sortedAbs(entryGaps)[Math.floor(entryGaps.length / 2)]!),
        bps(sortedAbs(decisionGaps)[Math.floor(decisionGaps.length / 2)]!)
      ],
      ['Largest absolute', bps(Math.max(...entryGaps.map(Math.abs))), bps(Math.max(...decisionGaps.map(Math.abs)))],
      ['Fills above the close', `${entryGaps.filter((g) => g > 0).length} of ${entryGaps.length}`, ''],
      ['Fills below the close', `${entryGaps.filter((g) => g < 0).length} of ${entryGaps.length}`, '']
    ]
  )
);

// Session-level context from M's daily rows, which B shares: the close-based and decision-based signals.
const mDaily = new Map(runs.M.daily.map((row) => [row.date!, row]));
const closeSignal = (date: string) => {
  const row = mDaily.get(date)!;

  return 1 - Number(row.close) / Number(row.recent_high);
};
const decisionSignal = (date: string) => {
  const row = mDaily.get(date)!;

  return 1 - Number(row.decision_price) / Number(row.recent_high);
};
const stateOn = (run: Run, date: string) =>
  run.states
    .filter((s) => s.date === date)
    .map((s) => s.reason)
    .join('+');

// Trade-by-trade comparison of a reference run with M.
const compareTrades = (reference: Run, label: string) => {
  const byEntry = new Map(reference.trades.map((t) => [t.entry_date!, t]));
  const mByEntry = new Map(runs.M.trades.map((t) => [t.entry_date!, t]));
  const allDates = [...new Set([...byEntry.keys(), ...mByEntry.keys()])].sort();
  const rows: string[][] = [];
  const attribution = {
    entry: 0,
    exit: 0,
    interest: 0,
    // Exit-price effects on trades with the same entry and exit dates, by M's exit reason.
    exitByReason: {} as Record<string, number>,
    movedExit: 0,
    exitTimingTrades: 0,
    onlyReference: 0,
    onlyMinute: 0
  };
  const exitTiming: string[] = [];

  for (const date of allDates) {
    const r = byEntry.get(date);
    const m = mByEntry.get(date);
    const rReturn = r ? Number(r.exit_price) / Number(r.entry_price) - 1 : NaN;
    const mReturn = m ? Number(m.exit_price) / Number(m.entry_price) - 1 : NaN;
    let category: string;

    if (r && m) {
      const sameExit = r.exit_date === m.exit_date;

      category = sameExit
        ? 'same entry and exit dates'
        : `exit moved ${r.exit_date || 'open'} → ${m.exit_date || 'open'}`;

      // Exact decomposition: profit = investment × exit / entry − investment − interest.
      const eR = Number(r.entry_price);
      const eM = Number(m.entry_price);
      const xR = Number(r.exit_price);
      const xM = Number(m.exit_price);
      const entryEffect = 100000 * xR * (1 / eM - 1 / eR);
      const exitEffect = (100000 * (xM - xR)) / eM;
      const interestEffect = Number(r.interest) - Number(m.interest);

      if (label === 'B' && sameExit) {
        const reason = m.reason === 'open' ? 'open at end (marked at the same close)' : m.reason!;

        attribution.entry += entryEffect;
        attribution.exit += exitEffect;
        attribution.interest += interestEffect;
        attribution.exitByReason[reason] = (attribution.exitByReason[reason] ?? 0) + exitEffect;
      }

      if (label === 'B' && !sameExit) {
        attribution.movedExit += Number(m.profit) - Number(r.profit);
        attribution.exitTimingTrades++;
        exitTiming.push(
          `${date}: ${r.reason} ${r.exit_date || 'open'} → ${m.reason} ${m.exit_date || 'open'} (${signedDollars(Number(m.profit) - Number(r.profit))})`
        );
      }
    } else if (r) {
      category = `only in ${label}: decision ${percent(decisionSignal(date))} vs close ${percent(closeSignal(date))} below the high; M ${mDaily.get(date)!.borrowed !== '0' ? 'held a position' : stateOn(runs.M, date) || 'flat'}`;
      attribution.onlyReference += Number(r.profit);
    } else {
      category = `only in M: decision ${percent(decisionSignal(date))} vs close ${percent(closeSignal(date))} below the high; ${label} ${label === 'B' ? (runs.B.daily.find((d) => d.date === date)!.borrowed !== '0' ? 'held a position' : stateOn(runs.B, date) || 'flat') : ''}`;
      attribution.onlyMinute += Number(m!.profit);
    }

    rows.push([
      date,
      r ? `${r.exit_date || 'open'} ${r.reason}` : '—',
      m ? `${m.exit_date || 'open'} ${etTime(m.exit_time!)} ${m.reason}` : '—',
      r ? percent(rReturn) : '—',
      m ? percent(mReturn) : '—',
      r ? dollars(Number(r.profit)) : '—',
      m ? dollars(Number(m.profit)) : '—',
      r && m ? signedDollars(Number(m.profit) - Number(r.profit)) : '',
      category
    ]);
  }

  return { rows, attribution, exitTiming };
};

const ab = compareTrades(runs.A, 'A');
const bm = compareTrades(runs.B, 'B');
const header = (label: string) => [
  'Entry date',
  `${label} exit`,
  'M exit (ET)',
  `${label} price return`,
  'M price return',
  `${label} profit`,
  'M profit',
  'Δ profit',
  'Category'
];

out.push(`\n## Trade by trade: A (original daily file) against M\n`);
out.push(table(header('A'), ab.rows));
out.push(`\n## Trade by trade: B (original on minute sessions) against M\n`);
out.push(table(header('B'), bm.rows));

// Attribution of B → M.
const netB = runs.B.summary.netProfit;
const netM = runs.M.summary.netProfit;
const a = bm.attribution;

out.push('\n## Attribution of the B → M profit change (same prices, execution only)\n');
out.push(
  table(
    ['Component', 'Effect'],
    [
      ['Same entry and exit dates: entry prices (15:59 fill vs close)', signedDollars(a.entry)],
      ...Object.entries(a.exitByReason).map(([reason, value]) => [
        `Same entry and exit dates: exit prices, ${reason}`,
        signedDollars(value)
      ]),
      ['Same entry and exit dates: interest', signedDollars(a.interest)],
      [
        `Same entry date, different exit date (${a.exitTimingTrades} trade, whole profit change)`,
        signedDollars(a.movedExit)
      ],
      ['Trades only in M (sequence)', signedDollars(a.onlyMinute)],
      ['Trades only in B (sequence)', signedDollars(-a.onlyReference)],
      ['Total', signedDollars(a.entry + a.exit + a.interest + a.movedExit + a.onlyMinute - a.onlyReference)],
      ['Check: M − B net profit', signedDollars(netM - netB)]
    ]
  )
);

if (bm.exitTiming.length) {
  out.push('\nTrades whose exit date changed (B → M):\n');
  out.push(bm.exitTiming.map((line) => `- ${line}`).join('\n'));
}

// Every minute trade with its execution details. The open position is marked at the last close.
out.push('\n## Minute trades (M)\n');
out.push(
  table(
    [
      'Entry (ET)',
      'Decision price',
      'Entry fill',
      'Session close',
      'Exit (ET)',
      'Reason',
      'Exit price source',
      'Stop',
      'Exit price',
      'M2 exit price',
      'Hold (calendar days)',
      'Profit'
    ],
    runs.M.trades.map((t) => {
      const m2 = runs.M2.trades.find((x) => x.entry_date === t.entry_date && x.exit_date === t.exit_date);
      const isOpen = t.reason === 'open';

      return [
        `${t.entry_date} ${etTime(t.entry_time!)}`,
        Number(t.decision_price).toFixed(2),
        Number(t.entry_price).toFixed(2),
        Number(t.entry_session_close).toFixed(2),
        isOpen ? `open, marked ${runs.M.summary.lastDate}` : `${t.exit_date} ${etTime(t.exit_time!)}`,
        t.reason!,
        isOpen ? 'last close' : t.exit_execution!,
        isOpen ? '' : Number(t.exit_stop_price).toFixed(2),
        Number(t.exit_price).toFixed(2),
        isOpen ? '' : m2 ? Number(m2.exit_price).toFixed(2) : 'differs',
        days(t.entry_date!, t.exit_date || runs.M.summary.lastDate),
        dollars(Number(t.profit))
      ];
    })
  )
);

// Restriction episodes.
out.push('\n## Re-entry restriction episodes\n');
out.push(
  table(
    ['Run', 'Episodes (exit date → resolution, date)'],
    Object.entries(runs).map(([key, run]) => [
      key,
      run.episodes.map((e) => `${e.exit_date} → ${e.resolution.replaceAll('_', ' ')} ${e.resolution_date}`).join('; ')
    ])
  )
);

// Profit by calendar year of the exit (the open position counted in its marking year).
const byYear = (run: Run) => {
  const result: Record<string, number> = {};

  for (const t of run.trades) {
    const year = (t.exit_date || run.summary.lastDate).slice(0, 4);

    result[year] = (result[year] ?? 0) + Number(t.profit);
  }

  return result;
};
const years = [...new Set(Object.values(runs).flatMap((run) => Object.keys(byYear(run))))].sort();

out.push('\n## Profit by exit year (open position in 2025)\n');
out.push(
  table(
    ['Year', 'A', 'B', 'M', 'M − B', 'M − A'],
    years.map((year) => {
      const values = [byYear(runs.A)[year] ?? 0, byYear(runs.B)[year] ?? 0, byYear(runs.M)[year] ?? 0];

      return [
        year,
        ...values.map(dollars),
        signedDollars(values[2]! - values[1]!),
        signedDollars(values[2]! - values[0]!)
      ];
    })
  )
);

// Daily mark-to-market drawdown by calendar year.
const drawdownByYear = (run: Run) => {
  let peak = 0;
  const result: Record<string, number> = {};

  for (const row of run.daily) {
    const value = Number(row.mtm_pnl);

    peak = Math.max(peak, value);
    result[row.date!.slice(0, 4)] = Math.max(result[row.date!.slice(0, 4)] ?? 0, peak - value);
  }

  return result;
};

out.push('\n## Largest daily mark-to-market drawdown from the running peak, on sessions in each year\n');
out.push(
  table(
    ['Year', 'A', 'B', 'M'],
    years.map((year) => [year, ...[runs.A, runs.B, runs.M].map((run) => dollars(drawdownByYear(run)[year] ?? 0))])
  )
);

console.info(out.join('\n'));
