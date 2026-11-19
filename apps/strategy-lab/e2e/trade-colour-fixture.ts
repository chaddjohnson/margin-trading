// A synthetic trade-colour fixture for the browser tests, seeded ONLY into the e2e server's temporary state (never the
// live database): one run on the demo's synthetic DEMO prices with a profitable, a losing, an exactly breakeven and an
// open trade, a rejected signal and a raw entry signal. Real data has no trade with a net P&L of exactly $0, so the
// breakeven colour can only be exercised end to end like this. Prices are the synthetic bars' closes; the net values
// are set by hand (the fixture tests the colour rules, not an execution model).

import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { atomicWrite, runDirName, writeEvents, writeManifest } from '../server/artifacts.ts';
import type { Config } from '../server/config.ts';
import type { Repo } from '../server/repo.ts';
import { DEMO_FIXTURE, DEMO_SYMBOL } from '../server/seed-demo.ts';
import type { LabEvent, LabValue } from '../shared/contract.ts';
import { validateEvents } from '../shared/validate-events.ts';

export const TRADE_COLOUR_FIXTURE_TITLE = 'E2E trade colours (synthetic fixture)';

export function seedTradeColourFixture(repo: Repo, cfg: Config) {
  const ds = JSON.parse(readFileSync(join(cfg.repoRoot, DEMO_FIXTURE), 'utf8')) as {
    datasetId: string;
    priceSeries: { bars: { t: string; d: string; c: number }[] };
  };
  const bars = ds.priceSeries.bars;
  const exp = repo.ensureExperiment('e2e-fixtures', 'E2E fixtures (synthetic)', 'Test-only fixtures of the e2e suite.');
  const strat = repo.ensureStrategy({
    key: 'e2e-trade-colour-fixture',
    version: '1.0.0',
    title: 'E2E trade-colour fixture (synthetic)',
    kind: 'trades',
    runnable: false,
    description: 'Synthetic trades with hand-set net P&L for the marker-colour tests.',
    schema: null,
    sourceRef: 'apps/strategy-lab/e2e/trade-colour-fixture.ts'
  });
  const params: LabValue[] = [{ key: 'fixture', label: 'Fixture', value: 'trade colours', unit: 'text' }];
  const variation = repo.findOrCreateVariation({
    strategyId: strat.id,
    experimentId: exp.id,
    params,
    canonical: 'trade-colours',
    title: 'trade colours',
    origin: 'demo',
    parentVariationId: null
  });
  const from = bars[0]!.d;
  const to = bars.at(-1)!.d;
  const run = repo.createRun({
    variationId: variation.id,
    title: TRADE_COLOUR_FIXTURE_TITLE,
    kind: 'demo',
    status: 'running',
    dataOrigin: 'synthetic',
    symbols: [DEMO_SYMBOL],
    window: { from, to, resolution: '1d', partition: null },
    params,
    assumptions: [{ key: 'synthetic', label: 'Data', value: 'synthetic test fixture', unit: 'text' }],
    request: null,
    priceSource: { kind: 'synthetic', datasetId: ds.datasetId },
    provenance: { fixture: 'apps/strategy-lab/e2e/trade-colour-fixture.ts' },
    codeRevision: null
  });
  const base = (i: number) => ({
    runId: run.publicId,
    symbol: DEMO_SYMBOL,
    t: bars[i]!.t,
    timePrecision: 'session-close' as const,
    timeMeaning: 'close of the synthetic daily bar',
    price: bars[i]!.c,
    meta: { synthetic: true } as LabEvent['meta']
  });
  const events: LabEvent[] = [];
  // [tradeId, entry bar, exit bar or null (open), recorded net]. T-4 is entered and exits ABOVE its entry price yet
  // loses after costs and interest: its colour must follow the recorded net, not the prices.
  const trades: [string, number, number | null, number][] = [
    ['T-1', 40, 60, 1250],
    ['T-2', 90, 110, -730.5],
    ['T-3', 140, 160, 0],
    ['T-4', 0, 0, -42],
    ['T-5', 260, null, 0]
  ];
  // T-4: the first bar pair after bar 180 whose exit close is above the entry close.
  for (let i = 180; i < 240; i++)
    if (bars[i + 10]!.c > bars[i]!.c) {
      trades[3] = ['T-4', i, i + 10, -42];
      break;
    }
  for (const [tradeId, a, b, net] of trades) {
    const entry = `${DEMO_SYMBOL}:${tradeId}:entry`;
    const exit = `${DEMO_SYMBOL}:${tradeId}:exit`;
    events.push({
      ...base(a),
      id: entry,
      kind: 'executed_entry',
      priceBasis: 'fill',
      reason: `Synthetic fixture entry of ${tradeId}`,
      values: [{ key: 'principal', label: 'Principal', value: 100_000, unit: 'usd' }],
      tradeId,
      linkedEventId: b === null ? null : exit,
      meta: { synthetic: true, open: b === null }
    });
    if (b === null) continue;
    events.push({
      ...base(b),
      id: exit,
      kind: 'executed_exit',
      priceBasis: 'fill',
      reason: `Synthetic fixture exit of ${tradeId}`,
      values: [
        { key: 'exitReason', label: 'Exit reason', value: 'Fixture', unit: 'text' },
        { key: 'net', label: 'Net P&L', value: net, unit: 'usd' }
      ],
      tradeId,
      linkedEventId: entry
    });
  }
  for (const [kind, i] of [
    ['rejected_signal', 50],
    ['rejected_signal', 150],
    ['entry_signal', 200]
  ] as const)
    events.push({
      ...base(i),
      id: `${DEMO_SYMBOL}:${kind}:${i}`,
      kind,
      priceBasis: 'bar-close',
      reason: `Synthetic fixture ${kind}`,
      values: [],
      tradeId: null,
      linkedEventId: null
    });
  const errors = validateEvents(events, run.publicId, [DEMO_SYMBOL]);
  if (errors.length) throw new Error(`trade-colour fixture: ${errors.join('; ')}`);
  const relDir = runDirName(run.publicId);
  const dir = join(cfg.stateDir, relDir);
  const sha = writeEvents(dir, run.publicId, events);
  const metrics = { kind: 'synthetic trade fixture', disclaimer: 'Synthetic test fixture: hand-set net P&L.' };
  atomicWrite(join(dir, 'metrics.json'), `${JSON.stringify(metrics, null, 2)}\n`);
  writeManifest(dir, ['events.json', 'metrics.json']);
  repo.complete(run.id, {
    eventCount: events.length,
    artifactDir: relDir,
    artifactSha256: sha,
    metrics,
    provenance: { fixture: 'apps/strategy-lab/e2e/trade-colour-fixture.ts' },
    priceSource: { kind: 'synthetic', datasetId: ds.datasetId }
  });
  return run.publicId;
}
