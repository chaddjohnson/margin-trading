// Seeds the synthetic demo (the Strategy Entry Explorer's fixture) as its own experiment, "Demo (synthetic data)": 12
// variations of toy rules with one completed run each. Their symbol is `DEMO`, their data origin `synthetic`, and their
// chart prices come only from the fixture — never from, or mixed with, market data.

import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import type { MarketSession } from '../../../src/types/index.ts';
import { forwardOutcome, summarizeOutcomes } from '../../../src/entry-signals/outcomes.ts';
import type { LabEvent, LabValue, ValueUnit } from '../shared/contract.ts';
import type { Dataset } from '../shared/demo-schema/types.ts';
import { validateDataset } from '../shared/demo-schema/validate.ts';
import { schemaOf } from '../shared/params.ts';
import { DEMO_TOY_RULES } from '../shared/strategies.ts';
import { atomicWrite, runDirName, writeEvents, writeManifest } from './artifacts.ts';
import type { Config } from './config.ts';
import type { Repo } from './repo.ts';

export const DEMO_SYMBOL = 'DEMO';
export const DEMO_FIXTURE = 'apps/strategy-lab/fixtures/demo-dataset.v1.json';

const unitMap: Record<string, ValueUnit> = {
  percent: 'percent',
  price: 'price',
  sessions: 'sessions',
  date: 'date',
  index: 'index',
  ratio: 'ratio',
  count: 'count',
  text: 'text'
};

export function seedDemo(repo: Repo, cfg: Config): number {
  const exp = repo.ensureExperiment(
    'demo',
    'Demo (synthetic data)',
    'The Strategy Entry Explorer demo: fictional prices and toy rules.'
  );
  const existing = repo.listRuns({ experiment: exp.publicId, limit: 1 });
  if (existing.length > 0) return 0;
  // Deleted demo runs stay deleted: never reseed the demo once the user removed any of its runs.
  if (repo.deletedRunsOfKind('demo') > 0) return 0;
  const raw = JSON.parse(readFileSync(join(cfg.repoRoot, DEMO_FIXTURE), 'utf8')) as unknown;
  const valid = validateDataset(raw);
  if (!valid.ok) throw new Error(`demo fixture invalid: ${valid.errors[0]}`);
  const ds: Dataset = valid.dataset;
  const strat = repo.ensureStrategy({
    key: 'demo-toy-rules',
    version: '1.0.0',
    title: 'Demo toy rules (synthetic)',
    kind: 'entry_signal',
    runnable: false,
    description: 'Twelve toy rules that make the synthetic fixture internally consistent. Not research candidates.',
    schema: schemaOf(DEMO_TOY_RULES),
    sourceRef: 'apps/strategy-lab/shared/demo/rules.ts'
  });
  const bars = ds.priceSeries.bars;
  const indexByT = new Map(bars.map((b, i) => [b.t, i]));
  const sessions = bars.map((b) => ({ date: b.d, close: b.c, high: b.h, low: b.l }) as unknown as MarketSession);
  const first = bars[0]!.d;
  const last = bars.at(-1)!.d;
  let created = 0;

  for (const v of ds.variations) {
    const params: LabValue[] = v.parameters.map((p) => ({
      key: p.key,
      label: p.label,
      value: p.value,
      unit: unitMap[p.unit] ?? 'text'
    }));
    const variation = repo.findOrCreateVariation({
      strategyId: strat.id,
      experimentId: exp.id,
      params,
      canonical: `${v.id}`,
      title: `${v.code} · ${v.name}`,
      origin: 'demo',
      parentVariationId: null
    });
    const run = repo.createRun({
      variationId: variation.id,
      title: `${v.code} · ${v.name} (synthetic demo)`,
      kind: 'demo',
      status: 'running',
      dataOrigin: 'synthetic',
      symbols: [DEMO_SYMBOL],
      window: { from: first, to: last, resolution: '1d', partition: null },
      params,
      assumptions: [
        {
          key: 'synthetic',
          label: 'Data',
          value: 'synthetic, fictional prices (seeded random walk); not market data',
          unit: 'text'
        },
        { key: 'execution', label: 'Executed entries', value: ds.executionModel?.description ?? 'none', unit: 'text' }
      ],
      request: null,
      priceSource: { kind: 'synthetic', datasetId: ds.datasetId },
      provenance: {
        fixture: DEMO_FIXTURE,
        generator: ds.provenance.generator ?? null,
        disclosures: ds.provenance.disclosures
      },
      codeRevision: null
    });
    const events: LabEvent[] = v.events.map((e) => ({
      id: `${DEMO_SYMBOL}:${e.id}`,
      runId: run.publicId,
      symbol: DEMO_SYMBOL,
      kind: e.type === 'signal' ? 'entry_signal' : 'executed_entry',
      t: e.t,
      timePrecision: 'session-close',
      timeMeaning: 'close of the synthetic daily bar',
      price: e.price,
      priceBasis: 'bar-close',
      reason:
        e.type === 'signal'
          ? e.trigger.summary
          : `Illustrative synthetic fill (demo occupancy model): ${e.trigger.summary}`,
      values: e.trigger.values.map((p) => ({
        key: p.key,
        label: p.label,
        value: p.value,
        unit: unitMap[p.unit] ?? 'text'
      })),
      tradeId: null,
      linkedEventId: e.linkedEventId ? `${DEMO_SYMBOL}:${e.linkedEventId}` : null,
      meta: { synthetic: true, illustrative: e.type === 'executed', execution: e.execution?.status ?? null }
    }));
    const signalItems = v.events
      .filter((e) => e.type === 'signal')
      .map((e) => {
        const i = indexByT.get(e.t)!;
        return { sessionIndex: i, outcome: forwardOutcome(sessions, i, e.price) };
      });
    const metrics = {
      kind: 'entry-signal outcomes',
      disclaimer: 'Synthetic demo data: these numbers describe a random walk, not VGT and not any strategy.',
      perSymbol: {
        [DEMO_SYMBOL]: {
          signals: signalItems.length,
          outcomes: summarizeOutcomes(signalItems),
          baseline: summarizeOutcomes(
            sessions.map((s, i) => ({ sessionIndex: i, outcome: forwardOutcome(sessions, i, s.close) }))
          )
        }
      }
    };
    const relDir = runDirName(run.publicId);
    const dir = join(cfg.stateDir, relDir);
    const sha = writeEvents(dir, run.publicId, events);
    atomicWrite(join(dir, 'metrics.json'), `${JSON.stringify(metrics, null, 2)}\n`);
    writeManifest(dir, ['events.json', 'metrics.json']);
    repo.complete(run.id, {
      eventCount: events.length,
      artifactDir: relDir,
      artifactSha256: sha,
      metrics,
      provenance: {
        fixture: DEMO_FIXTURE,
        generator: ds.provenance.generator ?? null,
        disclosures: ds.provenance.disclosures
      },
      priceSource: { kind: 'synthetic', datasetId: ds.datasetId }
    });
    created++;
  }
  return created;
}
