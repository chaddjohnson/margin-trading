// Parameter injection into an unmodified strategy file. The strategy files hard-code their parameters inside
// `runAllIn`, and several research programs read and rewrite those exact lines, so the files themselves are left
// alone. Instead, as the research parity copies do, a module is derived from the source by a fixed list of
// substitutions, each required to match exactly once:
// - each parameter's declaration (`const name = 74;` or `const name = nameOption ?? 0.216;`) reads an injected
//   value through `phenotypeValue`, which counts the read, so a run can prove that the strategy took every value;
// - the session load takes injected sessions (loaded once by the runner with the same loader), and
// - the arming guard also refuses sessions before the execution profile's first eligible date.
// With nothing injected the derived module behaves exactly as its source (tests/injection.test.ts). One module is
// derived per strategy source, never per phenotype; it lives in a git-ignored cache keyed by the source's hash
// and is regenerated whenever the source changes. No trading logic is copied by hand or edited.
import { createHash } from 'node:crypto';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import fs from 'fs-extra';
import type { BacktestPosition, MarketSession } from '#types';
import { PhenotypeError, architectureOf } from './architectures.ts';
import { type CompatibleStrategy, executionConstants, strategyFileOf } from './strategies.ts';

export const injectionVersion = 1;
export const cacheDir = '.cache/phenotype';

export interface InjectionState {
  values: Record<string, number>;
  sessions?: MarketSession[];
  firstEligibleTime: number;
  reads: Record<string, number>;
  eligibilityChecks: number;
}

export interface StrategyRunOptions {
  symbol: string;
  startDate?: string;
  endDate?: string;
  dataFile: string;
  outDir?: string;
  stopFill?: string;
}

// The part of a strategy file's `runAllIn` result the runner reads.
export interface StrategyResult {
  sessions: MarketSession[];
  positions: BacktestPosition[];
  entryFills: Map<BacktestPosition, { barIndex: number; time: number; price: number }>;
  exitFills: Map<BacktestPosition, { barIndex: number; time: number; price: number; reason: string }>;
  legs?: Map<
    BacktestPosition,
    { index: number; barIndex: number; entryTimestamp: number; investment: number; shares: number }[]
  >;
}

export interface InjectableModule {
  runAllIn: (options: StrategyRunOptions) => Promise<StrategyResult>;
  phenotypeInjection: InjectionState;
}

export interface DeclaredConstant {
  name: string;
  form: 'constant' | 'option'; // `const name = literal;` or `const name = nameOption ?? literal;`
  literal: number; // the file's own value
}

export interface Transformed {
  copy: string;
  injectable: Record<string, DeclaredConstant>;
  strategyConstants: Record<string, DeclaredConstant>;
}

const declarationPatterns = (name: string) => ({
  constant: new RegExp(`\\bconst ${name}(: number)? = (-?[0-9.]+);`, 'g'),
  option: new RegExp(`\\bconst ${name} = ${name}Option \\?\\? (-?[0-9.]+);`, 'g')
});

// The one declaration of a constant, in either form.
const findDeclaration = (source: string, name: string, file: string): DeclaredConstant => {
  const patterns = declarationPatterns(name);
  const constants = [...source.matchAll(patterns.constant)];
  const options = [...source.matchAll(patterns.option)];

  if (constants.length + options.length !== 1) {
    throw new PhenotypeError(
      `${file}: expected exactly one declaration of ${name} as \`const ${name} = <number>;\` or \`const ${name} = ${name}Option ?? <number>;\`, found ${constants.length + options.length}`
    );
  }

  return constants.length === 1
    ? { name, form: 'constant', literal: Number(constants[0]![2]) }
    : { name, form: 'option', literal: Number(options[0]![1]) };
};

const injectionDeclaration = (source: string, sourceHash: string) => `import fs from 'fs-extra';

// Derived from ${source} (sha256 ${sourceHash}) by src/phenotype/injection.ts for phenotype runs: the source
// with its parameters injectable. Do not edit; it is regenerated whenever the source changes.
export const phenotypeInjection: {
  values: Record<string, number>;
  sessions?: MarketSession[];
  firstEligibleTime: number;
  reads: Record<string, number>;
  eligibilityChecks: number;
} = { values: {}, firstEligibleTime: -Infinity, reads: {}, eligibilityChecks: 0 };

const phenotypeValue = (name: string, fallback: number): number => {
  phenotypeInjection.reads[name] = (phenotypeInjection.reads[name] ?? 0) + 1;

  return phenotypeInjection.values[name] ?? fallback;
};

const phenotypeIneligible = (time: number) => {
  phenotypeInjection.eligibilityChecks++;

  return time < phenotypeInjection.firstEligibleTime;
};`;

// The names a compatible strategy takes from a phenotype: the architecture's parameters it doesn't ignore.
export const appliedParametersOf = (entry: CompatibleStrategy) =>
  architectureOf(entry.architecture)
    .parameters.map((spec) => spec.name)
    .filter((name) => !(name in entry.ignorable));

