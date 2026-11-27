// The EFFECTIVE window of a run or an Interactive Preview (2026-11-27): the New York sessions the runner actually
// evaluated, read from its provenance (provenance.runner), beside the requested window stored with the run. A request
// whose end lies after the data (for example "All", which ends at the latest local session, or a date in the future)
// was evaluated only through the last session the data held; the displayed window must say so.
//
//   trading / entry-signal runners  provenance.runner.symbols[SYM].evaluation {firstDate, lastDate, sessions} and
//                                    .warmup {sessions, firstDate} (src/lib/evaluation.ts WindowReport)
//   the Study 8 pool runner          provenance.runner.window {first, last}
//
// Shared by the browser (run header, Parameters panel) and the server (export bundle). Imports nothing from Node.

export interface EffectiveWindow {
  /** The window stored with the run (as requested). */
  requested: { from: string; to: string };
  /** The sessions evaluated: the earliest first and the latest last session over the symbols (null: not recorded). */
  effective: { from: string; to: string } | null;
  /** Per symbol, when the runner recorded it (each symbol is an independent standalone backtest). */
  bySymbol: { symbol: string; from: string; to: string; sessions: number | null; warmupFrom: string | null; warmupSessions: number }[];
  /** The effective dates differ from the requested ones (the primary display then shows the effective dates). */
  differs: boolean;
}

type Obj = Record<string, unknown>;
const obj = (x: unknown): Obj | null => (x && typeof x === 'object' && !Array.isArray(x) ? (x as Obj) : null);
const date = (x: unknown): string | null => (typeof x === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(x) ? x : null);

export function effectiveWindowOf(run: { window: { from: string; to: string }; provenance: Record<string, unknown> | null | undefined }): EffectiveWindow {
  const requested = { from: run.window.from, to: run.window.to };
  const runner = obj(obj(run.provenance)?.runner);
  const bySymbol: EffectiveWindow['bySymbol'] = [];
  for (const [symbol, raw] of Object.entries(obj(runner?.symbols) ?? {})) {
    const ev = obj(obj(raw)?.evaluation);
    const from = date(ev?.firstDate);
    const to = date(ev?.lastDate);
    if (!from || !to) continue;
    const warm = obj(obj(raw)?.warmup);
    bySymbol.push({
      symbol,
      from,
      to,
      sessions: typeof ev?.sessions === 'number' ? ev.sessions : null,
      warmupFrom: date(warm?.firstDate),
      warmupSessions: typeof warm?.sessions === 'number' ? warm.sessions : 0
    });
  }
  let effective: EffectiveWindow['effective'] = null;
  if (bySymbol.length) effective = { from: bySymbol.map((s) => s.from).sort()[0]!, to: bySymbol.map((s) => s.to).sort().at(-1)! };
  else {
    const w = obj(runner?.window);
    const from = date(w?.first);
    const to = date(w?.last);
    if (from && to) effective = { from, to };
  }
  return { requested, effective, bySymbol, differs: effective !== null && (effective.from !== requested.from || effective.to !== requested.to) };
}

/** The window to display: the effective dates when recorded, else the requested ones. */
export const shownWindowOf = (e: EffectiveWindow) => e.effective ?? e.requested;
