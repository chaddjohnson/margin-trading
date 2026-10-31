// Evidence for one configuration on one door (PROTOCOL.md §10.2, §11): the centre and stresses; the decisive joint N1
// clip sets (pooled, unique); the alternates (in-box, 0.5r, 1.5r, count-matched k = 8, norm-matched, per-book);
// train/test attribution of the centre and every neighbour; the funded-sequence diagnostics on the first set
// (kept lots, ledger Jaccard, displaced/added lots, the own-P&L versus funding interaction, March 2020 and 2022–2023);
// and the gate quantities. Families are named by the caller (`confirm` on test doors, `final` on the final door).
import { eligibility, radius, stresses } from './context.ts';
import { atBound, familyDesign, specOf, uniquePoints } from './designs.ts';
import { type Books, type Lab, type PointRecord, baseSettings, booksKey, orderedOf, settingsWith } from './evaluate.ts';
import { type FamilySpec, type Fit, type Floors, centreView, nbView, pooledFamiliesFit, stripRecords } from './fitness.ts';
import { configId } from './space.ts';
import { median, quantile, summarize } from './stats.ts';
import { d1Keys } from './space.ts';

export interface EvidenceOptions {
  prefix: string; // 'confirm' | 'final'
  track: string;
  fold: string;
  floors: Floors;
  trainKey?: string; // period key of the training window (Q8)
  testKey?: string; // period key of the test window (Q3/F3)
  sequence?: boolean;
}

// Wilson score lower bound (one-sided 95%).
export const wilsonLower = (share: number, n: number, z = 1.645) => {
  if (!(n > 0)) return NaN;

  const centre = share + (z * z) / (2 * n);
  const margin = z * Math.sqrt((share * (1 - share)) / n + (z * z) / (4 * n * n));

  return (centre - margin) / (1 + (z * z) / n);
};

const periodStats = (records: readonly PointRecord[], key: string | undefined) => {
  if (!key) return undefined;

  const values = records.map((r) => r.periods[key]).filter((v): v is number => typeof v === 'number');

  return values.length ? { n: values.length, median: quantile(values, 0.5), p10: quantile(values, 0.1), positive: values.filter((v) => v > 0).length / values.length } : undefined;
};

export const nearBound = (books: Books) =>
  orderedOf(Object.keys(books)).flatMap((symbol) =>
    d1Keys
      .filter((key) => {
        const spec = specOf(key);
        const value = books[symbol]![key];

        return value - spec.min < radius[key] || spec.max - value < radius[key];
      })
      .map((key) => `${symbol}.${key}`)
  );

const lotKey = (lot: { symbol: string; entryTime: number; exitTime: number }) => `${lot.symbol}|${lot.entryTime}|${lot.exitTime}`;

