// Registry of the strategies Strategy Lab can execute as a manual single test, with their parameter schemas. Pure
// data and validation (no engine code), so the browser form and the server validator share one definition.

import type { ParamSpec, Resolution, RunRequest, StrategySpec } from './contract.ts';

export const RISE_FROM_RECENT_LOW: StrategySpec = {
  key: 'rise-from-recent-low',
  version: '1.0.0',
  title: 'Rise from recent low (entry signal)',
  kind: 'entry_signal',
  runnable: true,
  description:
    'Signal-only. Fires once, on the completed bar whose close first rises to at least X% above the lowest low of ' +
    'the last N completed bars (this bar included), after having been below that level on the previous bar. It ' +
    'rearms only after the advance falls back below X%. No exits, no positions, no P&L.',
  params: [
    {
      key: 'advanceFromRecentLowPercent',
      label: 'Advance from recent low (X)',
      description:
        'Minimum rise of the completed bar’s close above the rolling low, in percent. The signal fires on the first ' +
        'bar at or above this level after a bar below it.',
      type: 'number',
      unit: 'percent',
      default: 5,
      min: 0.1,
      max: 100,
      step: 0.1
    },
    {
      key: 'recentLowLookbackBars',
      label: 'Recent-low lookback (N)',
      description:
        'Number of completed bars of the selected resolution in the rolling low, the current bar included. Counts ' +
        'bars present in the data (session gaps and missing minutes are not imputed).',
      type: 'integer',
      unit: 'bars',
      default: 20,
      min: 2,
      max: 5000,
      step: 1
    }
  ],
  resolutions: ['1d', '60m', '30m', '15m', '5m', '1m'],
  defaultResolution: '1d'
};

export const RUNNABLE_STRATEGIES: readonly StrategySpec[] = [RISE_FROM_RECENT_LOW];

export function findStrategy(key: string, version: string): StrategySpec | undefined {
  return RUNNABLE_STRATEGIES.find((s) => s.key === key && s.version === version);
}

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const SYMBOL = /^[A-Z0-9][A-Z0-9.-]{0,9}$/;
export const MAX_SYMBOLS_PER_RUN = 8;
export const MAX_TITLE_LENGTH = 160;

export function validateParam(spec: ParamSpec, value: unknown): string | null {
  if (typeof value !== 'number' || !Number.isFinite(value)) return `${spec.label}: must be a number`;
  if (spec.type === 'integer' && !Number.isInteger(value)) return `${spec.label}: must be a whole number`;
  if (value < spec.min || value > spec.max) return `${spec.label}: must be between ${spec.min} and ${spec.max}`;
  return null;
}

/** Validates a manual run request against the registry. Returns the errors (empty when valid). */
export function validateRunRequest(req: unknown, knownSymbols: ReadonlySet<string>): string[] {
  const errors: string[] = [];
  if (typeof req !== 'object' || req === null || Array.isArray(req)) return ['request: must be a JSON object'];
  const r = req as Record<string, unknown>;
  const allowed = new Set([
    'strategyKey',
    'strategyVersion',
    'params',
    'symbols',
    'from',
    'to',
    'resolution',
    'title',
    'parentVariation'
  ]);
  for (const k of Object.keys(r)) if (!allowed.has(k)) errors.push(`request: unknown field "${k}"`);

  const spec =
    typeof r.strategyKey === 'string' && typeof r.strategyVersion === 'string'
      ? findStrategy(r.strategyKey, r.strategyVersion)
      : undefined;
  if (!spec) return [...errors, 'strategy: unknown or not runnable'];

  const params = r.params;
  if (typeof params !== 'object' || params === null || Array.isArray(params)) errors.push('params: must be an object');
  else {
    const p = params as Record<string, unknown>;
    for (const k of Object.keys(p))
      if (!spec.params.some((s) => s.key === k)) errors.push(`params: unknown parameter "${k}"`);
    for (const s of spec.params) {
      const e = validateParam(s, p[s.key]);
      if (e) errors.push(e);
    }
  }

  if (!Array.isArray(r.symbols) || r.symbols.length === 0) errors.push('symbols: choose at least one symbol');
  else {
    if (r.symbols.length > MAX_SYMBOLS_PER_RUN) errors.push(`symbols: at most ${MAX_SYMBOLS_PER_RUN} per run`);
    if (new Set(r.symbols).size !== r.symbols.length) errors.push('symbols: duplicates');
    for (const s of r.symbols)
      if (typeof s !== 'string' || !SYMBOL.test(s)) errors.push(`symbols: "${String(s)}" is not a symbol`);
      else if (!knownSymbols.has(s)) errors.push(`symbols: no local data for ${s}`);
  }

  for (const k of ['from', 'to'] as const) {
    const v = r[k];
    if (typeof v !== 'string' || !DATE.test(v) || Number.isNaN(Date.parse(`${v}T00:00:00Z`)))
      errors.push(`${k}: must be a YYYY-MM-DD date`);
  }
  if (typeof r.from === 'string' && typeof r.to === 'string' && r.from > r.to)
    errors.push('from: must not be after to');

  if (!spec.resolutions.includes(r.resolution as Resolution))
    errors.push(`resolution: one of ${spec.resolutions.join(', ')}`);

  if (r.title !== undefined && (typeof r.title !== 'string' || r.title.length > MAX_TITLE_LENGTH))
    errors.push(`title: text of at most ${MAX_TITLE_LENGTH} characters`);

  if (
    r.parentVariation !== undefined &&
    (typeof r.parentVariation !== 'string' || !/^V-\d{6,12}$/.test(r.parentVariation))
  )
    errors.push('parentVariation: a variation id such as V-000001');

  return errors;
}

export function isValidRunRequest(req: unknown, knownSymbols: ReadonlySet<string>): req is RunRequest {
  return validateRunRequest(req, knownSymbols).length === 0;
}

/** Canonical JSON of a parameter set (sorted keys) — the identity of a variation together with the strategy version. */
export function canonicalParams(params: Record<string, number>): string {
  return JSON.stringify(Object.fromEntries(Object.entries(params).sort(([a], [b]) => (a < b ? -1 : 1))));
}

export function defaultParams(spec: StrategySpec): Record<string, number> {
  return Object.fromEntries(spec.params.map((p: ParamSpec) => [p.key, p.default]));
}
