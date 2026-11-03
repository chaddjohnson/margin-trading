// Engineering and leakage gates (PROTOCOL.md §10), run after the protocol freeze and before S1; any failure stops the
// study. All on the training door (no bar after 2024-12-31 is read).
//   P1 replay = the authoritative N-book engine runNAllocator (lots, signals, virtual trades, daily rows, both
//      drawdowns, net; compareValues, 0 differences) for new-symbol pools (k = 1–5, seeded) at 0/5/10 bps, four of
//      them also at 14%, next-open stops and +25 bps slippage, plus frozen B5 and Study 8 #2 at 5 bps.
//   P2 this study's evaluator = Study 8's evaluator (every record field; periods on their shared keys) on B5-subset
//      configurations.
//   P3 Study 8's sealed F24 training-door centres (every candidate and control of the six tracks: net to the cent,
//      minute and daily DD, lots, episodes), and the sealed 384-point confirmation summaries of #1 and #2 VG with
//      Study 8's own design and labels.
//   N1 no lookahead at a 2019-12-31 cut: the truncated run reproduces the full run's closed lots, decisions and daily
//      marks before the cut (base fills, next-open and +25 bps).
//   N2 future-bar injection: synthetic crash bars appended after 2024-12-31 to copies of six projection files leave
//      the door id, the data prefix hashes and every record unchanged; read past the cut (outside the door) they do
//      change results (the test has power).
//   C1 cache: a reloaded persistent cache returns identical records; a foreign header is refused.
//   D1 determinism: two fresh evaluations (S1-style fit and an S3-style pool fit) are identical.
//   G1 door refusals: an end after 2024-12-31 and the canonical data/ root are refused.
//   E1 data: the projection files hash to the manifest and are byte prefixes of the refreshed canonical files; the five
//      B5 canonical files' pinned-length prefixes still hash to Study 8's pins (benchmark periods reproducible).
import { createHash } from 'node:crypto';
import path from 'node:path';
import fs from 'fs-extra';
import { compareValues, outputsOf } from '../portfolio-aware-d1/compare.ts';
import { traceWindowOf } from '../portfolio-aware-d1/data.ts';
import { type NUniverse, baseNRunConfig, bookOrderOf, runNAllocator } from '../portfolio-aware-d1/nbook/engine.ts';
import { loadNUniverse } from '../portfolio-aware-d1/nbook/universe.ts';
import { candidateBook } from '../portfolio-aware-d1/phenotypes.ts';
import { replayFixedPool } from '../portfolio-aware-d1/replay.ts';
import { traceBook, traceSettings } from '../portfolio-aware-d1/trace.ts';
import { Rng } from '../optimizer/rng.ts';
import { familyDesign, uniquePoints as s8UniquePoints } from '../study8-expanded-regime-d1/designs.ts';
import type { Door } from '../study8-expanded-regime-d1/data.ts';
import { Evaluator as S8Evaluator, settingsWith } from '../study8-expanded-regime-d1/evaluate.ts';
import { summarize } from '../study8-expanded-regime-d1/stats.ts';
import { study8PinnedBytes } from '../study8-runners/data.ts';
import { canonicalRoot, execution, nowIso, projectionRoot, resultFile, trainEnd } from './context.ts';
import { fitOf, screenDesign, seedValue } from './design.ts';
import { emptyLedger, openDoor, sha256 } from './door.ts';
import { type Books, Lab, type PointRecord, PointCache, S9Evaluator, baseSettings, booksKey } from './engine.ts';
import { incumbents, sealedTrainingCentres } from './incumbents.ts';

export const parityFile = resultFile('parity', 'parity.json');
const near = (a: number, b: number, tol = 0.005) => Math.abs(a - b) < tol;
const leakRoot = 'data/vintages/study9-leakage-test';

type Settings = { costBps: number; rate: number; stopFill: 'stop' | 'next-open'; stopSlippageBps: number };

