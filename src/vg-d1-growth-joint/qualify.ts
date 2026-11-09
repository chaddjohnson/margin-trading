// Qualification, ranking and roles (PROTOCOL.md §12), identical at every cutoff, on the cutoff's training door only.
import { type BookId, bookIds, familyOf, symbolOf } from './books.ts';
import { economics, r2, symbols } from './context.ts';
import type { EvalOptions, Rec } from './evaluate.ts';
import { type Nb, type Need, nbStats, profitOrder, structureOk } from './fitness.ts';
import type { Lab } from './lab.ts';
import {
  type Quad,
  type Scope,
  cellName,
  cellOf,
  classOf,
  gatePairOf,
  neighbourhood,
  normalize,
  quadId,
  structureOf
} from './space.ts';

export type MemberKind = 'indep' | 'gpair' | 'informed' | 'staged' | 'control';

export interface Member {
  label: string; // e.g. C24/indep/GDX-rise_VGT-breakout#1 profit
  lane: string;
  kind: MemberKind;
  need: Need;
  quad: Quad;
  options: EvalOptions; // the enabled components (all four unless a control or the Growth pair disables some)
  selectable: boolean; // a four-component member of the informed selectable set (C24)
  group?: string;
}

export interface Evidence {
  label: string;
  lane: string;
  kind: MemberKind;
  group: string | null;
  selectable: boolean;
  id: string;
  quad: Quad;
  enabled: BookId[];
  cell: string;
  gates_: string; // the Growth gate pair
  class: ReturnType<typeof classOf>;
  centre: Rec;
  select: Nb; // 2 × 128 pooled (ranking)
  confirm: Nb; // 3 × 128 pooled (qualification only)
  confirmReps: Nb[];
  confirmDraws: { drawn: number; unique: number };
  scopes: Partial<Record<Scope, Nb>>; // family and symbol (and component) perturbation scopes
  small: Nb;
  wide: Nb;
  stress: Record<string, Rec>;
  toggles: Record<string, Rec>; // categorical alternatives (report-only)
  removal: Record<string, Rec>; // causal reruns with a family, a symbol or a component disabled
  gates: Record<string, boolean>;
  qualified: boolean;
  failed: string[];
  participation: Record<BookId, 'disabled' | 'unfunded' | 'token' | 'funded'>;
  familyParticipation: 'mixed' | 'token' | 'single-family';
}

export const fidelity = { select: 128, selectReps: 2, confirm: 128, confirmReps: 3, side: 128 };

// Frozen stresses (standard §5.1). Next-open stop fills are unsupported by Growth's optional exit rules (they assume
// fills at the stop level); for such a Growth book that stress keeps stop-level fills (recorded).
export const stresses: Record<string, EvalOptions['friction']> = {
  'cost 10 bps': { costBps: 10 },
  'cost 20 bps': { costBps: 20 },
  'interest 14%': { rate: 0.14 },
  'stop slippage +25 bps': { stopSlippageBps: 25 },
  'next-open stops': { stopFill: 'next-open' }
};

export const enabledOf = (o: EvalOptions): BookId[] => bookIds.filter((b) => o.enabled?.[b] !== false);

// The categorical alternatives of a member (report-only): the other family priority, and every enabled optional
// Growth rule of each enabled Growth book switched OFF.
export const togglesOf = (q: Quad, enabled: readonly BookId[]): Record<string, Quad> => {
  const out: Record<string, Quad> = {};
  const add = (name: string, x: Quad) => {
    try {
      const n = normalize(x);

      if (quadId(n) !== quadId(q)) out[name] = n;
    } catch {
      // not a valid alternative
    }
  };
  const hasD1 = enabled.some((b) => familyOf(b) === 'D1');
  const hasG = enabled.some((b) => familyOf(b) === 'G');

  if (hasD1 && hasG) add('priority flipped', { ...q, first: q.first === 'D1' ? 'G' : 'D1' });

  for (const s of symbols) {
    if (!enabled.includes(`G:${s}` as BookId)) continue;

    const st = structureOf(q.g[s]);
    const set = (k: string) => ({ ...q, g: { ...q.g, [s]: { ...q.g[s], [k]: false } } });

    if (st.retain === 'on') add(`G·${s} retention OFF`, set('retentionEnabled'));
    if (st.gate === 'on') add(`G·${s} recovery gate OFF`, set('drawdownRecoveryGateEnabled'));
    if (st.trend !== 'off') add(`G·${s} trend filter OFF`, set('trendFilterEnabled'));
    if (st.elig !== 'off') add(`G·${s} eligibility OFF`, set('eligibilityEnabled'));
    if (st.istop === 'on') add(`G·${s} initial stop OFF`, set('initialStopEnabled'));
    if (st.cont !== 'off') add(`G·${s} continuation OFF`, set('continuationEnabled'));
    if (st.exits === 'hold_on_buffer_on') add(`G·${s} loss buffer OFF`, set('intradayLossBufferEnabled'));
  }

  return out;
};

