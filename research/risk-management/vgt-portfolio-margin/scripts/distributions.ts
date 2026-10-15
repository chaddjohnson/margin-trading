// Builds the VOOG and VGT cash-distribution ledger from local files only (no provider records were
// available). The raw minute files give the tradable closes; the dividend-adjusted daily files fold every
// distribution into earlier prices. Their ratio is constant between ex-dates and steps down at each one:
//   adjusted = raw × A, and on an ex-date A_before = A_after × (1 − D / C_before)
// so the step m = ratio_after / ratio_before gives D = C_before × (1 − m), where C_before is the raw close
// of the session before the ex-date. The ex-date is the session that best separates the two ratio levels.
// Each level is the median of 5 sessions; the ex-date is refined with 3-session means.
//
// Where the adjusted file doesn't cover a distribution (VOOG before 2016-10-07), the amount and ex-date
// are estimated and labeled as such. Payment dates aren't in any local file and are always estimated.
//
// Usage: node --experimental-transform-types scripts/distributions.ts <out dir>
import type { MarketSession } from '#types';
import { groupMarketSessions, loadCsvMinuteBacktestData } from '#lib';
import crypto from 'node:crypto';
import fs from 'fs-extra';

const [, , outDir = ''] = process.argv;
const sources = {
  VOOG: { minute: 'data/VOOG/VOOG-2016-2025-1-minute.csv', adjusted: 'data/VOOG/VOOG-2016-2026.csv' },
  VGT: { minute: 'data/VGT/VGT-2016-2025-1-minute.csv', adjusted: 'data/VGT/VGT-2005-2026-2.csv' }
} as const;
type Etf = keyof typeof sources;

const window = 5;
const minimumStep = 0.0004; // a ratio step smaller than this (0.04%) is treated as noise
const t1Date = '2024-05-28'; // US equities moved from T+2 to T+1 settlement
const median = (values: number[]) => [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)]!;

export interface Distribution {
  etf: Etf;
  exDate: string;
  payDate: string;
  amount: number; // dollars per share
  amountMethod: 'derived' | 'estimated';
  exDateMethod: 'derived' | 'estimated';
  payDateMethod: 'estimated';
  closeBefore: number; // raw close of the session before the ex-date
  yield: number; // amount / closeBefore
  step: number; // 1 − m, or the estimated yield
  noise: number; // median absolute day-over-day ratio change around the ex-date
  note: string;
}

const sha256 = async (file: string) =>
  crypto
    .createHash('sha256')
    .update(await fs.readFile(file))
    .digest('hex');

const derive = async (etf: Etf, sessions: MarketSession[]) => {
  const adjusted = new Map(
    (await fs.readFile(sources[etf].adjusted, 'utf8'))
      .trim()
      .split('\n')
      .map((line) => {
        const [date, , , , close] = line.split('|');

        return [date!, Number(close)];
      })
  );
  const index = new Map(sessions.map((session, i) => [session.date, i]));
  // Every session counts; one without a closing print uses its last regular trade, and the medians absorb
  // that noise.
  const rows = sessions
    .filter((s) => adjusted.has(s.date))
    .map((s) => ({ date: s.date, ratio: s.close / adjusted.get(s.date)! }));
  const ratio = (from: number, to: number) => rows.slice(from, to).map((r) => r.ratio);
  const mean = (values: number[]) => values.reduce((a, b) => a + b, 0) / values.length;
  // The step measured with median windows either side of row i. With a clean step at row e it is full for
  // every i from e − 2 to e + 2, so a distribution shows as a run of about five candidate rows.
  const medianStep = (i: number) =>
    i < window || i + window > rows.length ? 0 : 1 - median(ratio(i, i + window)) / median(ratio(i - window, i));
  const steps = rows.map((_, i) => medianStep(i));
  const found: Distribution[] = [];

  for (let i = 0; i < rows.length; i++) {
    if (steps[i]! < minimumStep || (steps[i - 1] ?? 0) >= minimumStep) {
      continue;
    }

    let end = i;

    while (end + 1 < rows.length && steps[end + 1]! >= minimumStep) {
      end++;
    }

    // The ex-date is the row near the run's center with the sharpest change between 3-session means.
    const center = Math.round((i + end) / 2);
    let best = center;
    let bestJump = 0;

    for (let j = Math.max(3, center - 2); j <= Math.min(rows.length - 3, center + 2); j++) {
      const jump = 1 - mean(ratio(j, j + 3)) / mean(ratio(j - 3, j));

      if (jump > bestJump) {
        best = j;
        bestJump = jump;
      }
    }

    const step = medianStep(best);
    const exDate = rows[best]!.date;
    const sessionIndex = index.get(exDate)!;
    const closeBefore = sessions[sessionIndex - 1]!.close;
    const noise = median(
      rows.slice(Math.max(1, best - 20), best + 20).map((r, k, all) => Math.abs(r.ratio / (all[k - 1] ?? r).ratio - 1))
    );

    found.push({
      etf,
      exDate,
      payDate: payDateOf(sessions, sessionIndex),
      amount: closeBefore * step,
      amountMethod: 'derived',
      exDateMethod: 'derived',
      payDateMethod: 'estimated',
      closeBefore,
      yield: step,
      step,
      noise,
      note: ''
    });
    i = end;
  }

  return { found, firstAdjusted: rows[window]?.date ?? '' };
};

// Vanguard ETFs pay a few business days after the ex-date: modeled as 3 sessions under T+2 settlement and
// 2 sessions from the move to T+1. Not verified per distribution.
const payDateOf = (sessions: MarketSession[], exIndex: number) => {
  const exDate = sessions[exIndex]!.date;
  const offset = exDate >= t1Date ? 2 : 3;

  return sessions[Math.min(exIndex + offset, sessions.length - 1)]!.date;
};

