// Qualification (PROTOCOL.md §9): Priority 5's instrument (src/vg-l0-n-successor/qualify.ts = Assignment 3's, on the GPU,
// with the risk envelope on every evaluation) on the MSFT space — per member: the DETAILED centre (training exposure,
// per-lot excursions, occupancy: RA1's inputs and the §5.9 disclosure), the centre, Priority 5's eight stresses, the
// arm's causal removals, SELECTION 2 × 128 (ranking only) and CONFIRMATION 3 × 128 = 384 (qualification only); common
// random numbers across every member of a cutoff and across ARMS (labels ('select' | 'confirm', rep, cutoff) in this
// study's namespace: never the arm, cell, stage or lane).
//
//   Q1  centre net > 0
//   Q2  centre marked DD ≤ $35,000 (35 % of the fixed $100,000 allocation; never of peak equity)
//   Q3  confirmation p90 marked DD (Priority 3's cent-rounded statistic) ≤ $35,000
//   Q4  confirmation p10 net (cents) > 0
//   Q5  at 10 bps per side: net > 0 and marked DD ≤ $35,000
//   Q6  every family of the arm funded at the centre (D: D1·MSFT; G: Growth·MSFT; C, J, S: both)
// Q1–Q5 are the pilot's P0 verdict exactly; Q6 replaces "a D1 book and Growth·VGT both funded" by the arm's families.
// Report-only per member: the stresses (cost 0 / 2 / 10 / 20 bps, interest 14 %, stop slippage +10 / +25 bps, next-open
// stops), the causal removals (C, J, S: without D1, without Growth), participation labels, the risk envelope.
import type { EvalOptions, Rec } from '../vg-d1-growth-joint/evaluate.ts';
import { quantile } from '../vg-d1-growth-joint/fitness.ts';
import { compact, enabledOf, fidelity, participationOf, pooledStats, removalsOf } from '../vg-l0-risk-families/qualify.ts';
import type { CompactRec } from '../vg-l0-risk-families/qualify.ts';
import type { Tail } from '../vg-d1-growth-diagnostic/risk.ts';
import type { BookId } from '../vg-d1-growth-joint/books.ts';
import type { DRec, RiskInputs, SRec } from '../vg-l0-full-joint/evaluate.ts';
import { type Nb, nbStats } from '../vg-l0-full-joint/fitness.ts';
import type { EvalLab } from '../gpu-backend/lab.ts';
import { checkEnvelope } from '../gpu-backend/lab.ts';
import type { Envelope } from '../gpu-backend/batch.ts';
import { type ArmVerdict, type GateName, gateNames, verdictOf as p0Verdict } from '../vg-l0-risk-envelope-pilot/qualify.ts';
import { type EnvNb, envNbStats } from '../vg-l0-risk-envelope-pilot/fitness.ts';
import { stresses as p5Stresses } from '../vg-l0-n-successor/qualify.ts';
import { type ArmKey, C0, armOptions, armPolicy, ceiling } from './context.ts';
import { armFunded } from './fitness.ts';
import {
  type Cfg,
  type NFamily,
  activeInputs,
  actPatternOf,
  armOfCell,
  boundaryInputs,
  cellOf,
  cfgId,
  controlPatternOf,
  exitsOptions,
  gEntryOf,
  gId,
  growthStratumOf,
  hasD1,
  hasGrowth,
  istopOptions,
  neighbourhood,
  unrestrictedGrowth
} from './space.ts';

export type { ArmVerdict, GateName };
export { gateNames };

// Priority 5's eight frozen stresses (Assignment 3's six + cost 2 bps + stop slippage +10 bps)
export const stresses: Record<string, EvalOptions['friction']> = p5Stresses;
if (Object.keys(stresses).length !== 8) throw new Error('the frozen stresses are not eight');

export type Stage = 'broad' | 'refine' | 'fixed' | 'control';

export interface Member {
  label: string; // e.g. C21/D/broad/D.B1/R102#1 profit; C24/C/pair D1#1×G#2; control: NL0 D1 on MSFT
  arm: ArmKey;
  lane: string;
  stage: Stage;
  replicate: number | null;
  cfg: Cfg;
  pick: string;
  sources: { label: string; lane: string; pick: string }[];
}

