// Data for the shared-margin portfolio program (research/vgt-shared-margin-portfolio): the VGT minute dataset
// (the repository's own loader and session grouping, as the strategy files), the aligned VOOG minute sessions,
// the distribution ledger derived by the earlier $400k study, and the audit that re-derives that ledger from the
// adjusted daily files. Nothing is repaired, interpolated or adjusted: every price in the account is raw.
import { createHash } from 'node:crypto';
import fs from 'fs-extra';
import type { MarketSession, Tick } from '#types';
import { groupMarketSessions, loadCsvMinuteBacktestData } from '#lib';
import { type Dataset, fixtureDataset } from '../four-family/data.ts';

export const files = {
  vgtMinute: 'data/VGT/VGT-2016-2025-1-minute.csv',
  voogMinute: 'data/VOOG/VOOG-2016-2025-1-minute.csv',
  distributions: 'research/risk-management/vgt-portfolio-margin/data/distributions.csv',
  vgtDaily: 'data/VGT/VGT-2016-2026.csv',
  voogDaily: 'data/VOOG/VOOG-2016-2026.csv'
} as const;

export const expectedHashes = {
  vgtMinute: '600322afbe3d837a4c66ec62acb39e16d707079f49ec18d77f947bcb24c7962f',
  voogMinute: 'f4ad4d72f39b157fce64e023f644c4648db840be39ce6979ff42a5818d278cc2',
  distributions: '30adf087e7f54927928c12a9d23e198d19336a7e6257df2e9be7e3fc70dba923'
} as const;

export type Etf = 'VOOG' | 'VGT';

export interface Distribution {
  etf: Etf;
  exDate: string;
  payDate: string;
  amount: number; // dollars per share
  amountMethod: string;
  exDateMethod: string;
  payDateMethod: string;
  closeBefore: number;
}

// VOOG's sessions aligned to the VGT dataset: the same dates in the same order, each with its minute bars.
export interface VoogData {
  sessions: MarketSession[];
  close: Float64Array; // the closing print, else the last regular trade
  hasClosingPrint: boolean[];
}

export interface ProgramData {
  ds: Dataset; // VGT
  vgtSessions: MarketSession[];
  voog: VoogData;
  distributions: Distribution[];
  hashes: Record<keyof typeof expectedHashes, string>;
  sessionIndex: Map<string, number>;
}

export const sha256File = async (file: string) =>
  createHash('sha256')
    .update(await fs.readFile(file))
    .digest('hex');

export const loadDistributions = async (file = files.distributions): Promise<Distribution[]> =>
  (await fs.readFile(file, 'utf8'))
    .trim()
    .split('\n')
    .slice(1)
    .map((line) => {
      const [etf, exDate, payDate, amount, amountMethod, exDateMethod, payDateMethod, closeBefore] = line.split(',');

      return {
        etf: etf as Etf,
        exDate: exDate!,
        payDate: payDate!,
        amount: Number(amount),
        amountMethod: amountMethod!,
        exDateMethod: exDateMethod!,
        payDateMethod: payDateMethod!,
        closeBefore: Number(closeBefore)
      };
    });

export const alignVoog = (vgtSessions: MarketSession[], voogSessions: MarketSession[]): VoogData => {
  if (voogSessions.length !== vgtSessions.length) {
    throw new Error(`VOOG has ${voogSessions.length} sessions, VGT ${vgtSessions.length}`);
  }

  voogSessions.forEach((session, index) => {
    if (session.date !== vgtSessions[index]!.date) {
      throw new Error(`Session ${index}: VOOG ${session.date} vs VGT ${vgtSessions[index]!.date}`);
    }
  });

  return {
    sessions: voogSessions,
    close: Float64Array.from(voogSessions, (session) => session.close),
    hasClosingPrint: voogSessions.map((session) => session.closingPrint !== undefined)
  };
};

