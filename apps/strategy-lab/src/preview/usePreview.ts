// Interactive Preview state of one saved run's page (docs/strategy-lab/INTERACTIVE_PREVIEW.md §UI state):
//
// - The URL (`?preview=PV-…`) says which result is displayed: none = the saved run. A completed preview is loaded (its
//   detail and the current symbol's events and chart data — candles or prices — via `prefetch`) BEFORE the URL switches to it, so a swap
//   replaces every view at once and never shows a blank or half-swapped chart.
// - The draft is the configuration being edited. `null` = "the displayed configuration"; the first edit makes it
//   explicit. Edits only mark it Modified; nothing executes until Run preview (or Enter).
// - Each submission gets the next revision number. Only the latest revision may change what is displayed: an earlier
//   one's ticket is released at once (the server cancels work nobody waits for) and its late answers are ignored.
// - State lives per tab and per saved run (it resets when the run changes). A preview shown WITHOUT being run — a
//   reload, Back/Forward, a link — is re-checked by the server against the current code and data (`?current=1`): one
//   this tab already holds is shown at once and flagged "Outdated" if the check says so; Run preview then recomputes
//   it. Unsaved draft edits do not survive a reload.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import type { LabRunRequest, ParamSpec, Resolution, RunDetail, StrategySpec } from '../../shared/contract.ts';
import { canonicalPreviewConfig, type PreviewCapability, type PreviewDetail, previewConfigKey } from '../../shared/preview.ts';
import { findStrategy } from '../../shared/strategies.ts';
import { ApiError, api } from '../api.ts';
import { useFetched } from '../hooks.ts';
import { type Draft, draftOf, withValue } from '../paramForm.ts';
import { type DraftState, draftState, type DraftWindow, runDisabledReason } from './model.ts';

export type PreviewStatus = 'saved' | 'modified' | 'running' | 'cache-hit' | 'ready' | 'restored' | 'stale' | 'error';

export const STATUS_LABEL: Record<PreviewStatus, string> = {
  saved: 'Showing the saved result',
  modified: 'Modified',
  running: 'Running',
  'cache-hit': 'Cache hit',
  ready: 'Preview ready',
  restored: 'Preview (restored)',
  stale: 'Outdated: code or data changed',
  error: 'Error'
};

interface Displayed {
  detail: PreviewDetail;
  cacheHit: boolean;
  restored: boolean;
}

type Job =
  | { phase: 'idle' }
  | { phase: 'running'; rev: number; key: string; progress: { message: string; fraction: number | null } | null }
  | { phase: 'error'; key: string | null; message: string };

interface State {
  runId: string;
  open: boolean;
  /** The capability is fetched once the panel has been opened. */
  wanted: boolean;
  /** An explicit draft (null: the displayed configuration), for one strategy version. */
  draft: { spec: string; params: Draft; window: DraftWindow } | null;
  /** A legacy run: the user chose to preview its configuration as the current version (never implicit). */
  upgrade: boolean;
  job: Job;
  details: Record<string, Displayed>;
  notice: string | null;
}

const initial = (runId: string): State => ({
  runId,
  open: false,
  wanted: false,
  draft: null,
  upgrade: false,
  job: { phase: 'idle' },
  details: {},
  notice: null
});

const specKeyOf = (s: StrategySpec) => `${s.key}@${s.version}`;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const messageOf = (e: unknown) => (e instanceof ApiError ? [e.message, ...e.details].join(' — ') : String((e as Error)?.message ?? e));

