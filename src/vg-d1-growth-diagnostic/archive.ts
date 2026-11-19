// The search and promotion audit (PROTOCOL.md §6): Priority 3's C24 job archives, opened read-only and bound-checked,
// with every stage of every lane traced from the sealed search record — screen (regenerated deterministically from its
// seed labels, then matched to its archived evaluations), plausibility, promotion, rung 1 (the island archive), rungs
// 2 and 3, refinement endpoints and the cell shortlist — and each centre classified by the Growth books its own
// archived pool record funded. Counts are verified against the sealed records; nothing is evaluated.
import { DatabaseSync } from 'node:sqlite';
import { configDistance } from '../growth140-vgt-stable/space.ts';
import { decode as decodeJson } from '../growth140-vgt-s8m/store.ts';
import { budgets } from '../vg-d1-growth-joint/budgets.ts';
import type { EvalOptions, Rec } from '../vg-d1-growth-joint/evaluate.ts';
import { optionsKey } from '../vg-d1-growth-joint/evaluate.ts';
import { structureOk } from '../vg-d1-growth-joint/fitness.ts';
import type { LaneResult } from '../vg-d1-growth-joint/search.ts';
import {
  type CellKey,
  type Quad,
  type Structure,
  cells,
  cellName,
  d1Placeholder,
  decode,
  gatePairs,
  normalize,
  pinCell,
  pinGates,
  quadId,
  screenGenomes,
  structureOf
} from '../vg-d1-growth-joint/space.ts';
import { archiveFile, economics, p3 } from './context.ts';

export const gpairOptions: EvalOptions = { enabled: { 'D1:GDX': false, 'D1:VGT': false } };

export class Archive {
  private readonly db: DatabaseSync;
  private readonly getPoint: ReturnType<DatabaseSync['prepare']>;
  private readonly getConfig: ReturnType<DatabaseSync['prepare']>;
  reads = 0;

  constructor(readonly job: string) {
    this.db = new DatabaseSync(archiveFile(job), { readOnly: true });

    const meta = Object.fromEntries(
      (this.db.prepare('SELECT k, v FROM meta').all() as { k: string; v: string }[]).map((r) => [r.k, r.v])
    );

    if (meta.study !== p3.study || meta.job !== job || meta.door !== 'D24' || meta.codeDigest !== p3.evaluationDigest)
      throw new Error(`${job}: archive binding ${JSON.stringify(meta)} is not Priority 3's frozen D24 binding`);
    this.getPoint = this.db.prepare('SELECT json FROM points WHERE key = ?');
    this.getConfig = this.db.prepare('SELECT json FROM configs WHERE key = ?');
  }

  point(key: string): Rec | undefined {
    const row = this.getPoint.get(key) as { json: string } | undefined;

    this.reads++;
    return row ? decodeJson<Rec>(row.json) : undefined;
  }

  config(id: string): Quad | undefined {
    const row = this.getConfig.get(id) as { json: string } | undefined;

    return row ? decodeJson<Quad>(row.json) : undefined;
  }

  *points(): Generator<{ key: string; rec: Rec }> {
    for (const row of this.db.prepare('SELECT key, json FROM points').iterate() as Iterable<{
      key: string;
      json: string;
    }>)
      yield { key: row.key, rec: decodeJson<Rec>(row.json) };
  }

  count(table: 'points' | 'configs') {
    return (this.db.prepare(`SELECT count(*) AS n FROM ${table}`).get() as { n: number }).n;
  }

  close() {
    this.db.close();
  }
}

export const keyOf = (id: string, o: EvalOptions) => `D24|${optionsKey(o)}|${id}`;

// ----- participation classes of a centre (its own archived pool record) -----

export type GClass = 'both Growth books' | 'VGT Growth only' | 'GDX Growth only' | 'no Growth';
export const gClasses: GClass[] = ['both Growth books', 'VGT Growth only', 'GDX Growth only', 'no Growth'];

export const gClassOf = (r: Rec): GClass => {
  const gdx = r.books['G:GDX'].lots > 0;
  const vgt = r.books['G:VGT'].lots > 0;

  return gdx && vgt ? 'both Growth books' : vgt ? 'VGT Growth only' : gdx ? 'GDX Growth only' : 'no Growth';
};

export const gdxTradesOf = (r: Rec) => r.virtual['G:GDX']?.trades ?? 0;
export const gdxBucket = (n: number) => (n === 0 ? '0' : n <= 4 ? '1–4' : n <= 14 ? '5–14' : '≥ 15');
export const gdxBuckets = ['0', '1–4', '5–14', '≥ 15'];