export const loadProgramData = async ({ checkHashes = true } = {}): Promise<ProgramData> => {
  const hashes = {
    vgtMinute: await sha256File(files.vgtMinute),
    voogMinute: await sha256File(files.voogMinute),
    distributions: await sha256File(files.distributions)
  };

  if (checkHashes) {
    for (const key of Object.keys(expectedHashes) as (keyof typeof expectedHashes)[]) {
      if (hashes[key] !== expectedHashes[key]) {
        throw new Error(`${files[key]}: sha256 ${hashes[key]} differs from the protocol's ${expectedHashes[key]}`);
      }
    }
  }

  const vgtSessions = groupMarketSessions(await loadCsvMinuteBacktestData('VGT', files.vgtMinute));
  const voogSessions = groupMarketSessions(await loadCsvMinuteBacktestData('VOOG', files.voogMinute));
  const ds = fixtureDataset(vgtSessions);

  ds.id = `${hashes.vgtMinute.slice(0, 16)}:${ds.lastDate}`;
  ds.dataHash = hashes.vgtMinute;

  return {
    ds,
    vgtSessions,
    voog: alignVoog(vgtSessions, voogSessions),
    distributions: await loadDistributions(),
    hashes,
    sessionIndex: new Map(vgtSessions.map((session, index) => [session.date, index]))
  };
};

// VOOG's last completed minute at or before `time` in session s (its close), or undefined when none has traded yet.
export const voogLastCompletedClose = (voog: VoogData, s: number, time: number): Tick | undefined =>
  voog.sessions[s]!.bars.findLast((bar) => bar.time + 60 <= time);

export interface VoogFill {
  index: number; // session
  price: number;
  time: number;
  execution: 'first trade after decision' | 'closing print' | 'opening trade';
}

// The first VOOG trade at or after `time` that an order decided at `time` in session s can take: the open of the
// first later VOOG minute bar, the closing print when no later minute traded and the decision came before the
// close, else the next VOOG session's opening trade. Undefined only at the end of the data.
export const voogFirstTradeFrom = (voog: VoogData, s: number, time: number): VoogFill | undefined => {
  const session = voog.sessions[s]!;
  const bar = session.bars.find((candidate) => candidate.time >= time);

  if (bar) {
    return { index: s, price: bar.open, time: bar.time, execution: 'first trade after decision' };
  }

  if (session.closingPrint !== undefined && time < session.closeTime) {
    return { index: s, price: session.closingPrint, time: session.closeTime, execution: 'closing print' };
  }

  const next = voog.sessions[s + 1];

  return next && next.bars[0]
    ? { index: s + 1, price: next.bars[0].open, time: next.bars[0].time, execution: 'opening trade' }
    : undefined;
};

// A copy of the dataset with every VGT price from session `fromIndex` onwards multiplied by `factor` (stress
// paths). Volumes and times are unchanged.
export const shiftDataset = (ds: Dataset, fromIndex: number, factor: number): Dataset => {
  const copy: Dataset = {
    ...ds,
    id: `${ds.id}:shift${fromIndex}x${factor}`,
    sOpen: Float64Array.from(ds.sOpen),
    sHigh: Float64Array.from(ds.sHigh),
    sLow: Float64Array.from(ds.sLow),
    sClose: Float64Array.from(ds.sClose),
    sClosingPrint: Float64Array.from(ds.sClosingPrint),
    sMinClose: Float64Array.from(ds.sMinClose),
    bOpen: Float64Array.from(ds.bOpen),
    bHigh: Float64Array.from(ds.bHigh),
    bLow: Float64Array.from(ds.bLow),
    bClose: Float64Array.from(ds.bClose)
  };

  for (let s = fromIndex; s < ds.sessionCount; s++) {
    for (const array of [copy.sOpen, copy.sHigh, copy.sLow, copy.sClose, copy.sClosingPrint, copy.sMinClose]) {
      array[s] = array[s]! * factor;
    }

    const start = ds.sBarStart[s]!;
    const end = start + ds.sBarCount[s]!;

    for (let b = start; b < end; b++) {
      copy.bOpen[b] = copy.bOpen[b]! * factor;
      copy.bHigh[b] = copy.bHigh[b]! * factor;
      copy.bLow[b] = copy.bLow[b]! * factor;
      copy.bClose[b] = copy.bClose[b]! * factor;
    }
  }

  return copy;
};

