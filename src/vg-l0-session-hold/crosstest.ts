// The unit cross-test (PROTOCOL.md §11.2; report-only): every frozen exported phenotype UNCHANGED under both hold units,
// on the cutoff's training door — reference method NL0's cross-test matrix (5B's crosstest.ts) with the hold unit in
// place of the lifecycle. A row is one exact phenotype; the columns are 'cal' and 'ses'. Cross-tests never select,
// tune or swap anything.
//
// - Export set (frozen rule, applied to the sealed selection; sealed as exports.json before any cross-test
//   evaluation): C24 — the final set's four role holders, the independent and informed actual-profit holders, each
//   replicate's independent and informed actual-profit holder; C19/C21/C23 — the independent set's four role holders
//   and each replicate's actual-profit holder. Rows + the fixed controls (C24: New L0, C4, C4-refined, C85, IJ1, D;
//   earlier cutoffs: New L0, C4, C4-refined, D).
// - Every row × column: the centre. Principal rows (C24: the primary C, the independent primary, the informed primary,
//   New L0 = A/B, C4 and C4-refined; earlier cutoffs: the fold primary and New L0): the fresh confirmation family (3 ×
//   128, the same draws in both columns) and a causal rerun with the cell's own leading winning episode blacked out (no
//   new funding inside it). Exported rows at C24 also get the half- and 1.5×-radius families under the session unit
//   (tail severity, standard §5.8).
import fs from 'node:fs';
import path from 'node:path';
import { type EvalOptions, type Rec, episodesOf } from '../vg-d1-growth-joint/evaluate.ts';
import type { Tail } from '../vg-d1-growth-diagnostic/risk.ts';
import { simulationCaps } from './budgets.ts';
import { type Unit, cacheRoot, log, r2, repoRoot, searchUnit, units } from './context.ts';
import { type Cfg, cfgId, optionsOf } from './config.ts';
import { controlOf, optionsOfControl } from './controls.ts';
import { openStudyDoor } from './doors.ts';
import { withLab } from './lab.ts';
import { runUnit } from './unit.ts';
import { type Evidence, type Roles, drawsOf, famOf, pooledStats } from './qualify.ts';
import { isSealed, readJson, sha256File } from './records.ts';
import {
  type Env,
  assertCommitted,
  cutoffs,
  finalCutoff,
  replicates,
  seal,
  selectionFile,
  studyGuards
} from './stages.ts';
import type { Nb } from './fitness.ts';

export interface ExportRow {
  row: string; // R01, R02, …
  id: string; // cfgId
  cfg: Cfg;
  quad: Cfg['quad'];
  options: EvalOptions;
  exportedBy: { unit: Unit; label: string; roles: string[] }[];
  control: string | null;
  principal: boolean;
}

export const exportsFile = (env: Env, cut: string) => path.join(env.outDir, 'crosstest', cut, 'exports.json');
export const crossFile = (env: Env, cut: string) => path.join(env.outDir, 'crosstest', cut, 'matrix.json');

// The frozen export rule.
export const exportSet = (
  cutKey: string,
  sel: {
    roles: Record<string, Roles>;
    evidence: Evidence[];
    primary: Partial<Record<Unit, string | null>>;
    independentPrimary: Partial<Record<Unit, string | null>>;
  }
) => {
  const rows: ExportRow[] = [];
  const unit = searchUnit;
  const add = (label: string | null | undefined, role: string, principal: boolean) => {
    if (!label) return;

    const e = sel.evidence.find((x) => x.label === label);

    if (!e) throw new Error(`export ${label} has no evidence`);

    let row = rows.find((r) => r.id === e.id);

    if (!row) {
      row = {
        row: '',
        id: e.id,
        cfg: e.cfg,
        quad: e.cfg.quad,
        options: e.control ? optionsOfControl(controlOf(e.control)) : optionsOf(e.cfg),
        exportedBy: [],
        control: e.control,
        principal: false
      };
      rows.push(row);
    }

    let by = row.exportedBy.find((b) => b.unit === unit && b.label === label);

    if (!by) {
      by = { unit, label, roles: [] };
      row.exportedBy.push(by);
    }
    if (!by.roles.includes(role)) by.roles.push(role);
    if (principal) row.principal = true;
  };
  const roleSet = (set: string): Partial<Record<string, string | null>> => sel.roles[set]?.roles ?? {};

  if (finalCutoff(cutKey)) {
    for (const [r, label] of Object.entries(roleSet(`${unit}/final`))) add(label, `final ${r}`, r === 'actual-profit');
    add(roleSet(`${unit}/independent`)['actual-profit'] ?? null, 'independent actual-profit', true);
    add(roleSet(`${unit}/informed`)['actual-profit'] ?? null, 'informed actual-profit', true);
    for (const rep of replicates)
      add(roleSet(`${unit}/informed R${rep}`)['actual-profit'] ?? null, `informed R${rep} actual-profit`, false);
  } else
    for (const [r, label] of Object.entries(roleSet(`${unit}/independent`)))
      add(label, `independent ${r}`, r === 'actual-profit');
  for (const rep of replicates)
    add(roleSet(`${unit}/independent R${rep}`)['actual-profit'] ?? null, `independent R${rep} actual-profit`, false);

  const controlKeys = finalCutoff(cutKey) ? ['NL0', 'C4', 'C4R', 'C85', 'IJ1', 'D'] : ['NL0', 'C4', 'C4R', 'D'];
  const principalControls = finalCutoff(cutKey) ? ['NL0', 'C4', 'C4R'] : ['NL0'];

  for (const k of controlKeys) {
    const c = controlOf(k);
    const id = cfgId(c.cfg);
    const prior = rows.find((r) => r.id === id);

    if (prior) {
      prior.control = k;
      if (principalControls.includes(k)) prior.principal = true;
      continue;
    }

    rows.push({
      row: '',
      id,
      cfg: c.cfg,
      quad: c.cfg.quad,
      options: optionsOfControl(c),
      exportedBy: [],
      control: k,
      principal: principalControls.includes(k)
    });
  }

  rows.forEach((r, i) => (r.row = `R${String(i + 1).padStart(2, '0')}`));
  return rows;
};

