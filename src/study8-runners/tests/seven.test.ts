// The seven named strategies of the runner brief resolve to the exact sealed Study 8 F24 role holders and the frozen
// B1/B5 controls: alias → sealed ID, training rank, role, book count, parameter vector, research config. Reads the
// sealed records and configurations only (no market data, no engine run).
import assert from 'node:assert/strict';
import { test } from 'node:test';
import fs from 'fs-extra';
import { frozenSelectionFile } from '../../study8-expanded-regime-d1/context.ts';
import { UsageError } from '../aliases.ts';
import { resolveAlias } from '../resolve.ts';

const seven = [
  { alias: 's8-vg-profit', best: 's8-vg-best', rank: 1, track: 'VG', role: 'profit', books: 2, config: 'S8-VG-F24-1' },
  { alias: 's8-vg-balanced', best: null, rank: 2, track: 'VG', role: 'balanced', books: 2, config: 'S8-VG-F24-3' },
  {
    alias: 's8-vxrg-profit',
    best: 's8-vxrg-best',
    rank: 3,
    track: 'VXRG',
    role: 'profit',
    books: 4,
    config: 'S8-VXRG-F24-1'
  },
  {
    alias: 's8-vxrkg-profit',
    best: 's8-vxrkg-best',
    rank: 8,
    track: 'VXRKG',
    role: 'profit',
    books: 5,
    config: 'S8-VXRKG-F24-1'
  },
  {
    alias: 's8-vxr-profit',
    best: 's8-vxr-best',
    rank: 15,
    track: 'VXR',
    role: 'profit',
    books: 3,
    config: 'S8-VXR-F24-1'
  }
] as const;

interface Ranked {
  rank: number;
  track: string;
  role: string;
  id: string;
  books: Record<string, Record<string, number>>;
}

test('the five Study 8 aliases are the sealed F24 role holders of ranks 1, 2, 3, 8 and 15', async () => {
  const selection = (await fs.readJson(frozenSelectionFile)) as { rankedByFold: { F24: Ranked[] } };

  for (const want of seven) {
    const sealed = selection.rankedByFold.F24.find((row) => row.rank === want.rank)!;
    const resolved = await resolveAlias(want.alias);

    assert.equal(sealed.track, want.track);
    assert.equal(sealed.role, want.role);
    assert.equal(resolved.sealedId, sealed.id, want.alias);
    assert.equal(resolved.rank, want.rank);
    assert.equal(resolved.study8.role, want.role);
    assert.equal(resolved.study8.testStatus, 'pass');
    assert.equal(Object.keys(resolved.books).length, want.books);
    assert.ok(resolved.configFile.endsWith(`${want.config}.json`), resolved.configFile);
    assert.equal(resolved.sealed?.ledgerSealed, true, 'a sealed funded-lot ledger exists');

    // the parameter vector of every book equals the sealed selection's (all eight D1 parameters)
    assert.deepEqual(Object.keys(resolved.books).sort(), Object.keys(sealed.books).sort());

    for (const [symbol, grid] of Object.entries(resolved.books)) {
      assert.equal(Object.keys(grid).length, 8, `${want.alias} ${symbol}`);

      for (const [key, value] of Object.entries(grid))
        assert.equal(value, sealed.books[symbol]![key], `${want.alias} ${symbol} ${key}`);
    }

    if (want.best) assert.equal((await resolveAlias(want.best)).sealedId, resolved.sealedId);
  }
});

test('#2 VG balanced carries its own sealed F24 test figures', async () => {
  const resolved = await resolveAlias('s8-vg-balanced');

  assert.equal(resolved.sealed?.net, 340147.67);
  assert.equal(resolved.sealed?.lots, 48);
  assert.equal(resolved.sealedId, 'VGT:d1-bd80e32ee4+GDX:d1-7b99d2833d');
});

test('B1 and B5 are the frozen controls (one VGT book; five books)', async () => {
  const b1 = await resolveAlias('vgt-primary');
  const b5 = await resolveAlias('b5-frozen');

  assert.equal(b1.spec.status, 'frozen');
  assert.deepEqual(Object.keys(b1.books), ['VGT']);
  assert.equal(b5.spec.status, 'frozen');
  assert.deepEqual(Object.keys(b5.books).sort(), ['GDX', 'KRE', 'VGT', 'XBI', 'XRT']);
  assert.equal(b1.pool.config.funding.notionalPerTrade, 100000);
  assert.equal(b5.pool.config.funding.fundedSlots, 1);
});

test('an unknown alias is a usage error', async () => {
  await assert.rejects(resolveAlias('s8-vg-favourite'), UsageError);
  await assert.rejects(resolveAlias('vg-best'), UsageError);
});
