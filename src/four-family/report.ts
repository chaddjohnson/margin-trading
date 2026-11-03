// Report generation: every table and every verdict computed mechanically from the result files. Narrative
// written by hand lives in research/trailing-buy-four-family-optimization/notes/ and is inserted verbatim.
import path from 'node:path';
import fs from 'fs-extra';
import { protocol, readJson, resultsRoot, writeJson } from './context.ts';
import type { Metrics, SegmentSummary } from './evaluate.ts';
import {
  type Family,
  type FamilyKey,
  type IntParams,
  allParamKeys,
  describeParams,
  families,
  familyKeys,
  formatValue,
  specs
} from './families.ts';
import type { Pick } from './selection.ts';
import { fitsRoot, freezeFile, stageDir, toCsv } from './study.ts';

const studyRoot = path.dirname(resultsRoot);
const notesDir = path.join(studyRoot, 'notes');
const familyList = familyKeys.map((key) => families[key]);
const folds = ['fold1', 'fold2', 'fold3'] as const;

interface ContenderResult {
  label: string;
  id: string;
  params: IntParams;
  category?: string;
  metrics: Metrics;
}

type Runs = Record<string, ContenderResult[]>;

// ---------------------------------------------------------------------------------------------------------
// Formatting

const dollars = (value: number | undefined) => {
  if (value === undefined || !Number.isFinite(value)) {
    return '—';
  }

  const rounded = Math.round(value);

  return `${rounded < 0 ? '−' : ''}$${Math.abs(rounded).toLocaleString('en-US')}`;
};

const signedDollars = (value: number | undefined) =>
  value === undefined || !Number.isFinite(value) ? '—' : value > 0 ? `+${dollars(value)}` : dollars(value);

const pct = (value: number | undefined, digits = 1) =>
  value === undefined || !Number.isFinite(value) ? '—' : `${(value * 100).toFixed(digits)}%`;

// A best trade's share of net profit only means something when the net is positive.
const share = (metrics: Metrics | undefined) =>
  metrics === undefined ? '—' : metrics.net > 0 ? pct(metrics.bestTradeShare, 0) : 'n/a (net ≤ 0)';

const days = (value: number | undefined) => (value === undefined || !Number.isFinite(value) ? '—' : value.toFixed(1));

const table = (header: string[], rows: (string | number)[][], align?: string[]) => {
  const separator = header.map((_cell, index) => align?.[index] ?? '---');

  return [header, separator, ...rows].map((row) => `| ${row.join(' | ')} |`).join('\n');
};

const segment = (metrics: Metrics | undefined, label: string): SegmentSummary | undefined =>
  metrics?.segments.find((item) => item.label === label);

const paramCells = (family: Family, params: IntParams) =>
  allParamKeys.map((key) => (family.paramKeys.includes(key) ? formatValue(key, params[key]) : 'N/A'));

const paramHeader = allParamKeys.map((key) => specs[key].short);

const median = (values: number[]) => {
  const sorted = values.filter(Number.isFinite).sort((a, b) => a - b);

  if (sorted.length === 0) {
    return NaN;
  }

  const middle = Math.floor(sorted.length / 2);

  return sorted.length % 2 ? sorted[middle]! : (sorted[middle - 1]! + sorted[middle]!) / 2;
};

const exists = (file: string) => fs.pathExists(file);

const note = async (name: string) => {
  const file = path.join(notesDir, name);

  return (await exists(file)) ? `${(await fs.readFile(file, 'utf8')).trim()}\n\n` : '';
};

const write = async (name: string, text: string) => {
  await fs.outputFile(path.join(studyRoot, name), `${text.trim()}\n`);
};

// ---------------------------------------------------------------------------------------------------------
// Loading

interface Loaded {
  stages: Record<string, Record<FamilyKey, any>>;
  selections: Record<string, Record<FamilyKey, any>>;
  controls: Record<FamilyKey, any>;
  validations: Record<string, any>;
  development?: any;
  freeze?: any;
  holdout?: any;
  holdoutAttempts?: any[];
  parity?: any;
  audit?: any;
  benchmark?: any;
}

const load = async (): Promise<Loaded> => {
  const loaded: Loaded = { stages: {}, selections: {}, controls: {} as Loaded['controls'], validations: {} };

  for (const fit of protocol.fits) {
    loaded.stages[fit.key] = {} as Record<FamilyKey, any>;
    loaded.selections[fit.key] = {} as Record<FamilyKey, any>;

    for (const family of familyList) {
      const dir = stageDir(fit.key, family.key);

      if (await exists(path.join(dir, 'stage.json'))) {
        loaded.stages[fit.key]![family.key] = await readJson(path.join(dir, 'stage.json'));
      }

      if (await exists(path.join(dir, 'selection.json'))) {
        loaded.selections[fit.key]![family.key] = await readJson(path.join(dir, 'selection.json'));
      }

      if (fit.key === 'final' && (await exists(path.join(dir, 'control.json')))) {
        loaded.controls[family.key] = await readJson(path.join(dir, 'control.json'));
      }
    }

    if (await exists(path.join(fitsRoot, fit.key, 'validation.json'))) {
      loaded.validations[fit.key] = await readJson(path.join(fitsRoot, fit.key, 'validation.json'));
    }
  }

  const optional = async (file: string) => ((await exists(file)) ? readJson<any>(file) : undefined);

  loaded.development = await optional(path.join(fitsRoot, 'final', 'development.json'));
  loaded.freeze = await optional(freezeFile);
  loaded.holdout = await optional(path.join(resultsRoot, 'holdout', 'holdout.json'));
  loaded.holdoutAttempts = await optional(path.join(resultsRoot, 'holdout', 'attempts.json'));
  loaded.parity = await optional(path.join(resultsRoot, 'parity', 'parity.json'));
  loaded.audit = await optional(path.join(resultsRoot, 'audit', 'data-audit.json'));
  loaded.benchmark = await optional(path.join(resultsRoot, 'benchmark.json'));

  return loaded;
};

const runFor = (runs: Runs | undefined, key: string, id: string, label?: string) =>
  runs?.[key]?.find((item) => item.id === id && (label === undefined || item.label === label));

const isPick = (item: ContenderResult) => item.label.startsWith('pick');

// ---------------------------------------------------------------------------------------------------------
// Verdicts (PROTOCOL.md section 9)

interface WindowMeasure {
  net: number;
  minuteDrawdown: number;
}

