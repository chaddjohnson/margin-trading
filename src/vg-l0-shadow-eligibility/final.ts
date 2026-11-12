// The frozen selection and the one-time validation (PROTOCOL.md §11.4, §11.5) — reference method NL0's (5B's final.ts)
// for this study's comparisons.
//
// FROZEN_SELECTION.json (sealed and committed before FULL opens): the nominee (the actual-profit role of the final
// selectable set) and every track's primary and roles with complete effective settings; New L0 (A) and its seven
// fixed-toggle variants; the ablation export rows (the validation subjects); the sealed fold selections, sequential
// verdicts, fixed-parameter, ablation and diagnostics records; the FROZEN COMPARISON LABELS (development and folds only):
// each fixed combination vs A, each track primary vs A, the nominee vs A, B1 vs B2 and A1 vs A2 (architecture), A1 vs B1
// and A2 vs B2 (starting point); the decompositions (toggles, parameters, interaction); the code and data pins and the
// validation plan. There is no futility stop.
//
// The validation (FULL, once, behind the guard): every export row under its own toggles (and the principal rows also
// under all OFF), New L0 under the eight combinations and the controls, unchanged, in one continuous run 2016-01-04 →
// 2026-10-30 each (state and marks preserved across 2024-12-31). V1 validation P&L > 0; V2 reset validation DD ≤
// $35,000; V3 whole-run DD ≤ $35,000. Report-only: New L0's known full-history figures reproduced exactly; stresses and
// the fresh confirmation rep 1 (128 draws) on FULL for the principal rows; full-history ledgers and annual figures of the
// principal rows. A failed validation is a result: no new winner, no rescue search, no retuning, no relabelling.
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import type { EvalOptions } from '../vg-d1-growth-joint/evaluate.ts';
import { quantile } from '../vg-d1-growth-joint/fitness.ts';
import { simulationCaps } from './budgets.ts';
import {
  type Track,
  chronology,
  economics,
  freezeFile,
  frozenSelectionFile,
  log,
  r2,
  repoRoot,
  resultsDir,
  searchKey,
  tracks
} from './context.ts';
import { type Cfg, cfgId, neighbourhood, optionsOf, withSh } from './config.ts';
import { controlOf, nl0Key, optionsOfControl, settingsOf } from './controls.ts';
import { type ExportRow, ablationFile, exportsFile } from './ablation.ts';
import { diagDir, finalOf } from './diagnostics.ts';
import { openStudyDoor } from './doors.ts';
import { type SRec, allSh, offSh, recordOf, run, shLabel } from './evaluate.ts';
import { closureDigest, codeClosure, referenceMethodPin } from './freeze.ts';
import { readSelection } from './folds.ts';
import { codeDigest, withLab } from './lab.ts';
import { type PrimaryEvidence, type Sequential, comparisonLabel, decompose } from './labels.ts';
import { phase2File } from './phase2.ts';
import { type Evidence, summary } from './qualify.ts';
import { csvOf, detailOf } from './report.ts';
import { isSealed, plain, readJson, sealJson, sha256File } from './records.ts';
import {
  type Env,
  assertCommitted,
  controlsFile,
  finalSelectionFile,
  finalStepOf,
  replicatesOf,
  seal,
  selectionFile,
  studyGuards
} from './stages.ts';

export const frozenFileOf = (env: Env) =>
  env.schedule === 'study' ? frozenSelectionFile : path.join(env.outDir, 'FROZEN_SELECTION.json');
export const validationFileOf = (env: Env) => path.join(env.outDir, 'validation', 'validation.json');

// The original procedure's chronological path (5B's L0 arm, sealed): the chronology reference of the fresh tracks.
export const originalSequential = {
  file: 'research/vg-lifecycle-matched-optimization/results/folds/sequential.json',
  sha256: '7bf8c74463461b963b2b98442978fcec53f994ff4ce8a8a52cd93ef0a932da30'
} as const;

const verdictOf = (v: string): { verdict: Sequential['verdict'] } => ({
  verdict: v.startsWith('chronologically supported')
    ? 'supported'
    : v.startsWith('chronologically incomplete')
      ? 'incomplete'
      : 'unsupported'
});

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

