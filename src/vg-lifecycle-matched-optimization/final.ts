// The frozen selection and the one-time validation (PROTOCOL.md §11.4, §11.5).
//
// FROZEN_SELECTION.json (sealed and committed before FULL opens): every arm's C24 primaries and roles with complete
// effective configurations, the seed-level roles, the C24 cross-test subjects (export rows) and the sealed cross-test
// and diagnostics records, the fold selections and the sequential verdicts, the frozen EVIDENCE LABELS (L1 vs L0,
// L2 vs L0; development and folds only), the code and data pins and the validation plan (tests and report-only
// perturbations). There is no futility stop: the validation always runs once.
//
// The validation (FULL, once, behind the guard): every C24 export row and every fixed control, unchanged, under L0, L1
// and L2 in one continuous run 2016-01-04 → 2026-10-30 each (state and marks preserved across 2024-12-31). V1 validation
// P&L > 0; V2 reset validation DD ≤ $35,000; V3 whole-run DD ≤ $35,000. Report-only: the stresses and the fresh
// confirmation rep 1 (128 draws) on FULL for each arm's final and independent primaries (own lifecycle) and for C4 and
// C4-refined (every lifecycle); the known full-history targets (C4, C4-refined, VG #2 native, 5A's L0/L1/L2 targets).
// A failed validation is a result: no new winner, no rescue search, no retuning, no relabelling.
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { type EvalOptions, type Rec, recordOf } from '../vg-d1-growth-joint/evaluate.ts';
import { quantile } from '../vg-d1-growth-joint/fitness.ts';
import { simulationCaps } from './budgets.ts';
import { type Mode, cacheRoot, chronology, economics, freezeFile, frozenSelectionFile, log, modes, r2, repoRoot, resultsDir } from './context.ts';
import { type Cfg, neighbourhood, optionsOf } from './config.ts';
import { controlOf, settingsOf } from './controls.ts';
import { type ExportRow, crossFile, exportsFile } from './crosstest.ts';
import { type SelectionRecord, diagDir, finalOf, foldsOf } from './diagnostics.ts';
import { openStudyDoor } from './doors.ts';
import { closureDigest, codeClosure } from './freeze.ts';
import { codeDigest, withLab } from './lab.ts';
import { type ArmEvidence, evidenceLabel } from './labels.ts';
import { runLife } from './life.ts';
import { summary } from './qualify.ts';
import { isSealed, plain, readJson, sealJson, sha256File, usd } from './records.ts';
import { type Env, assertCommitted, seal, selectionFile, studyGuards } from './stages.ts';

export const frozenFileOf = (env: Env) =>
  env.schedule === 'study' ? frozenSelectionFile : path.join(env.outDir, 'FROZEN_SELECTION.json');
export const validationFileOf = (env: Env) => path.join(env.outDir, 'validation', 'validation.json');

const consideration = {
  A: {
    originalVerdict: 'fails Q3 (Priority 3, sealed: confirmation p90 DD $36,277.63; 3B fresh instrument $35,879.73)',
    consideration: 'Priority 3A brief and the 3B brief §7: the user accepts considering A/B despite small historical neighbourhood threshold misses; research consideration only'
  },
  B: { originalVerdict: 'fails Q3 (Priority 3, sealed: confirmation p90 DD $35,131.47; 3B $35,149.46)', consideration: 'as for A' },
  E: { originalVerdict: 'not qualified by Priority 3 (archived p90 DD $35,245.92); fails Q3 in 3B ($35,057.52)', consideration: 'an exact control' }
} as const;

type SeqArm = { mode: Mode; verdict: string; procedure: { net: number; sequentialDd: number } };

