// Stage V — the engineering gates (PROTOCOL.md §12), sealed as results/parity/parity.json before the protocol freeze; a
// failure stops every dependent stage. In-process on the development doors (FULL is never opened here).
//
// G1 reproduction through this study's path (toggles '000'): New L0, C4, C4-refined, C85, IJ1 and D = 5B's sealed L0 C24
//    evidence centres field for field (Priority 3's record part); VG #2 native = $260,223.13 / $17,280.74 / 36 lots / 14
//    refusals.
// G2 the copied allocator: a deterministic sample of 5B's archived L0 records (its own search archives on D19, D21, D23,
//    D24; every structure) re-evaluated through this study's path with every toggle OFF = the archived records field for
//    field; Priority 3's evaluation digest = its historical sealed digest (no historical file was edited).
// G3 path identity: the fast and the detailed runs agree (random configurations under every toggle combination, D24).
// G4 causal prefix with the toggles ON: random configurations on D19, D21, D23 equal their D24 runs up to the shorter
//    door (funding records, lots and fills — delayed lots included —, daily marks, shadow episodes decided by then).
// G5 accounting on every run of G3/G4 (Σ lot nets = net, Σ interest, Σ costs, peak principal ≤ $100,000, one slot,
//    realized + unrealized = net).
// G6 OFF identity: with '000' the pooled replay equals Priority 3's runPool field for field (detail runs) and the record
//    equals Priority 3's; the toggles bind (records differ) where eligibility occurs.
// G7 the eligibility rules on real data (New L0 × 8 combinations and random configurations, all toggles ON): every
//    episode belongs to a toggled book and starts at a "slot occupied" refusal; every delayed lot comes from an episode
//    live at its decision instant D (decision ≤ D < hypothetical exit), D is the end of the release minute of the
//    previous lot's final fill (or that session's close), its fill is at or after D, its fills equal a fresh
//    re-simulation of its book from D (independent state), no fresh decision stamped at D was refused by it (fresh
//    first), and the delayed lots of one release follow the frozen tie order.
// G8 the independent position on real data: every virtual trade of the controls' and random configurations' books,
//    re-simulated from its own decision, equals itself (entry, fills, prices, reasons).
// G9 the regression anchors (brief §1.8): New L0 with D1·VGT ON — the D1·VGT signal refused on 2022-12-20 (D1·GDX
//    holding the slot) ends at its hypothetical maximum-hold exit on 2023-01-04, and no D1·VGT delayed entry follows the
//    2023-04-19 release; at least one genuinely persistent episode is funded at a later release.
// G10 the archive key: '000' = Priority 3's key; every other combination adds its bits.
// G11 single-book pools: one enabled book with its toggle ON funds exactly its own trades (no competitor: no episode).
import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { decode as storeDecode, encode as storeEncode } from '../growth140-vgt-s8m/store.ts';
import { type BookId } from '../vg-d1-growth-joint/books.ts';
import type { Door } from '../vg-d1-growth-joint/data.ts';
import {
  type EvalOptions,
  type Rec,
  evalKey as p3EvalKey,
  evaluate as p3Evaluate,
  optionsKey,
  run as p3Run
} from '../vg-d1-growth-joint/evaluate.ts';
import type { PoolResult } from '../vg-d1-growth-joint/pool.ts';
import { p3 } from '../vg-d1-growth-diagnostic/context.ts';
import { requireStandardAdoption } from '../research-standard/preflight.ts';
import { type ShadowPoolResult, releaseInstant, tieOrderOf } from './allocator.ts';
import { simulationCaps } from './budgets.ts';
import { economics, log, r2, repoRoot, researchDir, resultsDir } from './context.ts';
import { type Cfg, cells, decode, optionsOf, pinStratum, quadId, screenGenomes, withSh } from './config.ts';
import { controlOf, loadControls, nl0Key, optionsOfControl } from './controls.ts';
import { openStudyDoor } from './doors.ts';
import { type SRec, type Sh, allSh, evalKey, evaluate, realSpecsOf, recordOf, run } from './evaluate.ts';
import { p3EvaluationDigest } from './lab.ts';
import { realPathOf } from './position.ts';
import { isSealed, readJson, sealJson, sha256File } from './records.ts';

export const parityFile = path.join(resultsDir, 'parity', 'parity.json');

