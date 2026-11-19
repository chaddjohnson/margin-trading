// The development diagnostics (PROTOCOL.md §11.3; report-only, never a selection input), sealed before the frozen
// selection, on the D24 door (2016-01-04 → 2024-12-31).
//
// For each principal row of the ablation (the nominee, each track's primary, New L0) under its own toggles and under all
// OFF, and for New L0 under the nominee's and each track primary's toggles: the detailed views (report.ts: the funded-lot
// ledger with fresh and delayed lots apart, the shadow-episode ledger, annual P&L and reset DD, per-strategy attribution,
// capital utilization, trade statistics) and the MATCHED-LOT comparisons that explain a difference without summing
// standalone profits: against New L0 (all OFF) and against the same phenotype with every toggle OFF — lots in both,
// lots only in one (by book and entry time), each set's net, reconciled to the difference of the two nets; the
// participation attribution by stage (standard §2.9): each book's decisions, refusals by occupant, episodes, recoveries
// and funded lots.
import fs from 'node:fs';
import path from 'node:path';
import { bookIds } from '../vg-d1-growth-joint/books.ts';
import { type Track, log, r2, repoRoot, tracks } from './context.ts';
import { type Cfg, withSh } from './config.ts';
import { controlOf, optionsOfControl } from './controls.ts';
import { openStudyDoor } from './doors.ts';
import { offSh } from './evaluate.ts';
import { ablationFile, exportSet } from './ablation.ts';
import { csvOf, detailOf } from './report.ts';
import { isSealed, readJson, sealJson, sha256File } from './records.ts';
import { type Env, cutoffs, finalSelectionFile, seal, studyGuards } from './stages.ts';

export const diagDir = (env: Env) => path.join(env.outDir, 'diagnostics');
export const finalOf = (env: Env) => (env.schedule === 'study' ? 'C24' : 'P18');

type Detail = ReturnType<typeof detailOf>;

// lots matched by (book, entry time): in both, only in X, only in Y; reconciled to the net difference
export const matchedLots = (x: Detail, y: Detail) => {
  const k = (l: { book: string; entry: string }) => `${l.book}@${l.entry}`;
  const ym = new Map(y.lots.map((l) => [k(l), l]));
  const xm = new Map(x.lots.map((l) => [k(l), l]));
  const both = x.lots.filter((l) => ym.has(k(l)));
  const onlyX = x.lots.filter((l) => !ym.has(k(l)));
  const onlyY = y.lots.filter((l) => !xm.has(k(l)));
  const sum = (ls: { net: number }[]) => r2(ls.reduce((a, l) => a + l.net, 0));
  const bothDiff = r2(both.reduce((a, l) => a + l.net - ym.get(k(l))!.net, 0));

  return {
    both: {
      lots: both.length,
      netDifference: bothDiff,
      retimedExits: both.filter((l) => l.exit !== ym.get(k(l))!.exit).length
    },
    onlyX: {
      lots: onlyX.length,
      net: sum(onlyX),
      delayed: onlyX.filter((l) => l.kind === 'delayed').length,
      delayedNet: sum(onlyX.filter((l) => l.kind === 'delayed')),
      list: onlyX.map((l) => `${l.book} ${l.kind} ${l.entry} ${l.net}`)
    },
    onlyY: { lots: onlyY.length, net: sum(onlyY), list: onlyY.map((l) => `${l.book} ${l.kind} ${l.entry} ${l.net}`) },
    reconciles: Math.abs(r2(x.rec.net - y.rec.net) - r2(bothDiff + sum(onlyX) - sum(onlyY))) <= 0.05,
    dNet: r2(x.rec.net - y.rec.net)
  };
};

const participation = (d: Detail) =>
  Object.fromEntries(
    bookIds
      .filter((b) => d.rec.books[b].decisions > 0 || d.rec.virtual[b])
      .map((b) => [
        b,
        {
          decisions: d.rec.books[b].decisions,
          granted: d.rec.books[b].granted,
          refused: d.rec.books[b].refused,
          episodes: d.rec.shadow?.byBook[b]?.episodes ?? 0,
          persisted: d.rec.shadow?.byBook[b]?.persisted ?? 0,
          recovered: d.rec.shadow?.byBook[b]?.recovered ?? 0,
          fundedLots: d.attribution[b]!.lots,
          booked: d.attribution[b]!.booked,
          principalDays: d.rec.books[b].principalDays
        }
      ])
  );