export const writeExports = (cutKey: string, env: Env) => {
  const selFile = selectionFile(env, cutKey);

  if (!isSealed(selFile)) throw new Error(`the selection of ${cutKey} is not sealed`);
  if (env.schedule === 'study') assertCommitted(selFile);

  const file = exportsFile(env, cutKey);

  if (fs.existsSync(file)) return readJson<{ rows: ExportRow[] }>(file).rows;

  const sel = readJson<Parameters<typeof exportSet>[1]>(selFile);
  const rows = exportSet(cutKey, sel);

  seal(
    env,
    file,
    { stage: 'exports', cutoff: cutKey, selectionSha256: sha256File(selFile), rows },
    `exports ${cutKey}`
  );
  return rows;
};

const brief = (r: Rec) => ({
  net: r.net,
  dd: r.dd,
  lots: r.lots,
  realized: r.realized,
  unrealized: r.unrealized,
  books: Object.fromEntries(
    Object.entries(r.books).map(([b, x]) => [
      b,
      { lots: x.lots, booked: x.booked, decisions: x.decisions, granted: x.granted, refused: x.refused }
    ])
  ),
  signature: r.signature,
  topEpisode: r.topEpisode,
  topEpisodeShare: r.topEpisodeShare,
  episodes: r.episodes
});

