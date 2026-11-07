// The stage commands (RUN_COMMANDS.md): protocol freeze, parity, qualification, the selection freeze, validation and
// the pilot driver. Long stages run inside transient systemd user services (main.ts `launch`).
import { execFileSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { sha256 } from './checkpoint.ts';
import {
  STUDY,
  cacheRoot,
  chronology,
  data,
  log,
  nodeBinary,
  repoRoot,
  researchDir,
  resources,
  resultsDir,
  schedules
} from './context.ts';
import { coverageOf, loadDevelopmentDoor, loadFullDoorUnchecked, sessionsDigest } from './data.ts';
import { type PointRecord, type TradeRow, requestOf } from './engine.ts';
import { type Fit, familyConfigs, floorsOf } from './fitness.ts';
import {
  amendmentsFile,
  codeAckFile,
  codeManifest,
  dataPins,
  doorEntries,
  fileSha,
  freezeFile,
  logDoor,
  protocolFile,
  readFreeze,
  verifyPins
} from './integrity.ts';
import { jobDir, openJob } from './job.ts';
import { assignRoles, evidenceOf, foldRanking, matchAgainstControl, rankHolders, type Evidence } from './qualify.ts';
import { writeJson } from './search.ts';
import { type Config, configId, control4, describe, growthDefaults, screenGenomes, configOfGenome } from './space.ts';
import { Store } from './store.ts';
import {
  batteryOf,
  compareWith4,
  parityOf4,
  stressValidation,
  testFamilies,
  testRecords,
  validationNetOf
} from './validate.ts';

const optOf = (args: string[]) => (name: string, fallback?: string) => {
  const i = args.indexOf(`--${name}`);

  return i >= 0 ? args[i + 1]! : fallback;
};

const git = (...a: string[]) => execFileSync('git', a, { cwd: repoRoot, encoding: 'utf8' }).trim();
const frozenSelectionFile = path.join(researchDir, 'FROZEN_SELECTION.json');
const self = path.join(repoRoot, 'src', STUDY, 'main.ts');

// ----- protocol freeze -----

const freezeProtocol = () => {
  if (readFreeze()) throw new Error('the protocol is already frozen');
  if (doorEntries().some((d) => String(d.purpose).startsWith('search (study)')))
    throw new Error('a study search door was opened before the freeze');

  const freeze = {
    study: STUDY,
    frozenAt: new Date().toISOString(),
    protocolSha256: fileSha(protocolFile),
    amendmentsSha256AtFreeze: fileSha(amendmentsFile),
    briefSha256: fileSha(path.join(researchDir, 'brief', 'BRIEF.md')),
    code: codeManifest(),
    data: dataPins(),
    git: { head: git('rev-parse', 'HEAD'), branch: git('rev-parse', '--abbrev-ref', 'HEAD') },
    schedule: schedules.study,
    resources
  };

  writeJson(freezeFile, freeze);
  log(
    `protocol frozen: PROTOCOL.md ${freeze.protocolSha256}, code closure ${freeze.code.closureDigest} (${Object.keys(freeze.code.files).length} files)`
  );
};

const acknowledgeCode = (id: string) => {
  const text = fs.readFileSync(amendmentsFile, 'utf8');

  if (!text.includes(`## ${id} `)) throw new Error(`AMENDMENTS.md has no entry "## ${id} …"`);

  const code = codeManifest();

  fs.appendFileSync(
    codeAckFile,
    `${JSON.stringify({ id, at: new Date().toISOString(), closureDigest: code.closureDigest, studyDigest: code.studyDigest, amendmentsSha256: fileSha(amendmentsFile) })}\n`
  );
  log(`code ${code.closureDigest.slice(0, 16)} acknowledged under ${id}`);
};

// ----- the browser runner as the parity reference -----

const browserRun = (c: Config, from: string, to: string, tag: string) => {
  const dir = path.join(cacheRoot, 'parity', tag);

  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(
    path.join(dir, 'request.json'),
    JSON.stringify({ runId: `R-${tag}`, ...requestOf(c, { from, to }) })
  );

  const r = spawnSync(
    nodeBinary,
    [
      '--experimental-transform-types',
      '--disable-warning=ExperimentalWarning',
      path.join(repoRoot, 'apps/strategy-lab/runner/trading-run.ts'),
      dir
    ],
    { cwd: repoRoot, encoding: 'utf8', maxBuffer: 1 << 26 }
  );

  if (r.status !== 0) throw new Error(`browser runner failed for ${tag}: ${r.stderr.slice(-2000)}`);

  const metrics = JSON.parse(fs.readFileSync(path.join(dir, 'metrics.json'), 'utf8')).perSymbol.VGT;
  const trades = JSON.parse(fs.readFileSync(path.join(dir, 'trades.json'), 'utf8')).trades.VGT as Record<
    string,
    unknown
  >[];

  fs.rmSync(dir, { recursive: true, force: true });
  return { metrics, trades };
};

const compareToBrowser = (detail: any, browser: { metrics: any; trades: Record<string, unknown>[] }) => {
  const diffs: string[] = [];
  const eq = (name: string, a: unknown, b: unknown) => {
    if (a !== b) diffs.push(`${name}: study ${String(a)} vs browser ${String(b)}`);
  };
  const m = detail.metrics;
  const bm = browser.metrics;

  eq('totalMarkedNetUsd', m.totalMarkedNetUsd, bm.pnl.totalMarkedNetUsd);
  eq('realizedNetUsd', m.realizedNetUsd, bm.pnl.realizedNetUsd);
  eq('minuteDrawdown', detail.minuteDrawdown.maximumUsd, Math.round(bm.drawdown.minute.maximumUsd * 100) / 100);
  eq('minuteDrawdownPeak', detail.minuteDrawdown.peakTime, bm.drawdown.minute.peakTime);
  eq('minuteDrawdownTrough', detail.minuteDrawdown.troughTime, bm.drawdown.minute.troughTime);
  eq('wins', m.trades.wins, bm.trades.wins);
  eq('losses', m.trades.losses, bm.trades.losses);
  eq('breakeven', m.trades.breakeven, bm.trades.breakeven);
  eq('closed', m.trades.closed, bm.trades.closed);
  eq('open', m.trades.open, bm.trades.open);
  eq('exposure', m.occupancy.sessionsInvestedPercent, bm.occupancy.sessionsInvestedPercent);
  eq('trades', detail.trades.length, browser.trades.length);

  detail.trades.forEach((t: TradeRow, i: number) => {
    const b = browser.trades[i];

    if (!b) return;
    eq(`T${i + 1}.entry`, t.entryTime, b.entryTimeUtc);
    eq(`T${i + 1}.entryPrice`, t.entryPrice, b.entryFillPrice);
    eq(`T${i + 1}.exit`, t.exitTime, b.exitTimeUtc);
    if (t.status === 'closed') eq(`T${i + 1}.exitPrice`, t.exitPrice, b.exitFillPrice);
    eq(`T${i + 1}.net`, t.net, Math.round((b.net as number) * 100) / 100);
  });

  return diffs;
};

// P1: the study's worker path (development prefix door, compact record and on-demand detail) against the browser
// runner itself on the same dates, for fixed configurations. Returns booleans and difference lists only.
const parityJob = async (args: string[]) => {
  const opt = optOf(args);
  const name = opt('job', 'parity')!;
  const pilot = args.includes('--pilot');
  const pins = pilot
    ? (verifyPins({ allowUnfrozen: true }).pins as Record<string, string>)
    : (verifyPins().pins as Record<string, string>);
  const out = opt('out', path.join(resultsDir, pilot ? 'pilot' : 'parity', `${name}.json`))!;

  if (fs.existsSync(out)) throw new Error(`${out} exists (sealed)`);

  const configs: { tag: string; config: Config }[] = [{ tag: 'defaults', config: growthDefaults }];

  if (!pilot) configs.push({ tag: 'control4', config: control4 });

  // fixed engineering configurations: the first structurally distinct screen genomes of the parity seed family
  const seenStructures = new Set<string>();

  for (const genome of screenGenomes(512, 'parity', pilot ? 'pilot' : 'P1')) {
    const c = configOfGenome(genome);
    const key = `${c.entryMethod}/${c.trendFilterEnabled}/${c.eligibilityEnabled}/${c.drawdownRecoveryGateEnabled}/${c.initialStopEnabled}/${c.retentionEnabled}/${c.continuationMethod ?? 'off'}`;

    if (seenStructures.has(key)) continue;
    seenStructures.add(key);
    configs.push({ tag: `p${configs.length}`, config: c });
    if (configs.length >= (pilot ? 10 : 14)) break;
  }

  const job = await openJob<unknown>({
    name,
    door: 'development',
    workers: Number(opt('workers', '2')),
    pins: { ...pins, namespace: name }
  });

  logDoor({ door: 'development', job: name, purpose: pilot ? 'pilot parity (engineering)' : 'P1 parity' });

  const rows = [];

  for (const { tag, config } of configs) {
    const [detail] = await job.pool.run<any>([{ k: `detail|${configId(config)}`, c: config, detail: true }]);
    const compact = await job.lab.point(config);
    const browser = browserRun(config, chronology.firstSession, chronology.developmentEnd, `${name}-${tag}`);
    const diffs = compareToBrowser(detail, browser);
    const compactMatches =
      compact.net === Math.round(detail.metrics.totalMarkedNetUsd * 100) / 100 &&
      compact.dd === detail.minuteDrawdown.maximumUsd &&
      compact.trades === detail.trades.length &&
      compact.signature === detail.record.signature;

    rows.push({
      tag,
      id: configId(config),
      structure: describe(config).length,
      differences: diffs,
      compactMatchesDetail: compactMatches,
      trades: detail.trades.length
    });
    log(
      `parity ${tag} ${configId(config)}: ${diffs.length} differences, compact ${compactMatches ? 'matches' : 'DIFFERS'}`
    );
  }

  const passed = rows.every((r) => r.differences.length === 0 && r.compactMatchesDetail);

  writeJson(out, {
    study: STUDY,
    kind: pilot ? 'pilot parity (engineering; no figure reported)' : 'P1 parity',
    at: new Date().toISOString(),
    window: `${chronology.firstSession} → ${chronology.developmentEnd}`,
    reference: 'apps/strategy-lab/runner/trading-run.ts (the browser runner) on the same dates',
    configurations: rows.map((r) => ({
      tag: r.tag,
      id: r.id,
      trades: pilot ? undefined : r.trades,
      differences: r.differences,
      compactMatchesDetail: r.compactMatchesDetail
    })),
    passed,
    memory: { peakCgroupCurrent: job.monitor.peakCurrent }
  });
  await job.close('parity-end');
  log(`parity ${passed ? 'PASSED' : 'FAILED'}: ${out}`);
  if (!passed) process.exitCode = 1;
};

// ----- qualification -----

const rungCounts = (store: Store) => {
  const by = new Map<string, { n: number[]; ledgers: number[]; count: number; feasible: number }>();

  for (const [key, f] of store.iterate<Fit>('fits')) {
    const family = key.split('|')[0]!;
    const e = by.get(family) ?? { n: [], ledgers: [], count: 0, feasible: 0 };

    e.count++;
    if (f.violation === 0) e.feasible++;
    e.n.push(f.nb.n);
    e.ledgers.push(f.nb.ledgers);
    by.set(family, e);
  }

  const q = (v: number[], p: number) => [...v].sort((a, b) => a - b)[Math.floor((v.length - 1) * p)] ?? NaN;

  return Object.fromEntries(
    [...by.entries()].map(([k, e]) => [
      k,
      {
        centres: e.count,
        feasible: e.feasible,
        distinctConfigurations: {
          min: Math.min(...e.n),
          median: q(e.n, 0.5),
          max: Math.max(...e.n),
          total: e.n.reduce((a, b) => a + b, 0)
        },
        distinctLedgers: { min: Math.min(...e.ledgers), median: q(e.ledgers, 0.5), max: Math.max(...e.ledgers) }
      }
    ])
  );
};

const qualifyJob = async (args: string[]) => {
  const opt = optOf(args);
  const pilot = args.includes('--pilot');
  const searchJob = opt('search', pilot ? 'pilot-a' : 'search')!;
  const name = opt('job', pilot ? `${searchJob}-qualify` : 'qualify')!;
  const searchOut = pilot
    ? path.join(cacheRoot, 'pilot-out', `${searchJob}.json`)
    : path.join(resultsDir, 'search', `${searchJob}.json`);
  const out = opt(
    'out',
    pilot ? path.join(cacheRoot, 'pilot-out', `${name}.json`) : path.join(resultsDir, 'qualify', `${name}.json`)
  )!;
  const pins = pilot
    ? (verifyPins({ allowUnfrozen: true }).pins as Record<string, string>)
    : (verifyPins().pins as Record<string, string>);

  if (fs.existsSync(out)) throw new Error(`${out} exists (sealed)`);
  if (fs.existsSync(frozenSelectionFile) && !pilot)
    throw new Error('the selection is frozen; qualification refuses to re-run');

  const search = JSON.parse(fs.readFileSync(searchOut, 'utf8'));
  const searchSha = fileSha(searchOut);
  const labels = pilot ? ['pilot'] : ['F24'];
  const control = pilot ? growthDefaults : control4;
  const controlName = pilot ? 'engine defaults (pilot stand-in)' : '#4';
  const s = schedules[pilot ? 'pilot' : 'study'];
  const floors = floorsOf(data.devSessions, 2016, 2024);
  const job = await openJob<unknown>({
    name,
    door: 'development',
    workers: Number(opt('workers', '4')),
    pins: { ...pins, namespace: name }
  });

  const previous = job.checkpoint.read();

  logDoor({
    door: 'development',
    job: name,
    purpose: pilot ? 'pilot qualification workload (engineering)' : 'qualification',
    search: searchSha,
    resume: previous?.sequence ?? null
  });
  if (opt('stop-after')) job.lab.stopAfterFresh = Number(opt('stop-after'));

  const detail = async (c: Config) => (await job.pool.run<any>([{ k: `detail|${configId(c)}`, c, detail: true }]))[0]!;
  const ctx = { lab: job.lab, floors, labels, control, controlName, detail };
  const members: (Evidence & { pick: string; order: number })[] = [];
  const progress = { stage: 'qualify', done: [] as string[], resumedFrom: previous?.sequence ?? null };
  // Resume: a finished member's evaluations are all in this job's archive, so recomputing its evidence is exact and
  // cheap; the checkpoint records progress after every member.
  const controlEvidence = await job.run(
    async () => {
      for (const [order, f] of (search.shortlist as (Fit & { pick: string })[]).entries()) {
        job.setStage(`evidence ${order + 1}/${search.shortlist.length}`);
        members.push({ ...(await evidenceOf(ctx, f.config, f, s)), pick: f.pick, order });
        progress.done.push(f.id);
        job.checkpoint.write(progress as never);
        log(`evidence for shortlist ${order + 1} (${f.pick}) done`);
      }

      job.setStage('evidence control');
      return evidenceOf(ctx, control, null, s);
    },
    () => job.checkpoint.write(progress as never)
  );
  const matching = Object.fromEntries(
    members.map((m) => [m.id, matchAgainstControl(m.detail.trades, controlEvidence.detail.trades)])
  );
  const holders = assignRoles(members, s.distinct);
  const ranking = rankHolders(holders, members, controlEvidence);
  // report-only: distinct configurations and ledgers per rung, and the procedural fold diagnostic over rung 3
  const searchStore = new Store(path.join(jobDir(searchJob), 'archive.sqlite'), {
    binding: {},
    lruCapacity: 2000,
    commitRows: 1,
    commitMs: 0,
    readOnly: true
  });
  const rungs = rungCounts(searchStore);
  const r3Items = (search.r3 as string[]).map((id) => {
    const f = searchStore.read<Fit>('fits', `r3|${id}`)!;
    const pts = familyConfigs(f.config, [{ name: 'r3', n: s.r3, labels: ['r3', ...(search.labels as string[])] }]);

    return {
      id,
      records: pts
        .map((p) => searchStore.read<PointRecord>('points', `development|${configId(p.config)}`)!)
        .filter(Boolean)
    };
  });
  const procedural = foldRanking(r3Items);

  searchStore.close();

  const strip = (e: Evidence) => ({ ...e, detail: { ...e.detail, daily: undefined } });

  writeJson(out, {
    study: STUDY,
    kind: pilot ? 'pilot qualification workload (engineering)' : 'qualification (development door, in-sample)',
    at: new Date().toISOString(),
    search: { file: path.relative(repoRoot, searchOut), sha256: searchSha },
    floors,
    control: { name: controlName, ...strip(controlEvidence) },
    members: members.map(strip),
    matching,
    roles: holders,
    ranking,
    primary: ranking[0] ?? null,
    rungs,
    proceduralFolds: procedural,
    evaluations: { fresh: job.lab.fresh, archiveHits: job.lab.hits },
    memory: { peakCgroupCurrent: job.monitor.peakCurrent, peakRssTotal: job.monitor.peakRss }
  });
  await job.close('qualify-end');
  log(`qualification written: ${out}`);
};

// ----- the selection freeze -----

const freezeSelection = () => {
  verifyPins();
  if (fs.existsSync(frozenSelectionFile)) throw new Error('FROZEN_SELECTION.json exists');

  const qFile = path.join(resultsDir, 'qualify', 'qualify.json');
  const q = JSON.parse(fs.readFileSync(qFile, 'utf8'));
  const member = (id: string) => q.members.find((m: Evidence) => m.id === id) as Evidence & { pick: string };
  const frozen = {
    study: STUDY,
    kind: 'FROZEN SELECTION — read-only; written before any validation bar was read',
    frozenAt: new Date().toISOString(),
    pins: verifyPins().pins,
    protocolSha256: readFreeze()!.protocolSha256,
    search: q.search,
    qualification: { file: path.relative(repoRoot, qFile), sha256: fileSha(qFile) },
    outcome: q.roles.length ? 'at least one qualified role holder' : 'no candidate qualified',
    primary: q.primary,
    ranking: q.ranking,
    roles: q.roles,
    members: q.members.map((m: Evidence & { pick: string; order: number }) => ({
      order: m.order,
      pick: m.pick,
      id: m.id,
      canonicalSha256: sha256(JSON.stringify(m.config)),
      config: m.config,
      qualified: m.qualified,
      marginal: m.marginal,
      gates: m.gates,
      centre: m.centre,
      confirmation: m.confirm.nb,
      selection: m.select.nb
    })),
    control: {
      name: '#4',
      id: configId(control4),
      config: control4,
      confirmation: q.control.confirm.nb,
      selection: q.control.select.nb,
      centre: q.control.centre
    },
    holders: q.roles.map((h: { role: string; id: string }) => ({ ...h, config: member(h.id).config })),
    validationPlan:
      'PROTOCOL.md §10: #4 browser parity on 2016-01-04 → 2026-10-30 first; then every frozen member and #4 on one continuous run, T1–T7 on the run and the validation window (from the 2024 close), statuses pass/ambiguous/fail; comparisons with #4 on the same dates; outcomes only veto.'
  };

  writeJson(frozenSelectionFile, frozen);
  fs.chmodSync(frozenSelectionFile, 0o444);
  log(`selection frozen: ${frozenSelectionFile} sha256 ${fileSha(frozenSelectionFile)}; commit it before validate`);
};

// ----- validation (once) -----

const validateJob = async (args: string[]) => {
  const opt = optOf(args);
  // --pilot: the same code on the DEVELOPMENT door with a pseudo-boundary at 2023-12-29 (2024 as a stand-in
  // "validation" year), the pilot qualification's members and the engine defaults as the control (engineering only).
  const pilot = args.includes('--pilot');
  const boundaryDateOf = pilot ? '2023-12-29' : chronology.developmentEnd;
  const fromYear = pilot ? 2024 : 2025;
  const name = pilot ? opt('job', 'pilot-validate')! : 'validate';
  const out = pilot
    ? path.join(cacheRoot, 'pilot-out', `${name}.json`)
    : path.join(resultsDir, 'validation', 'validation.json');
  const pins = pilot
    ? (verifyPins({ allowUnfrozen: true }).pins as Record<string, string>)
    : (verifyPins().pins as Record<string, string>);

  if (fs.existsSync(out)) throw new Error(`${out} exists: the validation door opens once`);

  let frozenSha = '';
  let frozen: any;
  let commit = '';
  let rel = '';

  if (pilot) {
    const q = JSON.parse(fs.readFileSync(path.join(cacheRoot, 'pilot-out', 'pilot-a-qualify.json'), 'utf8'));

    frozen = {
      members: q.members.map((m: any) => ({
        order: m.order,
        pick: m.pick,
        id: m.id,
        config: m.config,
        centre: m.centre
      })),
      control: { centre: q.control.centre }
    };
  } else {
    if (doorEntries().some((d) => d.door === 'full' && !d.resume)) {
      if (!fs.existsSync(path.join(jobDir('validate'), 'checkpoint.json')))
        throw new Error('the full door was already opened');
    }
    if (!fs.existsSync(frozenSelectionFile)) throw new Error('no frozen selection');
    rel = path.relative(repoRoot, frozenSelectionFile);
    git('ls-files', '--error-unmatch', rel);
    if (spawnSync('git', ['diff', '--quiet', 'HEAD', '--', rel], { cwd: repoRoot }).status !== 0)
      throw new Error('FROZEN_SELECTION.json differs from HEAD');
    frozenSha = fileSha(frozenSelectionFile);
    frozen = JSON.parse(fs.readFileSync(frozenSelectionFile, 'utf8'));
    commit = git('log', '-1', '--format=%H %cI', '--', rel);
  }

  const resuming = fs.existsSync(path.join(jobDir(name), 'checkpoint.json'));

  logDoor({
    door: pilot ? 'development' : 'full',
    job: name,
    purpose: pilot ? 'pilot validation-shaped workload (engineering)' : 'final evaluation (once)',
    frozenSelection: frozenSha || null,
    commit: commit || null,
    resume: resuming
  });

  // the coordinator's own copy: coverage, and the development span equal to the development door
  const dev = await loadDevelopmentDoor();
  const full = pilot ? dev : await loadFullDoorUnchecked();
  const b = full.history.findIndex((x) => x.date === boundaryDateOf);
  const continuity = {
    developmentSpanDigestEqual: pilot
      ? null
      : sessionsDigest(full.history.slice(0, b + 1)) === sessionsDigest(dev.history),
    developmentSessions: b + 1,
    fullSessions: full.history.length,
    validationSessions: full.history.length - (b + 1)
  };
  const coverage = pilot
    ? null
    : {
        development: coverageOf(full.history.slice(0, b + 1), chronology.firstSession, chronology.developmentEnd),
        validation: coverageOf(full.history.slice(b + 1), chronology.validationStart, chronology.validationEnd)
      };
  const boundaryIndex = b;

  full.history.length = 0;
  dev.history.length = 0;

  const job = await openJob<unknown>({
    name,
    door: pilot ? 'development' : 'full',
    workers: Number(opt('workers', '8')),
    pins: { ...pins, namespace: name, frozen: frozenSha || 'pilot' },
    frozenSha256: frozenSha || undefined
  });

  if (opt('stop-after')) job.lab.stopAfterFresh = Number(opt('stop-after'));

  const progress = { stage: 'validate', done: [] as string[] };
  const detail = async (c: Config) =>
    (await job.pool.run<any>([{ k: `detail|${configId(c)}`, c, detail: true, boundary: boundaryDateOf }]))[0]!;
  const sessions = { run: continuity.fullSessions, validation: continuity.validationSessions };
  const fams = testFamilies(schedules.study.confirm, schedules.study.confirmReps);
  const controlConfig = pilot ? growthDefaults : control4;
  const evaluateOne = async (c: Config, label: string, d0?: any) => {
    job.setStage(`validation ${label}`);

    const d = d0 ?? (await detail(c));
    const test = await testRecords(job.lab, c, fams);
    const stress = await stressValidation(job.lab, c, fromYear);
    const battery = batteryOf(
      d.record,
      d.boundary,
      d.trades,
      test,
      stress.record,
      stress.validationNet,
      sessions,
      fromYear
    );

    progress.done.push(configId(c));
    job.checkpoint.write(progress as never);
    return { label, id: configId(c), detail: d, battery };
  };
  const { parity, control, members } = await job.run(
    async () => {
      // 1. #4 browser parity, before anything else
      const d4 = await detail(controlConfig);
      const parity = pilot ? null : parityOf4(d4);

      if (parity) log(`#4 parity ${parity.passed ? 'PASSED' : 'FAILED'}`);

      const control = await evaluateOne(controlConfig, pilot ? 'control' : '#4', d4);
      const members = [];

      for (const m of frozen.members)
        members.push({ ...(await evaluateOne(m.config, `member ${m.order + 1}`)), order: m.order, pick: m.pick });
      return { parity, control, members };
    },
    () => job.checkpoint.write(progress as never)
  );
  const devCheck = (m: { detail: any }, frozenCentre: { net: number }) =>
    pilot
      ? null
      : {
          developmentNetAtBoundary: m.detail.boundary.equity,
          frozenDevelopmentNet: frozenCentre.net,
          equal: Math.abs(m.detail.boundary.equity - frozenCentre.net) < 0.005
        };
  const report = {
    study: STUDY,
    kind: pilot
      ? 'pilot validation-shaped workload (engineering; development door, pseudo-boundary 2023-12-29)'
      : 'final evaluation (opened once)',
    at: new Date().toISOString(),
    frozenSelection: pilot ? null : { file: rel, sha256: frozenSha, commit },
    continuity,
    coverage,
    parity4: parity,
    boundary: { date: boundaryDateOf, index: boundaryIndex },
    control: { ...control, developmentContinuity: devCheck(control, frozen.control.centre) },
    members: members.map((m) => ({
      ...m,
      developmentContinuity: devCheck(m, frozen.members.find((x: { id: string }) => x.id === m.id).centre),
      versus4: compareWith4(m.detail, control.detail, boundaryIndex)
    })),
    evaluations: { fresh: job.lab.fresh, archiveHits: job.lab.hits },
    memory: { peakCgroupCurrent: job.monitor.peakCurrent, peakRssTotal: job.monitor.peakRss }
  };

  writeJson(out, report);
  await job.close('validate-end');
  log(`validation written: ${out}`);
  void validationNetOf;
};

// ----- the pilot driver (engineering only; no performance figure is printed or used) -----

const sh = (cmd: string, a: string[]) => spawnSync(cmd, a, { cwd: repoRoot, encoding: 'utf8' });

const launchWait = (unit: string, stageArgs: string[]) => {
  const started = Date.now();
  const r = sh(nodeBinary, [
    '--experimental-transform-types',
    '--disable-warning=ExperimentalWarning',
    self,
    'launch',
    '--unit',
    unit,
    '--wait',
    '--',
    ...stageArgs
  ]);
  const parsed = JSON.parse(r.stdout.trim().split('\n').at(-1)!);

  log(`${unit}: status ${parsed.status} after ${Math.round((Date.now() - started) / 1000)} s`);
  return { ...parsed, seconds: (Date.now() - started) / 1000 };
};

const comparable = (file: string) => {
  const j = JSON.parse(fs.readFileSync(file, 'utf8'));

  for (const k of ['job', 'started', 'finished', 'resumedFrom', 'evaluations', 'memory', 'pins']) delete j[k];
  return sha256(JSON.stringify(j));
};

const pilot = async () => {
  // pilot outputs hold development figures of pilot configurations: they stay in the git-ignored cache, unread
  const outOf = (job: string) => path.join(cacheRoot, 'pilot-out', `${job}.json`);
  const S = (job: string, workers: number, extra: string[] = []) => [
    'search',
    '--job',
    job,
    '--schedule',
    'pilot',
    '--labels',
    'pilot',
    '--workers',
    String(workers),
    '--unfrozen',
    '--out',
    outOf(job),
    ...extra
  ];
  const steps: Record<string, unknown> = {};
  const t0 = Date.now();

  // A: one worker, sequential islands, fresh archive, the real development window
  steps.A = launchWait('growth140-s8m-pilot-a', S('pilot-a', 1));
  // A2: the qualification workload (confirmation, selection, in-box, half/wide, stresses, ablations, detail), 2 workers
  steps.A2 = launchWait('growth140-s8m-pilot-a2', ['qualify', '--pilot', '--search', 'pilot-a', '--workers', '2']);
  // B: cache reload — a copy of A's archive under A's namespace, 2 workers: no fresh evaluation, identical output
  fs.mkdirSync(jobDir('pilot-b'), { recursive: true });
  fs.copyFileSync(path.join(jobDir('pilot-a'), 'archive.sqlite'), path.join(jobDir('pilot-b'), 'archive.sqlite'));
  steps.B = launchWait('growth140-s8m-pilot-b', [...S('pilot-b', 2, ['--namespace', 'pilot-a', '--resume-empty'])]);
  // C: eviction — fresh archive, LRU of 256 records, 4 workers
  steps.C = launchWait('growth140-s8m-pilot-c', S('pilot-c', 4, ['--lru', '256']));
  // D: deliberate stop after 3000 fresh evaluations, then resume (8 workers)
  steps.D1 = launchWait('growth140-s8m-pilot-d1', S('pilot-d', 8, ['--stop-after', '3000']));
  steps.D2 = launchWait('growth140-s8m-pilot-d2', S('pilot-d', 8, ['--resume']));
  // E: SIGKILL of the whole unit mid-run (no final save), resume from the last durable checkpoint (12 workers)
  const unitE = 'growth140-s8m-pilot-e1';
  const e1 = sh(nodeBinary, [
    '--experimental-transform-types',
    '--disable-warning=ExperimentalWarning',
    self,
    'launch',
    '--unit',
    unitE,
    '--',
    ...S('pilot-e', 12)
  ]);

  await new Promise((r) => setTimeout(r, 75000));

  const killed = sh('systemctl', ['--user', 'kill', '--signal=SIGKILL', `${unitE}.service`]);

  await new Promise((r) => setTimeout(r, 3000));
  steps.E1 = { launched: e1.status, killStatus: killed.status, killedAfterSeconds: 75 };
  steps.E2 = launchWait('growth140-s8m-pilot-e2', S('pilot-e', 12, ['--resume']));
  // F: parity against the browser runner (fixed non-#4 configurations)
  steps.F = launchWait('growth140-s8m-pilot-f', ['parity', '--pilot', '--job', 'pilot-parity', '--workers', '2']);

  const ref = comparable(outOf('pilot-a'));
  const equal = Object.fromEntries(
    ['pilot-b', 'pilot-c', 'pilot-d', 'pilot-e'].map((j) => [
      j,
      fs.existsSync(outOf(j)) ? comparable(outOf(j)) === ref : null
    ])
  );

  writeJson(path.join(resultsDir, 'pilot', 'pilot-driver.json'), {
    study: STUDY,
    kind: 'engineering pilot (development door; no performance figure reported)',
    started: new Date(t0).toISOString(),
    finished: new Date().toISOString(),
    minutes: (Date.now() - t0) / 60000,
    steps,
    identicalToUninterruptedA: equal
  });
  log(`pilot done in ${((Date.now() - t0) / 60000).toFixed(1)} min; identical outputs: ${JSON.stringify(equal)}`);
};

const comparableJson = (file: string, skip: string[]) => {
  const j = JSON.parse(fs.readFileSync(file, 'utf8'));

  for (const k of skip) delete j[k];
  return sha256(JSON.stringify(j));
};

// Supplementary pilot phases: checkpoint/resume inside qualification and validation (development door only).
const pilot2 = async () => {
  const t0 = Date.now();
  const out = (n: string) => path.join(cacheRoot, 'pilot-out', `${n}.json`);
  const steps: Record<string, unknown> = {};

  steps.A3a = launchWait('growth140-s8m-pilot-a3a', [
    'qualify',
    '--pilot',
    '--search',
    'pilot-a',
    '--job',
    'pilot-a-qualify-r',
    '--workers',
    '4',
    '--stop-after',
    '1500'
  ]);
  steps.A3b = launchWait('growth140-s8m-pilot-a3b', [
    'qualify',
    '--pilot',
    '--search',
    'pilot-a',
    '--job',
    'pilot-a-qualify-r',
    '--workers',
    '4'
  ]);
  steps.G = launchWait('growth140-s8m-pilot-g', ['validate', '--pilot', '--job', 'pilot-validate', '--workers', '8']);
  steps.G2a = launchWait('growth140-s8m-pilot-g2a', [
    'validate',
    '--pilot',
    '--job',
    'pilot-validate-r',
    '--workers',
    '8',
    '--stop-after',
    '400'
  ]);
  steps.G2b = launchWait('growth140-s8m-pilot-g2b', [
    'validate',
    '--pilot',
    '--job',
    'pilot-validate-r',
    '--workers',
    '8'
  ]);

  const skip = ['at', 'evaluations', 'memory'];
  const equal = {
    qualifyResumedEqualsUninterrupted:
      comparableJson(out('pilot-a-qualify-r'), skip) === comparableJson(out('pilot-a-qualify'), skip),
    validateResumedEqualsUninterrupted:
      comparableJson(out('pilot-validate-r'), skip) === comparableJson(out('pilot-validate'), skip)
  };

  writeJson(path.join(resultsDir, 'pilot', 'pilot-driver-2.json'), {
    study: STUDY,
    kind: 'engineering pilot, supplementary phases (development door; no performance figure reported)',
    started: new Date(t0).toISOString(),
    finished: new Date().toISOString(),
    minutes: (Date.now() - t0) / 60000,
    steps,
    identical: equal
  });
  log(`pilot2 done in ${((Date.now() - t0) / 60000).toFixed(1)} min; ${JSON.stringify(equal)}`);
};

export const dispatch = async (command: string | undefined, args: string[]) => {
  switch (command) {
    case 'freeze-protocol':
      return freezeProtocol();
    case 'acknowledge-code':
      return acknowledgeCode(args[1]!);
    case 'verify':
      return console.log(JSON.stringify(verifyPins()));
    case 'parity':
      return parityJob(args);
    case 'qualify':
      return qualifyJob(args);
    case 'freeze-selection':
      return freezeSelection();
    case 'validate':
      return validateJob(args);
    case 'pilot':
      return pilot();
    case 'pilot2':
      return pilot2();
    case 'memory-report': {
      const { memoryReport } = await import('./report.ts');
      const jobs = args.slice(1).filter((a) => !a.startsWith('--'));
      const report = memoryReport(jobs);
      const out = optOf(args)('out');

      if (out) writeJson(out, { study: STUDY, at: new Date().toISOString(), jobs: report });
      return console.log(JSON.stringify(report, null, 1));
    }
    default:
      throw new Error(`unknown command ${command}`);
  }
};

void dataPins;
void cacheRoot;
