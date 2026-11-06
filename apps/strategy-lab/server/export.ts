// The research bundle of one completed run: a deterministic ZIP an analyst (or ChatGPT/Claude) can review WITHOUT the
// Strategy Lab server. Contents (docs/strategy-lab/EXPORTS.md):
//   README.md                    what the run is, its semantics, the files, metric definitions, limitations, checks
//   manifest.json                bundle schema, every file's sha256 and size, provenance, what is unavailable and why
//   run.json                     the run record (inputs, assumptions, provenance, code revision, metrics, phenotype)
//   parameters.json              the parameter snapshot, the effective values, the saved-but-inactive values, the schema
//   artifacts/<file>             UNMODIFIED copies of the run's artifacts, each verified against the run's manifest.json
//                                (events.json also against the database's sha256) before it is included
//   events.csv                   every event, one row, UTC and America/New_York times
//   trades.csv                   the trade ledger (Growth: trades.json; imports and pools: paired from the events)
//   continuation-episodes.csv    Growth with continuation: every episode (window, arming, trigger, end)
//   decision-log.csv             Growth: the chronological decision/state log
//   entry-decisions.csv          Growth 1.2.0 with an entry gate ON: one row per entry decision (gate values, trade, net)
//   opportunities.csv            Growth 1.2.0 with persistent eligibility ON: every armed opportunity and how it ended
//   entry-gates.md               Growth 1.2.0 with an entry gate ON: the gate counts and outcomes by entry source
//   exit-fills.csv               Growth 1.3.0 with the initial risk stop or retention ON: every exit fill of every
//                                position (partial and final), with its principal repayment, interest, costs and net
//   optional-rules.md            Growth 1.3.0 with an optional rule ON: the configuration, conventions and counts
//   drawdown-episodes.csv        Growth 1.4.0 with the Drawdown Recovery Gate ON: every dip episode (peak, first
//                                qualifying observation, trough, threshold, confirmations, resets, resolution)
//   drawdown-transitions.csv     Growth 1.4.0 with the gate ON: every causal gate transition and blocked decision
//   drawdown-gate.md             Growth 1.4.0 with the gate ON: the configuration, conventions and counts
//   daily-marks.csv              Growth: the daily marks per symbol
//   attribution.json / .md       per-origin attribution (descriptive, NOT the causal effect) and the continuation counts
// The bundle never changes a run artifact, reads only the allowlisted files of that run's directory, and is refused if
// any text in it contains the server's access token.

import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { gunzipSync } from 'node:zlib';

import type { DecisionsFile, DrawdownGateCounts, ExitFillRecord, SymbolMetrics } from '../shared/artifact-types.ts';
import type { LabEvent, RunDetail } from '../shared/contract.ts';
import type { PreviewService } from './previews.ts';
import { effectiveParams, isActive } from '../shared/params.ts';
import { findStrategy } from '../shared/strategies.ts';
import { readEvents, sha256 } from './artifacts.ts';
import type { Config } from './config.ts';
import type { Repo } from './repo.ts';
import { type ZipEntry, writeZip } from './zip.ts';

export const BUNDLE_SCHEMA = 'strategy-lab.research-bundle';
export const BUNDLE_VERSION = 1;
export const MAX_BUNDLE_BYTES = 400 * 1024 * 1024;

/** The run artifacts a bundle may copy (nothing else in a run directory is ever read). */
export const ARTIFACT_FILES = [
  'request.json',
  'events.json',
  'metrics.json',
  'trades.json',
  'daily.json',
  'decisions.json',
  'provenance.json',
  'import.json',
  'study8-output.json',
  'manifest.json'
];
const MINUTE_FILE = 'minute-marks.csv.gz';

const NY = new Intl.DateTimeFormat('en-US', {
  timeZone: 'America/New_York',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hourCycle: 'h23',
  timeZoneName: 'short'
});
export const newYork = (iso: string | null | undefined) => {
  if (!iso) return '';
  const p = Object.fromEntries(NY.formatToParts(new Date(iso)).map((x) => [x.type, x.value]));
  return `${p.year}-${p.month}-${p.day} ${p.hour}:${p.minute}:${p.second} ${p.timeZoneName}`;
};

