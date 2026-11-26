// The precommitted determination (PROTOCOL.md §12), frozen before any search: the C24 finalists, their development and
// chronological labels (sealed in FROZEN_SELECTION.json BEFORE FULL opens), the architecture comparisons, and the outcome
// once the validation adds V1–V3. Governance labels only — never a fitness term, ranking input, gate or a reason to
// search again. "No qualifying GDX candidate" is a valid outcome.
//
// FINALISTS (C24): every NOMINATING population's primary (NL0's original rule) and its robust-profit, balanced and
// lower-drawdown role holders. The nominating populations are the five independent arm procedures D, G, C, J, S and the
// three informed populations D+, G+, C+ (C24 only: incumbents and incumbent-seeded lanes; no independent chronological
// test). The sub-populations' primaries are report-only, never finalists.
//
// A finalist X is a GDX RESEARCH CANDIDATE FOR THE USER'S REVIEW iff
//   (a) X passes Q1–Q6 at C24 (development, 2016-01-04 → 2024-12-31);
//   (b) X is the PRIMARY of an independent arm (D, G, C, J or S) whose independent chronological verdict (sequential.json)
//       is "supported";
//   (c) V1–V3 pass on FULL (validation P&L > 0; reset validation DD ≤ $35,000; whole-run DD ≤ $35,000).
// An independent primary meeting (a) and (c) but not (b) is labelled "development-qualified, no chronological support: not
// a deployment-qualified candidate without an explicit user decision" (standard §1.8 default). An informed primary (D+, G+,
// C+) can never meet (b): meeting (a) and (c) it is labelled "development-qualified (informed), no independent chronological
// test: not a deployment-qualified candidate without an explicit user decision" (standard §1.8: the consequence applies to
// an informed selection as to a failed verdict). A role holder is descriptive.
//
// ARCHITECTURE COMPARISONS (C24 development evidence, same instrument and draws; report labels): for each combined arm
// K ∈ {C, J, S} against the better standalone primary B (D or G, higher centre net), and J against S both ways; and,
// informed, C+ against the better of D+ and G+: K's primary is a MATERIAL IMPROVEMENT over B iff both are qualified and
//   type P: centre net ≥ B + $10,000, confirmation robust net ≥ B + $5,000, centre DD ≤ B + $2,500 and confirmation p90
//           DD ≤ B + $2,500; or
//   type R: confirmation p90 DD ≤ B − $2,500, centre DD ≤ B + $2,500, centre net ≥ B − $2,500 and confirmation robust
//           ≥ B − $2,500;
// REPLICATED iff qualified members of K from ≥ 2 different replicate numbers meet the same type (arms C, C+: no seeds —
// "not applicable (fixed pairs)"). Priority 5's / P6-TSLA's bands. A single historical pair never proves an architecture
// superior (standard §3.4): the chronological paths of the arms are reported beside it.
//
// IDENTITY (brief Phase 0 item 4, Phase 7; the P6-TSLA defect, research/tsla-d1-growth AMENDMENTS.md D1): a finalist's
// identity is (population, id) — `arm` in the join is the POPULATION (D, G, C, J, S, D+, G+, C+). Labels are never part of
// an identity: `candidateLabel` is the member label, `governanceLabel` the status text. outcomeOf joins the validation
// rows by (population, id) through src/research-outcome/identityJoin.ts and FAILS CLOSED on a missing, duplicate,
// cross-population, malformed or conflicting record; there is no `validation: null` path.
import fs from 'node:fs';
import { joinByIdentity } from '../research-outcome/identityJoin.ts';
import { type ArmKey, type CutoffKey, type InformedKey, armName, ceiling, informedArm } from './context.ts';
import type { Evidence } from './qualify.ts';
import { originalOrder, populations, rolesOf } from './select.ts';
import { readSealed } from './records.ts';
import { armSelectionFile, armEvidence } from './stages.ts';

export type Population = ArmKey | InformedKey;
export const independentPopulations: readonly ArmKey[] = ['D', 'G', 'C', 'J', 'S'];
export const informedPopulationKeys: readonly InformedKey[] = ['D+', 'G+', 'C+'];
export const nominatingPopulations: readonly Population[] = [...independentPopulations, ...informedPopulationKeys];
export const isInformed = (p: string): p is InformedKey => (informedPopulationKeys as readonly string[]).includes(p);
// the arm whose records (qualification, selection) hold a population
export const recordArmOf = (p: Population): ArmKey => (isInformed(p) ? informedArm[p] : p);
export const populationName = (p: Population) =>
  isInformed(p) ? `informed ${armName[informedArm[p]]} (incumbents and incumbent-seeded lanes; no independent chronological test)` : armName[p];
