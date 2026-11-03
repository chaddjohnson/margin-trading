// Engineering and leakage gates (PROTOCOL.md §10), stage `parity`: after the protocol freeze, before any search; any
// failure stops the study (the attempt's record is kept under its own run folder and nothing is sealed). Every door here
// ends ≤ 2024-12-31 on the training projection (or a leakage-test copy); no bar after 2024-12-31 is read by any strategy
// computation. Each attempt writes its scratch outputs under results/parity/run-<UTC>/ (review M7).
//   PA  Phase A's chain verifies with its own read-only command; Study 8's sealed chain files hash to its chain.
//   S8C the live Study 8 code and engine files equal Study 8's last sealed acknowledgement (code-E1.json) (m4).
//   RB  the Study 8 rulebook imported here equals the one sealed in Study 8's FROZEN_SELECTION.json; the period list,
//       years, half-years and primary fold are Study 8's own objects (m4).
//   E1  data: the 13 projection files equal Phase A's manifest and are byte prefixes of the canonical files; the five B5
//       canonical files' Study 8-pinned-length prefixes equal Study 8's pins; bytes after 2026-10-30 reported (m10).
//   P1  the PRODUCTION replay (P9Evaluator) = the authoritative runNAllocator, 0 differences, for all seven memberships
//       (3 new vectors + 2 perturbations × 0/5/10 bps × W19/W21/W24; 14%, next-open, +25 bps; a tie-heavy pool), the
//       frozen controls and Study 8 VG #1/#2; refusals in every membership and same-minute decisions overall (m1).
//   P2  this study's evaluator = Study 8's (every record field), base and next-open, on B5-subset configurations.
//   P3  Study 8's sealed F24 training-door centres (every candidate and control of its six tracks) to the cent.
//   P6  the minute-series port = Study 6's on B5-subset configurations; it reproduces the tracker on every membership.
//   A1  the ported space and designs under Study 8's namespace return Study 8's own draws exactly.
//   A2  the ported evidence under Study 8's namespace reproduces Study 8's sealed F24 qualification evidence and gates
//       of VG #1 and VG #2.
//   A3  (child) the ported optimizer under Study 8's namespace reproduces Study 8's sealed VG-F19 search record.
//   A4  (child) the ported test stage under Study 8's namespace reproduces Study 8's sealed F23 and F21 test evidence,
//       sensitivities, gap risk, gates and statuses for a holder of each of G, VG, VXRG and two lite members (M6).
//   N1  no lookahead at every procedure-fold cut: the truncated run reproduces the full training run's closed lots,
//       entries, refusals and daily marks THROUGH the cut session, and the per-book closed trades (M3).
//   N2  adversarial future bars at EVERY cut (2019-12-31, 2020-12-31, 2021-12-31, 2023-12-29, 2024-12-31): copies whose
//       bars after the cut are replaced by a synthetic crash give identical door ids, prefix hashes, point records
//       (including a configuration holding a lot open at the cut), full replay marks, lots and refusals, rung-1 fits,
//       cache headers and (at 2019-12-31 and 2024-12-31) a smoke-budget search body; read past the cut outside the
//       door, results change (power) (M3).
//   C1  cache reload identical; a foreign job, door id or engine hash is refused; 200 recomputations equal (m2).
//   D1  a smoke-budget search fresh twice and stopped-and-resumed: identical bodies and archives.
//   T0  the test pipeline twice on a parity door (F23 geometry, primary branches): identical sealed forms; every
//       holder has series, gap risk and 8 bootstraps.
//   G1  door refusals, each with its expected reason (m2).
//   L1  only door.ts, integrity.ts, parity.ts and the post-test diagnostics read market data or call the loader (m11).
// Parity searches and fits use labels prefixed 'parity' (m5). Disclosed exceptions: T0 runs the test pipeline with the
// production test labels ('test', 'sets', 'F23', rep) on frozen and parity configurations (outputs kept as booleans
// only), and A1–A4 use Study 8's own labels under Study 8's namespace (review V2).
import { spawn } from 'node:child_process';
import path from 'node:path';
import zlib from 'node:zlib';
import fs from 'fs-extra';
import { loadNUniverse } from '../portfolio-aware-d1/nbook/universe.ts';
import * as s8ContextModule from '../study8-expanded-regime-d1/context.ts';
import { constantsSnapshot as s8Constants, seedOf as s8SeedOf } from '../study8-expanded-regime-d1/context.ts';
import { familyDesign as s8FamilyDesign } from '../study8-expanded-regime-d1/designs.ts';
import { Evaluator as S8Evaluator } from '../study8-expanded-regime-d1/evaluate.ts';
import { verifyChain as s8VerifyChain } from '../study8-expanded-regime-d1/records.ts';
import { lhsBooks as s8LhsBooks, sobolGrids as s8SobolGrids } from '../study8-expanded-regime-d1/space.ts';
import { Lab as Study6Lab, minuteSeries as s6MinuteSeries } from '../study6-b5-kre-robustness/evaluate.ts';
import { emptyLedger } from '../study9-etf-pool-discovery/door.ts';
import { sealedTrainingCentres } from '../study9-etf-pool-discovery/incumbents.ts';
import { prefixLengthThrough } from '../study9-etf-pool-discovery/s0.ts';
import { engineParity } from './allocparity.ts';
import {
  allSymbols,
  canonicalRoot,
  codeDir,
  folds,
  halfYears,
  parityFile,
  periodList,
  primaryFold,
  projectionManifest,
  projectionRoot,
  resultFile,
  testControlKeys,
  trackBooks,
  trackKeys,
  years
} from './context.ts';
import { controlBooks, controlsOf } from './controls.ts';
import { familyDesign } from './designs.ts';
import { type P9Door, leakRoot, openDoor } from './door.ts';
import {
  type Books,
  Lab,
  P9Evaluator,
  PointCache,
  baseSettings,
  booksKey,
  settingsKey,
  settingsWith
} from './engine.ts';
import { evidenceOf, qualificationOf } from './evidence.ts';
import { fitOf, floorsOf } from './fitness.ts';
import { prefixOf } from './integrity.ts';
import { fileSha256, log, nowIso, readSealed, sha256, writeSealed } from './records.ts';
import { minuteSeries, seriesLabOf } from './series.ts';
import { lhsBooks, sobolGrids, withNamespace } from './space.ts';
import { sealedForm, stageCore, testStageOn } from './test.ts';

