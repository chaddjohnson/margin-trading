// UI state of the explorer. The chart's visible date window is deliberately NOT part of this state: it lives in the
// chart and changes only through explicit zoom actions, so no selection or filter change can reset it.

import type { ExplorerModel, PlacedEvent } from '../data/model.ts';
import type { EntryEventType } from '../schema/types.ts';

export type Role = 'A' | 'B';
export type TypeFilter = 'signals' | 'executed' | 'both';
export type Scope = 'in-view' | 'all';
export type SortKey = 'date' | 'price' | 'type' | 'variation';

export interface ExplorerState {
  /** Variation A: the primary selection. Always set. */
  primaryId: string;
  /** Variation B: the optional comparison overlay; never equal to A. */
  compareId: string | null;
  /** Marker visibility per role (legend toggles); hiding never changes the selection itself. */
  visible: Record<Role, boolean>;
  typeFilter: TypeFilter;
  selectedEventId: string | null;
  variationQuery: string;
  tableScope: Scope;
  tableQuery: string;
  sort: { key: SortKey; dir: 'asc' | 'desc' };
  metricsScope: Scope;
}

export type Action =
  | { type: 'selectPrimary'; id: string }
  | { type: 'toggleCompare'; id: string }
  | { type: 'clearCompare' }
  | { type: 'swap' }
  | { type: 'toggleVisible'; role: Role }
  | { type: 'setTypeFilter'; filter: TypeFilter }
  | { type: 'selectEvent'; id: string | null }
  | { type: 'setVariationQuery'; query: string }
  | { type: 'setTableScope'; scope: Scope }
  | { type: 'setTableQuery'; query: string }
  | { type: 'sortBy'; key: SortKey }
  | { type: 'setMetricsScope'; scope: Scope };

export function initialState(model: ExplorerModel): ExplorerState {
  const first = model.variations[0];
  if (!first) throw new Error('dataset has no variations');
  return {
    primaryId: first.variation.id,
    compareId: null,
    visible: { A: true, B: true },
    typeFilter: 'both',
    selectedEventId: null,
    variationQuery: '',
    tableScope: 'in-view',
    tableQuery: '',
    sort: { key: 'date', dir: 'asc' },
    metricsScope: 'in-view'
  };
}

export function typeIncluded(filter: TypeFilter, type: EntryEventType): boolean {
  return filter === 'both' || (filter === 'signals' ? type === 'signal' : type === 'executed');
}

/** The part of the state that decides which events are drawn. */
export type DrawSpec = Pick<ExplorerState, 'primaryId' | 'compareId' | 'visible' | 'typeFilter'>;

/** The role under which an event is currently drawn, or null if it is not drawn. */
export function roleOf(state: DrawSpec, e: PlacedEvent): Role | null {
  if (!typeIncluded(state.typeFilter, e.type)) return null;
  if (e.variationId === state.primaryId) return state.visible.A ? 'A' : null;
  if (e.variationId === state.compareId) return state.visible.B ? 'B' : null;
  return null;
}

function apply(state: ExplorerState, action: Action, model: ExplorerModel): ExplorerState {
  switch (action.type) {
    case 'selectPrimary': {
      if (!model.variationById.has(action.id) || action.id === state.primaryId)
        return { ...state, visible: { ...state.visible, A: true } };
      // Promoting B to A leaves no B (rather than silently making the old A the comparison).
      const compareId = state.compareId === action.id ? null : state.compareId;
      return { ...state, primaryId: action.id, compareId, visible: { ...state.visible, A: true } };
    }
    case 'toggleCompare': {
      if (!model.variationById.has(action.id) || action.id === state.primaryId) return state;
      if (state.compareId === action.id) return { ...state, compareId: null };
      return { ...state, compareId: action.id, visible: { ...state.visible, B: true } };
    }
    case 'clearCompare':
      return { ...state, compareId: null };
    case 'swap':
      if (!state.compareId) return state;
      return {
        ...state,
        primaryId: state.compareId,
        compareId: state.primaryId,
        visible: { A: state.visible.B, B: state.visible.A }
      };
    case 'toggleVisible':
      return { ...state, visible: { ...state.visible, [action.role]: !state.visible[action.role] } };
    case 'setTypeFilter':
      return { ...state, typeFilter: action.filter };
    case 'selectEvent':
      if (action.id !== null && !model.eventById.has(action.id)) return state;
      return { ...state, selectedEventId: action.id };
    case 'setVariationQuery':
      return { ...state, variationQuery: action.query };
    case 'setTableScope':
      return { ...state, tableScope: action.scope };
    case 'setTableQuery':
      return { ...state, tableQuery: action.query };
    case 'sortBy':
      return {
        ...state,
        sort:
          state.sort.key === action.key
            ? { key: action.key, dir: state.sort.dir === 'asc' ? 'desc' : 'asc' }
            : { key: action.key, dir: 'asc' }
      };
    case 'setMetricsScope':
      return { ...state, metricsScope: action.scope };
  }
}

/**
 * The reducer for one loaded model. After every action the selected event is dropped if it is no longer drawn
 * (its variation was deselected or hidden, or its type filtered out), so the detail panel never describes an
 * invisible marker.
 */
export function createReducer(model: ExplorerModel) {
  return (state: ExplorerState, action: Action): ExplorerState => {
    const next = apply(state, action, model);
    if (next.selectedEventId) {
      const e = model.eventById.get(next.selectedEventId);
      if (!e || roleOf(next, e) === null) return { ...next, selectedEventId: null };
    }
    return next;
  };
}
