// The candidate registry (PROTOCOL.md §4): every one of the 61 audited ETFs under each view, from the sealed source
// records only (read-only), and the incumbents from their pool configs through the pools loader (the exact phenotypes
// `npm run pools` runs). Nothing here chooses a vector: View U is the registered VGT primary vector, View P is the
// source's sealed fold representative where its status is `survivor`, View I is B4/B5 as configured.
import { createHash } from 'node:crypto';
import fs from 'fs-extra';
import { paramsOf, shortLabel } from '../multi-etf-allocator/phenotypes.ts';
import type { BookPhenotype } from '../portfolio-aware-d1/nbook/engine.ts';
import type { Grid } from '../portfolio-aware-d1/phenotypes.ts';
import { loadPool } from '../pools/load.ts';
import { type BaselineKey, type SourceFold, type ViewKey, readJson, source, study, vgtPrimaryGrid } from './context.ts';
import { readUniverseRecord } from './doors.ts';

export type { Grid };

export const paramOrder = [
  'targetPercentChange',
  'trailingBuyPercentage',
  'trailingStopPercentage',
  'maximumHoldDays',
  'tickWindowSize',
  'intradayLossBuffer',
  'pullback',
  'continuationWindow'
] as const;

export const gridKeyOf = (grid: Grid) => paramOrder.map((key) => grid[key]).join('.');

export const sha256File = async (file: string) =>
  createHash('sha256')
    .update(await fs.readFile(file))
    .digest('hex');

// A book of this study: a symbol and an eight-parameter grid, converted exactly as the registry and the completed
// audits convert it (src/multi-etf-allocator/phenotypes.ts paramsOf).
export const bookOf = (symbol: string, name: string, grid: Grid): BookPhenotype => ({
  symbol,
  name,
  params: paramsOf(symbol, name, grid),
  short: shortLabel(grid)
});

export interface ViewMember {
  view: ViewKey;
  symbol: string;
  status: 'registered' | 'period-correct' | 'in-sample context' | 'no nominee';
  sourceStatus: string; // the source's own status (survivor, screened-down, rejected, …) or 'n/a'
  grid?: Grid;
  gridKey?: string;
  candidateId?: string;
  phenotypeFile?: string;
  phenotypeSha256?: string;
  cap: string;
  provenance: string;
  reason?: string; // why a row has no vector
}

const foldOfView: Record<'P-A' | 'P-B' | 'P-F', SourceFold> = { 'P-A': 'fold-a', 'P-B': 'fold-b', 'P-F': 'final' };

interface StandaloneProfile {
  symbol: string;
  window: string;
  status: string;
  uncertain: boolean;
  sample: string;
  representative?: {
    credible: boolean;
    candidateId: string;
    grid: Grid;
    phenotypeFile: string;
    phenotypeSha256: string;
  };
}

interface SelectionFile {
  selections: {
    ARCH: Record<string, { a0: { status: string; representative: string | null; nominee: string | null } }>;
  };
}

interface CensusFile {
  rows: { symbol: string; sealed: { status: string; representative: string | null } }[];
}

const capOf = (view: ViewKey) => (view === 'P-A' ? '2021-12-31' : study.researchCap);

