// The frozen selection and the one-time validation (PROTOCOL.md §12–§13).
//
// FROZEN_SELECTION.json (sealed and COMMITTED before FULL opens): the C24 primary of every population × selector
// procedure, the populations' NL0 roles, the best qualified member of every per-book family pair (the structurally
// distinct finalists), New L0's C24 evidence (a control, never selectable), every procedure's sealed chronological
// verdict, the frozen qualifying-successor determination (development and chronology), and the validation plan.
// VALIDATION (FULL, once, under the guard): every finalist and New L0 in one continuous run 2016-01-04 → 2026-10-30
// with the 2024-12-31 boundary (state and marks preserved): V1 validation P&L > 0; V2 reset validation DD ≤ $35,000;
// V3 whole-run DD ≤ $35,000. First check: New L0 reproduces its known full-history figures exactly. A failed validation
// is a result: no new winner, no rescue search, no retuning, no relabelling. 2025–2026 is previously examined history.
import fs from 'node:fs';
import path from 'node:path';
import { recordOf } from '../vg-d1-growth-joint/evaluate.ts';
import type { EvalOptions } from '../vg-d1-growth-joint/evaluate.ts';
import { runWithControls2 } from '../d1-risk-controls-rc2/run.ts';
import { chronology, economics, frozenSelectionFile, log, r2, repoRoot, STUDY } from './context.ts';
import { checkFullGuard, openStudyDoor } from './doors.ts';
import { vOptions } from './nl0.ts';
import { stresses, type Evidence } from './qualify.ts';
import { isSealed, readJson, sha256File } from './records.ts';
import { type Cfg, cellOf, families, quadOf } from './space.ts';
import { type PopulationName, type SelectorName, selectionSummary } from './select.ts';
import { sequentialFile } from './folds.ts';
import { type Env, assertCommitted, evidenceOf, populationNames, seal, selectionFile, selectorNames, studyGuards } from './stages.ts';

export const knownNewL0 = {
  full: { net: 479605.18, dd: 20385.99, lots: 46 },
  validation: { pnl: 96883.72, resetDd: 20385.99 },
  development: { net: 382721.46, dd: 19459.83, lots: 34 }
};

const finalCut = (env: Env) => (env.schedule === 'study' ? 'C24' : 'P18');
export const frozenFileOf = (env: Env) => (env.schedule === 'study' ? frozenSelectionFile : path.join(env.outDir, 'FROZEN_SELECTION.json'));
export const validationFileOf = (env: Env) => path.join(env.outDir, 'validation', 'validation.json');

// New L0's frontier comparison (development, C24 evidence): X is dominated by New L0 iff New L0 is at least as good on
// both coordinates of a pair and strictly better on one.
const dominatedOn = (x: [number, number], y: [number, number]) => y[0] >= x[0] && y[1] <= x[1] && (y[0] > x[0] || y[1] < x[1]);
export const frontierVsNewL0 = (x: Evidence, nl0: Evidence) => ({
  dNet: r2(x.centre.net - nl0.centre.net),
  dDd: r2(x.centre.dd - nl0.centre.dd),
  dConfirmP10: r2(x.confirm.p10 - nl0.confirm.p10),
  dConfirmP90Dd: r2(x.confirm.p90Dd - nl0.confirm.p90Dd),
  dominatedOnCentre: dominatedOn([x.centre.net, x.centre.dd], [nl0.centre.net, nl0.centre.dd]),
  dominatedOnNeighbourhood: dominatedOn([x.confirm.p10, x.confirm.p90Dd], [nl0.confirm.p10, nl0.confirm.p90Dd])
});

