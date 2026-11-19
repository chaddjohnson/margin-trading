// The frozen selection and the one-time validation (PROTOCOL.md §11.2, §11.3).
//
// FROZEN_SELECTION.json (sealed and committed before FULL opens): the primary, every set's roles, rank orders and Pareto
// sets, every final-set member's complete effective configuration, the C4 labels, the replacement candidate, the near
// misses, the consideration fields of A, B and E, the chronological verdict, the diagnostics' seal, the code and data
// pins and the validation plan.
//
// The validation (FULL, once, behind the guard): every frozen member and control in one continuous run 2016-01-04 →
// 2026-10-30. V1 validation P&L > 0; V2 reset validation DD ≤ $35,000; V3 whole-run DD ≤ $35,000. Report-only: stresses
// and the fresh confirmation rep 1 on FULL for the primary, the replacement candidate and C4; the known full-history
// targets of C4 and VG #2 native. A failed validation is a result: no new winner, no rescue search, no retuning.
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { type EvalOptions, type Rec, recordOf, run } from '../vg-d1-growth-joint/evaluate.ts';
import { quantile } from '../vg-d1-growth-joint/fitness.ts';
import { cacheRoot, chronology, economics, freezeFile, frozenSelectionFile, log, r2, repoRoot, resultsDir } from './context.ts';
import { type Cfg, cfgId, neighbourhood, optionsOf } from './config.ts';
import { loadControls, settingsOf } from './controls.ts';
import { diagDir, finalOf, subjectsOf, type SelectionRecord } from './diagnostics.ts';
import { openStudyDoor } from './doors.ts';
import { codeDigest } from './lab.ts';
import { closureDigest, codeClosure } from './freeze.ts';
import { withLab } from './lab.ts';
import { summary } from './qualify.ts';
import { isSealed, plain, readJson, sealJson, sha256File, usd } from './records.ts';
import { type Env, assertCommitted, seal, selectionFile, studyGuards } from './stages.ts';

export const frozenFileOf = (env: Env) =>
  env.schedule === 'study' ? frozenSelectionFile : path.join(env.outDir, 'FROZEN_SELECTION.json');
export const validationFileOf = (env: Env) => path.join(env.outDir, 'validation', 'validation.json');

const consideration = {
  A: {
    originalVerdict: 'fails Q3 (Priority 3, sealed: confirmation p90 DD $36,277.63)',
    consideration: 'Priority 3A brief and this brief §7 (2026-11-09): the user accepts considering A/B despite small historical neighbourhood threshold misses; research consideration only'
  },
  B: {
    originalVerdict: 'fails Q3 (Priority 3, sealed: confirmation p90 DD $35,131.47)',
    consideration: 'as for A'
  },
  E: {
    originalVerdict: 'not qualified by Priority 3 (new in Priority 5A; archived p90 DD $35,245.92, 11.5% above $35,000)',
    consideration: 'this brief §4: an exact control and informed seed'
  }
} as const;

