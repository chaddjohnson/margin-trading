// The searches (PROTOCOL.md §11). One lane = one proposal source over one protected stratum:
//
// - indep (arm D, independent four-component discovery): a cell (Growth·GDX entry × Growth·VGT entry). A Latin
//   supercube Sobol screen of the whole genome (coarse Growth grid, D1's integer grid) with the cell's entries pinned and
//   the four gate pairs round-robin → promotion (¼ centre net, ¼ constrained rank on (−net, DD), ½ max-min diversity)
//   → rung 1 (16 neighbours) → NSGA-II islands on (−centre net, −robust net, p90 DD) with the frozen extension rule →
//   rung 2 (64) → rung 3 (128) → refinement (a robust start and a profit start) → the cell shortlist. No incumbent,
//   control or archive vector.
// - gpair (arm B, the Growth pair): the same machinery with D1 disabled (the D1 genes and the priority pinned).
// - informed (arm C, four-component joint refinement): the declared seeds (unchanged combined controls and the staged
//   combinations) → near (scale 1.5) and broad (scale 3) Latin-hypercube designs on the fine grid → rung 1 → NSGA-II
//   islands with every gene free (structure included) → rungs → refinement → shortlist.
//
// Every stage is a deterministic function of its seed labels and of the evaluations it requests; with the archive this
// makes a rerun an exact replay (lab.ts).
import {
  type Ranked,
  type Scored,
  hypervolume2d,
  polynomialMutation,
  sbx,
  selectSurvivors,
  tournament
} from '../optimizer/nsga2.ts';
import type { ParameterSpace } from '../optimizer/params.ts';
import { Rng } from '../optimizer/rng.ts';
import { rankOrder } from '../study8-expanded-regime-d1/search.ts';
import { type Sym, economics, log, seedOf, symbols } from './context.ts';
import type { D1Grid } from './books.ts';
import type { EvalOptions, Rec } from './evaluate.ts';
import { type Fit, type Need, bandedOrder, fitOf, nbStats, structureOk } from './fitness.ts';
import type { Lab } from './lab.ts';
import {
  type CellKey,
  type Genome,
  type Quad,
  type Resolution,
  type Scope,
  catLevels,
  cellName,
  classKey,
  d1Box,
  d1Offset,
  decode,
  encode,
  entryGene,
  firstGene,
  gOffset,
  gatePairOf,
  gatePairs,
  movesOf,
  nCat,
  neighbourhood,
  normalize,
  numLevels,
  numericGenes,
  pinCell,
  pinGates,
  quadDistance,
  quadId,
  screenGenomes,
  structureOf
} from './space.ts';

export type LaneKind = 'indep' | 'gpair' | 'informed';

export interface Budget {
  screen: number; // indep, gpair: screened proposals per cell
  promote: number;
  r1: number;
  islands: number; // base islands
  islandsMax: number; // with extensions
  population: number;
  newPerIsland: number; // new distinct proposals per island (the cap)
  generations: number;
  patience: number;
  tolerance: number;
  extension: number; // the extension triggers' threshold (5%)
  r2Keep: number;
  r2: number;
  r2Distinct: number;
  r3Keep: number;
  r3: number;
  r3Distinct: number;
  refineStarts: ('robust' | 'profit')[];
  refinePasses: number;
  refineN: number;
  refineMinGain: number;
  refineDistinct: number;
  shortlist: number;
  distinct: number;
  local: number; // informed: near designs per seed (scale 1.5)
  broad: number; // informed: broad designs per seed (scale 3)
}

export interface LaneSpec {
  key: string; // e.g. C24/indep/GDX-rise_VGT-breakout
  cutoff: string;
  kind: LaneKind;
  cell?: CellKey;
  need: Need;
  options: EvalOptions;
  res: Resolution;
  seeds?: { label: string; quad: Quad }[];
}

export const ga = { crossoverProbability: 0.9, crossoverEta: 15, mutationEta: 20 };

const spaceOf = (levels: readonly number[], name: string): ParameterSpace => ({
  name,
  specs: levels.map((n, i) => ({
    key: `g${i}` as never,
    label: `gene ${i}`,
    unit: 'sessions',
    min: 0,
    max: n - 1,
    step: 1,
    neighborhoodRadius: 1,
    rationale: 'grid index'
  }))
});

interface Member extends Scored {
  quad: Quad;
  fit: Fit;
}

