// P6-TSLA data tools (brief §2; PROTOCOL.md §3) — NON-OFFICIAL (GPU_POLICY_PURPOSE=diagnostic), no strategy is evaluated:
//   pins         cut the five byte-prefix doors from data/TSLA/data.csv and write research/tsla-d1-growth/data/DOOR_PINS.json
//                (sizes, rows, sha256, last rows, session counts, the split ledger's sha256)
//   audit        research/tsla-d1-growth/TSLA_DATA_AUDIT.json: source, entitlement, coverage, session and minute
//                completeness against the NYSE calendar, early closes, duplicates and order (the import scan), intra-session
//                gaps (halts), minute outliers, the splits (raw gaps, adjusted moves, two independent sources), hashes, the
//                fetch commands and API accounting. Price RETURNS of 2025–2026 are never computed or shown (coverage and
//                integrity counts only for the validation period).
//   suitability  research/tsla-d1-growth/reports/data/SUITABILITY.json: DEVELOPMENT-ONLY (2016-01-04 → 2024-12-31, door D24)
//                descriptive statistics — dip / recovery episodes, uptrend opportunities, signal density, holding windows,
//                overnight gaps, volatility, liquidity, split effects. Report-only: no box, budget or rule is derived from it.
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import type { MarketSession } from '#types';
import { nyseCalendarCoverage, nyseEarlyCloses, nyseHolidays } from '../../src/lib/calendar.ts';
import { adjustSessionsForSplits, readSplits } from '../../src/lib/corporateActions.ts';
import { resolveDataset } from '../../src/lib/dataset.ts';
import { loadDatasetSessions } from '../../src/lib/evaluation.ts';
import { chronology, repoRoot, researchDir } from '../../src/tsla-d1-growth/context.ts';
import {
  type DoorPins,
  canonicalFile,
  cutDoors,
  doorFile,
  doorNames,
  doorPinsFile,
  doorSessions,
  doorSpecs,
  readPins,
  sha256File,
  splitsLedgerFile
} from '../../src/tsla-d1-growth/doors.ts';
import { purposeOf, writeJson } from './common.ts';

const args = process.argv.slice(2);
const cmd = args[0];
const rel = (f: string) => path.relative(repoRoot, f);
const now = () => new Date().toISOString();
const r4 = (x: number) => Math.round(x * 1e4) / 1e4;
const q = (xs: number[], p: number) => {
  const s = [...xs].sort((a, b) => a - b);

  if (!s.length) return NaN;

  const i = (s.length - 1) * p;
  const lo = Math.floor(i);

  return s[lo]! + (s[Math.min(lo + 1, s.length - 1)]! - s[lo]!) * (i - lo);
};

// ----- pins -----

const pins = async () => {
  purposeOf(['diagnostic']);

  const cut = cutDoors();
  const provisional: DoorPins = {
    kind: 'P6-TSLA door pins',
    canonical: cut.canonical,
    splitsLedger: { file: rel(splitsLedgerFile), sha256: sha256File(splitsLedgerFile) },
    doors: Object.fromEntries(doorNames.map((d) => [d, { ...cut.doors[d], sessions: 0 }])) as DoorPins['doors']
  };

  for (const d of doorNames) {
    const { history } = await doorSessions(d, provisional);

    if (history[0]!.date !== chronology.firstSession || history.at(-1)!.date !== doorSpecs[d].last)
      throw new Error(`${d} covers ${history[0]!.date} → ${history.at(-1)!.date}, not ${chronology.firstSession} → ${doorSpecs[d].last}`);
    provisional.doors[d].sessions = history.length;
  }

  if (fs.existsSync(doorPinsFile)) {
    const old = fs.readFileSync(doorPinsFile, 'utf8');

    if (old !== `${JSON.stringify(provisional, null, 1)}\n`) throw new Error(`${rel(doorPinsFile)} exists with other content: never rewritten`);
    console.log('pins unchanged');
    return;
  }
  writeJson(doorPinsFile, provisional);
  console.log(JSON.stringify(Object.fromEntries(doorNames.map((d) => [d, { sessions: provisional.doors[d].sessions, rows: provisional.doors[d].rows, sha256: provisional.doors[d].sha256.slice(0, 16) }]))));
};