export const bands = { profitNet: 10_000, profitRobust: 5_000, risk: 2_500 };

export interface Finalist {
  label: string; // the candidate's own label (its member label); the identity is (arm = population, id)
  id: string;
  arm: Population;
  recordArm: ArmKey;
  roles: string[];
  qualified: boolean;
  failed: string[];
  centreNet: number;
  centreDd: number;
  confirmRobust: number;
  confirmP90Dd: number;
  selectRobust: number;
  signature: string;
}

type ArmSel = { primaries: Record<string, string | null>; roles: Record<string, { roles: Record<string, string | null> }>; subjects: Evidence[] };

export const finalistsOf = (cut: CutoffKey): Finalist[] => {
  const out = new Map<string, Finalist>();

  for (const pop of nominatingPopulations) {
    const arm = recordArmOf(pop);
    const sel = readSealed<ArmSel>(armSelectionFile(cut, arm));

    if (isInformed(pop) && !(pop in sel.primaries)) throw new Error(`finalists ${cut}: the ${arm} selection has no ${pop} population`);

    const add = (label: string | null, role: string) => {
      if (!label) return;

      const key = `${pop}|${label}`;
      const f = out.get(key);

      if (f) {
        f.roles.push(role);
        return;
      }

      const e = sel.subjects.find((x) => x.label === label);

      if (!e) throw new Error(`finalists ${cut}: ${label} (${pop}) is not a subject of the ${arm} selection`);
      out.set(key, {
        label,
        id: e.id,
        arm: pop,
        recordArm: arm,
        roles: [role],
        qualified: e.qualified,
        failed: e.failed,
        centreNet: e.centre.net,
        centreDd: e.centre.dd,
        confirmRobust: e.confirm.robust,
        confirmP90Dd: e.confirm.p90Dd,
        selectRobust: e.select.robust,
        signature: e.centre.signature
      });
    };

    add(sel.primaries[pop] ?? null, `primary ${pop}`);
    for (const [role, l] of Object.entries(sel.roles[pop]?.roles ?? {})) if (role !== 'actual-profit') add(l, `role ${pop}/${role}`);
  }
  return [...out.values()];
};

type Ev = Pick<Evidence, 'qualified' | 'centre' | 'confirm' | 'replicate'>;
const confirmRobust = (e: Ev) => e.confirm.robust;

export const materialType = (x: Ev, b: Ev): 'P' | 'R' | null => {
  if (!x.qualified || !b.qualified) return null;

  const p =
    x.centre.net >= b.centre.net + bands.profitNet &&
    confirmRobust(x) >= confirmRobust(b) + bands.profitRobust &&
    x.centre.dd <= b.centre.dd + bands.risk &&
    x.confirm.p90Dd <= b.confirm.p90Dd + bands.risk;

  if (p) return 'P';

  const r =
    x.confirm.p90Dd <= b.confirm.p90Dd - bands.risk &&
    x.centre.dd <= b.centre.dd + bands.risk &&
    x.centre.net >= b.centre.net - bands.risk &&
    confirmRobust(x) >= confirmRobust(b) - bands.risk;

  return r ? 'R' : null;
};

const populationEvidence = (cut: CutoffKey, p: Population) => armEvidence(cut, recordArmOf(p)).filter(populations[p]);

export const compare = (cut: CutoffKey, k: Population, against: { arm: Population; label: string } | null) => {
  const sel = readSealed<ArmSel>(armSelectionFile(cut, recordArmOf(k)));
  const kLabel = sel.primaries[k] ?? null;

  if (!kLabel || !against) return { arm: k, primary: kLabel, against: against?.label ?? null, type: null, replicated: null, note: !kLabel ? `${k} has no primary` : 'no comparison primary' };

  const kEv = populationEvidence(cut, k);
  const bEv = populationEvidence(cut, against.arm).find((e) => e.label === against.label)!;
  const x = kEv.find((e) => e.label === kLabel)!;
  const type = materialType(x, bEv);
  const reps = type ? new Set(kEv.filter((e) => e.replicate !== null && materialType(e, bEv) === type).map((e) => e.replicate)) : new Set();
  const fixed = k === 'C' || k === 'C+';
  const replicated = fixed ? 'not applicable (fixed pairs: no seeds)' : type ? reps.size >= 2 : null;

  return {
    arm: k,
    primary: kLabel,
    against: against.label,
    againstArm: against.arm,
    type,
    replicates: [...reps],
    replicated,
    deltas: { centreNet: x.centre.net - bEv.centre.net, centreDd: x.centre.dd - bEv.centre.dd, confirmRobust: confirmRobust(x) - confirmRobust(bEv), confirmP90Dd: x.confirm.p90Dd - bEv.confirm.p90Dd },
    material: type !== null && (fixed || replicated === true)
  };
};

