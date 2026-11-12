// The C24 ablation cross-test (PROTOCOL.md §11.2; report-only): every frozen exported phenotype UNCHANGED in its numeric
// parameters under every combination of the toggles of its enabled books, on the training door D24 — the phenotype ×
// toggles matrix that separates the eligibility effect from the parameter effect (labels.ts `decompose`). A row is one
// exact phenotype (its own toggles marked); the columns are the eight combinations (four for a D1-only row). The
// ablation never selects, tunes or swaps anything.
//
// - Export set (frozen rule, applied to the sealed C24 final selection; sealed as exports.json before any ablation
//   evaluation): the nominee and the final set's four role holders; each track's four role holders and each replicate's
//   actual-profit holder (its final step); the sequential tracks' D1 finalists (D1-only rows); the controls New L0, C4,
//   C4-refined, C85, IJ1 and D.
// - Every row × column: the centre. Principal rows (the nominee, each track's primary, New L0): under '000' and under
//   their own toggles, the fresh confirmation family (3 × 128, the cutoff's draws) and a causal rerun with the cell's own
//   leading winning episode blacked out (no new funding inside it).
import fs from 'node:fs';
import path from 'node:path';
import { type EvalOptions, episodesOf } from '../vg-d1-growth-joint/evaluate.ts';
import type { Tail } from '../vg-d1-growth-diagnostic/risk.ts';
import { simulationCaps } from './budgets.ts';
import { type Track, cacheRoot, log, r2, repoRoot, searchKey, tracks } from './context.ts';
import { type Cfg, cfgId, growthOn, optionsOf, withSh } from './config.ts';
import { controlOf, optionsOfControl } from './controls.ts';
import { openStudyDoor } from './doors.ts';
import { type SRec, type Sh, allSh, run } from './evaluate.ts';
import { readSelection } from './folds.ts';
import { withLab } from './lab.ts';
import { type Evidence, type Roles, drawsOf, famOf, pooledStats } from './qualify.ts';
import { isSealed, readJson, sha256File } from './records.ts';
import {
  type Env,
  controlsFile,
  cutoffs,
  finalSelectionFile,
  finalStepOf,
  replicatesOf,
  seal,
  studyGuards
} from './stages.ts';
import type { Nb } from './fitness.ts';

export interface ExportRow {
  row: string; // R01, R02, …
  id: string; // cfgId (with its own toggles)
  cfg: Cfg;
  options: EvalOptions;
  exportedBy: { label: string; roles: string[] }[];
  control: string | null;
  principal: boolean;
}

export const exportsFile = (env: Env, cut: string) => path.join(env.outDir, 'ablation', cut, 'exports.json');
export const ablationFile = (env: Env, cut: string) => path.join(env.outDir, 'ablation', cut, 'matrix.json');

// the combinations a row's toggles can take (the toggles of its enabled books)
export const columnsOf = (c: Cfg): Sh[] => (growthOn(c.inc, 'VGT') ? [...allSh] : allSh.filter((s) => s[2] === '0'));

