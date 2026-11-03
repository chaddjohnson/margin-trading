// Swing-low C2 alone on a fixed $100,000 allocation, in the reporting format of the P2s backtest
//
// The frozen swing-low C2 strategy (src/app/allIn-trailingBuy-swingLow.ts: K 55 sessions, rebound 0.6%, Z 0%,
// stop 4%, hold 26 calendar days, buffer 0.4%) run alone through the shared-margin research engine
// (src/shared-margin-portfolio/, parity-checked against the strategy file) by the runner of
// allIn-trailingBuy-D1-swingLow-P2s.ts: no D1, no arbitration, $100,000 borrowed per trade at 11% simple interest,
// no compounding, no core portfolio or dividends.
//
// Eligibility: no setup arms before 2017-06-15 (session 365), the common date of the D1/P2s research. The strategy
// file itself arms from session 55 and takes one extra 2016 trade ($124,508 / 33 trades); under the common date the
// reference is $114,478.30 net / $16,705.88 minute-sampled drawdown / 32 trades.
//
// Usage: npm run app -- allIn-trailingBuy-swingLow-standalone [VGT] [-] [-] [-] [outDir]
import { runP2s } from './allIn-trailingBuy-D1-swingLow-P2s.ts';

export default async (symbol = 'VGT', startDate?: string, endDate?: string, dataFile?: string, outDir?: string) => {
  const optional = (value?: string) => (value === undefined || value === '-' || value === '' ? undefined : value);

  if (optional(startDate) || optional(endDate) || optional(dataFile)) {
    throw new Error('This backtest always runs the whole research dataset; pass - for startDate, endDate and dataFile');
  }

  await runP2s({ symbol, outDir: optional(outDir), only: 'swing' });
};
