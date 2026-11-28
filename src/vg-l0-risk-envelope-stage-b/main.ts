// Stage B's runner (PROTOCOL.md §11): `npm run vg-l0reb -- <command>` from the repository root, started ONLY through
// src/gpu-backend/officialRunner.ts (purpose official-optimization, the study preflight, `node --no-maglev`). Every
// evaluating command opens the official gate itself (src/gpu-backend/official.ts openOfficialGpuSession, via stages.ts);
// there is no CPU path. Commands:
//   bound | matrix | forecast --cutoff C        (no evaluation)
//   gates                                       seal results/engineering/gates.json from the E1, E3–E6 evidence
//   freeze                                      seal results/protocol-freeze.json (before any official evaluation)
//   code-amendment --id A<n>                    a sealed code amendment (AMENDMENTS.md)
//   repro --cutoff C [--resume]                 the E2 reproduction lanes (official GPU)
//   e2 --cutoff C                               the reproduction lanes = Assignment 3's sealed lanes (no evaluation)
//   search --cutoff C [--resume]                the fold's 64 research lanes, both arms, one job
//   qualify --cutoff C [--resume]
//   select --cutoff C                           (no evaluation; commit before the interval)
//   interval --cutoff C19|C21 [--resume]        the next interval on D21 / D23
//   freeze-selection | authorize-full           (no evaluation)
//   validate [--resume]                         C24 → 2025–2026 on FULL, once
import type { OfficialGpuSession } from '../gpu-backend/official.ts'; // the official gate — used by stages.ts
import fs from 'node:fs';
import path from 'node:path';
import { compatManifest } from '../gpu-backend/compat.ts';
import { requireStandardAdoption } from '../research-standard/preflight.ts';
import { doorSpecs } from '../vg-d1-growth-joint/context.ts';
import { budgets } from '../vg-l0-full-joint/budgets.ts';
import { type CutoffKey, PROTOCOL_ID, PROTOCOL_VERSION, armKeys, arms, cells, cutoffKeys, cutoffs, engineeringFile, freezeFile, margins, replicates, repoRoot, reproReplicates, researchDir, resultsDir, windowEnd, windowStart, latestSearchLaunch } from './context.ts';
import { assertBound } from './budget.ts';
import { branchName, codeDigest, codeFiles, dirtyCode, headCommit, readJson, rel, seal, sha256File } from './records.ts';
import {
  a3FrozenSelection,
  a3SearchFile,
  allowedCodeDigests,
  forecastOf,
  matrix,
  runAuthorizeFull,
  runE2,
  runFreezeSelection,
  runInterval,
  runQualify,
  runRepro,
  runSearch,
  runSelect,
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

// the pinned non-closure inputs: the documents, the frozen references, the analysis and engineering tools
const pinnedFiles = [
  ...studyDocs,
  'research/vg-l0-risk-envelope-stage-b/brief/BRIEF.md',
  'tools/vg-l0-risk-envelope-sensitivity/policies.ts',
  'research/vg-l0-risk-envelope-sensitivity/STAGE_B_OPTION.md',
  'research/vg-l0-risk-envelope-sensitivity/POLICY_MATRIX.md',
  'tools/vg-l0-risk-envelope-stage-b/engineering.ts',
  'tools/vg-l0-risk-envelope-stage-b/common.ts',
  'tools/vg-l0-risk-envelope-stage-b/analyze.ts',
  'tools/vg-l0-risk-envelope-stage-b/launch.sh',
  'research/vg-l0-risk-envelope-stage-b/chains/fold.sh'
];

const freeze = () => {
  requireStandardAdoption(researchDir, { repoRoot });
  if (fs.existsSync(freezeFile)) throw new Error('the protocol is frozen already');

  const dirty = dirtyCode([...studyDocs, ...pinnedFiles.filter((f) => fs.existsSync(path.join(repoRoot, f)))]);

  if (dirty.length) throw new Error(`commit the code and the protocol before the freeze: ${dirty.slice(0, 5).join('; ')}`);

  const b = assertBound();
  const acc = readJson<{ status: string; acceptedAt: string; source: { commit: string }; binary: { path: string; sha256: string }; device: { uuid: string }; compat: { digest: string } }>(
    path.join(repoRoot, 'config/gpu-backend/acceptance.json')
  );
  const adoption = readJson<{ standard: { version: string; sha256: string }; referenceMethod: unknown }>(path.join(researchDir, 'STANDARD_ADOPTION.json'));
  const fileRow = (f: string) => ({ file: rel(f), sha256: sha256File(f) });
  const record = {
    kind: 'Stage B protocol freeze',
    protocol: { id: PROTOCOL_ID, version: PROTOCOL_VERSION, path: rel(path.join(researchDir, 'PROTOCOL.md')), sha256: sha256File(path.join(researchDir, 'PROTOCOL.md')) },
    pinned: pinnedFiles.filter((f) => fs.existsSync(path.join(repoRoot, f))).map((f) => fileRow(path.join(repoRoot, f))),
    standard: adoption.standard,
    referenceMethod: adoption.referenceMethod,
    head: headCommit(),
    branch: branchName(),
    codeDigest: codeDigest(),
    codeFiles: codeFiles().map((f) => ({ file: f, sha256: sha256File(path.join(repoRoot, f)) })),
    evaluationDigest: compatManifest().digest,
    acceptanceSha256: sha256File(path.join(repoRoot, 'config/gpu-backend/acceptance.json')),
    acceptance: { status: acc.status, acceptedAt: acc.acceptedAt, sourceCommit: acc.source.commit, binary: acc.binary, device: acc.device.uuid, evaluationDigest: acc.compat.digest },
    arms: Object.fromEntries(armKeys.map((k) => [k, { policy: arms[k].policy, markedDdLimit: arms[k].markedDdLimit, ra1S4: arms[k].ra1S4, nbInstrument: arms[k].nbInstrument }])),
    cells,
    replicates,
    reproReplicates,
    cutoffs,
    lanes: matrix(),
    schedule: budgets.study.broad,
    budget: b,
    margins,
    window: { start: windowStart, end: windowEnd, latestSearchLaunch },
    forecasts: { C19: forecastOf('C19') },
    doors: {
      D19: doorSpecs.D19.pins,
      D21: doorSpecs.D21.pins,
      D23: doorSpecs.D23.pins,
      D24: doorSpecs.D24.pins,
      FULL: 'Priority 3 FULL door (canonical files GDX 77dba9b2…, VGT 2ee06310…; the guards of src/vg-l0-risk-envelope-stage-b/doors.ts)'
    },
    references: [...cutoffKeys.map((c) => fileRow(a3SearchFile(c))), fileRow(a3FrozenSelection)],
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
      what: 'the live Phase 7 ACCEPTED record verified independently on this branch (rebuild, device, out-of-band pin); node --no-maglev and the purpose enforced',
      pass: has('E1/verify-acceptance.txt', /^VERIFIED$/m) && has('E1/runtime.txt', /PASS/),
      evidence: [ev('E1/verify-acceptance.txt'), ev('E1/runtime.txt')]
    },
    E3: {
      what: 'fixed-seed mini-pilot of both Stage B arms on D19: GPU = CPU (lanes, qualification, selection, every archived record and envelope); stop/resume and SIGKILL/resume = uninterrupted; CTRL mini lane = Assignment 3 lane; P0/P3 threshold-edge subjects GPU = CPU; archive identity — non-official, engineering only',
      pass: e3.pass === true && e3.codeDigest === digest,
      evidence: [ev('E3/summary.json')]
    },
    E4: {
      what: 'tests (src/vg-l0-risk-envelope-stage-b/tests): P3 = Stage A P3, stage wiring and exact boundaries for BD 30k / PL 25k / DD 40k, denominators, invalid states, seeds, the budget bound, the statistics, the door guards, no hidden rule',
      pass: has('E4/tests.txt', /^ℹ fail 0$/m) && has('E4/tests.txt', /^ℹ pass [1-9]/m) && has('E4/tests.txt', new RegExp(`^codeDigest ${digest}$`, 'm')),
      evidence: [ev('E4/tests.txt')]
    },
    E5: {
      what: 'the study preflight (standard 3.0.0, scope optimization, evaluationBackend gpu-required, NL0 1.0.0 pinned) passes',
      pass: has('E5/preflight.txt', /PASS/) && !has('E5/preflight.txt', /FAIL/),
      evidence: [ev('E5/preflight.txt')]
    },
    E6: {
      what: 'the live official gate opens on D19, D21 and D24 for this study on the committed lineage (attestations)',
      pass: ['D19', 'D21', 'D24'].every((d) => has(`E6/official-preflight-${d}.txt`, /GATE OPEN/)),
      evidence: ['D19', 'D21', 'D24'].map((d) => ev(`E6/official-preflight-${d}.txt`))
    },
    E2: { what: 'per fold, the CTRL reproduction lanes = Assignment 3 (official GPU; results/engineering/E2-C2x.json) before that fold’s search', pass: null }
  };
  const record = {
    kind: 'Stage B engineering gates',
    head: headCommit(),
    codeDigest: digest,
    gates: g,
    pass: ['E1', 'E3', 'E4', 'E5', 'E6'].every((k) => (g as Record<string, { pass: boolean | null }>)[k]!.pass === true),
    sealedAt: new Date().toISOString()
  };

  seal(engineeringFile, record, 'engineering gates');
  console.log(JSON.stringify({ pass: record.pass, gates: Object.fromEntries(Object.entries(g).map(([k, v]) => [k, v.pass])) }));
  if (!record.pass) process.exitCode = 2;
};

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

  const record = { kind: 'Stage B code amendment', id, t: new Date().toISOString(), head: headCommit(), from: allowed.at(-1)!, to: codeDigest(), changed, removed, amendmentsSha256: sha256File(path.join(researchDir, 'AMENDMENTS.md')) };

  if (record.from === record.to) throw new Error('the code closure is unchanged: nothing to amend');
  seal(file, record, `code amendment ${id}`);
  console.log(JSON.stringify({ id, from: record.from.slice(0, 12), to: record.to.slice(0, 12), changed: changed.map((c) => c.file) }));
};

