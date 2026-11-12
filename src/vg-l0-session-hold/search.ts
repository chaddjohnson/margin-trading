// The searches (PROTOCOL.md §7): one lane = one proposal source over the fixed structure V, under the study's search
// unit ('ses': maximum holds in NYSE trading sessions). Reference method NL0 1.0.0 = 5B's pipeline
// (src/vg-lifecycle-matched-optimization/search.ts, Priority 3B's as Study 8's), unchanged except where the fixed scope
// makes a part inapplicable (PROTOCOL.md §7, each item an adaptation):
//
// - the evaluation unit replaces 5B's lifecycle (one arm; 5B's paired-seed design across arms is not needed); every seed
//   label is the lane's seed key `<cutoff>/<lane>/R<r>[/<sub-cell>]` in this study's namespace;
// - the inclusion is pinned to V in every lane, the informed lane included (5B let the informed islands and refinement
//   change it: B ↔ V/G moves); refinement never moves the inclusion;
// - 5B's both-Growth protections (B cells and the informed lane: ⅛ promotion shares, every fourth island, a refinement
//   start, a shortlist slot) cannot apply to V: the promotion shares and the shortlist slot fall through to the next
//   rules, as 5B's code does for an empty list; the protected island is an ordinary ('mixed') island; and the
//   both-Growth refinement start of the B-schedule sub-cell V3 and of the informed lane is REASSIGNED to a second profit
//   start ('profit-2': the next feasible rung-3 configuration by centre net at L∞ ≥ refineDistinct from the earlier
//   starts), so those lanes keep 5B's three starts;
// - extension: a lane is its own position (no other arm to synchronize with); the triggers, caps and the resource guard
//   are 5B's (stages.ts).
//
// Pipeline (5B's, unchanged): indep — Latin-supercube Sobol screen (coarse grid; strata round-robin) → promotion (¼ centre
// net among the plausible, ¼ constrained rank on (−net, DD), ⅛ per entry pattern, the rest max-min diversity) → rung 1
// (16 neighbours; centre-first) → NSGA-II islands on (−centre net, −robust net, p90 DD) → rung 2 (64) → rung 3 (128) →
// refinement (robust, profit[, profit-2]) → the shortlist. informed (C24) — the declared seeds and their near (1.5) and
// broad (3) designs, the focused designs (0.5, 1.0) of the focus seeds, islands, rungs, refinement (robust, profit,
// profit-2, and focus-profit / focus-robust at every focus seed with two passes) and the shortlist.
//
// Every stage is a deterministic function of its seed labels and of the evaluations it requests; with the archive this
// makes a rerun an exact replay (lab.ts). Lanes of one job run concurrently on one worker pool; each lane's state is
// its own; the extension decisions are taken at barriers (all lanes idle), so they are deterministic too.
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
import type { D1Grid } from '../vg-d1-growth-joint/books.ts';
import type { Rec } from '../vg-d1-growth-joint/evaluate.ts';
import { type Sym, economics, log, seedOf, symbols } from './context.ts';
import {
  type Cfg,
  type CellKey,
  type GConfig,
  type Genome,
  type Inc,
  type Resolution,
  canonicalOf,
  catLevels,
  cellName,
  cfgDistance,
  cfgId,
  classKey,
  classOf,
  d1Box,
  d1GeneOffset,
  decode,
  encode,
  entryGene,
  entryPatternOf,
  entryPatternsOf,
  firstGene,
  gGeneOffset,
  growthOn,
  incGene,
  incs,
  movesOf,
  nCat,
  neighbourhood,
  numLevels,
  numericGenes,
  optionsOf,
  pinCell,
  pinStratum,
  screenGenomes,
  structureOf,
  studyInc,
  triggerKey
} from './config.ts';
import {
  type Fit,
  type Nb,
  bandedOrder,
  bothGrowthFunded,
  fitOf,
  fundedOf,
  nbStats,
  p90Of,
  plausible,
  robustOf
} from './fitness.ts';
import type { Lab } from './lab.ts';
import type { Unit } from './unit.ts';

export type LaneKind = 'indep' | 'informed';

export interface Budget {
  screen: number; // indep: screened proposals per cell
  promote: number; // indep: promoted to rung 1 per cell
  r1: number;
  islands: number; // base islands
  islandsMax: number; // with extensions
  population: number;
  newPerIsland: number; // new distinct proposals per island (the cap)
  generations: number;
  patience: number;
  tolerance: number;
  extension: number; // the extension triggers' threshold
  r2Keep: number;
  r2: number;
  r2Distinct: number;
  r3Keep: number;
  r3: number;
  r3Distinct: number;
  refinePasses: number;
  focusPasses: number; // informed: the C4 starts
  refineN: number;
  refineMinGain: number;
  refineDistinct: number;
  shortlist: number;
  distinct: number;
  near: number; // informed: designs per seed at scale 1.5
  broad: number; // informed: designs per seed at scale 3
  focusSmall: number; // informed: C4 designs at scale 0.5
  focusMid: number; // informed: C4 designs at scale 1.0
}

