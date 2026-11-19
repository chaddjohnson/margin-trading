// The frozen study manifest (STUDY_MANIFEST.json: subjects with their exact vectors, the arms, the instruments, the
// planned counts, the episodes and the interpretation parameters), the protocol freeze (results/protocol-freeze.json),
// and the FULL manifest (FULL_MANIFEST.json) — each written once.
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { canonical, doorSpecs } from '../vg-d1-growth-joint/context.ts';
import { p3 } from '../vg-d1-growth-diagnostic/context.ts';
import { checkP3 } from '../vg-d1-growth-diagnostic/stages.ts';
import {
  STUDY,
  ceilings,
  freezeFile,
  fullManifestFile,
  manifestFile,
  repoRoot,
  researchDir,
  resources,
  windows
} from './context.ts';
import { activeInputs, coreDraws, familyNames, standaloneDraws } from './instruments.ts';
import { L2 } from './lifecycle.ts';
import { readJson, rel, sealJson, sha256File } from './records.ts';
import {
  archivePins,
  codeDigest,
  episodes,
  fullSubjects,
  nbSubjects,
  neighbourhoodPlan,
  stageFiles,
  standalonePlan,
  studyFiles,
  verificationTasks
} from './stages.ts';
import { band } from './verdicts.ts';
import { loadSubjects } from './subjects.ts';

// The L0 full-history targets the brief lists (Priority 3's harmonized conventions): verification targets only.
export const knownFull: Record<string, { net: number; dd: number }> = {
  D: { net: 343175.82, dd: 21303.61 },
  C4: { net: 401867.24, dd: 21536.85 },
  C85: { net: 339905.35, dd: 19821.14 },
  A: { net: 450270.82, dd: 21536.85 },
  B: { net: 408898.55, dd: 20801.07 },
  V4: { net: 271525.33, dd: 19534.41 },
  V85: { net: 252359.65, dd: 19556.63 },
  SG: { net: 141157.37, dd: 17709.96 },
  S4: { net: 145468.46, dd: 14578.1 },
  S85: { net: 160974.09, dd: 19344.8 }
};

export const buildManifest = () => {
  const subjects = loadSubjects();
  const adoption = readJson<{ standard: { version: string; sha256: string } }>(
    path.join(researchDir, 'STANDARD_ADOPTION.json')
  );
  const v = verificationTasks(subjects);
  const n = neighbourhoodPlan(subjects);
  const s = standalonePlan(subjects);
  const full = fullSubjects(subjects);
  const plan = {
    V: { development: v.d24.length + v.d23.length },
    C: { development: subjects.length * 3 + 1 },
    N: {
      development: n.tasks.length,
      archivedL0: n.archived.length,
      note: 'archived L0 draws missing from the archive are evaluated fresh (disclosed)'
    },
    S: { development: s.length },
    P: { development: 0 },
    F: { full: full.length * 3 + 1 }
  };

  return {
    study: STUDY,
    kind: 'STUDY MANIFEST — frozen before any development performance result of L1 or L2; never edited (changes go to AMENDMENTS.md)',
    standard: adoption.standard,
    brief: {
      file: `research/${STUDY}/brief/BRIEF.md`,
      sha256: sha256File(path.join(researchDir, 'brief', 'BRIEF.md'))
    },
    priority3: {
      study: `research/${p3.study}`,
      evaluationDigest: p3.evaluationDigest,
      closureDigest: p3.closureDigest,
      records: p3.records
    },
    windows,
    arms: {
      L0: 'the current model (exact control): a refused Growth entry proceeds as an unfunded virtual position; freed capital never revives it (Priority 3 evaluate.ts run, unchanged)',
      L1: 'Growth responds to actual funding: a refused request leaves the book flat (decision-time transitions canonical, no order, no position); no retry; later entries only from fresh canonical decisions',
      L2: 'L1 plus one retained refused BASE opportunity per Growth book (continuation refusals stay L1), reassessed at each completed signal bar while flat, after the canonical decisions of the instant',
      L2constants: {
        ...L2,
        note: 'fixed experimental design choices (the brief §5), never optimized or changed after results'
      },
      D1: "D1's canonical shadow lifecycle in every arm"
    },
    subjects: subjects.map((x) => ({
      key: x.key,
      label: x.label,
      group: x.group,
      p3Key: x.p3Key,
      id: x.id,
      enabled: x.enabled,
      need: x.need,
      growth: x.growth,
      activeInputs: activeInputs(x),
      quad: x.quad,
      options: x.options
    })),
    instruments: {
      core: {
        subjects: nbSubjects,
        families: {
          confirm: "3 × 128, labels ('confirm', rep, 'C24'), scale 1",
          small: "128, labels ('small', 'C24'), scale 0.5",
          wide: "128, labels ('wide', 'C24'), scale 1.5"
        },
        scope: 'joint for pools with D1, g for Growth-only pools (Priority 3)',
        draws: Object.fromEntries(
          nbSubjects.map((k) => {
            const x = subjects.find((y) => y.key === k)!;

            return [k, Object.fromEntries(familyNames.map((f) => [f, coreDraws(x, f).length]))];
          })
        ),
        reference: 'D: Priority 3 archived L0 families (invariant under L1/L2, stage V)'
      },
      standalone: {
        subjects: ['SG', 'S4', 'S85'],
        seeds: "deriveSeed('vg-growth-funding-lifecycle', 'nbhd', 'standalone', family, rep)",
        columns: 'one Latin-hypercube column per Growth numeric input (50), common to every subject',
        radius:
          '10% of each input range × scale (growth140-vgt-stable radiusValue); fine grid; clip to the box widened to include the centre',
        families: { confirm: '3 × 128, scale 1', small: '128, scale 0.5', wide: '128, scale 1.5' },
        draws: Object.fromEntries(
          subjects
            .filter((x) => x.group === 'standalone')
            .map((x) => [x.key, Object.fromEntries(familyNames.map((f) => [f, standaloneDraws(x, f).length]))])
        )
      }
    },
    episodes,
    interpretation: {
      band,
      R1: 'per lifecycle, the Pareto set of {E, C4, C85, A, B} on centre net ↑, centre DD ↓, confirmation p10 net ↑, confirmation p90 DD ↓',
      R2: 'per subject, median paired Δnet and Δ p90 DD on the confirmation draws: helps / mixed / hurts / hurts (tail risk) / helps (tail risk) / little with ±$2,500 bands (report-only)',
      R3: 'admission of GDX Growth: (A − C4), (B − C85), (GP4 − S4), (GP85 − S85) at the centre: net, VGT Growth booked, D1 booked; L1/L2 vs L0',
      R4: 'E against A, B, C4, C85 per lifecycle: dominance on the four objectives; E non-dominated or not',
      R5: 'standalone: retention p10/centre net and inflation p90 DD/centre DD on the common instrument; stronger iff better on both',
      R6: 'an arm deserves 3B optimization (provisional) iff labelled helps* vs L0 for ≥ 2 of {A, B, GP4, GP85} and hurts* for none of the nine core Growth subjects'
    },
    plan,
    full: { subjects: full.map((x) => x.key), modes: ['L0', 'L1', 'L2'], native: true, knownL0: knownFull },
    ceilings,
    resources
  };
};

