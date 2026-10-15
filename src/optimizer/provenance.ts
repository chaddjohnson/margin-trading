// Code, data and environment identifiers for run manifests and checkpoints.
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

// Every source file that can change a backtest, a search or a selection: the working-copy strategy, the
// loaders and types it uses, and the optimizer modules on the evaluation path. Reports, the data audit, the
// CLI and the holdout module are excluded, so editing them doesn't invalidate checkpoints.
export const resultFiles = [
  'src/app/allIn-optimizable.ts',
  'src/lib/csv.ts',
  'src/types/position.ts',
  'src/types/tick.ts',
  'src/optimizer/evaluate.ts',
  'src/optimizer/experiment.ts',
  'src/optimizer/fitness.ts',
  'src/optimizer/nsga2.ts',
  'src/optimizer/params.ts',
  'src/optimizer/pool.ts',
  'src/optimizer/protocol.ts',
  'src/optimizer/rng.ts',
  'src/optimizer/search.ts',
  'src/optimizer/selection.ts',
  'src/optimizer/series.ts',
  'src/optimizer/sobol.ts',
  'src/optimizer/worker.ts'
];

export const codeHash = async () => {
  const hash = createHash('sha256');

  for (const file of resultFiles) {
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
  availableParallelism: os.availableParallelism()
});

export const stableHash = (value: unknown) => createHash('sha256').update(JSON.stringify(value)).digest('hex');
