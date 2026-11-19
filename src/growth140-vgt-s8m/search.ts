// The search (PROTOCOL.md §6; Study 8 §7.1, track V): Latin-supercube Sobol screen → promotion → rung 1 (16 points) →
// sequential NSGA-II islands (constrained domination, SBX η15 p0.9, PM η20, stagnation 10 / 1e-3) with T1 → rung 2
// (64) with T3 → rung 3 (128) → local refinement → T2 → shortlist (≤ 6 at L∞ ≥ 0.10).
//
// Resumable: the state below is plain data, checkpointed atomically at every stage boundary and island generation
// (and its progress at least once a minute); every evaluation lives in the job's archive. A resumed run regenerates
// the interrupted batch from the boundary state (the same RNG state) and finds the finished part on disk, so it
// reproduces an uninterrupted run exactly.
import fs from 'node:fs';
import path from 'node:path';
import {
  type Ranked,
  hypervolume2d,
  polynomialMutation,
  sbx,
  selectSurvivors,
  tournament
} from '../optimizer/nsga2.ts';
import type { ParameterSpace } from '../optimizer/params.ts';
import { Rng } from '../optimizer/rng.ts';
import { rankOrder } from '../study8-expanded-regime-d1/search.ts';
import { type Checkpointer, rngRestore, rngState } from './checkpoint.ts';
import { type Schedule, eligibility, ga, log, seedOf } from './context.ts';
import { type Fit, type Floors, fitsOf, stripRecords } from './fitness.ts';
import type { Lab } from './pool.ts';
import {
  type Config,
  type Family,
  type Genome,
  activeGenes,
  configDistance,
  configId,
  configOfGenome,
  effectiveOf,
  genomeOf,
  levelCounts,
  radiusOf,
  repair,
  screenGenomes,
  structureOf
} from './space.ts';
import type { Store } from './store.ts';

export const operatorSpace: ParameterSpace = {
  name: 'growth140-vgt-s8m',
  specs: levelCounts.map((levels, i) => ({
    key: `g${i}` as never,
    label: `gene ${i}`,
    unit: 'sessions',
    min: 0,
    max: levels - 1,
    step: 1,
    neighborhoodRadius: 1,
    rationale: 'grid index'
  }))
};

interface Compact {
  id: string;
  objectives: number[];
  violation: number;
  genome: number[];
  robust: number;
  p90: number;
}

interface IslandState {
  index: number;
  generation: number; // completed generations
  rng: number[];
  ranked: { id: string; rank: number; crowding: number }[];
  seen: string[];
  fitIds: string[];
  newConfigs: number;
  duplicates: number;
  stale: number;
  bestHv: number;
  bestMinViolation: number;
  hvTrajectory: number[];
  stop: string;
  done: boolean;
}

export interface SearchState {
  v: 1;
  stage: 'screen' | 'r1' | 'islands' | 'r2' | 'r3' | 'refine' | 't2' | 'shortlist' | 'done';
  screen?: {
    n: number;
    unique: number;
    plausible: number;
    promoted: { id: string; genome: Genome }[];
    distinctLedgers: number;
  };
  r1ScreenIds?: string[];
  islands: IslandState[];
  t1Log: { islands: number; fired: boolean; before: unknown; after: unknown }[];
  archiveIds: string[];
  r2Ids?: string[];
  t3?: unknown;
  r3Ids?: string[];
  refinements?: unknown[];
  t2?: { fired: boolean; gap: number; se: number; rescored: string[] };
  shortlist?: (Fit & { pick: string })[];
  progress?: { batch: string; done: number; total: number };
}

export interface SearchContext {
  lab: Lab;
  store: Store;
  schedule: Schedule;
  floors: Floors;
  labels: (string | number)[]; // the seed-family suffix (e.g. ['search', 'F24'] or ['pilot'])
  checkpoint: Checkpointer<SearchState>;
  stopAfterFresh?: number;
}

const byIdCmp = (a: { id: string }, b: { id: string }) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);

export class Search {
  state: SearchState;
  private archive = new Map<string, Compact>();
  private lastBoundary = '';