// New L0's known figures (5B validation.json R01 8393113…, the trading-session study's validation.json f474c421…,
// Strategy Lab parity 59424ff9…): reproduced exactly at the validation (the door stays closed until then; NL0 §3.6).
export const knownNewL0 = {
  development: 382721.46,
  validationPnl: 96883.72,
  validationDd: 20385.99,
  full: 479605.18,
  wholeDd: 20385.99,
  realized: 485169.93,
  unrealized: -5564.76
};

const pe = (e: Evidence | null): PrimaryEvidence | null =>
  e ? { net: e.centre.net, dd: e.centre.dd, confirmP10: e.confirm.p10, confirmP90Dd: e.confirm.p90Dd } : null;

const optionsOfEvidence = (e: { cfg: Cfg; control: string | null }) =>
  e.control ? optionsOfControl(controlOf(e.control)) : optionsOf(e.cfg);

export const freezeSelection = async (env: Env) => {
  const out = frozenFileOf(env);

  studyGuards(env);
  if (fs.existsSync(out)) throw new Error(`${path.relative(repoRoot, out)} exists: the selection is frozen`);

  const fin = finalOf(env);
  const finFile = finalSelectionFile(env, fin);
  const diag = path.join(diagDir(env), 'diagnostics.json');
  const seqFile = path.join(env.outDir, 'folds', 'sequential.json');
  const aFile = ablationFile(env, fin);
  const eFile = exportsFile(env, fin);
  const p2 = phase2File(env);
  const foldCuts = env.schedule === 'study' ? ['C19', 'C21', 'C23'] : [];
  const foldFiles = foldCuts.flatMap((c) =>
    (['B1', 'B2'] as Track[]).flatMap((t) =>
      (t === 'B1' ? (['joint'] as const) : (['d1', 'g'] as const)).map((st) => selectionFile(env, c, t, st))
    )
  );
  const required = [
    finFile,
    controlsFile(env, fin),
    ...tracks.map((t) => selectionFile(env, fin, t, finalStepOf(t))),
    diag,
    aFile,
    eFile,
    p2,
    ...(env.schedule === 'study' ? [seqFile] : []),
    ...foldFiles
  ];

  for (const f of required) if (!isSealed(f)) throw new Error(`${path.relative(repoRoot, f)} is not sealed`);

  const final = readJson<{
    nominee: string | null;
    trackPrimaries: Record<Track, string | null>;
    roles: Record<string, { roles: Record<string, string | null> }>;
    comparisons: unknown;
  }>(finFile);
  const sels = Object.fromEntries(tracks.map((t) => [t, readSelection(env, fin, t, finalStepOf(t))])) as Record<
    Track,
    ReturnType<typeof readSelection>
  >;
  const controls = readJson<{ evidence: Evidence[] }>(controlsFile(env, fin)).evidence;
  const all = [...tracks.flatMap((t) => sels[t].evidence), ...controls];
  const ev = (label: string | null | undefined) => (label ? (all.find((e) => e.label === label) ?? null) : null);
  const A = controls.find((e) => e.control === 'NL0')!;
  const seq =
    env.schedule === 'study'
      ? readJson<{ procedures: { track: Track; verdict: string; procedure: { net: number; sequentialDd: number } }[] }>(
          seqFile
        )
      : null;
  const pathOf = (t: Track): Sequential | null => {
    const p = seq?.procedures.find((x) => x.track === t);

    return p ? { ...verdictOf(p.verdict), net: p.procedure.net, dd: p.procedure.sequentialDd } : null;
  };
  const orig = originalPath();
  const bests = (t: Track) => {
    const name = searchKey(t, finalStepOf(t));

    return Array.from({ length: replicatesOf(env, t, finalStepOf(t)) }, (_v, i) => i + 1)
      .map((r) => ev(sels[t].roles[`${name} R${r}`]?.roles['actual-profit'])?.centre.net)
      .filter((x): x is number => typeof x === 'number');
  };
  const trackPrimary = (t: Track) => ev(final.trackPrimaries[t]);
  const labels: Record<string, unknown> = {};

  for (const sh of allSh.filter((s) => s !== offSh)) {
    const f = controls.find((e) => e.control === nl0Key(sh)) ?? null;

    labels[`F(${sh}) vs A — New L0 with ${shLabel(sh)} (fixed parameters)`] = {
      ...comparisonLabel(pe(f), pe(A)),
      x: pe(f),
      y: pe(A)
    };
  }
  for (const t of tracks) {
    const p = trackPrimary(t);
    const chron = pathOf(t);

    labels[`${t} primary vs A`] = {
      ...comparisonLabel(pe(p), pe(A), {
        replicateBests: bests(t),
        ...(chron ? { chron: { x: chron, y: orig } } : {})
      }),
      x: pe(p),
      y: pe(A),
      replicateBests: bests(t),
      chronology: chron ? { procedure: chron, original: orig } : null
    };
  }

  const nominee = ev(final.nominee);
  const nomineeTrack = nominee?.track ?? null;
  const nomineeChron = nomineeTrack ? pathOf(nomineeTrack) : null;

  labels['nominee vs A'] = {
    ...comparisonLabel(pe(nominee), pe(A), {
      ...(nomineeTrack ? { replicateBests: bests(nomineeTrack) } : {}),
      ...(nomineeChron ? { chron: { x: nomineeChron, y: orig } } : {})
    }),
    x: pe(nominee),
    y: pe(A),
    isUnchangedControl: nominee?.control ?? null
  };

  const pair = (x: Track, y: Track, name: string) => {
    const cx = pathOf(x);
    const cy = pathOf(y);

    labels[name] = {
      ...comparisonLabel(pe(trackPrimary(x)), pe(trackPrimary(y)), {
        replicateBests: bests(x),
        ...(cx && cy ? { chron: { x: cx, y: cy } } : {})
      }),
      x: pe(trackPrimary(x)),
      y: pe(trackPrimary(y)),
      chronology: cx && cy ? { x: cx, y: cy } : null
    };
  };

  pair('B1', 'B2', 'B1 vs B2 (fresh: joint vs sequential)');
  pair('A1', 'A2', 'A1 vs A2 (informed: joint vs sequential)');
  pair('A1', 'B1', 'A1 vs B1 (joint: informed vs fresh)');
  pair('A2', 'B2', 'A2 vs B2 (sequential: informed vs fresh)');

  // the decompositions of the principal rows (the ablation's centre cells)
  const matrix = readJson<{ matrix: { row: string; own: string; cells: Record<string, { net: number }> }[] }>(
    aFile
  ).matrix;
  const exp = readJson<{ rows: ExportRow[] }>(eFile).rows;
  const nl0Row = matrix.find((m) => exp.find((r) => r.row === m.row)?.control === 'NL0')!;
  const decompositions = exp
    .filter((r) => r.principal && r.control !== 'NL0' && r.cfg.inc === 'V')
    .map((r) => {
      const m = matrix.find((x) => x.row === r.row)!;
      const t = r.cfg.sh;

      return {
        row: r.row,
        exportedBy: r.exportedBy,
        sh: t,
        ...decompose({
          pAoff: nl0Row.cells[offSh]!.net,
          pAt: nl0Row.cells[t]!.net,
          pXoff: m.cells[offSh]!.net,
          pXt: m.cells[t]!.net
        })
      };
    });
  const pinOf = (f: string) => ({ file: path.relative(repoRoot, f), sha256: sha256File(f) });
  const full = (e: Evidence | null) =>
    e ? { ...summary(e), settings: settingsOf(e.cfg, optionsOfEvidence(e)) } : null;
  const record = {
    kind: 'vg-l0-shadow-eligibility frozen selection',
    schedule: env.schedule,
    frozenAt: new Date().toISOString(),
    gitHead: execSync('git rev-parse HEAD', { cwd: repoRoot }).toString().trim(),
    pins: {
      finalSelection: pinOf(finFile),
      controls: pinOf(controlsFile(env, fin)),
      trackSelections: Object.fromEntries(tracks.map((t) => [t, pinOf(selectionFile(env, fin, t, finalStepOf(t)))])),
      foldSelections: foldFiles.map(pinOf),
      sequential: env.schedule === 'study' ? pinOf(seqFile) : null,
      phase2: pinOf(p2),
      ablation: pinOf(aFile),
      exports: pinOf(eFile),
      diagnostics: pinOf(diag),
      protocolFreeze: env.schedule === 'study' ? pinOf(freezeFile) : null,
      parity: env.schedule === 'study' ? sha256File(path.join(resultsDir, 'parity', 'parity.json')) : null,
      referenceMethod: referenceMethodPin(),
      evaluationDigest: codeDigest(),
      closureDigest: closureDigest(codeClosure())
    },
    primaryRule:
      'the nominee is the actual-profit role of the final selectable set — the highest development centre net among qualified members (ties: selection robust net, centre DD, label); the set = every track’s qualified C24 members + New L0 under the 8 toggle combinations, C4, C4-refined and C85 (the qualifying-incumbent fallback: an unchanged control is a valid outcome). Each track’s primary is the actual-profit role of its own qualified C24 members.',
    nominee: { label: final.nominee, isUnchangedControl: nominee?.control ?? null, evidence: full(nominee) },
    A: { definition: 'New L0, frozen parameters, every toggle OFF (the historical control)', evidence: full(A) },
    fixedCombinations: allSh.map((sh) => ({
      sh,
      label: shLabel(sh),
      evidence: full(controls.find((e) => e.control === nl0Key(sh)) ?? null)
    })),
    trackPrimaries: Object.fromEntries(
      tracks.map((t) => [t, { label: final.trackPrimaries[t], evidence: full(trackPrimary(t)) }])
    ),
    trackRoles: Object.fromEntries(
      tracks.map((t) => [
        t,
        Object.fromEntries(
          Object.entries(sels[t].roles[searchKey(t, finalStepOf(t))]?.roles ?? {}).map(([k, v]) => [k, full(ev(v))])
        )
      ])
    ),
    d1Finalists: Object.fromEntries(
      (['A2', 'B2'] as Track[]).map((t) => [t, readSelection(env, fin, t, 'd1').finalists ?? []])
    ),
    sequentialVerdicts: seq ? Object.fromEntries(seq.procedures.map((p) => [p.track, p.verdict])) : null,
    roles: final.roles,
    comparisons: final.comparisons,
    comparisonLabels: labels,
    decompositions,
    labelRule:
      'labels.ts (PROTOCOL.md §11.1): development (centre net, confirmation p10, and for a searched selection its track’s replicates’ agreement ≥ ⌈2R/3⌉), risk (centre and confirmation p90 DD) and, where both sides have one, chronology (the fresh procedures’ sequential paths; a fresh track against the original 5B L0 path); band $2,500; computed here, before the validation door opens; never changed by validation',
    validationSubjects: exp.map((r) => ({
      row: r.row,
      id: r.id,
      control: r.control,
      principal: r.principal,
      exportedBy: r.exportedBy,
      cfg: r.cfg,
      options: r.options,
      settings: settingsOf(r.cfg, r.options)
    })),
    validationPlan: {
      door: 'FULL (2016-01-04 → 2026-10-30, continuous; boundary 2024-12-31)',
      rows: 'every ablation export row under its own toggles (principal rows also under all OFF); New L0 under the 8 toggle combinations; C4, C4-refined, C85, IJ1, D; VG #2 native',
      tests: {
        V1: 'validation P&L (marked net 2026-10-30 − marked net at the 2024-12-31 close) > 0',
        V2: 'reset validation DD ≤ $35,000',
        V3: 'whole-run DD ≤ $35,000'
      },
      reportOnly: [
        'New L0 (all OFF) reproduces its known figures exactly: development $382,721.46, validation $96,883.72 / reset DD $20,385.99, full $479,605.18 / DD $20,385.99, realized $485,169.93, unrealized −$5,564.76',
        'stresses on FULL (10 / 20 bps per side, 14% interest) for the principal rows',
        'fresh confirmation rep 1 (128 draws) on FULL for the principal rows: median and p10 validation P&L, share positive, p90 validation DD, p90 whole-run DD, draws above $35,000',
        'full-history ledgers (funded lots, shadow episodes), annual P&L and reset DD, attribution and utilization of the principal rows'
      ],
      previouslyExamined:
        'validation on previously examined history, not an untouched holdout: 2025–2026 was examined by Priorities 3–8 and Strategy Lab; New L0’s own 2025–2026 result was known',
      noFutilityStop: true
    }
  };

  if (env.schedule === 'study') sealJson(out, plain(record), 'frozen selection');
  else seal(env, out, plain(record), 'frozen selection');
  log(
    `frozen selection: nominee ${final.nominee}; track primaries ${JSON.stringify(final.trackPrimaries)} — commit it before the validation`
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

  const fz = readJson<{
    validationSubjects: {
      row: string;
      id: string;
      control: string | null;
      principal: boolean;
      exportedBy: { label: string; roles: string[] }[];
      cfg: Cfg;
      options: EvalOptions;
    }[];
  }>(frozen);
  const doorName = env.schedule === 'study' ? 'FULL' : 'D19';
  const boundary = env.schedule === 'study' ? chronology.developmentEnd : '2018-12-31';
  const door = await openStudyDoor(doorName, `${env.prefix}validation (guard ${sha256File(frozen).slice(0, 12)})`);
  let simulations = 0;
  const evalOne = (cfg: Cfg, o: EvalOptions) => {
    const oo = { ...o, boundaries: [boundary] };
    const x = run(door, cfg.quad, oo, cfg.sh, true);
    const rec: SRec = recordOf(door, cfg.quad, x, oo, cfg.sh);
    const b = door.dates.indexOf(boundary);
    const lots = x.result.lots;

    simulations++;
    return {
      rec,
      developmentNet: rec.periods[0]!.equity,
      validationPnl: rec.periods[0]!.after,
      validationDd: rec.periods[0]!.dd,
      wholeDd: rec.dd,
      lotsAfter: lots.filter((l) => l.entryS > b).length,
      crossing: lots.filter((l) => l.entryS <= b && (l.open || l.fills.at(-1)!.s > b)).map((l) => l.book),
      openAtEnd: lots.filter((l) => l.open).map((l) => ({ book: l.book, unrealized: r2(l.net) }))
    };
  };
  const subjects: {
    row: string;
    name: string;
    cfg: Cfg;
    options: EvalOptions;
    principal: boolean;
    control: string | null;
    exportedBy: unknown;
  }[] = [];

  for (const m of fz.validationSubjects) {
    subjects.push({
      row: m.row,
      name: `${m.row} own (${m.cfg.sh})`,
      cfg: m.cfg,
      options: m.options,
      principal: m.principal,
      control: m.control,
      exportedBy: m.exportedBy
    });
    if (m.principal && m.cfg.sh !== offSh)
      subjects.push({
        row: m.row,
        name: `${m.row} all OFF`,
        cfg: withSh(m.cfg, offSh),
        options: m.options,
        principal: false,
        control: m.control,
        exportedBy: m.exportedBy
      });
  }
  for (const sh of allSh) {
    const c = controlOf(nl0Key(sh));

    if (!subjects.some((s) => cfgId(s.cfg) === cfgId(c.cfg)))
      subjects.push({
        row: '—',
        name: `control ${c.key}`,
        cfg: c.cfg,
        options: optionsOfControl(c),
        principal: false,
        control: c.key,
        exportedBy: []
      });
  }

  const rows = subjects.map((m) => {
    const v = evalOne(m.cfg, m.options);

    return {
      row: m.row,
      name: m.name,
      control: m.control,
      exportedBy: m.exportedBy,
      sh: m.cfg.sh,
      id: cfgId(m.cfg),
      developmentNet: v.developmentNet,
      validationPnl: v.validationPnl,
      validationDd: v.validationDd,
      fullNet: v.rec.net,
      fullRealized: v.rec.realized,
      fullUnrealized: v.rec.unrealized,
      wholeDd: v.wholeDd,
      lots: v.rec.lots,
      lotsAfter: v.lotsAfter,
      crossing: v.crossing,
      openAtEnd: v.openAtEnd,
      years: v.rec.years,
      shadow: v.rec.shadow,
      tests: { V1: v.validationPnl > 0, V2: v.validationDd <= economics.ceiling, V3: v.wholeDd <= economics.ceiling }
    };
  });
  const nl0 = rows.find((r) => r.control === 'NL0' && r.sh === offSh)!;
  const known =
    env.schedule === 'study'
      ? {
          ...knownNewL0,
          reproduced:
            nl0.developmentNet === knownNewL0.development &&
            nl0.validationPnl === knownNewL0.validationPnl &&
            nl0.validationDd === knownNewL0.validationDd &&
            nl0.fullNet === knownNewL0.full &&
            nl0.wholeDd === knownNewL0.wholeDd &&
            nl0.fullRealized === knownNewL0.realized &&
            nl0.fullUnrealized === knownNewL0.unrealized,
          got: {
            development: nl0.developmentNet,
            validation: nl0.validationPnl,
            validationDd: nl0.validationDd,
            full: nl0.fullNet,
            wholeDd: nl0.wholeDd
          }
        }
      : null;

  // the principal rows: full-history detail (ledgers, annual, attribution), stresses and the FULL confirmation rep 1
  const principals = subjects.filter((s) => s.principal || (s.control === 'NL0' && s.cfg.sh === offSh));
  const detailDir = path.join(path.dirname(out), 'ledgers');
  const details = principals.map((p) => {
    const d = detailOf(door, p.cfg, p.options);
    const slug = p.name.replace(/[^A-Za-z0-9._-]+/g, '_').slice(0, 80);

    if (env.schedule === 'study') {
      fs.mkdirSync(path.join(detailDir, slug), { recursive: true });
      sealJson(path.join(detailDir, slug, 'lots.json'), d.lots, `validation ledger ${slug} lots`);
      sealJson(path.join(detailDir, slug, 'episodes.json'), d.episodes, `validation ledger ${slug} episodes`);
      fs.writeFileSync(path.join(detailDir, slug, 'lots.csv'), csvOf(d.lots));
      fs.writeFileSync(path.join(detailDir, slug, 'episodes.csv'), csvOf(d.episodes));
    }
    return { name: p.name, years: d.years, trades: d.trades, utilization: d.utilization, attribution: d.attribution };
  });
  const stresses = principals.flatMap((p) =>
    (
      [
        ['cost 10 bps', { costBps: 10 }],
        ['cost 20 bps', { costBps: 20 }],
        ['interest 14%', { rate: 0.14 }]
      ] as const
    ).map(([name, f]) => {
      const v = evalOne(p.cfg, { ...p.options, friction: { ...(p.options.friction ?? {}), ...f } });

      return {
        name: p.name,
        stress: name,
        validationPnl: v.validationPnl,
        validationDd: v.validationDd,
        fullNet: v.rec.net,
        wholeDd: v.wholeDd
      };
    })
  );
  const job = `${env.prefix}validation`;
  const nbhd = await withLab(
    {
      job,
      door: doorName,
      purpose: `${env.prefix}validation neighbourhoods`,
      workers: env.workers,
      maxFresh: env.schedule === 'study' ? simulationCaps.final : undefined
    },
    async (lab) => {
      const fams = principals.map((p) => ({
        p,
        draws: neighbourhood(p.cfg, { name: 'confirm', n: 128, labels: ['confirm', 1, 'C24'], scope: 'joint' })
      }));
      const recs = await lab.evalMany(
        fams.flatMap((f) =>
          f.draws.map((d) => ({ quad: d.cfg.quad, options: { ...f.p.options, boundaries: [boundary] }, sh: d.cfg.sh }))
        ),
        'validation:neighbours'
      );
      let at = 0;

      return fams.map((f) => {
        const rs = f.draws.map(() => recs[at++]!);
        const val = rs.map((r) => r.periods[0]!.after).sort((a, b) => a - b);
        const vdd = rs.map((r) => r.periods[0]!.dd).sort((a, b) => a - b);
        const wdd = rs.map((r) => r.dd).sort((a, b) => a - b);

        return {
          name: f.p.name,
          draws: rs.length,
          medianValidation: r2(quantile(val, 0.5)),
          p10Validation: r2(quantile(val, 0.1)),
          sharePositive: Math.round((val.filter((x) => x > 0).length / Math.max(1, val.length)) * 1e4) / 1e4,
          p90ValidationDd: r2(quantile(vdd, 0.9)),
          p90WholeDd: r2(quantile(wdd, 0.9)),
          above35k: wdd.filter((x) => x > economics.ceiling).length,
          compute: lab.compute
        };
      });
    }
  );
  const record = {
    stage: 'validation',
    door: doorName,
    boundary,
    guard: sha256File(frozen),
    previouslyExamined: 'validation on previously examined history, not an untouched holdout',
    rows,
    knownNewL0: known,
    details,
    stresses,
    neighbourhoods: nbhd,
    simulations,
    finished: new Date().toISOString()
  };

  seal(env, out, record, 'validation');
  log(
    `validation: ${rows.length} rows; ${rows.filter((r) => r.tests.V1 && r.tests.V2 && r.tests.V3).length} pass V1–V3; New L0 reproduced ${known?.reproduced}`
  );
  return record;
};

export { tracks };
