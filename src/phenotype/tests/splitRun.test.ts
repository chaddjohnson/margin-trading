// A phenotype run on a partition that spans a recorded split (`allIn-trailingBuy-postExitContinuation VGT all
// --phenotype primary` across VGT's 8:1 split of 2026-04-21), on synthetic bars in a temporary data root: the runner
// injects the raw sessions through the window's end, the strategy forward-adjusts them once, and the split makes no
// setup. Regression: the runner once cut the injected sessions by object identity, which the adjusted copies broke.
// A second economy holds a position across the split, which the real VGT history never does (D1 primary is flat from
// 2026-02-05): the split run must equal, trade for trade and mark for mark, the same economy printed without a split
// (docs/vgt-d1-primary-discrepancy.md).
import assert from 'node:assert/strict';
import os from 'node:os';
import path from 'node:path';
import { after, before, describe, test } from 'node:test';
import fs from 'fs-extra';
import { defaultPartitionConfigText, newYorkOffset, nyseHolidays, resolveDataset } from '#lib';
import { executePhenotypeRun, planPhenotypeRun } from '../run.ts';

const script = 'allIn-trailingBuy-postExitContinuation';
const splitDate = '2026-04-21';
let root = '';

// An economy's calendar and its recorded split: VGT 8:1 on 2026-04-21 by default; XOP's 1:4 reverse split of
// 2020-03-30 (ratio 0.25 new shares per old share) for the reverse case.
interface Economy {
  from: string;
  to: string;
  splitDate: string;
  ratio: number;
  dip: { start: string; end: string; rallyEnd: string }; // the fall, the rally carried across the split, its end
}

const vgtEconomy: Economy = {
  from: '2025-06-02',
  to: '2026-06-30',
  splitDate,
  ratio: 8,
  dip: { start: '2026-04-01', end: '2026-04-10', rallyEnd: '2026-06-01' }
};
const xopEconomy: Economy = {
  from: '2019-04-01',
  to: '2020-06-30',
  splitDate: '2020-03-30',
  ratio: 0.25,
  dip: { start: '2020-03-02', end: '2020-03-11', rallyEnd: '2020-05-01' }
};

const tradingDates = ({ from, to }: Economy = vgtEconomy) => {
  const dates: string[] = [];

  for (let time = Date.parse(`${from}T00:00:00Z`); time <= Date.parse(`${to}T00:00:00Z`); time += 86400000) {
    const date = new Date(time).toISOString().slice(0, 10);
    const day = new Date(time).getUTCDay();

    if (day !== 0 && day !== 6 && !nyseHolidays.has(date)) {
      dates.push(date);
    }
  }

  return dates;
};

// A steady rise from 2025-06-02 to 2026-06-30.
const steadyRise = (dates: string[]) => dates.map((_, index) => 700 + 0.5 * (index + 1));

// A rise, a 30% fall (April 2026 for VGT) that arms and fills a deep trailing buy before the split, a rally carried
// across it, and a fall (June) that stops the position out after it.
const dipAcrossSplit = (dates: string[], { dip }: Economy = vgtEconomy) => {
  const prices: number[] = [];
  let price = 700;
  let peak = price;

  for (const date of dates) {
    if (date < dip.start) {
      price += 0.5;
      peak = price;
    } else if (date < dip.end) {
      price -= 0.05 * peak;
    } else if (date < dip.rallyEnd) {
      price *= 1.01;
    } else {
      price *= 0.985;
    }

    prices.push(price);
  }

  return prices;
};

// The economy as minute rows, printed raw: with `split`, from the split date on, prices ÷ ratio and volumes × ratio
// (VGT from 2026-04-21: ÷ 8 and × 8; XOP from 2020-03-30: × 4 and ÷ 4).
const rows = (prices: (dates: string[], economy: Economy) => number[], split: boolean, economy = vgtEconomy) => {
  const dates = tradingDates(economy);
  const lines: string[] = [];

  for (const [index, price] of prices(dates, economy).entries()) {
    const date = dates[index]!;
    const ratio = split && date >= economy.splitDate ? economy.ratio : 1;
    const offset = newYorkOffset(Date.parse(`${date}T16:00:00Z`) / 1000);

    for (const minute of [9 * 60 + 30, 12 * 60, 15 * 60 + 59, 16 * 60]) {
      const stamp = new Date((Date.parse(`${date}T00:00:00Z`) / 1000 + minute * 60 - offset) * 1000).toISOString();

      lines.push(
        `"${stamp.replace('.000', '')}",${price / ratio},${(price + 0.2) / ratio},${(price - 0.2) / ratio},${price / ratio},${1000 * ratio}`
      );
    }
  }

  return `${lines.join('\n')}\n`;
};

