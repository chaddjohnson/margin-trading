// The cross-architecture comparison: every candidate worth carrying into the reports (references, A1/A2 picks,
// Track B policies, Track C phenotypes) on the common full run, with trade lists, episode attribution, trade-level
// differences from D1, one-parameter neighbourhoods, leave-one-recovery-out, interest and fill sensitivity, and
// the frozen phenotype's net on each validation window (what a fixed vector did, as opposed to what the
// selection rule picked in the local studies).
import path from 'node:path';
import {
  type Data,
  formatDollars,
  formatSignedDollars,
  fullSpec,
  protocol,
  stageDir,
  validationSpec,
  writeJson,
  writeText
} from './context.ts';
import type { Trade } from './engine.ts';
import { type Metrics, evaluateCandidate } from './evaluate.ts';
import { type IntParams, d1Params, describeParams, familyOf, trades2Params } from './families.ts';
import { makeCaches } from './pool.ts';
import {
  attributionTable,
  csvLine,
  diffTrades,
  episodeMoves,
  episodeOf,
  metricsHeader,
  metricsRow,
  segmentTable,
  tradeRows,
  tradeTable
} from './report.ts';
import { makeEvaluator, metricColumns, metricValues, neighbourhood } from './study.ts';

export interface Finalist {
  id: string;
  label: string;
  family: string;
  params: IntParams;
  origin: string;
  evidence: 'reference' | 'predeclared' | 'in-sample sweep' | 'in-sample refined' | 'control';
}

const d1 = familyOf('d1');
const base = familyOf('base');

