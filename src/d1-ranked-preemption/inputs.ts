// A window's sealed Stage A and Stage B outputs as the later stages read them (PROTOCOL.md §7–§10): the screening
// statuses, every symbol's representative and library as search-view books, the two frozen rankings (re-verified
// here, before every stage that uses them), the Stage D universe (survivors ∪ reserve) and the C assembly.
import { type RankingKey, type WindowKey, rankingKeys, study } from './context.ts';
import type { Book } from './evaluate.ts';
import { readSealed } from './freeze.ts';
import { type RankingFile, rankingFile } from './ranking.ts';
import { vectorOf } from './space.ts';
import { stageAFile } from './standalone.ts';
import type { Allocation } from './allocation.ts';
import { allocationOf, resolvePriority } from './allocation.ts';

interface StageASymbolRecord {
  status: 'survivor' | 'screened-down' | 'reserve' | 'rejected';
  uncertain: boolean;
  sample: string;
  idleShare: number;
  representative: {
    credible: boolean;
    grid: Book['vector']['grid'];
    candidateId: string;
    metrics: Record<string, number>;
    neighbourhoodMedian: number | null;
    phenotypeFile: string;
  } | null;
  library: { role: string; candidateId: string; grid: Book['vector']['grid'] }[];
}

export interface WindowInputs {
  window: WindowKey;
  stageA: { bodyHash: string; symbols: Record<string, StageASymbolRecord>; minTrades: number };
  rankings: Record<RankingKey, RankingFile>;
  survivors: string[];
  reserve: string[];
  universe: string[]; // the Stage D universe, alphabetically
  representative: Record<string, Book>;
  library: Record<string, Book[]>;
}

export const readWindowInputs = async (window: WindowKey): Promise<WindowInputs> => {
  const stageA = await readSealed<WindowInputs['stageA'] & { bodyHash: string; [key: string]: unknown }>(
    stageAFile(window)
  );
  const rankings = {} as Record<RankingKey, RankingFile>;

  for (const key of rankingKeys) {
    const ranking = await readSealed<RankingFile>(rankingFile(window, key));

    if (ranking.window !== window || ranking.metric !== key) {
      throw new Error(`${rankingFile(window, key)} is not the ${window} ${key} ranking`);
    }

    if ((ranking.stageA as { bodyHash: string }).bodyHash !== stageA.bodyHash) {
      throw new Error(`${rankingFile(window, key)} was not derived from the sealed Stage A record`);
    }

    rankings[key] = ranking;
  }

  const symbols = Object.keys(stageA.symbols).sort();
  const survivors = symbols.filter((symbol) => stageA.symbols[symbol]!.status === 'survivor');
  const reserve = symbols.filter((symbol) => stageA.symbols[symbol]!.status === 'reserve');
  const representative: Record<string, Book> = {};
  const library: Record<string, Book[]> = {};

  for (const symbol of symbols) {
    const record = stageA.symbols[symbol]!;

    if (record.representative) {
      representative[symbol] = {
        symbol,
        vector: vectorOf(record.representative.grid, `standalone:${window}:${symbol}:representative`)
      };
    }

    library[symbol] = record.library.map((entry) => ({
      symbol,
      vector: vectorOf(entry.grid, `standalone:${window}:${symbol}:${entry.role}`)
    }));
  }

  return {
    window,
    stageA,
    rankings,
    survivors,
    reserve,
    universe: [...survivors, ...reserve].sort(),
    representative,
    library
  };
};

// C_Rk: the top survivors in the ranking's order, each with its representative (PROTOCOL.md §10).
export const assemblyC = (inputs: WindowInputs, key: RankingKey): Book[] =>
  inputs.rankings[key].order
    .filter((symbol) => inputs.survivors.includes(symbol))
    .slice(0, study.assembly.topK)
    .map((symbol) => inputs.representative[symbol]!);

// The frozen ranking of a window restricted to a pool's members, as a P1 (or another policy's) allocation.
export const allocationFor = (
  inputs: WindowInputs,
  key: RankingKey,
  members: readonly string[],
  policy: 'P0' | 'P0R' | 'P1' | 'P1-B250' | 'P1-B500' = 'P1'
): Allocation =>
  policy === 'P0'
    ? allocationOf('P0')
    : allocationOf(
        policy,
        resolvePriority(
          `${inputs.window}/${key}#${inputs.rankings[key].bodyHash.slice(0, 16)}`,
          inputs.rankings[key].order,
          members,
          Object.fromEntries(inputs.rankings[key].entries.map((entry) => [entry.symbol, entry.score]))
        )
      );