export type StartKind = 'robust' | 'profit' | 'profit-2' | 'focus-profit' | 'focus-robust';

// The refinement starts of a lane from its rung-3 fits (5B's rule, PROTOCOL.md §7.2): robust = the banded best feasible
// fit; profit = the feasible fit with the highest centre net; profit-2 (this study's reassignment of 5B's both-Growth
// start) = the next feasible fit by centre net; each start distinct (another id, L∞ ≥ `distinct` from every earlier
// start); robust and profit fall back to the least-violating infeasible fits, profit-2 (like 5B's both start) does not.
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
  genome: Genome; // with the source's dormant vectors
  focus?: boolean; // C4: the focused neighbourhood investigation
}

export interface LaneSpec {
  key: string; // e.g. C24/ses/indep/R2/V3 (the unit is part of the key, never of a seed label)
  seedKey: string; // e.g. C24/indep/R2/V3: every seed label of the lane
  position: string; // the unit of extension (= the lane's seed key: one lane per position in this study)
  unit: Unit;
  replicate: number;
  cutoff: string;
  kind: LaneKind;
  cell?: CellKey;
  res: Resolution;
  d1Fixed?: Record<Sym, D1Grid>; // informed-fixed: VG #2's D1 vectors
  seeds?: Seed[];
  partners?: Partial<Record<Sym, GConfig[]>>; // informed: Growth vectors for inclusion moves (V/G → B)
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
  cfg: Cfg;
  fit: Fit;
}

export interface IslandLog {
  index: number;
  need: 'mixed' | 'all';
  generations: number;
  newConfigs: number;
  measured: number; // proposals given neighbours (centre plausible)
  duplicates: number;
  invalid: number;
  evaluations: number; // evaluations the island requested (centres and neighbours)
  stop: string;
  hvTrajectory: number[];
  bestRobustTrajectory: number[];
  bestNetTrajectory: number[];
  before: LaneState;
  after: LaneState;
  hvGainPer10k: number; // progress per unit of compute: lane hypervolume gain per 10,000 evaluations
}

interface LaneState {
  hv: number;
  robust: number;
  net: number;
  classes: number;
  bothNet: number;
}

export interface Pick extends Fit {
  pick: string;
  cfg: Cfg;
}

