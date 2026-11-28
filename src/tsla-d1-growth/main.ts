// P6-TSLA's runner (PROTOCOL.md §14): `npm run tsla -- <command>` from the repository root, started ONLY through
// src/gpu-backend/officialRunner.ts (purpose official-optimization, the study preflight, `node --no-maglev`). Every
// evaluating command opens the official gate itself (src/gpu-backend/official.ts openOfficialGpuSession, via stages.ts);
// there is no CPU path. Commands:
//   bound | ledger | verify                           (no evaluation)
//   gates                                             seal results/engineering/gates.json from the engineering evidence
//   freeze                                            seal results/protocol-freeze.json (before any official evaluation)
//   code-amendment --id A<n> --why <text>             a sealed code amendment (AMENDMENTS.md)
//   search --cutoff C --arm D|G|J|S --part broad|refine [--resume]
//   round --cutoff C --arm D|G|J|S --k k [--resume]
//   qualify --cutoff C --arm D|G|J|S --stage broad|refine | --arm C --stage fixed [--resume]
//   refine-plan --cutoff C --arm A | select-arm --cutoff C --arm A | freeze-d1 --cutoff C | pairs --cutoff C
//   select --cutoff C                                 (no evaluation; every arm)
//   slice --cutoff C19|C21|C23 [--resume]             the fold evaluation on the next slice
//   sequential                                        (no evaluation)
//   freeze-selection | authorize-full                 (no evaluation)
//   validate [--resume]                               C24 → 2025-01-02 … 2026-10-30 on FULL, once
//   outcome                                           (no evaluation)
import type { OfficialGpuSession } from '../gpu-backend/official.ts'; // the official gate — used by stages.ts
import fs from 'node:fs';
import path from 'node:path';
import { requireStandardAdoption } from '../research-standard/preflight.ts';
import { compatManifest } from '../gpu-backend/compat.ts';
import { references } from '../vg-l0-n-successor/incumbents.ts';
import { a3FrozenSelection } from '../vg-l0-n-successor/incumbents.ts';
import { type ArmKey, type CutoffKey, PROTOCOL_ID, PROTOCOL_VERSION, armKeys, cutoffKeys, engineeringFile, freezeFile, repoRoot, researchDir, resultsDir } from './context.ts';
import {
  ceilingRequested,
  firstReplicate,
  islandCaps,
  laneCaps,
  maxFrozenD1,
  maxPairSide,
  nl0Caps,
  perMemberMax,
  perSubject,
  refineQuota,
  replicates,
  schedules
} from './budget.ts';
import { bands } from './outcome.ts';
import { doorPinsFile, readPins } from './doors.ts';
import { branchName, codeDigest, codeFiles, dirtyCode, headCommit, readJson, rel, seal, sha256File, verifySeals } from './records.ts';
import {
  type QStage,
  type SearchArm,
  allowedCodeDigests,
  amendmentsDir,
  ledger,
  runAuthorizeFull,
  runFreezeD1,
  runFreezeSelection,
  runOutcome,
  runPairs,
  runQualify,
  runRefinePlan,
  runRound,
  runSearch,
  runSelect,
  runSelectArm,
  runSequential,
  runSlice,
  studyDocs
} from './stages.ts';

export type { OfficialGpuSession };

const args = process.argv.slice(2);
const cmd = args[0];
const opt = (k: string) => (args.includes(`--${k}`) ? args[args.indexOf(`--${k}`) + 1]! : undefined);
const resume = args.includes('--resume');
const cutoff = () => {
  const c = opt('cutoff');

  if (!cutoffKeys.includes(c as CutoffKey)) throw new Error(`--cutoff ${cutoffKeys.join('|')}`);
  return c as CutoffKey;
};
const arm = () => {
  const a = opt('arm');

  if (!armKeys.includes(a as ArmKey)) throw new Error(`--arm ${armKeys.join('|')}`);
  return a as ArmKey;
};
const searchArm = () => {
  const a = arm();

  if (a === 'C') throw new Error('arm C has no search (its pairs are qualified with --stage fixed)');
  return a as SearchArm;
};

