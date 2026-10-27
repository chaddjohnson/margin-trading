// MANIFEST.json: the study's commit, protocol head, read-only input hashes, window and conventions, the tested
// phenotype, every design point (OAT, paired and joint samples with their parameter values and seeds), the cost
// scenarios, the run counts and keys, and the sha256 of every final record file (runs, baseline, parity, detail and the
// deterministic CSV tables). `verify` checks the record files against it.
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import fs from 'fs-extra';
import { d1Keys } from '../multi-etf-allocator/phenotypes.ts';
import {
  base,
  costScenarios,
  jointLabel,
  jointSamples,
  jointSeeds,
  nowIso,
  pairedPools,
  pairedSamples,
  protocolFile,
  protocolFreezeFile,
  protocolOriginalSha256,
  protocolSha256,
  regimeWindows,
  researchRoot,
  resultsRoot,
  sha256Of,
  shortNames,
  studyLabel,
  writeJson
} from './context.ts';
import { allSpecs, jointDesign, loadFrozenPools, loadStandalones, pairedDesign, vgtOatPoints } from './specs.ts';
import { readOnlyInputs } from './verify.ts';

const git = (...args: string[]) => execFileSync('git', args, { encoding: 'utf8' }).trim();

const filesUnder = async (dir: string): Promise<string[]> => {
  if (!(await fs.pathExists(dir))) {
    return [];
  }

  const entries = await fs.readdir(dir, { withFileTypes: true });
  const nested = await Promise.all(
    entries.map((entry) =>
      entry.isDirectory() ? filesUnder(path.join(dir, entry.name)) : [path.join(dir, entry.name)]
    )
  );

  return nested.flat().sort();
};

export const writeManifest = async () => {
  const pools = await loadFrozenPools();
  const standalones = await loadStandalones();
  const { specs } = allSpecs(pools, standalones);
  const byFamily: Record<string, number> = {};

  for (const spec of specs) {
    byFamily[spec.family] = (byFamily[spec.family] ?? 0) + 1;
  }

  const recordFiles = [
    ...(await filesUnder(path.join(resultsRoot, 'runs'))),
    ...(await filesUnder(path.join(resultsRoot, 'detail'))),
    ...(await filesUnder(path.join(resultsRoot, 'parity'))),
    path.join(resultsRoot, 'baseline', 'baseline.json'),
    ...(await fs.readdir(resultsRoot))
      .filter((name) => name.endsWith('.csv'))
      .map((name) => path.join(resultsRoot, name))
      .sort()
  ];
  const records: Record<string, string> = {};

  for (const file of recordFiles) {
    records[file] = await sha256Of(file);
  }

  const inputs: Record<string, string> = {};

  for (const file of Object.keys(readOnlyInputs)) {
    inputs[file] = await sha256Of(file);
  }

  const grid = (values: number[], dims: { key: (typeof d1Keys)[number] }[]) =>
    Object.fromEntries(dims.map((d, k) => [shortNames[d.key], values[k]!]));

  const manifest = {
    schema: 'vgt-standalone-robustness-manifest-v1',
    generatedAt: nowIso(),
    study: studyLabel,
    git: { head: git('rev-parse', 'HEAD'), branch: git('branch', '--show-current') },
    node: process.version,
    protocol: {
      file: protocolFile,
      originalSha256: protocolOriginalSha256,
      headSha256: protocolSha256,
      freeze: protocolFreezeFile,
      freezeSha256: await sha256Of(protocolFreezeFile)
    },
    readOnlyInputs: inputs,
    window: {
      dataset: 'all',
      first: base.first,
      end: base.end,
      sessions: base.sessions,
      firstEligibleDate: base.firstEligibleDate,
      postCutoffBarsRead: false
    },
    conventions: {
      engine: 'src/portfolio-aware-d1/nbook/engine.ts via src/b4-b5-robustness/run.ts (runPoolOn configuration)',
      fixed: { notional: base.notional, compounding: false },
      interest: { annualRate: base.rate, method: 'simple', dayCount: 365 },
      costBpsPerSide: base.costBps,
      stopFill: base.stopFill,
      portfolio: {
        initialEquity: base.initialEquity,
        core: '60% VOOG / 40% VGT',
        borrowedFraction: base.borrowedFraction,
        dividends: base.dividends
      }
    },
    standalones: standalones.map((s) => ({ id: s.id, file: s.file, phenotype: s.phenotype, grid: s.book.grid })),
    designs: {
      oat: vgtOatPoints(pools).map((point) => ({
        key: point.key,
        offset: point.offset,
        frozen: point.frozen,
        value: point.value,
        feasible: point.feasible
      })),
      paired: pairedPools.map((pool) => {
        const { dimensions, samples } = pairedDesign(pools, pool);

        return {
          pool,
          labels: ['book', pool, 'VGT', 1],
          seedLabelPrefix: 'b4-b5-robustness-audit-v1',
          samples: samples.map((values, index) => ({ index, values: grid(values, dimensions) })),
          count: pairedSamples
        };
      }),
      joint: standalones.flatMap((s) =>
        jointSeeds.map((seed) => {
          const { dimensions, samples } = jointDesign(s, seed);

          return {
            standalone: s.id,
            seed,
            labels: [jointLabel, s.id, seed],
            seedLabelPrefix: 'b4-b5-robustness-audit-v1',
            samples: samples.map((values, index) => ({ index, values: grid(values, dimensions) })),
            count: jointSamples
          };
        })
      ),
      bootstrapSeed: [studyLabel, 'bootstrap']
    },
    costScenarios,
    regimeWindows,
    runs: { total: specs.length, byFamily, keys: specs.map((spec) => spec.key) },
    diagnosticOnly: 'every non-frozen configuration is diagnostic-only; none was written to config/ or promoted',
    records
  };

  await writeJson(path.join(researchRoot, 'MANIFEST.json'), manifest);
  console.log(
    `[manifest] ${path.join(researchRoot, 'MANIFEST.json')}: ${specs.length} runs, ${recordFiles.length} record files`
  );
};