export interface IslandLog {
  index: number;
  generations: number;
  newConfigs: number;
  duplicates: number;
  invalid: number;
  stop: string;
  hvTrajectory: number[];
  bestRobustTrajectory: number[];
  bestNetTrajectory: number[];
  before: { hv: number; robust: number; net: number; classes: number };
  after: { hv: number; robust: number; net: number; classes: number };
}

export interface LaneResult {
  key: string;
  kind: LaneKind;
  cell: string | null;
  counts: Record<string, number>;
  byClass: Record<string, { screened: number; plausible: number; promoted: number; r1Feasible: number }>;
  islands: IslandLog[];
  extension: { islands: number; reason: string; stop: string };
  r2: { id: string; feasible: boolean; net: number; robust: number; p90: number; why: string }[];
  r3: { id: string; feasible: boolean; net: number; robust: number; p90: number }[];
  refinements: {
    kind: string;
    start: string;
    endpoint: string;
    path: { pass: number; moved: string | null; net: number; robust: number; violation: number }[];
  }[];
  shortlist: (Fit & { pick: string; quad: Quad })[];
  visibleInfeasible: {
    id: string;
    quad: Quad;
    centreNet: number;
    centreDd: number;
    p90: number;
    parts: Record<string, number>;
  }[];
  frontier: { id: string; net: number; robust: number; p90: number; dd: number; feasible: boolean; cls: string }[];
}

const byId = (a: { id: string }, b: { id: string }) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
const hvPoints = (ms: readonly Member[]): Scored[] =>
  ms.map((m) => ({
    id: m.id,
    genome: m.genome,
    violation: m.violation,
    objectives: [m.objectives[1]!, m.objectives[2]!]
  }));

export class Lane {
  private readonly archive = new Map<string, Member>(); // rung-1 fits of the lane
  private readonly configs = new Map<string, Quad>();
  readonly counts: Record<string, number> = {};
  private readonly islands: IslandLog[] = [];
  private byClass: LaneResult['byClass'] = {};
  extension: LaneResult['extension'] = { islands: 0, reason: 'not applicable', stop: 'not applicable' };

  constructor(
    private readonly lab: Lab,
    readonly spec: LaneSpec,
    readonly b: Budget,
    private readonly d1Fixed: Record<Sym, D1Grid> | null = null
  ) {}

  private count(k: string, n = 1) {
    this.counts[k] = (this.counts[k] ?? 0) + n;
  }

  private labels = (...parts: (string | number)[]) => [...parts, this.spec.key];
  private crn = (rung: string) => [rung, this.spec.cutoff]; // common random numbers across the cutoff's centres

  // gpair: D1 is disabled — its vectors are the placeholder and the priority is fixed (identity hygiene)
  private fixedUp(q: Quad): Quad {
    return this.d1Fixed ? normalize({ d1: this.d1Fixed, g: q.g, first: 'D1' }) : q;
  }

  private decodeOrNull(g: Genome): Quad | null {
    try {
      return this.fixedUp(decode(g, this.spec.res));
    } catch {
      return null;
    }
  }

  private scope(): Scope {
    return this.spec.kind === 'gpair' ? 'g' : 'joint';
  }

  private cls(q: Quad) {
    return classKey(q);
  }

  // ----- fits: the centre and its unique neighbours under the rung's common seed family -----

  async fitMany(quads: readonly Quad[], rung: string, n: number, scale = 1): Promise<Fit[]> {
    const fam = { name: rung, n, labels: this.crn(rung), scope: this.scope(), scale };
    const plans = quads.map((q) => {
      const seen = new Set<string>([quadId(q)]);
      const nb = neighbourhood(q, fam)
        .map((p) => ({ ...p, quad: this.fixedUp(p.quad) }))
        .filter((p) => {
          const id = quadId(p.quad);

          if (seen.has(id)) return false;
          seen.add(id);
          return true;
        });

      return { q, nb };
    });
    const items = plans.flatMap((p) => [
      { quad: p.q, options: this.spec.options },
      ...p.nb.map((x) => ({ quad: x.quad, options: this.spec.options }))
    ]);
    const recs = await this.lab.evalMany(items);
    const out: Fit[] = [];
    let at = 0;

    for (const p of plans) {
      const centre = recs[at++]!;
      const nbs: Rec[] = [];

      for (let i = 0; i < p.nb.length; i++) nbs.push(recs[at++]!);
      out.push(
        fitOf(
          rung,
          centre,
          nbStats(
            centre,
            nbs,
            p.nb.map((x) => x.clipped)
          ),
          this.spec.need
        )
      );
      this.configs.set(centre.id, p.q);
      this.lab.store.write('configs', centre.id, p.q);
    }

    return out;
  }

