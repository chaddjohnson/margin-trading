// One search lane of one family at one cutoff (PROTOCOL.md §11): Study 8's pipeline on the family's active genes —
// stratified scrambled-Sobol screen (6 protected cells: dip depth × lookback scale) → plausibility → protected
// promotion (¼ centre net, ¼ constrained rank, ½ cell round robin) → rung 1 (16 neighbours) → NSGA-II islands with the
// frozen extension policy → rung 2 (64) → rung 3 (128) → local refinement (profit and robust starts) → the lane
// shortlist (ledger de-duplication; profit, robust, balanced, then one per unrepresented cell, then centre net). The
// informed lane replaces the screen by its seeds and their near/broad Latin-hypercube designs. Every stage is a
// deterministic function of the seeds and of the evaluations it requests (the archive replays a resumed job).
import {
  type Ranked,
  hypervolume2d,
  polynomialMutation,
  sbx,
  selectSurvivors,
  tournament
} from '../optimizer/nsga2.ts';
import { Rng, deriveSeed } from '../optimizer/rng.ts';
import { rankOrder } from '../study8-expanded-regime-d1/search.ts';
import { type FamilyKey, execution, log, seedOf } from './context.ts';
import type { Rec, SettingsSpec } from './evaluate.ts';
import { type Nb, nbStats, objectivesOf, violationOf } from './fitness.ts';
import type { Lab } from './lab.ts';
import {
  type Candidate,
  type DesignFamily,
  cellOf,
  cells,
  designOf,
  distance,
  fillerOf,
  fromGenome,
  genomeOf,
  idOf,
  movesOf,
  operatorSpaceOf,
  screenOf
} from './space.ts';

export interface Budget {
  screenPerCell: number;
  r1Cap: number;
  islands: number;
  islandsMax: number;
  population: number;
  newPerIsland: number;
  generations: number;
  patience: number;
  r2Keep: number;
  r3Keep: number;
  refinePasses: number;
  shortlist: number;
  informedNear: number;
  informedBroad: number;
}

export const fidelity = { r1: 16, r2: 64, r3: 128, rf: 16 };
const ga = { crossoverProbability: 0.9, crossoverEta: 15, mutationEta: 20 };
const ceiling = execution.ceiling;

export interface LaneSpec {
  cutoff: string;
  lane: 'indep' | 'informed' | 'explore2';
  family: FamilyKey;
  settings: SettingsSpec;
  budget: Budget;
  seeds?: { id: string; candidate: Candidate }[];
}

export interface Fit {
  id: string;
  candidate: Candidate;
  cell: string;
  rung: 'screen' | 'r1' | 'r2' | 'r3' | 'rf';
  centre: Rec;
  nb: Nb | null;
  objectives: number[];
  violation: number;
  parts: Record<string, number>;
  genome: number[];
}

const byId = (a: { id: string }, b: { id: string }) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);

export const laneLabel = (spec: Pick<LaneSpec, 'cutoff' | 'lane' | 'family'>) => `${spec.cutoff}-${spec.lane}-${spec.family}`;

