// "New test" / "Clone settings" / "Run selected phenotype": a schema-driven form (parameter schema v2,
// shared/params.ts) that starts exactly ONE manual test of ONE configuration. Parameter sweeps and optimisation are
// deliberately not available here (Claude/CLI research workflows only).
//
// Applicability comes from the schema: an inactive parameter is either disabled in place ("saved, not applied") or
// hidden (the inputs of the continuation methods, trend methods and eligibility policies not selected). Hidden drafts are
// kept while switching and are sent only when edited away from their default; the server stores them as "saved, not
// applied" and executes only the effective values. The same validator runs here and on the server. Value-dependent
// notes and warnings come from the registry (StrategySpec.groupNotes), not from strategy-specific code here. The
// strategy itself is chosen in a compact rich select (StrategyPicker).

import { type FormEvent, useEffect, useMemo, useRef, useState } from 'react';

import {
  type LabRunRequest,
  type ParamSpec,
  type ParamValue,
  RESOLUTION_LABEL,
  type Resolution
} from '../../shared/contract.ts';
import { constraintErrors, defaultParams, isActive, noteShown } from '../../shared/params.ts';
import { ApiError, api, type Meta, type PhenotypeView } from '../api.ts';
import { type Draft, draftOf, fieldErrorsOf, isShown, parseDraft, requestParams, UNIT_TEXT, withValue } from '../paramForm.ts';
import { ParamHelpText, ResolutionHelpText } from './ParamHelp.tsx';
import { StrategyPicker } from './StrategyPicker.tsx';

