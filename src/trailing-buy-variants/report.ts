// The reports (research/trailing-buy-variants/*.md) and the machine-readable shortlist, generated from the
// result files. Tables and the pre-declared verdict computations only; the narrative README and the
// completion audit are written by hand.
import path from 'node:path';
import fs from 'fs-extra';
import { attribute, type Attribution, type AttributionTrade } from './attribution.ts';
import { fitsRoot, freezeFile, protocol, readJson, resultsRoot, stageDir } from './context.ts';
import type { Metrics } from './evaluate.ts';
import {
  type Family,
  type IntParams,
  type ParamKey,
  allParamKeys,
  families,
  formatValue,
  mechanismNames,
  specs
} from './families.ts';
import { variantSourceFiles } from './copies.ts';
import type { Pick } from './selection.ts';
import { loadCombinations, toCsv } from './study.ts';

type Log = (message: string) => void;

interface ContenderResult {
  label: string;
  id: string;
  params: IntParams;
  category?: string;
  metrics: Metrics;
}

interface Validation {
  fit: string;
  validation: { start: string; end: string };
  families: Record<string, Record<string, ContenderResult[]>>;
  allIn: Record<string, Metrics>;
}

interface Holdout {
  attempt: number;
  freezeHash: string;
  dataLastDate: string;
  windowStartDate: string;
  families: Record<string, Record<string, ContenderResult[]>>;
  allIn: Record<string, Metrics>;
}

interface Selection {
  fit: string;
  family: string;
  candidates: number;
  feasible: number;
  feasiblePositive: number;
  phenotypes: number;
  eligiblePhenotypes: number;
  aboveCeiling: { phenotypes: number; bestNet: number };
  poolScanned: number;
  probeEvaluations: { attempted: number; unique: number };
  pool: { id: string; metrics: Metrics; robustness: Pick['robustness']; params: IntParams }[];
  picks: Pick[];
}

interface Stage {
  fit: string;
  family: string;
  dimensions: number;
  domains: { key: string; min: number; max: number; step: number; points: number }[];
  minEntries: number;
  feasible: number;
  aboveCeiling: number;
  bestNetAboveCeiling: number;
  stats: {
    attempted: number;
    unique: number;
    duplicates: number;
    runtimeMs: number;
    workers: number;
    sobolUnique: number;
    nsga: { seed: number; newEvaluations: number }[];
  };
}

const money = (value: number | undefined) =>
  value === undefined || Number.isNaN(value)
    ? '—'
    : `${value < 0 ? '−' : ''}$${Math.round(Math.abs(value)).toLocaleString('en-US')}`;
const pct = (value: number) => `${(value * 100).toFixed(1)}%`;
const num = (value: number, digits = 1) => value.toFixed(digits);
const table = (header: string[], rows: unknown[][]) =>
  `| ${header.join(' | ')} |\n| ${header.map(() => '---').join(' | ')} |\n${rows.map((row) => `| ${row.map((cell) => String(cell)).join(' | ')} |`).join('\n')}\n`;
const median = (values: number[]) => {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);

  return sorted.length === 0 ? NaN : sorted.length % 2 ? sorted[middle]! : (sorted[middle - 1]! + sorted[middle]!) / 2;
};
const segmentOf = (metrics: Metrics, label: string) => metrics.segments.find((segment) => segment.label === label);
const exists = (file: string) => fs.pathExists(file);

const sourcePath = (family: Family) => {
  if (family.mechanisms.length === 0) {
    return {
      trailingBuy: 'src/app/allIn-trailingBuy.ts',
      bufferedLoss: 'src/app/allIn-trailingBuy-bufferedLoss.ts',
      noReentry: 'src/app/allIn-trailingBuy-noReentry.ts',
      bufferedLossNoReentry: 'src/app/allIn-trailingBuy-bufferedLoss-noReentry.ts'
    }[family.base];
  }

  if (family.mechanisms.length === 1 && family.base === 'bufferedLossNoReentry') {
    return variantSourceFiles[family.mechanisms[0]!];
  }

  return `(no dedicated file: ${family.base === 'noReentry' ? 'the unbuffered base has no mechanism file; use the buffered file with buffer 0.0% as the nearest runnable form, which is not identical' : 'combination'})`;
};

// How to set a phenotype in its source file: option defaults for X, Y and the buffer; constants for the rest.
const howToSet = (family: Family, params: IntParams) => {
  const lines: string[] = [];
  const value = (key: ParamKey) => formatValue(key, params[key]);
  const fraction = (key: ParamKey) => `${params[key]! / 1000}`;

  lines.push(`\`targetPercentChangeOption ?? ${fraction('targetPercentChange')}\` (X ${value('targetPercentChange')})`);
  lines.push(
    `\`trailingBuyPercentageOption ?? ${fraction('trailingBuyPercentage')}\` (Y ${value('trailingBuyPercentage')})`
  );
  lines.push(`\`const trailingStopPercentage = ${fraction('trailingStopPercentage')};\``);
  lines.push(`\`const maximumHoldDays = ${params.maximumHoldDays};\``);
  lines.push(`\`const tickWindowSize = ${params.tickWindowSize};\``);

  if (family.flags.restricted) {
    lines.push(`\`const materialLossThreshold = ${fraction('materialLossThreshold')};\``);
    lines.push(`\`const lowerPriceReentry = ${fraction('lowerPriceReentry')};\``);
    lines.push(`\`const retraceFraction = ${fraction('retraceFraction')};\``);
  }

  if (family.flags.buffered) {
    lines.push(
      `\`intradayLossBufferOption ?? ${fraction('intradayLossBuffer')}\` (buffer ${value('intradayLossBuffer')})`
    );
  }

  for (const key of family.paramKeys) {
    if (
      [
        'targetPercentChange',
        'trailingBuyPercentage',
        'trailingStopPercentage',
        'maximumHoldDays',
        'tickWindowSize',
        'materialLossThreshold',
        'lowerPriceReentry',
        'retraceFraction',
        'intradayLossBuffer'
      ].includes(key)
    ) {
      continue;
    }

    const spec = specs[key];
    const literal =
      spec.unit === 'tenths of a percentage point'
        ? `${params[key]! / 1000}`
        : spec.unit === 'percent'
          ? `${params[key]! / 100}`
          : `${params[key]}`;

    lines.push(`\`const ${key} = ${literal};\``);
  }

  return lines.join('; ');
};

