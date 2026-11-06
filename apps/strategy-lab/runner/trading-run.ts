// The Strategy Lab trading-backtest runner ("Growth"): ONE manual test of one configuration of
// rise-from-recent-low-trading@1.4.0 (or a replay of a legacy request: @1.3.0 = 1.4.0 with the Drawdown Recovery Gate
// OFF; @1.2.0 = also the Rise entry, the initial risk stop and trend retention OFF; @1.1.0 = also the entry trend filter
// and persistent eligibility OFF; @1.0.0 = also continuation OFF),
// started by the server as a child process with a fixed argument vector:
//
//   node --experimental-transform-types runner/trading-run.ts <absolute run directory>
//
// cwd must be the repository root. It reads <run dir>/request.json (validated by the server), loads each symbol through
// the repository's dataset pipeline (src/lib/evaluation.ts: the window, warm-up sessions read for the scanner's lookback
// only, forward split adjustment, the data file's sha256, access 'manual evaluation') exactly as the signal-only runner
// does, runs the trading engine (src/growth-trading/riseTrading.ts: the unchanged Rise scanner as the base entry, the
// optional continuation entries of continuation.ts, the Study 8 D1 book and exit manager), and writes events.json,
// metrics.json, trades.json, daily.json, decisions.json, minute-marks.csv.gz and provenance.json atomically. Each symbol is an independent standalone backtest; nothing is summed across symbols. The run FAILS (exit 1)
// if any accounting check does not close. It never searches parameters: one request, one configuration.

import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';

import {
  CONTINUATION_METHOD_LABEL,
  type ContinuationMethod,
  type LogEntry,
  type LogValue
} from '../../../src/growth-trading/continuation.ts';
import type { DrawdownCheck, DrawdownRecoveryGate } from '../../../src/growth-trading/drawdownGate.ts';
import {
  ELIGIBILITY_POLICY_LABEL,
  type GateResult,
  type GatedDecision,
  type Opportunity,
  TREND_METHOD_LABEL
} from '../../../src/growth-trading/entryGates.ts';
import {
  ENTRY_METHOD_LABEL,
  type ExitFill,
  type ProtectedPosition,
  describeRule
} from '../../../src/growth-trading/optionalRules.ts';
import {
  EXECUTION,
  LEGACY_STRATEGY_VERSIONS,
  type LedgerRow,
  STRATEGY_KEY,
  STRATEGY_VERSION,
  entrySourceOf,
  exitParamsOf,
  originOf,
  runRiseTrading,
  summarizeSimulation,
  warmupSessionsForParams
} from '../../../src/growth-trading/riseTrading.ts';
import { resolveDataset } from '../../../src/lib/dataset.ts';
import { loadDatasetSessions } from '../../../src/lib/evaluation.ts';
import type { ExecutionPrice, ExitReason } from '../../../src/shared-margin-portfolio/strategy.ts';
import { atomicWrite, writeEvents } from '../server/artifacts.ts';
import type { LabEvent, LabRunRequest, LabValue, TimePrecision } from '../shared/contract.ts';
import { paramsOf } from './growth-params.ts';

const emit = (o: Record<string, unknown>) => process.stdout.write(`${JSON.stringify(o)}\n`);
const progress = (message: string, fraction: number | null = null) => emit({ type: 'progress', message, fraction });

const ENGINE_FILES = [
  'src/entry-signals/bars.ts',
  'src/entry-signals/riseFromRecentLow.ts',
  'src/growth-trading/riseTrading.ts',
  'src/growth-trading/continuation.ts',
  'src/growth-trading/entryGates.ts',
  'src/growth-trading/optionalRules.ts',
  'src/growth-trading/drawdownGate.ts',
  'src/multi-etf-allocator/shadow.ts',
  'src/multi-etf-allocator/engine.ts',
  'src/multi-etf-allocator/ledger.ts',
  'src/shared-margin-portfolio/strategy.ts',
  'src/four-family/data.ts',
  'src/lib/evaluation.ts',
  'src/lib/session.ts',
  'src/lib/csv.ts',
  'src/lib/corporateActions.ts',
  'apps/strategy-lab/runner/trading-run.ts',
  'apps/strategy-lab/runner/growth-params.ts',
  'apps/strategy-lab/shared/params.ts',
  'apps/strategy-lab/shared/strategies.ts'
];
const TOLERANCE_USD = 1e-6;

const iso = (sec: number) => new Date(sec * 1000).toISOString().replace('.000Z', 'Z');
const dateOf = (sec: number) => new Date(sec * 1000).toISOString().slice(0, 10);
const r2 = (x: number) => Math.round(x * 100) / 100;
const r4 = (x: number) => Math.round(x * 10000) / 10000;
const usd = (x: number) => `${x < 0 ? '−' : ''}$${Math.abs(x).toLocaleString('en-US', { maximumFractionDigits: 2 })}`;

const NY = new Intl.DateTimeFormat('en-US', {
  timeZone: 'America/New_York',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
  timeZoneName: 'short'
});
const ny = (sec: number) => {
  const p = Object.fromEntries(NY.formatToParts(new Date(sec * 1000)).map((x) => [x.type, x.value]));
  return `${p.year}-${p.month}-${p.day} ${p.hour}:${p.minute} ${p.timeZoneName}`;
};

const EXECUTION_TEXT: Record<ExecutionPrice, string> = {
  'first trade after decision': 'the opening trade of the first minute after the decision',
  'closing print': 'the closing-auction print',
  'opening trade': 'the session’s opening trade',
  'stop level': 'the stop price, crossed within the minute (assumed fill)',
  'minute open through stop': 'the opening trade of a minute that opened through the stop',
  'trigger minute close': 'the triggering minute’s last trade'
};
const timing = (execution: ExecutionPrice | ''): { precision: TimePrecision; meaning: string } =>
  execution === 'closing print'
    ? { precision: 'session-close', meaning: 'the scheduled close: the closing-auction print filled the order' }
    : execution === 'stop level'
      ? { precision: 'minute', meaning: 'start of the minute in which trading crossed the stop (filled at the stop price)' }
      : { precision: 'minute', meaning: 'start of the minute whose opening trade filled the order' };
const EXIT_LABEL: Record<ExitReason | 'initial stop' | 'initial stop gap' | 'trend exit', string> = {
  'trailing stop': 'Trailing stop',
  'trailing stop gap': 'Trailing stop (gap at the open)',
  'maximum hold': 'Maximum losing hold',
  'buffered intraday loss': 'Buffered intraday loss',
  displaced: 'Displaced',
  'forced liquidation': 'Forced liquidation',
  open: 'Open at the end',
  // v1.3.0 optional rules
  'initial stop': 'Initial risk stop',
  'initial stop gap': 'Initial risk stop (gap at the open)',
  'trend exit': 'Trend-retention exit'
};
const exitLabel = (reason: string) => EXIT_LABEL[reason as keyof typeof EXIT_LABEL] ?? reason;

const originValues = (origin: string, method: ContinuationMethod | null, episode: string | null): LabValue[] => [
  { key: 'origin', label: 'Entry origin', value: origin, unit: 'text' },
  ...(method
    ? [
        { key: 'method', label: 'Continuation method', value: CONTINUATION_METHOD_LABEL[method], unit: 'text' as const },
        { key: 'episode', label: 'Continuation episode', value: episode, unit: 'text' as const }
      ]
    : [])
];

// v1.2.0 entry gates: an observed value as a labelled event value (units from the key).
const unitOf = (key: string): LabValue['unit'] =>
  /Percent|percent/.test(key) ? 'percent' : /Sessions$|sessionsNeeded|sessionsAvailable|halfSessions|ageSessions/.test(key) ? 'sessions' : /Session$/.test(key) ? 'date' : /Close$|Price$|price$|sma|High$|Low$|Level$|threshold|Threshold|trough|reference|recentLow|close$/.test(key) ? 'price' : 'text';
const gateValues = (prefix: string, values: Record<string, LogValue>): LabValue[] =>
  Object.entries(values).map(([key, value]) => ({
    key: `${prefix}${key}`,
    label: `${prefix}${key}`,
    value: typeof value === 'number' ? r4(value) : value,
    unit: typeof value === 'number' ? unitOf(key) : 'text'
  }));

const SOURCE_LABEL: Record<string, string> = {
  rise_from_recent_low: 'the Rise signal',
  trend_breakout: 'the breakout signal',
  'latched:rise_from_recent_low': 'a latched opportunity (a later decision of a Rise signal)',
  eligibility_renewal: 'a renewal signal (reset and fresh rebound)',
  'latched:eligibility_renewal': 'a latched renewal opportunity'
};

interface StoredRequest extends LabRunRequest {
  runId: string;
}