export const runCrossTest = async (cutKey: string, env: Env) => {
  const cut = cutoffs[cutKey]!;
  const file = crossFile(env, cutKey);

  studyGuards(env);
  if (fs.existsSync(file)) throw new Error(`${path.relative(repoRoot, file)} exists`);

  const rows = writeExports(cutKey, env);
  const job = `${env.prefix}crosstest-${cutKey}`;

  return withLab(
    {
      job,
      door: cut.door,
      purpose: `${env.prefix}cross-test ${cutKey}`,
      workers: env.workers,
      ...(env.schedule === 'pilot' ? { memoryLog: path.join(cacheRoot, 'pilot', 'memory', `${job}.jsonl`) } : {}),
      maxFresh:
        env.schedule === 'study' ? (finalCutoff(cutKey) ? simulationCaps.crossTest : simulationCaps.folds) : undefined
    },
    async (lab) => {
      // the centres
      const centreItems = rows.flatMap((r) => units.map((unit) => ({ quad: r.quad, options: r.options, unit })));
      const centreRecs = await lab.evalMany(centreItems, 'cross:centre');
      const centre = (ri: number, mi: number) => centreRecs[ri * units.length + mi]!;

      // the principal rows' leading winning episodes (one detailed run per cell, in this process on the same door)
      lab.stage = `cross-test ${cutKey}: episodes`;

      const door = await openStudyDoor(cut.door, `${env.prefix}cross-test ${cutKey} episodes (coordinator)`);
      const blackouts = new Map<string, { first: string; last: string; net: number } | null>();

      rows.forEach((r, ri) => {
        if (!r.principal) return;
        units.forEach((mode) => {
          const x = runUnit(door, r.quad, r.options, mode);
          const top = episodesOf(x.result)
            .filter((e) => e.net > 0)
            .sort((a, b) => b.net - a.net)[0];
          const last = top ? (Number.isFinite(top.last) ? top.last : door.sessions - 1) : -1;

          blackouts.set(
            `${ri}|${mode}`,
            top ? { first: door.dates[top.first]!, last: door.dates[last]!, net: r2(top.net) } : null
          );
        });
      });

      // the principal rows' confirmation families (identical draws in every column) and blackout reruns; the exported
      // rows' small and wide families under their own lifecycle(s)
      type Plan = {
        ri: number;
        mode: Unit;
        fam: string;
        draws: { quad: Cfg['quad']; options: EvalOptions; clipped: number; id: string }[];
      };
      const plans: Plan[] = [];
      const singles: { ri: number; mode: Unit; quad: Cfg['quad']; options: EvalOptions }[] = [];

      rows.forEach((r, ri) => {
        for (const mode of units) {
          if (r.principal) {
            for (let rep = 1; rep <= 3; rep++)
              plans.push({
                ri,
                mode,
                fam: `confirm${rep}`,
                draws: drawsOf(
                  r.cfg,
                  r.options,
                  famOf('confirm', ['confirm', rep, cutKey], r.control === 'D' ? 'd1' : 'joint')
                )
              });

            const bo = blackouts.get(`${ri}|${mode}`);

            if (bo)
              singles.push({
                ri,
                mode,
                quad: r.quad,
                options: { ...r.options, blackouts: [{ first: bo.first, last: bo.last }] }
              });
          }
          if (finalCutoff(cutKey) && mode === searchUnit && (r.exportedBy.length > 0 || r.control === 'NL0')) {
            plans.push({
              ri,
              mode,
              fam: 'small',
              draws: drawsOf(r.cfg, r.options, famOf('small', ['small', cutKey], 'joint', 0.5))
            });
            plans.push({
              ri,
              mode,
              fam: 'wide',
              draws: drawsOf(r.cfg, r.options, famOf('wide', ['wide', cutKey], 'joint', 1.5))
            });
          }
        }
      });

      lab.stage = `cross-test ${cutKey}: ${plans.length} families, ${singles.length} blackout reruns`;

      const famRecs = await lab.evalMany(
        plans.flatMap((p) => p.draws.map((d) => ({ quad: d.quad, options: d.options, unit: p.mode }))),
        'cross:neighbours'
      );
      const boRecs = await lab.evalMany(
        singles.map((x) => ({ quad: x.quad, options: x.options, unit: x.mode })),
        'cross:blackout'
      );
      let at = 0;
      const fams = plans.map((p) => {
        const recs = p.draws.map(() => famRecs[at++]!);

        return { ...p, recs };
      });
      const cells = rows.map((r, ri) => ({
        row: r.row,
        id: r.id,
        control: r.control,
        principal: r.principal,
        exportedBy: r.exportedBy,
        columns: Object.fromEntries(
          units.map((mode, mi) => {
            const c = centre(ri, mi);
            const conf = fams.filter((f) => f.ri === ri && f.mode === mode && f.fam.startsWith('confirm'));
            const one = (name: string) => {
              const f = fams.find((x) => x.ri === ri && x.mode === mode && x.fam === name);

              if (!f) return null;

              const s = pooledStats(c, [{ draws: f.draws, recs: f.recs }]);

              return { nb: s.nb as Nb, tail: s.tail as Tail, unique: s.unique };
            };
            const confirm = conf.length
              ? pooledStats(
                  c,
                  conf.map((f) => ({ draws: f.draws, recs: f.recs }))
                )
              : null;
            const boIndex = singles.findIndex((x) => x.ri === ri && x.mode === mode);
            const bo = blackouts.get(`${ri}|${mode}`) ?? null;

            return [
              mode,
              {
                centre: brief(c),
                confirm: confirm
                  ? {
                      nb: confirm.nb,
                      tail: confirm.tail,
                      drawn: confirm.drawn,
                      unique: confirm.unique,
                      nets: confirm.recs.map((x) => x.net),
                      dds: confirm.recs.map((x) => x.dd),
                      signatures: confirm.recs.map((x) => x.signature)
                    }
                  : null,
                small: one('small'),
                wide: one('wide'),
                leadingEpisode: bo,
                withoutLeadingEpisode: boIndex >= 0 ? brief(boRecs[boIndex]!) : null
              }
            ];
          })
        )
      }));
      const record = {
        stage: 'cross-test',
        cutoff: cutKey,
        door: cut.door,
        schedule: env.schedule,
        exportsSha256: sha256File(exportsFile(env, cutKey)),
        columns: units,
        rows: cells,
        compute: lab.compute,
        codeDigest: lab.digest,
        finished: new Date().toISOString()
      };

      seal(env, file, record, `cross-test ${cutKey}`);
      log(`cross-test ${cutKey}: ${rows.length} rows × ${units.length} hold units sealed`);
      return record;
    }
  );
};

export type { Tail };
