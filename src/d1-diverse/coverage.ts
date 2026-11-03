// The coverage contracts of PROTOCOL.md §9.5, computed from the unique configurations of one arm's archive (cache
// hits never count: an archive holds each key once). Per symbol: configurations containing it, distinct vectors on
// it, configurations per size band, distinct co-members, co-occurrences with each category; per arm: the protected
// coverage examples. A band whose minimum exceeds the universe size is unattainable and waived (synthetic universes
// only); the co-member contract is min(55, |U| − 1). The report also carries the descriptive per-symbol funnel counts.
import { type ArmClass, categories, categoryOf, study } from './context.ts';

export interface CoverageItem {
  members: readonly string[];
  vectorBySymbol: Readonly<Record<string, string>>; // symbol → grid key
  behaviour?: string; // the configuration's behaviour key (descriptive: identical traces count once)
}

export const sizeBandOf = (books: number) => {
  for (const band of [...study.schedule.bands].reverse()) {
    if (books >= band.minBooks) {
      return band.key;
    }
  }

  throw new Error(`No size band for ${books} books`);
};

export interface SymbolCoverage {
  configurations: number;
  vectors: number;
  bands: Record<string, number>;
  coMembers: number;
  categories: Record<string, number>; // configurations with ≥ 1 OTHER member of the category
  behaviours: number; // distinct behaviour keys among its configurations (descriptive)
  topPartner: string; // its most frequent co-member and that co-member's share of its configurations (descriptive)
  topPartnerShare: number;
}

export interface ContractCheck {
  name: string;
  symbol?: string;
  required: number;
  actual: number;
  pass: boolean;
}

export interface CoverageReport {
  armClass: ArmClass;
  configurations: number;
  symbols: Record<string, SymbolCoverage>;
  protectedExamples: Record<string, number>;
  cells: Record<string, number>; // configurations by size band × B5-free or not × category present (descriptive)
  checks: ContractCheck[];
  failures: ContractCheck[];
  pass: boolean;
}

