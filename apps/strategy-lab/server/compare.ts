// A descriptive side-by-side comparison of TWO EXISTING completed runs (typically continuation ON against an otherwise
// identical OFF run). It reads their stored artifacts only: it never starts a run, never searches, never ranks.
//
// - Comparability first: strategy key and version, symbols, window, resolution, costs, capital model and every base
//   parameter must match for an apples-to-apples reading; each difference is listed and the verdict says so.
// - Per symbol: the metrics side by side; the trades matched by their DECISION instant (the same base Rise signal, or
//   the same continuation trigger): identical, shifted (same decision, different fill or exit), introduced (only in
//   B) and suppressed (only in A), each with its origin.
// - The ON−OFF difference of two complete replays is the path-dependent counterfactual of enabling the mechanism; it is
//   NOT the sum of the continuation trades' P&L (origin attribution is descriptive and not additive).

import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import type { DecisionsFile, SymbolMetrics } from '../shared/artifact-types.ts';
import { readEvents } from './artifacts.ts';
import type { Config } from './config.ts';
import type { Repo } from './repo.ts';

type Trade = Record<string, unknown> & {
  trade: string;
  net: number;
  decisionTimeUtc: string;
  entryTimeUtc: string;
  exitTimeUtc: string | null;
};

const BASE_KEYS = [
  'advanceFromRecentLowPercent',
  'recentLowLookbackBars',
  'trailingStopPercent',
  'maximumHoldEnabled',
  'maximumHoldDays',
  'intradayLossBufferEnabled',
  'intradayLossBufferPercent',
  'costBpsPerSide'
];

export const NON_ADDITIVITY =
  'Per-trade origin attribution is descriptive. The difference between two complete simulations (B − A) is the ' +
  'path-dependent counterfactual of the configuration change: enabling continuation changes which later base signals ' +
  'are taken, so B − A is generally NOT the P&L of B’s continuation trades.';