  constructor(
    private readonly x: SearchContext,
    resume: SearchState | null
  ) {
    this.state = resume ?? { v: 1, stage: 'screen', islands: [], t1Log: [], archiveIds: [] };

    for (const id of this.state.archiveIds) this.archive.set(id, this.compact(this.fit('r1', id)));
  }

  private label = (...parts: (string | number)[]) => [...parts, ...this.x.labels];
  private fam = (name: string, n: number, extra: Partial<Family> = {}): Family => ({
    name,
    n,
    labels: this.label(name),
    ...extra
  });
  private get R1() {
    return this.fam('r1', this.x.schedule.r1);
  }

  // ----- fits and the archive -----

  private fit(family: string, id: string): Fit {
    const f = this.x.store.read<Fit>('fits', `${family}|${id}`);

    if (!f) throw new Error(`fit ${family}|${id} is not in the archive`);
    return f;
  }

  private putFit(f: Fit) {
    this.x.store.write('fits', `${f.family}|${f.id}`, f);
  }

  private compact(f: Fit): Compact {
    return {
      id: f.id,
      objectives: f.objectives,
      violation: f.violation,
      genome: [],
      robust: f.nb.robustPerYear,
      p90: f.nb.p90Dd
    };
  }

  private addArchive(f: Fit) {
    if (this.archive.has(f.id)) return;
    this.archive.set(f.id, this.compact(f));
    this.state.archiveIds.push(f.id);
  }

  // Fits of many centres under one family (chunks of 256 centres; records never retained).
  private async fits(centres: { config: Config; genome: Genome }[], families: Family[], name: string, batch: string) {
    const out: Fit[] = [];
    const chunk = 256;

    for (let i = 0; i < centres.length; i += chunk) {
      this.state.progress = { batch, done: i, total: centres.length };
      this.maybeProgress();

      const part = await fitsOf(this.x.lab, centres.slice(i, i + chunk), families, name, this.x.floors);

      for (const f of part) {
        const fit = stripRecords(f) as Fit;

        this.putFit(fit);
        out.push(fit);
      }

      this.guard();
    }

    this.state.progress = undefined;
    return out;
  }

  // rung 1 with the archive: an already fitted configuration is reused
  private async r1(items: { config: Config; genome: Genome }[], batch: string) {
    const todo = items.filter((x) => !this.archive.has(configId(x.config)));
    const unique = [...new Map(todo.map((x) => [configId(x.config), x])).values()];
    const fresh = await this.fits(unique, [this.R1], 'r1', batch);

    for (const f of fresh) this.addArchive(f);
    return items.map((x) => this.fit('r1', configId(x.config)));
  }

  private hvOf(fits: readonly { violation: number; robust: number; p90: number; id: string }[]) {
    return hypervolume2d(
      fits.map((f) => ({ id: f.id, genome: [], objectives: [-f.robust, f.p90], violation: f.violation })),
      [0, eligibility.ceiling]
    );
  }

  private minViolation(fits: readonly { violation: number }[]) {
    return fits.reduce((m, f) => Math.min(m, f.violation), Infinity);
  }

  // ----- checkpoints -----

  private boundary(note: string) {
    this.x.store.commit();
    this.state.progress = undefined;
    this.lastBoundary = note;
    this.x.checkpoint.write(this.state);
  }

  private maybeProgress() {
    if (Date.now() - this.x.checkpoint.lastWrite >= 60000) {
      this.x.store.commit();
      this.x.checkpoint.write(this.state);
    }
  }

  private guard() {
    if (this.x.stopAfterFresh !== undefined && this.x.lab.fresh >= this.x.stopAfterFresh)
      this.x.lab.pool.requestStop(`stop-after ${this.x.stopAfterFresh} fresh evaluations (restart test)`);
  }

  // ----- distinctness helpers -----

  private config(id: string) {
    const c = this.x.store.read<Config>('configs', id);

    if (!c) throw new Error(`configuration ${id} is not in the archive`);
    return c;
  }

  private greedyDistinct(ordered: { id: string }[], keep: number, minimum: number) {
    const out: { id: string; config: Config }[] = [];

    for (const item of ordered) {
      if (out.length >= keep) break;

      const c = this.config(item.id);

      if (out.every((o) => configDistance(c, o.config) >= minimum)) out.push({ id: item.id, config: c });
    }

    return out;
  }

