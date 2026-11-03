// The opportunity catalog and capture attribution (PROTOCOL.md §7). Labels are retrospective and diagnostic only:
// the catalog is built from daily closes through the candidate's cutoff, after the fact, and never enters a trade
// decision (every run is the frozen engine, which reads only completed minutes).
//
//   catalogOf      zigzag pivots on daily closes (a peak is confirmed by a 10% fall from it, a trough by a 10% rise
//                  from it); each confirmed peak and its following trough is one decline episode, labelled by its own
//                  maximum depth (one label per episode: overlapping thresholds never multiply episodes); the rebound
//                  runs from the trough to the first close back at the peak (recovered), else to the next confirmed
//                  peak (partial), else to the cutoff (open); an episode joins the current family (one dip event)
//                  while its trough is within 126 sessions of the family's first trough, else it starts a new family.
//   phaseOf        each lot to the episode whose (peak, rebound end] contains its entry session (decline phase:
//                  (peak, trough]; rebound phase: (trough, rebound end]); a lot entered elsewhere is "outside".
//   capturesOf     per episode and run: ineligible (trough before arming) | captured (entries, net > 0) | entered,
//                  loss (entries, net ≤ 0) | in position (no entry; a lot entered before the peak was held into the
//                  decline) | armed, no entry | not armed (the deep condition — a completed minute closing X below the
//                  L-session reference high — never held on a flat session of the episode); and the stricter
//                  dip capture the flags use: dip entries (decline phase, or ≥ 50% of the episode's depth below its
//                  peak) whose net > 0.
//   independentOf  the number of families, among those given, whose anchor troughs are ≥ 252 sessions apart
//                  (greedy, chronological) — the independent-event count of F1 and the families axis.
import { computeReferenceHighs } from '../four-family/data.ts';
import type { Dataset } from '../four-family/data.ts';
import { episodes as settings } from './context.ts';
import type { CompactLot } from './run.ts';

export interface Pivot {
  kind: 'peak' | 'trough';
  index: number;
  confirmed: boolean;
}

// Zigzag pivots of a close series (indices into `closes`), confirmed only after a `reversal` move from the extreme.
export const zigzag = (closes: ArrayLike<number>, first: number, last: number, reversal = settings.reversal) => {
  const pivots: Pivot[] = [];
  let mode: 'init' | 'up' | 'down' = 'init';
  let high = closes[first]!;
  let highIndex = first;
  let low = closes[first]!;
  let lowIndex = first;

  for (let i = first + 1; i <= last; i++) {
    const close = closes[i]!;

    if (mode === 'init') {
      if (close > high) {
        high = close;
        highIndex = i;
      }

      if (close < low) {
        low = close;
        lowIndex = i;
      }

      if (close <= high * (1 - reversal)) {
        pivots.push({ kind: 'peak', index: highIndex, confirmed: true });
        mode = 'down';
        low = close;
        lowIndex = i;
      } else if (close >= low * (1 + reversal)) {
        pivots.push({ kind: 'trough', index: lowIndex, confirmed: true });
        mode = 'up';
        high = close;
        highIndex = i;
      }
    } else if (mode === 'up') {
      if (close > high) {
        high = close;
        highIndex = i;
      } else if (close <= high * (1 - reversal)) {
        pivots.push({ kind: 'peak', index: highIndex, confirmed: true });
        mode = 'down';
        low = close;
        lowIndex = i;
      }
    } else if (close < low) {
      low = close;
      lowIndex = i;
    } else if (close >= low * (1 + reversal)) {
      pivots.push({ kind: 'trough', index: lowIndex, confirmed: true });
      mode = 'up';
      high = close;
      highIndex = i;
    }
  }

  // A decline still in progress at the cutoff: its low so far is an unconfirmed trough.
  if (mode === 'down') {
    pivots.push({ kind: 'trough', index: lowIndex, confirmed: false });
  }

  return pivots;
};