export const runDiagnostics = async (env: Env) => {
  const cutKey = finalOf(env);
  const cut = cutoffs[cutKey]!;
  const file = path.join(diagDir(env), 'diagnostics.json');

  studyGuards(env);
  if (fs.existsSync(file)) throw new Error(`${path.relative(repoRoot, file)} exists`);
  if (!isSealed(ablationFile(env, cutKey))) throw new Error('the ablation is not sealed');

  const fin = readJson<{ nominee: string | null; trackPrimaries: Record<Track, string | null> }>(
    finalSelectionFile(env, cutKey)
  );
  const rows = exportSet(env, cutKey).filter((r) => r.principal);
  const door = await openStudyDoor(cut.door, `${env.prefix}diagnostics (in-process)`);
  const nl0 = controlOf('NL0');
  const o0 = optionsOfControl(nl0);
  const nl0Off = detailOf(door, nl0.cfg, o0);
  const subjects: { name: string; cfg: Cfg; roles: string[] }[] = [];

  for (const r of rows) {
    const roles = r.exportedBy.flatMap((b) => b.roles);

    subjects.push({ name: `${r.row} own (${r.cfg.sh})`, cfg: r.cfg, roles });
    if (r.cfg.sh !== offSh) subjects.push({ name: `${r.row} all OFF`, cfg: withSh(r.cfg, offSh), roles });
    if (
      r.cfg.sh !== offSh &&
      r.control !== 'NL0' &&
      !subjects.some((x) => x.name.startsWith(`New L0 with toggles ${r.cfg.sh}`))
    )
      subjects.push({
        name: `New L0 with toggles ${r.cfg.sh} (${r.row}'s)`,
        cfg: withSh(nl0.cfg, r.cfg.sh),
        roles: []
      });
  }

  const out = subjects.map((s) => {
    const d = detailOf(door, s.cfg, s.cfg.inc === 'D' ? {} : o0);
    const off = s.cfg.sh === offSh ? null : detailOf(door, withSh(s.cfg, offSh), o0);
    const slug = s.name.replace(/[^A-Za-z0-9._-]+/g, '_').slice(0, 80);

    if (env.schedule === 'study') {
      const dir = path.join(diagDir(env), 'ledgers', slug);

      fs.mkdirSync(dir, { recursive: true });
      sealJson(path.join(dir, 'lots.json'), d.lots, `diagnostics ledger ${slug} lots`);
      sealJson(path.join(dir, 'episodes.json'), d.episodes, `diagnostics ledger ${slug} episodes`);
      fs.writeFileSync(path.join(dir, 'lots.csv'), csvOf(d.lots));
      fs.writeFileSync(path.join(dir, 'episodes.csv'), csvOf(d.episodes));
    }

    return {
      name: s.name,
      roles: s.roles,
      sh: s.cfg.sh,
      net: d.rec.net,
      dd: d.rec.dd,
      years: d.years,
      trades: d.trades,
      utilization: d.utilization,
      attribution: d.attribution,
      participation: participation(d),
      shadow: d.rec.shadow,
      versusNewL0: matchedLots(d, nl0Off),
      versusOwnOff: off ? matchedLots(d, off) : null
    };
  });
  const record = {
    stage: 'diagnostics',
    cutoff: cutKey,
    door: cut.door,
    schedule: env.schedule,
    nominee: fin.nominee,
    trackPrimaries: fin.trackPrimaries,
    ablation: sha256File(ablationFile(env, cutKey)),
    subjects: out,
    tracks,
    finished: new Date().toISOString()
  };

  seal(env, file, record, 'diagnostics');
  log(`diagnostics: ${out.length} subjects`);
  return record;
};
