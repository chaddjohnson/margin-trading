// The pooled evaluation with controls (SPECIFICATION.md §7–§9) on a synthetic two-symbol door: exact equality with
// Priority 3's `run` / `evaluate` for legacy controls (books, funding log, lots, marks, drawdowns, the record and its
// identity), per-book independence, the one funded slot shared by two independently configured D1 books and Growth
// (no double funding, the frozen same-instant order, accounting identities), and the decline gate counting a failed
// virtual trade that the pool refused (shadow lifecycle). No market data is read.
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { fixtureDoorOf } from '../../vg-d1-growth-joint/data.ts';
import { type EvalOptions, booksOf, evaluate, run } from '../../vg-d1-growth-joint/evaluate.ts';
import type { Quad } from '../../vg-d1-growth-joint/space.ts';
import { placeholder } from '../../vg-lifecycle-matched-optimization/config.ts';
import type { RiskVBook } from '../book.ts';
import type { RiskConfig } from '../config.ts';
import { booksWithControls, evaluateWithControls, runWithControls } from '../run.ts';
import { type Day, crash, grid, pathOf, whipsaw } from './scenarios.ts';

const flat = (p: number) => [p, p, p];
// GDX: the crash; VGT: the whipsaw (20 sessions each, one calendar). Both dip-buy at the same instant on 2021-03-05.
const histories = () => ({
  GDX: pathOf(crash),
  VGT: pathOf([...whipsaw, flat(89), flat(89), flat(90)] as Day[])
});
let doors = 0;
const door = () => fixtureDoorOf(`risk-controls-${++doors}`, histories()); // unique names: Priority 3's cache keys
const quad = (): Quad => ({ d1: { GDX: grid(), VGT: grid() }, g: { GDX: placeholder, VGT: placeholder }, first: 'D1' });
const V: EvalOptions = { enabled: { 'G:GDX': false } }; // New L0's structure: D1·GDX, D1·VGT, Growth·VGT
const strip = (b: unknown) => {
  const { rc: _rc, key: _key, ...rest } = b as RiskVBook;

  return rest;
};

describe('legacy controls reproduce Priority 3’s pooled evaluation exactly', () => {
  for (const [name, cfg] of Object.entries({
    absent: null,
    empty: { version: 1, books: {} } as RiskConfig,
    'explicit defaults': {
      version: 1,
      books: { 'D1:GDX': { protectiveStop: { mode: 'off' }, hold: { mode: 'legacy' } }, 'D1:VGT': { declineGate: { mode: 'off' } } }
    } as RiskConfig
  }))
    it(`${name}: books, funding log, lots, marks, drawdowns and the record`, () => {
      const d = door();
      const p3 = run(d, quad(), V, true, true);
      const x = runWithControls(d, quad(), cfg, V, true, true, { cache: false });

      assert.deepEqual(x.books.map((b) => b.book), p3.books.map((b) => b.book));
      x.books.forEach((b, i) => {
        const { rc: _rc, ...rest } = b as RiskVBook;

        assert.deepEqual(rest, p3.books[i]);
      });
      assert.deepEqual(x.result, p3.result);
      assert.ok(p3.result.lots.length >= 2 && p3.result.funding.some((f) => f.outcome === 'refused'), 'the fixture funds and refuses');

      const d2 = door();

      assert.deepEqual(evaluateWithControls(d2, quad(), cfg, V, { cache: false }).rec, evaluate(d2, quad(), V));
    });
});

