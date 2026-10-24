// A phenotype run: a compatible strategy file, a symbol's named phenotype and an execution profile. Planning
// validates everything without reading any market data (the strategy's compatibility, the phenotype file, the
// profile, conflicting arguments); executing loads the data once, prints what will run, runs the strategy file's
// own `runAllIn` through its injectable module, proves that the strategy read every injected value, and reports
// the profile's periods of the one continuous run.
import { createHash } from 'node:crypto';
import path from 'node:path';
import fs from 'fs-extra';
import {
  type DatasetSelection,
  type WindowReport,
  describeWindow,
  formatNewYorkTime,
  groupMarketSessions,
  loadCsvMinuteBacktestData,
  resolveDataset,
  selectRunSessions
} from '#lib';
import type { MarketSession } from '#types';
import { PhenotypeError, type ResolvedParameter, formatValue } from './architectures.ts';
import { type ExecutionProfile, executionRoot, readExecutionProfile } from './execution.ts';
import {
  type DeclaredConstant,
  type PreparedStrategy,
  type StrategyResult,
  appliedParametersOf,
  prepareStrategy
} from './injection.ts';
import { type PeriodReport, periodReport } from './periods.ts';
import { type PhenotypeSelection, phenotypeRoot, selectPhenotype } from './phenotypes.ts';
import {
  type CompatibleStrategy,
  compatibleStrategyOf,
  incompatibleEntryPointOf,
  strategyFileOf
} from './strategies.ts';

export interface PhenotypeRunRequest {
  script: string;
  symbol: string;
  phenotype: string;
  phenotypeFile?: string; // instead of config/phenotypes/<architecture>/<symbol>.json
  execution?: string; // instead of the phenotype file's execution profile
  // The strategy's own positional arguments; '-' or '' leaves one unset.
  startDate?: string;
  endDate?: string;
  dataFile?: string;
  outDir?: string;
  stopFill?: string;
  phenotypeRoot?: string;
  executionRoot?: string;
}

export interface AppliedParameter {
  parameter: ResolvedParameter;
  fileDefault: DeclaredConstant;
}

export interface Setting<T> {
  value: T;
  source: string;
}

export interface RunPlan {
  request: PhenotypeRunRequest;
  entry: CompatibleStrategy;
  strategy: PreparedStrategy;
  selection: PhenotypeSelection;
  profile: ExecutionProfile;
  applied: AppliedParameter[];
  ignored: { parameter: ResolvedParameter; reason: string }[];
  strategyConstants: DeclaredConstant[];
  investment: Setting<number>;
  marginInterestRate: Setting<number>;
  stopFill: Setting<string>;
  dataFile: Setting<string>;
  dataset: DatasetSelection; // the partition (or explicit file) the strategy itself resolves again
  firstEligibleDate?: string;
  startDate?: string;
  endDate?: string;
  outDir?: string;
  values: Record<string, number>; // everything injected
}

const unset = (value?: string) => (value === undefined || value === '-' || value === '' ? undefined : value);

