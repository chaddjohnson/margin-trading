// The engineering gates on real data (PROTOCOL.md §12). Run from the repository root, one stage per invocation:
//
//   node … tools/vg-l0-risk-controls-foundation/gates.ts g0          isolation and sealed digests (no data)
//   node … tools/vg-l0-risk-controls-foundation/gates.ts newl0       G1 FULL, G2 development ledger, G3 D19–D24
//   node … tools/vg-l0-risk-controls-foundation/gates.ts random      G4 random-configuration parity (D21, D24)
//   node … tools/vg-l0-risk-controls-foundation/gates.ts invariants  G5 non-default invariants (D24, causal D21)
//   node … tools/vg-l0-risk-controls-foundation/gates.ts frozen      G7 preflight of every study, audited seals
//
// Add --dry for an unsealed copy in $RCF_SCRATCH. AD7: no record holds a net, drawdown or P&L of a non-default control.
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { isDeepStrictEqual } from 'node:util';
import { codeDigest as p3Digest } from '../../src/vg-d1-growth-joint/lab.ts';
import { codeDigest as p5bDigest } from '../../src/vg-lifecycle-matched-optimization/lab.ts';
import { codeDigest as shadowDigest } from '../../src/vg-l0-shadow-eligibility/lab.ts';
import { decode as decodeGenome, levelsOf } from '../../src/vg-lifecycle-matched-optimization/config.ts';
import { type EvalOptions, recordOf, run as p3Run } from '../../src/vg-d1-growth-joint/evaluate.ts';
import type { BookId, VBook } from '../../src/vg-d1-growth-joint/books.ts';
import type { Door } from '../../src/vg-d1-growth-joint/data.ts';
import type { PoolResult } from '../../src/vg-d1-growth-joint/pool.ts';
import { type Quad, quadId } from '../../src/vg-d1-growth-joint/space.ts';
import { r2 } from '../../src/vg-d1-growth-joint/context.ts';
import type { RcLog, RiskVBook } from '../../src/d1-risk-controls/book.ts';
import { type D1RiskControls, type RiskConfig, canonicalConfig, canonicalJson, d1Books, isLegacy, limits } from '../../src/d1-risk-controls/config.ts';
import { evaluateWithControls, runWithControls } from '../../src/d1-risk-controls/run.ts';
import { isProtective } from '../../src/d1-risk-controls/exit.ts';
import { type DoorKey, head, memory, newL0, now, openDoor, pins, readPinned, repoRoot, seal, sha256, sha256File } from './common.ts';

const stage = process.argv[2];
let simulations = 0;

// ----- comparison helpers -----

// The first differing paths of two values (deep, Object.is for numbers), for the record.
const diff = (a: unknown, b: unknown, at = '$', out: string[] = [], max = 8): string[] => {
  if (out.length >= max || isDeepStrictEqual(a, b)) return out;
  if (typeof a !== 'object' || typeof b !== 'object' || a === null || b === null || Array.isArray(a) !== Array.isArray(b)) {
    out.push(`${at}: ${JSON.stringify(a)?.slice(0, 80)} ≠ ${JSON.stringify(b)?.slice(0, 80)}`);
    return out;
  }
  const keys = new Set([...Object.keys(a as object), ...Object.keys(b as object)]);

  for (const k of keys) diff((a as Record<string, unknown>)[k], (b as Record<string, unknown>)[k], `${at}.${k}`, out, max);
  return out;
};
const plainBook = (b: VBook) => {
  const { rc: _rc, ...rest } = b as RiskVBook;

  return rest;
};

// Priority 3's run against the controlled runner with legacy controls: books, the full pool result, the record.
const compareLegacy = (door: Door, q: Quad, o: EvalOptions) => {
  const ref = p3Run(door, q, o, true, true);
  const mine = runWithControls(door, q, null, o, true, true);

  simulations += 2;

  const books = diff(ref.books, mine.books.map(plainBook));
  const result = diff(ref.result, mine.result);
  const refRec = recordOf(door, q, ref, o);
  const rec = diff(refRec, evaluateWithControls(door, q, null, o).rec);

  return {
    equal: books.length + result.length + rec.length === 0,
    books: books,
    result: result,
    record: rec,
    counts: {
      virtualTrades: Object.fromEntries(ref.books.map((b) => [b.book, b.trades.length])),
      lots: ref.result.lots.length,
      fundingDecisions: ref.result.funding.length,
      refused: ref.result.funding.filter((f) => f.outcome === 'refused').length,
      markChanges: ref.result.markChanges?.t.length ?? 0
    },
    ref,
    refRec
  };
};

