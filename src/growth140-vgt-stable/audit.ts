// The archive audit (PROTOCOL.md §§10–11): the completed study's development archive, read with bounded memory
// (streamed gzip JSONL shards, verified against MANIFEST.json), its exclusion funnel per entry family, the
// profit-versus-drawdown frontiers, the switch breakdowns, the rejected Rise configurations and the declared selection
// of audit candidates for re-evaluation under this study's common independent draws.
import { createReadStream } from 'node:fs';
import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline';
import zlib from 'node:zlib';
import { decode } from '../growth140-vgt-s8m/store.ts';
import {
  configOfGenome as priorConfigOfGenome,
  screenGenomes as priorScreenGenomes
} from '../growth140-vgt-s8m/space.ts';
import { priorCacheDir, priorResearchDir, rules } from './context.ts';
import { fileSha } from './integrity.ts';
import { type Config, configDistance, configId, familyOf, switchesOf } from './space.ts';

const archiveDir = path.join(priorResearchDir, 'results', 'archive');

export const verifyManifest = () => {
  const manifest = JSON.parse(fs.readFileSync(path.join(archiveDir, 'MANIFEST.json'), 'utf8'));
  const checks: { file: string; expected: string; observed: string; ok: boolean }[] = [];

  for (const [job, j] of Object.entries<any>(manifest.jobs))
    for (const [, t] of Object.entries<any>(j.tables))
      for (const s of t.shards) {
        const file = path.join(archiveDir, job, s.file);
        const observed = fileSha(file);

        checks.push({
          file: path.relative(priorResearchDir, file),
          expected: s.sha256,
          observed,
          ok: observed === s.sha256
        });
      }

  const sqlite = path.join(priorCacheDir, 'jobs', 'search', 'archive.sqlite');

  if (fs.existsSync(sqlite)) {
    const observed = fileSha(sqlite);

    checks.push({
      file: '.cache/growth140-vgt-s8m/jobs/search/archive.sqlite',
      expected: manifest.jobs.search.sqliteSha256,
      observed,
      ok: observed === manifest.jobs.search.sqliteSha256
    });
  }

  return { manifestSha256: fileSha(path.join(archiveDir, 'MANIFEST.json')), checks, passed: checks.every((c) => c.ok) };
};

export async function* streamShard<T>(job: string, table: string) {
  const rl = readline.createInterface({
    input: createReadStream(path.join(archiveDir, job, `${table}-000.jsonl.gz`)).pipe(zlib.createGunzip()),
    crlfDelay: Infinity
  });

  for await (const line of rl) if (line) yield decode<{ key: string; value: T }>(line);
}

// One old fit, reduced (bounded memory).
export interface OldFit {
  id: string;
  rung: string;
  n: number;
  config: Config;
  centre: {
    net: number;
    dd: number;
    lots: number;
    episodes: number;
    lotYears: number;
    top1Share: number;
    perCapitalYear: number;
    bestYearShare: number;
    exBestPerYear: number;
    exposure: number;
    signature: string;
    wins: number;
    losses: number;
  };
  nb: {
    n: number;
    ledgers: number;
    share: number;
    p90Dd: number;
    medianNet: number;
    p10Net: number;
    robustNet: number;
  };
  violation: number;
  parts: Record<string, number>;
}

const rungN: Record<string, number> = { r1: 16, r2: 64, refine: 64, r3: 128, 'r3+r3b': 256 };
const fidelityRank: Record<string, number> = { r1: 0, refine: 1, r2: 2, r3: 3, 'r3+r3b': 4 };

export const newFeasible = (f: Pick<OldFit, 'centre' | 'nb'>) =>
  f.centre.net > 0 && f.centre.dd <= rules.ceiling && f.nb.p90Dd <= rules.ceiling && f.nb.p10Net > rules.p10Floor;

// The completed study's reasons (its C1–C7), grouped into the brief's categories.
export const reasonGroups: Record<string, string[]> = {
  drawdown: ['C1'],
  stability: ['C2share', 'C2p90', 'C5p10'],
  activity: ['C3lots', 'C3episodes', 'C3years'],
  neighbourhoodProfit: ['C5median'],
  capitalEfficiency: ['C6'],
  concentration: ['C7lot', 'C7year', 'C7exBest']
};
const groupOrder = ['drawdown', 'stability', 'activity', 'neighbourhoodProfit', 'capitalEfficiency', 'concentration'];
export const groupsOf = (parts: Record<string, number>) =>
  groupOrder.filter((g) => reasonGroups[g]!.some((k) => (parts[k] ?? 0) > 0));

