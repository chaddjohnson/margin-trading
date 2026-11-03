// Causal daily features of one Dataset (PROTOCOL.md §3, MECHANISM_CATALOG.json conventions). The value at session s
// uses sessions <= s only (or < s for the "prior" windows) and is NaN until its lookback exists. Every window is
// computed by a direct loop in ascending index order (no running sums), so a naive restatement reproduces it bit for
// bit; the arrays are cached per window length.
import type { Dataset } from '../four-family/data.ts';

export const sessionsPerYear = 252;

export class Features {
  readonly n: number;
  readonly O: Float64Array;
  readonly H: Float64Array;
  readonly L: Float64Array;
  readonly C: Float64Array;
  readonly r: Float64Array; // r[s] = ln(C_s / C_{s-1}); r[0] = NaN
  readonly dates: string[];
  private readonly cache = new Map<string, Float64Array>();

  constructor(readonly ds: Dataset) {
    this.n = ds.sessionCount;
    this.O = ds.sOpen;
    this.H = ds.sHigh;
    this.L = ds.sLow;
    this.C = ds.sClose;
    this.dates = ds.dates;
    this.r = new Float64Array(this.n).fill(NaN);

    for (let s = 1; s < this.n; s++) {
      this.r[s] = Math.log(this.C[s]! / this.C[s - 1]!);
    }
  }

  private memo(key: string, build: () => Float64Array) {
    let value = this.cache.get(key);

    if (!value) {
      value = build();
      this.cache.set(key, value);
    }

    return value;
  }

  // Extreme of `values` over [s - back, s - back + len - 1] for every s, NaN when the window starts before 0.
  private window(key: string, values: Float64Array, len: number, back: number, kind: 'max' | 'min') {
    return this.memo(`${key}:${kind}:${len}:${back}`, () => {
      const out = new Float64Array(this.n).fill(NaN);

      for (let s = 0; s < this.n; s++) {
        const first = s - back;

        if (first < 0) {
          continue;
        }

        let extreme = values[first]!;

        for (let i = first + 1; i < first + len; i++) {
          const value = values[i]!;

          if (kind === 'max' ? value > extreme : value < extreme) {
            extreme = value;
          }
        }

        out[s] = extreme;
      }

      return out;
    });
  }

  // max / min of C over s-N+1..s (inclusive).
  maxClose(N: number) {
    return this.window('C', this.C, N, N - 1, 'max');
  }

  minClose(N: number) {
    return this.window('C', this.C, N, N - 1, 'min');
  }

  // max / min of C (H, L) over s-N..s-1 (the N sessions before s).
  priorMaxClose(N: number) {
    return this.window('C', this.C, N, N, 'max');
  }

  priorMinClose(N: number) {
    return this.window('C', this.C, N, N, 'min');
  }

  priorMaxHigh(N: number) {
    return this.window('H', this.H, N, N, 'max');
  }

  priorMinLow(N: number) {
    return this.window('L', this.L, N, N, 'min');
  }

  // The latest index of the maximum close over s-N+1..s (-1 before the lookback).
  argMaxClose(N: number) {
    return this.memo(`argmax:${N}`, () => {
      const out = new Float64Array(this.n).fill(-1);

      for (let s = N - 1; s < this.n; s++) {
        let best = s - N + 1;

        for (let i = best + 1; i <= s; i++) {
          if (this.C[i]! >= this.C[best]!) {
            best = i;
          }
        }

        out[s] = best;
      }

      return out;
    });
  }

  // Mean of C over s-N+1..s.
  sma(N: number) {
    return this.memo(`sma:${N}`, () => {
      const out = new Float64Array(this.n).fill(NaN);

      for (let s = N - 1; s < this.n; s++) {
        let sum = 0;

        for (let i = s - N + 1; i <= s; i++) {
          sum += this.C[i]!;
        }

        out[s] = sum / N;
      }

      return out;
    });
  }