const paramHeader = (family: Family) => family.paramKeys.map((key) => specs[key].short);
const paramCells = (family: Family, params: IntParams) => family.paramKeys.map((key) => formatValue(key, params[key]));

const readTrades = async (file: string): Promise<AttributionTrade[]> => {
  if (!(await exists(file))) {
    return [];
  }

  const lines = (await fs.readFile(file, 'utf8')).trim().split('\n');
  const header = lines[0]!.split(',');
  const column = (name: string) => header.indexOf(name);

  return lines.slice(1).map((line) => {
    const cells = line.split(',');

    return {
      entryDate: cells[column('entry_date')]!,
      exitDate: cells[column('exit_date')]!,
      entryIndex: 0,
      exitIndex: cells[column('exit_date')] ? 0 : -1,
      profit: Number(cells[column('profit')]),
      interest: Number(cells[column('interest')]),
      holdDays: Number(cells[column('hold_days')]),
      legs: column('legs') >= 0 ? Number(cells[column('legs')]) : 1
    };
  });
};

// Session indices from dates, for the overlap matching (the equity file lists every session date).
const indexTrades = (trades: AttributionTrade[], dates: Map<string, number>, endIndex: number) =>
  trades.map((trade) => ({
    ...trade,
    entryIndex: dates.get(trade.entryDate) ?? 0,
    exitIndex: trade.exitDate ? (dates.get(trade.exitDate) ?? endIndex) : -1
  }));

