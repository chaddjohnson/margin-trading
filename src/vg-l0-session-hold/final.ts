// The frozen selection and the one-time validation (PROTOCOL.md §11.4, §11.5) — reference method NL0's (5B's final.ts)
// for the brief's A / B / C design.
//
// FROZEN_SELECTION.json (sealed and committed before FULL opens): the primary C (the actual-profit role of the final
// selectable set under the session unit) and every role with complete effective settings under both units, A and B
// (New L0 under 'cal' and 'ses'), the seed-level roles, the C24 unit cross-test subjects and the sealed cross-test and
// diagnostics records, the fold selections and the sequential verdict, the FROZEN COMPARISON LABELS (B vs A, C vs A,
// C vs B; development and folds only), the code and data pins and the validation plan. There is no futility stop.
//
// The validation (FULL, once, behind the guard): every C24 export row and fixed control, unchanged, under both hold
// units in one continuous run 2016-01-04 → 2026-10-30 each (state and marks preserved across 2024-12-31). V1 validation
// P&L > 0; V2 reset validation DD ≤ $35,000; V3 whole-run DD ≤ $35,000. Report-only: stresses and the fresh
// confirmation rep 1 (128 draws) on FULL for A, B, C and the principal rows; the known full-history targets (New L0 =
// A, C4, C4-refined, D, VG #2 native); full-history ledgers, annual figures and matched lots of A, B and C.
// A failed validation is a result: no new winner, no rescue search, no retuning, no relabelling.
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import type { EvalOptions } from '../vg-d1-growth-joint/evaluate.ts';
import { quantile } from '../vg-d1-growth-joint/fitness.ts';
import { csv, drawdownEpisodes, fundingRows, holdingOf, matchLots } from '../vg-d1-growth-joint/post.ts';
import { simulationCaps } from './budgets.ts';
import {
  type Unit,
  cacheRoot,
  chronology,
  economics,
  freezeFile,
  frozenSelectionFile,
  log,
  r2,
  repoRoot,
  resultsDir,
  searchUnit,
  units
} from './context.ts';
import { type Cfg, cfgId, neighbourhood, optionsOf } from './config.ts';
import { controlOf, optionsOfControl, settingsOf } from './controls.ts';
import { type ExportRow, crossFile, exportsFile } from './crosstest.ts';
import {
  type SelectionRecord,
  diagDir,
  exitReasons,
  extendedShortened,
  finalOf,
  foldsOf,
  ledgerOf,
  refusalsByOccupant,
  sessionHolding
} from './diagnostics.ts';
import { openStudyDoor } from './doors.ts';
import { closureDigest, codeClosure, referenceMethodPin } from './freeze.ts';
import { codeDigest, withLab } from './lab.ts';
import { type PrimaryEvidence, type Sequential, comparisonLabel } from './labels.ts';
import { recordOfRun, runUnit } from './unit.ts';
import { type Evidence, summary } from './qualify.ts';
import { isSealed, plain, readJson, sealJson, sha256File, sha256Text, usd } from './records.ts';
import { type Env, assertCommitted, replicates, seal, selectionFile, studyGuards } from './stages.ts';

export const frozenFileOf = (env: Env) =>
  env.schedule === 'study' ? frozenSelectionFile : path.join(env.outDir, 'FROZEN_SELECTION.json');
export const validationFileOf = (env: Env) => path.join(env.outDir, 'validation', 'validation.json');

// The original procedure's chronological path (5B's L0 arm, sealed; calendar days): the C vs A chronology reference.
export const originalSequential = {
  file: 'research/vg-lifecycle-matched-optimization/results/folds/sequential.json',
  sha256: '7bf8c74463461b963b2b98442978fcec53f994ff4ce8a8a52cd93ef0a932da30'
} as const;

