// Qualification (PROTOCOL.md §7): Assignment 3's instrument as Stage B ran it — the detailed centre, the centre, the
// stresses (Assignment 3's six + the report-only stop slippage 10 bps), the five causal removals, SELECTION 2 × 128 (ranking
// only) and fresh CONFIRMATION 3 × 128 (qualification only), common random numbers across every member of a cutoff (labels
// ('select' | 'confirm', rep, cutoff)) — with the risk envelope requested on EVERY evaluation. A member's neighbourhood is
// expSpace's: for a member with every book OFF it IS Assignment 3's (the same function), for an ON member the shared
// columns are Assignment 3's and the staged columns this study's (RULE_SPECIFICATION §6). The verdict is P0 (Stage B's
// CTRL arm, Assignment 3's gates Q1–Q6 exactly, through the pilot's verdictOf); both arms read the same verdict.
import type { EvalOptions, Rec } from '../vg-d1-growth-joint/evaluate.ts';
import { quantile } from '../vg-d1-growth-joint/fitness.ts';
import {
  compact,
  enabledOf,
  fidelity,
  participationOf,
  pooledStats,
  removalsOf
} from '../vg-l0-risk-families/qualify.ts';
import type { CompactRec } from '../vg-l0-risk-families/qualify.ts';
import {
  type Evidence as A3Evidence,
  type Member as A3Member,
  describeEvidence,
  famOf
} from '../vg-l0-full-joint/qualify.ts';
import type { DRec, SRec } from '../vg-l0-full-joint/evaluate.ts';
import { nbStats } from '../vg-l0-full-joint/fitness.ts';
import { vOptions } from '../vg-l0-full-joint/nl0.ts';
import type { EvalLab } from '../gpu-backend/lab.ts';
import { checkEnvelope } from '../gpu-backend/lab.ts';
import type { Envelope } from '../gpu-backend/batch.ts';
import { limitOf } from '../risk-envelope/policy.ts';
import { type ArmVerdict, verdictOf } from '../vg-l0-risk-envelope-pilot/qualify.ts';
import { type EnvNb, envNbStats } from '../vg-l0-risk-envelope-pilot/fitness.ts';
import type { Arm as PilotArm } from '../vg-l0-risk-envelope-pilot/context.ts';
import type { StagedConfig } from '../staged-stop/config.ts';
import type { StagedLite } from '../staged-stop/tracker.ts';
import { type ArmKey, C0, armOf } from './context.ts';
import { type PCfg, ctrlSpace, expSpace, stagedOf, stagedPatternOf } from './space.ts';
import { stresses } from './budget.ts';

export type Member = Omit<A3Member, 'cfg'> & { cfg: PCfg };
export type Role = 'member' | 'projection' | 'benchmark' | 'informed' | 'informed-projection' | 'decomposition';

export interface Origin {
  arm: ArmKey | 'benchmark' | 'report';
  role: Role;
  label: string;
  lane: string;
  pick: string;
  projectionOf?: string; // the member label a projection belongs to
  dropped?: string[]; // the books a projection switched OFF
}

export interface EnvelopeEvidence {
  centre: Envelope;
  select: EnvNb;
  confirm: EnvNb;
  confirmBreach: { n: number; markedDd35: number; pl25: number; bd30: number };
  stress: Record<string, { net: number; dd: number; envelope: Envelope }>;
  removal: Record<string, Envelope>;
  confirmP10Unrounded: number;
}

export interface Evidence extends Omit<A3Evidence, 'cfg'> {
  cfg: PCfg;
  staged: StagedConfig | null;
  stagedPattern: string;
  stagedCounters: Partial<Record<string, StagedLite>>; // the centre's counters (ON books)
  envelope: EnvelopeEvidence;
  verdict: ArmVerdict;
  origins: Origin[];
}

const p0 = armOf('CTRL', ctrlSpace) as unknown as PilotArm; // P0 (the arm's space plays no part in a verdict)
const envOf = (r: Rec, where: string) => checkEnvelope((r as SRec & { envelope?: unknown }).envelope, where);
const lim = (pct: number) => limitOf(pct, C0);

