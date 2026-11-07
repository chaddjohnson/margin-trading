// Engineering parity (PROTOCOL.md §9).
//
// P1 (before the search, development data only): the optimizer adapter against DIRECT backtests — the unchanged
// Strategy Lab runner (apps/strategy-lab/runner/trading-run.ts, the process a browser "Run Test" starts) on a request
// for 2016-01-04 → 2024-12-31. The runner runs in a scratch working directory whose data/VGT/data.csv is a real copy of
// the pinned development prefix (physically capped at 2024-12-31) and whose config/ is the repository's (read-only),
// so it reads no byte after 2024. Every metric, every trade and every daily mark must be identical.
//
// P2 (the first step of the final evaluation, after the selection freeze): #4 on the full window through the same
// runner on the canonical file, against the browser's reference figures (to the displayed cent / count / 0.1%), and the
// adapter against that runner.
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import fs from 'fs-extra';
import { dataFile, developmentDoor } from './context.ts';
import { type RunOutput, requestOf } from './adapter.ts';
import type { Effective } from './space.ts';

const repoRoot = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..', '..');
const runnerFile = path.join(repoRoot, 'apps/strategy-lab/runner/trading-run.ts');
// scratch space for prefix roots and direct runs (git-ignored, regenerable)
export const scratchDir = path.join(repoRoot, '.cache', 'growth-vgt-study8');

export interface DirectResult {
  metrics: Record<string, unknown>;
  trades: Record<string, unknown>[];
  daily: { date: string; marked: number; realized: number; unrealized: number }[];
  stdout: string;
}

// A scratch repository root with only the development prefix as data/VGT/data.csv.
export const prefixRoot = async () => {
  await fs.ensureDir(scratchDir);

  const root = await fs.mkdtemp(path.join(scratchDir, 'prefix-root-'));
  const handle = await fs.promises.open(dataFile, 'r');
  const buffer = Buffer.alloc(developmentDoor.prefixBytes);

  await handle.read(buffer, 0, buffer.length, 0);
  await handle.close();
  await fs.outputFile(path.join(root, 'data', 'VGT', 'data.csv'), buffer);
  await fs.copy(path.join(repoRoot, 'data', 'partitions.json'), path.join(root, 'data', 'partitions.json'));
  await fs.symlink(path.join(repoRoot, 'config'), path.join(root, 'config'));
  return root;
};

// The unchanged Strategy Lab runner on one request, in `cwd` (the repository root, or a prefix root).
export const directRun = async (
  cwd: string,
  request: ReturnType<typeof requestOf>,
  runDir: string
): Promise<DirectResult> => {
  await fs.outputJson(path.join(runDir, 'request.json'), { ...request, runId: path.basename(runDir) });

  const stdout = execFileSync(
    process.execPath,
    [
      '--experimental-transform-types',
      '--disable-warning=ExperimentalWarning',
      '--max-old-space-size=4096',
      runnerFile,
      runDir
    ],
    { cwd, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 }
  );
  const metricsFile = (await fs.readJson(path.join(runDir, 'metrics.json'))) as {
    perSymbol: Record<string, Record<string, unknown>>;
  };
  const trades = (await fs.readJson(path.join(runDir, 'trades.json'))) as {
    trades: Record<string, Record<string, unknown>[]>;
  };
  const daily = (await fs.readJson(path.join(runDir, 'daily.json'))) as {
    daily: Record<string, DirectResult['daily']>;
  };

  return { metrics: metricsFile.perSymbol.VGT!, trades: trades.trades.VGT!, daily: daily.daily.VGT!, stdout };
};

const same = (a: unknown, b: unknown) =>
  typeof a === 'number' && typeof b === 'number' ? Object.is(a, b) || Math.abs(a - b) <= 1e-9 : a === b;

