// The data doors on fixture CSVs through the real loader (PROTOCOL.md §4.4, §18): a window's training door never reads
// past its search end — mutating every bar after the cutoff leaves the loaded bars' hash, a book's standalone metrics
// and the pool replay identical, while mutating one bar before the cutoff changes them; and the validation door
// refuses to open before the fold's sealed picks exist.
import assert from 'node:assert/strict';
import os from 'node:os';
import path from 'node:path';
import { after, before, describe, test } from 'node:test';
import fs from 'fs-extra';
import { defaultPartitionConfigText, newYorkOffset, nyseHolidays } from '#lib';
import { allocationOf } from '../allocation.ts';
import { loadedBarsHash, trainingUniverse, validationUniverse } from '../data.ts';
import { buildTrace, replayRequest, standaloneOf } from '../evaluate.ts';
import { traceWindowOf } from '../evaluator.ts';
import { vectorOf } from '../space.ts';

const members = ['AAA', 'BBB'];

// Minute rows 2019-06-03 → 2020-12-31: a drift with periodic 12% dips (so the test vector trades), four bars a day.
const rows = (symbol: string, mutateFrom?: string, mutateOne?: string) => {
  const lines: string[] = [];
  let price = 100;
  let day = 0;

  for (let time = Date.parse('2019-06-03T00:00:00Z'); time <= Date.parse('2020-12-31T00:00:00Z'); time += 86400000) {
    const date = new Date(time).toISOString().slice(0, 10);
    const weekday = new Date(time).getUTCDay();

    if (weekday === 0 || weekday === 6 || nyseHolidays.has(date)) {
      continue;
    }

    day++;
    price = day % 37 === (symbol === 'AAA' ? 5 : 20) ? price * 0.88 : price * (1 + (day % 5 === 0 ? -0.004 : 0.003));

    const factor = (mutateFrom && date > mutateFrom) || date === mutateOne ? 1.37 : 1;
    const at = (hour: number, minute: number) => {
      const local =
        Date.parse(`${date}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00Z`) / 1000;

      return `"${new Date((local - newYorkOffset(Date.parse(`${date}T16:00:00Z`) / 1000)) * 1000).toISOString().replace('.000', '')}"`;
    };

    for (const [hour, minute, move] of [
      [9, 30, 0],
      [11, 0, -0.01],
      [13, 0, 0.012],
      [15, 59, 0.002]
    ] as const) {
      const p = price * (1 + move) * factor;

      lines.push(`${at(hour, minute)},${p},${p * 1.001},${p * 0.999},${p},1000`);
    }
  }

  return `${lines.join('\n')}\n`;
};

const roots: Record<string, string> = {};

const write = async (name: string, mutateFrom?: string, mutateOne?: string) => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), `ranked-preemption-${name}-`));

  await fs.writeFile(path.join(dir, 'partitions.json'), defaultPartitionConfigText);

  for (const symbol of members) {
    await fs.outputFile(path.join(dir, symbol, 'data.csv'), rows(symbol, mutateFrom, mutateOne));
  }

  roots[name] = dir;
};

before(async () => {
  await write('plain');
  await write('after', '2020-06-30');
  await write('inside', undefined, '2020-03-10');
});

after(async () => {
  for (const dir of Object.values(roots)) {
    await fs.remove(dir);
  }
});

const vector = vectorOf(
  {
    targetPercentChange: 100,
    trailingBuyPercentage: 5,
    trailingStopPercentage: 50,
    maximumHoldDays: 10,
    tickWindowSize: 20,
    intradayLossBuffer: 30,
    pullback: 50,
    continuationWindow: 20
  },
  'leakage-test'
);

const evaluateRoot = async (root: string) => {
  const loaded = await trainingUniverse('fold-a', { root, symbols: members });
  const window = traceWindowOf(loaded);
  const books = members.map((symbol) => ({ symbol, vector }));
  const traces = books.map((book) => buildTrace(loaded.universe.instruments[book.symbol]!.ds, book, 5, window));
  const standalone = members.map((symbol, index) =>
    standaloneOf(loaded.universe.instruments[symbol]!.ds, traces[index]!, vector.grid, 1)
  );
  const pool = replayRequest(
    { books, costBps: 5, allocation: allocationOf('P1', { rankingId: 'test', order: ['BBB', 'AAA'] }) },
    books.map((book, index) => ({
      symbol: book.symbol,
      ds: loaded.universe.instruments[book.symbol]!.ds,
      trace: traces[index]!
    })),
    window,
    loaded.universe.dates,
    0
  ).metrics;

  return { loaded, hashes: members.map((symbol) => loadedBarsHash(loaded, symbol)), standalone, pool };
};

describe('the training door', () => {
  test('bars after the search end cannot change what a window reads or computes', async () => {
    const plain = await evaluateRoot(roots.plain!);
    const after = await evaluateRoot(roots.after!);
    const inside = await evaluateRoot(roots.inside!);

    assert.equal(plain.loaded.universe.end, '2020-06-30');
    assert.ok(
      plain.standalone.every((metrics) => metrics.trades > 0),
      'the fixture vector trades'
    );
    assert.deepEqual(after.hashes, plain.hashes, 'post-cutoff mutation: identical loaded bars');
    assert.deepEqual(after.standalone, plain.standalone, 'identical standalone metrics');
    assert.deepEqual(after.pool, plain.pool, 'identical pool metrics');
    assert.notDeepEqual(inside.hashes, plain.hashes, 'a pre-cutoff mutation is visible');
  });

  test('the validation door refuses before the fold’s picks are sealed', async () => {
    await assert.rejects(
      () => validationUniverse('fold-a', members, { root: roots.plain!, picks: path.join(roots.plain!, 'PICKS.json') }),
      /does not exist/
    );
  });
});
