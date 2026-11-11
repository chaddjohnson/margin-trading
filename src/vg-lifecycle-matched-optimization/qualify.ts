// Qualification, ranking and roles (PROTOCOL.md §9), identical in every arm and at every cutoff, on the cutoff's
// training door only. Every member carries its lifecycle: its evidence is computed under that lifecycle only.
//
// Evidence per member: the centre; SELECTION 2 × 128 (ranking only); fresh CONFIRMATION 3 × 128 = 384 (labels
// ('confirm', rep, cutoff) in this study's namespace — never used for ranking; qualification only); the frozen
// stresses (Q5 and report-only); the causal removal reruns (report-only). The neighbour draws are identical across the
// lifecycles (matching per-gene perturbations). The half-radius / 1.5× families, the family scopes and the categorical
// toggles are report-only evidence of the export set (crosstest.ts), not of every member.
//
// Gates (all must hold): Q1 centre net > 0; Q2 centre DD ≤ $35,000; Q3 fresh confirmation p90 DD ≤ $35,000 (the
// interpolated 0.9 quantile — never a breach count); Q4 fresh confirmation p10 net > 0; Q5 at 10 bps per side: centre
// net > 0 and DD ≤ $35,000; Q6 both families (D1 and Growth) receive capital at the centre.
import { type BookId, bookIds, familyOf, symbolOf } from '../vg-d1-growth-joint/books.ts';
import type { EvalOptions, Rec } from '../vg-d1-growth-joint/evaluate.ts';
import { type Tail, tailOf } from '../vg-d1-growth-diagnostic/risk.ts';
import { type Mode, economics, r2, symbols } from './context.ts';
import {
  type Cfg,
  type Inc,
  type Scope,
  activeInputs,
  canonicalOf,
  cellName,
  cellOf,
  cfgId,
  classOf,
  entryPatternOf,
  growthOn,
  neighbourhood,
  optionsOf,
  quadId,
  structureOf
} from './config.ts';
import { type Nb, bothGrowthFunded, nbStats, profitOrder } from './fitness.ts';
import type { Lab } from './lab.ts';

export type MemberKind = 'indep' | 'informed' | 'control' | 'mechanism' | 'd1-only';

export interface Member {
  label: string; // e.g. C24/L1/indep/R2/B#1 profit
  lane: string;
  kind: MemberKind;
  mode: Mode;
  replicate: number | null; // the search seed of a searched member
  cfg: Cfg;
  options?: EvalOptions; // historical members keep their own stored order / options
  selectable: boolean; // a member of the final selectable set (C24)
  control?: string; // the control key (C4, E, …)
}

export interface Evidence {
  label: string;
  lane: string;
  kind: MemberKind;
  mode: Mode;
  replicate: number | null;
  entries: string;
  control: string | null;
  selectable: boolean;
  id: string; // cfgId
  p3Id: string; // Priority 3's quadId of the canonical quad
  inc: Inc;
  cfg: Cfg;
  enabled: BookId[];
  cell: string;
  class: ReturnType<typeof classOf>;
  activeInputs: Record<string, number>;
  centre: Rec;
  select: Nb;
  confirm: Nb;
  confirmTail: Tail;
  confirmReps: Nb[];
  confirmDraws: { drawn: number; unique: number };
  selectDraws: { drawn: number; unique: number };
  stress: Record<string, Rec>;
  removal: Record<string, Rec>;
  gates: Record<'Q1' | 'Q2' | 'Q3' | 'Q4' | 'Q5' | 'Q6', boolean>;
  qualified: boolean;
  failed: string[];
  severity: Record<string, number>; // how far each failed gate missed (near-miss table)
  participation: Record<BookId, 'disabled' | 'unfunded' | 'token' | 'funded'>;
  familyParticipation: 'mixed' | 'token' | 'single-family';
  bothGrowthFunded: boolean;
}

export const fidelity = { selectReps: 2, confirmReps: 3, n: 128 };

