// Stage V — the RC 2 engineering gates on real data (PROTOCOL.md §12), before any search. Records pass/fail counts and
// hashes only: NO performance figure of a non-default control is computed into the record (the foundation's AD7 rule,
// kept until the protocol freeze). A failed gate stops every dependent stage.
//   V0 isolation: only src/d1-risk-controls-rc2/** and src/vg-l0-risk-families/** changed under src/apps/config since
//      the foundation (26014af1); research/ changes only in this study; RC 1's engine files equal the foundation's freeze;
//      Priority 3's, 5B's and the shadow study's evaluation digests equal their sealed values.
//   V1 the frozen New L0 under legacy defaults through RC 2's runner = Priority 3's engine (books, lots, funding, every
//      minute-mark change, drawdowns, the record) on FULL (AD3) and D19–D24; FULL = $479,605.18 / $20,385.99 / 46 lots and
//      the foundation's sealed trade-list, funding and mark hashes; D24 = $382,721.46 / $19,459.83 / 34 lots.
//   V2 random D1 pairs (New L0's Growth) under legacy defaults: RC 2 = Priority 3 (D21, D24).
//   V3 random RC 1 configurations (every base structure; next-session activation): RC 2 = RC 1 (books with their logs,
//      the result with its marks) on D21 and D24.
//   V4 random configurations with ≥ 1 entry-day book (every family, the gate): determinism; causality (D21 vs D24);
//      accounting; every entry-day exit re-derived independently from the bars (the first eligible post-fill observation;
//      same session; reason; fill at L or at a minute open ≤ L); no missed entry-day trigger; protective nets < 0;
//      no other exit on an entry session.
//   V5 module tests (RC 1, RC 2, this study) pass.
//   V6 frozen work: the research preflight of every study; the foundation's sealed records verify.
import { execSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { isDeepStrictEqual } from 'node:util';
import { createHash } from 'node:crypto';
import { codeDigest as p5bDigest } from '../vg-lifecycle-matched-optimization/lab.ts';
import { codeDigest as shadowDigest } from '../vg-l0-shadow-eligibility/lab.ts';
import { type EvalOptions, evaluate as p3Evaluate, recordOf, run as p3Run } from '../vg-d1-growth-joint/evaluate.ts';
import { type Door, openPrefixDoor } from '../vg-d1-growth-joint/data.ts';
import type { PoolResult } from '../vg-d1-growth-joint/pool.ts';
import { Rng } from '../optimizer/rng.ts';
import { runWithControls } from '../d1-risk-controls/run.ts';
import { toRc1 } from '../d1-risk-controls-rc2/config.ts';
import { evaluateWithControls2, runWithControls2 } from '../d1-risk-controls-rc2/run.ts';
import type { RiskVBook2 } from '../d1-risk-controls-rc2/book.ts';
import { entryDayTrigger } from '../d1-risk-controls-rc2/exit.ts';
import { log, r2, repoRoot, resultsDir, seedOf } from './context.ts';
import { openFullForBaseline } from './doors.ts';
import { codeDigest, p3EvaluationDigest } from './lab.ts';
import { newL0, vOptions } from './nl0.ts';
import { logDoor, readJson, sealJson, sha256File } from './records.ts';
import { type Cell, type Cfg, allCells, baseCells, decode, levels, nGenes, quadOf } from './space.ts';

export const parityFile = path.join(resultsDir, 'parity', 'parity.json');
const foundationBase = '26014af179cab39436a385862946c7f843e04eac';
const sealedDigests = {
  priority3: '147cad7c17eff3fa50442d2cb0ffb9c22cb7ba5091a46d1e14d3351d5cff4e88',
  p5b: '3f902532b651da1939f67d650d381bcf1e27ad3b76b3f2dedef95403fba23e3b',
  shadow: '54304b69941e0481d5d36d52c30e76e724596dadd803c6e41489a3633e8c878e'
};
const foundationG1 = {
  file: 'research/vg-l0-risk-controls-foundation/results/gates/g1-g3-new-l0.json',
  sha256: 'b05b5c784fb1e82f20a48da127f09bc8d8df29c8f2bac4191494e6c840699179'
};
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

// legacy: RC 2 (null controls) against Priority 3 — books, the result (marks included) and the record
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

const randomGenome = (rng: Rng) => Array.from({ length: nGenes }, (_v, i) => rng.int(levels[i]!));
const randomCfgs = (n: number, label: string, cells: readonly Cell[]): Cfg[] => {
  const rng = Rng.from(...seedOf('parity', label));

  return Array.from({ length: n }, (_v, i) => decode(randomGenome(rng), cells[i % cells.length]!));
};

export const runParity = async (o: { dry?: boolean } = {}) => {
  if (!o.dry && fs.existsSync(parityFile)) throw new Error('stage V is sealed');

  const t0 = Date.now();
  const gates: Record<string, Gate> = {};
  let simulations = 0;

  // ----- V0 isolation -----
  {
    const g = (gates.V0 = gate());
    const changed = execSync(`git diff --name-only ${foundationBase} -- src apps config`, { cwd: repoRoot }).toString().trim().split('\n').filter(Boolean);
    const untracked = execSync('git ls-files --others --exclude-standard -- src apps config', { cwd: repoRoot }).toString().trim().split('\n').filter(Boolean);
    const research = execSync(`git diff --name-only ${foundationBase} -- research`, { cwd: repoRoot }).toString().trim().split('\n').filter(Boolean);
    const allowed = (f: string) => f.startsWith('src/d1-risk-controls-rc2/') || f.startsWith('src/vg-l0-risk-families/');

    for (const f of [...changed, ...untracked]) check(g, allowed(f), `changed outside the allowed modules: ${f}`);
    for (const f of research) check(g, f.startsWith('research/vg-l0-risk-families/'), `research change outside this study: ${f}`);

    const freeze = readJson<{ code: Record<string, string> }>(path.join(repoRoot, 'research/vg-l0-risk-controls-foundation/results/protocol-freeze.json'));

    for (const f of ['src/d1-risk-controls/book.ts', 'src/d1-risk-controls/config.ts', 'src/d1-risk-controls/exit.ts', 'src/d1-risk-controls/run.ts'])
      check(g, sha256File(path.join(repoRoot, f)) === freeze.code[f], `RC 1 file changed: ${f}`);

    const digests = { priority3: p3EvaluationDigest(), p5b: p5bDigest(), shadow: shadowDigest() };

    for (const [k, v] of Object.entries(digests)) check(g, v === sealedDigests[k as keyof typeof sealedDigests], `${k} evaluation digest ${v}`);
    g.digests = digests;
    g.changed = [...changed, ...untracked];
  }

  // ----- V1 New L0 legacy: FULL (AD3) and the prefix doors -----
  const nl0Cfg: Cfg = { cell: 'GA0.VA0', d1: newL0().quad.d1, controls: null };

  {
    const g = (gates.V1 = gate());
    const sealed = readJson<{ G1: { headline: Record<string, unknown>; tradeListSha256: string; fundingSha256: string; markChangesSha256: string; counts: Record<string, unknown> } }>(
      path.join(repoRoot, foundationG1.file)
    );

    check(g, sha256File(path.join(repoRoot, foundationG1.file)) === foundationG1.sha256, 'the foundation G1–G3 record is not its sealed file');

    const searches = fs.existsSync(path.join(resultsDir, 'search'));
    const full = await openFullForBaseline('stage V: New L0 legacy reproduction (V1)', searches);
    const oFull: EvalOptions = { ...vOptions, boundaries: ['2024-12-31'] };
    const c = legacyEqual(full, nl0Cfg, oFull);
    const rec = recordOf(full, quadOf(nl0Cfg), c.ref, oFull);

    simulations += 3;
    check(g, c.books && c.result && c.record, 'FULL: RC 2 legacy differs from Priority 3');
    check(g, r2(rec.net) === 479605.18 && r2(rec.dd) === 20385.99 && rec.lots === 46, `FULL headline ${rec.net} / ${rec.dd} / ${rec.lots}`);
    check(g, rec.periods[0]!.after.toFixed(2) === '96883.72' && rec.periods[0]!.dd.toFixed(2) === '20385.99', 'FULL validation period');
    check(g, sha(JSON.stringify(c.ref.result.lots.map((l, i) => ledgerRow(full, l, i)))) === sealed.G1.tradeListSha256, 'FULL trade list ≠ the foundation’s sealed list');
    check(g, sha(JSON.stringify(c.ref.result.funding)) === sealed.G1.fundingSha256, 'FULL funding log ≠ sealed');
    check(g, sha(JSON.stringify(c.ref.result.markChanges)) === sealed.G1.markChangesSha256, 'FULL minute marks ≠ sealed');
    g.full = { net: rec.net, dd: rec.dd, lots: rec.lots, validationPnl: rec.periods[0]!.after, resetDd: rec.periods[0]!.dd, signature: rec.signature, fundingDecisions: c.ref.result.funding.length, markChanges: c.ref.result.markChanges!.t.length };

    for (const d of ['D19', 'D21', 'D23', 'D24'] as const) {
      const door = await openPrefixDoor(d, `stage V: New L0 legacy parity on ${d}`, true);

      logDoor(d, 'stage V V1–V4 (pass/fail only)', { sha256: { GDX: door.sym.GDX.dataSha256, VGT: door.sym.VGT.dataSha256 } });

      const x = legacyEqual(door, nl0Cfg, vOptions);
      const r = recordOf(door, quadOf(nl0Cfg), x.ref, vOptions);

      simulations += 3;
      check(g, x.books && x.result && x.record, `${d}: RC 2 legacy differs from Priority 3`);
      if (d === 'D24') check(g, r2(r.net) === 382721.46 && r2(r.dd) === 19459.83 && r.lots === 34, `D24 headline ${r.net} / ${r.dd} / ${r.lots}`);
      (g[d] = { net: r.net, dd: r.dd, lots: r.lots, signature: r.signature });
    }
  }

  const doors = { D21: await openPrefixDoor('D21', 'stage V V2–V4', true), D24: await openPrefixDoor('D24', 'stage V V2–V4', true) };

  // ----- V2 random D1 pairs under legacy defaults -----
  {
    const g = (gates.V2 = gate());

    for (const cfg of randomCfgs(40, 'V2', [allCells.find((c) => c.id === 'GA0.VA0')!]))
      for (const [d, door] of Object.entries(doors)) {
        const x = legacyEqual(door, cfg, vOptions);

        simulations += 3;
        check(g, x.books && x.result && x.record, `${d} ${JSON.stringify(cfg.d1)}`);
      }
  }

  // ----- V3 random RC 1 configurations: RC 2 = RC 1 -----
  {
    const g = (gates.V3 = gate());
    let protective = 0;

    for (const cfg of randomCfgs(64, 'V3', baseCells))
      for (const [d, door] of Object.entries(doors)) {
        const q = quadOf(cfg);
        const a = runWithControls2(door, q, cfg.controls, vOptions, true, true, { cache: false });
        const b = runWithControls(door, q, toRc1(cfg.controls), vOptions, true, true, { cache: false });

        simulations += 2;
        protective += a.books.reduce((n, bk) => n + ((bk as unknown as RiskVBook2).rc?.summary.protectiveExits ?? 0), 0);
        check(g, isDeepStrictEqual(a.books, b.books) && isDeepStrictEqual(a.result, b.result), `${d} ${cfg.cell}`);
      }
    g.protectiveExitsSeen = protective;
  }

  // ----- V4 entry-day invariants -----
  {
    const g = (gates.V4 = gate());
    const onset = allCells.filter((c) => !c.base);
    const counts = { configurations: 0, entryDayExits: 0, fillMinute: 0, laterMinuteLow: 0, minuteOpen: 0, prefillLowsIgnored: 0, survivedEntryDay: 0, closingPrintEntries: 0 };

    for (const cfg of randomCfgs(132, 'V4', onset)) {
      counts.configurations++;

      const q = quadOf(cfg);
      const run24 = () => runWithControls2(doors.D24, q, cfg.controls, vOptions, true, false, { cache: false });
      const a = run24();
      const b = run24();
      const c21 = runWithControls2(doors.D21, q, cfg.controls, vOptions, true, false, { cache: false });

      simulations += 3;
      check(g, JSON.stringify(a) === JSON.stringify(b), `determinism ${cfg.cell}`);

      // causality: every virtual trade closed (no open remainder) by D21's end is identical on D21 and D24
      const end21 = doors.D21.sym.VGT.ds.sCloseTime[doors.D21.sessions - 1]!;

      for (const bk of a.books) {
        const short = c21.books.find((x) => x.book === bk.book)!;
        const closed = (ts: typeof bk.trades) => ts.filter((t) => !t.open && t.fills.length && t.fills.at(-1)!.t <= end21);

        check(g, isDeepStrictEqual(closed(bk.trades), closed(short.trades)), `causality ${cfg.cell} ${bk.book}`);
      }

      // accounting
      const lots = [...a.result.lots].sort((x, y) => x.entryT - y.entryT);

      check(g, Math.abs(a.result.lots.reduce((s, l) => s + l.net, 0) - a.result.net) < 1e-6, `Σ lots ≠ net ${cfg.cell}`);
      for (let i = 1; i < lots.length; i++) check(g, !lots[i - 1]!.open && lots[i]!.entryT >= lots[i - 1]!.fills.at(-1)!.t, `overlap ${cfg.cell}`);
      for (const l of a.result.lots) {
        const v = a.books.find((bk) => bk.book === l.book)!.trades.find((t) => t.id === l.trade.id)!;

        check(g, isDeepStrictEqual(l.fills.map((f) => [f.s, f.k, f.t, f.raw, f.price, f.reason]), v.fills.map((f) => [f.s, f.k, f.t, f.raw, f.price, f.reason])), `funded ≠ virtual ${cfg.cell}`);
      }

      // entry-day exits re-derived from the bars
      for (const bk of a.books) {
        if (!bk.book.startsWith('D1:')) continue;

        const rc = (bk as unknown as RiskVBook2).rc;
        const sym = bk.book.slice(3) as 'GDX' | 'VGT';
        const ds = doors.D24.sym[sym].ds;
        const entryDay = cfg.controls?.books[bk.book as 'D1:GDX']?.protectiveStop?.mode === 'on' && (cfg.controls.books[bk.book as 'D1:GDX']!.protectiveStop as { activation?: string }).activation === 'entry-day';

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

  // ----- V5 module tests -----
  {
    const g = (gates.V5 = gate());
    const files = ['src/d1-risk-controls/tests', 'src/d1-risk-controls-rc2/tests', 'src/vg-l0-risk-families/tests'].flatMap((d) =>
      fs.existsSync(path.join(repoRoot, d)) ? fs.readdirSync(path.join(repoRoot, d)).filter((f) => f.endsWith('.test.ts')).map((f) => path.join(d, f)) : []
    );
    const r = spawnSync(process.execPath, ['--experimental-transform-types', '--disable-warning=ExperimentalWarning', '--test', ...files], { cwd: repoRoot, encoding: 'utf8' });
    const num = (k: string) => Number(new RegExp(`ℹ ${k} (\\d+)`).exec(r.stdout)?.[1] ?? NaN);

    g.files = files;
    g.tests = num('tests');
    g.pass = num('pass');
    check(g, r.status === 0 && num('fail') === 0 && num('tests') > 0, `module tests: status ${r.status}, fail ${num('fail')}`);
  }

  // ----- V6 frozen work -----
  {
    const g = (gates.V6 = gate());
    const pre = spawnSync('npm', ['run', '-s', 'research-preflight', '--', '--all'], { cwd: repoRoot, encoding: 'utf8' });

    check(g, pre.status === 0, `preflight --all exit ${pre.status}: ${pre.stdout.slice(-400)}`);
    g.preflight = pre.stdout.trim().split('\n').slice(-3);

    const seals = fs
      .readFileSync(path.join(repoRoot, 'research/vg-l0-risk-controls-foundation/results/seals.jsonl'), 'utf8')
      .trim()
      .split('\n')
      .map((l) => JSON.parse(l) as { file: string; sha256: string });

    for (const s of seals) check(g, sha256File(path.join(repoRoot, s.file)) === s.sha256, `foundation seal ${s.file}`);
    g.foundationSeals = seals.length;
  }

  const failed = Object.values(gates).reduce((a, x) => a + x.failed, 0);
  const record = {
    stage: 'stage V (RC 2 engineering gates)',
    at: new Date().toISOString(),
    head: execSync('git rev-parse HEAD', { cwd: repoRoot }).toString().trim(),
    failed,
    gates,
    simulations,
    evaluationDigest: codeDigest(),
    priority3EvaluationDigest: p3EvaluationDigest(),
    seconds: Math.round((Date.now() - t0) / 1000),
    note: 'pass/fail counts and hashes only: no performance figure of a non-default control is recorded (PROTOCOL.md §12)'
  };

  if (o.dry) console.log(JSON.stringify({ failed, gates: Object.fromEntries(Object.entries(gates).map(([k, v]) => [k, { checks: v.checks, failed: v.failed, problems: v.problems.slice(0, 5) }])) }, null, 1));
  else sealJson(parityFile, record, 'stage V');
  log(`stage V: ${failed} failed check(s) of ${Object.values(gates).reduce((a, x) => a + x.checks, 0)}; ${simulations} simulations`);
  if (failed) process.exitCode = 1;
  return record;
};