export interface PreviewController {
  open: boolean;
  setOpen: (open: boolean) => void;
  capability: PreviewCapability | null;
  capabilityError: string | null;
  /** The strategy version of the draft (null: nothing previewable yet). */
  spec: StrategySpec | null;
  draft: Draft | null;
  window: DraftWindow | null;
  state: DraftState | null;
  setParam: (p: ParamSpec, value: string | boolean) => void;
  setWindow: (w: Partial<DraftWindow>) => void;
  /** The displayed preview (null: the saved run is displayed). */
  displayed: Displayed | null;
  /** A preview in the URL that is still loading. */
  loading: string | null;
  status: PreviewStatus;
  progress: { message: string; fraction: number | null } | null;
  error: string | null;
  notice: string | null;
  dismissNotice: () => void;
  disabledReason: string | null;
  submit: () => void;
  /** Draft := the displayed configuration. */
  resetToDisplayed: () => void;
  /** Draft := the saved run's own configuration. */
  resetToSaved: () => void;
  canResetToSaved: boolean;
  returnToSaved: () => void;
  upgrade: boolean;
  startUpgrade: () => void;
  save: (o: { title?: string; confirmDuplicate?: boolean }) => Promise<{ runId: string } | { duplicates: string[] }>;
}

interface Options {
  run: (RunDetail & { request: LabRunRequest | null }) | null;
  /** The preview the URL displays (validated id), or null. */
  routePreview: string | null;
  setRoutePreview: (id: string | null) => void;
  /** Loads the result's chart data for the current symbol into the page's fetch cache before it is displayed. */
  prefetch: (d: PreviewDetail) => Promise<void>;
  onSaved: (runId: string) => void;
}