export interface LaneResult {
  key: string;
  seedKey: string;
  position: string;
  unit: Unit;
  replicate: number;
  triggerLog: { island: number; fired: boolean; reason: string; positionExtended?: boolean }[];
  kind: LaneKind;
  cell: string | null;
  counts: Record<string, number>;
  byClass: Record<
    string,
    { screened: number; plausible: number; promoted: number; measured: number; feasible: number }
  >;
  byInc: Record<string, { centres: number; plausible: number; feasible: number; bothFunded: number }>;
  ledgers: { centres: number; feasible: number }; // distinct funded-lot ledgers
  requested: number;
  islands: IslandLog[];
  extension: { islands: number; reason: string; stop: string };
  r2: { id: string; feasible: boolean; net: number; robust: number; p90: number; why: string; inc: Inc }[];
  r3: { id: string; feasible: boolean; net: number; robust: number; p90: number; inc: Inc; bothFunded: boolean }[];
  refinements: {
    kind: string;
    start: string;
    endpoint: string;
    path: { pass: number; moved: string | null; net: number; robust: number; violation: number }[];
  }[];
  shortlist: Pick[];
  visibleInfeasible: {
    id: string;
    cfg: Cfg;
    centreNet: number;
    centreDd: number;
    p90: number;
    parts: Record<string, number>;
  }[];
  frontier: { id: string; inc: Inc; net: number; robust: number; p90: number; dd: number; both: boolean }[];
  topByNet: {
    id: string;
    inc: Inc;
    net: number;
    robust: number;
    p90: number;
    dd: number;
    feasible: boolean;
    both: boolean;
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
  private readonly archive = new Map<string, Member>(); // rung-1 fits of the lane
  private readonly configs = new Map<string, Cfg>();
  readonly counts: Record<string, number> = {};
  private readonly islands: IslandLog[] = [];
  private readonly byClass: LaneResult['byClass'] = {};
  private readonly byInc: LaneResult['byInc'] = {};
  private readonly ledgerAll = new Set<string>();
  private readonly ledgerFeasible = new Set<string>();
  private readonly genomes = new Map<string, Genome>(); // the genome a member was proposed with (dormant vectors kept)
  extension: LaneResult['extension'] = { islands: 0, reason: 'not applicable', stop: 'not applicable' };
  requested = 0; // evaluations this lane asked for (centres and neighbours; archive hits included)

  constructor(
    private readonly lab: Lab,
    readonly spec: LaneSpec,
    readonly b: Budget
  ) {}

  private count(k: string, n = 1) {
    this.counts[k] = (this.counts[k] ?? 0) + n;
  }

  private labels = (...parts: (string | number)[]) => [...parts, this.spec.seedKey];
  private crn = (rung: string) => [rung, this.spec.cutoff]; // common random numbers across the cutoff's centres
  private informed = () => this.spec.kind !== 'indep';
  // 5B's both-Growth stratum (its B cells and the informed lane) needs a B structure: never in this study (V only)
  private protectedStratum = () => this.spec.cell?.inc === 'B';
  // the lanes that ran 5B's three refinement starts (its B cells → the V3 sub-cell; the informed lane): the both-Growth
  // start is reassigned to 'profit-2'
  private threeStarts = () => this.spec.cell?.sub === 'V3' || this.informed();

  // informed-fixed: VG #2's D1 vectors (identity hygiene and the pinned genes)
  private fixedUp(c: Cfg): Cfg {
    return this.spec.d1Fixed ? canonicalOf(c.inc, { ...c.quad, d1: this.spec.d1Fixed }) : c;
  }

  private decodeOrNull(g: Genome): Cfg | null {
    let c: Cfg;

    try {
      c = this.fixedUp(decode(g, this.spec.res));
    } catch {
      return null;
    }
    if (c.inc !== studyInc)
      throw new Error(`${this.spec.key}: a ${c.inc} configuration (the inclusion is pinned to V)`);
    return c;
  }

  // the inclusion gene of every proposal of this study: V (independent lanes pin it through the cell)
  private pinV(g: Genome) {
    g[incGene] = incs.indexOf(studyInc);
    return g;
  }

  private cls(c: Cfg) {
    return classKey(c);
  }

  // ----- fits: the centre first; the unique neighbours under the rung's common seed family only for a plausible centre
  // (centre-first fidelity) unless `full` -----

  // `gate` (refinement of a feasible start under the profit criterion only): a move whose centre cannot be chosen —
  // centre net below the current + the minimum gain — gets no neighbours (exactly equivalent selection; fewer
  // evaluations).
  async fitMany(
    cfgs: readonly Cfg[],
    rung: string,
    n: number,
    full = false,
    gate?: (centre: Rec) => boolean
  ): Promise<Fit[]> {
    const unit = this.spec.unit;
    const centres = await this.lab.evalMany(
      cfgs.map((c) => ({ quad: c.quad, options: optionsOf(c), unit })),
      `${rung}:centre`
    );

    this.requested += cfgs.length;
    const fam = { name: rung, n, labels: this.crn(rung), scope: 'joint' as const };
    const plans = cfgs.map((c, i) => {
      if (!full && (!plausible(centres[i]!) || (gate && !gate(centres[i]!)))) return { c, nb: null };

      const seen = new Set<string>([cfgId(c)]);
      const nb = neighbourhood(c, fam)
        .map((p) => ({ ...p, cfg: this.fixedUp(p.cfg) }))
        .filter((p) => {
          const id = cfgId(p.cfg);

          if (seen.has(id)) return false;
          seen.add(id);
          return true;
        });

      return { c, nb };
    });
    const items = plans.flatMap((p) =>
      (p.nb ?? []).map((x) => ({ quad: x.cfg.quad, options: optionsOf(x.cfg), unit }))
    );
    const recs = await this.lab.evalMany(items, `${rung}:neighbours`);

    this.requested += items.length;

    const out: Fit[] = [];
    let at = 0;

    plans.forEach((p, i) => {
      const centre = centres[i]!;
      const id = cfgId(p.c);
      let nb: Nb | null = null;

      if (p.nb) {
        const nbs: Rec[] = p.nb.map(() => recs[at++]!);

        nb = nbStats(
          centre,
          nbs,
          p.nb.map((x) => x.clipped)
        );
      }
      out.push(fitOf(rung, id, p.c.inc, centre, nb));
      if (!this.configs.has(id)) {
        this.configs.set(id, p.c);
        this.lab.store.write('configs', id, p.c);
      }
    });

    return out;
  }

  private member(c: Cfg, f: Fit, genome?: Genome): Member {
    const g = genome ?? this.genomes.get(f.id) ?? encode(c, this.spec.res);

    if (!this.genomes.has(f.id)) this.genomes.set(f.id, g);
    return { id: f.id, genome: g, objectives: f.objectives, violation: f.violation, cfg: c, fit: f };
  }

  private allView(m: Member): Member {
    return { ...m, violation: m.fit.violationAll };
  }

  private addArchive(m: Member) {
    if (this.archive.has(m.id)) return;
    this.archive.set(m.id, m);

    const c = this.cls(m.cfg);
    const k = (this.byClass[c] ??= { screened: 0, plausible: 0, promoted: 0, measured: 0, feasible: 0 });
    const ki = (this.byInc[m.cfg.inc] ??= { centres: 0, plausible: 0, feasible: 0, bothFunded: 0 });

    if (m.fit.nb) k.measured++;
    if (m.violation === 0) k.feasible++;
    ki.centres++;
    if (plausible(m.fit.centre)) ki.plausible++;
    if (m.violation === 0) ki.feasible++;
    if (m.cfg.inc === 'B' && bothGrowthFunded(m.fit.centre)) ki.bothFunded++;
    this.ledgerAll.add(m.fit.centre.signature);
    if (m.violation === 0) this.ledgerFeasible.add(m.fit.centre.signature);
  }

  // ----- screen and promotion (indep) -----

  private async screen() {
    const cell = this.spec.cell!;
    const genomes = screenGenomes(this.b.screen, this.spec.res, ...this.labels('screen')).map((g, i) =>
      pinStratum(pinCell(g, cell), cell, i)
    );
    const seen = new Set<string>();
    const cfgs: Cfg[] = [];
    const gs: Genome[] = [];

    for (const g of genomes) {
      const c = this.decodeOrNull(g);

      if (!c) {
        this.count('screenInvalid');
        continue;
      }

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
      cfgs.map((c) => ({ quad: c.quad, options: optionsOf(c), unit: this.spec.unit })),
      'screen'
    );
    const items = cfgs.map((c, i) => {
      const r = recs[i]!;
      const ok = plausible(r);
      const violation = ok
        ? 0
        : (r.error ? 1 : Math.max(0, -r.net) / economics.budget + (r.net > 0 ? 0 : 0.01)) +
          Math.max(0, r.dd - economics.ceiling) / economics.ceiling +
          (r.mixed ? 0 : 0.5);
      const k = (this.byClass[this.cls(c)] ??= { screened: 0, plausible: 0, promoted: 0, measured: 0, feasible: 0 });

      k.screened++;
      if (ok) k.plausible++;
      this.genomes.set(cfgId(c), gs[i]!);

      return {
        id: cfgId(c),
        genome: gs[i]!,
        objectives: [-r.net, r.dd],
        violation,
        cfg: c,
        plausible: ok,
        both: ok && c.inc === 'B' && bothGrowthFunded(r),
        net: r.net,
        signature: r.signature
      };
    });

    this.count('plausible', items.filter((x) => x.plausible).length);
    this.count('plausibleBoth', items.filter((x) => x.both).length);

    // promotion: ¼ centre net among the plausible, ¼ constrained rank on (−net, DD), ⅛ (B cells) centre net among the
    // plausible pools funding both Growth books, the rest max-min diversity; one per funded ledger in the first three
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
    if (cell.inc === 'B')
      takeFrom(
        byNet.filter((x) => x.both),
        Math.ceil(k / 8),
        'both'
      );

    // ⅛ by entry pattern (Rise and breakout protected): round-robin over the cell's entry patterns, each round the
    // highest-net plausible configuration of each pattern not yet chosen (one per funded ledger)
    {
      const lists = entryPatternsOf(cell.inc).map((p) => byNet.filter((x) => entryPatternOf(x.cfg) === p));
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
          this.count('promoted:entry');
          taken++;
          more = true;
        }
      }
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

    for (const x of chosen.values()) this.byClass[this.cls(x.cfg)]!.promoted++;
    this.count('promoted', chosen.size);

    return [...chosen.values()];
  }

