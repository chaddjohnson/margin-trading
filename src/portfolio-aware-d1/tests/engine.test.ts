// The study's engines on synthetic data: the N-book engine equals the frozen engine on four-book universes (both
// modes) and funds a fifth, candidate book under the same rules; the cached replay equals the N-book engine and is
// causal (a later exit's time or P&L cannot change an earlier decision); the trace cache key moves with every
// behaviour-relevant input; a candidate position held across a 1:4 reverse split equals the unsplit economy on the
// N-book engine and the replay; and the study's data doors refuse what they may not open.
import assert from 'node:assert/strict';
import os from 'node:os';
import path from 'node:path';
import { after, before, describe, test } from 'node:test';
import fs from 'fs-extra';
import { type SplitEvent, defaultPartitionConfigText, newYorkOffset, nyseHolidays } from '#lib';
import type { MarketSession } from '#types';
import { fixtureDataset } from '../../four-family/data.ts';
import { runAllocator } from '../../multi-etf-allocator/engine.ts';
import { assembleUniverse } from '../../multi-etf-allocator/data.ts';
import {
  type SessionSpec,
  buildSession,
  dateOf,
  dipSession,
  flat,
  testConfig,
  testGrid,
  testPhenotype,
  universeOf
} from '../../multi-etf-allocator/tests/fixtures.ts';
import { compareValues, outputsOf } from '../compare.ts';
import { evaluationUniverse } from '../data.ts';
import { readVerifiedSelection, writeSelectionManifest } from '../freeze.ts';
import { type BookPhenotype, type NUniverse, baseNRunConfig, runNAllocator } from '../nbook/engine.ts';
import { loadNUniverse } from '../nbook/universe.ts';
import { candidateBook } from '../phenotypes.ts';
import { type ReplayBook, replayFixedPool } from '../replay.ts';
import { traceBook, traceKey, traceSettings } from '../trace.ts';

const flats = (count: number, price = 100, bars = 6): SessionSpec[] =>
  Array.from({ length: count }, () => flat(price, bars));

const ignore = new Set(['config', 'universe', 'maintenanceEvents', 'forcedLiquidations']);

// A universe of any symbols from session specs (the frozen fixture builder is typed to the frozen five).
const anyUniverse = (specs: Record<string, SessionSpec[]>): NUniverse => {
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

  const assembled = assembleUniverse(instruments as never, [], end, {}, dateOf(0));

  return { ...assembled, instruments } as unknown as NUniverse;
};

const bookOf = (symbol: string, grid: Partial<typeof testGrid> = {}): BookPhenotype => {
  const phenotype = testPhenotype('VGT', grid);

  return { symbol, name: 'test', params: { ...phenotype.params, label: `${symbol} test` }, short: phenotype.short };
};

const fixedConfig = (symbols: string[], costBps = 0, books?: Record<string, BookPhenotype>) =>
  baseNRunConfig({
    key: 'test',
    label: 'test',
    mode: 'fixed',
    symbols,
    phenotypes: books ?? Object.fromEntries(symbols.map((symbol) => [symbol, bookOf(symbol)])),
    costBps,
    initial: { voog: 60000, vgt: 40000 }
  });

const replayOf = (universe: NUniverse, symbols: string[], costBps: number, books?: Record<string, BookPhenotype>) => {
  const phenotypes = books ?? Object.fromEntries(symbols.map((symbol) => [symbol, bookOf(symbol)]));
  const window = {
    armStart: universe.eligibilityIndex,
    startIndex: 0,
    endIndex: universe.sessionCount - 1,
    splitsSha256: 'test'
  };
  const replayBooks: ReplayBook[] = symbols.map((symbol) => ({
    symbol,
    ds: universe.instruments[symbol]!.ds,
    trace: traceBook(universe.instruments[symbol]!.ds, phenotypes[symbol]!, traceSettings(costBps), window)
  }));

  return {
    replayBooks,
    window,
    replay: (books = replayBooks) =>
      replayFixedPool(books, {
        symbols,
        startIndex: 0,
        endIndex: universe.sessionCount - 1,
        principal: 100000,
        rate: 0.11,
        costBps,
        stopSlippageBps: 0,
        detail: true
      })
  };
};

// XBI dips on session 3, rises to 100 (its 5% stop becomes active at 95) and gaps to 94 on session 6, which stops it
// out at the open; XRT dips on session 4 while XBI is held (refused); GDX dips on session 8, after XBI's exit.
const candidateUniverse = () =>
  anyUniverse({
    VOOG: flats(12),
    VGT: flats(12),
    XBI: [...flats(3), dipSession(), ...flats(2, 100), ...flats(6, 94)],
    XRT: [...flats(4), dipSession(), ...flats(7, 90)],
    KRE: flats(12),
    GDX: [...flats(8), dipSession(), ...flats(3, 99)]
  });

