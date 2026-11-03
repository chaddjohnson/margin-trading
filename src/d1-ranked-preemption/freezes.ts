// The two freezes (PROTOCOL.md §17). `freeze-protocol` seals the protocol, the constants, the brief, the universe,
// the tier, the data baseline, the frozen comparators and the prospective freeze's body hash, after the independent
// preregistration review and before any study outcome. `freeze-code` seals the code manifest after the real-data
// parity gate passed and the independent engine review was recorded; every outcome stage then verifies both.
import fs from 'fs-extra';
import {
  briefFile,
  codeFreezeFile,
  contextFile,
  log,
  nowIso,
  prospectiveFreezeFile,
  protocolFile,
  protocolFreezeFile,
  researchRoot,
  stageDir,
  tierFile,
  universeFile
} from './context.ts';
import { codeManifest, gitState, readSealed, sha256File, studyCode, writeSealed } from './freeze.ts';
import { assertEnvironment, verifyProtocolFreeze } from './guard.ts';

export const parityFile = stageDir('parity', 'PARITY.json');
export const preregistrationReview = `${researchRoot}/reviews/preregistration-review.md`;
export const engineReview = `${researchRoot}/reviews/engine-review.md`;
export const reviewDispositions = `${researchRoot}/reviews/DISPOSITIONS.md`;
export const confirmatoryReview = `${researchRoot}/reviews/confirmatory-review.md`;

export const protocolBoundFiles = async () => {
  const phenotypeFiles = (await fs.readdir('config/phenotypes/D1'))
    .filter((name) => name.endsWith('.json'))
    .sort()
    .map((name) => `config/phenotypes/D1/${name}`);

  return [
    protocolFile,
    contextFile,
    briefFile,
    universeFile,
    tierFile,
    `${researchRoot}/results/baseline/data-csv.sha256`,
    'config/pools/B4.json',
    'config/pools/B5.json',
    ...phenotypeFiles,
    'config/market-events/splits.json',
    'config/market-events/distributions.csv',
    'data/partitions.json',
    'package-lock.json',
    preregistrationReview,
    engineReview,
    reviewDispositions,
    confirmatoryReview
  ];
};

export const freezeProtocol = async () => {
  const environment = assertEnvironment();

  if (environment.testMode) {
    throw new Error('the protocol is never frozen under the test-only path overrides');
  }

  if (await fs.pathExists(protocolFreezeFile)) {
    throw new Error(`${protocolFreezeFile} exists: the protocol is frozen once`);
  }

  for (const required of [
    preregistrationReview,
    engineReview,
    reviewDispositions,
    confirmatoryReview,
    universeFile,
    tierFile
  ]) {
    if (!(await fs.pathExists(required))) {
      throw new Error(`${required} is missing: the protocol cannot be frozen before it exists`);
    }
  }

  // no outcome stage may exist before the freeze
  for (const stage of ['standalone', 'diagnostic', 'joint', 'controls', 'walkforward', 'parity']) {
    if (await fs.pathExists(stageDir(stage))) {
      throw new Error(`${stageDir(stage)} exists before the protocol freeze`);
    }
  }

  const files: Record<string, string> = {};

  for (const file of await protocolBoundFiles()) {
    files[file] = await sha256File(file);
  }

  const prospective = await readSealed(prospectiveFreezeFile);
  const sealed = await writeSealed(protocolFreezeFile, {
    kind: 'ranked-preemption-protocol-freeze',
    frozenAt: nowIso(),
    git: gitState(),
    node: process.version,
    environment,
    files,
    prospectiveBodyHash: prospective.bodyHash,
    studyCodeAtFreeze: await studyCode(),
    note: 'written after the independent preregistration review and before any outcome of this study'
  });

  log(`protocol frozen: ${protocolFreezeFile} (${sealed.bodyHash.slice(0, 12)})`);

  return sealed;
};

export const freezeCode = async () => {
  if (assertEnvironment().testMode) {
    throw new Error('the code is never frozen under the test-only path overrides');
  }

  await verifyProtocolFreeze();

  if (await fs.pathExists(codeFreezeFile)) {
    throw new Error(`${codeFreezeFile} exists: the code is frozen once (later changes are amendments)`);
  }

  const parity = await readSealed<{ bodyHash: string; pass: boolean }>(parityFile);

  if (!parity.pass) {
    throw new Error(`${parityFile} records a parity failure: the study stops before any optimization`);
  }

  for (const required of [engineReview]) {
    if (!(await fs.pathExists(required))) {
      throw new Error(`${required} is missing: the code cannot be frozen before the engine review is recorded`);
    }
  }

  const sealed = await writeSealed(codeFreezeFile, {
    kind: 'ranked-preemption-code-freeze',
    frozenAt: nowIso(),
    git: gitState(),
    node: process.version,
    parity: parity.bodyHash,
    engineReviewSha256: await sha256File(engineReview),
    code: await codeManifest(),
    studyCode: await studyCode()
  });

  log(`code frozen: ${codeFreezeFile} (${sealed.bodyHash.slice(0, 12)})`);

  return sealed;
};
