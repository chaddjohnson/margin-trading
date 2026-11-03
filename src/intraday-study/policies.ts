// Entry policies as per-session state machines (PROTOCOL.md §§4, 5, 7). A scan walks the session's
// completed minutes in time order and returns the first decision that its mechanism allows and the
// re-entry gate passes. Each decision uses only bars completed by then, and fills at the first observed
// trade at or after it, never inside the bar that produced it.
import type { MarketSession } from '#types';
import { type Fill, firstTradeFrom } from '../app/allIn.ts';
import { type Band, type Mechanism, type PolicySpec, bandOf, secondsPerMinute } from './constants.ts';
import { depthOf, finalDecision, isDip, sessionMinute } from './data.ts';

export interface EntryDecision {
  decisionTime: number;
  // The bar whose close is the decision price, and that price.
  barIndex: number;
  decisionPrice: number;
  depth: number;
  band: Band;
  mechanism: Mechanism['kind'];
  isFinalDecision: boolean;
  fill: Fill | undefined;
}

export interface ScanResult {
  entry: EntryDecision | undefined;
  // The first decision-time evidence of a setup: the first eligible qualifying minute (or, for CLOSE_1M,
  // a qualifying final decision), with its band; -1 when none.
  setupBarIndex: number;
  setupBand: Band | '';
  // Decisions the mechanism allowed but the re-entry gate blocked.
  blocked: number;
  eligibleBars: number;
}

// The re-entry gate at a decision price; true when an entry may proceed.
export type Gate = (decisionPrice: number) => boolean;

interface RunState {
  band: Band;
  trough: number;
  timer: number;
  count: number;
  first: boolean;
}

// Applies one bar to a run-like state and tells whether the mechanism fires on it. `dip` and the band are
// established by the caller.
const fires = (mechanism: Mechanism, state: RunState, close: number) => {
  switch (mechanism.kind) {
    case 'close':
      return false;
    case 'first':
      return true;
    case 'persist':
      return state.count >= mechanism.minutes;
    case 'stable':
      return state.timer >= mechanism.minutes;
    case 'rebound':
      return !state.first && close >= state.trough * (1 + mechanism.fraction);
    case 'stableRebound':
      return !state.first && state.timer >= mechanism.minutes && close >= state.trough * (1 + mechanism.fraction);
  }
};

const decide = (
  session: MarketSession,
  recentHigh: number,
  barIndex: number,
  decisionTime: number,
  mechanism: Mechanism['kind'],
  isFinalDecision: boolean
): EntryDecision => {
  const decisionPrice = session.bars[barIndex]!.close;
  const depth = depthOf(decisionPrice, recentHigh);

  return {
    decisionTime,
    barIndex,
    decisionPrice,
    depth,
    band: bandOf(depth),
    mechanism,
    isFinalDecision,
    fill: firstTradeFrom(session, decisionTime)
  };
};

export const scanEntry = (policy: PolicySpec, session: MarketSession, recentHigh: number, gate: Gate): ScanResult => {
  const final = finalDecision(session);
  const result: ScanResult = { entry: undefined, setupBarIndex: -1, setupBand: '', blocked: 0, eligibleBars: 0 };
  const finalDip = isDip(final.price, recentHigh);

  // The incumbent's single decision.
  const tryFinal = () => {
    if (!finalDip) {
      return;
    }

    if (result.setupBarIndex < 0) {
      result.setupBarIndex = final.barIndex;
      result.setupBand = bandOf(depthOf(final.price, recentHigh));
    }

    if (gate(final.price)) {
      result.entry = decide(session, recentHigh, final.barIndex, final.decisionTime, 'close', true);
    } else {
      result.blocked++;
    }
  };

  if (policy.earliestMinute === null) {
    tryFinal();

    return result;
  }

  const earliest = sessionMinute(session, policy.earliestMinute);
  const conditional = policy.byBand;
  let previousStart = NaN;
  // Unconditional episode (FIRST, PERSIST, STABLE, REBOUND) or the current band run (conditional).
  let episode: RunState | undefined;
  let persistCount = 0;

  for (const [barIndex, bar] of session.bars.entries()) {
    const completed = bar.time + secondsPerMinute;

    if (completed < earliest) {
      continue;
    }

    if (completed > final.decisionTime) {
      break;
    }

    result.eligibleBars++;

    const gap = !Number.isNaN(previousStart) && bar.time !== previousStart + secondsPerMinute;
    const dip = isDip(bar.close, recentHigh);
    const band = dip ? bandOf(depthOf(bar.close, recentHigh)) : undefined;

    previousStart = bar.time;

    if (band && result.setupBarIndex < 0) {
      result.setupBarIndex = barIndex;
      result.setupBand = band;
    }

    let mechanism: Mechanism;
    let fire: boolean;

    if (conditional) {
      // A band run: consecutive eligible qualifying minutes in one band. A new run starts afresh.
      if (!band) {
        episode = undefined;
        continue;
      }

      if (!episode || episode.band !== band) {
        episode = { band, trough: bar.low, timer: 0, count: 1, first: true };
      } else {
        episode.first = false;

        if (gap) {
          episode.timer = 0;
          episode.count = 0;
        }

        episode.count++;

        if (bar.low < episode.trough) {
          episode.trough = bar.low;
          episode.timer = 0;
        } else {
          episode.timer++;
        }
      }

      mechanism = conditional[band];
      fire = fires(mechanism, episode, bar.close);
    } else {
      mechanism = policy.mechanism!;

      switch (mechanism.kind) {
        case 'first':
          fire = dip;
          break;
        case 'persist':
          persistCount = dip ? (gap ? 1 : persistCount + 1) : 0;
          fire = persistCount >= mechanism.minutes;
          break;
        default:
          // STABLE and REBOUND: the episode starts at the first qualifying minute and lasts for the session.
          if (!episode) {
            if (!dip) {
              continue;
            }

            episode = { band: band!, trough: bar.low, timer: 0, count: 1, first: true };
          } else {
            episode.first = false;

            if (mechanism.kind === 'rebound') {
              episode.trough = Math.min(episode.trough, bar.low);
            } else {
              if (gap) {
                episode.timer = 0;
              }

              if (bar.low < episode.trough) {
                episode.trough = bar.low;
                episode.timer = 0;
              } else {
                episode.timer++;
              }
            }
          }

          fire = dip && fires(mechanism, episode, bar.close);
      }
    }

    if (!fire) {
      continue;
    }

    if (gate(bar.close)) {
      result.entry = decide(session, recentHigh, barIndex, completed, mechanism.kind, completed === final.decisionTime);

      return result;
    }

    result.blocked++;
  }

  // Conditional policies whose band at the final decision maps to CLOSE_1M decide there.
  if (conditional && finalDip && conditional[bandOf(depthOf(final.price, recentHigh))].kind === 'close') {
    tryFinal();
  }

  return result;
};