// Per family and out-of-sample window: the median of the 10 picks, the balanced #1 pick, and the defaults.
const windowMeasures = (loaded: Loaded) => {
  const windows = ['2020–2021', '2022', '2023', 'holdout'] as const;
  const result: Record<
    FamilyKey,
    Record<string, Record<(typeof windows)[number], WindowMeasure | undefined>>
  > = {} as never;

  for (const family of familyList) {
    const measures: Record<string, Record<string, WindowMeasure | undefined>> = {
      median10: {},
      balanced1: {},
      profit1: {},
      lowDD1: {},
      defaultOwn: {},
      defaultY30: {},
      defaultY40: {}
    };
    const fill = (window: string, items: ContenderResult[] | undefined, segmentLabel: string) => {
      if (!items) {
        return;
      }

      const picks = items.filter(isPick);
      const value = (item: ContenderResult | undefined): WindowMeasure | undefined => {
        const part = item && segment(item.metrics, segmentLabel);

        return part ? { net: part.net, minuteDrawdown: part.minuteDrawdown } : undefined;
      };

      measures.median10![window] =
        picks.length > 0
          ? {
              net: median(picks.map((item) => segment(item.metrics, segmentLabel)!.net)),
              minuteDrawdown: median(picks.map((item) => segment(item.metrics, segmentLabel)!.minuteDrawdown))
            }
          : undefined;
      measures.balanced1![window] = value(picks.find((item) => item.category === 'balanced'));
      measures.profit1![window] = value(picks.find((item) => item.category === 'profit'));
      measures.lowDD1![window] = value(picks.find((item) => item.category === 'low-DD'));

      const defaults = items.filter((item) => !isPick(item));
      const own = defaults.find((item) => item.label.startsWith('default (file Y'));
      const byY = (y: number) => defaults.find((item) => item.params.trailingBuyPercentage === y);

      measures.defaultOwn![window] = value(own);
      measures.defaultY30![window] = value(byY(30));
      measures.defaultY40![window] = value(byY(40));
    };

    folds.forEach((fold, index) => {
      fill(windows[index]!, loaded.validations[fold]?.families?.[family.key]?.['continuous-stop'], 'validation');
    });
    fill('holdout', loaded.holdout?.families?.[family.key]?.['continuous-stop-0.11'], 'holdout');
    result[family.key] = measures as never;
  }

  const allIn: Record<string, WindowMeasure | undefined> = {};

  folds.forEach((fold, index) => {
    const part = segment(loaded.validations[fold]?.allIn?.['continuous-stop'], 'validation');

    allIn[windows[index]!] = part && { net: part.net, minuteDrawdown: part.minuteDrawdown };
  });

  const holdoutAllIn = segment(loaded.holdout?.allIn?.['continuous-stop-0.11'], 'holdout');

  allIn.holdout = holdoutAllIn && { net: holdoutAllIn.net, minuteDrawdown: holdoutAllIn.minuteDrawdown };

  return { windows, perFamily: result, allIn };
};

const compare = (
  a: Record<string, WindowMeasure | undefined>,
  b: Record<string, WindowMeasure | undefined>,
  windows: readonly string[]
) => {
  const available = windows.filter((window) => a[window] && b[window]);
  const wins = available.filter((window) => a[window]!.net > b[window]!.net).length;
  const totalA = available.reduce((total, window) => total + a[window]!.net, 0);
  const totalB = available.reduce((total, window) => total + b[window]!.net, 0);
  const worstA = Math.max(...available.map((window) => a[window]!.minuteDrawdown));
  const worstB = Math.max(...available.map((window) => b[window]!.minuteDrawdown));
  const credited = available.length === windows.length && wins >= 3 && totalA > totalB && worstA <= 1.25 * worstB;

  return { windows: available.length, wins, totalA, totalB, worstA, worstB, credited };
};

export const computeVerdicts = (loaded: Loaded) => {
  const { windows, perFamily, allIn } = windowMeasures(loaded);
  const pairs: { label: string; a: FamilyKey; b: FamilyKey; modification: string }[] = [
    { label: 'buffered vs not (restricted)', a: 'bufferedLoss', b: 'trailingBuy', modification: 'buffered exit' },
    {
      label: 'buffered vs not (no restriction)',
      a: 'bufferedLossNoReentry',
      b: 'noReentry',
      modification: 'buffered exit'
    },
    {
      label: 'no restriction vs restriction (unbuffered)',
      a: 'noReentry',
      b: 'trailingBuy',
      modification: 'no re-entry restriction'
    },
    {
      label: 'no restriction vs restriction (buffered)',
      a: 'bufferedLossNoReentry',
      b: 'bufferedLoss',
      modification: 'no re-entry restriction'
    },
    { label: 'both vs neither', a: 'bufferedLossNoReentry', b: 'trailingBuy', modification: 'both' }
  ];
  const optimized = pairs.map((pair) => {
    const median10 = compare(perFamily[pair.a].median10!, perFamily[pair.b].median10!, windows);
    const balanced1 = compare(perFamily[pair.a].balanced1!, perFamily[pair.b].balanced1!, windows);

    return { ...pair, median10, balanced1, credited: median10.credited && balanced1.credited };
  });
  const matchedDefaults = pairs.flatMap((pair) =>
    (['defaultY30', 'defaultY40'] as const).map((measure) => ({
      ...pair,
      measure,
      ...compare(perFamily[pair.a][measure]!, perFamily[pair.b][measure]!, windows)
    }))
  );
  const versusOwnDefault = familyList.map((family) => ({
    family: family.key,
    median10: compare(perFamily[family.key].median10!, perFamily[family.key].defaultOwn!, windows),
    balanced1: compare(perFamily[family.key].balanced1!, perFamily[family.key].defaultOwn!, windows)
  }));
  const versusAllIn = familyList.map((family) => ({
    family: family.key,
    median10: compare(perFamily[family.key].median10!, allIn, windows),
    balanced1: compare(perFamily[family.key].balanced1!, allIn, windows),
    defaultOwn: compare(perFamily[family.key].defaultOwn!, allIn, windows)
  }));

  return { windows, perFamily, allIn, optimized, matchedDefaults, versusOwnDefault, versusAllIn };
};

// ---------------------------------------------------------------------------------------------------------
// Top-10 tables

const holdoutRuns = (loaded: Loaded, family: Family): Runs | undefined => loaded.holdout?.families?.[family.key];
const developmentRuns = (loaded: Loaded, family: Family): Runs | undefined =>
  loaded.development?.families?.[family.key];

const top10File = (family: Family) =>
  ({
    trailingBuy: 'TOP10_TRAILING_BUY.md',
    bufferedLoss: 'TOP10_BUFFERED_LOSS.md',
    noReentry: 'TOP10_NO_REENTRY.md',
    bufferedLossNoReentry: 'TOP10_BUFFERED_LOSS_NO_REENTRY.md'
  })[family.key];

// Walk-forward evidence for a final pick: only when the identical vector was also a pick of a fold.
const walkForwardEvidence = (loaded: Loaded, family: Family, id: string) => {
  const evidence: string[] = [];

  for (const fold of folds) {
    const item = loaded.validations[fold]?.families?.[family.key]?.['continuous-stop']?.find(
      (entry: ContenderResult) => entry.id === id && isPick(entry)
    );
    const part = item && segment(item.metrics, 'validation');

    if (part) {
      evidence.push(`${fold}: ${dollars(part.net)} (${part.startDate.slice(0, 4)}–${part.endDate.slice(0, 4)})`);
    }
  }

  return evidence.length > 0 ? evidence.join('; ') : 'n/a (not a fold pick)';
};