  // ----- the pipeline -----

  async run() {
    const s = this.x.schedule;

    if (this.state.stage === 'screen') await this.screen();
    if (this.state.stage === 'r1') {
      const fits = await this.r1(
        this.state.screen!.promoted.map((p) => ({ config: configOfGenome(p.genome), genome: p.genome })),
        'r1-screen'
      );

      this.state.r1ScreenIds = fits.map((f) => f.id);
      this.state.stage = 'islands';
      log(`rung 1 on the screen: ${fits.filter((f) => f.violation === 0).length}/${fits.length} feasible`);
      this.boundary('r1');
    }

    if (this.state.stage === 'islands') {
      await this.islands();
      this.state.stage = 'r2';
      this.boundary('islands');
    }

    if (this.state.stage === 'r2') {
      await this.rung2();
      this.state.stage = 'r3';
      this.boundary('r2');
    }

    if (this.state.stage === 'r3') {
      const r2 = this.state.r2Ids!.map((id) => this.fit('r2', id));
      const pick = this.greedyDistinct(rankOrder(r2), s.r3Keep, s.r3Distinct);
      const fits = await this.fits(
        pick.map((p) => ({ config: p.config, genome: this.fit('r2', p.id).genome })),
        [this.fam('r3', s.r3)],
        'r3',
        'r3'
      );

      this.state.r3Ids = fits.map((f) => f.id);
      this.state.stage = 'refine';
      log(`rung 3: ${fits.filter((f) => f.violation === 0).length}/${fits.length} feasible`);
      this.boundary('r3');
    }

    if (this.state.stage === 'refine') {
      await this.refine();
      this.state.stage = 't2';
      this.boundary('refine');
    }

    if (this.state.stage === 't2') {
      await this.t2();
      this.state.stage = 'shortlist';
      this.boundary('t2');
    }

    if (this.state.stage === 'shortlist') {
      this.shortlist();
      this.state.stage = 'done';
      this.boundary('shortlist');
    }

    return this.state;
  }

  private async screen() {
    const s = this.x.schedule;
    const genomes = screenGenomes(s.screen, ...this.label('screen'));
    const byId = new Map<string, { config: Config; genome: Genome }>();

    for (const genome of genomes) {
      const config = configOfGenome(genome);
      const id = configId(config);

      if (!byId.has(id)) byId.set(id, { config, genome });
    }

    const items = [...byId.entries()];
    const records: import('./engine.ts').PointRecord[] = [];

    for (let i = 0; i < items.length; i += 2048) {
      this.state.progress = { batch: 'screen', done: i, total: items.length };
      this.maybeProgress();
      records.push(...(await this.x.lab.points(items.slice(i, i + 2048).map(([, v]) => v.config))));
      this.guard();
    }

    const minLots = Math.ceil(this.x.floors.lots / 2);
    const plausible = items
      .map(([id, v], i) => ({ id, ...v, r: records[i]! }))
      .filter(({ r }) => r.dd < eligibility.ceiling && r.net > 0 && r.trades >= minLots);
    let promoted: { id: string; genome: Genome; config: Config }[];

    if (plausible.length <= s.r1Cap) promoted = plausible;
    else {
      const ranked = rankOrder(
        plausible.map((p) => ({ id: p.id, genome: [], objectives: [-p.r.net, p.r.dd, -p.r.trades], violation: 0 }))
      );
      const half = Math.floor(s.r1Cap / 2);
      const index = new Map(plausible.map((p) => [p.id, p]));
      const chosen = ranked.slice(0, half).map((x) => index.get(x.id)!);
      const taken = new Set(chosen.map((c) => c.id));
      const rest = plausible.filter((p) => !taken.has(p.id)).sort(byIdCmp);
      const minDist = rest.map((p) => Math.min(...chosen.map((c) => configDistance(p.config, c.config))));

      while (chosen.length < s.r1Cap && rest.length) {
        let best = 0;

        for (let i = 1; i < rest.length; i++)
          if (minDist[i]! > minDist[best]! || (minDist[i] === minDist[best] && rest[i]!.id < rest[best]!.id)) best = i;

        const [item] = rest.splice(best, 1);

        minDist.splice(best, 1);
        chosen.push(item!);
        for (let i = 0; i < rest.length; i++)
          minDist[i] = Math.min(minDist[i]!, configDistance(rest[i]!.config, item!.config));
      }

      promoted = chosen;
    }

    this.state.screen = {
      n: s.screen,
      unique: items.length,
      plausible: plausible.length,
      promoted: promoted.map((p) => ({ id: p.id, genome: p.genome })),
      distinctLedgers: new Set(records.map((r) => r.signature)).size
    };
    this.state.stage = 'r1';
    log(
      `screen: ${s.screen} vectors, ${items.length} distinct configurations, ${plausible.length} plausible, ${promoted.length} promoted`
    );
    this.boundary('screen');
  }

