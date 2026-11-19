// Chronological evaluation (PROTOCOL.md §7): a frozen cutoff selection run on the following slice (one continuous run
// from 2016 through the slice end; positions, orders, indicators and interest carry across the boundary), and the
// predeclared sequential policies over the slices 2020–21 | 2022–23 | 2024.
import { Tracker } from '../multi-etf-allocator/engine.ts';
import { cutoffOf, rules } from './context.ts';
import type { Detail } from './engine.ts';
import { familyConfigs } from './fitness.ts';
import type { Lab } from './pool.ts';
import { familySet, sliceNetOf } from './qualify.ts';
import { quantile } from '../study5-gdx-b5-three-etf/grid.ts';
import { type Config, configId, withCost } from './space.ts';

const cents = (x: number) => Math.round(x * 100) / 100;

export const sliceEvaluation = async (lab: Lab, cutoffKey: string, c: Config) => {
  const cut = cutoffOf(cutoffKey);
  const fromYear = Number(cut.evalFirst.slice(0, 4));
  const d = await lab.detail<Detail>(c, { boundary: cut.boundary });
  const b = d.boundary as any;
  const s10 = await lab.point(withCost(c, 10));
  const s20 = await lab.point(withCost(c, 20));
  const nbPts = familyConfigs(c, familySet([cutoffKey], 'confirm', 1, rules.confirmN));
  const nb = await lab.points(nbPts.map((p) => p.config));
  const nbSlice = nb.filter((r) => !r.error).map((r) => sliceNetOf(r, fromYear));
  const newTrades = d.trades.filter((t) => b.newEntries.includes(t.n));

  return {
    id: configId(c),
    slice: {
      from: cut.evalFirst,
      to: cut.evalLast,
      sessions: d.daily.length - 1 - d.daily.findIndex((x) => x.date === cut.boundary)
    },
    boundaryEquity: b.equity,
    sliceNet: b.validationNet,
    sliceDrawdown: b.validationDrawdown,
    runDrawdown: d.minuteDrawdown,
    developmentDrawdown: b.developmentDrawdown,
    carriedIn: b.carriedIn,
    newEntries: newTrades.map((t) => ({
      entry: t.entryDate,
      exit: t.exitDate,
      net: t.net,
      status: t.status,
      reason: t.exitReason
    })),
    newWins: newTrades.filter((t) => t.status === 'closed' && t.net > 0).length,
    newLosses: newTrades.filter((t) => t.status === 'closed' && t.net < 0).length,
    newLossSum: cents(newTrades.filter((t) => t.status === 'closed' && t.net < 0).reduce((a, t) => a + t.net, 0)),
    openAtEnd: d.trades.filter((t) => t.status === 'open').map((t) => ({ entry: t.entryDate, net: t.net })),
    stress: { '10bps': cents(sliceNetOf(s10, fromYear)), '20bps': cents(sliceNetOf(s20, fromYear)) },
    neighbourhood: {
      n: nbSlice.length,
      median: quantile(nbSlice, 0.5),
      p10: quantile(nbSlice, 0.1),
      positiveShare: nbSlice.filter((v) => v > 0).length / Math.max(1, nbSlice.length)
    },
    record: d.record
  };
};

export type SliceEvaluation = Awaited<ReturnType<typeof sliceEvaluation>>;

export interface Marks {
  boundaryEquity: number;
  boundaryClose: number;
  t: number[];
  v: number[];
  sliceDrawdown: number;
  finalEquity: number;
}

// A sequential policy over the slices (PROTOCOL.md §7.4): the cutoff's primary trades the following slice; with no
// primary the policy is flat (0). A switch between different configurations at a boundary is charged 5 bps on the
// $100,000 notional for each side it implies (liquidating the old configuration's open position at the slice end,
// adopting the new configuration's carried-in position at the boundary). The drawdown is the strict minute tracker
// over the concatenated slice marks.
export const sequentialOf = (
  slices: {
    cutoff: string;
    id: string | null;
    sliceNet: number;
    marks: Marks | null;
    openAtEnd: boolean;
    carriedIn: boolean;
  }[]
) => {
  const tracker = new Tracker(0, slices.find((s) => s.marks)?.marks!.boundaryClose ?? 0);
  let offset = 0;
  let switches = 0;
  let switchCost = 0;
  const perSide = (rules.notional * 5) / 10000;

  slices.forEach((s, i) => {
    const prev = slices[i - 1];

    if (i > 0 && prev && prev.id !== s.id) {
      const sides = (prev.id && prev.openAtEnd ? 1 : 0) + (s.id && s.carriedIn ? 1 : 0);

      if (prev.id || s.id) switches++;
      switchCost += sides * perSide;
      offset -= sides * perSide;
      if (sides && s.marks) tracker.updateStrict(offset, s.marks.boundaryClose);
    }

    if (s.marks) for (let k = 0; k < s.marks.t.length; k++) tracker.updateStrict(offset + s.marks.v[k]!, s.marks.t[k]!);
    offset += s.id ? s.sliceNet : 0;
  });

  const st = tracker.stats();

  return {
    net: cents(offset),
    grossOfSwitches: cents(offset + switchCost),
    switches,
    switchCost: cents(switchCost),
    drawdown: cents(st.maximum),
    drawdownPeak: Number.isFinite(st.peakTime) && st.maximum > 0 ? new Date(st.peakTime * 1000).toISOString() : null,
    drawdownTrough:
      Number.isFinite(st.troughTime) && st.maximum > 0 ? new Date(st.troughTime * 1000).toISOString() : null,
    withinCeiling: st.maximum <= rules.ceiling,
    slices: slices.map((s) => ({ cutoff: s.cutoff, id: s.id, sliceNet: s.id ? s.sliceNet : 0 }))
  };
};
