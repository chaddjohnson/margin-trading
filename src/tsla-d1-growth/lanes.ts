// The lanes of one official job and their extension (PROTOCOL.md §7.5): Priority 5's lanes.ts (Stage B's barrier loop
// over the lane) with this study's derived lane (search.ts) and the job's ARM (P0 with the arm's families and options;
// one arm per job), and Priority 5's two-tier island rule:
//   - up to NL0's cap (6 broad, 8 refine / informed) a lane extends iff NL0's trigger fired on its last island (any
//     component), exactly as NL0 1.0.0 and Assignment 3;
//   - beyond NL0's cap, up to the island cap (16), it extends iff a PERFORMANCE component fired (hypervolume, best robust
//     or best centre net > 5 %).
// The components are recomputed from the last island's full-precision before/after states with the lane's own formula
// and checked against the lane's own `fired` flag (a mismatch stops the job). Each lane's decision depends only on its
// own state, so a lane's result is independent of the job that groups it (Stage B BA4); the job cap is the sum of the
// lanes' deterministic bounds, so the resource guard (kept) cannot bind before a lane's own cap.
import { hypervolume2d } from '../optimizer/nsga2.ts';
import type { EvalLab } from '../gpu-backend/lab.ts';
import { type Budget, Lane, type IslandLog, type LaneResult, type LaneSpec } from './search.ts';
import { p90Of, robustOf } from '../vg-l0-full-joint/fitness.ts';
import { type TslaArm, ceiling } from './context.ts';
import { type Kind, islandCaps, laneCaps, nl0Caps, schedules } from './budget.ts';

export const stopReasons = {
  converged: 'triggers not met',
  classOnly: "class trigger only beyond NL0's cap (coverage-limited: performance converged by NL0's 5 % rule; feasible behaviour classes still growing)",
  capped: 'extension cap reached (a performance trigger still fired: budget-bound, not converged)',
  guard: 'resource guard (the job cap on requested evaluations)'
} as const;

const gain = (x: number, y: number) => (Number.isFinite(x) && x > 0 ? (y - x) / x : y > 0 ? Infinity : 0);

export const triggerParts = (lane: Lane) => {
  const isl = (lane as unknown as { islands: IslandLog[] }).islands.at(-1);

  if (!isl) throw new Error(`${lane.spec.key}: no island`);

  const b = lane.b;
  const parts = {
    island: isl.index,
    hypervolume: gain(isl.before.hv, isl.after.hv),
    robust: gain(isl.before.robust, isl.after.robust),
    net: gain(isl.before.net, isl.after.net),
    newClasses: isl.after.classes - isl.before.classes
  };
  const perf = parts.hypervolume > b.extension || parts.robust > b.extension || parts.net > b.extension;
  const cls = parts.newClasses > 0;
  const fired = lane.lastTrigger?.fired ?? false;

  if (fired !== (perf || cls) || lane.lastTrigger?.island !== isl.index)
    throw new Error(`${lane.spec.key}: the recomputed trigger (${JSON.stringify(parts)}) differs from the lane's own decision`);
  return { ...parts, perf, cls, fired };
};

// the two-tier rule (PROTOCOL.md §7.5) as a pure function: null = extend; otherwise the lane's stop reason
export const extensionDecision = (t: { fired: boolean; perf: boolean }, islandsRun: number, nl0Cap: number, cap: number): string | null => {
  if (!t.fired) return stopReasons.converged;
  if (islandsRun >= cap) return t.perf ? stopReasons.capped : stopReasons.classOnly;
  if (islandsRun >= nl0Cap && !t.perf) return stopReasons.classOnly;
  return null;
};

export interface RoundRow {
  round: number;
  requestedBefore: number;
  worstCase: number;
  decision: string;
  positions: { position: string; islands: number; perf: boolean; cls: boolean; extended: boolean; stop: string | null }[];
}

// `override` is for NON-OFFICIAL engineering tools only (the Assignment 3 reproduction gate E3 runs Assignment 3's own
// schedule with NL0's cap; the determinism gate E5 a mini schedule); official stages never pass it
export interface LaneOverride {
  schedule: Budget;
  laneCap: number;
  nl0Cap: number;
}

