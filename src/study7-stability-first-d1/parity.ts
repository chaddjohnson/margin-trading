// Engineering gates of PROTOCOL.md §12, run after the freeze and before Phase A; any failure stops the study.
//   P1 replay = the full N-book engine (Study 6's replayAgainstFullWith: lots, signals, virtual trades, daily rows,
//      both drawdowns, net) for the frozen configurations and GDX alone at 0/5/10 bps on W23 and W29, random joint
//      perturbations of VG/VXR/VXRG, and VG/VXR under 8%/14%/next-open/25 bps slippage.
//   P2 this study's records = the Study 5 evaluator's metrics on the P1 configurations.
//   P3 the pools CLI anchor (B5 → 2026-10-13) and Study 6's sealed W29 figures (B5, B1).
//   P4 data hashes, the 2026-10-13 prefixes = the B5 pins, 2,722 sessions.
//   P5 GDX control provenance (IDs, Study 5's sealed DEV/VAL figures), frozen grids = the registry files.
//   N1 no-lookahead (truncated run = the full run's past), C1 cache invalidation, D1 deterministic restart.
import { execFileSync, spawnSync } from 'node:child_process';
import path from 'node:path';
import zlib from 'node:zlib';
import fs from 'fs-extra';
import { traceWindowOf } from '../portfolio-aware-d1/data.ts';
import { gridOf } from '../portfolio-aware-d1/phenotypes.ts';
import { type TraceSettings, traceKey, traceSettings } from '../portfolio-aware-d1/trace.ts';
import { candidateBook } from '../portfolio-aware-d1/phenotypes.ts';
import { Evaluator as Study5Evaluator } from '../study5-gdx-b5-three-etf/engine.ts';
import { replayAgainstFullWith } from '../study6-b5-kre-robustness/parity.ts';
import { bookOrder, execution, frozenGrids, frozenPools, gdxControls, parityFile, resultFile, windows } from './context.ts';
import { type Door, openDoor, sha256 } from './data.ts';
import { familyDesign } from './designs.ts';
import { type Books, Evaluator, Lab, PointCache, baseSettings, booksKey, settingsKey, settingsWith } from './evaluate.ts';
import { log, nowIso, readSealed, writeSealed } from './records.ts';
import { lhsBooks, sobolGrids, vectorId } from './space.ts';

const five = [...bookOrder];
const frozenBooks = (symbols: readonly string[]): Books =>
  Object.fromEntries(symbols.map((s) => [s, { ...frozenGrids[s as keyof typeof frozenGrids] }]));

const near = (a: number, b: number, tol = 0.005) => Math.abs(a - b) < tol;

const runPools = (args: string[]) =>
  execFileSync(
    'node',
    ['--experimental-transform-types', '--disable-warning=ExperimentalWarning', '--max-old-space-size=8192', 'src/app.ts', 'pools', ...args],
    { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 64 * 1024 * 1024 }
  );

