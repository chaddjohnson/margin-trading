// Markdown tables generated from the study's results (research/vgt-intraday-study/tables/). The written
// reports quote these tables; regenerate them with the `tables` command.
import { parse } from 'csv-parse/sync';
import fs from 'fs-extra';
import path from 'node:path';
import { bands, policies, regimes } from './constants.ts';
import type { BandRow, BandSliceRow, Classification, RunMetrics } from './analysis.ts';
import type { EnsembleRow } from './study.ts';

type PairRow = Record<string, unknown> & {
  window: string;
  variant: string;
  reference: string;
  stopFill: string;
  costBps: number;
  deltaNet: number;
  deltaMinuteDrawdown: number;
  deltaDailyDrawdown: number;
  variantMinuteDrawdown: number;
  deltaTrades: number;
  deltaInterest: number;
  deltaFees: number;
  deltaExposureSessions: number;
  yearDeltas: Record<string, number>;
  yearsPositive: number;
  yearsTotal: number;
  bestYear: string;
  deltaExBestYear: number;
  deltaExLargestPositiveEpisode: number;
  avoidedReferenceTrades: number;
  avoidedReferenceNet: number;
  devDelta: number;
  forwardContinuousDelta: number;
  regimeDeltas: Record<string, number>;
  episodes: number;
  firstDivergenceDate: string;
  firstDivergenceType: string;
  largestPositiveDate: string;
  largestPositive: number;
  largestNegativeDate: string;
  largestNegative: number;
  byType: Record<string, number>;
  byTypeCount: Record<string, number>;
  byBand: Record<string, number>;
};

export const dollars = (value: number, signed = false) => {
  if (!Number.isFinite(value)) {
    return '–';
  }

  const text = Math.abs(Math.round(value)).toLocaleString('en-US');

  return value < -0.5 ? `−$${text}` : `${signed && value > 0.5 ? '+' : ''}$${text}`;
};

const percent = (value: number, digits = 1) => (Number.isFinite(value) ? `${(value * 100).toFixed(digits)}%` : '–');
const number = (value: number, digits = 1) => (Number.isFinite(value) ? value.toFixed(digits) : '–');

const table = (header: string[], rows: (string | number)[][]) =>
  [
    `| ${header.join(' | ')} |`,
    `|${header.map((_, index) => (index === 0 ? '---' : '---:')).join('|')}|`,
    ...rows.map((row) => `| ${row.join(' | ')} |`)
  ].join('\n');

const key = (policy: string, stopMode: string, stopFill: string) => `${policy}__${stopMode}__${stopFill}`;
const entryIds = policies.map((policy) => policy.id);
const unconditional = policies.filter((policy) => policy.phase === 1).map((policy) => policy.id);
const conditional = policies.filter((policy) => policy.phase === 3).map((policy) => policy.id);
const shortMode = (stopMode: string) => (stopMode === 'STOP_DAILY' ? 'daily' : 'minute');