interface Props {
  meta: Meta;
  initial: Partial<LabRunRequest> | null;
  /** Run a catalogue phenotype (one run): the strategy and its origin are locked; edits make a derived variation. */
  phenotype?: PhenotypeView | null;
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

export function RunTestDialog({ meta, initial, phenotype, onClose, onCreated }: Props) {
  const lockedSpec = phenotype
    ? (meta.phenotypeStrategies.find((s) => s.key === phenotype.strategy.key && s.version === phenotype.strategy.version) ??
      null)
    : null;
  const initialSpec =
    lockedSpec ?? meta.strategies.find((s) => s.key === initial?.strategyKey) ?? meta.strategies[0]!;
  const pool = phenotype?.executionKind === 'shared-slot pool';
  const [specKey, setSpecKey] = useState(initialSpec.key);
  const spec = lockedSpec ?? meta.strategies.find((s) => s.key === specKey) ?? initialSpec;
  const origin = phenotype?.record.params ?? initial?.params ?? {};
  const [params, setParams] = useState<Draft>(() => draftOf(initialSpec, origin));
  const [resolution, setResolution] = useState<Resolution>(
    (phenotype?.record.resolution as Resolution | undefined) ?? initial?.resolution ?? initialSpec.defaultResolution
  );
  const [symbols, setSymbols] = useState<string[]>(phenotype?.symbols ?? initial?.symbols ?? ['VGT']);
  const [from, setFrom] = useState(
    phenotype?.capability.fixedFrom ?? initial?.from ?? meta.partitions.training?.start ?? '2016-01-04'
  );
  const [to, setTo] = useState(initial?.to ?? (pool ? '2026-10-29' : (meta.partitions.training?.end ?? '2023-12-31')));
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
  const active = (key: string) => isActive(spec, parsed, key);
  const shown = (p: ParamSpec) => isShown(spec, parsed, p);
  const fieldErrors = fieldErrorsOf(spec, params, parsed);
  const sent = requestParams(spec, parsed);
  const crossErrors = constraintErrors(spec, sent);
  const holdoutStart = meta.partitions.holdout?.start ?? '2024-01-01';
  const touchesExposed = to >= holdoutStart;
  const testWindows = phenotype?.record.data?.testWindows ?? [];
  const touchesStudyTest = testWindows.filter((w) => from <= w.to && to >= w.from);
  const invalid =
    (!pool && (Object.values(fieldErrors).some(Boolean) || crossErrors.length > 0)) ||
    symbols.length === 0 ||
    !from ||
    !to ||
    from > to;
  const originParams = (phenotype?.record.params ?? initial?.params) as Record<string, ParamValue> | undefined;
  const changedFrom =
    originParams && (phenotype || initial?.strategyKey === spec.key)
      ? spec.params
          .filter((p) => active(p.key) && originParams[p.key] !== undefined && originParams[p.key] !== parsed[p.key])
          .map((p) => p.label)
      : [];
  const edited =
    Boolean(phenotype) &&
    !pool &&
    (changedFrom.length > 0 ||
      resolution !== phenotype?.record.resolution ||
      spec.params.some((p) => active(p.key) && originParams?.[p.key] === undefined && parsed[p.key] !== p.default));
  const trading = spec.kind === 'trades';
  const notesOf = (group: string) =>
    (spec.groupNotes ?? [])
      .filter((n) => n.group === group && noteShown(spec, parsed, n.when))
      .map((n) => (
        <p key={n.id} className={`${n.tone === 'warn' ? 'warn' : 'muted'} small`} role="note" data-testid={n.id}>
          {n.text}
        </p>
      ));

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

  // A switch turned off also turns off the switches that apply only with it (no enabled-but-inert checkbox).
  const setParam = (p: ParamSpec, value: string | boolean) => setParams((x) => withValue(spec, x, p, value));

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (invalid) return;
    setBusy(true);
    setServerErrors([]);
    try {
      if (phenotype) {
        const body: Record<string, unknown> = { to, ...(title.trim() ? { title: title.trim() } : {}) };
        if (!pool) {
          body.from = from;
          body.symbols = symbols;
          body.params = sent;
          if (resolution !== phenotype.record.resolution) body.resolution = resolution;
        }
        const run = await api.runPhenotype(phenotype.id, body);
        onCreated(run.id);
        return;
      }
      const req: LabRunRequest = {
        strategyKey: spec.key,
        strategyVersion: spec.version,
        params: sent,
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
    if (!shown(p)) return null;
    const applied = active(p.key);
    const unit = UNIT_TEXT[p.unit] ?? p.unit;
    const dependent = Boolean(p.activeWhen);
    if (p.type === 'boolean')
      return (
        <label key={p.key} className={`field switch-field${dependent ? ' is-dependent' : ''}`}>
          <span className="switch-row">
            <input
              type="checkbox"
              checked={params[p.key] === true}
              disabled={!applied}
              onChange={(e) => setParam(p, e.target.checked)}
              data-testid={`param-${p.key}`}
            />
            <span className="field-label">{p.label}</span>
            <span className={`switch-state${params[p.key] === true ? ' is-on' : ''}`}>
              {params[p.key] === true ? 'ON' : 'OFF'}
            </span>
          </span>
          <span className="field-help">
            <ParamHelpText p={p} value={params[p.key]} applied={applied} />
          </span>
        </label>
      );
    if (p.type === 'enum') {
      return (
        <label key={p.key} className={`field${dependent ? ' is-dependent' : ''}`}>
          <span className="field-label">{p.label}</span>
          <select
            value={String(params[p.key])}
            disabled={!applied}
            onChange={(e) => setParam(p, e.target.value)}
            data-testid={`param-${p.key}`}
          >
            {p.options.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          <span className="field-help">
            <ParamHelpText p={p} value={params[p.key]} applied={applied} />
          </span>
        </label>
      );
    }
    return (
      <label key={p.key} className={`field${dependent ? ' is-dependent' : ''}${applied ? '' : ' is-inactive'}`}>
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
          <ParamHelpText p={p} value={params[p.key]} applied={applied} />
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
        <ResolutionHelpText resolution={resolution} lookback={params.recentLowLookbackBars} />
      </span>
    </label>
  );

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
            {phenotype
              ? `Run phenotype ${phenotype.id}`
              : initial?.parentVariation
                ? `New test from ${initial.parentVariation}`
                : 'New test'}
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

        {phenotype ? (
          <fieldset data-testid="phenotype-origin">
            <legend>Frozen phenotype (locked origin)</legend>
            <p className="small">
              <b>{phenotype.name}</b> · <span className="mono">{phenotype.key}</span> · study{' '}
              <span className="mono">{phenotype.studyRef}</span>
              {phenotype.role ? ` · role ${phenotype.role}` : ''} · {phenotype.executionKind} ·{' '}
              <span className="mono">
                {phenotype.strategy.key}@{phenotype.strategy.version}
              </span>
            </p>
            <p className="muted small">{phenotype.capability.reason}.</p>
            {phenotype.record.data?.exposure && (
              <p className="warn small" role="note">
                Data exposure: {phenotype.record.data.exposure}
              </p>
            )}
            {edited && (
              <p className="warn small" role="note" data-testid="phenotype-edited">
                Edited ({[...changedFrom, ...(resolution !== phenotype.record.resolution ? ['resolution'] : [])].join(', ') || 'parameters'}): this run is a
                NEW variation derived from {phenotype.id}. The frozen phenotype itself is never changed.
              </p>
            )}
          </fieldset>
        ) : (
          <fieldset>
            <legend>Strategy</legend>
            <StrategyPicker
              label="Strategy to test"
              value={spec.key}
              onChange={chooseStrategy}
              options={meta.strategies.map((s) => ({
                value: s.key,
                title: s.title,
                version: s.version,
                badge: s.kind === 'trades' ? 'TRADING BACKTEST' : 'SIGNAL-ONLY',
                badgeClass: s.kind === 'trades' ? 'badge-trading' : 'badge-muted',
                description: s.description
              }))}
            />
            <p className="muted small strategy-details" data-testid="strategy-details">
              {spec.description}
            </p>
            {spec.notes && (
              <ul className="strategy-notes small" data-testid="strategy-notes">
                {spec.notes.map((n) => (
                  <li key={n}>{n}</li>
                ))}
              </ul>
            )}
          </fieldset>
        )}

        {pool ? (
          <fieldset data-testid="pool-config">
            <legend>Sealed pool configuration (locked)</legend>
            <p className="small">
              Books {phenotype!.symbols.join(' + ')} in ONE shared funded $100,000 slot; sealed id{' '}
              <span className="mono">{phenotype!.record.pool?.sealedId}</span>; {phenotype!.record.execution.costBpsPerSide}{' '}
              bps per side. It is never run as independent per-symbol tests.
            </p>
          </fieldset>
        ) : spec.groups.length ? (
          spec.groups.map((g) => (
            <fieldset key={g.key} data-testid={`group-${g.key}`}>
              <legend>{g.title}</legend>
              {g.description && <p className="muted small">{g.description}</p>}
              {spec.params.filter((p) => p.group === g.key).map(field)}
              {g.key === 'entry' && resolutionField}
              {notesOf(g.key)}
            </fieldset>
          ))
        ) : (
          <fieldset>
            <legend>Parameters</legend>
            {spec.params.map(field)}
            {resolutionField}
          </fieldset>
        )}
        {!pool && crossErrors.length > 0 && (
          <div className="form-error" role="alert" data-testid="cross-errors">
            {crossErrors.map((e) => (
              <div key={e}>{e}</div>
            ))}
          </div>
        )}
        {!phenotype && changedFrom.length > 0 && (
          <p className="muted small">Changed from the source run: {changedFrom.join(', ')}.</p>
        )}

        {!pool && (
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
        )}

        <fieldset>
          <legend>Date range (New York session dates, inclusive)</legend>
          <div className="row">
            <label className="field inline">
              <span className="field-label">From</span>
              <input
                type="date"
                value={from}
                disabled={pool}
                onChange={(e) => setFrom(e.target.value)}
                data-testid="run-from"
              />
            </label>
            <label className="field inline">
              <span className="field-label">To</span>
              <input type="date" value={to} onChange={(e) => setTo(e.target.value)} data-testid="run-to" />
            </label>
          </div>
          {pool ? (
            <p className="muted small">The start is fixed at {from} by the Study 8 contract (arming on 2017-06-15).</p>
          ) : (
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
          )}
          {touchesExposed && (
            <p className="warn small" role="note">
              This window reaches into holdout/final dates (from {holdoutStart}). Looking at them is data exposure for
              any future study of this question (docs/research/growth-entry-discovery/PLAN.md §6).
            </p>
          )}
          {touchesStudyTest.length > 0 && (
            <p className="warn small" role="note" data-testid="study-test-warning">
              It overlaps the study’s {touchesStudyTest.map((w) => `${w.label} (${w.from} → ${w.to})`).join(', ')}:
              those dates are already exposed. This rerun is exploratory, NOT another independent holdout.
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
            {busy ? 'Starting…' : phenotype ? 'Run selected phenotype' : 'Run Test'}
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
