// Post-seal, read-only check (amendment A2): the fast engine equals the independent reference for each fold's sealed
// pick P* on data through that fold's window end (the verdict-bearing runs, which S2 and S7 did not cover).
// Writes research/study3-vgt-momentum/audit/fold-pick-parity.json; never touches a sealed record.
//   node --experimental-transform-types --disable-warning=ExperimentalWarning research/study3-vgt-momentum/scripts/fold_pick_parity.ts
import fs from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { histories, study } from '../../../src/study3-vgt-momentum/context.ts';
import { indexOfDate, loadVgt } from '../../../src/study3-vgt-momentum/data.ts';
import { Engine } from '../../../src/study3-vgt-momentum/engine.ts';
import { compareWithReference } from '../../../src/study3-vgt-momentum/parity.ts';
import { templateSpec } from '../../../src/study3-vgt-momentum/specs.ts';

const rows = [];

for (const fold of ['A', 'B', 'C', 'D'] as const) {
  const record = JSON.parse(fs.readFileSync(`research/study3-vgt-momentum/results/records/develop-${fold}.json`, 'utf8'));
  const selection = JSON.parse(gunzipSync(fs.readFileSync(record.payloads.selection.file)).toString('utf8'));
  const pick = selection.champions.find((c: { id: string }) => c.id === selection.pStar);
  const { ds, door } = await loadVgt(histories[fold].window!.end);
  const e = indexOfDate(ds, study.firstDecisionClose);
  const outcome = compareWithReference(
    new Engine(ds),
    ds,
    templateSpec(pick.candidate),
    { costBps: 5, rate: 0.11, principal: 100000, stopSlippageBps: 0, entrySlippageBps: 0, delayMinutes: 0, firstDecisionIndex: e, endIndex: ds.sessionCount - 1 }
  );

  rows.push({ fold, pick: pick.id, dataEnd: door.lastDate, loadedBarsSha256: door.loadedBarsSha256, lots: outcome.trades, differences: outcome.differences, largest: outcome.largestMoneyDifference });
}

fs.writeFileSync('research/study3-vgt-momentum/audit/fold-pick-parity.json', `${JSON.stringify({ checkedAt: new Date().toISOString(), rows }, null, 1)}\n`);
console.log(rows.map((r) => `${r.fold} ${r.pick} lots ${r.lots} differences ${r.differences.length} largest ${r.largest}`).join('\n'));
