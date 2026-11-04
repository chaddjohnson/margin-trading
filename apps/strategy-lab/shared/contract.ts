// The Strategy Lab data contract (event contract version 2), shared by the server, the runner, the importers and the
// browser. Every strategy — entry-signal research, imported allocator trades, demo data — produces these shapes.
//
// Unknown values are `null`, never 0 or a guess: a price an artifact did not record is `price: null`, a time known
// only to the day has `timePrecision: 'day'`. Documented in docs/strategy-lab/CONTRACTS.md.

export const EVENT_CONTRACT_VERSION = 2;

/**
 * entry_signal     a raw entry signal: the rule fired. It is not a trade and implies no position.
 * executed_entry   an entry a valid execution simulation (or a real record) filled.
 * executed_exit    an exit of such a position.
 * rejected_signal  a signal an allocator recorded as not executed (slot occupied, margin, another rule).
 */
export type EventKind = 'entry_signal' | 'executed_entry' | 'executed_exit' | 'rejected_signal';
export const EVENT_KINDS: readonly EventKind[] = ['entry_signal', 'executed_entry', 'executed_exit', 'rejected_signal'];

export const EVENT_KIND_LABEL: Record<EventKind, string> = {
  entry_signal: 'Entry signal',
  executed_entry: 'Executed entry',
  executed_exit: 'Executed exit',
  rejected_signal: 'Rejected signal'
};

/** Real market data, or synthetic demonstration data. Never mixed within one run. */
export type DataOrigin = 'real' | 'synthetic';

/**
 * minute         the instant is exact to the minute (minute-bar data).
 * session-close  the instant is a session's close (daily bars).
 * day            only the date is known; the time part of `t` is a placeholder and is never displayed as a time.
 * unknown        the artifact gives no usable time precision.
 */
export type TimePrecision = 'minute' | 'session-close' | 'day' | 'unknown';

export type ValueUnit =
  | 'percent'
  | 'price'
  | 'bars'
  | 'sessions'
  | 'minutes'
  | 'date'
  | 'datetime'
  | 'count'
  | 'ratio'
  | 'index'
  | 'usd'
  | 'days'
  | 'bps'
  | 'text';

/** A labelled value with an explicit unit. `percent` is percentage points (5.2 = 5.2%). `null` = unknown. */
export interface LabValue {
  key: string;
  label: string;
  value: number | string | boolean | null;
  unit: ValueUnit;
}

export interface LabEvent {
  /** Unique within its run; stable across reads. */
  id: string;
  runId: string;
  symbol: string;
  kind: EventKind;
  /** ISO 8601 UTC instant (`…Z`). */
  t: string;
  timePrecision: TimePrecision;
  /** What the instant denotes, e.g. "end of the completed 1-minute bar (signal knowable)". */
  timeMeaning: string;
  /** The event's price, or null when the source did not record one. */
  price: number | null;
  priceBasis: 'bar-close' | 'fill' | 'decision' | 'unknown';
  /** Trigger or decision description (human-readable), or null. */
  reason: string | null;
  /** Structured trigger / decision values with units. */
  values: LabValue[];
  /** Trade linkage: entry and exit of one trade share a tradeId. */
  tradeId: string | null;
  /** The paired event (entry ↔ exit), or null. */
  linkedEventId: string | null;
  meta: Record<string, string | number | boolean | null>;
}

const kindOrder: Record<EventKind, number> = {
  rejected_signal: 0,
  entry_signal: 1,
  executed_exit: 2,
  executed_entry: 3
};

/** Canonical event order: time, then kind (an exit before a same-minute re-entry), then id. */
export function compareEvents(a: LabEvent, b: LabEvent): number {
  const ta = Date.parse(a.t);
  const tb = Date.parse(b.t);
  return ta - tb || kindOrder[a.kind] - kindOrder[b.kind] || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
}

/** Events of one symbol only — the one place the per-symbol rule is applied. */
export function eventsForSymbol(events: readonly LabEvent[], symbol: string): LabEvent[] {
  return events.filter((e) => e.symbol === symbol);
}

