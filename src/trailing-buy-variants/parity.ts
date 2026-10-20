// Parity between the engine (+ accounting) and the variant strategy files, through their injectable copies:
// every trade field (legs included), the counts, the summary totals, both drawdowns and every daily mark.
//   npm run trailing-buy-variants -- parity [--vectors N] [--full]
// Without --full the files run on the research view (to 2023-12-29); --full repeats the defaults on the whole
// file and is what the holdout step runs.
import os from 'node:os';
import path from 'node:path';
import fs from 'fs-extra';
import type { BacktestPosition, MarketSession } from '#types';
import { Rng } from '../optimizer/rng.ts';
import {
  type Dataset,
  computeReferenceHighs,
  fixtureDataset,
  lastIndexOnOrBefore,
  loadSessions
} from '../four-family/data.ts';
import { replay } from './accounting.ts';
import {
  type InjectableConstant,
  type VariantSourceKey,
  generateVariantCopy,
  generatedDir,
  variantSourceFiles
} from './copies.ts';
import { loadResearch, protocol, readJson, resultsRoot, writeJson } from './context.ts';
import { type RunSettings, type StopFill, type StrategyParams, simulate } from './engine.ts';
import {
  type Family,
  type IntParams,
  families,
  familySpecs,
  genomeToParams,
  gridSize,
  toStrategyParams
} from './families.ts';

export const tolerance = 1e-6;

const sourceOf: Record<VariantSourceKey, string> = {
  bufferedLossNoReentry: 'bufferedLossNoReentry',
  invalidation: 'invalidation',
  episodeBudget: 'episodeBudget',
  depthRebound: 'depthRebound',
  staged: 'staged',
  progressHold: 'progressHold',
  persistence: 'persistence'
};

export interface ParityCase {
  name: string;
  key: VariantSourceKey;
  endDate: string;
  stopFill: StopFill;
  params: StrategyParams;
  inject: boolean; // inject every constant (otherwise the file's own, with only X, Y and the buffer passed)
  armStart?: number;
  marginInterestRate: number;
  omitOverrides?: boolean; // run the source with no option at all (its own defaults)
}

interface SourceLeg {
  index: number;
  date: string;
  barIndex: number;
  time: number;
  price: number;
  execution: string;
  decisionTime: number;
  decisionPrice: number;
  investment: number;
  shares: number;
  entryTimestamp: number;
}

const formatDate = (timestamp: number) => new Date(timestamp * 1000).toISOString().slice(0, 10);

