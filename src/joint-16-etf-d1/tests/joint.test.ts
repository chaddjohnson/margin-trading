// The joint 16-ETF study on synthetic data: genome keys and operators; the evaluator's replay equal to the N-book
// engine on mixed memberships (no VGT, a single non-VGT book, VOOG as a book, a VGT book beside the core); the tie-order
// aliases (identity = canonical, reversal flips a contested same-minute grant); lookahead immunity in a multi-book
// subset; the VOOG core/lot separation and distributions in portfolio mode; the archive's dedup; the data doors and the
// write-once freezes.
import assert from 'node:assert/strict';
import os from 'node:os';
import path from 'node:path';
import { after, before, describe, test } from 'node:test';
import fs from 'fs-extra';
import type { MarketSession } from '#types';
import { fixtureDataset } from '../../four-family/data.ts';
import { assembleUniverse } from '../../multi-etf-allocator/data.ts';
import {
  type SessionSpec,
  buildSession,
  dateOf,
  dipSession,
  flat,
  testGrid
} from '../../multi-etf-allocator/tests/fixtures.ts';
import { Rng } from '../../optimizer/rng.ts';
import { compareValues, outputsOf } from '../../portfolio-aware-d1/compare.ts';
import { type NUniverse, baseNRunConfig, runNAllocator } from '../../portfolio-aware-d1/nbook/engine.ts';
import type { LoadedUniverse } from '../../portfolio-aware-d1/nbook/universe.ts';
import { replayFixedPool } from '../../portfolio-aware-d1/replay.ts';
import type { Distribution } from '../../shared-margin-portfolio/data.ts';
import { Archive } from '../archive.ts';
import { universe as etfs } from '../context.ts';
import { benchmarkUniverse, evaluationUniverse } from '../data.ts';
import { type Book, JointEvaluator, canonicalBooks, keyOf, tieAliases } from '../evaluator.ts';
import { freezeProtocol, readVerifiedSelection, writeSelectionManifest } from '../freeze.ts';
import {
  Library,
  applyOperator,
  booksOf,
  crossover,
  genomeKey,
  jaccardDistance,
  mutateVector,
  repair,
  uniformGenome
} from '../genome.ts';
import { portfolioChecks } from '../parity.ts';
import { type Vector, box, inBox, sobolLibrary } from '../space.ts';
import type { IntParams } from '../../d1-refinement/families.ts';

const flats = (count: number, price = 100, bars = 6): SessionSpec[] =>
  Array.from({ length: count }, () => flat(price, bars));