export const planPhenotypeRun = async (request: PhenotypeRunRequest): Promise<RunPlan> => {
  const entry = compatibleStrategyOf(request.script);

  if (!entry) {
    const incompatible = incompatibleEntryPointOf(request.script);

    throw new PhenotypeError(
      incompatible
        ? `${request.script} does not take phenotypes: ${incompatible.reason}`
        : `${request.script} is not a known entry point (src/app/${request.script}.ts); run \`npm run app -- phenotypes matrix\` for the strategies that take phenotypes`
    );
  }

  const selection = await selectPhenotype({
    architecture: entry.architecture,
    symbol: request.symbol,
    name: request.phenotype,
    file: request.phenotypeFile,
    root: request.phenotypeRoot ?? phenotypeRoot
  });
  const profile = await readExecutionProfile(
    request.execution ?? selection.file.execution,
    request.executionRoot ?? executionRoot
  );
  const strategy = await prepareStrategy(entry);
  const appliedNames = appliedParametersOf(entry);
  const applied: AppliedParameter[] = [];
  const ignored: RunPlan['ignored'] = [];

  for (const parameter of selection.phenotype.parameters) {
    if (appliedNames.includes(parameter.name)) {
      applied.push({ parameter, fileDefault: strategy.injectable[parameter.name]! });
    } else if (parameter.name in entry.ignorable) {
      ignored.push({ parameter, reason: entry.ignorable[parameter.name]! });
    } else {
      throw new PhenotypeError(
        `${entry.script} can't apply ${parameter.name}, and the compatibility registry doesn't allow ignoring it`
      );
    }
  }

  for (const value of [request.startDate, request.endDate]) {
    if (unset(value) !== undefined && Number.isNaN(Date.parse(value!))) {
      throw new PhenotypeError(`Start and end dates must be YYYY-MM-DD, not '${value}'`);
    }
  }

  const stopFill: Setting<string> = unset(request.stopFill)
    ? { value: request.stopFill!, source: 'command line' }
    : profile.stopFill
      ? { value: profile.stopFill, source: `execution profile ${profile.name}` }
      : { value: 'stop', source: 'strategy default' };

  if (stopFill.value !== 'stop' && stopFill.value !== 'next-open') {
    throw new PhenotypeError(`The stop fill must be 'stop' or 'next-open', not '${stopFill.value}'`);
  }

  // A partition name or an explicit file from the command line; the training partition by default.
  const dataset = resolveDataset(request.symbol, request.dataFile);
  const dataFile: Setting<string> = {
    value: dataset.file,
    source: dataset.partition
      ? `${request.symbol} ${dataset.partition} partition${unset(request.dataFile) ? ' from the command line' : ' (the default)'}`
      : 'command line'
  };
  const outDir = unset(request.outDir);

  // The research directories hold frozen candidates and results; a run never writes there.
  if (outDir && path.resolve(outDir).startsWith(`${path.resolve('research')}${path.sep}`)) {
    throw new PhenotypeError(`Refusing to write run output into ${outDir}: research/ holds frozen research artifacts`);
  }

  const literal = (name: string) => strategy.injectable[name]!.literal;
  const investment: Setting<number> =
    profile.investmentPerEntry === undefined
      ? { value: literal('investmentAmount'), source: 'strategy default' }
      : { value: profile.investmentPerEntry, source: `execution profile ${profile.name}` };
  const marginInterestRate: Setting<number> =
    profile.marginInterestRate === undefined
      ? { value: literal('marginInterestRate'), source: 'strategy default' }
      : { value: profile.marginInterestRate.value, source: `execution profile ${profile.name}` };
  const values: Record<string, number> = Object.fromEntries(
    applied.map(({ parameter }) => [parameter.name, parameter.value])
  );

  values.investmentAmount = investment.value;
  values.marginInterestRate = marginInterestRate.value;

  return {
    request,
    entry,
    strategy,
    selection,
    profile,
    applied,
    ignored,
    strategyConstants: Object.values(strategy.strategyConstants),
    investment,
    marginInterestRate,
    stopFill,
    dataFile,
    dataset,
    firstEligibleDate: profile.firstEligibleDate,
    startDate: unset(request.startDate),
    endDate: unset(request.endDate),
    outDir,
    values
  };
};

export interface DatasetInfo {
  file: string;
  sha256: string;
  hashStatus: 'matches the profile' | 'DIFFERS from the profile' | 'no reference hash in the profile';
  allSessions: MarketSession[]; // the sessions handed to the strategy: the file's, through the window's last
  simulated: MarketSession[]; // the evaluation window
  warmup: number; // warm-up sessions before the window (a partition run; src/lib/evaluation.ts)
  window?: WindowReport;
  firstEligibleIndex: number; // into `simulated`; -1 when no session can arm
}

const sha256File = async (file: string) => {
  const hash = createHash('sha256');

  for await (const chunk of fs.createReadStream(file)) {
    hash.update(chunk as Buffer);
  }

  return hash.digest('hex');
};

const timestampOf = (date: string | undefined, fallback: number) =>
  date === undefined ? fallback : Date.parse(date) / 1000;

export const loadDataset = async (plan: RunPlan): Promise<DatasetInfo> => {
  const file = plan.dataFile.value;

  if (!(await fs.pathExists(file))) {
    throw new PhenotypeError(`The data file ${file} (${plan.dataFile.source}) does not exist`);
  }

  const sha256 = await sha256File(file);
  const expected = plan.profile.dataHashes[plan.request.symbol];
  const fileSessions = groupMarketSessions(await loadCsvMinuteBacktestData(plan.request.symbol, file));
  const warmUp = plan.values.tickWindowSize ?? plan.strategy.injectable.tickWindowSize?.literal ?? 0;
  // The strategy's own window and warm-up: the date filter for an explicit file, the partition's sessions and the
  // warm-up history before them otherwise. Sessions after the window are not handed to the strategy.
  const run = selectRunSessions(fileSessions, {
    dataset: plan.dataset,
    startDate: plan.startDate,
    endDate: plan.endDate,
    warmupSessions: warmUp
  });
  const simulated = run.sessions;
  const last = simulated.at(-1);
  const allSessions = run.report && last ? fileSessions.slice(0, fileSessions.indexOf(last) + 1) : fileSessions;
  const eligibleTime = timestampOf(plan.firstEligibleDate, -Infinity);

  return {
    file,
    sha256,
    hashStatus:
      expected === undefined
        ? 'no reference hash in the profile'
        : expected === sha256
          ? 'matches the profile'
          : 'DIFFERS from the profile',
    allSessions,
    simulated,
    warmup: run.warmup,
    window: run.report && { ...run.report, dataSha256: sha256 },
    firstEligibleIndex: simulated.findIndex(
      (session, index) => run.warmup + index >= warmUp && session.time >= eligibleTime
    )
  };
};

