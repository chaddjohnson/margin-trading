// Qualification, ranking and roles (PROTOCOL.md §7), identical at every cutoff, on the cutoff's training door only.
import type { Allocation } from './allocator.ts';
import { economics, r2 } from './context.ts';
import type { EvalOptions, Rec } from './evaluate.ts';
import { type Nb, type Need, bandedOrder, nbStats } from './fitness.ts';
import type { Lab } from './lab.ts';
import {
  type Joint,
  type Scope,
  cellName,
  cellOf,
  classOf,
  jointId,
  neighbourhood,
  normalize,
  structureOf
} from './space.ts';

export interface Member {
  label: string; // e.g. C24/indep/A/rise/off#1 (lane key + pick)
  lane: string;
  kind: 'indep' | 'informed' | 'd1only' | 'gonly' | 'control';
  need: Need;
  joint: Joint;
  options: EvalOptions; // the lane's (single-family lanes disable one family)
}

export interface Evidence {
  label: string;
  lane: string;
  kind: Member['kind'];
  id: string;
  joint: Joint;
  cell: string;
  class: ReturnType<typeof classOf>;
  centre: Rec;
  select: Nb; // 2 × 128 pooled
  confirm: Nb; // 3 × 128 pooled (≥ 384 independent draws before de-duplication)
  confirmReps: Nb[];
  confirmDraws: { drawn: number; unique: number };
  d1Only: Nb | null; // only D1's inputs perturbed (joint members)
  gOnly: Nb | null; // only Growth's inputs perturbed
  allocOnly: Nb | null; // only B's targets moved
  small: Nb;
  wide: Nb;
  stress: Record<string, Rec>;
  toggles: Record<string, Rec>; // categorical alternatives (report-only)
  removal: { withoutD1: Rec | null; withoutG: Rec | null }; // causal reruns with one family disabled
  gates: Record<string, boolean>;
  qualified: boolean;
  failed: string[];
  participation: 'mixed' | 'token' | 'single-family';
}

export const fidelity = { select: 128, selectReps: 2, confirm: 128, confirmReps: 3, side: 128 };

// Frozen stresses (PROTOCOL.md §8.2). Next-open stop fills are unsupported by Growth's optional exit rules (they assume
// fills at the stop level); for such members that stress is recorded as not applicable.
export const stresses: Record<string, EvalOptions['friction']> = {
  'cost 10 bps': { costBps: 10 },
  'cost 20 bps': { costBps: 20 },
  'interest 14%': { rate: 0.14 },
  'stop slippage +25 bps': { stopSlippageBps: 25 },
  'next-open stops': { stopFill: 'next-open' }
};

const nextOpenSupported = (j: Joint) => {
  const s = structureOf(j.g);

  return s.istop !== 'on' && s.retain !== 'on';
};

export const scopeOfNeed = (need: Need): Scope => (need === 'D1' ? 'd1' : need === 'G' ? 'g' : 'joint');

const fixedFor = (m: Member, j: Joint): Joint =>
  m.need === 'D1'
    ? normalize({ ...j, g: m.joint.g, a: m.joint.a })
    : m.need === 'G'
      ? normalize({ ...j, d1: m.joint.d1, a: m.joint.a })
      : j;

