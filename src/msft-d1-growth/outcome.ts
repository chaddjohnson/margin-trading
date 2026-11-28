// The precommitted determination (PROTOCOL.md §12), frozen before any search: the C24 finalists, their development,
// chronological and evidence-sufficiency labels (sealed in FROZEN_SELECTION.json BEFORE FULL opens), the architecture
// comparisons, and the outcome once the validation adds V1–V3. Governance labels only — never a fitness term, ranking
// input, qualification gate or a reason to search again. "No qualifying MSFT candidate" is a valid outcome.
//
// FINALISTS (C24): every arm's primary (D, G, C, J, S; NL0's original rule) and its robust-profit, balanced and
// lower-drawdown role holders (the sub-populations' primaries are report-only, never finalists). MSFT has no incumbent,
// so there is no informed population (PROTOCOL.md AD11): the population of a finalist is its arm.
//
// A finalist X is an MSFT RESEARCH CANDIDATE FOR THE USER'S REVIEW iff
//   (a) X passes Q1–Q6 at C24 (development, 2016-01-04 → 2024-12-31);
//   (b) X is its arm's PRIMARY and the arm's independent chronological verdict (sequential.json) is "supported";
//   (c) V1–V3 pass on FULL (validation P&L > 0; reset validation DD ≤ $35,000; whole-run DD ≤ $35,000);
//   (d) X's C24 development centre meets the EVIDENCE-SUFFICIENCY thresholds ES1–ES3 (brief Phase 3 item 7; departure
//       DP1 from standard §2.6, PROTOCOL.md §12.2) — computed from the sealed C24 evidence, no evaluation:
//         ES1 trades:        ≥ 10 funded lots; for C, J, S also ≥ 3 funded lots of EACH family (D1·MSFT and Growth·MSFT);
//         ES2 independence:  ≥ 5 independent pool-level episodes (a new episode starts > 10 sessions after the latest exit;
//                            src/vg-d1-growth-joint/evaluate.ts episodesOf) AND funded entries in ≥ 4 distinct calendar
//                            years of 2016–2024;
//         ES3 concentration: the largest winning episode's share of the development net ≤ 50 % (undefined → fails).
//       (d) never selects, ranks or qualifies: the primary is NL0's, Q1–Q6 are P0's; (d) only decides whether a nominee
//       counts as a candidate.
// Labels: a primary meeting (a), (c) but not (b) is "development-qualified, no chronological support: not a
// deployment-qualified candidate without an explicit user decision" (standard §1.8 default); one meeting (a), (b), (c) but
// not (d) is "insufficient evidence: not a research candidate". (d) is reported beside every label. A role holder is
// descriptive.
//
// ARCHITECTURE COMPARISONS (C24 development evidence, same instrument and draws; report labels): for each combined arm
// K ∈ {C, J, S} against the better standalone primary B (D or G, higher centre net), and J against S both ways: K's
// primary is a MATERIAL IMPROVEMENT over B iff both are qualified and
//   type P: centre net ≥ B + $10,000, confirmation robust net ≥ B + $5,000, centre DD ≤ B + $2,500 and confirmation p90
//           DD ≤ B + $2,500; or
//   type R: confirmation p90 DD ≤ B − $2,500, centre DD ≤ B + $2,500, centre net ≥ B − $2,500 and confirmation robust
//           ≥ B − $2,500;
// REPLICATED iff qualified members of K from ≥ 2 different replicate numbers meet the same type (arm C: no seeds — "not
// applicable (fixed pairs)"). Priority 5's / P6-TSLA's / P8-GDX's bands. A single historical pair never proves an
// architecture superior (standard §3.4): the chronological paths of the arms are reported beside it.
//
// IDENTITY (brief Phase 0; the P6-TSLA defect, research/tsla-d1-growth/AMENDMENTS.md D1): a finalist's identity is
// (arm, id). Labels are never part of an identity: `label` / `candidateLabel` is the member label, `governanceLabel` the
// status text. outcomeOf joins the validation rows by (arm, id) through src/research-outcome/identityJoin.ts and FAILS
// CLOSED on a missing, duplicate, cross-arm, malformed or conflicting record; there is no `validation: null` path.
import fs from 'node:fs';
import { joinByIdentity } from '../research-outcome/identityJoin.ts';
import { type ArmKey, type CutoffKey, armFamilies, armName, ceiling } from './context.ts';
import type { Evidence } from './qualify.ts';
import { originalOrder, rolesOf } from './select.ts';
import { readSealed } from './records.ts';
import { armSelectionFile, armEvidence } from './stages.ts';