// ----- audit -----

const expectedSessions = (first: string, last: string) => {
  const out: string[] = [];

  for (let t = Date.parse(`${first}T12:00:00Z`); t <= Date.parse(`${last}T12:00:00Z`); t += 86_400_000) {
    const d = new Date(t);
    const day = d.getUTCDay();
    const iso = d.toISOString().slice(0, 10);

    if (day !== 0 && day !== 6 && !nyseHolidays.has(iso)) out.push(iso);
  }
  return out;
};

const minuteOf = (s: MarketSession, t: number) => Math.round((t - s.openTime) / 60);

const sessionQuality = (sessions: MarketSession[]) => {
  const rows = sessions.map((s) => {
    const scheduled = Math.round((s.closeTime - s.openTime) / 60);
    const minutes = new Set(s.bars.map((b) => minuteOf(s, b.time)));
    let maxGap = 0;
    let gapsGe5 = 0;

    for (let i = 1; i < s.bars.length; i++) {
      const g = Math.round((s.bars[i]!.time - s.bars[i - 1]!.time) / 60) - 1;

      if (g > maxGap) maxGap = g;
      if (g >= 5) gapsGe5++;
    }

    let dupes = 0;
    let disorder = 0;

    for (let i = 1; i < s.bars.length; i++) {
      if (s.bars[i]!.time === s.bars[i - 1]!.time) dupes++;
      if (s.bars[i]!.time < s.bars[i - 1]!.time) disorder++;
    }

    const bad = s.bars.filter((b) => !(b.low > 0 && b.high >= b.low && b.open >= b.low && b.open <= b.high && b.close >= b.low && b.close <= b.high)).length;

    return { date: s.date, early: s.isEarlyClose, scheduled, bars: s.bars.length, distinct: minutes.size, missing: scheduled - minutes.size, maxGap, gapsGe5, dupes, disorder, bad, closingPrint: s.closingPrint !== undefined };
  });

  return rows;
};

