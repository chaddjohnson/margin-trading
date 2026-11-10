// The development diagnostics (PROTOCOL.md §11.1; D24; report-only, never a selection input), sealed before the frozen
// selection. For every frozen subject (the holders of every role of the final, independent, informed and controls sets,
// and Appendix A): the funded-lot ledger and holding periods, wins/losses and partial exits, independent market
// episodes, exposure, time under water, open marks, the maximum minute drawdown with its peak / trough / recovery and the
// positions responsible, the five deepest daily-close drawdown episodes with their positions, the GDX decision funnel by
// stage (Priority 3A's observer: signals, filter and gate blocks, eligibility arming / expiry / invalidation, signals
// while the book's own position is open — standalone GDX has no capital competitor), the largest winning episode's
// contribution and its CAUSAL NO-NEW-FUNDING rerun (every decision inside the episode window refused, the virtual book
// continuing under L0 — never a subtraction of its booked profit), and the result by year and development subperiod.
import fs from 'node:fs';
import path from 'node:path';
import { type EvalOptions, type Rec, episodesOf, recordOf, run } from '../vg-d1-growth-joint/evaluate.ts';
import type { Door } from '../vg-d1-growth-joint/data.ts';
import type { PoolResult } from '../vg-d1-growth-joint/pool.ts';
import { csv, drawdownEpisodes, fundingRows, holdingOf, lotRows } from '../vg-d1-growth-joint/post.ts';
import { funnelOf, observe } from '../vg-d1-growth-diagnostic/observer.ts';
import { log, r2, repoRoot } from './context.ts';
import { settingsOf } from './controls.ts';
import { openStudyDoor } from './doors.ts';
import type { Evidence, Roles } from './qualify.ts';
import { isSealed, plain, readJson, sha256File, sha256Text } from './records.ts';
import { type Env, finalCutoff, seal, selectionFile, studyGuards } from './stages.ts';
import { optionsOfEnabled } from './space.ts';

export const diagDir = (env: Env) => path.join(env.outDir, 'diagnostics', 'D24');
export const finalOf = (env: Env) => (env.schedule === 'study' ? 'C24' : 'P18');

export interface SelectionRecord {
  primary: string | null;
  independentPrimary: string | null;
  fallback: string;
  roles: Record<string, Roles>;
  evidence: Evidence[];
  versusAppendixA: unknown[];
  nearMisses: unknown[];
}

export interface Subject {
  label: string;
  ev: Evidence;
  role: string;
}

// The frozen subjects: every role holder of every set, Appendix A; in role order.
export const subjectsOf = (sel: SelectionRecord): Subject[] => {
  const out: Subject[] = [];
  const add = (e: Evidence | undefined, role: string) => {
    if (!e) return;

    const x = out.find((o) => o.label === e.label);

    if (x) x.role = [...new Set([...x.role.split(', '), role])].join(', ');
    else out.push({ label: e.label, ev: e, role });
  };
  const ev = (label: string | null) => (label ? sel.evidence.find((e) => e.label === label) : undefined);

  for (const set of ['final', 'independent', 'informed', 'controls'])
    for (const [role, label] of Object.entries(sel.roles[set]?.roles ?? {}))
      add(
        ev(label),
        set === 'final' ? (role === 'actual-profit' ? 'PRIMARY (actual-profit)' : role) : `${set} ${role}`
      );
  add(
    sel.evidence.find((e) => e.control === 'A'),
    'Appendix A (exact control)'
  );
  return out;
};