// The same for VOOG's sessions.
export const shiftVoog = (voog: VoogData, fromIndex: number, factor: number): VoogData => {
  const sessions = voog.sessions.map((session, s) =>
    s < fromIndex
      ? session
      : {
          ...session,
          open: session.open * factor,
          high: session.high * factor,
          low: session.low * factor,
          close: session.close * factor,
          closingPrint: session.closingPrint === undefined ? undefined : session.closingPrint * factor,
          bars: session.bars.map((bar) => ({
            ...bar,
            open: bar.open * factor,
            high: bar.high * factor,
            low: bar.low * factor,
            close: bar.close * factor
          }))
        }
  );

  return {
    sessions,
    close: Float64Array.from(sessions, (session) => session.close),
    hasClosingPrint: voog.hasClosingPrint
  };
};

// ----- audit -----

interface DailyRow {
  date: string;
  close: number;
}

const loadDaily = async (file: string): Promise<DailyRow[]> =>
  (await fs.readFile(file, 'utf8'))
    .trim()
    .split('\n')
    .map((line) => line.split('|'))
    .filter((parts) => parts.length >= 5)
    .map((parts) => ({ date: parts[0]!, close: Number(parts[4]) }));

export interface DerivedStep {
  etf: Etf;
  exDate: string;
  amount: number;
  ratioBefore: number;
  ratioAfter: number;
}

// Re-derives the distribution ledger's ex-dates and amounts from the present adjusted daily files: the raw close ÷
// adjusted close ratio is constant between ex-dates and steps down by 1 − D / C_before on each ex-date. A step is
// flagged where the median ratio of the three sessions from a session onwards is more than 0.1% below the median of
// the three sessions before it; the amount uses those medians (the earlier program's method, which smooths the
// rounding of the adjusted prices on volatile days).
export const deriveDistributionSteps = async (
  etf: Etf,
  rawClose: Float64Array,
  dates: string[],
  dailyFile: string
): Promise<DerivedStep[]> => {
  const daily = new Map((await loadDaily(dailyFile)).map((row) => [row.date, row.close]));
  const ratios: { date: string; ratio: number; raw: number }[] = [];

  dates.forEach((date, s) => {
    const adjusted = daily.get(date);

    if (adjusted !== undefined && adjusted > 0) {
      ratios.push({ date, ratio: rawClose[s]! / adjusted, raw: rawClose[s]! });
    }
  });

  const median = (values: number[]) => {
    const sorted = [...values].sort((a, b) => a - b);

    return sorted[Math.floor(sorted.length / 2)]!;
  };
  const steps: DerivedStep[] = [];

  for (let i = 3; i + 2 < ratios.length; i++) {
    const before = median(ratios.slice(i - 3, i).map((row) => row.ratio));
    const after = median(ratios.slice(i, i + 3).map((row) => row.ratio));

    if (after < before * (1 - 0.001) && ratios[i]!.ratio < ratios[i - 1]!.ratio * (1 - 0.0005)) {
      steps.push({
        etf,
        exDate: ratios[i]!.date,
        amount: ratios[i - 1]!.raw * (1 - after / before),
        ratioBefore: before,
        ratioAfter: after
      });
      i += 2; // one step per ex-date
    }
  }

  return steps;
};

