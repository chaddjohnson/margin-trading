// The help text of one parameter exactly as the New Test form shows it beneath the field. Interactive Preview shows the
// same component inside an info popover (one source: nothing is copied or rewritten).

import { RESOLUTION_LABEL, type ParamSpec, type Resolution } from '../../shared/contract.ts';

export function ParamHelpText({ p, value, applied }: { p: ParamSpec; value: string | boolean | undefined; applied: boolean }) {
  if (p.type === 'boolean')
    return (
      <>
        {p.description} Default {p.default ? 'ON' : 'OFF'}.{!applied && <> Unavailable while its parent rule is off.</>}{' '}
        <span className="mono">{p.key}</span>
      </>
    );
  if (p.type === 'enum') {
    const chosen = p.options.find((o) => o.value === value);
    return (
      <>
        {chosen?.description ?? p.description}{' '}
        <span className="mono">
          {p.key} = {String(value)}
        </span>
      </>
    );
  }
  return (
    <>
      {p.description} Range {p.min}–{p.max}; default {String(p.default)}. <span className="mono">{p.key}</span>
    </>
  );
}

/** The bar resolution's help text (New Test: beneath the resolution select). */
export function ResolutionHelpText({ resolution, lookback }: { resolution: Resolution; lookback: string | boolean | undefined }) {
  return (
    <>
      N = {String(lookback ?? '?') || '?'} completed {RESOLUTION_LABEL[resolution]}
      {resolution === '1d' ? ' (sessions)' : ' within the regular session; overnight gaps are not counted'}.
    </>
  );
}