  // ----- islands -----

  private async islands() {
    const s = this.x.schedule;
    const screenFits = this.state.r1ScreenIds!.map((id) => this.fit('r1', id));
    const screenOrder = rankOrder(screenFits.map((f) => ({ ...f })));

    const unionHv = () => this.hvOf([...this.archive.values()]);
    const unionMv = () => this.minViolation([...this.archive.values()]);

    // islands run in index order; a finished island is not rerun
    const runAll = async (count: number) => {
      while (this.state.islands.filter((i) => i.done).length < count) {
        const index = this.state.islands.filter((i) => i.done).length;

        await this.island(index, s.islands, screenOrder);
      }
    };

    await runAll(s.islands);

    if (s.t1) {
      // T1: if the last island raised the union hypervolume by ≥ 10% (or, with nothing feasible, lowered the minimum
      // violation by ≥ 25%), run two more, up to islandsMax. Before/after are recorded with each island.
      for (;;) {
        const done = this.state.islands.filter((i) => i.done);

        if (done.length >= s.islandsMax) break;
        if (this.state.t1Log.some((l) => l.islands === done.length)) {
          const last = this.state.t1Log.find((l) => l.islands === done.length)!;

          if (!last.fired) break;
          await runAll(Math.min(s.islandsMax, done.length + 2));
          continue;
        }

        const lastIsland = done.at(-1)! as IslandState & {
          before?: { hv: number; mv: number };
          after?: { hv: number; mv: number };
        };
        const before = lastIsland.before!;
        const after = lastIsland.after!;
        const fired = before.hv > 0 ? after.hv >= before.hv * 1.1 : after.hv > 0 || after.mv <= before.mv * 0.75;

        this.state.t1Log.push({ islands: done.length, fired, before, after });
        this.boundary(`t1 ${done.length}`);
        if (!fired) break;
        await runAll(Math.min(s.islandsMax, done.length + 2));
      }
    }

    void unionHv;
    void unionMv;
    log(
      `islands: ${this.state.islands.length} run; archive ${this.archive.size} configurations, ${[...this.archive.values()].filter((f) => f.violation === 0).length} rung-1 feasible`
    );
  }