export interface EnvelopeEvidence {
  centre: Envelope;
  select: EnvNb;
  confirm: EnvNb;
  stress: Record<string, { net: number; dd: number; envelope: Envelope }>;
  removal: Record<string, Envelope>;
  confirmP10Unrounded: number;
}

export interface Evidence {
  label: string;
  arm: ArmKey;
  lane: string;
  stage: Stage;
  pick: string;
  replicate: number | null;
  cell: string;
  d1Structure: string | null; // e.g. B1
  growthProtection: string | null; // e.g. hold_on_buffer_off / istop on
  unrestrictedGrowth: boolean | null; // G.h0.s0-type Growth (no maximum hold, no initial stop)
  base: boolean; // no entry-day protective activation (RC 1 mechanics)
  activation: string;
  controlPattern: string;
  growthEntry: string | null;
  growthStratum: string;
  growthId: string | null;
  id: string;
  cfg: Cfg;
  activeInputs: number;
  boundary: string[];
  centre: SRec;
  risk: RiskInputs; // the detailed centre at the door's end (training evidence)
  select: Nb;
  selectTail: Tail;
  confirm: Nb;
  confirmTail: Tail;
  confirmReps: Nb[];
  confirmDraws: { drawn: number; unique: number };
  selectDraws: { drawn: number; unique: number };
  stress: Record<string, CompactRec>;
  removal: Record<string, CompactRec>;
  gates: Record<GateName, boolean>;
  qualified: boolean;
  failed: GateName[];
  severity: Record<string, number>;
  reasons: string[];
  participation: Record<BookId, 'disabled' | 'unfunded' | 'token' | 'funded'>;
  envelope: EnvelopeEvidence;
  sources: Member['sources'];
}

export const famOf = (name: string, labels: (string | number)[], scale = 1, n = fidelity.n): NFamily => ({ name, n, labels, scope: 'joint', scale });
export const drawsOf = (cfg: Cfg, f: NFamily) => neighbourhood(cfg, f).map((p) => ({ cfg: p.cfg, clipped: p.clipped, id: p.id }));

export const describeEvidence = (m: Member) => {
  const cell = cellOf(m.cfg.cell);
  const growth = hasGrowth(cell.arm);

  return {
    label: m.label,
    cell: cell.id,
    d1Structure: hasD1(cell.arm) ? `${cell.d1!.family}${cell.d1!.gate ? 1 : 0}` : null,
    growthProtection: growth ? `${exitsOptions[cell.exits!]} / istop ${istopOptions[cell.istop!]}` : null,
    unrestrictedGrowth: growth ? unrestrictedGrowth(cell) : null,
    base: !actPatternOf(m.cfg).includes('e'),
    activation: actPatternOf(m.cfg),
    controlPattern: controlPatternOf(m.cfg),
    growthEntry: growth ? gEntryOf(m.cfg) : null,
    growthStratum: growthStratumOf(m.cfg),
    growthId: growth ? gId(m.cfg.g) : null,
    id: cfgId(m.cfg),
    activeInputs: activeInputs(m.cfg),
    boundary: boundaryInputs(m.cfg)
  };
};

const envOf = (r: Rec, where: string) => checkEnvelope((r as SRec & { envelope?: unknown }).envelope, where);

// the P0 verdict of the pilot (Q1–Q5 exactly) with the arm's Q6
export const verdictOfArm = (arm: ArmKey, centre: SRec, confirm: { nb: Nb; recs: Rec[] }, s10: SRec, p10: number): ArmVerdict => {
  const a = armPolicy(arm);
  const v = p0Verdict(a, centre, confirm, s10, p10);
  const gates = { ...v.gates, Q6: !centre.error && armFunded(centre, a) };
  const failed = gateNames.filter((k) => !gates[k]);
  const reasons = [...v.reasons.filter((r) => !r.startsWith('Q6')), ...(gates.Q6 ? [] : ['Q6 a family of the arm unfunded'])];

  return { gates, qualified: failed.length === 0, failed, severity: v.severity, reasons };
};

// the deterministic requested count per member of an arm
export const perMember = (arm: ArmKey) =>
  2 + Object.keys(stresses).length + Object.keys(removalsOf(enabledOf(armOptions[arm]))).length + (fidelity.selectReps + fidelity.confirmReps) * fidelity.n;