  private member(q: Quad, f: Fit, genome?: Genome): Member {
    return {
      id: f.id,
      genome: genome ?? encode(q, this.spec.res),
      objectives: f.objectives,
      violation: f.violation,
      quad: q,
      fit: f
    };
  }

  private addArchive(m: Member) {
    if (this.archive.has(m.id)) return;
    this.archive.set(m.id, m);

    const c = this.cls(m.quad);

    this.byClass[c] ??= { screened: 0, plausible: 0, promoted: 0, r1Feasible: 0 };
    if (m.violation === 0) this.byClass[c].r1Feasible++;
  }

  // ----- screen and promotion (indep, gpair) -----

  private async screen() {
    const cell = this.spec.cell!;
    const genomes = screenGenomes(this.b.screen, this.spec.res, ...this.labels('screen')).map((g, i) =>
      pinGates(pinCell(g, cell), gatePairs[i % gatePairs.length]!)
    );
    const seen = new Set<string>();
    const quads: Quad[] = [];

    for (const g of genomes) {
      const q = this.decodeOrNull(g);

      if (!q) {
        this.count('screenInvalid');
        continue;
      }

      const id = quadId(q);

      if (seen.has(id)) {
        this.count('screenDuplicate');
        continue;
      }

      seen.add(id);
      quads.push(q);
    }

    this.count('screened', genomes.length);
    this.count('screenUnique', quads.length);

    const recs = await this.lab.evalMany(quads.map((quad) => ({ quad, options: this.spec.options })));
    const items = quads.map((q, i) => {
      const r = recs[i]!;
      const sOk = structureOk(r, this.spec.need);
      const plausible = !r.error && r.net > 0 && r.dd <= economics.ceiling && sOk;
      const violation = plausible
        ? 0
        : (r.error ? 1 : Math.max(0, -r.net) / economics.budget + (r.net > 0 ? 0 : 0.01)) +
          Math.max(0, r.dd - economics.ceiling) / economics.ceiling +
          (sOk ? 0 : 0.5);
      const c = this.cls(q);

      this.byClass[c] ??= { screened: 0, plausible: 0, promoted: 0, r1Feasible: 0 };
      this.byClass[c].screened++;
      if (plausible) this.byClass[c].plausible++;
      this.configs.set(r.id, q);

      return {
        id: r.id,
        genome: encode(q, this.spec.res),
        objectives: [-r.net, r.dd],
        violation,
        quad: q,
        plausible,
        net: r.net
      };
    });

    this.count('plausible', items.filter((x) => x.plausible).length);

    // promotion: ¼ by centre net among the plausible, ¼ by constrained rank on (−net, DD), ½ max-min diversity
    const k = Math.min(this.b.promote, items.length);
    const chosen = new Map<string, (typeof items)[number]>();
    const byNet = items.filter((x) => x.plausible).sort((a, b) => b.net - a.net || byId(a, b));

    for (const x of byNet) {
      if (chosen.size >= Math.ceil(k / 4)) break;
      chosen.set(x.id, x);
    }
    for (const x of rankOrder(items)) {
      if (chosen.size >= Math.ceil(k / 2)) break;
      if (!chosen.has(x.id)) chosen.set(x.id, x);
    }

    const pool = [...items.filter((x) => x.plausible), ...items.filter((x) => !x.plausible)].filter(
      (x) => !chosen.has(x.id)
    );

    while (chosen.size < k && pool.length) {
      let best = 0;
      let bestD = -1;

      for (let i = 0; i < pool.length; i++) {
        let d = Infinity;

        for (const c of chosen.values()) {
          d = Math.min(d, quadDistance(pool[i]!.quad, c.quad));
          if (d <= bestD) break;
        }
        if (d > bestD + 1e-12 || (Math.abs(d - bestD) <= 1e-12 && pool[i]!.id < pool[best]!.id)) {
          bestD = d;
          best = i;
        }
      }

      chosen.set(pool[best]!.id, pool[best]!);
      pool.splice(best, 1);
    }

    for (const x of chosen.values()) this.byClass[this.cls(x.quad)]!.promoted++;
    this.count('promoted', chosen.size);

    return [...chosen.values()];
  }

