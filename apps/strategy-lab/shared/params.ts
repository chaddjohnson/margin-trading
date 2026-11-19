// The parameter schema (version 2) of every Strategy Lab strategy: applicability, validation, effective values,
// variation identity, run snapshots and optimisation-domain introspection. ONE implementation, used by the browser
// form, the server, the runners, the phenotype importer, the reports and the comparison. Pure (no I/O).
//
// Terms:
// - ACTIVE: a parameter applies to the execution — its `activeWhen` holds and every parameter that predicate reads is
//   itself active (a chain: the buffer percent needs the buffer switch, which needs the maximum hold).
// - EFFECTIVE values: the active parameters only. Two configurations with the same effective values behave
//   identically, so they are one variation (identity rule `effective`); inactive values a user typed are kept as a
//   saved draft with the run, never as part of what was executed.

import type {
  GroupNote,
  LabValue,
  NumericParamSpec,
  ParamConstraint,
  ParamSchema,
  ParamSpec,
  ParamValue,
  Predicate,
  StrategySpec
} from './contract.ts';
import { PARAM_SCHEMA_VERSION } from './contract.ts';

export type Values = Record<string, unknown>;

export const paramOf = (spec: Pick<ParamSchema, 'params'>, key: string) => spec.params.find((p) => p.key === key);

export function evalPredicate(p: Predicate, values: Values): boolean {
  if ('all' in p) return p.all.every((q) => evalPredicate(q, values));
  if ('any' in p) return p.any.some((q) => evalPredicate(q, values));
  if ('not' in p) return !evalPredicate(p.not, values);
  if ('in' in p) return p.in.includes(values[p.param] as ParamValue);
  return values[p.param] === p.equals;
}

export function predicateParams(p: Predicate): string[] {
  if ('all' in p) return p.all.flatMap(predicateParams);
  if ('any' in p) return p.any.flatMap(predicateParams);
  if ('not' in p) return predicateParams(p.not);
  return [p.param];
}

/** Whether a parameter applies: its predicate holds and every parameter the predicate reads is active (a chain). */
export function isActive(spec: Pick<ParamSchema, 'params'>, values: Values, key: string, seen = new Set<string>()): boolean {
  const p = paramOf(spec, key);
  if (!p) return false;
  if (!p.activeWhen) return true;
  if (seen.has(key)) throw new Error(`parameter schema: circular applicability at ${key}`);
  seen.add(key);
  return (
    evalPredicate(p.activeWhen, values) &&
    predicateParams(p.activeWhen).every((k) => isActive(spec, values, k, new Set(seen)))
  );
}

const formatNumber = (n: number) => String(n);

/** The type, range and option check of one value. */
export function validateValue(p: ParamSpec, value: unknown): string | null {
  if (p.type === 'boolean') return typeof value === 'boolean' ? null : `${p.label}: must be on or off (true/false)`;
  if (p.type === 'enum')
    return typeof value === 'string' && p.options.some((o) => o.value === value)
      ? null
      : `${p.label}: one of ${p.options.map((o) => o.value).join(', ')}`;
  if (typeof value !== 'number' || !Number.isFinite(value)) return `${p.label}: must be a number`;
  if (p.type === 'integer' && !Number.isInteger(value)) return `${p.label}: must be a whole number`;
  if (value < p.min || value > p.max) return `${p.label}: must be between ${formatNumber(p.min)} and ${formatNumber(p.max)}`;
  return null;
}

/** Cross-parameter rules. A `less` rule applies only when both of its parameters are active. */
export function constraintErrors(spec: Pick<ParamSchema, 'params' | 'constraints'>, values: Values): string[] {
  const errors: string[] = [];
  for (const c of spec.constraints) {
    if (c.kind === 'requires') {
      if (evalPredicate(c.if, values) && !evalPredicate(c.then, values)) errors.push(c.message);
    } else if (isActive(spec, values, c.a) && isActive(spec, values, c.b)) {
      const a = values[c.a];
      const b = values[c.b];
      if (typeof a === 'number' && typeof b === 'number' && !(a < b)) errors.push(c.message);
    }
  }
  return errors;
}

/**
 * Validates a parameter set: unknown keys are refused; every ACTIVE parameter must be present and valid; an inactive
 * one may be absent (a saved draft is optional) but, if present, must still be a valid value of its type and range.
 */