const json = (v: unknown) =>
  JSON.stringify(v, (_k, x) => (typeof x === 'number' && !Number.isFinite(x) ? String(x) : x));
const near = (a: number, b: number, tol = 0.005) => Math.abs(a - b) < tol;
const node = ['--experimental-transform-types', '--disable-warning=ExperimentalWarning', '--max-old-space-size=12288'];
const mainFile = path.join(codeDir, 'main.ts');

const child = (args: string[], logFile: string) =>
  new Promise<number>((resolve) => {
    const out = fs.openSync(logFile, 'w');
    const proc = spawn(process.execPath, [...node, mainFile, ...args], { stdio: ['ignore', out, out] });

    proc.on('exit', (code) => {
      fs.closeSync(out);
      resolve(code ?? 1);
    });
  });

// The fields of a search record that the algorithm decides (not timestamps, door ids, paths, namespaces or statistics).
export const searchCore = (record: Record<string, unknown>) =>
  json({
    job: record.job,
    track: record.track,
    fold: record.fold,
    mode: record.mode,
    symbols: record.symbols,
    y: record.y,
    floors: record.floors,
    budget: record.budget,
    schedule: record.schedule,
    counts: record.counts,
    islands: record.islands,
    triggers: record.triggers,
    rung2: record.rung2,
    rung3: record.rung3,
    refinements: record.refinements,
    shortlist: record.shortlist,
    controls: record.controls,
    noEligibleRegion: record.noEligibleRegion,
    archiveRows: (record.archive as { rows: number }).rows
  });

const study8Root = 'research/study8-expanded-regime-d1';
const study8SearchFile = `${study8Root}/results/search/VG/F19/search.json`;
const archiveOf = async (file: string) => sha256(zlib.gunzipSync(await fs.readFile(file)));

// ----- child A3: Study 8's VG-F19 search replayed with this study's optimizer port and Study 8's namespace -----
export const runA3 = async (runDir: string) => {
  const { runSearch } = await import('./search.ts');
  const { setNamespaceForParityReplay } = await import('./space.ts');
  const frozenVg = await controlBooks('VG-frozen');
  const door = await openDoor(
    'parity-a3',
    ['VGT', 'GDX'],
    'parity A3: Study 8 VG-F19 search replayed (Study 8 namespace)',
    {
      end: folds.F19.trainEnd
    }
  );

  setNamespaceForParityReplay(s8SeedOf);
  await runSearch({ key: 'VG', books: ['VGT', 'GDX'] }, 'F19', {
    mode: 'base',
    parityReplay: true,
    door,
    out: path.join(runDir, 'a3-search-VG-F19.json'),
    cacheFile: path.join(runDir, 'a3-cache-VG-F19.jsonl'),
    controls: { VG: frozenVg, B1: { VGT: (await controlBooks('B1')).VGT! } }
  });
};

// ----- child A4: Study 8's F23 and F21 test evidence replayed with this study's test-stage port -----
interface S8TestRecord {
  holders: Record<string, unknown>[];
  members: Record<string, unknown>[];
}

export const runA4 = async (runDir: string) => {
  const { setNamespaceForParityReplay } = await import('./space.ts');
  const s8Selection = await readSealed<{
    rankedByFold: Record<
      string,
      { rank: number; track: string; role: string; id: string; books: Books; tier: string }[]
    >;
    testPlan: Record<
      string,
      {
        shortlists: {
          track: string;
          id: string;
          order: number;
          pick: string;
          qualified: boolean;
          selectionRobustPerYear: number;
          confirmationRobustPerYear: number;
          books: Books;
        }[];
      }
    >;
  }>(`${study8Root}/FROZEN_SELECTION.json`);
  const controls = await controlsOf([...testControlKeys]);
  const rows: Record<string, unknown>[] = [];

  setNamespaceForParityReplay(s8SeedOf);

  for (const fold of ['F23', 'F21'] as const) {
    const ranked = s8Selection.rankedByFold[fold]!;
    const holders = ['G', 'VG', 'VXRG'].map((track) => ranked.find((h) => h.track === track)!);
    const holderIds = new Set(ranked.map((h) => `${h.track}/${h.id}`));
    const shortlists = s8Selection.testPlan[fold]!.shortlists;
    const plan = {
      holders,
      members: [
        ...shortlists.filter((m) => holders.some((h) => h.track === m.track && h.id === m.id)),
        ...(() => {
          // review V8: one lite member, then the first pooled (≥ 2 books) lite member
          const rest = shortlists.filter((m) => !holderIds.has(`${m.track}/${m.id}`));
          const firstLite = rest[0]!;
          const pooled = rest.find((m) => m !== firstLite && Object.keys(m.books).length >= 2)!;

          return [firstLite, pooled];
        })()
      ]
    };
    const door = await openDoor(
      `parity-a4-${fold}`,
      ['VGT', 'XBI', 'XRT', 'KRE', 'GDX'],
      `parity A4: Study 8 ${fold} test replayed`,
      {
        end: folds[fold].testEnd
      }
    );
    const stage = await testStageOn(door, fold, plan, { primary: false, controls, label: `parity A4 ${fold}` });
    const ours = sealedForm(stage.body as never) as {
      holders: Record<string, unknown>[];
      members: Record<string, unknown>[];
    };
    const sealed = await readSealed<S8TestRecord>(`${study8Root}/results/test/${fold}/test.json`);

    for (const holder of ours.holders) {
      const theirs = sealed.holders.find((h) => h.track === holder.track && h.id === holder.id);
      const fields = ['evidence', 'deep', 'gates', 's7Equivalent'];

      rows.push({
        fold,
        kind: 'holder',
        who: `${String(holder.track)} #${String(holder.rank)}`,
        equal: Object.fromEntries(fields.map((f) => [f, json(holder[f]) === json(theirs?.[f])]))
      });
    }

    for (const member of ours.members.filter((m) => m.holder === false)) {
      const theirs = sealed.members.find((m) => m.track === member.track && m.id === member.id);
      const fields = ['centre', 'testMedian', 'evidence', 'deep', 'gates', 's7Equivalent'];

      rows.push({
        fold,
        kind: 'member',
        who: `${String(member.track)} #${String(member.order)}`,
        equal: Object.fromEntries(fields.map((f) => [f, json(member[f]) === json(theirs?.[f])]))
      });
    }
  }

  await fs.outputJson(path.join(runDir, 'a4.json'), { rows });
};