export interface Episode {
  id: string; // <SYMBOL>-E<nn>
  symbol: string;
  family: string; // <SYMBOL>-F<nn>
  peakIndex: number;
  peakDate: string;
  peakClose: number;
  troughIndex: number;
  troughDate: string;
  troughClose: number;
  troughConfirmed: boolean;
  depth: number; // 1 − trough ÷ peak
  band: string; // '10-15' | '15-20' | '20-30' | '30+'
  major: boolean;
  endIndex: number; // the rebound end
  endDate: string;
  status: 'recovered' | 'partial' | 'open';
  reboundHighIndex: number;
  reboundHigh: number; // the highest close in (trough, end]
  rebound: number; // reboundHigh ÷ trough − 1
  recoveredShare: number; // (reboundHigh − trough) ÷ (peak − trough)
  declineSessions: number;
  reboundSessions: number;
  eligible: boolean; // the trough is on or after the arming date
  peakBeforeArming: boolean;
}

export const bandOf = (depth: number) => {
  const [a, b, c, d] = settings.bands;

  return depth >= d ? '30+' : depth >= c ? '20-30' : depth >= b ? '15-20' : depth >= a ? '10-15' : '<10';
};

export const catalogOf = (
  symbol: string,
  dates: readonly string[],
  closes: ArrayLike<number>,
  armingIndex: number,
  last = dates.length - 1
): Episode[] => {
  const pivots = zigzag(closes, 0, last);
  const result: Episode[] = [];

  pivots.forEach((pivot, position) => {
    if (pivot.kind !== 'peak') {
      return;
    }

    const trough = pivots[position + 1];

    if (!trough || trough.kind !== 'trough') {
      return;
    }

    const nextPeak = pivots.slice(position + 2).find((item) => item.kind === 'peak');
    const peakClose = closes[pivot.index]!;
    const troughClose = closes[trough.index]!;
    let recovery = -1;

    for (let i = trough.index + 1; i <= last; i++) {
      if (nextPeak && i > nextPeak.index) {
        break;
      }

      if (closes[i]! >= peakClose) {
        recovery = i;
        break;
      }
    }

    const endIndex = recovery >= 0 ? recovery : nextPeak ? nextPeak.index : last;
    const status: Episode['status'] = recovery >= 0 ? 'recovered' : nextPeak ? 'partial' : 'open';
    let reboundHigh = troughClose;
    let reboundHighIndex = trough.index;

    for (let i = trough.index + 1; i <= endIndex; i++) {
      if (closes[i]! > reboundHigh) {
        reboundHigh = closes[i]!;
        reboundHighIndex = i;
      }
    }

    const depth = 1 - troughClose / peakClose;

    result.push({
      id: `${symbol}-E${String(result.length + 1).padStart(2, '0')}`,
      symbol,
      family: '',
      peakIndex: pivot.index,
      peakDate: dates[pivot.index]!,
      peakClose,
      troughIndex: trough.index,
      troughDate: dates[trough.index]!,
      troughClose,
      troughConfirmed: trough.confirmed,
      depth,
      band: bandOf(depth),
      major: depth >= settings.major,
      endIndex,
      endDate: dates[endIndex]!,
      status,
      reboundHighIndex,
      reboundHigh,
      rebound: reboundHigh / troughClose - 1,
      recoveredShare: peakClose > troughClose ? (reboundHigh - troughClose) / (peakClose - troughClose) : 0,
      declineSessions: trough.index - pivot.index,
      reboundSessions: endIndex - trough.index,
      eligible: trough.index >= armingIndex,
      peakBeforeArming: pivot.index < armingIndex
    });
  });

  // Families (one dip event): an episode joins the current family while its trough falls within 126 sessions of the
  // family's first trough; otherwise it starts a new family. Anchored, not chained, so a family never spans years.
  let family = 0;
  let anchor = -Infinity;

  for (const episode of result) {
    if (episode.troughIndex - anchor >= settings.familyTroughWindow) {
      family++;
      anchor = episode.troughIndex;
    }

    episode.family = `${symbol}-F${String(family).padStart(2, '0')}`;
  }

  return result;
};

