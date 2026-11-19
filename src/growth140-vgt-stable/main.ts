// growth140-vgt-stable command line (research/growth140-vgt-stable/RUN_COMMANDS.md).
//
//   npm run growth140-stable -- <command> [options]
//
// Evaluating stages run in transient systemd user services inside the study's parent slice
// (`growth140-stable.slice`: MemoryHigh=44G, MemoryMax=48G, MemorySwapMax=0 over every concurrent study process), each
// unit with the same caps, never inside the interactive session's scope (`launch`).
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { STUDY, cacheRoot, log, nodeBinary, repoRoot, resources, resultsDir } from './context.ts';
import { EXIT_STOPPED, openJob } from './job.ts';
import { configOfGenome, screenGenomes } from './space.ts';
import { verifyPins, writeJson } from './integrity.ts';
import { sha256 } from './checkpoint.ts';

const args = process.argv.slice(2);
const command = args[0];
const opt = (name: string, fallback?: string) => {
  const i = args.indexOf(`--${name}`);

  return i >= 0 ? args[i + 1]! : fallback;
};
const flag = (name: string) => args.includes(`--${name}`);

// The parent slice's limits (runtime properties; re-applied before every launch).
export const ensureSlice = () => {
  const r = spawnSync(
    'systemctl',
    [
      '--user',
      'set-property',
      '--runtime',
      resources.slice,
      `MemoryHigh=${resources.memoryHigh}`,
      `MemoryMax=${resources.memoryMax}`,
      `MemorySwapMax=${resources.memorySwapMax}`
    ],
    { encoding: 'utf8' }
  );

  if (r.status !== 0) throw new Error(`could not set the slice limits: ${r.stderr}`);

  const show = spawnSync(
    'systemctl',
    ['--user', 'show', resources.slice, '-p', 'MemoryHigh', '-p', 'MemoryMax', '-p', 'MemorySwapMax'],
    { encoding: 'utf8' }
  );

  return show.stdout.trim();
};

export const launch = (unit: string, stageArgs: string[], options: { wait?: boolean } = {}) => {
  const logFile = path.join(resultsDir, 'runlogs', `${unit}.log`);

  fs.mkdirSync(path.dirname(logFile), { recursive: true });

  const slice = ensureSlice();
  const argv = [
    '--user',
    `--unit=${unit}`,
    `--slice=${resources.slice}`,
    `--description=${STUDY} ${stageArgs.join(' ')}`,
    '--collect',
    '-p',
    `MemoryHigh=${resources.memoryHigh}`,
    '-p',
    `MemoryMax=${resources.memoryMax}`,
    '-p',
    `MemorySwapMax=${resources.memorySwapMax}`,
    '-p',
    'KillMode=mixed',
    '-p',
    'TimeoutStopSec=120',
    '-p',
    'Restart=no',
    '-p',
    `StandardOutput=append:${logFile}`,
    '-p',
    `StandardError=append:${logFile}`,
    `--working-directory=${repoRoot}`,
    ...(options.wait ? ['--wait'] : []),
    nodeBinary,
    '--expose-gc',
    `--max-old-space-size=${resources.coordinatorOldSpaceMb}`,
    '--experimental-transform-types',
    '--disable-warning=ExperimentalWarning',
    path.join(repoRoot, 'src', STUDY, 'main.ts'),
    ...stageArgs
  ];
  const r = spawnSync('systemd-run', argv, { encoding: 'utf8' });

  return { status: r.status, stdout: r.stdout, stderr: r.stderr, logFile, slice };
};

// ----- memory summaries (the completed study's report, over this study's sample logs) -----

const GiB = 2 ** 30;
const MiB = 2 ** 20;
const med = (v: number[]) => {
  const s = v.filter(Number.isFinite).sort((a, b) => a - b);

  return s.length ? s[Math.floor((s.length - 1) / 2)]! : NaN;
};
const mx = (v: number[]) => v.filter(Number.isFinite).reduce((a, b) => Math.max(a, b), -Infinity);
const rd = (x: number, d = 3) => (Number.isFinite(x) ? Math.round(x * 10 ** d) / 10 ** d : null);

