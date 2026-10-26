// The prospective comparison's boundary accounting on synthetic universes (a lot open across the cutoff, carried state,
// peak-reset drawdowns, no double counting), the snapshot checks (dates after the cutoff only, order, NYSE sessions,
// calendar coverage, split-sized moves) and the freeze's write-once seal and refusals.
import assert from 'node:assert/strict';
import os from 'node:os';
import path from 'node:path';
import { describe, test } from 'node:test';
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
  testPhenotype
} from '../../multi-etf-allocator/tests/fixtures.ts';
import type { BookPhenotype, NUniverse } from '../../portfolio-aware-d1/nbook/engine.ts';
import type { LoadedUniverse } from '../../portfolio-aware-d1/nbook/universe.ts';
import {
  completenessProblems,
  distributionProblems,
  nyseSessions,
  parseSnapshotFile,
  undeclaredSplitMoves
} from '../forward/data.ts';
import { verifyProspectiveFreeze } from '../forward/freeze.ts';
import { drawdownFrom, forwardFiguresOf, type ForwardObserved } from '../forward/metrics.ts';
import {
  calendarAppendOnlyFailures,
  calendarState,
  codeManifest,
  freezeFileOf,
  normalizedCalendarHash,
  prospective,
  sha256File,
  writeOnce
} from '../forward/protocol.ts';
import { checkOrWriteObservation, matchedBorrowing } from '../forward/report.ts';
import { type LoadedPool, loadPool } from '../load.ts';
import { type PoolRunOptions, runPoolOn } from '../run.ts';

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

const syntheticPool = async (symbols: string[]): Promise<LoadedPool> => {
  const pool = await loadPool('B5');

  return {
    ...pool,
    config: { ...pool.config, books: symbols.map((symbol) => ({ ...pool.config.books[0]!, symbol })) },
    phenotypes: Object.fromEntries(symbols.map((symbol) => [symbol, testBook(symbol)]))
  };
};

// XBI enters on session 3 and is stopped out on session 6; GDX enters on session 8 and is open at the end.
const scenario = async () => {
  const loaded = anyUniverse({
    VGT: flats(12),
    XBI: [...flats(3), dipSession(), ...flats(2, 100), ...flats(6, 94)],
    XRT: flats(12),
    KRE: flats(12),
    GDX: [...flats(8), dipSession(), ...flats(3, 99)]
  });
  const pool = await syntheticPool(['VGT', 'XBI', 'XRT', 'KRE', 'GDX']);
  const options: PoolRunOptions = { mode: 'fixed', dataset: 'all', costBps: 5, dividends: 'frozen' };

  return runPoolOn(pool, loaded, options);
};

const settings = { rate: 0.11, costBps: 5, notional: 100000 };

