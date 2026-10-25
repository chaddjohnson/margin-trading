// The N-book engine's data: the canonical data/<SYMBOL>/data.csv of every member over one partition, loaded exactly as
// src/multi-etf-allocator/dataset.ts loads the frozen five (the shared loader src/lib/evaluation.ts, recorded splits
// forward-adjusted once, warm-up before the window, calendars checked session by session by the frozen
// assembleUniverse, VGT/VOOG distributions from the verified ledger in the run's share units), for any symbol list.
//
// Access is explicit: `optimization` reads the training partition only and is refused anything else before a byte is
// read (src/lib/evaluation.ts assertAccess); `manual evaluation` is the post-freeze path and the baseline controls'
// path. The study's search code only ever asks for `optimization`.
import {
  type AccessMode,
  type DatasetPartition,
  type SplitAdjustment,
  type SplitEvent,
  type WindowReport,
  loadDatasetSessions,
  readSplits,
  resolveDataset,
  splitFactor
} from '#lib';
import { fixtureDataset } from '../../four-family/data.ts';
import { protocol } from '../../multi-etf-allocator/context.ts';
import { assembleUniverse } from '../../multi-etf-allocator/data.ts';
import { type DistributionLedger, readDistributionLedger } from '../../multi-etf-allocator/dataset.ts';
import type { Instrument, NUniverse } from './engine.ts';

export interface LoadedUniverse {
  partition: DatasetPartition;
  access: AccessMode;
  endDate?: string;
  universe: NUniverse;
  warmup: number;
  windows: Record<string, WindowReport>;
  splits: SplitAdjustment[];
  distributions: {
    file: string;
    sha256: string;
    coverage: Record<'VGT' | 'VOOG', string>;
    covered: boolean;
    adjusted: { etf: string; exDate: string; published: number; adjusted: number; factor: number }[];
  };
}

export const loadNUniverse = async ({
  members,
  partition,
  access,
  warmupSessions,
  endDate,
  root = 'data',
  ledger,
  splits = readSplits()
}: {
  members: readonly string[];
  partition: DatasetPartition;
  access: AccessMode;
  warmupSessions: number;
  endDate?: string;
  root?: string;
  ledger?: DistributionLedger;
  splits?: readonly SplitEvent[];
}): Promise<LoadedUniverse> => {
  const instruments: Record<string, Instrument> = {};
  const windows: Record<string, WindowReport> = {};
  const applied: SplitAdjustment[] = [];
  let warmup: number | undefined;

  // VOOG and VGT first (the portfolio's core), then the books in the order given.
  const ordered = [...new Set(members)];

  for (const symbol of ordered) {
    const dataset = resolveDataset(symbol, partition, root);
    const run = await loadDatasetSessions({ dataset, endDate, warmupSessions, splits, access });
    const report = run.report!;

    if (warmup !== undefined && run.warmup !== warmup) {
      throw new Error(`${symbol} has ${run.warmup} warm-up sessions, the other members ${warmup}: calendars differ`);
    }

    warmup = run.warmup;
    windows[symbol] = report;
    applied.push(...report.splitAdjustments);

    const ds = fixtureDataset(run.history);

    ds.id = `${symbol}:${report.dataSha256!.slice(0, 16)}:${partition}:${ds.lastDate}`;
    ds.dataHash = report.dataSha256!;
    instruments[symbol] = { symbol, file: dataset.file, hash: report.dataSha256!, ds };
  }

  const first = Object.values(windows)[0];

  if (!first || warmup === undefined) {
    throw new Error('A universe needs at least one member');
  }

  const source = ledger ?? (await readDistributionLedger());
  const baseDate = Object.values(instruments)[0]!.ds.dates[0]!;
  const lastDate = first.evaluation.lastDate;
  const adjusted: LoadedUniverse['distributions']['adjusted'] = [];
  const distributions = source.distributions.map((distribution) => {
    const factor = splitFactor(splits, distribution.etf, baseDate, distribution.exDate);

    if (factor === 1) {
      return distribution;
    }

    adjusted.push({
      etf: distribution.etf,
      exDate: distribution.exDate,
      published: distribution.amount,
      adjusted: distribution.amount * factor,
      factor
    });
    return { ...distribution, amount: distribution.amount * factor };
  });
  const firstDate = first.evaluation.firstDate;
  const assembled = assembleUniverse(
    instruments as unknown as Parameters<typeof assembleUniverse>[0],
    distributions,
    lastDate,
    {},
    firstDate > protocol.eligibilityDate ? firstDate : protocol.eligibilityDate
  );

  return {
    partition,
    access,
    endDate,
    universe: {
      end: assembled.end,
      dates: assembled.dates,
      sessionCount: assembled.sessionCount,
      instruments,
      distributions: assembled.distributions,
      eligibilityIndex: assembled.eligibilityIndex
    },
    warmup,
    windows,
    splits: applied,
    distributions: {
      file: source.file,
      sha256: source.sha256,
      coverage: source.coverage,
      covered: lastDate <= source.coverage.VGT && lastDate <= source.coverage.VOOG,
      adjusted: adjusted.filter((row) => row.exDate <= lastDate)
    }
  };
};

// A sub-universe holding only some members (the same Dataset objects, nothing copied or reloaded).
export const subUniverse = (universe: NUniverse, members: readonly string[]): NUniverse => ({
  ...universe,
  instruments: Object.fromEntries(
    members.map((member) => {
      const instrument = universe.instruments[member];

      if (!instrument) {
        throw new Error(`${member} is not loaded`);
      }

      return [member, instrument];
    })
  )
});