const runSource = async (parityCase: ParityCase, sessions: MarketSession[]) => {
  const module = await import(path.resolve(generatedDir, path.basename(variantSourceFiles[parityCase.key])));
  const outDir = await fs.mkdtemp(path.join(os.tmpdir(), 'trailing-buy-variants-source-'));
  const info = console.info;
  const { params } = parityCase;

  for (const key of Object.keys(module.injected)) {
    delete module.injected[key];
  }

  module.injected.sessions = sessions;

  if (parityCase.inject) {
    const values: Partial<Record<InjectableConstant, number>> = {
      tickWindowSize: params.tickWindowSize,
      trailingStopPercentage: params.trailingStopPercentage,
      maximumHoldDays: params.maximumHoldDays,
      marginInterestRate: parityCase.marginInterestRate,
      invalidationBuffer: params.invalidationBuffer,
      episodeLossBudget: params.episodeLossBudget,
      episodeResetRetrace: params.episodeResetRetrace,
      reboundDepthSlope: params.reboundDepthSlope,
      initialFraction: params.initialFraction,
      addTrigger: params.addTrigger,
      progressThreshold: params.progressThreshold,
      holdExtensionDays: params.holdExtensionDays,
      confirmMinutes: params.confirmMinutes
    };

    for (const [name, value] of Object.entries(values)) {
      if (Number.isFinite(value)) {
        module.injected[name] = value;
      }
    }

    module.injected.armStart = parityCase.armStart;
  }

  console.info = () => {};

  try {
    const result = await module.runAllIn({
      symbol: 'VGT',
      endDate: parityCase.endDate,
      outDir,
      stopFill: parityCase.stopFill,
      targetPercentChange: parityCase.omitOverrides ? undefined : params.targetPercentChange,
      trailingBuyPercentage: parityCase.omitOverrides ? undefined : params.trailingBuyPercentage,
      intradayLossBuffer: parityCase.omitOverrides ? undefined : params.intradayLossBuffer
    });
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
    const trades = (result.positions as BacktestPosition[]).map((position) => {
      const entry = result.entryFills.get(position);
      const exit = result.exitFills.get(position);
      const legs: SourceLeg[] | undefined = result.legs?.get(position);

      return {
        entryDate: formatDate(position.entryTimestamp),
        entryTimestamp: position.entryTimestamp,
        entryPrice: position.entryPrice,
        entryTime: entry.time as number,
        entryBar: entry.barIndex as number,
        entryExecution: entry.execution as string,
        decisionTime: entry.decisionTime as number,
        decisionPrice: entry.decisionPrice as number,
        setupId: entry.setupId as number,
        activationTime: entry.activationTime as number,
        activationPrice: entry.activationPrice as number,
        referenceHigh: entry.referenceHigh as number,
        trailingLow: entry.trailingLow as number,
        reboundTrigger: entry.reboundTrigger as number,
        shares: position.shares,
        investment: position.investment,
        isOpen: position.isOpen,
        exitTimestamp: position.exitTimestamp,
        exitPrice: position.exitPrice,
        exitTime: exit?.time as number | undefined,
        exitBar: exit?.barIndex as number | undefined,
        exitExecution: exit?.execution as string | undefined,
        reason: position.isOpen ? 'open' : (exit.reason as string),
        exitStopPrice: exit?.stopPrice as number | undefined,
        maximumHoldDue: exit?.isMaximumHoldDue as boolean | undefined,
        signalTime: exit?.bufferedLossSignal?.decisionTime as number | undefined,
        signalPrice: exit?.bufferedLossSignal?.decisionPrice as number | undefined,
        interest: position.interest,
        profit: position.profit,
        legs
      };
    });

    return {
      trades,
      summary: summary as Record<string, unknown>,
      dailyMarks,
      setups: (result.setups as { id: number; status: string; statusReason: string }[]).map((setup) => ({
        id: setup.id,
        status: setup.status,
        statusReason: setup.statusReason
      }))
    };
  } finally {
    console.info = info;

    for (const key of Object.keys(module.injected)) {
      delete module.injected[key];
    }

    await fs.remove(outDir);
  }
};

const same = (a: unknown, b: unknown) =>
  (typeof a === 'number' && typeof b === 'number' && Number.isNaN(a) && Number.isNaN(b)) || a === b;

