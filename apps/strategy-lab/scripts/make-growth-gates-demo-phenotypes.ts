// Writes the Growth 1.2.0 ENTRY-GATE DEMONSTRATION phenotype export (fixtures/phenotypes/growth-gates-demo-2026-11/):
// three frozen Growth configurations with the entry trend filter and/or persistent eligibility ON, at the illustrative
// schema defaults. They exercise the path a future CLI optimiser's phenotypes take — export → import → catalogue → one
// single rerun with full provenance — for records that carry the new switches, methods and policies. NOT selected by
// any search, ranking or optimisation, not candidates, not a recommendation.
//
//   node --experimental-transform-types apps/strategy-lab/scripts/make-growth-gates-demo-phenotypes.ts <new directory>
// (from the repository root: the engine's data module resolves repository-relative paths when it loads)

import { resolve } from 'node:path';

import { STRATEGY_VERSION } from '../../../src/growth-trading/riseTrading.ts';
import { sealRecord, writePhenotypeExport } from '../importers/phenotype-export.ts';
import type { PhenotypeExport } from '../shared/phenotypes.ts';
import { defaultParams, effectiveParams } from '../shared/params.ts';
import { RISE_FROM_RECENT_LOW_TRADING as GROWTH } from '../shared/strategies.ts';

const variants = [
  {
    slug: 'trend-a-latch-time-limited-vgt',
    name: 'Growth + trend A (price change) + time-limited eligibility',
    symbols: ['VGT'],
    over: { trendFilterEnabled: true, trendMethod: 'price_change', eligibilityEnabled: true, eligibilityPolicy: 'time_limited' }
  },
  {
    slug: 'trend-e-reset-renew-vgt',
    name: 'Growth + trend E (momentum) + reset-and-renew eligibility',
    symbols: ['VGT'],
    over: { trendFilterEnabled: true, trendMethod: 'momentum', eligibilityEnabled: true, eligibilityPolicy: 'reset_renew' }
  },
  {
    slug: 'trend-c-gdx',
    name: 'Growth + trend C (rising moving average), eligibility OFF',
    symbols: ['GDX'],
    over: { trendFilterEnabled: true, trendMethod: 'rising_sma', eligibilityEnabled: false }
  }
];

export function growthGatesDemoExport(): PhenotypeExport {
  return {
    schema: 'strategy-lab.phenotype-export',
    schemaVersion: 1,
    study: {
      id: 'growth-gates-demo-2026-11',
      title: 'Growth entry-gate phenotype demonstration (not an optimisation)',
      kind: 'demonstration',
      methodology: 'docs/strategy-lab/PHENOTYPES.md',
      dataExposure:
        'No data was used to choose these configurations (illustrative schema defaults). VGT and GDX 2016–2023 had been inspected in earlier exploratory runs; any rerun is exploratory, never a holdout.'
    },
    generatedAt: '2026-11-05T00:00:00.000Z',
    generator: { tool: 'apps/strategy-lab/scripts/make-growth-gates-demo-phenotypes.ts', commit: null },
    phenotypes: variants.map((v, i) =>
      sealRecord({
        id: `growth-gates-demo-2026-11/${v.slug}-1d`,
        version: 1,
        name: `${v.name} (${v.symbols.join(', ')}, daily) — demonstration`,
        role: 'demonstration',
        rank: i + 1,
        strategy: { key: GROWTH.key, version: GROWTH.version },
        executionKind: 'standalone',
        symbols: v.symbols,
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
    console.error('usage: make-growth-gates-demo-phenotypes.ts <new directory>');
    process.exit(2);
  }
  console.log(JSON.stringify(writePhenotypeExport(resolve(out), growthGatesDemoExport()), null, 2));
}
