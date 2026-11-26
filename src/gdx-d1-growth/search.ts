// GENERATED — DO NOT EDIT. P8-GDX's search lane: src/vg-l0-risk-envelope-pilot/search.ts (the lane Priority 5 ran:
// Assignment 3's frozen lane with the pilot's declared substitutions) with the declared substitutions of
// src/gdx-d1-growth/derive.ts applied (tools/gdx-d1-growth/derive.ts writes it; tests/derive.test.ts requires byte
// equality with a fresh derivation). The GDX space, the arm's options and feasibility; NL0's algorithm unchanged.
// The searches (PROTOCOL.md §7): one lane = one proposal source over one protected structure. Reference method NL0 1.0.0
// = 5B's pipeline (src/vg-lifecycle-matched-optimization/search.ts) as Assignment 2 ported it to the D1 risk cells
// (src/vg-l0-risk-families/search.ts), extended to the FULL JOINT genome (space.ts) with 5B's own operators for its
// categorical genes. Each item below is an adaptation stated in the protocol:
//
// - Track I broad and refinement lanes pin a CELL (the two D1 families and gates); Track N informed lanes pin a FAMILY
//   PAIR and leave the two gates free (5B's informed islands freed the structure — the inclusion — likewise);
// - the categorical genes evolve: Growth·VGT's 8 structural genes and each protected book's activation (and in Track N
//   the gates) by 5B's uniform crossover (p 0.9) and reset (rate 1 / free categorical genes); the ordinal genes by SBX
//   (η 15, p 0.9) and polynomial mutation (η 20, rate 1 / active ordinal genes) on grid indices; inactive genes never
//   mutate;
// - protections: the screen's strata (activation × K × Growth stratum, space.ts strataSequence); promotion and rung
//   shares ⅛ per Growth entry pattern (NL0's V cell) AND ⅛ per control pattern (K and activation; Assignment 2's K
//   share) where more than one pattern is present; shortlist slots for the Growth entry, Growth gate and control-pattern
//   alternatives (NL0's entry and gate alternatives, Assignment 2's K alternative) and, in Track N, the best member of each
//   gate state (NL0's best V / G / B);
// - every seed label is the lane's seed key `<cutoff>/<stage>/<structure>/R<r>` in this study's namespace;
// - REFINEMENT lanes (Track I stage 2) are NL0's informed schedule seeded with the SAME cutoff's qualified broad members of
//   their cell; INFORMED lanes (Track N, C24) are NL0's informed schedule seeded with the incumbents projected onto the
//   lane's family pair (informed.ts).
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
import { log, seedOf } from './context.ts';
import {
  type Cell,
  type Cfg,
  type PairId,
  type Resolution,
  activeOrdinal,
  cellOf,
  cellOfPairGate,
  cfgDistance,
  cfgId,
  classKeyOf,
  controlPatternOf,
  decode,
  encode,
  gEntryOf,
  gGateOf,
  growthStratumOf,
  gateStates,
  levelsOf,
  movesOf,
  nCat,
  nGenes,
  neighbourhood,
  pairOf,
  pinCell,
  pinPair,
  pinStratum,
  pinnedOfCell,
  pinnedOfPair,
  screenGenomes,
  designNeighbourhood,
  maxMoves
} from './space.ts';
import { type Fit, bandedOrder, fundedOf, nbStats, p90Of, robustOf } from '../vg-l0-full-joint/fitness.ts';
import { fitOfArm, plausibleArm, screenReason, screenViolation } from './fitness.ts';
import type { GdxArm as Arm } from './context.ts';
import type { EvalLab as Lab } from '../gpu-backend/lab.ts';

export type LaneKind = 'indep' | 'refine' | 'informed';

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
// with the highest centre net; profit-2 (the refinement and informed lanes' third start: Assignment 2's reassignment of
// 5B's both-Growth start) = the next feasible fit by centre net; each start distinct; robust and profit fall back to the
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
  genome?: number[]; // with the seed's dormant values (Track N: the seed grid's gate controls)
  focus?: boolean;
}

