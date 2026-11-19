// vg-growth-funding-lifecycle (Priority 5A) — the command line, run from the repository root:
//
//   npm run vg-life -- preflight                     the optimization-standard adoption check
//   npm run vg-life -- manifest [--dry-run]          seal STUDY_MANIFEST.json once (then commit)
//   npm run vg-life -- freeze                        seal results/protocol-freeze.json once (then commit)
//   npm run vg-life -- stage V|C|N|S|P|F             one stage (sealed once; a sealed stage refuses to rerun)
//   npm run vg-life -- full-manifest                 seal FULL_MANIFEST.json once (then commit, before stage F)
//   npm run vg-life -- verify                        every sealed record against results/seals.jsonl
//   npm run vg-life -- pilot NAME [--sigterm-after K] [--kill-worker-after K]   engineering pilot jobs (pre-freeze)
//   npm run vg-life -- pilot-compare A B             two pilot jobs' archives are identical
//   npm run vg-life -- launch --unit NAME [--wait] -- <command and options>      a transient unit in the slice
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { checkAdoption } from '../research-standard/preflight.ts';
import { STUDY, log, repoRoot, researchDir, resources, resultsDir } from './context.ts';
import { rel, verifySeals } from './records.ts';

const args = process.argv.slice(2);
const command = args[0];
const opt = (name: string) => {
  const i = args.indexOf(`--${name}`);

  return i >= 0 ? args[i + 1] : undefined;
};
const flag = (name: string) => args.includes(`--${name}`);

const ensureSlice = () => {
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
  return spawnSync(
    'systemctl',
    ['--user', 'show', resources.slice, '-p', 'MemoryHigh', '-p', 'MemoryMax', '-p', 'MemorySwapMax'],
    {
      encoding: 'utf8'
    }
  ).stdout.trim();
};

// A transient user unit inside the study slice (MemoryHigh 44G, MemoryMax 48G, swap 0 on the slice and the unit), with
// the executable PATH of this shell (the test runner and npm-spawning tests need it), one heavy stage at a time.
const launch = (unit: string, stageArgs: string[], wait: boolean) => {
  const logFile = path.join(resultsDir, 'logs', `${unit}.log`);

  fs.mkdirSync(path.dirname(logFile), { recursive: true });

  const slice = ensureSlice();
  const r = spawnSync(
    'systemd-run',
    [
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
      'TimeoutStopSec=180',
      '-p',
      'Restart=no',
      '-p',
      `StandardOutput=append:${logFile}`,
      '-p',
      `StandardError=append:${logFile}`,
      `--setenv=PATH=${process.env.PATH ?? ''}`,
      `--working-directory=${repoRoot}`,
      ...(wait ? ['--wait'] : []),
      ...(stageArgs[0] === 'npm-test'
        ? ['npm', 'test']
        : [
            process.execPath,
            '--expose-gc',
            '--max-old-space-size=8192',
            '--experimental-transform-types',
            '--disable-warning=ExperimentalWarning',
            path.join(repoRoot, 'src', STUDY, 'main.ts'),
            ...stageArgs
          ])
    ],
    { encoding: 'utf8' }
  );

  return { status: r.status, stderr: r.stderr.trim(), log: rel(logFile), slice };
};

const main = async () => {
  switch (command) {
    case 'preflight': {
      const r = checkAdoption(researchDir, { repoRoot });

      console.log(JSON.stringify(r, null, 1));
      process.exit(r.ok ? 0 : 1);
      break;
    }

    case 'manifest': {
      const m = await import('./manifest.ts');

      if (flag('dry-run')) console.log(JSON.stringify(m.buildManifest(), null, 1));
      else console.log(`sealed STUDY_MANIFEST.json ${m.writeManifest()}`);
      break;
    }

    case 'freeze': {
      const m = await import('./manifest.ts');

      console.log(`sealed results/protocol-freeze.json ${m.freeze()}`);
      break;
    }

    case 'full-manifest': {
      const m = await import('./manifest.ts');

      console.log(`sealed FULL_MANIFEST.json ${m.writeFullManifest()}`);
      break;
    }

    case 'stage': {
      const s = await import('./stages.ts');
      const v = await import('./verdicts.ts');
      const which = args[1];
      const run = {
        V: s.stageV,
        C: s.stageC,
        N: s.stageN,
        S: s.stageS,
        P: async () => log(`stage P sealed ${v.stageP()}`),
        F: s.stageF
      }[which ?? ''];

      if (!run) throw new Error('stage V|C|N|S|P|F');
      await run();
      break;
    }

    case 'pilot': {
      const p = await import('./pilot.ts');

      await p.pilot(args[1]!, {
        sigtermAfter: Number(opt('sigterm-after') ?? 0),
        killWorkerAfter: Number(opt('kill-worker-after') ?? 0)
      });
      break;
    }

    case 'pilot-compare': {
      const p = await import('./pilot.ts');
      const r = p.compare(args[1]!, args[2]!);

      console.log(JSON.stringify(r));
      process.exit(r.identical ? 0 : 1);
      break;
    }

    case 'verify': {
      const r = verifySeals();

      console.log(JSON.stringify(r));
      process.exit(r.failed.length ? 1 : 0);
      break;
    }

    case 'launch': {
      const unit = opt('unit');

      if (!unit || !args.includes('--')) throw new Error('launch --unit NAME [--wait] -- <command>');

      const r = launch(unit, args.slice(args.indexOf('--') + 1), flag('wait'));

      console.log(JSON.stringify({ unit, ...r }));
      process.exit(r.status ?? 1);
      break;
    }

    default:
      throw new Error(`unknown command ${command ?? '(none)'}`);
  }
};

await main();
