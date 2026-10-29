// Stage 1c engine-facing types: Stage 1b's (src/study3-vgt-momentum-stage1b/types.ts, imported unchanged) plus the
// three protection rules of ENGINE_CONTRACT.md §11 (A maximum losing hold, B post-loss cooldown, C post-material-loss
// recovery level), their run options and counters. A policy without `protect` is a Stage 1b policy.
import type * as Base from '../study3-vgt-momentum-stage1b/types.ts';

export type {
  AccountEvent,
  DailyRow,
  DrawdownStats,
  ExitSpec,
  Financing,
  ReentryRule,
  SizingSpec,
  StopComponent,
  Transition,
  Trim,
  WindowResult
} from '../study3-vgt-momentum-stage1b/types.ts';

export interface ProtectSpec {
  A?: { N: number }; // calendar days from the entry fill to the first eligible open
  B?: { C: number }; // trading sessions without a fill after a losing own-rule exit
  C?: { X: number; Y: number; cross?: boolean }; // gross raw loss >= X arms; decision price >= exit (1 + Y)
}

export interface Policy extends Base.Policy {
  protect?: ProtectSpec;
}

export interface ScheduleItem {
  index: number;
  policy: Policy;
}

export interface RunOptions extends Base.RunOptions {
  losingHoldFill?: 'next' | 'open'; // A's fill: the next trade after the opening print (primary) or the print itself
  restrictionCarry?: 'persist' | 'reset'; // the account loss record at a boundary where the policy changes
}

export type ExitReason = Base.ExitReason | 'losing hold';

export interface Trade extends Omit<Base.Trade, 'exitReason'> {
  exitReason: ExitReason;
  cLevel: number; // the C level in force at the entry decision (NaN if C was not armed)
  cFillBelow: boolean; // the fill's raw price was below cLevel
  releaseEntry: boolean; // decided at the first permitted decision session after a rule-B cooldown
}

export interface BlockRow {
  index: number;
  kind: 'B' | 'C' | 'BC';
  entry: 'first' | 'reentry';
  minute: boolean;
  policy: string; // the deciding policy (an adopt-flat boundary decides for the old and the new policy)
}

export interface LosingHoldEvent {
  index: number;
  trade: number;
  netOpen: number;
  due: boolean;
}

export interface RunResult extends Omit<Base.RunResult, 'trades'> {
  trades: Trade[];
  aChecks: number;
  aDue: number;
  aCancelled: number;
  bBlocks: number;
  cBlocks: number;
  bcBoth: number;
  cFillsBelow: number;
  blocks?: BlockRow[];
  aEvents?: LosingHoldEvent[];
}
