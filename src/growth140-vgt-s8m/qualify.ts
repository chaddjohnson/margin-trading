// In-sample qualification, development evidence, roles and ranking (PROTOCOL.md §8), on the development door only.
// Every shortlist member and the fixed control (#4; the engine defaults in the pilot) get the same seed families.
import { quantile } from '../study5-gdx-b5-three-etf/grid.ts';
import { spearman } from '../study8-expanded-regime-d1/stats.ts';
import { eligibility, log, stressCosts } from './context.ts';
import { type PointRecord, type TradeRow } from './engine.ts';
import { type Fit, type Floors, fitFrom, fitsOf, stripRecords } from './fitness.ts';
import type { Lab } from './pool.ts';
import {
  type Config,
  type Family,
  configDistance,
  configId,
  genomeOf,
  nearBound,
  structureOf,
  withCost
} from './space.ts';
import { ledgerJaccard, matchWinners } from './trades.ts';

export const folds = [
  { key: 'F19', trainEnd: 2019, test: [2020, 2021] },
  { key: 'F20', trainEnd: 2020, test: [2021, 2022] },
  { key: 'F21', trainEnd: 2021, test: [2022, 2023] },
  { key: 'F23', trainEnd: 2023, test: [2024, 2024] }
] as const;

const sumHalves = (r: Pick<PointRecord, 'halves'>, fromYear: number, toYear: number) =>
  Object.entries(r.halves)
    .filter(([k]) => Number(k.slice(0, 4)) >= fromYear && Number(k.slice(0, 4)) <= toYear)
    .reduce((a, [, v]) => a + v, 0);

export const yearsOf = (r: Pick<PointRecord, 'halves'>) => {
  const out: Record<string, number> = {};

  for (const [k, v] of Object.entries(r.halves))
    out[k.slice(0, 4)] = Math.round(((out[k.slice(0, 4)] ?? 0) + v) * 100) / 100;
  return out;
};

export interface Gates {
  Q1: boolean;
  Q2: boolean;
  Q2b: boolean | null;
  Q4: boolean;
  Q5: boolean;
  Q6: boolean;
  Q7: boolean;
  Q8: boolean;
  E1: boolean;
  E2: boolean;
  searchFeasible: boolean;
}

export const gatesOf = (
  centre: Fit['centre'],
  confirm: Fit['nb'],
  confirmFamilies: Fit['nb'][],
  inbox: Fit['nb'] | null,
  stress10: PointRecord,
  floors: Floors,
  searchViolation: number
) => {
  const { ceiling } = eligibility;
  const g: Gates = {
    Q1: centre.dd < ceiling,
    Q2: confirm.share >= eligibility.share && confirm.p90Dd < ceiling,
    Q2b: inbox ? inbox.share >= eligibility.share && inbox.p90Dd < ceiling : null,
    Q4:
      centre.net > 0 &&
      centre.bestYearShare <= eligibility.topYearShare &&
      centre.exBestPerYear >= eligibility.exBestPerYear,
    Q5: centre.lots >= floors.lots && centre.episodes >= floors.episodes && centre.lotYears >= floors.lotYears,
    Q6: Number.isFinite(centre.top1Share) && centre.top1Share <= eligibility.topLotShare,
    Q7: stress10.net > 0 && stress10.dd < ceiling,
    Q8: confirm.medianNet >= eligibility.confirmationOfCentre * centre.net,
    E1: confirm.medianPerYear >= eligibility.medianPerYear && confirm.p10Net > eligibility.p10Floor,
    E2: centre.perCapitalYear >= eligibility.perCapitalYear,
    searchFeasible: searchViolation === 0
  };
  const qualified = Object.values(g).every((v) => v === null || v === true);
  const marginal =
    qualified &&
    (confirm.share <= eligibility.marginalShare ||
      confirmFamilies.some((f) => !(f.share >= eligibility.share && f.p90Dd < ceiling)));

  return { gates: g, qualified, marginal };
};

export interface QualifyContext {
  lab: Lab;
  floors: Floors;
  labels: (string | number)[];
  control: Config;
  controlName: string;
  detail: (c: Config) => Promise<{ trades: TradeRow[]; [k: string]: unknown }>;
  r3Records?: (c: Config) => PointRecord[] | null; // the search's rung-3 neighbours (fold re-ranking diagnostic)
}

const family = (
  labels: (string | number)[],
  name: string,
  rep: number | string,
  n: number,
  extra: Partial<Family> = {}
): Family => ({
  name: `${name}${rep}`,
  n,
  labels: [name, rep, ...labels],
  ...extra
});

