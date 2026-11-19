// The fitness (PROTOCOL.md §5): a configuration's centre record and its unique neighbours under one seed family.
// Feasibility keeps only the brief's hard rules — centre net > 0, centre maximum minute drawdown ≤ $35,000,
// neighbourhood p90 drawdown ≤ $35,000 and neighbourhood p10 net > 0 — as a normalized violation (0 iff feasible).
// Activity, concentration, annual profit and the neighbourhood median are evidence and ranking inputs, never
// automatic exclusions. Objectives (minimized): −centre net, −neighbourhood median, −p10, p90 drawdown.
import { quantile } from '../study5-gdx-b5-three-etf/grid.ts';
import { rules } from './context.ts';
import type { StableRecord } from './engine.ts';
import type { Lab } from './pool.ts';
import { type Config, type Family, type Genome, configId, neighbourhood } from './space.ts';

export interface CentreView {
  net: number;
  perYear: number;
  realized: number;
  unrealized: number;
  dd: number;
  ddDaily: number;
  trades: number;
  wins: number;
  losses: number;
  moves: number;
  winningMoves: number;
  lossSum: number;
  topMove: number;
  topMoveShare: number;
  netExTopMove: number;
  netHaircutTopMove: number;
  top1Share: number;
  exposure: number;
  bestYear: number;
  bestYearKey: string;
  signature: string;
  failed: boolean;
}

export interface NbView {
  n: number; // unique neighbours (distinct effective configurations, centre excluded)
  ledgers: number; // distinct trade ledgers among them
  failures: number; // failed evaluations (excluded from the statistics, counted here)
  share: number; // share with DD ≤ ceiling
  breaches: number; // neighbours above the ceiling
  breachMeanExcess: number; // mean $ above the ceiling among breaches (0 without)
  worstDd: number;
  p90Dd: number;
  medianDd: number;
  medianNet: number;
  p10Net: number;
  p90Net: number;
  robustNet: number; // ½ median + ½ p10
  profitable: number; // share with net > 0
  medianTrades: number;
  medianExTopMove: number; // ARITHMETIC: the neighbours' median net without their own largest winning episode
  clippedShare: number;
}

export interface Fit {
  id: string;
  family: string;
  config: Config;
  genome: Genome;
  centre: CentreView;
  nb: NbView;
  objectives: number[];
  violation: number;
  parts: Record<string, number>;
}

export const centreView = (r: StableRecord, y: number): CentreView => ({
  net: r.net,
  perYear: r.net / y,
  realized: r.realized,
  unrealized: r.unrealized,
  dd: r.dd,
  ddDaily: r.ddDaily,
  trades: r.trades,
  wins: r.wins,
  losses: r.losses,
  moves: r.moves,
  winningMoves: r.winningMoves,
  lossSum: r.lossSum,
  topMove: r.topMove,
  topMoveShare: r.topMoveShare,
  netExTopMove: r.netExTopMove,
  netHaircutTopMove: r.netHaircutTopMove,
  top1Share: r.top1Share,
  exposure: r.exposure,
  bestYear: r.bestYear,
  bestYearKey: r.bestYearKey,
  signature: r.signature,
  failed: Boolean(r.error)
});

export const nbView = (all: readonly StableRecord[], clipped = 0): NbView => {
  const records = all.filter((r) => !r.error && Number.isFinite(r.net) && Number.isFinite(r.dd));
  const nets = records.map((r) => r.net);
  const dds = records.map((r) => r.dd);
  const breaches = dds.filter((d) => d > rules.ceiling);
  const n = records.length;
  const medianNet = quantile(nets, 0.5);
  const p10Net = quantile(nets, 0.1);

  return {
    n,
    ledgers: new Set(records.map((r) => r.signature)).size,
    failures: all.length - n,
    share: n ? (n - breaches.length) / n : NaN,
    breaches: breaches.length,
    breachMeanExcess: breaches.length ? breaches.reduce((a, d) => a + d - rules.ceiling, 0) / breaches.length : 0,
    worstDd: n ? Math.max(...dds) : NaN,
    p90Dd: quantile(dds, 0.9),
    medianDd: quantile(dds, 0.5),
    medianNet,
    p10Net,
    p90Net: quantile(nets, 0.9),
    robustNet: 0.5 * medianNet + 0.5 * p10Net,
    profitable: n ? nets.filter((x) => x > 0).length / n : NaN,
    medianTrades: quantile(
      records.map((r) => r.trades),
      0.5
    ),
    medianExTopMove: quantile(
      records.map((r) => r.netExTopMove),
      0.5
    ),
    clippedShare: all.length ? clipped / all.length : NaN
  };
};

