// "New test" / "Clone settings": a schema-driven form that starts exactly ONE manual test of ONE configuration.
// Parameter sweeps and optimisation are deliberately not available here (Claude/CLI research workflows only).

import { type FormEvent, useEffect, useMemo, useRef, useState } from 'react';

import { RESOLUTION_LABEL, type Resolution, type RunRequest } from '../../shared/contract.ts';
import { defaultParams, validateParam } from '../../shared/strategies.ts';
import { ApiError, api, type Meta } from '../api.ts';

interface Props {
  meta: Meta;
  initial: Partial<RunRequest> | null;
  onClose: () => void;
  onCreated: (runId: string) => void;
}

const partitionRange = (meta: Meta, names: string[], symbols: string[]) => {
  const sym = meta.symbols.filter((s) => symbols.includes(s.symbol));
  const first =
    sym
      .map((s) => s.firstSession ?? '')
      .filter(Boolean)
      .sort()[0] ?? '2016-01-04';
  const last =
    sym
      .map((s) => s.lastSession ?? '')
      .filter(Boolean)
      .sort()
      .at(-1) ?? '2026-10-30';
  const starts = names.map((n) => meta.partitions[n]?.start ?? first);
  const ends = names.map((n) => meta.partitions[n]?.end ?? last);
  return {
    from: [...starts].sort()[0]! < first ? first : [...starts].sort()[0]!,
    to: [...ends].sort().at(-1)! > last ? last : [...ends].sort().at(-1)!
  };
};

