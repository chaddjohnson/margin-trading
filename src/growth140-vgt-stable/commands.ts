// The stage commands (RUN_COMMANDS.md). Every evaluating stage runs inside a transient systemd user service in the
// study's parent slice (main.ts `launch`); its sealed output is written once (integrity.ts `seal`).
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { matchWinners } from '../growth140-vgt-s8m/trades.ts';
import { browserReference4, parityOf4 } from '../growth140-vgt-s8m/validate.ts';
import { coverageOf, sessionsDigest } from '../growth140-vgt-s8m/data.ts';
import { auditArchive, auditCandidates } from './audit.ts';
import { sha256 } from './checkpoint.ts';
import {
  type Cutoff,
  PRIOR,
  STUDY,
  budgets,
  cacheRoot,
  chronology,
  cutoffOf,
  cutoffs,
  doorPinsFile,
  log,
  nodeBinary,
  priorResearchDir,
  repoRoot,
  researchDir,
  resources,
  resultsDir,
  rules,
  stressCosts
} from './context.ts';
import { buildDoors, doorPins, openDoor } from './data.ts';
import type { Detail } from './engine.ts';
import { familyConfigs, nbView } from './fitness.ts';
import { type Marks, type SliceEvaluation, sequentialOf, sliceEvaluation } from './folds.ts';
import {
  amendmentsFile,
  briefFile,
  codeAckFile,
  codeManifest,
  dataPins,
  doorEntries,
  fileSha,
  freezeFile,
  git,
  logDoor,
  protocolFile,
  readFreeze,
  seal,
  verifyPins,
  writeJson
} from './integrity.ts';
import { type Job, jobDir, openJob, parseBytes } from './job.ts';
import {
  type Evidence,
  type Policy,
  evidenceOf,
  familySet,
  policies,
  primariesOf,
  rankQualified,
  sliceNetOf
} from './qualify.ts';
import { Cell, type CellSpec, type JobState } from './search.ts';
import { runSensitivity } from './sensitivity.ts';
import {
  type Config,
  configDistance,
  configId,
  control4,
  describe,
  effectiveOf,
  familyOf,
  screenGenomes,
  configOfGenome,
  withCost
} from './space.ts';

type Opt = (name: string, fallback?: string) => string | undefined;
const optOf =
  (args: string[]): Opt =>
  (name, fallback) => {
    const i = args.indexOf(`--${name}`);

    return i >= 0 ? args[i + 1]! : fallback;
  };

export const out = {
  audit: path.join(resultsDir, 'audit', 'audit.json'),
  auditCandidates: path.join(resultsDir, 'audit', 'audit-candidates.json'),
  auditReeval: path.join(resultsDir, 'audit', 'reeval.json'),
  sensitivity: path.join(resultsDir, 'sensitivity', 'sensitivity.json'),
  seeds: path.join(resultsDir, 'seeds', 'SEEDS.json'),
  parity: path.join(resultsDir, 'parity', 'parity.json'),
  search: (c: string) => path.join(resultsDir, 'search', `${c}.json`),
  qualify: (c: string) => path.join(resultsDir, 'qualify', `${c}.json`),
  foldSelection: (c: string) => path.join(resultsDir, 'folds', c, 'FOLD_SELECTION.json'),
  foldEvaluation: (c: string) => path.join(resultsDir, 'folds', c, 'evaluation.json'),
  sequential: path.join(resultsDir, 'folds', 'sequential.json'),
  frozen: path.join(researchDir, 'FROZEN_SELECTION.json'),
  final: path.join(resultsDir, 'final', 'final.json')
};

const readJson = (file: string) => JSON.parse(fs.readFileSync(file, 'utf8'));
const cents = (x: number) => Math.round(x * 100) / 100;
const yearsOfDoor = (door: string) => {
  const pins = doorPins();
  const sessions = door.startsWith('fixture') ? Number(door.split(':')[1] ?? 320) : pins![door as 'D24'].sessions;

  return sessions / 252;
};

// the previous study's frozen candidates (controls): ids and configurations
export const priorFrozen = () =>
  (
    readJson(path.join(priorResearchDir, 'FROZEN_SELECTION.json')).members as {
      id: string;
      order: number;
      pick: string;
      config: Config;
    }[]
  ).map((m) => ({ id: m.id, label: `prior C${m.order + 1} ${m.pick}`, config: m.config }));
export const priorPrimaryId = 'ec124684b6466d77';

// ----- protocol freeze -----

const freezeProtocol = () => {
  if (readFreeze()) throw new Error('the protocol is already frozen');
  if (!fs.existsSync(doorPinsFile)) throw new Error('build the doors first (build-doors)');

  const freeze = {
    study: STUDY,
    frozenAt: new Date().toISOString(),
    protocolSha256: fileSha(protocolFile),
    amendmentsSha256AtFreeze: fileSha(amendmentsFile),
    briefSha256: fileSha(briefFile),
    code: codeManifest(),
    data: dataPins(),
    git: { head: git('rev-parse', 'HEAD'), branch: git('rev-parse', '--abbrev-ref', 'HEAD') },
    budgets: budgets.study,
    rules,
    resources
  };

  writeJson(freezeFile, freeze);
  log(
    `protocol frozen: PROTOCOL.md ${freeze.protocolSha256}, code closure ${freeze.code.closureDigest} (${Object.keys(freeze.code.files).length} files)`
  );
};

const acknowledgeCode = (id: string) => {
  if (!fs.readFileSync(amendmentsFile, 'utf8').includes(`## ${id} `))
    throw new Error(`AMENDMENTS.md has no entry "## ${id} …"`);

  const code = codeManifest();

  fs.appendFileSync(
    codeAckFile,
    `${JSON.stringify({ id, at: new Date().toISOString(), closureDigest: code.closureDigest, studyDigest: code.studyDigest, amendmentsSha256: fileSha(amendmentsFile) })}\n`
  );
  log(`code ${code.closureDigest.slice(0, 16)} acknowledged under ${id}`);
};

const pinsFor = (pilot: boolean) => (pilot ? verifyPins({ allowUnfrozen: true }).pins : verifyPins().pins);

// ----- P0 parity: the worker path against the browser runner (development dates), door causality, archive reuse -----

const browserRun = (c: Config, from: string, to: string, tag: string) => {
  const dir = path.join(cacheRoot, 'parity', tag);

  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(
    path.join(dir, 'request.json'),
    JSON.stringify({
      runId: `R-${tag}`,
      strategyKey: 'rise-from-recent-low-trading',
      strategyVersion: '1.4.0',
      params: c,
      symbols: ['VGT'],
      from,
      to,
      resolution: '1d'
    })
  );

  const r = spawnSync(
    nodeBinary,
    [
      '--experimental-transform-types',
      '--disable-warning=ExperimentalWarning',
      path.join(repoRoot, 'apps/strategy-lab/runner/trading-run.ts'),
      dir
    ],
    {
      cwd: repoRoot,
      encoding: 'utf8',
      maxBuffer: 1 << 26
    }
  );

  if (r.status !== 0) throw new Error(`browser runner failed for ${tag}: ${r.stderr.slice(-2000)}`);

  const metrics = readJson(path.join(dir, 'metrics.json')).perSymbol.VGT;
  const trades = readJson(path.join(dir, 'trades.json')).trades.VGT as Record<string, unknown>[];

  fs.rmSync(dir, { recursive: true, force: true });
  return { metrics, trades };
};

