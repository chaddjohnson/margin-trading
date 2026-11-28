// The shared, typed execution interface of a MANUAL (non-formal) evaluation of a sealed pooled VGT/GDX configuration.
// The command line (tools/manual-eval/pooled.ts) and Strategy Lab's portfolio runner
// (apps/strategy-lab/runner/portfolio-run.ts) both plan, open, run and attribute a window through this module, so the
// two can only differ in presentation:
//
//   planManualRun     the request (research | all | custom, and for custom the execution mode) → the reporting window
//                     and the simulated window, checked against the files before any data are read (door.ts);
//   openPlanDoor      the door of the simulated window (research = Priority 3's FULL door; otherwise a manual door);
//   evaluatePlan      ONE run of the caller's engine on that door (the caller passes the engine; nothing here trades),
//                     the engine-reconciled ledger (src/vg-l0-risk-metrics/engine.ts toLedger / reconcile) and the
//                     period attribution (report.ts periodMetrics);
//   researchReference whether the run must be proven equal to the research-window (FULL) run, and compareTo does it.
//
// Execution modes (only for a custom window; research and all always run continuously from the first session):
//   continuous  the run starts at the first common session (2016-01-04) and ends at the requested end; the requested
//               start only selects the REPORTING window, whose figures are the change of the one continuous run's
//               marked net (positions, books, armed setups, stops and accrued interest carried in) — period R;
//   isolated    the run itself starts flat at the requested start (no state from earlier sessions): a cold start.
// Nothing here is a formal stage: optimization and validation keep their own doors and the research date ranges
// (standard 4.0.0 §1.12–§1.14); a window past the validation end is a manual post-validation evaluation.
import { researchRange } from '../lib/researchRanges.ts';
import type { Door } from '../vg-d1-growth-joint/data.ts';
import { chronology } from '../vg-d1-growth-joint/context.ts';
import { type Replay, reconcile, toLedger } from '../vg-l0-risk-metrics/engine.ts';
import type { Ledger } from '../vg-l0-risk-metrics/ledger.ts';
import { type ManualWindow, type WindowMode, openManualDoor, resolveManualWindow, windowModes } from './door.ts';
import { type PeriodSpec, compareTrajectories, periodMetrics } from './report.ts';

export type ExecutionMode = 'continuous' | 'isolated';
export const executionModes: readonly ExecutionMode[] = ['continuous', 'isolated'];

export interface ManualRunRequest {
  mode: WindowMode;
  from?: string;
  to?: string;
  execution?: ExecutionMode; // custom only; the default is the caller's (the CLI: isolated; Strategy Lab: continuous)
}

export interface ManualRunPlan {
  request: { mode: WindowMode; from: string | null; to: string | null; execution: ExecutionMode | null };
  execution: ExecutionMode;
  reporting: ManualWindow; // the window the primary figures describe (requested dates, checked against the files)
  simulation: ManualWindow; // the window the engine runs
  label: string;
}

export const MANUAL_POST_VALIDATION_LABEL =
  'MANUAL POST-VALIDATION EVALUATION (not an extension of the formal validation dataset)';

export const planManualRun = (o: ManualRunRequest, defaultExecution: ExecutionMode, dataRoot?: string): ManualRunPlan => {
  if (!windowModes.includes(o.mode)) throw new Error(`unknown window '${o.mode}' (${windowModes.join(', ')})`);
  if (o.execution !== undefined && !executionModes.includes(o.execution))
    throw new Error(`unknown execution '${o.execution}' (${executionModes.join(', ')})`);
  if (o.mode !== 'custom' && o.execution !== undefined)
    throw new Error(`the execution mode applies to a custom window only (${o.mode} runs continuously from ${chronology.firstSession})`);

  const reporting = resolveManualWindow({ mode: o.mode, from: o.from, to: o.to }, dataRoot);
  const execution = o.mode === 'custom' ? (o.execution ?? defaultExecution) : 'continuous';
  const simulation =
    o.mode === 'custom' && execution === 'continuous' && reporting.from !== chronology.firstSession
      ? resolveManualWindow({ mode: 'custom', from: chronology.firstSession, to: reporting.to }, dataRoot)
      : reporting;

  return {
    request: { mode: o.mode, from: o.from ?? null, to: o.to ?? null, execution: o.execution ?? null },
    execution,
    reporting,
    simulation,
    label: reporting.postValidation ? MANUAL_POST_VALIDATION_LABEL : 'manual evaluation'
  };
};

export const openPlanDoor = (plan: ManualRunPlan, purpose: string): Promise<Door> => openManualDoor(plan.simulation, purpose);

