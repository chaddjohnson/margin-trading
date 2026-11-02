// Engineering gates of PROTOCOL.md §12, run after the freeze and before Phase A; any failure stops the study.
//   P1 replay = the full N-book engine (Study 6's replayAgainstFullWith: lots, signals, virtual trades, daily rows,
//      both drawdowns, net) for the frozen configurations and GDX alone at 0/5/10 bps on W23 and W29, random joint
//      perturbations of VG/VXR/VXRG, and VG/VXR under 8%/14%/next-open/25 bps slippage.
//   P2 this study's records = the Study 5 evaluator's metrics on the P1 configurations.
//   P3 the pools CLI anchor (B5 → 2026-10-13) and Study 6's sealed W29 figures (B5, B1).
//   P4 data hashes, the 2026-10-13 prefixes = the B5 pins, 2,722 sessions.
//   P5 GDX control provenance (IDs, Study 5's sealed DEV/VAL figures = TRAIN-F21/TEST-F21), frozen grids = the registry files.
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
import {
  bookOrder,
  execution,
  frozenGrids,
  frozenPools,
  gdxControls,
  parityFile,
  resultFile,
  windows
} from './context.ts';
import { type Door, openDoor, sha256 } from './data.ts';
import { familyDesign } from './designs.ts';
import {
  type Books,
  Evaluator,
  Lab,
  PointCache,
  baseSettings,
  booksKey,
  orderedOf,
  settingsKey,
  settingsWith
} from './evaluate.ts';
import { log, nowIso, readSealed, writeSealed } from './records.ts';
import { lhsBooks, sobolGrids, vectorId } from './space.ts';

const five = [...bookOrder];
const frozenBooks = (symbols: readonly string[]): Books =>
  Object.fromEntries(symbols.map((s) => [s, { ...frozenGrids[s as keyof typeof frozenGrids] }]));

const near = (a: number, b: number, tol = 0.005) => Math.abs(a - b) < tol;

const runPools = (args: string[]) =>
  execFileSync(
    'node',
    [
      '--experimental-transform-types',
      '--disable-warning=ExperimentalWarning',
      '--max-old-space-size=8192',
      'src/app.ts',
      'pools',
      ...args
    ],
    { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 64 * 1024 * 1024 }
  );

