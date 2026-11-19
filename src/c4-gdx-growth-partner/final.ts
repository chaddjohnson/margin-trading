// The frozen selection and the one-time validation (PROTOCOL.md §11.2, §11.3).
//
// FROZEN_SELECTION.json (sealed and committed before FULL opens): per arm the primary, every set's roles and rank orders,
// the baseline comparison labels, the partner candidate and the economic class; the cross-transfer set and its
// development results; the descriptive fold verdicts; the diagnostics' seal; every frozen member's complete effective
// configuration; the code and data pins; the recommendation rule and the validation plan.
//
// The validation (FULL, once, behind the guard): every frozen member, control and transfer in one continuous run
// 2016-01-04 → 2026-10-30. V1 validation P&L > 0; V2 reset validation DD ≤ $35,000; V3 whole-run DD ≤ $35,000.
// Report-only: stresses and the fresh whole-portfolio confirmation rep 1 on FULL (paired with the baseline on identical
// rows) for each arm's primary, partner candidate, best qualified partner, Appendix A control and baseline; the known
// full-history targets of C4, C4-refined and VG #2 native. A failed validation is a result: no new winner, no rescue
// search, no retuning, no swap of the primary.
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { type EvalOptions, type Rec, recordOf, run } from '../vg-d1-growth-joint/evaluate.ts';
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
import { c4Refined, c4Targets, loadControls, settingsOf } from './controls.ts';
import { type SelectionRecord, diagDir, finalOf, subjectsOf } from './diagnostics.ts';
import { openStudyDoor } from './doors.ts';
import { closureDigest, codeClosure } from './freeze.ts';
import { codeDigest, withLab } from './lab.ts';
import { summary } from './qualify.ts';
import { isSealed, plain, readJson, sealJson, sha256File, usd } from './records.ts';
import { type Env, assertCommitted, seal, selectionFile, studyGuards, transferFile } from './stages.ts';
import { type Arm, type Quad, arms, baselineLabel, optionsOfEnabled, pointId, rowsOf } from './space.ts';

export const frozenFileOf = (env: Env) =>
  env.schedule === 'study' ? frozenSelectionFile : path.join(env.outDir, 'FROZEN_SELECTION.json');
export const validationFileOf = (env: Env) => path.join(env.outDir, 'validation', 'validation.json');

export const recommendationRule = (arm: Arm) =>
  `add GDX Growth to ${baselineLabel[arm]} only if arm ${arm}'s partner candidate (the highest-net qualified GDX-enabled member dominating the baseline on development) exists, passes V1–V3 and is supported across later periods (validation P&L ≥ the baseline's); otherwise GDX Growth OFF remains preferable (the no-improvement fallback). No second candidate is promoted; validation never chooses a different member.`;

interface PlanMember {
  label: string;
  arm: Arm | null;
  role: string;
  id: string;
  quad: Quad;
  enabled: string[];
  options: EvalOptions;
}

