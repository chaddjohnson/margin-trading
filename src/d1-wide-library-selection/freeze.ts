// The study's freezes (PROTOCOL.md §11):
//
//   PROTOCOL_FREEZE.json   written once after the methodology review: the sha256 of the protocol, the rules, the
//                          matrix, the brief, the review and its dispositions, the pre-freeze records, the baseline
//                          manifests and every outcome-defining study source file;
//   results/CODE_FREEZE.json written once right after it and before any post-freeze data stage: every study source and
//                          test file;
//   results/amendments.jsonl technical or reporting amendments, hash-chained, each with the files it re-hashes.
//
// Every post-freeze data stage calls requireCodeFrozen(): both freezes verify against the files on disk (taking the
// latest amendment's hash where a file was amended), Node is v24.21.0, no test override is set; the returned guard
// (protocol body, code body, outcome-code digest) is stamped into the stage record, and `verify` checks it.
import path from 'node:path';
import fs from 'fs-extra';
import {
  codeRoot,
  nowIso,
  protocolFreezeFile,
  researchRoot,
  resultFile,
  study,
  testData,
  testRoot
} from './context.ts';
import { environment, readSealed, sha256File, sha256Text, writeRecord } from './records.ts';

export const codeFreezeFile = resultFile('CODE_FREEZE.json');
export const amendmentsFile = resultFile('amendments.jsonl');

const listFiles = async (dir: string, predicate: (file: string) => boolean): Promise<string[]> => {
  if (!(await fs.pathExists(dir))) {
    return [];
  }

  const out: string[] = [];

  for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      out.push(...(await listFiles(full, predicate)));
    } else if (predicate(full)) {
      out.push(full);
    }
  }

  return out.sort();
};

export const sourceFiles = (includeTests = false) =>
  listFiles(
    codeRoot,
    (file) => file.endsWith('.ts') && (includeTests || !file.includes(`${path.sep}tests${path.sep}`))
  );

export const protocolBoundFiles = async () => [
  path.join(researchRoot, 'PROTOCOL.md'),
  path.join(researchRoot, 'LIBRARY_SELECTION_RULES.md'),
  path.join(researchRoot, 'EXPERIMENT_MATRIX.json'),
  path.join(researchRoot, 'brief', 'BRIEF.md'),
  path.join(researchRoot, 'reviews', 'methodology-review.md'),
  path.join(researchRoot, 'reviews', 'METHODOLOGY_DISPOSITIONS.md'),
  path.join(researchRoot, 'reviews', 'confirmatory-review.md'),
  path.join(researchRoot, 'reviews', 'CONFIRMATORY_DISPOSITIONS.md'),
  ...(await listFiles(path.join(researchRoot, 'reviews', 'superseded'), () => true)),
  ...(await listFiles(resultFile('dryrun-S18-prefreeze'), () => true)),
  resultFile('archive', 'fold-a', 'candidates.jsonl.gz'),
  resultFile('archive', 'INVENTORY.json'),
  resultFile('archive', 'fold-a', 'RECONSTRUCTION.json'),
  resultFile('archive', 'fold-a', 'CENSUS-prefreeze-v1.json'),
  resultFile('archive', 'NEW_SOBOL_COLLISIONS_PREFREEZE.json'),
  resultFile('parity', 'ANCHORS.json'),
  resultFile('parity', 'ANCHORS-v1-superseded.json'),
  ...(await listFiles(resultFile('baseline'), () => true)),
  // outcome-defining sources only; the CLI and the entry point are bound later by the code freeze
  ...(await sourceFiles(false)).filter((file) => !file.endsWith('cli.ts') && !file.endsWith('main.ts')),
  'package.json'
];

export interface Amendment {
  index: number;
  createdAt: string;
  kind: 'technical' | 'reporting';
  stage: string;
  reason: string;
  review: string;
  files: Record<string, string>;
  outcomeDigest?: string; // technical amendments of outcome-defining code: the digest after the change
  supersedes?: string[]; // records this amendment supersedes
  unaffected?: string | null; // or why no sealed record is affected (e.g. a crash fix before the stage wrote its record)
  previous: string;
  hash: string;
}

export const readAmendments = async (): Promise<Amendment[]> => {
  if (!(await fs.pathExists(amendmentsFile))) {
    return [];
  }

  const lines = (await fs.readFile(amendmentsFile, 'utf8')).split('\n').filter((line) => line.length > 0);
  const amendments = lines.map((line) => JSON.parse(line) as Amendment);
  let previous = 'genesis';

  for (const amendment of amendments) {
    const { hash, ...body } = amendment;

    if (amendment.previous !== previous || sha256Text(JSON.stringify(body)) !== hash) {
      throw new Error(`${amendmentsFile}: amendment ${amendment.index} breaks the hash chain`);
    }

    previous = hash;
  }

  return amendments;
};

