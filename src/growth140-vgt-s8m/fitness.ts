// The stability-first fitness (PROTOCOL.md §5; Study 8 §6 for one book): a configuration's centre record and its unique
// neighbours under one seed family, the constraints C1–C3 and C5–C7 as a normalized violation, and the four
// constrained-Pareto objectives (minimized internally: −centre net/yr, −neighbourhood median/yr, −p10/yr, p90 DD).
import { quantile } from '../study5-gdx-b5-three-etf/grid.ts';
import { eligibility } from './context.ts';
import type { PointRecord } from './engine.ts';
import type { Lab } from './pool.ts';
import { type Config, type Family, type Genome, configId, neighbourhood } from './space.ts';

export interface Floors {
  y: number;
  lots: number;
  episodes: number;
  lotYears: number;
}

export const floorsOf = (sessions: number, firstYear: number, lastYear: number): Floors => {
  const y = sessions / 252;

  return {
    y,
    lots: Math.ceil(eligibility.lotsPerYear * y),
    episodes: Math.ceil(eligibility.episodesPerYear * y),
    lotYears: Math.min(eligibility.minLotYears, lastYear - firstYear)
  };
};

export interface CentreView {
  net: number;
  perYear: number;
  realized: number;
  unrealized: number;
  dd: number;
  ddDaily: number;
  lots: number;
  wins: number;
  losses: number;
  breakeven: number;
  episodes: number;
  profitableEpisodes: number;
  lotYears: number;
  heldDays: number;
  perCapitalYear: number;
  top1Share: number;
  bestYear: number;
  bestYearKey: string;
  bestYearShare: number;
  exBestPerYear: number;
  exposure: number;
  signature: string;
}