before(async () => {
  root = await fs.mkdtemp(path.join(os.tmpdir(), 'phenotype-split-'));
  await fs.writeFile(path.join(root, 'partitions.json'), defaultPartitionConfigText);
  await fs.outputFile(path.join(root, 'VGT', 'data.csv'), rows(steadyRise, true));
  await fs.outputFile(path.join(root, 'held', 'VGT', 'data.csv'), rows(dipAcrossSplit, true));
  await fs.outputFile(path.join(root, 'held', 'NOSPLIT', 'data.csv'), rows(dipAcrossSplit, false));
  await fs.writeFile(path.join(root, 'held', 'partitions.json'), defaultPartitionConfigText);
  await fs.outputFile(path.join(root, 'reverse', 'XOP', 'data.csv'), rows(dipAcrossSplit, true, xopEconomy));
  await fs.outputFile(path.join(root, 'reverse', 'NOSPLIT', 'data.csv'), rows(dipAcrossSplit, false, xopEconomy));
  // XOP's raw bytes under a name no recorded split covers: the reverse split read as a price jump.
  await fs.outputFile(path.join(root, 'reverse', 'UNREGISTERED', 'data.csv'), rows(dipAcrossSplit, true, xopEconomy));
  await fs.writeFile(path.join(root, 'reverse', 'partitions.json'), defaultPartitionConfigText);
});

after(async () => {
  await fs.remove(root);
});

// VGT's primary phenotype run on a synthetic `all` partition. `symbol` is the series' name, so the control series,
// which no recorded split names, is run with VGT's parameters and nothing adjusted.
const runOn = async (dataRoot: string, symbol = 'VGT') => {
  const plan = await planPhenotypeRun({ script, symbol: 'VGT', phenotype: 'primary', dataFile: 'all' });
  const dataset = resolveDataset(symbol, 'all', dataRoot);

  plan.request.symbol = symbol;
  plan.dataset = dataset;
  plan.dataFile = { value: dataset.file, source: `synthetic ${symbol} all partition` };

  return executePhenotypeRun(plan, { log: () => {}, quietStrategy: true });
};

