// Events, families and regimes (PROTOCOL.md §6.4). Price-defined dip episodes are the standalone audit's catalog
// (imported unchanged); signal episodes and cross-ETF families use an anchor window: a cluster starts at the earliest
// unassigned item and holds every item within w sessions after it (never chained to later items); the next cluster
// starts at the first item after that window. Every label is descriptive and never enters a trading decision.
import { catalogOf, familiesOf, independentOf } from '../d1-standalone-opportunity-audit/events.ts';
import { study as sourceStudy } from '../d1-ranked-preemption/context.ts';
import { levelD } from './context.ts';

export { catalogOf, familiesOf, independentOf };

export interface Item {
  symbol: string;
  time: number;
  session: number;
}

export interface Cluster<T extends Item> {
  id: string;
  anchorSession: number;
  lastSession: number;
  items: T[];
  symbols: string[];
}

export const anchorClusters = <T extends Item>(items: readonly T[], window: number, prefix: string): Cluster<T>[] => {
  const sorted = [...items].sort(
    (a, b) => a.session - b.session || a.time - b.time || (a.symbol < b.symbol ? -1 : a.symbol > b.symbol ? 1 : 0)
  );
  const clusters: Cluster<T>[] = [];
  let index = 0;

  while (index < sorted.length) {
    const anchor = sorted[index]!.session;
    const members: T[] = [];

    while (index < sorted.length && sorted[index]!.session <= anchor + window) {
      members.push(sorted[index]!);
      index++;
    }

    clusters.push({
      id: `${prefix}${String(clusters.length + 1).padStart(3, '0')}`,
      anchorSession: anchor,
      lastSession: members.at(-1)!.session,
      items: members,
      symbols: [...new Set(members.map((member) => member.symbol))].sort()
    });
  }

  return clusters;
};

// The fixed G1–G13 calendar of the source study (descriptive regimes).
export const regimes = sourceStudy.regimes;

export const regimeOf = (date: string) =>
  regimes.find((regime) => regime.start <= date && date <= regime.end)?.key ?? 'none';

export const isShock = (regime: string) => levelD.shockRegimes.includes(regime);

// Independent events among clusters: anchors at least `gap` sessions apart (greedy, chronological).
export const independentCount = (anchors: readonly number[], gap = levelD.independentGap) =>
  independentOf([...new Set(anchors)], gap);
