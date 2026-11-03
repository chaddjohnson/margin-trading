// The write-once stages before the evaluation windows (PROTOCOL.md §12): audit, freeze-protocol, parity, freeze-code
// and develop-<history>. Each verifies its predecessors and both freezes, loads data only through its door, and seals
// a record whose payloads are hashed.
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import fs from 'fs-extra';
import { Engine as Stage1Engine } from '../study3-vgt-momentum/engine.ts';
import { controlSpec, panelSpec, templateSpec } from '../study3-vgt-momentum/specs.ts';
import type { ExitKey } from '../study3-vgt-momentum/specs.ts';
import { familyIds, families, quantize } from '../study3-vgt-momentum/signals.ts';
import { mulberry32 } from '../study3-vgt-momentum/engine.ts';
import {
  type EntryId,
  type ExitFamily,
  type PolicyKey,
  controlPolicy,
  defaultsOf,
  entryDefaults,
  entryDims,
  exitBoxes,
  fixedExits,
  fromUnit,
  optimisedExits,
  pairings,
  policyOf,
  reentryRules,
  sizingVariants
} from './catalog.ts';
import { type HistoryKey, files, histories, log, search, seedOf, study } from './context.ts';
import { type DoorRecord, assertDoor, indexOfDate, loadVgt, withMissingBars } from './data.ts';
import { developHistory, plannedPerHistory } from './develop.ts';
import { Engine, defaultOptions } from './engine.ts';
import { coverage, poisonedFuture, prefixInvariance, truncatedRunPrefix } from './guards.ts';
import { ParityTally, compareRuns, compareWithStage1 } from './parity.ts';
import { Pool } from './pool.ts';
import {
  assertFreezes,
  assertPredecessors,
  assertRealRoot,
  assertScope,
  codeManifest,
  manifestHash,
  protocolHashes,
  readJsonFile,
  recordExists,
  sha256,
  sha256File,
  toJson,
  writeStage
} from './records.ts';
import { referenceRun } from './reference.ts';
import { Evaluator } from './search.ts';
import { policyOfStage1 } from './stage1map.ts';
import type { Policy, RunOptions, ScheduleItem } from './types.ts';

const git = (...args: string[]) => execFileSync('git', args, { encoding: 'utf8' });

export const runtimeInfo = (started: number, workers: number) => ({
  seconds: (Date.now() - started) / 1000,
  workers,
  peakRssMb: Math.round(process.resourceUsage().maxRSS / 1024),
  node: process.version
});

// ----- audit -----

export const stageAudit = async () => {
  assertRealRoot();
  assertScope();

  if (recordExists('audit')) {
    throw new Error('refused: audit is sealed');
  }

  const started = Date.now();
  const doors: Record<string, DoorRecord> = {};
  const qa: Record<string, unknown> = {};

  for (const key of Object.keys(histories) as HistoryKey[]) {
    const { ds, door } = await loadVgt(histories[key].developmentEnd);

    assertDoor(ds, histories[key].developmentEnd);
    doors[key] = door;

    if (key === 'H') {
      let short = 0;
      let missingPrints = 0;
      let bigGaps = 0;

      for (let s = 0; s < ds.sessionCount; s++) {
        if (ds.sBarCount[s]! < 390) {
          short++;
        }

        if (Number.isNaN(ds.sClosingPrint[s]!)) {
          missingPrints++;
        }

        if (s > 0 && Math.abs(ds.sOpen[s]! / ds.sClose[s - 1]! - 1) > 0.03) {
          bigGaps++;
        }
      }

      qa.sessions = ds.sessionCount;
      qa.bars = ds.barCount;
      qa.sessionsWithFewerThan390Minutes = short;
      qa.sessionsWithoutClosingPrint = missingPrints;
      qa.overnightGapsAbove3pct = bigGaps;
    }
  }

  const stage1Files = git('ls-files', 'research/study3-vgt-momentum', 'src/study3-vgt-momentum')
    .split('\n')
    .filter(Boolean);
  const stage1Manifest = Object.fromEntries(stage1Files.map((file) => [file, sha256File(file)]));
  const protectedFiles = [
    'config/phenotypes/D1/VGT.json',
    'config/market-events/distributions.csv',
    'data/partitions.json',
    'CLAUDE.md',
    'docs/claude/context-recovery.md',
    'package.json'
  ];
  const baselineFile = path.join(path.dirname(files.protocol), 'results', 'logs', 'baseline-tests.json');

  return writeStage('audit', {
    door: doors,
    summary: {
      qa,
      stage1: { files: stage1Files.length, digest: sha256(toJson(stage1Manifest)) },
      protected: Object.fromEntries(protectedFiles.map((file) => [file, sha256File(file)])),
      baselineTests: fs.existsSync(baselineFile) ? readJsonFile(baselineFile) : null,
      runtime: runtimeInfo(started, 0)
    },
    payloads: { stage1Manifest }
  });
};

