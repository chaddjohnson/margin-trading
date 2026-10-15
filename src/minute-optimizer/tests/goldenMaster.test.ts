// The protected originals are unchanged, and a reduced golden master: the original allIn.ts against the
// working copy at its own constants on the full range (byte-identical outputs and console lines), a few
// variants of the original, and the fast engine against the working copy on random vectors.
import assert from 'node:assert/strict';
import { after, before, describe, test } from 'node:test';
import fs from 'fs-extra';
import path from 'node:path';
import type { MarketSession } from '#types';
import { incumbentParams } from '../../app/allIn-minute-optimizable.ts';
import { type MinuteDataset, buildDataset, defaultDataFile, loadSessions, sha256File } from '../data.ts';
import {
  cornerVectors,
  engineWindows,
  goldenVectors,
  runEngineCase,
  runFileCase,
  verifyProtectedFiles
} from '../goldenMaster.ts';

const scratch = 'research/vgt-minute-optimizer/tmp/golden-master-test';
let sessions: MarketSession[];
let research: MarketSession[];
let researchData: MinuteDataset;

before(async () => {
  sessions = await loadSessions(defaultDataFile);
  research = sessions.filter((session) => session.date <= '2023-12-31');
  researchData = buildDataset(research, 'VGT', await sha256File(defaultDataFile));
});

after(async () => {
  await fs.remove(scratch);
});

describe('golden master', () => {
  test('src/app/allIn.ts and src/app/allin-original.ts are byte-for-byte unchanged', async () => {
    const results = await verifyProtectedFiles();

    assert.ok(results.every((result) => result.unchanged));
  });

  test('the working copy reproduces allIn.ts on the full range: 171 trades, $203,405 net', async () => {
    const result = await runFileCase(
      {
        name: 'test-default-full',
        dataFile: defaultDataFile,
        startDate: '2016-10-07',
        endDate: '2025-10-13',
        stopFill: 'stop'
      },
      scratch,
      async () => sessions
    );

    assert.deepEqual(result.differences, []);
    assert.equal(result.trades, 171);
    assert.equal(Math.round(result.netProfit), 203405);
  });

  test('variants of the original match the working copy away from the defaults', async () => {
    for (const [index, params] of [...cornerVectors().slice(0, 2), ...goldenVectors(77, 2)].entries()) {
      const window = engineWindows[index]!;
      const result = await runFileCase(
        {
          name: `test-variant-${index}`,
          dataFile: defaultDataFile,
          startDate: window.startDate,
          endDate: window.endDate,
          stopFill: index % 2 ? 'next-open' : 'stop',
          params
        },
        scratch,
        async () => sessions
      );

      assert.deepEqual(result.differences, [], `variant ${index}`);
    }
  });

  test('the fast engine matches the working copy trade for trade on random vectors and windows', async () => {
    for (const [index, params] of [incumbentParams, ...goldenVectors(78, 12)].entries()) {
      const window = engineWindows[index % engineWindows.length]!;
      const result = await runEngineCase(research, researchData, {
        name: `test-engine-${index}`,
        params,
        startDate: window.startDate,
        endDate: window.endDate,
        warmup: index % 2 === 0,
        stopFill: index % 3 === 0 ? 'next-open' : 'stop'
      });

      assert.deepEqual(result.differences, [], `${result.name}: ${path.basename(window.startDate)}`);
    }
  });
});