export const evidenceOf = async (
  x: QualifyContext,
  c: Config,
  searchFit: Fit | null,
  n: { select: number; selectReps: number; confirm: number; confirmReps: number }
) => {
  const genome = genomeOf(c);
  const confirmFams = Array.from({ length: n.confirmReps }, (_v, i) => family(x.labels, 'confirm', i + 1, n.confirm));
  const selectFams = Array.from({ length: n.selectReps }, (_v, i) => family(x.labels, 'select', i + 1, n.select));
  const near = nearBound(c);
  const one = async (fams: Family[], name: string) =>
    (await fitsOf(x.lab, [{ config: c, genome }], fams, name, x.floors))[0]!;
  const confirm = await one(confirmFams, 'confirm');
  const perFamily: Fit[] = [];

  for (const f of confirmFams) perFamily.push(stripRecords(await one([f], f.name)) as Fit);

  const select = stripRecords(await one(selectFams, 'select'));
  const inbox = near
    ? stripRecords(
        await one(
          [1, 2].map((r) => family(x.labels, 'confirm-inbox', r, n.confirm, { mode: 'inbox' })),
          'confirm-inbox'
        )
      )
    : null;
  const half = stripRecords(
    await one([family(x.labels, 'confirm-half', 1, n.confirm, { scale: 0.5 })], 'confirm-half')
  );
  const wide = stripRecords(
    await one([family(x.labels, 'confirm-wide', 1, n.confirm, { scale: 1.5 })], 'confirm-wide')
  );
  const stress: Record<string, { centre: PointRecord; confirm1: Fit }> = {};

  for (const bps of stressCosts) {
    const sc = withCost(c, bps);
    const f = stripRecords(
      (await fitsOf(x.lab, [{ config: sc, genome }], [confirmFams[0]!], `confirm1@${bps}bps`, x.floors))[0]!
    ) as Fit;

    stress[`${bps}bps`] = { centre: await x.lab.point(sc), confirm1: f };
  }
  const centre = await x.lab.point(c);
  // ablations: each enabled optional rule OFF (report-only)
  const s = structureOf(c);
  const offs: [boolean, string, string][] = [
    [s.trend !== 'off', 'trendFilterEnabled', 'entry trend filter'],
    [s.elig !== 'off', 'eligibilityEnabled', 'persistent eligibility'],
    [s.gate === 'on', 'drawdownRecoveryGateEnabled', 'Drawdown Recovery Gate'],
    [s.istop === 'on', 'initialStopEnabled', 'initial risk stop'],
    [s.retain === 'on', 'retentionEnabled', 'trend retention'],
    [s.cont !== 'off', 'continuationEnabled', 'continuation entries'],
    [s.exits === 'hold_on_buffer_on', 'intradayLossBufferEnabled', 'buffered intraday-loss exit']
  ];
  const ablations = [];

  for (const [on, key, label] of offs) {
    if (!on) continue;

    const off = { ...c, [key]: false };
    const r = await x.lab.point(off);

    ablations.push({ rule: label, id: configId(off), net: r.net, dd: r.dd, trades: r.trades, wins: r.wins });
  }

  const centreFit = fitFrom(c, genome, 'centre', centre, confirm.records, 0, x.floors);
  const g = gatesOf(
    centreFit.centre,
    confirm.nb,
    perFamily.map((f) => f.nb),
    inbox?.nb ?? null,
    stress['10bps']!.centre,
    x.floors,
    searchFit ? searchFit.violation : 0
  );
  // expanding folds (development slices of the one continuous run; the neighbourhood = the pooled confirmation set)
  const foldRows = folds.map((f) => {
    const testNets = confirm.records.map((r) => sumHalves(r, f.test[0], f.test[1]));

    return {
      fold: f.key,
      train: `2016–${f.trainEnd}`,
      test: f.test[0] === f.test[1] ? `${f.test[0]}` : `${f.test[0]}–${f.test[1]}`,
      centreTrainNet: Math.round(sumHalves(centre, 2016, f.trainEnd) * 100) / 100,
      centreTestNet: Math.round(sumHalves(centre, f.test[0], f.test[1]) * 100) / 100,
      neighbourhoodTestMedian: quantile(testNets, 0.5),
      neighbourhoodTestP10: quantile(testNets, 0.1),
      neighbourhoodTestPositiveShare: testNets.filter((v) => v > 0).length / testNets.length
    };
  });
  const detail = await x.detail(c);
  const trades = detail.trades;
  const closed = trades.filter((t) => t.status === 'closed');
  const largest = Math.max(0, ...closed.map((t) => t.net));

  return {
    id: configId(c),
    config: c,
    structure: s,
    nearBound: near,
    centre: centreFit.centre,
    record: centre,
    confirm: stripRecords(confirm),
    confirmFamilies: perFamily,
    select,
    inbox,
    reportOnly: { half: half.nb, wide: wide.nb },
    stress,
    ablations,
    folds: foldRows,
    years: yearsOf(centre),
    concentration: {
      largestWin: largest,
      netExLargestWin: Math.round((centre.net - largest) * 100) / 100,
      largestWinShare: centre.net > 0 ? largest / centre.net : NaN,
      profitableEpisodes: centre.profitableEpisodes,
      episodes: centre.episodes
    },
    detail,
    ...g
  };
};

