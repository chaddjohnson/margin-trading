// Stage V — the engineering gates (PROTOCOL.md §12), sealed as results/parity/parity.json before the protocol freeze; a
// failure stops every dependent stage. In-process on the development doors (FULL is never opened here).
//
// G1 calendar reproduction through this study's path (unit 'cal'): New L0, C4, C4-refined, C85, D and IJ1 = 5B's sealed
//    L0 C24 evidence centres field for field; New L0's centre = the record of 5B's search archive; VG #2 native =
//    $260,223.13 / $17,280.74 / 36 lots / 14 refusals.
// G2 backward compatibility of the engine change: a deterministic sample of 5B's archived L0 records (its own search
//    archives on D19, D21, D23, D24; every structure) re-evaluated at the default unit = the archived records field for
//    field (the archives were written before the hold-unit option existed); bound to Priority 3's current evaluation
//    digest (the freeze requires it).
// G3 path identity under 'ses': the fast and the detailed pooled runs agree (48 random V configurations, D24).
// G4 causal prefix under 'ses': random V configurations on D19, D21, D23 equal their D24 runs up to the shorter door
//    (funding records, lots and fills, daily marks).
// G5 accounting under both units on every run of G3/G4 (Σ lot nets = net, Σ interest, Σ costs, peak principal ≤
//    $100,000, one slot, realized + unrealized = net).
// G6 unit separation: interleaved cal → ses → cal evaluations in one process give the first record again (the book
//    caches key the unit); the session records differ from the calendar ones where a hold binds.
// G7 the session hold rule on real data: every maximum-hold and buffered-loss exit of every virtual book happens at an
//    age ≥ the book's hold, counted independently from the dates (NYSE sessions under 'ses', calendar days under 'cal');
//    under 'ses' New L0's books exit by the hold no earlier than under 'cal'.
// G8 single-family identities under 'ses': a pool with one component enabled = that book's standalone run (its trades'
//    fills and net); D1-only pools equal their D1 books.
// G9 the archive key carries the unit.
import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { decode as storeDecode, encode as storeEncode } from '../growth140-vgt-s8m/store.ts';
import { nyseSessionsHeld } from '../lib/tradingSessions.ts';
import { type BookId, symbolOf } from '../vg-d1-growth-joint/books.ts';
import type { Door } from '../vg-d1-growth-joint/data.ts';
import { type EvalOptions, type Rec, evalKey, optionsKey, run } from '../vg-d1-growth-joint/evaluate.ts';
import type { PoolResult } from '../vg-d1-growth-joint/pool.ts';
import { requireStandardAdoption } from '../research-standard/preflight.ts';
import { simulationCaps } from './budgets.ts';
import { type Unit, economics, log, r2, repoRoot, researchDir, resultsDir, units } from './context.ts';
import { type Cfg, cells, decode, optionsOf, pinCell, pinStratum, quadId, screenGenomes } from './config.ts';
import { controlOf, loadControls, optionsOfControl } from './controls.ts';
import { openStudyDoor } from './doors.ts';
import { p3EvaluationDigest } from './lab.ts';
import { isSealed, readJson, sealJson, sha256File } from './records.ts';
import { evaluateUnit, recordOfRun, runUnit, unitKey, withUnit } from './unit.ts';

export const parityFile = path.join(resultsDir, 'parity', 'parity.json');

const same = (a: unknown, b: unknown) => storeEncode(a) === storeEncode(storeDecode(storeEncode(b)));

// 5B's sealed C24 selection (the L0 evidence centres) and its search archives (local, read-only).
const p5bSelection = {
  file: 'research/vg-lifecycle-matched-optimization/results/folds/C24/selection.json',
  sha256: '0615262bec59bdde' // prefix; the full record is pinned through 5B's seals.jsonl below
};
const p5bJobs = path.join(repoRoot, '.cache/vg-lifecycle-matched-optimization/jobs');

interface Check {
  gate: string;
  name: string;
  ok: boolean;
  detail?: unknown;
}