const compareToBrowser = (d: Detail, b: { metrics: any; trades: Record<string, any>[] }) => {
  const diffs: string[] = [];
  const eq = (name: string, x: unknown, y: unknown) => {
    if (x !== y) diffs.push(`${name}: study ${String(x)} vs browser ${String(y)}`);
  };
  const m = d.metrics;

  eq('totalMarkedNetUsd', m.totalMarkedNetUsd, b.metrics.pnl.totalMarkedNetUsd);
  eq('realizedNetUsd', m.realizedNetUsd, b.metrics.pnl.realizedNetUsd);
  eq('minuteDrawdown', d.minuteDrawdown.maximumUsd, cents(b.metrics.drawdown.minute.maximumUsd));
  eq('minuteDrawdownPeak', d.minuteDrawdown.peakTime, b.metrics.drawdown.minute.peakTime);
  eq('minuteDrawdownTrough', d.minuteDrawdown.troughTime, b.metrics.drawdown.minute.troughTime);
  for (const k of ['wins', 'losses', 'breakeven', 'closed', 'open']) eq(k, (m.trades as any)[k], b.metrics.trades[k]);
  eq('exposure', (m.occupancy as any).sessionsInvestedPercent, b.metrics.occupancy.sessionsInvestedPercent);
  eq('trades', d.trades.length, b.trades.length);
  d.trades.forEach((t, i) => {
    const x = b.trades[i];

    if (!x) return;
    eq(`T${i + 1}.entry`, t.entryTime, x.entryTimeUtc);
    eq(`T${i + 1}.entryPrice`, t.entryPrice, x.entryFillPrice);
    eq(`T${i + 1}.exit`, t.exitTime, x.exitTimeUtc);
    if (t.status === 'closed') eq(`T${i + 1}.exitPrice`, t.exitPrice, x.exitFillPrice);
    eq(`T${i + 1}.net`, t.net, cents(x.net));
  });

  return diffs;
};

const parityJob = async (args: string[]) => {
  const opt = optOf(args);
  const pilot = args.includes('--pilot');
  const file = pilot ? path.join(cacheRoot, 'pilot-out', 'parity.json') : out.parity;

  if (fs.existsSync(file)) throw new Error(`${file} exists (sealed)`);

  const pins = pinsFor(pilot);
  const configs: { tag: string; config: Config }[] = [{ tag: 'control4', config: control4 }];

  for (const p of priorFrozen().slice(0, 2)) configs.push({ tag: p.label.replace(/\s+/g, '-'), config: p.config });

  const seenStructures = new Set<string>();

  for (const g of screenGenomes(512, null, 'parity', 'P0')) {
    const c = configOfGenome(g);
    const key = `${c.entryMethod}/${c.trendFilterEnabled}/${c.eligibilityEnabled}/${c.drawdownRecoveryGateEnabled}/${c.maximumHoldEnabled}/${c.initialStopEnabled}/${c.retentionEnabled}/${c.continuationMethod ?? 'off'}`;

    if (seenStructures.has(key)) continue;
    seenStructures.add(key);
    configs.push({ tag: `p${configs.length}`, config: c });
    if (configs.length >= 12) break;
  }

  const name = pilot ? 'pilot-parity' : 'parity';
  const job = await openJob<unknown>({ name, door: 'D24', workers: Number(opt('workers', '4')), pins });

  logDoor({ door: 'D24', job: name, purpose: pilot ? 'pilot parity (engineering)' : 'P0 parity' });

  const rows = [];

  for (const { tag, config } of configs) {
    const d = await job.lab.detail<Detail>(config);
    const compact = await job.lab.point(config);
    const diffs = compareToBrowser(
      d,
      browserRun(config, chronology.firstSession, chronology.developmentEnd, `${name}-${tag}`)
    );
    const compactOk =
      compact.net === cents(d.metrics.totalMarkedNetUsd) &&
      compact.dd === d.minuteDrawdown.maximumUsd &&
      compact.signature === d.record.signature;

    rows.push({
      tag,
      id: configId(config),
      trades: d.trades.length,
      differences: diffs,
      compactMatchesDetail: compactOk
    });
    log(`parity ${tag}: ${diffs.length} differences, compact ${compactOk ? 'matches' : 'DIFFERS'}`);
  }

  await job.close('parity-end');

  // door causality: a run on D19/D21/D23 equals the same run on D24 up to its last session (equity at that close)
  const causality = await doorCausality(
    configs.map((c) => c.config),
    pins,
    Number(opt('workers', '4'))
  );
  // archive reuse: a sample of the completed study's points recomputed on D24 equal their archived records exactly
  const reuse = await archiveReuse(pins, Number(opt('workers', '4')), Number(opt('sample', '240')));
  const passed =
    rows.every((r) => r.differences.length === 0 && r.compactMatchesDetail) && causality.passed && reuse.passed;
  const record = {
    study: STUDY,
    kind: pilot ? 'pilot parity (engineering)' : 'P0 parity',
    at: new Date().toISOString(),
    window: `${chronology.firstSession} → ${chronology.developmentEnd}`,
    reference: 'apps/strategy-lab/runner/trading-run.ts',
    configurations: rows,
    causality,
    reuse,
    passed
  };

  if (pilot) writeJson(file, record);
  else seal(file, record, 'P0 parity');
  log(`parity ${passed ? 'PASSED' : 'FAILED'}`);
  if (!passed) process.exitCode = 1;
};

const doorCausality = async (configs: Config[], pins: Record<string, string>, workers: number) => {
  const rows: { door: string; id: string; prefixNet: number; fullAtBoundary: number; equal: boolean }[] = [];
  const full = await openJob<unknown>({ name: 'parity-causality-D24', door: 'D24', workers, pins });
  const at: Record<string, Record<string, number>> = {};

  for (const c of configs) {
    const d = await full.lab.detail<Detail>(c);

    at[configId(c)] = Object.fromEntries(d.daily.map((x) => [x.date, x.marked]));
  }

  await full.close();

  for (const door of ['D19', 'D21', 'D23'] as const) {
    const job = await openJob<unknown>({ name: `parity-causality-${door}`, door, workers, pins });
    const last = doorPins()![door].last;

    for (const c of configs) {
      const r = await job.lab.point(c);

      rows.push({
        door,
        id: configId(c),
        prefixNet: r.net,
        fullAtBoundary: at[configId(c)]![last]!,
        equal: Math.abs(r.net - at[configId(c)]![last]!) < 0.005
      });
    }

    await job.close();
  }

  return { rows, passed: rows.every((r) => r.equal) };
};

