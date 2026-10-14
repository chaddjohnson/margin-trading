// Writes the regular sessions aggregated from the minute file as a daily file in the pipe-separated format
// that loadCsvBacktestData reads, so the original daily implementation can run on the same raw prices.
// Usage: node --experimental-transform-types research/risk-management/allin-minute-conversion/scripts/aggregate-sessions.ts <minute csv> <output csv>
import { groupMarketSessions, loadCsvMinuteBacktestData } from '#lib';
import fs from 'fs-extra';

const [, , input = 'data/VGT/VGT-2016-2025-1-minute.csv', output = 'VGT-sessions-from-minute.csv'] = process.argv;
const sessions = groupMarketSessions(await loadCsvMinuteBacktestData('VGT', input));
const lines = sessions.map((session) =>
  [session.date, session.open, session.high, session.low, session.close, session.volume].join('|')
);

await fs.writeFile(output, `${lines.join('\n')}\n`);
console.info(`Wrote ${sessions.length} sessions from ${sessions[0]?.date} to ${sessions.at(-1)?.date} to ${output}`);
