// The search (PROTOCOL.md §6). One job searches one cutoff's training door; it holds four cells, run in order:
// global/rise, global/breakout, informed/rise, informed/breakout. A cell is one proposal source × one entry family.
//
// - global: Latin-supercube Sobol screen of the family (coarse grid) → promotion (½ constrained rank, ½ max-min
//   diversity) → rung 1 (16 draws) → NSGA-II islands with the saturation extension → rung 2 (64) → rung 3 (128) →
//   fine refinement (schema steps) → the cell shortlist (structural slots).
// - informed: seeds (#4 and the audit's configurations, PROTOCOL.md §6.4) → fine local designs around each seed →
//   rung 1 → one NSGA-II island on the fine grid → rung 2 → rung 3 → refinement → shortlist.
//
// Resumable exactly: the state is plain data, checkpointed atomically at every stage boundary and island generation
// (and at least once a minute inside long batches); every evaluation lives in the job's archive, so a resumed run
// regenerates the interrupted batch from the saved RNG state and finds the finished part on disk.
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
import { type GlobalBudget, type InformedBudget, ga, log, rules, seedOf } from './context.ts';
import { type Fit, bandedOrder, fitsOf, stripRecords } from './fitness.ts';
import type { Lab } from './pool.ts';
import {
  type Config,
  type EntryFamily,
  type Family,
  type Genome,
  configDistance,
  configId,
  configOfFine,
  configOfGenome,
  fineGenomeOf,
  fineLevels,
  genomeOf,
  levelCounts,
  movesOf,
  neighbourhood,
  screenGenomes,
  switchesOf
} from './space.ts';
import type { Store } from '../growth140-vgt-s8m/store.ts';

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

const coarseSpace = spaceOf(levelCounts, 'coarse');
const fineSpace = spaceOf(fineLevels, 'fine');

export type Source = 'global' | 'informed';

export interface CellSpec {
  key: string; // e.g. C19/global/rise
  cutoff: string;
  source: Source;
  family: EntryFamily;
  seeds?: { id: string; label: string; config: Config }[];
}

interface IslandState {
  index: number;
  generation: number;
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
  bestRobustTrajectory: number[];
  stop: string;
  done: boolean;
  before?: { hv: number; robust: number };
  after?: { hv: number; robust: number };
}

export interface CellState {
  stage: 'start' | 'r1' | 'islands' | 'r2' | 'r3' | 'refine' | 'shortlist' | 'done';
  screen?: {
    n: number;
    unique: number;
    plausible: number;
    promoted: { id: string; genome: Genome }[];
    ledgers: number;
    byClass: Record<string, { screened: number; plausible: number; promoted: number }>;
  };
  local?: { seeds: string[]; designs: number; unique: number };
  r1StartIds?: string[];
  islands: IslandState[];
  saturation: { islands: number; saturated: boolean; before: unknown; after: unknown }[];
  archiveIds: string[];
  r2Ids?: string[];
  r3Ids?: string[];
  refinements?: { start: string; endpoint: string; path: unknown[] }[];
  shortlist?: (Fit & { pick: string })[];
  visibleInfeasible?: {
    id: string;
    centreNet: number;
    centreDd: number;
    p90: number;
    p10: number;
    parts: Record<string, number>;
  }[];
  progress?: { batch: string; done: number; total: number };
}

export interface JobState {
  v: 1;
  cells: Record<string, CellState>;
}

export interface SearchContext {
  lab: Lab;
  store: Store;
  y: number; // training years (sessions ÷ 252)
  labels: (string | number)[]; // the cutoff's seed-family suffix, e.g. ['C19'] (or ['pilot', ...])
  checkpoint: Checkpointer<JobState>;
  state: JobState;
}

const byIdCmp = (a: { id: string }, b: { id: string }) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
const robustOf = (f: Fit) => f.nb.robustNet;

export class Cell {
  private archive = new Map<
    string,
    { id: string; objectives: number[]; violation: number; genome: number[]; robust: number; p90: number }
  >();
  readonly st: CellState;
  private readonly b: GlobalBudget | InformedBudget;
  private readonly fine: boolean;

  constructor(
    private readonly x: SearchContext,
    readonly spec: CellSpec,
    budget: GlobalBudget | InformedBudget
  ) {
    this.b = budget;
    this.fine = spec.source === 'informed';
    this.st = x.state.cells[spec.key] ??= { stage: 'start', islands: [], saturation: [], archiveIds: [] };
    for (const id of this.st.archiveIds) this.archive.set(id, this.compact(this.fit('r1', id)));
  }

