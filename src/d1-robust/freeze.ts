// The study's write-once records (PROTOCOL.md §15, §20, §24): the pre-ingestion commitment of the protocol text, the
// protocol freeze (protocol + context + universe + tier), the append-only amendment log, and generic write-once JSON
// records with a body hash (pilot freezes, PICKS.json, GWF.json, FROZEN_SELECTION.json). Each refuses to be written
// twice and is verified by its hash before anything that depends on it reads it.
import { createHash } from 'node:crypto';
import path from 'node:path';
import fs from 'fs-extra';
import { gitState, sha256, sha256File } from '../portfolio-aware-d1/freeze.ts';
import {
  amendmentsFile,
  contextFile,
  draftCommitmentFile,
  jsonReplacer,
  log,
  nowIso,
  protocolFile,
  protocolFreezeFile,
  readJson,
  study,
  tierFile,
  universeFile,
  writeJson
} from './context.ts';

export { gitState, sha256, sha256File };

export const hashBody = (body: Record<string, unknown>) => sha256(JSON.stringify(body));

// ----- write-once records with a body hash -----

export interface Sealed {
  bodyHash: string;
  [key: string]: unknown;
}

export const writeSealed = async (file: string, body: Record<string, unknown>): Promise<Sealed> => {
  if (await fs.pathExists(file)) {
    throw new Error(`${file} exists: it is written once and never rewritten`);
  }

  // The hash is of the JSON-safe body (NaN → null, ±Infinity → strings), exactly as it is written and read back.
  const safe = JSON.parse(JSON.stringify(body, jsonReplacer)) as Record<string, unknown>;
  const sealed = { ...safe, bodyHash: hashBody(safe) };

  await writeJson(file, sealed);

  return sealed as Sealed;
};

export const readSealed = async <T extends Sealed = Sealed>(file: string): Promise<T> => {
  if (!(await fs.pathExists(file))) {
    throw new Error(`${file} does not exist`);
  }

  const sealed = await readJson<T>(file);
  const { bodyHash, ...body } = sealed;

  if (hashBody(body) !== bodyHash) {
    throw new Error(`${file}: the body hash does not verify; the record was changed after it was written`);
  }

  return sealed;
};

// ----- the pre-ingestion commitment (§20 M0) -----

export interface DraftCommitment {
  protocolSha256: string;
  contextSha256: string;
  committedAt: string;
  note: string;
  git: ReturnType<typeof gitState>;
}

export const commitDraft = async (file: string = draftCommitmentFile): Promise<DraftCommitment> => {
  if (await fs.pathExists(file)) {
    throw new Error(`${file} exists: the pre-ingestion commitment is written once`);
  }

  const record: DraftCommitment = {
    protocolSha256: await sha256File(protocolFile),
    contextSha256: await sha256File(contextFile),
    committedAt: nowIso(),
    note: 'the complete protocol text before any new symbol was downloaded; the freeze records every later change',
    git: gitState()
  };

  await writeJson(file, record);
  log(`pre-ingestion commitment at ${record.committedAt}: protocol ${record.protocolSha256.slice(0, 16)}`);

  return record;
};

// ----- amendments (§24) -----

// ----- the code manifest (§18): every source file the study's outcomes depend on -----