// ----- freezes -----

export const stageFreezeProtocol = () => {
  assertRealRoot();
  assertScope();
  assertPredecessors('freeze-protocol');

  if (fs.existsSync(files.protocolFreeze)) {
    throw new Error('refused: the protocol is frozen');
  }

  const body = {
    study: study.id,
    frozenAt: new Date().toISOString(),
    hashes: protocolHashes(),
    head: git('rev-parse', 'HEAD').trim()
  };
  const record = { ...body, bodyHash: sha256(toJson(body)) };

  fs.outputFileSync(files.protocolFreeze, toJson(record));
  return record;
};

export const stageFreezeCode = () => {
  assertRealRoot();
  assertScope();
  assertPredecessors('freeze-code');
  assertFreezes(false);

  if (fs.existsSync(files.codeFreeze)) {
    throw new Error('refused: the code is frozen');
  }

  const manifest = codeManifest();
  const parity = readJsonFile<{ summary: { codeManifestHash: string; pass: boolean } }>(
    path.join(path.dirname(files.codeFreeze), 'records', 'parity.json')
  );

  if (!parity.summary.pass) {
    throw new Error('refused: the latest parity record does not pass');
  }

  if (parity.summary.codeManifestHash !== manifestHash(manifest)) {
    throw new Error('refused: the code differs from the code parity ran under');
  }

  const record = {
    study: study.id,
    frozenAt: new Date().toISOString(),
    manifest,
    manifestHash: manifestHash(manifest)
  };

  fs.outputFileSync(files.codeFreeze, toJson(record));
  return record;
};

// ----- parity -----

const stage1Exits: ExitKey[] = ['TPL', 'OX', 'CX1', 'CX2', 'X2', 'X3', 'X4', 'X8AND', 'X6a', 'X6b', 'HS'];

const keyOf = (
  entry: EntryId,
  exit: { family: ExitFamily; params: Record<string, number> } | { fixed: string },
  reentry: PolicyKey['reentry'],
  sizing: PolicyKey['sizing'] = { kind: 'Z0' }
): PolicyKey => ({
  entry,
  entryParams: entryDefaults(entry),
  exit,
  reentry,
  sizing
});

