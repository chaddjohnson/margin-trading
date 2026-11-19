// The development diagnostics (PROTOCOL.md §11.1; D24; report-only, never a selection input), sealed before the frozen
// selection. For every frozen subject: the funded-lot, funding and refusal ledgers (with the occupant of every
// refusal), holding periods, drawdown episodes, same-instant decision groups, the participation attribution of every
// enabled book by stage (3A's observer: signals and crossings, filter and gate blocks, eligibility, refusals by
// occupant, virtual-state waiting) and the pool's time use; the largest pool-level winning episode and its causal
// blackout rerun (no new funding inside it); matched lots against C4 (displacement read only through complete replays);
// for B subjects the GDX admission cost (the complete rerun without Growth·GDX); and the VGT trend-entry refusals.
import fs from 'node:fs';
import path from 'node:path';
import { type BookId, bookIds } from '../vg-d1-growth-joint/books.ts';
import { type EvalOptions, type Rec, episodesOf, recordOf, run } from '../vg-d1-growth-joint/evaluate.ts';
import { csv, drawdownEpisodes, fundingRows, holdingOf, lotRows, matchLots, refusalsOf, sameInstantOf } from '../vg-d1-growth-joint/post.ts';
import { funnelOf, observe, poolTimeOf } from '../vg-d1-growth-diagnostic/observer.ts';
import { log, r2, repoRoot } from './context.ts';
import { type Cfg, cfgId, optionsOf } from './config.ts';
import { loadControls, settingsOf } from './controls.ts';
import { openStudyDoor } from './doors.ts';
import type { Evidence, Roles } from './qualify.ts';
import { isSealed, plain, readJson, sha256File, sha256Text } from './records.ts';
import { type Env, finalCutoff, seal, selectionFile, studyGuards } from './stages.ts';

export const diagDir = (env: Env) => path.join(env.outDir, 'diagnostics', 'D24');
export const finalOf = (env: Env) => (env.schedule === 'study' ? 'C24' : 'P18');

export interface Subject {
  label: string;
  cfg: Cfg | null; // null: D (D1 only)
  quad: Cfg['quad'];
  options: EvalOptions;
  role: string;
}

export interface SelectionRecord {
  primary: string | null;
  roles: Record<string, Roles>;
  evidence: Evidence[];
  c4: { replacementCandidate: string | null; dominating: string[]; labels: unknown[] } | null;
}

// The frozen subjects: every role holder of every set (deduplicated, roles merged), the replacement candidate, and
// the controls (D with its own options).
export const subjectsOf = (sel: SelectionRecord): Subject[] => {
  const out: Subject[] = [];
  const add = (label: string, cfg: Cfg | null, quad: Cfg['quad'], options: EvalOptions, role: string) => {
    const x = out.find((o) => o.label === label);

    if (x) x.role = [...new Set([...x.role.split(', '), role])].join(', ');
    else out.push({ label, cfg, quad, options, role });
  };
  const ev = (label: string) => sel.evidence.find((x) => x.label === label)!;

  for (const [set, roles] of Object.entries(sel.roles))
    for (const [role, label] of Object.entries(roles.roles)) {
      if (!label) continue;

      const e = ev(label);

      add(label, e.cfg, e.cfg.quad, optionsOf(e.cfg), `${set}:${role}`);
    }
  if (sel.c4?.replacementCandidate) {
    const e = ev(sel.c4.replacementCandidate);

    add(e.label, e.cfg, e.cfg.quad, optionsOf(e.cfg), 'replacement candidate');
  }
  for (const c of loadControls().controls) {
    if (c.role === 'smaller-universe') continue;
    if (c.cfg) add(`control: ${c.key}`, c.cfg, c.cfg.quad, optionsOf(c.cfg), `control (${c.role})`);
    else add(`control: ${c.key}`, null, c.subject.quad, c.subject.options, `control (${c.role})`);
  }

  return out;
};

