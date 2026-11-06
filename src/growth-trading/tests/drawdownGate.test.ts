// Growth 1.4.0 Drawdown Recovery Gate on synthetic data (NYSE dates, New York times, early closes, missing minutes):
// chronological peak-before-trough detection (the $90/$100 permutations, the gradual dip, intraday declines, highs and
// lows inside one minute), the rolling discovery window, the latched anchor, no duplicate detection, the fresh epoch
// after resolution, the moving trough, same-instant observations and ties, insufficient history; the confirmation clock
// (Y = 0, 1, 2, 5; equality; a one-minute dip; an opening gap; weekends and holidays; DST; early closes; missing
// minutes; lower troughs during and after confirmation; a full peak recovery before Y); the decision-time check and no
// look-ahead (a truncated dataset gives the same records); an independent rescanning reference on random paths; and the
// simulation: OFF creates nothing, the no-dip branch equals OFF, a blocked crossing with eligibility OFF (vetoed, never
// replayed) and ON (decided at the intraday release, filled at the next trade), expiry before confirmation, the policy
// price conditions at a release, the trend filter and the gate together, continuation triggers.
import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import type { MarketSession, Tick } from '#types';
import { barsFromSessions } from '../../entry-signals/bars.ts';
import { RELATIVE_TOLERANCE, scanRiseFromRecentLow } from '../../entry-signals/riseFromRecentLow.ts';
import { type Dataset, fixtureDataset } from '../../four-family/data.ts';
import { nyseEarlyCloses, nyseHolidays } from '../../lib/calendar.ts';
import { DEFAULT_CONTINUATION, DecisionLog, type EpisodeEnd } from '../continuation.ts';
import {
  DEFAULT_DRAWDOWN_GATE,
  type DrawdownGateConfig,
  DrawdownRecoveryGate,
  type DrawdownTransition,
  type Observation,
  drawdownGateConfigErrors,
  drawdownGateWarmupSessions,
  isFull,
  observationsOf
} from '../drawdownGate.ts';
import {
  DEFAULT_ELIGIBILITY,
  DEFAULT_TREND,
  type EligibilityConfig,
  EntryGates,
  type TrendFilterConfig
} from '../entryGates.ts';
import {
  type RiseTradingParams,
  bookSettingsOf,
  decisionsFromSignals,
  defaultTradingParams,
  exitParamsOf,
  simulateTrading,
  summarizeSimulation,
  tradingParamErrors,
  warmupSessionsForParams
} from '../riseTrading.ts';

// ----- synthetic sessions on NYSE dates, in New York time -----

const nyMinute = new Intl.DateTimeFormat('en-US', {
  timeZone: 'America/New_York',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23'
});
// The New York wall-clock minute of day of a Unix time (independent of the module's offset helper).
const minuteOfDay = (t: number) => {
  const [h, m] = nyMinute
    .format(new Date(t * 1000))
    .split(':')
    .map(Number);

  return h! * 60 + m!;
};
// The Unix time of a New York wall-clock time on a date (searching the two possible offsets).
const et = (date: string, hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number);
  const base = Date.parse(`${date}T00:00:00Z`) / 1000 + (h! * 60 + m!) * 60;

  for (const offset of [4, 5]) if (minuteOfDay(base + offset * 3600) === h! * 60 + m!) return base + offset * 3600;
  throw new Error(`no ${hhmm} on ${date}`);
};

type Bar = [string, number] | [string, number, number]; // [New York minute start, close, open?]
interface Day {
  date: string;
  bars: Bar[];
  closingPrint?: number | null; // default: the last close; null: none
}

const session = (d: Day): MarketSession => {
  const early = nyseEarlyCloses.has(d.date);
  const bars: Tick[] = d.bars.map(([hhmm, close, open], i) => {
    const o = open ?? (i ? d.bars[i - 1]![1] : close);

    return {
      time: et(d.date, hhmm),
      open: o,
      high: Math.max(o, close),
      low: Math.min(o, close),
      close,
      volume: 100,
      trades: NaN
    };
  });
  const cp = d.closingPrint === undefined ? bars.at(-1)!.close : d.closingPrint;
  const close = cp ?? bars.at(-1)!.close;

  return {
    date: d.date,
    time: Date.parse(`${d.date}T00:00:00Z`) / 1000,
    openTime: et(d.date, '09:30'),
    closeTime: et(d.date, early ? '13:00' : '16:00'),
    isEarlyClose: early,
    bars,
    open: bars[0]!.open,
    high: Math.max(...bars.map((b) => b.high), close),
    low: Math.min(...bars.map((b) => b.low), close),
    close,
    volume: 100 * bars.length,
    trades: NaN,
    closingPrint: cp ?? undefined
  };
};

// NYSE trading dates from `start` (weekends and holidays skipped).
const tradingDates = (start: string, n: number) => {
  const out: string[] = [];

  for (let t = Date.parse(`${start}T00:00:00Z`); out.length < n; t += 86400_000) {
    const d = new Date(t);
    const date = d.toISOString().slice(0, 10);

    if (d.getUTCDay() !== 0 && d.getUTCDay() !== 6 && !nyseHolidays.has(date)) out.push(date);
  }

  return out;
};

// A session trading at `p` with bars at 09:30 … 09:35 (closes observed 09:31 … 09:36) and a closing print.
const MINUTES = ['09:30', '09:31', '09:32', '09:33', '09:34', '09:35'];
const flatDay = (date: string, p: number): Day => ({ date, bars: MINUTES.map((m) => [m, p] as Bar) });
const path = (date: string, closes: number[]): Day => ({ date, bars: closes.map((c, i) => [MINUTES[i]!, c] as Bar) });

const dsOf = (days: Day[]): Dataset => fixtureDataset(days.map(session));
const cfg = (over: Partial<DrawdownGateConfig> = {}): DrawdownGateConfig => ({
  lookbackSessions: 1,
  dipThresholdPercent: 5,
  recoveryRetracementPercent: 70,
  confirmationSessions: 0,
  ...over
});
const runGate = (days: Day[], c: DrawdownGateConfig) => {
  const ds = dsOf(days);
  const g = new DrawdownRecoveryGate(ds, c, 0);

  g.advanceTo(Infinity);

  return { ds, g };
};
const events = (g: DrawdownRecoveryGate, skip: string[] = ['window_complete']) =>
  g.transitions.filter((t) => !skip.includes(t.event)).map((t) => t.event);
const at = (t: DrawdownTransition) =>
  `${new Date(t.t * 1000).toISOString().slice(0, 10)} ${String(Math.floor(minuteOfDay(t.t) / 60)).padStart(2, '0')}:${String(minuteOfDay(t.t) % 60).padStart(2, '0')}`;

const D = tradingDates('2019-02-04', 120);

// ----- configuration -----

