// The searches (PROTOCOL.md §7): one lane = one proposal source over ONE structural cell (space.ts). Reference method
// NL0 1.0.0 = 5B's pipeline (src/vg-lifecycle-matched-optimization/search.ts) as the shadow-eligibility study ported it
// (src/vg-l0-shadow-eligibility/search.ts), unchanged except where this study's space makes a part inapplicable or
// adds the control genes (PROTOCOL.md §7, each item an adaptation):
//
// - the structure is pinned by the lane's cell (families, gates, activations); the genome has 28 ordinal genes (the D1
//   pair and the active control genes) and no categorical gene; inactive genes are pinned (never varied or perturbed);
// - Growth·VGT is New L0's, frozen: NL0's Growth entry-pattern protections (promotion share, shortlist slot) and its
//   gate-alternative slot have no object. In a cell with a decline gate their place is taken by the gate's K PATTERN
//   (the K of each gated book): ⅛ promotion share per K pattern, a "K alternative" shortlist slot; in an ungated cell
//   they fall through to the next rule;
// - the screen's strata protect K: every K value (pair) gets the same number of screened proposals;
// - every seed label is the lane's seed key `<cutoff>/<stage>/<cell>/R<r>` in this study's namespace;
// - a REFINEMENT lane (stage 2, PROTOCOL.md §7.3) is NL0's informed-lane schedule seeded with the SAME cutoff's
//   qualified broad members of its cell (never with an incumbent or later-selected configuration).
//
// Pipeline: indep — Latin-supercube Sobol screen (strata round-robin) → promotion (¼ centre net among the plausible, ¼
// constrained rank on (−net, DD), ⅛ per K pattern, the rest max-min diversity; one per ledger) → rung 1 (16 neighbours;
// centre-first) → NSGA-II islands on (−centre net, −robust net, p90 DD) → rung 2 (64) → rung 3 (128) → refinement
// (robust, profit) → the shortlist. refine — the seeds and their near (1.5) and broad (3) designs and the focus seeds'
// focused designs (0.5, 1.0) → rung 1 → islands → rungs → refinement (robust, profit, profit-2, and focus-profit /
// focus-robust at every focus seed with two passes) → the shortlist.
//
// Every stage is a deterministic function of its seed labels and of the evaluations it requests; with the archive this
// makes a rerun an exact replay (lab.ts). Lanes of one job run concurrently on one worker pool; extension decisions are
// taken at barriers (all lanes idle), so they are deterministic too.
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
import { economics, log, seedOf, symbols } from './context.ts';
import {
  type Cell,
  type Cfg,
  type Genome,
  activeSet,
  cfgDistance,
  cfgId,
  controlValuesOf,
  decode,
  encode,
  levels,
  movesOf,
  nGenes,
  neighbourhood,
  pinCell,
  pinStratum,
  screenGenomes
} from './space.ts';
import { type Fit, bandedOrder, fitOf, fundedOf, nbStats, p90Of, plausible, robustOf } from './fitness.ts';
import { vOptions } from './nl0.ts';
import type { Lab } from './lab.ts';

export type LaneKind = 'indep' | 'refine';

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
  extension: number;
  r2Keep: number;
  r2: number;
  r2Distinct: number;
  r3Keep: number;
  r3: number;
  r3Distinct: number;
  refinePasses: number;
  focusPasses: number;
  refineN: number;
  refineMinGain: number;
  refineDistinct: number;
  shortlist: number;
  distinct: number;
  near: number;
  broad: number;
  focusSmall: number;
  focusMid: number;
}

export type StartKind = 'robust' | 'profit' | 'profit-2' | 'focus-profit' | 'focus-robust';

const byId = (a: { id: string }, b: { id: string }) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);