export const runParityCase = async (ds: Dataset, sessions: MarketSession[], parityCase: ParityCase) => {
  const family = families[sourceOf[parityCase.key]]!;
  const endIndex = lastIndexOnOrBefore(ds, parityCase.endDate);
  const { params } = parityCase;
  const settings: RunSettings = {
    stopFill: parityCase.stopFill,
    marginInterestRate: parityCase.marginInterestRate,
    investment: 100000,
    firstIndex: 0,
    armStart: Math.max(params.tickWindowSize, parityCase.armStart ?? 0),
    endIndex
  };
  const result = simulate(ds, computeReferenceHighs(ds, params.tickWindowSize), family.flags, params, settings, true);
  const accounting = replay(ds, result.trades, {
    firstIndex: 0,
    endIndex,
    marginInterestRate: settings.marginInterestRate,
    dailyMarks: true
  });
  const source = await runSource(parityCase, sessions.slice(0, endIndex + 1));
  const mismatches: string[] = [];
  const check = (label: string, engineValue: unknown, sourceValue: unknown) => {
    if (!same(engineValue, sourceValue)) {
      mismatches.push(`${label}: engine ${String(engineValue)} vs source ${String(sourceValue)}`);
    }
  };
  let maxProfitDifference = 0;
  const near = (label: string, engineValue: number, sourceValue: number) => {
    const difference = Math.abs(engineValue - sourceValue);

    maxProfitDifference = Math.max(maxProfitDifference, difference);

    if (!(difference <= tolerance)) {
      mismatches.push(`${label}: engine ${engineValue} vs source ${sourceValue}`);
    }
  };

  check('trade count', result.trades.length, source.trades.length);

  result.trades.forEach((trade, index) => {
    const other = source.trades[index];

    if (!other) {
      return;
    }

    const outcome = accounting.outcomes[index]!;
    const label = `trade ${index + 1}`;

    check(`${label} entry date`, ds.dates[trade.entryIndex], other.entryDate);
    check(`${label} entry timestamp`, trade.entryTimestamp, other.entryTimestamp);
    check(`${label} entry price`, trade.entryPrice, other.entryPrice);
    check(`${label} entry time`, trade.entryTime, other.entryTime);
    check(`${label} entry minute`, trade.entryBar, other.entryBar);
    check(`${label} entry execution`, trade.entryExecution, other.entryExecution);
    check(`${label} decision time`, trade.decisionTime, other.decisionTime);
    check(`${label} decision price`, trade.decisionPrice, other.decisionPrice);
    check(`${label} setup`, trade.setupId, other.setupId);
    check(`${label} activation time`, trade.activationTime, other.activationTime);
    check(`${label} activation price`, trade.activationPrice, other.activationPrice);
    check(`${label} reference high`, trade.referenceHigh, other.referenceHigh);
    check(`${label} trailing low`, trade.trailingLow, other.trailingLow);
    check(`${label} rebound trigger`, trade.reboundTrigger, other.reboundTrigger);
    check(`${label} shares`, trade.shares, other.shares);
    check(`${label} investment`, trade.investment, other.investment);
    check(`${label} open`, trade.exitIndex < 0, other.isOpen);
    check(`${label} reason`, trade.reason, other.reason);

    if (other.legs) {
      check(`${label} legs`, trade.legs.length, other.legs.length);
      trade.legs.forEach((leg, legIndex) => {
        const otherLeg = other.legs![legIndex];

        if (!otherLeg) {
          return;
        }

        check(`${label} leg ${legIndex + 1} date`, ds.dates[leg.entryIndex], otherLeg.date);
        check(`${label} leg ${legIndex + 1} minute`, leg.entryBar, otherLeg.barIndex);
        check(`${label} leg ${legIndex + 1} time`, leg.entryTime, otherLeg.time);
        check(`${label} leg ${legIndex + 1} price`, leg.entryPrice, otherLeg.price);
        check(`${label} leg ${legIndex + 1} execution`, leg.entryExecution, otherLeg.execution);
        check(`${label} leg ${legIndex + 1} decision time`, leg.decisionTime, otherLeg.decisionTime);
        check(`${label} leg ${legIndex + 1} decision price`, leg.decisionPrice, otherLeg.decisionPrice);
        check(`${label} leg ${legIndex + 1} investment`, leg.investment, otherLeg.investment);
        check(`${label} leg ${legIndex + 1} shares`, leg.shares, otherLeg.shares);
        check(`${label} leg ${legIndex + 1} entry timestamp`, leg.entryTimestamp, otherLeg.entryTimestamp);
      });
    } else {
      check(`${label} legs`, trade.legs.length, 1);
    }

    if (trade.exitIndex >= 0 && !other.isOpen) {
      check(`${label} exit date`, ds.dates[trade.exitIndex], formatDate(other.exitTimestamp!));
      check(`${label} exit price`, trade.exitPrice, other.exitPrice);
      check(`${label} exit time`, trade.exitTime, other.exitTime);
      check(`${label} exit minute`, trade.exitBar, other.exitBar);
      check(`${label} exit execution`, trade.exitExecution, other.exitExecution);
      check(`${label} exit stop`, trade.exitStopPrice, other.exitStopPrice);
      check(`${label} maximum hold due`, trade.maximumHoldDue, other.maximumHoldDue);
      check(
        `${label} signal time`,
        Number.isNaN(trade.bufferSignalTime) ? undefined : trade.bufferSignalTime,
        other.signalTime
      );
      check(
        `${label} signal price`,
        Number.isNaN(trade.bufferSignalPrice) ? undefined : trade.bufferSignalPrice,
        other.signalPrice
      );
      near(`${label} interest`, outcome.interest, other.interest!);
      near(`${label} profit`, outcome.profit, other.profit!);
    }
  });

  const summary = source.summary as Record<string, number | boolean | null | object>;

  near('net profit', accounting.netProfit, summary.netProfit as number);
  near('realized profit', accounting.realizedProfit, summary.realizedProfit as number);
  near('unrealized profit', accounting.unrealizedProfit, summary.unrealizedProfit as number);
  near('margin interest', accounting.closedInterest + accounting.accruedInterest, summary.marginInterest as number);
  near('daily drawdown', accounting.dailyDrawdown.maximum, summary.maximumDrawdown as number);
  near('minute drawdown', accounting.minuteDrawdown.maximum, summary.minuteMaximumDrawdown as number);
  check('daily drawdown peak', formatDate(accounting.dailyDrawdown.peakTime), summary.drawdownPeakDate);
  check('daily drawdown trough', formatDate(accounting.dailyDrawdown.troughTime), summary.drawdownTroughDate);
  check(
    'minute drawdown peak',
    new Date(accounting.minuteDrawdown.peakTime * 1000).toISOString(),
    summary.minuteDrawdownPeakTime
  );
  check(
    'minute drawdown trough',
    new Date(accounting.minuteDrawdown.troughTime * 1000).toISOString(),
    summary.minuteDrawdownTroughTime
  );
  check('sessions', endIndex + 1, summary.sessions);
  check('closed trades', result.trades.filter((trade) => trade.exitIndex >= 0).length, summary.closedTrades);
  check(
    'open at end',
    result.trades.some((trade) => trade.exitIndex < 0),
    summary.openAtEnd
  );

  const { counts } = result;
  const countChecks: [string, number | boolean, string][] = [
    ['entries without trade', counts.entriesWithoutTrade, 'entriesWithoutTrade'],
    ['setup activations', counts.setupActivations, 'setupActivations'],
    ['setup fills', counts.setupFills, 'setupFills'],
    ['armed at end', counts.armedAtEnd, 'armedAtEnd'],
    ['pending at end', counts.pendingAtEnd, 'pendingAtEnd'],
    ['rebound signals', counts.reboundSignals, 'reboundSignals'],
    ['overnight orders', counts.overnightOrders, 'overnightOrders'],
    ['losing exits', counts.losingExits, 'losingExits'],
    ['buffered loss exits', counts.bufferedLossExits, 'bufferedLossExits']
  ];
  const flags = family.flags;

  if (flags.invalidation) {
    countChecks.push(['invalidation exits', counts.invalidationExits, 'invalidationExits']);
  }

  if (flags.episodeBudget) {
    countChecks.push(
      ['episodes started', counts.episodesStarted, 'episodesStarted'],
      ['episodes exhausted', counts.episodesExhausted, 'episodesExhausted'],
      ['episode resets', counts.episodeResets, 'episodeResets'],
      ['sessions blocked', counts.sessionsBlockedByBudget, 'sessionsBlockedByBudget']
    );
  }

  if (flags.staged) {
    countChecks.push(
      ['adds', counts.adds, 'adds'],
      ['adds cancelled', counts.addsCancelled, 'addsCancelled'],
      ['pending add at end', counts.pendingAddAtEnd, 'pendingAddAtEnd']
    );
  }

  if (flags.progressHold) {
    countChecks.push(['extended hold sessions', counts.extendedHoldSessions, 'extendedHoldSessions']);
  }

  if (flags.persistence) {
    countChecks.push(['persistence resets', counts.persistenceResets, 'persistenceResets']);
  }

  for (const [label, engineValue, field] of countChecks) {
    check(label, engineValue, summary[field]);
  }

  check('pending buffered exit at end', counts.pendingBufferedExitAtEnd, summary.pendingBufferedExitAtEnd !== null);

  const engineSetups = result.setups ?? [];

  check('setup records', engineSetups.length, source.setups.length);
  engineSetups.forEach((setup, index) => {
    const other = source.setups[index];

    check(`setup ${setup.id} status`, setup.status, other?.status);
    check(`setup ${setup.id} status reason`, setup.statusReason, other?.statusReason);
  });

  let maxMarkDifference = 0;

  for (let s = 0; s <= endIndex; s++) {
    const sourceMark = source.dailyMarks.get(ds.dates[s]!);
    const engineMark = accounting.dailyMarks![s]!;
    const difference = Math.abs(engineMark - (sourceMark ?? NaN));

    maxMarkDifference = Math.max(maxMarkDifference, Number.isNaN(difference) ? Infinity : difference);

    if (!(difference <= tolerance)) {
      mismatches.push(`daily mark ${ds.dates[s]}: engine ${engineMark} vs source ${sourceMark}`);
    }
  }

  check('daily rows', endIndex + 1, source.dailyMarks.size);

  return {
    name: parityCase.name,
    key: parityCase.key,
    ok: mismatches.length === 0,
    trades: result.trades.length,
    sourceNet: summary.netProfit as number,
    engineNet: accounting.netProfit,
    engineMinuteDrawdown: accounting.minuteDrawdown.maximum,
    maxProfitDifference,
    maxMarkDifference,
    mismatches: mismatches.slice(0, 20)
  };
};