  private async island(index: number, islandCount: number, screenOrder: Fit[]) {
    const s = this.x.schedule;
    let st = this.state.islands.find((i) => i.index === index) as
      (IslandState & { before?: { hv: number; mv: number }; after?: { hv: number; mv: number } }) | undefined;

    if (!st) {
      const before = { hv: this.hvOf([...this.archive.values()]), mv: this.minViolation([...this.archive.values()]) };
      const members = screenOrder.filter((_f, i) => i % islandCount === index % islandCount);
      const population: Fit[] = members.slice(0, s.population);
      const seen = new Set(population.map((f) => f.id));

      if (population.length < s.population) {
        const fillers: { config: Config; genome: Genome }[] = [];

        for (const genome of screenGenomes(s.population * 4, ...this.label('fill', index))) {
          const config = configOfGenome(genome);
          const id = configId(config);

          if (seen.has(id) || fillers.some((f) => configId(f.config) === id)) continue;
          fillers.push({ config, genome });
          if (population.length + fillers.length >= s.population) break;
        }

        const fits = await this.r1(fillers, `island ${index} fill`);

        for (const f of fits) {
          seen.add(f.id);
          population.push(f);
        }
      }

      const ranked = selectSurvivors(population, s.population);

      st = {
        index,
        generation: 0,
        rng: rngState(Rng.from(...seedOf(...this.label('ga', index)))),
        ranked: ranked.map((r) => ({ id: r.member.id, rank: r.rank, crowding: r.crowding })),
        seen: [...seen],
        fitIds: population.map((f) => f.id),
        newConfigs: 0,
        duplicates: 0,
        stale: 0,
        bestHv: this.hvOf(population.map((f) => this.compact(f))),
        bestMinViolation: this.minViolation(population),
        hvTrajectory: [],
        stop: 'generations',
        done: false,
        before
      };
      this.state.islands.push(st);
      this.boundary(`island ${index} start`);
    }

    const rng = rngRestore(st.rng);
    const seen = new Set(st.seen);
    let ranked: Ranked<Fit>[] = st.ranked.map((r) => ({
      member: this.fit('r1', r.id),
      rank: r.rank,
      crowding: r.crowding
    }));
    const islandFits = st.fitIds.map((id) => this.compact(this.fit('r1', id)));

    while (!st.done && st.generation < s.generations) {
      const generation = st.generation + 1;
      const offspring: { config: Config; genome: Genome }[] = [];
      let attempts = 0;
      let duplicates = 0;
      let newConfigs = st.newConfigs;

      while (offspring.length < s.population && newConfigs < s.newPerIsland && attempts < s.population * 50) {
        attempts++;

        const a = tournament(ranked, rng).member;
        const b = tournament(ranked, rng).member;
        const { children } = sbx(operatorSpace, a.genome, b.genome, rng, ga);

        for (const child of children) {
          if (offspring.length >= s.population || newConfigs >= s.newPerIsland) break;

          const mutated = polynomialMutation(operatorSpace, child, rng, ga).genome;
          const config = configOfGenome(mutated);
          const id = configId(config);

          if (seen.has(id)) {
            duplicates++;
            continue;
          }

          seen.add(id);
          offspring.push({ config, genome: mutated });
          newConfigs++;
        }
      }

      const fits = await this.r1(offspring, `island ${index} generation ${generation}`);

      ranked = selectSurvivors([...ranked.map((r) => r.member), ...fits], s.population);
      for (const f of fits) islandFits.push(this.compact(f));

      const hv = this.hvOf(islandFits);
      const mv = this.minViolation(islandFits);
      const improved =
        st.bestHv > 0 ? hv > st.bestHv * (1 + s.tolerance) : hv > 0 || mv < st.bestMinViolation * (1 - s.tolerance);

      st.stale = improved ? 0 : st.stale + 1;
      st.bestHv = Math.max(st.bestHv, hv);
      st.bestMinViolation = Math.min(st.bestMinViolation, mv);
      st.hvTrajectory.push(hv);
      st.generation = generation;
      st.newConfigs = newConfigs;
      st.duplicates += duplicates;
      st.rng = rngState(rng);
      st.ranked = ranked.map((r) => ({ id: r.member.id, rank: r.rank, crowding: r.crowding }));
      st.seen = [...seen];
      st.fitIds.push(...fits.map((f) => f.id));

      if (newConfigs >= s.newPerIsland) {
        st.stop = 'budget';
        st.done = true;
      } else if (st.stale >= s.patience) {
        st.stop = 'stagnation';
        st.done = true;
      } else if (generation >= s.generations) {
        st.stop = 'generations';
        st.done = true;
      } else if (offspring.length === 0) {
        st.stop = 'no new configurations';
        st.done = true;
      }

      if (st.done)
        st.after = { hv: this.hvOf([...this.archive.values()]), mv: this.minViolation([...this.archive.values()]) };
      this.boundary(`island ${index} generation ${generation}`);
    }

    if (!st.done) {
      st.done = true;
      st.after = { hv: this.hvOf([...this.archive.values()]), mv: this.minViolation([...this.archive.values()]) };
      this.boundary(`island ${index} end`);
    }

    log(
      `island ${index}: ${st.generation} generations, ${st.newConfigs} new, stop ${st.stop}, hv ${st.bestHv.toExponential(3)}, ${islandFits.filter((f) => f.violation === 0).length} feasible`
    );
  }

  // ----- rung 2 and T3 -----

