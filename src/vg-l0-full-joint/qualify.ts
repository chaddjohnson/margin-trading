// Qualification, ranking evidence and NL0's roles (PROTOCOL.md §9; reference method NL0 1.0.0 §3.5; Assignment 2's
// qualify.ts with this study's neighbourhoods), identical for every cell, stage, track and cutoff, on the cutoff's
// training door only.
//
// Evidence per member: the centre; the DETAILED centre (evaluate.ts riskInputsOf: exposure at the cutoff close, per-lot
// adverse excursions, occupancy — RA1's inputs and the §5.9 disclosure); SELECTION 2 × 128 (ranking only; its tail
// statistics included); fresh CONFIRMATION 3 × 128 = 384 (labels ('confirm', rep, cutoff) — qualification only); the
// frozen stresses (Q5 and report-only); the causal removal reruns (report-only). Draws are common random numbers across
// every member of a cutoff (the labels never contain the cell, the stage or the track). The neighbourhoods perturb every
// active numeric input: both D1 books, their active control genes and Growth·VGT's active inputs (AD6).
//
// Gates (all must hold): Q1 centre net > 0; Q2 centre DD ≤ $35,000; Q3 confirmation p90 DD ≤ $35,000; Q4 confirmation
// p10 net > 0; Q5 at 10 bps per side: centre net > 0 and DD ≤ $35,000; Q6 D1 and Growth both funded at the centre.
import type { BookId } from '../vg-d1-growth-joint/books.ts';
import type { EvalOptions } from '../vg-d1-growth-joint/evaluate.ts';
import type { Tail } from '../vg-d1-growth-diagnostic/risk.ts';
import {
  type CompactRec,
  compact,
  enabledOf,
  fidelity,
  participationOf,
  pooledStats,
  removalsOf,
  stresses as a2Stresses
} from '../vg-l0-risk-families/qualify.ts';
import { economics, r2, symbols } from './context.ts';
import type { DRec, RiskInputs, SRec } from './evaluate.ts';
import {
  type Cfg,
  type Scope,
  activeInputs,
  actPatternOf,
  boundaryInputs,
  cellOf,
  cfgId,
  controlPatternOf,
  entryDayOf,
  gEntryOf,
  gId,
  gStratumOf,
  neighbourhood,
  pairOf
} from './space.ts';
import { type Nb, familiesFunded, nbStats } from './fitness.ts';
import { vOptions } from './nl0.ts';
import type { Lab } from './lab.ts';

import {
  type Evidence as A2Evidence,
  type Roles,
  actualProfitOrder as a2ActualProfitOrder,
  rolesOf as a2RolesOf
} from '../vg-l0-risk-families/qualify.ts';

export { roleNames, type RoleName, type Roles } from '../vg-l0-risk-families/qualify.ts';
export { compact, fidelity, type CompactRec };

export type MemberStage = 'broad' | 'refine' | 'informed' | 'incumbent' | 'control';
export type Track = 'I' | 'N' | 'control';

export interface Member {
  label: string; // e.g. C21/broad/GB1.VD0/R2#1 profit; C24/informed/GC.VA/R3#2 robust; incumbent: New L0
  lane: string;
  stage: MemberStage;
  track: Track;
  replicate: number | null;
  cfg: Cfg;
  pick: string; // the lane's shortlist slot (or the control's / incumbent's key)
}

