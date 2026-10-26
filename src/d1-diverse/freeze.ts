// The study's write-once records (PROTOCOL.md §20, §23): the design commitment (protocol, context and code manifest
// hashed before any market P&L of this study), the hash-chained log of reviewed technical changes made before any
// outcome, the protocol freeze (protocol, context, code, re-audited universe, tier, schedule, data-registry hashes),
// the append-only amendment log after the freeze, and the guards every stage calls. Sealed records reuse the October
// 25 study's write-once helpers (body hash; refuse to be written twice; refuse to be read if any byte changed).
import path from 'node:path';
import fs from 'fs-extra';
import { gitState, hashBody, readSealed, sha256, sha256File, writeSealed } from '../d1-robust/freeze.ts';
import {
  amendmentsFile,
  changesFile,
  contextFile,
  designCommitmentFile,
  log,
  nowIso,
  protocolFile,
  protocolFreezeFile,
  readJson,
  reportFile,
  researchRoot,
  scheduleFile,
  study,
  tierFile,
  universeFile
} from './context.ts';

export { gitState, hashBody, readSealed, sha256, sha256File, writeSealed };

export const splitsFile = 'config/market-events/splits.json';
export const ledgerFile = 'config/market-events/distributions.csv';
export const partitionsFile = 'data/partitions.json';
export const briefFiles = [path.join(researchRoot, 'brief', 'BRIEF_AS_RECEIVED.md')];

// ----- the code manifest: every TypeScript source under src/ except tests, generated/ and this study's report.ts -----

export const codeFiles = (root = 'src'): string[] => {
  const out: string[] = [];
  const walk = (dir: string) => {
    for (const name of fs.readdirSync(dir).sort()) {
      const full = path.join(dir, name);

      if (fs.statSync(full).isDirectory()) {
        if (name !== 'tests' && name !== 'generated') {
          walk(full);
        }
      } else if (name.endsWith('.ts') && full !== reportFile) {
        out.push(full);
      }
    }
  };

  walk(root);

  return out;
};

export const codeManifest = () => {
  const files = Object.fromEntries(codeFiles().map((file) => [file, sha256(fs.readFileSync(file))]));

  return { digest: sha256(JSON.stringify(files)), files };
};

// The test files (not in the code manifest, so they can be extended freely) hashed as a separate, non-gating list: the
// design tests that DESIGN_DIFF.md rests on are thereby bound to the freeze.
export const testsManifest = () => {
  const files: Record<string, string> = {};
  const walk = (dir: string) => {
    for (const name of fs.readdirSync(dir).sort()) {
      const full = path.join(dir, name);

      if (fs.statSync(full).isDirectory()) {
        walk(full);
      } else if (name.endsWith('.ts')) {
        files[full] = sha256(fs.readFileSync(full));
      }
    }
  };

  walk('src/d1-diverse/tests');

  return { digest: sha256(JSON.stringify(files)), files };
};

// The protocol, context and code a record was produced under (stamped into every pre-freeze check record and verified
// by the freeze).
export const codeState = async () => ({
  protocol: await sha256File(protocolFile),
  context: await sha256File(contextFile),
  code: codeManifest().digest
});

// The hashes every sealed record carries.
export const provenance = async () => ({
  protocol: await sha256File(protocolFile),
  context: await sha256File(contextFile),
  universe: (await fs.pathExists(universeFile)) ? await sha256File(universeFile) : '',
  tier: (await fs.pathExists(tierFile)) ? await sha256File(tierFile) : '',
  schedule: (await fs.pathExists(scheduleFile)) ? await sha256File(scheduleFile) : '',
  code: codeManifest().digest,
  splits: await sha256File(splitsFile),
  ledger: await sha256File(ledgerFile),
  partitions: await sha256File(partitionsFile),
  node: process.version,
  gitHead: gitState().head
});

// ----- the design commitment (M0) -----

export interface DesignCommitment {
  bodyHash: string;
  version: string;
  protocolSha256: string;
  contextSha256: string;
  code: { digest: string; files: Record<string, string> };
  briefs: Record<string, string>;
  scheduleSha256: string; // the stage-A schedule over the expected eligible universe
  committedAt: string;
  note: string;
  git: ReturnType<typeof gitState>;
}

