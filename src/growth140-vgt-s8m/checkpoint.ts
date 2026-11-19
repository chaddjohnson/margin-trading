// Atomic, hash-validated checkpoints (PROTOCOL.md §3.4): written to a temporary file, fsynced, renamed over the
// previous one (kept as .prev) and the directory fsynced. A checkpoint carries the sha256 of its own body and the
// protocol, code and data hashes it was written under; a resume refuses any mismatch.
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { Rng } from '../optimizer/rng.ts';
import { decode, encode } from './store.ts';

export const sha256 = (text: string | Buffer) => createHash('sha256').update(text).digest('hex');

export const writeAtomic = (file: string, text: string) => {
  fs.mkdirSync(path.dirname(file), { recursive: true });

  const tmp = `${file}.tmp-${process.pid}`;
  const fd = fs.openSync(tmp, 'w');

  try {
    fs.writeSync(fd, text);
    fs.fsyncSync(fd);
  } finally {
    fs.closeSync(fd);
  }

  if (fs.existsSync(file)) fs.copyFileSync(file, `${file}.prev`);
  fs.renameSync(tmp, file);

  const dir = fs.openSync(path.dirname(file), 'r');

  try {
    fs.fsyncSync(dir);
  } finally {
    fs.closeSync(dir);
  }
};

export interface Envelope<T> {
  kind: 'growth140-vgt-s8m checkpoint';
  job: string;
  written: string;
  sequence: number;
  pins: Record<string, string>;
  body: T;
  bodySha256: string;
}

export class Checkpointer<T> {
  sequence = 0;
  lastWrite = 0;
  writes = 0;

  constructor(
    readonly file: string,
    readonly job: string,
    readonly pins: Record<string, string>
  ) {}

  write(body: T) {
    const text = encode(body);
    const envelope: Envelope<unknown> = {
      kind: 'growth140-vgt-s8m checkpoint',
      job: this.job,
      written: new Date().toISOString(),
      sequence: ++this.sequence,
      pins: this.pins,
      body: '__BODY__',
      bodySha256: sha256(text)
    };

    writeAtomic(this.file, JSON.stringify(envelope).replace('"__BODY__"', text));
    this.lastWrite = Date.now();
    this.writes++;
  }

  // The latest valid checkpoint (falls back to .prev if the newest is torn), or null. Refuses other pins.
  read(): Envelope<T> | null {
    for (const file of [this.file, `${this.file}.prev`]) {
      if (!fs.existsSync(file)) continue;

      const raw = fs.readFileSync(file, 'utf8');
      let envelope: Envelope<T>;

      try {
        envelope = decode<Envelope<T>>(raw);
      } catch {
        continue;
      }

      if (envelope.kind !== 'growth140-vgt-s8m checkpoint' || envelope.job !== this.job) continue;
      if (sha256(encode(envelope.body)) !== envelope.bodySha256) continue;

      for (const [k, v] of Object.entries(this.pins))
        if (envelope.pins[k] !== v)
          throw new Error(`checkpoint ${file}: pin ${k} = ${envelope.pins[k]}, now ${v}; refused`);

      this.sequence = envelope.sequence;
      return envelope;
    }

    return null;
  }
}

// The sfc32 state of an Rng (src/optimizer/rng.ts keeps it in four private fields).
type RngFields = { a: number; b: number; c: number; d: number };

export const rngState = (rng: Rng): [number, number, number, number] => {
  const x = rng as unknown as RngFields;

  return [x.a, x.b, x.c, x.d];
};

export const rngRestore = (state: readonly number[]): Rng => {
  const rng = new Rng([1, 2, 3, 4]);
  const x = rng as unknown as RngFields;

  [x.a, x.b, x.c, x.d] = state as [number, number, number, number];
  return rng;
};