export const freezeSelection = async (env: Env) => {
  const out = frozenFileOf(env);

  studyGuards(env);
  if (fs.existsSync(out)) throw new Error(`${path.relative(repoRoot, out)} exists: the selection is frozen`);

  const fin = finalOf(env);
  const selFile = selectionFile(env, fin);
  const diag = path.join(diagDir(env), 'diagnostics.json');
  const trFile = transferFile(env);
  const seqFile = path.join(env.outDir, 'folds', 'sequential.json');
  const needs = env.schedule === 'study' ? [selFile, diag, trFile, seqFile] : [selFile, diag, trFile];

  for (const f of needs) if (!isSealed(f)) throw new Error(`${path.relative(repoRoot, f)} is not sealed`);

  const sel = readJson<SelectionRecord & { nearMisses: unknown[] }>(selFile);
  const tr = readJson<{
    rows: { label: string; from: Arm; to: Arm; gdxId: string; summary: unknown; versusTargetBaseline: unknown }[];
    evidence: SelectionRecord['evidence'];
  }>(trFile);
  const seq = fs.existsSync(seqFile) ? readJson<{ arms: Record<Arm, { verdict: unknown }> }>(seqFile) : null;
  const subjects = subjectsOf(sel);
  const members: PlanMember[] = subjects.map((s) => ({
    label: s.label,
    arm: s.arm,
    role: s.role,
    id: s.ev.id,
    quad: s.ev.quad,
    enabled: s.ev.enabled,
    options: optionsOfEnabled(s.ev.enabled)
  }));

  for (const e of tr.evidence)
    members.push({
      label: e.label,
      arm: e.arm,
      role: 'cross-transfer (report-only)',
      id: e.id,
      quad: e.quad,
      enabled: e.enabled,
      options: optionsOfEnabled(e.enabled)
    });

  const record = {
    kind: 'c4-gdx-growth-partner frozen selection',
    schedule: env.schedule,
    frozenAt: new Date().toISOString(),
    gitHead: execSync('git rev-parse HEAD', { cwd: repoRoot }).toString().trim(),
    pins: {
      selection: { file: path.relative(repoRoot, selFile), sha256: sha256File(selFile) },
      diagnostics: { file: path.relative(repoRoot, diag), sha256: sha256File(diag) },
      transfers: { file: path.relative(repoRoot, trFile), sha256: sha256File(trFile) },
      sequential: seq ? { file: path.relative(repoRoot, seqFile), sha256: sha256File(seqFile) } : null,
      protocolFreeze:
        env.schedule === 'study' ? { file: path.relative(repoRoot, freezeFile), sha256: sha256File(freezeFile) } : null,
      parity: env.schedule === 'study' ? sha256File(path.join(resultsDir, 'parity', 'parity.json')) : null,
      evaluationDigest: codeDigest(),
      closureDigest: closureDigest(codeClosure())
    },
    primaryRule:
      "per arm, the actual-profit role of the arm's selectable set (its baseline with GDX OFF, its Appendix A control and its searched partners): the highest development centre net among qualified members (ties: selection robust net, centre DD, label)",
    primaries: sel.primaries,
    roles: sel.roles,
    assessments: sel.assessments,
    recommendationRules: Object.fromEntries(arms.map((a) => [a, recommendationRule(a)])),
    nearMisses: sel.nearMisses,
    transfers: tr.rows.map((r) => ({
      label: r.label,
      from: r.from,
      to: r.to,
      gdxId: r.gdxId,
      summary: r.summary,
      versusTargetBaseline: r.versusTargetBaseline
    })),
    chronology: seq ? Object.fromEntries(arms.map((a) => [a, seq.arms[a].verdict])) : null,
    frozenMembers: subjects.map((s) => ({
      ...summary(s.ev),
      role: s.role,
      settings: settingsOf({ quad: s.ev.quad, enabled: s.ev.enabled, id: s.ev.id, p3Id: s.ev.p3Id })
    })),
    validationPlan: {
      door: 'FULL (2016-01-04 → 2026-10-30, continuous; boundary 2024-12-31)',
      tests: {
        V1: 'validation P&L (marked net 2026-10-30 − marked net at the 2024-12-31 close) > 0',
        V2: 'reset validation DD ≤ $35,000',
        V3: 'whole-run DD ≤ $35,000'
      },
      members,
      reportOnly: [
        "stresses on FULL (10 / 20 bps, 14% interest) for each arm's primary, partner candidate, best qualified partner, Appendix A control and baseline",
        'the fresh whole-portfolio confirmation rep 1 (128 draws) on FULL for the same, paired with the baseline on identical rows: median validation P&L and its paired increment, share positive, p90 validation DD, draws above $35,000',
        `known targets: C4 development $${c4Targets.development.net} / $${c4Targets.development.dd}, validation $${c4Targets.validation.pnl} / $${c4Targets.validation.dd}, full $${c4Targets.full.net} / $${c4Targets.full.dd}; C4-refined development $${c4Refined.targets.development.net} / $${c4Refined.targets.development.dd}, validation $${c4Refined.targets.validation.pnl} / $${c4Refined.targets.validation.dd}, full $${c4Refined.targets.full.net} / $${c4Refined.targets.full.dd}; VG #2 native full $334,911.93 / $21,303.61`
      ]
    }
  };

  if (env.schedule === 'study') sealJson(out, plain(record), 'frozen selection');
  else seal(env, out, plain(record), 'frozen selection');
  log(`frozen selection: primaries ${JSON.stringify(sel.primaries)} — commit it before the validation`);
  return record;
};

const yearsOf = (r: Rec) => ({ '2025': r.years['2025'] ?? 0, '2026': r.years['2026'] ?? 0 });