export interface NbView {
  n: number; // unique neighbours (distinct effective configurations, centre excluded)
  ledgers: number; // distinct trade ledgers among them
  share: number; // neighbours with DD < ceiling
  wilsonLow: number; // one-sided 95% Wilson lower bound of the share
  breaches: number;
  p90Dd: number;
  medianDd: number;
  worstDd: number;
  medianNet: number;
  p10Net: number;
  p90Net: number;
  medianPerYear: number;
  p10PerYear: number;
  robustPerYear: number;
  robustNet: number;
  profitable: number; // share with net > 0
  medianLots: number;
  medianWins: number;
  clippedShare: number; // share of neighbours with a clipped coordinate
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

export const centreView = (r: PointRecord, y: number): CentreView => {
  const bestYearShare = r.net > 0 ? r.bestYear / r.net : NaN;

  return {
    net: r.net,
    perYear: r.net / y,
    realized: r.realized,
    unrealized: r.unrealized,
    dd: r.dd,
    ddDaily: r.ddDaily,
    lots: r.trades,
    wins: r.wins,
    losses: r.losses,
    breakeven: r.breakeven,
    episodes: r.episodes,
    profitableEpisodes: r.profitableEpisodes,
    lotYears: r.lotYears,
    heldDays: r.heldDays,
    perCapitalYear: r.perCapitalYear,
    top1Share: r.top1Share,
    bestYear: r.bestYear,
    bestYearKey: r.bestYearKey,
    bestYearShare,
    exBestPerYear: (r.net - r.bestYear) / Math.max(1, y - 1),
    exposure: r.exposure,
    signature: r.signature
  };
};

const wilsonLower = (k: number, n: number, z = 1.6448536269514722) => {
  if (n === 0) return NaN;

  const p = k / n;
  const d = 1 + (z * z) / n;

  return (p + (z * z) / (2 * n) - z * Math.sqrt((p * (1 - p)) / n + (z * z) / (4 * n * n))) / d;
};

export const nbView = (records: readonly PointRecord[], y: number, clipped = 0): NbView => {
  const nets = records.map((r) => r.net);
  const dds = records.map((r) => r.dd);
  const ok = records.filter((r) => r.dd < eligibility.ceiling).length;
  const medianNet = quantile(nets, 0.5);
  const p10Net = quantile(nets, 0.1);
  const n = records.length;

  return {
    n,
    ledgers: new Set(records.map((r) => r.signature)).size,
    share: n ? ok / n : NaN,
    wilsonLow: wilsonLower(ok, n),
    breaches: n - ok,
    p90Dd: quantile(dds, 0.9),
    medianDd: quantile(dds, 0.5),
    worstDd: n ? Math.max(...dds) : NaN,
    medianNet,
    p10Net,
    p90Net: quantile(nets, 0.9),
    medianPerYear: medianNet / y,
    p10PerYear: p10Net / y,
    robustPerYear: (0.5 * medianNet + 0.5 * p10Net) / y,
    robustNet: 0.5 * medianNet + 0.5 * p10Net,
    profitable: n ? records.filter((r) => r.net > 0).length / n : NaN,
    medianLots: quantile(
      records.map((r) => r.trades),
      0.5
    ),
    medianWins: quantile(
      records.map((r) => r.wins),
      0.5
    ),
    clippedShare: n ? clipped / n : NaN
  };
};

const short = (value: number, floor: number) => (floor > 0 ? Math.max(0, floor - value) / floor : 0);

// The normalized violation (0 iff feasible) and its parts; a non-finite violation is infeasible.
export const violationOf = (c: CentreView, nb: NbView, floors: Floors) => {
  const { ceiling } = eligibility;
  const parts: Record<string, number> = {
    C1: c.dd >= ceiling ? (c.dd - ceiling) / ceiling + 1e-9 : 0,
    C2share: Number.isFinite(nb.share) ? Math.max(0, eligibility.share - nb.share) / eligibility.share : 1,
    C2p90: nb.p90Dd >= ceiling ? (nb.p90Dd - ceiling) / ceiling + 1e-9 : Number.isFinite(nb.p90Dd) ? 0 : 1,
    C3lots: short(c.lots, floors.lots),
    C3episodes: short(c.episodes, floors.episodes),
    C3years: short(c.lotYears, floors.lotYears),
    C5median: Math.max(0, eligibility.medianPerYear - nb.medianPerYear) / eligibility.medianPerYear,
    C5p10: nb.p10Net > eligibility.p10Floor ? 0 : (Math.max(0, -nb.p10Net) + 1) / (10000 * floors.y),
    C6: Math.max(0, eligibility.perCapitalYear - c.perCapitalYear) / eligibility.perCapitalYear,
    C7lot:
      c.net > 0 && Number.isFinite(c.top1Share)
        ? Math.max(0, c.top1Share - eligibility.topLotShare) / eligibility.topLotShare
        : 1,
    C7year:
      c.net > 0 && Number.isFinite(c.bestYearShare)
        ? Math.max(0, c.bestYearShare - eligibility.topYearShare) / eligibility.topYearShare
        : 1,
    C7exBest: Math.max(0, eligibility.exBestPerYear - c.exBestPerYear) / eligibility.exBestPerYear
  };
  const violation = Object.values(parts).reduce((a, b) => a + b, 0);

  return { violation: !Number.isFinite(violation) ? Infinity : violation < 1e-12 ? 0 : violation, parts };
};

export const objectivesOf = (c: CentreView, nb: NbView) => [-c.perYear, -nb.medianPerYear, -nb.p10PerYear, nb.p90Dd];

const round = (x: number, d = 6) => (Number.isFinite(x) ? Math.round(x * 10 ** d) / 10 ** d : x);
const roundView = <T extends object>(v: T): T =>
  Object.fromEntries(Object.entries(v).map(([k, x]) => [k, typeof x === 'number' ? round(x) : x])) as T;

// The configurations a family evaluates for one centre (the centre first).
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
  centreRecord: PointRecord,
  records: readonly PointRecord[],
  clipped: number,
  floors: Floors
): Fit => {
  const c = roundView(centreView(centreRecord, floors.y));
  const nb = roundView(nbView(records, floors.y, clipped));
  const { violation, parts } = violationOf(c, nb, floors);

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

// Many centres under the same families, evaluated as one batch (centres and all their neighbours).
export const fitsOf = async (
  lab: Lab,
  centres: readonly { config: Config; genome: Genome }[],
  families: readonly Family[],
  name: string,
  floors: Floors
): Promise<(Fit & { records: PointRecord[] })[]> => {
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

    const clipped = designs[i]!.filter((p) => p.clipped > 0).length;

    return { ...fitFrom(x.config, x.genome, name, centreRecord, nb, clipped, floors), records: nb };
  });
};

export const stripRecords = <T extends { records?: unknown }>(f: T): Omit<T, 'records'> => {
  const { records, ...rest } = f;

  void records;
  return rest;
};