type Procedure = { population: string; verdict: string; supported: boolean };

// a finalist with its development (a) and chronological (b) flags, as sealed in FROZEN_SELECTION.json's preDetermination.
// `candidateLabel` is the member label, `governanceLabel` the status text; neither is ever an identity.
export interface GovernedFinalist extends Finalist {
  armName: string;
  informed: boolean;
  primary: boolean;
  chronology: string;
  chronologicallySupported: boolean;
  a: boolean;
  b: boolean;
  candidateLabel: string;
  governanceLabel: string;
}

export const governanceLabelOf = (qualified: boolean, failed: readonly string[], primary: boolean, informed: boolean, supported: boolean) =>
  !qualified
    ? `fails ${failed.join(', ')} at C24 (development)`
    : !primary
      ? 'descriptive role holder (not a nominee)'
      : informed
        ? 'development-qualified (informed: an incumbent or an incumbent-seeded lane), NO independent chronological test: not a deployment-qualified candidate without an explicit user decision'
        : supported
          ? 'development-qualified and chronologically supported (validation pending)'
          : 'development-qualified, NO chronological support: not a deployment-qualified candidate without an explicit user decision';

export const governedFinalists = (finalists: readonly Finalist[], procedures: readonly Procedure[]): GovernedFinalist[] =>
  finalists.map((f) => {
    const informed = isInformed(f.arm);
    const proc = informed ? undefined : procedures.find((p) => p.population === f.arm);
    const primary = f.roles.includes(`primary ${f.arm}`);
    const supported = !informed && (proc?.supported ?? false);
    const governance = governanceLabelOf(f.qualified, f.failed, primary, informed, supported);

    return {
      ...f,
      armName: populationName(f.arm),
      informed,
      primary,
      chronology: informed ? 'no independent chronological test (informed; standard §1.8)' : proc ? proc.verdict : 'no procedure verdict',
      chronologicallySupported: primary && supported,
      a: f.qualified,
      b: primary && supported,
      candidateLabel: f.label,
      governanceLabel: governance
    };
  });

export const preDetermination = (finalists: readonly Finalist[], procedures: readonly Procedure[]) => {
  const cut: CutoffKey = 'C24';
  const prim = (p: Population) => finalists.find((f) => f.arm === p && f.roles.includes(`primary ${p}`)) ?? null;
  const best = (ps: readonly Population[]) =>
    ps
      .map((a) => prim(a))
      .filter((f): f is Finalist => f !== null && f.qualified)
      .sort((a, b) => b.centreNet - a.centreNet || (a.label < b.label ? -1 : 1))[0] ?? null;
  const bestStandalone = best(['D', 'G']);
  const bestInformedStandalone = best(['D+', 'G+']);
  const J = prim('J');
  const S = prim('S');
  const vs = (k: Population, b: Finalist | null) => compare(cut, k, b ? { arm: b.arm, label: b.label } : null);

  return {
    rule: 'PROTOCOL.md §12 (outcome.ts): (a) Q1–Q6 at C24; (b) the primary of an independent arm whose independent chronological verdict is supported; (c) V1–V3 on FULL; informed populations never meet (b)',
    finalists: governedFinalists(finalists, procedures),
    comparisons: {
      bestStandalone: bestStandalone ? { arm: bestStandalone.arm, label: bestStandalone.label } : null,
      combinedVsStandalone: (['C', 'J', 'S'] as const).map((k) => vs(k, bestStandalone)),
      jointVsSequential: J && S ? [vs('J', S), vs('S', J)] : [],
      informed: {
        bestStandalone: bestInformedStandalone ? { arm: bestInformedStandalone.arm, label: bestInformedStandalone.label } : null,
        combinedVsStandalone: [vs('C+', bestInformedStandalone)],
        informedVsIndependent: (['D', 'G', 'C'] as const).map((a) => vs(`${a}+` as InformedKey, prim(a)))
      },
      caveat: 'a single historical pair never proves an architecture superior (standard §3.4); the arms’ chronological paths (sequential.json) are the repeated evidence; the informed comparisons have none'
    }
  };
};

export interface ValidationFlags {
  V1: boolean;
  V2: boolean;
  V3: boolean;
}
// a row of the sealed validation record (results/validation/validation.json): one evaluated subject (one configuration of
// one arm); `populations` lists the populations whose primary or role it holds; `kind` 'selected' rows represent C24
// subjects, 'control' rows the incumbents that hold no role (never finalists)
export interface ValidationRow {
  label: string;
  id: string;
  arm: ArmKey;
  populations: string[];
  kind: string;
  validation: ValidationFlags;
}