// The arm evidence of the frozen labels (development and folds only).
export const armEvidenceOf = (sel: SelectionRecord, seq: { arms: SeqArm[] }, mode: Mode): ArmEvidence => {
  const ev = (label: string | null) => (label ? sel.evidence.find((e) => e.label === label)! : null);
  const p = ev(sel.primary[mode]);
  const best = (r: number) => {
    const label = sel.roles[`${mode}/independent R${r}`]?.roles['actual-profit'] ?? null;

    return label ? ev(label)!.centre.net : null;
  };
  const a = seq.arms.find((x) => x.mode === mode)!;

  return {
    finalPrimary: p ? { net: p.centre.net, dd: p.centre.dd, confirmP10: p.confirm.p10, confirmP90Dd: p.confirm.p90Dd } : null,
    replicateBest: [best(1), best(2)],
    sequential: {
      verdict: a.verdict.startsWith('chronologically supported')
        ? 'supported'
        : a.verdict.startsWith('chronologically incomplete')
          ? 'incomplete'
          : 'unsupported',
      net: a.procedure.net,
      dd: a.procedure.sequentialDd
    }
  };
};

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

  for (const f of [selFile, diag, seqFile, xFile, eFile]) if (!isSealed(f)) throw new Error(`${path.relative(repoRoot, f)} is not sealed`);

  const sel = readJson<SelectionRecord & { nearMisses: unknown[]; comparisons: unknown }>(selFile);
  const seq = readJson<{ arms: SeqArm[] }>(seqFile);
  const exp = readJson<{ rows: ExportRow[] }>(eFile).rows;
  const ev = (label: string | null) => (label ? sel.evidence.find((e) => e.label === label)! : null);
  const armEv = Object.fromEntries(modes.map((m) => [m, armEvidenceOf(sel, seq, m)])) as Record<Mode, ArmEvidence>;
  const labels = Object.fromEntries((['L1', 'L2'] as const).map((m) => [m, { ...evidenceLabel(armEv[m], armEv.L0), evidence: armEv[m], l0: armEv.L0 }]));
  const pinOf = (f: string) => ({ file: path.relative(repoRoot, f), sha256: sha256File(f) });
  const record = {
    kind: 'vg-lifecycle-matched-optimization frozen selection',
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
      evaluationDigest: codeDigest(),
      closureDigest: closureDigest(codeClosure())
    },
    primaryRule:
      'per arm: the actual-profit role of its final selectable set — the highest development centre net among qualified members (ties: selection robust net, centre DD, label); the controls C4, C4-refined, C85, E, A and B compete under the same gates and rule (the qualifying-incumbent fallback)',
    arms: Object.fromEntries(
      modes.map((m) => [
        m,
        {
          primary: ev(sel.primary[m]) ? { ...summary(ev(sel.primary[m])!), settings: settingsOf(ev(sel.primary[m])!.cfg, m) } : null,
          independentPrimary: ev(sel.independentPrimary[m])
            ? { ...summary(ev(sel.independentPrimary[m])!), settings: settingsOf(ev(sel.independentPrimary[m])!.cfg, m) }
            : null,
          sequentialVerdict: seq.arms.find((a) => a.mode === m)!.verdict
        }
      ])
    ),
    roles: sel.roles,
    comparisons: sel.comparisons,
    nearMisses: sel.nearMisses,
    consideration: Object.fromEntries(
      Object.entries(consideration).map(([k, v]) => [
        k,
        {
          ...v,
          studyVerdicts: Object.fromEntries(
            modes.map((m) => {
              const e = sel.evidence.find((x) => x.control === k && x.mode === m);

              return [m, e ? (e.qualified ? 'qualified' : `fails ${e.failed.join(', ')}`) : 'not evaluated'];
            })
          )
        }
      ])
    ),
    evidenceLabels: labels,
    labelRule: 'labels.ts (PROTOCOL.md §11.1): development (C24 primaries, matched-seed replicates, confirmation p10), risk (centre and confirmation p90 DD) and chronology (each arm’s sequential path); band $2,500; computed here, before the validation door opens; never changed by validation',
    finalSet: sel.evidence.filter((e) => e.selectable).map((e) => ({ ...summary(e), settings: settingsOf(e.cfg, e.mode) })),
    crossTestSubjects: exp.map((r) => ({ row: r.row, id: r.id, control: r.control, principal: r.principal, exportedBy: r.exportedBy, quad: r.quad, options: r.options, settings: r.cfg ? settingsOf(r.cfg, 'L0') : null })),
    validationPlan: {
      door: 'FULL (2016-01-04 → 2026-10-30, continuous; boundary 2024-12-31)',
      rows: 'every cross-test subject (export rows and fixed controls) under L0, L1 and L2; VG #2 native (L0)',
      tests: {
        V1: 'validation P&L (marked net 2026-10-30 − marked net at the 2024-12-31 close) > 0',
        V2: 'reset validation DD ≤ $35,000',
        V3: 'whole-run DD ≤ $35,000'
      },
      reportOnly: [
        'stresses on FULL (10 / 20 bps per side, 14% interest) for each arm’s final and independent primaries (own lifecycle) and C4 / C4-refined (every lifecycle)',
        'fresh confirmation rep 1 (128 draws) on FULL for the same: median and p10 validation P&L, share positive, p90 validation DD, p90 whole-run DD, draws above $35,000',
        'known targets: C4 L0 (development $302,785.91; validation $99,081.34 / $21,536.85; full $401,867.24 / $21,536.85); C4-refined L0 (full $452,082.36 / $19,477.66; validation $91,512.65); VG #2 native full $334,911.93 / $21,303.61; 5A full L0/L1/L2 of C4, C85, E, A, B, GP85, IP'
      ],
      noFutilityStop: true
    }
  };

  if (env.schedule === 'study') sealJson(out, plain(record), 'frozen selection');
  else seal(env, out, plain(record), 'frozen selection');
  log(`frozen selection: labels L1 ${labels.L1!.label}, L2 ${labels.L2!.label} — commit it before the validation`);
  return record;
};

