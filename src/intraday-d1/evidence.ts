// Evidence for one configuration on one door (S8/evidence.ts:72-249), single book: the centre and Study 8's four
// gating stresses; the decisive joint N1 clip sets (3 × 128, pooled and per replicate); the in-box pair (Q2b/T2b);
// half and wide radius (report-only); per-period neighbourhood statistics; clipping and near-bound accounting. The
// count-matched/norm-matched/per-book variants and the funded-sequence diagnostics are pool devices and are not built.
// Then Study 8's gates: qualification Q1–Q8, E1, E2 (S8/evidence.ts:276-335; E3 is pool-only) on the development
// door, and the test gates T1–T7 (S8/test.ts:94-155) on the validation door.
import { centreView } from '../study8-expanded-regime-d1/fitness.ts';
import { quantile } from '../study8-expanded-regime-d1/stats.ts';
import { type Grid, eligibility, stresses, testGates } from './context.ts';
import { type FitWithRecords, type Floors, fitsOf, strip, symbols } from './fitness.ts';
import { type Lab, settingsWith } from './lab.ts';
import type { IntradayRecord } from './records.ts';
import { type Family, design, nearBound, uniquePoints } from './space.ts';

export const wilsonLower = (share: number, n: number, z = 1.645) => {
  if (!(n > 0)) return NaN;

  const centre = share + (z * z) / (2 * n);
  const margin = z * Math.sqrt((share * (1 - share)) / n + (z * z) / (4 * n * n));

  return (centre - margin) / (1 + (z * z) / n);
};

export const periodStats = (records: readonly IntradayRecord[], key: string | undefined) => {
  if (!key) return undefined;

  const values = records.map((r) => r.periods[key]).filter((v): v is number => typeof v === 'number');

  return values.length
    ? {
        n: values.length,
        median: quantile(values, 0.5),
        p10: quantile(values, 0.1),
        positive: values.filter((v) => v > 0).length / values.length
      }
    : undefined;
};

export interface EvidenceOptions {
  prefix: 'confirm' | 'test';
  fold: 'DEV' | 'VAL';
  floors: Floors;
  trainKey: string;
  testKey?: string;
}

const view = (fit: FitWithRecords, options: EvidenceOptions, periodKeys: readonly string[]) => ({
  family: fit.family,
  nb: fit.nb,
  wilsonLower: wilsonLower(fit.nb.share, fit.nb.n),
  train: periodStats(fit.records, options.trainKey),
  test: periodStats(fit.records, options.testKey),
  periods: Object.fromEntries(periodKeys.map((key) => [key, periodStats(fit.records, key)]).filter(([, v]) => v))
});

export const evidenceOf = async (lab: Lab, grid: Grid, options: EvidenceOptions) => {
  const { prefix, fold, floors } = options;
  const fam = (name: string, n: number, rep: number | string, extra: Partial<Family> = {}): Family => ({
    name: `${name}${rep === '' ? '' : `#${rep}`}`,
    n,
    labels: [name, 'V', fold, rep],
    ...extra
  });
  const main = [1, 2, 3].map((rep) => fam(prefix, 128, rep));
  const pooled = async (families: Family[], name: string) => (await fitsOf(lab, [grid], families, floors, name))[0]!;
  const decisive = await pooled(main, `${prefix} 1–3`);
  const perRep = [];

  for (const family of main) perRep.push(await pooled([family], family.name));

  const alternates = {
    inbox: await pooled(
      [1, 2].map((rep) => fam(`${prefix}-inbox`, 128, rep, { mode: 'inbox' })),
      'inbox'
    ),
    half: await pooled([fam(`${prefix}-half`, 128, 1, { scale: 0.5 })], 'half'),
    wide: await pooled([fam(`${prefix}-wide`, 128, 1, { scale: 1.5 })], 'wide')
  };
  const decisivePoints = uniquePoints(
    main.flatMap((family) => design(grid, family)),
    grid
  );
  const clipping: Record<string, number> = { n: decisivePoints.length, anyClipped: 0 };

  for (const point of decisivePoints) {
    if (point.clipped.length) clipping.anyClipped!++;

    for (const c of point.clipped) clipping[`${c.key}.${c.bound}`] = (clipping[`${c.key}.${c.bound}`] ?? 0) + 1;
  }

  const centre = decisive.centreRecord;
  const stress: Record<string, { net: number; dd: number; lots: number; test: number | undefined }> = {};

  for (const setting of stresses) {
    const { key, ...overrides } = setting;
    const [record] = await lab.points([{ grid, settings: settingsWith(overrides) }]);

    stress[key] = {
      net: record!.net,
      dd: record!.dd,
      lots: record!.lots,
      test: options.testKey ? record!.periods[options.testKey] : undefined
    };
  }

  const periodKeys = Object.keys(centre.periods);

  return {
    grid,
    centre: { ...centreView(centre, symbols, floors.y), record: centre },
    stress,
    decisive: view(decisive, options, periodKeys),
    perRep: perRep.map((fit) => view(fit, options, [])),
    alternates: Object.fromEntries(Object.entries(alternates).map(([k, v]) => [k, view(v, options, [])])),
    nearBound: nearBound(grid),
    clipping,
    neighbourNets: decisive.records.map((r) => r.net),
    fit: strip(decisive)
  };
};