// NL0's refinement starts from a lane's rung-3 fits: robust = the banded best feasible fit; profit = the feasible fit
// with the highest centre net; profit-2 (the refinement lanes' third start, the shadow study's reassignment of 5B's
// both-Growth start) = the next feasible fit by centre net; each start distinct; robust and profit fall back to the
// least-violating infeasible fits, profit-2 does not.
export const refinementStarts = (
  r3Fits: readonly Fit[],
  kinds: readonly ('robust' | 'profit' | 'profit-2')[],
  distance: (a: Fit, b: Fit) => number,
  distinct: number
) => {
  const feasible3 = r3Fits.filter((f) => f.violation === 0);
  const infeasible3 = r3Fits.filter((f) => f.violation > 0).sort((a, c) => a.violation - c.violation || byId(a, c));
  const starts: { fit: Fit; kind: StartKind }[] = [];

  for (const kind of kinds) {
    const order =
      kind === 'robust'
        ? bandedOrder(feasible3.map((f) => ({ id: f.id, robust: robustOf(f), p90: p90Of(f), f }))).map((x) => x.f)
        : [...feasible3].sort((a, c) => c.centre.net - a.centre.net || byId(a, c));

    for (const f of kind === 'profit-2' ? order : [...order, ...infeasible3]) {
      if (starts.some((x) => x.fit.id === f.id || distance(x.fit, f) < distinct)) continue;
      starts.push({ fit: f, kind });
      break;
    }
  }

  return starts;
};

export interface Seed {
  label: string;
  cfg: Cfg;
  focus?: boolean;
}

export interface LaneSpec {
  key: string; // = the seed key, e.g. C21/broad/GB1.VD0e/R2
  seedKey: string;
  position: string; // the unit of extension (one lane per position)
  stage: 'broad' | 'refine';
  replicate: number;
  cutoff: string;
  kind: LaneKind;
  cell: Cell;
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
  cfg: Cfg;
  fit: Fit;
}

export interface IslandLog {
  index: number;
  generations: number;
  newConfigs: number;
  measured: number;
  duplicates: number;
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
  classes: number;
}

export interface Pick extends Fit {
  pick: string;
  cfg: Cfg;
}

export interface LaneResult {
  key: string;
  seedKey: string;
  position: string;
  stage: 'broad' | 'refine';
  cell: string;
  base: boolean;
  replicate: number;
  kind: LaneKind;
  triggerLog: { island: number; fired: boolean; reason: string; positionExtended?: boolean }[];
  counts: Record<string, number>;
  byPattern: Record<string, { screened: number; plausible: number; promoted: number; centres: number; feasible: number }>;
  ledgers: { centres: number; feasible: number };
  requested: number;
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
  shortlist: Pick[];
  visibleInfeasible: { id: string; cfg: Cfg; centreNet: number; centreDd: number; p90: number; parts: Record<string, number> }[];
  frontier: { id: string; net: number; robust: number; p90: number; dd: number }[];
  topByNet: { id: string; net: number; robust: number; p90: number; dd: number; feasible: boolean }[];
  failure: { screenPlausible: number; screenReasons: Record<string, number> }; // why a cell's proposals were implausible
}

const hvPoints = (ms: readonly Member[]): Scored[] =>
  ms.map((m) => ({ id: m.id, genome: m.genome, violation: m.violation, objectives: [m.objectives[1]!, m.objectives[2]!] }));

// The K pattern of a configuration: the gate's K of each gated book ('' in an ungated cell).
export const kPatternOf = (c: Cfg) =>
  symbols
    .map((s) => {
      const k = controlValuesOf(c, s).k;

      return k === undefined ? '' : `${s}K${k}`;
    })
    .filter(Boolean)
    .join('/');

// why a screened centre was implausible (coverage: intrinsic validity versus poor metrics)
const reasonOf = (r: Rec) =>
  r.error ? 'error' : r.lots === 0 ? 'no funded lot' : !r.mixed ? 'a family unfunded' : r.net <= 0 ? 'net ≤ 0' : r.dd > economics.ceiling ? 'DD > ceiling' : 'plausible';

export class Lane {
  private readonly archive = new Map<string, Member>(); // rung-1 fits of the lane
  private readonly configs = new Map<string, Cfg>();
  readonly counts: Record<string, number> = {};
  private readonly islands: IslandLog[] = [];
  private readonly byPattern: LaneResult['byPattern'] = {};
  private readonly ledgerAll = new Set<string>();
  private readonly ledgerFeasible = new Set<string>();
  private readonly genomes = new Map<string, Genome>();
  private readonly screenReasons: Record<string, number> = {};
  private screenPlausible = 0;
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