export interface Evidence {
  label: string;
  lane: string;
  stage: MemberStage;
  track: Track;
  pick: string;
  replicate: number | null;
  cell: string;
  pair: string;
  base: boolean; // no entry-day book (RC 1 mechanics)
  activation: string; // e.g. "GDXe/VGTn" ('' without a protected book)
  controlPattern: string;
  growthEntry: string;
  growthStratum: string;
  growthId: string;
  id: string;
  cfg: Cfg;
  activeInputs: number;
  boundary: string[]; // active inputs on a bound of their box
  centre: SRec;
  risk: RiskInputs; // the detailed centre at the cutoff close (training evidence)
  select: Nb;
  selectTail: Tail;
  confirm: Nb;
  confirmTail: Tail;
  confirmReps: Nb[];
  confirmDraws: { drawn: number; unique: number };
  selectDraws: { drawn: number; unique: number };
  stress: Record<string, CompactRec>;
  removal: Record<string, CompactRec>;
  gates: Record<'Q1' | 'Q2' | 'Q3' | 'Q4' | 'Q5' | 'Q6', boolean>;
  qualified: boolean;
  failed: string[];
  severity: Record<string, number>;
  participation: Record<BookId, 'disabled' | 'unfunded' | 'token' | 'funded'>;
}

// The frozen stresses (standard §5.1; brief §5.3): Assignment 2's five, plus the 0 bps cost scenario (report-only). The
// stop-slippage stress applies to protective fills as to trailing fills (RC 1/RC 2); the next-open stress applies to
// every stop of the D1 books, entry-day protective stops included.
export const stresses: Record<string, EvalOptions['friction']> = { 'cost 0 bps': { costBps: 0 }, ...a2Stresses };

export const famOf = (name: string, labels: (string | number)[], scope: Scope = 'joint', scale = 1, n = fidelity.n) => ({
  name,
  n,
  labels,
  scope,
  scale
});

// The neighbour draws of a member's family.
export const drawsOf = (cfg: Cfg, f: ReturnType<typeof famOf>) =>
  neighbourhood(cfg, f).map((p) => ({ cfg: p.cfg, clipped: p.clipped, id: p.id }));

export const describeEvidence = (m: Member, cfg: Cfg) => {
  const cell = cellOf(cfg.cell);

  return {
    cell: cell.id,
    pair: pairOf(cell),
    base: !symbols.some((s) => entryDayOf(cfg, s)),
    activation: actPatternOf(cfg),
    controlPattern: controlPatternOf(cfg),
    growthEntry: gEntryOf(cfg),
    growthStratum: gStratumOf(cfg),
    growthId: gId(cfg.g),
    id: cfgId(cfg),
    activeInputs: activeInputs(cfg),
    boundary: boundaryInputs(cfg),
    label: m.label
  };
};