export interface LaneSpec {
  key: string; // = the seed key, e.g. C21/broad/GB1.VD0/R2, C24/informed/GC.VA/R3
  seedKey: string;
  position: string; // the unit of extension (one lane per position)
  stage: 'broad' | 'refine' | 'informed';
  replicate: number;
  cutoff: string;
  kind: LaneKind;
  res: Resolution;
  cell?: Cell; // indep and refine: the pinned cell
  pair?: PairId; // informed: the pinned family pair (gates free)
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
  stage: 'broad' | 'refine' | 'informed';
  structure: string; // the cell, or the family pair of an informed lane
  replicate: number;
  kind: LaneKind;
  res: Resolution;
  triggerLog: { island: number; fired: boolean; reason: string; positionExtended?: boolean }[];
  counts: Record<string, number>;
  byClass: Record<string, { screened: number; plausible: number; promoted: number; centres: number; feasible: number }>;
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
  failure: { screenPlausible: number; screenReasons: Record<string, number> };
}

const hvPoints = (ms: readonly Member[]): Scored[] =>
  ms.map((m) => ({ id: m.id, genome: m.genome, violation: m.violation, objectives: [m.objectives[1]!, m.objectives[2]!] }));

// why a screened centre was implausible (coverage: intrinsic validity versus poor metrics)
const reasonOf = (r: Rec, arm: Arm) => screenReason(r, arm);

// the round-robin ⅛ share over the patterns present in a list (each round: the best of each pattern not yet taken)
const roundRobin = <T>(list: readonly T[], patternOf: (x: T) => string, cap: number, take: (x: T) => boolean, room: () => boolean) => {
  const patterns = [...new Set(list.map(patternOf))].sort();

  if (patterns.length < 2) return 0;

  const lists = patterns.map((p) => list.filter((x) => patternOf(x) === p));
  let taken = 0;

  for (let more = true; more && taken < cap && room(); ) {
    more = false;
    for (const l of lists) {
      if (taken >= cap || !room()) break;

      const x = l.find((y) => take(y));

      if (x === undefined) continue;
      taken++;
      more = true;
    }
  }
  return taken;
};

export class Lane {
  private readonly archive = new Map<string, Member>(); // rung-1 fits of the lane
  private readonly configs = new Map<string, Cfg>();
  readonly counts: Record<string, number> = {};
  private readonly islands: IslandLog[] = [];
  private readonly byClass: LaneResult['byClass'] = {};
  private readonly ledgerAll = new Set<string>();
  private readonly ledgerFeasible = new Set<string>();
  private readonly genomes = new Map<string, number[]>();
  private readonly screenReasons: Record<string, number> = {};
  private screenPlausible = 0;
  private readonly levels: number[];
  private readonly pinnedSet: Set<number>;
  extension: LaneResult['extension'] = { islands: 0, reason: 'not applicable', stop: 'not applicable' };
  requested = 0;

  constructor(
    private readonly lab: Lab,
    readonly spec: LaneSpec,
    readonly b: Budget,
    readonly arm: Arm,
    readonly laneCap: number
  ) {
    this.levels = levelsOf(spec.res);
    if (spec.kind === 'informed') {
      if (!spec.pair) throw new Error(`${spec.key}: an informed lane needs its family pair`);
      this.pinnedSet = pinnedOfPair(spec.pair);
    } else {
      if (!spec.cell) throw new Error(`${spec.key}: a cell lane needs its cell`);
      this.pinnedSet = pinnedOfCell(spec.cell);
    }
  }

  private reserve(n: number) {
    if (this.requested + n > this.laneCap)
      throw new Error(`${this.spec.key} (${this.arm.key}): ${this.requested} + ${n} requested evaluations exceed the lane's deterministic bound ${this.laneCap}`);
  }

  private count(k: string, n = 1) {
    this.counts[k] = (this.counts[k] ?? 0) + n;
  }

  private classRow(c: Cfg) {
    return (this.byClass[classKeyOf(c)] ??= { screened: 0, plausible: 0, promoted: 0, centres: 0, feasible: 0 });
  }

  private labels = (...parts: (string | number)[]) => [...parts, this.spec.seedKey];
  private crn = (rung: string) => [rung, this.spec.cutoff]; // common random numbers across the cutoff's centres
  private seededLane = () => this.spec.kind !== 'indep';
  private structure = () => this.spec.cell?.id ?? this.spec.pair!;

  private pin(g: number[]) {
    return this.spec.kind === 'informed' ? pinPair(g, this.spec.pair!) : pinCell(g, this.spec.cell!);
  }

