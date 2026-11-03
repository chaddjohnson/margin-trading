// Stage 2 parity (PROTOCOL.md §10.2): scalar comparisons with published figures only — nothing new is persisted but
// the comparison itself. Counts must be exact, published cent figures within $0.005, whole-dollar figures within $0.50.
import os from 'node:os';
import path from 'node:path';
import fs from 'fs-extra';
import { readJson, source, study, vgtPrimaryGrid, windows } from './context.ts';
import { loadUniverse, loadedBarsHash } from './doors.ts';
import { runBooks } from './engine.ts';
import { classify } from './gate.ts';
import { fundedGateTrades, gateTradeOf, tradeRecordsOf } from './ledger.ts';
import { fixedMinuteDrawdowns } from './marks.ts';
import { observeBook, tradeDifferences } from './observer.ts';
import { sha256 } from './records.ts';
import { attributionOf, gateCheck } from './replay.ts';
import { baselineRun, standaloneRun } from './runs.ts';
import { bookOf, incumbentBooks, viewBooks, viewMembers } from './sources.ts';

export interface Check {
  name: string;
  expected: number | string | boolean;
  actual: number | string | boolean;
  tolerance: number;
  pass: boolean;
}

const checks: Check[] = [];

const check = (name: string, expected: number | string | boolean, actual: number | string | boolean, tolerance = 0) => {
  const pass =
    typeof expected === 'number' && typeof actual === 'number'
      ? Math.abs(expected - actual) <= tolerance
      : expected === actual;

  checks.push({ name, expected, actual, tolerance, pass });

  if (!pass) {
    console.error(
      `  ✖ ${name}${typeof expected === 'number' && typeof actual === 'number' ? ` (|difference| ${Math.abs(expected - actual).toFixed(4)})` : ''}`
    );
  }
};

// The seven published "unchanged D1" rows of research/portfolio-aware-d1-optimization/OPPORTUNITY_MAP.md.
const mapRows = [
  {
    symbol: 'GDX',
    trades: 36,
    busy: 17,
    clean: 8,
    displacing: 11,
    funded: 25,
    lost: 21,
    lostNet: 66126,
    gained: 3,
    delta: 3992
  },
  {
    symbol: 'XOP',
    trades: 78,
    busy: 49,
    clean: 17,
    displacing: 12,
    funded: 54,
    lost: 19,
    lostNet: 125958,
    gained: 9,
    delta: 48199
  },
  {
    symbol: 'XLE',
    trades: 32,
    busy: 25,
    clean: 1,
    displacing: 6,
    funded: 13,
    lost: 11,
    lostNet: 62419,
    gained: 8,
    delta: -42190
  },
  {
    symbol: 'EWZ',
    trades: 41,
    busy: 18,
    clean: 13,
    displacing: 10,
    funded: 28,
    lost: 26,
    lostNet: 60719,
    gained: 1,
    delta: -107571
  },
  {
    symbol: 'TLT',
    trades: 5,
    busy: 2,
    clean: 0,
    displacing: 3,
    funded: 3,
    lost: 16,
    lostNet: 21092,
    gained: 0,
    delta: -16748
  },
  {
    symbol: 'XLU',
    trades: 7,
    busy: 5,
    clean: 0,
    displacing: 2,
    funded: 4,
    lost: 5,
    lostNet: 59754,
    gained: 16,
    delta: -31591
  },
  { symbol: 'GLD', trades: 0, busy: 0, clean: 0, displacing: 0, funded: 0, lost: 0, lostNet: 0, gained: 0, delta: 0 }
];

// The map's busy test: a same-minute decision is busy whatever the symbol order (opportunity.ts:94, :222).
const mapClasses = (candidate: ReturnType<typeof gateTradeOf>[], funded: ReturnType<typeof gateTradeOf>[]) => {
  let busy = 0;
  let clean = 0;
  let displacing = 0;
  let ties = 0;

  for (const c of candidate) {
    const holder = funded.find((b) => b.decisionTime <= c.decisionTime && c.decisionTime <= b.exitTime);

    if (funded.some((b) => b.decisionTime === c.decisionTime)) {
      ties++;
    }

    if (holder) {
      busy++;
    } else if (funded.some((b) => c.decisionTime < b.decisionTime && b.decisionTime <= c.exitTime)) {
      displacing++;
    } else {
      clean++;
    }
  }

  return { busy, clean, displacing, ties };
};

