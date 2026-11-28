// The finalists and the precommitted successor determination (PROTOCOL.md §12; brief §7 "Define material improvement and
// uncertainty criteria before optimization"). Pure functions of sealed evidence: no evaluation, no validation input
// before `outcomeOf`.
//
// FINALISTS (C24): the primary of every population (F, L, B, N, U) under NL0's original rule; NL0's four roles of F, N
// and U; the best qualified member (centre net) of every D1 family pair in Track F and in Track N (structural diversity);
// each with its ledger signature so that behaviourally identical finalists are reported as equivalent.
//
// A finalist X (never an incumbent or a control) is a SUCCESSOR WORTHY OF CONSIDERATION iff, against N/original's own
// C24 evidence (the same instrument, the same draws):
//   (a) X passes Q1–Q6 at C24;
//   (b) N/original does not dominate X on (centre net, centre DD) nor on (confirmation p10, confirmation p90 DD);
//   (c) a MATERIAL improvement of one type:
//       P (profit)  centre net ≥ N/original's + $10,000 AND confirmation robust net (½ median + ½ p10 of the 384 draws)
//                   ≥ N/original's + $5,000, with centre DD ≤ N/original's + $2,500 and confirmation p90 DD ≤
//                   N/original's + $2,500 (risk non-inferior);
//       R (risk)    confirmation p90 DD ≤ N/original's − $2,500 AND centre DD ≤ N/original's + $2,500, with centre net ≥
//                   N/original's − $2,500 and confirmation robust net ≥ N/original's − $2,500 (profit non-inferior);
//   (d) REPLICATED: at least two lanes of X's track with different replicate numbers (independent seed streams) contain
//       a qualified member meeting (b) and (c) with the same type;
//   (e) V1–V3 pass on FULL (2025-01-02 → 2026-10-30, previously examined history; evaluated once, after the freeze).
// Its support label: Track F — the sealed verdict of the F/original procedure with the standard §1.8 consequence; Track
// N — "incumbent-informed; no independent chronological test" with the same consequence. A successor worthy of
// consideration is a research nomination for the user's review only: never adoption or deployment.
import type { Evidence } from './qualify.ts';
import { originalOrder } from './select.ts';

export const material = { profitNet: 10_000, profitRobust: 5_000, nonInferior: 2_500, risk: 2_500 } as const;

export interface Finalist {
  label: string;
  id: string;
  track: string;
  stage: string;
  lane: string;
  replicate: number | null;
  cell: string;
  pair: string;
  signature: string;
  why: string[];
}

const pick = (e: Evidence): Finalist => ({
  label: e.label,
  id: e.id,
  track: e.track,
  stage: e.stage,
  lane: e.lane,
  replicate: e.replicate,
  cell: e.cell,
  pair: e.pair,
  signature: e.centre.signature,
  why: []
});

export const finalistsOf = (
  candidates: readonly Evidence[],
  primaries: Record<string, string | null>,
  roles: Record<string, { roles: Record<string, string | null> }>
) => {
  const out = new Map<string, Finalist>();
  const byLabel = new Map(candidates.map((e) => [e.label, e]));
  const add = (label: string | null | undefined, why: string) => {
    if (!label) return;

    const e = byLabel.get(label)!;
    const f = out.get(e.label) ?? pick(e);

    f.why.push(why);
    out.set(e.label, f);
  };

  for (const [p, l] of Object.entries(primaries)) add(l, `C24 primary ${p}/original`);
  for (const p of ['F', 'N', 'U']) for (const [role, l] of Object.entries(roles[p]?.roles ?? {})) add(l, `C24 role ${p}/${role}`);
  for (const track of ['F', 'N'] as const) {
    const pairs = [...new Set(candidates.filter((e) => e.track === track).map((e) => e.pair))].sort();

    for (const pair of pairs) {
      const best = originalOrder(candidates.filter((e) => e.track === track && e.pair === pair && e.stage !== 'incumbent'))[0];

      if (best?.qualified) add(best.label, `structurally distinct finalist: Track ${track}'s best qualified centre net in family pair ${pair}`);
    }
  }

  const list = [...out.values()];
  const bySig = new Map<string, string[]>();

  for (const f of list) bySig.set(f.signature, [...(bySig.get(f.signature) ?? []), f.label]);
  return list.map((f) => ({ ...f, ledgerEquivalent: (bySig.get(f.signature) ?? []).filter((l) => l !== f.label) }));
};

const dominates = (a: [number, number], b: [number, number]) => a[0] >= b[0] && a[1] <= b[1] && (a[0] > b[0] || a[1] < b[1]);
const robustOfConfirm = (e: Evidence) => 0.5 * e.confirm.median + 0.5 * e.confirm.p10;