const cell = (v: unknown) => {
  if (v === null || v === undefined) return '';
  const s = typeof v === 'object' ? JSON.stringify(v) : String(v);
  return /[",\n\r]/.test(s) ? `"${s.replaceAll('"', '""')}"` : s;
};
export const csv = (header: string[], rows: unknown[][]) =>
  `${[header.join(','), ...rows.map((r) => r.map(cell).join(','))].join('\n')}\n`;

const value = (e: LabEvent | undefined, key: string) => e?.values.find((v) => v.key === key)?.value ?? null;

interface Bundle {
  filename: string;
  zip: Buffer;
  manifest: Record<string, unknown>;
}

export function buildResearchBundle(cfg: Config, repo: Repo, runId: string, opts: { minuteMarks?: boolean } = {}): Bundle {
  const run = repo.runDetail(runId);
  if (!run) throw new ExportError(404, `no run ${runId}`);
  if (run.status !== 'completed' || !run.artifactDir) throw new ExportError(409, `${runId} is ${run.status}: only completed runs export`);
  const dir = join(cfg.stateDir, run.artifactDir);
  const stored = existsSync(join(dir, 'manifest.json'))
    ? (JSON.parse(readFileSync(join(dir, 'manifest.json'), 'utf8')) as { sha256: Record<string, string> }).sha256
    : {};
  const { events } = readEvents(dir, run.artifact.sha256); // throws if events.json no longer matches the database
  const read = (f: string) => {
    if (!existsSync(join(dir, f))) return null;
    const data = readFileSync(join(dir, f));
    if (f !== 'manifest.json' && stored[f] && sha256(data) !== stored[f])
      throw new ExportError(500, `${f} of ${runId} no longer matches its manifest sha256 (restore it from a backup)`);
    return data;
  };
  const shown: RunDetail & { artifactDir?: string | null } = { ...run };
  delete shown.artifactDir; // a server path, never part of the bundle
  return buildBundle(cfg, { run: shown, request: repo.runRequest(runId), events, stored, read, has: (f) => existsSync(join(dir, f)) }, opts);
}

/**
 * The research bundle of a cached Interactive Preview: the same contents as a saved run's, every artifact verified
 * against the cache entry, and labelled TEMPORARY PREVIEW (id PV-…, not a saved run) in the README and manifest.
 */
export function buildPreviewBundle(cfg: Config, previews: PreviewService, previewId: string, opts: { minuteMarks?: boolean } = {}): Bundle {
  const detail = previews.detail(previewId);
  const entry = previews.entryOf(previewId);
  const read = (f: string) => (entry.meta.files[f] ? previews.cache.readFile(entry, f) : null);
  const stored = (JSON.parse(read('manifest.json')!.toString('utf8')) as { sha256: Record<string, string> }).sha256;
  const events = (JSON.parse(read('events.json')!.toString('utf8')) as { events: LabEvent[] }).events;
  return buildBundle(cfg, { run: detail, request: detail.request, events, stored, read, has: (f) => Boolean(entry.meta.files[f]) }, opts);
}

interface BundleSource {
  run: RunDetail;
  request: unknown;
  events: LabEvent[];
  /** The source's own manifest (file → sha256). */
  stored: Record<string, string>;
  /** One artifact, verified against the source's records; null when the source has no such file. */
  read: (file: string) => Buffer | null;
  has: (file: string) => boolean;
}

function buildBundle(cfg: Config, src: BundleSource, opts: { minuteMarks?: boolean }): Bundle {
  const { run, request, events, stored, read } = src;
  const unavailable: Record<string, string> = {};
  const files: { name: string; data: Buffer; description: string }[] = [];
  const add = (name: string, data: string | Buffer, description: string) =>
    files.push({ name, data: typeof data === 'string' ? Buffer.from(data, 'utf8') : data, description });

  // 1. Unmodified artifacts, verified before inclusion.
  for (const f of [...ARTIFACT_FILES, ...(opts.minuteMarks ? [MINUTE_FILE] : [])]) {
    const data = read(f);
    if (data) add(`artifacts/${f}`, data, `unmodified copy of the ${run.kind === 'preview' ? 'preview' : 'run'} artifact ${f}${stored[f] ? ` (sha256 verified against the ${run.kind === 'preview' ? 'preview cache entry' : 'run manifest'})` : ''}`);
  }
  if (!opts.minuteMarks)
    unavailable[MINUTE_FILE] = src.has(MINUTE_FILE)
      ? 'not included by default (large); export with "include minute marks" to add it'
      : 'not recorded by this run (runs before Growth 1.1.0, imports and signal-only runs have none)';
  else if (!src.has(MINUTE_FILE)) unavailable[MINUTE_FILE] = 'not recorded by this run';

  const json = (f: string) => {
    const data = read(f);
    return data ? (JSON.parse(data.toString('utf8')) as Record<string, unknown>) : null;
  };
  const metrics = json('metrics.json');
  const tradesFile = json('trades.json') as { trades?: Record<string, Record<string, unknown>[]> } | null;
  const dailyFile = json('daily.json') as { daily?: Record<string, Record<string, unknown>[]> } | null;
  const decisions = json('decisions.json') as DecisionsFile | null;

  // 2. Run record and parameters.
  const publicRun = Object.fromEntries(Object.entries(run).filter(([k]) => k !== 'artifactDir' && k !== 'progress' && k !== 'request'));
  add('run.json', `${JSON.stringify({ ...publicRun, request }, null, 2)}\n`, 'the run record: inputs, assumptions, provenance, code revision, metrics, phenotype link');
  const spec = findStrategy(run.strategy.key, run.strategy.version);
  const reqParams = (request as { params?: Record<string, unknown> } | null)?.params ?? null;
  add(
    'parameters.json',
    `${JSON.stringify(
      {
        strategy: { ...run.strategy, formerTitle: run.strategyFormerTitle },
        snapshot: run.params,
        effective: spec && reqParams ? effectiveParams(spec, reqParams) : null,
        savedNotApplied:
          spec && reqParams
            ? Object.fromEntries(Object.entries(reqParams).filter(([k]) => !isActive(spec, reqParams, k)))
            : null,
        resolution: run.window.resolution,
        schema: run.paramSchema,
        note: 'effective = the values the engine executed; savedNotApplied = values stored with the request whose switch or method made them inactive'
      },
      null,
      2
    )}\n`,
    'parameter snapshot, effective values, saved-but-inactive values, parameter schema'
  );

  // 3. Events.
  add(
    'events.csv',
    csv(
      ['id', 'symbol', 'kind', 't_utc', 't_new_york', 'time_precision', 'price', 'price_basis', 'trade_id', 'linked_event_id', 'origin', 'method', 'episode', 'reason', 'values_json', 'meta_json'],
      events.map((e) => [
        e.id,
        e.symbol,
        e.kind,
        e.t,
        e.timePrecision === 'day' ? e.t.slice(0, 10) : newYork(e.t),
        e.timePrecision,
        e.price,
        e.priceBasis,
        e.tradeId,
        e.linkedEventId,
        e.meta?.origin ?? value(e, 'origin'),
        e.meta?.method ?? null,
        e.meta?.episode ?? value(e, 'episode'),
        e.reason,
        e.values,
        e.meta
      ])
    ),
    'every event of the run (signals, executed entries and exits, rejected/suppressed signals) with UTC and ET times'
  );

  // 4. Trades.
  const tradeHeader = ['symbol', 'trade', 'status', 'origin', 'method', 'episode', 'decision_utc', 'decision_new_york', 'entry_utc', 'entry_new_york', 'entry_fill', 'entry_price', 'exit_utc', 'exit_new_york', 'exit_reason', 'exit_price', 'shares', 'principal_usd', 'gross_before_costs_usd', 'costs_usd', 'interest_usd', 'net_usd', 'net_return_percent', 'calendar_days_held', 'sessions_held', 'source', 'entry_source', 'opportunity', 'age_sessions_at_decision'];
  if (tradesFile?.trades) {
    const rows = Object.entries(tradesFile.trades).flatMap(([symbol, list]) =>
      list.map((t) => [
        symbol, t.trade, t.status, t.origin ?? 'base_growth', t.method ?? null, t.episode ?? null,
        t.decisionTimeUtc, t.decisionTimeNewYork, t.entryTimeUtc, t.entryTimeNewYork, t.entryFill, t.entryFillPrice,
        t.exitTimeUtc, t.exitTimeNewYork, t.exitReason, t.exitFillPrice ?? t.markPrice, t.shares, t.principal,
        t.grossBeforeCosts, Number(t.entryCost ?? 0) + Number(t.exitCost ?? 0), t.interest, t.net, t.netReturnPercent,
        t.calendarDaysHeld, t.sessionsHeld,
        `${t.status === 'open' ? 'trades.json (open: marked at the last close, unrealized)' : 'trades.json'}${
          Array.isArray(t.exitFills) && (t.exitFills as unknown[]).length > 1
            ? `; ONE position closed in ${(t.exitFills as unknown[]).length} fills (see exit-fills.csv; the net is the whole position)`
            : Array.isArray(t.exitFills) && t.status === 'open' && (t.exitFills as unknown[]).length
              ? '; open remainder after a partial fill (see exit-fills.csv; the net is the whole position, partial fill realized)'
              : ''
        }`,
        t.entrySource ?? null, t.opportunity ?? null, t.ageSessionsAtDecision ?? null
      ])
    );
    add('trades.csv', csv(tradeHeader, rows), 'the trade ledger from trades.json (origin = the mechanism that opened the trade)');
  } else {
    const entries = events.filter((e) => e.kind === 'executed_entry');
    const byId = new Map(events.map((e) => [e.id, e]));
    const rows = entries.map((en) => {
      const ex = en.linkedEventId ? byId.get(en.linkedEventId) : undefined;
      const paired = ex && ex.linkedEventId === en.id && ex.tradeId === en.tradeId;
      return [
        en.symbol, en.tradeId, paired ? 'closed' : en.meta?.open ? 'open' : 'not linked', en.meta?.entrySetup ?? null, null, null,
        value(en, 'decisionTime'), newYork(value(en, 'decisionTime') as string | null), en.t, newYork(en.t), en.reason, en.price,
        paired ? ex.t : null, paired ? newYork(ex.t) : null, paired ? ex.meta?.exitReason ?? ex.reason : null, paired ? ex.price : null,
        value(en, 'shares'), value(en, 'principal'), paired ? value(ex, 'gross') : null, paired ? value(ex, 'friction') : null,
        paired ? value(ex, 'interest') : null, paired ? value(ex, 'net') : null, null, null, paired ? value(ex, 'sessionsHeld') : null,
        'paired from events.json (tradeId + linkedEventId); the source recorded no separate ledger',
        null, null, null
      ];
    });
    if (rows.length) add('trades.csv', csv(tradeHeader, rows), 'the trades, paired from the executed events (no ledger artifact for this run kind)');
    else unavailable['trades.csv'] = 'this run has no executed trades (signal-only or demo run)';
    if (rows.length) unavailable['trades.json'] = 'this run kind records no trade ledger file; trades.csv pairs the executed events instead';
  }

  // 5. Growth: episodes, decision log, daily marks.
  if (decisions?.perSymbol) {
    const episodes = Object.entries(decisions.perSymbol).flatMap(([symbol, d]) => d.episodes.map((e) => ({ symbol, ...e })));
    if (episodes.length)
      add(
        'continuation-episodes.csv',
        csv(
          ['symbol', 'id', 'method', 'opened_by', 'exit_utc', 'exit_new_york', 'exit_price', 'exit_net_usd', 'first_eligible_session', 'last_eligible_session', 'reference_high', 'max_high_in_window', 'armed_utc', 'armed_price', 'trigger_utc', 'trigger_price', 'end', 'end_utc', 'status', 'trade'],
          episodes.map((e) => [
            e.symbol, e.id, e.method, e.openedBy, e.exitTime?.utc, e.exitTime?.newYork, e.exitPrice, e.exitNet,
            e.firstEligibleSession, e.lastEligibleSession, e.referenceHigh, e.maxHighInWindow, e.armed?.utc ?? null,
            e.armed?.price ?? null, e.trigger?.utc ?? null, e.trigger?.price ?? null, e.end, e.endTime?.utc ?? null, e.status, e.trade
          ])
        ),
        'every continuation episode: window, arming, trigger and how it ended'
      );
    else unavailable['continuation-episodes.csv'] = 'continuation was OFF, or no profitable exit opened a window';
    add(
      'decision-log.csv',
      csv(
        ['symbol', 'seq', 't_utc', 't_new_york', 'session', 'event', 'origin', 'method', 'episode', 'trade', 'disposition', 'reason', 'values_json'],
        Object.entries(decisions.perSymbol).flatMap(([symbol, d]) =>
          d.log.map((x) => [symbol, x.seq, x.utc, x.newYork, x.session, x.event, x.origin, x.method, x.episode, x.trade, x.disposition, x.reason, x.values])
        )
      ),
      'the chronological decision/state log (base signals, fills, exits with the net identity, continuation transitions)'
    );
    // Growth 1.2.0 entry gates (only with the trend filter or eligibility ON)
    const decisionRows = Object.entries(decisions.perSymbol).flatMap(([symbol, d]) => (d.entryDecisions ?? []).map((x) => ({ symbol, ...x })));
    // Growth 1.4.0: the Drawdown Recovery Gate's columns, only when it was ON (earlier bundles keep their columns)
    const ddOn = Object.values(decisions.perSymbol).some((d) => d.drawdownGate);
    const ddOf = (x: (typeof decisionRows)[number]): Record<string, unknown> | null => {
      if (x.gate?.drawdown) return x.gate.drawdown;
      const v = x.values ?? {};
      return 'drawdown.state' in v
        ? Object.fromEntries(Object.entries(v).filter(([k]) => k.startsWith('drawdown.')).map(([k, y]) => [k.slice(9), y]))
        : null;
    };
    if (decisionRows.length)
      add(
        'entry-decisions.csv',
        csv(
          [
            'symbol', 'id', 'kind', 'source', 't_utc', 't_new_york', 'session', 'decision_price', 'crossing_threshold', 'crossing_recent_low', 'crossing_advance_percent', 'disposition', 'reason', 'gate', 'gate_text', 'capital_available', 'trend_values_json', 'policy_values_json', 'opportunity', 'episode', 'trade', 'trade_status', 'fill_utc', 'fill_price', 'net_usd', 'net_kind',
            ...(ddOn ? ['blocked_by', 'drawdown_state', 'drawdown_episode', 'drawdown_peak', 'drawdown_trough', 'drawdown_threshold', 'drawdown_confirmation_start', 'via', 'drawdown_values_json'] : [])
          ],
          decisionRows.map((x) => {
            const d = ddOf(x);
            return [
              x.symbol, x.id, x.kind, x.source, x.time.utc, x.time.newYork, x.session, x.price, x.crossing?.threshold ?? null, x.crossing?.recentLow ?? null,
              x.crossing?.advancePercent ?? null, x.disposition, x.reason, x.gate?.decision ?? null, x.gate?.text ?? null, x.gate?.capital ?? null,
              x.gate?.trend ?? null, x.policy, x.opportunity, x.episode ?? null, x.trade, x.status, x.fill?.utc ?? null, x.fill?.price ?? null, x.netUsd, x.netKind,
              ...(ddOn
                ? [
                    x.gate?.blockedBy ? x.gate.blockedBy.join(' ') : ((x.values ?? {}).blockedBy ?? null),
                    d?.state ?? null, d?.episode ?? null, d?.peak ?? null, d?.trough ?? null, d?.threshold ?? null, d?.confirmationStart ?? null,
                    x.via ?? null, d
                  ]
                : [])
            ];
          })
        ),
        'every Growth entry decision judged by the entry gates (raw crossings, latched decisions, renewal signals, continuation triggers) with the observed trend values, the policy values, the trade and its final realized or open unrealized net'
      );
    else unavailable['entry-decisions.csv'] = 'the entry trend filter and persistent eligibility were OFF (or the run predates Growth 1.2.0)';
    const opportunityRows = Object.entries(decisions.perSymbol).flatMap(([symbol, d]) => (d.opportunities ?? []).map((o) => ({ symbol, ...o })));
    if (opportunityRows.length)
      add(
        'opportunities.csv',
        csv(
          ['symbol', 'id', 'source', 'renewed_from', 'policy', 'signal_utc', 'signal_new_york', 'signal_session', 'signal_price', 'recent_low', 'threshold', 'advance_percent', 'last_eligible_session', 'evaluations', 'blocked_trend', 'blocked_insufficient_history', 'blocked_capital', 'first_blocked_utc', 'decision_utc', 'decision_price', 'age_sessions_at_decision', 'end_state', 'end_reason', 'end_utc', 'end_session', 'trade', 'trade_status', 'fill_utc', 'fill_price', 'net_usd', 'net_kind', 'transitions_json'],
          opportunityRows.map((o) => [
            o.symbol, o.id, o.source, o.renewedFrom, o.policy, o.signal.utc, o.signal.newYork, o.signal.session, o.signal.price, o.signal.recentLow,
            o.signal.threshold, o.signal.advancePercent, o.lastEligibleSession, o.evaluations, o.blockedEvaluations.trend_veto ?? 0,
            o.blockedEvaluations.insufficient_history ?? 0, o.blockedEvaluations.capital_unavailable ?? 0, o.firstBlocked?.utc ?? null,
            o.decision?.utc ?? null, o.decision?.price ?? null, o.decision?.ageSessions ?? null, o.end.state, o.end.reason, o.end.utc, o.end.session,
            o.trade, o.status, o.fill?.utc ?? null, o.fill?.price ?? null, o.netUsd, o.netKind, o.transitions
          ])
        ),
        'every armed opportunity (persistent eligibility): signal, age bound, blocked evaluations, decision, how it ended, its trade and final net'
      );
    else unavailable['opportunities.csv'] = 'persistent eligibility was OFF (or the run predates Growth 1.2.0)';
    // Growth 1.4.0: the Drawdown Recovery Gate's episodes and causal transitions (only with it ON)
    const ddSymbols = Object.entries(decisions.perSymbol).filter(([, d]) => d.drawdownGate);
    if (ddSymbols.length) {
      add(
        'drawdown-episodes.csv',
        csv(
          ['symbol', 'id', 'epoch', 'state', 'peak_utc', 'peak_new_york', 'peak_session', 'peak_price', 'peak_observation', 'detected_utc', 'detected_new_york', 'detected_session', 'detected_price', 'detected_dip_percent', 'trough_utc', 'trough_new_york', 'trough_session', 'trough_price', 'max_dip_percent', 'retracement_percent', 'threshold', 'trough_updates', 'recovery_starts', 'confirmations', 'resets_before_confirmation', 'confirmations_lost', 'resets_by_cause_json', 'first_confirmed_utc', 'resolved_utc', 'resolved_new_york', 'resolved_session', 'resolved_price', 'resolved_before_confirmation', 'window_complete_at_detection', 'detected_before_window', 'blocked_decisions_json'],
          ddSymbols.flatMap(([symbol, d]) =>
            d.drawdownGate!.episodes.map((e) => [
              symbol, e.id, e.epoch, e.state, e.peak.utc, e.peak.newYork, e.peak.session, e.peak.price, e.peak.observation, e.detected.utc,
              e.detected.newYork, e.detected.session, e.detected.price, e.detected.dipPercent, e.trough.utc, e.trough.newYork, e.trough.session,
              e.trough.price, e.maxDipPercent, e.retracementPercent, e.threshold, e.troughUpdates, e.recoveryStarts, e.confirmations,
              e.confirmationResets, e.confirmationLosses, e.resetsByCause, e.firstConfirmed?.utc ?? null, e.resolved?.utc ?? null,
              e.resolved?.newYork ?? null, e.resolved?.session ?? null, e.resolved?.price ?? null, e.resolved?.beforeConfirmation ?? null,
              e.windowCompleteAtDetection, e.detectedBeforeWindow, e.blockedDecisions
            ])
          )
        ),
        'every Drawdown Recovery Gate episode (stable id DD-n): the peak (which precedes the trough), the first observation at least d below it, the trough, the recovery threshold, confirmations, resets by cause and the resolution'
      );
      add(
        'drawdown-transitions.csv',
        csv(
          ['symbol', 'seq', 't_utc', 't_new_york', 'session', 'event', 'episode', 'observation', 'price', 'state_after', 'reason', 'values_json'],
          ddSymbols.flatMap(([symbol, d]) =>
            d.drawdownGate!.transitions.map((x) => [symbol, x.seq, x.utc, x.newYork, x.session, x.event, x.episode, x.observation, x.price, x.state, x.reason, x.values])
          )
        ),
        'every causal Drawdown Recovery Gate transition in time order (dip_detected, new_trough — one row per session for a run of new lows —, recovery_started, confirmation_reset, recovery_confirmed, confirmation_lost, dip_resolved, window_complete) and every entry decision it blocked (entry_blocked_by_drawdown_gate), with the observation and the state after it'
      );
    } else {
      unavailable['drawdown-episodes.csv'] = 'the Drawdown Recovery Gate was OFF (or the run predates Growth 1.4.0)';
      unavailable['drawdown-transitions.csv'] = 'the Drawdown Recovery Gate was OFF (or the run predates Growth 1.4.0)';
    }
  } else unavailable['decision-log.csv'] = 'not recorded by this run (only Growth 1.1.0 and later runs write decisions.json)';
  // Growth 1.3.0: every exit fill of the positions under the initial risk stop or retention.
  const fillRows = Object.entries(tradesFile?.trades ?? {}).flatMap(([symbol, list]) =>
    list.flatMap((t) =>
      ((t.exitFills as ExitFillRecord[] | undefined) ?? []).map((f) => {
        const stop = t.initialStop as { level?: number; atr?: number; atrFromSession?: string; atrToSession?: string } | null | undefined;
        return [
          symbol, t.trade, t.status, f.fill, f.partial ? 'partial' : 'final', f.rule, f.reason, f.utc, f.newYork, f.session, f.execution,
          f.rawPrice, f.priceAfterCost, f.shares, f.principalRepaid, f.interestPaid, f.interestDays, f.proceeds, f.grossBeforeCosts,
          f.entryCostShare, f.exitCost, f.net, f.sharesAfter, f.principalAfter, f.decidedUtc, f.level, f.sameTrade.join(' '),
          stop?.level ?? null, stop?.atr ?? null, stop ? `${stop.atrFromSession} … ${stop.atrToSession}` : null, t.net
        ];
      })
    )
  );
  if (fillRows.length)
    add(
      'exit-fills.csv',
      csv(
        ['symbol', 'trade', 'trade_status', 'fill', 'fill_kind', 'rule', 'reason', 't_utc', 't_new_york', 'session', 'execution', 'raw_price', 'price_after_cost', 'shares', 'principal_repaid_usd', 'interest_paid_usd', 'interest_days', 'proceeds_usd', 'gross_before_costs_usd', 'entry_cost_share_usd', 'exit_cost_usd', 'fill_net_usd', 'shares_after', 'principal_after_usd', 'decided_utc', 'stop_level', 'same_trade', 'initial_stop', 'initial_stop_atr', 'atr_sessions', 'position_net_usd'],
        fillRows
      ),
      'every exit fill (partial and final) of every position under the initial risk stop or trend retention: shares, the principal it repaid, the interest it paid, costs and net — the fills of a position add up to its trade row'
    );
  else unavailable['exit-fills.csv'] = 'the initial risk stop and trend retention were OFF (or the run predates Growth 1.3.0): every trade is one exit fill, in trades.csv';
  const perSymbolMetrics = (metrics?.perSymbol ?? {}) as Record<string, SymbolMetrics>;
  const optional = Object.fromEntries(
    Object.entries(perSymbolMetrics).filter(([, m]) => m && typeof m === 'object' && m.optionalRules).map(([sym, m]) => [sym, m.optionalRules!])
  );
  if (Object.keys(optional).length) add('optional-rules.md', optionalRulesMarkdown(optional, metrics), 'the optional rules (breakout entry, initial risk stop, trend retention): configuration, conventions and counts (descriptive)');
  else unavailable['optional-rules.md'] = 'the breakout entry, the initial risk stop and trend retention were OFF (or the run predates Growth 1.3.0)';

  if (dailyFile?.daily)
    add(
      'daily-marks.csv',
      csv(
        ['symbol', 'date', 'close', 'realized_usd', 'unrealized_usd', 'marked_usd', 'held_at_close'],
        Object.entries(dailyFile.daily).flatMap(([symbol, list]) =>
          list.map((d) => [symbol, d.date, d.close, d.realized, d.unrealized, d.marked, d.heldAtClose])
        )
      ),
      'daily marks per symbol (realized + open position marked net of interest at each close)'
    );
  else unavailable['daily-marks.csv'] = 'this run kind records no daily marks (see metrics for the drawdown statistics)';

  // 6. Attribution (descriptive).
  const perSymbol = (metrics?.perSymbol ?? {}) as Record<string, SymbolMetrics>;
  const attribution = Object.fromEntries(
    Object.entries(perSymbol)
      .filter(([, m]) => m && typeof m === 'object' && 'attribution' in m)
      .map(([sym, m]) => [sym, { attribution: m.attribution, continuation: m.continuation, drawdown: m.drawdown, pnl: m.pnl }])
  );
  if (Object.keys(attribution).length) {
    add('attribution.json', `${JSON.stringify(attribution, null, 2)}\n`, 'per-origin attribution (descriptive), continuation counts, drawdowns, P&L per symbol');
    add('attribution.md', attributionMarkdown(attribution), 'the attribution tables in prose form');
  } else unavailable['attribution.json'] = 'no per-origin attribution recorded (runs before Growth 1.1.0, imports, signal-only)';
  const gates = Object.fromEntries(
    Object.entries(perSymbol)
      .filter(([, m]) => m && typeof m === 'object' && m.entryGates)
      .map(([sym, m]) => [sym, { entryGates: m.entryGates!, signals: m.signals ?? {} }])
  );
  if (Object.keys(gates).length) add('entry-gates.md', entryGatesMarkdown(gates, metrics), 'the entry trend filter and persistent eligibility: counts, ages and outcomes by entry source (descriptive)');
  else unavailable['entry-gates.md'] = 'the entry trend filter and persistent eligibility were OFF (or the run predates Growth 1.2.0)';
  const dd = Object.fromEntries(
    Object.entries(perSymbol).filter(([, m]) => m && typeof m === 'object' && m.drawdownGate).map(([sym, m]) => [sym, m.drawdownGate!])
  );
  if (Object.keys(dd).length) add('drawdown-gate.md', drawdownGateMarkdown(dd), 'the Drawdown Recovery Gate: configuration, conventions and counts (descriptive)');
  else unavailable['drawdown-gate.md'] = 'the Drawdown Recovery Gate was OFF (or the run predates Growth 1.4.0)';

  // 7. README and manifest (deterministic: the run's own completion time is the bundle's timestamp).
  const stamp = new Date(run.completedAt ?? run.createdAt);
  add('README.md', readme(run, request, files.map((f) => [f.name, f.description]), unavailable, Boolean(opts.minuteMarks)), 'this description');
  const sorted = [...files].sort((a, b) => (a.name < b.name ? -1 : 1));
  const manifest = {
    schema: BUNDLE_SCHEMA,
    schemaVersion: BUNDLE_VERSION,
    runId: run.id,
    ...(run.kind === 'preview'
      ? { preview: { temporary: true, note: 'An Interactive Preview: a temporary result, not a saved run (no R- id). Save it as a run to keep it.', ...(run as RunDetail & { preview?: unknown }).preview as object } }
      : {}),
    title: run.title,
    strategy: run.strategy,
    exportedFor: run.completedAt,
    options: { minuteMarks: Boolean(opts.minuteMarks) },
    source: {
      eventsSha256: run.artifact.sha256,
      runManifestSha256: stored,
      note:
        run.kind === 'preview'
          ? 'artifacts/ holds unmodified copies of the cached preview; their sha256 equal the cache entry and its manifest'
          : 'artifacts/ holds unmodified copies; their sha256 equal the run manifest (and events.json the database record)'
    },
    files: Object.fromEntries(sorted.map((f) => [f.name, { sha256: sha256(f.data), bytes: f.data.length, description: f.description }])),
    unavailable
  };
  const entries: ZipEntry[] = [...sorted.map((f) => ({ name: f.name, data: f.data })), { name: 'manifest.json', data: Buffer.from(`${JSON.stringify(manifest, null, 2)}\n`) }];
  const total = entries.reduce((n, e) => n + e.data.length, 0);
  if (total > MAX_BUNDLE_BYTES) throw new ExportError(413, `the bundle would be ${Math.round(total / 1e6)} MB (limit ${MAX_BUNDLE_BYTES / 1e6} MB)`);
  if (cfg.token) {
    const token = Buffer.from(cfg.token, 'utf8');
    for (const e of entries) {
      const text = e.name.endsWith('.gz') ? gunzipSync(e.data) : e.data;
      if (text.includes(token)) throw new ExportError(500, `refusing to export: ${e.name} contains the access token`);
    }
  }
  return {
    filename: `strategy-lab-${run.kind === 'preview' ? `preview-${run.id.slice(0, 15)}` : run.id}${opts.minuteMarks ? '-with-minute-marks' : ''}.zip`,
    zip: writeZip(entries.sort((a, b) => (a.name < b.name ? -1 : 1)), stamp),
    manifest
  };
}

export class ExportError extends Error {
  constructor(
    readonly status: number,
    message: string
  ) {
    super(message);
  }
}

const usd = (x: unknown) => (typeof x === 'number' ? `${x < 0 ? '−' : ''}$${Math.abs(x).toLocaleString('en-US', { maximumFractionDigits: 2, minimumFractionDigits: 2 })}` : 'n/a');

function attributionMarkdown(a: Record<string, Pick<SymbolMetrics, 'attribution' | 'continuation' | 'drawdown' | 'pnl'>>) {
  const lines = ['# Attribution by entry origin (descriptive)', '', a[Object.keys(a)[0]!]?.attribution?.note ?? '', ''];
  for (const [sym, x] of Object.entries(a)) {
    lines.push(`## ${sym}`, '', '| Origin | Entries | Closed (W/L/0) | Open | Realized net | Gross before costs | Costs | Interest | Unrealized |', '| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |');
    for (const [k, v] of Object.entries(x.attribution?.byOrigin ?? {}))
      lines.push(`| ${k} | ${v.entries} | ${v.closed} (${v.wins}/${v.losses}/${v.breakeven}) | ${v.open} | ${usd(v.realizedNetUsd)} | ${usd(v.realizedGrossBeforeCostsUsd)} | ${usd(v.realizedCostsUsd)} | ${usd(v.realizedInterestUsd)} | ${usd(v.unrealizedNetUsd)} |`);
    const c = x.continuation;
    if (c?.enabled)
      lines.push('', `Continuation (${c.method}): ${c.episodes} episode(s) from ${c.qualifyingExits} qualifying exit(s); ended by ${Object.entries(c.endedBy ?? {}).map(([k, n]) => `${k} ${n}`).join(', ')}; ${c.armed} armed; ${c.filled} filled; ${c.suppressedBasePriority} suppressed by base priority; ${c.expiredWithLaterHigherHigh} expired although a higher high followed in the window.`);
    else lines.push('', 'Continuation: OFF.');
    lines.push('', `Drawdown (minute / daily): ${usd(x.drawdown?.minute?.maximumUsd)} / ${usd(x.drawdown?.daily?.maximumUsd)}. Total marked net: ${usd(x.pnl?.totalMarkedNetUsd)}.`, '');
  }
  return `${lines.join('\n')}\n`;
}

function drawdownGateMarkdown(d: Record<string, DrawdownGateCounts>) {
  const first = Object.values(d)[0]!;
  const c = first.config;
  const lines = [
    '# Drawdown Recovery Gate (descriptive)',
    '',
    `Configuration: dip lookback N = ${c.lookbackSessions} sessions, significant decline d = ${c.dipThresholdPercent}%, required retracement r = ${c.recoveryRetracementPercent}% of the whole decline, confirmation Y = ${c.confirmationSessions} session interval(s).`,
    '',
    'Conventions:',
    '',
    '- A filter on every Growth entry decision (base signal, latched opportunity, renewal, continuation trigger), never an entry signal; exits are never filtered.',
    '- Observations: every completed regular-session one-minute close (at the minute end) and the closing print (at the scheduled close) are full observations; the opening trade and the reopening trade after missing minutes only test continuity. A minute’s high and low are never used.',
    '- Detection: a close at least d below the highest EARLIER close of the current session and the N sessions before it (the peak precedes the trough). The window only discovers; an episode stays until a close regains its peak (then a fresh detection epoch starts).',
    '- Threshold: trough + (peak − trough) × r; a lower trough moves it and restarts the confirmation.',
    '- Confirmation: from the first full observation at/above the threshold (session 0), every later observation stays at/above it until the first full observation in session 0 + Y at/after the same New York time (or later: early close, missing minute). Y = 0: at once.',
    '- Blocking states: recovery required, and the discovery window reaching before the loaded data (insufficient history). With persistent eligibility ON an armed opportunity blocked by the gate may be decided at the release minute (fill at the next eligible trade); OFF, a blocked signal is never replayed.',
    '',
    'Counts are descriptive: a blocked or delayed entry changes every later decision (path dependence), so they are not per-trade causal effects. Compare an otherwise identical run with the gate OFF.',
    ''
  ];
  for (const [sym, x] of Object.entries(d)) {
    const e = x.episodes;
    lines.push(
      `## ${sym}`,
      '',
      `- Episodes: ${e.total} (resolved ${e.resolved}, of which ${e.resolvedBeforeConfirmation} by regaining the peak before a confirmation; unresolved at the end ${JSON.stringify(e.unresolvedAtEnd)}; detected in the warm-up ${e.detectedBeforeWindow}; detected while the window was incomplete ${e.detectedWhileWindowIncomplete}).`,
      `- Deepest decline per episode (%): mean ${e.maxDipPercent.mean ?? 'n/a'}, median ${e.maxDipPercent.median ?? 'n/a'}, max ${e.maxDipPercent.max ?? 'n/a'}. Sessions from detection to resolution: median ${e.sessionsDetectionToResolution.median ?? 'n/a'}, max ${e.sessionsDetectionToResolution.max ?? 'n/a'}.`,
      `- Recovery streaks started ${x.confirmations.recoveryStarts}; confirmed ${x.confirmations.confirmed}; reset before confirming ${x.confirmations.resetsBeforeConfirmation}; confirmations lost ${x.confirmations.confirmationsLost}; resets by cause ${JSON.stringify(x.confirmations.resetsByCause)}.`,
      `- Releases (blocking → permissive): ${x.releases.total} ${JSON.stringify(x.releases.byCause)}.`,
      `- Blocked entry decisions: ${x.blockedDecisions.total} ${JSON.stringify(x.blockedDecisions.byKind)} (a latched opportunity once per blocked stretch); blocked crossings ${x.blockedCrossings} ${JSON.stringify(x.blockedCrossingsByDisposition)}; blocked continuation triggers ${x.blockedContinuations}.`,
      `- Opportunities the gate blocked at least once: ${x.opportunitiesBlocked}; later entered: ${x.deferredEligibleEntries}; decisions at a release instant: ${x.releaseDecisions.taken} taken of ${x.releaseDecisions.total}.`,
      `- Trades from an opportunity the gate had blocked: ${x.tradesAfterAGateBlock.trades} (closed ${x.tradesAfterAGateBlock.closed}, wins ${x.tradesAfterAGateBlock.wins}, realized net $${x.tradesAfterAGateBlock.realizedNetUsd}).`,
      `- Gate state at the window’s session closes: ${JSON.stringify(x.windowSessionsAtClose)}; at the end: ${x.stateAtEnd}.`,
      ''
    );
  }
  return `${lines.join('\n')}\n`;
}

function optionalRulesMarkdown(o: Record<string, NonNullable<SymbolMetrics['optionalRules']>>, metrics: Record<string, unknown> | null) {
  const cfg = (k: string) => JSON.stringify((metrics as Record<string, unknown> | null)?.[k] ?? { enabled: false });
  const kv = (r: Record<string, number> | undefined) => Object.entries(r ?? {}).map(([k, n]) => `${k} ${n}`).join(', ') || 'none';
  const lines = [
    '# Optional rules: trend-breakout entry, initial risk stop, trend retention (descriptive)',
    '',
    `Entry method: \`${cfg('entryMethod')}\`. Initial risk stop: \`${cfg('initialStop')}\`. Retention: \`${cfg('retention')}\`.`,
    '',
    o[Object.keys(o)[0]!]?.note ?? '',
    '',
    'Conventions: completed daily sessions only. Breakout = close > SMA_L, SMA_L > SMA_L K sessions earlier, close > the highest high of the N preceding sessions (all strict), decided at the close, filled at the next opening trade. Initial stop = actual raw fill − m × ATR_L, ATR_L = simple mean of the true ranges of the L sessions completed before the fill session; fixed, active from the fill. Retention = one partial sale at the first profit trailing-stop event, the remainder exited on K consecutive closes strictly below SMA_L (the partial-sale session’s close counted first) at the next eligible trade. A position sold in several fills is ONE trade (exit-fills.csv lists its fills); its net is the sum of its fills.',
    ''
  ];
  for (const [sym, x] of Object.entries(o)) {
    lines.push(`## ${sym}`, '', `Entry method: ${x.entryMethod}.`);
    if (x.breakout)
      lines.push(`Breakout signals ${x.breakout.signals}: taken ${x.breakout.taken}, ignored while invested ${x.breakout.rejectedWhileInvested}, vetoed ${x.breakout.vetoed}.`);
    const st = x.initialStop;
    if (st.enabled)
      lines.push(
        `Initial risk stop: ${st.protectedPositions} protected position(s); exits by the stop ${st.exitsByInitialStop} (gap ${st.exitsByInitialStopGap}, assumed fill at the level ${st.exitsByInitialStopAssumedFill}, on the entry session ${st.exitsOnEntrySession}); decisions blocked for want of ATR history ${st.blockedChecks} (${kv(st.blockedBySource)}).`
      );
    const r = x.retention;
    if (r.enabled)
      lines.push(
        `Retention: ${r.positionsWithPartialSale} position(s) with a partial sale (${r.partialFills} partial fill(s): ${kv(r.partialFillsByReason)}; net ${usd(r.partialFillsNetUsd ?? 0)}; at a loss ${r.partialFillsAtALoss}); remainder exits ${kv(r.remainderExitsByReason)}; trend-exit decisions ${r.trendExitDecisions}; open remainder at the end ${r.openRemainderAtEnd} (pending trend exit ${r.pendingTrendExitAtEnd}). Closed positions with a partial sale: ${r.closedPositionsWithPartial?.count ?? 0} (W/L ${r.closedPositionsWithPartial?.wins ?? 0}/${r.closedPositionsWithPartial?.losses ?? 0}, net ${usd(r.closedPositionsWithPartial?.netUsd ?? 0)}).`
      );
    lines.push('');
  }
  return `${lines.join('\n')}\n`;
}

function entryGatesMarkdown(
  g: Record<string, { entryGates: NonNullable<SymbolMetrics['entryGates']>; signals: NonNullable<SymbolMetrics['signals']> }>,
  metrics: Record<string, unknown> | null
) {
  const cfg = (k: string) => JSON.stringify((metrics as Record<string, unknown> | null)?.[k] ?? { enabled: false });
  const lines = [
    '# Entry trend filter and persistent eligibility (descriptive)',
    '',
    `Trend filter: \`${cfg('trendFilter')}\`. Persistent eligibility: \`${cfg('eligibility')}\`.`,
    '',
    g[Object.keys(g)[0]!]?.entryGates.note ?? '',
    '',
    'Terms: a **signal** is a raw Rise crossing (recorded once); an **armed opportunity** keeps it available (not an order, no capital reserved) for a bounded age; a **vetoed** crossing was blocked at its own decision with eligibility OFF (never replayed); a **deferred** one armed an opportunity that kept waiting; an **entry** is an actual fill at the next eligible trade at the then-current price.',
    ''
  ];
  for (const [sym, x] of Object.entries(g)) {
    const e = x.entryGates;
    const s = x.signals;
    lines.push(`## ${sym}`, '', `Raw crossings ${s.raw ?? 'n/a'}: taken ${s.filled ?? 0}, ignored while invested/pending ${s.rejected ?? 0}, vetoed ${s.vetoed ?? 0} (${Object.entries(s.vetoedByReason ?? {}).filter(([, n]) => n).map(([k, n]) => `${k} ${n}`).join(', ') || 'none'}), deferred ${s.deferred ?? 0}.`, '');
    if (e.trendFilter.enabled)
      lines.push(`Trend filter (${e.trendFilter.method}): ${e.trendFilter.evaluations} evaluations; blocked by decision kind: ${Object.entries(e.trendFilter.blockedByDecisionKind ?? {}).map(([k, v]) => `${k} ${Object.entries(v).filter(([, n]) => n).map(([r, n]) => `${r} ${n}`).join('/') || '0'}`).join('; ') || 'none'}.`, '');
    const el = e.eligibility;
    if (el.enabled)
      lines.push(
        `Eligibility (${el.policy}): ${el.opportunities} opportunities (${Object.entries(el.bySource ?? {}).map(([k, n]) => `${k} ${n}`).join(', ')}); ended by ${Object.entries(el.endedBy ?? {}).map(([k, n]) => `${k} ${n}`).join(', ')}; invalidated by ${Object.entries(el.invalidatedByReason ?? {}).map(([k, n]) => `${k} ${n}`).join(', ') || 'nothing'}; taken at arming ${el.takenAtArming}, later ${el.takenLater}; age at decision mean ${el.ageSessionsAtDecision?.mean?.toFixed(2) ?? 'n/a'}, max ${el.ageSessionsAtDecision?.max ?? 'n/a'} session(s); renewal watches ${el.renewals?.watches ?? 0} (${Object.entries(el.renewals?.endedBy ?? {}).filter(([, n]) => n).map(([k, n]) => `${k} ${n}`).join(', ') || 'none'}).`,
        ''
      );
    lines.push('| Entry source | Entries | Closed (W/L/0) | Open | Realized net | Unrealized | Interest |', '| --- | ---: | ---: | ---: | ---: | ---: | ---: |');
    for (const [k, v] of Object.entries(e.bySource))
      lines.push(`| ${k} | ${v.entries} | ${v.closed} (${v.wins}/${v.losses}/${v.breakeven}) | ${v.open} | ${usd(v.realizedNetUsd)} | ${usd(v.unrealizedNetUsd)} | ${usd(v.interestUsd)} |`);
    lines.push('');
  }
  return `${lines.join('\n')}\n`;
}

function readme(run: RunDetail, request: unknown, files: [string, string][], unavailable: Record<string, string>, minute: boolean) {
  const pool = run.strategy.key === 'study8-d1-pool';
  const growth = run.strategy.key === 'rise-from-recent-low-trading';
  const semantics = pool
    ? 'SHARED-SLOT POOL: one allocator replay with ONE funded $100,000 slot shared by its books (first executable signal wins, no preemption). Per-symbol figures are the books’ lots inside that one pool — never independent backtests, never to be summed with anything.'
    : growth
      ? 'STANDALONE PER SYMBOL: each symbol is an independent backtest on its own $100,000 fixed notional (all-in or flat, never compounded). Per-symbol results are never summed and are not comparable with a shared-slot pool.'
      : run.strategy.key === 'rise-from-recent-low'
        ? 'SIGNAL-ONLY: entry signals and their forward outcomes; no positions, fills, exits or P&L.'
        : 'See run.json for the run’s semantics.';
  const origin = run.kind === 'import' ? 'IMPORTED (a replay produced outside Strategy Lab and verified on import)' : run.dataOrigin === 'synthetic' ? 'SYNTHETIC demo data — not market data' : 'SIMULATED by Strategy Lab on real local minute data';
  const preview = run.kind === 'preview';
  return `# Strategy Lab research bundle — ${preview ? 'TEMPORARY PREVIEW' : run.id}

**${run.title}**
${preview ? `\n> **Interactive Preview — not a saved run.** Preview id \`${run.id}\` (the sha256 of its execution identity: strategy version, effective parameters, symbols, window, bars, market-data hashes and the implementation fingerprint). It has no R- id, variation, notes or bookmark; the source run's page it was started from is in \`run.json\` provenance. It was computed by the same runner and accounting as a saved run.\n` : ''}
| | |
| --- | --- |
| Run | ${preview ? `${run.id} (temporary preview, not saved)` : `${run.id} (${run.kind}, ${run.status}); variation ${run.variation.id}; experiment ${run.experiment.title}`} |
| Strategy | ${run.strategy.title} — \`${run.strategy.key}@${run.strategy.version}\`${run.strategyFormerTitle ? ` (formerly “${run.strategyFormerTitle}”)` : ''} |
| Phenotype | ${run.phenotype ? `${run.phenotype.id} \`${run.phenotype.key}\` from study \`${run.phenotype.study}\`${run.phenotype.edited ? ' — EDITED (a derived variation, not the frozen phenotype)' : ''}` : 'none'} |
| Symbols | ${run.symbols.join(', ')} |
| Window | ${run.window.from} → ${run.window.to} (New York session dates, inclusive); resolution ${run.window.resolution ?? 'n/a'}; partitions touched: ${run.window.partition ?? 'n/a'} |
| Data | ${origin} |
| Semantics | ${semantics} |
| Completed | ${run.completedAt ?? 'n/a'} (UTC) |

