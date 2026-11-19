// `npm run intraday-d1 -- run`: the Intraday D1 strategy entry point for one parameter set (the parameter schema of
// PROTOCOL.md §2/§4, any values in range, not only grid points). It prints a summary and writes the per-trade ledger
// and the per-year table to an output directory (default evaluations/intraday-d1/<UTC time>/, git-ignored; never under
// research/). `--door development` reads only the 2016–2024 prefix; `--door full` (2016 → 2026-10-30, split-adjusted)
// opens only after this study's validation phase is sealed, so it can never leak into the study.
//
//   npm run intraday-d1 -- run --B 130 --X 0.0496 --Y 0.00045 --S 0.0098 --H 3948 --L 158 --U 0.007 --P 0.0007 --W 1291
//   npm run intraday-d1 -- run --candidate id-5.1v.e.1f.1y.t.1y.6.1f --door full --cost 10
import path from 'node:path';
import fs from 'fs-extra';
import { frozenSelectionFile, type Grid } from './context.ts';
import { loadDevelopmentSessions, loadValidationSessions } from './data.ts';
import { type ExecutionSettings, type StopFill, simulate } from './engine.ts';
import { baseSettings, doorView } from './lab.ts';
import { ledgerRows } from './ledger.ts';
import { minuteClock } from './periods.ts';
import { recordOf } from './records.ts';
import { readChain, readSealed, recordDoor, writeCsv } from './seal.ts';
import { type Values, engineParamsOf, valuesOf } from './space.ts';
import { tradeStats, yearTable } from './tables.ts';

const flag = (args: string[], name: string) => {
  const i = args.indexOf(`--${name}`);

  return i >= 0 ? args[i + 1] : undefined;
};

export const parseValues = (args: string[]): Values => {
  const num = (name: string) => {
    const text = flag(args, name);
    const value = Number(text);

    if (text === undefined || !Number.isFinite(value)) throw new Error(`--${name} is required and must be a number`);

    return value;
  };
  const values: Values = {
    periodMinutes: num('B'),
    targetPercentChange: num('X'),
    trailingBuyPercentage: num('Y'),
    trailingStopPercentage: num('S'),
    maximumHoldMinutes: num('H'),
    lookbackMinutes: num('L'),
    intradayLossBuffer: num('U'),
    pullback: num('P'),
    continuationMinutes: num('W')
  };
  const checks: [boolean, string][] = [
    [
      Number.isInteger(values.periodMinutes) && values.periodMinutes >= 1 && values.periodMinutes <= 390,
      'B: whole minutes 1–390'
    ],
    [values.targetPercentChange > 0 && values.targetPercentChange < 1, 'X: a fraction in (0, 1)'],
    [values.trailingBuyPercentage > 0 && values.trailingBuyPercentage < 1, 'Y: a fraction in (0, 1)'],
    [values.trailingStopPercentage > 0 && values.trailingStopPercentage < 1, 'S: a fraction in (0, 1)'],
    [values.maximumHoldMinutes >= 0, 'H: trading minutes ≥ 0'],
    [values.lookbackMinutes >= 1 && values.continuationMinutes >= 1, 'L, W: trading minutes ≥ 1'],
    [values.intradayLossBuffer >= 0 && values.intradayLossBuffer < 1, 'U: a fraction in [0, 1)'],
    [values.pullback >= 0 && values.pullback < 1, 'P: a fraction in [0, 1)']
  ];

  for (const [ok, message] of checks) if (!ok) throw new Error(`invalid parameter ${message}`);

  return values;
};

export const runOne = async (args: string[]) => {
  const door = flag(args, 'door') ?? 'development';
  const candidate = flag(args, 'candidate');
  let values: Values;

  if (candidate) {
    const qualification = await readSealed<{ candidates: { id: string; grid: Grid }[] }>(
      'research/intraday-d1-vgt/results/qualify/qualification.json'
    );
    const found = qualification.candidates.find((c) => c.id === candidate);

    if (!found) throw new Error(`${candidate} is not a frozen shortlist member`);

    values = valuesOf(found.grid);
  } else {
    values = parseValues(args);
  }

  const settings: ExecutionSettings = {
    ...baseSettings,
    ...(flag(args, 'cost') !== undefined ? { costBps: Number(flag(args, 'cost')) } : {}),
    ...(flag(args, 'rate') !== undefined ? { rate: Number(flag(args, 'rate')) } : {}),
    ...(flag(args, 'stop-fill') !== undefined ? { stopFill: flag(args, 'stop-fill') as StopFill } : {}),
    ...(flag(args, 'slippage') !== undefined ? { stopSlippageBps: Number(flag(args, 'slippage')) } : {})
  };
  let loaded;

  if (door === 'development') {
    loaded = await loadDevelopmentSessions();
  } else if (door === 'full') {
    if (!(await readChain()).some((e) => e.phase === 'validation')) {
      throw new Error('the full door opens only after the study’s validation phase is sealed');
    }

    loaded = await loadValidationSessions({
      frozenBodyHash: (await readSealed<{ bodyHash: string }>(frozenSelectionFile)).bodyHash
    });
  } else {
    throw new Error('--door must be development or full');
  }

  await recordDoor(
    door === 'full' ? 'full (post-study run)' : 'development',
    `run ${JSON.stringify(values)}`,
    loaded.sha256,
    loaded.lastDate
  );

  const view = doorView(loaded.door === 'validation' ? 'validation' : 'development', loaded.sessions);
  const result = simulate(
    view.market,
    minuteClock(view.market, view.sessions, values.periodMinutes),
    engineParamsOf(values),
    settings,
    view.window,
    { marks: true }
  );
  const record = recordOf(view.market, result, view.window, view.ranges);
  const rows = ledgerRows({ candidate: candidate ?? 'custom', view, settings }, result);
  const years = yearTable(view, result, rows);
  const out =
    flag(args, 'out') ?? path.join('evaluations', 'intraday-d1', new Date().toISOString().replace(/[:.]/g, '-'));

  if (path.resolve(out).startsWith(path.resolve('research'))) throw new Error('--out may not be under research/');

  await fs.ensureDir(out);
  await writeCsv(path.join(out, 'trades.csv'), rows as unknown as Record<string, unknown>[]);
  await writeCsv(path.join(out, 'years.csv'), years as unknown as Record<string, unknown>[]);
  await fs.writeJson(
    path.join(out, 'summary.json'),
    { values, engineParams: engineParamsOf(values), settings, door, record, trades: tradeStats(rows) },
    { spaces: 1 }
  );

  console.log(
    `Intraday D1 on VGT, ${view.sessions[0]!.date} → ${view.sessions.at(-1)!.date} (${door} door), arming from ${view.sessions[view.window.armFromSession]!.date}`
  );
  console.log(
    `Parameters ${JSON.stringify(values)}; ${settings.costBps} bps per side, ${settings.rate * 100}% interest, stop fill ${settings.stopFill}`
  );
  console.log(
    `Net $${record.net.toFixed(2)} (development ${record.periods.DEV}${record.periods.VAL !== undefined ? `, validation ${record.periods.VAL}` : ''}); ${record.lots} trades; minute drawdown $${record.dd.toFixed(2)} (of the $100,000 notional); costs $${record.costs}; interest $${record.interest}`
  );
  console.table(
    years.map((y) => ({
      year: y.year,
      trades: y.trades,
      winRate: y.winRate,
      net: y.net,
      attributed: y.attributedNet,
      minDD: y.minuteDrawdownInYear
    }))
  );
  console.log(`Wrote trades.csv, years.csv and summary.json to ${out}`);
};
