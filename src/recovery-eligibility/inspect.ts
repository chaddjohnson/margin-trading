// `show`: one candidate in detail (its trades, episode attribution and, optionally, its session trace over a
// date range), for the reports and for checking any phenotype by hand.
//   npm run recovery-eligibility -- show --family trough --params troughRecovery=170,episodeReset=600 [--trace 2022-10-01:2023-09-30] [--arm 74]
import { ReferenceHighCache, firstIndexOnOrAfter, lastIndexOnOrBefore } from '../four-family/data.ts';
import { type Data, formatDollars, formatSignedDollars, option, protocol } from './context.ts';
import { candidateSection, runCandidate } from './diagnose.ts';
import { type IntParams, families, set2Params, describeParams } from './families.ts';
import { episodeMoves, pct, price } from './report.ts';

export const parseParams = (text: string | undefined): IntParams => {
  const params: IntParams = {};

  for (const pair of (text ?? '').split(',').filter(Boolean)) {
    const [key, value] = pair.split('=');

    params[key as keyof IntParams] = Number(value);
  }

  return params;
};

export const show = async (data: Data, args: string[]) => {
  const { ds } = data;
  const highs = new ReferenceHighCache(ds);
  const familyKey = option(args, 'family') ?? 'base';
  const family = families[familyKey];

  if (!family) {
    throw new Error(`Unknown family ${familyKey}`);
  }

  const params = set2Params(family, parseParams(option(args, 'params')));
  const armStart = Number(option(args, 'arm') ?? protocol.eligibilityIndex);
  const result = runCandidate(ds, highs, {
    label: `${familyKey}: ${describeParams(family, params)}`,
    familyKey,
    params,
    armStart
  });

  console.info(candidateSection(ds, episodeMoves(ds), result, result.label));

  const range = option(args, 'trace');

  if (range) {
    const [from, to] = range.split(':');
    const start = firstIndexOnOrAfter(ds, from!);
    const end = lastIndexOnOrBefore(ds, to ?? from!);

    console.info(
      '| Date | Close | Low | Ref. high | Depth | State | Setup | Trailing low | Trigger | Episode | Anchor | Trough | Continuation | Post-exit high |'
    );
    console.info('|---|---:|---:|---:|---:|---|---|---:|---:|---|---:|---:|---|---:|');

    for (const row of result.detail.trace) {
      if (row.index < start || row.index > end) {
        continue;
      }

      console.info(
        `| ${ds.dates[row.index]} | ${price(row.close)} | ${price(row.low)} | ${price(row.recentHigh)} | ${pct(1 - row.close / row.recentHigh, 2)} | ${row.entryState} | ${row.setupKind} | ${price(row.trailingLow)} | ${price(row.reboundTrigger)} | ${row.episodeActive ? 'active' : ''} | ${price(row.episodeHigh)} | ${price(row.episodeLow)} | ${row.continuationActive ? `open since ${ds.dates[row.continuationStart]}` : ''} | ${price(row.continuationHigh)} |`
      );
    }
  }

  console.info(
    `\nNet ${formatDollars(result.metrics.net)}, minute DD ${formatDollars(result.metrics.minuteDrawdown)}, daily DD ${formatDollars(result.metrics.dailyDrawdown)}; by path: ${Object.entries(
      result.metrics.netByKind
    )
      .filter(([, net]) => net !== 0)
      .map(
        ([kind, net]) =>
          `${kind} ${formatSignedDollars(net)} (${result.metrics.entriesByKind[kind as keyof typeof result.metrics.entriesByKind]} entries)`
      )
      .join(', ')}`
  );
};