export const loadFits = async () => {
  const best = new Map<string, OldFit>(); // the highest-fidelity fit of each centre
  const r1 = new Map<string, OldFit>();
  const higher = new Map<string, OldFit>(); // `${rung}|${id}` for every rung above 1 (≈ 460 fits)
  const byRung: Record<string, string[]> = {};

  for await (const { value: f } of streamShard<any>('search', 'fits')) {
    const o: OldFit = {
      id: f.id,
      rung: f.family,
      n: rungN[f.family] ?? f.nb.n,
      config: f.config,
      centre: {
        net: f.centre.net,
        dd: f.centre.dd,
        lots: f.centre.lots,
        episodes: f.centre.episodes,
        lotYears: f.centre.lotYears,
        top1Share: f.centre.top1Share,
        perCapitalYear: f.centre.perCapitalYear,
        bestYearShare: f.centre.bestYearShare,
        exBestPerYear: f.centre.exBestPerYear,
        exposure: f.centre.exposure,
        signature: f.centre.signature,
        wins: f.centre.wins,
        losses: f.centre.losses
      },
      nb: {
        n: f.nb.n,
        ledgers: f.nb.ledgers,
        share: f.nb.share,
        p90Dd: f.nb.p90Dd,
        medianNet: f.nb.medianNet,
        p10Net: f.nb.p10Net,
        robustNet: f.nb.robustNet ?? 0.5 * f.nb.medianNet + 0.5 * f.nb.p10Net
      },
      violation: f.violation,
      parts: f.parts
    };

    (byRung[o.rung] ??= []).push(o.id);
    if (o.rung === 'r1') r1.set(o.id, o);
    else higher.set(`${o.rung}|${o.id}`, o);

    const prev = best.get(o.id);

    if (!prev || fidelityRank[o.rung]! > fidelityRank[prev.rung]!) best.set(o.id, o);
  }

  return { best, r1, higher, byRung };
};

// The old screen, regenerated with the completed study's own code and seeds (deterministic), and its records.
export const loadScreen = async () => {
  const genomes = priorScreenGenomes(16384, 'screen', 'search', 'F24');
  const ids = new Map<string, Config>();

  for (const g of genomes) {
    const c = priorConfigOfGenome(g);

    ids.set(configId(c), c);
  }

  const records = new Map<string, { net: number; dd: number; trades: number }>();
  let points = 0;

  for await (const { key, value } of streamShard<any>('search', 'points')) {
    points++;

    const id = key.split('|')[1]!;

    if (ids.has(id)) records.set(id, { net: value.net, dd: value.dd, trades: value.trades });
  }

  return { vectors: genomes.length, configs: ids, records, points };
};

export const priorCheckpoint = () => {
  const raw = fs.readFileSync(path.join(priorCacheDir, 'jobs', 'search', 'checkpoint.json'), 'utf8');

  return decode<{ body: any; bodySha256: string; sequence: number }>(raw);
};

const pareto2 = <T>(items: T[], a: (t: T) => number, b: (t: T) => number) => {
  // maximize a, minimize b
  const sorted = [...items].sort((p, q) => a(q) - a(p) || b(p) - b(q));
  const front: T[] = [];
  let bestB = Infinity;

  for (const t of sorted)
    if (b(t) < bestB) {
      front.push(t);
      bestB = b(t);
    }

  return front;
};

const cellOf = (c: Config) => {
  const s = switchesOf(c);

  return `${s.family}|hold:${s.hold}|gate:${s.gate}`;
};

export const describeFit = (f: OldFit, inR2: Set<string>, inR3: Set<string>, shortlist: Set<string>) => ({
  id: f.id,
  fidelity: `${f.rung} (${f.n} draws)`,
  switches: switchesOf(f.config),
  centreNet: f.centre.net,
  centreDd: f.centre.dd,
  trades: f.centre.lots,
  wins: f.centre.wins,
  losses: f.centre.losses,
  episodes: f.centre.episodes,
  top1Share: f.centre.top1Share,
  exposure: f.centre.exposure,
  nbN: f.nb.n,
  nbLedgers: f.nb.ledgers,
  nbMedian: f.nb.medianNet,
  nbP10: f.nb.p10Net,
  nbP90Dd: f.nb.p90Dd,
  robust: f.nb.robustNet,
  newFeasible: newFeasible(f),
  oldReasons: Object.keys(f.parts),
  oldGroups: groupsOf(f.parts),
  reachedR2: inR2.has(f.id),
  reachedR3: inR3.has(f.id),
  shortlisted: shortlist.has(f.id),
  config: f.config
});

