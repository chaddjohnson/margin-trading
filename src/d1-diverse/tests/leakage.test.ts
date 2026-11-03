// The temporal leakage barriers (PROTOCOL.md §18) through the REAL loader on fixture CSVs in a temporary data
// directory: the fold door physically truncates at the search end; the validation door refuses before PICKS.json and
// the evaluation door refuses without a nominee; and the mutation test — the same fold round (searchCore + selectCore:
// schedule, anchored and free islands, families, promotion, refinement, pruning, assessment, picks) run twice on data
// whose bars after the search end differ by +3% — gives byte-identical archives, promotion records and picks, while
// the same mutation without truncation is visible (the comparison can detect a leak).
import assert from 'node:assert/strict';
import os from 'node:os';
import path from 'node:path';
import { after, before, describe, test } from 'node:test';
import fs from 'fs-extra';
import { defaultPartitionConfigText } from '#lib';
import { RobustEvaluator } from '../../d1-robust/evaluator.ts';
import type { Book } from '../../d1-robust/neighbourhood.ts';
import { floorReferences } from '../../d1-robust/stats.ts';
import { loadNUniverse } from '../../portfolio-aware-d1/nbook/universe.ts';
import { type Tier, tiers } from '../context.ts';
import { evaluationUniverse, trainingUniverse, validationUniverse } from '../data.ts';
import { sobolLibrary } from '../library.ts';
import { searchCore, selectCore } from '../round.ts';
import { buildSchedule } from '../schedule.ts';

const symbols = ['GDX', 'KRE', 'VGT', 'VOOG', 'XBI', 'XRT'];
let root = '';

const weekdays = (from: string, to: string) => {
  const dates: string[] = [];

  for (let t = Date.parse(from); t <= Date.parse(to); t += 86400000) {
    const day = new Date(t).getUTCDay();

    if (day !== 0 && day !== 6) {
      dates.push(new Date(t).toISOString().slice(0, 10));
    }
  }

  return dates;
};

// Minute rows: eight bars from 14:30 UTC, repeated declines and recoveries; `shift` multiplies every price after the
// cutoff date.
const csvOf = (index: number, cutoff: string, shift: number) => {
  const lines: string[] = [];

  weekdays('2017-01-03', '2020-12-31').forEach((date, day) => {
    const period = 45 + 7 * index;
    const cycle = ((day + 11 * index) % period) / period;
    const level =
      100 * (1 + 0.0004 * day) * (cycle < 0.3 ? 1 - (0.16 * cycle) / 0.3 : 0.84 + (0.16 * (cycle - 0.3)) / 0.7);
    const factor = date > cutoff ? shift : 1;

    for (let k = 0; k < 8; k++) {
      const price = (level * (1 + 0.002 * Math.sin(day + k + index)) * factor).toFixed(4);

      lines.push(`"${date}T14:3${k}:00Z",${price},${price},${price},${price},1000`);
    }
  });

  return `${lines.join('\n')}\n`;
};

const writeData = async (dir: string, shift: number, cutoff = '2020-06-30') => {
  await fs.outputFile(path.join(dir, 'partitions.json'), defaultPartitionConfigText);

  for (const [index, symbol] of symbols.entries()) {
    await fs.outputFile(path.join(dir, symbol, 'data.csv'), csvOf(index, cutoff, shift));
  }
};

const smokeTier: Tier = {
  ...tiers.R,
  label: 'smoke',
  stageB: { final: 4, fold: 4, foldQ: 3 },
  stageC: { final: 8, fold: 8, foldQ: 6 },
  discDraws: 4,
  promoDraws: 4,
  promoMembers: 1,
  refineDraws: 4,
  refineCap: { final: 10, fold: 10, foldQ: 6 },
  pruneDraws: 6,
  confirmDraws: 6
};

const smokeBands = [
  { key: 'A1', minBooks: 1, maxBooks: 1, passes: 3 },
  { key: 'A2', minBooks: 2, maxBooks: 3, passes: 6 },
  { key: 'A3', minBooks: 4, maxBooks: 6, passes: 2 }
];

const library = sobolLibrary(64).vectors;

const benchmarks = (): Record<'B1' | 'B4' | 'B5', Book[]> => ({
  B1: [{ symbol: 'VGT', vector: library[0]! }],
  B4: ['KRE', 'VGT', 'XBI', 'XRT'].map((symbol, i) => ({ symbol, vector: library[i + 1]! })),
  B5: ['GDX', 'KRE', 'VGT', 'XBI', 'XRT'].map((symbol, i) => ({ symbol, vector: library[i + 1]! }))
});

const stripVolatile = (text: string) =>
  JSON.stringify(
    JSON.parse(text, (key, value) => (key === 'generatedAt' || key === 'seconds' || key === 'rss' ? undefined : value))
  );

before(async () => {
  root = await fs.mkdtemp(path.join(os.tmpdir(), 'diverse-d1-leakage-'));
  await writeData(path.join(root, 'a'), 1);
  await writeData(path.join(root, 'b'), 1.03);
  await writeData(path.join(root, 'c'), 1.03, '2019-06-30'); // the same shift from inside the search window
});

