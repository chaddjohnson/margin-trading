// Exact structural comparison of two run results: every number must be identical (NaN equals NaN, +0 equals −0),
// every string and boolean equal, arrays of the same length. Object links that would recurse (a lot's virtual trade,
// a signal's trade) are compared by identity fields only. Returns the first differences found, with their paths.
export interface CompareOptions {
  ignore?: ReadonlySet<string>; // property names never compared
  links?: ReadonlySet<string>; // property names compared by their `symbol` and `id` only
  maxDifferences?: number;
}

const defaultLinks = new Set(['trade']);

export const compareValues = (a: unknown, b: unknown, options: CompareOptions = {}, path = ''): string[] => {
  const differences: string[] = [];
  const max = options.maxDifferences ?? 20;
  const ignore = options.ignore ?? new Set<string>();
  const links = options.links ?? defaultLinks;

  const visit = (x: unknown, y: unknown, at: string) => {
    if (differences.length >= max) {
      return;
    }

    if (typeof x === 'number' && typeof y === 'number') {
      if (!(x === y || (Number.isNaN(x) && Number.isNaN(y)))) {
        differences.push(`${at}: ${x} vs ${y}`);
      }

      return;
    }

    if (x === null || y === null || typeof x !== 'object' || typeof y !== 'object') {
      if (x !== y) {
        differences.push(`${at}: ${String(x)} vs ${String(y)}`);
      }

      return;
    }

    if (ArrayBuffer.isView(x) || ArrayBuffer.isView(y)) {
      const left = x as unknown as ArrayLike<number>;
      const right = y as unknown as ArrayLike<number>;

      if (!ArrayBuffer.isView(x) || !ArrayBuffer.isView(y) || left.length !== right.length) {
        differences.push(`${at}: typed arrays of different kinds or lengths`);
        return;
      }

      for (let index = 0; index < left.length && differences.length < max; index++) {
        const a = left[index]!;
        const b = right[index]!;

        if (!(a === b || (Number.isNaN(a) && Number.isNaN(b)))) {
          differences.push(`${at}[${index}]: ${a} vs ${b}`);
        }
      }

      return;
    }

    if (Array.isArray(x) || Array.isArray(y)) {
      if (!Array.isArray(x) || !Array.isArray(y)) {
        differences.push(`${at}: array vs non-array`);
        return;
      }

      if (x.length !== y.length) {
        differences.push(`${at}: length ${x.length} vs ${y.length}`);
      }

      for (let index = 0; index < Math.min(x.length, y.length); index++) {
        visit(x[index], y[index], `${at}[${index}]`);
      }

      return;
    }

    if (x instanceof Set || y instanceof Set) {
      visit([...(x as Set<unknown>)].sort(), [...(y as Set<unknown>)].sort(), at);
      return;
    }

    const keys = new Set([...Object.keys(x), ...Object.keys(y)]);

    for (const key of keys) {
      if (ignore.has(key)) {
        continue;
      }

      const left = (x as Record<string, unknown>)[key];
      const right = (y as Record<string, unknown>)[key];

      if (links.has(key) && left && right && typeof left === 'object' && typeof right === 'object') {
        const l = left as { symbol?: unknown; id?: unknown };
        const r = right as { symbol?: unknown; id?: unknown };

        if (l.symbol !== r.symbol || l.id !== r.id) {
          differences.push(`${at}.${key}: ${String(l.symbol)}#${String(l.id)} vs ${String(r.symbol)}#${String(r.id)}`);
        }

        continue;
      }

      if (!(key in x) || !(key in y)) {
        // A key absent on one side counts only when the other side holds something other than undefined.
        if (left !== undefined || right !== undefined) {
          differences.push(`${at}.${key}: ${key in x ? 'present' : 'absent'} vs ${key in y ? 'present' : 'absent'}`);
        }

        continue;
      }

      visit(left, right, `${at}.${key}`);
    }
  };

  visit(a, b, path || '$');

  return differences;
};

// A run result without its configuration and universe (inputs, not outputs), for comparing outputs only.
export const outputsOf = <T extends { config: unknown; universe: unknown }>(result: T) => {
  const copy: Partial<T> = { ...result };

  delete copy.config;
  delete copy.universe;

  return copy;
};
