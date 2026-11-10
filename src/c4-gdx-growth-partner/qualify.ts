// Qualification, roles, the baseline comparison and the paired increments (PROTOCOL.md §8, §9), identical at every
// cutoff, on the cutoff's training door only.
//
// Evidence per member (every family has common random numbers across every member and arm of the cutoff):
//   - the centre;
//   - SELECTION 2 × 128 (labels ('select', rep, cutoff); ranking only) and fresh CONFIRMATION 3 × 128 = 384 (labels
//     ('confirm', rep, cutoff); qualification only), each in TWO scopes: 'joint' (whole portfolio: the anchor books
//     really move too) and 'gdx' (Growth·GDX only, anchors at their frozen values);
//   - 'anchors' confirmation rep 1 (128; report): the anchors moved, Growth·GDX at its centre;
//   - half (0.5) and wide (1.5) radius whole-portfolio families (128 each; report);
//   - the frozen stresses, the GDX rule toggles (report) and the causal removal reruns;
//   - at C24, for the D1 arms and E, Priority 3B's own fresh confirmation instrument (its namespace, report-only: the
//     "archived instrument" reproducing 3B's C4 and C4-refined statistics like for like).
// Rows are kept with their index: a member and its arm's baseline are compared on IDENTICAL draws (paired increments).
//
// Gates (all must hold): Q1 centre net > 0; Q2 centre DD ≤ $35,000; Q3 whole-portfolio confirmation p90 DD ≤ $35,000;
// Q4 whole-portfolio confirmation p10 net > 0; Q5 at 10 bps per side: centre net > 0 and DD ≤ $35,000; Q6 participation:
// the anchors' families receive capital at the centre and, for a GDX-enabled member, Growth·GDX does; Q7 (GDX-enabled
// members) GDX-only confirmation p90 DD ≤ $35,000 and p10 net > 0.
import { type BookId, bookIds, familyOf, symbolOf } from '../vg-d1-growth-joint/books.ts';
import type { EvalOptions, Rec } from '../vg-d1-growth-joint/evaluate.ts';
import { type Tail, tailOf } from '../vg-d1-growth-diagnostic/risk.ts';
import {
  neighbourhood as p3bNeighbourhood,
  canonicalOf as p3bCanonicalOf,
  incOfEnabled as p3bIncOf
} from '../vg-d1-growth-expanded/config.ts';
import { economics, r2 } from './context.ts';
import { type Nb, nbStats, profitOrder, quantile } from './fitness.ts';
import type { Lab } from './lab.ts';
import {
  type Arm,
  type GConfig,
  type Quad,
  type Row,
  type Scope,
  activeInputs,
  classOf,
  gId,
  gdxToggles,
  optionsOfEnabled,
  pointId,
  rowsOf
} from './space.ts';

export type MemberKind = 'baseline' | 'control' | 'partner' | 'transfer' | 'context';

export interface Member {
  label: string;
  arm: Arm | null;
  kind: MemberKind;
  lane: string;
  origin: string; // seed | design | screen | island | refine | filler | control | transfer from <arm>
  quad: Quad;
  enabled: BookId[];
  options: EvalOptions;
  gdx: GConfig | null;
  selectable: boolean;
  control?: string;
}

export const memberId = (m: Pick<Member, 'enabled' | 'quad'>) => pointId(m.enabled, m.quad);

export interface FamilyRows {
  net: number[]; // per row (all rows, duplicates included: a paired difference uses every row)
  dd: number[];
  dup: boolean[];
}

export interface Evidence {
  label: string;
  arm: Arm | null;
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
  enabled: BookId[];
  class: string;
  activeInputs: Record<Scope, number>;
  centre: Rec;
  select: Nb;
  confirm: Nb;
  confirmTail: Tail;
  confirmReps: Nb[];
  confirmDraws: { drawn: number; unique: number };
  selectGdx: Nb;
  confirmGdx: Nb;
  confirmGdxTail: Tail | null;
  anchors: Nb;
  small: Nb;
  smallTail: Tail;
  wide: Nb;
  wideTail: Tail;
  archived: { confirm: Nb; tail: Tail; drawn: number; unique: number } | null;
  rows: { confirm: FamilyRows; confirmGdx: FamilyRows; select: FamilyRows };
  stress: Record<string, Rec>;
  toggles: Record<string, Rec>;
  removal: Record<string, Rec>;
  gates: Record<'Q1' | 'Q2' | 'Q3' | 'Q4' | 'Q5' | 'Q6' | 'Q7', boolean>;
  qualified: boolean;
  failed: string[];
  severity: Record<string, number>;
  participation: Record<BookId, 'disabled' | 'unfunded' | 'token' | 'funded'>;
  gdxParticipation: 'disabled' | 'unfunded' | 'token' | 'funded';
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

// The causal removal reruns: each family, each symbol and each enabled component disabled (removing Growth·GDX from a
// partner gives exactly its arm's baseline: the causal contribution of the partner).
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
  for (const s of ['GDX', 'VGT'] as const)
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

