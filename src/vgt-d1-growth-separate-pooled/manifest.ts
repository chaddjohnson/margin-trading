// The comparison manifest (PROTOCOL.md §3–§7): written and sealed BEFORE any evaluation of the pair, then committed;
// the comparison and neighbourhood stages refuse to start unless it is sealed, committed and unchanged.
//
// It resolves the pair from Priority 2's committed frozen selection (never from a later or better-looking member),
// verifies the identities against the sealed C24 qualification record, exports the full effective parameter vectors,
// fixes the six architecture/priority cases, the controls with their sealed sources, the causal-removal and
// matched-trade comparisons, and the neighbourhood families (seeds, sizes, scopes, and the sha256 of every family's
// ordered neighbour identities), all without evaluating anything.
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { d1StrategyParams, growthParamsOf } from '../vgt-d1-growth-joint/books.ts';
import { chronology, economics, seedOf } from '../vgt-d1-growth-joint/context.ts';
import { closureDigest, codeClosure } from '../vgt-d1-growth-joint/freeze.ts';
import { codeDigest } from '../vgt-d1-growth-joint/lab.ts';
import { fidelity, stresses, togglesOf } from '../vgt-d1-growth-joint/qualify.ts';
import {
  type Joint,
  describeJoint,
  effectiveOf,
  growthId,
  jointId,
  neighbourhood,
  normalize
} from '../vgt-d1-growth-joint/space.ts';
import { defaults as allocatorDefaults } from '../vgt-d1-growth-joint/allocator.ts';
import { checkAdoption, sha256File as standardSha } from '../research-standard/preflight.ts';
import { STUDY, boundary, codeDir, manifestFile, p2, repoRoot, researchDir, resources, sealsLog } from './context.ts';
import { isCommittedUnchanged, isSealed, readJson, rel, sealJson, sha256File, sha256Text } from './records.ts';

type Enabled = { D1: boolean; G: boolean } | null;

interface FrozenP2 {
  primary: string;
  members: { label: string; id: string; joint: Joint }[];
  singleFamily: { d1only: { label: string; joint: Joint }; gonly: { label: string; joint: Joint } };
  controls: { label: string; id: string; joint: Joint; enabled: Enabled }[];
}

interface EvidenceP2 {
  label: string;
  kind: string;
  id: string;
  joint: Joint;
  qualified: boolean;
  centre: { net: number; dd: number };
  select: { robust: number; p90Dd: number };
  confirm: { median: number; p10: number; p90Dd: number };
}

export const p2File = (name: string) => path.join(p2.dir, name);

// Every Priority 2 input is the sealed one (sha256 as pinned before this study began).
export const verifyP2Pins = () => {
  const out: Record<string, string> = {};

  for (const [name, pin] of Object.entries(p2.pins)) {
    const sha = sha256File(p2File(name));

    if (sha !== pin) throw new Error(`Priority 2 record ${name} changed: ${sha} ≠ ${pin}`);
    out[`research/${p2.study}/${name}`] = sha;
  }

  const digest = codeDigest();

  if (digest !== p2.evaluationDigest)
    throw new Error(`Priority 2's evaluation code changed: ${digest} ≠ the frozen ${p2.evaluationDigest}`);

  return { records: out, evaluationDigest: digest };
};

export const loadP2 = () => ({
  frozen: readJson<FrozenP2>(p2File('FROZEN_SELECTION.json')),
  selection: readJson<{
    singleFamily: { d1only: { primary: string }; gonly: { primary: string } };
    evidence: EvidenceP2[];
  }>(p2File('results/folds/C24/selection.json')),
  validation: readJson<{ rows: { label: string; id: string }[] }>(p2File('results/validation/validation.json'))
});

// The six cases (PROTOCOL.md §4): the primary diagnostic first.
export const caseSpecs = [
  { key: 'A · D1-first', role: 'primary diagnostic', a: { arch: 'A', d1Target: 1, gTarget: 1, first: 'D1' } },
  { key: 'A · Growth-first', role: 'sensitivity', a: { arch: 'A', d1Target: 1, gTarget: 1, first: 'G' } },
  { key: 'B 100/100 · D1-first', role: 'sensitivity', a: { arch: 'B', d1Target: 1, gTarget: 1, first: 'D1' } },
  { key: 'B 100/100 · Growth-first', role: 'sensitivity', a: { arch: 'B', d1Target: 1, gTarget: 1, first: 'G' } },
  { key: 'B 50/50 · D1-first', role: 'sensitivity', a: { arch: 'B', d1Target: 0.5, gTarget: 0.5, first: 'D1' } },
  { key: 'B 50/50 · Growth-first', role: 'sensitivity', a: { arch: 'B', d1Target: 0.5, gTarget: 0.5, first: 'G' } }
] as const;