describe('forward accounting across the cutoff', () => {
  test('a lot open at the cutoff is carried: its forward P&L starts from its cutoff mark; nothing is counted twice', async () => {
    const result = await scenario();
    const cutoff = dateOf(4); // XBI open at this close
    const figures = forwardFiguresOf(result, cutoff, settings) as ForwardObserved;

    assert.notEqual(figures.observations, 0);

    const xbi = result.lots.find((lot) => lot.symbol === 'XBI')!;
    const carried = figures.lots.find((lot) => lot.carried)!;
    const last = result.daily.at(-1)!;

    assert.equal(figures.lotsCarried, 1);
    assert.equal(carried.symbol, 'XBI');
    assert.equal(figures.lotsNew, 1);
    assert.equal(figures.base.openLots.length, 1);
    assert.equal(figures.forwardNet, last.strategyMark - figures.base.strategyMark);
    assert.ok(Math.abs(carried.forwardPnl - (xbi.net - figures.base.unrealized)) < 1e-9);
    assert.ok(Math.abs(figures.lots.reduce((total, lot) => total + lot.forwardPnl, 0) - figures.forwardNet) < 1e-6);
    // Interest: what accrued before the cutoff plus the forward accrual is the whole run's.
    assert.ok(Math.abs(figures.base.cumulativeInterest + figures.forwardInterest - last.cumulativeInterest) < 1e-9);
    // Friction: the carried lot's entry fill is history; its exit and the new lot's fills are forward.
    const entry = (lot: typeof xbi) => lot.shares * (lot.entryPrice - lot.entryRawPrice);
    const exit = (lot: typeof xbi) => (lot.exitIndex >= 0 ? lot.shares * (lot.exitRawPrice - lot.exitPrice) : 0);
    const gdx = result.lots.find((lot) => lot.symbol === 'GDX')!;

    assert.ok(Math.abs(figures.forwardFriction - (exit(xbi) + entry(gdx) + exit(gdx))) < 1e-9);
    assert.ok(Math.abs(figures.borrowingDollarDays - (figures.forwardInterest * 365) / 0.11) < 1e-6);
  });

  test('the drawdown peak resets at the cutoff: history before it is excluded', async () => {
    const result = await scenario();
    const forward = forwardFiguresOf(result, dateOf(7), settings) as ForwardObserved; // after XBI's exit

    assert.notEqual(forward.observations, 0);

    assert.ok(result.minuteDrawdown.maximum > 0);
    assert.ok(
      forward.fixed!.minuteDrawdown < result.minuteDrawdown.maximum,
      'the XBI give-back before the cutoff is not a forward drawdown'
    );
    assert.equal(forward.lotsCarried, 0);
  });

  test('a cutoff on the last session has zero observations and no forward figure', async () => {
    const result = await scenario();
    const figures = forwardFiguresOf(result, result.universe.end, settings);

    assert.equal(figures.observations, 0);
    assert.equal('forwardNet' in figures, false);
  });

  test('matched borrowing interpolates the return at equal borrowing intensity and refuses to extrapolate', () => {
    const ladder = [
      { fraction: 0.1, borrowingIntensity: 1, forwardReturn: 0.01 },
      { fraction: 0.2, borrowingIntensity: 2, forwardReturn: 0.03 }
    ];
    const matched = matchedBorrowing(ladder, 1.5);

    assert.equal(matched.status, 'interpolated');
    assert.ok(Math.abs(matched.forwardReturn - 0.02) < 1e-12);
    assert.deepEqual(matched.between, [0.1, 0.2]);
    assert.equal(matchedBorrowing(ladder, 2.5).status, 'outside the ladder');
  });
});

const row = (time: string, price: number) => `"${time}",${price},${price},${price},${price},100`;

