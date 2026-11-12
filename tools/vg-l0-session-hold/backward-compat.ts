// Phase 3 verification of the New L0 trading-session study (research/vg-l0-session-hold): the experimental hold unit
// leaves the frozen calendar-day behaviour unchanged, and the session unit never shares a book with it.
//
// 1. ARCHIVE REPLAY. A deterministic sample of configurations from Priority 5B's own L0 search archives (doors D19, D21,
//    D23, D24; every structure V/G/B; read-only SQLite, `.cache/vg-lifecycle-matched-optimization/jobs/*`) is
//    re-evaluated in-process with the modified engine at its DEFAULT unit; every record must equal the archived one
//    field for field (the archive was written by the unmodified engine, evaluation digest 3f902532…).
// 2. INTERLEAVING. For a subset, calendar → sessions → calendar in one process: the second calendar record equals the
//    first (the book caches key the unit); the number of session records that differ is reported.
// 3. SESSION INVARIANTS. For the same subset under sessions, every maximum-hold and buffered-loss exit of every virtual
//    book happens at an age ≥ the book's hold in NYSE sessions (independently recounted from the dates), and under
//    calendar days at an age ≥ the hold in calendar days.
//
//   node --experimental-transform-types --disable-warning=ExperimentalWarning --max-old-space-size=8192 \
//     tools/vg-l0-session-hold/backward-compat.ts [--per-job 120] [--interleave 25] [--out <file>]
//
// Development doors only (D19–D24); FULL is never opened. Writes only the --out record.
import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { decode } from '../../src/growth140-vgt-s8m/store.ts';
import { nyseSessionsHeld } from '../../src/lib/tradingSessions.ts';
import { type BookId, symbolOf } from '../../src/vg-d1-growth-joint/books.ts';
import { type Door, openPrefixDoor } from '../../src/vg-d1-growth-joint/data.ts';
import { type EvalOptions, type Rec, evaluate, optionsKey, run } from '../../src/vg-d1-growth-joint/evaluate.ts';
import { quadId } from '../../src/vg-d1-growth-joint/space.ts';
import { type Cfg, optionsOf } from '../../src/vg-lifecycle-matched-optimization/config.ts';

const repoRoot = path.resolve(import.meta.dirname, '../..');
const arg = (name: string, fallback: string) => {
  const i = process.argv.indexOf(name);

  return i > 0 ? process.argv[i + 1]! : fallback;
};
const perJob = Number(arg('--per-job', '300'));
const interleave = Number(arg('--interleave', '25'));
const outFile = path.resolve(repoRoot, arg('--out', 'research/vg-l0-session-hold/recovery/backward-compat.json'));
const jobs = [
  { job: 'search-C19-indep', door: 'D19' },
  { job: 'search-C21-indep', door: 'D21' },
  { job: 'search-C23-indep', door: 'D23' },
  { job: 'search-C24-indep', door: 'D24' },
  { job: 'search-C24-informed', door: 'D24' }
] as const;

const canon = (r: Rec) => JSON.stringify(r);
const holdOf = (cfg: Cfg, b: BookId) =>
  b.startsWith('D1') ? cfg.quad.d1[symbolOf(b)].maximumHoldDays : (cfg.quad.g[symbolOf(b)].maximumHoldDays as number);
const holdOn = (cfg: Cfg, b: BookId) =>
  b.startsWith('D1') ? true : cfg.quad.g[symbolOf(b)].maximumHoldEnabled === true;

// every hold-gated exit (maximum hold, buffered loss) at an age ≥ the hold, in the unit's own count
const invariant = (door: Door, cfg: Cfg, o: EvalOptions) => {
  const x = run(door, cfg.quad, o, true);
  let checked = 0;
  const violations: string[] = [];

  for (const book of x.books) {
    if (!holdOn(cfg, book.book)) continue;

    const ds = door.sym[symbolOf(book.book)].ds;
    const hold = holdOf(cfg, book.book);

    for (const t of book.trades)
      for (const f of t.fills) {
        if (!/maximum.hold|buffered/i.test(f.reason)) continue;
        checked++;

        const age =
          o.holdUnit === 'sessions'
            ? nyseSessionsHeld(ds.sTime[t.eS]!, ds.sTime[f.s]!)
            : (ds.sTime[f.s]! - ds.sTime[t.eS]!) / 86_400;

        if (age < hold) violations.push(`${book.book} trade ${t.id}: ${f.reason} at age ${age} < ${hold}`);
      }
  }
  return { checked, violations };
};

