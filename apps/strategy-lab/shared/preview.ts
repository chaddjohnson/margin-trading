// Interactive Preview: the canonical form of ONE configuration (shared by the browser and the server) and the API's
// response shapes. A preview executes exactly the EFFECTIVE configuration (shared/params.ts effectiveParams): inactive
// values a user typed stay in the browser's draft, never in the request, so two drafts that execute identically are
// one preview (one cache identity) and a disabled field can never block a valid submission. Pure (no I/O).

import type { LabRunRequest, ParamValue, Resolution, RunDetail, StrategySpec } from './contract.ts';
import { effectiveParams } from './params.ts';

/** Canonical JSON: object keys sorted at every depth, arrays in order, numbers in JavaScript's shortest form. */
export function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== 'object') {
    if (typeof value === 'number' && !Number.isFinite(value)) throw new Error('canonicalJson: non-finite number');
    return JSON.stringify(value) ?? 'null';
  }
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  const entries = Object.entries(value as Record<string, unknown>)
    .filter(([, v]) => v !== undefined)
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
  return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${canonicalJson(v)}`).join(',')}}`;
}

/** What a preview executes: one strategy version, its effective parameters, the symbols (in order), window, bars. */
export interface PreviewConfig {
  strategyKey: string;
  strategyVersion: string;
  params: Record<string, ParamValue>;
  symbols: string[];
  from: string;
  to: string;
  resolution: Resolution;
}

/** The canonical configuration of a request: the effective parameters only, keys sorted; nothing else carried. */
export function canonicalPreviewConfig(spec: Pick<StrategySpec, 'params'>, req: Pick<LabRunRequest, keyof PreviewConfig>): PreviewConfig {
  const effective = effectiveParams(spec, req.params);
  return {
    strategyKey: req.strategyKey,
    strategyVersion: req.strategyVersion,
    params: Object.fromEntries(Object.entries(effective).sort(([a], [b]) => (a < b ? -1 : 1))),
    symbols: [...req.symbols],
    from: req.from,
    to: req.to,
    resolution: req.resolution
  };
}

/** One string per distinct execution configuration (the browser's "is this what is displayed?" comparison). */
export const previewConfigKey = (c: PreviewConfig) => canonicalJson(c);

// ----- API shapes -----

/** GET /api/runs/:id/preview — whether this saved run's configuration can be previewed here, and its seed. */
export interface PreviewCapability {
  runId: string;
  previewable: boolean;
  /** Why not (shown verbatim), or a note on what a preview of this run is. */
  reason: string;
  strategy: { key: string; version: string; title: string; kind: string };
  /** The request the panel starts from (the run's own stored request, drafts included). */
  seed: (PreviewConfig & { params: Record<string, ParamValue> }) | null;
  /** A legacy version's run: the current version it can be previewed as, explicitly (never invisibly). */
  upgrade: { version: string; seed: PreviewConfig; note: string } | null;
  /** Differences between the run's recorded execution and this checkout (a preview is then not a reproduction). */
  drift: { implementation: string[]; data: string[]; checked: boolean };
}

export type PreviewState = 'queued' | 'running' | 'completed' | 'failed' | 'cancelled';

/** POST /api/previews and GET /api/previews/tickets/:ticket. */
export interface PreviewTicketStatus {
  ticket: string;
  previewId: string;
  state: PreviewState;
  /** True only when a validated cache entry was reused for this request (never for a computation it waited on). */
  cacheHit: boolean;
  /** This request joined an execution already running for the same identity (computed fresh, not a cache hit). */
  coalesced: boolean;
  progress: { message: string; fraction: number | null } | null;
  error: string | null;
  timing: { identityMs: number; executionMs: number | null; waitedMs: number };
}

/** The preview facts a displayed preview carries (RunDetail.preview, kind `preview`). */
export interface PreviewInfo {
  id: string;
  key: string;
  config: PreviewConfig;
  executedAt: string;
  executionMs: number;
  implementationSha256: string;
  dataSha256: Record<string, string>;
  /** Saved runs made from this preview (Save as run), oldest first. */
  savedAs: string[];
}

export type PreviewDetail = RunDetail & { preview: PreviewInfo; request: PreviewConfig };