export const qualifyMembers = async (lab: EvalLab, members: readonly Member[], cutoff: string): Promise<{ evidence: Evidence[]; requested: number }> => {
  type Draw = { cfg: Cfg; clipped: number; id: string };
  type Plan = { m: Member; o: EvalOptions; fams: Record<string, Draw[]>; singles: Record<string, EvalOptions> };

  const plans: Plan[] = members.map((m) => {
    if (armOfCell(m.cfg.cell) !== m.arm) throw new Error(`${m.label}: cell ${m.cfg.cell} is not of arm ${m.arm}`);

    const o = armOptions[m.arm];
    const fams: Plan['fams'] = {};

    for (let rep = 1; rep <= fidelity.selectReps; rep++) fams[`select${rep}`] = drawsOf(m.cfg, famOf('select', ['select', rep, cutoff]));
    for (let rep = 1; rep <= fidelity.confirmReps; rep++) fams[`confirm${rep}`] = drawsOf(m.cfg, famOf('confirm', ['confirm', rep, cutoff]));

    const singles: Plan['singles'] = { centre: o };

    for (const [name, f] of Object.entries(stresses)) singles[`stress:${name}`] = { ...o, friction: { ...f } };
    for (const [name, drop] of Object.entries(removalsOf(enabledOf(o))))
      singles[`removal:${name}`] = { ...o, enabled: { ...o.enabled, ...Object.fromEntries(drop.map((b) => [b, false])) } };
    return { m, o, fams, singles };
  });
  const items: { cfg: Cfg; options: EvalOptions; detail?: boolean; risk: true }[] = [];

  for (const p of plans) {
    items.push({ cfg: p.m.cfg, options: p.o, detail: true, risk: true });
    for (const o of Object.values(p.singles)) items.push({ cfg: p.m.cfg, options: o, risk: true });
    for (const f of Object.values(p.fams)) for (const x of f) items.push({ cfg: x.cfg, options: p.o, risk: true });
  }

  lab.stage = `qualify ${cutoff}: ${members.length} members, ${items.length} evaluations`;

  const recs = await lab.evalMany<SRec>(items, `qualify ${cutoff}`);
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
    const stressEnv: EnvelopeEvidence['stress'] = {};
    const removalEnv: EnvelopeEvidence['removal'] = {};

    for (const [k, r] of Object.entries(singles)) {
      if (k.startsWith('stress:')) {
        stress[k.slice(7)] = compact(r);
        stressEnv[k.slice(7)] = { net: r.net, dd: r.dd, envelope: envOf(r, `${p.m.label} ${k}`) };
      }
      if (k.startsWith('removal:')) {
        removal[k.slice(8)] = compact(r);
        removalEnv[k.slice(8)] = envOf(r, `${p.m.label} ${k}`);
      }
    }

    const s10 = singles['stress:cost 10 bps']!;
    const p10 = quantile(
      confirm.recs.map((r) => (r.error ? -C0 : r.net)).sort((a, b) => a - b),
      0.1
    );
    const v = verdictOfArm(p.m.arm, centre, { nb: confirm.nb, recs: confirm.recs }, s10, p10);

    if (armPolicy(p.m.arm).markedDdLimit !== ceiling) throw new Error('P0 must gate the marked DD at $35,000');

    out.push({
      ...describeEvidence(p.m),
      arm: p.m.arm,
      lane: p.m.lane,
      stage: p.m.stage,
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
      gates: v.gates,
      qualified: v.qualified,
      failed: v.failed,
      severity: v.severity,
      reasons: v.reasons,
      participation: participationOf(centre, enabledOf(p.o)),
      envelope: {
        centre: envOf(centre, `${p.m.label} centre`),
        select: envNbStats(select.recs),
        confirm: envNbStats(confirm.recs),
        stress: stressEnv,
        removal: removalEnv,
        confirmP10Unrounded: p10
      },
      sources: p.m.sources
    });
  }

  return { evidence: out, requested: items.length };
};

// the sealed form of an evidence row: the per-lot rows stay in the cache (idempotent)
export const sealedEvidence = (e: Evidence) => {
  const risk = e.risk as Evidence['risk'] & { rowsKept?: number };

  return { ...e, risk: { ...risk, rows: undefined, rowsKept: risk.rows ? risk.rows.length : risk.rowsKept } };
};