const audit = async () => {
  purposeOf(['diagnostic']);

  const p = readPins();
  const report = JSON.parse(fs.readFileSync(path.join(repoRoot, 'data/TSLA/dataset-report.json'), 'utf8')) as Record<string, unknown>;
  const raw = await loadDatasetSessions({ dataset: resolveDataset('TSLA', doorFile('FULL')), startDate: chronology.firstSession, endDate: chronology.endpoint, warmupSessions: 0 });
  const sessions = raw.history;
  const ledger = readSplits(splitsLedgerFile);
  const adjusted = adjustSessionsForSplits(sessions, 'TSLA', ledger).sessions;
  const expected = expectedSessions(chronology.firstSession, chronology.endpoint);
  const have = new Set(sessions.map((s) => s.date));
  const missingSessions = expected.filter((d) => !have.has(d));
  const extraSessions = sessions.map((s) => s.date).filter((d) => !expected.includes(d));
  const qrows = sessionQuality(sessions);
  const dev = (d: string) => d <= chronology.developmentEnd;
  const summarize = (rows: typeof qrows) => ({
    sessions: rows.length,
    earlyCloses: rows.filter((r) => r.early).length,
    earlyClosesExpected: [...nyseEarlyCloses].filter((d) => d >= rows[0]!.date && d <= rows.at(-1)!.date).length,
    scheduledMinutes: rows.reduce((a, r) => a + r.scheduled, 0),
    minuteBars: rows.reduce((a, r) => a + r.bars, 0),
    missingMinutes: rows.reduce((a, r) => a + r.missing, 0),
    missingMinuteShare: r4(rows.reduce((a, r) => a + r.missing, 0) / rows.reduce((a, r) => a + r.scheduled, 0)),
    sessionsMissingOver5: rows.filter((r) => r.missing > 5).length,
    sparseSessions: rows.filter((r) => r.distinct < r.scheduled / 2).length,
    intraSessionGapsGe5Minutes: rows.reduce((a, r) => a + r.gapsGe5, 0),
    sessionsWithGapGe5: rows.filter((r) => r.gapsGe5 > 0).map((r) => ({ date: r.date, maxGap: r.maxGap, gaps: r.gapsGe5 })).slice(0, 40),
    longestGap: rows.reduce((a, r) => (r.maxGap > a.maxGap ? { date: r.date, maxGap: r.maxGap } : a), { date: '', maxGap: 0 }),
    duplicateMinuteBars: rows.reduce((a, r) => a + r.dupes, 0),
    outOfOrderBars: rows.reduce((a, r) => a + r.disorder, 0),
    inconsistentOhlcBars: rows.reduce((a, r) => a + r.bad, 0),
    sessionsWithClosingPrint: rows.filter((r) => r.closingPrint).length
  });
  // minute outliers (integrity only; adjusted prices so a split is not an outlier): |close / previous close − 1| > 5 %
  const outliers = (from: string, to: string) => {
    let n = 0;
    const list: { date: string; minute: number; move: number }[] = [];

    for (const s of adjusted) {
      if (s.date < from || s.date > to) continue;
      for (let i = 1; i < s.bars.length; i++) {
        const m = s.bars[i]!.close / s.bars[i - 1]!.close - 1;

        if (Math.abs(m) > 0.05) {
          n++;
          if (list.length < 20) list.push({ date: s.date, minute: minuteOf(s, s.bars[i]!.time), move: r4(m) });
        }
      }
    }
    return { threshold: '|minute close-to-close| > 5 %', count: n, examples: from <= chronology.developmentEnd ? list : `(${list.length} listed internally; validation-period moves are not shown)` };
  };
  const splitChecks = ledger.map((sp) => {
    const i = sessions.findIndex((s) => s.date === sp.effectiveDate);
    const prev = sessions[i - 1]!;
    const cur = sessions[i]!;
    const ai = adjusted.findIndex((s) => s.date === sp.effectiveDate);

    return {
      effectiveDate: sp.effectiveDate,
      ratio: sp.ratio,
      rawPreviousClose: prev.close,
      rawOpen: cur.open,
      rawOvernightRatio: r4(prev.close / cur.open),
      adjustedOvernightMove: r4(adjusted[ai]!.open / adjusted[ai - 1]!.close - 1),
      withinTenPercent: Math.abs(adjusted[ai]!.open / adjusted[ai - 1]!.close - 1) < 0.1
    };
  });
  // unexplained split-sized overnight gaps in the raw data (ratio outside [0.6, 1.6]) other than the registered splits
  const unexplained: { date: string; ratio: number }[] = [];

  for (let i = 1; i < sessions.length; i++) {
    const r = sessions[i]!.open / sessions[i - 1]!.close;

    if ((r < 0.6 || r > 1.6) && !ledger.some((sp) => sp.effectiveDate === sessions[i]!.date)) unexplained.push({ date: sessions[i]!.date, ratio: r4(r) });
  }

  // independent source: Yahoo daily (split-adjusted to today's share units), 2010-06-29 → 2024-12-31 (no 2025–2026 data
  // requested); the ratio of our forward-adjusted close (2016 share units) to Yahoo's adjusted close must be the constant
  // 15 = 5 × 3 around each split (± a few sessions)
  const yFile = path.join(researchDir, 'cache', 'independent', 'yahoo-TSLA-daily-2010-2024.json');
  const y = JSON.parse(fs.readFileSync(yFile, 'utf8')) as { chart: { result: { timestamp: number[]; indicators: { quote: { close: number[] }[] }; events?: { splits?: Record<string, { date: number; numerator: number; denominator: number }> } }[] } };
  const yr = y.chart.result[0]!;
  const ny = (t: number) => new Date((t - 5 * 3600) * 1000).toISOString().slice(0, 10);
  const yClose = new Map(yr.timestamp.map((t, i) => [ny(t), yr.indicators.quote[0]!.close[i]!]));
  const independent = ledger.map((sp) => {
    const i = adjusted.findIndex((s) => s.date === sp.effectiveDate);
    const window = adjusted.slice(i - 5, i + 5).map((s) => ({ date: s.date, ours: s.close, yahoo: yClose.get(s.date) ?? null, ratio: yClose.get(s.date) ? r4(s.close / yClose.get(s.date)!) : null }));
    const ratios = window.map((w) => w.ratio).filter((x): x is number => x !== null);

    return { effectiveDate: sp.effectiveDate, sessions: window.length, ratioMin: Math.min(...ratios), ratioMax: Math.max(...ratios), maxDeviationFrom15: r4(Math.max(...ratios.map((x) => Math.abs(x / 15 - 1)))), window };
  });
  const ySplits = Object.values(yr.events?.splits ?? {}).map((s) => ({ date: ny(s.date), ratio: s.numerator / s.denominator }));
  const download = fs.existsSync(path.join(researchDir, 'cache', 'logs', 'download.log'))
    ? fs.readFileSync(path.join(researchDir, 'cache', 'logs', 'download.log'), 'utf8')
    : '';
  const pages = (download.match(/^Page \d+:/gm) ?? []).length;
  const record = {
    kind: 'P6-TSLA data audit',
    written: now(),
    symbol: 'TSLA',
    source: {
      vendor: 'Alpaca Markets Data API v2 (https://data.alpaca.markets/v2/stocks/TSLA/bars)',
      feed: 'sip (consolidated, all US exchanges)',
      timeframe: '1Min',
      adjustment: 'raw (the repository convention: splits are applied by the study’s ledger at load time)',
      tool: 'scripts/download.sh TSLA 2016-01-04 2026-10-30 (via data/download.sh), then `npm run datasets -- import TSLA --keep-source` and `npm run datasets -- verify TSLA`',
      credentials: 'the existing ALPACA_API_KEY / ALPACA_SECRET_KEY of the repository’s git-ignored .env, exported into the download shell only; never printed, logged or committed',
      entitlement: 'the existing account’s historical SIP access (the same used for the 61 canonical ETF files); no new service purchased',
      cost: 'no incremental cost (existing credentials; no paid upgrade)',
      apiAccounting: { pages, barsPerPageLimit: 10000, requests: pages, rateLimit: 'Alpaca documents 200 requests per minute on its basic plan; the download made one sequential request per page' }
    },
    canonical: p.canonical,
    importReport: { file: 'data/TSLA/dataset-report.json', sha256: sha256File(path.join(repoRoot, 'data/TSLA/dataset-report.json')), status: report.status, anomalies: report.anomalies, errors: report.errors, scan: report.scan },
    doors: p.doors,
    endpoint: {
      study: chronology.endpoint,
      rule: 'the program’s common complete endpoint (brief §2: historically 2026-10-30); TSLA has a complete regular session on it and no missing session before it (below); data after it were not downloaded and are outside every door',
      obtainable: 'later TSLA sessions are obtainable from the same source (it serves bars through the previous completed session); they were deliberately not requested, so that no study reads them'
    },
    calendar: {
      coverage: nyseCalendarCoverage,
      expectedSessions: expected.length,
      sessions: sessions.length,
      missingSessions,
      extraSessions,
      firstSession: sessions[0]!.date,
      lastSession: sessions.at(-1)!.date
    },
    completeness: { development: summarize(qrows.filter((r) => dev(r.date))), validation: summarize(qrows.filter((r) => !dev(r.date))) },
    minuteOutliers: { development: outliers(chronology.firstSession, chronology.developmentEnd), validation: outliers(chronology.validationStart, chronology.endpoint) },
    splits: {
      ledger: { file: rel(splitsLedgerFile), sha256: sha256File(splitsLedgerFile), events: ledger.map((s) => ({ effectiveDate: s.effectiveDate, ratio: s.ratio })) },
      rawGaps: splitChecks,
      unexplainedSplitSizedGaps: unexplained,
      independent: { source: 'Yahoo Finance chart API v8 daily (split events and split-adjusted closes), retrieved 2026-11-25 through 2024-12-31 only', file: rel(yFile), sha256: sha256File(yFile), splitEvents: ySplits, priceRatios: independent },
      adjustment: 'forward: from each effective date prices × ratio, volumes ÷ ratio (src/lib/corporateActions.ts adjustSessionsForSplits) — every door is in 2016-01-04 share units; ×5 from 2020-08-31, ×15 from 2022-08-25; fractional shares, so P&L, cost basis, stops and share counts are those of holding the multiplied shares (no double adjustment: the raw file holds unadjusted prices)'
    },
    sessionsSha256: createHash('sha256').update(JSON.stringify(sessions.map((s) => [s.date, s.open, s.high, s.low, s.close, s.volume, s.bars.length]))).digest('hex'),
    blockers: [] as string[]
  };

  if (missingSessions.length) record.blockers.push(`missing sessions: ${missingSessions.join(', ')}`);
  if (unexplained.length) record.blockers.push(`unexplained split-sized gaps: ${unexplained.map((u) => u.date).join(', ')}`);
  if (!splitChecks.every((s) => s.withinTenPercent)) record.blockers.push('a registered split does not explain its raw gap');
  if (independent.some((x) => x.maxDeviationFrom15 > 0.01)) record.blockers.push('the independent split-adjusted closes disagree with the ledger by more than 1 %');
  if (JSON.stringify(ySplits) !== JSON.stringify(ledger.map((s) => ({ date: s.effectiveDate, ratio: s.ratio })))) record.blockers.push('the independent split events differ from the ledger');

  writeJson(path.join(researchDir, 'TSLA_DATA_AUDIT.json'), record);
  console.log(JSON.stringify({ sessions: sessions.length, missingSessions: missingSessions.length, blockers: record.blockers, splits: splitChecks, independent: independent.map((x) => x.maxDeviationFrom15) }));
};