  return Object.fromEntries(
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
};

const famOf = (name: string, labels: (string | number)[], scope: Scope, scale = 1, n = fidelity.n) => ({
  name,
  n,
  labels,
  scope,
  scale
});

// the anchors' families funded (Q6): D1 when the member has D1 books, Growth when it has a Growth book
const familiesFunded = (r: Rec, enabled: readonly BookId[]) =>
  !r.error &&
  (!enabled.some((b) => b.startsWith('D1:')) || r.fam.D1.lots > 0) &&
  (!enabled.some((b) => b.startsWith('G:')) || r.fam.G.lots > 0);

export const qualifyMembers = async (
  lab: Lab,
  members: readonly Member[],
  cutoff: string,
  archived: boolean
): Promise<Evidence[]> => {
  type Plan = {
    m: Member;
    fams: Record<string, Row[]>;
    singles: Record<string, { quad: Quad; options: EvalOptions }>;
  };
  const plans: Plan[] = members.map((m) => {
    const built = { quad: m.quad, enabled: m.enabled, options: m.options, id: memberId(m) };
    const fams: Plan['fams'] = {};
    const rows = (f: ReturnType<typeof famOf>) => rowsOf(built as never, f);

    for (let rep = 1; rep <= fidelity.selectReps; rep++) {
      fams[`select${rep}`] = rows(famOf('select', ['select', rep, cutoff], 'joint'));
      fams[`selectGdx${rep}`] = rows(famOf('select', ['select', rep, cutoff], 'gdx'));
    }
    for (let rep = 1; rep <= fidelity.confirmReps; rep++) {
      fams[`confirm${rep}`] = rows(famOf('confirm', ['confirm', rep, cutoff], 'joint'));
      fams[`confirmGdx${rep}`] = rows(famOf('confirm', ['confirm', rep, cutoff], 'gdx'));
    }
    fams.anchors = rows(famOf('confirm', ['confirm', 1, cutoff], 'anchors'));
    fams.small = rows(famOf('small', ['small', cutoff], 'joint', 0.5));
    fams.wide = rows(famOf('wide', ['wide', cutoff], 'joint', 1.5));

    // Priority 3B's own fresh confirmation instrument (report-only; D1 configurations only)
    const inc = p3bIncOf(m.enabled);

    if (archived && inc) {
      const c = p3bCanonicalOf(inc, m.quad);
      const seen = new Set<string>([pointId(m.enabled, m.quad)]);

      fams.archived = [];
      for (let rep = 1; rep <= 3; rep++)
        for (const p of p3bNeighbourhood(c, { name: 'confirm', n: 128, labels: ['confirm', rep, 'C24'] })) {
          const id = pointId(m.enabled, p.cfg.quad);

          fams.archived.push({
            row: fams.archived.length,
            quad: p.cfg.quad,
            options: m.options,
            id,
            clipped: p.clipped,
            dup: seen.has(id)
          });
          seen.add(id);
        }
    }

    const singles: Plan['singles'] = { centre: { quad: m.quad, options: m.options } };

    for (const [name, f] of Object.entries(stresses))
      singles[`stress:${name}`] = {
        quad: m.quad,
        options: { ...m.options, friction: { ...(m.options.friction ?? {}), ...f } }
      };
    if (m.gdx)
      for (const [name, g] of Object.entries(gdxToggles(m.gdx)))
        singles[`toggle:${name}`] = { quad: { ...m.quad, g: { ...m.quad.g, GDX: g } }, options: m.options };
    for (const [name, drop] of Object.entries(removalsOf(m.enabled)))
      singles[`removal:${name}`] = {
        quad: m.quad,
        options: optionsOfEnabled(m.enabled.filter((b) => !drop.includes(b)))
      };

    return { m, fams, singles };
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

  for (const p of plans) {
    const singles: Record<string, Rec> = {};

    for (const k of Object.keys(p.singles)) singles[k] = recs[at++]!;

    const famRecs: Record<string, Rec[]> = {};

    for (const [k, f] of Object.entries(p.fams)) famRecs[k] = f.map(() => recs[at++]!);

    const centre = singles.centre!;
    const pooled = (prefix: string) => {
      const keys = Object.keys(p.fams).filter((k) => k.replace(/\d+$/, '') === prefix);
      const seen = new Set<string>([memberId(p.m)]);
      const rs: Rec[] = [];
      const clipped: number[] = [];
      const all: FamilyRows = { net: [], dd: [], dup: [] };
      let drawn = 0;

      for (const k of keys)
        p.fams[k]!.forEach((x, i) => {
          const r = famRecs[k]![i]!;

          drawn++;
          all.net.push(r.net);
          all.dd.push(r.dd);
          all.dup.push(seen.has(x.id));
          if (seen.has(x.id)) return;
          seen.add(x.id);
          rs.push(r);
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
        unique: rs.length,
        all
      };
    };
    const one = (k: string) => {
      const f = p.fams[k]!;
      const keep = f.map((x, i) => ({ x, r: famRecs[k]![i]! })).filter((y) => !y.x.dup);

      return nbStats(
        centre,
        keep.map((y) => y.r),
        keep.map((y) => y.x.clipped)
      );
    };
    const oneTail = (k: string) => {
      const keep = p.fams[k]!.map((x, i) => ({ x, r: famRecs[k]![i]! })).filter((y) => !y.x.dup);

      return tailOf(
        centre,
        keep.map((y) => ({ rec: y.r, clipped: y.x.clipped }))
      );
    };
    const select = pooled('select');
    const confirm = pooled('confirm');
    const selectGdx = pooled('selectGdx');
    const confirmGdx = pooled('confirmGdx');
    const arch = p.fams.archived ? pooled('archived') : null;
    const stress: Record<string, Rec> = {};
    const toggles: Record<string, Rec> = {};
    const removal: Record<string, Rec> = {};

    for (const [k, r] of Object.entries(singles)) {
      if (k.startsWith('stress:')) stress[k.slice(7)] = r;
      if (k.startsWith('toggle:')) toggles[k.slice(7)] = r;
      if (k.startsWith('removal:')) removal[k.slice(8)] = r;
    }

    const c = economics.ceiling;
    const s10 = stress['cost 10 bps']!;
    const hasGdx = p.m.enabled.includes('G:GDX');
    const gates = {
      Q1: centre.net > 0,
      Q2: centre.dd <= c,
      Q3: confirm.nb.p90Dd <= c,
      Q4: confirm.nb.p10 > 0,
      Q5: s10.net > 0 && s10.dd <= c,
      Q6: familiesFunded(centre, p.m.enabled) && (!hasGdx || centre.books['G:GDX'].lots > 0),
      Q7: !hasGdx || (confirmGdx.nb.p90Dd <= c && confirmGdx.nb.p10 > 0)
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
    if (!gates.Q7) severity.Q7 = r2(Math.max(confirmGdx.nb.p90Dd - c, -confirmGdx.nb.p10));

    const part = participationOf(centre, p.m.enabled);
    const built = { quad: p.m.quad, enabled: p.m.enabled, options: p.m.options, id: memberId(p.m) } as never;

    out.push({
      label: p.m.label,
      arm: p.m.arm,
      kind: p.m.kind,
      lane: p.m.lane,
      origin: p.m.origin,
      control: p.m.control ?? null,
      selectable: p.m.selectable,
      id: memberId(p.m),
      p3Id: centre.id,
      gdxId: p.m.gdx ? gId(p.m.gdx) : null,
      gdx: p.m.gdx,
      quad: p.m.quad,
      enabled: p.m.enabled,
      class: classOf(p.m.gdx),
      activeInputs: {
        joint: activeInputs(built, 'joint'),
        gdx: activeInputs(built, 'gdx'),
        anchors: activeInputs(built, 'anchors')
      },
      centre,
      select: select.nb,
      confirm: confirm.nb,
      confirmTail: confirm.tail!,
      confirmReps: Array.from({ length: fidelity.confirmReps }, (_v, i) => one(`confirm${i + 1}`)),
      confirmDraws: { drawn: confirm.drawn, unique: confirm.unique },
      selectGdx: selectGdx.nb,
      confirmGdx: confirmGdx.nb,
      confirmGdxTail: confirmGdx.tail,
      anchors: one('anchors'),
      small: one('small'),
      smallTail: oneTail('small'),
      wide: one('wide'),
      wideTail: oneTail('wide'),
      archived: arch ? { confirm: arch.nb, tail: arch.tail!, drawn: arch.drawn, unique: arch.unique } : null,
      rows: { confirm: confirm.all, confirmGdx: confirmGdx.all, select: select.all },
      stress,
      toggles,
      removal,
      gates,
      qualified: failed.length === 0,
      failed,
      severity,
      participation: part,
      gdxParticipation: part['G:GDX']
    });
  }

  return out;
};

// ----- ranking and roles (standard §2.3; ranked on the whole-portfolio selection families) -----

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
      reason: 'no qualified member: no primary'
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

// ----- the comparison with the arm's baseline (development; the fresh whole-portfolio confirmation) -----

export interface Paired {
  rows: number;
  medianDeltaNet: number;
  p10DeltaNet: number;
  p90DeltaNet: number;
  meanDeltaNet: number;
  positiveShare: number; // rows where the member's net exceeds the baseline's
  medianDeltaDd: number;
  p90DeltaDd: number;
  worseDdShare: number; // rows where the member's DD exceeds the baseline's
  bothBreach: number;
  memberOnlyBreach: number;
  baselineOnlyBreach: number;
}

// The paired increments of a member over its baseline: on identical whole-portfolio rows (`b` the baseline's rows) or
// against the baseline centre (`b` a single record: the member's GDX-only rows).
export const pairedOf = (m: FamilyRows, b: FamilyRows | { net: number; dd: number }): Paired => {
  const n = m.net.length;
  const rowsB = Array.isArray(b.net);

  if (rowsB && (b as FamilyRows).net.length !== n) throw new Error('paired rows differ in number');

  const bn = (i: number) => (rowsB ? (b as FamilyRows).net[i]! : (b as { net: number }).net);
  const bd = (i: number) => (rowsB ? (b as FamilyRows).dd[i]! : (b as { dd: number }).dd);
  const dn = m.net.map((x, i) => x - bn(i)).sort((x, y) => x - y);
  const dd = m.dd.map((x, i) => x - bd(i)).sort((x, y) => x - y);
  const c = economics.ceiling;
  let both = 0;
  let mo = 0;
  let bo = 0;

  for (let i = 0; i < n; i++) {
    const a = m.dd[i]! > c;
    const z = bd(i) > c;

    if (a && z) both++;
    else if (a) mo++;
    else if (z) bo++;
  }

  return {
    rows: n,
    medianDeltaNet: r2(quantile(dn, 0.5)),
    p10DeltaNet: r2(quantile(dn, 0.1)),
    p90DeltaNet: r2(quantile(dn, 0.9)),
    meanDeltaNet: r2(dn.reduce((x, y) => x + y, 0) / Math.max(1, n)),
    positiveShare: Math.round((m.net.filter((x, i) => x > bn(i)).length / Math.max(1, n)) * 1e4) / 1e4,
    medianDeltaDd: r2(quantile(dd, 0.5)),
    p90DeltaDd: r2(quantile(dd, 0.9)),
    worseDdShare: Math.round((m.dd.filter((x, i) => x > bd(i)).length / Math.max(1, n)) * 1e4) / 1e4,
    bothBreach: both,
    memberOnlyBreach: mo,
    baselineOnlyBreach: bo
  };
};

export interface BaselineLabels {
  label: string;
  dNet: number;
  dDd: number;
  dMedian: number;
  dP10: number;
  dP90Dd: number;
  dSelectRobust: number;
  dCost10: number;
  dCost20: number;
  dominates: boolean; // ≥ centre net and confirmation p10, ≤ centre DD and confirmation p90 DD, one strict
  higherProfitTradeOff: boolean; // centre net > the baseline's without dominating it
  strongerLocalStability: boolean; // confirmation p10 > and confirmation p90 DD < the baseline's
  p90WithinFiniteDrawUncertainty: boolean; // report-only: the two p90 order-statistic 95% intervals overlap
  pairedJoint: Paired; // identical whole-portfolio draws
  pairedGdx: Paired | null; // the member's GDX-only draws against the baseline centre
}

export const baselineLabelsOf = (e: Evidence, base: Evidence): BaselineLabels => {
  const dominates =
    e.centre.net >= base.centre.net &&
    e.centre.dd <= base.centre.dd &&
    e.confirm.p10 >= base.confirm.p10 &&
    e.confirm.p90Dd <= base.confirm.p90Dd &&
    (e.centre.net > base.centre.net ||
      e.centre.dd < base.centre.dd ||
      e.confirm.p10 > base.confirm.p10 ||
      e.confirm.p90Dd < base.confirm.p90Dd);
  const [al, ah] = e.confirmTail.p90Interval;
  const [bl, bh] = base.confirmTail.p90Interval;

  return {
    label: e.label,
    dNet: r2(e.centre.net - base.centre.net),
    dDd: r2(e.centre.dd - base.centre.dd),
    dMedian: r2(e.confirm.median - base.confirm.median),
    dP10: r2(e.confirm.p10 - base.confirm.p10),
    dP90Dd: r2(e.confirm.p90Dd - base.confirm.p90Dd),
    dSelectRobust: r2(e.select.robust - base.select.robust),
    dCost10: r2(e.stress['cost 10 bps']!.net - base.stress['cost 10 bps']!.net),
    dCost20: r2(e.stress['cost 20 bps']!.net - base.stress['cost 20 bps']!.net),
    dominates,
    higherProfitTradeOff: e.centre.net > base.centre.net && !dominates,
    strongerLocalStability: e.confirm.p10 > base.confirm.p10 && e.confirm.p90Dd < base.confirm.p90Dd,
    p90WithinFiniteDrawUncertainty: al! <= bh! && bl! <= ah!,
    pairedJoint: pairedOf(e.rows.confirm, base.rows.confirm),
    pairedGdx: e.enabled.includes('G:GDX')
      ? pairedOf(e.rows.confirmGdx, { net: base.centre.net, dd: base.centre.dd })
      : null
  };
};

// The arm's frozen assessment (development): the partner candidate (the highest-net qualified GDX-enabled selectable
// member dominating the baseline) and the economic class.
export const armAssessment = (arm: Arm, ev: readonly Evidence[]) => {
  const base = ev.find((e) => e.arm === arm && e.kind === 'baseline');

  if (!base) throw new Error(`no baseline for arm ${arm}`);

  const members = ev.filter(
    (e) => e.arm === arm && (e.kind === 'baseline' || e.kind === 'control' || e.kind === 'partner')
  );
  const labels = ev.filter((e) => e.arm === arm).map((e) => baselineLabelsOf(e, base));
  const L = (e: Evidence) => labels.find((l) => l.label === e.label)!;
  const partners = members.filter((e) => e.kind !== 'baseline' && e.enabled.includes('G:GDX') && e.qualified);
  const dominating = partners
    .filter((e) => L(e).dominates)
    .sort((a, b) => b.centre.net - a.centre.net || (a.label < b.label ? -1 : 1));
  const tradeOffs = partners.filter(
    (e) => !L(e).dominates && (L(e).higherProfitTradeOff || L(e).strongerLocalStability)
  );
  const economicClass = dominating.length
    ? 'stable addition on development (a qualified partner dominates the baseline)'
    : tradeOffs.length
      ? 'risk/profit trade-off (qualified partners earn more or are locally more stable, none dominates)'
      : 'no improvement (no qualified partner earns more or is locally more stable than the baseline)';

  return {
    arm,
    baseline: { label: base.label, qualified: base.qualified, failed: base.failed },
    labels,
    partnerCandidate: dominating[0]?.label ?? null,
    dominating: dominating.map((e) => e.label),
    tradeOffs: tradeOffs.map((e) => e.label),
    qualifiedPartners: partners.length,
    economicClass
  };
};

export const summary = (e: Evidence) => ({
  label: e.label,
  arm: e.arm,
  kind: e.kind,
  origin: e.origin,
  control: e.control,
  id: e.id,
  p3Id: e.p3Id,
  gdxId: e.gdxId,
  class: e.class,
  net: e.centre.net,
  dd: e.centre.dd,
  lots: e.centre.lots,
  gdxLots: e.centre.books['G:GDX'].lots,
  gdxBooked: e.centre.books['G:GDX'].booked,
  selectRobust: e.select.robust,
  selectP10: e.select.p10,
  selectP90: e.select.p90Dd,
  confirmMedian: e.confirm.median,
  confirmP10: e.confirm.p10,
  confirmP90Dd: e.confirm.p90Dd,
  breachShare: e.confirm.breachShare,
  meanExcess: e.confirm.meanExcess,
  worstDd: e.confirm.worstDd,
  confirmGdxMedian: e.confirmGdx.median,
  confirmGdxP10: e.confirmGdx.p10,
  confirmGdxP90Dd: e.confirmGdx.p90Dd,
  qualified: e.qualified,
  failed: e.failed.join(','),
  severity: e.severity,
  participation: e.participation,
  booked: Object.fromEntries(bookIds.map((b) => [b, e.centre.books[b].booked])),
  lotsBy: Object.fromEntries(bookIds.map((b) => [b, e.centre.books[b].lots])),
  causal: Object.fromEntries(Object.entries(e.removal).map(([k, r]) => [k, r2(e.centre.net - r.net)]))
});
