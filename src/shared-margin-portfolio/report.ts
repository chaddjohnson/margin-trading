// Markdown tables rendered from the result files (never from re-runs), so that every number in the reports is
// traceable to a CSV/JSON under results/. `npm run shared-margin -- report` writes results/tables/*.md.
import path from 'node:path';
import fs from 'fs-extra';

type Row = Record<string, string>;

export const readCsv = async (file: string): Promise<Row[]> => {
  const text = await fs.readFile(file, 'utf8');
  const lines = text.trim().split('\n');
  const header = splitCsv(lines[0]!);

  return lines.slice(1).map((line) => {
    const values = splitCsv(line);

    return Object.fromEntries(header.map((column, index) => [column, values[index] ?? '']));
  });
};

const splitCsv = (line: string) => {
  const values: string[] = [];
  let current = '';
  let quoted = false;

  for (let index = 0; index < line.length; index++) {
    const char = line[index]!;

    if (quoted) {
      if (char === '"' && line[index + 1] === '"') {
        current += '"';
        index++;
      } else if (char === '"') {
        quoted = false;
      } else {
        current += char;
      }
    } else if (char === '"') {
      quoted = true;
    } else if (char === ',') {
      values.push(current);
      current = '';
    } else {
      current += char;
    }
  }

  values.push(current);

  return values;
};

export const dollars = (value: number | string, digits = 0) => {
  const n = Number(value);

  if (!Number.isFinite(n)) {
    return 'n/a';
  }

  const text = Math.abs(n).toLocaleString('en-US', { minimumFractionDigits: digits, maximumFractionDigits: digits });

  return `${n < 0 ? '−' : ''}$${text}`;
};

export const signed = (value: number | string, digits = 0) => {
  const n = Number(value);

  if (!Number.isFinite(n)) {
    return 'n/a';
  }

  const text = Math.abs(n).toLocaleString('en-US', { minimumFractionDigits: digits, maximumFractionDigits: digits });

  return `${n < 0 ? '−' : '+'}$${text}`;
};

export const percent = (value: number | string, digits = 1) => {
  const n = Number(value);

  return Number.isFinite(n) ? `${(100 * n).toFixed(digits)}%` : 'n/a';
};

export const num = (value: number | string, digits = 2) => {
  const n = Number(value);

  return Number.isFinite(n) ? n.toFixed(digits) : 'n/a';
};

export const table = (header: string[], rows: string[][], align: ('l' | 'r')[] = []) => {
  const separator = header.map((_, index) => (align[index] === 'r' ? '---:' : '---'));

  return [
    `| ${header.join(' | ')} |`,
    `| ${separator.join(' | ')} |`,
    ...rows.map((row) => `| ${row.join(' | ')} |`)
  ].join('\n');
};

const day = (iso: string) => iso.slice(0, 10);
const minute = (iso: string) => (iso ? `${iso.slice(0, 10)} ${iso.slice(11, 16)}Z` : '');