export const runLanes = async (lab: EvalLab, arm: TslaArm, specs: readonly LaneSpec[], kind: Kind, stageName: string, override?: LaneOverride) => {
  const b = override?.schedule ?? schedules[kind];
  const laneCap = override?.laneCap ?? laneCaps[kind];
  const nl0Cap = override?.nl0Cap ?? nl0Caps[kind];
  for (const s of specs) if (s.cell?.arm !== arm.study) throw new Error(`${s.key}: a lane of arm ${s.cell?.arm} in a job of arm ${arm.study}`);
  const lanes = specs.map((spec) => new Lane(lab, spec, b, arm, laneCap));
  const cap = lanes.length * laneCap;
  const requested = () => lanes.reduce((a, l) => a + l.requested, 0);
  const rounds: RoundRow[] = [];
  const stops = new Map<string, string>();

  if (!override && b.islandsMax !== islandCaps[kind]) throw new Error('the schedule cap differs from the frozen island cap');
  lab.stage = `${stageName}: base (${lanes.length} lanes)`;
  await Promise.all(lanes.map((l) => l.base()));

  for (let round = 1; ; round++) {
    const live = lanes.filter((l) => !stops.has(l.spec.position));

    if (!live.length) break;

    const row: RoundRow = { round, requestedBefore: requested(), worstCase: 0, decision: '', positions: [] };
    const go: Lane[] = [];

    for (const l of live) {
      const t = triggerParts(l);
      const n = l.islandsRun;
      const stop = extensionDecision(t, n, nl0Cap, b.islandsMax);

      if (stop) stops.set(l.spec.position, stop);
      else go.push(l);
      row.positions.push({ position: l.spec.position, islands: n, perf: t.perf, cls: t.cls, extended: !stop, stop });
    }

    row.worstCase = go.reduce((a, l) => a + l.islandWorstCase, 0);
    if (go.length && requested() + row.worstCase > cap) {
      for (const l of go) stops.set(l.spec.position, stopReasons.guard);
      row.decision = `resource guard: ${requested()} requested + worst case ${row.worstCase} > cap ${cap}`;
      rounds.push(row);
      break;
    }
    row.decision = go.length ? `extend ${go.length} lane(s)` : 'no lane extends';
    rounds.push(row);
    if (!go.length) break;
    lab.stage = `${stageName}: extension round ${round} (${go.length} lanes)`;
    lab.checkpoint({ [`extension ${stageName}`]: { round, extending: go.map((l) => l.spec.key) } });
    await Promise.all(go.map((l) => l.extend()));
  }

  lab.stage = `${stageName}: finishing`;

  const results = await Promise.all(lanes.map((l) => l.finish(stops.get(l.spec.position) ?? stopReasons.converged)));

  for (const r of results) if (r.requested > laneCap) throw new Error(`${r.key}: ${r.requested} requested > the lane bound ${laneCap}`);
  return { results, rounds, cap };
};

// ----- the replicate rounds (PROTOCOL.md §7.5 tier 2): the union state of an arm's lanes at a cutoff -----

export interface UnionState {
  points: number;
  hv: number;
  robust: number;
  net: number;
  structures: string[]; // the cells with a feasible rung-3 / shortlist fit
}

export const unionState = (lanes: readonly LaneResult[]): UnionState => {
  const pts = new Map<string, { robust: number; p90: number; net: number }>();
  const structures = new Set<string>();

  for (const l of lanes) {
    for (const f of l.r3) if (f.feasible) pts.set(f.id, { robust: f.robust, p90: f.p90, net: f.net });
    for (const p of l.shortlist) {
      if (p.violation !== 0) continue;
      pts.set(p.id, { robust: robustOf(p), p90: p90Of(p), net: p.centre.net });
      structures.add(l.structure);
    }
    if (l.r3.some((f) => f.feasible)) structures.add(l.structure);
  }

  const list = [...pts.entries()];

  return {
    points: list.length,
    hv: hypervolume2d(
      list.map(([id, x]) => ({ id, genome: [], violation: 0, objectives: [-x.robust, x.p90] })),
      [0, ceiling]
    ),
    robust: list.length ? Math.max(...list.map(([, x]) => x.robust)) : -Infinity,
    net: list.length ? Math.max(...list.map(([, x]) => x.net)) : -Infinity,
    structures: [...structures].sort()
  };
};

export const roundTrigger = (before: UnionState, after: UnionState, threshold: number) => {
  const parts = {
    hypervolume: gain(before.hv, after.hv),
    robust: gain(before.robust, after.robust),
    net: gain(before.net, after.net),
    newStructures: after.structures.filter((s) => !before.structures.includes(s))
  };
  const fired = parts.hypervolume > threshold || parts.robust > threshold || parts.net > threshold || parts.newStructures.length > 0;

  return { ...parts, fired };
};