const slug = (label: string) => label.replace(/[^A-Za-z0-9#._-]+/g, '_').slice(0, 90);

export const runDiagnostics = async (env: Env) => {
  const dir = diagDir(env);
  const file = path.join(dir, 'diagnostics.json');
  const selFile = selectionFile(env, finalOf(env));

  studyGuards(env);
  if (!finalCutoff(finalOf(env)) || !isSealed(selFile)) throw new Error('the final selection is not sealed');
  if (fs.existsSync(file)) throw new Error(`${path.relative(repoRoot, file)} exists`);

  const sel = readJson<SelectionRecord>(selFile);
  const subjects = subjectsOf(sel);
  const door = await openStudyDoor(env.schedule === 'study' ? 'D24' : 'D19', `${env.prefix}diagnostics`);
  const counters = { books: 0 };
  const c4 = subjects.find((s) => s.label === 'control: C4')!;
  const c4Run = run(door, c4.quad, c4.options, true).result;
  const files: Record<string, string> = {};
  const writeCsv = (name: string, rows: Record<string, unknown>[]) => {
    const f = path.join(dir, name);
    const text = csv(rows);

    fs.mkdirSync(path.dirname(f), { recursive: true });
    if (fs.existsSync(f)) fs.chmodSync(f, 0o644);
    fs.writeFileSync(f, text);
    fs.chmodSync(f, 0o444);
    files[path.relative(dir, f)] = sha256Text(text);
  };
  const rows = subjects.map((s) => {
    const ob = observe(door, s.quad, s.options, counters, true);
    const x = { result: ob.result, books: ob.books };
    const r = ob.result;
    const rec = ob.rec;
    const enabled = bookIds.filter((b) => s.options.enabled?.[b] !== false);
    const refusals = refusalsOf(door, x as ReturnType<typeof run>);
    const eps = episodesOf(r)
      .filter((e) => e.net > 0)
      .sort((a, b) => b.net - a.net);
    const top = eps[0];
    let blackout: { first: string; last: string; net: number; dd: number; arithmetic: number } | null = null;

    if (top) {
      const last = Number.isFinite(top.last) ? Math.min(top.last, r.endIndex) : r.endIndex;
      const o = { ...s.options, blackouts: [{ first: door.dates[top.first]!, last: door.dates[last]! }] };
      const b: Rec = recordOf(door, s.quad, run(door, s.quad, o), o);

      blackout = { first: door.dates[top.first]!, last: door.dates[last]!, net: b.net, dd: b.dd, arithmetic: r2(rec.net - top.net) };
    }

    let gdxAdmission: Record<string, number> | null = null;

    if (s.cfg?.inc === 'B') {
      const o: EvalOptions = { ...s.options, enabled: { ...(s.options.enabled ?? {}), 'G:GDX': false } };
      const w: Rec = recordOf(door, s.quad, run(door, s.quad, o), o);

      gdxAdmission = {
        netWith: rec.net,
        netWithout: w.net,
        deltaNet: r2(rec.net - w.net),
        deltaVgtGrowthBooked: r2(rec.books['G:VGT'].booked - w.books['G:VGT'].booked),
        deltaD1Booked: r2(rec.fam.D1.booked - w.fam.D1.booked),
        gdxGrowthBooked: rec.books['G:GDX'].booked
      };
    }

    const name = slug(s.label);

    writeCsv(`${name}/lots.csv`, lotRows(door, r) as unknown as Record<string, unknown>[]);
    writeCsv(`${name}/funding.csv`, fundingRows(door, r) as unknown as Record<string, unknown>[]);
    writeCsv(`${name}/refusals.csv`, refusals.rows as unknown as Record<string, unknown>[]);

    return {
      label: s.label,
      role: s.role,
      id: s.cfg ? cfgId(s.cfg) : null,
      settings: s.cfg ? settingsOf(s.cfg) : { quad: s.quad, options: s.options },
      record: rec,
      holding: holdingOf(door, r),
      drawdowns: drawdownEpisodes(door, r),
      sameInstant: sameInstantOf(r),
      refusalConflicts: refusals.conflicts,
      vgtTrendEntryRefusals: refusals.rows.filter((x2) => x2.component === 'G:VGT'),
      funnels: Object.fromEntries(enabled.map((b) => [b, funnelOf(ob, b as BookId)])),
      poolTime: poolTimeOf(ob),
      topEpisode: top ? { first: door.dates[top.first], last: Number.isFinite(top.last) ? door.dates[Math.min(top.last, r.endIndex)] : 'open', net: r2(top.net), lots: top.lots, share: rec.net > 0 ? Math.round((top.net / rec.net) * 1e4) / 1e4 : null } : null,
      blackout,
      gdxAdmission,
      versusC4: s.label === 'control: C4' ? null : matchLots(r, c4Run)
    };
  });
  const record = {
    stage: 'diagnostics',
    door: door.name,
    selection: { file: path.relative(repoRoot, selFile), sha256: sha256File(selFile) },
    subjects: rows,
    files,
    observerBookRuns: counters.books,
    finished: new Date().toISOString()
  };

  seal(env, file, plain(record), 'diagnostics');
  log(`diagnostics: ${rows.length} subjects, ${Object.keys(files).length} ledger files`);
  return record;
};