export type Evidence = Awaited<ReturnType<typeof evidenceOf>>;

// Roles (PROTOCOL.md §8.4): each role to the first QUALIFIED candidate in its order at L∞ ≥ distinct from the holders.
export const assignRoles = (members: (Evidence & { pick: string; order: number })[], distinct: number) => {
  const q = members.filter((m) => m.qualified);
  const holders: { role: string; id: string }[] = [];
  const far = (m: Evidence) =>
    holders.every((h) => configDistance(members.find((x) => x.id === h.id)!.config, m.config) >= distinct);
  const tie = (a: Evidence, b: Evidence) => a.select.nb.p90Dd - b.select.nb.p90Dd || (a.id < b.id ? -1 : 1);
  const take = (role: string, ordered: Evidence[], extra?: (m: Evidence) => boolean) => {
    const m = ordered.find((x) => !holders.some((h) => h.id === x.id) && far(x) && (!extra || extra(x)));

    if (m) holders.push({ role, id: m.id });
    return m ?? null;
  };
  const profitOrder = [...q].sort((a, b) => b.select.nb.robustPerYear - a.select.nb.robustPerYear || tie(a, b));
  const profit = take('profit', profitOrder);
  const reference = (profit ?? profitOrder[0])?.select.nb.medianNet ?? 0;

  take(
    'robust',
    [...q]
      .filter((m) => m.select.nb.medianNet >= 0.5 * reference)
      .sort((a, b) => b.select.nb.share - a.select.nb.share || tie(a, b))
  );
  take(
    'balanced',
    [...q].sort(
      (a, b) =>
        b.select.nb.robustPerYear / Math.max(1, b.select.nb.p90Dd) -
          a.select.nb.robustPerYear / Math.max(1, a.select.nb.p90Dd) || tie(a, b)
    )
  );

  for (let k = 0; k < 2; k++)
    take(
      `extra${k + 1}`,
      [...q].sort((a, b) => (a as { order: number } & Evidence).order - (b as { order: number } & Evidence).order),
      (m) =>
        holders.every((h) => ledgerJaccard(members.find((x) => x.id === h.id)!.detail.trades, m.detail.trades) < 0.5)
    );

  return holders;
};

// The ranking (PROTOCOL.md §8.5): tier strong iff confirmation robust/yr ≥ the control's AND confirmation p90 DD ≤ the
// control's; within a tier by confirmation robust/yr, ties lower p90, then id. The primary candidate is rank 1.
export const rankHolders = (holders: { role: string; id: string }[], members: Evidence[], control: Evidence) =>
  holders
    .map((h) => {
      const m = members.find((x) => x.id === h.id)!;
      const strong =
        m.confirm.nb.robustPerYear >= control.confirm.nb.robustPerYear &&
        m.confirm.nb.p90Dd <= control.confirm.nb.p90Dd;

      return {
        ...h,
        tier: strong ? 'strong' : 'modest',
        robustPerYear: m.confirm.nb.robustPerYear,
        p90Dd: m.confirm.nb.p90Dd
      };
    })
    .sort(
      (a, b) =>
        (a.tier === b.tier ? 0 : a.tier === 'strong' ? -1 : 1) ||
        b.robustPerYear - a.robustPerYear ||
        a.p90Dd - b.p90Dd ||
        (a.id < b.id ? -1 : 1)
    )
    .map((h, i) => ({ rank: i + 1, ...h }));

// Procedural fold diagnostic (report-only): rank the search's rung-3 configurations by their 2016–trainEnd robust
// profit (½ median + ½ p10 of the rung-3 neighbours' slice), and correlate with the test-slice neighbourhood median.
export const foldRanking = (items: { id: string; records: PointRecord[] }[]) =>
  folds.map((f) => {
    const train = items.map((i) => {
      const v = i.records.map((r) => sumHalves(r, 2016, f.trainEnd));

      return 0.5 * quantile(v, 0.5) + 0.5 * quantile(v, 0.1);
    });
    const test = items.map((i) =>
      quantile(
        i.records.map((r) => sumHalves(r, f.test[0], f.test[1])),
        0.5
      )
    );

    return {
      fold: f.key,
      n: items.length,
      spearmanTrainRobustVsTestMedian: items.length >= 3 ? spearman(train, test) : NaN
    };
  });

export const matchAgainstControl = (candidate: TradeRow[], control: TradeRow[]) => matchWinners(candidate, control);

export const logEvidence = (e: Evidence) =>
  log(`evidence ${e.id}: confirmation n ${e.confirm.nb.n} (${e.confirm.nb.ledgers} ledgers), qualified ${e.qualified}`);
