// Containment (PROTOCOL.md §13; standard §6.2): every heavy stage is a transient systemd user unit inside ONE parent
// slice whose MemoryHigh / MemoryMax / MemorySwapMax are the user's aggregate limits (44G / 48G / 0), re-applied before
// every launch; the unit itself carries the same limits, KillMode=mixed, Restart=no. Claude and tmux stay outside.
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { STUDY, cacheRoot, nodeBinary, repoRoot, resources, resultsDir } from './context.ts';

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

  return spawnSync(
    'systemctl',
    ['--user', 'show', resources.slice, '-p', 'MemoryHigh', '-p', 'MemoryMax', '-p', 'MemorySwapMax'],
    { encoding: 'utf8' }
  ).stdout.trim();
};

export const launch = (
  unit: string,
  stageArgs: string[],
  options: { wait?: boolean; env?: Record<string, string>; logFile?: string } = {}
) => {
  // engineering units (pilot, bench, dry runs) log into the git-ignored cache; study stages into results/logs
  const logFile =
    options.logFile ??
    (/pilot|bench|dry/.test(unit)
      ? path.join(cacheRoot, 'logs', `${unit}.log`)
      : path.join(resultsDir, 'logs', `${unit}.log`));

  fs.mkdirSync(path.dirname(logFile), { recursive: true });

  const slice = ensureSlice();
  const env = { PATH: process.env.PATH ?? '', ...(options.env ?? {}) };
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
    ...Object.entries(env).flatMap(([k, v]) => ['-E', `${k}=${v}`]),
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