const writeTop10 = async (loaded: Loaded, family: Family) => {
  const selection = loaded.selections.final?.[family.key];

  if (!selection) {
    return;
  }

  const picks: Pick[] = selection.picks;
  const development = developmentRuns(loaded, family);
  const holdout = holdoutRuns(loaded, family);
  const devKey = 'stop-0.11';
  const holdoutKey = 'continuous-stop-0.11';
  const contenders: ContenderResult[] = development?.[devKey] ?? [];
  const baselines = contenders.filter((item) => !isPick(item));
  const ownDefault = baselines.find((item) => item.label.startsWith('default (file Y'));
  const allInDev = loaded.development?.allIn?.[devKey] as Metrics | undefined;
  const allInHoldout = loaded.holdout?.allIn?.[holdoutKey] as Metrics | undefined;
  const ownHoldout = ownDefault && runFor(holdout, holdoutKey, ownDefault.id, ownDefault.label);
  const rowsFor = (items: { rank: string; id: string; category: string; params: IntParams; label?: string }[]) => items;
  const entries = rowsFor([
    ...picks.map((pick) => ({ rank: String(pick.rank), id: pick.id, category: pick.category, params: pick.params })),
    ...baselines.map((item) => ({
      rank: 'base',
      id: item.id,
      category: item.label,
      params: item.params,
      label: item.label
    }))
  ]);
  const devMetrics = (id: string, label?: string) => runFor(development, devKey, id, label)?.metrics;
  const holdoutMetrics = (id: string, label?: string) => runFor(holdout, holdoutKey, id, label)?.metrics;
  const lines: string[] = [];

  lines.push(`# Top 10 phenotypes — family ${family.number}: ${family.name}`);
  lines.push('');
  lines.push(
    `Source: \`${family.source === 'trailingBuy' ? 'src/app/allIn-trailingBuy.ts' : `src/app/allIn-trailingBuy-${family.source === 'bufferedLoss' ? 'bufferedLoss' : family.source === 'noReentry' ? 'noReentry' : 'bufferedLoss-noReentry'}.ts`}\` (unmodified). Free parameters: ${family.paramKeys.length} (${family.paramKeys.map((key) => specs[key].short).join(', ')}); absent parameters are **N/A**. File default Y = ${family.fileY / 10}%.`
  );
  lines.push('');
  lines.push(
    'Picked by the pre-declared rule (PROTOCOL.md §8) on the **final development fit, 2016-09-20 → 2023-12-29 (in-sample)**, frozen before the holdout. `stop` fills, 11% margin, $100,000 per entry, no costs. Drawdowns are of the $100,000 strategy P&L, not account equity.'
  );
  lines.push('');
  lines.push(await note(`${top10File(family).replace('.md', '')}.md`));
  lines.push('## A. Identity and parameters');
  lines.push('');
  lines.push(
    table(
      ['Rank', 'ID', 'Category', 'Unique phenotype (clone-group size)', ...paramHeader],
      entries.map((entry) => {
        const pick = picks.find((item) => item.id === entry.id && entry.rank !== 'base');

        return [
          entry.rank,
          `\`${entry.id}\``,
          entry.category,
          pick ? `yes (${pick.cloneGroupSize})` : '—',
          ...paramCells(family, entry.params)
        ];
      })
    )
  );
  lines.push('');
  lines.push('## B. Development fit (in-sample, 2016-09-20 → 2023-12-29)');
  lines.push('');
  lines.push(
    table(
      [
        'Rank',
        'Net after interest',
        'Minute DD',
        'Daily DD',
        'Interest',
        'Trades',
        'W / L',
        'Avg hold (d)',
        'Max hold (d)',
        'Time in market',
        'Worst trade',
        'Best-trade share',
        'Δ net vs own default',
        'Δ net vs allIn.ts'
      ],
      entries.map((entry) => {
        const metrics = devMetrics(entry.id, entry.label);

        return [
          entry.rank,
          dollars(metrics?.net),
          dollars(metrics?.minuteDrawdown),
          dollars(metrics?.dailyDrawdown),
          dollars(metrics?.interest),
          metrics?.entries ?? '—',
          metrics ? `${metrics.wins} / ${metrics.losses}` : '—',
          days(metrics?.averageHoldDays),
          days(metrics?.maximumHoldDays),
          pct(metrics?.exposure),
          dollars(metrics?.worstTrade),
          share(metrics),
          signedDollars(metrics && ownDefault ? metrics.net - ownDefault.metrics.net : undefined),
          signedDollars(metrics && allInDev ? metrics.net - allInDev.net : undefined)
        ];
      })
    )
  );
  lines.push('');
  lines.push(
    `allIn.ts on the same dates and conventions: net ${dollars(allInDev?.net)}, minute DD ${dollars(allInDev?.minuteDrawdown)}, daily DD ${dollars(allInDev?.dailyDrawdown)}, ${allInDev?.entries ?? '—'} trades.`
  );
  lines.push('');
  lines.push('## C. Out-of-sample: frozen holdout 2024-01-02 → 2025-10-13 (evaluated once) and combined');
  lines.push('');

  if (!holdout) {
    lines.push('_The holdout has not been run._');
  } else {
    lines.push(
      table(
        [
          'Rank',
          'Holdout net',
          'Holdout minute DD',
          'Holdout daily DD',
          'Holdout interest',
          'Holdout trades',
          'Δ vs own default',
          'Δ vs allIn.ts',
          'Flat-start holdout net',
          'Combined 2016-09-20 → 2025-10-13 net',
          'Combined minute DD',
          'Walk-forward evidence'
        ],
        entries.map((entry) => {
          const metrics = holdoutMetrics(entry.id, entry.label);
          const part = segment(metrics, 'holdout');
          const combined = segment(metrics, 'combined');
          const flat = segment(runFor(holdout, 'flat-stop-0.11', entry.id, entry.label)?.metrics, 'holdout');
          const ownPart = segment(ownHoldout?.metrics, 'holdout');
          const allInPart = segment(allInHoldout, 'holdout');

          return [
            entry.rank,
            dollars(part?.net),
            dollars(part?.minuteDrawdown),
            dollars(part?.dailyDrawdown),
            dollars(part?.interest),
            part?.entries ?? '—',
            signedDollars(part && ownPart ? part.net - ownPart.net : undefined),
            signedDollars(part && allInPart ? part.net - allInPart.net : undefined),
            dollars(flat?.net),
            dollars(combined?.net),
            dollars(combined?.minuteDrawdown),
            entry.rank === 'base' ? '—' : walkForwardEvidence(loaded, family, entry.id)
          ];
        })
      )
    );
    lines.push('');

    const allInPart = segment(allInHoldout, 'holdout');
    const allInCombined = segment(allInHoldout, 'combined');

    lines.push(
      `allIn.ts on the same dates: holdout net ${dollars(allInPart?.net)}, minute DD ${dollars(allInPart?.minuteDrawdown)}, ${allInPart?.entries ?? '—'} trades; combined net ${dollars(allInCombined?.net)}.`
    );
    lines.push('');
    lines.push(
      '"Combined" is one continuous run over development and holdout; most of it is in-sample for these picks and it is **not** an out-of-sample figure. A final-fit pick has a walk-forward figure only if exactly the same vector was also picked on a fold\'s own training data.'
    );
  }

  lines.push('');
  lines.push('## D. Robustness and notes');
  lines.push('');
  lines.push(
    table(
      [
        'Rank',
        'Classification',
        'Robust net (Q25 of probes)',
        'Median probe net',
        'Robust minute DD (Q75)',
        'Worst ±1-step net',
        'Probe clones',
        'next-open dev net',
        'next-open holdout net',
        'Notes'
      ],
      entries
        .filter((entry) => entry.rank !== 'base')
        .map((entry) => {
          const pick = picks.find((item) => item.id === entry.id)!;
          const nextOpenDev = runFor(development, 'next-open-0.11', entry.id)?.metrics;
          const nextOpenHoldout = segment(runFor(holdout, 'continuous-next-open-0.11', entry.id)?.metrics, 'holdout');
          const devMetricsValue = devMetrics(entry.id);
          const notes = [...pick.robustness.notes];

          if (devMetricsValue && devMetricsValue.bestTradeShare > 0.5) {
            notes.push(`best trade = ${pct(devMetricsValue.bestTradeShare, 0)} of development net`);
          }

          return [
            entry.rank,
            pick.robustness.classification,
            dollars(pick.robustness.robustNet),
            dollars(pick.robustness.medianNet),
            dollars(pick.robustness.robustDrawdown),
            dollars(pick.robustness.worstOneStepNet),
            pct(pick.robustness.cloneShare, 0),
            dollars(nextOpenDev?.net),
            dollars(nextOpenHoldout?.net),
            notes.join('; ') || '—'
          ];
        })
    )
  );
  lines.push('');
  lines.push(
    'Full rows, including every probe and every per-year figure, are in `results/shortlist.csv`, `results/shortlist.json` and ROBUSTNESS.md.'
  );

  await write(top10File(family), lines.join('\n'));
};

