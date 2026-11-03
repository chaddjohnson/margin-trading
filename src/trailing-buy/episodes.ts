// Analysis episodes (PROTOCOL.md section 10): a fixed, price-only segmentation of VGT's corrections, used
// to explain and attribute results. It is computed once from the bars and never feeds a trading decision.
import type { Bars, SimulationResult } from './engine.ts';
import { referenceHighs } from './indicators.ts';

export interface AnalysisEpisode {
  id: number;
  startIndex: number; // first close >= 10% below the previous 90 sessions' highest high
  endIndex: number; // first close >= 95% of the frozen reference high, or the last bar
  recovered: boolean;
  referenceHigh: number;
  peakIndex: number; // the session that set the reference high
  troughIndex: number; // lowest close of the episode
  depth: number; // 1 - lowest close / reference high
  descentSessions: number; // peak -> trough
  speed: 'fast' | 'gradual';
  depthClass: '10-15%' | '15-20%' | '20-25%' | '>=25%';
  shape: 'V' | 'slow';
  failedRallies: number;
}

export const episodeRules = {
  lookback: 90,
  threshold: 0.1,
  recoveryFraction: 0.95,
  fastDescentSessions: 25,
  vRecoverySessions: 40,
  rallyThreshold: 0.03
};

const depthClassOf = (depth: number): AnalysisEpisode['depthClass'] =>
  depth < 0.15 ? '10-15%' : depth < 0.2 ? '15-20%' : depth < 0.25 ? '20-25%' : '>=25%';

export const analysisEpisodes = (bars: Bars, firstIndex: number, lastIndex: number): AnalysisEpisode[] => {
  const refs = referenceHighs(bars.high, episodeRules.lookback);
  const episodes: AnalysisEpisode[] = [];
  let index = Math.max(1, firstIndex);

  while (index <= lastIndex) {
    const referenceHigh = refs[index]!;

    if (1 - bars.close[index]! / referenceHigh < episodeRules.threshold) {
      index++;
      continue;
    }

    const startIndex = index;
    let peakIndex = startIndex - 1;

    for (let back = startIndex - 1; back >= Math.max(0, startIndex - episodeRules.lookback); back--) {
      if (bars.high[back] === referenceHigh) {
        peakIndex = back;
        break;
      }
    }

    let troughIndex = startIndex;
    let endIndex = lastIndex;
    let recovered = false;

    for (let next = startIndex; next <= lastIndex; next++) {
      if (bars.close[next]! < bars.close[troughIndex]!) {
        troughIndex = next;
      }

      if (next > startIndex && bars.close[next]! >= episodeRules.recoveryFraction * referenceHigh) {
        endIndex = next;
        recovered = true;
        break;
      }
    }

    // Failed rallies: a close >= 3% above the running low that is followed by a new lower close before the
    // trough.
    let failedRallies = 0;
    let runningLow = bars.close[startIndex]!;
    let rallied = false;

    for (let next = startIndex + 1; next <= troughIndex; next++) {
      const value = bars.close[next]!;

      if (value < runningLow) {
        if (rallied) {
          failedRallies++;
        }

        runningLow = value;
        rallied = false;
      } else if (value >= runningLow * (1 + episodeRules.rallyThreshold)) {
        rallied = true;
      }
    }

    const depth = 1 - bars.close[troughIndex]! / referenceHigh;
    const descentSessions = troughIndex - peakIndex;

    episodes.push({
      id: episodes.length,
      startIndex,
      endIndex,
      recovered,
      referenceHigh,
      peakIndex,
      troughIndex,
      depth,
      descentSessions,
      speed: descentSessions <= episodeRules.fastDescentSessions ? 'fast' : 'gradual',
      depthClass: depthClassOf(depth),
      shape: recovered && endIndex - troughIndex <= episodeRules.vRecoverySessions ? 'V' : 'slow',
      failedRallies
    });
    index = endIndex + 1;
  }

  return episodes;
};

export interface Block {
  label: string; // 'calm' before the first episode, else the episode's start date
  episode?: AnalysisEpisode;
  first: number;
  last: number;
}

// Attribution blocks covering [firstIndex, lastIndex]: from each episode's start to the session before the
// next one's.
export const attributionBlocks = (
  bars: Bars,
  episodes: AnalysisEpisode[],
  firstIndex: number,
  lastIndex: number
): Block[] => {
  const inside = episodes.filter((episode) => episode.startIndex >= firstIndex && episode.startIndex <= lastIndex);
  const blocks: Block[] = [];

  if (inside.length === 0 || inside[0]!.startIndex > firstIndex) {
    blocks.push({ label: 'calm', first: firstIndex, last: (inside[0]?.startIndex ?? lastIndex + 1) - 1 });
  }

  inside.forEach((episode, position) => {
    blocks.push({
      label: bars.date[episode.startIndex]!,
      episode,
      first: episode.startIndex,
      last: (inside[position + 1]?.startIndex ?? lastIndex + 1) - 1
    });
  });

  return blocks;
};

// Mark-to-market P&L of a continuous run over one block.
export const blockPnl = (result: SimulationResult, block: Block) =>
  result.mtm[block.last]! - (block.first > result.startIndex ? result.mtm[block.first - 1]! : 0);

export interface EpisodeEntry {
  firstEntryIndex: number; // -1 when the run bought nothing during the episode
  firstEntryPrice: number;
  entries: number;
  profitOfEntries: number; // whole-trade P&L of trades entered during the episode (open ones marked)
}

export const entriesDuring = (result: SimulationResult, episode: AnalysisEpisode): EpisodeEntry => {
  const trades = result.trades.filter(
    (trade) => trade.entryIndex >= episode.startIndex && trade.entryIndex <= episode.endIndex
  );

  return {
    firstEntryIndex: trades[0]?.entryIndex ?? -1,
    firstEntryPrice: trades[0]?.entryPrice ?? NaN,
    entries: trades.length,
    profitOfEntries: trades.reduce((total, trade) => total + trade.profit, 0)
  };
};
