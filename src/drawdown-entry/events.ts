// Drawdown events. Three levels, never mixed:
// - Episodes: non-overlapping corrections for primary inference. An episode starts at the first close
//   that is at least 10% below the strategy's reference high (the max high of the 90 previous sessions)
//   while no episode is active. That reference high is frozen as the episode peak P. The episode ends at
//   the first later close at or above P (full recovery); if none occurs before the outcome end it is
//   right-censored. Re-anchored signals inside an episode belong to it.
// - Candidates: the first 10% signal against each distinct reference-high bar. This is the unit the
//   strategy decides on; several can fall inside one episode (a long decline rolls its 90-session peak).
// - Signal sessions: every session with a 10% signal.
// Outcome labels look forward only for evaluation and are censored (null) when the forward window passes
// the outcome end without the threshold being reached.

import { labelHorizons, maeHorizons, severeThresholds } from './constants.ts';
import type { DailyBars } from './data.ts';
import type { ReferenceHighs, SimulationResult } from './engine.ts';
import type { Features } from './features.ts';

export type Label = boolean | null;

export const labelKey = (threshold: number, horizon: number) => `dd${Math.round(threshold * 100)}_h${horizon}`;

// Whether a close in [start, start + horizon] is at or below reference × (1 − threshold).
export const reachLabel = (
  close: ArrayLike<number>,
  start: number,
  reference: number,
  threshold: number,
  horizon: number,
  outcomeEnd: number
): Label => {
  const level = reference * (1 - threshold);
  const end = Math.min(start + horizon, outcomeEnd);

  for (let i = start; i <= end; i++) {
    if (close[i]! <= level) {
      return true;
    }
  }

  return start + horizon <= outcomeEnd ? false : null;
};

// Maximum adverse excursion from an entry at close[start]: the lowest low in (start, start + k] relative to
// the entry price (≤ 0), or null if the window is censored.
export const maeFromEntry = (bars: DailyBars, start: number, k: number, outcomeEnd: number, entryPrice?: number) => {
  if (start + k > outcomeEnd) {
    return null;
  }

  const price = entryPrice ?? bars.close[start]!;
  let lowest = Infinity;

  for (let i = start + 1; i <= start + k; i++) {
    lowest = Math.min(lowest, bars.low[i]!);
  }

  return Math.min(0, lowest / price - 1);
};

export const allLabels = (close: ArrayLike<number>, start: number, reference: number, outcomeEnd: number) => {
  const labels: Record<string, Label> = {};

  for (const threshold of severeThresholds) {
    for (const horizon of labelHorizons) {
      labels[labelKey(threshold, horizon)] = reachLabel(close, start, reference, threshold, horizon, outcomeEnd);
    }
  }

  return labels;
};

export const allMae = (bars: DailyBars, start: number, outcomeEnd: number) => {
  const mae: Record<string, number | null> = {};

  for (const k of maeHorizons) {
    mae[`mae${k}`] = maeFromEntry(bars, start, k, outcomeEnd);
  }

  return mae;
};

export interface Episode {
  id: number;
  peakIndex: number;
  peakDate: string;
  peakHigh: number; // P, the frozen reference high
  signalIndex: number;
  signalDate: string;
  signalClose: number;
  signalDrawdown: number;
  velocitySessions: number; // peak bar → first signal
  velocityCalendarDays: number;
  troughIndex: number;
  troughDate: string;
  troughClose: number;
  maxDrawdownClose: number; // 1 − trough close / P
  maxDrawdownLow: number; // 1 − lowest low / P over the same span
  sessionsSignalToTrough: number;
  sessionsPeakToTrough: number;
  recovered: boolean;
  recoveryIndex: number; // full recovery (close ≥ P), or −1
  recoveryDate: string;
  sessionsSignalToRecovery: number | null;
  retrace38Index: number; // first close after the trough recovering 38% of P − trough (ex post), or −1
  sessionsTroughToRetrace38: number | null;
  maxRallyBeforeTrough: number; // largest close-to-close rebound off the running low before the trough
  endIndex: number; // recovery session, or the outcome end when censored
  censored: boolean;
  labels: Record<string, Label>;
  mae: Record<string, number | null>;
}

