// The stage and door preconditions of PROTOCOL.md §4.2, intrinsic to each door key (data.ts calls doorGate before it
// reads any bar): pilot/smoke doors only before the freeze; parity doors only between the freeze and the sealed parity
// record; `diag` (Phase A) only after parity passed and before the baseline is sealed; search doors only after the
// Phase A baseline is sealed and committed; fold test doors only after every Phase B search job is sealed; `final`
// only after FROZEN_SELECTION.json verifies (checked in data.ts).
import fs from 'fs-extra';
import {
  baseJobs,
  baselineManifestFile,
  parityFile,
  protocolFreezeFile,
  searchFile,
  vChallengerJobs,
  vDiagnosticJobs
} from './context.ts';
import { git, readSealed } from './records.ts';

export const protocolFrozen = () => fs.pathExists(protocolFreezeFile);

export const requireProtocolFrozen = async () => {
  if (!(await protocolFrozen())) throw new Error('the protocol is not frozen (npm run study7 -- freeze-protocol)');

  return readSealed<{ protocol: { sha256: string } }>(protocolFreezeFile);
};

export const requireParity = async () => {
  await requireProtocolFrozen();

  if (!(await fs.pathExists(parityFile))) throw new Error('the parity stage has not run (npm run study7 -- parity)');

  const record = await readSealed<{ passed: boolean }>(parityFile);

  if (record.passed !== true) throw new Error(`the parity stage did not pass (${parityFile})`);
};

export const requireBaselineCommitted = async () => {
  await requireParity();

  if (!(await fs.pathExists(baselineManifestFile))) {
    throw new Error('Phase B refuses to run before the Phase A baseline is sealed (npm run study7 -- phase-a-freeze)');
  }

  const manifest = await readSealed<{ bodyHash: string }>(baselineManifestFile);

  if (!git(`ls-files ${baselineManifestFile}`)) throw new Error(`${baselineManifestFile} is not committed`);

  const committed = JSON.parse(git(`show HEAD:${baselineManifestFile}`)) as { bodyHash: string };

  if (committed.bodyHash !== manifest.bodyHash) throw new Error(`${baselineManifestFile} differs from its committed version`);
};

// The Phase B jobs that must be sealed before a test door opens: the base jobs, the Track V diagnostic, and the Track V
// challenger iff its trigger fired.
export const requiredSearchJobs = async () => {
  const jobs: { track: string; fold: string; mode: string; file: string }[] = [...baseJobs, ...vDiagnosticJobs].map((job) => ({
    ...job,
    file: searchFile(job.track, job.fold, job.mode)
  }));
  const diagnosticM = searchFile('V', 'M', 'diagnostic');

  if (await fs.pathExists(diagnosticM)) {
    const { vTriggerOf } = await import('./vtrigger.ts');

    if ((await vTriggerOf()).fired) {
      jobs.push(...vChallengerJobs.map((job) => ({ ...job, file: searchFile(job.track, job.fold, job.mode) })));
    }
  }

  return jobs;
};

export const requireAllSearchesSealed = async () => {
  await requireBaselineCommitted();

  const missing: string[] = [];

  for (const job of await requiredSearchJobs()) {
    if (!(await fs.pathExists(job.file))) {
      missing.push(job.file);
      continue;
    }

    await readSealed(job.file);
  }

  if (missing.length) throw new Error(`test doors stay closed until every Phase B search is sealed; missing: ${missing.join(', ')}`);
};

export const doorGate = async (key: string) => {
  if (key === 'pilot' || key.startsWith('smoke-')) {
    if (await protocolFrozen()) throw new Error(`door ${key} is a pre-freeze door; the protocol is frozen`);
    return;
  }

  if (key.startsWith('parity')) {
    await requireProtocolFrozen();
    if (await fs.pathExists(parityFile)) throw new Error(`door ${key} opens only inside the parity stage (${parityFile} exists)`);
    return;
  }

  if (key === 'diag') {
    await requireParity();
    if (await fs.pathExists(baselineManifestFile)) throw new Error('door diag (Phase A) is closed: the baseline is sealed');
    return;
  }

  if (key.startsWith('search-')) return requireBaselineCommitted();
  if (key.startsWith('test-')) return requireAllSearchesSealed();
  if (key === 'final') return requireAllSearchesSealed();

  throw new Error(`unknown door ${key}`);
};
