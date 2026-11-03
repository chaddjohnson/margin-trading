// Tests of the Study 7 local runners: alias → sealed vector mapping, option parsing, output isolation, invalid cases
// (CLI exit codes), and — on the local canonical data — parity with the sealed Study 7 final door, determinism and
// no-lookahead (a truncated run equals the full run's past). Engine tests skip when data/ is absent.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { test } from 'node:test';
import fs from 'fs-extra';
import { frozenGrids, gdxControls } from '../../study7-stability-first-d1/context.ts';
import { vectorId } from '../../study7-stability-first-d1/space.ts';
import { UsageError, aliasNames, aliases } from '../aliases.ts';
import { frozenSelectionFile, resolveAlias } from '../resolve.ts';
import { commonLastDate, newOutputDir, outputsRoot, parseCostBps, runAlias, validateEnd } from '../run.ts';

const hasData = ['VGT', 'XBI', 'XRT', 'KRE', 'GDX'].every((s) => fs.existsSync(`data/${s}/data.csv`));
const scratch = path.join(outputsRoot, `test-${process.pid}`);

const cli = (...args: string[]) =>
  spawnSync(
    'node',
    ['--experimental-transform-types', '--disable-warning=ExperimentalWarning', 'src/study7-runners/main.ts', ...args],
    { encoding: 'utf8' }
  );

test('the required aliases exist, with the optional one marked', () => {
  assert.deepEqual(aliasNames.slice(0, 11), [
    'vg-profit',
    'vg-robust',
    'vg-balanced',
    'vxr-profit',
    'vgt-primary',
    'gdx-profit',
    'gdx-balanced',
    'gdx-robust',
    'vg-frozen',
    'gdx-portfolio-aware',
    'b5-frozen'
  ]);
  assert.equal(aliases.find((a) => a.alias === 'gdx-study5-nearmiss1')?.optional, true);
  assert.equal(aliases.find((a) => a.alias === 'gdx-study5-nearmiss1')?.status, 'research');
});

test('Study 7 aliases resolve to the sealed ranks, books and research pools', async () => {
  const selection = (await fs.readJson(frozenSelectionFile)) as {
    ranked: { rank: number; track: string; role: string; books: Record<string, Record<string, number>> }[];
  };
  const expected: Record<string, [number, string, string]> = {
    'vg-profit': [1, 'VG', 'profit'],
    'vg-robust': [2, 'VG', 'robust'],
    'vg-balanced': [5, 'VG', 'balanced'],
    'vxr-profit': [6, 'VXR', 'profit'],
    'gdx-profit': [7, 'G', 'profit'],
    'gdx-balanced': [10, 'G', 'balanced'],
    'gdx-robust': [11, 'G', 'robust']
  };

  for (const [alias, [rank, track, role]] of Object.entries(expected)) {
    const resolved = await resolveAlias(alias);
    const sealed = selection.ranked.find((row) => row.rank === rank)!;

    assert.equal(resolved.rank, rank);
    assert.equal(sealed.track, track);
    assert.equal(sealed.role, role);
    assert.deepEqual(resolved.books, sealed.books, `${alias} books`);
    assert.ok(resolved.configFile.startsWith('config/research-pools/study7-stability-first-d1/'));
  }

  assert.equal(
    (await resolveAlias('vg-profit')).configFile,
    'config/research-pools/study7-stability-first-d1/S7-VG-L-19.json'
  );
});

test('frozen aliases resolve to the unchanged registry books', async () => {
  assert.deepEqual((await resolveAlias('vgt-primary')).books, { VGT: frozenGrids.VGT });
  assert.deepEqual((await resolveAlias('vg-frozen')).books, { VGT: frozenGrids.VGT, GDX: frozenGrids.GDX });
  assert.deepEqual((await resolveAlias('b5-frozen')).books, { ...frozenGrids });
  assert.deepEqual((await resolveAlias('gdx-portfolio-aware')).books, { GDX: gdxControls['G-PA']!.grid });
  assert.equal((await resolveAlias('gdx-portfolio-aware')).vectorIds.GDX, 'd1-51ea8d4bd6');
  assert.equal((await resolveAlias('gdx-study5-nearmiss1')).vectorIds.GDX, 'd1-ac0aaa704c');
  assert.equal(vectorId(frozenGrids.VGT), 'd1-ebc9f639b3');
  // the three new GDX standalone vectors are distinct from the B5 GDX book
  const gdx = await Promise.all(
    ['gdx-profit', 'gdx-balanced', 'gdx-robust'].map(async (a) => (await resolveAlias(a)).vectorIds.GDX)
  );

  assert.equal(new Set([...gdx, 'd1-51ea8d4bd6']).size, 4);
});