// The causal removal reruns: each family, each symbol and each component disabled (only those that change the set).
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

const share = 0.05; // token participation: below 5% of the pool's funded principal-days (standard §0.3)

export const participationOf = (r: Rec, enabled: readonly BookId[]) => {
  const total = bookIds.reduce((a, b) => a + r.books[b].principalDays, 0);
  const per = Object.fromEntries(
    bookIds.map((b) => [
      b,
      !enabled.includes(b)
        ? 'disabled'
        : r.books[b].lots === 0
          ? 'unfunded'
          : total > 0 && r.books[b].principalDays / total < share
            ? 'token'
            : 'funded'
    ])
  ) as Evidence['participation'];
  const ftotal = r.fam.D1.principalDays + r.fam.G.principalDays;
  const fam: Evidence['familyParticipation'] = !(r.fam.D1.lots > 0 && r.fam.G.lots > 0)
    ? 'single-family'
    : ftotal > 0 && Math.min(r.fam.D1.principalDays, r.fam.G.principalDays) / ftotal < share
      ? 'token'
      : 'mixed';

  return { per, fam };
};

// The perturbation scopes of a member: combined members — both families, both symbols; the Growth pair — each Growth
// book. Only scopes with an enabled book.
export const scopesOf = (m: Member): Scope[] => {
  const en = enabledOf(m.options);
  const has = (pred: (b: BookId) => boolean) => en.some(pred);

  if (m.need === 'G') return (['G:GDX', 'G:VGT'] as const).filter((b) => en.includes(b));

  return [
    ...(has((b) => familyOf(b) === 'D1') && has((b) => familyOf(b) === 'G') ? (['d1', 'g'] as const) : []),
    ...(has((b) => symbolOf(b) === 'VGT') && has((b) => symbolOf(b) === 'GDX') ? (['vgt', 'gdx'] as const) : [])
  ];
};