// The comparators (PROTOCOL.md §5): Priority 2's frozen joint primary, the two optimized families alone, the fixed
// D1 primary + #4 / + 08500a60 combinations (A, and the B rows matched to the B sensitivities) and their standalones.
export const controlLabels = [
  'D1 primary + Growth #4 · A',
  'D1 primary + Growth #4 · B 100/100',
  'D1 primary + Growth #4 · B 50/50',
  'D1 primary + Growth 08500a60 · A',
  'D1 primary + Growth 08500a60 · B 100/100',
  'D1 primary + Growth 08500a60 · B 50/50',
  'D1 primary alone',
  'Growth #4 alone',
  'Growth 08500a60 alone'
];

export interface Subject {
  key: string;
  role: string;
  joint: Joint;
  id: string;
  enabled: Enabled;
  source: { development: string | null; validation: string | null } | null; // Priority 2 record labels (comparators)
}

export const resolvePair = () => {
  const { frozen, selection } = loadP2();
  const d1 = frozen.singleFamily.d1only;
  const g = frozen.singleFamily.gonly;

  if (d1.label !== p2.d1Label || g.label !== p2.gLabel)
    throw new Error(`the frozen single-family selections are ${d1.label} / ${g.label}, not the declared pair`);
  if (selection.singleFamily.d1only.primary !== p2.d1Label || selection.singleFamily.gonly.primary !== p2.gLabel)
    throw new Error('the sealed C24 qualification record names a different single-family primary');

  const ev = (label: string) => {
    const e = selection.evidence.find((x) => x.label === label);

    if (!e) throw new Error(`no C24 evidence for ${label}`);
    return e;
  };
  const eD1 = ev(p2.d1Label);
  const eG = ev(p2.gLabel);

  if (eD1.kind !== 'd1only' || eG.kind !== 'gonly') throw new Error('the pair members are not the single-family lanes');
  if (!eD1.qualified || !eG.qualified) throw new Error('a pair member is not qualified in the sealed record');
  if (jointId(eD1.joint) !== jointId(d1.joint) || jointId(eG.joint) !== jointId(g.joint))
    throw new Error('the frozen selection and the sealed qualification disagree on a pair member');

  // never a substitute: the pair's D1 is not the shipped primary or VG #2's VGT book; its Growth is not #4 or 08500a60
  const controlsByLabel = new Map(frozen.controls.map((c) => [c.label, c]));
  const d1Key = (j: Joint) => JSON.stringify(j.d1);
  const gKey = (j: Joint) => growthId(j.g);

  for (const name of ['D1 primary alone', 'D1 VG#2-VGT alone'])
    if (d1Key(controlsByLabel.get(name)!.joint) === d1Key(d1.joint)) throw new Error(`the pair's D1 equals ${name}`);
  for (const name of ['Growth #4 alone', 'Growth 08500a60 alone'])
    if (gKey(controlsByLabel.get(name)!.joint) === gKey(g.joint)) throw new Error(`the pair's Growth equals ${name}`);
  if (d1Key(frozen.members[0]!.joint) === d1Key(d1.joint) || gKey(frozen.members[0]!.joint) === gKey(g.joint))
    throw new Error("a pair member equals the joint primary's family vector");

  return { frozen, selection, d1, g, eD1, eG };
};

export const casesOf = (pair: { d1: { joint: Joint }; g: { joint: Joint } }): Subject[] =>
  caseSpecs.map((c) => {
    const joint = normalize({ d1: pair.d1.joint.d1, g: pair.g.joint.g, a: { ...c.a } });

    return { key: c.key, role: c.role, joint, id: jointId(joint), enabled: null, source: null };
  });