test('options: cost per side and end validation', async () => {
  assert.equal(parseCostBps(undefined), 5);
  assert.equal(parseCostBps('0'), 0);
  assert.equal(parseCostBps('20'), 20);

  for (const bad of ['abc', '-1', '101', '', 'NaN']) assert.throws(() => parseCostBps(bad), UsageError);

  if (hasData) {
    const latest = await commonLastDate();

    assert.equal(await validateEnd(undefined, ['VGT', 'GDX']), latest);
    assert.equal(await validateEnd('2023-12-29', ['VGT']), '2023-12-29');
    await assert.rejects(validateEnd('2099-01-01', ['VGT']), UsageError);
    await assert.rejects(validateEnd('2017-06-01', ['VGT']), UsageError);
    await assert.rejects(validateEnd('2026-13-01', ['VGT']), UsageError);
  }
});

test('output isolation: never inside protected roots, never an existing directory, default names unique', async () => {
  for (const bad of ['research/x', 'config/x', 'data/x', 'src/x'])
    await assert.rejects(newOutputDir(bad, 'x'), UsageError);

  const dir = path.join(scratch, 'exists');

  await fs.ensureDir(dir);
  await assert.rejects(newOutputDir(dir, 'x'), UsageError);

  const a = await newOutputDir(undefined, `iso-${process.pid}`);

  await fs.ensureDir(a);

  const b = await newOutputDir(undefined, `iso-${process.pid}`);

  assert.notEqual(a, b);
  await fs.remove(a);
  await fs.remove(scratch);
});

test('invalid commands exit non-zero with a useful message', () => {
  const cases: [string[], RegExp][] = [
    [['run', 'nope'], /unknown strategy alias "nope"/],
    [['run'], /run takes exactly one alias/],
    [['run', 'vg-profit', '--cost-bps', 'abc'], /--cost-bps must be/],
    [['run', 'vg-profit', '--end', '2026-13-01'], /--end must be YYYY-MM-DD/],
    [['run', 'vg-profit', '--bogus'], /unknown option --bogus/],
    [['compare', 'vg-profit'], /at least two aliases/],
    [['compare', 'vg-profit', 'vg-profit'], /listed twice/],
    [['frobnicate'], /unknown command/]
  ];

  for (const [args, message] of cases) {
    const result = cli(...args);

    assert.equal(result.status, 2, `${args.join(' ')} → ${result.status}`);
    assert.match(result.stderr, message);
  }
});

test('parity with the sealed Study 7 final door, and determinism', { skip: !hasData }, async () => {
  const one = await runAlias('gdx-robust', { costBps: 5, outDir: path.join(scratch, 'p1') });
  const two = await runAlias('gdx-robust', { costBps: 5, outDir: path.join(scratch, 'p2') });

  assert.equal(one.reconciliation.applicable, true);
  assert.equal(one.reconciliation.pass, true, JSON.stringify(one.reconciliation));
  assert.equal(one.reconciliation.lots!.mismatches.length, 0);
  assert.deepEqual(one.record.trades, two.record.trades);
  assert.equal(
    await fs.readFile(path.join(scratch, 'p1', 'trades.csv'), 'utf8'),
    await fs.readFile(path.join(scratch, 'p2', 'trades.csv'), 'utf8')
  );
  assert.deepEqual(one.record.figures, two.record.figures);
  await fs.remove(scratch);
});

test('no-lookahead: a run truncated at 2021-12-31 equals the full run up to the cut', { skip: !hasData }, async () => {
  const cut = await runAlias('vg-balanced', { end: '2021-12-31', costBps: 5, outDir: path.join(scratch, 'cut') });
  const full = await runAlias('vg-balanced', { costBps: 5, outDir: path.join(scratch, 'full') });
  type Row = { symbol: string; entryUtc: string; exitUtc: string; status: string; net: number };
  const closed = (rows: Row[]) =>
    rows
      .filter((r) => r.status === 'realized' && r.exitUtc <= '2021-12-31T23:59:59Z')
      .map((r) => [r.symbol, r.entryUtc, r.exitUtc, r.net]);

  assert.equal(cut.record.data.last, '2021-12-31');
  assert.equal(cut.reconciliation.applicable, false);
  assert.ok(closed(cut.record.trades as unknown as Row[]).length > 0);
  assert.deepEqual(closed(cut.record.trades as unknown as Row[]), closed(full.record.trades as unknown as Row[]));
  await fs.remove(scratch);
});