describe('the N-book engine', () => {
  test('equals the frozen engine on four-book synthetic universes, fixed and portfolio, at several costs', () => {
    const universe = universeOf({
      VOOG: flats(10),
      VGT: [...flats(5), dipSession(), ...flats(4, 95)],
      XBI: [...flats(3), dipSession(), ...flats(6, 90)],
      XRT: [...flats(4), dipSession(), ...flats(5, 90)],
      KRE: [...flats(3), dipSession(1, 2), ...flats(6, 92)]
    });

    for (const mode of ['fixed', 'portfolio'] as const) {
      for (const costBps of [0, 5, 10]) {
        const frozen = runAllocator(universe, testConfig({ mode, costBps, policy: 'shadow' }));
        const books = Object.fromEntries(
          (['VGT', 'XBI', 'XRT', 'KRE'] as const).map((symbol) => {
            const phenotype = testPhenotype(symbol);

            return [symbol, { symbol, name: phenotype.name, params: phenotype.params, short: phenotype.short }];
          })
        );
        const n = runNAllocator(
          universe as unknown as NUniverse,
          baseNRunConfig({
            key: 'test',
            label: 'test',
            mode,
            symbols: ['VGT', 'XBI', 'XRT', 'KRE'],
            phenotypes: books,
            costBps,
            initial: { voog: 60000, vgt: 40000 }
          })
        );

        assert.ok(frozen.lots.length > 0, 'the fixture funds lots');
        assert.deepEqual(compareValues(frozen, n, { ignore }), [], `${mode} ${costBps} bps`);
      }
    }
  });

  test('funds a candidate book under the same rules, ties alphabetical', () => {
    const universe = candidateUniverse();
    const result = runNAllocator(universe, fixedConfig(['VGT', 'XBI', 'XRT', 'KRE', 'GDX']));

    assert.deepEqual(
      result.lots.map((lot) => lot.symbol),
      ['XBI', 'GDX'],
      'XBI first; XRT refused while XBI is held; GDX after XBI leaves'
    );
    assert.equal(result.signals.find((signal) => signal.symbol === 'XRT')!.outcome, 'refused');

    // A same-minute tie: XBI and GDX dip on the same session; GDX wins alphabetically.
    const tie = anyUniverse({
      VGT: flats(8),
      XBI: [...flats(3), dipSession(), ...flats(4, 90)],
      GDX: [...flats(3), dipSession(), ...flats(4, 90)]
    });
    const tied = runNAllocator(tie, fixedConfig(['VGT', 'XBI', 'GDX']));

    assert.equal(tied.lots[0]!.symbol, 'GDX');
    assert.equal(tied.signals.filter((signal) => signal.sameMinuteCandidates === 2).length, 2);
  });
});