// The frozen stresses (standard §5.1). Growth books with the initial stop or retention keep stop-level fills under
// the next-open stress (Priority 3's engine; recorded).
export const stresses: Record<string, EvalOptions['friction']> = {
  'cost 10 bps': { costBps: 10 },
  'cost 20 bps': { costBps: 20 },
  'interest 14%': { rate: 0.14 },
  'stop slippage +25 bps': { stopSlippageBps: 25 },
  'next-open stops': { stopFill: 'next-open' }
};

export const enabledOf = (o: EvalOptions): BookId[] => bookIds.filter((b) => o.enabled?.[b] !== false);

// The categorical alternatives (report-only): the other same-instant order, and every enabled optional Growth rule of
// each enabled Growth book switched OFF.
export const togglesOf = (c: Cfg): Record<string, { quad: Cfg['quad']; options: EvalOptions }> => {
  const out: Record<string, { quad: Cfg['quad']; options: EvalOptions }> = {};
  const o = optionsOf(c);
  const add = (name: string, inc: Inc, q: Cfg['quad'], first?: 'G') => {
    try {
      const n = canonicalOf(inc, q);
      const quad = first ? { ...n.quad, first } : n.quad;

      if (quadId(quad) !== quadId(c.quad)) out[name] = { quad, options: o };
    } catch {
      // not a valid alternative
    }
  };

  add('Growth first at a same-instant tie', c.inc, c.quad, 'G');
  for (const s of symbols) {
    if (!growthOn(c.inc, s)) continue;

    const st = structureOf(c.quad.g[s]);
    const set = (k: string) => ({ ...c.quad, g: { ...c.quad.g, [s]: { ...c.quad.g[s], [k]: false } } });

    if (st.retain === 'on') add(`G·${s} retention OFF`, c.inc, set('retentionEnabled'));
    if (st.gate === 'on') add(`G·${s} recovery gate OFF`, c.inc, set('drawdownRecoveryGateEnabled'));
    if (st.trend !== 'off') add(`G·${s} trend filter OFF`, c.inc, set('trendFilterEnabled'));
    if (st.elig !== 'off') add(`G·${s} eligibility OFF`, c.inc, set('eligibilityEnabled'));
    if (st.istop === 'on') add(`G·${s} initial stop OFF`, c.inc, set('initialStopEnabled'));
    if (st.cont !== 'off') add(`G·${s} continuation OFF`, c.inc, set('continuationEnabled'));
    if (st.exits === 'hold_on_buffer_on') add(`G·${s} loss buffer OFF`, c.inc, set('intradayLossBufferEnabled'));
  }

  return out;
};

// The causal removal reruns: each family, each symbol and each enabled component disabled.
export const removalsOf = (enabled: readonly BookId[]): Record<string, BookId[]> => {
  const out: Record<string, BookId[]> = {};
  const add = (name: string, drop: BookId[]) => {
    const d = drop.filter((b) => enabled.includes(b));

    if (d.length && d.length < enabled.length && !Object.values(out).some((x) => x.join() === d.join())) out[name] = d;
  };

  add(
    'without D1',
    bookIds.filter((b) => familyOf(b) === 'D1')
  );
  add(
    'without Growth',
    bookIds.filter((b) => familyOf(b) === 'G')
  );
  for (const s of symbols)
    add(
      `without ${s}`,
      bookIds.filter((b) => symbolOf(b) === s)
    );
  for (const b of bookIds) add(`without ${b}`, [b]);

  return out;
};

const tokenShare = 0.05; // token participation: below 5% of the pool's funded principal-days (standard §0.3)

export const participationOf = (r: Rec, enabled: readonly BookId[]) => {
  const total = bookIds.reduce((a, b) => a + r.books[b].principalDays, 0);
  const per = Object.fromEntries(
    bookIds.map((b) => [
      b,
      !enabled.includes(b)
        ? 'disabled'
        : r.books[b].lots === 0
          ? 'unfunded'
          : total > 0 && r.books[b].principalDays / total < tokenShare
            ? 'token'
            : 'funded'
    ])
  ) as Evidence['participation'];
  const ftotal = r.fam.D1.principalDays + r.fam.G.principalDays;
  const fam: Evidence['familyParticipation'] = !(r.fam.D1.lots > 0 && r.fam.G.lots > 0)
    ? 'single-family'
    : ftotal > 0 && Math.min(r.fam.D1.principalDays, r.fam.G.principalDays) / ftotal < tokenShare
      ? 'token'
      : 'mixed';

  return { per, fam };
};

