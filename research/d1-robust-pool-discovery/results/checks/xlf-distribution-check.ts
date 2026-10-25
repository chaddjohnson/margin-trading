// Integrity check only (no strategy is run): XLF session highs around the 2016-09-19 XLRE in-kind distribution.
import { canonicalDataFile, groupMarketSessions, loadCsvMinuteBacktestData } from '#lib';

const sessions = groupMarketSessions(await loadCsvMinuteBacktestData('XLF', canonicalDataFile('XLF', 'data')));
const idx = (date: string) => sessions.findIndex((s) => s.date >= date);
const arm = idx('2017-06-15');
const spin = idx('2016-09-19');
const preMax = Math.max(...sessions.slice(Math.max(0, arm - 250), spin).map((s) => s.high));
let worst = { date: '', excess: -Infinity, L: 0 };

// For every arming-or-later session t and every lookback L ≤ 250 whose window reaches before the distribution:
for (let t = arm; t < sessions.length && t - 250 < spin; t++) {
  for (let L = t - spin + 1; L <= 250; L++) {
    const window = sessions.slice(t - L, t);
    const pre = Math.max(...window.filter((_, i) => t - L + i < spin).map((s) => s.high));
    const post = Math.max(...window.filter((_, i) => t - L + i >= spin).map((s) => s.high));

    if (pre - post > worst.excess) {
      worst = { date: sessions[t]!.date, excess: pre - post, L };
    }
  }
}

console.log(JSON.stringify({ spinDate: sessions[spin]!.date, armDate: sessions[arm]!.date, preSpinMaxInReach: preMax, postSpinMaxBeforeArm: Math.max(...sessions.slice(spin, arm).map((s) => s.high)), worstPreMinusPost: worst }));
