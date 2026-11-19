// Writes the Growth DEMONSTRATION phenotype export (fixtures/phenotypes/growth-demo-2026-11/): five frozen Growth
// configurations — continuation OFF and each of the four continuation methods — with the illustrative schema defaults
// on VGT daily bars. They exist to exercise the export → import → catalogue → single rerun path and the export
// contract a future CLI optimiser emits. NOT selected by any search, ranking or optimisation, and not candidates.
// The checked-in export was written on 2026-11-04 by Growth 1.1.0 and is frozen as a 1.1.0 export (its phenotypes rerun
// as 1.1.0 configurations). The 1.2.0 entry-gate demonstration is make-growth-gates-demo-phenotypes.ts.
//
//   node --experimental-transform-types apps/strategy-lab/scripts/make-growth-demo-phenotypes.ts <new directory>
// (from the repository root: the engine's data module resolves repository-relative paths when it loads)

import { resolve } from 'node:path';

import { sealRecord, writePhenotypeExport } from '../importers/phenotype-export.ts';
import type { PhenotypeExport } from '../shared/phenotypes.ts';
import { defaultParams, effectiveParams } from '../shared/params.ts';
import { RISE_FROM_RECENT_LOW_TRADING_1_1_0 as GROWTH } from '../shared/strategies.ts';

const STRATEGY_VERSION = GROWTH.version; // the frozen 1.1.0 export (its engine version at writing)

const variants = [
  { slug: 'off', name: 'Growth, continuation OFF', over: { continuationEnabled: false } },
  { slug: 'classic-d1', name: 'Growth + Classic D1 continuation', over: { continuationEnabled: true, continuationMethod: 'classic_d1' } },
  { slug: 'breakout', name: 'Growth + breakout continuation', over: { continuationEnabled: true, continuationMethod: 'breakout' } },
  { slug: 'shallow-pullback', name: 'Growth + shallow-pullback continuation', over: { continuationEnabled: true, continuationMethod: 'shallow_pullback' } },
  { slug: 'ma-cross', name: 'Growth + rising-MA-cross continuation', over: { continuationEnabled: true, continuationMethod: 'ma_cross' } }
];

export function growthDemoExport(): PhenotypeExport {
  return {
    schema: 'strategy-lab.phenotype-export',
    schemaVersion: 1,
    study: {
      id: 'growth-demo-2026-11',
      title: 'Growth phenotype catalogue demonstration (not an optimisation)',
      kind: 'demonstration',
      methodology: 'docs/strategy-lab/PHENOTYPES.md',
      dataExposure:
        'No data was used to choose these configurations (illustrative schema defaults). VGT 2016–2026 had been inspected in earlier exploratory runs; any rerun is exploratory, never a holdout.'
    },
    generatedAt: '2026-11-04T00:00:00.000Z',
    generator: { tool: 'apps/strategy-lab/scripts/make-growth-demo-phenotypes.ts', commit: null },
    phenotypes: variants.map((v, i) =>
      sealRecord({
        id: `growth-demo-2026-11/${v.slug}-vgt-1d`,
        version: 1,
        name: `${v.name} (VGT, daily) — demonstration`,
        role: 'demonstration',
        rank: i + 1,
        strategy: { key: GROWTH.key, version: GROWTH.version },
        executionKind: 'standalone',
        symbols: ['VGT'],
        params: effectiveParams(GROWTH, { ...defaultParams(GROWTH), ...v.over }),
        resolution: '1d',
        engine: { version: STRATEGY_VERSION, commit: null },
        execution: {
          notionalUsd: 100_000,
          annualInterestRate: 0.11,
          costBpsPerSide: 5,
          stopFill: 'the stop price, or the gapped opening trade',
          capital: 'standalone: one $100,000 fixed-notional backtest per symbol'
        },
        data: { selectionWindow: null, testWindows: [], exposure: 'not selected on data (illustrative defaults)' },
        selection: { method: 'none — illustrative schema defaults, exported only to demonstrate the catalogue workflow' },
        notes: 'Demonstration only: not optimised, not ranked by performance (rank = list order), not a recommendation.'
      })
    )
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const out = process.argv[2];
  if (!out) {
    console.error('usage: make-growth-demo-phenotypes.ts <new directory>');
    process.exit(2);
  }
  console.log(JSON.stringify(writePhenotypeExport(resolve(out), growthDemoExport()), null, 2));
}