// Why Growth·GDX received nothing at this centre, from its record alone: no virtual decision at all (signals and
// filters), or decisions that were all refused (capital competition); funded otherwise.
export const gdxStageOf = (r: Rec) =>
  gdxTradesOf(r) === 0
    ? 'no Growth·GDX decision (signals/filters)'
    : r.books['G:GDX'].lots === 0
      ? 'every Growth·GDX decision refused (capital)'
      : 'Growth·GDX funded';
export const gdxStages = [
  'no Growth·GDX decision (signals/filters)',
  'every Growth·GDX decision refused (capital)',
  'Growth·GDX funded'
];

// ----- the screen, regenerated exactly as Lane.screen() did (search.ts) -----

export const screenQuads = (laneKey: string, kind: 'indep' | 'gpair', cell: CellKey) => {
  const n = budgets.study[kind].screen;
  const genomes = screenGenomes(n, 'coarse', 'screen', laneKey).map((g, i) =>
    pinGates(pinCell(g, cell), gatePairs[i % gatePairs.length]!)
  );
  const seen = new Set<string>();
  const out: Quad[] = [];
  let invalid = 0;

  for (const g of genomes) {
    let q: Quad;

    try {
      q = decode(g, 'coarse');
      if (kind === 'gpair') q = normalize({ d1: { GDX: d1Placeholder, VGT: d1Placeholder }, g: q.g, first: 'D1' });
    } catch {
      invalid++;
      continue;
    }

    const id = quadId(q);

    if (seen.has(id)) continue;
    seen.add(id);
    out.push(q);
  }

  return { quads: out, screened: genomes.length, invalid };
};

// ----- tallies -----

export interface Tally {
  n: number;
  feasible?: number;
  bestNet: number | null;
  medianNet: number | null;
  bestRobust?: number | null;
  medianP90?: number | null;
}

const median = (xs: number[]) => {
  if (!xs.length) return null;

  const s = [...xs].sort((a, b) => a - b);
  const m = s.length >> 1;

  return s.length % 2 ? s[m]! : (s[m - 1]! + s[m]!) / 2;
};

export const tallyOf = (items: { net: number; robust?: number; p90?: number; feasible?: boolean }[]): Tally => {
  const f = items.filter((x) => x.feasible !== false);

  return {
    n: items.length,
    feasible: items.filter((x) => x.feasible).length,
    bestNet: f.length ? Math.max(...f.map((x) => x.net)) : null,
    medianNet: median(f.map((x) => x.net)),
    bestRobust: f.some((x) => x.robust !== undefined) ? Math.max(...f.map((x) => x.robust ?? -Infinity)) : null,
    medianP90: median(f.filter((x) => x.p90 !== undefined).map((x) => x.p90!))
  };
};

const structKey = (s: Structure) =>
  `${s.entry}|trend ${s.trend}|elig ${s.elig}|gate ${s.gate}|${s.exits}|istop ${s.istop}|retain ${s.retain}|cont ${s.cont}`;

export interface LaneAudit {
  lane: string;
  kind: string;
  cell: string | null;
  verified: Record<string, { sealed: number; recomputed: number }>;
  stages: Record<string, Record<GClass, Tally>>;
  gdxStage: Record<string, Record<string, number>>; // stage → why Growth·GDX was unfunded (or funded) → count
  gdxTrades: Record<string, Record<string, number>>; // stage → Growth·GDX virtual trades bucket → count
  r1Infeasible: Record<GClass, Record<string, number>>; // failed criteria among infeasible rung-1 centres
  r1FeasibleRanks: Record<GClass, { bestNetRank: number | null; bestRobustRank: number | null }>;
  promotionWhy: Record<string, Record<GClass, number>>; // rung-2 pick reason × class
  shortlist: { id: string; pick: string; cls: GClass; net: number; gdxTrades: number }[];
  screenByGdxStructure: Record<
    string,
    Record<string, { n: number; zeroGdx: number; gdxFunded: number; both: number; plausible: number }>
  >;
  appA: {
    sameStructure: number;
    nearest: number | null;
    nearestId: string | null;
    bestSameStructure: { id: string; net: number; feasible: boolean; cls: GClass } | null;
  };
}

