// "New test" / "Clone settings": a schema-driven form that starts exactly ONE manual test of ONE configuration.
// Parameter sweeps and optimisation are deliberately not available here (Claude/CLI research workflows only).
// The strategy selector offers the signal-only scanner and the trading backtest built on it. A rule switch is a
// boolean parameter saved with the run; an input whose switch is off stays editable-later but disabled and "not
// applied", and the buffered-loss switch is unticked and disabled while the maximum losing hold is off.

import { type FormEvent, useEffect, useMemo, useRef, useState } from 'react';

import {
  type LabRunRequest,
  type ParamSpec,
  type ParamValue,
  RESOLUTION_LABEL,
  type Resolution,
  type StrategySpec
} from '../../shared/contract.ts';
import { crossParamErrors, defaultParams, isParamApplied, validateParam } from '../../shared/strategies.ts';
import { ApiError, api, type Meta } from '../api.ts';

interface Props {
  meta: Meta;
  initial: Partial<LabRunRequest> | null;
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

type Draft = Record<string, string | boolean>; // numbers as typed text, switches as booleans

const draftOf = (spec: StrategySpec, values: Record<string, ParamValue>): Draft =>
  Object.fromEntries(
    spec.params.map((p) => {
      const v = values[p.key] ?? p.default;
      return [p.key, p.type === 'boolean' ? v === true : String(v)];
    })
  );

const parseDraft = (spec: StrategySpec, draft: Draft): Record<string, ParamValue> =>
  Object.fromEntries(
    spec.params.map((p) => [p.key, p.type === 'boolean' ? draft[p.key] === true : Number(draft[p.key])])
  );

const UNIT_TEXT: Partial<Record<ParamSpec['unit'], string>> = {
  percent: '%',
  days: 'calendar days',
  bps: 'bps per side'
};
const GROUPS: { key: NonNullable<ParamSpec['group']>; title: string }[] = [
  { key: 'entry', title: 'Entry — Rise from recent low (unchanged scanner)' },
  { key: 'exit', title: 'Exits' },
  { key: 'execution', title: 'Execution' }
];

export function RunTestDialog({ meta, initial, onClose, onCreated }: Props) {
  const initialSpec = meta.strategies.find((s) => s.key === initial?.strategyKey) ?? meta.strategies[0]!;
  const [specKey, setSpecKey] = useState(initialSpec.key);
  const spec = meta.strategies.find((s) => s.key === specKey) ?? initialSpec;
  const [params, setParams] = useState<Draft>(() => draftOf(initialSpec, initial?.params ?? {}));
  const [resolution, setResolution] = useState<Resolution>(initial?.resolution ?? initialSpec.defaultResolution);
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

  const parsed = useMemo(() => parseDraft(spec, params), [params, spec]);
  const fieldErrors = Object.fromEntries(
    spec.params.map((p) => [
      p.key,
      p.type !== 'boolean' && String(params[p.key] ?? '').trim() === ''
        ? `${p.label}: required`
        : validateParam(p, parsed[p.key])
    ])
  );
  const crossErrors = crossParamErrors(spec, parsed);
  const holdoutStart = meta.partitions.holdout?.start ?? '2024-01-01';
  const touchesExposed = to >= holdoutStart;
  const invalid =
    Object.values(fieldErrors).some(Boolean) ||
    crossErrors.length > 0 ||
    symbols.length === 0 ||
    !from ||
    !to ||
    from > to;
  const changedFrom =
    initial?.params && initial.strategyKey === spec.key
      ? spec.params
          .filter((p) => initial.params![p.key] !== undefined && initial.params![p.key] !== parsed[p.key])
          .map((p) => p.label)
      : [];
  const trading = spec.kind === 'trades';
  const holdOff = trading && parsed.maximumHoldEnabled === false;

  const chooseStrategy = (key: string) => {
    const next = meta.strategies.find((s) => s.key === key);
    if (!next || next.key === spec.key) return;
    // Shared inputs (X, N) carry over; everything else starts at the new strategy's defaults.
    setParams(
      draftOf(next, {
        ...defaultParams(next),
        ...Object.fromEntries(
          next.params.filter((p) => spec.params.some((q) => q.key === p.key)).map((p) => [p.key, parsed[p.key]!])
        )
      })
    );
    if (!next.resolutions.includes(resolution)) setResolution(next.defaultResolution);
    setSpecKey(next.key);
  };

  const setParam = (p: ParamSpec, value: string | boolean) =>
    setParams((x) => {
      const next: Draft = { ...x, [p.key]: value };
      // A switch turned off also turns off the switches that depend on it (no enabled-but-inert checkbox).
      if (p.type === 'boolean' && value === false)
        for (const q of spec.params) if (q.type === 'boolean' && q.dependsOn === p.key) next[q.key] = false;
      return next;
    });

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (invalid) return;
    setBusy(true);
    setServerErrors([]);
    try {
      const req: LabRunRequest = {
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

  const field = (p: ParamSpec) => {
    const applied = isParamApplied(spec, parsed, p.key);
    const parentOn = !p.dependsOn || (isParamApplied(spec, parsed, p.dependsOn) && parsed[p.dependsOn] === true);
    const disabled = Boolean(p.dependsOn) && !parentOn;
    const unit = UNIT_TEXT[p.unit] ?? p.unit;
    if (p.type === 'boolean')
      return (
        <label key={p.key} className={`field switch-field${p.dependsOn ? ' is-dependent' : ''}`}>
          <span className="switch-row">
            <input
              type="checkbox"
              checked={params[p.key] === true}
              disabled={disabled}
              onChange={(e) => setParam(p, e.target.checked)}
              data-testid={`param-${p.key}`}
            />
            <span className="field-label">{p.label}</span>
            <span className={`switch-state${params[p.key] === true ? ' is-on' : ''}`}>
              {params[p.key] === true ? 'ON' : 'OFF'}
            </span>
          </span>
          <span className="field-help">
            {p.description} Default {p.default ? 'ON' : 'OFF'}.
            {disabled && <> Unavailable while its parent rule is off.</>} <span className="mono">{p.key}</span>
          </span>
        </label>
      );
    return (
      <label key={p.key} className={`field${p.dependsOn ? ' is-dependent' : ''}${applied ? '' : ' is-inactive'}`}>
        <span className="field-label">
          {p.label}
          {p.key === 'trailingStopPercent' && <span className="badge badge-muted">always on</span>}{' '}
          <span className="unit">({unit})</span>
          {!applied && <span className="not-applied"> — saved, not applied (switch off)</span>}
        </span>
        <input
          type="number"
          inputMode="decimal"
          min={p.min}
          max={p.max}
          step={p.step}
          value={String(params[p.key] ?? '')}
          disabled={!applied}
          onChange={(e) => setParam(p, e.target.value)}
          aria-invalid={Boolean(fieldErrors[p.key])}
          data-testid={`param-${p.key}`}
        />
        <span className="field-help">
          {p.description} Range {p.min}–{p.max}; default {String(p.default)}. <span className="mono">{p.key}</span>
        </span>
        {fieldErrors[p.key] && <span className="form-error">{fieldErrors[p.key]}</span>}
      </label>
    );
  };

  const resolutionField = (
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
        N = {String(params.recentLowLookbackBars ?? '?') || '?'} completed {RESOLUTION_LABEL[resolution]}
        {resolution === '1d' ? ' (sessions)' : ' within the regular session; overnight gaps are not counted'}.
      </span>
    </label>
  );
  const grouped = spec.params.some((p) => p.group);

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
          <div className="strategy-choice" role="radiogroup" aria-label="Strategy">
            {meta.strategies.map((s) => (
              <label key={`${s.key}@${s.version}`} className={`strategy-card${s.key === spec.key ? ' is-on' : ''}`}>
                <input
                  type="radio"
                  name="strategy"
                  checked={s.key === spec.key}
                  onChange={() => chooseStrategy(s.key)}
                  data-testid={`strategy-${s.key}`}
                />
                <span>
                  <b>{s.title}</b> <span className="mono muted">v{s.version}</span>{' '}
                  <span className={`badge ${s.kind === 'trades' ? 'badge-trading' : 'badge-muted'}`}>
                    {s.kind === 'trades' ? 'TRADING BACKTEST' : 'SIGNAL-ONLY'}
                  </span>
                  <span className="muted small block">{s.description}</span>
                </span>
              </label>
            ))}
          </div>
          {spec.notes && (
            <ul className="strategy-notes small" data-testid="strategy-notes">
              {spec.notes.map((n) => (
                <li key={n}>{n}</li>
              ))}
            </ul>
          )}
        </fieldset>

        {grouped ? (
          GROUPS.map((g) => (
            <fieldset key={g.key} data-testid={`group-${g.key}`}>
              <legend>{g.title}</legend>
              {spec.params.filter((p) => p.group === g.key).map(field)}
              {g.key === 'entry' && resolutionField}
              {g.key === 'exit' && holdOff && (
                <p className="warn small" role="note" data-testid="hold-off-warning">
                  Maximum losing hold is OFF: a losing position has no exit — the trailing stop only becomes active
                  while selling at it would be profitable after interest — so a loser can stay open indefinitely. It is
                  reported as an open position marked at the last close, never as a fabricated sale.
                </p>
              )}
            </fieldset>
          ))
        ) : (
          <fieldset>
            <legend>Parameters</legend>
            {spec.params.map(field)}
            {resolutionField}
          </fieldset>
        )}
        {crossErrors.length > 0 && (
          <div className="form-error" role="alert" data-testid="cross-errors">
            {crossErrors.map((e) => (
              <div key={e}>{e}</div>
            ))}
          </div>
        )}
        {changedFrom.length > 0 && (
          <p className="muted small">Changed from the source run: {changedFrom.join(', ')}.</p>
        )}

        <fieldset>
          <legend>Symbols ({symbols.length} selected)</legend>
          {trading && symbols.length > 1 && (
            <p className="muted small" data-testid="multi-symbol-note">
              {symbols.length} independent standalone backtests, one per symbol, each on its own $100,000 notional.
              Their results are shown per symbol and never summed into one pool.
            </p>
          )}
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
