// The temporal leakage barriers (PROTOCOL.md §13.5) through the REAL loader on fixture CSVs in a temporary data
// directory: the fold door physically truncates at the search end; the validation door refuses before PICKS.json;
// trace keys differ across windows; and the mutation test — the same fold round run twice on data whose bars after
// the search end differ by +3% — gives byte-identical pilot records, discovery archives and picks.
import assert from 'node:assert/strict';
import os from 'node:os';
import path from 'node:path';
import { after, before, describe, test } from 'node:test';
import fs from 'fs-extra';
import { defaultPartitionConfigText } from '#lib';
import { loadNUniverse } from '../../portfolio-aware-d1/nbook/universe.ts';
import { traceKey, traceSettings } from '../../portfolio-aware-d1/trace.ts';
import { type Tier, tiers } from '../context.ts';
import { trainingUniverse, validationUniverse } from '../data.ts';
import { phenotypeOf } from '../evaluate.ts';
import { RobustEvaluator, traceWindowOf } from '../evaluator.ts';
import { Library } from '../genome.ts';
import { sobolLibrary } from '../library.ts';
import type { Book } from '../neighbourhood.ts';
import { runPilot } from '../pilot.ts';
import { runRound, writePicks } from '../round.ts';
import { floorReferences } from '../stats.ts';

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

// Minute rows: eight bars from 14:30 UTC, a price path with repeated declines and recoveries; `shift` multiplies every
// price after the cutoff date.
const csvOf = (symbol: string, index: number, cutoff: string, shift: number) => {
  const lines: string[] = [];

  weekdays('2019-01-02', '2020-12-31').forEach((date, day) => {
    const cycle = ((day + 11 * index) % (50 + 6 * index)) / (50 + 6 * index);
    const level =
      100 * (1 + 0.0005 * day) * (cycle < 0.3 ? 1 - (0.15 * cycle) / 0.3 : 0.85 + (0.15 * (cycle - 0.3)) / 0.7);
    const factor = date > cutoff ? shift : 1;

    for (let k = 0; k < 8; k++) {
      const price = (level * (1 + 0.002 * Math.sin(day + k + index)) * factor).toFixed(4);

      lines.push(`"${date}T14:3${k}:00Z",${price},${price},${price},${price},1000`);
    }
  });

  return `${lines.join('\n')}\n`;
};

const writeData = async (dir: string, shift: number) => {
  await fs.outputFile(path.join(dir, 'partitions.json'), defaultPartitionConfigText);

  for (const [index, symbol] of symbols.entries()) {
    await fs.outputFile(path.join(dir, symbol, 'data.csv'), csvOf(symbol, index, '2020-06-30', shift));
  }
};

const smokeTier: Tier = {
  ...tiers.F,
  key: 'R',
  label: 'smoke',
  nDiscoveryCandidates: [4],
  promotionDraws: 4,
  refineDraws: 4,
  confirmDraws: 6,
  pilotPerStratum: 1
};

const libraryBooks = (): Record<'B1' | 'B4' | 'B5', Book[]> => {
  const library = new Library(sobolLibrary(16).vectors);

  return {
    B1: [{ symbol: 'VGT', vector: library.vectors[0]! }],
    B4: ['KRE', 'VGT', 'XBI', 'XRT'].map((symbol, i) => ({ symbol, vector: library.vectors[i + 1]! })),
    B5: ['GDX', 'KRE', 'VGT', 'XBI', 'XRT'].map((symbol, i) => ({ symbol, vector: library.vectors[i + 1]! }))
  };
};

before(async () => {
  root = await fs.mkdtemp(path.join(os.tmpdir(), 'robust-d1-leakage-'));
  await writeData(path.join(root, 'a'), 1);
  await writeData(path.join(root, 'b'), 1.03);
});

after(async () => {
  await fs.remove(root);
});