describe('snapshot checks', () => {
  test('NYSE sessions skip weekends and holidays; dates past the calendar are refused', () => {
    assert.deepEqual(nyseSessions('2026-11-25', '2026-11-30'), ['2026-11-25', '2026-11-27', '2026-11-30']);
    assert.deepEqual(nyseSessions('2026-10-14', '2026-10-16'), ['2026-10-14', '2026-10-15', '2026-10-16']);
    assert.throws(() => nyseSessions('2026-12-30', '2027-01-04'), /past the NYSE calendar/);
  });

  test('rows must be new, ordered and well-formed; regular-hours bars are counted in New York time', () => {
    const good = [
      row('2026-10-14T13:00:00Z', 10),
      row('2026-10-14T13:30:00Z', 10),
      row('2026-10-14T19:59:00Z', 11),
      row('2026-10-14T21:30:00Z', 11)
    ].join('\n');
    const parsed = parseSnapshotFile('VGT', good);

    assert.equal(parsed.rows, 4);
    assert.deepEqual(parsed.sessions, [
      { date: '2026-10-14', regularBars: 2, firstRegularOpen: 10, lastRegularClose: 11, lastRegularMinute: 959 }
    ]);
    assert.throws(() => parseSnapshotFile('VGT', row('2026-10-13T15:00:00Z', 10)), /not after the cutoff/);
    assert.throws(
      () => parseSnapshotFile('VGT', [row('2026-10-14T15:00:00Z', 10), row('2026-10-14T15:00:00Z', 10)].join('\n')),
      /strictly increase/
    );
    assert.throws(() => parseSnapshotFile('VGT', '2026-10-14,1,1,1,1,1'), /not "YYYY/);
    assert.throws(() => parseSnapshotFile('VGT', '"2026-10-14T15:00:00Z",10,9,10,10,1'), /inconsistent/);
  });

  test('a split-sized overnight move across the boundary is refused unless declared', () => {
    const sessions = [
      { date: '2026-10-14', regularBars: 390, firstRegularOpen: 12.6, lastRegularClose: 12.7, lastRegularMinute: 959 }
    ];
    const split = { symbol: 'VGT', effectiveDate: '2026-10-14', ratio: 8, source: 'test' };

    assert.deepEqual(undeclaredSplitMoves('VGT', sessions, 100, []), ['VGT 2026-10-14: -87.4% overnight']);
    assert.deepEqual(undeclaredSplitMoves('VGT', sessions, 100, [split]), []);
    assert.deepEqual(undeclaredSplitMoves('VGT', [{ ...sessions[0]!, firstRegularOpen: 101 }], 100, []), []);
    // A 5:4 split (−20%) is caught at ±15%; a genuine move can be confirmed explicitly.
    const gap = [{ ...sessions[0]!, firstRegularOpen: 80 }];

    assert.equal(undeclaredSplitMoves('VGT', gap, 100, []).length, 1);
    assert.deepEqual(undeclaredSplitMoves('VGT', gap, 100, [], 0.15, ['VGT:2026-10-14']), []);
  });
});

describe('snapshot distributions, the calendar rule and observation records', () => {
  const header = 'etf,ex_date,pay_date,amount,amount_method,ex_date_method,pay_date_method,close_before,source';
  const coverage = { VGT: '2026-10-24', VOOG: '2026-10-24' };

  test('distribution rows are validated against the frozen ledger coverage', () => {
    const good = `${header}\nVGT,2026-12-17,2026-12-21,0.15,published,published,published,130,issuer\n`;

    assert.deepEqual(distributionProblems(good, '2026-12-31', coverage), { problems: [], rows: 1 });

    const bad = [
      `${header}`,
      'XBI,2026-12-17,2026-12-19,0.15,p,p,p,130,x',
      'VGT,2026-09-23,2026-09-25,0.15,p,p,p,130,x',
      'VOOG,2026-12-17,2026-12-10,0.15,p,p,p,130,x',
      'VGT,2026-12-18,2026-12-19,-1,p,p,p,130,x',
      'VGT,2026-12-18,2026-12-19,0.2,p,p,p,130,x'
    ].join('\n');
    const { problems } = distributionProblems(bad, '2026-12-31', coverage);

    assert.ok(problems.some((problem) => /only VGT and VOOG/.test(problem)));
    assert.ok(problems.some((problem) => /inside the frozen ledger/.test(problem)));
    assert.ok(problems.some((problem) => /pay ≥ ex/.test(problem)));
    assert.ok(problems.some((problem) => /positive numbers/.test(problem)));
    assert.ok(problems.some((problem) => /duplicate VGT 2026-12-18/.test(problem)));
    assert.ok(distributionProblems(good, undefined, coverage).problems.some((problem) => /required/.test(problem)));
  });

  test('the calendar may only grow after its frozen coverage', () => {
    const frozen = calendarState();
    const extended = {
      coverage: { ...frozen.coverage, last: '2027-12-31' },
      holidays: [...frozen.holidays, '2027-01-01'],
      earlyCloses: frozen.earlyCloses
    };

    assert.deepEqual(calendarAppendOnlyFailures(frozen, frozen), []);
    assert.deepEqual(calendarAppendOnlyFailures(frozen, extended), []);
    assert.equal(calendarAppendOnlyFailures(frozen, { ...frozen, holidays: frozen.holidays.slice(1) }).length, 1);
    assert.equal(
      calendarAppendOnlyFailures(frozen, { ...frozen, earlyCloses: [...frozen.earlyCloses, '2026-12-31'] }).length,
      1
    );
    assert.equal(
      calendarAppendOnlyFailures(frozen, { ...frozen, coverage: { ...frozen.coverage, last: '2026-06-30' } }).length,
      1
    );
  });

  test('an observation record is written once and a later report must reproduce it', async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'observation-'));

    try {
      const file = path.join(dir, 'observations', 'x.json');
      const body = { schemaVersion: 1, observationCount: 3, pools: { B4: { forwardNet: 12.5 } } };

      assert.equal(await checkOrWriteObservation(file, body), 'written');
      assert.equal(await checkOrWriteObservation(file, body), 'reproduced');
      await assert.rejects(checkOrWriteObservation(file, { ...body, observationCount: 4 }), /does not reproduce/);
    } finally {
      await fs.remove(dir);
    }
  });
});

