// Stage 5 risk (PROTOCOL.md §8): matched-horizon risk of each standalone slot (View U all 61 on T, A, B; View P per
// fold), of B4 and B5 (with the capacity cost of their losing lots), and of the portfolio overlay (C0, S, B4, B5), on
// windows T, A and B. Scenario risk is in the replay records.
import fs from 'fs-extra';
import type { NUniverse } from '../portfolio-aware-d1/nbook/engine.ts';
import {
  type BaselineKey,
  type ViewKey,
  type WindowKey,
  baselines,
  log,
  nowIso,
  resultFile,
  study,
  vgtPrimaryGrid,
  windows
} from './context.ts';
import { loadUniverse, universeSymbols } from './doors.ts';
import { runBooks, runCore } from './engine.ts';
import { refuseOverrides, requireCodeFrozen, requireProtected } from './freeze.ts';
import { replayGate } from './gate.ts';
import { MinuteGrid } from './grid.ts';
import { gateTradeOf, tradeRecordsOf } from './ledger.ts';
import { replaysFile } from './replayStage.ts';
import { readSealed, writeGz, writeRecord } from './records.ts';
import { fixedRiskOf, portfolioRiskOf } from './risk.ts';
import { bookOf, incumbentBooks, viewBooks, viewMembers } from './sources.ts';

export const riskFile = resultFile('risk', 'RISK.json');

// The capacity cost of a pool's losing lots: the slot-minutes they held, and the decisions of the pool's books refused
// while they held it (count and those trades' standalone nets).
export const capacityCostOf = (
  universe: NUniverse,
  records: ReturnType<typeof tradeRecordsOf>,
  boundaryIndex: number
) => {
  const grid = new MinuteGrid(universe.instruments.VGT!.ds);
  const outcomes = replayGate(records.map(gateTradeOf));
  const byKey = new Map(records.map((record) => [`${record.symbol}@${record.decisionTime}`, record]));
  const funded = records.filter((record) => record.fundedLot > 0 && record.entryIndex > boundaryIndex);
  const losing = funded.filter((record) => record.net <= 0);
  const losingKeys = new Set(losing.map((record) => `${record.symbol}@${record.decisionTime}`));
  const refusedUnderLosing = outcomes.filter(
    (outcome) => !outcome.granted && outcome.holder && losingKeys.has(outcome.holder)
  );
  const minutesOf = (record: (typeof records)[number]) =>
    (record.open ? grid.total : grid.coordinate(record.exitTime)) - grid.coordinate(record.decisionTime);

  return {
    fundedLots: funded.length,
    losingLots: losing.length,
    losingLotNet: losing.reduce((total, record) => total + record.net, 0),
    losingSlotMinutes: losing.reduce((total, record) => total + minutesOf(record), 0),
    allSlotMinutes: funded.reduce((total, record) => total + minutesOf(record), 0),
    refusedWhileLosingLotHeld: refusedUnderLosing.length,
    refusedWhileLosingLotHeldNet: refusedUnderLosing.reduce(
      (total, outcome) => total + byKey.get(outcome.trade.key)!.net,
      0
    ),
    refusedWhileLosingLotHeldPositive: refusedUnderLosing.filter((outcome) => byKey.get(outcome.trade.key)!.net > 0)
      .length
  };
};

const horizons: { window: WindowKey; end: string; boundary?: string }[] = [
  { window: 'T', end: windows.T.dataEnd },
  { window: 'A', end: windows.A.dataEnd, boundary: windows.A.boundary },
  { window: 'B', end: windows.B.dataEnd, boundary: windows.B.boundary }
];

export const stageRisk = async () => {
  refuseOverrides();

  const { protocol, code } = await requireCodeFrozen();

  await requireProtected();
  await readSealed(replaysFile);

  if (await fs.pathExists(riskFile)) {
    throw new Error(`${riskFile} exists`);
  }

  const startedAt = nowIso();
  const symbols = await universeSymbols();
  const standalone: Record<string, unknown> = {};
  const pools: Record<string, unknown> = {};
  const portfolios: Record<string, unknown> = {};

  for (const end of [windows.A.dataEnd, windows.T.dataEnd]) {
    const atEnd = horizons.filter((horizon) => horizon.end === end);
    const pView: ViewKey = end === windows.A.dataEnd ? 'P-A' : 'P-B';
    const { loaded } = await loadUniverse(symbols, end, ['U', 'I', pView]);
    const universe = loaded.universe;
    const pBooks = viewBooks(await viewMembers(pView));

    for (const horizon of atEnd) {
      const rows: Record<string, unknown> = {};

      for (const symbol of symbols) {
        const result = runBooks(
          universe,
          { [symbol]: bookOf(symbol, 'U', { ...vgtPrimaryGrid }) },
          { key: `U:${symbol}`, mode: 'fixed', costBps: study.costBps }
        );

        rows[symbol] = fixedRiskOf(result, study.costBps, horizon.boundary);
      }

      standalone[`U-${horizon.window}`] = rows;

      if (horizon.window !== 'T') {
        const pRows: Record<string, unknown> = {};

        for (const { row, book } of pBooks) {
          const result = runBooks(
            universe,
            { [row.symbol]: book },
            { key: `${pView}:${row.symbol}`, mode: 'fixed', costBps: study.costBps }
          );

          pRows[row.symbol] = fixedRiskOf(result, study.costBps, horizon.boundary);
        }

        standalone[`${pView}-${horizon.window}`] = pRows;
      }

      for (const id of baselines) {
        const { phenotypes } = await incumbentBooks(id as BaselineKey);
        const result = runBooks(universe, phenotypes, { key: id, mode: 'fixed', costBps: study.costBps });
        const b = horizon.boundary ? universe.dates.indexOf(horizon.boundary) : -1;

        pools[`${id}-${horizon.window}`] = {
          risk: fixedRiskOf(result, study.costBps, horizon.boundary),
          capacity: capacityCostOf(universe, tradeRecordsOf(universe, result, study.costBps), b)
        };
      }

      const vgt = (await incumbentBooks('B4')).phenotypes.VGT!;
      const s = runBooks(universe, { VGT: vgt }, { key: 'S', mode: 'fixed', costBps: study.costBps });

      pools[`S-${horizon.window}`] = { risk: fixedRiskOf(s, study.costBps, horizon.boundary) };

      const core = runCore(universe, 'C0');

      portfolios[`C0-${horizon.window}`] = portfolioRiskOf(core, horizon.boundary);
      portfolios[`S-${horizon.window}`] = portfolioRiskOf(
        runBooks(universe, { VGT: vgt }, { key: 'S-portfolio', mode: 'portfolio', costBps: study.costBps }),
        horizon.boundary
      );

      for (const id of baselines) {
        const { phenotypes } = await incumbentBooks(id as BaselineKey);

        portfolios[`${id}-${horizon.window}`] = portfolioRiskOf(
          runBooks(universe, phenotypes, { key: `${id}-portfolio`, mode: 'portfolio', costBps: study.costBps }),
          horizon.boundary
        );
      }

      log(`risk ${horizon.window}: done`);
    }
  }

  const payload = await writeGz(resultFile('risk', 'risk.json.gz'), { standalone, pools, portfolios });

  return writeRecord(riskFile, {
    stage: 'risk',
    startedAt,
    finishedAt: nowIso(),
    guard: { protocolFreeze: protocol.bodyHash, codeFreeze: code.bodyHash },
    pools,
    portfolios,
    payload
  });
};
