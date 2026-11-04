// Creating runs: manual single tests (validated, then queued for the runner) and the seeding of the synthetic demo.

import { execFileSync } from 'node:child_process';
import { join } from 'node:path';

import { readPartitionConfig } from '../../../src/lib/partitions.ts';
import type { LabValue, RunRequest } from '../shared/contract.ts';
import { RESOLUTION_LABEL } from '../shared/contract.ts';
import { canonicalParams, findStrategy, validateRunRequest } from '../shared/strategies.ts';
import { atomicWrite, runDirName } from './artifacts.ts';
import type { Config } from './config.ts';
import type { Jobs } from './jobs.ts';
import type { MarketPrices } from './prices.ts';
import type { Repo } from './repo.ts';

export const GROWTH_EXPERIMENT = {
  slug: 'growth-entry-discovery',
  title: 'Growth Entry Discovery',
  description:
    'Signal-only entry mechanisms that try to participate in sustained rises (docs/research/growth-entry-discovery/PLAN.md).'
};

const SOURCE_PATHS = ['src/entry-signals', 'src/lib', 'apps/strategy-lab/runner', 'apps/strategy-lab/shared'];

/** HEAD and the uncommitted state of the code a run executes (fixed git arguments, no user input). */
export function codeRevision(repoRoot: string): Record<string, unknown> {
  const git = (args: string[]) =>
    execFileSync('git', args, { cwd: repoRoot, encoding: 'utf8', timeout: 10_000 }).trim();
  try {
    const dirty = git(['status', '--porcelain', '--', ...SOURCE_PATHS])
      .split('\n')
      .filter(Boolean);
    return {
      commit: git(['rev-parse', 'HEAD']),
      branch: git(['rev-parse', '--abbrev-ref', 'HEAD']),
      dirty,
      paths: SOURCE_PATHS
    };
  } catch (e) {
    return { commit: null, error: (e as Error).message.slice(0, 200) };
  }
}

/** Which data partitions (data/partitions.json) an inclusive date window touches — recorded, and shown to the user. */
export function partitionsTouched(repoRoot: string, from: string, to: string): string {
  const cfg = readPartitionConfig(join(repoRoot, 'data'));
  const names = (['training', 'holdout', 'final'] as const).filter((p) => {
    const { start, end } = cfg.partitions[p];
    return (end === null || from <= end) && (start === null || to >= start);
  });
  return names.join('+') || 'outside partitions';
}

export class LabService {
  private symbolCache: { at: number; names: Set<string> } | null = null;

  constructor(
    private repo: Repo,
    private cfg: Config,
    private jobs: Jobs,
    private prices: MarketPrices
  ) {}

  knownSymbols(): Set<string> {
    if (!this.symbolCache || Date.now() - this.symbolCache.at > 60_000)
      this.symbolCache = { at: Date.now(), names: new Set(this.prices.symbols().map((s) => s.symbol)) };
    return this.symbolCache.names;
  }

  /** One manual test of one configuration. Never a sweep: exactly one parameter set per request. */
  createManualRun(body: unknown): { errors: string[] } | { runId: string } {
    const errors = validateRunRequest(body, this.knownSymbols());
    if (errors.length) return { errors };
    const req = body as RunRequest;
    const spec = findStrategy(req.strategyKey, req.strategyVersion)!;
    const exp = this.repo.ensureExperiment(
      GROWTH_EXPERIMENT.slug,
      GROWTH_EXPERIMENT.title,
      GROWTH_EXPERIMENT.description
    );
    const strat = this.repo.ensureStrategy({
      key: spec.key,
      version: spec.version,
      title: spec.title,
      kind: spec.kind,
      runnable: true,
      description: spec.description,
      params: spec.params,
      sourceRef: 'src/entry-signals/riseFromRecentLow.ts'
    });
    const params: LabValue[] = [
      ...spec.params.map((p) => ({ key: p.key, label: p.label, value: req.params[p.key]!, unit: p.unit })),
      { key: 'resolution', label: 'Bar resolution', value: req.resolution, unit: 'text' as const }
    ];
    const canonical = canonicalParams({ ...req.params }) + `|${req.resolution}`;
    const parent = req.parentVariation ? this.repo.variationIdOf(req.parentVariation) : null;
    const variation = this.repo.findOrCreateVariation({
      strategyId: strat.id,
      experimentId: exp.id,
      params,
      canonical,
      title: `X ${req.params.advanceFromRecentLowPercent}% · N ${req.params.recentLowLookbackBars} bars · ${req.resolution}`,
      origin: 'manual',
      parentVariationId: parent
    });
    const partition = partitionsTouched(this.cfg.repoRoot, req.from, req.to);
    const assumptions: LabValue[] = [
      {
        key: 'signalOnly',
        label: 'Signal-only',
        value: 'no orders, fills, exits, positions, costs or P&L',
        unit: 'text'
      },
      {
        key: 'bars',
        label: 'Bars',
        value: `${RESOLUTION_LABEL[req.resolution]}, regular session (09:30–16:00 ET), split-adjusted forward to the first loaded session`,
        unit: 'text'
      },
      {
        key: 'signalTime',
        label: 'Signal time',
        value: 'the end of the completed signal bar (first knowable)',
        unit: 'text'
      },
      {
        key: 'lookback',
        label: 'Lookback',
        value: 'counts bars present in the data, the signal bar included',
        unit: 'text'
      },
      {
        key: 'trigger',
        label: 'Trigger',
        value: 'edge: previous bar below its threshold, signal bar at/above; rearms after a bar below',
        unit: 'text'
      },
      {
        key: 'outcomes',
        label: 'Forward outcomes',
        value:
          'returns after 5/21/63 sessions, MFE/MAE and targets over 63 sessions, inside the window only; censored = null',
        unit: 'text'
      },
      {
        key: 'access',
        label: 'Data access',
        value: `manual evaluation of ${partition} dates (src/lib/evaluation.ts)`,
        unit: 'text'
      }
    ];
    const run = this.repo.createRun({
      variationId: variation.id,
      title: req.title?.trim() || '',
      kind: 'manual',
      status: 'queued',
      dataOrigin: 'real',
      symbols: req.symbols,
      window: { from: req.from, to: req.to, resolution: req.resolution, partition },
      params,
      assumptions,
      request: req,
      priceSource: { kind: 'market', basisDate: req.from },
      provenance: {
        createdBy: 'Strategy Lab manual Run Test',
        variation: variation.publicId,
        variationCreated: variation.created
      },
      codeRevision: codeRevision(this.cfg.repoRoot)
    });
    atomicWrite(
      join(this.cfg.stateDir, runDirName(run.publicId), 'request.json'),
      `${JSON.stringify({ runId: run.publicId, ...req }, null, 2)}\n`
    );
    this.jobs.enqueue(run.id, run.publicId);
    return { runId: run.publicId };
  }
}
