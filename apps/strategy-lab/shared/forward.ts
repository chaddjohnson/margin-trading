// Forward-move statistics of entry events, computed in the browser from the loaded price series. Definitions:
//
//   horizon H        the H sessions after the event's bar (bars i+1 … i+H), close to close.
//   complete         the event has all H later sessions in the data. Only complete events enter the statistics; the
//                    rest are counted as censored (excluded, never treated as misses).
//   hit +x%          some close within the horizon is ≥ entry price × (1 + x). Time to target = sessions until the
//                    first such close.
//   MFE / MAE        the highest / lowest close within the horizon relative to the entry price (MAE ≤ 0 when the
//                    price dips below the entry). Intrabar highs and lows are ignored.
//   non-overlapping  events counted greedily in time order, skipping any event whose bar is within H sessions of the
//                    last counted one — a rough count of independent observations; overlapping windows share moves.
//   baseline         the same statistics for an entry at the close of every session in scope (unconditional timing).
//
// For the demo these describe synthetic prices only; they are not results of any strategy or of VGT.

export interface ForwardConfig {
  horizon: number;
  /** Upside targets as fractions, e.g. 0.05 for +5 %. */
  targets: number[];
}

export const DEFAULT_FORWARD: ForwardConfig = { horizon: 63, targets: [0.05, 0.1, 0.15] };

export interface Outcome {
  /** Sessions to each target, or null if not reached within the horizon. */
  sessionsToTarget: (number | null)[];
  mfe: number;
  mae: number;
}

export interface ForwardSummary {
  n: number;
  complete: number;
  censored: number;
  nonOverlapping: number;
  hitRate: (number | null)[];
  hits: number[];
  medianSessionsToTarget: (number | null)[];
  medianMfe: number | null;
  medianMae: number | null;
  /** 10th percentile of MAE: the adverse move exceeded by the worst tenth of complete events. */
  p10Mae: number | null;
}

/** Outcome of an entry at `price` on bar `barIndex`, or null when fewer than `horizon` later bars exist. */
export function outcomeAt(
  closes: readonly number[],
  barIndex: number,
  price: number,
  cfg: ForwardConfig
): Outcome | null {
  if (barIndex + cfg.horizon > closes.length - 1) return null;
  const sessionsToTarget: (number | null)[] = cfg.targets.map(() => null);
  let hi = -Infinity;
  let lo = Infinity;
  for (let k = 1; k <= cfg.horizon; k++) {
    const r = (closes[barIndex + k] as number) / price - 1;
    if (r > hi) hi = r;
    if (r < lo) lo = r;
    cfg.targets.forEach((x, j) => {
      if (sessionsToTarget[j] === null && r >= x - 1e-12) sessionsToTarget[j] = k;
    });
  }
  return { sessionsToTarget, mfe: hi, mae: lo };
}

/** Linear-interpolation quantile (R type 7) of an unsorted list. */
export function quantile(values: readonly number[], q: number): number | null {
  if (values.length === 0) return null;
  const s = [...values].sort((a, b) => a - b);
  const pos = (s.length - 1) * q;
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  return (s[lo] as number) + ((s[hi] as number) - (s[lo] as number)) * (pos - lo);
}

export function summarize(
  entries: readonly { barIndex: number; price: number }[],
  closes: readonly number[],
  cfg: ForwardConfig = DEFAULT_FORWARD
): ForwardSummary {
  const outcomes: Outcome[] = [];
  let lastCounted = -Infinity;
  let nonOverlapping = 0;
  const sorted = [...entries].sort((a, b) => a.barIndex - b.barIndex);
  for (const e of sorted) {
    const o = outcomeAt(closes, e.barIndex, e.price, cfg);
    if (!o) continue;
    outcomes.push(o);
    if (e.barIndex - lastCounted >= cfg.horizon) {
      nonOverlapping++;
      lastCounted = e.barIndex;
    }
  }
  const complete = outcomes.length;
  const hits = cfg.targets.map((_, j) => outcomes.filter((o) => o.sessionsToTarget[j] !== null).length);
  return {
    n: entries.length,
    complete,
    censored: entries.length - complete,
    nonOverlapping,
    hits,
    hitRate: hits.map((h) => (complete ? h / complete : null)),
    medianSessionsToTarget: cfg.targets.map((_, j) =>
      quantile(
        outcomes.flatMap((o) => (o.sessionsToTarget[j] === null ? [] : [o.sessionsToTarget[j] as number])),
        0.5
      )
    ),
    medianMfe: quantile(
      outcomes.map((o) => o.mfe),
      0.5
    ),
    medianMae: quantile(
      outcomes.map((o) => o.mae),
      0.5
    ),
    p10Mae: quantile(
      outcomes.map((o) => o.mae),
      0.1
    )
  };
}

/** Baseline: an entry at the close of every bar in [first, last]. */
export function baselineSummary(
  closes: readonly number[],
  first: number,
  last: number,
  cfg: ForwardConfig = DEFAULT_FORWARD
): ForwardSummary {
  const entries: { barIndex: number; price: number }[] = [];
  for (let i = Math.max(first, 0); i <= Math.min(last, closes.length - 1); i++)
    entries.push({ barIndex: i, price: closes[i] as number });
  return summarize(entries, closes, cfg);
}
