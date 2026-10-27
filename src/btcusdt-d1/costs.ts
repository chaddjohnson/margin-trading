// Execution-cost scenarios and stop-fill conventions (BTC_CLOCK_AND_EXECUTION.md §5-6, PROTOCOL.md §6). These are
// assumptions for research, not a statement of any account's fee tier: a fee is charged on each side's quote notional
// (paid in USDT; no fee-token discount), and an incremental impact moves each fill against the order (buys higher,
// sells lower) on top of the observed trade price.
export interface CostScenario {
  label: string;
  feeBps: number; // per side
  impactBps: number; // per side
}

export type StopFill = 'adverse' | 'stop' | 'low';

export const stopFills: Record<StopFill, string> = {
  adverse:
    'min(stop, the next traded minute’s open), recorded at that minute (the next day’s first trade if the trigger is the day’s last minute)',
  stop: 'the stop level itself, in the trigger minute (the ETF engines’ assumption; optimistic in fast markets)',
  low: 'min(stop, the trigger minute’s low, the next traded minute’s open): a worst-case bound, never above adverse'
};

export const scenario = (feeBps: number, impactBps: number): CostScenario => ({
  label: `fee${feeBps}-impact${impactBps}`,
  feeBps,
  impactBps
});

export const principal = scenario(10, 5);
export const conservative = scenario(20, 10);
export const stress = scenario(30, 20);

export const feeGrid = [5, 10, 20, 30] as const;
export const impactGrid = [0, 5, 10, 20] as const;

export const costGrid = feeGrid.flatMap((fee) => impactGrid.map((impact) => scenario(fee, impact)));

export interface ExecutionSettings {
  costs: CostScenario;
  stopFill: StopFill;
  // Orders below this quote notional are refused (an accounting floor for exhausted cash, not venue metadata).
  minOrderNotional: number;
}

export const principalSettings: ExecutionSettings = { costs: principal, stopFill: 'adverse', minOrderNotional: 10 };

export const settingsLabel = (settings: ExecutionSettings) => `${settings.costs.label}-stop-${settings.stopFill}`;