  // ----- NSGA-II islands -----

  private pinned(): Set<number> {
    const pinned = new Set<number>();

    if (this.spec.cell) for (const s of symbols) pinned.add(entryGene[s]);
    if (this.spec.kind === 'gpair') {
      pinned.add(firstGene);
      for (const s of symbols) for (let i = 0; i < d1Box.length; i++) pinned.add(d1Offset[s] + i);
    }

    return pinned;
  }

  private variation(a: Genome, b: Genome, rng: Rng, pinned: Set<number>) {
    const ca = [...a];
    const cb = [...b];

    // categorical genes: uniform crossover with the crossover probability
    if (rng.next() <= ga.crossoverProbability)
      for (let i = 0; i < nCat; i++) {
        if (pinned.has(i)) continue;
        if (rng.next() < 0.5) [ca[i], cb[i]] = [cb[i]!, ca[i]!];
      }

    // ordinal genes: SBX on grid indices
    const levels = numLevels(this.spec.res);
    const num = sbx(spaceOf(levels, 'num'), a.slice(nCat), b.slice(nCat), rng, ga);

    for (let i = 0; i < levels.length; i++) {
      if (pinned.has(nCat + i)) continue;
      ca[nCat + i] = num.children[0]![i]!;
      cb[nCat + i] = num.children[1]![i]!;
    }

    return [ca, cb];
  }

  private mutate(g: Genome, rng: Rng, pinned: Set<number>): Genome {
    const out = [...g];
    const q = this.decodeOrNull(g);
    // the active ordinal genes of the parent: D1 (8 + 8, unless pinned) and the active Growth inputs of both books
    const active: number[] = [];

    for (const s of symbols) d1Box.forEach((_b, i) => active.push(d1Offset[s] + i));
    if (q)
      for (const s of symbols) {
        const st = structureOf(q.g[s]);

        numericGenes.forEach((gene, i) => {
          if (gene.active(st)) active.push(gOffset[s] + i);
        });
      }

    const free = active.filter((i) => !pinned.has(i));
    const levels = numLevels(this.spec.res);
    const sub = free.map((i) => out[i]!);
    const m = polynomialMutation(
      spaceOf(
        free.map((i) => levels[i - nCat]!),
        'active'
      ),
      sub,
      rng,
      ga
    );

    free.forEach((i, x) => (out[i] = m.genome[x]!));

    // categorical genes: random reset, each with probability 1 / (free categorical genes)
    const cats = Array.from({ length: nCat }, (_v, i) => i).filter((i) => !pinned.has(i));

    for (const i of cats)
      if (rng.next() < 1 / Math.max(1, cats.length)) {
        const n = catLevels[i]!;
        const v = rng.int(n - 1);

        out[i] = v >= out[i]! ? v + 1 : v;
      }

    return out;
  }

  private best(pick: (m: Member) => number) {
    let best = -Infinity;

    for (const m of this.archive.values()) if (m.violation === 0) best = Math.max(best, pick(m));
    return best;
  }

  private feasibleClasses() {
    return new Set([...this.archive.values()].filter((m) => m.violation === 0).map((m) => this.cls(m.quad)));
  }

  private state() {
    return {
      hv: hypervolume2d(hvPoints([...this.archive.values()]), [0, economics.ceiling]),
      robust: this.best((m) => m.fit.nb.robust),
      net: this.best((m) => m.fit.centre.net),
      classes: this.feasibleClasses().size
    };
  }

