// Study 9 Phase B runner unit tests: alias grammar and delegation (no market data, no sealed records needed).
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { UsageError, compareAll, parseAlias, trackSlugs } from '../aliases.ts';

test('Phase B aliases', () => {
  assert.deepEqual(parseAlias('s9b-g4-eww-profit'), {
    kind: 'role',
    alias: 's9b-g4-eww-profit',
    track: 'G4-EWW',
    role: 'profit'
  });
  assert.deepEqual(parseAlias('s9b-vg3-iwm-best'), { kind: 'best', alias: 's9b-vg3-iwm-best', track: 'VG3-IWM' });
  assert.deepEqual(parseAlias('s9b-n2-smh-3'), { kind: 'member', alias: 's9b-n2-smh-3', track: 'N2-SMH', order: 3 });
  assert.deepEqual(parseAlias('s9b-rank-12'), { kind: 'rank', alias: 's9b-rank-12', rank: 12 });
  assert.deepEqual(parseAlias('s9b-nominee'), { kind: 'nominee', alias: 's9b-nominee' });
  assert.equal(trackSlugs.length, 7);
});

test('comparator aliases are delegated to the Study 8 runner; unknown names refused', () => {
  for (const alias of ['s8-vg-balanced', 's8-vg-profit', 'vgt-primary', 'b5-frozen', 'vxr-frozen'])
    assert.deepEqual(parseAlias(alias), { kind: 'study8', alias });

  assert.throws(() => parseAlias('s9b-g4-xyz-best'), UsageError);
  assert.throws(() => parseAlias('s9b-g4-ilf-7'), UsageError);
  assert.throws(() => parseAlias('nonsense'), UsageError);
});

test('compare --all covers every track best and the four comparators', () => {
  assert.equal(compareAll.length, 11);
  assert.ok(compareAll.includes('s8-vg-balanced') && compareAll.includes('b5-frozen'));
});

test('Phase B data-pin status: exact, appended, history changed', async () => {
  const { pinStatusOf } = await import('../pins.ts');
  const { sha256 } = await import('../../study5-gdx-b5-three-etf/data.ts');
  const base = Buffer.from('"2026-10-30T19:59:00Z",1,1,1,1,100\n');
  const pin = { bytes: base.length, sha256: sha256(base) };

  assert.equal(pinStatusOf(base, pin), 'exact');
  assert.equal(pinStatusOf(Buffer.concat([base, Buffer.from('"2026-11-02T14:30:00Z",1,1,1,1,1\n')]), pin), 'appended');
  assert.equal(pinStatusOf(Buffer.from(base.toString().replace('100', '101')), pin), 'HISTORY CHANGED');
  assert.equal(pinStatusOf(undefined, pin), 'missing');
  assert.equal(pinStatusOf(base, undefined), 'no Phase B pin');
});

test('the default end is the latest COMMON complete session of Phase B-only ETFs; incomplete or later ends are refused', async () => {
  const os = await import('node:os');
  const path = await import('node:path');
  const fs = (await import('fs-extra')).default;
  const { validateEnd } = await import('../data.ts');
  const root = path.join(await fs.mkdtemp(path.join(os.tmpdir(), 'study9b-runner-data-')), 'data');
  // New York wall-clock minutes in late October 2026 (EDT, UTC−4)
  const bar = (date: string, minute: number) => {
    const iso = new Date(Date.parse(`${date}T00:00:00Z`) + (minute + 240) * 60000).toISOString().replace('.000', '');

    return `"${iso}",100,100,100,100,100`;
  };
  const session = (date: string, from = 570, to = 959) =>
    Array.from({ length: to - from + 1 }, (_v, i) => bar(date, from + i));
  const complete = [...session('2026-10-28'), ...session('2026-10-29'), bar('2026-10-29', 960)];

  await fs.outputFile(
    path.join(root, 'EWW', 'data.csv'),
    `${[...complete, ...session('2026-10-30'), bar('2026-10-30', 961)].join('\n')}\n`
  );
  await fs.outputFile(
    path.join(root, 'ILF', 'data.csv'),
    `${[...complete, ...session('2026-10-30', 570, 660)].join('\n')}\n`
  );

  assert.equal(await validateEnd(undefined, ['EWW'], root), '2026-10-30');
  assert.equal(await validateEnd(undefined, ['EWW', 'ILF'], root), '2026-10-29');
  assert.equal(await validateEnd('2026-10-29', ['EWW', 'ILF'], root), '2026-10-29');
  await assert.rejects(validateEnd('2026-10-30', ['EWW', 'ILF'], root), (error: Error) => {
    assert.ok(error instanceof UsageError);
    assert.match(error.message, /latest common complete session \(2026-10-29\)/);
    assert.match(error.message, /ILF holds 2026-10-30 only up to 2026-10-30 11:00 ET/);

    return true;
  });
  await assert.rejects(validateEnd('2026-11-02', ['EWW'], root), UsageError);
  await assert.rejects(validateEnd('2026-02-30', ['EWW'], root), UsageError);
  await assert.rejects(validateEnd(undefined, ['MTUM'], root), /missing canonical data for MTUM/);
});