export const evidenceOf = (lab: Lab, books: Books, options: EvidenceOptions) => {
  const symbols = orderedOf(Object.keys(books));
  const { prefix, track, fold, floors } = options;
  const d = symbols.length * 8;
  const fam = (name: string, n: number, rep: number | string, extra: Partial<FamilySpec> = {}): FamilySpec => ({
    name: `${name}${rep === '' ? '' : `#${rep}`}`,
    n,
    labels: [name, track, fold, rep],
    ...extra
  });
  const main = [1, 2, 3].map((rep) => fam(prefix, 128, rep));
  const pooledOf = (families: FamilySpec[], name: string) => pooledFamiliesFit(lab, books, symbols, families, floors, name);
  const decisive = pooledOf(main, `${prefix} 1–3`);
  const perRep = main.map((family) => pooledOf([family], family.name));
  const alternates: Record<string, Fit & { records: PointRecord[] }> = {
    inbox: pooledOf([1, 2].map((rep) => fam(`${prefix}-inbox`, 128, rep, { mode: 'inbox' })), 'inbox'),
    half: pooledOf([fam(`${prefix}-half`, 128, 1, { scale: 0.5 })], 'half'),
    wide: pooledOf([fam(`${prefix}-wide`, 128, 1, { scale: 1.5 })], 'wide')
  };

  if (symbols.length > 1) {
    alternates.d8 = pooledOf([1, 2].map((rep) => fam(`${prefix}-d8`, 128, rep, { matchCount: 8 })), 'd8');
    alternates.norm = pooledOf([fam(`${prefix}-norm`, 128, 1, { scale: Math.sqrt(8 / d) })], 'norm');
  } else {
    // the one-book k = 8 design is its full joint design; same labels as a pool's d8 (comparable for E3)
    alternates.d8 = pooledOf([1, 2].map((rep) => fam(`${prefix}-d8`, 128, rep, { matchCount: 8 })), 'd8');
  }

  const perBook: Record<string, ReturnType<typeof stripRecords>> = {};

  if (symbols.length > 1) {
    for (const symbol of symbols) {
      const points = uniquePoints(familyDesign(books, [symbol], { n: 64, labels: [`${prefix}-book`, track, fold, symbol] }), books);
      const records = points.map((point) => lab.point(point.books));
      const nb = nbView(summarize(records), floors.y);

      perBook[symbol] = { nb, train: periodStats(records, options.trainKey), test: periodStats(records, options.testKey) } as never;
    }
  }

  const centre = lab.point(books);
  const stress = Object.fromEntries(
    stresses.map((setting) => {
      const { key, ...overrides } = setting;
      const record = lab.point(books, settingsWith(overrides));

      return [key, { net: record.net, dd: record.dd, lots: record.lots }];
    })
  );

  // funded-sequence diagnostics on the first decisive set
  let sequence: Record<string, unknown> | undefined;

  if (options.sequence !== false) {
    const ev = lab.ev;
    const centreLots = ev.replay(books).lots;
    const centreKeys = new Set(centreLots.map(lotKey));
    const standaloneCentre = Object.fromEntries(symbols.map((s) => [s, lab.point({ [s]: books[s]! }).net]));
    const points = uniquePoints(familyDesign(books, symbols, main[0]!), books);
    const dates = lab.door.dates;
    const inWindow = (index: number, start: string, end: string) => (dates[index] ?? '') >= start && (dates[index] ?? '') <= end;
    const rows = points.map((point) => {
      const lots = ev.replay(point.books).lots;
      const keys = new Set(lots.map(lotKey));
      const kept = [...centreKeys].filter((k) => keys.has(k)).length;
      const record = lab.point(point.books);
      const standaloneDelta = symbols.reduce((total, s) => total + (lab.point({ [s]: point.books[s]! }).net - standaloneCentre[s]!), 0);
      const windowStats = (start: string, end: string) => {
        const mine = lots.filter((l) => inWindow(l.entryIndex, start, end));

        return { lots: mine.length, kept: mine.filter((l) => centreKeys.has(lotKey(l))).length, net: mine.reduce((a, l) => a + l.net, 0) };
      };

      return {
        net: record.net,
        dd: record.dd,
        kept,
        keptShare: centreKeys.size ? kept / centreKeys.size : NaN,
        jaccard: kept / Math.max(1, centreKeys.size + keys.size - kept),
        displaced: centreKeys.size - kept,
        added: keys.size - kept,
        deltaPool: record.net - centre.net,
        interaction: record.net - centre.net - standaloneDelta,
        m2020: windowStats('2020-02-15', '2020-04-30'),
        r2223: windowStats('2022-01-01', '2023-12-31')
      };
    });
    const low = rows.filter((r) => r.jaccard < 0.5);
    const absMedian = (values: number[]) => median(values.map(Math.abs));
    const lowMedianNet = low.length ? median(low.map((r) => r.net)) : NaN;

    sequence = {
      n: rows.length,
      centreLots: centreKeys.size,
      medianKeptShare: median(rows.map((r) => r.keptShare)),
      medianJaccard: median(rows.map((r) => r.jaccard)),
      medianDisplaced: median(rows.map((r) => r.displaced)),
      medianAdded: median(rows.map((r) => r.added)),
      lowJaccardShare: low.length / Math.max(1, rows.length),
      lowJaccardMedianNet: lowMedianNet,
      medianAbsDeltaPool: absMedian(rows.map((r) => r.deltaPool)),
      medianAbsInteraction: absMedian(rows.map((r) => r.interaction)),
      m2020: { centreLots: centreLots.filter((l) => inWindow(l.entryIndex, '2020-02-15', '2020-04-30')).length, medianLots: median(rows.map((r) => r.m2020.lots)), medianKept: median(rows.map((r) => r.m2020.kept)), medianNet: median(rows.map((r) => r.m2020.net)) },
      r2223: { centreLots: centreLots.filter((l) => inWindow(l.entryIndex, '2022-01-01', '2023-12-31')).length, medianLots: median(rows.map((r) => r.r2223.lots)), medianKept: median(rows.map((r) => r.r2223.kept)), medianNet: median(rows.map((r) => r.r2223.net)) },
      // predeclared reporting flag (PROTOCOL.md §10.2): profit hinges on the centre's funded sequence
      sequenceDependent: symbols.length > 1 && median(rows.map((r) => r.jaccard)) < 0.5 && lowMedianNet < 0.5 * centre.net
    };
  }

  const c = centreView(centre, symbols, floors.y);
  const view = (fit: Fit & { records: PointRecord[] }) => ({
    family: fit.family,
    nb: fit.nb,
    wilsonLower: wilsonLower(fit.nb.share, fit.nb.n),
    train: periodStats(fit.records, options.trainKey),
    test: periodStats(fit.records, options.testKey),
    periods: Object.fromEntries(
      ['DEV', 'VAL', 'FX', 'FX13', 'RECENT', 'FULL', 'M2020', 'R2223', '2020', '2022', '2023', '2024', '2025', '2026']
        .map((key) => [key, periodStats(fit.records, key)])
        .filter(([, v]) => v)
    )
  });

  return {
    id: configId(books),
    books,
    booksKey: booksKey(books),
    centre: { ...c, record: centre },
    stress,
    decisive: view(decisive),
    perRep: perRep.map(view),
    alternates: Object.fromEntries(Object.entries(alternates).map(([k, v]) => [k, view(v)])),
    perBook,
    nearBound: nearBound(books),
    atBound: symbols.flatMap((s) => atBound(books[s]!).map((k) => `${s}.${k}`)),
    sequence
  };
};

