// Reproducibility check of a stored Growth run (read-only towards the state directory):
//
//   node --experimental-transform-types apps/strategy-lab/scripts/replay-run.ts R-000017 [--state DIR] [--out DIR]
//
// Re-executes the run's stored request.json with the CURRENT trading runner in a new scratch directory (default: a
// fresh directory under the OS temp dir) and compares the execution facts with the stored artifacts
// (server/replay.ts). A legacy rise-from-recent-low-trading@1.0.0 run is replayed by 1.1.0 with continuation OFF and
// compared on every field it stored; a 1.1.0 run must reproduce in full. Exit 0 = reproduced, 1 = differs, 2 = usage.
// Run from the repository root (the data files are read through the normal dataset pipeline).

import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

import { STRATEGY_VERSION } from '../../../src/growth-trading/riseTrading.ts';
import { RUNNER_SCRIPTS } from '../server/jobs.ts';
import { replayStoredRun } from '../server/replay.ts';

const args = process.argv.slice(2);
const runId = args.find((a) => /^R-\d{6,12}$/.test(a));
const opt = (name: string) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : undefined;
};
if (!runId) {
  console.error('usage: replay-run.ts R-xxxxxx [--state DIR] [--out DIR]');
  process.exit(2);
}
const repoRoot = resolve(import.meta.dirname, '..', '..', '..');
const state = resolve(opt('--state') ?? join(repoRoot, 'state', 'strategy-lab'));
const storedDir = join(state, 'runs', runId);
const request = JSON.parse(readFileSync(join(storedDir, 'request.json'), 'utf8')) as { strategyKey: string; strategyVersion: string };
if (request.strategyKey !== 'rise-from-recent-low-trading') {
  console.error(`${runId} is a ${request.strategyKey} run; this tool replays Growth (rise-from-recent-low-trading) runs`);
  process.exit(2);
}
const base = opt('--out') ? resolve(opt('--out')!) : join(mkdtempSync(join(tmpdir(), 'strategy-lab-replay-')), runId);
const mode = request.strategyVersion === STRATEGY_VERSION ? 'exact' : 'legacy';
console.log(`${runId}: ${request.strategyKey}@${request.strategyVersion}, replayed by engine ${STRATEGY_VERSION} (${mode}) into ${base}`);
const { verdicts } = replayStoredRun(repoRoot, storedDir, base, RUNNER_SCRIPTS[request.strategyKey]!, mode);
for (const v of verdicts) console.log(`  ${v.identical ? 'OK  ' : 'DIFF'} ${v.file}: ${v.detail}`);
const ok = verdicts.every((v) => v.identical);
console.log(ok ? 'REPRODUCED' : 'NOT REPRODUCED');
if (ok && !opt('--out')) rmSync(base, { recursive: true });
process.exitCode = ok ? 0 : 1;
