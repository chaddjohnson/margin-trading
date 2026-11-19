// The frozen selection and the one-time validation (PROTOCOL.md §11.2, §11.3).
//
// FROZEN_SELECTION.json (sealed and committed before FULL opens): the primary (the actual-profit role of the C24
// selectable set), the independent lane's own primary, every set's roles, rank orders and Pareto sets, the fallback
// statement, the near misses, the descriptive labels against Appendix A, the chronological verdict, the diagnostics'
// seal, the Priority 4B export set, every frozen member's complete effective configuration, the code and data pins and
// the validation plan (tests and report-only perturbations), all fixed before any validation result exists.
//
// The validation (FULL, once, behind the guard): every frozen member, Appendix A, every prior control and cash in one
// continuous run 2016-01-04 → 2026-10-30. V1 validation P&L > 0; V2 reset validation DD ≤ $35,000; V3 whole-run DD
// ≤ $35,000. Report-only: stresses on FULL; the fresh confirmation rep 1 (128 draws) on FULL for the primary, the role
// holders, the independent primary and Appendix A; Appendix A's native full-history target. A failed validation is a
// result: no new winner, no rescue search, no retuning, no swap of the primary.
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { type EvalOptions, type Rec, episodesOf, recordOf, run } from '../vg-d1-growth-joint/evaluate.ts';
import { quantile } from '../vg-d1-growth-joint/fitness.ts';
import {
  cacheRoot,
  chronology,
  economics,
  freezeFile,
  frozenSelectionFile,
  log,
  r2,
  repoRoot,
  resultsDir
} from './context.ts';
import { appendixATarget, loadControls, settingsOf } from './controls.ts';
import { type SelectionRecord, diagDir, finalOf, lotsBetween, subjectsOf } from './diagnostics.ts';
import { openStudyDoor } from './doors.ts';
import { closureDigest, codeClosure } from './freeze.ts';
import { codeDigest, withLab } from './lab.ts';
import { summary } from './qualify.ts';
import { isSealed, plain, readJson, sealJson, sha256File, usd } from './records.ts';
import { type Env, assertCommitted, seal, selectionFile, studyGuards } from './stages.ts';
import { type Quad, buildS, rowsOf } from './space.ts';

export const frozenFileOf = (env: Env) =>
  env.schedule === 'study' ? frozenSelectionFile : path.join(env.outDir, 'FROZEN_SELECTION.json');
export const validationFileOf = (env: Env) => path.join(env.outDir, 'validation', 'validation.json');

interface PlanMember {
  label: string;
  role: string;
  id: string;
  quad: Quad;
  enabled: string[];
  options: EvalOptions;
}

const iso = (t: number) =>
  Number.isFinite(t) ? `${new Date(t * 1000).toISOString().slice(0, 16).replace('T', ' ')}Z` : null;

