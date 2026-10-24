// A phenotype run on a partition that spans a recorded split (`allIn-trailingBuy-postExitContinuation VGT all
// --phenotype primary` across VGT's 8:1 split of 2026-04-21), on synthetic bars in a temporary data root: the runner
// injects the raw sessions through the window's end, the strategy forward-adjusts them once, and the split makes no
// setup. Regression: the runner once cut the injected sessions by object identity, which the adjusted copies broke.
import assert from 'node:assert/strict';
import os from 'node:os';
import path from 'node:path';
import { after, before, describe, test } from 'node:test';
import fs from 'fs-extra';
import { defaultPartitionConfigText, newYorkOffset, nyseHolidays, resolveDataset } from '#lib';
import { executePhenotypeRun, planPhenotypeRun } from '../run.ts';

const script = 'allIn-trailingBuy-postExitContinuation';
let root = '';

// A steady rise from 2025-06-02 to 2026-06-30, printed raw: from 2026-04-21 on, prices ÷ 8 and volumes × 8.
const rows = () => {
  const lines: string[] = [];
  let price = 700;

  for (let time = Date.parse('2025-06-02T00:00:00Z'); time <= Date.parse('2026-06-30T00:00:00Z'); time += 86400000) {
    const date = new Date(time).toISOString().slice(0, 10);
    const day = new Date(time).getUTCDay();

    if (day === 0 || day === 6 || nyseHolidays.has(date)) {
      continue;
    }

    price += 0.5;

    const ratio = date >= '2026-04-21' ? 8 : 1;
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
  await fs.outputFile(path.join(root, 'VGT', 'data.csv'), rows());
});

after(async () => {
  await fs.remove(root);
});

describe('a phenotype run across a split', () => {
  test('injects the raw sessions, adjusts them once, and the split makes no setup', async () => {
    const plan = await planPhenotypeRun({ script, symbol: 'VGT', phenotype: 'primary', dataFile: 'all' });
    const dataset = resolveDataset('VGT', 'all', root);

    // The same partition, read from the synthetic root.
    plan.dataset = dataset;
    plan.dataFile = { value: dataset.file, source: 'synthetic VGT all partition' };

    const run = await executePhenotypeRun(plan, { log: () => {}, quietStrategy: true });

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
});
