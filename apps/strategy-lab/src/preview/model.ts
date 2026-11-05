// Interactive Preview, the browser's pure logic (no React, no I/O; tests/preview-model.test.ts): the canonical
// configuration of a draft, its validation, when "Run preview" is enabled, and how a selection survives a result swap.

import type { LabEvent, ParamValue, Resolution, StrategySpec } from '../../shared/contract.ts';
import { constraintErrors, effectiveParams } from '../../shared/params.ts';
import { canonicalPreviewConfig, type PreviewConfig, previewConfigKey } from '../../shared/preview.ts';
import { type Draft, fieldErrorsOf, parseDraft } from '../paramForm.ts';

const DATE = /^\d{4}-\d{2}-\d{2}$/;

export interface DraftWindow {
  symbols: string[];
  from: string;
  to: string;
  resolution: Resolution;
}

export interface DraftState {
  /** The canonical configuration the draft executes (effective values only), or null while invalid. */
  config: PreviewConfig | null;
  /** Its comparison key (null while invalid). */
  key: string | null;
  fieldErrors: Record<string, string | null>;
  /** Cross-parameter rules and the date range, for the compact error summary. */
  formErrors: string[];
  valid: boolean;
}

/** The draft as ONE canonical configuration: only what executes is validated (inactive values never block). */
export function draftState(spec: StrategySpec, draft: Draft, w: DraftWindow): DraftState {
  const parsed = parseDraft(spec, draft);
  const fieldErrors = fieldErrorsOf(spec, draft, parsed, true);
  const formErrors = [...constraintErrors(spec, effectiveParams(spec, parsed))];
  if (!DATE.test(w.from) || Number.isNaN(Date.parse(`${w.from}T00:00:00Z`))) formErrors.push('From: a date (YYYY-MM-DD)');
  if (!DATE.test(w.to) || Number.isNaN(Date.parse(`${w.to}T00:00:00Z`))) formErrors.push('To: a date (YYYY-MM-DD)');
  if (DATE.test(w.from) && DATE.test(w.to) && w.from > w.to) formErrors.push('From: must not be after To');
  if (!spec.resolutions.includes(w.resolution)) formErrors.push(`Bar resolution: one of ${spec.resolutions.join(', ')}`);
  const valid = !Object.values(fieldErrors).some(Boolean) && formErrors.length === 0;
  if (!valid) return { config: null, key: null, fieldErrors, formErrors, valid };
  const config = configOf(spec, parsed, w);
  return { config, key: previewConfigKey(config), fieldErrors, formErrors, valid };
}

export const configOf = (spec: StrategySpec, params: Record<string, ParamValue>, w: DraftWindow): PreviewConfig =>
  canonicalPreviewConfig(spec, {
    strategyKey: spec.key,
    strategyVersion: spec.version,
    params,
    symbols: w.symbols,
    from: w.from,
    to: w.to,
    resolution: w.resolution
  });

/**
 * Why "Run preview" is disabled (null: enabled): the draft is invalid, it equals the configuration displayed now, or
 * the same configuration is already running. A different configuration — including one executed earlier and cached —
 * is always submittable.
 */
export function runDisabledReason(s: { valid: boolean; draftKey: string | null; displayedKey: string | null; runningKey: string | null }): string | null {
  if (!s.valid || !s.draftKey) return 'Fix the highlighted values first';
  if (s.runningKey === s.draftKey) return 'This configuration is running';
  if (s.displayedKey === s.draftKey) return 'This configuration is what the chart shows; change a value first';
  return null;
}

/**
 * A stable identity of an event across executions, never its ordinal id (T-7 of one run is not T-7 of another): the
 * kind, symbol, instant and price, and for a fill the whole trade (both legs' instants and prices).
 */
export function stableKeyOf(e: LabEvent, events: readonly LabEvent[]): string {
  const leg = (x: LabEvent | undefined) => (x ? `${x.kind}@${x.t}@${x.price ?? 'null'}` : 'open');
  if (e.kind === 'executed_entry' || e.kind === 'executed_exit') {
    const other = e.linkedEventId ? events.find((x) => x.id === e.linkedEventId && x.linkedEventId === e.id) : undefined;
    const [entry, exit] = e.kind === 'executed_entry' ? [e, other] : [other, e];
    return `${e.symbol}|${e.kind}|${leg(entry)}|${leg(exit)}`;
  }
  return `${e.symbol}|${e.kind}|${e.t}|${e.price ?? 'null'}`;
}

/** The event of `next` that is the same as `selected` of `prev` by stable identity (exactly one), or null. */
export function matchSelection(selected: LabEvent, prev: readonly LabEvent[], next: readonly LabEvent[]): LabEvent | null {
  const key = stableKeyOf(selected, prev);
  const found = next.filter((e) => e.symbol === selected.symbol && e.kind === selected.kind && stableKeyOf(e, next) === key);
  return found.length === 1 ? found[0]! : null;
}
