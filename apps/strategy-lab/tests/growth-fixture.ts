// A small, anonymised, SYNTHETIC pair of completed Growth 1.1.0 runs (continuation OFF and ON, symbol FIXT) with
// internally consistent artifacts — events, trades.json, daily.json, metrics.json, decisions.json, provenance.json,
// request.json, minute-marks.csv.gz, manifest.json — for the export and comparison tests. No market data, no real
// portfolio figures. Money identities hold to the cent: net = gross before costs − costs − interest.

import { join } from 'node:path';
import { gzipSync } from 'node:zlib';

import type { LabEvent, LabValue } from '../shared/contract.ts';
import { atomicWrite, runDirName, writeEvents, writeManifest } from '../server/artifacts.ts';
import type { Config } from '../server/config.ts';
import type { Repo } from '../server/repo.ts';
import { schemaOf } from '../shared/params.ts';
import { RISE_FROM_RECENT_LOW_TRADING as G, defaultParams } from '../shared/strategies.ts';

export const FIXTURE_SYMBOL = 'FIXT';

interface FxTrade {
  trade: string;
  origin: 'base_growth' | 'continuation';
  method: string | null;
  episode: string | null;
  decision: string;
  entry: string;
  exit: string | null;
  entryPrice: number;
  exitPrice: number;
  gross: number;
  entryCost: number;
  exitCost: number;
  interest: number;
  reason: string;
}

const net = (t: FxTrade) => Math.round((t.gross - t.entryCost - t.exitCost - t.interest) * 100) / 100;

const OFF: FxTrade[] = [
  { trade: 'T-1', origin: 'base_growth', method: null, episode: null, decision: '2020-01-06T21:00:00Z', entry: '2020-01-07T14:30:00Z', exit: '2020-02-03T15:10:00Z', entryPrice: 100, exitPrice: 105, gross: 5000, entryCost: 50, exitCost: 52.5, interest: 301.37, reason: 'trailing stop' },
  { trade: 'T-2', origin: 'base_growth', method: null, episode: null, decision: '2020-03-02T21:00:00Z', entry: '2020-03-03T14:30:00Z', exit: '2020-03-17T13:31:00Z', entryPrice: 100, exitPrice: 98, gross: -2000, entryCost: 50, exitCost: 49, interest: 120.55, reason: 'maximum hold' }
];
const ON: FxTrade[] = [
  OFF[0]!,
  { trade: 'T-2', origin: 'continuation', method: 'classic_d1', episode: 'C-1', decision: '2020-02-10T16:41:00Z', entry: '2020-02-10T16:41:00Z', exit: '2020-02-24T14:31:00Z', entryPrice: 100, exitPrice: 99.2, gross: -800, entryCost: 50, exitCost: 50, interest: 60.27, reason: 'maximum hold' },
  { trade: 'T-3', origin: 'base_growth', method: null, episode: null, decision: '2020-03-02T21:00:00Z', entry: '2020-03-03T14:30:00Z', exit: null, entryPrice: 100, exitPrice: 101.2, gross: 1200, entryCost: 50, exitCost: 0, interest: 30.14, reason: 'open' }
];

const v = (key: string, label: string, value: LabValue['value'], unit: LabValue['unit']): LabValue => ({ key, label, value, unit });