describe('configuration', () => {
  test('defaults are valid and documented bounds are enforced', () => {
    assert.deepEqual(drawdownGateConfigErrors(DEFAULT_DRAWDOWN_GATE), []);
    assert.deepEqual(DEFAULT_DRAWDOWN_GATE, {
      lookbackSessions: 30,
      dipThresholdPercent: 5,
      recoveryRetracementPercent: 70,
      confirmationSessions: 2
    });
    assert.deepEqual(drawdownGateConfigErrors(cfg({ recoveryRetracementPercent: 100, confirmationSessions: 0 })), []);
    assert.match(drawdownGateConfigErrors(cfg({ lookbackSessions: 0 })).join(), /lookbackSessions/);
    assert.match(drawdownGateConfigErrors(cfg({ lookbackSessions: 2.5 })).join(), /integer/);
    assert.match(drawdownGateConfigErrors(cfg({ dipThresholdPercent: 0 })).join(), /dipThresholdPercent/);
    assert.match(drawdownGateConfigErrors(cfg({ recoveryRetracementPercent: 0 })).join(), /recoveryRetracement/);
    assert.match(drawdownGateConfigErrors(cfg({ recoveryRetracementPercent: 100.5 })).join(), /recoveryRetracement/);
    assert.match(drawdownGateConfigErrors(cfg({ confirmationSessions: -1 })).join(), /confirmationSessions/);
    assert.match(drawdownGateConfigErrors(cfg({ confirmationSessions: 61 })).join(), /confirmationSessions/);
    assert.match(
      tradingParamErrors({ ...defaultTradingParams, drawdownGate: cfg({ dipThresholdPercent: -1 }) }).join(),
      /drawdown recovery gate: dipThresholdPercent/
    );
  });

  test('the warm-up is the discovery window; OFF adds nothing', () => {
    assert.equal(drawdownGateWarmupSessions(null), 0);
    assert.equal(drawdownGateWarmupSessions(cfg({ lookbackSessions: 30 })), 30);
    assert.equal(warmupSessionsForParams(defaultTradingParams), 21);
    assert.equal(warmupSessionsForParams({ ...defaultTradingParams, drawdownGate: null }), 21);
    assert.equal(warmupSessionsForParams({ ...defaultTradingParams, drawdownGate: cfg({ lookbackSessions: 60 }) }), 60);
  });
});

// ----- observations -----

describe('observations: chronological, causal, the high/low never used', () => {
  test('open, reopen after missing minutes, minute closes at the minute end, the closing print at the close', () => {
    const ds = dsOf([
      {
        date: D[0]!,
        bars: [
          ['09:30', 10, 9.9],
          ['09:31', 11],
          ['09:35', 12, 11.5]
        ],
        closingPrint: 12.2
      }
    ]);
    const obs = observationsOf(ds);

    assert.deepEqual(
      obs.map((o) => [o.kind, minuteOfDay(o.time), o.price]),
      [
        ['open', 570, 9.9],
        ['minute', 571, 10],
        ['minute', 572, 11],
        ['reopen', 575, 11.5], // the 09:32–09:34 minutes are missing: the next trade is a continuity check
        ['minute', 576, 12],
        ['close', 960, 12.2]
      ]
    );
    // a session without a closing print has no close observation (its last minute is never re-observed at 16:00)
    const noPrint = observationsOf(
      dsOf([
        {
          date: D[0]!,
          bars: [
            ['09:30', 10],
            ['15:40', 11]
          ],
          closingPrint: null
        }
      ])
    );

    assert.deepEqual(
      noPrint.map((o) => [o.kind, minuteOfDay(o.time)]),
      [
        ['open', 570],
        ['minute', 571],
        ['reopen', 940],
        ['minute', 941]
      ]
    );
    // the gate's cursor walks exactly these observations
    const g = new DrawdownRecoveryGate(ds, cfg(), 0);
    const walked: Observation[] = [];

    while (g.nextTime !== Infinity) walked.push(g.step());
    assert.deepEqual(walked, obs);
  });
});

// ----- detection -----

