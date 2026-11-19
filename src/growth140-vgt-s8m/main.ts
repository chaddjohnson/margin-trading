// growth140-vgt-s8m command line (research/growth140-vgt-s8m/RUN_COMMANDS.md).
//
//   npm run growth140-s8m -- <command> [options]
//
// Long stages are launched in a dedicated transient systemd user service with MemoryHigh/MemoryMax/MemorySwapMax
// (`launch`), never inside the interactive session's scope.
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { STUDY, chronology, data, log, nodeBinary, repoRoot, resources, resultsDir, schedules } from './context.ts';
import { buildDevelopmentFile, loadDevelopmentDoor } from './data.ts';
import { floorsOf } from './fitness.ts';
import { codeManifest, logDoor, verifyPins } from './integrity.ts';
import { EXIT_STOPPED, jobDir, openJob, parseBytes, removeJob } from './job.ts';
import { Search, type SearchState, writeJson } from './search.ts';

const args = process.argv.slice(2);
const command = args[0];
const opt = (name: string, fallback?: string) => {
  const i = args.indexOf(`--${name}`);

  return i >= 0 ? args[i + 1]! : fallback;
};
const flag = (name: string) => args.includes(`--${name}`);

// ----- launch: a transient systemd user service for a stage -----

export const launch = (unit: string, stageArgs: string[], options: { wait?: boolean; logFile?: string } = {}) => {
  const logFile = options.logFile ?? path.join(resultsDir, 'runlogs', `${unit}.log`);

  fs.mkdirSync(path.dirname(logFile), { recursive: true });

  const argv = [
    '--user',
    `--unit=${unit}`,
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

  return { status: r.status, stdout: r.stdout, stderr: r.stderr, logFile, argv };
};

// ----- search -----

const runSearchJob = async () => {
  const name = opt('job', 'search')!;
  const scheduleName = (opt('schedule', 'study') as 'study' | 'pilot')!;
  const door = opt('door', 'development')!;
  const workers = Number(opt('workers', '1'));
  const labels = (opt('labels', 'search,F24') as string).split(',');
  const resume = flag('resume');
  const out = opt('out', path.join(resultsDir, 'search', `${name}.json`))!;
  const pinsMode = flag('unfrozen') ? verifyPins({ allowUnfrozen: true }) : verifyPins();
  const pins: Record<string, string> = {
    ...(pinsMode.pins as Record<string, string>),
    schedule: scheduleName,
    labels: labels.join(',')
  };

  if (fs.existsSync(out)) throw new Error(`${out} exists (sealed); the search refuses to re-run`);
  if (!resume && !flag('resume-empty') && fs.existsSync(jobDir(name)))
    throw new Error(`job ${name} exists; pass --resume to continue it`);
  if (resume && !fs.existsSync(jobDir(name))) throw new Error(`job ${name} has nothing to resume`);
  if (scheduleName === 'study' && (!pinsMode.frozen || door !== 'development'))
    throw new Error('the study search runs on the frozen protocol and the development door');

  const started = new Date().toISOString();
  const job = await openJob<SearchState>({
    name,
    door,
    workers,
    pins,
    namespace: opt('namespace'),
    lruCapacity: opt('lru') ? Number(opt('lru')) : undefined,
    pressureBytes: opt('pressure') ? parseBytes(opt('pressure')!) : undefined
  });
  const previous = resume ? job.checkpoint.read() : null;

  if (resume && !previous) throw new Error(`job ${name}: no valid checkpoint`);

  logDoor({ door, job: name, purpose: `search (${scheduleName})`, resume, checkpoint: previous?.sequence ?? null });
  log(
    resume
      ? `resuming ${name} from checkpoint ${previous!.sequence} (${previous!.written}), stage ${previous!.body.stage}`
      : `starting ${name}`
  );

  const sessions =
    door === 'development'
      ? data.devSessions
      : (await import('./fixture.ts')).fixtureDoor(Number(door.split(':')[1] ?? 320)).history.length;
  const firstYear = Number(chronology.firstSession.slice(0, 4));
  const lastYear = door === 'development' ? 2024 : firstYear + Math.floor(sessions / 252);
  const floors = floorsOf(sessions, firstYear, lastYear);
  const search = new Search(
    {
      lab: job.lab,
      store: job.store,
      schedule: schedules[scheduleName],
      floors,
      labels,
      checkpoint: job.checkpoint,
      stopAfterFresh: opt('stop-after') ? Number(opt('stop-after')) : undefined
    },
    previous?.body ?? null
  );
  const tick = setInterval(
    () =>
      job.setStage(
        `${search.state.stage}${search.state.progress ? ` ${search.state.progress.batch} ${search.state.progress.done}/${search.state.progress.total}` : ''}`
      ),
    1000
  );

  tick.unref();

  const state = await job.run(
    () => search.run(),
    () => job.checkpoint.write(search.state)
  );

  clearInterval(tick);

  const peak = job.monitor.peakCurrent;

  writeJson(out, {
    study: STUDY,
    job: name,
    schedule: scheduleName,
    labels,
    door,
    floors,
    started,
    finished: new Date().toISOString(),
    pins,
    resumedFrom: previous ? { sequence: previous.sequence, written: previous.written } : null,
    evaluations: {
      fresh: job.lab.fresh,
      archiveHits: job.lab.hits,
      archivePoints: job.store.count('points'),
      fits: job.store.count('fits')
    },
    memory: { peakCgroupCurrent: peak, peakRssTotal: job.monitor.peakRss, samples: job.monitor.samples },
    screen: { ...state.screen, promoted: state.screen?.promoted.length },
    islands: state.islands.map(({ seen, ranked, fitIds, ...rest }) => ({
      ...rest,
      seen: seen.length,
      population: ranked.length,
      fits: fitIds.length
    })),
    t1: state.t1Log,
    archive: search.summary(),
    r2: state.r2Ids?.length,
    t3: state.t3,
    r3: state.r3Ids,
    refinements: state.refinements,
    t2: state.t2,
    shortlist: state.shortlist
  });
  log(`search ${name} complete: ${out}`);
  await job.close('search-end');
};

const main = async () => {
  switch (command) {
    case 'build-dev': {
      log(JSON.stringify(buildDevelopmentFile()));
      break;
    }

    case 'manifest': {
      const m = codeManifest();

      console.log(
        JSON.stringify({
          files: Object.keys(m.files).length,
          study: m.studyDigest,
          closure: m.closureDigest,
          engine: m.engineDigest
        })
      );
      break;
    }

    case 'search':
      await runSearchJob();
      break;

    case 'launch': {
      const unit = opt('unit')!;
      const rest = args.slice(args.indexOf('--') + 1);
      const r = launch(unit, rest, { wait: flag('wait') });

      console.log(
        JSON.stringify({ status: r.status, stdout: r.stdout.trim(), stderr: r.stderr.trim(), log: r.logFile })
      );
      process.exitCode = r.status ?? 1;
      break;
    }

    case 'remove-job': {
      const name = opt('job')!;

      if (!name.startsWith('pilot') && !name.startsWith('test')) throw new Error('only pilot/test jobs can be removed');
      removeJob(name);
      break;
    }

    case 'dev-check': {
      const door = await loadDevelopmentDoor();

      log(
        `development door: ${door.history.length} sessions ${door.from} → ${door.to}, sha256 ${door.dataSha256.slice(0, 16)}`
      );
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
