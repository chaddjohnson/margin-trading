// Golden master: the unmodified src/app/allIn.ts against the study engine's CLOSE_1M + STOP_DAILY at 0 bp,
// compared file by file on allIn.ts's own outputs. Legacy-start cases filter the session array to the
// window exactly as allIn.ts does; the whole-file case is also compared with the warm-start code path.
import { createHash } from 'node:crypto';
import fs from 'fs-extra';
import path from 'node:path';
import type { MarketSession } from '#types';
import { type StopFill, runAllIn } from '../app/allIn.ts';
import { policyById } from './constants.ts';
import { computeRecentHighs } from './data.ts';
import { simulate } from './engine.ts';
import { type LegacyFiles, legacyFiles, writeLegacyFiles } from './legacy.ts';

export interface GoldenCase {
  label: string;
  startDate?: string;
  endDate?: string;
  stopFill: StopFill;
}

export const goldenCases: GoldenCase[] = [
  { label: 'legacy-2016-10-07_2025-10-13-stop', startDate: '2016-10-07', endDate: '2025-10-13', stopFill: 'stop' },
  {
    label: 'legacy-2016-10-07_2025-10-13-next-open',
    startDate: '2016-10-07',
    endDate: '2025-10-13',
    stopFill: 'next-open'
  },
  { label: 'whole-file-stop', stopFill: 'stop' },
  { label: 'whole-file-next-open', stopFill: 'next-open' },
  { label: 'legacy-2024-01-02_2025-10-13-stop', startDate: '2024-01-02', endDate: '2025-10-13', stopFill: 'stop' },
  {
    label: 'legacy-2024-01-02_2025-10-13-next-open',
    startDate: '2024-01-02',
    endDate: '2025-10-13',
    stopFill: 'next-open'
  },
  { label: 'legacy-2020-01-02_2020-12-31-stop', startDate: '2020-01-02', endDate: '2020-12-31', stopFill: 'stop' }
];

const sha = (text: string) => createHash('sha256').update(text).digest('hex');

// allIn.ts reports through console.info; the golden master keeps that output in a file instead.
export const captureConsole = async <T>(run: () => Promise<T>): Promise<{ value: T; output: string }> => {
  const original = console.info;
  const lines: string[] = [];

  console.info = (...args: unknown[]) => lines.push(args.map(String).join(' '));

  try {
    return { value: await run(), output: lines.join('\n') };
  } finally {
    console.info = original;
  }
};

const windowOf = (sessions: readonly MarketSession[], startDate?: string, endDate?: string) => {
  const start = startDate ? Date.parse(startDate) / 1000 : -Infinity;
  const end = endDate ? Date.parse(endDate) / 1000 : Infinity;

  return sessions.filter((session) => session.time >= start && session.time <= end);
};

export interface GoldenCaseResult {
  label: string;
  startDate: string;
  endDate: string;
  stopFill: StopFill;
  files: Record<string, { allIn: string; engine: string; identical: boolean }>;
  identical: boolean;
  summary: Record<string, unknown>;
}

export const runGoldenCase = async (
  sessions: readonly MarketSession[],
  dataFile: string,
  goldenCase: GoldenCase,
  outDir?: string
): Promise<GoldenCaseResult> => {
  const tmp = outDir ?? (await fs.mkdtemp(path.join((await import('node:os')).tmpdir(), 'intraday-golden-')));
  const allInDir = path.join(tmp, goldenCase.label, 'allIn');
  const engineDir = path.join(tmp, goldenCase.label, 'engine');
  const { output } = await captureConsole(() =>
    runAllIn({
      symbol: 'VGT',
      startDate: goldenCase.startDate,
      endDate: goldenCase.endDate,
      dataFile,
      outDir: allInDir,
      stopFill: goldenCase.stopFill
    })
  );

  await fs.writeFile(path.join(allInDir, 'console.txt'), `${output}\n`);

  const windowSessions = windowOf(sessions, goldenCase.startDate, goldenCase.endDate);
  const result = simulate({
    sessions: windowSessions,
    recentHighs: computeRecentHighs(windowSessions),
    tradeStart: 1,
    endIndex: windowSessions.length - 1,
    legacy: true,
    policy: policyById('CLOSE_1M'),
    stopMode: 'STOP_DAILY',
    stopFill: goldenCase.stopFill,
    costsBps: [0]
  });
  const engineFiles = legacyFiles(result, windowSessions, { dataFile });

  await writeLegacyFiles(engineDir, engineFiles);

  const files: GoldenCaseResult['files'] = {};

  for (const name of Object.keys(engineFiles) as (keyof LegacyFiles)[]) {
    const original = await fs.readFile(path.join(allInDir, name), 'utf8');

    files[name] = { allIn: sha(original), engine: sha(engineFiles[name]), identical: original === engineFiles[name] };
  }

  return {
    label: goldenCase.label,
    startDate: goldenCase.startDate ?? '',
    endDate: goldenCase.endDate ?? '',
    stopFill: goldenCase.stopFill,
    files,
    identical: Object.values(files).every((file) => file.identical),
    summary: JSON.parse(engineFiles['summary.json'])
  };
};
