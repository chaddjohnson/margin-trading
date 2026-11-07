// The final evaluation (PROTOCOL.md §9), once, after FROZEN_SELECTION.json is committed:
// 1. P2 — browser parity: #4 on 2016-01-04 → 2026-10-30 through the unchanged Strategy Lab runner on the canonical file,
//    against the browser's reference figures; then the adapter's full-door run against that runner.
// 2. The full door (one opening for the battery): for every shortlist member (role holders first, in rank order, then the
//    other members in shortlist order) and #4, one continuous causal run from 2016-01-04, split at the 2024 close; the
//    no-lookahead check against the development-door run; the test families and T1–T7 (veto only); the comparison with
//    #4 on the same dates (net, drawdown, winners retained/added, losses).
import path from 'node:path';
import fs from 'fs-extra';
import { chronology, control4BrowserReference, episodeGap, frozenSelectionFile, schedule } from './context.ts';
import { type RunOutput, requestOf, runConfig } from './adapter.ts';
import { type LoadedSessions, coverageOf, loadDevelopmentSessions, loadFullSessions } from './data.ts';
import { evidenceOf, testGatesOf } from './evidence.ts';
import { floorsOf } from './fitness.ts';
import { type Lab, ParallelLab, doorView } from './lab.ts';
import { compareWithDirect, directRun, directSummary, scratchDir } from './parity.ts';
import { compactEvidence } from './qualify.ts';
import { log, nowIso, readSealed, recordDoor, writeCsv, writeSealed } from './seal.ts';
import {
  type Effective,
  type Genome,
  configId,
  control4Effective,
  control4Genome,
  describe,
  effectiveOf,
  genomeOfRegistry
} from './space.ts';
import { type TradeRow, boundarySplit, matchWinners, tradesOf } from './trades.ts';

export interface Frozen {
  bodyHash: string;
  ranked: { rank: number; role: string; id: string; genome: Genome; effective: Effective }[];
  shortlist: { rank: number; pick: string; id: string; effective: Effective; qualified: boolean }[];
  primary: { id: string } | null;
}

const cents = (x: number) => Math.round(x * 100) / 100;