export const comparatorsOf = (frozen: FrozenP2): Subject[] => {
  const jp = frozen.members.find((m) => m.label === frozen.primary)!;
  const control = (label: string) => {
    const c = frozen.controls.find((x) => x.label === label);

    if (!c) throw new Error(`no frozen control ${label}`);
    return c;
  };

  return [
    {
      key: 'joint primary',
      role: `Priority 2 frozen primary ${frozen.primary}`,
      joint: jp.joint,
      id: jp.id,
      enabled: null,
      source: { development: frozen.primary, validation: frozen.primary }
    },
    {
      key: 'optimized D1 alone',
      role: `${p2.d1Label} (Growth disabled)`,
      joint: frozen.singleFamily.d1only.joint,
      id: jointId(frozen.singleFamily.d1only.joint),
      enabled: { D1: true, G: false },
      source: { development: p2.d1Label, validation: p2.d1Label }
    },
    {
      key: 'optimized Growth alone',
      role: `${p2.gLabel} (D1 disabled)`,
      joint: frozen.singleFamily.gonly.joint,
      id: jointId(frozen.singleFamily.gonly.joint),
      enabled: { D1: false, G: true },
      source: { development: p2.gLabel, validation: p2.gLabel }
    },
    ...controlLabels.map((label) => {
      const c = control(label);

      return {
        key: label,
        role: 'fixed control',
        joint: c.joint,
        id: c.id,
        enabled: c.enabled,
        source: { development: `control: ${label}`, validation: `control: ${label}` }
      };
    })
  ];
};

// The neighbourhood families of Priority 2's qualification instrument (qualify.ts qualifyMembers, cutoff label C24),
// identical seeds: common random numbers with every C24 member.
export const familiesOf = (j: Joint) => {
  const fams: {
    name: string;
    labels: (string | number)[];
    scope: 'joint' | 'd1' | 'g' | 'alloc';
    scale: number;
    n: number;
  }[] = [];

  for (let rep = 1; rep <= fidelity.selectReps; rep++)
    fams.push({ name: `select${rep}`, labels: ['select', rep, 'C24'], scope: 'joint', scale: 1, n: fidelity.select });
  for (let rep = 1; rep <= fidelity.confirmReps; rep++)
    fams.push({
      name: `confirm${rep}`,
      labels: ['confirm', rep, 'C24'],
      scope: 'joint',
      scale: 1,
      n: fidelity.confirm
    });
  fams.push({ name: 'd1', labels: ['d1only', 'C24'], scope: 'd1', scale: 1, n: fidelity.side });
  fams.push({ name: 'g', labels: ['gonly', 'C24'], scope: 'g', scale: 1, n: fidelity.side });
  if (j.a.arch === 'B') fams.push({ name: 'alloc', labels: ['alloc', 'C24'], scope: 'alloc', scale: 1, n: 32 });
  fams.push({ name: 'small', labels: ['small', 'C24'], scope: 'joint', scale: 0.5, n: fidelity.side });
  fams.push({ name: 'wide', labels: ['wide', 'C24'], scope: 'joint', scale: 1.5, n: fidelity.side });

  return fams.map((f) => {
    const pts = neighbourhood(j, { name: f.name, n: f.n, labels: f.labels, scope: f.scope, scale: f.scale });

    return {
      ...f,
      seed: seedOf('nbhd', ...f.labels),
      seedDerivation: `deriveSeed('vgt-d1-growth-joint', 'nbhd', ${f.labels.map((l) => JSON.stringify(l)).join(', ')})`,
      unique: pts.length,
      clipped: pts.filter((p) => p.clipped > 0).length,
      idsSha256: sha256Text(pts.map((p) => p.id).join('\n'))
    };
  });
};

const ownCode = () =>
  fs
    .readdirSync(codeDir)
    .filter((f) => f.endsWith('.ts'))
    .sort()
    .map((f) => ({ file: rel(path.join(codeDir, f)), sha256: sha256File(path.join(codeDir, f)) }));