// Random V configurations of every sub-cell's strata (this study's namespace; labels never used by a search).
export const randomCfgs = (n: number, label: string): Cfg[] => {
  const out: Cfg[] = [];

  for (const cell of cells) {
    const gs = screenGenomes(n * 8, 'coarse', 'parity', label, cell.sub!);
    let k = 0;

    for (let i = 0; i < gs.length && k < n; i++) {
      try {
        out.push(decode(pinStratum(pinCell(gs[i]!, cell), cell, i), 'coarse'));
        k++;
      } catch {
        // an invalid genome
      }
    }
  }
  return out;
};

const lotsOverlap = (r: PoolResult) => {
  const lots = [...r.lots].sort((a, b) => a.entryT - b.entryT);

  for (let i = 1; i < lots.length; i++) {
    const prev = lots[i - 1]!;

    if (prev.open || prev.fills.at(-1)!.t > lots[i]!.entryT) return true;
  }
  return false;
};

const accounting = (rec: Rec, r: PoolResult) => {
  const sum = (f: (l: PoolResult['lots'][number]) => number) => r.lots.reduce((a, l) => a + f(l), 0);

  return {
    lotsNet: Math.abs(r2(sum((l) => l.net)) - rec.net) <= 0.01,
    interest: Math.abs(r2(sum((l) => l.interest)) - rec.interest) <= 0.01,
    costs: Math.abs(r2(sum((l) => l.costs)) - rec.costs) <= 0.01,
    principal: rec.peakPrincipal <= economics.budget + 1e-6,
    oneSlot: !lotsOverlap(r),
    realizedPlusUnrealized: Math.abs(rec.realized + rec.unrealized - rec.net) <= 0.015
  };
};

// every hold-gated exit at an age ≥ the hold, counted independently from the dates in the unit's own count
const holdExits = (door: Door, cfg: Cfg, x: ReturnType<typeof run>, unit: Unit) => {
  const out: { book: BookId; trade: number; age: number; hold: number; reason: string; entry: string; exit: string }[] =
    [];

  for (const book of x.books) {
    const s = symbolOf(book.book);
    const hold = book.book.startsWith('D1')
      ? cfg.quad.d1[s].maximumHoldDays
      : (cfg.quad.g[s].maximumHoldDays as number);

    if (book.book.startsWith('G') && cfg.quad.g[s].maximumHoldEnabled !== true) continue;

    const ds = door.sym[s].ds;

    for (const t of book.trades)
      for (const f of t.fills) {
        if (!/maximum.hold|buffered/i.test(f.reason)) continue;

        const age =
          unit === 'ses'
            ? nyseSessionsHeld(ds.sTime[t.eS]!, ds.sTime[f.s]!)
            : (ds.sTime[f.s]! - ds.sTime[t.eS]!) / 86_400;

        out.push({
          book: book.book,
          trade: t.id,
          age,
          hold,
          reason: f.reason,
          entry: ds.dates[t.eS]!,
          exit: ds.dates[f.s]!
        });
      }
  }
  return out;
};

