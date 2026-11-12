// D1's maximum hold under the two hold units (strategy.ts `holdAge`, ExitManager): calendar days (the default, frozen)
// and NYSE trading sessions (experimental). Only the age's unit differs: the maximum-hold loss exit at the open and the
// buffered intraday loss from the hold age on keep their conditions.
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { MarketSession, Tick } from '#types';
import { type Dataset, fixtureDataset } from '../../four-family/data.ts';
import { type ExitDecision, type HoldUnit, type LotState, ExitManager, strategies } from '../strategy.ts';

// One session per date: `open` is the first minute's open, then the given minute closes (≥ 2 bars, so that a
// maximum-hold exit — at the first trade after the opening minute — exists).
const session = (date: string, open: number, closes: number[]): MarketSession => {
  const time = Date.parse(`${date}T00:00:00Z`) / 1000;
  const openTime = time + (14 * 60 + 30) * 60;
  const bars: Tick[] = closes.map((close, k) => {
    const o = k === 0 ? open : closes[k - 1]!;

    return {
      time: openTime + k * 60,
      open: o,
      high: Math.max(o, close),
      low: Math.min(o, close),
      close,
      volume: 1,
      trades: NaN
    };
  });

  return {
    date,
    time,
    openTime,
    closeTime: time + 21 * 3600,
    isEarlyClose: false,
    bars,
    open,
    high: Math.max(...bars.map((b) => b.high)),
    low: Math.min(...bars.map((b) => b.low)),
    close: closes.at(-1)!,
    volume: bars.length,
    trades: NaN,
    closingPrint: closes.at(-1)!
  };
};

// Around Independence Day 2024: Mon 07-01, Tue 07-02, Wed 07-03, [Thu 07-04 holiday], Fri 07-05, [weekend], Mon 07-08 …
const july = [
  '2024-07-01',
  '2024-07-02',
  '2024-07-03',
  '2024-07-05',
  '2024-07-08',
  '2024-07-09',
  '2024-07-10',
  '2024-07-11',
  '2024-07-12'
];

// Every session after the entry opens below the entry price (a loss at the open) unless `profitable`.
const dataset = (
  dates: string[],
  o: { entry: string; profitable?: boolean; dip?: Record<string, number> } = { entry: '' }
) =>
  fixtureDataset(
    dates.map((d) => {
      if (d <= o.entry) return session(d, 100, [100, 100, 100]);

      const open = o.profitable ? 101 : 99;
      const dip = o.dip?.[d];

      return session(d, open, dip === undefined ? [open, open, open] : [open, dip, open]);
    })
  );

const exitOf = (
  ds: Dataset,
  entry: string,
  o: { hold: number; unit?: HoldUnit; buffer?: number }
): { date: string; decision: ExitDecision } | null => {
  const e = ds.dates.indexOf(entry);
  const params = {
    ...strategies.d1,
    maximumHoldDays: o.hold,
    intradayLossBuffer: o.buffer ?? 0.5,
    trailingStopPercentage: 0.07,
    ...(o.unit ? { holdUnit: o.unit } : {})
  };
  const lot: LotState = {
    entryPrice: 100,
    shares: 1000,
    investment: 100_000,
    entryTimestamp: ds.sTime[e]!,
    holdTimestamp: ds.sTime[e]!
  };
  const mgr = new ExitManager(ds, params, { stopFill: 'stop', marginInterestRate: 0.11 });

  mgr.onEntry(lot, e, 0);
  for (let s = e + 1; s < ds.sessionCount; s++) {
    const decision = mgr.evaluate(lot, s);

    if (decision) return { date: ds.dates[s]!, decision };
    mgr.afterSession(lot, s);
  }
  return null;
};

