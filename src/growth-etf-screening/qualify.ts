// Qualification, roles and descriptive comparisons (PROTOCOL.md §8, §9), identical for every ETF and cutoff, on the
// cutoff's training door only.
//
// Evidence per member (every family has common random numbers across every member and every ETF of the cutoff — the
// matched instrument):
//   - the centre;
//   - SELECTION 1 × 128 (labels ('select', cutoff); ranking, confirmation picks and roles only);
//   - fresh CONFIRMATION 3 × 128 = 384 (labels ('confirm', rep, cutoff); qualification only) for the confirmation picks,
//     pooled with duplicates dropped;
//   - the frozen stresses and the optional-rule toggles (report) for the confirmation picks;
//   - half (0.5) and wide (1.5) radius families (128 each; report) only where a stage asks for them (C24 diagnostics).
//
// Gates (all must hold): Q1 centre net > 0; Q2 centre maximum minute DD ≤ $35,000; Q3 confirmation p90 DD ≤ $35,000;
// Q4 confirmation p10 net > 0; Q5 at 10 bps per side: centre net > 0 and centre DD ≤ $35,000. A member that was not a
// confirmation pick is "not confirmed" (never qualified). No activity floor, annual-profit floor, concentration cap,
// breach-rate veto or equal-profit rule.
import type { EvalOptions, Rec } from '../vg-d1-growth-joint/evaluate.ts';
import { type Tail, tailOf } from '../vg-d1-growth-diagnostic/risk.ts';
import { economics, r2 } from './context.ts';
import { type Nb, bookOf, nbStats, plausible, profitOrder } from './fitness.ts';
import type { Lab } from './lab.ts';
import {
  type GConfig,
  type Row,
  activeInputs,
  build,
  classOf,
  coarseClassOf,
  entryOf,
  gId,
  rowsOf,
  toggles
} from './space.ts';

export type MemberKind = 'independent' | 'transfer' | 'reference';

export interface Member {
  label: string; // e.g. C24/XLK#1 profit
  sym: string;
  kind: MemberKind;
  lane: string;
  origin: string;
  pick: string;
  g: GConfig | null;
}

export interface Evidence {
  label: string;
  sym: string;
  kind: MemberKind;
  lane: string;
  origin: string;
  pick: string;
  id: string;
  g: GConfig | null;
  entry: string;
  class: string;
  stratum: string;
  activeInputs: number;
  centre: Rec;
  select: Nb;
  selectTail: Tail | null;
  confirmed: boolean;
  confirm: Nb;
  confirmTail: Tail | null;
  confirmReps: Nb[];
  confirmDraws: { drawn: number; unique: number };
  small: Nb | null;
  smallTail: Tail | null;
  wide: Nb | null;
  wideTail: Tail | null;
  stress: Record<string, Rec>;
  toggles: Record<string, Rec>;
  gates: Record<'Q1' | 'Q2' | 'Q3' | 'Q4' | 'Q5', boolean>;
  qualified: boolean;
  failed: string[];
  severity: Record<string, number>;
}

export interface Fidelity {
  select: number;
  confirmReps: number;
  confirm: number;
  radius: number; // small / wide
}

export const fidelities: Record<'study' | 'pilot', Fidelity> = {
  study: { select: 128, confirmReps: 3, confirm: 128, radius: 128 },
  pilot: { select: 16, confirmReps: 3, confirm: 8, radius: 8 }
};

// The frozen stresses (standard §5.1). Growth books with the initial stop or retention keep stop-level fills under the
// next-open stress (Priority 3's engine; recorded).
export const stresses: Record<string, EvalOptions['friction']> = {
  'cost 10 bps': { costBps: 10 },
  'cost 20 bps': { costBps: 20 },
  'interest 14%': { rate: 0.14 },
  'stop slippage +25 bps': { stopSlippageBps: 25 },
  'next-open stops': { stopFill: 'next-open' }
};

export interface Ask {
  m: Member;
  confirm: boolean; // confirmation, stresses and toggles
  radius?: boolean; // small and wide families
}