export interface AuditReport {
  hashes: Record<string, string>;
  sessions: number;
  firstDate: string;
  lastDate: string;
  vgtBars: number;
  voogBars: number;
  voogSessionsWithoutClosingPrint: number;
  voogMedianBarsPerSession: number;
  start: { vgtClose: number; vgtClosingPrint: boolean; voogClose: number; voogClosingPrint: boolean };
  distributions: {
    count: number;
    byEtf: Record<Etf, number>;
    estimatedAmounts: number;
    firstExDate: string;
    lastExDate: string;
  };
  derivation: {
    etf: Etf;
    steps: number;
    matchedExDates: number;
    amountMismatchesOver1Percent: { exDate: string; ledger: number; derived: number }[];
    sumAbsoluteDifference: number; // Σ |ledger − derived| over matched ex-dates, dollars per share
    sumLedgerAmounts: number; // Σ ledger amounts over matched ex-dates
    ledgerWithoutStep: string[];
    stepWithoutLedger: string[];
    maxStepRelative: number;
  }[];
}

export const audit = async (data: ProgramData): Promise<AuditReport> => {
  const { ds, voog, distributions } = data;
  const voogBars = voog.sessions.map((session) => session.bars.length).sort((a, b) => a - b);
  const derivation: AuditReport['derivation'] = [];

  for (const [etf, rawClose, file] of [
    ['VGT', ds.sClose, files.vgtDaily],
    ['VOOG', voog.close, files.voogDaily]
  ] as const) {
    const steps = await deriveDistributionSteps(etf, rawClose, ds.dates, file);
    const ledger = distributions.filter((row) => row.etf === etf);
    const stepByDate = new Map(steps.map((step) => [step.exDate, step]));
    const ledgerByDate = new Map(ledger.map((row) => [row.exDate, row]));
    const mismatches: { exDate: string; ledger: number; derived: number }[] = [];
    let matched = 0;
    let sumAbsoluteDifference = 0;
    let sumLedgerAmounts = 0;

    for (const row of ledger) {
      const step = stepByDate.get(row.exDate);

      if (step) {
        matched++;
        sumAbsoluteDifference += Math.abs(step.amount - row.amount);
        sumLedgerAmounts += row.amount;

        if (Math.abs(step.amount - row.amount) > 0.01 * row.amount) {
          mismatches.push({ exDate: row.exDate, ledger: row.amount, derived: step.amount });
        }
      }
    }

    derivation.push({
      etf,
      steps: steps.length,
      matchedExDates: matched,
      amountMismatchesOver1Percent: mismatches,
      sumAbsoluteDifference,
      sumLedgerAmounts,
      ledgerWithoutStep: ledger.filter((row) => !stepByDate.has(row.exDate)).map((row) => row.exDate),
      stepWithoutLedger: steps.filter((step) => !ledgerByDate.has(step.exDate)).map((step) => step.exDate),
      maxStepRelative: Math.max(0, ...steps.map((step) => 1 - step.ratioAfter / step.ratioBefore))
    });
  }

  return {
    hashes: data.hashes,
    sessions: ds.sessionCount,
    firstDate: ds.firstDate,
    lastDate: ds.lastDate,
    vgtBars: ds.barCount,
    voogBars: voogBars.reduce((total, count) => total + count, 0),
    voogSessionsWithoutClosingPrint: voog.hasClosingPrint.filter((has) => !has).length,
    voogMedianBarsPerSession: voogBars[Math.floor(voogBars.length / 2)]!,
    start: {
      vgtClose: ds.sClose[0]!,
      vgtClosingPrint: !Number.isNaN(ds.sClosingPrint[0]!),
      voogClose: voog.close[0]!,
      voogClosingPrint: voog.hasClosingPrint[0]!
    },
    distributions: {
      count: distributions.length,
      byEtf: {
        VOOG: distributions.filter((row) => row.etf === 'VOOG').length,
        VGT: distributions.filter((row) => row.etf === 'VGT').length
      },
      estimatedAmounts: distributions.filter((row) => row.amountMethod !== 'derived').length,
      firstExDate: distributions[0]?.exDate ?? '',
      lastExDate: distributions.at(-1)?.exDate ?? ''
    },
    derivation
  };
};