export const exportSet = (env: Env, cutKey: string) => {
  const fin = readJson<{
    nominee: string | null;
    roles: Record<string, Roles>;
    trackPrimaries: Record<Track, string | null>;
  }>(finalSelectionFile(env, cutKey));
  const sels = Object.fromEntries(tracks.map((t) => [t, readSelection(env, cutKey, t, finalStepOf(t))]));
  const controls = readJson<{ evidence: Evidence[] }>(controlsFile(env, cutKey)).evidence;
  const evidence = [...tracks.flatMap((t) => sels[t]!.evidence), ...controls];
  const rows: ExportRow[] = [];
  const add = (label: string | null | undefined, role: string, principal: boolean, cfgOverride?: Cfg) => {
    if (!label) return;

    const e = evidence.find((x) => x.label === label);
    const cfg = cfgOverride ?? e?.cfg;

    if (!cfg) throw new Error(`export ${label} has no evidence`);

    const id = cfgId(cfg);
    let row = rows.find((r) => r.id === id);

    if (!row) {
      row = {
        row: '',
        id,
        cfg,
        options: e?.control ? optionsOfControl(controlOf(e.control)) : optionsOf(cfg),
        exportedBy: [],
        control: e?.control ?? null,
        principal: false
      };
      rows.push(row);
    }

    let by = row.exportedBy.find((b) => b.label === label);

    if (!by) {
      by = { label, roles: [] };
      row.exportedBy.push(by);
    }
    if (!by.roles.includes(role)) by.roles.push(role);
    if (principal) row.principal = true;
  };

  add(fin.nominee, 'nominee (final actual-profit)', true);
  for (const [r, label] of Object.entries(fin.roles.final?.roles ?? {})) add(label, `final ${r}`, false);
  for (const t of tracks) {
    const name = searchKey(t, finalStepOf(t));

    for (const [r, label] of Object.entries(sels[t]!.roles[name]?.roles ?? {}))
      add(label, `${t} ${r}`, r === 'actual-profit');
    for (let rep = 1; rep <= replicatesOf(env, t, finalStepOf(t)); rep++)
      add(sels[t]!.roles[`${name} R${rep}`]?.roles['actual-profit'] ?? null, `${t} R${rep} actual-profit`, false);
    for (const f of sels[t]!.finalists ?? []) add(f.label, `${t} D1 finalist F${f.index}`, false, f.cfg);
  }
  for (const t of ['A2', 'B2'] as const) {
    const d1 = readSelection(env, cutKey, t, 'd1');

    for (const f of d1.finalists ?? []) add(f.label, `${t} D1 finalist F${f.index}`, false, f.cfg);
  }
  for (const k of ['NL0', 'C4', 'C4R', 'C85', 'IJ1', 'D']) add(`control: ${k}`, `control ${k}`, k === 'NL0');

  rows.forEach((r, i) => (r.row = `R${String(i + 1).padStart(2, '0')}`));
  return rows;
};

