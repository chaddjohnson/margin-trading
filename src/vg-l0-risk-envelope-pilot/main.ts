// The pilot's runner (PROTOCOL.md §12): `npm run vg-l0rep -- <command>` from the repository root, started ONLY through
// src/gpu-backend/officialRunner.ts (purpose official-optimization, the study preflight, `node --no-maglev`). Every
// evaluating command opens the official gate itself (src/gpu-backend/official.ts openOfficialGpuSession, via stages.ts);
// there is no CPU path. Commands:
//   bound                                   the deterministic budget bound (no evaluation)
//   freeze                                  seal results/protocol-freeze.json (before any official evaluation)
//   gates                                   seal results/engineering/gates.json from the E1, E3–E6 evidence
//   search --cutoff C21|C24 --arm CTRL|EXP [--resume]
//   e2                                      the CTRL lanes = Assignment 3's sealed lanes (no evaluation)
//   qualify --cutoff C21|C24 [--resume]
//   e2-qualification --cutoff C21|C24       CTRL evidence = Assignment 3's sealed evidence (no evaluation)
//   select --cutoff C21|C24                 (no evaluation)
//   freeze-selection                        FROZEN_SELECTION.json (after the C24 selection)
//   authorize-full                          the FULL door authorization (after the committed frozen selection)
//   interval --cutoff C21 [--resume]        C21 → 2022–2023 on D23
//   validate [--resume]                     C24 → 2025–2026 on FULL, once
import type { OfficialGpuSession } from '../gpu-backend/official.ts'; // the official gate (src/gpu-backend/official.ts) — used by stages.ts
import fs from 'node:fs';
import path from 'node:path';
import { compatManifest } from '../gpu-backend/compat.ts';
import { requireStandardAdoption } from '../research-standard/preflight.ts';
import { doorSpecs } from '../vg-d1-growth-joint/context.ts';
import { budgets } from '../vg-l0-full-joint/budgets.ts';
import {
  type ArmKey,
  type CutoffKey,
  PROTOCOL_ID,
  PROTOCOL_VERSION,
  arms,
  cellSelectionPrefix,
  cells,
  cutoffs,
  engineeringFile,
  freezeFile,
  repoRoot,
  researchDir,
  resultsDir
} from './context.ts';
import { assertBound } from './budget.ts';
import { branchName, codeDigest, codeFiles, dirtyCode, headCommit, readJson, rel, seal, sha256File } from './records.ts';
import {
  allowedCodeDigests,
  a3FrozenSelection,
  a3QualificationFiles,
  a3SearchFile,
  laneSpecs,
  runAuthorizeFull,
  runE2,
  runE2Qualification,
  runFreezeSelection,
  runInterval,
  runQualify,
  runSearch,
  runSelect,
  studyDocs
} from './stages.ts';

export type { OfficialGpuSession };

const args = process.argv.slice(2);
const cmd = args[0];
const opt = (k: string) => (args.includes(`--${k}`) ? args[args.indexOf(`--${k}`) + 1]! : undefined);
const cutoff = () => {
  const c = opt('cutoff');

  if (c !== 'C21' && c !== 'C24') throw new Error('--cutoff C21|C24');
  return c as CutoffKey;
};
const arm = () => {
  const a = opt('arm');

  if (a !== 'CTRL' && a !== 'EXP') throw new Error('--arm CTRL|EXP');
  return a as ArmKey;
};
const docs = ['PROTOCOL.md', 'AMENDMENTS.md', 'STANDARD_ADOPTION.json', 'DECISION_REGISTER.md', 'EXECUTION_PLAN.md', 'DIAGNOSTICS_SPEC.md', 'SCALING_CHECKS.md', 'IMPLEMENTATION_PLAN.md', 'brief/BRIEF.md'];