const doors = new Map<string, Door>();
const out: Record<string, unknown>[] = [];
const totals = {
  compared: 0,
  identical: 0,
  skipped: 0,
  interleaved: 0,
  calendarStable: 0,
  sessionDiffers: 0,
  holdExits: 0,
  violations: 0
};
const t0 = Date.now();

for (const { job, door: doorName } of jobs) {
  const file = path.join(repoRoot, '.cache/vg-lifecycle-matched-optimization/jobs', job, 'archive.sqlite');
  const db = new DatabaseSync(file, { readOnly: true });
  const meta = Object.fromEntries(
    (db.prepare('SELECT k, v FROM meta').all() as { k: string; v: string }[]).map((r) => [r.k, r.v])
  );
  const point = db.prepare('SELECT json FROM points WHERE key = ?');
  const keyOf = (cfg: Cfg) => `L0|${doorName}|${optionsKey(optionsOf(cfg))}|${quadId(cfg.quad)}`;
  // the configurations with an archived L0 record (others were proposed by the L1/L2 lanes only)
  const all = db.prepare('SELECT key, json FROM configs ORDER BY key').all() as { key: string; json: string }[];
  const configs = all.filter((c) => point.get(keyOf(decode<Cfg>(c.json))) !== undefined);
  const step = Math.max(1, Math.floor(configs.length / perJob));
  const door =
    doors.get(doorName) ??
    (await openPrefixDoor(
      doorName as 'D19',
      `vg-l0-session-hold backward-compatibility replay (${job}, read-only)`,
      true
    ));

  doors.set(doorName, door);

  const rows: Record<string, unknown>[] = [];
  let n = 0;

  for (let i = 0; i < configs.length && n < perJob; i += step) {
    const cfg = decode<Cfg>(configs[i]!.json);
    const o = optionsOf(cfg);
    const archived = point.get(keyOf(cfg)) as { json: string } | undefined;

    if (!archived) {
      totals.skipped++;
      continue;
    }

    const want = decode<Rec>(archived.json);

    if (want.error) {
      totals.skipped++;
      continue;
    }

    const got = evaluate(door, cfg.quad, o);
    const same = canon(got) === canon(want);

    totals.compared++;
    if (same) totals.identical++;

    const row: Record<string, unknown> = { cfg: configs[i]!.key, inc: cfg.inc, net: want.net, identical: same };

    if (!same)
      row.diff = Object.keys(want).filter(
        (k) => JSON.stringify(got[k as keyof Rec]) !== JSON.stringify(want[k as keyof Rec])
      );

    if (n < interleave) {
      const ses = evaluate(door, cfg.quad, { ...o, holdUnit: 'sessions' });
      const again = evaluate(door, cfg.quad, o);
      const inv = { calendar: invariant(door, cfg, o), sessions: invariant(door, cfg, { ...o, holdUnit: 'sessions' }) };

      totals.interleaved++;
      if (canon(again) === canon(got)) totals.calendarStable++;
      if (canon(ses) !== canon(got)) totals.sessionDiffers++;
      totals.holdExits += inv.calendar.checked + inv.sessions.checked;
      totals.violations += inv.calendar.violations.length + inv.sessions.violations.length;
      Object.assign(row, {
        sessionNet: ses.net,
        sessionDd: ses.dd,
        calendarStable: canon(again) === canon(got),
        holdExits: { calendar: inv.calendar.checked, sessions: inv.sessions.checked },
        violations: [...inv.calendar.violations, ...inv.sessions.violations]
      });
    }

    rows.push(row);
    n++;
  }

  db.close();
  out.push({
    job,
    door: doorName,
    archiveDigest: meta.codeDigest,
    archiveDoorPin: meta.doorPin,
    configs: all.length,
    withL0Record: configs.length,
    rows
  });
  console.log(`${job}: ${rows.length} compared, ${rows.filter((r) => r.identical).length} identical`);
}

const record = {
  kind: 'vg-l0-session-hold Phase 3 backward-compatibility replay (calendar default vs 5B archives; session interleaving and invariants)',
  generated: new Date().toISOString(),
  totals,
  passed:
    totals.compared > 0 &&
    totals.identical === totals.compared &&
    totals.calendarStable === totals.interleaved &&
    totals.violations === 0,
  seconds: Math.round((Date.now() - t0) / 1000),
  jobs: out
};

fs.mkdirSync(path.dirname(outFile), { recursive: true });
fs.writeFileSync(outFile, `${JSON.stringify(record, null, 1)}\n`);
console.log(JSON.stringify({ totals, passed: record.passed, seconds: record.seconds }));
if (!record.passed) process.exit(1);
