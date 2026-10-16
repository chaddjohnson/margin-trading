import fs from 'fs-extra';
import { researchDir, resultsDir } from './constants.ts';
import type { Execution } from './engine.ts';
import { goldenCases, runGoldenCase, verifyOriginalUnchanged } from './goldenMaster.ts';
import { type PolicySpec, gridSpecs } from './policies.ts';
import {
  type RuleRun,
  buildContext,
  compareRow,
  episodeAttribution,
  familyLabel,
  phaseEvents,
  phaseIndicators,
  phaseStrategiesDev,
  placeboSummary,
  runRule,
  sha256File,
  summaryAlign,
  summaryHeaders,
  summaryRow
} from './study.ts';
import { dollars, markdownTable, percent, signedDollars, writeJson } from './tables.ts';
import { runFinal } from './final.ts';

const tablesDir = `${resultsDir}/tables`;
const writeTable = async (name: string, content: string) => {
  await fs.ensureDir(tablesDir);
  await fs.writeFile(`${tablesDir}/${name}.md`, `${content}\n`);
};

const golden = async () => {
  const original = await verifyOriginalUnchanged();
  const cases = [];

  for (const testCase of goldenCases) {
    cases.push(await runGoldenCase(testCase));
  }

  await writeJson(`${resultsDir}/golden_master.json`, { original, cases });
  console.info(
    `Original unchanged: ${original.unchanged}. Golden master: ${cases.filter((c) => c.identical).length}/${cases.length} identical`
  );

  if (!original.unchanged || cases.some((c) => !c.identical)) {
    throw new Error('Baseline reproduction failed');
  }
};

