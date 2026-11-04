// The frozen phenotype catalogue (read-only; filled only by the importer CLI): find a phenotype by study, strategy,
// symbol, id/name or role, inspect its locked configuration, its capability here and its data exposure, and run ONE
// test of it. Nothing here searches, sweeps or schedules: one configuration per click.

import { useState } from 'react';

import type { ParamValue } from '../../shared/contract.ts';
import { optionLabel, paramOf } from '../../shared/params.ts';
import { findStrategy } from '../../shared/strategies.ts';
import { api, type PhenotypeView } from '../api.ts';
import { formatEt } from '../format.ts';
import { useFetched } from '../hooks.ts';

interface Props {
  selectedId: string | null;
  refreshKey: number;
  onSelect: (id: string) => void;
  onRun: (p: PhenotypeView) => void;
  onOpenRun: (runId: string) => void;
}

const valueText = (p: PhenotypeView, key: string, v: ParamValue) => {
  const spec = findStrategy(p.strategy.key, p.strategy.version);
  const ps = spec ? paramOf(spec, key) : undefined;
  if (!ps) return String(v);
  if (ps.type === 'boolean') return v ? 'ON' : 'OFF';
  if (ps.type === 'enum') return optionLabel(ps, v);
  return `${String(v)}${ps.unit === 'percent' ? '%' : ps.unit === 'bps' ? ' bps' : ps.unit === 'sessions' ? ' sessions' : ps.unit === 'bars' ? ' bars' : ps.unit === 'days' ? ' days' : ''}`;
};