## What the numbers mean

- **Net P&L** = gross − per-side costs − margin interest (11% simple, per calendar day between session dates, 365-day year), on the fixed $100,000 notional. **Realized** = closed trades; **unrealized** = an open position marked at the last close net of accrued interest (its exit cost not charged).
- **Drawdowns** are falls of the marked net (realized + open position) from an earlier peak: *minute* at every minute close and session close, *daily* at session closes; % = of the $100,000 notional, not of equity.
- **Times** are stored in UTC (\`…Z\`); the \`*_new_york\` columns give America/New_York wall-clock time with EST/EDT. \`time_precision\`: minute, session-close (a daily bar's close), day (date only) or unknown.
- **Origin** (Growth 1.1.0+): \`base_growth\` = the Rise-from-Recent-Low entry; \`continuation\` = an entry of the selected continuation method. Origin-attributed P&L is DESCRIPTIVE: it is not the incremental effect of enabling a method, because enabling it changes the whole later trade sequence. Compare a complete ON run with an otherwise identical OFF run for the counterfactual.
- **Optional rules** (Growth 1.3.0, when ON): the entry method (\`rise_from_recent_low\` or \`trend_breakout\`; trades.csv \`entry_source\` \`trend_breakout\`), the initial risk stop (fixed at fill − m × ATR, active from the fill; exit reasons \`initial stop\` / \`initial stop gap\`) and trend retention (a partial sale at the first profit trailing-stop event, events.csv \`SYM:T-n:partial-k\` executed exits with \`meta.partial\`; the remainder's exit reason \`trend exit\` or a risk exit). A position sold in several fills is ONE trade row (its net = all its fills); exit-fills.csv has every fill with its principal repayment and interest; optional-rules.md the counts. Runs without these options have no exit-fills.csv and their trade rows are unchanged.
- **Drawdown Recovery Gate** (Growth 1.4.0, when ON): a filter on every Growth entry decision, never a signal, maintained on completed one-minute closes and closing prints whatever the bar resolution: entries are blocked while a significant chronological dip (a close at least d below the highest EARLIER close of the current session and the N before it) is unresolved, until the price recovers r of the whole decline and holds it at every observation for Y trading-session intervals (to the same New York time) or regains the peak. drawdown-episodes.csv / drawdown-transitions.csv hold its causal records; entry-decisions.csv its state at each decision (\`blocked_by\`, \`via\` = \`drawdown_release\` for a latched decision taken intraday at the release).
- **Entry gates** (Growth 1.2.0, when ON): the entry trend filter judges every entry decision on trading-session observations complete at the decision; persistent eligibility keeps a raw crossing available as an *opportunity* for a bounded number of sessions. \`entry_source\` (trades.csv): \`rise_from_recent_low\` (the crossing itself), \`latched:…\` (a later decision of an armed opportunity, filled at the then-current price), \`eligibility_renewal\` (a policy-5 renewal signal), \`continuation:<method>\`. A raw crossing appears once in events.csv; latched decisions and renewal signals are separate events (\`SYM:latched:<t>\`, \`SYM:renewal:<t>\`). See entry-decisions.csv, opportunities.csv and entry-gates.md.
- **Exploratory, not validated.** A single run on historical data (often already inspected) is not evidence of an edge, and a rerun of a study's phenotype on exposed dates is not another holdout.

## Files

| File | Contents |
| --- | --- |
${([...files, ['manifest.json', 'sha256 and size of every file, provenance, unavailable items']] as [string, string][]).sort((x, y) => (x[0] < y[0] ? -1 : 1)).map(([n, d]) => `| \`${n}\` | ${d} |`).join('\n')}

