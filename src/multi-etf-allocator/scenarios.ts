// The predeclared run catalogue (PROTOCOL.md §5–§7): the VGT-only controls, every combination under every policy in
// both modes, and the runner that writes each run's outputs and the combined summary. Principal runs (the controls,
// all-primary and all-lowDd under every policy) keep every file; the other six combinations keep their summaries,
// trades and refusals in git while their per-session files are regenerable (.gitignore).
import path from 'node:path';
import {
  type Combination,
  type Policy,
  combinationKey,
  combinationOf,
  combinationLabel,
  combinations,
  log,
  policyLabels,
  stageDir,
  writeJson
} from './context.ts';
import type { Universe } from './data.ts';
import { type RunConfig, type RunResult, baseRunConfig, runAllocator } from './engine.ts';
import { writeRun } from './export.ts';
import { type Summary, summaryRow, toCsv } from './metrics.ts';
import { scenarioAConfig, scenarioBConfig } from './parity.ts';
import { resolveCombination } from './phenotypes.ts';
import fs from 'fs-extra';

export interface RunSpec {
  key: string;
  group: 'principal' | 'grid';
  build: () => Promise<RunConfig>;
}

export const mainCombinations = ['all-primary', 'all-lowDd'].map((alias) => combinationKey(combinationOf(alias)));

export const runKey = (mode: 'fixed' | 'portfolio', combination: Combination, policy: Policy) =>
  `${mode === 'fixed' ? 'F' : 'C'}-${combinationLabel(combinationKey(combination))}-${policy}`;

export const allocatorConfig = async (
  mode: 'fixed' | 'portfolio',
  combination: Combination,
  policy: Policy,
  overrides: Partial<RunConfig> = {}
): Promise<RunConfig> =>
  baseRunConfig({
    key: runKey(mode, combination, policy),
    label: `${mode === 'fixed' ? 'fixed $100k' : '20% portfolio'}, ${combinationLabel(combinationKey(combination))}, ${policyLabels[policy]}`,
    mode,
    combination,
    phenotypes: await resolveCombination(combination),
    policy,
    ...overrides
  });

export const fixedVgtConfig = async (overrides: Partial<RunConfig> = {}) =>
  baseRunConfig({
    key: 'F-VGT',
    label: 'fixed $100k, VGT D1 alone (control)',
    mode: 'fixed',
    combination: combinationOf('all-primary'),
    phenotypes: await resolveCombination(combinationOf('all-primary')),
    symbols: ['VGT'],
    ...overrides
  });

export const catalogue = (): RunSpec[] => {
  const specs: RunSpec[] = [
    { key: 'A', group: 'principal', build: scenarioAConfig },
    { key: 'B', group: 'principal', build: () => scenarioBConfig() },
    { key: 'F-VGT', group: 'principal', build: () => fixedVgtConfig() }
  ];

  for (const mode of ['fixed', 'portfolio'] as const) {
    for (const combination of combinations) {
      const isMain = mainCombinations.includes(combinationKey(combination));
      const policies: Policy[] = isMain
        ? ['shadow', 'priority', 'split', 'cancel', 'hold']
        : ['shadow', 'priority', 'split'];

      for (const policy of policies) {
        specs.push({
          key: runKey(mode, combination, policy),
          group: isMain ? 'principal' : 'grid',
          build: () => allocatorConfig(mode, combination, policy)
        });
      }
    }
  }

  return specs;
};

export const runDir = (spec: Pick<RunSpec, 'key' | 'group'>) => stageDir('runs', spec.group, spec.key);

export interface CatalogueRun {
  summaries: Summary[];
  results: Map<string, RunResult>;
}

// Runs the named specs (all by default), writing each run's directory; keeps the results in memory for the
// comparison tables when `keep` says so.
export const runCatalogue = async (
  universe: Universe,
  specs: RunSpec[],
  keep: (key: string) => boolean = () => true
): Promise<CatalogueRun> => {
  const summaries: Summary[] = [];
  const results = new Map<string, RunResult>();

  for (const spec of specs) {
    const started = Date.now();
    const result = runAllocator(universe, await spec.build());
    const summary = await writeRun(runDir(spec), result);

    summaries.push(summary);

    if (keep(spec.key)) {
      results.set(spec.key, result);
    }

    log(
      `${spec.key}: ${summary.fundedLots} lots of ${summary.virtualTrades} virtual trades, net ${Math.round(summary.net)}, ${summary.mode === 'portfolio' ? `end equity ${Math.round(summary.endEquity)}, daily DD ${(summary.dailyDrawdownPercent * 100).toFixed(1)}%` : `minute DD ${Math.round(summary.minuteDrawdown)}`} (${((Date.now() - started) / 1000).toFixed(1)} s)`
    );
  }

  return { summaries, results };
};

export const writeSummaries = async (summaries: Summary[], name = 'scenario_summary') => {
  await fs.outputFile(path.join(stageDir(), `${name}.csv`), toCsv(summaries.map(summaryRow)));
  await writeJson(path.join(stageDir(), `${name}.json`), summaries);
};