const expected = async (bound: Record<string, string>) => {
  const latest = { ...bound };

  for (const amendment of await readAmendments()) {
    Object.assign(latest, amendment.files);
  }

  return latest;
};

const verifyHashes = async (hashes: Record<string, string>) => {
  const problems: string[] = [];

  for (const [file, hash] of Object.entries(await expected(hashes))) {
    if (!(await fs.pathExists(file))) {
      problems.push(`${file} is missing`);
    } else if ((await sha256File(file)) !== hash) {
      problems.push(`${file} changed (expected ${hash.slice(0, 12)})`);
    }
  }

  return problems;
};

export const refuseOverrides = () => {
  if (testRoot || testData || process.env.D1_LIBRARY_STUDY_ROOT || process.env.D1_LIBRARY_STUDY_DATA) {
    throw new Error('a stage refuses the test overrides D1_LIBRARY_STUDY_ROOT / D1_LIBRARY_STUDY_DATA');
  }

  if (process.version !== study.node) {
    throw new Error(`Node ${study.node} is required (got ${process.version})`);
  }
};

export const freezeProtocol = async () => {
  refuseOverrides();

  if (await fs.pathExists(protocolFreezeFile)) {
    throw new Error(`${protocolFreezeFile} exists: the protocol is frozen once`);
  }

  const files: Record<string, string> = {};

  for (const file of await protocolBoundFiles()) {
    if (!(await fs.pathExists(file))) {
      throw new Error(`${file} must exist before the freeze`);
    }

    files[file] = await sha256File(file);
  }

  return writeRecord(protocolFreezeFile, { stage: 'protocol-freeze', frozenAt: nowIso(), files });
};

export const verifyProtocolFreeze = async () => {
  const freeze = await readSealed<{ bodyHash: string; files: Record<string, string> }>(protocolFreezeFile);
  // study source files may be amended only through the amendment chain or bound anew by the code freeze
  const codeFrozen = await fs.pathExists(codeFreezeFile);
  const hashes = Object.fromEntries(
    Object.entries(freeze.files).filter(([file]) => !(codeFrozen && file.startsWith(codeRoot)))
  );

  return { bodyHash: freeze.bodyHash, problems: await verifyHashes(hashes) };
};

export const requireFrozen = async () => {
  refuseOverrides();

  const { bodyHash, problems } = await verifyProtocolFreeze();

  if (problems.length > 0) {
    throw new Error(`the protocol freeze does not verify:\n  ${problems.join('\n  ')}`);
  }

  return { protocolBody: bodyHash, ...environment() };
};

export const freezeCode = async () => {
  await requireFrozen();

  if (await fs.pathExists(codeFreezeFile)) {
    throw new Error(`${codeFreezeFile} exists: the code is frozen once`);
  }

  const files: Record<string, string> = {};

  for (const file of await sourceFiles(true)) {
    files[file] = await sha256File(file);
  }

  return writeRecord(codeFreezeFile, {
    stage: 'code-freeze',
    frozenAt: nowIso(),
    files,
    outcomeDigest: await outcomeDigest()
  });
};

export const verifyCodeFreeze = async () => {
  const freeze = await readSealed<{ bodyHash: string; files: Record<string, string> }>(codeFreezeFile);
  const problems = await verifyHashes(freeze.files);
  const current = await sourceFiles(true);
  const amended = await expected({});
  const unbound = current.filter((file) => !(file in freeze.files) && !(file in amended));

  if (unbound.length > 0) {
    problems.push(`study source files not bound by the code freeze or an amendment: ${unbound.join(', ')}`);
  }

  return { bodyHash: freeze.bodyHash, problems };
};

// The outcome digest in force at a time: the latest technical amendment of outcome code created before it, else the
// code freeze's.
export const digestInForce = async (at: string) => {
  const code = await readSealed<{ bodyHash: string; outcomeDigest: string }>(codeFreezeFile);
  const amendment = (await readAmendments()).filter((a) => a.outcomeDigest && a.createdAt < at).at(-1);

  return { digest: amendment?.outcomeDigest ?? code.outcomeDigest, amendment: amendment?.index ?? null };
};

// The outcome-defining sources (report-only code — the CLI, views, tables, entry point — and the tests excluded): their
// digest is stamped into every stage record, so a record made under other outcome code is detectable.
export const isReportOnly = (file: string) =>
  /(cli|main|views|tables)\.ts$/.test(file) || file.includes(`${path.sep}tests${path.sep}`);

export const outcomeDigest = async () => {
  const files = (await sourceFiles(false)).filter((file) => !isReportOnly(file));
  const hashes: Record<string, string> = {};

  for (const file of files) {
    hashes[file] = await sha256File(file);
  }

  return sha256Text(JSON.stringify(hashes));
};