describe('the cached replay', () => {
  test('equals the N-book engine field for field on candidate pools at several costs', () => {
    const universe = candidateUniverse();

    for (const symbols of [['VGT', 'XBI', 'XRT', 'KRE', 'GDX'], ['VGT', 'XBI', 'XRT', 'GDX'], ['GDX']]) {
      for (const costBps of [0, 2, 5, 10]) {
        const full = runNAllocator(universe, fixedConfig(symbols, costBps));
        const { replay } = replayOf(universe, symbols, costBps);
        const fast = replay();
        assert.deepEqual(compareValues(outputsOf(full), fast.full), [], `${symbols.join('+')} ${costBps} bps`);
        assert.equal(
          fast.net,
          full.lots.reduce((total, lot) => total + lot.net, 0)
        );
      }
    }
  });

  test('is causal: a later exit or P&L never changes an earlier decision', () => {
    const universe = candidateUniverse();
    const symbols = ['VGT', 'XBI', 'XRT', 'KRE', 'GDX'];
    const { replayBooks, replay } = replayOf(universe, symbols, 0);
    const base = replay();
    const firstLot = base.full!.lots[0]!;
    const cutoff = firstLot.exitTime;
    const alter = (change: (trade: ReplayBook['trace']['trades'][number]) => ReplayBook['trace']['trades'][number]) =>
      replay(
        replayBooks.map((book) => ({
          ...book,
          trace: {
            ...book.trace,
            trades: book.trace.trades.map((trade) =>
              trade.symbol === firstLot.symbol && trade.id === firstLot.trade.id ? change(trade) : trade
            )
          }
        }))
      );
    const before = (result: typeof base) =>
      result
        .full!.signals.filter((signal) => signal.decisionTime - 60 < cutoff)
        .map((signal) => `${signal.symbol}:${signal.decisionTime}:${signal.outcome}`);

    assert.ok(firstLot.exitIndex >= 0 && Number.isFinite(cutoff), 'the first funded lot exits');
    assert.ok(
      base.full!.signals.some((signal) => signal.decisionTime - 60 < cutoff),
      'decisions before its exit'
    );
    assert.ok(
      base.full!.signals.some((signal) => signal.decisionTime - 60 >= cutoff),
      'and after it'
    );

    // Its P&L changed: every earlier decision is unchanged, and the change is booked at the exit.
    const richer = alter((trade) => ({ ...trade, exitRawPrice: trade.exitRawPrice * 1.5 }));

    assert.deepEqual(before(richer), before(base), 'a later P&L does not reach an earlier decision');
    assert.ok(richer.net > base.net + 1000, 'the altered exit price is booked at the exit');

    // Its exit moved two sessions later: every decision before the original exit is unchanged.
    const later = alter((trade) => ({ ...trade, exitIndex: trade.exitIndex + 2 }));

    assert.deepEqual(before(later), before(base), 'a later exit time does not reach an earlier decision');
  });

  test('the trace key moves with every behaviour-relevant input', () => {
    const universe = candidateUniverse();
    const ds = universe.instruments.GDX!.ds;
    const book = bookOf('GDX');
    const window = { armStart: 0, startIndex: 0, endIndex: universe.sessionCount - 1, splitsSha256: 'a' };
    const base = traceKey(ds, book, traceSettings(5), window);
    const variants = [
      traceKey(ds, bookOf('GDX', { trailingStopPercentage: 51 }), traceSettings(5), window),
      traceKey(ds, book, traceSettings(2), window),
      traceKey(ds, book, traceSettings(5, { rate: 0.1 }), window),
      traceKey(ds, book, traceSettings(5, { stopFill: 'next-open' }), window),
      traceKey(ds, book, traceSettings(5, { stopSlippageBps: 1 }), window),
      traceKey(ds, book, traceSettings(5, { notional: 50000 }), window),
      traceKey(ds, book, traceSettings(5), { ...window, armStart: 1 }),
      traceKey(ds, book, traceSettings(5), { ...window, endIndex: window.endIndex - 1 }),
      traceKey(ds, book, traceSettings(5), { ...window, splitsSha256: 'b' }),
      traceKey({ ...ds, dataHash: 'other' }, book, traceSettings(5), window),
      traceKey(universe.instruments.XBI!.ds, { ...book, symbol: 'XBI' }, traceSettings(5), window)
    ];

    assert.equal(traceKey(ds, bookOf('GDX'), traceSettings(5), window), base, 'deterministic');
    assert.equal(new Set([base, ...variants]).size, variants.length + 1);
  });
});

