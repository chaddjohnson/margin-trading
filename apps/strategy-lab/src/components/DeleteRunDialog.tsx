// "Delete result": the confirmation of deleting ONE saved run. It shows what is deleted (the run id, strategy, symbols,
// run date, notes and bookmark) and what is kept, warns that it is permanent, and needs an explicit click on the
// destructive button. Cancel has the initial focus and is the dialog's default; Escape and the ✕ cancel. While the
// request runs the buttons are disabled (no duplicate request); a failure is shown here and nothing is assumed deleted.

import { useEffect, useRef, useState } from 'react';

import type { RunDetail } from '../../shared/contract.ts';
import { ApiError, api, type DeleteRunResult } from '../api.ts';
import { formatEt } from '../format.ts';

interface Props {
  run: RunDetail;
  onCancel: () => void;
  onDeleted: (result: DeleteRunResult) => void;
}

export function DeleteRunDialog({ run, onCancel, onDeleted }: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string[] | null>(null);

  useEffect(() => {
    const d = ref.current;
    if (d && !d.open) d.showModal();
    cancelRef.current?.focus();
  }, []);

  const remove = async () => {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const result = await api.deleteRun(run.id);
      ref.current?.close();
      onDeleted(result);
    } catch (e) {
      setError(e instanceof ApiError ? [e.message, ...e.details] : [String(e)]);
      setBusy(false);
    }
  };

  return (
    <dialog
      ref={ref}
      className="dialog delete-dialog"
      aria-labelledby="delete-run-title"
      aria-describedby="delete-run-warning"
      onCancel={(e) => {
        e.preventDefault(); // Escape: cancel (unless the request is running)
        if (!busy) onCancel();
      }}
      data-testid="delete-run-dialog"
    >
      <header className="dialog-head">
        <h2 id="delete-run-title">Delete result {run.id}?</h2>
        <button type="button" className="btn-ghost" onClick={onCancel} disabled={busy} aria-label="Cancel">
          ✕
        </button>
      </header>
      <dl className="delete-facts" data-testid="delete-run-facts">
        <dt>Run</dt>
        <dd className="mono" data-testid="delete-run-id">
          {run.id}
          {run.title && run.title !== run.id ? <span className="muted"> · {run.title}</span> : null}
        </dd>
        <dt>Strategy</dt>
        <dd data-testid="delete-run-strategy">
          {run.strategy.title} <span className="mono muted">v{run.strategy.version}</span>
        </dd>
        <dt>Symbols</dt>
        <dd data-testid="delete-run-symbols">{run.symbols.join(', ')}</dd>
        <dt>Run date</dt>
        <dd data-testid="delete-run-date">
          {formatEt(run.createdAt)}
          {run.completedAt ? <span className="muted"> · finished {formatEt(run.completedAt)}</span> : null}
        </dd>
        <dt>Window</dt>
        <dd>
          {run.window.from} → {run.window.to}
          {run.window.resolution ? ` · ${run.window.resolution}` : ''}
        </dd>
      </dl>
      <p className="warn delete-warning" id="delete-run-warning" role="note">
        <b>This is permanent and cannot be undone.</b> It deletes this run’s results, events, trades, metrics, decision
        log and artifact files{run.noteCount ? `, its ${run.noteCount} note${run.noteCount === 1 ? '' : 's'}` : ''}
        {run.bookmarked ? ' and its bookmark' : ''}. Its variation {run.variation.id}, the strategy, phenotypes, market
        data and every other run are kept. The id {run.id} is never reused.
      </p>
      {error && (
        <div className="form-error" role="alert" data-testid="delete-run-error">
          <b>Not deleted.</b>
          {error.map((e) => (
            <div key={e}>{e}</div>
          ))}
        </div>
      )}
      <footer className="dialog-foot">
        <button
          type="button"
          ref={cancelRef}
          className="btn-ghost"
          onClick={onCancel}
          disabled={busy}
          data-testid="delete-run-cancel"
        >
          Cancel
        </button>
        <button
          type="button"
          className="btn-danger"
          onClick={() => void remove()}
          disabled={busy}
          data-testid="delete-run-confirm"
        >
          {busy ? 'Deleting…' : 'Delete result'}
        </button>
      </footer>
    </dialog>
  );
}