export const commitDesign = async (scheduleSha256: string): Promise<DesignCommitment> => {
  const briefs: Record<string, string> = {};

  for (const file of [...briefFiles, path.join(researchRoot, 'brief', 'BRIEF_REMAINDER.md')]) {
    if (await fs.pathExists(file)) {
      briefs[file] = await sha256File(file);
    }
  }

  const record = (await writeSealed(designCommitmentFile, {
    version: study.version,
    protocolSha256: await sha256File(protocolFile),
    contextSha256: await sha256File(contextFile),
    code: codeManifest(),
    briefs,
    scheduleSha256,
    committedAt: nowIso(),
    note:
      'The complete algorithmic design (rules, streams, quotas, family method, objectives, gates, budgets, fallback, ' +
      'controls, labels, cutoffs, ties) before any market P&L, neighbourhood or validation figure of this study.',
    git: gitState()
  })) as unknown as DesignCommitment;

  log(
    `design committed at ${record.committedAt}: protocol ${record.protocolSha256.slice(0, 16)}, code ${record.code.digest.slice(0, 16)}`
  );

  return record;
};

// ----- reviewed technical changes after the commitment and before any outcome (hash chain) -----

export interface ChangeRecord {
  number: number;
  at: string;
  change: string;
  reason: string;
  review: string; // the independent review finding it answers
  outputsAbsent: string[]; // stage outputs that must not exist (no outcome exposed)
  codeFiles: Record<string, string>; // the code manifest after the change
  protocolBefore: string;
  protocolAfter: string;
  contextBefore: string;
  contextAfter: string;
  codeBefore: string;
  codeAfter: string;
  previousHash: string;
  hash: string;
}

// A hash chain anchored to a sealed record: the first item's previousHash is the anchor's body hash.
const readChain = async <T extends { previousHash: string; hash: string; number: number }>(
  file: string,
  anchor: string
): Promise<T[]> => {
  if (!(await fs.pathExists(file))) {
    return [];
  }

  const items = (await fs.readFile(file, 'utf8'))
    .split('\n')
    .filter(Boolean)
    .map((line) => JSON.parse(line) as T);
  let previous = anchor;

  for (const item of items) {
    const { hash, ...body } = item;

    if (item.previousHash !== previous || hashBody(body) !== hash) {
      throw new Error(`${file}: record ${item.number} breaks the hash chain`);
    }

    previous = hash;
  }

  return items;
};

export const readChanges = async () =>
  readChain<ChangeRecord>(
    changesFile,
    ((await readSealed(designCommitmentFile)) as unknown as DesignCommitment).bodyHash
  );

// The committed head: the latest change's after-hashes, else the commitment's.
export const committedHead = async () => {
  const commitment = (await readSealed(designCommitmentFile)) as unknown as DesignCommitment;
  const changes = await readChanges();
  const last = changes.at(-1);

  return {
    commitment,
    changes,
    protocol: last?.protocolAfter ?? commitment.protocolSha256,
    context: last?.contextAfter ?? commitment.contextSha256,
    code: last?.codeAfter ?? commitment.code.digest
  };
};

export const appendChange = async (entry: Pick<ChangeRecord, 'change' | 'reason' | 'review' | 'outputsAbsent'>) => {
  if (await fs.pathExists(protocolFreezeFile)) {
    throw new Error('The protocol is frozen: later fixes are amendments (`amend`)');
  }

  if (!entry.review.trim() || entry.outputsAbsent.length === 0) {
    throw new Error('A change needs the review it answers and the stage outputs that must not exist yet');
  }

  for (const output of entry.outputsAbsent) {
    if (await fs.pathExists(output)) {
      throw new Error(`refused: ${output} exists — a change must precede every outcome it could affect`);
    }
  }

  const head = await committedHead();
  const manifest = codeManifest();
  const body = {
    number: head.changes.length + 1,
    at: nowIso(),
    ...entry,
    codeFiles: manifest.files,
    protocolBefore: head.protocol,
    protocolAfter: await sha256File(protocolFile),
    contextBefore: head.context,
    contextAfter: await sha256File(contextFile),
    codeBefore: head.code,
    codeAfter: manifest.digest,
    previousHash: head.changes.at(-1)?.hash ?? head.commitment.bodyHash
  };
  const record: ChangeRecord = { ...body, hash: hashBody(body) };

  await fs.appendFile(changesFile, `${JSON.stringify(record)}\n`);

  return record;
};

const differences = (files: Record<string, string>, against: Record<string, string>) => [
  ...Object.entries(files)
    .filter(([file, sha]) => against[file] !== sha)
    .map(([file]) => file),
  ...Object.keys(against).filter((file) => !(file in files))
];

