// The Interactive Preview panel (docs/strategy-lab/INTERACTIVE_PREVIEW.md): a compact, registry-driven form beside the
// chart. Labels and controls only; each parameter's full New Test help text is behind its ⓘ button (ParamHelpText —
// the same component, never a copy). Applicability, validation, defaults, enums and the switch cascade come from the
// shared schema logic (shared/params.ts, src/paramForm.ts). Editing only marks the draft Modified; Enter in a field or
// Run preview submits the whole configuration (exactly one). No sweeps, no automatic runs.

import type { FormEvent, KeyboardEvent } from 'react';

import { type ParamSpec, RESOLUTION_LABEL, type Resolution } from '../../shared/contract.ts';
import { isActive, noteShown } from '../../shared/params.ts';
import { displayId } from '../api.ts';
import { isShown, parseDraft, UNIT_TEXT } from '../paramForm.ts';
import { type PreviewController, STATUS_LABEL } from '../preview/usePreview.ts';
import { InfoPopover } from './InfoPopover.tsx';
import { ParamHelpText, ResolutionHelpText } from './ParamHelp.tsx';

const NARROW = '(max-width: 1100px)';

export function PreviewPanel({ c, sourceRunId, onClose }: { c: PreviewController; sourceRunId: string; onClose: () => void }) {
  const { spec, draft, window: w, state, capability } = c;
  const parsed = spec && draft ? parseDraft(spec, draft) : null;
  const running = c.status === 'running';

  const onKeyDown = (e: KeyboardEvent<HTMLElement>) => {
    if (e.key === 'Escape' && !e.defaultPrevented && globalThis.matchMedia?.(NARROW).matches) {
      e.preventDefault();
      onClose(); // the narrow-screen drawer closes on Escape; the desktop panel stays
      return;
    }
    if (e.key !== 'Enter' || e.nativeEvent.isComposing || e.defaultPrevented) return;
    const t = e.target as HTMLElement;
    if (t instanceof HTMLInputElement || t instanceof HTMLSelectElement) {
      // Enter in any field submits the whole configuration (never a half-applied edit; once, not twice)
      e.preventDefault();
      c.submit();
    }
  };
  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    c.submit();
  };

  const field = (p: ParamSpec) => {
    if (!spec || !draft || !parsed || !isShown(spec, parsed, p)) return null;
    const applied = isActive(spec, parsed, p.key);
    const id = `pv-${p.key}`;
    const err = state?.fieldErrors[p.key] ?? null;
    const info = (
      <InfoPopover label={p.label} testId={`pv-info-${p.key}`}>
        <ParamHelpText p={p} value={draft[p.key]} applied={applied} />
      </InfoPopover>
    );
    if (p.type === 'boolean')
      return (
        <div key={p.key} className={`pp-field pp-switch${applied ? '' : ' is-inactive'}`}>
          <label htmlFor={id} className="pp-label">
            <input
              id={id}
              type="checkbox"
              checked={draft[p.key] === true}
              disabled={!applied}
              onChange={(e) => c.setParam(p, e.target.checked)}
              data-testid={`pv-param-${p.key}`}
            />
            {p.label}
          </label>
          {info}
        </div>
      );
    if (p.type === 'enum')
      return (
        <div key={p.key} className={`pp-field pp-choice${applied ? '' : ' is-inactive'}`}>
          <label htmlFor={id} className="pp-label">
            {p.label}
          </label>
          {info}
          <select id={id} value={String(draft[p.key])} disabled={!applied} onChange={(e) => c.setParam(p, e.target.value)} data-testid={`pv-param-${p.key}`}>
            {p.options.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
      );
    const unit = UNIT_TEXT[p.unit] ?? p.unit;
    return (
      <div key={p.key} className={`pp-field pp-number${applied ? '' : ' is-inactive'}${err ? ' has-error' : ''}`}>
        <label htmlFor={id} className="pp-label">
          {p.label} <span className="unit">{unit === '%' ? '%' : unit}</span>
        </label>
        {info}
        <input
          id={id}
          type="number"
          inputMode="decimal"
          min={p.min}
          max={p.max}
          step={p.step}
          value={String(draft[p.key] ?? '')}
          disabled={!applied}
          onChange={(e) => c.setParam(p, e.target.value)}
          aria-invalid={Boolean(err)}
          aria-describedby={err ? `${id}-error` : undefined}
          data-testid={`pv-param-${p.key}`}
        />
        {err && (
          <span id={`${id}-error`} className="pp-error" data-testid={`pv-error-${p.key}`}>
            {err}
          </span>
        )}
      </div>
    );
  };

  const groupHeading = (title: string, key: string, text: string[]) => (
    <legend>
      {title}
      {text.length > 0 && (
        <InfoPopover label={title} testId={`pv-group-info-${key}`}>
          {text.map((t) => (
            <p key={t}>{t}</p>
          ))}
        </InfoPopover>
      )}
    </legend>
  );

  const body = () => {
    if (c.capabilityError) return <p className="form-error small" role="alert">{c.capabilityError}</p>;
    if (!capability && !c.displayed) return <p className="muted small">Loading…</p>;
    if (capability && !capability.previewable && !c.upgrade && !c.displayed)
      return (
        <div className="pp-unavailable" data-testid="preview-unavailable">
          <p className="small">
            <b>Not previewable.</b> {capability.reason}
          </p>
          {capability.upgrade && (
            <>
              <p className="muted small">{capability.upgrade.note}</p>
              <button type="button" className="btn-chip" onClick={c.startUpgrade} data-testid="preview-upgrade">
                Preview this configuration as {spec?.title ?? capability.strategy.title} {capability.upgrade.version}
              </button>
            </>
          )}
        </div>
      );
    if (!spec || !draft || !w || !parsed) return <p className="muted small">Loading…</p>;
    const notes = (group: string) => (spec.groupNotes ?? []).filter((n) => n.group === group && noteShown(spec, parsed, n.when));
    const groups = spec.groups.length ? spec.groups : [{ key: '', title: 'Parameters', description: undefined }];
    return (
      <>
        {c.upgrade && capability?.upgrade && (
          <p className="warn small" role="note" data-testid="preview-upgrade-note">
            {capability.upgrade.note}
          </p>
        )}
        {capability && (capability.drift.implementation.length > 0 || capability.drift.data.length > 0) && (
          <p className="warn small" role="note" data-testid="preview-drift">
            The current {[capability.drift.implementation.length ? 'code' : '', capability.drift.data.length ? 'market data' : ''].filter(Boolean).join(' and ')}{' '}
            differ from what {sourceRunId} recorded ({[...capability.drift.implementation, ...capability.drift.data.map((s) => `${s} data`)].join(', ')}): a
            preview is a new execution, not a reproduction of it.
          </p>
        )}
        <fieldset className="pp-group" data-testid="pv-group-window">
          <legend>Test window</legend>
          <div className="pp-dates">
            <label className="pp-date">
              <span className="pp-label">From</span>
              <input type="date" value={w.from} onChange={(e) => c.setWindow({ from: e.target.value })} data-testid="pv-from" />
            </label>
            <label className="pp-date">
              <span className="pp-label">To</span>
              <input type="date" value={w.to} onChange={(e) => c.setWindow({ to: e.target.value })} data-testid="pv-to" />
            </label>
          </div>
          <div className="pp-field pp-choice">
            <label htmlFor="pv-resolution" className="pp-label">
              Bar resolution
            </label>
            <InfoPopover label="Bar resolution" testId="pv-info-resolution">
              <ResolutionHelpText resolution={w.resolution} lookback={draft.recentLowLookbackBars} />
            </InfoPopover>
            <select
              id="pv-resolution"
              value={w.resolution}
              onChange={(e) => c.setWindow({ resolution: e.target.value as Resolution })}
              data-testid="pv-resolution"
            >
              {spec.resolutions.map((r) => (
                <option key={r} value={r}>
                  {r} — {RESOLUTION_LABEL[r]}
                </option>
              ))}
            </select>
          </div>
          <p className="muted small pp-symbols" data-testid="pv-symbols">
            Symbols: {w.symbols.join(', ')} {w.symbols.length > 1 && spec.kind === 'trades' ? '(independent standalone backtests)' : ''}
          </p>
        </fieldset>
        {groups.map((g) => {
          const shown = notes(g.key);
          return (
            <fieldset key={g.key} className="pp-group" data-testid={`pv-group-${g.key || 'params'}`}>
              {groupHeading(g.title, g.key, [...(g.description ? [g.description] : []), ...shown.filter((n) => n.tone !== 'warn').map((n) => n.text)])}
              {spec.params.filter((p) => (g.key ? p.group === g.key : true)).map(field)}
              {shown
                .filter((n) => n.tone === 'warn')
                .map((n) => (
                  <p key={n.id} className="warn small pp-warn" role="note" data-testid={`pv-${n.id}`}>
                    {n.text}
                  </p>
                ))}
            </fieldset>
          );
        })}
        {state && state.formErrors.length > 0 && (
          <div className="form-error small" role="alert" data-testid="pv-form-errors">
            {state.formErrors.map((e) => (
              <div key={e}>{e}</div>
            ))}
          </div>
        )}
      </>
    );
  };

  const fieldErrorCount = state ? Object.values(state.fieldErrors).filter(Boolean).length : 0;
  return (
    <aside className="preview-panel" id="preview-panel" aria-label="Interactive Preview" data-testid="preview-panel" onKeyDown={onKeyDown}>
      <form className="preview-panel-inner" onSubmit={onSubmit} noValidate>
        <header className="pp-head">
          <div className="pp-title-row">
            <h3>Interactive Preview</h3>
            <button type="button" className="btn-ghost pp-close" onClick={onClose} aria-label="Close Interactive Preview" data-testid="preview-close">
              ✕
            </button>
          </div>
          {spec && (
            <div className="pp-strategy" data-testid="preview-strategy">
              <b>{spec.title}</b> <span className="badge badge-muted mono" data-testid="preview-version">v{spec.version}</span>{' '}
              <span className="mono muted">{spec.key}</span>
            </div>
          )}
          <div className={`pp-status is-${c.status}`} role="status" aria-live="polite" data-testid="preview-status" data-state={c.status}>
            <span className="pp-dot" aria-hidden="true" />
            {STATUS_LABEL[c.status]}
            {running && c.progress?.message ? <span className="muted"> · {c.progress.message}</span> : null}
            {c.status === 'modified' && fieldErrorCount > 0 ? <span className="pp-invalid"> · {fieldErrorCount} invalid</span> : null}
          </div>
          {c.error && (
            <p className="form-error small" role="alert" data-testid="preview-error">
              {c.error}
              <span className="block" data-testid="preview-error-shown">
                Not applied: the chart and Analysis still show{' '}
                {c.displayed ? `the previous successful preview ${displayId(c.displayed.detail.id)}` : `the saved result ${sourceRunId}`}, not this
                configuration.
              </span>
            </p>
          )}
        </header>
        <div className="pp-body" data-testid="preview-body">
          {body()}
        </div>
        {spec && (
          <footer className="pp-foot">
            <button
              type="submit"
              className="btn-primary"
              disabled={Boolean(c.disabledReason)}
              title={c.disabledReason ?? 'Run this configuration (Enter in any field)'}
              data-testid="preview-run"
            >
              {running ? 'Running…' : 'Run preview'}
            </button>
            <button
              type="button"
              className="btn-ghost"
              onClick={c.resetToDisplayed}
              disabled={c.status !== 'modified' && c.status !== 'error'}
              title="Put back the values of the result the chart shows now"
              data-testid="preview-reset"
            >
              Reset to displayed
            </button>
            {c.canResetToSaved && (
              <button type="button" className="btn-ghost" onClick={c.resetToSaved} title={`Put back the values of ${sourceRunId}`} data-testid="preview-reset-saved">
                Reset to {sourceRunId}
              </button>
            )}
          </footer>
        )}
      </form>
    </aside>
  );
}