describe('a phenotype run across a split', () => {
  test('injects the raw sessions, adjusts them once, and the split makes no setup', async () => {
    const run = await runOn(root);

    assert.equal(run.dataset.allSessions.length, run.dataset.simulated.length, 'every session through the window end');
    assert.ok(run.dataset.allSessions.length > 200);
    assert.deepEqual(run.dataset.window!.splitAdjustments, [{ symbol: 'VGT', effectiveDate: '2026-04-21', ratio: 8 }]);

    const raw = run.dataset.allSessions.at(-1)!;
    const adjusted = run.result.sessions.at(-1)!;

    assert.equal(raw.date, '2026-06-30');
    assert.ok(Math.abs(adjusted.close - raw.close * 8) < 1e-9, 'adjusted once, by the strategy');
    assert.equal(run.result.sessions.length, run.dataset.simulated.length);
    assert.equal(run.result.positions.length, 0, 'a steady rise: no trade, and the split is no dip');
    assert.equal((run.result as unknown as { setups: unknown[] }).setups.length, 0);
  });

  test('a position held across the split equals the same economy without one', async () => {
    const split = await runOn(path.join(root, 'held'));
    const control = await runOn(path.join(root, 'held'), 'NOSPLIT');
    const splitTime = Date.parse(`${splitDate}T13:30:00Z`) / 1000;

    assert.deepEqual(split.dataset.window!.splitAdjustments, [{ symbol: 'VGT', effectiveDate: splitDate, ratio: 8 }]);
    assert.deepEqual(control.dataset.window!.splitAdjustments, []);

    const held = control.result.positions.filter(
      (position) => position.entryTimestamp < splitTime && (position.exitTimestamp ?? Infinity) > splitTime
    );

    assert.equal(held.length, 1, 'the control holds one position across the split date');
    assert.ok(held[0]!.exitTimestamp !== undefined && held[0]!.profit! > 0, 'and closes it after, at a profit');

    // Entry and exit prices, shares (in the run's first-session units), stops and net profit: identical.
    const trades = (run: typeof split) =>
      run.result.positions.map((position) => ({
        ...position,
        symbol: undefined, // the series name
        entry: run.result.entryFills.get(position),
        exit: run.result.exitFills.get(position)
      }));

    assert.deepEqual(trades(split), trades(control));
    assert.ok(split.result.positions[0]!.exitPrice! > 400, 'the exit is priced in pre-split share units');
    // Every state transition, episode and setup (reference highs, trigger levels, trailing lows), the replayed marks,
    // and the periods' net, interest and minute and daily drawdowns.
    const states = (run: typeof split) => {
      const { stateLog, episodes, setups } = run.result as unknown as Record<string, unknown[]>;

      return { stateLog, episodes, setups };
    };

    assert.ok(states(control).setups!.length >= 1);
    assert.deepEqual(states(split), states(control));
    assert.deepEqual(split.report.accounting, control.report.accounting);
    assert.deepEqual(split.report.periods, control.report.periods);

    // The volumes are the only other field the adjustment touches: ÷ 8, so dollar volume is unchanged.
    const index = split.result.sessions.findIndex((session) => session.date === splitDate);

    assert.equal(split.result.sessions[index]!.volume, control.result.sessions[index]!.volume);
    assert.equal(split.dataset.allSessions[index]!.volume, control.result.sessions[index]!.volume * 8);
  });

  test('a position held across a 1:4 reverse split (XOP, 2020-03-30) equals the same economy without one', async () => {
    const dir = path.join(root, 'reverse');
    const split = await runOn(dir, 'XOP');
    const control = await runOn(dir, 'NOSPLIT');
    const raw = await runOn(dir, 'UNREGISTERED');
    const splitTime = Date.parse(`${xopEconomy.splitDate}T13:30:00Z`) / 1000;
    const spanning = (run: typeof split) =>
      run.result.positions.filter(
        (position) => position.entryTimestamp < splitTime && (position.exitTimestamp ?? Infinity) > splitTime
      );

    assert.deepEqual(split.dataset.window!.splitAdjustments, [
      { symbol: 'XOP', effectiveDate: '2020-03-30', ratio: 0.25 }
    ]);
    assert.deepEqual(control.dataset.window!.splitAdjustments, []);
    assert.equal(spanning(control).length, 1, 'the control holds one position across the split date');
    assert.ok(spanning(control)[0]!.exitTimestamp !== undefined, 'and closes it after');

    const trades = (run: typeof split) =>
      run.result.positions.map((position) => ({
        ...position,
        symbol: undefined,
        entry: run.result.entryFills.get(position),
        exit: run.result.exitFills.get(position)
      }));
    const states = (run: typeof split) => {
      const { stateLog, episodes, setups } = run.result as unknown as Record<string, unknown[]>;

      return { stateLog, episodes, setups };
    };

    // Same fills, shares (in the units of the run's first session), stops, setups, marks, interest and drawdowns.
    assert.deepEqual(trades(split), trades(control));
    assert.deepEqual(states(split), states(control));
    assert.deepEqual(split.report.accounting, control.report.accounting);
    assert.deepEqual(split.report.periods, control.report.periods);

    // Volumes × 4 after a 1:4 reverse split, so dollar volume is unchanged; the raw file printed them ÷ 4.
    const index = split.result.sessions.findIndex((session) => session.date === xopEconomy.splitDate);

    assert.equal(split.result.sessions[index]!.volume, control.result.sessions[index]!.volume);
    assert.equal(split.dataset.allSessions[index]!.volume * 4, control.result.sessions[index]!.volume);

    // Without the registry entry the same bytes book the reverse split as a gain of about 300% on the held position.
    const artifact = spanning(raw)[0]!;
    const genuine = spanning(control)[0]!;

    assert.equal(raw.dataset.window!.splitAdjustments.length, 0);
    assert.equal(artifact.entryTimestamp, genuine.entryTimestamp, 'the entry precedes the split either way');
    assert.ok(artifact.profit! > 2 * 100000, `raw prices book ${artifact.profit} on a $100,000 position`);
    assert.ok(genuine.profit! < 100000, `the economy itself earns ${genuine.profit}`);
  });
});