const formatDollars = (value: number) =>
  `${value < 0 ? '−' : ''}$${Math.abs(value).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const formatRate = (value: number) => `${Number((value * 100).toFixed(6))}%`;

export const headerLines = (plan: RunPlan, dataset: DatasetInfo): string[] => {
  const { entry, strategy, selection, profile } = plan;
  const { phenotype, file } = selection;
  const provenance = phenotype.provenance ?? {};
  const first = dataset.simulated[0];
  const last = dataset.simulated.at(-1);
  const eligible = dataset.simulated[dataset.firstEligibleIndex];
  const width = Math.max(...plan.applied.map(({ parameter }) => parameter.name.length), 10);
  const lines = [
    '',
    '=== Phenotype run ===',
    `Strategy:        ${entry.script} (${strategyFileOf(entry.script)}, sha256 ${strategy.sourceHash.slice(0, 12)}): ${entry.summary}`,
    `Symbol:          ${plan.request.symbol}`,
    `Phenotype:       ${phenotype.name} (${file.architecture.name})${phenotype.description ? ` - ${phenotype.description}` : ''}`,
    `Phenotype file:  ${file.path}`
  ];

  if (Object.keys(provenance).length > 0) {
    lines.push(
      `Provenance:      ${Object.entries(provenance)
        .map(([key, value]) => `${key} ${typeof value === 'string' ? value : JSON.stringify(value)}`)
        .join('; ')} (metadata only)`
    );
  }

  lines.push('Parameters applied (the strategy file default in brackets):');

  for (const { parameter, fileDefault } of plan.applied) {
    lines.push(
      `  ${parameter.name.padEnd(width)}  ${parameter.spec.short.padEnd(6)} ${parameter.display.padEnd(18)} [${formatValue(parameter.spec, fileDefault.literal)}]  value ${parameter.value}`
    );
  }

  lines.push(
    plan.ignored.length === 0
      ? 'Ignored parameters: none'
      : `IGNORED parameters (not applied; ${entry.script} has no use for them): ${plan.ignored
          .map(({ parameter, reason }) => `${parameter.name} ${parameter.display} (${reason})`)
          .join(', ')}`
  );

  if (plan.strategyConstants.length > 0) {
    lines.push(
      `Strategy constants outside ${file.architecture.name} (kept at the file's values): ${plan.strategyConstants
        .map((constant) => `${constant.name} ${constant.literal}`)
        .join(', ')}`
    );
  }

  lines.push(
    `Execution:       profile ${profile.name} (${profile.path})`,
    `Dataset:         ${dataset.file} (${plan.dataFile.source}; sha256 ${dataset.sha256.slice(0, 16)}, ${dataset.hashStatus})`,
    `Sessions:        ${dataset.allSessions[0]?.date} → ${dataset.allSessions.at(-1)?.date} in the file (${dataset.allSessions.length})`,
    `Simulation:      ${first?.date ?? 'none'} → ${last?.date ?? 'none'} (${dataset.simulated.length} sessions; start ${plan.startDate ?? 'none'}, end ${plan.endDate ?? 'none'})`,
    ...(dataset.window ? [`Window:          ${describeWindow(dataset.window)}`] : []),
    `First eligible:  ${eligible ? eligible.date : 'no session can arm'} (the ${plan.values.tickWindowSize ?? '?'}-session warm-up${plan.firstEligibleDate ? ` and the profile's first eligible date ${plan.firstEligibleDate}` : ''})`,
    `Investment:      ${formatDollars(plan.investment.value)} per entry, fixed, no compounding (${plan.investment.source})`,
    `Interest:        ${formatRate(plan.marginInterestRate.value)} annual margin interest (${plan.marginInterestRate.source})`,
    `Stop fill:       ${plan.stopFill.value} (${plan.stopFill.source})`,
    `Output:          ${plan.outDir ?? 'console only (pass an output directory as the 5th argument for CSV/JSON files)'}`,
    ''
  );

  if (dataset.hashStatus === 'DIFFERS from the profile') {
    lines.push(
      `WARNING: ${dataset.file} is not the file the profile's research used (${plan.profile.dataHashes[plan.request.symbol]}); results will not reproduce it`,
      ''
    );
  }

  return lines;
};

