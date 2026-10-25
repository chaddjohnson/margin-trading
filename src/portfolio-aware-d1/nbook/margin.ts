// The margin model of src/multi-etf-allocator/margin.ts over any list of securities: VOOG, VGT, the frozen books'
// symbols and any candidate book. The schedules, rates and algebra are those functions'; only the security list is
// the run's instead of the fixed five, and the G schedules' sector group is every security except VOOG (the frozen
// group VGT, XBI, XRT, KRE, plus any candidate book; a passive report only, never an entry check). For the five
// original securities every value is identical: the sums run in the same order, and a zero market value adds nothing.
import { protocol } from '../../multi-etf-allocator/context.ts';
import type { ScheduleKey } from '../../multi-etf-allocator/margin.ts';

export type MarketValues = Record<string, number>;

// The frozen five, in the frozen order; candidate books follow in alphabetical order.
export const baseSecurities = ['VOOG', 'VGT', 'XBI', 'XRT', 'KRE'] as const;

export const securitiesOf = (books: readonly string[]): string[] => [
  ...baseSecurities,
  ...books.filter((symbol) => !(baseSecurities as readonly string[]).includes(symbol)).sort()
];

export const emptyValuesOf = (securities: readonly string[]): MarketValues =>
  Object.fromEntries(securities.map((security) => [security, 0]));

const scheduleSpec = (schedule: ScheduleKey) => ({
  scope: schedule[0] as 'U' | 'L' | 'G',
  rate: Number(schedule.slice(1)) / 100
});

export const requirementRate = (schedule: ScheduleKey, security: string, funded: ReadonlySet<string>) => {
  const { scope, rate } = scheduleSpec(schedule);

  if (rate > protocol.maintenanceCeiling + 1e-12) {
    throw new Error(`${schedule}: no requirement above ${protocol.maintenanceCeiling * 100}% is modelled`);
  }

  switch (scope) {
    case 'U':
      return rate;
    case 'L':
      return funded.has(security) ? rate : protocol.baseRequirement;
    case 'G':
      return security !== 'VOOG' ? rate : protocol.baseRequirement;
  }
};

export const requiredOf = (
  securities: readonly string[],
  schedule: ScheduleKey,
  mv: MarketValues,
  funded: ReadonlySet<string>
) => {
  let total = 0;

  for (const security of securities) {
    if (mv[security] !== 0) {
      total += requirementRate(schedule, security, funded) * mv[security]!;
    }
  }

  return total;
};

export const lmvOf = (securities: readonly string[], mv: MarketValues) => {
  let total = 0;

  for (const security of securities) {
    total += mv[security]!;
  }

  return total;
};

export interface BalanceSheet {
  equity: number;
  mv: MarketValues;
  funded: ReadonlySet<string>;
  debt: number;
}

export const maximumPrincipal = (
  securities: readonly string[],
  sheet: BalanceSheet,
  schedule: ScheduleKey,
  security: string
) => {
  const funded = new Set([...sheet.funded, security]);
  const required = requiredOf(securities, schedule, sheet.mv, funded);
  const rate = requirementRate(schedule, security, funded);

  return Math.max(0, (sheet.equity - required) / rate);
};

export const regTMaximumPrincipal = (securities: readonly string[], sheet: BalanceSheet) =>
  Math.max(0, lmvOf(securities, sheet.mv) - 2 * sheet.debt);