export const qualifyMembers = async (
  lab: Lab,
  asks: readonly Ask[],
  cutoff: string,
  fid: Fidelity
): Promise<Evidence[]> => {
  type Plan = {
    a: Ask;
    b: ReturnType<typeof build>;
    fams: Record<string, Row[]>;
    singles: Record<string, { quad: ReturnType<typeof build>['quad']; options: EvalOptions }>;
  };
  const plans: Plan[] = asks.map((a) => {
    const b = build(a.m.g);
    const fams: Plan['fams'] = {};
    const fam = (name: string, labels: (string | number)[], n: number, scale = 1) => ({ name, n, labels, scale });

    if (a.m.g) {
      fams.select = rowsOf(b, fam('select', ['select', cutoff], fid.select));
      if (a.confirm)
        for (let rep = 1; rep <= fid.confirmReps; rep++)
          fams[`confirm${rep}`] = rowsOf(b, fam('confirm', ['confirm', rep, cutoff], fid.confirm));
      if (a.radius) {
        fams.small = rowsOf(b, fam('small', ['small', cutoff], fid.radius, 0.5));
        fams.wide = rowsOf(b, fam('wide', ['wide', cutoff], fid.radius, 1.5));
      }
    }

    const singles: Plan['singles'] = { centre: { quad: b.quad, options: b.options } };

    if (a.m.g && a.confirm) {
      for (const [name, f] of Object.entries(stresses))
        singles[`stress:${name}`] = { quad: b.quad, options: { ...b.options, friction: { ...f } } };
      for (const [name, g] of Object.entries(toggles(a.m.g))) {
        const t = build(g);

        singles[`toggle:${name}`] = { quad: t.quad, options: t.options };
      }
    }

    return { a, b, fams, singles };
  });

  const items: { quad: ReturnType<typeof build>['quad']; options: EvalOptions }[] = [];

  for (const p of plans) {
    for (const s of Object.values(p.singles)) items.push(s);
    for (const f of Object.values(p.fams))
      for (const x of f) items.push({ quad: x.built.quad, options: x.built.options });
  }

  const recs = await lab.evalMany(items, 'qualify');
  let at = 0;
  const out: Evidence[] = [];

  for (const p of plans) {
    const singles: Record<string, Rec> = {};

    for (const k of Object.keys(p.singles)) singles[k] = recs[at++]!;

    const famRecs: Record<string, Rec[]> = {};

    for (const [k, f] of Object.entries(p.fams)) famRecs[k] = f.map(() => recs[at++]!);

    const centre = singles.centre!;
    const pooled = (keys: string[]) => {
      const seen = new Set<string>([p.b.id]);
      const rs: Rec[] = [];
      const clipped: number[] = [];
      let drawn = 0;

      for (const k of keys)
        p.fams[k]!.forEach((x, i) => {
          drawn++;
          if (seen.has(x.id)) return;
          seen.add(x.id);
          rs.push(famRecs[k]![i]!);
          clipped.push(x.clipped);
        });

      return {
        nb: nbStats(centre, rs, clipped),
        tail: rs.length
          ? tailOf(
              centre,
              rs.map((rec, i) => ({ rec, clipped: clipped[i]! }))
            )
          : null,
        drawn,
        unique: rs.length
      };
    };
    const has = (k: string) => k in p.fams;
    const empty = nbStats(centre, [], []);
    const select = has('select') ? pooled(['select']) : null;
    const confirmKeys = Object.keys(p.fams).filter((k) => k.startsWith('confirm'));
    const confirm = confirmKeys.length ? pooled(confirmKeys) : null;
    const small = has('small') ? pooled(['small']) : null;
    const wide = has('wide') ? pooled(['wide']) : null;
    const stress: Record<string, Rec> = {};
    const tg: Record<string, Rec> = {};

    for (const [k, r] of Object.entries(singles)) {
      if (k.startsWith('stress:')) stress[k.slice(7)] = r;
      if (k.startsWith('toggle:')) tg[k.slice(7)] = r;
    }

    const c = economics.ceiling;
    const confirmNb = confirm?.nb ?? empty;
    const s10 = stress['cost 10 bps'];
    const gates = {
      Q1: centre.net > 0,
      Q2: centre.dd <= c,
      Q3: confirm !== null && confirmNb.p90Dd <= c,
      Q4: confirm !== null && confirmNb.p10 > 0,
      Q5: s10 !== undefined && s10.net > 0 && s10.dd <= c
    };
    const failed = Object.entries(gates)
      .filter(([, v]) => !v)
      .map(([k]) => k);
    const severity: Record<string, number> = {};

    if (!gates.Q1) severity.Q1 = r2(-centre.net);
    if (!gates.Q2) severity.Q2 = r2(centre.dd - c);
    if (!gates.Q3 && confirm) severity.Q3 = r2(confirmNb.p90Dd - c);
    if (!gates.Q4 && confirm) severity.Q4 = r2(-confirmNb.p10);
    if (!gates.Q5 && s10) severity.Q5 = r2(Math.max(-s10.net, s10.dd - c));

    out.push({
      label: p.a.m.label,
      sym: p.a.m.sym,
      kind: p.a.m.kind,
      lane: p.a.m.lane,
      origin: p.a.m.origin,
      pick: p.a.m.pick,
      id: p.b.id,
      g: p.a.m.g,
      entry: p.a.m.g ? entryOf(p.a.m.g) : 'none',
      class: classOf(p.a.m.g),
      stratum: coarseClassOf(p.a.m.g),
      activeInputs: p.a.m.g ? activeInputs(p.a.m.g) : 0,
      centre,
      select: select?.nb ?? empty,
      selectTail: select?.tail ?? null,
      confirmed: confirm !== null,
      confirm: confirmNb,
      confirmTail: confirm?.tail ?? null,
      confirmReps: confirmKeys.map((k) => {
        const keep = p.fams[k]!.map((x, i) => ({ x, r: famRecs[k]![i]! })).filter((y) => !y.x.dup);

        return nbStats(
          centre,
          keep.map((y) => y.r),
          keep.map((y) => y.x.clipped)
        );
      }),
      confirmDraws: { drawn: confirm?.drawn ?? 0, unique: confirm?.unique ?? 0 },
      small: small?.nb ?? null,
      smallTail: small?.tail ?? null,
      wide: wide?.nb ?? null,
      wideTail: wide?.tail ?? null,
      stress,
      toggles: tg,
      gates,
      qualified: failed.length === 0,
      failed,
      severity
    });
  }

  return out;
};

