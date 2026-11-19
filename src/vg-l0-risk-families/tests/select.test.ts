// The frozen selection rules (PROTOCOL.md §10) on synthetic evidence: the original rule is NL0's actual-profit role;
// RA1 ranks a member passing every screen ahead of any member failing one (whatever its profit), applies each screen at
// its threshold, chooses the lowest occupancy inside the 5% conservative-net band, and breaks ties deterministically;
// RA2 ranks by conservative net; unqualified members never rank; the populations; the refinement-cell rule (the legacy
// cell always, the quota, coverage of every family on every book). No market data is read.
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { Evidence } from '../qualify.ts';
import { failedScreens, originalOrder, populations, ra1Order, ra2Order, refineCells, refineQuota } from '../select.ts';
import { allCells, cellOf } from '../space.ts';

interface Opt {
  net?: number;
  dd?: number;
  robust?: number;
  p90?: number;
  ctn?: number;
  occupancy?: number;
  multiple?: number | null;
  share?: number;
  mae?: number;
  worst10?: number;
  qualified?: boolean;
  stage?: 'broad' | 'refine' | 'control';
}

const ev = (label: string, cell: string, o: Opt = {}): Evidence => {
  const net = o.net ?? 100_000;

  return {
    label,
    lane: label,
    stage: o.stage ?? 'broad',
    pick: 'profit',
    replicate: 1,
    cell,
    base: cellOf(cell).base,
    id: label,
    cfg: { cell, d1: {} as never, controls: null },
    activeInputs: 16,
    centre: { net, dd: o.dd ?? 20_000 } as never,
    risk: {
      net,
      conservativeNet: o.ctn ?? net,
      occupancy: o.occupancy ?? 0.5,
      openLot: o.multiple === undefined || o.multiple === null ? null : ({ multiple: o.multiple } as never),
      openShare: o.share ?? 0,
      mae: { worst: o.mae ?? -5_000 }
    } as never,
    select: { robust: o.robust ?? 50_000, p90Dd: o.p90 ?? 25_000, p10: 10_000 } as never,
    selectTail: { worst10Mean: o.worst10 ?? 30_000 } as never,
    qualified: o.qualified ?? true
  } as unknown as Evidence;
};

describe('the original rule (NL0 actual-profit)', () => {
  it('takes the highest centre net among the qualified; ties by selection robust, then lower DD, then label', () => {
    const order = originalOrder([
      ev('a', 'GA0.VA0', { net: 200_000, qualified: false }),
      ev('b', 'GB0.VA0', { net: 150_000, robust: 40_000 }),
      ev('c', 'GB0.VA0', { net: 150_000, robust: 60_000 }),
      ev('d', 'GA0.VA0', { net: 120_000 })
    ]);

    assert.deepEqual(order.map((e) => e.label), ['c', 'b', 'd']);
  });
});

describe('RA1, the primary risk-aware rule', () => {
  it('ranks a member passing every screen ahead of a more profitable one failing a screen', () => {
    const order = ra1Order([
      ev('rich-exposed', 'GA0.VA0', { net: 300_000, ctn: 300_000, multiple: 2.0, share: 0.5 }),
      ev('modest-clean', 'GB0.VA0', { net: 120_000, ctn: 120_000 })
    ]);

    assert.equal(order[0]!.label, 'modest-clean');
    assert.deepEqual(failedScreens(order[1]!), ['S1', 'S2']);
  });

  it('applies each screen at its threshold (inclusive), with no open lot passing S1 and S2', () => {
    assert.deepEqual(failedScreens(ev('x', 'GA0.VA0', { multiple: 1.5, share: 0.25, mae: -17_500, worst10: 35_000 })), []);
    assert.deepEqual(failedScreens(ev('y', 'GA0.VA0', { multiple: 1.5001, share: 0.2501, mae: -17_500.01, worst10: 35_000.01 })), ['S1', 'S2', 'S3', 'S4']);
    assert.deepEqual(failedScreens(ev('z', 'GA0.VA0', { multiple: null, share: 0.9 })), [], 'no open lot: S1 and S2 pass');
  });

  it('inside the 5% conservative-net band, chooses the lowest occupancy; outside it, the higher conservative net', () => {
    const order = ra1Order([
      ev('top', 'GA0.VA0', { ctn: 100_000, occupancy: 0.8 }),
      ev('in-band', 'GB0.VA0', { ctn: 96_000, occupancy: 0.4 }),
      ev('out-of-band', 'GC0.VA0', { ctn: 94_000, occupancy: 0.1 })
    ]);

    assert.deepEqual(order.map((e) => e.label), ['in-band', 'top', 'out-of-band']);
  });

  it('never ranks an unqualified member, and gives no primary without a qualified one', () => {
    assert.deepEqual(ra1Order([ev('u', 'GA0.VA0', { qualified: false })]), []);
    assert.deepEqual(ra2Order([ev('u', 'GA0.VA0', { qualified: false })]), []);
  });
});

describe('RA2 (secondary) and the populations', () => {
  it('RA2 orders by conservative net', () => {
    assert.deepEqual(
      ra2Order([ev('a', 'GA0.VA0', { net: 300_000, ctn: 100_000 }), ev('b', 'GB0.VA0', { net: 150_000, ctn: 140_000 })]).map((e) => e.label),
      ['b', 'a']
    );
  });

  it('L is the legacy cell, B the 64 base cells, F all cells', () => {
    const e = [ev('l', 'GA0.VA0'), ev('b', 'GB1.VD0'), ev('o', 'GB1e.VD0')];

    assert.deepEqual(e.filter(populations.L).map((x) => x.label), ['l']);
    assert.deepEqual(e.filter(populations.B).map((x) => x.label), ['l', 'b']);
    assert.deepEqual(e.filter(populations.F).map((x) => x.label), ['l', 'b', 'o']);
  });
});

describe('the refinement-cell rule', () => {
  it('always refines the legacy cell, respects the quota and covers every family on every book', () => {
    const evidence = allCells.flatMap((c, i) => [ev(`${c.id}#1`, c.id, { net: 100_000 + i * 1000, robust: 60_000 - i * 100, p90: 20_000 + i * 10 })]);
    const plan = refineCells(evidence);
    const cells = plan.cells.map((c) => c.cell);

    assert.ok(cells.includes('GA0.VA0'));
    assert.ok(cells.length <= refineQuota + 1);
    for (const s of ['GDX', 'VGT'] as const)
      for (const f of ['A', 'B', 'C', 'D'] as const) assert.ok(cells.some((c) => cellOf(c)[s].family === f), `${s} ${f}`);
    assert.ok(cells.some((c) => cellOf(c).GDX.entryDay || cellOf(c).VGT.entryDay));
    assert.ok(plan.cells.every((c) => c.seeds.length > 0 && c.focus.length > 0));
  });

  it('seeds the legacy cell from its shortlist when it has no qualified member', () => {
    const plan = refineCells([ev('legacy#1', 'GA0.VA0', { qualified: false }), ev('b#1', 'GB0.VA0')]);
    const legacy = plan.cells.find((c) => c.cell === 'GA0.VA0')!;

    assert.deepEqual(legacy.seeds, ['legacy#1']);
  });
});