export function compareRuns(cfg: Config, repo: Repo, a: string, b: string) {
  const runs = [a, b].map((id) => {
    const r = repo.runDetail(id);
    if (!r) throw new CompareError(404, `no run ${id}`);
    if (r.status !== 'completed' || !r.artifactDir) throw new CompareError(409, `${id} is ${r.status}: only completed runs compare`);
    const dir = join(cfg.stateDir, r.artifactDir);
    readEvents(dir, r.artifact.sha256); // integrity: refuses altered events
    const read = (f: string) => (existsSync(join(dir, f)) ? JSON.parse(readFileSync(join(dir, f), 'utf8')) : null);
    return {
      run: r,
      request: repo.runRequest(id) as { params?: Record<string, unknown> } | null,
      metrics: read('metrics.json') as { perSymbol?: Record<string, SymbolMetrics> } | null,
      trades: read('trades.json') as { trades?: Record<string, Trade[]> } | null,
      decisions: read('decisions.json') as DecisionsFile | null
    };
  });
  const [A, B] = runs as [(typeof runs)[0], (typeof runs)[0]];
  const mismatches: string[] = [];
  const diff = (what: string, x: unknown, y: unknown) => {
    if (JSON.stringify(x) !== JSON.stringify(y)) mismatches.push(`${what}: A ${JSON.stringify(x)} ≠ B ${JSON.stringify(y)}`);
  };
  diff('data origin', A.run.dataOrigin, B.run.dataOrigin);
  diff('strategy', A.run.strategy.key, B.run.strategy.key);
  diff('symbols', [...A.run.symbols].sort(), [...B.run.symbols].sort());
  diff('window', [A.run.window.from, A.run.window.to], [B.run.window.from, B.run.window.to]);
  diff('resolution', A.run.window.resolution, B.run.window.resolution);
  const capital = (r: (typeof runs)[0]) =>
    r.run.strategy.key === 'study8-d1-pool'
      ? 'shared-slot pool'
      : r.run.strategy.key === 'rise-from-recent-low-trading'
        ? 'standalone per symbol'
        : r.run.strategy.key;
  diff('capital model', capital(A), capital(B));
  if (A.run.strategy.version !== B.run.strategy.version)
    mismatches.push(
      `strategy version: A ${A.run.strategy.version} ≠ B ${B.run.strategy.version}${
        A.run.strategy.key === 'rise-from-recent-low-trading' && B.run.strategy.key === A.run.strategy.key
          ? ' (1.0.0 = 1.1.0 with continuation OFF = 1.2.0 with continuation and the entry gates OFF, proven trade for trade; the difference is noted, not disqualifying)'
          : ''
      }`
    );
  const pa = A.request?.params ?? {};
  const pb = B.request?.params ?? {};
  if (A.run.strategy.key === 'rise-from-recent-low-trading' && B.run.strategy.key === A.run.strategy.key)
    for (const k of BASE_KEYS) diff(`base parameter ${k}`, pa[k], pb[k]);
  const continuation = (p: Record<string, unknown>) => (p.continuationEnabled === true ? `ON (${String(p.continuationMethod)})` : 'OFF');
  // v1.2.0 entry gates (absent in earlier versions = OFF)
  const trendFilter = (p: Record<string, unknown>) => (p.trendFilterEnabled === true ? `ON (${String(p.trendMethod)})` : 'OFF');
  const eligibility = (p: Record<string, unknown>) =>
    p.eligibilityEnabled === true ? `ON (${String(p.eligibilityPolicy)}, W ${String(p.eligibilityMaxAgeSessions)})` : 'OFF';
  const versionOnly = mismatches.every((m) => m.startsWith('strategy version'));
  const comparable = mismatches.length === 0 || (versionOnly && A.run.strategy.key === 'rise-from-recent-low-trading');

  const symbols = A.run.symbols.filter((s) => B.run.symbols.includes(s));
  const perSymbol = Object.fromEntries(
    symbols.map((s) => {
      const ta: Trade[] = A.trades?.trades?.[s] ?? [];
      const tb: Trade[] = B.trades?.trades?.[s] ?? [];
      const ma = A.metrics?.perSymbol?.[s] ?? null;
      const mb = B.metrics?.perSymbol?.[s] ?? null;
      const key = (t: Trade) => t.decisionTimeUtc;
      const inA = new Map(ta.map((t) => [key(t), t]));
      const inB = new Map(tb.map((t) => [key(t), t]));
      const brief = (t: Trade) => ({
        trade: t.trade,
        origin: t.origin ?? 'base_growth',
        method: t.method ?? null,
        decision: t.decisionTimeUtc,
        entry: t.entryTimeUtc,
        exit: t.exitTimeUtc,
        exitReason: t.exitReason,
        net: t.net,
        status: t.status
      });
      const identical: ReturnType<typeof brief>[] = [];
      const shifted: { a: ReturnType<typeof brief>; b: ReturnType<typeof brief> }[] = [];
      for (const [k, t] of inA) {
        const u = inB.get(k);
        if (!u) continue;
        if (u.entryTimeUtc === t.entryTimeUtc && u.exitTimeUtc === t.exitTimeUtc && u.net === t.net) identical.push(brief(u));
        else shifted.push({ a: brief(t), b: brief(u) });
      }
      const introduced = tb.filter((t) => !inA.has(key(t))).map(brief);
      const suppressed = ta.filter((t) => !inB.has(key(t))).map(brief);
      const metric = (m: SymbolMetrics | null) =>
        m && {
          totalMarkedNetUsd: m.pnl?.totalMarkedNetUsd ?? null,
          realizedNetUsd: m.pnl?.realizedNetUsd ?? null,
          unrealizedNetUsd: m.pnl?.unrealized?.netUsd ?? 0,
          realizedGrossBeforeCostsUsd: m.pnl?.realizedGrossBeforeCostsUsd ?? null,
          totalCostsUsd: m.pnl?.totalCostsUsd ?? null,
          totalInterestUsd: m.pnl?.totalInterestUsd ?? null,
          trades: m.trades?.filled ?? null,
          closed: m.trades?.closed ?? null,
          wins: m.trades?.wins ?? null,
          losses: m.trades?.losses ?? null,
          winRatePercent: m.trades?.winRatePercent ?? null,
          worstNetUsd: m.trades?.worstNetUsd ?? null,
          meanCalendarDaysHeld: m.holding?.meanCalendarDays ?? null,
          sessionsInvestedPercent: m.occupancy?.sessionsInvestedPercent ?? null,
          minuteDrawdownUsd: m.drawdown?.minute?.maximumUsd ?? null,
          dailyDrawdownUsd: m.drawdown?.daily?.maximumUsd ?? null,
          netPerSessionInvestedUsd:
            typeof m.pnl?.totalMarkedNetUsd === 'number' && m.occupancy?.sessionsInvested
              ? m.pnl.totalMarkedNetUsd / m.occupancy.sessionsInvested
              : null
        };
      const xa = metric(ma);
      const xb = metric(mb);
      const delta =
        xa && xb
          ? Object.fromEntries(
              Object.keys(xa).map((k) => [k, typeof xa[k as keyof typeof xa] === 'number' && typeof xb[k as keyof typeof xb] === 'number' ? (xb[k as keyof typeof xb] as number) - (xa[k as keyof typeof xa] as number) : null])
            )
          : null;
      const episodes = (r: (typeof runs)[0]) => {
        const list = r.decisions?.perSymbol?.[s]?.episodes ?? [];
        if (!list.length) return null;
        const by = (end: string) => list.filter((e) => e.end === end).length;
        const tradeNet = new Map((r.trades?.trades?.[s] ?? []).map((t) => [t.trade, t.net]));
        return {
          episodes: list.length,
          triggered: by('triggered'),
          filled: list.filter((e) => e.status === 'filled').length,
          expired: by('window_expired'),
          closedByBaseEntry: by('base_entry'),
          tooDeep: by('pullback_too_deep'),
          openAtEnd: by('end_of_data'),
          capturedNetUsd: list.reduce((n, e) => n + (e.trade ? Number(tradeNet.get(e.trade) ?? 0) : 0), 0),
          missedWithHigherHigh: list.filter((e) => e.end === 'window_expired' && e.maxHighInWindow !== null && e.maxHighInWindow > e.exitPrice).length,
          note: '“captured” = episodes whose trigger filled (their trades’ net, descriptive); “missed” = expired windows in which a later session high exceeded the exit price.'
        };
      };
      return [
        s,
        {
          metrics: { a: xa, b: xb, bMinusA: delta },
          trades: {
            identical: identical.length,
            shifted,
            introduced,
            suppressed,
            byOriginB: tb.reduce<Record<string, number>>((n, t) => ((n[String(t.origin ?? 'base_growth')] = (n[String(t.origin ?? 'base_growth')] ?? 0) + 1), n), {})
          },
          continuation: { a: episodes(A), b: episodes(B) }
        }
      ];
    })
  );
  return {
    a: { id: A.run.id, title: A.run.title, strategy: A.run.strategy, continuation: continuation(pa), trendFilter: trendFilter(pa), eligibility: eligibility(pa) },
    b: { id: B.run.id, title: B.run.title, strategy: B.run.strategy, continuation: continuation(pb), trendFilter: trendFilter(pb), eligibility: eligibility(pb) },
    comparable,
    mismatches,
    verdict: comparable
      ? mismatches.length
        ? 'comparable (only the strategy version differs, and the earlier Growth versions equal 1.2.0 with the later options OFF)'
        : 'methodologically comparable: same strategy, symbols, window, resolution, costs, capital model and base parameters'
      : 'NOT comparable: the runs differ in the assumptions listed; the figures are shown side by side, not as an apples-to-apples comparison',
    control:
      'No matching control? Open the ON run, Parameters → Clone into new test…, switch the option under study (continuation, the entry trend filter or persistent eligibility) OFF (nothing else) and Run Test; then compare the two runs here. Strategy Lab never starts a control run by itself; tools/paired-comparison.ts produces the paired OFF diagnostic from the CLI.',
    nonAdditivity: NON_ADDITIVITY,
    perSymbol
  };
}

export class CompareError extends Error {
  constructor(
    readonly status: number,
    message: string
  ) {
    super(message);
  }
}