const dev = async () => {
  const protocolSha = await sha256File(`${researchDir}/PROTOCOL.md`);
  const context = await buildContext('VGT');
  const { events, baseline } = await phaseEvents(context, 'dev');

  await phaseIndicators(context, events, baseline, 'dev');

  const { runs, frozenPicks, walkForward, walkForwardFlat, folds, placebos } = await phaseStrategiesDev(
    context,
    events,
    baseline
  );
  const end = context.devEnd;
  const baselineOf = (execution: Execution) =>
    runs.find((run) => run.spec.id === 'A_original' && run.execution === execution)!.result;

  // Grid table (same-close), grouped by family.
  const gridRows = runs
    .filter((run) => run.execution === 'close')
    .map((run) => ({
      run,
      comparison: compareRow(context, run.result, baselineOf('close'), events, context.start, end, end)
    }));

  await writeTable(
    'grid_development',
    markdownTable(
      [
        'Rule',
        'Net P&L',
        'Δ net vs A',
        'Max MTM DD',
        'Δ DD',
        'Δ J',
        'Entries',
        'Severe-entry rate',
        'Severe/deep episodes avoided',
        'Missed winners',
        'Exposure'
      ],
      gridRows.map(({ run, comparison }) => [
        run.spec.id,
        dollars(comparison.metrics.netProfit),
        signedDollars(comparison.deltaNet),
        dollars(comparison.metrics.maxDrawdown),
        signedDollars(comparison.deltaDrawdown),
        signedDollars(comparison.deltaObjective),
        comparison.metrics.entries,
        percent(comparison.metrics.severeEntryRate20, 0),
        `${comparison.severe.avoided}/${comparison.severe.severeEpisodes} · ${comparison.deep.avoided}/${comparison.deep.severeEpisodes}`,
        comparison.missed.length,
        comparison.metrics.exposureSessions
      ]),
      ['l', 'r', 'r', 'r', 'r', 'r', 'r', 'r', 'r', 'r', 'r']
    )
  );

  // Walk-forward.
  const families = ['B', 'C', 'D', 'E', 'F'];

  await writeTable(
    'walk_forward',
    markdownTable(
      ['Test year', 'A net / DD', ...families.map((family) => `${family} pick → test net / DD`)],
      folds.map((fold) => {
        const a = fold.B as { baselineNet: number; baselineDrawdown: number };
        return [
          String(fold.testYear),
          `${dollars(a.baselineNet)} / ${dollars(a.baselineDrawdown)}`,
          ...families.map((family) => {
            const value = fold[family] as { pick: string; testNet: number; testDrawdown: number };
            return `${value.pick} → ${dollars(value.testNet)} / ${dollars(value.testDrawdown)}`;
          })
        ];
      }),
      ['l', 'r', ...families.map(() => 'l' as const)]
    ) +
      '\n\nStitched out-of-sample 2018–2022 (daily increments of each year’s pick):\n\n' +
      markdownTable(
        ['Family', 'Net P&L', 'Max MTM DD', 'J = net − DD', 'Δ J vs A'],
        Object.entries(walkForward).map(([family, value]) => [
          familyLabel[family]!,
          dollars(value.net),
          dollars(value.maxDrawdown),
          dollars(value.objective),
          family === 'A' ? '–' : signedDollars(value.objective - walkForward.A!.objective)
        ]),
        ['l', 'r', 'r', 'r', 'r']
      )
  );

  await fs.appendFile(
    `${tablesDir}/walk_forward.md`,
    '\nSensitivity: each test year started flat with that year\u2019s pick (a path a trader could follow):\n\n' +
      markdownTable(
        ['Family', 'Net P&L', 'Max MTM DD', 'J', '\u0394 J vs A'],
        Object.entries(walkForwardFlat).map(([family, value]) => [
          familyLabel[family]!,
          dollars(value.net),
          dollars(value.maxDrawdown),
          dollars(value.objective),
          family === 'A' ? '\u2013' : signedDollars(value.objective - walkForwardFlat.A!.objective)
        ]),
        ['l', 'r', 'r', 'r', 'r']
      ) +
      '\n'
  );

  // Frozen picks: development summary and attribution.
  const runOf = (spec: PolicySpec, execution: Execution): RuleRun =>
    runs.find((run) => run.spec.id === spec.id && run.execution === execution) ?? {
      spec,
      execution,
      result: runRule(context, spec, { execution, end })
    };
  const summary: (string | number)[][] = [
    summaryRow(
      familyLabel.A!,
      compareRow(context, baselineOf('close'), baselineOf('close'), events, context.start, end, end)
    )
  ];
  const attributionRows: (string | number)[][] = [];

  for (const [family, spec] of Object.entries(frozenPicks)) {
    const run = runOf(spec, 'close');
    const comparison = compareRow(context, run.result, baselineOf('close'), events, context.start, end, end);
    const attribution = episodeAttribution(
      run.result,
      baselineOf('close'),
      events.episodes,
      events.episodeOf,
      context.start,
      end
    );

    summary.push(summaryRow(`${familyLabel[family]}: ${spec.id}`, comparison));
    attributionRows.push([
      spec.id,
      signedDollars(attribution.totalDelta),
      ...attribution.rows.map((row) => signedDollars(row.delta)),
      signedDollars(attribution.outside),
      `${attribution.largest?.episode.signalDate ?? '–'} (${signedDollars(attribution.largest?.delta ?? 0)})`,
      signedDollars(attribution.withoutLargest),
      `${signedDollars(attribution.bootstrapLow)} to ${signedDollars(attribution.bootstrapHigh)}`
    ]);
  }

  await writeTable('summary_development', markdownTable(summaryHeaders, summary, summaryAlign));
  await writeTable(
    'attribution_development',
    markdownTable(
      [
        'Frozen pick',
        'Δ net vs A',
        ...events.episodes.map((episode) => episode.signalDate),
        'Outside episodes',
        'Largest episode',
        'Δ without it',
        'Episode bootstrap 95%'
      ],
      attributionRows,
      ['l', 'r', ...events.episodes.map(() => 'r' as const), 'r', 'l', 'r', 'l']
    )
  );

  // Placebo calibration (Amendment 1).
  const placeboTable: (string | number)[][] = [];

  for (const name of ['jitter5', 'jitter10']) {
    const summary = placeboSummary(placebos, name);
    placeboTable.push([
      name,
      summary.n,
      `${signedDollars(summary.net.p5)} / ${signedDollars(summary.net.p50)} / ${signedDollars(summary.net.p95)}`,
      `${signedDollars(summary.objective.p5)} / ${signedDollars(summary.objective.p50)} / ${signedDollars(summary.objective.p95)}`,
      `${signedDollars(summary.objective.min)} … ${signedDollars(summary.objective.max)}`,
      Object.entries(frozenPicks)
        .map(([family, spec]) => {
          const row = gridRows.find((value) => value.run.spec.id === spec.id);
          const delta = row
            ? row.comparison.deltaObjective
            : compareRow(context, runOf(spec, 'close').result, baselineOf('close'), events, context.start, end, end)
                .deltaObjective;
          return `${family} ${percent(summary.percentileOf(delta), 0)}`;
        })
        .join(', ')
    ]);
  }

  await writeTable(
    'placebo_development',
    markdownTable(
      [
        'Placebo (random deferral)',
        'Seeds',
        'Δ net vs A: 5th / 50th / 95th pct',
        'Δ J vs A: 5th / 50th / 95th pct',
        'Δ J range',
        'Frozen picks’ Δ J percentile in the placebo distribution'
      ],
      placeboTable,
      ['l', 'r', 'r', 'r', 'r', 'l']
    )
  );

  const frozen = {
    frozenAt: new Date().toISOString(),
    protocolSha256: protocolSha,
    objective: 'net − max MTM drawdown on 2014-01-02 → 2022-12-30, same-close execution',
    picks: Object.fromEntries(
      Object.entries(frozenPicks).map(([family, spec]) => [family, { id: spec.id, description: spec.description }])
    ),
    gridSize: gridSpecs.length
  };

  if (await fs.pathExists(`${resultsDir}/frozen.json`)) {
    const existing = await fs.readJson(`${resultsDir}/frozen.json`);
    const same = JSON.stringify(existing.picks) === JSON.stringify(frozen.picks);

    console.info(
      `frozen.json exists (${existing.frozenAt}); picks ${same ? 'unchanged' : 'DIFFER — keeping the existing file'}`
    );
  } else {
    await writeJson(`${resultsDir}/frozen.json`, frozen);
  }

  console.info(JSON.stringify(frozen.picks, null, 1));
};