// ---------------------------------------------------------------------------------------------------------
// Walk-forward

const writeWalkForward = async (loaded: Loaded) => {
  const lines: string[] = ['# Walk-forward: fold-specific train-then-validate', ''];

  lines.push(
    "Each fold's 10 picks per family were chosen by the pre-declared rule (PROTOCOL.md §8) on **that fold's training dates only**, then evaluated on the following window. Primary: one continuous run from 2016-09-20 with the window's P&L attributed (positions may carry in); flat start = arming only from the window's first session. `stop` fills and 11% unless noted. These are the only true out-of-sample figures before the holdout; final-fit picks are **not** given retrospective walk-forward figures."
  );
  lines.push('');
  lines.push(await note('WALK_FORWARD.md'));

  for (const fold of folds) {
    const validation = loaded.validations[fold];
    const fit = protocol.fits.find((item) => item.key === fold)!;

    if (!validation) {
      continue;
    }

    lines.push(
      `## ${fold}: train 2016-09-20 → ${fit.trainEnd}, validate ${fit.validation!.start} → ${fit.validation!.end}`
    );
    lines.push('');

    const allInValidation = segment(validation.allIn?.['continuous-stop'], 'validation');
    const allInFlat = segment(validation.allIn?.['flat-stop'], 'validation');

    lines.push(
      `allIn.ts on the same window: continuous ${dollars(allInValidation?.net)} (minute DD ${dollars(allInValidation?.minuteDrawdown)}, ${allInValidation?.entries ?? '—'} trades), flat start ${dollars(allInFlat?.net)}; training ${dollars(validation.allIn?.training?.net)}.`
    );
    lines.push('');

    for (const family of familyList) {
      const runs: Runs | undefined = validation.families?.[family.key];
      const selection = loaded.selections[fold]?.[family.key];

      if (!runs) {
        continue;
      }

      lines.push(
        `### Family ${family.number}: ${family.name} (minimum ${selection?.minEntries ?? '—'} training entries)`
      );
      lines.push('');
      lines.push(
        table(
          [
            'Contender',
            'Category',
            'Parameters',
            'Train net',
            'Train minute DD',
            'Train trades',
            'Validation net',
            'Validation minute DD',
            'Validation trades',
            'Flat-start net',
            'next-open net',
            'Robustness'
          ],
          runs['continuous-stop']!.map((item) => {
            const training = runFor(runs, 'training', item.id, item.label)?.metrics;
            const part = segment(item.metrics, 'validation');
            const flat = segment(runFor(runs, 'flat-stop', item.id, item.label)?.metrics, 'validation');
            const nextOpen = segment(runFor(runs, 'continuous-next-open', item.id, item.label)?.metrics, 'validation');
            const pick = (selection?.picks as Pick[] | undefined)?.find((entry) => entry.id === item.id);

            return [
              `${item.label} \`${item.id}\``,
              item.category ?? '—',
              describeParams(family, item.params),
              dollars(training?.net),
              dollars(training?.minuteDrawdown),
              training?.entries ?? '—',
              dollars(part?.net),
              dollars(part?.minuteDrawdown),
              part?.entries ?? '—',
              dollars(flat?.net),
              dollars(nextOpen?.net),
              pick?.robustness.classification ?? '—'
            ];
          })
        )
      );
      lines.push('');

      const picks = runs['continuous-stop']!.filter(isPick);
      const values = picks.map((item) => segment(item.metrics, 'validation')!.net);
      const own = runs['continuous-stop']!.find((item) => item.label.startsWith('default (file Y'));
      const ownNet = segment(own?.metrics, 'validation')?.net ?? NaN;

      lines.push(
        `Picks: median validation net ${dollars(median(values))}, ${values.filter((value) => value > 0).length}/${values.length} positive, ${values.filter((value) => value > ownNet).length}/${values.length} above the family's own default (${dollars(ownNet)}), ${values.filter((value) => value > (allInValidation?.net ?? Infinity)).length}/${values.length} above allIn.ts.`
      );
      lines.push('');
    }
  }

  // Stitched category leaders across the folds.
  const verdicts = computeVerdicts(loaded);
  const windows = verdicts.windows.filter((window) => window !== 'holdout');

  lines.push('## Stitched pre-declared policies, 2020-01-02 → 2023-12-29');
  lines.push('');
  lines.push(
    'Each window uses the pick made on the preceding training data only (fold 1 → 2020–2021, fold 2 → 2022, fold 3 → 2023). Totals add the three windows; "worst DD" is the largest window minute drawdown.'
  );
  lines.push('');

  const policyRow = (label: string, measure: Record<string, WindowMeasure | undefined> | undefined) => {
    const values = windows.map((window) => measure?.[window]);
    const total = values.reduce((sum, value) => sum + (value?.net ?? NaN), 0);
    const worst = Math.max(...values.map((value) => value?.minuteDrawdown ?? NaN));

    return [label, ...values.map((value) => dollars(value?.net)), dollars(total), dollars(worst)];
  };
  const rows: (string | number)[][] = [];

  for (const family of familyList) {
    const measures = verdicts.perFamily[family.key];

    rows.push(policyRow(`${family.number} profit #1`, measures.profit1));
    rows.push(policyRow(`${family.number} balanced #1`, measures.balanced1));
    rows.push(policyRow(`${family.number} low-DD #1`, measures.lowDD1));
    rows.push(policyRow(`${family.number} median of 10`, measures.median10));
    rows.push(policyRow(`${family.number} default (own Y)`, measures.defaultOwn));
  }

  rows.push(policyRow('allIn.ts', verdicts.allIn));
  lines.push(table(['Policy', ...windows, 'Total 2020–2023', 'Worst window minute DD'], rows));

  await write('WALK_FORWARD.md', lines.join('\n'));
};

// ---------------------------------------------------------------------------------------------------------
// Holdout