## Not available in this bundle

${Object.keys(unavailable).length ? Object.entries(unavailable).map(([k, v]) => `- \`${k}\`: ${v}`).join('\n') : '- nothing'}
${minute ? '\n`artifacts/minute-marks.csv.gz`: gzip CSV `symbol,t_unix_utc,marked_net_usd` — one row per CHANGE of the minute-marked net (it holds until the next row), rounded to cents.\n' : ''}
## How to check it independently

1. \`sha256sum\` every file against \`manifest.json\`; the files under \`artifacts/\` also against \`artifacts/manifest.json\` (the run's own manifest, written when the run completed).
2. Per trade: \`net_usd\` = \`gross_before_costs_usd\` − \`costs_usd\` − \`interest_usd\` (to the cent); interest = 100,000 × 0.11 × calendar days between the entry and exit session dates / 365.
3. Entries and exits pair only by \`trade_id\` and \`linked_event_id\`; every executed entry fills strictly after its decision time.
4. Growth: the totals in \`artifacts/metrics.json\` (per symbol: realized + unrealized = total marked net) equal the sums of \`trades.csv\`.
5. The request (\`artifacts/request.json\`, parameters in \`parameters.json\`) plus the code revision in \`run.json\` reproduce the run${preview ? ' (a preview: start the same configuration again in Interactive Preview, or save it as a run and replay that run)' : `: \`node --experimental-transform-types apps/strategy-lab/scripts/replay-run.ts ${run.id}\` on the machine that holds the data`}.
${request ? '' : '\nThis run was not created from a Strategy Lab request (an import or demo): see `artifacts/import.json` or `run.json` provenance.\n'}`;
}