  // ----- NSGA-II islands -----

  private pinned(): Set<number> {
    const pinned = new Set<number>([firstGene, incGene]); // the structure is V in every lane (the entry methods evolve)
    if (this.spec.d1Fixed)
      for (const s of symbols) for (let i = 0; i < d1Box.length; i++) pinned.add(d1GeneOffset[s] + i);

    return pinned;
  }

  private variation(a: Genome, b: Genome, rng: Rng, pinned: Set<number>) {
    const ca = [...a];
    const cb = [...b];

    if (rng.next() <= ga.crossoverProbability)
      for (let i = 0; i < nCat; i++) {
        if (pinned.has(i)) continue;
        if (rng.next() < 0.5) [ca[i], cb[i]] = [cb[i]!, ca[i]!];
      }

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
    const c = this.decodeOrNull(g);
    // the active ordinal genes: D1 (unless pinned) and the active Growth inputs of the ENABLED books
    const active: number[] = [];

    for (const s of symbols) d1Box.forEach((_b, i) => active.push(d1GeneOffset[s] + i));
    if (c)
      for (const s of symbols) {
        if (!growthOn(c.inc, s)) continue;

        const st = structureOf(c.quad.g[s]);

        numericGenes.forEach((gene, i) => {
          if (gene.active(st)) active.push(gGeneOffset[s] + i);
        });
      }

    const free = active.filter((i) => !pinned.has(i));
    const levels = numLevels(this.spec.res);
    const m = polynomialMutation(
      spaceOf(
        free.map((i) => levels[i - nCat]!),
        'active'
      ),
      free.map((i) => out[i]!),
      rng,
      ga
    );

    free.forEach((i, x) => (out[i] = m.genome[x]!));

    const cats = Array.from({ length: nCat }, (_v, i) => i).filter((i) => !pinned.has(i));

    for (const i of cats)
      if (rng.next() < 1 / Math.max(1, cats.length)) {
        const n = catLevels[i]!;
        const v = rng.int(n - 1);

        out[i] = v >= out[i]! ? v + 1 : v;
      }

    return out;
  }

  private best(pick: (m: Member) => number, filter: (m: Member) => boolean = () => true) {
    let best = -Infinity;

    for (const m of this.archive.values()) if (m.violation === 0 && filter(m)) best = Math.max(best, pick(m));
    return best;
  }