export const paritySets = (e: number, end: number, ds: { dates: string[] }) => {
  const base = (financing: 'net' | 'slot'): RunOptions => ({ ...defaultOptions(e, end), financing });
  const single: { id: string; schedule: Policy | ScheduleItem[]; options: RunOptions }[] = [];

  for (const financing of ['net', 'slot'] as const) {
    const o = base(financing);

    // every exit (optimised defaults, XF-T, fixed) × {E06, E05, E09} × all re-entry rules
    for (const entry of ['E06', 'E05', 'E09'] as EntryId[]) {
      for (const family of [...optimisedExits, 'XF-T' as const]) {
        for (const rule of reentryRules) {
          const policy = policyOf(keyOf(entry, { family, params: defaultsOf(exitBoxes[family]) }, rule));

          single.push({ id: `${financing}|${policy.id}`, schedule: policy, options: o });
        }
      }

      for (const fixed of Object.keys(fixedExits)) {
        const policy = policyOf(keyOf(entry, { fixed }, 'R3F'));

        single.push({ id: `${financing}|${policy.id}`, schedule: policy, options: o });
      }
    }

    // 64 random vectors over the full box of every optimised family (entries, rules and sizings cycling)
    const entries: EntryId[] = ['E06', 'E05', 'E09', 'C-SMA'];
    const sizings: PolicyKey['sizing'][] = [
      { kind: 'Z0' },
      { kind: 'Z1', band: 0.05 },
      { kind: 'Z2', u: 0.5, v: 0 },
      { kind: 'Z3', G: 25000 }
    ];

    for (const family of optimisedExits) {
      const random = mulberry32(seedOf(`study3b|parity|${family}`));

      for (let i = 0; i < 64; i++) {
        const params = Object.fromEntries(exitBoxes[family].map((dim) => [dim.name, fromUnit(dim, random())]));
        const policy = policyOf(
          keyOf(entries[i % 4]!, { family, params }, reentryRules[i % reentryRules.length]!, sizings[i % 4]!)
        );

        single.push({ id: `${financing}|random|${policy.id}`, schedule: policy, options: o });
      }
    }

    // 64 joint vectors over every pairing box (entry and exit parameters; rules and sizings cycling)
    for (const pairing of pairings) {
      const random = mulberry32(seedOf(`study3b|parity|${pairing.id}`));
      const entryBox = entryDims(pairing.entry);

      for (let i = 0; i < 64; i++) {
        const entryParams = Object.fromEntries(entryBox.map((dim) => [dim.name, fromUnit(dim, random())]));
        const params = Object.fromEntries(exitBoxes[pairing.exit].map((dim) => [dim.name, fromUnit(dim, random())]));
        const policy = policyOf({
          entry: pairing.entry,
          entryParams,
          exit: { family: pairing.exit, params },
          reentry: reentryRules[(i * 7) % reentryRules.length]!,
          sizing: sizings[(i * 3) % 4]!
        });

        single.push({ id: `${financing}|pairing|${pairing.id}|${policy.id}`, schedule: policy, options: o });
      }
    }

    // every sizing variant on representative policies
    for (const [entry, family] of [
      ['E06', 'XF'],
      ['E05', 'XS'],
      ['E09', 'XF']
    ] as [EntryId, ExitFamily][]) {
      for (const variant of [{ key: 'Z0', spec: { kind: 'Z0' } as PolicyKey['sizing'] }, ...sizingVariants]) {
        const policy = policyOf(keyOf(entry, { family, params: defaultsOf(exitBoxes[family]) }, 'R3F', variant.spec));

        single.push({ id: `${financing}|sizing|${policy.id}`, schedule: policy, options: o });
      }
    }

    // controls
    for (const name of ['C-AL', 'C-ALR', 'C-ALZ1', 'C-SMA', 'C-DON', 'C-TSM', 'C-STOP', 'C-IDLE']) {
      single.push({ id: `${financing}|${name}`, schedule: controlPolicy(name), options: o });
    }

    // execution stresses
    for (const policy of [
      policyOf(keyOf('E06', { family: 'XF', params: defaultsOf(exitBoxes.XF) }, 'R3F', { kind: 'Z1', band: 0.05 })),
      policyOf(keyOf('E09', { family: 'XF', params: defaultsOf(exitBoxes.XF) }, 'R3F'))
    ]) {
      for (const extra of [
        { delayMinutes: 1 },
        { delayMinutes: 5 },
        { stopSlippageBps: 25 },
        { entrySlippageBps: 25 },
        { openSlippageBps: 50 },
        { costBps: 10 }
      ]) {
        single.push({
          id: `${financing}|${JSON.stringify(extra)}|${policy.id}`,
          schedule: policy,
          options: { ...o, ...extra }
        });
      }
    }
  }

  // switching: a policy-pair matrix with boundaries 2017-12-29 and 2018-12-31, S1/S2/S3, both financing modes
  const b1 = ds.dates.indexOf('2017-12-29');
  const b2 = ds.dates.indexOf('2018-12-31');
  const p = (entry: EntryId, family: ExitFamily, sizing: PolicyKey['sizing'] = { kind: 'Z0' }) =>
    policyOf(keyOf(entry, { family, params: defaultsOf(exitBoxes[family]) }, 'R3F', sizing));
  const chains: Policy[][] = [
    [p('E06', 'XF'), p('E03', 'XS'), p('E05', 'XF')],
    [p('E05', 'XF'), p('E09', 'XF'), p('C-SMA', 'XF')],
    [p('E06', 'XF', { kind: 'Z1', band: 0.05 }), p('E03', 'XF'), p('E06', 'XF', { kind: 'Z1', band: 0.05 })],
    [p('E06', 'XF'), p('E06', 'XF'), p('E11', 'XF-T')],
    [p('E09', 'XF'), p('C-SMA', 'XT'), p('E06', 'XRD', { kind: 'Z3', G: 25000 })],
    [p('C-SMA', 'XO'), p('E02', 'XE'), p('C-SMA', 'XU')]
  ];
  const switching: typeof single = [];

  for (const financing of ['net', 'slot'] as const) {
    for (const transition of ['S1', 'S2', 'S3'] as const) {
      for (const [c, chain] of chains.entries()) {
        switching.push({
          id: `${financing}|${transition}|chain${c}`,
          schedule: [
            { index: e, policy: chain[0]! },
            { index: b1, policy: chain[1]! },
            { index: b2, policy: chain[2]! }
          ],
          options: { ...base(financing), windows: [b1, b2], transition }
        });
      }
    }
  }

  return { single, switching, boundaries: [b1, b2] };
};