describe('detection: the peak must precede the trough', () => {
  const prefix = (p: number) => [flatDay(D[0]!, p), flatDay(D[1]!, p)];

  test('$100 → $95 → $90 → $97: a 10% chronological decline is one episode (detected at 95, trough 90)', () => {
    const { g } = runGate([...prefix(100), path(D[2]!, [100, 95, 90, 97, 97, 97])], cfg());
    const e = g.episodes[0]!;

    assert.equal(g.episodes.length, 1);
    assert.equal(e.peak, 100);
    assert.equal(e.detectedPrice, 95); // exactly 5% qualifies (equality)
    assert.equal(e.trough, 90);
    assert.equal(e.maxDipPercent, 10);
    assert.ok(e.peakTime < e.detectedTime && e.detectedTime < e.troughTime);
    assert.equal(e.threshold, 97); // 90 + (100 − 90) × 70%
  });

  test('$90 → $95 → $100 → $97: only 3% after the later high — never a 10% dip', () => {
    const { g } = runGate([...prefix(90), path(D[2]!, [90, 95, 100, 97, 97, 97])], cfg());

    assert.equal(g.episodes.length, 0);
    assert.equal(g.state, 'normal');
  });

  test('a gradual 5.8% decline qualifies without any large single-day drop', () => {
    const closes = [100, 99.4, 98.8, 97.9, 96.5, 94.2];
    const days = [flatDay(D[0]!, 100), ...closes.map((c, i) => flatDay(D[i + 1]!, c))];
    const { g, ds } = runGate(days, cfg({ lookbackSessions: 10 }));
    const e = g.episodes[0]!;

    assert.equal(g.episodes.length, 1);
    assert.equal(e.peak, 100);
    assert.equal(e.detectedPrice, 94.2);
    assert.equal(ds.dates[e.detectedSession], D[6]);
    assert.ok(Math.abs(e.detectedDipPercent - 5.8) < 1e-9);
  });

  test('highs and lows inside a minute are never used: a 20% intrabar range is no dip', () => {
    const day: Day = {
      date: D[2]!,
      bars: [
        ['09:30', 100, 100],
        ['09:31', 100, 100]
      ]
    };
    const ds = fixtureDataset([session(flatDay(D[0]!, 100)), session(flatDay(D[1]!, 100)), session(day)]);

    ds.bHigh[ds.sBarStart[2]!] = 120;
    ds.bLow[ds.sBarStart[2]!] = 80;

    const g = new DrawdownRecoveryGate(ds, cfg(), 0);

    g.advanceTo(Infinity);
    assert.equal(g.episodes.length, 0);
  });

  test('the rolling window: a peak N sessions back counts, N + 1 sessions back does not', () => {
    // N = 2: at session s the candidates are sessions s − 2 … s (the current one and the two before it)
    const inside = runGate(
      [flatDay(D[0]!, 100), flatDay(D[1]!, 100), flatDay(D[2]!, 98), flatDay(D[3]!, 94.9)],
      cfg({ lookbackSessions: 2 })
    );
    const outside = runGate(
      [flatDay(D[0]!, 100), flatDay(D[1]!, 100), flatDay(D[2]!, 98), flatDay(D[3]!, 98), flatDay(D[4]!, 94.9)],
      cfg({ lookbackSessions: 2 })
    );

    // session 3: window = sessions 1 … 3, the 100 of session 1 is inside → 5.1% → detected, peak dated session 1
    assert.equal(inside.g.episodes.length, 1);
    assert.equal(inside.g.episodes[0]!.peak, 100);
    assert.equal(inside.ds.dates[inside.g.episodes[0]!.peakSession], D[1]);
    // session 4: window = sessions 2 … 4, the 100s are out → 94.9 against 98 is 3.2% → nothing
    assert.equal(outside.g.episodes.length, 0);
  });

  test('the anchor is latched: the episode survives the peak leaving the window; a lower close moves the trough', () => {
    const days = [
      flatDay(D[0]!, 100),
      flatDay(D[1]!, 100),
      flatDay(D[2]!, 94),
      ...D.slice(3, 12).map((d, i) => flatDay(d, 93 - i * 0.5))
    ];
    const { g } = runGate(days, cfg({ lookbackSessions: 1 }));
    const e = g.episodes[0]!;

    assert.equal(g.episodes.length, 1); // no rediscovery as the window advances
    assert.equal(e.peak, 100); // kept although session 1 left the 1-session window long ago
    assert.equal(e.trough, 89);
    assert.equal(e.threshold, 89 + 11 * 0.7);
    assert.equal(g.state, 'recovery_required');
    assert.ok(e.troughUpdates >= 9);
  });

  test('a long downtrend without single-day drops is one latched episode, its trough the lowest close', () => {
    const days = D.slice(0, 60).map((d, i) => flatDay(d, 100 * (1 - 0.004 * i)));
    const { g } = runGate(days, cfg({ lookbackSessions: 20 }));

    assert.equal(g.episodes.length, 1);
    assert.equal(g.episodes[0]!.peak, 100);
    assert.ok(Math.abs(g.episodes[0]!.trough - 100 * (1 - 0.004 * 59)) < 1e-9);
  });

  test('resolution at the peak; a fresh epoch: the old dip inside the window never re-arms, a new peak can', () => {
    const days = [
      flatDay(D[0]!, 100),
      flatDay(D[1]!, 100),
      path(D[2]!, [100, 94, 94, 94, 94, 94]), // DD-1 at 94
      path(D[3]!, [97, 99, 100, 99, 98, 98]), // resolved at 100 (09:33), then still inside the old window
      flatDay(D[4]!, 98),
      path(D[5]!, [101, 102, 99, 97, 96.9, 97]) // new peak 102 → 96.9 = 5% below it: DD-2
    ];
    const { g, ds } = runGate(days, cfg({ lookbackSessions: 3 }));

    // DD-1: peak 100, trough 94, threshold 98.2: confirmed at 99 (Y = 0), resolved at 100, then nothing while the
    // old 100 → 94 dip is still inside the 3-session window; DD-2 only from the new 102 peak
    assert.deepEqual(events(g), [
      'dip_detected',
      'recovery_started',
      'recovery_confirmed',
      'dip_resolved',
      'dip_detected'
    ]);
    const [e1, e2] = g.episodes;

    assert.equal(e1!.state, 'resolved');
    assert.equal(e1!.resolvedPrice, 100);
    assert.equal(ds.dates[e1!.resolvedSession], D[3]);
    assert.equal(e1!.resolvedBeforeConfirmation, false);
    assert.equal(e2!.peak, 102);
    assert.ok(e2!.peakTime > e1!.resolvedTime);
    assert.equal(e2!.epoch, 2);
  });

  test('equal closes: the most recent one is the peak; the minute close and the closing print at 16:00 are ordered', () => {
    const days = [
      flatDay(D[0]!, 100),
      {
        date: D[1]!,
        bars: [
          ['09:30', 100],
          ['15:59', 100]
        ],
        closingPrint: 94
      } as Day
    ];
    const { g } = runGate(days, cfg());
    const e = g.episodes[0]!;

    assert.equal(e.peak, 100);
    assert.equal(minuteOfDay(e.peakTime), 960); // the 15:59 minute's close, observed at 16:00 — the latest equal close
    assert.equal(e.detectedPrice, 94);
    assert.equal(e.peakTime, e.detectedTime); // same instant, but the minute close precedes the closing print
    assert.equal(e.peakKind, 'minute');
  });

  test('insufficient history: the gate blocks until the discovery window lies inside the loaded data', () => {
    const ds = dsOf(D.slice(0, 5).map((d) => flatDay(d, 100)));
    const g = new DrawdownRecoveryGate(ds, cfg({ lookbackSessions: 3 }), 0);

    for (let s = 0; s < 5; s++) {
      g.advanceTo(ds.sCloseTime[s]!);

      const c = g.check(s, ds.sCloseTime[s]!, 100);

      assert.equal(c.pass, s >= 3, `session ${s}`);
      assert.equal(c.state, s >= 3 ? 'normal' : 'insufficient_history');
    }
    assert.equal(g.transitions.filter((t) => t.event === 'window_complete').length, 1);
    assert.equal(g.releases[0]!.cause, 'window_complete');
  });

  test('a dip detected while the window is incomplete is flagged; a dip resolved in the warm-up leaves NORMAL', () => {
    const { g, ds } = runGate(
      [path(D[0]!, [100, 94, 95, 99, 100, 100]), flatDay(D[1]!, 100), flatDay(D[2]!, 100)],
      cfg({ lookbackSessions: 2 })
    );

    assert.equal(g.episodes[0]!.windowCompleteAtDetection, false);
    assert.equal(g.episodes[0]!.state, 'resolved');
    assert.equal(g.check(2, ds.sCloseTime[2]!, 100).pass, true);
  });

  test('the decision check refuses to read a state not yet advanced to the decision instant', () => {
    const ds = dsOf([flatDay(D[0]!, 100), flatDay(D[1]!, 100)]);
    const g = new DrawdownRecoveryGate(ds, cfg(), 0);

    assert.throws(() => g.check(1, ds.sCloseTime[1]!, 100), /not processed before the decision/);
  });
});

// ----- confirmation -----

// A dip to 90 from 100 (threshold 97 at 70%) on D[1]; the streak starts on `startDay` at 11:15 ET (the 11:14 bar's
// close) and the following days trade at 98 at 09:30 … 16:00 unless `days` says otherwise.
const recoveryPath = (startDay: string, after: Day[], c: Partial<DrawdownGateConfig> = {}) => {
  const days: Day[] = [
    flatDay(D[0]!, 100),
    path(D[1]!, [100, 95, 90, 90, 90, 90]),
    {
      date: startDay,
      bars: [
        ['09:30', 96],
        ['11:13', 96.5],
        ['11:14', 97.5],
        ['15:59', 98]
      ]
    },
    ...after
  ];

  return runGate(days, cfg({ confirmationSessions: 2, ...c }));
};
const fullDay = (date: string, p: number, extra: Bar[] = []): Day => ({
  date,
  bars: ([['09:30', p], ['10:00', p], ['11:13', p], ['11:14', p], ['11:15', p], ['15:59', p], ...extra] as Bar[]).sort(
    (a, b) => a[0].localeCompare(b[0])
  )
});
const confirmedAt = (g: DrawdownRecoveryGate) => g.transitions.filter((t) => t.event === 'recovery_confirmed').map(at);