// The confirmation picks of one ETF (or of one transfer set): ≤ `max` distinct members, in this order, among the
// "selection-passing" members (Q1, Q2, selection p90 DD ≤ $35,000 and selection p10 > 0): the highest centre net, the
// highest selection robust net, the highest selection robust ÷ selection p90 DD; when no member passes on the
// selection family, the plausible member with the highest centre net (one confirmation attempt). Ranking families
// only; the confirmation draws never enter this choice.
export const confirmationPicks = (ev: readonly Evidence[], max = 3): Evidence[] => {
  const c = economics.ceiling;
  const passing = ev.filter(
    (e) => e.g && e.centre.net > 0 && e.centre.dd <= c && e.select.p90Dd <= c && e.select.p10 > 0
  );
  const byLabel = (a: Evidence, b: Evidence) => (a.label < b.label ? -1 : a.label > b.label ? 1 : 0);
  const out: Evidence[] = [];
  const take = (e: Evidence | undefined) => {
    if (e && out.length < max && !out.includes(e)) out.push(e);
  };

  if (passing.length) {
    take([...passing].sort((a, b) => b.centre.net - a.centre.net || byLabel(a, b))[0]);
    take([...passing].sort((a, b) => b.select.robust - a.select.robust || byLabel(a, b))[0]);
    take(
      [...passing].sort(
        (a, b) =>
          b.select.robust / Math.max(1, b.select.p90Dd) - a.select.robust / Math.max(1, a.select.p90Dd) || byLabel(a, b)
      )[0]
    );
  } else
    take(ev.filter((e) => e.g && plausible(e.centre)).sort((a, b) => b.centre.net - a.centre.net || byLabel(a, b))[0]);

  return out;
};

// ----- ranking and roles (standard §2.3; ranked on the selection family) -----

export type RoleName = 'actual-profit' | 'robust-profit' | 'balanced' | 'lower-drawdown';
export const roleNames: RoleName[] = ['actual-profit', 'robust-profit', 'balanced', 'lower-drawdown'];

export interface Roles {
  set: string;
  members: number;
  qualified: number;
  ranked: { rank: number; label: string; sym: string; id: string; net: number; robust: number; p90: number }[];
  roles: Record<RoleName, string | null>;
  pareto: string[];
  reason: string;
}

// actual-profit = the highest centre net (ties: selection robust net, lower centre DD, label — Priority 3's
// profitOrder); robust-profit = the highest selection robust net; balanced = the highest selection robust ÷ selection
// p90 DD; lower-drawdown = the lowest selection p90 DD among those with selection robust ≥ 50% of the actual-profit
// holder's. The Pareto set: non-dominated on centre net ↑, centre DD ↓, selection p10 ↑, selection p90 DD ↓.
export const rolesOf = (set: string, ev: readonly Evidence[]): Roles => {
  const q = ev.filter((e) => e.qualified);
  const ranked = profitOrder(
    q.map((e) => ({ label: e.label, net: e.centre.net, robust: e.select.robust, dd: e.centre.dd, e }))
  );
  const byLabel = (a: Evidence, b: Evidence) => (a.label < b.label ? -1 : a.label > b.label ? 1 : 0);

  if (ranked.length === 0)
    return {
      set,
      members: ev.length,
      qualified: 0,
      ranked: [],
      roles: { 'actual-profit': null, 'robust-profit': null, balanced: null, 'lower-drawdown': null },
      pareto: [],
      reason: 'no qualified member'
    };

  const top = ranked[0]!.e;
  const robust = [...q].sort((a, b) => b.select.robust - a.select.robust || byLabel(a, b))[0]!;
  const balanced = [...q].sort(
    (a, b) =>
      b.select.robust / Math.max(1, b.select.p90Dd) - a.select.robust / Math.max(1, a.select.p90Dd) || byLabel(a, b)
  )[0]!;
  const lower =
    [...q]
      .filter((e) => e.select.robust >= 0.5 * top.select.robust)
      .sort((a, b) => a.select.p90Dd - b.select.p90Dd || byLabel(a, b))[0] ?? null;
  const dominated = (a: Evidence, b: Evidence) =>
    b.centre.net >= a.centre.net &&
    b.centre.dd <= a.centre.dd &&
    b.select.p10 >= a.select.p10 &&
    b.select.p90Dd <= a.select.p90Dd &&
    (b.centre.net > a.centre.net ||
      b.centre.dd < a.centre.dd ||
      b.select.p10 > a.select.p10 ||
      b.select.p90Dd < a.select.p90Dd);

  return {
    set,
    members: ev.length,
    qualified: q.length,
    ranked: ranked.map((x, i) => ({
      rank: i + 1,
      label: x.e.label,
      sym: x.e.sym,
      id: x.e.id,
      net: x.e.centre.net,
      robust: x.e.select.robust,
      p90: x.e.select.p90Dd
    })),
    roles: {
      'actual-profit': top.label,
      'robust-profit': robust.label,
      balanced: balanced.label,
      'lower-drawdown': lower?.label ?? null
    },
    pareto: q
      .filter((a) => !q.some((b) => b !== a && dominated(a, b)))
      .map((e) => e.label)
      .sort(),
    reason: `${q.length} qualified of ${ev.length}`
  };
};

