// Qualification, roles, the Pareto set and the diverse catalog of one cutoff (PROTOCOL.md §12), on that cutoff's
// training door only. Evidence per member: the centre (and its detailed replay), selection 2 × 128 (ranking),
// confirmation 3 × 128 (qualification only; independent seeds), one-scope families (entry, exit, continuation; 128 each),
// half (0.5×) and wide (1.5×) radius families (128 each), the report-only stresses and family toggles.
// Gates (all must hold; fixed before any result): Q1 centre net > 0; Q2 centre maximum minute DD ≤ $35,000;
// Q3 confirmation p90 maximum minute DD ≤ $35,000. No activity, profit-rate, concentration or breach-rate gate.
import { type FamilyKey, type Key, activeKeys, execution, stresses } from './context.ts';
import { type DoorView, type Rec, type RunSpec, recOf, run } from './evaluate.ts';
import { type Nb, nbStats, paretoOf, profitOrder, rolesOf } from './fitness.ts';
import type { Lab } from './lab.ts';
import { type Candidate, type DesignFamily, describe, designOf, distance, idOf, valuesOf } from './space.ts';
import type { Lot } from './engine.ts';

export interface Member {
  id: string;
  candidate: Candidate;
  lane: 'indep' | 'informed' | 'explore2' | 'incumbent';
  source: string; // e.g. 'C24-indep-F1 profit'
  settings?: { costBps?: number };
}

export const scopes: Record<string, readonly Key[]> = {
  entry: ['B', 'X', 'Y', 'L'],
  exit: ['S', 'H', 'U'],
  continuation: ['P', 'W']
};

const familiesFor = (cutoff: string) => ({
  select: [1, 2].map((rep): DesignFamily => ({ name: `select${rep}`, n: 128, labels: ['nbhd', 'select', rep, cutoff] })),
  confirm: [1, 2, 3].map((rep): DesignFamily => ({ name: `confirm${rep}`, n: 128, labels: ['nbhd', 'confirm', rep, cutoff] })),
  small: { name: 'small', n: 128, labels: ['nbhd', 'small', cutoff], scale: 0.5 } as DesignFamily,
  wide: { name: 'wide', n: 128, labels: ['nbhd', 'wide', cutoff], scale: 1.5 } as DesignFamily,
  scope: (s: string): DesignFamily => ({ name: `scope-${s}`, n: 128, labels: ['nbhd', 'scope', s, cutoff], scope: scopes[s] })
});

// Trading behaviour of a detailed centre replay (descriptive; diversity measures).
export const behaviourOf = (view: DoorView, lots: readonly Lot[]) => {
  const years = (view.end - view.armFrom + 1) / 252;
  const closed = lots.filter((l) => !l.open);
  const holds = closed.map((l) => (l.exitTime - l.entryTime) / 60).sort((a, b) => a - b);
  const depths = lots.map((l) => 1 - l.activationPrice / l.anchorHigh).sort((a, b) => a - b);
  const mid = (v: number[]) => (v.length ? (v.length % 2 ? v[v.length >> 1]! : (v[v.length / 2 - 1]! + v[v.length / 2]!) / 2) : 0);
  const months = new Set(lots.map((l) => view.door.sessions[l.entrySession]!.date.slice(0, 7)));
  const quarters = new Set(lots.map((l) => {
    const d = view.door.sessions[l.entrySession]!.date;

    return `${d.slice(0, 4)}Q${Math.floor((Number(d.slice(5, 7)) - 1) / 3) + 1}`;
  }));

  return {
    lots: lots.length,
    tradesPerYear: lots.length / years,
    medianHoldMinutes: mid(holds),
    sameSessionShare: closed.length ? closed.filter((l) => l.exitSession === l.entrySession).length / closed.length : 0,
    overnightShare: closed.length ? closed.filter((l) => l.exitSession !== l.entrySession).length / closed.length : 0,
    medianDepth: mid(depths),
    continuationShare: lots.length ? lots.filter((l) => l.setupKind === 'continuation').length / lots.length : 0,
    entryMonths: months.size,
    entryQuarters: quarters.size,
    entryYears: new Set(lots.map((l) => view.door.sessions[l.entrySession]!.date.slice(0, 4))).size,
    capitalYears: lots.reduce((t, l) => t + ((l.open ? view.door.sessions[view.end]!.closeTime : l.exitTime) - l.entryTime) / (365 * 86400), 0),
    entries: lots.map((l) => l.entryBar)
  };
};

export type Behaviour = ReturnType<typeof behaviourOf>;

export interface Evidence {
  id: string;
  family: FamilyKey;
  lane: Member['lane'];
  source: string;
  describe: string;
  values: Record<string, number>;
  grid: Candidate['grid'];
  centre: Rec;
  behaviour: Omit<Behaviour, 'entries'>;
  selection: Nb;
  confirmation: Nb;
  confirmationReps: Nb[];
  small: Nb;
  wide: Nb;
  scopes: Record<string, Nb>;
  stresses: Record<string, Rec>;
  toggles: Record<string, Rec>;
  gates: { Q1: boolean; Q2: boolean; Q3: boolean };
  qualified: boolean;
}

