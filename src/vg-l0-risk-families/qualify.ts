// Qualification, ranking evidence and NL0's roles (PROTOCOL.md §9; reference method NL0 1.0.0 §3.5), identical for every
// cell, stage and cutoff, on the cutoff's training door only.
//
// Evidence per member: the centre; the DETAILED centre (evaluate.ts riskInputsOf: exposure at the cutoff close, per-lot
// adverse excursions, occupancy — the risk-aware selector's inputs, PROTOCOL.md §10.2); SELECTION 2 × 128 (ranking only;
// its tail statistics included); fresh CONFIRMATION 3 × 128 = 384 (labels ('confirm', rep, cutoff) — qualification only);
// the frozen stresses (Q5 and report-only); the causal removal reruns (report-only). Draws are common random numbers
// across every member of a cutoff (the labels never contain the cell or the stage).
//
// Gates (all must hold): Q1 centre net > 0; Q2 centre DD ≤ $35,000; Q3 confirmation p90 DD ≤ $35,000; Q4 confirmation
// p10 net > 0; Q5 at 10 bps per side: centre net > 0 and DD ≤ $35,000; Q6 D1 and Growth both funded at the centre.
import { type BookId, bookIds, familyOf, symbolOf } from '../vg-d1-growth-joint/books.ts';
import type { EvalOptions, Rec } from '../vg-d1-growth-joint/evaluate.ts';
import { type Tail, tailOf } from '../vg-d1-growth-diagnostic/risk.ts';
import { economics, r2, symbols } from './context.ts';
import type { DRec, RiskInputs, SRec } from './evaluate.ts';
import { type Cfg, type Scope, activeInputs, cellOf, cfgId, neighbourhood } from './space.ts';
import { type Nb, familiesFunded, nbStats, profitOrder } from './fitness.ts';
import { vOptions } from './nl0.ts';
import type { Lab } from './lab.ts';

export type MemberStage = 'broad' | 'refine' | 'control';

export interface Member {
  label: string; // e.g. C21/broad/GB1.VD0e/R2#1 profit
  lane: string;
  stage: MemberStage;
  replicate: number | null;
  cfg: Cfg;
  pick: string; // the lane's shortlist slot (or the control's key)
}

export interface CompactRec {
  net: number;
  dd: number;
  lots: number;
  realized: number;
  unrealized: number;
  interest: number;
  costs: number;
  booked: Record<BookId, number>;
  famLots: { D1: number; G: number };
}

export const compact = (r: Rec): CompactRec => ({
  net: r.net,
  dd: r.dd,
  lots: r.lots,
  realized: r.realized,
  unrealized: r.unrealized,
  interest: r.interest,
  costs: r.costs,
  booked: Object.fromEntries(bookIds.map((b) => [b, r.books[b].booked])) as Record<BookId, number>,
  famLots: { D1: r.fam.D1.lots, G: r.fam.G.lots }
});

export interface Evidence {
  label: string;
  lane: string;
  stage: MemberStage;
  pick: string;
  replicate: number | null;
  cell: string;
  base: boolean;
  id: string;
  cfg: Cfg;
  activeInputs: number;
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

export const fidelity = { selectReps: 2, confirmReps: 3, n: 128 };

// The frozen stresses (standard §5.1; brief §5.3). The stop-slippage stress applies to protective fills as to trailing
// fills (RC 1/RC 2); the next-open stress applies to every stop of the D1 books, entry-day protective stops included.
export const stresses: Record<string, EvalOptions['friction']> = {
  'cost 10 bps': { costBps: 10 },
  'cost 20 bps': { costBps: 20 },
  'interest 14%': { rate: 0.14 },
  'stop slippage +25 bps': { stopSlippageBps: 25 },
  'next-open stops': { stopFill: 'next-open' }
};

export const enabledOf = (o: EvalOptions): BookId[] => bookIds.filter((b) => o.enabled?.[b] !== false);

// The causal removal reruns: each family, each symbol and each enabled component disabled (duplicates dropped).
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

    const cell = cellOf(p.m.cfg.cell);

    out.push({
      label: p.m.label,
      lane: p.m.lane,
      stage: p.m.stage,
      pick: p.m.pick,
      replicate: p.m.replicate,
      cell: cell.id,
      base: cell.base,
      id: cfgId(p.m.cfg),
      cfg: p.m.cfg,
      activeInputs: activeInputs(p.m.cfg),
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

// ----- NL0's roles (standard §2.3; ranked on the selection families) -----

export type RoleName = 'actual-profit' | 'robust-profit' | 'balanced' | 'lower-drawdown';
export const roleNames: RoleName[] = ['actual-profit', 'robust-profit', 'balanced', 'lower-drawdown'];

export interface Roles {
  set: string;
  members: number;
  qualified: number;
  roles: Record<RoleName, string | null>;
  pareto: string[];
  reason: string;
}

const byLabel = (a: Evidence, b: Evidence) => (a.label < b.label ? -1 : a.label > b.label ? 1 : 0);

// NL0's actual-profit order: centre net, then selection robust, then lower centre DD, then the label (profitOrder).
export const actualProfitOrder = (q: readonly Evidence[]) =>
  profitOrder(q.map((e) => ({ label: e.label, net: e.centre.net, robust: e.select.robust, dd: e.centre.dd, e }))).map((x) => x.e);

export const rolesOf = (set: string, ev: readonly Evidence[]): Roles => {
  const q = ev.filter((e) => e.qualified);

  if (q.length === 0)
    return {
      set,
      members: ev.length,
      qualified: 0,
      roles: { 'actual-profit': null, 'robust-profit': null, balanced: null, 'lower-drawdown': null },
      pareto: [],
      reason: 'no qualified member: no primary'
    };

  const top = actualProfitOrder(q)[0]!;
  const robust = [...q].sort((a, b) => b.select.robust - a.select.robust || byLabel(a, b))[0]!;
  const balanced = [...q].sort(
    (a, b) => b.select.robust / Math.max(1, b.select.p90Dd) - a.select.robust / Math.max(1, a.select.p90Dd) || byLabel(a, b)
  )[0]!;
  const lower =
    [...q].filter((e) => e.select.robust >= 0.5 * top.select.robust).sort((a, b) => a.select.p90Dd - b.select.p90Dd || byLabel(a, b))[0] ?? null;
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
    roles: { 'actual-profit': top.label, 'robust-profit': robust.label, balanced: balanced.label, 'lower-drawdown': lower?.label ?? null },
    pareto: q
      .filter((a) => !q.some((b) => b !== a && dominated(a, b)))
      .map((e) => e.label)
      .sort(),
    reason: `${q.length} qualified of ${ev.length}`
  };
};