  private async rung2() {
    const s = this.x.schedule;
    const ordered = rankOrder([...this.archive.values()]);
    const pick = this.greedyDistinct(ordered, s.r2Keep, s.r2Distinct);
    const fam = this.fam('r2', s.r2);
    const fits = await this.fits(
      pick.map((p) => ({ config: p.config, genome: this.fit('r1', p.id).genome })),
      [fam],
      'r2',
      'r2'
    );
    const r2 = new Map(fits.map((f) => [f.id, f]));
    // T3: fewer than 2 rung-2-feasible regions (L∞ 0.10) while rung 1 has ≥ 3 → up to 16 regional representatives
    const regions = (ids: string[], limit: number, exclude: Config[] = []) => {
      const reps: Config[] = [];
      const repIds: string[] = [];

      for (const id of ids) {
        if (reps.length >= limit) break;

        const c = this.config(id);

        if ([...reps, ...exclude].every((r) => configDistance(c, r) >= 0.1)) {
          reps.push(c);
          repIds.push(id);
        }
      }

      return repIds;
    };
    const r1Feasible = ordered.filter((f) => f.violation === 0).map((f) => f.id);
    const r2FeasibleIds = rankOrder(fits.filter((f) => f.violation === 0)).map((f) => f.id);
    const r2Regions = regions(r2FeasibleIds, 2).length;
    const r1Regions = regions(r1Feasible, 3).length;
    const fires = r2Regions < 2 && r1Regions >= 3;
    const added: string[] = [];

    if (fires) {
      const r2Feasible = r2FeasibleIds.map((id) => this.config(id));
      const reps = regions(
        r1Feasible.filter((id) => !r2.has(id)),
        16,
        r2Feasible
      );
      const extra = await this.fits(
        reps.map((id) => ({ config: this.config(id), genome: this.fit('r1', id).genome })),
        [fam],
        'r2',
        't3'
      );

      for (const f of extra) {
        r2.set(f.id, f);
        added.push(f.id);
      }
    }

    this.state.r2Ids = [...r2.keys()];
    this.state.t3 = { fired: fires, r1FeasibleRegionsAtLeast: r1Regions, r2FeasibleRegionsAtLeast: r2Regions, added };
    log(
      `rung 2: ${[...r2.values()].filter((f) => f.violation === 0).length}/${r2.size} feasible; T3 ${fires ? `fired (+${added.length})` : 'not fired'}`
    );
  }

  // ----- refinement (Study 8 §7.1 step 6) -----

  // The probe moves of a configuration: each active numeric gene by ±⌈r/2⌉ and ±r grid steps (inside the box), and
  // switching each enabled optional rule OFF (trend filter, eligibility, gate, initial stop, retention, continuation,
  // the buffer).
  moves(c: Config): Config[] {
    const out: Config[] = [];
    const s = structureOf(c);
    const add = (m: Config) => {
      try {
        out.push(effectiveOf(repair(m)));
      } catch {
        // an invalid move is not a move
      }
    };

    for (const gene of activeGenes(s)) {
      const r = radiusOf(gene);
      const steps = [...new Set([Math.max(1, Math.round(r / 2)), r])];

      for (const k of steps)
        for (const sign of [-1, 1]) {
          const v = Number(((c[gene.key] as number) + sign * k * gene.step).toFixed(6));

          if (v < gene.min - 1e-9 || v > gene.max + 1e-9) continue;
          add({ ...c, [gene.key]: v });
        }
    }

    const off: [boolean, string][] = [
      [s.trend !== 'off', 'trendFilterEnabled'],
      [s.elig !== 'off', 'eligibilityEnabled'],
      [s.gate === 'on', 'drawdownRecoveryGateEnabled'],
      [s.istop === 'on', 'initialStopEnabled'],
      [s.retain === 'on', 'retentionEnabled'],
      [s.cont !== 'off', 'continuationEnabled'],
      [s.exits === 'hold_on_buffer_on', 'intradayLossBufferEnabled']
    ];

    for (const [on, key] of off) if (on) add({ ...c, [key]: false });

    return [...new Map(out.map((m) => [configId(m), m])).values()].filter((m) => configId(m) !== configId(c));
  }