export const originalPath = (): Sequential & { source: string } => {
  const f = path.join(repoRoot, originalSequential.file);

  if (sha256File(f) !== originalSequential.sha256)
    throw new Error(`${originalSequential.file} is not the pinned record`);

  const arm = readJson<{ arms: { mode: string; verdict: string; procedure: { net: number; sequentialDd: number } }[] }>(
    f
  ).arms.find((a) => a.mode === 'L0')!;

  return {
    ...verdictOf(arm.verdict),
    net: arm.procedure.net,
    dd: arm.procedure.sequentialDd,
    source: `${originalSequential.file} arms[L0]`
  };
};

const verdictOf = (v: string): { verdict: Sequential['verdict'] } => ({
  verdict: v.startsWith('chronologically supported')
    ? 'supported'
    : v.startsWith('chronologically incomplete')
      ? 'incomplete'
      : 'unsupported'
});

const pe = (e: Evidence | null): PrimaryEvidence | null =>
  e ? { net: e.centre.net, dd: e.centre.dd, confirmP10: e.confirm.p10, confirmP90Dd: e.confirm.p90Dd } : null;

const optionsOfEvidence = (e: { cfg: Cfg; control: string | null }) =>
  e.control ? optionsOfControl(controlOf(e.control)) : optionsOf(e.cfg);