const slug = (label: string) => label.replace(/[^A-Za-z0-9#._-]+/g, '_').slice(0, 90);

export const subperiods = [
  ['2016–2019', ['2016', '2017', '2018', '2019']],
  ['2020–2021', ['2020', '2021']],
  ['2022–2023', ['2022', '2023']],
  ['2024', ['2024']]
] as const;

const periodNet = (r: Rec, years: readonly string[]) => r2(years.reduce((a, y) => a + (r.years[y] ?? 0), 0));
const iso = (t: number) =>
  Number.isFinite(t) ? `${new Date(t * 1000).toISOString().slice(0, 16).replace('T', ' ')}Z` : null;

// The lots open at any time between a drawdown's peak and its trough (the positions responsible).
export const lotsBetween = (door: Door, r: PoolResult, peakT: number, troughT: number) =>
  r.lots
    .filter((l) => l.entryT <= troughT && (l.open || l.fills.at(-1)!.t >= peakT))
    .map((l) => ({
      lot: l.id,
      entry: door.dates[l.entryS]!,
      exit: l.open ? null : door.dates[l.fills.at(-1)!.s]!,
      kind: l.trade.kind,
      net: r2(l.net),
      worstMark: r2(l.worst),
      worstAt: iso(l.worstT)
    }));

// Sessions under water (the close's marked net below an earlier closing peak) and the longest such run.
export const underwaterOf = (r: PoolResult) => {
  let peak = -Infinity;
  let under = 0;
  let run0 = 0;
  let longest = 0;
  let n = 0;

  for (let s = 0; s <= r.endIndex; s++) {
    const v = r.daily[s]!;

    if (Number.isNaN(v)) continue;
    n++;
    if (v < peak - 1e-9) {
      under++;
      run0++;
      longest = Math.max(longest, run0);
    } else run0 = 0;
    peak = Math.max(peak, v);
  }
  return { sessions: n, underwater: under, share: n ? Math.round((under / n) * 1e4) / 1e4 : 0, longest };
};

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

  const rows = subjects.map((s) => {
    const o = optionsOfEnabled(s.ev.enabled as never);
    const ob = observe(door, s.ev.quad, o, counters, true);
    const r = ob.result;
    const rec = ob.rec;
    const name = slug(s.label);
    const eps = episodesOf(r);
    const winners = eps.filter((e) => e.net > 0).sort((a, b) => b.net - a.net);
    const top = winners[0];
    // the episode's window starts at its first lot's DECISION session (the engine refuses decisions by their
    // decision session; a Rise decision is made at the close before its fill) and ends at its last exit
    const topLots = top
      ? r.lots.filter((l) => l.entryS >= top.first && (Number.isFinite(top.last) ? l.entryS <= top.last : true))
      : [];
    const topWindow = top
      ? {
          first: door.dates[Math.min(...topLots.map((l) => l.trade.dS))]!,
          firstEntry: door.dates[top.first]!,
          last: door.dates[Number.isFinite(top.last) ? Math.min(top.last, r.endIndex) : r.endIndex]!,
          net: r2(top.net),
          lots: top.lots,
          share: rec.net > 0 ? Math.round((top.net / rec.net) * 1e4) / 1e4 : null
        }
      : null;
    // the causal no-new-funding rerun over the top episode (every decision inside the window refused)
    const blackout = topWindow
      ? (() => {
          const bo: EvalOptions = { ...o, blackouts: [{ first: topWindow.first, last: topWindow.last }] };
          const b: Rec = recordOf(door, s.ev.quad, run(door, s.ev.quad, bo), bo);

          return {
            window: { first: topWindow.first, last: topWindow.last },
            net: b.net,
            dd: b.dd,
            lots: b.lots,
            causalContribution: r2(rec.net - b.net),
            arithmeticWithoutEpisode: r2(rec.net - topWindow.net)
          };
        })()
      : null;
    const dailyEpisodes = drawdownEpisodes(door, r).map((e) => {
      const p = door.dates.indexOf(e.peak);
      const t = door.dates.indexOf(e.trough);
      const close = door.sym.GDX.ds.sCloseTime;

      return { ...e, positions: lotsBetween(door, r, close[p]!, close[t]!) };
    });

    writeCsv(`${name}/lots.csv`, lotRows(door, r) as unknown as Record<string, unknown>[]);
    writeCsv(`${name}/funding.csv`, fundingRows(door, r) as unknown as Record<string, unknown>[]);

    return {
      label: s.label,
      role: s.role,
      kind: s.ev.kind,
      id: s.ev.id,
      settings: settingsOf({ quad: s.ev.quad, enabled: s.ev.enabled as never, id: s.ev.id, p3Id: s.ev.p3Id }),
      record: rec,
      activity: {
        lots: rec.lots,
        wins: rec.books['G:GDX'].wins,
        losses: rec.books['G:GDX'].losses,
        partialExits: rec.partials,
        independentEpisodes: eps.length,
        winningEpisodes: winners.length,
        losingEpisodes: eps.filter((e) => e.net < 0).length,
        exposure: rec.sessions ? Math.round((rec.sessionsHeld / rec.sessions) * 1e4) / 1e4 : 0,
        sessionsHeld: rec.sessionsHeld,
        sessions: rec.sessions,
        openMarks: rec.unrealized,
        interest: rec.interest,
        costs: rec.costs,
        lossSum: rec.lossSum,
        worstLoss: rec.worstLoss,
        largestWin: rec.largestWin
      },
      holding: holdingOf(door, r)['G:GDX'],
      underwater: underwaterOf(r),
      minuteDd: {
        dd: rec.dd,
        peak: iso(rec.ddPeakT),
        trough: iso(rec.ddTroughT),
        recovery: iso(rec.ddRecoveryT),
        recovered: Number.isFinite(rec.ddRecoveryT),
        positions: rec.dd > 0 ? lotsBetween(door, r, rec.ddPeakT, rec.ddTroughT) : []
      },
      dailyEpisodes,
      episodes: eps.map((e) => ({
        first: door.dates[e.first]!,
        last: Number.isFinite(e.last) ? door.dates[Math.min(e.last, r.endIndex)]! : 'open',
        net: r2(e.net),
        lots: e.lots
      })),
      topEpisode: topWindow,
      secondEpisode: winners[1] ? r2(winners[1].net) : null,
      blackout,
      funnel: funnelOf(ob, 'G:GDX'),
      byYear: rec.years,
      bySubperiod: Object.fromEntries(subperiods.map(([k, ys]) => [k, periodNet(rec, ys)]))
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
