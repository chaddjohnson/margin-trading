// The entry families of MECHANISM_CATALOG.json v1.0 as position-independent signal arrays over sessions: a level
// family's hysteretic state (1 = IN at the close of s), an event family's triggers and its own OUT, or an intraday
// family's minute rule. Nothing here reads a position: the simulator (engine.ts) decides what the signals do.
import { Features, monthOf } from './features.ts';

export type FamilyId = 'E01' | 'E02' | 'E03' | 'E04' | 'E05' | 'E06' | 'E07' | 'E08' | 'E09' | 'E10' | 'E11' | 'E12';
export type ControlId = 'C-SMA' | 'C-DON' | 'C-TSM' | 'C-AL' | 'C-ALR' | 'C-IDLE';
export type SignalId = FamilyId | ControlId | 'X-CS';

export type Params = Record<string, number>;

export type Signals =
  | { kind: 'level'; state: Int8Array }
  // out: own OUT at the close of s; level: a structural level recorded at the trigger (own OUT = close below it)
  | { kind: 'event'; trigger: Int8Array; out?: Int8Array; level?: Float64Array }
  | { kind: 'intraday'; mode: 'low' | 'high'; y: number; out: Int8Array }
  | { kind: 'none' };

export interface ParamSpec {
  name: string;
  lo: number;
  hi: number;
  q: number; // quantum
  default: number;
}

export interface FamilySpec {
  id: FamilyId;
  short: string;
  group: string;
  type: 'level' | 'event' | 'intraday' | 'campaign';
  params: ParamSpec[];
}

const pct = (name: string, def: number, lo: number, hi: number): ParamSpec => ({
  name,
  lo,
  hi,
  q: 0.001,
  default: def
});
const ratio = (name: string, def: number, lo: number, hi: number, q = 0.01): ParamSpec => ({
  name,
  lo,
  hi,
  q,
  default: def
});
const int = (name: string, def: number, lo: number, hi: number): ParamSpec => ({ name, lo, hi, q: 1, default: def });

export const families: Record<FamilyId, FamilySpec> = {
  E01: {
    id: 'E01',
    short: 'PP',
    group: 'G1',
    type: 'level',
    params: [pct('d_in', 0.02, 0, 0.08), pct('d_gap', 0.08, 0.01, 0.2)]
  },
  E02: {
    id: 'E02',
    short: 'HD',
    group: 'G2',
    type: 'level',
    params: [int('N', 126, 20, 250), pct('a_in', 0.2, 0, 0.6), pct('a_gap', 0.2, 0, 0.5)]
  },
  E03: {
    id: 'E03',
    short: 'ER',
    group: 'G2',
    type: 'level',
    params: [int('N', 30, 10, 120), ratio('e_in', 0.3, 0.05, 0.6), ratio('e_gap', 0.3, 0, 0.6)]
  },
  E04: {
    id: 'E04',
    short: 'CU',
    group: 'G3',
    type: 'level',
    params: [ratio('kappa', 0.25, 0, 0.5), ratio('h_in', 4, 1, 8, 0.1), ratio('h_out', 4, 1, 8, 0.1)]
  },
  E05: {
    id: 'E05',
    short: 'RF',
    group: 'G4',
    type: 'event',
    params: [pct('theta', 0.05, 0.02, 0.15), pct('b', 0.005, 0, 0.03)]
  },
  E06: {
    id: 'E06',
    short: 'CV',
    group: 'G5',
    type: 'level',
    params: [pct('v_in', 0.2, 0.08, 0.4), pct('v_gap', 0.15, 0.02, 0.4), int('N', 50, 20, 250)]
  },
  E07: { id: 'E07', short: 'BA', group: 'G4', type: 'event', params: [int('N', 50, 10, 250), int('A', 3, 0, 10)] },
  E08: {
    id: 'E08',
    short: 'CE',
    group: 'G4',
    type: 'event',
    params: [int('N', 20, 10, 60), pct('c', 0.08, 0.03, 0.15)]
  },
  E09: { id: 'E09', short: 'TB', group: 'G7', type: 'intraday', params: [pct('Y', 0.03, 0.005, 0.08)] },
  E10: { id: 'E10', short: 'TH', group: 'G7', type: 'intraday', params: [pct('Yb', 0, 0, 0.03)] },
  E11: {
    id: 'E11',
    short: 'DP',
    group: 'G8',
    type: 'campaign',
    params: [pct('D', 0.15, 0.05, 0.3), int('n', 5, 2, 30)]
  },
  E12: {
    id: 'E12',
    short: 'PC',
    group: 'G4',
    type: 'event',
    params: [pct('u', 0.2, 0.05, 0.5), pct('p', 0.05, 0.02, 0.12)]
  }
};

export const familyIds = Object.keys(families) as FamilyId[];

