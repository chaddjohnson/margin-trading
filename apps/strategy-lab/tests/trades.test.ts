// Entry/exit pairing by tradeId + mutual linkedEventId (never by time), per symbol; trade-level net P&L only from what
// the run recorded (closed: the exit's net; open: the run's mark), unavailable otherwise; the hover placement.

import { describe, expect, it } from 'vitest';

import type { LabEvent, LabValue } from '../shared/contract.ts';
import { placementOf } from '../src/chart/link.ts';
import { buildTrades, pnlText, toneOf, tradeList } from '../src/trades.ts';

const ev = (
  over: Partial<LabEvent> & Pick<LabEvent, 'id' | 'kind' | 't'>,
  values: [string, LabValue['value'], LabValue['unit']][] = []
): LabEvent => ({
  runId: 'R-000001',
  symbol: 'VGT',
  timePrecision: 'minute',
  timeMeaning: 'x',
  price: 100,
  priceBasis: 'fill',
  reason: null,
  tradeId: null,
  linkedEventId: null,
  meta: {},
  values: values.map(([key, value, unit]) => ({ key, label: key, value, unit })),
  ...over
});
const pair = (
  symbol: string,
  tradeId: string,
  t0: string,
  t1: string,
  net: number | null,
  extra: [string, number][] = []
) => {
  const entry = `${symbol}:${tradeId}:entry`;
  const exit = `${symbol}:${tradeId}:exit`;
  return [
    ev({ id: entry, kind: 'executed_entry', t: t0, symbol, tradeId, linkedEventId: exit }, [
      ['principal', 100_000, 'usd']
    ]),
    ev({ id: exit, kind: 'executed_exit', t: t1, symbol, tradeId, linkedEventId: entry, reason: 'Trailing stop: x' }, [
      ...(net === null ? [] : [['net', net, 'usd'] as [string, number, 'usd']]),
      ...extra.map(([k, v]) => [k, v, 'percent'] as [string, number, 'percent'])
    ])
  ];
};
const trading = (unrealized: number | null) => ({
  kind: 'trading backtest',
  perSymbol: {
    VGT: { pnl: { unrealized: unrealized === null ? null : { netUsd: unrealized, markDate: '2023-12-29' } } }
  }
});

describe('buildTrades: pairing', () => {
  it('pairs an entry and its exit by tradeId and mutual linkedEventId; the same P&L for both markers', () => {
    const events = pair('VGT', 'T-1', '2020-01-02T14:30:00Z', '2020-01-12T14:31:00Z', 1234.5, [['netReturn', 1.23]]);
    const t = buildTrades(events, 'VGT', 'A', 'R-000001', trading(null)).get('T-1')!;
    expect(t.status).toBe('closed');
    expect(t.entry?.id).toBe('VGT:T-1:entry');
    expect(t.exit?.id).toBe('VGT:T-1:exit');
    expect(t.pnl).toMatchObject({ netUsd: 1234.5, percent: 1.23, unrealized: false });
    expect(toneOf(t)).toBe('profit');
    expect(pnlText(t)).toBe('+$1,234.50 (+1.23%)');
    expect(t.heldDays).toBeCloseTo(10 + 1 / 1440, 9);
    expect(t.exitReason).toBe('Trailing stop');
    expect(t.key).toBe('A:VGT:T-1');
  });

  it('never links by time: crossed or one-way links, duplicates and a missing exit are refused', () => {
    const [e1, x1] = pair('VGT', 'T-1', '2020-01-02T14:30:00Z', '2020-01-12T14:31:00Z', 10);
    const [e2, x2] = pair('VGT', 'T-2', '2020-02-02T14:30:00Z', '2020-02-12T14:31:00Z', 10);
    const crossed = buildTrades([{ ...e1!, linkedEventId: x2!.id }, x1!, e2!, x2!], 'VGT', 'A', 'R', null).get('T-1')!;
    expect(crossed.status).toBe('unlinked');
    expect(crossed.exit).toBeNull();
    expect(crossed.pnl).toBeNull();
    expect(crossed.pnlUnavailable).toMatch(/do not link/);
    const dup = buildTrades([e1!, x1!, { ...x1!, id: 'other' }], 'VGT', 'A', 'R', null).get('T-1')!;
    expect(dup.status).toBe('unlinked');
    const missing = buildTrades([e1!], 'VGT', 'A', 'R', null).get('T-1')!;
    expect(missing.status).toBe('unlinked');
    expect(missing.pnlUnavailable).toMatch(/missing/);
  });

  it('only the requested symbol: the same tradeId on another symbol is never paired with it', () => {
    const vgt = pair('VGT', 'T-1', '2020-01-02T14:30:00Z', '2020-01-12T14:31:00Z', 100);
    const gdx = pair('GDX', 'T-1', '2020-01-03T14:30:00Z', '2020-01-05T14:31:00Z', -50);
    const a = buildTrades([...vgt, ...gdx], 'VGT', 'A', 'R', null);
    const b = buildTrades([...vgt, ...gdx], 'GDX', 'A', 'R', null);
    expect(a.get('T-1')!.pnl!.netUsd).toBe(100);
    expect(b.get('T-1')!.pnl!.netUsd).toBe(-50);
    expect(b.get('T-1')!.entry!.symbol).toBe('GDX');
    expect(b.get('T-1')!.exit!.symbol).toBe('GDX');
    expect(tradeList(a).map((t) => t.symbol)).toEqual(['VGT']);
  });

  it('events without a trade id (signals, the synthetic demo’s entries) make no trade', () => {
    const demo = ev({ id: 'DEMO:e1', kind: 'executed_entry', t: '2020-01-02T21:00:00Z', symbol: 'VGT' });
    expect(buildTrades([demo], 'VGT', 'A', 'R', null).size).toBe(0);
  });
});