export const nominatingArms: readonly ArmKey[] = ['D', 'G', 'C', 'J', 'S'];
export const bands = { profitNet: 10_000, profitRobust: 5_000, risk: 2_500 };

// ----- evidence sufficiency (d): ES1–ES3, frozen before any search (PROTOCOL.md §12.2) -----

export const sufficiencyRule = { minLots: 10, minFamilyLots: 3, minEpisodes: 5, minYears: 4, maxTopEpisodeShare: 0.5 } as const;

export interface Sufficiency {
  lots: number;
  familyLots: { D1: number; G: number };
  episodes: number;
  entryYears: string[];
  topEpisodeShare: number | null; // null when undefined (development net ≤ 0 or no winning episode)
  ES1: boolean;
  ES2: boolean;
  ES3: boolean;
  pass: boolean;
  failed: ('ES1' | 'ES2' | 'ES3')[];
}

type SuffInput = Pick<Evidence, 'arm' | 'centre' | 'risk'>;

export const sufficiencyOf = (e: SuffInput): Sufficiency => {
  const c = e.centre;
  const familyLots = { D1: c.fam.D1.lots, G: c.fam.G.lots };
  const combined = armFamilies[e.arm].length === 2;
  const entryYears = [...new Set(e.risk.rows.map((r) => r.entry.slice(0, 4)))].sort();
  const share = Number.isFinite(c.topEpisodeShare) ? c.topEpisodeShare : null;
  const ES1 = c.lots >= sufficiencyRule.minLots && (!combined || (familyLots.D1 >= sufficiencyRule.minFamilyLots && familyLots.G >= sufficiencyRule.minFamilyLots));
  const ES2 = c.episodes >= sufficiencyRule.minEpisodes && entryYears.length >= sufficiencyRule.minYears;
  const ES3 = share !== null && share <= sufficiencyRule.maxTopEpisodeShare;
  const failed = (['ES1', 'ES2', 'ES3'] as const).filter((k) => !{ ES1, ES2, ES3 }[k]);

  return { lots: c.lots, familyLots, episodes: c.episodes, entryYears, topEpisodeShare: share, ES1, ES2, ES3, pass: failed.length === 0, failed };
};

// ----- finalists -----

export interface Finalist {
  label: string; // the candidate's own label (its member label); the identity is (arm, id)
  id: string;
  arm: ArmKey;
  roles: string[];
  qualified: boolean;
  failed: string[];
  centreNet: number;
  centreDd: number;
  confirmRobust: number;
  confirmP90Dd: number;
  selectRobust: number;
  signature: string;
  sufficiency: Sufficiency;
}

type ArmSel = { primaries: Record<string, string | null>; roles: Record<string, { roles: Record<string, string | null> }>; subjects: Evidence[] };

