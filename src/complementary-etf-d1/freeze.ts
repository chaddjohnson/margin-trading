// The study's freezes: the protocol, once, before any candidate figure (results/protocol_freeze.json); and the
// candidates, once, before any holdout, final or `all` figure of a candidate (FROZEN_CANDIDATES.json, written by
// stageB.ts). Both refuse to overwrite.
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs from 'fs-extra';
import {
  auditSymbols,
  candidates,
  frozenCandidatesFile,
  log,
  nowIso,
  protocolFile,
  protocolFreezeFile,
  readJson,
  stageDir,
  study,
  writeJson
} from './context.ts';

export const sha256 = (data: string | Buffer) => createHash('sha256').update(data).digest('hex');

export const sha256File = async (file: string) => sha256(await fs.readFile(file));

export const git = (...args: string[]) => {
  try {
    return execFileSync('git', args, { encoding: 'utf8' }).trim();
  } catch {
    return '';
  }
};

export interface ProtocolFreeze {
  protocolFile: string;
  protocolSha256: string;
  contextSha256: string;
  frozenAt: string;
  gitHead: string;
  gitDirty: boolean;
}

export const freezeProtocol = async (): Promise<ProtocolFreeze> => {
  if (await fs.pathExists(protocolFreezeFile)) {
    throw new Error(`${protocolFreezeFile} exists: the protocol is frozen; append amendments to PROTOCOL.md §9`);
  }

  const record: ProtocolFreeze = {
    protocolFile,
    protocolSha256: await sha256File(protocolFile),
    contextSha256: await sha256File('src/complementary-etf-d1/context.ts'),
    frozenAt: nowIso(),
    gitHead: git('rev-parse', 'HEAD'),
    gitDirty: git('status', '--porcelain').length > 0
  };

  await writeJson(protocolFreezeFile, record);
  log(`protocol frozen at ${record.frozenAt}: sha256 ${record.protocolSha256}`);

  return record;
};

// Every later stage requires the frozen protocol; a changed file must carry its amendment in §9.
export const requireProtocolFrozen = async () => {
  if (!(await fs.pathExists(protocolFreezeFile))) {
    throw new Error('Freeze the protocol first: npm run complementary-etf-d1 -- freeze-protocol');
  }

  const freeze = await readJson<ProtocolFreeze>(protocolFreezeFile);
  const current = await sha256File(protocolFile);

  if (current !== freeze.protocolSha256) {
    log(
      `NOTE: PROTOCOL.md changed after its freeze (${freeze.protocolSha256.slice(0, 12)} → ${current.slice(0, 12)}); the change must be an amendment in §9`
    );
  }

  return { freeze, current };
};

// ----- the candidate freeze (PROTOCOL.md §4) -----

const codeFiles = [
  'src/complementary-etf-d1/context.ts',
  'src/complementary-etf-d1/data.ts',
  'src/complementary-etf-d1/audit.ts',
  'src/complementary-etf-d1/screen.ts',
  'src/complementary-etf-d1/diagnose.ts',
  'src/complementary-etf-d1/parity.ts',
  'src/complementary-etf-d1/regression.ts',
  'src/complementary-etf-d1/freeze.ts',
  'src/complementary-etf-d1/stageC.ts',
  'src/complementary-etf-d1/cli.ts',
  'src/app/allIn-trailingBuy-postExitContinuation.ts',
  'src/d1-refinement/engine.ts',
  'src/d1-refinement/evaluate.ts',
  'src/multi-etf-d1/search.ts',
  'src/multi-etf-d1/selection.ts',
  'src/multi-etf-d1/space.ts',
  'src/multi-etf-d1/evaluation.ts',
  'src/lib/corporateActions.ts',
  'src/lib/evaluation.ts',
  'src/multi-etf-allocator/engine.ts'
];

export interface CandidateManifest {
  version: string;
  frozenAt: string;
  gitHead: string;
  gitModifiedTrackedFiles: string[];
  gitUntrackedFiles: string[];
  protocol: { file: string; sha256: string; frozenSha256: string; frozenAt: string };
  inputs: Record<string, string>;
  dataHashes: Record<string, string>;
  codeHashes: Record<string, string>;
  screen: {
    selected: string[];
    decisions: string[];
    table: { symbol: string; priority: string; gates: Record<string, boolean>; composite: number }[];
  };
  candidates: { symbol: string; role: string; params: Record<string, number> }[];
  scenarios: { key: string; books: string; note: string }[];
  acceptance: Record<string, number>;
  statement: string;
  manifestHash: string;
}