// Every TypeScript source under src/ except tests and the report writer: the study's modules, the reused engines,
// strategy, ledgers and helpers of the earlier studies, and the shared libraries.
export const codeFiles = (root = 'src'): string[] => {
  const out: string[] = [];
  const walk = (dir: string) => {
    for (const name of fs.readdirSync(dir).sort()) {
      const full = path.join(dir, name);

      if (fs.statSync(full).isDirectory()) {
        if (name !== 'tests' && name !== 'generated') {
          walk(full);
        }
      } else if (name.endsWith('.ts') && full !== path.join(root, 'd1-robust', 'report.ts')) {
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

export const splitsFile = 'config/market-events/splits.json';
export const ledgerFile = 'config/market-events/distributions.csv';
export const partitionsFile = 'data/partitions.json';

// The hashes every sealed record carries (§18).
export const provenance = async () => ({
  protocol: await sha256File(protocolFile),
  context: await sha256File(contextFile),
  universe: (await fs.pathExists(universeFile)) ? await sha256File(universeFile) : '',
  tier: (await fs.pathExists(tierFile)) ? await sha256File(tierFile) : '',
  code: codeManifest().digest,
  splits: await sha256File(splitsFile),
  ledger: await sha256File(ledgerFile),
  partitions: await sha256File(partitionsFile),
  node: process.version,
  gitHead: gitState().head
});

// ----- amendments (§24) -----

export interface Amendment {
  number: number;
  at: string;
  stage: string;
  change: string;
  technicalReason: string;
  stageOutputsAbsent: string[]; // outputs of the affected stage, checked absent when the amendment was recorded
  postOutcome?: { outputsPresent: string[]; justification: string }; // an amendment recorded AFTER the affected stage produced outputs (disclosed, never silent)
  protocolBefore: string;
  protocolAfter: string;
  contextBefore: string;
  contextAfter: string;
  codeBefore: string;
  codeAfter: string;
  previousHash: string; // hash chain over the log
  hash: string;
}

export const readAmendments = async (file: string = amendmentsFile): Promise<Amendment[]> => {
  if (!(await fs.pathExists(file))) {
    return [];
  }

  const amendments = (await fs.readFile(file, 'utf8'))
    .split('\n')
    .filter(Boolean)
    .map((line) => JSON.parse(line) as Amendment);
  let previous = '';

  for (const amendment of amendments) {
    const { hash, ...body } = amendment;

    if (amendment.previousHash !== previous || hashBody(body) !== hash) {
      throw new Error(`${file}: amendment ${amendment.number} breaks the hash chain`);
    }

    previous = hash;
  }

  return amendments;
};

// The current head: the latest amendment's after-hashes, else the freeze's.
const headOf = (
  freeze: { protocolSha256: string; contextSha256: string; code: { digest: string } },
  amendments: Amendment[]
) => {
  const last = amendments.at(-1);

  return last
    ? { protocol: last.protocolAfter, context: last.contextAfter, code: last.codeAfter }
    : { protocol: freeze.protocolSha256, context: freeze.contextSha256, code: freeze.code.digest };
};

// Records a technical amendment after the freeze: its 'before' hashes must be the current head, and none of the
// affected stage's outputs may exist yet.
export const appendAmendment = async (
  entry: Pick<Amendment, 'stage' | 'change' | 'technicalReason' | 'stageOutputsAbsent' | 'postOutcome'>,
  file: string = amendmentsFile,
  freezeFile: string = protocolFreezeFile
) => {
  const freeze = (await readSealed(freezeFile)) as unknown as ProtocolFreeze;
  const existing = await readAmendments(file);
  const head = headOf(freeze, existing);

  for (const output of entry.stageOutputsAbsent) {
    if (await fs.pathExists(output)) {
      throw new Error(`refused: ${output} exists — an amendment must precede the affected stage's first outcome`);
    }
  }

  const body = {
    number: existing.length + 1,
    at: nowIso(),
    ...entry,
    protocolBefore: head.protocol,
    protocolAfter: await sha256File(protocolFile),
    contextBefore: head.context,
    contextAfter: await sha256File(contextFile),
    codeBefore: head.code,
    codeAfter: codeManifest().digest,
    previousHash: existing.at(-1)?.hash ?? ''
  };
  const amendment: Amendment = { ...body, hash: hashBody(body) };

  await fs.appendFile(file, `${JSON.stringify(amendment)}\n`);

  return amendment;
};

// ----- the protocol freeze (§20 M1) -----

export interface ProtocolFreeze extends Sealed {
  version: string;
  protocolSha256: string;
  contextSha256: string;
  universeSha256: string;
  tierSha256: string;
  splitsSha256: string;
  ledgerSha256: string;
  partitionsSha256: string;
  code: { digest: string; files: Record<string, string> };
  draftCommitment: { protocolSha256: string; contextSha256: string; committedAt: string; protocolChanged: boolean };
  changesSinceCommitment: string[];
  frozenAt: string;
  node: string;
  git: ReturnType<typeof gitState>;
}

export const freezeProtocol = async (changesSinceCommitment: string[] = []): Promise<ProtocolFreeze> => {
  if (await fs.pathExists(protocolFreezeFile)) {
    throw new Error(`${protocolFreezeFile} exists: the protocol is frozen once; amendments go in PROTOCOL.md §24`);
  }

  for (const file of [draftCommitmentFile, universeFile, tierFile]) {
    if (!(await fs.pathExists(file))) {
      throw new Error(`${file} is missing: the freeze binds the commitment, the universe and the tier`);
    }
  }

  const draft = await readJson<DraftCommitment>(draftCommitmentFile);
  const protocolSha256 = await sha256File(protocolFile);
  const contextSha256 = await sha256File(contextFile);
  const changed = protocolSha256 !== draft.protocolSha256 || contextSha256 !== draft.contextSha256;

  if (changed && changesSinceCommitment.length === 0) {
    throw new Error('The protocol or context changed since the pre-ingestion commitment: list every change');
  }

  const freeze = (await writeSealed(protocolFreezeFile, {
    version: study.version,
    protocolSha256,
    contextSha256,
    universeSha256: await sha256File(universeFile),
    tierSha256: await sha256File(tierFile),
    splitsSha256: await sha256File(splitsFile),
    ledgerSha256: await sha256File(ledgerFile),
    partitionsSha256: await sha256File(partitionsFile),
    code: codeManifest(),
    draftCommitment: {
      protocolSha256: draft.protocolSha256,
      contextSha256: draft.contextSha256,
      committedAt: draft.committedAt,
      protocolChanged: protocolSha256 !== draft.protocolSha256
    },
    changesSinceCommitment,
    frozenAt: nowIso(),
    node: process.version,
    git: gitState()
  })) as unknown as ProtocolFreeze;

  log(
    `protocol frozen at ${freeze.frozenAt}: protocol ${protocolSha256.slice(0, 16)}, code ${freeze.code.digest.slice(0, 16)}`
  );

  return freeze;
};

// Every outcome-producing stage calls this first: the sealed freeze must verify; the universe, tier, split registry,
// distribution ledger and partitions must be unchanged; a changed protocol, context or code is allowed only when the
// hash-chained amendment log's head equals the current files (reported, never silent).
export const requireProtocolFrozen = async () => {
  if (!(await fs.pathExists(protocolFreezeFile))) {
    throw new Error('The protocol is not frozen: run `npm run robust-d1 -- freeze-protocol` first');
  }

  const freeze = (await readSealed(protocolFreezeFile)) as unknown as ProtocolFreeze;

  for (const [file, expected] of [
    [universeFile, freeze.universeSha256],
    [tierFile, freeze.tierSha256],
    [splitsFile, freeze.splitsSha256],
    [ledgerFile, freeze.ledgerSha256],
    [partitionsFile, freeze.partitionsSha256]
  ] as const) {
    if ((await sha256File(file)) !== expected) {
      throw new Error(`${file} changed after the freeze`);
    }
  }

  const amendments = await readAmendments();
  const head = headOf(freeze, amendments);
  const current = {
    protocol: await sha256File(protocolFile),
    context: await sha256File(contextFile),
    code: codeManifest()
  };

  if (current.protocol !== head.protocol || current.context !== head.context || current.code.digest !== head.code) {
    const changed = Object.entries(current.code.files)
      .filter(([file, sha]) => freeze.code.files[file] !== sha)
      .map(([file]) => file);
    const removed = Object.keys(freeze.code.files).filter((file) => !(file in current.code.files));

    throw new Error(
      `The protocol, context or code differs from the frozen head without an amendment (changed: ${[...changed, ...removed].slice(0, 8).join(', ') || 'protocol/context'})`
    );
  }

  if (amendments.length > 0) {
    log(`NOTE: ${amendments.length} amendment(s) after the freeze; head = amendment ${amendments.at(-1)!.number}`);
  }

  return { freeze, amendments, protocol: current.protocol, context: current.context, code: current.code.digest };
};

export const contentHash = (value: unknown) =>
  createHash('sha256').update(JSON.stringify(value, jsonReplacer)).digest('hex');
