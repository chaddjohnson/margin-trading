// The development diagnostics (PROTOCOL.md §11.1; D24; report-only, never a selection input), sealed before the frozen
// selection. For every frozen subject (each arm's baseline, role holders, partner candidate, best qualified partner and
// Appendix A control; E and D): the funded-lot, funding and refusal ledgers (the occupant of every refusal), holding
// periods, drawdown episodes and the Growth·GDX participation funnel by stage (3A's observer). For every GDX-enabled
// subject, the INCREMENT over its arm's baseline through complete reruns: matched lots (newly admitted, displaced,
// retimed exits; reconciled to the cent), Δ booked by book, Δ interest and costs, Δ final open marks, the anchor
// decisions refused while Growth·GDX held the slot (occupant, the refused virtual trade's own net — descriptive — and the
// idle closes during its unfunded hold), the increment by year and by development subperiod, and the largest pool-level
// winning episode with its causal blackout rerun for the subject and the baseline.
import fs from 'node:fs';
import path from 'node:path';
import { type BookId, bookIds } from '../vg-d1-growth-joint/books.ts';
import { type EvalOptions, type Rec, episodesOf, recordOf, run } from '../vg-d1-growth-joint/evaluate.ts';
import type { Door } from '../vg-d1-growth-joint/data.ts';
import {
  csv,
  drawdownEpisodes,
  fundingRows,
  holdingOf,
  lotRows,
  matchLots,
  refusalsOf
} from '../vg-d1-growth-joint/post.ts';
import { funnelOf, observe, poolTimeOf } from '../vg-d1-growth-diagnostic/observer.ts';
import { log, r2, repoRoot } from './context.ts';
import { settingsOf } from './controls.ts';
import { openStudyDoor } from './doors.ts';
import type { Evidence, Roles } from './qualify.ts';
import { isSealed, plain, readJson, sha256File, sha256Text } from './records.ts';
import { type Env, finalCutoff, seal, selectionFile, studyGuards } from './stages.ts';
import { type Arm, arms, optionsOfEnabled } from './space.ts';

export const diagDir = (env: Env) => path.join(env.outDir, 'diagnostics', 'D24');
export const finalOf = (env: Env) => (env.schedule === 'study' ? 'C24' : 'P18');

export interface SelectionRecord {
  primaries: Record<Arm, string | null>;
  roles: Record<string, Roles>;
  assessments: Record<Arm, { partnerCandidate: string | null; economicClass: string; labels: unknown[] }>;
  evidence: Evidence[];
}

export interface Subject {
  label: string;
  arm: Arm | null;
  ev: Evidence;
  role: string;
}

// The frozen subjects: per arm the baseline, every role holder, the partner candidate, the best qualified GDX-enabled
// member and the Appendix A control; then the contextual controls.
export const subjectsOf = (sel: SelectionRecord): Subject[] => {
  const out: Subject[] = [];
  const add = (e: Evidence | undefined, role: string) => {
    if (!e) return;

    const x = out.find((o) => o.label === e.label && o.arm === e.arm);

    if (x) x.role = [...new Set([...x.role.split(', '), role])].join(', ');
    else out.push({ label: e.label, arm: e.arm, ev: e, role });
  };

  for (const arm of arms) {
    const ev = (label: string | null) =>
      label ? sel.evidence.find((e) => e.arm === arm && e.label === label) : undefined;

    add(
      sel.evidence.find((e) => e.arm === arm && e.kind === 'baseline'),
      `${arm} baseline`
    );
    for (const [role, label] of Object.entries(sel.roles[arm]!.roles)) add(ev(label), `${arm} ${role}`);
    add(ev(sel.assessments[arm].partnerCandidate), `${arm} partner candidate`);
    add(
      sel.evidence
        .filter((e) => e.arm === arm && e.selectable && e.qualified && e.enabled.includes('G:GDX'))
        .sort((a, b) => b.centre.net - a.centre.net || (a.label < b.label ? -1 : 1))[0],
      `${arm} best qualified partner`
    );
    add(
      sel.evidence.find((e) => e.arm === arm && e.kind === 'control'),
      `${arm} Appendix A control`
    );
  }
  for (const e of sel.evidence.filter((x) => x.kind === 'context')) add(e, 'context');
  return out;
};