export const memorySummary = (job: string) => {
  const file = path.join(resultsDir, 'memory', `${job}.jsonl`);

  if (!fs.existsSync(file)) return null;

  const rows = fs
    .readFileSync(file, 'utf8')
    .trim()
    .split('\n')
    .filter(Boolean)
    .map((l) => JSON.parse(l));
  const ready = rows.find((x) => String(x.event).startsWith('workers-ready'));
  const steady = rows.filter((x) => !x.event);
  const wr = steady.flatMap((x) => x.workerMem.map((w: { rss: number }) => w.rss));
  const last = rows.at(-1);
  const seconds = (Date.parse(last.t) - Date.parse(rows[0].t)) / 1000;

  return {
    job,
    samples: rows.length,
    seconds: rd(seconds, 0),
    workers: ready?.workers ?? last.workers,
    perWorkerAtReadyMiB: ready ? rd(med(ready.workerMem.map((w: { rss: number }) => w.rss)) / MiB, 0) : null,
    perWorkerSteadyMedianMiB: rd(med(wr) / MiB, 0),
    perWorkerSteadyMaxMiB: rd(mx(wr) / MiB, 0),
    workerArrayBuffersMaxMiB: rd(
      mx(steady.flatMap((x) => x.workerMem.map((w: { arrayBuffers: number }) => w.arrayBuffers))) / MiB,
      0
    ),
    workerHeapUsedMaxMiB: rd(
      mx(steady.flatMap((x) => x.workerMem.map((w: { heapUsed: number }) => w.heapUsed))) / MiB,
      0
    ),
    coordinatorRssMaxMiB: rd(mx(rows.map((x) => x.coordinator.rss)) / MiB, 0),
    cgroupCurrentMaxGiB: rd(mx(rows.map((x) => x.cgroup.current)) / GiB),
    cgroupPeakGiB: rd(mx(rows.map((x) => x.cgroup.peak)) / GiB),
    swapMax: mx(rows.map((x) => x.cgroup.swap)),
    memoryEvents: last.cgroup.events ?? {},
    lruMax: mx(rows.map((x) => x.store?.lruSize ?? NaN)),
    writeBufferMax: mx(rows.map((x) => x.store?.pending ?? NaN)),
    queuedMax: mx(rows.map((x) => x.queue.queued)),
    inFlightMax: mx(rows.map((x) => x.queue.inFlight)),
    failuresMax: mx(rows.map((x) => x.failures ?? 0)),
    freshEvaluations: last.evaluations.fresh,
    archiveHits: last.evaluations.archiveHits,
    freshPerSecond: seconds > 0 ? rd(last.evaluations.fresh / seconds, 2) : null
  };
};

// ----- bench: throughput and memory of a fixed batch (engineering; no performance figure is printed) -----

const bench = async () => {
  const door = opt('door', 'D24')!;
  const workers = Number(opt('workers', '14'));
  const n = Number(opt('n', '1500'));
  const name = opt('job', `pilot-bench-${door}-${workers}`)!;
  const configs = [
    ...new Map(
      screenGenomes(n, null, 'pilot', 'bench', door)
        .map((g) => configOfGenome(g))
        .map((c) => [JSON.stringify(c), c])
    ).values()
  ];
  const job = await openJob<unknown>({
    name,
    door,
    workers,
    pins: { ...verifyPins({ allowUnfrozen: true }).pins, bench: 'pilot' }
  });
  const t0 = performance.now();
  const recs = await job.lab.points(configs);
  const seconds = (performance.now() - t0) / 1000;

  await job.close('bench-end');
  writeJson(path.join(resultsDir, 'pilot', `${name}.json`), {
    kind: 'engineering bench (no performance figure)',
    door,
    workers,
    evaluations: configs.length,
    seconds,
    perSecond: configs.length / seconds,
    failures: recs.filter((r) => r.error).length,
    peakCgroupGiB: job.monitor.peakCurrent / GiB,
    recordsDigest: sha256(JSON.stringify(recs.map((r) => r.signature)))
  });
  log(`bench ${door} × ${workers}: ${configs.length} evaluations in ${seconds.toFixed(1)} s`);
};