describe('confirmation: Y trading-session intervals observed on completed minutes', () => {
  test('Y = 0: confirmed at the first close at or above the threshold (equality included)', () => {
    const { g } = runGate(
      [flatDay(D[0]!, 100), path(D[1]!, [100, 95, 90, 96, 97, 96])],
      cfg({ confirmationSessions: 0 })
    );

    assert.deepEqual(events(g), [
      'dip_detected',
      'new_trough',
      'recovery_started',
      'recovery_confirmed',
      'confirmation_lost'
    ]);
    assert.equal(g.transitions.find((t) => t.event === 'recovery_confirmed')!.price, 97);
  });

  test('Y = 1: Monday 11:15 → Tuesday 11:15 (not Tuesday 11:14, not the Tuesday close)', () => {
    // D[2] = 2019-02-06 (Wednesday) … use a Monday start: 2019-02-11
    const mon = '2019-02-11';
    const { g } = recoveryPath(mon, [fullDay('2019-02-12', 98), fullDay('2019-02-13', 98)], {
      confirmationSessions: 1
    });

    assert.deepEqual(confirmedAt(g), ['2019-02-12 11:15']);
    assert.equal(g.transitions.find((t) => t.event === 'recovery_started')!.price, 97.5);
    assert.equal(minuteOfDay(g.transitions.find((t) => t.event === 'recovery_started')!.t), 675);
  });

  test('Y = 2: Monday 11:15 → Wednesday at/after 11:15; Y = 5 → the fifth session after', () => {
    const mon = '2019-02-11';
    const later = tradingDates('2019-02-12', 6).map((d) => fullDay(d, 98));
    const two = recoveryPath(mon, later, { confirmationSessions: 2 });
    const five = recoveryPath(mon, later, { confirmationSessions: 5 });

    assert.deepEqual(confirmedAt(two.g), ['2019-02-13 11:15']);
    // sessions after Monday 2019-02-11: 12, 13, 14, 15, (18 = Presidents' Day holiday), 19 → the fifth is 02-19
    assert.deepEqual(confirmedAt(five.g), ['2019-02-19 11:15']);
  });

  test('a single minute close below the threshold resets the whole interval', () => {
    const mon = '2019-02-11';
    const { g } = recoveryPath(
      mon,
      [
        fullDay('2019-02-12', 98, [['13:00', 96.9]]),
        fullDay('2019-02-13', 98),
        fullDay('2019-02-14', 98),
        fullDay('2019-02-15', 98)
      ],
      { confirmationSessions: 2 }
    );
    const reset = g.transitions.find((t) => t.event === 'confirmation_reset')!;

    assert.equal(reset.values.cause, 'minute_close');
    assert.equal(at(reset), '2019-02-12 13:01');
    // the next streak starts at the 13:01 bar's close (98, observed 13:02 … here the 15:59 bar at 16:00), so two
    // sessions later at/after that minute
    const restarted = g.transitions.filter((t) => t.event === 'recovery_started')[1]!;

    assert.equal(at(restarted), '2019-02-12 16:00');
    assert.deepEqual(confirmedAt(g), ['2019-02-14 16:00']);
  });

  test('an overnight gap below the threshold resets at the opening trade, even if the first minute rebounds', () => {
    const mon = '2019-02-11';
    const gapDay: Day = {
      date: '2019-02-12',
      bars: [
        ['09:30', 98, 96.5],
        ['11:15', 98],
        ['15:59', 98]
      ]
    };
    const { g } = recoveryPath(
      mon,
      [gapDay, fullDay('2019-02-13', 98), fullDay('2019-02-14', 98), fullDay('2019-02-15', 98)],
      {
        confirmationSessions: 2
      }
    );
    const reset = g.transitions.find((t) => t.event === 'confirmation_reset')!;

    assert.equal(reset.values.cause, 'opening_gap');
    assert.equal(at(reset), '2019-02-12 09:30');
    // restarted at the 09:30 bar's close (09:31) → confirmed two sessions later at/after 09:31
    assert.deepEqual(confirmedAt(g), ['2019-02-14 09:31']);
  });

  test('a closing print below the threshold resets', () => {
    const mon = '2019-02-11';
    const day: Day = { ...fullDay('2019-02-12', 98), closingPrint: 96 };
    const { g } = recoveryPath(mon, [
      day,
      fullDay('2019-02-13', 98),
      fullDay('2019-02-14', 98),
      fullDay('2019-02-15', 98)
    ]);

    assert.equal(g.transitions.find((t) => t.event === 'confirmation_reset')!.values.cause, 'closing_print');
  });

  test('weekends and holidays are not sessions: Friday → Monday; around Independence Day and its early close', () => {
    const fri = recoveryPath('2019-02-15', [fullDay('2019-02-19', 98), fullDay('2019-02-20', 98)], {
      confirmationSessions: 1
    });

    // 2019-02-18 is a holiday: Friday's next session is Tuesday 02-19
    assert.deepEqual(confirmedAt(fri.g), ['2019-02-19 11:15']);

    // start Tuesday 2019-07-02 11:15; 07-03 is an early close (13:00), 07-04 a holiday: Y = 2 → Friday 07-05 11:15
    const earlyClose: Day = {
      date: '2019-07-03',
      bars: [
        ['09:30', 98],
        ['11:15', 98],
        ['12:59', 98]
      ]
    };
    const july = recoveryPath('2019-07-02', [earlyClose, fullDay('2019-07-05', 98), fullDay('2019-07-08', 98)], {
      confirmationSessions: 2
    });

    assert.deepEqual(confirmedAt(july.g), ['2019-07-05 11:15']);
  });

  test('an early close without the corresponding minute: qualified at the next actual completed minute', () => {
    // start Tuesday 2019-07-02 at 15:00 (14:59 bar); Y = 1 → Wednesday 07-03 closes at 13:00: no minute at/after 15:00
    const days: Day[] = [
      flatDay('2019-06-28', 100),
      path('2019-07-01', [100, 95, 90, 90, 90, 90]),
      {
        date: '2019-07-02',
        bars: [
          ['09:30', 96],
          ['14:59', 97.5],
          ['15:59', 98]
        ]
      },
      {
        date: '2019-07-03',
        bars: [
          ['09:30', 98],
          ['12:59', 98]
        ]
      },
      {
        date: '2019-07-05',
        bars: [
          ['09:30', 98, 98],
          ['09:31', 98]
        ]
      }
    ];
    const { g } = runGate(days, cfg({ confirmationSessions: 1 }));

    // not at the 13:00 closing print of the early close (minute 780 < 900): at 07-05's first completed minute
    assert.deepEqual(confirmedAt(g), ['2019-07-05 09:31']);
  });

  test('DST: Friday 11:15 EST → Monday 11:15 EDT (New York time, not 24-hour UTC intervals)', () => {
    const { g } = recoveryPath('2019-03-08', [fullDay('2019-03-11', 98), fullDay('2019-03-12', 98)], {
      confirmationSessions: 1
    });
    const c = g.transitions.find((t) => t.event === 'recovery_confirmed')!;
    const s = g.transitions.find((t) => t.event === 'recovery_started')!;

    assert.deepEqual(confirmedAt(g), ['2019-03-11 11:15']);
    assert.equal(c.t - s.t, 3 * 86400 - 3600); // one hour less than three UTC days
  });

  test('missing minutes: the corresponding minute absent → the next observed close; a reopening gap below resets', () => {
    const mon = '2019-02-11';
    const sparse: Day = {
      date: '2019-02-12',
      bars: [
        ['09:30', 98],
        ['11:20', 98],
        ['15:59', 98]
      ]
    };
    const one = recoveryPath(mon, [sparse, fullDay('2019-02-13', 98)], { confirmationSessions: 1 });

    assert.deepEqual(confirmedAt(one.g), ['2019-02-12 11:21']); // the 11:15 minute is missing: never pretended

    const halt: Day = {
      date: '2019-02-12',
      bars: [
        ['09:30', 98],
        ['10:00', 98],
        ['10:30', 98, 96.8],
        ['11:15', 98],
        ['15:59', 98]
      ]
    };
    const two = recoveryPath(mon, [halt, fullDay('2019-02-13', 98), fullDay('2019-02-14', 98)], {
      confirmationSessions: 1
    });

    assert.equal(two.g.transitions.find((t) => t.event === 'confirmation_reset')!.values.cause, 'reopen_gap');
  });

  test('a lower trough during confirmation resets; after confirmation it is a loss, and another full Y is needed', () => {
    const mon = '2019-02-11';
    const during = recoveryPath(
      mon,
      [fullDay('2019-02-12', 98, [['12:00', 89]]), fullDay('2019-02-13', 98), fullDay('2019-02-14', 98)],
      {
        confirmationSessions: 2
      }
    );
    const r = during.g.transitions.find((t) => t.event === 'confirmation_reset')!;

    assert.equal(r.values.cause, 'new_trough');
    assert.equal(during.g.episodes[0]!.trough, 89);
    assert.equal(during.g.episodes[0]!.threshold, 89 + 11 * 0.7);

    const after = recoveryPath(
      mon,
      [
        fullDay('2019-02-12', 98),
        fullDay('2019-02-13', 98, [['12:00', 96]]),
        fullDay('2019-02-14', 98),
        fullDay('2019-02-15', 98)
      ],
      { confirmationSessions: 1 }
    );

    assert.deepEqual(events(after.g).slice(-4), [
      'recovery_confirmed',
      'confirmation_lost',
      'recovery_started',
      'recovery_confirmed'
    ]);
    // lost at the 12:00 bar's close (96 < 97) on 02-13; restarted at that day's 16:00 close; confirmed a session later
    assert.equal(after.g.transitions.find((t) => t.event === 'confirmation_lost')!.values.cause, 'minute_close');
    assert.deepEqual(confirmedAt(after.g), ['2019-02-12 11:15', '2019-02-14 16:00']);
  });

  test('regaining the peak before Y elapsed resolves the episode (recorded as such) and permits at once', () => {
    const mon = '2019-02-11';
    const { g } = recoveryPath(mon, [fullDay('2019-02-12', 98, [['14:00', 100]]), fullDay('2019-02-13', 98)], {
      confirmationSessions: 5
    });
    const res = g.transitions.find((t) => t.event === 'dip_resolved')!;

    assert.equal(res.values.resolvedBeforeConfirmation, true);
    assert.equal(g.episodes[0]!.resolvedBeforeConfirmation, true);
    assert.equal(g.releases.at(-1)!.cause, 'dip_resolved');
    assert.equal(g.state, 'normal');
  });

  test('retracement 100%: only regaining the peak permits', () => {
    const { g } = runGate(
      [flatDay(D[0]!, 100), path(D[1]!, [100, 90, 99.99, 100, 100, 100])],
      cfg({ recoveryRetracementPercent: 100 })
    );

    assert.deepEqual(events(g), ['dip_detected', 'dip_resolved']);
  });
});