export interface Verification {
  reads: Record<string, number>;
  eligibilityChecks: number;
}

export interface PhenotypeRun {
  plan: RunPlan;
  dataset: DatasetInfo;
  result: StrategyResult;
  verification: Verification;
  report: PeriodReport;
  lines: string[];
}

export const periodLines = (plan: RunPlan, report: PeriodReport, dataset: DatasetInfo) => {
  const lines = [
    '',
    '=== Periods (one continuous run: nothing is reset at a boundary; a period net is the change of marked equity from the close before it to its last close) ===',
    `${'period'.padEnd(12)} ${'from'.padEnd(10)}   ${'to'.padEnd(10)} ${'net'.padStart(14)} ${'minute DD'.padStart(13)} ${'daily DD'.padStart(13)} ${'interest'.padStart(12)} entries exits  W/L   open at end`
  ];

  for (const period of report.periods) {
    lines.push(
      `${period.label.padEnd(12)} ${period.startDate} → ${period.endDate} ${formatDollars(period.net).padStart(14)} ${formatDollars(period.minuteDrawdown.maximum).padStart(13)} ${formatDollars(period.dailyDrawdown.maximum).padStart(13)} ${formatDollars(period.interest).padStart(12)} ${String(period.entries).padStart(7)} ${String(period.exits).padStart(5)} ${`${period.wins}/${period.losses}`.padStart(6)}   ${period.openAtEnd ? 'yes' : 'no'}`
    );
  }

  for (const { label, note } of report.notes) {
    lines.push(`  ${label}: ${note}`);
  }

  const { accounting } = report;
  const lastSession = dataset.simulated.at(-1);

  lines.push(
    `Full run: net ${formatDollars(accounting.netProfit)} (realized ${formatDollars(accounting.realizedProfit)}, unrealized ${formatDollars(accounting.unrealizedProfit)}), interest ${formatDollars(accounting.closedInterest + accounting.accruedInterest)}, maximum drawdown ${formatDollars(accounting.minuteDrawdown.maximum)} minute-sampled (${formatNewYorkTime(accounting.minuteDrawdown.peakTime)} → ${formatNewYorkTime(accounting.minuteDrawdown.troughTime)}), ${formatDollars(accounting.dailyDrawdown.maximum)} daily; marked at the ${lastSession?.date} close`,
    `Accounting check: the period replay reproduces every closed trade's profit to ${report.closedTradeMismatch.toExponential(1)} dollars`
  );

  return lines;
};

// The machine-readable record of a run, written next to the strategy's own files.
export const runRecord = ({
  plan,
  dataset,
  verification,
  report
}: Pick<PhenotypeRun, 'plan' | 'dataset' | 'verification' | 'report'>) => ({
  schemaVersion: 1,
  strategy: { script: plan.entry.script, file: plan.strategy.file, sha256: plan.strategy.sourceHash },
  symbol: plan.request.symbol,
  architecture: plan.selection.file.architecture.name,
  phenotype: plan.selection.phenotype.name,
  phenotypeFile: plan.selection.file.path,
  provenance: plan.selection.phenotype.provenance ?? null,
  parameters: Object.fromEntries(
    plan.applied.map(({ parameter, fileDefault }) => [
      parameter.name,
      { display: parameter.display, value: parameter.value, fileDefault: fileDefault.literal }
    ])
  ),
  ignored: Object.fromEntries(
    plan.ignored.map(({ parameter, reason }) => [parameter.name, { display: parameter.display, reason }])
  ),
  strategyConstants: Object.fromEntries(plan.strategyConstants.map((constant) => [constant.name, constant.literal])),
  execution: {
    profile: plan.profile.name,
    profileFile: plan.profile.path,
    dataFile: dataset.file,
    dataSha256: dataset.sha256,
    dataHashStatus: dataset.hashStatus,
    dataset: dataset.window ?? null,
    firstSession: dataset.simulated[0]?.date ?? null,
    lastSession: dataset.simulated.at(-1)?.date ?? null,
    sessions: dataset.simulated.length,
    firstEligibleDate: plan.firstEligibleDate ?? null,
    firstEligibleSession: dataset.simulated[dataset.firstEligibleIndex]?.date ?? null,
    startDate: plan.startDate ?? null,
    endDate: plan.endDate ?? null,
    investmentPerEntry: plan.investment.value,
    marginInterestRate: plan.marginInterestRate.value,
    stopFill: plan.stopFill.value
  },
  verification,
  full: {
    netProfit: report.accounting.netProfit,
    realizedProfit: report.accounting.realizedProfit,
    unrealizedProfit: report.accounting.unrealizedProfit,
    interest: report.accounting.closedInterest + report.accounting.accruedInterest,
    minuteDrawdown: report.accounting.minuteDrawdown.maximum,
    dailyDrawdown: report.accounting.dailyDrawdown.maximum
  },
  periods: report.periods.map((period) => ({
    label: period.label,
    startDate: period.startDate,
    endDate: period.endDate,
    openingMark: period.openingMark,
    closingMark: period.closingMark,
    net: period.net,
    minuteDrawdown: period.minuteDrawdown.maximum,
    dailyDrawdown: period.dailyDrawdown.maximum,
    interest: period.interest,
    entries: period.entries,
    exits: period.exits,
    wins: period.wins,
    losses: period.losses,
    openAtEnd: period.openAtEnd
  })),
  periodNotes: report.notes
});

