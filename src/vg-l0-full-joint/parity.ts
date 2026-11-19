// Stage V — the engineering gates of the full joint genome on real data (PROTOCOL.md §12; brief §1), before any search
// and before the freeze. Records pass/fail counts and hashes only: NO performance figure of a searched (non-incumbent)
// configuration is computed into the record. A failed gate stops every dependent stage.
//   V0 isolation: only src/vg-l0-full-joint/** (and the package.json script) changed under src/apps/config since
//      Assignment 2's tip; research/ changes only in this study; RC 1 and RC 2 = Assignment 2's frozen closure;
//      Priority 3's, 5B's, the shadow study's and Assignment 2's evaluation digests (and Assignment 2's decision digest)
//      equal their sealed values.
//   V1 the frozen New L0 under legacy defaults through this study's path = Priority 3's engine (books, lots, funding,
//      every minute-mark change, drawdowns, the record) on FULL (AD3) and D19–D24; FULL $479,605.18 / $20,385.99 / 46
//      lots and the foundation's sealed trade-list, funding and mark hashes; D24 $382,721.46 / $19,459.83 / 34 lots; the
//      three other incumbents reproduce 5B's sealed L0 development nets on D24 (IJ1 $382,163.79, C4 $302,785.91,
//      C4-refined $360,569.71).
//   V2 random FULL JOINT configurations (all 64 cells, random activations, random Growth genomes at both resolutions):
//      legacy cell → RC 2 = Priority 3 (books, result with marks, record); next-session controls → RC 2 = RC 1 (books with
//      their logs, result with marks); on D21 and D24.
//   V3 Growth: (a) random Growth·VGT genomes (every structure family, both resolutions): Priority 3's pooled Growth book
//      = the canonical Growth 1.4.0 path (runRiseTrading + summarizeSimulation: every trade, daily marks, drawdowns) on
//      D24; (b) signal causality: one active Growth gene moved by one fine step always changes the configuration's
//      identity (the share that also changes Growth's executed trades is reported: discrete signals often ignore a
//      0.1-point nudge); EVERY one of the 50 numeric genes and every optional Growth rule, in up to 8 sampled contexts
//      where it is active, changes the engine's parameters in every context and Growth's executed trades or its decision
//      log (signals, opportunities, gate and eligibility events) in at least one, under a move by its refinement radius R
//      or to a bound of its box (the ±R trade-change share is reported); genomes differing only in inactive genes decode to the
//      identical effective Growth vector and the identical pooled record; (c) inside a joint pool the funded Growth lots
//      are exactly Growth's own virtual trades at their own fills.
//   V4 entry-day invariants on random joint configurations (Assignment 2's V4): determinism; causality (D21 vs D24);
//      accounting; every entry-day exit re-derived from the bars; no missed trigger; protective nets < 0; no other exit
//      on an entry session.
//   V5 causality and accounting of random joint configurations: every trade of every book (Growth included) closed by
//      D21's end is identical on D21 and D24; Σ lots = net; one slot (no overlapping lots); funded fills = virtual fills.
//   V6 worker reproducibility: the same configurations evaluated in child-process workers (the Lab) and in-process give
//      identical records; a JSON round trip of a configuration keeps its identity and evaluation key.
//   V7 module tests (RC 1, RC 2, Assignment 2's, this study's) pass.
//   V8 frozen work: the research preflight of every study; Assignment 1's and Assignment 2's sealed records verify.
import { execSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { isDeepStrictEqual } from 'node:util';
import { createHash } from 'node:crypto';
import { codeDigest as p5bDigest } from '../vg-lifecycle-matched-optimization/lab.ts';
import { codeDigest as shadowDigest } from '../vg-l0-shadow-eligibility/lab.ts';
import { codeDigest as a2Digest } from '../vg-l0-risk-families/lab.ts';
import { decisionDigest as a2DecisionDigest } from '../vg-l0-risk-families/freeze.ts';
import { type EvalOptions, evaluate as p3Evaluate, recordOf, run as p3Run } from '../vg-d1-growth-joint/evaluate.ts';
import { type Door, openPrefixDoor } from '../vg-d1-growth-joint/data.ts';
import type { PoolResult } from '../vg-d1-growth-joint/pool.ts';
import { checkGrowth } from '../vg-d1-growth-joint/parity.ts';
import { effectiveOf, fineStepOf, radiusValue, repair, roundStep } from '../growth140-vgt-stable/space.ts';
import { growthParamsOf, runGrowthBook, simulateGrowth } from '../vg-d1-growth-joint/books.ts';
import { Rng } from '../optimizer/rng.ts';
import { encode as storeEncode } from '../growth140-vgt-s8m/store.ts';
import { runWithControls } from '../d1-risk-controls/run.ts';
import { toRc1 } from '../d1-risk-controls-rc2/config.ts';
import { evaluateWithControls2, runWithControls2 } from '../d1-risk-controls-rc2/run.ts';
import type { RiskVBook2 } from '../d1-risk-controls-rc2/book.ts';
import { entryDayTrigger } from '../d1-risk-controls-rc2/exit.ts';
import { cacheRoot, log, r2, repoRoot, resultsDir, seedOf, symbols } from './context.ts';
import { openFullForBaseline } from './doors.ts';
import { evaluate } from './evaluate.ts';
import { codeDigest, p3EvaluationDigest, withLab } from './lab.ts';
import { incumbentKeys, vOptions } from './nl0.ts';
import { logDoor, readJson, sealJson, sha256File } from './records.ts';
import {
  type Cfg,
  type GConfig,
  activeOrdinal,
  allCells,
  canonicalCfg,
  cellOf,
  cfgId,
  decode,
  encode,
  entryDayOf,
  evalKeyOf,
  gNumOffset,
  gId,
  legacyCellId,
  levelsOf,
  nCat,
  nGenes,
  numericGenes,
  pinCell,
  quadOf,
  structureOf
} from './space.ts';
import { incumbentCfg } from './stages.ts';

export const parityFile = path.join(resultsDir, 'parity', 'parity.json');
const assignment2Tip = '73d3a74818ab97d0fe69b59b10bebf6ec2ba849d';
const sealedDigests = {
  priority3: '147cad7c17eff3fa50442d2cb0ffb9c22cb7ba5091a46d1e14d3351d5cff4e88',
  p5b: '3f902532b651da1939f67d650d381bcf1e27ad3b76b3f2dedef95403fba23e3b',
  shadow: '54304b69941e0481d5d36d52c30e76e724596dadd803c6e41489a3633e8c878e',
  assignment2: '6bc03fecd92a732b139f52b6755aa8eb2e21f17e47fd4fdb9132782a672f212d',
  assignment2Decision: '3b9efbc72b320a2886a791b75957d7010c936eeefced45d1966bcdfb4a204746'
};
const foundationG1 = {
  file: 'research/vg-l0-risk-controls-foundation/results/gates/g1-g3-new-l0.json',
  sha256: 'b05b5c784fb1e82f20a48da127f09bc8d8df29c8f2bac4191494e6c840699179'
};
// 5B's sealed L0 development nets (research/vg-lifecycle-matched-optimization/results/validation/validation.json)
const sealedD24 = { NL0: 382721.46, IJ1: 382163.79, C4: 302785.91, C4R: 360569.71 } as const;
const sha = (s: string) => createHash('sha256').update(s).digest('hex');
const iso = (t: number) => new Date(t * 1000).toISOString().slice(0, 16);

// the foundation's ledger row (tools/vg-l0-risk-controls-foundation/gates.ts ledgerRow), for its sealed hashes
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

const strip = (b: unknown) => {
  const { rc: _rc, key: _key, ...rest } = b as RiskVBook2;

  return rest;
};

interface Gate {
  checks: number;
  failed: number;
  problems: string[];
  [k: string]: unknown;
}
const gate = (): Gate => ({ checks: 0, failed: 0, problems: [] });
const check = (g: Gate, ok: boolean, what: string) => {
  g.checks++;
  if (!ok) {
    g.failed++;
    if (g.problems.length < 50) g.problems.push(what);
  }
};

// legacy: RC 2 (null controls) through this study's quad against Priority 3 — books, the result (marks included), record
const legacyEqual = (door: Door, cfg: Cfg, o: EvalOptions) => {
  const q = quadOf(cfg);
  const ref = p3Run(door, q, o, true, true);
  const x = runWithControls2(door, q, null, o, true, true, { cache: false });

  return {
    ref,
    books: x.books.length === ref.books.length && x.books.every((b, i) => isDeepStrictEqual(strip(b), strip(ref.books[i]))),
    result: isDeepStrictEqual(x.result, ref.result),
    record: isDeepStrictEqual(evaluateWithControls2(door, q, null, o, { cache: false }).rec, p3Evaluate(door, q, o))
  };
};

const randomCfgs = (n: number, label: string, cells: readonly string[], res: 'coarse' | 'fine', entryDay?: boolean): Cfg[] => {
  const rng = Rng.from(...seedOf('parity', label));
  const lv = levelsOf(res);
  const out: Cfg[] = [];

  for (let i = 0; out.length < n && i < n * 50; i++) {
    const cell = cellOf(cells[i % cells.length]!);
    const g = pinCell(
      lv.map((k) => rng.int(k)),
      cell
    );

    for (const s of symbols) if (entryDay !== undefined && cell[s].family !== 'A') g[s === 'GDX' ? 4 : 5] = entryDay ? 1 : 0;
    if (entryDay === true && !symbols.some((s) => cell[s].family !== 'A')) continue;

    try {
      out.push(decode(g, res));
    } catch {
      // an invalid Growth combination is skipped (none expected)
    }
  }
  return out;
};

export const runParity = async (o: { dry?: boolean; workers?: number } = {}) => {
  if (!o.dry && fs.existsSync(parityFile)) throw new Error('stage V is sealed');

  const t0 = Date.now();
  const gates: Record<string, Gate> = {};
  let simulations = 0;

  // ----- V0 isolation -----
  {
    const g = (gates.V0 = gate());
    const changed = execSync(`git diff --name-only ${assignment2Tip} -- src apps config package.json`, { cwd: repoRoot }).toString().trim().split('\n').filter(Boolean);
    const untracked = execSync('git ls-files --others --exclude-standard -- src apps config', { cwd: repoRoot }).toString().trim().split('\n').filter(Boolean);
    const research = [
      ...execSync(`git diff --name-only ${assignment2Tip} -- research`, { cwd: repoRoot }).toString().trim().split('\n'),
      ...execSync('git ls-files --others --exclude-standard -- research', { cwd: repoRoot }).toString().trim().split('\n')
    ].filter(Boolean);
    const allowed = (f: string) => f.startsWith('src/vg-l0-full-joint/') || f === 'package.json';

    for (const f of [...changed, ...untracked]) check(g, allowed(f), `changed outside the allowed modules: ${f}`);
    for (const f of research) check(g, f.startsWith('research/vg-l0-full-joint/'), `research change outside this study: ${f}`);

    const a2Freeze = readJson<{ closure: { file: string; sha256: string }[] }>(path.join(repoRoot, 'research/vg-l0-risk-families/results/protocol-freeze.json'));

    for (const x of a2Freeze.closure.filter((c) => c.file.startsWith('src/d1-risk-controls')))
      check(g, sha256File(path.join(repoRoot, x.file)) === x.sha256, `RC 1/RC 2 file changed: ${x.file}`);

    const digests = { priority3: p3EvaluationDigest(), p5b: p5bDigest(), shadow: shadowDigest(), assignment2: a2Digest(), assignment2Decision: a2DecisionDigest() };

    for (const [k, v] of Object.entries(digests)) check(g, v === sealedDigests[k as keyof typeof sealedDigests], `${k} digest ${v}`);
    g.digests = digests;
    g.changed = [...changed, ...untracked];
  }

  // ----- V1 New L0 legacy: FULL (AD3) and the prefix doors; the incumbents on D24 -----
  const nl0Cfg = incumbentCfg('NL0');

  {
    const g = (gates.V1 = gate());
    const sealed = readJson<{ G1: { tradeListSha256: string; fundingSha256: string; markChangesSha256: string } }>(path.join(repoRoot, foundationG1.file));

    check(g, sha256File(path.join(repoRoot, foundationG1.file)) === foundationG1.sha256, 'the foundation G1–G3 record is not its sealed file');
    check(g, cfgId(nl0Cfg) === 'a2e385640ca61012', `New L0's identity ${cfgId(nl0Cfg)}`);

    const searches = fs.existsSync(path.join(resultsDir, 'search'));
    const full = await openFullForBaseline('stage V: New L0 legacy reproduction (V1)', searches);
    const oFull: EvalOptions = { ...vOptions, boundaries: ['2024-12-31'] };
    const c = legacyEqual(full, nl0Cfg, oFull);
    const rec = recordOf(full, quadOf(nl0Cfg), c.ref, oFull);
    const study = evaluate(full, quadOf(nl0Cfg), nl0Cfg.controls, oFull);

    simulations += 4;
    check(g, c.books && c.result && c.record, 'FULL: RC 2 legacy differs from Priority 3');
    check(g, isDeepStrictEqual({ ...study, rc: undefined }, { ...p3Evaluate(full, quadOf(nl0Cfg), oFull), rc: undefined }), "FULL: the study's evaluation path differs from Priority 3's record");
    check(g, r2(rec.net) === 479605.18 && r2(rec.dd) === 20385.99 && rec.lots === 46, `FULL headline ${rec.net} / ${rec.dd} / ${rec.lots}`);
    check(g, rec.periods[0]!.after.toFixed(2) === '96883.72' && rec.periods[0]!.dd.toFixed(2) === '20385.99', 'FULL validation period');
    check(g, sha(JSON.stringify(c.ref.result.lots.map((l, i) => ledgerRow(full, l, i)))) === sealed.G1.tradeListSha256, 'FULL trade list ≠ the foundation’s sealed list');
    check(g, sha(JSON.stringify(c.ref.result.funding)) === sealed.G1.fundingSha256, 'FULL funding log ≠ sealed');
    check(g, sha(JSON.stringify(c.ref.result.markChanges)) === sealed.G1.markChangesSha256, 'FULL minute marks ≠ sealed');
    g.full = { net: rec.net, dd: rec.dd, lots: rec.lots, validationPnl: rec.periods[0]!.after, resetDd: rec.periods[0]!.dd, signature: rec.signature, fundingDecisions: c.ref.result.funding.length, markChanges: c.ref.result.markChanges!.t.length };

    for (const d of ['D19', 'D21', 'D23', 'D24'] as const) {
      const door = await openPrefixDoor(d, `stage V: New L0 legacy parity on ${d}`, true);

      logDoor(d, 'stage V V1 (pass/fail only)', { sha256: { GDX: door.sym.GDX.dataSha256, VGT: door.sym.VGT.dataSha256 } });

      const x = legacyEqual(door, nl0Cfg, vOptions);
      const r = recordOf(door, quadOf(nl0Cfg), x.ref, vOptions);

      simulations += 3;
      check(g, x.books && x.result && x.record, `${d}: RC 2 legacy differs from Priority 3`);
      if (d === 'D24') {
        check(g, r2(r.net) === 382721.46 && r2(r.dd) === 19459.83 && r.lots === 34, `D24 headline ${r.net} / ${r.dd} / ${r.lots}`);
        for (const k of incumbentKeys) {
          const ic = incumbentCfg(k);
          const ir = evaluate(door, quadOf(ic), ic.controls, vOptions);

          simulations++;
          check(g, r2(ir.net) === sealedD24[k], `D24 ${k} ${ir.net} ≠ 5B's sealed ${sealedD24[k]}`);
        }
      }
      g[d] = { net: r.net, dd: r.dd, lots: r.lots, signature: r.signature };
    }
  }

  const doors = { D21: await openPrefixDoor('D21', 'stage V V2–V6', true), D24: await openPrefixDoor('D24', 'stage V V2–V6', true) };

  // ----- V2 random joint configurations: legacy = Priority 3; next-session = RC 1 -----
  {
    const g = (gates.V2 = gate());
    const legacy = [...randomCfgs(24, 'V2-legacy-coarse', [legacyCellId], 'coarse'), ...randomCfgs(16, 'V2-legacy-fine', [legacyCellId], 'fine')];
    const rc1 = [
      ...randomCfgs(64, 'V2-rc1-coarse', allCells.map((c) => c.id), 'coarse', false),
      ...randomCfgs(32, 'V2-rc1-fine', allCells.map((c) => c.id), 'fine', false)
    ];
    let protective = 0;

    for (const cfg of legacy)
      for (const [d, door] of Object.entries(doors)) {
        const x = legacyEqual(door, cfg, vOptions);

        simulations += 3;
        check(g, x.books && x.result && x.record, `legacy ${d} ${cfgId(cfg)}`);
      }
    for (const cfg of rc1)
      for (const [d, door] of Object.entries(doors)) {
        const q = quadOf(cfg);
        const a = runWithControls2(door, q, cfg.controls, vOptions, true, true, { cache: false });
        const b = runWithControls(door, q, toRc1(cfg.controls), vOptions, true, true, { cache: false });

        simulations += 2;
        protective += a.books.reduce((n, bk) => n + ((bk as unknown as RiskVBook2).rc?.summary.protectiveExits ?? 0), 0);
        check(g, isDeepStrictEqual(a.books, b.books) && isDeepStrictEqual(a.result, b.result), `rc1 ${d} ${cfg.cell} ${cfgId(cfg)}`);
      }
    g.configurations = { legacy: legacy.length, rc1: rc1.length };
    g.protectiveExitsSeen = protective;
  }

  // ----- V3 Growth: canonical parity, signal causality, inactive genes, pooled Growth lots -----
  {
    const g = (gates.V3 = gate());
    const door = doors.D24;
    const sample = [...randomCfgs(28, 'V3-growth-coarse', [legacyCellId], 'coarse'), ...randomCfgs(16, 'V3-growth-fine', [legacyCellId], 'fine')];
    const structures = new Set<string>();

    // (a) the pooled Growth book against the canonical Growth 1.4.0 path
    for (const cfg of sample) {
      const st = structureOf(cfg.g);

      structures.add(`${st.entry}|${st.exits}|${st.trend}|${st.elig}|${st.cont}`);

      const c = checkGrowth(door, 'VGT', cfg.g, gId(cfg.g));

      simulations += 3;
      check(g, c.pass, `canonical Growth ${gId(cfg.g)}: ${JSON.stringify(c.detail).slice(0, 300)}`);
    }

    // (b) one active Growth gene moved by one fine step; inactive genes only
    const rng = Rng.from(...seedOf('parity', 'V3-moves'));
    const lv = levelsOf('fine');
    let identityChanged = 0;
    let tradesChanged = 0;
    let moved = 0;
    let inactiveIdentical = 0;

    for (const cfg of randomCfgs(40, 'V3-causality', allCells.map((c) => c.id), 'fine')) {
      const gen = encode(cfg, 'fine');
      const active = activeOrdinal(cfg).filter((k) => k >= gNumOffset);
      const k = active[rng.int(active.length)]!;
      const up = [...gen];

      up[k] = gen[k]! + 1 < lv[k]! ? gen[k]! + 1 : gen[k]! - 1;

      const m = decode(up, 'fine');
      const tradesOf = (c: Cfg) => runGrowthBook(door.sym.VGT, door, c.g).trades.map((t) => [t.eT, t.fills.map((f) => [f.t, f.raw])]);

      moved++;
      if (cfgId(m) !== cfgId(cfg) && gId(m.g) !== gId(cfg.g)) identityChanged++;
      if (JSON.stringify(tradesOf(m)) !== JSON.stringify(tradesOf(cfg))) tradesChanged++;
      simulations += 2;

      const inactive = Array.from({ length: nGenes - nCat }, (_v, i) => nCat + i).filter((x) => !activeOrdinal(cfg).includes(x));
      const h = [...gen];

      for (const x of inactive) h[x] = rng.int(lv[x]!);

      const same = decode(h, 'fine');

      if (isDeepStrictEqual(same.g, cfg.g) && cfgId(same) === cfgId(cfg)) {
        const a = evaluate(door, quadOf(cfg), cfg.controls, vOptions);
        const b = evaluate(door, quadOf(same), same.controls, vOptions);

        simulations += 2;
        if (isDeepStrictEqual(a, b)) inactiveIdentical++;
      }
    }
    check(g, identityChanged === moved, `an active Growth step changed the identity in ${identityChanged} of ${moved}`);
    check(g, inactiveIdentical === moved, `inactive genes: identical configuration and record in ${inactiveIdentical} of ${moved}`);

    // every numeric gene and every optional rule reaches the engine: (i) its parameters change in every sampled context
    // where the gene is active (wiring); (ii) Growth's executed trades OR its decision log (signals, opportunities,
    // gate and eligibility events with their levels) change in at least one context under a move by the refinement
    // radius R or to a bound of its box (state reach); the share of contexts whose TRADES change at ±R is reported
    const pool = randomCfgs(800, 'V3-reach', [legacyCellId], 'fine');
    const simOf = (c: GConfig) => simulateGrowth(door.sym.VGT, growthParamsOf(c, 'VGT', door)).simulation;
    const tradeKey = (sim: ReturnType<typeof simOf>) =>
      sha(JSON.stringify(sim.trades.map((t) => [t.decisionTime, t.entryTime, t.entryRawPrice, t.exitTime, t.exitRawPrice, r2(t.net)])));
    const logKey = (sim: ReturnType<typeof simOf>) => sha(JSON.stringify(sim.log.entries));
    const paramKey = (c: GConfig) => JSON.stringify(growthParamsOf(c, 'VGT', door));
    const reach: Record<string, { contexts: number; paramsChanged: number; tradesChangedAtR: number; stateReached: number }> = {};
    const probe = (key: string, active: (c: Cfg) => boolean, moves: (c: GConfig) => GConfig[]) => {
      const row = (reach[key] = { contexts: 0, paramsChanged: 0, tradesChangedAtR: 0, stateReached: 0 });

      for (const c of pool) {
        if (row.contexts >= 8) break;
        if (!active(c)) continue;

        let ms: GConfig[];

        try {
          ms = moves(c.g);
        } catch {
          continue;
        }

        const base = simOf(c.g);
        const sims = ms.map(simOf);

        row.contexts++;
        simulations += 1 + ms.length;
        if (ms.every((m) => paramKey(m) !== paramKey(c.g))) row.paramsChanged++;
        if (tradeKey(sims[0]!) !== tradeKey(base)) row.tradesChangedAtR++;
        if (sims.some((x) => tradeKey(x) !== tradeKey(base) || logKey(x) !== logKey(base))) row.stateReached++;
      }
      check(g, row.contexts > 0 && row.paramsChanged === row.contexts, `Growth ${key}: the engine parameters changed in ${row.paramsChanged} of ${row.contexts} contexts`);
      check(g, row.stateReached > 0, `Growth ${key}: trades or decision log changed in ${row.stateReached} of ${row.contexts} contexts`);
    };

    for (const gene of numericGenes) {
      const step = fineStepOf(gene);
      const R = Math.max(step, roundStep(radiusValue(gene), step));

      probe(
        gene.key,
        (c) => gene.active(structureOf(c.g)),
        (g0) => {
          const v0 = g0[gene.key] as number;
          const vR = v0 + R <= gene.max + 1e-9 ? roundStep(v0 + R, step) : roundStep(v0 - R, step);
          const ends = [gene.min, gene.max].filter((v) => Math.abs(v - v0) > 1e-9);

          return [vR, ...ends].map((v) => effectiveOf(repair({ ...g0, [gene.key]: v })));
        }
      );
    }
    for (const key of ['trendFilterEnabled', 'eligibilityEnabled', 'drawdownRecoveryGateEnabled', 'initialStopEnabled', 'retentionEnabled', 'continuationEnabled', 'intradayLossBufferEnabled'])
      probe(
        `${key} OFF`,
        (c) => c.g[key] === true,
        (g0) => [effectiveOf(repair({ ...g0, [key]: false }))]
      );
    g.reach = reach;

    // (c) inside the joint pool the funded Growth lots are Growth's own virtual trades at their own fills
    let growthLots = 0;

    for (const cfg of randomCfgs(24, 'V3-pool', allCells.map((c) => c.id), 'fine')) {
      const x = runWithControls2(door, quadOf(cfg), cfg.controls, vOptions, true, false, { cache: false });
      const book = x.books.find((b) => b.book === 'G:VGT')!;

      simulations++;
      for (const l of x.result.lots.filter((y) => y.book === 'G:VGT')) {
        const v = book.trades.find((t) => t.id === l.trade.id);

        growthLots++;
        check(g, Boolean(v) && isDeepStrictEqual(l.fills.map((f) => [f.s, f.k, f.t, f.raw, f.price, f.reason]), v!.fills.map((f) => [f.s, f.k, f.t, f.raw, f.price, f.reason])), `Growth lot ≠ its virtual trade ${cfgId(cfg)}`);
      }
    }
    Object.assign(g, { growthStructures: structures.size, moved, identityChanged, oneStepTradesChanged: tradesChanged, inactiveIdentical, growthLots });
  }

  // ----- V4 entry-day invariants on random joint configurations -----
  {
    const g = (gates.V4 = gate());
    const counts = { configurations: 0, entryDayExits: 0, fillMinute: 0, laterMinuteLow: 0, minuteOpen: 0, prefillLowsIgnored: 0, survivedEntryDay: 0, closingPrintEntries: 0 };
    const protectedCells = allCells.filter((c) => c.GDX.family !== 'A' || c.VGT.family !== 'A').map((c) => c.id);

    for (const cfg of randomCfgs(96, 'V4', protectedCells, 'fine', true)) {
      counts.configurations++;

      const q = quadOf(cfg);
      const run24 = () => runWithControls2(doors.D24, q, cfg.controls, vOptions, true, false, { cache: false });
      const a = run24();
      const b = run24();

      simulations += 2;
      check(g, JSON.stringify(a) === JSON.stringify(b), `determinism ${cfg.cell}`);

      for (const bk of a.books) {
        if (!bk.book.startsWith('D1:')) continue;

        const rc = (bk as unknown as RiskVBook2).rc;
        const sym = bk.book.slice(3) as 'GDX' | 'VGT';
        const ds = doors.D24.sym[sym].ds;
        const entryDay = entryDayOf(cfg, sym);

        bk.trades.forEach((t, i) => {
          if (t.eS < 0) return;

          const r = rc.trades[i]!;
          const f = t.fills[0];
          const sameSession = f && f.s === t.eS;

          if (!entryDay) {
            check(g, !sameSession, `a next-session book exited on its entry session ${cfg.cell} ${bk.book}`);
            return;
          }

          const L = r.protectiveLevel!;
          const start = ds.sBarStart[t.eS]!;
          const p = entryDayTrigger(ds, t.eS, t.eK, L, 'stop');

          for (let k = 0; k < t.eK && k < ds.sBarCount[t.eS]!; k++) if (ds.bLow[start + k]! <= L) counts.prefillLowsIgnored++;
          if (t.eK >= ds.sBarCount[t.eS]!) counts.closingPrintEntries++;

          if (r.entryDayExit) {
            counts.entryDayExits++;
            check(g, Boolean(sameSession) && f!.reason === 'protective stop', `entry-day exit not on the entry session ${cfg.cell}`);
            check(g, Boolean(p) && p!.barIndex === f!.k && p!.price === f!.raw, `entry-day exit ≠ the re-derived trigger ${cfg.cell} ${bk.book} trade ${t.id}`);
            check(g, f!.k >= t.eK && f!.t >= t.eT, `entry-day exit before the fill ${cfg.cell}`);
            check(g, f!.raw <= L + 1e-9, `entry-day fill above L ${cfg.cell}`);
            check(g, t.vNet < 0, `a profitable protective exit ${cfg.cell}`);
            if (p!.kind === 'open') counts.minuteOpen++;
            else if (p!.triggerK === t.eK) counts.fillMinute++;
            else counts.laterMinuteLow++;
          } else {
            check(g, !sameSession, `an entry-day book exited on its entry session by ${f?.reason} ${cfg.cell}`);
            check(g, p === undefined, `a missed entry-day trigger ${cfg.cell} ${bk.book} trade ${t.id}`);
            counts.survivedEntryDay++;
          }
        });
      }
    }
    Object.assign(g, counts);
  }

  // ----- V5 causality and accounting -----
  {
    const g = (gates.V5 = gate());
    const end21 = doors.D21.sym.VGT.ds.sCloseTime[doors.D21.sessions - 1]!;

    for (const cfg of randomCfgs(64, 'V5', allCells.map((c) => c.id), 'fine')) {
      const q = quadOf(cfg);
      const a = runWithControls2(doors.D24, q, cfg.controls, vOptions, true, false, { cache: false });
      const c21 = runWithControls2(doors.D21, q, cfg.controls, vOptions, true, false, { cache: false });

      simulations += 2;
      for (const bk of a.books) {
        const short = c21.books.find((x) => x.book === bk.book)!;
        const closed = (ts: typeof bk.trades) => ts.filter((t) => !t.open && t.fills.length && t.fills.at(-1)!.t <= end21);

        check(g, isDeepStrictEqual(closed(bk.trades), closed(short.trades)), `causality ${cfg.cell} ${bk.book}`);
      }

      const lots = [...a.result.lots].sort((x, y) => x.entryT - y.entryT);

      check(g, Math.abs(a.result.lots.reduce((s, l) => s + l.net, 0) - a.result.net) < 1e-6, `Σ lots ≠ net ${cfg.cell}`);
      check(g, a.result.lots.every((l) => l.principal0 <= 100_000 + 1e-9), `principal above the budget ${cfg.cell}`);
      for (let i = 1; i < lots.length; i++) check(g, !lots[i - 1]!.open && lots[i]!.entryT >= lots[i - 1]!.fills.at(-1)!.t, `overlapping lots ${cfg.cell}`);
      for (const l of a.result.lots) {
        const v = a.books.find((bk) => bk.book === l.book)!.trades.find((t) => t.id === l.trade.id)!;

        check(g, isDeepStrictEqual(l.fills.map((f) => [f.s, f.k, f.t, f.raw, f.price, f.reason]), v.fills.map((f) => [f.s, f.k, f.t, f.raw, f.price, f.reason])), `funded ≠ virtual ${cfg.cell}`);
      }
    }
  }

  // ----- V6 worker reproducibility and serialization -----
  {
    const g = (gates.V6 = gate());
    const cfgs = randomCfgs(48, 'V6', allCells.map((c) => c.id), 'fine');
    const local = cfgs.map((c) => evaluate(doors.D24, quadOf(c), c.controls, vOptions));
    const job = `pilot-stagev-workers-${Date.now()}`;

    simulations += cfgs.length;
    for (const c of cfgs) {
      const back = canonicalCfg(JSON.parse(JSON.stringify(c)) as Cfg);

      check(g, cfgId(back) === cfgId(c) && evalKeyOf('D24', back, vOptions) === evalKeyOf('D24', c, vOptions), `JSON round trip ${cfgId(c)}`);
    }

    const remote = await withLab({ job, door: 'D24', purpose: 'stage V V6 (worker reproducibility)', workers: o.workers ?? 4, memoryLog: path.join(cacheRoot, 'pilot', 'memory', `${job}.jsonl`) }, (lab) =>
      lab.evalMany(cfgs.map((c) => ({ cfg: c, options: vOptions })), 'stage V')
    );

    simulations += cfgs.length;
    cfgs.forEach((c, i) => check(g, storeEncode(remote[i]) === storeEncode(local[i]), `worker ≠ in-process ${cfgId(c)}`));
    fs.rmSync(path.join(cacheRoot, 'jobs', job), { recursive: true, force: true });
  }

  // ----- V7 module tests -----
  {
    const g = (gates.V7 = gate());
    const files = ['src/d1-risk-controls/tests', 'src/d1-risk-controls-rc2/tests', 'src/vg-l0-risk-families/tests', 'src/vg-l0-full-joint/tests'].flatMap((d) =>
      fs.existsSync(path.join(repoRoot, d)) ? fs.readdirSync(path.join(repoRoot, d)).filter((f) => f.endsWith('.test.ts')).map((f) => path.join(d, f)) : []
    );
    const r = spawnSync(process.execPath, ['--experimental-transform-types', '--disable-warning=ExperimentalWarning', '--test', ...files], { cwd: repoRoot, encoding: 'utf8' });
    const num = (k: string) => Number(new RegExp(`ℹ ${k} (\\d+)`).exec(r.stdout)?.[1] ?? NaN);

    g.files = files;
    g.tests = num('tests');
    g.pass = num('pass');
    check(g, r.status === 0 && num('fail') === 0 && num('tests') > 0, `module tests: status ${r.status}, fail ${num('fail')}`);
  }

  // ----- V8 frozen work -----
  {
    const g = (gates.V8 = gate());
    const pre = spawnSync('npm', ['run', '-s', 'research-preflight', '--', '--all'], { cwd: repoRoot, encoding: 'utf8' });

    check(g, pre.status === 0, `preflight --all exit ${pre.status}: ${pre.stdout.slice(-400)}`);
    g.preflight = pre.stdout.trim().split('\n').slice(-3);

    for (const study of ['vg-l0-risk-controls-foundation', 'vg-l0-risk-families']) {
      const seals = fs
        .readFileSync(path.join(repoRoot, 'research', study, 'results/seals.jsonl'), 'utf8')
        .trim()
        .split('\n')
        .map((l) => JSON.parse(l) as { file: string; sha256: string });

      for (const s of seals) check(g, sha256File(path.join(repoRoot, s.file)) === s.sha256, `${study} seal ${s.file}`);
      g[study] = seals.length;
    }
  }

  const failed = Object.values(gates).reduce((a, x) => a + x.failed, 0);
  const record = {
    stage: 'stage V (full joint genome engineering gates)',
    at: new Date().toISOString(),
    head: execSync('git rev-parse HEAD', { cwd: repoRoot }).toString().trim(),
    failed,
    gates,
    simulations,
    evaluationDigest: codeDigest(),
    priority3EvaluationDigest: p3EvaluationDigest(),
    seconds: Math.round((Date.now() - t0) / 1000),
    note: 'pass/fail counts and hashes only: no performance figure of a searched configuration is recorded (PROTOCOL.md §12); the incumbents’ development nets are 5B’s sealed values'
  };

  if (o.dry) console.log(JSON.stringify({ failed, gates: Object.fromEntries(Object.entries(gates).map(([k, v]) => [k, { checks: v.checks, failed: v.failed, problems: v.problems.slice(0, 5) }])) }, null, 1));
  else sealJson(parityFile, record, 'stage V');
  log(`stage V: ${failed} failed check(s) of ${Object.values(gates).reduce((a, x) => a + x.checks, 0)}; ${simulations} simulations`);
  if (failed) process.exitCode = 1;
  return record;
};

export { numericGenes };