export interface Candidate {
  id: number;
  signalIndex: number;
  signalDate: string;
  peakIndex: number;
  peakDate: string;
  refHigh: number;
  close: number;
  drawdown: number;
  velocity: number;
  episodeId: number; // the episode containing it, or −1
  isEpisodeStart: boolean;
  labels: Record<string, Label>;
  mae: Record<string, number | null>;
  furtherDrop40: number | null; // lowest close in (s, s+40] relative to the signal close (≤ 0)
}

export interface SignalRow {
  index: number;
  date: string;
  refHigh: number;
  drawdown: number;
  episodeId: number;
  candidateId: number;
  labels: Record<string, Label>;
}

const formatDate = (bars: DailyBars, index: number) => bars.date[index] ?? '';

export interface EventSet {
  episodes: Episode[];
  candidates: Candidate[];
  signals: SignalRow[];
  episodeOf: Int32Array; // per session: the episode whose window [signalIndex, endIndex] contains it, or −1
}

export const buildEvents = (
  bars: DailyBars,
  refs: ReferenceHighs,
  features: Features,
  analysisStart: number,
  analysisEnd: number,
  outcomeEnd: number,
  dip = 0.1
): EventSet => {
  const { close, low } = bars;
  const episodes: Episode[] = [];
  const episodeOf = new Int32Array(close.length).fill(-1);
  let active: { peak: number; P: number; signal: number } | undefined;

  const closeEpisode = (endIndex: number, recovered: boolean) => {
    const { peak, P, signal } = active!;
    let troughIndex = signal;
    let lowestLow = Infinity;
    let runningLow = Infinity;
    let maxRally = 0;

    for (let i = signal; i <= endIndex; i++) {
      if (close[i]! < close[troughIndex]!) {
        troughIndex = i;
      }

      lowestLow = Math.min(lowestLow, low[i]!);
    }

    for (let i = signal; i <= troughIndex; i++) {
      runningLow = Math.min(runningLow, close[i]!);
      maxRally = Math.max(maxRally, close[i]! / runningLow - 1);
    }

    const troughClose = close[troughIndex]!;
    const retraceLevel = troughClose + 0.38 * (P - troughClose);
    let retrace38Index = -1;

    for (let i = troughIndex + 1; i <= outcomeEnd; i++) {
      if (close[i]! >= retraceLevel) {
        retrace38Index = i;
        break;
      }
    }

    const id = episodes.length;

    for (let i = signal; i <= endIndex; i++) {
      episodeOf[i] = id;
    }

    episodes.push({
      id,
      peakIndex: peak,
      peakDate: formatDate(bars, peak),
      peakHigh: P,
      signalIndex: signal,
      signalDate: formatDate(bars, signal),
      signalClose: close[signal]!,
      signalDrawdown: 1 - close[signal]! / P,
      velocitySessions: signal - peak,
      velocityCalendarDays: Math.round((bars.time[signal]! - bars.time[peak]!) / 86400),
      troughIndex,
      troughDate: formatDate(bars, troughIndex),
      troughClose,
      maxDrawdownClose: 1 - troughClose / P,
      maxDrawdownLow: 1 - lowestLow / P,
      sessionsSignalToTrough: troughIndex - signal,
      sessionsPeakToTrough: troughIndex - peak,
      recovered,
      recoveryIndex: recovered ? endIndex : -1,
      recoveryDate: recovered ? formatDate(bars, endIndex) : '',
      sessionsSignalToRecovery: recovered ? endIndex - signal : null,
      retrace38Index,
      sessionsTroughToRetrace38: retrace38Index === -1 ? null : retrace38Index - troughIndex,
      maxRallyBeforeTrough: maxRally,
      endIndex,
      censored: !recovered,
      labels: allLabels(close, signal, P, outcomeEnd),
      mae: allMae(bars, signal, outcomeEnd)
    });
    active = undefined;
  };

  for (let t = analysisStart; t <= outcomeEnd; t++) {
    const dd = 1 - close[t]! / refs.value[t]!;

    if (active) {
      if (close[t]! >= active.P) {
        closeEpisode(t, true);
      }

      continue;
    }

    if (t <= analysisEnd && dd >= dip) {
      active = { peak: refs.peakIndex[t]!, P: refs.value[t]!, signal: t };
    }
  }

  if (active) {
    closeEpisode(outcomeEnd, false);
  }

  const candidates: Candidate[] = [];
  const signals: SignalRow[] = [];
  const candidateOfPeak = new Map<number, number>();

  for (let t = analysisStart; t <= analysisEnd; t++) {
    const dd = 1 - close[t]! / refs.value[t]!;

    if (dd < dip) {
      continue;
    }

    const peak = refs.peakIndex[t]!;

    // A candidate is the first signal against its bar; one whose first signal predates the analysis
    // start is not a new candidate.
    if (!candidateOfPeak.has(peak) && features.candAge![t] === 0) {
      let lowest = Infinity;

      for (let i = t + 1; i <= Math.min(t + 40, outcomeEnd); i++) {
        lowest = Math.min(lowest, close[i]!);
      }

      candidateOfPeak.set(peak, candidates.length);
      candidates.push({
        id: candidates.length,
        signalIndex: t,
        signalDate: formatDate(bars, t),
        peakIndex: peak,
        peakDate: formatDate(bars, peak),
        refHigh: refs.value[t]!,
        close: close[t]!,
        drawdown: dd,
        velocity: t - peak,
        episodeId: episodeOf[t]!,
        isEpisodeStart: episodes.some((episode) => episode.signalIndex === t),
        labels: allLabels(close, t, refs.value[t]!, outcomeEnd),
        mae: allMae(bars, t, outcomeEnd),
        furtherDrop40: t + 40 <= outcomeEnd ? Math.min(0, lowest / close[t]! - 1) : null
      });
    }

    signals.push({
      index: t,
      date: formatDate(bars, t),
      refHigh: refs.value[t]!,
      drawdown: dd,
      episodeId: episodeOf[t]!,
      candidateId: candidateOfPeak.get(peak) ?? -1,
      labels: allLabels(close, t, refs.value[t]!, outcomeEnd)
    });
  }

  return { episodes, candidates, signals, episodeOf };
};

