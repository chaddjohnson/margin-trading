// Qualification, roles and the descriptive comparison with Appendix A (PROTOCOL.md §8, §9), identical at every cutoff,
// on the cutoff's training door only.
//
// Evidence per member (every family has common random numbers across every member of the cutoff — the matched
// instrument):
//   - the centre;
//   - SELECTION 2 × 128 (labels ('select', rep, cutoff); ranking and roles only) and fresh CONFIRMATION 3 × 128 = 384
//     (labels ('confirm', rep, cutoff); qualification only), pooled with duplicates dropped;
//   - half (0.5) and wide (1.5) radius families (128 each; report);
//   - the frozen stresses and the optional-rule toggles (report);
//   - at C24, Priority 5A's standalone family-level instrument (its own namespace; report-only matched comparison with
//     5A's published standalone figures of Appendix A, VGT #4 and 08500a60).
//
// Gates (all must hold): Q1 centre net > 0; Q2 centre maximum minute DD ≤ $35,000; Q3 confirmation p90 DD ≤ $35,000;
// Q4 confirmation p10 net > 0; Q5 at 10 bps per side: centre net > 0 and centre DD ≤ $35,000. No activity floor,
// annual-profit floor, concentration cap, breach-rate veto or equal-profit rule.
import type { EvalOptions, Rec } from '../vg-d1-growth-joint/evaluate.ts';
import { type Tail, tailOf } from '../vg-d1-growth-diagnostic/risk.ts';
import { growthDraws } from '../vg-growth-funding-lifecycle/instruments.ts';
import { economics, r2 } from './context.ts';
import { type Nb, nbStats, profitOrder } from './fitness.ts';
import type { Lab } from './lab.ts';
import {
  type GConfig,
  type Quad,
  type Row,
  activeInputs,
  buildS,
  classOf,
  coarseClassOf,
  entryOf,
  gId,
  gdxToggles,
  rowsOf
} from './space.ts';

export type MemberKind = 'independent' | 'informed' | 'control' | 'reference';

export interface Member {
  label: string;
  kind: MemberKind;
  lane: string;
  origin: string; // screen | island | refine | filler | seed | design | control | reference
  gdx: GConfig | null;
  selectable: boolean;
  control?: string;
}

export interface Evidence {
  label: string;
  kind: MemberKind;
  lane: string;
  origin: string;
  control: string | null;
  selectable: boolean;
  id: string;
  p3Id: string;
  gdxId: string | null;
  gdx: GConfig | null;
  quad: Quad;
  enabled: string[];
  entry: string;
  class: string;
  stratum: string;
  activeInputs: number;
  centre: Rec;
  select: Nb;
  confirm: Nb;
  confirmTail: Tail | null;
  confirmReps: Nb[];
  confirmDraws: { drawn: number; unique: number };
  small: Nb;
  smallTail: Tail | null;
  wide: Nb;
  wideTail: Tail | null;
  p5a: { confirm: Nb; tail: Tail | null; small: Nb; wide: Nb; drawn: number; unique: number } | null;
  stress: Record<string, Rec>;
  toggles: Record<string, Rec>;
  gates: Record<'Q1' | 'Q2' | 'Q3' | 'Q4' | 'Q5', boolean>;
  qualified: boolean;
  failed: string[];
  severity: Record<string, number>;
}

export const fidelity = { selectReps: 2, confirmReps: 3, n: 128 };

// The frozen stresses (standard §5.1). Growth books with the initial stop or retention keep stop-level fills under the
// next-open stress (Priority 3's engine; recorded).
export const stresses: Record<string, EvalOptions['friction']> = {
  'cost 10 bps': { costBps: 10 },
  'cost 20 bps': { costBps: 20 },
  'interest 14%': { rate: 0.14 },
  'stop slippage +25 bps': { stopSlippageBps: 25 },
  'next-open stops': { stopFill: 'next-open' }
};

const famOf = (name: string, labels: (string | number)[], scale = 1, n = fidelity.n) => ({
  name,
  n,
  labels,
  scope: 'joint' as const,
  scale
});

const builtOf = (m: Member) => buildS(m.gdx);
export const memberId = (m: Member) => builtOf(m).id;

