// The transitive source closure of a set of entry files (review M1): relative specifiers of static imports, re-exports
// and dynamic imports, plus the package's subpath imports (`#lib` → src/lib/index.ts, `#types` → src/types/index.ts,
// package.json `imports`), followed through their own re-exports. Used for the point-cache engine hash (engine.ts) and
// the integrity pins (integrity.ts), so a change anywhere in the loader, the engine or the study code is detected.
import path from 'node:path';
import fs from 'fs-extra';

const subpath: Record<string, string> = { '#lib': 'src/lib/index.ts', '#types': 'src/types/index.ts' };
const specifier = /(?:from\s+|import\s*\(\s*)'(\.{1,2}\/[^']+|#lib|#types)'/g;

export const sourceClosure = (entries: readonly string[]) => {
  const seen = new Set<string>(entries);
  const queue = [...entries];

  while (queue.length) {
    const file = queue.shift()!;

    for (const match of fs.readFileSync(file, 'utf8').matchAll(specifier)) {
      const spec = match[1]!;
      const target = subpath[spec] ?? path.normalize(path.join(path.dirname(file), spec));

      if (!target.endsWith('.ts') || seen.has(target)) continue;
      if (!fs.existsSync(target)) throw new Error(`source closure: ${file} imports ${target}, which does not exist`);

      seen.add(target);
      queue.push(target);
    }
  }

  return [...seen].sort();
};