const flagsProblem = (v: unknown) =>
  typeof v === 'object' && v !== null && (['V1', 'V2', 'V3'] as const).every((k) => typeof (v as ValidationFlags)[k] === 'boolean')
    ? null
    : `malformed V1–V3 in the validation row (${JSON.stringify(v ?? null)})`;

// the canonical order of the outcome's lists: population order, then id (independent of the input order)
const byPopulationThenId = (x: { arm: Population; id: string }, y: { arm: Population; id: string }) =>
  nominatingPopulations.indexOf(x.arm) - nominatingPopulations.indexOf(y.arm) || (x.id < y.id ? -1 : x.id > y.id ? 1 : 0);

// one identity per (population, id) of every selected row (a malformed row keeps an invalid identity and fails the join)
export const rowIdentities = (rows: readonly ValidationRow[]) =>
  rows.flatMap((r) =>
    r.kind === 'selected'
      ? Array.isArray(r.populations) && r.populations.length
        ? r.populations.map((p) => ({ ...r, arm: p as Population, evidenceArm: r.arm }))
        : [{ ...r, arm: '' as Population, evidenceArm: r.arm }]
      : [{ ...r, arm: `control:${r.arm}` as Population, evidenceArm: r.arm, control: true as const }]
  );

export const outcomeOf = <P extends { finalists: readonly GovernedFinalist[]; comparisons: unknown }>(pre: P, rows: readonly ValidationRow[]) => {
  const { pairs, unmatchedRows } = joinByIdentity(pre.finalists, rowIdentities(rows), {
    what: 'P8-GDX outcome (PROTOCOL §12): C24 finalists ↔ FULL validation rows by (population, id)',
    eligible: (r) => !('control' in r),
    conflict: (f, r) =>
      typeof r.label !== 'string' || r.label.length === 0
        ? 'the validation row has no candidate label'
        : r.evidenceArm !== f.recordArm
          ? `record arm conflict: finalist ${f.recordArm}, validation row ${r.evidenceArm}`
          : flagsProblem(r.validation)
  });
  const fin = pairs.map(({ finalist: f, row }) => {
    const v: ValidationFlags = { V1: row.validation.V1, V2: row.validation.V2, V3: row.validation.V3 };
    const c = v.V1 && v.V2 && v.V3;

    return {
      ...f,
      validationLabel: row.label,
      validation: v,
      c,
      candidate: f.a && f.b && c,
      developmentOnly: f.a && f.primary && !f.informed && !f.b && c,
      informedDevelopmentOnly: f.a && f.primary && f.informed && c
    };
  });
  const candidates = fin.filter((f) => f.candidate).sort(byPopulationThenId);
  const devOnly = fin.filter((f) => f.developmentOnly).sort(byPopulationThenId);
  const informedOnly = fin.filter((f) => f.informedDevelopmentOnly).sort(byPopulationThenId);
  const show = (xs: typeof fin) => xs.map((f) => `${f.arm} ${f.candidateLabel}`).join('; ');

  return {
    finalists: fin,
    unclaimedRows: unmatchedRows.length,
    candidates: candidates.map((f) => ({ arm: f.arm, label: f.candidateLabel, id: f.id })),
    developmentOnly: devOnly.map((f) => ({ arm: f.arm, label: f.candidateLabel, id: f.id })),
    informedDevelopmentOnly: informedOnly.map((f) => ({ arm: f.arm, label: f.candidateLabel, id: f.id })),
    comparisons: pre.comparisons as P['comparisons'],
    outcome: candidates.length
      ? `GDX RESEARCH CANDIDATE(S) FOR THE USER'S REVIEW: ${show(candidates)} (development-qualified, chronologically supported, V1–V3 pass on previously examined 2025–2026 history; research nomination only — nothing adopted or deployed)`
      : `NO QUALIFYING GDX CANDIDATE: no independent arm primary is development-qualified AND chronologically supported AND passes V1–V3${
          devOnly.length ? `; development-qualified without chronological support (not deployment-qualified without an explicit user decision): ${show(devOnly)}` : ''
        }${informedOnly.length ? `; informed, development-qualified, no independent chronological test (not deployment-qualified without an explicit user decision): ${show(informedOnly)}` : ''}`,
    ceiling: `the $35,000 (35 % of the fixed $100,000 allocation) marked-DD ceiling is a research criterion on historical paths, never an enforceable future loss limit (${ceiling})`
  };
};

export const finalistsExist = (cut: CutoffKey) => independentPopulations.every((a) => fs.existsSync(armSelectionFile(cut, a)));
export { originalOrder, rolesOf };
