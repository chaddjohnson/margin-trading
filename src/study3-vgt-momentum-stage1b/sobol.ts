// A Sobol sequence (Joe–Kuo direction numbers, new-joe-kuo-6.21201, dimensions 1–16) in Gray-code order with a seeded
// random digital shift (one 32-bit XOR mask per dimension from mulberry32), PROTOCOL.md §7.1. Dimensions 1–8 are
// Stage 1's table (src/study3-vgt-momentum/sobol.ts, which supports 8); a test checks that the two agree there.
import { mulberry32 } from '../study3-vgt-momentum/engine.ts';

// [s, a, m_1..m_s] for dimensions 2..16; dimension 1 has every m = 1.
const joeKuo: [number, number, number[]][] = [
  [1, 0, [1]],
  [2, 1, [1, 3]],
  [3, 1, [1, 3, 1]],
  [3, 2, [1, 1, 1]],
  [4, 1, [1, 1, 3, 3]],
  [4, 4, [1, 3, 5, 13]],
  [5, 2, [1, 1, 5, 5, 17]],
  [5, 4, [1, 1, 5, 5, 5]],
  [5, 7, [1, 1, 7, 11, 19]],
  [5, 11, [1, 1, 5, 1, 1]],
  [5, 13, [1, 1, 1, 3, 11]],
  [5, 14, [1, 3, 5, 5, 31]],
  [6, 1, [1, 3, 3, 9, 7, 49]],
  [6, 13, [1, 1, 1, 15, 21, 21]],
  [6, 16, [1, 3, 1, 13, 27, 49]]
];

export const maxDimensions = joeKuo.length + 1;

const bits = 32;

const directions = (dimension: number) => {
  const v = new Uint32Array(bits + 1);

  if (dimension === 0) {
    for (let i = 1; i <= bits; i++) {
      v[i] = (1 << (bits - i)) >>> 0;
    }

    return v;
  }

  const [s, a, m] = joeKuo[dimension - 1]!;

  for (let i = 1; i <= Math.min(s, bits); i++) {
    v[i] = (m[i - 1]! << (bits - i)) >>> 0;
  }

  for (let i = s + 1; i <= bits; i++) {
    let value = (v[i - s]! ^ (v[i - s]! >>> s)) >>> 0;

    for (let k = 1; k < s; k++) {
      if ((a >>> (s - 1 - k)) & 1) {
        value = (value ^ v[i - k]!) >>> 0;
      }
    }

    v[i] = value;
  }

  return v;
};

// `count` points in [0, 1)^dimensions, the first being the shifted origin.
export const sobolPoints = (dimensions: number, count: number, seed?: number) => {
  if (dimensions < 1 || dimensions > maxDimensions) {
    throw new Error(`Sobol dimensions 1..${maxDimensions} only (asked ${dimensions})`);
  }

  const v = Array.from({ length: dimensions }, (_, d) => directions(d));
  const random = seed === undefined ? undefined : mulberry32(seed);
  const shift = Array.from({ length: dimensions }, () => (random ? Math.floor(random() * 4294967296) >>> 0 : 0));
  const x = new Uint32Array(dimensions);
  const points: number[][] = [];

  for (let n = 0; n < count; n++) {
    if (n > 0) {
      // the index of the rightmost zero bit of n - 1, counted from 1
      let c = 1;
      let value = n - 1;

      while (value & 1) {
        value >>>= 1;
        c++;
      }

      for (let d = 0; d < dimensions; d++) {
        x[d] = (x[d]! ^ v[d]![c]!) >>> 0;
      }
    }

    points.push(Array.from(x, (value, d) => ((value ^ shift[d]!) >>> 0) / 4294967296));
  }

  return points;
};