const writeHoldout = async (loaded: Loaded) => {
  const lines: string[] = ['# Frozen holdout: 2024-01-02 → 2025-10-13', ''];

  if (!loaded.holdout) {
    lines.push('_Not run yet._');
    await write('HOLDOUT.md', lines.join('\n'));

    return;
  }

  const attempts = loaded.holdoutAttempts ?? [];

  lines.push(
    `Evaluated **once** (attempt ${loaded.holdout.attempt}; ${attempts.length} attempt record(s)) on the freeze \`${loaded.holdout.freezeHash}\` (frozen ${loaded.freeze?.frozenAt}). No pick, rule or threshold was changed afterwards. Data through ${loaded.holdout.dataLastDate}, the last date in the file. This interval is chronologically withheld, not pristine: earlier research in this repository inspected prominent 2025 trades.`
  );
  lines.push('');
  lines.push(
    `Full-file parity of the four unmodified files at their defaults was repeated first: ${loaded.holdout.parity.filter((item: { ok: boolean }) => item.ok).length}/${loaded.holdout.parity.length} passed (max profit difference ${Math.max(...loaded.holdout.parity.map((item: { maxProfitDifference: number }) => item.maxProfitDifference))}).`
  );
  lines.push('');
  lines.push(await note('HOLDOUT.md'));

  const allIn = loaded.holdout.allIn as Record<string, Metrics>;
  const allInPart = segment(allIn['continuous-stop-0.11'], 'holdout');

  lines.push(
    `allIn.ts (immediate entry, same dates and conventions): holdout net ${dollars(allInPart?.net)}, minute DD ${dollars(allInPart?.minuteDrawdown)}, daily DD ${dollars(allInPart?.dailyDrawdown)}, ${allInPart?.entries ?? '—'} trades; flat start ${dollars(segment(allIn['flat-stop-0.11'], 'holdout')?.net)}; next-open ${dollars(segment(allIn['continuous-next-open-0.11'], 'holdout')?.net)}; April 2025 ${dollars(segment(allIn['continuous-stop-0.11'], '2025-04')?.net)}.`
  );
  lines.push('');

  for (const family of familyList) {
    const runs: Runs = loaded.holdout.families[family.key];
    const primary = runs['continuous-stop-0.11']!;

    lines.push(`## Family ${family.number}: ${family.name}`);
    lines.push('');
    lines.push(
      table(
        [
          'Contender',
          'Category',
          'Parameters',
          'Net',
          'Minute DD',
          'Daily DD',
          'Interest',
          'Trades',
          'W / L',
          'Best-trade share',
          'April 2025',
          'Flat start',
          'next-open',
          '8% rate',
          '14% rate'
        ],
        primary.map((item) => {
          const part = segment(item.metrics, 'holdout')!;

          return [
            `${item.label} \`${item.id}\``,
            item.category ?? '—',
            describeParams(family, item.params),
            dollars(part.net),
            dollars(part.minuteDrawdown),
            dollars(part.dailyDrawdown),
            dollars(part.interest),
            part.entries,
            `${part.wins} / ${part.losses}`,
            share(item.metrics),
            dollars(segment(item.metrics, '2025-04')?.net),
            dollars(segment(runFor(runs, 'flat-stop-0.11', item.id, item.label)?.metrics, 'holdout')?.net),
            dollars(segment(runFor(runs, 'continuous-next-open-0.11', item.id, item.label)?.metrics, 'holdout')?.net),
            dollars(segment(runFor(runs, 'continuous-stop-0.08', item.id, item.label)?.metrics, 'holdout')?.net),
            dollars(segment(runFor(runs, 'continuous-stop-0.14', item.id, item.label)?.metrics, 'holdout')?.net)
          ];
        })
      )
    );
    lines.push('');

    const picks = primary.filter(isPick);
    const values = picks.map((item) => segment(item.metrics, 'holdout')!.net);
    const own = primary.find((item) => item.label.startsWith('default (file Y'));
    const ownNet = segment(own?.metrics, 'holdout')?.net ?? NaN;

    lines.push(
      '"Trades" counts entries in the holdout; "W / L" counts exits in it, including a position carried in from 2023.'
    );
    lines.push('');
    lines.push(
      `Picks: median ${dollars(median(values))}, mean ${dollars(values.reduce((a, b) => a + b, 0) / values.length)}, ${values.filter((value) => value > 0).length}/${values.length} positive, ${values.filter((value) => value > ownNet).length}/${values.length} above the own default (${dollars(ownNet)}), ${values.filter((value) => value > (allInPart?.net ?? Infinity)).length}/${values.length} above allIn.ts (${dollars(allInPart?.net)}).`
    );
    lines.push('');
  }

  await write('HOLDOUT.md', lines.join('\n'));
};

// ---------------------------------------------------------------------------------------------------------
// Robustness

const writeRobustness = async (loaded: Loaded) => {
  const lines: string[] = ['# Robustness of the 40 frozen picks and the baselines', ''];

  lines.push(
    'Development = 2016-09-20 → 2023-12-29 (in-sample for the final picks). Holdout = 2024-01-02 → 2025-10-13 (continuous run). Each sensitivity applies one setting to every contender alike; no candidate gets its own fill mode or rate.'
  );
  lines.push('');
  lines.push(await note('ROBUSTNESS.md'));

  for (const family of familyList) {
    const development = developmentRuns(loaded, family);
    const holdout = holdoutRuns(loaded, family);
    const picks: Pick[] = loaded.selections.final?.[family.key]?.picks ?? [];

    if (!development) {
      continue;
    }

    const contenders = development['stop-0.11']!;

    lines.push(`## Family ${family.number}: ${family.name}`);
    lines.push('');
    lines.push('### Stop fill and margin-rate sensitivity (net after interest)');
    lines.push('');
    lines.push(
      table(
        [
          'Contender',
          'Dev stop 11%',
          'Dev next-open 11%',
          'Dev 8%',
          'Dev 14%',
          'Holdout stop 11%',
          'Holdout next-open',
          'Holdout 8%',
          'Holdout 14%',
          'Holdout flat next-open'
        ],
        contenders.map((item) => {
          const dev = (key: string) => runFor(development, key, item.id, item.label)?.metrics?.net;
          const hold = (key: string) => segment(runFor(holdout, key, item.id, item.label)?.metrics, 'holdout')?.net;

          return [
            `${item.label} \`${item.id}\``,
            dollars(dev('stop-0.11')),
            dollars(dev('next-open-0.11')),
            dollars(dev('stop-0.08')),
            dollars(dev('stop-0.14')),
            dollars(hold('continuous-stop-0.11')),
            dollars(hold('continuous-next-open-0.11')),
            dollars(hold('continuous-stop-0.08')),
            dollars(hold('continuous-stop-0.14')),
            dollars(hold('flat-next-open-0.11'))
          ];
        })
      )
    );
    lines.push('');
    lines.push('### Per-year net (continuous run; 2016 starts 2016-09-20; 2024–2025 are holdout) and trade counts');
    lines.push('');

    const years = ['2016', '2017', '2018', '2019', '2020', '2021', '2022', '2023', '2024', '2025', '2025-04'];

    lines.push(
      table(
        ['Contender', ...years.map((year) => (year === '2025-04' ? 'Apr 2025' : year))],
        contenders.map((item) => {
          const full = runFor(holdout, 'continuous-stop-0.11', item.id, item.label)?.metrics ?? item.metrics;

          return [
            `${item.label} \`${item.id}\``,
            ...years.map((year) => {
              const part = segment(full, year);

              return part ? `${dollars(part.net)} (${part.entries})` : '—';
            })
          ];
        })
      )
    );
    lines.push('');
    lines.push('### Trade profile and concentration (development)');
    lines.push('');
    lines.push(
      table(
        [
          'Contender',
          'Trades',
          'W / L',
          'Win rate',
          'Max losing streak',
          'Avg hold (d)',
          'Max hold (d)',
          'Time in market',
          'Worst trade',
          'Best trade',
          'Best-trade share',
          'Net without best trade',
          'Exit reasons'
        ],
        contenders.map((item) => {
          const metrics = item.metrics;

          return [
            `${item.label} \`${item.id}\``,
            metrics.entries,
            `${metrics.wins} / ${metrics.losses}`,
            pct(metrics.wins / Math.max(1, metrics.wins + metrics.losses), 0),
            metrics.maximumLosingStreak,
            days(metrics.averageHoldDays),
            days(metrics.maximumHoldDays),
            pct(metrics.exposure),
            dollars(metrics.worstTrade),
            dollars(metrics.bestTrade),
            share(metrics),
            dollars(metrics.netWithoutBestTrade),
            Object.entries(metrics.exitReasons)
              .map(([reason, count]) => `${reason} ${count}`)
              .join(', ')
          ];
        })
      )
    );
    lines.push('');
    lines.push('### Parameter neighbourhoods (development; one parameter at a time)');
    lines.push('');
    lines.push(
      table(
        [
          'Pick',
          'Class',
          'Probes',
          'Feasible',
          'Clones',
          'Centre net',
          'Q25 / median / min net',
          'Centre minute DD',
          'Median / Q75 / max DD',
          'Worst ±1-step net',
          'Notes'
        ],
        picks.map((pick) => [
          `${pick.rank} \`${pick.id}\``,
          pick.robustness.classification,
          pick.robustness.probes,
          pct(pick.robustness.feasibleShare, 0),
          pct(pick.robustness.cloneShare, 0),
          dollars(pick.robustness.centreNet),
          `${dollars(pick.robustness.robustNet)} / ${dollars(pick.robustness.medianNet)} / ${dollars(pick.robustness.minimumNet)}`,
          dollars(pick.robustness.centreDrawdown),
          `${dollars(pick.robustness.medianDrawdown)} / ${dollars(pick.robustness.robustDrawdown)} / ${dollars(pick.robustness.maximumDrawdown)}`,
          dollars(pick.robustness.worstOneStepNet),
          pick.robustness.notes.join('; ') || '—'
        ])
      )
    );
    lines.push('');
  }

  const allInDev = loaded.development?.allIn as Record<string, Metrics> | undefined;
  const allInHoldout = loaded.holdout?.allIn as Record<string, Metrics> | undefined;

  if (allInDev) {
    lines.push('## allIn.ts comparator');
    lines.push('');
    lines.push(
      table(
        ['Setting', 'Development net', 'Development minute DD', 'Holdout net', 'Holdout minute DD'],
        ['stop-0.11', 'next-open-0.11', 'stop-0.08', 'stop-0.14'].map((key) => {
          const holdoutPart = segment(allInHoldout?.[`continuous-${key}`], 'holdout');

          return [
            key,
            dollars(allInDev[key]?.net),
            dollars(allInDev[key]?.minuteDrawdown),
            dollars(holdoutPart?.net),
            dollars(holdoutPart?.minuteDrawdown)
          ];
        })
      )
    );
  }

  await write('ROBUSTNESS.md', lines.join('\n'));
};