// The neighbour draws of a member's family (Assignment 3's drawsOf with expSpace's neighbourhood).
export const drawsOf = (cfg: PCfg, f: ReturnType<typeof famOf>) =>
  expSpace.neighbourhood(cfg, f).map((p) => ({ cfg: p.cfg, clipped: p.clipped, id: p.id }));

export const optionSetsOf = () => {
  const singles: Record<string, EvalOptions> = { centre: vOptions };

  for (const [name, f] of Object.entries(stresses)) singles[`stress:${name}`] = { ...vOptions, friction: { ...f } };
  for (const [name, drop] of Object.entries(removalsOf(enabledOf(vOptions))))
    singles[`removal:${name}`] = {
      ...vOptions,
      enabled: { ...vOptions.enabled, ...Object.fromEntries(drop.map((b) => [b, false])) }
    };
  return singles;
};

export const qualifyMembers = async (
  lab: EvalLab,
  members: readonly (Member & { origins: Origin[] })[],
  cutoff: string
): Promise<{ evidence: Evidence[]; requested: number }> => {
  type Draw = { cfg: PCfg; clipped: number; id: string };
  type Plan = { m: (typeof members)[number]; fams: Record<string, Draw[]>; singles: Record<string, EvalOptions> };

  const plans: Plan[] = members.map((m) => {
    const fams: Plan['fams'] = {};

    for (let rep = 1; rep <= fidelity.selectReps; rep++)
      fams[`select${rep}`] = drawsOf(m.cfg, famOf('select', ['select', rep, cutoff]));
    for (let rep = 1; rep <= fidelity.confirmReps; rep++)
      fams[`confirm${rep}`] = drawsOf(m.cfg, famOf('confirm', ['confirm', rep, cutoff]));
    return { m, fams, singles: optionSetsOf() };
  });
  const items: { cfg: PCfg; options: EvalOptions; detail?: boolean; risk: true }[] = [];

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

    if (centre.net !== detail.net || centre.signature !== detail.signature)
      throw new Error(`${p.m.label}: detailed centre differs`);

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
    const verdict = verdictOf(p0, centre, { nb: confirm.nb, recs: confirm.recs }, s10, p10);
    const over = (r: Rec, f: (e: Envelope) => number, limit: number) => r.error || f(envOf(r, 'confirm')) > limit;

    out.push({
      ...describeEvidence(p.m as unknown as A3Member, p.m.cfg as never),
      lane: p.m.lane,
      stage: p.m.stage,
      track: p.m.track,
      pick: p.m.pick,
      replicate: p.m.replicate,
      cfg: p.m.cfg,
      staged: stagedOf(p.m.cfg),
      stagedPattern: stagedPatternOf(p.m.cfg),
      stagedCounters: (centre as SRec & { staged?: Evidence['stagedCounters'] }).staged ?? {},
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
      gates: verdict.gates,
      qualified: verdict.qualified,
      failed: verdict.failed,
      severity: verdict.severity,
      participation: participationOf(centre, enabledOf(vOptions)),
      envelope: {
        centre: envOf(centre, `${p.m.label} centre`),
        select: envNbStats(select.recs),
        confirm: envNbStats(confirm.recs),
        confirmBreach: {
          n: confirm.recs.length,
          markedDd35: confirm.recs.filter((r) => r.error || r.dd > lim(35)).length,
          pl25: confirm.recs.filter((r) => over(r, (e) => e.principalLossLiquidation, lim(25))).length,
          bd30: confirm.recs.filter((r) => over(r, (e) => e.bankedDdLiquidation, lim(30))).length
        },
        stress: stressEnv,
        removal: removalEnv,
        confirmP10Unrounded: p10
      },
      verdict,
      origins: p.m.origins
    } as Evidence);
  }

  return { evidence: out, requested: items.length };
};

// the sealed form of an evidence row: the per-lot rows stay in the cache
export const sealedEvidence = (e: Evidence) => {
  const risk = e.risk as Evidence['risk'] & { rowsKept?: number };

  return { ...e, risk: { ...risk, rows: undefined, rowsKept: risk.rows ? risk.rows.length : risk.rowsKept } };
};