// ----- G0 -----

const g0 = () => {
  const changed = execSync('git diff --name-only 38222fb9 -- src apps config', { cwd: repoRoot }).toString().trim().split('\n').filter(Boolean);
  const untracked = execSync('git ls-files --others --exclude-standard -- src apps config', { cwd: repoRoot }).toString().trim().split('\n').filter(Boolean);
  const research = execSync('git diff --name-only 38222fb9 -- research', { cwd: repoRoot }).toString().trim().split('\n').filter(Boolean);
  const all = [...changed, ...untracked];
  const allowed = (f: string) => f.startsWith('src/d1-risk-controls/') || f.startsWith('src/research-standard/');
  const digests = {
    priority3: { now: p3Digest(), sealed: '147cad7c17eff3fa50442d2cb0ffb9c22cb7ba5091a46d1e14d3351d5cff4e88' },
    p5b: { now: p5bDigest(), sealed: '3f902532b651da1939f67d650d381bcf1e27ad3b76b3f2dedef95403fba23e3b' },
    shadow: { now: shadowDigest(), sealed: '54304b69941e0481d5d36d52c30e76e724596dadd803c6e41489a3633e8c878e' }
  };
  const ok =
    all.every(allowed) &&
    research.every((f) => f.startsWith('research/vg-l0-risk-controls-foundation/')) &&
    Object.values(digests).every((d) => d.now === d.sealed);

  seal('gates/g0-isolation.json', { stage: 'G0', at: now(), head: head(), ok, changedOrNew: all, researchChanged: research, digests }, 'G0');
  if (!ok) throw new Error('G0 failed');
};

// ----- G1, G2, G3 -----

const iso = (t: number) => new Date(t * 1000).toISOString().slice(0, 16);
const parseCsv = (text: string) => {
  const rows: string[][] = [];

  for (const line of text.trim().split('\n')) {
    const cells: string[] = [];
    let cur = '';
    let q = false;

    for (let i = 0; i < line.length; i++) {
      const c = line[i]!;

      if (q) {
        if (c === '"' && line[i + 1] === '"') {
          cur += '"';
          i++;
        } else if (c === '"') q = false;
        else cur += c;
      } else if (c === '"') q = true;
      else if (c === ',') {
        cells.push(cur);
        cur = '';
      } else cur += c;
    }
    cells.push(cur);
    rows.push(cells);
  }
  const [h, ...body] = rows;

  return body.map((r) => Object.fromEntries(h!.map((k, i) => [k, r[i]!])));
};

// The 5B development ledger's columns from a pool lot (the columns both record; `source` is a Growth decision label the
// pool does not keep).
const ledgerRow = (door: Door, l: PoolResult['lots'][number], i: number) => ({
  lot: String(i + 1),
  book: l.book,
  kind: l.trade.kind,
  decision: iso(l.trade.dT),
  entry: iso(l.entryT),
  entryDate: door.dates[l.entryS]!,
  entryRaw: l.entryRaw,
  entryPrice: l.entryPrice,
  principal: l.principal0,
  exits: l.fills.map((f) => ({ t: iso(f.t), date: door.dates[f.s]!, raw: f.raw, partial: f.partial, reason: f.reason, net: r2(f.net) })),
  open: l.open,
  net: r2(l.net),
  interest: r2(l.interest),
  costs: r2(l.costs)
});

