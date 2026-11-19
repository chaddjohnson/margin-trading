// Qualification, evidence and ranking at one cutoff (PROTOCOL.md §8), on that cutoff's training door only. Every
// shortlist member and every fixed control gets the same seed families (common random numbers): selection 2 × 128
// (ranking), confirmation 3 × 128 (the stability gates), small (0.5 R) and broad (1.5 R) families (report-only), the
// centre at 10 and 20 bps, the ablations and the ledger detail.
import { quantile } from '../study5-gdx-b5-three-etf/grid.ts';
import { rules, stressCosts } from './context.ts';
import type { StableRecord } from './engine.ts';
import { type Fit, type NbView, bandedOrder, fitFrom, fitsOf, stripRecords } from './fitness.ts';
import type { Lab } from './pool.ts';
import {
  type Config,
  type Family,
  configId,
  effectiveOf,
  familyOf,
  fineGenomeOf,
  structureOf,
  switchesOf,
  withCost
} from './space.ts';

export const familySet = (
  labels: (string | number)[],
  name: string,
  reps: number,
  n: number,
  extra: Partial<Family> = {}
): Family[] =>
  Array.from({ length: reps }, (_v, i) => ({ name: `${name}${i + 1}`, n, labels: [name, i + 1, ...labels], ...extra }));

export interface Gates {
  G1: boolean; // centre net > 0
  G2: boolean; // centre maximum minute drawdown ≤ $35,000
  G3: boolean; // confirmation p90 drawdown ≤ $35,000
  G4: boolean; // confirmation p10 net > 0
  G5: boolean; // at 10 bps per side: centre net > 0 and drawdown ≤ $35,000
}

export const gatesOf = (centre: StableRecord, confirm: NbView, stress10: StableRecord) => {
  const g: Gates = {
    G1: centre.net > 0,
    G2: centre.dd <= rules.ceiling,
    G3: confirm.p90Dd <= rules.ceiling,
    G4: confirm.p10Net > rules.p10Floor,
    G5: stress10.net > 0 && stress10.dd <= rules.ceiling
  };
  const failed = Object.entries(g)
    .filter(([, v]) => !v)
    .map(([k]) => k);

  return { gates: g, failed, qualified: failed.length === 0 };
};

const sumYears = (r: Pick<StableRecord, 'halves'>, from: number, to = 9999) =>
  Object.entries(r.halves)
    .filter(([k]) => Number(k.slice(0, 4)) >= from && Number(k.slice(0, 4)) <= to)
    .reduce((a, [, v]) => a + v, 0);

export const yearsOf = (r: Pick<StableRecord, 'halves'>) => {
  const out: Record<string, number> = {};

  for (const [k, v] of Object.entries(r.halves))
    out[k.slice(0, 4)] = Math.round(((out[k.slice(0, 4)] ?? 0) + v) * 100) / 100;
  return out;
};

export interface QualifyContext {
  lab: Lab;
  y: number;
  labels: (string | number)[]; // e.g. ['C19']
}