export const stageParity = async () => {
  assertRealRoot();
  assertScope();
  assertPredecessors('parity');
  assertFreezes(false);

  if (recordExists('parity')) {
    throw new Error('refused: parity is sealed');
  }

  const started = Date.now();
  const { ds, door } = await loadVgt('2019-12-31');
  const e = indexOfDate(ds, study.firstDecisionClose);
  const end = ds.sessionCount - 1;
  const fast = new Engine(ds);

  // (a) Stage 1b fast (fixed-slot) = Stage 1 engine on Stage 1 configurations
  const stage1 = new Stage1Engine(ds);
  const a = new ParityTally();
  const s1Options = {
    costBps: 5,
    rate: 0.11,
    principal: 100000,
    stopSlippageBps: 0,
    entrySlippageBps: 0,
    delayMinutes: 0,
    firstDecisionIndex: e,
    endIndex: end
  };
  const s1bOptions: RunOptions = { ...defaultOptions(e, end), financing: 'slot' };
  const specs = [
    ...familyIds.flatMap((f) =>
      stage1Exits.flatMap((x) => (['R3F', 'R0', 'R1', 'R2', 'R4', 'R5'] as const).map((r) => panelSpec(f, x, r, 'Z0')))
    ),
    ...(['C-SMA', 'C-DON', 'C-TSM', 'C-AL', 'C-ALR', 'C-IDLE'] as const).map((c) => controlSpec(c))
  ];

  for (const f of familyIds) {
    const random = mulberry32(seedOf(`study3b|parity|stage1|${f}`));

    for (let i = 0; i < 64; i++) {
      const params = Object.fromEntries(
        families[f].params.map((dim) => [dim.name, quantize(dim.lo + random() * (dim.hi - dim.lo), dim)])
      );

      specs.push(
        templateSpec({
          family: f,
          params,
          h: Number((0.03 + random() * 0.12).toFixed(3)),
          t: Number((0.04 + random() * 0.26).toFixed(3))
        })
      );
    }
  }

  for (const spec of specs) {
    a.add(spec.id, compareWithStage1(stage1.run(spec, s1Options), fast.run(policyOfStage1(spec), s1bOptions)));
  }

  for (const extra of [
    { delayMinutes: 1 },
    { delayMinutes: 5 },
    { stopSlippageBps: 25 },
    { entrySlippageBps: 25 },
    { costBps: 10 }
  ]) {
    for (const f of familyIds) {
      const spec = panelSpec(f, 'TPL', 'R3F', 'Z0');

      a.add(
        `${spec.id}${JSON.stringify(extra)}`,
        compareWithStage1(
          stage1.run(spec, { ...s1Options, ...extra }),
          fast.run(policyOfStage1(spec), { ...s1bOptions, ...extra })
        )
      );
    }
  }

  log(`parity (a) ${JSON.stringify(a.summary()).slice(0, 200)}`);

  // (b) fast = the independent reference; (c) coverage
  const b = new ParityTally();
  const sets = paritySets(e, end, ds);
  const covered: Record<string, number> = {};

  for (const run of [...sets.single, ...sets.switching]) {
    const x = fast.run(run.schedule, run.options);
    const y = referenceRun(ds, run.schedule, run.options);

    coverage([x], covered);
    b.add(run.id, compareRuns(x, y, 1e-6));
  }

  for (const rate of [0.01, 0.05]) {
    const missing = withMissingBars(ds, rate, seedOf(`study3b|missing|${rate}`));
    const engine = new Engine(missing);

    for (const run of sets.single
      .filter((r) => r.id.startsWith('net|') && r.id.includes('XF') && r.id.includes('/R3F/'))
      .slice(0, 4)) {
      b.add(
        `missing${rate}|${run.id}`,
        compareRuns(engine.run(run.schedule, run.options), referenceRun(missing, run.schedule, run.options), 1e-6)
      );
    }
  }

  log(`parity (b) ${JSON.stringify(b.summary()).slice(0, 200)}`);

  // (d) prefix invariance, poisoned future, truncated-run prefix at 2017-12-29 and 2018-12-31
  const guardPolicies = sets.single
    .filter((r) => r.id.startsWith('net|') && !Array.isArray(r.schedule))
    .map((r) => r.schedule as Policy);
  const guardRuns = [...sets.single.filter((r) => r.id.startsWith('net|')).slice(0, 120), ...sets.switching];
  const guards = sets.boundaries.flatMap((boundary, i) => [
    { kind: 'prefix', ...prefixInvariance(ds, boundary, guardPolicies) },
    { kind: 'poisoned', ...poisonedFuture(ds, boundary, guardRuns, seedOf(`study3b|poison|${i}`)) },
    { kind: 'truncated', ...truncatedRunPrefix(ds, boundary, guardRuns) }
  ]);

  // (e) door refusals
  const refusals: { request: string; refused: boolean; message: string }[] = [];

  for (const end of ['2024-01-02', '2025-12-31', '2026-01-02']) {
    try {
      await loadVgt(end);
      refusals.push({ request: end, refused: false, message: '' });
    } catch (error) {
      refusals.push({ request: end, refused: true, message: (error as Error).message });
    }
  }

  const required = [
    ...['hard', 'trail', 'catastrophic', 'vol', 'ratchet', 'retain', 'giveback', 'exp', 'd1net'].map(
      (c) => `stop:${c}`
    ),
    'gap:gap',
    'fill-bar stop',
    'trim: loan to zero',
    'trim: partial repayment',
    'S3: sell branch',
    'S3: buy branch',
    'S2 across two boundaries',
    ...['R0', 'RC10', 'R3F', 'RP50', 'RS', 'RFL', 'REF', 'RPM', 'fresh', 'minute'].map((r) => `rule:${r}`),
    ...['own out', 'trend', 'damage', 'structural', 'stale', 'max hold', 'stall', 'transition', 'conversion'].map(
      (r) => `exit:${r}`
    )
  ];
  const missingCoverage = required.filter((key) => !(covered[key]! > 0));
  const pass =
    a.differences === 0 &&
    b.differences === 0 &&
    guards.every((g) => g.differences === 0) &&
    refusals.every((r) => r.refused);

  return writeStage('parity', {
    door,
    summary: {
      pass,
      stage1: a.summary(),
      reference: b.summary(),
      coverage: covered,
      missingCoverage,
      guards,
      refusals,
      tolerance: { money: 1e-6 },
      codeManifestHash: manifestHash(codeManifest()),
      runtime: runtimeInfo(started, 0)
    },
    payloads: {}
  });
};