  // ----- labels, families, fits -----

  private label = (...parts: (string | number)[]) => [...parts, this.spec.source, this.spec.family, ...this.x.labels];
  private fam = (name: string, n: number): Family => ({ name, n, labels: this.label(name) });
  private decode = (g: Genome) => (this.fine ? configOfFine(g) : configOfGenome(g));
  private encodeGenome = (c: Config) => (this.fine ? fineGenomeOf(c) : genomeOf(c));
  private get space() {
    return this.fine ? fineSpace : coarseSpace;
  }

  private fitKey = (rung: string, id: string) => `${this.spec.key}|${rung}|${id}`;

  fit(rung: string, id: string): Fit {
    const f = this.x.store.read<Fit>('fits', this.fitKey(rung, id));

    if (!f) throw new Error(`fit ${this.fitKey(rung, id)} is not in the archive`);
    return f;
  }

  private compact(f: Fit) {
    return {
      id: f.id,
      objectives: f.objectives,
      violation: f.violation,
      genome: [] as number[],
      robust: robustOf(f),
      p90: f.nb.p90Dd
    };
  }

  private addArchive(f: Fit) {
    if (this.archive.has(f.id)) return;
    this.archive.set(f.id, this.compact(f));
    this.st.archiveIds.push(f.id);
  }

  private config(id: string) {
    const c = this.x.store.read<Config>('configs', id);

    if (!c) throw new Error(`configuration ${id} is not in the archive`);
    return c;
  }

  private async fits(centres: { config: Config; genome: Genome }[], families: Family[], rung: string, batch: string) {
    const out: Fit[] = [];
    const chunk = 256;

    for (let i = 0; i < centres.length; i += chunk) {
      this.st.progress = { batch, done: i, total: centres.length };
      this.maybeProgress();

      for (const f of await fitsOf(this.x.lab, centres.slice(i, i + chunk), families, rung, this.x.y)) {
        const fit = stripRecords(f) as Fit;

        this.x.store.write('fits', this.fitKey(rung, fit.id), fit);
        out.push(fit);
      }
    }

    this.st.progress = undefined;
    return out;
  }

  private async r1(items: { config: Config; genome: Genome }[], batch: string) {
    const todo = items.filter((x) => !this.archive.has(configId(x.config)));
    const unique = [...new Map(todo.map((x) => [configId(x.config), x])).values()];

    for (const f of await this.fits(unique, [this.fam('r1', this.b.r1)], 'r1', batch)) this.addArchive(f);
    return items.map((x) => this.fit('r1', configId(x.config)));
  }

  private hvOf(fits: readonly { violation: number; robust: number; p90: number; id: string }[]) {
    return hypervolume2d(
      fits.map((f) => ({ id: f.id, genome: [], objectives: [-f.robust, f.p90], violation: f.violation })),
      [0, rules.ceiling + 0.01]
    );
  }

  private bestRobust(fits: readonly { violation: number; robust: number }[]) {
    return fits.reduce((m, f) => (f.violation === 0 ? Math.max(m, f.robust) : m), -Infinity);
  }

  private minViolation(fits: readonly { violation: number }[]) {
    return fits.reduce((m, f) => Math.min(m, f.violation), Infinity);
  }

  private boundary() {
    this.x.store.commit();
    this.st.progress = undefined;
    this.x.checkpoint.write(this.x.state);
  }