export const executePhenotypeRun = async (
  plan: RunPlan,
  { log = console.info, quietStrategy = false }: { log?: (line: string) => void; quietStrategy?: boolean } = {}
): Promise<PhenotypeRun> => {
  const dataset = await loadDataset(plan);
  const lines: string[] = [];
  const emit = (line: string) => {
    lines.push(line);
    log(line);
  };

  headerLines(plan, dataset).forEach(emit);

  const { module } = plan.strategy;
  const injection = module.phenotypeInjection;
  const firstEligibleTime = timestampOf(plan.firstEligibleDate, -Infinity);

  injection.values = { ...plan.values };
  injection.sessions = dataset.allSessions;
  injection.firstEligibleTime = firstEligibleTime;
  injection.reads = {};
  injection.eligibilityChecks = 0;

  const info = console.info;
  let result: StrategyResult;

  if (quietStrategy) {
    console.info = () => {};
  }

  try {
    result = await module.runAllIn({
      symbol: plan.request.symbol,
      startDate: plan.startDate,
      endDate: plan.endDate,
      dataFile: plan.dataset.partition ?? plan.dataset.file,
      outDir: plan.outDir,
      stopFill: plan.stopFill.value
    });
  } finally {
    console.info = info;
    injection.values = {};
    injection.sessions = undefined;
    injection.firstEligibleTime = -Infinity;
  }

  // The phenotype counts as applied only if the strategy read every injected value.
  const verification: Verification = { reads: { ...injection.reads }, eligibilityChecks: injection.eligibilityChecks };
  const unread = Object.keys(plan.values).filter((name) => !(verification.reads[name]! >= 1));

  if (unread.length > 0) {
    throw new PhenotypeError(
      `${plan.entry.script} never read ${unread.join(', ')}: the phenotype was NOT applied, so the results are discarded`
    );
  }

  if (result.sessions.length !== dataset.simulated.length) {
    throw new PhenotypeError(
      `The strategy simulated ${result.sessions.length} sessions, the runner expected ${dataset.simulated.length}`
    );
  }

  const early = result.positions.find((position) => position.entryTimestamp < firstEligibleTime);

  if (early) {
    throw new PhenotypeError(
      `A position entered on ${new Date(early.entryTimestamp * 1000).toISOString().slice(0, 10)}, before the first eligible date ${plan.firstEligibleDate}`
    );
  }

  const firstEligible = dataset.simulated[Math.max(0, dataset.firstEligibleIndex)]?.date ?? dataset.simulated[0]!.date;
  const report = periodReport(result, plan.profile.periods, firstEligible, plan.marginInterestRate.value);

  periodLines(plan, report, dataset).forEach(emit);
  emit(
    `Phenotype applied: ${plan.entry.script} read all ${plan.applied.length} phenotype parameters${plan.ignored.length > 0 ? ` (${plan.ignored.length} IGNORED: ${plan.ignored.map(({ parameter }) => parameter.name).join(', ')})` : ''} and the investment and interest settings with the injected values; the arming guard checked eligibility ${verification.eligibilityChecks} times`
  );

  if (plan.firstEligibleDate && verification.eligibilityChecks === 0) {
    emit('WARNING: the arming guard never checked the first eligible date (no session reached the arming test)');
  }

  if (plan.outDir) {
    await fs.ensureDir(plan.outDir);

    const file = path.join(plan.outDir, 'phenotype-run.json');

    await fs.writeFile(file, `${JSON.stringify(runRecord({ plan, dataset, verification, report }), null, 1)}\n`);
    emit(`Wrote ${file}`);
  }

  return { plan, dataset, result, verification, report, lines };
};