// The file's own constants as engine parameters (read from the source text), for the default cases.
export const fileDefaults = async (key: VariantSourceKey): Promise<StrategyParams> => {
  const text = await fs.readFile(variantSourceFiles[key], 'utf8');
  const literal = (name: string, pattern = `const ${name} = ([0-9.]+);`) => {
    const match = text.match(new RegExp(pattern));

    return match ? Number(match[1]) : NaN;
  };
  const optionDefault = (name: string) => literal(name, `const ${name} = ${name}Option \\?\\? ([0-9.]+);`);

  return {
    targetPercentChange: optionDefault('targetPercentChange'),
    trailingBuyPercentage: optionDefault('trailingBuyPercentage'),
    trailingStopPercentage: literal('trailingStopPercentage'),
    maximumHoldDays: literal('maximumHoldDays'),
    tickWindowSize: literal('tickWindowSize'),
    materialLossThreshold: NaN,
    lowerPriceReentry: NaN,
    retraceFraction: NaN,
    intradayLossBuffer: optionDefault('intradayLossBuffer'),
    invalidationBuffer: literal('invalidationBuffer'),
    episodeLossBudget: literal('episodeLossBudget'),
    episodeResetRetrace: literal('episodeResetRetrace'),
    reboundDepthSlope: literal('reboundDepthSlope'),
    initialFraction: literal('initialFraction'),
    addTrigger: literal('addTrigger'),
    progressThreshold: literal('progressThreshold'),
    holdExtensionDays: literal('holdExtensionDays'),
    confirmMinutes: literal('confirmMinutes')
  };
};