  private feasibleTriggerClasses() {
    return new Set(
      [...this.archive.values()].filter((m) => m.violation === 0).map((m) => triggerKey(m.cfg, fundedOf(m.fit.centre)))
    );
  }

  private state(): LaneState {
    return {
      hv: hypervolume2d(hvPoints([...this.archive.values()]), [0, economics.ceiling]),
      robust: this.best((m) => robustOf(m.fit)),
      net: this.best((m) => m.fit.centre.net),
      classes: this.feasibleTriggerClasses().size,
      bothNet: this.best(
        (m) => m.fit.centre.net,
        (m) => m.cfg.inc === 'B' && bothGrowthFunded(m.fit.centre)
      )
    };
  }

  private async island(index: number, need: 'mixed' | 'all', initial: Member[], budgetNew: number) {
    const rng = Rng.from(...seedOf('ga', index, ...this.labels()));
    const pinned = this.pinned();
    const before = this.state();
    const req0 = this.requested;
    const seen = new Set<string>([...this.archive.keys()]);
    const view = (m: Member) => (need === 'all' ? this.allView(m) : m);
    let pop: Member[] = initial.slice(0, this.b.population);

    if (pop.length < this.b.population) {
      const fillers = screenGenomes(this.b.population * 4, this.spec.res, ...this.labels('fill', index)).map((g, i) => {
        if (this.spec.cell) {
          pinCell(g, this.spec.cell);
          pinStratum(g, this.spec.cell, i);
        } else {
          g[firstGene] = 0;
          this.pinV(g);
        }
        return g;
      });
      const add: { c: Cfg; g: Genome }[] = [];

      for (const g of fillers) {
        if (pop.length + add.length >= this.b.population) break;

        const c = this.decodeOrNull(g);

        if (!c) continue;

        const id = cfgId(c);

        if (seen.has(id)) continue;
        seen.add(id);
        add.push({ c, g: this.spec.d1Fixed ? encode(c, this.spec.res) : g });
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
      need,
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
    let bestHv = hypervolume2d(hvPoints(pop.map(view)), [0, economics.ceiling]);
    let bestNet = need === 'all' ? before.bothNet : before.net;
    let stale = 0;

    for (let gen = 0; gen < this.b.generations; gen++) {
      if (lg.newConfigs >= budgetNew) {
        lg.stop = 'budget';
        break;
      }

      const ranked: Ranked<Member>[] = selectSurvivors(pop.map(view), this.b.population);
      const want = Math.min(this.b.population, budgetNew - lg.newConfigs);
      const children: { c: Cfg; g: Genome }[] = [];
      let attempts = 0;

      while (children.length < want && attempts < want * 50) {
        attempts++;

        const p1 = tournament(ranked, rng).member;
        const p2 = tournament(ranked, rng).member;

        for (const x of this.variation(p1.genome, p2.genome, rng, pinned)) {
          if (children.length >= want) break;

          const g = this.mutate(x, rng, pinned);

          if (this.spec.cell) pinCell(g, this.spec.cell);
          g[firstGene] = 0;
          this.pinV(g);

          const c = this.decodeOrNull(g);

          if (!c) {
            lg.invalid++;
            continue;
          }

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
      pop = selectSurvivors([...pop, ...kids].map(view), this.b.population).map((r) => this.archive.get(r.member.id)!);

      const hv = hypervolume2d(hvPoints(pop.map(view)), [0, economics.ceiling]);
      const net = need === 'all' ? this.state().bothNet : this.best((m) => m.fit.centre.net);

      lg.hvTrajectory.push(Math.round(hv));
      lg.bestRobustTrajectory.push(Math.round(this.best((m) => robustOf(m.fit))));
      lg.bestNetTrajectory.push(Math.round(net));

      // stagnation: neither the island's hypervolume of (−robust, p90) nor the lane's best feasible centre net (the
      // both-Growth best in a protected island) rose by more than the tolerance for `patience` generations
      const gained =
        hv > bestHv * (1 + this.b.tolerance) + 1e-9 || net > bestNet + Math.abs(bestNet) * this.b.tolerance + 1e-9;

      if (hv > bestHv) bestHv = hv;
      if (net > bestNet) bestNet = net;
      stale = gained ? 0 : stale + 1;

      this.lab.checkpoint({
        [`lane ${this.spec.key}`]: {
          stage: 'island',
          island: index,
          need,
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
    this.count(need === 'all' ? 'islandConfigsProtected' : 'islandConfigsMixed', lg.newConfigs);
    log(
      `${this.spec.key} island ${index} (${need}): ${lg.newConfigs} new (${lg.measured} measured), ${lg.generations} generations, stop ${lg.stop}`
    );
  }

  // ----- rungs: ¼ centre net (feasible), ¼ robust net (feasible), ⅛ both-Growth (feasible, B / informed), the rest
  // constrained rank; each pick distinct and one per funded ledger -----

  private promote(members: Member[], k: number, distinct: number) {
    const ranked = rankOrder(members);
    const feasible = members.filter((m) => m.violation === 0);
    const byNet = [...feasible].sort((a, b) => b.fit.centre.net - a.fit.centre.net || byId(a, b));
    const byRobust = [...feasible].sort((a, b) => robustOf(b.fit) - robustOf(a.fit) || byId(a, b));
    const both = byNet.filter((m) => m.cfg.inc === 'B' && bothGrowthFunded(m.fit.centre));
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
              cfgDistance(o.m.cfg, m.cfg) < distinct
          )
        )
          continue;
        out.push({ m, why });
        n++;
      }
    };

    take(byNet, 'centre net', Math.ceil(k / 4));
    take(byRobust, 'robust net', Math.ceil(k / 4));
    if (this.protectedStratum()) take(both, 'both Growth funded', Math.ceil(k / 8));

    // ⅛ by entry pattern (Rise and breakout protected): round-robin over the patterns present among the feasible
    // members, each round the highest-centre-net feasible member of each pattern not yet promoted
    {
      const patterns = [...new Set(byNet.map((m) => entryPatternOf(m.cfg)))].sort();
      const cap = Math.ceil(k / 8);
      const start = out.length;

      for (let more = true; more && out.length - start < cap && out.length < k;) {
        const before = out.length;

        for (const p of patterns) {
          if (out.length - start >= cap || out.length >= k) break;
          take(
            byNet.filter((m) => entryPatternOf(m.cfg) === p),
            'entry pattern',
            1
          );
        }
        more = out.length > before;
      }
    }

    take(ranked, 'rank', k);
    take(byNet, 'centre net', k);
    return out;
  }

  // ----- refinement -----

  private async refine(starts: { fit: Fit; kind: StartKind }[]) {
    const results: LaneResult['refinements'] = [];
    const endpoints: Cfg[] = [];
    const movable = { d1: !this.spec.d1Fixed, g: true, inc: false }; // the inclusion is fixed (V) in every lane

    for (const start of starts) {
      let cur = this.configs.get(start.fit.id)!;
      let [curFit] = await this.fitMany([cur], 'refine', this.b.refineN, true);
      const path: LaneResult['refinements'][number]['path'] = [
        { pass: 0, moved: null, net: curFit!.centre.net, robust: robustOf(curFit!), violation: curFit!.violation }
      ];
      const passes = start.kind.startsWith('focus') ? this.b.focusPasses : this.b.refinePasses;
      const viol = (f: Fit) => f.violation; // every start is under the lanes' 'mixed' need (no both-Growth start)

      for (let pass = 1; pass <= passes; pass++) {
        const self = cfgId(cur);
        const partners: Partial<Record<Sym, GConfig>> = {};

        for (const s of symbols) {
          const list = this.spec.partners?.[s];

          if (list?.length) partners[s] = list[(pass - 1) % list.length];
        }

        const moves = [
          ...new Map(
            movesOf(cur, movable, partners)
              .map((m) => this.fixedUp(m))
              .map((m) => [cfgId(m), m])
          ).values()
        ].filter((m) => cfgId(m) !== self);
        const profitLike = !(start.kind === 'robust' || start.kind === 'focus-robust');
        const floor = curFit!.centre.net + this.b.refineMinGain;
        const fits = await this.fitMany(
          moves,
          'refine',
          this.b.refineN,
          false,
          profitLike && viol(curFit!) === 0 ? (r) => r.net >= floor : undefined
        );
        const scored = fits.map((f, i) => ({ f, c: moves[i]! }));
        let next: { c: Cfg; f: Fit } | null = null;

        this.count('refineMoves', moves.length);

        if (viol(curFit!) === 0) {
          if (start.kind === 'robust' || start.kind === 'focus-robust') {
            const better = scored.filter(
              (x) => viol(x.f) === 0 && robustOf(x.f) >= robustOf(curFit!) + this.b.refineMinGain
            );

            if (better.length)
              next = bandedOrder(better.map((x) => ({ id: x.f.id, robust: robustOf(x.f), p90: p90Of(x.f), x })))[0]!.x;
          } else {
            const better = scored
              .filter((x) => viol(x.f) === 0 && x.f.centre.net >= curFit!.centre.net + this.b.refineMinGain)
              .sort((a, b) => b.f.centre.net - a.f.centre.net || byId(a.f, b.f));

            if (better.length) next = better[0]!;
          }
        } else {
          const better = scored
            .filter((x) => viol(x.f) <= viol(curFit!) - 0.01)
            .sort((a, b) => viol(a.f) - viol(b.f) || byId(a.f, b.f));

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
          violation: viol(next.f)
        });
      }

      results.push({ kind: start.kind, start: start.fit.id, endpoint: cfgId(cur), path });
      if (cfgId(cur) !== start.fit.id) endpoints.push(cur);
    }

    return { results, endpoints };
  }

  // ----- the shortlist (structural slots) -----

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
    const gatePair = (c: Cfg) => classOf(c).gates;

    take(byNet[0], 'profit');
    take([...feasible].sort((a, b) => robustOf(b) - robustOf(a) || byId(a, b))[0], 'robust');
    take(
      [...feasible].sort(
        (a, b) => robustOf(b) / Math.max(1, p90Of(b)) - robustOf(a) / Math.max(1, p90Of(a)) || byId(a, b)
      )[0],
      'balanced'
    );
    if (this.protectedStratum())
      take(
        byNet.find((f) => cfgOf(f).inc === 'B' && bothGrowthFunded(f.centre)),
        'both Growth funded'
      );
    if (this.informed())
      for (const inc of ['V', 'G', 'B'] as const)
        take(
          byNet.find((f) => cfgOf(f).inc === inc),
          `best ${inc}`
        );
    if (picks[0]) {
      const entry = entryPatternOf(picks[0].cfg);

      take(
        byNet.find((f) => entryPatternOf(cfgOf(f)) !== entry),
        'entry alternative'
      );
    }
    if (picks[0]) {
      const gates = gatePair(picks[0].cfg);

      take(
        byNet.find((f) => gatePair(cfgOf(f)) !== gates),
        'gate-alternative'
      );
    }
    for (const f of byNet) take(f, 'profit order');

    return picks;
  }

  // ----- the lane, in synchronized phases (stages.ts drives them; PROTOCOL.md §7.5) -----
  //
  // base(): the designs (informed) or the screen and its promotion (indep) → rung 1 → the base islands. After the last
  // island the lane's own extension triggers are recorded (`lastTrigger`). The job then decides, per comparable
  // POSITION (the same cutoff, lane type, replicate and cell under L0, L1 and L2), whether every lane of the position
  // runs one more island (extend()): it does iff ANY of the three lifecycles' lanes at that position fired, up to the
  // common cap. finish(): rungs 2 and 3, refinement and the shortlist.

  private r1Ranked: Member[] = [];
  private r1RankedAll: Member[] = [];
  lastTrigger: { island: number; fired: boolean; reason: string } | null = null;
  readonly triggerLog: { island: number; fired: boolean; reason: string; positionExtended?: boolean }[] = [];

  private needOf(i: number): 'mixed' | 'all' {
    return this.protectedStratum() && i % 4 === 3 ? 'all' : 'mixed';
  }

  async base(): Promise<void> {
    const s = this.spec;
    const b = this.b;

    log(`lane ${s.key} (${s.kind}) starts`);

    if (this.informed()) {
      const designs: { c: Cfg; g?: Genome }[] = [];
      const seen = new Set<string>();
      const push = (c0: Cfg, g?: Genome) => {
        const c = this.fixedUp(c0);
        const id = cfgId(c);

        if (seen.has(id)) return;
        seen.add(id);
        designs.push({ c, g });
      };

      for (const [i, seed] of (s.seeds ?? []).entries()) {
        push(seed.cfg, seed.genome);
        for (const p of neighbourhood(seed.cfg, {
          name: 'near',
          n: b.near,
          labels: this.labels('near', i),
          scale: 1.5
        }))
          push(p.cfg);
        for (const p of neighbourhood(seed.cfg, {
          name: 'broad',
          n: b.broad,
          labels: this.labels('broad', i),
          scale: 3
        }))
          push(p.cfg);
        if (seed.focus) {
          for (const p of neighbourhood(seed.cfg, {
            name: 'focus-small',
            n: b.focusSmall,
            labels: this.labels('focus', 'small', i),
            scale: 0.5
          }))
            push(p.cfg);
          for (const p of neighbourhood(seed.cfg, {
            name: 'focus-mid',
            n: b.focusMid,
            labels: this.labels('focus', 'mid', i),
            scale: 1
          }))
            push(p.cfg);
        }
      }

      this.count('seeds', s.seeds?.length ?? 0);
      this.count('seedDesigns', designs.length);

      const fits = await this.fitMany(
        designs.map((d) => d.c),
        'r1',
        b.r1
      );

      designs.forEach((d, i) => this.addArchive(this.member(d.c, fits[i]!, d.g)));
    } else {
      const promoted = await this.screen();
      const fits = await this.fitMany(
        promoted.map((x) => x.cfg),
        'r1',
        b.r1
      );

      promoted.forEach((x, i) => this.addArchive(this.member(x.cfg, fits[i]!, x.genome)));
    }

    // the islands' starting populations: the rung-1 archive of the designs / promoted screen split by rank order
    // (rank k → island k mod islands); the protected both-Growth islands use the rank order under need 'all'
    this.r1Ranked = rankOrder([...this.archive.values()]);
    this.r1RankedAll = rankOrder([...this.archive.values()].map((m) => this.allView(m))).map((m) =>
      this.archive.get(m.id)!
    );

    for (let i = 0; i < b.islands; i++) await this.runIsland(i, i + 1 === b.islands);
  }

  get islandsRun() {
    return this.islands.length;
  }

  get atCap() {
    return this.islands.length >= this.b.islandsMax;
  }

  // the worst-case evaluations of one more island (every new proposal plausible: centre + r1 neighbours)
  get islandWorstCase() {
    return this.b.newPerIsland * (1 + this.b.r1);
  }

  private async runIsland(i: number, measure: boolean) {
    const b = this.b;
    const need = this.needOf(i);
    const source = need === 'all' ? this.r1RankedAll : this.r1Ranked;
    const initial = source.filter((_m, k) => k % b.islands === i % b.islands);
    const prior = this.state();

    await this.island(i, need, initial, b.newPerIsland);

    if (!measure) return;

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
    const reason = `island ${i}: hypervolume ${(100 * triggers.hypervolume).toFixed(1)}%, best robust ${(100 * triggers.robust).toFixed(1)}%, best centre net ${(100 * triggers.net).toFixed(1)}%, ${triggers.newClasses} new feasible behaviour class(es)`;

    this.lastTrigger = { island: i, fired, reason };
    this.triggerLog.push({ island: i, fired, reason });
  }

  // one synchronized extension island (the job decided that this position extends)
  async extend(): Promise<void> {
    if (this.atCap) throw new Error(`${this.spec.key}: extension beyond the cap`);
    if (this.triggerLog.length) this.triggerLog.at(-1)!.positionExtended = true;
    await this.runIsland(this.islands.length, true);
  }

  async finish(stop: string): Promise<LaneResult> {
    const s = this.spec;
    const b = this.b;

    this.counts.islandsRun = this.islands.length;
    this.extension = {
      islands: this.islands.length,
      reason: this.lastTrigger?.reason ?? '',
      stop
    };

    // rung 2 and rung 3
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

    // refinement starts: robust (the banded order of the feasible rung 3), profit (the highest feasible rung-3 centre
    // net), both-Growth (the highest rung-3 centre net funding both Growth books; protected strata) and, in the
    // informed lanes, C4 itself (profit and robust); without a feasible rung-3 fit, the least violation
    // 5B: robust, profit (+ both-Growth in its B cells and the informed lane). Here the both-Growth start is reassigned to
    // 'profit-2' (V3 and the informed lane): like 5B's both start it needs a feasible fit (no infeasible fallback)
    const starts: { fit: Fit; kind: StartKind }[] = refinementStarts(
      r3Fits,
      this.threeStarts() ? ['robust', 'profit', 'profit-2'] : ['robust', 'profit'],
      (a, c) => cfgDistance(this.configs.get(a.id)!, this.configs.get(c.id)!),
      b.refineDistinct
    );

    for (const focus of (s.seeds ?? []).filter((x) => x.focus)) {
      const c = this.fixedUp(focus.cfg);
      const [f] = await this.fitMany([c], 'refine', b.refineN, true);

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
      vis.push({
        id: f.id,
        cfg: this.configs.get(f.id)!,
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
    this.count(
      'r1FeasibleBoth',
      members.filter((m) => m.violation === 0 && m.cfg.inc === 'B' && bothGrowthFunded(m.fit.centre)).length
    );
    this.count('r2', r2.length);
    this.count('r2Feasible', r2.filter((x) => x.m.violation === 0).length);
    this.count('r3', allR3.length);
    this.count('r3Feasible', allR3.filter((f) => f.violation === 0).length);
    this.count('shortlist', list.length);
    this.count('distinctCentres', this.configs.size);
    log(
      `lane ${s.key}: ${this.archive.size} rung-1 centres, ${this.counts.r1Feasible} feasible; shortlist ${list.length}`
    );

    const inc = (id: string) => this.configs.get(id)!.inc;

    return {
      key: s.key,
      seedKey: s.seedKey,
      position: s.position,
      unit: s.unit,
      replicate: s.replicate,
      triggerLog: this.triggerLog,
      kind: s.kind,
      cell: s.cell ? cellName(s.cell) : null,
      counts: this.counts,
      byClass: this.byClass,
      byInc: this.byInc,
      ledgers: { centres: this.ledgerAll.size, feasible: this.ledgerFeasible.size },
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
        inc: x.m.cfg.inc
      })),
      r3: allR3.map((f) => ({
        id: f.id,
        feasible: f.violation === 0,
        net: f.centre.net,
        robust: robustOf(f),
        p90: p90Of(f),
        inc: inc(f.id),
        bothFunded: bothGrowthFunded(f.centre)
      })),
      refinements: ref.results,
      shortlist: list,
      visibleInfeasible: vis,
      frontier: nd.map((m) => ({
        id: m.id,
        inc: m.cfg.inc,
        net: m.fit.centre.net,
        robust: robustOf(m.fit),
        p90: p90Of(m.fit),
        dd: m.fit.centre.dd,
        both: bothGrowthFunded(m.fit.centre)
      })),
      topByNet: [...members]
        .sort((a, c) => c.fit.centre.net - a.fit.centre.net || byId(a, c))
        .slice(0, 50)
        .map((m) => ({
          id: m.id,
          inc: m.cfg.inc,
          net: m.fit.centre.net,
          robust: robustOf(m.fit),
          p90: p90Of(m.fit),
          dd: m.fit.centre.dd,
          feasible: m.violation === 0,
          both: bothGrowthFunded(m.fit.centre)
        }))
    };
  }
}

export type { Cfg, Inc };