export function validateParams(spec: Pick<ParamSchema, 'params' | 'constraints'>, values: Values): string[] {
  const errors: string[] = [];
  for (const k of Object.keys(values))
    if (!paramOf(spec, k)) errors.push(`params: unknown parameter "${k}"`);
  for (const p of spec.params) {
    const present = values[p.key] !== undefined;
    if (isActive(spec, values, p.key)) {
      const e = validateValue(p, values[p.key]);
      if (e) errors.push(e);
    } else if (present) {
      const e = validateValue(p, values[p.key]);
      if (e) errors.push(`${e} (saved, not applied)`);
    }
  }
  errors.push(...constraintErrors(spec, values));
  return errors;
}

/** The active parameters only, in schema order: what the engine executes. */
export function effectiveParams(spec: Pick<ParamSchema, 'params'>, values: Values): Record<string, ParamValue> {
  return Object.fromEntries(
    spec.params.filter((p) => isActive(spec, values, p.key)).map((p) => [p.key, values[p.key] as ParamValue])
  );
}

/** Canonical JSON (sorted keys) of a parameter set. */
export function canonicalParams(params: Record<string, ParamValue>): string {
  return JSON.stringify(Object.fromEntries(Object.entries(params).sort(([a], [b]) => (a < b ? -1 : 1))));
}

/**
 * The identity of a variation within a strategy version and experiment: `effective` = the canonical JSON of the active
 * values; `all-values` (rise-from-recent-low-trading@1.0.0, frozen) = of every value as stored then. The resolution is
 * part of the configuration of runnable strategies. For a schema where every parameter is always active the two rules
 * give the same string (so the signal-only strategy's identities are unchanged).
 */
export function variationIdentity(spec: Pick<ParamSchema, 'params' | 'identity'>, values: Values, resolution: string): string {
  const chosen =
    spec.identity === 'all-values'
      ? (Object.fromEntries(spec.params.filter((p) => values[p.key] !== undefined).map((p) => [p.key, values[p.key]])) as Record<
          string,
          ParamValue
        >)
      : effectiveParams(spec, values);
  return `${canonicalParams(chosen)}|${resolution}`;
}

export function defaultParams(spec: Pick<ParamSchema, 'params'>): Record<string, ParamValue> {
  return Object.fromEntries(spec.params.map((p) => [p.key, p.default]));
}

/**
 * Old snapshots and requests have no value for parameters added later. A missing parameter means its schema default
 * ONLY where that default reproduces the old behaviour (e.g. continuation OFF); this function fills defaults for the
 * listed keys and nothing else, so nothing is inferred as if it had run.
 */
export function withDefaultsFor(spec: Pick<ParamSchema, 'params'>, values: Values, keys: readonly string[]): Values {
  const out: Values = { ...values };
  for (const k of keys) if (out[k] === undefined) out[k] = paramOf(spec, k)!.default;
  return out;
}

const text = (key: string, label: string, value: string): LabValue => ({ key, label, value, unit: 'text' });

export const optionLabel = (p: ParamSpec, value: unknown) =>
  p.type === 'enum' ? (p.options.find((o) => o.value === value)?.label ?? String(value)) : String(value);

/**
 * The run's parameter snapshot: every value as entered, a switch as ON/OFF, a choice by its label, and an inactive
 * value labelled "saved, not applied" (or omitted when it was not submitted).
 */
export function paramSnapshot(spec: Pick<ParamSchema, 'params'>, values: Values): LabValue[] {
  const out: LabValue[] = [];
  for (const p of spec.params) {
    const v = values[p.key];
    if (v === undefined) continue;
    const active = isActive(spec, values, p.key);
    const suffix = active ? '' : ' — saved, not applied';
    if (p.type === 'boolean') out.push(text(p.key, `${p.label} (switch)${suffix}`, v === true ? 'ON' : 'OFF'));
    else if (p.type === 'enum') out.push(text(p.key, `${p.label}${suffix}`, `${optionLabel(p, v)} (${String(v)})`));
    else out.push({ key: p.key, label: `${p.label}${suffix}`, value: v as number, unit: p.unit });
  }
  return out;
}

/** Whether a group note applies: its condition holds and every parameter it reads is active. */
export function noteShown(spec: Pick<ParamSchema, 'params'>, values: Values, when: GroupNote['when']): boolean {
  return evalPredicate(when, values) && predicateParams(when).every((k) => isActive(spec, values, k));
}