// ---------------------------------------------------------------------------------------------------------
// Parity audit tables

const writeParity = async (loaded: Loaded) => {
  const parity = loaded.parity;
  const lines: string[] = ['# Parity audit', ''];

  lines.push(await note('PARITY_AUDIT.md'));

  if (parity) {
    lines.push(`## Results (\`results/parity/parity.json\`, generated ${parity.generatedAt})`);
    lines.push('');
    lines.push(
      `**${parity.passed ? 'PASSED' : 'FAILED'}**: ${parity.cases - parity.failures}/${parity.cases} engine cases, ${parity.copyChecks.filter((check: { mismatches: string[] }) => check.mismatches.length === 0).length}/${parity.copyChecks.length} copy = original checks.`
    );
    lines.push('');

    const sections = new Map<string, any[]>();

    for (const outcome of parity.outcomes) {
      sections.set(outcome.section, [...(sections.get(outcome.section) ?? []), outcome]);
    }

    lines.push(
      table(
        [
          'Section',
          'Cases',
          'Passed',
          'Trades compared',
          'Max |profit/interest/net/DD difference|',
          'Max |daily mark difference|'
        ],
        [...sections.entries()].map(([section, outcomes]) => [
          section,
          outcomes.length,
          outcomes.filter((outcome) => outcome.ok).length,
          outcomes.reduce((total, outcome) => total + outcome.trades, 0),
          Math.max(...outcomes.map((outcome) => outcome.maxProfitDifference)),
          Math.max(...outcomes.map((outcome) => outcome.maxMarkDifference))
        ])
      )
    );
    lines.push('');
    lines.push('### A–C: the unmodified files');
    lines.push('');
    lines.push(
      table(
        [
          'Case',
          'Trades',
          'Source net',
          'Engine net',
          'Source minute DD',
          'Engine minute DD',
          'Source daily DD',
          'Engine daily DD',
          'Result'
        ],
        parity.outcomes
          .filter((outcome: { section: string }) => !outcome.section.startsWith('E'))
          .map((outcome: any) => [
            outcome.name,
            outcome.trades,
            dollars(outcome.sourceNet),
            dollars(outcome.engineNet),
            dollars(outcome.sourceMinuteDrawdown),
            dollars(outcome.engineMinuteDrawdown),
            dollars(outcome.sourceDailyDrawdown),
            dollars(outcome.engineDailyDrawdown),
            outcome.ok ? 'exact' : 'FAIL'
          ])
      )
    );
    lines.push('');
    lines.push('### D: generated copies equal the originals byte for byte');
    lines.push('');
    lines.push(
      table(
        ['File', 'Stop fill', 'Result'],
        parity.copyChecks.map((check: any) => [
          check.key,
          check.stopFill,
          check.mismatches.length === 0 ? 'identical' : check.mismatches.join('; ')
        ])
      )
    );
    lines.push('');
    lines.push('### F: allIn.ts accounting through the shared replay');
    lines.push('');
    lines.push(
      table(
        ['Case', 'Trades', 'Net', 'Minute DD', 'Daily DD'],
        parity.allInChecks.map((check: any) => [
          check.name,
          check.trades,
          dollars(check.net),
          dollars(check.minuteDrawdown),
          dollars(check.dailyDrawdown)
        ])
      )
    );
    lines.push('');
    lines.push('### Source hashes');
    lines.push('');
    lines.push(
      table(
        ['File', 'sha256'],
        Object.entries(parity.sourceHashes).map(([key, hash]) => [key, `\`${hash}\``])
      )
    );
  }

  if (loaded.holdout) {
    lines.push('');
    lines.push('## Full-file parity at the holdout');
    lines.push('');
    lines.push(
      table(
        ['Case', 'Trades', 'Source net', 'Engine net', 'Max difference', 'Result'],
        loaded.holdout.parity.map((outcome: any) => [
          outcome.name,
          outcome.trades,
          dollars(outcome.sourceNet),
          dollars(outcome.engineNet),
          outcome.maxProfitDifference,
          outcome.ok ? 'exact' : 'FAIL'
        ])
      )
    );
  }

  await write('PARITY_AUDIT.md', lines.join('\n'));
};

// ---------------------------------------------------------------------------------------------------------
// Summary tables and machine-readable shortlist