export const writeTables = async (resultsDir: string, outDir: string) => {
  const metrics: RunMetrics[] = await fs.readJson(path.join(resultsDir, 'summary.json'));
  const paired: { entry: PairRow[]; stop: PairRow[]; constituents: PairRow[] } = await fs.readJson(
    path.join(resultsDir, 'paired.json')
  );
  const bandDiagnostics: BandRow[] = await fs.readJson(path.join(resultsDir, 'band_diagnostics.json'));
  const slices: BandSliceRow[] = await fs.readJson(path.join(resultsDir, 'band_by_year_and_regime.json'));
  const ensemble: EnsembleRow[] = await fs.readJson(path.join(resultsDir, 'ensemble.json'));
  const classifications: Classification[] = await fs.readJson(path.join(resultsDir, 'classification.json'));
  const missed = await fs.readJson(path.join(resultsDir, 'missed_opportunities.json'));
  const files: Record<string, string> = {};

  const metric = (window: string, policy: string, stopMode: string, stopFill: string, costBps = 5) =>
    metrics.find(
      (row) =>
        row.window === window &&
        row.policy === policy &&
        row.stopMode === stopMode &&
        row.stopFill === stopFill &&
        row.costBps === costBps
    )!;
  const findPair = (
    list: PairRow[],
    window: string,
    variant: string,
    reference: string,
    stopFill: string,
    costBps = 5
  ) =>
    list.find(
      (row) =>
        row.window === window &&
        row.variant === variant &&
        row.reference === reference &&
        row.stopFill === stopFill &&
        row.costBps === costBps
    );
  const entryPair = (window: string, policy: string, stopMode: string, stopFill: string, costBps = 5) =>
    findPair(
      paired.entry,
      window,
      key(policy, stopMode, stopFill),
      key('CLOSE_1M', stopMode, stopFill),
      stopFill,
      costBps
    );
  const stopPair = (window: string, policy: string, stopFill: string, costBps = 5) =>
    findPair(
      paired.stop,
      window,
      key(policy, 'STOP_MINUTE_CAUSAL', stopFill),
      key(policy, 'STOP_DAILY', stopFill),
      stopFill,
      costBps
    )!;
  const ensembleOf = (
    policy: string,
    stopMode: string,
    stopFill: string,
    field: 'deltaNet5VsClose' | 'deltaNet5VsDailyStop'
  ) => {
    const values = ensemble
      .filter((row) => row.policy === policy && row.stopMode === stopMode && row.stopFill === stopFill)
      .map((row) => row[field])
      .sort((a, b) => a - b);
    const middle = (values.length - 1) / 2;

    return {
      median: (values[Math.floor(middle)]! + values[Math.ceil(middle)]!) / 2,
      positive: values.filter((value) => value > 0).length,
      count: values.length,
      min: values[0]!,
      max: values.at(-1)!
    };
  };

  // ---- Entry results by stop model ----
  for (const stopMode of ['STOP_DAILY', 'STOP_MINUTE_CAUSAL']) {
    const ids = stopMode === 'STOP_DAILY' ? entryIds : entryIds;
    const label = shortMode(stopMode);

    files[`entry_summary_${label}.md`] = table(
      [
        'Policy',
        'Trades',
        'Win %',
        'Mean trade',
        'Median trade',
        'Worst trade',
        'Gross price P&L',
        'Interest',
        'Fees',
        'Turnover',
        'Net (5 bp)',
        'Δ vs CLOSE_1M',
        'Minute DD',
        'Δ minute DD',
        'Daily DD',
        'Sessions held',
        'Mean days',
        'Same-session exits'
      ],
      ids.map((policy) => {
        const row = metric('continuous', policy, stopMode, 'stop');
        const pair = entryPair('continuous', policy, stopMode, 'stop');

        return [
          `\`${policy}\``,
          row.trades,
          percent(row.winRate),
          dollars(row.meanTradeNet),
          dollars(row.medianTradeNet),
          dollars(row.maxTradeLoss),
          dollars(row.grossPriceProfit),
          dollars(row.interest),
          dollars(row.fees),
          `$${(row.turnover / 1e6).toFixed(1)}M`,
          dollars(row.net),
          pair ? dollars(pair.deltaNet, true) : '—',
          dollars(row.minuteDrawdown),
          pair ? dollars(pair.deltaMinuteDrawdown, true) : '—',
          dollars(row.dailyDrawdown),
          row.exposureSessions,
          number(row.meanCalendarDays),
          row.sameSessionExits
        ];
      })
    );

    files[`entry_opportunity_${label}.md`] = table(
      [
        'Policy',
        'Reversal captures',
        'Their net',
        'Same-opportunity entries',
        'Their net',
        'Mean price improvement vs close fill',
        'Premature + continued selling',
        'Their net',
        'CLOSE_1M trades avoided',
        'Their net (in CLOSE_1M)',
        'Rising-path trades / net',
        'Falling-path trades / net',
        'Setup sessions w/o entry',
        'Sessions with gate-blocked candidates (minutes)',
        'No-fill'
      ],
      ids.map((policy) => {
        const row = metric('continuous', policy, stopMode, 'stop');
        const pair = entryPair('continuous', policy, stopMode, 'stop');

        return [
          `\`${policy}\``,
          row.reversalCaptures,
          dollars(row.reversalCaptureNet),
          row.sameOpportunity,
          dollars(row.sameOpportunityNet),
          percent(row.meanPriceImprovement, 2),
          row.prematureContinuedSelling,
          dollars(row.prematureContinuedSellingNet),
          pair ? pair.avoidedReferenceTrades : '—',
          pair ? dollars(pair.avoidedReferenceNet) : '—',
          `${row.risingPathTrades} / ${dollars(row.risingPathNet)}`,
          `${row.fallingPathTrades} / ${dollars(row.fallingPathNet)}`,
          row.setupSessionsWithoutEntry,
          `${row.sessionsWithBlockedCandidate} (${row.blockedCandidates})`,
          row.noFill
        ];
      })
    );

    files[`entry_sensitivity_${label}.md`] = table(
      [
        'Policy',
        'Net 0 bp',
        'Net 5 bp',
        'Net 10 bp',
        'Net 20 bp',
        'Δ 5 bp (stop fill)',
        'Net 5 bp next-open',
        'Δ 5 bp next-open',
        'Δ 20 bp next-open',
        'Minute DD stop',
        'Minute DD next-open',
        'Max minute DD any cost/fill',
        '≥ $30k?'
      ],
      ids.map((policy) => {
        const nextOpen = metric('continuous', policy, stopMode, 'next-open');
        const all = metrics.filter(
          (row) => row.window === 'continuous' && row.policy === policy && row.stopMode === stopMode
        );
        const maxDd = Math.max(...all.map((row) => row.minuteDrawdown));

        return [
          `\`${policy}\``,
          dollars(metric('continuous', policy, stopMode, 'stop', 0).net),
          dollars(metric('continuous', policy, stopMode, 'stop', 5).net),
          dollars(metric('continuous', policy, stopMode, 'stop', 10).net),
          dollars(metric('continuous', policy, stopMode, 'stop', 20).net),
          entryPair('continuous', policy, stopMode, 'stop')
            ? dollars(entryPair('continuous', policy, stopMode, 'stop')!.deltaNet, true)
            : '—',
          dollars(nextOpen.net),
          entryPair('continuous', policy, stopMode, 'next-open')
            ? dollars(entryPair('continuous', policy, stopMode, 'next-open')!.deltaNet, true)
            : '—',
          entryPair('continuous', policy, stopMode, 'next-open', 20)
            ? dollars(entryPair('continuous', policy, stopMode, 'next-open', 20)!.deltaNet, true)
            : '—',
          dollars(metric('continuous', policy, stopMode, 'stop').minuteDrawdown),
          dollars(nextOpen.minuteDrawdown),
          dollars(maxDd),
          maxDd >= 30000 ? '**yes**' : 'no'
        ];
      })
    );

    const years = Object.keys(metric('continuous', 'CLOSE_1M', stopMode, 'stop').years);

    files[`entry_years_${label}.md`] = table(
      [
        'Policy',
        ...years.map((year) => (year === '2016' ? '2016 (Q4)' : year === '2025' ? '2025 (to 10-13)' : year)),
        'Years +',
        'Best year',
        'Δ ex best year'
      ],
      ids.map((policy) => {
        if (policy === 'CLOSE_1M') {
          const row = metric('continuous', policy, stopMode, 'stop');

          return [`\`${policy}\` (level)`, ...years.map((year) => dollars(row.years[year]!)), '', '', ''];
        }

        const pair = entryPair('continuous', policy, stopMode, 'stop')!;

        return [
          `\`${policy}\` (Δ)`,
          ...years.map((year) => dollars(pair.yearDeltas[year]!, true)),
          `${pair.yearsPositive}/${pair.yearsTotal}`,
          pair.bestYear,
          dollars(pair.deltaExBestYear, true)
        ];
      })
    );

    const regimeIds = [...regimes.map((regime) => regime.id), 'DD15', 'HIVOL'];

    files[`entry_regimes_${label}.md`] = table(
      ['Policy', ...regimeIds],
      ids.map((policy) => {
        if (policy === 'CLOSE_1M') {
          const row = metric('continuous', policy, stopMode, 'stop');

          return [`\`${policy}\` (level)`, ...regimeIds.map((id) => dollars(row.regimes[id]!))];
        }

        const pair = entryPair('continuous', policy, stopMode, 'stop')!;

        return [`\`${policy}\` (Δ)`, ...regimeIds.map((id) => dollars(pair.regimeDeltas[id]!, true))];
      })
    );

    files[`entry_windows_${label}.md`] = table(
      [
        'Policy',
        'Dev 2016-10-07→2023-12-29 net',
        'Dev Δ',
        'Dev minute DD',
        '2024–25 on continuous run: net',
        'Δ',
        '2024–25 flat start: net',
        'Δ',
        'Flat-start minute DD',
        'Flat-start trades'
      ],
      ids.map((policy) => {
        const row = metric('continuous', policy, stopMode, 'stop');
        const flat = metric('forward_flat', policy, stopMode, 'stop');
        const pair = entryPair('continuous', policy, stopMode, 'stop');
        const flatPair = entryPair('forward_flat', policy, stopMode, 'stop');

        return [
          `\`${policy}\``,
          dollars(row.devNet),
          pair ? dollars(pair.devDelta, true) : '—',
          dollars(row.devMinuteDrawdown),
          dollars(row.forwardContinuousNet),
          pair ? dollars(pair.forwardContinuousDelta, true) : '—',
          dollars(flat.net),
          flatPair ? dollars(flatPair.deltaNet, true) : '—',
          dollars(flat.minuteDrawdown),
          flat.trades
        ];
      })
    );

    const types = [
      'VARIANT_ENTRY_REVERSAL',
      'VARIANT_ENTRY_OTHER',
      'BOTH_ENTER_EARLIER_LOWER',
      'BOTH_ENTER_EARLIER_HIGHER',
      'REFERENCE_ENTRY_ONLY',
      'EXIT_DIFFERENCE',
      'OTHER'
    ];

    files[`entry_attribution_${label}.md`] = table(
      ['Policy', 'Δ net', 'Episodes', ...types.map((type) => `${type} (n / $)`)],
      ids
        .filter((policy) => policy !== 'CLOSE_1M')
        .map((policy) => {
          const pair = entryPair('continuous', policy, stopMode, 'stop')!;

          return [
            `\`${policy}\``,
            dollars(pair.deltaNet, true),
            pair.episodes,
            ...types.map((type) =>
              pair.byTypeCount[type] ? `${pair.byTypeCount[type]} / ${dollars(pair.byType[type]!, true)}` : '–'
            )
          ];
        })
    );

    files[`entry_robustness_${label}.md`] = table(
      [
        'Policy',
        'Δ net',
        'First divergence',
        'Largest + episode',
        'Largest − episode',
        'Δ ex largest + episode',
        'Δ ex best year',
        'Net ex best trade',
        'Ensemble median Δ (stop)',
        'Starts Δ>0',
        'Ensemble range',
        'Ensemble median Δ (next-open)',
        'Starts Δ>0 (next-open)'
      ],
      ids
        .filter((policy) => policy !== 'CLOSE_1M')
        .map((policy) => {
          const pair = entryPair('continuous', policy, stopMode, 'stop')!;
          const row = metric('continuous', policy, stopMode, 'stop');
          const stopEnsemble = ensembleOf(policy, stopMode, 'stop', 'deltaNet5VsClose');
          const nextEnsemble = ensembleOf(policy, stopMode, 'next-open', 'deltaNet5VsClose');

          return [
            `\`${policy}\``,
            dollars(pair.deltaNet, true),
            `${pair.firstDivergenceDate} (${pair.firstDivergenceType})`,
            `${pair.largestPositiveDate} ${dollars(pair.largestPositive, true)}`,
            `${pair.largestNegativeDate} ${dollars(pair.largestNegative, true)}`,
            dollars(pair.deltaExLargestPositiveEpisode, true),
            dollars(pair.deltaExBestYear, true),
            dollars(row.netExBestTrade),
            dollars(stopEnsemble.median, true),
            `${stopEnsemble.positive}/${stopEnsemble.count}`,
            `${dollars(stopEnsemble.min, true)} … ${dollars(stopEnsemble.max, true)}`,
            dollars(nextEnsemble.median, true),
            `${nextEnsemble.positive}/${nextEnsemble.count}`
          ];
        })
    );
  }

  // ---- Stop-model effect ----
  files['stop_effect.md'] = table(
    [
      'Entry policy',
      'Net daily stop',
      'Net minute stop',
      'Δ (stop fill)',
      'Δ (next-open)',
      'Δ 20 bp next-open',
      'Δ minute DD (stop / next-open)',
      'Minute DD minute stop (stop / next-open)',
      'Δ trades',
      'Same-session exits',
      'Intrasession-stop exits',
      'Δ interest',
      'Δ fees',
      'Δ sessions held',
      'Years + (stop)',
      'Δ ex largest + episode',
      'Ensemble median Δ / starts Δ>0'
    ],
    entryIds.map((policy) => {
      const pair = stopPair('continuous', policy, 'stop');
      const next = stopPair('continuous', policy, 'next-open');
      const next20 = stopPair('continuous', policy, 'next-open', 20);
      const daily = metric('continuous', policy, 'STOP_DAILY', 'stop');
      const minute = metric('continuous', policy, 'STOP_MINUTE_CAUSAL', 'stop');
      const ens = ensembleOf(policy, 'STOP_MINUTE_CAUSAL', 'stop', 'deltaNet5VsDailyStop');

      return [
        `\`${policy}\``,
        dollars(daily.net),
        dollars(minute.net),
        dollars(pair.deltaNet, true),
        dollars(next.deltaNet, true),
        dollars(next20.deltaNet, true),
        `${dollars(pair.deltaMinuteDrawdown, true)} / ${dollars(next.deltaMinuteDrawdown, true)}`,
        `${dollars(pair.variantMinuteDrawdown)} / ${dollars(next.variantMinuteDrawdown)}`,
        pair.deltaTrades,
        minute.sameSessionExits,
        minute.intrasessionStopExits,
        dollars(pair.deltaInterest, true),
        dollars(pair.deltaFees, true),
        pair.deltaExposureSessions,
        `${pair.yearsPositive}/${pair.yearsTotal}`,
        dollars(pair.deltaExLargestPositiveEpisode, true),
        `${dollars(ens.median, true)} / ${ens.positive}/${ens.count}`
      ];
    })
  );

  files['stop_effect_years.md'] = (() => {
    const years = Object.keys(stopPair('continuous', 'CLOSE_1M', 'stop').yearDeltas);

    return table(
      ['Entry policy (minute − daily)', ...years],
      entryIds.map((policy) => {
        const pair = stopPair('continuous', policy, 'stop');

        return [`\`${policy}\``, ...years.map((year) => dollars(pair.yearDeltas[year]!, true))];
      })
    );
  })();

  files['stop_effect_windows.md'] = table(
    [
      'Entry policy (minute − daily)',
      'Dev Δ',
      '2024–25 continuous Δ',
      '2024–25 flat-start Δ',
      'Flat-start minute DD (minute stop)',
      ...regimes.map((regime) => regime.id)
    ],
    entryIds.map((policy) => {
      const pair = stopPair('continuous', policy, 'stop');
      const flat = stopPair('forward_flat', policy, 'stop');

      return [
        `\`${policy}\``,
        dollars(pair.devDelta, true),
        dollars(pair.forwardContinuousDelta, true),
        dollars(flat.deltaNet, true),
        dollars(flat.variantMinuteDrawdown),
        ...regimes.map((regime) => dollars(pair.regimeDeltas[regime.id]!, true))
      ];
    })
  );

  // ---- Bands (3A) ----
  for (const stopMode of ['STOP_DAILY', 'STOP_MINUTE_CAUSAL']) {
    const rows: (string | number)[][] = [];

    for (const policy of entryIds) {
      for (const band of bands) {
        const row = bandDiagnostics.find(
          (item) =>
            item.policy === policy && item.stopMode === stopMode && item.stopFill === 'stop' && item.band === band
        )!;

        rows.push([
          `\`${policy}\``,
          band,
          row.setups,
          row.entries === 0 ? 'no sample' : `${row.entries}${row.entries < 10 ? ' (insufficient)' : ''}`,
          row.reversalCaptures,
          row.missedDipAndRecovery,
          row.blockedCandidates,
          row.unfilled,
          row.entries ? number(row.meanDecisionMinutesAfterOpen, 0) : '–',
          row.entries ? percent(row.meanPriceImprovement, 2) : '–',
          row.entries ? `${row.wins}/${row.losses}` : '–',
          row.entries ? dollars(row.net) : '–',
          row.entries ? dollars(row.meanNet) : '–',
          row.entries ? dollars(row.worstNet) : '–',
          row.entries ? number(row.meanCalendarDays) : '–',
          row.entries ? dollars(row.meanWorstMark) : '–',
          row.entries ? dollars(row.worstMark) : '–',
          row.sameSessionExits,
          `${row.restrictionsCreated} (${row.followedByLowerPriceReentry} LPR / ${row.followedByRecoveryReset} reset)`,
          `${row.tradesInMaxMinuteDrawdown} / ${dollars(row.netInMaxMinuteDrawdown)}`
        ]);
      }
    }

    files[`bands_${shortMode(stopMode)}.md`] = table(
      [
        'Policy',
        'Band',
        'Setups',
        'Entries',
        'Reversal captures',
        'Missed dip-and-recovery',
        'Gate-blocked minutes',
        'No-fill',
        'Mean decision min after open',
        'Mean improvement vs close fill',
        'W/L',
        'Net',
        'Mean',
        'Worst',
        'Mean days',
        'Mean worst mark',
        'Worst mark',
        'Same-session exits',
        'Restrictions (resolution)',
        'Trades / net in max minute DD window'
      ],
      rows
    );

    const sliceTable = (sliceIds: string[]) =>
      table(
        ['Policy', 'Band', ...sliceIds],
        entryIds.flatMap((policy) =>
          bands.map((band) => [
            `\`${policy}\``,
            band,
            ...sliceIds.map((slice) => {
              const row = slices.find(
                (item) =>
                  item.policy === policy &&
                  item.stopMode === stopMode &&
                  item.stopFill === 'stop' &&
                  item.band === band &&
                  item.slice === slice
              )!;

              return row.entries ? `${row.entries} / ${dollars(row.net)}` : '·';
            })
          ])
        )
      );
    const years = [...new Set(slices.map((row) => row.slice).filter((slice) => /^\d{4}$/.test(slice)))];

    files[`bands_years_${shortMode(stopMode)}.md`] = sliceTable(years);
    files[`bands_regimes_${shortMode(stopMode)}.md`] = sliceTable([
      ...regimes.map((regime) => regime.id),
      'DD15',
      'HIVOL'
    ]);
  }

  // Δ vs CLOSE_1M by the band of each divergence episode's first entry.
  for (const stopMode of ['STOP_DAILY', 'STOP_MINUTE_CAUSAL']) {
    files[`bands_attribution_${shortMode(stopMode)}.md`] = table(
      ['Policy', 'Δ net', ...bands.map((band) => `${band} episodes Δ`), 'No-entry episodes Δ'],
      entryIds
        .filter((policy) => policy !== 'CLOSE_1M')
        .map((policy) => {
          const pair = entryPair('continuous', policy, stopMode, 'stop')!;

          return [
            `\`${policy}\``,
            dollars(pair.deltaNet, true),
            ...bands.map((band) => (pair.byBand[band] !== undefined ? dollars(pair.byBand[band]!, true) : '–')),
            pair.byBand.NONE !== undefined ? dollars(pair.byBand.NONE, true) : '–'
          ];
        })
    );
  }

  // ---- Conditional policies (3B) ----
  files['conditional_vs_constituents.md'] = table(
    [
      'Conditional policy',
      'Stop model',
      'Constituent',
      'Δ net (stop)',
      'Δ net (next-open)',
      'Δ minute DD (stop)',
      'Years +'
    ],
    paired.constituents
      .filter((row) => row.window === 'continuous' && row.costBps === 5 && row.stopFill === 'stop')
      .map((row) => {
        const [policy, stopMode] = row.variant.split('__') as [string, string];
        const [constituent] = row.reference.split('__') as [string];
        const next = findPair(
          paired.constituents,
          'continuous',
          key(policy, stopMode, 'next-open'),
          key(constituent, stopMode, 'next-open'),
          'next-open'
        )!;

        return [
          `\`${policy}\``,
          shortMode(stopMode),
          `\`${constituent}\``,
          dollars(row.deltaNet, true),
          dollars(next.deltaNet, true),
          dollars(row.deltaMinuteDrawdown, true),
          `${row.yearsPositive}/${row.yearsTotal}`
        ];
      })
  );

  files['conditional_interaction.md'] = table(
    [
      'Policy',
      'Entry effect, daily stop',
      'Entry effect, minute stop',
      'Stop effect',
      'Stop effect on CLOSE_1M',
      'Interaction (stop effect − CLOSE_1M stop effect)'
    ],
    conditional.concat(unconditional.filter((id) => id !== 'CLOSE_1M')).map((policy) => {
      const daily = entryPair('continuous', policy, 'STOP_DAILY', 'stop')!;
      const minute = entryPair('continuous', policy, 'STOP_MINUTE_CAUSAL', 'stop')!;
      const stop = stopPair('continuous', policy, 'stop');
      const closeStop = stopPair('continuous', 'CLOSE_1M', 'stop');

      return [
        `\`${policy}\``,
        dollars(daily.deltaNet, true),
        dollars(minute.deltaNet, true),
        dollars(stop.deltaNet, true),
        dollars(closeStop.deltaNet, true),
        dollars(stop.deltaNet - closeStop.deltaNet, true)
      ];
    })
  );

  // ---- Classification ----
  files['classification.md'] = table(
    [
      'Subject',
      'Reference',
      'O',
      'E',
      'Rp',
      'Category',
      'Δ net stop / next-open',
      'Δ minute DD stop / next-open',
      'Disclosures',
      'Evidence'
    ],
    classifications.map((row) => [
      row.subject,
      row.reference,
      row.O ? 'yes' : 'no',
      row.E ? 'yes' : 'no',
      row.Rp ? 'yes' : 'no',
      `**${row.category}**`,
      `${dollars(row.deltaNetStop, true)} / ${dollars(row.deltaNetNextOpen, true)}`,
      `${dollars(row.deltaMinuteDrawdownStop, true)} / ${dollars(row.deltaMinuteDrawdownNextOpen, true)}`,
      row.disclosures.join('; ') || '–',
      row.reasons.join('; ')
    ])
  );

  files['missed_opportunities.md'] = [
    `Sessions flat at the start (CLOSE_1M, daily stop, continuous run): ${missed.sessionsFlatAtStart}`,
    `… with a qualifying completed minute in [09:35, close − 1 min]: ${missed.intradayDipSessionsFlat}`,
    `… with a qualifying final decision (CLOSE_1M's own signal): ${missed.closeDipSessionsFlat}`,
    `Dip-and-recovery sessions (intraday qualifying, final decision not): ${missed.missedDipAndRecovery} (${missed.missedDipAndRecoveryUnrestricted} also unrestricted at the start; ${missed.missedFrom1000} qualifying again from 10:00)`,
    '',
    table(
      ['Band', 'by first qualifying minute', 'by deepest minute'],
      bands.map((band) => [band, missed.byFirstBand[band], missed.byMaxDepthBand[band]])
    ),
    '',
    table(
      ['Year', 'Dip-and-recovery sessions'],
      Object.entries(missed.byYear as Record<string, number>).map(([year, count]) => [year, count])
    )
  ].join('\n');

  // ---- Divergence episodes: bands split by the 2020 crash, and paired trade timelines ----
  const readCsv = async (file: string): Promise<Record<string, string>[]> =>
    parse(await fs.readFile(file, 'utf8'), { columns: true, skip_empty_lines: true });
  const episodeRows = (await readCsv(path.join(resultsDir, 'divergence_episodes.csv'))).filter(
    (row) => row.window === 'continuous' && row.costBps === '5' && row.stopFill === 'stop'
  );
  const covid = regimes.find((regime) => regime.id === 'COVID_2020')!;

  for (const stopMode of ['STOP_DAILY', 'STOP_MINUTE_CAUSAL']) {
    files[`bands_episodes_by_crash_${shortMode(stopMode)}.md`] = table(
      ['Policy', ...bands.flatMap((band) => [`${band} Feb–Apr 2020 (n / Δ)`, `${band} other (n / Δ, + episodes)`])],
      entryIds
        .filter((policy) => policy !== 'CLOSE_1M')
        .map((policy) => {
          const rows = episodeRows.filter(
            (row) =>
              row.variant === key(policy, stopMode, 'stop') && row.reference === key('CLOSE_1M', stopMode, 'stop')
          );

          return [
            `\`${policy}\``,
            ...bands.flatMap((band) => {
              const inBand = rows.filter((row) => row.band === band);
              const crash = inBand.filter((row) => row.startDate! >= covid.start && row.startDate! <= covid.end);
              const other = inBand.filter((row) => !crash.includes(row));
              const total = (list: typeof rows) => list.reduce((sum, row) => sum + Number(row.contribution), 0);

              return [
                crash.length ? `${crash.length} / ${dollars(total(crash), true)}` : '–',
                other.length
                  ? `${other.length} / ${dollars(total(other), true)}, ${other.filter((row) => Number(row.contribution) > 0).length}+`
                  : '–'
              ];
            })
          ];
        })
    );
  }

  const timelinePairs = [
    ['FIRST_1000', 'STOP_DAILY', 'CLOSE_1M', 'STOP_DAILY'],
    ['STABLE_15', 'STOP_DAILY', 'CLOSE_1M', 'STOP_DAILY'],
    ['REBOUND_05', 'STOP_DAILY', 'CLOSE_1M', 'STOP_DAILY'],
    ['BAND_STABILIZE', 'STOP_DAILY', 'CLOSE_1M', 'STOP_DAILY'],
    ['BAND_LATE_DEEP', 'STOP_DAILY', 'CLOSE_1M', 'STOP_DAILY'],
    ['CLOSE_1M', 'STOP_MINUTE_CAUSAL', 'CLOSE_1M', 'STOP_DAILY'],
    ['STABLE_30', 'STOP_MINUTE_CAUSAL', 'STABLE_30', 'STOP_DAILY']
  ] as const;
  const timeline: string[] = [];

  for (const [variantPolicy, variantMode, referencePolicy, referenceMode] of timelinePairs) {
    const variantKey = key(variantPolicy, variantMode, 'stop');
    const referenceKey = key(referencePolicy, referenceMode, 'stop');
    const rows = episodeRows
      .filter((row) => row.variant === variantKey && row.reference === referenceKey)
      .sort((a, b) => Number(b.contribution) - Number(a.contribution));
    const variantTrades = await readCsv(path.join(resultsDir, 'runs/continuous', variantKey, 'trades.csv'));
    const referenceTrades = await readCsv(path.join(resultsDir, 'runs/continuous', referenceKey, 'trades.csv'));
    const chosen = [...rows.slice(0, 3), ...rows.slice(-3).reverse()].filter(
      (row, index, list) => list.indexOf(row) === index
    );

    timeline.push(
      `### \`${variantPolicy}\` [${shortMode(variantMode)}] vs \`${referencePolicy}\` [${shortMode(referenceMode)}]`,
      '',
      `${rows.length} divergence episodes; first ${rows.length ? [...rows].sort((a, b) => a.startDate!.localeCompare(b.startDate!))[0]!.startDate : '–'}.`,
      ''
    );

    for (const episode of chosen) {
      const ids = (list: string | undefined) => new Set((list ?? '').split(' ').filter(Boolean));
      const variantIds = ids(episode.variantTrades);
      const referenceIds = ids(episode.referenceTrades);
      const describe = (side: string, trade: Record<string, string>) => [
        side,
        trade.entry_date!,
        trade.decision_time_et!.slice(11),
        trade.band!,
        Number(trade.decision_price).toFixed(2),
        `${trade.entry_time_et!.slice(11)} @ ${Number(trade.entry_price).toFixed(2)}`,
        Number(trade.benchmark_price).toFixed(2),
        trade.exit_date ? `${trade.exit_date} ${trade.exit_time_et!.slice(11)}` : 'open',
        trade.exit_price ? Number(trade.exit_price).toFixed(2) : '–',
        trade.exit_reason!,
        dollars(Number(trade.net_5bp))
      ];

      timeline.push(
        `**${episode.startDate} → ${episode.endDate}** (${episode.sessions} sessions, ${episode.type}, band ${episode.band || '–'}): Δ ${dollars(Number(episode.contribution), true)}`,
        '',
        table(
          [
            'Side',
            'Entry date',
            'Decision (ET)',
            'Band',
            'Decision price',
            'Fill (ET) @ price',
            'Close-rule fill that day',
            'Exit',
            'Exit price',
            'Reason',
            'Net 5 bp'
          ],
          [
            ...variantTrades.filter((trade) => variantIds.has(trade.id!)).map((trade) => describe('variant', trade)),
            ...referenceTrades
              .filter((trade) => referenceIds.has(trade.id!))
              .map((trade) => describe('reference', trade))
          ]
        ),
        ''
      );
    }
  }

  files['divergence_timelines.md'] = timeline.join('\n');

  // The $30,000 minute-drawdown research gate across every cost and fill scenario.
  files['risk_gate.md'] = table(
    [
      'Policy',
      'Stop',
      'Minute DD 5 bp stop fill',
      'Peak → trough',
      'Daily DD 5 bp',
      'Worst minute DD (scenario)',
      'Scenarios ≥ $30k (of 8)',
      '2024–25 flat-start minute DD'
    ],
    entryIds.flatMap((policy) =>
      ['STOP_DAILY', 'STOP_MINUTE_CAUSAL'].map((stopMode) => {
        const row = metric('continuous', policy, stopMode, 'stop');
        const all = metrics.filter(
          (item) => item.window === 'continuous' && item.policy === policy && item.stopMode === stopMode
        );
        const worst = all.reduce((best, item) => (item.minuteDrawdown > best.minuteDrawdown ? item : best));

        return [
          `\`${policy}\``,
          shortMode(stopMode),
          dollars(row.minuteDrawdown),
          `${row.minuteDrawdownPeak.slice(0, 10)} → ${row.minuteDrawdownTrough.slice(0, 10)}`,
          dollars(row.dailyDrawdown),
          `${dollars(worst.minuteDrawdown)} (${worst.stopFill}, ${worst.costBps} bp)`,
          all.filter((item) => item.minuteDrawdown >= 30000).length,
          dollars(metric('forward_flat', policy, stopMode, 'stop').minuteDrawdown)
        ];
      })
    )
  );

  // The three conditional policies against CLOSE_1M with the same stop model.
  const conditionalRows: (string | number)[][] = [];

  for (const stopMode of ['STOP_DAILY', 'STOP_MINUTE_CAUSAL']) {
    for (const policy of ['CLOSE_1M', ...conditional]) {
      const row = metric('continuous', policy, stopMode, 'stop');
      const next = metric('continuous', policy, stopMode, 'next-open');
      const pairStop = entryPair('continuous', policy, stopMode, 'stop');
      const pairNext = entryPair('continuous', policy, stopMode, 'next-open');
      const trades = await readCsv(
        path.join(resultsDir, 'runs/continuous', key(policy, stopMode, 'stop'), 'trades.csv')
      );
      const losers = trades.filter((trade) => trade.exit_reason !== 'open' && Number(trade.net_5bp) <= 0);
      const winners = trades.filter((trade) => Number(trade.net_5bp) > 0);
      const ens = policy === 'CLOSE_1M' ? undefined : ensembleOf(policy, stopMode, 'stop', 'deltaNet5VsClose');

      conditionalRows.push([
        `\`${policy}\``,
        shortMode(stopMode),
        row.trades,
        `${losers.length} / ${dollars(losers.reduce((total, trade) => total + Number(trade.net_5bp), 0))}`,
        `${winners.length} / ${dollars(winners.reduce((total, trade) => total + Number(trade.net_5bp), 0))}`,
        dollars(row.net),
        pairStop ? dollars(pairStop.deltaNet, true) : '—',
        pairNext ? dollars(pairNext.deltaNet, true) : '—',
        entryPair('continuous', policy, stopMode, 'stop', 20)
          ? dollars(entryPair('continuous', policy, stopMode, 'stop', 20)!.deltaNet, true)
          : '—',
        `${dollars(row.minuteDrawdown)} / ${dollars(next.minuteDrawdown)}`,
        dollars(row.dailyDrawdown),
        dollars(row.interest),
        `$${(row.turnover / 1e6).toFixed(1)}M`,
        row.exposureSessions,
        pairStop ? `${pairStop.yearsPositive}/${pairStop.yearsTotal}` : '—',
        ens ? `${dollars(ens.median, true)} (${ens.positive}/${ens.count})` : '—',
        entryPair('forward_flat', policy, stopMode, 'stop')
          ? dollars(entryPair('forward_flat', policy, stopMode, 'stop')!.deltaNet, true)
          : '—'
      ]);
    }
  }

  files['conditional_summary.md'] = table(
    [
      'Policy',
      'Stop',
      'Trades',
      'Losing trades / net',
      'Winning trades / net',
      'Net 5 bp',
      'Δ vs CLOSE_1M (stop fill)',
      'Δ (next-open)',
      'Δ 20 bp',
      'Minute DD stop / next-open',
      'Daily DD',
      'Interest',
      'Turnover',
      'Sessions held',
      'Years +',
      'Ensemble median Δ (starts > 0)',
      '2024–25 flat-start Δ'
    ],
    conditionalRows
  );

  // Trades with the same entry (session and fill) under both stop models: how the minute stop changed their exits.
  const stopRows: (string | number)[][] = [];

  for (const policy of entryIds) {
    const daily = await readCsv(
      path.join(resultsDir, 'runs/continuous', key(policy, 'STOP_DAILY', 'stop'), 'trades.csv')
    );
    const minute = await readCsv(
      path.join(resultsDir, 'runs/continuous', key(policy, 'STOP_MINUTE_CAUSAL', 'stop'), 'trades.csv')
    );
    const byEntry = new Map(daily.map((trade) => [`${trade.entry_date}|${trade.entry_price}`, trade]));
    const matched = minute
      .map((trade) => ({ minute: trade, daily: byEntry.get(`${trade.entry_date}|${trade.entry_price}`) }))
      .filter((pair): pair is { minute: Record<string, string>; daily: Record<string, string> } => Boolean(pair.daily));
    const changed = matched.filter(
      (pair) => pair.minute.exit_date !== pair.daily.exit_date || pair.minute.exit_price !== pair.daily.exit_price
    );
    const earlier = changed.filter(
      (pair) => pair.minute.exit_date! < pair.daily.exit_date! || pair.daily.exit_reason === 'open'
    );
    const delta = (list: typeof changed) =>
      list.reduce((total, pair) => total + Number(pair.minute.net_5bp) - Number(pair.daily.net_5bp), 0);
    const better = changed.filter((pair) => Number(pair.minute.net_5bp) > Number(pair.daily.net_5bp));
    const sameSession = minute.filter((trade) => trade.same_session === 'true');

    stopRows.push([
      `\`${policy}\``,
      minute.length,
      matched.length,
      changed.length,
      earlier.length,
      `${better.length} / ${changed.length - better.length}`,
      dollars(delta(changed), true),
      dollars(delta(better), true),
      dollars(delta(changed.filter((pair) => !better.includes(pair))), true),
      minute.length - matched.length,
      `${sameSession.length} / ${dollars(sameSession.reduce((total, trade) => total + Number(trade.net_5bp), 0))}`
    ]);
  }

  files['stop_paired_trades.md'] = table(
    [
      'Entry policy',
      'Minute-stop trades',
      'Same entry under daily stop',
      'Of which exit changed',
      'Exited earlier',
      'Better / worse',
      'Σ Δ trade net (changed)',
      'Σ gains',
      'Σ losses',
      'Minute-stop trades with no daily twin',
      'Same-session exits (n / net)'
    ],
    stopRows
  );

  await fs.ensureDir(outDir);

  for (const [name, content] of Object.entries(files)) {
    await fs.writeFile(path.join(outDir, name), `${content}\n`);
  }
};