/** The stored form of a strategy's schema (strategies.param_schema_json). */
export function schemaOf(spec: StrategySpec): ParamSchema {
  return {
    schemaVersion: PARAM_SCHEMA_VERSION,
    params: spec.params,
    groups: spec.groups,
    constraints: spec.constraints,
    identity: spec.identity
  };
}

// ----- optimisation-domain introspection (for future CLI optimisers; nothing here searches) -----

export interface SearchDimension {
  key: string;
  type: ParamSpec['type'];
  /** Numeric: [min, max] and step; enum: the values; boolean: [false, true]. */
  domain: { min: number; max: number; step: number; scale: 'linear' | 'log' } | { values: readonly ParamValue[] };
  /** When the dimension is part of the effective configuration (the parameter's activeWhen; chains included). */
  activeWhen: Predicate | null;
  unit: string;
}

export interface SearchSpace {
  strategy: { key: string; version: string };
  schemaVersion: number;
  identity: ParamSchema['identity'];
  dimensions: SearchDimension[];
  constraints: ParamConstraint[];
  note: string;
}

/** The conditional search space of a strategy version: every dimension with its legal domain and when it applies. */
export function searchSpaceOf(spec: StrategySpec, fixed: readonly string[] = []): SearchSpace {
  return {
    strategy: { key: spec.key, version: spec.version },
    schemaVersion: PARAM_SCHEMA_VERSION,
    identity: spec.identity,
    dimensions: spec.params
      .filter((p) => !fixed.includes(p.key))
      .map((p) => ({
        key: p.key,
        type: p.type,
        domain:
          p.type === 'boolean'
            ? { values: [false, true] }
            : p.type === 'enum'
              ? { values: p.options.map((o) => o.value) }
              : {
                  min: p.search?.min ?? p.min,
                  max: p.search?.max ?? p.max,
                  step: p.search?.step ?? p.step,
                  scale: p.search?.scale ?? 'linear'
                },
        activeWhen: p.activeWhen ?? null,
        unit: p.unit
      })),
    constraints: spec.constraints,
    note:
      'A candidate is its EFFECTIVE values: a dimension whose activeWhen does not hold is not part of it (no meaningless ' +
      'inactive combinations). Strategy Lab never searches this space; a CLI optimiser with a frozen protocol does.'
  };
}

/** A deterministic PRNG (mulberry32) for reproducible smoke sampling. */
export function seededRandom(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const sampleNumber = (p: NumericParamSpec, rnd: () => number) => {
  const min = p.search?.min ?? p.min;
  const max = p.search?.max ?? p.max;
  const step = p.search?.step ?? p.step;
  const steps = Math.floor((max - min) / step + 1e-9);
  const v = min + Math.floor(rnd() * (steps + 1)) * step;
  const decimals = (String(step).split('.')[1] ?? '').length;
  return Number(Math.min(max, v).toFixed(decimals));
};

/**
 * One valid candidate: values are drawn in schema order, so a parameter's applicability is decided by the values
 * already drawn; inactive parameters are left out; the constraints are satisfied by redrawing (bounded). `base`
 * fixes values (e.g. the entry X and N, or `continuationEnabled: true`). For smoke tests of the search-space
 * metadata — not an optimiser.
 */
export function sampleCandidate(
  spec: StrategySpec,
  rnd: () => number,
  base: Record<string, ParamValue> = {},
  attempts = 200
): Record<string, ParamValue> {
  for (let i = 0; i < attempts; i++) {
    const values: Record<string, ParamValue> = {};
    for (const p of spec.params) {
      if (base[p.key] !== undefined) {
        values[p.key] = base[p.key]!;
        continue;
      }
      if (!isActive(spec, values, p.key)) continue;
      values[p.key] =
        p.type === 'boolean'
          ? rnd() < 0.5
          : p.type === 'enum'
            ? p.options[Math.floor(rnd() * p.options.length)]!.value
            : sampleNumber(p, rnd);
    }
    const effective = effectiveParams(spec, values);
    if (validateParams(spec, effective).length === 0) return effective;
  }
  throw new Error(`no valid candidate of ${spec.key}@${spec.version} in ${attempts} draws`);
}