const writeShortlist = async (loaded: Loaded) => {
  const header = [
    'family',
    'rank',
    'id',
    'category',
    'clone_group_size',
    ...allParamKeys,
    'dev_net',
    'dev_minute_dd',
    'dev_daily_dd',
    'dev_interest',
    'dev_trades',
    'dev_wins',
    'dev_losses',
    'dev_avg_hold_days',
    'dev_max_hold_days',
    'dev_time_in_market',
    'dev_worst_trade',
    'dev_best_trade_share',
    'dev_next_open_net',
    'dev_net_8pct',
    'dev_net_14pct',
    'robust_class',
    'robust_net_q25',
    'robust_dd_q75',
    'worst_one_step_net',
    'holdout_net',
    'holdout_minute_dd',
    'holdout_daily_dd',
    'holdout_interest',
    'holdout_trades',
    'holdout_flat_net',
    'holdout_next_open_net',
    'holdout_net_8pct',
    'holdout_net_14pct',
    'april_2025_net',
    'combined_net',
    'combined_minute_dd',
    'signature'
  ];
  const rows: unknown[][] = [];
  const json: unknown[] = [];

  for (const family of familyList) {
    const picks: Pick[] = loaded.selections.final?.[family.key]?.picks ?? [];
    const development = developmentRuns(loaded, family);
    const holdout = holdoutRuns(loaded, family);

    for (const pick of picks) {
      const dev = runFor(development, 'stop-0.11', pick.id)?.metrics;
      const hold = runFor(holdout, 'continuous-stop-0.11', pick.id)?.metrics;
      const holdPart = segment(hold, 'holdout');
      const value = (runs: Runs | undefined, key: string, label?: string) =>
        label ? segment(runFor(runs, key, pick.id)?.metrics, label)?.net : runFor(runs, key, pick.id)?.metrics.net;

      rows.push([
        family.key,
        pick.rank,
        pick.id,
        pick.category,
        pick.cloneGroupSize,
        ...allParamKeys.map((key) => (family.paramKeys.includes(key) ? formatValue(key, pick.params[key]) : 'N/A')),
        dev?.net,
        dev?.minuteDrawdown,
        dev?.dailyDrawdown,
        dev?.interest,
        dev?.entries,
        dev?.wins,
        dev?.losses,
        dev?.averageHoldDays,
        dev?.maximumHoldDays,
        dev?.exposure,
        dev?.worstTrade,
        dev?.bestTradeShare,
        value(development, 'next-open-0.11'),
        value(development, 'stop-0.08'),
        value(development, 'stop-0.14'),
        pick.robustness.classification,
        pick.robustness.robustNet,
        pick.robustness.robustDrawdown,
        pick.robustness.worstOneStepNet,
        holdPart?.net,
        holdPart?.minuteDrawdown,
        holdPart?.dailyDrawdown,
        holdPart?.interest,
        holdPart?.entries,
        value(holdout, 'flat-stop-0.11', 'holdout'),
        value(holdout, 'continuous-next-open-0.11', 'holdout'),
        value(holdout, 'continuous-stop-0.08', 'holdout'),
        value(holdout, 'continuous-stop-0.14', 'holdout'),
        segment(hold, '2025-04')?.net,
        segment(hold, 'combined')?.net,
        segment(hold, 'combined')?.minuteDrawdown,
        pick.signature
      ]);
      json.push({ family: family.key, pick, development: dev, holdout: hold });
    }
  }

  await fs.outputFile(path.join(resultsRoot, 'shortlist.csv'), toCsv(header, rows));
  await writeJson(path.join(resultsRoot, 'shortlist.json'), json);
};

