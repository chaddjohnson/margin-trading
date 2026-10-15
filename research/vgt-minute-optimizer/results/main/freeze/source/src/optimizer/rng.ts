// Deterministic pseudo-random numbers. Seeds are derived by hashing labels, so every stage, ticker, fold
// and run gets an independent, reproducible stream; nothing uses Math.random().
import { createHash } from 'node:crypto';

export const deriveSeed = (...labels: (string | number)[]): number[] => {
  const digest = createHash('sha256').update(labels.join('|')).digest();

  return [0, 4, 8, 12].map((offset) => digest.readUInt32LE(offset));
};

// sfc32: a small, fast generator with a 128-bit state.
export class Rng {
  private a: number;
  private b: number;
  private c: number;
  private d: number;

  constructor(seed: number[]) {
    [this.a, this.b, this.c, this.d] = seed.map((value) => value >>> 0) as [number, number, number, number];

    for (let index = 0; index < 15; index++) {
      this.nextUint32();
    }
  }

  static from(...labels: (string | number)[]) {
    return new Rng(deriveSeed(...labels));
  }

  nextUint32() {
    const t = (((this.a + this.b) >>> 0) + this.d) >>> 0;

    this.d = (this.d + 1) >>> 0;
    this.a = this.b ^ (this.b >>> 9);
    this.b = (this.c + (this.c << 3)) >>> 0;
    this.c = (this.c << 21) | (this.c >>> 11);
    this.c = (this.c + t) >>> 0;

    return t;
  }

  // Uniform in [0, 1) with 53 bits.
  next() {
    const high = this.nextUint32() >>> 5;
    const low = this.nextUint32() >>> 6;

    return (high * 67108864 + low) / 9007199254740992;
  }

  // Uniform integer in [0, n).
  int(n: number) {
    return Math.floor(this.next() * n);
  }
}