// The categorical alternatives of a member (report-only): the other architecture (B at 100%/100% from A; A from B),
// the other priority, and every enabled optional Growth rule switched OFF.
export const togglesOf = (j: Joint): Record<string, Joint> => {
  const out: Record<string, Joint> = {};
  const add = (name: string, x: Joint) => {
    try {
      const n = normalize(x);

      if (jointId(n) !== jointId(j)) out[name] = n;
    } catch {
      // not a valid alternative
    }
  };
  const other: Allocation =
    j.a.arch === 'A'
      ? { arch: 'B', d1Target: 1, gTarget: 1, first: j.a.first }
      : { ...j.a, arch: 'A', d1Target: 1, gTarget: 1 };
  const s = structureOf(j.g);

  add(j.a.arch === 'A' ? 'architecture B (100%/100%)' : 'architecture A', { ...j, a: other });
  add('priority flipped', { ...j, a: { ...j.a, first: j.a.first === 'D1' ? 'G' : 'D1' } });
  if (j.a.arch === 'B' && (j.a.d1Target !== 1 || j.a.gTarget !== 1))
    add('B at 100%/100%', { ...j, a: { ...j.a, d1Target: 1, gTarget: 1 } });
  if (s.retain === 'on') add('retention OFF', { ...j, g: { ...j.g, retentionEnabled: false } });
  if (s.gate === 'on') add('recovery gate OFF', { ...j, g: { ...j.g, drawdownRecoveryGateEnabled: false } });
  if (s.trend !== 'off') add('trend filter OFF', { ...j, g: { ...j.g, trendFilterEnabled: false } });
  if (s.elig !== 'off') add('eligibility OFF', { ...j, g: { ...j.g, eligibilityEnabled: false } });
  if (s.istop === 'on') add('initial stop OFF', { ...j, g: { ...j.g, initialStopEnabled: false } });
  if (s.cont !== 'off') add('continuation OFF', { ...j, g: { ...j.g, continuationEnabled: false } });
  if (s.exits === 'hold_on_buffer_on')
    add('loss buffer OFF', { ...j, g: { ...j.g, intradayLossBufferEnabled: false } });

  return out;
};

// Token participation (a label, not a veto): a family with funded lots whose share of the pool's funded
// principal-days is below 5%.
export const participationOf = (r: Rec): Evidence['participation'] => {
  if (!(r.fam.D1.lots > 0 && r.fam.G.lots > 0)) return 'single-family';

  const total = r.fam.D1.principalDays + r.fam.G.principalDays;

  return total > 0 && Math.min(r.fam.D1.principalDays, r.fam.G.principalDays) / total < 0.05 ? 'token' : 'mixed';
};

