// Daily OHLC candles of one symbol of a run-shaped result (GET /api/runs/:id/candles, GET /api/previews/:id/candles).
// One candle per regular NYSE session in the run's window, aggregated on the server from the canonical minute file by the
// repository's session builder (src/lib/session.ts): open = the first regular-session minute's open; high / low = the
// highest high and lowest low of the regular-session minutes AND the official closing print; close = the closing print
// (the scheduled close's auction print), or the last regular-session minute's close when the file has no print.
// Pre-market and after-hours bars are not part of a session. All four prices of a session are multiplied by the same
// split factor, to the run's basis (the units its events were computed in). Columnar, so a decade stays small.
// Documented in docs/strategy-lab/DAILY_CANDLES.md.

export interface CandlesResponse {
  runId: string;
  symbol: string;
  dataOrigin: 'real';
  basisDate: string;
  units: string;
  /** Where the candles come from, in words (shown in the UI and the docs). */
  source: string;
  firstSession: string | null;
  lastSession: string | null;
  /** New York session dates, ascending. */
  d: string[];
  /**
   * The candle's x: the midpoint of the session's scheduled regular hours, 09:30–16:00 ET (12:45 ET), or 09:30–13:00 ET on
   * an early close (11:15 ET), in ms since the epoch — a real instant inside the session, so both chart types share one
   * time axis.
   */
  x: number[];
  o: number[];
  h: number[];
  l: number[];
  c: number[];
  /** 1 = the close is the official closing print; 0 = no print in the file, the last regular minute's close. */
  print: (0 | 1)[];
  /** Regular-session minute bars present (minutes without a trade have no bar), and the scheduled count (390 or 210). */
  minutes: number[];
  scheduled: number[];
  /** The split factor applied to the session's raw prices (1 when no split lies between the basis and the session). */
  factor: number[];
  /** Sessions in the window whose prices fail the OHLC check; they get no candle. */
  omitted: { date: string; reason: string }[];
}

/** Relative tolerance of the OHLC ordering check (split factors multiply raw prices). */
export const OHLC_TOLERANCE = 1e-9;

/** Why a session's prices cannot make a candle, or null when low ≤ min(open, close) ≤ max(open, close) ≤ high. */
export function ohlcProblem(o: number, h: number, l: number, c: number): string | null {
  if (![o, h, l, c].every((v) => Number.isFinite(v) && v > 0)) return 'a price is missing, not finite or not positive';
  const eps = OHLC_TOLERANCE * Math.max(Math.abs(h), 1);
  if (l > Math.min(o, c) + eps) return `low ${l} is above min(open, close) ${Math.min(o, c)}`;
  if (Math.max(o, c) > h + eps) return `max(open, close) ${Math.max(o, c)} is above high ${h}`;
  return null;
}

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const COLUMNS = ['x', 'o', 'h', 'l', 'c', 'print', 'minutes', 'scheduled', 'factor'] as const;

/** Checks a candles response before it is drawn; a malformed one is refused, never repaired or guessed. */
export function validateCandles(r: unknown): string[] {
  const errors: string[] = [];
  if (typeof r !== 'object' || r === null) return ['not an object'];
  const v = r as Record<string, unknown>;
  for (const k of ['runId', 'symbol', 'basisDate', 'units', 'source'] as const)
    if (typeof v[k] !== 'string') errors.push(`${k}: text expected`);
  if (v.dataOrigin !== 'real') errors.push('dataOrigin: only real market data has candles');
  if (!Array.isArray(v.d) || !v.d.every((x) => typeof x === 'string' && DATE.test(x))) {
    errors.push('d: YYYY-MM-DD dates expected');
    return errors;
  }
  const n = v.d.length;
  for (const k of COLUMNS) {
    const col = v[k];
    if (!Array.isArray(col) || col.length !== n || !col.every((x) => typeof x === 'number' && Number.isFinite(x)))
      errors.push(`${k}: ${n} finite numbers expected`);
  }
  if (!Array.isArray(v.omitted)) errors.push('omitted: an array expected');
  if (errors.length) return errors;
  const c = v as unknown as CandlesResponse;
  for (let i = 0; i < n && errors.length < 20; i++) {
    if (i > 0 && !(c.d[i]! > c.d[i - 1]! && c.x[i]! > c.x[i - 1]!)) errors.push(`session ${c.d[i]}: not ascending`);
    const p = ohlcProblem(c.o[i]!, c.h[i]!, c.l[i]!, c.c[i]!);
    if (p) errors.push(`session ${c.d[i]}: ${p}`);
    if (c.scheduled[i] !== 390 && c.scheduled[i] !== 210) errors.push(`session ${c.d[i]}: scheduled must be 390 or 210`);
    if (c.print[i] !== 0 && c.print[i] !== 1) errors.push(`session ${c.d[i]}: print must be 0 or 1`);
  }
  return errors;
}
