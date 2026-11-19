// The cross-test matrix (PROTOCOL.md §11.2; report-only): every frozen exported phenotype UNCHANGED under all three
// lifecycles, on the cutoff's training door. A row is one exact phenotype; the columns are L0, L1, L2. Cross-tests
// never select, tune or swap anything.
//
// - Export set per arm (frozen rule, applied to the sealed selection; sealed as exports.json before any cross-test
//   evaluation): C24 — the final set's four role holders, the independent and informed actual-profit holders, each
//   replicate's independent actual-profit holder and the final set's best qualified V, G and B member; C19/C21/C23 —
//   the independent set's four role holders and each replicate's actual-profit holder. Rows = the union over the arms
//   (a phenotype exported by two arms is one row) + the fixed controls (C24: C4, C4-refined, D, C85, E, A, B and the 5A
//   mechanism controls IP and GP85; earlier cutoffs: C4, C4-refined, D).
// - Every row × column: the centre. Principal rows (each arm's primary — C24: final and independent — and, at C24, C4
//   and C4-refined): the fresh confirmation family (3 × 128, the same draws in every column) and a causal rerun with
//   the cell's own leading winning episode blacked out (no new funding inside it). Exported rows at C24 also get the
//   half- and 1.5×-radius families under their own lifecycle (tail severity, standard §5.8).
import fs from 'node:fs';
import path from 'node:path';
import { type EvalOptions, type Rec, episodesOf } from '../vg-d1-growth-joint/evaluate.ts';
import { type Tail, tailOf } from '../vg-d1-growth-diagnostic/risk.ts';
import { simulationCaps } from './budgets.ts';
import { type Mode, cacheRoot, log, modes, r2, repoRoot } from './context.ts';
import { type Cfg, cfgId, optionsOf } from './config.ts';
import { loadControls } from './controls.ts';
import { openStudyDoor } from './doors.ts';
import { dMember } from './folds.ts';
import { withLab } from './lab.ts';
import { runLife } from './life.ts';
import { type Evidence, type Roles, drawsOf, famOf, pooledStats } from './qualify.ts';
import { isSealed, readJson, sha256File } from './records.ts';
import { type Env, assertCommitted, cutoffs, finalCutoff, seal, selectionFile, studyGuards } from './stages.ts';
import type { Nb } from './fitness.ts';

export interface ExportRow {
  row: string; // R01, R02, …
  id: string; // cfgId (controls without a configuration: the Priority 3 quad id)
  cfg: Cfg | null;
  quad: Cfg['quad'];
  options: EvalOptions;
  exportedBy: { mode: Mode; label: string; roles: string[] }[];
  control: string | null;
  principal: boolean;
}

export const exportsFile = (env: Env, cut: string) => path.join(env.outDir, 'crosstest', cut, 'exports.json');
export const crossFile = (env: Env, cut: string) => path.join(env.outDir, 'crosstest', cut, 'matrix.json');

