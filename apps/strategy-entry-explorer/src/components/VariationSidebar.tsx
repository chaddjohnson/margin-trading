import { type KeyboardEvent, useMemo } from 'react';

import type { ExplorerModel } from '../data/model.ts';
import { formatCount } from '../format.ts';
import type { Action, ExplorerState } from '../state/explorer.ts';
import { matchesVariation } from '../state/selectors.ts';

interface Props {
  model: ExplorerModel;
  state: ExplorerState;
  dispatch: (a: Action) => void;
}

export function VariationSidebar({ model, state, dispatch }: Props) {
  const shown = useMemo(
    () => model.variations.filter((vm) => matchesVariation(vm, state.variationQuery)),
    [model, state.variationQuery]
  );
  const primaryHidden = !shown.some((vm) => vm.variation.id === state.primaryId);

  // Up/Down move between variations (roving focus over the main buttons).
  const onKeyDown = (e: KeyboardEvent<HTMLUListElement>) => {
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
    const buttons = [...e.currentTarget.querySelectorAll<HTMLButtonElement>('.var-main')];
    const i = buttons.indexOf(document.activeElement as HTMLButtonElement);
    if (i < 0) return;
    e.preventDefault();
    buttons[Math.max(0, Math.min(buttons.length - 1, i + (e.key === 'ArrowDown' ? 1 : -1)))]?.focus();
  };

  return (
    <aside className="sidebar" aria-label="Variations">
      <div className="sidebar-head">
        <h2>
          Variations <span className="muted">({model.variations.length})</span>
        </h2>
      </div>
      <label className="search">
        <span className="visually-hidden">Search variations</span>
        <input
          type="search"
          placeholder="Search variations…"
          value={state.variationQuery}
          onChange={(e) => dispatch({ type: 'setVariationQuery', query: e.target.value })}
          data-testid="variation-search"
        />
      </label>
      <p className="sidebar-hint">
        Click a variation to show it as <b className="role-a">A</b>. Use <b>Compare</b> to overlay a second one as{' '}
        <b className="role-b">B</b>.
      </p>
      {primaryHidden && (
        <p className="sidebar-note">The selected variation A is hidden by the search; it stays selected.</p>
      )}
      <ul className="var-list" onKeyDown={onKeyDown} data-testid="variation-list">
        {shown.map((vm) => {
          const v = vm.variation;
          const isA = v.id === state.primaryId;
          const isB = v.id === state.compareId;
          return (
            <li key={v.id} className={`var-item${isA ? ' is-a' : ''}${isB ? ' is-b' : ''}`} data-variation-id={v.id}>
              <button
                type="button"
                className="var-main"
                aria-pressed={isA}
                onClick={() => dispatch({ type: 'selectPrimary', id: v.id })}
                title={isA ? 'Shown as A' : 'Show as A'}
              >
                <span className="var-title">
                  <span className="var-code">{v.code}</span>
                  <span className="var-name">{v.name}</span>
                </span>
                <span className="var-summary">{v.summary}</span>
                <span className="var-counts">
                  <span>{formatCount(vm.counts.signal)} signals</span>
                  <span>{formatCount(vm.counts.executed)} executed</span>
                  <span className="var-family">{v.family}</span>
                </span>
              </button>
              <div className="var-side">
                {isA && (
                  <span className="role-badge role-badge-a" aria-label="Shown as A">
                    A
                  </span>
                )}
                {isB && (
                  <span className="role-badge role-badge-b" aria-label="Compared as B">
                    B
                  </span>
                )}
                {!isA && (
                  <button
                    type="button"
                    className={`var-compare${isB ? ' is-on' : ''}`}
                    aria-pressed={isB}
                    aria-label={isB ? `Stop comparing ${v.code}` : `Compare ${v.code} as B`}
                    onClick={() => dispatch({ type: 'toggleCompare', id: v.id })}
                  >
                    {isB ? 'Remove' : 'Compare'}
                  </button>
                )}
              </div>
            </li>
          );
        })}
        {shown.length === 0 && <li className="empty">No variation matches “{state.variationQuery}”.</li>}
      </ul>
    </aside>
  );
}
