// P5-NS's runner (PROTOCOL.md §14): `npm run vg-l0ns -- <command>` from the repository root, started ONLY through
// src/gpu-backend/officialRunner.ts (purpose official-optimization, the study preflight, `node --no-maglev`). Every
// evaluating command opens the official gate itself (src/gpu-backend/official.ts openOfficialGpuSession, via stages.ts);
// there is no CPU path. Commands:
//   bound | ledger | verify                      (no evaluation)
//   gates                                        seal results/engineering/gates.json from the engineering evidence
//   freeze                                       seal results/protocol-freeze.json (before any official evaluation)
//   code-amendment --id A<n> --why <text>        a sealed code amendment (AMENDMENTS.md)
//   search --cutoff C --part broad1|broad2|refine|informed1|informed2 [--resume]
//   round --cutoff C --track F|N --k k [--resume]
//   qualify --cutoff C --stage broad|refine|informed [--resume]
//   refine-plan --cutoff C | select --cutoff C   (no evaluation)
//   slice --cutoff C19|C21|C23 [--resume]        the fold evaluation on the next slice
//   sequential                                   (no evaluation)
//   freeze-selection | authorize-full            (no evaluation)
//   validate [--resume]                          C24 → 2025–2026 on FULL, once
//   outcome                                      (no evaluation)
import type { OfficialGpuSession } from '../gpu-backend/official.ts'; // the official gate — used by stages.ts
import fs from 'node:fs';
import path from 'node:path';
import { requireStandardAdoption } from '../research-standard/preflight.ts';
import { compatManifest } from '../gpu-backend/compat.ts';
import { doorSpecs } from '../vg-d1-growth-joint/context.ts';
import { type CutoffKey, PROTOCOL_ID, PROTOCOL_VERSION, cutoffKeys, engineeringFile, freezeFile, repoRoot, researchDir, resultsDir } from './context.ts';
import { ceilingRequested, firstReplicate, islandCaps, laneCaps, nl0Caps, perMemberCap, perSubject, replicates, schedules } from './budget.ts';
import { a3FrozenSelection, references } from './incumbents.ts';
import { material } from './successor.ts';
import { branchName, codeDigest, codeFiles, dirtyCode, headCommit, readJson, rel, seal, sha256File, verifySeals } from './records.ts';
import {
  type Part,
  type QStage,
  allowedCodeDigests,
  amendmentsDir,
  ledger,
  runAuthorizeFull,
  runFreezeSelection,
  runOutcome,
  runQualify,
  runRefinePlan,
  runRound,
  runSearch,
  runSelect,
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

// the pinned non-closure inputs: the documents, the brief, the engineering and analysis tools, the chain
export const pinnedFiles = () =>
  [
    ...studyDocs,
    'research/vg-l0-n-successor/brief/BRIEF.md',
    'research/vg-l0-n-successor/METHOD_AND_BUDGET_RECONSTRUCTION.md',
    'research/vg-l0-n-successor/chains/chain.sh',
    'tools/vg-l0-n-successor/common.ts',
    'tools/vg-l0-n-successor/cpuPool.ts',
    'tools/vg-l0-n-successor/cpuWorker.ts',
    'tools/vg-l0-n-successor/engineering.ts',
    'tools/vg-l0-n-successor/launch.sh'
  ].filter((f) => fs.existsSync(path.join(repoRoot, f)));

const bound = () => ({
  schedules,
  nl0Caps,
  islandCaps,
  laneCaps,
  replicates,
  firstReplicate,
  perMember: perMemberCap(),
  perSubject: perSubject(),
  ceilingRequested,
  material
});

// the engineering gates (PROTOCOL.md §13): each gate's evidence file under results/engineering/ must exist and pass
const gateFiles: Record<string, string> = {
  E1: 'results/engineering/E1-acceptance.json',
  E2: 'results/engineering/E2-references.json',
  E3: 'results/engineering/E3-a3-lanes.json',
  E4: 'results/engineering/E4-parity.json',
  E5: 'results/engineering/E5-determinism.json',
  E6: 'results/engineering/E6-chain.json',
  E7: 'results/engineering/E7-tests.json',
  E8: 'results/engineering/E8-regression.json',
  E9: 'results/engineering/pilot.json'
};

const gates = () => {
  if (fs.existsSync(engineeringFile)) throw new Error('the gates are sealed already');

  const rows = Object.entries(gateFiles).map(([id, f]) => {
    const file = path.join(researchDir, f);

    if (!fs.existsSync(file)) return { id, file: f, exists: false, pass: false, sha256: null };

    const j = readJson<{ pass?: boolean }>(file);

    return { id, file: f, exists: true, pass: j.pass === true, sha256: sha256File(file) };
  });
  const record = { kind: 'P5-NS engineering gates', protocol: `${PROTOCOL_ID} ${PROTOCOL_VERSION}`, head: headCommit(), codeDigest: codeDigest(), gates: Object.fromEntries(rows.map((r) => [r.id, r])), pass: rows.every((r) => r.pass), sealedAt: new Date().toISOString() };

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
    kind: 'P5-NS protocol freeze',
    protocol: { id: PROTOCOL_ID, version: PROTOCOL_VERSION, file: 'research/vg-l0-n-successor/PROTOCOL.md', sha256: sha256File(path.join(researchDir, 'PROTOCOL.md')) },
    documents: pinnedFiles().map((f) => ({ file: f, sha256: sha256File(path.join(repoRoot, f)) })),
    codeDigest: codeDigest(),
    codeFiles: codeFiles().length,
    acceptance: { file: 'config/gpu-backend/acceptance.json', study: acc.study, status: acc.status, acceptedAt: acc.acceptedAt, binary: acc.binary, device: acc.device.uuid, compat: acc.compat.digest },
    acceptanceSha256: sha256File(path.join(repoRoot, 'config/gpu-backend/acceptance.json')),
    compatNow: compatManifest().digest,
    engineeringGates: { file: rel(engineeringFile), sha256: sha256File(engineeringFile) },
    references: { source: a3FrozenSelection, NORIG: refs.NORIG.id, NL0: refs.NL0.id },
    doors: Object.fromEntries(Object.entries(doorSpecs).map(([k, v]) => [k, (v as { pins: unknown }).pins])),
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
    case 'search':
      await runSearch(cutoff(), opt('part') as Part, resume);
      return;
    case 'round': {
      const track = opt('track');

      if (track !== 'F' && track !== 'N') throw new Error('--track F|N');
      await runRound(cutoff(), track, Number(opt('k')), resume);
      return;
    }
    case 'qualify':
      await runQualify(cutoff(), opt('stage') as QStage, resume);
      return;
    case 'refine-plan':
      runRefinePlan(cutoff());
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
      runFreezeSelection();
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
      throw new Error(`unknown command ${cmd ?? ''} (see the header of src/vg-l0-n-successor/main.ts)`);
  }
};

await main();
void resultsDir;