function artifacts(runId: string, trades: FxTrade[], on: boolean) {
  const S = FIXTURE_SYMBOL;
  const events: LabEvent[] = [];
  for (const t of trades) {
    const tag = [v('origin', 'Entry origin', t.origin, 'text'), ...(t.method ? [v('method', 'Continuation method', t.method, 'text'), v('episode', 'Continuation episode', t.episode, 'text')] : [])];
    events.push({
      id: t.origin === 'base_growth' ? `${S}:entry_signal:${t.decision}` : `${S}:continuation:${t.decision}`,
      runId, symbol: S, kind: 'entry_signal', t: t.decision, timePrecision: t.origin === 'base_growth' ? 'session-close' : 'minute',
      timeMeaning: 'fixture', price: t.entryPrice, priceBasis: 'bar-close', reason: 'fixture signal', values: tag, tradeId: t.trade, linkedEventId: null,
      meta: { origin: t.origin, method: t.method, episode: t.episode }
    });
    events.push({
      id: `${S}:${t.trade}:entry`, runId, symbol: S, kind: 'executed_entry', t: t.entry, timePrecision: 'minute', timeMeaning: 'fixture fill',
      price: t.entryPrice, priceBasis: 'fill', reason: 'fixture entry',
      values: [v('decisionTime', 'Signal decided', t.decision, 'datetime'), v('principal', 'Principal (borrowed)', 100000, 'usd'), v('shares', 'Shares', 1000, 'count'), ...tag],
      tradeId: t.trade, linkedEventId: t.exit ? `${S}:${t.trade}:exit` : null, meta: { open: t.exit === null, standalone: true, origin: t.origin, method: t.method }
    });
    if (t.exit)
      events.push({
        id: `${S}:${t.trade}:exit`, runId, symbol: S, kind: 'executed_exit', t: t.exit, timePrecision: 'minute', timeMeaning: 'fixture fill',
        price: t.exitPrice, priceBasis: 'fill', reason: t.reason,
        values: [v('exitReason', 'Exit reason', t.reason, 'text'), v('gross', 'Gross P&L before costs', t.gross, 'usd'), v('costs', 'Costs (entry + exit)', t.entryCost + t.exitCost, 'usd'), v('interest', 'Margin interest', t.interest, 'usd'), v('net', 'Net P&L', net(t), 'usd'), v('netReturn', 'Net return on the principal', net(t) / 1000, 'percent'), ...tag],
        tradeId: t.trade, linkedEventId: `${S}:${t.trade}:entry`, meta: { standalone: true, origin: t.origin, method: t.method }
      });
  }
  const closed = trades.filter((t) => t.exit);
  const open = trades.find((t) => !t.exit);
  const sum = (xs: number[]) => Math.round(xs.reduce((a, b) => a + b, 0) * 100) / 100;
  const realized = sum(closed.map(net));
  const byOrigin: Record<string, unknown> = {};
  for (const t of trades) {
    const k = t.origin === 'base_growth' ? 'base_growth' : `continuation:${t.method}`;
    const o = (byOrigin[k] ??= { entries: 0, closed: 0, open: 0, wins: 0, losses: 0, breakeven: 0, realizedNetUsd: 0, realizedGrossBeforeCostsUsd: 0, realizedCostsUsd: 0, realizedInterestUsd: 0, unrealizedNetUsd: 0 }) as Record<string, number>;
    o.entries!++;
    if (t.exit) {
      o.closed!++;
      if (net(t) > 0) o.wins!++;
      else if (net(t) < 0) o.losses!++;
      else o.breakeven!++;
      o.realizedNetUsd = sum([o.realizedNetUsd!, net(t)]);
      o.realizedGrossBeforeCostsUsd = sum([o.realizedGrossBeforeCostsUsd!, t.gross]);
      o.realizedCostsUsd = sum([o.realizedCostsUsd!, t.entryCost + t.exitCost]);
      o.realizedInterestUsd = sum([o.realizedInterestUsd!, t.interest]);
    } else {
      o.open!++;
      o.unrealizedNetUsd = net(t);
    }
  }
  const metrics = {
    kind: 'trading backtest',
    strategy: { key: G.key, version: G.version, engineVersion: G.version },
    continuation: on ? { method: 'classic_d1', windowSessions: 60, pullbackPercent: 9, reboundPercent: 0.3 } : { enabled: false },
    perSymbol: {
      [S]: {
        pnl: {
          realizedNetUsd: realized,
          realizedGrossBeforeCostsUsd: sum(closed.map((t) => t.gross)),
          totalCostsUsd: sum(trades.map((t) => t.entryCost + t.exitCost)),
          totalInterestUsd: sum(trades.map((t) => t.interest)),
          unrealized: open ? { netUsd: net(open), markDate: '2020-03-31' } : null,
          totalMarkedNetUsd: sum([realized, open ? net(open) : 0])
        },
        trades: { filled: trades.length, closed: closed.length, open: open ? 1 : 0, wins: closed.filter((t) => net(t) > 0).length, losses: closed.filter((t) => net(t) < 0).length, winRatePercent: (closed.filter((t) => net(t) > 0).length / closed.length) * 100, worstNetUsd: Math.min(...closed.map(net)) },
        holding: { meanCalendarDays: 20 },
        occupancy: { sessionsInvestedPercent: on ? 60 : 50, sessionsInvested: on ? 36 : 30 },
        drawdown: { minute: { maximumUsd: on ? 3100 : 3500 }, daily: { maximumUsd: on ? 3000 : 3400 } },
        attribution: { note: 'Descriptive attribution: … NOT the incremental (causal) effect …', byOrigin },
        continuation: on
          ? { enabled: true, method: 'classic_d1', qualifyingExits: 1, episodes: 1, endedBy: { triggered: 1, base_entry: 0, window_expired: 0, pullback_too_deep: 0, end_of_data: 0 }, armed: 1, filled: 1, suppressedBasePriority: 0, expiredWithLaterHigherHigh: 0 }
          : { enabled: false, qualifyingExits: 1 }
      }
    }
  };
  const ledger = trades.map((t) => ({
    trade: t.trade, status: t.exit ? 'closed' : 'open', origin: t.origin, method: t.method, episode: t.episode, opensEpisode: t.trade === 'T-1' && on ? 'C-1' : null,
    decisionTimeUtc: t.decision, decisionTimeNewYork: 'fixture', entryTimeUtc: t.entry, entryTimeNewYork: 'fixture', entryFill: 'opening trade', entryFillPrice: t.entryPrice,
    exitTimeUtc: t.exit, exitTimeNewYork: t.exit ? 'fixture' : null, exitReason: t.reason, exitFillPrice: t.exit ? t.exitPrice : null, markPrice: t.exit ? null : t.exitPrice,
    shares: 1000, principal: 100000, grossBeforeCosts: t.gross, entryCost: t.entryCost, exitCost: t.exitCost, interest: t.interest, net: net(t), netReturnPercent: net(t) / 1000, calendarDaysHeld: 20, sessionsHeld: 14
  }));
  const decisions = {
    runId,
    kind: 'growth decision log',
    perSymbol: {
      [S]: {
        episodes: on
          ? [{ id: 'C-1', method: 'classic_d1', openedBy: 'T-1', exitTime: { utc: '2020-02-03T15:10:00Z', newYork: '2020-02-03 10:10 EST' }, exitPrice: 105, exitNet: 4596.13, anchorSession: '2020-02-03', firstEligibleSession: '2020-02-04', lastEligibleSession: '2020-04-29', referenceHigh: 106, maxHighInWindow: 106, armed: { utc: '2020-02-10T15:00:00Z', newYork: '2020-02-10 10:00 EST', price: 96.4 }, trigger: { utc: '2020-02-10T16:41:00Z', newYork: '2020-02-10 11:41 EST', price: 100 }, end: 'triggered', endTime: { utc: '2020-02-10T16:41:00Z', newYork: '2020-02-10 11:41 EST' }, status: 'filled', trade: 'T-2' }]
          : [],
        log: [{ seq: 1, utc: '2020-01-06T21:00:00Z', newYork: '2020-01-06 16:00 EST', precision: 'minute', session: '2020-01-06', event: 'base_signal', origin: 'base_growth', method: null, episode: null, trade: 'T-1', disposition: 'taken', reason: null, values: {} }]
      }
    }
  };
  return { events, metrics, ledger, decisions };
}

