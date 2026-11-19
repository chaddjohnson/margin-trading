// The independent search lanes (PROTOCOL.md §7): Study 8's pipeline as 4A used it (src/gdx-growth-standalone/search.ts),
// scaled to a bounded screening of every eligible ETF. One LANE = one ETF × one cutoff × one paired search seed (A | B)
// × one protected entry cell (rise | breakout):
//   a Latin-supercube Sobol screen of the 58-gene genome over the canonical boxes (entry pinned, the 64 Rise / 32
//   breakout strata round-robin; this study's seeds) → promotion of the initial population (¼ centre net among the
//   plausible, ¼ constrained rank on (−net, DD), the rest max-min diversity; one per funded ledger, never cash's) →
//   rung 1 (centre-first) → ONE NSGA-II island on (−centre net, −robust net, p90 DD) with constraint domination →
//   rung 2 (¼ centre net, ¼ robust net, the rest constrained rank; distinct; one per ledger) → the lane's picks
//   (profit, robust).
// No incumbent, transfer vector, archive seed or range derived from a later-selected setting ever enters a lane. No
// local refinement and no extension island (frozen; PROTOCOL.md §7.3). Every stage is a deterministic function of its
// seed labels and of the evaluations it requests; with the archive this makes a rerun an exact replay (lab.ts).
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
import { type Fit, type Nb, bookOf, fitOf, nbStats, p90Of, plausible, robustOf } from './fitness.ts';
import type { Lab } from './lab.ts';
import {
  type Entry,
  type GConfig,
  type Genome,
  build,
  coarseClassOf,
  decodeG,
  encodeG,
  gDistance,
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

export interface Budget {
  screen: number; // screened proposals
  population: number; // the island's population = the number promoted from the screen
  island: number; // new distinct island proposals
  generations: number; // a safety bound (the island stops on its proposal budget)
  r1: number;
  r2Keep: number;
  r2: number;
  r2Distinct: number;
  picks: number; // the lane's picks (profit, robust)
  distinct: number; // L∞ distance between picks
}

export interface LaneSpec {
  key: string; // e.g. C24/XLK/A-rise
  sym: string;
  cutoff: string;
  rep: 'A' | 'B';
  entry: Entry;
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
  g: GConfig;
  fit: Fit;
  origin: string;
}

export interface Pick extends Fit {
  pick: string;
  g: GConfig;
  origin: string;
  lane: string;
}

export interface LaneResult {
  key: string;
  sym: string;
  rep: string;
  entry: Entry;
  counts: Record<string, number>;
  byClass: Record<
    string,
    { screened: number; plausible: number; promoted: number; measured: number; feasible: number }
  >;
  ledgers: { centres: number; feasible: number; cashEquivalent: number };
  requested: number;
  island: {
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
  };
  r2: {
    id: string;
    feasible: boolean;
    net: number;
    robust: number;
    p90: number;
    dd: number;
    why: string;
    origin: string;
  }[];
  picks: Pick[];
  best: { net: number | null; robust: number | null; feasibleNet: number | null }; // rung-1 archive (search evidence)
  topByNet: {
    id: string;
    net: number;
    robust: number;
    p90: number;
    dd: number;
    feasible: boolean;
    lots: number;
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

export class Lane {
  private readonly archive = new Map<string, Member>(); // rung-1 fits
  private readonly gById = new Map<string, GConfig>();
  private readonly originById = new Map<string, string>();
  readonly counts: Record<string, number> = {};
  private readonly byClass: LaneResult['byClass'] = {};
  private readonly ledgerAll = new Set<string>();
  private readonly ledgerFeasible = new Set<string>();
  private cashEquivalent = 0;
  private readonly genomes = new Map<string, Genome>();
  private readonly screened = new Set<string>(); // every screened centre (a child equal to one is not a new proposal)
  requested = 0;

  constructor(
    private readonly lab: Lab,
    readonly spec: LaneSpec,
    readonly b: Budget,
    private readonly cashSignature: string
  ) {}

  private count(k: string, n = 1) {
    this.counts[k] = (this.counts[k] ?? 0) + n;
  }

  private labels = (...parts: (string | number)[]) => [...parts, this.spec.key];
  // common random numbers across every centre, lane and ETF of the cutoff
  private crn = (rung: string) => [rung, this.spec.cutoff];

  private decodeOrNull(g: Genome): GConfig | null {
    try {
      return decodeG(g);
    } catch {
      return null;
    }
  }

  private cls(g: GConfig) {
    return coarseClassOf(g);
  }

  // fits: the centre first; the unique neighbours of the rung's common family only for a plausible centre unless `full`
  async fitMany(gs: readonly GConfig[], rung: string, n: number, full = false, origin = rung): Promise<Fit[]> {
    const built = gs.map((g) => build(g));
    const centres = await this.lab.evalMany(
      built.map((x) => ({ quad: x.quad, options: x.options })),
      `${rung}:centre`
    );

    this.requested += built.length;

    const fam = { name: rung, n, labels: this.crn(rung) };
    const plans = built.map((x, i) => (!full && !plausible(centres[i]!) ? null : rowsOf(x, fam).filter((r) => !r.dup)));
    const items = plans.flatMap((p) => (p ?? []).map((r) => ({ quad: r.built.quad, options: r.built.options })));
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
      out.push(fitOf(rung, x.id, centre, nb));
      if (!this.gById.has(x.id)) {
        this.gById.set(x.id, x.g!);
        this.originById.set(x.id, origin);
      }
    });

    return out;
  }

  private member(g: GConfig, f: Fit, genome?: Genome): Member {
    const gen = genome ?? this.genomes.get(f.id) ?? encodeG(g);

    if (!this.genomes.has(f.id)) this.genomes.set(f.id, gen);
    return {
      id: f.id,
      genome: gen,
      objectives: f.objectives,
      violation: f.violation,
      g,
      fit: f,
      origin: this.originById.get(f.id) ?? 'unknown'
    };
  }

  private addArchive(m: Member) {
    if (this.archive.has(m.id)) return;
    this.archive.set(m.id, m);

    const k = (this.byClass[this.cls(m.g)] ??= { screened: 0, plausible: 0, promoted: 0, measured: 0, feasible: 0 });

    if (m.fit.nb) k.measured++;
    if (m.violation === 0) k.feasible++;
    this.ledgerAll.add(m.fit.centre.signature);
    if (m.fit.centre.signature === this.cashSignature) this.cashEquivalent++;
    if (m.violation === 0) this.ledgerFeasible.add(m.fit.centre.signature);
  }

  // ----- the screen and the promotion of the initial population -----

  private async screen() {
    const entry = this.spec.entry;
    const genomes = screenGenomes(this.b.screen, ...this.labels('screen')).map((g, i) =>
      pinStratum(pinEntry(g, entry), entry, i)
    );
    const seen = new Set<string>();
    const gs: GConfig[] = [];
    const gen: Genome[] = [];

    for (const g of genomes) {
      const c = this.decodeOrNull(g);

      if (!c) {
        this.count('screenInvalid');
        continue;
      }

      const id = build(c).id;

      if (seen.has(id)) {
        this.count('screenDuplicate');
        continue;
      }

      seen.add(id);
      this.screened.add(id);
      gs.push(c);
      gen.push(g);
    }

    this.count('screened', genomes.length);
    this.count('screenUnique', gs.length);

    const built = gs.map((g) => build(g));
    const recs = await this.lab.evalMany(
      built.map((x) => ({ quad: x.quad, options: x.options })),
      'screen'
    );

    this.requested += built.length;

    const items = built.map((x, i) => {
      const r = recs[i]!;
      const ok = plausible(r);
      const violation = ok
        ? 0
        : (r.error ? 1 : Math.max(0, -r.net) / economics.budget + (r.net > 0 ? 0 : 0.01)) +
          Math.max(0, r.dd - economics.ceiling) / economics.ceiling +
          (bookOf(r).lots > 0 ? 0 : 0.5);
      const k = (this.byClass[this.cls(x.g!)] ??= { screened: 0, plausible: 0, promoted: 0, measured: 0, feasible: 0 });

      k.screened++;
      if (ok) k.plausible++;
      if (r.signature === this.cashSignature) this.count('screenCashEquivalent');
      this.genomes.set(x.id, gen[i]!);
      this.originById.set(x.id, 'screen');

      return {
        id: x.id,
        genome: gen[i]!,
        objectives: [-r.net, r.dd],
        violation,
        g: x.g!,
        plausible: ok,
        net: r.net,
        signature: r.signature
      };
    });

    this.count('plausible', items.filter((x) => x.plausible).length);

    const k = Math.min(this.b.population, items.length);
    const chosen = new Map<string, (typeof items)[number]>();
    const ledgers = new Set<string>([this.cashSignature]);
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
          d = Math.min(d, gDistance(pool[i]!.g, c.g));
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

    for (const x of chosen.values()) this.byClass[this.cls(x.g)]!.promoted++;
    this.count('promoted', chosen.size);
    return [...chosen.values()];
  }

  // ----- the NSGA-II island -----

  private variation(a: Genome, b: Genome, rng: Rng) {
    const ca = [...a];
    const cb = [...b];

    if (rng.next() <= ga.crossoverProbability)
      for (let i = 0; i < nS; i++) {
        if (i === gene.entry) continue;
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

  private mutate(g: Genome, rng: Rng): Genome {
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

    const cats = Array.from({ length: nS }, (_v, i) => i).filter((i) => i !== gene.entry);

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

  private async island(initial: Member[]): Promise<LaneResult['island']> {
    const rng = Rng.from(...seedOf('ga', ...this.labels()));
    const req0 = this.requested;
    const seen = new Set<string>([...this.archive.keys(), ...this.screened]);
    let pop: Member[] = initial.slice(0, this.b.population);
    const lg: LaneResult['island'] = {
      generations: 0,
      newConfigs: 0,
      measured: 0,
      duplicates: 0,
      invalid: 0,
      evaluations: 0,
      stop: '',
      hvTrajectory: [],
      bestRobustTrajectory: [],
      bestNetTrajectory: []
    };

    if (pop.length === 0) {
      lg.stop = 'empty population';
      return lg;
    }

    for (let gen = 0; gen < this.b.generations; gen++) {
      if (lg.newConfigs >= this.b.island) {
        lg.stop = 'budget';
        break;
      }

      const ranked: Ranked<Member>[] = selectSurvivors(pop, this.b.population);
      const want = Math.min(this.b.population, this.b.island - lg.newConfigs);
      const children: { c: GConfig; g: Genome }[] = [];
      let attempts = 0;

      while (children.length < want && attempts < want * 50) {
        attempts++;

        const p1 = tournament(ranked, rng).member;
        const p2 = tournament(ranked, rng).member;

        for (const x of this.variation(p1.genome, p2.genome, rng)) {
          if (children.length >= want) break;

          const g = pinEntry(this.mutate(x, rng), this.spec.entry);
          const c = this.decodeOrNull(g);

          if (!c) {
            lg.invalid++;
            continue;
          }

          const id = build(c).id;

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
      lg.hvTrajectory.push(Math.round(hypervolume2d(hvPoints(pop), [0, economics.ceiling])));
      lg.bestRobustTrajectory.push(Math.round(this.best((m) => robustOf(m.fit))));
      lg.bestNetTrajectory.push(Math.round(this.best((m) => m.fit.centre.net)));
      this.lab.setProgress({
        [`lane ${this.spec.key}`]: {
          stage: 'island',
          generation: gen + 1,
          newConfigs: lg.newConfigs,
          rng: rngState(rng),
          archive: this.archive.size
        }
      });
    }

    if (!lg.stop) lg.stop = lg.newConfigs >= this.b.island ? 'budget' : 'generations';
    lg.evaluations = this.requested - req0;
    this.count('islandConfigs', lg.newConfigs);
    return lg;
  }

  // ----- rung 2: ¼ centre net (feasible), ¼ robust net (feasible), the rest constrained rank; distinct, one per ledger -----

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
        if (m.fit.centre.signature === this.cashSignature) continue;
        if (
          out.some(
            (o) =>
              o.m.id === m.id || o.m.fit.centre.signature === m.fit.centre.signature || gDistance(o.m.g, m.g) < distinct
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

  // ----- the lane's picks (feasible rung-2 fits only; one per ledger; never cash's ledger; L∞ ≥ distinct) -----

  private picksOf(fits: { f: Fit; why: string }[]): Pick[] {
    const feasible = fits.map((x) => x.f).filter((f) => f.violation === 0 && f.centre.signature !== this.cashSignature);
    const picks: Pick[] = [];
    const take = (f: Fit | undefined, pick: string) => {
      if (!f || picks.length >= this.b.picks) return;
      if (picks.some((p) => p.id === f.id || p.centre.signature === f.centre.signature)) return;

      const g = this.gById.get(f.id)!;

      if (picks.some((p) => gDistance(p.g, g) < this.b.distinct)) return;
      picks.push({ ...f, pick, g, origin: this.originById.get(f.id) ?? 'unknown', lane: this.spec.key });
    };

    take([...feasible].sort((a, b) => b.centre.net - a.centre.net || byId(a, b))[0], 'profit');
    take([...feasible].sort((a, b) => robustOf(b) - robustOf(a) || byId(a, b))[0], 'robust');
    for (const f of [...feasible].sort((a, b) => b.centre.net - a.centre.net || byId(a, b))) take(f, 'profit order');
    return picks;
  }

  async run(): Promise<LaneResult> {
    const b = this.b;
    const promoted = await this.screen();
    const fits = await this.fitMany(
      promoted.map((x) => x.g),
      'r1',
      b.r1,
      false,
      'screen'
    );

    promoted.forEach((x, i) => this.addArchive(this.member(x.g, fits[i]!, x.genome)));

    const island = await this.island(rankOrder([...this.archive.values()]).slice(0, b.population));
    const r2Picks = this.promote([...this.archive.values()], b.r2Keep, b.r2Distinct);
    const r2Fits = await this.fitMany(
      r2Picks.map((x) => x.m.g),
      'r2',
      b.r2,
      true
    );
    const r2 = r2Picks.map((x, k) => ({ f: r2Fits[k]!, why: x.why, origin: x.m.origin }));
    const picks = this.picksOf(r2);
    const members = [...this.archive.values()];
    const fin = (x: number) => (Number.isFinite(x) ? Math.round(x * 100) / 100 : null);

    this.count('r1Centres', this.archive.size);
    this.count('r1Measured', members.filter((m) => m.fit.nb).length);
    this.count('r1Feasible', members.filter((m) => m.violation === 0).length);
    this.count('r2', r2.length);
    this.count('r2Feasible', r2.filter((x) => x.f.violation === 0).length);
    this.count('picks', picks.length);
    this.count('distinctCentres', this.gById.size);
    log(
      `lane ${this.spec.key}: ${this.archive.size} rung-1 centres, ${this.counts.r1Feasible ?? 0} feasible; picks ${picks.length}`
    );

    return {
      key: this.spec.key,
      sym: this.spec.sym,
      rep: this.spec.rep,
      entry: this.spec.entry,
      counts: this.counts,
      byClass: this.byClass,
      ledgers: {
        centres: this.ledgerAll.size,
        feasible: this.ledgerFeasible.size,
        cashEquivalent: this.cashEquivalent
      },
      requested: this.requested,
      island,
      r2: r2.map((x) => ({
        id: x.f.id,
        feasible: x.f.violation === 0,
        net: x.f.centre.net,
        robust: robustOf(x.f),
        p90: p90Of(x.f),
        dd: x.f.centre.dd,
        why: x.why,
        origin: x.origin
      })),
      picks,
      best: {
        net: fin(Math.max(-Infinity, ...members.map((m) => m.fit.centre.net))),
        robust: fin(this.best((m) => robustOf(m.fit))),
        feasibleNet: fin(this.best((m) => m.fit.centre.net))
      },
      topByNet: [...members]
        .sort((a, c) => c.fit.centre.net - a.fit.centre.net || byId(a, c))
        .slice(0, 10)
        .map((m) => ({
          id: m.id,
          net: m.fit.centre.net,
          robust: robustOf(m.fit),
          p90: p90Of(m.fit),
          dd: m.fit.centre.dd,
          feasible: m.violation === 0,
          lots: bookOf(m.fit.centre).lots,
          origin: m.origin
        }))
    };
  }
}