export const finalistsOf = (cut: CutoffKey): Finalist[] => {
  const out = new Map<string, Finalist>();

  for (const arm of nominatingArms) {
    const sel = readSealed<ArmSel>(armSelectionFile(cut, arm));
    const add = (label: string | null, role: string) => {
      if (!label) return;

      const key = `${arm}|${label}`;
      const f = out.get(key);

      if (f) {
        f.roles.push(role);
        return;
      }

      const e = sel.subjects.find((x) => x.label === label);

      if (!e) throw new Error(`finalists ${cut}: ${label} (${arm}) is not a subject of the ${arm} selection`);
      if (e.arm !== arm) throw new Error(`finalists ${cut}: ${label} is an arm ${e.arm} subject in the ${arm} selection`);
      out.set(key, {
        label,
        id: e.id,
        arm,
        roles: [role],
        qualified: e.qualified,
        failed: e.failed,
        centreNet: e.centre.net,
        centreDd: e.centre.dd,
        confirmRobust: e.confirm.robust,
        confirmP90Dd: e.confirm.p90Dd,
        selectRobust: e.select.robust,
        signature: e.centre.signature,
        sufficiency: sufficiencyOf(e)
      });
    };

    add(sel.primaries[arm] ?? null, `primary ${arm}`);
    for (const [role, l] of Object.entries(sel.roles[arm]?.roles ?? {})) if (role !== 'actual-profit') add(l, `role ${arm}/${role}`);
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

export const compare = (cut: CutoffKey, k: ArmKey, against: { arm: ArmKey; label: string } | null) => {
  const sel = readSealed<{ primaries: Record<string, string | null> }>(armSelectionFile(cut, k));
  const kLabel = sel.primaries[k] ?? null;

  if (!kLabel || !against) return { arm: k, primary: kLabel, against: against?.label ?? null, type: null, replicated: null, note: !kLabel ? `arm ${k} has no primary` : 'no comparison primary' };

  const kEv = armEvidence(cut, k).filter((e) => e.stage !== 'control');
  const bEv = armEvidence(cut, against.arm).find((e) => e.label === against.label)!;
  const x = kEv.find((e) => e.label === kLabel)!;
  const type = materialType(x, bEv);
  const reps = type ? new Set(kEv.filter((e) => e.replicate !== null && materialType(e, bEv) === type).map((e) => e.replicate)) : new Set();
  const replicated = k === 'C' ? 'not applicable (fixed pairs: no seeds)' : type ? reps.size >= 2 : null;

  return {
    arm: k,
    primary: kLabel,
    against: against.label,
    againstArm: against.arm,
    type,
    replicates: [...reps],
    replicated,
    deltas: { centreNet: x.centre.net - bEv.centre.net, centreDd: x.centre.dd - bEv.centre.dd, confirmRobust: confirmRobust(x) - confirmRobust(bEv), confirmP90Dd: x.confirm.p90Dd - bEv.confirm.p90Dd },
    material: type !== null && (k === 'C' || replicated === true)
  };
};

type Procedure = { population: string; verdict: string; supported: boolean };

// a finalist with its development (a), chronological (b) and sufficiency (d) flags, as sealed in FROZEN_SELECTION.json's
// preDetermination; `label` and `candidateLabel` are the member label, `governanceLabel` the status text — never identity
export interface GovernedFinalist extends Finalist {
  armName: string;
  primary: boolean;
  chronology: string;
  chronologicallySupported: boolean;
  a: boolean;
  b: boolean;
  d: boolean;
  candidateLabel: string;
  governanceLabel: string;
}

export const governanceLabelOf = (qualified: boolean, failed: readonly string[], primary: boolean, supported: boolean, suff: Pick<Sufficiency, 'pass' | 'failed'>) => {
  const es = suff.pass ? 'evidence sufficient (ES1–ES3)' : `INSUFFICIENT EVIDENCE (fails ${suff.failed.join(', ')})`;

  return !qualified
    ? `fails ${failed.join(', ')} at C24 (development); ${es}`
    : !primary
      ? `descriptive role holder (not a nominee); ${es}`
      : supported
        ? suff.pass
          ? 'development-qualified, chronologically supported, evidence sufficient (validation pending)'
          : `development-qualified and chronologically supported, but ${es}: not a research candidate`
        : `development-qualified, NO chronological support: not a deployment-qualified candidate without an explicit user decision; ${es}`;
};

export const governedFinalists = (finalists: readonly Finalist[], procedures: readonly Procedure[]): GovernedFinalist[] =>
  finalists.map((f) => {
    const proc = procedures.find((p) => p.population === f.arm);
    const primary = f.roles.includes(`primary ${f.arm}`);
    const supported = proc?.supported ?? false;

    return {
      ...f,
      armName: armName[f.arm],
      primary,
      chronology: proc ? proc.verdict : 'no procedure verdict',
      chronologicallySupported: primary && supported,
      a: f.qualified,
      b: primary && supported,
      d: f.sufficiency.pass,
      candidateLabel: f.label,
      governanceLabel: governanceLabelOf(f.qualified, f.failed, primary, supported, f.sufficiency)
    };
  });

export const preDetermination = (finalists: readonly Finalist[], procedures: readonly Procedure[]) => {
  const cut: CutoffKey = 'C24';
  const prim = (arm: ArmKey) => finalists.find((f) => f.arm === arm && f.roles.includes(`primary ${arm}`)) ?? null;
  const standalone = (['D', 'G'] as const).map((a) => prim(a)).filter((f): f is Finalist => f !== null && f.qualified);
  const bestStandalone = standalone.sort((a, b) => b.centreNet - a.centreNet || (a.label < b.label ? -1 : 1))[0] ?? null;
  const J = prim('J');
  const S = prim('S');

  return {
    rule: 'PROTOCOL.md §12 (outcome.ts): (a) Q1–Q6 at C24; (b) the arm’s primary and its independent chronological verdict supported; (c) V1–V3 on FULL; (d) evidence sufficiency ES1–ES3 at C24',
    sufficiencyRule,
    finalists: governedFinalists(finalists, procedures),
    comparisons: {
      bestStandalone: bestStandalone ? { arm: bestStandalone.arm, label: bestStandalone.label } : null,
      combinedVsStandalone: (['C', 'J', 'S'] as const).map((k) => compare(cut, k, bestStandalone ? { arm: bestStandalone.arm, label: bestStandalone.label } : null)),
      jointVsSequential: J && S ? [compare(cut, 'J', { arm: 'S', label: S.label }), compare(cut, 'S', { arm: 'J', label: J.label })] : [],
      caveat: 'a single historical pair never proves an architecture superior (standard §3.4); the arms’ chronological paths (sequential.json) are the repeated evidence'
    }
  };
};

export interface ValidationFlags {
  V1: boolean;
  V2: boolean;
  V3: boolean;
}
// a row of the sealed validation record (results/validation/validation.json): one evaluated subject (one configuration of
// one arm); `kind` 'selected' rows represent C24 subjects (a primary or a role), 'control' rows the external controls
// (never finalists, never eligible)
export interface ValidationRow {
  label: string;
  id: string;
  arm: ArmKey;
  kind: string;
  validation: ValidationFlags;
}

const flagsProblem = (v: unknown) =>
  typeof v === 'object' && v !== null && (['V1', 'V2', 'V3'] as const).every((k) => typeof (v as ValidationFlags)[k] === 'boolean')
    ? null
    : `malformed V1–V3 in the validation row (${JSON.stringify(v ?? null)})`;

// the canonical order of the outcome's lists: arm order, then id (independent of the input order)
const byArmThenId = (x: { arm: ArmKey; id: string }, y: { arm: ArmKey; id: string }) =>
  nominatingArms.indexOf(x.arm) - nominatingArms.indexOf(y.arm) || (x.id < y.id ? -1 : x.id > y.id ? 1 : 0);

export const outcomeOf = <P extends { finalists: readonly GovernedFinalist[]; comparisons: unknown }>(pre: P, rows: readonly ValidationRow[]) => {
  const { pairs, unmatchedRows } = joinByIdentity(pre.finalists, rows, {
    what: 'P9-MSFT outcome (PROTOCOL §12): C24 finalists ↔ FULL validation rows by (arm, id)',
    eligible: (r) => r.kind === 'selected',
    conflict: (f, r) =>
      typeof r.label !== 'string' || r.label.length === 0
        ? 'the validation row has no candidate label'
        : f.candidateLabel !== r.label
          ? `candidate label conflict: finalist "${f.candidateLabel}", validation row "${r.label}"`
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
      candidate: f.a && f.b && c && f.d,
      developmentOnly: f.a && f.primary && !f.b && c,
      insufficientEvidence: f.a && f.primary && f.b && c && !f.d
    };
  });
  const candidates = fin.filter((f) => f.candidate).sort(byArmThenId);
  const devOnly = fin.filter((f) => f.developmentOnly).sort(byArmThenId);
  const thin = fin.filter((f) => f.insufficientEvidence).sort(byArmThenId);
  const show = (xs: typeof fin) => xs.map((f) => `${f.arm} ${f.candidateLabel}${f.d ? '' : ` [insufficient evidence: ${f.sufficiency.failed.join(', ')}]`}`).join('; ');
  const list = (xs: typeof fin) => xs.map((f) => ({ arm: f.arm, label: f.candidateLabel, id: f.id, sufficient: f.d }));

  return {
    finalists: fin,
    unclaimedRows: unmatchedRows.length,
    candidates: list(candidates),
    developmentOnly: list(devOnly),
    insufficientEvidence: list(thin),
    comparisons: pre.comparisons as P['comparisons'],
    outcome: candidates.length
      ? `MSFT RESEARCH CANDIDATE(S) FOR THE USER'S REVIEW: ${show(candidates)} (development-qualified, chronologically supported, evidence sufficient, V1–V3 pass on previously examined 2025–2026 history; research nomination only — nothing adopted or deployed)`
      : `NO QUALIFYING MSFT CANDIDATE: no arm primary is development-qualified AND chronologically supported AND passes V1–V3 AND meets ES1–ES3${
          devOnly.length ? `; development-qualified without chronological support (not deployment-qualified without an explicit user decision): ${show(devOnly)}` : ''
        }${thin.length ? `; chronologically supported and validated but with insufficient evidence (not a research candidate): ${show(thin)}` : ''}`,
    ceiling: `the $35,000 (35 % of the fixed $100,000 allocation) marked-DD ceiling is a research criterion on historical paths, never an enforceable future loss limit (${ceiling})`
  };
};

export const finalistsExist = (cut: CutoffKey) => nominatingArms.every((a) => fs.existsSync(armSelectionFile(cut, a)));
export { originalOrder, rolesOf };