export const velocityBin = (sessions: number) => (sessions <= 15 ? '≤15' : sessions <= 40 ? '16–40' : '>40');

// What the unchanged baseline did inside an episode window [signalIndex, endIndex].
export const baselineInEpisode = (episode: Episode, result: SimulationResult) => {
  const trades = result.trades.filter(
    (trade) => trade.signalIndex >= episode.signalIndex && trade.signalIndex <= episode.endIndex
  );
  const before = episode.signalIndex > 0 ? result.mtm[episode.signalIndex - 1]! : 0;
  let worst = 0;

  for (let i = episode.signalIndex; i <= Math.min(episode.endIndex, result.endIndex); i++) {
    worst = Math.min(worst, result.mtm[i]! - before);
  }

  const firstTrade = trades[0];

  return {
    entries: trades.length,
    firstEntryDate: firstTrade ? new Date(firstTrade.entryTime * 1000).toISOString().slice(0, 10) : '',
    firstEntryDrawdown: firstTrade ? 1 - firstTrade.entryPrice / episode.peakHigh : null,
    profit: trades.reduce((sum, trade) => sum + trade.profit, 0),
    interest: trades.reduce((sum, trade) => sum + trade.interest, 0),
    worstMtmChange: worst,
    restrictions: trades.filter((trade) => trade.restrictedAfter).length,
    winners: trades.filter((trade) => trade.profit > 0).length,
    trades
  };
};

// Sessions from the first −10% close to the first close at least `threshold` below the episode peak, within
// the episode window, or null if never reached there.
export const sessionsToThreshold = (bars: DailyBars, episode: Episode, threshold: number) => {
  for (let i = episode.signalIndex; i <= episode.endIndex; i++) {
    if (bars.close[i]! <= episode.peakHigh * (1 - threshold)) {
      return i - episode.signalIndex;
    }
  }

  return null;
};

export const thresholdTimingRows = (bars: DailyBars, episodes: Episode[]) =>
  episodes.map((episode) => {
    const cells = [0.15, 0.2, 0.25, 0.3].map((threshold) => sessionsToThreshold(bars, episode, threshold));
    const to20 = cells[1];

    return [
      episode.signalDate,
      ...cells.map((value) => value ?? '–'),
      to20 === null || to20 === undefined
        ? '–'
        : Math.round((bars.time[episode.signalIndex + to20]! - bars.time[episode.signalIndex]!) / 86400),
      episode.censored ? 'censored' : 'recovered'
    ];
  });
