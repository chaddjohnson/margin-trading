// The derived modules are transparent: for every compatible strategy file, the derived module with nothing
// injected, and with the file's own values injected explicitly (and the sessions loaded by the runner), gives
// exactly the original file's trades, fills and setups. An injected first eligible date stops every arming before
// it, and injected parameters do change the result. Runs on a 2019-01 → 2020-07 slice of the VGT minute file (every
// file trades in it), so it is skipped when the data is absent.
import assert from 'node:assert/strict';
import os from 'node:os';
import path from 'node:path';
import { after, before, describe, test } from 'node:test';
import { pathToFileURL } from 'node:url';
import fs from 'fs-extra';
import { groupMarketSessions, loadCsvMinuteBacktestData } from '#lib';
import type { BacktestPosition, MarketSession } from '#types';
import { type PreparedStrategy, type StrategyResult, prepareStrategy } from '../injection.ts';
import { compatibleStrategies, strategyFileOf } from '../strategies.ts';

const sourceFile = 'data/VGT/VGT-2016-2025-1-minute.csv';
const hasData = fs.existsSync(sourceFile);
let directory = '';
let dataFile = '';
let sessions: MarketSession[] = [];

const quietly = async <T>(run: () => Promise<T>) => {
  const info = console.info;

  console.info = () => {};

  try {
    return await run();
  } finally {
    console.info = info;
  }
};

// Everything the run decided, comparable with deepEqual.
const projection = (result: StrategyResult & { setups?: unknown[] }) =>
  result.positions.map((position: BacktestPosition) => ({
    position: { ...position },
    entry: result.entryFills.get(position),
    exit: result.exitFills.get(position),
    legs: result.legs?.get(position)
  }));

const run = async (module: { runAllIn: (options: never) => Promise<unknown> }) =>
  (await quietly(() => module.runAllIn({ symbol: 'VGT', dataFile, stopFill: 'stop' } as never))) as StrategyResult & {
    setups: unknown[];
  };

const reset = (prepared: PreparedStrategy) => {
  const injection = prepared.module.phenotypeInjection;

  injection.values = {};
  injection.sessions = undefined;
  injection.firstEligibleTime = -Infinity;
  injection.reads = {};
  injection.eligibilityChecks = 0;
};

describe('derived strategy modules', { skip: hasData ? false : `${sourceFile} is not present` }, () => {
  before(async () => {
    directory = await fs.mkdtemp(path.join(os.tmpdir(), 'phenotype-injection-'));
    dataFile = path.join(directory, 'VGT-slice.csv');

    const lines = (await fs.readFile(sourceFile, 'utf8'))
      .split('\n')
      .filter((line) => line >= '"2019-01' && line < '"2020-08');

    await fs.writeFile(dataFile, `${lines.join('\n')}\n`);
    sessions = groupMarketSessions(await loadCsvMinuteBacktestData('VGT', dataFile));
  });

  after(async () => {
    await fs.remove(directory);
  });

  for (const entry of compatibleStrategies) {
    test(`${entry.script}: identical to the original without injection, and with its own values injected`, async () => {
      const original = await import(pathToFileURL(path.resolve(strategyFileOf(entry.script))).href);
      const prepared = await prepareStrategy(entry);
      const expected = await run(original);
      const injection = prepared.module.phenotypeInjection;

      assert.ok(expected.positions.length > 0, 'the original trades in the slice, so the comparison is not vacuous');

      reset(prepared);

      const plain = await run(prepared.module);

      assert.deepEqual(projection(plain), projection(expected));
      assert.deepEqual(plain.setups, expected.setups);

      // Every injectable declaration is read once per run, and the guard is evaluated.
      assert.deepEqual(
        Object.keys(injection.reads).sort(),
        Object.keys(prepared.injectable).sort(),
        'every injectable constant is read'
      );
      assert.ok(Object.values(injection.reads).every((count) => count === 1));
      assert.ok(injection.eligibilityChecks > 0, 'the arming guard checks eligibility');

      reset(prepared);
      injection.values = Object.fromEntries(
        Object.entries(prepared.injectable).map(([name, constant]) => [name, constant.literal])
      );
      injection.sessions = sessions;

      const explicit = await run(prepared.module);

      assert.deepEqual(projection(explicit), projection(expected));
      assert.deepEqual(explicit.setups, expected.setups);

      // A first eligible date after the original's first entry removes it and arms nothing before it.
      reset(prepared);
      injection.firstEligibleTime = expected.positions[0]!.entryTimestamp + 86400;

      const eligible = await run(prepared.module);

      assert.ok(
        eligible.positions.every((position) => position.entryTimestamp >= injection.firstEligibleTime),
        'no entry before the first eligible date'
      );
      assert.ok(
        (eligible.setups as { activationDate: string }[]).every(
          (setup) => Date.parse(setup.activationDate) / 1000 >= injection.firstEligibleTime
        ),
        'no setup armed before the first eligible date'
      );
      reset(prepared);
    });
  }

  test('injected parameters change the result', async () => {
    const prepared = await prepareStrategy(compatibleStrategies[0]!);
    const baseline = await run(prepared.module);

    prepared.module.phenotypeInjection.values = { targetPercentChange: 0.1, tickWindowSize: 30 };

    const changed = await run(prepared.module);

    reset(prepared);
    assert.ok(baseline.positions.length > 0);
    assert.notDeepEqual(projection(changed), projection(baseline));
  });
});
