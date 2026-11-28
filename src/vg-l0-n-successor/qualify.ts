// Qualification (PROTOCOL.md §9): Assignment 3's instrument, unchanged in every evaluation it requests — the detailed
// centre, the centre, the frozen stresses, the five causal removals, SELECTION 2 × 128 (ranking only) and CONFIRMATION
// 3 × 128 (qualification only), common random numbers across every member of a cutoff (labels ('select' | 'confirm', rep,
// cutoff) in Assignment 3's seed namespace: never the track, the cell or the lane) — on the GPU (Stage B's form of it,
// src/vg-l0-risk-envelope-stage-b/qualify.ts, with the single policy P0) and with the risk envelope requested on EVERY
// evaluation (report-only: trade principal loss and banked-capital DD never enter a gate).
//
//   Q1  centre net > 0
//   Q2  centre marked DD ≤ $35,000 (35 % of the fixed $100,000 allocation)
//   Q3  confirmation p90 marked DD (Priority 3's cent-rounded statistic) ≤ $35,000
//   Q4  confirmation p10 net (cents) > 0
//   Q5  at 10 bps per side: net > 0 and marked DD ≤ $35,000
//   Q6  a D1 book and Growth·VGT both funded at the centre
//
// Report-only stresses beyond Assignment 3's six (adaptation AD9, brief §6 "0/2/5/10/20 bps … slippage stress"): cost
// 2 bps per side and stop slippage +10 bps. They never enter a gate, a role or a ranking.
import type { EvalOptions, Rec } from '../vg-d1-growth-joint/evaluate.ts';
import { quantile } from '../vg-d1-growth-joint/fitness.ts';
import { compact, enabledOf, fidelity, participationOf, pooledStats, removalsOf } from '../vg-l0-risk-families/qualify.ts';
import type { CompactRec } from '../vg-l0-risk-families/qualify.ts';
import { type Evidence as A3Evidence, type Member, describeEvidence, drawsOf, famOf, stresses as a3Stresses } from '../vg-l0-full-joint/qualify.ts';
import type { DRec, SRec } from '../vg-l0-full-joint/evaluate.ts';
import type { Cfg } from '../vg-l0-full-joint/space.ts';
import { nbStats } from '../vg-l0-full-joint/fitness.ts';
import { vOptions } from '../vg-l0-full-joint/nl0.ts';
import type { EvalLab } from '../gpu-backend/lab.ts';
import { checkEnvelope } from '../gpu-backend/lab.ts';
import type { Envelope } from '../gpu-backend/batch.ts';
import { type ArmVerdict, type GateName, gateNames, verdictOf } from '../vg-l0-risk-envelope-pilot/qualify.ts';
import { type EnvNb, envNbStats } from '../vg-l0-risk-envelope-pilot/fitness.ts';
import { C0, P0, ceiling } from './context.ts';

export type { ArmVerdict, GateName, Member };
export { gateNames };

// Assignment 3's six (cost 0 / 10 / 20 bps, interest 14 %, stop slippage +25 bps, next-open stops) + the two report-only
export const stresses: Record<string, EvalOptions['friction']> = {
  ...a3Stresses,
  'cost 2 bps': { costBps: 2 },
  'stop slippage +10 bps': { stopSlippageBps: 10 }
};

export interface EnvelopeEvidence {
  centre: Envelope;
  select: EnvNb;
  confirm: EnvNb;
  stress: Record<string, { net: number; dd: number; envelope: Envelope }>;
  removal: Record<string, Envelope>;
  confirmP10Unrounded: number;
}

// P5-NS's tracks: F (independent, every cutoff), N (N/original-informed, C24), control (the frozen references at every
// cutoff, descriptive); stages broad | refine | informed | incumbent | control
export type P5Track = 'F' | 'N' | 'control';
export type P5Stage = 'broad' | 'refine' | 'informed' | 'incumbent' | 'control';

export interface Evidence extends Omit<A3Evidence, 'track' | 'stage'> {
  track: P5Track;
  stage: P5Stage;
  envelope: EnvelopeEvidence;
  p0: ArmVerdict;
  sources: { track: P5Track; label: string; lane: string; pick: string }[];
}

const envOf = (r: Rec, where: string) => checkEnvelope((r as SRec & { envelope?: unknown }).envelope, where);

export type QMember = Omit<Member, 'track' | 'stage'> & { track: P5Track; stage: P5Stage; sources: Evidence['sources'] };

// the deterministic requested count per member (bounded in budget.ts)
export const perMember = () =>
  2 + Object.keys(stresses).length + Object.keys(removalsOf(enabledOf(vOptions))).length + (fidelity.selectReps + fidelity.confirmReps) * fidelity.n;

export const qualifyMembers = async (lab: EvalLab, members: readonly QMember[], cutoff: string): Promise<{ evidence: Evidence[]; requested: number }> => {
  type Draw = { cfg: Cfg; clipped: number; id: string };
  type Plan = { m: QMember; fams: Record<string, Draw[]>; singles: Record<string, EvalOptions> };

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
  const items: { cfg: Cfg; options: EvalOptions; detail?: boolean; risk: true }[] = [];

  for (const p of plans) {
    items.push({ cfg: p.m.cfg, options: vOptions, detail: true, risk: true });
    for (const o of Object.values(p.singles)) items.push({ cfg: p.m.cfg, options: o, risk: true });
    for (const f of Object.values(p.fams)) for (const x of f) items.push({ cfg: x.cfg, options: vOptions, risk: true });
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
    // the unrounded confirmation p10 net (a failed draw counts as a loss of the whole allocation, as in nbStats)
    const p10 = quantile(
      confirm.recs.map((r) => (r.error ? -C0 : r.net)).sort((a, b) => a - b),
      0.1
    );
    const v = verdictOf(P0, centre, { nb: confirm.nb, recs: confirm.recs }, s10, p10);

    if (P0.markedDdLimit !== ceiling) throw new Error('P0 must gate the marked DD at $35,000');

    out.push({
      ...describeEvidence(p.m as unknown as Member, p.m.cfg),
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
      gates: v.gates,
      qualified: v.qualified,
      failed: v.failed,
      severity: v.severity,
      participation: participationOf(centre, enabledOf(vOptions)),
      envelope: {
        centre: envOf(centre, `${p.m.label} centre`),
        select: envNbStats(select.recs),
        confirm: envNbStats(confirm.recs),
        stress: stressEnv,
        removal: removalEnv,
        confirmP10Unrounded: p10
      },
      p0: v,
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