// ----- runs, variations, strategies, experiments -----

export type RunStatus = 'queued' | 'running' | 'completed' | 'failed' | 'cancelled';
export type RunKind = 'manual' | 'import' | 'demo';
export type Resolution = '1m' | '5m' | '15m' | '30m' | '60m' | '1d';

export const RESOLUTION_LABEL: Record<Resolution, string> = {
  '1m': '1-minute bars',
  '5m': '5-minute bars',
  '15m': '15-minute bars',
  '30m': '30-minute bars',
  '60m': '60-minute bars',
  '1d': 'daily bars (regular session)'
};

/** Where a run's chart prices come from: the canonical minute files, or the synthetic demo fixture. */
export type PriceSource =
  | { kind: 'market'; basisDate: string; basisBySymbol?: Record<string, string> }
  | { kind: 'synthetic'; datasetId: string };

/** The split-adjustment basis date of a symbol in a market-priced run. */
export function basisDateOf(source: PriceSource, symbol: string): string | null {
  return source.kind === 'market' ? (source.basisBySymbol?.[symbol] ?? source.basisDate) : null;
}

export interface RunWindow {
  /** Inclusive New York session dates of the evaluation window. */
  from: string;
  to: string;
  resolution: Resolution | null;
  partition: string | null;
}

export interface RunSummary {
  id: string; // R-000042
  title: string;
  status: RunStatus;
  kind: RunKind;
  dataOrigin: DataOrigin;
  experiment: { id: string; title: string };
  strategy: { id: string; key: string; version: string; title: string };
  variation: { id: string; title: string };
  symbols: string[];
  window: RunWindow;
  createdAt: string;
  startedAt: string | null;
  completedAt: string | null;
  eventCount: number | null;
  bookmarked: boolean;
  noteCount: number;
  noteExcerpt: string | null;
}

export interface RunDetail extends RunSummary {
  params: LabValue[];
  paramSchema: ParamSchema | null;
  /** The strategy row's display metadata: earlier display names (e.g. the pre-rename title). */
  strategyFormerTitle: string | null;
  /** The catalogue phenotype the run was launched from, if any. */
  phenotype: { id: string; key: string; name: string; study: string; executionKind: string; edited: boolean } | null;
  assumptions: LabValue[];
  priceSource: PriceSource;
  provenance: Record<string, unknown>;
  codeRevision: Record<string, unknown> | null;
  metrics: Record<string, unknown> | null;
  error: string | null;
  artifact: { sha256: string | null; files: string[] };
  progress: { message: string; fraction: number | null } | null;
}

export interface VariationSummary {
  id: string; // V-000007
  title: string;
  strategy: { id: string; key: string; version: string; title: string; runnable: boolean };
  experiment: { id: string; title: string };
  params: LabValue[];
  origin: RunKind;
  createdAt: string;
  latestRun: { id: string; status: RunStatus; completedAt: string | null; createdAt: string } | null;
  latestResultAt: string | null;
  runCount: number;
  bookmarked: boolean;
  noteCount: number;
  noteExcerpt: string | null;
}

export interface Note {
  id: number;
  targetType: 'run' | 'variation';
  targetId: string;
  body: string;
  createdAt: string;
  updatedAt: string;
}

export interface SymbolInfo {
  symbol: string;
  firstSession: string | null;
  lastSession: string | null;
  bytes: number;
}

// ----- parameter schema (version 2: the one schema of every strategy; shared/params.ts holds its logic) -----

export const PARAM_SCHEMA_VERSION = 2;

export type ParamType = 'number' | 'integer' | 'boolean' | 'enum';
export type ParamValue = number | boolean | string;

/** A condition on parameter values: applicability, enablement and constraints are all expressed with it. */
export type Predicate =
  | { param: string; equals: ParamValue }
  | { param: string; in: readonly ParamValue[] }
  | { all: readonly Predicate[] }
  | { any: readonly Predicate[] }
  | { not: Predicate };