export const runBrowserParity = async (out: string) => {
  if (await fs.pathExists(out)) throw new Error(`${out} exists (sealed)`);

  const ref = control4BrowserReference;
  const request = requestOf(control4Effective(), ref.window.from, ref.window.to);
  const runDir = path.join(scratchDir, 'P2-control4-full');
  const frozen = (await fs.readJson(frozenSelectionFile)) as Frozen;
  const full = await loadFullSessions({ frozenBodyHash: frozen.bodyHash }); // verifies the commit and the file hash

  await fs.remove(runDir);
  await recordDoor(
    'full',
    'P2 browser parity of #4 (unchanged Strategy Lab runner on the canonical file)',
    full.sha256,
    ref.window.to
  );

  const direct = await directRun(process.cwd(), request, runDir);
  const s = directSummary(direct);
  const observed = {
    totalMarkedNetUsd: cents(s.totalMarkedNetUsd),
    realizedNetUsd: cents(s.realizedNetUsd),
    minuteDrawdownUsd: cents(s.minuteDrawdownUsd),
    minuteDrawdownPercent: Math.round(s.minuteDrawdownPercent * 100) / 100,
    wins: s.wins,
    losses: s.losses,
    breakeven: s.breakeven,
    closedTrades: s.closedTrades,
    sessionsInvestedPercent: Math.round(s.sessionsInvestedPercent * 10) / 10,
    calendarTimeInvestedPercent: Math.round(s.calendarTimeInvestedPercent * 10) / 10,
    flatAtEnd: s.open === 0
  };
  const checks = {
    totalMarkedNetUsd: observed.totalMarkedNetUsd === ref.totalMarkedNetUsd,
    realizedNetUsd: observed.realizedNetUsd === ref.realizedNetUsd,
    minuteDrawdownUsd: observed.minuteDrawdownUsd === ref.minuteDrawdownUsd,
    minuteDrawdownPercent: observed.minuteDrawdownPercent === ref.minuteDrawdownPercent,
    wins: observed.wins === ref.wins,
    losses: observed.losses === ref.losses,
    breakeven: observed.breakeven === ref.breakeven,
    closedTrades: observed.closedTrades === ref.closedTrades,
    exposure:
      observed.sessionsInvestedPercent === ref.exposurePercent ||
      observed.calendarTimeInvestedPercent === ref.exposurePercent,
    flatAtEnd: observed.flatAtEnd === ref.flatAtEnd
  };
  const passed = Object.values(checks).every(Boolean);
  // the adapter's own full-door run of #4 against that runner, every trade and mark
  const adapterOut = runConfig(full.sessions, full.sha256, control4Effective());
  const adapterProblems = compareWithDirect(adapterOut, direct);
  const record = await writeSealed(out, {
    stage: 'P2-BROWSER-PARITY',
    at: nowIso(),
    request,
    reference: ref,
    observed,
    exact: {
      totalMarkedNetUsd: s.totalMarkedNetUsd,
      realizedNetUsd: s.realizedNetUsd,
      minuteDrawdownUsd: s.minuteDrawdownUsd,
      minuteDrawdownPercent: s.minuteDrawdownPercent,
      sessionsInvestedPercent: s.sessionsInvestedPercent,
      calendarTimeInvestedPercent: s.calendarTimeInvestedPercent,
      window: s.window
    },
    checks,
    exposureMatchedBy:
      observed.sessionsInvestedPercent === ref.exposurePercent
        ? 'sessions invested %'
        : observed.calendarTimeInvestedPercent === ref.exposurePercent
          ? 'calendar time invested %'
          : 'neither',
    passed,
    adapter: { problems: adapterProblems, identical: adapterProblems.length === 0 },
    dataSha256: full.sha256,
    splitsApplied: full.splitsApplied
  });

  log(
    `P2 browser parity ${passed ? 'PASSED' : 'FAILED'}; adapter vs runner ${adapterProblems.length} differences (${record.file})`
  );
  return { record, passed, adapterIdentical: adapterProblems.length === 0 };
};

const testEpisodes = (trades: readonly TradeRow[]) => {
  let episodes = 0;
  let previous = -Infinity;

  for (const t of trades) {
    if (episodes === 0 || t.entrySession - previous > episodeGap) episodes++;
    previous = t.status === 'open' ? Infinity : t.lastSession;
  }

  return episodes;
};

export interface ValidationInputs {
  frozen: Frozen;
  full: LoadedSessions;
  dev: LoadedSessions;
  lab: Lab;
  boundary: string;
}