// The compact record of a Rec kept in sealed evidence (the archive keeps the full one).
export const recSummary = (r: Rec) => ({
  net: r.net,
  realized: r.realized,
  unrealized: r.unrealized,
  dd: r.dd,
  ddPeakT: r.ddPeakT,
  ddTroughT: r.ddTroughT,
  ddRecoveryT: r.ddRecoveryT,
  ddDaily: r.ddDaily,
  lots: r.lots,
  wins: r.wins,
  losses: r.losses,
  partials: r.partials,
  worstLoss: r.worstLoss,
  largestWin: r.largestWin,
  interest: r.interest,
  costs: r.costs,
  sessionsHeld: r.sessionsHeld,
  years: r.years,
  periods: r.periods,
  topEpisode: r.topEpisode,
  topEpisodeShare: r.topEpisodeShare,
  episodes: r.episodes,
  signature: r.signature,
  sessions: r.sessions,
  book: bookOf(r),
  ...(r.error ? { error: r.error } : {})
});

export const compactEvidence = (e: Evidence) => ({
  ...e,
  centre: recSummary(e.centre),
  stress: Object.fromEntries(Object.entries(e.stress).map(([k, r]) => [k, recSummary(r)])),
  toggles: Object.fromEntries(Object.entries(e.toggles).map(([k, r]) => [k, recSummary(r)]))
});
export type CompactEvidence = ReturnType<typeof compactEvidence>;

export const summary = (
  e: Pick<
    Evidence,
    | 'label'
    | 'sym'
    | 'kind'
    | 'pick'
    | 'id'
    | 'entry'
    | 'class'
    | 'select'
    | 'confirm'
    | 'confirmTail'
    | 'confirmed'
    | 'qualified'
    | 'failed'
    | 'severity'
  > & {
    centre: {
      net: number;
      realized: number;
      unrealized: number;
      dd: number;
      lots: number;
      episodes: number;
      topEpisodeShare: number;
    };
  }
) => ({
  label: e.label,
  sym: e.sym,
  kind: e.kind,
  pick: e.pick,
  id: e.id,
  entry: e.entry,
  class: e.class,
  net: e.centre.net,
  realized: e.centre.realized,
  unrealized: e.centre.unrealized,
  dd: e.centre.dd,
  lots: e.centre.lots,
  episodes: e.centre.episodes,
  topEpisodeShare: e.centre.topEpisodeShare,
  selectRobust: e.select.robust,
  selectP10: e.select.p10,
  selectP90: e.select.p90Dd,
  confirmed: e.confirmed,
  confirmMedian: e.confirmed ? e.confirm.median : null,
  confirmP10: e.confirmed ? e.confirm.p10 : null,
  confirmRobust: e.confirmed ? e.confirm.robust : null,
  confirmP90Dd: e.confirmed ? e.confirm.p90Dd : null,
  breachShare: e.confirmed ? e.confirm.breachShare : null,
  meanExcess: e.confirmed ? e.confirm.meanExcess : null,
  worstDd: e.confirmed ? e.confirm.worstDd : null,
  p95Dd: e.confirmTail?.p95Dd ?? null,
  worst10MeanDd: e.confirmTail?.worst10Mean ?? null,
  qualified: e.qualified,
  failed: e.failed.join(','),
  severity: e.severity
});

export { gId };