export const runAblation = async (cutKey: string, env: Env) => {
  const cut = cutoffs[cutKey]!;
  const file = ablationFile(env, cutKey);
  const exFile = exportsFile(env, cutKey);

  studyGuards(env);
  if (fs.existsSync(file)) throw new Error(`${path.relative(repoRoot, file)} exists`);
  if (!isSealed(finalSelectionFile(env, cutKey))) throw new Error('the final selection is not sealed');

  const rows = exportSet(env, cutKey);

  if (!fs.existsSync(exFile))
    seal(
      env,
      exFile,
      { stage: 'ablation exports', cutoff: cutKey, rows: rows.map(({ cfg: _c, ...r }) => ({ ...r, cfg: _c })) },
      `ablation exports ${cutKey}`
    );

  const job = `${env.prefix}ablation-${cutKey}`;

  return withLab(
    {
      job,
      door: cut.door,
      purpose: `${env.prefix}ablation ${cutKey}`,
      workers: env.workers,
      ...(env.schedule === 'pilot' ? { memoryLog: path.join(cacheRoot, 'pilot', 'memory', `${job}.jsonl`) } : {}),
      maxFresh: env.schedule === 'study' ? simulationCaps.ablation : undefined
    },
    async (lab) => {
      const cells = rows.flatMap((r) => columnsOf(r.cfg).map((sh) => ({ r, sh, cfg: withSh(r.cfg, sh) })));
      const centres = await lab.evalMany(
        cells.map((c) => ({ quad: c.cfg.quad, options: c.r.options, sh: c.sh })),
        'ablation:centre'
      );
      const matrix = rows.map((r) => ({
        row: r.row,
        id: r.id,
        own: r.cfg.sh,
        control: r.control,
        principal: r.principal,
        exportedBy: r.exportedBy,
        cells: Object.fromEntries(
          cells
            .map((c, i) => ({ c, rec: centres[i]! }))
            .filter((x) => x.c.r === r)
            .map((x) => [x.c.sh, cellOf(x.rec)])
        )
      }));

      // principal rows: confirmation (3 × 128) under '000' and their own toggles, and the own-episode blackout reruns
      const principals = rows.filter((r) => r.principal);
      const plans = principals.flatMap((r) =>
        [...new Set(['000', r.cfg.sh])].map((sh) => {
          const cfg = withSh(r.cfg, sh);
          const fams = [1, 2, 3].map((rep) =>
            drawsOf(cfg, r.options, famOf('confirm', ['confirm', rep, cutKey], 'joint'))
          );

          return { r, sh, cfg, fams };
        })
      );
      const famRecs = await lab.evalMany(
        plans.flatMap((p) => p.fams.flat().map((d) => ({ quad: d.quad, options: d.options, sh: p.sh }))),
        'ablation:confirm'
      );
      let at = 0;
      const door = await openStudyDoor(cut.door, `${env.prefix}ablation ${cutKey} blackouts (in-process)`);
      const principal = plans.map((p) => {
        const centre = centres[cells.findIndex((c) => c.r === p.r && c.sh === p.sh)]! as SRec;
        const recs = p.fams.map((f) => f.map(() => famRecs[at++]!));
        const pooled = pooledStats(
          centre,
          p.fams.map((f, i) => ({ draws: f, recs: recs[i]! }))
        );
        // the cell's own leading winning episode, blacked out (no new funding inside it)
        const x = run(door, p.cfg.quad, p.r.options, p.sh, true);
        const eps = episodesOf(x.result)
          .filter((e) => e.net > 0)
          .sort((a, b) => b.net - a.net);
        const top = eps[0];
        let blackout: { first: string; last: string; net: number; dd: number; withoutEpisode: number } | null = null;

        if (top) {
          const b = { first: door.dates[top.first]!, last: door.dates[Math.min(top.last, door.sessions - 1)]! };
          const y = run(door, p.cfg.quad, { ...p.r.options, blackouts: [b] }, p.sh);

          blackout = {
            ...b,
            net: r2(y.result.net),
            dd: r2(y.result.dd.max),
            withoutEpisode: r2(centre.net - y.result.net)
          };
        }

        return {
          row: p.r.row,
          sh: p.sh,
          own: p.sh === p.r.cfg.sh,
          confirm: pooled.nb as Nb,
          confirmTail: pooled.tail as Tail,
          draws: { drawn: pooled.drawn, unique: pooled.unique },
          topEpisode: top
            ? {
                first: door.dates[top.first],
                last: door.dates[Math.min(top.last, door.sessions - 1)],
                net: r2(top.net),
                lots: top.lots
              }
            : null,
          blackout
        };
      });
      const record = {
        stage: 'ablation',
        cutoff: cutKey,
        door: cut.door,
        schedule: env.schedule,
        exports: sha256File(exFile),
        finalSelection: sha256File(finalSelectionFile(env, cutKey)),
        matrix,
        principal,
        compute: lab.compute,
        codeDigest: lab.digest,
        finished: new Date().toISOString()
      };

      seal(env, file, record, `ablation ${cutKey}`);
      log(`ablation ${cutKey}: ${rows.length} rows × their toggle combinations; ${principal.length} principal cells`);
      return record;
    }
  );
};

export const cellOf = (r: SRec) => ({
  net: r.net,
  dd: r.dd,
  lots: r.lots,
  booked: Object.fromEntries(Object.entries(r.books).map(([b, x]) => [b, x.booked])),
  recovered: r.shadow?.recovered ?? 0,
  recoveredNet: r.shadow?.recoveredNet ?? 0,
  displaced: r.shadow?.displaced ?? 0,
  episodes: r.shadow?.episodes ?? 0,
  signature: r.signature,
  shadow: r.shadow
});