export const auditLane = (
  arc: Archive,
  lane: LaneResult,
  kind: 'indep' | 'gpair' | 'informed',
  appA: Quad['g']['GDX'],
  qualified: Set<string>
): LaneAudit => {
  const options = kind === 'gpair' ? gpairOptions : {};
  const need = kind === 'gpair' ? 'G' : 'mixed';
  const rec = (id: string) => {
    const r = arc.point(keyOf(id, options));

    if (!r) throw new Error(`${lane.key}: centre ${id} is missing from ${arc.job}`);
    return r;
  };
  const verified: LaneAudit['verified'] = {};
  const stages: LaneAudit['stages'] = {};
  const gdxStage: LaneAudit['gdxStage'] = {};
  const gdxTrades: LaneAudit['gdxTrades'] = {};
  const blank = () =>
    Object.fromEntries(
      gClasses.map((c) => [c, [] as { net: number; robust?: number; p90?: number; feasible?: boolean }[]])
    );
  const put = (stage: string, items: { r: Rec; net: number; robust?: number; p90?: number; feasible?: boolean }[]) => {
    const by = blank() as Record<GClass, { net: number; robust?: number; p90?: number; feasible?: boolean }[]>;

    gdxStage[stage] = Object.fromEntries(gdxStages.map((k) => [k, 0]));
    gdxTrades[stage] = Object.fromEntries(gdxBuckets.map((k) => [k, 0]));
    for (const x of items) {
      by[gClassOf(x.r)].push(x);
      gdxStage[stage]![gdxStageOf(x.r)]!++;
      gdxTrades[stage]![gdxBucket(gdxTradesOf(x.r))]!++;
    }
    stages[stage] = Object.fromEntries(gClasses.map((c) => [c, tallyOf(by[c])])) as Record<GClass, Tally>;
  };
  const quads = new Map<string, Quad>();
  const screenByGdxStructure: LaneAudit['screenByGdxStructure'] = {};
  const promoted = kind === 'informed' ? (lane.counts.localDesigns ?? 0) : (lane.counts.promoted ?? 0);

  // the screen (indep, gpair)
  if (kind !== 'informed') {
    const cell = cells.find((c) => cellName(c) === lane.cell)!;
    const sc = screenQuads(lane.key, kind, cell);
    const items = sc.quads.map((q) => {
      const r = rec(quadId(q));

      quads.set(r.id, q);
      return {
        r,
        q,
        net: r.net,
        plausible: !r.error && r.net > 0 && r.dd <= economics.ceiling && structureOk(r, need)
      };
    });

    verified.screened = { sealed: lane.counts.screened ?? 0, recomputed: sc.screened };
    verified.screenUnique = { sealed: lane.counts.screenUnique ?? 0, recomputed: sc.quads.length };
    verified.plausible = { sealed: lane.counts.plausible ?? 0, recomputed: items.filter((x) => x.plausible).length };
    put(
      'screen',
      items.map((x) => ({ r: x.r, net: x.net }))
    );
    put(
      'plausible',
      items.filter((x) => x.plausible).map((x) => ({ r: x.r, net: x.net }))
    );

    // what each Growth·GDX structural switch does to Growth·GDX itself (the screen is a quasi-random design)
    const feat = (q: Quad) => {
      const s = structureOf(q.g.GDX);

      return {
        entry: s.entry,
        trend: `trend ${s.trend}`,
        elig: `eligibility ${s.elig}`,
        gate: `recovery gate ${s.gate}`,
        exits: s.exits,
        istop: `initial stop ${s.istop}`,
        retain: `retention ${s.retain}`,
        cont: `continuation ${s.cont}`
      };
    };

    for (const x of items)
      for (const [f, v] of Object.entries(feat(x.q))) {
        const t = ((screenByGdxStructure[f] ??= {})[v] ??= { n: 0, zeroGdx: 0, gdxFunded: 0, both: 0, plausible: 0 });

        t.n++;
        if (gdxTradesOf(x.r) === 0) t.zeroGdx++;
        if (x.r.books['G:GDX'].lots > 0) t.gdxFunded++;
        if (gClassOf(x.r) === 'both Growth books') t.both++;
        if (x.plausible) t.plausible++;
      }
  }

  // rung 1: the lane's island archive (the first `promoted` entries are the promoted screen centres / informed designs)
  const front = lane.frontier;
  const r1 = front.map((f) => ({ f, r: rec(f.id) }));

  for (const x of r1) {
    if (!quads.has(x.f.id)) {
      const q = arc.config(x.f.id);

      if (q) quads.set(x.f.id, q);
    }
  }

  verified.r1Centres = { sealed: lane.counts.r1Centres ?? 0, recomputed: r1.length };
  verified.r1Feasible = { sealed: lane.counts.r1Feasible ?? 0, recomputed: r1.filter((x) => x.f.feasible).length };
  put(
    kind === 'informed' ? 'informed designs (rung 1)' : 'promoted (rung 1)',
    r1
      .slice(0, promoted)
      .map((x) => ({ r: x.r, net: x.f.net, robust: x.f.robust, p90: x.f.p90, feasible: x.f.feasible }))
  );
  put(
    'island proposals (rung 1)',
    r1.slice(promoted).map((x) => ({ r: x.r, net: x.f.net, robust: x.f.robust, p90: x.f.p90, feasible: x.f.feasible }))
  );
  put(
    'rung 1 (all)',
    r1.map((x) => ({ r: x.r, net: x.f.net, robust: x.f.robust, p90: x.f.p90, feasible: x.f.feasible }))
  );

  // why rung-1 centres failed, by class (the search's own criteria: net, centre DD, rung p90, structure)
  const r1Infeasible = Object.fromEntries(
    gClasses.map((c) => [c, {} as Record<string, number>])
  ) as LaneAudit['r1Infeasible'];

  for (const x of r1) {
    if (x.f.feasible) continue;

    const parts = [
      x.r.net > 0 ? null : 'centre net ≤ 0',
      x.r.dd <= economics.ceiling ? null : 'centre DD > $35,000',
      x.f.p90 <= economics.ceiling ? null : 'rung-1 p90 DD > $35,000',
      structureOk(x.r, need) ? null : need === 'G' ? 'Growth unfunded' : 'a family unfunded'
    ].filter(Boolean);
    const k = parts.join(' + ') || 'other';
    const t = r1Infeasible[gClassOf(x.r)];

    t[k] = (t[k] ?? 0) + 1;
  }

  // where each class's best feasible rung-1 centre ranks in the lane (by centre net and by robust net)
  const feas = r1.filter((x) => x.f.feasible);
  const byNet = [...feas].sort((a, b) => b.f.net - a.f.net);
  const byRobust = [...feas].sort((a, b) => b.f.robust - a.f.robust);
  const r1FeasibleRanks = Object.fromEntries(
    gClasses.map((c) => {
      const i = byNet.findIndex((x) => gClassOf(x.r) === c);
      const j = byRobust.findIndex((x) => gClassOf(x.r) === c);

      return [c, { bestNetRank: i < 0 ? null : i + 1, bestRobustRank: j < 0 ? null : j + 1 }];
    })
  ) as LaneAudit['r1FeasibleRanks'];

  // rungs 2 and 3, the shortlist and qualification
  const promotionWhy: LaneAudit['promotionWhy'] = {};

  for (const x of lane.r2) {
    const c = gClassOf(rec(x.id));

    (promotionWhy[x.why] ??= Object.fromEntries(gClasses.map((k) => [k, 0])) as Record<GClass, number>)[c]++;
  }

  put(
    'rung 2',
    lane.r2.map((x) => ({ r: rec(x.id), net: x.net, robust: x.robust, p90: x.p90, feasible: x.feasible }))
  );
  put(
    'rung 3 + refinement endpoints',
    lane.r3.map((x) => ({ r: rec(x.id), net: x.net, robust: x.robust, p90: x.p90, feasible: x.feasible }))
  );
  put(
    'shortlist',
    lane.shortlist.map((x) => ({
      r: rec(x.id),
      net: x.centre.net,
      robust: x.nb.robust,
      p90: x.nb.p90Dd,
      feasible: true
    }))
  );
  put(
    'qualified',
    lane.shortlist.filter((x) => qualified.has(x.id)).map((x) => ({ r: rec(x.id), net: x.centre.net, feasible: true }))
  );

  // Appendix A's Growth·GDX structure in this lane (screen and rung 1)
  const target = structKey(structureOf(appA));
  let same = 0;
  let nearest: number | null = null;
  let nearestId: string | null = null;
  let best: LaneAudit['appA']['bestSameStructure'] = null;
  const r1ById = new Map(r1.map((x) => [x.f.id, x]));

  for (const [id, q] of quads) {
    if (structKey(structureOf(q.g.GDX)) !== target) continue;
    same++;

    const d = configDistance(q.g.GDX, appA);

    if (nearest === null || d < nearest) {
      nearest = d;
      nearestId = id;
    }

    const x = r1ById.get(id);
    const r = x?.r ?? rec(id);
    const feasible = x ? x.f.feasible : false;

    if (!best || r.net > best.net) best = { id, net: r.net, feasible, cls: gClassOf(r) };
  }

  return {
    lane: lane.key,
    kind,
    cell: lane.cell,
    verified,
    stages,
    gdxStage,
    gdxTrades,
    r1Infeasible,
    r1FeasibleRanks,
    promotionWhy,
    shortlist: lane.shortlist.map((x) => {
      const r = rec(x.id);

      return { id: x.id, pick: x.pick, cls: gClassOf(r), net: x.centre.net, gdxTrades: gdxTradesOf(r) };
    }),
    screenByGdxStructure,
    appA: { sameStructure: same, nearest, nearestId, bestSameStructure: best }
  };
};

// Every archived evaluation of a job (centres and neighbours alike), by class: the whole explored volume.
export const volumeOf = (arc: Archive) => {
  const by: Record<string, number> = {};
  const stage: Record<string, number> = {};
  let n = 0;

  for (const { rec } of arc.points()) {
    n++;
    by[gClassOf(rec)] = (by[gClassOf(rec)] ?? 0) + 1;
    stage[gdxStageOf(rec)] = (stage[gdxStageOf(rec)] ?? 0) + 1;
  }

  return { evaluations: n, byClass: by, byGdxStage: stage };
};
