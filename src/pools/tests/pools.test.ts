// The pool configurations (config/pools/), their loader and the fixed-pool funding semantics through the pools layer,
// on synthetic universes; and, when the frozen canonical files are present, B4 and B5 on `all` to the cent.
import assert from 'node:assert/strict';
import os from 'node:os';
import path from 'node:path';
import { describe, test } from 'node:test';
import fs from 'fs-extra';
import type { MarketSession } from '#types';
import { fixtureDataset } from '../../four-family/data.ts';
import { frozenBenchmarkPhenotypes } from '../../joint-16-etf-d1/benchmarks.ts';
import { assembleUniverse } from '../../multi-etf-allocator/data.ts';
import {
  type SessionSpec,
  buildSession,
  dateOf,
  dipSession,
  flat,
  testPhenotype
} from '../../multi-etf-allocator/tests/fixtures.ts';
import type { BookPhenotype, NUniverse } from '../../portfolio-aware-d1/nbook/engine.ts';
import type { LoadedUniverse } from '../../portfolio-aware-d1/nbook/universe.ts';
import { type LoadedPool, loadPool } from '../load.ts';
import { anchorChecks, dataRecordOf } from '../report.ts';
import { type PoolRunOptions, figuresOf, loadPoolUniverse, runPoolOn } from '../run.ts';
import { PoolConfigError, gridHash, parsePoolConfig } from '../schema.ts';
import { reconcileLedger, tradeLedgerOf } from '../trades.ts';
import { summaryOf } from '../../joint-16-etf-d1/figures.ts';

const pinnedHashes = {
  B4: '5bfc4fd5c12800e2ee03bfed6958b2a0b3dfa87e210ae4c513f32a2be5fc86d6',
  B5: '92d73fc3980b833a610501b00172f388bcbcbd010530c02fc4c5635e28468948'
};

const readRaw = (id: string) =>
  fs.readJsonSync(`config/pools/${id}.json`) as Record<string, unknown> & { books: Record<string, unknown>[] };

const refuses = (mutate: (raw: ReturnType<typeof readRaw>) => void, pattern: RegExp) => {
  const raw = structuredClone(readRaw('B4'));

  mutate(raw);
  assert.throws(
    () => parsePoolConfig(raw, 'test.json'),
    (error: Error) => error instanceof PoolConfigError && pattern.test(error.message)
  );
};

