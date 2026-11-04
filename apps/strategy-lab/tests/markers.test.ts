// Marker colours: an executed entry and its exit take their trade's outcome from the RECORDED net P&L (after costs and
// interest) — green profit, red loss, grey breakeven — an open position is blue whatever its unrealized P&L, a trade
// without a recorded P&L amber; rejected signals are purple; raw signals hollow; shapes unchanged; run B haloed.

import { describe, expect, it } from 'vitest';

import type { LabEvent } from '../shared/contract.ts';
import { glyphSvg, legendToneOf, markerToneOf, ROLE_COLOR, TONE_COLOR, type MarkerTone } from '../src/chart/markers.ts';
import { buildTrades, toneOf } from '../src/trades.ts';

const ev = (o: Partial<LabEvent> & Pick<LabEvent, 'id' | 'kind' | 't'>, values: LabEvent['values'] = []): LabEvent => ({
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
  values,
  ...o
});
/** A closed trade entered at `entryPrice`, left at `exitPrice`, with a recorded net. */
const closed = (net: number, entryPrice = 100, exitPrice = 101) => {
  const t = buildTrades(
    [
      ev(
        {
          id: 'e',
          kind: 'executed_entry',
          t: '2020-01-02T14:30:00Z',
          price: entryPrice,
          tradeId: 'T-1',
          linkedEventId: 'x'
        },
        [{ key: 'principal', label: 'p', value: 100_000, unit: 'usd' }]
      ),
      ev(
        {
          id: 'x',
          kind: 'executed_exit',
          t: '2020-01-10T14:31:00Z',
          price: exitPrice,
          tradeId: 'T-1',
          linkedEventId: 'e'
        },
        [{ key: 'net', label: 'n', value: net, unit: 'usd' }]
      )
    ],
    'VGT',
    'A',
    'R',
    null
  ).get('T-1')!;
  return t;
};
const open = (unrealized: number) =>
  buildTrades(
    [ev({ id: 'e', kind: 'executed_entry', t: '2020-01-02T14:30:00Z', tradeId: 'T-2', meta: { open: true } })],
    'VGT',
    'A',
    'R',
    {
      kind: 'trading backtest',
      perSymbol: { VGT: { pnl: { unrealized: { netUsd: unrealized, markDate: '2020-02-01' } } } }
    }
  ).get('T-2')!;

describe('marker tone of each case', () => {
  it('profitable trades: entry and exit both green', () => {
    const t = closed(812.5);
    expect(markerToneOf('executed_entry', t)).toBe('profit');
    expect(markerToneOf('executed_exit', t)).toBe('profit');
  });

  it('losing trades: both red — from the recorded net, even when the exit price is above the entry price', () => {
    const t = closed(-42.1, 100, 100.3); // a price gain eaten by costs and interest
    expect(markerToneOf('executed_entry', t)).toBe('loss');
    expect(markerToneOf('executed_exit', t)).toBe('loss');
    expect(markerToneOf('executed_exit', closed(5, 100, 99))).toBe('profit'); // and the reverse
  });

  it('breakeven (net exactly $0): grey', () => {
    expect(markerToneOf('executed_entry', closed(0))).toBe('flat');
    expect(markerToneOf('executed_exit', closed(0))).toBe('flat');
  });

  it('open positions: blue, never judged on unrealized P&L (positive or negative)', () => {
    expect(markerToneOf('executed_entry', open(12_987.72))).toBe('open');
    expect(markerToneOf('executed_entry', open(-3_000))).toBe('open');
    expect(toneOf(open(12_987.72))).toBe('open'); // the P&L text, connector and summary use the same tone
  });

  it('rejected signals: purple whatever the reason; raw signals: their own hollow style', () => {
    expect(markerToneOf('rejected_signal', null)).toBe('rejected');
    expect(markerToneOf('rejected_signal', closed(100))).toBe('rejected');
    expect(markerToneOf('entry_signal', null)).toBe('signal');
    expect(markerToneOf('entry_signal', closed(-100))).toBe('signal');
  });

  it('an executed event without a recorded trade or net: amber "not recorded", never grey breakeven', () => {
    expect(markerToneOf('executed_entry', null)).toBe('unknown');
    const noNet = buildTrades(
      [
        ev({ id: 'e', kind: 'executed_entry', t: '2020-01-02T14:30:00Z', tradeId: 'T-1', linkedEventId: 'x' }),
        ev({ id: 'x', kind: 'executed_exit', t: '2020-01-10T14:31:00Z', tradeId: 'T-1', linkedEventId: 'e' })
      ],
      'VGT',
      'A',
      'R',
      null
    ).get('T-1')!;
    expect(markerToneOf('executed_exit', noNet)).toBe('unknown');
  });
});

describe('glyphs', () => {
  const tones: MarkerTone[] = ['profit', 'loss', 'flat', 'open', 'unknown', 'rejected', 'signal', 'shape'];
  it('use one distinct colour per tone', () => {
    expect(new Set(tones.map((t) => TONE_COLOR[t])).size).toBe(tones.length);
    expect(TONE_COLOR).toMatchObject({
      profit: '#4cc38a',
      loss: '#f07070',
      flat: '#94a3b8',
      open: '#38bdf8',
      rejected: '#a78bfa'
    });
  });

  it('fill executed shapes with the tone, keep entry ▲ and exit ▼ shapes, keep raw signals hollow', () => {
    const entry = glyphSvg('executed_entry', 'A', 'profit');
    const exit = glyphSvg('executed_exit', 'A', 'loss');
    expect(entry).toContain(`fill="${TONE_COLOR.profit}"`);
    expect(exit).toContain(`fill="${TONE_COLOR.loss}"`);
    expect(entry).toMatch(/points="7,1 13,12.5 1,12.5"/); // apex up
    expect(exit).toMatch(/points="1,1.5 13,1.5 7,13"/); // apex down
    const signal = glyphSvg('entry_signal', 'A', 'signal');
    expect(signal).toContain(`stroke="${TONE_COLOR.signal}"`);
    expect(signal).toContain('fill="#0b1220"'); // hollow
    const rejected = glyphSvg('rejected_signal', 'A', 'rejected');
    expect(rejected).toContain(`stroke="${TONE_COLOR.rejected}"`);
    expect(rejected).toContain('<line');
  });

  it('mark run B with an orange halo, run A without', () => {
    expect(glyphSvg('executed_entry', 'B', 'open')).toContain(`stroke="${ROLE_COLOR.B}"`);
    expect(glyphSvg('executed_entry', 'A', 'open')).not.toContain(ROLE_COLOR.B);
  });

  it('the legend shows executed shapes without an outcome, signals and rejections in their own colours', () => {
    expect(legendToneOf('executed_entry')).toBe('shape');
    expect(legendToneOf('executed_exit')).toBe('shape');
    expect(legendToneOf('rejected_signal')).toBe('rejected');
    expect(legendToneOf('entry_signal')).toBe('signal');
  });
});
