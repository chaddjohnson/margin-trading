// The searches (PROTOCOL.md §7): Growth·GDX ONLY, beside one arm's frozen anchors. Study 8's pipeline as Priorities 3
// and 3B used it, restricted to the GDX genome (58 genes at the fine step):
//
// - broad-<entry> (a protected entry cell, rise | breakout): a Latin-supercube Sobol screen of the GDX genome over its
//   broad canonical boxes (this study's seed namespace) with the entry pinned and the gate × trend × (Rise) eligibility
//   × maximum-hold strata round-robin → promotion (¼ centre net among the plausible, ¼ constrained rank on (−net, DD),
//   the rest max-min diversity; one per funded ledger) → rung 1 (16 whole-portfolio neighbours; centre-first) →
//   NSGA-II islands on (−centre net, −robust net, p90 DD) with the frozen extension rule → rung 2 (64) → rung 3 (128) →
//   refinement (robust and profit starts) → the lane shortlist.
// - seeded: the cutoff's informed GDX seeds (each unchanged, plus near (scale 1.5) and broad (scale 3) GDX-only designs
//   around it) → rung 1 → islands (entry free) → rungs → refinement → shortlist.
//
// Only Growth·GDX is ever mutated; every evaluated configuration carries the arm's anchors exactly (checked). The rung
// neighbourhoods are WHOLE-PORTFOLIO ('joint'): they really move the anchor books as well (the A1 distinction of
// Priority 3B, specified here before the run). Every stage is a deterministic function of its seed labels and of the
// evaluations it requests; with the archive this makes a rerun an exact replay (lab.ts).
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
import { rngState } from '../growth140-vgt-s8m/checkpoint.ts';
import { rankOrder } from '../study8-expanded-regime-d1/search.ts';
import type { Rec } from '../vg-d1-growth-joint/evaluate.ts';
import { economics, log, seedOf } from './context.ts';
import type { Seed } from './controls.ts';
import { type Fit, type Nb, bandedOrder, fitOf, nbStats, p90Of, plausible, robustOf } from './fitness.ts';
import type { Lab } from './lab.ts';
import {
  type Anchor,
  type Arm,
  type Entry,
  type GConfig,
  type Genome,
  build,
  canonicalGdx,
  classOf,
  coarseClassOf,
  decodeGdx,
  encodeGdx,
  gId,
  gdxDistance,
  gdxMoves,
  gene,
  levels,
  nS,
  numericGenes,
  pinEntry,
  pinStratum,
  rowsOf,
  screenGenomes,
  structureOf
} from './space.ts';

export type LaneKind = 'broad' | 'seeded';

export interface Budget {
  screen: number; // broad: screened proposals
  promote: number; // broad: promoted to rung 1
  near: number; // seeded: GDX-only designs per seed at scale 1.5
  broad: number; // seeded: GDX-only designs per seed at scale 3
  islands: number; // base islands
  islandsMax: number; // with extensions
  population: number;
  newPerIsland: number; // new distinct proposals per island (its cap)
  generations: number;
  patience: number;
  tolerance: number;
  extNet: number; // extension trigger: the best feasible centre net rose by ≥ this ($)
  extRobust: number; // … the best feasible robust net rose by ≥ this ($)
  extHv: number; // … the union hypervolume of (−robust, p90) rose by more than this share
  r1: number;
  r2Keep: number;
  r2: number;
  r2Distinct: number;
  r3Keep: number;
  r3: number;
  r3Distinct: number;
  refinePasses: number;
  refineN: number;
  refineMinGain: number;
  refineDistinct: number;
  shortlist: number;
  distinct: number;
}

export interface LaneSpec {
  key: string; // e.g. C24/R/broad-rise
  cutoff: string;
  arm: Arm;
  anchor: Anchor;
  kind: LaneKind;
  entry?: Entry;
  seeds?: Seed[];
}

export const ga = { crossoverProbability: 0.9, crossoverEta: 15, mutationEta: 20 };