export const freezeSelection = async (env: Env) => {
  const out = frozenFileOf(env);

  studyGuards(env);
  if (fs.existsSync(out)) throw new Error(`${path.relative(repoRoot, out)} exists: the selection is frozen`);

  const fin = finalOf(env);
  const selFile = selectionFile(env, fin);
  const diag = path.join(diagDir(env), 'diagnostics.json');
  const seqFile = path.join(env.outDir, 'folds', 'sequential.json');
  const needs = env.schedule === 'study' ? [selFile, diag, seqFile] : [selFile, diag];

  for (const f of needs) if (!isSealed(f)) throw new Error(`${path.relative(repoRoot, f)} is not sealed`);

  const sel = readJson<SelectionRecord>(selFile);
  const seq = fs.existsSync(seqFile) ? readJson<{ verdict: string; policies: unknown[] }>(seqFile) : null;
  const subjects = subjectsOf(sel);
  const members: PlanMember[] = subjects.map((s) => ({
    label: s.label,
    role: s.role,
    id: s.ev.id,
    quad: s.ev.quad,
    enabled: s.ev.enabled,
    options: buildS(s.ev.gdx).options
  }));

  // every control (Appendix A, the prior controls) and cash run in the validation too (report)
  for (const c of loadControls())
    if (!members.some((m) => m.id === c.built.id))
      members.push({
        label: c.label,
        role: c.key === 'CASH' ? 'cash reference' : 'control (report)',
        id: c.built.id,
        quad: c.built.quad,
        enabled: c.built.enabled,
        options: c.built.options
      });

  // the Priority 4B export set (development-selected; frozen here, never chosen by validation): every role holder of
  // the final set, the independent primary, and Appendix A as the exact control
  const exportLabels = [
    ...new Set(
      [
        ...Object.values(sel.roles.final?.roles ?? {}),
        sel.independentPrimary,
        sel.evidence.find((e) => e.control === 'A')?.label ?? null
      ].filter((x): x is string => Boolean(x))
    )
  ];
  const evOf = (label: string) => sel.evidence.find((e) => e.label === label)!;
  const record = {
    kind: 'gdx-growth-standalone frozen selection',
    schedule: env.schedule,
    frozenAt: new Date().toISOString(),
    gitHead: execSync('git rev-parse HEAD', { cwd: repoRoot }).toString().trim(),
    pins: {
      selection: { file: path.relative(repoRoot, selFile), sha256: sha256File(selFile) },
      diagnostics: { file: path.relative(repoRoot, diag), sha256: sha256File(diag) },
      sequential: seq ? { file: path.relative(repoRoot, seqFile), sha256: sha256File(seqFile) } : null,
      protocolFreeze:
        env.schedule === 'study' ? { file: path.relative(repoRoot, freezeFile), sha256: sha256File(freezeFile) } : null,
      parity: env.schedule === 'study' ? sha256File(path.join(resultsDir, 'parity', 'parity.json')) : null,
      evaluationDigest: codeDigest(),
      closureDigest: closureDigest(codeClosure())
    },
    primaryRule:
      'the actual-profit role of the C24 selectable set (the independent and informed shortlists, Appendix A and the predeclared prior controls): the highest development centre net among qualified members (ties: selection robust net, centre DD, label). A qualifying control holding it is the qualifying-incumbent fallback; with no qualified member there is no supported standalone candidate.',
    primary: sel.primary,
    independentPrimary: sel.independentPrimary,
    fallback: sel.fallback,
    roles: sel.roles,
    versusAppendixA: sel.versusAppendixA,
    nearMisses: sel.nearMisses,
    chronology: seq ? { verdict: seq.verdict } : null,
    export4B: exportLabels.map((label) => ({
      ...summary(evOf(label)),
      roles: subjects.find((s) => s.label === label)?.role ?? '',
      settings: settingsOf({
        quad: evOf(label).quad,
        enabled: evOf(label).enabled as never,
        id: evOf(label).id,
        p3Id: evOf(label).p3Id
      })
    })),
    frozenMembers: subjects.map((s) => ({
      ...summary(s.ev),
      role: s.role,
      settings: settingsOf({ quad: s.ev.quad, enabled: s.ev.enabled as never, id: s.ev.id, p3Id: s.ev.p3Id })
    })),
    validationPlan: {
      door: 'FULL (2016-01-04 → 2026-10-30, continuous; boundary 2024-12-31)',
      tests: {
        V1: 'validation P&L (marked net 2026-10-30 − marked net at the 2024-12-31 close) > 0',
        V2: 'reset validation DD (the strict minute tracker restarted at the 2024-12-31 close) ≤ $35,000',
        V3: 'whole-run maximum minute DD ≤ $35,000'
      },
      members,
      meaning:
        'passing validation and beating a comparator are different questions, both reported; a failure is a result: no new winner, no rescue search, no retuning, no swap of the primary',
      reportOnly: [
        'stresses on FULL (10 / 20 bps per side, 14% interest) for every frozen subject',
        'the fresh confirmation rep 1 (128 draws, labels (confirm, 1, C24)) on FULL for every frozen subject: median and p10 validation P&L, share positive, p90 reset validation DD, p90 whole-run DD, draws above $35,000',
        `Appendix A's native full-history target: $${appendixATarget.net} net, $${appendixATarget.minuteDd} maximum minute DD, ${appendixATarget.closedTrades} closed trades (${appendixATarget.wins} wins / ${appendixATarget.losses} losses), flat at the end`
      ]
    }
  };

  if (env.schedule === 'study') sealJson(out, plain(record), 'frozen selection');
  else seal(env, out, plain(record), 'frozen selection');
  log(
    `frozen selection: primary ${sel.primary}; independent ${sel.independentPrimary} — commit it before the validation`
  );
  return record;
};