export const qualifyMembers = async (lab: Lab, members: readonly Member[], cutoff: string): Promise<Evidence[]> => {
  type Draw = { cfg: Cfg; clipped: number; id: string };
  type Plan = { m: Member; fams: Record<string, Draw[]>; singles: Record<string, EvalOptions> };

  const plans: Plan[] = members.map((m) => {
    const fams: Plan['fams'] = {};

    for (let rep = 1; rep <= fidelity.selectReps; rep++) fams[`select${rep}`] = drawsOf(m.cfg, famOf('select', ['select', rep, cutoff]));
    for (let rep = 1; rep <= fidelity.confirmReps; rep++) fams[`confirm${rep}`] = drawsOf(m.cfg, famOf('confirm', ['confirm', rep, cutoff]));

    const singles: Plan['singles'] = { centre: vOptions };

    for (const [name, f] of Object.entries(stresses)) singles[`stress:${name}`] = { ...vOptions, friction: { ...f } };
    for (const [name, drop] of Object.entries(removalsOf(enabledOf(vOptions))))
      singles[`removal:${name}`] = { ...vOptions, enabled: { ...vOptions.enabled, ...Object.fromEntries(drop.map((b) => [b, false])) } };
    return { m, fams, singles };
  });
  const items: { cfg: Cfg; options: EvalOptions; detail?: boolean }[] = [];

  for (const p of plans) {
    items.push({ cfg: p.m.cfg, options: vOptions, detail: true });
    for (const o of Object.values(p.singles)) items.push({ cfg: p.m.cfg, options: o });
    for (const f of Object.values(p.fams)) for (const x of f) items.push({ cfg: x.cfg, options: vOptions });
  }

  lab.stage = `qualify ${cutoff}: ${members.length} members, ${items.length} evaluations`;

  const recs = await lab.evalMany<SRec>(items, 'qualify');
  let at = 0;
  const out: Evidence[] = [];

  for (const p of plans) {
    const detail = recs[at++]! as DRec;
    const singles: Record<string, SRec> = {};

    for (const k of Object.keys(p.singles)) singles[k] = recs[at++]!;

    const famRecs: Record<string, SRec[]> = {};

    for (const [k, f] of Object.entries(p.fams)) famRecs[k] = f.map(() => recs[at++]!);

    const centre = singles.centre!;

    if (centre.net !== detail.net || centre.signature !== detail.signature) throw new Error(`${p.m.label}: detailed centre differs`);

    const pooled = (prefix: string) =>
      pooledStats(
        centre,
        Object.keys(p.fams)
          .filter((k) => k.startsWith(prefix))
          .map((k) => ({ draws: p.fams[k]!, recs: famRecs[k]! }))
      );
    const one = (k: string) =>
      nbStats(
        centre,
        famRecs[k]!,
        p.fams[k]!.map((x) => x.clipped)
      );
    const select = pooled('select');
    const confirm = pooled('confirm');
    const stress: Record<string, CompactRec> = {};
    const removal: Record<string, CompactRec> = {};

    for (const [k, r] of Object.entries(singles)) {
      if (k.startsWith('stress:')) stress[k.slice(7)] = compact(r);
      if (k.startsWith('removal:')) removal[k.slice(8)] = compact(r);
    }

    const c = economics.ceiling;
    const s10 = stress['cost 10 bps']!;
    const gates = {
      Q1: centre.net > 0,
      Q2: centre.dd <= c,
      Q3: confirm.nb.p90Dd <= c,
      Q4: confirm.nb.p10 > 0,
      Q5: s10.net > 0 && s10.dd <= c,
      Q6: familiesFunded(centre)
    };
    const failed = Object.entries(gates)
      .filter(([, v]) => !v)
      .map(([k]) => k);
    const severity: Record<string, number> = {};

    if (!gates.Q1) severity.Q1 = r2(-centre.net);
    if (!gates.Q2) severity.Q2 = r2(centre.dd - c);
    if (!gates.Q3) severity.Q3 = r2(confirm.nb.p90Dd - c);
    if (!gates.Q4) severity.Q4 = r2(-confirm.nb.p10);
    if (!gates.Q5) severity.Q5 = r2(Math.max(-s10.net, s10.dd - c));

    out.push({
      ...describeEvidence(p.m, p.m.cfg),
      lane: p.m.lane,
      stage: p.m.stage,
      track: p.m.track,
      pick: p.m.pick,
      replicate: p.m.replicate,
      cfg: p.m.cfg,
      centre,
      risk: detail.risk,
      select: select.nb,
      selectTail: select.tail,
      confirm: confirm.nb,
      confirmTail: confirm.tail,
      confirmReps: Array.from({ length: fidelity.confirmReps }, (_v, i) => one(`confirm${i + 1}`)),
      confirmDraws: { drawn: confirm.drawn, unique: confirm.unique },
      selectDraws: { drawn: select.drawn, unique: select.unique },
      stress,
      removal,
      gates,
      qualified: failed.length === 0,
      failed,
      severity,
      participation: participationOf(centre, enabledOf(vOptions))
    });
  }

  return out;
};

// NL0's roles and actual-profit order — Assignment 2's functions, unchanged (they read only the label, the gates, the
// centre and the selection family).
export const actualProfitOrder = (q: readonly Evidence[]) => a2ActualProfitOrder(q as unknown as A2Evidence[]) as unknown as Evidence[];
export const rolesOf = (set: string, ev: readonly Evidence[]): Roles => a2RolesOf(set, ev as unknown as A2Evidence[]);
