// The margin model of PROTOCOL.md §8: requirement schedules applied per security, the maintenance-excess proxy and
// the distance-to-call algebra. Pure functions of a balance sheet, so the engine, the stress tables and the tests
// share one implementation. Nothing here claims to be Vanguard's proprietary calculation.
//
//   equity               = cash + receivables + Σ MV_i − principal − accrued interest − funding payable
//   required(S)          = Σ r_i(S) × MV_i              (per security; a VGT lot and core VGT are one security)
//   excess(S)            = equity − required(S)
import { type Security, protocol, securities } from './context.ts';

export const scheduleKeys = ['U35', 'U50', 'U60', 'L50', 'L60', 'G50', 'G60'] as const;
export type ScheduleKey = (typeof scheduleKeys)[number];

export const sectorGroup: readonly Security[] = ['VGT', 'XBI', 'XRT', 'KRE'];

export const scheduleLabels: Record<ScheduleKey, string> = {
  U35: '35% on every holding (Vanguard published general house requirement; whole-account equity/LMV test)',
  U50: '50% on every holding (published concentrated-position example, applied account-wide)',
  U60: '60% on every holding (hypothetical research ceiling; not a documented Vanguard maximum)',
  L50: '50% on the funded ETF, 35% elsewhere',
  L60: '60% on the funded ETF, 35% elsewhere (hypothetical)',
  G50: '50% on the sector-fund group (VGT core and lots, XBI, XRT, KRE), 35% on VOOG',
  G60: '60% on the sector-fund group, 35% on VOOG (hypothetical)'
};

export type MarketValues = Record<Security, number>;

export const emptyValues = (): MarketValues => ({ VOOG: 0, VGT: 0, XBI: 0, XRT: 0, KRE: 0 });

const scheduleSpec = (schedule: ScheduleKey) => ({
  scope: schedule[0] as 'U' | 'L' | 'G',
  rate: Number(schedule.slice(1)) / 100
});

// r_i under a schedule; `funded` holds the securities of the funded lots (VGT when a VGT lot is open).
export const requirementRate = (schedule: ScheduleKey, security: Security, funded: ReadonlySet<Security>) => {
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
      return sectorGroup.includes(security) ? rate : protocol.baseRequirement;
  }
};

export const requiredOf = (schedule: ScheduleKey, mv: MarketValues, funded: ReadonlySet<Security>) => {
  let total = 0;

  for (const security of securities) {
    if (mv[security] !== 0) {
      total += requirementRate(schedule, security, funded) * mv[security];
    }
  }

  return total;
};

export const lmvOf = (mv: MarketValues) => mv.VOOG + mv.VGT + mv.XBI + mv.XRT + mv.KRE;

export interface BalanceSheet {
  equity: number;
  mv: MarketValues;
  funded: ReadonlySet<Security>;
  debt: number; // principal + accrued interest + funding payable
}

export interface Distance {
  schedule: ScheduleKey;
  required: number;
  excess: number;
  ratio: number; // equity / required
  uniformShock: number; // the uniform fall of every holding that leaves excess 0 (Infinity if none ≤ 100% does)
  twoFactor: { rho: number; shock: number }[]; // the funded ETF falls g, the rest ρg
  accountFallToCall: number; // dollars of LMV lost under the uniform shock
}

const shockOrInfinity = (numerator: number, denominator: number) => {
  if (numerator <= 0) {
    return 0;
  }

  if (!(denominator > 0)) {
    return Infinity;
  }

  const g = numerator / denominator;

  return g > 1 ? Infinity : g;
};

// The uniform requirement at which excess is zero: equity / LMV (above 60% it is a diagnostic only).
export const homogeneousBreakEven = (sheet: BalanceSheet) => {
  const lmv = lmvOf(sheet.mv);

  return lmv > 0 ? sheet.equity / lmv : Infinity;
};

// The requirement on the funded ETF's security alone (everything else at 35%) that leaves excess 0; > 1 means no
// requirement on that security could cause a call by itself.
export const fundedBreakEven = (sheet: BalanceSheet) => {
  let fundedValue = 0;
  let otherRequired = 0;

  for (const security of securities) {
    if (sheet.funded.has(security)) {
      fundedValue += sheet.mv[security];
    } else {
      otherRequired += protocol.baseRequirement * sheet.mv[security];
    }
  }

  return fundedValue > 0 ? (sheet.equity - otherRequired) / fundedValue : Infinity;
};

export const rhos = [0, 0.5, 1] as const;

export const distanceOf = (sheet: BalanceSheet, schedule: ScheduleKey): Distance => {
  const required = requiredOf(schedule, sheet.mv, sheet.funded);
  const excess = sheet.equity - required;
  const lmv = lmvOf(sheet.mv);
  let fundedCushion = 0; // Σ (1 − r_i) MV_i over the funded securities
  let otherCushion = 0;

  for (const security of securities) {
    const cushion = (1 - requirementRate(schedule, security, sheet.funded)) * sheet.mv[security];

    if (sheet.funded.has(security)) {
      fundedCushion += cushion;
    } else {
      otherCushion += cushion;
    }
  }

  const uniformShock = shockOrInfinity(excess, lmv - required);

  return {
    schedule,
    required,
    excess,
    ratio: required > 0 ? sheet.equity / required : Infinity,
    uniformShock,
    twoFactor: rhos.map((rho) => ({ rho, shock: shockOrInfinity(excess, fundedCushion + rho * otherCushion) })),
    accountFallToCall: Number.isFinite(uniformShock) ? uniformShock * lmv : Infinity
  };
};

// The balance sheet after the funded securities fall by g and every other holding by ρg (debt unchanged).
export const shockedSheet = (sheet: BalanceSheet, g: number, rho: number): BalanceSheet => {
  const mv = emptyValues();
  let loss = 0;

  for (const security of securities) {
    const fall = sheet.funded.has(security) ? g : rho * g;

    mv[security] = sheet.mv[security] * (1 - fall);
    loss += sheet.mv[security] * fall;
  }

  return { equity: sheet.equity - loss, mv, funded: sheet.funded, debt: sheet.debt };
};

// The largest new principal in `security` that leaves excess ≥ 0 under the schedule after the purchase (borrowing
// adds equal MV and debt, so equity is unchanged and the requirement grows by r × P).
export const maximumPrincipal = (sheet: BalanceSheet, schedule: ScheduleKey, security: Security) => {
  const funded = new Set([...sheet.funded, security]);
  const required = requiredOf(schedule, sheet.mv, funded);
  const rate = requirementRate(schedule, security, funded);

  return Math.max(0, (sheet.equity - required) / rate);
};

// Reg T initial margin: debt after the purchase ≤ 50% of LMV after it.
export const regTMaximumPrincipal = (sheet: BalanceSheet) => Math.max(0, lmvOf(sheet.mv) - 2 * sheet.debt);

// The dollars of core to sell (proportionally, average requirement `coreRate`) so that excess ≥ buffer × LMV after.
export const coreSaleToRestore = (equity: number, required: number, lmv: number, coreRate: number, buffer: number) =>
  Math.max(0, (required + buffer * lmv - equity) / (coreRate + buffer));