// The members of one view, one row per audited symbol (61 rows, NA rows included).
export const viewMembers = async (view: ViewKey): Promise<ViewMember[]> => {
  const universe = await readUniverseRecord();
  const symbols = [...universe.eligible].sort();

  if (view === 'U') {
    return symbols.map((symbol) => ({
      view,
      symbol,
      status: 'registered',
      sourceStatus: 'n/a',
      grid: { ...vgtPrimaryGrid },
      gridKey: gridKeyOf({ ...vgtPrimaryGrid }),
      candidateId: 'd1-ebc9f639b3',
      phenotypeFile: source.vgtPhenotype,
      cap: capOf(view),
      provenance: 'registered VGT primary vector applied unchanged (descriptive counterfactual)'
    }));
  }

  const fold = foldOfView[view];
  const crossCheck = new Map<string, { status: string; nominee: string | null; representative: string | null }>();

  if (fold === 'fold-a' || fold === 'fold-b') {
    const selection = await readJson<SelectionFile>(source.studyOneSelection(fold === 'fold-a' ? 'A' : 'B'));

    for (const [symbol, row] of Object.entries(selection.selections.ARCH)) {
      crossCheck.set(symbol, { ...row.a0 });
    }
  } else {
    const census = await readJson<CensusFile>(
      'research/d1-wide-library-chronological-selection/results/archive/final/CENSUS.json'
    );

    for (const row of census.rows) {
      crossCheck.set(row.symbol, {
        status: row.sealed.status,
        nominee: row.sealed.status === 'survivor' ? row.sealed.representative : null,
        representative: row.sealed.representative
      });
    }
  }

  const rows: ViewMember[] = [];

  for (const symbol of symbols) {
    const file = source.standalone(fold, symbol);
    const profile = await readJson<StandaloneProfile>(file);
    const check = crossCheck.get(symbol);

    if (profile.symbol !== symbol || profile.window !== fold) {
      throw new Error(`${file}: symbol/window mismatch`);
    }

    if (!check || check.status !== profile.status) {
      throw new Error(`${symbol} ${fold}: the source status ${profile.status} differs from Study 1's ${check?.status}`);
    }

    const survivor = profile.status === 'survivor' && profile.representative?.credible === true;

    if (!survivor) {
      if (check.nominee) {
        throw new Error(`${symbol} ${fold}: Study 1 names a nominee where the source has status ${profile.status}`);
      }

      rows.push({
        view,
        symbol,
        status: 'no nominee',
        sourceStatus: profile.status,
        cap: capOf(view),
        provenance: `${file} (status ${profile.status})`,
        reason: `the sealed ${fold} status is "${profile.status}": no nominee; not substituted`
      });
      continue;
    }

    const grid = profile.representative!.grid;
    const key = gridKeyOf(grid);

    if (check.nominee !== key) {
      throw new Error(`${symbol} ${fold}: the source representative ${key} differs from Study 1's A0 ${check.nominee}`);
    }

    const sha = await sha256File(profile.representative!.phenotypeFile);

    if (sha !== profile.representative!.phenotypeSha256) {
      throw new Error(`${profile.representative!.phenotypeFile}: sha256 differs from the sealed profile`);
    }

    rows.push({
      view,
      symbol,
      status: view === 'P-F' ? 'in-sample context' : 'period-correct',
      sourceStatus: `${profile.status}${profile.uncertain ? ' (uncertain)' : ''}, sample ${profile.sample}`,
      grid: { ...grid },
      gridKey: key,
      candidateId: profile.representative!.candidateId,
      phenotypeFile: profile.representative!.phenotypeFile,
      phenotypeSha256: sha,
      cap: capOf(view),
      provenance: `${file}; = Study 1 A0 ${fold === 'final' ? '(final census)' : fold}`
    });
  }

  return rows;
};

export const viewBooks = (rows: readonly ViewMember[]) =>
  rows
    .filter((row) => row.grid)
    .map((row) => ({ row, book: bookOf(row.symbol, `${row.view}:${row.gridKey}`, row.grid!) }));

// The incumbents exactly as the pools CLI runs them.
export const incumbentBooks = async (id: BaselineKey) => {
  const pool = await loadPool(id);

  return { pool, phenotypes: pool.phenotypes, symbols: pool.config.books.map((book) => book.symbol) };
};

// The source's frozen R2 ranking of a fold (training-only net per occupied day), in rank order.
export const rankingOrder = async (fold: SourceFold, metric: 'R1' | 'R2' = 'R2') => {
  const ranking = await readJson<{ order: string[]; entries: { symbol: string; status: string; position: number }[] }>(
    source.ranking(fold, metric)
  );

  return ranking.entries.map((entry) => ({ symbol: entry.symbol, status: entry.status, position: entry.position }));
};