export const runParity = async () => {
  const started = Date.now();
  const rows: Record<string, unknown>[] = [];
  const passed: Record<string, boolean> = {};

  // ----- P4: data -----
  const pins = ((await fs.readJson('config/pools/B5.json')) as { regressionAnchors: { dataSha256: Record<string, string> } })
    .regressionAnchors.dataSha256;
  const cut = '"2026-10-14T04:00:00Z"';
  const p4: Record<string, unknown>[] = [];

  for (const symbol of five) {
    const bytes = await fs.readFile(`data/${symbol}/data.csv`);
    let offset = 0;
    let prefixEnd = -1;
    let rowsAll = 0;
    let last = '';

    while (offset < bytes.length) {
      const end = bytes.indexOf(10, offset);
      const lineEnd = end < 0 ? bytes.length : end;
      const stamp = bytes.toString('utf8', offset, Math.min(lineEnd, offset + 22));

      rowsAll++;
      last = stamp;

      if (stamp < cut) prefixEnd = end < 0 ? bytes.length : end + 1;

      offset = lineEnd + 1;
    }

    const prefix = sha256(bytes.subarray(0, prefixEnd));

    p4.push({ symbol, sha256: sha256(bytes), rows: rowsAll, last, prefixSha256: prefix, pin: pins[symbol], prefixEqualsPin: prefix === pins[symbol] });
  }

  const w29 = await openDoor('parity', five, 'parity (P1–P5, N1, C1) W29', { windowKey: 'W29' });
  const w23 = await openDoor('parity', five, 'parity (P1, P2, P5) W23', { windowKey: 'W23' });

  passed.P4 = p4.every((row) => row.prefixEqualsPin === true) && w29.dates.length === 2722 && w29.dates[w29.lastIndex] === windows.W29;
  rows.push(...p4.map((row) => ({ gate: 'P4', ...row })), { gate: 'P4', sessions: w29.dates.length, last: w29.dates[w29.lastIndex] });
  log(`P4: ${passed.P4}`);

  // ----- P1 / P2 -----
  const settingsOf = (overrides: Partial<{ costBps: number; rate: number; stopFill: 'stop' | 'next-open'; stopSlippageBps: number }>) => ({
    costBps: overrides.costBps ?? execution.costBps,
    rate: overrides.rate ?? execution.rate,
    stopFill: overrides.stopFill ?? execution.stopFill,
    stopSlippageBps: overrides.stopSlippageBps ?? 0
  });
  const configs: [string, Books][] = [
    ...Object.entries(frozenPools).map(([key, symbols]) => [key, frozenBooks(symbols)] as [string, Books]),
    ['G-PA', { GDX: gdxControls['G-PA']!.grid }],
    ['G-NM1', { GDX: gdxControls['G-NM1']!.grid }]
  ];
  const p1: Record<string, unknown>[] = [];
  const p2: Record<string, unknown>[] = [];
  const check = (door: Door, label: string, key: string, books: Books, settings: ReturnType<typeof settingsOf>) => {
    if (JSON.stringify(traceWindowOf(door.loaded)) !== JSON.stringify(new Evaluator(door).windowOf(baseSettings))) {
      throw new Error('the trace window of the parity helper differs from the evaluator window');
    }

    const outcome = replayAgainstFullWith(door.loaded, books, settings);
    const mine = new Evaluator(door).point(books, settingsWith(settings));
    const s5 = new Study5Evaluator(door as unknown as ConstructorParameters<typeof Study5Evaluator>[0]).metrics(books, { ...settings });
    const p2Equal = near(mine.net, s5.net) && near(mine.dd, s5.minuteDrawdown) && near(mine.ddDaily, s5.dailyDrawdown) && mine.lots === s5.lots;
    const p1Equal = outcome.differences.length === 0 && near(outcome.net, mine.net) && near(outcome.minute, mine.dd) && outcome.lots === mine.lots;

    p1.push({ window: label, key, settings, differences: outcome.differences, checks: outcome.checks, net: outcome.net, minute: outcome.minute, lots: outcome.lots, evaluatorEqual: p1Equal });
    p2.push({ window: label, key, settings, mine: { net: mine.net, dd: mine.dd, ddDaily: mine.ddDaily, lots: mine.lots }, study5: { net: s5.net, dd: s5.minuteDrawdown, ddDaily: s5.dailyDrawdown, lots: s5.lots }, equal: p2Equal });
    log(`P1 ${label} ${key} ${JSON.stringify(settings)}: ${outcome.differences.length} differences, evaluator ${p1Equal ? '=' : '≠'}, Study 5 ${p2Equal ? '=' : '≠'}`);
  };

  for (const [label, door] of [
    ['W23', w23],
    ['W29', w29]
  ] as const) {
    for (const [key, books] of configs) {
      for (const costBps of [0, 5, 10]) check(door, label, key, books, settingsOf({ costBps }));
    }
  }

  for (const poolKey of ['VG', 'VXR', 'VXRG'] as const) {
    const symbols = frozenPools[poolKey];
    const points = familyDesign(frozenBooks(symbols), symbols, { n: 8, labels: ['parity', 'joint', poolKey] });

    for (const point of points) check(w29, 'W29', `${poolKey}-joint-${point.index}`, point.books, settingsOf({}));
  }

  for (const poolKey of ['VG', 'VXR'] as const) {
    for (const [name, overrides] of [
      ['rate8', { rate: 0.08 }],
      ['rate14', { rate: 0.14 }],
      ['nextOpen', { stopFill: 'next-open' as const }],
      ['slip25', { stopSlippageBps: 25 }]
    ] as const) {
      check(w29, 'W29', `${poolKey}:${name}`, frozenBooks(frozenPools[poolKey]), settingsOf(overrides));
    }
  }

  passed.P1 = p1.length > 0 && p1.every((row) => (row.differences as string[]).length === 0 && row.evaluatorEqual === true);
  passed.P2 = p2.every((row) => row.equal === true);
  rows.push(...p1.map((row) => ({ gate: 'P1', ...row })), ...p2.map((row) => ({ gate: 'P2', ...row })));

  // ----- P3 -----
  const w13 = await openDoor('parity', five, 'parity P3 W13', { windowKey: 'W13' });
  const outDir = path.join('evaluations', 'study7', 'P3-B5-fixed-W13');

  await fs.remove(outDir);
  runPools(['fixed', 'B5', '--end', '2026-10-13', '--out', outDir]);

  const summary = (await fs.readJson(path.join(outDir, 'summary.json'))) as {
    figures: { net: number; minuteDrawdown: number; dailyDrawdown: number; fundedLots: number };
  };
  const b5w13 = new Evaluator(w13).point(frozenBooks(five));
  const b5w29 = new Evaluator(w29).point(frozenBooks(five));
  const b1w29 = new Evaluator(w29).point(frozenBooks(['VGT']));
  const b1w23 = new Evaluator(w23).point(frozenBooks(['VGT']));
  const p3 = {
    cli: summary.figures,
    evaluatorW13: { net: b5w13.net, dd: b5w13.dd, ddDaily: b5w13.ddDaily, lots: b5w13.lots },
    anchor: near(summary.figures.net, 486207.77) && near(summary.figures.minuteDrawdown, 26509.97) && summary.figures.fundedLots === 94,
    cliEqualsEvaluator:
      near(summary.figures.net, b5w13.net) && near(summary.figures.minuteDrawdown, b5w13.dd) && near(summary.figures.dailyDrawdown, b5w13.ddDaily) && summary.figures.fundedLots === b5w13.lots,
    study6B5W29: { net: b5w29.net, dd: b5w29.dd, lots: b5w29.lots, equal: near(b5w29.net, 484636.97) && near(b5w29.dd, 26509.97) && b5w29.lots === 95 },
    study6B1: {
      w29: { net: b1w29.net, dd: b1w29.dd, lots: b1w29.lots },
      w23: { net: b1w23.net, dd: b1w23.dd },
      equal: near(b1w29.net, 176260.47) && near(b1w29.dd, 19534.41) && b1w29.lots === 21 && Math.abs(b1w23.net - 135359) < 1 && near(b1w23.dd, 19534.41)
    }
  };

  passed.P3 = p3.anchor && p3.cliEqualsEvaluator && p3.study6B5W29.equal && p3.study6B1.equal;
  rows.push({ gate: 'P3', ...p3 });
  log(`P3: ${passed.P3} ${JSON.stringify(p3)}`);

  // ----- P5 -----
  const s5 = await readSealed<{ evidence: { id: string; grid: Record<string, number>; centre: { dev: number; val: number; metrics: { minuteDrawdown: number; lots: number } } }[] }>(
    'research/study5-gdx-d1-b5-three-etf-2026-10/results/studyA/main/validation.json'
  );
  const s5ById = new Map(s5.evidence.map((e) => [e.id, e]));
  const s5Names: Record<string, string> = { 'G-PA': 'A-C1-portfolioAware', 'G-TS': 'A-C2-trackS', 'G-SR': 'A-C3-standaloneRep', 'G-NM1': 'd1-ac0aaa704c', 'G-NM2': 'd1-a8e252df46', 'G-NM3': 'd1-143e245fb1' };
  const ev23 = new Evaluator(w23);
  const studyB = (
    (await readSealed<{ studyB: { candidatesAndControls: { key: string; books: Record<string, Record<string, number>> }[] } }>(
      'research/study5-gdx-d1-b5-three-etf-2026-10/FROZEN_SELECTION.json'
    )) as { studyB: { candidatesAndControls: { key: string; books: Record<string, Record<string, number>> }[] } }
  ).studyB.candidatesAndControls;
  const studyBNames: Record<string, string> = { 'G-T1P': 'T1-P', 'G-T1S': 'T1-S', 'G-T2C': 'T2-s3-coord', 'G-T2P': 'T2-s2-joint' };
  const p5 = Object.entries(gdxControls).map(([key, control]) => {
    const id = vectorId(control.grid);
    const idEqual = control.id.startsWith('d1-') ? id === control.id : true;

    if (key in studyBNames) {
      const stored = studyB.find((c) => c.key === studyBNames[key])!;

      return { key, id, recordedId: control.id, idEqual, gridEqualsStudy5: JSON.stringify(stored.books.GDX) === JSON.stringify(control.grid), equal: true, source: 'Study 5 FROZEN_SELECTION studyB' };
    }

    const stored = s5ById.get(s5Names[key]!)!;
    const point = ev23.point({ GDX: control.grid });

    return {
      key,
      id,
      recordedId: control.id,
      idEqual,
      gridEqualsStudy5: JSON.stringify(stored.grid) === JSON.stringify(control.grid),
      dev: { mine: point.periods.DEV, study5: stored.centre.dev },
      val: { mine: point.periods.VAL, study5: stored.centre.val },
      dd: { mine: point.dd, study5: stored.centre.metrics.minuteDrawdown },
      equal: near(point.periods.DEV!, stored.centre.dev, 0.01) && near(point.periods.VAL!, stored.centre.val, 0.01) && near(point.dd, stored.centre.metrics.minuteDrawdown, 0.01)
    };
  });
  const registry: Record<string, unknown>[] = [];

  for (const symbol of five) {
    const file = (await fs.readJson(`config/phenotypes/D1/${symbol}.json`)) as { phenotypes: Record<string, { parameters: Record<string, string | number> }> };
    const pool = (await fs.readJson('config/pools/B5.json')) as { books: { symbol: string; phenotype: string }[] };
    const role = pool.books.find((b) => b.symbol === symbol)!.phenotype;
    const params = file.phenotypes[role]!.parameters;
    const grid = Object.fromEntries(
      Object.entries(params).map(([k, v]) => [k, typeof v === 'string' ? Math.round(Number.parseFloat(v.replace('%', '')) * 10) : v])
    );
    const equal = JSON.stringify(gridOf(grid)) === JSON.stringify(frozenGrids[symbol]);

    registry.push({ symbol, role, equal });
  }

  passed.P5 = p5.every((row) => row.idEqual && row.gridEqualsStudy5 && row.equal) && registry.every((row) => row.equal === true);
  rows.push(...p5.map((row) => ({ gate: 'P5', ...row })), ...registry.map((row) => ({ gate: 'P5-registry', ...row })));
  log(`P5: ${passed.P5}`);

  // ----- N1: no-lookahead -----
  const trunc = await openDoor('parity-M', five, 'parity N1 (truncated run, training partition ≤ 2021-12-31)');
  const T = trunc.lastIndex;

  if (w29.dates[T] !== trunc.dates[T] || trunc.dates[T] !== windows.WDEV) throw new Error('N1: calendars differ');

  const evT = new Evaluator(trunc);
  const evF = new Evaluator(w29);
  const n1: Record<string, unknown>[] = [];
  const strip = (trade: object) => JSON.stringify(trade, (k, v) => (k === 'allocator' || k === 'fundedLotId' ? undefined : v));

  for (const symbol of five) {
    for (const grid of sobolGrids(12, ['parity', 'N1', symbol]).grids) {
      const a = evT.trace(symbol, grid, baseSettings).trades;
      const b = evF.trace(symbol, grid, baseSettings).trades;
      const closedA = a.filter((t) => t.exitIndex >= 0 && t.exitIndex < T);
      const closedB = b.filter((t) => t.exitIndex >= 0 && t.exitIndex < T);
      const equal = closedA.length === closedB.length && closedA.every((t, i) => strip(t) === strip(closedB[i]!));
      const decisionsA = a.filter((t) => t.decisionIndex <= T).map((t) => `${t.decisionIndex}:${t.decisionBar}:${t.entryIndex}:${t.entryBar}`);
      const decisionsB = b.filter((t) => t.decisionIndex <= T).map((t) => `${t.decisionIndex}:${t.decisionBar}:${t.entryIndex >= 0 && t.entryIndex <= T ? `${t.entryIndex}:${t.entryBar}` : 'later'}`);
      const decisionsEqual = decisionsA.length === decisionsB.length && decisionsA.every((d, i) => d === decisionsB[i] || decisionsB[i]?.endsWith('later'));

      n1.push({ kind: 'trace', symbol, grid, closed: closedA.length, equal, decisionsEqual });
    }
  }

  for (const books of [
    ...lhsBooks(2, ['VGT', 'GDX'], ['parity', 'N1', 'VG']).books,
    ...lhsBooks(2, ['VGT', 'XBI', 'XRT'], ['parity', 'N1', 'VXR']).books,
    ...lhsBooks(2, ['VGT', 'XBI', 'XRT', 'GDX'], ['parity', 'N1', 'VXRG']).books,
    frozenBooks(five)
  ]) {
    const a = evT.replay(books);
    const b = evF.replay(books);
    const lotsA = a.lots.filter((l) => l.exitIndex >= 0 && l.exitIndex < T).map((l) => `${l.symbol}:${l.entryTime}:${l.exitTime}:${l.net.toFixed(6)}`);
    const lotsB = b.lots.filter((l) => l.exitIndex >= 0 && l.exitIndex < T).map((l) => `${l.symbol}:${l.entryTime}:${l.exitTime}:${l.net.toFixed(6)}`);
    let marksEqual = true;

    for (let i = 0; i < T; i++) if (Math.abs(a.marks[i]! - b.marks[i]!) > 1e-6) marksEqual = false;

    n1.push({ kind: 'pool', books: booksKey(books), lots: lotsA.length, lotsEqual: JSON.stringify(lotsA) === JSON.stringify(lotsB), marksEqual, markAtT: [a.marks[T], b.marks[T]] });
  }

  passed.N1 = n1.every((row) => (row.kind === 'trace' ? row.equal && row.decisionsEqual : row.lotsEqual && row.marksEqual));
  rows.push(...n1.map((row) => ({ gate: 'N1', ...row })));
  log(`N1: ${passed.N1} (${n1.length} checks)`);

  // ----- C1: cache invalidation -----
  const ds = w29.loaded.universe.instruments.GDX!.ds;
  const book = candidateBook('GDX', 'c1', gdxControls['G-NM1']!.grid);
  const win = traceWindowOf(w29.loaded);
  const baseTs = traceSettings(5);
  const variants: [string, TraceSettings, typeof win, string][] = [
    ['base', baseTs, win, ds.dataHash],
    ['cost10', traceSettings(10), win, ds.dataHash],
    ['rate14', traceSettings(5, { rate: 0.14 }), win, ds.dataHash],
    ['nextOpen', traceSettings(5, { stopFill: 'next-open' }), win, ds.dataHash],
    ['slip25', traceSettings(5, { stopSlippageBps: 25 }), win, ds.dataHash],
    ['arm', baseTs, { ...win, armStart: win.armStart + 1 }, ds.dataHash],
    ['end', baseTs, { ...win, endIndex: win.endIndex - 1 }, ds.dataHash],
    ['data', baseTs, win, 'x'.repeat(64)]
  ];
  const keys = variants.map(([, settings, window, hash]) => traceKey({ ...ds, dataHash: hash } as typeof ds, book, settings, window));
  const keysDistinct = new Set(keys).size === keys.length;
  const settingKeys = [baseSettings, settingsWith({ costBps: 10 }), settingsWith({ rate: 0.14 }), settingsWith({ stopFill: 'next-open' }), settingsWith({ stopSlippageBps: 25 }), settingsWith({ armDate: '2017-12-15' })].map(settingsKey);
  const settingKeysDistinct = new Set(settingKeys).size === settingKeys.length;
  const tmp = resultFile('parity', 'c1-cache.jsonl');

  await fs.remove(tmp);

  const cacheA = await PointCache.open(trunc, tmp);
  const labA = new Lab(new Evaluator(trunc), cacheA);
  const samples = lhsBooks(200, ['VGT', 'GDX'], ['parity', 'C1']).books;

  for (const books of samples) labA.point(books);

  cacheA.flushSync();

  let refusedOtherDoor = false;

  try {
    await PointCache.open(w29, tmp);
  } catch {
    refusedOtherDoor = true;
  }

  const lines = (await fs.readFile(tmp, 'utf8')).split('\n');
  const tampered = resultFile('parity', 'c1-cache-engine.jsonl');

  await fs.outputFile(tampered, [JSON.stringify({ ...JSON.parse(lines[0]!), engine: 'not-this-engine' }), ...lines.slice(1)].join('\n'));

  let refusedOtherEngine = false;

  try {
    await PointCache.open(trunc, tampered);
  } catch {
    refusedOtherEngine = true;
  }

  const cacheB = await PointCache.open(trunc, tmp);
  const fresh = new Evaluator(trunc);
  const recomputeEqual = samples.every((books) => {
    const cached = cacheB.get(`${settingsKey(baseSettings)}#${booksKey(books)}`);
    const again = fresh.point(books);

    return cached !== undefined && JSON.stringify(cached, (_k, v) => (typeof v === 'number' && !Number.isFinite(v) ? null : v)) === JSON.stringify(again, (_k, v) => (typeof v === 'number' && !Number.isFinite(v) ? null : v));
  });

  await fs.remove(tmp);
  await fs.remove(tampered);
  passed.C1 = keysDistinct && settingKeysDistinct && refusedOtherDoor && refusedOtherEngine && recomputeEqual && cacheB.loaded === 200;
  rows.push({ gate: 'C1', keysDistinct, settingKeysDistinct, refusedOtherDoor, refusedOtherEngine, recomputeEqual, loaded: cacheB.loaded });
  log(`C1: ${passed.C1}`);

  // ----- D1: deterministic restart (child processes; reduced budget on the search-F19 door) -----
  const dir = resultFile('parity', 'restart');
  const run = (name: string, extra: string[] = []) => {
    const result = spawnSync(
      'node',
      ['--experimental-transform-types', '--disable-warning=ExperimentalWarning', '--max-old-space-size=8192', 'src/study7-stability-first-d1/main.ts', 'restart-probe', 'VG', path.join(dir, `${name}.json`), path.join(dir, `${name}-cache.jsonl`), ...extra],
      { encoding: 'utf8' }
    );

    if (result.status !== 0) throw new Error(`restart probe ${name} failed: ${result.stderr.slice(-2000)}`);

    return result.stdout;
  };

  await fs.remove(dir);
  await fs.ensureDir(dir);
  run('a');
  run('b');
  run('c', ['3000']); // killed after 3,000 fresh points
  run('c'); // resumed

  const bodyOf = async (name: string) => {
    const record = (await fs.readJson(path.join(dir, `${name}.json`))) as Record<string, unknown>;
    const { at, seconds, stats, archive, bodyHash, ...rest } = record;

    void at;
    void seconds;
    void stats;
    void archive;
    void bodyHash;
    return { body: sha256(JSON.stringify(rest)), archive: sha256(zlib.gunzipSync(await fs.readFile(path.join(dir, `${name}-archive.csv.gz`)))) };
  };
  const a = await bodyOf('a');
  const b = await bodyOf('b');
  const c = await bodyOf('c');

  passed.D1 = a.body === b.body && a.body === c.body && a.archive === b.archive && a.archive === c.archive;
  rows.push({ gate: 'D1', a, b, c });
  log(`D1: ${passed.D1}`);

  for (const name of ['a', 'b', 'c']) await fs.remove(path.join(dir, `${name}-cache.jsonl`));

  // ----- G1: doors refuse out-of-order access (nothing is read when a door refuses) -----
  const refusals: Record<string, boolean> = {};

  for (const key of ['diag', 'search-M', 'search-L', 'test-M', 'final', 'pilot'] as const) {
    try {
      await openDoor(key, ['GDX'], `parity G1 (must refuse) ${key}`);
      refusals[key] = false;
    } catch {
      refusals[key] = true;
    }
  }

  passed.G1 = Object.values(refusals).every(Boolean);
  rows.push({ gate: 'G1', refusals });
  log(`G1: ${passed.G1} ${JSON.stringify(refusals)}`);

  const all = Object.values(passed).every(Boolean);
  const record = await writeSealed(parityFile, { stage: 'PARITY', at: nowIso(), passed: all, gates: passed, rows, seconds: (Date.now() - started) / 1000 });

  log(`parity: ${JSON.stringify(passed)}; ${record.file} ${record.bodyHash.slice(0, 12)}`);

  if (!all) throw new Error(`parity failed: ${JSON.stringify(passed)} — the study stops here (PROTOCOL.md §12)`);
};