// Study 6's replayAgainstFullWith for any symbols (the engine's own book order).
export const replayAgainstEngine = (
  loaded: Awaited<ReturnType<typeof loadNUniverse>>,
  books: Books,
  settings: Settings
) => {
  const symbols = bookOrderOf(Object.keys(books));
  const phenotypes = Object.fromEntries(symbols.map((s) => [s, candidateBook(s, `p9-${s}`, books[s]!)]));
  const window = traceWindowOf(loaded);
  const config = baseNRunConfig({
    key: 'parity',
    label: 'parity',
    mode: 'fixed',
    symbols,
    phenotypes,
    costBps: settings.costBps,
    rate: settings.rate,
    stopFill: settings.stopFill,
    stopSlippageBps: settings.stopSlippageBps,
    eligibilityIndex: window.armStart,
    accountingStartIndex: window.startIndex
  });
  const universe: NUniverse = {
    ...loaded.universe,
    instruments: Object.fromEntries(symbols.map((s) => [s, loaded.universe.instruments[s]!]))
  };
  const full = runNAllocator(universe, config);
  const replay = replayFixedPool(
    symbols.map((s) => ({
      symbol: s,
      ds: loaded.universe.instruments[s]!.ds,
      trace: traceBook(
        loaded.universe.instruments[s]!.ds,
        phenotypes[s]!,
        traceSettings(settings.costBps, {
          rate: settings.rate,
          stopFill: settings.stopFill,
          stopSlippageBps: settings.stopSlippageBps
        }),
        window
      )
    })),
    {
      symbols,
      startIndex: window.startIndex,
      endIndex: window.endIndex,
      principal: execution.principal,
      rate: settings.rate,
      costBps: settings.costBps,
      stopSlippageBps: settings.stopSlippageBps,
      detail: true
    }
  );
  const differences = compareValues(outputsOf(full), replay.full, { maxDifferences: 10 });
  const fullNet = full.lots.reduce((t, l) => t + l.net, 0);

  if (fullNet !== replay.net) differences.push(`net ${fullNet} vs ${replay.net}`);

  return {
    differences,
    net: replay.net,
    sameMinute: replay.sameMinuteDecisions,
    refusals: replay.refusals.length,
    lots: replay.lots.length,
    trades: full.trades.length,
    signals: full.signals.length,
    daily: full.daily.length
  };
};

const stripPeriods = (r: PointRecord) => {
  const { periods, ...rest } = r;

  void periods;
  return rest;
};

const sameRecord = (a: PointRecord, b: PointRecord) =>
  JSON.stringify(stripPeriods(a), (_k, v) => (typeof v === 'number' && Number.isNaN(v) ? 'NaN' : v)) ===
  JSON.stringify(stripPeriods(b), (_k, v) => (typeof v === 'number' && Number.isNaN(v) ? 'NaN' : v));

const json = (v: unknown) => JSON.stringify(v, (_k, x) => (typeof x === 'number' && Number.isNaN(x) ? 'NaN' : x));