interface ParamSpecBase {
  key: string;
  label: string;
  description: string;
  /** Form section (a key of the strategy's `groups`); absent = the strategy's single parameter list. */
  group?: string;
  /**
   * When the value APPLIES (is part of the effective, executed configuration). Applicability chains: a parameter is
   * active only if its predicate holds AND every parameter the predicate reads is itself active. Absent = always.
   */
  activeWhen?: Predicate;
  /** How the form shows an inactive parameter: disabled in place ("saved, not applied"), or hidden. */
  whenInactive?: 'disable' | 'hide';
  /** Explicit execution semantics (how the engine reads the value), shown with the run's snapshot. */
  execution?: string;
}

export interface NumericParamSpec extends ParamSpecBase {
  type: 'number' | 'integer';
  unit: ValueUnit;
  default: number;
  min: number;
  max: number;
  step: number;
  /** Optimisation metadata for future CLI optimisers: the search domain (default = [min, max]) and its scale. */
  search?: { min?: number; max?: number; step?: number; scale?: 'linear' | 'log' };
}

export interface BooleanParamSpec extends ParamSpecBase {
  type: 'boolean';
  unit: 'text';
  default: boolean;
}

export interface EnumParamSpec extends ParamSpecBase {
  type: 'enum';
  unit: 'text';
  default: string;
  options: readonly { value: string; label: string; description?: string }[];
}

/** One input of a strategy. A `boolean` is a rule switch; an `enum` a categorical choice. */
export type ParamSpec = NumericParamSpec | BooleanParamSpec | EnumParamSpec;

/** A rule across parameters, checked by the browser form AND the server/runner (validateParams). */
export type ParamConstraint =
  | { kind: 'requires'; id: string; if: Predicate; then: Predicate; message: string }
  | { kind: 'less'; id: string; a: string; b: string; message: string };

export interface ParamGroup {
  key: string;
  title: string;
  description?: string;
}

/** The stored form of a strategy's parameter schema (strategies.param_schema_json since migration 0002). */
export interface ParamSchema {
  schemaVersion: typeof PARAM_SCHEMA_VERSION;
  params: ParamSpec[];
  groups: ParamGroup[];
  constraints: ParamConstraint[];
  /** Variation identity: the canonical JSON of the effective (active) values, or (legacy 1.0.0) of all values. */
  identity: 'effective' | 'all-values';
}

/** How a strategy version may be executed from Strategy Lab. */
export type LaunchMode = 'form' | 'phenotype' | 'none';

export interface StrategySpec extends ParamSchema {
  key: string;
  version: string;
  title: string;
  kind: 'entry_signal' | 'trades';
  /** `form`: New Test may run it; `phenotype`: only as a catalogue phenotype; `none`: read-only. */
  launch: LaunchMode;
  /** Whether Strategy Lab can execute it at all (launch ≠ none). */
  runnable: boolean;
  description: string;
  resolutions: Resolution[];
  defaultResolution: Resolution;
  /** Short facts shown with the form (fixed execution assumptions, multi-symbol policy). */
  notes?: string[];
  /** Earlier display names (renames are display metadata; keys and versions never change). */
  formerTitles?: string[];
  /** A superseded version: which version replaces it and how its runs replay. */
  legacy?: { supersededBy: string; replay: string };
}

/**
 * A manual single-test request (POST /api/runs). One configuration; never a sweep. `V` is the parameter value type:
 * the default (numbers only) is the signal-only shape runner/entry-signal-run.ts reads; requests in general carry
 * numbers and rule switches (`LabRunRequest`).
 */
export interface RunRequest<V extends ParamValue = number> {
  strategyKey: string;
  strategyVersion: string;
  params: Record<string, V>;
  symbols: string[];
  from: string;
  to: string;
  resolution: Resolution;
  title?: string;
  /** The variation this configuration was cloned from (provenance only). */
  parentVariation?: string;
  /** The catalogue phenotype this test runs (PH-…); the run records it and its study provenance. */
  phenotypeId?: string;
}

export type LabRunRequest = RunRequest<ParamValue>;
