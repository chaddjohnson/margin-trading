// Sobol low-discrepancy sequence (Gray-code construction) with Joe & Kuo direction numbers
// (new-joe-kuo-6.21201, dimensions 2-16; dimension 1 is the van der Corput sequence), and optional
// deterministic scrambling: a random linear matrix scramble (Matousek) plus a digital shift. Both preserve
// the (t, m, s)-net structure, so every scrambled block of 2^m points stays as well stratified as the
// unscrambled one.
import { Rng } from './rng.ts';

const bits = 32;

// [s, a, m_1..m_s] for dimensions 2..16.
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

export const maxSobolDimensions = joeKuo.length + 1;

// Direction numbers v[k] (k = 0..31) as 32-bit integers, most significant bit first.
export const directionNumbers = (dimension: number): Uint32Array => {
  const v = new Uint32Array(bits);

  if (dimension === 0) {
    for (let k = 0; k < bits; k++) {
      v[k] = (1 << (bits - 1 - k)) >>> 0;
    }

    return v;
  }

  const entry = joeKuo[dimension - 1];

  if (!entry) {
    throw new Error(`Sobol dimension ${dimension + 1} is not supported (maximum ${maxSobolDimensions})`);
  }

  const [s, a, m] = entry;

  for (let k = 0; k < Math.min(s, bits); k++) {
    v[k] = (m[k]! << (bits - 1 - k)) >>> 0;
  }

  for (let k = s; k < bits; k++) {
    let value = (v[k - s]! ^ (v[k - s]! >>> s)) >>> 0;

    for (let j = 1; j < s; j++) {
      if ((a >>> (s - 1 - j)) & 1) {
        value = (value ^ v[k - j]!) >>> 0;
      }
    }

    v[k] = value;
  }

  return v;
};

const popcount = (value: number) => {
  let count = 0;
  let rest = value >>> 0;

  while (rest) {
    rest &= rest - 1;
    count++;
  }

  return count;
};

// The position of the lowest zero bit of n (Gray-code update index).
const trailingOnes = (n: number) => {
  let c = 0;
  let rest = n;

  while (rest & 1) {
    rest >>>= 1;
    c++;
  }

  return c;
};

export interface SobolOptions {
  dimensions: number;
  scramble?: { seed: number[] }; // omitted: the plain sequence
}

export class Sobol {
  private readonly directions: Uint32Array[];
  private readonly shift: Uint32Array;
  private readonly state: Uint32Array;
  private index = 0;

  constructor(private readonly options: SobolOptions) {
    const { dimensions } = options;

    this.directions = Array.from({ length: dimensions }, (_value, dimension) => directionNumbers(dimension));
    this.shift = new Uint32Array(dimensions);
    this.state = new Uint32Array(dimensions);

    if (options.scramble) {
      const rng = new Rng(options.scramble.seed);

      for (let dimension = 0; dimension < dimensions; dimension++) {
        // A lower-triangular binary matrix with a unit diagonal, applied to each direction number: output
        // bit i is the XOR of input bits 0..i (most significant first) selected by row i.
        const rows = Array.from({ length: bits }, (_value, row) => {
          const random = row === 0 ? 0 : rng.nextUint32() >>> (bits - row);

          return ((random << (bits - row)) | (1 << (bits - 1 - row))) >>> 0;
        });
        const original = this.directions[dimension]!;

        this.directions[dimension] = Uint32Array.from(original, (value) => {
          let scrambled = 0;

          for (let row = 0; row < bits; row++) {
            const parity = popcount((rows[row]! & value) >>> 0) & 1;

            scrambled |= parity << (bits - 1 - row);
          }

          return scrambled >>> 0;
        });
        this.shift[dimension] = rng.nextUint32();
      }
    }

    this.state.set(this.shift);
  }

  // The next point in [0, 1)^d. The first point is the (scrambled) origin.
  next(): number[] {
    const point = Array.from(this.state, (value) => value / 4294967296);
    const c = trailingOnes(this.index);

    for (let dimension = 0; dimension < this.options.dimensions; dimension++) {
      this.state[dimension] = (this.state[dimension]! ^ this.directions[dimension]![c]!) >>> 0;
    }

    this.index++;

    return point;
  }
}