export const runParity = async (o: { dry?: boolean; out?: string } = {}) => {
  const outFile = o.out ? path.join(resultsDir, 'parity', o.out) : parityFile;

  if (!o.dry) requireStandardAdoption(researchDir, { repoRoot });
  if (!o.dry && isSealed(outFile)) throw new Error(`${outFile} is sealed`);

  const checks: Check[] = [];
  let simulations = 0;
  const add = (gate: string, name: string, ok: boolean, detail?: unknown) => {
    checks.push({ gate, name, ok, ...(ok ? {} : { detail }) });
    if (!ok) log(`FAIL ${gate} ${name}`);
  };
  const D24 = await openStudyDoor('D24', 'stage V (engineering gates)');
  const doors: Record<string, Door> = { D24 };

  for (const dn of ['D19', 'D21', 'D23'] as const) doors[dn] = await openStudyDoor(dn, `stage V (${dn})`);

  const runOf = (door: Door, q: Cfg['quad'], oo: EvalOptions, unit: Unit) => {
    simulations++;
    const x = runUnit(door, q, oo, unit);

    return { x, rec: recordOfRun(door, q, x, oo, unit) };
  };

  // ----- G1: calendar reproduction of the sealed 5B centres -----
  {
    const sel = readJson<{
      evidence: { label: string; mode: string; control: string | null; id: string; centre: Rec }[];
    }>(path.join(repoRoot, p5bSelection.file));
    const seal5b = fs
      .readFileSync(path.join(repoRoot, 'research/vg-lifecycle-matched-optimization/results/seals.jsonl'), 'utf8')
      .trim()
      .split('\n')
      .map((l) => JSON.parse(l) as { file: string; sha256: string })
      .find((s) => s.file === p5bSelection.file)!;

    const shaNow = sha256File(path.join(repoRoot, p5bSelection.file));

    add(
      'G1',
      `5B C24 selection pinned (${shaNow.slice(0, 16)})`,
      shaNow === seal5b.sha256 && shaNow.startsWith(p5bSelection.sha256)
    );

    const target = (key: string) => {
      if (key === 'NL0')
        return sel.evidence.find((e) => e.mode === 'L0' && e.label === 'C24/L0/informed/R1#1 profit')!.centre;
      if (key === 'IJ1') return sel.evidence.find((e) => e.mode === 'L0' && e.id === '940fdaf770eedc9d')!.centre;
      return sel.evidence.find((e) => e.mode === 'L0' && e.control === key)!.centre;
    };

    for (const c of loadControls()) {
      const { x, rec } = runOf(D24, c.cfg.quad, optionsOfControl(c), 'cal');
      const want = target(c.key);

      add('G1', `${c.key} (cal) = 5B's sealed L0 centre field for field (${quadId(c.cfg.quad)})`, same(rec, want), {
        got: rec.net,
        want: want.net
      });
      for (const [a, ok] of Object.entries(accounting(rec, x.result))) add('G5', `${c.key} cal accounting ${a}`, ok);
    }

    const d = controlOf('D');
    const native = runOf(D24, d.cfg.quad, { ...optionsOfControl(d), d1Arm: 'native' }, 'cal').rec;

    add(
      'G1',
      'VG #2 native = $260,223.13 / $17,280.74 / 36 lots / 14 refusals',
      native.net === 260223.13 &&
        native.dd === 17280.74 &&
        native.lots === 36 &&
        native.books['D1:GDX'].refused + native.books['D1:VGT'].refused === 14,
      { net: native.net, dd: native.dd, lots: native.lots }
    );
  }

  // ----- G2: 5B's archived L0 records reproduce at the default unit -----
  {
    let compared = 0;
    let identical = 0;

    for (const [job, dn] of [
      ['search-C19-indep', 'D19'],
      ['search-C21-indep', 'D21'],
      ['search-C23-indep', 'D23'],
      ['search-C24-indep', 'D24'],
      ['search-C24-informed', 'D24']
    ] as const) {
      const db = new DatabaseSync(path.join(p5bJobs, job, 'archive.sqlite'), { readOnly: true });
      const point = db.prepare('SELECT json FROM points WHERE key = ?');
      const keyOf = (c: Cfg) => `L0|${dn}|${optionsKey(optionsOf(c))}|${quadId(c.quad)}`;
      const all = (db.prepare('SELECT key, json FROM configs ORDER BY key').all() as { key: string; json: string }[])
        .map((r) => storeDecode<Cfg>(r.json))
        .filter((c) => point.get(keyOf(c)) !== undefined);
      const step = Math.max(1, Math.floor(all.length / 200));
      let n = 0;

      for (let i = 0; i < all.length && n < 200; i += step, n++) {
        const c = all[i]!;
        const want = storeDecode<Rec>((point.get(keyOf(c)) as { json: string }).json);

        if (want.error) continue;

        const got = evaluateUnit(doors[dn]!, c.quad, optionsOf(c), 'cal');

        simulations++;
        compared++;
        if (same(got, want)) identical++;
        else
          add('G2', `${job} ${quadId(c.quad)} differs from its archived record`, false, {
            got: got.net,
            want: want.net
          });
      }
      db.close();
    }

    add(
      'G2',
      `${identical} of ${compared} archived 5B L0 records (D19, D21, D23, D24; V, G, B) identical at the default unit`,
      compared >= 900 && identical === compared
    );
    add('G2', "bound to Priority 3's current evaluation digest", typeof p3EvaluationDigest() === 'string');
  }

  // ----- G3 / G5: fast = detail under 'ses' (and accounting under both units) -----
  const rand = randomCfgs(16, 'g3');

  for (const [i, c] of rand.entries()) {
    const oo = optionsOf(c);
    const fast = evaluateUnit(D24, c.quad, oo, 'ses');
    const { x, rec } = runOf(D24, c.quad, oo, 'ses');

    simulations++;
    add('G3', `random ${i} (${c.inc}) ses fast = detail`, same(fast, rec));
    for (const [a, ok] of Object.entries(accounting(rec, x.result))) add('G5', `random ${i} ses accounting ${a}`, ok);
  }

  // ----- G4: causal prefix under 'ses' -----
  for (const [i, c] of randomCfgs(4, 'g4').entries()) {
    const oo = optionsOf(c);
    const full = runOf(D24, c.quad, oo, 'ses').x;

    for (const dn of ['D19', 'D21', 'D23'] as const) {
      const door = doors[dn]!;
      const short = runOf(door, c.quad, oo, 'ses');
      const end = door.sessions - 1;
      const cut = door.sym.VGT.ds.sCloseTime[end]!;
      const fund = (r: PoolResult) =>
        r.funding.filter((f) => f.t <= cut).map((f) => `${f.book}|${f.t}|${f.outcome}|${f.kind}`);
      const lots = (r: PoolResult) =>
        r.lots
          .filter((l) => l.entryT <= cut)
          .map(
            (l) =>
              `${l.book}|${l.entryT}|${l.entryPrice}|${l.fills
                .filter((f) => f.t <= cut)
                .map((f) => `${f.t}:${f.price}:${f.partial}`)
                .join('/')}`
          );
      const daily = (r: PoolResult) => Array.from({ length: end + 1 }, (_v, s) => r2(r.daily[s]!));
      const ok =
        JSON.stringify(fund(short.x.result)) === JSON.stringify(fund(full.result)) &&
        JSON.stringify(lots(short.x.result)) === JSON.stringify(lots(full.result)) &&
        JSON.stringify(daily(short.x.result)) === JSON.stringify(daily(full.result));

      add('G4', `prefix ${i} ses ${dn} = D24 through ${door.dates[end]}`, ok);
      for (const [a, okA] of Object.entries(accounting(short.rec, short.x.result)))
        add('G5', `prefix ${i} ses ${dn} accounting ${a}`, okA);
    }
  }

  // ----- G6: unit separation in one process -----
  {
    let differ = 0;
    const subjects = [
      ...loadControls().map((c) => ({ cfg: c.cfg, o: optionsOfControl(c) })),
      ...rand.slice(0, 24).map((c) => ({ cfg: c, o: optionsOf(c) }))
    ];

    for (const [i, s] of subjects.entries()) {
      const a = evaluateUnit(D24, s.cfg.quad, s.o, 'cal');
      const b = evaluateUnit(D24, s.cfg.quad, s.o, 'ses');
      const c = evaluateUnit(D24, s.cfg.quad, s.o, 'cal');

      simulations += 3;
      add('G6', `subject ${i}: cal → ses → cal gives the first calendar record again`, same(a, c));
      if (!same(a, b)) differ++;
    }
    add(
      'G6',
      `${differ} of ${subjects.length} subjects' session records differ from their calendar records (the unit binds)`,
      differ > 0
    );
    add(
      'G6',
      'withUnit refuses an options object that already carries a hold unit',
      (() => {
        try {
          withUnit({ holdUnit: 'sessions' }, 'ses');
          return false;
        } catch {
          return true;
        }
      })()
    );
  }

  // ----- G7: the hold rule on real data -----
  {
    let exits = 0;
    let violations = 0;

    for (const s of [
      ...loadControls().map((c) => ({ cfg: c.cfg, o: optionsOfControl(c), name: c.key })),
      ...rand.slice(0, 24).map((c, i) => ({ cfg: c, o: optionsOf(c), name: `random ${i}` }))
    ])
      for (const unit of units) {
        const x = runOf(D24, s.cfg.quad, s.o, unit).x;
        const he = holdExits(D24, s.cfg, x, unit);
        const bad = he.filter((h) => h.age < h.hold);

        exits += he.length;
        violations += bad.length;
        if (bad.length) add('G7', `${s.name} ${unit}: hold-gated exits before the hold age`, false, bad.slice(0, 5));
      }
    add('G7', `${exits} hold-gated exits (both units) at an age ≥ the hold`, violations === 0 && exits > 0);

    // New L0's books: a maximum-hold exit under sessions never comes earlier (in calendar days) than the earliest
    // calendar-day hold date
    const nl0 = controlOf('NL0');
    const xs = runOf(D24, nl0.cfg.quad, optionsOfControl(nl0), 'ses').x;
    const early = holdExits(D24, nl0.cfg, xs, 'ses').filter((h) => {
      return (Date.parse(h.exit) - Date.parse(h.entry)) / 86_400_000 < h.hold;
    });

    add(
      'G7',
      `New L0 under sessions: no hold-gated exit before the calendar hold (${early.length})`,
      early.length === 0,
      early
    );
  }

  // ----- G8: single-family identities under 'ses' -----
  for (const [i, c] of rand.slice(0, 12).entries())
    for (const b of ['D1:GDX', 'D1:VGT', 'G:VGT'] as BookId[]) {
      const enabled: Partial<Record<BookId, boolean>> = {
        'D1:GDX': false,
        'D1:VGT': false,
        'G:GDX': false,
        'G:VGT': false,
        [b]: true
      };
      const x = runOf(D24, c.quad, { enabled }, 'ses').x;
      const book = x.books.find((y) => y.book === b)!;
      const filled = book.trades.filter((t) => t.eS >= 0);
      const lots = x.result.lots;
      // one slot, one book: every virtual trade whose entry is decided while the slot is free is funded — with a single
      // book the slot is free exactly when the book itself is flat, so the funded lots are the book's own trades
      const ok =
        lots.length === filled.length &&
        lots.every(
          (l, k) =>
            l.trade.id === filled[k]!.id && l.fills.map((f) => f.t).join() === filled[k]!.fills.map((f) => f.t).join()
        );

      add('G8', `random ${i} ${b} alone (ses): the pool funds exactly the book's own trades`, ok, {
        lots: lots.length,
        trades: filled.length
      });
    }

  // ----- G9: archive keys -----
  {
    const c = rand[0]!;
    const k = evalKey('D24', c.quad, optionsOf(c));

    add('G9', 'the archive key carries the hold unit', new Set(units.map((u) => unitKey(u, k))).size === 2);
  }

  const failed = checks.filter((c) => !c.ok);
  const gates = Object.fromEntries(
    [...new Set(checks.map((c) => c.gate))].map((g) => [
      g,
      { checks: checks.filter((c) => c.gate === g).length, failed: checks.filter((c) => c.gate === g && !c.ok).length }
    ])
  );
  const record = {
    stage: 'parity',
    door: 'D24 (+ D19, D21, D23 for G2 and G4)',
    checks: checks.length,
    failed: failed.length,
    failures: failed,
    gates,
    priority3EvaluationDigest: p3EvaluationDigest(),
    simulations,
    cap: simulationCaps.engineering,
    list: checks.map((c) => `${c.ok ? 'ok  ' : 'FAIL'} ${c.gate} ${c.name}`),
    finished: new Date().toISOString()
  };

  if (o.dry) {
    console.log(JSON.stringify({ ...record, list: record.list.filter((l) => l.startsWith('FAIL')) }, null, 1));
    log(`stage V DRY RUN: ${checks.length} checks, ${failed.length} failed; ${simulations} simulations (not sealed)`);
    return record;
  }
  sealJson(outFile, record, o.out ? `parity (${o.out})` : 'parity');
  log(`stage V: ${checks.length} checks, ${failed.length} failed; ${simulations} simulations`);
  return record;
};