const pooled = async (lab: Lab, centre: Candidate, centreRec: Rec, fams: DesignFamily[], settings: RunSpec['settings']) => {
  const seen = new Set<string>([idOf(centre)]);
  const draws: Candidate[] = [];
  let clipped = 0;
  let duplicates = 0;
  const perRep: Candidate[][] = [];

  for (const f of fams) {
    const d = designOf(centre, f);
    const mine: Candidate[] = [];

    clipped += d.clipped;
    duplicates += d.duplicates;

    for (const x of d.draws) {
      mine.push(x.candidate);
      if (seen.has(idOf(x.candidate))) {
        duplicates++;
        continue;
      }

      seen.add(idOf(x.candidate));
      draws.push(x.candidate);
    }

    perRep.push(mine);
  }

  const recs = await lab.evaluate(draws.map((c) => ({ ruleSet: c.family, grid: c.grid, settings })));
  const byId = new Map(draws.map((c, n) => [idOf(c), recs[n]!]));
  // every draw of a family is in the pooled set (draws equal to the centre were dropped by designOf)
  const reps = perRep.map((cs) => nbStats(centreRec, cs.map((c) => byId.get(idOf(c))!)));

  return { pooled: nbStats(centreRec, recs, clipped, duplicates), reps };
};

export const toggleSets: Record<FamilyKey, { key: string; family: FamilyKey }[]> = {
  F1: [],
  F2: [{ key: 'continuation off (→ F1)', family: 'F1' }],
  F3: [{ key: 'H/U off (→ F1)', family: 'F1' }],
  F4: [
    { key: 'continuation off (→ F3)', family: 'F3' },
    { key: 'H/U off (→ F2)', family: 'F2' },
    { key: 'both off (→ F1)', family: 'F1' }
  ]
};

export const evidenceOf = async (lab: Lab, cutoff: string, m: Member): Promise<{ evidence: Evidence; behaviour: Behaviour }> => {
  const fam = familiesFor(cutoff);
  const settings = m.settings ?? {};
  const spec = { ruleSet: m.candidate.family, grid: m.candidate.grid, settings };
  const [centre] = await lab.evaluate([spec]);
  const detail = run(lab.view, spec);
  const behaviour = behaviourOf(lab.view, detail.lots);

  if (JSON.stringify(recOf(detail)) !== JSON.stringify(centre)) throw new Error(`${m.id}: the archived centre differs from its replay`);

  const selection = await pooled(lab, m.candidate, centre!, fam.select, settings);
  const confirmation = await pooled(lab, m.candidate, centre!, fam.confirm, settings);
  const small = await pooled(lab, m.candidate, centre!, [fam.small], settings);
  const wide = await pooled(lab, m.candidate, centre!, [fam.wide], settings);
  const scopeStats: Record<string, Nb> = {};

  for (const s of Object.keys(scopes))
    if (scopes[s]!.some((k) => activeKeys[m.candidate.family].includes(k)))
      scopeStats[s] = (await pooled(lab, m.candidate, centre!, [fam.scope(s)], settings)).pooled;

  const stressRecs = await lab.evaluate(
    stresses.map(({ key: _key, ...st }) => ({ ...spec, settings: { ...settings, ...st } }))
  );
  const stressMap = Object.fromEntries(stresses.map((st, n) => [st.key, stressRecs[n]!]));
  const toggles = toggleSets[m.candidate.family];
  const toggleRecs = await lab.evaluate(toggles.map((t) => ({ ruleSet: t.family, grid: m.candidate.grid, settings })));
  const gates = {
    Q1: centre!.net > 0,
    Q2: centre!.dd <= execution.ceiling,
    Q3: confirmation.pooled.p90Dd <= execution.ceiling
  };
  const { entries: _entries, ...rest } = behaviour;

  return {
    evidence: {
      id: m.id,
      family: m.candidate.family,
      lane: m.lane,
      source: m.source,
      describe: describe(m.candidate),
      values: valuesOf(m.candidate) as Record<string, number>,
      grid: m.candidate.grid,
      centre: centre!,
      behaviour: rest,
      selection: selection.pooled,
      confirmation: confirmation.pooled,
      confirmationReps: confirmation.reps,
      small: small.pooled,
      wide: wide.pooled,
      scopes: scopeStats,
      stresses: stressMap,
      toggles: Object.fromEntries(toggles.map((t, n) => [t.key, toggleRecs[n]!])),
      gates,
      qualified: gates.Q1 && gates.Q2 && gates.Q3
    },
    behaviour
  };
};