export const coverageOf = (
  items: readonly CoverageItem[],
  universe: readonly string[],
  armClass: ArmClass
): CoverageReport => {
  const symbols: Record<string, SymbolCoverage> = {};
  const vectorSets = new Map<string, Set<string>>();
  const partnerSets = new Map<string, Set<string>>();
  const behaviourSets = new Map<string, Set<string>>();
  const partnerCounts = new Map<string, Map<string, number>>();
  const cells: Record<string, number> = {};

  for (const symbol of universe) {
    symbols[symbol] = {
      configurations: 0,
      vectors: 0,
      bands: Object.fromEntries(study.schedule.bands.map((band) => [band.key, 0])),
      coMembers: 0,
      categories: Object.fromEntries(categories.map((category) => [category, 0])),
      behaviours: 0,
      topPartner: '',
      topPartnerShare: 0
    };
    vectorSets.set(symbol, new Set());
    partnerSets.set(symbol, new Set());
    behaviourSets.set(symbol, new Set());
    partnerCounts.set(symbol, new Map());
  }

  const b5 = new Set<string>(study.b5Members);
  const protectedExamples = { b5Free: 0, withVgt: 0, withoutVgt: 0, withGdx: 0, withoutGdx: 0 };

  for (const item of items) {
    const band = sizeBandOf(item.members.length);
    const present = new Set(item.members);

    for (const symbol of item.members) {
      const record = symbols[symbol];

      if (!record) {
        throw new Error(`${symbol} is not in the universe`);
      }

      record.configurations++;
      record.bands[band]!++;
      vectorSets.get(symbol)!.add(item.vectorBySymbol[symbol]!);

      const seen = new Set<string>();

      if (item.behaviour) {
        behaviourSets.get(symbol)!.add(item.behaviour);
      }

      for (const other of item.members) {
        if (other !== symbol) {
          partnerSets.get(symbol)!.add(other);
          partnerCounts.get(symbol)!.set(other, (partnerCounts.get(symbol)!.get(other) ?? 0) + 1);
          seen.add(categoryOf[other] ?? 'none');
        }
      }

      for (const category of seen) {
        if (category in record.categories) {
          record.categories[category]!++;
        }
      }
    }

    const b5Free = !item.members.some((symbol) => b5.has(symbol));

    if (b5Free) {
      protectedExamples.b5Free++;
    }

    for (const category of new Set(item.members.map((symbol) => categoryOf[symbol] ?? 'none'))) {
      const cell = `${band}|${b5Free ? 'B5-free' : 'with-B5'}|${category}`;

      cells[cell] = (cells[cell] ?? 0) + 1;
    }

    protectedExamples[present.has('VGT') ? 'withVgt' : 'withoutVgt']++;
    protectedExamples[present.has('GDX') ? 'withGdx' : 'withoutGdx']++;
  }

  for (const symbol of universe) {
    symbols[symbol]!.vectors = vectorSets.get(symbol)!.size;
    symbols[symbol]!.coMembers = partnerSets.get(symbol)!.size;
    symbols[symbol]!.behaviours = behaviourSets.get(symbol)!.size;

    const top = [...partnerCounts.get(symbol)!.entries()].sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1))[0];

    if (top) {
      symbols[symbol]!.topPartner = top[0];
      symbols[symbol]!.topPartnerShare = top[1] / Math.max(1, symbols[symbol]!.configurations);
    }
  }

  const contract = study.coverage;
  const checks: ContractCheck[] = [];
  const check = (name: string, required: number, actual: number, symbol?: string) =>
    checks.push({ name, ...(symbol ? { symbol } : {}), required, actual, pass: actual >= required });
  const coMembersRequired = Math.min(contract.coMembers, universe.length - 1);
  const presentCategories = new Set(universe.map((symbol) => categoryOf[symbol] ?? 'none'));

  for (const symbol of universe) {
    const record = symbols[symbol]!;

    check('configurations', contract.configurations[armClass], record.configurations, symbol);
    check('vectors', contract.vectors[armClass], record.vectors, symbol);

    for (const band of study.schedule.bands) {
      if (band.minBooks <= universe.length) {
        check(`band ${band.key}`, contract.bandMinimum[band.key]!, record.bands[band.key]!, symbol);
      }
    }

    check('co-members', coMembersRequired, record.coMembers, symbol);

    for (const category of categories) {
      // a category is checked only if it holds a symbol other than this one
      const others = universe.filter((other) => other !== symbol && categoryOf[other] === category).length;

      if (presentCategories.has(category) && others > 0) {
        check(`category ${category}`, contract.categoryCoOccurrence, record.categories[category]!, symbol);
      }
    }
  }

  // The protected examples are checked only when the universe holds the symbols they name.
  const has = (symbol: string) => universe.includes(symbol);

  if ([...b5].some((symbol) => has(symbol))) {
    check('B5-free configurations', contract.protectedExamples.b5Free, protectedExamples.b5Free);
  }

  if (has('VGT')) {
    check('with VGT', contract.protectedExamples.withVgt, protectedExamples.withVgt);
    check('without VGT', contract.protectedExamples.withoutVgt, protectedExamples.withoutVgt);
  }

  if (has('GDX')) {
    check('with GDX', contract.protectedExamples.withGdx, protectedExamples.withGdx);
    check('without GDX', contract.protectedExamples.withoutGdx, protectedExamples.withoutGdx);
  }

  const failures = checks.filter((item) => !item.pass);

  return {
    armClass,
    configurations: items.length,
    symbols,
    protectedExamples,
    cells,
    checks,
    failures,
    pass: failures.length === 0
  };
};

// Refuses (throws) unless every contract of every given report passed: called before any nomination.
export const requireCoverage = (
  reports: readonly { label: string; report: Pick<CoverageReport, 'pass' | 'failures'> }[]
) => {
  const failed = reports.filter((item) => !item.report.pass);

  if (failed.length > 0) {
    throw new Error(
      `Coverage contracts failed (no nomination is allowed): ${failed
        .map(
          (item) =>
            `${item.label}: ${item.report.failures
              .slice(0, 5)
              .map(
                (failure) =>
                  `${failure.name}${failure.symbol ? ` ${failure.symbol}` : ''} ${failure.actual}/${failure.required}`
              )
              .join(', ')}`
        )
        .join('; ')}`
    );
  }
};