const freeze = () => {
  requireStandardAdoption(researchDir, { repoRoot });
  if (fs.existsSync(freezeFile)) throw new Error('the protocol is frozen already');

  const dirty = dirtyCode(studyDocs);

  if (dirty.length) throw new Error(`commit the code and the protocol before the freeze: ${dirty.slice(0, 5).join('; ')}`);

  const b = assertBound();
  const acc = readJson<{ status: string; acceptedAt: string; source: { commit: string }; binary: { path: string; sha256: string }; device: { uuid: string }; compat: { digest: string } }>(
    path.join(repoRoot, 'config/gpu-backend/acceptance.json')
  );
  const adoption = readJson<{ standard: { version: string; sha256: string }; referenceMethod: unknown }>(path.join(researchDir, 'STANDARD_ADOPTION.json'));
  const fileRow = (f: string) => ({ file: rel(f), sha256: sha256File(f) });
  const record = {
    kind: 'risk-envelope pilot protocol freeze',
    protocol: { id: PROTOCOL_ID, version: PROTOCOL_VERSION, path: rel(path.join(researchDir, 'PROTOCOL.md')), sha256: sha256File(path.join(researchDir, 'PROTOCOL.md')) },
    documents: docs.map((d) => fileRow(path.join(researchDir, d))),
    standard: adoption.standard,
    referenceMethod: adoption.referenceMethod,
    head: headCommit(),
    branch: branchName(),
    codeDigest: codeDigest(),
    codeFiles: codeFiles().map((f) => ({ file: f, sha256: sha256File(path.join(repoRoot, f)) })),
    evaluationDigest: compatManifest().digest,
    acceptanceSha256: sha256File(path.join(repoRoot, 'config/gpu-backend/acceptance.json')),
    acceptance: { status: acc.status, acceptedAt: acc.acceptedAt, sourceCommit: acc.source.commit, binary: acc.binary, device: acc.device.uuid, evaluationDigest: acc.compat.digest },
    arms: Object.fromEntries((['CTRL', 'EXP'] as const).map((k) => [k, { policy: arms[k].policy, markedDdLimit: arms[k].markedDdLimit, ra1S4: arms[k].ra1S4, nbInstrument: arms[k].nbInstrument }])),
    cells: { cells, hashedCellRule: `min over the 63 non-legacy cells of sha256("${cellSelectionPrefix}" + id)` },
    lanes: (['C21', 'C24'] as const).map((c) => ({ cutoff: c, door: cutoffs[c].door, seedKeys: laneSpecs(c).map((s) => s.seedKey) })),
    schedule: budgets.study.broad,
    budget: b,
    doors: {
      D21: doorSpecs.D21.pins,
      D23: doorSpecs.D23.pins,
      D24: doorSpecs.D24.pins,
      FULL: 'Priority 3 FULL door (canonical files GDX 77dba9b2…, VGT 2ee06310…; the guards of src/vg-l0-risk-envelope-pilot/doors.ts)'
    },
    intervals: cutoffs,
    assignment3References: [
      ...(['C21', 'C24'] as const).map((c) => fileRow(a3SearchFile(c))),
      ...(['C21', 'C24'] as const).flatMap((c) => a3QualificationFiles(c).map(fileRow)),
      fileRow(a3FrozenSelection)
    ],
    frozenAt: new Date().toISOString()
  };

  seal(freezeFile, record, 'protocol freeze');
  console.log(`frozen: protocol ${record.protocol.sha256.slice(0, 12)}, code ${record.codeDigest.slice(0, 12)}, bound ${b.total}`);
};

// the engineering gates record: each gate's evidence file must exist and carry its pass marker
const gates = () => {
  if (fs.existsSync(engineeringFile)) throw new Error('the engineering gates are sealed already');

  const eng = path.join(resultsDir, 'engineering');
  const has = (f: string, re: RegExp) => fs.existsSync(path.join(eng, f)) && re.test(fs.readFileSync(path.join(eng, f), 'utf8'));
  const json = <T>(f: string) => readJson<T>(path.join(eng, f));
  const ev = (f: string) => (fs.existsSync(path.join(eng, f)) ? { file: rel(path.join(eng, f)), sha256: sha256File(path.join(eng, f)) } : { file: f, missing: true });
  const e3 = fs.existsSync(path.join(eng, 'E3', 'summary.json')) ? json<{ pass: boolean; codeDigest: string | null }>('E3/summary.json') : { pass: false, codeDigest: null };
  const digest = codeDigest();
  const g = {
    E1: {
      what: 'the live Phase 7 ACCEPTED record, the independent verifier (rebuild, device, out-of-band pin) on the pilot branch; node --no-maglev enforced',
      pass: has('E1/verify-acceptance.txt', /^VERIFIED$/m) && has('E1/runtime.txt', /PASS/),
      evidence: [ev('E1/verify-acceptance.txt'), ev('E1/runtime.txt')]
    },
    E3: {
      what: 'fixed-seed mini-pilot of both arms, CPU = GPU (records, envelopes, decisions, rankings, archives), threshold-edge records, interruption/resume — engineering only (D19 / engineering subjects)',
      pass: e3.pass === true && e3.codeDigest === digest,
      evidence: [ev('E3/summary.json')]
    },
    E4: {
      what: 'stage-wiring, boundary and static tests (tests/*.test.ts): DD 38k flips CTRL fail → EXP pass, PL/BD 26k flip CTRL pass → EXP fail, exact boundaries, Q5 and p90 on all three metrics, no hidden 35k rule',
      pass: has('E4/tests.txt', /^ℹ fail 0$/m) && has('E4/tests.txt', /^ℹ pass [1-9]/m) && has('E4/tests.txt', new RegExp(`^codeDigest ${digest}$`, 'm')),
      evidence: [ev('E4/tests.txt')]
    },
    E5: {
      what: 'the study preflight (standard 3.0.0, scope optimization, evaluationBackend gpu-required, NL0 1.0.0 pinned) passes',
      pass: has('E5/preflight.txt', /PASS/) && !has('E5/preflight.txt', /FAIL/),
      evidence: [ev('E5/preflight.txt')]
    },
    E6: {
      what: 'the live official gate opens on D21 and D24 for this study on the committed pilot lineage (attestations)',
      pass: has('E6/official-preflight-D21.txt', /GATE OPEN/) && has('E6/official-preflight-D24.txt', /GATE OPEN/),
      evidence: [ev('E6/official-preflight-D21.txt'), ev('E6/official-preflight-D24.txt')]
    },
    E2: { what: 'CTRL = Assignment 3: verified by the official CTRL phases themselves (results/engineering/E2-*.json) before any EXP evaluation', pass: null }
  };
  const record = {
    kind: 'risk-envelope pilot engineering gates',
    head: headCommit(),
    codeDigest: codeDigest(),
    gates: g,
    pass: ['E1', 'E3', 'E4', 'E5', 'E6'].every((k) => (g as Record<string, { pass: boolean | null }>)[k]!.pass === true),
    sealedAt: new Date().toISOString()
  };

  seal(engineeringFile, record, 'engineering gates');
  console.log(JSON.stringify({ pass: record.pass, gates: Object.fromEntries(Object.entries(g).map(([k, v]) => [k, v.pass])) }));
  if (!record.pass) process.exitCode = 2;
};