const newl0 = async () => {
  const nl0 = newL0();
  const V = nl0.options;
  const out: Record<string, unknown> = { stage: 'G1-G3', at: now(), head: head(), subject: { label: nl0.label, cfgId: nl0.id, quadId: quadId(nl0.quad) } };

  // G1: FULL (legacy only, AD3), with the validation stage's boundary
  {
    const door = await openDoor('FULL', 'G1 New L0 legacy parity (frozen selection, legacy controls only)');
    const o: EvalOptions = { ...V, boundaries: ['2024-12-31'] };
    const c = compareLegacy(door, nl0.quad, o);
    const v = readPinned<{ rows: { row: string; record: Record<string, unknown> }[] }>(pins.p5bValidation);
    const sealed = v.rows.find((r) => r.row === 'R01')!.record;
    const vsSealed = diff(sealed, JSON.parse(JSON.stringify(c.refRec)));
    const lots = c.ref.result.lots;

    out.G1 = {
      door: { name: door.name, from: door.from, to: door.to, sessions: door.sessions, sha256: { GDX: door.sym.GDX.dataSha256, VGT: door.sym.VGT.dataSha256 } },
      sealedRecord: { source: pins.p5bValidation, row: 'R01', equal: vsSealed.length === 0, diff: vsSealed },
      controlledEqualsPriority3: { equal: c.equal, books: c.books, result: c.result, record: c.record },
      counts: c.counts,
      headline: {
        net: c.refRec.net,
        realized: c.refRec.realized,
        unrealized: c.refRec.unrealized,
        minuteDd: c.refRec.dd,
        ddPeak: iso(c.refRec.ddPeakT),
        ddTrough: iso(c.refRec.ddTroughT),
        lots: c.refRec.lots,
        openAtEnd: lots.filter((l) => l.open).length,
        signature: c.refRec.signature,
        developmentEquity: c.refRec.periods[0]?.equity,
        validationPnl: c.refRec.periods[0]?.after,
        validationResetDd: c.refRec.periods[0]?.dd
      },
      // the full funded trade list (frozen New L0, already published): entry/exit instants and prices, reasons, P&L
      tradeList: lots.map((l, i) => ({ ...ledgerRow(door, l, i), shares: l.shares0, gross: r2(l.fills.reduce((a, f) => a + f.proceeds - f.principal, 0)), mae: r2(l.worst), mfe: r2(l.best) })),
      tradeListSha256: sha256(JSON.stringify(lots.map((l, i) => ledgerRow(door, l, i)))),
      fundingSha256: sha256(JSON.stringify(c.ref.result.funding)),
      markChangesSha256: sha256(JSON.stringify(c.ref.result.markChanges)),
      memory: memory()
    };
    // a split-adjustment sanity check of the FULL door (VGT 8:1 on 2026-04-21): no consecutive-minute move above 10%
    const jumps: Record<string, number> = {};

    for (const s of ['GDX', 'VGT'] as const) {
      const ds = door.sym[s].ds;
      let n = 0;

      for (let b = 1; b < ds.barCount; b++) if (Math.abs(ds.bOpen[b]! / ds.bClose[b - 1]! - 1) > 0.1) n++;
      jumps[s] = n;
    }
    (out.G1 as Record<string, unknown>).consecutiveMinuteJumpsOver10pct = jumps;
    if (!c.equal || vsSealed.length) throw new Error(`G1 failed: ${JSON.stringify({ c: [c.books, c.result, c.record], vsSealed })}`);
  }

  // G3 (and G2 from the D24 run)
  const g3: Record<string, unknown> = {};

  for (const d of ['D19', 'D21', 'D23', 'D24'] as DoorKey[]) {
    const door = await openDoor(d, `G3 New L0 legacy parity on ${d}`);
    const c = compareLegacy(door, nl0.quad, V);

    g3[d] = { equal: c.equal, books: c.books, result: c.result, record: c.record, counts: c.counts, net: c.refRec.net, dd: c.refRec.dd, lots: c.refRec.lots, signature: c.refRec.signature };
    if (!c.equal) throw new Error(`G3 failed on ${d}`);

    if (d === 'D24') {
      // the sealed C24 evidence (5B results/folds/C24/selection.json, pinned by FROZEN_SELECTION.json)
      const selFile = 'research/vg-lifecycle-matched-optimization/results/folds/C24/selection.json';
      const selSha = sha256File(path.join(repoRoot, selFile));

      if (selSha !== '0615262bec59bdde4871f907052e61a396c94b4722cda5733d9756257f614fb7') throw new Error('5B C24 selection pin');

      // the member's CENTRE record (amendment A1: its stress records share the ledger signature by construction)
      const found: Record<string, unknown>[] = [];
      const walk = (x: unknown, key = '') => {
        if (Array.isArray(x)) x.forEach((v) => walk(v));
        else if (x && typeof x === 'object') {
          const o = x as Record<string, unknown>;

          if (key === 'centre' && o.signature === c.refRec.signature && typeof o.net === 'number') found.push(o);
          else for (const [k, v] of Object.entries(o)) walk(v, k);
        }
      };

      walk(JSON.parse(fs.readFileSync(path.join(repoRoot, selFile), 'utf8')));

      const mine = JSON.parse(JSON.stringify(c.refRec)) as Record<string, unknown>;
      const fieldDiffs = found.map((f) => Object.keys(f).filter((k) => k in mine && !isDeepStrictEqual(f[k], mine[k])));
      const common = found.map((f) => Object.keys(f).filter((k) => k in mine).length);

      g3.sealedC24 = { file: selFile, sha256: selSha, matches: found.length, commonFields: common, differingFields: fieldDiffs };
      if (!found.length || fieldDiffs.some((x) => x.length)) throw new Error('G3: the D24 record differs from 5B’s sealed C24 evidence');

      // G2: the development ledger (committed export of 5B's diagnostics)
      const ledgerFile = path.join(repoRoot, pins.p5bLedger.file);
      const rows = parseCsv(fs.readFileSync(ledgerFile, 'utf8'));
      const ours = c.ref.result.lots.map((l, i) => ledgerRow(door, l, i));
      const problems: string[] = [];

      if (rows.length !== ours.length) problems.push(`${rows.length} ledger rows vs ${ours.length} lots`);
      rows.forEach((r, i) => {
        const o = ours[i];

        if (!o) return;

        const want = {
          lot: r.lot,
          book: r.book,
          kind: r.kind,
          decision: r.decision,
          entry: r.entry,
          entryDate: r.entryDate,
          entryRaw: Number(r.entryRaw),
          entryPrice: Number(r.entryPrice),
          principal: Number(r.principal),
          exits: JSON.parse(r.exits!) as unknown,
          open: r.open === 'true',
          net: Number(r.net),
          interest: Number(r.interest),
          costs: Number(r.costs)
        };

        problems.push(...diff(want, o, `lot ${i + 1}`));
      });
      out.G2 = { ledger: { file: pins.p5bLedger.file, sha256: sha256File(ledgerFile) }, rows: rows.length, lots: ours.length, equal: problems.length === 0, problems };
      if (problems.length) throw new Error(`G2 failed: ${problems.join('; ')}`);
    }
  }

  out.G3 = g3;
  out.simulations = simulations;
  out.memory = memory();
  seal('gates/g1-g3-new-l0.json', out, 'G1-G3');
};