describe('pool configurations', () => {
  test('B4 and B5 load by name, pin stable hashes and equal the frozen benchmark books parameter for parameter', async () => {
    const frozen = await frozenBenchmarkPhenotypes();

    for (const [id, symbols] of [
      ['B4', ['VGT', 'XBI', 'XRT', 'KRE']],
      ['B5', ['VGT', 'XBI', 'XRT', 'KRE', 'GDX']]
    ] as const) {
      const pool = await loadPool(id);

      assert.equal(pool.config.configHash, pinnedHashes[id]);
      assert.deepEqual(
        pool.config.books.map((book) => book.symbol),
        [...symbols]
      );
      assert.match(pool.frozenCheck, /^equal, parameter for parameter/);

      for (const symbol of symbols) {
        assert.deepEqual({ ...pool.phenotypes[symbol]!.params, label: '' }, { ...frozen[symbol]!.params, label: '' });
      }

      assert.equal(pool.config.funding.notionalPerTrade, 100000);
      assert.equal(pool.config.funding.fundedSlots, 1);
      assert.equal(pool.config.funding.compounding, false);
      assert.equal(pool.config.interest.annualRate, 0.11);
      assert.equal(pool.config.costs.bpsPerSide, 5);
    }

    const gdx = (await loadPool('B5')).phenotypes.GDX!;

    assert.equal(gdx.short, 'X 27.4% Y 0.4% L 100 stop 7.1% hold 18 buffer 3.6% P 19.1% W 81');
  });

  test('refuses malformed books, grids, funding and costs', () => {
    refuses((raw) => raw.books.push(structuredClone(raw.books[0]!)), /appears twice/);
    refuses(
      (raw) => delete (raw.books[0]!.parameters as Record<string, unknown>).pullback,
      /missing parameter pullback/
    );
    refuses((raw) => ((raw.books[0]!.parameters as Record<string, unknown>).targetPercentChange = '100.0%'), /outside/);
    refuses(
      (raw) => ((raw.books[0]!.parameters as Record<string, unknown>).targetPercentChange = '21.65%'),
      /off the 0.1/
    );
    refuses(
      (raw) => ((raw.books[0]!.parameters as Record<string, unknown>).trailingBuyPercentage = 0.003),
      /percentage string/
    );
    refuses((raw) => ((raw.books[0]!.parameters as Record<string, unknown>).tickWindowSize = 74.5), /integer/);
    refuses((raw) => ((raw.books[0]!.parameters as Record<string, unknown>).extra = 1), /unknown key "extra"/);
    refuses((raw) => (raw.books[0]!.parametersSha256 = '0'.repeat(64)), /does not match its parameters/);
    refuses((raw) => ((raw.funding as Record<string, unknown>).policy = 'priority'), /funding.policy/);
    refuses((raw) => ((raw.funding as Record<string, unknown>).fundedSlots = 2), /fundedSlots/);
    refuses((raw) => ((raw.funding as Record<string, unknown>).compounding = true), /compounding/);
    refuses((raw) => ((raw.funding as Record<string, unknown>).notionalPerTrade = 0), /positive number/);
    refuses((raw) => ((raw.costs as Record<string, unknown>).bpsPerSide = 101), /basis points/);
    refuses((raw) => ((raw.costs as Record<string, unknown>).bpsPerSide = -1), /basis points/);
    refuses((raw) => ((raw.interest as Record<string, unknown>).annualRate = '11'), /percentage string/);
    refuses((raw) => ((raw.portfolio as Record<string, unknown>).dividends = 'all'), /dividends/);
    refuses((raw) => (raw.unexpected = true), /unknown key "unexpected"/);
  });

  test('refuses a pool whose pinned grid no longer equals its phenotype, a wrong frozen reference and a misnamed file', async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), 'pools-'));

    try {
      const drifted = structuredClone(readRaw('B4'));
      const vgt = drifted.books[0]!;
      const parameters = vgt.parameters as Record<string, unknown>;

      // VGT primary with a 9-day hold instead of 8, its pinned hash recomputed: valid on its own, but no longer the phenotype.
      parameters.maximumHoldDays = 9;
      vgt.parametersSha256 = gridHash({
        targetPercentChange: 216,
        trailingBuyPercentage: 3,
        trailingStopPercentage: 73,
        maximumHoldDays: 9,
        tickWindowSize: 74,
        intradayLossBuffer: 29,
        pullback: 90,
        continuationWindow: 60
      });
      await fs.writeJson(path.join(root, 'B4.json'), drifted);
      await assert.rejects(loadPool('B4', root), /pinned at 9 .*the phenotype changed/);

      const wrongReference = structuredClone(readRaw('B4'));

      (wrongReference.frozenReference as Record<string, unknown>).benchmark = 'B5';
      await fs.writeJson(path.join(root, 'B4.json'), wrongReference);
      await assert.rejects(loadPool('B4', root), /B5 holds VGT XBI XRT KRE GDX/);

      await fs.writeJson(path.join(root, 'B6.json'), readRaw('B4'));
      await assert.rejects(loadPool('B6', root), /must equal the file name/);
      await assert.rejects(loadPool('J-u-f1'), /no pool "J-u-f1"/);
    } finally {
      await fs.remove(root);
    }
  });
});

// Synthetic universes with any symbols (as src/portfolio-aware-d1/tests/engine.test.ts builds them).
const anyUniverse = (specs: Record<string, SessionSpec[]>): LoadedUniverse => {
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

  return { universe: { ...assembled, instruments } as unknown as NUniverse, warmup: 0 } as unknown as LoadedUniverse;
};

const flats = (count: number, price = 100, bars = 6): SessionSpec[] =>
  Array.from({ length: count }, () => flat(price, bars));

const testBook = (symbol: string): BookPhenotype => {
  const phenotype = testPhenotype('VGT');

  return { symbol, name: 'test', params: { ...phenotype.params, label: `${symbol} test` }, short: phenotype.short };
};

// A pool with B5's funding, interest and cost settings and small synthetic books.
const syntheticPool = async (symbols: string[]): Promise<LoadedPool> => {
  const pool = await loadPool('B5');

  return {
    ...pool,
    config: { ...pool.config, books: symbols.map((symbol) => ({ ...pool.config.books[0]!, symbol })) },
    phenotypes: Object.fromEntries(symbols.map((symbol) => [symbol, testBook(symbol)]))
  };
};