// The whole archive-only analysis (no evaluation): returns the audit record.
export const auditArchive = async () => {
  const manifest = verifyManifest();

  if (!manifest.passed) throw new Error('the completed study’s archive does not verify against its manifest');

  const { best, r1, higher, byRung } = await loadFits();
  const screen = await loadScreen();
  const cp = priorCheckpoint();
  const st = cp.body;
  const search = JSON.parse(fs.readFileSync(path.join(priorResearchDir, 'results', 'search', 'search.json'), 'utf8'));
  const frozen = JSON.parse(fs.readFileSync(path.join(priorResearchDir, 'FROZEN_SELECTION.json'), 'utf8'));
  const inR2 = new Set<string>(st.r2Ids);
  const inR3 = new Set<string>(st.r3Ids);
  const shortlist = new Set<string>((st.shortlist ?? []).map((s: { id: string }) => s.id));
  const promoted = new Set<string>(st.screen.promoted.map((p: { id: string }) => p.id));
  const fams = ['rise', 'breakout'] as const;

  // the inventory
  const centres = new Set([...best.keys()]);
  const inventory = {
    points: screen.points,
    centres: centres.size,
    neighbourOnlyPoints: screen.points - centres.size,
    fitsByRung: Object.fromEntries(Object.entries(byRung).map(([k, v]) => [k, v.length])),
    fidelities: {
      r1: '16 draws (old instrument: grid-step radius)',
      r2: '64',
      refine: '64',
      r3: '128',
      'r3+r3b': '256 (T2 re-score)'
    },
    screenVectors: screen.vectors,
    screenDistinct: screen.configs.size,
    islandDuplicates: (st.islands as { duplicates: number }[]).reduce((a, i) => a + i.duplicates, 0),
    islands: (st.islands as any[]).map((i) => ({
      index: i.index,
      generations: i.generation,
      newConfigs: i.newConfigs,
      duplicates: i.duplicates,
      stop: i.stop
    })),
    checkpoint: { sequence: cp.sequence, bodySha256: cp.bodySha256 }
  };

  // the funnel per family
  const funnel: Record<string, unknown> = {};
  const overlap: Record<string, unknown> = {};
  const rescued: Record<string, unknown> = {};

  for (const fam of fams) {
    const sc = [...screen.configs.entries()].filter(([, c]) => familyOf(c) === fam);
    const rec = (id: string) => screen.records.get(id)!;
    const scDd = sc.filter(([id]) => rec(id).dd < rules.ceiling);
    const scNet = scDd.filter(([id]) => rec(id).net > 0);
    const scTrades = scNet.filter(([id]) => rec(id).trades >= 7);
    const r1f = [...r1.values()].filter((f) => familyOf(f.config) === fam);
    const oldOk = r1f.filter((f) => f.violation === 0);
    const newOk = r1f.filter(newFeasible);
    const r2f = [...inR2].map((id) => best.get(id)!).filter((f) => familyOf(f.config) === fam);
    const r3f = [...inR3].map((id) => best.get(id)!).filter((f) => familyOf(f.config) === fam);

    funnel[fam] = {
      sequential: [
        { step: 'screen: distinct configurations', n: sc.length },
        { step: 'screen plausibility: centre DD < $35k', n: scDd.length, excluded: sc.length - scDd.length },
        { step: '… and net > 0', n: scNet.length, excluded: scDd.length - scNet.length },
        { step: '… and trades ≥ 7 (activity)', n: scTrades.length, excluded: scNet.length - scTrades.length },
        {
          step: 'promoted to rung 1 (cap 2,560: ½ rank, ½ diversity)',
          n: sc.filter(([id]) => promoted.has(id)).length,
          excluded: scTrades.length - sc.filter(([id]) => promoted.has(id)).length
        },
        { step: 'rung-1 centres (screen + islands)', n: r1f.length },
        { step: 'rung-1 feasible under the completed study’s rules', n: oldOk.length },
        { step: 'selected for rung 2 (top 192, L∞ ≥ 0.02)', n: r2f.length },
        { step: 'rung-2 feasible (old rules)', n: r2f.filter((f) => higher.get(`r2|${f.id}`)?.violation === 0).length },
        { step: 'rung-2 feasible (new rules)', n: r2f.filter((f) => newFeasible(higher.get(`r2|${f.id}`)!)).length },
        { step: 'selected for rung 3 (top 48, L∞ ≥ 0.03)', n: r3f.length },
        { step: 'rung-3 feasible (old rules)', n: r3f.filter((f) => higher.get(`r3|${f.id}`)?.violation === 0).length },
        {
          step: 'rung-3 feasible (new rules)',
          n: r3f.filter((f) => higher.get(`r3|${f.id}`) && newFeasible(higher.get(`r3|${f.id}`)!)).length
        },
        {
          step: 'shortlist (6, L∞ ≥ 0.10, one per ledger)',
          n: [...shortlist].filter((id) => familyOf(best.get(id)!.config) === fam).length
        },
        {
          step: 'frozen (qualified)',
          n: frozen.members.filter((m: { config: Config }) => familyOf(m.config) === fam).length
        }
      ],
      newRules: { rung1Feasible: newOk.length, rung1Centres: r1f.length }
    };

    // overlapping reasons at rung 1 (each centre counted under every reason it failed), the unique blockers, and the
    // first-failure (sequential) attribution in the order drawdown → stability → activity → neighbourhood profit →
    // capital efficiency → concentration
    const any: Record<string, number> = {};
    const only: Record<string, number> = {};
    const first: Record<string, number> = {};

    for (const f of r1f) {
      const g = groupsOf(f.parts);

      for (const k of g) any[k] = (any[k] ?? 0) + 1;
      if (g.length === 1) only[g[0]!] = (only[g[0]!] ?? 0) + 1;
      if (g.length) first[g[0]!] = (first[g[0]!] ?? 0) + 1;
    }

    overlap[fam] = { centres: r1f.length, anyReason: any, onlyReason: only, firstReason: first };

    // feasible under the new rules but excluded by the old: which old reasons
    const res = newOk.filter((f) => f.violation > 0);
    const why: Record<string, number> = {};

    for (const f of res) for (const k of groupsOf(f.parts)) why[k] = (why[k] ?? 0) + 1;
    rescued[fam] = {
      newFeasibleOldInfeasible: res.length,
      byOldReason: why,
      newFeasibleNotSelectedForR2: newOk.filter((f) => !inR2.has(f.id)).length,
      newFeasibleSelectedForR2: newOk.filter((f) => inR2.has(f.id)).length
    };
  }

  // structural composition at each stage (crowding)
  const comp = (ids: Iterable<string>) => {
    const out: Record<string, number> = {};

    for (const id of ids) {
      const k = cellOf(best.get(id)!.config);

      out[k] = (out[k] ?? 0) + 1;
    }

    return out;
  };
  const crowding = {
    rung1: comp(r1.keys()),
    rung1NewFeasible: comp([...r1.values()].filter(newFeasible).map((f) => f.id)),
    rung2: comp(inR2),
    rung3: comp(inR3),
    shortlist: comp(shortlist)
  };

  // frontiers (development, the completed study's evaluations): centre net vs centre DD among rung-1 centres with
  // DD ≤ $35k; robust net vs p90 at the best fidelity among new-feasible centres
  const frontiers: Record<string, unknown> = {};

  for (const fam of fams) {
    const all = [...best.values()].filter((f) => familyOf(f.config) === fam);
    const centreFront = pareto2(
      all.filter((f) => f.centre.dd <= rules.ceiling && f.centre.net > 0),
      (f) => f.centre.net,
      (f) => f.centre.dd
    );
    const robustFront = pareto2(
      all.filter(newFeasible),
      (f) => f.nb.robustNet,
      (f) => f.nb.p90Dd
    );

    frontiers[fam] = {
      centre: centreFront.map((f) => describeFit(f, inR2, inR3, shortlist)),
      robust: robustFront.map((f) => describeFit(f, inR2, inR3, shortlist))
    };
  }

  // breakdowns: family × maximum hold × gate × continuation method
  const breakdown: Record<string, any> = {};

  for (const f of best.values()) {
    const s = switchesOf(f.config);
    const k = `${s.family}|hold:${s.hold}|gate:${s.gate}|cont:${s.cont}`;
    const e = (breakdown[k] ??= {
      centres: 0,
      oldFeasible: 0,
      newFeasible: 0,
      bestCentreNet: -Infinity,
      bestRobust: -Infinity,
      robusts: [] as number[]
    });

    e.centres++;
    if (r1.get(f.id)?.violation === 0) e.oldFeasible++;
    if (f.centre.dd <= rules.ceiling) e.bestCentreNet = Math.max(e.bestCentreNet, f.centre.net);
    if (newFeasible(f)) {
      e.newFeasible++;
      e.bestRobust = Math.max(e.bestRobust, f.nb.robustNet);
      e.robusts.push(f.nb.robustNet);
    }
  }

  for (const e of Object.values(breakdown)) {
    const v = (e.robusts as number[]).sort((p, q) => p - q);

    e.medianRobust = v.length ? v[Math.floor((v.length - 1) / 2)] : null;
    delete e.robusts;
  }

  // the promising Rise configurations the completed study rejected
  const riseAll = [...best.values()].filter((f) => familyOf(f.config) === 'rise');
  const riseRejected = {
    byRobust: riseAll
      .filter(newFeasible)
      .sort((p, q) => q.nb.robustNet - p.nb.robustNet || (p.id < q.id ? -1 : 1))
      .slice(0, 15)
      .map((f) => describeFit(f, inR2, inR3, shortlist)),
    byCentreNet: riseAll
      .filter((f) => f.centre.dd <= rules.ceiling)
      .sort((p, q) => q.centre.net - p.centre.net || (p.id < q.id ? -1 : 1))
      .slice(0, 10)
      .map((f) => describeFit(f, inR2, inR3, shortlist))
  };

  // per cell (family × hold × gate): exploration and representation
  const cells: Record<string, any> = {};

  for (const f of best.values()) {
    const k = cellOf(f.config);
    const e = (cells[k] ??= {
      rung1Centres: 0,
      newFeasible: 0,
      reachedR2: 0,
      reachedR3: 0,
      shortlisted: 0,
      screenPromoted: 0
    });

    e.rung1Centres++;
    if (newFeasible(f)) e.newFeasible++;
    if (inR2.has(f.id)) e.reachedR2++;
    if (inR3.has(f.id)) e.reachedR3++;
    if (shortlist.has(f.id)) e.shortlisted++;
    if (promoted.has(f.id)) e.screenPromoted++;
  }

  return {
    manifest,
    inventory,
    funnel,
    overlap,
    rescued,
    crowding,
    frontiers,
    breakdown,
    riseRejected,
    cells,
    best,
    search: { file: 'research/growth140-vgt-s8m/results/search/search.json', t2: search.t2 }
  };
};

