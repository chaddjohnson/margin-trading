// The protocol freeze (PROTOCOL.md §14; 5B's freeze.ts bound to this study): the protocol's, the amendment log's, the
// brief's, the adoption manifest's, the control manifest's and the reference method's sha256; the code closure (every
// repository .ts file transitively imported by the study's modules, tests excluded) and its digest; the evaluation
// digest (Priority 3's evaluation files + this study's worker and doors); Priority 3's evaluation digest NOW and its
// historical sealed digest. They differ by design: the hold-unit option (Phase 3) touched Priority 3's books/evaluate
// and the shared exit engines; stage V (G2) proves on 5B's archived records that the default unit is unchanged, and the
// freeze requires that sealed proof bound to the current digest. Door pins, canonical data, git HEAD, budgets and the
// resource contract. Written once (read-only); every later stage checks the evaluation code against it.
import { execSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { canonical, doorSpecs } from '../vg-d1-growth-joint/context.ts';
import { p3 } from '../vg-d1-growth-diagnostic/context.ts';
import { budgets, finishReserve, simulationCaps } from './budgets.ts';
import {
  STUDY,
  chronology,
  codeDir,
  controlManifestFile,
  economics,
  freezeFile,
  simulationCeiling,
  log,
  repoRoot,
  researchDir,
  resources,
  resultsDir
} from './context.ts';
import { codeDigest, evaluationFiles, p3EvaluationDigest } from './lab.ts';
import { importClosure, readJson, sealJson, sha256File } from './records.ts';

// The reference method this study reproduces (standard 2.1.0 §4.8), pinned by the adoption manifest and the freeze.
export const referenceMethod = { id: 'NL0', path: 'docs/research/methods/NEW_L0_METHOD.md', version: '1.0.0' } as const;
export const referenceMethodPin = () => {
  const sha = sha256File(path.join(repoRoot, referenceMethod.path));
  const reg = readJson<{ methods: { id: string; versions: { version: string; sha256: string }[] }[] }>(
    path.join(repoRoot, 'docs/research/methods/methods.versions.json')
  );
  const v = reg.methods
    .find((m) => m.id === referenceMethod.id)
    ?.versions.find((x) => x.version === referenceMethod.version);

  if (!v || v.sha256 !== sha)
    throw new Error(`${referenceMethod.path} is not the registered NL0 ${referenceMethod.version}`);
  return { ...referenceMethod, sha256: sha };
};

// The transitive closure of relative imports from the study's entry modules (tests excluded).
export const codeClosure = () =>
  importClosure(
    fs
      .readdirSync(codeDir)
      .filter((f) => f.endsWith('.ts'))
      .map((f) => path.join(codeDir, f))
  ).map((f) => ({ file: f, sha256: sha256File(path.join(repoRoot, f)) }));

export const closureDigest = (closure = codeClosure()) =>
  createHash('sha256')
    .update(closure.map((x) => `${x.file}:${x.sha256}`).join('\n'))
    .digest('hex');

export const freezeProtocol = () => {
  const parity = readJson<{
    failed: number;
    priority3EvaluationDigest: string;
    gates: Record<string, { failed: number }>;
  }>(path.join(resultsDir, 'parity', 'parity.json'));

  if (parity.failed !== 0 || !parity.gates.G2 || parity.gates.G2.failed !== 0)
    throw new Error('stage V (with the G2 archive replay) has not passed: no freeze');
  if (parity.priority3EvaluationDigest !== p3EvaluationDigest())
    throw new Error("Priority 3's evaluation code changed after stage V: rerun stage V");

  const closure = codeClosure();
  const record = {
    kind: `${STUDY} protocol freeze`,
    frozenAt: new Date().toISOString(),
    gitHead: execSync('git rev-parse HEAD', { cwd: repoRoot }).toString().trim(),
    protocolSha256: sha256File(path.join(researchDir, 'PROTOCOL.md')),
    amendmentsSha256: sha256File(path.join(researchDir, 'AMENDMENTS.md')),
    briefSha256: sha256File(path.join(researchDir, 'brief', 'BRIEF.md')),
    adoptionSha256: sha256File(path.join(researchDir, 'STANDARD_ADOPTION.json')),
    controlManifestSha256: sha256File(controlManifestFile),
    parity: { file: 'results/parity/parity.json', sha256: sha256File(path.join(resultsDir, 'parity', 'parity.json')) },
    referenceMethod: referenceMethodPin(),
    evaluationFiles,
    evaluationDigest: codeDigest(),
    priority3EvaluationDigest: p3EvaluationDigest(),
    priority3EvaluationDigestSealedHistorical: p3.evaluationDigest,
    closureDigest: closureDigest(closure),
    closure,
    canonicalData: canonical,
    doors: doorSpecs,
    chronology,
    economics,
    budgets,
    simulationCaps,
    finishReserve,
    simulationCeiling,
    resources
  };

  sealJson(freezeFile, record, 'protocol freeze');
  log(
    `protocol frozen: ${record.protocolSha256.slice(0, 12)}…, closure ${closure.length} files, digest ${record.closureDigest.slice(0, 12)}…`
  );
  return record;
};

// Every later stage checks that the evaluation code is the frozen one, or a digest acknowledged by an amendment in
// results/code-acknowledgements.jsonl ({ digest, amendment, parity }): an acknowledged evaluation change must name its
// own sealed stage V record, which the stage guards require with 0 failures (PROTOCOL.md §12, AMENDMENTS.md A1).
export interface Acknowledgement {
  t: string;
  digest: string;
  amendment: string;
  parity: string; // repository-relative sealed stage V record of that code
}

export const acknowledgements = (): Acknowledgement[] => {
  const ackFile = path.join(resultsDir, 'code-acknowledgements.jsonl');

  return fs.existsSync(ackFile)
    ? fs
        .readFileSync(ackFile, 'utf8')
        .trim()
        .split('\n')
        .filter(Boolean)
        .map((l) => JSON.parse(l) as Acknowledgement)
    : [];
};

export const assertFrozenCode = (): { digest: string; ack: Acknowledgement | null } | null => {
  if (!fs.existsSync(freezeFile)) return null;

  const f = readJson<{ evaluationDigest: string; priority3EvaluationDigest: string }>(freezeFile);
  const now = codeDigest();
  const ack = now === f.evaluationDigest ? null : (acknowledgements().find((a) => a.digest === now) ?? null);

  if (now !== f.evaluationDigest && !ack)
    throw new Error(
      `the evaluation code changed after the freeze (${now.slice(0, 12)}… ≠ ${f.evaluationDigest.slice(0, 12)}…) without an acknowledged amendment`
    );
  if (p3EvaluationDigest() !== f.priority3EvaluationDigest) throw new Error("Priority 3's evaluation code changed");
  return { digest: now, ack };
};