// Derives the injectable source. `sourceDir` and `targetDir` re-anchor relative imports.
export const transformSource = (
  source: string,
  entry: CompatibleStrategy,
  { sourceDir, targetDir }: { sourceDir: string; targetDir: string }
): Transformed => {
  const file = strategyFileOf(entry.script);
  const sourceHash = createHash('sha256').update(source).digest('hex');
  let copy = source;
  const once = (from: string, to: string, label: string) => {
    const matches = copy.split(from).length - 1;

    if (matches !== 1) {
      throw new PhenotypeError(`${file}: expected exactly one ${label} (${JSON.stringify(from)}), found ${matches}`);
    }

    copy = copy.replace(from, () => to);
  };

  for (const reserved of ['phenotypeInjection', 'phenotypeValue', 'phenotypeIneligible']) {
    if (source.includes(reserved)) {
      throw new PhenotypeError(`${file} already uses the identifier ${reserved}`);
    }
  }

  const architecture = architectureOf(entry.architecture);

  for (const name of Object.keys(entry.ignorable)) {
    if (!architecture.parameters.some((spec) => spec.name === name)) {
      throw new PhenotypeError(`${entry.script}: ignorable ${name} is not a ${architecture.name} parameter`);
    }

    // An ignorable parameter must really be absent; a declared one would be silently left at the file's value.
    const patterns = declarationPatterns(name);

    if (source.match(patterns.constant) || source.match(patterns.option)) {
      throw new PhenotypeError(`${file} declares ${name}, so it can't be listed as ignorable`);
    }
  }

  const injectable: Record<string, DeclaredConstant> = {};

  for (const name of [...appliedParametersOf(entry), ...executionConstants]) {
    const declaration = findDeclaration(source, name, file);
    const patterns = declarationPatterns(name);

    injectable[name] = declaration;
    copy =
      declaration.form === 'constant'
        ? copy.replace(
            patterns.constant,
            (_match, annotation: string | undefined, literal: string) =>
              `const ${name}${annotation ?? ''} = phenotypeValue('${name}', ${literal});`
          )
        : copy.replace(
            patterns.option,
            (_match, literal: string) => `const ${name} = phenotypeValue('${name}', ${name}Option ?? ${literal});`
          );
  }

  const strategyConstants = Object.fromEntries(
    entry.strategyConstants.map((name) => [name, findDeclaration(source, name, file)])
  );

  once("import fs from 'fs-extra';", injectionDeclaration(file, sourceHash), 'fs-extra import');
  once(
    'const allSessions = groupMarketSessions(await loadCsvMinuteBacktestData(symbol, file));',
    'const allSessions = phenotypeInjection.sessions ?? groupMarketSessions(await loadCsvMinuteBacktestData(symbol, file));',
    'session load'
  );

  // The guard counts the warm-up sessions before the window too (src/lib/evaluation.ts).
  if (!entry.armingGuard.startsWith('if (warmup + index < tickWindowSize')) {
    throw new PhenotypeError(`${entry.script}: the arming guard must start with 'if (warmup + index < tickWindowSize'`);
  }

  once(
    entry.armingGuard,
    entry.armingGuard.replace('index < tickWindowSize', 'index < tickWindowSize || phenotypeIneligible(session.time)'),
    'arming guard'
  );

  // Relative imports resolve from the derived module's directory.
  copy = copy.replace(/(from\s+|import\s*\(\s*)(['"])(\.{1,2}\/[^'"]+)\2/g, (_match, prefix, quote, specifier) => {
    let relative = path.relative(targetDir, path.resolve(sourceDir, specifier)).split(path.sep).join('/');

    if (!relative.startsWith('.')) {
      relative = `./${relative}`;
    }

    return `${prefix}${quote}${relative}${quote}`;
  });

  return { copy, injectable, strategyConstants };
};

export interface PreparedStrategy extends Transformed {
  entry: CompatibleStrategy;
  file: string;
  sourceHash: string;
  target: string;
  module: InjectableModule;
}

// Derives (or reuses) the injectable module of a compatible strategy and imports it.
export const prepareStrategy = async (entry: CompatibleStrategy, root = process.cwd()): Promise<PreparedStrategy> => {
  const file = strategyFileOf(entry.script);
  const sourcePath = path.resolve(root, file);

  if (!(await fs.pathExists(sourcePath))) {
    throw new PhenotypeError(`Strategy file ${file} does not exist`);
  }

  const source = await fs.readFile(sourcePath, 'utf8');
  const sourceHash = createHash('sha256').update(source).digest('hex');
  const targetDir = path.resolve(root, cacheDir);
  const transformed = transformSource(source, entry, { sourceDir: path.dirname(sourcePath), targetDir });
  const key = createHash('sha256').update(`${injectionVersion}\n${transformed.copy}`).digest('hex').slice(0, 16);
  const target = path.join(targetDir, `${entry.script}.${key}.ts`);

  if (!(await fs.pathExists(target))) {
    await fs.ensureDir(targetDir);
    await fs.writeFile(path.join(targetDir, '.gitignore'), '*\n');

    // Write under a unique name and rename, so concurrent runs never import a partial file.
    const temporary = `${target}.${process.pid}.${Date.now()}.tmp`;

    await fs.writeFile(temporary, transformed.copy);
    await fs.rename(temporary, target);

    // Earlier derivations of this strategy are stale.
    for (const name of await fs.readdir(targetDir)) {
      if (name.startsWith(`${entry.script}.`) && name.endsWith('.ts') && path.join(targetDir, name) !== target) {
        const stale = name.slice(entry.script.length + 1, -3);

        if (/^[0-9a-f]{16}$/.test(stale)) {
          await fs.remove(path.join(targetDir, name));
        }
      }
    }
  }

  const module = (await import(pathToFileURL(target).href)) as InjectableModule;

  if (typeof module.runAllIn !== 'function' || typeof module.phenotypeInjection !== 'object') {
    throw new PhenotypeError(`${target} does not export runAllIn and phenotypeInjection`);
  }

  return { ...transformed, entry, file, sourceHash, target, module };
};
