// The New Test strategy choice: a compact rich select (the WAI-ARIA "select-only combobox" pattern: a focusable
// combobox that controls a popup listbox) instead of a stack of radio cards. The closed state is one row (title,
// version, badge, a one-line subtitle); the popup lists every strategy with its FULL description, scrolls within a
// bounded height, and is positioned in the viewport (position: fixed inside the modal's top layer), so the modal's own
// scrolling never clips it. Selecting changes exactly the strategy key the form submits.
//
// Keyboard: ↓/↑/Enter/Space/Alt+↓ open; in the list ↓/↑/Home/End/PageUp/PageDown move, Enter/Space select, Escape
// closes without a change (and does not close the modal), Tab closes; typing jumps to the next title with that prefix.
// Pointer: click toggles; a click outside closes. Focus returns to the combobox after a choice.

import { type KeyboardEvent, useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from 'react';

export interface PickerOption {
  /** The value the form uses (the strategy key). */
  value: string;
  title: string;
  version: string;
  badge: string;
  badgeClass: string;
  description: string;
}

interface Props {
  label: string;
  options: readonly PickerOption[];
  value: string;
  onChange: (value: string) => void;
}

const MAX_POPUP = 420; // px: the popup's height limit (smaller when the viewport leaves less room)
const GAP = 4;

const subtitleOf = (description: string) => {
  const first = description.split(/(?<=\.)\s/)[0] ?? description;
  return first.length > 110 ? `${first.slice(0, 107)}…` : first;
};

export function StrategyPicker({ label, options, value, onChange }: Props) {
  const id = useId();
  const labelId = `${id}-label`;
  const listId = `${id}-list`;
  const optionId = (i: number) => `${id}-opt-${i}`;
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(() => Math.max(0, options.findIndex((o) => o.value === value)));
  const [place, setPlace] = useState<{ top: number; left: number; width: number; maxHeight: number; up: boolean } | null>(
    null
  );
  const rootRef = useRef<HTMLDivElement>(null);
  const comboRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const typed = useRef({ text: '', at: 0 });
  const selected = Math.max(0, options.findIndex((o) => o.value === value));
  const current = options[selected];

  // Fixed placement under (or, without room, above) the combobox, inside the viewport.
  const layout = useCallback(() => {
    const el = comboRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const below = window.innerHeight - r.bottom - GAP - 8;
    const above = r.top - GAP - 8;
    const up = below < 220 && above > below;
    const maxHeight = Math.max(120, Math.min(MAX_POPUP, up ? above : below));
    setPlace({ top: up ? r.top - GAP : r.bottom + GAP, left: r.left, width: r.width, maxHeight, up });
  }, []);

  useLayoutEffect(() => {
    if (!open) return;
    layout();
    const update = () => layout();
    window.addEventListener('resize', update);
    window.addEventListener('scroll', update, true); // the modal's own scrolling included
    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('scroll', update, true);
    };
  }, [open, layout]);

  // A pointer press outside the picker closes it (no change).
  useEffect(() => {
    if (!open) return;
    const down = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('pointerdown', down, true);
    return () => document.removeEventListener('pointerdown', down, true);
  }, [open]);

  // Keep the active option visible.
  useEffect(() => {
    if (!open) return;
    document.getElementById(optionId(active))?.scrollIntoView({ block: 'nearest' });
    // optionId is stable for this instance
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, active]);

  const openAt = (i: number) => {
    setActive(Math.min(options.length - 1, Math.max(0, i)));
    setOpen(true);
  };
  const choose = (i: number) => {
    const o = options[i];
    typed.current = { text: '', at: 0 };
    setOpen(false);
    comboRef.current?.focus();
    if (o && o.value !== value) onChange(o.value);
  };
  // A single character cycles through the titles starting with it; quickly typed characters search for that prefix.
  const typeahead = (key: string) => {
    const now = Date.now();
    typed.current = { text: now - typed.current.at > 700 ? key : typed.current.text + key, at: now };
    const q = typed.current.text.toLowerCase();
    const from = open ? active : selected;
    const offset = q.length === 1 ? 1 : 0;
    for (let k = 0; k < options.length; k++) {
      const i = (from + offset + k) % options.length;
      if (options[i]!.title.toLowerCase().startsWith(q)) {
        openAt(i);
        return;
      }
    }
  };

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const k = e.key;
    if (!open) {
      if (k === 'ArrowDown' || k === 'ArrowUp' || k === 'Enter' || k === ' ' || (k === 'ArrowDown' && e.altKey)) {
        e.preventDefault();
        openAt(selected);
      } else if (k === 'Home' || k === 'End') {
        e.preventDefault();
        openAt(k === 'Home' ? 0 : options.length - 1);
      } else if (k.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        typeahead(k);
      }
      return;
    }
    if (k === 'Escape') {
      e.preventDefault(); // closes the list only: the modal stays open
      e.stopPropagation();
      setOpen(false);
    } else if (k === 'ArrowDown' || k === 'ArrowUp') {
      e.preventDefault();
      if (k === 'ArrowUp' && e.altKey) choose(active);
      else setActive((i) => Math.min(options.length - 1, Math.max(0, i + (k === 'ArrowDown' ? 1 : -1))));
    } else if (k === 'Home' || k === 'End') {
      e.preventDefault();
      setActive(k === 'Home' ? 0 : options.length - 1);
    } else if (k === 'PageDown' || k === 'PageUp') {
      e.preventDefault();
      setActive((i) => Math.min(options.length - 1, Math.max(0, i + (k === 'PageDown' ? 5 : -5))));
    } else if (k === 'Enter' || k === ' ') {
      e.preventDefault();
      choose(active);
    } else if (k === 'Tab') {
      setOpen(false);
    } else if (k.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
      e.preventDefault();
      typeahead(k);
    }
  };

  return (
    <div className="picker" ref={rootRef} data-testid="strategy-picker-root">
      <span id={labelId} className="field-label">
        {label}
      </span>
      <div
        ref={comboRef}
        role="combobox"
        tabIndex={0}
        aria-labelledby={labelId}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        aria-activedescendant={open ? optionId(active) : undefined}
        className={`picker-combo${open ? ' is-open' : ''}`}
        onClick={() => (open ? setOpen(false) : openAt(selected))}
        onKeyDown={onKeyDown}
        data-testid="strategy-picker"
        data-value={value}
      >
        {current && (
          <span className="picker-value">
            <span className="picker-title-row">
              <b>{current.title}</b> <span className="mono muted">v{current.version}</span>{' '}
              <span className={`badge ${current.badgeClass}`}>{current.badge}</span>
            </span>
            <span className="picker-subtitle muted small">{subtitleOf(current.description)}</span>
          </span>
        )}
        <span className="picker-caret" aria-hidden="true">
          ▾
        </span>
      </div>
      <ul
        ref={listRef}
        id={listId}
        role="listbox"
        aria-labelledby={labelId}
        className={`picker-list${place?.up ? ' is-up' : ''}`}
        hidden={!open}
        style={
          place
            ? {
                top: place.up ? undefined : place.top,
                bottom: place.up ? window.innerHeight - place.top : undefined,
                left: place.left,
                width: place.width,
                maxHeight: place.maxHeight
              }
            : undefined
        }
        data-testid="strategy-listbox"
      >
        {options.map((o, i) => (
          <li
            key={o.value}
            id={optionId(i)}
            role="option"
            aria-selected={i === selected}
            className={`picker-option${i === active ? ' is-active' : ''}${i === selected ? ' is-selected' : ''}`}
            onPointerMove={() => setActive(i)}
            onPointerDown={(e) => e.preventDefault() /* keep the focus on the combobox */}
            onClick={() => choose(i)}
            data-testid={`strategy-option-${o.value}`}
          >
            <span className="picker-title-row">
              <b>{o.title}</b> <span className="mono muted">v{o.version}</span>{' '}
              <span className={`badge ${o.badgeClass}`}>{o.badge}</span>
              {i === selected && <span className="picker-check" aria-hidden="true"> ✓</span>}
            </span>
            <span className="picker-description muted small">{o.description}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