export const qualifyMembers = async (
  lab: Lab,
  members: readonly Member[],
  cutoff: string,
  withP5a: boolean
): Promise<Evidence[]> => {
  type Plan = {
    m: Member;
    b: ReturnType<typeof buildS>;
    fams: Record<string, Row[]>;
    singles: Record<string, { quad: Quad; options: EvalOptions }>;
  };
  const plans: Plan[] = members.map((m) => {
    const b = builtOf(m);
    const fams: Plan['fams'] = {};

    if (m.gdx) {
      for (let rep = 1; rep <= fidelity.selectReps; rep++)
        fams[`select${rep}`] = rowsOf(b, famOf('select', ['select', rep, cutoff]));
      for (let rep = 1; rep <= fidelity.confirmReps; rep++)
        fams[`confirm${rep}`] = rowsOf(b, famOf('confirm', ['confirm', rep, cutoff]));
      fams.small = rowsOf(b, famOf('small', ['small', cutoff], 0.5));
      fams.wide = rowsOf(b, famOf('wide', ['wide', cutoff], 1.5));

      if (withP5a)
        for (const family of ['confirm', 'small', 'wide'] as const) {
          const seen = new Set<string>();

          fams[`p5a:${family}`] = growthDraws(m.gdx, family).map((d, row) => {
            const x = buildS(d.config);
            const dup = seen.has(x.id) || x.id === b.id;

            seen.add(x.id);
            return { row, quad: x.quad, options: x.options, id: x.id, clipped: d.clipped, dup };
          });
        }
    }

    const singles: Plan['singles'] = { centre: { quad: b.quad, options: b.options } };

    if (m.gdx) {
      for (const [name, f] of Object.entries(stresses))
        singles[`stress:${name}`] = { quad: b.quad, options: { ...b.options, friction: { ...f } } };
      for (const [name, g] of Object.entries(gdxToggles(m.gdx))) {
        const t = buildS(g);

        singles[`toggle:${name}`] = { quad: t.quad, options: t.options };
      }
    }

    return { m, b, fams, singles };
  });

  const items: { quad: Quad; options: EvalOptions }[] = [];

  for (const p of plans) {
    for (const s of Object.values(p.singles)) items.push(s);
    for (const f of Object.values(p.fams)) for (const x of f) items.push({ quad: x.quad, options: x.options });
  }

  lab.stage = `qualify ${cutoff}: ${members.length} members, ${items.length} evaluations requested`;

  const recs = await lab.evalMany(items, 'qualify');
  let at = 0;
  const out: Evidence[] = [];
  const empty = (centre: Rec) => nbStats(centre, [], []);

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
    const select = has('select1') ? pooled(['select1', 'select2']) : null;
    const confirm = has('confirm1') ? pooled(['confirm1', 'confirm2', 'confirm3']) : null;
    const small = has('small') ? pooled(['small']) : null;
    const wide = has('wide') ? pooled(['wide']) : null;
    const p5aC = has('p5a:confirm') ? pooled(['p5a:confirm']) : null;
    const p5aS = has('p5a:small') ? pooled(['p5a:small']) : null;
    const p5aW = has('p5a:wide') ? pooled(['p5a:wide']) : null;
    const stress: Record<string, Rec> = {};
    const toggles: Record<string, Rec> = {};

    for (const [k, r] of Object.entries(singles)) {
      if (k.startsWith('stress:')) stress[k.slice(7)] = r;
      if (k.startsWith('toggle:')) toggles[k.slice(7)] = r;
    }

    const c = economics.ceiling;
    const confirmNb = confirm?.nb ?? empty(centre);
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
      label: p.m.label,
      kind: p.m.kind,
      lane: p.m.lane,
      origin: p.m.origin,
      control: p.m.control ?? null,
      selectable: p.m.selectable,
      id: p.b.id,
      p3Id: centre.id,
      gdxId: p.m.gdx ? gId(p.m.gdx) : null,
      gdx: p.m.gdx,
      quad: p.b.quad,
      enabled: p.b.enabled,
      entry: p.m.gdx ? entryOf(p.m.gdx) : 'none',
      class: classOf(p.m.gdx),
      stratum: coarseClassOf(p.m.gdx),
      activeInputs: activeInputs(p.b, 'joint'),
      centre,
      select: select?.nb ?? empty(centre),
      confirm: confirmNb,
      confirmTail: confirm?.tail ?? null,
      confirmReps: confirm
        ? ['confirm1', 'confirm2', 'confirm3'].map((k) => {
            const keep = p.fams[k]!.map((x, i) => ({ x, r: famRecs[k]![i]! })).filter((y) => !y.x.dup);

            return nbStats(
              centre,
              keep.map((y) => y.r),
              keep.map((y) => y.x.clipped)
            );
          })
        : [],
      confirmDraws: { drawn: confirm?.drawn ?? 0, unique: confirm?.unique ?? 0 },
      small: small?.nb ?? empty(centre),
      smallTail: small?.tail ?? null,
      wide: wide?.nb ?? empty(centre),
      wideTail: wide?.tail ?? null,
      p5a: p5aC
        ? {
            confirm: p5aC.nb,
            tail: p5aC.tail,
            small: p5aS!.nb,
            wide: p5aW!.nb,
            drawn: p5aC.drawn,
            unique: p5aC.unique
          }
        : null,
      stress,
      toggles,
      gates,
      qualified: failed.length === 0,
      failed,
      severity
    });
  }

  return out;
};