// The research date range's period boundaries inside a door (never its last session).
export const boundariesOf = (door: Door) => {
  const range = researchRange();

  return [range.development.to, range.validation.to].filter((d) => door.dates.includes(d) && d !== door.dates.at(-1));
};

// The effective dates of a plan on its opened door: the sessions actually simulated and reported.
export const effectiveDatesOf = (plan: ManualRunPlan, door: Door) => {
  const first = door.dates.find((d) => d >= plan.reporting.from);

  if (first === undefined || first > plan.reporting.to)
    throw new Error(`no session of ${door.name} lies in ${plan.reporting.from} → ${plan.reporting.to}`);
  const i = door.dates.indexOf(first);
  const j = door.dates.indexOf(plan.reporting.to);

  return {
    simulation: { from: door.dates[0]!, to: door.dates.at(-1)!, sessions: door.sessions },
    reporting: { from: first, to: plan.reporting.to, sessions: j - i + 1 },
    // the session whose close opens the reporting window (null when it is the run's start)
    reportingAfter: i > 0 ? door.dates[i - 1]! : null
  };
};

// The periods of a run, in this order: R (the reporting window, only when it starts after the run's start), A (the
// historical research window through the validation end), A1/A2 (development / formal validation), B (after the
// validation end: manual post-validation evaluation), C (the entire run).
export const periodSpecsOf = (plan: ManualRunPlan, door: Door): PeriodSpec[] => {
  const range = researchRange();
  const validationEnd = range.validation.to;
  const developmentEnd = range.development.to;
  const first = door.dates[0]!;
  const end = door.dates.at(-1)!;
  const has = (d: string) => door.dates.includes(d) && d !== end;
  const eff = effectiveDatesOf(plan, door);
  const specs: PeriodSpec[] = [];

  if (eff.reportingAfter !== null)
    specs.push({
      key: 'R',
      label: `reporting window ${eff.reporting.from} → ${eff.reporting.to} of the continuous run from ${first} (state carried in)`,
      after: eff.reportingAfter,
      through: eff.reporting.to
    });
  if (has(validationEnd) || end === validationEnd) {
    specs.push({ key: 'A', label: `historical research window ${first} → ${validationEnd}`, after: null, through: validationEnd });
    if (has(developmentEnd)) {
      specs.push({ key: 'A1', label: `development ${first} → ${developmentEnd}`, after: null, through: developmentEnd });
      specs.push({
        key: 'A2',
        label: `formal validation window (after the ${developmentEnd} close) → ${validationEnd}`,
        after: developmentEnd,
        through: validationEnd
      });
    }
  }
  if (has(validationEnd))
    specs.push({
      key: 'B',
      label: `newly available period (after the ${validationEnd} close) → ${end}: ${MANUAL_POST_VALIDATION_LABEL}`,
      after: validationEnd,
      through: end
    });
  specs.push({ key: 'C', label: `entire window ${first} → ${end}`, after: null, through: end });

  return specs;
};

export interface ManualEvaluation {
  plan: ManualRunPlan;
  door: Door;
  r: Replay;
  L: Ledger;
  reconciliation: ReturnType<typeof reconcile>;
  boundaries: string[];
  specs: PeriodSpec[];
  periods: ReturnType<typeof periodMetrics>[];
  effective: ReturnType<typeof effectiveDatesOf>;
}

// ONE run of the caller's engine on the plan's door, reconciled and attributed.
export const evaluatePlan = (
  plan: ManualRunPlan,
  door: Door,
  run: (door: Door, boundaries: string[]) => Replay,
  boundaries = boundariesOf(door)
): ManualEvaluation => {
  const r = run(door, boundaries);
  const L = toLedger(r);
  const reconciliation = reconcile(r, L);
  const specs = periodSpecsOf(plan, door);

  return {
    plan,
    door,
    r,
    L,
    reconciliation,
    boundaries,
    specs,
    periods: specs.map((s) => periodMetrics(L, door, s)),
    effective: effectiveDatesOf(plan, door)
  };
};

// Whether a run must be proven equal to the research-window run (FULL) over their common span: every non-research
// run that starts at the first common session (a continuous run) — the shorter of the two is compared with the longer
// one decision for decision.
export const researchReference = (plan: ManualRunPlan) =>
  plan.request.mode !== 'research' && plan.simulation.from === chronology.firstSession;

export const researchPlan = (dataRoot?: string) => planManualRun({ mode: 'research' }, 'continuous', dataRoot);

export const compareTo = (research: { r: Replay; L: Ledger }, run: { r: Replay; L: Ledger }) =>
  run.L.endT >= research.L.endT ? compareTrajectories(research, run) : compareTrajectories(run, research);
