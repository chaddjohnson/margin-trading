// The study's data access, through the shared canonical loader only (src/lib/evaluation.ts): one data/<SYMBOL>/data.csv
// per symbol, windows from data/partitions.json, recorded splits forward-adjusted once (src/lib/corporateActions.ts).
//
// - Stages A and B read the training partition with `access: 'optimization'`, which refuses every other partition
//   before a byte is read; the D1 dataset built from it is the four-family research view, which cannot hold a later
//   session (src/four-family/data.ts).
// - The data audit reads every row of the 16 files for integrity and corporate actions only: no strategy runs on it.
// - Stage C reads `all` only through the allocator's --dataset loader, after the freeze (src/complementary-etf-d1/
//   allocator.ts).
import {
  type RunWindow,
  type WindowReport,
  loadDatasetSessions,
  optimizationDataset,
  resolveDataset,
  sha256FileSync
} from '#lib';
import type { MarketSession } from '#types';
import { type Dataset, lastIndexOnOrBefore, researchDataset } from '../four-family/data.ts';
import { type TickerData, eligibilityIndexOf } from '../multi-etf-d1/data.ts';
import { study } from './context.ts';

export interface TrainingData {
  symbol: string;
  sessions: MarketSession[]; // regular sessions of the training partition, split-adjusted
  report: WindowReport;
  dataHash: string;
}

const trainingCache = new Map<string, Promise<TrainingData>>();

// The training partition of a symbol: every training session (no warm-up exists before the file's first row).
export const loadTraining = (symbol: string): Promise<TrainingData> => {
  let cached = trainingCache.get(symbol);

  if (!cached) {
    cached = (async () => {
      const run: RunWindow = await loadDatasetSessions({
        dataset: optimizationDataset(symbol),
        access: 'optimization'
      });
      const report = run.report!;

      if (report.partition !== 'training' || report.evaluation.lastDate > study.trainingEnd) {
        throw new Error(`${symbol}: not a training window (${report.partition} → ${report.evaluation.lastDate})`);
      }

      return { symbol, sessions: run.sessions, report, dataHash: report.dataSha256! };
    })();
    trainingCache.set(symbol, cached);
  }

  return cached;
};

// The D1 engine's view of a training partition (src/d1-refinement/engine.ts through src/multi-etf-d1): the research
// dataset ends on the last training session, so no fold, search or selection can read a later price.
export const trainingTickerData = async (symbol: string): Promise<TickerData> => {
  const { sessions, dataHash, report } = await loadTraining(symbol);
  const ds: Dataset = researchDataset(sessions, dataHash, study.trainingEnd);

  ds.id = `${symbol}:${dataHash.slice(0, 16)}:training:${ds.lastDate}`;
  ds.dataHash = dataHash;

  const developmentEnd = lastIndexOnOrBefore(ds, study.trainingEnd);

  if (developmentEnd !== ds.sessionCount - 1) {
    throw new Error(`${symbol}: the training view ends ${ds.lastDate}, after ${study.trainingEnd}`);
  }

  return {
    ticker: symbol,
    dataFile: report.dataFile,
    dataHash,
    sessions,
    ds,
    eligibility: eligibilityIndexOf(ds),
    developmentEnd
  };
};

// Every session of a canonical file (the `all` partition), split-adjusted, for the integrity audit only.
export const loadAllForAudit = async (symbol: string) => {
  const dataset = resolveDataset(symbol, 'all');
  const run = await loadDatasetSessions({ dataset });

  return { sessions: run.sessions, report: run.report!, dataHash: sha256FileSync(dataset.file) };
};
