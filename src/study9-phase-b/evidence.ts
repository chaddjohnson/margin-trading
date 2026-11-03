// Study 9 Phase B: Study 8's evidenceOf (src/study8-expanded-regime-d1/evidence.ts), ported line for line; the diff is
// limited to the imports (this study's designs, evaluator and fitness ports, whose seed namespace is 'study9-phase-b'
// and whose book order is the engine's) and to importing Study 8's wilsonLower, nearBound rule and qualificationOf
// unchanged instead of copying them (nearBound is re-exported from designs.ts in the engine order). Parity gate A2 runs
// it with Study 8's namespace and requires Study 8's sealed F24 qualification evidence of VG #1 and VG #2.
//
// Evidence for one configuration on one door (PROTOCOL.md §5, §8): the centre and stresses; the decisive joint N1
// clip sets (pooled, unique); the alternates (in-box, 0.5r, 1.5r, count-matched k = 8 and k = 16, norm-matched, per-book);
// train/test attribution of the centre and every neighbour; the funded-sequence diagnostics on the first set
// (kept lots, ledger Jaccard, displaced/added lots, the own-P&L versus funding interaction, March 2020 and 2022–2023);
// and the gate quantities. Families are named by the caller (`confirm` on test doors, `final` on the final door).
import { qualificationOf, wilsonLower } from '../study8-expanded-regime-d1/evidence.ts';
import { periodList, stresses, years } from './context.ts';
import { atBound, boundMass, clippingSummary, familyDesign, nearBound, uniquePoints } from './designs.ts';
import { type Books, type Lab, type PointRecord, baseSettings, booksKey, orderedOf, settingsWith } from './engine.ts';
import {
  type FamilySpec,
  type Fit,
  type Floors,
  centreView,
  median,
  nbView,
  pooledFamiliesFit,
  quantile,
  stripRecords,
  summarize
} from './fitness.ts';
import { configId } from './space.ts';

export { nearBound, qualificationOf, wilsonLower };

export interface EvidenceOptions {
  prefix: string; // 'confirm' | 'final'
  track: string;
  fold: string;
  floors: Floors;
  trainKey?: string; // period key of the training window (Q8)
  testKey?: string; // period key of the test window (Q3/F3)
  sequence?: boolean;
  // lite (non-holder shortlist members on the test doors, PROTOCOL.md §8.5): the decisive sets, the in-box pair and
  // count-matched k = 8 only (everything T1–T7 and the Study 7-equivalent gates read); no other variant, no sequence
  lite?: boolean;
}

