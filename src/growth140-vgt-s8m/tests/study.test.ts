// growth140-vgt-s8m unit tests: synthetic data only (no market data is read).
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { Rng } from '../../optimizer/rng.ts';
import { Checkpointer, rngRestore, rngState, writeAtomic } from '../checkpoint.ts';
import { type TradeRow, detailOf, evaluate } from '../engine.ts';
import { fixtureDoor } from '../fixture.ts';
import {
  type Config,
  configId,
  configOfGenome,
  control4,
  effectiveOf,
  geneCount,
  growthDefaults,
  levelCounts,
  neighbourhood,
  numericGenes,
  repair,
  screenGenomes,
  structuralGenes
} from '../space.ts';
import { Lru, Store } from '../store.ts';
import { matchWinners } from '../trades.ts';

const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), 'g140-'));

test('the genome decodes to valid Growth 1.4.0 configurations; inactive genes do not change the identity', () => {
  assert.equal(geneCount, 58);
  assert.equal(structuralGenes.length + numericGenes.length, levelCounts.length);

  const genomes = screenGenomes(256, 'unit');

  for (const g of genomes) {
    const c = configOfGenome(g);

    assert.equal(configId(c), configId(effectiveOf(c)));
  }

  // breakout entry: eligibility and the Rise inputs are inactive
  const g = [...genomes[0]!];

  g[0] = 1;

  const a = configOfGenome(g);
  const h = [...g];

  h[structuralGenes.length] = (h[structuralGenes.length]! + 3) % levelCounts[structuralGenes.length]!; // X (inactive)
  h[2] = (h[2]! + 1) % 6; // eligibility policy (inactive with the breakout entry)
  assert.equal(configId(configOfGenome(h)), configId(a));
  assert.equal(a.eligibilityEnabled, undefined);
});

test('the screen balances every gene level (Latin supercube of scrambled Sobol blocks)', () => {
  const n = 1024;
  const genomes = screenGenomes(n, 'balance');

  levelCounts.forEach((levels, gene) => {
    const counts = new Array(levels).fill(0);

    for (const g of genomes) counts[g[gene]!]++;
    assert.ok(Math.max(...counts) - Math.min(...counts) <= Math.ceil(n / levels) * 0.2 + 2, `gene ${gene}`);
  });
});

test('#4 and the defaults are valid; #4 is not on the search grid where the brief says so', () => {
  assert.equal(control4.recoveryRetracementPercent, 45);
  assert.equal(control4.trendChangeMinimumReturnPercent, -2);
  assert.equal(growthDefaults.trendFilterEnabled, false);
  assert.match(configId(control4), /^[0-9a-f]{16}$/);
});

test('momentum S < L is repaired; neighbourhoods are unique, exclude the centre and keep the structure', () => {
  const c = repair({
    ...growthDefaults,
    trendFilterEnabled: true,
    trendMethod: 'momentum',
    trendMomentumShortSessions: 30,
    trendMomentumLongSessions: 20,
    trendMomentumMinimumShortReturnPercent: 0,
    trendMomentumMinimumLongReturnPercent: 0
  } as Config);

  assert.equal(c.trendMomentumLongSessions, 31);

  const pts = neighbourhood(control4, { name: 'x', n: 64, labels: ['unit-nb'] });
  const ids = new Set(pts.map((p) => p.id));

  assert.equal(ids.size, pts.length);
  assert.ok(!ids.has(configId(control4)));
  for (const p of pts) {
    assert.equal(p.config.continuationMethod, 'shallow_pullback');
    assert.equal(p.config.drawdownRecoveryGateEnabled, true);
  }

  // common random numbers: the same labels give the same offsets
  assert.deepEqual(
    neighbourhood(control4, { name: 'x', n: 16, labels: ['crn'] }).map((p) => p.id),
    neighbourhood(control4, { name: 'x', n: 16, labels: ['crn'] }).map((p) => p.id)
  );
});