// Every metric, trade and daily mark of the adapter's run against the runner's.
export const compareWithDirect = (out: RunOutput, direct: DirectResult) => {
  const problems: string[] = [];
  const m = out.summary.metrics;
  const d = direct.metrics as Record<string, Record<string, unknown>>;
  const check = (label: string, a: unknown, b: unknown) => {
    if (!same(a, b)) problems.push(`${label}: adapter ${String(a)} ≠ runner ${String(b)}`);
  };

  check('totalMarkedNetUsd', m.pnl.totalMarkedNetUsd, d.pnl!.totalMarkedNetUsd);
  check('realizedNetUsd', m.pnl.realizedNetUsd, d.pnl!.realizedNetUsd);
  check('totalInterestUsd', m.pnl.totalInterestUsd, d.pnl!.totalInterestUsd);
  check('totalCostsUsd', m.pnl.totalCostsUsd, d.pnl!.totalCostsUsd);
  check('minuteDrawdownUsd', m.drawdown.minute.maximumUsd, (d.drawdown!.minute as Record<string, unknown>).maximumUsd);
  check('dailyDrawdownUsd', m.drawdown.daily.maximumUsd, (d.drawdown!.daily as Record<string, unknown>).maximumUsd);

  for (const k of ['filled', 'closed', 'open', 'wins', 'losses', 'breakeven'] as const)
    check(`trades.${k}`, m.trades[k], (d.trades as Record<string, unknown>)[k]);

  check(
    'sessionsInvestedPercent',
    m.occupancy.sessionsInvestedPercent,
    (d.occupancy as Record<string, unknown>).sessionsInvestedPercent
  );
  check(
    'calendarTimeInvestedPercent',
    m.occupancy.calendarTimeInvestedPercent,
    (d.occupancy as Record<string, unknown>).calendarTimeInvestedPercent
  );
  check('sessions', m.sessions, direct.metrics.sessions);
  check('window.firstDate', m.window.firstDate, (d.window as Record<string, unknown>).firstDate);
  check('window.lastDate', m.window.lastDate, (d.window as Record<string, unknown>).lastDate);
  check('ledger rows', out.summary.rows.length, direct.trades.length);

  out.summary.rows.forEach((row, i) => {
    const t = direct.trades[i];

    if (!t) return;

    const exitIso =
      row.status === 'open' ? null : new Date(row.trade.exitTime * 1000).toISOString().replace('.000Z', 'Z');

    check(
      `T-${i + 1}.entryTime`,
      new Date(row.trade.entryTime * 1000).toISOString().replace('.000Z', 'Z'),
      t.entryTimeUtc
    );
    check(`T-${i + 1}.exitTime`, exitIso, t.exitTimeUtc);
    check(`T-${i + 1}.entryFill`, row.entryRawPrice, t.entryFillPrice);
    check(`T-${i + 1}.net`, row.net, t.net);
    check(`T-${i + 1}.exitReason`, row.trade.exitReason, t.exitReason);
  });

  const marks = out.run.simulation.daily;

  check('daily rows', marks.length, direct.daily.length);
  marks.forEach((mk, i) => {
    const r = direct.daily[i];

    if (r && (!same(mk.marked, r.marked) || mk.date !== r.date))
      problems.push(`daily ${mk.date}: ${mk.marked} ≠ ${r.date} ${r.marked}`);
  });

  return problems;
};

export const directSummary = (direct: DirectResult) => {
  const d = direct.metrics as Record<string, Record<string, unknown>>;
  const num = (group: Record<string, unknown> | undefined, key: string) => Number(group?.[key]);
  const minute = d.drawdown!.minute as Record<string, unknown>;

  return {
    totalMarkedNetUsd: num(d.pnl, 'totalMarkedNetUsd'),
    realizedNetUsd: num(d.pnl, 'realizedNetUsd'),
    minuteDrawdownUsd: num(minute, 'maximumUsd'),
    minuteDrawdownPercent: num(minute, 'percentOfNotional'),
    minuteDrawdownPeak: minute.peakTime as string | null,
    minuteDrawdownTrough: minute.troughTime as string | null,
    minuteDrawdownRecovery: minute.recoveryTime as string | null,
    wins: num(d.trades, 'wins'),
    losses: num(d.trades, 'losses'),
    breakeven: num(d.trades, 'breakeven'),
    closedTrades: num(d.trades, 'closed'),
    open: num(d.trades, 'open'),
    sessionsInvestedPercent: num(d.occupancy, 'sessionsInvestedPercent'),
    calendarTimeInvestedPercent: num(d.occupancy, 'calendarTimeInvestedPercent'),
    window: d.window
  };
};

export const effectiveRequest = (effective: Effective, from: string, to: string) => requestOf(effective, from, to);