export const criteriaOf = (x: Evidence, n: Evidence) => {
  const dominatedCentre = dominates([n.centre.net, n.centre.dd], [x.centre.net, x.centre.dd]);
  const dominatedConfirm = dominates([n.confirm.p10, n.confirm.p90Dd], [x.confirm.p10, x.confirm.p90Dd]);
  const d = {
    centreNet: x.centre.net - n.centre.net,
    centreDd: x.centre.dd - n.centre.dd,
    confirmRobust: robustOfConfirm(x) - robustOfConfirm(n),
    confirmP90Dd: x.confirm.p90Dd - n.confirm.p90Dd,
    confirmP10: x.confirm.p10 - n.confirm.p10
  };
  const P = d.centreNet >= material.profitNet && d.confirmRobust >= material.profitRobust && d.centreDd <= material.nonInferior && d.confirmP90Dd <= material.nonInferior;
  const R = d.confirmP90Dd <= -material.risk && d.centreDd <= material.nonInferior && d.centreNet >= -material.nonInferior && d.confirmRobust >= -material.nonInferior;

  return {
    a: x.qualified,
    b: !dominatedCentre && !dominatedConfirm,
    dominated: { centre: dominatedCentre, confirmation: dominatedConfirm },
    deltas: d,
    types: [...(P ? ['P'] : []), ...(R ? ['R'] : [])] as ('P' | 'R')[]
  };
};

export const successorPreDetermination = (
  finalists: readonly (Finalist & { ledgerEquivalent: string[] })[],
  candidates: readonly Evidence[],
  controls: readonly Evidence[],
  sequential: { procedures: { population: string; verdict: string; supported: boolean }[] }
) => {
  const n = controls.find((c) => c.label === 'control: N/original');

  if (!n) throw new Error('the C24 control evidence of N/original is missing');

  const fVerdict = sequential.procedures.find((p) => p.population === 'F')!;
  const consequence = 'no chronological support: the selection is not a deployment-qualified candidate without an explicit user decision';
  const meets = (e: Evidence, type: 'P' | 'R') => {
    const c = criteriaOf(e, n);

    return c.a && c.b && c.types.includes(type);
  };
  const rows = finalists
    .filter((f) => f.stage !== 'incumbent' && f.track !== 'control')
    .map((f) => {
      const x = candidates.find((e) => e.label === f.label)!;
      const c = criteriaOf(x, n);
      const replication = Object.fromEntries(
        (['P', 'R'] as const).map((type) => {
          const lanes = candidates.filter((e) => e.track === x.track && e.stage !== 'incumbent' && meets(e, type));
          const reps = [...new Set(lanes.map((e) => e.replicate).filter((r): r is number => r !== null))].sort((a, b) => a - b);

          return [type, { members: lanes.length, lanes: [...new Set(lanes.map((e) => e.lane))].length, replicates: reps }];
        })
      ) as Record<'P' | 'R', { members: number; lanes: number; replicates: number[] }>;
      const d = c.types.some((t) => replication[t].replicates.length >= 2);

      return {
        label: f.label,
        id: f.id,
        track: f.track,
        why: f.why,
        ledgerEquivalent: f.ledgerEquivalent,
        criteria: { ...c, d, replication },
        preValidation: c.a && c.b && c.types.length > 0 && d,
        support:
          f.track === 'F'
            ? `independent procedure F/original: ${fVerdict.verdict}${fVerdict.supported ? '' : ` — ${consequence}`}`
            : `incumbent-informed; no independent chronological test — ${consequence}`
      };
    });

  return {
    reference: { label: n.label, id: n.id, centreNet: n.centre.net, centreDd: n.centre.dd, confirmRobust: robustOfConfirm(n), confirmP10: n.confirm.p10, confirmP90Dd: n.confirm.p90Dd },
    material,
    rows,
    preValidationCandidates: rows.filter((r) => r.preValidation).map((r) => r.label)
  };
};

export const outcomeOf = (
  pre: ReturnType<typeof successorPreDetermination>,
  validation: readonly { label: string; id: string; validation?: { V1: boolean; V2: boolean; V3: boolean } }[]
) => {
  const vOf = (id: string) => validation.find((r) => r.id === id)?.validation ?? null;
  const rows = pre.rows.map((r) => {
    const v = vOf(r.id);
    const e = Boolean(v && v.V1 && v.V2 && v.V3);

    return { ...r, validation: v, e, worthy: r.preValidation && e };
  });
  const worthy = rows.filter((r) => r.worthy);
  const nOriginal = vOf(pre.reference.id);

  return {
    rows,
    worthy: worthy.map((r) => ({ label: r.label, track: r.track, types: r.criteria.types, support: r.support })),
    nOriginalValidation: nOriginal,
    label: worthy.length
      ? 'SUCCESSOR WORTHY OF CONSIDERATION (research nomination for the user’s review only; no adoption, no deployment)'
      : 'NO MATERIAL IMPROVEMENT: keep N/original as the preferred research incumbent and New L0 as the frozen benchmark',
    rule: 'PROTOCOL.md §12 (a)–(e), frozen before any search; validation adds (e) only and never changes a rank, a role or a candidate'
  };
};