export const scopesOf = (_c: Cfg): Scope[] => ['d1', 'g'];

export const famOf = (name: string, labels: (string | number)[], scope: Scope, scale = 1, n = fidelity.n) => ({
  name,
  n,
  labels,
  scope,
  scale
});

// The neighbour draws of a member's family (identical for every lifecycle: the labels never contain it).
export const drawsOf = (cfg: Cfg, o: EvalOptions, f: ReturnType<typeof famOf>) =>
  neighbourhood(cfg, f).map((p) => ({ quad: p.cfg.quad, options: o, clipped: p.clipped, id: p.id }));

// A pooled, de-duplicated family (reps pooled; a configuration drawn twice counts once) → statistics and tail.
export const pooledStats = (centre: Rec, fams: { draws: { id: string; clipped: number }[]; recs: Rec[] }[]) => {
  const seen = new Set<string>();
  const rs: Rec[] = [];
  const clipped: number[] = [];
  let drawn = 0;

  for (const f of fams)
    f.draws.forEach((x, i) => {
      drawn++;
      if (seen.has(x.id)) return;
      seen.add(x.id);
      rs.push(f.recs[i]!);
      clipped.push(x.clipped);
    });

  return {
    nb: nbStats(centre, rs, clipped),
    tail: tailOf(
      centre,
      rs.map((rec, i) => ({ rec, clipped: clipped[i]! }))
    ),
    drawn,
    unique: rs.length,
    recs: rs
  };
};

