// The schema-driven parameter draft shared by the New Test dialog (RunTestDialog) and Interactive Preview
// (PreviewPanel): ONE implementation of drafting, parsing, applicability, field validation, the switch cascade and the
// request's parameter set (shared/params.ts holds the schema logic itself). No strategy-specific code.

import type { ParamSpec, ParamValue, StrategySpec } from '../shared/contract.ts';
import { isActive, predicateParams, validateValue } from '../shared/params.ts';

/** Numbers as typed text, switches as booleans, choices as their value. */
export type Draft = Record<string, string | boolean>;

export const draftOf = (spec: Pick<StrategySpec, 'params'>, values: Record<string, ParamValue | undefined>): Draft =>
  Object.fromEntries(
    spec.params.map((p) => {
      const v = values[p.key] ?? p.default;
      return [p.key, p.type === 'boolean' ? v === true : String(v)];
    })
  );

export const parseValue = (p: ParamSpec, d: string | boolean | undefined): ParamValue =>
  p.type === 'boolean' ? d === true : p.type === 'enum' ? String(d ?? p.default) : Number(d);

export const parseDraft = (spec: Pick<StrategySpec, 'params'>, draft: Draft): Record<string, ParamValue> =>
  Object.fromEntries(spec.params.map((p) => [p.key, parseValue(p, draft[p.key])]));

export const UNIT_TEXT: Partial<Record<ParamSpec['unit'], string>> = {
  percent: '%',
  days: 'calendar days',
  bps: 'bps per side',
  sessions: 'trading sessions',
  bars: 'bars'
};

/** Whether the form shows a parameter: it applies, or it is shown disabled while inactive ("saved, not applied"). */
export const isShown = (spec: Pick<StrategySpec, 'params'>, parsed: Record<string, ParamValue>, p: ParamSpec) =>
  isActive(spec, parsed, p.key) || (p.whenInactive ?? 'disable') === 'disable';

/** Per shown parameter: an empty required number, or the type/range/option error; null when valid or hidden. */
export function fieldErrorsOf(
  spec: Pick<StrategySpec, 'params'>,
  draft: Draft,
  parsed: Record<string, ParamValue>,
  /** Interactive Preview checks only what executes: inactive (disabled) values never block a submission there. */
  onlyActive = false
): Record<string, string | null> {
  return Object.fromEntries(
    spec.params.map((p) => [
      p.key,
      !isShown(spec, parsed, p) || (onlyActive && !isActive(spec, parsed, p.key))
        ? null
        : p.type !== 'boolean' && p.type !== 'enum' && String(draft[p.key] ?? '').trim() === ''
          ? `${p.label}: required`
          : validateValue(p, parsed[p.key])
    ])
  );
}

/**
 * The values a New Test request carries: every active one; an inactive one shown disabled (a visible saved draft); a
 * hidden inactive one only when edited away from its default and valid.
 */
export function requestParams(spec: Pick<StrategySpec, 'params'>, parsed: Record<string, ParamValue>) {
  return Object.fromEntries(
    spec.params
      .filter((p) => {
        if (isActive(spec, parsed, p.key)) return true;
        if ((p.whenInactive ?? 'disable') === 'disable') return true;
        return parsed[p.key] !== p.default && validateValue(p, parsed[p.key]) === null;
      })
      .map((p) => [p.key, parsed[p.key]!])
  );
}

/** A draft after one edit. A switch turned off also turns off the switches that apply only with it. */
export function withValue(spec: Pick<StrategySpec, 'params'>, draft: Draft, p: ParamSpec, value: string | boolean): Draft {
  const next: Draft = { ...draft, [p.key]: value };
  if (p.type === 'boolean' && value === false)
    for (const q of spec.params)
      if (q.type === 'boolean' && q.activeWhen && predicateParams(q.activeWhen).includes(p.key)) next[q.key] = false;
  return next;
}