// ----- an independent reference and no look-ahead -----

// A rescanning reference of the whole state machine over an explicit observation list: the peak is found by scanning
// every earlier full observation of the epoch and window (no deque), the clock reads New York minutes through Intl.
const reference = (obs: Observation[], c: DrawdownGateConfig) => {
  const out: { event: string; seq: number; episode: string; price: number }[] = [];
  const d = Number(`${c.dipThresholdPercent}e-2`);
  const r = Number(`${c.recoveryRetracementPercent}e-2`);
  const tol = RELATIVE_TOLERANCE;
  let epochStart = 0;
  let ep = null as { id: string; P: number; T: number; R: number } | null;
  let streak = null as { session: number; minute: number } | null;
  let confirmed = false;
  let n = 0;
  const push = (event: string, o: Observation) => {
    const last = out.at(-1);

    if (
      event === 'new_trough' &&
      last?.event === 'new_trough' &&
      last.episode === ep!.id &&
      obs[last.seq]!.session === o.session
    ) {
      last.seq = o.seq;
      last.price = o.price;
      return;
    }
    out.push({ event, seq: o.seq, episode: ep!.id, price: o.price });
  };
  const brk = (o: Observation) => {
    push(confirmed ? 'confirmation_lost' : 'confirmation_reset', o);
    streak = null;
    confirmed = false;
  };

  let windowNoted = false;
  // the gate notes the first full observation with a complete window (after processing it); a run of new lows is
  // coalesced only while it is the latest record, so the reference keeps that marker too (filtered afterwards)
  const mark = (o: Observation) => {
    if (!windowNoted && o.session >= c.lookbackSessions) {
      windowNoted = true;
      out.push({ event: 'window_complete', seq: o.seq, episode: '', price: o.price });
    }
  };

  for (const o of obs) {
    if (!isFull(o.kind)) {
      if (ep && streak && !(o.price >= ep.R * (1 - tol))) brk(o);
      continue;
    }
    step(o);
    mark(o);
  }

  return out.filter((x) => x.event !== 'window_complete');

  function step(o: Observation) {
    if (!ep) {
      let best: Observation | null = null;

      for (const i of obs.slice(epochStart, o.seq))
        if (isFull(i.kind) && i.session >= o.session - c.lookbackSessions && (!best || i.price >= best.price)) best = i;
      if (best && o.price <= best.price * (1 - d) * (1 + tol)) {
        ep = { id: `DD-${++n}`, P: best.price, T: o.price, R: o.price + (best.price - o.price) * r };
        push('dip_detected', o);
      }
      return;
    }
    if (o.price >= ep.P * (1 - tol)) {
      push('dip_resolved', o);
      ep = null;
      streak = null;
      confirmed = false;
      epochStart = o.seq;
      return;
    }
    if (o.price < ep.T) {
      if (streak) brk(o);
      ep.T = o.price;
      ep.R = ep.T + (ep.P - ep.T) * r;
      push('new_trough', o);
      return;
    }
    if (o.price >= ep.R * (1 - tol)) {
      if (!streak) {
        streak = { session: o.session, minute: minuteOfDay(o.time) };
        push('recovery_started', o);
        if (c.confirmationSessions === 0) {
          confirmed = true;
          push('recovery_confirmed', o);
        }
      } else if (
        !confirmed &&
        (o.session > streak.session + c.confirmationSessions ||
          (o.session === streak.session + c.confirmationSessions && minuteOfDay(o.time) >= streak.minute))
      ) {
        confirmed = true;
        push('recovery_confirmed', o);
      }
      return;
    }
    if (streak) brk(o);
  }
};

// A seeded random walk of NYSE sessions with sparse minutes, gaps at the open and missing closing prints.
const randomDays = (seed: number, n: number): Day[] => {
  let x = seed >>> 0;
  const rnd = () => (x = (Math.imul(x ^ (x >>> 15), 2246822507) + 0x9e3779b9) >>> 0) / 2 ** 32;
  let p = 100;

  return tradingDates('2019-01-02', n).map((date) => {
    const early = nyseEarlyCloses.has(date);
    const last = early ? 12 * 60 + 59 : 15 * 60 + 59;
    const bars: Bar[] = [];

    p *= 1 + (rnd() - 0.5) * 0.03; // the overnight move
    for (let m = 9 * 60 + 30; m <= last; m += 1 + Math.floor(rnd() * 25)) {
      const open = p;

      p *= 1 + (rnd() - 0.5) * 0.006;
      bars.push([
        `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`,
        Math.round(p * 100) / 100,
        Math.round(open * 100) / 100
      ]);
    }

    return { date, bars, closingPrint: rnd() < 0.2 ? null : Math.round(p * (1 + (rnd() - 0.5) * 0.002) * 100) / 100 };
  });
};