export const renderTables = async (root: string) => {
  const out = path.join(root, 'tables');
  const summaries = (await readCsv(path.join(root, 'scenario_summary.csv'))) as Row[];
  const byKey = new Map(summaries.map((row) => [row.scenario!, row]));
  const annual = await readCsv(path.join(root, 'annual_portfolio.csv'));
  const a = byKey.get('A');
  const files: Record<string, string> = {};

  // 1. Scenario comparison.
  const comparison = (keys: string[]) =>
    table(
      [
        'Scenario',
        'End equity',
        'vs A',
        'CAGR',
        'Daily max DD',
        'Minute max DD',
        'Strategy net',
        'Trades (D1/swing)',
        'Interest',
        'Min equity/LMV',
        'Max LMV/equity',
        'Turnover'
      ],
      keys
        .map((key) => byKey.get(key))
        .filter((row): row is Row => Boolean(row))
        .map((row) => [
          `${row.scenario} — ${row.label!.replace(/^[A-Z0-9-]+ — /, '')}`,
          dollars(row.end_equity!),
          a
            ? `${signed(Number(row.end_equity) - Number(a.end_equity))} (${percent(Number(row.end_equity) / Number(a.end_equity) - 1)})`
            : 'n/a',
          percent(row.cagr!, 2),
          `${dollars(row.daily_max_drawdown!)} (${percent(row.daily_max_drawdown_percent!)}) ${row.daily_drawdown_peak}→${row.daily_drawdown_trough}`,
          `${dollars(row.minute_max_drawdown!)} (${percent(row.minute_max_drawdown_percent!)})`,
          `${signed(row.strategy_net!)} (${signed(row.strategy_realized!)} realized)`,
          `${row.strategy_trades} (${row.trades_d1}/${row.trades_swing})${Number(row.strategy_open_at_end) ? ', 1 open' : ''}`,
          dollars(row.strategy_interest!),
          `${percent(row.min_equity_to_lmv_daily!)} (${row.min_equity_to_lmv_daily_date})`,
          `${num(row.max_gross_exposure!, 3)}×`,
          dollars(row.core_turnover!)
        ]),
      ['l', 'r', 'r', 'r', 'r', 'r', 'r', 'r', 'r', 'r', 'r', 'r']
    );

  files['scenario_comparison.md'] =
    `# Scenario comparison (from results/scenario_summary.csv)\n\n## Principal scenarios\n\n${comparison(['A', 'B', 'B2', 'B3', 'S', 'P1', 'P2', 'P2c', 'P2s', 'P3', 'P4', 'P5-T1', 'P5-T2a', 'P5-T2b', 'P5-T1-B2'])}\n\n## Core-policy sensitivities and controls\n\n${comparison(['B', 'B-rebalance', 'B-noreinvest', 'B-fixed100k', 'B-whole'])}\n\n## Deployment sensitivities\n\n${comparison(['A', 'B-f10', 'B-f15', 'B', 'B-f25', 'B-r08', 'B-r14', 'B2-r08', 'B2-r14', 'B-cost2', 'B-cost5', 'B-cost10', 'B-cost25', 'B-nextopen', 'B-nextopen-slip10', 'B-nextopen-slip50', 'B2-nextopen', 'B-m25', 'B-m35', 'B-m50'])}\n`;

  // 2. Strategy statistics.
  files['strategy_statistics.md'] = `# Strategy statistics by scenario\n\n${table(
    [
      'Scenario',
      'Trades',
      'W/L',
      'Realized',
      'Unrealized (open)',
      'Net',
      'Interest',
      'Best',
      'Worst',
      'Worst adverse excursion',
      'Strategy DD daily / minute',
      'Exposure',
      'Borrowing $-days',
      'Avg / max principal',
      'Signals granted / declined setups / takeovers / displacements'
    ],
    summaries.map((row) => [
      row.scenario!,
      `${row.strategy_trades} (${row.strategy_closed} closed)`,
      `${row.strategy_wins}/${row.strategy_losses}`,
      signed(row.strategy_realized!),
      signed(row.strategy_unrealized!),
      signed(row.strategy_net!),
      dollars(row.strategy_interest!),
      signed(row.strategy_best_trade!),
      signed(row.strategy_worst_trade!),
      signed(row.strategy_worst_adverse_excursion!),
      `${dollars(row.strategy_daily_drawdown!)} / ${dollars(row.strategy_minute_drawdown!)}`,
      percent(row.strategy_exposure!),
      dollars(Number(row.borrowing_dollar_days!) / 1e6, 2).replace('$', '$') + 'M',
      `${dollars(row.average_principal!)} / ${dollars(row.max_principal!)}`,
      `${row.signals_granted} / ${row.signals_declined_setups} / ${row.signals_takeover} / ${row.signals_displace}`
    ]),
    ['l', 'r', 'r', 'r', 'r', 'r', 'r', 'r', 'r', 'r', 'r', 'r', 'r', 'r', 'r']
  )}\n`;

  // 3. Year by year.
  const yearTable = (keys: string[]) => {
    const years = [...new Set(annual.map((row) => row.year!))].sort();

    return table(
      ['Year', ...keys],
      years.map((year) => [
        year,
        ...keys.map((key) => {
          const row = annual.find((candidate) => candidate.scenario === key && candidate.year === year);

          return row ? `${dollars(row.equity!)} (${percent(row.annual_return!)})` : '';
        })
      ]),
      ['l', ...keys.map(() => 'r' as const)]
    );
  };
  const detail = (key: string) =>
    table(
      [
        'Year',
        'Equity',
        'Return',
        'Core VOOG',
        'Core VGT',
        'Lot MTM',
        'Debt (principal)',
        'Accrued interest',
        'Cum. interest',
        'Strategy realized (year)',
        'Strategy unrealized',
        'Cum. dividends',
        'Cash',
        'Receivables',
        'Entries/exits',
        'Max DD in year',
        'Min equity/LMV'
      ],
      annual
        .filter((row) => row.scenario === key)
        .map((row) => [
          `${row.year} (${row.end_date})`,
          dollars(row.equity!),
          percent(row.annual_return!),
          dollars(row.core_voog_value!),
          dollars(row.core_vgt_value!),
          dollars(row.lot_value!),
          dollars(row.outstanding_principal!),
          dollars(row.accrued_interest!),
          dollars(row.cumulative_interest!),
          signed(row.strategy_realized_in_year!),
          signed(row.strategy_unrealized!),
          dollars(row.cumulative_dividends!),
          dollars(row.cash!),
          dollars(row.receivables!),
          `${row.entries_in_year}/${row.exits_in_year}`,
          dollars(row.max_drawdown_in_year!),
          percent(row.min_equity_to_lmv!)
        ]),
      ['l', 'r', 'r', 'r', 'r', 'r', 'r', 'r', 'r', 'r', 'r', 'r', 'r', 'r', 'r', 'r', 'r']
    );

  files['annual.md'] =
    `# Year by year (from results/annual_portfolio.csv)\n\nYear-end equity and the year's return. 2016 runs from the 2016-01-04 close; 2025 ends 2025-10-13. No strategy may trade before 2017-06-15.\n\n## Equity by scenario\n\n${yearTable(['A', 'B', 'B2', 'B3', 'S', 'P2', 'P3', 'P4', 'P5-T1', 'P5-T2a'])}\n\n## A — buy and hold\n\n${detail('A')}\n\n## B — D1 only\n\n${detail('B')}\n\n## B2 — gross-breakeven D1\n\n${detail('B2')}\n\n## B3 — D1 with P 8.6%\n\n${detail('B3')}\n\n## P5-T1 — D1 takeover (T1)\n\n${detail('P5-T1')}\n\n## P2 — first signal wins\n\n${detail('P2')}\n`;

  // 4. Trades of B.
  const tradesOf = async (key: string) => readCsv(path.join(root, 'scenarios', key, 'trades.csv'));
  const tradeTable = (rows: Row[], withTakeover = false) =>
    table(
      [
        '#',
        'Owner',
        'Setup',
        'Entry',
        'Price',
        'Principal (% equity)',
        'Exit',
        'Price',
        'Reason',
        'Days',
        'Interest',
        'Net',
        'Return',
        'Adverse excursion',
        ...(withTakeover ? ['Takeover'] : [])
      ],
      rows.map((row) => [
        row.lot!,
        row.original_owner === row.owner ? row.owner! : `${row.original_owner}→${row.owner}`,
        row.setup_kind!,
        `${row.entry_date} ${row.entry_time!.slice(11, 16)}Z`,
        num(row.entry_price!),
        `${dollars(row.principal!)} (${percent(row.fraction_of_equity!)})`,
        row.exit_date || 'open',
        num(row.exit_price!),
        row.exit_reason!,
        String(Math.round(Number(row.hold_days))),
        dollars(row.interest!),
        signed(row.net_profit!),
        percent(row.return_on_principal!),
        signed(row.adverse_excursion!),
        ...(withTakeover
          ? [
              row.takeover_date
                ? `${row.takeover_date} ${row.takeover_transfer}: net at decision ${signed(row.takeover_net_at_decision!)}, stop ${num(row.takeover_stop_before!)}→${num(row.takeover_stop_after!)}`
                : ''
            ]
          : [])
      ]),
      ['r', 'l', 'l', 'l', 'r', 'r', 'l', 'r', 'l', 'r', 'r', 'r', 'r', 'r', ...(withTakeover ? ['l' as const] : [])]
    );

  files['trades_B.md'] =
    `# Scenario B trades (from results/scenarios/B/trades.csv)\n\n${tradeTable(await tradesOf('B'))}\n`;
  files['trades_S.md'] =
    `# Scenario S trades (from results/scenarios/S/trades.csv)\n\n${tradeTable(await tradesOf('S'))}\n`;

  for (const key of ['P1', 'P2', 'P3', 'P4', 'P5-T1', 'P5-T2a', 'P5-T2b']) {
    if (await fs.pathExists(path.join(root, 'scenarios', key, 'trades.csv'))) {
      files[`trades_${key}.md`] =
        `# Scenario ${key} trades (from results/scenarios/${key}/trades.csv)\n\n${tradeTable(await tradesOf(key), key.startsWith('P5'))}\n`;
    }
  }

  // 4b. Trade attribution of every shared scenario against B (D1 alone) and S (swing alone).
  const bTrades = await tradesOf('B');
  const sTrades = (await fs.pathExists(path.join(root, 'scenarios', 'S', 'trades.csv'))) ? await tradesOf('S') : [];
  const attributionRows: string[][] = [];

  for (const key of ['P1', 'P2', 'P2c', 'P2s', 'P3', 'P4', 'P5-T1', 'P5-T2a', 'P5-T2b', 'P5-T1-B2']) {
    if (!(await fs.pathExists(path.join(root, 'scenarios', key, 'trades.csv')))) {
      continue;
    }

    const trades = await tradesOf(key);
    const same = (x: Row, y: Row) => x.entry_date === y.entry_date && x.entry_time === y.entry_time;
    const sameExit = (x: Row, y: Row) =>
      x.exit_date === y.exit_date && x.exit_time === y.exit_time && x.exit_reason === y.exit_reason;
    const categories: Record<string, { count: number; net: number; refNet: number; lots: string[] }> = {};
    const add = (category: string, net: number, refNet: number, label: string) => {
      const entry = (categories[category] ??= { count: 0, net: 0, refNet: 0, lots: [] });

      entry.count++;
      entry.net += net;
      entry.refNet += refNet;
      entry.lots.push(label);
    };

    for (const b of bTrades) {
      const match = trades.find((trade) => same(trade, b) && trade.original_owner !== 'swing');

      if (!match) {
        add('D1 trade displaced (not taken)', 0, Number(b.net_profit), `${b.entry_date} ${signed(b.net_profit!)}`);
      } else if (sameExit(match, b)) {
        add(
          'D1 trade preserved (same entry and exit)',
          Number(match.net_profit),
          Number(b.net_profit),
          `${b.entry_date}`
        );
      } else {
        add(
          'D1 trade altered (same entry, different exit)',
          Number(match.net_profit),
          Number(b.net_profit),
          `${b.entry_date} ${match.exit_date} ${match.exit_reason} ${signed(match.net_profit!)} vs ${b.exit_date} ${signed(b.net_profit!)}`
        );
      }
    }

    for (const trade of trades) {
      const inB = bTrades.some((b) => same(trade, b)) && trade.original_owner !== 'swing';

      if (inB) {
        continue;
      }

      if (trade.original_owner === 'swing') {
        const s = sTrades.find((candidate) => same(candidate, trade));

        if (trade.takeover_date) {
          add(
            'swing lot taken over by D1',
            Number(trade.net_profit),
            s ? Number(s.net_profit) : NaN,
            `${trade.entry_date}→${trade.takeover_date} ${signed(trade.net_profit!)}${s ? ` (S alone ${signed(s.net_profit!)})` : ''}`
          );
        } else if (s && sameExit(s, trade)) {
          add('swing trade as in S', Number(trade.net_profit), Number(s.net_profit), `${trade.entry_date}`);
        } else {
          add(
            'swing trade not in S or altered',
            Number(trade.net_profit),
            s ? Number(s.net_profit) : NaN,
            `${trade.entry_date} ${trade.exit_date} ${trade.exit_reason} ${signed(trade.net_profit!)}`
          );
        }
      } else {
        add(
          'D1 trade not in B (different entry)',
          Number(trade.net_profit),
          NaN,
          `${trade.entry_date} ${trade.exit_date || 'open'} ${trade.exit_reason} ${signed(trade.net_profit!)}`
        );
      }
    }

    for (const [category, entry] of Object.entries(categories)) {
      attributionRows.push([
        key,
        category,
        String(entry.count),
        signed(entry.net),
        Number.isFinite(entry.refNet) ? signed(entry.refNet) : 'n/a',
        entry.lots.join('; ')
      ]);
    }
  }

  files['attribution.md'] =
    `# Trade attribution of the shared scenarios against B and S (from results/scenarios/*/trades.csv)\n\nNets are the scenario's actual dollars (dynamic sizing); the reference net is the same trade's dollars in B (for D1 trades) or S (for swing trades), also dynamically sized in their own scenario, so the two columns are comparable only in sign and order of magnitude.\n\n${table(['Scenario', 'Category', 'Trades', 'Net in scenario', 'Reference net (B or S)', 'Trades'], attributionRows, ['l', 'l', 'r', 'r', 'r', 'l'])}\n`;

  // 5. Overlap chronology.
  if (await fs.pathExists(path.join(root, 'position_overlaps.csv'))) {
    const overlaps = await readCsv(path.join(root, 'position_overlaps.csv'));

    files['overlap_chronology.md'] =
      `# Overlap chronology (from results/position_overlaps.csv)\n\nEvery pair of standalone D1 and swing-low positions whose minute intervals overlap, in time order. Nets are per $100,000 standalone lot. "T1/T2" is the first entrant's lot managed by the second strategy's exit rules from the second's decision minute (no new principal).\n\n${table(
        [
          '#',
          'First',
          'First entry → exit (reason, net)',
          'Second',
          'Second entry → exit (reason, net)',
          'Overlap',
          'First lot net at second signal',
          'Joint mark min / max',
          'T1 exit (reason, net)',
          'T2 exit (reason, net)'
        ],
        overlaps.map((row) => [
          row.pair!,
          row.first!,
          `${minute(row.first_entry!)} @${num(row.first_entry_price!)} → ${row.first_exit === 'open' ? 'open' : `${minute(row.first_exit!)} @${num(row.first_exit_price!)}`} (${row.first_reason}, ${signed(row.first_net_100k!)})`,
          row.second!,
          `${minute(row.second_entry!)} @${num(row.second_entry_price!)} → ${row.second_exit === 'open' ? 'open' : `${minute(row.second_exit!)} @${num(row.second_exit_price!)}`} (${row.second_reason}, ${signed(row.second_net_100k!)})`,
          `${row.overlap_minutes} min, ${row.overlap_sessions} sessions`,
          signed(row.first_net_at_second_entry!),
          `${signed(row.joint_mark_min!)} / ${signed(row.joint_mark_max!)}`,
          `${row.transfer_T1_exit} @${num(row.transfer_T1_price!)} (${row.transfer_T1_reason}, ${signed(row.transfer_T1_net!)})`,
          `${row.transfer_T2_exit} @${num(row.transfer_T2_price!)} (${row.transfer_T2_reason}, ${signed(row.transfer_T2_net!)})`
        ]),
        ['r', 'l', 'l', 'l', 'l', 'l', 'r', 'r', 'l', 'l']
      )}\n`;
  }

  // 6. Competing signals under the shared pool (P2): distinct declined setups.
  if (await fs.pathExists(path.join(root, 'scenarios', 'P2', 'signals.csv'))) {
    const minutesFile = path.join(root, 'scenarios', 'P2', 'signals_minutes.csv');
    const signals = await readCsv(
      (await fs.pathExists(minutesFile)) ? minutesFile : path.join(root, 'scenarios', 'P2', 'signals.csv')
    );
    const declined = new Map<string, Row[]>();

    for (const row of signals.filter(
      (candidate) => candidate.outcome === 'declined' || candidate.outcome === 'reg-t'
    )) {
      const key = `${row.strategy}:${row.setupId}`;

      declined.set(key, [...(declined.get(key) ?? []), row]);
    }

    const granted = signals.filter((row) => row.outcome === 'granted');

    files['competing_signals_P2.md'] =
      `# Competing signals under P2, first signal wins (from results/scenarios/P2/signals.csv)\n\nOne row per setup that was refused capital at least once (hold semantics re-tests the rebound every later minute; the count of refused minutes is shown). "Later filled" is whether the same setup eventually filled once the pool was free.\n\n${table(
        [
          'Strategy',
          'Setup',
          'Kind',
          'First refused',
          'Price',
          'Pool held by',
          'Holder net at first refusal',
          'Refused minutes',
          'Last refused',
          'Later filled'
        ],
        [...declined.entries()].map(([, rows]) => {
          const first = rows[0]!;
          const last = rows.at(-1)!;
          const filled = granted.find((row) => row.strategy === first.strategy && row.setupId === first.setupId);

          return [
            first.strategy!,
            first.setupId!,
            first.setupKind!,
            minute(first.decisionTime!),
            num(first.decisionPrice!),
            first.otherLotOwner!,
            signed(first.otherLotProfit!),
            String(rows.length === 1 && first.refusedMinutes ? Number(first.refusedMinutes) : rows.length),
            minute(rows.length === 1 && first.lastRefusedTime ? first.lastRefusedTime : last.decisionTime!),
            filled ? `${minute(filled.decisionTime!)} @${num(filled.decisionPrice!)}` : 'no'
          ];
        }),
        ['l', 'r', 'l', 'l', 'r', 'l', 'r', 'r', 'l', 'l']
      )}\n`;
  }

  // 7. Stress tables.
  const stressDir = path.join(root, 'stress');

  if (await fs.pathExists(path.join(stressDir, 'stress_gaps.csv'))) {
    const gaps = await readCsv(path.join(stressDir, 'stress_gaps.csv'));
    const groups = new Map<string, Row[]>();

    for (const row of gaps) {
      const key = `${row.scenario}|${row.shock_case}|${row.gap}|${row.voog_fall}`;

      groups.set(key, [...(groups.get(key) ?? []), row]);
    }

    const worst = (rows: Row[], column: string, pick: 'min' | 'max') =>
      rows.reduce(
        (best, row) => (pick === 'max' ? Math.max(best, Number(row[column])) : Math.min(best, Number(row[column]))),
        pick === 'max' ? -Infinity : Infinity
      );

    files['stress_gaps_summary.md'] =
      `# Gap-through-stop summary (from results/stress/stress_gaps.csv)\n\nFor every lot of the scenario, VGT gaps down at the open of the named session and the lot is replayed under its frozen exit rules on the shifted path; VOOG falls ρ × gap. Portfolio figures use the ledger at the previous close. Breaches are of equity ÷ LMV against 25% / 35% / 50%.\n\n${table(
        [
          'Scenario',
          'Case',
          'Gap',
          'VOOG fall',
          'Lots',
          'Worst equity loss',
          'Worst equity loss %',
          'Worst lot net (shocked)',
          'Worst lot loss % of equity',
          'Lowest equity/LMV',
          'Breaches 25/35/50',
          'Largest sale to restore 50%'
        ],
        [...groups.entries()].map(([, rows]) => [
          rows[0]!.scenario!,
          rows[0]!.shock_case!,
          percent(rows[0]!.gap!, 0),
          percent(rows[0]!.voog_fall!, 0),
          String(rows.length),
          dollars(worst(rows, 'equity_loss', 'max')),
          percent(worst(rows, 'equity_loss_percent', 'max')),
          signed(worst(rows, 'lot_net_shocked', 'min')),
          percent(worst(rows, 'lot_loss_percent_of_pre_shock_equity', 'max')),
          percent(worst(rows, 'equity_to_lmv_after_gap', 'min')),
          `${rows.filter((row) => row.breach_25 === 'true').length}/${rows.filter((row) => row.breach_35 === 'true').length}/${rows.filter((row) => row.breach_50 === 'true').length}`,
          dollars(worst(rows, 'sale_to_restore_50', 'max'))
        ]),
        ['l', 'l', 'r', 'r', 'r', 'r', 'r', 'r', 'r', 'r', 'r', 'r']
      )}\n`;

    const worstRows = [...gaps].sort((x, y) => Number(x.lot_net_shocked) - Number(y.lot_net_shocked)).slice(0, 25);

    files['stress_gaps_worst.md'] =
      `# The 25 worst gap outcomes by lot net (from results/stress/stress_gaps.csv)\n\n${table(
        [
          'Scenario',
          'Lot',
          'Entry',
          'Case',
          'Shock date',
          'Stop active?',
          'Gap',
          'VOOG fall',
          'Pre-shock equity',
          'Equity after gap',
          'Equity/LMV after',
          'Lot exit',
          'Reason',
          'Lot net shocked',
          'Lot net historical'
        ],
        worstRows.map((row) => [
          row.scenario!,
          row.lot!,
          `${row.entry_date} @${num(row.entry_price!)}`,
          row.shock_case!,
          row.shock_date!,
          row.stop_active_before_shock!,
          percent(row.gap!, 0),
          percent(row.voog_fall!, 0),
          dollars(row.pre_shock_equity!),
          dollars(row.equity_after_gap!),
          percent(row.equity_to_lmv_after_gap!),
          `${row.lot_exit_date} @${num(row.lot_exit_price!)}`,
          row.lot_exit_reason!,
          signed(row.lot_net_shocked!),
          signed(row.lot_net_historical!)
        ]),
        ['l', 'r', 'l', 'l', 'l', 'l', 'r', 'r', 'r', 'r', 'r', 'l', 'l', 'r', 'r']
      )}\n`;
  }

  if (await fs.pathExists(path.join(stressDir, 'stress_correlated.csv'))) {
    const rows = await readCsv(path.join(stressDir, 'stress_correlated.csv'));

    files['stress_correlated.md'] =
      `# Correlated stress from the balance sheet (from results/stress/stress_correlated.csv)\n\nUniform falls in both ETFs from the named session's close. "Fall to reach m" is the one-day uniform decline that takes equity ÷ LMV down to m. Sales are the forced liquidation that restores m + 5 points after a 30% fall.\n\n${table(
        [
          'Scenario',
          'Date',
          'Context',
          'Equity',
          'LMV',
          'Debt',
          'Equity/LMV',
          'Fall to 25% / 35% / 50%',
          'Equity after −20% / −30% / −40% / −50%',
          'Equity/LMV after −30% / −50%',
          'Sale after −30% for 35% / 50%'
        ],
        rows.map((row) => [
          row.scenario!,
          row.date!,
          row.context!,
          dollars(row.equity!),
          dollars(row.lmv!),
          dollars(row.debt!),
          percent(row.equity_to_lmv!),
          `${percent(row.fall_to_reach_25!)} / ${percent(row.fall_to_reach_35!)} / ${percent(row.fall_to_reach_50!)}`,
          `${dollars(row.equity_after_20!)} / ${dollars(row.equity_after_30!)} / ${dollars(row.equity_after_40!)} / ${dollars(row.equity_after_50!)}`,
          `${percent(row.ratio_after_30!)} / ${percent(row.ratio_after_50!)}`,
          `${dollars(row.sale_after_30_for_35!)} / ${dollars(row.sale_after_30_for_50!)}`
        ]),
        ['l', 'l', 'l', 'r', 'r', 'r', 'r', 'r', 'r', 'r', 'r']
      )}\n`;
  }

  if (await fs.pathExists(path.join(stressDir, 'stress_interest.csv'))) {
    const rows = await readCsv(path.join(stressDir, 'stress_interest.csv'));

    files['stress_interest.md'] =
      `# Interest: financing versus exit timing (from results/stress/stress_interest.csv)\n\n${table(
        [
          'Scenario',
          'From rate',
          'To rate',
          'Net at from-rate',
          'Financing-only net (same trades, recomputed interest)',
          'Actual net at to-rate',
          'Financing effect',
          'Timing effect',
          'Trades from → to',
          'Exits changed'
        ],
        rows.map((row) => [
          row.scenario!,
          percent(row.from_rate!, 0),
          percent(row.to_rate!, 0),
          signed(row.net_at_from_rate!),
          signed(row.financing_only_net!),
          signed(row.actual_net_at_to_rate!),
          signed(row.financing_effect!),
          signed(row.timing_effect!),
          `${row.trades_from} → ${row.trades_to}`,
          row.changed_exits!
        ]),
        ['l', 'r', 'r', 'r', 'r', 'r', 'r', 'r', 'r', 'r']
      )}\n`;
  }

  if (await fs.pathExists(path.join(stressDir, 'stress_full_path.csv'))) {
    const rows = await readCsv(path.join(stressDir, 'stress_full_path.csv'));

    files['stress_full_path.md'] =
      `# Full-path shock re-runs (from results/stress/stress_full_path.csv)\n\nThe whole VGT and VOOG series are multiplied by (1 − gap) from the shock session onwards and scenario B is re-run with forced liquidation below the maintenance requirement. Later signals and sizes change with the shifted path.\n\n${table(
        [
          'Run',
          'Shock date',
          'Gap',
          'Maintenance',
          'Shocked lot',
          'Lot exit (reason, net)',
          'Forced sales',
          'End equity',
          'vs B',
          'Daily max DD',
          'Min equity/LMV',
          'Trades',
          'Strategy net'
        ],
        rows.map((row) => [
          row.key!,
          row.shock_date!,
          percent(row.gap!, 0),
          percent(row.maintenance!, 0),
          row.lot_entry!,
          `${row.lot_exit} (${row.lot_exit_reason}, ${signed(row.lot_net!)})`,
          row.forced_sales!,
          dollars(row.end_equity!),
          signed(row.end_equity_vs_B!),
          `${dollars(row.daily_max_drawdown!)} (${percent(row.daily_max_drawdown_percent!)})`,
          percent(row.min_equity_to_lmv!),
          row.trades!,
          signed(row.strategy_net!)
        ]),
        ['l', 'l', 'r', 'r', 'l', 'l', 'r', 'r', 'r', 'r', 'r', 'r', 'r']
      )}\n`;
  }

  // 8. Takeovers.
  for (const key of ['P5-T1', 'P5-T2a', 'P5-T2b', 'P5-T1-B2']) {
    const file = path.join(root, 'scenarios', key, 'takeovers.csv');

    if (await fs.pathExists(file)) {
      const rows = await readCsv(file);
      const trades = await tradesOf(key);

      files[`takeovers_${key}.md`] =
        `# Takeovers in ${key} (from results/scenarios/${key}/takeovers.csv and trades.csv)\n\n${table(
          [
            'Date',
            'Minute',
            'Transfer',
            'From',
            'Lot net at decision',
            'High before',
            'Stop before → after',
            'Lot entry',
            'Lot exit (reason)',
            'Lot net'
          ],
          rows.map((row) => {
            const lot = trades.find(
              (trade) =>
                trade.takeover_date === row.date &&
                trade.takeover_time!.startsWith(new Date(Number(row.time) * 1000).toISOString().slice(0, 16))
            );

            return [
              row.date!,
              new Date(Number(row.time) * 1000).toISOString().slice(11, 16) + 'Z',
              row.transfer!,
              row.fromOwner!,
              signed(row.profitAtTakeover!),
              num(row.highBefore!),
              `${num(row.stopBefore!)} → ${num(row.stopAfter!)}`,
              lot ? `${lot.entry_date} @${num(lot.entry_price!)} (${dollars(lot.principal!)})` : '',
              lot ? `${lot.exit_date || 'open'} @${num(lot.exit_price!)} (${lot.exit_reason})` : '',
              lot ? signed(lot.net_profit!) : ''
            ];
          }),
          ['l', 'l', 'l', 'l', 'r', 'r', 'r', 'l', 'l', 'r']
        )}\n`;
    }
  }

  await fs.ensureDir(out);

  for (const [name, text] of Object.entries(files)) {
    await fs.writeFile(path.join(out, name), text);
  }

  return Object.keys(files);
};

export const describeDay = day;
