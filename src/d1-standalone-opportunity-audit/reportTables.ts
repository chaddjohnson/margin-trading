// Placeholders of the Stage C–D and verdict reports, computed from results/analysis.json (and the catalog, parity and
// census records). Report-only formatting: it reads records and never runs, scores or classifies anything (the
// classification is analysis.json's, from the bound standing.ts).
import fs from 'fs-extra';
import { analysisFile } from './analysis.ts';
import { catalogFile } from './catalogs.ts';
import { fullHistoryAnchors, readJson, resultDir } from './context.ts';
import { cents, dollars, fixed, percent, table } from './tables.ts';

type Any = any;

const order = (ids: string[]) => {
  const controls = ['VGT-primary', 'VGT:research-representative'];

  return [...controls.filter((id) => ids.includes(id)), ...ids.filter((id) => !controls.includes(id))];
};

const label = (id: string) =>
  id === 'VGT-primary'
    ? 'VGT primary (control)'
    : id === 'VGT:research-representative'
      ? 'VGT research rep. (procedure-matched control)'
      : id;

const build = async (): Promise<Record<string, string>> => {
  if (!(await fs.pathExists(analysisFile))) {
    throw new Error(`${analysisFile} does not exist: run analyze first`);
  }

  const a: Any = await readJson(analysisFile);
  const catalog: Any = await readJson(catalogFile);
  const baseParity: Any = await readJson(resultDir('parity', 'BASE_PARITY.json'));
  const ids = order(Object.keys(a.phenotypes));
  const p = (id: string) => a.phenotypes[id];
  const s = (id: string) => a.standings[id];
  const v: Record<string, string> = {};
  const inc = (id: string, scenario = 'base') => a.incumbents[id].find((row: Any) => row.scenario === scenario);

  v['cmp.window'] =
    `${a.window.first} → ${a.window.end} (${a.window.sessions} sessions; books armed ${a.window.arming})`;
  v['cmp.baseParity'] = `${baseParity.passed}/${baseParity.passed + baseParity.failed}`;

  // ----- same-window comparison -----

  v['cmp.sameWindow'] = table(
    [
      'Configuration',
      'fixed net',
      'lots',
      'min. DD ($ / % of $100k)',
      'worst lot',
      'net @10 bps',
      'net @C1',
      'net per $1M $-days',
      'portfolio end equity',
      'over C0',
      'portfolio daily / minute DD'
    ],
    [
      ...ids.map((id) => {
        const r = p(id);
        const f10 = r.costRows.find((row: Any) => row.scenario === 'f10');

        return [
          label(id),
          dollars(r.base.view.net),
          r.base.view.trades,
          `${dollars(r.base.view.minuteDrawdown)} / ${percent(r.base.minutePercentOf100k)}`,
          dollars(r.tails.worstLot),
          dollars(f10.net),
          dollars(r.costs.C1.net),
          dollars(r.tails.netPerMillionDollarDays),
          dollars(r.portfolio.endEquity),
          dollars(r.portfolio.incremental),
          `${percent(r.portfolio.dailyPercent)} / ${percent(r.portfolio.minutePercent)}`
        ];
      }),
      ...['B4', 'B5'].map((id) => {
        const r = inc(id);

        return [
          `${id} (pool)`,
          dollars(r.net),
          r.lots,
          `${dollars(r.minuteDrawdown)} / ${percent(r.minuteDrawdown / 100000)}`,
          dollars(r.worstLot),
          dollars(inc(id, 'f10').net),
          dollars(inc(id, 'C1').net),
          dollars(r.netPerMillionDollarDays),
          dollars(r.endEquity),
          dollars(r.incremental),
          `${percent(r.dailyPercent)} / ${percent(r.minutePercent)}`
        ];
      }),
      [
        'C0 (core, no margin)',
        '—',
        '—',
        '—',
        '—',
        '—',
        '—',
        '—',
        dollars(a.c0.endEquity),
        '—',
        `${percent(a.c0.dailyPercent)} / ${percent(a.c0.minutePercent)}`
      ]
    ]
  );
  v['cmp.full'] = table(
    [
      'Full history 2016-01-04 → 2026-10-13 (context only; T-2024)',
      'fixed net',
      'min. DD',
      'lots',
      'portfolio end equity',
      'daily / minute DD'
    ],
    (['S', 'B4', 'B5'] as const)
      .map((id) => {
        const r = fullHistoryAnchors[id];

        return [
          id === 'S' ? 'VGT primary' : id,
          cents(r.net),
          cents(r.minuteDrawdown),
          r.lots,
          cents(r.endEquity),
          `${percent(r.daily, 2)} / ${percent(r.minute, 2)}`
        ];
      })
      .concat([
        [
          'C0',
          '—',
          '—',
          '—',
          cents(fullHistoryAnchors.C0.endEquity),
          `${percent(fullHistoryAnchors.C0.daily, 2)} / ${percent(fullHistoryAnchors.C0.minute, 2)}`
        ]
      ])
  );

  // ----- standings -----

  const flagCell = (flags: Any) =>
    Object.entries(flags)
      .filter(([, value]) => value !== false && value !== 'pass')
      .map(([key, value]) => (value === true ? key : `${key} (${value})`))
      .join(', ') || '—';
  const axisCell = (axes: Any) =>
    ['jointMedianNet', 'jointProfitableShare', 'dipFamilies']
      .map((key) => (axes.axes[key].strictly ? '>' : axes.axes[key].met ? '=' : '<'))
      .join(' ');

  v['cmp.standings'] = table(
    [
      'Phenotype',
      'flags raised',
      'blocking',
      'axes vs VGT primary (median, share, families)',
      'axes vs procedure-matched',
      'standing',
      'stronger than VGT?'
    ],
    ids.map((id) => {
      const st = s(id);

      return [
        label(id),
        flagCell(st.flags),
        st.blocking.join(', ') || '—',
        `${axisCell(st.versusPrimary)} (${st.versusPrimary.met}/3)`,
        `${axisCell(st.versusMatched)} (${st.versusMatched.met}/3)`,
        st.standing,
        st.stronger ? 'yes' : 'no'
      ];
    })
  );
  v['cmp.etfs'] = table(
    [
      'ETF',
      'slot',
      'cluster',
      'representative',
      'alternative-1',
      'alternative corroborates',
      'ETF standing',
      'stronger than VGT',
      'prospective observation'
    ],
    Object.entries(a.etfs).map(([symbol, e]: [string, Any]) => [
      symbol,
      e.slot,
      e.cluster,
      e.representative,
      e.alternative ?? '—',
      e.corroborated ? 'yes' : 'no',
      e.standing,
      e.stronger ? 'yes' : 'no',
      e.observation ? 'suggested (research-only)' : 'no'
    ])
  );
  v['cmp.flagCounts'] = table(
    ['Flag', 'phenotypes raising it (of 19 candidates)'],
    ['F1', 'F2', 'F3', 'F4', 'F5', 'F6', 'F7', 'F8', 'F9', 'F10'].map((flag) => {
      const raising = ids
        .filter((id) => !id.startsWith('VGT'))
        .filter((id) => {
          const value = s(id).flags[flag];

          return value !== false && value !== 'pass';
        });

      return [flag, `${raising.length}: ${raising.join(', ') || '—'}`];
    })
  );

  // ----- neighbourhoods -----

  const nbRow = (id: string, design: string) => {
    const n = p(id).neighbourhoods[design];

    return [
      label(id),
      design,
      n.n,
      dollars(n.net.median),
      dollars(n.net.p10),
      dollars(n.net.p90),
      dollars(n.net.worst),
      percent(n.shareProfitable, 0),
      percent(n.shareHalfOfBase, 0),
      fixed(n.retention.median),
      percent(n.shareDdWithinCeiling, 0),
      dollars(n.minuteDrawdown.median),
      dollars(n.netPerMillionDollarDays.median),
      percent(n.portfolio.dailyPercent.median),
      percent(n.portfolio.shareAbove35, 0)
    ];
  };
  const nbHeader = [
    'Phenotype',
    'design',
    'N',
    'median net',
    'P10',
    'P90',
    'worst',
    'net > 0',
    '≥ 50% of base',
    'median retention',
    'DD ≤ $35k',
    'median min. DD',
    'median per $1M $-days',
    'median port. daily DD',
    'port. DD > 35%'
  ];

  v['nb.pooled'] = table(
    nbHeader,
    ids.map((id) => nbRow(id, 'jointPooled'))
  );
  v['nb.seeds'] = table(
    nbHeader,
    ids.flatMap((id) => [nbRow(id, 'jointSeed1'), nbRow(id, 'jointSeed2')])
  );
  v['nb.oat'] = table(
    nbHeader,
    ids.map((id) => nbRow(id, 'oat'))
  );
  v['nb.oatDetail'] = table(
    ['Phenotype', 'parameter', '−m', '−s', '+s', '+m'],
    ids.flatMap((id) =>
      [
        'targetPercentChange',
        'trailingBuyPercentage',
        'trailingStopPercentage',
        'maximumHoldDays',
        'tickWindowSize',
        'intradayLossBuffer',
        'pullback',
        'continuationWindow'
      ].map((key) => [
        label(id),
        key,
        ...['-m', '-s', '+s', '+m'].map((offset) => {
          const row = p(id).oatTable.find((item: Any) => item.parameter === key && item.offset === offset);

          return !row.feasible
            ? `truncated (${row.value})`
            : `${row.value} → ${fixed(row.retention)}${row.insideSourceBox ? '' : '†'}`;
        })
      ])
    )
  );

  // ----- catalog and capture -----

  v['ev.catalog'] = table(
    [
      'ETF',
      'realised vol.',
      'eligible episodes',
      'by band 10-15 / 15-20 / 20-30 / 30+',
      'major',
      'eligible families',
      'major families',
      'coverage'
    ],
    Object.entries(catalog.symbols).map(([symbol, c]: [string, Any]) => {
      const eligible = c.episodes.filter((e: Any) => e.eligible);

      return [
        symbol,
        percent(c.volatility),
        eligible.length,
        ['10-15', '15-20', '20-30', '30+']
          .map((band) => eligible.filter((e: Any) => e.band === band).length)
          .join(' / '),
        c.counts.major,
        c.counts.eligibleFamilies,
        c.counts.eligibleMajorFamilies,
        percent(c.coverage, 0)
      ];
    })
  );
  v['ev.families'] = Object.entries(catalog.symbols)
    .map(([symbol, c]: [string, Any]) => {
      const rows = c.families
        .filter((f: Any) => f.eligible)
        .map(
          (f: Any) => `${f.id} ${f.firstPeakDate}→${f.lastEndDate} (${percent(f.depth, 0)}${f.major ? ', major' : ''})`
        );

      return `- **${symbol}:** ${rows.join('; ')}`;
    })
    .join('\n');
  v['ev.summary'] = table(
    [
      'Phenotype',
      'lots (dip / in episodes / outside)',
      'independent dip events (dip families / eligible)',
      'major dip families (M)',
      'neighbour capture median (seed 1 / 2)',
      'top winner kept by',
      'falling-knife losses',
      'lots MAE ≤ −10%',
      'deep / continuation lots (net)'
    ],
    ids.map((id) => {
      const r = p(id);
      const w = r.winnerPersistence[0];

      return [
        label(id),
        `${r.base.view.trades} (${r.tails.dipLots} / ${r.base.view.trades - r.tails.outsideLots} / ${r.tails.outsideLots})`,
        `${r.dipFamilies} (${r.dipFamilies126} / ${r.catalog.eligibleFamilies})`,
        `${r.majorDipFamilies.length}: ${r.majorDipFamilies.join(' ') || '—'}`,
        `${percent(r.neighbourCapture.median, 0)} (${percent(r.neighbourCapture.seed1, 0)} / ${percent(r.neighbourCapture.seed2, 0)})`,
        w ? `${percent(w.keptShare, 0)} (${dollars(w.net)}, ${w.entryDate}${w.episode ? `, ${w.episode}` : ''})` : '—',
        `${r.tails.losingDeclineEntries} (${dollars(r.tails.losingDeclineNet)})`,
        r.tails.lotsMaeBeyond10,
        `${r.tails.setups.deep.lots} (${dollars(r.tails.setups.deep.net)}) / ${r.tails.setups.continuation.lots} (${dollars(r.tails.setups.continuation.net)})`
      ];
    })
  );
  v['ev.capture'] = ids
    .map((id) => {
      const r = p(id);
      const rows = r.perEpisode
        .filter((e: Any) => e.episode.eligible)
        .map((e: Any) => [
          e.episode.id,
          `${e.episode.peakDate} → ${e.episode.troughDate}`,
          `${percent(e.episode.depth, 0)}${e.shallowerThanX ? ' (< X)' : ''}`,
          e.episode.family.split('-').at(-1),
          e.base.outcome + (e.base.dipCaptured ? ' (dip)' : ''),
          e.base.entries > 0 ? dollars(e.base.net) : '—',
          percent(e.joint.captured, 0),
          percent(e.joint.dipCaptured, 0),
          percent(e.joint.enteredLoss, 0),
          percent(e.joint.inPosition, 0),
          percent(e.joint.notArmed + e.joint.armedNoEntry, 0),
          `${dollars(e.joint.net.median)} [${dollars(e.joint.net.p10)}, ${dollars(e.joint.net.p90)}]`,
          Number.isFinite(e.joint.offsetIqr) ? fixed(e.joint.offsetIqr, 0) : '—'
        ]);

      return `### ${label(id)}\n\n${table(['Episode', 'peak → trough', 'depth', 'family', 'base outcome', 'base net', 'joint captured', 'joint dip-captured', 'joint loss', 'joint in position', 'joint no entry', 'joint episode net median [P10, P90]', 'entry-offset IQR (sessions)'], rows)}`;
    })
    .join('\n\n');

  // ----- costs and tails -----

  const scenarios = ['base', 'f00', 'f10', 'f20', 'f45', 'r14', 'r18', 's50', 's100', 'nxo', 'C1', 'C2', 'C3'];

  v['cost.net'] = table(
    ['Phenotype', ...scenarios],
    ids
      .map((id) => [
        label(id),
        ...scenarios.map((scenario) => dollars(p(id).costRows.find((row: Any) => row.scenario === scenario).net))
      ])
      .concat(
        ['B4', 'B5'].map((id) => [`${id} (pool)`, ...scenarios.map((scenario) => dollars(inc(id, scenario).net))])
      )
  );
  v['cost.paths'] = table(
    ['Phenotype', 'lots changed vs base: f10 / f20 / C1 / C3', 'min. DD at C1', 'C1 ÷ base', 'port. over C0 at C1'],
    ids.map((id) => {
      const rows = (scenario: string) => p(id).costRows.find((row: Any) => row.scenario === scenario);

      return [
        label(id),
        ['f10', 'f20', 'C1', 'C3'].map((scenario) => rows(scenario).lotsChanged).join(' / '),
        dollars(rows('C1').minuteDrawdown),
        fixed(rows('C1').ratio),
        dollars(rows('C1').incremental)
      ];
    })
  );
  v['cost.tails'] = table(
    [
      'Phenotype',
      'wins / losses',
      'avg win / avg loss',
      'profit factor',
      'best / worst lot',
      'worst MAE (P10)',
      'top-1 / 3 / 5 share',
      'net − top 1 / 3 / 5 (attribution)',
      'exposure',
      'longest underwater',
      'exit reasons'
    ],
    ids.map((id) => {
      const t = p(id).tails;

      return [
        label(id),
        `${t.wins} / ${t.losses}`,
        `${dollars(t.averageWin)} / ${dollars(t.averageLoss)}`,
        fixed(t.profitFactor),
        `${dollars(t.bestLot)} / ${dollars(t.worstLot)}`,
        `${percent(t.worstMae)} (${percent(t.maeP10)})`,
        `${percent(t.top1Share, 0)} / ${percent(t.top3Share, 0)} / ${percent(t.top5Share, 0)}`,
        `${dollars(t.netMinusTop1)} / ${dollars(t.netMinusTop3)} / ${dollars(t.netMinusTop5)}`,
        percent(t.exposure, 0),
        `${t.longestUnderwater.sessions} sessions (${t.longestUnderwater.from} → ${t.longestUnderwater.to})`,
        Object.entries(t.exitReasons)
          .map(([reason, x]: [string, Any]) => `${reason} ${x.lots} (${dollars(x.net)})`)
          .join('; ')
      ];
    })
  );
  v['cost.trades'] = ids
    .map((id) => {
      const rows = p(id).lotRows.map((lot: Any) => [
        lot.id,
        lot.setup,
        lot.entryDate,
        fixed(lot.entryRawPrice),
        lot.exitDate,
        fixed(lot.exitRawPrice),
        lot.exitReason,
        fixed(lot.occupiedDays, 0),
        dollars(lot.gross),
        dollars(lot.interest),
        dollars(lot.friction),
        dollars(lot.net),
        percent(lot.maePercent),
        `${lot.episode || '—'}${lot.phase !== 'outside' ? ` (${lot.phase}${lot.dip ? ', dip' : ''})` : ''}`
      ]);

      return `### ${label(id)}\n\n${table(['#', 'setup', 'entry', 'entry px', 'exit', 'exit px', 'reason', 'days', 'gross', 'interest', 'friction', 'net', 'MAE', 'episode (phase)'], rows)}`;
    })
    .join('\n\n');

  // ----- years, regimes, portfolio -----

  const years = ['2017', '2018', '2019', '2020', '2021', '2022', '2023'];

  v['year.fixed'] = table(
    ['Phenotype', ...years],
    ids.map((id) => [label(id), ...years.map((year) => dollars(p(id).yearsFixed[year]?.change ?? 0))])
  );
  v['year.portfolio'] = table(
    ['Phenotype', ...years],
    ids.map((id) => [label(id), ...years.map((year) => dollars(p(id).yearsPortfolio[year]?.change ?? 0))])
  );
  v['year.regimes'] = table(
    ['Phenotype', ...p(ids[0]!).regimes.map((r: Any) => r.key)],
    ids.map((id) => [label(id), ...p(id).regimes.map((r: Any) => dollars(r.fixed))])
  );
  v['year.regimeKey'] = p(ids[0]!)
    .regimes.map((r: Any) => `${r.key} ${r.label} (${r.start} → ${r.end})`)
    .join('; ');
  v['port.table'] = table(
    [
      'Configuration',
      'end equity',
      'over C0',
      'CAGR',
      'max daily % DD (over C0)',
      'max minute % DD',
      'strategy net',
      'interest',
      'productivity (net per $1M $-days)',
      'max principal',
      'min. U35 ratio'
    ],
    ids
      .map((id) => {
        const r = p(id).portfolio;

        return [
          label(id),
          dollars(r.endEquity),
          dollars(r.incremental),
          percent(r.cagr),
          `${percent(r.dailyPercent)} (${r.dailyOverC0 >= 0 ? '+' : ''}${fixed(r.dailyOverC0 * 100, 1)} pp)`,
          percent(r.minutePercent),
          dollars(r.strategyNet),
          dollars(r.interest),
          dollars(r.productivity),
          dollars(r.maxPrincipal),
          fixed(r.minimumU35)
        ];
      })
      .concat(
        ['B4', 'B5'].map((id) => {
          const r = inc(id);

          return [
            `${id} (pool)`,
            dollars(r.endEquity),
            dollars(r.incremental),
            '—',
            percent(r.dailyPercent),
            percent(r.minutePercent),
            '—',
            '—',
            dollars(r.productivity),
            '—',
            '—'
          ];
        })
      )
      .concat([
        [
          'C0',
          dollars(a.c0.endEquity),
          '—',
          percent(a.c0.cagr),
          percent(a.c0.dailyPercent),
          percent(a.c0.minutePercent),
          '—',
          '—',
          '—',
          '—',
          '—'
        ]
      ])
  );

  // ----- chronology -----

  v['chrono.selection'] = table(
    [
      'Fold',
      'symbols',
      'Spearman (training net vs V)',
      'median V',
      'V > 0',
      'V < 0',
      'no evidence',
      'top-10 training above median V',
      'boundary parity'
    ],
    Object.entries(a.selection).map(([fold, x]: [string, Any]) => [
      fold,
      x.symbols,
      fixed(x.spearmanTrainingVsValidation),
      dollars(x.medianIncrement),
      percent(x.shareIncrementPositive, 0),
      percent(x.shareIncrementNegative, 0),
      percent(x.shareNoEvidence, 0),
      percent(x.top10AboveMedian, 0),
      percent(x.boundaryParity, 0)
    ])
  );
  v['chrono.top10'] = Object.entries(a.selection)
    .map(
      ([fold, x]: [string, Any]) =>
        `- **${fold}:** ${x.top10.map((row: Any) => `${row.symbol} ${dollars(row.training)} → V ${dollars(row.increment)}`).join('; ')}`
    )
    .join('\n');
  v['chrono.rank'] =
    `fold-a vs fold-b ${fixed(a.rankStability.foldAvsFoldB)}; fold-b vs final ${fixed(a.rankStability.foldBvsFinal)}; fold-a vs final ${fixed(a.rankStability.foldAvsFinal)}`;

  const shortlisted = [...new Set([...a.shortlist.map((entry: Any) => entry.symbol), 'VGT'])] as string[];

  v['chrono.shortlisted'] = table(
    [
      'ETF',
      'fold-a status (training net)',
      'fold-a V 5 / 10 bps (lots after, open at boundary)',
      'fold-b status (training net)',
      'fold-b V 5 / 10 bps (lots after, open at boundary)',
      'final percentile among 61',
      'drift a→final / b→final (step units)'
    ],
    shortlisted.map((symbol) => {
      const fold = (name: string) => a.folds.find((row: Any) => row.symbol === symbol && row.fold === name);
      const cell = (row: Any) =>
        row
          ? `${dollars(row.increment5)} / ${dollars(row.increment10)} (${row.lotsEntered}, ${row.openAtBoundary})`
          : 'no representative';
      const status = (row: Any) => (row ? `${row.trainingStatus} (${dollars(row.trainingNetStored)})` : '—');
      const st = s(symbol === 'VGT' ? 'VGT:research-representative' : `${symbol}:representative`);

      return [
        symbol,
        status(fold('fold-a')),
        cell(fold('fold-a')),
        status(fold('fold-b')),
        cell(fold('fold-b')),
        percent(st.finalNetPercentile, 0),
        `${fixed(st.drift.foldAtoFinal, 0)} / ${fixed(st.drift.foldBtoFinal, 0)}`
      ];
    })
  );
  v['chrono.vgtPrimary'] = ['fold-a', 'fold-b']
    .map(
      (fold) => `${fold} ${dollars(a.vgtPrimaryFolds[fold].increment5)} at 5 bps (${a.vgtPrimaryFolds[fold].lots} lots)`
    )
    .join('; ');
  v['chrono.pooled'] = table(
    ['Fold', 'procedure', 'members', 'validation net', 'lots', 'min. DD', 'gate'],
    a.pooled.map((row: Any) => [
      row.fold,
      row.procedure,
      row.members,
      dollars(row.validationNet),
      row.validationLots,
      dollars(row.validationMinuteDrawdown),
      String(row.gate)
    ])
  );
  v['chrono.all'] = table(
    [
      'ETF',
      'fold',
      'status',
      'training net (stored)',
      'V 5 bps',
      'V 10 bps',
      'lots after',
      'open at boundary',
      'windowed daily DD'
    ],
    a.folds.map((row: Any) => [
      row.symbol,
      row.fold,
      row.trainingStatus,
      dollars(row.trainingNetStored),
      dollars(row.increment5),
      dollars(row.increment10),
      row.lotsEntered,
      row.openAtBoundary,
      dollars(row.windowedDailyDrawdown)
    ])
  );

  return v;
};

let cache: Promise<Record<string, string>> | undefined;

export const analysisPlaceholders = () => (cache ??= build());