// the pinned non-closure inputs: the documents, the brief, the data pins and ledger, the engineering tools, the chain
export const pinnedFiles = () =>
  [
    ...studyDocs,
    'research/tsla-d1-growth/brief/BRIEF.md',
    'research/tsla-d1-growth/data/DOOR_PINS.json',
    'research/tsla-d1-growth/data/TSLA-splits.json',
    'research/tsla-d1-growth/TSLA_DATA_AUDIT.json',
    'research/tsla-d1-growth/FUNCTIONALITY_AUDIT.md',
    'research/tsla-d1-growth/chains/chain.sh',
    'tools/tsla-d1-growth/engineering.ts',
    'tools/tsla-d1-growth/common.ts',
    'tools/tsla-d1-growth/launch.sh'
  ].filter((f) => fs.existsSync(path.join(repoRoot, f)));

const bound = () => ({
  schedules,
  nl0Caps,
  islandCaps,
  laneCaps,
  replicates,
  refineQuota,
  maxFrozenD1,
  maxPairSide,
  firstReplicate,
  perMemberMax,
  perSubject,
  ceilingRequested,
  bands
});

// the engineering gates (PROTOCOL.md §13): each gate's evidence file under results/engineering/ must exist and pass
const gateFiles: Record<string, string> = {
  E1: 'results/engineering/E1-acceptance.json',
  E2: 'results/engineering/E2-data.json',
  E3: 'results/engineering/E3-references.json',
  E4: 'results/engineering/E4-parity.json',
  E5: 'results/engineering/E5-determinism.json',
  E6: 'results/engineering/E6-identities.json',
  E7: 'results/engineering/E7-tests.json',
  E8: 'results/engineering/E8-regression.json',
  E9: 'results/engineering/pilot.json'
};

const gates = () => {
  if (fs.existsSync(engineeringFile)) throw new Error('the gates are sealed already');

  const rows = Object.entries(gateFiles).map(([id, f]) => {
    const file = path.join(researchDir, f);

    if (!fs.existsSync(file)) return { id, file: f, exists: false, pass: false, sha256: null };

    const j = readJson<{ pass?: boolean; codeDigest?: string }>(file);
    // the code-dependent gates must have run under the final (frozen) code closure (the pilot is planning evidence whose
    // output — R_S — is frozen into code afterwards: its lanes' run digest is recorded in pilot/lanes.json, as Priority 5)
    const digestRequired = ['E2', 'E3', 'E4', 'E5', 'E6'].includes(id);
    const digestOk = !digestRequired || j.codeDigest === codeDigest();

    return { id, file: f, exists: true, pass: j.pass === true && digestOk, digestRequired, codeDigest: j.codeDigest ?? null, digestOk, sha256: sha256File(file) };
  });
  const record = { kind: 'P6-TSLA engineering gates', protocol: `${PROTOCOL_ID} ${PROTOCOL_VERSION}`, head: headCommit(), codeDigest: codeDigest(), gates: Object.fromEntries(rows.map((r) => [r.id, r])), pass: rows.every((r) => r.pass), sealedAt: new Date().toISOString() };

  seal(engineeringFile, record, 'engineering gates');
  console.log(JSON.stringify({ pass: record.pass, gates: rows.map((r) => `${r.id}:${r.pass}`) }));
  if (!record.pass) process.exitCode = 1;
};

