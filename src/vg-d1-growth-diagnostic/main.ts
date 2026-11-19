// vg-d1-growth-diagnostic (Priority 3A) — the command line, run from the repository root:
//
//   npm run vg-diag -- preflight                      the optimization-standard adoption check
//   npm run vg-diag -- manifest [--dry-run]           write DIAGNOSTIC_MANIFEST.json once (then commit it)
//   npm run vg-diag -- freeze                         seal results/protocol-freeze.json (then commit it)
//   npm run vg-diag -- stage R|S|N|P|F                one stage (sealed; a completed stage refuses to rerun)
//   npm run vg-diag -- verify                         every sealed record against results/seals.jsonl
//   npm run vg-diag -- launch --unit NAME [--wait] -- <command and options>   a transient unit inside the slice
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { checkAdoption } from '../research-standard/preflight.ts';
import { STUDY, repoRoot, researchDir, resources, resultsDir } from './context.ts';
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

// A transient user unit inside the study slice (MemoryHigh 44G, MemoryMax 48G, swap 0 on the slice and the unit),
// independent of the interactive session; one heavy stage at a time.
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
      'TimeoutStopSec=120',
      '-p',
      'Restart=no',
      '-p',
      `StandardOutput=append:${logFile}`,
      '-p',
      `StandardError=append:${logFile}`,
      `--working-directory=${repoRoot}`,
      ...(wait ? ['--wait'] : []),
      process.execPath,
      '--expose-gc',
      '--max-old-space-size=8192',
      '--experimental-transform-types',
      '--disable-warning=ExperimentalWarning',
      path.join(repoRoot, 'src', STUDY, 'main.ts'),
      ...stageArgs
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
      else console.log(`sealed DIAGNOSTIC_MANIFEST.json ${m.writeManifest()}`);
      break;
    }

    case 'freeze': {
      const m = await import('./manifest.ts');

      console.log(`sealed results/protocol-freeze.json ${m.freeze()}`);
      break;
    }

    case 'stage': {
      const s = await import('./stages.ts');
      const which = args[1];
      const run = { R: s.stageR, S: s.stageS, N: s.stageN, P: s.stageP, F: s.stageF }[which ?? ''];

      if (!run) throw new Error('stage R|S|N|P|F');
      await run();
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