export const freezeSelection = async (env: Env) => {
  const out = frozenFileOf(env);

  studyGuards(env);
  if (fs.existsSync(out)) throw new Error(`${path.relative(repoRoot, out)} exists: the selection is frozen`);

  const fin = finalOf(env);
  const selFile = selectionFile(env, fin);
  const diag = path.join(diagDir(env), 'diagnostics.json');
  const seqFile = path.join(env.outDir, 'folds', 'sequential.json');

  for (const f of [selFile, diag, seqFile]) if (!isSealed(f)) throw new Error(`${path.relative(repoRoot, f)} is not sealed`);

  const sel = readJson<SelectionRecord & { roles: Record<string, { roles: Record<string, string | null> }>; nearMisses: unknown[] }>(selFile);
  const seq = readJson<{ verdict: string }>(seqFile);
  const ev = (label: string) => sel.evidence.find((e) => e.label === label)!;
  const subjects = subjectsOf(sel);
  const finalMembers = sel.evidence.filter((e) => e.selectable);
  const record = {
    kind: 'vg-d1-growth-expanded frozen selection',
    schedule: env.schedule,
    frozenAt: new Date().toISOString(),
    gitHead: execSync('git rev-parse HEAD', { cwd: repoRoot }).toString().trim(),
    pins: {
      selection: { file: path.relative(repoRoot, selFile), sha256: sha256File(selFile) },
      diagnostics: { file: path.relative(repoRoot, diag), sha256: sha256File(diag) },
      sequential: { file: path.relative(repoRoot, seqFile), sha256: sha256File(seqFile) },
      protocolFreeze: env.schedule === 'study' ? { file: path.relative(repoRoot, freezeFile), sha256: sha256File(freezeFile) } : null,
      parity: env.schedule === 'study' ? sha256File(path.join(resultsDir, 'parity', 'parity.json')) : null,
      evaluationDigest: codeDigest(),
      closureDigest: closureDigest(codeClosure())
    },
    primary: sel.primary ? { ...summary(ev(sel.primary)), settings: settingsOf(ev(sel.primary).cfg) } : null,
    primaryRule: 'the actual-profit role of the final selectable set: the highest development centre net among qualified members (ties: selection robust net, centre DD, label)',
    roles: sel.roles,
    c4: sel.c4,
    recommendationRule:
      'replace C4 only if the replacement candidate (the highest-net qualified final member dominating C4 on development) exists, passes V1–V3 and is supported across later periods (V1–V3 pass and validation P&L ≥ C4’s); otherwise C4 remains the preferred configuration. No second candidate is promoted.',
    nearMisses: sel.nearMisses,
    consideration: Object.fromEntries(
      Object.entries(consideration).map(([k, v]) => {
        const e = sel.evidence.find((x) => x.control === k);

        return [k, { ...v, studyVerdict: e ? (e.qualified ? 'qualified (fresh instrument)' : `fails ${e.failed.join(', ')} (fresh instrument)`) : 'not evaluated' }];
      })
    ),
    chronology: seq.verdict,
    finalSet: finalMembers.map((e) => ({ ...summary(e), settings: settingsOf(e.cfg) })),
    validationPlan: {
      door: 'FULL (2016-01-04 → 2026-10-30, continuous; boundary 2024-12-31)',
      tests: {
        V1: 'validation P&L (marked net 2026-10-30 − marked net at the 2024-12-31 close) > 0',
        V2: 'reset validation DD ≤ $35,000',
        V3: 'whole-run DD ≤ $35,000'
      },
      members: subjects.map((s) => ({
        label: s.label,
        role: s.role,
        id: s.cfg ? cfgId(s.cfg) : null,
        inc: s.cfg?.inc ?? null,
        quad: s.quad,
        options: s.options
      })),
      reportOnly: [
        'stresses on FULL (10 / 20 bps, 14% interest) for the primary, the replacement candidate and C4',
        'fresh confirmation rep 1 (128 draws) on FULL for the same: median validation P&L, share positive, p90 validation DD',
        'C4 known targets (development $302,785.91 / $17,332.09; validation $99,081.34 / $21,536.85; full $401,867.24 / $21,536.85)',
        'VG #2 native full history ($334,911.93 / $21,303.61)'
      ]
    }
  };

  if (env.schedule === 'study') sealJson(out, plain(record), 'frozen selection');
  else seal(env, out, plain(record), 'frozen selection');
  log(`frozen selection: primary ${sel.primary ?? 'none'}; replacement candidate ${sel.c4?.replacementCandidate ?? 'none'} — commit it before the validation`);
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
    primary: { label: string } | null;
    c4: { replacementCandidate: string | null } | null;
    validationPlan: {
      members: { label: string; role: string; quad: Cfg['quad']; options: EvalOptions; id: string | null; inc: Cfg['inc'] | null }[];
    };
  }>(frozen);
  const doorName = env.schedule === 'study' ? 'FULL' : 'D19';
  const boundary = env.schedule === 'study' ? chronology.developmentEnd : '2018-12-31';
  const door = await openStudyDoor(doorName, `${env.prefix}validation (guard ${sha256File(frozen).slice(0, 12)})`);
  const evalOne = (quad: Cfg['quad'], o: EvalOptions) => {
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
      refusedAfter: x.result.funding.filter((f) => f.s > b && f.outcome === 'refused').length
    };
  };
  const members = [...fz.validationPlan.members];
  const d = loadControls().controls.find((c) => c.key === 'D')!;

  members.push({
    label: 'VG #2 native (Study 8 arming 2017-06-15)',
    role: 'native bridge',
    quad: d.subject.quad,
    options: { ...d.subject.options, d1Arm: 'native' },
    id: null,
    inc: null
  });
  for (const c of loadControls().controls.filter((x) => x.role === 'smaller-universe'))
    members.push({ label: `control: ${c.key}`, role: 'control (smaller-universe)', quad: c.subject.quad, options: c.subject.options, id: null, inc: null });

  const rows = members.map((m) => {
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
  });
  const c4 = rows.find((r) => r.label === 'control: C4');
  const supported = (label: string | null) => {
    const r = label ? rows.find((x) => x.label === label) : undefined;

    return r && c4 ? r.passes && r.validationPnl >= c4.validationPnl : false;
  };
  const cand = fz.c4?.replacementCandidate ?? null;
  const recommendation =
    cand && rows.find((r) => r.label === cand)?.passes && supported(cand)
      ? `replace C4 with ${cand} (it dominates C4 on development, passes V1–V3 and is supported across later periods)`
      : cand
        ? `keep C4: the replacement candidate ${cand} ${rows.find((r) => r.label === cand)?.passes ? 'passes V1–V3 but trails C4 in validation (not supported across later periods)' : 'fails validation'}`
        : 'keep C4: no qualified member dominates C4 on development (no replacement candidate)';

  // report-only: stresses and the fresh confirmation rep 1 on the validation door
  const focus = [...new Set([fz.primary?.label, cand, 'control: C4'].filter((x): x is string => Boolean(x)))];
  const stressRows = focus.map((label) => {
    const m = members.find((x) => x.label === label)!;

    return {
      label,
      stresses: Object.fromEntries(
        Object.entries({ 'cost 10 bps': { costBps: 10 }, 'cost 20 bps': { costBps: 20 }, 'interest 14%': { rate: 0.14 } }).map(([k, f]) => {
          const v = evalOne(m.quad, { ...m.options, friction: f });

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
      ...(env.schedule === 'pilot'
        ? { memoryLog: path.join(cacheRoot, 'pilot', 'memory', `${env.prefix}validation-neighbours.jsonl`) }
        : {})
    },
    async (lab) => {
      const res: Record<string, unknown> = {};

      for (const label of focus) {
        const m = members.find((x) => x.label === label)!;

        if (!m.inc) continue;

        const c: Cfg = { inc: m.inc, quad: m.quad };
        const draws = neighbourhood(c, { name: 'confirm', n: 128, labels: ['confirm', 1, finalOf(env)] });
        const recs = await lab.evalMany(
          draws.map((p) => ({ quad: p.cfg.quad, options: { ...optionsOf(p.cfg), boundaries: [boundary] } })),
          'validation:neighbours'
        );
        const after = recs.map((r) => r.periods[0]!.after).sort((a, b) => a - b);
        const dds = recs.map((r) => r.periods[0]!.dd).sort((a, b) => a - b);
        const whole = recs.map((r) => r.dd).sort((a, b) => a - b);

        res[label] = {
          n: recs.length,
          medianValidationPnl: r2(quantile(after, 0.5)),
          p10ValidationPnl: r2(quantile(after, 0.1)),
          positiveShare: Math.round((after.filter((x) => x > 0).length / Math.max(1, after.length)) * 1e4) / 1e4,
          p90ValidationDd: r2(quantile(dds, 0.9)),
          p90WholeRunDd: r2(quantile(whole, 0.9)),
          wholeRunAbove35k: whole.filter((x) => x > economics.ceiling).length
        };
      }
      return res;
    }
  );
  const known = {
    C4: c4
      ? {
          development: { net: c4.developmentNet, target: 302785.91 },
          validation: { pnl: c4.validationPnl, target: 99081.34, dd: c4.validationDd, ddTarget: 21536.85 },
          full: { net: c4.fullNet, target: 401867.24, dd: c4.wholeDd, ddTarget: 21536.85 }
        }
      : null,
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
    recommendation,
    supported: Object.fromEntries(rows.map((r) => [r.label, supported(r.label)])),
    stresses: stressRows,
    neighbourhoods,
    knownTargets: known,
    finished: new Date().toISOString()
  };

  seal(env, out, plain(record), 'validation');
  log(`validation: ${rows.filter((r) => r.passes).length}/${rows.length} pass V1–V3; ${recommendation}; C4 validation ${usd(c4?.validationPnl)}`);
  return record;
};