export const qualifyMembers = async (lab: Lab, members: readonly Member[], cutoff: string): Promise<Evidence[]> => {
  // one batch per member family of evaluations, all members together (the pool stays busy)
  type Plan = {
    m: Member;
    fams: Record<string, { joint: Joint; clipped: number }[]>;
    singles: Record<string, { joint: Joint; options: EvalOptions } | null>;
  };
  const plans: Plan[] = members.map((m) => {
    const scope = scopeOfNeed(m.need);
    const fam = (name: string, labels: (string | number)[], sc: Scope, scale = 1, n = fidelity.side) =>
      neighbourhood(m.joint, { name, n, labels, scope: sc, scale }).map((p) => ({
        joint: fixedFor(m, p.joint),
        clipped: p.clipped
      }));
    const fams: Plan['fams'] = {};

    for (let rep = 1; rep <= fidelity.selectReps; rep++)
      fams[`select${rep}`] = fam('select', ['select', rep, cutoff], scope, 1, fidelity.select);
    for (let rep = 1; rep <= fidelity.confirmReps; rep++)
      fams[`confirm${rep}`] = fam('confirm', ['confirm', rep, cutoff], scope, 1, fidelity.confirm);
    if (m.need === 'mixed') {
      fams.d1 = fam('d1', ['d1only', cutoff], 'd1');
      fams.g = fam('g', ['gonly', cutoff], 'g');
      if (m.joint.a.arch === 'B') fams.alloc = fam('alloc', ['alloc', cutoff], 'alloc', 1, 32);
    }
    fams.small = fam('small', ['small', cutoff], scope, 0.5);
    fams.wide = fam('wide', ['wide', cutoff], scope, 1.5);

    const singles: Plan['singles'] = { centre: { joint: m.joint, options: m.options } };

    for (const [name, f] of Object.entries(stresses))
      singles[`stress:${name}`] =
        name === 'next-open stops' && m.need === 'G' && !nextOpenSupported(m.joint)
          ? null
          : { joint: m.joint, options: { ...m.options, friction: { ...(m.options.friction ?? {}), ...f } } };
    if (m.need === 'mixed') {
      for (const [name, j] of Object.entries(togglesOf(m.joint)))
        singles[`toggle:${name}`] = { joint: j, options: m.options };
      singles['removal:D1'] = { joint: m.joint, options: { ...m.options, enabled: { D1: false, G: true } } };
      singles['removal:G'] = { joint: m.joint, options: { ...m.options, enabled: { D1: true, G: false } } };
    }

    return { m, fams, singles };
  });

  const items: { joint: Joint; options: EvalOptions }[] = [];

  for (const p of plans) {
    for (const s of Object.values(p.singles)) if (s) items.push(s);
    for (const f of Object.values(p.fams)) for (const x of f) items.push({ joint: x.joint, options: p.m.options });
  }

  lab.stage = `qualify ${cutoff}: ${members.length} members, ${items.length} evaluations`;

  const recs = await lab.evalMany(items);
  let at = 0;
  const out: Evidence[] = [];

  for (const p of plans) {
    const singles: Record<string, Rec | null> = {};

    for (const [k, s] of Object.entries(p.singles)) singles[k] = s ? recs[at++]! : null;

    const famRecs: Record<string, Rec[]> = {};

    for (const [k, f] of Object.entries(p.fams)) famRecs[k] = f.map(() => recs[at++]!);

    const centre = singles.centre!;
    const pooled = (prefix: string) => {
      const keys = Object.keys(p.fams).filter((k) => k.startsWith(prefix));
      const seen = new Set<string>();
      const rs: Rec[] = [];
      const clipped: number[] = [];
      let drawn = 0;

      for (const k of keys)
        p.fams[k]!.forEach((x, i) => {
          drawn++;

          const id = jointId(x.joint);

          if (seen.has(id)) return;
          seen.add(id);
          rs.push(famRecs[k]![i]!);
          clipped.push(x.clipped);
        });

      return { nb: nbStats(centre, rs, clipped), drawn, unique: rs.length };
    };
    const one = (k: string) =>
      p.fams[k]
        ? nbStats(
            centre,
            famRecs[k]!,
            p.fams[k]!.map((x) => x.clipped)
          )
        : null;
    const select = pooled('select');
    const confirm = pooled('confirm');
    const confirmReps = Array.from({ length: fidelity.confirmReps }, (_v, i) => one(`confirm${i + 1}`)!);
    const stress: Record<string, Rec> = {};
    const toggles: Record<string, Rec> = {};

    for (const [k, r] of Object.entries(singles)) {
      if (!r) continue;
      if (k.startsWith('stress:')) stress[k.slice(7)] = r;
      if (k.startsWith('toggle:')) toggles[k.slice(7)] = r;
    }

    const c = economics.ceiling;
    const s10 = stress['cost 10 bps']!;
    const structure =
      p.m.need === 'mixed' ? centre.mixed : p.m.need === 'D1' ? centre.fam.D1.lots > 0 : centre.fam.G.lots > 0;
    const gates = {
      Q1: centre.net > 0,
      Q2: centre.dd <= c,
      Q3: confirm.nb.p90Dd <= c,
      Q4: confirm.nb.p10 > 0,
      Q5: s10.net > 0 && s10.dd <= c,
      Q6: structure
    };
    const failed = Object.entries(gates)
      .filter(([, v]) => !v)
      .map(([k]) => k);

    out.push({
      label: p.m.label,
      lane: p.m.lane,
      kind: p.m.kind,
      id: jointId(p.m.joint),
      joint: p.m.joint,
      cell: cellName(cellOf(p.m.joint)),
      class: classOf(p.m.joint),
      centre,
      select: select.nb,
      confirm: confirm.nb,
      confirmReps,
      confirmDraws: { drawn: confirm.drawn, unique: confirm.unique },
      d1Only: one('d1'),
      gOnly: one('g'),
      allocOnly: one('alloc'),
      small: one('small')!,
      wide: one('wide')!,
      stress,
      toggles,
      removal: { withoutD1: singles['removal:D1'] ?? null, withoutG: singles['removal:G'] ?? null },
      gates,
      qualified: failed.length === 0,
      failed,
      participation: participationOf(centre)
    });
  }

  return out;
};

// ----- ranking and roles (PROTOCOL.md §7.3–§7.4) -----

