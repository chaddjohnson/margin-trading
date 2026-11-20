// gpu-phase5 root cause (PROTOCOL.md §4.3 H3): does the UNCHANGED canonical function portfolioPath
// (src/vg-l0-risk-metrics/metrics.ts) return a wrong path in a freshly started V8 isolate? A synthetic ledger (seeded;
// no market data, no door) of closed lots with many marks is passed to it several times per process, as a CPU
// reference worker's first tasks do. portfolioPath pushes, at each lot's exit, a point { m: before, liq: before,
// r: before } where `before` is the accumulating realized net (a variable captured by the forEach callback). The check:
// every exit point must hold the realized net as it was AT THAT EXIT (recomputed here independently); a point that
// holds a LATER value of the accumulator is the captured transient's signature.
//   node --experimental-transform-types tools/gpu-phase5/v8-alias-repro.ts --procs 24 --seconds 60 [--v8 "--no-maglev"] --out <json>
//   (child mode: --child)
import { spawn } from 'node:child_process';
import { portfolioPath } from '../../src/vg-l0-risk-metrics/metrics.ts';
import type { Ledger, LotLedger } from '../../src/vg-l0-risk-metrics/ledger.ts';
import { Rng } from '../../src/optimizer/rng.ts';
import { writeJson } from '../../src/gpu-phase5/context.ts';

const args = process.argv.slice(2);
const opt = (k: string, d: string) => (args.includes(`--${k}`) ? args[args.indexOf(`--${k}`) + 1]! : d);

if (args.includes('--child')) {
  const lots = Number(opt('lots', '35'));
  const marks = Number(opt('marks', '8500'));
  const calls = Number(opt('calls', '8'));
  const rng = new Rng([20261120, 5, 1, 7]);
  let t = 1_500_000_000;
  const L: Ledger = {
    lots: Array.from({ length: lots }, (_v, id): LotLedger => {
      const ms = Array.from({ length: marks }, () => {
        t += 60;
        const pnl = (rng.next() - 0.45) * 20000;

        return { t, date: '2020-01-01', price: 100 + rng.next(), shares: 1000, principal: 100000, interest: rng.next() * 100, realized: 0, pnl, liq: pnl - 48.1 - rng.next() };
      });

      t += 60;
      return {
        id,
        book: 'D1:VGT',
        symbol: 'VGT',
        kind: 'deep',
        principal0: 100000,
        shares0: 1000,
        entryT: ms[0]!.t,
        entryDate: '2020-01-01',
        entryRaw: 100,
        entryPrice: 100.05,
        fills: [{ t, date: '2020-01-02', raw: 100, price: 100, partial: false, shares: 1000, principal: 100000, interest: 10, proceeds: 100000, net: (rng.next() - 0.4) * 30000, reason: 'maximum hold' }],
        open: false,
        net: 0,
        interest: 10,
        costs: 96,
        canonicalMae: -1,
        marks: ms
      } as unknown as LotLedger;
    }),
    startT: 1_500_000_000,
    endT: t,
    endDate: '2020-12-31',
    costBps: 5,
    rate: 0.08,
    budget: 100000
  } as unknown as Ledger;

  for (const lot of L.lots) (lot as { net: number }).net = lot.fills.at(-1)!.net;

  // the realized net after each lot's exit, computed independently of portfolioPath
  const expect: number[] = [];
  let acc = 0;

  for (const lot of L.lots) {
    acc += lot.net;
    expect.push(acc);
  }

  const anomalies: unknown[] = [];

  for (let call = 0; call < calls && anomalies.length < 4; call++) {
    const pts = portfolioPath(L);
    let lot = 0;

    for (let j = 1; j < pts.length; j++) {
      const p = pts[j]!;

      if (p.lot !== null) continue;
      const e = expect[lot]!;

      if (!Object.is(p.m, e) || !Object.is(p.liq, e) || !Object.is(p.r, e))
        anomalies.push({ call, pointIndex: j, lot, expected: e, m: p.m, liq: p.liq, r: p.r, mIsALaterAccumulatorValue: expect.indexOf(p.m), rIsALaterAccumulatorValue: expect.indexOf(p.r), points: pts.length });
      lot++;
    }
    if (lot !== L.lots.length) anomalies.push({ call, exitPoints: lot, expectedExitPoints: L.lots.length });
  }
  process.stdout.write(`${JSON.stringify({ anomalies })}\n`);
  process.exit(0);
}

const procs = Number(opt('procs', '24'));
const until = Date.now() + Number(opt('seconds', '60')) * 1000;
const v8 = opt('v8', '').split(' ').filter(Boolean);
const out = opt('out', '');
let started = 0;
let finished = 0;
let bad = 0;
let crashed = 0;
const samples: unknown[] = [];
const one = () =>
  new Promise<void>((resolve) => {
    started++;
    const c = spawn(
      process.execPath,
      [...v8, '--experimental-transform-types', '--disable-warning=ExperimentalWarning', import.meta.filename, '--child', '--lots', opt('lots', '35'), '--marks', opt('marks', '8500'), '--calls', opt('calls', '8')],
      { stdio: ['ignore', 'pipe', 'inherit'] }
    );
    let buf = '';

    c.stdout.on('data', (d: Buffer) => (buf += d.toString()));
    c.on('exit', (code) => {
      finished++;
      try {
        const r = JSON.parse(buf.trim().split('\n').at(-1) ?? '') as { anomalies: unknown[] };

        if (code !== 0) crashed++;
        if (r.anomalies.length) {
          bad++;
          if (samples.length < 12) samples.push(r.anomalies);
        }
      } catch {
        crashed++;
      }
      resolve();
    });
  });
const lane = async () => {
  while (Date.now() < until) await one();
};

await Promise.all(Array.from({ length: procs }, lane));

const rec = {
  kind: 'gpu-phase5 V8 cold-isolate check of portfolioPath (synthetic ledger)',
  t: new Date().toISOString(),
  node: process.version,
  v8: process.versions.v8,
  v8Flags: v8,
  concurrentProcesses: procs,
  seconds: Number(opt('seconds', '60')),
  lots: Number(opt('lots', '35')),
  marksPerLot: Number(opt('marks', '8500')),
  callsPerProcess: Number(opt('calls', '8')),
  processes: finished,
  processesWithAWrongPath: bad,
  crashed,
  rate: finished ? bad / finished : null,
  samples
};

if (out) writeJson(out, rec);
console.log(JSON.stringify({ ...rec, samples: samples.slice(0, 2) }));
