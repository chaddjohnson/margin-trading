// A synthetic daily OHLC path: a geometric random walk whose drift and volatility switch between four regimes (a
// Markov chain), which produces trends, shallow pullbacks, corrections and the occasional sharp sell-off. The
// regimes are invented; nothing is fitted to, sampled from or scaled to any real instrument's history.

import { Rng } from './rng.ts';

export type Regime = 'advance' | 'drift' | 'correction' | 'selloff';

interface RegimeSpec {
  mu: number; // daily log drift
  sigma: number; // daily log volatility
  next: [Regime, number][]; // transition probabilities to other regimes (the remainder stays)
}

export const REGIMES: Record<Regime, RegimeSpec> = {
  advance: {
    mu: 0.0012,
    sigma: 0.0095,
    next: [
      ['drift', 0.006],
      ['correction', 0.0035],
      ['selloff', 0.0003]
    ]
  },
  drift: {
    mu: 0.0001,
    sigma: 0.0105,
    next: [
      ['advance', 0.014],
      ['correction', 0.005]
    ]
  },
  correction: {
    mu: -0.0026,
    sigma: 0.017,
    next: [
      ['advance', 0.022],
      ['drift', 0.018],
      ['selloff', 0.003]
    ]
  },
  selloff: {
    mu: -0.011,
    sigma: 0.032,
    next: [
      ['correction', 0.07],
      ['advance', 0.05]
    ]
  }
};

export interface SyntheticBar {
  o: number;
  h: number;
  l: number;
  c: number;
  regime: Regime;
}

const round2 = (x: number) => Math.round(x * 100) / 100;

export function syntheticPath(n: number, seed: number, start: number): SyntheticBar[] {
  const rng = new Rng(seed);
  let regime: Regime = 'advance';
  let close = start;
  let prevClose = round2(start);
  const out: SyntheticBar[] = [];
  for (let i = 0; i < n; i++) {
    const spec: RegimeSpec = REGIMES[regime];
    const r = spec.mu + spec.sigma * rng.normal();
    const gap = 0.3 * spec.sigma * rng.normal();
    const wickUp = Math.abs(rng.normal()) * 0.45 * spec.sigma;
    const wickDown = Math.abs(rng.normal()) * 0.45 * spec.sigma;
    close = close * Math.exp(r);
    const c = round2(close);
    const o = i === 0 ? round2(start) : round2(prevClose * Math.exp(gap));
    const h = Math.max(round2(Math.max(o, c) * Math.exp(wickUp)), o, c);
    const l = Math.min(round2(Math.min(o, c) * Math.exp(-wickDown)), o, c);
    out.push({ o, h, l, c, regime });
    prevClose = c;

    const u = rng.next();
    let acc = 0;
    for (const [to, p] of spec.next) {
      acc += p;
      if (u < acc) {
        regime = to;
        break;
      }
    }
  }
  return out;
}