const archiveReuse = async (pins: Record<string, string>, workers: number, sample: number) => {
  const { streamShard } = await import('./audit.ts');
  const picked: { id: string; config: Config; record: any }[] = [];
  const configs = new Map<string, Config>();
  let i = 0;
  const every = Math.floor(427894 / sample);

  for await (const { key, value } of streamShard<Config>('search', 'configs'))
    if (i++ % every === 0) configs.set(key, value);
  for await (const { key, value } of streamShard<any>('search', 'points')) {
    const id = key.split('|')[1]!;

    if (configs.has(id)) picked.push({ id, config: configs.get(id)!, record: value });
  }

  const job = await openJob<unknown>({ name: 'parity-reuse', door: 'D24', workers, pins });
  const recs = await job.lab.points(picked.map((p) => p.config));

  await job.close();

  const fields = ['net', 'realized', 'dd', 'ddPeak', 'ddTrough', 'trades', 'wins', 'losses', 'exposure', 'signature'];
  const diffs = picked.flatMap((p, k) =>
    fields
      .filter(
        (f) =>
          !(recs[k]![f as 'net'] === p.record[f] || (Number.isNaN(recs[k]![f as 'net']) && Number.isNaN(p.record[f])))
      )
      .map((f) => `${p.id}.${f}`)
  );

  return {
    sample: picked.length,
    fields,
    differences: diffs.slice(0, 50),
    differenceCount: diffs.length,
    passed: diffs.length === 0
  };
};

// ----- the audit -----

const auditStage = async () => {
  if (fs.existsSync(out.audit)) throw new Error('the audit is sealed');
  verifyPins();

  const a = await auditArchive();
  const candidates = auditCandidates(a.best);
  const { best, ...record } = a;

  void best;
  seal(out.audit, { study: STUDY, at: new Date().toISOString(), prior: PRIOR, ...record }, 'audit (archive only)');
  seal(
    out.auditCandidates,
    { study: STUDY, at: new Date().toISOString(), rule: 'PROTOCOL.md §10.3', candidates },
    'audit candidates'
  );
  log(`audit sealed; ${candidates.length} audit candidates`);
};

const evidenceList = async (
  job: Job<any>,
  labels: string[],
  y: number,
  items: { id: string; label: string; config: Config; [k: string]: unknown }[],
  progress: { done: string[] }
) => {
  const members: Evidence[] = [];

  for (const [k, it] of items.entries()) {
    job.setStage(`evidence ${k + 1}/${items.length} ${it.label}`);
    members.push(
      await evidenceOf({ lab: job.lab, y, labels }, it.config, {
        label: it.label,
        ...Object.fromEntries(Object.entries(it).filter(([key]) => !['config', 'id'].includes(key)))
      })
    );
    progress.done.push(it.id);
    job.checkpoint.write(progress as never);
  }

  return members;
};

const auditReevalJob = async (args: string[]) => {
  const opt = optOf(args);

  if (fs.existsSync(out.auditReeval)) throw new Error('the audit re-evaluation is sealed');

  const pins = verifyPins().pins;
  const cands = readJson(out.auditCandidates).candidates as {
    id: string;
    cell: string;
    basis: string;
    config: Config;
    prior: any;
  }[];
  const items = [
    { id: configId(control4), label: '#4', config: control4, role: 'control' },
    ...priorFrozen().map((p) => ({ ...p, role: 'prior frozen' })),
    ...cands.map((c) => ({
      id: c.id,
      label: `audit ${c.cell}`,
      config: c.config,
      role: 'audit',
      cell: c.cell,
      basis: c.basis,
      prior: c.prior
    }))
  ];
  const uniq = [...new Map(items.map((i) => [i.id, i])).values()];
  const job = await openJob<any>({ name: 'audit-reeval', door: 'D24', workers: Number(opt('workers', '14')), pins });

  logDoor({ door: 'D24', job: 'audit-reeval', purpose: 'audit re-evaluation (development)' });

  const progress = { done: [] as string[] };
  const members = await job.run(
    () => evidenceList(job, ['audit'], yearsOfDoor('D24'), uniq, progress),
    () => job.checkpoint.write(progress as never)
  );
  const ranking = rankQualified(members);

  seal(
    out.auditReeval,
    {
      study: STUDY,
      at: new Date().toISOString(),
      labels: ['audit'],
      members: members.map(stripTrades),
      ranking,
      evaluations: { fresh: job.lab.fresh, hits: job.lab.hits, failures: job.lab.failures },
      memory: { peak: job.monitor.peakCurrent }
    },
    'audit re-evaluation'
  );
  await job.close('audit-reeval-end');
};

const stripTrades = (e: Evidence) => ({ ...e, record: { ...e.record, halves: e.record.halves } });

// ----- #4 sensitivity -----

const sensitivityJob = async (args: string[]) => {
  const opt = optOf(args);
  // --pilot: the same code on D19 (engineering; no reproduction check, nothing reported)
  const pilot = args.includes('--pilot');
  const target = pilot ? path.join(cacheRoot, 'pilot-out', 'sensitivity.json') : out.sensitivity;
  const door = pilot ? 'D19' : 'D24';

  if (fs.existsSync(target)) throw new Error('the sensitivity record is sealed');

  const pins = pinsFor(pilot);
  const name = pilot ? 'pilot-sensitivity' : 'sensitivity';
  const job = await openJob<any>({ name, door, workers: Number(opt('workers', '14')), pins });

  logDoor({
    door,
    job: name,
    purpose: pilot ? '#4 sensitivity code (pilot, engineering)' : '#4 sensitivity (development)'
  });

  const r = await job.run(
    () => runSensitivity(job.lab, control4, yearsOfDoor(door), pilot),
    () => job.checkpoint.write({} as never)
  );
  const record = {
    study: STUDY,
    at: new Date().toISOString(),
    control: { id: configId(control4), config: control4 },
    ...r,
    evaluations: { fresh: job.lab.fresh, hits: job.lab.hits, failures: job.lab.failures },
    memory: { peak: job.monitor.peakCurrent }
  };

  if (pilot) writeJson(target, record);
  else seal(target, record, '#4 sensitivity');
  await job.close('sensitivity-end');
};

// ----- the informed seeds (PROTOCOL.md §6.4; mechanical from the sealed audit re-evaluation and sensitivity) -----

