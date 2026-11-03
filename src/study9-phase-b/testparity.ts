// Test-door parity (PROTOCOL.md §8.5), inside every test stage, after the selection and the pre-test audit are sealed,
// before any T gate is computed; any difference throws, so the stage writes nothing (a computational problem to be
// diagnosed, never a selection input).
//   TP1  (every fold) the production replay (P9Evaluator.replay) equals the authoritative runNAllocator, 0 differences,
//        for every role holder of the fold (base, next-open, +25 bps) and every control (base) on the run to the
//        fold's test end (reviews m1, m15).
//   TP2  (F24 only) Study 8's sealed F24 test record is reproduced to the cent on the same run: all 13 Study 8 rows
//        carried here — its seven holders and B1, B5, frozen VG/VXR/VXRG, G-PA — on net, minute and daily DD, lots,
//        episodes, the funded-ledger signature and the 2025-01-02 → 2026-10-29 test-window net (review m2).
import fs from 'fs-extra';
import { engineParity } from './allocparity.ts';
import { type FoldKey, study8Holders } from './context.ts';
import type { P9Door } from './door.ts';
import { type Books, Lab, P9Evaluator, PointCache, baseSettings, settingsWith } from './engine.ts';
import { log, readSealed } from './records.ts';

const study8TestFile = 'research/study8-expanded-regime-d1/results/test/F24/test.json';
const study8ControlKey: Record<string, string> = {
  B1: 'B1',
  B5: 'B5',
  'VG-frozen': 'VG',
  'VXR-frozen': 'VXR',
  'VXRG-frozen': 'VXRG',
  'G-PA': 'G-PA'
};

interface Centre {
  net: number;
  dd: number;
  ddDaily: number;
  lots: number;
  episodes: number;
  signature: string;
}

interface Study8Test {
  holders: { rank: number; evidence: { centre: Centre }; deep: { test: { net: number } } }[];
  controls: Record<string, { evidence: { centre: Centre }; deep: { test: { net: number } } }>;
}

export const testDoorParity = async (
  door: P9Door,
  fold: FoldKey,
  frozen: { rankedByFold: Record<string, { track: string; id: string; books: Books }[]> },
  controls: Record<string, Books>
) => {
  const ev = new P9Evaluator(door);
  const holders = frozen.rankedByFold[fold] ?? [];
  const tp1: { who: string; setting: string; differences: number; lots: number }[] = [];
  const settingsList = [
    { key: 'base', settings: baseSettings },
    { key: 'nextOpen', settings: settingsWith({ stopFill: 'next-open' }) },
    { key: 'slip25', settings: settingsWith({ stopSlippageBps: 25 }) }
  ];

  for (const holder of holders) {
    for (const { key, settings } of settingsList) {
      const result = engineParity(door, ev, holder.books, settings);

      tp1.push({
        who: `${holder.track}/${holder.id}`,
        setting: key,
        differences: result.differences.length,
        lots: result.lots
      });
    }
  }

  for (const [key, books] of Object.entries(controls)) {
    const result = engineParity(door, ev, books, baseSettings);

    tp1.push({ who: `control:${key}`, setting: 'base', differences: result.differences.length, lots: result.lots });
  }

  const tp2: { key: string; fields: Record<string, [number | string, number | string]>; equal: boolean }[] = [];
  let expected = 0;

  if (fold === 'F24') {
    const s8 = await readSealed<Study8Test>(study8TestFile);
    const lab = new Lab(ev, PointCache.memory(door, 'test-parity'));

    for (const [key, books] of Object.entries(controls)) {
      const holder = study8Holders[key as keyof typeof study8Holders];
      const sealed = holder
        ? s8.holders.find((h) => h.rank === holder.rank)
        : study8ControlKey[key]
          ? s8.controls[study8ControlKey[key]!]
          : undefined;

      if (holder || study8ControlKey[key]) expected++;
      if (!sealed) continue;

      const record = lab.point(books);
      const c = sealed.evidence.centre;
      const fields: Record<string, [number | string, number | string]> = {
        net: [record.net, c.net],
        dd: [record.dd, c.dd],
        ddDaily: [record.ddDaily, c.ddDaily],
        lots: [record.lots, c.lots],
        episodes: [record.episodes, c.episodes],
        signature: [record.signature, c.signature],
        testNet: [record.periods['TEST-F24'] ?? NaN, sealed.deep.test.net]
      };
      const equal = Object.values(fields).every(([a, b]) =>
        typeof a === 'number' && typeof b === 'number' ? Math.abs(a - b) < 0.005 : a === b
      );

      tp2.push({ key, fields, equal });
    }
  }

  const tp2Pass = fold !== 'F24' || (expected === 13 && tp2.length === 13 && tp2.every((row) => row.equal));
  const passed = tp1.length > 0 && tp1.every((row) => row.differences === 0) && tp2Pass;
  const summary = {
    fold,
    TP1: { comparisons: tp1.length, differences: tp1.reduce((a, r) => a + r.differences, 0), rows: tp1 },
    TP2:
      fold === 'F24'
        ? {
            expected,
            reproduced: tp2.length,
            equal: tp2.filter((r) => r.equal).length,
            rows: tp2,
            study8TestRecord: {
              file: study8TestFile,
              bodyHash: ((await fs.readJson(study8TestFile)) as { bodyHash: string }).bodyHash
            }
          }
        : null,
    passed
  };

  log(
    `test-door parity ${fold}: TP1 ${summary.TP1.comparisons} comparisons, ${summary.TP1.differences} differences${fold === 'F24' ? `; TP2 ${tp2.filter((r) => r.equal).length}/${expected} equal` : ''}`
  );

  if (!passed)
    throw new Error(`test-door parity failed on ${fold}; the test stage writes nothing (diagnose; see AMENDMENTS.md)`);

  return summary;
};
