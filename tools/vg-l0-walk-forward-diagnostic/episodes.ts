// Drawdown episodes of a marked-net path (shared by gates.ts and core.ts).
// Drawdown episodes of a path: from a strict new high to the first value at or above it again (or the end); depth =
// the high − the lowest value inside. The largest episode's depth is the path's maximum drawdown.
export const episodesOf = (t: readonly number[], v: readonly number[], t0: number, v0 = 0) => {
  const out: { peakT: number; peak: number; troughT: number; trough: number; depth: number; recoveryT: number }[] = [];
  let peak = v0;
  let peakT = t0;
  let cur: (typeof out)[number] | null = null;

  for (let i = 0; i < t.length; i++) {
    const x = v[i]!;

    if (x > peak) {
      if (cur) {
        cur.recoveryT = t[i]!;
        out.push(cur);
        cur = null;
      }
      peak = x;
      peakT = t[i]!;
      continue;
    }
    if (x < peak) {
      if (!cur) cur = { peakT, peak, troughT: t[i]!, trough: x, depth: peak - x, recoveryT: Number.NaN };
      else if (x < cur.trough) {
        cur.trough = x;
        cur.troughT = t[i]!;
        cur.depth = peak - x;
      }
    }
  }
  if (cur) out.push(cur);
  return out.sort((a, b) => b.depth - a.depth);
};
