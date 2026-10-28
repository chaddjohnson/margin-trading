// The shared slot's rule restated on virtual trades (PROTOCOL.md §5.2, §6.5), and the first-order classification.
//
// Under the frozen shadow policy each book takes every signal it produces (its virtual trades are its standalone
// trades); in fixed mode the allocator grants a decision iff no lot and no pending order holds the one slot. In the
// frozen engine's bar order (src/portfolio-aware-d1/nbook/engine.ts: at each bar start T, exits (step 3), fills
// (step 5), then decisions stamped T + 60 s in alphabetical order (step 6); at the close, exits and fills), a lot
// exiting at time E is still held for every decision stamped ≤ E and gone for every decision stamped > E; a granted
// decision reserves the slot from its own decision until its fill, and the lot holds it until its exit. Hence, with
// decisions ordered by (decision time, symbol): a decision is granted iff its time is later than the exit time of the
// last granted trade (+∞ while that trade is pending or open at the data end). `replayGate` applies this rule; it is
// checked against the engine's own funded set for every baseline and scenario (fail closed) and is never a substitute
// for the engine.
export interface GateTrade {
  key: string; // `${symbol}@${decisionTime}`
  symbol: string;
  decisionTime: number;
  fillTime: number; // NaN if never filled
  exitTime: number; // +Infinity if open (or pending) at the data end
  net: number; // liquidation-equivalent net at the data end for an open trade
}

export const keyOf = (symbol: string, decisionTime: number) => `${symbol}@${decisionTime}`;

const byDecision = (a: GateTrade, b: GateTrade) =>
  a.decisionTime - b.decisionTime || (a.symbol < b.symbol ? -1 : a.symbol > b.symbol ? 1 : 0);

export interface GateOutcome {
  trade: GateTrade;
  granted: boolean;
  holder?: string; // the granted trade holding the slot at a refusal
}

export const replayGate = (trades: readonly GateTrade[]): GateOutcome[] => {
  const ordered = [...trades].sort(byDecision);
  const outcomes: GateOutcome[] = [];
  let last: GateTrade | undefined;

  for (const trade of ordered) {
    if (!last || trade.decisionTime > last.exitTime) {
      outcomes.push({ trade, granted: true });
      last = trade;
    } else {
      outcomes.push({ trade, granted: false, holder: last.key });
    }
  }

  return outcomes;
};

export type FirstOrderClass = 'busy' | 'idle-clean' | 'idle-displacing';

export interface Classified {
  trade: GateTrade;
  class: FirstOrderClass;
  holder?: GateTrade; // busy: the baseline trade holding the slot
  holderState?: 'reserved' | 'held by lot';
  displaced: GateTrade[]; // idle-displacing: the baseline funded trades it would block
}

// Each candidate trade against the UNCHANGED baseline's funded trades, independently of the candidate's other trades.
export const classify = (candidate: readonly GateTrade[], funded: readonly GateTrade[]): Classified[] =>
  candidate.map((c) => {
    const holder = funded.find(
      (b) =>
        (b.decisionTime < c.decisionTime && c.decisionTime <= b.exitTime) ||
        (b.decisionTime === c.decisionTime && b.symbol < c.symbol)
    );

    if (holder) {
      const reserved = !(holder.fillTime < c.decisionTime); // D_c ≤ F_b, or never filled

      return { trade: c, class: 'busy', holder, holderState: reserved ? 'reserved' : 'held by lot', displaced: [] };
    }

    const displaced = funded.filter(
      (b) =>
        (c.decisionTime < b.decisionTime && b.decisionTime <= c.exitTime) ||
        (b.decisionTime === c.decisionTime && c.symbol < b.symbol)
    );

    return { trade: c, class: displaced.length > 0 ? 'idle-displacing' : 'idle-clean', displaced };
  });

// First-order Δ: the idle trades' net less the distinct displaced baseline trades' net. Not a counterfactual.
export const firstOrderOf = (classified: readonly Classified[]) => {
  const idle = classified.filter((item) => item.class !== 'busy');
  const displaced = new Map<string, GateTrade>();

  for (const item of idle) {
    for (const b of item.displaced) {
      displaced.set(b.key, b);
    }
  }

  const idleNet = idle.reduce((total, item) => total + item.trade.net, 0);
  const displacedNet = [...displaced.values()].reduce((total, b) => total + b.net, 0);

  return { idleNet, displacedNet, delta: idleNet - displacedNet, displacedKeys: [...displaced.keys()].sort() };
};