const seedsStage = () => {
  if (fs.existsSync(out.seeds)) throw new Error('the seeds are sealed');
  verifyPins();

  const re = readJson(out.auditReeval);
  const sens = readJson(out.sensitivity);
  const members = re.members as (Evidence & { role: string; label: string })[];
  const order = re.ranking as { id: string }[];
  const qualifiedAudit = (fam: string) =>
    order.map((o) => members.find((m) => m.id === o.id)!).filter((m) => m.role !== 'control' && m.family === fam);
  const n = budgets.study.informed.seeds;
  const rise: { id: string; label: string; config: Config }[] = [
    { id: configId(control4), label: '#4', config: control4 }
  ];
  const best = sens.region.best ? sens.region.centres.find((c: any) => c.id === sens.region.best.id) : null;

  if (best && best.id !== configId(control4))
    rise.push({ id: best.id, label: `#4 region: ${best.why}`, config: best.config });
  for (const m of qualifiedAudit('rise'))
    if (rise.length < n && !rise.some((r) => r.id === m.id)) rise.push({ id: m.id, label: m.label, config: m.config });

  const breakout: { id: string; label: string; config: Config }[] = [];

  for (const m of qualifiedAudit('breakout'))
    if (breakout.length < n && !breakout.some((r) => r.id === m.id))
      breakout.push({ id: m.id, label: m.label, config: m.config });

  seal(
    out.seeds,
    {
      study: STUDY,
      at: new Date().toISOString(),
      rule: 'PROTOCOL.md §6.4',
      inheritedInformation:
        'the seeds were chosen with 2016–2024 (the audit) and 2016–2026 (#4, the browser selection) in view',
      rise,
      breakout
    },
    'informed seeds'
  );
  log(`seeds: ${rise.length} rise, ${breakout.length} breakout`);
};

// ----- the search at one cutoff -----

const searchJob = async (args: string[]) => {
  const opt = optOf(args);
  const pilot = args.includes('--pilot');
  const cut = cutoffOf(opt('cutoff', 'C19')!);
  const name = opt('job', pilot ? `pilot-search-${cut.key}` : `search-${cut.key}`)!;
  const file = pilot ? path.join(cacheRoot, 'pilot-out', `${name}.json`) : out.search(cut.key);
  const resume = fs.existsSync(path.join(jobDir(name), 'checkpoint.json'));

  if (fs.existsSync(file)) throw new Error(`${file} exists (sealed); the search refuses to re-run`);

  const pins = { ...pinsFor(pilot), cutoff: cut.key, schedule: pilot ? 'pilot' : 'study' };
  const b = budgets[pilot ? 'pilot' : 'study'];
  const door = opt('door', cut.train)!;

  if (!pilot && door !== cut.train) throw new Error('a cutoff search opens only its training door');

  const seeds = pilot
    ? { rise: [{ id: configId(control4), label: '#4', config: control4 }], breakout: priorFrozen().slice(0, 1) }
    : readJson(out.seeds);
  const labels = pilot ? ['pilot', cut.key] : [cut.key];
  const job = await openJob<JobState>({
    name,
    door,
    workers: Number(opt('workers', '14')),
    pins,
    lruCapacity: opt('lru') ? Number(opt('lru')) : undefined,
    pressureBytes: opt('pressure') ? parseBytes(opt('pressure')!) : undefined
  });
  const previous = job.checkpoint.read();

  if (resume && !previous) throw new Error(`job ${name}: no valid checkpoint`);
  if (opt('stop-after')) job.lab.stopAfterFresh = Number(opt('stop-after'));
  logDoor({
    door,
    job: name,
    purpose: `search ${cut.key}${pilot ? ' (pilot)' : ''}`,
    resume: previous?.sequence ?? null
  });

  const state: JobState = previous?.body ?? { v: 1, cells: {} };
  const ctx = { lab: job.lab, store: job.store, y: yearsOfDoor(door), labels, checkpoint: job.checkpoint, state };
  const specs: CellSpec[] = [
    { key: `${cut.key}/global/rise`, cutoff: cut.key, source: 'global', family: 'rise' },
    { key: `${cut.key}/global/breakout`, cutoff: cut.key, source: 'global', family: 'breakout' },
    { key: `${cut.key}/informed/rise`, cutoff: cut.key, source: 'informed', family: 'rise', seeds: seeds.rise },
    {
      key: `${cut.key}/informed/breakout`,
      cutoff: cut.key,
      source: 'informed',
      family: 'breakout',
      seeds: seeds.breakout
    }
  ];
  const counts: Record<string, { fresh: number; hits: number }> = (state as any).counts ?? ((state as any).counts = {});
  const started = new Date().toISOString();
  const cells = await job.run(
    async () => {
      const outCells = [];

      for (const spec of specs) {
        const f0 = job.lab.fresh;
        const h0 = job.lab.hits;
        const cell = new Cell(ctx, spec, spec.source === 'global' ? b.global : b.informed);

        job.setStage(spec.key);
        if (spec.source === 'informed' && !(spec.seeds ?? []).length) {
          state.cells[spec.key] = {
            stage: 'done',
            islands: [],
            saturation: [],
            archiveIds: [],
            shortlist: [],
            r3Ids: [],
            r2Ids: []
          };
        } else await cell.run();
        if (!counts[spec.key] || state.cells[spec.key]!.stage !== 'done') counts[spec.key] = { fresh: 0, hits: 0 };
        counts[spec.key]!.fresh += job.lab.fresh - f0;
        counts[spec.key]!.hits += job.lab.hits - h0;
        job.checkpoint.write(state);
        outCells.push({
          spec: { ...spec, seeds: spec.seeds?.map((s) => ({ id: s.id, label: s.label })) },
          summary: cell.summary()
        });
      }

      return outCells;
    },
    () => job.checkpoint.write(state)
  );
  const record = {
    study: STUDY,
    cutoff: cut,
    door,
    labels,
    started,
    finished: new Date().toISOString(),
    pins,
    resumedFrom: previous ? { sequence: previous.sequence, written: previous.written } : null,
    evaluations: {
      fresh: job.lab.fresh,
      archiveHits: job.lab.hits,
      failures: job.lab.failures,
      archivePoints: job.store.count('points'),
      fits: job.store.count('fits'),
      perCell: counts
    },
    memory: { peakCgroupCurrent: job.monitor.peakCurrent, peakRssTotal: job.monitor.peakRss },
    cells: cells.map((c) => {
      const st = state.cells[c.spec.key]!;

      return {
        ...c,
        screen: st.screen ? { ...st.screen, promoted: st.screen.promoted.length } : null,
        local: st.local ?? null,
        islands: st.islands.map(({ seen, ranked, fitIds, ...rest }) => ({
          ...rest,
          seen: seen.length,
          population: ranked.length,
          fits: fitIds.length
        })),
        saturation: st.saturation,
        r2: st.r2Ids?.length ?? 0,
        r3: st.r3Ids ?? [],
        refinements: st.refinements ?? [],
        shortlist: st.shortlist ?? [],
        visibleInfeasible: st.visibleInfeasible ?? []
      };
    })
  };

  if (pilot) writeJson(file, record);
  else seal(file, record, `search ${cut.key}`);
  await job.close('search-end');
};