// ----- ranking and roles (standard §2.3; ranked on the selection families) -----

export type RoleName = 'actual-profit' | 'robust-profit' | 'balanced' | 'lower-drawdown';
export const roleNames: RoleName[] = ['actual-profit', 'robust-profit', 'balanced', 'lower-drawdown'];

export interface Roles {
  set: string;
  members: number;
  qualified: number;
  ranked: { rank: number; label: string; id: string; net: number; robust: number; p90: number }[];
  roles: Record<RoleName, string | null>;
  pareto: string[];
  reason: string;
}

// actual-profit = the highest centre net (ties: selection robust net, lower centre DD, label — Priority 3's
// profitOrder); robust-profit = the highest selection robust net; balanced = the highest selection robust ÷ selection p90
// DD; lower-drawdown = the lowest selection p90 DD among those with selection robust ≥ 50% of the actual-profit holder's.
// The Pareto set: non-dominated on centre net ↑, centre DD ↓, selection p10 ↑, selection p90 DD ↓.
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
      reason: 'no qualified member: no primary (no supported standalone candidate in this set)'
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

// ----- the descriptive comparison with a reference member (Appendix A; development; fresh confirmation) -----

export interface Labels {
  label: string;
  versus: string;
  dNet: number;
  dDd: number;
  dMedian: number;
  dP10: number;
  dP90Dd: number;
  dRobustConfirm: number;
  dominates: boolean; // ≥ centre net and confirmation p10, ≤ centre DD and confirmation p90 DD, one strict
  dominatedBy: boolean;
  higherProfitTradeOff: boolean; // centre net > the reference's without dominating it
  strongerLocalStability: boolean; // confirmation p10 > and confirmation p90 DD < the reference's
  p90WithinFiniteDrawUncertainty: boolean | null; // report-only: the two p90 order-statistic 95% intervals overlap
}

const dom = (a: Evidence, b: Evidence) =>
  a.centre.net >= b.centre.net &&
  a.centre.dd <= b.centre.dd &&
  a.confirm.p10 >= b.confirm.p10 &&
  a.confirm.p90Dd <= b.confirm.p90Dd &&
  (a.centre.net > b.centre.net ||
    a.centre.dd < b.centre.dd ||
    a.confirm.p10 > b.confirm.p10 ||
    a.confirm.p90Dd < b.confirm.p90Dd);

export const labelsOf = (e: Evidence, ref: Evidence): Labels => {
  const ai = e.confirmTail?.p90Interval;
  const bi = ref.confirmTail?.p90Interval;

  return {
    label: e.label,
    versus: ref.label,
    dNet: r2(e.centre.net - ref.centre.net),
    dDd: r2(e.centre.dd - ref.centre.dd),
    dMedian: r2(e.confirm.median - ref.confirm.median),
    dP10: r2(e.confirm.p10 - ref.confirm.p10),
    dP90Dd: r2(e.confirm.p90Dd - ref.confirm.p90Dd),
    dRobustConfirm: r2(e.confirm.robust - ref.confirm.robust),
    dominates: dom(e, ref),
    dominatedBy: dom(ref, e),
    higherProfitTradeOff: e.centre.net > ref.centre.net && !dom(e, ref),
    strongerLocalStability: e.confirm.p10 > ref.confirm.p10 && e.confirm.p90Dd < ref.confirm.p90Dd,
    p90WithinFiniteDrawUncertainty: ai && bi ? ai[0]! <= bi[1]! && bi[0]! <= ai[1]! : null
  };
};

export const summary = (e: Evidence) => ({
  label: e.label,
  kind: e.kind,
  lane: e.lane,
  origin: e.origin,
  control: e.control,
  id: e.id,
  gdxId: e.gdxId,
  entry: e.entry,
  class: e.class,
  net: e.centre.net,
  realized: e.centre.realized,
  unrealized: e.centre.unrealized,
  dd: e.centre.dd,
  lots: e.centre.lots,
  wins: e.centre.books['G:GDX'].wins,
  losses: e.centre.books['G:GDX'].losses,
  selectRobust: e.select.robust,
  selectP10: e.select.p10,
  selectP90: e.select.p90Dd,
  confirmMedian: e.confirm.median,
  confirmP10: e.confirm.p10,
  confirmRobust: e.confirm.robust,
  confirmP90Dd: e.confirm.p90Dd,
  breachShare: e.confirm.breachShare,
  meanExcess: e.confirm.meanExcess,
  worstDd: e.confirm.worstDd,
  p95Dd: e.confirmTail?.p95Dd ?? null,
  worst10MeanDd: e.confirmTail?.worst10Mean ?? null,
  qualified: e.qualified,
  failed: e.failed.join(','),
  severity: e.severity
});