/** Seeds the OFF and ON runs (completed) into the repo; returns their ids. */
export function seedGrowthPair(repo: Repo, cfg: Config, opts: { to?: string } = {}) {
  const exp = repo.ensureExperiment('fixture', 'Fixture runs', 'synthetic test fixtures');
  const strat = repo.ensureStrategy({ key: G.key, version: G.version, title: G.title, kind: 'trades', runnable: true, description: G.description, schema: schemaOf(G), sourceRef: 'fixture' });
  const ids: string[] = [];
  for (const on of [false, true]) {
    const params = { ...defaultParams(G), continuationEnabled: on };
    const variation = repo.findOrCreateVariation({ strategyId: strat.id, experimentId: exp.id, params: [], canonical: `fixture|${on}|${opts.to ?? ''}`, title: `fixture ${on ? 'ON' : 'OFF'}`, origin: 'manual', parentVariationId: null });
    const request = { strategyKey: G.key, strategyVersion: G.version, params, symbols: [FIXTURE_SYMBOL], from: '2020-01-02', to: opts.to ?? '2020-03-31', resolution: '1d' };
    const run = repo.createRun({
      variationId: variation.id, title: `Growth fixture continuation ${on ? 'ON' : 'OFF'}`, kind: 'manual', status: 'running', dataOrigin: 'synthetic', symbols: [FIXTURE_SYMBOL],
      window: { from: request.from, to: request.to, resolution: '1d', partition: 'training' }, params: [], assumptions: [], request, priceSource: { kind: 'synthetic', datasetId: 'fixture' },
      provenance: { createdBy: 'test fixture' }, codeRevision: null
    });
    const dir = join(cfg.stateDir, runDirName(run.publicId));
    const a = artifacts(run.publicId, on ? ON : OFF, on);
    atomicWrite(join(dir, 'request.json'), `${JSON.stringify({ runId: run.publicId, ...request }, null, 2)}\n`);
    const sha = writeEvents(dir, run.publicId, a.events);
    const json = (o: unknown) => `${JSON.stringify(o, null, 2)}\n`;
    atomicWrite(join(dir, 'metrics.json'), json(a.metrics));
    atomicWrite(join(dir, 'trades.json'), json({ runId: run.publicId, standalonePerSymbol: true, trades: { [FIXTURE_SYMBOL]: a.ledger } }));
    atomicWrite(join(dir, 'daily.json'), json({ runId: run.publicId, daily: { [FIXTURE_SYMBOL]: [{ date: '2020-01-02', close: 100, realized: 0, unrealized: 0, marked: 0, heldAtClose: false }] } }));
    atomicWrite(join(dir, 'decisions.json'), json(a.decisions));
    atomicWrite(join(dir, 'provenance.json'), json({ basisBySymbol: { [FIXTURE_SYMBOL]: '2020-01-02' }, node: 'fixture' }));
    atomicWrite(join(dir, 'minute-marks.csv.gz'), gzipSync(Buffer.from(`symbol,t_unix_utc,marked_net_usd\n${FIXTURE_SYMBOL},1578407400,0.00\n`)));
    writeManifest(dir, ['request.json', 'events.json', 'metrics.json', 'provenance.json', 'trades.json', 'daily.json', 'decisions.json', 'minute-marks.csv.gz']);
    repo.complete(run.id, { eventCount: a.events.length, artifactDir: runDirName(run.publicId), artifactSha256: sha, metrics: a.metrics, provenance: { createdBy: 'test fixture' }, priceSource: { kind: 'synthetic', datasetId: 'fixture' } });
    ids.push(run.publicId);
  }
  return { off: ids[0]!, on: ids[1]! };
}