export const runLane = async (lab: Lab, spec: LaneSpec) => {
  const { family, budget, cutoff } = spec;
  const label = laneLabel(spec);
  const proposals = new Set<string>();
  const stageCounts: Record<string, { centres: number; neighbours: number; fresh: number; hits: number }> = {};
  const fits = new Map<string, Fit>(); // rung-1 archive (id → best-fidelity fit kept per rung below)
  const r2Fits = new Map<string, Fit>();
  const r3Fits = new Map<string, Fit>();
  const screenFits: Fit[] = [];
  let stage = '';
  let before = { ...lab.counters };
  const begin = (name: string) => {
    stage = name;
    before = { ...lab.counters };
    stageCounts[name] ??= { centres: 0, neighbours: 0, fresh: 0, hits: 0 };
  };
  const end = () => {
    const c = stageCounts[stage]!;

    c.fresh += lab.counters.fresh - before.fresh;
    c.hits += lab.counters.hits - before.hits;
    lab.checkpoint({ lane: label, stage, proposals: proposals.size });
  };
  const specOf = (c: Candidate) => ({ ruleSet: c.family, grid: c.grid, settings: spec.settings });
  const familyOf = (rung: 'r1' | 'r2' | 'r3' | 'rf'): DesignFamily => ({
    name: rung,
    n: fidelity[rung],
    labels: ['nbhd', rung, cutoff]
  });

  // Centres only (the screen and the informed designs).
  const centresOf = async (cands: Candidate[]) => {
    const recs = await lab.evaluate(cands.map(specOf));

    stageCounts[stage]!.centres += cands.length;

    return cands.map((c, n): Fit => {
      const { violation, parts } = violationOf(recs[n]!, null);

      return {
        id: idOf(c),
        candidate: c,
        cell: cellOf(c.grid),
        rung: 'screen',
        centre: recs[n]!,
        nb: null,
        objectives: [-recs[n]!.net, recs[n]!.dd],
        violation,
        parts,
        genome: genomeOf(c)
      };
    });
  };

  // Centres with their neighbourhood at a rung.
  const fitAt = async (cands: Candidate[], rung: 'r1' | 'r2' | 'r3' | 'rf') => {
    const fam = familyOf(rung);
    const designs = cands.map((c) => designOf(c, fam));
    const all = cands.flatMap((c, n) => [specOf(c), ...designs[n]!.draws.map((d) => specOf(d.candidate))]);
    const recs = await lab.evaluate(all);
    const out: Fit[] = [];
    let k = 0;

    stageCounts[stage]!.centres += cands.length;
    stageCounts[stage]!.neighbours += all.length - cands.length;

    cands.forEach((c, n) => {
      const centre = recs[k++]!;
      const draws = designs[n]!.draws.map(() => recs[k++]!);
      const nb = nbStats(centre, draws, designs[n]!.clipped, designs[n]!.duplicates);
      const { violation, parts } = violationOf(centre, nb);

      out.push({
        id: idOf(c),
        candidate: c,
        cell: cellOf(c.grid),
        rung,
        centre,
        nb,
        objectives: objectivesOf(centre, nb),
        violation,
        parts,
        genome: genomeOf(c)
      });
    });

    return out;
  };

  // Protected promotion: ¼ by centre net (feasible first), ¼ by constrained rank, the rest by cell round robin
  // (each cell's best by constrained rank), every pick at L∞ ≥ `distinct` from earlier picks.
  const promote = (pool: Fit[], cap: number, distinct: number, robustQuarter: boolean) => {
    const ranked = rankOrder(pool.map((f) => ({ ...f }))) as Fit[];
    const chosen: Fit[] = [];
    const taken = new Set<string>();
    const reasons: Record<string, string> = {};
    const tryPick = (f: Fit, why: string) => {
      if (taken.has(f.id) || chosen.length >= cap) return false;
      if (chosen.some((c) => distance(c.candidate, f.candidate) < distinct)) return false;

      chosen.push(f);
      taken.add(f.id);
      reasons[f.id] = why;
      return true;
    };
    const quarter = Math.ceil(cap / 4);
    const byNet = [...pool].sort((a, b) => Number(a.violation > 0) - Number(b.violation > 0) || b.centre.net - a.centre.net || byId(a, b));
    let got = 0;

    for (const f of byNet) if (got < quarter && tryPick(f, 'centre net')) got++;

    got = 0;

    if (robustQuarter) {
      const byRobust = pool
        .filter((f) => f.violation === 0 && f.nb)
        .sort((a, b) => b.nb!.robust - a.nb!.robust || byId(a, b));

      for (const f of byRobust) if (got < quarter && tryPick(f, 'robust net')) got++;
    }

    for (const f of ranked) if (got < quarter && tryPick(f, 'constrained rank')) got++;

    const perCell = new Map<string, Fit[]>();

    for (const f of ranked) {
      const list = perCell.get(f.cell) ?? [];

      list.push(f);
      perCell.set(f.cell, list);
    }

    const cursors = new Map<string, number>();
    let progress = true;

    while (chosen.length < cap && progress) {
      progress = false;

      for (const cell of cells) {
        const list = perCell.get(cell.key) ?? [];
        let at = cursors.get(cell.key) ?? 0;

        while (at < list.length && !tryPick(list[at]!, `cell ${cell.key}`)) at++;
        if (at < list.length) progress = true;
        cursors.set(cell.key, at + 1);
        if (chosen.length >= cap) break;
      }
    }

    return { chosen, reasons };
  };

  // 1. Proposals.
  begin('proposals');

  let promoted: Fit[] = [];
  let seedIds: string[] = [];

  if (spec.lane === 'informed') {
    const seeds = spec.seeds ?? [];
    const cands: Candidate[] = [];

    for (const s of seeds) {
      cands.push(s.candidate);
      for (const d of designOf(s.candidate, { name: 'near', n: budget.informedNear, labels: ['informed', 'near', s.id, cutoff], scale: 1.5 }).draws)
        cands.push(d.candidate);
      for (const d of designOf(s.candidate, { name: 'broad', n: budget.informedBroad, labels: ['informed', 'broad', s.id, cutoff], scale: 3 }).draws)
        cands.push(d.candidate);
    }

    const unique = [...new Map(cands.map((c) => [idOf(c), c])).values()];

    unique.forEach((c) => proposals.add(idOf(c)));
    screenFits.push(...(await centresOf(unique)));
    seedIds = [...new Set(seeds.map((s) => idOf(s.candidate)))];

    const seedFits = screenFits.filter((f) => seedIds.includes(f.id));
    const rest = promote(screenFits.filter((f) => !seedIds.includes(f.id)), budget.r1Cap - seedFits.length, 0.02, false);

    promoted = [...seedFits, ...rest.chosen];
  } else {
    const screen = screenOf(family, budget.screenPerCell, ['screen', spec.lane, family, cutoff]);

    screen.points.forEach((p) => proposals.add(idOf(p.candidate)));
    screenFits.push(...(await centresOf(screen.points.map((p) => p.candidate))));
    promoted = promote(screenFits, budget.r1Cap, 0.02, false).chosen;
  }

  end();

  const plausible = (f: Fit) => f.centre.net > 0 && f.centre.dd <= ceiling && f.centre.lots > 0;

  // 2. Rung 1.
  begin('r1');
  for (const f of await fitAt(promoted.map((f) => f.candidate), 'r1')) fits.set(f.id, f);
  end();

  // 3. NSGA-II islands with the extension policy.
  const space = operatorSpaceOf(family);
  const hvOf = (list: Fit[]) =>
    hypervolume2d(
      list.filter((f) => f.nb).map((f) => ({ id: f.id, genome: f.genome, objectives: [-f.nb!.robust, f.nb!.p90Dd], violation: f.violation })),
      [0, ceiling]
    );
  const bestOf = (list: Fit[], key: (f: Fit) => number) =>
    list.filter((f) => f.violation === 0).reduce((m, f) => Math.max(m, key(f)), -Infinity);
  const feasibleCells = (list: Fit[]) => new Set(list.filter((f) => f.violation === 0).map((f) => f.cell));
  const islandLog: Record<string, unknown>[] = [];
  let fillerCount = 0;

  const runIsland = async (k: number, extension: boolean) => {
    begin(`island${k}`);

    const rng = new Rng(deriveSeed(...seedOf('ga', spec.lane, family, cutoff, k)));
    const archive = [...fits.values()];
    const hvBefore = hvOf(archive);
    const robustBefore = bestOf(archive, (f) => f.nb!.robust);
    const netBefore = bestOf(archive, (f) => f.centre.net);
    const cellsBefore = feasibleCells(archive);
    const evalBefore = lab.counters.requested;
    const ordered = rankOrder(archive.map((f) => ({ ...f }))) as Fit[];
    const islands = extension ? 1 : budget.islands;
    let population = extension ? ordered.slice(0, budget.population) : ordered.filter((_f, n) => n % islands === k).slice(0, budget.population);

    if (population.length < budget.population) {
      const need = budget.population - population.length;
      const fill: Candidate[] = [];

      for (let n = 0; n < need; n++) {
        const cell = cells[(fillerCount + n) % cells.length]!.key;

        fill.push(fillerOf(family, cell, 1, ['fill', spec.lane, family, cutoff, k, n])[0]!);
      }

      fillerCount += need;

      const fresh = [...new Map(fill.map((c) => [idOf(c), c])).values()].filter((c) => !fits.has(idOf(c)));

      fresh.forEach((c) => proposals.add(idOf(c)));
      for (const f of await fitAt(fresh, 'r1')) fits.set(f.id, f);
      population = [...population, ...fill.map((c) => fits.get(idOf(c))!)].filter(
        (f, n, a) => a.findIndex((g) => g.id === f.id) === n
      );
    }

    let ranked: Ranked<Fit>[] = selectSurvivors(population, budget.population);
    let generation = 0;
    let newCount = 0;
    let stagnant = 0;
    let idle = 0;
    let lastHv = hvOf(population);
    let lastNet = bestOf(population, (f) => f.centre.net);
    let reason = 'budget';

    while (newCount < budget.newPerIsland) {
      if (generation >= budget.generations) {
        reason = 'generation cap';
        break;
      }

      generation++;

      const children: Candidate[] = [];

      while (children.length < budget.population) {
        const a = tournament(ranked, rng).member;
        const b = tournament(ranked, rng).member;
        const { children: pair } = sbx(space, a.genome, b.genome, rng, ga);

        for (const g of pair) {
          const m = polynomialMutation(space, g, rng, ga);

          children.push(fromGenome(family, m.genome));
        }
      }

      const fresh = [...new Map(children.map((c) => [idOf(c), c])).values()].filter((c) => !fits.has(idOf(c)));
      const allowed = fresh.slice(0, budget.newPerIsland - newCount);

      allowed.forEach((c) => proposals.add(idOf(c)));
      newCount += allowed.length;
      for (const f of await fitAt(allowed, 'r1')) fits.set(f.id, f);

      const offspring = children.map((c) => fits.get(idOf(c))).filter((f): f is Fit => Boolean(f));
      const union = [...new Map([...ranked.map((r) => r.member), ...offspring].map((f) => [f.id, f])).values()];

      ranked = selectSurvivors(union, budget.population);

      const pop = ranked.map((r) => r.member);
      const hv = hvOf(pop);
      const net = bestOf(pop, (f) => f.centre.net);
      const gained = hv > lastHv * (1 + 1e-3) + 1e-9 || (net > lastNet + Math.abs(lastNet) * 1e-3 && Number.isFinite(net));

      stagnant = gained ? 0 : stagnant + 1;
      idle = allowed.length === 0 ? idle + 1 : 0;
      lastHv = Math.max(lastHv, hv);
      lastNet = Math.max(lastNet, net);

      if (stagnant >= budget.patience) {
        reason = 'stagnation';
        break;
      }

      if (idle >= 3) {
        reason = 'no new configurations';
        break;
      }
    }

    const after = [...fits.values()];
    const hvAfter = hvOf(after);
    const evaluations = lab.counters.requested - evalBefore;
    const entry = {
      island: k,
      extension,
      generations: generation,
      proposals: newCount,
      evaluations,
      stop: reason,
      hvBefore,
      hvAfter,
      hvGainPer10k: evaluations ? ((hvAfter - hvBefore) / evaluations) * 10000 : 0,
      robustBefore,
      robustAfter: bestOf(after, (f) => f.nb!.robust),
      netBefore,
      netAfter: bestOf(after, (f) => f.centre.net),
      newFeasibleCells: [...feasibleCells(after)].filter((c) => !cellsBefore.has(c))
    };

    islandLog.push(entry);
    end();
    log(`${label} island ${k}${extension ? ' (extension)' : ''}: ${newCount} new, ${generation} generations, ${reason}; hv ${hvBefore.toFixed(0)} → ${hvAfter.toFixed(0)}; best net ${entry.netAfter.toFixed(0)}`);
    return entry;
  };

  for (let k = 0; k < budget.islands; k++) await runIsland(k, false);

  // The extension policy (frozen): after the base islands, and after every extension island, one more island runs (up
  // to the cap) iff the last island raised the lane's union hypervolume of (−robust, p90 DD) against (0, ceiling), its
  // best feasible rung-1 robust net or its best feasible rung-1 centre net by more than 5%, or made a cell feasible
  // that was not feasible before it.
  const rel = (a: number, b: number) => (Number.isFinite(b) && b > 0 ? (a - b) / b : a > 0 && Number.isFinite(a) ? Infinity : 0);
  const triggered = (e: Awaited<ReturnType<typeof runIsland>>) =>
    rel(e.hvAfter, e.hvBefore) > 0.05 ||
    rel(e.robustAfter, e.robustBefore) > 0.05 ||
    rel(e.netAfter, e.netBefore) > 0.05 ||
    e.newFeasibleCells.length > 0;
  let extensionStop = budget.islandsMax > budget.islands ? 'extension cap reached' : 'no extension allowed';
  let islandIndex = budget.islands;
  let last = islandLog.at(-1) as Awaited<ReturnType<typeof runIsland>> | undefined;

  while (last && islandIndex < budget.islandsMax) {
    if (!triggered(last)) {
      extensionStop = 'triggers not met';
      break;
    }

    last = await runIsland(islandIndex++, true);
  }

  // 4. Rungs 2 and 3.
  begin('r2');

  const r2Pick = promote([...fits.values()], budget.r2Keep, 0.02, true);

  for (const f of await fitAt(r2Pick.chosen.map((f) => f.candidate), 'r2')) r2Fits.set(f.id, f);
  end();
  begin('r3');

  const r3Pick = promote([...r2Fits.values()], budget.r3Keep, 0.03, true);

  for (const f of await fitAt(r3Pick.chosen.map((f) => f.candidate), 'r3')) r3Fits.set(f.id, f);
  end();

  // 5. Refinement: the profit start (highest feasible rung-3 centre net) and the robust start (highest feasible rung-3
  // robust net); ≤ passes over every active gene ±⌈r/2⌉, ±r at fidelity 16; a move is accepted when feasible and it
  // raises the start's criterion by ≥ $1,000 (from an infeasible start: the move lowering the violation most, by
  // ≥ 0.01). Endpoints are re-fitted at rung 3.
  begin('refine');

  const r3List = [...r3Fits.values()];
  const feasible3 = r3List.filter((f) => f.violation === 0);
  const starts: { kind: 'profit' | 'robust'; fit: Fit }[] = [];

  if (feasible3.length) {
    starts.push({ kind: 'profit', fit: [...feasible3].sort((a, b) => b.centre.net - a.centre.net || byId(a, b))[0]! });
    starts.push({ kind: 'robust', fit: [...feasible3].sort((a, b) => b.nb!.robust - a.nb!.robust || byId(a, b))[0]! });
  } else if (r3List.length) {
    starts.push({ kind: 'profit', fit: [...r3List].sort((a, b) => a.violation - b.violation || byId(a, b))[0]! });
  }

  const refineLog: Record<string, unknown>[] = [];
  const endpoints: Candidate[] = [];

  for (const st of starts) {
    let [current] = await fitAt([st.fit.candidate], 'rf');
    const path = [current!.id];

    for (let pass = 0; pass < budget.refinePasses; pass++) {
      const moves = movesOf(current!.candidate);

      moves.forEach((m) => proposals.add(idOf(m.candidate)));

      const moved = await fitAt(moves.map((m) => m.candidate), 'rf');
      const score = (f: Fit) => (st.kind === 'profit' ? f.centre.net : f.nb!.robust);
      let next: Fit | undefined;

      if (current!.violation === 0) {
        next = moved
          .filter((f) => f.violation === 0 && score(f) >= score(current!) + 1000)
          .sort((a, b) => score(b) - score(a) || byId(a, b))[0];
      } else {
        next = moved.filter((f) => f.violation <= current!.violation - 0.01).sort((a, b) => a.violation - b.violation || byId(a, b))[0];
      }

      if (!next) break;

      current = next;
      path.push(current.id);
    }

    endpoints.push(current!.candidate);
    refineLog.push({ kind: st.kind, start: st.fit.id, path, end: current!.id });
  }

  for (const f of await fitAt(endpoints.filter((c) => !r3Fits.has(idOf(c))), 'r3')) r3Fits.set(f.id, f);
  end();

  // 6. The lane shortlist (feasible rung-3 fits, one per ledger signature, picks at L∞ ≥ 0.10).
  const finalFits = [...r3Fits.values()];
  const bySig = new Map<string, Fit>();

  for (const f of finalFits.filter((f) => f.violation === 0).sort((a, b) => b.centre.net - a.centre.net || byId(a, b)))
    if (!bySig.has(f.centre.sig)) bySig.set(f.centre.sig, f);

  const pool = [...bySig.values()];
  const shortlist: { fit: Fit; slot: string }[] = [];
  const pick = (f: Fit | undefined, slot: string) => {
    if (!f || shortlist.length >= budget.shortlist) return;
    if (shortlist.some((s) => s.fit.id === f.id || distance(s.fit.candidate, f.candidate) < 0.1)) return;

    shortlist.push({ fit: f, slot });
  };

  pick([...pool].sort((a, b) => b.centre.net - a.centre.net || byId(a, b))[0], 'profit');
  pick([...pool].sort((a, b) => b.nb!.robust - a.nb!.robust || byId(a, b))[0], 'robust');
  pick(
    [...pool].sort((a, b) => b.nb!.robust / Math.max(b.nb!.p90Dd, 1) - a.nb!.robust / Math.max(a.nb!.p90Dd, 1) || byId(a, b))[0],
    'balanced'
  );

  for (const f of [...pool].sort((a, b) => b.centre.net - a.centre.net || byId(a, b)))
    if (!shortlist.some((s) => s.fit.cell === f.cell)) pick(f, `cell ${f.cell}`);

  for (const f of [...pool].sort((a, b) => b.centre.net - a.centre.net || byId(a, b))) pick(f, 'centre net');

  const infeasible = finalFits
    .filter((f) => f.violation > 0)
    .sort((a, b) => b.centre.net - a.centre.net || byId(a, b))
    .slice(0, 5);

  // Coverage per cell (standard §4.3).
  const coverage = cells.map((cell) => {
    const inCell = (f: Fit) => f.cell === cell.key;
    const r1 = [...fits.values()].filter(inCell);

    return {
      cell: cell.key,
      screened: screenFits.filter(inCell).length,
      plausible: screenFits.filter((f) => inCell(f) && plausible(f)).length,
      promoted: promoted.filter(inCell).length,
      r1: r1.length,
      r1Feasible: r1.filter((f) => f.violation === 0).length,
      r2: [...r2Fits.values()].filter(inCell).length,
      r3: finalFits.filter(inCell).length,
      r3Feasible: finalFits.filter((f) => inCell(f) && f.violation === 0).length,
      shortlisted: shortlist.filter((s) => inCell(s.fit)).length
    };
  });
  const r1All = [...fits.values()];

  return {
    lane: label,
    cutoff,
    laneKind: spec.lane,
    family,
    settings: spec.settings,
    budget,
    seeds: seedIds,
    counts: {
      distinctProposals: proposals.size,
      screened: screenFits.length,
      plausible: screenFits.filter(plausible).length,
      promoted: promoted.length,
      r1Fitted: r1All.length,
      r1Feasible: r1All.filter((f) => f.violation === 0).length,
      r1DistinctLedgers: new Set(r1All.map((f) => f.centre.sig)).size,
      r1ZeroTrade: r1All.filter((f) => f.centre.lots === 0).length,
      r2Fitted: r2Fits.size,
      r2Feasible: [...r2Fits.values()].filter((f) => f.violation === 0).length,
      r3Fitted: finalFits.length,
      r3Feasible: finalFits.filter((f) => f.violation === 0).length,
      r3FeasibleLedgers: pool.length,
      shortlist: shortlist.length
    },
    stages: stageCounts,
    islands: islandLog,
    extensionStop,
    hypervolume: hvOf(r1All),
    refinement: refineLog,
    coverage,
    shortlist: shortlist.map((s) => ({ slot: s.slot, ...compact(s.fit) })),
    infeasibleDiagnostics: infeasible.map(compact),
    r3: finalFits.map(compact)
  };
};

export const compact = (f: Fit) => ({
  id: f.id,
  family: f.candidate.family,
  grid: f.candidate.grid,
  cell: f.cell,
  rung: f.rung,
  violation: f.violation,
  parts: f.parts,
  centre: f.centre,
  nb: f.nb
});

export type LaneResult = Awaited<ReturnType<typeof runLane>>;