export interface Family {
  id: string;
  symbol: string;
  episodes: string[];
  firstPeakDate: string;
  lastEndDate: string;
  depth: number; // the deepest running-peak drawdown inside the family's span
  major: boolean;
  eligible: boolean; // any eligible episode
}

export const familiesOf = (catalog: readonly Episode[], closes: ArrayLike<number>): Family[] => {
  const ids = [...new Set(catalog.map((episode) => episode.family))];

  return ids.map((id) => {
    const members = catalog.filter((episode) => episode.family === id);
    const first = members[0]!;
    const last = members.at(-1)!;
    let peak = closes[first.peakIndex]!;
    let depth = 0;

    for (let i = first.peakIndex; i <= last.endIndex; i++) {
      peak = Math.max(peak, closes[i]!);
      depth = Math.max(depth, 1 - closes[i]! / peak);
    }

    return {
      id,
      symbol: first.symbol,
      episodes: members.map((episode) => episode.id),
      firstPeakDate: first.peakDate,
      lastEndDate: last.endDate,
      depth,
      major: members.some((episode) => episode.major),
      eligible: members.some((episode) => episode.eligible)
    };
  });
};

// ----- attribution -----

export type Phase = 'decline' | 'rebound' | 'outside';

export const phaseOf = (catalog: readonly Episode[], entryIndex: number): { episode: Episode | null; phase: Phase } => {
  for (const episode of catalog) {
    if (entryIndex > episode.peakIndex && entryIndex <= episode.troughIndex) {
      return { episode, phase: 'decline' };
    }

    if (entryIndex > episode.troughIndex && entryIndex <= episode.endIndex) {
      return { episode, phase: 'rebound' };
    }
  }

  return { episode: null, phase: 'outside' };
};

export type Outcome = 'ineligible' | 'captured' | 'entered, loss' | 'in position' | 'armed, no entry' | 'not armed';

// Sessions (indices) on which the deep arming condition holds for (X, L): a completed minute closing at least X below
// the L-session reference high (the engine's own reference highs), on or after arming and after L sessions.
export const deepConditionSessions = (ds: Dataset, x: number, lookback: number, armingIndex: number) => {
  const highs = computeReferenceHighs(ds, lookback);
  const sessions = new Uint8Array(ds.sessionCount);

  for (let s = Math.max(armingIndex, lookback); s < ds.sessionCount; s++) {
    if (1 - ds.sMinClose[s]! / highs[s]! >= x) {
      sessions[s] = 1;
    }
  }

  return sessions;
};

export interface EpisodeCapture {
  episode: string;
  family: string;
  eligible: boolean;
  outcome: Outcome;
  entries: number;
  declineEntries: number;
  deepEntries: number; // entries armed by the deep path …
  continuationEntries: number; // … or by the post-exit continuation path
  dipEntries: number; // entries in the decline phase or at ≥ 50% of the episode's depth below its peak
  dipNet: number;
  dipCaptured: boolean; // dip entries whose net > 0 (the stricter capture the flags use)
  net: number;
  interest: number;
  friction: number;
  firstEntryOffset: number | null; // sessions from the trough (negative: entered during the decline)
  firstEntryDepth: number | null; // 1 − first entry raw price ÷ peak close
  capturedShare: number | null; // Σ per-share (exit − entry) ÷ (rebound high − trough)
  worstMae: number | null;
  exposedAtPeak: boolean;
  lots: number[]; // lot ids
}

// A dip entry (PROTOCOL.md §7): entered in the decline phase, or at least `share` of the episode's depth below its
// peak — so a continuation re-entry high up the rebound is not credited as catching the dip.
export const isDipEntry = (episode: Episode, lot: Pick<CompactLot, 'entryIndex' | 'entryRawPrice'>, share = 0.5) =>
  lot.entryIndex <= episode.troughIndex || lot.entryRawPrice <= episode.peakClose * (1 - share * episode.depth);

