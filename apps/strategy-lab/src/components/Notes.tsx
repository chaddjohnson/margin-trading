import { Fragment, type ReactNode, useEffect, useState } from 'react';

import type { Note } from '../../shared/contract.ts';
import { api } from '../api.ts';
import { formatEt } from '../format.ts';

// A deliberately small Markdown subset rendered to React elements (never raw HTML): headings, paragraphs, bullet and
// numbered lists, **bold**, *italic*, `code` and http(s) links.
function inline(text: string): ReactNode[] {
  const out: ReactNode[] = [];
  const re = /(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`|\[[^\]]+\]\(https?:\/\/[^)\s]+\))/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let k = 0;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index));
    const t = m[0];
    if (t.startsWith('**')) out.push(<strong key={k++}>{t.slice(2, -2)}</strong>);
    else if (t.startsWith('`')) out.push(<code key={k++}>{t.slice(1, -1)}</code>);
    else if (t.startsWith('[')) {
      const lm = /^\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)$/.exec(t)!;
      out.push(
        <a key={k++} href={lm[2]} target="_blank" rel="noreferrer noopener">
          {lm[1]}
        </a>
      );
    } else out.push(<em key={k++}>{t.slice(1, -1)}</em>);
    last = m.index + t.length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

export function Markdown({ text }: { text: string }) {
  const blocks: ReactNode[] = [];
  const lines = text.replace(/\r/g, '').split('\n');
  let i = 0;
  let k = 0;
  while (i < lines.length) {
    const line = lines[i]!;
    if (!line.trim()) {
      i++;
      continue;
    }
    const h = /^(#{1,3})\s+(.*)$/.exec(line);
    if (h) {
      blocks.push(
        <p key={k++} className={`md-h md-h${h[1]!.length}`}>
          {inline(h[2]!)}
        </p>
      );
      i++;
      continue;
    }
    if (/^\s*([-*]|\d+\.)\s+/.test(line)) {
      const ordered = /^\s*\d+\./.test(line);
      const items: string[] = [];
      while (i < lines.length && /^\s*([-*]|\d+\.)\s+/.test(lines[i]!))
        items.push(lines[i++]!.replace(/^\s*([-*]|\d+\.)\s+/, ''));
      const Tag = ordered ? 'ol' : 'ul';
      blocks.push(
        <Tag key={k++}>
          {items.map((t, j) => (
            <li key={j}>{inline(t)}</li>
          ))}
        </Tag>
      );
      continue;
    }
    const para: string[] = [];
    while (i < lines.length && lines[i]!.trim() && !/^(#{1,3})\s|^\s*([-*]|\d+\.)\s+/.test(lines[i]!))
      para.push(lines[i++]!);
    blocks.push(
      <p key={k++}>
        {para.map((t, j) => (
          <Fragment key={j}>
            {j > 0 && <br />}
            {inline(t)}
          </Fragment>
        ))}
      </p>
    );
  }
  return <div className="md">{blocks}</div>;
}

interface Props {
  targetType: 'run' | 'variation';
  targetId: string;
  onChanged: () => void;
}

export function NotesList({ targetType, targetId, onChanged }: Props) {
  const [notes, setNotes] = useState<Note[] | null>(null);
  const [draft, setDraft] = useState('');
  const [editing, setEditing] = useState<{ id: number; body: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let live = true;
    api
      .notes(targetType, targetId)
      .then((n) => live && setNotes(n))
      .catch((e: Error) => live && setError(e.message));
    return () => {
      live = false;
    };
  }, [targetType, targetId, tick]);

  const done = () => {
    setTick((t) => t + 1);
    onChanged();
  };

  const add = async () => {
    if (!draft.trim()) return;
    try {
      await api.addNote(targetType, targetId, draft);
      setDraft('');
      done();
    } catch (e) {
      setError((e as Error).message);
    }
  };

  return (
    <div className="notes" data-testid={`notes-${targetType}`}>
      {error && <p className="form-error">{error}</p>}
      {notes?.length === 0 && <p className="muted small">No notes on this {targetType} yet.</p>}
      <ul className="note-list">
        {notes?.map((n) => (
          <li key={n.id} className="note" data-note-id={n.id}>
            {editing?.id === n.id ? (
              <>
                <textarea
                  value={editing.body}
                  onChange={(e) => setEditing({ id: n.id, body: e.target.value })}
                  rows={4}
                  aria-label="Edit note"
                />
                <div className="row">
                  <button
                    type="button"
                    className="btn-chip"
                    onClick={async () => {
                      if (!editing.body.trim()) return;
                      await api.updateNote(n.id, editing.body);
                      setEditing(null);
                      done();
                    }}
                  >
                    Save
                  </button>
                  <button type="button" className="btn-ghost" onClick={() => setEditing(null)}>
                    Cancel
                  </button>
                </div>
              </>
            ) : (
              <>
                <Markdown text={n.body} />
                <div className="note-meta">
                  <span title={n.createdAt}>{formatEt(n.updatedAt)}</span>
                  <button type="button" className="link" onClick={() => setEditing({ id: n.id, body: n.body })}>
                    Edit
                  </button>
                  <button
                    type="button"
                    className="link danger"
                    onClick={async () => {
                      if (!confirm('Delete this note?')) return;
                      await api.deleteNote(n.id);
                      done();
                    }}
                  >
                    Delete
                  </button>
                </div>
              </>
            )}
          </li>
        ))}
      </ul>
      <label className="field">
        <span className="field-label">Add a note (Markdown: **bold**, *italic*, `code`, lists, links)</span>
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          rows={3}
          maxLength={20000}
          data-testid={`note-input-${targetType}`}
        />
      </label>
      <button
        type="button"
        className="btn-chip"
        onClick={add}
        disabled={!draft.trim()}
        data-testid={`note-add-${targetType}`}
      >
        Add note
      </button>
    </div>
  );
}