  private patternRow(p: string) {
    return (this.byPattern[p || 'ungated'] ??= { screened: 0, plausible: 0, promoted: 0, centres: 0, feasible: 0 });
  }

  private labels = (...parts: (string | number)[]) => [...parts, this.spec.seedKey];
  private crn = (rung: string) => [rung, this.spec.cutoff]; // common random numbers across the cutoff's centres
  private refineLane = () => this.spec.kind === 'refine';

  private decodeOf(g: Genome): Cfg {
    return decode(g, this.spec.cell);
  }

  // ----- fits: the centre first; the unique neighbours under the rung's common seed family only for a plausible centre
  // (centre-first fidelity) unless `full`; `gate` withholds neighbours from a move whose centre cannot be chosen -----

  async fitMany(cfgs: readonly Cfg[], rung: string, n: number, full = false, gate?: (centre: Rec) => boolean): Promise<Fit[]> {
    const centres = await this.lab.evalMany(
      cfgs.map((c) => ({ cfg: c, options: vOptions })),
      `${rung}:centre`
    );

    this.requested += cfgs.length;

    const fam = { name: rung, n, labels: this.crn(rung), scope: 'joint' as const };
    const plans = cfgs.map((c, i) =>
      !full && (!plausible(centres[i]!) || (gate && !gate(centres[i]!))) ? { c, nb: null } : { c, nb: neighbourhood(c, fam) }
    );
    const items = plans.flatMap((p) => (p.nb ?? []).map((x) => ({ cfg: x.cfg, options: vOptions })));
    const recs = await this.lab.evalMany(items, `${rung}:neighbours`);

    this.requested += items.length;

    const out: Fit[] = [];
    let at = 0;

    plans.forEach((p, i) => {
      const centre = centres[i]!;
      const id = cfgId(p.c);
      const nb = p.nb
        ? nbStats(
            centre,
            p.nb.map(() => recs[at++]!),
            p.nb.map((x) => x.clipped)
          )
        : null;

      out.push(fitOf(rung, id, centre, nb));
      if (!this.configs.has(id)) {
        this.configs.set(id, p.c);
        this.lab.store.write('configs', id, p.c);
      }
    });

    return out;
  }

  private member(c: Cfg, f: Fit, genome?: Genome): Member {
    const g = genome ?? this.genomes.get(f.id) ?? encode(c);

    if (!this.genomes.has(f.id)) this.genomes.set(f.id, g);
    return { id: f.id, genome: g, objectives: f.objectives, violation: f.violation, cfg: c, fit: f };
  }

  private addArchive(m: Member) {
    if (this.archive.has(m.id)) return;
    this.archive.set(m.id, m);

    const row = this.patternRow(kPatternOf(m.cfg));

    row.centres++;
    if (m.violation === 0) row.feasible++;
    this.ledgerAll.add(m.fit.centre.signature);
    if (m.violation === 0) this.ledgerFeasible.add(m.fit.centre.signature);
  }

  // ----- screen and promotion (indep) -----

