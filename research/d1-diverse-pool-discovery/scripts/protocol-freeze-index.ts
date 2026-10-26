// Writes research/d1-diverse-pool-discovery/PROTOCOL_FREEZE.json once: the study-root index of the sealed protocol
// freeze that the full brief (§14) names. It decides nothing. Every value is copied from, or re-verified against, a
// sealed record (results/protocol_freeze.json and the check records it binds) or the frozen constants in
// src/d1-diverse/context.ts. It reads no bars and no outcome.
// Run from the repository root:
//   node --experimental-transform-types research/d1-diverse-pool-discovery/scripts/protocol-freeze-index.ts
import crypto from 'node:crypto';
import fs from 'node:fs';
import { readSealed, writeSealed } from '../../../src/d1-robust/freeze.ts';
import { readJson, researchRoot, seedLabels, stageDir, study, tiers } from '../../../src/d1-diverse/context.ts';

const target = `${researchRoot}/PROTOCOL_FREEZE.json`;

// streamed, so the running search is not starved of memory
const sha256File = (file: string) =>
  new Promise<string>((resolve, reject) => {
    const hash = crypto.createHash('sha256');

    fs.createReadStream(file)
      .on('data', (chunk) => hash.update(chunk))
      .on('end', () => resolve(hash.digest('hex')))
      .on('error', reject);
  });

const freezeFile = stageDir('protocol_freeze.json');
const freeze = await readSealed(freezeFile);
const universe = await readJson<Record<string, unknown>>(stageDir('audit', 'universe.json'));
const tier = await readJson<Record<string, unknown> & { tier: keyof typeof tiers }>(stageDir('benchmark', 'tier.json'));
const reproduce = await readJson<{ trainingDoor: Record<string, unknown> }>(stageDir('reproduce', 'reproduce.json'));

// Every check record the freeze binds must still hash as bound.
for (const [file, expected] of Object.entries(freeze.checks as Record<string, string>)) {
  if ((await sha256File(file)) !== expected) {
    throw new Error(`${file} no longer hashes as the freeze bound it`);
  }
}

for (const [file, expected] of [
  [`${researchRoot}/PROTOCOL.md`, freeze.protocolSha256],
  ['src/d1-diverse/context.ts', freeze.contextSha256]
] as const) {
  if ((await sha256File(file)) !== expected) {
    throw new Error(`${file} differs from the frozen hash`);
  }
}

// Canonical data: the hashes captured at the start of the task, each re-verified now.
const dataHashes: Record<string, string> = {};

for (const line of fs.readFileSync(stageDir('baseline', 'data-csv.sha256'), 'utf8').split('\n').filter(Boolean)) {
  const [hash, file] = line.split(/\s+/);

  if ((await sha256File(file!)) !== hash) {
    throw new Error(`${file} changed since the task baseline`);
  }

  dataHashes[file!] = hash!;
}

await writeSealed(target, {
  kind: 'index of the sealed protocol freeze (derived; decides nothing)',
  writtenAt: new Date().toISOString(),
  note:
    'Written after the freeze, the fold validations and the procedure gate because the full brief (received ' +
    '2026-10-26T07:35Z) names this file. The authoritative sealed record is results/protocol_freeze.json; every ' +
    'value here is copied from it, from the check records it binds, or from the frozen src/d1-diverse/context.ts.',
  sealedFreeze: {
    path: freezeFile,
    fileSha256: await sha256File(freezeFile),
    bodyHash: freeze.bodyHash,
    frozenAt: freeze.frozenAt,
    version: freeze.version
  },
  method: {
    protocol: { path: `${researchRoot}/PROTOCOL.md`, sha256: freeze.protocolSha256 },
    constants: { path: 'src/d1-diverse/context.ts', sha256: freeze.contextSha256 },
    designCommitment: freeze.commitment,
    preFreezeChanges: freeze.changes,
    windows: study.windows,
    principal: study.principal,
    rate: study.rate,
    costsBps: study.costsBps,
    portfolioFraction: study.fraction
  },
  auditedUniverse: {
    record: { path: stageDir('audit', 'universe.json'), sha256: freeze.universeSha256 },
    rules: universe.rules,
    identicalToOctober25Audit: universe.identical,
    calendar: universe.calendar,
    eligible: universe.eligible,
    late: universe.late,
    excluded: universe.excluded
  },
  computeBudget: {
    record: { path: stageDir('benchmark', 'tier.json'), sha256: freeze.tierSha256 },
    rule: tier.rule,
    tier: tier.tier,
    budgets: tiers[tier.tier],
    workers: tier.workers,
    traceCacheCapacity: tier.traceCacheCapacity,
    projection: tier.projection,
    schedule: { path: stageDir('schedule', 'schedule.json'), sha256: freeze.scheduleSha256 }
  },
  seeds: seedLabels,
  sourceHashes: {
    codeManifest: freeze.code,
    testManifest: freeze.tests,
    node: freeze.node,
    git: freeze.git
  },
  dataHashes: {
    splits: { path: 'config/market-events/splits.json', sha256: freeze.splitsSha256 },
    distributionLedger: { path: 'config/market-events/distributions.csv', sha256: freeze.ledgerSha256 },
    partitions: { path: 'data/partitions.json', sha256: freeze.partitionsSha256 },
    canonicalCsv: dataHashes,
    trainingDoorBars: reproduce.trainingDoor
  },
  checks: freeze.checks
});

console.info(`wrote ${target}`);