export const randomLatticeParams = (rng: Rng, family: Family): IntParams =>
  genomeToParams(
    family,
    familySpecs(family).map((spec) => rng.int(gridSize(spec)))
  );

export const parityCases = async (ds: Dataset, vectors: number, endDate: string, full: boolean) => {
  const cases: ParityCase[] = [];
  const rng = Rng.from('trailing-buy-variants', 'parity', full ? 'full' : 'research');

  for (const key of Object.keys(variantSourceFiles) as VariantSourceKey[]) {
    const defaults = await fileDefaults(key);

    for (const stopFill of ['stop', 'next-open'] as const) {
      cases.push({
        name: `${key} file defaults, ${stopFill}, ${full ? 'full file' : 'research view'}`,
        key,
        endDate,
        stopFill,
        params: defaults,
        inject: false,
        marginInterestRate: 0.11,
        omitOverrides: true
      });
    }

    if (full) {
      continue;
    }

    const family = families[sourceOf[key]]!;

    for (let index = 0; index < vectors; index++) {
      const params = toStrategyParams(family, randomLatticeParams(rng, family));

      cases.push({
        name: `${key} lattice vector ${index + 1}`,
        key,
        endDate,
        stopFill: rng.next() < 0.5 ? 'stop' : 'next-open',
        params,
        inject: true,
        armStart: rng.next() < 0.5 ? protocol.eligibilityIndex : undefined,
        marginInterestRate: [0.08, 0.11, 0.14][rng.int(3)]!
      });
    }
  }

  void ds;

  return cases;
};

