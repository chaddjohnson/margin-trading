// Real-data regression guards (PROTOCOL.md §11), skipped where the minute files are absent: the frozen inputs and
// their hashes, the seven fixed-$100k phenotype controls trade by trade, portfolio A and B against the earlier engine,
// identical decision state in both modes for all eight combinations, and every catalogue run's headline figures
// against the values recorded when the catalogue was first generated (tests/regression.json).
import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import fs from 'fs-extra';
import {
  combinationKey,
  combinations,
  expectedHashes,
  files,
  protocol,
  protocolFreezeFile,
  securities,
  sha256File
} from '../context.ts';
import { loadUniverse } from '../data.ts';
import { runAllocator } from '../engine.ts';
import { summarize, virtualSignature } from '../metrics.ts';
import { runFixedParity, runPortfolioParity } from '../parity.ts';
import { loadManifest, resolveCombination } from '../phenotypes.ts';
import { allocatorConfig, catalogue } from '../scenarios.ts';

const missing = securities.some((security) => !fs.existsSync(files.minute(security)))
  ? 'the minute files are not present'
  : false;
const expected = fs.readJsonSync(new URL('./regression.json', import.meta.url)) as {
  runs: Record<
    string,
    {
      net: number;
      minuteDrawdown: number;
      dailyDrawdown: number;
      fundedLots: number;
      endEquity: number;
      virtualSignature: string;
    }
  >;
};
const near = (a: number, b: number) => Math.abs(a - b) <= 1e-6 * Math.max(1, Math.abs(a), Math.abs(b));

describe('frozen inputs', { skip: missing }, () => {
  test('data, D1 source and phenotype hashes; the manifest body hash; the protocol freeze', async () => {
    for (const security of securities) {
      assert.equal(await sha256File(files.minute(security)), expectedHashes[security], security);
    }

    assert.equal(await sha256File(files.distributions), expectedHashes.distributions);
    await loadManifest();

    for (const combination of combinations) {
      const resolved = await resolveCombination(combination);

      assert.equal(resolved.VGT.manifestRole, 'D1 shipped constants');
      assert.equal(resolved.XBI.manifestRole, combination.XBI === 'primary' ? 'primary' : 'alternate-lowDd');
    }

    assert.ok(await fs.pathExists(protocolFreezeFile));
  });
});

describe('baseline reproduction', { skip: missing }, () => {
  test('the seven fixed-$100k phenotypes reproduce their research trade by trade', async () => {
    const { outcomes } = await runFixedParity();

    assert.equal(outcomes.length, 7);

    for (const outcome of outcomes) {
      assert.deepEqual(outcome.differences, [], outcome.name);
    }

    const vgt = outcomes.find((outcome) => outcome.name === 'VGT primary')!;

    assert.equal(vgt.net.toFixed(2), '183043.82');
    assert.equal(vgt.minuteDrawdown.toFixed(2), '19330.69');
    assert.equal(vgt.trades, 20);
  });

  test('portfolio A and B equal the earlier engine at every close and lot', async () => {
    const universe = await loadUniverse({ members: ['VOOG', 'VGT'], end: protocol.commonEnd });
    const { outcomes } = await runPortfolioParity(universe);

    for (const outcome of outcomes) {
      assert.deepEqual(outcome.differences, [], outcome.scenario);
    }

    assert.equal(Math.round(outcomes[0]!.endEquity), 1784588);
    assert.equal(Math.round(outcomes[1]!.endEquity), 2346272);
  });
});

describe('regression guards', { skip: missing }, () => {
  const check = (key: string, summary: ReturnType<typeof summarize>) => {
    const reference = expected.runs[key];

    assert.ok(reference, `${key} has no recorded figures`);
    assert.equal(summary.fundedLots, reference.fundedLots, `${key} lots`);
    assert.ok(near(summary.net, reference.net), `${key} net ${summary.net} vs ${reference.net}`);
    assert.ok(near(summary.minuteDrawdown, reference.minuteDrawdown), `${key} minute DD`);
    assert.ok(near(summary.dailyDrawdown, reference.dailyDrawdown), `${key} daily DD`);
    assert.ok(near(summary.endEquity, reference.endEquity), `${key} end equity`);
    assert.equal(summary.virtualSignature, reference.virtualSignature, `${key} virtual trades`);
  };

  test('all eight combinations: identical decision state in both modes, and their recorded figures', async () => {
    const universe = await loadUniverse({ members: ['VOOG', 'VGT', 'XBI', 'XRT', 'KRE'] });

    for (const combination of combinations) {
      const fixedConfig = await allocatorConfig('fixed', combination, 'shadow');
      const portfolioConfig = await allocatorConfig('portfolio', combination, 'shadow');
      const fixed = runAllocator(universe, fixedConfig);
      const portfolio = runAllocator(universe, portfolioConfig);

      assert.equal(virtualSignature(fixed), virtualSignature(portfolio), combinationKey(combination));
      assert.deepEqual(
        fixed.lots.map((lot) => `${lot.symbol}:${lot.entryIndex}:${lot.exitIndex}`),
        portfolio.lots.map((lot) => `${lot.symbol}:${lot.entryIndex}:${lot.exitIndex}`)
      );
      check(fixedConfig.key, summarize(fixed));
      check(portfolioConfig.key, summarize(portfolio));
    }
  });

  // The principal runs by default; every catalogue run with ALLOCATOR_FULL_REGRESSION=1 (≈ 95 s more).
  test('the catalogue runs reproduce their recorded headline figures', async () => {
    const universe = await loadUniverse({ members: ['VOOG', 'VGT', 'XBI', 'XRT', 'KRE'] });
    const full = process.env.ALLOCATOR_FULL_REGRESSION === '1';

    for (const spec of catalogue().filter(
      (candidate) => full || (candidate.group === 'principal' && !candidate.key.endsWith('-shadow'))
    )) {
      check(spec.key, summarize(runAllocator(universe, await spec.build())));
    }
  });
});