const loadedOf = (specs: Record<string, SessionSpec[]>, distributions: Distribution[] = []): LoadedUniverse => {
  const instruments: Record<
    string,
    { symbol: string; file: string; hash: string; ds: ReturnType<typeof fixtureDataset> }
  > = {};
  let end = '';

  for (const [symbol, sessions] of Object.entries(specs)) {
    const built: MarketSession[] = sessions.map((spec, day) => buildSession(dateOf(day), spec));
    const ds = fixtureDataset(built);

    ds.id = `fixture-${symbol}`;
    instruments[symbol] = { symbol, file: 'fixture', hash: 'fixture', ds };
    end = built.at(-1)!.date;
  }

  const assembled = assembleUniverse(instruments as never, distributions, end, {}, dateOf(0));

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

const whole = (loaded: LoadedUniverse) => {
  const dates = loaded.universe.dates;
  const period = [{ key: 'P', label: 'all', start: dates[0]!, end: dates.at(-1)! }];

  return { folds: period, regimes: period, years: period };
};

const vector = (grid: Partial<typeof testGrid> = {}, id = 'test'): Vector => ({
  id,
  grid: { ...testGrid, ...grid } as Vector['grid'],
  origin: 'test'
});

const book = (symbol: string, v: Vector = vector()): Book => ({ symbol, vector: v });

// XBI and XRT dip in the same minute of session 3 (a contested same-minute decision), GDX dips on session 7 and VOOG
// on session 9; VGT never dips.
const mixed = (distributions: Distribution[] = []) =>
  loadedOf(
    {
      VOOG: [...flats(9), dipSession(), ...flats(2, 92)],
      VGT: flats(12),
      XBI: [...flats(3), dipSession(), ...flats(8, 95)],
      XRT: [...flats(3), dipSession(), ...flats(8, 96)],
      KRE: flats(12),
      GDX: [...flats(7), dipSession(), ...flats(4, 99)]
    },
    distributions
  );

const engineFixed = (loaded: LoadedUniverse, evaluator: JointEvaluator, books: Book[], costBps = 0) => {
  const canonical = canonicalBooks(books);

  return runNAllocator(
    {
      ...loaded.universe,
      instruments: Object.fromEntries(canonical.map((item) => [item.symbol, loaded.universe.instruments[item.symbol]!]))
    },
    baseNRunConfig({
      key: 'test',
      label: 'test',
      mode: 'fixed',
      symbols: canonical.map((item) => item.symbol),
      phenotypes: Object.fromEntries(canonical.map((item) => [item.symbol, evaluator.phenotype(item)])),
      costBps,
      eligibilityIndex: loaded.universe.eligibilityIndex,
      accountingStartIndex: 0
    })
  );
};

describe('the genome', () => {
  const library = new Library(sobolLibrary(64).vectors);

  test('keys are canonical: member order does not matter, latent vectors do not count', () => {
    const v = library.vectors[0]!;
    const w = library.vectors[1]!;

    assert.equal(keyOf([book('XBI', v), book('EWZ', w)]), keyOf([book('EWZ', w), book('XBI', v)]));

    const genome = uniformGenome(library, Rng.from('test', 'key'), 3, 3);
    const other = {
      mask: [...genome.mask],
      vectors: genome.vectors.map((item, index) => (genome.mask[index] ? item : w))
    };

    assert.equal(genomeKey(genome), genomeKey(other));
    assert.equal(booksOf(genome).length, 3);
  });

  test('operators keep every vector on the box grid and a nonempty mask; mutation changes a gene', () => {
    const rng = Rng.from('test', 'operators');

    for (let index = 0; index < 400; index++) {
      const a = uniformGenome(library, rng, 1, 16);
      const b = uniformGenome(library, rng, 1, 16);
      const [child] = crossover(a, b, rng);

      repair(child, [a, b], rng);
      applyOperator(
        child,
        (['add', 'remove', 'swap', 'paramOne', 'paramMulti', 'reset'] as const)[index % 6]!,
        library,
        rng
      );
      assert.ok(child.mask.some(Boolean));

      for (const item of child.vectors) {
        assert.ok(inBox(item.grid as IntParams), JSON.stringify(item.grid));
      }
    }

    const original = library.vectors[5]!;
    const mutated = mutateVector(original, rng, 'test');

    assert.notEqual(mutated.id, original.id);
    assert.ok(
      box.some(
        (spec) => mutated.grid[spec.key as keyof Vector['grid']] !== original.grid[spec.key as keyof Vector['grid']]
      )
    );
  });

  test('crossover exchanges (membership bit, vector) pairs per ETF', () => {
    const rng = Rng.from('test', 'crossover');
    const a = uniformGenome(library, rng, 8, 8);
    const b = uniformGenome(library, rng, 8, 8);
    const [first, second] = crossover(a, b, rng);

    const same = (x: typeof a, y: typeof a, index: number) =>
      x.mask[index] === y.mask[index] && x.vectors[index] === y.vectors[index];

    for (let index = 0; index < etfs.length; index++) {
      if (!(a.mask[index] && b.mask[index])) {
        assert.ok(
          (same(first, a, index) && same(second, b, index)) || (same(first, b, index) && same(second, a, index)),
          `ETF ${etfs[index]}: the children's pairs are not the parents' pairs exchanged`
        );
      } else {
        assert.ok(first.mask[index] && second.mask[index]);
      }
    }
  });

  test('membership distance', () => {
    assert.equal(jaccardDistance(['A', 'B'], ['A', 'B']), 0);
    assert.equal(jaccardDistance(['A', 'B'], ['C']), 1);
    assert.equal(jaccardDistance(['A', 'B'], ['B', 'C']), 1 - 1 / 3);
  });
});

describe('the evaluator on mixed memberships', () => {
  test('the replay equals the N-book engine field for field without VGT, with one non-VGT book, with VOOG as a book', () => {
    const loaded = mixed();
    const evaluator = new JointEvaluator(loaded, 100, whole(loaded));
    const cases: Book[][] = [
      [book('GDX')],
      [book('VOOG')],
      [book('XBI'), book('XRT'), book('GDX')],
      [book('VGT'), book('VOOG'), book('KRE'), book('GDX'), book('XRT')]
    ];

    for (const books of cases) {
      for (const costBps of [0, 5, 10]) {
        const full = engineFixed(loaded, evaluator, books, costBps);
        const replay = evaluator.replay(books, costBps, true);
        const differences = compareValues(outputsOf(full), replay.full, { maxDifferences: 5 });

        assert.deepEqual(differences, [], `${keyOf(books)} at ${costBps} bps`);
        assert.equal(
          full.lots.reduce((total, lot) => total + lot.net, 0),
          replay.net
        );
      }
    }
  });

  test('tie order through aliases: alphabetical = canonical; reversed flips the contested grant', () => {
    const loaded = mixed();
    const evaluator = new JointEvaluator(loaded, 100, whole(loaded));
    const books = [book('XBI'), book('XRT')];
    const canonical = evaluator.evaluate(books, 0);
    const identity = evaluator.evaluate(books, 0, ['XBI', 'XRT']);
    const reversed = evaluator.evaluate(books, 0, ['XRT', 'XBI']);

    assert.equal(canonical.evaluation.contested, 1);
    assert.equal(canonical.evaluation.lotsBySymbol.XBI, 1);
    assert.equal(identity.evaluation.net, canonical.evaluation.net);
    assert.deepEqual(identity.evaluation.lotsBySymbol, canonical.evaluation.lotsBySymbol);
    assert.equal(reversed.evaluation.lotsBySymbol.XRT, 1);
    assert.equal(reversed.evaluation.lotsBySymbol.XBI, 0);
    assert.ok(tieAliases(['XRT', 'XBI']).get('XRT')! < tieAliases(['XRT', 'XBI']).get('XBI')!);
  });

  test('lookahead immunity: a later exit price or time changes no earlier decision in a multi-book subset', () => {
    // XBI dips on session 3, rises to 100 (its 5% stop becomes active) and gaps to 94 on session 6 (stopped out); XRT
    // dips on session 4 while XBI is held (refused); GDX dips on session 8 and VOOG on session 9.
    const loaded = loadedOf({
      VOOG: [...flats(9), dipSession(), ...flats(3, 92)],
      XBI: [...flats(3), dipSession(), ...flats(2, 100), ...flats(7, 94)],
      XRT: [...flats(4), dipSession(), ...flats(8, 90)],
      GDX: [...flats(8), dipSession(), ...flats(4, 99)]
    });
    const evaluator = new JointEvaluator(loaded, 100, whole(loaded));
    const books = [book('XBI'), book('XRT'), book('GDX'), book('VOOG')];
    const replayBooks = evaluator.replayBooks(books, 0);
    const config = {
      symbols: replayBooks.map((item) => item.symbol),
      startIndex: 0,
      endIndex: loaded.universe.sessionCount - 1,
      principal: 100000,
      rate: 0.11,
      costBps: 0,
      stopSlippageBps: 0,
      detail: true
    };
    const base = replayFixedPool(replayBooks, config);
    const first = base.lots[0]!;
    const owner = replayBooks.find((item) => item.symbol === first.symbol)!;
    const trade = owner.trace.trades[first.tradeId - 1]!;
    const altered = (change: (copy: typeof trade) => void) =>
      replayFixedPool(
        replayBooks.map((item) =>
          item === owner
            ? {
                ...item,
                trace: {
                  ...item.trace,
                  trades: item.trace.trades.map((other) => {
                    if (other !== trade) {
                      return other;
                    }

                    const copy = { ...other };

                    change(copy);
                    return copy;
                  })
                }
              }
            : item
        ),
        config
      );
    const decisionsBefore = (result: ReturnType<typeof replayFixedPool>) =>
      result
        .full!.signals.filter((signal) => signal.decisionTime < trade.exitTime)
        .map((signal) => `${signal.symbol}@${signal.decisionTime}:${signal.outcome}`);

    const cheaper = altered((copy) => {
      copy.exitRawPrice *= 0.5;
      copy.net -= 50000;
    });
    const later = altered((copy) => {
      copy.exitIndex = Math.min(copy.exitIndex + 2, loaded.universe.sessionCount - 1);
    });

    assert.ok(decisionsBefore(base).length > 0);
    assert.deepEqual(decisionsBefore(cheaper), decisionsBefore(base));
    assert.deepEqual(decisionsBefore(later), decisionsBefore(base));
  });

  test('the trace cache never crosses symbols or cost levels', () => {
    const loaded = mixed();
    const evaluator = new JointEvaluator(loaded, 100, whole(loaded));
    const v = vector();
    const a = evaluator.trace(book('XBI', v), 0);
    const b = evaluator.trace(book('XRT', v), 0);
    const c = evaluator.trace(book('XBI', v), 5);

    assert.notEqual(a.key, b.key);
    assert.notEqual(a.key, c.key);
    assert.equal(evaluator.trace(book('XBI', v), 0), a);
    assert.equal(c.settings.costBps, 5);
  });

  test('the archive evaluates a key once; a repeat is a cache hit outside every budget', () => {
    const loaded = mixed();
    const evaluator = new JointEvaluator(loaded, 100, whole(loaded));
    const archive = new Archive(evaluator);
    const meta = { stage: 'D', source: 'test', generation: 0, operator: 'test' };
    const first = archive.evaluate([book('XBI'), book('GDX')], meta);
    const second = archive.evaluate([book('GDX'), book('XBI')], meta);

    assert.ok(first.fresh);
    assert.ok(!second.fresh);
    assert.equal(archive.newCount('test'), 1);
    assert.equal(archive.hits, 1);
  });
});

describe('the portfolio with VOOG and VGT as books beside the core', () => {
  test('core and lot shares of the same ticker stay separate; VOOG lots receive no distribution', () => {
    const distributions: Distribution[] = [
      { etf: 'VOOG', exDate: dateOf(11), payDate: dateOf(12), amount: 0.5 } as Distribution,
      { etf: 'VGT', exDate: dateOf(4), payDate: dateOf(5), amount: 0.25 } as Distribution
    ];
    // VGT dips on session 3 and is stopped out on session 6 (as XBI above); VOOG dips on session 9 and is held across
    // the ex-date of session 11.
    const loaded = loadedOf(
      {
        VOOG: [...flats(9), dipSession(), ...flats(3, 92)],
        VGT: [...flats(3), dipSession(), ...flats(2, 100), ...flats(7, 94)]
      },
      distributions
    );
    const evaluator = new JointEvaluator(loaded, 100, whole(loaded));
    const books = [book('VOOG'), book('VGT')];
    const canonical = canonicalBooks(books);
    const run = (mode: 'fixed' | 'portfolio') =>
      runNAllocator(
        loaded.universe,
        baseNRunConfig({
          key: 'test',
          label: 'test',
          mode,
          symbols: canonical.map((item) => item.symbol),
          phenotypes: Object.fromEntries(canonical.map((item) => [item.symbol, evaluator.phenotype(item)])),
          costBps: 5,
          initial: { voog: 180000, vgt: 120000 },
          eligibilityIndex: loaded.universe.eligibilityIndex,
          accountingStartIndex: 0
        })
      );
    const fixed = run('fixed');
    const portfolio = run('portfolio');
    const checks = portfolioChecks(fixed, portfolio);

    assert.deepEqual(checks.problems, []);
    assert.ok(
      portfolio.lots.some((lot) => lot.symbol === 'VOOG'),
      'a VOOG lot is funded'
    );
    assert.ok(checks.voogLotDays > 0);
    assert.ok(!portfolio.dividends.some((row) => row.etf === 'VOOG' && row.source === 'lot'));
    assert.ok(portfolio.dividends.some((row) => row.etf === 'VOOG' && row.source === 'core'));
  });
});

describe('the doors and the freezes', () => {
  let dir: string;

  before(async () => {
    dir = await fs.mkdtemp(path.join(os.tmpdir(), 'joint-16-'));
  });

  after(async () => {
    await fs.remove(dir);
  });

  test('the benchmark door refuses any symbol beyond the B1/B4/B5 members before reading', async () => {
    await assert.rejects(benchmarkUniverse(['VGT', 'EWZ']), /not a benchmark member/);
  });

  test('the evaluation door refuses a missing or tampered selection manifest', async () => {
    const file = path.join(dir, 'FROZEN_SELECTION.json');

    await assert.rejects(evaluationUniverse(['VGT'], file), /does not exist/);
    await writeSelectionManifest({ nominees: [{ key: 'N-primary' }] }, file);
    await readVerifiedSelection(file);

    const manifest = await fs.readJson(file);

    manifest.nominees[0].key = 'N-other';
    await fs.writeJson(file, manifest);
    await assert.rejects(evaluationUniverse(['VGT'], file), /does not verify/);
    await assert.rejects(writeSelectionManifest({ nominees: [] }, file), /frozen once/);
  });

  test('the protocol freeze is write-once', async () => {
    const file = path.join(dir, 'protocol_freeze.json');

    await freezeProtocol(file);
    await assert.rejects(freezeProtocol(file), /frozen once/);
  });
});