export const runParity = async () => {
  checks.length = 0;

  const notes: string[] = [];
  const b4 = await incumbentBooks('B4');
  const b5 = await incumbentBooks('B5');
  const incumbents = ['VGT', 'XBI', 'XRT', 'KRE', 'GDX'];

  // ----- incumbents on T and the fold windows -----
  {
    const { loaded } = await loadUniverse([...incumbents, 'XOP', 'XLE', 'EWZ', 'TLT', 'XLU', 'GLD'], '2023-12-29', [
      'U',
      'I'
    ]);
    const u = loaded.universe;
    const t4 = baselineRun(u, 'B4', b4.phenotypes, windows.B.boundary);
    const t5 = baselineRun(u, 'B5', b5.phenotypes, windows.B.boundary);
    const eligible = t4.record.daily.filter((row) => row.index >= u.eligibilityIndex);

    check('B4 T net 5 bps', 242196.01, t4.record.summary.net, 0.005);
    check('B4 T lots', 71, t4.record.summary.lots);
    check('B4 T virtual trades', 137, t4.record.summary.virtualTrades);
    check('B4 T refused', 66, t4.record.summary.refused);
    check('B4 T sessions from 2017-06-15', 1647, eligible.length);
    check('B4 T sessions with a lot at the close', 843, eligible.filter((row) => row.openLots > 0).length);
    check('B5 T net 5 bps', 388489.26, t5.record.summary.net, 0.005);
    check('B4 window B increment', 112826.16, t4.record.summary.window!.increment, 0.005);
    check('B5 window B increment', 170997.21, t5.record.summary.window!.increment, 0.005);
    check('B4 window B minute DD (published $22,327)', 22327, t4.record.summary.window!.minuteDrawdown, 0.5);
    check('B5 window B minute DD (published $17,269)', 17269, t5.record.summary.window!.minuteDrawdown, 0.5);

    const vgt = standaloneRun(u, b4.phenotypes.VGT!, windows.B.boundary);

    check('VGT primary window B increment (published +$22,145)', 22145, vgt.summary.window!.increment, 0.5);
    check('VGT primary window B minute DD (published $17,421)', 17421, vgt.summary.window!.minuteDrawdown, 0.5);

    // observer = engine on every incumbent book over T
    for (const symbol of incumbents) {
      const phenotype = b5.phenotypes[symbol]!;
      const engine = runBooks(u, { [symbol]: phenotype }, { key: symbol, mode: 'fixed', costBps: 5 });
      const differences = tradeDifferences(observeBook(u, phenotype, { costBps: 5 }).trades, engine);

      check(`observer = engine, ${symbol} ${phenotype.name} on T`, 0, differences.length);
    }

    // the seven published U-on-B4 rows (T, 5 bps)
    const base = runBooks(u, b4.phenotypes, { key: 'B4', mode: 'fixed', costBps: 5 });
    const baseFunded = fundedGateTrades(tradeRecordsOf(u, base, 5));

    for (const row of mapRows) {
      const book = bookOf(row.symbol, 'U', { ...vgtPrimaryGrid });
      const solo = runBooks(u, { [row.symbol]: book }, { key: row.symbol, mode: 'fixed', costBps: 5 });
      const candidate = tradeRecordsOf(u, solo, 5).map(gateTradeOf);
      const map = mapClasses(candidate, baseFunded);
      const protocolClasses = classify(candidate, baseFunded);
      const scenario = runBooks(
        u,
        { ...b4.phenotypes, [row.symbol]: book },
        { key: `B4+${row.symbol}`, mode: 'fixed', costBps: 5 }
      );

      gateCheck(u, scenario, 5);

      const attribution = attributionOf(base, scenario, row.symbol, 5);
      const lost = attribution.counts.incumbentLostDirect + attribution.counts.incumbentLostCascade;
      const lostNet = -(attribution.parts.incumbentLostDirect + attribution.parts.incumbentLostCascade);

      check(`U-${row.symbol} on B4 T virtual trades`, row.trades, candidate.length);
      check(`U-${row.symbol} map busy`, row.busy, map.busy);
      check(`U-${row.symbol} map idle-clean`, row.clean, map.clean);
      check(`U-${row.symbol} map idle-displacing`, row.displacing, map.displacing);
      check(`U-${row.symbol} funded lots`, row.funded, scenario.lots.filter((lot) => lot.symbol === row.symbol).length);
      check(`U-${row.symbol} baseline lots lost`, row.lost, lost);
      check(`U-${row.symbol} baseline lots lost net`, row.lostNet, lostNet, 0.5);
      check(`U-${row.symbol} incumbent lots gained`, row.gained, attribution.counts.incumbentGained);
      check(`U-${row.symbol} Δ@5`, row.delta, attribution.delta, 0.5);
      notes.push(
        `U-${row.symbol}: protocol-convention busy/clean/displacing ${protocolClasses.filter((c) => c.class === 'busy').length}/${protocolClasses.filter((c) => c.class === 'idle-clean').length}/${protocolClasses.filter((c) => c.class === 'idle-displacing').length}; same-minute ties with B4 funded decisions ${map.ties}`
      );
    }
  }

  {
    const { loaded } = await loadUniverse(incumbents, '2021-12-31', ['P-A', 'I']);
    const u = loaded.universe;
    const a4 = baselineRun(u, 'B4', b4.phenotypes, windows.A.boundary);
    const a5 = baselineRun(u, 'B5', b5.phenotypes, windows.A.boundary);

    check('B4 whole run to 2021-12-31 (source VALIDATION)', 129369.84861239934, a4.record.summary.net, 0.005);
    check('B5 whole run to 2021-12-31 (source VALIDATION)', 217492.0441867619, a5.record.summary.net, 0.005);
    check('B4 window A increment', 62160.78, a4.record.summary.window!.increment, 0.005);
    check('B5 window A increment', 46506.24, a5.record.summary.window!.increment, 0.005);
    check('B4 window A minute DD (published $17,702)', 17702, a4.record.summary.window!.minuteDrawdown, 0.5);
    check('B5 window A minute DD (published $16,557)', 16557, a5.record.summary.window!.minuteDrawdown, 0.5);

    const vgt = standaloneRun(u, b4.phenotypes.VGT!, windows.A.boundary);

    check('VGT primary window A increment (published +$32,698)', 32698, vgt.summary.window!.increment, 0.5);
    check('VGT primary window A minute DD (published $14,894)', 14894, vgt.summary.window!.minuteDrawdown, 0.5);
  }

  // ----- every P nominee's fold V = the standalone audit's sealed fold run (5 and 10 bps) -----
  const foldRuns = (await fs.readFile(source.standaloneFoldRuns, 'utf8'))
    .split('\n')
    .filter(Boolean)
    .map(
      (line) =>
        JSON.parse(line) as {
          key: string;
          window: string;
          meta: { symbol: string };
          windowed: { increment: number; lotsEntered: number };
        }
    );

  for (const [view, fold, end, boundary] of [
    ['P-A', 'fold-a', '2021-12-31', windows.A.boundary],
    ['P-B', 'fold-b', '2023-12-29', windows.B.boundary]
  ] as const) {
    const members = viewBooks(await viewMembers(view));
    const { loaded } = await loadUniverse(
      members.map((item) => item.row.symbol),
      end,
      [view]
    );
    let compared = 0;
    let maxDifference = 0;

    for (const { row, book } of members) {
      for (const bps of [5, 10]) {
        const reference = foldRuns.find(
          (run) =>
            run.window === fold && run.meta.symbol === row.symbol && run.key.endsWith(bps === 5 ? ':5bps' : '@10bps')
        );

        if (!reference) {
          check(`${view} ${row.symbol} has a sealed fold run at ${bps} bps`, true, false);
          continue;
        }

        const run = standaloneRun(loaded.universe, book, boundary, bps);
        const difference = Math.abs(run.summary.window!.increment - reference.windowed.increment);

        compared++;
        maxDifference = Math.max(maxDifference, difference);
        check(
          `${view} ${row.symbol} fold V @${bps} bps`,
          reference.windowed.increment,
          run.summary.window!.increment,
          0.005
        );
        check(
          `${view} ${row.symbol} lots entered @${bps} bps`,
          reference.windowed.lotsEntered,
          run.trades.filter((trade) => trade.entryIndex > loaded.universe.dates.indexOf(boundary!)).length
        );
      }
    }

    notes.push(
      `${view}: ${compared} nominee fold runs compared with the standalone audit, max |ΔV| ${maxDifference.toExponential(2)}`
    );
  }

  // ----- adversarial data checks -----
  // 1. Post-cutoff mutation: a copy of VGT's and XOP's files with one bar changed after 2020-06-30 loads identically
  //    through the cutoff, and View U's trades through the cutoff are unchanged.
  {
    const temp = await fs.mkdtemp(path.join(os.tmpdir(), 'd1-complementarity-mutation-'));

    try {
      await fs.copy('data/partitions.json', path.join(temp, 'partitions.json'));

      for (const symbol of ['VGT', 'XOP']) {
        const text = await fs.readFile(`data/${symbol}/data.csv`, 'utf8');
        const lines = text.split('\n');
        const index = lines.findIndex((line) => line.startsWith('"2021-03-01T15:'));
        const fields = lines[index]!.split(',');

        fields[4] = String(Number(fields[4]) * 1.5);
        fields[2] = String(Math.max(Number(fields[2]), Number(fields[4])));
        lines[index] = fields.join(',');
        await fs.ensureDir(path.join(temp, symbol));
        await fs.writeFile(path.join(temp, symbol, 'data.csv'), lines.join('\n'));
      }

      const canonical = await loadUniverse(['VGT', 'XOP'], '2020-06-30', ['U']);
      const mutated = await loadUniverse(['VGT', 'XOP'], '2020-06-30', ['U'], temp);

      for (const symbol of ['VGT', 'XOP']) {
        check(
          `post-cutoff mutation: ${symbol} bars through 2020-06-30 unchanged`,
          loadedBarsHash(canonical.loaded, symbol),
          loadedBarsHash(mutated.loaded, symbol)
        );

        const book = bookOf(symbol, 'U', { ...vgtPrimaryGrid });
        const a = sha256(JSON.stringify(standaloneRun(canonical.loaded.universe, book).trades));
        const b = sha256(JSON.stringify(standaloneRun(mutated.loaded.universe, book).trades));

        check(`post-cutoff mutation: ${symbol} View U ledger through 2020-06-30 unchanged`, a, b);
      }
    } finally {
      await fs.remove(temp);
    }
  }

  // 2. Doors refuse a post-cap end.
  for (const [provenance, end] of [
    ['U', '2024-01-02'],
    ['P-A', '2022-01-03'],
    ['I', '2024-01-02']
  ] as const) {
    let refused = false;

    try {
      await loadUniverse(['VGT'], end, [provenance]);
    } catch (error) {
      refused = /refused/.test((error as Error).message);
    }

    check(`door refuses ${provenance} through ${end}`, true, refused);
  }

  // 3. Split adjustment: no overnight move beyond ±40% in any loaded series of the 61 (XOP's 1:4 reverse split
  //    forward-adjusted), and determinism of one ledger.
  {
    const symbols = (await readJson<{ eligible: string[] }>(source.universeFile)).eligible;
    const { loaded } = await loadUniverse(symbols, '2023-12-29', ['U']);
    const big: string[] = [];

    for (const symbol of symbols) {
      const ds = loaded.universe.instruments[symbol]!.ds;

      for (let s = 1; s < ds.sessionCount; s++) {
        const move = ds.sOpen[s]! / ds.sClose[s - 1]! - 1;

        if (Math.abs(move) > 0.4) {
          big.push(`${symbol} ${ds.dates[s]} ${(100 * move).toFixed(1)}%`);
        }
      }
    }

    check('no overnight move beyond ±40% in the 61 adjusted series', 0, big.length);
    notes.push(`overnight moves beyond ±40%: ${big.join(', ') || 'none'}`);

    const xop = loaded.universe.instruments.XOP!.ds;
    const s = xop.dates.indexOf('2020-03-30');

    check(
      'XOP 2020-03-30 open ÷ prior close within ±40% (adjusted)',
      true,
      Math.abs(xop.sOpen[s]! / xop.sClose[s - 1]! - 1) < 0.4
    );

    const book = bookOf('XOP', 'U', { ...vgtPrimaryGrid });
    const first = sha256(JSON.stringify(standaloneRun(loaded.universe, book)));
    const second = sha256(JSON.stringify(standaloneRun(loaded.universe, book)));

    check('determinism: repeated U-XOP ledger hash', first, second);

    const minute = fixedMinuteDrawdowns(
      runBooks(loaded.universe, { XOP: book }, { key: 'XOP', mode: 'fixed', costBps: 5 })
    );

    check('minute-drawdown re-derivation checked inside fixedMinuteDrawdowns', true, minute.marks > 0);
  }

  // The record keeps names, pass/fail and absolute differences only — no new value (PROTOCOL.md v2.1 §10.2).
  return {
    checks: checks.map((item) => ({
      name: item.name,
      pass: item.pass,
      tolerance: item.tolerance,
      absDifference:
        typeof item.expected === 'number' && typeof item.actual === 'number'
          ? Math.abs(item.expected - item.actual)
          : item.expected === item.actual
            ? 0
            : 'differs'
    })),
    notes,
    allPass: checks.every((item) => item.pass),
    costBps: study.costBps
  };
};