export const writeReports = async (log: Log) => {
  await loadCombinations();

  const familyKeys = Object.keys(families);
  const fits = protocol.fits.map((fit) => fit.key);
  const stages = new Map<string, Stage>();
  const selections = new Map<string, Selection>();

  for (const fit of fits) {
    for (const key of familyKeys) {
      const dir = stageDir(fit, key);

      if (await exists(path.join(dir, 'stage.json'))) {
        stages.set(`${fit}/${key}`, await readJson<Stage>(path.join(dir, 'stage.json')));
      }

      if (await exists(path.join(dir, 'selection.json'))) {
        selections.set(`${fit}/${key}`, await readJson<Selection>(path.join(dir, 'selection.json')));
      }
    }
  }

  const validations = new Map<string, Validation>();

  for (const fit of fits.filter((fit) => fit !== 'final')) {
    const file = path.join(fitsRoot, fit, 'validation.json');

    if (await exists(file)) {
      validations.set(fit, await readJson<Validation>(file));
    }
  }

  const holdout = (await exists(path.join(resultsRoot, 'holdout', 'holdout.json')))
    ? await readJson<Holdout>(path.join(resultsRoot, 'holdout', 'holdout.json'))
    : undefined;
  const freeze = (await exists(freezeFile))
    ? await readJson<{ freezeHash: string; frozenAt: string; picks: Record<string, Pick[]> }>(freezeFile)
    : undefined;
  const sweeps = (await exists(path.join(resultsRoot, 'sweeps.json')))
    ? await readJson<Record<string, any>>(path.join(resultsRoot, 'sweeps.json'))
    : {};
  const development = (await exists(path.join(fitsRoot, 'final', 'development.json')))
    ? await readJson<{ families: Record<string, Record<string, ContenderResult[]>>; allIn: Record<string, Metrics> }>(
        path.join(fitsRoot, 'final', 'development.json')
      )
    : undefined;
  const out = (name: string, text: string) => fs.outputFile(path.join('research/trailing-buy-variants', name), text);
  const windows = [
    { key: 'fold1', label: '2020–21' },
    { key: 'fold2', label: '2022' },
    { key: 'fold3', label: '2023' },
    { key: 'reused', label: '2024–25 (reused)' }
  ];
  const primary = 'continuous-stop';
  const reusedKey = `continuous-stop-${protocol.marginInterestRate}`;

  // ---- per family, per window: the picks' metrics (validation for folds, holdout for the reused window)
  const windowResults = (key: string, window: string): ContenderResult[] | undefined => {
    if (window === 'reused') {
      return holdout?.families[key]?.[reusedKey];
    }

    return validations.get(window)?.families[key]?.[primary];
  };
  const picksOf = (results: ContenderResult[] | undefined) =>
    (results ?? []).filter((result) => result.label.startsWith('pick '));
  const baselineOf = (results: ContenderResult[] | undefined, label: string) =>
    (results ?? []).find((result) => result.label === label);
  const categoryLeader = (results: ContenderResult[] | undefined, category: string) =>
    picksOf(results).find((result) => result.category === category);
  const allInWindow = (window: string) =>
    window === 'reused' ? holdout?.allIn[reusedKey] : validations.get(window)?.allIn[primary];

  // ---- STRATEGY_COMPARISON.md
  const comparison: string[] = [];

  comparison.push('# Strategy comparison: VGT trailing-buy variants\n');
  comparison.push(
    "Generated by `npm run trailing-buy-variants -- report` from `results/`. Every figure is a measured simulation on raw one-minute bars with the conventions of PROTOCOL.md: $100,000 per entry (less for staged first legs), 11% simple margin interest by calendar day, intraday stops filled at the stop price (idealized), no spread, commission, slippage or dividends. Drawdowns are of the strategy's cumulative mark-to-market P&L on a $100,000 allocation. The 2024-01-02 → 2025-10-13 window is **previously inspected / reused**, not independent.\n"
  );
  comparison.push('## Architectures\n');
  comparison.push(
    table(
      ['#', 'Family key', 'Base', 'Mechanism(s)', 'Free parameters', 'Runnable source'],
      familyKeys.map((key) => {
        const family = families[key]!;

        return [
          family.number,
          `\`${key}\``,
          family.baseNumber,
          family.mechanisms.map((mechanism) => mechanismNames[mechanism]).join(' + ') || '—',
          family.paramKeys.length,
          `\`${sourcePath(family)}\``
        ];
      })
    )
  );
  comparison.push('\n## Evaluation windows\n');
  comparison.push(
    table(
      ['Fit', 'Training (selection)', 'Out-of-sample window', 'Status'],
      [
        ['fold1', '2016-09-20 → 2019-12-31', '2020-01-02 → 2021-12-31', 'walk-forward, decision weight'],
        ['fold2', '2016-09-20 → 2021-12-31', '2022-01-03 → 2022-12-30', 'walk-forward, decision weight'],
        ['fold3', '2016-09-20 → 2022-12-30', '2023-01-03 → 2023-12-29', 'walk-forward, decision weight'],
        [
          'final',
          '2016-09-20 → 2023-12-29 (development, in-sample for the frozen picks)',
          `2024-01-02 → ${holdout?.dataLastDate ?? '2025-10-13'}`,
          'previously inspected / reused; evaluated once after the freeze'
        ],
        [
          'combined',
          '—',
          `2016-09-20 → ${holdout?.dataLastDate ?? '2025-10-13'}`,
          'the full-history run used for the $35,000 ceiling'
        ]
      ]
    )
  );

  // Trades2 reconciliation
  const trades2Full = holdout?.families.bufferedLossNoReentry?.[reusedKey]?.find(
    (result) => result.label === 'Trades2 phenotype'
  );
  const trades2Combined = trades2Full ? segmentOf(trades2Full.metrics, 'combined') : undefined;

  comparison.push('\n## Reference phenotype (Trades2) reconciliation\n');
  comparison.push(
    `\`trades2.txt\` reports 17 closed + 1 open trades, realized $111,329, unrealized $42,885, total $154,213, interest $29,142, daily drawdown $23,010, minute drawdown $27,408 on 2016-01-04 → 2025-10-13. Running \`src/app/allIn-trailingBuy-bufferedLoss-noReentry.ts\` at its checked-in constants reproduced every figure exactly (see REPRODUCTION in README.md). The same phenotype through the engine on the common-eligibility continuous run (2016-09-20 → ${holdout?.dataLastDate ?? '…'}): ${trades2Combined ? `net ${money(trades2Combined.net)}, minute drawdown ${money(trades2Combined.minuteDrawdown)}, daily drawdown ${money(trades2Combined.dailyDrawdown)}, ${trades2Combined.entries} entries` : 'not yet evaluated (run the reused-window evaluation)'}; the first trade is in December 2018, so the eligibility start has no effect. Trades2 is the previous program's frozen pick \`4-81aca36069\` (development $112,050 + reused window $42,164): it was selected on development data and already evaluated on 2024–2025.\n`
  );

  // ---- development summary per family
  comparison.push('\n## Development fit (2016-09-20 → 2023-12-29, in-sample for the picks)\n');
  comparison.push(
    'Each family\'s ten frozen picks against its baselines. "Above ceiling" counts feasible, positive-net phenotypes whose training minute drawdown exceeded $35,000; they were ineligible.\n'
  );
  {
    const rows: unknown[][] = [];

    for (const key of familyKeys) {
      const selection = selections.get(`final/${key}`);
      const stage = stages.get(`final/${key}`);

      if (!selection || !stage) {
        continue;
      }

      const picks = selection.picks;
      const best = [...picks].sort((a, b) => b.metrics.net - a.metrics.net)[0];
      const lowDD = [...picks].sort((a, b) => a.metrics.minuteDrawdown - b.metrics.minuteDrawdown)[0];
      const dev = development?.families[key]?.[`stop-${protocol.marginInterestRate}`];
      const trades2 = dev?.find((result) => result.label === 'Trades2 phenotype');
      const own = dev?.find((result) => result.label.startsWith('default (file'));

      rows.push([
        `\`${key}\``,
        stage.stats.unique.toLocaleString('en-US'),
        selection.phenotypes.toLocaleString('en-US'),
        `${selection.aboveCeiling.phenotypes} (best ${money(selection.aboveCeiling.bestNet)})`,
        best ? `${money(best.metrics.net)} / ${money(best.metrics.minuteDrawdown)} (${best.metrics.entries})` : '—',
        lowDD ? `${money(lowDD.metrics.net)} / ${money(lowDD.metrics.minuteDrawdown)} (${lowDD.metrics.entries})` : '—',
        trades2
          ? `${money(trades2.metrics.net)} / ${money(trades2.metrics.minuteDrawdown)} (${trades2.metrics.entries})`
          : '—',
        own ? `${money(own.metrics.net)} / ${money(own.metrics.minuteDrawdown)} (${own.metrics.entries})` : '—'
      ]);
    }

    comparison.push(
      table(
        [
          'Family',
          'Unique simulations',
          'Phenotypes',
          'Above ceiling',
          'Highest-net pick: net / minute DD (trades)',
          'Lowest-DD pick',
          'Trades2 phenotype',
          'File default'
        ],
        rows
      )
    );
    const allInDev = development?.allIn[`stop-${protocol.marginInterestRate}`];

    if (allInDev) {
      comparison.push(
        `\n\`allIn.ts\` (immediate entry, fixed constants) on the same development window: net ${money(allInDev.net)}, minute drawdown ${money(allInDev.minuteDrawdown)}, ${allInDev.entries} entries.\n`
      );
    }
  }

  // ---- walk-forward and reused window per family
  comparison.push('\n## Out-of-sample windows: stitched policies per family\n');
  comparison.push(
    'Each walk-forward window uses the picks made on the preceding training data only (profit #1 = the first profit pick, balanced #1 and low-DD #1 likewise; the median is over the ten picks). The reused window uses the frozen final picks. Continuous runs from 2016-09-20, `stop` fills, 11%. "Total" sums the four windows.\n'
  );
  {
    const rows: unknown[][] = [];
    const policies = ['median of 10', 'profit #1', 'balanced #1', 'low-DD #1'] as const;
    const policyNet = (key: string, window: string, policy: (typeof policies)[number]) => {
      const results = windowResults(key, window);

      if (!results) {
        return undefined;
      }

      if (policy === 'median of 10') {
        const nets = picksOf(results).map((result) => result.metrics.net);

        return nets.length
          ? { net: median(nets), dd: median(picksOf(results).map((result) => result.metrics.minuteDrawdown)) }
          : undefined;
      }

      const leader = categoryLeader(
        results,
        policy === 'profit #1' ? 'profit' : policy === 'balanced #1' ? 'balanced' : 'low-DD'
      );

      return leader ? { net: leader.metrics.net, dd: leader.metrics.minuteDrawdown } : undefined;
    };

    for (const key of familyKeys) {
      for (const policy of policies) {
        const cells = windows.map((window) => policyNet(key, window.key, policy));

        if (cells.every((cell) => cell === undefined)) {
          continue;
        }

        const total = cells.reduce((sum, cell) => sum + (cell?.net ?? 0), 0);
        const worst = Math.max(...cells.map((cell) => cell?.dd ?? 0));

        rows.push([
          `\`${key}\``,
          policy,
          ...cells.map((cell) => (cell ? money(cell.net) : '—')),
          money(total),
          money(worst)
        ]);
      }

      for (const label of ['Trades2 phenotype', 'default (file Y 3%)', 'default (file Y 4%)']) {
        const cells = windows.map((window) => baselineOf(windowResults(key, window.key), label)?.metrics);

        if (cells.every((cell) => cell === undefined)) {
          continue;
        }

        rows.push([
          `\`${key}\``,
          label,
          ...cells.map((cell) => (cell ? money(cell.net) : '—')),
          money(cells.reduce((sum, cell) => sum + (cell?.net ?? 0), 0)),
          money(Math.max(...cells.map((cell) => cell?.minuteDrawdown ?? 0)))
        ]);
      }
    }

    const allInCells = windows.map((window) => allInWindow(window.key));

    rows.push([
      '`allIn.ts`',
      'fixed constants',
      ...allInCells.map((cell) => (cell ? money(cell.net) : '—')),
      money(allInCells.reduce((sum, cell) => sum + (cell?.net ?? 0), 0)),
      money(Math.max(...allInCells.map((cell) => cell?.minuteDrawdown ?? 0)))
    ]);
    comparison.push(
      table(['Family', 'Policy', ...windows.map((window) => window.label), 'Total', 'Worst window minute DD'], rows)
    );
  }

  // ---- pre-declared verdicts
  comparison.push('\n## Pre-declared credit rule (PROTOCOL.md section 7): mechanism vs its base\n');
  {
    const rows: unknown[][] = [];
    const verdicts: Record<string, unknown>[] = [];
    const series = (key: string, policy: 'median' | 'balanced') =>
      windows.map((window) => {
        const results = windowResults(key, window.key);

        if (!results) {
          return undefined;
        }

        if (policy === 'median') {
          const picks = picksOf(results);

          return picks.length
            ? {
                net: median(picks.map((result) => result.metrics.net)),
                dd: median(picks.map((result) => result.metrics.minuteDrawdown))
              }
            : undefined;
        }

        const leader = categoryLeader(results, 'balanced');

        return leader ? { net: leader.metrics.net, dd: leader.metrics.minuteDrawdown } : undefined;
      });

    for (const key of familyKeys) {
      const family = families[key]!;

      if (family.mechanisms.length === 0) {
        continue;
      }

      const baseKey = family.base;
      const outcome: Record<string, unknown> = { family: key, base: baseKey };
      let credited = true;

      for (const policy of ['median', 'balanced'] as const) {
        const a = series(key, policy);
        const b = series(baseKey, policy);
        const available = windows.filter((_window, index) => a[index] && b[index]);

        if (available.length === 0) {
          rows.push([
            `\`${key}\``,
            `\`${baseKey}\``,
            policy === 'median' ? 'median of 10 picks' : 'balanced #1',
            '—',
            '—',
            '—',
            'no data'
          ]);
          credited = false;
          continue;
        }

        const wins = available.filter(
          (_window, index) => a[windows.indexOf(available[index]!)]!.net > b[windows.indexOf(available[index]!)]!.net
        ).length;
        const walkForwardWins = available.filter(
          (window, index) =>
            window.key !== 'reused' &&
            a[windows.indexOf(available[index]!)]!.net > b[windows.indexOf(available[index]!)]!.net
        ).length;
        const totalA = available.reduce((sum, window) => sum + a[windows.indexOf(window)]!.net, 0);
        const totalB = available.reduce((sum, window) => sum + b[windows.indexOf(window)]!.net, 0);
        const worstA = Math.max(...available.map((window) => a[windows.indexOf(window)]!.dd));
        const worstB = Math.max(...available.map((window) => b[windows.indexOf(window)]!.dd));
        const passes = wins >= 3 && totalA > totalB && worstA <= 1.25 * worstB;
        const walkForwardOnly = walkForwardWins === 3 && !passes;

        credited &&= passes;
        outcome[policy] = { wins, windows: available.length, totalA, totalB, worstA, worstB, passes, walkForwardWins };
        rows.push([
          `\`${key}\``,
          `\`${baseKey}\``,
          policy === 'median' ? 'median of 10 picks' : 'balanced #1',
          `${wins}/${available.length}${walkForwardOnly ? ' (3/3 walk-forward)' : ''}`,
          `${money(totalA)} vs ${money(totalB)}`,
          `${money(worstA)} vs ${money(worstB)}`,
          passes ? 'yes' : 'no'
        ]);
      }

      outcome.credited = credited;
      verdicts.push(outcome);
    }

    comparison.push(
      table(
        [
          'Mechanism family',
          'Base',
          'Measure',
          'Windows won',
          'Total OOS net (A vs B)',
          'Worst OOS minute DD (A vs B)',
          'Passes'
        ],
        rows
      )
    );
    comparison.push('\nA mechanism is credited only if both measures pass. ');
    comparison.push(
      verdicts.length
        ? verdicts
            .map((verdict) => `\`${verdict.family}\`: **${verdict.credited ? 'credited' : 'not credited'}**`)
            .join('; ') + '.\n'
        : 'No verdicts yet.\n'
    );
    await fs.outputJson(path.join(resultsRoot, 'verdicts.json'), verdicts, { spaces: 1 });
  }

  // ---- reused window table per family
  comparison.push('\n## Reused window (2024-01-02 → 2025-10-13, previously inspected): the frozen picks\n');
  if (holdout) {
    const rows: unknown[][] = [];
    const allIn = holdout.allIn[reusedKey]!;

    for (const key of familyKeys) {
      const results = holdout.families[key]?.[reusedKey];

      if (!results) {
        continue;
      }

      const picks = picksOf(results);
      const trades2 = baselineOf(results, 'Trades2 phenotype');
      const own = results.find((result) => result.label.startsWith('default (file'));
      const combinedOk = picks.filter(
        (pick) => (segmentOf(pick.metrics, 'combined')?.minuteDrawdown ?? Infinity) <= protocol.drawdownCeiling
      ).length;

      rows.push([
        `\`${key}\``,
        money(median(picks.map((pick) => pick.metrics.net))),
        `${picks.filter((pick) => pick.metrics.net > 0).length}/${picks.length}`,
        trades2 ? `${picks.filter((pick) => pick.metrics.net > trades2.metrics.net).length}/${picks.length}` : '—',
        `${picks.filter((pick) => pick.metrics.net > allIn.net).length}/${picks.length}`,
        own ? money(own.metrics.net) : '—',
        trades2 ? `${money(trades2.metrics.net)} / ${money(trades2.metrics.minuteDrawdown)}` : '—',
        `${combinedOk}/${picks.length}`
      ]);
    }

    comparison.push(
      table(
        [
          'Family',
          'Median of 10 picks',
          'Positive',
          'Beat Trades2',
          'Beat allIn.ts',
          'File default',
          'Trades2 (net / minute DD)',
          'Picks within the $35k ceiling on the combined run'
        ],
        rows
      )
    );
    comparison.push(
      `\n\`allIn.ts\` on the reused window: net ${money(allIn.net)}, minute drawdown ${money(allIn.minuteDrawdown)}, ${allIn.entries} entries. Flat start, \`next-open\` fills and 8%/14% rates are in \`results/holdout/holdout.json\`.\n`
    );
  } else {
    comparison.push('Not yet evaluated.\n');
  }

  // ---- combined full-run frontier
  comparison.push('\n## Full-history frontier (2016-09-20 → 2025-10-13, continuous): every frozen pick\n');
  comparison.push(
    'Development (in-sample) + reused window (previously inspected) in one continuous run. Picks above the $35,000 minute-drawdown ceiling are listed but marked **not accepted**. Sorted by net within each family.\n'
  );
  const shortlist: Record<string, unknown>[] = [];

  if (holdout) {
    for (const key of familyKeys) {
      const results = holdout.families[key]?.[reusedKey];
      const family = families[key]!;

      if (!results) {
        continue;
      }

      const rows: unknown[][] = [];
      const ordered = [...results].sort(
        (a, b) => (segmentOf(b.metrics, 'combined')?.net ?? 0) - (segmentOf(a.metrics, 'combined')?.net ?? 0)
      );

      for (const result of ordered) {
        const combined = segmentOf(result.metrics, 'combined')!;
        const dev = segmentOf(result.metrics, 'development')!;
        const reused = result.metrics;
        const accepted = combined.minuteDrawdown <= protocol.drawdownCeiling;
        const isPick = result.label.startsWith('pick ');

        rows.push([
          result.label + (result.category ? ` (${result.category})` : ''),
          `\`${result.id}\``,
          ...paramCells(family, result.params),
          money(combined.net),
          money(combined.minuteDrawdown),
          money(combined.dailyDrawdown),
          combined.entries,
          money(dev.net),
          money(reused.net),
          accepted ? 'yes' : '**no**'
        ]);

        if (isPick || result.label === 'Trades2 phenotype') {
          shortlist.push({
            family: key,
            familyNumber: family.number,
            base: family.base,
            mechanisms: family.mechanisms,
            label: result.label,
            category: result.category ?? null,
            id: result.id,
            params: result.params,
            description: family.paramKeys
              .map((paramKey) => `${specs[paramKey].short}=${formatValue(paramKey, result.params[paramKey])}`)
              .join(' '),
            source: sourcePath(family),
            combined: {
              net: combined.net,
              minuteDrawdown: combined.minuteDrawdown,
              dailyDrawdown: combined.dailyDrawdown,
              entries: combined.entries,
              interest: combined.interest,
              wins: combined.wins,
              losses: combined.losses
            },
            development: { net: dev.net, minuteDrawdown: dev.minuteDrawdown, entries: dev.entries },
            reused: { net: reused.net, minuteDrawdown: reused.minuteDrawdown, entries: reused.entries },
            acceptedWithinCeiling: accepted
          });
        }
      }

      comparison.push(`\n### ${family.name} (\`${key}\`)\n`);
      comparison.push(
        table(
          [
            'Contender',
            'ID',
            ...paramHeader(family),
            'Combined net',
            'Combined minute DD',
            'Combined daily DD',
            'Entries',
            'Development net',
            'Reused-window net',
            'Within $35k'
          ],
          rows
        )
      );
    }

    const allIn = holdout.allIn[reusedKey]!;
    const allInCombined = segmentOf(allIn, 'combined')!;

    comparison.push(
      `\n\`allIn.ts\` on the combined run: net ${money(allInCombined.net)}, minute drawdown ${money(allInCombined.minuteDrawdown)}, daily drawdown ${money(allInCombined.dailyDrawdown)}, ${allInCombined.entries} entries.\n`
    );
  }

  // ---- sweeps
  comparison.push('\n## Trades2-anchored mechanism sweeps\n');
  comparison.push(
    'The mechanism\'s own parameters swept with everything else fixed at the Trades2 phenotype. "Training best" is the highest training net within the ceiling; it is then evaluated on that fold\'s validation window against the Trades2 base on the same window. A positive "validation gain" means the training-best setting beat the base out of sample.\n'
  );
  {
    const rows: unknown[][] = [];

    for (const key of Object.keys(sweeps)) {
      const sweep = sweeps[key];

      for (const fit of fits) {
        const record = sweep.fits?.[fit];

        if (!record) {
          continue;
        }

        const values = record.best
          ? Object.entries(record.best.values)
              .map(
                ([param, value]) =>
                  `${specs[param as ParamKey].short}=${formatValue(param as ParamKey, value as number)}`
              )
              .join(' ')
          : '—';

        rows.push([
          `\`${key}\``,
          fit,
          record.gridPoints,
          `${record.betterThanBaseInTraining}/${record.gridPoints}`,
          values,
          record.best ? `${money(record.best.net)} vs ${money(record.base.net)}` : '—',
          record.validation
            ? `${money(record.validation.best.net)} vs ${money(record.validation.base.net)} (${money(record.validation.best.net - record.validation.base.net)})`
            : 'n/a (final fit)'
        ]);
      }
    }

    comparison.push(
      table(
        [
          'Family',
          'Fit',
          'Grid points',
          'Beat the base in training',
          'Training best',
          'Training net (best vs base)',
          'Validation net (best vs base, gain)'
        ],
        rows
      )
    );
  }

  await out('STRATEGY_COMPARISON.md', comparison.join('\n'));
  await fs.outputJson(path.join(resultsRoot, 'shortlist.json'), shortlist, { spaces: 1 });
  await fs.outputFile(
    path.join(resultsRoot, 'shortlist.csv'),
    toCsv(
      [
        'family',
        'family_number',
        'base',
        'mechanisms',
        'label',
        'category',
        'id',
        ...allParamKeys,
        'source',
        'combined_net',
        'combined_minute_dd',
        'combined_daily_dd',
        'combined_entries',
        'combined_interest',
        'development_net',
        'development_minute_dd',
        'reused_net',
        'reused_minute_dd',
        'accepted_within_ceiling'
      ],
      shortlist.map((row: any) => [
        row.family,
        row.familyNumber,
        row.base,
        row.mechanisms.join('+'),
        row.label,
        row.category ?? '',
        row.id,
        ...allParamKeys.map((key) => (row.params[key] === undefined ? '' : formatValue(key, row.params[key]))),
        row.source,
        row.combined.net,
        row.combined.minuteDrawdown,
        row.combined.dailyDrawdown,
        row.combined.entries,
        row.combined.interest,
        row.development.net,
        row.development.minuteDrawdown,
        row.reused.net,
        row.reused.minuteDrawdown,
        row.acceptedWithinCeiling
      ])
    )
  );
  log('STRATEGY_COMPARISON.md and the shortlist written');

  // ---- PHENOTYPES per family
  for (const key of familyKeys) {
    const family = families[key]!;
    const selection = selections.get(`final/${key}`);

    if (!selection) {
      continue;
    }

    const reused = holdout?.families[key]?.[reusedKey];
    const lines: string[] = [];

    lines.push(`# Phenotypes: ${family.name} (\`${key}\`)\n`);
    lines.push(
      `Runnable source: \`${sourcePath(family)}\`. Run it with \`npm run app ${path.basename(sourcePath(family), '.ts')} VGT\` (optionally \`[start] [end] [data file] [output dir] [stop fill] [Y] [buffer]\`). To run a phenotype, edit the option defaults and constants in \`runAllIn\` as listed in the "How to set" column, then run the file; nothing else changes.\n`
    );
    lines.push(
      `The ten picks were selected on the development window (2016-09-20 → 2023-12-29, in-sample) by the pre-declared rule (3 profit, 3 balanced, 2 low-DD, 2 Pareto-diverse; no behavioural clones; training minute drawdown ≤ $35,000). "Class" is the one-parameter neighbourhood robustness on development data (stable / moderate / fragile). The reused window (2024-01-02 → 2025-10-13) was previously inspected; "Combined" is the full continuous run, and a combined minute drawdown above $35,000 means **not accepted**.\n`
    );

    const rows: unknown[][] = [];
    const contenders: { label: string; pick?: Pick; result?: ContenderResult; dev?: ContenderResult }[] =
      selection.picks.map((pick) => ({
        label: `pick ${pick.rank}`,
        pick,
        result: reused?.find((result) => result.id === pick.id),
        dev: development?.families[key]?.[`stop-${protocol.marginInterestRate}`]?.find(
          (result) => result.id === pick.id
        )
      }));

    for (const label of ['Trades2 phenotype', 'default (file Y 3%)', 'default (file Y 4%)']) {
      const result = reused?.find((item) => item.label === label);
      const dev = development?.families[key]?.[`stop-${protocol.marginInterestRate}`]?.find(
        (item) => item.label === label
      );

      if (result || dev) {
        contenders.push({ label, result, dev });
      }
    }

    for (const contender of contenders) {
      const params = contender.pick?.params ?? contender.result?.params ?? contender.dev?.params;

      if (!params) {
        continue;
      }

      const devMetrics = contender.pick?.metrics ?? contender.dev?.metrics;
      const combined = contender.result ? segmentOf(contender.result.metrics, 'combined') : undefined;

      rows.push([
        contender.label + (contender.pick ? ` (${contender.pick.category})` : ''),
        `\`${contender.pick?.id ?? contender.result?.id ?? contender.dev?.id}\``,
        ...paramCells(family, params),
        devMetrics ? money(devMetrics.net) : '—',
        devMetrics ? money(devMetrics.minuteDrawdown) : '—',
        devMetrics ? devMetrics.entries : '—',
        devMetrics ? `${devMetrics.wins}/${devMetrics.losses}` : '—',
        devMetrics ? pct(devMetrics.exposure) : '—',
        contender.pick ? contender.pick.robustness.classification : '—',
        contender.result ? money(contender.result.metrics.net) : '—',
        contender.result ? money(contender.result.metrics.minuteDrawdown) : '—',
        combined ? money(combined.net) : '—',
        combined ? money(combined.minuteDrawdown) : '—',
        combined ? (combined.minuteDrawdown <= protocol.drawdownCeiling ? 'yes' : '**no**') : '—'
      ]);
    }

    lines.push(
      table(
        [
          'Contender',
          'ID',
          ...paramHeader(family),
          'Dev net',
          'Dev minute DD',
          'Dev trades',
          'Dev W/L',
          'Dev exposure',
          'Class',
          'Reused net',
          'Reused minute DD',
          'Combined net',
          'Combined minute DD',
          'Within $35k'
        ],
        rows
      )
    );
    lines.push('\n## How to set each phenotype in the source file\n');

    for (const contender of contenders) {
      const params = contender.pick?.params ?? contender.result?.params ?? contender.dev?.params;

      if (params) {
        lines.push(
          `- **${contender.label}** \`${contender.pick?.id ?? contender.result?.id ?? contender.dev?.id}\`: ${howToSet(family, params)}`
        );
      }
    }

    lines.push('\n## Neighbourhood robustness of the picks (development data)\n');
    lines.push(
      table(
        [
          'Pick',
          'Probes',
          'Robust net (25th pct)',
          'Median net',
          'Minimum net',
          'Robust minute DD (75th pct)',
          'Maximum minute DD',
          'Worst one-step net',
          'Class',
          'Notes'
        ],
        selection.picks.map((pick) => [
          `pick ${pick.rank}`,
          pick.robustness.probes,
          money(pick.robustness.robustNet),
          money(pick.robustness.medianNet),
          money(pick.robustness.minimumNet),
          money(pick.robustness.robustDrawdown),
          money(pick.robustness.maximumDrawdown),
          money(pick.robustness.worstOneStepNet),
          pick.robustness.classification,
          pick.robustness.notes.join('; ') || '—'
        ])
      )
    );

    await out(path.join('phenotypes', `${key}.md`), lines.join('\n'));
  }

  log('phenotype tables written');

  // ---- TRADE_ATTRIBUTION.md (against Trades2 on the full run)
  if (holdout) {
    const lines: string[] = [];
    const trades2Dir = path.join(resultsRoot, 'traces', 'full', 'bufferedLossNoReentry');
    const trades2Id = holdout.families.bufferedLossNoReentry?.[reusedKey]?.find(
      (result) => result.label === 'Trades2 phenotype'
    )?.id;
    const equityFile = trades2Id ? path.join(trades2Dir, trades2Id, 'equity.csv') : undefined;
    const dates = new Map<string, number>();

    if (equityFile && (await exists(equityFile))) {
      (await fs.readFile(equityFile, 'utf8'))
        .trim()
        .split('\n')
        .slice(1)
        .forEach((line, index) => dates.set(line.split(',')[0]!, index));
    }

    const endIndex = dates.size - 1;
    const reference = trades2Id
      ? indexTrades(await readTrades(path.join(trades2Dir, trades2Id, 'trades.csv')), dates, endIndex)
      : [];

    lines.push(
      '# Trade attribution against Trades2 (full continuous run, 2016-09-20 → ' + holdout.dataLastDate + ')\n'
    );
    lines.push(
      `Reference: the Trades2 phenotype through the engine (\`${trades2Id}\`, ${reference.length} trades, net ${money(reference.reduce((sum, trade) => sum + trade.profit, 0))}). Trades are matched by overlapping held sessions (greedy by overlap, one-to-one). Classes: **preserved** (reference winner, candidate within 10% or better), **diminished** (winner, candidate at least 10% lower), **turned to loss**, **missed** (winner, no overlapping candidate trade), **reduced** (reference loser, candidate lost less), **magnified**, **avoided** (loser, no overlapping trade), **new** (candidate trades with no overlap). The three large winners (2019-01 → 2019-05, 2020-04 → 2020-09, 2022-12 → 2023-08) and the March 2020 loss are tracked by name. Profits are after interest; the open 2025 position is marked at the last close.\n`
    );

    const landmark = (trades: AttributionTrade[], entryMonth: string) =>
      trades.find((trade) => trade.entryDate.startsWith(entryMonth));
    const landmarks = [
      { label: '2019-01 → 2019-05 (+$20k)', month: '2019-01' },
      { label: '2020-03 attempt (−$9.5k)', month: '2020-03-09' },
      { label: '2020-04 → 2020-09 (+$50k)', month: '2020-04' },
      { label: '2022-12 → 2023-08 (+$29k)', month: '2022-12' },
      { label: '2025-04 open position', month: '2025-04-17' }
    ];
    const summaryRows: unknown[][] = [];
    const detailSections: string[] = [];

    for (const key of familyKeys) {
      const results = holdout.families[key]?.[reusedKey];

      if (!results) {
        continue;
      }

      // The picks within the ceiling plus the file default and (for the base family) Trades2 itself.
      const candidates = results.filter(
        (result) =>
          result.label.startsWith('pick ') ||
          result.label.startsWith('default (file') ||
          result.label === 'Trades2 phenotype'
      );

      for (const candidate of candidates) {
        const combined = segmentOf(candidate.metrics, 'combined')!;
        const trades = indexTrades(
          await readTrades(path.join(resultsRoot, 'traces', 'full', key, candidate.id, 'trades.csv')),
          dates,
          endIndex
        );
        const result: Attribution = attribute(reference, trades, endIndex);
        const s = result.summary;
        const landmarkCells = landmarks.map(({ month }) => {
          const ref = landmark(reference, month);
          const match = ref ? result.matches.find((item) => item.reference === ref) : undefined;

          if (!match) {
            return '—';
          }

          return `${match.classification}${match.candidate ? ` (${money(match.candidate.profit)})` : ''}`;
        });

        summaryRows.push([
          `\`${key}\``,
          candidate.label,
          `\`${candidate.id}\``,
          money(combined.net),
          money(combined.minuteDrawdown),
          combined.minuteDrawdown <= protocol.drawdownCeiling ? 'yes' : '**no**',
          trades.length,
          `${s.preserved.count} (${money(s.preserved.candidateProfit)})`,
          `${s.diminished.count} (${money(s.diminished.difference)})`,
          `${s['turned to loss'].count} (${money(s['turned to loss'].difference)})`,
          `${s.missed.count} (${money(s.missed.difference)})`,
          `${s.avoided.count} (${money(s.avoided.difference)})`,
          `${s.reduced.count} (${money(s.reduced.difference)})`,
          `${s.magnified.count} (${money(s.magnified.difference)})`,
          `${s.new.count} (${money(s.new.candidateProfit)})`,
          money(result.candidateInterest),
          num(result.candidateHoldDays, 0),
          ...landmarkCells
        ]);
      }
    }

    lines.push(
      table(
        [
          'Family',
          'Contender',
          'ID',
          'Combined net',
          'Minute DD',
          'Within $35k',
          'Trades',
          'Preserved (profit)',
          'Diminished (Δ)',
          'Turned to loss (Δ)',
          'Missed (Δ)',
          'Avoided (Δ)',
          'Reduced (Δ)',
          'Magnified (Δ)',
          'New (profit)',
          'Interest',
          'Exposure days',
          ...landmarks.map((item) => item.label)
        ],
        summaryRows
      )
    );
    lines.push(
      `\nTrades2 itself: interest ${money(reference.reduce((sum, trade) => sum + trade.interest, 0))}, exposure ${num(
        reference.reduce((sum, trade) => sum + trade.holdDays, 0),
        0
      )} days. Per-trade lists are in \`results/traces/full/<family>/<id>/trades.csv\`.\n`
    );
    lines.push(...detailSections);
    await out('TRADE_ATTRIBUTION.md', lines.join('\n'));
    log('TRADE_ATTRIBUTION.md written');
  }

  // ---- PROVENANCE.md
  {
    const lines: string[] = [];

    lines.push('# Optimization provenance\n');
    lines.push(
      `Engine \`src/trailing-buy-variants/engine.ts\` (equal to the four-family engine with every mechanism off; parity with the strategy files in \`results/parity/\`). Search: 4,096 unique scrambled-Sobol lattice points + 3 anchors (base defaults at Y 3% and 4%, Trades2 phenotype), then two NSGA-II runs (population 128, 60 generations × 128 offspring, SBX p 0.9 η 15, polynomial mutation η 20) seeded by \`deriveSeed('trailing-buy-variants', 'sobol' | 'nsga', fit, family[, seed])\`; 19,459 requested evaluations per stage, duplicates cached. Objectives: maximize training net, minimize training minute drawdown; constraint: at least one entry per training year; selection eligibility: training minute drawdown ≤ $35,000. Selection rule: PROTOCOL.md section 6. ${freeze ? `Freeze \`${freeze.freezeHash}\` at ${freeze.frozenAt}.` : 'Not frozen yet.'}\n`
    );
    lines.push('## Parameter domains\n');
    lines.push(
      table(
        ['Parameter', 'Short', 'Domain', 'Step', 'Points'],
        allParamKeys.map((key) => {
          const spec = specs[key];

          return [
            `\`${key}\``,
            spec.short,
            `${formatValue(key, spec.min)} – ${formatValue(key, spec.max)}`,
            spec.unit === 'tenths of a percentage point'
              ? '0.1 pt'
              : spec.unit === 'percent'
                ? '5 pt'
                : `1 ${spec.unit.replace('calendar ', '')}`,
            Math.floor((spec.max - spec.min) / spec.step) + 1
          ];
        })
      )
    );
    lines.push('\n## Budget actually run\n');
    {
      const rows: unknown[][] = [];
      let totalUnique = 0;
      let totalAttempted = 0;
      let totalProbes = 0;

      for (const fit of fits) {
        for (const key of familyKeys) {
          const stage = stages.get(`${fit}/${key}`);
          const selection = selections.get(`${fit}/${key}`);

          if (!stage) {
            continue;
          }

          totalUnique += stage.stats.unique;
          totalAttempted += stage.stats.attempted;
          totalProbes += selection?.probeEvaluations.unique ?? 0;
          rows.push([
            fit,
            `\`${key}\``,
            stage.dimensions,
            stage.minEntries,
            stage.stats.attempted.toLocaleString('en-US'),
            stage.stats.unique.toLocaleString('en-US'),
            stage.feasible.toLocaleString('en-US'),
            selection?.phenotypes.toLocaleString('en-US') ?? '—',
            selection ? `${selection.aboveCeiling.phenotypes} (${money(selection.aboveCeiling.bestNet)})` : '—',
            selection?.pool.length ?? '—',
            selection?.probeEvaluations.unique ?? '—',
            selection?.picks.length ?? '—',
            (stage.stats.runtimeMs / 1000).toFixed(1),
            stage.stats.workers
          ]);
        }
      }

      lines.push(
        table(
          [
            'Fit',
            'Family',
            'Dims',
            'Min entries',
            'Attempted',
            'Unique simulated',
            'Feasible',
            'Phenotypes',
            'Above ceiling (best net)',
            'Pool',
            'Probe evaluations',
            'Picks',
            'Search s',
            'Workers'
          ],
          rows
        )
      );
      lines.push(
        `\nTotals: ${totalAttempted.toLocaleString('en-US')} requested, ${totalUnique.toLocaleString('en-US')} unique simulations, ${totalProbes.toLocaleString('en-US')} neighbourhood probes, over ${rows.length} stages.\n`
      );
    }
    lines.push('\n## Multiple testing\n');
    lines.push(
      `${familyKeys.length} families × ${fits.length} fits were searched, ${familyKeys.length * 10} final phenotypes were frozen, and the sweeps added ${Object.values(
        sweeps
      )
        .reduce(
          (sum: number, sweep: any) =>
            sum + Object.values(sweep.fits ?? {}).reduce((inner: number, fit: any) => inner + (fit.gridPoints ?? 0), 0),
          0
        )
        .toLocaleString(
          'en-US'
        )} grid evaluations. Every walk-forward figure is one of several hundred thousand configurations' descendants, and the reused window was inspected by the previous program; nothing here restores its independence. Small trade counts (2–11 entries per window) make single trades decisive.\n`
    );
    await out('PROVENANCE.md', lines.join('\n'));
    log('PROVENANCE.md written');
  }
};