  private decodeOf(g: number[]): Cfg | null {
    try {
      const c = decode(g, this.spec.res, this.spec.cell!);

      if (this.spec.kind === 'informed' ? pairOf(cellOf(c.cell)) !== this.spec.pair : c.cell !== this.spec.cell!.id)
        throw new Error(`${this.spec.key}: a genome left the lane's structure (${c.cell})`);
      return c;
    } catch (error) {
      if ((error as Error).message.includes("left the lane's structure")) throw error;
      return null;
    }
  }

  // ----- fits: the centre first; the unique neighbours under the rung's common seed family only for a plausible centre
  // (centre-first fidelity) unless `full`; `gate` withholds neighbours from a move whose centre cannot be chosen -----

  async fitMany(cfgs: readonly Cfg[], rung: string, n: number, full = false, gate?: (centre: Rec) => boolean): Promise<Fit[]> {
    this.reserve(cfgs.length);
    const centres = await this.lab.evalMany(
      cfgs.map((c) => ({ cfg: c, options: this.arm.options, risk: true })),
      `${this.arm.key} ${this.spec.key} ${rung}:centre`
    );

    this.requested += cfgs.length;

    const fam = { name: rung, n, labels: this.crn(rung), scope: 'joint' as const };
    const plans = cfgs.map((c, i) =>
      !full && (!plausibleArm(centres[i]!, this.arm) || (gate && !gate(centres[i]!))) ? { c, nb: null } : { c, nb: neighbourhood(c, fam) }
    );
    const items = plans.flatMap((p) => (p.nb ?? []).map((x) => ({ cfg: x.cfg, options: this.arm.options, risk: true })));
    this.reserve(items.length);
    const recs = await this.lab.evalMany(items, `${this.arm.key} ${this.spec.key} ${rung}:neighbours`);

    this.requested += items.length;

    const out: Fit[] = [];
    let at = 0;

    plans.forEach((p, i) => {
      const centre = centres[i]!;
      const id = cfgId(p.c);
      const nbRecs = p.nb ? p.nb.map(() => recs[at++]!) : null;
      const nb = p.nb
        ? nbStats(
            centre,
            nbRecs!,
            p.nb.map((x) => x.clipped)
          )
        : null;

      out.push(fitOfArm(rung, id, centre, nb, nbRecs, this.arm));
      if (!this.configs.has(id)) {
        this.configs.set(id, p.c);
        this.lab.store.write('configs', id, p.c);
      }
    });

    return out;
  }

  private member(c: Cfg, f: Fit, genome?: number[]): Member {
    const g = genome ?? this.genomes.get(f.id) ?? this.pin(encode(c, this.spec.res));

    if (!this.genomes.has(f.id)) this.genomes.set(f.id, g);
    return { id: f.id, genome: g, objectives: f.objectives, violation: f.violation, cfg: c, fit: f };
  }

  private addArchive(m: Member) {
    if (this.archive.has(m.id)) return;
    this.archive.set(m.id, m);

    const row = this.classRow(m.cfg);

    row.centres++;
    if (m.violation === 0) row.feasible++;
    this.ledgerAll.add(m.fit.centre.signature);
    if (m.violation === 0) this.ledgerFeasible.add(m.fit.centre.signature);
  }

  // ----- screen and promotion (indep) -----

