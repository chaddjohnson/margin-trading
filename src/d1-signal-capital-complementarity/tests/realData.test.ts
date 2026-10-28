// On the local canonical data (skipped when it is absent or changed; PROTOCOL.md §10.1): first-order bookkeeping can
// get the sign of a pooled increment wrong (View U XOP added to B4 on the training era — the published case), the doors
// refuse post-cap ends before reading, XOP's 1:4 reverse split is forward-adjusted (no fake +287% gain), repeated runs
// give identical ledgers, and the protected inputs are unchanged.
import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import fs from 'fs-extra';
import { vgtPrimaryGrid } from '../context.ts';
import { loadUniverse, readUniverseRecord } from '../doors.ts';
import { runBooks } from '../engine.ts';
import { classify, firstOrderOf } from '../gate.ts';
import { fundedGateTrades, gateTradeOf, tradeRecordsOf } from '../ledger.ts';
import { protectedManifest, protectedOk, sha256, sha256File } from '../records.ts';
import { attributionOf, gateCheck } from '../replay.ts';
import { standaloneRun } from '../runs.ts';
import { bookOf, incumbentBooks } from '../sources.ts';

const dataPresent = async () => {
  const record = await readUniverseRecord();

  for (const symbol of ['VGT', 'XBI', 'XRT', 'KRE', 'XOP']) {
    const file = `data/${symbol}/data.csv`;

    if (!(await fs.pathExists(file)) || (await sha256File(file)) !== record.symbols[symbol]!.dataSha256) {
      return false;
    }
  }

  return true;
};

describe('on the canonical data', async () => {
  const present = await dataPresent();

  test(
    'first-order Δ and the full-path Δ differ in sign (View U XOP added to B4, training era, 5 bps)',
    { skip: !present },
    async () => {
      const { loaded } = await loadUniverse(['VGT', 'XBI', 'XRT', 'KRE', 'XOP'], '2023-12-29', ['U', 'I']);
      const universe = loaded.universe;
      const { phenotypes } = await incumbentBooks('B4');
      const base = runBooks(universe, phenotypes, { key: 'B4', mode: 'fixed', costBps: 5 });
      const book = bookOf('XOP', 'U', { ...vgtPrimaryGrid });
      const scenario = runBooks(universe, { ...phenotypes, XOP: book }, { key: 'B4+XOP', mode: 'fixed', costBps: 5 });

      gateCheck(universe, scenario, 5);

      const solo = tradeRecordsOf(
        universe,
        runBooks(universe, { XOP: book }, { key: 'XOP', mode: 'fixed', costBps: 5 }),
        5
      );
      const firstOrder = firstOrderOf(
        classify(solo.map(gateTradeOf), fundedGateTrades(tradeRecordsOf(universe, base, 5)))
      );
      const full = attributionOf(base, scenario, 'XOP', 5);

      assert.ok(Math.abs(full.delta - 48198.6) < 0.5, `full-path Δ ${full.delta} (published +$48,199)`);
      assert.ok(firstOrder.delta < 0, `first-order Δ ${firstOrder.delta} is negative`);

      const a = sha256(JSON.stringify(standaloneRun(universe, book)));
      const b = sha256(JSON.stringify(standaloneRun(universe, book)));

      assert.equal(a, b, 'repeated runs give identical ledgers');

      const xop = universe.instruments.XOP!.ds;
      const s = xop.dates.indexOf('2020-03-30');

      assert.ok(Math.abs(xop.sOpen[s]! / xop.sClose[s - 1]! - 1) < 0.4, 'XOP 2020-03-30 forward-adjusted');
    }
  );

  test('the doors refuse post-cap ends before reading', async () => {
    await assert.rejects(loadUniverse(['VGT'], '2024-01-02', ['U']), /refused/);
    await assert.rejects(loadUniverse(['VGT'], '2022-01-03', ['P-A']), /refused/);
    await assert.rejects(loadUniverse(['VGT'], '2024-01-02', ['I']), /refused/);
    await assert.rejects(loadUniverse(['GDXJ'], '2023-12-29', ['U']), /not in the audited/);
  });

  // Correction C2: the minute optimizer's golden-master test (src/minute-optimizer/tests) writes and removes scratch
  // files under research/vgt-minute-optimizer/tmp/ while the full suite runs concurrently; they are another test's
  // transient output, not a change to a protected input.
  test('the protected inputs are unchanged', { skip: !present }, async () => {
    const manifest = await protectedManifest();
    const transient = (file: string) => file.startsWith('research/vgt-minute-optimizer/tmp/');

    assert.ok(
      protectedOk({
        ...manifest,
        untrackedOutsideStudy: manifest.untrackedOutsideStudy.filter((file) => !transient(file))
      })
    );
  });
});