describe('second-review fixes', () => {
  test('the daily % drawdown is the largest percent fall, not the percent of the largest dollar fall', () => {
    // From 100: a 50% fall to 50, then a rise to 200 and a $60 (30%) fall to 140.
    const dd = drawdownFrom(100, [
      { value: 50, date: 'a' },
      { value: 200, date: 'b' },
      { value: 140, date: 'c' }
    ]);

    assert.equal(dd.dollars, 60);
    assert.equal(dd.peakDate, 'b');
    assert.equal(dd.percent, 0.5);
    assert.equal(dd.percentPeakDate, 'cutoff');
    assert.equal(dd.percentTroughDate, 'a');
  });

  test('every member must trade in the last 15 regular minutes, and no session may be on or after today', () => {
    const full = {
      date: '2026-10-14',
      regularBars: 390,
      firstRegularOpen: 10,
      lastRegularClose: 10,
      lastRegularMinute: 959
    };
    const ok = { VGT: [full], KRE: [full] };

    assert.deepEqual(completenessProblems(ok, ['2026-10-14'], '2026-10-15'), []);
    assert.match(
      completenessProblems(
        { VGT: [full], KRE: [{ ...full, lastRegularMinute: 720 }] },
        ['2026-10-14'],
        '2026-10-15'
      )[0]!,
      /KRE without a bar/
    );
    assert.match(completenessProblems(ok, ['2026-10-14'], '2026-10-14')[0]!, /not before today/);
    // An early close (2026-11-27, 1 p.m.) ends at 12:59.
    const early = { ...full, date: '2026-11-27', lastRegularMinute: 12 * 60 + 59 };

    assert.deepEqual(completenessProblems({ VGT: [early] }, ['2026-11-27'], '2026-12-01'), []);
  });

  test('the calendar hash ignores comments and date lines, and changes with the code', async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'calendar-'));

    try {
      const original = await fs.readFile('src/lib/calendar.ts', 'utf8');
      const extended = original
        .replace("  '2026-12-25'\n]);", "  '2026-12-25',\n  '2027-01-01', // New Year's Day\n  '2027-01-18'\n]);")
        .replace('2016 through 2026', '2016 through 2027')
        .replace("last: '2026-12-31'", "last: '2027-12-31'");
      const changed = original.replace('export const nyseHolidays', 'export const nyseHolidaysChanged');

      assert.notEqual(extended, original);
      await fs.writeFile(path.join(dir, 'extended.ts'), extended);
      await fs.writeFile(path.join(dir, 'changed.ts'), changed);
      assert.equal(await normalizedCalendarHash(path.join(dir, 'extended.ts')), await normalizedCalendarHash());
      assert.notEqual(await normalizedCalendarHash(path.join(dir, 'changed.ts')), await normalizedCalendarHash());
    } finally {
      await fs.remove(dir);
    }
  });

  test('matched borrowing: an exact or zero-borrowing match needs no interpolation', () => {
    const ladder = [
      { fraction: 0.05, borrowingIntensity: 0, forwardReturn: 0.004 },
      { fraction: 0.1, borrowingIntensity: 0, forwardReturn: 0.004 },
      { fraction: 0.2, borrowingIntensity: 2, forwardReturn: 0.03 }
    ];

    assert.deepEqual(matchedBorrowing(ladder, 0), { status: 'matched', forwardReturn: 0.004, between: [0.05] });
    assert.equal(matchedBorrowing(ladder, 2).status, 'matched');
  });

  test('distributions must be on NYSE sessions, plausible and after the frozen coverage; a declared split must explain the move', () => {
    const header = 'etf,ex_date,pay_date,amount,amount_method,ex_date_method,pay_date_method,close_before,source';
    const coverage = { VGT: '2026-10-24', VOOG: '2026-10-24' };
    const problems = (row: string, through: string) =>
      distributionProblems(`${header}\n${row}`, through, coverage).problems;

    assert.ok(
      problems('VGT,2026-12-19,2026-12-21,0.15,p,p,p,130,x', '2026-12-31').some((problem) =>
        /NYSE sessions/.test(problem)
      )
    );
    assert.ok(
      problems('VGT,2026-12-17,2026-12-21,9,p,p,p,130,x', '2026-12-31').some((problem) => /implausible/.test(problem))
    );
    assert.ok(
      problems('VGT,2026-12-17,2026-12-21,0.15,p,p,p,130,x', '2026-10-20').some((problem) =>
        /after the frozen coverage/.test(problem)
      )
    );

    const session = [
      { date: '2026-10-14', regularBars: 390, firstRegularOpen: 12.6, lastRegularClose: 12.7, lastRegularMinute: 959 }
    ];

    assert.deepEqual(
      undeclaredSplitMoves('VGT', session, 100, [
        { symbol: 'VGT', effectiveDate: '2026-10-14', ratio: 8, source: 'x' }
      ]),
      []
    );
    assert.match(
      undeclaredSplitMoves('VGT', session, 100, [
        { symbol: 'VGT', effectiveDate: '2026-10-14', ratio: 2, source: 'x' }
      ])[0]!,
      /does not explain/
    );
  });
});