  private async screen() {
    const cell = this.spec.cell;
    const genomes = screenGenomes(this.b.screen, ...this.labels('screen')).map((g, i) => pinStratum(g, cell, i));
    const seen = new Set<string>();
    const cfgs: Cfg[] = [];
    const gs: Genome[] = [];

    for (const g of genomes) {
      const c = this.decodeOf(g);
      const id = cfgId(c);

      if (seen.has(id)) {
        this.count('screenDuplicate');
        continue;
      }

      seen.add(id);
      cfgs.push(c);
      gs.push(g);
    }

    this.count('screened', genomes.length);
    this.count('screenUnique', cfgs.length);

    const recs = await this.lab.evalMany(
      cfgs.map((c) => ({ cfg: c, options: vOptions })),
      'screen'
    );

    this.requested += cfgs.length;

    const items = cfgs.map((c, i) => {
      const r = recs[i]!;
      const ok = plausible(r);
      const violation = ok
        ? 0
        : (r.error ? 1 : Math.max(0, -r.net) / economics.budget + (r.net > 0 ? 0 : 0.01)) +
          Math.max(0, r.dd - economics.ceiling) / economics.ceiling +
          (r.mixed ? 0 : 0.5);
      const row = this.patternRow(kPatternOf(c));
      const why = reasonOf(r);

      this.screenReasons[why] = (this.screenReasons[why] ?? 0) + 1;
      row.screened++;
      if (ok) {
        row.plausible++;
        this.screenPlausible++;
      }
      this.genomes.set(cfgId(c), gs[i]!);

      return { id: cfgId(c), genome: gs[i]!, objectives: [-r.net, r.dd], violation, cfg: c, plausible: ok, net: r.net, signature: r.signature };
    });

    this.count('plausible', items.filter((x) => x.plausible).length);

    // promotion: ¼ centre net among the plausible, ¼ constrained rank on (−net, DD), ⅛ per K pattern (gated cells with
    // more than one pattern present), the rest max-min diversity; one per funded ledger in the first three
    const k = Math.min(this.b.promote, items.length);
    const chosen = new Map<string, (typeof items)[number]>();
    const ledgers = new Set<string>();
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

    {
      const patterns = [...new Set(byNet.map((x) => kPatternOf(x.cfg)))].sort();

      if (patterns.length > 1) {
        const lists = patterns.map((p) => byNet.filter((x) => kPatternOf(x.cfg) === p));
        const cap = Math.ceil(k / 8);
        let taken = 0;

        for (let more = true; more && taken < cap && chosen.size < k;) {
          more = false;
          for (const list of lists) {
            if (taken >= cap || chosen.size >= k) break;

            const x = list.find((y) => !chosen.has(y.id) && !ledgers.has(y.signature));

            if (!x) continue;
            chosen.set(x.id, x);
            ledgers.add(x.signature);
            this.count('promoted:K pattern');
            taken++;
            more = true;
          }
        }
      }
    }

    const pool = [...items.filter((x) => x.plausible), ...items.filter((x) => !x.plausible)].filter((x) => !chosen.has(x.id));

    while (chosen.size < k && pool.length) {
      let best = 0;
      let bestD = -1;

      for (let i = 0; i < pool.length; i++) {
        let d = Infinity;

        for (const c of chosen.values()) {
          d = Math.min(d, cfgDistance(pool[i]!.cfg, c.cfg));
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

    for (const x of chosen.values()) this.patternRow(kPatternOf(x.cfg)).promoted++;
    this.count('promoted', chosen.size);
    return [...chosen.values()];
  }

  // ----- NSGA-II islands (ordinal genes only; the cell's inactive genes are pinned) -----

  private pinned(): Set<number> {
    const active = activeSet(this.spec.cell);

    return new Set(Array.from({ length: nGenes }, (_v, i) => i).filter((i) => !active.has(i)));
  }

  private variation(a: Genome, b: Genome, rng: Rng, pinned: Set<number>) {
    const ca = [...a];
    const cb = [...b];
    const num = sbx(spaceOf(levels, 'num'), a, b, rng, ga);

    for (let i = 0; i < nGenes; i++) {
      if (pinned.has(i)) continue;
      ca[i] = num.children[0]![i]!;
      cb[i] = num.children[1]![i]!;
    }
    return [ca, cb];
  }

  private mutate(g: Genome, rng: Rng, pinned: Set<number>): Genome {
    const out = [...g];
    const free = Array.from({ length: nGenes }, (_v, i) => i).filter((i) => !pinned.has(i));
    const m = polynomialMutation(
      spaceOf(
        free.map((i) => levels[i]!),
        'active'
      ),
      free.map((i) => out[i]!),
      rng,
      ga
    );

    free.forEach((i, x) => (out[i] = m.genome[x]!));
    return out;
  }

  private best(pick: (m: Member) => number) {
    let best = -Infinity;

    for (const m of this.archive.values()) if (m.violation === 0) best = Math.max(best, pick(m));
    return best;
  }

  private feasibleTriggerClasses() {
    return new Set(
      [...this.archive.values()]
        .filter((m) => m.violation === 0)
        .map((m) => `${kPatternOf(m.cfg)}|funded ${fundedOf(m.fit.centre).sort().join('+')}`)
    );
  }

  private state(): LaneState {
    return {
      hv: hypervolume2d(hvPoints([...this.archive.values()]), [0, economics.ceiling]),
      robust: this.best((m) => robustOf(m.fit)),
      net: this.best((m) => m.fit.centre.net),
      classes: this.feasibleTriggerClasses().size
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
        this.spec.kind === 'indep' ? pinStratum(g, this.spec.cell, i) : pinCell(g, this.spec.cell)
      );
      const add: { c: Cfg; g: Genome }[] = [];

      for (const g of fillers) {
        if (pop.length + add.length >= this.b.population) break;

        const c = this.decodeOf(g);
        const id = cfgId(c);

        if (seen.has(id)) continue;
        seen.add(id);
        add.push({ c, g });
      }

      const fits = await this.fitMany(
        add.map((x) => x.c),
        'r1',
        this.b.r1
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
      const children: { c: Cfg; g: Genome }[] = [];
      let attempts = 0;

      while (children.length < want && attempts < want * 50) {
        attempts++;

        const p1 = tournament(ranked, rng).member;
        const p2 = tournament(ranked, rng).member;

        for (const x of this.variation(p1.genome, p2.genome, rng, pinned)) {
          if (children.length >= want) break;

          const g = pinCell(this.mutate(x, rng, pinned), this.spec.cell);
          const c = this.decodeOf(g);
          const id = cfgId(c);

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
        this.b.r1
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

      // stagnation: neither the island's hypervolume of (−robust, p90) nor the lane's best feasible centre net rose by
      // more than the tolerance for `patience` generations
      const gained = hv > bestHv * (1 + this.b.tolerance) + 1e-9 || net > bestNet + Math.abs(bestNet) * this.b.tolerance + 1e-9;

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
          archive: this.archive.size
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
    lg.hvGainPer10k = lg.evaluations > 0 ? Math.round(((lg.after.hv - lg.before.hv) / lg.evaluations) * 1e4 * 100) / 100 : 0;
    this.islands.push(lg);
    this.count('islandConfigs', lg.newConfigs);
    log(`${this.spec.key} island ${index}: ${lg.newConfigs} new (${lg.measured} measured), ${lg.generations} generations, stop ${lg.stop}`);
  }

  // ----- rungs: ¼ centre net (feasible), ¼ robust net (feasible), ⅛ per K pattern, the rest constrained rank; each pick
  // distinct and one per funded ledger -----

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
        if (out.some((o) => o.m.id === m.id || o.m.fit.centre.signature === m.fit.centre.signature || cfgDistance(o.m.cfg, m.cfg) < distinct))
          continue;
        out.push({ m, why });
        n++;
      }
    };

    take(byNet, 'centre net', Math.ceil(k / 4));
    take(byRobust, 'robust net', Math.ceil(k / 4));

    {
      const patterns = [...new Set(byNet.map((m) => kPatternOf(m.cfg)))].sort();

      if (patterns.length > 1) {
        const cap = Math.ceil(k / 8);
        const start = out.length;

        for (let more = true; more && out.length - start < cap && out.length < k;) {
          const before = out.length;

          for (const p of patterns) {
            if (out.length - start >= cap || out.length >= k) break;
            take(
              byNet.filter((m) => kPatternOf(m.cfg) === p),
              'K pattern',
              1
            );
          }
          more = out.length > before;
        }
      }
    }

    take(ranked, 'rank', k);
    take(byNet, 'centre net', k);
    return out;
  }

  // ----- refinement (NL0's moves within the cell; the structure never moves) -----

  private async refine(starts: { fit: Fit; kind: StartKind }[]) {
    const results: LaneResult['refinements'] = [];
    const endpoints: Cfg[] = [];

    for (const start of starts) {
      let cur = this.configs.get(start.fit.id)!;
      let [curFit] = await this.fitMany([cur], 'refine', this.b.refineN, true);
      const path: LaneResult['refinements'][number]['path'] = [
        { pass: 0, moved: null, net: curFit!.centre.net, robust: robustOf(curFit!), violation: curFit!.violation }
      ];
      const passes = start.kind.startsWith('focus') ? this.b.focusPasses : this.b.refinePasses;

      for (let pass = 1; pass <= passes; pass++) {
        const moves = movesOf(cur);
        const profitLike = !(start.kind === 'robust' || start.kind === 'focus-robust');
        const floor = curFit!.centre.net + this.b.refineMinGain;
        const fits = await this.fitMany(
          moves,
          'refine',
          this.b.refineN,
          false,
          profitLike && curFit!.violation === 0 ? (r) => r.net >= floor : undefined
        );
        const scored = fits.map((f, i) => ({ f, c: moves[i]! }));
        let next: { c: Cfg; f: Fit } | null = null;

        this.count('refineMoves', moves.length);

        if (curFit!.violation === 0) {
          if (!profitLike) {
            const better = scored.filter((x) => x.f.violation === 0 && robustOf(x.f) >= robustOf(curFit!) + this.b.refineMinGain);

            if (better.length) next = bandedOrder(better.map((x) => ({ id: x.f.id, robust: robustOf(x.f), p90: p90Of(x.f), x })))[0]!.x;
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
        path.push({ pass, moved: next.f.id, net: next.f.centre.net, robust: robustOf(next.f), violation: next.f.violation });
      }

      results.push({ kind: start.kind, start: start.fit.id, endpoint: cfgId(cur), path });
      if (cfgId(cur) !== start.fit.id) endpoints.push(cur);
    }

    return { results, endpoints };
  }

  // ----- the shortlist: profit, robust, balanced, the K alternative (gated cells), then centre-net order; feasible, one per
  // ledger, L∞ ≥ `distinct` -----

  private shortlist(fits: Fit[]) {
    const best = new Map<string, Fit>();

    for (const f of fits) {
      if (f.violation !== 0) continue;

      const k = f.centre.signature;
      const prev = best.get(k);

      if (!prev || f.centre.net > prev.centre.net || (f.centre.net === prev.centre.net && f.id < prev.id)) best.set(k, f);
    }

    const feasible = [...best.values()];
    const picks: Pick[] = [];
    const cfgOf = (f: Fit) => this.configs.get(f.id)!;
    const take = (f: Fit | undefined, pick: string) => {
      if (!f || picks.length >= this.b.shortlist) return;
      if (picks.some((p) => p.id === f.id)) return;

      const c = cfgOf(f);

      if (picks.some((p) => cfgDistance(p.cfg, c) < this.b.distinct)) return;
      picks.push({ ...f, pick, cfg: c });
    };
    const byNet = [...feasible].sort((a, b) => b.centre.net - a.centre.net || byId(a, b));

    take(byNet[0], 'profit');
    take([...feasible].sort((a, b) => robustOf(b) - robustOf(a) || byId(a, b))[0], 'robust');
    take(
      [...feasible].sort((a, b) => robustOf(b) / Math.max(1, p90Of(b)) - robustOf(a) / Math.max(1, p90Of(a)) || byId(a, b))[0],
      'balanced'
    );
    if (picks[0] && kPatternOf(picks[0].cfg)) {
      const kp = kPatternOf(picks[0].cfg);

      take(
        byNet.find((f) => kPatternOf(cfgOf(f)) !== kp),
        'K alternative'
      );
    }
    for (const f of byNet) take(f, 'profit order');

    return picks;
  }

  // ----- the lane, in synchronized phases (stages.ts drives them) -----

  private r1Ranked: Member[] = [];
  lastTrigger: { island: number; fired: boolean; reason: string } | null = null;
  readonly triggerLog: { island: number; fired: boolean; reason: string; positionExtended?: boolean }[] = [];

  async base(): Promise<void> {
    const s = this.spec;
    const b = this.b;

    log(`lane ${s.key} (${s.kind}) starts`);

    if (this.refineLane()) {
      const designs: Cfg[] = [];
      const seen = new Set<string>();
      const push = (c: Cfg) => {
        const id = cfgId(c);

        if (seen.has(id)) return;
        seen.add(id);
        designs.push(c);
      };

      for (const [i, seed] of (s.seeds ?? []).entries()) {
        push(seed.cfg);
        for (const p of neighbourhood(seed.cfg, { name: 'near', n: b.near, labels: this.labels('near', i), scale: 1.5 })) push(p.cfg);
        for (const p of neighbourhood(seed.cfg, { name: 'broad', n: b.broad, labels: this.labels('broad', i), scale: 3 })) push(p.cfg);
        if (seed.focus) {
          for (const p of neighbourhood(seed.cfg, { name: 'focus-small', n: b.focusSmall, labels: this.labels('focus', 'small', i), scale: 0.5 }))
            push(p.cfg);
          for (const p of neighbourhood(seed.cfg, { name: 'focus-mid', n: b.focusMid, labels: this.labels('focus', 'mid', i), scale: 1 }))
            push(p.cfg);
        }
      }

      this.count('seeds', s.seeds?.length ?? 0);
      this.count('seedDesigns', designs.length);

      const fits = await this.fitMany(designs, 'r1', b.r1);

      designs.forEach((c, i) => this.addArchive(this.member(c, fits[i]!)));
    } else {
      const promoted = await this.screen();
      const fits = await this.fitMany(
        promoted.map((x) => x.cfg),
        'r1',
        b.r1
      );

      promoted.forEach((x, i) => this.addArchive(this.member(x.cfg, fits[i]!, x.genome)));
    }

    // the islands' starting populations: the rung-1 archive split by rank order (rank k → island k mod islands)
    this.r1Ranked = rankOrder([...this.archive.values()]);

    for (let i = 0; i < b.islands; i++) await this.runIsland(i, i + 1 === b.islands);
  }

  get islandsRun() {
    return this.islands.length;
  }

  get atCap() {
    return this.islands.length >= this.b.islandsMax;
  }

  get islandWorstCase() {
    return this.b.newPerIsland * (1 + this.b.r1);
  }

  private async runIsland(i: number, measure: boolean) {
    const b = this.b;
    const initial = this.r1Ranked.filter((_m, k) => k % b.islands === i % b.islands);
    const prior = this.state();

    await this.island(i, initial, b.newPerIsland);

    if (!measure) return;

    const after = this.state();
    const gain = (x: number, y: number) => (Number.isFinite(x) && x > 0 ? (y - x) / x : y > 0 ? Infinity : 0);
    const triggers = {
      hypervolume: gain(prior.hv, after.hv),
      robust: gain(prior.robust, after.robust),
      net: gain(prior.net, after.net),
      newClasses: after.classes - prior.classes
    };
    const fired = triggers.hypervolume > b.extension || triggers.robust > b.extension || triggers.net > b.extension || triggers.newClasses > 0;
    const reason = `island ${i}: hypervolume ${(100 * triggers.hypervolume).toFixed(1)}%, best robust ${(100 * triggers.robust).toFixed(1)}%, best centre net ${(100 * triggers.net).toFixed(1)}%, ${triggers.newClasses} new feasible behaviour class(es)`;

    this.lastTrigger = { island: i, fired, reason };
    this.triggerLog.push({ island: i, fired, reason });
  }

  async extend(): Promise<void> {
    if (this.atCap) throw new Error(`${this.spec.key}: extension beyond the cap`);
    if (this.triggerLog.length) this.triggerLog.at(-1)!.positionExtended = true;
    await this.runIsland(this.islands.length, true);
  }

  async finish(stop: string): Promise<LaneResult> {
    const s = this.spec;
    const b = this.b;

    this.counts.islandsRun = this.islands.length;
    this.extension = { islands: this.islands.length, reason: this.lastTrigger?.reason ?? '', stop };

    const r2Picks = this.promote([...this.archive.values()], b.r2Keep, b.r2Distinct);
    const r2Fits = await this.fitMany(
      r2Picks.map((x) => x.m.cfg),
      'r2',
      b.r2,
      true
    );
    const r2 = r2Picks.map((x, k) => ({ m: this.member(x.m.cfg, r2Fits[k]!, x.m.genome), why: x.why }));
    const r3Picks = this.promote(
      r2.map((x) => x.m),
      b.r3Keep,
      b.r3Distinct
    );
    const r3Fits = await this.fitMany(
      r3Picks.map((x) => x.m.cfg),
      'r3',
      b.r3,
      true
    );
    const starts: { fit: Fit; kind: StartKind }[] = refinementStarts(
      r3Fits,
      this.refineLane() ? ['robust', 'profit', 'profit-2'] : ['robust', 'profit'],
      (a, c) => cfgDistance(this.configs.get(a.id)!, this.configs.get(c.id)!),
      b.refineDistinct
    );

    for (const focus of (s.seeds ?? []).filter((x) => x.focus)) {
      const [f] = await this.fitMany([focus.cfg], 'refine', b.refineN, true);

      starts.push({ fit: f!, kind: 'focus-profit' }, { fit: f!, kind: 'focus-robust' });
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
      vis.push({ id: f.id, cfg: this.configs.get(f.id)!, centreNet: f.centre.net, centreDd: f.centre.dd, p90: p90Of(f), parts: f.parts });
    }

    const members = [...this.archive.values()];
    const front = rankOrder(members.filter((m) => m.violation === 0));
    const nd = front.filter(
      (a) =>
        !front.some(
          (b2) => b2 !== a && b2.objectives.every((v, i) => v <= a.objectives[i]!) && b2.objectives.some((v, i) => v < a.objectives[i]!)
        )
    );

    this.count('r1Centres', this.archive.size);
    this.count('r1Measured', members.filter((m) => m.fit.nb).length);
    this.count('r1Feasible', members.filter((m) => m.violation === 0).length);
    this.count('frontier', nd.length);

    return {
      key: s.key,
      seedKey: s.seedKey,
      position: s.position,
      stage: s.stage,
      cell: s.cell.id,
      base: s.cell.base,
      replicate: s.replicate,
      kind: s.kind,
      triggerLog: this.triggerLog,
      counts: this.counts,
      byPattern: this.byPattern,
      ledgers: { centres: this.ledgerAll.size, feasible: this.ledgerFeasible.size },
      requested: this.requested,
      islands: this.islands,
      extension: this.extension,
      r2: r2.map((x) => ({ id: x.m.id, feasible: x.m.violation === 0, net: x.m.fit.centre.net, robust: robustOf(x.m.fit), p90: p90Of(x.m.fit), why: x.why })),
      r3: r3Fits.map((f) => ({ id: f.id, feasible: f.violation === 0, net: f.centre.net, robust: robustOf(f), p90: p90Of(f) })),
      refinements: ref.results,
      shortlist: list,
      visibleInfeasible: vis,
      // the lane's non-dominated feasible rung-1 fits (the 20 highest centre nets of them; the count is kept)
      frontier: nd
        .sort((a, c) => c.fit.centre.net - a.fit.centre.net || byId(a, c))
        .slice(0, 20)
        .map((m) => ({ id: m.id, net: m.fit.centre.net, robust: robustOf(m.fit), p90: p90Of(m.fit), dd: m.fit.centre.dd })),
      topByNet: [...members]
        .sort((a, c) => c.fit.centre.net - a.fit.centre.net || byId(a, c))
        .slice(0, 10)
        .map((m) => ({ id: m.id, net: m.fit.centre.net, robust: robustOf(m.fit), p90: p90Of(m.fit), dd: m.fit.centre.dd, feasible: m.violation === 0 })),
      failure: { screenPlausible: this.screenPlausible, screenReasons: this.screenReasons }
    };
  }
}