// `inject` is for the synthetic-data test only; the real stage opens the doors itself.
export const runValidation = async (out: string, inject: Partial<ValidationInputs> = {}) => {
  if (await fs.pathExists(out)) throw new Error(`${out} exists (sealed); validation is opened once`);

  const frozen = inject.frozen ?? (await readSealed<Frozen>(frozenSelectionFile));
  const loaded = inject.full ?? (await loadFullSessions({ frozenBodyHash: frozen.bodyHash }));
  const boundaryDate = inject.boundary ?? chronology.developmentEnd;

  if (!inject.full) await recordDoor('full', 'validation battery (once)', loaded.sha256, loaded.lastDate);
  log(
    `full door opened: ${loaded.firstDate} → ${loaded.lastDate}, ${loaded.sessions.length} sessions, splits ${JSON.stringify(loaded.splitsApplied)}`
  );

  const view = doorView('full', loaded.sessions, loaded.sha256);
  const dates = loaded.sessions.map((s) => s.date);
  const b = dates.lastIndexOf(boundaryDate);

  if (b < 0) throw new Error(`the boundary ${boundaryDate} is not a session of the run`);

  const valSessions = loaded.sessions.length - 1 - b;
  const yTest = valSessions / 252;
  const floors = floorsOf(view.y, 2016, 2026);
  const options = { prefix: 'test' as const, fold: 'VAL' as const, floors, trainKey: 'DEV', testKey: 'VAL' };
  // the development door again, only for the no-lookahead check (the same bytes the search read)
  const dev = inject.dev ?? (await loadDevelopmentSessions());

  if (!inject.dev)
    await recordDoor(
      'development',
      'no-lookahead check of the continuous runs (post-freeze)',
      dev.sha256,
      dev.lastDate
    );

  const lab = inject.lab ?? new ParallelLab(view, { door: 'full', frozenBodyHash: frozen.bodyHash });
  const holderIds = frozen.ranked.map((h) => h.id);
  const order = [
    ...frozen.ranked.map((h) => ({
      id: h.id,
      effective: h.effective,
      label: `rank ${h.rank} (${h.role})`,
      holder: true,
      rank: h.rank,
      role: h.role
    })),
    ...frozen.shortlist
      .filter((m) => !holderIds.includes(m.id))
      .map((m) => ({
        id: m.id,
        effective: m.effective,
        label: `shortlist ${m.rank} (${m.pick}${m.qualified ? '' : ', not qualified'})`,
        holder: false,
        rank: null,
        role: null
      }))
  ];
  const controlGenome = control4Genome();
  const runFull = (effective: Effective) =>
    runConfig(loaded.sessions, loaded.sha256, effective, { recordMinuteMarks: true });
  const controlOut = runFull(control4Effective());
  const controlTrades = tradesOf(controlOut);
  const controlSplit = boundarySplit(controlOut, boundaryDate);
  const noLookahead = (full: RunOutput, effective: Effective) => {
    const d = runConfig(dev.sessions, dev.sha256, effective);
    const problems: string[] = [];
    const fd = full.run.simulation.daily;

    d.run.simulation.daily.forEach((mk, i) => {
      if (!Object.is(mk.marked, fd[i]!.marked) || mk.date !== fd[i]!.date) problems.push(`${mk.date}`);
    });

    const closedBefore = (o: RunOutput) =>
      o.run.simulation.trades
        .filter((t) => t.exitIndex >= 0 && t.exitIndex <= b)
        .map((t) => `${t.entryTime}|${t.exitTime}|${t.net}`);
    const a = closedBefore(d);
    const c = closedBefore(full);

    if (a.join(';') !== c.join(';')) problems.push('closed trades before the boundary differ');

    return {
      identical: problems.length === 0,
      problems: problems.slice(0, 5),
      developmentNet: d.summary.metrics.pnl.totalMarkedNetUsd
    };
  };
  const evaluate = async (genome: Genome, effective: Effective, isControl: boolean) => {
    const fullOut = isControl ? controlOut : runFull(effective);
    const trades = tradesOf(fullOut);
    const split = boundarySplit(fullOut, boundaryDate);
    const evidence = await evidenceOf(lab, genome, options);
    const valTrades = trades.filter((t) => t.entrySession > b);
    const gates = testGatesOf(evidence, floors, {
      testKey: 'VAL',
      yTest,
      testLots: valTrades.length,
      testEpisodes: testEpisodes(valTrades)
    });
    const m = fullOut.summary.metrics;

    return {
      fullRun: {
        net: m.pnl.totalMarkedNetUsd,
        realized: m.pnl.realizedNetUsd,
        open: m.pnl.totalMarkedNetUsd - m.pnl.realizedNetUsd,
        minuteDrawdown: m.drawdown.minute,
        dailyDrawdown: m.drawdown.daily,
        trades: m.trades,
        exposurePercent: m.occupancy.sessionsInvestedPercent,
        calendarExposurePercent: m.occupancy.calendarTimeInvestedPercent
      },
      split,
      noLookahead: noLookahead(fullOut, effective),
      evidence: compactEvidence(evidence),
      gates,
      trades,
      versusControl: isControl
        ? null
        : {
            validationNetDelta: split.validation.net - controlSplit.validation.net,
            validationDrawdownDelta: split.validation.minuteDrawdownUsd - controlSplit.validation.minuteDrawdownUsd,
            higherNetWithEqualOrLowerDrawdown:
              split.validation.net > controlSplit.validation.net &&
              split.validation.minuteDrawdownUsd <= controlSplit.validation.minuteDrawdownUsd,
            winners: matchWinners(trades, controlTrades, {
              first: b + 1,
              last: dates.length - 1,
              retainedTolerance: 2
            }),
            fullRunWinners: matchWinners(trades, controlTrades, {
              first: 0,
              last: dates.length - 1,
              retainedTolerance: 2
            })
          }
    };
  };
  const results = [];

  for (const item of order) {
    const genome = frozen.ranked.find((h) => h.id === item.id)?.genome ?? null;
    const g = genome ?? genomeOfRegistry(item.effective);

    if (configId(g) !== item.id)
      throw new Error(`${item.id}: the frozen effective configuration does not reproduce its id`);

    log(`validating ${item.id} ${item.label}`);
    results.push({ ...item, describe: describe(item.effective), ...(await evaluate(g, item.effective, false)) });
  }

  log('validating #4 (control)');

  const control = {
    id: configId(controlGenome),
    effective: effectiveOf(controlGenome),
    describe: describe(effectiveOf(controlGenome)),
    ...(await evaluate(controlGenome, control4Effective(), true))
  };

  await lab.close();

  const primary = frozen.primary ? (results.find((r) => r.id === frozen.primary!.id) ?? null) : null;
  const dir = path.dirname(out);
  const ledgerFiles: string[] = [];

  for (const r of [...results, { ...control, id: 'control4' }]) {
    const file = path.join(dir, `ledger-${r.id}.csv`);

    await writeCsv(
      file,
      r.trades.map((t) => ({
        ...t,
        window: t.entrySession > b ? 'validation' : t.lastSession > b ? 'carried across 2024/2025' : 'development'
      }))
    );
    ledgerFiles.push(file);

    const years = path.join(dir, `years-${r.id}.csv`);

    await writeCsv(
      years,
      Object.entries(r.evidence.centre.periods)
        .filter(([k]) => /^\d{4}(~partial)?$/.test(k))
        .map(([year, net]) => ({
          year,
          centreNet: net,
          neighbourhoodMedian: r.evidence.decisive.periods[year]?.median ?? null
        }))
    );
    ledgerFiles.push(years);
  }

  const record = await writeSealed(out, {
    stage: 'VALIDATION',
    at: nowIso(),
    frozenSelection: { file: frozenSelectionFile, bodyHash: frozen.bodyHash },
    door: {
      door: 'full',
      first: loaded.firstDate,
      last: loaded.lastDate,
      sessions: loaded.sessions.length,
      dataSha256: loaded.sha256,
      splitsApplied: loaded.splitsApplied
    },
    window: { first: dates[b + 1], last: dates.at(-1), sessions: valSessions, yTest, boundary: boundaryDate },
    coverage: coverageOf(loaded.sessions, [
      boundaryDate,
      chronology.validationStart,
      '2026-04-21',
      '2026-10-29',
      chronology.validationEnd
    ]),
    floors,
    families: schedule.test,
    results,
    control,
    primary: primary ? { id: primary.id, status: primary.gates.status, failed: primary.gates.failed } : null,
    ledgers: ledgerFiles
  });

  log(
    `validation sealed ${record.file} ${record.bodyHash.slice(0, 12)}; primary ${primary ? `${primary.id} ${primary.gates.status}` : 'none'}`
  );
  return { record, files: [out, ...ledgerFiles] };
};