  private maybeProgress() {
    if (Date.now() - this.x.checkpoint.lastWrite >= 60000) {
      this.x.store.commit();
      this.x.checkpoint.write(this.x.state);
    }
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
    const b = this.b;

    if (this.st.stage === 'start') {
      if (this.spec.source === 'global') await this.screen();
      else await this.local();
    }

    if (this.st.stage === 'r1') {
      const starts =
        this.spec.source === 'global'
          ? this.st.screen!.promoted.map((p) => ({ config: this.decode(p.genome), genome: p.genome }))
          : this.localDesigns();
      const fits = await this.r1(starts, 'r1-starts');

      this.st.r1StartIds = [...new Set(fits.map((f) => f.id))];
      this.st.stage = 'islands';
      log(
        `${this.spec.key}: rung 1 on the starts: ${fits.filter((f) => f.violation === 0).length}/${fits.length} feasible`
      );
      this.boundary();
    }

    if (this.st.stage === 'islands') {
      await this.islands();
      this.st.stage = 'r2';
      this.boundary();
    }

    if (this.st.stage === 'r2') {
      const pick = this.greedyDistinct(rankOrder([...this.archive.values()]), b.r2Keep, b.r2Distinct);
      const fits = await this.fits(
        pick.map((p) => ({ config: p.config, genome: this.fit('r1', p.id).genome })),
        [this.fam('r2', b.r2)],
        'r2',
        'r2'
      );

      this.st.r2Ids = fits.map((f) => f.id);
      this.st.stage = 'r3';
      log(`${this.spec.key}: rung 2 ${fits.filter((f) => f.violation === 0).length}/${fits.length} feasible`);
      this.boundary();
    }

    if (this.st.stage === 'r3') {
      const r2 = this.st.r2Ids!.map((id) => this.fit('r2', id));
      const pick = this.greedyDistinct(rankOrder(r2), b.r3Keep, b.r3Distinct);
      const fits = await this.fits(
        pick.map((p) => ({ config: p.config, genome: this.fit('r2', p.id).genome })),
        [this.fam('r3', b.r3)],
        'r3',
        'r3'
      );

      this.st.r3Ids = fits.map((f) => f.id);
      this.st.stage = 'refine';
      log(`${this.spec.key}: rung 3 ${fits.filter((f) => f.violation === 0).length}/${fits.length} feasible`);
      this.boundary();
    }

    if (this.st.stage === 'refine') {
      await this.refine();
      this.st.stage = 'shortlist';
      this.boundary();
    }

    if (this.st.stage === 'shortlist') {
      this.shortlist();
      this.st.stage = 'done';
      this.boundary();
    }

    return this.st;
  }