export function Phenotypes({ selectedId, refreshKey, onSelect, onRun, onOpenRun }: Props) {
  const [q, setQ] = useState('');
  const [study, setStudy] = useState('');
  const [strategy, setStrategy] = useState('');
  const [symbol, setSymbol] = useState('');
  const [role, setRole] = useState('');
  const query = { q: q.trim() || undefined, study: study || undefined, strategy: strategy || undefined, symbol: symbol || undefined, role: role || undefined };
  const list = useFetched(JSON.stringify([query, refreshKey]), () => api.phenotypes(query));
  const all = useFetched(`all|${refreshKey}`, () => api.phenotypes({}));
  const detail = useFetched(selectedId ? `${selectedId}|${refreshKey}` : null, (signal) => api.phenotype(selectedId!, signal));
  const options = (pick: (p: PhenotypeView) => string[]) => [...new Set((all.data ?? []).flatMap(pick))].sort();
  const p = detail.data;
  const spec = p ? findStrategy(p.strategy.key, p.strategy.version) : undefined;

  return (
    <div className="phenotypes" data-testid="phenotypes">
      <section className="card" aria-label="Phenotype catalogue">
        <div className="card-head">
          <h2>Phenotype catalogue</h2>
          <span className="muted small">
            Frozen configurations selected by Claude/CLI studies and imported read-only. Run one at a time; nothing here
            optimises or searches.
          </span>
        </div>
        <div className="row phenotype-filters">
          <input type="search" placeholder="Search id, name or study…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search phenotypes" data-testid="phenotype-search" />
          {(
            [
              ['Study', study, setStudy, options((x) => [x.studyRef])],
              ['Strategy', strategy, setStrategy, options((x) => [x.strategy.key])],
              ['Symbol', symbol, setSymbol, options((x) => x.symbols)],
              ['Role', role, setRole, options((x) => (x.role ? [x.role] : []))]
            ] as const
          ).map(([label, value, set, opts]) => (
            <label key={label} className="small">
              {label}{' '}
              <select value={value} onChange={(e) => set(e.target.value)} data-testid={`phenotype-filter-${label.toLowerCase()}`}>
                <option value="">all</option>
                {opts.map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </select>
            </label>
          ))}
        </div>
        {list.error && <p className="form-error">{list.error}</p>}
        <div className="table-scroll">
          <table className="event-table" data-testid="phenotype-table">
            <thead>
              <tr>
                <th scope="col">Id</th>
                <th scope="col">Name</th>
                <th scope="col">Study</th>
                <th scope="col">Role</th>
                <th scope="col">Execution</th>
                <th scope="col">Symbols</th>
                <th scope="col">Here</th>
              </tr>
            </thead>
            <tbody>
              {(list.data ?? []).length === 0 && (
                <tr>
                  <td colSpan={7} className="muted small">
                    {list.data ? 'No phenotype matches. Import one with npm --prefix apps/strategy-lab run import:phenotypes -- <export dir>.' : 'Loading…'}
                  </td>
                </tr>
              )}
              {(list.data ?? []).map((x) => (
                <tr
                  key={x.id}
                  tabIndex={0}
                  aria-selected={x.id === selectedId}
                  className={x.id === selectedId ? 'is-selected' : undefined}
                  onClick={() => onSelect(x.id)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      onSelect(x.id);
                    }
                  }}
                  data-phenotype={x.id}
                >
                  <td className="mono small">{x.id}</td>
                  <td>{x.name}</td>
                  <td className="mono small">{x.studyRef}</td>
                  <td>{x.role ?? '—'}{x.rank !== null ? ` #${x.rank}` : ''}</td>
                  <td className="small">{x.executionKind}</td>
                  <td className="mono small">{x.symbols.join('+')}</td>
                  <td className="small">{x.capability.runnable ? 'runnable' : 'view-only'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {selectedId && !p && <section className="card muted">{detail.error ?? `Loading ${selectedId}…`}</section>}
      {p && (
        <section className="card phenotype-detail" aria-label={`Phenotype ${p.id}`} data-testid="phenotype-detail">
          <div className="card-head">
            <h3>
              {p.id} · {p.name}
            </h3>
            {p.capability.runnable ? (
              <button type="button" className="btn-primary" onClick={() => onRun(p)} data-testid="run-phenotype">
                Run selected phenotype…
              </button>
            ) : (
              <span className="badge badge-muted" data-testid="phenotype-view-only">
                VIEW-ONLY
              </span>
            )}
          </div>
          <p className={p.capability.runnable ? 'small' : 'warn small'} data-testid="phenotype-capability">
            {p.capability.runnable ? 'Runnable here' : 'Not runnable here'}: {p.capability.reason}.
          </p>
          <table className="kv-table">
            <tbody>
              <tr><th scope="row">Key</th><td className="mono">{p.key}</td></tr>
              <tr><th scope="row">Study</th><td className="mono">{p.studyRef}</td></tr>
              <tr><th scope="row">Role / rank</th><td>{p.role ?? '—'} / {p.rank ?? '—'}</td></tr>
              <tr><th scope="row">Strategy</th><td>{spec?.title ?? p.strategy.key} <span className="mono">{p.strategy.key}@{p.strategy.version}</span></td></tr>
              <tr><th scope="row">Execution kind</th><td>{p.executionKind}{p.executionKind === 'shared-slot pool' ? ' — one allocator replay with one shared funded slot (never independent symbol tests, never summed)' : p.executionKind === 'independent-symbol batch' ? ' — one independent $100,000 backtest per symbol' : ' — one $100,000 backtest'}</td></tr>
              <tr><th scope="row">Symbols</th><td className="mono">{p.symbols.join(', ')}</td></tr>
              {p.resolution && <tr><th scope="row">Resolution</th><td className="mono">{p.resolution}</td></tr>}
              <tr><th scope="row">Engine</th><td className="mono">{p.record.engine.version}{p.record.engine.commit ? ` @ ${p.record.engine.commit.slice(0, 12)}` : ''}</td></tr>
              <tr><th scope="row">Execution</th><td>${p.record.execution.notionalUsd.toLocaleString('en-US')} · {p.record.execution.annualInterestRate * 100}% interest · {p.record.execution.costBpsPerSide} bps per side · stops: {p.record.execution.stopFill} · {p.record.execution.capital}</td></tr>
              <tr><th scope="row">Selection</th><td>{p.record.selection.method}</td></tr>
              <tr><th scope="row">Data exposure</th><td className="warn-text">{p.record.data.exposure}</td></tr>
              {p.record.data.selectionWindow && <tr><th scope="row">Selection window</th><td className="mono">{p.record.data.selectionWindow.from} → {p.record.data.selectionWindow.to}</td></tr>}
              {p.record.data.testWindows.map((w) => (
                <tr key={w.label}><th scope="row">{w.label}</th><td className="mono">{w.from} → {w.to} (exposed: a rerun is not another holdout)</td></tr>
              ))}
              <tr><th scope="row">Record sha256</th><td className="mono small">{p.recordSha256}</td></tr>
              <tr><th scope="row">Import</th><td className="small">{p.import.id} from <span className="mono">{p.import.sourcePath}</span> (manifest sha256 <span className="mono">{p.import.sourceSha256.slice(0, 16)}…</span>), {formatEt(p.createdAt)}</td></tr>
            </tbody>
          </table>
          <h4 className="small">Locked configuration</h4>
          {p.record.params ? (
            <table className="kv-table" data-testid="phenotype-params">
              <tbody>
                {Object.entries(p.record.params).map(([k, v]) => (
                  <tr key={k}>
                    <th scope="row">{(spec && paramOf(spec, k)?.label) ?? k}</th>
                    <td className="mono">{valueText(p, k, v)}</td>
                    <td className="unit mono">{k}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : p.record.pool ? (
            <table className="kv-table" data-testid="phenotype-pool">
              <tbody>
                <tr><th scope="row">Sealed id</th><td className="mono">{p.record.pool.sealedId}</td></tr>
                <tr><th scope="row">Alias</th><td className="mono">{p.record.pool.alias}</td></tr>
                <tr><th scope="row">Config</th><td className="mono small">{p.record.pool.config.file} ({p.record.pool.config.sha256.slice(0, 12)}…)</td></tr>
                {Object.entries(p.record.pool.books).map(([sym, book]) => (
                  <tr key={sym}><th scope="row">{sym} book (engine encoding)</th><td className="mono small">{Object.entries(book).map(([k, v]) => `${k} ${v}`).join(' · ')}</td></tr>
                ))}
              </tbody>
            </table>
          ) : null}
          {p.record.notes && <p className="muted small">{p.record.notes}</p>}
          <h4 className="small">Runs of this phenotype ({p.runs?.length ?? 0})</h4>
          <ul className="small" data-testid="phenotype-runs">
            {(p.runs ?? []).map((r) => (
              <li key={r.id}>
                <button type="button" className="link" onClick={() => onOpenRun(r.id)}>
                  {r.id}
                </button>{' '}
                {r.title} · {r.status} · {r.window.from} → {r.window.to}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
