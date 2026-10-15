// Test helpers for the minute optimizer: hand-written minute sessions written as Alpaca-format CSV files,
// and runners for the original, the working copy and the fast engine on them.
import fs from 'fs-extra';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { newYorkOffset } from '#lib';
import type { MarketSession } from '#types';
import type { AllInResult, MinuteParams } from '../../app/allIn-minute-optimizable.ts';
import { writeOriginalVariant } from '../goldenMaster.ts';
import { buildDataset, loadSessions } from '../data.ts';
import { type StopFill, computeReferenceHighs, simulate } from '../engine.ts';
import { runReference } from '../reference.ts';

export const tempDir = async (label: string) => fs.mkdtemp(path.join(os.tmpdir(), `minute-optimizer-${label}-`));

export interface HandBar {
  at: string; // New York wall-clock HH:MM, the minute's start
  open: number;
  high: number;
  low: number;
  close: number;
}

export interface HandSession {
  date: string;
  bars: HandBar[];
  closingPrint?: number; // at 16:00, or 13:00 on an early-close date
  closeAt?: string; // default 16:00
}

const utcOf = (date: string, at: string) => {
  const [hours, minutes] = at.split(':').map(Number) as [number, number];
  const midnight = Date.parse(date) / 1000;
  const local = midnight + (hours * 60 + minutes) * 60;

  return local - newYorkOffset(local - newYorkOffset(midnight + 12 * 3600));
};

const iso = (time: number) => `"${new Date(time * 1000).toISOString().replace('.000', '')}"`;

export const writeHandCsv = async (dir: string, name: string, sessions: HandSession[]) => {
  const rows: [number, string][] = [];

  for (const session of sessions) {
    for (const bar of session.bars) {
      const time = utcOf(session.date, bar.at);

      rows.push([time, `${iso(time)},${bar.open},${bar.high},${bar.low},${bar.close},1000`]);
    }

    if (session.closingPrint !== undefined) {
      const print = session.closingPrint;
      const time = utcOf(session.date, session.closeAt ?? '16:00');

      rows.push([time, `${iso(time)},${print},${print},${print},${print},5000`]);
    }
  }

  rows.sort((a, b) => a[0] - b[0]);

  const file = path.join(dir, `${name}.csv`);

  await fs.writeFile(file, `${rows.map(([, row]) => row).join('\n')}\n`);

  return file;
};

// A flat session at `price`: open, a few minutes, the 15:58 and 15:59 minutes and a closing print.
export const flatSession = (date: string, price: number, extra: Partial<HandSession> = {}): HandSession => ({
  date,
  bars: [
    { at: '09:30', open: price, high: price, low: price, close: price },
    { at: '12:00', open: price, high: price, low: price, close: price },
    { at: '15:58', open: price, high: price, low: price, close: price },
    { at: '15:59', open: price, high: price, low: price, close: price }
  ],
  closingPrint: price,
  ...extra
});

type OriginalModule = {
  runAllIn: (options: Record<string, unknown>) => Promise<AllInResult>;
};

// The original allIn.ts, or a scratch variant of it with other constants (written inside the repository so
// that its '#lib' and '#types' imports resolve), run on a CSV file with its console output silenced.
export const runOriginalQuietly = async (file: string, params?: MinuteParams, stopFill: StopFill = 'stop') => {
  const moduleFile = params
    ? await writeOriginalVariant(params, 'research/vgt-minute-optimizer/tmp/test-variants')
    : path.resolve('src/app/allIn.ts');
  const original = (await import(pathToFileURL(moduleFile).href)) as OriginalModule;
  const info = console.info;

  console.info = () => {};

  try {
    return await original.runAllIn({ dataFile: file, stopFill });
  } finally {
    console.info = info;
  }
};

export const runEngineOn = (sessions: MarketSession[], params: MinuteParams, stopFill: StopFill = 'stop') => {
  const dataset = buildDataset(sessions, 'TEST', 'test');

  return {
    dataset,
    result: simulate(
      dataset,
      computeReferenceHighs(dataset.sHigh, params.lookbackSessions, 0),
      params,
      { historyStart: 0, startIndex: 0, endIndex: dataset.sessionCount - 1 },
      { stopFill, costBps: [5, 10, 20] },
      true
    )
  };
};

export const runAll = async (file: string, params: MinuteParams, stopFill: StopFill = 'stop') => {
  const sessions = await loadSessions(file, 'TEST');
  const reference = await runReference(sessions, { params, stopFill, costBps: [5, 10, 20] });
  const engine = runEngineOn(sessions, params, stopFill);

  return { sessions, reference, ...engine };
};