describe('the deque detector equals a rescanning reference; nothing reads ahead', () => {
  for (const seed of [1, 7, 42, 2026])
    test(`random path ${seed}: identical transitions for several configurations`, () => {
      const days = randomDays(seed, 140);
      const ds = dsOf(days);
      const obs = observationsOf(ds);

      for (const c of [
        cfg({ lookbackSessions: 5, dipThresholdPercent: 3, recoveryRetracementPercent: 60, confirmationSessions: 1 }),
        cfg({ lookbackSessions: 20, dipThresholdPercent: 5, recoveryRetracementPercent: 70, confirmationSessions: 2 }),
        cfg({
          lookbackSessions: 2,
          dipThresholdPercent: 1.5,
          recoveryRetracementPercent: 100,
          confirmationSessions: 0
        }),
        cfg({ lookbackSessions: 10, dipThresholdPercent: 2, recoveryRetracementPercent: 50, confirmationSessions: 4 })
      ]) {
        const g = new DrawdownRecoveryGate(ds, c, 0);

        g.advanceTo(Infinity);

        const mine = g.transitions
          .filter((t) => t.event !== 'window_complete' && t.event !== 'entry_blocked_by_drawdown_gate')
          .map((t) => ({ event: t.event, seq: t.seq, episode: t.episode!, price: t.price }));

        assert.deepEqual(mine, reference(obs, c), JSON.stringify(c));
        assert.ok(g.episodes.length > 0, 'the path has episodes');
      }
    });

  test('a dataset truncated after any session gives the same transitions up to that session (no look-ahead)', () => {
    const days = randomDays(99, 90);
    const c = cfg({
      lookbackSessions: 10,
      dipThresholdPercent: 3,
      recoveryRetracementPercent: 70,
      confirmationSessions: 2
    });
    const full = new DrawdownRecoveryGate(dsOf(days), c, 0);

    full.advanceTo(Infinity);
    for (const cut of [10, 33, 57, 89]) {
      const g = new DrawdownRecoveryGate(dsOf(days.slice(0, cut + 1)), c, 0);

      g.advanceTo(Infinity);
      assert.deepEqual(
        g.transitions,
        full.transitions.filter((t) => t.session <= cut),
        `cut ${cut}`
      );
    }
  });
});

// ----- the simulation -----

const BASE: RiseTradingParams = {
  ...defaultTradingParams,
  advanceFromRecentLowPercent: 5,
  recentLowLookbackBars: 5,
  resolution: '1d',
  trailingStopPercent: 30,
  maximumHoldEnabled: false,
  intradayLossBufferEnabled: false,
  costBpsPerSide: 0
};
const simulate = (days: Day[], over: Partial<RiseTradingParams> = {}) => {
  const sessions = days.map(session);
  const ds = fixtureDataset(sessions);
  const p: RiseTradingParams = { ...BASE, ...over };
  const bars = barsFromSessions(sessions, p.resolution);
  const entry = {
    advanceFromRecentLowPercent: p.advanceFromRecentLowPercent,
    recentLowLookbackBars: p.recentLowLookbackBars
  };
  const decisions = decisionsFromSignals(bars, scanRiseFromRecentLow(bars, entry, 0).signals);
  const c = p.continuation ?? null;
  const sim = simulateTrading(ds, decisions, {
    symbol: 'TEST',
    firstSession: 0,
    endSession: ds.sessionCount - 1,
    exit: exitParamsOf(p),
    book: bookSettingsOf(p),
    continuation: c ? { config: c, bars: c.method === 'classic_d1' ? null : bars } : null,
    gates:
      p.trendFilter || p.eligibility
        ? { trend: p.trendFilter ?? null, eligibility: p.eligibility ?? null, bars, entry }
        : null,
    drawdown: p.drawdownGate ?? null
  });
  const summary = summarizeSimulation(sim, ds);
  const ck = summary.metrics.checks;

  assert.ok(
    ck.fixedLedgerMaxDifferenceUsd <= 1e-6 && ck.identityMaxResidualUsd <= 1e-6 && ck.markedEqualsLedger <= 1e-6
  );

  return { ds, sim, summary, dd: sim.gates?.drawdown ?? null };
};

// Scenario S: flat 100 (sessions 0–2), a decline to 90 on session 3 (DD-1 at 94: 6%; trough 90; threshold 95 at 50%),
// 90 on session 4, the Rise crossing at the session-5 close 94.6 (≥ 90 × 1.05 = 94.5) while recovery is required, a
// streak from the 09:31 bar's close (95.2, observed 09:32) on session 6, then 95.5+ on session 7: with Y = 1 the gate
// is confirmed at 09:32 on session 7.
const S_DATES = tradingDates('2019-04-01', 14);
const scenarioS = (tail: number[][] = []) => [
  flatDay(S_DATES[0]!, 100),
  flatDay(S_DATES[1]!, 100),
  flatDay(S_DATES[2]!, 100),
  path(S_DATES[3]!, [100, 97, 94, 92, 90, 90]),
  flatDay(S_DATES[4]!, 90),
  path(S_DATES[5]!, [90, 91, 92, 93, 94, 94.6]),
  path(S_DATES[6]!, [94.6, 95.2, 95.3, 95.4, 95.5, 95.6]),
  path(S_DATES[7]!, [95.5, 95.6, 95.7, 95.8, 95.9, 96]),
  ...(tail.length
    ? tail
    : [
        [96, 96, 96, 96, 96, 96],
        [96, 96, 96, 96, 96, 96]
      ]
  ).map((c, i) => path(S_DATES[8 + i]!, c))
];
const GATE_S = cfg({
  lookbackSessions: 1,
  dipThresholdPercent: 5,
  recoveryRetracementPercent: 50,
  confirmationSessions: 1
});