export const writeManifest = () => {
  if (fs.existsSync(manifestFile)) throw new Error(`${rel(manifestFile)} exists: the manifest is written once`);
  return sealJson(manifestFile, buildManifest(), 'study manifest');
};

export const freeze = () => {
  const p = checkP3();

  return sealJson(
    freezeFile,
    {
      kind: `${STUDY} protocol freeze`,
      frozenAt: new Date().toISOString(),
      gitHead: execSync('git rev-parse HEAD', { cwd: repoRoot }).toString().trim(),
      protocolSha256: sha256File(path.join(researchDir, 'PROTOCOL.md')),
      amendmentsSha256: sha256File(path.join(researchDir, 'AMENDMENTS.md')),
      briefSha256: sha256File(path.join(researchDir, 'brief', 'BRIEF.md')),
      adoptionSha256: sha256File(path.join(researchDir, 'STANDARD_ADOPTION.json')),
      manifestSha256: sha256File(manifestFile),
      codeDigest: codeDigest(),
      studyFiles: studyFiles(),
      priority3: p,
      archives: archivePins(),
      canonicalData: canonical,
      doors: { D24: doorSpecs.D24, D23: doorSpecs.D23 },
      ceilings,
      resources
    },
    'protocol freeze'
  );
};

export const writeFullManifest = () => {
  for (const s of ['V', 'C', 'N', 'S', 'P'] as const)
    if (!fs.existsSync(stageFiles[s])) throw new Error(`stage ${s} must be sealed before the FULL manifest`);

  const m = readJson<{ full: { subjects: string[]; modes: string[]; native: boolean } }>(manifestFile);
  const sealedBefore = Object.fromEntries(
    [manifestFile, freezeFile, ...(['V', 'C', 'N', 'S', 'P'] as const).map((s) => stageFiles[s])].map((f) => [
      rel(f),
      sha256File(f)
    ])
  );

  return sealJson(
    fullManifestFile,
    {
      kind: 'FULL MANIFEST — the frozen full-history evaluation (validation reporting on previously examined history); sealed and committed before FULL opens',
      writtenAt: new Date().toISOString(),
      subjects: m.full.subjects,
      modes: m.full.modes,
      native: m.full.native,
      boundary: windows.boundary,
      validation: windows.validation,
      rule: 'retrospective comparison, not an untouched holdout: validation can challenge the development verdicts (stage P) but cannot trigger a new rule, rescue search or revised retry parameters',
      sealedBefore
    },
    'FULL manifest'
  );
};