export function RunTestDialog({ meta, initial, onClose, onCreated }: Props) {
  const spec = meta.strategies.find((s) => s.key === initial?.strategyKey) ?? meta.strategies[0]!;
  const [params, setParams] = useState<Record<string, string>>(() => {
    const d = { ...defaultParams(spec), ...(initial?.params ?? {}) };
    return Object.fromEntries(Object.entries(d).map(([k, v]) => [k, String(v)]));
  });
  const [resolution, setResolution] = useState<Resolution>(initial?.resolution ?? spec.defaultResolution);
  const [symbols, setSymbols] = useState<string[]>(initial?.symbols ?? ['VGT']);
  const [from, setFrom] = useState(initial?.from ?? meta.partitions.training?.start ?? '2016-01-04');
  const [to, setTo] = useState(initial?.to ?? meta.partitions.training?.end ?? '2023-12-31');
  const [title, setTitle] = useState('');
  const [filter, setFilter] = useState('');
  const [busy, setBusy] = useState(false);
  const [serverErrors, setServerErrors] = useState<string[]>([]);
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const d = dialogRef.current;
    if (d && !d.open) d.showModal();
  }, []);

  const parsed = useMemo(
    () => Object.fromEntries(spec.params.map((p) => [p.key, Number(params[p.key])])),
    [params, spec]
  );
  const fieldErrors = Object.fromEntries(
    spec.params.map((p) => [
      p.key,
      params[p.key]?.trim() === '' ? `${p.label}: required` : validateParam(p, parsed[p.key])
    ])
  );
  const holdoutStart = meta.partitions.holdout?.start ?? '2024-01-01';
  const touchesExposed = to >= holdoutStart;
  const invalid = Object.values(fieldErrors).some(Boolean) || symbols.length === 0 || !from || !to || from > to;
  const changedFrom = initial?.params
    ? spec.params
        .filter((p) => initial.params![p.key] !== undefined && initial.params![p.key] !== parsed[p.key])
        .map((p) => p.label)
    : [];

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (invalid) return;
    setBusy(true);
    setServerErrors([]);
    try {
      const req: RunRequest = {
        strategyKey: spec.key,
        strategyVersion: spec.version,
        params: parsed,
        symbols,
        from,
        to,
        resolution,
        ...(title.trim() ? { title: title.trim() } : {}),
        ...(initial?.parentVariation ? { parentVariation: initial.parentVariation } : {})
      };
      const run = await api.createRun(req);
      onCreated(run.id);
    } catch (err) {
      setServerErrors(err instanceof ApiError ? [err.message, ...err.details] : [String(err)]);
    } finally {
      setBusy(false);
    }
  };

  const preset = (names: string[]) => {
    const r = partitionRange(meta, names, symbols);
    setFrom(r.from);
    setTo(r.to);
  };

  const visibleSymbols = meta.symbols.filter((s) => s.symbol.includes(filter.trim().toUpperCase()));

  return (
    <dialog
      ref={dialogRef}
      className="dialog run-dialog"
      onClose={onClose}
      aria-labelledby="run-dialog-title"
      data-testid="run-dialog"
    >
      <form onSubmit={submit} method="dialog">
        <header className="dialog-head">
          <h2 id="run-dialog-title">
            {initial?.parentVariation ? `New test from ${initial.parentVariation}` : 'New test'}
          </h2>
          <button type="button" className="btn-ghost" onClick={() => dialogRef.current?.close()} aria-label="Close">
            ✕
          </button>
        </header>
        <p className="dialog-note">
          Runs <b>exactly one configuration</b> on real local market data and saves it as a new run. Changing a
          parameter creates a new variation; earlier runs are never modified. Parameter sweeps and optimisation are not
          available in the browser — they run as Claude/CLI research workflows (docs/strategy-lab/RESEARCH_WORKFLOW.md).
        </p>

        <fieldset>
          <legend>Strategy</legend>
          <div className="strategy-card">
            <b>{spec.title}</b> <span className="mono muted">v{spec.version}</span>
            <p className="muted small">{spec.description}</p>
          </div>
        </fieldset>

        <fieldset>
          <legend>Parameters</legend>
          {spec.params.map((p) => (
            <label key={p.key} className="field">
              <span className="field-label">
                {p.label} <span className="unit">({p.unit === 'percent' ? '%' : p.unit})</span>
              </span>
              <input
                type="number"
                inputMode="decimal"
                min={p.min}
                max={p.max}
                step={p.step}
                value={params[p.key] ?? ''}
                onChange={(e) => setParams((x) => ({ ...x, [p.key]: e.target.value }))}
                aria-invalid={Boolean(fieldErrors[p.key])}
                data-testid={`param-${p.key}`}
              />
              <span className="field-help">
                {p.description} Range {p.min}–{p.max}; default {p.default}. <span className="mono">{p.key}</span>
              </span>
              {fieldErrors[p.key] && <span className="form-error">{fieldErrors[p.key]}</span>}
            </label>
          ))}
          <label className="field">
            <span className="field-label">Bar resolution (what one lookback “bar” is)</span>
            <select
              value={resolution}
              onChange={(e) => setResolution(e.target.value as Resolution)}
              data-testid="param-resolution"
            >
              {spec.resolutions.map((r) => (
                <option key={r} value={r}>
                  {r} — {RESOLUTION_LABEL[r]}
                </option>
              ))}
            </select>
            <span className="field-help">
              N = {params.recentLowLookbackBars || '?'} completed {RESOLUTION_LABEL[resolution]}
              {resolution === '1d' ? ' (sessions)' : ' within the regular session; overnight gaps are not counted'}.
            </span>
          </label>
          {changedFrom.length > 0 && (
            <p className="muted small">Changed from the source run: {changedFrom.join(', ')}.</p>
          )}
        </fieldset>

        <fieldset>
          <legend>Symbols ({symbols.length} selected)</legend>
          <input
            type="search"
            placeholder="Filter symbols…"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            aria-label="Filter symbols"
          />
          <div className="symbol-grid" role="group" aria-label="Symbols">
            {visibleSymbols.map((s) => (
              <label
                key={s.symbol}
                className={`symbol-chip${symbols.includes(s.symbol) ? ' is-on' : ''}`}
                title={`${s.firstSession} – ${s.lastSession}`}
              >
                <input
                  type="checkbox"
                  checked={symbols.includes(s.symbol)}
                  onChange={(e) =>
                    setSymbols((xs) => (e.target.checked ? [...xs, s.symbol] : xs.filter((x) => x !== s.symbol)))
                  }
                  data-testid={`symbol-${s.symbol}`}
                />
                {s.symbol}
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset>
          <legend>Date range (New York session dates, inclusive)</legend>
          <div className="row">
            <label className="field inline">
              <span className="field-label">From</span>
              <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} data-testid="run-from" />
            </label>
            <label className="field inline">
              <span className="field-label">To</span>
              <input type="date" value={to} onChange={(e) => setTo(e.target.value)} data-testid="run-to" />
            </label>
          </div>
          <div className="row presets">
            <button type="button" className="btn-chip" onClick={() => preset(['training'])}>
              Training
            </button>
            <button type="button" className="btn-chip" onClick={() => preset(['holdout'])}>
              Holdout
            </button>
            <button type="button" className="btn-chip" onClick={() => preset(['final'])}>
              Final
            </button>
            <button type="button" className="btn-chip" onClick={() => preset(['training', 'holdout', 'final'])}>
              All
            </button>
          </div>
          {touchesExposed && (
            <p className="warn small" role="note">
              This window reaches into holdout/final dates (from {holdoutStart}). Looking at them is data exposure for
              any future study of this question (docs/research/growth-entry-discovery/PLAN.md §6).
            </p>
          )}
        </fieldset>

        <label className="field">
          <span className="field-label">Run title (optional, editable later)</span>
          <input
            type="text"
            maxLength={160}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. VGT 6% / 20 sessions"
            data-testid="run-title"
          />
        </label>

        {serverErrors.length > 0 && (
          <div className="form-error" role="alert" data-testid="run-errors">
            {serverErrors.map((e) => (
              <div key={e}>{e}</div>
            ))}
          </div>
        )}
        <footer className="dialog-foot">
          <button type="button" className="btn-ghost" onClick={() => dialogRef.current?.close()}>
            Cancel
          </button>
          <button type="submit" className="btn-primary" disabled={invalid || busy} data-testid="run-submit">
            {busy ? 'Starting…' : 'Run Test'}
          </button>
        </footer>
      </form>
    </dialog>
  );
}

export function TokenDialog({ onSave }: { onSave: (token: string) => void }) {
  const [value, setValue] = useState('');
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    if (ref.current && !ref.current.open) ref.current.showModal();
  }, []);
  return (
    <dialog ref={ref} className="dialog" aria-labelledby="token-title" data-testid="token-dialog">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (value.trim()) onSave(value.trim());
        }}
      >
        <h2 id="token-title">Access token</h2>
        <p className="dialog-note">
          This Strategy Lab server requires its access token (it is reachable over the VPN). On Apollo, read it with{' '}
          <code>cat state/strategy-lab/api-token</code>. It is stored in this browser only.
        </p>
        <input
          type="password"
          autoComplete="off"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          aria-label="Access token"
        />
        <footer className="dialog-foot">
          <button type="submit" className="btn-primary">
            Save
          </button>
        </footer>
      </form>
    </dialog>
  );
}
