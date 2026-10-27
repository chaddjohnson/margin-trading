// Every placeholder of the report templates, computed from results/analysis.json (and the baseline record): tables as
// Markdown, single figures as formatted strings. Names are `t.<table>` and `v.<value>`. Nothing here runs a strategy.
import fs from 'fs-extra';
import { d1Keys } from '../multi-etf-allocator/phenotypes.ts';
import {
  base,
  costScenarios,
  gates,
  poolIds,
  protocolSha256,
  regimeWindows,
  researchRoot,
  resultDir,
  shortNames
} from './context.ts';
import { cents, dollars, flag, grid, integer, percent, points, ratio, signed, signedPercent, table } from './format.ts';
import { loadFrozenPools, oatPoints } from './specs.ts';
import { parseCsv } from './store.ts';

type Json = any;

const n = (value: unknown) => (typeof value === 'number' ? value : Number(value));

export const placeholdersOf = async (analysis: Json): Promise<Record<string, string>> => {
  const v: Record<string, string> = {};
  const A = analysis.A;
  const B = analysis.B;
  const C = analysis.C;
  const D = analysis.D;
  const E = analysis.E;
  const F = analysis.F;
  const G = analysis.gates;
  const baseline = JSON.parse(await fs.readFile(resultDir('baseline', 'baseline.json'), 'utf8'));
  const manifest = JSON.parse(await fs.readFile(`${researchRoot}/MANIFEST.json`, 'utf8'));
  const pools = await loadFrozenPools();
  const fRow = (id: string) => F.rows.find((row: Json) => row.id === id);
  const costRow = (pool: string, id: string) => D.rows.find((row: Json) => row.pool === pool && row.scenario === id);

  // ---------- general ----------
  v['v.protocolSha'] = protocolSha256;
  v['v.head'] = manifest.git.head;
  v['v.runs'] = integer(analysis.runs.stored);
  v['v.analysisGenerated'] = analysis.generatedAt;
  v['v.window'] = `${base.first} → ${base.end} (${base.sessions} sessions; books arm from ${base.firstEligibleDate})`;

  // ---------- baseline ----------
  const checks = baseline.checks as { name: string; pass: boolean; detail: string }[];

  v['v.baselineChecks'] = `${checks.filter((check) => check.pass).length}/${checks.length}`;
  v['v.baselineSeconds'] = String(baseline.seconds);
  v['t.baselineChecks'] = table(
    ['Check', 'Result', 'Detail'],
    checks.map((check) => [check.name, check.pass ? 'PASS' : '**FAIL**', check.detail.replaceAll('|', '/')]),
    ['l', 'l', 'l']
  );

  const anchorRows: (string | number)[][] = [];

  for (const pool of poolIds) {
    const fixed = A[pool].baseline.fixed;
    const portfolio = A[pool].baseline.portfolio;
    const anchor = {
      B4: [284244.74, 28659.34, 76, 3608484.05, 0.3465],
      B5: [486207.77, 26509.97, 94, 5410976.72, 0.2967]
    }[pool]!;

    anchorRows.push(
      [
        pool,
        'fixed net',
        cents(anchor[0]!),
        cents(fixed.net),
        Math.round(fixed.net * 100) / 100 === anchor[0] ? 'to the cent' : '**differs**'
      ],
      [
        pool,
        'fixed max minute DD',
        cents(anchor[1]!),
        cents(fixed.minuteDD),
        Math.round(fixed.minuteDD * 100) / 100 === anchor[1] ? 'to the cent' : '**differs**'
      ],
      [pool, 'funded lots', String(anchor[2]), String(fixed.lots), fixed.lots === anchor[2] ? 'exact' : '**differs**'],
      [
        pool,
        'portfolio end equity',
        cents(anchor[3]!),
        cents(portfolio.endEquity),
        Math.round(portfolio.endEquity * 100) / 100 === anchor[3] ? 'to the cent' : '**differs**'
      ],
      [
        pool,
        'portfolio max daily % DD',
        percent(anchor[4]!, 2),
        percent(portfolio.dailyPercent, 4),
        Math.round(portfolio.dailyPercent * 10000) / 10000 === anchor[4] ? 'to 0.01 pp' : '**differs**'
      ]
    );
  }

  v['t.anchors'] = table(['Pool', 'Measure', 'Reference (brief / pool config)', 'Reproduced', 'Match'], anchorRows, [
    'l',
    'l',
    'r',
    'r',
    'l'
  ]);

  const fixedTable = (pools_: string[]) =>
    table(
      ['Measure (fixed $100k pool, 5 bps, 11%)', ...pools_],
      [
        ['Net margin P&L', ...pools_.map((pool) => cents(A[pool].baseline.fixed.net))],
        ['Gross P&L before costs', ...pools_.map((pool) => cents(A[pool].baseline.fixed.gross))],
        ['Margin interest', ...pools_.map((pool) => cents(A[pool].baseline.fixed.interest))],
        ['Execution friction (5 bps/side)', ...pools_.map((pool) => cents(A[pool].baseline.fixed.friction))],
        [
          'Funded lots (wins / losses)',
          ...pools_.map(
            (pool) =>
              `${A[pool].baseline.fixed.lots} (${A[pool].baseline.fixed.wins} / ${A[pool].baseline.fixed.losses})`
          )
        ],
        ['Realized losses (sum of losing lots)', ...pools_.map((pool) => cents(A[pool].baseline.fixed.realizedLosses))],
        ['Worst lot', ...pools_.map((pool) => cents(A[pool].baseline.fixed.worstLot))],
        ['Profit factor (lot nets)', ...pools_.map((pool) => ratio(A[pool].baseline.fixed.profitFactor))],
        [
          'Max minute-sampled DD ($ / % of $100k)',
          ...pools_.map(
            (pool) =>
              `${cents(A[pool].baseline.fixed.minuteDD)} / ${percent(A[pool].baseline.fixed.minuteDD / base.notional, 2)}`
          )
        ],
        ['Max daily-close DD', ...pools_.map((pool) => cents(A[pool].baseline.fixed.dailyDD))],
        [
          'Time with a funded lot (sessions from arming)',
          ...pools_.map((pool) => percent(A[pool].baseline.fixed.exposure))
        ],
        ['Lot-days', ...pools_.map((pool) => integer(A[pool].baseline.fixed.lotDays))],
        ['Net ÷ max minute DD', ...pools_.map((pool) => ratio(A[pool].baseline.fixed.netPerMinuteDD))],
        [
          'Net per $1M borrowing dollar-days',
          ...pools_.map((pool) => cents(A[pool].baseline.fixed.netPerMillionDollarDays))
        ]
      ]
    );

  v['t.baselineFixed'] = fixedTable(['B4', 'B5']);

  const portfolioRow = (row: Json) => [
    row.id,
    cents(row.endEquity),
    percent(row.cagr, 2),
    row.id.startsWith('C0') ? '—' : signed(row.incrementalOverC0),
    `${percent(row.dailyPercent, 2)} (${row.dailyPercentPeak} → ${row.dailyPercentTrough}; recovered ${row.dailyPercentRecovery})`,
    `${percent(row.minutePercent, 2)} (${row.minutePercentPeak.slice(0, 10)})`,
    dollars(row.largestDailyDollarDD),
    dollars(row.largestMinuteDollarDD)
  ];

  v['t.baselinePortfolio'] = table(
    [
      'Run ($300k, 60/40 core, 20% borrowing)',
      'End equity',
      'CAGR',
      'vs C0',
      'Max daily-close % DD (running peak)',
      'Max minute % DD',
      'Largest daily $ DD',
      'Largest minute $ DD'
    ],
    ['C0', 'B4', 'B5', 'B4 symmetric dividends', 'B5 symmetric dividends'].map((id) => portfolioRow(fRow(id))),
    ['l', 'r', 'r', 'r', 'l', 'l', 'r', 'r']
  );

  // ---------- A: parameter stability ----------
  const distanceRows: (string | number)[][] = [];

  for (const pool of ['B5'] as const) {
    for (const book of manifest.neighbourhoods[pool]) {
      for (const parameter of book.parameters) {
        const unit = (x: number) => grid(parameter.key, x);
        const sm = (x: number) =>
          ['maximumHoldDays', 'tickWindowSize', 'continuationWindow'].includes(parameter.key)
            ? `±${x}`
            : `±${(x / 10).toFixed(1)} pp`;

        distanceRows.push([
          book.symbol,
          `${parameter.short} (${parameter.key})`,
          unit(parameter.frozen),
          sm(parameter.small),
          sm(parameter.moderate),
          `${unit(parameter.jointRange[0])} – ${unit(parameter.jointRange[1])}${parameter.truncated ? ' (truncated by the grid)' : ''}`,
          parameter.rule
        ]);
      }
    }
  }

  v['t.distances'] = table(
    ['Book', 'Parameter', 'Frozen', 'Small', 'Moderate', 'Joint range (legal values)', 'Rule'],
    distanceRows,
    ['l', 'l', 'r', 'r', 'r', 'l', 'l']
  );

  // OAT above/equal counts from the CSV (exact counts).
  const oatRows = parseCsv(await fs.readFile(resultDir('A_oat.csv'), 'utf8'));

  for (const pool of poolIds) {
    const baseNet = A[pool].baseline.fixed.net;
    const run = oatRows.filter((row) => row.pool === pool && row.status === 'run');
    const above = run.filter((row) => n(row.fixedNet) > baseNet + 0.005).length;
    const equal = run.filter((row) => Math.abs(n(row.fixedNet) - baseNet) <= 0.005).length;

    v[`v.oatAbove.${pool}`] = `${above} / ${equal}`;
    v[`v.oatDaily30.${pool}`] = String(run.filter((row) => n(row.portfolioDailyPercent) > 0.3).length);
    v[`v.oatDaily35.${pool}`] = String(run.filter((row) => n(row.portfolioDailyPercent) > 0.35).length);
    v[`v.oatRun.${pool}`] = String(run.length);
  }

  v['t.oatSummary'] = table(
    [
      'Pool',
      'OAT points',
      'Run',
      'Infeasible (not run)',
      'Boundary probes',
      'Profitable',
      'Median net (÷ frozen)',
      'P10 net',
      'Worst net (÷ frozen)',
      'Above frozen / equal',
      'Lot set changed'
    ],
    poolIds.map((pool) => {
      const o = A[pool].oat;
      const baseNet = A[pool].baseline.fixed.net;

      return [
        pool,
        o.points,
        o.feasible,
        o.infeasible,
        o.boundary,
        percent(o.shareProfitable, 0),
        `${dollars(o.fixedNet.median)} (${percent(o.fixedNet.median / baseNet, 0)})`,
        dollars(o.fixedNet.p10),
        `${dollars(o.fixedNet.min)} (${percent(o.fixedNet.min / baseNet, 0)})`,
        v[`v.oatAbove.${pool}`]!,
        percent(o.shareLotSetChanged, 0)
      ];
    })
  );

  for (const pool of poolIds) {
    const baseNet = A[pool].baseline.fixed.net;

    v[`t.tornado.${pool}`] = table(
      [
        'Rank',
        'Book',
        'Parameter',
        'Frozen',
        'Points',
        'Lowest net (Δ)',
        'Highest net (Δ)',
        'Swing',
        'Portfolio end range'
      ],
      A[pool].tornado
        .slice(0, 15)
        .map((row: Json, index: number) => [
          index + 1,
          row.symbol,
          row.short,
          grid(row.parameter, row.frozen),
          row.feasiblePoints,
          `${dollars(row.minNet)} (${signedPercent(row.minNet / baseNet - 1)})`,
          `${dollars(row.maxNet)} (${signedPercent(row.maxNet / baseNet - 1)})`,
          dollars(row.swing),
          `${dollars(row.minEnd)} – ${dollars(row.maxEnd)}`
        ])
    );

    // The full OAT grid of a pool: one row per book × parameter, the four points' fixed nets.
    const fullRows: (string | number)[][] = [];

    for (const book of pools[pool].books) {
      for (const key of d1Keys) {
        const cells = ['-m', '-s', '+s', '+m'].map((offset) => {
          const row = oatRows.find(
            (item) =>
              item.pool === pool && item.symbol === book.symbol && item.parameter === key && item.offset === offset
          )!;

          if (row.status === 'infeasible') {
            return `${grid(key, n(row.value))}: infeasible`;
          }

          return `${grid(key, n(row.value))}: ${dollars(n(row.fixedNet))}${row.status === 'run' ? '' : ' (probe)'}`;
        });

        fullRows.push([book.symbol, shortNames[key], grid(key, book.grid[key]), ...cells]);
      }
    }

    v[`t.oatFull.${pool}`] = table(['Book', 'Param', 'Frozen', '−m', '−s', '+s', '+m'], fullRows, [
      'l',
      'l',
      'r',
      'r',
      'r',
      'r',
      'r'
    ]);
  }

  const designLabel = (design: string) =>
    design === 'joint-s1'
      ? 'joint, all books (seed 1, primary)'
      : design === 'joint-s2'
        ? 'joint, all books (seed 2)'
        : `one book: ${design.slice(5)}`;
  const neighbourhoodRows: (string | number)[][] = [];
  const neighbourhoodRiskRows: (string | number)[][] = [];

  for (const pool of poolIds) {
    for (const [design, d] of Object.entries(A[pool].designs) as [string, Json][]) {
      neighbourhoodRows.push([
        pool,
        designLabel(design),
        d.n,
        dollars(d.fixedNet.median),
        percent(d.medianNetRatio, 0),
        `${dollars(d.fixedNet.p10)} – ${dollars(d.fixedNet.p90)}`,
        dollars(d.fixedNet.min),
        percent(d.shareProfitable, 0),
        percent(d.shareAtLeastHalfBaseline, 0),
        percent(d.shareAboveBaseline, 0),
        percent(d.baselineNetPercentile, 0),
        dollars(d.fixedMinuteDD.median),
        ratio(d.fixedNetPerMinuteDD.median)
      ]);
      neighbourhoodRiskRows.push([
        pool,
        designLabel(design),
        dollars(d.portfolioEnd.median),
        `${dollars(d.portfolioEnd.p10)} – ${dollars(d.portfolioEnd.p90)}`,
        dollars(d.portfolioEnd.min),
        percent(d.shareIncrementalPositive, 0),
        percent(d.baselineEndPercentile, 0),
        `${percent(d.portfolioDailyPercent.median)} (${percent(d.portfolioDailyPercent.min)} – ${percent(d.portfolioDailyPercent.max)})`,
        percent(d.shareDaily30, 0),
        percent(d.shareDaily35, 0),
        percent(d.portfolioMinutePercent.median),
        percent(d.shareMinute35, 0)
      ]);
    }
  }

  v['t.neighbourhoods'] = table(
    [
      'Pool',
      'Design',
      'n',
      'Median net',
      'Median ÷ frozen',
      'P10 – P90 net',
      'Worst net',
      'Net > 0',
      'Net ≥ ½ frozen',
      'Net > frozen',
      'Frozen percentile',
      'Median minute DD',
      'Median net ÷ DD'
    ],
    neighbourhoodRows,
    ['l', 'l', 'r', 'r', 'r', 'r', 'r', 'r', 'r', 'r', 'r', 'r', 'r']
  );
  v['t.neighbourhoodRisk'] = table(
    [
      'Pool',
      'Design',
      'Median end equity',
      'P10 – P90',
      'Worst',
      'Beats C0',
      'Frozen percentile',
      'Median daily % DD (range)',
      'Daily > 30%',
      'Daily > 35%',
      'Median minute % DD',
      'Minute > 35%'
    ],
    neighbourhoodRiskRows,
    ['l', 'l', 'r', 'r', 'r', 'r', 'r', 'r', 'r', 'r', 'r', 'r']
  );

  const boundaryRows = oatRows
    .filter((row) => (row.status ?? '').startsWith('boundary'))
    .map((row) => [
      String(row.pool),
      String(row.symbol),
      String(row.short),
      `${grid(row.parameter!, n(row.frozen))} → ${grid(row.parameter!, n(row.value))}`,
      dollars(n(row.fixedNet)),
      signed(n(row.fixedNetChange)),
      dollars(n(row.portfolioEnd)),
      percent(n(row.portfolioDailyPercent), 2)
    ]);

  v['t.boundary'] = table(
    ['Pool', 'Book', 'Param', 'Value (outside the grid)', 'Fixed net', 'Δ vs frozen', 'Portfolio end', 'Daily % DD'],
    boundaryRows
  );
  v['t.infeasible'] = table(
    ['Pool', 'Book', 'Param', 'Point', 'Value', 'Reason'],
    oatRows
      .filter((row) => row.status === 'infeasible')
      .map((row) => [
        String(row.pool),
        String(row.symbol),
        String(row.short),
        String(row.offset),
        grid(row.parameter!, n(row.value)),
        String(row.reason)
      ]),
    ['l', 'l', 'l', 'l', 'r', 'l']
  );

  for (const pool of poolIds) {
    const a = G[pool].A;

    v[`v.gateA.${pool}`] =
      `${percent(a.shareProfitable, 0)} profitable, median ${percent(a.medianNetRatio, 1)} of frozen → ${flag(a.flag)}`;
    v[`v.jointMedian.${pool}`] = dollars(A[pool].designs['joint-s1'].fixedNet.median);
    v[`v.jointMedianRatio.${pool}`] = percent(A[pool].designs['joint-s1'].medianNetRatio, 0);
    v[`v.jointMedianRatio2.${pool}`] = percent(A[pool].designs['joint-s2'].medianNetRatio, 0);
    v[`v.jointWorst.${pool}`] = dollars(
      Math.min(A[pool].designs['joint-s1'].fixedNet.min, A[pool].designs['joint-s2'].fixedNet.min)
    );
    v[`v.jointDailyMedian.${pool}`] = percent(A[pool].designs['joint-s1'].portfolioDailyPercent.median);
    v[`v.jointDaily35.${pool}`] = percent(A[pool].designs['joint-s1'].shareDaily35, 0);
    v[`v.jointDaily35s2.${pool}`] = percent(A[pool].designs['joint-s2'].shareDaily35, 0);
    v[`v.jointEndMedian.${pool}`] = dollars(A[pool].designs['joint-s1'].portfolioEnd.median);
  }

  // ---------- B: years and regimes ----------
  const years = parseCsv(await fs.readFile(resultDir('B_yearly.csv'), 'utf8'));

  for (const pool of poolIds) {
    v[`t.years.${pool}`] = table(
      [
        'Year',
        'Status',
        'Fixed MTM change',
        'Share of total',
        'Interest accrued',
        'Lots entered',
        'Realized (by exit year)',
        'Open at year end',
        'Deepest fixed daily DD in year',
        'Portfolio return',
        'C0 return',
        'Δ incremental wealth vs C0',
        'Deepest portfolio % DD in year'
      ],
      years
        .filter((row) => row.pool === pool)
        .map((row) => [
          row.year!,
          row.label!,
          dollars(n(row.fixedChange)),
          percent(n(row.fixedChange) / B[pool].totalFixed),
          dollars(n(row.interest)),
          row.lotsEntered!,
          dollars(n(row.realizedByExitYear)),
          row.openOwnerAtYearEnd || '—',
          dollars(n(row.deepestFixedDailyDD)),
          percent(n(row.portfolioReturn)),
          percent(n(row.c0Return)),
          signed(n(row.incrementalChange)),
          percent(n(row.deepestPortfolioDailyPercent))
        ]),
      ['l', 'l', 'r', 'r', 'r', 'r', 'r', 'l', 'r', 'r', 'r', 'r', 'r']
    );
    v[`v.top1Year.${pool}`] = `${B[pool].top1Year} (${percent(B[pool].top1Share)})`;
    v[`v.top2Years.${pool}`] = `${B[pool].top2Years.join(' + ')} (${percent(B[pool].top2Share)})`;
    v[`v.negativeYears.${pool}`] = B[pool].negativeYears.length ? B[pool].negativeYears.join(', ') : 'none';
  }

  v['t.loyo'] = table(
    [
      'Year removed (attribution only)',
      'B4 total without the year',
      'B4 ÷ full',
      'B5 total without the year',
      'B5 ÷ full',
      'B5 − B4 without the year'
    ],
    B.B4.loyo.map((row: Json, index: number) => {
      const b5 = B.B5.loyo[index];

      return [
        row.year,
        dollars(row.withoutYear),
        percent(row.withoutYearRatio),
        dollars(b5.withoutYear),
        percent(b5.withoutYearRatio),
        dollars(b5.withoutYear - row.withoutYear)
      ];
    })
  );
  v['t.yearDiff'] = table(
    ['Year', 'B5 − B4 fixed MTM', 'Share of the total difference', 'B5 − B4 portfolio equity change'],
    B.difference.byYear.map((row: Json) => [
      row.year,
      signed(row.fixedDifference),
      percent(row.fixedDifference / B.difference.total),
      signed(row.portfolioDifference)
    ])
  );
  v['v.diffTotal'] = dollars(B.difference.total);
  v['v.diffLargestYear'] =
    `${B.difference.largestYear.year} (${dollars(B.difference.largestYear.fixedDifference)}, ${percent(B.difference.largestYearShare)})`;
  v['v.diffLargestRegime'] = percent(B.difference.largestRegimeShare);
  v['t.regimeDiff'] = table(
    ['Regime (stress + rebound)', 'B5 − B4 fixed MTM', 'Share of the total difference'],
    B.difference.byRegime.map((row: Json) => [
      row.regime,
      signed(row.fixedDifference),
      percent(row.fixedDifference / B.difference.total)
    ])
  );
  v['t.regimes'] = table(
    [
      'Window',
      'Dates (close → close)',
      'B4 fixed',
      'B5 fixed',
      'B5 − B4',
      'B4 / B5 interest',
      'B4 / B5 lots entered',
      'B4 / B5 lot-days',
      'Worst MAE B4 / B5',
      'Portfolio B4',
      'Portfolio B5',
      'C0'
    ],
    B.regimes.map((row: Json) => [
      row.label,
      `${row.from} → ${row.to}`,
      signed(row['B4.fixedChange']),
      signed(row['B5.fixedChange']),
      signed(row['B5-B4.fixedChange']),
      `${dollars(row['B4.interest'])} / ${dollars(row['B5.interest'])}`,
      `${row['B4.lotsEntered']} / ${row['B5.lotsEntered']}`,
      `${integer(row['B4.lotDays'])} / ${integer(row['B5.lotDays'])}`,
      `${percent(row['B4.worstMaePercent'])} / ${percent(row['B5.worstMaePercent'])}`,
      signedPercent(row['B4.portfolioReturn']),
      signedPercent(row['B5.portfolioReturn']),
      signedPercent(row['C0.portfolioReturn'])
    ]),
    ['l', 'l', 'r', 'r', 'r', 'r', 'r', 'r', 'r', 'r', 'r', 'r']
  );

  const bootRow = (label: string, b: Json) => [
    label,
    dollars(b.actual),
    dollars(b.median),
    `${dollars(b.p05)} – ${dollars(b.p95)}`,
    `${dollars(b.p25)} – ${dollars(b.p75)}`,
    percent(b.shareNonPositive, 2)
  ];

  v['t.bootstrap'] = table(
    [
      'Series (fixed pool, daily MTM changes)',
      'Actual total',
      'Resampled median',
      '5th – 95th pct',
      '25th – 75th pct',
      'Resamples ≤ 0'
    ],
    [bootRow('B4', B.bootstrap.B4), bootRow('B5', B.bootstrap.B5), bootRow('B5 − B4 (paired)', B.bootstrap.difference)]
  );
  v['v.bootstrapSessions'] = integer(B.bootstrap.sessions);

  // ---------- C: books ----------
  v['t.ablationFixed'] = table(
    [
      'Pool',
      'Removed',
      'Fixed net',
      'Book increment (parent − ablated)',
      "Removed book's own lots / net",
      'Other books: lots gained / net',
      'Other books: lots lost / net',
      'Max minute DD',
      'DD change from the book',
      'Time with lot'
    ],
    C.ablations.map((row: Json) => [
      row.pool,
      row.removed,
      dollars(row.fixedNet),
      signed(row.bookIncrementalFixed),
      `${row.removedBookLots} / ${dollars(row.removedBookOwnNet)}`,
      `${row.othersGainedLots} / ${dollars(row.othersGainedNet)}`,
      `${row.othersLostLots} / ${dollars(row.othersLostNet)}`,
      dollars(row.fixedMinuteDD),
      signed(row.bookMinuteDDImpact),
      percent(row.fixedExposure)
    ])
  );
  v['t.ablationPortfolio'] = table(
    [
      'Pool',
      'Removed',
      'End equity',
      'Book increment to end equity',
      'Max daily % DD',
      'Book effect on daily % DD',
      'Max minute % DD',
      'Book effect on minute % DD',
      'Ablated pool vs C0'
    ],
    C.ablations.map((row: Json) => [
      row.pool,
      row.removed,
      dollars(row.portfolioEnd),
      signed(row.bookIncrementalPortfolio),
      percent(row.portfolioDailyPercent, 2),
      points(row.bookDailyPercentImpact),
      percent(row.portfolioMinutePercent, 2),
      points(row.bookMinutePercentImpact),
      signed(row.portfolioIncrementalOverC0)
    ])
  );
  v['v.b5MinusGdx'] =
    C.b5MinusGdxEqualsB4.fixed && C.b5MinusGdxEqualsB4.portfolio
      ? `identical to B4 in every stored figure, in both modes (fixed net ${cents(C.b5MinusGdxEqualsB4.fixedNet[0])} = ${cents(C.b5MinusGdxEqualsB4.fixedNet[1])}; portfolio end ${cents(C.b5MinusGdxEqualsB4.portfolioEnd[0])} = ${cents(C.b5MinusGdxEqualsB4.portfolioEnd[1])})`
      : '**NOT identical to B4**';

  const bridge = C.bridge;

  v['t.bridgeSummary'] = table(
    ['Component (fixed pool)', 'Lots', 'Contribution to B5 − B4'],
    [
      ['GDX lots (only B5 can take them)', bridge.gdxLots, signed(bridge.gdxNet)],
      [
        'Other books’ lots only B5 funded (enabled by GDX occupying the slot)',
        bridge.otherOnlyB5Lots,
        signed(bridge.otherOnlyB5Net)
      ],
      ['Lots only B4 funded (displaced in B5)', bridge.onlyB4Lots, signed(bridge.onlyB4Net)],
      ['Lots both funded (identical in fixed mode)', bridge.bothLots, signed(bridge.bothNet)],
      ['**Total = B5 − B4 fixed net**', '', `**${signed(bridge.total)}**`]
    ],
    ['l', 'r', 'r']
  );
  v['v.bridgeResidual'] = bridge.residual.toExponential(2);
  v['v.gdxLots'] = String(bridge.gdxLots);
  v['v.gdxWins'] = String(bridge.gdxWins);
  v['v.gdxNet'] = dollars(bridge.gdxNet);
  v['v.gdxTop1'] = percent(bridge.gdxTop1Share);
  v['v.gdxTop3'] = percent(bridge.gdxTop3Share);
  v['v.gdxTop5'] = percent(bridge.gdxTop5Share);
  v['t.bridgeByYear'] = table(
    ['Exit year', 'GDX lots', 'Other only-B5 lots', 'Only-B4 lots (negative = B4 gain lost)', 'Total'],
    bridge.byYear
      .filter((row: Json) => Math.abs(row.total) > 0.005 || Math.abs(row.gdx) > 0.005)
      .map((row: Json) => [row.year, signed(row.gdx), signed(row.otherOnlyB5), signed(row.onlyB4), signed(row.total)])
  );
  v['t.bridgeByRegime'] = table(
    ['Regime of the lot entry', 'Total contribution', 'Of which GDX lots'],
    bridge.byRegime.map((row: Json) => [row.regime, signed(row.total), signed(row.gdx)])
  );

  const bridgeRows = [...bridge.rows].sort((a: Json, b: Json) => Math.abs(b.contribution) - Math.abs(a.contribution));

  v['t.bridgeTop'] = table(
    ['#', 'Kind', 'Book', 'Entry', 'Exit', 'Exit reason', 'Regime', 'Lot net', 'Contribution'],
    bridgeRows
      .slice(0, 20)
      .map((row: Json, index: number) => [
        index + 1,
        row.kind,
        row.symbol,
        row.entryDate,
        row.exitDate,
        row.exitReason,
        row.regime,
        signed(row.net),
        signed(row.contribution)
      ]),
    ['r', 'l', 'l', 'l', 'l', 'l', 'l', 'r', 'r']
  );
  v['t.gdxLots'] = table(
    ['#', 'Entry', 'Exit', 'Exit reason', 'Regime', 'Net'],
    bridge.rows
      .filter((row: Json) => row.kind === 'only B5' && row.symbol === 'GDX')
      .sort((a: Json, b: Json) => b.contribution - a.contribution)
      .map((row: Json, index: number) => [
        index + 1,
        row.entryDate,
        row.exitDate,
        row.exitReason,
        row.regime,
        signed(row.net)
      ]),
    ['r', 'l', 'l', 'l', 'l', 'r']
  );

  for (const pool of poolIds) {
    const refusals = C.refusals[pool] as { symbol: string; holder: string; count: number }[];
    const symbols = pools[pool].books.map((book) => book.symbol);

    v[`t.refusals.${pool}`] = table(
      ['Refused book ↓ / slot holder →', ...symbols],
      symbols.map((symbol) => [
        symbol,
        ...symbols.map((holder) =>
          String(refusals.find((row) => row.symbol === symbol && row.holder === holder)?.count ?? 0)
        )
      ])
    );
  }

  // ---------- D: costs ----------
  v['t.costLayers'] = table(
    [
      'ID',
      'Scenario',
      'Rate',
      'Fee/spread bps',
      '+ Slippage bps',
      '= costBps per side',
      'Stop overshoot bps',
      'Stop fill'
    ],
    costScenarios.map((s) => [
      s.id,
      s.label,
      percent(s.rate, 0),
      s.feeBps,
      s.slippageBps,
      s.costBps,
      s.stopSlippageBps,
      s.stopFill
    ]),
    ['l', 'l', 'r', 'r', 'r', 'r', 'r', 'l']
  );

  for (const pool of poolIds) {
    v[`t.costs.${pool}`] = table(
      [
        'ID',
        'Fixed net',
        'Δ vs base',
        'Same trades re-costed (cost effect)',
        'Path effect',
        'Lots (+ / − / exits changed)',
        'Minute DD',
        'Net ÷ DD',
        'Portfolio end',
        'vs C0',
        'Daily % DD',
        'Minute % DD'
      ],
      costScenarios.map((s) => {
        const row = costRow(pool, s.id);

        return [
          s.id,
          dollars(row.fixedNet),
          `${signed(row.fixedNetChange)} (${signedPercent(row.fixedNetChangeShare)})`,
          Number.isFinite(row.costEffect) && row.costEffect !== null ? signed(row.costEffect) : 'n/a (fill rule)',
          Number.isFinite(row.pathEffect) && row.pathEffect !== null ? signed(row.pathEffect) : 'n/a',
          `${row.fixedLots} (+${row.lotsAdded} / −${row.lotsRemoved} / ${row.exitsChanged})`,
          dollars(row.fixedMinuteDD),
          ratio(row.fixedNetPerMinuteDD),
          dollars(row.portfolioEnd),
          signed(row.portfolioIncrementalOverC0),
          percent(row.portfolioDailyPercent, 2),
          percent(row.portfolioMinutePercent, 2)
        ];
      })
    );
  }

  v['t.costDiff'] = table(
    ['ID', 'Scenario', 'B5 − B4 fixed net', 'B5 − B4 portfolio end equity', 'B5 − B4 daily % DD'],
    D.differences.map((row: Json) => [
      row.scenario,
      row.label,
      signed(row.fixedDifference),
      signed(row.portfolioDifference),
      points(row.dailyPercentDifference)
    ]),
    ['l', 'l', 'r', 'r', 'r']
  );
  v['t.breakEvens'] = table(
    ['Curve', 'Result'],
    Object.entries(D.breakEvens).map(([key, value]) => [
      key,
      typeof value === 'string' ? value : `interpolated ${JSON.stringify(value)}`
    ]),
    ['l', 'l']
  );

  for (const pool of poolIds) {
    for (const id of ['r18', 'f30', 'f45', 'C1', 'C2', 'C3', 's100']) {
      const row = costRow(pool, id);

      v[`v.cost.${pool}.${id}`] = `${dollars(row.fixedNet)} (${signedPercent(row.fixedNetChangeShare)})`;
    }
  }

  // ---------- E: trades ----------
  for (const pool of poolIds) {
    const e = E[pool];
    const statRow = (label: string, s: Json) => [
      label,
      s.lots,
      `${s.wins} / ${s.losses}`,
      percent(s.winRate, 0),
      dollars(s.gross),
      dollars(s.interest),
      dollars(s.friction),
      dollars(s.net),
      ratio(s.profitFactor),
      `${dollars(s.medianNet)} / ${dollars(s.meanNet)}`,
      `${s.medianDays.toFixed(1)} / ${s.meanDays.toFixed(1)}`,
      integer(s.lotDays)
    ];

    v[`t.tradeStats.${pool}`] = table(
      [
        'Book',
        'Lots',
        'Wins / losses',
        'Win rate',
        'Gross',
        'Interest',
        'Friction',
        'Net',
        'Profit factor',
        'Median / mean net',
        'Median / mean days',
        'Lot-days'
      ],
      [...Object.entries(e.byBook).map(([symbol, s]) => statRow(symbol, s)), statRow(`**${pool} total**`, e.total)]
    );
    v[`t.excursions.${pool}`] = table(
      ['Book', 'Median MAE', 'P10 MAE', 'Worst MAE ($ / %)', 'Median MFE', 'P90 MFE'],
      [...Object.entries(e.byBook), [`${pool} total`, e.total]].map(([symbol, s]: Json) => [
        symbol,
        percent(s.medianMaePercent),
        percent(s.p10MaePercent),
        `${dollars(s.worstMaeDollars)} / ${percent(s.worstMaePercent)}`,
        percent(s.medianMfePercent),
        percent(s.p90MfePercent)
      ])
    );

    const c = e.concentration;

    v[`t.concentration.${pool}`] = table(
      ['Measure', 'Value'],
      [
        ['Total fixed net', dollars(c.total)],
        [
          'Top 1 / 3 / 5 / 10 winning lots, share of total net',
          `${percent(c.top1)} / ${percent(c.top3)} / ${percent(c.top5)} / ${percent(c.top10)}`
        ],
        [
          'Total without the top 1 / 3 / 5 / 10 winners (descriptive only)',
          `${dollars(c.withoutTop1)} / ${dollars(c.withoutTop3)} / ${dollars(c.withoutTop5)} / ${dollars(c.withoutTop10)}`
        ],
        [
          'Largest loss / worst 5 losses / all losses',
          `${dollars(c.largestLoss)} / ${dollars(c.worst5Losses)} / ${dollars(c.allLosses)}`
        ],
        [
          'Share of net by book',
          Object.entries(c.byBookShare)
            .map(([symbol, share]) => `${symbol} ${percent(share as number)}`)
            .join(', ')
        ],
        ['Top calendar year (fixed MTM)', v[`v.top1Year.${pool}`]!],
        ['Open positions at 2026-10-13', String(c.openAtEnd)]
      ],
      ['l', 'l']
    );
    v[`t.topWinners.${pool}`] = table(
      ['#', 'Book', 'Entry', 'Exit', 'Net', 'Share of total'],
      c.topWinners.map((row: Json, index: number) => [
        index + 1,
        row.symbol,
        row.entryDate,
        row.exitDate,
        dollars(row.net),
        percent(row.net / c.total)
      ]),
      ['r', 'l', 'l', 'l', 'r', 'r']
    );
    v[`t.topLosers.${pool}`] = table(
      ['#', 'Book', 'Entry', 'Exit', 'Exit reason', 'Net', 'MAE'],
      c.topLosers.map((row: Json, index: number) => [
        index + 1,
        row.symbol,
        row.entryDate,
        row.exitDate,
        row.exitReason,
        dollars(row.net),
        percent(row.maePercent)
      ]),
      ['r', 'l', 'l', 'l', 'l', 'r', 'r']
    );
    v[`t.exitReasons.${pool}`] = table(
      ['Exit reason', 'Lots', 'Net'],
      Object.entries(e.byExitReason).map(([reason, s]: Json) => [reason, s.lots, dollars(s.net)]),
      ['l', 'r', 'r']
    );
    v[`t.setups.${pool}`] = table(
      ['Setup', 'Lots', 'Net', 'Win rate'],
      Object.entries(e.bySetup).map(([setup, s]: Json) => [setup, s.lots, dollars(s.net), percent(s.winRate, 0)]),
      ['l', 'r', 'r', 'r']
    );
    v[`t.lossesByRegime.${pool}`] = table(
      ['Regime of entry', 'Losing lots', 'Losses', 'Net of all lots'],
      Object.entries(e.lossesByRegime).map(([regime, s]: Json) => [
        regime,
        s.losingLots,
        dollars(s.losses),
        dollars(s.net)
      ]),
      ['l', 'r', 'r', 'r']
    );
    v[`t.worstMae.${pool}`] = table(
      ['#', 'Book', 'Entry', 'Exit', 'Exit reason', 'MAE %', 'MAE $', 'Realized net'],
      e.worstMae.map((row: Json, index: number) => [
        index + 1,
        row.symbol,
        row.entryDate,
        row.exitDate,
        row.exitReason,
        percent(row.maePercent),
        dollars(row.maeDollars),
        dollars(row.net)
      ]),
      ['r', 'l', 'l', 'l', 'l', 'r', 'r', 'r']
    );
    v[`t.episodeLots.${pool}`] = table(
      ['Portfolio episode (daily close)', 'Depth', 'Lots held (book entry → exit: portfolio-mode net)'],
      e.drawdownEpisodeLots.map((episode: Json) => [
        `${episode.peakDate} → ${episode.troughDate} (recovered ${episode.recoveryDate || 'not yet'})`,
        percent(episode.depthPercent),
        episode.lots.length
          ? episode.lots
              .map((lot: Json) => `${lot.symbol} ${lot.entryDate}→${lot.exitDate}: ${signed(lot.net)}`)
              .join('; ')
          : 'none'
      ]),
      ['l', 'r', 'l']
    );
  }

  // ---------- F: portfolio ----------
  v['t.portfolio'] = table(
    [
      'Run',
      'End equity',
      'Total return',
      'CAGR',
      'vs C0',
      'Max daily % DD',
      'Δ vs C0',
      'Max minute % DD',
      'Δ vs C0',
      'CAGR ÷ daily DD',
      'Time with lot',
      'Max principal',
      'Max debt ÷ equity'
    ],
    F.rows.map((row: Json) => [
      row.id,
      dollars(row.endEquity),
      percent(row.totalReturn, 0),
      percent(row.cagr, 2),
      row.id === 'C0' ? '—' : signed(row.incrementalOverC0),
      percent(row.dailyPercent, 2),
      row.id === 'C0' ? '—' : points(row.incrementalDailyPercent),
      percent(row.minutePercent, 2),
      row.id === 'C0' ? '—' : points(row.incrementalMinutePercent),
      ratio(row.cagrPerDailyDD),
      percent(row.timeWithLot),
      dollars(row.maxPrincipal),
      Number.isFinite(row.maxDebtToEquity) ? ratio(row.maxDebtToEquity, 3) : '—'
    ])
  );
  v['t.episodes'] = table(
    [
      'Run',
      'Rank',
      'Peak close',
      'Trough close',
      'Recovered',
      'Depth %',
      'Depth $',
      'Sessions to trough',
      'Sessions underwater'
    ],
    F.episodes.map((row: Json) => [
      row.id,
      row.rank,
      row.peakDate,
      row.troughDate,
      row.recoveryDate || 'not recovered',
      percent(row.depthPercent, 2),
      dollars(row.depthDollars),
      row.sessionsToTrough,
      row.sessionsUnderwater
    ])
  );
  v['t.margin'] = table(
    ['Run', 'U35', 'U50', 'U60', 'L50', 'L60', 'G50', 'G60', 'U60 minimum date'],
    F.rows
      .filter((row: Json) => row.id !== 'C0')
      .map((row: Json) => [
        row.id,
        ...['U35', 'U50', 'U60', 'L50', 'L60', 'G50', 'G60'].map((schedule) => ratio(n(row[`min.${schedule}`]), 2)),
        row['minDate.U60']
      ])
  );
  v['t.riskGate'] = table(
    [
      'Pool',
      'Max daily % DD (base, C1–C3)',
      'Max minute % DD (base, C1–C3)',
      'D35 (> 35%)',
      'D30 (> 30%)',
      'Base daily vs C0',
      'Base minute vs C0',
      'D+ (worse than C0)'
    ],
    poolIds.map((pool) => [
      pool,
      percent(G[pool].D.maxDailyPercent, 2),
      percent(G[pool].D.maxMinutePercent, 2),
      flag(G[pool].D.D35),
      flag(G[pool].D.D30),
      points(G[pool].D.baseDailyVsC0),
      points(G[pool].D.baseMinuteVsC0),
      flag(G[pool].D.Dplus)
    ])
  );

  for (const id of ['C0', 'B4', 'B5']) {
    const row = fRow(id);

    v[`v.end.${id}`] = dollars(row.endEquity);
    v[`v.cagr.${id}`] = percent(row.cagr, 1);
    v[`v.daily.${id}`] = percent(row.dailyPercent, 2);
    v[`v.minute.${id}`] = percent(row.minutePercent, 2);
    v[`v.inc.${id}`] = signed(row.incrementalOverC0);
  }

  // ---------- gates ----------
  const gateRows: (string | number)[][] = [];

  for (const pool of poolIds) {
    const g = G[pool];

    gateRows.push(
      [
        pool,
        'A Local stability',
        `${percent(g.A.shareProfitable, 0)} of 64 joint samples profitable; median ${percent(g.A.medianNetRatio)} of frozen (thresholds 75% / 50%)`,
        flag(g.A.flag)
      ],
      [
        pool,
        'B Concentration',
        `top year ${percent(g.B.top1YearShare)}; top-3 lots ${percent(g.B.top3LotsShare)} (threshold 50%)`,
        flag(g.B.flag)
      ],
      [
        pool,
        'D Portfolio risk',
        `max daily ${percent(g.D.maxDailyPercent, 2)} / minute ${percent(g.D.maxMinutePercent, 2)} over base, C1–C3; vs C0 ${points(g.D.baseDailyVsC0)} daily, ${points(g.D.baseMinuteVsC0)} minute`,
        `D35 ${flag(g.D.D35)}; D30 ${flag(g.D.D30)}; D+ ${flag(g.D.Dplus)}`
      ],
      [
        pool,
        'E Costs',
        `moderate stresses keep net > 0 and beat C0; C1 net −${percent(g.E.c1NetFall)}, net÷DD −${percent(g.E.c1NetPerDDFall)} (threshold 50%)`,
        flag(g.E.flag)
      ]
    );

    if (pool === 'B5') {
      gateRows.push([
        pool,
        'C GDX increment',
        `B5 − B4 > 0 under r14, f10, f15, s25, C1 (min fixed ${dollars(Math.min(...g.C.smallCost.map((row: Json) => row.fixedDifference)))}, min portfolio ${dollars(Math.min(...g.C.smallCost.map((row: Json) => row.portfolioDifference)))}); largest year ${percent(g.C.largestYearShare)}, largest regime ${percent(g.C.largestRegimeShare)} (threshold 50%)`,
        flag(g.C.flag)
      ]);
    }
  }

  gateRows.push([
    'both',
    'F Accounting',
    `baseline ${v['v.baselineChecks']} checks; recomputed % DD = engine; minute ≥ daily DD in all ${analysis.runs.stored} runs; B5 − GDX = B4; bridge residual ${v['v.bridgeResidual']}`,
    flag(G.F.flag)
  ]);
  v['t.gates'] = table(['Pool', 'Gate', 'Measured', 'Outcome'], gateRows, ['l', 'l', 'l', 'l']);

  // ---------- headline comparison ----------
  const headline = (label: string, b4: string, b5: string) => [label, b4, b5];

  v['t.headline'] = table(
    ['Measure (2016-01-04 → 2026-10-13, inspected history)', 'B4', 'B5'],
    [
      headline(
        'Fixed net / max minute DD',
        `${dollars(A.B4.baseline.fixed.net)} / ${dollars(A.B4.baseline.fixed.minuteDD)}`,
        `${dollars(A.B5.baseline.fixed.net)} / ${dollars(A.B5.baseline.fixed.minuteDD)}`
      ),
      headline(
        'Joint neighbourhood median net (÷ frozen); worst',
        `${v['v.jointMedian.B4']} (${v['v.jointMedianRatio.B4']}); ${v['v.jointWorst.B4']}`,
        `${v['v.jointMedian.B5']} (${v['v.jointMedianRatio.B5']}); ${v['v.jointWorst.B5']}`
      ),
      headline(
        'Neighbours profitable / beating the frozen net',
        `${percent(A.B4.designs['joint-s1'].shareProfitable, 0)} / ${percent(A.B4.designs['joint-s1'].shareAboveBaseline, 0)}`,
        `${percent(A.B5.designs['joint-s1'].shareProfitable, 0)} / ${percent(A.B5.designs['joint-s1'].shareAboveBaseline, 0)}`
      ),
      headline(
        'Fixed net under C1 / C2 / C3',
        `${v['v.cost.B4.C1']} / ${v['v.cost.B4.C2']} / ${v['v.cost.B4.C3']}`,
        `${v['v.cost.B5.C1']} / ${v['v.cost.B5.C2']} / ${v['v.cost.B5.C3']}`
      ),
      headline(
        'Top year share; top-3 lots share',
        `${v['v.top1Year.B4']}; ${percent(E.B4.concentration.top3)}`,
        `${v['v.top1Year.B5']}; ${percent(E.B5.concentration.top3)}`
      ),
      headline(
        'Portfolio end equity (C0 ' + v['v.end.C0'] + ')',
        `${v['v.end.B4']} (${v['v.inc.B4']})`,
        `${v['v.end.B5']} (${v['v.inc.B5']})`
      ),
      headline(
        'Portfolio max daily / minute % DD (C0 ' + `${v['v.daily.C0']} / ${v['v.minute.C0']})`,
        `${v['v.daily.B4']} / ${v['v.minute.B4']}`,
        `${v['v.daily.B5']} / ${v['v.minute.B5']}`
      ),
      headline(
        'Joint-neighbour median portfolio daily % DD; share > 35%',
        `${v['v.jointDailyMedian.B4']}; ${v['v.jointDaily35.B4']}`,
        `${v['v.jointDailyMedian.B5']}; ${v['v.jointDaily35.B5']}`
      )
    ],
    ['l', 'l', 'l']
  );

  v['v.regimeWindows'] = regimeWindows.map((window) => `${window.id} ${window.from}→${window.to}`).join('; ');
  v['v.gateThresholds'] =
    `${gates.stabilityProfitableShare}, ${gates.stabilityMedianRatio}, ${gates.concentrationShare}, ${gates.riskPreferred}, ${gates.riskTolerance}`;
  v['v.oatInfeasibleCount'] = String(
    poolIds.reduce(
      (total, pool) => total + oatPoints(pools[pool]).filter((point) => !point.feasible && !point.boundary).length,
      0
    )
  );

  // ---------- narrative figures (every number the prose cites) ----------
  for (const pool of poolIds) {
    const baseFixed = A[pool].baseline.fixed;

    for (const [design, d] of Object.entries(A[pool].designs) as [string, Json][]) {
      const key = `${pool}.${design}`;

      v[`v.ratio.${key}`] = percent(d.medianNetRatio, 0);
      v[`v.median.${key}`] = dollars(d.fixedNet.median);
      v[`v.min.${key}`] = dollars(d.fixedNet.min);
      v[`v.max.${key}`] = dollars(d.fixedNet.max);
      v[`v.above.${key}`] = percent(d.shareAboveBaseline, 0);
      v[`v.pct.${key}`] = percent(d.baselineNetPercentile, 0);
      v[`v.dmed.${key}`] = percent(d.portfolioDailyPercent.median);
      v[`v.dmax.${key}`] = percent(d.portfolioDailyPercent.max);
      v[`v.d30.${key}`] = percent(d.shareDaily30, 0);
      v[`v.d35.${key}`] = percent(d.shareDaily35, 0);
      v[`v.m35.${key}`] = percent(d.shareMinute35, 0);
      v[`v.endmed.${key}`] = dollars(d.portfolioEnd.median);
      v[`v.endmin.${key}`] = dollars(d.portfolioEnd.min);
      v[`v.inc.${key}`] = percent(d.shareIncrementalPositive, 0);
      v[`v.ddmed.${key}`] = dollars(d.fixedMinuteDD.median);
      v[`v.ddmax.${key}`] = dollars(d.fixedMinuteDD.max);
    }

    v[`v.oatMedianRatio.${pool}`] = percent(A[pool].oat.fixedNet.median / baseFixed.net, 0);
    v[`v.oatWorstRatio.${pool}`] = percent(A[pool].oat.fixedNet.min / baseFixed.net, 0);
    v[`v.oatWorst.${pool}`] = dollars(A[pool].oat.fixedNet.min);
    v[`v.net.${pool}`] = dollars(baseFixed.net);
    v[`v.mdd.${pool}`] = dollars(baseFixed.minuteDD);
    v[`v.lots.${pool}`] = String(baseFixed.lots);

    const top = A[pool].tornado[0];

    v[`v.topParam.${pool}`] =
      `${top.symbol} ${top.short} (frozen ${grid(top.parameter, top.frozen)}): ${dollars(top.minNet)} – ${dollars(top.maxNet)}`;

    for (const row of C.ablations.filter((item: Json) => item.pool === pool)) {
      const key = `${pool}.${row.removed}`;

      v[`v.abl.${key}.fixedInc`] = signed(row.bookIncrementalFixed);
      v[`v.abl.${key}.own`] = signed(row.removedBookOwnNet);
      v[`v.abl.${key}.ownLots`] = String(row.removedBookLots);
      v[`v.abl.${key}.gained`] = `${row.othersGainedLots} lots, ${signed(row.othersGainedNet)}`;
      v[`v.abl.${key}.lost`] = `${row.othersLostLots} lots, ${signed(row.othersLostNet)}`;
      v[`v.abl.${key}.portInc`] = signed(row.bookIncrementalPortfolio);
      v[`v.abl.${key}.daily`] = points(row.bookDailyPercentImpact);
      v[`v.abl.${key}.minute`] = points(row.bookMinutePercentImpact);
      v[`v.abl.${key}.ddImpact`] = signed(row.bookMinuteDDImpact);
    }

    const c = E[pool].concentration;

    v[`v.top1.${pool}`] = percent(c.top1);
    v[`v.top3.${pool}`] = percent(c.top3);
    v[`v.top5.${pool}`] = percent(c.top5);
    v[`v.top10.${pool}`] = percent(c.top10);
    v[`v.withoutTop10.${pool}`] = dollars(c.withoutTop10);
    v[`v.withoutTop5.${pool}`] = dollars(c.withoutTop5);

    for (const [symbol, share] of Object.entries(c.byBookShare)) {
      v[`v.share.${pool}.${symbol}`] = percent(share as number);
    }

    const exits = E[pool].byExitReason;

    v[`v.stopNet.${pool}`] = dollars((exits['trailing stop']?.net ?? 0) + (exits['trailing stop gap']?.net ?? 0));
    v[`v.holdNet.${pool}`] = dollars(exits['maximum hold']?.net ?? 0);
    v[`v.holdLots.${pool}`] = String(exits['maximum hold']?.lots ?? 0);
    v[`v.worstMae.${pool}`] =
      `${E[pool].worstMae[0].symbol} ${E[pool].worstMae[0].entryDate}: ${percent(E[pool].worstMae[0].maePercent)} (${dollars(E[pool].worstMae[0].maeDollars)}), realized ${dollars(E[pool].worstMae[0].net)}`;

    // Funded lots per year since arming (2017-06-15 → the end).
    const years = (Date.parse(base.end) - Date.parse(base.firstEligibleDate)) / 86400000 / 365.25;

    v[`v.lotsPerYear.${pool}`] = (baseFixed.lots / years).toFixed(1);
    v[`v.yearsTo20.${pool}`] = (20 / (baseFixed.lots / years)).toFixed(1);
    v['v.gdxPerYear'] = (C.bridge.gdxLots / years).toFixed(1);
    v['v.armedYears'] = years.toFixed(2);

    for (const id of ['C1', 'C2', 'C3']) {
      const row = costRow(pool, id);

      v[`v.costNetPerDD.${pool}.${id}`] = signedPercent(row.netPerDDChangeShare);
      v[`v.costPath.${pool}.${id}`] = signed(row.pathEffect);
      v[`v.costCost.${pool}.${id}`] = signed(row.costEffect);
    }

    for (const id of ['r18', 'f15', 'f30']) {
      const row = costRow(pool, id);

      v[`v.costPath.${pool}.${id}`] = signed(row.pathEffect);
      v[`v.costCost.${pool}.${id}`] = signed(row.costEffect);
      v[`v.costLots.${pool}.${id}`] = `+${row.lotsAdded} / −${row.lotsRemoved}`;
    }

    v[`v.c3Daily.${pool}`] = percent(costRow(pool, 'C3').portfolioDailyPercent, 2);
    v[`v.c3Minute.${pool}`] = percent(costRow(pool, 'C3').portfolioMinutePercent, 2);
    v[`v.c3Inc.${pool}`] = signed(costRow(pool, 'C3').portfolioIncrementalOverC0);
    v[`v.minU60.${pool}`] = ratio(n(fRow(pool)['min.U60']), 2);
    v[`v.minU35.${pool}`] = ratio(n(fRow(pool)['min.U35']), 2);
    v[`v.maxDE.${pool}`] = ratio(fRow(pool).maxDebtToEquity, 3);
    v[`v.maxPrincipal.${pool}`] = dollars(fRow(pool).maxPrincipal);
  }

  v['v.costDiffMinFixed'] = dollars(Math.min(...D.differences.map((row: Json) => row.fixedDifference)));
  v['v.costDiffMaxFixed'] = dollars(Math.max(...D.differences.map((row: Json) => row.fixedDifference)));
  v['v.costDiffMinPortfolio'] = dollars(Math.min(...D.differences.map((row: Json) => row.portfolioDifference)));
  v['v.bookGdxMin'] = dollars(A.B5.designs['book-GDX'].fixedNet.min);
  v['v.bookGdxEndMin'] = dollars(A.B5.designs['book-GDX'].portfolioEnd.min);
  v['v.c0Episode2020'] = percent(
    F.episodes.find((row: Json) => row.id === 'C0' && row.peakDate === '2020-02-19').depthPercent,
    2
  );
  v['v.c0Episode2022'] = percent(
    F.episodes.find((row: Json) => row.id === 'C0' && row.peakDate === '2021-12-27').depthPercent,
    2
  );
  v['v.b4Episode2022'] = percent(
    F.episodes.find((row: Json) => row.id === 'B4' && row.peakDate === '2021-12-27').depthPercent,
    2
  );
  v['v.b5Episode2022'] = percent(
    F.episodes.find((row: Json) => row.id === 'B5' && row.peakDate === '2021-12-27').depthPercent,
    2
  );
  for (const pool of poolIds) {
    const worst = F.worstLotShareOfEquity[pool];

    v[`v.worstLotEq.${pool}`] =
      `${percent(-worst.share, 2)} (${worst.symbol} ${worst.entryDate}, ${dollars(worst.net)})`;
  }

  // Crash years across the joint neighbourhoods (both seeds pooled).
  const crashRows: (string | number)[][] = [];

  for (const pool of poolIds) {
    const designs = ['joint-s1', 'joint-s2'].map((design) => A[pool].designs[design]);
    const peaks: Record<string, number> = {};

    for (const d of designs) {
      for (const [month, count] of Object.entries(d.worstDrawdownPeakYears as Record<string, number>)) {
        peaks[month] = (peaks[month] ?? 0) + count;
      }
    }

    const total = Object.values(peaks).reduce((sum, count) => sum + count, 0);
    const in2022 = Object.entries(peaks)
      .filter(([month]) => month >= '2021-11' && month <= '2022-12')
      .reduce((sum, [, count]) => sum + count, 0);
    const in2020 = Object.entries(peaks)
      .filter(([month]) => month.startsWith('2020'))
      .reduce((sum, [, count]) => sum + count, 0);
    const positive2022 = designs.reduce((sum, d) => sum + d.share2022Positive * d.n, 0) / total;

    v[`v.frozen2022.${pool}`] = dollars(designs[0].frozen2022);
    v[`v.median2022.${pool}`] = dollars(designs[0].fixed2022.median);
    v[`v.positive2022.${pool}`] = percent(positive2022, 0);
    v[`v.peak2022.${pool}`] = `${in2022} of ${total}`;
    v[`v.peak2020.${pool}`] = `${in2020} of ${total}`;
    crashRows.push(
      [
        pool,
        '2020',
        dollars(designs[0].frozen2020),
        `${dollars(designs[0].fixed2020.median)} / ${dollars(designs[1].fixed2020.median)}`,
        `${in2020} of ${total}`
      ],
      [
        pool,
        '2022',
        dollars(designs[0].frozen2022),
        `${dollars(designs[0].fixed2022.median)} / ${dollars(designs[1].fixed2022.median)}`,
        `${in2022} of ${total}`
      ]
    );
  }

  v['t.crashYears'] = table(
    [
      'Pool',
      'Year',
      'Frozen fixed MTM',
      'Joint-neighbour median (seed 1 / seed 2)',
      'Neighbours whose worst portfolio DD starts then'
    ],
    crashRows
  );
  v['v.bootDiffShare'] = percent(B.bootstrap.difference.shareNonPositive, 2);
  v['v.bootDiffP05'] = dollars(B.bootstrap.difference.p05);

  return v;
};
