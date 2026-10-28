// The ex-ante screen of PROTOCOL.md §7.1, per baseline × view × fold, from runs that end at the fold's cutoff only.
// Gates, a rank score, and at most three roles (S1, S2 or SRC, NC); an empty role is a valid result.
import { type BaselineKey, type FoldKey, levelCExcluded, members, screen as rules } from './context.ts';
import { independentCount } from './events.ts';
import type { SymbolSummary } from './leveld.ts';

export interface ScreenFeatures {
  symbol: string;
  n_dec: number;
  years: number;
  n_idle: number;
  n_clean: number;
  idle_net: number;
  fo_net: number;
  sa_net: number;
  sa_dd: number;
  fam_idle: number;
  indep_pos: number;
}

export interface ScreenRow extends ScreenFeatures {
  gates: Record<string, boolean>;
  passes: boolean;
  economicFailure: boolean;
  ranks?: Record<string, number>;
  score?: number;
  order?: number;
}

export const featuresOf = (
  summary: SymbolSummary,
  standalone: { net: number; minuteDrawdown: number },
  familyAnchors: Map<string, number>,
  netByKey: Map<string, number>
): ScreenFeatures => {
  const idle = summary.classified.filter((item) => item.class !== 'busy');
  const idleFamilies = new Set(idle.map((item) => item.family).filter((family): family is string => Boolean(family)));
  const positive = new Set(
    idle
      .filter((item) => (netByKey.get(item.key) ?? 0) > 0)
      .map((item) => item.family)
      .filter((family): family is string => Boolean(family))
  );

  return {
    symbol: summary.symbol,
    n_dec: summary.decisions,
    years: summary.years,
    n_idle: summary.idleClean.count + summary.idleDisplacing.count,
    n_clean: summary.idleClean.count,
    idle_net: summary.firstOrder.idleNet,
    fo_net: summary.firstOrder.delta,
    sa_net: standalone.net,
    sa_dd: standalone.minuteDrawdown,
    fam_idle: idleFamilies.size,
    indep_pos: independentCount([...positive].map((family) => familyAnchors.get(family)!))
  };
};

// PROTOCOL.md v2.1 §7.1: fo_net is in the score only, never a gate.
const gatesOf = (row: ScreenFeatures) => ({
  activity: row.n_dec >= rules.minDecisions,
  years: row.years >= rules.minYears,
  clean: row.n_clean >= rules.minClean,
  idleNet: row.idle_net > 0,
  standalone: row.sa_net > 0,
  drawdown: row.sa_dd <= rules.ddCeiling
});

// Average descending ranks (1 = largest; ties share the mean of their positions).
export const descendingRanks = (values: readonly number[]) => {
  const order = values.map((value, index) => ({ value, index })).sort((a, b) => b.value - a.value);
  const ranks = new Array<number>(values.length);
  let position = 0;

  while (position < order.length) {
    let end = position;

    while (end + 1 < order.length && order[end + 1]!.value === order[position]!.value) {
      end++;
    }

    const rank = (position + 1 + end + 1) / 2;

    for (let k = position; k <= end; k++) {
      ranks[order[k]!.index] = rank;
    }

    position = end + 1;
  }

  return ranks;
};

export const scoreKeys = ['n_clean', 'fo_net', 'fam_idle', 'years'] as const;

export interface ScreenResult {
  baseline: BaselineKey;
  view: 'U' | 'P';
  fold: FoldKey;
  candidates: number;
  rows: ScreenRow[];
  roles: { role: 'S1' | 'S2' | 'SRC' | 'NC'; symbol: string | null; reason: string }[];
}

export const runScreen = (
  baseline: BaselineKey,
  view: 'U' | 'P',
  fold: FoldKey,
  features: readonly ScreenFeatures[],
  sourceOrder: readonly string[] // P only: the source's R2 order restricted to fold nominees
): ScreenResult => {
  const excluded = new Set([...members[baseline], ...levelCExcluded]);
  const rows: ScreenRow[] = features
    .filter((row) => !excluded.has(row.symbol))
    .map((row) => {
      const gates = gatesOf(row);

      return {
        ...row,
        gates,
        passes: Object.values(gates).every(Boolean),
        // NC's pool (PROTOCOL.md v2.1 §7.1): ex ante uneconomic — a candidate failing only fo_net is the H2 profile
        economicFailure: !(row.idle_net > 0) || !(row.sa_net > 0)
      };
    })
    .sort((a, b) => (a.symbol < b.symbol ? -1 : 1));
  const passing = rows.filter((row) => row.passes);
  const rankTable = Object.fromEntries(
    scoreKeys.map((key) => [key, descendingRanks(passing.map((row) => row[key]))])
  ) as Record<(typeof scoreKeys)[number], number[]>;

  passing.forEach((row, index) => {
    row.ranks = Object.fromEntries(scoreKeys.map((key) => [key, rankTable[key][index]!]));
    row.score = scoreKeys.reduce((total, key) => total + rankTable[key][index]!, 0) / scoreKeys.length;
  });

  const ordered = [...passing].sort(
    (a, b) => a.score! - b.score! || b.fo_net - a.fo_net || (a.symbol < b.symbol ? -1 : 1)
  );

  ordered.forEach((row, index) => {
    row.order = index + 1;
  });

  const roles: ScreenResult['roles'] = [];
  const s1 = ordered[0]?.symbol ?? null;

  roles.push({ role: 'S1', symbol: s1, reason: s1 ? 'first by the screen score' : 'no candidate passed every gate' });

  let second: string | null;

  if (view === 'U') {
    second = ordered[1]?.symbol ?? null;
    roles.push({
      role: 'S2',
      symbol: second,
      reason: second ? 'second by the screen score' : 'fewer than two candidates passed'
    });
  } else {
    second = sourceOrder.find((symbol) => !excluded.has(symbol) && symbol !== s1) ?? null;
    roles.push({
      role: 'SRC',
      symbol: second,
      reason: second
        ? "highest in the source's frozen R2 ranking among the fold's nominees (not a member, not VOOG, not S1)"
        : 'no eligible nominee in the source ranking'
    });
  }

  const taken = new Set([s1, second].filter((symbol): symbol is string => Boolean(symbol)));
  const nc = rows
    .filter(
      (row) =>
        !taken.has(row.symbol) &&
        row.n_dec >= rules.minDecisions &&
        row.years >= rules.minYears &&
        row.n_clean >= rules.ncMinClean &&
        row.economicFailure
    )
    .sort((a, b) => b.n_clean - a.n_clean || b.n_idle - a.n_idle || (a.symbol < b.symbol ? -1 : 1))[0];

  roles.push({
    role: 'NC',
    symbol: nc?.symbol ?? null,
    reason: nc
      ? 'timing-only control: most idle-clean decisions among ex-ante uneconomic candidates (idle_net ≤ 0 or sa_net ≤ 0)'
      : 'no ex-ante uneconomic candidate with an idle-clean decision'
  });

  return { baseline, view, fold, candidates: rows.length, rows, roles };
};