describe('two independently configured D1 books and Growth in one funded slot', () => {
  const cfg: RiskConfig = {
    version: 1,
    books: {
      'D1:GDX': { protectiveStop: { mode: 'on', stopDistanceTenths: 80 } },
      'D1:VGT': { declineGate: { mode: 'on', losses: 1, recoveryTenths: 1000, maxBlockSessions: 2 } }
    }
  };

  it('controls on one book leave the other book’s virtual trades exactly as in legacy', () => {
    const d = door();
    const legacy = runWithControls(d, quad(), null, V, false, false, { cache: false }).books;
    const gdxOnly = runWithControls(d, quad(), { version: 1, books: { 'D1:GDX': cfg.books['D1:GDX'] } }, V, false, false, { cache: false }).books;
    const vgtOnly = runWithControls(d, quad(), { version: 1, books: { 'D1:VGT': cfg.books['D1:VGT'] } }, V, false, false, { cache: false }).books;
    const by = (bs: typeof legacy, id: string) => strip(bs.find((b) => b.book === id));

    assert.deepEqual(by(gdxOnly, 'D1:VGT'), by(legacy, 'D1:VGT'));
    assert.notDeepEqual(by(gdxOnly, 'D1:GDX'), by(legacy, 'D1:GDX'));
    assert.deepEqual(by(vgtOnly, 'D1:GDX'), by(legacy, 'D1:GDX'));
    assert.deepEqual(by(gdxOnly, 'G:VGT'), by(legacy, 'G:VGT'));
  });

  it('Growth books are Priority 3’s canonical books, unchanged', () => {
    const d = door();
    const ours = booksWithControls(d, quad(), cfg, V, { cache: false }).filter((b) => b.book.startsWith('G:'));
    const p3 = booksOf(d, quad(), V).filter((b) => b.book.startsWith('G:'));

    assert.deepEqual(ours, p3);
    assert.deepEqual(ours.map((b) => b.book), ['G:VGT']);
  });

  it('never funds two lots at once; every funded lot exits exactly with its virtual trade; Σ lots = net', () => {
    const { books, result } = runWithControls(door(), quad(), cfg, V, true, false, { cache: false });
    const lots = [...result.lots].sort((a, b) => a.entryT - b.entryT);

    for (let i = 1; i < lots.length; i++) {
      const prev = lots[i - 1]!;

      assert.ok(!prev.open && lots[i]!.entryT >= prev.fills.at(-1)!.t, `lot ${lots[i]!.id} overlaps lot ${prev.id}`);
    }
    for (const l of result.lots) {
      const v = books.find((b) => b.book === l.book)!.trades.find((t) => t.id === l.trade.id)!;

      assert.deepEqual(
        l.fills.map((f) => [f.s, f.k, f.t, f.raw, f.price, f.reason]),
        v.fills.map((f) => [f.s, f.k, f.t, f.raw, f.price, f.reason])
      );
    }
    assert.ok(Math.abs(result.lots.reduce((a, l) => a + l.net, 0) - result.net) < 1e-6);
    assert.ok(result.lots.some((l) => l.fills.some((f) => f.reason === 'protective stop gap')), 'a funded protective exit');
  });

  it('keeps the frozen same-instant order (D1·GDX before D1·VGT) and logs the refusal with its occupant', () => {
    const { result } = runWithControls(door(), quad(), cfg, V, true, false, { cache: false });
    const first = result.funding.filter((f) => f.t === result.funding[0]!.t);

    assert.deepEqual(
      first.map((f) => [f.book, f.outcome, f.reason, f.occupantBook]),
      [
        ['D1:GDX', 'granted', '', null],
        ['D1:VGT', 'refused', 'slot occupied', 'D1:GDX']
      ]
    );
  });

  it('the decline gate counts a failed virtual trade the pool refused (shadow lifecycle: funding never feeds back)', () => {
    const { books, result } = runWithControls(door(), quad(), cfg, V, true, false, { cache: false });
    const vgt = books.find((b) => b.book === 'D1:VGT') as RiskVBook;
    const refusedFirst = result.funding.find((f) => f.book === 'D1:VGT' && f.trade === 1)!;

    assert.equal(refusedFirst.outcome, 'refused');
    assert.ok(vgt.trades[0]!.vNet < 0, 'the refused virtual trade failed');
    assert.deepEqual([vgt.rc.events[0]!.type, vgt.rc.events[0]!.trade], ['episode start', 1]);
    assert.equal(vgt.rc.events[1]!.type, 'block engaged');
  });

  it('is deterministic across repeated runs and a serialization round trip of the configuration', () => {
    const a = JSON.stringify(evaluateWithControls(door(), quad(), cfg, V, { cache: false }));
    const b = JSON.stringify(evaluateWithControls(door(), quad(), JSON.parse(JSON.stringify(cfg)) as RiskConfig, V, { cache: false }));

    assert.equal(a.replace(/risk-controls-\d+/g, ''), b.replace(/risk-controls-\d+/g, ''));
  });

  it('identifies the evaluation by its controls (rc1 identity and key), and legacy by Priority 3’s', () => {
    const d = door();
    const x = evaluateWithControls(d, quad(), cfg, V, { cache: false });
    const l = evaluateWithControls(d, quad(), null, V, { cache: false });

    assert.match(x.rec.id, /^rc1-[0-9a-f]{16}$/);
    assert.equal(x.risk.baseId, l.rec.id);
    assert.equal(l.risk.legacy, true);
    assert.equal(l.risk.key.includes('|rc1:'), false);
    assert.equal(x.risk.key.includes('|rc1:'), true);
  });
});
