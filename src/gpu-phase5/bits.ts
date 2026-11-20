// gpu-phase5: bit-level views of a hashed value, for attributing a canonical-hash mismatch to its first differing
// field. `walk` visits a value exactly as src/gpu-backend/canon.ts `feed` does (same order, same leaves), reporting
// every leaf with its path; a number is reported with its IEEE-754 bit pattern (so two NaNs with different sign or
// payload bits, which JavaScript cannot tell apart, are distinguishable here).
const f8 = new Float64Array(1);
const u8 = new BigUint64Array(f8.buffer);

export const bitsOf = (x: number) => {
  f8[0] = x;
  return u8[0]!.toString(16).padStart(16, '0');
};

export interface Leaf {
  path: string;
  kind: string;
  value: string;
}

export const walk = (x: unknown, path: string, out: (l: Leaf) => void): void => {
  if (typeof x === 'number') out({ path, kind: 'n', value: bitsOf(x) });
  else if (typeof x === 'string') out({ path, kind: 's', value: x });
  else if (typeof x === 'boolean') out({ path, kind: 'b', value: x ? 'T' : 'F' });
  else if (x === null) out({ path, kind: 'N', value: '' });
  else if (x === undefined) out({ path, kind: 'U', value: '' });
  else if (typeof x === 'bigint') out({ path, kind: 'i', value: x.toString(16) });
  else if (ArrayBuffer.isView(x)) {
    const b = new Uint8Array(x.buffer, x.byteOffset, x.byteLength);

    out({ path, kind: `A${x.constructor.name}${x.byteLength}`, value: Buffer.from(b).toString('hex') });
  } else if (Array.isArray(x)) {
    out({ path, kind: '[', value: String(x.length) });
    x.forEach((v, i) => walk(v, `${path}[${i}]`, out));
  } else {
    const o = x as Record<string, unknown>;
    const keys = Object.keys(o);

    out({ path, kind: '{', value: keys.join(',') });
    for (const k of keys) walk(o[k], `${path}.${k}`, out);
  }
};

export const leavesOf = (x: unknown, root = '$') => {
  const out: Leaf[] = [];

  walk(x, root, (l) => out.push(l));
  return out;
};

// every NaN of a value with its bit pattern (path → bits)
export const nansOf = (x: unknown, root = '$') =>
  leavesOf(x, root)
    .filter((l) => l.kind === 'n' && Number.isNaN(Number.parseFloat('NaN')) && /^[7f]ff[0-9a-f]{13}$/.test(l.value) && !/^[7f]ff0{13}$/.test(l.value))
    .map((l) => ({ path: l.path, bits: l.value }));

// the first leaves at which two values differ (path, kind and value of each side); [] when they hash identically
export const firstDiffs = (a: unknown, b: unknown, max = 8, root = '$') => {
  const la = leavesOf(a, root);
  const lb = leavesOf(b, root);
  const out: { path: string; a: Leaf | null; b: Leaf | null }[] = [];

  for (let i = 0; i < Math.max(la.length, lb.length) && out.length < max; i++) {
    const x = la[i] ?? null;
    const y = lb[i] ?? null;

    if (!x || !y || x.path !== y.path || x.kind !== y.kind || x.value !== y.value) {
      out.push({ path: (x ?? y)!.path, a: x && { ...x, value: x.value.slice(0, 96) }, b: y && { ...y, value: y.value.slice(0, 96) } });
      if (!x || !y || x.path !== y.path || x.kind !== y.kind) break; // the structures diverge: later leaves do not align
    }
  }
  return out;
};
