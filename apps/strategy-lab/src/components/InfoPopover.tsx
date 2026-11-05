// A small "ⓘ" button that shows help text in a popover on click (and Enter/Space, as any button). It is a disclosure:
// the button has aria-expanded and aria-controls, and is described by the popover while it is open. Escape (handled
// here, so it never reaches the panel or a dialog), a click outside or moving focus away closes it; focus stays on the
// button. The popover is portalled to <body> with a fixed position, so a scrolling panel never clips it, and it is
// kept inside the viewport (above the button when there is no room below).

import { type ReactNode, useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

export function InfoPopover({ label, children, testId }: { label: string; children: ReactNode; testId?: string }) {
  const [open, setOpen] = useState(false);
  const button = useRef<HTMLButtonElement>(null);
  const pop = useRef<HTMLDivElement>(null);
  const id = useId();

  useLayoutEffect(() => {
    if (!open) return;
    const place = () => {
      const b = button.current?.getBoundingClientRect();
      const p = pop.current;
      if (!b || !p) return;
      const width = Math.min(340, window.innerWidth - 16);
      const left = Math.max(8, Math.min(b.right - width, window.innerWidth - width - 8));
      const below = window.innerHeight - b.bottom - 12;
      const above = b.top - 12;
      const h = p.scrollHeight;
      const down = h <= below || below >= above;
      const maxHeight = Math.max(80, down ? below : above);
      // measured layout, applied directly (no re-render)
      p.style.left = `${left}px`;
      p.style.top = `${down ? b.bottom + 6 : Math.max(8, b.top - 6 - Math.min(h, maxHeight))}px`;
      p.style.maxHeight = `${maxHeight}px`;
      p.style.visibility = 'visible';
    };
    place();
    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, true);
    return () => {
      window.removeEventListener('resize', place);
      window.removeEventListener('scroll', place, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const outside = (e: PointerEvent) => {
      const t = e.target as Node;
      if (!button.current?.contains(t) && !pop.current?.contains(t)) setOpen(false);
    };
    document.addEventListener('pointerdown', outside, true);
    return () => document.removeEventListener('pointerdown', outside, true);
  }, [open]);

  return (
    <>
      <button
        ref={button}
        type="button"
        className={`info-btn${open ? ' is-open' : ''}`}
        aria-label={`About ${label}`}
        aria-expanded={open}
        aria-controls={open ? id : undefined}
        aria-describedby={open ? id : undefined}
        onClick={(e) => {
          e.stopPropagation();
          setOpen((o) => !o);
        }}
        onKeyDown={(e) => {
          if (e.key === 'Escape' && open) {
            e.preventDefault();
            e.stopPropagation();
            setOpen(false);
          }
        }}
        onBlur={(e) => {
          if (!pop.current?.contains(e.relatedTarget as Node | null)) setOpen(false);
        }}
        data-testid={testId}
      >
        <svg viewBox="0 0 16 16" aria-hidden="true">
          <circle cx="8" cy="8" r="6.6" fill="none" stroke="currentColor" strokeWidth="1.3" />
          <path d="M8 7.1v4.2M8 4.6v.1" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
      </button>
      {open &&
        createPortal(
          <div
            ref={pop}
            id={id}
            role="note"
            aria-label={`About ${label}`}
            className="info-popover"
            style={{ visibility: 'hidden', left: 0, top: 0 }}
            data-testid={testId ? `${testId}-popover` : undefined}
          >
            <b className="info-popover-title">{label}</b>
            <div>{children}</div>
          </div>,
          document.body
        )}
    </>
  );
}