describe('the simulation: a filter on Growth decisions, never a signal', () => {
  test('OFF: no gate exists and the run equals one without the field', () => {
    const a = simulate(scenarioS());
    const b = simulate(scenarioS(), { drawdownGate: null });

    assert.equal(a.sim.gates, null);
    assert.equal(b.sim.gates, null);
    assert.deepEqual(b.summary.metrics, a.summary.metrics);
    assert.equal(a.sim.trades.length, 1); // without the gate the session-5 crossing fills at the session-6 open
  });

  test('no dip: the gate stays NORMAL and every signal, trade and mark equals OFF', () => {
    const rising = S_DATES.slice(0, 12).map((d, i) =>
      i === 6
        ? path(d, [100, 99, 98, 97.5, 97, 97])
        : i === 7
          ? path(d, [97, 99, 101, 102, 103, 103])
          : flatDay(d, 100 + i * 0.1)
    );
    const off = simulate(rising);
    const on = simulate(rising, { drawdownGate: cfg({ lookbackSessions: 1, dipThresholdPercent: 5 }) });

    assert.equal(on.dd!.episodes.length, 0);
    assert.ok(off.sim.trades.length >= 1);
    assert.deepEqual(
      on.sim.trades.map((t) => [t.entryTime, t.entryRawPrice, t.exitTime, t.net]),
      off.sim.trades.map((t) => [t.entryTime, t.entryRawPrice, t.exitTime, t.net])
    );
    assert.deepEqual(on.sim.daily, off.sim.daily);
  });

  test('eligibility OFF: the blocked crossing is vetoed and never replayed when the gate later permits', () => {
    const { sim, dd } = simulate(scenarioS(), { drawdownGate: GATE_S });
    const o = sim.outcomes[0]!;

    assert.equal(sim.outcomes.length, 1);
    assert.equal(o.status, 'vetoed');
    assert.equal(o.reason, 'drawdown_gate');
    assert.equal(o.gate!.gate!.drawdown!.values.state, 'recovery_required');
    assert.equal(o.gate!.gate!.drawdown!.values.threshold, 95);
    assert.equal(sim.trades.length, 0); // the release on session 7 creates nothing
    assert.equal(dd!.releases.filter((r) => r.cause === 'recovery_confirmed').length, 1);
    assert.equal(dd!.transitions.filter((t) => t.event === 'entry_blocked_by_drawdown_gate').length, 1);
  });

  test('eligibility ON: the armed opportunity is decided at the 09:32 release and fills at the next trade, at the then-current price', () => {
    const { sim, ds } = simulate(scenarioS(), {
      drawdownGate: GATE_S,
      eligibility: { ...DEFAULT_ELIGIBILITY.time_limited }
    });
    const op = sim.gates!.opportunities[0]!;
    const t = sim.trades[0]!;
    const d = sim.gates!.decisions.find((x) => x.via === 'drawdown_release')!;

    assert.equal(sim.outcomes[0]!.status, 'deferred');
    assert.equal(op.transitions[1]!.state, 'blocked_by_drawdown_gate');
    assert.equal(d.time, et(S_DATES[7]!, '09:32')); // the 09:31 bar's close: the qualifying observation
    assert.equal(d.price, 95.6);
    assert.equal(t.decisionTime, d.time);
    assert.equal(t.entryTime, et(S_DATES[7]!, '09:32')); // the next trade: the 09:32 bar's opening trade
    assert.equal(t.entryRawPrice, 95.6); // not the 94.6 signal price, not the 95 threshold
    assert.ok(t.entryTime < ds.sCloseTime[7]!); // decided intraday, not at the session's close
    assert.equal(op.ageSessionsAtDecision, 2);
    assert.equal(op.endState, 'consumed');
  });

  test('the opportunity expires before the confirmation: no entry is invented', () => {
    const { sim } = simulate(scenarioS(), {
      drawdownGate: { ...GATE_S, confirmationSessions: 3 },
      eligibility: { policy: 'time_limited', maxAgeSessions: 1 }
    });

    assert.equal(sim.trades.length, 0);
    assert.equal(sim.gates!.opportunities[0]!.endState, 'expired');
  });

  test('policy price conditions at a release: the extension cap blocks the intraday decision; strength allows it', () => {
    // S2: session 6 closes at 95.0 (still ≥ the 95 threshold), session 7 trades 96.0 at the 09:32 release
    const s2 = () => {
      const days = scenarioS();

      days[6] = path(S_DATES[6]!, [94.6, 95.2, 95.3, 95.4, 95.5, 95.0]);
      days[7] = path(S_DATES[7]!, [95.5, 96.0, 96.1, 96.2, 96.3, 96.4]);
      return days;
    };
    // policy 3, cap 1% above the 94.6 signal = 95.546: the session-6 close 95.0 is inside (valid at its bar), the
    // release price 96.0 is not → no decision at the release (logged); the session-7 close then invalidates it
    const capped = simulate(s2(), {
      drawdownGate: GATE_S,
      eligibility: { policy: 'maximum_extension', maxAgeSessions: 10, maximumExtensionPercent: 1 }
    });
    const blocked = capped.sim.log.entries.find(
      (e) => e.event === 'opportunity_blocked' && e.values.via === 'drawdown_release'
    );
    const op = capped.sim.gates!.opportunities[0]!;

    assert.ok(blocked, 'a release-time block is logged');
    assert.equal(blocked!.t, et(S_DATES[7]!, '09:32'));
    assert.equal(capped.sim.gates!.decisions.filter((x) => x.via === 'drawdown_release').length, 0);
    assert.equal(capped.sim.trades.length, 0);
    assert.equal(op.endState, 'invalidated');
    assert.equal(op.endTime, capped.ds.sCloseTime[7]); // at its bar, not at the release instant

    // policy 2 (3% over the fixed 90 low = 92.7): holds at 96.0 → decided at the release, filled at the next trade
    const strong = simulate(s2(), {
      drawdownGate: GATE_S,
      eligibility: { policy: 'minimum_strength', maxAgeSessions: 10, minimumAdvancePercent: 3 }
    });

    assert.equal(strong.sim.gates!.decisions.filter((x) => x.via === 'drawdown_release').length, 1);
    assert.equal(strong.sim.trades[0]!.entryRawPrice, 96.0);
  });

  test('with the trend filter: both are evaluated and logged; both must pass', () => {
    // trend A over 3 sessions: at the session-5 crossing P0 94.6 < the session-2 close 100 → trend blocks too
    const trend: TrendFilterConfig = { method: 'price_change', lookbackSessions: 3, minimumReturnPercent: 0 };
    const { sim } = simulate(scenarioS(), {
      drawdownGate: GATE_S,
      trendFilter: trend,
      eligibility: { ...DEFAULT_ELIGIBILITY.time_limited }
    });
    const first = sim.outcomes[0]!.gate!.gate!;

    assert.equal(first.reason, 'trend_veto'); // the first failure in the order trend → drawdown
    assert.deepEqual(first.blockedBy, ['trend', 'drawdown']);
    assert.equal(first.drawdown!.pass, false);
    // at the 09:32 release on session 7, P0 95.6 ≥ the session-4 close 90: both pass
    assert.equal(sim.trades.length, 1);
    assert.equal(sim.trades[0]!.decisionTime, et(S_DATES[7]!, '09:32'));
  });

  test('every trend method and eligibility policy runs with the gate; accounting reconciles', () => {
    for (const m of Object.keys(DEFAULT_TREND) as (keyof typeof DEFAULT_TREND)[])
      for (const pol of Object.keys(DEFAULT_ELIGIBILITY) as EligibilityConfig['policy'][]) {
        const r = simulate(scenarioS(), {
          drawdownGate: GATE_S,
          trendFilter: {
            ...DEFAULT_TREND[m],
            ...(m === 'momentum'
              ? { shortLookbackSessions: 1, longLookbackSessions: 2 }
              : 'lookbackSessions' in DEFAULT_TREND[m]
                ? { lookbackSessions: 2 }
                : { movingAverageSessions: 2, slopeComparisonSessions: 1 })
          } as TrendFilterConfig,
          eligibility: { ...DEFAULT_ELIGIBILITY[pol] }
        });

        for (const d of r.sim.gates!.decisions)
          if (d.gate?.drawdown && !d.gate.drawdown.pass) assert.ok(d.gate.blockedBy!.includes('drawdown'));
      }
  });

  test('a continuation trigger goes through the same gate: blocked, counted and logged with its decision kind', () => {
    const days = [flatDay(D[0]!, 100), flatDay(D[1]!, 100), path(D[2]!, [100, 96, 94, 94, 94, 94]), flatDay(D[3]!, 95)];
    const ds = dsOf(days);
    const dd = new DrawdownRecoveryGate(ds, cfg({ lookbackSessions: 2, recoveryRetracementPercent: 50 }), 0);
    const gates = new EntryGates(
      ds,
      {
        trend: null,
        eligibility: null,
        bars: [],
        entry: { advanceFromRecentLowPercent: NaN, recentLowLookbackBars: NaN },
        drawdown: dd
      },
      new DecisionLog(),
      { enter: () => assert.fail('no entry'), flatWithoutOrder: () => true }
    );
    const t = ds.sCloseTime[3]!;

    dd.advanceTo(t);

    const r = gates.check(3, t, 95, 'continuation', { episode: 'C-1' });

    assert.equal(r.pass, false);
    assert.equal(r.reason, 'drawdown_gate');
    assert.deepEqual(r.blockedBy, ['drawdown']);
    assert.equal(gates.gateBlocks.continuation!.drawdown_gate, 1);
    assert.deepEqual(dd.transitions.at(-1)!.values, {
      decisionKind: 'continuation',
      episode: 'C-1',
      state: 'recovery_required'
    });
    assert.deepEqual(dd.episodes[0]!.blocked, { continuation: 1 });
    // the controller ends a vetoed trigger's episode with the gate reason (continuation.ts veto: the trend-veto rule)
    const end: EpisodeEnd = r.reason;

    assert.equal(end, 'drawdown_gate');
    void DEFAULT_CONTINUATION;
  });
});

