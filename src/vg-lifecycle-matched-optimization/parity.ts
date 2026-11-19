// Stage V — the engineering gates (PROTOCOL.md §12), sealed as results/parity/parity.json before the freeze. A failure
// stops every dependent stage (studyGuards refuses to run while `failed` ≠ 0).
//
// V1 L0 reproduction (D24, this study's evaluation path): the 5A subjects D, C4, C85, E, A, B, IP, GP85 equal 5A's sealed
//    L0 development centres field for field; C4-refined and the three 3B seeds equal 3B's sealed C24 evidence centres;
//    the native bridge (VG #2 with Study 8's arming) equals Study 8 F24 ($260,223.13 / $17,280.74 / 36 lots / 14
//    refusals) and the harmonized VG #2 equals $268,487.02 / $20,801.07.
// V2 L1/L2 reproduction: the same 5A subjects under L1 and L2 equal 5A's sealed L1/L2 centres field for field.
// V3 path identity (48 random configurations, 16 per structure): L0 `evaluateMode` = recordOf(runLife(L0)) (the detail
//    path); L1/L2 `runLife` = Priority 5A's `runCoupled` record for record (same rounds and Growth simulations).
// V4 stress identities: (a) a lifecycle Growth book whose every request is granted equals the canonical book under each
//    stress (10 / 20 bps, 14% interest, +25 bps stop slippage, next-open stops), both symbols; (b) a standalone Growth
//    pool (D1 disabled) under each stress is identical under L0, L1 and L2 and never refused.
// V5 single-family identities: D1-only pools (D and random D1 pairs) and standalone Growth books are identical under L0,
//    L1 and L2, never refused, and the Growth books equal the canonical `runRiseTrading` book (Priority 3's identity).
// V6 causal prefix: random configurations under L0, L1 and L2 on D19, D21 and D23 equal their D24 runs up to the shorter
//    door's last session (funding records, Growth requests, lots and fills, daily marks).
// V7 the fixed point (random searched configurations under L1 and L2): (a) the same result from three starting guesses
//    (occupancy, all available, all refused); (b) rounds ≤ requests + 1; (c) consistent with Priority 3's independent
//    reference pool (`reference.ts`, no shared timeline code): the same funded and refused sets, net and drawdowns within
//    $1e-6, no phantom funded; (d) failure detection: a forced wrong answer never converges and throws, and a round cap
//    below the needed rounds throws (never a fitness).
// V8 accounting on every centre above: Σ lot nets = net (to the cent), Σ lot interest = interest, Σ lot costs = costs,
//    peak principal ≤ $100,000, lots never overlap (one exclusive slot), realized + unrealized = net.
// V9 the archive key: a record's key carries its lifecycle (L0, L1, L2 of one configuration are three keys).
import path from 'node:path';
import { encode as storeEncode } from '../growth140-vgt-s8m/store.ts';
import { type BookId, type Friction, baseFriction, runGrowthBook } from '../vg-d1-growth-joint/books.ts';
import type { Door } from '../vg-d1-growth-joint/data.ts';
import { type EvalOptions, type Rec, datasetsOf, evalKey, evaluate, growthNextOpenSupported, recordOf } from '../vg-d1-growth-joint/evaluate.ts';
import { referencePool } from '../vg-d1-growth-joint/reference.ts';
import type { PoolResult } from '../vg-d1-growth-joint/pool.ts';
import { runCoupled } from '../vg-growth-funding-lifecycle/coupled.ts';
import { completions, lifeBookOf } from './lifeBook.ts';
import { simulationCaps } from './budgets.ts';
import { type Mode, economics, log, modes, r2, repoRoot, resultsDir } from './context.ts';
import { type Cfg, cells, decode, gId, optionsOf, pinCell, pinStratum, placeholder, canonicalOf, quadId, screenGenomes } from './config.ts';
import { controlOf, loadControls, p3bCfg, p3bMembers, p5aCentres, p5aReproductionKeys, readPinned } from './controls.ts';
import { openStudyDoor } from './doors.ts';
import { lifeKey, runLife } from './life.ts';
import { decode as storeDecode } from '../growth140-vgt-s8m/store.ts';
import { isSealed, sealJson } from './records.ts';
import { requireStandardAdoption } from '../research-standard/preflight.ts';
import { researchDir } from './context.ts';
import { stresses } from './qualify.ts';