const yearsOf = (r: Rec) => ({ '2025': r.years['2025'] ?? 0, '2026': r.years['2026'] ?? 0 });

// 5A's sealed full-history targets (research/vg-growth-funding-lifecycle/REPORT.md §5, results/full/full.json).
export const p5aFullTargets: Record<string, Record<Mode, number>> = {
  C4: { L0: 401867.24, L1: 404867.51, L2: 404867.51 },
  C85: { L0: 339905.35, L1: 339905.35, L2: 335296.06 },
  E: { L0: 441831.21, L1: 437794.15, L2: 437794.15 },
  A: { L0: 450270.82, L1: 438574.43, L2: 438574.43 },
  B: { L0: 408898.55, L1: 404861.49, L2: 400252.2 },
  GP85: { L0: 129919.69, L1: 129919.69, L2: 125310.4 },
  IP: { L0: 306452.6, L1: 223395.47, L2: 223395.47 },
  D: { L0: 343175.82, L1: 343175.82, L2: 343175.82 }
};

export const runValidation = async (env: Env) => {
  const out = validationFileOf(env);
  const frozen = frozenFileOf(env);

  studyGuards(env);
  if (fs.existsSync(out)) throw new Error('the validation is sealed: it runs once');
  if (!isSealed(frozen)) throw new Error('the frozen selection is not sealed');
  if (env.schedule === 'study') assertCommitted(frozen);

  const fz = readJson<{
    arms: Record<Mode, { primary: { label: string } | null; independentPrimary: { label: string } | null }>;
    crossTestSubjects: { row: string; id: string; control: string | null; exportedBy: { mode: Mode; label: string; roles: string[] }[]; quad: Cfg['quad']; options: EvalOptions }[];
  }>(frozen);
  const doorName = env.schedule === 'study' ? 'FULL' : 'D19';
  const boundary = env.schedule === 'study' ? chronology.developmentEnd : '2018-12-31';
  const door = await openStudyDoor(doorName, `${env.prefix}validation (guard ${sha256File(frozen).slice(0, 12)})`);
  let simulations = 0;
  const evalOne = (quad: Cfg['quad'], o: EvalOptions, mode: Mode) => {
    const oo = { ...o, boundaries: [boundary] };
    const x = runLife(door, quad, oo, mode);
    const rec = recordOf(door, quad, x, oo);
    const b = door.dates.indexOf(boundary);
    const lots = x.result.lots;

    simulations++;
    return {
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
    modes.map((mode) => {
      const v = evalOne(m.quad, m.options, mode);
      const tests = { V1: v.validationPnl > 0, V2: v.validationDd <= economics.ceiling, V3: v.wholeDd <= economics.ceiling };

      return {
        row: m.row,
        id: m.id,
        control: m.control,
        exportedBy: m.exportedBy,
        own: m.exportedBy.some((b) => b.mode === mode),
        mode,
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
        years: yearsOf(v.rec),
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
  const native = evalOne(d.quad, { ...d.options, d1Arm: 'native' }, 'L0');

  // report-only perturbations: the primaries (own lifecycle) and C4 / C4-refined (every lifecycle)
  const focus: { label: string; row: string; mode: Mode }[] = [];

  for (const mode of modes)
    for (const k of ['primary', 'independentPrimary'] as const) {
      const label = fz.arms[mode][k]?.label;
      const row = label ? fz.crossTestSubjects.find((r) => r.exportedBy.some((b) => b.mode === mode && b.label === label)) : undefined;

      if (row && !focus.some((f) => f.row === row.row && f.mode === mode)) focus.push({ label: `${mode} ${k}`, row: row.row, mode });
    }
  for (const k of ['C4', 'C4R']) {
    const row = fz.crossTestSubjects.find((r) => r.control === k);

    if (row) for (const mode of modes) if (!focus.some((f) => f.row === row.row && f.mode === mode)) focus.push({ label: `control ${k}`, row: row.row, mode });
  }

  const stresses = focus.map((f) => {
    const m = fz.crossTestSubjects.find((r) => r.row === f.row)!;

    return {
      ...f,
      stresses: Object.fromEntries(
        Object.entries({ 'cost 10 bps': { costBps: 10 }, 'cost 20 bps': { costBps: 20 }, 'interest 14%': { rate: 0.14 } }).map(([k, fr]) => {
          const v = evalOne(m.quad, { ...m.options, friction: fr }, f.mode);

          return [k, { validationPnl: v.validationPnl, validationDd: v.validationDd, fullNet: v.rec.net, wholeDd: v.wholeDd }];
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
      ...(env.schedule === 'pilot' ? { memoryLog: path.join(cacheRoot, 'pilot', 'memory', `${env.prefix}validation-neighbours.jsonl`) } : {}),
      maxFresh: env.schedule === 'study' ? simulationCaps.final : undefined
    },
    async (lab) => {
      const res: Record<string, unknown>[] = [];

      for (const f of focus) {
        const m = fz.crossTestSubjects.find((r) => r.row === f.row)!;
        const inc = m.options.enabled?.['G:GDX'] === false ? 'V' : m.options.enabled?.['G:VGT'] === false ? 'G' : 'B';
        const c: Cfg = { inc, quad: m.quad };
        const draws = neighbourhood(c, { name: 'confirm', n: 128, labels: ['confirm', 1, finalOf(env)] });
        const recs = await lab.evalMany(
          draws.map((p) => ({ quad: p.cfg.quad, options: { ...optionsOf(p.cfg), boundaries: [boundary] }, mode: f.mode })),
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
  const ctl = (k: string, mode: Mode) => rows.find((r) => r.control === k && r.mode === mode);
  const known = {
    C4: { development: 302785.91, validation: 99081.34, validationDd: 21536.85, full: 401867.24, fullDd: 21536.85, got: ctl('C4', 'L0') ? { development: ctl('C4', 'L0')!.developmentNet, validation: ctl('C4', 'L0')!.validationPnl, validationDd: ctl('C4', 'L0')!.validationDd, full: ctl('C4', 'L0')!.fullNet, fullDd: ctl('C4', 'L0')!.wholeDd } : null },
    C4R: { validation: 91512.65, validationDd: 19477.66, full: 452082.36, fullDd: 19477.66, got: ctl('C4R', 'L0') ? { validation: ctl('C4R', 'L0')!.validationPnl, validationDd: ctl('C4R', 'L0')!.validationDd, full: ctl('C4R', 'L0')!.fullNet, fullDd: ctl('C4R', 'L0')!.wholeDd } : null },
    vg2Native: { full: 334911.93, fullDd: 21303.61, got: { full: native.rec.net, fullDd: native.wholeDd } },
    p5aFull: Object.fromEntries(
      Object.entries(p5aFullTargets).map(([k, t]) => [k, Object.fromEntries(modes.map((m) => [m, { target: t[m], got: ctl(k, m)?.fullNet ?? null }]))])
    )
  };
  const record = {
    stage: 'validation',
    door: door.name,
    boundary,
    guard: sha256File(frozen),
    rows,
    native: { fullNet: native.rec.net, wholeDd: native.wholeDd, validationPnl: native.validationPnl, record: native.rec },
    stresses,
    neighbourhoods,
    knownTargets: known,
    simulations,
    finished: new Date().toISOString()
  };

  seal(env, out, plain(record), 'validation');
  log(`validation: ${rows.filter((r) => r.passes).length}/${rows.length} rows pass V1–V3; C4 L0 validation ${usd(ctl('C4', 'L0')?.validationPnl)}`);
  return record;
};