// The frozen export rule.
export const exportSet = (cutKey: string, sel: { roles: Record<string, Roles>; evidence: Evidence[]; primary: Record<Mode, string | null>; independentPrimary: Record<Mode, string | null> }) => {
  const rows: ExportRow[] = [];
  const add = (mode: Mode, label: string | null | undefined, role: string, principal: boolean) => {
    if (!label) return;

    const e = sel.evidence.find((x) => x.label === label);

    if (!e) throw new Error(`export ${label} has no evidence`);

    let row = rows.find((r) => r.id === e.id);

    if (!row) {
      row = { row: '', id: e.id, cfg: e.cfg, quad: e.cfg.quad, options: optionsOf(e.cfg), exportedBy: [], control: e.control, principal: false };
      rows.push(row);
    }

    let by = row.exportedBy.find((b) => b.mode === mode && b.label === label);

    if (!by) {
      by = { mode, label, roles: [] };
      row.exportedBy.push(by);
    }
    if (!by.roles.includes(role)) by.roles.push(role);
    if (principal) row.principal = true;
  };
  const roleSet = (set: string): Partial<Record<string, string | null>> => sel.roles[set]?.roles ?? {};

  for (const mode of modes) {
    if (finalCutoff(cutKey)) {
      for (const [r, label] of Object.entries(roleSet(`${mode}/final`))) add(mode, label, `final ${r}`, r === 'actual-profit');
      add(mode, roleSet(`${mode}/independent`)['actual-profit'] ?? null, 'independent actual-profit', true);
      add(mode, roleSet(`${mode}/informed`)['actual-profit'] ?? null, 'informed actual-profit', false);
      for (const inc of ['V', 'G', 'B']) add(mode, roleSet(`${mode}/final ${inc}`)['actual-profit'] ?? null, `final best ${inc}`, false);
    } else
      for (const [r, label] of Object.entries(roleSet(`${mode}/independent`))) add(mode, label, `independent ${r}`, r === 'actual-profit');
    for (const rep of [1, 2])
      add(mode, roleSet(`${mode}/independent R${rep}`)['actual-profit'] ?? null, `independent R${rep} actual-profit`, false);
  }

  const controlKeys = finalCutoff(cutKey) ? ['C4', 'C4R', 'D', 'C85', 'E', 'A', 'B', 'IP', 'GP85'] : ['C4', 'C4R', 'D'];

  for (const k of controlKeys) {
    if (k === 'D') {
      const d = dMember('L0');

      rows.push({ row: '', id: cfgId(d.cfg), cfg: d.cfg, quad: d.cfg.quad, options: d.options!, exportedBy: [], control: 'D', principal: false });
      continue;
    }

    const c = loadControls().controls.find((x) => x.key === k)!;
    const id = c.cfg ? cfgId(c.cfg) : c.p3Id;
    const prior = rows.find((r) => r.id === id);

    if (prior) {
      prior.control = k;
      if (k === 'C4' || k === 'C4R') prior.principal = finalCutoff(cutKey) || prior.principal;
      continue;
    }

    rows.push({
      row: '',
      id,
      cfg: c.cfg,
      quad: c.quad,
      options: c.cfg ? optionsOf(c.cfg) : c.options,
      exportedBy: [],
      control: k,
      principal: finalCutoff(cutKey) && (k === 'C4' || k === 'C4R')
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

  seal(env, file, { stage: 'exports', cutoff: cutKey, selectionSha256: sha256File(selFile), rows }, `exports ${cutKey}`);
  return rows;
};

const brief = (r: Rec) => ({
  net: r.net,
  dd: r.dd,
  lots: r.lots,
  realized: r.realized,
  unrealized: r.unrealized,
  books: Object.fromEntries(Object.entries(r.books).map(([b, x]) => [b, { lots: x.lots, booked: x.booked, decisions: x.decisions, granted: x.granted, refused: x.refused }])),
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
      maxFresh: env.schedule === 'study' ? (finalCutoff(cutKey) ? simulationCaps.crossTest : simulationCaps.folds) : undefined
    },
    async (lab) => {
      // the centres
      const centreItems = rows.flatMap((r) => modes.map((mode) => ({ quad: r.quad, options: r.options, mode })));
      const centreRecs = await lab.evalMany(centreItems, 'cross:centre');
      const centre = (ri: number, mi: number) => centreRecs[ri * modes.length + mi]!;

      // the principal rows' leading winning episodes (one detailed run per cell, in this process on the same door)
      lab.stage = `cross-test ${cutKey}: episodes`;

      const door = await openStudyDoor(cut.door, `${env.prefix}cross-test ${cutKey} episodes (coordinator)`);
      const blackouts = new Map<string, { first: string; last: string; net: number } | null>();

      rows.forEach((r, ri) => {
        if (!r.principal) return;
        modes.forEach((mode) => {
          const x = runLife(door, r.quad, r.options, mode);
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
      type Plan = { ri: number; mode: Mode; fam: string; draws: { quad: Cfg['quad']; options: EvalOptions; clipped: number; id: string }[] };
      const plans: Plan[] = [];
      const singles: { ri: number; mode: Mode; quad: Cfg['quad']; options: EvalOptions }[] = [];

      rows.forEach((r, ri) => {
        if (!r.cfg) return;
        for (const mode of modes) {
          if (r.principal) {
            for (let rep = 1; rep <= 3; rep++)
              plans.push({ ri, mode, fam: `confirm${rep}`, draws: drawsOf(r.cfg, r.options, famOf('confirm', ['confirm', rep, cutKey], r.control === 'D' ? 'd1' : 'joint')) });

            const bo = blackouts.get(`${ri}|${mode}`);

            if (bo) singles.push({ ri, mode, quad: r.quad, options: { ...r.options, blackouts: [{ first: bo.first, last: bo.last }] } });
          }
          if (finalCutoff(cutKey) && r.exportedBy.some((b) => b.mode === mode)) {
            plans.push({ ri, mode, fam: 'small', draws: drawsOf(r.cfg, r.options, famOf('small', ['small', cutKey], 'joint', 0.5)) });
            plans.push({ ri, mode, fam: 'wide', draws: drawsOf(r.cfg, r.options, famOf('wide', ['wide', cutKey], 'joint', 1.5)) });
          }
        }
      });

      lab.stage = `cross-test ${cutKey}: ${plans.length} families, ${singles.length} blackout reruns`;

      const famRecs = await lab.evalMany(
        plans.flatMap((p) => p.draws.map((d) => ({ quad: d.quad, options: d.options, mode: p.mode }))),
        'cross:neighbours'
      );
      const boRecs = await lab.evalMany(singles.map((x) => ({ quad: x.quad, options: x.options, mode: x.mode })), 'cross:blackout');
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
          modes.map((mode, mi) => {
            const c = centre(ri, mi);
            const conf = fams.filter((f) => f.ri === ri && f.mode === mode && f.fam.startsWith('confirm'));
            const one = (name: string) => {
              const f = fams.find((x) => x.ri === ri && x.mode === mode && x.fam === name);

              if (!f) return null;

              const s = pooledStats(c, [{ draws: f.draws, recs: f.recs }]);

              return { nb: s.nb as Nb, tail: s.tail as Tail, unique: s.unique };
            };
            const confirm = conf.length ? pooledStats(c, conf.map((f) => ({ draws: f.draws, recs: f.recs }))) : null;
            const boIndex = singles.findIndex((x) => x.ri === ri && x.mode === mode);
            const bo = blackouts.get(`${ri}|${mode}`) ?? null;

            return [
              mode,
              {
                centre: brief(c),
                confirm: confirm ? { nb: confirm.nb, tail: confirm.tail, drawn: confirm.drawn, unique: confirm.unique, nets: confirm.recs.map((x) => x.net), dds: confirm.recs.map((x) => x.dd), signatures: confirm.recs.map((x) => x.signature) } : null,
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
        columns: modes,
        rows: cells,
        compute: lab.compute,
        codeDigest: lab.digest,
        finished: new Date().toISOString()
      };

      seal(env, file, record, `cross-test ${cutKey}`);
      log(`cross-test ${cutKey}: ${rows.length} rows × ${modes.length} lifecycles sealed`);
      return record;
    }
  );
};

export type { Tail };
