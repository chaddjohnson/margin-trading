// The same D1 phenotype through both evaluation paths across a recorded split: the standalone `--phenotype` runner
// (the strategy file, src/phenotype/run.ts) and the allocator's canonical `--dataset` path (the shadow book and the
// fixed ledger, src/multi-etf-allocator/dataset.ts). On one synthetic economy printed raw with VGT's 8:1 split of
// 2026-04-21 (the shipped registry), with a position held across the split, both paths must adjust the bars exactly
// once and agree on every entry and exit (session, minute, price), the shares, the interest and the net, and both
// must equal the same economy printed without a split.
import assert from 'node:assert/strict';
import os from 'node:os';
import path from 'node:path';
import { after, before, describe, test } from 'node:test';
import fs from 'fs-extra';
import { defaultPartitionConfigText, newYorkOffset, nyseHolidays, readSplits, resolveDataset } from '#lib';
import { executePhenotypeRun, planPhenotypeRun } from '../../phenotype/run.ts';
import { combinationOf } from '../context.ts';
import { type DistributionLedger, datasetRunConfig, loadDatasetUniverse } from '../dataset.ts';
import { baseRunConfig, runAllocator } from '../engine.ts';
import { resolveCombination } from '../phenotypes.ts';

const splitDate = '2026-04-21';
let root = '';

const tradingDates = () => {
  const dates: string[] = [];

  for (let time = Date.parse('2025-06-02T00:00:00Z'); time <= Date.parse('2026-06-30T00:00:00Z'); time += 86400000) {
    const date = new Date(time).toISOString().slice(0, 10);
    const day = new Date(time).getUTCDay();

    if (day !== 0 && day !== 6 && !nyseHolidays.has(date)) {
      dates.push(date);
    }
  }

  return dates;
};

// A rise, a 35% fall from 2026-04-01 that arms D1 and buys the rebound, a rally of 1% a session carried across the
// split, and a fall of 1.5% a session from 2026-06-01 that stops the position out.
const prices = (dates: string[]) => {
  const out: number[] = [];
  let price = 700;
  let peak = price;

  for (const date of dates) {
    if (date < '2026-04-01') {
      price += 0.5;
      peak = price;
    } else if (date < '2026-04-10') {
      price -= 0.05 * peak;
    } else if (date < '2026-06-01') {
      price *= 1.01;
    } else {
      price *= 0.985;
    }

    out.push(price);
  }

  return out;
};