export type Evidence = Awaited<ReturnType<typeof evidenceOf>>;

// Q1–Q8, E1, E2 (S8/evidence.ts:276-335, single book; E3 pool-only and dropped).
export const qualificationOf = (ev: Evidence, floors: Floors, trainKey: string) => {
  const { ceiling } = eligibility;
  const c = ev.centre;
  const record = c.record;
  const nb = ev.decisive.nb;
  const trainCentre = record.periods[trainKey];
  const q: Record<string, boolean> = {};

  q.Q1 = record.dd < ceiling;
  q.Q2 = nb.share >= eligibility.share && nb.p90Dd < ceiling;
  q.Q2b =
    ev.nearBound.length === 0 ||
    (ev.alternates.inbox!.nb.share >= eligibility.share && ev.alternates.inbox!.nb.p90Dd < ceiling);
  q.Q4 = record.net > 0 && c.bestYearShare <= eligibility.topYearShare && c.exBestPerYear >= eligibility.exBestPerYear;
  q.Q5 = record.lots >= floors.lots && record.episodes >= floors.episodes && record.lotYears >= floors.lotYears;
  q.Q6 = record.net > 0 && Number.isFinite(c.top1Share) && c.top1Share <= eligibility.topLotShare;
  q.Q7 = Object.values(ev.stress).every((s) => s.net > 0 && s.dd < ceiling);
  q.Q8 =
    typeof trainCentre === 'number' &&
    trainCentre > 0 &&
    (ev.decisive.train?.median ?? NaN) >= eligibility.plateau * trainCentre;
  q.E1 = nb.medianPerYear >= eligibility.medianPerYear && nb.p10Net > 0;
  q.E2 = c.perCapitalYear >= eligibility.perCapitalYear;

  const failed = Object.entries(q)
    .filter(([, v]) => !v)
    .map(([k]) => k);
  const marginal =
    q.Q2 && (nb.share <= 0.93 || ev.perRep.some((r) => !(r.nb.share >= eligibility.share && r.nb.p90Dd < ceiling)));

  return { gates: q, failed, qualified: failed.length === 0, marginal, wilsonLower: ev.decisive.wilsonLower };
};

// T1–T7 on the run to the validation end (S8/test.ts:94-155): veto only. yTest = sessions of the test window ÷ 252
// (rounded to 0.01 for T6 as in Study 8); testLots/testEpisodes are the lots/quarters entered inside the window.
export const testGatesOf = (
  ev: Evidence,
  floors: Floors,
  options: { testKey: string; yTest: number; testLots: number; testEpisodes: number }
) => {
  const { ceiling } = eligibility;
  const c = ev.centre;
  const record = c.record;
  const nb = ev.decisive.nb;
  const yTest = Math.round(options.yTest * 100) / 100;
  const testNet = record.periods[options.testKey] ?? NaN;
  const testMedian = ev.decisive.test?.median ?? NaN;
  const t: Record<string, boolean> = {};

  t.T1 = record.dd < ceiling;
  t.T2 = nb.share >= eligibility.share && nb.p90Dd < ceiling;
  t.T2b =
    ev.nearBound.length === 0 ||
    (ev.alternates.inbox!.nb.share >= eligibility.share && ev.alternates.inbox!.nb.p90Dd < ceiling);
  t.T3 =
    testNet >= testGates.centrePerTestYear * options.yTest &&
    testMedian > 0 &&
    testMedian >= testGates.medianPerTestYear * options.yTest;
  t.T4 = Object.values(ev.stress).every((s) => (s.test ?? NaN) > 0 && s.dd < ceiling);
  t.T5 =
    record.net > 0 &&
    c.bestYearShare <= eligibility.topYearShare &&
    c.exBestPerYear >= eligibility.exBestPerYear &&
    Number.isFinite(c.top1Share) &&
    c.top1Share <= eligibility.topLotShare;
  t.T6 =
    record.lots >= floors.lots &&
    record.episodes >= floors.episodes &&
    record.lotYears >= floors.lotYears &&
    options.testLots >= Math.ceil(testGates.testLotsPerYear * yTest) &&
    options.testEpisodes >= Math.ceil(testGates.testEpisodesPerYear * yTest);
  t.T7 = c.perCapitalYear >= eligibility.perCapitalYear;

  const failed = Object.entries(t)
    .filter(([, v]) => !v)
    .map(([k]) => k);
  const ambiguous =
    failed.length === 0 &&
    (nb.share <= testGates.marginalShare ||
      ev.perRep.some((r) => !(r.nb.share >= eligibility.share && r.nb.p90Dd < ceiling)) ||
      record.dd >= testGates.marginalCentreDd);

  return { gates: t, failed, status: failed.length ? 'fail' : ambiguous ? 'ambiguous' : 'pass' };
};