// ----- G4 -----

const rng = (seed: number) => () => {
  seed = (seed + 0x6d2b79f5) | 0;

  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);

  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const randomCfg = (i: number) => {
  const r = rng(20261113 + i);
  const res = i % 2 === 0 ? 'coarse' : 'fine';
  const genome = levelsOf(res).map((n) => Math.floor(r() * n));
  const cfg = decodeGenome(genome, res);
  const o: EvalOptions = cfg.inc === 'B' ? {} : { enabled: { [cfg.inc === 'V' ? 'G:GDX' : 'G:VGT']: false } as Partial<Record<BookId, boolean>> };

  return { cfg, o, res };
};

const random = async () => {
  const n = 60;
  const rows: unknown[] = [];
  let failures = 0;

  for (const d of ['D21', 'D24'] as DoorKey[]) {
    const door = await openDoor(d, 'G4 random-configuration legacy parity');

    for (let i = 0; i < n; i++) {
      const { cfg, o, res } = randomCfg(i);
      const c = compareLegacy(door, cfg.quad, o);

      if (!c.equal) failures++;
      rows.push({ door: d, i, res, inc: cfg.inc, quadId: quadId(cfg.quad), equal: c.equal, diff: [...c.books, ...c.result, ...c.record].slice(0, 4), counts: c.counts });
    }
  }

  seal('gates/g4-random-parity.json', { stage: 'G4', at: now(), head: head(), configurations: n, doors: ['D21', 'D24'], equal: rows.length - failures, failures, simulations, memory: memory(), rows }, 'G4');
  if (failures) throw new Error(`G4: ${failures} differences`);
};

