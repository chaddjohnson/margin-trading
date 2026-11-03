// Code, data and environment identifiers for run manifests, checkpoints and the freeze.
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs from 'fs-extra';
import os from 'node:os';

const git = (...args: string[]) => {
  try {
    return execFileSync('git', args, { encoding: 'utf8' }).trim();
  } catch {
    return '';
  }
};

// Every source file that can change a backtest, a search or a selection: the working copy, the loader and
// session grouping, the types, the minute optimizer's evaluation path and the reused daily-optimizer
// modules. Reports, the CLI and the final evaluation are excluded, so editing them doesn't invalidate
// checkpoints.
export const resultFiles = [
  'src/app/allIn-minute-optimizable.ts',
  'src/lib/csv.ts',
  'src/lib/session.ts',
  'src/types/position.ts',
  'src/types/session.ts',
  'src/types/tick.ts',
  'src/minute-optimizer/data.ts',
  'src/minute-optimizer/engine.ts',
  'src/minute-optimizer/evaluate.ts',
  'src/minute-optimizer/experiment.ts',
  'src/minute-optimizer/fitness.ts',
  'src/minute-optimizer/params.ts',
  'src/minute-optimizer/pool.ts',
  'src/minute-optimizer/protocol.ts',
  'src/minute-optimizer/reference.ts',
  'src/minute-optimizer/search.ts',
  'src/minute-optimizer/selection.ts',
  'src/minute-optimizer/worker.ts',
  'src/optimizer/fitness.ts',
  'src/optimizer/nsga2.ts',
  'src/optimizer/params.ts',
  'src/optimizer/rng.ts',
  'src/optimizer/search.ts',
  'src/optimizer/sobol.ts'
];

export const codeHash = async (files = resultFiles) => {
  const hash = createHash('sha256');

  for (const file of files) {
    hash.update(file);
    hash.update(await fs.readFile(file));
  }

  return hash.digest('hex');
};

export const environment = async () => ({
  gitHead: git('rev-parse', 'HEAD'),
  gitBranch: git('rev-parse', '--abbrev-ref', 'HEAD'),
  gitDirty: git('status', '--porcelain', '--', 'src') !== '',
  codeHash: await codeHash(),
  node: process.version,
  platform: `${os.platform()} ${os.arch()}`,
  cpu: os.cpus()[0]?.model ?? 'unknown',
  availableParallelism: os.availableParallelism(),
  totalMemoryGb: Math.round(os.totalmem() / 2 ** 30)
});