export const freezeSelection = async (env: Env) => {
  const out = frozenFileOf(env);

  studyGuards(env);
  if (fs.existsSync(out)) throw new Error(`${path.relative(repoRoot, out)} exists: the selection is frozen`);

  const fin = finalOf(env);
  const selFile = selectionFile(env, fin);
  const diag = path.join(diagDir(env), 'diagnostics.json');
  const seqFile = path.join(env.outDir, 'folds', 'sequential.json');
  const xFile = crossFile(env, fin);
  const eFile = exportsFile(env, fin);

  for (const f of [selFile, diag, seqFile, xFile, eFile])
    if (!isSealed(f)) throw new Error(`${path.relative(repoRoot, f)} is not sealed`);

  const sel = readJson<SelectionRecord & { nearMisses: unknown[]; comparisons: unknown }>(selFile);
  const seq = readJson<{
    verdict: string;
    arms: { unit: Unit; verdict: string; procedure: { net: number; sequentialDd: number } }[];
  }>(seqFile);
  const exp = readJson<{ rows: ExportRow[] }>(eFile).rows;
  const ev = (label: string | null | undefined) => (label ? sel.evidence.find((e) => e.label === label)! : null);
  const control = (unit: Unit, k: string) => sel.evidence.find((e) => e.unit === unit && e.control === k) ?? null;
  const A = control('cal', 'NL0');
  const B = control('ses', 'NL0');
  const C = ev(sel.primary[searchUnit]);
  const informedBests = replicates
    .map((r) => ev(sel.roles[`${searchUnit}/informed R${r}`]?.roles['actual-profit'])?.centre.net)
    .filter((x): x is number => typeof x === 'number');
  const own = seq.arms.find((a) => a.unit === searchUnit)!;
  const sesPath: Sequential = { ...verdictOf(own.verdict), net: own.procedure.net, dd: own.procedure.sequentialDd };
  const orig = originalPath();
  const labels = {
    'B vs A (the convention on the fixed phenotype)': { ...comparisonLabel(pe(B), pe(A)), x: pe(B), y: pe(A) },
    'C vs A (re-optimized under sessions vs the frozen New L0)': {
      ...comparisonLabel(pe(C), pe(A), { replicateBests: informedBests, chron: { x: sesPath, y: orig } }),
      x: pe(C),
      y: pe(A),
      replicateBests: informedBests,
      chronology: { session: sesPath, original: orig }
    },
    'C vs B (the re-optimization effect under sessions)': {
      ...comparisonLabel(pe(C), pe(B), { replicateBests: informedBests }),
      x: pe(C),
      y: pe(B),
      replicateBests: informedBests
    }
  };
  const pinOf = (f: string) => ({ file: path.relative(repoRoot, f), sha256: sha256File(f) });
  const full = (e: Evidence | null, unitsToShow: readonly Unit[] = units) =>
    e
      ? {
          ...summary(e),
          settings: Object.fromEntries(unitsToShow.map((u) => [u, settingsOf(e.cfg, u, optionsOfEvidence(e))]))
        }
      : null;
  const record = {
    kind: 'vg-l0-session-hold frozen selection',
    schedule: env.schedule,
    frozenAt: new Date().toISOString(),
    gitHead: execSync('git rev-parse HEAD', { cwd: repoRoot }).toString().trim(),
    pins: {
      selection: pinOf(selFile),
      foldSelections: foldsOf(env)
        .filter((c) => c !== fin)
        .map((c) => pinOf(selectionFile(env, c))),
      sequential: pinOf(seqFile),
      crossTest: pinOf(xFile),
      exports: pinOf(eFile),
      diagnostics: pinOf(diag),
      protocolFreeze: env.schedule === 'study' ? pinOf(freezeFile) : null,
      parity: env.schedule === 'study' ? sha256File(path.join(resultsDir, 'parity', 'parity.json')) : null,
      referenceMethod: referenceMethodPin(),
      evaluationDigest: codeDigest(),
      closureDigest: closureDigest(codeClosure())
    },
    primaryRule:
      'the actual-profit role of the final selectable set under the session hold unit — the highest development centre net among qualified members (ties: selection robust net, centre DD, label); the controls New L0 (= B), C4, C4-refined and C85 under the session unit compete under the same gates and rule (the qualifying-incumbent fallback)',
    configurations: {
      A: {
        definition: 'New L0, frozen parameters, calendar-day holds (the historical control)',
        evidence: full(A, ['cal'])
      },
      B: {
        definition: 'New L0, the same parameters, trading-session holds (no re-optimization)',
        evidence: full(B, ['ses'])
      },
      C: {
        definition: 'this study’s primary: re-optimized under trading-session holds with reference method NL0 1.0.0',
        label: sel.primary[searchUnit] ?? null,
        isUnchangedIncumbent: C?.control ?? null,
        evidence: full(C)
      }
    },
    independentPrimary: full(ev(sel.independentPrimary[searchUnit])),
    informedPrimary: full(ev(sel.roles[`${searchUnit}/informed`]?.roles['actual-profit'])),
    searchedPrimary: full(ev(sel.roles[`${searchUnit}/searched`]?.roles['actual-profit'])),
    sequentialVerdict: own.verdict,
    roles: sel.roles,
    comparisons: sel.comparisons,
    nearMisses: sel.nearMisses,
    comparisonLabels: labels,
    labelRule:
      'labels.ts (PROTOCOL.md §11.1): development (centre net, confirmation p10, and for C the informed replicates’ agreement ≥ 4 of 6), risk (centre and confirmation p90 DD) and, for C vs A, chronology (the session study’s independent path against the original 5B L0 path); band $2,500; computed here, before the validation door opens; never changed by validation',
    finalSet: sel.evidence
      .filter((e) => e.selectable)
      .map((e) => ({ ...summary(e), settings: settingsOf(e.cfg, e.unit, optionsOfEvidence(e)) })),
    crossTestSubjects: exp.map((r) => ({
      row: r.row,
      id: r.id,
      control: r.control,
      principal: r.principal,
      exportedBy: r.exportedBy,
      quad: r.quad,
      options: r.options,
      settings: Object.fromEntries(units.map((u) => [u, settingsOf(r.cfg, u, r.options)]))
    })),
    validationPlan: {
      door: 'FULL (2016-01-04 → 2026-10-30, continuous; boundary 2024-12-31)',
      rows: 'every cross-test subject (export rows and fixed controls) under both hold units; VG #2 native (calendar)',
      tests: {
        V1: 'validation P&L (marked net 2026-10-30 − marked net at the 2024-12-31 close) > 0',
        V2: 'reset validation DD ≤ $35,000',
        V3: 'whole-run DD ≤ $35,000'
      },
      reportOnly: [
        'stresses on FULL (10 / 20 bps per side, 14% interest) for A, B, C (own unit), C under calendar days, the independent and informed primaries and C4 / C4-refined (both units)',
        'fresh confirmation rep 1 (128 draws) on FULL for A, B, C and the independent primary (own unit): median and p10 validation P&L, share positive, p90 validation DD, p90 whole-run DD, draws above $35,000',
        'full-history ledgers, annual P&L and annual reset drawdowns, refusals with occupants, exit reasons, holding periods (sessions and calendar days) and matched lots (B vs A, C vs A, C vs B) for A, B, C and C under calendar days',
        'known targets (New L0 = A: development $382,721.46 / $19,459.83; validation $96,883.72 / reset DD $20,385.99; full $479,605.18 / $20,385.99. C4: $302,785.91; $99,081.34 / $21,536.85; $401,867.24. C4-refined: $91,512.65 / $19,477.66; $452,082.36. D: $343,175.82; validation $74,688.80. VG #2 native: $334,911.93 / $21,303.61)'
      ],
      noFutilityStop: true
    }
  };

  if (env.schedule === 'study') sealJson(out, plain(record), 'frozen selection');
  else seal(env, out, plain(record), 'frozen selection');
  log(
    `frozen selection: C = ${record.configurations.C.label}; labels ${Object.entries(labels)
      .map(([k, v]) => `${k.split(' (')[0]}: ${v.label}`)
      .join('; ')} — commit it before the validation`
  );
  return record;
};

