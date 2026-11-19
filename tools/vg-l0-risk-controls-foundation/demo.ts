// G6: deterministic demonstrations of every non-default mode on SYNTHETIC paths (PROTOCOL.md §12): the expected exit
// and blocked-entry records of families A–D and the decline gate. Correctness demonstrations, not performance claims.
// The same scenarios are asserted by src/d1-risk-controls/tests/book.test.ts.
import { runD1BookWithControls } from '../../src/d1-risk-controls/book.ts';
import type { D1RiskControls } from '../../src/d1-risk-controls/config.ts';
import { datasetOf } from '../../src/d1-risk-controls/tests/fixtures.ts';
import { type Day, crash, grid, pathOf, recovery, whipsaw } from '../../src/d1-risk-controls/tests/scenarios.ts';
import type { D1Grid } from '../../src/vg-d1-growth-joint/books.ts';
import { head, now, seal } from './common.ts';

const r2 = (x: number) => Math.round(x * 100) / 100;
const demo = (name: string, days: Day[], c: D1RiskControls | null, g: D1Grid = grid(), note = '') => {
  const ds = datasetOf(pathOf(days));
  const b = runD1BookWithControls(ds, 'VGT', g, c, { armStart: 0, accountingStart: 0, endIndex: ds.sessionCount - 1 });

  return {
    name,
    note,
    controls: b.rc.controls,
    grid: g,
    trades: b.trades.map((t) => {
      const x = b.rc.trades.find((y) => y.trade === t.id)!;

      return {
        trade: t.id,
        kind: t.kind,
        decision: ds.dates[t.dS],
        gate: x.gate,
        lossesBefore: x.lossesBefore,
        entry: t.eS >= 0 ? ds.dates[t.eS] : null,
        entryRaw: t.eRaw,
        protectiveLevel: x.protectiveLevel,
        hold: x.hold,
        exit: t.fills[0] ? { date: ds.dates[t.fills[0].s], bar: t.fills[0].k, raw: t.fills[0].raw, reason: t.fills[0].reason, control: x.exitControl } : null,
        open: t.open,
        net: r2(t.vNet)
      };
    }),
    events: b.rc.events.map((e) => ({ ...e, t: undefined })),
    summary: b.rc.summary
  };
};

const stop8: D1RiskControls = { protectiveStop: { mode: 'on', stopDistanceTenths: 80 } };

seal(
  'demonstrations.json',
  {
    stage: 'G6 demonstrations',
    at: now(),
    head: head(),
    note:
      'Synthetic paths (src/d1-risk-controls/tests/scenarios.ts): grid X 10%, Y 1%, trailing stop 5%, hold 5 calendar days, L 3 sessions, buffer 2%, P 5%, W 5. One $100,000 virtual book; 5 bps per side; 11% interest. Correctness demonstrations of the mechanics, not performance claims.',
    families: [
      demo('A legacy D1 on the crash path', crash, null, grid(), 'two maximum-hold losses, then an open lot'),
      demo('B protected D1 (8% stop) on the crash path', crash, stop8, grid(), 'a gap through the stop at 80 (level 82.8): loss −11.3%, larger than the 8% distance — not a loss cap'),
      demo(
        'C stop-protected unlimited hold (15% stop, hold disabled) on the crash path',
        crash,
        { protectiveStop: { mode: 'on', stopDistanceTenths: 150 }, hold: { mode: 'disabled' } },
        grid(),
        'no maximum-hold exit; stop-level fills at 76.5 and 66.3'
      ),
      demo(
        'D bounded adaptive hold (base 3, extended 20 days, progress 10%) + 8% stop on the crash path',
        crash,
        { ...stop8, hold: { mode: 'adaptive', extendedHoldDays: 20, progressTenths: 100 } },
        grid({ maximumHoldDays: 3 }),
        'no progress: the base hold (3 calendar days) applies with a loss at the open'
      ),
      demo(
        'D adaptive hold on the recovery path (base 3, extended 10, progress 5%)',
        recovery,
        { hold: { mode: 'adaptive', extendedHoldDays: 10, progressTenths: 50 } },
        grid({ maximumHoldDays: 3 }),
        'progress reached on 2021-03-08 (high 95 ≥ 94.5): extended from 2021-03-09; the trailing stop exits in profit'
      ),
      demo(
        'Decline gate K = 1, recovery 50%, cooldown 3 sessions + 8% stop on the crash path',
        crash,
        { ...stop8, declineGate: { mode: 'on', losses: 1, recoveryTenths: 500, maxBlockSessions: 3 } },
        grid(),
        'arming refused 2021-03-10 to 2021-03-12; the block expires at the 2021-03-12 close'
      ),
      demo(
        'Decline gate K = 2, recovery 100%, cooldown 10 on the whipsaw path',
        whipsaw,
        { declineGate: { mode: 'on', losses: 2, recoveryTenths: 1000, maxBlockSessions: 10 } },
        grid(),
        'one failure, then a profitable exit ends the episode; the continuation re-entry is untouched'
      )
    ]
  },
  'G6 demonstrations'
);