// The declared audit-candidate rule (PROTOCOL.md §10.3): for each cell (family × maximum hold × gate), up to 3
// new-feasible centres at the best available fidelity in descending robust net, each at L∞ ≥ 0.10 from the cell's
// earlier picks and with a distinct ledger; a cell with no new-feasible centre contributes its top 2 by centre net
// among centres with DD ≤ $35k and net > 0 (marked "infeasible at screening").
export const auditCandidates = (best: Map<string, OldFit>) => {
  const cellsOrder = ['rise', 'breakout'].flatMap((fam) =>
    ['off', 'on'].flatMap((hold) => ['off', 'on'].map((gate) => `${fam}|hold:${hold}|gate:${gate}`))
  );
  const out: { id: string; cell: string; basis: string; config: Config; prior: ReturnType<typeof describeFit> }[] = [];
  const empty = new Set<string>();

  for (const cell of cellsOrder) {
    const inCell = [...best.values()].filter((f) => cellOf(f.config) === cell);
    const feas = inCell.filter(newFeasible).sort((p, q) => q.nb.robustNet - p.nb.robustNet || (p.id < q.id ? -1 : 1));
    const fallback = inCell
      .filter((f) => f.centre.dd <= rules.ceiling && f.centre.net > 0)
      .sort((p, q) => q.centre.net - p.centre.net || (p.id < q.id ? -1 : 1));
    const [list, keep, basis] = feas.length
      ? [feas, 3, 'new-feasible, robust net']
      : [fallback, 2, 'infeasible at screening, centre net'];
    const picks: typeof out = [];

    for (const f of list) {
      if (picks.length >= keep) break;
      if (
        picks.some(
          (p) => configDistance(p.config, f.config) < 0.1 || best.get(p.id)!.centre.signature === f.centre.signature
        )
      )
        continue;
      picks.push({ id: f.id, cell, basis, config: f.config, prior: describeFit(f, empty, empty, empty) });
    }

    out.push(...picks);
  }

  return out;
};