export type Evidence = ReturnType<typeof evidenceOf>;

// §11.1 qualification gates on an evidence record (E3 needs B1's evidence on the same door and labels).
export const qualificationOf = (
  ev: Evidence,
  floors: Floors,
  options: { fold: string; trainKey: string; testKey?: string; b1?: Evidence; pooled: boolean }
) => {
  const { ceiling } = eligibility;
  const c = ev.centre;
  const record = c.record;
  const nb = ev.decisive.nb;
  const symbols = Object.keys(ev.books);
  const trainCentre = record.periods[options.trainKey];
  const q: Record<string, boolean> = {};

  q.Q1 = record.dd < ceiling;
  q.Q2 = nb.share >= eligibility.share && nb.p90Dd < ceiling;
  q.Q2b = ev.nearBound.length === 0 || (ev.alternates.inbox!.nb.share >= eligibility.share && ev.alternates.inbox!.nb.p90Dd < ceiling);
  if (options.testKey) {
    q.Q3 = (record.periods[options.testKey] ?? NaN) > 0 && (ev.decisive.test?.median ?? NaN) > 0;
  }
  q.Q4 = record.net > 0 && c.bestYearShare <= eligibility.topYearShare && c.exBestPerYear >= eligibility.exBestPerYear;
  q.Q5 =
    record.lots >= floors.lots &&
    record.episodes >= floors.episodes &&
    record.lotYears >= floors.lotYears &&
    (symbols.length === 1 || symbols.every((s) => (record.books[s]?.lots ?? 0) >= floors.bookLots));
  q.Q6 = record.net > 0 && Number.isFinite(c.top1Share) && c.top1Share <= eligibility.topLotShare;
  q.Q7 = Object.values(ev.stress).every((s) => s.net > 0 && s.dd < ceiling);
  q.Q8 = typeof trainCentre === 'number' && trainCentre > 0 && (ev.decisive.train?.median ?? NaN) >= eligibility.plateau * trainCentre;
  q.E1 = nb.medianPerYear >= eligibility.medianPerYear && nb.p10Net > 0;
  q.E2 = c.perCapitalYear >= eligibility.perCapitalYear;

  if (options.pooled) {
    const b1 = options.b1?.alternates.d8?.nb;
    const mine = ev.alternates.d8?.nb;

    q.E3 = !!b1 && !!mine && !(b1.medianPerYear >= mine.medianPerYear && b1.p90Dd <= mine.p90Dd && (b1.medianPerYear > mine.medianPerYear || b1.p90Dd < mine.p90Dd));
  }

  const failed = Object.entries(q).filter(([, v]) => !v).map(([k]) => k);
  const marginal = q.Q2 && (nb.share <= 0.93 || ev.perRep.some((r) => !(r.nb.share >= eligibility.share && r.nb.p90Dd < ceiling)));

  return { gates: q, failed, qualified: failed.length === 0, marginal, wilsonLower: ev.decisive.wilsonLower };
};

export { baseSettings };