export const finalistList = (): Finalist[] => [
  {
    id: 'D1',
    label: 'D1 (shipped)',
    family: 'd1',
    params: d1Params(d1),
    origin: 'the shipped file',
    evidence: 'reference'
  },
  {
    id: 'S2',
    label: 'Set 2',
    family: 'base',
    params: d1Params(base),
    origin: 'file 4 as checked in',
    evidence: 'reference'
  },
  {
    id: 'T2',
    label: 'Trades2',
    family: 'base',
    params: trades2Params(base),
    origin: 'previous program',
    evidence: 'reference'
  },
  {
    id: 'D3',
    label: 'D3 (P 7.0% W 60)',
    family: 'd1',
    params: d1Params(d1, { pullback: 70 }),
    origin: 'previous program, 2023-participating',
    evidence: 'in-sample sweep'
  },
  {
    id: 'A1-p86',
    label: 'A1 low-DD plateau (P 8.6% W 60)',
    family: 'd1',
    params: d1Params(d1, { pullback: 86 }),
    origin: 'A1 sweep',
    evidence: 'in-sample sweep'
  },
  {
    id: 'A1-p92w69',
    label: 'A1 maxNet ridge (P 9.2% W 69)',
    family: 'd1',
    params: d1Params(d1, { pullback: 92, continuationWindow: 69 }),
    origin: 'A1 sweep, one 0.1-step wide in P',
    evidence: 'in-sample sweep'
  },
  {
    id: 'A1-p89w169',
    label: 'A1 lowDd pick (P 8.9% W 169)',
    family: 'd1',
    params: d1Params(d1, { pullback: 89, continuationWindow: 169 }),
    origin: 'A1 sweep, 2023-participating',
    evidence: 'in-sample sweep'
  },
  {
    id: 'A2-maxNet',
    label: 'A2 refined maxNet (X 23.8 Y 0.2 L 62 buffer 1.6 + P 9.2 W 69)',
    family: 'd1',
    params: d1Params(d1, {
      targetPercentChange: 238,
      trailingBuyPercentage: 2,
      tickWindowSize: 62,
      intradayLossBuffer: 16,
      pullback: 92,
      continuationWindow: 69
    }),
    origin: 'A2 refinement from the P 9.2/W 69 anchor; Y at the box edge',
    evidence: 'in-sample refined'
  },
  {
    id: 'A2-lowDd',
    label: 'A2 refined lowDd (X 22.4 Y 0.8 stop 7.8 L 82 buffer 2.4)',
    family: 'd1',
    params: d1Params(d1, {
      targetPercentChange: 224,
      trailingBuyPercentage: 8,
      trailingStopPercentage: 78,
      tickWindowSize: 82,
      intradayLossBuffer: 24
    }),
    origin: 'A2 refinement from the D1 anchor',
    evidence: 'in-sample refined'
  },
  {
    id: 'B-A-8',
    label: 'B-A gross threshold 8%',
    family: 'd1.gross',
    params: d1Params(familyOf('d1.gross'), { activationGain: 80 }),
    origin: 'predeclared default',
    evidence: 'predeclared'
  },
  {
    id: 'B-A-9.5',
    label: 'B-A gross threshold 9.5%',
    family: 'd1.gross',
    params: d1Params(familyOf('d1.gross'), { activationGain: 95 }),
    origin: 'Track B sweep best (9.5–10.6% band)',
    evidence: 'in-sample sweep'
  },
  {
    id: 'B-B',
    label: 'B-B gross breakeven',
    family: 'd1.breakeven',
    params: d1Params(familyOf('d1.breakeven')),
    origin: 'no threshold',
    evidence: 'predeclared'
  },
  {
    id: 'B-C-10',
    label: 'B-C two-stage, early stop 10%',
    family: 'd1.twoStage',
    params: d1Params(familyOf('d1.twoStage'), { earlyStop: 100 }),
    origin: 'predeclared default',
    evidence: 'predeclared'
  },
  {
    id: 'B-C-16.3',
    label: 'B-C two-stage, early stop 16.3%',
    family: 'd1.twoStage',
    params: d1Params(familyOf('d1.twoStage'), { earlyStop: 163 }),
    origin: 'Track B refinement (equals D1)',
    evidence: 'in-sample refined'
  },
  {
    id: 'B-D',
    label: 'B-D always-active stop',
    family: 'd1.always',
    params: d1Params(familyOf('d1.always')),
    origin: 'no threshold',
    evidence: 'predeclared'
  },
  {
    id: 'C1-shipped',
    label: 'C1 always-armed (Ya 10.3 stop 7.3 hold 9 buffer 1.6)',
    family: 'always',
    params: d1Params(familyOf('always'), {
      alwaysRebound: 103,
      trailingStopPercentage: 73,
      maximumHoldDays: 9,
      intradayLossBuffer: 16
    }),
    origin: 'Track C balanced refinement (shipped in the runnable file)',
    evidence: 'in-sample refined'
  },
  {
    id: 'C1-maxNet',
    label: 'C1 always-armed (Ya 0.7 stop 5.6 hold 8 buffer 1.9)',
    family: 'always',
    params: d1Params(familyOf('always'), {
      alwaysRebound: 7,
      trailingStopPercentage: 56,
      maximumHoldDays: 8,
      intradayLossBuffer: 19
    }),
    origin: 'Track C maxNet refinement',
    evidence: 'in-sample refined'
  },
  {
    id: 'C2-shipped',
    label: 'C2 swing (K 55 Ys 0.6 Z 0 stop 4.0 hold 26 buffer 0.4)',
    family: 'swing',
    params: d1Params(familyOf('swing'), {
      swingLookback: 55,
      swingRebound: 6,
      swingProximity: 0,
      trailingStopPercentage: 40,
      maximumHoldDays: 26,
      intradayLossBuffer: 4
    }),
    origin: 'Track C balanced refinement (shipped in the runnable file)',
    evidence: 'in-sample refined'
  },
  {
    id: 'C2-maxNet',
    label: 'C2 swing (K 5 Ys 0.7 Z 0.6 stop 7.3 hold 8 buffer 2.9)',
    family: 'swing',
    params: d1Params(familyOf('swing'), {
      swingLookback: 5,
      swingRebound: 7,
      swingProximity: 6,
      trailingStopPercentage: 73,
      maximumHoldDays: 8,
      intradayLossBuffer: 29
    }),
    origin: 'Track C maxNet refinement',
    evidence: 'in-sample refined'
  },
  {
    id: 'C3-always10',
    label: 'C3: D1 + always path Ya 10%',
    family: 'deepAlwaysPostExit',
    params: d1Params(familyOf('deepAlwaysPostExit'), { alwaysRebound: 100 }),
    origin: 'Track C C3 grid best',
    evidence: 'in-sample sweep'
  },
  {
    id: 'C3-swing120',
    label: 'C3: D1 + swing path K 120 Ys 0.5%',
    family: 'deepSwingPostExit',
    params: d1Params(familyOf('deepSwingPostExit'), { swingLookback: 120, swingRebound: 5, swingProximity: 0 }),
    origin: 'Track C C3 grid, lowest-DD swing variant',
    evidence: 'in-sample sweep'
  }
];