export function usePreview({ run, routePreview, setRoutePreview, prefetch, onSaved }: Options): PreviewController {
  const runId = run?.id ?? '';
  const [st, setSt] = useState<State>(() => initial(runId));
  const s = st.runId === runId ? st : initial(runId);
  const update = useCallback((fn: (x: State) => State) => setSt((x) => fn(x.runId === runId ? x : initial(runId))), [runId]);
  const rev = useRef(0);
  const inflight = useRef<{ rev: number; ticket: string | null } | null>(null);
  // The preview a submission of this tab has just produced (and validated): its first display needs no re-check.
  const justRun = useRef<string | null>(null);

  const release = () => {
    const t = inflight.current?.ticket;
    inflight.current = null;
    if (t) void api.cancelPreviewTicket(t).catch(() => {});
  };
  // Leaving the run (or the page) releases a running preview: the server cancels work nobody waits for.
  useEffect(
    () => () => {
      const t = inflight.current?.ticket;
      inflight.current = null;
      rev.current++;
      if (t) void api.cancelPreviewTicket(t).catch(() => {});
    },
    [runId]
  );

  const capQ = useFetched<PreviewCapability>(s.wanted && run ? `cap|${run.id}` : null, (signal) => api.previewCapability(run!.id, signal));
  const capability = capQ.data;
  const capabilityError = capQ.error
    ? /not found|method not allowed/i.test(capQ.error)
      ? 'This Strategy Lab server does not offer Interactive Preview yet: restart it with the updated code (docs/strategy-lab/OPERATIONS.md).'
      : capQ.error
    : null;

  // What the URL displays.
  const displayed = routePreview ? (s.details[routePreview] ?? null) : null;
  const loading = routePreview && !displayed ? routePreview : null;

  // A preview shown without being run (a reload, Back/Forward, a link): the server re-checks it against the current
  // code and data. One this tab already holds stays on screen meanwhile; a new one is loaded first.
  const known = Boolean(routePreview && s.details[routePreview]);
  useEffect(() => {
    if (!routePreview || !run) return;
    if (justRun.current === routePreview) {
      justRun.current = null;
      return;
    }
    const ac = new AbortController();
    api
      .preview(routePreview, ac.signal, true)
      .then(async (d) => {
        if (!known) await prefetch(d);
        if (!ac.signal.aborted)
          update((x) => ({
            ...x,
            details: { ...x.details, [d.id]: x.details[d.id] ? { ...x.details[d.id]!, detail: d } : { detail: d, cacheHit: false, restored: true } }
          }));
      })
      .catch((e: unknown) => {
        if (ac.signal.aborted) return;
        update((x) => ({ ...x, notice: `The preview in the address could not be shown: ${messageOf(e)}. Showing the saved result.` }));
        setRoutePreview(null);
      });
    return () => ac.abort();
    // prefetch, known and setRoutePreview are read at the navigation; the preview id and the run identify the check
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routePreview, runId]);

  // The configuration displayed now, and the base a draft starts from.
  const base = useMemo(() => {
    if (displayed) {
      const c = displayed.detail.preview.config;
      const spec = findStrategy(c.strategyKey, c.strategyVersion) ?? null;
      return spec ? { spec, params: c.params, window: { symbols: c.symbols, from: c.from, to: c.to, resolution: c.resolution } } : null;
    }
    const seed = s.upgrade ? capability?.upgrade?.seed : capability?.seed;
    const spec = seed ? (findStrategy(seed.strategyKey, seed.strategyVersion) ?? null) : null;
    return seed && spec ? { spec, params: seed.params, window: { symbols: seed.symbols, from: seed.from, to: seed.to, resolution: seed.resolution } } : null;
  }, [displayed, capability, s.upgrade]);
  const savedKey = useMemo(() => {
    const seed = capability?.seed;
    const spec = seed ? findStrategy(seed.strategyKey, seed.strategyVersion) : undefined;
    return seed && spec ? previewConfigKey(canonicalPreviewConfig(spec, seed)) : null;
  }, [capability]);
  const shownKey = displayed ? previewConfigKey(displayed.detail.preview.config) : savedKey;
  // An outdated preview (the current code or data would give another result) can be run again with the same values.
  const stale = displayed?.detail.preview.current?.matches === false;
  const displayedKey = stale ? null : shownKey;

  const spec = base?.spec ?? null;
  const explicit = s.draft && spec && s.draft.spec === specKeyOf(spec) ? s.draft : null;
  const draft = explicit?.params ?? (base && spec ? draftOf(spec, base.params) : null);
  const window = explicit?.window ?? base?.window ?? null;
  const state = useMemo(() => (spec && draft && window ? draftState(spec, draft, window) : null), [spec, draft, window]);

  const runningKey = s.job.phase === 'running' ? s.job.key : null;
  const disabledReason = state
    ? runDisabledReason({ valid: state.valid, draftKey: state.key, displayedKey, runningKey })
    : 'Nothing to preview';
  const status: PreviewStatus =
    s.job.phase === 'running'
      ? 'running'
      : s.job.phase === 'error' && (s.job.key === null || s.job.key === state?.key)
        ? 'error'
        : state && state.key !== shownKey
          ? 'modified'
          : displayed
            ? stale
              ? 'stale'
              : displayed.restored
              ? 'restored'
              : displayed.cacheHit
                ? 'cache-hit'
                : 'ready'
            : 'saved';

  const setParam = (p: ParamSpec, value: string | boolean) => {
    if (!spec || !draft || !window) return;
    update((x) => ({ ...x, draft: { spec: specKeyOf(spec), params: withValue(spec, draft, p, value), window } }));
  };
  const setWindow = (w: Partial<DraftWindow>) => {
    if (!spec || !draft || !window) return;
    update((x) => ({ ...x, draft: { spec: specKeyOf(spec), params: draft, window: { ...window, ...w } } }));
  };

  const submit = () => {
    if (disabledReason || !state?.config || !state.key || !run) return;
    const config = state.config;
    const key = state.key;
    release(); // a superseded submission stops counting: its ticket is released at once
    const mine = ++rev.current;
    inflight.current = { rev: mine, ticket: null };
    const current = () => rev.current === mine;
    update((x) => ({ ...x, job: { phase: 'running', rev: mine, key, progress: { message: 'Submitting', fraction: null } }, notice: null }));
    void (async () => {
      try {
        let t = await api.submitPreview(config, run.id);
        if (!current()) {
          if (t.state === 'queued' || t.state === 'running') void api.cancelPreviewTicket(t.ticket).catch(() => {});
          return;
        }
        inflight.current = { rev: mine, ticket: t.ticket };
        while (t.state === 'queued' || t.state === 'running') {
          const progress = t.progress;
          update((x) => (x.job.phase === 'running' && x.job.rev === mine ? { ...x, job: { ...x.job, progress } } : x));
          await sleep(300);
          if (!current()) return;
          t = await api.previewTicket(t.ticket);
          if (!current()) return;
        }
        if (t.state !== 'completed') throw new Error(t.error ?? `the preview was ${t.state}`);
        const detail = await api.preview(t.previewId);
        await prefetch(detail);
        if (!current()) return;
        inflight.current = null;
        const cacheHit = t.cacheHit;
        update((x) => ({ ...x, job: { phase: 'idle' }, details: { ...trim(x.details), [detail.id]: { detail, cacheHit, restored: false } } }));
        justRun.current = detail.id;
        setRoutePreview(detail.id);
      } catch (e) {
        if (!current()) return;
        inflight.current = null;
        const message =
          e instanceof ApiError && e.status === 404 && /ticket/.test(e.message)
            ? 'The server lost this preview (it restarted while the preview ran). Run it again.'
            : messageOf(e);
        update((x) => ({ ...x, job: { phase: 'error', key, message } }));
      }
    })();
  };

  const resetToDisplayed = () => update((x) => ({ ...x, draft: null, job: x.job.phase === 'error' ? { phase: 'idle' } : x.job }));
  const resetToSaved = () => {
    const seed = capability?.seed;
    const sp = seed ? findStrategy(seed.strategyKey, seed.strategyVersion) : undefined;
    if (!seed || !sp) return;
    update((x) => ({
      ...x,
      upgrade: false,
      draft: { spec: specKeyOf(sp), params: draftOf(sp, seed.params), window: { symbols: seed.symbols, from: seed.from, to: seed.to, resolution: seed.resolution as Resolution } },
      job: x.job.phase === 'error' ? { phase: 'idle' } : x.job
    }));
  };
  const returnToSaved = () => {
    release();
    rev.current++;
    update((x) => ({ ...x, job: { phase: 'idle' } }));
    setRoutePreview(null);
  };

  const save: PreviewController['save'] = async ({ title, confirmDuplicate }) => {
    if (!displayed || !run) throw new Error('no preview is displayed');
    const id = displayed.detail.id;
    try {
      const saved = await api.savePreview(id, { sourceRun: run.id, ...(title?.trim() ? { title: title.trim() } : {}), ...(confirmDuplicate ? { confirmDuplicate } : {}) });
      const fresh = await api.preview(id).catch(() => null);
      if (fresh)
        update((x) => {
          const had = x.details[id];
          if (!had) return x;
          const current = had.detail.preview.current; // keep the last currency check (this read did not repeat it)
          return { ...x, details: { ...x.details, [id]: { ...had, detail: { ...fresh, preview: { ...fresh.preview, ...(current ? { current } : {}) } } } } };
        });
      onSaved(saved.id);
      return { runId: saved.id };
    } catch (e) {
      if (e instanceof ApiError && e.status === 409 && /^Already saved/.test(e.message)) return { duplicates: e.details };
      throw e;
    }
  };

  return {
    open: s.open,
    setOpen: (open) => update((x) => ({ ...x, open, wanted: x.wanted || open })),
    capability,
    capabilityError,
    spec,
    draft,
    window,
    state,
    setParam,
    setWindow,
    displayed,
    loading,
    status,
    progress: s.job.phase === 'running' ? s.job.progress : null,
    error: s.job.phase === 'error' ? s.job.message : null,
    notice: s.notice,
    dismissNotice: () => update((x) => ({ ...x, notice: null })),
    disabledReason,
    submit,
    resetToDisplayed,
    resetToSaved,
    canResetToSaved: Boolean(savedKey && state && state.key !== savedKey),
    returnToSaved,
    upgrade: s.upgrade,
    startUpgrade: () => update((x) => ({ ...x, upgrade: true, draft: null })),
    save
  };
}

/** Keeps the 12 most recent loaded previews of the page (Back/Forward between them stays instant). */
function trim(d: Record<string, Displayed>): Record<string, Displayed> {
  const keys = Object.keys(d);
  return keys.length < 12 ? d : Object.fromEntries(keys.slice(keys.length - 11).map((k) => [k, d[k]!]));
}