export const runParity = async (universe: readonly string[]) => {
  const started = Date.now();
  const gates: Record<string, { pass: boolean; detail: unknown }> = {};
  const door = await openDoor(universe, 'parity gates (training door)', { key: 'parity' });
  const ev = new S9Evaluator(door);
  const design = screenDesign();
  const rng = new Rng(seedValue(['parity', 'pools']));
  const randomPool = (k: number) => {
    const picked = new Set<string>();

    while (picked.size < k) picked.add(universe[rng.int(universe.length)]!);

    return Object.fromEntries([...picked].map((s) => [s, design[rng.int(design.length)]!.grid])) as Books;
  };
  const frozen = await incumbents();
  const byKey = Object.fromEntries(frozen.map((f) => [f.key, f.books]));

  // P1
  const p1Configs: { name: string; books: Books; settings: Settings[] }[] = [];
  const costs = [0, 5, 10].map((costBps) => ({ ...baseSettings, costBps }) as Settings);
  const extra = [
    settingsWith({ rate: 0.14 }),
    settingsWith({ stopFill: 'next-open' }),
    settingsWith({ stopSlippageBps: 25 })
  ] as Settings[];

  for (const [k, count] of [
    [1, 2],
    [2, 2],
    [3, 2],
    [4, 2],
    [5, 2]
  ] as const) {
    for (let i = 0; i < count; i++)
      p1Configs.push({
        name: `random-k${k}-${i + 1}`,
        books: randomPool(k),
        settings: i === 0 && k >= 2 ? [...costs, ...extra] : costs
      });
  }

  // tie-heavy pools (review M10): near-duplicates at one identical, shallow vector (the design's smallest dip depth)
  const shallow = [...design].sort(
    (a, b) => a.grid.targetPercentChange - b.grid.targetPercentChange || a.index - b.index
  )[0]!.grid;
  const tiePools = [
    ['VGT', 'XLK'],
    ['GLD', 'IAU'],
    ['IJR', 'IWM'],
    ['KBE', 'KRE'],
    ['XLU', 'VPU'],
    ['IJH', 'IJR', 'IWM', 'IWN', 'RSP']
  ];

  for (const members of tiePools) {
    p1Configs.push({
      name: `tie-${members.join('+')}`,
      books: Object.fromEntries(members.map((s) => [s, { ...shallow }])) as Books,
      settings: [baseSettings as Settings, settingsWith({ stopFill: 'next-open' }) as Settings]
    });
  }

  p1Configs.push({ name: 'B5', books: byKey.B5!, settings: [baseSettings as Settings] });
  p1Configs.push({ name: 'S8-2', books: byKey['S8-2']!, settings: [baseSettings as Settings] });

  const p1: unknown[] = [];
  let p1Pass = true;
  let tieSameMinute = 0;
  let tieRefusals = 0;

  for (const config of p1Configs) {
    for (const settings of config.settings) {
      const outcome = replayAgainstEngine(door.loaded, config.books, settings);
      const mine = ev.point(config.books, settingsWith(settings));
      const ok = outcome.differences.length === 0 && near(outcome.net, mine.net) && outcome.lots === mine.lots;

      p1Pass &&= ok;

      if (config.name.startsWith('tie-')) {
        tieSameMinute += outcome.sameMinute;
        tieRefusals += outcome.refusals;
      }

      p1.push({
        name: config.name,
        books: booksKey(config.books),
        settings,
        ok,
        differences: outcome.differences,
        lots: outcome.lots,
        trades: outcome.trades,
        signals: outcome.signals,
        daily: outcome.daily
      });
    }
  }

  gates.P1 = {
    pass: p1Pass && tieSameMinute > 0 && tieRefusals > 0,
    detail: { tieSameMinuteDecisions: tieSameMinute, tieRefusals, runs: p1 }
  };

  // P2
  const s8 = new S8Evaluator(door as unknown as Door);
  const p2Books: { name: string; books: Books }[] = [
    ...['B1', 'B5', 'S8-1', 'S8-2', 'S8-3', 'VG-frozen'].map((key) => ({ name: key, books: byKey[key]! })),
    ...[2, 3, 4, 5].map((k) => {
      const five = ['VGT', 'XBI', 'XRT', 'KRE', 'GDX'].slice(0, k);

      return {
        name: `b5-random-k${k}`,
        books: Object.fromEntries(five.map((s) => [s, design[rng.int(design.length)]!.grid])) as Books
      };
    })
  ];
  const p2 = p2Books.map(({ name, books }) => {
    const a = ev.point(books);
    const b = s8.point(books);
    const shared = Object.keys(a.periods).filter((key) => key in b.periods);
    const periodsOk = shared.every((key) => a.periods[key] === b.periods[key]);

    return { name, ok: sameRecord(a, b) && periodsOk && shared.length >= 8, sharedPeriods: shared.length };
  });

  gates.P2 = { pass: p2.every((r) => r.ok), detail: p2 };

  // P3
  const sealed = await sealedTrainingCentres();
  const p3Rows = sealed.map((s) => {
    const r = ev.point(s.books);
    const ok =
      near(r.net, s.net) &&
      Math.abs(r.dd - s.dd) < 1e-6 &&
      Math.abs(r.ddDaily - s.ddDaily) < 1e-6 &&
      r.lots === s.lots &&
      r.episodes === s.episodes;

    return {
      track: s.track,
      kind: s.kind,
      id: s.id,
      ok,
      net: r.net,
      sealedNet: s.net,
      dd: r.dd,
      sealedDd: s.dd,
      lots: r.lots,
      sealedLots: s.lots
    };
  });
  const lab = new Lab(ev, PointCache.memory(door));
  const vg = (await fs.readJson('research/study8-expanded-regime-d1/results/qualify/VG/F24/qualification.json')) as {
    candidates: {
      id: string;
      books: Books;
      evidence: { decisive: { nb: { n: number; share: number; medianNet: number; p10Net: number; p90Dd: number } } };
    }[];
  };
  const decisive = ['S8-1', 'S8-2'].map((key) => {
    const books = byKey[key]!;
    const id = frozen.find((f) => f.key === key)!.study8Id!;
    const target = vg.candidates.find((c) => c.id === id)!.evidence.decisive.nb;
    const points = s8UniquePoints(
      [1, 2, 3].flatMap((rep) =>
        familyDesign(books, ['VGT', 'GDX'], { n: 128, labels: ['confirm', 'VG', 'F24', rep] })
      ),
      books
    );
    const s = summarize(points.map((p) => lab.point(p.books)));
    const ok =
      s.n === target.n &&
      s.share === target.share &&
      near(s.medianNet, target.medianNet) &&
      near(s.p10Net, target.p10Net) &&
      Math.abs(s.p90Dd - target.p90Dd) < 1e-6;

    return { key, id, ok, n: s.n, share: s.share, medianNet: s.medianNet, p10Net: s.p10Net, p90Dd: s.p90Dd, target };
  });

  gates.P3 = {
    pass: p3Rows.every((r) => r.ok) && decisive.every((d) => d.ok),
    detail: { centres: p3Rows.length, failed: p3Rows.filter((r) => !r.ok), rows: p3Rows, decisive }
  };

  // N1
  const cut = '2019-12-31';
  const cutDoor = await openDoor(universe, 'parity N1 truncated door (2019-12-31)', { key: 'parity-cut', end: cut });
  const cutEv = new S9Evaluator(cutDoor);
  const cutIndex = cutDoor.lastIndex;
  const n1Configs: { name: string; books: Books }[] = [
    { name: 'B5', books: byKey.B5! },
    { name: 'S8-2', books: byKey['S8-2']! },
    ...[2, 3, 5].map((k) => ({ name: `random-k${k}`, books: randomPool(k) }))
  ];
  const n1 = n1Configs.flatMap(({ name, books }) =>
    [baseSettings, settingsWith({ stopFill: 'next-open' }), settingsWith({ stopSlippageBps: 25 })].map((settings) => {
      const full = ev.replay(books, settings, true);
      const part = cutEv.replay(books, settings, true);
      const closed = (lots: typeof full.lots) =>
        lots
          .filter((l) => l.exitIndex >= 0 && l.exitIndex < cutIndex)
          .map((l) => [l.symbol, l.entryTime, l.exitTime, Math.round(l.net * 1e6)]);
      const refusals = (r: typeof full) =>
        r.refusals
          .filter((x) => x.decisionIndex < cutIndex)
          .map((x) => [x.decider, x.holder, x.decisionIndex, x.tradeId]);
      const marksOk = Array.from({ length: cutIndex }, (_v, i) => i).every((i) => full.marks[i] === part.marks[i]);
      const ok =
        json(closed(full.lots)) === json(closed(part.lots)) && marksOk && json(refusals(full)) === json(refusals(part));

      return {
        name,
        settings: `${settings.stopFill}/${settings.stopSlippageBps}`,
        ok,
        closedBeforeCut: closed(full.lots).length
      };
    })
  );

  gates.N1 = { pass: n1.every((r) => r.ok), detail: n1 };

  // N2
  const injected = ['VGT', 'GDX', 'XLE', 'EWZ', 'TLT', 'KRE'];

  await fs.remove(leakRoot);
  await fs.ensureDir(leakRoot);
  await fs.copyFile(path.join(projectionRoot, 'partitions.json'), path.join(leakRoot, 'partitions.json'));

  const sessions = ['2025-01-02', '2025-01-03', '2025-01-06', '2025-01-07', '2025-01-08'];

  for (const symbol of injected) {
    const source = path.join(projectionRoot, symbol, 'data.csv');
    const text = await fs.readFile(source, 'utf8');
    const lastClose = Number(text.trimEnd().split('\n').at(-1)!.split(',')[4]);
    let price = lastClose;
    const rows: string[] = [];

    for (const date of sessions) {
      for (let minute = 0; minute < 390; minute++) {
        const t = Date.parse(`${date}T14:30:00Z`) + minute * 60000;
        const next = price * (1 - 0.1 / 390);

        rows.push(
          `"${new Date(t).toISOString().replace('.000', '')}",${price.toFixed(4)},${price.toFixed(4)},${next.toFixed(4)},${next.toFixed(4)},5000\n`
        );
        price = next;
      }
    }

    await fs.outputFile(path.join(leakRoot, symbol, 'data.csv'), text + rows.join(''));
  }

  const projDoor = await openDoor(injected, 'parity N2 reference (projection)', { key: 'parity-n2' });
  const leakDoor = await openDoor(injected, 'parity N2 injected copy', { key: 'parity-n2-injected', root: leakRoot });
  const projEv = new S9Evaluator(projDoor);
  const leakEv = new S9Evaluator(leakDoor);
  const n2Configs: Books[] = [
    { VGT: byKey.B1!.VGT! } as Books,
    { VGT: byKey['S8-2']!.VGT!, GDX: byKey['S8-2']!.GDX! } as Books,
    ...[1, 2, 3, 4].map((k) => {
      const picked = injected.slice(0, k + 1);

      return Object.fromEntries(picked.map((s) => [s, design[rng.int(design.length)]!.grid])) as Books;
    })
  ];
  // a configuration holding a lot open on 2024-12-31 (the first design vector on VGT that does), so the cut matters
  const openAtCut = design.map((v) => ({ VGT: v.grid }) as Books).find((books) => projEv.point(books).open > 0);

  if (openAtCut) n2Configs.push(openAtCut);

  const n2Settings = [baseSettings, settingsWith({ stopFill: 'next-open' }), settingsWith({ stopSlippageBps: 25 })];
  const n2Rows = n2Configs.flatMap((books) =>
    n2Settings.map((settings) => ({
      books: booksKey(books),
      settings: `${settings.stopFill}/${settings.stopSlippageBps}`,
      open: projEv.point(books, settings).open,
      ok: json(projEv.point(books, settings)) === json(leakEv.point(books, settings))
    }))
  );
  const fileChanged = await Promise.all(
    injected.map(
      async (s) => sha256(await fs.readFile(path.join(leakRoot, s, 'data.csv'))) !== projDoor.prefixSha256[s]
    )
  );
  // power: read past the cut directly through the repository loader (outside the Phase A door)
  const past = await loadNUniverse({
    members: injected,
    partition: 'all',
    access: 'manual evaluation',
    warmupSessions: 0,
    endDate: '2025-01-08',
    root: leakRoot,
    ledger: emptyLedger
  });
  const pastDoor = {
    ...leakDoor,
    loaded: past,
    dates: past.universe.dates,
    lastIndex: past.universe.dates.length - 1,
    eligibilityIndex: past.universe.eligibilityIndex
  };
  const pastEv = new S9Evaluator(pastDoor);
  const power = n2Configs.some((books) => {
    const a = pastEv.point(books);
    const b = projEv.point(books);

    return a.net !== b.net || a.lots !== b.lots;
  });

  gates.N2 = {
    pass:
      openAtCut !== undefined &&
      projDoor.id === leakDoor.id &&
      json(projDoor.prefixSha256) === json(leakDoor.prefixSha256) &&
      n2Rows.every((r) => r.ok) &&
      fileChanged.every(Boolean) &&
      power,
    detail: {
      doorIds: [projDoor.id, leakDoor.id],
      filesDiffer: fileChanged,
      rows: n2Rows,
      injectedSessions: sessions,
      pastLastDate: past.universe.dates.at(-1),
      power
    }
  };
  await fs.remove(leakRoot);

  // C1
  const cacheFile = resultFile('cache', 'parity', 'c1.jsonl');

  await fs.remove(cacheFile);

  const c1Door = await openDoor(['VGT', 'GDX'], 'parity C1 cache', { key: 'parity-c1' });
  const c1Ev = new S9Evaluator(c1Door);
  const first = new Lab(c1Ev, await PointCache.open(c1Door, cacheFile));
  const sample: Books[] = design
    .slice(0, 20)
    .flatMap((v, i) => [{ VGT: v.grid } as Books, { VGT: v.grid, GDX: design[(i + 7) % 64]!.grid } as Books]);
  const fresh = sample.map((books) => first.point(books));

  first.cache.flushSync();

  const reopened = new Lab(new S9Evaluator(c1Door), await PointCache.open(c1Door, cacheFile));
  const reloaded = sample.map((books) => reopened.point(books));
  let refused = false;

  try {
    await PointCache.open(door, cacheFile);
  } catch {
    refused = true;
  }

  gates.C1 = {
    pass: json(fresh) === json(reloaded) && reopened.computed === 0 && refused,
    detail: { points: sample.length, recomputed: reopened.computed, foreignHeaderRefused: refused }
  };
  await fs.remove(cacheFile);

  // D1
  const d1Books: Books[] = [
    { XLE: design[3]!.grid },
    { VGT: design[5]!.grid, XLE: design[9]!.grid, EWZ: design[40]!.grid }
  ];
  const runOnce = () => {
    const l = new Lab(new S9Evaluator(door), PointCache.memory(door));

    return d1Books.map((books) => {
      const f = fitOf(l, books, [{ name: 'd1', n: 16, labels: ['parity', 'd1'] }]);

      return json({ centre: f.centre, nb: f.nb, violation: f.violation });
    });
  };

  gates.D1 = { pass: json(runOnce()) === json(runOnce()), detail: { configs: d1Books.length } };

  // G1
  const refusedEnd = await openDoor(['VGT'], 'parity G1 (must refuse)', { end: '2025-01-02' }).then(
    () => false,
    () => true
  );
  const refusedRoot = await openDoor(['VGT'], 'parity G1 (must refuse)', { root: canonicalRoot }).then(
    () => false,
    () => true
  );

  gates.G1 = { pass: refusedEnd && refusedRoot, detail: { refusedEnd, refusedRoot } };

  // E1
  const manifest = (await fs.readJson(resultFile('s0', 'projection.json'))) as {
    files: Record<string, { sha256: string; bytes: number }>;
  };
  const e1Rows = await Promise.all(
    Object.entries(manifest.files).map(async ([symbol, entry]) => {
      const proj = await fs.readFile(path.join(projectionRoot, symbol, 'data.csv'));
      const canon = await fs.readFile(path.join(canonicalRoot, symbol, 'data.csv'));

      return {
        symbol,
        ok: sha256(proj) === entry.sha256 && proj.length === entry.bytes && canon.subarray(0, proj.length).equals(proj)
      };
    })
  );
  const pins = (await fs.readJson('research/study8-expanded-regime-d1/results/protocol_freeze.json')) as Record<
    string,
    unknown
  >;
  const pinOf = (symbol: string) =>
    (pins as { integrity?: { data?: Record<string, string> } }).integrity?.data?.[`data/${symbol}/data.csv`];
  // per symbol (review m13): the Study 8-pinned-length prefix of the refreshed file equals that symbol's own pin, and
  // for all 64 files the prior-length prefix equals the pre-refresh vintage
  const b5Rows = await Promise.all(
    Object.entries(study8PinnedBytes).map(async ([symbol, bytes]) => {
      const canon = await fs.readFile(path.join(canonicalRoot, symbol, 'data.csv'));
      const prefix = createHash('sha256').update(canon.subarray(0, bytes)).digest('hex');

      return { symbol, prefix, pin: pinOf(symbol), ok: pinOf(symbol) === prefix };
    })
  );
  const prior = (await fs.readJson(resultFile('s0', 'inventory-pre-refresh.json'))) as {
    files: Record<string, { sha256: string; bytes: number }>;
  };
  const vintageRows = await Promise.all(
    Object.entries(prior.files).map(async ([symbol, v]) => {
      const canon = await fs.readFile(path.join(canonicalRoot, symbol, 'data.csv'));

      return { symbol, ok: createHash('sha256').update(canon.subarray(0, v.bytes)).digest('hex') === v.sha256 };
    })
  );

  gates.E1 = {
    pass: e1Rows.every((r) => r.ok) && b5Rows.every((r) => r.ok) && vintageRows.every((r) => r.ok),
    detail: {
      projection: e1Rows.filter((r) => !r.ok),
      study8Prefixes: b5Rows,
      priorVintagePrefixes: { checked: vintageRows.length, failed: vintageRows.filter((r) => !r.ok) }
    }
  };

  const passed = Object.values(gates).every((g) => g.pass);
  const record = { stage: 'parity', at: nowIso(), trainEnd, passed, gates, seconds: (Date.now() - started) / 1000 };

  await fs.outputJson(parityFile, record, { spaces: 1 });
  console.info(
    Object.entries(gates)
      .map(([k, g]) => `${k} ${g.pass ? 'PASS' : 'FAIL'}`)
      .join(' · '),
    `→ ${passed ? 'PASSED' : 'FAILED'} in ${record.seconds.toFixed(0)} s`
  );

  return record;
};