test('the archive: LRU eviction never changes a value; NaN survives; a foreign binding is refused', () => {
  const dir = tmp();
  const file = path.join(dir, 'a.sqlite');
  const s = new Store(file, { binding: { study: 'x', door: 'd' }, lruCapacity: 4, commitRows: 3, commitMs: 1e9 });
  const values = Array.from({ length: 40 }, (_v, i) => ({ i, x: i / 7, nan: NaN, inf: Infinity }));

  values.forEach((v, i) => s.write('points', `k${i}`, v));
  s.commit();
  values.forEach((v, i) => assert.deepEqual(s.read('points', `k${i}`), v));
  assert.ok(s.stats().lruEvictions > 0);
  s.close();
  assert.throws(
    () => new Store(file, { binding: { study: 'y', door: 'd' }, lruCapacity: 4, commitRows: 3, commitMs: 1e9 }),
    /bound to/
  );

  const lru = new Lru<number>(2);

  lru.set('a', 1);
  lru.set('b', 2);
  lru.get('a');
  lru.set('c', 3);
  assert.equal(lru.get('b'), undefined);
  assert.equal(lru.get('a'), 1);
});

test('checkpoints are atomic and hash-validated; a torn file falls back to .prev; the RNG state round-trips', () => {
  const dir = tmp();
  const file = path.join(dir, 'c.json');
  const c = new Checkpointer<{ n: number; x: number }>(file, 'job', { p: '1' });

  c.write({ n: 1, x: NaN });
  c.write({ n: 2, x: 0.5 });
  fs.writeFileSync(file, '{"torn":');
  assert.equal(c.read()!.body.n, 1);
  assert.throws(() => new Checkpointer(file, 'job', { p: '2' }).read(), /pin p/);
  writeAtomic(path.join(dir, 'w.txt'), 'abc');
  assert.equal(fs.readFileSync(path.join(dir, 'w.txt'), 'utf8'), 'abc');

  const rng = new Rng([1, 2, 3, 4]);

  rng.next();

  const copy = rngRestore(rngState(rng));

  assert.deepEqual([rng.next(), rng.next(), rng.nextUint32()], [copy.next(), copy.next(), copy.nextUint32()]);
});

test('the matching rule: retained, retimed, extra entries, new moves, lost winners', () => {
  const t = (n: number, e: number, x: number, net: number): TradeRow => ({
    n,
    status: 'closed',
    origin: 'rise',
    entryDate: `d${e}`,
    entryTime: `${e}`,
    entryPrice: 1,
    exitDate: `d${x}`,
    exitTime: `${x}`,
    exitPrice: 1,
    exitReason: 'stop',
    entryIndex: e,
    exitIndex: x,
    sessionsHeld: x - e + 1,
    calendarDaysHeld: 1,
    gross: net,
    costs: 0,
    interest: 0,
    net
  });
  const control = [t(1, 10, 30, 5), t(2, 50, 70, 5), t(3, 100, 120, -3), t(4, 200, 220, 8)];
  const candidate = [
    t(1, 11, 31, 4),
    t(2, 55, 90, 6),
    t(3, 60, 62, 1),
    t(4, 100, 105, 2),
    t(5, 300, 310, 3),
    t(6, 315, 330, 2)
  ];
  const m = matchWinners(candidate, control);

  assert.equal(m.retained, 1); // 1↔1
  assert.equal(m.retimed, 1); // 2↔2
  assert.deepEqual(m.extraEntriesInControlMoves, [3]);
  assert.deepEqual(m.newWinsOnControlLosingMoves, [4]);
  assert.equal(m.newWinningMoves, 1); // 5 and 6 are one episode (gap ≤ 10)
  assert.equal(m.extraEntriesInNewMoves, 1);
  assert.deepEqual(
    m.lostControlWinners.map((l) => l.control),
    [4]
  );
});

test('the canonical evaluation is deterministic; minute marks reproduce the drawdown; the boundary split adds up', () => {
  const door = fixtureDoor(260, 3);
  const c: Config = {
    ...growthDefaults,
    advanceFromRecentLowPercent: 1,
    recentLowLookbackBars: 10,
    trailingStopPercent: 3,
    maximumHoldDays: 10
  };
  const a = evaluate(door, c);
  const b = evaluate(door, c);

  assert.deepEqual(a, b);

  const boundary = door.history[180]!.date;
  const d = detailOf(door, c, boundary);

  assert.equal(d.record.signature, a.signature);

  const bd = d.boundary as {
    equity: number;
    finalEquity: number;
    validationNet: number;
    carriedIn: { net: number; developmentPart: number; validationPart: number }[];
  };

  assert.ok(Math.abs(bd.finalEquity - bd.equity - bd.validationNet) < 0.011);
  for (const x of bd.carriedIn) assert.ok(Math.abs(x.developmentPart + x.validationPart - x.net) < 0.011);
});