export const parityFile = path.join(resultsDir, 'parity', 'parity.json');
export const parityFileOf = (name?: string) => (name ? path.join(resultsDir, 'parity', name) : parityFile);

// The 3B sealed C24 qualification evidence (centres of C4-refined and the 3B seeds).
const p3bSelection = {
  file: 'research/vg-d1-growth-expanded/results/folds/C24/selection.json',
  sha256: '4b17acc44097550516f781ee20eb6155971121b05b5157b70e7e8bb1ead88b30' // its seals.jsonl entry (3B, 2026-11-10)
};

const same = (a: unknown, b: unknown) => storeEncode(a) === storeEncode(storeDecode(storeEncode(b)));

interface Check {
  gate: string;
  name: string;
  ok: boolean;
  detail?: unknown;
}

// Random configurations of every structure (this study's namespace; labels never used by a search).
export const randomCfgs = (n: number, label: string): Cfg[] => {
  const out: Cfg[] = [];

  for (const cell of cells) {
    const gs = screenGenomes(n * 8, 'coarse', 'parity', label, cell.inc);
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
    realizedPlusUnrealized: Math.abs(rec.realized + rec.unrealized - rec.net) <= 0.015 // each part is rounded to the cent
  };
};

export const runParity = async (o: { dry?: boolean; out?: string } = {}) => {
  const outFile = parityFileOf(o.out);

  if (!o.dry) requireStandardAdoption(researchDir, { repoRoot });
  if (!o.dry && isSealed(outFile)) throw new Error(`${outFile} is sealed`);

  const checks: Check[] = [];
  let simulations = 0;
  const add = (gate: string, name: string, ok: boolean, detail?: unknown) => {
    checks.push({ gate, name, ok, ...(ok ? {} : { detail }) });
    if (!ok) log(`FAIL ${gate} ${name}`);
  };
  const D24 = await openStudyDoor('D24', 'stage V (engineering gates)');
  const life = (door: Door, q: Cfg['quad'], o: EvalOptions, mode: Mode, opts: Parameters<typeof runLife>[4] = {}) => {
    simulations++;
    return runLife(door, q, o, mode, opts);
  };
  const recOf = (door: Door, q: Cfg['quad'], o: EvalOptions, mode: Mode) => {
    const x = life(door, q, o, mode);

    return { x, rec: recordOf(door, q, x, o) as Rec };
  };

  // ----- V1 / V2 / V8 -----
  const centres = p5aCentres();
  const subjects = loadControls().subjects;

  for (const k of p5aReproductionKeys) {
    const s = subjects.find((x) => x.key === k)!;

    for (const mode of modes) {
      const { x, rec } = recOf(D24, s.quad, s.options, mode);
      const sealed = centres[k]!.modes[mode].rec;

      add(mode === 'L0' ? 'V1' : 'V2', `${k} ${mode} = 5A sealed centre (field for field)`, same(rec, sealed), {
        got: { net: rec.net, dd: rec.dd, lots: rec.lots },
        sealed: { net: sealed.net, dd: sealed.dd, lots: sealed.lots }
      });
      for (const [a, ok] of Object.entries(accounting(rec, x.result))) add('V8', `${k} ${mode} accounting ${a}`, ok);
    }
  }

  const sel = readPinned<{ evidence: { label: string; centre: Rec }[] }>(p3bSelection);

  for (const key of Object.keys(p3bMembers) as (keyof typeof p3bMembers)[]) {
    const { cfg } = p3bCfg(key);
    const e = sel.evidence.find((x) => x.label === p3bMembers[key].label)!;
    const { x, rec } = recOf(D24, cfg.quad, optionsOf(cfg), 'L0');
    const fast = evaluate(D24, cfg.quad, optionsOf(cfg));

    simulations++;
    add('V1', `${key} L0 = 3B sealed C24 evidence centre (field for field)`, same(rec, e.centre), {
      got: { net: rec.net, dd: rec.dd },
      sealed: { net: e.centre.net, dd: e.centre.dd }
    });
    add('V1', `${key} L0 evaluateMode = detail path`, same(fast, rec));
    for (const [a, ok] of Object.entries(accounting(rec, x.result))) add('V8', `${key} L0 accounting ${a}`, ok);
  }

  {
    const d = controlOf('D');
    const native = recOf(D24, d.quad, { ...d.options, d1Arm: 'native' }, 'L0');
    const refusals = native.x.result.funding.filter((f) => f.outcome === 'refused').length;

    add('V1', 'VG #2 native = Study 8 F24 ($260,223.13 / $17,280.74 / 36 lots / 14 refusals)', native.rec.net === 260223.13 && native.rec.dd === 17280.74 && native.rec.lots === 36 && refusals === 14, {
      net: native.rec.net,
      dd: native.rec.dd,
      lots: native.rec.lots,
      refusals
    });

    const harm = recOf(D24, d.quad, d.options, 'L0');

    add('V1', 'VG #2 harmonized = $268,487.02 / $20,801.07', harm.rec.net === 268487.02 && harm.rec.dd === 20801.07, { net: harm.rec.net, dd: harm.rec.dd });
  }

  // ----- V3: path identity -----
  const rand = randomCfgs(16, 'v3');

  for (const [i, c] of rand.entries()) {
    const o = optionsOf(c);
    const fast = evaluate(D24, c.quad, o);

    simulations++;

    const det = recOf(D24, c.quad, o, 'L0').rec;

    add('V3', `random ${i} (${c.inc}) L0 evaluateMode = detail path`, same(fast, det));
    for (const mode of ['L1', 'L2'] as const) {
      const mine = life(D24, c.quad, o, mode);
      const theirs = runCoupled(D24, c.quad, o, mode);

      simulations++;
      add('V3', `random ${i} (${c.inc}) ${mode} = 5A runCoupled`, same(recordOf(D24, c.quad, mine, o), recordOf(D24, c.quad, theirs, o)) && mine.rounds === theirs.rounds && mine.growthSims === theirs.growthSims && same(mine.result.funding, theirs.result.funding));
      for (const [a, ok] of Object.entries(accounting(recordOf(D24, c.quad, mine, o), mine.result))) add('V8', `random ${i} ${mode} accounting ${a}`, ok);
    }
  }

  // ----- V4: stress identities -----
  const gcs = rand.filter((c) => c.inc !== 'B').slice(0, 8);

  for (const [i, c] of gcs.entries())
    for (const sym of ['GDX', 'VGT'] as const) {
      const g = c.quad.g[c.inc === 'V' ? 'VGT' : 'GDX'];

      for (const [name, f] of Object.entries(stresses)) {
        const fr0: Friction = { ...baseFriction, ...f };
        // Priority 3's fallback (booksOf): a book with an initial stop or retention keeps stop-level fills
        const fr: Friction = fr0.stopFill === 'next-open' && !growthNextOpenSupported(g) ? { ...fr0, stopFill: 'stop' } : fr0;
        const canon = runGrowthBook(D24.sym[sym], D24, g, { friction: fr, costBps: fr.costBps });

        for (const mode of ['L1', 'L2'] as const) {
          const lb = lifeBookOf(D24.sym[sym], D24, g, mode, () => true, { friction: fr, costBps: fr.costBps });

          add('V4', `G-book ${i} ${gId(g)} ${sym} ${name} ${mode} all granted = canonical`, same(lb.trades, canon.trades));
        }
      }
    }

  for (const [i, c] of gcs.slice(0, 4).entries()) {
    const sym = c.inc === 'V' ? 'G:VGT' : 'G:GDX';
    const o: EvalOptions = { enabled: { 'D1:GDX': false, 'D1:VGT': false, [c.inc === 'V' ? 'G:GDX' : 'G:VGT']: false } as Partial<Record<BookId, boolean>> };

    for (const [name, f] of Object.entries(stresses)) {
      const oo = { ...o, friction: f };
      const recs = modes.map((m) => recOf(D24, c.quad, oo, m));

      add('V4', `standalone ${sym} pool ${i} ${name}: L0 = L1 = L2, never refused`, same(recs[0]!.rec, recs[1]!.rec) && same(recs[0]!.rec, recs[2]!.rec) && recs.every((r) => r.x.result.funding.every((x) => x.outcome === 'granted')));
    }
  }

  // ----- V5: single-family identities -----
  {
    const d = controlOf('D');
    const recs = modes.map((m) => recOf(D24, d.quad, d.options, m).rec);

    add('V5', 'D (VG #2 D1 only): L0 = L1 = L2', same(recs[0], recs[1]) && same(recs[0], recs[2]));

    for (const [i, c] of rand.slice(0, 6).entries()) {
      const o: EvalOptions = { enabled: { 'G:GDX': false, 'G:VGT': false } };
      const rs = modes.map((m) => recOf(D24, c.quad, o, m).rec);

      add('V5', `random D1 pair ${i}: L0 = L1 = L2`, same(rs[0], rs[1]) && same(rs[0], rs[2]));
    }

    for (const [i, c] of rand.slice(0, 12).entries()) {
      if (c.inc === 'B') continue;

      const sym = c.inc === 'V' ? 'VGT' : 'GDX';
      const o: EvalOptions = { enabled: { 'D1:GDX': false, 'D1:VGT': false, [`G:${sym === 'VGT' ? 'GDX' : 'VGT'}`]: false } as Partial<Record<BookId, boolean>> };
      const rs = modes.map((m) => recOf(D24, c.quad, o, m));
      const canon = runGrowthBook(D24.sym[sym], D24, c.quad.g[sym], {});

      add('V5', `standalone Growth ${i} ${sym}: L0 = L1 = L2, never refused, = canonical book`, same(rs[0]!.rec, rs[1]!.rec) && same(rs[0]!.rec, rs[2]!.rec) && rs.every((r) => r.x.result.funding.every((x) => x.outcome === 'granted')) && rs[0]!.rec.lots === canon.trades.filter((t) => t.eS >= 0).length);
    }
  }

  // ----- V6: causal prefix -----
  const prefixCfgs = randomCfgs(4, 'v6');
  const doors: Record<string, Door> = {};

  for (const dn of ['D19', 'D21', 'D23'] as const) doors[dn] = await openStudyDoor(dn, `stage V causal prefix (${dn})`);

  for (const [i, c] of prefixCfgs.entries()) {
    const o = optionsOf(c);

    for (const mode of modes) {
      const full = life(D24, c.quad, o, mode);

      for (const [dn, door] of Object.entries(doors)) {
        const short = life(door, c.quad, o, mode);
        const end = door.sessions - 1;
        const cut = door.sym.VGT.ds.sCloseTime[end]!;
        const fund = (r: PoolResult) => r.funding.filter((f) => f.t <= cut).map((f) => `${f.book}|${f.t}|${f.outcome}|${f.kind}`);
        const lots = (r: PoolResult) =>
          r.lots
            .filter((l) => l.entryT <= cut)
            .map((l) => `${l.book}|${l.entryT}|${l.entryPrice}|${l.fills.filter((f) => f.t <= cut).map((f) => `${f.t}:${f.price}:${f.partial}`).join('/')}`);
        const daily = (r: PoolResult) => Array.from({ length: end + 1 }, (_v, s) => r2(r.daily[s]!));
        const reqs = (x: ReturnType<typeof runLife>) =>
          Object.entries(x.life).flatMap(([b, l]) => (l?.requests ?? []).filter((q) => q.t <= cut).map((q) => `${b}|${q.t}|${q.kind}|${q.outcome}`));
        const ok =
          JSON.stringify(fund(short.result)) === JSON.stringify(fund(full.result)) &&
          JSON.stringify(lots(short.result)) === JSON.stringify(lots(full.result)) &&
          JSON.stringify(daily(short.result)) === JSON.stringify(daily(full.result)) &&
          JSON.stringify(reqs(short)) === JSON.stringify(reqs(full));

        add('V6', `prefix ${i} (${c.inc}) ${mode} ${dn} = D24 through ${door.dates[end]}`, ok);
      }
    }
  }

  // ----- V7: the fixed point -----
  const fpCfgs = randomCfgs(10, 'v7');
  let maxRounds = 0;

  for (const [i, c] of fpCfgs.entries()) {
    const o = optionsOf(c);

    for (const mode of ['L1', 'L2'] as const) {
      const runs = (['occupancy', 'available', 'refused'] as const).map((start) => life(D24, c.quad, o, mode, { start }));
      const recs = runs.map((x) => recordOf(D24, c.quad, x, o));
      const requests = Object.values(runs[0]!.life).reduce((a, l) => a + (l?.requests.length ?? 0), 0);

      maxRounds = Math.max(maxRounds, ...runs.map((x) => x.rounds));
      add('V7', `fixed point ${i} (${c.inc}) ${mode}: identical from three starting guesses`, same(recs[0], recs[1]) && same(recs[0], recs[2]) && same(runs[0]!.result.funding, runs[1]!.result.funding) && same(runs[0]!.result.funding, runs[2]!.result.funding));
      add('V7', `fixed point ${i} (${c.inc}) ${mode}: rounds ≤ requests + 1`, runs.every((x) => x.rounds <= requests + 1), { rounds: runs.map((x) => x.rounds), requests });

      const x = runs[0]!;
      const ref = referencePool(datasetsOf(D24), x.books, c.quad.first, { enabled: o.enabled, endIndex: D24.sessions - 1 });
      const funded = x.result.lots.map((l) => `${l.book}#${l.trade.id}`);
      const refusedPool = x.result.funding.filter((f) => f.outcome === 'refused').map((f) => `${f.book}#${f.trade}`);

      add(
        'V7',
        `fixed point ${i} (${c.inc}) ${mode}: = independent reference pool`,
        JSON.stringify(ref.funded) === JSON.stringify(funded) &&
          JSON.stringify([...ref.refused].sort()) === JSON.stringify([...refusedPool].sort()) &&
          Math.abs(ref.net - recs[0]!.net) <= 1e-6 + 0.005 &&
          Math.abs(ref.dd - recs[0]!.dd) <= 1e-6 + 0.005,
        { ref: { net: ref.net, dd: ref.dd, funded: ref.funded.length }, pool: { net: recs[0]!.net, dd: recs[0]!.dd, funded: funded.length } }
      );
    }

  }

  // failure detection: a forced wrong answer to the first request of a Growth book that does request (the first three
  // such configurations) never converges and throws
  {
    let tested = 0;

    for (const [i, c] of fpCfgs.entries()) {
      if (tested >= 3) break;

      const o = optionsOf(c);
      const base = life(D24, c.quad, o, 'L1');
      const g = (Object.entries(base.life).find(([, l]) => (l?.requests.length ?? 0) > 0)?.[0] ?? null) as BookId | null;

      if (!g) continue;
      tested++;

      let threw = false;

      try {
        life(D24, c.quad, o, 'L1', { flip: { book: g, nth: 0 }, maxRounds: 50 });
      } catch (e) {
        threw = /no consistent run/.test(String(e));
      }
      add('V7', `failure detection ${i} (${g}): a forced wrong answer throws (never converges)`, threw);
    }
    add('V7', 'failure detection: three configurations with Growth requests tested', tested === 3);
  }

  {
    const c = fpCfgs.find((x) => {
      const r = life(D24, x.quad, optionsOf(x), 'L1');

      return r.rounds >= 2;
    });

    if (c) {
      let threw = false;

      try {
        life(D24, c.quad, optionsOf(c), 'L1', { maxRounds: 1 });
      } catch (e) {
        threw = /no consistent run/.test(String(e));
      }
      add('V7', 'failure detection: a round cap below the needed rounds throws', threw);
    } else add('V7', 'failure detection: a configuration needing ≥ 2 rounds exists', false);
  }

  // ----- V10 (amendment A1): the end-of-door completion and a convergence scan -----
  {
    // the configuration that failed C19's first search: screen R2/B #970 (quad 34fa81fd38cbda69), L2 on D19
    const cell = cells.find((x) => x.inc === 'B')!;
    const g = screenGenomes(1024, 'coarse', 'screen', 'C19/indep/R2/B')[970]!;
    const c = decode(pinStratum(pinCell(g, cell), cell, 970), 'coarse');
    const o = optionsOf(c);
    const D19 = doors.D19!;
    const before = completions.endOfDoorOrders;
    const x = life(D19, c.quad, o, 'L2');
    const last = D19.sessions - 1;
    const rec = x.result.funding.find((f) => f.book === 'G:GDX' && f.s === last && f.outcome === 'granted');

    add('V10', 'A1 case: quad 34fa81fd38cbda69 is the failing configuration', quadId(c.quad) === '34fa81fd38cbda69');
    add('V10', 'A1 case: L2 on D19 converges; the order granted at the last session is a record, unfilled, no lot', completions.endOfDoorOrders > before && !!rec && !x.result.lots.some((l) => l.book === 'G:GDX' && l.entryS > last), { rounds: x.rounds });
    for (const [a, ok] of Object.entries(accounting(recordOf(D19, c.quad, x, o), x.result))) add('V10', `A1 case accounting ${a}`, ok);
    for (const mode of ['L1'] as const) {
      const mine = life(D19, c.quad, o, mode);
      const theirs = runCoupled(D19, c.quad, o, mode);

      simulations++;
      add('V10', `A1 case: ${mode} on D19 = 5A runCoupled`, same(recordOf(D19, c.quad, mine, o), recordOf(D19, c.quad, theirs, o)));
    }

    // every random configuration converges under L1 and L2 on every prefix door (the doors' last sessions included)
    const scan = randomCfgs(64, 'v10');
    const allDoors: Record<string, Door> = { ...doors, D24 };
    let runs = 0;
    let failures = 0;
    const c0 = completions.endOfDoorOrders;

    for (const [dn, door] of Object.entries(allDoors))
      for (const sc of scan)
        for (const mode of ['L1', 'L2'] as const) {
          runs++;
          try {
            const y = life(door, sc.quad, optionsOf(sc), mode);
            const acc = accounting(recordOf(door, sc.quad, y, optionsOf(sc)), y.result);

            if (!Object.values(acc).every(Boolean)) {
              failures++;
              add('V10', `scan ${dn} ${mode} ${quadId(sc.quad)} accounting`, false, acc);
            }
          } catch (e) {
            failures++;
            add('V10', `scan ${dn} ${mode} ${quadId(sc.quad)} converges`, false, String(e).slice(0, 300));
          }
        }
    add('V10', `convergence scan: ${runs} runs (192 configurations × L1, L2 × D19, D21, D23, D24) converge with consistent accounting; ${completions.endOfDoorOrders - c0} end-of-door completions`, failures === 0);
  }

  // ----- V9: archive keys -----
  {
    const c = rand[0]!;
    const k = evalKey('D24', c.quad, optionsOf(c));
    const keys = new Set(modes.map((m) => lifeKey(m, k)));

    add('V9', 'the archive key carries the lifecycle', keys.size === 3);
  }

  const failed = checks.filter((c) => !c.ok);
  const record = {
    stage: 'parity',
    door: 'D24 (+ D19, D21, D23 for V6)',
    checks: checks.length,
    failed: failed.length,
    failures: failed,
    byGate: Object.fromEntries(
      [...new Set(checks.map((c) => c.gate))].map((g) => [g, { checks: checks.filter((c) => c.gate === g).length, failed: checks.filter((c) => c.gate === g && !c.ok).length }])
    ),
    maxRoundsSeen: maxRounds,
    simulations,
    cap: simulationCaps.engineering,
    list: checks.map((c) => `${c.ok ? 'ok  ' : 'FAIL'} ${c.gate} ${c.name}`),
    finished: new Date().toISOString()
  };

  (record as Record<string, unknown>).endOfDoorCompletions = completions.endOfDoorOrders;
  if (o.dry) {
    // a dry run (development of the gates, before the protocol is adopted): printed, never sealed
    console.log(JSON.stringify({ ...record, list: record.list.filter((l) => l.startsWith('FAIL')) }, null, 1));
    log(`stage V DRY RUN: ${checks.length} checks, ${failed.length} failed; ${simulations} simulations (not sealed)`);
    return record;
  }
  sealJson(outFile, record, o.out ? `parity (${o.out})` : 'parity');
  log(`stage V: ${checks.length} checks, ${failed.length} failed; ${simulations} simulations`);
  return record;
};

export { placeholder, canonicalOf };