describe('buildTrades: P&L sources', () => {
  it('closed: the percentage is the recorded netReturn, else net ÷ the recorded principal; a loss is red', () => {
    const t = buildTrades(pair('VGT', 'T-9', '2020-01-02T14:30:00Z', '2020-01-12T14:31:00Z', -2500), 'VGT', 'A', 'R', {
      kind: 'imported trades'
    }).get('T-9')!;
    expect(t.pnl).toMatchObject({ netUsd: -2500, percent: -2.5, unrealized: false });
    expect(toneOf(t)).toBe('loss');
    expect(pnlText(t)).toBe('−$2,500.00 (−2.50%)');
  });

  it('closed without a recorded net: unavailable, never computed from prices', () => {
    const t = buildTrades(
      pair('VGT', 'T-1', '2020-01-02T14:30:00Z', '2020-01-12T14:31:00Z', null),
      'VGT',
      'A',
      'R',
      null
    ).get('T-1')!;
    expect(t.pnl).toBeNull();
    expect(t.pnlUnavailable).toMatch(/no net P&L/);
    expect(toneOf(t)).toBe('unknown');
    expect(pnlText(t)).toBeNull();
  });

  it('open (trading backtest): UNREALIZED from the run’s recorded mark; unavailable when the run has none', () => {
    const entry = ev(
      { id: 'VGT:T-5:entry', kind: 'executed_entry', t: '2023-11-03T13:30:00Z', tradeId: 'T-5', meta: { open: true } },
      [['principal', 100_000, 'usd']]
    );
    const t = buildTrades([entry], 'VGT', 'A', 'R', trading(12987.72)).get('T-5')!;
    expect(t.status).toBe('open');
    expect(t.pnl).toMatchObject({ netUsd: 12987.72, unrealized: true, markDate: '2023-12-29' });
    expect(t.pnl!.percent).toBeCloseTo(12.98772, 9);
    expect(t.exit).toBeNull();
    const none = buildTrades([entry], 'VGT', 'A', 'R', trading(null)).get('T-5')!;
    expect(none.pnl).toBeNull();
    expect(none.pnlUnavailable).toMatch(/no mark/);
    // Another symbol's mark is never used.
    expect(buildTrades([{ ...entry, symbol: 'GDX' }], 'GDX', 'A', 'R', trading(5)).get('T-5')!.pnl).toBeNull();
  });

  it('open (Study 8 import): the pool’s recorded unrealized only when it is the pool’s single open lot', () => {
    const entry = ev(
      {
        id: 'GDX:T-48:entry',
        kind: 'executed_entry',
        t: '2026-10-01T13:30:00Z',
        symbol: 'GDX',
        tradeId: 'T-48',
        meta: { open: true }
      },
      [['principal', 100_000, 'usd']]
    );
    const one = buildTrades([entry], 'GDX', 'A', 'R', {
      kind: 'imported trades',
      trades: { openLots: 1, unrealized: -812.4 }
    });
    expect(one.get('T-48')!.pnl).toMatchObject({ netUsd: -812.4, unrealized: true });
    const two = buildTrades([entry], 'GDX', 'A', 'R', {
      kind: 'imported trades',
      trades: { openLots: 2, unrealized: -812.4 }
    });
    expect(two.get('T-48')!.pnl).toBeNull();
    expect(two.get('T-48')!.pnlUnavailable).toMatch(/whole pool/);
    expect(buildTrades([entry], 'GDX', 'A', 'R', { kind: 'entry-signal outcomes' }).get('T-48')!.pnl).toBeNull();
  });
});

describe('placementOf', () => {
  const link = (t: number | null) => ({
    partnerKey: null,
    partner: t === null ? null : { t, y: 1, kind: 'executed_exit' as const },
    tone: 'profit' as const
  });
  it('says whether the counterpart is in the visible window, earlier, later, or the position is open', () => {
    expect(placementOf(link(50), [0, 100])).toBe('visible');
    expect(placementOf(link(-1), [0, 100])).toBe('before');
    expect(placementOf(link(101), [0, 100])).toBe('after');
    expect(placementOf(link(null), [0, 100])).toBe('open');
    expect(placementOf(null, [0, 100])).toBe('none');
  });
});