const fixed: PoolRunOptions = { mode: 'fixed', dataset: 'all', costBps: 5, dividends: 'frozen' };

describe('fixed-pool funding semantics through the pools layer', () => {
  test('one funded slot and a constant $100,000 on every lot after a win and a loss; a signal while held is refused', async () => {
    // XBI dips on session 3, rises to 100 and gaps to 94 (stopped out); XRT dips on session 4 while XBI is held
    // (refused); GDX dips on session 8 after XBI's exit and is funded with the same notional.
    const loaded = anyUniverse({
      VGT: flats(12),
      XBI: [...flats(3), dipSession(), ...flats(2, 100), ...flats(6, 94)],
      XRT: [...flats(4), dipSession(), ...flats(7, 90)],
      KRE: flats(12),
      GDX: [...flats(8), dipSession(), ...flats(3, 99)]
    });
    const pool = await syntheticPool(['VGT', 'XBI', 'XRT', 'KRE', 'GDX']);
    const result = runPoolOn(pool, loaded, fixed);
    const { figures } = figuresOf(pool, loaded, result, fixed);

    assert.deepEqual(
      result.lots.map((lot) => lot.symbol),
      ['XBI', 'GDX']
    );
    assert.deepEqual(
      result.lots.map((lot) => lot.originalPrincipal),
      [100000, 100000]
    );
    assert.ok(result.lots[0]!.net !== 0, 'the first lot made or lost money');
    assert.ok(
      result.lots[0]!.exitTime <= result.lots[1]!.decisionTime,
      'the second lot is decided after the first exits'
    );
    assert.equal(result.signals.find((signal) => signal.symbol === 'XRT')!.outcome, 'refused');
    assert.match(result.signals.find((signal) => signal.symbol === 'XRT')!.reason, /pool occupied/);
    assert.equal(figures.overlappingLots, 0);
    assert.equal(figures.notionalViolations, 0);
    assert.equal(figures.maxSimultaneousFundedLots, 1);
    assert.equal(figures.refused, 1);
  });

  test('two books signalling in the same minute: the frozen shadow order funds the alphabetically first', async () => {
    const loaded = anyUniverse({
      VGT: flats(8),
      XBI: [...flats(3), dipSession(), ...flats(4, 90)],
      GDX: [...flats(3), dipSession(), ...flats(4, 90)]
    });
    const pool = await syntheticPool(['VGT', 'XBI', 'GDX']);
    const result = runPoolOn(pool, loaded, fixed);
    const tied = result.signals.filter((signal) => signal.sameMinuteCandidates === 2);

    assert.equal(result.lots[0]!.symbol, 'GDX');
    assert.equal(tied.length, 2);
    assert.deepEqual(tied.map((signal) => `${signal.symbol} ${signal.outcome}`).sort(), ['GDX granted', 'XBI refused']);
  });
});

describe('the funded-trade ledger', () => {
  test('lists only funded lots in order; an open lot is unrealized at the last close; totals reconcile exactly', async () => {
    const loaded = anyUniverse({
      VGT: flats(12),
      XBI: [...flats(3), dipSession(), ...flats(2, 100), ...flats(6, 94)],
      XRT: [...flats(4), dipSession(), ...flats(7, 90)],
      KRE: flats(12),
      GDX: [...flats(8), dipSession(), ...flats(3, 99)]
    });
    const pool = await syntheticPool(['VGT', 'XBI', 'XRT', 'KRE', 'GDX']);
    const result = runPoolOn(pool, loaded, fixed);
    const ledger = tradeLedgerOf(result);
    const summary = summaryOf(result);
    const [xbi, gdx] = ledger.rows;

    assert.deepEqual(
      ledger.rows.map((row) => row.symbol),
      ['XBI', 'GDX'],
      'the refused XRT signal is not a trade'
    );
    assert.equal(xbi!.status, 'realized');
    assert.equal(gdx!.status.startsWith('OPEN'), true);
    assert.equal(gdx!.markPrice, 99);
    assert.equal(gdx!.exitFriction, 0);
    assert.ok(gdx!.interest > 0);
    assert.equal(gdx!.net, result.lots.find((lot) => lot.symbol === 'GDX')!.net);
    assert.ok(ledger.rows.every((row) => row.principal === 100000));
    assert.equal(ledger.totals.totalNet, summary.net);
    assert.equal(ledger.totals.unrealizedOpen, gdx!.net);
    assert.equal(ledger.totals.netRealized, xbi!.net);
    assert.ok(Math.abs(gdx!.cumulativeNet - summary.net) < 1e-9);
    assert.deepEqual(
      ledger.openPositions.map((position) => position.symbol),
      ['GDX']
    );
    // Win/loss counts are of closed trades only; the open lot is counted as open.
    assert.equal(ledger.totals.openTrades, 1);
    assert.equal(ledger.totals.profitable + ledger.totals.losing <= ledger.totals.realizedTrades, true);
    assert.equal(gdx!.exitNewYork, '');
    assert.match(gdx!.markedAt, /close$/);
    assert.ok(gdx!.interestDays >= 0 && Number.isInteger(Math.round(gdx!.interestDays)));
    assert.equal(ledger.identity.pass, true);

    const reconciliation = await reconcileLedger(ledger, summary, { applicable: false, controlKey: 'fixed-5' });

    assert.equal(reconciliation.pass, true);
    assert.equal(reconciliation.checks.length, 7);
  });
});

