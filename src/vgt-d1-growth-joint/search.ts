// The joint search (PROTOCOL.md §6). One lane = one proposal source over one protected stratum:
//
// - indep (independent): a cell of architecture × Growth entry × recovery gate. Latin-supercube Sobol screen of the
//   whole joint genome (coarse Growth grid, D1's integer grid) → promotion (½ constrained rank on (−net, DD), ½ max-min
//   L∞ diversity) → rung 1 (16 neighbours) → NSGA-II islands with the frozen saturation extension → rung 2 (64) →
//   rung 3 (128) → fine refinement → the cell shortlist (structural slots). No incumbent, control or archive vector.
// - informed: the declared seeds (known D1 and Growth settings, development-only archive members, both families
//   mutable) → local Latin-hypercube designs on the fine grid → rung 1 → one NSGA-II island per architecture → rungs →
//   refinement → shortlist.
// - d1only / gonly: the single-family controls, optimized by the same machinery with the other family disabled.
//
// Every stage is a deterministic function of its seed labels and of the evaluations it requests; with the archive this
// makes a rerun an exact replay (lab.ts). All fits are recomputed from archived records.
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
import type { Allocation, Arch } from './allocator.ts';
import { economics, log, seedOf } from './context.ts';
import type { EvalOptions, Rec } from './evaluate.ts';
import { type Fit, type Need, bandedOrder, fitOf, nbStats } from './fitness.ts';
import type { Lab } from './lab.ts';
import {
  type CellKey,
  type GConfig,
  type Genome,
  type Joint,
  type Resolution,
  type Scope,
  catLevels,
  cellName,
  cellOf,
  classOf,
  decode,
  encode,
  entryGene,
  gateGene,
  jointDistance,
  jointId,
  movesOf,
  nCat,
  neighbourhood,
  normalize,
  numLevels,
  pinCell,
  screenGenomes,
  structuralGenes,
  structureOf,
  activeGenes,
  d1Box,
  numericGenes
} from './space.ts';
import type { D1Grid } from './books.ts';

export type LaneKind = 'indep' | 'informed' | 'd1only' | 'gonly';

export interface Budget {
  screen: number;
  promote: number;
  r1: number;
  islands: number;
  islandsMax: number;
  population: number;
  newPerIsland: number;
  generations: number;
  patience: number;
  tolerance: number;
  saturation: number;
  r2Keep: number;
  r2: number;
  r2Distinct: number;
  r3Keep: number;
  r3: number;
  r3Distinct: number;
  refineStarts: number;
  refinePasses: number;
  refineN: number;
  refineMinGain: number;
  refineDistinct: number;
  shortlist: number;
  distinct: number;
  local: number; // informed: Latin-hypercube perturbations per seed (scale 1.5)
}

export interface LaneSpec {
  key: string; // e.g. C24/indep/A/rise/off
  cutoff: string;
  kind: LaneKind;
  cell?: CellKey; // indep, d1only (arch A), gonly (entry × gate; arch A)
  need: Need;
  options: EvalOptions;
  res: Resolution;
  seeds?: { label: string; joint: Joint }[];
  islandArchs?: Arch[]; // informed: one island per architecture
  fixed?: { d1?: D1Grid; g?: GConfig; a?: Allocation }; // single-family lanes: the other family's (ignored) values
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
  joint: Joint;
  fit: Fit;
}

export interface IslandLog {
  index: number;
  arch: Arch;
  generations: number;
  newConfigs: number;
  duplicates: number;
  invalid: number;
  stop: string;
  hvTrajectory: number[];
  bestRobustTrajectory: number[];
  before: { hv: number; robust: number };
  after: { hv: number; robust: number };
}

