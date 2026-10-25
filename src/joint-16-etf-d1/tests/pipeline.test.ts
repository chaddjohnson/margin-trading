// An end-to-end smoke test of the training search on a synthetic 16-ETF universe with small budgets: discovery
// (greedy paths and eight islands), contenders and refinement, the shortlist battery with gates and nominations, the
// nominees' full-engine confirmation and the coverage summary — mechanics and determinism only (synthetic prices).
import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import type { MarketSession } from '#types';
import { fixtureDataset } from '../../four-family/data.ts';
import { assembleUniverse } from '../../multi-etf-allocator/data.ts';
import { type SessionSpec, buildSession, dateOf, flat } from '../../multi-etf-allocator/tests/fixtures.ts';
import type { NUniverse } from '../../portfolio-aware-d1/nbook/engine.ts';
import type { LoadedUniverse } from '../../portfolio-aware-d1/nbook/universe.ts';
import { Archive, booksOfEntry } from '../archive.ts';
import { searchBenchmarkBooks } from '../benchmarks.ts';
import { universe } from '../context.ts';
import { coverageOf } from '../coverage.ts';
import { runDiscovery } from '../discovery.ts';
import { JointEvaluator } from '../evaluator.ts';
import { Library } from '../genome.ts';
import { refineContender, selectContenders } from '../refine.ts';
import { buildShortlist, confirmNominees, rollingOrigin, runShortlist } from '../robust.ts';
import { sobolLibrary } from '../space.ts';

// A drawdown of `depth` over `days` sessions from 100, then a recovery, starting at `start`.
const path = (sessions: number, start: number, depth: number, days: number): SessionSpec[] =>
  Array.from({ length: sessions }, (_, day) => {
    const t = day - start;
    const level =
      t < 0 ? 100 : t < days ? 100 * (1 - (depth * t) / days) : 100 * (1 - depth) * (1 + 0.004 * (t - days));
    const next = t + 1 < 0 ? 100 : t + 1 < days ? 100 * (1 - (depth * (t + 1)) / days) : level * 1.004;

    return { closes: Array.from({ length: 8 }, (_, k) => level + ((next - level) * (k + 1)) / 8) };
  });

const synthetic = (): LoadedUniverse => {
  const sessions = 90;
  const instruments: Record<
    string,
    { symbol: string; file: string; hash: string; ds: ReturnType<typeof fixtureDataset> }
  > = {};
  let end = '';

  universe.forEach((symbol, index) => {
    const specs =
      index === 8
        ? Array.from({ length: sessions }, () => flat(100, 8))
        : path(sessions, 25 + 3 * (index % 7), 0.08 + 0.015 * (index % 9), 4 + (index % 5));
    const built: MarketSession[] = specs.map((spec, day) => buildSession(dateOf(day), spec));
    const ds = fixtureDataset(built);

    ds.id = `fixture-${symbol}`;
    instruments[symbol] = { symbol, file: 'fixture', hash: 'fixture', ds };
    end = built.at(-1)!.date;
  });

  const assembled = assembleUniverse(instruments as never, [], end, {}, dateOf(0));

  return {
    partition: 'training',
    access: 'optimization',
    universe: { ...assembled, instruments } as unknown as NUniverse,
    warmup: 0,
    windows: {},
    splits: [],
    distributions: { file: '', sha256: '', coverage: { VGT: '', VOOG: '' }, covered: true, adjusted: [] }
  };
};

const periodsOf = (loaded: LoadedUniverse) => {
  const dates = loaded.universe.dates;
  const third = Math.floor(dates.length / 3);
  const periods = [
    { key: 'A', label: 'A', start: dates[0]!, end: dates[third]! },
    { key: 'B', label: 'B', start: dates[third + 1]!, end: dates[2 * third]! },
    { key: 'C', label: 'C', start: dates[2 * third + 1]!, end: dates.at(-1)! }
  ];

  return { folds: periods, regimes: periods, years: periods };
};

const limits = { islandEvaluations: 640, contenderEvaluations: 120, jointPerturbations: 3 };

const discover = async () => {
  const loaded = synthetic();
  const evaluator = new JointEvaluator(loaded, 2000, periodsOf(loaded));
  const vectors = sobolLibrary(40).vectors.map((vector) => ({
    ...vector,
    grid: { ...vector.grid, tickWindowSize: 20 + (vector.grid.tickWindowSize % 10) }
  }));
  const library = new Library(vectors.map((vector, index) => ({ ...vector, id: `${vector.id}-${index}` })));
  const archive = new Archive(evaluator);
  const ctx = { library, archive, benchmarks: await searchBenchmarkBooks(), limits };
  const discovery = runDiscovery(ctx);

  return { loaded, evaluator, ctx, archive, discovery };
};

describe('the training search on a synthetic universe', () => {
  test('runs end to end within its budgets, deterministically', async () => {
    const first = await discover();
    const second = await discover();
    const keysOf = (archive: Archive) => [...archive.entries.keys()].join('\n');

    assert.equal(keysOf(first.archive), keysOf(second.archive), 'two runs evaluate the same keys in the same order');

    for (const island of first.discovery.islands) {
      assert.ok(island.freshEvaluations <= limits.islandEvaluations, `${island.key} exceeded its budget`);
    }

    assert.equal(first.discovery.paths.length, 16);
    assert.ok(first.archive.size > 16 * 8);

    const entries = [...first.archive.entries.values()];
    const contenders = selectContenders(entries);

    assert.ok(contenders.length > 0);

    const refined = contenders.map((contender) => refineContender(first.ctx, contender));

    for (const run of refined) {
      assert.ok(run.freshEvaluations <= limits.contenderEvaluations);
    }

    const all = [...first.archive.entries.values()];
    const shortlist = buildShortlist(all, refined, (key) => first.archive.get(key)!);
    const outcome = runShortlist(
      first.evaluator,
      first.loaded,
      shortlist,
      first.ctx.benchmarks,
      limits.jointPerturbations
    );

    assert.equal(outcome.batteries.length, shortlist.length + 3);

    for (const item of outcome.gated) {
      assert.equal(item.battery.full.fixedParityDifferences, 0, `${item.battery.label}: replay ≠ full engine`);
      assert.ok(item.battery.ties.identityEqual, `${item.battery.label}: alphabetical aliases ≠ canonical`);
      assert.ok(Number.isFinite(item.outcome.score));
    }

    const confirmations = confirmNominees(
      first.evaluator,
      first.loaded,
      shortlist.slice(0, 1).map((item) => ({ role: 'test', books: booksOfEntry(item.entry) }))
    );

    assert.ok(Object.values(confirmations[0]!.runs).every((run) => (run.parityDifferences ?? 0) === 0));

    const coverage = coverageOf(all);

    assert.equal(coverage.perEtf.length, 16);
    assert.ok(coverage.perEtf.every((row) => row.appearances > 0));
    assert.ok(Number.isFinite(rollingOrigin(all).configurations));
  });
});