const hashBody = (body: Omit<CandidateManifest, 'manifestHash'>) => sha256(JSON.stringify(body));

export const verifyCandidateManifest = (manifest: CandidateManifest) => {
  const { manifestHash, ...body } = manifest;

  return hashBody(body) === manifestHash;
};

export const freezeCandidates = async (): Promise<CandidateManifest> => {
  if (await fs.pathExists(frozenCandidatesFile)) {
    throw new Error(`${frozenCandidatesFile} exists: the candidates are frozen and are never rewritten`);
  }

  const { freeze, current } = await requireProtocolFrozen();
  const screenFile = stageDir('stageA', 'screen.json');
  const screen = await readJson<{
    selected: string[];
    decisions: string[];
    rows: {
      symbol: string;
      priority: string;
      dataHash: string;
      gates: Record<string, boolean>;
      scores: { composite: number };
    }[];
  }>(screenFile);

  if (screen.selected.length > 0) {
    throw new Error('Stage A selected candidates: run Stage B (search and nomination) before freezing them');
  }

  const status = git('status', '--porcelain').split('\n').filter(Boolean);
  const inputs: Record<string, string> = {};

  for (const file of [
    screenFile,
    stageDir('stageA-diagnostics', 'diagnostics.json'),
    stageDir('parity', 'parity.json'),
    stageDir('regression', 'regression.json'),
    stageDir('audit', 'audit.json'),
    'data/partitions.json',
    'config/market-events/splits.json',
    'config/market-events/distributions.csv',
    'config/allocator/multi-etf-allocator.json',
    'config/phenotypes/D1/VGT.json',
    'config/phenotypes/D1/XBI.json',
    'config/phenotypes/D1/XRT.json',
    'config/phenotypes/D1/KRE.json'
  ]) {
    inputs[file] = await sha256File(file);
  }

  const dataHashes: Record<string, string> = {};

  for (const symbol of auditSymbols) {
    dataHashes[symbol] = await sha256File(`data/${symbol}/data.csv`);
  }

  const codeHashes: Record<string, string> = {};

  for (const file of codeFiles) {
    codeHashes[file] = await sha256File(file);
  }

  const body: Omit<CandidateManifest, 'manifestHash'> = {
    version: study.version,
    frozenAt: nowIso(),
    gitHead: git('rev-parse', 'HEAD'),
    gitModifiedTrackedFiles: status.filter((line) => !line.startsWith('??')).map((line) => line.slice(3)),
    gitUntrackedFiles: status.filter((line) => line.startsWith('??')).map((line) => line.slice(3)),
    protocol: { file: protocolFile, sha256: current, frozenSha256: freeze.protocolSha256, frozenAt: freeze.frozenAt },
    inputs,
    dataHashes,
    codeHashes,
    screen: {
      selected: screen.selected,
      decisions: screen.decisions,
      table: screen.rows.map((row) => ({
        symbol: row.symbol,
        priority: row.priority,
        gates: row.gates,
        composite: row.scores.composite
      }))
    },
    candidates: [],
    scenarios: [
      {
        key: 'S0',
        books: 'All-lowDd shadow (VGT primary, XBI/XRT/KRE lowDd), unchanged',
        note: 'the baseline only: Stage A selected no candidate, so no additive scenario (S1–S3) exists'
      }
    ],
    acceptance: { ...study.acceptance },
    statement: `Stage A (PROTOCOL.md §3) selected none of ${candidates.join(', ')}; Stage B optimized nothing; no candidate vector exists to freeze. This manifest freezes that outcome before any holdout, final or all figure of a candidate was computed: no candidate may be added to Stage C later.`
  };
  const manifest: CandidateManifest = { ...body, manifestHash: hashBody(body) };

  await writeJson(frozenCandidatesFile, manifest);
  log(
    `candidates frozen at ${manifest.frozenAt}: ${manifest.candidates.length} candidates, manifest ${manifest.manifestHash}`
  );

  return manifest;
};
