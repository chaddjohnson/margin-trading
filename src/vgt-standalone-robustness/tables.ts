// Every placeholder of the report templates, computed from results/analysis.json and the baseline record: tables as
// Markdown (`t.<name>`) and single figures as formatted strings (`v.<name>`). Nothing here runs a strategy, and a
// missing placeholder fails the render, so no report shows a stale or hand-typed number.
import fs from 'fs-extra';
import {
  cents,
  dollars,
  flag,
  integer,
  percent,
  points,
  ratio,
  signed,
  signedPercent,
  table
} from '../b4-b5-robustness/format.ts';
import { anchors, base, protocolOriginalSha256, protocolSha256, resultDir } from './context.ts';
import { revive } from './store.ts';

type Json = any;

const yes = (value: boolean) => (value ? 'yes' : 'no');
const pp = (value: number, digits = 2) => (Number.isFinite(value) ? `${(value * 100).toFixed(digits)} pp` : 'n/a');
const pct2 = (value: number) => percent(value, 2);
const range = (a: string, b: string) => `${a} – ${b}`;
const outcomeOf = (value: string) => (value === 'S better' ? '**S**' : value === 'pool better' ? '**pool**' : 'tie');

export const placeholdersOf = async (): Promise<Record<string, string>> => {
  const a: Json = JSON.parse(await fs.readFile(resultDir('analysis.json'), 'utf8'), revive);
  const baseline: Json = JSON.parse(await fs.readFile(resultDir('baseline', 'baseline.json'), 'utf8'), revive);
  const v: Record<string, string> = {};
  const P = a.P;
  const T = a.T;
  const C = a.C;
  const R = a.R;
  const F = a.flags;
  const D = a.decisions;
  const design = (label: string) => {
    const found = P.designs.find((d: Json) => d.label === label);

    if (!found) {
      throw new Error(`no design ${label}`);
    }

    return found;
  };
  const port = (who: string) => R.portfolio.find((row: Json) => row.who === who);
  const cost = (who: string, id: string) => C.rows.find((row: Json) => row.structure === who && row.scenario === id);
  const labels: Record<string, string> = { S: 'S (VGT-primary standalone)', B4: 'B4', B5: 'B5', C0: 'C0 (core only)' };
  const nameOf = (who: string) => labels[who] ?? who;

  // ---------- general ----------
  v['v.protocolOriginal'] = protocolOriginalSha256;
  v['v.protocolHead'] = protocolSha256;
  v['v.window'] = `${base.first} → ${base.end}`;
  v['v.sessions'] = integer(a.window.sessions);
  v['v.baselineChecks'] = `${baseline.checks.filter((c: Json) => c.pass).length}/${baseline.checks.length}`;
  v['v.reexecutions'] = integer(a.reexecution.runs);

  // ---------- baseline ----------
  v['t.baselineChecks'] = table(
    ['#', 'Check', 'Result', 'Detail'],
    baseline.checks.map((c: Json, index: number) => [
      index + 1,
      c.name,
      c.pass ? 'PASS' : '**FAIL**',
      c.detail.replaceAll('|', '/')
    ]),
    ['r', 'l', 'l', 'l']
  );

  const sFixed = R.fixed.S;
  const b4Fixed = R.fixed.B4;
  const b5Fixed = R.fixed.B5;

  v['t.anchors'] = table(
    [
      'Configuration',
      'Fixed net',
      'Fixed max minute DD',
      'Funded lots',
      'Portfolio end equity',
      'Max daily-close % DD',
      'Max minute-sampled % DD'
    ],
    [
      [
        'S (VGT-primary standalone)',
        cents(sFixed.net),
        cents(sFixed.minuteDD),
        sFixed.lots,
        cents(port('S').endEquity),
        pct2(port('S').dailyPercent),
        pct2(port('S').minutePercent)
      ],
      [
        'B4 (anchor)',
        `${cents(b4Fixed.net)} (${cents(anchors.B4.net)})`,
        `${cents(b4Fixed.minuteDD)} (${cents(anchors.B4.minuteDrawdown)})`,
        `${b4Fixed.lots} (${anchors.B4.lots})`,
        `${cents(port('B4').endEquity)} (${cents(anchors.B4.endEquity)})`,
        `${pct2(port('B4').dailyPercent)} (${pct2(anchors.B4.dailyPercent)})`,
        `${pct2(port('B4').minutePercent)} (${pct2(anchors.B4.minutePercent)})`
      ],
      [
        'B5 (anchor)',
        `${cents(b5Fixed.net)} (${cents(anchors.B5.net)})`,
        `${cents(b5Fixed.minuteDD)} (${cents(anchors.B5.minuteDrawdown)})`,
        `${b5Fixed.lots} (${anchors.B5.lots})`,
        `${cents(port('B5').endEquity)} (${cents(anchors.B5.endEquity)})`,
        `${pct2(port('B5').dailyPercent)} (${pct2(anchors.B5.dailyPercent)})`,
        `${pct2(port('B5').minutePercent)} (${pct2(anchors.B5.minutePercent)})`
      ],
      [
        'C0 (anchor)',
        '—',
        '—',
        '—',
        `${cents(port('C0').endEquity)} (${cents(anchors.C0.endEquity)})`,
        `${pct2(port('C0').dailyPercent)} (${pct2(anchors.C0.dailyPercent)})`,
        `${pct2(port('C0').minutePercent)} (${pct2(anchors.C0.minutePercent)})`
      ]
    ]
  );

  const blocked = a.E.blocked;

  v['t.frozenPaths'] = table(
    [
      'S lot',
      'Entry (ET)',
      'Exit (ET)',
      'Exit reason',
      'S net',
      'In B4',
      'B4 slot holder (its net)',
      'In B5',
      'B5 slot holder (its net)'
    ],
    a.E.frozenPaths.map((row: Json) => [
      row.lot,
      row.entry.replace('T', ' ').slice(0, 16),
      row.exit.replace('T', ' ').slice(0, 16),
      row.exitReason,
      dollars(row.net),
      row['B4.funded'] === 'yes' ? 'funded' : '**blocked**',
      row['B4.funded'] === 'yes' ? '' : `${row['B4.holder']} (${dollars(row['B4.holderNet'])})`,
      row['B5.funded'] === 'yes' ? 'funded' : '**blocked**',
      row['B5.funded'] === 'yes' ? '' : `${row['B5.holder']} (${dollars(row['B5.holderNet'])})`
    ]),
    ['r', 'l', 'l', 'l', 'r', 'l', 'l', 'l', 'l']
  );

  for (const pool of ['B4', 'B5']) {
    const b = blocked[pool];

    v[`v.${pool}.blocked`] = integer(b.blocked);
    v[`v.${pool}.blockedNet`] = dollars(b.blockedNet);
    v[`v.${pool}.fundedVgtNet`] = dollars(b.fundedNet);
    v[`v.${pool}.holderNet`] = dollars(b.holderNet);
    v[`v.${pool}.vgtLots`] = integer(b.poolVgtLots);
    v[`v.${pool}.refusalsTotal`] = integer(b.refusals.reduce((t: number, r: Json) => t + r.count, 0));
    v[`v.${pool}.vgtRefused`] = integer(
      b.refusals.filter((r: Json) => r.symbol === 'VGT').reduce((t: number, r: Json) => t + r.count, 0)
    );
    v[`v.${pool}.refusedByVgt`] = integer(
      b.refusals.filter((r: Json) => r.holder === 'VGT').reduce((t: number, r: Json) => t + r.count, 0)
    );
  }

  // ---------- parameter stability ----------
  const designRow = (d: Json) => [
    d.label,
    d.n,
    dollars(d.net.median),
    percent(d.retention.median),
    range(dollars(d.net.p10), dollars(d.net.p90)),
    `${dollars(d.net.min)} (${percent(d.retention.min)})`,
    percent(d.shareProfitable, 0),
    percent(d.shareHalf, 0),
    percent(d.shareAbove, 0),
    percent(d.frozenPercentile, 0),
    dollars(d.minuteDD.median),
    d.preserved ? percent(d.preserved.median, 0) : 'n/a'
  ];
  const designHeader = [
    'Design',
    'n',
    'Median net',
    'Median ÷ own frozen',
    'P10 – P90 net',
    'Worst (÷ frozen)',
    'Net > 0',
    '≥ ½ frozen',
    '> frozen',
    'Frozen percentile',
    'Median fixed minute DD',
    'Median lot-path preserved'
  ];
  const sLabels = [
    'S: OAT (32 VGT points)',
    'S: matched 8-D, B4 VGT design (32)',
    'S: matched 8-D, B5 VGT design (32)',
    'S: matched 8-D, both designs (64)',
    'S: joint 8-D, seed 1 (64)',
    'S: joint 8-D, seed 2 (64)',
    'S: joint 8-D, both seeds (128)'
  ];
  const poolMatchedLabels = [
    'B4: OAT of the VGT book (32)',
    'B4: 8-D, VGT book only (32)',
    'B5: OAT of the VGT book (32)',
    'B5: 8-D, VGT book only (32)'
  ];
  const contextLabels = P.designs.map((d: Json) => d.label).filter((label: string) => label.includes('context'));
  const systemLabels = P.designs.map((d: Json) => d.label).filter((label: string) => label.includes('system-level'));

  v['t.designsS'] = table(
    designHeader,
    sLabels.map((label) => designRow(design(label)))
  );
  v['t.designsMatchedPools'] = table(
    designHeader,
    poolMatchedLabels.map((label) => designRow(design(label)))
  );
  v['t.designsContext'] = table(
    designHeader,
    contextLabels.map((label: string) => designRow(design(label)))
  );
  v['t.designsSystem'] = table(
    designHeader,
    systemLabels.map((label: string) => designRow(design(label)))
  );

  const portfolioRow = (d: Json) => [
    d.label,
    dollars(d.portfolio.endEquity.median),
    range(dollars(d.portfolio.endEquity.p10), dollars(d.portfolio.endEquity.p90)),
    signed(d.portfolio.incremental.median),
    percent(d.portfolio.shareBeatsC0, 0),
    `${percent(d.portfolio.daily.median)} (${percent(d.portfolio.daily.min)} – ${percent(d.portfolio.daily.max)})`,
    points(d.portfolio.dailyShift, 1),
    percent(d.portfolio.shareDaily30, 0),
    percent(d.portfolio.shareDaily35, 0),
    percent(d.portfolio.minute.median),
    percent(d.portfolio.shareMinute35, 0),
    percent(d.portfolio.worstEpisodeAsFrozen, 0)
  ];
  const portfolioHeader = [
    'Design',
    'Median end equity',
    'P10 – P90',
    'Median vs C0',
    'Beats C0',
    'Median daily % DD (range)',
    'Median − own frozen',
    'Daily > 30%',
    'Daily > 35%',
    'Median minute % DD',
    'Minute > 35%',
    "Worst daily episode = frozen's"
  ];

  v['t.designsPortfolio'] = table(
    portfolioHeader,
    [...sLabels, ...poolMatchedLabels, ...systemLabels].map((label) => portfolioRow(design(label)))
  );

  for (const pool of ['B5', 'B4']) {
    const m = P.matched[pool];
    const fmt = (row: Json, value: number) =>
      row.id === 'b5' ? signed(value) : row.id === 'b8' ? points(value, 2) : percent(value);

    v[`t.matched.${pool}`] = table(
      ['Item', 'Measure', 'S', pool, 'Tie band', 'Better'],
      m.rows.map((row: Json) => [
        row.id,
        row.label,
        fmt(row, row.s),
        fmt(row, row.p),
        row.id === 'b5' ? '$2,500' : row.id === 'b8' ? '0.5 pp' : '2 pp',
        outcomeOf(row.outcome)
      ]),
      ['l', 'l', 'r', 'r', 'r', 'l']
    );
    v[`v.matched.${pool}.verdict`] = m.verdict;
    v[`v.matched.${pool}.tally`] = `S better ${m.sBetter}, ${pool} better ${m.pBetter}, ties ${m.ties}`;
    const b8 = m.rows.find((row: Json) => row.id === 'b8');
    const lessDiluted = m.rows.filter((row: Json) => ['b5', 'b7', 'b8'].includes(row.id));

    v[`v.matched.${pool}.b8S`] = points(b8.s, 2);
    v[`v.matched.${pool}.b8P`] = points(b8.p, 2);
    v[`v.matched.${pool}.lessDiluted`] =
      `${pool} better ${lessDiluted.filter((row: Json) => row.outcome === 'pool better').length}, S better ${lessDiluted.filter((row: Json) => row.outcome === 'S better').length}, ties ${lessDiluted.filter((row: Json) => row.outcome === 'tie').length}`;
    v[`v.matched.${pool}.withoutB6`] =
      `S better ${m.withoutB6.sBetter}, ${pool} better ${m.withoutB6.pBetter}, ties ${m.withoutB6.ties}`;
  }

  v['t.pairedSummary'] = table(
    [
      'Design (same 32 VGT vectors)',
      'Median S − pool retention',
      'P10 – P90',
      'S retention higher',
      'Pool Δ VGT-book net (median; P10 – P90)',
      'Pool Δ other books (median; P10 – P90)',
      'Other books lose',
      'Pool VGT lots (median; range)',
      'Pool VGT lots ⊂ S lots',
      'corr(Δ S, Δ pool)'
    ],
    ['B4', 'B5'].map((pool) => {
      const s = P.pairedSummary[pool];

      return [
        `${pool} VGT design`,
        points(s.retentionDifference.median, 1),
        range(points(s.retentionDifference.p10, 1), points(s.retentionDifference.p90, 1)),
        percent(s.shareSRetentionHigher, 0),
        `${signed(s.deltaVgt.median)}; ${range(signed(s.deltaVgt.p10), signed(s.deltaVgt.p90))}`,
        `${signed(s.deltaOthers.median)}; ${range(signed(s.deltaOthers.p10), signed(s.deltaOthers.p90))}`,
        percent(s.shareOthersLose, 0),
        `${s.vgtLots.median}; ${s.vgtLots.min}–${s.vgtLots.max}`,
        percent(s.vgtFundedAreStandaloneLots, 0),
        ratio(s.correlationOfDeltas)
      ];
    })
  );

  v['t.supplementary'] = table(
    [
      'Design',
      'S: exact lots preserved (median; P10 – P90)',
      'Pool VGT book: exact (median; P10 – P90)',
      'Pool, all books: exact (median)',
      'S: entry sessions preserved (median)',
      'Pool VGT book: entry sessions preserved (median)'
    ],
    ['B4', 'B5'].map((pool) => {
      const s = P.pairedSummary[pool].supplementary;

      return [
        `${pool} VGT design`,
        `${percent(s.sPreserved.median, 0)}; ${range(percent(s.sPreserved.p10, 0), percent(s.sPreserved.p90, 0))}`,
        `${percent(s.poolVgtPreserved.median, 0)}; ${range(percent(s.poolVgtPreserved.p10, 0), percent(s.poolVgtPreserved.p90, 0))}`,
        percent(design(`${pool}: 8-D, VGT book only (32)`).preserved.median, 0),
        percent(s.sEntryPreserved.median, 0),
        percent(s.poolVgtEntryPreserved.median, 0)
      ];
    })
  );

  // OAT grid.
  v['t.oat'] = table(
    [
      'Param',
      'Point',
      'Value',
      'S net (÷ frozen)',
      'S daily % DD',
      'B4 net (÷ frozen)',
      'B4 Δ VGT / Δ others',
      'B5 net (÷ frozen)',
      'B5 Δ VGT / Δ others',
      'B5 daily % DD'
    ],
    P.oat.map((row: Json) => [
      row.parameter,
      row.offset,
      ['maximumHoldDays', 'tickWindowSize', 'continuationWindow'].includes(row.key)
        ? row.value
        : `${(row.value / 10).toFixed(1)}%`,
      `${dollars(row['S.net'])} (${percent(row['S.retention'])})`,
      pct2(row['S.dailyPercent']),
      `${dollars(row['B4.net'])} (${percent(row['B4.retention'])})`,
      `${signed(row['B4.deltaVgt'])} / ${signed(row['B4.deltaOthers'])}`,
      `${dollars(row['B5.net'])} (${percent(row['B5.retention'])})`,
      `${signed(row['B5.deltaVgt'])} / ${signed(row['B5.deltaOthers'])}`,
      pct2(row['B5.dailyPercent'])
    ])
  );

  // S OAT swings by parameter.
  const swings = Object.values(
    P.oat.reduce((acc: Record<string, Json>, row: Json) => {
      acc[row.parameter] ??= { parameter: row.parameter, nets: [], b5: [], b4: [] };
      acc[row.parameter].nets.push(row['S.net']);
      acc[row.parameter].b4.push(row['B4.net']);
      acc[row.parameter].b5.push(row['B5.net']);

      return acc;
    }, {})
  ).map((row: Json) => ({
    ...row,
    swing: Math.max(...row.nets) - Math.min(...row.nets),
    b4Swing: Math.max(...row.b4) - Math.min(...row.b4),
    b5Swing: Math.max(...row.b5) - Math.min(...row.b5)
  }));

  swings.sort((x: Json, y: Json) => y.swing - x.swing);
  v['t.oatSwings'] = table(
    ['Rank', 'Parameter', 'S lowest – highest net', 'S swing', 'B4 swing', 'B5 swing'],
    swings.map((row: Json, index: number) => [
      index + 1,
      row.parameter,
      range(dollars(Math.min(...row.nets)), dollars(Math.max(...row.nets))),
      dollars(row.swing),
      dollars(row.b4Swing),
      dollars(row.b5Swing)
    ])
  );

  // Worst-episode tallies.
  const episodeTable = (labels: string[]) => {
    const keys = [...new Set(labels.flatMap((label) => Object.keys(design(label).portfolio.worstEpisodes)))].sort();

    return table(
      ['Design', ...keys],
      labels.map((label) => [label, ...keys.map((key) => design(label).portfolio.worstEpisodes[key] ?? 0)])
    );
  };

  v['t.worstEpisodes'] = episodeTable([
    'S: matched 8-D, both designs (64)',
    'S: joint 8-D, both seeds (128)',
    'B4: 8-D, VGT book only (32)',
    'B5: 8-D, VGT book only (32)',
    'B4: system-level joint 32-D, seed 1 (64)',
    'B5: system-level joint 40-D, seed 1 (64)'
  ]);
  v['v.S.frozenDailyRegime'] = design('S: joint 8-D, seed 1 (64)').frozenDailyRegime;

  // Traced examples.
  v['t.traced'] = a.E.traced
    .map((example: Json) => {
      const lines = [
        `**${example.parameter} ${example.id.split(':')[1]} (${['maximumHoldDays', 'tickWindowSize', 'continuationWindow'].includes(example.id.split(':')[0]) ? example.value : `${(example.value / 10).toFixed(1)}%`})**`,
        '',
        `- **S:** ${signed(example.S.delta)} (net ${dollars(example.S.net)}). Lots removed: ${example.S.removed.length}; lots added: ${example.S.added.length}; ${example.S.exitChanged} kept their entry but changed exit.`,
        `  - Removed: ${example.S.removed.join('; ') || 'none'}`,
        `  - Added: ${example.S.added.join('; ') || 'none'}`
      ];

      for (const pool of ['B4', 'B5']) {
        const p = example[pool];

        lines.push(
          `- **${pool}:** ${signed(p.delta)} (VGT book ${signed(p.deltaVgt)}, other books ${signed(p.deltaOthers)}).`,
          `  - VGT lots removed: ${p.vgtRemoved.join('; ') || 'none'}`,
          `  - VGT lots added: ${p.vgtAdded.join('; ') || 'none'}`,
          `  - Other books' lots removed: ${p.othersRemoved.join('; ') || 'none'}`,
          `  - Other books' lots added: ${p.othersAdded.join('; ') || 'none'}`
        );
      }

      return lines.join('\n');
    })
    .join('\n\n');

  for (const label of [...sLabels, ...poolMatchedLabels, ...contextLabels, ...systemLabels]) {
    const d = design(label);
    const key = label.split(' (')[0]!.replaceAll(/[^A-Za-z0-9]+/g, '_');

    v[`v.d.${key}.median`] = dollars(d.net.median);
    v[`v.d.${key}.ret`] = percent(d.retention.median);
    v[`v.d.${key}.p10ret`] = percent(d.retention.p10);
    v[`v.d.${key}.worstret`] = percent(d.retention.min);
    v[`v.d.${key}.p10`] = dollars(d.net.p10);
    v[`v.d.${key}.worst`] = dollars(d.net.min);
    v[`v.d.${key}.profitable`] = percent(d.shareProfitable, 0);
    v[`v.d.${key}.above`] = percent(d.shareAbove, 0);
    v[`v.d.${key}.pctile`] = percent(d.frozenPercentile, 0);
    v[`v.d.${key}.daily`] = percent(d.portfolio.daily.median);
    v[`v.d.${key}.dailyMax`] = percent(d.portfolio.daily.max);
    v[`v.d.${key}.daily35`] = percent(d.portfolio.shareDaily35, 0);
    v[`v.d.${key}.daily30`] = percent(d.portfolio.shareDaily30, 0);
    v[`v.d.${key}.minute`] = percent(d.portfolio.minute.median);
    v[`v.d.${key}.endEq`] = dollars(d.portfolio.endEquity.median);
    v[`v.d.${key}.inc`] = signed(d.portfolio.incremental.median);
    v[`v.d.${key}.shift`] = points(d.portfolio.dailyShift, 1);
    v[`v.d.${key}.incMin`] = signed(d.portfolio.incremental.min);
    v[`v.d.${key}.worstLot`] = dollars(d.worstLot);
    v[`v.d.${key}.minuteMax`] = percent(d.portfolio.minute.max);
  }

  // Where S's neighbours' worst daily drawdown falls (the 2022 bear-market stress, R3).
  for (const label of ['S: matched 8-D, both designs (64)', 'S: joint 8-D, both seeds (128)']) {
    const d = design(label);
    const key = label.split(' (')[0]!.replaceAll(/[^A-Za-z0-9]+/g, '_');

    v[`v.d.${key}.r3Share`] = percent((d.portfolio.worstEpisodes['R3 stress'] ?? 0) / d.portfolio.n, 0);
  }

  // ---------- trades, years, regimes ----------
  const tradeRow = (label: string, t: Json) => [
    label,
    t.lots,
    `${t.wins} / ${t.losses}`,
    percent(t.winRate, 0),
    dollars(t.gross),
    dollars(t.interest),
    dollars(t.friction),
    dollars(t.net),
    ratio(t.profitFactor),
    dollars(t.medianNet),
    dollars(t.best),
    dollars(t.worst),
    `${percent(t.top1, 0)} / ${percent(t.top3, 0)} / ${percent(t.top5, 0)} / ${percent(t.top10, 0)}`,
    t.holdingSessions.median,
    integer(t.totalLotDays)
  ];

  v['t.tradeStats'] = table(
    [
      'Ledger (fixed, base)',
      'Lots',
      'Won / lost',
      'Win rate',
      'Gross',
      'Interest',
      'Friction',
      'Net',
      'Profit factor',
      'Median lot',
      'Best lot',
      'Worst lot',
      'Top 1 / 3 / 5 / 10 share',
      'Median hold (sessions)',
      'Lot-days'
    ],
    [
      tradeRow('S (VGT-primary standalone)', T.trades.S),
      tradeRow('B4 (all books)', T.trades.B4),
      tradeRow('B4: VGT book only', T.trades.poolVgtBook.B4),
      tradeRow('B5 (all books)', T.trades.B5),
      tradeRow('B5: VGT book only', T.trades.poolVgtBook.B5)
    ]
  );

  const ledgerRows = (await fs
    .readFile(resultDir('T_trades_VGT-primary_fixed.json'), 'utf8')
    .then((text) => JSON.parse(text))) as Json[];

  v['t.sLedger'] = table(
    [
      '#',
      'Entry (ET)',
      'Exit (ET)',
      'Entry fill',
      'Exit fill',
      'Reason',
      'Gross',
      'Interest',
      'Friction',
      'Net',
      'Cumulative',
      'MAE',
      'MFE',
      'Held (sessions)'
    ],
    ledgerRows.map((row, index) => [
      index + 1,
      row.entryTime.replace('T', ' ').slice(0, 16),
      row.exitTime.replace('T', ' ').slice(0, 16),
      row.entryFill.toFixed(2),
      row.exitFill.toFixed(2),
      row.exitReason,
      dollars(row.gross),
      dollars(row.interest),
      dollars(row.friction),
      dollars(row.net),
      dollars(row.cumulativeNet),
      percent(row.maePercent),
      percent(row.mfePercent),
      row.holdingSessions
    ]),
    ['r', 'l', 'l', 'r', 'r', 'l']
  );

  const st = T.trades.S;

  v['t.reasons'] = table(
    ['Exit reason', 'Lots', 'Won', 'Net'],
    Object.entries(st.byReason).map(([reason, r]: [string, Json]) => [reason, r.count, r.wins, dollars(r.net)])
  );
  v['v.S.lots'] = integer(st.lots);
  v['v.S.wins'] = integer(st.wins);
  v['v.S.losses'] = integer(st.losses);
  v['v.S.top1'] = percent(st.top1);
  v['v.S.top3'] = percent(st.top3);
  v['v.S.top5'] = percent(st.top5);
  v['v.S.top10'] = percent(st.top10);
  v['v.S.exTop3'] = dollars(st.excludingTop['3']);
  v['v.S.exTop5'] = dollars(st.excludingTop['5']);
  v['v.S.best'] = dollars(st.best);
  v['v.S.worst'] = dollars(st.worst);
  v['v.S.profitableStops'] = integer(st.profitableStops);
  v['v.S.maxHoldLosers'] = integer(st.maxHoldLosers);
  v['v.S.maxHoldWinners'] = integer(st.maxHoldWinners);
  v['v.S.worstMae'] = percent(st.worstMae);
  v['v.S.worstMaeDollars'] = dollars(st.worstMaeDollars);
  v['v.S.worstMark'] = dollars(st.worstMark);
  v['v.S.medianMae'] = percent(st.mae.median);
  v['v.S.medianMfe'] = percent(st.mfe.median);
  v['v.S.profitFactor'] = ratio(st.profitFactor);
  v['v.S.medianHold'] = String(st.holdingSessions.median);
  v['v.S.maxHold'] = String(st.holdingSessions.max);
  v['v.B4.top3'] = percent(T.trades.B4.top3);
  v['v.B5.top3'] = percent(T.trades.B5.top3);

  v['t.years'] = table(
    [
      'Year',
      'Note',
      'S fixed MTM (lots entered)',
      'B4 fixed MTM (lots)',
      'B5 fixed MTM (lots)',
      'S portfolio',
      'B4 portfolio',
      'B5 portfolio',
      'C0'
    ],
    T.years.rows.map((row: Json) => [
      row.year,
      row.note,
      `${signed(row['S.fixed'])} (${row['S.lotsEntered']})`,
      `${signed(row['B4.fixed'])} (${row['B4.lotsEntered']})`,
      `${signed(row['B5.fixed'])} (${row['B5.lotsEntered']})`,
      signedPercent(row['S.portfolioReturn']),
      signedPercent(row['B4.portfolioReturn']),
      signedPercent(row['B5.portfolioReturn']),
      signedPercent(row['C0.portfolioReturn'])
    ]),
    ['l', 'l']
  );

  const yearSummaryRow = (who: string) => {
    const y = T.years[who];

    return [
      nameOf(who),
      `${y.top1.year} ${percent(y.top1.share)}`,
      `${y.top2.years.join(' + ')} ${percent(y.top2.share)}`,
      `${y.worst.year} ${signed(y.worst.change)}`,
      y.negativeYears.join(', ') || 'none',
      y.noEntryYears.join(', ') || 'none',
      ['2020', '2022', '2023', '2025', '2026'].map((year) => `${year} ${percent(y.named[year].share)}`).join('; ')
    ];
  };

  v['t.yearSummary'] = table(
    [
      'Ledger',
      'Top year (share)',
      'Top two years',
      'Worst year (eligible, with activity)',
      'Negative years',
      'Years with no lot entered (2017+)',
      'Named years (share of total)'
    ],
    ['S', 'B4', 'B5'].map(yearSummaryRow),
    ['l', 'l', 'l', 'l', 'l', 'l', 'l']
  );
  v['t.loyo'] = table(
    ['Year left out (attribution only)', 'S', 'B4', 'B5'],
    Object.keys(T.years.S.leaveOneOut)
      .filter((year) => year >= '2018')
      .map((year) => [
        year,
        dollars(T.years.S.leaveOneOut[year]),
        dollars(T.years.B4.leaveOneOut[year]),
        dollars(T.years.B5.leaveOneOut[year])
      ])
  );

  for (const who of ['S', 'B4', 'B5']) {
    const y = T.years[who];

    v[`v.${who}.topYear`] = y.top1.year;
    v[`v.${who}.topYearShare`] = percent(y.top1.share);
    v[`v.${who}.top2Share`] = percent(y.top2.share);
    v[`v.${who}.top2Years`] = y.top2.years.join(' + ');
    v[`v.${who}.noEntryYears`] = y.noEntryYears.join(', ') || 'none';

    for (const year of ['2020', '2022', '2023', '2025', '2026']) {
      v[`v.${who}.y${year}`] = signed(y.named[year].change);
      v[`v.${who}.y${year}share`] = percent(y.named[year].share);
    }
  }

  v['t.regimes'] = table(
    [
      'Window',
      'From → to',
      'S fixed (lots)',
      'B4 fixed',
      'B5 fixed',
      'S worst MAE',
      'C0 portfolio',
      'S − C0',
      'B4 − C0',
      'B5 − C0'
    ],
    T.regimes.rows.map((row: Json) => [
      `${row.id} ${row.label}`,
      `${row.from} → ${row.to}`,
      `${signed(row['S.fixedChange'])} (${row['S.lotsEntered']})`,
      signed(row['B4.fixedChange']),
      signed(row['B5.fixedChange']),
      Number.isFinite(row['S.worstMaePercent']) ? percent(row['S.worstMaePercent']) : '—',
      signedPercent(row['C0.portfolioReturn']),
      points(row['S.portfolioExcessOverC0'], 1),
      points(row['B4.portfolioExcessOverC0'], 1),
      points(row['B5.portfolioExcessOverC0'], 1)
    ]),
    ['l', 'l']
  );
  v['t.regimeTotals'] = table(
    ['Regime (stress + rebound)', 'S', 'B4', 'B5'],
    T.regimes.byRegime.map((row: Json) => [
      row.regime,
      signed(row['S.fixedChange']),
      signed(row['B4.fixedChange']),
      signed(row['B5.fixedChange'])
    ])
  );
  v['v.S.largestRegimeShare'] = percent(T.regimes.largestRegimeShare.S);
  v['v.B4.largestRegimeShare'] = percent(T.regimes.largestRegimeShare.B4);
  v['v.B5.largestRegimeShare'] = percent(T.regimes.largestRegimeShare.B5);

  v['t.poolContext'] = table(
    [
      'Pool',
      'VGT funded lots (of S’s 21)',
      'VGT funded net',
      'VGT share of pool net',
      'Pool without VGT: fixed net (lots)',
      'VGT fixed increment',
      'Pool without VGT: end equity',
      'VGT portfolio increment',
      'Without VGT: daily % DD'
    ],
    ['B4', 'B5'].map((pool) => {
      const c = T.poolContext[pool];

      return [
        pool,
        c.vgtFundedLots,
        dollars(c.vgtFundedNet),
        percent(c.vgtShareOfPoolNet),
        `${dollars(c.withoutVgtFixedNet)} (${c.withoutVgtLots})`,
        signed(c.vgtFixedIncrement),
        dollars(c.withoutVgtEndEquity),
        signed(c.vgtPortfolioIncrement),
        pct2(c.withoutVgtDailyPercent)
      ];
    })
  );

  for (const pool of ['B4', 'B5']) {
    const c = T.poolContext[pool];

    v[`v.${pool}.vgtFixedIncrement`] = signed(c.vgtFixedIncrement);
    v[`v.${pool}.vgtPortfolioIncrement`] = signed(c.vgtPortfolioIncrement);
    v[`v.${pool}.vgtFundedNet`] = dollars(c.vgtFundedNet);
  }

  const bootRow = (label: string, b: Json) => [
    label,
    dollars(b.actual),
    dollars(b.median),
    range(dollars(b.p05), dollars(b.p95)),
    range(dollars(b.p25), dollars(b.p75)),
    percent(b.shareNonPositive, 2)
  ];

  v['t.bootstrap'] = table(
    [
      'Series (daily fixed strategy-mark changes)',
      'Actual total',
      'Resampled median',
      'P5 – P95',
      'P25 – P75',
      'Share ≤ 0'
    ],
    [
      bootRow('S', T.bootstrap.S),
      bootRow('B4', T.bootstrap.B4),
      bootRow('B5', T.bootstrap.B5),
      bootRow('B4 − S', T.bootstrap['B4-S']),
      bootRow('B5 − S', T.bootstrap['B5-S'])
    ]
  );
  v['v.boot.S.p05'] = dollars(T.bootstrap.S.p05);
  v['v.boot.B5S.p05'] = dollars(T.bootstrap['B5-S'].p05);
  v['v.boot.B5S.nonPositive'] = percent(T.bootstrap['B5-S'].shareNonPositive, 2);
  v['v.boot.B5S.phrase'] =
    T.bootstrap['B5-S'].shareNonPositive === 0
      ? 'in every one of the 5,000 resamples'
      : `in all but ${percent(T.bootstrap['B5-S'].shareNonPositive, 2)} of resamples`;
  v['v.boot.S.phrase'] =
    T.bootstrap.S.shareNonPositive === 0
      ? 'in every resample'
      : `in all but ${percent(T.bootstrap.S.shareNonPositive, 2)} of resamples`;
  v['v.boot.B4S.nonPositive'] = percent(T.bootstrap['B4-S'].shareNonPositive, 2);

  // ---------- costs ----------
  const scenarios = [...new Set(C.rows.map((row: Json) => row.scenario))] as string[];

  v['t.costsFixed'] = table(
    [
      'Scenario',
      'S net (Δ)',
      'S lots +/− (exits changed)',
      'S same-trade re-cost / path effect',
      'B4 net (Δ)',
      'B4 lots +/−',
      'B5 net (Δ)',
      'B5 lots +/−'
    ],
    scenarios.map((id) => {
      const s = cost('S', id);
      const b4 = cost('B4', id);
      const b5 = cost('B5', id);

      return [
        `${id}: ${s.label}`,
        `${dollars(s.fixedNet)} (${signedPercent(s.fixedChange)})`,
        `+${s.lotsAdded}/−${s.lotsRemoved} (${s.exitChanged})`,
        `${dollars(s.sameTradeRecost)} / ${signed(s.pathEffect)}`,
        `${dollars(b4.fixedNet)} (${signedPercent(b4.fixedChange)})`,
        `+${b4.lotsAdded}/−${b4.lotsRemoved}`,
        `${dollars(b5.fixedNet)} (${signedPercent(b5.fixedChange)})`,
        `+${b5.lotsAdded}/−${b5.lotsRemoved}`
      ];
    }),
    ['l']
  );
  v['t.costsRisk'] = table(
    ['Scenario', 'S fixed minute DD', 'S net ÷ minute DD (Δ)', 'B4 net ÷ DD (Δ)', 'B5 net ÷ DD (Δ)'],
    scenarios.map((id) => {
      const s = cost('S', id);
      const b4 = cost('B4', id);
      const b5 = cost('B5', id);

      return [
        id,
        dollars(s.minuteDD),
        `${s.netPerMinuteDD.toFixed(2)} (${signedPercent(s.netPerMinuteDDChange)})`,
        `${b4.netPerMinuteDD.toFixed(2)} (${signedPercent(b4.netPerMinuteDDChange)})`,
        `${b5.netPerMinuteDD.toFixed(2)} (${signedPercent(b5.netPerMinuteDDChange)})`
      ];
    })
  );
  v['t.costsPortfolio'] = table(
    [
      'Scenario',
      'S end equity (vs C0)',
      'S daily / minute % DD',
      'B4 end equity (vs C0)',
      'B4 daily / minute',
      'B5 end equity (vs C0)',
      'B5 daily / minute'
    ],
    scenarios.map((id) => {
      const s = cost('S', id);
      const b4 = cost('B4', id);
      const b5 = cost('B5', id);
      const cell = (row: Json) => `${dollars(row.endEquity)} (${signed(row.incremental)})`;
      const dd = (row: Json) => `${pct2(row.dailyPercent)} / ${pct2(row.minutePercent)}`;

      return [id, cell(s), dd(s), cell(b4), dd(b4), cell(b5), dd(b5)];
    })
  );

  for (const who of ['S', 'B4', 'B5']) {
    for (const id of ['C1', 'C2', 'C3', 'r18', 'f30', 'f45', 's100', 'nxo', 'f10', 'r14']) {
      const row = cost(who, id);

      v[`v.cost.${who}.${id}`] = dollars(row.fixedNet);
      v[`v.cost.${who}.${id}.change`] = signedPercent(row.fixedChange);
      v[`v.cost.${who}.${id}.inc`] = signed(row.incremental);
      v[`v.cost.${who}.${id}.path`] = signed(row.pathEffect);
      v[`v.cost.${who}.${id}.daily`] = pct2(row.dailyPercent);
      v[`v.cost.${who}.${id}.minute`] = pct2(row.minutePercent);
    }
  }

  const minS = Math.min(...C.rows.filter((row: Json) => row.structure === 'S').map((row: Json) => row.fixedNet));
  const minSInc = Math.min(...C.rows.filter((row: Json) => row.structure === 'S').map((row: Json) => row.incremental));

  v['v.cost.S.minNet'] = dollars(minS);
  v['v.cost.S.minInc'] = signed(minSInc);

  // ---------- portfolio ----------
  v['t.portfolio'] = table(
    [
      'Configuration',
      'End equity',
      'Total return',
      'CAGR',
      'vs C0 (wealth)',
      'vs C0 (CAGR)',
      'Max daily % DD ($ at that depth)',
      'Max minute % DD ($)',
      'Δ daily / minute vs C0',
      'Worst episode: peak → trough → recovery'
    ],
    ['S', 'B4', 'B5', 'C0'].map((who) => {
      const r = port(who);

      return [
        nameOf(who),
        dollars(r.endEquity),
        percent(r.totalReturn, 0),
        percent(r.cagr, 2),
        signed(r.incremental),
        points(r.incrementalCagr, 2),
        `${pct2(r.dailyPercent)} (${dollars(r.dailyPercentDollars)})`,
        `${pct2(r.minutePercent)} (${dollars(r.minutePercentDollars)})`,
        `${points(r.incrementalDaily)} / ${points(r.incrementalMinute)}`,
        `${r.dailyPercentPeak} → ${r.dailyPercentTrough} → ${r.dailyPercentRecovery || 'not recovered'}`
      ];
    })
  );
  v['t.episodes'] = table(
    [
      'Configuration',
      'Rank',
      'Peak → trough',
      'Recovery',
      'Depth',
      '$ at depth',
      'Sessions to trough',
      'Sessions under water'
    ],
    ['S', 'B4', 'B5', 'C0'].flatMap((who) =>
      port(who)
        .episodes.slice(0, 3)
        .map((e: Json, index: number) => [
          nameOf(who),
          index + 1,
          `${e.peakDate} → ${e.troughDate}`,
          e.recoveryDate || 'not recovered',
          pct2(e.depthPercent),
          dollars(e.depthDollars),
          e.sessionsToTrough,
          e.sessionsUnderwater
        ])
    )
  );
  v['t.efficiency'] = table(
    [
      'Configuration',
      'Fixed net',
      'Lots',
      'Lot-days',
      'Time with a lot',
      'Net per lot',
      'Fixed net per $1M borrowing-days',
      'Net ÷ fixed minute DD',
      'Portfolio borrowing-days ($M)',
      'Portfolio wealth vs C0 per $1M borrowing-days',
      'Δ CAGR per pp of max daily DD',
      'Max principal (÷ equity)'
    ],
    ['S', 'B4', 'B5'].map((who) => {
      const f = R.fixed[who];
      const r = port(who);

      return [
        nameOf(who),
        dollars(f.net),
        f.lots,
        integer(f.lotDays),
        percent(f.exposure, 0),
        dollars(f.netPerLot),
        dollars(f.netPerMillionDollarDays),
        f.netPerMinuteDD.toFixed(2),
        integer(r.borrowingDollarDays / 1e6),
        dollars(r.incrementalPerMillionDollarDays),
        `${(r.incrementalCagrPerDailyPoint * 100).toFixed(3)} pp`,
        `${dollars(r.maxPrincipal)} (${percent(r.maxDebtToEquity, 1)})`
      ];
    })
  );
  v['t.margin'] = table(
    ['Configuration', ...['U35', 'U50', 'U60', 'L50', 'L60', 'G50', 'G60']],
    ['S', 'B4', 'B5', 'C0'].map((who) => [
      nameOf(who),
      ...['U35', 'U50', 'U60', 'L50', 'L60', 'G50', 'G60'].map((schedule) => {
        const m = port(who).minimum[schedule];

        return m && Number.isFinite(m.ratio) ? `${m.ratio.toFixed(2)}×` : 'n/a';
      })
    ])
  );
  v['t.duplication'] = table(
    [
      'Configuration',
      'Mean VGT share of long market value',
      'Max VGT share',
      'Mean while a VGT lot is open',
      'Max VGT exposure ÷ equity',
      'Max VGT lot ÷ equity',
      'Sessions with a VGT lot'
    ],
    ['C0', 'S', 'B4', 'B5'].map((who) => {
      const d = R.duplication[who];

      return [
        nameOf(who),
        percent(d.meanVgtShareOfLmv),
        percent(d.maxVgtShareOfLmv),
        Number.isFinite(d.meanVgtShareWhileVgtLotOpen) ? percent(d.meanVgtShareWhileVgtLotOpen) : '—',
        percent(d.maxVgtExposureToEquity),
        percent(d.maxVgtLotToEquity),
        integer(d.sessionsWithVgtLot)
      ];
    })
  );
  v['t.sStress'] = table(
    ['S portfolio', 'End equity', 'vs C0', 'Daily % DD', 'Minute % DD'],
    [
      [
        'base',
        dollars(port('S').endEquity),
        signed(port('S').incremental),
        pct2(port('S').dailyPercent),
        pct2(port('S').minutePercent)
      ],
      ...R.sStress.map((row: Json) => [
        row.scenario,
        dollars(row.endEquity),
        signed(row.incremental),
        pct2(row.dailyPercent),
        pct2(row.minutePercent)
      ]),
      [
        'symmetric dividends',
        dollars(R.sSymmetric.endEquity),
        signed(R.sSymmetric.incremental),
        pct2(R.sSymmetric.dailyPercent),
        pct2(R.sSymmetric.minutePercent)
      ]
    ]
  );
  v['v.S.lotDividends'] = dollars(R.sSymmetric.lotDividends);

  for (const who of ['S', 'B4', 'B5', 'C0']) {
    const r = port(who);

    v[`v.${who}.endEquity`] = dollars(r.endEquity);
    v[`v.${who}.inc`] = signed(r.incremental);
    v[`v.${who}.daily`] = pct2(r.dailyPercent);
    v[`v.${who}.minute`] = pct2(r.minutePercent);
    v[`v.${who}.cagr`] = percent(r.cagr, 2);
    v[`v.${who}.incDaily`] = points(r.incrementalDaily);
    v[`v.${who}.incMinute`] = points(r.incrementalMinute);
    v[`v.${who}.dailyTrough`] = r.dailyPercentTrough;
    v[`v.${who}.dailyPeak`] = r.dailyPercentPeak;
    v[`v.${who}.dailyRecovery`] = r.dailyPercentRecovery;
  }

  for (const who of ['S', 'B4', 'B5']) {
    const f = R.fixed[who];
    const r = port(who);

    v[`v.${who}.fixedNet`] = dollars(f.net);
    v[`v.${who}.fixedLots`] = integer(f.lots);
    v[`v.${who}.fixedMinuteDD`] = dollars(f.minuteDD);
    v[`v.${who}.perMillion`] = dollars(f.netPerMillionDollarDays);
    v[`v.${who}.perLot`] = dollars(f.netPerLot);
    v[`v.${who}.exposure`] = percent(f.exposure, 0);
    v[`v.${who}.netPerDD`] = f.netPerMinuteDD.toFixed(2);
    v[`v.${who}.portPerMillion`] = dollars(r.incrementalPerMillionDollarDays);
    v[`v.${who}.worstLot`] = dollars(f.worstLot);
  }

  v['v.S.secondEpisode'] =
    `${port('S').episodes[1].peakDate} → ${port('S').episodes[1].troughDate}, ${pct2(port('S').episodes[1].depthPercent)}`;
  v['v.dup.C0.max'] = percent(R.duplication.C0.maxVgtShareOfLmv);
  v['v.dup.S.max'] = percent(R.duplication.S.maxVgtShareOfLmv);
  v['v.dup.S.open'] = percent(R.duplication.S.meanVgtShareWhileVgtLotOpen);
  v['v.dup.S.exposure'] = percent(R.duplication.S.maxVgtExposureToEquity);

  // ---------- flags and decisions ----------
  const flagRow = (who: string) => {
    const f = F[who];

    return [
      nameOf(who),
      `${flag(f.W1.raised)} (top year ${f.W1.topYear.year} ${percent(f.W1.topYear.share)}; top-3 lots ${percent(f.W1.top3)})`,
      `${flag(f.W2.raised)} (${f.W2.lots} lots)`,
      `${flag(f.W3.raised)} (C1 ${signedPercent(f.W3.c1Change)}; net ÷ DD ${signedPercent(f.W3.c1NetPerDDChange)})`,
      `${flag(f.W4.raised)} (${f.W4.matched.map((m: Json) => `${m.design.replace(/^S: /, '')}: ${percent(m.shareProfitable, 0)} profitable, median ${percent(m.medianRetention)}`).join('; ')})${f.W4.systemLevel.length ? `; system-level joint: ${f.W4.systemLevel.map((m: Json) => `${flag(m.raised)} (median ${percent(m.medianRetention)})`).join('')}` : ''}`,
      `D35 ${flag(f.W5.D35)}, D30 ${flag(f.W5.D30)}, D+ ${flag(f.W5.Dplus)} (base ${pct2(f.W5.baseDaily)} / ${pct2(f.W5.baseMinute)}; worst of base/C1–C3 ${pct2(f.W5.maxDaily)} / ${pct2(f.W5.maxMinute)})`,
      flag(f.W6.raised),
      `${flag(f.W7.raised)} (${f.W7.matched.map((m: Json) => `${m.design.replace(/^S: /, '')}: median ${percent(m.medianDaily)}`).join('; ')})${f.W7.systemLevel.length ? `; system-level joint: ${f.W7.systemLevel.map((m: Json) => `${flag(m.raised)} (${percent(m.medianDaily)})`).join('')}` : ''}`
    ];
  };

  v['t.flags'] = table(
    [
      'Configuration',
      'W1 Concentration',
      'W2 Low trade count',
      'W3 Cost fragility',
      'W4 Matched-parameter fragility',
      'W5 Portfolio drawdown',
      'W6 Unmodelled margin',
      'W7 Neighbourhood drawdown'
    ],
    ['S', 'B4', 'B5'].map(flagRow),
    ['l', 'l', 'l', 'l', 'l', 'l', 'l', 'l']
  );

  v['t.decisionA'] = table(
    ['Condition (PROTOCOL.md §11a)', 'Holds'],
    Object.entries(D.a.conditions).map(([key, value]) => [key, yes(value as boolean)]),
    ['l', 'l']
  );
  v['v.decision.a'] = D.a.outcome;
  v['v.decision.c'] = D.c.outcome;
  v['v.decision.overall'] = D.overall.outcome;
  v['t.decisionRules'] = table(
    ['Rule (PROTOCOL.md §11, overall)', 'Condition', 'Seed 1 (the rule)', 'Seed 2 (sensitivity)'],
    [
      ...Object.keys(D.overall.b5Rule).map((key) => [
        'B5 preferable',
        key,
        yes(D.overall.b5Rule[key]),
        yes(D.seed2Sensitivity.b5Rule[key])
      ]),
      ...Object.keys(D.overall.sRule).map((key) => [
        'Standalone preferable',
        key,
        yes(D.overall.sRule[key]),
        yes(D.seed2Sensitivity.sRule[key])
      ])
    ],
    ['l', 'l', 'l', 'l']
  );

  const inputs = D.overall.inputs;

  v['v.in.sIncFrozen'] = signed(inputs.sIncremental.frozen);
  v['v.in.sIncNbhd'] = signed(inputs.sIncremental.neighbourhood);
  v['v.in.b5IncFrozen'] = signed(inputs.b5Incremental.frozen);
  v['v.in.b5IncNbhd'] = signed(inputs.b5Incremental.neighbourhood);
  v['v.in.sDaily'] = pct2(inputs.sNeighbourhoodMedianDaily);
  v['v.in.b5Daily'] = pct2(inputs.b5NeighbourhoodMedianDaily);
  v['v.in.margin'] = pp(inputs.b5NeighbourhoodMedianDaily - inputs.sNeighbourhoodMedianDaily - 0.01);
  v['v.in.gap'] = pp(inputs.b5NeighbourhoodMedianDaily - inputs.sNeighbourhoodMedianDaily);
  v['v.s2.sDaily'] = pct2(D.seed2Sensitivity.sMedianDaily);
  v['v.s2.b5Daily'] = pct2(D.seed2Sensitivity.b5MedianDaily);
  v['v.s2.sInc'] = signed(D.seed2Sensitivity.sIncremental);
  v['v.s2.b5Inc'] = signed(D.seed2Sensitivity.b5Incremental);
  v['v.s2.gap'] = pp(D.seed2Sensitivity.b5MedianDaily - D.seed2Sensitivity.sMedianDaily);
  v['v.seedShift.B5'] = pp(Math.abs(D.seed2Sensitivity.b5MedianDaily - inputs.b5NeighbourhoodMedianDaily));
  v['v.seedShift.S'] = pp(Math.abs(D.seed2Sensitivity.sMedianDaily - inputs.sNeighbourhoodMedianDaily));
  v['v.c.matchedDaily'] = pct2(design('S: matched 8-D, both designs (64)').portfolio.daily.median);
  v['v.c.limit'] = pct2(port('C0').dailyPercent + 0.02);

  // The headline comparison table.
  const sj = design('S: joint 8-D, seed 1 (64)');
  const sm = design('S: matched 8-D, both designs (64)');
  const b4j = design('B4: system-level joint 32-D, seed 1 (64)');
  const b5j = design('B5: system-level joint 40-D, seed 1 (64)');
  const b4v = design('B4: 8-D, VGT book only (32)');
  const b5v = design('B5: 8-D, VGT book only (32)');

  v['t.headline'] = table(
    ['Measure (inspected 2016-01-04 → 2026-10-13; retrospective)', 'S: VGT-primary standalone', 'B4', 'B5'],
    [
      ['Tunable D1 parameters', '8', '32', '40'],
      [
        'Fixed $100k: net / max minute DD / funded lots',
        `${dollars(sFixed.net)} / ${dollars(sFixed.minuteDD)} / ${sFixed.lots}`,
        `${dollars(b4Fixed.net)} / ${dollars(b4Fixed.minuteDD)} / ${b4Fixed.lots}`,
        `${dollars(b5Fixed.net)} / ${dollars(b5Fixed.minuteDD)} / ${b5Fixed.lots}`
      ],
      [
        'Fixed net per $1M borrowing dollar-days; net per lot',
        `${dollars(sFixed.netPerMillionDollarDays)}; ${dollars(sFixed.netPerLot)}`,
        `${dollars(b4Fixed.netPerMillionDollarDays)}; ${dollars(b4Fixed.netPerLot)}`,
        `${dollars(b5Fixed.netPerMillionDollarDays)}; ${dollars(b5Fixed.netPerLot)}`
      ],
      [
        'Matched 8-D (VGT parameters only): median ÷ own frozen; P10',
        `${percent(sm.retention.median)}; ${percent(sm.retention.p10)}`,
        `${percent(b4v.retention.median)}; ${percent(b4v.retention.p10)}`,
        `${percent(b5v.retention.median)}; ${percent(b5v.retention.p10)}`
      ],
      [
        'Own full neighbourhood (S 8-D; pools 32/40-D), seed 1: median net (÷ frozen)',
        `${dollars(sj.net.median)} (${percent(sj.retention.median)})`,
        `${dollars(b4j.net.median)} (${percent(b4j.retention.median)})`,
        `${dollars(b5j.net.median)} (${percent(b5j.retention.median)})`
      ],
      [
        'Fixed net under C1 / C3 (Δ)',
        `${dollars(cost('S', 'C1').fixedNet)} (${signedPercent(cost('S', 'C1').fixedChange)}) / ${dollars(cost('S', 'C3').fixedNet)} (${signedPercent(cost('S', 'C3').fixedChange)})`,
        `${dollars(cost('B4', 'C1').fixedNet)} (${signedPercent(cost('B4', 'C1').fixedChange)}) / ${dollars(cost('B4', 'C3').fixedNet)} (${signedPercent(cost('B4', 'C3').fixedChange)})`,
        `${dollars(cost('B5', 'C1').fixedNet)} (${signedPercent(cost('B5', 'C1').fixedChange)}) / ${dollars(cost('B5', 'C3').fixedNet)} (${signedPercent(cost('B5', 'C3').fixedChange)})`
      ],
      [
        'Top year (share); top-3 lots share',
        `${T.years.S.top1.year} (${percent(T.years.S.top1.share)}); ${percent(T.trades.S.top3)}`,
        `${T.years.B4.top1.year} (${percent(T.years.B4.top1.share)}); ${percent(T.trades.B4.top3)}`,
        `${T.years.B5.top1.year} (${percent(T.years.B5.top1.share)}); ${percent(T.trades.B5.top3)}`
      ],
      [
        'Portfolio end equity (C0 $2,279,769) / vs C0',
        `${dollars(port('S').endEquity)} / ${signed(port('S').incremental)}`,
        `${dollars(port('B4').endEquity)} / ${signed(port('B4').incremental)}`,
        `${dollars(port('B5').endEquity)} / ${signed(port('B5').incremental)}`
      ],
      [
        'Portfolio max daily / minute % DD (C0 33.89% / 35.76%)',
        `${pct2(port('S').dailyPercent)} / ${pct2(port('S').minutePercent)}`,
        `${pct2(port('B4').dailyPercent)} / ${pct2(port('B4').minutePercent)}`,
        `${pct2(port('B5').dailyPercent)} / ${pct2(port('B5').minutePercent)}`
      ],
      [
        'Own full neighbourhood, seed 1: median vs C0; median daily % DD; share daily > 35%',
        `${signed(sj.portfolio.incremental.median)}; ${percent(sj.portfolio.daily.median)}; ${percent(sj.portfolio.shareDaily35, 0)}`,
        `${signed(b4j.portfolio.incremental.median)}; ${percent(b4j.portfolio.daily.median)}; ${percent(b4j.portfolio.shareDaily35, 0)}`,
        `${signed(b5j.portfolio.incremental.median)}; ${percent(b5j.portfolio.daily.median)}; ${percent(b5j.portfolio.shareDaily35, 0)}`
      ],
      [
        'Portfolio wealth vs C0 per $1M borrowing dollar-days',
        dollars(port('S').incrementalPerMillionDollarDays),
        dollars(port('B4').incrementalPerMillionDollarDays),
        dollars(port('B5').incrementalPerMillionDollarDays)
      ]
    ],
    ['l', 'r', 'r', 'r']
  );

  return v;
};