export interface LaneResult {
  key: string;
  kind: LaneKind;
  cell: string | null;
  counts: Record<string, number>;
  byClass: Record<string, { screened: number; plausible: number; promoted: number }>;
  islands: IslandLog[];
  saturation: { islands: number; saturated: boolean; reason: string };
  r2: { id: string; feasible: boolean; robust: number; p90: number }[];
  r3: { id: string; feasible: boolean; robust: number; p90: number }[];
  refinements: {
    start: string;
    endpoint: string;
    path: { pass: number; moved: string | null; robust: number; violation: number }[];
  }[];
  shortlist: (Fit & { pick: string; joint: Joint })[];
  visibleInfeasible: {
    id: string;
    joint: Joint;
    centreNet: number;
    centreDd: number;
    p90: number;
    parts: Record<string, number>;
  }[];
  frontier: { id: string; robust: number; p90: number; net: number; dd: number; feasible: boolean }[];
}

const byId = (a: { id: string }, b: { id: string }) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);

export class Lane {
  private readonly archive = new Map<string, Member>(); // rung-1 fits of the lane
  private readonly configs = new Map<string, Joint>();
  readonly counts: Record<string, number> = {};
  private readonly islands: IslandLog[] = [];

  constructor(
    private readonly lab: Lab,
    readonly spec: LaneSpec,
    readonly b: Budget
  ) {}

  private count(k: string, n = 1) {
    this.counts[k] = (this.counts[k] ?? 0) + n;
  }

  private labels = (...parts: (string | number)[]) => [...parts, this.spec.key];
  private crn = (rung: string) => [rung, this.spec.cutoff]; // common random numbers across the cutoff's centres

  private fixedUp(j: Joint): Joint {
    const f = this.spec.fixed;

    return f ? normalize({ d1: f.d1 ?? j.d1, g: f.g ?? j.g, a: f.a ?? j.a }) : j;
  }

  private decodeOrNull(g: Genome, arch: Arch): Joint | null {
    try {
      return this.fixedUp(decode(g, arch, this.spec.res));
    } catch {
      return null;
    }
  }

  private archOf(): Arch {
    return this.spec.cell?.arch ?? 'A';
  }

  // ----- fits -----

  // Fits centres at one rung: the centre and its unique neighbours under the rung's common seed family.
  private defaultScope(): Scope {
    return this.spec.kind === 'd1only' ? 'd1' : this.spec.kind === 'gonly' ? 'g' : 'joint';
  }