async function main() {
  const runDir = process.argv[2];
  if (!runDir) throw new Error('usage: trading-run.ts <run directory>');
  const request = JSON.parse(readFileSync(join(runDir, 'request.json'), 'utf8')) as StoredRequest;
  const legacy = (LEGACY_STRATEGY_VERSIONS as readonly string[]).includes(request.strategyVersion);
  if (request.strategyKey !== STRATEGY_KEY || !(request.strategyVersion === STRATEGY_VERSION || legacy))
    throw new Error(`unsupported strategy ${request.strategyKey}@${request.strategyVersion}`);
  const params = paramsOf(request);
  const exit = exitParamsOf(params); // validates, including the buffer → hold dependency and the continuation config
  const n = params.recentLowLookbackBars;
  const warmupSessions = warmupSessionsForParams(params);
  const daily = request.resolution === '1d';
  const continuation = params.continuation ?? null;
  const trendFilter = params.trendFilter ?? null;
  const eligibility = params.eligibility ?? null;
  // v1.4.0: the Drawdown Recovery Gate (absent = OFF: the 1.3.0 artifacts exactly, plus metrics' {enabled: false})
  const drawdownCfg = params.drawdownGate ?? null;
  const gated = Boolean(trendFilter || eligibility || drawdownCfg);
  // v1.3.0 optional rules (each absent = OFF, the v1.2.0 artifacts exactly)
  const entryMethod = params.entryMethod ?? 'rise_from_recent_low';
  const breakoutCfg = params.breakout ?? null;
  const initialStop = params.initialStop ?? null;
  const retention = params.retention ?? null;
  const optional = Boolean(breakoutCfg || initialStop || retention);

  const events: LabEvent[] = [];
  const perSymbol: Record<string, unknown> = {};
  const ledgers: Record<string, unknown[]> = {};
  const marks: Record<string, unknown[]> = {};
  const decisionLogs: Record<string, unknown> = {};
  const minuteCsv: string[] = ['symbol,t_unix_utc,marked_net_usd'];
  const provenance: Record<string, unknown> = {};
  const basisBySymbol: Record<string, string> = {};

  for (const [k, symbol] of request.symbols.entries()) {
    const base = k / request.symbols.length;
    progress(`${symbol}: loading the canonical minute file`, base);
    const dataset = resolveDataset(symbol, 'all');
    const loaded = await loadDatasetSessions({
      dataset,
      startDate: request.from,
      endDate: request.to,
      warmupSessions,
      access: 'manual evaluation'
    });
    progress(`${symbol}: ${loaded.sessions.length} sessions loaded; backtesting`, base + 0.5 / request.symbols.length);
    const r = runRiseTrading(symbol, loaded.history, loaded.warmup, params, loaded.report!.dataSha256!, {
      recordMinuteMarks: true
    });
    const { ds, simulation: sim } = r;
    const { rows, metrics } = summarizeSimulation(sim, ds);
    basisBySymbol[symbol] = loaded.history[0]!.date;

    // The run fails rather than report figures that do not close.
    const c = metrics.checks;
    if (!(c.fixedLedgerMaxDifferenceUsd <= TOLERANCE_USD && c.identityMaxResidualUsd <= TOLERANCE_USD))
      throw new Error(`${symbol}: accounting check failed ${JSON.stringify(c)}`);
    if (!(c.markedEqualsLedger <= TOLERANCE_USD)) throw new Error(`${symbol}: marks differ from the ledger`);

    const tradeIds = new Map(rows.map((row) => [row.trade, `T-${row.number}`]));
    const g = sim.gates;
    const rowOf = new Map(rows.map((row) => [row.trade, row]));
    const when = (sec: number) => ({ utc: iso(sec), newYork: ny(sec) });
    const dateAt = (i: number) => r.ds.dates[i] ?? `${r.ds.dates.at(-1)} + ${i - r.ds.sessionCount + 1} session(s) (past the data)`;
    // What finally became of an opportunity (for the event texts).
    const fate = (o: Opportunity) =>
      o.trade && tradeIds.get(o.trade)
        ? `decided ${ny(o.decisionTime)} at ${o.decisionPrice.toFixed(2)} (age ${o.ageSessionsAtDecision} session(s)), filled as ${tradeIds.get(o.trade)}`
        : o.endState === 'unfilled_at_end'
          ? 'decided, but its order was not filled before the end of the window'
          : `${o.endState}${o.endReason ? ` (${o.endReason})` : ''}`;
    const gateText = (d: GatedDecision | undefined) => (d?.gate ? d.gate.text : d?.reason ?? '');
    // v1.4.0: the Drawdown Recovery Gate (null with it OFF) and its state at each trade's entry decision
    const dd: DrawdownRecoveryGate | null = g?.drawdown ?? null;
    const continuationOutcomeOf = new Map(
      (sim.continuation?.outcomes ?? []).filter((o) => o.trade).map((o) => [o.trade!, o] as const)
    );
    const entryDrawdown = (t: LedgerRow['trade']): { state: string; values: Record<string, LogValue> } | null => {
      const c: DrawdownCheck | undefined = g?.decisionOf(t)?.gate?.drawdown;
      if (c) return { state: c.state, values: c.values };
      const o = continuationOutcomeOf.get(t);
      if (!o || !('drawdown.state' in o.values)) return null;
      const values = Object.fromEntries(
        Object.entries(o.values)
          .filter(([key]) => key.startsWith('drawdown.'))
          .map(([key, v]) => [key.slice('drawdown.'.length), v])
      );
      return { state: String(values.state), values };
    };
    const entryDrawdownValues = (t: LedgerRow['trade']): LabValue[] => {
      const d = entryDrawdown(t);
      return d
        ? [
            { key: 'drawdown.stateAtDecision', label: 'Drawdown gate at the decision', value: d.state, unit: 'text' as const },
            ...(d.values.episode ? [{ key: 'drawdown.episode', label: 'Drawdown episode', value: d.values.episode, unit: 'text' as const }] : []),
            ...(typeof d.values.threshold === 'number'
              ? [{ key: 'drawdown.threshold', label: 'Recovery threshold at the decision', value: r4(d.values.threshold), unit: 'price' as const }]
              : [])
          ]
        : [];
    };
    // the opportunities the gate blocked at least once (an entry_blocked transition names them)
    const ddBlockedOpportunities = new Set(
      (dd?.transitions ?? [])
        .filter((x) => x.event === 'entry_blocked_by_drawdown_gate' && typeof x.values.opportunity === 'string')
        .map((x) => x.values.opportunity as string)
    );
    // v1.4.0: the Drawdown Recovery Gate's values at a decision (only with it ON)
    const ddFields = (gr: GateResult | null | undefined): LabValue[] =>
      gr?.drawdown
        ? [
            ...gateValues('drawdown.', gr.drawdown.values),
            { key: 'blockedBy', label: 'Blocked by', value: gr.blockedBy!.length ? gr.blockedBy!.join(', ') : 'none', unit: 'text' as const }
          ]
        : [];
    let cumulative = 0;
    const cumulativeAfter = new Map<LedgerRow, number>();
    for (const row of rows) if (row.status === 'closed') cumulativeAfter.set(row, (cumulative += row.net));

    const rules = sim.rules;
    const posOf = (t: LedgerRow['trade']): ProtectedPosition | undefined => rules?.positionOf(t);
    // v1.3.0: the initial risk stop's decision-time values, when it was checked (blocked, or inside a gate result).
    const protectionFields = (pc: { values: Record<string, LogValue> } | null | undefined): LabValue[] =>
      pc ? gateValues('protection.', pc.values) : [];
    const dispositionOf = (o: (typeof sim.outcomes)[number], tradeId: string | undefined, opId: string | undefined) =>
      o.status === 'filled'
        ? `taken: order filled (${tradeId})`
        : o.status === 'unfilled_at_end'
          ? 'taken: order not filled before the end of the window'
          : o.status === 'vetoed'
            ? `vetoed: ${o.reason}${o.protection ? ' (initial risk stop unavailable)' : ''}`
            : o.status === 'deferred'
              ? `deferred: armed as ${opId} (${o.gate?.gate?.reason ?? 'blocked'})`
              : o.reason === 'position_open'
                ? `ignored: invested (${tradeId ?? '?'})`
                : `ignored: the order for ${tradeId ?? '?'} is not filled yet`;

    // Raw signals: every one appears exactly once — taken (entry_signal) or not (rejected_signal).
    for (const o of sim.outcomes) {
      // v1.3.0: a trend-breakout signal (the completed daily close; each qualifying close once, never replayed).
      if (o.decision.breakout) {
        const b = o.decision.breakout;
        const t = iso(b.time);
        const tradeId = o.trade ? tradeIds.get(o.trade) : undefined;
        const gd = o.gate;
        const notTaken = o.status === 'rejected' || o.status === 'vetoed' || o.status === 'deferred';
        const cfg = breakoutCfg!;
        const head = `Breakout at the completed close ${b.close.toFixed(2)}: above its ${cfg.smaSessions}-session SMA ${b.sma.toFixed(2)}, which is above its value ${cfg.slopeComparisonSessions} sessions earlier (${b.smaThen.toFixed(2)}), and above the highest high ${b.priorHigh.toFixed(2)} of the ${cfg.priorHighSessions} preceding sessions (${r.ds.dates[b.priorHighSession]})`;
        const reason =
          o.status === 'filled'
            ? `${head}. Flat: order placed, filled ${ny(o.trade!.entryTime)} at ${o.trade!.entryRawPrice.toFixed(2)} (${tradeId})`
            : o.status === 'unfilled_at_end'
              ? `${head}. Flat: order placed, but no eligible trade inside the window — not filled`
              : o.status === 'vetoed'
                ? `${head}. Not taken — ${o.protection ? o.protection.text : gateText(gd)}; never replayed later`
                : o.reason === 'position_open'
                  ? `${head}. Ignored: already invested (${tradeId}, bought ${ny(o.trade!.entryTime)}); never replayed later`
                  : `${head}. Ignored: the order of ${tradeId} is still waiting for its fill`;
        events.push({
          id: `${symbol}:${notTaken ? 'rejected_signal' : 'entry_signal'}:${t}`,
          runId: request.runId,
          symbol,
          kind: notTaken ? 'rejected_signal' : 'entry_signal',
          t,
          timePrecision: 'session-close',
          timeMeaning:
            'scheduled close of the session (16:00 ET, 13:00 on early-close days): the completed daily close the breakout is decided at',
          price: b.close,
          priceBasis: 'bar-close',
          reason,
          values: [
            { key: 'entryMethod', label: 'Entry method', value: ENTRY_METHOD_LABEL.trend_breakout, unit: 'text' },
            { key: 'close', label: 'Completed close', value: r4(b.close), unit: 'price' },
            { key: 'sma', label: `SMA(${cfg.smaSessions}) at the close`, value: r4(b.sma), unit: 'price' },
            { key: 'smaThen', label: `SMA(${cfg.smaSessions}) ${cfg.slopeComparisonSessions} sessions earlier`, value: r4(b.smaThen), unit: 'price' },
            { key: 'smaRise', label: 'SMA rise over the comparison', value: r4((b.sma / b.smaThen - 1) * 100), unit: 'percent' },
            { key: 'priorHigh', label: `Highest high of the ${cfg.priorHighSessions} preceding sessions`, value: r4(b.priorHigh), unit: 'price' },
            { key: 'priorHighSession', label: 'Session of that high', value: r.ds.dates[b.priorHighSession]!, unit: 'date' },
            { key: 'priorHighWindow', label: 'Prior-high window (signal session excluded)', value: `${r.ds.dates[b.session - cfg.priorHighSessions]} … ${r.ds.dates[b.session - 1]}`, unit: 'text' },
            { key: 'disposition', label: 'Disposition', value: dispositionOf(o, tradeId, undefined), unit: 'text' },
            ...originValues('base_growth', null, null),
            ...(gd
              ? [
                  { key: 'entryGate', label: 'Entry gate', value: gd.gate ? gd.gate.reason : gd.disposition, unit: 'text' as const },
                  ...(gd.gate?.trend ? gateValues('trend.', gd.gate.trend.values) : []),
                  ...protectionFields(gd.gate?.protection),
                  ...ddFields(gd.gate)
                ]
              : []),
            ...protectionFields(o.protection)
          ],
          tradeId: o.status === 'filled' ? tradeId! : null,
          linkedEventId: null,
          meta: {
            signalOnly: false,
            standalone: true,
            disposition:
              o.status === 'rejected' ? 'ignored' : o.status === 'filled' ? 'taken' : o.status === 'vetoed' ? 'vetoed' : 'unfilled',
            reasonCode: o.reason ?? o.status,
            heldBy: o.status === 'rejected' ? (tradeId ?? null) : null,
            origin: 'base_growth',
            entryMethod: 'trend_breakout',
            entrySource: 'trend_breakout',
            ...(gd ? { entryGate: gd.gate ? gd.gate.reason : gd.disposition } : {}),
            ...(o.protection ? { entryGate: o.protection.reason, protection: 'initial_stop_unavailable' } : {})
          }
        });
        continue;
      }
      const s = o.decision.signal!;
      const bar = r.bars[s.index]!;
      const low = r.bars[s.recentLowIndex]!;
      const t = iso(s.time);
      const tradeId = o.trade ? tradeIds.get(o.trade) : undefined;
      const gd = o.gate;
      const op = gd?.opportunity ?? null;
      const gateFields: LabValue[] = gd
        ? [
            { key: 'entryGate', label: 'Entry gate', value: gd.gate ? gd.gate.reason : gd.disposition, unit: 'text' },
            ...(gd.gate?.trend ? gateValues('trend.', gd.gate.trend.values) : []),
            ...protectionFields(gd.gate?.protection),
            ...ddFields(gd.gate),
            ...(gd.validity ? gateValues('policy.', gd.validity) : []),
            ...(op
              ? [
                  { key: 'opportunity', label: 'Opportunity', value: op.id, unit: 'text' as const },
                  { key: 'opportunityEligibleThrough', label: 'Eligible through', value: dateAt(op.lastEligibleSession), unit: 'date' as const },
                  { key: 'opportunityOutcome', label: 'Opportunity outcome', value: fate(op), unit: 'text' as const }
                ]
              : [])
          ]
        : [];
      const values: LabValue[] = [
        { key: 'advance', label: 'Advance above the recent low', value: r2(s.advancePercent), unit: 'percent' },
        { key: 'previousAdvance', label: 'Advance on the previous bar', value: r2(s.previousAdvancePercent), unit: 'percent' },
        { key: 'recentLow', label: `Recent low (${n}-bar window)`, value: r4(s.recentLow), unit: 'price' },
        { key: 'recentLowBarEnd', label: 'Recent-low bar end', value: iso(low.end), unit: 'datetime' },
        { key: 'thresholdPrice', label: 'Threshold price', value: r4(s.thresholdPrice), unit: 'price' },
        { key: 'barStart', label: 'Signal bar start', value: iso(bar.start), unit: 'datetime' },
        {
          key: 'disposition',
          label: 'Disposition',
          value:
            o.status === 'filled'
              ? `taken: order filled (${tradeId})`
              : o.status === 'unfilled_at_end'
                ? 'taken: order not filled before the end of the window'
                : o.status === 'vetoed'
                  ? `vetoed: ${o.reason}`
                  : o.status === 'deferred'
                    ? `deferred: armed as ${op?.id} (${gd?.gate?.reason ?? 'blocked'})`
                    : o.reason === 'position_open'
                      ? `ignored: invested (${tradeId ?? '?'})`
                      : `ignored: the order for ${tradeId ?? '?'} is not filled yet`,
          unit: 'text'
        },
        ...originValues('base_growth', null, null),
        ...gateFields,
        ...(o.protection
          ? [
              { key: 'entryGate', label: 'Entry gate', value: o.protection.reason, unit: 'text' as const },
              ...protectionFields(o.protection)
            ]
          : [])
      ];
      const head = `Close ${s.close.toFixed(2)} is ${r2(s.advancePercent).toFixed(2)}% above the ${n}-bar low ${s.recentLow.toFixed(2)} (bar ending ${ny(low.end)})`;
      const reason =
        o.status === 'filled'
          ? `${head}. Flat: order placed, filled ${ny(o.trade!.entryTime)} at ${o.trade!.entryRawPrice.toFixed(2)} (${tradeId})`
          : o.status === 'unfilled_at_end'
            ? `${head}. Flat: order placed, but no eligible trade inside the window — not filled`
            : o.status === 'vetoed'
              ? `${head}. Not taken — ${o.protection ? o.protection.text : gateText(gd)}${op ? ` (opportunity ${op.id} invalidated at arming)` : ''}; with persistent eligibility OFF it is not replayed later`
              : o.status === 'deferred'
                ? `${head}. Not taken now — ${gateText(gd)}. Armed as opportunity ${op!.id} (${ELIGIBILITY_POLICY_LABEL[op!.policy]}, eligible through ${dateAt(op!.lastEligibleSession)}): ${fate(op!)}`
                : o.reason === 'position_open'
                  ? `${head}. Ignored: already invested (${tradeId}, bought ${ny(o.trade!.entryTime)}); not replayed later`
                  : `${head}. Ignored: the order of ${tradeId} is still waiting for its fill`;
      const notTaken = o.status === 'rejected' || o.status === 'vetoed' || o.status === 'deferred';
      events.push({
        id: `${symbol}:${notTaken ? 'rejected_signal' : 'entry_signal'}:${t}`,
        runId: request.runId,
        symbol,
        kind: notTaken ? 'rejected_signal' : 'entry_signal',
        t,
        timePrecision: daily ? 'session-close' : 'minute',
        timeMeaning: daily
          ? 'scheduled close of the session (16:00 ET, 13:00 on early-close days): the daily bar is complete'
          : `end of the completed ${request.resolution} bar: the signal is first knowable`,
        price: s.close,
        priceBasis: 'bar-close',
        reason,
        values,
        tradeId: o.status === 'filled' ? tradeId! : null,
        linkedEventId: null,
        meta: {
          signalOnly: false,
          standalone: true,
          disposition:
            o.status === 'rejected'
              ? 'ignored'
              : o.status === 'filled'
                ? 'taken'
                : o.status === 'vetoed' || o.status === 'deferred'
                  ? o.status
                  : 'unfilled',
          reasonCode: o.reason ?? o.status,
          heldBy: o.status === 'rejected' ? (tradeId ?? null) : null,
          origin: 'base_growth',
          ...(gd ? { entrySource: 'rise_from_recent_low', entryGate: gd.gate ? gd.gate.reason : gd.disposition, opportunity: op?.id ?? null } : {}),
          ...(o.protection ? { entryGate: o.protection.reason, protection: 'initial_stop_unavailable' } : {})
        }
      });
    }

    // v1.2.0: the later decisions of latched opportunities and the renewal signals (each once; never a repeated
    // per-bar signal). A latched decision is the entry decision of its trade; the raw crossing above stays its origin.
    for (const d of g?.decisions ?? []) {
      if (d.kind === 'crossing') continue;
      const op = d.opportunity!;
      const t = iso(d.time);
      const taken = d.disposition === 'taken';
      const tradeId = d.trade ? tradeIds.get(d.trade) : undefined;
      const values: LabValue[] = [
        ...originValues('base_growth', null, null),
        { key: 'entrySource', label: 'Entry source', value: d.kind === 'latched' ? `latched:${op.source}` : 'eligibility_renewal', unit: 'text' },
        { key: 'opportunity', label: 'Opportunity', value: op.id, unit: 'text' },
        { key: 'opportunitySignal', label: 'Opportunity armed (signal)', value: iso(op.signalTime), unit: 'datetime' },
        { key: 'opportunitySignalPrice', label: 'Signal price (not the fill)', value: r4(op.signalPrice), unit: 'price' },
        { key: 'ageSessions', label: 'Age at this decision (sessions)', value: d.session - op.signalSession, unit: 'sessions' },
        { key: 'opportunityEligibleThrough', label: 'Eligible through', value: dateAt(op.lastEligibleSession), unit: 'date' },
        ...(op.renewedFrom ? [{ key: 'renewedFrom', label: 'Renewed from', value: op.renewedFrom, unit: 'text' as const }] : []),
        ...(op.renewal
          ? [
              { key: 'renewal.reference', label: 'Ended opportunity’s signal price', value: r4(op.renewal.reference), unit: 'price' as const },
              { key: 'renewal.resetPrice', label: 'Reset close', value: r4(op.renewal.resetPrice), unit: 'price' as const },
              { key: 'renewal.trough', label: 'Lowest close since the reset', value: r4(op.renewal.trough), unit: 'price' as const },
              { key: 'renewal.reboundThreshold', label: 'Rebound threshold', value: r4(op.renewal.reboundThreshold), unit: 'price' as const }
            ]
          : []),
        { key: 'entryGate', label: 'Entry gate', value: d.gate ? d.gate.reason : d.disposition, unit: 'text' },
        ...(d.gate?.trend ? gateValues('trend.', d.gate.trend.values) : []),
        ...protectionFields(d.gate?.protection),
        ...ddFields(d.gate),
        ...(d.via
          ? [{ key: 'via', label: 'Decided at', value: 'the Drawdown Recovery Gate release (a completed one-minute close, intraday)', unit: 'text' as const }]
          : []),
        ...(d.validity ? gateValues('policy.', d.validity) : []),
        {
          key: 'disposition',
          label: 'Disposition',
          value: taken
            ? tradeId
              ? `taken: order filled (${tradeId})`
              : 'taken: order not filled before the end of the window'
            : d.disposition === 'deferred'
              ? `deferred: ${op.id} waits (${d.gate?.reason})`
              : `invalidated: ${d.reason}`,
          unit: 'text'
        }
      ];
      const what =
        d.kind === 'latched'
          ? `Latched opportunity ${op.id} (armed by the ${op.source === 'eligibility_renewal' ? 'renewal' : 'Rise'} signal of ${ny(op.signalTime)} at ${op.signalPrice.toFixed(2)}; ${ELIGIBILITY_POLICY_LABEL[op.policy]}), age ${d.session - op.signalSession} session(s)${d.via ? `, decided at the Drawdown Recovery Gate release ${ny(d.time)} (the minute close at which the gate turned permissive; not a new signal)` : ''}: its policy and the gates pass at ${d.price.toFixed(2)}`
          : `Renewal signal (${op.renewedFrom} ended unconsumed; reset to ${op.renewal!.resetPrice.toFixed(2)}, rebound ≥ ${op.renewal!.reboundThreshold.toFixed(2)}), close ${d.price.toFixed(2)}: opportunity ${op.id}`;
      events.push({
        id: `${symbol}:${d.kind}:${t}`,
        runId: request.runId,
        symbol,
        kind: taken ? 'entry_signal' : 'rejected_signal',
        t,
        timePrecision: daily && !d.via ? 'session-close' : 'minute',
        timeMeaning: d.via
          ? 'end of the completed one-minute bar at which the Drawdown Recovery Gate turned permissive: the decision is first knowable (intraday; the fill is the next eligible trade)'
          : daily
            ? 'scheduled close of the session (16:00 ET, 13:00 on early-close days): the daily bar is complete'
            : `end of the completed ${request.resolution} bar: the decision is first knowable`,
        price: d.price,
        priceBasis: 'bar-close',
        reason: taken
          ? `${what}. Order placed for the next eligible trade at the then-current price; ${tradeId ? `filled ${ny(d.trade!.entryTime)} at ${d.trade!.entryRawPrice.toFixed(2)} (${tradeId})` : 'not filled before the end of the window'}`
          : `${what}. Not taken now — ${gateText(d)}: ${fate(op)}`,
        values,
        tradeId: taken && tradeId ? tradeId : null,
        linkedEventId: null,
        meta: {
          signalOnly: false,
          standalone: true,
          origin: 'base_growth',
          entrySource: d.kind === 'latched' ? `latched:${op.source}` : 'eligibility_renewal',
          opportunity: op.id,
          disposition: taken ? (tradeId ? 'taken' : 'unfilled') : d.disposition,
          reasonCode: taken ? (tradeId ? 'filled' : 'unfilled_at_end') : (d.gate?.reason ?? d.disposition),
          entryGate: d.gate ? d.gate.reason : d.disposition,
          ...(d.via ? { via: d.via } : {})
        }
      });
    }

    // Continuation signals: a trigger (taken: its order) or a trigger suppressed by a base entry at the same instant.
    const ctl = sim.continuation;
    for (const o of ctl?.outcomes ?? []) {
      const t = iso(o.time);
      const e = o.episode;
      const taken = o.status !== 'suppressed' && o.status !== 'vetoed';
      const vetoed = o.status === 'vetoed';
      const tradeId = o.trade ? tradeIds.get(o.trade) : undefined;
      const values: LabValue[] = [
        ...originValues('continuation', e.method, e.id),
        { key: 'qualifyingExit', label: 'Opened by the profitable exit of', value: tradeIds.get(e.sourceTrade) ?? null, unit: 'text' },
        { key: 'exitNet', label: 'That exit’s net', value: r2(e.exitNet), unit: 'usd' },
        { key: 'windowFrom', label: 'Window first session', value: r.ds.dates[e.firstEligibleSession] ?? null, unit: 'date' },
        { key: 'windowTo', label: 'Window last session', value: r.ds.dates[e.lastEligibleSession] ?? null, unit: 'date' },
        ...Object.entries(o.values).map(([key, value]): LabValue => ({
          key: `trigger.${key}`,
          label: key,
          value: typeof value === 'number' ? r4(value) : value,
          unit: typeof value === 'number' ? (/Percent$/.test(key) ? 'percent' : 'price') : 'text'
        })),
        {
          key: 'disposition',
          label: 'Disposition',
          value: taken
            ? o.status === 'filled'
              ? `taken: order filled (${tradeId})`
              : 'taken: order not filled before the end of the window'
            : vetoed
              ? `vetoed: ${o.reason} (the entry gate blocked the trigger; the window ends)`
              : 'suppressed: a base Growth entry was taken at the same instant (base priority)',
          unit: 'text'
        }
      ];
      const timeIsMinute = e.method === 'classic_d1' || !daily;
      events.push({
        id: `${symbol}:continuation:${t}`,
        runId: request.runId,
        symbol,
        kind: taken ? 'entry_signal' : 'rejected_signal',
        t,
        timePrecision: timeIsMinute ? 'minute' : 'session-close',
        timeMeaning: timeIsMinute
          ? `end of the completed ${e.method === 'classic_d1' ? '1-minute' : request.resolution} bar: the continuation trigger is first knowable`
          : 'scheduled close of the session: the daily bar is complete',
        price: o.price,
        priceBasis: 'bar-close',
        reason: taken
          ? `Continuation (${CONTINUATION_METHOD_LABEL[e.method]}, ${e.id}): trigger at ${o.price.toFixed(2)}; ${o.status === 'filled' ? `filled ${ny(o.trade!.entryTime)} at ${o.trade!.entryRawPrice.toFixed(2)} (${tradeId})` : 'no eligible trade before the end — not filled'}`
          : vetoed
            ? `Continuation (${CONTINUATION_METHOD_LABEL[e.method]}, ${e.id}) triggered at ${o.price.toFixed(2)}, but the entry gate blocked it (${o.reason}); not traded, and the window ends (no later re-trigger)`
            : `Continuation (${CONTINUATION_METHOD_LABEL[e.method]}, ${e.id}) would have triggered at ${o.price.toFixed(2)}, but a base Growth entry was taken at the same instant (base priority); not traded`,
        values,
        tradeId: taken && o.status === 'filled' ? tradeId! : null,
        linkedEventId: null,
        meta: {
          signalOnly: false,
          standalone: true,
          origin: 'continuation',
          method: e.method,
          episode: e.id,
          disposition: taken ? (o.status === 'filled' ? 'taken' : 'unfilled') : vetoed ? 'vetoed' : 'suppressed',
          reasonCode: taken ? o.status : vetoed ? o.reason : 'base_priority',
          ...(gated ? { entryGate: vetoed ? o.reason : taken ? 'pass' : null } : {})
        }
      });
    }

    // v1.3.0 retention: one partial fill of a position, as an executed exit of its trade (marked `partial`).
    const partialEvent = (f: ExitFill, row: LedgerRow, id: string, entryId: string): LabEvent => {
      const xt = timing(f.execution);
      const level = f.instruction.level ?? NaN;
      const ret = retention!;
      const pos = posOf(row.trade);
      const origin = originOf(row.trade);
      const how =
        f.reason === 'trailing stop gap'
          ? `the session opened at ${f.rawPrice.toFixed(2)}, through the active profit trailing stop ${level.toFixed(2)}`
          : `the active profit trailing stop ${level.toFixed(2)} was reached`;
      return {
        id: `${symbol}:${id}:partial-${f.n}`,
        runId: request.runId,
        symbol,
        kind: 'executed_exit',
        t: iso(f.time),
        timePrecision: xt.precision,
        timeMeaning: xt.meaning,
        price: f.rawPrice,
        priceBasis: 'fill',
        reason: `Partial sale (retain part of profitable trend): ${how} — its first event. Sold ${ret.sellPercent}% (${f.shares.toFixed(4)} shares) at ${EXECUTION_TEXT[f.execution as ExecutionPrice]}, keeping ${f.sharesAfter.toFixed(4)} shares. This fill: net ${usd(f.net)} (repaid ${usd(f.principal)} of principal with ${usd(f.interest)} of interest)${f.net < 0 ? ' — a loss: the actual fill is used' : ''}. The trailing stop is consumed: the remainder exits after ${ret.closesBelow} consecutive completed close(s) below SMA(${ret.smaSessions}), or by the initial risk stop, the maximum losing hold or the buffered loss`,
        values: [
          { key: 'exitReason', label: 'Exit reason', value: 'Partial sale (retain part of profitable trend)', unit: 'text' },
          { key: 'trigger', label: 'Triggered by', value: exitLabel(f.reason), unit: 'text' },
          { key: 'fill', label: 'Fill', value: f.execution, unit: 'text' },
          { key: 'fillNumber', label: 'Exit fill of the position', value: f.n, unit: 'count' },
          { key: 'stopPrice', label: 'Profit trailing stop level', value: r4(level), unit: 'price' },
          ...(pos?.stop ? [{ key: 'initialStop', label: 'Initial risk stop (still active)', value: r4(pos.stop.level), unit: 'price' as const }] : []),
          { key: 'sellPercent', label: 'Fraction sold', value: ret.sellPercent, unit: 'percent' },
          { key: 'sharesSold', label: 'Shares sold', value: r4(f.shares), unit: 'count' },
          { key: 'sharesRemaining', label: 'Shares kept (remainder)', value: r4(f.sharesAfter), unit: 'count' },
          { key: 'principalRepaid', label: 'Principal repaid (proportional)', value: r2(f.principal), unit: 'usd' },
          { key: 'principalRemaining', label: 'Principal still borrowed', value: r2(f.principalAfter), unit: 'usd' },
          { key: 'priceAfterCost', label: 'Price after cost', value: r4(f.price), unit: 'price' },
          { key: 'proceeds', label: 'Proceeds', value: r2(f.proceeds), unit: 'usd' },
          { key: 'gross', label: 'Gross P&L of this fill before costs', value: r2(f.grossBeforeCosts), unit: 'usd' },
          { key: 'costs', label: 'Costs of this fill (its share of the entry cost + the exit cost)', value: r2(f.entryCost + f.exitCost), unit: 'usd' },
          { key: 'interest', label: 'Interest paid with this fill', value: r2(f.interest), unit: 'usd' },
          { key: 'fillNet', label: 'Net of this fill', value: r2(f.net), unit: 'usd' },
          ...(f.instruction.sameTrade.length
            ? [{ key: 'sameTrade', label: 'Also due at this trade', value: f.instruction.sameTrade.join(', '), unit: 'text' as const }]
            : []),
          ...originValues(origin.origin, origin.method, null)
        ],
        tradeId: id,
        linkedEventId: entryId,
        meta: { standalone: true, origin: origin.origin, method: origin.method, partial: true, fill: f.n, rule: f.rule }
      };
    };

    // Executed entries and exits.
    const episodeOf = new Map(
      (ctl?.episodes ?? []).filter((e) => e.trade).map((e) => [e.trade!, e.id] as const)
    );
    const opened = new Map((ctl?.episodes ?? []).map((e) => [e.sourceTrade, e.id] as const));
    for (const row of rows) {
      const tr = row.trade;
      const id = `T-${row.number}`;
      const open = row.status === 'open';
      const origin = originOf(tr);
      const entryId = `${symbol}:${id}:entry`;
      const exitId = `${symbol}:${id}:exit`;
      const et = timing(tr.entryExecution);
      const source = g ? entrySourceOf(sim, tr) : null;
      const gd = g?.decisionOf(tr);
      const op = gd?.opportunity ?? null;
      const pos = posOf(tr);
      const stop = pos?.stop ?? null;
      const breakoutTrade = (tr.setupKind as string) === 'trend_breakout';
      const forWhat = origin.method
        ? `continuation trigger (${CONTINUATION_METHOD_LABEL[origin.method]}, ${episodeOf.get(tr)})`
        : breakoutTrade
          ? 'breakout signal'
          : source && source !== 'rise_from_recent_low'
            ? `${SOURCE_LABEL[source]} ${op?.id ?? ''}`.trim()
            : 'Rise signal';
      const stopText = stop
        ? `. Initial risk stop ${stop.level.toFixed(2)} = fill ${stop.fillPrice.toFixed(2)} − ${stop.atrMultiple} × ATR(${stop.atrSessions}) ${stop.atr.toFixed(4)} (true ranges of ${r.ds.dates[stop.atrFromSession]} … ${r.ds.dates[stop.atrToSession]}, before the fill session), active from the fill and fixed for the position`
        : '';
      events.push({
        id: entryId,
        runId: request.runId,
        symbol,
        kind: 'executed_entry',
        t: iso(tr.entryTime),
        timePrecision: et.precision,
        timeMeaning: et.meaning,
        price: tr.entryRawPrice,
        priceBasis: 'fill',
        reason: `Bought ${row.shares.toFixed(4)} shares ($${EXECUTION.notional.toLocaleString('en-US')}) at ${tr.entryRawPrice.toFixed(2)}, ${EXECUTION_TEXT[tr.entryExecution as ExecutionPrice]}, for the ${forWhat} decided ${ny(tr.decisionTime)} at ${tr.decisionPrice.toFixed(2)}${op && op.signalTime !== tr.decisionTime ? ` (signal of ${ny(op.signalTime)} at ${op.signalPrice.toFixed(2)}, ${op.ageSessionsAtDecision} session(s) earlier)` : ''}${stopText}${open ? ' — still open at the end of the window' : ''}`,
        values: [
          { key: 'decisionTime', label: 'Signal decided', value: iso(tr.decisionTime), unit: 'datetime' },
          { key: 'decisionPrice', label: 'Signal bar close', value: r4(tr.decisionPrice), unit: 'price' },
          { key: 'fill', label: 'Fill', value: tr.entryExecution, unit: 'text' },
          { key: 'carriedOvernight', label: 'Waited for a later session', value: tr.carriedOvernight, unit: 'text' },
          { key: 'priceAfterCost', label: 'Price after cost', value: r4(tr.entryPrice), unit: 'price' },
          { key: 'shares', label: 'Shares', value: r4(row.shares), unit: 'count' },
          { key: 'principal', label: 'Principal (borrowed)', value: row.principal, unit: 'usd' },
          { key: 'entryCost', label: 'Entry cost', value: r2(row.entryFriction), unit: 'usd' },
          ...originValues(origin.origin, origin.method, episodeOf.get(tr) ?? null),
          ...(source
            ? [
                { key: 'entrySource', label: 'Entry source', value: source, unit: 'text' as const },
                ...(op
                  ? [
                      { key: 'opportunity', label: 'Opportunity', value: op.id, unit: 'text' as const },
                      { key: 'opportunitySignal', label: 'Opportunity armed (signal)', value: iso(op.signalTime), unit: 'datetime' as const },
                      { key: 'opportunitySignalPrice', label: 'Signal price', value: r4(op.signalPrice), unit: 'price' as const },
                      { key: 'ageSessionsAtDecision', label: 'Age at the decision (sessions)', value: op.ageSessionsAtDecision, unit: 'sessions' as const },
                      { key: 'ageSessionsAtFill', label: 'Age at the fill (sessions)', value: tr.entryIndex - op.signalSession, unit: 'sessions' as const }
                    ]
                  : [])
              ]
            : []),
          ...(breakoutTrade && !source
            ? [{ key: 'entrySource', label: 'Entry source', value: 'trend_breakout', unit: 'text' as const }]
            : []),
          // v1.4.0: the Drawdown Recovery Gate at the decision (only with it ON)
          ...(drawdownCfg ? entryDrawdownValues(tr) : []),
          ...(stop
            ? [
                { key: 'initialStop', label: 'Initial risk stop (fixed)', value: r4(stop.level), unit: 'price' as const },
                { key: 'initialStopAtr', label: `ATR(${stop.atrSessions}) before the fill session`, value: r4(stop.atr), unit: 'price' as const },
                { key: 'initialStopMultiple', label: 'Stop distance (× ATR)', value: stop.atrMultiple, unit: 'ratio' as const },
                { key: 'initialStopDistance', label: 'Stop distance', value: r4(stop.atrMultiple * stop.atr), unit: 'price' as const },
                { key: 'initialStopAtrWindow', label: 'ATR sessions (completed before the fill)', value: `${r.ds.dates[stop.atrFromSession]} … ${r.ds.dates[stop.atrToSession]}`, unit: 'text' as const },
                { key: 'initialStopActiveFrom', label: 'Initial stop active from (the fill)', value: iso(stop.activeFrom), unit: 'datetime' as const }
              ]
            : [])
        ],
        tradeId: id,
        linkedEventId: open ? null : exitId,
        meta: {
          open,
          standalone: true,
          origin: origin.origin,
          method: origin.method,
          ...(source ? { entrySource: source, opportunity: op?.id ?? null } : {}),
          ...(breakoutTrade && !source ? { entrySource: 'trend_breakout' } : {}),
          ...(stop ? { initialStop: stop.level } : {}),
          ...(pos?.fills.some((f) => f.partial) ? { partialFills: pos.fills.filter((f) => f.partial).length } : {}),
          ...(drawdownCfg ? { drawdownGate: entryDrawdown(tr)?.state ?? null, ...(gd?.via ? { via: gd.via } : {}) } : {})
        }
      });
      // v1.3.0 retention: each partial fill is an executed exit of the SAME trade, marked partial (the position stays
      // open; its final exit, if any, is the trade's exit and carries the whole position's net).
      for (const f of row.exitFills?.filter((x) => x.partial) ?? []) events.push(partialEvent(f, row, id, entryId));
      if (open) continue;
      const xt = timing(tr.exitExecution);
      const sigSession = Number.isNaN(tr.bufferSignalTime)
        ? -1
        : tr.bufferSignalTime > ds.bTime[ds.sBarStart[tr.exitIndex]!]!
          ? tr.exitIndex
          : tr.exitIndex - 1;
      // v1.3.0: the final fill of a position under the optional rules (a remainder after partial fills: its own
      // shares and principal are what the buffer and the hold judged).
      const finalFill = pos?.fills.at(-1) ?? null;
      const multi = Boolean(row.exitFills && row.exitFills.length > 1);
      const fShares = multi ? finalFill!.shares : row.shares;
      const fPrincipal = multi ? finalFill!.principal : tr.investment;
      const bufferNet =
        sigSession >= 0
          ? fShares * tr.bufferSignalPrice -
            fPrincipal -
            (fPrincipal * EXECUTION.annualRate * (ds.sTime[sigSession]! - ds.sTime[tr.entryIndex]!)) / (365 * 86400)
          : NaN;
      const tv = finalFill?.instruction.values ?? {};
      const detail =
        tr.exitReason === 'maximum hold'
          ? `${row.interestDays} calendar days held and the opening trade showed a net loss${multi ? ' on the remaining shares and principal' : ''}; sold at ${EXECUTION_TEXT[tr.exitExecution as ExecutionPrice]}`
          : tr.exitReason === 'buffered intraday loss'
            ? `the minute ending ${ny(tr.bufferSignalTime)} closed at ${tr.bufferSignalPrice.toFixed(2)}: net ${usd(bufferNet)} after interest, at or below −${usd(multi ? (params.intradayLossBufferPercent * fPrincipal) / 100 : params.intradayLossBufferPercent * 1000)}${multi ? ` (${params.intradayLossBufferPercent}% of the remaining principal ${usd(fPrincipal)})` : ''}; sold at ${EXECUTION_TEXT[tr.exitExecution as ExecutionPrice]}`
            : tr.exitReason === 'trailing stop gap'
              ? `the session opened at ${tr.exitRawPrice.toFixed(2)}, through the active stop ${tr.exitStopPrice.toFixed(2)}; sold at the opening trade`
              : (tr.exitReason as string) === 'initial stop gap'
                ? `the session opened at ${tr.exitRawPrice.toFixed(2)}, through the initial risk stop ${pos!.stop!.level.toFixed(2)} (fill ${pos!.stop!.fillPrice.toFixed(2)} − ${pos!.stop!.atrMultiple} × ATR(${pos!.stop!.atrSessions}) ${pos!.stop!.atr.toFixed(4)}, active since ${ny(pos!.stop!.activeFrom)}); sold at the opening trade (not at the inaccessible stop level)`
                : (tr.exitReason as string) === 'initial stop'
                  ? `the initial risk stop ${pos!.stop!.level.toFixed(2)} (fill ${pos!.stop!.fillPrice.toFixed(2)} − ${pos!.stop!.atrMultiple} × ATR(${pos!.stop!.atrSessions}) ${pos!.stop!.atr.toFixed(4)}, active since ${ny(pos!.stop!.activeFrom)}) was reached${tr.exitIndex === tr.entryIndex ? ' on the entry session' : ''}; sold at ${EXECUTION_TEXT[tr.exitExecution as ExecutionPrice]}`
                  : (tr.exitReason as string) === 'trend exit'
                    ? `${tv.closesBelow} consecutive completed close(s) strictly below SMA(${tv.smaSessions}) (${tv.closesBelowFrom} … ${tv.closesBelowTo}; the last ${Number(tv.decisionClose).toFixed(2)} < ${Number(tv.decisionSma).toFixed(2)}), decided at the close of ${tv.closesBelowTo}; sold at ${EXECUTION_TEXT[tr.exitExecution as ExecutionPrice]}`
                    : `the active stop ${tr.exitStopPrice.toFixed(2)} was reached; sold at ${EXECUTION_TEXT[tr.exitExecution as ExecutionPrice]}`;
      const remainderText = multi
        ? `Remainder (${fShares.toFixed(4)} shares after ${row.exitFills!.length - 1} partial fill(s)) — `
        : '';
      const netText = multi
        ? `This fill: net ${usd(finalFill!.net)}; the position: net ${usd(row.net)} (${row.netReturnPercent.toFixed(2)}% of the principal) including its partial fill(s) ${usd(row.partialFillsNet!)}`
        : `Net ${usd(row.net)} (${row.netReturnPercent.toFixed(2)}% of the principal)`;
      events.push({
        id: exitId,
        runId: request.runId,
        symbol,
        kind: 'executed_exit',
        t: iso(tr.exitTime),
        timePrecision: xt.precision,
        timeMeaning: xt.meaning,
        price: tr.exitRawPrice,
        priceBasis: 'fill',
        reason: `${remainderText}${exitLabel(tr.exitReason)}: ${detail}. ${netText}`,
        values: [
          { key: 'exitReason', label: 'Exit reason', value: exitLabel(tr.exitReason), unit: 'text' },
          { key: 'fill', label: 'Fill', value: tr.exitExecution, unit: 'text' },
          { key: 'stopPrice', label: 'Trailing stop level at the exit', value: r4(tr.exitStopPrice), unit: 'price' },
          { key: 'stopActive', label: 'Stop active that session', value: tr.stopActiveAtExit, unit: 'text' },
          { key: 'maximumHoldDue', label: 'Maximum hold due at the open', value: tr.maximumHoldDue, unit: 'text' },
          ...(sigSession >= 0
            ? [
                { key: 'bufferDecision', label: 'Buffer decision', value: iso(tr.bufferSignalTime), unit: 'datetime' as const },
                { key: 'bufferPrice', label: 'Buffer decision close', value: r4(tr.bufferSignalPrice), unit: 'price' as const },
                { key: 'bufferNet', label: 'Net at the buffer decision', value: r2(bufferNet), unit: 'usd' as const }
              ]
            : []),
          { key: 'priceAfterCost', label: 'Price after cost', value: r4(tr.exitPrice), unit: 'price' },
          { key: 'calendarDays', label: 'Held (calendar days)', value: r2(row.calendarDaysHeld), unit: 'days' },
          { key: 'sessions', label: 'Held (sessions, inclusive)', value: row.sessionsHeld, unit: 'sessions' },
          { key: 'gross', label: 'Gross P&L before costs', value: r2(row.grossBeforeCosts), unit: 'usd' },
          { key: 'costs', label: 'Costs (entry + exit)', value: r2(row.entryFriction + row.exitFriction), unit: 'usd' },
          { key: 'interest', label: 'Margin interest', value: r2(row.interest), unit: 'usd' },
          { key: 'net', label: 'Net P&L', value: r2(row.net), unit: 'usd' },
          { key: 'netReturn', label: 'Net return on the principal', value: r2(row.netReturnPercent), unit: 'percent' },
          { key: 'priceReturn', label: 'Price return (raw fills)', value: r2(row.priceReturnPercent), unit: 'percent' },
          { key: 'mae', label: 'Worst mark while held (net)', value: r2(row.excursion.worst), unit: 'usd' },
          { key: 'mfe', label: 'Best mark while held (net)', value: r2(row.excursion.best), unit: 'usd' },
          { key: 'cumulative', label: 'Cumulative realized net', value: r2(cumulativeAfter.get(row)!), unit: 'usd' },
          ...originValues(origin.origin, origin.method, episodeOf.get(tr) ?? null),
          ...(continuation
            ? [
                {
                  key: 'opensContinuationWindow',
                  label: 'Opens a continuation window',
                  value: opened.get(tr) ?? (row.net > 0 ? 'qualifies' : 'no: net ≤ 0'),
                  unit: 'text' as const
                }
              ]
            : []),
          ...(finalFill
            ? [
                { key: 'exitRule', label: 'Exit rule', value: describeRule(finalFill.rule), unit: 'text' as const },
                ...(pos!.stop
                  ? [
                      { key: 'initialStop', label: 'Initial risk stop (fixed)', value: r4(pos!.stop.level), unit: 'price' as const },
                      { key: 'initialStopAtr', label: `ATR(${pos!.stop.atrSessions}) before the fill session`, value: r4(pos!.stop.atr), unit: 'price' as const },
                      { key: 'initialStopActiveFrom', label: 'Initial stop active from', value: iso(pos!.stop.activeFrom), unit: 'datetime' as const }
                    ]
                  : []),
                { key: 'decisionTime', label: 'Exit decided', value: iso(finalFill.instruction.decidedAt), unit: 'datetime' as const },
                ...(finalFill.instruction.sameTrade.length
                  ? [{ key: 'sameTrade', label: 'Also due at this trade (precedence)', value: finalFill.instruction.sameTrade.join(', '), unit: 'text' as const }]
                  : []),
                ...((tr.exitReason as string) === 'trend exit'
                  ? [
                      { key: 'trendSma', label: `SMA(${tv.smaSessions}) at the deciding close`, value: r4(Number(tv.decisionSma)), unit: 'price' as const },
                      { key: 'trendClose', label: 'Deciding close', value: r4(Number(tv.decisionClose)), unit: 'price' as const },
                      { key: 'trendCloses', label: 'Consecutive closes below the SMA', value: `${tv.closesBelowFrom} … ${tv.closesBelowTo}`, unit: 'text' as const }
                    ]
                  : []),
                ...(multi
                  ? [
                      { key: 'fills', label: 'Exit fills of the position', value: row.exitFills!.length, unit: 'count' as const },
                      { key: 'finalFillShares', label: 'Shares sold by this final fill', value: r4(fShares), unit: 'count' as const },
                      { key: 'finalFillPrincipal', label: 'Principal repaid by this final fill', value: r2(fPrincipal), unit: 'usd' as const },
                      { key: 'finalFillNet', label: 'Net of this final fill', value: r2(finalFill.net), unit: 'usd' as const },
                      { key: 'partialFillsNet', label: 'Net of the earlier partial fill(s)', value: r2(row.partialFillsNet!), unit: 'usd' as const },
                      { key: 'averageExitPrice', label: 'Average exit price (shares-weighted, raw)', value: r4(row.averageExitRawPrice!), unit: 'price' as const }
                    ]
                  : [])
              ]
            : [])
        ],
        tradeId: id,
        linkedEventId: entryId,
        meta: {
          standalone: true,
          origin: origin.origin,
          method: origin.method,
          ...(finalFill ? { exitRule: finalFill.rule, fills: pos!.fills.length } : {})
        }
      });
    }

    // v1.4.0: the Drawdown Recovery Gate's descriptive counts (path dependence: never a per-trade causal attribution)
    const drawdownSummary = () => {
      const gate = dd!;
      const eps = gate.episodes;
      const stats = (xs: number[]) => {
        if (!xs.length) return { n: 0, mean: null, median: null, min: null, max: null };
        const a = [...xs].sort((x, y) => x - y);
        const mid = a.length >> 1;
        return {
          n: a.length,
          mean: r4(a.reduce((x, y) => x + y, 0) / a.length),
          median: r4(a.length % 2 ? a[mid]! : (a[mid - 1]! + a[mid]!) / 2),
          min: r4(a[0]!),
          max: r4(a.at(-1)!)
        };
      };
      const count = <T,>(xs: T[], key: (x: T) => string) =>
        xs.reduce<Record<string, number>>((acc, x) => ((acc[key(x)] = (acc[key(x)] ?? 0) + 1), acc), {});
      const blocked = gate.transitions.filter((x) => x.event === 'entry_blocked_by_drawdown_gate');
      const ddBlocks = (gr: GateResult | null | undefined) => Boolean(gr?.drawdown && !gr.drawdown.pass);
      const crossingsBlocked = sim.outcomes.filter((o) => ddBlocks(o.gate?.gate));
      const continuationsBlocked = (sim.continuation?.outcomes ?? []).filter((o) => o.status === 'vetoed' && o.values['drawdown.state'] !== undefined && String(o.values.blockedBy ?? '').includes('drawdown'));
      const releaseDecisions = (g?.decisions ?? []).filter((d) => d.via === 'drawdown_release');
      const deferredTaken = (g?.opportunities ?? []).filter((o) => ddBlockedOpportunities.has(o.id) && o.trade);
      const afterBlockRows = rows.filter((row) => {
        const op = g?.decisionOf(row.trade)?.opportunity;
        return Boolean(op && ddBlockedOpportunities.has(op.id));
      });
      // the gate's state at each window session's close (reconstructed from its transitions, which carry the state after)
      const atClose: Record<string, number> = { normal: 0, recovery_required: 0, recovery_confirmed: 0, insufficient_history: 0 };
      let state = 'normal';
      let i = 0;
      const tr = gate.transitions.filter((x) => x.kind !== 'decision');
      for (let s = 0; s <= sim.endSession; s++) {
        while (i < tr.length && tr[i]!.t <= ds.sCloseTime[s]!) state = tr[i++]!.state;
        if (s >= sim.firstSession) atClose[gate.windowCompleteAt(s) ? state : 'insufficient_history']!++;
      }
      return {
        config: gate.config,
        episodes: {
          total: eps.length,
          detectedBeforeWindow: eps.filter((e) => e.beforeRun).length,
          detectedWhileWindowIncomplete: eps.filter((e) => !e.windowCompleteAtDetection).length,
          resolved: eps.filter((e) => e.state === 'resolved').length,
          resolvedBeforeConfirmation: eps.filter((e) => e.resolvedBeforeConfirmation).length,
          unresolvedAtEnd: count(eps.filter((e) => e.state !== 'resolved'), (e) => e.state),
          maxDipPercent: stats(eps.map((e) => e.maxDipPercent)),
          sessionsDetectionToResolution: stats(eps.filter((e) => e.state === 'resolved').map((e) => e.resolvedSession - e.detectedSession))
        },
        confirmations: {
          recoveryStarts: eps.reduce((a, e) => a + e.recoveryStarts, 0),
          confirmed: eps.reduce((a, e) => a + e.confirmations, 0),
          resetsBeforeConfirmation: eps.reduce((a, e) => a + e.confirmationResets, 0),
          confirmationsLost: eps.reduce((a, e) => a + e.confirmationLosses, 0),
          resetsByCause: eps.reduce<Record<string, number>>((acc, e) => {
            for (const [k, v] of Object.entries(e.resetsByCause)) acc[k] = (acc[k] ?? 0) + v;
            return acc;
          }, {})
        },
        releases: { total: gate.releases.length, byCause: count(gate.releases, (x) => x.cause) },
        blockedDecisions: { total: blocked.length, byKind: count(blocked, (x) => String(x.values.decisionKind)) },
        blockedCrossings: crossingsBlocked.length,
        blockedCrossingsByDisposition: count(crossingsBlocked, (o) => o.status),
        blockedContinuations: continuationsBlocked.length,
        opportunitiesBlocked: ddBlockedOpportunities.size,
        deferredEligibleEntries: deferredTaken.length,
        releaseDecisions: { total: releaseDecisions.length, taken: releaseDecisions.filter((d) => d.disposition === 'taken').length },
        tradesAfterAGateBlock: {
          trades: afterBlockRows.length,
          closed: afterBlockRows.filter((x) => x.status === 'closed').length,
          wins: afterBlockRows.filter((x) => x.status === 'closed' && x.net > 0).length,
          realizedNetUsd: r2(afterBlockRows.filter((x) => x.status === 'closed').reduce((a, x) => a + x.net, 0))
        },
        windowSessionsAtClose: atClose,
        stateAtEnd: gate.state,
        note: 'Descriptive counts of one run. Path dependence: a blocked or delayed entry changes every later decision, so these are not causal per-trade contributions — compare with an otherwise identical run with the gate OFF (paired).'
      };
    };
    const drawdown = (d: (typeof metrics.drawdown)['minute'], asDate: boolean) => ({
      ...d,
      peakTime: d.peakTime === null ? null : asDate ? dateOf(d.peakTime) : iso(d.peakTime),
      troughTime: d.troughTime === null ? null : asDate ? dateOf(d.troughTime) : iso(d.troughTime),
      recoveryTime: d.recoveryTime === null ? null : asDate ? dateOf(d.recoveryTime) : iso(d.recoveryTime)
    });
    perSymbol[symbol] = {
      ...metrics,
      drawdown: { minute: drawdown(metrics.drawdown.minute, false), daily: drawdown(metrics.drawdown.daily, true) },
      exitParams: {
        trailingStopFraction: exit.trailingStopPercentage,
        maximumHoldDays: Number.isFinite(exit.maximumHoldDays) ? exit.maximumHoldDays : null,
        intradayLossBufferFraction: Number.isFinite(exit.intradayLossBuffer) ? exit.intradayLossBuffer : null
      },
      // v1.4.0: descriptive Drawdown Recovery Gate counts (only with it ON)
      ...(dd ? { drawdownGate: drawdownSummary() } : {})
    };
    // v1.3.0: the per-fill accounting of a position under the optional rules (every fill, its principal repayment,
    // interest, costs and net; the stop; the open remainder), enough to re-book it independently.
    const fillRecord = (f: ExitFill, entryIndex: number) => ({
      fill: f.n,
      partial: f.partial,
      rule: f.rule,
      reason: f.reason,
      ...when(f.time),
      session: r.ds.dates[f.session]!,
      execution: f.execution,
      rawPrice: f.rawPrice,
      priceAfterCost: f.price,
      shares: f.shares,
      principalRepaid: f.principal,
      interestPaid: f.interest,
      interestDays: Math.round((ds.sTime[f.session]! - ds.sTime[entryIndex]!) / 86400),
      proceeds: f.proceeds,
      grossBeforeCosts: f.grossBeforeCosts,
      entryCostShare: f.entryCost,
      exitCost: f.exitCost,
      net: f.net,
      sharesAfter: f.sharesAfter,
      principalAfter: f.principalAfter,
      decidedUtc: iso(f.instruction.decidedAt),
      level: f.instruction.level,
      sameTrade: f.instruction.sameTrade
    });
    const ledgerRules = (row: LedgerRow) => {
      const p = posOf(row.trade);
      return {
        initialStop: p?.stop
          ? {
              level: p.stop.level,
              fillPrice: p.stop.fillPrice,
              atr: p.stop.atr,
              atrSessions: p.stop.atrSessions,
              atrMultiple: p.stop.atrMultiple,
              atrFromSession: r.ds.dates[p.stop.atrFromSession]!,
              atrToSession: r.ds.dates[p.stop.atrToSession]!,
              activeFromUtc: iso(p.stop.activeFrom),
              decisionUtc: iso(p.stop.decisionTime)
            }
          : null,
        stage: p ? (p.closed ? 'closed' : p.stage) : null,
        exitFills: (p?.fills ?? []).map((f) => fillRecord(f, row.trade.entryIndex)),
        partialFillsNet: p?.partialNet ?? 0,
        remainderOpen: p && !p.closed && p.remainder ? { ...p.remainder, pendingTrendExit: p.pendingTrend ? { ...when(p.pendingTrend.time), values: p.pendingTrend.values } : null } : null,
        averageExitRawPrice: row.averageExitRawPrice ?? (row.status === 'closed' ? row.exitRawPrice : null)
      };
    };
    ledgers[symbol] = rows.map((row) => ({
      trade: `T-${row.number}`,
      status: row.status,
      origin: originOf(row.trade).origin,
      method: originOf(row.trade).method,
      episode: episodeOf.get(row.trade) ?? null,
      opensEpisode: opened.get(row.trade) ?? null,
      decisionTimeUtc: iso(row.trade.decisionTime),
      decisionTimeNewYork: ny(row.trade.decisionTime),
      decisionPrice: row.trade.decisionPrice,
      entryTimeUtc: iso(row.trade.entryTime),
      entryTimeNewYork: ny(row.trade.entryTime),
      entryFill: row.trade.entryExecution,
      entryFillPrice: row.entryRawPrice,
      entryPriceAfterCost: row.entryPrice,
      shares: row.shares,
      principal: row.principal,
      exitTimeUtc: row.status === 'open' ? null : iso(row.trade.exitTime),
      exitTimeNewYork: row.status === 'open' ? null : ny(row.trade.exitTime),
      exitReason: row.trade.exitReason,
      exitFill: row.status === 'open' ? null : row.trade.exitExecution,
      exitFillPrice: row.status === 'open' ? null : row.exitRawPrice,
      exitPriceAfterCost: row.status === 'open' ? null : row.exitPrice,
      markPrice: row.status === 'open' ? row.exitRawPrice : null,
      exitStopPrice: row.trade.exitStopPrice,
      stopActiveAtExit: row.trade.stopActiveAtExit,
      maximumHoldDue: row.trade.maximumHoldDue,
      bufferSignalTimeUtc: Number.isNaN(row.trade.bufferSignalTime) ? null : iso(row.trade.bufferSignalTime),
      bufferSignalPrice: Number.isNaN(row.trade.bufferSignalPrice) ? null : row.trade.bufferSignalPrice,
      grossBeforeCosts: row.grossBeforeCosts,
      entryCost: row.entryFriction,
      exitCost: row.exitFriction,
      interest: row.interest,
      net: row.net,
      netReturnPercent: row.netReturnPercent,
      priceReturnPercent: row.priceReturnPercent,
      calendarDaysHeld: row.calendarDaysHeld,
      sessionsHeld: row.sessionsHeld,
      interestDays: row.interestDays,
      worstMark: row.excursion.worst,
      worstMarkTimeUtc: iso(row.excursion.worstTime),
      bestMark: row.excursion.best,
      bestMarkTimeUtc: iso(row.excursion.bestTime),
      ...(g
        ? (() => {
            const op = g.decisionOf(row.trade)?.opportunity ?? null;
            return {
              entrySource: entrySourceOf(sim, row.trade),
              opportunity: op?.id ?? null,
              opportunitySignalTimeUtc: op ? iso(op.signalTime) : null,
              opportunitySignalPrice: op?.signalPrice ?? null,
              ageSessionsAtDecision: op ? op.ageSessionsAtDecision : null,
              ageSessionsAtFill: op ? row.trade.entryIndex - op.signalSession : null
            };
          })()
        : {}),
      // v1.3.0 (only with the breakout entry, the initial risk stop or retention ON)
      ...((row.trade.setupKind as string) === 'trend_breakout' && !g ? { entrySource: 'trend_breakout' } : {}),
      ...(rules ? ledgerRules(row) : {}),
      // v1.4.0 (only with the Drawdown Recovery Gate ON): the gate at this trade's entry decision
      ...(drawdownCfg
        ? (() => {
            const d = entryDrawdown(row.trade);
            const gd = g?.decisionOf(row.trade);
            const op = gd?.opportunity ?? null;
            return {
              drawdownGate: d
                ? {
                    stateAtDecision: d.state,
                    episode: d.values.episode ?? null,
                    threshold: d.values.threshold ?? null,
                    peak: d.values.peak ?? null,
                    trough: d.values.trough ?? null,
                    decidedAtRelease: gd?.via === 'drawdown_release',
                    opportunityBlockedByGateBefore: op ? ddBlockedOpportunities.has(op.id) : false
                  }
                : null
            };
          })()
        : {})
    }));
    marks[symbol] = sim.daily.map((d) => ({
      date: d.date,
      close: d.close,
      realized: d.realized,
      unrealized: d.unrealized,
      marked: d.marked,
      heldAtClose: d.heldAtClose
    }));
    const tradeRef = (t: LogEntry['trade']) => (t ? (tradeIds.get(t) ?? `order (unfilled, decided ${iso(t.decisionTime)})`) : null);
    // v1.2.0: machine-readable entry-gate records (only with a gate ON): every opportunity with its lifecycle, every
    // renewal watch, and one record per Growth entry decision with its gate values, trade, fill and final net.
    const netOf = (t: LogEntry['trade']) => {
      const row = t ? rowOf.get(t) : undefined;
      return row ? { trade: tradeIds.get(t!)!, status: row.status, netUsd: r2(row.net), netKind: row.status === 'open' ? 'unrealized (marked at the last close)' : 'realized', fill: { ...when(t!.entryTime), price: t!.entryRawPrice } } : { trade: t ? `order (unfilled, decided ${iso(t.decisionTime)})` : null, status: null, netUsd: null, netKind: null, fill: null };
    };
    // v1.4.0: a gate result's drawdown part (absent with the gate OFF: the 1.3.0 record shape)
    const ddRecord = (gr: GateResult) => (gr.drawdown ? { drawdown: gr.drawdown.values, blockedBy: gr.blockedBy } : {});
    const sessionDate = (i: number) => (i >= 0 ? (r.ds.dates[i] ?? null) : null);
    const drawdownRecords = () => {
      const gate = dd!;
      return {
        config: gate.config,
        detector: {
          firstSession: r.ds.dates[gate.origin],
          firstSimulatedSession: r.ds.dates[sim.firstSession],
          windowCompleteFrom: r.ds.dates[gate.origin + gate.config.lookbackSessions] ?? null,
          observations: gate.observations,
          fullObservations: gate.fullObservations,
          stateAtEnd: gate.state,
          observationRule:
            'opening trade and reopening trade after missing minutes: continuity only (handed to the gate after the decisions of their own instant); every completed regular-session minute close (at the minute end) and the closing print when the data have one (at the scheduled close): full observations; the detector reads from N sessions before the first simulated session'
        },
        episodes: gate.episodes.map((e) => ({
          id: e.id,
          epoch: e.epoch,
          state: e.state,
          peak: { ...when(e.peakTime), session: sessionDate(e.peakSession), price: e.peak, observation: e.peakKind },
          detected: { ...when(e.detectedTime), session: sessionDate(e.detectedSession), price: e.detectedPrice, dipPercent: r4(e.detectedDipPercent) },
          trough: { ...when(e.troughTime), session: sessionDate(e.troughSession), price: e.trough },
          maxDipPercent: r4(e.maxDipPercent),
          retracementPercent: gate.config.recoveryRetracementPercent,
          threshold: r4(e.threshold),
          troughUpdates: e.troughUpdates,
          recoveryStarts: e.recoveryStarts,
          confirmations: e.confirmations,
          confirmationResets: e.confirmationResets,
          confirmationLosses: e.confirmationLosses,
          resetsByCause: e.resetsByCause,
          firstConfirmed: Number.isFinite(e.firstConfirmedTime) ? when(e.firstConfirmedTime) : null,
          resolved: Number.isFinite(e.resolvedTime)
            ? { ...when(e.resolvedTime), session: sessionDate(e.resolvedSession), price: e.resolvedPrice, beforeConfirmation: e.resolvedBeforeConfirmation }
            : null,
          windowCompleteAtDetection: e.windowCompleteAtDetection,
          detectedBeforeWindow: e.beforeRun,
          blockedDecisions: e.blocked,
          streakAtEnd: e.streak
            ? { start: when(e.streak.startTime), startSession: sessionDate(e.streak.startSession), startPrice: e.streak.startPrice, confirmed: e.streak.confirmedSession >= 0 }
            : null
        })),
        transitions: gate.transitions.map((x) => ({
          seq: x.seq,
          ...when(x.t),
          session: sessionDate(x.session),
          event: x.event,
          episode: x.episode,
          observation: x.kind,
          price: x.price,
          state: x.state,
          reason: x.reason,
          values: x.values
        })),
        releases: gate.releases.map((x) => ({ ...when(x.time), session: sessionDate(x.session), price: x.price, observation: x.kind, episode: x.episode, cause: x.cause })),
        summary: perSymbol[symbol] ? (perSymbol[symbol] as { drawdownGate?: unknown }).drawdownGate ?? null : null
      };
    };
    const gateRecords = () => ({
      opportunities: g!.opportunities.map((o) => ({
        id: o.id,
        source: o.source,
        renewedFrom: o.renewedFrom,
        policy: o.policy,
        signal: { ...when(o.signalTime), session: r.ds.dates[o.signalSession], price: o.signalPrice, recentLow: o.recentLow, threshold: r4(o.threshold), advancePercent: r4(o.advancePercent) },
        lastEligibleSession: dateAt(o.lastEligibleSession),
        evaluations: o.evaluations,
        blockedEvaluations: o.blockedEvaluations,
        firstBlocked: Number.isFinite(o.firstBlockedTime) ? when(o.firstBlockedTime) : null,
        decision: Number.isFinite(o.decisionTime) ? { ...when(o.decisionTime), price: o.decisionPrice, ageSessions: o.ageSessionsAtDecision, values: o.decisionValues } : null,
        end: { state: o.endState, reason: o.endReason, ...(Number.isFinite(o.endTime) ? when(o.endTime) : { utc: null, newYork: null }), session: o.endSession >= 0 ? r.ds.dates[o.endSession] : null, values: o.endValues },
        renewal: o.renewal ? { ...o.renewal, resetTime: when(o.renewal.resetTime), troughTime: when(o.renewal.troughTime) } : null,
        transitions: o.transitions.map((x) => ({ ...when(x.t), session: r.ds.dates[x.session], state: x.state, reason: x.reason })),
        ...netOf(o.trade)
      })),
      renewalWatches: g!.watches.map((w) => ({
        id: w.id,
        after: w.from.id,
        reference: w.reference,
        start: when(w.startTime),
        lastSession: dateAt(w.lastSession),
        reset: Number.isFinite(w.resetTime) ? { ...when(w.resetTime), price: w.resetPrice } : null,
        trough: Number.isFinite(w.trough) ? { ...when(w.troughTime), price: w.trough } : null,
        end: w.end,
        endTime: Number.isFinite(w.endTime) ? when(w.endTime) : null
      })),
      entryDecisions: [
        ...sim.outcomes.map((o) => ({
          id: `${symbol}:${o.status === 'rejected' || o.status === 'vetoed' || o.status === 'deferred' ? 'rejected_signal' : 'entry_signal'}:${iso(o.decision.time)}`,
          kind: 'crossing' as const,
          source: o.decision.breakout ? 'trend_breakout' : 'rise_from_recent_low',
          t: o.decision.time,
          s: o.decision.sessionIndex,
          price: o.decision.price,
          crossing: o.decision.breakout
            ? null
            : { threshold: r4(o.decision.trigger), recentLow: o.decision.reference, advancePercent: r4(o.decision.signal!.advancePercent) },
          ...(o.decision.breakout
            ? { breakout: { priorHigh: o.decision.breakout.priorHigh, sma: o.decision.breakout.sma, smaThen: o.decision.breakout.smaThen } }
            : {}),
          disposition: o.status,
          reason: o.reason,
          gate: o.gate?.gate ? { decision: o.gate.gate.reason, text: o.gate.gate.text, capital: o.gate.gate.capital, trend: o.gate.gate.trend?.values ?? null, ...ddRecord(o.gate.gate) } : null,
          policy: o.gate?.validity ?? null,
          opportunity: o.gate?.opportunity?.id ?? null,
          ...netOf(o.status === 'rejected' ? null : o.trade)
        })),
        ...g!.decisions
          .filter((d) => d.kind !== 'crossing')
          .map((d) => ({
            id: `${symbol}:${d.kind}:${iso(d.time)}`,
            kind: d.kind,
            source: d.kind === 'latched' ? `latched:${d.opportunity!.source}` : 'eligibility_renewal',
            t: d.time,
            s: d.session,
            price: d.price,
            crossing: null,
            disposition: d.disposition,
            reason: d.reason,
            gate: d.gate ? { decision: d.gate.reason, text: d.gate.text, capital: d.gate.capital, trend: d.gate.trend?.values ?? null, ...ddRecord(d.gate) } : null,
            policy: d.validity,
            opportunity: d.opportunity?.id ?? null,
            ...(d.via ? { via: d.via } : {}),
            ...netOf(d.trade)
          })),
        ...(ctl?.outcomes ?? []).map((o) => ({
          id: `${symbol}:continuation:${iso(o.time)}`,
          kind: 'continuation' as const,
          source: `continuation:${o.episode.method}`,
          t: o.time,
          s: o.session,
          price: o.price,
          crossing: null,
          disposition: o.status,
          reason: o.reason,
          gate: o.status === 'vetoed' ? { decision: o.reason, text: null, capital: null, trend: null } : null,
          policy: null,
          opportunity: null,
          episode: o.episode.id,
          values: o.values,
          ...netOf(o.trade)
        }))
      ]
        .sort((a, b) => a.t - b.t || (a.id < b.id ? -1 : 1))
        .map(({ t, s: session, ...rest }) => ({ ...rest, time: when(t), session: r.ds.dates[session] ?? null }))
    });
    decisionLogs[symbol] = {
      episodes: (ctl?.episodes ?? []).map((e) => ({
        id: e.id,
        method: e.method,
        openedBy: tradeIds.get(e.sourceTrade) ?? null,
        exitTime: when(e.exitTime),
        exitPrice: e.exitPrice,
        exitNet: r2(e.exitNet),
        anchorSession: r.ds.dates[e.anchorSession],
        firstEligibleSession: r.ds.dates[e.firstEligibleSession] ?? null,
        lastEligibleSession: r.ds.dates[e.lastEligibleSession] ?? `${r.ds.dates.at(-1)} (window extends past the data)`,
        eligibleSessionsObserved: e.eligibleSessionsObserved,
        barsEvaluated: e.barsEvaluated,
        referenceHigh: e.referenceHigh,
        maxHighInWindow: Number.isFinite(e.maxHighInWindow) ? e.maxHighInWindow : null,
        armed: Number.isFinite(e.armedTime) ? { ...when(e.armedTime), price: e.armedPrice } : null,
        trigger: Number.isFinite(e.triggerTime) ? { ...when(e.triggerTime), price: e.triggerPrice, values: e.triggerValues } : null,
        end: e.end,
        endTime: Number.isFinite(e.endTime) ? when(e.endTime) : null,
        status: e.status,
        trade: e.trade ? (tradeIds.get(e.trade) ?? null) : null
      })),
      log: sim.log.entries.map((x) => ({
        seq: x.seq,
        ...when(x.t),
        precision: 'minute',
        session: r.ds.dates[x.session],
        event: x.event,
        origin: x.origin,
        method: x.method,
        episode: x.episode,
        ...(x.opportunity ? { opportunity: x.opportunity } : {}),
        trade: tradeRef(x.trade),
        disposition: x.disposition,
        reason: x.reason,
        values: x.values
      })),
      ...(g ? gateRecords() : {}),
      // v1.4.0: the Drawdown Recovery Gate's records (only with it ON)
      ...(dd ? { drawdownGate: drawdownRecords() } : {}),
      // v1.3.0: the optional rules' records (only with one ON)
      ...(optional
        ? {
            optionalRules: {
              ...(r.breakout
                ? {
                    breakout: {
                      config: r.breakout.config,
                      evaluatedSessions: r.breakout.evaluated,
                      signals: r.breakout.signals.length,
                      conditions: r.breakout.conditions,
                      unavailableSessions: r.breakout.unavailable.map((u) => ({ session: r.ds.dates[u.session]!, reason: u.reason, text: u.text }))
                    }
                  }
                : {}),
              ...(rules?.initialStop
                ? {
                    initialStopBlocked: rules.blocked.map((b) => ({
                      ...when(b.time),
                      session: r.ds.dates[b.session]!,
                      source: b.source,
                      reason: b.check.reason,
                      text: b.check.text,
                      values: b.check.values
                    }))
                  }
                : {}),
              positions: [...(rules?.positions.values() ?? [])].map((p) => ({
                trade: tradeIds.get(p.trade) ?? null,
                initialStop: p.stop ? { level: p.stop.level, atr: p.stop.atr, activeFromUtc: iso(p.stop.activeFrom) } : null,
                stage: p.closed ? 'closed' : p.stage,
                remainderFromSession: p.remainderFromSession >= 0 ? r.ds.dates[p.remainderFromSession]! : null,
                exitFills: p.fills.map((f) => fillRecord(f, p.trade.entryIndex)),
                trendExitDecisions: p.trendDecisions,
                pendingTrendExitAtEnd: !p.closed && p.pendingTrend ? { ...when(p.pendingTrend.time), values: p.pendingTrend.values } : null
              }))
            }
          }
        : {})
    };
    const mc = sim.markChanges!;
    for (let i = 0; i < mc.t.length; i++)
      minuteCsv.push(`${symbol},${mc.t[i]},${mc.marked[i]!.toFixed(2)}`);
    provenance[symbol] = { ...loaded.report, dataFile: loaded.report?.dataFile, firstSignalBar: r.firstSignalBar };
    progress(
      `${symbol}: ${metrics.signals.raw} signals, ${metrics.trades.filled} trades (${metrics.trades.open} open)`,
      (k + 1) / request.symbols.length
    );
  }

  const appRoot = fileURLToPath(new URL('..', import.meta.url));
  const repoRoot = join(appRoot, '..', '..');
  const engine = Object.fromEntries(
    ENGINE_FILES.map((f) => [
      f,
      createHash('sha256')
        .update(readFileSync(join(repoRoot, f)))
        .digest('hex')
    ])
  );

  const eventsSha = writeEvents(runDir, request.runId, events);
  const json = (o: unknown) => `${JSON.stringify(o, null, 2)}\n`;
  atomicWrite(
    join(runDir, 'metrics.json'),
    json({
      kind: 'trading backtest',
      strategy: {
        key: STRATEGY_KEY,
        version: request.strategyVersion,
        engineVersion: STRATEGY_VERSION,
        ...(legacy
          ? {
              legacyReplay: `${request.strategyVersion} replayed as ${STRATEGY_VERSION} with ${request.strategyVersion === '1.0.0' ? 'continuation, the entry trend filter, persistent eligibility, the three optional rules and the Drawdown Recovery Gate' : request.strategyVersion === '1.1.0' ? 'the entry trend filter, persistent eligibility, the three optional rules and the Drawdown Recovery Gate' : request.strategyVersion === '1.2.0' ? 'the Rise entry, the initial risk stop, trend retention and the Drawdown Recovery Gate' : 'the Drawdown Recovery Gate'} OFF`
            }
          : {})
      },
      // v1.3.0: the base entry method and the two exit options (OFF = the earlier versions' behaviour)
      entryMethod: { method: entryMethod, label: ENTRY_METHOD_LABEL[entryMethod], ...(breakoutCfg ? { breakout: breakoutCfg } : {}) },
      initialStop: initialStop
        ? {
            enabled: true,
            ...initialStop,
            atrConvention:
              'true range = max(high, previous close) − min(low, previous close) of completed daily sessions; ATR = their simple mean over the L sessions before the fill session (no Wilder smoothing)',
            level: 'actual raw fill price − multiple × ATR, fixed for the position, active from the fill',
            fills: 'a gap through the stop fills at that opening trade; a minute crossing it fills at the stop level (assumed)'
          }
        : { enabled: false },
      retention: retention
        ? {
            enabled: true,
            ...retention,
            rule: 'at the first profit trailing-stop event sell sellPercent of the shares; the remainder exits after closesBelow consecutive completed closes strictly below SMA(smaSessions) (the partial-sale session’s close is the first counted), at the next eligible trade; the initial risk stop, the maximum losing hold and the buffered loss keep applying to the remainder on its remaining principal',
            accounting:
              'debt-funded as before: each fill repays its proportional share of the $100,000 principal and pays the simple interest accrued on that share since the entry session; per-side costs on every fill; one logical position = one closed trade when its last share is sold'
          }
        : { enabled: false },
      continuation: continuation ?? { enabled: false },
      trendFilter: trendFilter ? { enabled: true, label: TREND_METHOD_LABEL[trendFilter.method], ...trendFilter } : { enabled: false },
      eligibility: eligibility ? { enabled: true, label: ELIGIBILITY_POLICY_LABEL[eligibility.policy], ...eligibility } : { enabled: false },
      // v1.4.0 (OFF = the earlier versions' behaviour)
      drawdownGate: drawdownCfg
        ? {
            enabled: true,
            ...drawdownCfg,
            units: 'dipThresholdPercent and recoveryRetracementPercent in percentage points; lookbackSessions and confirmationSessions in trading sessions of the data',
            rule: 'a filter on every Growth entry decision, never a signal: permits when no significant chronological dip (a close at least d below the highest EARLIER close of the current session and the N before it) is unresolved, or once the price has recovered r of the whole peak-to-trough decline and held it at every observation for Y trading-session intervals (to the same New York time), or regained the peak'
          }
        : { enabled: false },
      disclaimer:
        'Exploratory backtest of one configuration on historical data, not an optimised or validated strategy. Each symbol is an independent standalone backtest on its own $100,000 notional: the per-symbol figures are never summed, and are not comparable with a shared-slot pool such as vg-balanced.',
      execution: {
        notionalUsd: EXECUTION.notional,
        annualInterestRate: EXECUTION.annualRate,
        interestBasis: 'simple, per calendar day between the entry and exit session dates, 365-day year',
        costBpsPerSide: params.costBpsPerSide,
        commissionUsd: 0,
        stopFill: 'the stop price within a minute that crossed it, or the opening trade after a gap through it',
        stopSlippageBps: EXECUTION.stopSlippageBps,
        openPositionAtEnd: 'marked at the last close net of accrued interest; exit cost not charged; not closed',
        drawdownBasis: 'realized net + open position marked net of interest; percent of the $100,000 notional',
        priceUnits: 'USD per share, split-adjusted forward to each symbol’s first loaded session'
      },
      perSymbol
    })
  );
  atomicWrite(join(runDir, 'trades.json'), json({ runId: request.runId, standalonePerSymbol: true, trades: ledgers }));
  atomicWrite(join(runDir, 'daily.json'), json({ runId: request.runId, standalonePerSymbol: true, daily: marks }));
  atomicWrite(
    join(runDir, 'decisions.json'),
    json({
      runId: request.runId,
      kind: 'growth decision log',
      note: 'Chronological decisions and state transitions per symbol: base signals (taken/rejected), fills, exits (with the gross/cost/interest/net identity), and continuation episodes (opened, armed, window closed, suppressed, triggered, expired). Times in UTC with the America/New_York wall-clock time; instants are minute-precise (a daily decision is the session close).',
      continuation: continuation ?? { enabled: false },
      trendFilter: trendFilter ?? { enabled: false },
      eligibility: eligibility ?? { enabled: false },
      ...(optional
        ? {
            entryMethod,
            ...(breakoutCfg ? { breakout: breakoutCfg } : {}),
            initialStop: initialStop ?? { enabled: false },
            retention: retention ?? { enabled: false },
            optionalRulesNote:
              'With the trend-breakout entry, the initial risk stop or trend retention ON, each symbol also has `optionalRules`: the breakout scan (evaluated sessions, signals, sessions without enough history), every entry decision the initial risk stop blocked (ATR unavailable), and every position with its stop and its exit fills (partial and final: shares, principal repaid, interest, costs, net, the rule and why). The log holds initial_stop_set, partial_exit, trend_count and trend_exit_decision entries.'
          }
        : {}),
      ...(drawdownCfg
        ? {
            drawdownGate: { enabled: true, ...drawdownCfg },
            drawdownGateNote:
              'With the Drawdown Recovery Gate ON, each symbol also has `drawdownGate`: the detector (observation rule, first loaded session, when the discovery window is complete), every episode (stable id DD-n: peak, first qualifying observation, trough, threshold, confirmations, resets by cause, resolution), every causal transition (dip_detected, new_trough — one record per session for a run of new lows —, recovery_started, confirmation_reset, recovery_confirmed, confirmation_lost, dip_resolved, window_complete, entry_blocked_by_drawdown_gate) with its observation and the state after it, every release (blocking → permissive) and the summary counts. Gate results in entryDecisions carry `drawdown` and `blockedBy`; a latched decision taken at a release has `via: drawdown_release`.'
          }
        : {}),
      ...(gated && (trendFilter || eligibility)
        ? {
            entryGatesNote:
              'With the entry trend filter or persistent eligibility ON, each symbol also has `opportunities` (every armed opportunity: signal, lifecycle transitions, decision, end, trade and its realized or open unrealized net), `renewalWatches` (policy 5) and `entryDecisions` (one record per Growth entry decision — raw crossing, latched decision, renewal signal, continuation trigger — with the gate result, the observed trend values, the policy values, the opportunity, the trade, the fill and the final net). A blocked latched opportunity is evaluated at every completed bar; only its state changes are logged.'
          }
        : {}),
      perSymbol: decisionLogs
    })
  );
  // Deterministic gzip (no file name or mtime in the header): the change points of the minute-marked net.
  atomicWrite(join(runDir, 'minute-marks.csv.gz'), gzipSync(Buffer.from(`${minuteCsv.join('\n')}\n`, 'utf8'), { level: 6 }));
  atomicWrite(
    join(runDir, 'provenance.json'),
    json({ request, warmupSessions, basisBySymbol, engine, node: process.version, symbols: provenance })
  );
  emit({ type: 'done', events: events.length, eventsSha256: eventsSha, runDir: relative(repoRoot, runDir) });
}

main().catch((e: unknown) => {
  emit({ type: 'error', message: e instanceof Error ? e.message : String(e) });
  process.exitCode = 1;
});