// ----- G5 -----

const randomControls = (r: () => number): D1RiskControls | undefined => {
  if (r() < 0.2) return undefined; // this book stays legacy
  const c: D1RiskControls = {};
  const family = Math.floor(r() * 4); // A, B, C, D
  const int = (lo: number, hi: number) => lo + Math.floor(r() * (hi - lo + 1));

  if (family >= 1) c.protectiveStop = { mode: 'on', stopDistanceTenths: int(20, 250) };
  if (family === 2) c.hold = { mode: 'disabled' };
  if (family === 3) c.hold = { mode: 'adaptive', extendedHoldDays: int(31, 90), progressTenths: int(10, 150) };
  if (r() < 0.6)
    c.declineGate = { mode: 'on', losses: int(1, 4), recoveryTenths: int(100, limits.recoveryTenths.max), maxBlockSessions: int(5, 250) };
  return c;
};

const invariants = async () => {
  const n = 120;
  const d24 = await openDoor('D24', 'G5 non-default invariants (no performance figure is recorded, AD7)');
  const d21 = await openDoor('D21', 'G5 causal prefix of non-default runs (no performance figure is recorded, AD7)');
  const end21 = d21.sessions - 1;
  const checks: Record<string, number> = {};
  const fails: string[] = [];
  const rows: unknown[] = [];
  const pass = (k: string, ok: boolean, why: string) => {
    checks[k] = (checks[k] ?? 0) + (ok ? 1 : 0);
    if (!ok) fails.push(why);
  };

  for (let i = 0; i < n; i++) {
    const r = rng(9_000_000 + i);
    const { cfg, o } = randomCfg(1000 + i);
    const q = cfg.quad;
    const books: RiskConfig['books'] = {};

    for (const b of d1Books) {
      const c = randomControls(r);

      if (c) books[b] = c;
    }
    // an adaptive bound must exceed the book's base hold (maximumHoldDays ≤ 30 on the grid)
    const rc: RiskConfig = { version: 1, books };

    if (isLegacy(rc)) books['D1:GDX'] = { protectiveStop: { mode: 'on', stopDistanceTenths: 80 } };

    const tag = `#${i} ${quadId(q)} ${canonicalJson(rc)}`;
    const a = runWithControls(d24, q, rc, o, true, false);
    const b = runWithControls(d24, q, JSON.parse(JSON.stringify(rc)) as RiskConfig, o, true, false);

    simulations += 2;
    // (a) determinism: the cached run, a run from a JSON copy of the configuration, and a run that rebuilds every D1
    // book (cache off) are identical
    const fresh = runWithControls(d24, q, rc, o, true, false, { cache: false });

    simulations += 1;
    pass('determinism', isDeepStrictEqual(JSON.parse(JSON.stringify(fresh)), JSON.parse(JSON.stringify(a))) && isDeepStrictEqual(JSON.parse(JSON.stringify(b)), JSON.parse(JSON.stringify(a))), `determinism ${tag}`);

    // (b) causality on the D21 prefix
    const p = runWithControls(d21, q, rc, o, true, false, { cache: false });

    simulations += 1;
    for (const bk of a.books) {
      const pb = p.books.find((x) => x.book === bk.book)!;
      // fully closed by the D21 end (amendment A2: a Growth trade with a retention partial inside D21 and its final
      // exit after it is still open on D21)
      const closedBy = (t: VBook['trades'][number]) => !t.open && t.fills.length > 0 && t.fills.at(-1)!.s <= end21;
      const longClosed = bk.trades.filter(closedBy);
      const shortClosed = pb.trades.filter(closedBy);

      pass('causality', isDeepStrictEqual(shortClosed, longClosed), `causality ${bk.book} ${tag}`);
      // every D21 trade decided by the end exists identically up to its fills inside D21
      const prefixOk = pb.trades.every((t, j) => {
        const u = bk.trades[j];

        return u && u.dT === t.dT && u.eS === t.eS && u.eT === t.eT && u.ePrice === t.ePrice && t.fills.every((f, k) => isDeepStrictEqual(f, u.fills[k]));
      });

      pass('causalPrefix', prefixOk, `causal prefix ${bk.book} ${tag}`);
    }

    // (c) accounting
    const lots = [...a.result.lots].sort((x, y) => x.entryT - y.entryT);
    let overlap = false;

    for (let j = 1; j < lots.length; j++) if (lots[j - 1]!.open || lots[j]!.entryT < lots[j - 1]!.fills.at(-1)!.t) overlap = true;
    pass('noOverlap', !overlap, `overlap ${tag}`);
    pass('sumLots', Math.abs(a.result.lots.reduce((s, l) => s + l.net, 0) - a.result.net) < 1e-6, `Σ lots ${tag}`);
    pass(
      'fundedFills',
      a.result.lots.every((l) => {
        const v = a.books.find((x) => x.book === l.book)!.trades.find((t) => t.id === l.trade.id)!;

        return l.fills.length === v.fills.length && l.fills.every((f, j) => f.s === v.fills[j]!.s && f.k === v.fills[j]!.k && f.price === v.fills[j]!.price && f.reason === v.fills[j]!.reason);
      }),
      `funded fills ${tag}`
    );

    // (d) independence: books without controls equal their legacy books; Growth books equal Priority 3's
    const legacy = runWithControls(d24, q, null, o, false, false);

    simulations += 1;
    for (const bk of a.books) {
      const c = canonicalConfig(rc)?.books[bk.book as (typeof d1Books)[number]];
      const lb = legacy.books.find((x) => x.book === bk.book)!;

      if (!c) pass('independence', isDeepStrictEqual(plainBook(bk), plainBook(lb)), `independence ${bk.book} ${tag}`);
    }

    // (e)–(g) per controlled book
    for (const bk of a.books as RiskVBook[]) {
      if (!bk.rc?.controls) continue;

      const c = bk.rc.controls;
      const ds = d24.sym[bk.book.slice(3) as 'GDX' | 'VGT'].ds;

      for (const t of bk.trades) {
        const x = bk.rc.trades.find((y) => y.trade === t.id)!;
        const f = t.fills[0];

        if (!f) continue;
        if (isProtective(f.reason)) {
          const L = x.protectiveLevel!;
          // the baseline stop fill is 'stop': a stop-level fill is exactly L, an opening or minute-open fill is below it
          const okLevel = f.raw <= L && (f.reason === 'protective stop gap' ? f.k === 0 && f.raw === ds.sOpen[f.s] : true);

          pass('protectiveNotEntrySession', f.s > t.eS, `protective on entry session ${tag}`);
          pass('protectiveLevel', okLevel, `protective level ${bk.book} trade ${t.id} ${tag}`);
          pass('protectiveLoss', t.vNet < 0, `protective net ${tag}`);
        }
        if (c.hold?.mode === 'disabled')
          pass('disabledHold', f.reason !== 'maximum hold' && f.reason !== 'buffered intraday loss', `disabled hold ${tag}`);
        if (c.hold?.mode === 'adaptive' && f.reason === 'maximum hold') {
          const held = (ds.sTime[f.s]! - ds.sTime[t.eS]!) / 86400;
          const eff = x.hold.effectiveDaysAtExit!;

          pass('adaptiveHold', held >= eff && (eff === x.hold.baseDays || eff === x.hold.extendedDays), `adaptive hold ${tag}`);
        }
      }

      // (g) the gate: no decision while blocked; every block ends within its cooldown (or by recovery/end of data)
      if (c.declineGate?.mode === 'on') {
        const ev = bk.rc.events;
        const blocked: { from: string; to: string | null }[] = [];

        for (const e of ev) {
          if (e.type === 'block engaged') blocked.push({ from: e.date, to: null });
          if (e.type === 'episode end' && blocked.length && blocked.at(-1)!.to === null) blocked.at(-1)!.to = e.date;
        }
        const decided = bk.trades.map((t) => d24.dates[t.dS]!);
        const inBlock = decided.some((dd) => blocked.some((b) => dd > b.from && (b.to === null || dd <= b.to)));
        const dIx = (s: string) => d24.dates.indexOf(s);
        const cool = blocked.every((b) => b.to === null || dIx(b.to) - dIx(b.from) <= (c.declineGate as { maxBlockSessions: number }).maxBlockSessions);
        const wellFormed = ev.every((e, j) => e.type !== 'block engaged' || (j > 0 && ['episode start', 'failed attempt'].includes(ev[j - 1]!.type)));

        // a block ends at a session close; decisions resume from the next session
        pass('gateNoDecisionWhileBlocked', !inBlock, `decision while blocked ${tag}`);
        pass('gateCooldownBound', cool, `cooldown ${tag}`);
        pass('gateEventsWellFormed', wellFormed, `events ${tag}`);
      }
    }

    rows.push({
      i,
      quadId: quadId(q),
      inc: cfg.inc,
      controls: canonicalConfig(rc),
      outputSha256: sha256(JSON.stringify({ books: a.books.map((x) => x.trades), lots: a.result.lots.map((l) => [l.book, l.entryT, l.fills.map((f) => [f.t, f.reason])]) })),
      logs: Object.fromEntries((a.books as RiskVBook[]).filter((x) => x.rc?.controls).map((x) => [x.book, (x.rc as RcLog).summary.episodes + (x.rc as RcLog).summary.protectiveExits > 0 ? 'active' : 'inactive']))
    });
    if (i % 20 === 19) console.log(`G5 ${i + 1}/${n} sims ${simulations} rss ${memory().rssMb} MB`);
  }

  const tag = process.argv.includes('--rerun') ? `-${process.argv[process.argv.indexOf('--rerun') + 1]}` : '';

  seal(`gates/g5-invariants${tag}.json`, { stage: 'G5', at: now(), head: head(), pairs: n, note: 'AD7: pass counts and output hashes only; no net, drawdown or P&L of a non-default control is recorded', checks, failures: fails, simulations, memory: memory(), rows }, 'G5');
  if (fails.length) throw new Error(`G5: ${fails.length} failures, e.g. ${fails.slice(0, 5).join(' | ')}`);
};

