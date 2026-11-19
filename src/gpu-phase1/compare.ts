// Bit-exact structural comparison for the parity gates (PROTOCOL.md §12 G2–G5): numbers by Object.is (NaN equals NaN,
// +0 differs from −0, every finite value must be the identical double), typed arrays element by element, arrays and
// objects field by field with the same key order. Zero tolerance: a difference is reported, never absorbed.
export interface Diff {
  path: string;
  cpu: unknown;
  gpu: unknown;
  ulps?: string; // for doubles: the difference in units in the last place
}

const ulpDistance = (a: number, b: number) => {
  const f = new Float64Array([a, b]);
  const i = new BigInt64Array(f.buffer);
  const x = i[0]! < 0n ? -(i[0]! & 0x7fffffffffffffffn) : i[0]!;
  const y = i[1]! < 0n ? -(i[1]! & 0x7fffffffffffffffn) : i[1]!;
  const d = x > y ? x - y : y - x;

  return d.toString();
};

export const deepDiff = (cpu: unknown, gpu: unknown, path = '$', out: Diff[] = [], limit = 40): Diff[] => {
  if (out.length >= limit) return out;

  if (typeof cpu === 'number' && typeof gpu === 'number') {
    if (!Object.is(cpu, gpu)) out.push({ path, cpu, gpu, ...(Number.isFinite(cpu) && Number.isFinite(gpu) ? { ulps: ulpDistance(cpu, gpu) } : {}) });
    return out;
  }

  if (ArrayBuffer.isView(cpu) && ArrayBuffer.isView(gpu)) {
    const a = cpu as unknown as ArrayLike<number>;
    const b = gpu as unknown as ArrayLike<number>;

    if (cpu.constructor !== gpu.constructor) out.push({ path: `${path}<type>`, cpu: cpu.constructor.name, gpu: gpu.constructor.name });
    if (a.length !== b.length) out.push({ path: `${path}.length`, cpu: a.length, gpu: b.length });
    for (let i = 0; i < Math.min(a.length, b.length) && out.length < limit; i++) if (!Object.is(a[i], b[i])) deepDiff(a[i], b[i], `${path}[${i}]`, out, limit);
    return out;
  }

  if (Array.isArray(cpu) && Array.isArray(gpu)) {
    if (cpu.length !== gpu.length) out.push({ path: `${path}.length`, cpu: cpu.length, gpu: gpu.length });
    for (let i = 0; i < Math.min(cpu.length, gpu.length) && out.length < limit; i++) deepDiff(cpu[i], gpu[i], `${path}[${i}]`, out, limit);
    return out;
  }

  if (cpu && gpu && typeof cpu === 'object' && typeof gpu === 'object') {
    const ka = Object.keys(cpu);
    const kb = Object.keys(gpu);

    if (ka.join(',') !== kb.join(',')) out.push({ path: `${path}<keys>`, cpu: ka.join(','), gpu: kb.join(',') });
    for (const k of ka) if (k in (gpu as object)) deepDiff((cpu as Record<string, unknown>)[k], (gpu as Record<string, unknown>)[k], `${path}.${k}`, out, limit);
    return out;
  }

  if (!Object.is(cpu, gpu)) out.push({ path, cpu, gpu });
  return out;
};