  // global: the family's screen and the promotion
  private async screen() {
    const b = this.b as GlobalBudget;
    const byId = new Map<string, { config: Config; genome: Genome }>();

    for (const genome of screenGenomes(b.screen, this.spec.family, ...this.label('screen'))) {
      const config = configOfGenome(genome);
      const id = configId(config);

      if (!byId.has(id)) byId.set(id, { config, genome });
    }

    const items = [...byId.entries()];
    const records: import('./engine.ts').StableRecord[] = [];

    for (let i = 0; i < items.length; i += 2048) {
      this.st.progress = { batch: 'screen', done: i, total: items.length };
      this.maybeProgress();
      records.push(...(await this.x.lab.points(items.slice(i, i + 2048).map(([, v]) => v.config))));
    }

    const all = items.map(([id, v], i) => ({ id, ...v, r: records[i]! }));
    const plausible = all.filter(({ r }) => Number.isFinite(r.net) && r.dd <= rules.ceiling && r.net > 0);
    let promoted: typeof plausible;

    if (plausible.length <= b.promote) promoted = plausible;
    else {
      const ranked = rankOrder(
        plausible.map((p) => ({ id: p.id, genome: [], objectives: [-p.r.net, p.r.dd], violation: 0 }))
      );
      const half = Math.floor(b.promote / 2);
      const index = new Map(plausible.map((p) => [p.id, p]));
      const chosen = ranked.slice(0, half).map((x) => index.get(x.id)!);
      const taken = new Set(chosen.map((c) => c.id));
      const rest = plausible.filter((p) => !taken.has(p.id)).sort(byIdCmp);
      const minDist = rest.map((p) => Math.min(...chosen.map((c) => configDistance(p.config, c.config))));

      while (chosen.length < b.promote && rest.length) {
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

    const classOf = (c: Config) => {
      const s = switchesOf(c);

      return `hold:${s.hold}|gate:${s.gate}|istop:${s.istop}|retain:${s.retain}`;
    };
    const byClass: Record<string, { screened: number; plausible: number; promoted: number }> = {};
    const bump = (c: Config, k: 'screened' | 'plausible' | 'promoted') => {
      const e = (byClass[classOf(c)] ??= { screened: 0, plausible: 0, promoted: 0 });

      e[k]++;
    };

    for (const a of all) bump(a.config, 'screened');
    for (const a of plausible) bump(a.config, 'plausible');
    for (const a of promoted) bump(a.config, 'promoted');

    this.st.screen = {
      n: b.screen,
      unique: items.length,
      plausible: plausible.length,
      promoted: promoted.map((p) => ({ id: p.id, genome: p.genome })),
      ledgers: new Set(records.map((r) => r.signature)).size,
      byClass
    };
    this.st.stage = 'r1';
    log(
      `${this.spec.key}: screen ${b.screen} → ${items.length} distinct, ${plausible.length} plausible, ${promoted.length} promoted`
    );
    this.boundary();
  }

  // informed: the seeds' fine local designs (joint perturbations within localScale × R, the OAT moves and the OFF
  // switches); recorded, then fitted at rung 1
  private localDesigns() {
    const b = this.b as InformedBudget;
    const out: { config: Config; genome: Genome }[] = [];

    for (const [i, s] of (this.spec.seeds ?? []).slice(0, b.seeds).entries()) {
      out.push({ config: s.config, genome: fineGenomeOf(s.config) });
      for (const p of neighbourhood(s.config, {
        name: 'local',
        n: b.local,
        labels: this.label('local', i),
        scale: b.localScale
      }))
        out.push({ config: p.config, genome: fineGenomeOf(p.config) });
      for (const m of movesOf(s.config)) out.push({ config: m, genome: fineGenomeOf(m) });
    }

    return out;
  }

  private async local() {
    const designs = this.localDesigns();

    this.st.local = {
      seeds: (this.spec.seeds ?? []).slice(0, (this.b as InformedBudget).seeds).map((s) => s.id),
      designs: designs.length,
      unique: new Set(designs.map((d) => configId(d.config))).size
    };
    this.st.stage = 'r1';
    log(`${this.spec.key}: ${this.st.local.seeds.length} seeds, ${this.st.local.unique} distinct local designs`);
    this.boundary();
  }

  // ----- islands and the saturation extension -----

  private async islands() {
    const b = this.b;
    const starts = this.st.r1StartIds!.map((id) => this.fit('r1', id));
    const order = rankOrder(starts.map((f) => ({ ...f })));
    const runAll = async (count: number) => {
      while (this.st.islands.filter((i) => i.done).length < count) {
        const index = this.st.islands.filter((i) => i.done).length;

        await this.island(index, Math.max(1, b.islands), order);
      }
    };

    await runAll(b.islands);

    // Saturation (PROTOCOL.md §6.3): after each island beyond the first, saturated iff the island moved neither the
    // union's best feasible rung-1 robust net nor its hypervolume by more than `saturation` (relative). Otherwise one
    // more island, up to islandsMax.
    for (;;) {
      const done = this.st.islands.filter((i) => i.done);

      if (done.length < 2 || this.st.saturation.some((s) => s.islands === done.length)) {
        const last = this.st.saturation.find((s) => s.islands === done.length);

        if (!last || last.saturated || done.length >= b.islandsMax) break;
        await runAll(done.length + 1);
        continue;
      }

      const before = done.at(-1)!.before!;
      const after = done.at(-1)!.after!;
      const rel = (a: number, z: number) =>
        Number.isFinite(z) && z > 0 ? (a - z) / z : Number.isFinite(a) && a > 0 ? Infinity : 0;
      const saturated = rel(after.robust, before.robust) <= b.saturation && rel(after.hv, before.hv) <= b.saturation;

      this.st.saturation.push({ islands: done.length, saturated, before, after });
      this.boundary();
      if (saturated || done.length >= b.islandsMax) break;
      await runAll(done.length + 1);
    }

    log(
      `${this.spec.key}: ${this.st.islands.length} island(s); ${this.archive.size} rung-1 centres, ${[...this.archive.values()].filter((f) => f.violation === 0).length} feasible`
    );
  }

  private async island(index: number, islandCount: number, order: Fit[]) {
    const b = this.b;
    let st = this.st.islands.find((i) => i.index === index);
    const union = () => [...this.archive.values()];

    if (!st) {
      const before = { hv: this.hvOf(union()), robust: this.bestRobust(union()) };
      const members = order.filter((_f, i) => i % islandCount === index % islandCount);
      const population: Fit[] = members.slice(0, b.population);
      const seen = new Set(population.map((f) => f.id));

      if (population.length < b.population) {
        const fillers: { config: Config; genome: Genome }[] = [];

        for (const genome of screenGenomes(b.population * 4, this.spec.family, ...this.label('fill', index))) {
          const config = this.fine ? configOfFine(this.toFine(genome)) : configOfGenome(genome);
          const id = configId(config);

          if (seen.has(id) || fillers.some((f) => configId(f.config) === id)) continue;
          fillers.push({ config, genome: this.encodeGenome(config) });
          if (population.length + fillers.length >= b.population) break;
        }

        for (const f of await this.r1(fillers, `island ${index} fill`)) {
          seen.add(f.id);
          population.push(f);
        }
      }

      const ranked = selectSurvivors(population, b.population);

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
        bestRobustTrajectory: [],
        stop: 'generations',
        done: false,
        before
      };
      this.st.islands.push(st);
      this.boundary();
    }

    const rng = rngRestore(st.rng);
    const seen = new Set(st.seen);
    let ranked: Ranked<Fit>[] = st.ranked.map((r) => ({
      member: this.fit('r1', r.id),
      rank: r.rank,
      crowding: r.crowding
    }));
    const islandFits = st.fitIds.map((id) => this.compact(this.fit('r1', id)));

    while (!st.done && st.generation < b.generations) {
      const generation = st.generation + 1;
      const offspring: { config: Config; genome: Genome }[] = [];
      let attempts = 0;
      let duplicates = 0;
      let newConfigs = st.newConfigs;

      while (offspring.length < b.population && newConfigs < b.newPerIsland && attempts < b.population * 50) {
        attempts++;

        const p = tournament(ranked, rng).member;
        const q = tournament(ranked, rng).member;
        const { children } = sbx(this.space, p.genome, q.genome, rng, ga);

        for (const child of children) {
          if (offspring.length >= b.population || newConfigs >= b.newPerIsland) break;

          const mutated = polynomialMutation(this.space, child, rng, ga).genome;

          mutated[0] = this.spec.family === 'rise' ? 0 : 1; // the cell's entry family is fixed

          const config = this.decode(mutated);
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

      ranked = selectSurvivors([...ranked.map((r) => r.member), ...fits], b.population);
      for (const f of fits) islandFits.push(this.compact(f));

      const hv = this.hvOf(islandFits);
      const mv = this.minViolation(islandFits);
      const improved =
        st.bestHv > 0 ? hv > st.bestHv * (1 + b.tolerance) : hv > 0 || mv < st.bestMinViolation * (1 - b.tolerance);

      st.stale = improved ? 0 : st.stale + 1;
      st.bestHv = Math.max(st.bestHv, hv);
      st.bestMinViolation = Math.min(st.bestMinViolation, mv);
      st.hvTrajectory.push(hv);
      st.bestRobustTrajectory.push(this.bestRobust(islandFits));
      st.generation = generation;
      st.newConfigs = newConfigs;
      st.duplicates += duplicates;
      st.rng = rngState(rng);
      st.ranked = ranked.map((r) => ({ id: r.member.id, rank: r.rank, crowding: r.crowding }));
      st.seen = [...seen];
      st.fitIds.push(...fits.map((f) => f.id));

      if (newConfigs >= b.newPerIsland) [st.stop, st.done] = ['budget', true];
      else if (st.stale >= b.patience) [st.stop, st.done] = ['stagnation', true];
      else if (generation >= b.generations) [st.stop, st.done] = ['generations', true];
      else if (offspring.length === 0) [st.stop, st.done] = ['no new configurations', true];

      if (st.done) st.after = { hv: this.hvOf(union()), robust: this.bestRobust(union()) };
      this.boundary();
    }

    if (!st.done) {
      st.done = true;
      st.after = { hv: this.hvOf(union()), robust: this.bestRobust(union()) };
      this.boundary();
    }

    log(`${this.spec.key}: island ${index}: ${st.generation} generations, ${st.newConfigs} new, stop ${st.stop}`);
  }

  // a coarse screen genome mapped onto the fine grid (the informed island's fillers)
  private toFine(coarse: Genome) {
    return fineGenomeOf(configOfGenome(coarse));
  }

  // ----- refinement: fine moves on 32-draw neighbourhoods; endpoints re-fitted at rung 3 -----

  private async refine() {
    const b = this.b;
    const r3 = this.st.r3Ids!.map((id) => this.fit('r3', id));
    const feasible = bandedOrder(
      r3.filter((f) => f.violation === 0).map((f) => ({ id: f.id, robust: robustOf(f), p90: f.nb.p90Dd }))
    );
    const infeasible = [...r3.filter((f) => f.violation > 0)].sort(
      (p, q) => p.violation - q.violation || byIdCmp(p, q)
    );
    const starts = this.greedyDistinct([...feasible, ...infeasible], b.refineStarts, b.refineDistinct);
    const RF = this.fam('refine', b.refineN);
    const done = (this.st.refinements ??= []);
    const minGain = 2000;

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
      const pathLog: unknown[] = [{ pass: 0, id: current.id, robust: robustOf(current), violation: current.violation }];

      for (let pass = 1; pass <= b.refinePasses; pass++) {
        const moves = movesOf(current.config);
        const fits = await this.fits(
          moves.map((m) => ({ config: m, genome: this.encodeGenome(m) })),
          [RF],
          'refine',
          `refine ${start.id} pass ${pass}`
        );
        let best: Fit | undefined;

        if (current.violation > 0) {
          for (const f of fits)
            if (
              current.violation - f.violation >= 0.01 &&
              (!best || f.violation < best.violation || (f.violation === best.violation && f.id < best.id))
            )
              best = f;
        } else {
          const improving = fits.filter((f) => f.violation === 0 && robustOf(f) >= robustOf(current) + minGain);
          const pick = bandedOrder(improving.map((f) => ({ id: f.id, robust: robustOf(f), p90: f.nb.p90Dd })))[0];

          best = pick ? improving.find((f) => f.id === pick.id) : undefined;
        }

        pathLog.push({
          pass,
          moves: moves.length,
          accepted: best?.id ?? null,
          robust: best ? robustOf(best) : null,
          violation: best?.violation ?? null
        });
        if (!best) break;
        current = best;
      }

      if (!this.st.r3Ids!.includes(current.id)) {
        const e = (
          await this.fits(
            [{ config: current.config, genome: current.genome }],
            [this.fam('r3', b.r3)],
            'r3',
            'refine endpoint'
          )
        )[0]!;

        this.st.r3Ids!.push(e.id);
      }

      done.push({ start: start.id, endpoint: current.id, path: pathLog });
      this.boundary();
    }

    log(
      `${this.spec.key}: refinement from ${starts.length} starts; ${done.filter((d) => d.start !== d.endpoint).length} moved`
    );
  }

  // ----- the cell shortlist (PROTOCOL.md §6.5): structural slots, distinct ledgers, L∞ ≥ distinct -----

  private shortlist() {
    const b = this.b;
    const signatures = new Map<string, Fit>();
    const pool0 = this.st.r3Ids!.map((id) => this.fit('r3', id));

    for (const f of [...pool0].sort((p, q) => robustOf(q) - robustOf(p) || byIdCmp(p, q)))
      if (!signatures.has(f.centre.signature)) signatures.set(f.centre.signature, f);

    const pool = [...signatures.values()];
    const F = pool.filter((f) => f.violation === 0);
    const banded = bandedOrder(F.map((f) => ({ id: f.id, robust: robustOf(f), p90: f.nb.p90Dd }))).map((o) =>
      F.find((f) => f.id === o.id)!
    );
    const taken: (Fit & { pick: string })[] = [];
    const take = (pick: string, ordered: Fit[]) => {
      for (const f of ordered) {
        if (taken.length >= b.shortlist) return;
        if (taken.some((t) => t.id === f.id)) continue;
        if (!taken.every((t) => configDistance(t.config, f.config) >= b.distinct)) continue;
        taken.push({ ...f, pick });
        return;
      }
    };

    take('top', banded);

    const top = taken[0];

    if (top) {
      const s = switchesOf(top.config);

      take(
        'hold-alternative',
        banded.filter((f) => switchesOf(f.config).hold !== s.hold)
      );
      take(
        'gate-alternative',
        banded.filter((f) => switchesOf(f.config).gate !== s.gate)
      );
      take(
        'profit',
        [...F].sort((p, q) => q.centre.net - p.centre.net || byIdCmp(p, q))
      );
      take(
        'low-drawdown',
        [...F]
          .filter((f) => robustOf(f) >= 0.5 * robustOf(top))
          .sort((p, q) => p.nb.p90Dd - q.nb.p90Dd || byIdCmp(p, q))
      );
      for (const f of banded) take('banded', [f]);
    }

    this.st.shortlist = taken;
    this.st.visibleInfeasible = pool
      .filter((f) => f.violation > 0 && f.centre.net > 0)
      .sort((p, q) => q.centre.net - p.centre.net || byIdCmp(p, q))
      .slice(0, 5)
      .map((f) => ({
        id: f.id,
        centreNet: f.centre.net,
        centreDd: f.centre.dd,
        p90: f.nb.p90Dd,
        p10: f.nb.p10Net,
        parts: f.parts
      }));
    log(
      `${this.spec.key}: shortlist ${taken.map((t) => `${t.pick}:${t.id}`).join(' ') || '(empty: no feasible rung-3 centre)'}`
    );
  }

  summary() {
    return {
      rung1Centres: this.archive.size,
      rung1Feasible: [...this.archive.values()].filter((f) => f.violation === 0).length,
      bestRung1Robust: this.bestRobust([...this.archive.values()])
    };
  }
}