const spaceOf = (lv: readonly number[], name: string): ParameterSpace => ({
  name,
  specs: lv.map((n, i) => ({
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
  gdx: GConfig;
  fit: Fit;
  origin: string;
}

export interface IslandLog {
  index: number;
  generations: number;
  newConfigs: number;
  measured: number;
  duplicates: number;
  invalid: number;
  evaluations: number;
  stop: string;
  hvTrajectory: number[];
  bestRobustTrajectory: number[];
  bestNetTrajectory: number[];
  before: LaneState;
  after: LaneState;
  hvGainPer10k: number;
}

interface LaneState {
  hv: number;
  robust: number;
  net: number;
}

export interface Pick extends Fit {
  pick: string;
  gdx: GConfig;
  origin: string;
}

export interface LaneResult {
  key: string;
  arm: Arm;
  kind: LaneKind;
  entry: Entry | null;
  counts: Record<string, number>;
  byOrigin: Record<string, { centres: number; plausible: number; feasible: number }>;
  byClass: Record<
    string,
    { screened: number; plausible: number; promoted: number; measured: number; feasible: number }
  >;
  ledgers: { centres: number; feasible: number; baselineEquivalent: number };
  requested: number;
  islands: IslandLog[];
  extension: { islands: number; reason: string; stop: string };
  r2: { id: string; feasible: boolean; net: number; robust: number; p90: number; why: string; origin: string }[];
  r3: { id: string; feasible: boolean; net: number; robust: number; p90: number; origin: string }[];
  refinements: {
    kind: string;
    start: string;
    endpoint: string;
    path: { pass: number; moved: string | null; net: number; robust: number; violation: number }[];
  }[];
  shortlist: Pick[];
  visibleInfeasible: {
    id: string;
    gdx: GConfig;
    centreNet: number;
    centreDd: number;
    p90: number;
    parts: Record<string, number>;
  }[];
  frontier: { id: string; net: number; robust: number; p90: number; dd: number; gdxLots: number }[];
  topByNet: {
    id: string;
    net: number;
    robust: number;
    p90: number;
    dd: number;
    feasible: boolean;
    gdxLots: number;
    origin: string;
  }[];
}

const byId = (a: { id: string }, b: { id: string }) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
const hvPoints = (ms: readonly Member[]): Scored[] =>
  ms.map((m) => ({
    id: m.id,
    genome: m.genome,
    violation: m.violation,
    objectives: [m.objectives[1]!, m.objectives[2]!]
  }));

// The seeded lane's designs (deterministic, no evaluation): every seed unchanged, then per seed `near` GDX-only rows at
// scale 1.5 and `broad` rows at scale 3 around it (labels ('near' | 'broad', seed index, lane key)); duplicates dropped.
export const seedDesigns = (spec: LaneSpec, near: number, broad: number) => {
  const designs: { g: GConfig; origin: 'seed' | 'design' }[] = [];
  const seen = new Set<string>();
  const push = (g0: GConfig, origin: 'seed' | 'design') => {
    let g: GConfig;

    try {
      g = canonicalGdx(g0);
    } catch {
      return;
    }

    const id = gId(g);

    if (seen.has(id)) return;
    seen.add(id);
    designs.push({ g, origin });
  };

  for (const [i, seed] of (spec.seeds ?? []).entries()) {
    push(seed.gdx, 'seed');

    const centre = build(spec.anchor, seed.gdx);

    if (near > 0)
      for (const r of rowsOf(centre, {
        name: 'near',
        n: near,
        labels: ['near', i, spec.key],
        scope: 'gdx',
        scale: 1.5
      }))
        push(r.quad.g.GDX, 'design');
    if (broad > 0)
      for (const r of rowsOf(centre, {
        name: 'broad',
        n: broad,
        labels: ['broad', i, spec.key],
        scope: 'gdx',
        scale: 3
      }))
        push(r.quad.g.GDX, 'design');
  }

  return designs;
};

export class Lane {
  private readonly archive = new Map<string, Member>(); // rung-1 fits of the lane
  private readonly gdxById = new Map<string, GConfig>();
  private readonly originById = new Map<string, string>();
  readonly counts: Record<string, number> = {};
  private readonly islands: IslandLog[] = [];
  private readonly byClass: LaneResult['byClass'] = {};
  private readonly byOrigin: LaneResult['byOrigin'] = {};
  private readonly ledgerAll = new Set<string>();
  private readonly ledgerFeasible = new Set<string>();
  private baselineSignature: string | null = null;
  private anchorVgt: string | null = null;
  private baselineEquivalent = 0;
  private readonly genomes = new Map<string, Genome>();
  extension: LaneResult['extension'] = { islands: 0, reason: 'not applicable', stop: 'not applicable' };
  requested = 0;

  constructor(
    private readonly lab: Lab,
    readonly spec: LaneSpec,
    readonly b: Budget
  ) {}

  private count(k: string, n = 1) {
    this.counts[k] = (this.counts[k] ?? 0) + n;
  }

  private labels = (...parts: (string | number)[]) => [...parts, this.spec.key];
  // common random numbers across every centre, lane and arm of the cutoff
  private crn = (rung: string) => [rung, this.spec.cutoff];

  private decodeOrNull(g: Genome): GConfig | null {
    try {
      return decodeGdx(g);
    } catch {
      return null;
    }
  }

  private cls(g: GConfig) {
    return coarseClassOf(g);
  }

  // the baseline's centre ledger (a partner whose funded ledger equals it is behaviourally the baseline)
  async baseline() {
    if (this.baselineSignature) return this.baselineSignature;

    const b = build(this.spec.anchor, null);
    const [r] = await this.lab.evalMany([{ quad: b.quad, options: b.options }], 'baseline');

    this.baselineSignature = r!.signature;
    return this.baselineSignature;
  }

  // ----- fits: the centre first; the unique whole-portfolio neighbours under the rung's common family only for a
  // plausible centre (centre-first fidelity) unless `full` -----

  async fitMany(gdxs: readonly GConfig[], rung: string, n: number, full = false, origin = rung): Promise<Fit[]> {
    const built = gdxs.map((g) => build(this.spec.anchor, g));

    // every evaluated configuration carries the arm's anchors exactly
    this.anchorVgt ??= gId(this.spec.anchor.vgt);
    for (const x of built)
      if (
        x.cfg.arm !== this.spec.arm ||
        gId(x.quad.g.VGT) !== this.anchorVgt ||
        JSON.stringify(x.quad.d1) !== JSON.stringify(this.spec.anchor.d1) ||
        x.enabled.join() !== [...this.spec.anchor.books, 'G:GDX'].sort().join()
      )
        throw new Error(`${this.spec.key}: a configuration does not carry the arm's anchors`);

    const centres = await this.lab.evalMany(
      built.map((x) => ({ quad: x.quad, options: x.options })),
      `${rung}:centre`
    );

    this.requested += built.length;

    const fam = { name: rung, n, labels: this.crn(rung), scope: 'joint' as const };
    const plans = built.map((x, i) =>
      !full && !plausible(this.spec.anchor, centres[i]!) ? null : rowsOf(x, fam).filter((r) => !r.dup)
    );
    const items = plans.flatMap((p) => (p ?? []).map((r) => ({ quad: r.quad, options: r.options })));
    const recs = await this.lab.evalMany(items, `${rung}:neighbours`);

    this.requested += items.length;

    const out: Fit[] = [];
    let at = 0;

    built.forEach((x, i) => {
      const centre = centres[i]!;
      const p = plans[i];
      let nb: Nb | null = null;

      if (p) {
        const nbs: Rec[] = p.map(() => recs[at++]!);

        nb = nbStats(
          centre,
          nbs,
          p.map((r) => r.clipped)
        );
      }
      out.push(fitOf(this.spec.anchor, rung, x.id, centre, nb));
      if (!this.gdxById.has(x.id)) {
        this.gdxById.set(x.id, x.cfg.gdx!);
        this.originById.set(x.id, origin);
        this.lab.store.write('configs', x.id, { arm: this.spec.arm, gdx: x.cfg.gdx, origin, lane: this.spec.key });
      }
    });

    return out;
  }

  private member(g: GConfig, f: Fit, genome?: Genome): Member {
    const gen = genome ?? this.genomes.get(f.id) ?? encodeGdx(g);

    if (!this.genomes.has(f.id)) this.genomes.set(f.id, gen);
    return {
      id: f.id,
      genome: gen,
      objectives: f.objectives,
      violation: f.violation,
      gdx: g,
      fit: f,
      origin: this.originById.get(f.id) ?? 'unknown'
    };
  }

  private addArchive(m: Member) {
    if (this.archive.has(m.id)) return;
    this.archive.set(m.id, m);

    const k = (this.byClass[this.cls(m.gdx)] ??= { screened: 0, plausible: 0, promoted: 0, measured: 0, feasible: 0 });
    const o = (this.byOrigin[m.origin] ??= { centres: 0, plausible: 0, feasible: 0 });

    if (m.fit.nb) k.measured++;
    if (m.violation === 0) k.feasible++;
    o.centres++;
    if (plausible(this.spec.anchor, m.fit.centre)) o.plausible++;
    if (m.violation === 0) o.feasible++;
    this.ledgerAll.add(m.fit.centre.signature);
    if (m.fit.centre.signature === this.baselineSignature) this.baselineEquivalent++;
    if (m.violation === 0) this.ledgerFeasible.add(m.fit.centre.signature);
  }

  // ----- screen and promotion (broad lanes) -----

  private async screen() {
    const entry = this.spec.entry!;
    const genomes = screenGenomes(this.b.screen, ...this.labels('screen')).map((g, i) =>
      pinStratum(pinEntry(g, entry), entry, i)
    );
    const seen = new Set<string>();
    const gdxs: GConfig[] = [];
    const gs: Genome[] = [];

    for (const g of genomes) {
      const c = this.decodeOrNull(g);

      if (!c) {
        this.count('screenInvalid');
        continue;
      }

      const id = gId(c);

      if (seen.has(id)) {
        this.count('screenDuplicate');
        continue;
      }

      seen.add(id);
      gdxs.push(c);
      gs.push(g);
    }

    this.count('screened', genomes.length);
    this.count('screenUnique', gdxs.length);

    const built = gdxs.map((g) => build(this.spec.anchor, g));
    const recs = await this.lab.evalMany(
      built.map((x) => ({ quad: x.quad, options: x.options })),
      'screen'
    );

    this.requested += built.length;

    const items = built.map((x, i) => {
      const r = recs[i]!;
      const ok = plausible(this.spec.anchor, r);
      const violation = ok
        ? 0
        : (r.error ? 1 : Math.max(0, -r.net) / economics.budget + (r.net > 0 ? 0 : 0.01)) +
          Math.max(0, r.dd - economics.ceiling) / economics.ceiling +
          (r.books['G:GDX'].lots > 0 ? 0 : 0.5);
      const k = (this.byClass[this.cls(x.cfg.gdx!)] ??= {
        screened: 0,
        plausible: 0,
        promoted: 0,
        measured: 0,
        feasible: 0
      });

      k.screened++;
      if (ok) k.plausible++;
      if (r.signature === this.baselineSignature) this.count('screenBaselineEquivalent');
      this.genomes.set(x.id, gs[i]!);
      this.originById.set(x.id, 'screen');

      return {
        id: x.id,
        genome: gs[i]!,
        objectives: [-r.net, r.dd],
        violation,
        gdx: x.cfg.gdx!,
        plausible: ok,
        net: r.net,
        signature: r.signature
      };
    });

    this.count('plausible', items.filter((x) => x.plausible).length);

    const k = Math.min(this.b.promote, items.length);
    const chosen = new Map<string, (typeof items)[number]>();
    const ledgers = new Set<string>(this.baselineSignature ? [this.baselineSignature] : []);
    const takeFrom = (list: typeof items, cap: number, why: string) => {
      let n = 0;

      for (const x of list) {
        if (n >= cap || chosen.size >= k) break;
        if (chosen.has(x.id) || ledgers.has(x.signature)) continue;
        chosen.set(x.id, x);
        ledgers.add(x.signature);
        this.count(`promoted:${why}`);
        n++;
      }
    };
    const byNet = items.filter((x) => x.plausible).sort((a, b) => b.net - a.net || byId(a, b));

    takeFrom(byNet, Math.ceil(k / 4), 'net');
    takeFrom(rankOrder(items), Math.ceil(k / 4), 'rank');

    const pool = [...items.filter((x) => x.plausible), ...items.filter((x) => !x.plausible)].filter(
      (x) => !chosen.has(x.id)
    );

    while (chosen.size < k && pool.length) {
      let best = 0;
      let bestD = -1;

      for (let i = 0; i < pool.length; i++) {
        let d = Infinity;

        for (const c of chosen.values()) {
          d = Math.min(d, gdxDistance(pool[i]!.gdx, c.gdx));
          if (d <= bestD) break;
        }
        if (d > bestD + 1e-12 || (Math.abs(d - bestD) <= 1e-12 && pool[i]!.id < pool[best]!.id)) {
          bestD = d;
          best = i;
        }
      }

      chosen.set(pool[best]!.id, pool[best]!);
      this.count('promoted:diversity');
      pool.splice(best, 1);
    }

    for (const x of chosen.values()) this.byClass[this.cls(x.gdx)]!.promoted++;
    this.count('promoted', chosen.size);
    return [...chosen.values()];
  }

  // ----- NSGA-II islands -----

  private pinned(): Set<number> {
    return new Set<number>(this.spec.entry ? [gene.entry] : []);
  }

  private variation(a: Genome, b: Genome, rng: Rng, pinned: Set<number>) {
    const ca = [...a];
    const cb = [...b];

    if (rng.next() <= ga.crossoverProbability)
      for (let i = 0; i < nS; i++) {
        if (pinned.has(i)) continue;
        if (rng.next() < 0.5) [ca[i], cb[i]] = [cb[i]!, ca[i]!];
      }

    const lv = levels.slice(nS);
    const num = sbx(spaceOf(lv, 'num'), a.slice(nS), b.slice(nS), rng, ga);

    for (let i = 0; i < lv.length; i++) {
      ca[nS + i] = num.children[0]![i]!;
      cb[nS + i] = num.children[1]![i]!;
    }

    return [ca, cb];
  }

  private mutate(g: Genome, rng: Rng, pinned: Set<number>): Genome {
    const out = [...g];
    const c = this.decodeOrNull(g);
    const active: number[] = [];

    if (c) {
      const st = structureOf(c);

      numericGenes.forEach((gn, i) => {
        if (gn.active(st)) active.push(nS + i);
      });
    } else for (let i = 0; i < numericGenes.length; i++) active.push(nS + i);

    const m = polynomialMutation(
      spaceOf(
        active.map((i) => levels[i]!),
        'active'
      ),
      active.map((i) => out[i]!),
      rng,
      ga
    );

    active.forEach((i, x) => (out[i] = m.genome[x]!));

    const cats = Array.from({ length: nS }, (_v, i) => i).filter((i) => !pinned.has(i));

    for (const i of cats)
      if (rng.next() < 1 / Math.max(1, cats.length)) {
        const n = levels[i]!;
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

  private state(): LaneState {
    return {
      hv: hypervolume2d(hvPoints([...this.archive.values()]), [0, economics.ceiling]),
      robust: this.best((m) => robustOf(m.fit)),
      net: this.best((m) => m.fit.centre.net)
    };
  }

  private async island(index: number, initial: Member[], budgetNew: number) {
    const rng = Rng.from(...seedOf('ga', index, ...this.labels()));
    const pinned = this.pinned();
    const before = this.state();
    const req0 = this.requested;
    const seen = new Set<string>([...this.archive.keys()]);
    let pop: Member[] = initial.slice(0, this.b.population);

    if (pop.length < this.b.population) {
      const fillers = screenGenomes(this.b.population * 4, ...this.labels('fill', index)).map((g, i) =>
        this.spec.entry ? pinStratum(pinEntry(g, this.spec.entry), this.spec.entry, i) : g
      );
      const add: { c: GConfig; g: Genome }[] = [];

      for (const g of fillers) {
        if (pop.length + add.length >= this.b.population) break;

        const c = this.decodeOrNull(g);

        if (!c) continue;

        const id = build(this.spec.anchor, c).id;

        if (seen.has(id)) continue;
        seen.add(id);
        add.push({ c, g });
      }

      const fits = await this.fitMany(
        add.map((x) => x.c),
        'r1',
        this.b.r1,
        false,
        'filler'
      );

      add.forEach((x, i) => {
        const m = this.member(x.c, fits[i]!, x.g);

        this.addArchive(m);
        pop.push(m);
      });
      this.count('fillers', add.length);
    }

    const lg: IslandLog = {
      index,
      generations: 0,
      newConfigs: 0,
      measured: 0,
      duplicates: 0,
      invalid: 0,
      evaluations: 0,
      stop: '',
      hvTrajectory: [],
      bestRobustTrajectory: [],
      bestNetTrajectory: [],
      before,
      after: before,
      hvGainPer10k: 0
    };
    let bestHv = hypervolume2d(hvPoints(pop), [0, economics.ceiling]);
    let bestNet = before.net;
    let stale = 0;

    for (let gen = 0; gen < this.b.generations; gen++) {
      if (lg.newConfigs >= budgetNew) {
        lg.stop = 'budget';
        break;
      }

      const ranked: Ranked<Member>[] = selectSurvivors(pop, this.b.population);
      const want = Math.min(this.b.population, budgetNew - lg.newConfigs);
      const children: { c: GConfig; g: Genome }[] = [];
      let attempts = 0;

      while (children.length < want && attempts < want * 50) {
        attempts++;

        const p1 = tournament(ranked, rng).member;
        const p2 = tournament(ranked, rng).member;

        for (const x of this.variation(p1.genome, p2.genome, rng, pinned)) {
          if (children.length >= want) break;

          const g = this.mutate(x, rng, pinned);

          if (this.spec.entry) pinEntry(g, this.spec.entry);

          const c = this.decodeOrNull(g);

          if (!c) {
            lg.invalid++;
            continue;
          }

          const id = build(this.spec.anchor, c).id;

          if (seen.has(id)) {
            lg.duplicates++;
            continue;
          }

          seen.add(id);
          children.push({ c, g });
        }
      }

      if (children.length === 0) {
        lg.stop = 'no new configurations';
        break;
      }

      const fits = await this.fitMany(
        children.map((x) => x.c),
        'r1',
        this.b.r1,
        false,
        'island'
      );
      const kids = children.map((x, i) => this.member(x.c, fits[i]!, x.g));

      for (const k of kids) this.addArchive(k);
      lg.newConfigs += kids.length;
      lg.measured += kids.filter((k) => k.fit.nb).length;
      lg.generations = gen + 1;
      pop = selectSurvivors([...pop, ...kids], this.b.population).map((r) => this.archive.get(r.member.id)!);

      const hv = hypervolume2d(hvPoints(pop), [0, economics.ceiling]);
      const net = this.best((m) => m.fit.centre.net);

      lg.hvTrajectory.push(Math.round(hv));
      lg.bestRobustTrajectory.push(Math.round(this.best((m) => robustOf(m.fit))));
      lg.bestNetTrajectory.push(Math.round(net));

      const gained =
        hv > bestHv * (1 + this.b.tolerance) + 1e-9 || net > bestNet + Math.abs(bestNet) * this.b.tolerance + 1e-9;

      if (hv > bestHv) bestHv = hv;
      if (net > bestNet) bestNet = net;
      stale = gained ? 0 : stale + 1;

      this.lab.checkpoint({
        [`lane ${this.spec.key}`]: {
          stage: 'island',
          island: index,
          generation: gen + 1,
          newConfigs: lg.newConfigs,
          rng: rngState(rng),
          archive: this.archive.size,
          best: {
            net: Math.round(this.best((m) => m.fit.centre.net)),
            robust: Math.round(this.best((m) => robustOf(m.fit)))
          }
        }
      });

      if (stale >= this.b.patience) {
        lg.stop = 'stagnation';
        break;
      }
    }

    if (!lg.stop) lg.stop = lg.newConfigs >= budgetNew ? 'budget' : 'generations';
    lg.after = this.state();
    lg.evaluations = this.requested - req0;
    lg.hvGainPer10k =
      lg.evaluations > 0 ? Math.round(((lg.after.hv - lg.before.hv) / lg.evaluations) * 1e4 * 100) / 100 : 0;
    this.islands.push(lg);
    this.count('islandConfigs', lg.newConfigs);
    log(
      `${this.spec.key} island ${index}: ${lg.newConfigs} new (${lg.measured} measured), ${lg.generations} generations, stop ${lg.stop}`
    );
  }

  // ----- rungs: ¼ centre net (feasible), ¼ robust net (feasible), the rest constrained rank; distinct, one per ledger -----

  private promote(members: Member[], k: number, distinct: number) {
    const ranked = rankOrder(members);
    const feasible = members.filter((m) => m.violation === 0);
    const byNet = [...feasible].sort((a, b) => b.fit.centre.net - a.fit.centre.net || byId(a, b));
    const byRobust = [...feasible].sort((a, b) => robustOf(b.fit) - robustOf(a.fit) || byId(a, b));
    const out: { m: Member; why: string }[] = [];
    const take = (q: Member[], why: string, cap: number) => {
      let n = 0;

      for (const m of q) {
        if (out.length >= k || n >= cap) break;
        if (
          out.some(
            (o) =>
              o.m.id === m.id ||
              o.m.fit.centre.signature === m.fit.centre.signature ||
              gdxDistance(o.m.gdx, m.gdx) < distinct
          )
        )
          continue;
        out.push({ m, why });
        n++;
      }
    };

    take(byNet, 'centre net', Math.ceil(k / 4));
    take(byRobust, 'robust net', Math.ceil(k / 4));
    take(ranked, 'rank', k);
    take(byNet, 'centre net', k);
    return out;
  }

  // ----- refinement (GDX moves only) -----

  private async refine(starts: { fit: Fit; kind: 'robust' | 'profit' }[]) {
    const results: LaneResult['refinements'] = [];
    const endpoints: GConfig[] = [];

    for (const start of starts) {
      let cur = this.gdxById.get(start.fit.id)!;
      let [curFit] = await this.fitMany([cur], 'refine', this.b.refineN, true, 'refine');
      const path: LaneResult['refinements'][number]['path'] = [
        { pass: 0, moved: null, net: curFit!.centre.net, robust: robustOf(curFit!), violation: curFit!.violation }
      ];

      for (let pass = 1; pass <= this.b.refinePasses; pass++) {
        const moves = gdxMoves(cur);
        const fits = await this.fitMany(moves, 'refine', this.b.refineN, false, 'refine');
        const scored = fits.map((f, i) => ({ f, c: moves[i]! }));
        let next: { c: GConfig; f: Fit } | null = null;

        this.count('refineMoves', moves.length);

        if (curFit!.violation === 0) {
          if (start.kind === 'robust') {
            const better = scored.filter(
              (x) => x.f.violation === 0 && robustOf(x.f) >= robustOf(curFit!) + this.b.refineMinGain
            );

            if (better.length)
              next = bandedOrder(better.map((x) => ({ id: x.f.id, robust: robustOf(x.f), p90: p90Of(x.f), x })))[0]!.x;
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
        cur = next.c;
        curFit = next.f;
        path.push({
          pass,
          moved: next.f.id,
          net: next.f.centre.net,
          robust: robustOf(next.f),
          violation: next.f.violation
        });
      }

      const endId = build(this.spec.anchor, cur).id;

      results.push({ kind: start.kind, start: start.fit.id, endpoint: endId, path });
      if (endId !== start.fit.id) endpoints.push(cur);
    }

    return { results, endpoints };
  }

  // ----- the shortlist (structural slots; feasible only, one per ledger, never the baseline's ledger) -----

  private shortlist(fits: Fit[]) {
    const best = new Map<string, Fit>();

    for (const f of fits) {
      if (f.violation !== 0 || f.centre.signature === this.baselineSignature) continue;

      const k = f.centre.signature;
      const prev = best.get(k);

      if (!prev || f.centre.net > prev.centre.net || (f.centre.net === prev.centre.net && f.id < prev.id))
        best.set(k, f);
    }

    const feasible = [...best.values()];
    const picks: Pick[] = [];
    const gdxOf = (f: Fit) => this.gdxById.get(f.id)!;
    const take = (f: Fit | undefined, pick: string) => {
      if (!f || picks.length >= this.b.shortlist) return;
      if (picks.some((p) => p.id === f.id)) return;

      const g = gdxOf(f);

      if (picks.some((p) => gdxDistance(p.gdx, g) < this.b.distinct)) return;
      picks.push({ ...f, pick, gdx: g, origin: this.originById.get(f.id) ?? 'unknown' });
    };
    const byNet = [...feasible].sort((a, b) => b.centre.net - a.centre.net || byId(a, b));
    const gateOf = (g: GConfig) => structureOf(g).gate;

    take(byNet[0], 'profit');
    take([...feasible].sort((a, b) => robustOf(b) - robustOf(a) || byId(a, b))[0], 'robust');
    take(
      [...feasible].sort(
        (a, b) => robustOf(b) / Math.max(1, p90Of(b)) - robustOf(a) / Math.max(1, p90Of(a)) || byId(a, b)
      )[0],
      'balanced'
    );
    if (picks[0]) {
      const gate = gateOf(picks[0].gdx);

      take(
        byNet.find((f) => gateOf(gdxOf(f)) !== gate),
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

    log(`lane ${s.key} (${s.kind}) starts`);
    await this.baseline();

    if (s.kind === 'seeded') {
      const designs = seedDesigns(s, b.near, b.broad);

      this.count('seeds', s.seeds?.length ?? 0);
      this.count('seedDesigns', designs.length);

      const seedsOnly = designs.filter((d) => d.origin === 'seed');
      const designsOnly = designs.filter((d) => d.origin === 'design');
      const f1 = await this.fitMany(
        seedsOnly.map((d) => d.g),
        'r1',
        b.r1,
        false,
        'seed'
      );
      const f2 = await this.fitMany(
        designsOnly.map((d) => d.g),
        'r1',
        b.r1,
        false,
        'design'
      );

      seedsOnly.forEach((d, i) => this.addArchive(this.member(d.g, f1[i]!)));
      designsOnly.forEach((d, i) => this.addArchive(this.member(d.g, f2[i]!)));
    } else {
      const promoted = await this.screen();
      const fits = await this.fitMany(
        promoted.map((x) => x.gdx),
        'r1',
        b.r1,
        false,
        'screen'
      );

      promoted.forEach((x, i) => this.addArchive(this.member(x.gdx, fits[i]!, x.genome)));
    }

    // the islands with the frozen extension rule
    const r1Ranked = rankOrder([...this.archive.values()]);
    let reason = '';
    let stop = '';

    for (let i = 0; i < b.islandsMax; i++) {
      const initial = r1Ranked.filter((_m, k) => k % b.islands === i % b.islands);
      const prior = this.state();

      await this.island(i, initial, b.newPerIsland);

      if (i + 1 < b.islands) continue;

      const after = this.state();
      const fin = (x: number) => (Number.isFinite(x) ? x : 0);
      const triggers = {
        net: fin(after.net) - fin(prior.net),
        robust: fin(after.robust) - fin(prior.robust),
        hypervolume: prior.hv > 0 ? (after.hv - prior.hv) / prior.hv : after.hv > 0 ? Infinity : 0
      };
      const fired = triggers.net >= b.extNet || triggers.robust >= b.extRobust || triggers.hypervolume > b.extHv;

      reason = `island ${i}: best centre net +$${Math.round(triggers.net)}, best robust +$${Math.round(triggers.robust)}, hypervolume ${(100 * triggers.hypervolume).toFixed(2)}%`;

      if (!fired) {
        stop = 'triggers not met';
        break;
      }
      if (i + 1 >= b.islandsMax) stop = 'extension cap reached';
    }

    this.counts.islandsRun = this.islands.length;
    this.extension = { islands: this.islands.length, reason, stop: stop || 'extension cap reached' };

    // rung 2 and rung 3
    const r2Picks = this.promote([...this.archive.values()], b.r2Keep, b.r2Distinct);
    const r2Fits = await this.fitMany(
      r2Picks.map((x) => x.m.gdx),
      'r2',
      b.r2,
      true
    );
    const r2 = r2Picks.map((x, k) => ({ m: this.member(x.m.gdx, r2Fits[k]!, x.m.genome), why: x.why }));
    const r3Picks = this.promote(
      r2.map((x) => x.m),
      b.r3Keep,
      b.r3Distinct
    );
    const r3Fits = await this.fitMany(
      r3Picks.map((x) => x.m.gdx),
      'r3',
      b.r3,
      true
    );

    // refinement starts: robust (the banded order of the feasible rung 3) and profit (the highest feasible rung-3 centre
    // net); without a feasible rung-3 fit, the least violation
    const feasible3 = r3Fits.filter((f) => f.violation === 0);
    const infeasible3 = r3Fits.filter((f) => f.violation > 0).sort((a, c) => a.violation - c.violation || byId(a, c));
    const starts: { fit: Fit; kind: 'robust' | 'profit' }[] = [];

    for (const kind of ['robust', 'profit'] as const) {
      const order =
        kind === 'robust'
          ? bandedOrder(feasible3.map((f) => ({ id: f.id, robust: robustOf(f), p90: p90Of(f), f }))).map((x) => x.f)
          : [...feasible3].sort((a, c) => c.centre.net - a.centre.net || byId(a, c));

      for (const f of [...order, ...infeasible3]) {
        if (
          starts.some(
            (x) =>
              x.fit.id === f.id || gdxDistance(this.gdxById.get(x.fit.id)!, this.gdxById.get(f.id)!) < b.refineDistinct
          )
        )
          continue;
        starts.push({ fit: f, kind });
        break;
      }
    }

    const ref = await this.refine(starts);
    const endFits = await this.fitMany(ref.endpoints, 'r3', b.r3, true);
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
        gdx: this.gdxById.get(f.id)!,
        centreNet: f.centre.net,
        centreDd: f.centre.dd,
        p90: p90Of(f),
        parts: f.parts
      });
    }

    const members = [...this.archive.values()];
    const front = rankOrder(members.filter((m) => m.violation === 0));
    const nd = front.filter(
      (a) =>
        !front.some(
          (b2) =>
            b2 !== a &&
            b2.objectives.every((v, i) => v <= a.objectives[i]!) &&
            b2.objectives.some((v, i) => v < a.objectives[i]!)
        )
    );

    this.count('r1Centres', this.archive.size);
    this.count('r1Measured', members.filter((m) => m.fit.nb).length);
    this.count('r1Feasible', members.filter((m) => m.violation === 0).length);
    this.count('r2', r2.length);
    this.count('r2Feasible', r2.filter((x) => x.m.violation === 0).length);
    this.count('r3', allR3.length);
    this.count('r3Feasible', allR3.filter((f) => f.violation === 0).length);
    this.count('shortlist', list.length);
    this.count('distinctCentres', this.gdxById.size);
    log(
      `lane ${s.key}: ${this.archive.size} rung-1 centres, ${this.counts.r1Feasible} feasible; shortlist ${list.length}`
    );

    return {
      key: s.key,
      arm: s.arm,
      kind: s.kind,
      entry: s.entry ?? null,
      counts: this.counts,
      byOrigin: this.byOrigin,
      byClass: this.byClass,
      ledgers: {
        centres: this.ledgerAll.size,
        feasible: this.ledgerFeasible.size,
        baselineEquivalent: this.baselineEquivalent
      },
      requested: this.requested,
      islands: this.islands,
      extension: this.extension,
      r2: r2.map((x) => ({
        id: x.m.id,
        feasible: x.m.violation === 0,
        net: x.m.fit.centre.net,
        robust: robustOf(x.m.fit),
        p90: p90Of(x.m.fit),
        why: x.why,
        origin: x.m.origin
      })),
      r3: allR3.map((f) => ({
        id: f.id,
        feasible: f.violation === 0,
        net: f.centre.net,
        robust: robustOf(f),
        p90: p90Of(f),
        origin: this.originById.get(f.id) ?? 'unknown'
      })),
      refinements: ref.results,
      shortlist: list,
      visibleInfeasible: vis,
      frontier: nd.map((m) => ({
        id: m.id,
        net: m.fit.centre.net,
        robust: robustOf(m.fit),
        p90: p90Of(m.fit),
        dd: m.fit.centre.dd,
        gdxLots: m.fit.centre.books['G:GDX'].lots
      })),
      topByNet: [...members]
        .sort((a, c) => c.fit.centre.net - a.fit.centre.net || byId(a, c))
        .slice(0, 50)
        .map((m) => ({
          id: m.id,
          net: m.fit.centre.net,
          robust: robustOf(m.fit),
          p90: p90Of(m.fit),
          dd: m.fit.centre.dd,
          feasible: m.violation === 0,
          gdxLots: m.fit.centre.books['G:GDX'].lots,
          origin: m.origin
        }))
    };
  }
}

export { classOf };