export const requireCodeFrozen = async () => {
  const guard = await requireFrozen();
  const { bodyHash, problems } = await verifyCodeFreeze();

  if (problems.length > 0) {
    throw new Error(`the code freeze does not verify:\n  ${problems.join('\n  ')}`);
  }

  const freeze = await readSealed<{ bodyHash: string; frozenAt: string; outcomeDigest: string }>(codeFreezeFile);
  const digest = await outcomeDigest();
  // a technical amendment of outcome code (e.g. a crash fix before a stage produced its record) records the new digest
  const amended = (await readAmendments()).filter((amendment) => amendment.outcomeDigest).at(-1);
  const expectedDigest = amended?.outcomeDigest ?? freeze.outcomeDigest;

  if (digest !== expectedDigest) {
    throw new Error('the outcome-defining code differs from the code freeze (and from the latest technical amendment)');
  }

  return {
    ...guard,
    codeBody: bodyHash,
    codeFrozenAt: freeze.frozenAt,
    outcomeDigest: digest,
    amendment: amended ? amended.index : null
  };
};

// The records made before the freeze (bound by it; they carry no freeze stamp). Every other record a stage consumes
// must carry the protocol body and code body of the freezes and start after the code freeze (PROTOCOL.md §11).
export const preFreezeRecords = () => [
  resultFile('archive', 'INVENTORY.json'),
  resultFile('archive', 'fold-a', 'RECONSTRUCTION.json'),
  resultFile('archive', 'fold-a', 'CENSUS-prefreeze-v1.json'),
  resultFile('archive', 'NEW_SOBOL_COLLISIONS_PREFREEZE.json'),
  resultFile('parity', 'ANCHORS.json'),
  resultFile('parity', 'ANCHORS-v1-superseded.json')
];

export const assertStamped = async (
  file: string,
  record: { guard?: { protocolBody?: string; codeBody?: string }; startedAt?: string }
) => {
  if (testRoot || preFreezeRecords().includes(file)) {
    return;
  }

  const protocol = await readSealed<{ bodyHash: string }>(protocolFreezeFile);
  const code = await readSealed<{ bodyHash: string; frozenAt: string }>(codeFreezeFile);

  if (record.guard?.protocolBody !== protocol.bodyHash || record.guard?.codeBody !== code.bodyHash) {
    throw new Error(`${file} was not made under this study's protocol and code freezes`);
  }

  if (!record.startedAt || record.startedAt <= code.frozenAt) {
    throw new Error(`${file} does not start after the code freeze`);
  }
};

// A sealed stage record, checked for its seal and its freeze stamps.
export const readStageRecord = async <T extends { bodyHash: string }>(file: string): Promise<T> => {
  const record = await readSealed<T & { guard?: { protocolBody?: string; codeBody?: string }; startedAt?: string }>(
    file
  );

  await assertStamped(file, record);

  return record;
};

export const amend = async (fields: {
  kind: Amendment['kind'];
  stage: string;
  reason: string;
  review: string;
  files: string[];
  supersedes?: string[];
  unaffected?: string;
}) => {
  await requireFrozen().catch(() => undefined); // an amendment may repair a freeze that no longer verifies
  refuseOverrides();

  const amendments = await readAmendments();
  const files: Record<string, string> = {};

  for (const file of fields.files) {
    files[file] = await sha256File(file);
  }

  const touchesOutcome = fields.files.some(
    (file) => file.startsWith(codeRoot) && file.endsWith('.ts') && !isReportOnly(file)
  );

  if (touchesOutcome && fields.kind !== 'technical') {
    throw new Error('a change of outcome-defining code is a technical amendment');
  }

  const anySelection = (await listFiles(resultFile('libraries'), (file) => file.endsWith('SELECTION.json'))).length > 0;

  if (touchesOutcome && anySelection && (fields.supersedes ?? []).length === 0 && !fields.unaffected) {
    throw new Error(
      'after a sealed selection, an outcome-code amendment names the records it supersedes or states why none is affected'
    );
  }

  const body = {
    index: amendments.length + 1,
    createdAt: nowIso(),
    kind: fields.kind,
    stage: fields.stage,
    reason: fields.reason,
    review: fields.review,
    files,
    ...(touchesOutcome
      ? {
          outcomeDigest: await outcomeDigest(),
          supersedes: fields.supersedes ?? [],
          unaffected: fields.unaffected ?? null
        }
      : {}),
    previous: amendments.at(-1)?.hash ?? 'genesis'
  };
  const amendment: Amendment = { ...body, hash: sha256Text(JSON.stringify(body)) };

  await fs.appendFile(amendmentsFile, `${JSON.stringify(amendment)}\n`);

  return amendment;
};