const writeSummary = async (loaded: Loaded) => {
  const verdicts = computeVerdicts(loaded);
  const lines: string[] = ['# Optimization summary: four intraday trailing-buy strategies on VGT minute data', ''];

  await writeJson(path.join(resultsRoot, 'verdicts.json'), verdicts);
  lines.push(await note('OPTIMIZATION_SUMMARY.md'));
  lines.push('## Search budget actually run');
  lines.push('');
  lines.push(
    table(
      [
        'Fit',
        'Family',
        'Dims',
        'Attempted',
        'Unique simulated',
        'Duplicates',
        'Feasible',
        'Phenotypes (feasible, net > 0)',
        'Pool',
        'Probe evaluations',
        'Picks',
        'Runtime (s)',
        'Workers'
      ],
      protocol.fits.flatMap((fit) =>
        familyList.map((family) => {
          const stage = loaded.stages[fit.key]?.[family.key];
          const selection = loaded.selections[fit.key]?.[family.key];

          return [
            fit.key,
            family.number,
            family.paramKeys.length,
            stage?.stats.attempted ?? '—',
            stage?.stats.unique ?? '—',
            stage?.stats.duplicates ?? '—',
            stage?.feasible ?? '—',
            selection?.eligiblePhenotypes ?? '—',
            selection?.pool.length ?? '—',
            selection ? `${selection.probeEvaluations.unique} new` : '—',
            selection?.picks.length ?? '—',
            stage ? (stage.stats.runtimeMs / 1000).toFixed(1) : '—',
            stage?.stats.workers ?? '—'
          ];
        })
      )
    )
  );
  lines.push('');

  if (Object.keys(loaded.controls).length > 0) {
    lines.push('## Random-sampling control (final development fit, equal unique-evaluation budget)');
    lines.push('');
    lines.push(
      table(
        [
          'Family',
          'Unique (Sobol+NSGA-II / random)',
          'Hypervolume Sobol+NSGA-II',
          'Hypervolume random',
          'Ratio',
          'Best net Sobol+NSGA-II',
          'Best net random',
          'Front size (S+N / random)',
          'Front points dominated by the other'
        ],
        familyList.map((family) => {
          const control = loaded.controls[family.key];

          return control
            ? [
                family.number,
                `${control.sobolNsga.unique} / ${control.random.unique}`,
                control.sobolNsga.hypervolume.toExponential(4),
                control.random.hypervolume.toExponential(4),
                (control.sobolNsga.hypervolume / control.random.hypervolume).toFixed(3),
                dollars(control.sobolNsga.bestNet),
                dollars(control.random.bestNet),
                `${control.sobolNsga.frontSize} / ${control.random.frontSize}`,
                `${control.sobolNsga.frontDominatedByOther} / ${control.random.frontDominatedByOther}`
              ]
            : [family.number, '—', '—', '—', '—', '—', '—', '—', '—'];
        })
      )
    );
    lines.push('');
  }

  lines.push('## Cross-family comparison (same dates, same conventions)');
  lines.push('');
  lines.push(
    'Development = in-sample for the final picks; walk-forward = fold picks on their own validation windows (true out-of-sample); holdout = frozen picks, evaluated once. `stop` fills, 11%.'
  );
  lines.push('');

  const rows: (string | number)[][] = [];

  for (const family of familyList) {
    const development = developmentRuns(loaded, family);
    const holdout = holdoutRuns(loaded, family);
    const picks: Pick[] = loaded.selections.final?.[family.key]?.picks ?? [];
    const measures = verdicts.perFamily[family.key];
    const row = (
      label: string,
      id: string | undefined,
      contenderLabel: string | undefined,
      wf: Record<string, WindowMeasure | undefined>
    ) => {
      const dev = id ? runFor(development, 'stop-0.11', id, contenderLabel)?.metrics : undefined;
      const hold = id
        ? segment(runFor(holdout, 'continuous-stop-0.11', id, contenderLabel)?.metrics, 'holdout')
        : undefined;
      const wfTotal = ['2020–2021', '2022', '2023'].reduce((total, window) => total + (wf[window]?.net ?? NaN), 0);
      const wfWorst = Math.max(...['2020–2021', '2022', '2023'].map((window) => wf[window]?.minuteDrawdown ?? NaN));

      return [
        `${family.number}`,
        label,
        dev ? describeParams(family, runFor(development, 'stop-0.11', id!, contenderLabel)!.params) : '—',
        dollars(dev?.net),
        dollars(dev?.minuteDrawdown),
        dev?.entries ?? '—',
        dollars(wfTotal),
        dollars(wfWorst),
        dollars(hold?.net),
        dollars(hold?.minuteDrawdown),
        hold?.entries ?? '—'
      ];
    };
    const own = development?.['stop-0.11']?.find((item) => item.label.startsWith('default (file Y'));
    const firstOf = (category: string) => picks.find((pick) => pick.category === category);

    rows.push(row(`default (file Y ${family.fileY / 10}%)`, own?.id, own?.label, measures.defaultOwn!));
    rows.push(row(`highest net (profit #1)`, firstOf('profit')?.id, undefined, measures.profit1!));
    rows.push(row(`balanced #1`, firstOf('balanced')?.id, undefined, measures.balanced1!));
    rows.push(row(`lowest DD (low-DD #1)`, firstOf('low-DD')?.id, undefined, measures.lowDD1!));
  }

  const allInDev = loaded.development?.allIn?.['stop-0.11'] as Metrics | undefined;
  const allInHold = segment(loaded.holdout?.allIn?.['continuous-stop-0.11'], 'holdout');
  const allInWf = ['2020–2021', '2022', '2023'].map((window) => verdicts.allIn[window]);

  rows.push([
    '—',
    'allIn.ts (immediate entry)',
    '10% / 8% / 15 d / 90 / 1% / 2% / 38%',
    dollars(allInDev?.net),
    dollars(allInDev?.minuteDrawdown),
    allInDev?.entries ?? '—',
    dollars(allInWf.reduce((total, value) => total + (value?.net ?? NaN), 0)),
    dollars(Math.max(...allInWf.map((value) => value?.minuteDrawdown ?? NaN))),
    dollars(allInHold?.net),
    dollars(allInHold?.minuteDrawdown),
    allInHold?.entries ?? '—'
  ]);
  lines.push(
    table(
      [
        'Family',
        'Contender',
        'Parameters (final fit)',
        'Dev net',
        'Dev minute DD',
        'Dev trades',
        'Walk-forward 2020–2023 net (fold picks of this category)',
        'Worst WF window minute DD',
        'Holdout net',
        'Holdout minute DD',
        'Holdout trades'
      ],
      rows
    )
  );
  lines.push('');
  lines.push(
    "The walk-forward column is the stitched policy for that category (each window's pick made on the preceding training data); it is a different parameter vector in each window, never the final-fit vector shown in the same row."
  );
  lines.push('');
  lines.push('## The 10 frozen phenotypes per family (compact; every column is in the TOP10 files)');
  lines.push('');
  lines.push(
    'Dev = final development fit, 2016-09-20 → 2023-12-29, **in-sample**. Holdout = 2024-01-02 → 2025-10-13, evaluated once. Class = parameter-neighbourhood robustness on development data. N/A = the family has no such parameter.'
  );
  lines.push('');

  for (const family of familyList) {
    const development = developmentRuns(loaded, family);
    const holdout = holdoutRuns(loaded, family);
    const picks: Pick[] = loaded.selections.final?.[family.key]?.picks ?? [];
    const baselines = (development?.['stop-0.11'] ?? []).filter((item) => !isPick(item));
    const entries = [
      ...picks.map((pick) => ({
        rank: String(pick.rank),
        id: pick.id,
        category: pick.category,
        params: pick.params,
        label: undefined as string | undefined,
        klass: pick.robustness.classification
      })),
      ...baselines.map((item) => ({
        rank: 'base',
        id: item.id,
        category: item.label,
        params: item.params,
        label: item.label as string | undefined,
        klass: '—'
      }))
    ];

    lines.push(`### Family ${family.number}: ${family.name}`);
    lines.push('');
    lines.push(
      table(
        [
          'Rank',
          'ID',
          'Category',
          ...paramHeader,
          'Dev net',
          'Dev minute DD',
          'Dev trades',
          'Holdout net',
          'Holdout minute DD',
          'Holdout trades',
          'Class'
        ],
        entries.map((entry) => {
          const dev = runFor(development, 'stop-0.11', entry.id, entry.label)?.metrics;
          const hold = segment(runFor(holdout, 'continuous-stop-0.11', entry.id, entry.label)?.metrics, 'holdout');

          return [
            entry.rank,
            `\`${entry.id}\``,
            entry.category,
            ...paramCells(family, entry.params),
            dollars(dev?.net),
            dollars(dev?.minuteDrawdown),
            dev?.entries ?? '—',
            dollars(hold?.net),
            dollars(hold?.minuteDrawdown),
            hold?.entries ?? '—',
            entry.klass
          ];
        })
      )
    );
    lines.push('');
  }

  lines.push('## Pre-declared verdicts (PROTOCOL.md §9)');
  lines.push('');
  lines.push(
    table(
      [
        'Comparison',
        'Measure',
        'Windows won (of 4)',
        'Total OOS net (A vs B)',
        'Worst OOS minute DD (A vs B)',
        'Credited?'
      ],
      verdicts.optimized.flatMap((item) =>
        (['median10', 'balanced1'] as const).map((measure) => [
          item.label,
          measure === 'median10' ? 'median of 10 picks' : 'balanced #1',
          `${item[measure].wins}/${item[measure].windows}`,
          `${dollars(item[measure].totalA)} vs ${dollars(item[measure].totalB)}`,
          `${dollars(item[measure].worstA)} vs ${dollars(item[measure].worstB)}`,
          item[measure].credited ? 'yes' : 'no'
        ])
      )
    )
  );
  lines.push('');
  lines.push(
    `A modification is credited only if both measures are credited: ${verdicts.optimized.map((item) => `${item.label}: **${item.credited ? 'credited' : 'not credited'}**`).join('; ')}.`
  );
  lines.push('');
  lines.push('### Matched-Y defaults (no optimization): modification effect alone');
  lines.push('');
  lines.push(
    table(
      [
        'Comparison',
        'Y',
        'Windows won (of 4)',
        'Total OOS net (A vs B)',
        'Worst OOS minute DD (A vs B)',
        'Would be credited?'
      ],
      verdicts.matchedDefaults.map((item) => [
        item.label,
        item.measure === 'defaultY30' ? '3%' : '4%',
        `${item.wins}/${item.windows}`,
        `${dollars(item.totalA)} vs ${dollars(item.totalB)}`,
        `${dollars(item.worstA)} vs ${dollars(item.worstB)}`,
        item.credited ? 'yes' : 'no'
      ])
    )
  );
  lines.push('');
  lines.push('### Optimized picks against their own defaults and against allIn.ts (4 out-of-sample windows)');
  lines.push('');
  lines.push(
    table(
      [
        'Family',
        'Median of 10 vs own default',
        'Balanced #1 vs own default',
        'Median of 10 vs allIn.ts',
        'Balanced #1 vs allIn.ts',
        'Own default vs allIn.ts'
      ],
      familyList.map((family) => {
        const own = verdicts.versusOwnDefault.find((item) => item.family === family.key)!;
        const allIn = verdicts.versusAllIn.find((item) => item.family === family.key)!;
        const cell = (value: ReturnType<typeof compare>) =>
          `${value.wins}/${value.windows} won; ${dollars(value.totalA)} vs ${dollars(value.totalB)}${value.credited ? ' (passes)' : ''}`;

        return [
          family.number,
          cell(own.median10),
          cell(own.balanced1),
          cell(allIn.median10),
          cell(allIn.balanced1),
          cell(allIn.defaultOwn)
        ];
      })
    )
  );
  lines.push('');
  lines.push(
    'Per-family detail: [TOP10_TRAILING_BUY.md](TOP10_TRAILING_BUY.md), [TOP10_BUFFERED_LOSS.md](TOP10_BUFFERED_LOSS.md), [TOP10_NO_REENTRY.md](TOP10_NO_REENTRY.md), [TOP10_BUFFERED_LOSS_NO_REENTRY.md](TOP10_BUFFERED_LOSS_NO_REENTRY.md). Out-of-sample: [WALK_FORWARD.md](WALK_FORWARD.md), [HOLDOUT.md](HOLDOUT.md). Sensitivities: [ROBUSTNESS.md](ROBUSTNESS.md).'
  );

  await write('OPTIMIZATION_SUMMARY.md', lines.join('\n'));
};

export const writeReports = async (log: (message: string) => void) => {
  const loaded = await load();

  for (const family of familyList) {
    await writeTop10(loaded, family);
  }

  await writeWalkForward(loaded);
  await writeHoldout(loaded);
  await writeRobustness(loaded);
  await writeParity(loaded);
  await writeShortlist(loaded);
  await writeSummary(loaded);
  log('Reports written');
};