// ----- review fixes: same-instant trades, stale closes, the detector's own history, every blocker named -----

describe('ordering and history (each a regression test of a review finding)', () => {
  test('an opening/reopening trade at a decision instant is handed to the gate after the decision (it may be its fill)', () => {
    // DD-1 on D[1] (100 → 90, threshold 97); confirmed on D[2] at the 09:31 close (98, Y = 0); the 10:00 bar reopens
    // at 96 after missing minutes. A decision at 10:00 is taken on the state before that trade, and fills at it.
    const days: Day[] = [
      flatDay(D[0]!, 100),
      path(D[1]!, [100, 95, 90, 90, 90, 90]),
      {
        date: D[2]!,
        bars: [
          ['09:30', 98],
          ['10:00', 98, 96],
          ['10:01', 98]
        ]
      }
    ];
    const sessions = days.map(session);
    const ds = fixtureDataset(sessions);
    const T = et(D[2]!, '10:00');
    const p: RiseTradingParams = { ...BASE, drawdownGate: cfg({ confirmationSessions: 0 }) };
    const sim = simulateTrading(ds, [{ id: 'x', sessionIndex: 2, time: T, price: 98, trigger: NaN, reference: NaN }], {
      symbol: 'TEST',
      firstSession: 0,
      endSession: 2,
      exit: exitParamsOf(p),
      book: bookSettingsOf(p),
      drawdown: p.drawdownGate
    });
    const o = sim.outcomes[0]!;

    assert.equal(o.status, 'filled');
    assert.equal(o.gate!.gate!.drawdown!.state, 'recovery_confirmed');
    assert.equal(sim.trades[0]!.entryTime, T);
    assert.equal(sim.trades[0]!.entryRawPrice, 96); // the reopening trade: after the decision, never known to it
    const reset = sim.gates!.drawdown!.transitions.find((t) => t.event === 'confirmation_lost')!;

    assert.equal([reset.values.cause, reset.t].join(), ['reopen_gap', T].join()); // the gate still saw it, after
    // the guard: a pending CLOSE of the instant refuses the decision; a pending TRADE of the instant does not
    const g = new DrawdownRecoveryGate(ds, cfg({ confirmationSessions: 0 }), 0);

    g.advanceTo(T - 1);
    assert.equal([g.nextTime, g.nextIsFull].join(), [T, false].join());
    assert.equal(g.check(2, T, 98).state, 'recovery_confirmed');
    g.step();
    assert.throws(() => g.check(2, T + 60, 98), /not processed before the decision/);
  });

  test('a session without a closing print: its last minute is not re-observed at the close (no stale qualification)', () => {
    // DD-1 on Monday 02-11 (threshold 97); a streak from Tuesday's 16:00 closing print (m0 = 16:00, Y = 1); Wednesday's
    // data end at 15:40 without a print
    const days: Day[] = [
      flatDay('2019-02-08', 100),
      path('2019-02-11', [100, 95, 90, 90, 90, 90]),
      {
        date: '2019-02-12',
        bars: [
          ['09:30', 96],
          ['15:59', 96]
        ],
        closingPrint: 98
      },
      {
        date: '2019-02-13',
        bars: [
          ['09:30', 98],
          ['15:40', 98]
        ],
        closingPrint: null
      },
      {
        date: '2019-02-14',
        bars: [
          ['09:30', 98],
          ['09:31', 98]
        ]
      }
    ];
    const { g } = runGate(days, cfg({ confirmationSessions: 1 }));

    assert.equal(at(g.transitions.find((t) => t.event === 'recovery_started')!), '2019-02-12 16:00');
    // not at 16:00 on 02-13 from the stale 15:40 close: at the next actual observation, 02-14 09:31
    assert.deepEqual(confirmedAt(g), ['2019-02-14 09:31']);
  });

  test('the detector reads N sessions before the run whatever else is loaded: identical records with more warm-up', () => {
    const days = randomDays(5, 60);
    const c = cfg({
      lookbackSessions: 5,
      dipThresholdPercent: 2,
      recoveryRetracementPercent: 60,
      confirmationSessions: 1
    });
    // the same run start (days[20]) with 20 sessions loaded before it (another option's warm-up) or with exactly 5
    const a = new DrawdownRecoveryGate(dsOf(days), c, 20);
    const b = new DrawdownRecoveryGate(dsOf(days.slice(15)), c, 5);

    a.advanceTo(Infinity);
    b.advanceTo(Infinity);
    assert.equal([a.origin, b.origin].join(), '15,0');
    const view = (g: DrawdownRecoveryGate) =>
      g.transitions.map((t) => [t.t, t.event, t.price, t.episode, t.state, t.reason].join('|'));

    assert.ok(a.transitions.length > 5);
    assert.deepEqual(view(a), view(b));
    assert.equal([a.windowCompleteAt(19), a.windowCompleteAt(20)].join(), 'false,true');
  });

  test('blockedBy names every blocker, the initial-stop availability included', () => {
    const ds = dsOf([flatDay(D[0]!, 100), flatDay(D[1]!, 100), flatDay(D[2]!, 100)]);
    const dd = new DrawdownRecoveryGate(ds, cfg(), 0);
    const gates = new EntryGates(
      ds,
      {
        trend: null,
        eligibility: null,
        bars: [],
        entry: { advanceFromRecentLowPercent: NaN, recentLowLookbackBars: NaN },
        drawdown: dd,
        protection: () => ({ pass: false, reason: 'insufficient_history', text: 'no ATR history', values: {} })
      },
      new DecisionLog(),
      { enter: () => assert.fail('no entry'), flatWithoutOrder: () => true }
    );

    dd.advanceTo(ds.sCloseTime[2]!);
    const r = gates.check(2, ds.sCloseTime[2]!, 100, 'base_signal');

    assert.equal([r.pass, r.reason, r.drawdown!.pass].join(), 'false,insufficient_history,true');
    assert.deepEqual(r.blockedBy, ['protection']);
  });
});
