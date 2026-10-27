// Pre-freeze, outcome-free records bound by the protocol freeze (PROTOCOL.md §6–§7):
//
//   catalog   every audited ETF's (and VOOG's) episode catalog and families from daily closes through 2023-12-29 —
//             price data only, no strategy — with the share of eligible sessions inside an episode span and the
//             realised volatility of daily close-to-close log returns; the analysis must reproduce it exactly;
//   designs   every phenotype's OAT points and 128 joint vectors (and their relative shifts), with each ETF's
//             volatility, so the perturbation sizes are visible before any result.
import fs from 'fs-extra';
import { d1Keys } from '../multi-etf-allocator/phenotypes.ts';
import { jsonReplacer, log, protocolFreezeFile, resultDir } from './context.ts';
import { candidateUniverse } from './data.ts';
import { catalogOf, coverageOf, familiesOf } from './events.ts';
import { loadPhenotypes, stageCSymbols } from './batch.ts';
import { jointDesignOf, oatPointsOf } from './specs.ts';

export const catalogFile = resultDir('catalog', 'catalog.json');
export const designsFile = resultDir('designs', 'designs.json');

export const realisedVolatility = (closes: ArrayLike<number>, first: number, last: number) => {
  const returns: number[] = [];

  for (let s = first + 1; s <= last; s++) {
    returns.push(Math.log(closes[s]! / closes[s - 1]!));
  }

  const mean = returns.reduce((total, value) => total + value, 0) / returns.length;
  const variance = returns.reduce((total, value) => total + (value - mean) ** 2, 0) / (returns.length - 1);

  return Math.sqrt(variance * 252);
};

export const buildCatalogs = async () => {
  const phenotypes = await loadPhenotypes();
  const symbols = [...new Set([...phenotypes.map((phenotype) => phenotype.symbol), 'VOOG'])].sort();
  const { universe, door } = await candidateUniverse(stageCSymbols(phenotypes));
  const last = universe.dates.length - 1;
  const arming = universe.eligibilityIndex;

  return {
    door,
    symbols: Object.fromEntries(
      symbols.map((symbol) => {
        const closes = universe.instruments[symbol]!.ds.sClose;
        const catalog = catalogOf(symbol, universe.dates, closes, arming, last);
        const eligible = catalog.filter((episode) => episode.eligible);
        const families = familiesOf(catalog, closes);

        return [
          symbol,
          {
            volatility: realisedVolatility(closes, 0, last),
            coverage: coverageOf(catalog, arming, last),
            episodes: catalog,
            families,
            counts: {
              episodes: catalog.length,
              eligible: eligible.length,
              major: eligible.filter((episode) => episode.major).length,
              families: families.length,
              eligibleFamilies: families.filter((family) => family.eligible).length,
              eligibleMajorFamilies: families.filter((family) => family.eligible && family.major).length
            }
          }
        ];
      })
    )
  };
};

export const writeCatalogsAndDesigns = async () => {
  if (await fs.pathExists(protocolFreezeFile)) {
    throw new Error('the catalog and designs are written before the freeze, which binds them');
  }

  const catalogs = await buildCatalogs();
  const phenotypes = await loadPhenotypes();
  const designs = phenotypes.map((phenotype) => ({
    id: phenotype.id,
    symbol: phenotype.symbol,
    grid: phenotype.grid,
    volatility: catalogs.symbols[phenotype.symbol]!.volatility,
    oat: oatPointsOf(phenotype),
    joint: [1, 2].flatMap((seed) =>
      jointDesignOf(phenotype, seed).samples.map((grid, sample) => ({
        seed,
        sample,
        grid,
        relativeShift: Object.fromEntries(
          d1Keys.map((key) => [
            key,
            phenotype.grid[key] !== 0 ? (grid[key] - phenotype.grid[key]) / phenotype.grid[key] : NaN
          ])
        )
      }))
    )
  }));

  await fs.outputFile(
    catalogFile,
    `${JSON.stringify({ schema: 'd1-standalone-opportunity-catalog', ...catalogs }, jsonReplacer, 1)}\n`
  );
  await fs.outputFile(
    designsFile,
    `${JSON.stringify({ schema: 'd1-standalone-opportunity-designs', designs }, jsonReplacer, 1)}\n`
  );

  for (const [symbol, record] of Object.entries(catalogs.symbols)) {
    log(
      `catalog ${symbol}: ${record.counts.eligible} eligible episodes (${record.counts.major} major), ${record.counts.eligibleFamilies} families (${record.counts.eligibleMajorFamilies} major); coverage ${(record.coverage * 100).toFixed(0)}%; volatility ${(record.volatility * 100).toFixed(1)}%`
    );
  }

  log(`designs: ${designs.length} phenotypes → ${designsFile}`);
};