const slug = (label: string) => label.replace(/[^A-Za-z0-9#._-]+/g, '_').slice(0, 90);

const subperiods = [
  ['2016–2019', ['2016', '2017', '2018', '2019']],
  ['2020–2021', ['2020', '2021']],
  ['2022–2023', ['2022', '2023']],
  ['2024', ['2024']]
] as const;

const periodNet = (r: Rec, years: readonly string[]) => r2(years.reduce((a, y) => a + (r.years[y] ?? 0), 0));

export const runDiagnostics = async (env: Env) => {
  const dir = diagDir(env);
  const file = path.join(dir, 'diagnostics.json');
  const selFile = selectionFile(env, finalOf(env));

  studyGuards(env);
  if (!finalCutoff(finalOf(env)) || !isSealed(selFile)) throw new Error('the final selection is not sealed');
  if (fs.existsSync(file)) throw new Error(`${path.relative(repoRoot, file)} exists`);

  const sel = readJson<SelectionRecord>(selFile);
  const subjects = subjectsOf(sel);
  const door: Door = await openStudyDoor(env.schedule === 'study' ? 'D24' : 'D19', `${env.prefix}diagnostics`);
  const counters = { books: 0 };
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
  const runs = new Map<string, ReturnType<typeof observe>>();
  const obs = (s: Subject) => {
    const k = `${s.arm}|${s.label}`;

    if (!runs.has(k)) runs.set(k, observe(door, s.ev.quad, optionsOfEnabled(s.ev.enabled), counters, true));
    return runs.get(k)!;
  };
  const blackoutOf = (s: Subject, ob: ReturnType<typeof observe>, window: { first: string; last: string } | null) => {
    if (!window) return null;

    const o: EvalOptions = { ...optionsOfEnabled(s.ev.enabled), blackouts: [window] };
    const b: Rec = recordOf(door, s.ev.quad, run(door, s.ev.quad, o), o);

    return { ...window, net: b.net, dd: b.dd, lots: b.lots };
  };
  const topWindow = (ob: ReturnType<typeof observe>) => {
    const r = ob.result;
    const top = episodesOf(r)
      .filter((e) => e.net > 0)
      .sort((a, b) => b.net - a.net)[0];

    if (!top) return null;

    const last = Number.isFinite(top.last) ? Math.min(top.last, r.endIndex) : r.endIndex;

    return {
      first: door.dates[top.first]!,
      last: door.dates[last]!,
      net: r2(top.net),
      lots: top.lots,
      share: ob.rec.net > 0 ? Math.round((top.net / ob.rec.net) * 1e4) / 1e4 : null
    };
  };

  const rows = subjects.map((s) => {
    const ob = obs(s);
    const r = ob.result;
    const rec = ob.rec;
    const enabled = bookIds.filter((b) => s.ev.enabled.includes(b));
    const refusals = refusalsOf(door, { result: r, books: ob.books } as ReturnType<typeof run>);
    const top = topWindow(ob);
    const name = slug(`${s.arm ?? 'ctx'}_${s.label}`);

    writeCsv(`${name}/lots.csv`, lotRows(door, r) as unknown as Record<string, unknown>[]);
    writeCsv(`${name}/funding.csv`, fundingRows(door, r) as unknown as Record<string, unknown>[]);
    writeCsv(`${name}/refusals.csv`, refusals.rows as unknown as Record<string, unknown>[]);

    let increment: Record<string, unknown> | null = null;

    if (s.arm && s.ev.enabled.includes('G:GDX')) {
      const baseSubject = subjects.find((x) => x.arm === s.arm && x.ev.kind === 'baseline')!;
      const bo = obs(baseSubject);
      const brec = bo.rec;
      const m = matchLots(r, bo.result);
      const byBook = Object.fromEntries(
        bookIds.map((b) => [
          b,
          { booked: r2(rec.books[b].booked - brec.books[b].booked), lots: rec.books[b].lots - brec.books[b].lots }
        ])
      );
      const refusedByGdx = refusals.rows.filter((x) => x.occupant === 'G:GDX');
      const bTop = topWindow(bo);

      writeCsv(`${name}/matched-lots-vs-baseline.csv`, m.rows as unknown as Record<string, unknown>[]);
      increment = {
        baseline: baseSubject.label,
        deltaNet: r2(rec.net - brec.net),
        deltaRealized: r2(rec.realized - brec.realized),
        deltaOpenMarks: r2(rec.unrealized - brec.unrealized),
        deltaDd: r2(rec.dd - brec.dd),
        deltaInterest: r2(rec.interest - brec.interest),
        deltaCosts: r2(rec.costs - brec.costs),
        deltaLots: rec.lots - brec.lots,
        gdxBooked: rec.books['G:GDX'].booked,
        gdxLots: rec.books['G:GDX'].lots,
        gdxWins: rec.books['G:GDX'].wins,
        gdxLosses: rec.books['G:GDX'].losses,
        byBook,
        matched: m.summary,
        matchedByBook: m.byBook,
        matchedCheck: m.check,
        anchorRefusalsBehindGdx: {
          count: refusedByGdx.length,
          rows: refusedByGdx,
          virtualNetDescriptive: r2(refusedByGdx.reduce((a, x) => a + (x.virtualNet ?? 0), 0)),
          idleClosesDuringVirtualHolds: refusedByGdx.reduce((a, x) => a + x.idleSessionsDuringVirtualHold, 0)
        },
        byYear: Object.fromEntries(
          Object.keys({ ...rec.years, ...brec.years })
            .sort()
            .map((y) => [y, r2((rec.years[y] ?? 0) - (brec.years[y] ?? 0))])
        ),
        bySubperiod: Object.fromEntries(
          subperiods.map(([k, ys]) => [
            k,
            {
              subject: periodNet(rec, ys),
              baseline: periodNet(brec, ys),
              delta: r2(periodNet(rec, ys) - periodNet(brec, ys))
            }
          ])
        ),
        topEpisode: { subject: top, baseline: bTop },
        blackout: (() => {
          const w = top ? { first: top.first, last: top.last } : null;
          const sb = blackoutOf(s, ob, w);
          const bb = blackoutOf(baseSubject, bo, w);

          return sb && bb ? { window: w, subject: sb, baseline: bb, deltaNetAfterBlackout: r2(sb.net - bb.net) } : null;
        })(),
        poolTime: { subject: poolTimeOf(ob), baseline: poolTimeOf(bo) }
      };
    }

    return {
      label: s.label,
      arm: s.arm,
      role: s.role,
      id: s.ev.id,
      settings: settingsOf({ quad: s.ev.quad, enabled: s.ev.enabled, id: s.ev.id, p3Id: s.ev.p3Id }),
      record: rec,
      holding: holdingOf(door, r),
      drawdowns: drawdownEpisodes(door, r),
      refusalConflicts: refusals.conflicts,
      funnels: Object.fromEntries(enabled.filter((b) => b.startsWith('G:')).map((b) => [b, funnelOf(ob, b as BookId)])),
      poolTime: poolTimeOf(ob),
      topEpisode: top,
      increment
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