export const runParity = async () => {
  const started = Date.now();
  const rows: Record<string, unknown>[] = [];
  const passed: Record<string, boolean> = {};

  // ----- P4: data -----
  const pins = (
    (await fs.readJson('config/pools/B5.json')) as { regressionAnchors: { dataSha256: Record<string, string> } }
  ).regressionAnchors.dataSha256;
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

    p4.push({
      symbol,
      sha256: sha256(bytes),
      rows: rowsAll,
      last,
      prefixSha256: prefix,
      pin: pins[symbol],
      prefixEqualsPin: prefix === pins[symbol]
    });
  }

  const w29 = await openDoor('parity', five, 'parity (P1–P5, N1, C1) W29', { windowKey: 'W29' });
  const w23 = await openDoor('parity', five, 'parity (P5: Study 5 figures are on the run to 2023-12-29) W23', {
    windowKey: 'W23'
  });
  const w24 = await openDoor('parity', five, 'parity (P1, P2) training horizon W24', { windowKey: 'W24' });

  passed.P4 =
    p4.every((row) => row.prefixEqualsPin === true) &&
    w29.dates.length === 2722 &&
    w29.dates[w29.lastIndex] === windows.W29;
  rows.push(...p4.map((row) => ({ gate: 'P4', ...row })), {
    gate: 'P4',
    sessions: w29.dates.length,
    last: w29.dates[w29.lastIndex]
  });
  log(`P4: ${passed.P4}`);

  // ----- P1 / P2 -----
  const settingsOf = (
    overrides: Partial<{ costBps: number; rate: number; stopFill: 'stop' | 'next-open'; stopSlippageBps: number }>
  ) => ({
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
    const s5 = new Study5Evaluator(door as unknown as ConstructorParameters<typeof Study5Evaluator>[0]).metrics(books, {
      ...settings
    });
    const p2Equal =
      near(mine.net, s5.net) &&
      near(mine.dd, s5.minuteDrawdown) &&
      near(mine.ddDaily, s5.dailyDrawdown) &&
      mine.lots === s5.lots;
    const p1Equal =
      outcome.differences.length === 0 &&
      near(outcome.net, mine.net) &&
      near(outcome.minute, mine.dd) &&
      outcome.lots === mine.lots;

    p1.push({
      window: label,
      key,
      settings,
      differences: outcome.differences,
      checks: outcome.checks,
      net: outcome.net,
      minute: outcome.minute,
      lots: outcome.lots,
      evaluatorEqual: p1Equal
    });
    p2.push({
      window: label,
      key,
      settings,
      mine: { net: mine.net, dd: mine.dd, ddDaily: mine.ddDaily, lots: mine.lots },
      study5: { net: s5.net, dd: s5.minuteDrawdown, ddDaily: s5.dailyDrawdown, lots: s5.lots },
      equal: p2Equal
    });
    log(
      `P1 ${label} ${key} ${JSON.stringify(settings)}: ${outcome.differences.length} differences, evaluator ${p1Equal ? '=' : '≠'}, Study 5 ${p2Equal ? '=' : '≠'}`
    );
  };

  // W23 is a training-partition door (as the F19–F23 doors are); W24 and W29 load the `all` partition
  for (const [label, door] of [
    ['W23', w23],
    ['W24', w24],
    ['W29', w29]
  ] as const) {
    for (const [key, books] of configs) {
      for (const costBps of [0, 5, 10]) check(door, label, key, books, settingsOf({ costBps }));
    }
  }

  // perturbed joint vectors of every pooled track size, including the five-book (40-D) pool, on both horizons
  for (const poolKey of ['VG', 'VXR', 'VXRG', 'B5'] as const) {
    const symbols = frozenPools[poolKey];
    const points = familyDesign(frozenBooks(symbols), symbols, { n: 6, labels: ['parity', 'joint', poolKey] });

    for (const [label, door] of [
      ['W23', w23],
      ['W24', w24],
      ['W29', w29]
    ] as const) {
      for (const point of points) check(door, label, `${poolKey}-joint-${point.index}`, point.books, settingsOf({}));
    }
  }

  for (const poolKey of ['VG', 'VXR', 'B5'] as const) {
    for (const [name, overrides] of [
      ['rate8', { rate: 0.08 }],
      ['rate14', { rate: 0.14 }],
      ['nextOpen', { stopFill: 'next-open' as const }],
      ['slip25', { stopSlippageBps: 25 }]
    ] as const) {
      check(w29, 'W29', `${poolKey}:${name}`, frozenBooks(frozenPools[poolKey]), settingsOf(overrides));
    }
  }

  passed.P1 =
    p1.length > 0 && p1.every((row) => (row.differences as string[]).length === 0 && row.evaluatorEqual === true);
  passed.P2 = p2.every((row) => row.equal === true);
  rows.push(...p1.map((row) => ({ gate: 'P1', ...row })), ...p2.map((row) => ({ gate: 'P2', ...row })));

  // ----- P3 -----
  const w13 = await openDoor('parity', five, 'parity P3 W13', { windowKey: 'W13' });
  const outDir = path.join('evaluations', 'study8', 'P3-B5-fixed-W13');

  await fs.remove(outDir);
  runPools(['fixed', 'B5', '--end', '2026-10-13', '--out', outDir]);

  const summary = (await fs.readJson(path.join(outDir, 'summary.json'))) as {
    figures: { net: number; minuteDrawdown: number; dailyDrawdown: number; fundedLots: number };
  };
  const b5w13 = new Evaluator(w13).point(frozenBooks(five));
  const anchorPins = (
    (await fs.readJson('config/pools/B5.json')) as {
      regressionAnchors: { fixed: { net: number; minuteDrawdown: number; lots: number } };
    }
  ).regressionAnchors.fixed;
  // Study 7's sealed final door (full history to 2026-10-29, 5 bps): controls and research candidates, read from the record
  const s7 = await readSealed<{
    controls: Record<
      string,
      { evidence: { books: Books; centre: { record: { net: number; dd: number; ddDaily: number; lots: number } } } }
    >;
    nominations: {
      rank: number;
      id: string;
      track: string;
      path: string;
      books: Books;
      evidence: { centre: { record: { net: number; dd: number; ddDaily: number; lots: number } } };
    }[];
    w13: Record<string, { net: number; dd: number; lots: number }>;
  }>('research/study7-stability-first-d1/results/final/final.json');
  const expectedControls = [
    'B1',
    'VG',
    'VXR',
    'VXRG',
    'B5',
    'G-PA',
    'G-TS',
    'G-SR',
    'G-NM1',
    'G-NM2',
    'G-NM3',
    'G-T1P',
    'G-T1S',
    'G-T2C',
    'G-T2P'
  ];
  const setsExact =
    JSON.stringify(Object.keys(s7.controls).sort()) === JSON.stringify([...expectedControls].sort()) &&
    JSON.stringify(s7.nominations.map((n) => n.rank)) === JSON.stringify([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
  const ev29 = new Evaluator(w29);
  const s7Rows = [
    ...Object.entries(s7.controls).map(([key, c]) => ({
      key: `control:${key}`,
      books: c.evidence.books,
      sealed: c.evidence.centre.record
    })),
    ...s7.nominations.map((n) => ({ key: `S7 rank ${n.rank}`, books: n.books, sealed: n.evidence.centre.record }))
  ].map((row) => {
    const mine = ev29.point(row.books);

    return {
      key: row.key,
      sealed: { net: row.sealed.net, dd: row.sealed.dd, ddDaily: row.sealed.ddDaily, lots: row.sealed.lots },
      mine: { net: mine.net, dd: mine.dd, ddDaily: mine.ddDaily, lots: mine.lots },
      equal:
        near(mine.net, row.sealed.net) &&
        near(mine.dd, row.sealed.dd) &&
        near(mine.ddDaily, row.sealed.ddDaily) &&
        mine.lots === row.sealed.lots
    };
  });
  // every Study 7 sealed W13 row (controls and nominations, to 2026-10-13), reproduced on this study's W13 door
  const ev13 = new Evaluator(w13);
  const nominationKey = (n: (typeof s7.nominations)[number]) =>
    `${n.track}/${n.path}/${orderedOf(Object.keys(n.books))
      .map((symbol) => `${symbol}:${vectorId(n.books[symbol]!)}`)
      .join('+')}`;
  const w13Books: Record<string, Books> = {
    ...Object.fromEntries(Object.entries(s7.controls).map(([key, c]) => [key, c.evidence.books])),
    ...Object.fromEntries(s7.nominations.map((n) => [nominationKey(n), n.books]))
  };
  const w13Rows = Object.entries(s7.w13).map(([key, sealed]) => {
    const books = w13Books[key];

    if (!books) return { key, sealed, missing: true, equal: false };

    const mine = ev13.point(books);

    return {
      key,
      sealed,
      mine: { net: mine.net, dd: mine.dd, lots: mine.lots },
      equal: near(mine.net, sealed.net) && near(mine.dd, sealed.dd) && mine.lots === sealed.lots
    };
  });
  const p3 = {
    cli: summary.figures,
    evaluatorW13: { net: b5w13.net, dd: b5w13.dd, ddDaily: b5w13.ddDaily, lots: b5w13.lots },
    anchorPins,
    anchor:
      near(summary.figures.net, anchorPins.net) &&
      near(summary.figures.minuteDrawdown, anchorPins.minuteDrawdown) &&
      summary.figures.fundedLots === anchorPins.lots,
    cliEqualsEvaluator:
      near(summary.figures.net, b5w13.net) &&
      near(summary.figures.minuteDrawdown, b5w13.dd) &&
      near(summary.figures.dailyDrawdown, b5w13.ddDaily) &&
      summary.figures.fundedLots === b5w13.lots,
    study7FinalW29: s7Rows,
    study7W13: w13Rows,
    study7SetsExact: setsExact
  };

  passed.P3 =
    p3.anchor &&
    p3.cliEqualsEvaluator &&
    setsExact &&
    s7Rows.length === 27 &&
    s7Rows.every((row) => row.equal) &&
    w13Rows.length === 27 &&
    w13Rows.every((row) => row.equal);
  rows.push({ gate: 'P3', ...p3 });
  log(
    `P3: ${passed.P3} (B5 W13 anchors ${JSON.stringify(anchorPins)}; ${s7Rows.filter((r) => r.equal).length}/${s7Rows.length} Study 7 sealed W29 rows and ${w13Rows.filter((r) => r.equal).length}/${w13Rows.length} W13 rows equal; sets exact ${setsExact})`
  );

  // ----- P5 -----
  const s5 = await readSealed<{
    evidence: {
      id: string;
      grid: Record<string, number>;
      centre: { dev: number; val: number; metrics: { minuteDrawdown: number; lots: number } };
    }[];
  }>('research/study5-gdx-d1-b5-three-etf-2026-10/results/studyA/main/validation.json');
  const s5ById = new Map(s5.evidence.map((e) => [e.id, e]));
  const s5Names: Record<string, string> = {
    'G-PA': 'A-C1-portfolioAware',
    'G-TS': 'A-C2-trackS',
    'G-SR': 'A-C3-standaloneRep',
    'G-NM1': 'd1-ac0aaa704c',
    'G-NM2': 'd1-a8e252df46',
    'G-NM3': 'd1-143e245fb1'
  };
  const ev23 = new Evaluator(w23);
  const studyB = (
    (await readSealed<{
      studyB: { candidatesAndControls: { key: string; books: Record<string, Record<string, number>> }[] };
    }>('research/study5-gdx-d1-b5-three-etf-2026-10/FROZEN_SELECTION.json')) as {
      studyB: { candidatesAndControls: { key: string; books: Record<string, Record<string, number>> }[] };
    }
  ).studyB.candidatesAndControls;
  const studyBNames: Record<string, string> = {
    'G-T1P': 'T1-P',
    'G-T1S': 'T1-S',
    'G-T2C': 'T2-s3-coord',
    'G-T2P': 'T2-s2-joint'
  };
  const p5 = Object.entries(gdxControls).map(([key, control]) => {
    const id = vectorId(control.grid);
    const idEqual = control.id.startsWith('d1-') ? id === control.id : true;

    if (key in studyBNames) {
      const stored = studyB.find((c) => c.key === studyBNames[key])!;

      // grid-only provenance: Study 5's Track 1/2a records hold no figure on a comparable run (labelled, review m14)
      return {
        key,
        id,
        recordedId: control.id,
        idEqual,
        gridEqualsStudy5: JSON.stringify(stored.books.GDX) === JSON.stringify(control.grid),
        equal: true,
        check: 'grid-only',
        source: 'Study 5 FROZEN_SELECTION studyB'
      };
    }

    const stored = s5ById.get(s5Names[key]!)!;
    const point = ev23.point({ GDX: control.grid });

    return {
      key,
      id,
      recordedId: control.id,
      idEqual,
      gridEqualsStudy5: JSON.stringify(stored.grid) === JSON.stringify(control.grid),
      // Study 5's DEV (2017-06-15 → 2021-12-31) and VAL (2022-01-01 → 2023-12-31) are this study's TRAIN-F21 and
      // TEST-F21 periods (the same sessions on the W23 door); amendment E1 corrected the keys
      dev: { mine: point.periods['TRAIN-F21'], study5: stored.centre.dev },
      val: { mine: point.periods['TEST-F21'], study5: stored.centre.val },
      dd: { mine: point.dd, study5: stored.centre.metrics.minuteDrawdown },
      equal:
        near(point.periods['TRAIN-F21']!, stored.centre.dev, 0.01) &&
        near(point.periods['TEST-F21']!, stored.centre.val, 0.01) &&
        near(point.dd, stored.centre.metrics.minuteDrawdown, 0.01)
    };
  });
  const registry: Record<string, unknown>[] = [];

  for (const symbol of five) {
    const file = (await fs.readJson(`config/phenotypes/D1/${symbol}.json`)) as {
      phenotypes: Record<string, { parameters: Record<string, string | number> }>;
    };
    const pool = (await fs.readJson('config/pools/B5.json')) as { books: { symbol: string; phenotype: string }[] };
    const role = pool.books.find((b) => b.symbol === symbol)!.phenotype;
    const params = file.phenotypes[role]!.parameters;
    const grid = Object.fromEntries(
      Object.entries(params).map(([k, v]) => [
        k,
        typeof v === 'string' ? Math.round(Number.parseFloat(v.replace('%', '')) * 10) : v
      ])
    );
    const equal = JSON.stringify(gridOf(grid)) === JSON.stringify(frozenGrids[symbol]);

    registry.push({ symbol, role, equal });
  }

  passed.P5 =
    p5.every((row) => row.idEqual && row.gridEqualsStudy5 && row.equal) && registry.every((row) => row.equal === true);
  rows.push(...p5.map((row) => ({ gate: 'P5', ...row })), ...registry.map((row) => ({ gate: 'P5-registry', ...row })));
  log(`P5: ${passed.P5}`);

  // ----- N1: no-lookahead -----
  const n1: Record<string, unknown>[] = [];
  const strip = (trade: object) =>
    JSON.stringify(trade, (k, v) => (k === 'allocator' || k === 'fundedLotId' ? undefined : v));
  const evF = new Evaluator(w29);
  let cutDoor: Door | undefined;

  for (const [doorKey, cut] of [
    ['parity-cut', windows.W24],
    ['parity-F19', windows.W19]
  ] as const) {
    const trunc = await openDoor(doorKey, five, `parity N1 (truncated run ≤ ${cut})`);
    const T = trunc.lastIndex;

    if (w29.dates[T] !== trunc.dates[T] || trunc.dates[T] !== cut) throw new Error(`N1: calendars differ at ${cut}`);

    const evT = new Evaluator(trunc);

    if (doorKey === 'parity-cut') cutDoor = trunc;

    for (const symbol of five) {
      for (const grid of sobolGrids(8, ['parity', 'N1', cut, symbol]).grids) {
        const a = evT.trace(symbol, grid, baseSettings).trades;
        const b = evF.trace(symbol, grid, baseSettings).trades;
        const closedA = a.filter((t) => t.exitIndex >= 0 && t.exitIndex < T);
        const closedB = b.filter((t) => t.exitIndex >= 0 && t.exitIndex < T);
        const equal = closedA.length === closedB.length && closedA.every((t, i) => strip(t) === strip(closedB[i]!));
        const decisionsA = a
          .filter((t) => t.decisionIndex <= T)
          .map((t) => `${t.decisionIndex}:${t.decisionBar}:${t.entryIndex}:${t.entryBar}`);
        const decisionsB = b
          .filter((t) => t.decisionIndex <= T)
          .map(
            (t) =>
              `${t.decisionIndex}:${t.decisionBar}:${t.entryIndex >= 0 && t.entryIndex <= T ? `${t.entryIndex}:${t.entryBar}` : 'later'}`
          );
        const decisionsEqual =
          decisionsA.length === decisionsB.length &&
          decisionsA.every((d, i) => d === decisionsB[i] || decisionsB[i]?.endsWith('later'));

        n1.push({ kind: 'trace', cut, symbol, grid, closed: closedA.length, equal, decisionsEqual });
      }
    }

    for (const books of [
      ...lhsBooks(2, ['VGT', 'GDX'], ['parity', 'N1', 'VG']).books,
      ...lhsBooks(2, ['VGT', 'XBI', 'XRT'], ['parity', 'N1', 'VXR']).books,
      ...lhsBooks(2, ['VGT', 'XBI', 'XRT', 'GDX'], ['parity', 'N1', 'VXRG']).books,
      ...lhsBooks(2, five, ['parity', 'N1', 'VXRKG']).books,
      frozenBooks(five)
    ]) {
      const a = evT.replay(books);
      const b = evF.replay(books);
      const lotsA = a.lots
        .filter((l) => l.exitIndex >= 0 && l.exitIndex < T)
        .map((l) => `${l.symbol}:${l.entryTime}:${l.exitTime}:${l.net.toFixed(6)}`);
      const lotsB = b.lots
        .filter((l) => l.exitIndex >= 0 && l.exitIndex < T)
        .map((l) => `${l.symbol}:${l.entryTime}:${l.exitTime}:${l.net.toFixed(6)}`);
      let marksEqual = true;

      for (let i = 0; i < T; i++) if (Math.abs(a.marks[i]! - b.marks[i]!) > 1e-6) marksEqual = false;

      n1.push({
        kind: 'pool',
        cut,
        books: booksKey(books),
        lots: lotsA.length,
        lotsEqual: JSON.stringify(lotsA) === JSON.stringify(lotsB),
        marksEqual,
        markAtT: [a.marks[T], b.marks[T]]
      });
    }

    // the gating stress fills (Q7/T4): next-open stops and +25 bps stop slippage, on the frozen and two random pools
    for (const [name, settings] of [
      ['nextOpen', settingsWith({ stopFill: 'next-open' })],
      ['slip25', settingsWith({ stopSlippageBps: 25 })]
    ] as const) {
      for (const books of [frozenBooks(five), ...lhsBooks(2, five, ['parity', 'N1', 'stress', name]).books]) {
        const a = evT.replay(books, settings);
        const b = evF.replay(books, settings);
        const lotsA = a.lots
          .filter((l) => l.exitIndex >= 0 && l.exitIndex < T)
          .map((l) => `${l.symbol}:${l.entryTime}:${l.exitTime}:${l.net.toFixed(6)}`);
        const lotsB = b.lots
          .filter((l) => l.exitIndex >= 0 && l.exitIndex < T)
          .map((l) => `${l.symbol}:${l.entryTime}:${l.exitTime}:${l.net.toFixed(6)}`);
        let marksEqual = true;

        for (let i = 0; i < T; i++) if (Math.abs(a.marks[i]! - b.marks[i]!) > 1e-6) marksEqual = false;

        n1.push({
          kind: 'pool',
          cut,
          settings: name,
          books: booksKey(books),
          lots: lotsA.length,
          lotsEqual: JSON.stringify(lotsA) === JSON.stringify(lotsB),
          marksEqual
        });
      }
    }
  }

  passed.N1 = n1.every((row) =>
    row.kind === 'trace' ? row.equal && row.decisionsEqual : row.lotsEqual && row.marksEqual
  );
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
  const keys = variants.map(([, settings, window, hash]) =>
    traceKey({ ...ds, dataHash: hash } as typeof ds, book, settings, window)
  );
  const keysDistinct = new Set(keys).size === keys.length;
  const settingKeys = [
    baseSettings,
    settingsWith({ costBps: 10 }),
    settingsWith({ rate: 0.14 }),
    settingsWith({ stopFill: 'next-open' }),
    settingsWith({ stopSlippageBps: 25 }),
    settingsWith({ armDate: '2017-12-15' })
  ].map(settingsKey);
  const settingKeysDistinct = new Set(settingKeys).size === settingKeys.length;
  const tmp = resultFile('parity', 'c1-cache.jsonl');

  await fs.remove(tmp);

  const cacheA = await PointCache.open(cutDoor!, tmp);
  const labA = new Lab(new Evaluator(cutDoor!), cacheA);
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

  await fs.outputFile(
    tampered,
    [JSON.stringify({ ...JSON.parse(lines[0]!), engine: 'not-this-engine' }), ...lines.slice(1)].join('\n')
  );

  let refusedOtherEngine = false;

  try {
    await PointCache.open(cutDoor!, tampered);
  } catch {
    refusedOtherEngine = true;
  }

  const cacheB = await PointCache.open(cutDoor!, tmp);
  const fresh = new Evaluator(cutDoor!);
  const recomputeEqual = samples.every((books) => {
    const cached = cacheB.get(`${settingsKey(baseSettings)}#${booksKey(books)}`);
    const again = fresh.point(books);

    return (
      cached !== undefined &&
      JSON.stringify(cached, (_k, v) => (typeof v === 'number' && !Number.isFinite(v) ? null : v)) ===
        JSON.stringify(again, (_k, v) => (typeof v === 'number' && !Number.isFinite(v) ? null : v))
    );
  });

  await fs.remove(tmp);
  await fs.remove(tampered);
  passed.C1 =
    keysDistinct &&
    settingKeysDistinct &&
    refusedOtherDoor &&
    refusedOtherEngine &&
    recomputeEqual &&
    cacheB.loaded === 200;
  rows.push({
    gate: 'C1',
    keysDistinct,
    settingKeysDistinct,
    refusedOtherDoor,
    refusedOtherEngine,
    recomputeEqual,
    loaded: cacheB.loaded
  });
  log(`C1: ${passed.C1}`);

  // ----- D1: deterministic restart (child processes; reduced budget on the search-F19 door) -----
  const dir = resultFile('parity', 'restart');
  const run = (name: string, extra: string[] = []) => {
    const result = spawnSync(
      'node',
      [
        '--experimental-transform-types',
        '--disable-warning=ExperimentalWarning',
        '--max-old-space-size=8192',
        'src/study8-expanded-regime-d1/main.ts',
        'restart-probe',
        'VG',
        path.join(dir, `${name}.json`),
        path.join(dir, `${name}-cache.jsonl`),
        ...extra
      ],
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
    return {
      body: sha256(JSON.stringify(rest)),
      archive: sha256(zlib.gunzipSync(await fs.readFile(path.join(dir, `${name}-archive.csv.gz`))))
    };
  };
  const a = await bodyOf('a');
  const b = await bodyOf('b');
  const c = await bodyOf('c');

  passed.D1 = a.body === b.body && a.body === c.body && a.archive === b.archive && a.archive === c.archive;
  rows.push({ gate: 'D1', a, b, c });
  log(`D1: ${passed.D1}`);

  for (const name of ['a', 'b', 'c']) await fs.remove(path.join(dir, `${name}-cache.jsonl`));

  // ----- T0: the test-stage pipeline, dry run (review N2) -----
  // The whole test pipeline (full and lite evidence, T1–T7, Study 7-equivalent gates, minute series with the tracker
  // and lot-order assertions, gap risk, bootstraps with subset and G-PA comparators, persistence, return rank,
  // nominations and outcome) runs twice on a parity door with FROZEN configurations only, under fold F23's geometry
  // (training to 2023-12-29, test 2024) and the primary-fold branches. The two bodies must be identical in their sealed
  // form. Only booleans and counts are kept; no status or figure is printed.
  const { sealedForm, stageCore, testStageOn } = await import('./test.ts');
  const dry = await openDoor('parity', five, 'parity T0 (test-stage dry run on frozen configurations)', {
    windowKey: 'W24'
  });
  const vgBooks = frozenBooks(frozenPools.VG);
  const gBooks = { GDX: gdxControls['G-NM1']!.grid };
  const plan = {
    holders: [
      { rank: 1, track: 'VG', role: 'profit', id: 'dry-VG', books: vgBooks, tier: 'strong' },
      { rank: 2, track: 'G', role: 'profit', id: 'dry-G', books: gBooks, tier: 'modest' }
    ],
    members: [
      {
        track: 'VG',
        id: 'dry-VG',
        order: 1,
        pick: 'profit',
        qualified: true,
        selectionRobustPerYear: 3,
        confirmationRobustPerYear: 3,
        books: vgBooks
      },
      {
        track: 'G',
        id: 'dry-G',
        order: 1,
        pick: 'profit',
        qualified: true,
        selectionRobustPerYear: 2,
        confirmationRobustPerYear: 2,
        books: gBooks
      },
      {
        track: 'VXRKG',
        id: 'dry-B5',
        order: 1,
        pick: 'profit',
        qualified: false,
        selectionRobustPerYear: 1,
        confirmationRobustPerYear: 1,
        books: frozenBooks(five)
      }
    ]
  };
  const dryControls = {
    B1: frozenBooks(frozenPools.B1),
    B5: frozenBooks(five),
    VG: vgBooks,
    'G-PA': { GDX: gdxControls['G-PA']!.grid }
  };
  const runA = await testStageOn(dry, 'F23', plan, { primary: true, controls: dryControls, label: 'parity T0 a' });
  const runB = await testStageOn(dry, 'F23', plan, { primary: true, controls: dryControls, label: 'parity T0 b' });
  const t0 = {
    identical:
      stageCore(sealedForm(runA.body as unknown as Record<string, unknown>)) ===
      stageCore(sealedForm(runB.body as unknown as Record<string, unknown>)),
    holders: runA.body.holders.length,
    members: runA.body.members.length,
    liteMembers: runA.body.members.filter((m) => !m.holder).length,
    controls: Object.keys(runA.body.controls).length,
    holderSeries: runA.body.holders.every((h) => !!(h.deep as { series?: unknown }).series),
    gapRisk: runA.body.members.every((m) => m.holder || 'gapRisk' in (m.deep as object)),
    comparisons: runA.body.holders.map((h) => Object.keys(h.comparisons).length),
    returnRankComputed: runA.body.returnRank.selectionVsTestCentre.n === 3,
    outcomePresent: runA.body.outcome !== null,
    lotsRows: runA.lotsOut.length
  };

  passed.T0 =
    t0.identical &&
    t0.holders === 2 &&
    t0.members === 3 &&
    t0.liteMembers === 1 &&
    t0.holderSeries &&
    t0.gapRisk &&
    t0.returnRankComputed &&
    t0.outcomePresent &&
    t0.comparisons.every((n) => n === 6);
  rows.push({ gate: 'T0', ...t0 });
  log(`T0: ${passed.T0} ${JSON.stringify(t0)}`);

  // ----- G1: doors refuse out-of-order access (nothing is read when a door refuses) -----
  const refusals: Record<string, boolean> = {};

  for (const key of ['search-F24', 'search-F19', 'test-F19', 'test-F24', 'pilot-F24'] as const) {
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
  const record = await writeSealed(parityFile, {
    stage: 'PARITY',
    at: nowIso(),
    passed: all,
    gates: passed,
    rows,
    seconds: (Date.now() - started) / 1000
  });

  log(`parity: ${JSON.stringify(passed)}; ${record.file} ${record.bodyHash.slice(0, 12)}`);

  if (!all) throw new Error(`parity failed: ${JSON.stringify(passed)} — the study stops here (PROTOCOL.md §12)`);
};