// ----- qualification at one cutoff -----

const qualifyJob = async (args: string[]) => {
  const opt = optOf(args);
  const pilot = args.includes('--pilot');
  const cut = cutoffOf(opt('cutoff', 'C19')!);
  const name = pilot ? `pilot-qualify-${cut.key}` : `qualify-${cut.key}`;
  const file = pilot ? path.join(cacheRoot, 'pilot-out', `${name}.json`) : out.qualify(cut.key);
  const searchFile = pilot ? path.join(cacheRoot, 'pilot-out', `pilot-search-${cut.key}.json`) : out.search(cut.key);

  if (fs.existsSync(file)) throw new Error(`${file} exists (sealed)`);

  const search = readJson(searchFile);
  const pins = { ...pinsFor(pilot), cutoff: cut.key };
  const items: { id: string; label: string; config: Config; source: string; cell: string; pick: string }[] = [];

  for (const c of search.cells)
    for (const s of c.shortlist)
      items.push({
        id: s.id,
        label: `${c.spec.key} ${s.pick}`,
        config: s.config,
        source: c.spec.source,
        cell: c.spec.key,
        pick: s.pick
      });

  const controls = [
    {
      id: configId(control4),
      label: '#4 (control)',
      config: control4,
      source: 'control',
      cell: 'control',
      pick: 'control'
    },
    ...priorFrozen()
      .filter((p) => p.id === priorPrimaryId)
      .map((p) => ({ ...p, label: 'prior primary (control)', source: 'control', cell: 'control', pick: 'control' }))
  ];
  const all = [...new Map([...items, ...controls].map((i) => [i.id, i])).values()];
  const job = await openJob<any>({ name, door: cut.train, workers: Number(opt('workers', '14')), pins });

  if (opt('stop-after')) job.lab.stopAfterFresh = Number(opt('stop-after'));
  logDoor({ door: cut.train, job: name, purpose: `qualification ${cut.key}`, search: fileSha(searchFile) });

  const progress = { done: [] as string[] };
  const members = (await job.run(
    () => evidenceList(job, pilot ? ['pilot', cut.key] : [cut.key], yearsOfDoor(cut.train), all, progress),
    () => job.checkpoint.write(progress as never)
  )) as (Evidence & { source: string; cell: string; pick: string; label: string })[];
  const candidates = members.filter((m) => m.source !== 'control');
  const { ranking, primaries } = primariesOf(candidates);
  // the #4 matching (development slice of this cutoff)
  const four = members.find((m) => m.id === configId(control4))!;
  const matching = Object.fromEntries(candidates.map((m) => [m.id, matchWinners(m.trades, four.trades)]));
  const record = {
    study: STUDY,
    cutoff: cut,
    at: new Date().toISOString(),
    search: { file: path.relative(repoRoot, searchFile), sha256: fileSha(searchFile) },
    labels: [cut.key],
    members,
    ranking,
    primaries,
    matchingAgainst4: matching,
    evaluations: { fresh: job.lab.fresh, hits: job.lab.hits, failures: job.lab.failures },
    memory: { peakCgroupCurrent: job.monitor.peakCurrent }
  };

  if (pilot) writeJson(file, record);
  else seal(file, record, `qualification ${cut.key}`);
  await job.close('qualify-end');
};

// ----- fold freeze and the slice evaluation -----

const pilotOut = (n: string) => path.join(cacheRoot, 'pilot-out', n);

const freezeFold = (args: string[]) => {
  const pilot = args.includes('--pilot');
  const cut = cutoffOf(optOf(args)('cutoff')!);

  if (cut.key === 'C24') throw new Error('C24 is frozen by final-select');
  if (pilot !== (cut.key === 'P18')) throw new Error('the pilot uses the pseudo-fold P18 only');
  if (!pilot) verifyPins();

  const q = readJson(pilot ? pilotOut('pilot-qualify-C19.json') : out.qualify(cut.key));
  const target = pilot ? pilotOut('P18/FOLD_SELECTION.json') : out.foldSelection(cut.key);

  if (pilot) fs.mkdirSync(path.dirname(target), { recursive: true });

  const sha = seal(
    target,
    {
      study: STUDY,
      kind: `FOLD SELECTION ${cut.key} — frozen before its evaluation slice ${cut.evalFirst} → ${cut.evalLast} is opened`,
      at: new Date().toISOString(),
      cutoff: cut,
      qualification: pilot
        ? null
        : { file: path.relative(repoRoot, out.qualify(cut.key)), sha256: fileSha(out.qualify(cut.key)) },
      primaries: q.primaries,
      ranking: q.ranking,
      members: q.members.map((m: any) => ({
        id: m.id,
        label: m.label,
        source: m.source,
        family: m.family,
        cell: m.cell,
        pick: m.pick,
        qualified: m.qualified,
        failed: m.failed,
        config: m.config,
        centre: m.centre,
        select: m.select,
        confirm: m.confirm
      }))
    },
    `fold selection ${cut.key}`
  );

  log(`fold ${cut.key} frozen: sha256 ${sha}`);
};

