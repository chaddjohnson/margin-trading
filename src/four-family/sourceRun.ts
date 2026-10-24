// Runs a strategy file (an unmodified original, or its generated injectable copy) and normalizes what it
// returns and writes (trades, summary.json and daily.csv) for comparison with the engine.
import os from 'node:os';
import path from 'node:path';
import fs from 'fs-extra';
import type { BacktestPosition, MarketSession } from '#types';
import { materializeFrozenSource } from '#lib';
import { type SourceKey, frozenSources, generatedDir, sourceFiles } from './copies.ts';

export interface SourceTrade {
  entryDate: string;
  entryTimestamp: number;
  entryPrice: number;
  entryTime: number;
  entryBar: number;
  entryExecution: string;
  decisionTime: number;
  decisionPrice: number;
  setupId: number | undefined;
  activationTime: number | undefined;
  activationPrice: number | undefined;
  referenceHigh: number | undefined;
  trailingLow: number | undefined;
  reboundTrigger: number | undefined;
  shares: number;
  investment: number;
  isOpen: boolean;
  exitTimestamp: number | undefined;
  exitPrice: number | undefined;
  exitTime: number | undefined;
  exitBar: number | undefined;
  exitExecution: string | undefined;
  reason: string;
  exitStopPrice: number | undefined;
  maximumHoldDue: boolean | undefined;
  bufferSignalTime: number | undefined;
  interest: number | undefined;
  profit: number | undefined;
}

export interface SourceRunResult {
  trades: SourceTrade[];
  summary: Record<string, unknown>;
  dailyMarks: Map<string, number>;
  setups?: { id: number; status: string; statusReason: string }[];
}

export interface SourceRunOptions {
  key: SourceKey;
  copy: boolean; // the generated copy instead of the original
  startDate?: string;
  endDate?: string;
  stopFill: 'stop' | 'next-open';
  targetPercentChange?: number;
  trailingBuyPercentage?: number;
  intradayLossBuffer?: number;
  injected?: {
    sessions?: MarketSession[];
    tickWindowSize?: number;
    targetPercentChange?: number;
    trailingStopPercentage?: number;
    maximumHoldDays?: number;
    marginInterestRate?: number;
    materialLossThreshold?: number;
    lowerPriceReentry?: number;
    retraceFraction?: number;
    armStart?: number;
  };
}

// A copy, or the unmodified original as the program froze it (copies.ts).
const modulePath = async (key: SourceKey, copy: boolean) =>
  copy
    ? path.resolve(generatedDir, path.basename(sourceFiles[key]))
    : await materializeFrozenSource(frozenSources[key]);

const formatDate = (timestamp: number) => new Date(timestamp * 1000).toISOString().slice(0, 10);

export const runSource = async (options: SourceRunOptions): Promise<SourceRunResult> => {
  const module = await import(await modulePath(options.key, options.copy));
  const outDir = await fs.mkdtemp(path.join(os.tmpdir(), 'four-family-source-'));
  const info = console.info;

  if (options.copy) {
    for (const key of Object.keys(module.injected)) {
      delete module.injected[key];
    }

    Object.assign(module.injected, options.injected ?? {});
  } else if (options.injected && Object.keys(options.injected).length > 0) {
    throw new Error('An original strategy file takes no injected parameters');
  }

  console.info = () => {};

  try {
    const runOptions: Record<string, unknown> = {
      symbol: 'VGT',
      startDate: options.startDate,
      endDate: options.endDate,
      outDir,
      stopFill: options.stopFill
    };

    if (options.key !== 'allIn') {
      runOptions.targetPercentChange = options.targetPercentChange;
      runOptions.trailingBuyPercentage = options.trailingBuyPercentage;
    }

    if (options.key === 'bufferedLoss' || options.key === 'bufferedLossNoReentry') {
      runOptions.intradayLossBuffer = options.intradayLossBuffer;
    }

    const result = await module.runAllIn(runOptions);
    const summary = JSON.parse(await fs.readFile(path.join(outDir, 'summary.json'), 'utf8'));
    const dailyLines = (await fs.readFile(path.join(outDir, 'daily.csv'), 'utf8')).trim().split('\n');
    const header = dailyLines[0]!.split(',');
    const dateColumn = header.indexOf('date');
    const markColumn = header.indexOf('mtm_pnl');
    const dailyMarks = new Map(
      dailyLines.slice(1).map((line) => {
        const fields = line.split(',');

        return [fields[dateColumn]!, Number(fields[markColumn])] as const;
      })
    );
    const trades: SourceTrade[] = (result.positions as BacktestPosition[]).map((position) => {
      const entry = result.entryFills.get(position);
      const exit = result.exitFills.get(position);

      return {
        entryDate: formatDate(position.entryTimestamp),
        entryTimestamp: position.entryTimestamp,
        entryPrice: position.entryPrice,
        entryTime: entry.time,
        entryBar: entry.barIndex,
        entryExecution: entry.execution,
        decisionTime: entry.decisionTime,
        decisionPrice: entry.decisionPrice,
        setupId: entry.setupId,
        activationTime: entry.activationTime,
        activationPrice: entry.activationPrice,
        referenceHigh: entry.referenceHigh,
        trailingLow: entry.trailingLow,
        reboundTrigger: entry.reboundTrigger,
        shares: position.shares,
        investment: position.investment,
        isOpen: position.isOpen,
        exitTimestamp: position.exitTimestamp,
        exitPrice: position.exitPrice,
        exitTime: exit?.time,
        exitBar: exit?.barIndex,
        exitExecution: exit?.execution,
        reason: position.isOpen ? 'open' : exit.reason,
        exitStopPrice: exit?.stopPrice,
        maximumHoldDue: exit?.isMaximumHoldDue,
        bufferSignalTime: exit?.bufferedLossSignal?.decisionTime,
        interest: position.interest,
        profit: position.profit
      };
    });

    return {
      trades,
      summary,
      dailyMarks,
      setups: result.setups?.map((setup: { id: number; status: string; statusReason: string }) => ({
        id: setup.id,
        status: setup.status,
        statusReason: setup.statusReason
      }))
    };
  } finally {
    console.info = info;

    if (options.copy) {
      for (const key of Object.keys(module.injected)) {
        delete module.injected[key];
      }
    }

    await fs.remove(outDir);
  }
};