  private async island(index: number, initial: Member[], budgetNew: number) {
    const rng = Rng.from(...seedOf('ga', index, ...this.labels()));
    const pinned = this.pinned();
    const before = this.state();
    const seen = new Set<string>([...this.archive.keys()]);
    let pop: Member[] = initial.slice(0, this.b.population);

    // fillers: Latin-supercube genomes of the cell (gate pairs round-robin)
    if (pop.length < this.b.population) {
      const fillers = screenGenomes(this.b.population * 4, this.spec.res, ...this.labels('fill', index)).map((g, i) => {
        if (this.spec.cell) pinCell(g, this.spec.cell);
        return pinGates(g, gatePairs[i % gatePairs.length]!);
      });
      const add: Quad[] = [];

      for (const g of fillers) {
        if (pop.length + add.length >= this.b.population) break;

        const q = this.decodeOrNull(g);

        if (!q) continue;

        const id = quadId(q);

        if (seen.has(id)) continue;
        seen.add(id);
        add.push(q);
      }

      const fits = await this.fitMany(add, 'r1', this.b.r1);

      add.forEach((q, i) => {
        const m = this.member(q, fits[i]!);

        this.addArchive(m);
        pop.push(m);
      });
      this.count('fillers', add.length);
    }

    const lg: IslandLog = {
      index,
      generations: 0,
      newConfigs: 0,
      duplicates: 0,
      invalid: 0,
      stop: '',
      hvTrajectory: [],
      bestRobustTrajectory: [],
      bestNetTrajectory: [],
      before,
      after: before
    };
    let bestHv = hypervolume2d(hvPoints(pop), [0, economics.ceiling]);
    let bestNet = this.best((m) => m.fit.centre.net);
    let stale = 0;

    for (let gen = 0; gen < this.b.generations; gen++) {
      if (lg.newConfigs >= budgetNew) {
        lg.stop = 'budget';
        break;
      }

      const ranked: Ranked<Member>[] = selectSurvivors(pop, this.b.population);
      const want = Math.min(this.b.population, budgetNew - lg.newConfigs);
      const children: Quad[] = [];
      let attempts = 0;

      while (children.length < want && attempts < want * 50) {
        attempts++;

        const p1 = tournament(ranked, rng).member;
        const p2 = tournament(ranked, rng).member;

        for (const c of this.variation(p1.genome, p2.genome, rng, pinned)) {
          if (children.length >= want) break;

          const g = this.mutate(c, rng, pinned);

          if (this.spec.cell) pinCell(g, this.spec.cell);

          const q = this.decodeOrNull(g);

          if (!q) {
            lg.invalid++;
            continue;
          }

          const id = quadId(q);

          if (seen.has(id)) {
            lg.duplicates++;
            continue;
          }

          seen.add(id);
          children.push(q);
        }
      }

      if (children.length === 0) {
        lg.stop = 'no new configurations';
        break;
      }

      const fits = await this.fitMany(children, 'r1', this.b.r1);
      const kids = children.map((q, i) => this.member(q, fits[i]!));

      for (const k of kids) this.addArchive(k);
      lg.newConfigs += kids.length;
      lg.generations = gen + 1;
      pop = selectSurvivors([...pop, ...kids], this.b.population).map((r) => r.member);

      const hv = hypervolume2d(hvPoints(pop), [0, economics.ceiling]);
      const net = this.best((m) => m.fit.centre.net);

      lg.hvTrajectory.push(Math.round(hv));
      lg.bestRobustTrajectory.push(Math.round(this.best((m) => m.fit.nb.robust)));
      lg.bestNetTrajectory.push(Math.round(net));

      // stagnation: neither the island's hypervolume of (−robust, p90) nor the lane's best feasible centre net rose
      // by more than the tolerance for `patience` generations
      const gained =
        hv > bestHv * (1 + this.b.tolerance) + 1e-9 || net > bestNet + Math.abs(bestNet) * this.b.tolerance + 1e-9;

      if (hv > bestHv) bestHv = hv;
      if (net > bestNet) bestNet = net;
      stale = gained ? 0 : stale + 1;

      this.lab.setProgress({
        lane: this.spec.key,
        stage: 'island',
        island: index,
        generation: gen + 1,
        newConfigs: lg.newConfigs
      });

      if (stale >= this.b.patience) {
        lg.stop = 'stagnation';
        break;
      }
    }

    if (!lg.stop) lg.stop = lg.newConfigs >= budgetNew ? 'budget' : 'generations';
    lg.after = this.state();
    this.islands.push(lg);
    this.count('islandConfigs', lg.newConfigs);
    log(`${this.spec.key} island ${index}: ${lg.newConfigs} new, ${lg.generations} generations, stop ${lg.stop}`);
  }

  // ----- rungs: ½ constrained rank, ¼ centre net (feasible), ¼ robust net (feasible), each pick distinct -----

