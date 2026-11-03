// MANIFEST.json (PROTOCOL.md §11): the commit, the frozen configurations' and data files' fingerprints, the date
// coverage, the run conventions, every parameter's distances and legal neighbourhood, every OAT point (with the
// infeasible ones and why), every sampled configuration of every neighbourhood design, the cost scenarios, the regime
// windows, the seeds and the run counts. Written from the protocol's own generators, so it is the list the runs used.
import { execFileSync } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'fs-extra';
import { d1Keys } from '../multi-etf-allocator/phenotypes.ts';
import { deriveSeed } from '../optimizer/rng.ts';
import { auditMembers, families } from './cli.ts';
import {
  base,
  bookSamples,
  bootstrap,
  costScenarios,
  distancesOf,
  jointSamples,
  jointSeeds,
  legal,
  nowIso,
  poolIds,
  protocolFile,
  protocolFreezeFile,
  protocolSha256,
  regimeWindows,
  researchRoot,
  shortNames,
  studyLabel,
  writeJson
} from './context.ts';
import { allSpecs, dimensionsOf, loadFrozenPools } from './specs.ts';

const sha256File = async (file: string) =>
  crypto
    .createHash('sha256')
    .update(await fs.readFile(file))
    .digest('hex');

const git = (...args: string[]) => execFileSync('git', args, { encoding: 'utf8' }).trim();

export const writeManifest = async () => {
  const pools = await loadFrozenPools();
  const { specs, oat, samples } = allSpecs(pools);
  const frozenFiles = [
    'config/pools/B4.json',
    'config/pools/B5.json',
    ...['VGT', 'XBI', 'XRT', 'KRE', 'GDX'].map((symbol) => `config/phenotypes/D1/${symbol}.json`),
    'research/prospective-b4-b5-shadow/PROTOCOL.md',
    'research/prospective-b4-b5-shadow/PROTOCOL_FREEZE.json',
    'research/joint-16-etf-d1/results/controls/controls.json',
    'research/portfolio-aware-d1-optimization/FROZEN_SELECTION.json',
    'data/partitions.json',
    'config/market-events/splits.json',
    'config/market-events/distributions.csv',
    'config/market-events/distributions.manifest.json',
    'package-lock.json',
    protocolFile,
    protocolFreezeFile
  ];
  const fingerprints: Record<string, string> = {};

  for (const file of frozenFiles) {
    fingerprints[file] = await sha256File(file);
  }

  const data: Record<string, { file: string; sha256: string; bytes: number; first: string; last: string }> = {};

  for (const symbol of auditMembers) {
    const file = `data/${symbol}/data.csv`;
    const text = await fs.readFile(file, 'utf8');
    const lines = text.trimEnd().split('\n');

    data[symbol] = {
      file,
      sha256: crypto.createHash('sha256').update(text).digest('hex'),
      bytes: Buffer.byteLength(text),
      first: lines[0]!.slice(1, 21),
      last: lines.at(-1)!.slice(1, 21)
    };
  }

  const neighbourhoods = Object.fromEntries(
    poolIds.map((id) => [
      id,
      pools[id].books.map((book) => ({
        symbol: book.symbol,
        phenotype: book.phenotype,
        parameters: d1Keys.map((key) => {
          const v = book.grid[key];
          const { small, moderate, rule } = distancesOf(key, v);
          const values = dimensionsOf([book]).find((dimension) => dimension.key === key)!.values;

          return {
            key,
            short: shortNames[key],
            frozen: v,
            unit: ['maximumHoldDays'].includes(key)
              ? 'calendar days'
              : ['tickWindowSize', 'continuationWindow'].includes(key)
                ? 'sessions'
                : 'tenths of a percentage point',
            small,
            moderate,
            rule,
            legal: legal(key),
            jointRange: [values[0], values.at(-1)],
            jointValues: values.length,
            truncated: values[0] !== v - moderate || values.at(-1) !== v + moderate
          };
        })
      }))
    ])
  );

  const manifest = {
    schema: 'b4-b5-robustness-manifest-v1',
    generatedAt: nowIso(),
    study: studyLabel,
    git: {
      head: git('rev-parse', 'HEAD'),
      branch: git('rev-parse', '--abbrev-ref', 'HEAD'),
      statusShort: git('status', '--short').split('\n').filter(Boolean)
    },
    node: process.version,
    protocol: { file: protocolFile, sha256: protocolSha256, freeze: protocolFreezeFile },
    fingerprints,
    data,
    window: {
      dataset: 'all',
      first: base.first,
      end: base.end,
      sessions: base.sessions,
      firstEligibleDate: base.firstEligibleDate,
      partialYears: { 2016: 'no trading', 2017: 'partial eligibility from 2017-06-15', 2026: `partial to ${base.end}` }
    },
    conventions: {
      engine: 'src/portfolio-aware-d1/nbook/engine.ts runNAllocator, configured as src/pools/run.ts runPoolOn',
      fixed: {
        fundedSlots: 1,
        notionalPerTrade: base.notional,
        compounding: false,
        policy: 'shadow',
        sameMinuteOrder: 'alphabetical'
      },
      interest: { annualRate: base.rate, method: 'simple', dayCount: 365 },
      costBpsPerSide: base.costBps,
      commission: 0,
      stopFill: base.stopFill,
      stopSlippageBps: base.stopSlippageBps,
      portfolio: {
        initialEquity: base.initialEquity,
        core: { VOOG: 0.6, VGT: 0.4 },
        borrowedFraction: base.borrowedFraction,
        dividends: base.dividends
      },
      simulationMode:
        'one continuous run over `all`, no warm-up (data from the first session), books arm from 2017-06-15'
    },
    seeds: {
      joint: jointSeeds.map((seed) => ({
        seed,
        labels: [studyLabel, 'joint', '<pool>', seed],
        example: { B4: deriveSeed(studyLabel, 'joint', 'B4', seed), B5: deriveSeed(studyLabel, 'joint', 'B5', seed) }
      })),
      book: { labels: [studyLabel, 'book', '<pool>', '<symbol>', 1] },
      bootstrap: { labels: [studyLabel, 'bootstrap'], seed: deriveSeed(studyLabel, 'bootstrap'), ...bootstrap }
    },
    neighbourhoods,
    oat,
    samples: samples.map((sample) => ({
      pool: sample.pool,
      design: sample.design,
      index: sample.index,
      dimensions: sample.dimensions.map((dimension) => `${dimension.symbol}.${shortNames[dimension.key]}`),
      values: sample.values,
      sizes: { joint: jointSamples, book: bookSamples }
    })),
    costScenarios,
    regimeWindows,
    runs: {
      total: specs.length,
      byFamily: Object.fromEntries(
        families.map((family) => [family, specs.filter((spec) => spec.family === family).length])
      ),
      keys: specs.map((spec) => spec.key)
    },
    diagnosticOnly:
      'every non-frozen configuration in this manifest is diagnostic-only: never written to config/, never a candidate, benchmark or default'
  };

  await writeJson(`${researchRoot}/MANIFEST.json`, manifest);
  console.log(
    `[manifest] ${specs.length} runs, ${oat.length} OAT points, ${samples.length} samples → ${researchRoot}/MANIFEST.json`
  );
};