export const freezeSelection = async (env: Env) => {
  const file = frozenFileOf(env);
  const cut = finalCut(env);

  studyGuards(env);
  if (fs.existsSync(file)) throw new Error('FROZEN_SELECTION.json exists');

  const selFile = selectionFile(env, cut);

  if (!isSealed(selFile)) throw new Error(`the ${cut} selection is not sealed`);
  if (env.schedule === 'study') assertCommitted(selFile);

  const seqFile = sequentialFile(env);
  const sequential = env.schedule === 'study' || fs.existsSync(seqFile) ? readJson<{ procedures: { population: PopulationName; selector: SelectorName; verdict: string; supported: boolean }[] }>(seqFile) : null;
  const sel = readJson<{ primaries: Record<PopulationName, Record<SelectorName, string | null>>; roles: Record<PopulationName, { roles: Record<string, string | null> }>; control: Evidence | null }>(selFile);
  const all = evidenceOf(env, cut).filter((e) => e.stage !== 'control');
  const byLabel = new Map(all.map((e) => [e.label, e]));
  const nl0 = sel.control;

  if (!nl0) throw new Error('New L0’s C24 evidence is missing');

  const finalists = new Map<string, { evidence: Evidence; why: string[] }>();
  const add = (label: string | null | undefined, why: string) => {
    if (!label) return;

    const f = finalists.get(label);

    if (f) f.why.push(why);
    else finalists.set(label, { evidence: byLabel.get(label)!, why: [why] });
  };

  for (const p of populationNames) {
    for (const s of selectorNames) add(sel.primaries[p][s], `C24 primary ${p}/${s}`);
    for (const [r, l] of Object.entries(sel.roles[p].roles)) add(l, `C24 role ${p}/${r}`);
  }
  for (const g of families)
    for (const v of families) {
      const best = all
        .filter((e) => e.qualified && cellOf(e.cell).GDX.family === g && cellOf(e.cell).VGT.family === v)
        .sort((a, b) => b.centre.net - a.centre.net || (a.label < b.label ? -1 : 1))[0];

      add(best?.label, `structurally distinct finalist: best qualified centre net with D1·GDX family ${g} and D1·VGT family ${v}`);
    }

  const verdict = (p: PopulationName, s: SelectorName) => sequential?.procedures.find((x) => x.population === p && x.selector === s) ?? null;
  const procedures = populationNames.flatMap((p) =>
    selectorNames.map((s) => {
      const label = sel.primaries[p][s];
      const e = label ? byLabel.get(label)! : null;
      const v = verdict(p, s);
      const frontier = e ? frontierVsNewL0(e, nl0) : null;
      const status = !e
        ? 'no C24 primary'
        : !v?.supported
          ? 'no chronological support: not a deployment-qualified candidate without the user’s explicit decision (research-only)'
          : frontier!.dominatedOnCentre || frontier!.dominatedOnNeighbourhood
            ? 'chronologically supported but dominated by New L0 on development: not a qualifying successor'
            : 'candidate qualifying successor pending the one-time validation (V1–V3)';

      return { population: p, selector: s, primary: label, verdict: v?.verdict ?? 'no sequential record (pilot)', frontierVsNewL0: frontier, status };
    })
  );
  const record = {
    kind: `${STUDY} frozen selection`,
    frozenAt: new Date().toISOString(),
    cutoff: cut,
    pins: {
      selection: { file: path.relative(repoRoot, selFile), sha256: sha256File(selFile) },
      sequential: sequential ? { file: path.relative(repoRoot, seqFile), sha256: sha256File(seqFile) } : null
    },
    primaries: sel.primaries,
    roles: sel.roles,
    procedures,
    twoByTwoPrimaries: {
      'legacy × original': sel.primaries.L.original,
      'legacy × RA1': sel.primaries.L.RA1,
      'all × original': sel.primaries.F.original,
      'all × RA1': sel.primaries.F.RA1
    },
    finalists: [...finalists.values()].map((f) => ({ ...selectionSummary(f.evidence), why: f.why, cfg: f.evidence.cfg, confirm: f.evidence.confirm, gates: f.evidence.gates })),
    newL0: { ...selectionSummary(nl0), cfg: nl0.cfg, confirm: nl0.confirm },
    qualifyingSuccessorRule:
      'a C24 primary of a population × selector procedure is a qualifying successor iff it passed Q1–Q6, its procedure’s sequential verdict is supported, it is not dominated by New L0 on (centre net, centre DD) nor on (confirmation p10, confirmation p90 DD), and it passes V1–V3 once on FULL. Otherwise: research-only (with the reason). "No qualifying successor" is a valid outcome.',
    validationPlan: {
      door: 'FULL',
      window: [chronology.firstSession, chronology.validationEnd],
      boundary: chronology.developmentEnd,
      subjects: [...[...finalists.keys()], 'control: New L0'],
      tests: { V1: 'validation P&L > 0', V2: 'reset validation DD ≤ $35,000', V3: 'whole-run DD ≤ $35,000' },
      reportOnly: Object.keys(stresses),
      firstCheck: `New L0 reproduces ${JSON.stringify(knownNewL0.full)} exactly`,
      evidenceLabel: 'validation on previously examined history (2025-01-02 → 2026-10-30), not an untouched holdout'
    }
  };

  seal(env, file, record, 'frozen selection');
  log(`frozen selection: ${record.finalists.length} finalists; ${procedures.map((p) => `${p.population}/${p.selector}: ${p.status.split(':')[0]}`).join('; ')}`);
  return record;
};