// Refreshes every `<!-- table:NAME -->` … `<!-- /table -->` block in the reports with results/tables/NAME.md.
const reports = async () => {
  const files = (await fs.readdir(researchDir)).filter((file) => file.endsWith('.md') && file !== 'PROTOCOL.md');

  for (const file of files) {
    const text = await fs.readFile(`${researchDir}/${file}`, 'utf8');
    const names = new Set<string>();
    const pattern = /<!-- table:([\w-]+) -->[\s\S]*?<!-- \/table -->/g;
    let output = text;

    for (const match of text.matchAll(pattern)) {
      const name = match[1]!;
      const table = (await fs.readFile(`${tablesDir}/${name}.md`, 'utf8')).trim();
      names.add(name);
      // A replacer function, so `$` sequences in the tables are not treated as patterns.
      output = output.replace(match[0], () => `<!-- table:${name} -->\n${table}\n<!-- /table -->`);
    }

    if (output !== text) {
      await fs.writeFile(`${researchDir}/${file}`, output);
    }

    console.info(`${file}: ${names.size} tables`);
  }
};

export const main = async (command = 'all') => {
  if (command === 'golden' || command === 'all') await golden();
  if (command === 'dev' || command === 'all') await dev();
  if (command === 'final' || command === 'all') await runFinal();
  if (command === 'reports' || command === 'all') await reports();
};
