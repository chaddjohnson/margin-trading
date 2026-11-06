// Typed client for the Strategy Lab API. The access token (needed when the server is reachable over the VPN) is kept in
// localStorage as a per-browser convenience only; the server is the authority. A 401 asks the user for the token once.

import type {
  LabEvent,
  Note,
  RunDetail,
  LabRunRequest,
  RunSummary,
  StrategySpec,
  SymbolInfo,
  VariationSummary
} from '../shared/contract.ts';
import { type CandlesResponse, validateCandles } from '../shared/candles.ts';
import type { ExecutionKind, PhenotypeRecord } from '../shared/phenotypes.ts';
import type { PreviewCapability, PreviewConfig, PreviewDetail, PreviewTicketStatus } from '../shared/preview.ts';

const TOKEN_KEY = 'strategy-lab-token';

export class ApiError extends Error {
  readonly status: number;
  readonly details: string[];

  constructor(status: number, message: string, details: string[] = []) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

let tokenListener: (() => void) | null = null;
export const onTokenRequired = (fn: () => void) => (tokenListener = fn);

export function getToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setToken(t: string | null) {
  try {
    if (t) localStorage.setItem(TOKEN_KEY, t);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* storage unavailable: the token lives for this page only */
  }
}

async function call<T>(method: string, path: string, body?: unknown, signal?: AbortSignal): Promise<T> {
  const headers: Record<string, string> = {};
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  const res = await fetch(path, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
    signal
  });
  const data = (await res.json().catch(() => ({}))) as { error?: string; details?: string[]; tokenRequired?: boolean };
  if (res.status === 401 && data.tokenRequired) tokenListener?.();
  if (!res.ok) throw new ApiError(res.status, data.error ?? `HTTP ${res.status}`, data.details ?? []);
  return data as T;
}

/** The server's report of a completed deletion (server/delete-run.ts). */
export interface DeleteRunResult {
  deleted: string;
  strategy: { key: string; version: string; title: string };
  symbols: string[];
  notesDeleted: number;
  bookmarkRemoved: boolean;
  variation: { id: string; otherRuns: number; kept: true };
  artifacts: { existed: boolean; purged: boolean; warning: string | null };
}

export interface Meta {
  contractVersion: number;
  strategies: StrategySpec[];
  /** Strategies a catalogue phenotype may run (the form strategies and the shared-slot pool). */
  phenotypeStrategies: StrategySpec[];
  registry: { key: string; version: string; title: string; launch: string; formerTitles: string[]; legacy: unknown }[];
  symbols: SymbolInfo[];
  experiments: { id: string; slug: string; title: string; description: string }[];
  partitions: Record<string, { start: string | null; end: string | null }>;
}

export interface EventsResponse {
  runId: string;
  symbol: string | null;
  events: LabEvent[];
  markerPrices: Record<string, number | null>;
  display: Record<string, number | null>;
  conversion: number;
  total: number;
}

export interface PricesResponse {
  runId: string;
  symbol: string;
  dataOrigin: 'real' | 'synthetic';
  basisDate: string | null;
  units: string;
  points: [number, number][];
  decimated: boolean;
  rawPoints: number;
  firstSession: string | null;
  lastSession: string | null;
}

export interface ListQuery {
  experiment?: string;
  q?: string;
  bookmarked?: boolean;
  variation?: string;
  limit?: number;
  offset?: number;
}

export interface PhenotypeCapability {
  runnable: boolean;
  runner?: string;
  reason: string;
  locked?: string[];
  fixedFrom?: string;
}

export interface PhenotypeView {
  id: string;
  key: string;
  name: string;
  studyRef: string;
  role: string | null;
  rank: number | null;
  strategy: { key: string; version: string };
  executionKind: ExecutionKind;
  runner: string | null;
  symbols: string[];
  resolution: string | null;
  record: PhenotypeRecord;
  recordSha256: string;
  import: { id: string; sourcePath: string; sourceSha256: string };
  createdAt: string;
  runCount: number;
  capability: PhenotypeCapability;
  runs?: RunSummary[];
}