// Minute rows printed raw: with `split`, prices ÷ 8 and volumes × 8 from the split date on.
const rows = (split: boolean) => {
  const dates = tradingDates();
  const lines: string[] = [];

  for (const [index, price] of prices(dates).entries()) {
    const date = dates[index]!;
    const ratio = split && date >= splitDate ? 8 : 1;
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

const ledger: DistributionLedger = {
  file: 'fixture',
  sha256: 'fixture',
  coverage: { VGT: '', VOOG: '' },
  distributions: []
};

before(async () => {
  root = await fs.mkdtemp(path.join(os.tmpdir(), 'allocator-cross-path-'));

  for (const dir of ['split', 'plain']) {
    await fs.outputFile(path.join(root, dir, 'partitions.json'), defaultPartitionConfigText);
    await fs.outputFile(path.join(root, dir, 'VGT', 'data.csv'), rows(dir === 'split'));
  }
});

after(async () => {
  await fs.remove(root);
});

interface PathTrade {
  entryDate: string;
  entryTime: number;
  entryPrice: number;
  shares: number;
  exitDate: string;
  exitTime: number;
  exitPrice: number;
  interest: number;
  net: number;
}

const day = (timestamp: number) => new Date(timestamp * 1000).toISOString().slice(0, 10);

// VGT primary (D1's shipped constants) through the strategy file.
const standalone = async (dataRoot: string): Promise<PathTrade[]> => {
  const plan = await planPhenotypeRun({
    script: 'allIn-trailingBuy-postExitContinuation',
    symbol: 'VGT',
    phenotype: 'primary',
    dataFile: 'all'
  });
  const dataset = resolveDataset('VGT', 'all', dataRoot);

  plan.dataset = dataset;
  plan.dataFile = { value: dataset.file, source: 'synthetic VGT all partition' };

  const run = await executePhenotypeRun(plan, { log: () => {}, quietStrategy: true });

  return run.result.positions.map((position) => {
    const entry = run.result.entryFills.get(position)!;
    const exit = run.result.exitFills.get(position)!;

    return {
      entryDate: day(position.entryTimestamp),
      entryTime: entry.time,
      entryPrice: position.entryPrice,
      shares: position.shares,
      exitDate: day(position.exitTimestamp!),
      exitTime: exit.time,
      exitPrice: position.exitPrice!,
      interest: position.interest!,
      net: position.profit!
    };
  });
};

// The same phenotype as the allocator's only book, fixed $100,000, on the canonical `all` path. The unsplit control
// economy is also named VGT, so it is read with no split recorded.
const allocator = async (dataRoot: string, splits = readSplits()): Promise<PathTrade[]> => {
  const combination = combinationOf('all-primary');
  const loaded = await loadDatasetUniverse({
    members: ['VGT'],
    partition: 'all',
    warmupSessions: 74,
    mode: 'fixed',
    root: dataRoot,
    ledger,
    splits
  });
  const config = baseRunConfig({
    key: 'cross-path',
    label: 'cross-path',
    mode: 'fixed',
    combination,
    phenotypes: await resolveCombination(combination),
    symbols: ['VGT']
  });
  const result = runAllocator(loaded.universe, datasetRunConfig(config, loaded));

  return result.lots.map((lot) => ({
    entryDate: loaded.universe.dates[lot.entryIndex]!,
    entryTime: lot.entryTime,
    entryPrice: lot.entryPrice,
    shares: lot.shares,
    exitDate: loaded.universe.dates[lot.exitIndex]!,
    exitTime: lot.exitTime,
    exitPrice: lot.exitPrice,
    interest: lot.interest,
    net: lot.net
  }));
};

const near = (a: number, b: number, label: string) =>
  assert.ok(Math.abs(a - b) <= 1e-9 * Math.max(1, Math.abs(a), Math.abs(b)), `${label}: ${a} vs ${b}`);

const assertSame = (actual: PathTrade[], expected: PathTrade[], label: string) => {
  assert.equal(actual.length, expected.length, `${label}: trade count`);
  actual.forEach((trade, index) => {
    const other = expected[index]!;

    assert.equal(trade.entryDate, other.entryDate, `${label} ${index}: entry session`);
    assert.equal(trade.entryTime, other.entryTime, `${label} ${index}: entry minute`);
    assert.equal(trade.exitDate, other.exitDate, `${label} ${index}: exit session`);
    assert.equal(trade.exitTime, other.exitTime, `${label} ${index}: exit minute`);

    for (const key of ['entryPrice', 'shares', 'exitPrice', 'interest', 'net'] as const) {
      near(trade[key], other[key], `${label} ${index} ${key}`);
    }
  });
};

describe('one D1 phenotype through the standalone and allocator paths across a split', () => {
  test('the registry splits VGT 8:1 on the economy’s split date', () => {
    assert.ok(readSplits().some((split) => split.symbol === 'VGT' && split.effectiveDate === splitDate));
  });

  test('both paths agree trade for trade, adjust once, and equal the unsplit economy', async () => {
    const splitStandalone = await standalone(path.join(root, 'split'));
    const splitAllocator = await allocator(path.join(root, 'split'));
    const plainAllocator = await allocator(path.join(root, 'plain'), []);
    const splitTime = Date.parse(`${splitDate}T13:30:00Z`) / 1000;

    assert.ok(
      splitStandalone.some((trade) => trade.entryTime < splitTime && trade.exitTime > splitTime),
      'a position is held across the split'
    );
    assert.ok(splitStandalone[0]!.exitPrice > 400, 'priced in pre-split units (adjusted once, not twice)');
    assertSame(splitAllocator, splitStandalone, 'allocator vs standalone');
    assertSame(splitAllocator, plainAllocator, 'split vs unsplit economy');
  });
});