export const qualifyMembers = async (lab: Lab, members: readonly Member[], cutoff: string): Promise<Evidence[]> => {
  type Draw = { quad: Cfg['quad']; options: EvalOptions; clipped: number; id: string };
  type Plan = {
    m: Member;
    o: EvalOptions;
    fams: Record<string, Draw[]>;
    singles: Record<string, { quad: Cfg['quad']; options: EvalOptions }>;
  };

  const plans: Plan[] = members.map((m) => {
    const o = m.options ?? optionsOf(m.cfg);
    const fams: Plan['fams'] = {};
    const scope: Scope = m.kind === 'd1-only' ? 'd1' : 'joint'; // D: its D1 books only (no Growth book is enabled)

    for (let rep = 1; rep <= fidelity.selectReps; rep++)
      fams[`select${rep}`] = drawsOf(m.cfg, o, famOf('select', ['select', rep, cutoff], scope));
    for (let rep = 1; rep <= fidelity.confirmReps; rep++)
      fams[`confirm${rep}`] = drawsOf(m.cfg, o, famOf('confirm', ['confirm', rep, cutoff], scope));

    const en = enabledOf(o);
    const singles: Plan['singles'] = { centre: { quad: m.cfg.quad, options: o } };

    for (const [name, f] of Object.entries(stresses))
      singles[`stress:${name}`] = { quad: m.cfg.quad, options: { ...o, friction: { ...(o.friction ?? {}), ...f } } };
    for (const [name, drop] of Object.entries(removalsOf(en)))
      singles[`removal:${name}`] = {
        quad: m.cfg.quad,
        options: { ...o, enabled: { ...(o.enabled ?? {}), ...Object.fromEntries(drop.map((b) => [b, false])) } }
      };

    return { m, o, fams, singles };
  });
  const items: { quad: Cfg['quad']; options: EvalOptions; mode: Mode }[] = [];

  for (const p of plans) {
    for (const x of Object.values(p.singles)) items.push({ ...x, mode: p.m.mode });
    for (const f of Object.values(p.fams)) for (const x of f) items.push({ quad: x.quad, options: x.options, mode: p.m.mode });
  }

  lab.stage = `qualify ${cutoff}: ${members.length} members, ${items.length} evaluations`;

  const recs = await lab.evalMany(items, 'qualify');
  let at = 0;
  const out: Evidence[] = [];

  for (const p of plans) {
    const singles: Record<string, Rec> = {};

    for (const k of Object.keys(p.singles)) singles[k] = recs[at++]!;

    const famRecs: Record<string, Rec[]> = {};

    for (const [k, f] of Object.entries(p.fams)) famRecs[k] = f.map(() => recs[at++]!);

    const centre = singles.centre!;
    const pooled = (prefix: string) =>
      pooledStats(
        centre,
        Object.keys(p.fams)
          .filter((k) => k.startsWith(prefix))
          .map((k) => ({ draws: p.fams[k]!, recs: famRecs[k]! }))
      );
    const one = (k: string) => nbStats(centre, famRecs[k]!, p.fams[k]!.map((x) => x.clipped));
    const select = pooled('select');
    const confirm = pooled('confirm');
    const stress: Record<string, Rec> = {};
    const removal: Record<string, Rec> = {};

    for (const [k, r] of Object.entries(singles)) {
      if (k.startsWith('stress:')) stress[k.slice(7)] = r;
      if (k.startsWith('removal:')) removal[k.slice(8)] = r;
    }

    const c = economics.ceiling;
    const s10 = stress['cost 10 bps']!;
    const gates = {
      Q1: centre.net > 0,
      Q2: centre.dd <= c,
      Q3: confirm.nb.p90Dd <= c,
      Q4: confirm.nb.p10 > 0,
      Q5: s10.net > 0 && s10.dd <= c,
      Q6: centre.fam.D1.lots > 0 && centre.fam.G.lots > 0
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

    const en = enabledOf(p.o);
    const part = participationOf(centre, en);

    out.push({
      label: p.m.label,
      lane: p.m.lane,
      kind: p.m.kind,
      mode: p.m.mode,
      replicate: p.m.replicate,
      entries: entryPatternOf(p.m.cfg),
      control: p.m.control ?? null,
      selectable: p.m.selectable,
      id: cfgId(p.m.cfg),
      p3Id: quadId(p.m.cfg.quad),
      inc: p.m.cfg.inc,
      cfg: p.m.cfg,
      enabled: en,
      cell: cellName(cellOf(p.m.cfg)),
      class: classOf(p.m.cfg),
      activeInputs: Object.fromEntries((['joint', ...scopesOf(p.m.cfg)] as Scope[]).map((sc) => [sc, activeInputs(p.m.cfg, sc)])),
      centre,
      select: select.nb,
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
      participation: part.per,
      familyParticipation: part.fam,
      bothGrowthFunded: bothGrowthFunded(centre)
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
  ranked: { rank: number; label: string; id: string; inc: Inc; net: number; robust: number; p90: number }[];
  roles: Record<RoleName, string | null>;
  pareto: string[];
  reason: string;
}

export const rolesOf = (set: string, ev: readonly Evidence[]): Roles => {
  const q = ev.filter((e) => e.qualified);
  const ranked = profitOrder(q.map((e) => ({ label: e.label, net: e.centre.net, robust: e.select.robust, dd: e.centre.dd, e })));
  const byLabel = (a: Evidence, b: Evidence) => (a.label < b.label ? -1 : a.label > b.label ? 1 : 0);

  if (ranked.length === 0)
    return {
      set,
      members: ev.length,
      qualified: 0,
      ranked: [],
      roles: { 'actual-profit': null, 'robust-profit': null, balanced: null, 'lower-drawdown': null },
      pareto: [],
      reason: 'no qualified member: no primary (the frozen fallback: "no qualified combined result")'
    };

  const top = ranked[0]!.e;
  const robust = [...q].sort((a, b) => b.select.robust - a.select.robust || byLabel(a, b))[0]!;
  const balanced = [...q].sort(
    (a, b) => b.select.robust / Math.max(1, b.select.p90Dd) - a.select.robust / Math.max(1, a.select.p90Dd) || byLabel(a, b)
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
    (b.centre.net > a.centre.net || b.centre.dd < a.centre.dd || b.select.p10 > a.select.p10 || b.select.p90Dd < a.select.p90Dd);

  return {
    set,
    members: ev.length,
    qualified: q.length,
    ranked: ranked.map((x, i) => ({
      rank: i + 1,
      label: x.e.label,
      id: x.e.id,
      inc: x.e.inc,
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

// ----- the C4 comparison labels (PROTOCOL.md §9.4; development, the fresh confirmation family) -----

export interface C4Labels {
  label: string;
  dNet: number;
  dDd: number;
  dMedian: number;
  dP10: number;
  dP90Dd: number;
  dSelectRobust: number;
  dCost10: number;
  dCost20: number;
  dominates: boolean; // ≥ on centre net and confirmation p10, ≤ on centre DD and confirmation p90 DD, one strict
  higherProfitTradeOff: boolean; // centre net > C4's without dominating
  strongerLocalStability: boolean; // confirmation p10 > C4's and confirmation p90 DD < C4's
}

export const labelsVs = (e: Evidence, c4: Evidence): C4Labels => {
  const ge = (a: number, b: number) => a >= b;
  const dominates =
    ge(e.centre.net, c4.centre.net) &&
    e.centre.dd <= c4.centre.dd &&
    ge(e.confirm.p10, c4.confirm.p10) &&
    e.confirm.p90Dd <= c4.confirm.p90Dd &&
    (e.centre.net > c4.centre.net ||
      e.centre.dd < c4.centre.dd ||
      e.confirm.p10 > c4.confirm.p10 ||
      e.confirm.p90Dd < c4.confirm.p90Dd);

  return {
    label: e.label,
    dNet: r2(e.centre.net - c4.centre.net),
    dDd: r2(e.centre.dd - c4.centre.dd),
    dMedian: r2(e.confirm.median - c4.confirm.median),
    dP10: r2(e.confirm.p10 - c4.confirm.p10),
    dP90Dd: r2(e.confirm.p90Dd - c4.confirm.p90Dd),
    dSelectRobust: r2(e.select.robust - c4.select.robust),
    dCost10: r2(e.stress['cost 10 bps']!.net - c4.stress['cost 10 bps']!.net),
    dCost20: r2(e.stress['cost 20 bps']!.net - c4.stress['cost 20 bps']!.net),
    dominates,
    higherProfitTradeOff: e.centre.net > c4.centre.net && !dominates,
    strongerLocalStability: e.confirm.p10 > c4.confirm.p10 && e.confirm.p90Dd < c4.confirm.p90Dd
  };
};

export const summary = (e: Evidence) => ({
  label: e.label,
  kind: e.kind,
  mode: e.mode,
  replicate: e.replicate,
  entries: e.entries,
  control: e.control,
  id: e.id,
  inc: e.inc,
  cell: e.cell,
  net: e.centre.net,
  dd: e.centre.dd,
  lots: e.centre.lots,
  selectRobust: e.select.robust,
  selectP10: e.select.p10,
  selectP90: e.select.p90Dd,
  confirmMedian: e.confirm.median,
  confirmP10: e.confirm.p10,
  confirmP90Dd: e.confirm.p90Dd,
  breachShare: e.confirm.breachShare,
  meanExcess: e.confirm.meanExcess,
  worstDd: e.confirm.worstDd,
  qualified: e.qualified,
  failed: e.failed.join(','),
  severity: e.severity,
  familyParticipation: e.familyParticipation,
  participation: e.participation,
  booked: Object.fromEntries(bookIds.map((b) => [b, e.centre.books[b].booked])),
  lotsBy: Object.fromEntries(bookIds.map((b) => [b, e.centre.books[b].lots])),
  causal: Object.fromEntries(Object.entries(e.removal).map(([k, r]) => [k, r2(e.centre.net - r.net)]))
});