// Every pre-freeze stage (audit, benchmark, reproduction, parity) calls this: the files must equal the committed head,
// and the protocol must not be frozen yet (their records are bound by the freeze and never rewritten after it).
export const requireCommitted = async () => {
  if (await fs.pathExists(protocolFreezeFile)) {
    throw new Error(`${protocolFreezeFile} exists: the pre-freeze checks are bound by the freeze and never re-run`);
  }

  if (!(await fs.pathExists(designCommitmentFile))) {
    throw new Error('The design is not committed: run `npm run diverse-d1 -- commit-design` first');
  }

  const head = await committedHead();
  const current = {
    protocol: await sha256File(protocolFile),
    context: await sha256File(contextFile),
    code: codeManifest()
  };

  if (current.protocol !== head.protocol || current.context !== head.context || current.code.digest !== head.code) {
    throw new Error(
      `The protocol, context or code differs from the committed head without a recorded change (${differences(current.code.files, head.commitment.code.files).slice(0, 8).join(', ') || 'protocol/context'})`
    );
  }

  return head;
};

// ----- the protocol freeze (M1) -----

export interface ProtocolFreeze {
  bodyHash: string;
  version: string;
  protocolSha256: string;
  contextSha256: string;
  universeSha256: string;
  tierSha256: string;
  scheduleSha256: string;
  splitsSha256: string;
  ledgerSha256: string;
  partitionsSha256: string;
  code: { digest: string; files: Record<string, string> };
  commitment: { bodyHash: string; committedAt: string };
  changes: { count: number; head: string };
  checks: Record<string, string>; // universe, tier, reproduction, parity, legacy-check record hashes
  tests: { digest: string; files: Record<string, string> }; // non-gating
  frozenAt: string;
  node: string;
  git: ReturnType<typeof gitState>;
}

export const freezeProtocol = async (checks: Record<string, string>): Promise<ProtocolFreeze> => {
  if (await fs.pathExists(protocolFreezeFile)) {
    throw new Error(`${protocolFreezeFile} exists: the protocol is frozen once; later fixes are amendments`);
  }

  const head = await requireCommitted();

  const state = await codeState();

  for (const file of [universeFile, tierFile, scheduleFile, ...Object.keys(checks)]) {
    if (!(await fs.pathExists(file))) {
      throw new Error(`${file} is missing: the freeze binds it`);
    }
  }

  // Every check record must have been produced under exactly the code, protocol and context being frozen.
  for (const file of [universeFile, tierFile, ...Object.keys(checks)]) {
    const stamp = (await readJson<{ codeState?: { protocol: string; context: string; code: string } }>(file)).codeState;

    if (!stamp || stamp.protocol !== state.protocol || stamp.context !== state.context || stamp.code !== state.code) {
      throw new Error(`${file} was not produced under the code being frozen: re-run it under the current head`);
    }
  }

  const schedule = await readJson<{ sha256: string }>(scheduleFile);

  if (schedule.sha256 !== head.commitment.scheduleSha256) {
    throw new Error(
      `The schedule ${schedule.sha256.slice(0, 12)} differs from the committed ${head.commitment.scheduleSha256.slice(0, 12)}`
    );
  }

  const freeze = (await writeSealed(protocolFreezeFile, {
    version: study.version,
    protocolSha256: await sha256File(protocolFile),
    contextSha256: await sha256File(contextFile),
    universeSha256: await sha256File(universeFile),
    tierSha256: await sha256File(tierFile),
    scheduleSha256: await sha256File(scheduleFile),
    splitsSha256: await sha256File(splitsFile),
    ledgerSha256: await sha256File(ledgerFile),
    partitionsSha256: await sha256File(partitionsFile),
    code: codeManifest(),
    commitment: { bodyHash: head.commitment.bodyHash, committedAt: head.commitment.committedAt },
    changes: { count: head.changes.length, head: head.changes.at(-1)?.hash ?? '' },
    checks: Object.fromEntries(
      await Promise.all(
        [universeFile, tierFile, ...Object.keys(checks)].map(async (file) => [file, await sha256File(file)])
      )
    ),
    tests: testsManifest(),
    frozenAt: nowIso(),
    node: process.version,
    git: gitState()
  })) as unknown as ProtocolFreeze;

  log(
    `protocol frozen at ${freeze.frozenAt}: protocol ${freeze.protocolSha256.slice(0, 16)}, code ${freeze.code.digest.slice(0, 16)}`
  );

  return freeze;
};

// ----- amendments after the freeze -----

export interface Amendment {
  number: number;
  at: string;
  stage: string;
  change: string;
  technicalReason: string;
  review: string;
  stageOutputsAbsent: string[];
  codeFiles: Record<string, string>;
  protocolBefore: string;
  protocolAfter: string;
  contextBefore: string;
  contextAfter: string;
  codeBefore: string;
  codeAfter: string;
  previousHash: string;
  hash: string;
}

export const readAmendments = async () =>
  readChain<Amendment>(amendmentsFile, ((await readSealed(protocolFreezeFile)) as unknown as ProtocolFreeze).bodyHash);