// ----- suitability (development only) -----

const suitability = async () => {
  purposeOf(['diagnostic']);

  const { history } = await doorSessions('D24');
  const s = history;

  if (s.at(-1)!.date !== chronology.developmentEnd) throw new Error('the suitability analysis reads D24 only');

  const close = s.map((x) => x.close);
  const ret = close.slice(1).map((c, i) => c / close[i]! - 1);
  const gaps = s.slice(1).map((x, i) => x.open / s[i]!.close - 1);
  const years: Record<string, { sessions: number; ret: number; maxDd: number }> = {};

  for (const yr of [...new Set(s.map((x) => x.date.slice(0, 4)))]) {
    const xs = s.filter((x) => x.date.startsWith(yr));
    let peak = xs[0]!.close;
    let dd = 0;

    for (const x of xs) {
      peak = Math.max(peak, x.high);
      dd = Math.max(dd, 1 - x.low / peak);
    }
    years[yr] = { sessions: xs.length, ret: r4(xs.at(-1)!.close / xs[0]!.open - 1), maxDd: r4(dd) };
  }

  // dip episodes: the close falls ≥ X below the highest high of the previous L sessions (D1's deep-entry condition at
  // session resolution); an episode ends when the close regains that reference high; counted once per episode
  const dips = (L: number, X: number) => {
    let episodes = 0;
    let inEp = false;
    let ref = 0;
    const recover: number[] = [];
    let start = 0;

    for (let i = L; i < s.length; i++) {
      const hi = Math.max(...s.slice(i - L, i).map((x) => x.high));

      if (!inEp && s[i]!.close <= hi * (1 - X)) {
        episodes++;
        inEp = true;
        ref = hi;
        start = i;
      } else if (inEp && s[i]!.close >= ref) {
        inEp = false;
        recover.push(i - start);
      }
    }
    return { episodes, recovered: recover.length, medianSessionsToRecover: recover.length ? q(recover, 0.5) : null };
  };
  // uptrend opportunities: the close rises ≥ A above the lowest low of the previous N sessions (Growth's rise entry)
  const rises = (N: number, A: number) => {
    let n = 0;
    let armed = true;

    for (let i = N; i < s.length; i++) {
      const lo = Math.min(...s.slice(i - N, i).map((x) => x.low));
      const up = s[i]!.close >= lo * (1 + A);

      if (up && armed) n++;
      armed = !up;
    }
    return n;
  };
  // holding windows: the worst loss of a position bought at a close and marked at every later close of the next H calendar days
  const holding = (H: number) => {
    const losses: number[] = [];
    const t = s.map((x) => Date.parse(`${x.date}T00:00:00Z`) / 86_400_000);

    for (let i = 0; i < s.length; i++) {
      let worst = 0;

      for (let j = i + 1; j < s.length && t[j]! - t[i]! <= H; j++) worst = Math.min(worst, s[j]!.low / s[i]!.close - 1);
      losses.push(worst);
    }
    return { p50: r4(q(losses, 0.5)), p05: r4(q(losses, 0.05)), p01: r4(q(losses, 0.01)), worst: r4(Math.min(...losses)), shareBelowMinus20: r4(losses.filter((x) => x < -0.2).length / losses.length), shareBelowMinus35: r4(losses.filter((x) => x < -0.35).length / losses.length) };
  };
  const rawDollarVolume = s.map((x) => x.close * x.volume); // invariant to the forward adjustment (price × ratio, volume ÷ ratio)
  const record = {
    kind: 'P6-TSLA development-only suitability analysis (report-only)',
    written: now(),
    window: `${s[0]!.date} → ${s.at(-1)!.date} (door D24; ${s.length} sessions; never 2025–2026)`,
    use: 'descriptive only: no parameter box, budget, cell, rule or selection was derived from it (the boxes are the original D1 / Growth domains)',
    dailyReturns: { mean: r4(ret.reduce((a, x) => a + x, 0) / ret.length), sd: r4(Math.sqrt(ret.reduce((a, x) => a + x * x, 0) / ret.length)), annualizedVol: r4(Math.sqrt(252) * Math.sqrt(ret.reduce((a, x) => a + x * x, 0) / ret.length)), p01: r4(q(ret, 0.01)), p99: r4(q(ret, 0.99)), worst: r4(Math.min(...ret)), best: r4(Math.max(...ret)) },
    overnightGaps: { p01: r4(q(gaps, 0.01)), p99: r4(q(gaps, 0.99)), worst: r4(Math.min(...gaps)), best: r4(Math.max(...gaps)), countAbsOver5: gaps.filter((g) => Math.abs(g) > 0.05).length, countAbsOver10: gaps.filter((g) => Math.abs(g) > 0.1).length, largestDown: gaps.map((g, i) => ({ date: s[i + 1]!.date, gap: r4(g) })).sort((a, b) => a.gap - b.gap).slice(0, 8) },
    years,
    dipEpisodes: Object.fromEntries([20, 60, 120, 250].map((L) => [`L${L}`, Object.fromEntries([0.08, 0.1, 0.15, 0.2, 0.25, 0.3].map((X) => [`X${X * 100}`, dips(L, X)]))])),
    riseOpportunities: Object.fromEntries([20, 60, 120, 250].map((N) => [`N${N}`, Object.fromEntries([0.05, 0.1, 0.2].map((A) => [`A${A * 100}`, rises(N, A)]))])),
    holdingWindows: { 'H15 calendar days': holding(15), 'H30 calendar days': holding(30), 'H60 calendar days': holding(60) },
    liquidity: { medianDailyDollarVolume: Math.round(q(rawDollarVolume, 0.5)), p05DailyDollarVolume: Math.round(q(rawDollarVolume, 0.05)), medianMinuteBarsPerSession: q(s.map((x) => x.bars.length), 0.5) },
    splitEffects: 'two forward splits inside development (2020-08-31 5:1, 2022-08-25 3:1): adjusted overnight moves in TSLA_DATA_AUDIT.json; with fractional shares and percentage rules, the adjustment changes no decision',
    reference: 'the D1 box: X 8–30 %, trailing stop 3–15 %, hold 3–30 calendar days, L 20–250 sessions; the Growth box: rise 1–20 % from a 10–250-bar low, trailing stop 3–15 %, hold 3–30 days'
  };

  writeJson(path.join(researchDir, 'reports', 'data', 'SUITABILITY.json'), record);
  console.log(JSON.stringify({ sessions: s.length, vol: record.dailyReturns.annualizedVol, gaps: record.overnightGaps.countAbsOver10 }));
};

const main = async () => {
  switch (cmd) {
    case 'pins':
      return pins();
    case 'audit':
      return audit();
    case 'suitability':
      return suitability();
    default:
      throw new Error(`unknown command ${cmd ?? ''} (pins | audit | suitability)`);
  }
};

await main();
void canonicalFile;
