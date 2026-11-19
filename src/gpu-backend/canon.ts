// gpu-phase2: canonical, bit-exact hashing of evaluation outputs for the parity gates. Numbers hash by their IEEE-754
// bit pattern (so +0 ≠ −0, every NaN payload as JavaScript produces it, every finite value exactly), typed arrays by
// their bytes, objects by their keys in insertion order (a key-order difference is a difference). Zero tolerance.
import { createHash, type Hash } from 'node:crypto';
import type { VBook } from '../vg-d1-growth-joint/books.ts';
import type { PoolResult } from '../vg-d1-growth-joint/pool.ts';

const f8 = new Float64Array(1);
const b8 = new Uint8Array(f8.buffer);

const feed = (h: Hash, x: unknown): void => {
  if (typeof x === 'number') {
    f8[0] = x;
    h.update('n');
    h.update(b8);
  } else if (typeof x === 'string') {
    h.update(`s${x.length}:`);
    h.update(x);
  } else if (typeof x === 'boolean') h.update(x ? 'T' : 'F');
  else if (x === null) h.update('N');
  else if (x === undefined) h.update('U');
  else if (typeof x === 'bigint') h.update(`b${x.toString(16)};`);
  else if (ArrayBuffer.isView(x)) {
    h.update(`A${x.constructor.name}${x.byteLength}:`);
    h.update(new Uint8Array(x.buffer, x.byteOffset, x.byteLength));
  } else if (Array.isArray(x)) {
    h.update(`[${x.length}:`);
    for (const v of x) feed(h, v);
  } else {
    const o = x as Record<string, unknown>;
    const keys = Object.keys(o);

    h.update(`{${keys.length}:`);
    for (const k of keys) {
      h.update(`${k}=`);
      feed(h, o[k]);
    }
  }
};

export const canonHash = (x: unknown) => {
  const h = createHash('sha256');

  feed(h, x);
  return h.digest('hex').slice(0, 24);
};

// the compared view of a virtual book: its outputs (the parameter key and RC 2's detailed log are not outputs; RC 2's
// counters are compared through the record's rc field)
export const bookView = (b: VBook) => ({
  book: b.book,
  trades: b.trades,
  signals: b.signals,
  firstDecision: b.firstDecision,
  endIndex: b.endIndex,
  standalone: b.standalone
});

// the compared view of a pooled result: everything, with a lot's link to its VTrade object dropped (the trade is
// compared in its book) and the refusal counts in a fixed key order (a count map; its insertion order is not an output)
export const poolView = (r: PoolResult) => ({
  ...r,
  lots: r.lots.map((l) => ({ ...l, trade: `${l.trade?.book ?? l.book}#${l.trade?.id ?? '?'}` })),
  refusals: Object.fromEntries(Object.entries(r.refusals).sort(([a], [b]) => (a < b ? -1 : 1))),
  markChanges: null
});
