// The protocol freeze (PROTOCOL.md §11): PROTOCOL_FREEZE.json fixes the sha256 of the protocol, the brief, the
// shortlist, the census and parity records and every outcome-defining source file, written once after the
// independent methodology review and before any candidate robustness run. Later changes are amendments (appended to
// the freeze's `amendments`, each with its reason, time, review note and the new hashes); a file bound by the freeze
// must hash to its frozen value or to its latest amendment. Every Stage 3–4 command refuses to run otherwise.
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs from 'fs-extra';
import {
  briefFile,
  codeRoot,
  log,
  nowIso,
  protocolFile,
  protocolFreezeFile,
  readJson,
  resultDir,
  researchRoot,
  shortlistFile
} from './context.ts';

export const boundFiles = () => [
  protocolFile,
  briefFile,
  shortlistFile,
  `${researchRoot}/SHORTLIST_RULES_AND_CANDIDATES.md`,
  resultDir('inventory', 'census.json'),
  resultDir('parity', 'PARITY_SAMPLE.json'),
  resultDir('parity', 'PARITY.json'),
  resultDir('shortlist', 'SHORTLIST-v1-superseded.json'),
  resultDir('benchmark', 'benchmark.json'),
  resultDir('catalog', 'catalog.json'),
  resultDir('catalog', 'catalog-v1-superseded.json'),
  resultDir('designs', 'designs.json'),
  `${researchRoot}/reviews/methodology-review.md`,
  `${researchRoot}/reviews/METHODOLOGY_DISPOSITIONS.md`,
  `${researchRoot}/reviews/confirmatory-review.md`,
  ...[
    'context.ts',
    'inventory.ts',
    'census.ts',
    'data.ts',
    'run.ts',
    'specs.ts',
    'events.ts',
    'shortlist.ts',
    'store.ts',
    'worker.ts',
    'pool.ts',
    'batch.ts',
    'parity.ts',
    'freeze.ts',
    'standing.ts',
    'analysis.ts',
    'catalogs.ts',
    'tests/rules.test.ts',
    'tests/standing.test.ts'
  ].map((name) => `${codeRoot}/${name}`)
];

const sha256 = async (file: string) =>
  createHash('sha256')
    .update(await fs.readFile(file))
    .digest('hex');

export interface Amendment {
  id: string;
  at: string;
  stage: string;
  reason: string;
  review: string;
  files: Record<string, string>;
}

export interface Freeze {
  schema: 'd1-standalone-opportunity-protocol-freeze';
  frozenAt: string;
  node: string;
  files: Record<string, string>;
  amendments: Amendment[];
}

export const freezeProtocol = async () => {
  if (await fs.pathExists(protocolFreezeFile)) {
    throw new Error(`${protocolFreezeFile} exists: the protocol is frozen once`);
  }

  const files: Record<string, string> = {};

  for (const file of boundFiles()) {
    if (!(await fs.pathExists(file))) {
      throw new Error(`cannot freeze: ${file} does not exist`);
    }

    files[file] = await sha256(file);
  }

  const freeze: Freeze = {
    schema: 'd1-standalone-opportunity-protocol-freeze',
    frozenAt: nowIso(),
    node: process.version,
    files,
    amendments: []
  };

  await fs.writeFile(protocolFreezeFile, `${JSON.stringify(freeze, null, 1)}\n`);
  log(`protocol frozen: ${Object.keys(files).length} files → ${protocolFreezeFile}`);

  return freeze;
};

// The hash a bound file must have now: its latest amendment's, else the frozen one.
export const expectedHashes = (freeze: Freeze) => {
  const expected = { ...freeze.files };

  for (const amendment of freeze.amendments) {
    Object.assign(expected, amendment.files);
  }

  return expected;
};

export const verifyFreeze = async () => {
  if (!(await fs.pathExists(protocolFreezeFile))) {
    throw new Error(`${protocolFreezeFile} does not exist: no Stage 3–4 command runs before the protocol freeze`);
  }

  const freeze = await readJson<Freeze>(protocolFreezeFile);
  const problems: string[] = [];

  for (const [file, hash] of Object.entries(expectedHashes(freeze))) {
    if (!(await fs.pathExists(file))) {
      problems.push(`${file} is missing`);
    } else if ((await sha256(file)) !== hash) {
      problems.push(`${file} differs from its frozen (or latest amended) hash ${hash.slice(0, 12)}`);
    }
  }

  return { freeze, problems };
};

// Isolation (PROTOCOL.md §11): no tracked file outside this study's two folders may differ from the baseline HEAD
// except package.json (one script), and no untracked file may exist outside them — so the imported engine, runner,
// loaders and helpers are byte-for-byte the frozen repository's.
export const isolationProblems = async () => {
  const head = (await fs.readFile(resultDir('baseline', 'head.txt'), 'utf8')).trim();
  const outside = ['--', '.', `:!${researchRoot}`, `:!${codeRoot}`];
  const changed = execFileSync('git', ['diff', '--name-only', head, ...outside], { encoding: 'utf8' })
    .split('\n')
    .filter(Boolean)
    .filter((file) => file !== 'package.json');
  const untracked = execFileSync('git', ['ls-files', '--others', '--exclude-standard', ...outside], {
    encoding: 'utf8'
  })
    .split('\n')
    .filter(Boolean);
  const scriptLines = execFileSync('git', ['diff', head, '--', 'package.json'], { encoding: 'utf8' })
    .split('\n')
    .filter((line) => /^[+-][^+-]/.test(line));
  const problems = [
    ...changed.map((file) => `${file} differs from ${head.slice(0, 8)}`),
    ...untracked.map((file) => `${file} is untracked outside the study`)
  ];

  if (
    scriptLines.filter((line) => line.startsWith('+') && line.includes('standalone-opportunity-audit')).length !== 1 ||
    scriptLines.length > 3
  ) {
    problems.push(`package.json changed beyond the one study script (${scriptLines.length} lines)`);
  }

  return problems;
};

export const requireFrozen = async () => {
  const { freeze, problems } = await verifyFreeze();
  const isolation = await isolationProblems();

  if (problems.length > 0 || isolation.length > 0) {
    throw new Error(`the protocol freeze or isolation does not verify:\n  ${[...problems, ...isolation].join('\n  ')}`);
  }

  return freeze;
};

export const amend = async (fields: { stage: string; reason: string; review: string; files: string[] }) => {
  const freeze = await readJson<Freeze>(protocolFreezeFile);
  const files: Record<string, string> = {};

  for (const file of fields.files) {
    files[file] = await sha256(file);
  }

  const amendment: Amendment = {
    id: `A${freeze.amendments.length + 1}`,
    at: nowIso(),
    stage: fields.stage,
    reason: fields.reason,
    review: fields.review,
    files
  };

  freeze.amendments.push(amendment);
  await fs.writeFile(protocolFreezeFile, `${JSON.stringify(freeze, null, 1)}\n`);
  log(`amendment ${amendment.id} recorded (${Object.keys(files).length} files)`);

  return amendment;
};