// ----- the pilot driver (engineering only: every output stays in the git-ignored cache, unread) -----

const self = path.join(repoRoot, 'src', STUDY, 'main.ts');
const launchWait = (unit: string, stageArgs: string[]) => {
  const t = Date.now();
  const r = spawnSync(
    nodeBinary,
    [
      '--experimental-transform-types',
      '--disable-warning=ExperimentalWarning',
      self,
      'launch',
      '--unit',
      unit,
      '--wait',
      '--',
      ...stageArgs
    ],
    { cwd: repoRoot, encoding: 'utf8' }
  );
  const parsed = JSON.parse(r.stdout.trim().split('\n').at(-1)!);

  log(`${unit}: status ${parsed.status} after ${Math.round((Date.now() - t) / 1000)} s`);
  return { ...parsed, seconds: (Date.now() - t) / 1000 };
};
const comparable = (file: string, skip: string[]) => {
  const j = JSON.parse(fs.readFileSync(file, 'utf8'));

  for (const k of skip) delete j[k];
  return sha256(JSON.stringify(j));
};

const pilot = async () => {
  const outOf = (n: string) => path.join(cacheRoot, 'pilot-out', `${n}.json`);
  const S = (job: string, workers: number, extra: string[] = []) => [
    'search',
    '--pilot',
    '--cutoff',
    'C19',
    '--job',
    job,
    '--workers',
    String(workers),
    ...extra
  ];
  const steps: Record<string, unknown> = {};
  const t0 = Date.now();

  // A: the whole search pipeline (four cells) on D19, 4 workers, fresh archive
  steps.A = launchWait('growth140-stable-pilot-a', S('pilot-search-C19', 4));
  // B: stop after 1,500 fresh evaluations, then resume (8 workers): identical output
  steps.B1 = launchWait('growth140-stable-pilot-b1', S('pilot-search-C19-b', 8, ['--stop-after', '1500']));
  steps.B2 = launchWait('growth140-stable-pilot-b2', S('pilot-search-C19-b', 8));
  // C: SIGKILL of the whole unit mid-run, resume from the last durable checkpoint (14 workers): identical output
  spawnSync(
    nodeBinary,
    [
      '--experimental-transform-types',
      '--disable-warning=ExperimentalWarning',
      self,
      'launch',
      '--unit',
      'growth140-stable-pilot-c1',
      '--',
      ...S('pilot-search-C19-c', 14)
    ],
    { cwd: repoRoot }
  );
  await new Promise((r) => setTimeout(r, 35000));
  steps.C1 = {
    killed: spawnSync('systemctl', ['--user', 'kill', '--signal=SIGKILL', 'growth140-stable-pilot-c1.service']).status
  };
  await new Promise((r) => setTimeout(r, 3000));
  steps.C2 = launchWait('growth140-stable-pilot-c2', S('pilot-search-C19-c', 14));
  // D: eviction (LRU of 256), 12 workers: identical output
  steps.D = launchWait('growth140-stable-pilot-d', S('pilot-search-C19-d', 12, ['--lru', '256']));
  // E: qualification of the pilot shortlist (C19 labels, pilot), then its stop/resume
  steps.E = launchWait('growth140-stable-pilot-e', ['qualify', '--pilot', '--cutoff', 'C19', '--workers', '8']);
  // F: the fold path on the pseudo-fold P18 (inside D19): freeze, evaluate; stop/resume of the evaluation
  steps.F0 = spawnSync(
    nodeBinary,
    [
      '--experimental-transform-types',
      '--disable-warning=ExperimentalWarning',
      self,
      'freeze-fold',
      '--pilot',
      '--cutoff',
      'P18'
    ],
    { cwd: repoRoot, encoding: 'utf8' }
  ).status;
  steps.F = launchWait('growth140-stable-pilot-f', ['evaluate-fold', '--pilot', '--cutoff', 'P18', '--workers', '8']);
  steps.F2a = launchWait('growth140-stable-pilot-f2a', [
    'evaluate-fold',
    '--pilot',
    '--cutoff',
    'P18',
    '--job',
    'evaluate-P18-r',
    '--workers',
    '8',
    '--stop-after',
    '200'
  ]);
  steps.F2b = launchWait('growth140-stable-pilot-f2b', [
    'evaluate-fold',
    '--pilot',
    '--cutoff',
    'P18',
    '--job',
    'evaluate-P18-r',
    '--workers',
    '8'
  ]);
  // G: the final-shaped workload on D24 with a pseudo-boundary at 2023-12-29
  steps.G0 = spawnSync(
    nodeBinary,
    ['--experimental-transform-types', '--disable-warning=ExperimentalWarning', self, 'final-select', '--pilot'],
    { cwd: repoRoot, encoding: 'utf8' }
  ).status;
  steps.G = launchWait('growth140-stable-pilot-g', ['final', '--pilot', '--workers', '14']);

  const skip = ['started', 'finished', 'resumedFrom', 'evaluations', 'memory', 'pins'];
  const ref = comparable(outOf('pilot-search-C19'), skip);
  const equal = Object.fromEntries(
    ['pilot-search-C19-b', 'pilot-search-C19-c', 'pilot-search-C19-d'].map((j) => [
      j,
      fs.existsSync(outOf(j)) ? comparable(outOf(j), skip) === ref : null
    ])
  );
  const fSkip = ['at', 'evaluations', 'memory', 'marks'];
  const fEqual =
    fs.existsSync(path.join(cacheRoot, 'pilot-out', 'P18', 'evaluate-P18-r.json')) &&
    comparable(path.join(cacheRoot, 'pilot-out', 'P18', 'evaluate-P18-r.json'), fSkip) ===
      comparable(path.join(cacheRoot, 'pilot-out', 'P18', 'evaluate-P18.json'), fSkip);

  writeJson(path.join(resultsDir, 'pilot', 'pilot-driver.json'), {
    study: STUDY,
    kind: 'engineering pilot (D19 / pseudo-folds; no performance figure reported)',
    started: new Date(t0).toISOString(),
    finished: new Date().toISOString(),
    minutes: (Date.now() - t0) / 60000,
    steps,
    searchIdenticalToUninterruptedA: equal,
    foldEvaluationResumedEqualsUninterrupted: fEqual
  });
  log(`pilot done in ${((Date.now() - t0) / 60000).toFixed(1)} min; ${JSON.stringify(equal)} fold ${fEqual}`);
};

const main = async () => {
  switch (command) {
    case 'launch': {
      const unit = opt('unit')!;
      const rest = args.slice(args.indexOf('--') + 1);
      const r = launch(unit, rest, { wait: flag('wait') });

      console.log(
        JSON.stringify({
          status: r.status,
          stdout: r.stdout.trim(),
          stderr: r.stderr.trim(),
          log: r.logFile,
          slice: r.slice
        })
      );
      process.exitCode = r.status ?? 1;
      break;
    }

    case 'slice':
      console.log(ensureSlice());
      break;

    case 'bench':
      await bench();
      break;

    case 'pilot':
      await pilot();
      break;

    case 'memory-report': {
      const jobs = args.slice(1).filter((a) => !a.startsWith('--'));
      const report = jobs.map(memorySummary).filter(Boolean);
      const o = opt('out');

      if (o) writeJson(o, { study: STUDY, at: new Date().toISOString(), jobs: report });
      console.log(JSON.stringify(report, null, 1));
      break;
    }

    default: {
      const mod = await import('./commands.ts');

      await mod.dispatch(command, args);
    }
  }
};

main().catch((error) => {
  console.error(error);
  process.exit(error?.code === EXIT_STOPPED ? EXIT_STOPPED : 1);
});