// A leakage-test copy: every symbol's projection bytes through `cut`, then five synthetic crash sessions.
const buildLeak = async (root: string, cut: string, sessions: readonly string[]) => {
  await fs.remove(root);
  await fs.ensureDir(root);
  await fs.copyFile(path.join(projectionRoot, 'partitions.json'), path.join(root, 'partitions.json'));

  for (const symbol of allSymbols) {
    const bytes = await fs.readFile(path.join(projectionRoot, symbol, 'data.csv'));
    const prefix = bytes.subarray(0, prefixLengthThrough(bytes, cut).bytes).toString('latin1');
    let price = Number(prefix.trimEnd().split('\n').at(-1)!.split(',')[4]);
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

    await fs.outputFile(path.join(root, symbol, 'data.csv'), prefix + rows.join(''), 'latin1');
  }
};

export const runParity = async () => {
  const started = Date.now();
  const gates: Record<string, { pass: boolean; detail: unknown }> = {};
  const record = (key: string, pass: boolean, detail: unknown) => {
    gates[key] = { pass, detail };
    log(`parity ${key}: ${pass ? 'pass' : 'FAIL'}`);
  };
  const runDir = resultFile('parity', `run-${nowIso().replace(/[:.]/g, '')}`);

  await fs.ensureDir(runDir);

  // A3 and A4 run in parallel in their own processes (their own parity doors, Study 8's namespace)
  const a3 = child(['parity-a3', runDir], path.join(runDir, 'a3.log'));
  const a4 = child(['parity-a4', runDir], path.join(runDir, 'a4.log'));

  // ----- PA -----
  const phaseA = await new Promise<{ code: number; text: string }>((resolve) => {
    const proc = spawn(process.execPath, [...node, 'src/study9-etf-pool-discovery/main.ts', 'verify-chain'], {
      stdio: ['ignore', 'pipe', 'pipe']
    });
    let text = '';

    proc.stdout.on('data', (d) => (text += String(d)));
    proc.stderr.on('data', (d) => (text += String(d)));
    proc.on('exit', (code) => resolve({ code: code ?? 1, text }));
  });
  const s8Chain = await s8VerifyChain();

  record('PA', phaseA.code === 0 && phaseA.text.includes('head a1e912a2b5fd2556') && s8Chain.length > 0, {
    phaseA: phaseA.text.trim().split('\n').at(-1),
    study8Entries: s8Chain.length,
    study8Head: s8Chain.at(-1)?.entryHash
  });

  // ----- S8C -----
  const s8Ack = await readSealed<{ codeFiles: Record<string, string>; engineFiles: Record<string, string> }>(
    `${study8Root}/results/freeze/code-E1.json`
  );
  const s8Files = { ...s8Ack.codeFiles, ...s8Ack.engineFiles };
  const s8Changed: string[] = [];

  for (const [file, hash] of Object.entries(s8Files)) if ((await fileSha256(file)) !== hash) s8Changed.push(file);

  record('S8C', Object.keys(s8Files).length > 100 && s8Changed.length === 0, {
    files: Object.keys(s8Files).length,
    changed: s8Changed
  });

  // ----- RB -----
  const s8Frozen = await readSealed<{ constants: { values: Record<string, unknown> } }>(
    `${study8Root}/FROZEN_SELECTION.json`
  );
  const { constantsSnapshot } = await import('./context.ts');
  const mine = s8Constants() as Record<string, unknown>;
  const ours = constantsSnapshot() as Record<string, unknown>;
  const keys = [
    'execution',
    'eligibility',
    'testGates',
    'insufficientTestLots',
    'schedule',
    'stresses',
    'executionSettings',
    'bootstrap',
    'folds',
    'windows',
    'episodeGap',
    'radius'
  ];
  const rbRows = keys.map((key) => ({
    key,
    study8Live: json(mine[key]) === json(s8Frozen.constants.values[key]),
    phaseB: json(ours[key]) === json(s8Frozen.constants.values[key])
  }));
  const sameObjects =
    periodList === s8ContextModule.periodList &&
    years === s8ContextModule.years &&
    halfYears === s8ContextModule.halfYears &&
    primaryFold === s8ContextModule.primaryFold;

  record('RB', rbRows.every((r) => r.study8Live && r.phaseB) && sameObjects, {
    rows: rbRows,
    periodsYearsHalfYearsPrimaryFoldAreStudy8s: sameObjects
  });

  // ----- E1 -----
  const manifest = (await fs.readJson(projectionManifest)) as { files: Record<string, { sha256: string }> };
  const s8Freeze = (await fs.readJson(`${study8Root}/results/protocol_freeze.json`)) as {
    integrity: { data: Record<string, string> };
  };
  const { study8PinnedBytes } = await import('../study8-runners/data.ts');
  const e1Rows = [];

  for (const symbol of allSymbols) {
    const projection = await fs.readFile(path.join(projectionRoot, symbol, 'data.csv'));
    const canonical = await fs.readFile(path.join(canonicalRoot, symbol, 'data.csv'));
    const projSha = sha256(projection);
    const pinned = study8PinnedBytes[symbol];
    const later = await prefixOf(path.join(canonicalRoot, symbol, 'data.csv'), '2026-10-30');

    e1Rows.push({
      symbol,
      manifest: projSha === manifest.files[symbol]?.sha256,
      prefixEqual: sha256(canonical.subarray(0, projection.length)) === projSha,
      study8Equal: pinned
        ? sha256(canonical.subarray(0, pinned)) === s8Freeze.integrity.data[`data/${symbol}/data.csv`]
        : null,
      bytesAfter20261030: canonical.length - later.bytes // reported, never used (m10)
    });
  }

  record(
    'E1',
    e1Rows.every((r) => r.manifest && r.prefixEqual && r.study8Equal !== false),
    e1Rows
  );

  // ----- the training door holding every symbol -----
  const door = await openDoor('parity', allSymbols, 'parity gates (training door, 2016-01-04 → 2024-12-31)');
  const ev = new P9Evaluator(door);
  const lab = new Lab(ev, PointCache.memory(door, 'parity'));
  const frozen = await controlsOf(['B1', 'B5', 'VG-frozen', 'S8-VG2-balanced', 'S8-VG1-profit']);

  // ----- P1 (production path) -----
  const windowDoors: Record<string, P9Door> = { W24: door };

  for (const [key, end] of [
    ['W19', '2019-12-31'],
    ['W21', '2021-12-31']
  ] as const)
    windowDoors[key] = await openDoor(`parity-${key}`, allSymbols, `parity P1 window ${key}`, { end });

  const windowEvs: Record<string, P9Evaluator> = Object.fromEntries(
    Object.entries(windowDoors).map(([k, d]) => [k, k === 'W24' ? ev : new P9Evaluator(d)])
  );
  const p1: {
    who: string;
    track: string;
    window: string;
    setting: string;
    differences: number;
    lots: number;
    sameMinute: number;
    refusals: number;
  }[] = [];
  const p1Run = (
    who: string,
    track: string,
    books: Books,
    window: string,
    setting: string,
    settings: typeof baseSettings
  ) => {
    const result = engineParity(windowDoors[window]!, windowEvs[window]!, books, settings);

    p1.push({
      who,
      track,
      window,
      setting,
      differences: result.differences.length,
      lots: result.lots,
      sameMinute: result.sameMinute,
      refusals: result.refusals
    });
  };

  for (const track of trackKeys) {
    const symbols = trackBooks(track);
    const vectors = lhsBooks(3, symbols, ['parity', 'P1', track]).books;
    const perturbed = familyDesign(vectors[0]!, symbols, { n: 2, labels: ['parity', 'P1-nb', track] }).map(
      (p) => p.books
    );

    for (const [index, books] of [...vectors, ...perturbed].entries()) {
      for (const window of ['W19', 'W21', 'W24'])
        for (const costBps of [0, 5, 10])
          p1Run(`${track}#${index}`, track, books, window, `${costBps}bps`, settingsWith({ costBps }));
    }

    for (const [key, settings] of [
      ['rate14', settingsWith({ rate: 0.14 })],
      ['nextOpen', settingsWith({ stopFill: 'next-open' })],
      ['slip25', settingsWith({ stopSlippageBps: 25 })]
    ] as const)
      p1Run(`${track}#0`, track, vectors[0]!, 'W24', key, settings);

    const same = Object.fromEntries(symbols.map((s) => [s, { ...vectors[1]![symbols[0]!]! }])) as Books;

    p1Run(`${track}#same`, track, same, 'W24', '5bps', baseSettings);
  }

  for (const [key, books] of Object.entries(frozen))
    p1Run(`control:${key}`, 'control', books, 'W24', '5bps', baseSettings);

  const perMembership = Object.fromEntries(
    trackKeys.map((track) => {
      const rows = p1.filter((r) => r.track === track);

      return [
        track,
        {
          rows: rows.length,
          refusals: rows.reduce((a, r) => a + r.refusals, 0),
          sameMinute: rows.reduce((a, r) => a + r.sameMinute, 0),
          lots: rows.reduce((a, r) => a + r.lots, 0)
        }
      ];
    })
  );

  record(
    'P1',
    p1.every((r) => r.differences === 0) &&
      Object.values(perMembership).every((m) => m.refusals > 0 && m.lots > 0) &&
      p1.some((r) => r.sameMinute > 0),
    { comparisons: p1.length, differences: p1.reduce((a, r) => a + r.differences, 0), perMembership, rows: p1 }
  );

  // ----- P2 -----
  const s8ev = new S8Evaluator(door as never);
  const p2Configs: Record<string, Books> = {
    ...frozen,
    ...Object.fromEntries(
      [
        ['VGT', 'GDX'],
        ['VGT', 'XBI', 'XRT'],
        ['KRE', 'GDX'],
        ['VGT', 'XBI', 'XRT', 'KRE', 'GDX']
      ].map((symbols, i) => [`random-${i}`, lhsBooks(1, symbols, ['parity', 'P2', i]).books[0]!])
    )
  };
  const p2 = Object.entries(p2Configs).map(([key, books]) => ({
    key,
    equal: json(ev.point(books)) === json(s8ev.point(books)),
    nextOpen:
      json(ev.point(books, settingsWith({ stopFill: 'next-open' }))) ===
      json(s8ev.point(books, settingsWith({ stopFill: 'next-open' })))
  }));

  record(
    'P2',
    p2.every((r) => r.equal && r.nextOpen),
    p2
  );

  // ----- P3 -----
  const centres = await sealedTrainingCentres();
  const p3 = centres.map((c) => {
    const r = lab.point(c.books);

    return {
      track: c.track,
      kind: c.kind,
      id: c.id,
      ok:
        near(r.net, c.net) &&
        near(r.dd, c.dd) &&
        near(r.ddDaily, c.ddDaily) &&
        r.lots === c.lots &&
        r.episodes === c.episodes
    };
  });

  record('P3', p3.length > 60 && p3.every((r) => r.ok), {
    reproduced: p3.filter((r) => r.ok).length,
    of: p3.length,
    failed: p3.filter((r) => !r.ok)
  });

  // ----- P6 -----
  const s6 = new Study6Lab(door as never);
  const p6 = Object.entries(frozen).map(([key, books]) => {
    const a = minuteSeries(seriesLabOf(lab), ev.replay(books, baseSettings, true), books, baseSettings);
    const b = s6MinuteSeries(s6, s6.replay(books, baseSettings, true), books, baseSettings);

    return {
      key,
      equal:
        a.maximum === b.maximum &&
        a.peakIndex === b.peakIndex &&
        a.troughIndex === b.troughIndex &&
        a.points.length === b.points.length &&
        a.matchesTracker &&
        b.matchesTracker
    };
  });
  const p6b = trackKeys.map((track) => {
    const books = lhsBooks(1, trackBooks(track), ['parity', 'P6', track]).books[0]!;
    const replay = ev.replay(books, baseSettings, true);
    const series = minuteSeries(seriesLabOf(lab), replay, books, baseSettings);

    return { track, matchesTracker: series.matchesTracker, lots: series.lots.length === replay.lots.length };
  });

  record('P6', p6.every((r) => r.equal) && p6b.every((r) => r.matchesTracker && r.lots), {
    b5Subsets: p6,
    memberships: p6b
  });

  // ----- A1 -----
  const a1: { what: string; equal: boolean }[] = [];
  const vg2 = frozen['S8-VG2-balanced']!;
  const b5 = frozen.B5!;

  for (const labels of [
    ['screen', 'VGT', 'VG', 'F24'],
    ['screen', 'GDX', 'VXRG', 'F19'],
    ['screen', 'G', 'F21']
  ] as (string | number)[][])
    a1.push({
      what: `sobol ${labels.join('/')}`,
      equal: json(withNamespace(s8SeedOf, () => sobolGrids(4096, labels))) === json(s8SobolGrids(4096, labels))
    });

  for (const [symbols, labels] of [
    [
      ['VGT', 'GDX'],
      ['lhs', 'VG', 'F24']
    ],
    [
      ['VGT', 'XBI', 'XRT', 'KRE', 'GDX'],
      ['fill', 2, 'VXRKG', 'F20']
    ]
  ] as [string[], (string | number)[]][])
    a1.push({
      what: `lhs ${labels.join('/')}`,
      equal:
        json(withNamespace(s8SeedOf, () => lhsBooks(1024, symbols, labels))) === json(s8LhsBooks(1024, symbols, labels))
    });

  for (const family of [
    { n: 128, labels: ['confirm', 'VG', 'F24', 1] },
    { n: 128, labels: ['confirm-inbox', 'VG', 'F24', 2], mode: 'inbox' as const },
    { n: 128, labels: ['confirm-half', 'VG', 'F24', 1], scale: 0.5 },
    { n: 128, labels: ['confirm-wide', 'VG', 'F24', 1], scale: 1.5 },
    { n: 128, labels: ['confirm-d8', 'VG', 'F24', 1], matchCount: 8 },
    { n: 128, labels: ['confirm-d16', 'VXRKG', 'F24', 1], matchCount: 16 },
    { n: 128, labels: ['confirm-norm', 'VXRKG', 'F24', 1], scale: Math.sqrt(8 / 40) },
    { n: 64, labels: ['r2', 'VXRKG', 'F23'] }
  ]) {
    for (const [name, books] of [
      ['VG#2', vg2],
      ['B5', b5]
    ] as const) {
      const symbols = Object.keys(books);

      a1.push({
        what: `design ${name} ${family.labels.join('/')}`,
        equal:
          json(withNamespace(s8SeedOf, () => familyDesign(books, symbols, family))) ===
          json(s8FamilyDesign(books, symbols, family))
      });
    }
  }

  const perBookFamily = { n: 64, labels: ['confirm-book', 'VG', 'F24', 'GDX'] };

  a1.push({
    what: 'per-book design GDX of VG#2',
    equal:
      json(withNamespace(s8SeedOf, () => familyDesign(vg2, ['GDX'], perBookFamily))) ===
      json(s8FamilyDesign(vg2, ['GDX'], perBookFamily))
  });
  record(
    'A1',
    a1.every((r) => r.equal),
    a1
  );

  // ----- A2 -----
  const s8Q = await readSealed<{
    candidates: { evidence: Record<string, unknown>; qualification: Record<string, unknown> }[];
    floors: unknown;
  }>(`${study8Root}/results/qualify/VG/F24/qualification.json`);
  const floors = floorsOf(ev.yearsOfRun(), 2017, 2024);
  const options = { prefix: 'confirm', track: 'VG', fold: 'F24', floors, trainKey: 'TRAIN-F24' };
  const b1Evidence = withNamespace(s8SeedOf, () => evidenceOf(lab, frozen.B1!, { ...options, sequence: true }));
  const a2 = (['S8-VG2-balanced', 'S8-VG1-profit'] as const).map((key) => {
    const books = frozen[key]!;
    const sealed = s8Q.candidates.find((c) => json(c.evidence.books) === json(books));
    const evidence = withNamespace(s8SeedOf, () => evidenceOf(lab, books, options));
    const q = qualificationOf(evidence, floors, { fold: 'F24', trainKey: 'TRAIN-F24', b1: b1Evidence, pooled: true });

    return {
      key,
      found: !!sealed,
      evidenceEqual: !!sealed && json(sealedForm(evidence as never)) === json(sealed.evidence),
      gatesEqual: !!sealed && json(sealedForm(q as never)) === json(sealed.qualification),
      floorsEqual: json(floors) === json(s8Q.floors)
    };
  });

  record(
    'A2',
    a2.every((r) => r.found && r.evidenceEqual && r.gatesEqual && r.floorsEqual),
    a2
  );

  // ----- N1 (through the cut session) and N2 (adversarial bars at every cut) -----
  const n1: { cut: string; who: string; setting: string; ok: boolean; closedThroughCut: number }[] = [];
  const n2: Record<string, unknown>[] = [];
  const { runSearch } = await import('./search.ts');
  const cuts = [
    ...(['F19', 'F20', 'F21', 'F23'] as const).map((fold) => ({ fold, cut: folds[fold].trainEnd as string })),
    { fold: 'F24' as const, cut: '2024-12-31' }
  ];
  const n2Settings = [baseSettings, settingsWith({ stopFill: 'next-open' }), settingsWith({ stopSlippageBps: 25 })];
  const lotsKey = (lots: { symbol: string; entryTime: number; exitTime: number; net: number }[]) =>
    json(lots.map((l) => [l.symbol, l.entryTime, l.exitTime, Math.round(l.net * 1e6)]));

  for (const { fold, cut } of cuts) {
    const cutDoor =
      fold === 'F24'
        ? door
        : await openDoor(`parity-cut-${fold}`, allSymbols, `parity N1/N2 truncated door (${cut})`, { end: cut });
    const cutEv = fold === 'F24' ? ev : new P9Evaluator(cutDoor);
    const cutLab = fold === 'F24' ? lab : new Lab(cutEv, PointCache.memory(cutDoor, 'parity'));
    const cutIndex = cutDoor.lastIndex;
    const configs: [string, Books][] = [
      ['B5', frozen.B5!],
      ['VG#2', vg2],
      ...trackKeys.map(
        (track) => [track, lhsBooks(1, trackBooks(track), ['parity', 'N1', track, fold]).books[0]!] as [string, Books]
      )
    ];

    // N1: the truncated run against the full training run, through the cut session
    if (fold !== 'F24') {
      for (const [who, books] of configs) {
        for (const settings of n2Settings) {
          const full = ev.replay(books, settings);
          const part = cutEv.replay(books, settings);
          const closed = (lots: typeof full.lots) =>
            lotsKey(lots.filter((l) => l.exitIndex >= 0 && l.exitIndex <= cutIndex));
          const entries = (lots: typeof full.lots) =>
            json(lots.filter((l) => l.entryIndex <= cutIndex).map((l) => [l.symbol, l.entryTime, l.tradeId]));
          const refusals = (r: typeof full) =>
            json(
              r.refusals
                .filter((x) => x.decisionIndex <= cutIndex)
                .map((x) => [x.decider, x.holder, x.decisionIndex, x.tradeId])
            );
          const marksOk = Array.from({ length: cutIndex + 1 }, (_v, i) => i).every(
            (i) => full.marks[i] === part.marks[i]
          );
          const tracesOk = Object.keys(books).every((s) => {
            const pick = (e: P9Evaluator) =>
              json(
                e
                  .trace(s, books[s]!, settings)
                  .trades.filter((t) => t.exitIndex >= 0 && t.exitIndex <= cutIndex)
                  .map((t) => [t.id, t.entryTime, t.exitTime, t.net])
              );

            return pick(ev) === pick(cutEv);
          });

          n1.push({
            cut,
            who,
            setting: `${settings.stopFill}/${settings.stopSlippageBps}`,
            ok:
              closed(full.lots) === closed(part.lots) &&
              entries(full.lots) === entries(part.lots) &&
              marksOk &&
              refusals(full) === refusals(part) &&
              tracesOk,
            closedThroughCut: full.lots.filter((l) => l.exitIndex >= 0 && l.exitIndex <= cutIndex).length
          });
        }
      }
    }

    // N2: every bar after the cut replaced by a synthetic crash, in a copy; the cut door must not notice
    const extra =
      fold === 'F24'
        ? ['2025-01-02', '2025-01-03', '2025-01-06', '2025-01-07', '2025-01-08']
        : door.dates.slice(cutIndex + 1, cutIndex + 6);
    const root = path.join(leakRoot, cut);

    await buildLeak(root, cut, extra);

    const leakDoor = await openDoor(`parity-n2-${fold}`, allSymbols, `parity N2 injected copy (${cut})`, {
      end: cut,
      root
    });
    const leakEv = new P9Evaluator(leakDoor);
    const leakLab = new Lab(leakEv, PointCache.memory(leakDoor, 'parity'));
    const openAtCut = trackKeys
      .flatMap((track) => lhsBooks(64, trackBooks(track), ['parity', 'N2-open', track]).books)
      .find((books) => cutEv.point(books).open > 0);
    const n2Configs: [string, Books][] = [
      ...configs,
      ...(openAtCut ? [['open-at-cut', openAtCut] as [string, Books]] : [])
    ];
    const rows = n2Configs.flatMap(([who, books]) =>
      n2Settings.map((settings) => {
        const a = cutEv.replay(books, settings);
        const b = leakEv.replay(books, settings);

        return {
          who,
          ok:
            json(cutEv.point(books, settings)) === json(leakEv.point(books, settings)) &&
            json(Array.from(a.marks)) === json(Array.from(b.marks)) &&
            lotsKey(a.lots) === lotsKey(b.lots) &&
            json(a.refusals) === json(b.refusals)
        };
      })
    );
    const n2Floors = floorsOf(cutEv.yearsOfRun(), 2017, Number(cut.slice(0, 4)));
    const fitEqual = trackKeys.every((track) => {
      const books = lhsBooks(1, trackBooks(track), ['parity', 'N2-fit', track]).books[0]!;
      const family = { name: 'r1', n: 16, labels: ['parity', 'r1', track, fold] };

      return (
        json(fitOf(cutLab, books, trackBooks(track), family, n2Floors)) ===
        json(fitOf(leakLab, books, trackBooks(track), family, n2Floors))
      );
    });
    // AMENDMENTS E1: the cache identity, i.e. the header without the door's label (`doorKey`, which names the door
    // kind and legitimately differs between the projection-side and the injected-copy door); the data identity is doorId
    const identity = (d: P9Door) => {
      const { doorKey, ...rest } = PointCache.headerOf(d, 'x');

      void doorKey;
      return json(rest);
    };
    const headerEqual = identity(cutDoor) === identity(leakDoor);
    let searchEqual: boolean | null = null;

    if (fold === 'F19' || fold === 'F24') {
      const run = async (d: P9Door, tag: string) => {
        const out = path.join(runDir, `n2-${fold}-${tag}.json`);

        await runSearch({ key: 'N2-SMH', books: trackBooks('N2-SMH') }, fold, {
          mode: 'smoke',
          door: d,
          out,
          cacheFile: path.join(runDir, `n2-${fold}-${tag}.jsonl`),
          labelPrefix: 'parity'
        });
        return readSealed<Record<string, unknown>>(out);
      };

      searchEqual = searchCore(await run(cutDoor, 'projection')) === searchCore(await run(leakDoor, 'injected'));
    }

    const past = await loadNUniverse({
      members: allSymbols,
      partition: 'all',
      access: 'manual evaluation',
      warmupSessions: 0,
      endDate: extra.at(-1)!,
      root,
      ledger: emptyLedger
    });
    const pastEv = new P9Evaluator({
      ...leakDoor,
      loaded: past,
      dates: past.universe.dates,
      lastIndex: past.universe.dates.length - 1,
      eligibilityIndex: past.universe.eligibilityIndex
    });
    const power = n2Configs.some(([, books]) => {
      const a = pastEv.point(books);
      const b = cutEv.point(books);

      return a.net !== b.net || a.lots !== b.lots;
    });
    const pass =
      !!openAtCut &&
      cutDoor.id === leakDoor.id &&
      json(cutDoor.prefixSha256) === json(leakDoor.prefixSha256) &&
      rows.every((r) => r.ok) &&
      fitEqual &&
      headerEqual &&
      searchEqual !== false &&
      power;

    n2.push({
      cut,
      doorIds: [cutDoor.id, leakDoor.id],
      rows: rows.length,
      failed: rows.filter((r) => !r.ok),
      fitEqual,
      headerEqual,
      searchEqual,
      openAtCut: !!openAtCut,
      power,
      injected: extra,
      pass
    });
    await fs.remove(root);
    log(`parity N1/N2 cut ${cut} done`);
  }

  record('N1', n1.every((r) => r.ok) && n1.some((r) => r.closedThroughCut > 0), {
    checks: n1.length,
    failed: n1.filter((r) => !r.ok)
  });
  record('N2', n2.length === 5 && n2.every((r) => r.pass === true), n2);

  // ----- C1 -----
  const cacheFile = path.join(runDir, 'c1-cache.jsonl');
  const c1Lab = new Lab(ev, await PointCache.open(door, 'parity-c1', cacheFile));
  const c1Books = trackKeys
    .flatMap((track) => lhsBooks(30, trackBooks(track), ['parity', 'C1', track]).books)
    .slice(0, 200);
  const first = c1Books.map((books) => c1Lab.point(books));

  c1Lab.cache.flushSync();

  const reloaded = await PointCache.open(door, 'parity-c1', cacheFile);
  const reloadEqual = c1Books.every(
    (books, i) => json(reloaded.get(`${settingsKey(baseSettings)}#${booksKey(books)}`)) === json(first[i])
  );
  const recomputed = c1Books.every((books, i) => json(new P9Evaluator(door).point(books)) === json(first[i]));
  let foreignIndex = 0;
  const refusedWith = async (mutate: (header: Record<string, unknown>) => void) => {
    const file = path.join(runDir, `c1-foreign-${foreignIndex++}.jsonl`);
    const lines = (await fs.readFile(cacheFile, 'utf8')).split('\n');
    const header = JSON.parse(lines[0]!) as Record<string, unknown>;

    mutate(header);
    await fs.outputFile(file, [JSON.stringify(header), ...lines.slice(1)].join('\n'));

    try {
      await PointCache.open(door, 'parity-c1', file);
      return false;
    } catch {
      return true;
    }
  };
  const foreign = {
    job: await refusedWith((h) => (h.job = 'another-job')),
    doorId: await refusedWith((h) => (h.doorId = 'f'.repeat(24))),
    engine: await refusedWith((h) => (h.engine = '0'.repeat(24)))
  };

  record(
    'C1',
    reloadEqual && recomputed && Object.values(foreign).every(Boolean) && reloaded.loaded === c1Books.length,
    {
      points: c1Books.length,
      reloaded: reloaded.loaded,
      reloadEqual,
      recomputed,
      foreign
    }
  );

  // ----- D1 (deterministic restart; smoke budget, parity labels, on a parity door to 2019-12-31) -----
  const d1Dir = path.join(runDir, 'd1');

  await fs.ensureDir(d1Dir);

  const probe = (tag: string, stop?: number) =>
    child(
      [
        'restart-probe',
        'G4-ILF',
        path.join(d1Dir, `${tag}.json`),
        path.join(d1Dir, `${tag}.jsonl`),
        ...(stop ? [String(stop)] : [])
      ],
      path.join(d1Dir, `${tag}.log`)
    );
  const codes = [await probe('fresh-a'), await probe('fresh-b'), await probe('resumed', 3000), await probe('resumed')];
  const bodies = await Promise.all(
    ['fresh-a', 'fresh-b', 'resumed'].map((t) => readSealed<Record<string, unknown>>(path.join(d1Dir, `${t}.json`)))
  );
  const archives = await Promise.all(
    ['fresh-a', 'fresh-b', 'resumed'].map((t) => archiveOf(path.join(d1Dir, `${t}-archive.csv.gz`)))
  );
  const cores = bodies.map(searchCore);

  record(
    'D1',
    codes.every((c) => c === 0) && cores[0] === cores[1] && cores[1] === cores[2] && new Set(archives).size === 1,
    {
      codes,
      identicalBodies: cores[0] === cores[1] && cores[1] === cores[2],
      archives
    }
  );

  // ----- T0 -----
  const t0Controls = await controlsOf([...testControlKeys]);
  const g4 = lhsBooks(1, trackBooks('G4-ILF'), ['parity', 'T0', 'G4-ILF']).books[0]!;
  const plan = {
    holders: [
      { rank: 1, track: 'S8-VG', role: 'profit', id: 'S8-VG2', books: vg2, tier: 'strong' },
      { rank: 2, track: 'G4-ILF', role: 'profit', id: 'parity-G4', books: g4, tier: 'modest' }
    ],
    members: [
      {
        track: 'S8-VG',
        id: 'S8-VG2',
        order: 1,
        pick: 'profit',
        qualified: true,
        selectionRobustPerYear: 1,
        confirmationRobustPerYear: 1,
        books: vg2
      },
      {
        track: 'G4-ILF',
        id: 'parity-G4',
        order: 1,
        pick: 'profit',
        qualified: false,
        selectionRobustPerYear: 0,
        confirmationRobustPerYear: 0,
        books: g4
      },
      {
        track: 'B5',
        id: 'B5-lite',
        order: 1,
        pick: 'profit',
        qualified: false,
        selectionRobustPerYear: 0,
        confirmationRobustPerYear: 0,
        books: b5
      }
    ]
  };
  const t0a = await testStageOn(door, 'F23', plan, { primary: true, controls: t0Controls, label: 'parity T0 a' });
  const t0b = await testStageOn(door, 'F23', plan, { primary: true, controls: t0Controls, label: 'parity T0 b' });
  const holders = t0a.body.holders as unknown as {
    deep: { series?: unknown; gapRisk?: unknown };
    comparisons: Record<string, unknown>;
  }[];
  const identical = stageCore(sealedForm(t0a.body as never)) === stageCore(sealedForm(t0b.body as never));

  record(
    'T0',
    identical &&
      holders.every(
        (h) => h.deep.series && h.deep.gapRisk && Object.values(h.comparisons).filter(Boolean).length === 8
      ) &&
      t0a.body.outcome !== null,
    { identical, holders: holders.length, members: (t0a.body.members as unknown[]).length }
  );

  // ----- G1 (each refusal must give its expected reason) -----
  const refusals: Record<string, { refused: boolean; message: string }> = {};
  const refuses = async (name: string, expected: RegExp, attempt: () => Promise<unknown>) => {
    try {
      await attempt();
      refusals[name] = { refused: false, message: '' };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);

      refusals[name] = { refused: expected.test(message), message };
    }
  };

  await refuses('search-F24 before parity is sealed', /phase "parity" is not sealed|parity is not sealed/, () =>
    openDoor('search-F24', ['VGT'], 'G1')
  );
  await refuses('search-F19 before parity is sealed', /phase "parity" is not sealed|parity is not sealed/, () =>
    openDoor('search-F19', ['VGT'], 'G1')
  );
  await refuses('test-F19', /selection and audit must be sealed/, () => openDoor('test-F19', ['VGT'], 'G1'));
  await refuses('test-F24', /selection and audit must be sealed/, () => openDoor('test-F24', ['VGT'], 'G1'));
  await refuses('pilot after the freeze', /pre-freeze door/, () => openDoor('pilot', ['VGT'], 'G1'));
  await refuses('parity end 2025-01-02', /is after 2024-12-31/, () =>
    openDoor('parity-g1', ['VGT'], 'G1', { end: '2025-01-02' })
  );
  await refuses('search end override', /has a fixed end/, () =>
    openDoor('search-F24', ['VGT'], 'G1', { end: '2024-06-28' })
  );
  await refuses('slice', /test-F24-confirm is not sealed/, () => openDoor('slice', ['VGT'], 'G1'));
  await refuses('post', /test-F24-confirm is not sealed/, () => openDoor('post', ['VGT'], 'G1'));
  await refuses('smoke door', /smoke doors exist only in smoke mode/, () => openDoor('smoke-x', ['VGT'], 'G1'));
  await refuses('foreign symbol', /outside the study's symbols/, () => openDoor('parity-g1', ['SPY'], 'G1'));
  await refuses('leak root on a search door', /only parity doors may read the leakage-test copy/, () =>
    openDoor('search-F24', ['VGT'], 'G1', { root: leakRoot })
  );
  record(
    'G1',
    Object.values(refusals).every((r) => r.refused),
    refusals
  );

  // ----- L1 -----
  const allowed = new Set(['door.ts', 'integrity.ts', 'parity.ts', 'diagnostics.ts', 'context.ts']);
  const patterns = [
    ['loadNUniverse', '({'].join(''),
    ['loadDataset', 'Sessions'].join(''),
    ['resolve', 'Dataset('].join(''),
    ['load', 'Csv('].join(''),
    ["'data", '/'].join('')
  ];
  const offenders: string[] = [];

  for (const name of (await fs.readdir(codeDir, { recursive: true }))
    .map(String)
    .filter((n) => n.endsWith('.ts') && !n.startsWith('tests'))) {
    const text = await fs.readFile(path.join(codeDir, name), 'utf8');

    for (const pattern of patterns)
      if (text.includes(pattern) && !allowed.has(name)) offenders.push(`${name}: ${pattern}`);
  }

  record('L1', offenders.length === 0, { offenders, allowed: [...allowed] });

  // ----- A3 and A4 (await the children) -----
  const a3Code = await a3;
  const a3File = path.join(runDir, 'a3-search-VG-F19.json');
  const a3Record = (await fs.pathExists(a3File)) ? await readSealed<Record<string, unknown>>(a3File) : undefined;
  const s8Search = await readSealed<Record<string, unknown>>(study8SearchFile);
  const a3Pass =
    a3Code === 0 &&
    !!a3Record &&
    searchCore(a3Record) === searchCore(s8Search) &&
    (await archiveOf(a3File.replace(/\.json$/, '-archive.csv.gz'))) ===
      (await archiveOf(study8SearchFile.replace(/\.json$/, '-archive.csv.gz')));

  record('A3', a3Pass, {
    code: a3Code,
    study8: { file: study8SearchFile, bodyHash: s8Search.bodyHash },
    replay: a3Record ? { file: a3File, bodyHash: a3Record.bodyHash, seconds: a3Record.seconds } : null
  });

  const a4Code = await a4;
  const a4File = path.join(runDir, 'a4.json');
  const a4Rows = (await fs.pathExists(a4File))
    ? ((await fs.readJson(a4File)) as { rows: { equal: Record<string, boolean> }[] }).rows
    : [];

  record('A4', a4Code === 0 && a4Rows.length === 10 && a4Rows.every((r) => Object.values(r.equal).every(Boolean)), {
    code: a4Code,
    rows: a4Rows
  });

  // the smoke-budget search outputs of N2 and D1 and the C1 caches are code-path evidence only: deleted unread
  // (PROTOCOL.md §10; their comparisons are recorded above)
  for (const name of (await fs.readdir(runDir)).filter((n) => /^n2-|^c1-/.test(n)))
    await fs.remove(path.join(runDir, name));
  await fs.remove(d1Dir);

  const passed = Object.values(gates).every((g) => g.pass);
  const body = {
    stage: 'PARITY',
    at: nowIso(),
    passed,
    runDir,
    gates,
    door: { id: door.id, last: door.dates[door.lastIndex], members: door.members },
    seconds: (Date.now() - started) / 1000
  };

  if (!passed) {
    const attempt = path.join(runDir, 'parity-attempt.json');

    await writeSealed(attempt, body);
    throw new Error(
      `parity failed (${Object.entries(gates)
        .filter(([, g]) => !g.pass)
        .map(([k]) => k)
        .join(', ')}); record ${attempt}; nothing sealed`
    );
  }

  return writeSealed(parityFile, body);
};