describe('a candidate held across a 1:4 reverse split', () => {
  let plainRoot = '';
  let splitRoot = '';
  const splitDate = '2024-01-17';
  const members = ['VGT', 'XOP'];
  const splits: SplitEvent[] = [
    { symbol: 'XOP', effectiveDate: splitDate, ratio: 0.25, source: 'synthetic reverse split' }
  ];

  // Minute rows from 2023-06-01: a rise, a 12% XOP dip on 2023-12-01, a hold across the split, a fall from 2024-02-12.
  const rows = (symbol: string, split: boolean) => {
    const lines: string[] = [];
    let price = 100;
    let step = 0;

    for (let time = Date.parse('2023-06-01T00:00:00Z'); time <= Date.parse('2024-02-28T00:00:00Z'); time += 86400000) {
      const date = new Date(time).toISOString().slice(0, 10);
      const day = new Date(time).getUTCDay();

      if (day === 0 || day === 6 || nyseHolidays.has(date)) {
        continue;
      }

      const at = (hour: number, minute: number) => {
        const local =
          Date.parse(`${date}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00Z`) / 1000;

        return `"${new Date((local - newYorkOffset(Date.parse(`${date}T16:00:00Z`) / 1000)) * 1000).toISOString().replace('.000', '')}"`;
      };

      price =
        symbol === 'XOP' && date === '2023-12-01'
          ? price * 0.88
          : symbol === 'XOP' && date >= '2024-02-12'
            ? price * 0.97
            : price + (step++ % 7 === 3 ? -0.3 : 0.1);

      const ratio = split && symbol === 'XOP' && date >= splitDate ? 0.25 : 1;

      for (const [hour, minute] of [
        [9, 30],
        [12, 0],
        [15, 59],
        [16, 0]
      ] as const) {
        lines.push(
          `${at(hour, minute)},${price / ratio},${(price + 0.1) / ratio},${(price - 0.1) / ratio},${price / ratio},${1000 * ratio}`
        );
      }
    }

    return `${lines.join('\n')}\n`;
  };

  before(async () => {
    plainRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'portfolio-aware-plain-'));
    splitRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'portfolio-aware-split-'));

    for (const dir of [plainRoot, splitRoot]) {
      await fs.writeFile(path.join(dir, 'partitions.json'), defaultPartitionConfigText);

      for (const symbol of members) {
        await fs.outputFile(path.join(dir, symbol, 'data.csv'), rows(symbol, dir === splitRoot));
      }
    }
  });

  after(async () => {
    await fs.remove(plainRoot);
    await fs.remove(splitRoot);
  });

  test('equals the unsplit economy on the N-book engine and the replay; unadjusted, it would not', async () => {
    const load = (root: string, list: SplitEvent[]) =>
      loadNUniverse({
        members,
        partition: 'all',
        access: 'manual evaluation',
        warmupSessions: 0,
        root,
        splits: list,
        ledger: { file: 'x', sha256: 'x', coverage: { VGT: '2030-01-01', VOOG: '2030-01-01' }, distributions: [] }
      });
    const plain = await load(plainRoot, []);
    const split = await load(splitRoot, splits);
    const raw = await load(splitRoot, []);
    const books = { XOP: candidateBook('XOP', 'test', testGrid) };
    const config = baseNRunConfig({
      key: 'x',
      label: 'x',
      mode: 'fixed',
      symbols: ['XOP'],
      phenotypes: books,
      eligibilityIndex: 0
    });
    const expected = runNAllocator(plain.universe, config);
    const actual = runNAllocator(split.universe, config);
    const unadjusted = runNAllocator(raw.universe, config);
    const splitIndex = split.universe.dates.indexOf(splitDate);

    assert.deepEqual(split.splits, [{ symbol: 'XOP', effectiveDate: splitDate, ratio: 0.25 }]);
    assert.ok(
      expected.lots.some((lot) => lot.entryIndex < splitIndex && (lot.exitIndex > splitIndex || lot.exitIndex < 0))
    );
    assert.deepEqual(compareValues(expected.lots, actual.lots, { ignore: new Set(['trade']) }), []);
    assert.equal(
      actual.lots.reduce((t, lot) => t + lot.net, 0),
      expected.lots.reduce((t, lot) => t + lot.net, 0)
    );
    assert.ok(
      Math.abs(unadjusted.lots.reduce((t, lot) => t + lot.net, 0) - expected.lots.reduce((t, lot) => t + lot.net, 0)) >
        100000,
      'the unadjusted bytes would manufacture a large P&L'
    );

    const window = { armStart: 0, startIndex: 0, endIndex: split.universe.sessionCount - 1, splitsSha256: 'x' };
    const trace = traceBook(split.universe.instruments.XOP!.ds, books.XOP, traceSettings(0), window);
    const fast = replayFixedPool([{ symbol: 'XOP', ds: split.universe.instruments.XOP!.ds, trace }], {
      symbols: ['XOP'],
      startIndex: 0,
      endIndex: window.endIndex,
      principal: 100000,
      rate: 0.11,
      costBps: 0,
      stopSlippageBps: 0,
      detail: true
    });
    assert.deepEqual(compareValues(outputsOf(actual), fast.full), []);
  });
});

describe('data access', () => {
  test('optimization access refuses every partition but training, before reading a bar', async () => {
    // A data root with the partitions and an empty price file: a refusal must come before any bar is read, and
    // training passes the guard only to find no session.
    const root = await fs.mkdtemp(path.join(os.tmpdir(), 'portfolio-aware-access-'));

    try {
      await fs.writeFile(path.join(root, 'partitions.json'), defaultPartitionConfigText);
      await fs.outputFile(path.join(root, 'GDX', 'data.csv'), '');

      for (const partition of ['holdout', 'final', 'all'] as const) {
        await assert.rejects(
          loadNUniverse({ members: ['GDX'], partition, access: 'optimization', warmupSessions: 0, root }),
          /training partition only/
        );
      }

      await assert.rejects(
        loadNUniverse({ members: ['GDX'], partition: 'training', access: 'optimization', warmupSessions: 0, root }),
        (error: Error) => !/training partition only/.test(error.message),
        'training passes the guard and fails only on the empty file'
      );
    } finally {
      await fs.remove(root);
    }
  });

  test('the post-freeze loader refuses without a verified selection manifest', async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'portfolio-aware-manifest-'));
    const file = path.join(dir, 'FROZEN_SELECTION.json');

    try {
      await assert.rejects(evaluationUniverse(['GDX'], file, '/nonexistent'), /does not exist/);
      await writeSelectionManifest({ configurations: ['S0'], note: 'test' }, file);
      await assert.doesNotReject(readVerifiedSelection(file));
      await assert.rejects(writeSelectionManifest({ again: true }, file), /frozen once/);

      const tampered = { ...(await fs.readJson(file)), configurations: ['S0', 'P-add-GDX'] };

      await fs.writeJson(file, tampered);
      await assert.rejects(evaluationUniverse(['GDX'], file, '/nonexistent'), /does not verify/);
    } finally {
      await fs.remove(dir);
    }
  });
});