export const quantize = (value: number, spec: ParamSpec) => {
  const clamped = Math.min(spec.hi, Math.max(spec.lo, value));
  const steps = Math.round((clamped - spec.lo) / spec.q);

  // Round to the quantum's decimals so that equal settings are equal numbers.
  const decimals = spec.q >= 1 ? 0 : Math.round(-Math.log10(spec.q));

  return Number((spec.lo + steps * spec.q).toFixed(decimals));
};

export const defaultParams = (id: FamilyId): Params =>
  Object.fromEntries(families[id].params.map((spec) => [spec.name, spec.default]));

const hysteresis = (n: number, enter: (s: number) => boolean, exit: (s: number) => boolean) => {
  const state = new Int8Array(n);
  let on = 0;

  for (let s = 0; s < n; s++) {
    if (on === 0 && enter(s)) {
      on = 1;
    } else if (on === 1 && exit(s)) {
      on = 0;
    }

    state[s] = on;
  }

  return state;
};

const lowClose20 = (F: Features) => {
  const low = F.priorMinClose(20);
  const out = new Int8Array(F.n);

  for (let s = 0; s < F.n; s++) {
    out[s] = F.C[s]! < low[s]! ? 1 : 0; // NaN compares false
  }

  return out;
};

export const signalsOf = (F: Features, id: SignalId, p: Params): Signals => {
  const { n, C, H } = F;

  switch (id) {
    case 'E01': {
      const high = F.maxClose(250);
      const dOut = p.d_in! + p.d_gap!;
      const dd = (s: number) => 1 - C[s]! / high[s]!;

      return {
        kind: 'level',
        state: hysteresis(
          n,
          (s) => dd(s) <= p.d_in!,
          (s) => dd(s) >= dOut
        )
      };
    }
    case 'E02': {
      const a = F.annualisedReturn(p.N!);
      const aOut = p.a_in! - p.a_gap!;

      return {
        kind: 'level',
        state: hysteresis(
          n,
          (s) => a[s]! >= p.a_in!,
          (s) => a[s]! < aOut
        )
      };
    }
    case 'E03': {
      const er = F.efficiency(p.N!);
      const a = F.annualisedReturn(p.N!);
      const eOut = p.e_in! - p.e_gap!;

      return {
        kind: 'level',
        state: hysteresis(
          n,
          (s) => er[s]! >= p.e_in! && a[s]! >= 0.11,
          (s) => er[s]! <= eOut
        )
      };
    }
    case 'E04': {
      const sd = F.priorDailySd(60);
      const state = new Int8Array(n);
      let up = 0;
      let down = 0;
      let on = 0;

      for (let s = 0; s < n; s++) {
        const z = F.r[s]! / sd[s]!;

        if (Number.isFinite(z)) {
          up = Math.max(0, up + z - p.kappa!);
          down = Math.max(0, down - z - p.kappa!);

          if (on === 0 && up >= p.h_in!) {
            on = 1;
            down = 0;
          } else if (on === 1 && down >= p.h_out!) {
            on = 0;
            up = 0;
          }
        }

        state[s] = on;
      }

      return { kind: 'level', state };
    }
    case 'E05': {
      const theta = p.theta!;
      const trigger = new Int8Array(n);
      const out = new Int8Array(n);
      let mode: 'none' | 'up' | 'down' = 'none';
      let extHigh = C[0]!;
      let extLow = C[0]!;
      let lastLow = NaN;

      for (let s = 1; s < n; s++) {
        const c = C[s]!;

        if (mode === 'none') {
          extHigh = Math.max(extHigh, c);
          extLow = Math.min(extLow, c);

          if (c >= extLow * (1 + theta)) {
            lastLow = extLow;
            mode = 'up';
            extHigh = c;
          } else if (c <= extHigh * (1 - theta)) {
            mode = 'down';
            extLow = c;
          }
        } else if (mode === 'up') {
          extHigh = Math.max(extHigh, c);

          if (c <= extHigh * (1 - theta)) {
            mode = 'down';
            extLow = c;
          }
        } else {
          extLow = Math.min(extLow, c);

          if (c >= extLow * (1 + theta)) {
            const previous = lastLow;

            lastLow = extLow;
            mode = 'up';
            extHigh = c;
            trigger[s] = Number.isFinite(previous) && lastLow > previous ? 1 : 0;
          }
        }

        out[s] = Number.isFinite(lastLow) && c < lastLow * (1 - p.b!) ? 1 : 0;
      }

      return { kind: 'event', trigger, out };
    }
    case 'E06': {
      const s20 = F.sigma(20);
      const s10 = F.sigma(10);
      const N = p.N!;
      const vOut = p.v_in! + p.v_gap!;

      return {
        kind: 'level',
        state: hysteresis(
          n,
          (s) => s >= N && s20[s]! <= p.v_in! && C[s]! > C[s - N]!,
          (s) => s10[s]! >= vOut || (s >= N && C[s]! < C[s - N]!)
        )
      };
    }
    case 'E07': {
      const prior = F.priorMaxClose(p.N!);
      const trigger = new Int8Array(n);
      let pending = -1;
      let level = NaN;

      for (let s = 0; s < n; s++) {
        if (pending < 0) {
          if (C[s]! > prior[s]!) {
            if (p.A === 0) {
              trigger[s] = 1;
            } else {
              pending = s;
              level = prior[s]!;
            }
          }
        } else if (C[s]! < level) {
          pending = -1;
        } else if (s - pending >= p.A!) {
          trigger[s] = 1;
          pending = -1;
        }
      }

      return { kind: 'event', trigger, out: lowClose20(F) };
    }
    case 'E08': {
      const top = F.priorMaxHigh(p.N!);
      const bottom = F.priorMinLow(p.N!);
      const trigger = new Int8Array(n);
      const level = new Float64Array(n).fill(NaN);

      for (let s = 0; s < n; s++) {
        const width = (top[s]! - bottom[s]!) / bottom[s]!;

        if (width <= p.c! && C[s]! > top[s]!) {
          trigger[s] = 1;
          level[s] = bottom[s]!;
        }
      }

      return { kind: 'event', trigger, level };
    }
    case 'E09':
      return { kind: 'intraday', mode: 'low', y: p.Y!, out: lowClose20(F) };
    case 'E10':
      return { kind: 'intraday', mode: 'high', y: p.Yb!, out: lowClose20(F) };
    case 'E11': {
      const high = F.maxClose(250);
      const prior = F.priorMaxClose(p.n!);
      const trigger = new Int8Array(n);
      const out = new Int8Array(n);
      let on = false;
      let since = 0;

      for (let s = 0; s < n; s++) {
        if (!on && C[s]! >= high[s]!) {
          on = true;
          since = C[s]!;
        } else if (on) {
          since = Math.max(since, C[s]!);

          if (1 - C[s]! / since >= p.D!) {
            on = false;
          }
        }

        out[s] = on ? 0 : 1;
        trigger[s] = on && C[s]! > prior[s]! ? 1 : 0;
      }

      return { kind: 'event', trigger, out };
    }
    case 'E12': {
      const low126 = F.minClose(126);
      const arg250 = F.argMaxClose(250);
      const high20 = F.maxClose(20);
      const trigger = new Int8Array(n);
      const level = new Float64Array(n).fill(NaN);

      for (let s = 249; s < n; s++) {
        const uptrend = C[s]! >= (1 + p.u!) * low126[s]! && arg250[s]! >= s - 62;

        if (!uptrend || !(C[s]! > H[s - 1]!)) {
          continue;
        }

        let pullback = false;
        let low = Infinity;

        for (let j = s - 9; j <= s; j++) {
          if (C[j]! <= (1 - p.p!) * high20[j]!) {
            pullback = true;
          }

          low = Math.min(low, C[j]!);
        }

        if (pullback) {
          trigger[s] = 1;
          level[s] = low;
        }
      }

      return { kind: 'event', trigger, level };
    }
    case 'X-CS': {
      const m = F.closeLocation(p.N!);
      const N = p.N!;

      return {
        kind: 'level',
        state: hysteresis(
          n,
          (s) => s >= N && m[s]! >= p.c_in! && C[s]! > C[s - N]!,
          (s) => m[s]! <= p.c_out!
        )
      };
    }
    case 'C-SMA': {
      const sma = F.sma(200);
      const state = new Int8Array(n);
      let on = 0;

      for (let s = 0; s < n; s++) {
        if (C[s]! > sma[s]!) {
          on = 1;
        } else if (C[s]! < sma[s]!) {
          on = 0;
        }

        state[s] = on;
      }

      return { kind: 'level', state };
    }
    case 'C-DON': {
      const prior = F.priorMaxClose(55);
      const trigger = new Int8Array(n);

      for (let s = 0; s < n; s++) {
        trigger[s] = C[s]! > prior[s]! ? 1 : 0;
      }

      return { kind: 'event', trigger, out: lowClose20(F) };
    }
    case 'C-TSM': {
      const state = new Int8Array(n);
      let on = 0;

      for (let s = 0; s < n; s++) {
        if (s >= 250 && monthOf(F.dates[s]!) !== monthOf(F.dates[s - 1]!)) {
          on = C[s]! > C[s - 250]! ? 1 : 0;
        }

        state[s] = on;
      }

      return { kind: 'level', state };
    }
    case 'C-AL':
      return { kind: 'level', state: new Int8Array(n).fill(1) };
    case 'C-ALR':
    case 'C-IDLE':
      return { kind: 'none' };
  }
};