  private promote(members: Member[], k: number, distinct: number) {
    const ranked = rankOrder(members);
    const feasible = members.filter((m) => m.violation === 0);
    const byNet = [...feasible].sort((a, b) => b.fit.centre.net - a.fit.centre.net || byId(a, b));
    const byRobust = [...feasible].sort((a, b) => b.fit.nb.robust - a.fit.nb.robust || byId(a, b));
    const out: { m: Member; why: string }[] = [];
    const take = (q: Member[], why: string, cap: number) => {
      let n = 0;

      for (const m of q) {
        if (out.length >= k || n >= cap) break;
        if (out.some((o) => o.m.id === m.id || quadDistance(o.m.quad, m.quad) < distinct)) continue;
        out.push({ m, why });
        n++;
      }
    };

    take(byNet, 'centre net', Math.ceil(k / 4));
    take(byRobust, 'robust net', Math.ceil(k / 4));
    take(ranked, 'rank', k);
    take(byNet, 'centre net', k); // fill any remaining room
    return out;
  }

  // ----- refinement -----

  private async refine(starts: { fit: Fit; kind: 'robust' | 'profit' }[]) {
    const results: LaneResult['refinements'] = [];
    const endpoints: Quad[] = [];
    const movable = { d1: this.spec.kind !== 'gpair', g: true };

    for (const start of starts) {
      let cur = this.configs.get(start.fit.id)!;
      let [curFit] = await this.fitMany([cur], 'refine', this.b.refineN);
      const path: LaneResult['refinements'][number]['path'] = [
        { pass: 0, moved: null, net: curFit!.centre.net, robust: curFit!.nb.robust, violation: curFit!.violation }
      ];

      for (let pass = 1; pass <= this.b.refinePasses; pass++) {
        const self = quadId(cur);
        const moves = [
          ...new Map(
            movesOf(cur, movable)
              .map((m) => this.fixedUp(m))
              .map((m) => [quadId(m), m])
          ).values()
        ].filter((m) => quadId(m) !== self);
        const fits = await this.fitMany(moves, 'refine', this.b.refineN);
        const scored = fits.map((f, i) => ({ f, q: moves[i]! }));
        let next: { q: Quad; f: Fit } | null = null;

        this.count('refineMoves', moves.length);

        if (curFit!.violation === 0) {
          if (start.kind === 'robust') {
            const better = scored.filter(
              (x) => x.f.violation === 0 && x.f.nb.robust >= curFit!.nb.robust + this.b.refineMinGain
            );

            if (better.length)
              next = bandedOrder(better.map((x) => ({ id: x.f.id, robust: x.f.nb.robust, p90: x.f.nb.p90Dd, x })))[0]!
                .x;
          } else {
            const better = scored
              .filter((x) => x.f.violation === 0 && x.f.centre.net >= curFit!.centre.net + this.b.refineMinGain)
              .sort((a, b) => b.f.centre.net - a.f.centre.net || byId(a.f, b.f));

            if (better.length) next = better[0]!;
          }
        } else {
          const better = scored
            .filter((x) => x.f.violation <= curFit!.violation - 0.01)
            .sort((a, b) => a.f.violation - b.f.violation || byId(a.f, b.f));

          if (better.length) next = better[0]!;
        }

        if (!next) break;
        cur = next.q;
        curFit = next.f;
        path.push({
          pass,
          moved: next.f.id,
          net: next.f.centre.net,
          robust: next.f.nb.robust,
          violation: next.f.violation
        });
      }

      results.push({ kind: start.kind, start: start.fit.id, endpoint: quadId(cur), path });
      if (quadId(cur) !== start.fit.id) endpoints.push(cur);
    }

    return { results, endpoints };
  }

  // ----- the cell shortlist (structural slots, PROTOCOL.md §11.6) -----

  private shortlist(fits: Fit[]) {
    const best = new Map<string, Fit>(); // one per ledger signature: its highest centre net

    for (const f of fits) {
      if (f.violation !== 0) continue;

      const k = f.centre.signature;
      const prev = best.get(k);

      if (!prev || f.centre.net > prev.centre.net || (f.centre.net === prev.centre.net && f.id < prev.id))
        best.set(k, f);
    }

    const feasible = [...best.values()];
    const picks: (Fit & { pick: string; quad: Quad })[] = [];
    const take = (f: Fit | undefined, pick: string) => {
      if (!f || picks.length >= this.b.shortlist) return;
      if (picks.some((p) => p.id === f.id)) return;

      const q = this.configs.get(f.id)!;

      if (picks.some((p) => quadDistance(p.quad, q) < this.b.distinct)) return;
      picks.push({ ...f, pick, quad: q });
    };
    const byNet = [...feasible].sort((a, b) => b.centre.net - a.centre.net || byId(a, b));

    take(byNet[0], 'profit');
    take([...feasible].sort((a, b) => b.nb.robust - a.nb.robust || byId(a, b))[0], 'robust');
    take(
      [...feasible].sort(
        (a, b) => b.nb.robust / Math.max(1, b.nb.p90Dd) - a.nb.robust / Math.max(1, a.nb.p90Dd) || byId(a, b)
      )[0],
      'balanced'
    );
    if (picks[0]) {
      const gates = gatePairOf(picks[0].quad);

      take(
        byNet.find((f) => gatePairOf(this.configs.get(f.id)!) !== gates),
        'gate-alternative'
      );
    }
    for (const f of byNet) take(f, 'profit order');

    return picks;
  }

