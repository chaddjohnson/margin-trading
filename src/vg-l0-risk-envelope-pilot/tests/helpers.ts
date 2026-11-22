// Test helpers: synthetic records (never market data) and adjacent binary64 values.
import { bookIds } from '../../vg-d1-growth-joint/books.ts';
import type { SRec } from '../../vg-l0-full-joint/evaluate.ts';
import type { Envelope } from '../../gpu-backend/batch.ts';

export const nextUp = (x: number) => {
  const b = new Float64Array([x]);
  const u = new BigUint64Array(b.buffer);

  u[0] = x >= 0 ? u[0]! + 1n : u[0]! - 1n;
  return b[0]!;
};
export const nextDown = (x: number) => {
  const b = new Float64Array([x]);
  const u = new BigUint64Array(b.buffer);

  u[0] = x > 0 ? u[0]! - 1n : u[0]! + 1n;
  return b[0]!;
};

export interface Synth {
  net?: number;
  dd?: number;
  pl?: number; // principal loss (liquidation); marked = pl − 50
  bd?: number; // banked DD (liquidation); marked = bd − 50
  mixed?: boolean;
  d1Lots?: number;
  gLots?: number;
  error?: string;
  signature?: string;
  envelope?: Envelope | null;
}

export const envOf = (pl: number, bd: number): Envelope => ({
  bankedDdMarked: Math.max(0, bd - 50),
  bankedDdLiquidation: bd,
  principalLossMarked: Math.max(0, pl - 50),
  principalLossLiquidation: pl
});

export const rec = (s: Synth = {}): SRec => {
  const d1 = s.d1Lots ?? 2;
  const g = s.gLots ?? 3;
  const books = Object.fromEntries(bookIds.map((b) => [b, { lots: b === 'D1:VGT' ? d1 : b === 'G:VGT' ? g : 0, booked: 0, principalDays: 1 }])) as never;
  const r = {
    id: 'synthetic',
    net: s.net ?? 100_000,
    realized: s.net ?? 100_000,
    unrealized: 0,
    dd: s.dd ?? 20_000,
    ddPeakT: 0,
    ddTroughT: 0,
    ddRecoveryT: 0,
    ddDaily: 0,
    lots: d1 + g,
    wins: 0,
    losses: 0,
    partials: 0,
    lossSum: 0,
    worstLoss: 0,
    largestWin: 0,
    interest: 0,
    costs: 0,
    books,
    fam: { D1: { lots: d1 }, G: { lots: g } } as never,
    mixed: s.mixed ?? (d1 > 0 && g > 0),
    funded: bookIds.filter((b) => (b === 'D1:VGT' ? d1 : b === 'G:VGT' ? g : 0) > 0),
    sessionsHeld: 0,
    peakPrincipal: 0,
    peakValue: 0,
    years: {},
    periods: [],
    topEpisode: 0,
    topEpisodeShare: 0,
    episodes: 0,
    signature: s.signature ?? 'sig',
    virtual: {},
    sessions: 1,
    rc: {},
    ...(s.error ? { error: s.error } : {}),
    ...(s.envelope === null ? {} : { envelope: s.envelope ?? envOf(s.pl ?? 5_000, s.bd ?? 5_000) })
  };

  return r as unknown as SRec;
};
