// The protocol freeze (PROTOCOL.md §14): the protocol's, the amendment log's, the brief's, the adoption manifest's and the
// control manifest's sha256; the sealed engineering gates; the code closure (every repository .ts
// file transitively imported by the study's modules, tests excluded) and its digest; the evaluation digest (Priority 3's
// evaluation files + this study's worker and doors) and Priority 3's sealed evaluation digest; the door pins and
// canonical data; git HEAD; the per-cutoff proposal plans, the evaluation caps and the resource contract. Written once
// (read-only); a second freeze is refused. Every later stage checks the evaluation code against it.
import { execSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { canonical, doorSpecs } from '../vg-d1-growth-joint/context.ts';
import { p3 } from '../vg-d1-growth-diagnostic/context.ts';
import { plans } from './budgets.ts';
import {
  STUDY,
  chronology,
  codeDir,
  controlManifestFile,
  economics,
  freezeFile,
  log,
  repoRoot,
  researchDir,
  resources,
  resultsDir
} from './context.ts';
import { codeDigest, evaluationFiles, p3EvaluationDigest } from './lab.ts';
import { readJson, sealJson, sha256File } from './records.ts';

// The transitive closure of relative imports from the study's entry modules.
export const codeClosure = () => {
  const seen = new Set<string>();
  const stack = fs
    .readdirSync(codeDir)
    .filter((f) => f.endsWith('.ts'))
    .map((f) => path.join(codeDir, f));

  while (stack.length) {
    const file = stack.pop()!;

    if (seen.has(file)) continue;
    seen.add(file);

    const text = fs.readFileSync(file, 'utf8');

    for (const m of text.matchAll(
      /(?:import|export)[^'"]*?from\s+['"]([^'"]+)['"]|import\(\s*['"]([^'"]+)['"]\s*\)/g
    )) {
      const spec = m[1] ?? m[2]!;

      if (spec === '#lib') stack.push(path.join(repoRoot, 'src/lib/index.ts'));
      else if (spec === '#types') stack.push(path.join(repoRoot, 'src/types/index.ts'));
      else if (spec.startsWith('.') || spec.startsWith('/')) {
        const target = path.resolve(path.dirname(file), spec);

        if (fs.existsSync(target) && fs.statSync(target).isFile()) stack.push(target);
      }
    }
  }

  return [...seen]
    .map((f) => path.relative(repoRoot, f))
    .filter((f) => !f.includes('/tests/'))
    .sort()
    .map((f) => ({ file: f, sha256: sha256File(path.join(repoRoot, f)) }));
};

export const closureDigest = (closure = codeClosure()) =>
  createHash('sha256')
    .update(closure.map((x) => `${x.file}:${x.sha256}`).join('\n'))
    .digest('hex');

export const freezeProtocol = (extra: { proposalPlans: unknown; evaluationCaps: unknown }) => {
  if (p3EvaluationDigest() !== p3.evaluationDigest)
    throw new Error(
      "Priority 3's evaluation code differs from its sealed parity digest: the engine is not the verified one"
    );

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
    evaluationFiles,
    evaluationDigest: codeDigest(),
    priority3EvaluationDigest: p3.evaluationDigest,
    closureDigest: closureDigest(closure),
    closure,
    canonicalData: canonical,
    doors: doorSpecs,
    chronology,
    economics,
    plans: plans.study,
    pilotPlans: plans.pilot,
    ...extra,
    resources: { ...resources, workers: Number(process.env.GDXG_WORKERS ?? resources.workers) }
  };

  sealJson(freezeFile, record, 'protocol freeze');
  log(
    `protocol frozen: ${record.protocolSha256.slice(0, 12)}…, closure ${closure.length} files, digest ${record.closureDigest.slice(0, 12)}…`
  );
  return record;
};

// Every later stage checks that the evaluation code is the frozen one (or an acknowledged amendment).
export const assertFrozenCode = () => {
  if (!fs.existsSync(freezeFile)) return null;

  const f = readJson<{ evaluationDigest: string }>(freezeFile);
  const now = codeDigest();
  const ackFile = path.join(resultsDir, 'code-acknowledgements.jsonl');
  const acks = fs.existsSync(ackFile)
    ? fs
        .readFileSync(ackFile, 'utf8')
        .trim()
        .split('\n')
        .filter(Boolean)
        .map((l) => JSON.parse(l) as { digest: string })
    : [];

  if (now !== f.evaluationDigest && !acks.some((a) => a.digest === now))
    throw new Error(
      `the evaluation code changed after the freeze (${now.slice(0, 12)}… ≠ ${f.evaluationDigest.slice(0, 12)}…) without an acknowledged amendment`
    );
  if (p3EvaluationDigest() !== p3.evaluationDigest) throw new Error("Priority 3's evaluation code changed");
  return now;
};
