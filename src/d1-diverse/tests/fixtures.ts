// Synthetic, deterministic stand-ins for the design tests (PROTOCOL.md §18): a store whose "evaluations" are hash
// functions of the configuration (no market data), with per-symbol strengths that can be skewed to force early
// convergence on one symbol. Configurations sharing a (symbol, vector) share funded "trades", so behaviour-based
// closeness behaves as it does on real traces. Mechanics only: no number here means anything economically.
import { createHash } from 'node:crypto';
import type { Evaluation } from '../../d1-robust/evaluate.ts';
import { keyOf } from '../../d1-robust/evaluate.ts';
import { type Book, gridKeyOf } from '../../d1-robust/neighbourhood.ts';
import type { NeighbourRecord } from '../../d1-robust/stats.ts';
import { floorReferences } from '../../d1-robust/stats.ts';
import { blockSpecOf } from '../scores.ts';
import type { EvalStore, StoreRecord } from '../store.ts';

export const hashUnit = (...parts: (string | number)[]) => {
  const digest = createHash('sha256').update(parts.join('|')).digest();

  return digest.readUInt32BE(0) / 2 ** 32; // [0, 1)
};

export const references = floorReferences();
export const blocks = blockSpecOf(400, 400 + 3 * 252 - 1); // K = 3

export interface SyntheticOptions {
  strength?: (symbol: string) => number; // multiplies a member's contribution
  drawdownPerBook?: number;
}

export class SyntheticStore implements EvalStore {
  readonly blocks = blocks;
  readonly discDraws = 8;
  readonly evaluations = { centres: 0, neighbourhoods: 0 };
  private readonly records = new Map<string, StoreRecord>();

  constructor(readonly options: SyntheticOptions = {}) {}

  centreOf(books: readonly Book[]): Evaluation {
    const members = books.map((book) => book.symbol).sort();
    const strength = this.options.strength ?? (() => 1);
    let net = 0;
    const netBySymbol: Record<string, number> = {};
    const lotsBySymbol: Record<string, number> = {};
    const funded: string[] = [];

    for (const book of books) {
      const q = hashUnit('q', book.symbol, gridKeyOf(book.vector.grid)) - 0.35;
      const contribution = 20000 * strength(book.symbol) * q;
      const lots = 3 + Math.floor(6 * hashUnit('lots', book.symbol, gridKeyOf(book.vector.grid)));

      netBySymbol[book.symbol] = contribution;
      lotsBySymbol[book.symbol] = lots;
      net += contribution;

      for (let t = 0; t < lots; t++) {
        funded.push(`${book.symbol}@${Math.floor(1000 * hashUnit('t', book.symbol, gridKeyOf(book.vector.grid), t))}`);
      }
    }

    net -= 2500 * Math.max(0, books.length - 4);

    const lots = funded.length;
    const minuteDrawdown =
      12000 + (this.options.drawdownPerBook ?? 2500) * books.length + 8000 * hashUnit('dd', keyOf(books));
    const shares = [hashUnit('b1', keyOf(books)), hashUnit('b2', keyOf(books)), hashUnit('b3', keyOf(books))];
    const total = shares.reduce((a, b) => a + b, 0);
    const marks = [0];

    shares.forEach((share) => marks.push(marks.at(-1)! + (net * share) / total));

    const regimes = Array.from({ length: 13 }, (_, r) =>
      books.reduce((sum, book) => sum + hashUnit('regime', book.symbol, gridKeyOf(book.vector.grid), r) - 0.4, 0)
    );

    return {
      key: keyOf(books),
      costBps: 5,
      books: books.length,
      members,
      net,
      realized: net,
      unrealized: 0,
      minuteDrawdown,
      dailyDrawdown: minuteDrawdown * 0.8,
      lots,
      lotsBySymbol,
      netBySymbol,
      virtualBySymbol: lotsBySymbol,
      regimesBySymbol: Object.fromEntries(members.map((symbol) => [symbol, 2])),
      virtualTrades: lots,
      inertBooks: 0,
      refused: 0,
      contested: 0,
      refusals: {},
      heldDays: 100,
      utilization: 0.3,
      interest: 0,
      costs: 0,
      top1: Math.max(0, ...Object.values(netBySymbol)),
      top2: Math.max(0, ...Object.values(netBySymbol)),
      worstLot: Math.min(0, ...Object.values(netBySymbol)),
      lotYears: 3 + (lots % 2),
      regimes,
      years: [0, 0, 0, 0, 0, 0, 0],
      quarters: [],
      positiveRegimes: regimes.filter((value) => value > 0).length,
      behaviourKey: keyOf(books).slice(0, 16),
      markAt: marks,
      funded
    };
  }

  neighboursOf(books: readonly Book[], centre: Evaluation): NeighbourRecord[] {
    return Array.from({ length: this.discDraws }, (_, d) => {
      const noise = (hashUnit('nb', keyOf(books), d) - 0.5) * 30000;
      const net = centre.net + noise;
      const marks = centre.markAt!.map((mark, j) => mark + (noise * j) / 3);

      return {
        net,
        drawdown: centre.minuteDrawdown + (hashUnit('nbdd', keyOf(books), d) - 0.3) * 8000,
        lots: centre.lots,
        top2Share: NaN,
        moved: 5,
        markAt: marks
      };
    });
  }

  async evaluate(configs: readonly Book[][], withNeighbours: boolean): Promise<StoreRecord[]> {
    return configs.map((books) => {
      const key = keyOf(books);
      let record = this.records.get(key);

      if (!record) {
        record = { centre: this.centreOf(books) };
        this.records.set(key, record);
        this.evaluations.centres++;
      }

      if (withNeighbours && !record.neighbours && record.centre.minuteDrawdown <= 35000) {
        record.neighbours = this.neighboursOf(books, record.centre);
        this.evaluations.neighbourhoods++;
      }

      return record;
    });
  }
}

// Synthetic symbol lists: the real eligible 61 (alphabetical), a 16-symbol subset, and 61 + 14 fictitious symbols.
export const real61 = [
  'AGG',
  'DBC',
  'EDV',
  'EEM',
  'EFA',
  'EMB',
  'EWJ',
  'EWW',
  'EWY',
  'EWZ',
  'FXI',
  'GDX',
  'GLD',
  'HYG',
  'IAU',
  'IBB',
  'IEF',
  'IEMG',
  'IGV',
  'IJH',
  'IJR',
  'ILF',
  'INDA',
  'IWD',
  'IWF',
  'IWM',
  'IWN',
  'IYT',
  'KBE',
  'KIE',
  'KRE',
  'LQD',
  'MTUM',
  'QUAL',
  'RSP',
  'SHY',
  'SLV',
  'SMH',
  'SPLV',
  'TIP',
  'TLT',
  'USMV',
  'VGK',
  'VGT',
  'VIG',
  'VOOG',
  'VPU',
  'XBI',
  'XHB',
  'XLB',
  'XLE',
  'XLF',
  'XLI',
  'XLK',
  'XLP',
  'XLU',
  'XLV',
  'XLY',
  'XME',
  'XOP',
  'XRT'
];

export const universe16 = [
  'EWZ',
  'GDX',
  'GLD',
  'IWM',
  'IWN',
  'KRE',
  'TLT',
  'VGT',
  'VOOG',
  'XBI',
  'XLE',
  'XLF',
  'XLU',
  'XLY',
  'XOP',
  'XRT'
];

export const universe75 = [
  ...real61,
  ...Array.from({ length: 14 }, (_, i) => `ZZ${String(i + 1).padStart(2, '0')}`)
].sort();