const periodStats = (records: readonly PointRecord[], key: string | undefined) => {
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

const lotKey = (lot: { symbol: string; entryTime: number; exitTime: number }) =>
  `${lot.symbol}|${lot.entryTime}|${lot.exitTime}`;

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
  const pooledOf = (families: FamilySpec[], name: string) =>
    pooledFamiliesFit(lab, books, symbols, families, floors, name);
  const decisive = pooledOf(main, `${prefix} 1–3`);
  const perRep = main.map((family) => pooledOf([family], family.name));
  const lite = options.lite === true;
  const alternates: Record<string, Fit & { records: PointRecord[] }> = {
    inbox: pooledOf(
      [1, 2].map((rep) => fam(`${prefix}-inbox`, 128, rep, { mode: 'inbox' })),
      'inbox'
    )
  };

  if (!lite) {
    alternates.half = pooledOf([fam(`${prefix}-half`, 128, 1, { scale: 0.5 })], 'half');
    alternates.wide = pooledOf([fam(`${prefix}-wide`, 128, 1, { scale: 1.5 })], 'wide');
  }

  if (lite) {
    alternates.d8 = pooledOf(
      [1, 2].map((rep) => fam(`${prefix}-d8`, 128, rep, { matchCount: 8 })),
      'd8'
    );
  } else if (symbols.length > 1) {
    alternates.d8 = pooledOf(
      [1, 2].map((rep) => fam(`${prefix}-d8`, 128, rep, { matchCount: 8 })),
      'd8'
    );
    alternates.norm = pooledOf([fam(`${prefix}-norm`, 128, 1, { scale: Math.sqrt(8 / d) })], 'norm');
    // count-matched k = 16 for the wider pools (three or more books; reported, never a gate)
    if (symbols.length >= 3) alternates.d16 = pooledOf([fam(`${prefix}-d16`, 128, 1, { matchCount: 16 })], 'd16');
  } else {
    // the one-book k = 8 design is its full joint design; same labels as a pool's d8 (comparable for E3)
    alternates.d8 = pooledOf(
      [1, 2].map((rep) => fam(`${prefix}-d8`, 128, rep, { matchCount: 8 })),
      'd8'
    );
  }

  const perBook: Record<string, ReturnType<typeof stripRecords>> = {};

  if (symbols.length > 1 && !lite) {
    for (const symbol of symbols) {
      const points = uniquePoints(
        familyDesign(books, [symbol], { n: 64, labels: [`${prefix}-book`, track, fold, symbol] }),
        books
      );
      const records = points.map((point) => lab.point(point.books));
      const nb = nbView(summarize(records), floors.y);

      perBook[symbol] = {
        nb,
        train: periodStats(records, options.trainKey),
        test: periodStats(records, options.testKey)
      } as never;
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

  if (options.sequence !== false && !lite) {
    const ev = lab.ev;
    const centreLots = ev.replay(books).lots;
    const centreKeys = new Set(centreLots.map(lotKey));
    const standaloneCentre = Object.fromEntries(symbols.map((s) => [s, lab.point({ [s]: books[s]! }).net]));
    const points = uniquePoints(familyDesign(books, symbols, main[0]!), books);
    const dates = lab.door.dates;
    const inWindow = (index: number, start: string, end: string) =>
      (dates[index] ?? '') >= start && (dates[index] ?? '') <= end;
    const rows = points.map((point) => {
      const lots = ev.replay(point.books).lots;
      const keys = new Set(lots.map(lotKey));
      const kept = [...centreKeys].filter((k) => keys.has(k)).length;
      const record = lab.point(point.books);
      const standaloneDelta = symbols.reduce(
        (total, s) => total + (lab.point({ [s]: point.books[s]! }).net - standaloneCentre[s]!),
        0
      );
      const windowStats = (start: string, end: string) => {
        const mine = lots.filter((l) => inWindow(l.entryIndex, start, end));

        return {
          lots: mine.length,
          kept: mine.filter((l) => centreKeys.has(lotKey(l))).length,
          net: mine.reduce((a, l) => a + l.net, 0)
        };
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
      m2020: {
        centreLots: centreLots.filter((l) => inWindow(l.entryIndex, '2020-02-15', '2020-04-30')).length,
        medianLots: median(rows.map((r) => r.m2020.lots)),
        medianKept: median(rows.map((r) => r.m2020.kept)),
        medianNet: median(rows.map((r) => r.m2020.net))
      },
      r2223: {
        centreLots: centreLots.filter((l) => inWindow(l.entryIndex, '2022-01-01', '2023-12-31')).length,
        medianLots: median(rows.map((r) => r.r2223.lots)),
        medianKept: median(rows.map((r) => r.r2223.kept)),
        medianNet: median(rows.map((r) => r.r2223.net))
      },
      // predeclared reporting flag (PROTOCOL.md §8.5): profit hinges on the centre's funded sequence
      sequenceDependent:
        symbols.length > 1 && median(rows.map((r) => r.jaccard)) < 0.5 && lowMedianNet < 0.5 * centre.net
    };
  }

  // clipping mass of the decisive design (PROTOCOL.md §5): points with any clipped coordinate, per coordinate and bound
  const decisivePoints = uniquePoints(
    main.flatMap((family) => familyDesign(books, symbols, family)),
    books
  );
  const clipping = {
    n: decisivePoints.length,
    ...clippingSummary(decisivePoints),
    boundMass: boundMass(decisivePoints, symbols)
  };
  const c = centreView(centre, symbols, floors.y);
  const view = (fit: Fit & { records: PointRecord[] }) => ({
    family: fit.family,
    nb: fit.nb,
    wilsonLower: wilsonLower(fit.nb.share, fit.nb.n),
    train: periodStats(fit.records, options.trainKey),
    test: periodStats(fit.records, options.testKey),
    periods: Object.fromEntries(
      [...periodList.map((p) => p.key), ...years.map(String)]
        .map((key) => [key, periodStats(fit.records, key) ?? periodStats(fit.records, `${key}~partial`)])
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
    clipping,
    lite,
    atBound: symbols.flatMap((s) => atBound(books[s]!).map((k) => `${s}.${k}`)),
    sequence
  };
};

export type Evidence = ReturnType<typeof evidenceOf>;

export { baseSettings };