const evaluateFoldJob = async (args: string[]) => {
  const opt = optOf(args);
  const pilot = args.includes('--pilot');
  const cut = cutoffOf(opt('cutoff')!);
  const sel = pilot ? pilotOut('P18/FOLD_SELECTION.json') : out.foldSelection(cut.key);
  const target = pilot ? pilotOut(`P18/${opt('job', 'evaluate-P18')}.json`) : out.foldEvaluation(cut.key);

  if (cut.key === 'C24') throw new Error('C24 is evaluated by final');
  if (pilot !== (cut.key === 'P18')) throw new Error('the pilot uses the pseudo-fold P18 only');
  if (fs.existsSync(target)) throw new Error('the fold evaluation is sealed');
  if (!fs.existsSync(sel)) throw new Error('the fold selection is not frozen');

  const pins = { ...pinsFor(pilot), cutoff: cut.key };
  const selSha = fileSha(sel);
  const fold = readJson(sel);
  const name = pilot ? opt('job', 'evaluate-P18')! : `evaluate-${cut.key}`;
  const job = await openJob<any>({
    name,
    door: cut.evalDoor,
    workers: Number(opt('workers', '14')),
    pins,
    guardFile: sel,
    guardSha256: selSha
  });

  logDoor({
    door: cut.evalDoor,
    job: name,
    purpose: `fold evaluation ${cut.key} (slice ${cut.evalFirst} → ${cut.evalLast})`,
    foldSelection: selSha
  });

  const items = [
    ...fold.members.map((m: any) => ({ id: m.id, label: m.label, config: m.config })),
    ...priorFrozen().filter((p) => p.id === priorPrimaryId)
  ];
  const uniq = [...new Map(items.map((i) => [i.id, i])).values()] as { id: string; label: string; config: Config }[];
  if (opt('stop-after')) job.lab.stopAfterFresh = Number(opt('stop-after'));

  const progress = { done: [] as string[] };
  const evaluated = await job.run(
    async () => {
      const rows: (SliceEvaluation & { label: string })[] = [];
      const marks: Record<string, Marks> = {};

      for (const it of uniq) {
        job.setStage(`slice ${it.label}`);
        rows.push({ label: it.label, ...(await sliceEvaluation(job.lab, cut.key, it.config)) });
        progress.done.push(it.id);
        job.checkpoint.write(progress as never);
      }

      const primaryIds = new Set([
        ...Object.values(fold.primaries as Record<string, string | null>).filter(Boolean),
        configId(control4),
        priorPrimaryId
      ] as string[]);

      for (const id of primaryIds)
        marks[id] = await job.lab.detail<Marks>(uniq.find((u) => u.id === id)!.config, {
          marks: true,
          boundary: cut.boundary
        });
      return { rows, marks };
    },
    () => job.checkpoint.write(progress as never)
  );
  const marksFile = path.join(cacheRoot, 'folds', `${name}-marks.json`);

  writeJson(marksFile, evaluated.marks);
  seal(
    target,
    {
      study: STUDY,
      cutoff: cut,
      at: new Date().toISOString(),
      foldSelection: { file: path.relative(repoRoot, sel), sha256: selSha },
      rows: evaluated.rows,
      marks: {
        file: path.relative(repoRoot, marksFile),
        sha256: fileSha(marksFile),
        ids: Object.keys(evaluated.marks)
      },
      evaluations: { fresh: job.lab.fresh, hits: job.lab.hits, failures: job.lab.failures },
      memory: { peakCgroupCurrent: job.monitor.peakCurrent }
    },
    `fold evaluation ${cut.key}`
  );
  await job.close('evaluate-end');
};

// ----- the sequential policies (after all three fold evaluations) -----

const sequentialStage = () => {
  if (fs.existsSync(out.sequential)) throw new Error('sealed');
  verifyPins();

  const folds = cutoffs.filter((c) => c.key !== 'C24');
  const data = folds.map((c) => {
    const ev = readJson(out.foldEvaluation(c.key));
    const marks = readJson(path.join(repoRoot, ev.marks.file));

    if (fileSha(path.join(repoRoot, ev.marks.file)) !== ev.marks.sha256) throw new Error('marks file changed');
    return { cut: c, sel: readJson(out.foldSelection(c.key)), ev, marks };
  });
  const sliceOf = (k: number, id: string | null) => {
    const { ev, marks, cut } = data[k]!;
    const row = id ? ev.rows.find((r: any) => r.id === id) : null;

    return {
      cutoff: cut.key,
      id,
      sliceNet: row ? row.sliceNet : 0,
      marks: id ? (marks[id] as Marks) : null,
      openAtEnd: row ? row.openAtEnd.length > 0 : false,
      carriedIn: row ? row.carriedIn.length > 0 : false
    };
  };
  const result: Record<string, unknown> = {};

  for (const p of policies) result[p] = sequentialOf(data.map((d, k) => sliceOf(k, d.sel.primaries[p] ?? null)));
  result['control-#4'] = sequentialOf(data.map((_d, k) => sliceOf(k, configId(control4))));
  result['control-prior-primary'] = sequentialOf(data.map((_d, k) => sliceOf(k, priorPrimaryId)));

  // the procedure decision (PROTOCOL.md §7.5): among the independent global policies, the highest sequential net with
  // a positive net and a sequential drawdown ≤ $35,000
  const eligible = (['global', 'global-rise', 'global-breakout'] as Policy[]).filter((p) => {
    const r = result[p] as { net: number; withinCeiling: boolean };

    return r.net > 0 && r.withinCeiling;
  });
  const chosen =
    eligible.sort(
      (a, b) => (result[b] as { net: number }).net - (result[a] as { net: number }).net || (a < b ? -1 : 1)
    )[0] ?? null;

  seal(
    out.sequential,
    {
      study: STUDY,
      at: new Date().toISOString(),
      slices: folds.map((c) => ({ cutoff: c.key, from: c.evalFirst, to: c.evalLast })),
      policies: result,
      decision: { eligible, chosen, rule: 'PROTOCOL.md §7.5' }
    },
    'sequential policies'
  );
  log(`sequential: chosen procedure ${chosen ?? 'none (chronologically unsupported)'}`);
};

// ----- the final selection (C24) -----

