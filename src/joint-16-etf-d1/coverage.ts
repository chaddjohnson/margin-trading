// Exploration coverage of the training search (PROTOCOL.md §6, SEARCH_COVERAGE.md): how often each of the 16 ETFs was
// a member of an evaluated subset, with how many distinct vectors, in which cardinalities and from which sources, and
// how far each reached (feasible, the archive's Pareto front, the shortlist, the nominations).
import { fastNonDominatedSort } from '../optimizer/nsga2.ts';
import { type Entry, feasible, scoredOf } from './archive.ts';
import { universe } from './context.ts';

export const coverageOf = (
  entries: readonly Entry[],
  shortlisted: readonly string[][] = [],
  nominated: readonly string[][] = []
) => {
  const feasibleEntries = entries.filter(feasible);
  const front = new Set(fastNonDominatedSort(feasibleEntries.map(scoredOf))[0]?.map((item) => item.id) ?? []);
  const cardinality = Array.from({ length: universe.length + 1 }, () => ({ all: 0, feasible: 0 }));
  const sources: Record<string, { evaluations: number; feasible: number }> = {};
  const operators: Record<string, number> = {};
  const behaviours = new Set<string>();
  let withInert = 0;

  for (const entry of entries) {
    cardinality[entry.e.books]!.all++;
    behaviours.add(entry.e.behaviourKey);

    const source = entry.source.startsWith('greedy:') ? 'greedy' : entry.source;

    sources[source] ??= { evaluations: 0, feasible: 0 };
    sources[source]!.evaluations++;
    operators[`${entry.stage}:${entry.operator.split(' ')[0]}`] =
      (operators[`${entry.stage}:${entry.operator.split(' ')[0]}`] ?? 0) + 1;

    if (feasible(entry)) {
      cardinality[entry.e.books]!.feasible++;
      sources[source]!.feasible++;
    }

    if (entry.e.inertBooks > 0) {
      withInert++;
    }
  }

  const perEtf = universe.map((symbol) => {
    const member = entries.filter((entry) => entry.e.members.includes(symbol));
    const vectors = new Set(member.map((entry) => entry.config.find((book) => book.symbol === symbol)!.id));
    const libraryVectors = new Set(
      member
        .map((entry) => entry.config.find((book) => book.symbol === symbol)!)
        .filter((book) => book.origin.startsWith('sobol:') || book.origin.startsWith('control:'))
        .map((book) => book.id)
    );

    return {
      symbol,
      appearances: member.length,
      appearancesFeasible: member.filter(feasible).length,
      onParetoFront: member.filter((entry) => front.has(entry.key)).length,
      distinctVectors: vectors.size,
      distinctLibraryVectors: libraryVectors.size,
      fundedLotsTotal: member.reduce((total, entry) => total + (entry.e.lotsBySymbol[symbol] ?? 0), 0),
      appearancesWithFundedLot: member.filter((entry) => (entry.e.lotsBySymbol[symbol] ?? 0) > 0).length,
      singletons: member.filter((entry) => entry.e.books === 1).length,
      shortlisted: shortlisted.filter((members) => members.includes(symbol)).length,
      nominated: nominated.filter((members) => members.includes(symbol)).length
    };
  });

  return {
    evaluations: entries.length,
    feasible: feasibleEntries.length,
    behaviourallyDistinct: behaviours.size,
    withInertMember: withInert,
    paretoFront: front.size,
    cardinality: cardinality.map((row, books) => ({ books, ...row })).slice(1),
    sources,
    operators,
    perEtf
  };
};
