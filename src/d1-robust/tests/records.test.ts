// Write-once records and isolation (PROTOCOL.md §15, §18, §21, §24): sealed records refuse a second write and detect
// tampering; the amendment log is a hash chain; the validation drawdown recomputed from a replay's lots equals the
// replay's own whole-run figure on a multi-book synthetic pool; a later exit changes no earlier funding decision in a
// six-book pool; the retrospective runner is imported by no search, pilot, promotion, refinement, assessment or
// selection module, refuses without its flag or with another partition, and its provenance verifies against the
// 16-ETF study's manifest.
import assert from 'node:assert/strict';
import os from 'node:os';
import path from 'node:path';
import { after, before, describe, test } from 'node:test';
import fs from 'fs-extra';
import type { MarketSession } from '#types';
import { fixtureDataset } from '../../four-family/data.ts';
import { assembleUniverse } from '../../multi-etf-allocator/data.ts';
import type { RealLot } from '../../multi-etf-allocator/ledger.ts';
import { buildSession, dateOf } from '../../multi-etf-allocator/tests/fixtures.ts';
import type { NUniverse } from '../../portfolio-aware-d1/nbook/engine.ts';
import type { LoadedUniverse } from '../../portfolio-aware-d1/nbook/universe.ts';
import { replayFixedPool } from '../../portfolio-aware-d1/replay.ts';
import { Rng } from '../../optimizer/rng.ts';
import { RobustEvaluator } from '../evaluator.ts';
import { appendAmendment, readAmendments, readSealed, writeSealed } from '../freeze.ts';
import { GenomeSpace, Library } from '../genome.ts';
import { sobolLibrary } from '../library.ts';
import { readProvenance, retrospectiveUniverse, runResearchRun } from '../retrospective.ts';
import { windowedMinuteDrawdown } from '../walkforward.ts';

const symbols = ['EWZ', 'GDX', 'KRE', 'TLT', 'VGT', 'VOOG', 'XBI', 'XRT'];
let dir = '';