export const runValidation = async (env: Env) => {
  const out = validationFileOf(env);
  const frozen = frozenFileOf(env);

  studyGuards(env);
  if (fs.existsSync(out)) throw new Error('the validation is sealed: it runs once');
  if (!isSealed(frozen)) throw new Error('the frozen selection is not sealed');
  if (env.schedule === 'study') assertCommitted(frozen);

  const fz = readJson<{ primary: string | null; validationPlan: { members: PlanMember[] } }>(frozen);
  const doorName = env.schedule === 'study' ? 'FULL' : 'D19';
  const boundary = env.schedule === 'study' ? chronology.developmentEnd : '2018-12-31';
  const door = await openStudyDoor(doorName, `${env.prefix}validation (guard ${sha256File(frozen).slice(0, 12)})`);
  const b = door.dates.indexOf(boundary);
  const evalOne = (quad: Quad, o: EvalOptions) => {
    const oo = { ...o, boundaries: [boundary] };
    const x = run(door, quad, oo, true);
    const rec: Rec = recordOf(door, quad, x, oo);
    const lots = x.result.lots;
    const closed = lots.filter((l) => !l.open);

    return {
      rec,
      x,
      boundaryEquity: rec.periods[0]!.equity,
      validationPnl: rec.periods[0]!.after,
      validationDd: rec.periods[0]!.dd,
      wholeDd: rec.dd,
      lotsAfter: lots.filter((l) => l.entryS > b).length,
      crossing: lots.filter((l) => l.entryS <= b && (l.open || l.fills.at(-1)!.s > b)).length,
      openAtEnd: lots.filter((l) => l.open).map((l) => ({ entry: door.dates[l.entryS]!, unrealized: r2(l.net) })),
      closedTrades: closed.length,
      wins: closed.filter((l) => l.net > 0).length,
      losses: closed.filter((l) => l.net < 0).length,
      episodesAfter: episodesOf(x.result).filter((e) => e.first > b).length
    };
  };

  const rows = fz.validationPlan.members.map((m) => {
    const v = evalOne(m.quad, m.options);
    const tests = {
      V1: v.validationPnl > 0,
      V2: v.validationDd <= economics.ceiling,
      V3: v.wholeDd <= economics.ceiling
    };

    return {
      label: m.label,
      role: m.role,
      id: m.id,
      developmentNet: v.boundaryEquity,
      validationPnl: v.validationPnl,
      validationDd: v.validationDd,
      fullNet: v.rec.net,
      fullRealized: v.rec.realized,
      fullUnrealized: v.rec.unrealized,
      wholeDd: v.wholeDd,
      wholeDdPeak: iso(v.rec.ddPeakT),
      wholeDdTrough: iso(v.rec.ddTroughT),
      wholeDdRecovery: iso(v.rec.ddRecoveryT),
      wholeDdPositions: v.wholeDd > 0 ? lotsBetween(door, v.x.result, v.rec.ddPeakT, v.rec.ddTroughT) : [],
      years: { '2025': v.rec.years['2025'] ?? 0, '2026': v.rec.years['2026'] ?? 0 },
      lotsAfterBoundary: v.lotsAfter,
      episodesAfterBoundary: v.episodesAfter,
      crossingBoundary: v.crossing,
      openAtEnd: v.openAtEnd,
      closedTrades: v.closedTrades,
      wins: v.wins,
      losses: v.losses,
      tests,
      passes: tests.V1 && tests.V2 && tests.V3,
      record: v.rec
    };
  });

  const focus = rows.filter((r) => r.role !== 'control (report)' && r.role !== 'cash reference');
  const stressRows = focus.map((f) => {
    const m = fz.validationPlan.members.find((x) => x.label === f.label)!;

    return {
      label: f.label,
      stresses: Object.fromEntries(
        Object.entries({
          'cost 10 bps': { costBps: 10 },
          'cost 20 bps': { costBps: 20 },
          'interest 14%': { rate: 0.14 }
        }).map(([k, fr]) => {
          const v = evalOne(m.quad, { ...m.options, friction: fr });

          return [
            k,
            { validationPnl: v.validationPnl, validationDd: v.validationDd, fullNet: v.rec.net, wholeDd: v.wholeDd }
          ];
        })
      )
    };
  });
  const neighbourhoods = await withLab(
    {
      job: `${env.prefix}validation-neighbours`,
      door: doorName,
      purpose: `${env.prefix}validation neighbours`,
      workers: env.workers,
      ...(env.schedule === 'pilot'
        ? { memoryLog: path.join(cacheRoot, 'pilot', 'memory', `${env.prefix}validation-neighbours.jsonl`) }
        : {})
    },
    async (lab) => {
      const res: Record<string, unknown> = {};

      for (const f of focus) {
        const m = fz.validationPlan.members.find((x) => x.label === f.label)!;

        if (!m.enabled.includes('G:GDX')) continue;

        const built = buildS(m.quad.g.GDX);
        const rowsF = rowsOf(built, { name: 'confirm', n: 128, labels: ['confirm', 1, finalOf(env)], scope: 'joint' });
        const recs = await lab.evalMany(
          rowsF.map((p) => ({ quad: p.quad, options: { ...p.options, boundaries: [boundary] } })),
          'validation:neighbours'
        );
        const after = recs.map((r) => r.periods[0]!.after).sort((p, q) => p - q);
        const dds = recs.map((r) => r.periods[0]!.dd).sort((p, q) => p - q);
        const whole = recs.map((r) => r.dd).sort((p, q) => p - q);

        res[f.label] = {
          n: recs.length,
          medianValidationPnl: r2(quantile(after, 0.5)),
          p10ValidationPnl: r2(quantile(after, 0.1)),
          positiveShare: Math.round((after.filter((v) => v > 0).length / Math.max(1, after.length)) * 1e4) / 1e4,
          p90ValidationDd: r2(quantile(dds, 0.9)),
          p90WholeRunDd: r2(quantile(whole, 0.9)),
          wholeRunAbove35k: whole.filter((v) => v > economics.ceiling).length
        };
      }
      return res;
    }
  );
  const appA = rows.find((r) => r.label === 'control: Appendix A');
  const record = {
    stage: 'validation',
    door: door.name,
    boundary,
    guard: sha256File(frozen),
    primary: fz.primary,
    rows,
    stresses: stressRows,
    neighbourhoods,
    appendixATarget:
      env.schedule === 'study' && appA
        ? {
            target: appendixATarget,
            reproduced: {
              net: appA.fullNet,
              minuteDd: appA.wholeDd,
              closedTrades: appA.closedTrades,
              wins: appA.wins,
              losses: appA.losses,
              open: appA.openAtEnd.length
            },
            exact:
              Math.abs(appA.fullNet - appendixATarget.net) < 0.005 &&
              Math.abs(appA.wholeDd - appendixATarget.minuteDd) < 0.005 &&
              appA.closedTrades === appendixATarget.closedTrades &&
              appA.openAtEnd.length === appendixATarget.open
          }
        : null,
    finished: new Date().toISOString()
  };

  seal(env, out, plain(record), 'validation');
  log(
    `validation: ${rows.filter((r) => r.passes).length}/${rows.length} pass V1–V3; primary ${fz.primary}: ${usd(rows.find((r) => r.label === fz.primary)?.validationPnl)}`
  );
  return record;
};