// Diversity (PROTOCOL.md §12.4). Two qualified members are near-duplicates when ANY holds: (a) the same family and a
// normalized L∞ distance < 0.10; (b) entry overlap ≥ 0.5 (shared entry minutes ÷ the smaller entry count); (c) similar
// behaviour on all three: median holding time and trades per year within a factor 1.5, median entry depth within 0.5
// percentage point.
export const similarity = (a: Evidence, ab: Behaviour, b: Evidence, bb: Behaviour) => {
  const sameFamily = a.family === b.family;
  const dist = distance({ family: a.family, grid: a.grid }, { family: b.family, grid: b.grid });
  const setB = new Set(bb.entries);
  const shared = ab.entries.filter((e) => setB.has(e)).length;
  const overlap = Math.min(ab.entries.length, bb.entries.length) ? shared / Math.min(ab.entries.length, bb.entries.length) : 0;
  const ratio = (x: number, y: number) => (x > 0 && y > 0 ? Math.max(x / y, y / x) : x === y ? 1 : Infinity);
  const holdRatio = ratio(ab.medianHoldMinutes, bb.medianHoldMinutes);
  const freqRatio = ratio(ab.tradesPerYear, bb.tradesPerYear);
  const depthGap = Math.abs(ab.medianDepth - bb.medianDepth);
  const behaviourSimilar = holdRatio < 1.5 && freqRatio < 1.5 && depthGap < 0.005;
  const reasons = [
    ...(sameFamily && dist < 0.1 ? [`canonical distance ${dist.toFixed(3)} < 0.10`] : []),
    ...(overlap >= 0.5 ? [`entry overlap ${overlap.toFixed(2)} ≥ 0.5`] : []),
    ...(behaviourSimilar ? ['similar holding, frequency and entry depth'] : [])
  ];

  return { distance: sameFamily ? dist : 1 + dist, overlap, holdRatio, freqRatio, depthGap, nearDuplicate: reasons.length > 0, reasons };
};

export const decide = (members: { evidence: Evidence; behaviour: Behaviour }[], catalogCap = 12, familyCap = 4) => {
  const q = members.filter((m) => m.evidence.qualified);
  const input = q.map((m) => ({
    id: m.evidence.id,
    net: m.evidence.centre.net,
    dd: m.evidence.centre.dd,
    robust: m.evidence.selection.robust,
    p90: m.evidence.selection.p90Dd,
    p10: m.evidence.selection.p10
  }));
  const roles = rolesOf(input);
  const pareto = paretoOf(input).map((p) => p.id);
  const primary = roles.actualProfit;
  const order = [...input].sort(profitOrder).map((x) => x.id);
  const byId = new Map(q.map((m) => [m.evidence.id, m]));
  const catalog: { id: string; why: string }[] = [];
  const mandatory = [
    ['actual-profit', roles.actualProfit],
    ['robust-profit', roles.robustProfit],
    ['balanced', roles.balanced],
    ['lower-drawdown', roles.lowerDrawdown]
  ] as const;

  for (const [role, id] of mandatory) {
    if (!id) continue;

    const existing = catalog.find((c) => c.id === id);

    if (existing) existing.why += `, ${role}`;
    else catalog.push({ id, why: `role: ${role}` });
  }

  const rejected: { id: string; nearest: string; reasons: string[] }[] = [];

  for (const id of order) {
    if (catalog.length >= catalogCap) break;
    if (catalog.some((c) => c.id === id)) continue;

    const m = byId.get(id)!;
    const sameFamily = catalog.filter((c) => byId.get(c.id)!.evidence.family === m.evidence.family).length;

    if (sameFamily >= familyCap) {
      rejected.push({ id, nearest: '', reasons: [`family ${m.evidence.family} already holds ${familyCap}`] });
      continue;
    }

    const dup = catalog
      .map((c) => ({ c, s: similarity(m.evidence, m.behaviour, byId.get(c.id)!.evidence, byId.get(c.id)!.behaviour) }))
      .find((x) => x.s.nearDuplicate);

    if (dup) {
      rejected.push({ id, nearest: dup.c.id, reasons: dup.s.reasons });
      continue;
    }

    catalog.push({ id, why: 'distinct qualified phenotype (centre-net order)' });
  }

  const neighbours = catalog.map((c) => {
    const m = byId.get(c.id)!;
    const others = catalog
      .filter((o) => o.id !== c.id)
      .map((o) => ({ id: o.id, s: similarity(m.evidence, m.behaviour, byId.get(o.id)!.evidence, byId.get(o.id)!.behaviour) }))
      .sort((x, y) => y.s.overlap - x.s.overlap || x.s.distance - y.s.distance);

    return { id: c.id, nearest: others[0]?.id ?? null, similarity: others[0]?.s ?? null };
  });

  return { qualified: q.map((m) => m.evidence.id), roles, primary, order, pareto, catalog, catalogRejected: rejected, catalogNeighbours: neighbours };
};