  // ----- the lane -----

  async run(): Promise<LaneResult> {
    const s = this.spec;
    const b = this.b;

    this.lab.stage = `${s.key}: start`;
    log(`lane ${s.key} (${s.kind}) starts`);

    if (s.kind === 'informed') {
      const designs: Quad[] = [];
      const seen = new Set<string>();

      for (const [i, seed] of (s.seeds ?? []).entries()) {
        const local = [
          seed.quad,
          ...neighbourhood(seed.quad, { name: 'local', n: b.local, labels: this.labels('local', i), scale: 1.5 }).map(
            (p) => p.quad
          ),
          ...neighbourhood(seed.quad, { name: 'broad', n: b.broad, labels: this.labels('broad', i), scale: 3 }).map(
            (p) => p.quad
          )
        ];

        for (const q0 of local) {
          const q = this.fixedUp(q0);
          const id = quadId(q);

          if (seen.has(id)) continue;
          seen.add(id);
          designs.push(q);
        }
      }

      this.count('seeds', s.seeds?.length ?? 0);
      this.count('localDesigns', designs.length);
      this.lab.stage = `${s.key}: local designs`;

      const fits = await this.fitMany(designs, 'r1', b.r1);

      designs.forEach((q, i) => this.addArchive(this.member(q, fits[i]!)));
    } else {
      this.lab.stage = `${s.key}: screen`;

      const promoted = await this.screen();

      this.lab.stage = `${s.key}: rung 1`;

      const fits = await this.fitMany(
        promoted.map((x) => x.quad),
        'r1',
        b.r1
      );

      promoted.forEach((x, i) => this.addArchive(this.member(x.quad, fits[i]!)));
    }

    // the islands with the frozen extension rule
    const r1Ranked = rankOrder([...this.archive.values()]);
    let reason = '';
    let stop = '';
    let i = 0;

    for (; i < b.islandsMax; i++) {
      const initial = r1Ranked.filter((_m, k) => k % b.islands === i % b.islands);
      const prior = this.state();

      this.lab.stage = `${s.key}: island ${i}`;
      await this.island(i, initial, b.newPerIsland);

      if (i + 1 < b.islands) continue;

      const after = this.state();
      const gain = (x: number, y: number) => (Number.isFinite(x) && x > 0 ? (y - x) / x : y > 0 ? Infinity : 0);
      const triggers = {
        hypervolume: gain(prior.hv, after.hv),
        robust: gain(prior.robust, after.robust),
        net: gain(prior.net, after.net),
        newClasses: after.classes - prior.classes
      };
      const fired =
        triggers.hypervolume > b.extension ||
        triggers.robust > b.extension ||
        triggers.net > b.extension ||
        triggers.newClasses > 0;

      reason = `island ${i}: hypervolume ${(100 * triggers.hypervolume).toFixed(1)}%, best robust ${(100 * triggers.robust).toFixed(1)}%, best centre net ${(100 * triggers.net).toFixed(1)}%, ${triggers.newClasses} new feasible class(es)`;

      if (!fired) {
        stop = 'triggers not met';
        i++;
        break;
      }
      if (i + 1 >= b.islandsMax) stop = 'extension cap reached';
    }

    this.counts.islandsRun = this.islands.length;
    this.extension = { islands: this.islands.length, reason, stop: stop || 'extension cap reached' };

    // rung 2 and rung 3
    this.lab.stage = `${s.key}: rung 2`;

    const r2Picks = this.promote([...this.archive.values()], b.r2Keep, b.r2Distinct);
    const r2Fits = await this.fitMany(
      r2Picks.map((x) => x.m.quad),
      'r2',
      b.r2
    );
    const r2 = r2Picks.map((x, k) => ({ m: this.member(x.m.quad, r2Fits[k]!, x.m.genome), why: x.why }));

    this.lab.stage = `${s.key}: rung 3`;

    const r3Picks = this.promote(
      r2.map((x) => x.m),
      b.r3Keep,
      b.r3Distinct
    );
    const r3Fits = await this.fitMany(
      r3Picks.map((x) => x.m.quad),
      'r3',
      b.r3
    );

    // refinement: the robust start (the banded order of the feasible rung 3) and the profit start (the highest
    // feasible centre net of rung 3); without a feasible rung-3 fit, the least violation
    this.lab.stage = `${s.key}: refine`;

    const feasible3 = r3Fits.filter((f) => f.violation === 0);
    const infeasible3 = r3Fits.filter((f) => f.violation > 0).sort((a, c) => a.violation - c.violation || byId(a, c));
    const starts: { fit: Fit; kind: 'robust' | 'profit' }[] = [];

    for (const kind of b.refineStarts) {
      const order =
        kind === 'robust'
          ? bandedOrder(feasible3.map((f) => ({ id: f.id, robust: f.nb.robust, p90: f.nb.p90Dd, f }))).map((x) => x.f)
          : [...feasible3].sort((a, c) => c.centre.net - a.centre.net || byId(a, c));

      for (const f of [...order, ...infeasible3]) {
        if (
          starts.some(
            (x) =>
              x.fit.id === f.id || quadDistance(this.configs.get(x.fit.id)!, this.configs.get(f.id)!) < b.refineDistinct
          )
        )
          continue;
        starts.push({ fit: f, kind });
        break;
      }
    }

    const ref = await this.refine(starts);
    const endFits = await this.fitMany(ref.endpoints, 'r3', b.r3);
    const allR3 = [...r3Fits, ...endFits];
    const list = this.shortlist(allR3);
    const infeasible = [...allR3, ...[...this.archive.values()].map((m) => m.fit)]
      .filter((f) => f.violation > 0)
      .sort((a, c) => c.centre.net - a.centre.net || byId(a, c));
    const vis: LaneResult['visibleInfeasible'] = [];

    for (const f of infeasible) {
      if (vis.length >= 5) break;
      if (vis.some((v) => v.id === f.id)) continue;
      vis.push({
        id: f.id,
        quad: this.configs.get(f.id)!,
        centreNet: f.centre.net,
        centreDd: f.centre.dd,
        p90: f.nb.p90Dd,
        parts: f.parts
      });
    }

    this.count('r1Centres', this.archive.size);
    this.count('r1Feasible', [...this.archive.values()].filter((m) => m.violation === 0).length);
    this.count('r2', r2.length);
    this.count('r2Feasible', r2.filter((x) => x.m.violation === 0).length);
    this.count('r3', allR3.length);
    this.count('r3Feasible', allR3.filter((f) => f.violation === 0).length);
    this.count('shortlist', list.length);
    this.count('distinctCentres', this.configs.size);
    log(
      `lane ${s.key}: ${this.archive.size} rung-1 centres, ${this.counts.r1Feasible} feasible; shortlist ${list.length}`
    );

    return {
      key: s.key,
      kind: s.kind,
      cell: s.cell ? cellName(s.cell) : null,
      counts: this.counts,
      byClass: this.byClass,
      islands: this.islands,
      extension: this.extension,
      r2: r2.map((x) => ({
        id: x.m.id,
        feasible: x.m.violation === 0,
        net: x.m.fit.centre.net,
        robust: x.m.fit.nb.robust,
        p90: x.m.fit.nb.p90Dd,
        why: x.why
      })),
      r3: allR3.map((f) => ({
        id: f.id,
        feasible: f.violation === 0,
        net: f.centre.net,
        robust: f.nb.robust,
        p90: f.nb.p90Dd
      })),
      refinements: ref.results,
      shortlist: list,
      visibleInfeasible: vis,
      frontier: [...this.archive.values()].map((m) => ({
        id: m.id,
        net: m.fit.centre.net,
        robust: m.fit.nb.robust,
        p90: m.fit.nb.p90Dd,
        dd: m.fit.centre.dd,
        feasible: m.violation === 0,
        cls: this.cls(m.quad)
      }))
    };
  }
}
