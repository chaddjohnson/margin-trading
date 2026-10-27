// `verify` (read-only): the protocol freeze and its amendments; the read-only inputs (canonical data, config/, the
// ranked-preemption, B4/B5, VGT and prospective-freeze studies) byte-for-byte equal to the Stage 0 baseline; no tracked
// file outside this study's namespace changed except the one package.json script; the source census checks; every
// specified run stored with a matching specification hash; and, once analysed, the per-lot accounting identity and
// the fold boundary parity (the liquidation mark at each fold's search-end close equals the stored Stage A net).
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs from 'fs-extra';
import { analysisFile } from './analysis.ts';
import { batchStatus } from './batch.ts';
import { codeRoot, log, readJson, researchRoot, resultDir } from './context.ts';
import { verifyFreeze } from './freeze.ts';
import { buildCensus } from './inventory.ts';

interface Check {
  name: string;
  pass: boolean;
  detail: string;
}

const sha256 = async (file: string) =>
  createHash('sha256')
    .update(await fs.readFile(file))
    .digest('hex');

// A baseline list (`shasum -a 256` format) recomputed now.
const listUnchanged = async (listFile: string) => {
  const lines = (await fs.readFile(listFile, 'utf8')).split('\n').filter(Boolean);
  const changed: string[] = [];

  for (const line of lines) {
    const [hash, ...rest] = line.split('  ');
    const file = rest.join('  ');

    if (!(await fs.pathExists(file)) || (await sha256(file)) !== hash) {
      changed.push(file);
    }
  }

  return { files: lines.length, changed };
};

const git = (args: string[]) => execFileSync('git', args, { encoding: 'utf8' });

export const verify = async () => {
  const checks: Check[] = [];
  const { freeze, problems } = await verifyFreeze();

  checks.push({
    name: 'protocol freeze (and amendments) verifies',
    pass: problems.length === 0,
    detail:
      problems.length === 0
        ? `${Object.keys(freeze.files).length} files, ${freeze.amendments.length} amendments`
        : problems.join('; ')
  });

  for (const list of ['data.sha256', 'config.sha256', 'prior-research.sha256']) {
    const result = await listUnchanged(resultDir('baseline', list));

    checks.push({
      name: `read-only inputs unchanged: ${list}`,
      pass: result.changed.length === 0,
      detail: `${result.files} files, ${result.changed.length} changed${result.changed.length > 0 ? `: ${result.changed.slice(0, 5).join(', ')}` : ''}`
    });
  }

  const head = (await fs.readFile(resultDir('baseline', 'head.txt'), 'utf8')).trim();
  const changedTracked = git(['diff', '--name-only', head, '--', '.', `:!${researchRoot}`, `:!${codeRoot}`])
    .split('\n')
    .filter(Boolean);
  const untracked = git(['ls-files', '--others', '--exclude-standard', '--', '.', `:!${researchRoot}`, `:!${codeRoot}`])
    .split('\n')
    .filter(Boolean);
  const packageDiff = git(['diff', head, '--', 'package.json'])
    .split('\n')
    .filter((line) => /^[+-][^+-]/.test(line));

  checks.push({
    name: 'outside this study only package.json changed, by one script line',
    pass:
      changedTracked.every((file) => file === 'package.json') &&
      untracked.length === 0 &&
      packageDiff.filter((line) => line.startsWith('+') && line.includes('standalone-opportunity-audit')).length ===
        1 &&
      packageDiff.length <= 3,
    detail: `tracked changed: ${changedTracked.join(', ') || 'none'}; untracked: ${untracked.length}; package.json diff lines: ${packageDiff.length}`
  });

  const census = await buildCensus();

  checks.push({
    name: 'source census checks (sealed bodies, file and archive hashes, the shortlist anchor)',
    pass: census.checks.every((check) => check.pass),
    detail: `${census.checks.filter((check) => check.pass).length}/${census.checks.length}`
  });

  if (problems.length === 0) {
    const status = await batchStatus();

    checks.push({
      name: 'every specified run is stored with a matching specification hash',
      pass: status.every((row) => row.stored === row.specified),
      detail: status.map((row) => `${row.family} ${row.stored}/${row.specified}`).join(', ')
    });
  }

  if (await fs.pathExists(analysisFile)) {
    const analysis = await readJson<{
      phenotypes: Record<string, { tails: { accountingMaxError: number } }>;
      selection: Record<string, { boundaryParity: number }>;
    }>(analysisFile);
    const worst = Math.max(...Object.values(analysis.phenotypes).map((result) => result.tails.accountingMaxError));

    checks.push({
      name: 'every base lot: net = gross − interest − friction (to the cent)',
      pass: worst <= 0.01,
      detail: `largest error ${worst.toExponential(2)}`
    });
    checks.push({
      name: 'fold runs: the liquidation mark at the search-end close equals the stored Stage A net (every symbol)',
      pass: Object.values(analysis.selection).every((fold) => fold.boundaryParity === 1),
      detail: Object.entries(analysis.selection)
        .map(([fold, value]) => `${fold} ${(value.boundaryParity * 100).toFixed(1)}%`)
        .join(', ')
    });
  }

  for (const check of checks) {
    log(`${check.pass ? 'PASS' : 'FAIL'} ${check.name}: ${check.detail}`);
  }

  await fs.outputFile(resultDir('verify.json'), `${JSON.stringify({ checks }, null, 1)}\n`);

  if (checks.some((check) => !check.pass)) {
    throw new Error('verification failed');
  }

  log('all checks passed');
};