const synthetic = (): LoadedUniverse => {
  const instruments: Record<
    string,
    { symbol: string; file: string; hash: string; ds: ReturnType<typeof fixtureDataset> }
  > = {};
  let end = '';

  symbols.forEach((symbol, index) => {
    const built: MarketSession[] = Array.from({ length: 500 }, (_, day) => {
      const cycle = ((day + 17 * index) % (45 + 5 * index)) / (45 + 5 * index);
      const level =
        100 * (1 + 0.0003 * day) * (cycle < 0.3 ? 1 - (0.14 * cycle) / 0.3 : 0.86 + (0.14 * (cycle - 0.3)) / 0.7);

      return buildSession(dateOf(day), {
        closes: Array.from({ length: 8 }, (_, k) => level * (1 + 0.003 * Math.sin(day * 3 + k + index)))
      });
    });
    const ds = fixtureDataset(built);

    ds.id = `fixture-${symbol}`;
    instruments[symbol] = { symbol, file: 'fixture', hash: 'fixture', ds };
    end = built.at(-1)!.date;
  });

  const assembled = assembleUniverse(instruments as never, [], end, {}, dateOf(30));

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

const vectors = () =>
  sobolLibrary(64).vectors.map((vector) => ({
    ...vector,
    grid: { ...vector.grid, tickWindowSize: 20 + (vector.grid.tickWindowSize % 10) }
  }));

before(async () => {
  dir = await fs.mkdtemp(path.join(os.tmpdir(), 'robust-d1-records-'));
});

after(async () => {
  await fs.remove(dir);
});

describe('write-once records', () => {
  test('a sealed record refuses a second write and detects tampering', async () => {
    const file = path.join(dir, 'sealed.json');
    const sealed = await writeSealed(file, { outcome: 'no advancement', value: NaN });

    assert.equal((await readSealed(file)).bodyHash, sealed.bodyHash);
    await assert.rejects(writeSealed(file, { outcome: 'other' }), /written once/);

    const text = await fs.readFile(file, 'utf8');

    await fs.writeFile(file, text.replace('no advancement', 'advancement'));
    await assert.rejects(readSealed(file), /does not verify/);
  });

  test('amendments are anchored to the frozen head, refused after a stage outcome, and hash-chained', async () => {
    const file = path.join(dir, 'amendments.jsonl');
    const freeze = path.join(dir, 'freeze.json');
    const output = path.join(dir, 'stage-output.json');

    await writeSealed(freeze, { protocolSha256: 'p0', contextSha256: 'c0', code: { digest: 'd0', files: {} } });

    const first = await appendAmendment(
      { stage: 'pilot', change: 'typo', technicalReason: 'wording', stageOutputsAbsent: [output] },
      file,
      freeze
    );

    assert.equal(first.protocolBefore, 'p0');
    assert.equal(first.codeBefore, 'd0');

    const second = await appendAmendment(
      { stage: 'pilot', change: 'typo 2', technicalReason: 'wording', stageOutputsAbsent: [] },
      file,
      freeze
    );

    assert.equal(second.protocolBefore, first.protocolAfter);
    assert.equal(second.codeBefore, first.codeAfter);
    await fs.outputFile(output, '{}');
    await assert.rejects(
      appendAmendment(
        { stage: 'pilot', change: 'late', technicalReason: 'x', stageOutputsAbsent: [output] },
        file,
        freeze
      ),
      /must precede/
    );
    assert.equal((await readAmendments(file)).length, 2);

    const lines = (await fs.readFile(file, 'utf8')).split('\n').filter(Boolean);

    await fs.writeFile(file, `${lines[1]}\n${lines[0]}\n`);
    await assert.rejects(readAmendments(file), /hash chain/);
  });
});

describe('validation drawdown and lookahead', () => {
  test('the windowed drawdown from the whole run equals the replay’s own, on many random pools', async () => {
    const loaded = synthetic();
    const evaluator = await RobustEvaluator.create(loaded, 'fold-a', 0);
    const space = new GenomeSpace(symbols, new Library(vectors()));
    const rng = Rng.from('test', 'windowed');
    let compared = 0;

    try {
      for (let index = 0; index < 40; index++) {
        const books = space.booksOf(space.uniform(rng, 1, 6));
        const detail = evaluator.replayDetail(books, 5);
        const lots = detail.full!.lots as unknown as RealLot[];
        const whole = windowedMinuteDrawdown(
          lots,
          detail.books,
          detail.marks,
          evaluator.window.startIndex,
          evaluator.window.endIndex,
          5
        );

        assert.equal(whole, detail.minuteDrawdown.maximum, `pool ${index}`);

        const mid = Math.floor((evaluator.window.startIndex + evaluator.window.endIndex) / 2);
        const later = windowedMinuteDrawdown(lots, detail.books, detail.marks, mid, evaluator.window.endIndex, 5);

        assert.ok(later <= whole + 1e-9, 'a drawdown with the peak reset later is never larger');
        compared += lots.length > 0 ? 1 : 0;
      }

      assert.ok(compared > 10, 'enough pools funded lots');
    } finally {
      await evaluator.close();
    }
  });

  test('a later exit price or time changes no earlier funding decision in a six-book pool', async () => {
    const loaded = synthetic();
    const evaluator = await RobustEvaluator.create(loaded, 'fold-a', 0);
    const space = new GenomeSpace(symbols, new Library(vectors()));
    const rng = Rng.from('test', 'lookahead');

    try {
      let tested = 0;

      for (let attempt = 0; attempt < 30 && tested < 3; attempt++) {
        const base = evaluator.replayDetail(space.booksOf(space.uniform(rng, 6, 6)), 0);
        const first = base.lots.find((lot) => lot.exitIndex >= 0);

        if (!first || base.lots.length < 3) {
          continue;
        }

        const owner = base.books.find((item) => item.symbol === first.symbol)!;
        const trade = owner.trace.trades[first.tradeId - 1]!;
        const config = {
          symbols: base.books.map((item) => item.symbol),
          startIndex: evaluator.window.startIndex,
          endIndex: evaluator.window.endIndex,
          principal: 100000,
          rate: 0.11,
          costBps: 0,
          stopSlippageBps: 0,
          detail: true
        };
        const altered = (change: (copy: typeof trade) => void) =>
          replayFixedPool(
            base.books.map((item) =>
              item === owner
                ? {
                    ...item,
                    trace: {
                      ...item.trace,
                      trades: item.trace.trades.map((other) =>
                        other === trade
                          ? (() => {
                              const copy = { ...other };
                              change(copy);
                              return copy;
                            })()
                          : other
                      )
                    }
                  }
                : item
            ),
            config
          );
        const before_ = (result: ReturnType<typeof replayFixedPool>) =>
          result
            .full!.signals.filter((signal) => signal.decisionTime < trade.exitTime)
            .map((signal) => `${signal.symbol}@${signal.decisionTime}:${signal.outcome}`);
        const reference = before_(replayFixedPool(base.books, config));

        assert.deepEqual(
          before_(
            altered((copy) => {
              copy.exitRawPrice *= 0.5;
              copy.net -= 50000;
            })
          ),
          reference
        );
        assert.deepEqual(
          before_(
            altered((copy) => {
              copy.exitIndex = Math.min(copy.exitIndex + 2, evaluator.window.endIndex);
            })
          ),
          reference
        );
        tested++;
      }

      assert.ok(tested > 0, 'at least one six-book pool funded a closed lot');
    } finally {
      await evaluator.close();
    }
  });
});

describe('the retrospective runner is isolated', () => {
  const importsOf = async (file: string): Promise<string[]> => {
    const text = await fs.readFile(file, 'utf8');

    return [...text.matchAll(/(?:from|import)\s*\(?\s*'(\.[^']+)'/g)].map((match) =>
      path.resolve(path.dirname(file), match[1]!)
    );
  };
  const closure = async (file: string, seen = new Set<string>()) => {
    if (seen.has(file) || !file.startsWith(path.resolve('src/d1-robust'))) {
      return seen;
    }

    seen.add(file);

    for (const next of await importsOf(file)) {
      await closure(next, seen);
    }

    return seen;
  };

  test('no search, pilot, promotion, refinement, assessment or selection module imports it', async () => {
    const modules = (await fs.readdir('src/d1-robust'))
      .filter((name) => name.endsWith('.ts') && !['cli.ts', 'retrospective.ts'].includes(name))
      .map((name) => name.slice(0, -3));

    assert.ok(modules.length >= 25);

    for (const module of modules) {
      const reached = await closure(path.resolve(`src/d1-robust/${module}.ts`));

      assert.ok(
        ![...reached].some((file) => file.endsWith('retrospective.ts')),
        `${module}.ts reaches retrospective.ts`
      );
    }
  });

  test('it refuses without the flag and outside `all`; its provenance verifies', async () => {
    await assert.rejects(retrospectiveUniverse('R1', ['XBI'], [], 'all'), /acknowledge-retrospective/);
    await assert.rejects(retrospectiveUniverse('R1', ['XBI'], ['--acknowledge-retrospective'], 'holdout'), /all only/);
    await assert.rejects(
      retrospectiveUniverse('B5' as never, ['XBI'], ['--acknowledge-retrospective'], 'all'),
      /R1 or R4/
    );
    const before = await fs.pathExists('evaluations/robust-d1/retrospective/PROVENANCE.json');

    await runResearchRun(['--config', 'R1', '--mode', 'fixed', '--dataset', 'all', '--cost', '5']); // prints the label, runs nothing
    assert.equal(
      await fs.pathExists('evaluations/robust-d1/retrospective/PROVENANCE.json'),
      before,
      'nothing was written'
    );
    // Only while the study has no selection freeze: afterwards an acknowledged call would be a real run.
    if (!(await fs.pathExists('research/d1-robust-pool-discovery/FROZEN_SELECTION.json'))) {
      await assert.rejects(
        runResearchRun([
          '--config',
          'R1',
          '--mode',
          'fixed',
          '--dataset',
          'all',
          '--cost',
          '5',
          '--acknowledge-retrospective'
        ]),
        /does not exist|after `evaluate`|protocol|manifest|amend/i,
        'refused before this study’s selection freeze and locked confirmation'
      );
    }

    const provenance = await readProvenance();

    assert.equal(provenance.configs.R1.key, 'GDX:d1-e7461ea563|KRE:d1-a389037400|XBI:d1-43a297e3fd|XRT:d1-752c561fac');
    assert.equal(provenance.configs.R4.key, 'GDX:d1-c0909c54a6|KRE:d1-a389037400|XBI:d1-e080f1a385|XLF:d1-d731d5c68f');
  });
});