// B4 and B5 on the frozen canonical `all`, when its files are present and unchanged (data/ is local).
const frozenDataPresent = async () => {
  const pins = readRaw('B5').regressionAnchors as { dataSha256: Record<string, string> };
  const crypto = await import('node:crypto');

  for (const [symbol, hash] of Object.entries(pins.dataSha256)) {
    const file = `data/${symbol}/data.csv`;

    if (
      !(await fs.pathExists(file)) ||
      crypto
        .createHash('sha256')
        .update(await fs.readFile(file))
        .digest('hex') !== hash
    ) {
      return false;
    }
  }

  return true;
};

describe('B4 and B5 on the frozen canonical all (fixed, 5 bps)', async () => {
  const present = await frozenDataPresent();

  for (const [id, net, drawdown, lots] of [
    ['B4', 284244.74, 28659.34, 76],
    ['B5', 486207.77, 26509.97, 94]
  ] as const) {
    test(
      `${id} reproduces its anchors to the cent with one slot and a constant notional`,
      { skip: !present && 'the frozen canonical data files are absent or changed' },
      async () => {
        const pool = await loadPool(id);
        const loaded = await loadPoolUniverse(pool, fixed);
        const result = runPoolOn(pool, loaded, fixed);
        const computed = figuresOf(pool, loaded, result, fixed);
        const data = dataRecordOf(pool, loaded);
        const anchors = anchorChecks(pool, fixed, computed, data.frozenAll);

        assert.equal(data.frozenAll, true);
        assert.equal(Math.round(computed.summary.net * 100) / 100, net);
        assert.equal(Math.round(computed.summary.minuteDrawdown * 100) / 100, drawdown);
        assert.equal(computed.summary.lots, lots);
        assert.ok(anchors.applicable && anchors.checks.every((check) => check.pass));
        assert.equal(computed.figures.notionalViolations, 0);
        assert.equal(computed.figures.overlappingLots, 0);
        assert.equal(computed.figures.maxSimultaneousFundedLots, 1);

        // The funded-trade ledger reconciles exactly with the run's summary and the frozen controls.
        const ledger = tradeLedgerOf(result);
        const reconciliation = await reconcileLedger(ledger, computed.summary, {
          applicable: true,
          controlsFile: 'research/joint-16-etf-d1/results/controls/controls.json',
          benchmark: id,
          controlKey: 'fixed-5'
        });

        assert.equal(ledger.rows.length, lots);
        assert.equal(reconciliation.checks.length, 12);
        assert.equal(reconciliation.pass, true);

        // Every same-minute group funds its alphabetically first member.
        const groups = new Map<number, typeof result.signals>();

        for (const signal of result.signals.filter((item) => item.sameMinuteCandidates > 1)) {
          groups.set(signal.decisionTime, [...(groups.get(signal.decisionTime) ?? []), signal]);
        }

        for (const group of groups.values()) {
          const granted = group.filter((signal) => signal.outcome === 'granted');

          if (granted.length === 1) {
            assert.equal(granted[0]!.symbol, group.map((signal) => signal.symbol).sort()[0]);
          }
        }
      }
    );
  }
});
