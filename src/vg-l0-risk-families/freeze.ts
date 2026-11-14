// The protocol freeze (PROTOCOL.md §14; the shadow-eligibility study's freeze.ts bound to this study): the protocol's,
// amendment log's, brief's, adoption manifest's, RC 2 specification's and reference method's sha256; the EVALUATION
// digest (Priority 3's evaluation files + the import closure of this study's worker: RC 1, RC 2, the evaluation path and
// the door loader); the DECISION digest (the files that search, qualify, select, chain the folds, freeze the selection
// and validate: a change after the freeze needs an amendment); Priority 3's evaluation digest NOW, which must equal its
// historical sealed digest (this branch's engine files are untouched); door pins, canonical data, git HEAD, budgets and
// the resource contract. Written once (read-only); every later stage checks both digests against it.
import { execSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { canonical, doorSpecs } from '../vg-d1-growth-joint/context.ts';
import { p3 } from '../vg-d1-growth-diagnostic/context.ts';
import { budgets, finishReserve, perLaneCap, perMemberCap, simulationCaps } from './budgets.ts';
import { STUDY, chronology, codeDir, economics, freezeFile, log, repoRoot, researchDir, resources, resultsDir } from './context.ts';
import { codeDigest, evaluationFiles, p3EvaluationDigest } from './lab.ts';
import { importClosure, readJson, sealJson, sha256File } from './records.ts';

export const referenceMethod = { id: 'NL0', path: 'docs/research/methods/NEW_L0_METHOD.md', version: '1.0.0' } as const;
export const referenceMethodPin = () => {
  const sha = sha256File(path.join(repoRoot, referenceMethod.path));
  const reg = readJson<{ methods: { id: string; versions: { version: string; sha256: string }[] }[] }>(
    path.join(repoRoot, 'docs/research/methods/methods.versions.json')
  );
  const v = reg.methods.find((m) => m.id === referenceMethod.id)?.versions.find((x) => x.version === referenceMethod.version);

  if (!v || v.sha256 !== sha) throw new Error(`${referenceMethod.path} is not the registered NL0 ${referenceMethod.version}`);
  return { ...referenceMethod, sha256: sha };
};

// The decision code: every file that proposes, ranks, qualifies, selects, chains the folds, freezes the selection or
// validates. Report-only diagnostics (diagnostics.ts, tools/) are outside it.
export const decisionEntries = ['stages.ts', 'search.ts', 'space.ts', 'fitness.ts', 'qualify.ts', 'select.ts', 'budgets.ts', 'folds.ts', 'final.ts', 'nl0.ts'];
export const decisionFiles = () =>
  importClosure(decisionEntries.map((f) => path.join(codeDir, f)).filter((f) => fs.existsSync(f))).filter((f) => f.startsWith(`src/${STUDY}/`));
export const digestFiles = (files: readonly string[]) =>
  createHash('sha256')
    .update(files.map((f) => `${f}:${sha256File(path.join(repoRoot, f))}`).join('\n'))
    .digest('hex');
export const decisionDigest = () => digestFiles(decisionFiles());

export const codeClosure = () =>
  importClosure(
    fs
      .readdirSync(codeDir)
      .filter((f) => f.endsWith('.ts'))
      .map((f) => path.join(codeDir, f))
  ).map((f) => ({ file: f, sha256: sha256File(path.join(repoRoot, f)) }));

export const freezeProtocol = () => {
  const parityFile = path.join(resultsDir, 'parity', 'parity.json');
  const parity = readJson<{ failed: number; priority3EvaluationDigest: string; evaluationDigest: string }>(parityFile);

  if (parity.failed !== 0) throw new Error('stage V has not passed: no freeze');
  if (parity.evaluationDigest !== codeDigest()) throw new Error('the evaluation code changed after stage V: rerun stage V');
  if (p3EvaluationDigest() !== p3.evaluationDigest) throw new Error("Priority 3's evaluation digest is not its historical sealed digest");

  const record = {
    kind: `${STUDY} protocol freeze`,
    frozenAt: new Date().toISOString(),
    gitHead: execSync('git rev-parse HEAD', { cwd: repoRoot }).toString().trim(),
    protocolSha256: sha256File(path.join(researchDir, 'PROTOCOL.md')),
    amendmentsSha256: sha256File(path.join(researchDir, 'AMENDMENTS.md')),
    briefSha256: sha256File(path.join(researchDir, 'brief', 'BRIEF.md')),
    adoptionSha256: sha256File(path.join(researchDir, 'STANDARD_ADOPTION.json')),
    specificationRc2Sha256: sha256File(path.join(researchDir, 'SPECIFICATION_RC2.md')),
    parity: { file: 'results/parity/parity.json', sha256: sha256File(parityFile) },
    referenceMethod: referenceMethodPin(),
    evaluationFiles,
    evaluationDigest: codeDigest(),
    decisionFiles: decisionFiles(),
    decisionDigest: decisionDigest(),
    priority3EvaluationDigest: p3EvaluationDigest(),
    priority3EvaluationDigestSealedHistorical: p3.evaluationDigest,
    closure: codeClosure(),
    canonicalData: canonical,
    doors: doorSpecs,
    chronology,
    economics,
    budgets,
    replicates: { broad: 2, refine: 2 },
    perLaneCap,
    perMemberCap,
    simulationCaps,
    finishReserve,
    resources
  };

  sealJson(freezeFile, record, 'protocol freeze');
  log(`protocol frozen: ${record.protocolSha256.slice(0, 12)}…, evaluation ${record.evaluationDigest.slice(0, 12)}…, decision ${record.decisionDigest.slice(0, 12)}…`);
  return record;
};

// Every later stage checks that the evaluation and decision code are the frozen ones, or digests acknowledged by an
// amendment in results/code-acknowledgements.jsonl ({ t, kind, digest, amendment }).
export interface Acknowledgement {
  t: string;
  kind: 'evaluation' | 'decision';
  digest: string;
  amendment: string;
}

export const acknowledgements = (): Acknowledgement[] => {
  const f = path.join(resultsDir, 'code-acknowledgements.jsonl');

  return fs.existsSync(f)
    ? fs
        .readFileSync(f, 'utf8')
        .trim()
        .split('\n')
        .filter(Boolean)
        .map((l) => JSON.parse(l) as Acknowledgement)
    : [];
};

export const assertFrozenCode = () => {
  if (!fs.existsSync(freezeFile)) return null;

  const f = readJson<{ evaluationDigest: string; decisionDigest: string; priority3EvaluationDigest: string }>(freezeFile);
  const acks = acknowledgements();
  const check = (kind: 'evaluation' | 'decision', now: string, frozen: string) => {
    if (now !== frozen && !acks.some((a) => a.kind === kind && a.digest === now))
      throw new Error(`the ${kind} code changed after the freeze (${now.slice(0, 12)}… ≠ ${frozen.slice(0, 12)}…) without an acknowledged amendment`);
  };

  check('evaluation', codeDigest(), f.evaluationDigest);
  check('decision', decisionDigest(), f.decisionDigest);
  if (p3EvaluationDigest() !== f.priority3EvaluationDigest) throw new Error("Priority 3's evaluation code changed");
  return { evaluation: codeDigest(), decision: decisionDigest() };
};