  async fitMany(joints: readonly Joint[], rung: string, n: number, scope?: Scope, scale = 1): Promise<Fit[]> {
    const fam = { name: rung, n, labels: this.crn(rung), scope: scope ?? this.defaultScope(), scale };
    const plans = joints.map((j) => {
      const seen = new Set<string>([jointId(j)]);
      const nb = neighbourhood(j, fam)
        .map((p) => ({ ...p, joint: this.fixedUp(p.joint) }))
        .filter((p) => {
          const id = jointId(p.joint);

          if (seen.has(id)) return false;
          seen.add(id);
          return true;
        });

      return { j, nb };
    });
    const items = plans.flatMap((p) => [
      { joint: p.j, options: this.spec.options },
      ...p.nb.map((x) => ({ joint: x.joint, options: this.spec.options }))
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
      this.configs.set(centre.id, p.j);
      this.lab.store.write('configs', centre.id, p.j);
    }

    return out;
  }

  private member(j: Joint, f: Fit, genome?: Genome): Member {
    return {
      id: f.id,
      genome: genome ?? encode(j, this.spec.res),
      objectives: f.objectives,
      violation: f.violation,
      joint: j,
      fit: f
    };
  }

  private addArchive(m: Member) {
    if (!this.archive.has(m.id)) this.archive.set(m.id, m);
  }

  // ----- screen and promotion (indep, d1only, gonly) -----

  private async screen() {
    const cell = this.spec.cell!;
    const genomes = screenGenomes(this.b.screen, cell, 'coarse', ...this.labels('screen'));
    const seen = new Set<string>();
    const joints: Joint[] = [];

    for (const g of genomes) {
      const j = this.decodeOrNull(g, cell.arch);

      if (!j) {
        this.count('screenInvalid');
        continue;
      }

      const id = jointId(j);

      if (seen.has(id)) {
        this.count('screenDuplicate');
        continue;
      }

      seen.add(id);
      joints.push(j);
    }

    this.count('screened', genomes.length);
    this.count('screenUnique', joints.length);

    const recs = await this.lab.evalMany(joints.map((joint) => ({ joint, options: this.spec.options })));
    const byClass: LaneResult['byClass'] = {};
    const items = joints.map((j, i) => {
      const r = recs[i]!;
      const structureOk =
        this.spec.need === 'mixed' ? r.mixed : this.spec.need === 'D1' ? r.fam.D1.lots > 0 : r.fam.G.lots > 0;
      const plausible = !r.error && r.net > 0 && r.dd <= economics.ceiling && structureOk;
      const violation = plausible
        ? 0
        : (r.error ? 1 : Math.max(0, -r.net) / economics.budget + (r.net > 0 ? 0 : 0.01)) +
          Math.max(0, r.dd - economics.ceiling) / economics.ceiling +
          (structureOk ? 0 : 0.5);
      const cls = classKey(j);

      byClass[cls] ??= { screened: 0, plausible: 0, promoted: 0 };
      byClass[cls].screened++;
      if (plausible) byClass[cls].plausible++;
      this.configs.set(r.id, j);

      return { id: r.id, genome: encode(j, this.spec.res), objectives: [-r.net, r.dd], violation, joint: j, plausible };
    });

    this.count('plausible', items.filter((x) => x.plausible).length);

    // promotion: half by constrained rank, half by max-min diversity among the plausible (then the rest)
    const k = Math.min(this.b.promote, items.length);
    const ranked = rankOrder(items);
    const chosen = new Map<string, (typeof items)[number]>();

    for (const x of ranked) {
      if (chosen.size >= Math.ceil(k / 2)) break;
      chosen.set(x.id, x);
    }

    const pool = [...items.filter((x) => x.plausible), ...items.filter((x) => !x.plausible)].filter(
      (x) => !chosen.has(x.id)
    );

    while (chosen.size < k && pool.length) {
      let best = 0;
      let bestD = -1;

      for (let i = 0; i < pool.length; i++) {
        let d = Infinity;

        for (const c of chosen.values()) d = Math.min(d, jointDistance(pool[i]!.joint, c.joint));
        if (d > bestD + 1e-12 || (Math.abs(d - bestD) <= 1e-12 && pool[i]!.id < pool[best]!.id)) {
          bestD = d;
          best = i;
        }
      }

      chosen.set(pool[best]!.id, pool[best]!);
      pool.splice(best, 1);
    }

    for (const x of chosen.values()) byClass[classKey(x.joint)]!.promoted++;
    this.count('promoted', chosen.size);

    return { promoted: [...chosen.values()], byClass };
  }

  // ----- NSGA-II islands -----

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

  private mutate(g: Genome, rng: Rng, pinned: Set<number>, arch: Arch): Genome {
    const out = [...g];
    const j = this.decodeOrNull(g, arch);
    const s = j ? structureOf(j.g) : null;
    // active ordinal genes of the parent: D1 (8), the active Growth inputs, B's targets
    const active: number[] = [];

    d1Box.forEach((_b, i) => active.push(nCat + i));
    if (s)
      numericGenes.forEach((gene, i) => {
        if (gene.active(s)) active.push(nCat + d1Box.length + i);
      });
    if (arch === 'B')
      active.push(nCat + d1Box.length + numericGenes.length, nCat + d1Box.length + numericGenes.length + 1);

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

  private pinnedGenes(island: { cellPinned: boolean }): Set<number> {
    const pinned = new Set<number>();

    if (island.cellPinned) {
      pinned.add(entryGene);
      pinned.add(gateGene);
    }

    if (this.spec.kind === 'd1only') {
      for (let i = 0; i < nCat; i++) pinned.add(i);
      for (let i = nCat + d1Box.length; i < nCat + d1Box.length + numericGenes.length + 2; i++) pinned.add(i);
    }

    if (this.spec.kind === 'gonly') {
      pinned.add(structuralGenes.length); // priority
      for (let i = nCat; i < nCat + d1Box.length; i++) pinned.add(i);
      pinned.add(nCat + d1Box.length + numericGenes.length);
      pinned.add(nCat + d1Box.length + numericGenes.length + 1);
    }

    return pinned;
  }

  private bestRobust() {
    let best = -Infinity;

    for (const m of this.archive.values()) if (m.violation === 0) best = Math.max(best, m.fit.nb.robust);
    return best;
  }

  private unionHv() {
    return hypervolume2d([...this.archive.values()], [0, economics.ceiling]);
  }

  private async island(index: number, arch: Arch, initial: Member[], cellPinned: boolean, budgetNew: number) {
    const rng = Rng.from(...seedOf('ga', index, ...this.labels()));
    const pinned = this.pinnedGenes({ cellPinned });
    const before = { hv: this.unionHv(), robust: this.bestRobust() };
    const seen = new Set<string>([...this.archive.keys()]);
    let pop: Member[] = initial.slice(0, this.b.population);

    // fillers: Latin-supercube genomes of the cell (or of the island's architecture)
    if (pop.length < this.b.population) {
      const cell = this.spec.cell ?? { arch, entry: 'rise' as const, gate: 'off' as const };
      const fillers = screenGenomes(this.b.population * 4, cell, this.spec.res, ...this.labels('fill', index));
      const add: Joint[] = [];

      for (const g of fillers) {
        if (pop.length + add.length >= this.b.population) break;

        const j = this.decodeOrNull(g, arch);

        if (!j) continue;
        const id = jointId(j);

        if (seen.has(id)) continue;
        seen.add(id);
        add.push(j);
      }

      const fits = await this.fitMany(add, 'r1', this.b.r1);

      add.forEach((j, i) => {
        const m = this.member(j, fits[i]!);

        this.addArchive(m);
        pop.push(m);
      });
      this.count('fillers', add.length);
    }

    const log1: IslandLog = {
      index,
      arch,
      generations: 0,
      newConfigs: 0,
      duplicates: 0,
      invalid: 0,
      stop: '',
      hvTrajectory: [],
      bestRobustTrajectory: [],
      before,
      after: before
    };
    let bestHv = hypervolume2d(pop, [0, economics.ceiling]);
    let stale = 0;

    for (let gen = 0; gen < this.b.generations; gen++) {
      if (log1.newConfigs >= budgetNew) {
        log1.stop = 'budget';
        break;
      }

      const ranked: Ranked<Member>[] = selectSurvivors(pop, this.b.population);
      const want = Math.min(this.b.population, budgetNew - log1.newConfigs);
      const children: Joint[] = [];
      let attempts = 0;

      while (children.length < want && attempts < want * 50) {
        attempts++;

        const p1 = tournament(ranked, rng).member;
        const p2 = tournament(ranked, rng).member;

        for (const c of this.variation(p1.genome, p2.genome, rng, pinned)) {
          if (children.length >= want) break;

          const g = this.mutate(c, rng, pinned, arch);

          if (cellPinned && this.spec.cell) pinCell(g, this.spec.cell);

          const j = this.decodeOrNull(g, arch);

          if (!j) {
            log1.invalid++;
            continue;
          }

          const id = jointId(j);

          if (seen.has(id)) {
            log1.duplicates++;
            continue;
          }

          seen.add(id);
          children.push(j);
        }
      }

      if (children.length === 0) {
        log1.stop = 'no new configurations';
        break;
      }

      const fits = await this.fitMany(children, 'r1', this.b.r1);
      const kids = children.map((j, i) => this.member(j, fits[i]!));

      for (const k of kids) this.addArchive(k);
      log1.newConfigs += kids.length;
      log1.generations = gen + 1;
      pop = selectSurvivors([...pop, ...kids], this.b.population).map((r) => r.member);

      const hv = hypervolume2d(pop, [0, economics.ceiling]);

      log1.hvTrajectory.push(Math.round(hv));
      log1.bestRobustTrajectory.push(Math.round(this.bestRobust()));

      if (hv > bestHv * (1 + this.b.tolerance) + 1e-9) {
        bestHv = hv;
        stale = 0;
      } else stale++;

      this.lab.setProgress({
        lane: this.spec.key,
        stage: 'island',
        island: index,
        generation: gen + 1,
        newConfigs: log1.newConfigs
      });

      if (stale >= this.b.patience) {
        log1.stop = 'stagnation';
        break;
      }
    }

    if (!log1.stop) log1.stop = log1.newConfigs >= budgetNew ? 'budget' : 'generations';
    log1.after = { hv: this.unionHv(), robust: this.bestRobust() };
    this.islands.push(log1);
    this.count('islandConfigs', log1.newConfigs);
    log(
      `${this.spec.key} island ${index} (${arch}): ${log1.newConfigs} new, ${log1.generations} generations, stop ${log1.stop}`
    );
  }

  // ----- rungs, refinement, shortlist -----

  private topDistinct(members: Member[], k: number, distinct: number) {
    const ordered = rankOrder(members);
    const out: Member[] = [];

    for (const m of ordered) {
      if (out.length >= k) break;
      if (out.some((o) => jointDistance(o.joint, m.joint) < distinct)) continue;
      out.push(m);
    }

    return out;
  }

  private async refine(starts: Fit[]) {
    const results: LaneResult['refinements'] = [];
    const endpoints: Joint[] = [];

    for (const start of starts) {
      let cur = this.configs.get(start.id)!;
      let [curFit] = await this.fitMany([cur], 'refine', this.b.refineN);
      const path: LaneResult['refinements'][number]['path'] = [
        { pass: 0, moved: null, robust: curFit!.nb.robust, violation: curFit!.violation }
      ];

      for (let pass = 1; pass <= this.b.refinePasses; pass++) {
        const self = jointId(cur);
        const moves = [
          ...new Map(
            movesOf(cur)
              .map((m) => this.fixedUp(m))
              .map((m) => [jointId(m), m])
          ).values()
        ].filter((m) => jointId(m) !== self);
        const fits = await this.fitMany(moves, 'refine', this.b.refineN);
        let next: { j: Joint; f: Fit } | null = null;

        this.count('refineMoves', moves.length);

        if (curFit!.violation === 0) {
          const better = fits
            .map((f, i) => ({ f, j: moves[i]! }))
            .filter((x) => x.f.violation === 0 && x.f.nb.robust >= curFit!.nb.robust + this.b.refineMinGain);

          if (better.length) {
            const order = bandedOrder(better.map((x) => ({ id: x.f.id, robust: x.f.nb.robust, p90: x.f.nb.p90Dd, x })));

            next = order[0]!.x;
          }
        } else {
          const better = fits
            .map((f, i) => ({ f, j: moves[i]! }))
            .filter((x) => x.f.violation <= curFit!.violation - 0.01)
            .sort((a, b) => a.f.violation - b.f.violation || byId(a.f, b.f));

          if (better.length) next = better[0]!;
        }

        if (!next) break;
        cur = next.j;
        curFit = next.f;
        path.push({ pass, moved: next.f.id, robust: next.f.nb.robust, violation: next.f.violation });
      }

      results.push({ start: start.id, endpoint: jointId(cur), path });
      if (jointId(cur) !== start.id) endpoints.push(cur);
    }

    return { results, endpoints };
  }

  private shortlist(fits: Fit[]) {
    const best = new Map<string, Fit>(); // one per ledger signature

    for (const f of fits) {
      if (f.violation !== 0) continue;

      const k = f.centre.signature;
      const prev = best.get(k);

      if (!prev || f.nb.robust > prev.nb.robust || (f.nb.robust === prev.nb.robust && f.id < prev.id)) best.set(k, f);
    }

    const feasible = [...best.values()];
    const order = bandedOrder(feasible.map((f) => ({ id: f.id, robust: f.nb.robust, p90: f.nb.p90Dd, f }))).map(
      (x) => x.f
    );
    const picks: (Fit & { pick: string; joint: Joint })[] = [];
    const take = (f: Fit | undefined, pick: string) => {
      if (!f || picks.length >= this.b.shortlist) return;
      if (picks.some((p) => p.id === f.id)) return;

      const j = this.configs.get(f.id)!;

      if (picks.some((p) => jointDistance(p.joint, j) < this.b.distinct)) return;
      picks.push({ ...f, pick, joint: j });
    };

    take(order[0], 'top');

    if (order[0]) {
      const retain = structureOf(this.configs.get(order[0].id)!.g).retain;

      take(
        order.find((f) => structureOf(this.configs.get(f.id)!.g).retain !== retain),
        'exit-alternative'
      );
    }

    take([...feasible].sort((a, b) => b.centre.net - a.centre.net || byId(a, b))[0], 'profit');

    if (order[0]) {
      const floor = 0.5 * order[0].nb.robust;

      take(
        feasible.filter((f) => f.nb.robust >= floor).sort((a, b) => a.nb.p90Dd - b.nb.p90Dd || byId(a, b))[0],
        'lower-drawdown'
      );
    }

    for (const f of order) take(f, 'banded');

    return picks;
  }

  // ----- the lane -----

  async run(): Promise<LaneResult> {
    const s = this.spec;
    const b = this.b;
    let byClass: LaneResult['byClass'] = {};

    this.lab.stage = `${s.key}: start`;
    log(`lane ${s.key} (${s.kind}) starts`);

    if (s.kind === 'informed') {
      // local designs around every seed
      const designs: Joint[] = [];
      const seen = new Set<string>();

      for (const [i, seed] of (s.seeds ?? []).entries()) {
        const local = [
          seed.joint,
          ...neighbourhood(seed.joint, { name: 'local', n: b.local, labels: this.labels('local', i), scale: 1.5 }).map(
            (p) => p.joint
          )
        ];

        for (const j0 of local) {
          const j = this.fixedUp(j0);
          const id = jointId(j);

          if (seen.has(id)) continue;
          seen.add(id);
          designs.push(j);
        }
      }

      this.count('seeds', s.seeds?.length ?? 0);
      this.count('localDesigns', designs.length);
      this.lab.stage = `${s.key}: local designs`;

      const fits = await this.fitMany(designs, 'r1', b.r1);

      designs.forEach((j, i) => this.addArchive(this.member(j, fits[i]!)));

      for (const [i, arch] of (s.islandArchs ?? ['A', 'B']).entries()) {
        const initial = rankOrder([...this.archive.values()].filter((m) => m.joint.a.arch === arch));

        this.lab.stage = `${s.key}: island ${i}`;
        await this.island(i, arch, initial, false, b.newPerIsland);
      }
    } else {
      this.lab.stage = `${s.key}: screen`;

      const sc = await this.screen();

      byClass = sc.byClass;
      this.lab.stage = `${s.key}: rung 1`;

      const fits = await this.fitMany(
        sc.promoted.map((x) => x.joint),
        'r1',
        b.r1
      );

      sc.promoted.forEach((x, i) => this.addArchive(this.member(x.joint, fits[i]!)));

      const r1Ranked = rankOrder([...this.archive.values()]);
      let i = 0;
      let reason = '';

      for (; i < b.islandsMax; i++) {
        const initial = r1Ranked.filter((_m, k) => k % b.islands === i % b.islands);
        const prior = { hv: this.unionHv(), robust: this.bestRobust() };

        this.lab.stage = `${s.key}: island ${i}`;
        await this.island(i, s.cell!.arch, initial, true, b.newPerIsland);

        if (i + 1 < b.islands) continue;

        const after = { hv: this.unionHv(), robust: this.bestRobust() };
        const gain = (x: number, y: number) => (Number.isFinite(x) && x > 0 ? (y - x) / x : y > 0 ? Infinity : 0);
        const hvGain = gain(prior.hv, after.hv);
        const robustGain = gain(prior.robust, after.robust);

        if (!(hvGain > b.saturation || robustGain > b.saturation)) {
          reason = `island ${i} raised the union hypervolume by ${(100 * hvGain).toFixed(1)}% and the best robust net by ${(100 * robustGain).toFixed(1)}% (≤ ${100 * b.saturation}%)`;
          i++;
          break;
        }

        reason = `island ${i} raised the union hypervolume by ${(100 * hvGain).toFixed(1)}% or the best robust net by ${(100 * robustGain).toFixed(1)}%`;
      }

      this.counts.islandsRun = this.islands.length;
      this.saturation = {
        islands: this.islands.length,
        saturated: this.islands.length < b.islandsMax || reason.includes('≤'),
        reason
      };
    }

    // rung 2 and rung 3
    this.lab.stage = `${s.key}: rung 2`;

    const r2Members = this.topDistinct([...this.archive.values()], b.r2Keep, b.r2Distinct);
    const r2Fits = await this.fitMany(
      r2Members.map((m) => m.joint),
      'r2',
      b.r2
    );
    const r2 = r2Members.map((m, i) => this.member(m.joint, r2Fits[i]!, m.genome));

    this.lab.stage = `${s.key}: rung 3`;

    const r3Members = this.topDistinct(r2, b.r3Keep, b.r3Distinct);
    const r3Fits = await this.fitMany(
      r3Members.map((m) => m.joint),
      'r3',
      b.r3
    );

    // refinement from the banded order of the feasible rung-3 fits, then the infeasible by violation
    this.lab.stage = `${s.key}: refine`;

    const feasible3 = bandedOrder(
      r3Fits.filter((f) => f.violation === 0).map((f) => ({ id: f.id, robust: f.nb.robust, p90: f.nb.p90Dd, f }))
    ).map((x) => x.f);
    const infeasible3 = r3Fits.filter((f) => f.violation > 0).sort((a, b) => a.violation - b.violation || byId(a, b));
    const starts: Fit[] = [];

    for (const f of [...feasible3, ...infeasible3]) {
      if (starts.length >= b.refineStarts) break;
      if (starts.some((x) => jointDistance(this.configs.get(x.id)!, this.configs.get(f.id)!) < b.refineDistinct))
        continue;
      starts.push(f);
    }

    const ref = await this.refine(starts);
    const endFits = await this.fitMany(ref.endpoints, 'r3', b.r3);
    const allR3 = [...r3Fits, ...endFits];
    const list = this.shortlist(allR3);
    const infeasible = [...allR3, ...[...this.archive.values()].map((m) => m.fit)]
      .filter((f) => f.violation > 0)
      .sort((a, b) => b.centre.net - a.centre.net || byId(a, b));
    const vis: LaneResult['visibleInfeasible'] = [];

    for (const f of infeasible) {
      if (vis.length >= 5) break;
      if (vis.some((v) => v.id === f.id)) continue;
      vis.push({
        id: f.id,
        joint: this.configs.get(f.id)!,
        centreNet: f.centre.net,
        centreDd: f.centre.dd,
        p90: f.nb.p90Dd,
        parts: f.parts
      });
    }

    this.count('r1Centres', this.archive.size);
    this.count('r1Feasible', [...this.archive.values()].filter((m) => m.violation === 0).length);
    this.count('r2', r2.length);
    this.count('r2Feasible', r2.filter((m) => m.violation === 0).length);
    this.count('r3', allR3.length);
    this.count('r3Feasible', allR3.filter((f) => f.violation === 0).length);
    this.count('shortlist', list.length);
    log(
      `lane ${s.key}: ${this.archive.size} rung-1 centres, ${this.counts.r1Feasible} feasible; shortlist ${list.length}`
    );

    return {
      key: s.key,
      kind: s.kind,
      cell: s.cell ? cellName(s.cell) : null,
      counts: this.counts,
      byClass,
      islands: this.islands,
      saturation: this.saturation,
      r2: r2.map((m) => ({ id: m.id, feasible: m.violation === 0, robust: m.fit.nb.robust, p90: m.fit.nb.p90Dd })),
      r3: allR3.map((f) => ({ id: f.id, feasible: f.violation === 0, robust: f.nb.robust, p90: f.nb.p90Dd })),
      refinements: ref.results,
      shortlist: list,
      visibleInfeasible: vis,
      frontier: [...this.archive.values()].map((m) => ({
        id: m.id,
        robust: m.fit.nb.robust,
        p90: m.fit.nb.p90Dd,
        net: m.fit.centre.net,
        dd: m.fit.centre.dd,
        feasible: m.violation === 0
      }))
    };
  }

  saturation: LaneResult['saturation'] = { islands: 0, saturated: true, reason: 'not applicable' };
}

export const classKey = (j: Joint) => {
  const c = classOf(j);

  return `${c.cell}|hold ${c.hold}|retain ${c.retain}`;
};

export { cellOf, activeGenes };
