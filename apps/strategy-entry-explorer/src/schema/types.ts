// The Strategy Entry Explorer data contract, schema version 1. Strategy-agnostic: a dataset is one price series of one
// instrument plus any number of variations, each with its own entry events. Nothing in the app keys behaviour off a
// variation's name or id. The full description, with units and examples, is in
// docs/research/growth-entry-discovery/ENTRY_EXPLORER.md.

export const DATASET_SCHEMA_ID = 'strategy-entry-explorer.dataset';
export const DATASET_SCHEMA_VERSION = 1;

/** Where a dataset's numbers come from. Only `synthetic` exists today; the others are reserved for later adapters. */
export type ProvenanceKind = 'synthetic' | 'backtest' | 'research-study';

export interface Dataset {
  schema: typeof DATASET_SCHEMA_ID;
  schemaVersion: typeof DATASET_SCHEMA_VERSION;
  /** Stable identifier of this dataset (lowercase letters, digits, dots and dashes). */
  datasetId: string;
  title: string;
  provenance: Provenance;
  instrument: Instrument;
  priceSeries: PriceSeries;
  /** How `executed` events were derived from `signal` events, when a dataset has any. */
  executionModel?: ExecutionModel;
  variations: Variation[];
}

export interface Provenance {
  kind: ProvenanceKind;
  description: string;
  /** The generator of a synthetic dataset; byte-reproducible from name, version and seed. */
  generator?: { name: string; version: string; seed: number };
  /** Input files of a non-synthetic dataset (repository-relative path and sha256). */
  sources?: { path: string; sha256: string }[];
  /** Statements the UI must show wherever the data is displayed (e.g. "synthetic, not actual prices"). */
  disclosures: string[];
}

export interface Instrument {
  /** Ticker, or an illustrative label when `isSynthetic` is true. */
  symbol: string;
  /** Display label; for synthetic data it must say so. */
  label: string;
  isSynthetic: boolean;
  /** ISO 4217 currency of every price in the dataset. */
  currency: string;
  /** Adjustment applied to every price (bars and events alike). */
  priceAdjustment: 'none' | 'splits' | 'splits-and-distributions';
  /** IANA time zone of the trading sessions; session dates (`d`) are calendar dates in this zone. */
  exchangeTimezone: string;
}

export interface PriceSeries {
  /** Bar length. `1d` is one regular session; `1m` is reserved for minute bars. */
  interval: '1d' | '1m';
  /** Which instant of the bar `t` denotes. Daily bars use the session close. */
  timestampConvention: 'bar-close' | 'bar-open';
  /** Free-text description of the session calendar (e.g. holidays modelled or not). */
  calendar: string;
  /** Strictly ascending by `t`; no duplicate timestamps. */
  bars: PriceBar[];
}

export interface PriceBar {
  /** ISO 8601 instant in UTC with a `Z` suffix, e.g. "2016-01-04T21:00:00Z". */
  t: string;
  /** Session date (YYYY-MM-DD) in the instrument's exchange time zone. */
  d: string;
  o: number;
  h: number;
  l: number;
  c: number;
  v?: number;
}

export type ParameterUnit = 'percent' | 'sessions' | 'price' | 'ratio' | 'index' | 'count' | 'date' | 'text';

/**
 * A labelled value with an explicit unit. `percent` values are percentage points (5.2 means 5.2 %); `price` values are
 * in the instrument currency with the instrument's adjustment; `date` values are session dates (YYYY-MM-DD); `index`
 * is a dimensionless indicator reading (e.g. RSI 0–100); `ratio` a plain multiple (e.g. 2 standard deviations).
 */
export interface ParameterValue {
  key: string;
  label: string;
  value: number | string;
  unit: ParameterUnit;
}

export interface ExecutionModel {
  id: string;
  label: string;
  /** True when the model only illustrates the signal/executed distinction and is not a trading simulation. */
  isIllustrative: boolean;
  description: string;
  parameters: ParameterValue[];
}

export interface Variation {
  /** Stable identifier (lowercase letters, digits and dashes), unique within the dataset. */
  id: string;
  /** Short display code, e.g. "V1". */
  code: string;
  name: string;
  /** Mechanism family, e.g. "rebound" or "breakout" (free text, used for search and grouping only). */
  family: string;
  /** One-sentence rule summary. */
  summary: string;
  parameters: ParameterValue[];
  events: EntryEvent[];
}

/**
 * `signal`: a raw entry opportunity — the rule fired. It says nothing about whether a position could be opened.
 * `executed`: an entry that the dataset's execution model actually filled; it links to the signal it executed.
 */
export type EntryEventType = 'signal' | 'executed';

export interface EntryEvent {
  /** Stable identifier, unique within the dataset. */
  id: string;
  /** Must equal the id of the variation that contains the event. */
  variationId: string;
  type: EntryEventType;
  /** ISO 8601 instant in UTC with a `Z` suffix. */
  t: string;
  /** Session date (YYYY-MM-DD) in the exchange time zone. */
  d: string;
  /** Price in the instrument currency with the instrument's adjustment. */
  price: number;
  /** What `price` is: the close of the bar at `t`, its open, or a fill price. */
  priceBasis: 'bar-close' | 'bar-open' | 'fill';
  trigger: { summary: string; values: ParameterValue[] };
  /** signal → the executed entry it produced; executed → the signal it executed. */
  linkedEventId?: string;
  /** Signals only: whether the execution model executed the signal, and why not. */
  execution?: { status: 'executed' | 'not-executed'; reason?: string };
  meta?: Record<string, string | number | boolean | null>;
}