// After the first fold validation is sealed, an amendment may change neither the protocol, the context nor any source
// file except the mechanics of the selection freeze's reporting batch and the historical check (final.ts) and the
// command plumbing (cli.ts, stages.ts): no rule that could select anything can change once an outcome is visible.
export const postValidationAmendable = ['src/d1-diverse/final.ts', 'src/d1-diverse/cli.ts', 'src/d1-diverse/stages.ts'];

const frozenHead = (freeze: ProtocolFreeze, amendments: Amendment[]) => {
  const last = amendments.at(-1);

  return last
    ? { protocol: last.protocolAfter, context: last.contextAfter, code: last.codeAfter }
    : { protocol: freeze.protocolSha256, context: freeze.contextSha256, code: freeze.code.digest };
};

export const appendAmendment = async (
  entry: Pick<Amendment, 'stage' | 'change' | 'technicalReason' | 'review' | 'stageOutputsAbsent'>
) => {
  const freeze = (await readSealed(protocolFreezeFile)) as unknown as ProtocolFreeze;
  const existing = await readAmendments();
  const head = frozenHead(freeze, existing);

  if (entry.stageOutputsAbsent.length === 0 || !entry.review.trim()) {
    throw new Error('An amendment must name its review and the affected stage outputs that do not exist yet');
  }

  const validated = (
    await Promise.all(
      ['fold-a', 'fold-b'].map((fold) =>
        fs.pathExists(path.join(researchRoot, 'results', 'walkforward', fold, 'validation.json'))
      )
    )
  ).some(Boolean);

  if (validated) {
    const previousFiles = existing.at(-1)?.codeFiles ?? freeze.code.files;
    const changed = differences(codeManifest().files, previousFiles);
    const forbidden = changed.filter((file) => !postValidationAmendable.includes(file));

    if (
      (await sha256File(protocolFile)) !== head.protocol ||
      (await sha256File(contextFile)) !== head.context ||
      forbidden.length > 0
    ) {
      throw new Error(
        `refused: a fold validation is sealed, so the protocol, context and ${forbidden.join(', ') || 'selection code'} can no longer change`
      );
    }
  }

  for (const output of entry.stageOutputsAbsent) {
    if (await fs.pathExists(output)) {
      throw new Error(`refused: ${output} exists — an amendment must precede the affected stage's first outcome`);
    }
  }

  const manifest = codeManifest();
  const body = {
    number: existing.length + 1,
    at: nowIso(),
    ...entry,
    codeFiles: manifest.files,
    protocolBefore: head.protocol,
    protocolAfter: await sha256File(protocolFile),
    contextBefore: head.context,
    contextAfter: await sha256File(contextFile),
    codeBefore: head.code,
    codeAfter: manifest.digest,
    previousHash: existing.at(-1)?.hash ?? freeze.bodyHash
  };
  const amendment: Amendment = { ...body, hash: hashBody(body) };

  await fs.appendFile(amendmentsFile, `${JSON.stringify(amendment)}\n`);

  return amendment;
};

// Every outcome-producing stage calls this first.
export const requireFrozen = async () => {
  if (!(await fs.pathExists(protocolFreezeFile))) {
    throw new Error('The protocol is not frozen: run `npm run diverse-d1 -- freeze-protocol` first');
  }

  const freeze = (await readSealed(protocolFreezeFile)) as unknown as ProtocolFreeze;

  for (const [file, expected] of [
    [universeFile, freeze.universeSha256],
    [tierFile, freeze.tierSha256],
    [scheduleFile, freeze.scheduleSha256],
    [splitsFile, freeze.splitsSha256],
    [ledgerFile, freeze.ledgerSha256],
    [partitionsFile, freeze.partitionsSha256]
  ] as const) {
    if ((await sha256File(file)) !== expected) {
      throw new Error(`${file} changed after the freeze`);
    }
  }

  for (const [file, expected] of Object.entries(freeze.checks)) {
    if ((await sha256File(file)) !== expected) {
      throw new Error(`${file} (a check record bound by the freeze) changed after the freeze`);
    }
  }

  const amendments = await readAmendments();
  const head = frozenHead(freeze, amendments);
  const current = {
    protocol: await sha256File(protocolFile),
    context: await sha256File(contextFile),
    code: codeManifest()
  };

  if (current.protocol !== head.protocol || current.context !== head.context || current.code.digest !== head.code) {
    throw new Error(
      `The protocol, context or code differs from the frozen head without an amendment (${differences(current.code.files, freeze.code.files).slice(0, 8).join(', ') || 'protocol/context'})`
    );
  }

  if (amendments.length > 0) {
    log(`NOTE: ${amendments.length} amendment(s) after the freeze; head = amendment ${amendments.at(-1)!.number}`);
  }

  return { freeze, amendments, protocol: current.protocol, context: current.context, code: current.code.digest };
};