export const evidenceOf = async (x: QualifyContext, c: Config, meta: Record<string, unknown> = {}) => {
  const genome = fineGenomeOf(c);
  const one = async (fams: Family[], name: string) =>
    (await fitsOf(x.lab, [{ config: c, genome }], fams, name, x.y))[0]!;
  const selectFams = familySet(x.labels, 'select', rules.selectReps, rules.selectN);
  const confirmFams = familySet(x.labels, 'confirm', rules.confirmReps, rules.confirmN);
  const select = stripRecords(await one(selectFams, 'select')) as Fit;
  const confirmFull = await one(confirmFams, 'confirm');
  const confirm = stripRecords(confirmFull) as Fit;
  const perFamily: NbView[] = [];

  for (const f of confirmFams) perFamily.push((stripRecords(await one([f], f.name)) as Fit).nb);

  const small = (
    stripRecords(await one(familySet(x.labels, 'small', 1, rules.confirmN, { scale: 0.5 }), 'small')) as Fit
  ).nb;
  const broad = (
    stripRecords(await one(familySet(x.labels, 'broad', 1, rules.confirmN, { scale: 1.5 }), 'broad')) as Fit
  ).nb;
  const centre = await x.lab.point(c);
  const stress: Record<string, StableRecord> = {};

  for (const bps of stressCosts) stress[`${bps}bps`] = await x.lab.point(withCost(c, bps));

  const s = structureOf(c);
  const offs: [boolean, string, string][] = [
    [s.trend !== 'off', 'trendFilterEnabled', 'entry trend filter'],
    [s.elig !== 'off', 'eligibilityEnabled', 'persistent eligibility'],
    [s.gate === 'on', 'drawdownRecoveryGateEnabled', 'Drawdown Recovery Gate'],
    [s.exits !== 'hold_off', 'maximumHoldEnabled', 'maximum losing hold'],
    [s.exits === 'hold_on_buffer_on', 'intradayLossBufferEnabled', 'buffered intraday-loss exit'],
    [s.istop === 'on', 'initialStopEnabled', 'initial risk stop'],
    [s.retain === 'on', 'retentionEnabled', 'trend retention'],
    [s.cont !== 'off', 'continuationEnabled', 'continuation entries']
  ];
  const ablations = [];

  for (const [on, key, label] of offs) {
    if (!on) continue;

    const off = effectiveOf({ ...c, [key]: false });
    const r = await x.lab.point(off);

    ablations.push({
      rule: label,
      id: configId(off),
      net: r.net,
      dd: r.dd,
      trades: r.trades,
      wins: r.wins,
      losses: r.losses
    });
  }

  const centreFit = fitFrom(c, genome, 'centre', centre, confirmFull.records, 0, x.y);
  const g = gatesOf(centre, confirm.nb, stress['10bps']!);
  const detail = await x.lab.detail(c);

  return {
    id: configId(c),
    config: c,
    family: familyOf(c),
    switches: switchesOf(c),
    ...meta,
    centre: centreFit.centre,
    record: centre,
    select: select.nb,
    confirm: confirm.nb,
    confirmFamilies: perFamily,
    small,
    broad,
    stress: Object.fromEntries(Object.entries(stress).map(([k, r]) => [k, { net: r.net, dd: r.dd }])),
    ablations,
    years: yearsOf(centre),
    breaches: {
      share: 1 - confirm.nb.share,
      count: confirm.nb.breaches,
      meanExcess: confirm.nb.breachMeanExcess,
      worstDd: confirm.nb.worstDd
    },
    trades: detail.trades,
    episodes: detail.episodes,
    ...g
  };
};

export type Evidence = Awaited<ReturnType<typeof evidenceOf>>;

export const robustOfEvidence = (e: Pick<Evidence, 'select'>) => e.select.robustNet;

// The ranking of qualified members: the drawdown-preferring banded order on the SELECTION families (robust net,
// p90 drawdown); confirmation decides qualification only.
export const rankQualified = (members: readonly Evidence[]) =>
  bandedOrder(
    members.filter((m) => m.qualified).map((m) => ({ id: m.id, robust: m.select.robustNet, p90: m.select.p90Dd }))
  ).map((o, i) => ({ rank: i + 1, id: o.id, robust: o.robust, p90: o.p90 }));

// The policies whose primary is named at every cutoff (PROTOCOL.md §8.4).
export const policies = [
  'global',
  'global-rise',
  'global-breakout',
  'informed',
  'informed-rise',
  'informed-breakout',
  'all'
] as const;
export type Policy = (typeof policies)[number];

export const primariesOf = (members: readonly (Evidence & { source: string })[]) => {
  const ranked = rankQualified(members);
  const pick = (ok: (m: Evidence & { source: string }) => boolean) =>
    ranked.find((r) => ok(members.find((m) => m.id === r.id)!))?.id ?? null;

  return {
    ranking: ranked,
    primaries: {
      global: pick((m) => m.source === 'global'),
      'global-rise': pick((m) => m.source === 'global' && m.family === 'rise'),
      'global-breakout': pick((m) => m.source === 'global' && m.family === 'breakout'),
      informed: pick((m) => m.source === 'informed'),
      'informed-rise': pick((m) => m.source === 'informed' && m.family === 'rise'),
      'informed-breakout': pick((m) => m.source === 'informed' && m.family === 'breakout'),
      all: pick((m) => m.source === 'global' || m.source === 'informed')
    } as Record<Policy, string | null>
  };
};

export const sliceNetOf = (r: Pick<StableRecord, 'halves'>, fromYear: number, toYear = 9999) =>
  sumYears(r, fromYear, toYear);
export const q = quantile;