  private async refine() {
    const s = this.x.schedule;
    const r3 = this.state.r3Ids!.map((id) => this.fit('r3', id));
    const starts = this.greedyDistinct(rankOrder(r3), s.refineStarts, s.refineDistinct);
    const RF = this.fam('refine', s.refineN);
    const done = (this.state.refinements ?? []) as { start: string; endpoint: string; path: unknown[] }[];

    for (const start of starts) {
      if (done.some((d) => d.start === start.id)) continue;

      let current = (
        await this.fits(
          [{ config: start.config, genome: this.fit('r3', start.id).genome }],
          [RF],
          'refine',
          `refine ${start.id}`
        )
      )[0]!;
      const pathLog: unknown[] = [
        { pass: 0, id: current.id, robust: current.nb.robustPerYear, violation: current.violation }
      ];

      for (let pass = 1; pass <= s.refinePasses; pass++) {
        const moves = this.moves(current.config);
        const fits = await this.fits(
          moves.map((m) => ({ config: m, genome: genomeOf(m) })),
          [RF],
          'refine',
          `refine ${start.id} pass ${pass}`
        );
        let best: Fit | undefined;
        let bestGain = 0;

        for (const candidate of fits) {
          if (current.violation > 0) {
            const gain = current.violation - candidate.violation;

            if (gain >= 0.01 && (gain > bestGain || (gain === bestGain && best && candidate.id < best.id))) {
              best = candidate;
              bestGain = gain;
            }
          } else if (
            candidate.violation === 0 &&
            candidate.nb.medianNet >= current.nb.medianNet &&
            candidate.nb.p10Net >= current.nb.p10Net &&
            candidate.nb.p90Dd <= current.nb.p90Dd
          ) {
            const gain = (candidate.nb.robustPerYear - current.nb.robustPerYear) * 1;

            if (
              gain * 1 >= s.refineMinGain &&
              (gain > bestGain ||
                (gain === bestGain &&
                  best &&
                  (candidate.nb.p90Dd < best.nb.p90Dd ||
                    (candidate.nb.p90Dd === best.nb.p90Dd && candidate.id < best.id))))
            ) {
              best = candidate;
              bestGain = gain;
            }
          }
        }

        if (!best) {
          pathLog.push({ pass, moves: moves.length, accepted: null });
          break;
        }

        pathLog.push({
          pass,
          moves: moves.length,
          accepted: best.id,
          gain: bestGain,
          robust: best.nb.robustPerYear,
          violation: best.violation
        });
        current = best;
      }

      const r3Ids = this.state.r3Ids!;

      if (!r3Ids.includes(current.id)) {
        const endpoint = (
          await this.fits(
            [{ config: current.config, genome: current.genome }],
            [this.fam('r3', s.r3)],
            'r3',
            'refine endpoint'
          )
        )[0]!;

        r3Ids.push(endpoint.id);
      }

      done.push({ start: start.id, endpoint: current.id, path: pathLog });
      this.state.refinements = done;
      this.boundary(`refine ${start.id}`);
    }

    log(`refinement from ${starts.length} starts done`);
  }

  // ----- T2 (Monte Carlo uncertainty of the top two) -----

