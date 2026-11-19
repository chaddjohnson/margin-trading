// The page-header banner of a displayed Interactive Preview: it says plainly that the chart, events, trades and analysis
// below are a TEMPORARY PREVIEW (its own PV-… id, never the saved run's R-… id), names the source run (unchanged), and
// holds "Save as run" (explicit; a second save of the same preview is confirmed first) and "Return to saved result".

import { useState } from 'react';

import type { RunDetail } from '../../shared/contract.ts';
import type { PreviewDetail } from '../../shared/preview.ts';
import { ApiError, displayId } from '../api.ts';
import type { PreviewController } from '../preview/usePreview.ts';

interface Props {
  preview: PreviewDetail;
  cacheHit: boolean;
  restored: boolean;
  source: RunDetail;
  onReturn: () => void;
  onSave: PreviewController['save'];
  onOpenRun: (id: string) => void;
}

export function PreviewBanner({ preview, cacheHit, restored, source, onReturn, onSave, onOpenRun }: Props) {
  const [saving, setSaving] = useState<{ title: string; busy: boolean; duplicates: string[] | null; error: string | null } | null>(null);
  const [savedAs, setSavedAs] = useState<{ previewId: string; runId: string } | null>(null);
  const p = preview.preview;
  const saved = savedAs?.previewId === preview.id ? savedAs.runId : null;
  const known = [...new Set([...p.savedAs, ...(saved ? [saved] : [])])];
  const seconds = (p.executionMs / 1000).toFixed(1);

  const save = async (confirmDuplicate: boolean) => {
    if (!saving) return;
    setSaving({ ...saving, busy: true, error: null });
    try {
      const r = await onSave({ title: saving.title, confirmDuplicate });
      if ('duplicates' in r) setSaving({ ...saving, busy: false, duplicates: r.duplicates });
      else {
        setSaving(null);
        setSavedAs({ previewId: preview.id, runId: r.runId });
      }
    } catch (e) {
      setSaving({ ...saving, busy: false, error: e instanceof ApiError ? [e.message, ...e.details].join(' — ') : String(e) });
    }
  };

  return (
    <div className="preview-banner" role="region" aria-label="Temporary preview" data-testid="preview-banner">
      <div className="preview-banner-row">
        <span className="badge badge-preview">TEMPORARY PREVIEW</span>
        <span className="mono" title={preview.id} data-testid="preview-id">
          {displayId(preview.id)}
        </span>
        <span className="small">
          <b>not saved</b> · {preview.strategy.title} <span className="mono">v{preview.strategy.version}</span> · {p.config.from} →{' '}
          {p.config.to} · {p.config.resolution} · from{' '}
          <span className="mono" data-testid="preview-source">
            {source.id}
          </span>{' '}
          (unchanged)
        </span>
        <span className="muted small" data-testid="preview-origin">
          {cacheHit
            ? `cache hit — computed ${new Date(p.executedAt).toLocaleString()} in ${seconds} s`
            : restored
              ? `restored from the cache (computed in ${seconds} s)`
              : `computed in ${seconds} s`}
        </span>
        <span className="preview-banner-actions">
          {saving === null && (
            <button
              type="button"
              className="btn-chip"
              // a preview already saved asks first (the server refuses an unconfirmed duplicate anyway)
              onClick={() => setSaving({ title: '', busy: false, duplicates: known.length ? known : null, error: null })}
              data-testid="preview-save"
            >
              Save as run…
            </button>
          )}
          <button type="button" className="btn-chip" onClick={onReturn} data-testid="preview-return">
            Return to saved result
          </button>
        </span>
      </div>
      {p.current && !p.current.matches && (
        <p className="warn small" role="alert" data-testid="preview-stale">
          <b>Outdated:</b> computed with code or data that has changed since ({p.current.differences.slice(0, 6).join(', ')}
          {p.current.differences.length > 6 ? ', …' : ''}). This is still exactly the result of that earlier execution;
          press <b>Run preview</b> with the same values to recompute it with the current code and data. It cannot be saved
          as a run.
        </p>
      )}
      {known.length > 0 && (
        <p className="small" data-testid="preview-saved-as">
          Saved as{' '}
          {known.map((id, i) => (
            <span key={id}>
              {i > 0 ? ', ' : ''}
              <button type="button" className="link" onClick={() => onOpenRun(id)}>
                {id}
              </button>
            </span>
          ))}{' '}
          (a new immutable run in the list; this preview stays displayed).
        </p>
      )}
      {saving && (
        <form
          className="preview-save-form row"
          onSubmit={(e) => {
            e.preventDefault();
            void save(false);
          }}
          data-testid="preview-save-form"
        >
          {saving.duplicates ? (
            <span className="warn small" role="alert" data-testid="preview-duplicate">
              This exact preview is already saved as {saving.duplicates.join(', ')}. Save another copy anyway?
            </span>
          ) : (
            <label className="small">
              Run title (optional){' '}
              <input
                autoFocus
                maxLength={160}
                value={saving.title}
                onChange={(e) => setSaving({ ...saving, title: e.target.value })}
                placeholder={`from ${source.id}`}
                data-testid="preview-save-title"
              />
            </label>
          )}
          {saving.duplicates ? (
            <>
              <button type="button" className="btn-chip" disabled={saving.busy} onClick={() => void save(true)} data-testid="preview-save-again">
                Save another copy
              </button>
              <button type="button" className="btn-ghost" onClick={() => onOpenRun(saving.duplicates![0]!)}>
                Open {saving.duplicates[0]}
              </button>
            </>
          ) : (
            <button type="submit" className="btn-primary" disabled={saving.busy} data-testid="preview-save-confirm">
              {saving.busy ? 'Saving…' : 'Save as a new run'}
            </button>
          )}
          <button type="button" className="btn-ghost" onClick={() => setSaving(null)}>
            Cancel
          </button>
          <span className="muted small">
            Creates ONE new immutable run with exactly this result and its provenance; {source.id} is not changed.
          </span>
          {saving.error && (
            <span className="form-error small" role="alert">
              {saving.error}
            </span>
          )}
        </form>
      )}
    </div>
  );
}
