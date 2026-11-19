// Atomic, hash-validated checkpoints (PROTOCOL.md §3.4; the completed study's mechanism with this study's envelope):
// a temporary file, fsync, rename over the previous one (kept as .prev), directory fsync. A checkpoint carries the
// sha256 of its body and the pins it was written under; a resume refuses any mismatch.
import fs from 'node:fs';
import { rngRestore, rngState, sha256, writeAtomic } from '../growth140-vgt-s8m/checkpoint.ts';
import { decode, encode } from '../growth140-vgt-s8m/store.ts';
import { STUDY } from './context.ts';

export { rngRestore, rngState, sha256, writeAtomic };

const KIND = `${STUDY} checkpoint`;

export interface Envelope<T> {
  kind: string;
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
    const envelope = {
      kind: KIND,
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

  read(): Envelope<T> | null {
    for (const file of [this.file, `${this.file}.prev`]) {
      if (!fs.existsSync(file)) continue;

      let envelope: Envelope<T>;

      try {
        envelope = decode<Envelope<T>>(fs.readFileSync(file, 'utf8'));
      } catch {
        continue;
      }

      if (envelope.kind !== KIND || envelope.job !== this.job) continue;
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