export const evaluateFinalists = async (data: Data, args: string[]) => {
  const { ds } = data;
  const caches = makeCaches(ds);
  const evaluator = makeEvaluator(args);
  const dir = stageDir('finalists');
  const full = fullSpec(ds);
  const moves = episodeMoves(ds);
  const folds = protocol.fits.filter((fit) => fit.validation).map((fit) => fit.key);
  const list = finalistList();
  const d1Result = evaluateCandidate(ds, caches, d1, d1Params(d1), full, true);
  const lines: string[] = [
    '# Finalists: cross-architecture comparison (generated by `npm run d1-refinement -- finalists`)',
    '',
    `Common full run from ${protocol.eligibilityDate}, $100,000 per entry, 11% interest, stop fills. Evidence: reference = unchanged comparator; predeclared = a setting fixed before any result was seen; in-sample sweep/refined = chosen after inspecting the full-run results (no untouched holdout exists).`,
    '',
    '## 1. Full-run metrics',
    '',
    metricsHeader('ID', 'Evidence')
  ];
  const records: { finalist: Finalist; metrics: Metrics; csv: (string | number | undefined)[] }[] = [];

  evaluator.register(ds);

  const details = list.map((finalist) => ({
    finalist,
    ...evaluateCandidate(ds, caches, finalist.family, finalist.params, full, true)
  }));

  for (const { finalist, metrics } of details) {
    lines.push(metricsRow(`${finalist.id}: ${finalist.label}`, metrics, finalist.evidence));
  }

  lines.push(
    '',
    '## 2. By window and regime',
    '',
    segmentTable(
      details.map(({ finalist, metrics }) => ({ label: finalist.id, metrics })),
      ['full', 'development', 'reused', ...protocol.regimes.map((regime) => regime.key)]
    ),
    ''
  );

  // Frozen phenotypes on the validation windows.
  lines.push(
    '## 3. Frozen phenotypes on the validation windows',
    '',
    'The net of each fixed vector inside each validation window (continuous run attributed to the window), summed as the stitched total. This is what a retrospectively chosen vector did in each period, not what a selection rule would have picked (see the local studies for that).',
    '',
    `| ID | ${folds.map((fold) => `${fold} (${protocol.fits.find((fit) => fit.key === fold)!.validation!.start.slice(0, 4)}–${protocol.fits.find((fit) => fit.key === fold)!.validation!.end.slice(0, 4)})`).join(' | ')} | Stitched | Worst window DD |`,
    `|---|${folds.map(() => '---:').join('|')}|---:|---:|`
  );

  const validationNets = new Map<string, number[]>();

  for (const { finalist } of details) {
    const nets: number[] = [];
    const dds: number[] = [];

    for (const fold of folds) {
      const [metrics] = await evaluator.evaluate(ds.id, finalist.family, validationSpec(ds, fold), [finalist.params]);

      nets.push(metrics!.net);
      dds.push(metrics!.minuteDrawdown);
    }

    validationNets.set(finalist.id, nets);
    lines.push(
      `| ${finalist.id} | ${nets.map((net, index) => `${formatSignedDollars(net)} / ${formatDollars(dds[index]!)}`).join(' | ')} | ${formatSignedDollars(nets.reduce((total, net) => total + net, 0))} | ${formatDollars(Math.max(...dds))} |`
    );
  }

  // Sensitivities.
  lines.push(
    '',
    '## 4. Fill and interest sensitivity',
    '',
    '| ID | Stop fills, 11% | Next-open fills, 11% | Stop fills, 8% | Stop fills, 14% | Same trade list at all three rates |',
    '|---|---:|---:|---:|---:|---|'
  );

  for (const { finalist, metrics } of details) {
    const variants = [fullSpec(ds, 'next-open', 0.11), fullSpec(ds, 'stop', 0.08), fullSpec(ds, 'stop', 0.14)].map(
      (spec) => evaluateCandidate(ds, caches, finalist.family, finalist.params, spec).metrics
    );
    const samePath = variants[1]!.signature === metrics.signature && variants[2]!.signature === metrics.signature;

    lines.push(
      `| ${finalist.id} | ${formatDollars(metrics.net)} / ${formatDollars(metrics.minuteDrawdown)} | ${variants.map((variant) => `${formatDollars(variant.net)} / ${formatDollars(variant.minuteDrawdown)}`).join(' | ')} | ${samePath ? 'yes' : 'no'} |`
    );
  }

  // Leave-one-recovery-out and trade differences.
  lines.push(
    '',
    '## 5. Leave-one-recovery-out (net without the trades entered in each episode) and dependence on the best trade',
    '',
    `| ID | Net | ${moves.map((move) => `− ${move.key}`).join(' | ')} | Without best trade | Best trade share |`,
    `|---|---:|${moves.map(() => '---:').join('|')}|---:|---:|`
  );

  for (const { finalist, metrics, detail } of details) {
    const rows = tradeRows(ds, detail!.trades, detail!.accounting);
    const without = moves.map(
      (move) =>
        metrics.net - rows.filter((row) => row.episode === move.key).reduce((total, row) => total + row.profit, 0)
    );

    lines.push(
      `| ${finalist.id} | ${formatDollars(metrics.net)} | ${without.map((value) => formatDollars(value)).join(' | ')} | ${formatDollars(metrics.netWithoutBestTrade)} | ${metrics.net > 0 ? `${((100 * metrics.bestTrade) / metrics.net).toFixed(0)}%` : ''} |`
    );
  }

  lines.push(
    '',
    '## 6. Trade-level differences from D1',
    '',
    '| ID | Preserved | Altered | Gained (net) | Lost (D1 net) | Major D1 winners lost or cut |',
    '|---|---:|---:|---|---|---|'
  );

  const majorWinners = d1Result
    .detail!.trades.map((trade, index) => ({ trade, profit: d1Result.detail!.accounting.outcomes[index]!.profit }))
    .filter(({ profit }) => profit >= 10000);

  for (const { finalist, detail } of details) {
    const diff = diffTrades(ds, d1Result.detail!.trades, detail!.trades);
    const profitOf = (trade: Trade) => detail!.accounting.outcomes[detail!.trades.indexOf(trade)]!.profit;
    const d1ProfitOf = (trade: Trade) =>
      d1Result.detail!.accounting.outcomes[d1Result.detail!.trades.indexOf(trade)]!.profit;
    const cut = majorWinners.filter(({ trade, profit }) => {
      const match = detail!.trades.find(
        (other) => other.entryIndex === trade.entryIndex && other.entryBar === trade.entryBar
      );

      return !match || profitOf(match) < profit - 1000;
    });

    lines.push(
      `| ${finalist.id} | ${diff.preserved.length} | ${diff.altered.length} | ${diff.gained.length} (${formatSignedDollars(diff.gained.reduce((total, trade) => total + profitOf(trade), 0))}) | ${diff.lost.length} (${formatSignedDollars(diff.lost.reduce((total, trade) => total + d1ProfitOf(trade), 0))}) | ${cut.map(({ trade, profit }) => `${ds.dates[trade.entryIndex]} ${formatSignedDollars(profit)}`).join(', ') || 'none'} |`
    );
  }

  // Neighbourhoods.
  lines.push(
    '',
    '## 7. One-parameter neighbourhoods (full run)',
    '',
    "Each parameter moved by its grid probes (±1, ±3, ±5 tenths of a point; ±1–3 days; ±2–10 sessions); stability is the share of probes within 20% of the candidate's net and under the ceiling.",
    '',
    '| ID | Probes | Stability | Probe net range | Probe max DD | Distinct trade lists |',
    '|---|---:|---:|---|---:|---:|'
  );

  const stabilities = new Map<string, number>();

  for (const { finalist } of details) {
    const hood = await neighbourhood(evaluator, ds.id, familyOf(finalist.family), full, finalist.params);

    stabilities.set(finalist.id, hood.stability);
    lines.push(
      `| ${finalist.id} | ${hood.probes.length} | ${(hood.stability * 100).toFixed(0)}% | ${formatDollars(hood.minNet)}–${formatDollars(hood.maxNet)} | ${formatDollars(hood.maxDrawdown)} | ${hood.distinctSignatures} |`
    );
  }

  // Trade lists.
  lines.push('', '## 8. Trade lists and attribution', '');

  for (const { finalist, metrics, detail } of details) {
    const rows = tradeRows(ds, detail!.trades, detail!.accounting);

    lines.push(
      `### ${finalist.id}: ${finalist.label}`,
      '',
      `Family \`${finalist.family}\`, ${describeParams(familyOf(finalist.family), finalist.params)}. Origin: ${finalist.origin}.`,
      '',
      metricsHeader('Candidate'),
      metricsRow(finalist.id, metrics),
      '',
      tradeTable(rows, true),
      '',
      attributionTable(rows, moves),
      ''
    );
    records.push({
      finalist,
      metrics,
      csv: [
        finalist.id,
        finalist.family,
        finalist.evidence,
        describeParams(familyOf(finalist.family), finalist.params),
        ...metricValues(metrics),
        ...(validationNets.get(finalist.id) ?? []),
        stabilities.get(finalist.id)
      ]
    });
  }

  const header = csvLine([
    'id',
    'family',
    'evidence',
    'params',
    ...metricColumns,
    ...folds.map((fold) => `validation_${fold}_net`),
    'stability'
  ]);

  await writeText(path.join(dir, 'finalists.md'), lines.join('\n'));
  await writeText(
    path.join(dir, 'finalists.csv'),
    [header, ...records.map((record) => csvLine(record.csv))].join('\n')
  );
  await writeJson(
    path.join(dir, 'finalists.json'),
    details.map(({ finalist, metrics, detail }) => ({
      ...finalist,
      metrics,
      validationNets: validationNets.get(finalist.id),
      stability: stabilities.get(finalist.id),
      trades: tradeRows(ds, detail!.trades, detail!.accounting).map((row) => ({
        ...row,
        episode: row.episode || episodeOf(row.entryDate)
      }))
    }))
  );
  console.info(lines.slice(0, 32).join('\n'));
  console.info(`...\nWritten to ${dir}`);
  await evaluator.close();
};