describe('leakage barriers', () => {
  test('the fold door loads nothing after the search end; other partitions are refused to the optimizer', async () => {
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

  test('the validation door refuses before the picks exist', async () => {
    await assert.rejects(
      validationUniverse('fold-a', symbols, { root: path.join(root, 'a'), picks: path.join(root, 'none.json') }),
      /does not exist/
    );
  });

  test('trace keys differ across windows', async () => {
    const a = await trainingUniverse('fold-a', { root: path.join(root, 'a'), symbols });
    const b = await loadNUniverse({
      members: symbols,
      partition: 'training',
      access: 'optimization',
      warmupSessions: 0,
      endDate: '2020-12-31',
      root: path.join(root, 'a')
    });
    const book = { symbol: 'XBI', vector: sobolLibrary(1).vectors[0]! };
    const settings = traceSettings(5);

    assert.notEqual(
      traceKey(a.universe.instruments.XBI!.ds, phenotypeOf(book), settings, traceWindowOf(a)),
      traceKey(b.universe.instruments.XBI!.ds, phenotypeOf(book), settings, traceWindowOf(b))
    );
  });

  test('mutation: post-cutoff prices +3% change no pilot record, archive or pick', async () => {
    const outputs: Record<string, Record<string, string>> = {};

    for (const variant of ['a', 'b']) {
      const loaded = await trainingUniverse('fold-a', { root: path.join(root, variant), symbols });
      const evaluator = await RobustEvaluator.create(loaded, 'fold-a', 0);
      const out = path.join(root, `out-${variant}`);
      const bench = libraryBooks();

      try {
        // The toy fixture may fail the shareAbove machinery check (too few eligible controls); its records are written
        // before the check, which is all this test compares.
        await runPilot(evaluator, 'fold-a', symbols, smokeTier, bench, path.join(out, 'pilot')).catch(
          (error: Error) => {
            if (!/machinery checks failed/.test(error.message)) {
              throw error;
            }
          }
        );

        const outcome = await runRound(
          evaluator,
          loaded,
          {
            round: 'fold-a',
            tier: smokeTier,
            universe: symbols,
            benchmarks: bench,
            outDir: out,
            smoke: { budget: 120, islandCap: 8, promotionTop: 8, refineCap: 8, families: 1 },
            capacity: async () => ({ partLot: NaN, partPortfolio: NaN, delayedShare: NaN, fills: 0 })
          },
          { window: 'fold-a', references: floorReferences(), discoveryDraws: 4, bodyHash: 'mutation' }
        );
        const picks = await writePicks(path.join(out, 'PICKS.json'), 'fold-a', outcome, {});
        const { frozenAt, bodyHash, ...body } = picks as Record<string, unknown>;

        void frozenAt;
        void bodyHash;
        outputs[variant] = {
          pilot: await fs.readFile(path.join(out, 'pilot', 'controls.jsonl'), 'utf8'),
          J: await fs.readFile(path.join(out, 'J', 'discovery.jsonl'), 'utf8'),
          Q: await fs.readFile(path.join(out, 'Q', 'discovery.jsonl'), 'utf8'),
          picks: JSON.stringify({ ...body, frozenAt: undefined })
        };
      } finally {
        await evaluator.close();
      }
    }

    for (const key of ['pilot', 'J', 'Q', 'picks']) {
      assert.ok(outputs.a![key]!.length > 0);
      assert.equal(outputs.a![key], outputs.b![key], `${key} differs after a post-cutoff price change`);
    }

    // Sensitivity: without the truncation the same mutation does change results, so the comparison can detect a leak.
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
      const evaluator = await RobustEvaluator.create(loaded, 'fold-a', 0);
      const library = new Library(sobolLibrary(64).vectors);
      const configs = library.vectors
        .slice(0, 32)
        .map((vector, i) => [{ symbol: symbols[i % symbols.length]!, vector }]);

      nets.push((await evaluator.centres(configs, 5)).reduce((total, e) => total + e.net, 0));
      await evaluator.close();
    }

    assert.notEqual(nets[0], nets[1], 'an untruncated load sees the mutation');
  });
});