  private async screen() {
    const cell = this.spec.cell!;
    const n = this.b.screen;
    const genomes = screenGenomes(n, this.spec.res, ...this.labels('screen')).map((g, i) => pinStratum(g, cell, i, n));
    const seen = new Set<string>();
    const cfgs: Cfg[] = [];
    const gs: number[][] = [];

    for (const g of genomes) {
      const c = this.decodeOf(g);

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

    this.reserve(cfgs.length);
    const recs = await this.lab.evalMany(
      cfgs.map((c) => ({ cfg: c, options: this.arm.options, risk: true })),
      `${this.arm.key} ${this.spec.key} screen`
    );

    this.requested += cfgs.length;

    const items = cfgs.map((c, i) => {
      const r = recs[i]!;
      const ok = plausibleArm(r, this.arm);
      const violation = ok ? 0 : screenViolation(r, this.arm);
      const row = this.classRow(c);
      const why = reasonOf(r, this.arm);

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

    // promotion: ¼ centre net among the plausible, ¼ constrained rank on (−net, DD), ⅛ per Growth entry pattern, ⅛ per
    // control pattern (each only with more than one pattern present), the rest max-min diversity; one per funded ledger
    // in the first four
    const k = Math.min(this.b.promote, items.length);
    const chosen = new Map<string, (typeof items)[number]>();
    const ledgers = new Set<string>();
    const tryTake = (x: (typeof items)[number], why: string) => {
      if (chosen.size >= k || chosen.has(x.id) || ledgers.has(x.signature)) return false;
      chosen.set(x.id, x);
      ledgers.add(x.signature);
      this.count(`promoted:${why}`);
      return true;
    };
    const takeFrom = (list: typeof items, cap: number, why: string) => {
      let n2 = 0;

      for (const x of list) {
        if (n2 >= cap || chosen.size >= k) break;
        if (tryTake(x, why)) n2++;
      }
    };
    const byNet = items.filter((x) => x.plausible).sort((a, b) => b.net - a.net || byId(a, b));

    takeFrom(byNet, Math.ceil(k / 4), 'net');
    takeFrom(rankOrder(items), Math.ceil(k / 4), 'rank');
    roundRobin(byNet, (x) => gEntryOf(x.cfg), Math.ceil(k / 8), (x) => tryTake(x, 'Growth entry pattern'), () => chosen.size < k);
    roundRobin(byNet, (x) => controlPatternOf(x.cfg), Math.ceil(k / 8), (x) => tryTake(x, 'control pattern'), () => chosen.size < k);

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

    for (const x of chosen.values()) this.classRow(x.cfg).promoted++;
    this.count('promoted', chosen.size);
    return [...chosen.values()];
  }

  // ----- NSGA-II islands -----

  private variation(a: number[], b: number[], rng: Rng) {
    const ca = [...a];
    const cb = [...b];

    if (rng.next() <= ga.crossoverProbability)
      for (let i = 0; i < nCat; i++) {
        if (this.pinnedSet.has(i)) continue;
        if (rng.next() < 0.5) [ca[i], cb[i]] = [cb[i]!, ca[i]!];
      }

    const lv = this.levels.slice(nCat);
    const num = sbx(spaceOf(lv, 'num'), a.slice(nCat), b.slice(nCat), rng, ga);

    for (let i = 0; i < lv.length; i++) {
      if (this.pinnedSet.has(nCat + i)) continue;
      ca[nCat + i] = num.children[0]![i]!;
      cb[nCat + i] = num.children[1]![i]!;
    }
    return [ca, cb];
  }

  private mutate(g: number[], rng: Rng): number[] {
    const out = [...g];
    const c = this.decodeOf(this.pin([...g]));
    const free = (c ? activeOrdinal(c) : []).filter((i) => !this.pinnedSet.has(i));

    if (free.length) {
      const m = polynomialMutation(
        spaceOf(
          free.map((i) => this.levels[i]!),
          'active'
        ),
        free.map((i) => out[i]!),
        rng,
        ga
      );

      free.forEach((i, x) => (out[i] = m.genome[x]!));
    }

    const cats = Array.from({ length: nCat }, (_v, i) => i).filter((i) => !this.pinnedSet.has(i));

    for (const i of cats)
      if (rng.next() < 1 / Math.max(1, cats.length)) {
        const n = this.levels[i]!;
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

  // the extension rule's "new feasible behaviour class": the cell, the control pattern and the funded components
  private feasibleTriggerClasses() {
    return new Set(
      [...this.archive.values()]
        .filter((m) => m.violation === 0)
        .map((m) => `${m.cfg.cell}|${controlPatternOf(m.cfg)}|funded ${fundedOf(m.fit.centre).sort().join('+')}`)
    );
  }

  private state(): LaneState {
    return {
      hv: hypervolume2d(hvPoints([...this.archive.values()]), [0, this.arm.markedDdLimit]),
      robust: this.best((m) => robustOf(m.fit)),
      net: this.best((m) => m.fit.centre.net),
      classes: this.feasibleTriggerClasses().size
    };
  }

  private async island(index: number, initial: Member[], budgetNew: number) {
    const rng = Rng.from(...seedOf('ga', index, ...this.labels()));
    const before = this.state();
    const req0 = this.requested;
    const seen = new Set<string>([...this.archive.keys()]);
    let pop: Member[] = initial.slice(0, this.b.population);
    let invalid = 0;

    if (pop.length < this.b.population) {
      const nf = this.b.population * 4;
      const fillers = screenGenomes(nf, this.spec.res, ...this.labels('fill', index)).map((g, i) =>
        this.spec.kind === 'indep' ? pinStratum(g, this.spec.cell!, i, nf) : this.pin(g)
      );
      const add: { c: Cfg; g: number[] }[] = [];

      for (const g of fillers) {
        if (pop.length + add.length >= this.b.population) break;

        const c = this.decodeOf(g);

        if (!c) {
          invalid++;
          continue;
        }

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
    let bestHv = hypervolume2d(hvPoints(pop), [0, this.arm.markedDdLimit]);
    let bestNet = before.net;
    let stale = 0;

    for (let gen = 0; gen < this.b.generations; gen++) {
      if (lg.newConfigs >= budgetNew) {
        lg.stop = 'budget';
        break;
      }

      const ranked: Ranked<Member>[] = selectSurvivors(pop, this.b.population);
      const want = Math.min(this.b.population, budgetNew - lg.newConfigs);
      const children: { c: Cfg; g: number[] }[] = [];
      let attempts = 0;

      while (children.length < want && attempts < want * 50) {
        attempts++;

        const p1 = tournament(ranked, rng).member;
        const p2 = tournament(ranked, rng).member;

        for (const x of this.variation(p1.genome, p2.genome, rng)) {
          if (children.length >= want) break;

          const g = this.pin(this.mutate(x, rng));
          const c = this.decodeOf(g);

          if (!c) {
            invalid++;
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
      pop = selectSurvivors([...pop, ...kids], this.b.population).map((r) => this.archive.get(r.member.id)!);

      const hv = hypervolume2d(hvPoints(pop), [0, this.arm.markedDdLimit]);
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
        [`lane ${this.arm.key} ${this.spec.key}`]: {
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
    lg.invalid = invalid;
    lg.after = this.state();
    lg.evaluations = this.requested - req0;
    lg.hvGainPer10k = lg.evaluations > 0 ? Math.round(((lg.after.hv - lg.before.hv) / lg.evaluations) * 1e4 * 100) / 100 : 0;
    this.islands.push(lg);
    this.count('islandConfigs', lg.newConfigs);
    log(`${this.arm.key} ${this.spec.key} island ${index}: ${lg.newConfigs} new (${lg.measured} measured), ${lg.generations} generations, stop ${lg.stop}`);
  }

  // ----- rungs: ¼ centre net (feasible), ¼ robust net (feasible), ⅛ per Growth entry pattern, ⅛ per control pattern,
  // the rest constrained rank; each pick distinct and one per funded ledger -----

  private promote(members: Member[], k: number, distinct: number) {
    const ranked = rankOrder(members);
    const feasible = members.filter((m) => m.violation === 0);
    const byNet = [...feasible].sort((a, b) => b.fit.centre.net - a.fit.centre.net || byId(a, b));
    const byRobust = [...feasible].sort((a, b) => robustOf(b.fit) - robustOf(a.fit) || byId(a, b));
    const out: { m: Member; why: string }[] = [];
    const tryTake = (m: Member, why: string) => {
      if (out.length >= k) return false;
      if (out.some((o) => o.m.id === m.id || o.m.fit.centre.signature === m.fit.centre.signature || cfgDistance(o.m.cfg, m.cfg) < distinct))
        return false;
      out.push({ m, why });
      return true;
    };
    const take = (q: Member[], why: string, cap: number) => {
      let n = 0;

      for (const m of q) {
        if (out.length >= k || n >= cap) break;
        if (tryTake(m, why)) n++;
      }
    };

    take(byNet, 'centre net', Math.ceil(k / 4));
    take(byRobust, 'robust net', Math.ceil(k / 4));
    roundRobin(byNet, (m) => gEntryOf(m.cfg), Math.ceil(k / 8), (m) => tryTake(m, 'Growth entry pattern'), () => out.length < k);
    roundRobin(byNet, (m) => controlPatternOf(m.cfg), Math.ceil(k / 8), (m) => tryTake(m, 'control pattern'), () => out.length < k);
    take(ranked, 'rank', k);
    take(byNet, 'centre net', k);
    return out;
  }

  // ----- refinement (NL0's moves; the cell never moves in Track I; Track N may switch a gate) -----

  private async refine(starts: { fit: Fit; kind: StartKind }[]) {
    const results: LaneResult['refinements'] = [];
    const endpoints: Cfg[] = [];
    const gateSwitches = this.spec.kind === 'informed';

    for (const start of starts) {
      let cur = this.configs.get(start.fit.id)!;
      let [curFit] = await this.fitMany([cur], 'refine', this.b.refineN, true);
      const path: LaneResult['refinements'][number]['path'] = [
        { pass: 0, moved: null, net: curFit!.centre.net, robust: robustOf(curFit!), violation: curFit!.violation }
      ];
      const passes = start.kind.startsWith('focus') ? this.b.focusPasses : this.b.refinePasses;

      for (let pass = 1; pass <= passes; pass++) {
        const moves = movesOf(cur, { gateSwitches });

        if (moves.length > maxMoves) throw new Error(`${this.spec.key}: ${moves.length} refinement moves exceed the bound ${maxMoves}`);
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

  // ----- the shortlist: profit, robust, balanced, (Track N) the best member of each gate state, the Growth entry, Growth
  // gate and control-pattern alternatives, then centre-net order; feasible, one per ledger, L∞ ≥ `distinct` -----

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
    if (this.spec.kind === 'informed')
      for (let i = 0; i < gateStates.length; i++) {
        const cell = cellOfPairGate(this.spec.pair!, i).id;

        if (picks.some((p) => p.cfg.cell === cell)) continue;
        take(
          byNet.find((f) => cfgOf(f).cell === cell),
          `best ${cell}`
        );
      }
    if (picks[0]) {
      const e = gEntryOf(picks[0].cfg);
      const gg = gGateOf(picks[0].cfg);
      const cp = controlPatternOf(picks[0].cfg);

      take(
        byNet.find((f) => gEntryOf(cfgOf(f)) !== e),
        'Growth entry alternative'
      );
      take(
        byNet.find((f) => gGateOf(cfgOf(f)) !== gg),
        'Growth gate alternative'
      );
      if (cp)
        take(
          byNet.find((f) => controlPatternOf(cfgOf(f)) !== cp),
          'control alternative'
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

    log(`lane ${this.arm.key} ${s.key} (${s.kind}) starts`);

    if (this.seededLane()) {
      const designs: { c: Cfg; g?: number[] }[] = [];
      const seen = new Set<string>();
      const push = (c: Cfg, dormant?: number[]) => {
        const id = cfgId(c);

        if (seen.has(id)) return;
        seen.add(id);
        designs.push({ c, g: this.pin(encode(c, s.res, dormant)) });
      };

      for (const [i, seed] of (s.seeds ?? []).entries()) {
        const dormant = seed.genome;

        push(seed.cfg, dormant);
        for (const p of designNeighbourhood(seed.cfg, { name: 'near', n: b.near, labels: this.labels('near', i), scale: 1.5 })) push(p.cfg, dormant);
        for (const p of designNeighbourhood(seed.cfg, { name: 'broad', n: b.broad, labels: this.labels('broad', i), scale: 3 })) push(p.cfg, dormant);
        if (seed.focus) {
          for (const p of designNeighbourhood(seed.cfg, { name: 'focus-small', n: b.focusSmall, labels: this.labels('focus', 'small', i), scale: 0.5 }))
            push(p.cfg, dormant);
          for (const p of designNeighbourhood(seed.cfg, { name: 'focus-mid', n: b.focusMid, labels: this.labels('focus', 'mid', i), scale: 1 }))
            push(p.cfg, dormant);
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
      this.seededLane() ? ['robust', 'profit', 'profit-2'] : ['robust', 'profit'],
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
    for (const m of members) this.count(`centres Growth ${growthStratumOf(m.cfg)}`);

    return {
      key: s.key,
      seedKey: s.seedKey,
      position: s.position,
      stage: s.stage,
      structure: this.structure(),
      replicate: s.replicate,
      kind: s.kind,
      res: s.res,
      triggerLog: this.triggerLog,
      counts: this.counts,
      byClass: this.byClass,
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

export const genomeLength = nGenes;