export const capturesOf = (
  catalog: readonly Episode[],
  lots: readonly CompactLot[],
  condition: Uint8Array
): EpisodeCapture[] =>
  catalog.map((episode) => {
    const entered = lots.filter((lot) => lot.entryIndex > episode.peakIndex && lot.entryIndex <= episode.endIndex);
    const dips = entered.filter((lot) => isDipEntry(episode, lot));
    const dipNet = dips.reduce((total, lot) => total + lot.net, 0);
    const exposedAtPeak = lots.some(
      (lot) => lot.entryIndex <= episode.peakIndex && (lot.exitIndex < 0 || lot.exitIndex > episode.peakIndex)
    );
    let armable = false;

    for (let s = episode.peakIndex + 1; s <= episode.endIndex; s++) {
      const held = lots.some((lot) => lot.entryIndex <= s && (lot.exitIndex < 0 || lot.exitIndex >= s));

      if (condition[s] && !held) {
        armable = true;
        break;
      }
    }

    const net = entered.reduce((total, lot) => total + lot.net, 0);
    const outcome: Outcome = !episode.eligible
      ? 'ineligible'
      : entered.length > 0
        ? net > 0
          ? 'captured'
          : 'entered, loss'
        : exposedAtPeak
          ? 'in position'
          : armable
            ? 'armed, no entry'
            : 'not armed';
    const first = entered[0];
    const available = episode.reboundHigh - episode.troughClose;

    return {
      episode: episode.id,
      family: episode.family,
      eligible: episode.eligible,
      outcome,
      entries: entered.length,
      declineEntries: entered.filter((lot) => lot.entryIndex <= episode.troughIndex).length,
      deepEntries: entered.filter((lot) => lot.setup !== 'continuation').length,
      continuationEntries: entered.filter((lot) => lot.setup === 'continuation').length,
      dipEntries: dips.length,
      dipNet,
      dipCaptured: episode.eligible && dips.length > 0 && dipNet > 0,
      net,
      interest: entered.reduce((total, lot) => total + lot.interest, 0),
      friction: entered.reduce((total, lot) => total + lot.friction, 0),
      firstEntryOffset: first ? first.entryIndex - episode.troughIndex : null,
      firstEntryDepth: first ? 1 - first.entryRawPrice / episode.peakClose : null,
      capturedShare:
        entered.length > 0 && available > 0
          ? entered.reduce((total, lot) => total + (lot.exitRawPrice - lot.entryRawPrice), 0) / available
          : null,
      worstMae: entered.length > 0 ? Math.min(...entered.map((lot) => lot.maePercent)) : null,
      exposedAtPeak,
      lots: entered.map((lot) => lot.id)
    };
  });

// Family-level nets over eligible episodes only (an ineligible episode's lots never count toward its family).
export const familyNetOf = (captures: readonly EpisodeCapture[], family: string, dip = false) =>
  captures
    .filter((capture) => capture.family === family && capture.eligible)
    .reduce((total, capture) => total + (dip ? capture.dipNet : capture.net), 0);

// Share of eligible sessions (arming → last) inside any episode span (peak, rebound end] — a price-only diagnostic of
// how much of the timeline the catalog covers (PROTOCOL.md §7).
export const coverageOf = (catalog: readonly Episode[], armingIndex: number, last: number) => {
  let inside = 0;

  for (let s = armingIndex; s <= last; s++) {
    if (catalog.some((episode) => s > episode.peakIndex && s <= episode.endIndex)) {
      inside++;
    }
  }

  return last >= armingIndex ? inside / (last - armingIndex + 1) : 0;
};

// The independent-event count (PROTOCOL.md §7): greedily, in chronological order, a family counts when its anchor
// trough (its first episode's trough) is at least `gap` sessions after the last counted one.
export const independentOf = (anchors: readonly number[], gap = settings.independentGapSessions) => {
  let count = 0;
  let last = -Infinity;

  for (const anchor of [...anchors].sort((a, b) => a - b)) {
    if (anchor - last >= gap) {
      count++;
      last = anchor;
    }
  }

  return count;
};

// A family's anchor trough: its first episode's trough session.
export const anchorOf = (catalog: readonly Episode[], family: string) =>
  catalog.find((episode) => episode.family === family)!.troughIndex;