export interface Selection {
  cutoff: string;
  ranked: { rank: number; label: string; id: string; robust: number; p90: number }[];
  primary: string | null; // label
  roles: Record<string, string | null>;
  frozen: string[]; // labels, in role order
  reason: string;
}

export const rankQualified = (ev: readonly Evidence[]) =>
  bandedOrder(
    ev.filter((e) => e.qualified).map((e) => ({ id: e.label, robust: e.select.robust, p90: e.select.p90Dd, e }))
  ).map((x, i) => ({ rank: i + 1, e: x.e }));

export const selectRoles = (cutoff: string, ev: readonly Evidence[], cap = 6): Selection => {
  const joint = ev.filter((e) => (e.kind === 'indep' || e.kind === 'informed') && e.qualified && e.centre.mixed);
  const ranked = rankQualified(joint);

  if (ranked.length === 0)
    return {
      cutoff,
      ranked: [],
      primary: null,
      roles: {
        primary: null,
        'high-profit': null,
        balanced: null,
        'lower-drawdown': null,
        'other-architecture': null,
        'structurally-distinct': null
      },
      frozen: [],
      reason:
        'no qualified mixed candidate: the predeclared fallback applies (no primary; flat in the evaluation slice)'
    };

  const top = ranked[0]!.e;
  const byRank = (pred: (e: Evidence) => boolean) => ranked.find((x) => pred(x.e))?.e ?? null;
  const roles: Record<string, Evidence | null> = {
    primary: top,
    'high-profit': [...joint].sort((a, b) => b.centre.net - a.centre.net || (a.label < b.label ? -1 : 1))[0] ?? null,
    balanced:
      [...joint].sort(
        (a, b) =>
          b.select.robust / Math.max(1, b.select.p90Dd) - a.select.robust / Math.max(1, a.select.p90Dd) ||
          (a.label < b.label ? -1 : 1)
      )[0] ?? null,
    'lower-drawdown':
      [...joint]
        .filter((e) => e.select.robust >= 0.5 * top.select.robust)
        .sort((a, b) => a.select.p90Dd - b.select.p90Dd || (a.label < b.label ? -1 : 1))[0] ?? null,
    'other-architecture': byRank((e) => e.joint.a.arch !== top.joint.a.arch),
    'structurally-distinct': byRank((e) => e.cell !== top.cell && e.joint.a.arch === top.joint.a.arch)
  };
  const frozen: string[] = [];

  for (const e of Object.values(roles)) if (e && !frozen.includes(e.label) && frozen.length < cap) frozen.push(e.label);

  return {
    cutoff,
    ranked: ranked.map((x) => ({
      rank: x.rank,
      label: x.e.label,
      id: x.e.id,
      robust: x.e.select.robust,
      p90: x.e.select.p90Dd
    })),
    primary: top.label,
    roles: Object.fromEntries(Object.entries(roles).map(([k, e]) => [k, e?.label ?? null])),
    frozen,
    reason: `${ranked.length} qualified mixed candidate(s)`
  };
};

export const summary = (e: Evidence) => ({
  label: e.label,
  id: e.id,
  cell: e.cell,
  net: e.centre.net,
  dd: e.centre.dd,
  selectRobust: e.select.robust,
  selectP90: e.select.p90Dd,
  confirmMedian: e.confirm.median,
  confirmP10: e.confirm.p10,
  confirmP90Dd: e.confirm.p90Dd,
  breachShare: e.confirm.breachShare,
  worstDd: e.confirm.worstDd,
  qualified: e.qualified,
  failed: e.failed.join(','),
  participation: e.participation,
  d1Lots: e.centre.fam.D1.lots,
  gLots: e.centre.fam.G.lots,
  d1Booked: e.centre.fam.D1.booked,
  gBooked: e.centre.fam.G.booked,
  withoutD1: e.removal.withoutD1?.net ?? null,
  withoutG: e.removal.withoutG?.net ?? null,
  d1Contribution: e.removal.withoutD1 ? r2(e.centre.net - e.removal.withoutD1.net) : null,
  gContribution: e.removal.withoutG ? r2(e.centre.net - e.removal.withoutG.net) : null
});