const voogSessions = groupMarketSessions(await loadCsvMinuteBacktestData('VOOG', sources.VOOG.minute));
const vgtSessions = groupMarketSessions(await loadCsvMinuteBacktestData('VGT', sources.VGT.minute));
const voog = await derive('VOOG', voogSessions);
const vgt = await derive('VGT', vgtSessions);
const lastDate = vgtSessions.at(-1)!.date;

// VOOG before its adjusted file: the ex-date of VGT's distribution in the same quarter (the funds share
// Vanguard's quarterly schedule; see the match rate below) and VOOG's yield in the same quarter one year
// later, applied to VOOG's raw close before that ex-date.
const voogIndex = new Map(voogSessions.map((session, i) => [session.date, i]));
const estimated: Distribution[] = vgt.found
  .filter((d) => d.exDate < voog.firstAdjusted && d.exDate >= voogSessions[1]!.date)
  .map((v) => {
    const sameQuarterNextYear = voog.found.find(
      (d) =>
        Number(d.exDate.slice(0, 4)) === Number(v.exDate.slice(0, 4)) + 1 &&
        d.exDate.slice(5, 7) === v.exDate.slice(5, 7)
    )!;
    const i = voogIndex.get(v.exDate)!;
    const closeBefore = voogSessions[i - 1]!.close;

    return {
      etf: 'VOOG' as const,
      exDate: v.exDate,
      payDate: payDateOf(voogSessions, i),
      amount: closeBefore * sameQuarterNextYear.yield,
      amountMethod: 'estimated' as const,
      exDateMethod: 'estimated' as const,
      payDateMethod: 'estimated' as const,
      closeBefore,
      yield: sameQuarterNextYear.yield,
      step: sameQuarterNextYear.yield,
      noise: NaN,
      note: `VGT's ex-date; VOOG's ${sameQuarterNextYear.exDate} yield`
    };
  });

const distributions = [...estimated, ...voog.found, ...vgt.found]
  .filter((d) => d.exDate <= lastDate)
  .sort((a, b) => a.exDate.localeCompare(b.exDate) || a.etf.localeCompare(b.etf));

// Checks: quarterly cadence, ex-date agreement between the funds, signal against noise, and no split.
const byQuarter = (list: Distribution[]) =>
  new Map(list.map((d) => [`${d.exDate.slice(0, 4)}-${Math.ceil(Number(d.exDate.slice(5, 7)) / 3)}`, d]));
const voogQuarters = byQuarter(voog.found);
const vgtQuarters = byQuarter(vgt.found);
const sharedQuarters = [...voogQuarters.keys()].filter((q) => vgtQuarters.has(q));
const sameExDate = sharedQuarters.filter((q) => voogQuarters.get(q)!.exDate === vgtQuarters.get(q)!.exDate);
const largestRatioJump = (sessions: MarketSession[]) =>
  Math.max(...sessions.slice(1).map((s, i) => Math.abs(Math.log(s.open / sessions[i]!.close))));

const checks = {
  counts: {
    VOOG: distributions.filter((d) => d.etf === 'VOOG').length,
    VGT: distributions.filter((d) => d.etf === 'VGT').length
  },
  perYear: Object.fromEntries(
    [...new Set(distributions.map((d) => d.exDate.slice(0, 4)))].map((year) => [
      year,
      {
        VOOG: distributions.filter((d) => d.etf === 'VOOG' && d.exDate.startsWith(year)).length,
        VGT: distributions.filter((d) => d.etf === 'VGT' && d.exDate.startsWith(year)).length
      }
    ])
  ),
  sharedQuarters: sharedQuarters.length,
  sameExDateInSharedQuarters: sameExDate.length,
  differingExDates: sharedQuarters
    .filter((q) => !sameExDate.includes(q))
    .map((q) => `${voogQuarters.get(q)!.exDate} VOOG / ${vgtQuarters.get(q)!.exDate} VGT`),
  smallestStepToNoise: Math.min(
    ...distributions.filter((d) => d.amountMethod === 'derived').map((d) => d.step / d.noise)
  ),
  largestOvernightRawMove: { VOOG: largestRatioJump(voogSessions), VGT: largestRatioJump(vgtSessions) },
  voogFirstDerivable: voog.firstAdjusted
};

await fs.ensureDir(outDir);

const header =
  'etf,ex_date,pay_date,amount,amount_method,ex_date_method,pay_date_method,close_before,yield,step,noise,note';
const lines = distributions.map((d) =>
  [
    d.etf,
    d.exDate,
    d.payDate,
    d.amount,
    d.amountMethod,
    d.exDateMethod,
    d.payDateMethod,
    d.closeBefore,
    d.yield,
    d.step,
    d.noise,
    d.note
  ].join(',')
);

await fs.writeFile(`${outDir}/distributions.csv`, `${header}\n${lines.join('\n')}\n`);
await fs.writeFile(
  `${outDir}/manifest.json`,
  `${JSON.stringify(
    {
      generated: 'scripts/distributions.ts from local files only; no network sources',
      inputs: Object.fromEntries(
        await Promise.all(
          Object.values(sources)
            .flatMap((s) => [s.minute, s.adjusted])
            .map(async (file) => [file, await sha256(file)])
        )
      ),
      conventions: {
        amount: 'D = C_before × (1 − ratio_after / ratio_before), ratio = raw closing print / adjusted close',
        payDate: `ex-date + 3 sessions before ${t1Date}, + 2 sessions from it (estimated)`,
        estimatedVoog:
          "VOOG before its adjusted file: VGT's same-quarter ex-date, VOOG's same-quarter yield a year later"
      },
      checks
    },
    null,
    1
  )}\n`
);
console.info(JSON.stringify(checks, null, 1));
