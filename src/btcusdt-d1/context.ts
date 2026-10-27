// The BTCUSDT spot D1 study's fixed context: paths, the pinned environment and the account conventions. Everything
// that can change a result and is not a strategy parameter lives here or in the frozen protocol
// (research/btcusdt-d1/PROTOCOL.md); nothing here reads a credential, the network or `.env`.
import path from 'node:path';

export const study = {
  id: 'btcusdt-d1',
  version: 'btcusdt-d1-v1',
  node: 'v24.21.0',
  symbol: 'BTCUSDT',
  base: 'BTC',
  quote: 'USDT',
  // The study's own namespace roots (repository-relative).
  researchDir: 'research/btcusdt-d1',
  phenotypeDir: 'config/research-phenotypes/btcusdt-d1',
  evaluationsDir: 'evaluations/btcusdt-d1',
  // The raw source: read only, never written (DATA_AUDIT.md).
  rawFile: 'data/BTCUSDT/BTCUSDT-2017-2026.csv',
  // The canonical snapshot staged inside the research namespace (git-ignored, rebuilt deterministically).
  cacheDir: 'research/btcusdt-d1/cache'
} as const;

export const secondsPerMinute = 60;
export const secondsPerDay = 86400;

// The cash account (BTC_CLOCK_AND_EXECUTION.md §4): 100,000 USDT of equity, spot only, no borrowing, one position at
// a time, at most 100,000 USDT of gross quote notional per entry, cash earns nothing. USDT is the unit of account;
// "1 USDT = 1 unit" is an accounting convention, not a claim that USDT equals USD.
export const account = {
  initialEquity: 100000,
  notionalCap: 100000
} as const;

export const repoPath = (...parts: string[]) => path.join(process.cwd(), ...parts);