export interface PhenotypeQuery {
  q?: string;
  study?: string;
  strategy?: string;
  symbol?: string;
  role?: string;
}

/** The API path of a run-shaped result: a saved run (R-…) or an Interactive Preview (PV-…, never a run). */
export const resultPath = (id: string) => (id.startsWith('PV-') ? `/api/previews/${id}` : `/api/runs/${id}`);

/** A result id as shown in tables and headings: a preview's 64-hex id is shortened (the full id is in its record). */
export const displayId = (id: string) => (id.startsWith('PV-') ? `${id.slice(0, 13)}…` : id);

/** Downloads the research bundle of a completed run or preview (authenticated fetch → a file the browser saves). */
async function downloadBundle(id: string, minuteMarks: boolean): Promise<{ filename: string; bytes: number }> {
  const headers: Record<string, string> = {};
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${resultPath(id)}/export${minuteMarks ? '?minute=1' : ''}`, { headers });
  if (!res.ok) {
    const data = (await res.json().catch(() => ({}))) as { error?: string; tokenRequired?: boolean };
    if (res.status === 401 && data.tokenRequired) tokenListener?.();
    throw new ApiError(res.status, data.error ?? `HTTP ${res.status}`);
  }
  const blob = await res.blob();
  const filename = /filename="([^"]+)"/.exec(res.headers.get('Content-Disposition') ?? '')?.[1] ?? `strategy-lab-${id}.zip`;
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
  return { filename, bytes: blob.size };
}

const qs = (o: Record<string, string | number | boolean | undefined | null>) => {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(o))
    if (v !== undefined && v !== null && v !== '' && v !== false) p.set(k, v === true ? '1' : String(v));
  const s = p.toString();
  return s ? `?${s}` : '';
};

export const api = {
  meta: () => call<Meta>('GET', '/api/meta'),
  runs: (q: ListQuery = {}) => call<RunSummary[]>('GET', `/api/runs${qs({ ...q })}`),
  variations: (q: ListQuery = {}) => call<VariationSummary[]>('GET', `/api/variations${qs({ ...q })}`),
  run: (id: string, signal?: AbortSignal) =>
    call<RunDetail & { request: LabRunRequest | null }>('GET', `/api/runs/${id}`, undefined, signal),
  createRun: (req: LabRunRequest) => call<RunDetail>('POST', '/api/runs', req),
  cancelRun: (id: string) => call<{ cancelled: boolean }>('POST', `/api/runs/${id}/cancel`),
  /** Deletes exactly this run; the body repeats its id (server/delete-run.ts). */
  deleteRun: (id: string) => call<DeleteRunResult>('DELETE', `/api/runs/${id}`, { confirm: id }),
  setRunTitle: (id: string, title: string) => call<RunDetail>('PATCH', `/api/runs/${id}`, { title }),
  bookmark: (type: 'run' | 'variation', id: string, on: boolean) =>
    call<{ bookmarked: boolean }>(
      on ? 'PUT' : 'DELETE',
      `/api/${type === 'run' ? 'runs' : 'variations'}/${id}/bookmark`
    ),
  events: (id: string, symbol: string, basis: string | null, signal?: AbortSignal) =>
    call<EventsResponse>('GET', `${resultPath(id)}/events${qs({ symbol, basis })}`, undefined, signal),
  prices: (id: string, symbol: string, range: { from?: number; to?: number; points?: number }, signal?: AbortSignal) =>
    call<PricesResponse>('GET', `${resultPath(id)}/prices${qs({ symbol, ...range })}`, undefined, signal),
  /** One symbol's daily OHLC candles (shared/candles.ts), validated before use: a malformed response is refused. */
  candles: async (id: string, symbol: string, signal?: AbortSignal) => {
    const r = await call<CandlesResponse>('GET', `${resultPath(id)}/candles${qs({ symbol })}`, undefined, signal);
    const errors = validateCandles(r);
    if (errors.length) throw new ApiError(500, `invalid daily candles: ${errors.slice(0, 3).join('; ')}`, errors);
    return r;
  },
  log: (id: string) => call<{ log: string }>('GET', `/api/runs/${id}/log`),
  notes: (targetType: 'run' | 'variation', targetId: string) =>
    call<Note[]>('GET', `/api/notes${qs({ targetType, targetId })}`),
  addNote: (targetType: 'run' | 'variation', targetId: string, body: string) =>
    call<Note>('POST', '/api/notes', { targetType, targetId, body }),
  updateNote: (id: number, body: string) => call<{ ok: true }>('PATCH', `/api/notes/${id}`, { body }),
  deleteNote: (id: number) => call<{ ok: true }>('DELETE', `/api/notes/${id}`),
  phenotypes: (q: PhenotypeQuery = {}) => call<PhenotypeView[]>('GET', `/api/phenotypes${qs({ ...q })}`),
  phenotype: (id: string, signal?: AbortSignal) => call<PhenotypeView>('GET', `/api/phenotypes/${id}`, undefined, signal),
  /** ONE run of ONE frozen phenotype. */
  runPhenotype: (id: string, body: Record<string, unknown>) => call<RunDetail>('POST', `/api/phenotypes/${id}/runs`, body),
  // Interactive Preview: ONE configuration per submission; nothing is saved unless savePreview is called.
  previewCapability: (runId: string, signal?: AbortSignal) =>
    call<PreviewCapability>('GET', `/api/runs/${runId}/preview`, undefined, signal),
  submitPreview: (request: PreviewConfig, sourceRun: string) =>
    call<PreviewTicketStatus>('POST', '/api/previews', { request, sourceRun }),
  previewTicket: (ticket: string, signal?: AbortSignal) =>
    call<PreviewTicketStatus>('GET', `/api/previews/tickets/${ticket}`, undefined, signal),
  cancelPreviewTicket: (ticket: string) => call<PreviewTicketStatus>('POST', `/api/previews/tickets/${ticket}/cancel`, {}),
  /** A preview's record; `current` also re-checks it against the current code and data (`preview.current`). */
  preview: (id: string, signal?: AbortSignal, current = false) =>
    call<PreviewDetail>('GET', `/api/previews/${id}${current ? '?current=1' : ''}`, undefined, signal),
  savePreview: (id: string, body: { title?: string; sourceRun: string; confirmDuplicate?: boolean }) =>
    call<RunDetail>('POST', `/api/previews/${id}/save`, body),
  compare: (a: string, b: string, signal?: AbortSignal) =>
    call<Comparison>('GET', `/api/compare${qs({ a, b })}`, undefined, signal),
  downloadBundle
};

export interface ComparedTrade {
  trade: string;
  origin: string;
  method: string | null;
  decision: string;
  entry: string;
  exit: string | null;
  exitReason: string;
  net: number;
  status: string;
}

export interface Comparison {
  a: { id: string; title: string; strategy: RunSummary['strategy']; continuation: string };
  b: { id: string; title: string; strategy: RunSummary['strategy']; continuation: string };
  comparable: boolean;
  mismatches: string[];
  verdict: string;
  control: string;
  nonAdditivity: string;
  perSymbol: Record<
    string,
    {
      metrics: { a: Record<string, number | null> | null; b: Record<string, number | null> | null; bMinusA: Record<string, number | null> | null };
      trades: {
        identical: number;
        shifted: { a: ComparedTrade; b: ComparedTrade }[];
        introduced: ComparedTrade[];
        suppressed: ComparedTrade[];
        byOriginB: Record<string, number>;
      };
      continuation: { a: Record<string, unknown> | null; b: Record<string, unknown> | null };
    }
  >;
}