// The normalized violation (0 iff feasible) and its parts; non-finite → infeasible.
export const violationOf = (c: CentreView, nb: NbView) => {
  const { ceiling, notional } = rules;
  const parts: Record<string, number> = {
    failed: c.failed ? 1 : 0,
    net: Number.isFinite(c.net) ? (c.net > 0 ? 0 : (1 - c.net) / notional) : 1,
    dd: Number.isFinite(c.dd) ? (c.dd > ceiling ? (c.dd - ceiling) / ceiling + 1e-9 : 0) : 1,
    p90: Number.isFinite(nb.p90Dd) ? (nb.p90Dd > ceiling ? (nb.p90Dd - ceiling) / ceiling + 1e-9 : 0) : 1,
    p10: Number.isFinite(nb.p10Net) ? (nb.p10Net > rules.p10Floor ? 0 : (1 - nb.p10Net) / notional) : 1
  };
  const violation = Object.values(parts).reduce((a, b) => a + b, 0);

  return { violation: !Number.isFinite(violation) ? Infinity : violation < 1e-12 ? 0 : violation, parts };
};

export const objectivesOf = (c: CentreView, nb: NbView) =>
  [-c.net, -nb.medianNet, -nb.p10Net, nb.p90Dd].map((x) => (Number.isFinite(x) ? x : 1e12));

const round = (x: number, d = 6) => (Number.isFinite(x) ? Math.round(x * 10 ** d) / 10 ** d : x);
const roundView = <T extends object>(v: T): T =>
  Object.fromEntries(Object.entries(v).map(([k, x]) => [k, typeof x === 'number' ? round(x) : x])) as T;

// The unique configurations the families evaluate for one centre (the centre excluded).
export const familyConfigs = (centre: Config, families: readonly Family[]) => {
  const seen = new Set<string>([configId(centre)]);
  const points: { config: Config; clipped: number }[] = [];

  for (const f of families)
    for (const p of neighbourhood(centre, f)) {
      if (seen.has(p.id)) continue;
      seen.add(p.id);
      points.push({ config: p.config, clipped: p.clipped });
    }

  return points;
};

export const fitFrom = (
  centre: Config,
  genome: Genome,
  name: string,
  centreRecord: StableRecord,
  records: readonly StableRecord[],
  clipped: number,
  y: number
): Fit => {
  const c = roundView(centreView(centreRecord, y));
  const nb = roundView(nbView(records, clipped));
  const { violation, parts } = violationOf(c, nb);

  return {
    id: configId(centre),
    family: name,
    config: centre,
    genome,
    centre: c,
    nb,
    objectives: objectivesOf(c, nb),
    violation: round(violation, 9),
    parts: Object.fromEntries(
      Object.entries(parts)
        .filter(([, v]) => v > 0)
        .map(([k, v]) => [k, round(v)])
    )
  };
};

export const fitsOf = async (
  lab: Lab,
  centres: readonly { config: Config; genome: Genome }[],
  families: readonly Family[],
  name: string,
  y: number
): Promise<(Fit & { records: StableRecord[] })[]> => {
  const designs = centres.map((x) => familyConfigs(x.config, families));
  const all: Config[] = [];

  centres.forEach((x, i) => {
    all.push(x.config);
    for (const p of designs[i]!) all.push(p.config);
  });

  const records = await lab.points(all);
  let at = 0;

  return centres.map((x, i) => {
    const centreRecord = records[at++]!;
    const nb = records.slice(at, at + designs[i]!.length);

    at += designs[i]!.length;
    return {
      ...fitFrom(x.config, x.genome, name, centreRecord, nb, designs[i]!.filter((p) => p.clipped > 0).length, y),
      records: nb
    };
  });
};

export const stripRecords = <T extends { records?: unknown }>(f: T): Omit<T, 'records'> => {
  const { records, ...rest } = f;

  void records;
  return rest;
};

// The drawdown-preferring banded order (PROTOCOL.md §8.3): repeatedly take, among the remaining candidates whose robust
// net is within `band` × the best remaining robust net, the one with the lowest p90 drawdown (ties: higher robust,
// then id).
export const bandedOrder = <T extends { id: string; robust: number; p90: number }>(
  items: readonly T[],
  band = rules.band
) => {
  const rest = [...items].sort((a, b) => b.robust - a.robust || (a.id < b.id ? -1 : 1));
  const out: T[] = [];

  while (rest.length) {
    const best = rest[0]!.robust;
    const limit = best - band * Math.abs(best);
    let pick = 0;

    for (let i = 1; i < rest.length && rest[i]!.robust >= limit; i++)
      if (rest[i]!.p90 < rest[pick]!.p90 || (rest[i]!.p90 === rest[pick]!.p90 && rest[i]!.robust > rest[pick]!.robust))
        pick = i;

    out.push(rest.splice(pick, 1)[0]!);
  }

  return out;
};