after(async () => {
  await fs.remove(root);
});

describe('leakage barriers', () => {
  test('the fold door loads nothing after the search end', async () => {
    const loaded = await trainingUniverse('fold-a', { root: path.join(root, 'a'), symbols });

    assert.equal(loaded.universe.end, '2020-06-30');

    for (const instrument of Object.values(loaded.universe.instruments)) {
      assert.ok(instrument.ds.lastDate <= '2020-06-30');
    }

    await assert.rejects(
      loadNUniverse({
        members: ['XBI'],
        partition: 'holdout',
        access: 'optimization',
        warmupSessions: 0,
        root: path.join(root, 'a')
      })
    );
  });

  test('the validation door refuses before the picks exist; the evaluation door refuses without a nominee', async () => {
    await assert.rejects(
      validationUniverse('fold-a', symbols, { root: path.join(root, 'a'), picks: path.join(root, 'none.json') }),
      /does not exist/
    );
    await assert.rejects(evaluationUniverse(symbols, path.join(root, 'none.json')), /does not exist/);
  });

  test('mutation: post-cutoff prices +3% change no archive, promotion, refinement, pruning, assessment or pick', async () => {
    const outputs: Record<string, Record<string, string>> = {};

    for (const variant of ['a', 'b', 'c']) {
      const loaded = await trainingUniverse('fold-a', { root: path.join(root, variant), symbols });
      const out = path.join(root, `out-${variant}`);
      const schedule = buildSchedule(symbols, library, smokeBands);
      const libraryOf = async () => ({ start: 'unseeded' as const, vectors: library, sobol: library, controls: [] });
      const references = floorReferences();
      const search = await searchCore({
        window: 'fold-a',
        loaded,
        universe: symbols,
        tier: smokeTier,
        workers: 0,
        references,
        benchmarks: benchmarks(),
        schedule,
        dir: out,
        library: libraryOf,
        pinLibrary: false
      });
      const picks = await selectCore({
        window: 'fold-a',
        loaded,
        universe: symbols,
        tier: smokeTier,
        workers: 0,
        references,
        benchmarks: benchmarks(),
        arms: search.arms,
        dir: out,
        library: libraryOf,
        capacity: async () => ({ partLot: NaN, partPortfolio: NaN, delayedShare: NaN, fills: 0 }),
        inspectedGrids: new Set(),
        inspectedReferences: []
      });
      const refineFiles = (
        await Promise.all(
          ['J-u', 'T-u', 'Q-u'].map(async (arm) =>
            (await fs.readdir(path.join(out, arm)))
              .filter((name) => name.startsWith('refine-'))
              .sort()
              .map((name) => path.join(arm, name))
          )
        )
      ).flat();

      outputs[variant] = {
        picks: stripVolatile(JSON.stringify(picks)),
        ...Object.fromEntries(
          await Promise.all(
            ['J-u', 'T-u', 'Q-u'].flatMap((arm) => [
              fs
                .readFile(path.join(out, arm, 'archive.jsonl'), 'utf8')
                .then((text) => [`${arm} archive`, text] as const),
              fs
                .readFile(path.join(out, arm, 'promotion.json'), 'utf8')
                .then((text) => [`${arm} promotion`, stripVolatile(text)] as const),
              fs
                .readFile(path.join(out, arm, 'assessment.json'), 'utf8')
                .then((text) => [`${arm} assessment`, stripVolatile(text)] as const)
            ])
          )
        ),
        ...Object.fromEntries(
          await Promise.all(
            refineFiles.map(
              async (file) => [file, stripVolatile(await fs.readFile(path.join(out, file), 'utf8'))] as const
            )
          )
        )
      };
    }

    assert.ok(
      Object.keys(outputs.a!).some((key) => key.includes('refine-')),
      'the fixture reaches refinement and pruning'
    );

    for (const key of Object.keys(outputs.a!)) {
      assert.ok(outputs.a![key]!.length > 0, key);
      assert.equal(outputs.a![key], outputs.b![key], `${key} differs after a post-cutoff price change`);
    }

    // Sensitivity inside the window: the same shift before the cutoff does change the archives.
    assert.notEqual(outputs.a!['J-u archive'], outputs.c!['J-u archive'], 'a pre-cutoff change is visible');

    // Sensitivity without the truncation: the post-cutoff mutation is visible, so the comparison can detect a leak.
    const nets: number[] = [];

    for (const variant of ['a', 'b']) {
      const loaded = await loadNUniverse({
        members: symbols,
        partition: 'training',
        access: 'optimization',
        warmupSessions: 0,
        endDate: '2020-12-31',
        root: path.join(root, variant)
      });
      const evaluator = await RobustEvaluator.create(loaded, 'diverse-d1:fold-a', 0);
      const configs = library.slice(0, 24).map((vector, i) => [{ symbol: symbols[i % symbols.length]!, vector }]);

      nets.push((await evaluator.centres(configs, 5)).reduce((total, e) => total + e.net, 0));
      await evaluator.close();
    }

    assert.notEqual(nets[0], nets[1], 'an untruncated load sees the mutation');
  });
});
