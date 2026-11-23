// Priority 4's runner (PROTOCOL.md §14): `npm run vg-l0ss -- <command>` from the repository root, started ONLY through
// src/gpu-backend/officialRunner.ts (purpose official-optimization, the study preflight, `node --no-maglev`). Every
// evaluating command opens the official gate itself (src/gpu-backend/official.ts openOfficialGpuSession, via jobs.ts);
// there is no CPU path. Commands:
//   bound                                       lane caps, per-member and per-subject bounds, the ceiling ledger
//   preflight --door D19|D21|D24                E4: the live official gate for this study's staged domain on an
//                                               engineering door (before the freeze; no evaluation beyond the gate's)
//   gates                                       seal results/engineering/gates.json from the E0–E5 evidence
//   freeze                                      seal results/protocol-freeze.json (before any official evaluation)
//   code-amendment --id A<n>                    a sealed code amendment (AMENDMENTS.md)
//   ablate [--resume]                           Stage A: the fixed-parameter ablations on D24
//   search --cutoff C [--resume]                both arms' 128 lanes, one job
//   gate-r --cutoff C                           CTRL R3–R18 = Stage B's sealed lanes (no evaluation)
//   extend --cutoff C [--resume]                the single symmetric extension block (or its sealed non-trigger)
//   informed [--resume]                         C24's informed lanes I1–I4
//   qualify --cutoff C [--resume]
//   select --cutoff C                           (no evaluation; commit before the interval)
//   interval --cutoff C19|C21 [--resume]        the next interval on D21 / D23
//   decompose [--resume]                        the decomposition rows on D24 (after the C24 selection)
//   freeze-selection | authorize-full           (no evaluation)
//   validate [--resume]                         C24 → 2025–2026 on FULL, once
//   outcome                                     the precommitted outcome label (no evaluation)
import type { OfficialGpuSession } from '../gpu-backend/official.ts'; // the official gate — used by jobs.ts
import fs from 'node:fs';
import path from 'node:path';
import { compatManifest } from '../gpu-backend/compat.ts';
import type { StudyDoor } from '../gpu-backend/doors.ts';
import { requireStandardAdoption } from '../research-standard/preflight.ts';
import { doorSpecs } from '../vg-d1-growth-joint/context.ts';
import {
  type CutoffKey,
  PROTOCOL_ID,
  PROTOCOL_VERSION,
  armKeys,
  cells,
  cutoffKeys,
  cutoffs,
  engineeringFile,
  freezeFile,
  replicates,
  repoRoot,
  researchDir,
  resultsDir
} from './context.ts';
import {
  HARD_CEILING,
  broadSchedule,
  consistency,
  extendedSchedule,
  informedSchedule,
  laneCaps,
  ledger,
  perMember,
  perSubject,
  stresses
} from './budget.ts';
import { margins } from './stats.ts';
import { ctrlSpace, expSpace, stagedRadius } from './space.ts';
import {
  branchName,
  codeDigest,
  codeFiles,
  dirtyCode,
  headCommit,
  readJson,
  rel,
  seal,
  sha256File
} from './records.ts';
import { withOfficialJob } from './jobs.ts';
import {
  ablationPoints,
  allowedCodeDigests,
  arms,
  engineeringGates,
  informedPlan,
  runAblation,
  runAuthorizeFull,
  runDecompose,
  runExtend,
  runFreezeSelection,
  runGateR,
  runInformed,
  runInterval,
  runOutcome,
  runQualify,
  runSearch,
  runSelect,
  stageBQualificationFile,
  stageBSearchFile,
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

// the pinned non-closure inputs: the documents, the brief, the analysis and engineering tools
const pinnedFiles = [
  ...studyDocs,
  'research/vg-l0-staged-stop/brief/BRIEF.md',
  'research/vg-l0-trailing-stop-audit/DECISION_REGISTER.md',
  'research/vg-l0-trailing-stop-audit/PRIORITY4_RESEARCH_PROTOCOL_PROPOSED.md',
  'tools/vg-l0-staged-stop/engineering.sh',
  'tools/vg-l0-staged-stop/bench.ts',
  'tools/vg-l0-staged-stop/analyze.ts',
  'tools/vg-l0-staged-stop/diagnose.ts',
  'tools/vg-l0-staged-stop/tools.ts',
  'tools/vg-l0-staged-stop/common.ts',
  'research/vg-l0-staged-stop/RUN_COMMANDS.md',
  'tools/vg-l0-staged-stop/launch.sh',
  'research/vg-l0-staged-stop/chains/fold.sh'
];

const bound = () => ({
  laneCaps,
  consistency: consistency(),
  perMember: perMember(),
  perSubject: perSubject(),
  ceiling: HARD_CEILING,
  ledger: ledger(),
  plannedLanes: { search: cutoffKeys.length * 2 * cells.length * replicates.length, informed: informedPlan().length },
  worstCaseRequested: {
    search: cutoffKeys.length * cells.length * replicates.length * (laneCaps.broad.CTRL + laneCaps.broad.EXP),
    informed: informedPlan().reduce((a, p) => a + laneCaps.informed[p.arm.key], 0)
  }
});

const preflight = async () => {
  const door = opt('door') as StudyDoor;

  if (!['D19', 'D21', 'D24'].includes(door)) throw new Error('--door D19|D21|D24');
  requireStandardAdoption(researchDir, { repoRoot });

  const dirty = dirtyCode(studyDocs);

  if (dirty.length)
    throw new Error(`commit first (an official gate opens on a commit): ${dirty.slice(0, 5).join('; ')}`);
  await withOfficialJob({
    job: `preflight-${door}-${new Date().toISOString().replace(/[-:.]/g, '').slice(0, 15)}Z`,
    resume: false,
    identity: { kind: 'official preflight (E4)', door, stage: 'preflight', codeDigest: codeDigest() },
    door,
    use: 'engineering',
    doorPurpose: `E4 live official gate for the staged domain (${PROTOCOL_ID} ${PROTOCOL_VERSION})`,
    maxFresh: 0,
    body: async (lab, ctx) => {
      console.log(
        `GATE OPEN — job ${ctx.job.id}, attestation ${ctx.attestation}, backend ${ctx.backend}, lab digest ${lab.digest.slice(0, 16)}`
      );
    }
  });
};

const freeze = () => {
  requireStandardAdoption(researchDir, { repoRoot });
  if (fs.existsSync(freezeFile)) throw new Error('the protocol is frozen already');

  const dirty = dirtyCode([...studyDocs, ...pinnedFiles.filter((f) => fs.existsSync(path.join(repoRoot, f)))]);

  if (dirty.length)
    throw new Error(`commit the code and the protocol before the freeze: ${dirty.slice(0, 5).join('; ')}`);

  const c = consistency();

  if (!c.ctrlWorstIsA3 || !c.ctrlCapIsStageB)
    throw new Error(`the CTRL lane bound is not Assignment 3's / Stage B's: ${JSON.stringify(c)}`);

  const acc = readJson<{
    status: string;
    acceptedAt: string;
    source: { commit: string };
    binary: { path: string; sha256: string };
    device: { uuid: string };
    compat: { digest: string };
  }>(path.join(repoRoot, 'config/gpu-backend/acceptance.json'));

  if (acc.status !== 'ACCEPTED') throw new Error('the acceptance record is not ACCEPTED');

  const adoption = readJson<{ standard: { version: string; sha256: string }; referenceMethod: unknown }>(
    path.join(researchDir, 'STANDARD_ADOPTION.json')
  );
  const fileRow = (f: string) => ({ file: rel(f), sha256: sha256File(f) });
  const pts = ablationPoints();
  const record = {
    kind: 'Priority 4 protocol freeze',
    protocol: {
      id: PROTOCOL_ID,
      version: PROTOCOL_VERSION,
      path: rel(path.join(researchDir, 'PROTOCOL.md')),
      sha256: sha256File(path.join(researchDir, 'PROTOCOL.md'))
    },
    pinned: pinnedFiles
      .filter((f) => fs.existsSync(path.join(repoRoot, f)))
      .map((f) => fileRow(path.join(repoRoot, f))),
    standard: adoption.standard,
    referenceMethod: adoption.referenceMethod,
    head: headCommit(),
    branch: branchName(),
    codeDigest: codeDigest(),
    codeFiles: codeFiles().map((f) => ({ file: f, sha256: sha256File(path.join(repoRoot, f)) })),
    evaluationDigest: compatManifest().digest,
    acceptanceSha256: sha256File(path.join(repoRoot, 'config/gpu-backend/acceptance.json')),
    acceptance: {
      status: acc.status,
      acceptedAt: acc.acceptedAt,
      sourceCommit: acc.source.commit,
      binary: acc.binary,
      device: acc.device.uuid,
      evaluationDigest: acc.compat.digest
    },
    engineering: { file: rel(engineeringFile), sha256: sha256File(engineeringFile) },
    arms: Object.fromEntries(
      armKeys.map((k) => [
        k,
        {
          space: arms[k].sp.name,
          genes: arms[k].sp.nGenes,
          maxMoves: arms[k].sp.maxMoves,
          policy: arms[k].policy,
          markedDdLimit: arms[k].markedDdLimit
        }
      ])
    ),
    spaces: { ctrl: ctrlSpace.name, exp: expSpace.name, stagedRadius },
    cells,
    replicates,
    cutoffs,
    schedules: { broad: broadSchedule, extended: extendedSchedule, informed: informedSchedule },
    laneCaps,
    perMember: perMember(),
    perSubject: perSubject(),
    stresses,
    ceiling: HARD_CEILING,
    margins,
    ablation: {
      points: pts.length,
      valid: pts.filter((p) => p.staged && !p.duplicateOf).length,
      invalid: pts.filter((p) => p.errors.length).length,
      duplicates: pts.filter((p) => p.duplicateOf).length
    },
    informedLanes: informedPlan().map((p) => `${p.arm.key} ${p.spec.key}`),
    doors: {
      D19: doorSpecs.D19.pins,
      D21: doorSpecs.D21.pins,
      D23: doorSpecs.D23.pins,
      D24: doorSpecs.D24.pins,
      FULL: 'Priority 3 FULL door (the guards of src/vg-l0-staged-stop/doors.ts)'
    },
    references: [...cutoffKeys.map((c) => fileRow(stageBSearchFile(c))), fileRow(stageBQualificationFile('C24'))],
    frozenAt: new Date().toISOString()
  };

  seal(freezeFile, record, 'protocol freeze');
  console.log(
    `frozen: protocol ${record.protocol.sha256.slice(0, 12)}, code ${record.codeDigest.slice(0, 12)}, acceptance ${record.acceptanceSha256.slice(0, 12)}`
  );
};

// the engineering gates record: each gate's evidence file must exist and carry its pass marker
const gates = () => {
  if (fs.existsSync(engineeringFile)) throw new Error('the engineering gates are sealed already');

  const eng = path.join(resultsDir, 'engineering');
  const has = (f: string, re: RegExp) =>
    fs.existsSync(path.join(eng, f)) && re.test(fs.readFileSync(path.join(eng, f), 'utf8'));
  const ev = (f: string) =>
    fs.existsSync(path.join(eng, f))
      ? { file: rel(path.join(eng, f)), sha256: sha256File(path.join(eng, f)) }
      : { file: f, missing: true };
  const digest = codeDigest();
  const acc = readJson<{ status: string; study?: string; records?: unknown }>(
    path.join(repoRoot, 'config/gpu-backend/acceptance.json')
  );
  const g = {
    E0: {
      what: 'RULE_SPECIFICATION.md (staged-stop@1) committed before the implementation (decisions D1–D17)',
      pass: has('E0/rule.txt', /^PASS/m),
      evidence: [ev('E0/rule.txt')]
    },
    E1: {
      what: 'CPU reference and tests: OFF parity (Growth 1.4.0 fixture, pooled D24 sealed figures and identities), staged mechanism, config, RC 3 book, pooled, P4 space/derive/stats/budget/doors tests; codeDigest recorded',
      pass:
        has('E1/tests.txt', /^ℹ fail 0$/m) &&
        has('E1/tests.txt', /^ℹ pass [1-9]/m) &&
        has('E1/tests.txt', new RegExp(`^codeDigest ${digest}$`, 'm')),
      evidence: [ev('E1/tests.txt')]
    },
    E2: {
      what: 'the CUDA port (protocol v3, capability bits 36/37): the Phase 8 parity strata (staged mixed / edges / all / none, the six exact-threshold fixtures) GPU = CPU — in the acceptance record',
      pass: acc.status === 'ACCEPTED' && has('E4/verify-acceptance.txt', /^VERIFIED$/m),
      evidence: [ev('E4/verify-acceptance.txt')]
    },
    E3: {
      what: '≥ 100,000 seeded random configurations, sanitizers, negative and tamper suites, the fixed-seed P4 mini-optimization GPU = CPU (stop/resume, SIGKILL/resume, concurrency) — research/gpu-phase8 (ACCEPTED)',
      pass: acc.status === 'ACCEPTED' && has('E4/verify-acceptance.txt', /^VERIFIED$/m),
      evidence: [
        ev('E4/verify-acceptance.txt'),
        {
          file: 'config/gpu-backend/acceptance.json',
          sha256: sha256File(path.join(repoRoot, 'config/gpu-backend/acceptance.json'))
        }
      ]
    },
    E4: {
      what: 'the new ACCEPTED record verified independently (rebuild, device, out-of-band pin), the runtime refusals and the record-in-force tests, Stage B control lanes reproduced (acceptance sb gates), the live official gate on D19, D21 and D24 for the staged domain',
      pass:
        has('E4/verify-acceptance.txt', /^VERIFIED$/m) &&
        has('E4/runtime.txt', /^PASS E4 runtime$/m) &&
        ['D19', 'D21', 'D24'].every((d) => has(`E4/official-preflight-${d}.txt`, /GATE OPEN/)),
      evidence: [
        ev('E4/verify-acceptance.txt'),
        ev('E4/runtime.txt'),
        ...['D19', 'D21', 'D24'].map((d) => ev(`E4/official-preflight-${d}.txt`))
      ]
    },
    E5: {
      what: 'the benchmark of the accepted binary (non-official, benchmark seeds) and the study preflight (standard 3.0.0, scope optimization, gpu-required)',
      pass: has('E5/bench.json', /"pass": true/) && has('E5/preflight.txt', /PASS/) && !has('E5/preflight.txt', /FAIL/),
      evidence: [ev('E5/bench.json'), ev('E5/preflight.txt')]
    }
  };
  const record = {
    kind: 'Priority 4 engineering gates',
    head: headCommit(),
    codeDigest: digest,
    gates: g,
    pass: engineeringGates.every((k) => g[k].pass === true),
    sealedAt: new Date().toISOString()
  };

  seal(engineeringFile, record, 'engineering gates');
  console.log(
    JSON.stringify({ pass: record.pass, gates: Object.fromEntries(Object.entries(g).map(([k, v]) => [k, v.pass])) })
  );
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
  const changed = now
    .filter((f) => before.get(f.file) !== f.sha256)
    .map((f) => ({ file: f.file, frozenSha256: before.get(f.file) ?? null, sha256: f.sha256 }));
  const removed = [...before.keys()].filter((f) => !now.some((x) => x.file === f));
  const dirty = dirtyCode(studyDocs);

  if (dirty.length) throw new Error(`commit the amended code and AMENDMENTS.md first: ${dirty.slice(0, 5).join('; ')}`);
  if (!fs.readFileSync(path.join(researchDir, 'AMENDMENTS.md'), 'utf8').includes(`**${id} `))
    throw new Error(`AMENDMENTS.md has no entry ${id}`);

  const record = {
    kind: 'Priority 4 code amendment',
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
  console.log(
    JSON.stringify({
      id,
      from: record.from.slice(0, 12),
      to: record.to.slice(0, 12),
      changed: changed.map((c) => c.file)
    })
  );
};

switch (cmd) {
  case 'bound':
    console.log(JSON.stringify(bound(), null, 1));
    break;
  case 'preflight':
    await preflight();
    break;
  case 'gates':
    gates();
    break;
  case 'freeze':
    freeze();
    break;
  case 'code-amendment':
    codeAmendment();
    break;
  case 'ablate':
    await runAblation(resume);
    break;
  case 'search':
    await runSearch(cutoff(), resume);
    break;
  case 'gate-r':
    runGateR(cutoff());
    break;
  case 'extend':
    await runExtend(cutoff(), resume);
    break;
  case 'informed':
    await runInformed(resume);
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
  case 'decompose':
    await runDecompose(resume);
    break;
  case 'freeze-selection':
    runFreezeSelection();
    break;
  case 'authorize-full':
    runAuthorizeFull();
    break;
  case 'validate':
    await runInterval('C24', resume);
    break;
  case 'outcome':
    runOutcome();
    break;
  default:
    console.error(`unknown command ${cmd ?? '(none)'}; see the header of src/vg-l0-staged-stop/main.ts`);
    process.exit(2);
}