const finalSelect = (args: string[] = []) => {
  const pilot = args.includes('--pilot');
  const frozenFile = pilot ? pilotOut('PILOT_FROZEN.json') : out.frozen;

  if (!pilot) verifyPins();
  if (fs.existsSync(frozenFile)) throw new Error(`${frozenFile} exists`);

  const q = readJson(pilot ? pilotOut('pilot-qualify-C19.json') : out.qualify('C24'));
  const seq = pilot ? { decision: { chosen: 'global' } } : readJson(out.sequential);
  const members = q.members as (Evidence & { source: string; cell: string; pick: string; label: string })[];
  const byId = new Map(members.map((m) => [m.id, m]));
  const ranked = (q.ranking as { id: string; rank: number }[]).map((r) => byId.get(r.id)!);
  const k = pilot ? 'C19' : 'C24';
  const caps: Record<string, number> = {
    [`${k}/global/rise`]: 3,
    [`${k}/global/breakout`]: 3,
    [`${k}/informed/rise`]: 2,
    [`${k}/informed/breakout`]: 2
  };
  const used: Record<string, number> = {};
  const finalists: typeof ranked = [];
  const distinct = (m: (typeof ranked)[number]) =>
    finalists.every((f) => configDistance(f.config, m.config) >= 0.1 && f.record.signature !== m.record.signature);

  for (const m of ranked) {
    if (finalists.length >= 10) break;
    if ((used[m.cell] ?? 0) >= (caps[m.cell] ?? 0) || !distinct(m)) continue;
    used[m.cell] = (used[m.cell] ?? 0) + 1;
    finalists.push(m);
  }

  for (const m of ranked) {
    if (finalists.length >= 10) break;
    if (!finalists.includes(m) && distinct(m)) finalists.push(m);
  }

  const order = ranked.filter((m) => finalists.includes(m));
  const chosen = seq.decision.chosen as Policy | null;
  const inScope = (m: (typeof ranked)[number], p: Policy) =>
    p === 'global'
      ? m.source === 'global'
      : p === 'global-rise'
        ? m.source === 'global' && m.family === 'rise'
        : m.source === 'global' && m.family === 'breakout';
  const primary = chosen ? (order.find((m) => inScope(m, chosen)) ?? null) : (order[0] ?? null);
  const roles: { role: string; id: string }[] = [];

  if (primary) roles.push({ role: 'primary', id: primary.id });

  const add = (role: string, m: (typeof ranked)[number] | undefined) => {
    if (m && !roles.some((r) => r.id === m.id)) roles.push({ role, id: m.id });
  };

  add(
    'best-rise',
    order.find((m) => m.family === 'rise')
  );
  add(
    'best-breakout',
    order.find((m) => m.family === 'breakout')
  );
  add(
    'best-informed',
    order.find((m) => m.source === 'informed')
  );
  if (order[0])
    add(
      'low-drawdown',
      [...order]
        .filter((m) => m.select.robustNet >= 0.5 * order[0]!.select.robustNet)
        .sort((a, b) => a.confirm.p90Dd - b.confirm.p90Dd || (a.id < b.id ? -1 : 1))[0]
    );
  for (const m of order) add('finalist', m);

  const frozen = {
    study: STUDY,
    kind: 'FROZEN SELECTION — read-only; written before any 2025–2026 outcome of a new candidate was computed',
    frozenAt: new Date().toISOString(),
    pins: pinsFor(pilot),
    qualification: pilot
      ? null
      : { file: path.relative(repoRoot, out.qualify('C24')), sha256: fileSha(out.qualify('C24')) },
    sequential: pilot
      ? null
      : { file: path.relative(repoRoot, out.sequential), sha256: fileSha(out.sequential), chosen },
    outcome: order.length ? `${order.length} finalist(s)` : 'no candidate qualified',
    primary: primary ? { id: primary.id, chronologicallySupported: chosen !== null, procedure: chosen } : null,
    rankOrder: order.map((m, i) => ({
      rank: i + 1,
      id: m.id,
      label: m.label,
      role: roles.find((r) => r.id === m.id)?.role ?? null
    })),
    roles,
    finalists: order.map((m) => ({
      id: m.id,
      label: m.label,
      source: m.source,
      family: m.family,
      cell: m.cell,
      canonicalSha256: sha256(JSON.stringify(m.config)),
      config: m.config,
      settings: describe(m.config),
      centre: m.centre,
      select: m.select,
      confirm: m.confirm,
      small: m.small,
      broad: m.broad,
      stress: m.stress,
      gates: m.gates
    })),
    controls: [
      { name: '#4', id: configId(control4), config: control4 },
      ...priorFrozen().map((p) => ({ name: p.label, id: p.id, config: p.config }))
    ],
    finalPlan:
      'PROTOCOL.md §13: #4 full-history parity first; then every finalist, #4 and the prior frozen members on one continuous run; V1–V5; comparisons on the same dates'
  };

  writeJson(frozenFile, frozen);
  fs.chmodSync(frozenFile, 0o444);
  if (!pilot)
    fs.appendFileSync(
      path.join(resultsDir, 'seals.jsonl'),
      `${JSON.stringify({ at: new Date().toISOString(), stage: 'final selection', file: path.relative(repoRoot, out.frozen), sha256: fileSha(out.frozen) })}\n`
    );
  log(`selection frozen: ${fileSha(frozenFile)}${pilot ? ' (pilot)' : ' — commit it before final'}`);
};

// ----- the final comparison (opened once) -----