// a code amendment (AMENDMENTS.md): the changed files of the code closure against the frozen (or last amended) closure,
// the new digest; sealed; the official guards accept the digest only once this record is committed
const codeAmendment = () => {
  const id = opt('id');

  if (!id || !/^A\d+$/.test(id)) throw new Error('--id A<n>');

  const file = path.join(resultsDir, 'amendments', `${id}.json`);

  if (fs.existsSync(file)) throw new Error(`${rel(file)} exists`);

  const fz = readJson<{ codeDigest: string; codeFiles: { file: string; sha256: string }[] }>(freezeFile);
  const allowed = allowedCodeDigests(fz.codeDigest);
  const before = new Map(fz.codeFiles.map((f) => [f.file, f.sha256]));
  const now = codeFiles().map((f) => ({ file: f, sha256: sha256File(path.join(repoRoot, f)) }));
  const changed = now.filter((f) => before.get(f.file) !== f.sha256).map((f) => ({ file: f.file, frozenSha256: before.get(f.file) ?? null, sha256: f.sha256 }));
  const removed = [...before.keys()].filter((f) => !now.some((x) => x.file === f));
  const dirty = dirtyCode(studyDocs);

  if (dirty.length) throw new Error(`commit the amended code and AMENDMENTS.md first: ${dirty.slice(0, 5).join('; ')}`);
  if (!fs.readFileSync(path.join(researchDir, 'AMENDMENTS.md'), 'utf8').includes(`**${id} `)) throw new Error(`AMENDMENTS.md has no entry ${id}`);

  const record = {
    kind: 'risk-envelope pilot code amendment',
    id,
    t: new Date().toISOString(),
    head: headCommit(),
    from: allowed.at(-1)!,
    to: codeDigest(),
    changed,
    removed,
    amendmentsSha256: sha256File(path.join(researchDir, 'AMENDMENTS.md'))
  };

  if (record.from === record.to) throw new Error('the code closure is unchanged: nothing to amend');
  seal(file, record, `code amendment ${id}`);
  console.log(JSON.stringify({ id, from: record.from.slice(0, 12), to: record.to.slice(0, 12), changed: changed.map((c) => c.file) }));
};

switch (cmd) {
  case 'code-amendment':
    codeAmendment();
    break;
  case 'bound':
    console.log(JSON.stringify(assertBound(), null, 1));
    break;
  case 'freeze':
    freeze();
    break;
  case 'gates':
    gates();
    break;
  case 'search':
    await runSearch(cutoff(), arm(), args.includes('--resume'));
    break;
  case 'e2':
    runE2();
    break;
  case 'qualify':
    await runQualify(cutoff());
    break;
  case 'e2-qualification':
    runE2Qualification(cutoff());
    break;
  case 'select':
    runSelect(cutoff());
    break;
  case 'freeze-selection':
    runFreezeSelection();
    break;
  case 'authorize-full':
    runAuthorizeFull();
    break;
  case 'interval':
    if (cutoff() !== 'C21') throw new Error('interval: C21 only (C24 is the validation: `validate`)');
    await runInterval('C21');
    break;
  case 'validate':
    await runInterval('C24');
    break;
  default:
    console.error(`unknown command ${cmd ?? '(none)'}; see the header of src/vg-l0-risk-envelope-pilot/main.ts`);
    process.exit(2);
}