describe('D1 maximum hold: calendar days (default) versus trading sessions', () => {
  it('an entry just before the holiday: 3 calendar days fall on Monday, 3 sessions on Tuesday', () => {
    const ds = dataset(july, { entry: '2024-07-03' });
    const cal = exitOf(ds, '2024-07-03', { hold: 3 });
    const ses = exitOf(ds, '2024-07-03', { hold: 3, unit: 'sessions' });

    assert.equal(cal?.date, '2024-07-08'); // 07-05 is 2 days old; 07-08 is 5 days old
    assert.equal(cal?.decision.reason, 'maximum hold');
    assert.equal(ses?.date, '2024-07-09'); // 07-05 = 1, 07-08 = 2, 07-09 = 3 sessions
    assert.equal(ses?.decision.reason, 'maximum hold');
    // the exit timing inside the session is the same rule: the first trade after the opening minute
    assert.equal(ses?.decision.barIndex, 1);
    assert.equal(cal?.decision.barIndex, 1);
  });

  it('the exact boundary: age N − 1 does not exit, age N does (entry session = age 0)', () => {
    const ds = dataset(july, { entry: '2024-07-01' });

    // sessions: 07-02 = 1, 07-03 = 2, 07-05 = 3, 07-08 = 4
    assert.equal(exitOf(ds, '2024-07-01', { hold: 4, unit: 'sessions' })?.date, '2024-07-08');
    assert.equal(exitOf(ds, '2024-07-01', { hold: 3, unit: 'sessions' })?.date, '2024-07-05');
    assert.equal(exitOf(ds, '2024-07-01', { hold: 1, unit: 'sessions' })?.date, '2024-07-02');
    // calendar: 07-05 is 4 days old
    assert.equal(exitOf(ds, '2024-07-01', { hold: 4 })?.date, '2024-07-05');
    assert.equal(exitOf(ds, '2024-07-01', { hold: 5 })?.date, '2024-07-08');
  });

  it('weekends never count as sessions', () => {
    const ds = dataset(july, { entry: '2024-07-05' });

    assert.equal(exitOf(ds, '2024-07-05', { hold: 1, unit: 'sessions' })?.date, '2024-07-08'); // Friday → Monday
    assert.equal(exitOf(ds, '2024-07-05', { hold: 3, unit: 'sessions' })?.date, '2024-07-10');
    assert.equal(exitOf(ds, '2024-07-05', { hold: 3 })?.date, '2024-07-08'); // 3 calendar days
  });

  it('keeps the exit conditions: no maximum-hold exit while profitable at the open, under either unit', () => {
    const ds = dataset(july, { entry: '2024-07-03', profitable: true });

    assert.equal(exitOf(ds, '2024-07-03', { hold: 3 }), null);
    assert.equal(exitOf(ds, '2024-07-03', { hold: 3, unit: 'sessions' }), null);
  });

  it('keeps the buffered intraday loss: active only from the hold age, in the hold unit', () => {
    // profitable at every open; a −4% minute close on 07-08 and on 07-09; buffer 2% of principal
    const ds = dataset(july, { entry: '2024-07-03', profitable: true, dip: { '2024-07-08': 96, '2024-07-09': 96 } });
    const cal = exitOf(ds, '2024-07-03', { hold: 3, buffer: 0.02 });
    const ses = exitOf(ds, '2024-07-03', { hold: 3, buffer: 0.02, unit: 'sessions' });

    assert.equal(cal?.date, '2024-07-08'); // 5 calendar days ≥ 3: the buffer applies
    assert.equal(cal?.decision.reason, 'buffered intraday loss');
    assert.equal(ses?.date, '2024-07-09'); // 07-08 is only 2 sessions old: the dip is ignored there
    assert.equal(ses?.decision.reason, 'buffered intraday loss');
  });

  it('counts a genuine session missing from the data (the exchange calendar, not the file rows)', () => {
    const missing = july.filter((d) => d !== '2024-07-09');
    const ds = dataset(missing, { entry: '2024-07-03' });

    // 07-05 = 1, 07-08 = 2, (07-09 missing but a session) 07-10 = 4 → hold 4 is due on 07-10, one row after 07-08
    assert.equal(exitOf(ds, '2024-07-03', { hold: 4, unit: 'sessions' })?.date, '2024-07-10');
    assert.equal(exitOf(ds, '2024-07-03', { hold: 3, unit: 'sessions' })?.date, '2024-07-10');
  });

  it('fails closed when the data hold a session on an exchange holiday (session unit only)', () => {
    const ds = dataset([...july.slice(0, 3), '2024-07-04', ...july.slice(3)].sort(), { entry: '2024-07-03' });

    assert.throws(() => exitOf(ds, '2024-07-03', { hold: 3, unit: 'sessions' }), /not an NYSE trading session/);
    assert.equal(exitOf(ds, '2024-07-03', { hold: 3 })?.date, '2024-07-08'); // the calendar unit is unaffected
  });

  it('the default equals an explicit calendar-days unit, decision for decision', () => {
    for (const entry of ['2024-07-01', '2024-07-03', '2024-07-05'])
      for (const hold of [1, 2, 3, 4, 5, 7]) {
        const ds = dataset(july, { entry, dip: { '2024-07-10': 95 } });

        assert.deepEqual(
          exitOf(ds, entry, { hold, buffer: 0.02 }),
          exitOf(ds, entry, { hold, buffer: 0.02, unit: 'calendar-days' })
        );
      }
  });
});