  private async t2() {
    const s = this.x.schedule;
    const r3 = this.state.r3Ids!.map((id) => this.fit('r3', id));
    const feasible = r3
      .filter((f) => f.violation === 0)
      .sort((a, b) => b.nb.robustPerYear - a.nb.robustPerYear || byIdCmp(a, b));
    let t2 = { fired: false, gap: NaN, se: NaN, rescored: [] as string[] };

    if (feasible.length >= 2) {
      const R3 = this.fam('r3', s.r3);
      const nets = async (f: Fit) =>
        (await fitsOf(this.x.lab, [{ config: f.config, genome: f.genome }], [R3], 'r3', this.x.floors))[0]!.records.map(
          (r) => r.net
        );
      const bootRng = Rng.from(...seedOf(...this.label('bootstrap')));
      const se = (values: number[]) => {
        const out: number[] = [];

        for (let b = 0; b < 2000; b++) {
          const sample = Array.from({ length: values.length }, () => values[bootRng.int(values.length)]!).sort(
            (x, z) => x - z
          );
          const q = (p: number) => {
            const pos = (sample.length - 1) * p;
            const lo = Math.floor(pos);

            return sample[lo]! + (sample[Math.ceil(pos)]! - sample[lo]!) * (pos - lo);
          };

          out.push((0.5 * q(0.5) + 0.5 * q(0.1)) / this.x.floors.y);
        }

        const mean = out.reduce((a, b) => a + b, 0) / out.length;

        return Math.sqrt(out.reduce((a, b) => a + (b - mean) ** 2, 0) / (out.length - 1));
      };
      const [a, b] = feasible as [Fit, Fit];
      const sigma = Math.max(se(await nets(a)), se(await nets(b)));
      const gap = a.nb.robustPerYear - b.nb.robustPerYear;

      t2 = { fired: gap < sigma, gap, se: sigma, rescored: [] };

      if (t2.fired) {
        const pooled = await this.fits(
          feasible.slice(0, 8).map((f) => ({ config: f.config, genome: f.genome })),
          [R3, this.fam('r3b', s.r3)],
          'r3+r3b',
          't2'
        );

        t2.rescored = pooled.map((f) => f.id);
      }
    }

    this.state.t2 = t2;
    log(`T2 ${t2.fired ? `fired (${t2.rescored.length} re-scored)` : 'not fired'}`);
  }

  // ----- the shortlist (Study 8 §7.1 step 7) -----

  private shortlist() {
    const s = this.x.schedule;
    const rescored = new Set(this.state.t2?.rescored ?? []);
    const pool0 = this.state.r3Ids!.map((id) => (rescored.has(id) ? this.fit('r3+r3b', id) : this.fit('r3', id)));
    const signatures = new Map<string, Fit>();

    for (const f of rankOrder(pool0)) if (!signatures.has(f.centre.signature)) signatures.set(f.centre.signature, f);

    const pool = [...signatures.values()];
    const F = pool.filter((f) => f.violation === 0);
    const taken: (Fit & { pick: string })[] = [];
    const takeBest = (pick: string, ordered: Fit[]) => {
      for (const f of ordered) {
        if (taken.length >= s.shortlist) return;
        if (taken.some((t) => t.id === f.id)) continue;
        if (!taken.every((t) => configDistance(t.config, f.config) >= s.distinct)) continue;

        taken.push({ ...f, pick });
        return;
      }
    };
    const tie = (a: Fit, b: Fit) => a.nb.p90Dd - b.nb.p90Dd || byIdCmp(a, b);
    const profit = [...F].sort((a, b) => b.nb.robustPerYear - a.nb.robustPerYear || tie(a, b));

    takeBest('profit', profit);

    const ref = taken[0]?.nb.medianNet ?? profit[0]?.nb.medianNet ?? 0;

    takeBest(
      'robust',
      [...F].filter((f) => f.nb.medianNet >= 0.5 * ref).sort((a, b) => b.nb.share - a.nb.share || tie(a, b))
    );
    takeBest(
      'balanced',
      [...F].sort(
        (a, b) =>
          b.nb.robustPerYear / Math.max(1, b.nb.p90Dd) - a.nb.robustPerYear / Math.max(1, a.nb.p90Dd) || tie(a, b)
      )
    );
    takeBest(
      'centre',
      [...F].sort((a, b) => b.centre.perYear - a.centre.perYear || tie(a, b))
    );

    for (const f of rankOrder(F)) {
      if (taken.length >= s.shortlist) break;
      takeBest('pareto', [f]);
    }

    for (const f of rankOrder(pool.filter((p) => p.violation > 0))) {
      if (taken.length >= s.shortlist) break;
      takeBest('infeasible-fill', [f]);
    }

    this.state.shortlist = taken;
    log(`shortlist: ${taken.map((t) => `${t.pick}:${t.id}${t.violation > 0 ? '(infeasible)' : ''}`).join(' ')}`);
  }

  // counts for the report: distinct effective configurations and ledgers per rung (from the archive)
  summary() {
    return {
      lastBoundary: this.lastBoundary,
      archive: this.archive.size,
      archiveFeasible: [...this.archive.values()].filter((f) => f.violation === 0).length
    };
  }
}

export const writeJson = (file: string, value: unknown) => {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${JSON.stringify(value, null, 1)}\n`);
};