const finalJob = async (args: string[]) => {
  const opt = optOf(args);
  // --pilot: the same code on D24 with a pseudo-boundary at 2023-12-29, the pilot's frozen file (engineering only)
  const pilot = args.includes('--pilot');
  const frozenFile = pilot ? pilotOut('PILOT_FROZEN.json') : out.frozen;
  const target = pilot ? pilotOut(`${opt('job', 'pilot-final')}.json`) : out.final;
  const boundary = pilot ? '2023-12-29' : chronology.developmentEnd;
  const fromYear = pilot ? 2024 : 2025;
  const door = pilot ? 'D24' : 'FULL';
  const name = pilot ? opt('job', 'pilot-final')! : 'final';

  if (fs.existsSync(target)) throw new Error('the final comparison is sealed: the FULL door opens once');
  if (!fs.existsSync(frozenFile)) throw new Error('no frozen selection');

  const rel = path.relative(repoRoot, frozenFile);

  if (!pilot) {
    git('ls-files', '--error-unmatch', rel);
    if (spawnSync('git', ['diff', '--quiet', 'HEAD', '--', rel], { cwd: repoRoot }).status !== 0)
      throw new Error('FROZEN_SELECTION.json differs from HEAD');
  }

  const frozenSha = fileSha(frozenFile);
  const frozen = readJson(frozenFile);
  const commit = pilot ? null : git('log', '-1', '--format=%H %cI', '--', rel);
  const pins = { ...pinsFor(pilot), frozen: frozenSha };
  const resuming = fs.existsSync(path.join(jobDir(name), 'checkpoint.json'));

  if (!pilot && !resuming && doorEntries().some((d) => d.door === 'FULL'))
    throw new Error('the FULL door was already opened');
  logDoor({
    door,
    job: name,
    purpose: pilot
      ? 'pilot final-shaped workload (engineering; D24, pseudo-boundary 2023-12-29)'
      : 'final comparison (once)',
    frozenSelection: frozenSha,
    commit,
    resume: resuming
  });

  // continuity and coverage (the coordinator's own copies)
  const dev = await openDoor(pilot ? 'D23' : 'D24');
  const full = await openDoor(door as 'FULL');
  const b = full.history.findIndex((x) => x.date === boundary);
  const continuity = {
    developmentSpanDigestEqual: sessionsDigest(full.history.slice(0, b + 1)) === sessionsDigest(dev.history),
    developmentSessions: b + 1,
    validationSessions: full.history.length - (b + 1)
  };
  const coverage = pilot
    ? null
    : {
        development: coverageOf(full.history.slice(0, b + 1), chronology.firstSession, chronology.developmentEnd),
        validation: coverageOf(full.history.slice(b + 1), chronology.validationStart, chronology.validationEnd)
      };

  full.history.length = 0;
  dev.history.length = 0;

  const job = await openJob<any>({
    name,
    door,
    workers: Number(opt('workers', '14')),
    pins,
    guardFile: frozenFile,
    guardSha256: frozenSha
  });

  if (opt('stop-after')) job.lab.stopAfterFresh = Number(opt('stop-after'));

  const yVal = Math.round((continuity.validationSessions / 252) * 100) / 100;
  const progress = { done: [] as string[] };
  const testFams = familySet([pilot ? 'P23' : 'C24'], 'test', 2, rules.confirmN);
  const one = async (label: string, c: Config, devNet: number | null) => {
    job.setStage(`final ${label}`);

    const d = await job.lab.detail<Detail>(c, { boundary });
    const bd = d.boundary as any;
    const stress: Record<string, { validationNet: number; runDd: number }> = {};

    for (const bps of stressCosts) {
      const r = await job.lab.point(withCost(c, bps));

      stress[`${bps}bps`] = { validationNet: cents(sliceNetOf(r, fromYear)), runDd: r.dd };
    }

    const tpts = familyConfigs(c, testFams);
    const trecs = await job.lab.points(tpts.map((p) => p.config));
    const tv = trecs.filter((r) => !r.error);
    const tnb = nbView(tv);
    const tval = tv.map((r) => sliceNetOf(r, fromYear)).sort((x, y) => x - y);
    const qq = (p: number) => (tval.length ? tval[Math.floor((tval.length - 1) * p)]! : NaN);
    const newTrades = d.trades.filter((t) => bd.newEntries.includes(t.n));
    const V = {
      V1: bd.validationDrawdown.maximumUsd <= rules.ceiling,
      V2: d.minuteDrawdown.maximumUsd <= rules.ceiling,
      V3: bd.validationNet > 0,
      V4: stress['10bps']!.validationNet > 0 && stress['10bps']!.runDd <= rules.ceiling,
      V5: tnb.p90Dd <= rules.ceiling && qq(0.5) > 0
    };
    const failed = Object.entries(V)
      .filter(([, v]) => !v)
      .map(([k]) => k);

    progress.done.push(configId(c));
    job.checkpoint.write(progress as never);
    return {
      label,
      id: configId(c),
      development: {
        net: bd.equity,
        drawdown: bd.developmentDrawdown,
        frozenDevelopmentNet: devNet,
        continuity: devNet === null ? null : Math.abs(bd.equity - devNet) < 0.005
      },
      validation: {
        net: bd.validationNet,
        drawdown: bd.validationDrawdown,
        carriedIn: bd.carriedIn,
        newTrades: newTrades.map((t) => ({
          entry: t.entryDate,
          exit: t.exitDate,
          net: t.net,
          status: t.status,
          reason: t.exitReason,
          days: t.calendarDaysHeld
        })),
        wins: newTrades.filter((t) => t.status === 'closed' && t.net > 0).length,
        losses: newTrades.filter((t) => t.status === 'closed' && t.net < 0).length,
        lossSum: cents(newTrades.filter((t) => t.status === 'closed' && t.net < 0).reduce((a, t) => a + t.net, 0)),
        openAtEnd: d.trades.filter((t) => t.status === 'open').map((t) => ({ entry: t.entryDate, net: t.net })),
        exposureSessions: d.daily.slice(b + 1).filter((x) => x.invested).length / Math.max(1, d.daily.length - (b + 1))
      },
      full: {
        net: d.metrics.totalMarkedNetUsd,
        realized: d.metrics.realizedNetUsd,
        unrealized: d.metrics.unrealizedNetUsd,
        drawdown: d.minuteDrawdown,
        trades: d.metrics.trades,
        occupancy: d.metrics.occupancy,
        record: d.record
      },
      stress,
      neighbourhood: {
        n: tnb.n,
        ledgers: tnb.ledgers,
        p90RunDd: tnb.p90Dd,
        share: tnb.share,
        worstRunDd: tnb.worstDd,
        validationMedian: qq(0.5),
        validationP10: qq(0.1),
        validationPositiveShare: tval.filter((v) => v > 0).length / Math.max(1, tval.length)
      },
      gates: V,
      failed,
      status: failed.length ? 'fail' : 'pass',
      trades: d.trades,
      episodes: d.episodes
    };
  };
  const result = await job.run(
    async () => {
      // 1. #4's full-history browser parity, before anything else
      const d4 = await job.lab.detail<Detail>(control4, { boundary });
      const parity = pilot ? null : parityOf4(d4 as any);

      if (parity) log(`#4 full-history parity ${parity.passed ? 'PASSED' : 'FAILED'}`);

      const four = await one('#4', control4, pilot ? null : 92575.71);
      const finalists = [];

      for (const f of frozen.finalists)
        finalists.push({ ...(await one(f.label, f.config, f.centre.net)), source: f.source, family: f.family });

      const prior = [];

      for (const p of priorFrozen()) prior.push(await one(p.label, p.config, null));
      return { parity, four, finalists, prior };
    },
    () => job.checkpoint.write(progress as never)
  );
  const vs4 = (m: any) => {
    const after = (ts: any[]) => ts.filter((t) => t.entryIndex > b);

    return {
      validationNetDelta: cents(m.validation.net - result.four.validation.net),
      validationDrawdownDelta: cents(m.validation.drawdown.maximumUsd - result.four.validation.drawdown.maximumUsd),
      fullNetDelta: cents(m.full.net - result.four.full.net),
      fullDrawdownDelta: cents(m.full.drawdown.maximumUsd - result.four.full.drawdown.maximumUsd),
      higherNetEqualOrLowerDd:
        m.validation.net > result.four.validation.net &&
        m.validation.drawdown.maximumUsd <= result.four.validation.drawdown.maximumUsd,
      winnersValidation: matchWinners(after(m.trades), after(result.four.trades)),
      winnersFull: matchWinners(m.trades, result.four.trades)
    };
  };

  seal(
    target,
    {
      study: STUDY,
      kind: pilot ? 'pilot final-shaped workload (engineering)' : 'final comparison (opened once)',
      at: new Date().toISOString(),
      frozenSelection: { file: rel, sha256: frozenSha, commit },
      continuity,
      coverage,
      yVal,
      parity4: result.parity,
      browserReference4,
      four: result.four,
      finalists: result.finalists.map((m) => ({ ...m, versus4: vs4(m) })),
      prior: result.prior.map((m) => ({ ...m, versus4: vs4(m) })),
      configurationsEvaluated: job.store.count('points'),
      evaluations: { fresh: job.lab.fresh, hits: job.lab.hits, failures: job.lab.failures },
      memory: { peakCgroupCurrent: job.monitor.peakCurrent }
    },
    'final comparison'
  );
  await job.close('final-end');
  log(pilot ? 'pilot final written' : 'final comparison sealed; selection for this study is closed');
};

export const dispatch = async (command: string | undefined, args: string[]) => {
  switch (command) {
    case 'build-doors':
      return console.log(JSON.stringify(await buildDoors(), null, 1));
    case 'freeze-protocol':
      return freezeProtocol();
    case 'acknowledge-code':
      return acknowledgeCode(args[1]!);
    case 'verify':
      return console.log(JSON.stringify(verifyPins()));
    case 'parity':
      return parityJob(args);
    case 'audit':
      return auditStage();
    case 'audit-reeval':
      return auditReevalJob(args);
    case 'sensitivity':
      return sensitivityJob(args);
    case 'seeds':
      return seedsStage();
    case 'search':
      return searchJob(args);
    case 'qualify':
      return qualifyJob(args);
    case 'freeze-fold':
      return freezeFold(args);
    case 'evaluate-fold':
      return evaluateFoldJob(args);
    case 'sequential':
      return sequentialStage();
    case 'final-select':
      return finalSelect(args);
    case 'final':
      return finalJob(args);
    default:
      throw new Error(`unknown command ${command}`);
  }
};

void effectiveOf;
void familyOf;
void (null as unknown as Cutoff);