const yearEnds = (door: { dates: string[] }, last: string) => {
  const out: string[] = [];

  for (let i = 0; i + 1 < door.dates.length; i++)
    if (door.dates[i]!.slice(0, 4) !== door.dates[i + 1]!.slice(0, 4) && door.dates[i]! <= last)
      out.push(door.dates[i]!);
  return out;
};

export const runValidation = async (env: Env) => {
  const out = validationFileOf(env);
  const frozen = frozenFileOf(env);

  studyGuards(env);
  if (fs.existsSync(out)) throw new Error('the validation is sealed: it runs once');
  if (!isSealed(frozen)) throw new Error('the frozen selection is not sealed');
  if (env.schedule === 'study') assertCommitted(frozen);

  const fz = readJson<{
    configurations: { C: { label: string | null } };
    independentPrimary: { label: string } | null;
    informedPrimary: { label: string } | null;
    crossTestSubjects: {
      row: string;
      id: string;
      control: string | null;
      principal: boolean;
      exportedBy: { unit: Unit; label: string; roles: string[] }[];
      quad: Cfg['quad'];
      options: EvalOptions;
    }[];
  }>(frozen);
  const doorName = env.schedule === 'study' ? 'FULL' : 'D19';
  const boundary = env.schedule === 'study' ? chronology.developmentEnd : '2018-12-31';
  const door = await openStudyDoor(doorName, `${env.prefix}validation (guard ${sha256File(frozen).slice(0, 12)})`);
  let simulations = 0;
  const evalOne = (quad: Cfg['quad'], o: EvalOptions, unit: Unit) => {
    const oo = { ...o, boundaries: [boundary] };
    const x = runUnit(door, quad, oo, unit);
    const rec = recordOfRun(door, quad, x, oo, unit);
    const b = door.dates.indexOf(boundary);
    const lots = x.result.lots;

    simulations++;
    return {
      x,
      rec,
      boundaryEquity: rec.periods[0]!.equity,
      validationPnl: rec.periods[0]!.after,
      validationDd: rec.periods[0]!.dd,
      wholeDd: rec.dd,
      lotsAfter: lots.filter((l) => l.entryS > b).map((l) => l.book),
      crossing: lots.filter((l) => l.entryS <= b && (l.open || l.fills.at(-1)!.s > b)).map((l) => l.book),
      openAtEnd: lots.filter((l) => l.open).map((l) => ({ book: l.book, unrealized: r2(l.net) })),
      refusedAfter: x.result.funding.filter((f) => f.s > b && f.outcome === 'refused').length
    };
  };
  const rows = fz.crossTestSubjects.flatMap((m) =>
    units.map((unit) => {
      const v = evalOne(m.quad, m.options, unit);
      const tests = {
        V1: v.validationPnl > 0,
        V2: v.validationDd <= economics.ceiling,
        V3: v.wholeDd <= economics.ceiling
      };

      return {
        row: m.row,
        id: m.id,
        control: m.control,
        exportedBy: m.exportedBy,
        own: m.exportedBy.length > 0 && unit === searchUnit,
        unit,
        developmentNet: v.boundaryEquity,
        validationPnl: v.validationPnl,
        validationDd: v.validationDd,
        fullNet: v.rec.net,
        fullRealized: v.rec.realized,
        fullUnrealized: v.rec.unrealized,
        wholeDd: v.wholeDd,
        ddPeakT: v.rec.ddPeakT,
        ddTroughT: v.rec.ddTroughT,
        ddRecoveryT: v.rec.ddRecoveryT,
        years: v.rec.years,
        lotsAfterBoundary: v.lotsAfter,
        crossingBoundary: v.crossing,
        openAtEnd: v.openAtEnd,
        refusedAfterBoundary: v.refusedAfter,
        tests,
        passes: tests.V1 && tests.V2 && tests.V3,
        record: v.rec
      };
    })
  );
  const d = controlOf('D');
  const native = evalOne(d.cfg.quad, { ...optionsOfControl(d), d1Arm: 'native' }, 'cal');

  // the principal rows: A, B, C (+ C under 'cal'), the independent and informed primaries, C4, C4-refined
  const rowOfLabel = (label: string | null | undefined) =>
    label
      ? fz.crossTestSubjects.find(
          (r) =>
            r.exportedBy.some((b) => b.label === label) ||
            (r.control !== null && label.endsWith(`control: ${r.control}`))
        )
      : undefined;
  const nl0 = fz.crossTestSubjects.find((r) => r.control === 'NL0')!;
  const cRow = rowOfLabel(fz.configurations.C.label) ?? nl0;
  const focus: { label: string; row: string; unit: Unit }[] = [
    { label: 'A (New L0, calendar days)', row: nl0.row, unit: 'cal' },
    { label: 'B (New L0, sessions)', row: nl0.row, unit: 'ses' },
    { label: 'C (primary, sessions)', row: cRow.row, unit: 'ses' },
    { label: 'C under calendar days (cross row)', row: cRow.row, unit: 'cal' }
  ];
  const addFocus = (label: string, row: { row: string } | undefined, unit: Unit) => {
    if (row && !focus.some((f) => f.row === row.row && f.unit === unit)) focus.push({ label, row: row.row, unit });
  };

  addFocus('independent primary', rowOfLabel(fz.independentPrimary?.label), 'ses');
  addFocus('informed primary', rowOfLabel(fz.informedPrimary?.label), 'ses');
  for (const k of ['C4', 'C4R'])
    for (const u of units)
      addFocus(
        `control ${k}`,
        fz.crossTestSubjects.find((r) => r.control === k),
        u
      );

  const subjectOf = (row: string) => fz.crossTestSubjects.find((r) => r.row === row)!;
  const stresses = focus.map((f) => {
    const m = subjectOf(f.row);

    return {
      ...f,
      stresses: Object.fromEntries(
        Object.entries({
          'cost 10 bps': { costBps: 10 },
          'cost 20 bps': { costBps: 20 },
          'interest 14%': { rate: 0.14 }
        }).map(([k, fr]) => {
          const v = evalOne(m.quad, { ...m.options, friction: fr }, f.unit);

          return [
            k,
            { validationPnl: v.validationPnl, validationDd: v.validationDd, fullNet: v.rec.net, wholeDd: v.wholeDd }
          ];
        })
      )
    };
  });

  // full-history detail of A, B, C and C under 'cal': ledgers, annual figures (annual reset drawdowns), refusals,
  // exit reasons, holding periods, matched lots
  const dir = path.join(path.dirname(out), 'ledgers');
  const files: Record<string, string> = {};
  const writeCsv = (name: string, data: Record<string, unknown>[]) => {
    const f = path.join(dir, name);
    const text = csv(data);

    fs.mkdirSync(path.dirname(f), { recursive: true });
    fs.writeFileSync(f, text);
    fs.chmodSync(f, 0o444);
    files[path.relative(path.dirname(out), f)] = sha256Text(text);
  };
  const annual = yearEnds(door, door.dates.at(-1)!);
  const detailRuns = new Map<string, ReturnType<typeof runUnit>>();
  // within-calendar-year maximum minute drawdowns from the minute marks: each year's strict tracker starts at the marked
  // net of the previous year's last close (0 in the first year) and sees the year's marks only
  const calendarYearDd = (x: ReturnType<typeof runUnit>) => {
    const m = x.result.markChanges!;
    const ds = door.sym.VGT.ds;
    const out: Record<string, { start: number; end: number; pnl: number; dd: number }> = {};
    let prevEnd = 0;

    for (const y of [...new Set(door.dates.map((d) => d.slice(0, 4)))]) {
      const last = door.dates.findLastIndex((d) => d.startsWith(y));
      const end = x.result.daily[last]!;
      const t0 = door.dates.findIndex((d) => d.startsWith(y));
      const from = t0 > 0 ? ds.sCloseTime[t0 - 1]! : -Infinity;
      const to = ds.sCloseTime[last]!;
      let peak = prevEnd;
      let dd = 0;

      for (let i = 0; i < m.t.length; i++) {
        if (m.t[i]! <= from || m.t[i]! > to) continue;
        if (m.v[i]! > peak) peak = m.v[i]!;
        dd = Math.max(dd, peak - m.v[i]!);
      }
      out[y] = { start: r2(prevEnd), end: r2(end), pnl: r2(end - prevEnd), dd: r2(dd) };
      prevEnd = end;
    }
    return out;
  };
  const detail = focus.slice(0, 4).map((f) => {
    const m = subjectOf(f.row);
    const oo = { ...m.options, boundaries: annual };
    const x = runUnit(door, m.quad, oo, f.unit, true);
    const rec = recordOfRun(door, m.quad, x, oo, f.unit);
    const tag = f.label.split(' ')[0]!.replace(/[^A-Za-z]/g, '') + (f.label.includes('cross') ? '-cal' : '');

    simulations++;
    detailRuns.set(tag, x);
    writeCsv(`${tag}/lots.csv`, ledgerOf(door, x.result) as unknown as Record<string, unknown>[]);
    writeCsv(`${tag}/funding.csv`, fundingRows(door, x.result) as unknown as Record<string, unknown>[]);
    return {
      ...f,
      tag,
      id: m.id,
      years: rec.years,
      calendarYears: calendarYearDd(x),
      resetToEndAfterYearEnd: rec.periods.map((p) => ({ afterBoundary: p.boundary, pnlToEnd: p.after, ddToEnd: p.dd })),
      wholeRunDd: rec.dd,
      ddDaily: rec.ddDaily,
      lots: rec.lots,
      wins: rec.wins,
      losses: rec.losses,
      worstLoss: rec.worstLoss,
      largestWin: rec.largestWin,
      interest: rec.interest,
      costs: rec.costs,
      sessionsHeld: rec.sessionsHeld,
      books: rec.books,
      refusalsByOccupant: refusalsByOccupant(x.result),
      exitReasons: exitReasons(x.result),
      holding: holdingOf(door, x.result),
      holdingSessions: sessionHolding(door, x.result),
      drawdowns: drawdownEpisodes(door, x.result)
    };
  });
  const match = (a: string, b: string) => {
    const xa = detailRuns.get(a);
    const xb = detailRuns.get(b);

    if (!xa || !xb) return null;

    const m = matchLots(xa.result, xb.result);

    return { ...m, extendedShortened: extendedShortened(m) };
  };
  const matched = {
    'B vs A': match('B', 'A'),
    'C vs A': match('C', 'A'),
    'C vs B': match('C', 'B'),
    'C vs C-cal': match('C', 'C-cal')
  };

  const neighbourhoods = await withLab(
    {
      job: `${env.prefix}validation-neighbours`,
      door: doorName,
      purpose: `${env.prefix}validation neighbours`,
      workers: env.workers,
      ...(env.schedule === 'pilot'
        ? { memoryLog: path.join(cacheRoot, 'pilot', 'memory', `${env.prefix}validation-neighbours.jsonl`) }
        : {}),
      maxFresh: env.schedule === 'study' ? simulationCaps.final : undefined
    },
    async (lab) => {
      const res: Record<string, unknown>[] = [];

      for (const f of focus.filter(
        (x) => !x.label.startsWith('control') && !x.label.startsWith('informed') && !x.label.includes('cross')
      )) {
        const m = subjectOf(f.row);
        const c: Cfg = { inc: 'V', quad: m.quad };
        const draws = neighbourhood(c, {
          name: 'confirm',
          n: 128,
          labels: ['confirm', 1, finalOf(env)],
          scope: m.control === 'D' ? 'd1' : 'joint'
        });
        const recs = await lab.evalMany(
          draws.map((p) => ({ quad: p.cfg.quad, options: { ...m.options, boundaries: [boundary] }, unit: f.unit })),
          'validation:neighbours'
        );
        const after = recs.map((r) => r.periods[0]!.after).sort((a, b) => a - b);
        const dds = recs.map((r) => r.periods[0]!.dd).sort((a, b) => a - b);
        const whole = recs.map((r) => r.dd).sort((a, b) => a - b);

        res.push({
          ...f,
          n: recs.length,
          medianValidationPnl: r2(quantile(after, 0.5)),
          p10ValidationPnl: r2(quantile(after, 0.1)),
          positiveShare: Math.round((after.filter((x) => x > 0).length / Math.max(1, after.length)) * 1e4) / 1e4,
          p90ValidationDd: r2(quantile(dds, 0.9)),
          p90WholeRunDd: r2(quantile(whole, 0.9)),
          wholeRunAbove35k: whole.filter((x) => x > economics.ceiling).length
        });
      }
      return { res, compute: lab.compute };
    }
  );
  const ctl = (k: string, unit: Unit) => rows.find((r) => r.control === k && r.unit === unit);
  const got = (r: (typeof rows)[number] | undefined) =>
    r
      ? {
          development: r.developmentNet,
          validation: r.validationPnl,
          validationDd: r.validationDd,
          full: r.fullNet,
          fullDd: r.wholeDd
        }
      : null;
  const known = {
    'NL0 (A)': {
      development: 382721.46,
      validation: 96883.72,
      validationDd: 20385.99,
      full: 479605.18,
      fullDd: 20385.99,
      got: got(ctl('NL0', 'cal'))
    },
    C4: {
      development: 302785.91,
      validation: 99081.34,
      validationDd: 21536.85,
      full: 401867.24,
      fullDd: 21536.85,
      got: got(ctl('C4', 'cal'))
    },
    C4R: {
      development: 360569.71,
      validation: 91512.65,
      validationDd: 19477.66,
      full: 452082.36,
      fullDd: 19477.66,
      got: got(ctl('C4R', 'cal'))
    },
    D: {
      development: 268487.02,
      validation: 74688.8,
      validationDd: 21303.61,
      full: 343175.82,
      fullDd: 21303.61,
      got: got(ctl('D', 'cal'))
    },
    vg2Native: { full: 334911.93, fullDd: 21303.61, got: { full: native.rec.net, fullDd: native.wholeDd } }
  };
  const record = {
    stage: 'validation',
    door: door.name,
    boundary,
    guard: sha256File(frozen),
    rows,
    native: {
      fullNet: native.rec.net,
      wholeDd: native.wholeDd,
      validationPnl: native.validationPnl,
      record: native.rec
    },
    stresses,
    detail,
    matched,
    files,
    neighbourhoods,
    knownTargets: known,
    simulations,
    finished: new Date().toISOString()
  };

  seal(env, out, plain(record), 'validation');
  log(
    `validation: ${rows.filter((r) => r.passes).length}/${rows.length} rows pass V1–V3; A ${usd(ctl('NL0', 'cal')?.validationPnl)}, B ${usd(ctl('NL0', 'ses')?.validationPnl)}`
  );
  return record;
};

export { cfgId };