export const buildManifest = () => {
  const pins = verifyP2Pins();
  const p2Freeze = readJson<{ closureDigest: string; economics: typeof economics }>(
    p2File('results/protocol-freeze.json')
  );
  const closure = closureDigest(codeClosure());

  if (closure !== p2Freeze.closureDigest)
    throw new Error(`Priority 2's code closure changed: ${closure} ≠ ${p2Freeze.closureDigest}`);
  if (JSON.stringify(p2Freeze.economics) !== JSON.stringify(economics))
    throw new Error("Priority 2's economics differ from its freeze record");

  const adoption = checkAdoption(researchDir, { repoRoot });

  if (!adoption.ok) throw new Error(`the standard preflight fails:\n${adoption.errors.join('\n')}`);

  const { frozen, d1, g, eD1, eG } = resolvePair();
  const cases = casesOf({ d1, g });
  const ids = cases.map((c) => c.id);

  if (new Set(ids).size !== ids.length) throw new Error('two cases share a configuration identity');

  const comparators = comparatorsOf(frozen);
  const primary = cases[0]!;
  const head = execSync('git rev-parse HEAD', { cwd: repoRoot }).toString().trim();
  const adoptionFile = path.join(researchDir, 'STANDARD_ADOPTION.json');
  const adoptionBody = readJson<{ standard: { path: string; version: string; sha256: string } }>(adoptionFile);
  const growthVector = (j: Joint) => ({
    config: j.g,
    effective: effectiveOf(j.g),
    growthId: growthId(j.g),
    engineParamsDevelopment: growthParamsOf(j.g, { from: chronology.firstSession, to: chronology.developmentEnd }),
    engineParamsFull: growthParamsOf(j.g, { from: chronology.firstSession, to: chronology.validationEnd })
  });

  return {
    study: STUDY,
    kind: 'COMPARISON MANIFEST — read-only; sealed and committed before any evaluation of the pair',
    label:
      'a bounded retrospective diagnostic on previously examined history (2016-01-04 → 2026-10-30): not a search, not a selection, not a new primary of Priority 2, not an untouched holdout',
    createdAt: new Date().toISOString(),
    gitHead: head,
    authority: {
      brief: {
        path: rel(path.join(researchDir, 'brief', 'BRIEF.md')),
        sha256: sha256File(path.join(researchDir, 'brief', 'BRIEF.md'))
      },
      protocol: {
        path: rel(path.join(researchDir, 'PROTOCOL.md')),
        sha256: sha256File(path.join(researchDir, 'PROTOCOL.md'))
      },
      standard: { ...adoptionBody.standard, current: standardSha(path.join(repoRoot, adoptionBody.standard.path)) },
      adoption: { path: rel(adoptionFile), sha256: sha256File(adoptionFile), preflight: adoption.ok ? 'pass' : 'fail' }
    },
    sources: {
      priority2: pins.records,
      evaluationDigest: pins.evaluationDigest,
      closureDigest: closure,
      canonicalData: { file: 'data/VGT/data.csv', sha256: sha256File(path.join(repoRoot, 'data', 'VGT', 'data.csv')) },
      followUpCode: ownCode()
    },
    pair: {
      provenance:
        "Priority 2's optimized single-family controls: each selected separately on 2016-01-04 → 2024-12-31 in its own lane (D1 alone: 1 cell; Growth alone: 4 cells), rank 1 by the frozen banded order; neither is replaced by another member",
      d1: {
        label: d1.label,
        singleFamilyId: jointId(d1.joint),
        grid: d1.joint.d1,
        units: 'tenths of a percentage point (X, Y, stop, buffer, P), calendar days (hold), sessions (L, W)',
        strategyParams: d1StrategyParams(d1.joint.d1),
        development: {
          net: eD1.centre.net,
          dd: eD1.centre.dd,
          selectRobust: eD1.select.robust,
          selectP90: eD1.select.p90Dd,
          confirmMedian: eD1.confirm.median,
          confirmP10: eD1.confirm.p10,
          confirmP90Dd: eD1.confirm.p90Dd
        }
      },
      g: {
        label: g.label,
        singleFamilyId: jointId(g.joint),
        ...growthVector(g.joint),
        development: {
          net: eG.centre.net,
          dd: eG.centre.dd,
          selectRobust: eG.select.robust,
          selectP90: eG.select.p90Dd,
          confirmMedian: eG.confirm.median,
          confirmP10: eG.confirm.p10,
          confirmP90Dd: eG.confirm.p90Dd
        }
      },
      inactiveFillers:
        "Priority 2 stores a single-family member as a full joint: the disabled family's vector there is an unused filler; the pair takes d1only's D1 vector and gonly's Growth vector"
    },
    cases: cases.map((c) => ({ ...c, describe: describeJoint(c.joint), allocation: c.joint.a })),
    canonicalization:
      'Before running: identities (jointId; A ignores its targets) — the six are distinct. After running: cases whose funded-lot ledger signature AND every reported total are equal on both doors are reported as one behavioural class listing every member; no case is dropped, merged into another, ranked or selected.',
    windows: {
      development: { door: 'D24', from: chronology.firstSession, to: chronology.developmentEnd },
      validation: {
        door: 'FULL',
        window: '2025-01-01 → 2026-10-30',
        firstSession: chronology.validationStart,
        lastSession: chronology.validationEnd,
        boundary
      },
      full: { door: 'FULL', from: chronology.firstSession, to: chronology.validationEnd, continuous: true },
      endpointNote:
        'the latest complete session in the canonical VGT file (sha256 above) is 2026-10-30; November–December 2026 are not evaluated'
    },
    conventions: {
      ...economics,
      minimumAllocationB: allocatorDefaults.minimumAllocation,
      fundingStart: chronology.firstSession,
      d1Arming: 'harmonized (each indicator from its own causal history on the 2016 data)',
      marks: 'every regular minute while a lot is held and every session close (strict trackers)',
      source:
        'src/vgt-d1-growth-joint/context.ts (economics) and allocator.ts (defaults), verified equal to research/vgt-d1-growth-joint/results/protocol-freeze.json'
    },
    comparators: comparators.map((c) => ({ ...c, describe: describeJoint(c.joint) })),
    removal: {
      subjects: [
        ...cases.map((c) => c.key),
        'joint primary',
        'D1 primary + Growth #4 · A',
        'D1 primary + Growth 08500a60 · A'
      ],
      doors: ['D24', 'FULL'],
      definition:
        'causal contribution of a family = net − net of the same configuration rerun in the pool with that family disabled'
    },
    matched: {
      x: primary.key,
      against: [
        'joint primary',
        'D1 primary + Growth #4 · A',
        'D1 primary + Growth 08500a60 · A',
        'optimized D1 alone',
        'optimized Growth alone',
        ...cases.slice(1).map((c) => c.key)
      ],
      doors: ['D24', 'FULL'],
      method:
        "Priority 2's matchLots (post.ts): unchanged, resized, retimed exit, retimed, newly admitted, displaced; Σ Δ reconciles to Δ net"
    },
    neighbourhood: {
      door: 'D24 (development only)',
      instrument:
        "Priority 2's qualifyMembers (src/vgt-d1-growth-joint/qualify.ts) with cutoff label C24; radii, rounding, clipping and statistics of PROTOCOL.md §6.1 there",
      subjects: [
        {
          key: primary.key,
          id: primary.id,
          use: 'report-only neighbourhood of the primary diagnostic pair',
          families: familiesOf(primary.joint)
        },
        {
          key: 'joint primary',
          id: comparators[0]!.id,
          use: "reproduction check of the instrument: every statistic must equal Priority 2's sealed C24 evidence",
          families: familiesOf(comparators[0]!.joint)
        }
      ],
      stresses: Object.keys(stresses),
      toggles: Object.keys(togglesOf(primary.joint)),
      statistics:
        'median, p10, p90 of net; robust = ½ median + ½ p10; median, p90 and worst DD; breach share (DD > $35,000), mean excess; mixed share; distinct ledgers; draws equal to the centre; clipping',
      reused:
        "comparators' neighbourhoods are Priority 2's sealed C24 evidence (results/folds/C24/selection.json), not recomputed",
      noValidationSweep: 'no validation (FULL) perturbation of the pair is run (brief)'
    },
    noSelection:
      "Nothing here selects, ranks for selection, replaces or relabels a configuration. The six cases, the comparators and every neighbour are reported only; Priority 2's frozen selection and primary are unchanged.",
    doors:
      'D24 and FULL open only after this manifest is sealed and committed unchanged (guard); every opening is logged in results/doors.jsonl',
    resources
  };
};

export const sealManifest = () => {
  if (fs.existsSync(manifestFile)) throw new Error('the comparison manifest exists: it is sealed once');

  const m = buildManifest();
  const sha = sealJson(manifestFile, m, 'comparison manifest');

  return { sha, manifest: m };
};

// The guard of every evaluation stage: the manifest is sealed, its sha256 is the sealed one, it is committed and
// unchanged, and Priority 2's records and evaluation code are still the pinned ones.
export const assertManifestGuard = () => {
  if (!isSealed(manifestFile)) throw new Error(`${rel(manifestFile)} is not sealed`);

  const sha = sha256File(manifestFile);
  const seal = fs
    .readFileSync(sealsLog, 'utf8')
    .trim()
    .split('\n')
    .map((l) => JSON.parse(l) as { file: string; sha256: string })
    .find((s) => s.file === rel(manifestFile));

  if (!seal || seal.sha256 !== sha) throw new Error('the comparison manifest differs from its seal');
  if (!isCommittedUnchanged(manifestFile)) throw new Error('the comparison manifest must be committed and unchanged');
  verifyP2Pins();
  return { sha, manifest: readJson<ReturnType<typeof buildManifest>>(manifestFile) };
};

export { researchDir };