  // Sample standard deviation of r over [s - back, s - back + N - 1], NaN when any r is undefined; optionally
  // annualised by sqrt(252).
  private sd(N: number, back: number, annualise: boolean) {
    return this.memo(`sd:${N}:${back}:${annualise}`, () => {
      const out = new Float64Array(this.n).fill(NaN);

      for (let s = 0; s < this.n; s++) {
        const first = s - back;

        if (first < 1) {
          continue;
        }

        let sum = 0;

        for (let i = first; i < first + N; i++) {
          sum += this.r[i]!;
        }

        const mean = sum / N;
        let squares = 0;

        for (let i = first; i < first + N; i++) {
          const d = this.r[i]! - mean;

          squares += d * d;
        }

        const sd = Math.sqrt(squares / (N - 1));

        out[s] = annualise ? sd * Math.sqrt(sessionsPerYear) : sd;
      }

      return out;
    });
  }

  // Annualised realised volatility of r over s-N+1..s.
  sigma(N: number) {
    return this.sd(N, N - 1, true);
  }

  // Daily standard deviation of r over s-N..s-1 (known before session s).
  priorDailySd(N: number) {
    return this.sd(N, N, false);
  }

  // (252 / N) ln(C_s / C_{s-N}).
  annualisedReturn(N: number) {
    return this.memo(`ann:${N}`, () => {
      const out = new Float64Array(this.n).fill(NaN);

      for (let s = N; s < this.n; s++) {
        out[s] = (sessionsPerYear / N) * Math.log(this.C[s]! / this.C[s - N]!);
      }

      return out;
    });
  }

  // Signed efficiency (C_s - C_{s-N}) / sum_{i=s-N+1..s} |C_i - C_{i-1}|; 0 when the path length is 0.
  efficiency(N: number) {
    return this.memo(`er:${N}`, () => {
      const out = new Float64Array(this.n).fill(NaN);

      for (let s = N; s < this.n; s++) {
        let path = 0;

        for (let i = s - N + 1; i <= s; i++) {
          path += Math.abs(this.C[i]! - this.C[i - 1]!);
        }

        out[s] = path === 0 ? 0 : (this.C[s]! - this.C[s - N]!) / path;
      }

      return out;
    });
  }

  // Mean true range over s-N+1..s; TR_s = max(H_s, C_{s-1}) - min(L_s, C_{s-1}), TR_0 = H_0 - L_0.
  atr(N: number) {
    return this.memo(`atr:${N}`, () => {
      const tr = new Float64Array(this.n);
      const out = new Float64Array(this.n).fill(NaN);

      for (let s = 0; s < this.n; s++) {
        tr[s] =
          s === 0
            ? this.H[0]! - this.L[0]!
            : Math.max(this.H[s]!, this.C[s - 1]!) - Math.min(this.L[s]!, this.C[s - 1]!);
      }

      for (let s = N - 1; s < this.n; s++) {
        let sum = 0;

        for (let i = s - N + 1; i <= s; i++) {
          sum += tr[i]!;
        }

        out[s] = sum / N;
      }

      return out;
    });
  }

  // Mean close-location value over s-N+1..s; CLV = (C - L) / (H - L), 0.5 when H = L.
  closeLocation(N: number) {
    return this.memo(`clv:${N}`, () => {
      const out = new Float64Array(this.n).fill(NaN);

      for (let s = N - 1; s < this.n; s++) {
        let sum = 0;

        for (let i = s - N + 1; i <= s; i++) {
          const range = this.H[i]! - this.L[i]!;

          sum += range === 0 ? 0.5 : (this.C[i]! - this.L[i]!) / range;
        }

        out[s] = sum / N;
      }

      return out;
    });
  }
}

// Calendar helpers (dates are YYYY-MM-DD New York trading dates).
export const weekdayOf = (date: string) => new Date(`${date}T12:00:00Z`).getUTCDay(); // 0 = Sunday
export const isFriday = (date: string) => weekdayOf(date) === 5;
export const monthOf = (date: string) => date.slice(0, 7);
