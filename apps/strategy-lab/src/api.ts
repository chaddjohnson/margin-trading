// Typed client for the Strategy Lab API. The access token (needed when the server is reachable over the VPN) is kept in
// localStorage as a per-browser convenience only; the server is the authority. A 401 asks the user for the token once.

import type {
  LabEvent,
  Note,
  RunDetail,
  RunRequest,
  RunSummary,
  StrategySpec,
  SymbolInfo,
  VariationSummary
} from '../shared/contract.ts';

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

export interface Meta {
  contractVersion: number;
  strategies: StrategySpec[];
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
    call<RunDetail & { request: RunRequest | null }>('GET', `/api/runs/${id}`, undefined, signal),
  createRun: (req: RunRequest) => call<RunDetail>('POST', '/api/runs', req),
  cancelRun: (id: string) => call<{ cancelled: boolean }>('POST', `/api/runs/${id}/cancel`),
  setRunTitle: (id: string, title: string) => call<RunDetail>('PATCH', `/api/runs/${id}`, { title }),
  bookmark: (type: 'run' | 'variation', id: string, on: boolean) =>
    call<{ bookmarked: boolean }>(
      on ? 'PUT' : 'DELETE',
      `/api/${type === 'run' ? 'runs' : 'variations'}/${id}/bookmark`
    ),
  events: (id: string, symbol: string, basis: string | null, signal?: AbortSignal) =>
    call<EventsResponse>('GET', `/api/runs/${id}/events${qs({ symbol, basis })}`, undefined, signal),
  prices: (id: string, symbol: string, range: { from?: number; to?: number; points?: number }, signal?: AbortSignal) =>
    call<PricesResponse>('GET', `/api/runs/${id}/prices${qs({ symbol, ...range })}`, undefined, signal),
  log: (id: string) => call<{ log: string }>('GET', `/api/runs/${id}/log`),
  notes: (targetType: 'run' | 'variation', targetId: string) =>
    call<Note[]>('GET', `/api/notes${qs({ targetType, targetId })}`),
  addNote: (targetType: 'run' | 'variation', targetId: string, body: string) =>
    call<Note>('POST', '/api/notes', { targetType, targetId, body }),
  updateNote: (id: number, body: string) => call<{ ok: true }>('PATCH', `/api/notes/${id}`, { body }),
  deleteNote: (id: number) => call<{ ok: true }>('DELETE', `/api/notes/${id}`)
};