const freeze = () => {
  requireStandardAdoption(researchDir, { repoRoot });
  if (fs.existsSync(freezeFile)) throw new Error('the protocol is frozen already');
  if (!fs.existsSync(engineeringFile) || !readJson<{ pass: boolean }>(engineeringFile).pass) throw new Error('the engineering gates are not sealed and passed');

  const dirty = dirtyCode([...studyDocs, ...pinnedFiles()]);

  if (dirty.length) throw new Error(`commit the code and the protocol before the freeze: ${dirty.slice(0, 5).join('; ')}`);

  const acc = readJson<{ status: string; acceptedAt: string; study: string; binary: { path: string; sha256: string }; device: { uuid: string }; compat: { digest: string } }>(
    path.join(repoRoot, 'config/gpu-backend/acceptance.json')
  );
  const pilot = readJson<{ expected: unknown }>(path.join(researchDir, gateFiles.E9!));
  const refs = references();
  const record = {
    kind: 'P6-TSLA protocol freeze',
    protocol: { id: PROTOCOL_ID, version: PROTOCOL_VERSION, file: 'research/tsla-d1-growth/PROTOCOL.md', sha256: sha256File(path.join(researchDir, 'PROTOCOL.md')) },
    documents: pinnedFiles().map((f) => ({ file: f, sha256: sha256File(path.join(repoRoot, f)) })),
    codeDigest: codeDigest(),
    codeFiles: codeFiles().length,
    acceptance: { file: 'config/gpu-backend/acceptance.json', study: acc.study, status: acc.status, acceptedAt: acc.acceptedAt, binary: acc.binary, device: acc.device.uuid, compat: acc.compat.digest },
    acceptanceSha256: sha256File(path.join(repoRoot, 'config/gpu-backend/acceptance.json')),
    compatNow: compatManifest().digest,
    engineeringGates: { file: rel(engineeringFile), sha256: sha256File(engineeringFile) },
    references: { source: a3FrozenSelection, NORIG: refs.NORIG.id, NL0: refs.NL0.id, role: 'external controls only (never seeds or members)' },
    doorPins: { file: rel(doorPinsFile), pins: readPins() },
    doorPinsSha256: sha256File(doorPinsFile),
    budgets: bound(),
    expected: pilot.expected,
    head: headCommit(),
    branch: branchName(),
    frozenAt: new Date().toISOString()
  };

  seal(freezeFile, record, 'protocol freeze');
  console.log(`frozen: protocol ${record.protocol.sha256.slice(0, 16)}, code ${record.codeDigest.slice(0, 16)}, acceptance ${record.acceptanceSha256.slice(0, 16)}`);
};

const codeAmendment = () => {
  const id = opt('id');
  const why = opt('why');

  if (!id || !/^A\d+$/.test(id) || !why) throw new Error('--id A<n> --why <text>');

  const fz = readJson<{ codeDigest: string }>(freezeFile);
  const chain = allowedCodeDigests(fz.codeDigest);
  const file = path.join(amendmentsDir, `${id}.json`);

  seal(file, { kind: 'code amendment', id, why, from: chain.at(-1), to: codeDigest(), head: headCommit(), t: new Date().toISOString() }, `code amendment ${id}`);
};

const main = async () => {
  switch (cmd) {
    case 'bound':
      console.log(JSON.stringify(bound(), null, 1));
      return;
    case 'ledger':
      console.log(JSON.stringify(ledger(), null, 1));
      return;
    case 'verify': {
      const v = verifySeals();

      console.log(JSON.stringify(v));
      if (v.failed.length) process.exitCode = 1;
      return;
    }
    case 'gates':
      return gates();
    case 'freeze':
      return freeze();
    case 'code-amendment':
      return codeAmendment();
    case 'search': {
      const part = opt('part');

      if (part !== 'broad' && part !== 'refine') throw new Error('--part broad|refine');
      await runSearch(cutoff(), searchArm(), part, resume);
      return;
    }
    case 'round':
      await runRound(cutoff(), searchArm(), Number(opt('k')), resume);
      return;
    case 'qualify':
      await runQualify(cutoff(), arm(), opt('stage') as QStage, resume);
      return;
    case 'refine-plan':
      runRefinePlan(cutoff(), searchArm());
      return;
    case 'select-arm':
      runSelectArm(cutoff(), arm());
      return;
    case 'freeze-d1':
      runFreezeD1(cutoff());
      return;
    case 'pairs':
      runPairs(cutoff());
      return;
    case 'select':
      runSelect(cutoff());
      return;
    case 'slice':
      if (cutoff() === 'C24') throw new Error('C24 is evaluated once by validate');
      await runSlice(cutoff(), resume);
      return;
    case 'sequential':
      runSequential();
      return;
    case 'freeze-selection':
      await runFreezeSelection();
      return;
    case 'authorize-full':
      runAuthorizeFull();
      return;
    case 'validate':
      await runSlice('C24', resume);
      return;
    case 'outcome':
      await runOutcome();
      return;
    default:
      throw new Error(`unknown command ${cmd ?? ''} (see the header of src/tsla-d1-growth/main.ts)`);
  }
};

await main();
void resultsDir;
