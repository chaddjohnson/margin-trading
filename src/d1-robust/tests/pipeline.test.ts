// An end-to-end smoke test of the study's machinery on a synthetic ten-symbol universe with small budgets: the
// worker pool and the in-process runner give byte-identical results; the pilot runs its classes and machinery checks
// and freezes its constants once; a fold round runs discovery (arms J and Q), promotion, refinement, assessment and
// the gates and writes PICKS.json once; the J ranking key is the risk-aware score, never the centre net; a second run
// reproduces the archive byte for byte. Synthetic prices: mechanics and determinism only.
import assert from 'node:assert/strict';
import os from 'node:os';
import path from 'node:path';
import { after, before, describe, test } from 'node:test';
import fs from 'fs-extra';
import { Archive, compareEntries } from '../archive.ts';
import { runDiscovery } from '../discovery.ts';
import { RobustEvaluator } from '../evaluator.ts';
import { readSealed } from '../freeze.ts';
import { GenomeSpace } from '../genome.ts';
import { runPilot } from '../pilot.ts';
import { runRound, writePicks } from '../round.ts';
import { floorReferences } from '../stats.ts';
import { benchmarks, libraryOf, noCapacity, smokeTier, symbols, synthetic } from './synthetic.ts';

let dir = '';

before(async () => {
  dir = await fs.mkdtemp(path.join(os.tmpdir(), 'robust-d1-pipeline-'));
});

after(async () => {
  await fs.remove(dir);
});

describe('the study pipeline on a synthetic universe', () => {
  test('the worker pool equals the in-process runner, result for result', async () => {
    const loaded = synthetic();
    const library = libraryOf();
    const space = new GenomeSpace(symbols, library);
    const rng = (await import('../../optimizer/rng.ts')).Rng.from('test', 'pool');
    const configs = Array.from({ length: 24 }, () => space.booksOf(space.uniform(rng, 1, 6)));
    const local = await RobustEvaluator.create(loaded, 'fold-a', 0);
    const pool = await RobustEvaluator.create(loaded, 'fold-a', 2);
    const spec = { stage: 'disc', cls: 'N1' as const, n: 5, costBps: 5 };

    try {
      assert.equal(JSON.stringify(await pool.centres(configs, 5)), JSON.stringify(await local.centres(configs, 5)));
      assert.equal(
        JSON.stringify(await pool.neighbourRecords(configs, spec)),
        JSON.stringify(await local.neighbourRecords(configs, spec))
      );
    } finally {
      await pool.close();
      await local.close();
    }
  });

  test('the J ranking is the risk-aware score: a higher centre net with a lower score ranks below', () => {
    const base = {
      seq: 1,
      arm: 'J' as const,
      meta: { stage: 'D', source: 'x', generation: 0, operator: 'init' },
      config: [],
      feasible: true,
      violation: 0,
      q: 0
    };
    const high = { ...base, key: 'a', e: { net: 500000, minuteDrawdown: 20000 }, rankValue: 100000, nb: { q25: 0 } };
    const low = { ...base, key: 'b', e: { net: 100000, minuteDrawdown: 20000 }, rankValue: 150000, nb: { q25: 0 } };

    assert.ok(compareEntries(low as never, high as never) < 0, 'the configuration with the higher score ranks first');
  });

  test('pilot, a fold round, and PICKS.json, deterministic across two runs', async () => {
    const loaded = synthetic();
    const library = libraryOf();
    const bench = benchmarks(library);
    const evaluator = await RobustEvaluator.create(loaded, 'fold-a', 2);

    try {
      const pilot = await runPilot(evaluator, 'fold-a', symbols, smokeTier, bench, path.join(dir, 'pilot'));

      assert.ok(pilot.summary.passed);
      await assert.rejects(
        runPilot(evaluator, 'fold-a', symbols, smokeTier, bench, path.join(dir, 'pilot')),
        /frozen once/
      );

      const freeze = await readSealed(path.join(dir, 'pilot', 'pilot_freeze.json'));

      assert.ok([4, 6].includes(freeze.discoveryDraws as number));

      const runOnce = async (out: string) =>
        runRound(
          evaluator,
          loaded,
          {
            round: 'fold-a',
            tier: smokeTier,
            universe: symbols,
            benchmarks: bench,
            outDir: out,
            smoke: { budget: 160, islandCap: 12, promotionTop: 12, refineCap: 12, families: 2 },
            capacity: noCapacity
          },
          { window: 'fold-a', references: floorReferences(), discoveryDraws: 4, bodyHash: 'smoke' }
        );
      const first = await runOnce(path.join(dir, 'round-1'));
      const second = await runOnce(path.join(dir, 'round-2'));

      for (const arm of ['J', 'Q']) {
        assert.equal(
          await fs.readFile(path.join(dir, 'round-1', arm, 'discovery.jsonl'), 'utf8'),
          await fs.readFile(path.join(dir, 'round-2', arm, 'discovery.jsonl'), 'utf8'),
          `arm ${arm}: two runs log the same evaluations`
        );
      }

      assert.ok(first.archives.J!.size > 0 && first.archives.Q!.size > 0);
      assert.deepEqual(Object.keys(first.results).sort(), ['J', 'Q']);

      for (const entry of first.archives.J!.entries.values()) {
        assert.equal(entry.rankValue, entry.feasible ? entry.score!.s : -Infinity);
      }

      const picks = path.join(dir, 'PICKS.json');

      await writePicks(picks, 'fold-a', first, { note: 'smoke' });
      await assert.rejects(writePicks(picks, 'fold-a', second, { note: 'smoke' }), /frozen once/);
      assert.ok((await readSealed(picks)).bodyHash);
    } finally {
      await evaluator.close();
    }
  });

  test('a discovery budget is respected and coverage top-up islands contain their symbol', async () => {
    const loaded = synthetic();
    const library = libraryOf();
    const evaluator = await RobustEvaluator.create(loaded, 'fold-a', 0);
    const archive = new Archive(evaluator, {
      arm: 'Q',
      round: 'fold-a',
      draws: 0,
      stage: 'disc',
      references: floorReferences()
    });

    try {
      const result = await runDiscovery({
        space: new GenomeSpace(symbols, library),
        archive,
        round: 'fold-a',
        armLabel: 'fold',
        budget: 200,
        tier: 'R',
        smoke: { islandCap: 10 }
      });

      for (const island of result.islands) {
        assert.ok(island.freshEvaluations <= 10, `${island.key} exceeded its cap`);
      }

      for (const entry of archive.entries.values()) {
        if (entry.meta.source.startsWith('topup:')) {
          assert.ok(entry.config.some((book) => book.symbol === entry.meta.source.slice(6)));
        }
      }
    } finally {
      await evaluator.close();
    }
  });
});