const same = (a: unknown, b: unknown) => storeEncode(a) === storeEncode(storeDecode(storeEncode(b)));
const p3Part = (r: SRec): Rec => {
  const { sh: _s, shadow: _x, ...rest } = r;

  return rest as Rec;
};

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

// Random V configurations of every sub-cell's strata with their stratum's toggles (this study's namespace; labels never
// used by a search).
export const randomCfgs = (n: number, label: string): Cfg[] => {
  const out: Cfg[] = [];

  for (const cell of cells) {
    const gs = screenGenomes(n * 8, 'coarse', 'parity', label, cell.sub!);
    let k = 0;

    for (let i = 0; i < gs.length && k < n; i++) {
      try {
        out.push(decode(pinStratum(gs[i]!, cell, i), 'coarse'));
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

// The eligibility invariants of one detailed run (G7).
export const eligibilityViolations = (door: Door, cfg: Cfg, o: EvalOptions, x: ReturnType<typeof run>) => {
  const r = x.result as ShadowPoolResult;
  const sh = r.shadow;
  const bad: string[] = [];
  let delayed = 0;
  let independent = 0;

  if (!sh) return { bad, delayed, independent };

  const on = (b: BookId) => sh.toggles[b] === true;
  const specs = realSpecsOf(door, cfg.quad, o);
  const lots = [...r.lots].sort((a, b) => a.entryT - b.entryT || a.id - b.id);
  const order = tieOrderOf('D1');

  for (const ep of sh.episodes) {
    if (!on(ep.book)) bad.push(`episode ${ep.index}: ${ep.book} is OFF`);
    if (!ep.occupant) bad.push(`episode ${ep.index}: no occupant at its refusal`);
    if (ep.delayed && !(ep.dT <= ep.delayed.D && ep.delayed.D < ep.hyp.xT))
      bad.push(`episode ${ep.index}: funded while not live`);
  }

  for (let i = 0; i < lots.length; i++) {
    const lot = lots[i]!;
    const info = sh.delayedLots.get(lot.id);

    if (!info) continue;
    delayed++;

    const ep = sh.episodes[info.episode]!;
    const D = ep.delayed!.D;
    const prev = lots[i - 1];

    if (!on(lot.book)) bad.push(`lot ${lot.id}: delayed lot of an OFF book`);
    if (!prev || prev.open) bad.push(`lot ${lot.id}: no released lot before it`);
    else {
      const f = prev.fills.at(-1)!;

      if (releaseInstant(door.sym[prev.symbol].ds, f.s, f.k) !== D)
        bad.push(`lot ${lot.id}: D is not the end of the previous lot's release minute`);
    }
    if (lot.entryT < D) bad.push(`lot ${lot.id}: filled before D`);

    const path = realPathOf(specs[lot.book]!, ep.delayed!.decisionS, D, door.sessions - 1);

    if (JSON.stringify(path.fills) !== JSON.stringify(lot.trade.fills) || path.eT !== lot.entryT)
      bad.push(`lot ${lot.id}: its fills are not a fresh re-simulation from D`);
    if (JSON.stringify(lot.trade.fills.map((f) => f.t)) !== JSON.stringify([ep.hyp.xT].filter(Number.isFinite)))
      independent++;
    for (const fr of r.funding)
      if (fr.t === D && fr.outcome === 'refused' && fr.occupant.startsWith(`${lot.book} order`))
        bad.push(`lot ${lot.id}: a fresh decision at D was refused by the delayed order`);
    // the tie order among the episodes live at D
    const live = sh.episodes.filter(
      (e) =>
        e.index !== ep.index &&
        e.dT <= D &&
        e.hyp.xT > D &&
        e.losses.some((l) => l.D === D && l.reason === 'higher-priority shadow')
    );

    for (const e of live)
      if (order.indexOf(e.book) < order.indexOf(lot.book)) bad.push(`lot ${lot.id}: a higher-priority shadow lost`);
  }

  return { bad, delayed, independent };
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

  const runOf = (door: Door, q: Cfg['quad'], oo: EvalOptions, sh: Sh) => {
    simulations++;
    const x = run(door, q, oo, sh, true);

    return { x, rec: recordOf(door, q, x, oo, sh) };
  };

  // ----- G1: reproduction of the sealed 5B centres (toggles OFF) -----
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

    for (const c of loadControls().filter((x) => x.cfg.sh === '000')) {
      const { x, rec } = runOf(D24, c.cfg.quad, optionsOfControl(c), '000');
      const want = target(c.key);

      add('G1', `${c.key} = 5B's sealed L0 centre field for field (${quadId(c.cfg.quad)})`, same(p3Part(rec), want), {
        got: rec.net,
        want: want.net
      });
      for (const [a, ok] of Object.entries(accounting(rec, x.result))) add('G5', `${c.key} accounting ${a}`, ok);
    }

    const nl0 = runOf(D24, controlOf('NL0').cfg.quad, optionsOfControl(controlOf('NL0')), '000').rec;

    add(
      'G1',
      'New L0 development = $382,721.46 / $19,459.83 / 34 lots (NL0 §1.1)',
      nl0.net === 382721.46 && nl0.dd === 19459.83 && nl0.lots === 34,
      { net: nl0.net, dd: nl0.dd, lots: nl0.lots }
    );

    const d = controlOf('D');
    const native = runOf(D24, d.cfg.quad, { ...optionsOfControl(d), d1Arm: 'native' }, '000').rec;

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

  // ----- G2: 5B's archived L0 records reproduce through this study's path (every toggle OFF) -----
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
      const keyOf = (c: { quad: Cfg['quad']; inc: Cfg['inc'] }) =>
        `L0|${dn}|${optionsKey(optionsOf(c as Cfg))}|${quadId(c.quad)}`;
      const all = (db.prepare('SELECT key, json FROM configs ORDER BY key').all() as { key: string; json: string }[])
        .map((r) => storeDecode<Cfg>(r.json))
        .filter((c) => point.get(keyOf(c)) !== undefined);
      const step = Math.max(1, Math.floor(all.length / 200));
      let n = 0;

      for (let i = 0; i < all.length && n < 200; i += step, n++) {
        const c = all[i]!;
        const want = storeDecode<Rec>((point.get(keyOf(c)) as { json: string }).json);

        if (want.error) continue;

        const got = evaluate(doors[dn]!, c.quad, optionsOf(c as Cfg), '000');

        simulations++;
        compared++;
        if (same(p3Part(got), want)) identical++;
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
      `${identical} of ${compared} archived 5B L0 records (D19, D21, D23, D24; V, G, B) identical through this study's allocator (toggles OFF)`,
      compared >= 900 && identical === compared
    );
    add(
      'G2',
      `Priority 3's evaluation digest ${p3EvaluationDigest().slice(0, 16)} = its historical sealed digest`,
      p3EvaluationDigest() === p3.evaluationDigest
    );
  }

  // random configurations under every toggle combination (round-robin) and all-ON variants
  const rand = randomCfgs(16, 'g3').map((c, i) => withSh(c, allSh[i % allSh.length]!));

  // ----- G3 / G5: fast = detail -----
  for (const [i, c] of rand.entries()) {
    const oo = optionsOf(c);
    const fast = evaluate(D24, c.quad, oo, c.sh);
    const { x, rec } = runOf(D24, c.quad, oo, c.sh);

    simulations++;
    add('G3', `random ${i} (${c.sh}) fast = detail`, same(fast, rec));
    for (const [a, ok] of Object.entries(accounting(rec, x.result)))
      add('G5', `random ${i} (${c.sh}) accounting ${a}`, ok);
  }

  // ----- G4: causal prefix with every toggle ON -----
  for (const [i, c0] of randomCfgs(4, 'g4').entries()) {
    const c = withSh(c0, '111');
    const oo = optionsOf(c);
    const full = runOf(D24, c.quad, oo, c.sh).x;

    for (const dn of ['D19', 'D21', 'D23'] as const) {
      const door = doors[dn]!;
      const short = runOf(door, c.quad, oo, c.sh);
      const end = door.sessions - 1;
      const cut = door.sym.VGT.ds.sCloseTime[end]!;
      const fund = (r: PoolResult) =>
        r.funding.filter((f) => f.t <= cut).map((f) => `${f.book}|${f.t}|${f.outcome}|${f.kind}|${f.occupant}`);
      const lots = (r: PoolResult) =>
        r.lots
          .filter((l) => l.entryT <= cut)
          .map(
            (l) =>
              `${l.book}|${l.trade.kind}|${l.entryT}|${l.entryPrice}|${l.fills
                .filter((f) => f.t <= cut)
                .map((f) => `${f.t}:${f.price}:${f.partial}`)
                .join('/')}`
          );
      const eps = (r: ShadowPoolResult) =>
        (r.shadow?.episodes ?? [])
          .filter((e) => e.dT <= cut)
          .map((e) => `${e.book}|${e.dT}|${e.delayed && e.delayed.D <= cut ? e.delayed.D : '-'}`);
      const daily = (r: PoolResult) => Array.from({ length: end + 1 }, (_v, s) => r2(r.daily[s]!));
      const ok =
        JSON.stringify(fund(short.x.result)) === JSON.stringify(fund(full.result)) &&
        JSON.stringify(lots(short.x.result)) === JSON.stringify(lots(full.result)) &&
        JSON.stringify(eps(short.x.result)) === JSON.stringify(eps(full.result)) &&
        JSON.stringify(daily(short.x.result)) === JSON.stringify(daily(full.result));

      add('G4', `prefix ${i} (111) ${dn} = D24 through ${door.dates[end]}`, ok);
      for (const [a, okA] of Object.entries(accounting(short.rec, short.x.result)))
        add('G5', `prefix ${i} (111) ${dn} accounting ${a}`, okA);
    }
  }

  // ----- G6: OFF identity with Priority 3; the toggles bind -----
  {
    let differ = 0;
    const subjects = [
      ...loadControls()
        .filter((c) => c.cfg.sh === '000')
        .map((c) => ({ cfg: c.cfg, o: optionsOfControl(c) })),
      ...rand.slice(0, 24).map((c) => ({ cfg: withSh(c, '000'), o: optionsOf(c) }))
    ];

    for (const [i, x] of subjects.entries()) {
      const mine = run(D24, x.cfg.quad, x.o, '000', true).result;
      const theirs = p3Run(D24, x.cfg.quad, x.o, true).result;

      simulations += 2;
      add('G6', `subject ${i}: '000' replay = Priority 3's runPool field for field`, same(mine, theirs));
      add(
        'G6',
        `subject ${i}: '000' record = Priority 3's record`,
        same(p3Part(evaluate(D24, x.cfg.quad, x.o, '000')), p3Evaluate(D24, x.cfg.quad, x.o))
      );
      if (!same(p3Part(evaluate(D24, x.cfg.quad, x.o, '111')), p3Evaluate(D24, x.cfg.quad, x.o))) differ++;
      simulations += 3;
    }
    add(
      'G6',
      `${differ} of ${subjects.length} subjects' all-ON records differ from OFF (the toggles bind)`,
      differ > 0
    );
  }

  // ----- G7: the eligibility rules on real data -----
  {
    let delayed = 0;
    let independent = 0;
    let violations = 0;
    const subjects = [
      ...allSh.map((sh) => ({ cfg: controlOf(nl0Key(sh)).cfg, name: nl0Key(sh) })),
      ...['C4', 'C4R', 'C85', 'IJ1'].map((k) => ({ cfg: withSh(controlOf(k).cfg, '111'), name: `${k}/sh111` })),
      ...rand.slice(0, 24).map((c, i) => ({ cfg: withSh(c, '111'), name: `random ${i}/sh111` }))
    ];

    for (const x of subjects) {
      const oo = optionsOf(x.cfg);
      const r = runOf(D24, x.cfg.quad, oo, x.cfg.sh).x;
      const v = eligibilityViolations(D24, x.cfg, oo, r);

      delayed += v.delayed;
      independent += v.independent;
      violations += v.bad.length;
      if (v.bad.length) add('G7', `${x.name}: eligibility rule violations`, false, v.bad.slice(0, 5));
    }
    add(
      'G7',
      `${delayed} delayed lots obey every eligibility rule (${subjects.length} subjects)`,
      violations === 0 && delayed > 0
    );
    add('G7', `${independent} delayed lots exit on their own path (≠ the hypothetical exit)`, independent > 0);
  }

  // ----- G8: the independent position re-simulates every virtual trade -----
  {
    let n = 0;
    let bad = 0;

    for (const c of [
      ...loadControls()
        .filter((x) => x.cfg.sh === '000')
        .map((x) => x.cfg),
      ...rand.slice(0, 16)
    ]) {
      const oo = optionsOf(c);
      const x = run(D24, c.quad, oo, '000');
      const specs = realSpecsOf(D24, c.quad, oo);

      for (const b of x.books)
        for (const v of b.trades) {
          const p = realPathOf(specs[b.book]!, v.dS, v.dT, D24.sessions - 1);

          n++;
          if (
            p.eS !== v.eS ||
            p.eK !== v.eK ||
            (v.eS >= 0 && (p.eT !== v.eT || p.ePrice !== v.ePrice)) ||
            JSON.stringify(p.fills) !== JSON.stringify(v.fills) ||
            p.open !== v.open
          ) {
            bad++;
            if (bad <= 5) add('G8', `${b.book} trade ${v.id} (${b.key.slice(0, 40)}) differs`, false);
          }
        }
    }
    add('G8', `${n} virtual trades re-simulated from their own decisions, ${bad} differ`, bad === 0 && n > 500);
  }

  // ----- G9: the regression anchors -----
  {
    const x = runOf(D24, controlOf(nl0Key('010')).cfg.quad, optionsOfControl(controlOf('NL0')), '010').x;
    const sh = (x.result as ShadowPoolResult).shadow!;
    const date = (t: number) => new Date(t * 1000).toISOString().slice(0, 10);
    const dec = sh.episodes.find((e) => e.book === 'D1:VGT' && D24.dates[e.dS] === '2022-12-20');

    add(
      'G9',
      'the D1·VGT signal refused on 2022-12-20 opens an episode (occupant D1·GDX)',
      dec?.occupantBook === 'D1:GDX',
      dec
    );
    add(
      'G9',
      'its hypothetical trade exits on 2023-01-04 by maximum hold, which ends the episode',
      dec !== undefined &&
        D24.dates[dec.hyp.xS] === '2023-01-04' &&
        dec.hyp.xReason === 'maximum hold' &&
        dec.end.reason === 'hypothetical exit' &&
        dec.delayed === null,
      dec
    );

    const april = x.result.lots.filter(
      (l) => D24.dates[l.entryS] === '2023-04-19' || D24.dates[l.entryS] === '2023-04-20'
    );
    const gdxRelease = x.result.lots.find(
      (l) => l.book === 'D1:GDX' && l.fills.at(-1) && D24.dates[l.fills.at(-1)!.s] === '2023-04-19'
    );

    add('G9', 'D1·GDX releases the slot on 2023-04-19', gdxRelease !== undefined);
    add(
      'G9',
      'no D1·VGT delayed entry follows the 2023-04-19 release',
      !april.some((l) => l.book === 'D1:VGT' && l.trade.kind.startsWith('delayed')),
      april.map((l) => `${l.book} ${l.trade.kind}`)
    );

    const persistent = sh.episodes.filter((e) => e.delayed && e.delayed.lotId > 0 && e.delayed.waitSessions >= 2);

    add(
      'G9',
      `${persistent.length} persistent episodes funded at a later release (e.g. ${persistent[0] ? `${D24.dates[persistent[0].dS]} → ${date(persistent[0].delayed!.D)}` : '—'})`,
      persistent.length > 0
    );
  }

  // ----- G10: archive keys -----
  {
    const c = rand[0]!;
    const keys = allSh.map((sh) => evalKey('D24', c.quad, optionsOf(c), sh));

    add('G10', "'000' = Priority 3's key", keys[0] === p3EvalKey('D24', c.quad, optionsOf(c)));
    add('G10', 'the eight combinations have eight keys', new Set(keys).size === 8);
  }

  // ----- G11: single-book pools -----
  for (const [i, c] of rand.slice(0, 8).entries())
    for (const b of ['D1:GDX', 'D1:VGT', 'G:VGT'] as BookId[]) {
      const enabled: Partial<Record<BookId, boolean>> = {
        'D1:GDX': false,
        'D1:VGT': false,
        'G:GDX': false,
        'G:VGT': false,
        [b]: true
      };
      const x = runOf(D24, c.quad, { enabled }, '111').x;
      const book = x.books.find((y) => y.book === b)!;
      const filled = book.trades.filter((t) => t.eS >= 0);
      const lots = x.result.lots;
      const ok =
        lots.length === filled.length &&
        lots.every(
          (l, k) =>
            l.trade.id === filled[k]!.id && l.fills.map((f) => f.t).join() === filled[k]!.fills.map((f) => f.t).join()
        ) &&
        ((x.result as ShadowPoolResult).shadow?.episodes.length ?? 0) === 0;

      add('G11', `random ${i} ${b} alone (toggle ON): the pool funds exactly the book's own trades`, ok, {
        lots: lots.length,
        trades: filled.length
      });
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
    priority3EvaluationDigestHistorical: p3.evaluationDigest,
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