export const runParity = async (args: string[], log: (message: string) => void) => {
  const index = args.indexOf('--vectors');
  const vectors = index >= 0 ? Number(args[index + 1]) : 8;
  const full = args.includes('--full');
  const copies = await Promise.all((Object.keys(variantSourceFiles) as VariantSourceKey[]).map(generateVariantCopy));

  for (const copy of copies) {
    log(
      `${copy.source} -> ${copy.target} (${copy.constants.length} constants injectable, source ${copy.sourceHash.slice(0, 12)})`
    );
  }

  let ds: Dataset;
  let sessions: MarketSession[];

  if (full) {
    sessions = await loadSessions(protocol.dataFile);
    ds = fixtureDataset(sessions);
  } else {
    const research = await loadResearch();

    ds = research.ds;
    sessions = research.sessions;
  }

  const cases = await parityCases(ds, vectors, ds.lastDate, full);
  const outcomes = [];

  for (const parityCase of cases) {
    const outcome = await runParityCase(ds, sessions, parityCase);

    outcomes.push(outcome);
    log(
      `${outcome.ok ? 'PASS' : 'FAIL'} ${outcome.name}: ${outcome.trades} trades, net ${outcome.engineNet.toFixed(0)}, max profit diff ${outcome.maxProfitDifference.toExponential(2)}, max mark diff ${outcome.maxMarkDifference.toExponential(2)}${outcome.ok ? '' : `\n  ${outcome.mismatches.join('\n  ')}`}`
    );
  }

  const passed = outcomes.every((outcome) => outcome.ok);
  const file = path.join(resultsRoot, 'parity', full ? 'parity-full.json' : 'parity.json');
  const previous = (await fs.pathExists(file)) ? await readJson<Record<string, unknown>[]>(file).catch(() => []) : [];

  void previous;
  await writeJson(file, {
    generatedAt: new Date().toISOString(),
    passed,
    cases: outcomes.length,
    failures: outcomes.filter((outcome) => !outcome.ok).length,
    vectorsPerFile: full ? 0 : vectors,
    dataLastDate: ds.lastDate,
    sourceHashes: Object.fromEntries(copies.map((copy) => [copy.key, copy.sourceHash])),
    outcomes
  });
  log(
    `Parity ${passed ? 'PASSED' : 'FAILED'}: ${outcomes.length - outcomes.filter((outcome) => !outcome.ok).length}/${outcomes.length} cases`
  );

  if (!passed) {
    process.exitCode = 1;
  }
};