// ----- develop -----

// One archive row per evaluated configuration; money rounded to the cent (friction = price gain − interest − net;
// exits as "reason:count" pairs) to keep the archives compact. Selection used the unrounded values in memory.
const cents = (x: number) => (Number.isFinite(x) ? Math.round(x * 100) / 100 : x);

export const compactRow = (row: Evaluator['archive'][number]) => {
  const s = row.summary;

  return {
    c: row.cell,
    i: row.index,
    st: row.stage,
    p: row.policy,
    v: row.values,
    bps: row.costBps,
    net: cents(s.net),
    pg: cents(s.priceGain),
    int: cents(s.interest),
    ct: s.closedTrades,
    cp: s.campaigns,
    re: s.reentries,
    ro: s.reentryOpportunities,
    yh: s.yearsHeld,
    mdd: cents(s.minuteDd),
    ddd: cents(s.dailyDd),
    sl: s.sessionsLong,
    ag: Math.round(s.avgGross),
    pkg: Math.round(s.peakGross),
    wt: cents(s.worstTrade),
    bt: cents(s.bestTrade),
    tm: s.trims,
    ex: Object.entries(s.exits)
      .map(([k, n]) => `${k}:${n}`)
      .join(','),
    ph: s.pathHash
  };
};

export const stageDevelop = async (key: HistoryKey) => {
  assertRealRoot();
  assertScope();

  const stage = `develop-${key}`;

  assertPredecessors(stage);
  assertFreezes(true);

  if (recordExists(stage)) {
    throw new Error(`refused: ${stage} is sealed`);
  }

  const planned = plannedPerHistory();

  if (planned > search.caps.perHistory) {
    throw new Error(`refused: ${stage} plans ${planned} evaluations, above its cap ${search.caps.perHistory}`);
  }

  const started = Date.now();
  const end = histories[key].developmentEnd;
  const { ds, door } = await loadVgt(end);
  const e = indexOfDate(ds, study.firstDecisionClose);
  const pool = new Pool(ds);
  const evaluator = new Evaluator(pool, key, defaultOptions(e, ds.sessionCount - 1));
  const result = await developHistory(evaluator, (line) => log(line));

  await pool.close();

  if (evaluator.evaluations > planned) {
    throw new Error(`refused: ${stage} used ${evaluator.evaluations} evaluations, above its plan ${planned}`);
  }

  const archive = evaluator.archive.map(compactRow);

  return writeStage(stage, {
    door,
    summary: {
      history: key,
      developmentEnd: end,
      planned,
      used: evaluator.evaluations,
      duplicates: evaluator.duplicates,
      picks: {
        rod: result.picks.rod
          ? { policy: result.picks.rod.policy, pairing: result.picks.rod.pairing, score: result.picks.rod.score }
          : null,
        net: result.picks.net
          ? { policy: result.picks.net.policy, pairing: result.picks.net.pairing, score: result.picks.net.score }
          : null,
        p0: result.picks.p0 ? { policy: result.picks.p0.policy, pairing: result.picks.p0.pairing } : null,
        noE06: result.picks.noE06 ? { policy: result.picks.noE06.policy, pairing: result.picks.noE06.pairing } : null
      },
      adaptive: result.adaptive ?? null,
      eliminated: result.pairings.filter((p) => p.eliminated).map((p) => ({ id: p.id, reason: p.eliminated })),
      widened: [
        ...result.exitCells.filter((c) => c.widened).map((c) => ({ cell: c.result.cell, used: c.usedWidened })),
        ...result.pairings.filter((p) => p.widened).map((p) => ({ cell: p.id, used: p.usedWidened }))
      ],
      runtime: runtimeInfo(started, pool.size)
    },
    payloads: { selection: { ...result, picks: result.picks } },
    jsonl: { archive }
  });
};
