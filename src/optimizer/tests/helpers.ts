// Shared test helpers: synthetic datasets and temporary directories.
import fs from 'fs-extra';
import os from 'node:os';
import path from 'node:path';
import type { Manifest } from '../data/prepare.ts';
import type { DatasetArrays } from '../evaluate.ts';
import { type FixtureBar, sessionDates, writeFixture } from '../fixtures.ts';
import { Rng } from '../rng.ts';
import { buildSeries } from '../series.ts';

export const tempDir = async (label: string) => fs.mkdtemp(path.join(os.tmpdir(), `optimizer-${label}-`));

// A seeded random walk with occasional gaps, long enough for training and validation windows.
export const walkBars = (seed: number, start: string, count: number, volatility = 0.015): FixtureBar[] => {
  const rng = Rng.from('test-walk', seed);
  const dates = sessionDates(start, count);
  const bars: FixtureBar[] = [];
  let close = 100;

  for (let index = 0; index < count; index++) {
    const gap = rng.next() < 0.05 ? (rng.next() - 0.6) * 0.06 : 0;
    const open = close * (1 + gap);
    const next = Math.max(1, close * (1 + gap + (rng.next() - 0.495) * 2 * volatility));
    const high = Math.max(open, next) * (1 + rng.next() * volatility * 0.5);
    const low = Math.min(open, next) * (1 - rng.next() * volatility * 0.5);

    close = next;
    bars.push({ date: dates[index]!, open, high, low, close, volume: 1000 + index });
  }

  return bars;
};

export const datasetFromBars = (id: string, bars: FixtureBar[]): DatasetArrays => {
  const series = buildSeries(
    id,
    bars.map((bar) => ({ ...bar, time: Date.parse(bar.date) / 1000 })),
    'research',
    '9999-12-31',
    'test'
  );

  return {
    id,
    symbol: id,
    time: series.time,
    open: series.open,
    high: series.high,
    low: series.low,
    close: series.close,
    years: series.years
  };
};

// Writes bars as a processed file and returns a manifest that points at it.
export const fixtureManifest = async (dir: string, symbols: Record<string, FixtureBar[]>): Promise<Manifest> => {
  const manifest: Manifest = { version: 1, transformVersion: 'test', generatedAtUtc: '', entries: {} };

  for (const [symbol, bars] of Object.entries(symbols)) {
    const file = path.join(dir, `${symbol}.csv`);

    await writeFixture(file, bars);
    manifest.entries[symbol] = {
      symbol,
      stooqSymbol: symbol.toLowerCase(),
      status: 'ok',
      pageUrl: '',
      requestedStart: '',
      requestedEnd: '',
      adjustment: '',
      warnings: [],
      attempts: [],
      processed: {
        path: file,
        sha256: `sha-${symbol}`,
        bytes: 0,
        rows: bars.length,
        firstDate: bars[0]!.date,
        lastDate: bars.at(-1)!.date
      }
    };
  }

  return manifest;
};