export const runValidation = async (env: Env) => {
  const out = validationFileOf(env);
  const frozen = frozenFileOf(env);

  studyGuards(env);
  if (fs.existsSync(out)) throw new Error('the validation is sealed: it runs once');
  if (!isSealed(frozen)) throw new Error('the frozen selection is not sealed');
  if (env.schedule === 'study') assertCommitted(frozen);

  const fz = readJson<{
    primaries: Record<Arm, string | null>;
    assessments: Record<Arm, { partnerCandidate: string | null }>;
    validationPlan: { members: PlanMember[] };
  }>(frozen);
  const doorName = env.schedule === 'study' ? 'FULL' : 'D19';
  const boundary = env.schedule === 'study' ? chronology.developmentEnd : '2018-12-31';
  const door = await openStudyDoor(doorName, `${env.prefix}validation (guard ${sha256File(frozen).slice(0, 12)})`);
  const evalOne = (quad: Quad, o: EvalOptions) => {
    const oo = { ...o, boundaries: [boundary] };
    const x = run(door, quad, oo, true);
    const rec = recordOf(door, quad, x, oo);
    const b = door.dates.indexOf(boundary);
    const lots = x.result.lots;

    return {
      rec,
      boundaryEquity: rec.periods[0]!.equity,
      validationPnl: rec.periods[0]!.after,
      validationDd: rec.periods[0]!.dd,
      wholeDd: rec.dd,
      lotsAfter: lots.filter((l) => l.entryS > b).map((l) => l.book),
      crossing: lots.filter((l) => l.entryS <= b && (l.open || l.fills.at(-1)!.s > b)).map((l) => l.book),
      openAtEnd: lots.filter((l) => l.open).map((l) => ({ book: l.book, unrealized: r2(l.net) })),
      refusedAfter: x.result.funding.filter((f) => f.s > b && f.outcome === 'refused').length,
      gdxAfter: lots.filter((l) => l.entryS > b && l.book === 'G:GDX').length
    };
  };
  const members = [...fz.validationPlan.members];
  const d = loadControls().controls.find((c) => c.key === 'D')!;

  members.push({
    label: 'VG #2 native (Study 8 arming 2017-06-15)',
    arm: null,
    role: 'native bridge',
    id: '',
    quad: d.quad,
    enabled: d.enabled,
    options: { ...d.options, d1Arm: 'native' }
  });

  const rows = members.map((m) => {
    const v = evalOne(m.quad, m.options);
    const tests = {
      V1: v.validationPnl > 0,
      V2: v.validationDd <= economics.ceiling,
      V3: v.wholeDd <= economics.ceiling
    };

    return {
      label: m.label,
      arm: m.arm,
      role: m.role,
      id: m.id,
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
      gdxLotsAfterBoundary: v.gdxAfter,
      crossingBoundary: v.crossing,
      openAtEnd: v.openAtEnd,
      refusedAfterBoundary: v.refusedAfter,
      tests,
      passes: tests.V1 && tests.V2 && tests.V3,
      record: v.rec
    };
  });
  const row = (arm: Arm | null, label: string | null) =>
    label ? rows.find((r) => r.arm === arm && r.label === label) : undefined;
  const baseRow = (arm: Arm) => rows.find((r) => r.arm === arm && r.role.includes(`${arm} baseline`))!;
  const supported = (arm: Arm, label: string | null) => {
    const r = row(arm, label);
    const b = baseRow(arm);

    return r ? r.passes && r.validationPnl >= b.validationPnl : false;
  };
  const recommendations = Object.fromEntries(
    arms.map((arm) => {
      const cand = fz.assessments[arm].partnerCandidate;
      const r = row(arm, cand);
      const text = !cand
        ? `keep GDX Growth OFF beside ${baselineLabel[arm]}: no qualified partner dominates the baseline on development (no partner candidate)`
        : r?.passes && supported(arm, cand)
          ? `add GDX Growth: ${cand} dominates ${baselineLabel[arm]} on development, passes V1–V3 and is supported across later periods`
          : `keep GDX Growth OFF beside ${baselineLabel[arm]}: the partner candidate ${cand} ${r?.passes ? 'passes V1–V3 but trails the baseline in validation (not supported across later periods)' : 'fails validation'}`;

      return [arm, text];
    })
  );

  // report-only: stresses and the fresh whole-portfolio confirmation rep 1 on the validation door, paired
  const focus: { arm: Arm; label: string }[] = [];

  for (const arm of arms)
    for (const r of rows.filter(
      (x) =>
        x.arm === arm &&
        /baseline|actual-profit|partner candidate|best qualified partner|Appendix A control/.test(x.role)
    ))
      if (!focus.some((f) => f.arm === arm && f.label === r.label)) focus.push({ arm, label: r.label });

  const stressRows = focus.map((f) => {
    const m = members.find((x) => x.arm === f.arm && x.label === f.label)!;

    return {
      arm: f.arm,
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
      const perRow: Record<string, { after: number[]; dd: number[]; whole: number[] }> = {};

      for (const f of focus) {
        const m = members.find((x) => x.arm === f.arm && x.label === f.label)!;
        const built = {
          quad: m.quad,
          enabled: m.enabled as never,
          options: m.options,
          id: pointId(m.enabled as never, m.quad)
        };
        const rowsF = rowsOf(built as never, {
          name: 'confirm',
          n: 128,
          labels: ['confirm', 1, finalOf(env)],
          scope: 'joint'
        });
        const recs = await lab.evalMany(
          rowsF.map((p) => ({ quad: p.quad, options: { ...p.options, boundaries: [boundary] } })),
          'validation:neighbours'
        );

        perRow[`${f.arm}|${f.label}`] = {
          after: recs.map((r) => r.periods[0]!.after),
          dd: recs.map((r) => r.periods[0]!.dd),
          whole: recs.map((r) => r.dd)
        };
      }

      for (const f of focus) {
        const x = perRow[`${f.arm}|${f.label}`]!;
        const b = perRow[`${f.arm}|${baseRow(f.arm).label}`]!;
        const after = [...x.after].sort((p, q) => p - q);
        const dds = [...x.dd].sort((p, q) => p - q);
        const whole = [...x.whole].sort((p, q) => p - q);
        const delta = x.after.map((v, i) => v - b.after[i]!).sort((p, q) => p - q);

        res[`${f.arm}|${f.label}`] = {
          n: x.after.length,
          medianValidationPnl: r2(quantile(after, 0.5)),
          p10ValidationPnl: r2(quantile(after, 0.1)),
          positiveShare: Math.round((after.filter((v) => v > 0).length / Math.max(1, after.length)) * 1e4) / 1e4,
          p90ValidationDd: r2(quantile(dds, 0.9)),
          p90WholeRunDd: r2(quantile(whole, 0.9)),
          wholeRunAbove35k: whole.filter((v) => v > economics.ceiling).length,
          pairedVsBaseline: {
            medianDeltaValidationPnl: r2(quantile(delta, 0.5)),
            p10DeltaValidationPnl: r2(quantile(delta, 0.1)),
            p90DeltaValidationPnl: r2(quantile(delta, 0.9)),
            shareAboveBaseline:
              Math.round((x.after.filter((v, i) => v > b.after[i]!).length / Math.max(1, x.after.length)) * 1e4) / 1e4
          }
        };
      }
      return res;
    }
  );
  const target = (arm: Arm, t: typeof c4Targets | typeof c4Refined.targets) => {
    const b = baseRow(arm);

    return {
      development: { net: b.developmentNet, target: t.development.net },
      validation: { pnl: b.validationPnl, target: t.validation.pnl, dd: b.validationDd, ddTarget: t.validation.dd },
      full: { net: b.fullNet, target: t.full.net, dd: b.wholeDd, ddTarget: t.full.dd }
    };
  };
  const known = {
    C4: target('O', c4Targets),
    C4refined: target('R', c4Refined.targets),
    vg2Native: (() => {
      const n = rows.find((r) => r.role === 'native bridge')!;

      return { net: n.fullNet, target: 334911.93, dd: n.wholeDd, ddTarget: 21303.61 };
    })()
  };
  const record = {
    stage: 'validation',
    door: door.name,
    boundary,
    guard: sha256File(frozen),
    rows,
    recommendations,
    supported: Object.fromEntries(
      rows.filter((r) => r.arm).map((r) => [`${r.arm}|${r.label}`, supported(r.arm!, r.label)])
    ),
    stresses: stressRows,
    neighbourhoods,
    knownTargets: env.schedule === 'study' ? known : null,
    finished: new Date().toISOString()
  };

  seal(env, out, plain(record), 'validation');
  log(
    `validation: ${rows.filter((r) => r.passes).length}/${rows.length} pass V1–V3; ${JSON.stringify(recommendations)}; C4 ${usd(baseRow('O').validationPnl)}`
  );
  return record;
};