export const qualifyMembers = async (lab: Lab, members: readonly Member[], cutoff: string): Promise<Evidence[]> => {
  type Plan = {
    m: Member;
    fams: Record<string, { quad: Quad; clipped: number }[]>;
    singles: Record<string, { quad: Quad; options: EvalOptions } | null>;
  };
  const plans: Plan[] = members.map((m) => {
    const base: Scope = m.need === 'G' ? 'g' : 'joint';
    const fam = (name: string, labels: (string | number)[], sc: Scope, scale = 1, n = fidelity.side) =>
      neighbourhood(m.quad, { name, n, labels, scope: sc, scale }).map((p) => ({ quad: p.quad, clipped: p.clipped }));
    const fams: Plan['fams'] = {};

    for (let rep = 1; rep <= fidelity.selectReps; rep++)
      fams[`select${rep}`] = fam('select', ['select', rep, cutoff], base, 1, fidelity.select);
    for (let rep = 1; rep <= fidelity.confirmReps; rep++)
      fams[`confirm${rep}`] = fam('confirm', ['confirm', rep, cutoff], base, 1, fidelity.confirm);
    for (const sc of scopesOf(m)) fams[`scope:${sc}`] = fam(sc, ['scope', sc, cutoff], sc);
    fams.small = fam('small', ['small', cutoff], base, 0.5);
    fams.wide = fam('wide', ['wide', cutoff], base, 1.5);

    const en = enabledOf(m.options);
    const singles: Plan['singles'] = { centre: { quad: m.quad, options: m.options } };

    for (const [name, f] of Object.entries(stresses))
      singles[`stress:${name}`] = {
        quad: m.quad,
        options: { ...m.options, friction: { ...(m.options.friction ?? {}), ...f } }
      };
    for (const [name, q] of Object.entries(togglesOf(m.quad, en)))
      singles[`toggle:${name}`] = { quad: q, options: m.options };
    for (const [name, drop] of Object.entries(removalsOf(en)))
      singles[`removal:${name}`] = {
        quad: m.quad,
        options: {
          ...m.options,
          enabled: { ...(m.options.enabled ?? {}), ...Object.fromEntries(drop.map((b) => [b, false])) }
        }
      };

    return { m, fams, singles };
  });

  const items: { quad: Quad; options: EvalOptions }[] = [];

  for (const p of plans) {
    for (const s of Object.values(p.singles)) if (s) items.push(s);
    for (const f of Object.values(p.fams)) for (const x of f) items.push({ quad: x.quad, options: p.m.options });
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

          const id = quadId(x.quad);

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
    const stress: Record<string, Rec> = {};
    const toggles: Record<string, Rec> = {};
    const removal: Record<string, Rec> = {};

    for (const [k, r] of Object.entries(singles)) {
      if (!r) continue;
      if (k.startsWith('stress:')) stress[k.slice(7)] = r;
      if (k.startsWith('toggle:')) toggles[k.slice(7)] = r;
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
      Q6: structureOk(centre, p.m.need)
    };
    const failed = Object.entries(gates)
      .filter(([, v]) => !v)
      .map(([k]) => k);
    const en = enabledOf(p.m.options);
    const part = participationOf(centre, en);

    out.push({
      label: p.m.label,
      lane: p.m.lane,
      kind: p.m.kind,
      group: p.m.group ?? null,
      selectable: p.m.selectable,
      id: quadId(p.m.quad),
      quad: p.m.quad,
      enabled: en,
      cell: cellName(cellOf(p.m.quad)),
      gates_: gatePairOf(p.m.quad),
      class: classOf(p.m.quad),
      centre,
      select: select.nb,
      confirm: confirm.nb,
      confirmReps: Array.from({ length: fidelity.confirmReps }, (_v, i) => one(`confirm${i + 1}`)!),
      confirmDraws: { drawn: confirm.drawn, unique: confirm.unique },
      scopes: Object.fromEntries(scopesOf(p.m).map((sc) => [sc, one(`scope:${sc}`)!])),
      small: one('small')!,
      wide: one('wide')!,
      stress,
      toggles,
      removal,
      gates,
      qualified: failed.length === 0,
      failed,
      participation: part.per,
      familyParticipation: part.fam
    });
  }

  return out;
};

// ----- ranking and roles (PROTOCOL.md §12.3) -----

export interface Roles {
  set: string; // which set the roles rank
  members: number;
  qualified: number;
  ranked: { rank: number; label: string; id: string; net: number; robust: number; p90: number }[]; // the profit order
  roles: Record<'actual-profit' | 'robust-profit' | 'balanced' | 'lower-drawdown', string | null>;
  pareto: string[]; // the non-dominated qualified members on (centre net, centre DD, selection p10, selection p90 DD)
  reason: string;
}

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
      reason: 'no qualified member: no primary (the frozen fallback: report no qualified combined result)'
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

export const summary = (e: Evidence) => ({
  label: e.label,
  kind: e.kind,
  id: e.id,
  cell: e.cell,
  gates: e.gates_,
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
  familyParticipation: e.familyParticipation,
  participation: e.participation,
  booked: Object.fromEntries(bookIds.map((b) => [b, e.centre.books[b].booked])),
  lotsBy: Object.fromEntries(bookIds.map((b) => [b, e.centre.books[b].lots])),
  causal: Object.fromEntries(Object.entries(e.removal).map(([k, r]) => [k, r2(e.centre.net - r.net)]))
});