switch (cmd) {
  case 'bound':
    console.log(JSON.stringify(assertBound(), null, 1));
    break;
  case 'matrix':
    console.log(JSON.stringify(matrix(), null, 1));
    break;
  case 'forecast':
    console.log(JSON.stringify(forecastOf(cutoff()), null, 1));
    break;
  case 'freeze':
    freeze();
    break;
  case 'gates':
    gates();
    break;
  case 'code-amendment':
    codeAmendment();
    break;
  case 'repro':
    await runRepro(cutoff(), resume);
    break;
  case 'e2':
    runE2(cutoff());
    break;
  case 'search':
    await runSearch(cutoff(), resume);
    break;
  case 'qualify':
    await runQualify(cutoff(), resume);
    break;
  case 'select':
    runSelect(cutoff());
    break;
  case 'interval': {
    const c = cutoff();

    if (c === 'C24') throw new Error('interval: C19 or C21 (C24 is the validation: `validate`)');
    await runInterval(c, resume);
    break;
  }
  case 'freeze-selection':
    runFreezeSelection();
    break;
  case 'authorize-full':
    runAuthorizeFull();
    break;
  case 'validate':
    await runInterval('C24', resume);
    break;
  default:
    console.error(`unknown command ${cmd ?? '(none)'}; see the header of src/vg-l0-risk-envelope-stage-b/main.ts`);
    process.exit(2);
}