// ----- G7 -----

const frozen = () => {
  const pre = execSync('npm run --silent research-preflight -- --all --json', { cwd: repoRoot }).toString();
  const results = JSON.parse(pre) as { ok: boolean; study: string; version: string; notices: string[] }[];
  const seals: Record<string, { files: number; ok: number; bad: string[] }> = {};

  for (const study of ['vg-lifecycle-matched-optimization', 'vg-l0-shadow-eligibility', 'vg-l0-walk-forward-diagnostic', 'vg-l0-session-hold', 'vg-d1-growth-joint']) {
    const f = path.join(repoRoot, 'research', study, 'results', 'seals.jsonl');

    if (!fs.existsSync(f)) continue;

    const lines = fs.readFileSync(f, 'utf8').trim().split('\n').map((l) => JSON.parse(l) as { file: string; sha256: string });
    const latest = new Map<string, string>();

    for (const l of lines) latest.set(l.file, l.sha256);

    const bad = [...latest].filter(([file, h]) => {
      // paths in seals.jsonl are repository-relative (research records and, for Priority 3, its sealed pilot caches under
      // .cache/); amendment A3: never re-prefix them
      const p = path.isAbsolute(file) ? file : fs.existsSync(path.join(repoRoot, file)) ? path.join(repoRoot, file) : path.join(repoRoot, 'research', study, file);

      return !fs.existsSync(p) || sha256File(p) !== h;
    });

    seals[study] = { files: latest.size, ok: latest.size - bad.length, bad: bad.map(([f2]) => f2) };
  }

  const ok = results.every((r) => r.ok) && Object.values(seals).every((s) => s.bad.length === 0);

  const tag = process.argv.includes('--rerun') ? `-${process.argv[process.argv.indexOf('--rerun') + 1]}` : '';

  seal(`gates/g7-frozen${tag}.json`, { stage: 'G7', at: now(), head: head(), ok, preflight: results.map((r) => ({ study: r.study, ok: r.ok, version: r.version, notices: r.notices })), seals }, 'G7');
  if (!ok) throw new Error('G7 failed');
};

const stages: Record<string, () => unknown> = { g0, newl0, random, invariants, frozen };

if (!stages[stage!]) {
  console.error(`usage: gates.ts ${Object.keys(stages).join('|')} [--dry]`);
  process.exit(2);
}
const t0 = Date.now();

await stages[stage!]!();
console.log(`${stage} done in ${((Date.now() - t0) / 1000).toFixed(1)} s, ${simulations} simulations, rss ${memory().rssMb} MB`);