describe('the prospective freeze', () => {
  test('is written once, and refuses a changed protocol, member vector or pool hash', async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'prospective-'));

    try {
      await fs.writeFile(path.join(dir, 'PROTOCOL.md'), 'protocol text\n');

      const b4 = await loadPool('B4');
      const b5 = await loadPool('B5');
      const books = (pool: LoadedPool, change = false) =>
        Object.fromEntries(
          pool.config.books.map((book, index) => [
            book.symbol,
            {
              phenotype: book.phenotype,
              parametersSha256: change && index === 0 ? '0'.repeat(64) : book.parametersSha256
            }
          ])
        );
      const body = {
        version: prospective.version,
        frozenAt: 'test',
        cutoff: prospective.cutoff,
        protocol: { file: path.join(dir, 'PROTOCOL.md'), sha256: await sha256File(path.join(dir, 'PROTOCOL.md')) },
        pools: {
          B4: { file: b4.config.file, fileSha256: 'x', configHash: b4.config.configHash, books: books(b4, true) },
          B5: { file: b5.config.file, fileSha256: 'x', configHash: 'f'.repeat(64), books: books(b5) }
        },
        code: await codeManifest(),
        data: { canonicalPins: {}, end: prospective.cutoff, marketEvents: {} },
        cutoffState: {},
        historicalBaseline: {}
      };

      await writeOnce(freezeFileOf(dir), body);
      await assert.rejects(writeOnce(freezeFileOf(dir), body), /written once/);

      let verified = await verifyProspectiveFreeze(dir);

      assert.equal(verified.frozen, true);
      assert.ok(verified.failures.some((failure) => /B4 VGT: the member vector changed/.test(failure)));
      assert.ok(verified.failures.some((failure) => /B5: the pool's algorithmic hash changed/.test(failure)));

      await fs.appendFile(path.join(dir, 'PROTOCOL.md'), 'edited\n');
      verified = await verifyProspectiveFreeze(dir);
      assert.ok(verified.failures.some((failure) => /changed after the freeze/.test(failure)));

      const sealed = await fs.readJson(freezeFileOf(dir));

      sealed.cutoff = '2026-10-20';
      await fs.writeJson(freezeFileOf(dir), sealed);
      await assert.rejects(verifyProspectiveFreeze(dir), /body hash does not verify/);
    } finally {
      await fs.remove(dir);
    }
  });
});