// ----- validation (FULL, once) -----

const fullRun = (door: Awaited<ReturnType<typeof openStudyDoor>>, cfg: Cfg, friction?: EvalOptions['friction']) => {
  const o: EvalOptions = { ...vOptions, boundaries: [chronology.developmentEnd], ...(friction ? { friction } : {}) };
  const x = runWithControls2(door, quadOf(cfg), cfg.controls, o, false, false);
  const rec = recordOf(door, quadOf(cfg), x, o);
  const p = rec.periods[0]!;

  return {
    net: rec.net,
    dd: rec.dd,
    lots: rec.lots,
    developmentNet: r2(p.equity),
    validationPnl: r2(p.after),
    resetValidationDd: r2(p.dd),
    years: rec.years,
    open: x.result.lots.filter((l) => l.open).map((l) => ({ book: l.book, entry: door.dates[l.entryS] })),
    V1: p.after > 0,
    V2: p.dd <= economics.ceiling,
    V3: rec.dd <= economics.ceiling
  };
};

export const runValidation = async (env: Env) => {
  const file = validationFileOf(env);
  const frozen = frozenFileOf(env);

  studyGuards(env);
  if (fs.existsSync(file)) throw new Error('the validation record exists: FULL is evaluated once');
  if (!isSealed(frozen)) throw new Error('FROZEN_SELECTION.json is not sealed');
  if (env.schedule === 'study') checkFullGuard();

  const f = readJson<{ finalists: { label: string; cfg: Cfg }[]; newL0: { cfg: Cfg }; procedures: { population: PopulationName; selector: SelectorName; primary: string | null; status: string }[] }>(frozen);
  const door = env.schedule === 'study' ? await openStudyDoor('FULL', 'validation (once) of the frozen selection') : await openStudyDoor('D19', 'pilot validation stand-in');
  const nl0 = fullRun(door, f.newL0.cfg);

  if (env.schedule === 'study' && (r2(nl0.net) !== knownNewL0.full.net || r2(nl0.dd) !== knownNewL0.full.dd || nl0.lots !== knownNewL0.full.lots))
    throw new Error(`New L0 does not reproduce on FULL: ${JSON.stringify({ net: nl0.net, dd: nl0.dd, lots: nl0.lots })}`);

  const rows = f.finalists.map((x) => ({
    label: x.label,
    cell: x.cfg.cell,
    ...fullRun(door, x.cfg),
    stresses: Object.fromEntries(
      Object.entries(stresses).map(([k, fr]) => {
        const s = fullRun(door, x.cfg, fr);

        return [k, { net: r2(s.net), dd: r2(s.dd), validationPnl: s.validationPnl, resetValidationDd: s.resetValidationDd }];
      })
    )
  }));
  const successor = f.procedures.map((p) => {
    const row = rows.find((r) => r.label === p.primary);
    const passes = row ? row.V1 && row.V2 && row.V3 : false;

    return {
      ...p,
      validation: row ? { V1: row.V1, V2: row.V2, V3: row.V3 } : null,
      finalStatus: p.status.startsWith('candidate qualifying successor')
        ? passes
          ? 'QUALIFYING SUCCESSOR (all frozen criteria met; deployment still needs the user’s decision)'
          : 'not a qualifying successor: failed the one-time validation'
        : p.status
    };
  });
  const record = {
    stage: 'validation',
    door: env.schedule === 'study' ? 'FULL' : 'D19 (pilot stand-in)',
    frozenSelectionSha256: sha256File(frozen),
    evidenceLabel: 'validation on previously examined history, not an untouched holdout',
    newL0: { ...nl0, reproduced: env.schedule === 'study' },
    rows,
    successor,
    qualifyingSuccessors: successor.filter((s) => s.finalStatus.startsWith('QUALIFYING')).map((s) => s.primary),
    finished: new Date().toISOString()
  };

  seal(env, file, record, 'validation');
  log(`validation: ${rows.length} finalists; qualifying successors: ${record.qualifyingSuccessors.length ? record.qualifyingSuccessors.join(', ') : 'none'}`);
  return record;
};
