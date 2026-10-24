// The research engine against the shipped D1 file on each candidate's canonical training partition (PROTOCOL.md §4):
// the file run through its own entry point on `training` (split-adjusted once by the shared loader, arming at its own
// tickWindowSize) and the d1-refinement engine on the study's training view with the same arming, compared trade by
// trade with the eight-ETF program's comparison (sessions, minutes, prices, executions, reasons, profits, interest,
// totals, both drawdowns). Training only; the file's own outputs go to results/parity/<SYMBOL>/file-output/.
import path from 'node:path';
import { d1Values } from '../d1-refinement/families.ts';
import { compareFileToEngine, runFile } from '../multi-etf-d1/baseline.ts';
import { cachesFor, evaluateOne, fileNativeSpec } from '../multi-etf-d1/evaluation.ts';
import { d1Params } from '../multi-etf-d1/space.ts';
import { candidates, formatDollars, log, stageDir, writeJson } from './context.ts';
import { trainingTickerData } from './data.ts';

export const runParity = async (symbols: readonly string[] = candidates) => {
  const outcomes = [];

  for (const symbol of symbols) {
    const data = await trainingTickerData(symbol);
    const dir = stageDir('parity', symbol);
    const file = await runFile(symbol, 'training', path.join(dir, 'file-output'));
    const engine = evaluateOne(
      data.ds,
      cachesFor(data.ds),
      d1Params(),
      fileNativeSpec(data, d1Values.tickWindowSize!),
      true
    );
    const parity = compareFileToEngine(data.ds, file, engine.detail!.trades, engine.detail!.accounting);

    outcomes.push({ symbol, dataHash: data.dataHash, ...parity });
    log(
      `${symbol}: file ${parity.trades} trades ${formatDollars(parity.fileNet)}, engine ${parity.engineTrades} trades ${formatDollars(parity.engineNet)}; ${parity.differences.length} differences`
    );
  }

  await writeJson(stageDir('parity', 'parity.json'), outcomes);

  const failures = outcomes.filter((outcome) => outcome.differences.length > 0);

  if (failures.length > 0) {
    throw new Error(`Engine/file parity failed for ${failures.map((outcome) => outcome.symbol).join(', ')}`);
  }

  return outcomes;
};
