// Data audit for the prepared Stooq series: coverage, calendar gaps, structural OHLCV checks, parity with
// existing repository files, adjustment evidence, liquidity and per-window eligibility.
//
// Holdout discipline: for sessions after the research end only counts, dates and structural validity
// (positive prices, low <= open/close <= high) are examined. Price-movement checks (jumps), liquidity and
// comparisons are restricted to sessions on or before the research end.
import { groupMarketSessions, loadCsvBacktestData, loadCsvMinuteBacktestData } from '#lib';
import fs from 'fs-extra';
import path from 'node:path';
import type { Protocol } from '../protocol.ts';
import { toDate } from '../series.ts';
import { isRequired, requiredUniverse } from '../universe.ts';
import { type Manifest, type ManifestEntry, writeJsonAtomic, writeTextAtomic } from './prepare.ts';

export interface WindowEligibility {
  status: 'eligible' | 'partial' | 'unavailable';
  sessions: number;
  first?: string;
  last?: string;
  note: string;
}

export interface SymbolAudit {
  symbol: string;
  required: boolean;
  group: string;
  status: 'ok' | 'failed';
  failureReason?: string;
  source?: string;
  firstDate?: string;
  lastDate?: string;
  sessions: number;
  duplicateDates: number;
  nonAscending: number;
  missingSessions: { total: number; research: number; holdout: number; examples: string[] };
  extraSessions: { total: number; examples: string[] };
  ohlcViolations: { count: number; examples: string[] };
  nonPositive: number;
  zeroVolume: number;
  repeatedBars: number;
  jumps: { date: string; closeChange: number; openGap: number }[]; // research period only
  medianDollarVolume2014to2023?: number;
  sessionsBeforeTrainingStart: number;
  repoComparison: { file: string; overlap: number; identical: number; differing: number; examples: string[] }[];
  eligibility: Record<string, WindowEligibility>;
  warnings: string[];
}

export interface AdjustmentEvidence {
  symbol: string;
  minuteFile: string;
  rows: { date: string; rawClose: number; stooqClose: number; ratio: number }[];
  conclusion: string;
}

const median = (values: number[]) => {
  if (values.length === 0) {
    return NaN;
  }

  const sorted = [...values].sort((a, b) => a - b);
  const middle = sorted.length >> 1;

  return sorted.length % 2 ? sorted[middle]! : (sorted[middle - 1]! + sorted[middle]!) / 2;
};

const daysBetween = (a: string, b: string) => (Date.parse(b) - Date.parse(a)) / 86400000;

const windowEligibility = (
  dates: string[],
  start: string,
  end: string,
  protocol: Protocol,
  needsWarmup: boolean
): WindowEligibility => {
  const inside = dates.filter((date) => date >= start && date <= end);
  const before = dates.filter((date) => date < start).length;
  const first = inside[0];
  const last = inside.at(-1);

  if (!first || !last) {
    return { status: 'unavailable', sessions: 0, note: 'no sessions in the window' };
  }

  const startsLate = daysBetween(start, first) > protocol.coverageToleranceDays;
  const endsEarly = end !== '9999-12-31' && daysBetween(last, end) > protocol.coverageToleranceDays;
  const shortWarmup = needsWarmup && before < protocol.warmupSessions;
  const notes = [
    startsLate ? `data starts ${first}` : '',
    endsEarly ? `data ends ${last}` : '',
    shortWarmup ? `only ${before} sessions of warmup before ${start} (needs ${protocol.warmupSessions})` : ''
  ].filter(Boolean);

  return {
    status: notes.length ? 'partial' : 'eligible',
    sessions: inside.length,
    first,
    last,
    note: notes.join('; ') || 'full coverage'
  };
};

const repoFiles = async (symbol: string) => {
  const dir = `data/${symbol}`;

  if (!(await fs.pathExists(dir))) {
    return [];
  }

  return (await fs.readdir(dir))
    .filter((name) => name.endsWith('.csv') && !name.includes('minute'))
    .sort()
    .map((name) => path.join(dir, name));
};

const auditSymbol = async (
  symbol: string,
  entry: ManifestEntry | undefined,
  calendar: Set<string> | undefined,
  calendarDates: string[],
  protocol: Protocol
): Promise<SymbolAudit> => {
  const member = requiredUniverse.find((candidate) => candidate.symbol === symbol);
  const base: SymbolAudit = {
    symbol,
    required: isRequired(symbol),
    group: member?.group ?? 'Supplemental',
    status: 'failed',
    sessions: 0,
    duplicateDates: 0,
    nonAscending: 0,
    missingSessions: { total: 0, research: 0, holdout: 0, examples: [] },
    extraSessions: { total: 0, examples: [] },
    ohlcViolations: { count: 0, examples: [] },
    nonPositive: 0,
    zeroVolume: 0,
    repeatedBars: 0,
    jumps: [],
    sessionsBeforeTrainingStart: 0,
    repoComparison: [],
    eligibility: {},
    warnings: []
  };

  if (!entry || entry.status !== 'ok' || !entry.processed) {
    return { ...base, failureReason: entry?.failureReason ?? 'not prepared' };
  }

  const ticks = await loadCsvBacktestData(symbol, entry.processed.path);
  const dates = ticks.map((tick) => toDate(tick.time));
  const researchEnd = protocol.researchEnd;
  const audit: SymbolAudit = {
    ...base,
    status: 'ok',
    source: entry.source,
    firstDate: dates[0],
    lastDate: dates.at(-1),
    sessions: ticks.length,
    warnings: [...entry.warnings]
  };
  const seen = new Set<string>();

  ticks.forEach((tick, index) => {
    const date = dates[index]!;
    const previous = ticks[index - 1];

    if (seen.has(date)) {
      audit.duplicateDates++;
    }

    seen.add(date);

    if (previous && tick.time <= previous.time) {
      audit.nonAscending++;
    }

    const prices = [tick.open, tick.high, tick.low, tick.close];

    if (prices.some((price) => !(price > 0)) || !(tick.volume >= 0)) {
      audit.nonPositive++;
    }

    if (
      tick.low > Math.min(tick.open, tick.close) ||
      tick.high < Math.max(tick.open, tick.close) ||
      tick.low > tick.high
    ) {
      audit.ohlcViolations.count++;

      if (audit.ohlcViolations.examples.length < 5) {
        audit.ohlcViolations.examples.push(date);
      }
    }

    if (tick.volume === 0) {
      audit.zeroVolume++;
    }

    if (
      previous &&
      tick.open === previous.open &&
      tick.high === previous.high &&
      tick.low === previous.low &&
      tick.close === previous.close
    ) {
      audit.repeatedBars++;
    }

    // Price movement is examined only up to the research end.
    if (previous && date <= researchEnd) {
      const closeChange = tick.close / previous.close - 1;
      const openGap = tick.open / previous.close - 1;

      if (Math.abs(closeChange) > 0.25 || Math.abs(openGap) > 0.25) {
        audit.jumps.push({ date, closeChange, openGap });
      }
    }
  });

  if (calendar) {
    const own = new Set(dates);
    const first = dates[0]!;
    const last = dates.at(-1)!;
    const missing = calendarDates.filter((date) => date >= first && date <= last && !own.has(date));
    const calendarFirst = calendarDates[0]!;
    const calendarLast = calendarDates.at(-1)!;
    const extra = dates.filter((date) => date >= calendarFirst && date <= calendarLast && !calendar.has(date));

    audit.missingSessions = {
      total: missing.length,
      research: missing.filter((date) => date <= researchEnd).length,
      holdout: missing.filter((date) => date > researchEnd).length,
      examples: missing.slice(0, 8)
    };
    audit.extraSessions = { total: extra.length, examples: extra.slice(0, 8) };
  }

  const dollarVolumes = ticks
    .filter((_tick, index) => dates[index]! >= '2014-01-01' && dates[index]! <= researchEnd)
    .map((tick) => tick.close * tick.volume);

  audit.medianDollarVolume2014to2023 = dollarVolumes.length ? median(dollarVolumes) : undefined;

  const trainingStart = protocol.folds[0]?.train.start ?? protocol.final.train.start;

  audit.sessionsBeforeTrainingStart = dates.filter((date) => date < trainingStart).length;

  // Comparison with existing repository daily files, research period only.
  const byDate = new Map(ticks.map((tick, index) => [dates[index]!, tick]));

  for (const file of await repoFiles(symbol)) {
    const repoTicks = await loadCsvBacktestData(symbol, file);
    let overlap = 0;
    let identical = 0;
    const examples: string[] = [];

    for (const repoTick of repoTicks) {
      const date = toDate(repoTick.time);
      const tick = byDate.get(date);

      if (!tick || date > researchEnd) {
        continue;
      }

      overlap++;

      if (
        tick.open === repoTick.open &&
        tick.high === repoTick.high &&
        tick.low === repoTick.low &&
        tick.close === repoTick.close &&
        tick.volume === repoTick.volume
      ) {
        identical++;
      } else if (examples.length < 3) {
        examples.push(date);
      }
    }

    audit.repoComparison.push({ file, overlap, identical, differing: overlap - identical, examples });
  }

  const latest = '9999-12-31';

  audit.eligibility = {
    stress: windowEligibility(dates, protocol.stress.start, protocol.stress.end, protocol, false),
    ...Object.fromEntries(
      protocol.folds.flatMap((fold) => [
        [`${fold.id}:train`, windowEligibility(dates, fold.train.start, fold.train.end, protocol, true)],
        [`${fold.id}:validation`, windowEligibility(dates, fold.validation.start, fold.validation.end, protocol, false)]
      ])
    ),
    [`${protocol.final.id}:train`]: windowEligibility(
      dates,
      protocol.final.train.start,
      protocol.final.train.end,
      protocol,
      true
    ),
    holdout: windowEligibility(
      dates,
      protocol.holdout.start,
      protocol.holdout.end === 'latest' ? latest : protocol.holdout.end,
      protocol,
      false
    )
  };

  if (audit.eligibility.stress!.status !== 'unavailable') {
    audit.eligibility.stress!.note += '; the stress test starts once a candidate has its full lookback of history';
  }

  if (audit.duplicateDates || audit.nonAscending || audit.nonPositive || audit.ohlcViolations.count) {
    audit.warnings.push('Structural data problems found; see the counts.');
  }

  if (audit.jumps.length) {
    audit.warnings.push(
      `${audit.jumps.length} close-to-close or open-gap moves above 25% on or before ${researchEnd} (possible unadjusted corporate action or genuine crash); inspect before trusting results.`
    );
  }

  return audit;
};

// Compares Stooq closes with raw closing-auction prices from the repository's one-minute files, at the
// last session of each year. A constant ratio means split adjustment only; a ratio that changes year to
// year means distributions are also adjusted.
export const adjustmentEvidence = async (manifest: Manifest, researchEnd: string): Promise<AdjustmentEvidence[]> => {
  const results: AdjustmentEvidence[] = [];

  for (const [symbol, minuteFile] of [
    ['VGT', 'data/VGT/VGT-2016-2025-1-minute.csv'],
    ['VOOG', 'data/VOOG/VOOG-2016-2025-1-minute.csv']
  ] as const) {
    const entry = manifest.entries[symbol];

    if (!entry?.processed || !(await fs.pathExists(minuteFile))) {
      continue;
    }

    const stooq = await loadCsvBacktestData(symbol, entry.processed.path);
    const stooqByDate = new Map(stooq.map((tick) => [toDate(tick.time), tick.close]));
    const sessions = groupMarketSessions(await loadCsvMinuteBacktestData(symbol, minuteFile)).filter(
      (session) => session.date <= researchEnd
    );
    const yearEnds = new Map<string, (typeof sessions)[number]>();

    for (const session of sessions) {
      yearEnds.set(session.date.slice(0, 4), session);
    }

    const rows = [...yearEnds.values()]
      .filter((session) => stooqByDate.has(session.date))
      .map((session) => {
        const stooqClose = stooqByDate.get(session.date)!;

        return { date: session.date, rawClose: session.close, stooqClose, ratio: session.close / stooqClose };
      });
    const ratios = rows.map((row) => row.ratio);
    const spread = ratios.length ? Math.max(...ratios) / Math.min(...ratios) - 1 : 0;

    results.push({
      symbol,
      minuteFile,
      rows,
      conclusion:
        spread > 0.01
          ? `The raw/Stooq ratio drifts by ${(spread * 100).toFixed(1)}% across year ends, falling over time: Stooq prices are back-adjusted for distributions as well as splits.`
          : 'The raw/Stooq ratio is constant: split adjustment only.'
    });
  }

  return results;
};

const formatMoney = (value: number | undefined) =>
  value === undefined || Number.isNaN(value) ? 'n/a' : `$${(value / 1e6).toFixed(1)}M`;

const adjustmentAssumption = () =>
  'Stooq back-adjusts its daily history for splits and, judging by the evidence below, distributions; Stooq does not document the method, so the convention is labeled unverified. Volume is split-adjusted (fractional values appear).';

const renderDataAudit = (
  manifest: Manifest,
  audits: SymbolAudit[],
  evidence: AdjustmentEvidence[],
  protocol: Protocol
) => {
  const lines: string[] = [];
  const required = audits.filter((audit) => audit.required);
  const supplemental = audits.filter((audit) => !audit.required);
  const anyEntry = Object.values(manifest.entries).find((entry) => entry.archive);
  const httpDetails = [
    ...new Set(
      Object.values(manifest.entries).flatMap((entry) =>
        entry.attempts
          .filter((attempt) => attempt.source === 'stooq-http')
          .map((attempt) => `${attempt.status}: ${attempt.detail}`)
      )
    )
  ];

  lines.push('# Data audit: Stooq daily OHLCV for the 21 required targets', '');
  lines.push(
    `Generated ${new Date().toISOString()} from \`data/stooq/manifest.json\` (copied to [data/stooq-manifest.json](data/stooq-manifest.json); full machine-readable audit in [data/data-audit.json](data/data-audit.json)). Transform version \`${manifest.transformVersion}\`.`,
    ''
  );
  lines.push('## Acquisition outcome', '');
  lines.push(
    'The pipeline first requests each symbol\'s Stooq historical-data page (`https://stooq.com/q/d/?f=20050101&t=<end>&s=<symbol>.us&c=1`) to follow its "Download data in csv file..." link. **Every HTTP request was refused** during preparation; the responses recorded were:',
    ''
  );

  for (const detail of httpDetails.slice(0, 6)) {
    lines.push(`- \`${detail.slice(0, 220)}\``);
  }

  lines.push(
    '',
    'In an earlier manual probe with a browser user agent, both the page and the `q/d/l/` CSV endpoint returned a JavaScript proof-of-work "verify your browser" page instead of data. That is an access control, and the pipeline does not try to defeat it. A blocked response is recorded as `blocked`, never as a missing symbol.',
    ''
  );

  if (anyEntry?.archive) {
    lines.push(
      `Every symbol was therefore taken from the **Stooq bulk daily archive** already on disk (\`${anyEntry.archive.path}\`, sha256 \`${anyEntry.archive.sha256}\`, members dated ${anyEntry.archive.memberModified.slice(0, 10)}). This is Stooq data, not another provider. Each member file is saved unmodified under \`data/stooq/raw/<SYMBOL>/\`, and its header row is removed and its columns mapped to the repository format (see the transformation section). **Consequence: the series end on ${audits.find((audit) => audit.lastDate)?.lastDate}, not on the requested end date**, so the final holdout runs from 2024-01-01 to that date.`,
      ''
    );
  }

  lines.push(
    'To use fresh page downloads instead, save each symbol\'s CSV from the page\'s "Download data in csv file..." link in a browser into `data/stooq/inbox/` (Stooq names it `<symbol>_us_d.csv`), then run `npm run optimizer -- prepare-data --refresh --offline`. The same header-removal and `;` → `|` conversion, parity check and manifest apply.',
    ''
  );

  lines.push('## Required universe (21 symbols)', '');
  lines.push(
    '| Symbol | Group | Status | Source | First | Last | Sessions | Missing vs SPY (≤2023 / holdout) | Extra | OHLC issues | Jumps >25% (≤2023) | Median $ volume 2014–2023 | Warmup before 2014 |'
  );
  lines.push('|---|---|---|---|---|---|---|---|---|---|---|---|---|');

  for (const audit of required) {
    lines.push(
      `| ${audit.symbol} | ${audit.group} | ${audit.status} | ${audit.source ?? '-'} | ${audit.firstDate ?? '-'} | ${audit.lastDate ?? '-'} | ${audit.sessions} | ${audit.missingSessions.research} / ${audit.missingSessions.holdout} | ${audit.extraSessions.total} | ${audit.ohlcViolations.count} | ${audit.jumps.length} | ${formatMoney(audit.medianDollarVolume2014to2023)} | ${audit.sessionsBeforeTrainingStart} |`
    );
  }

  lines.push('', '### Per-window eligibility', '');

  const windowNames = Object.keys(required[0]?.eligibility ?? {});

  lines.push(`| Symbol | ${windowNames.join(' | ')} |`);
  lines.push(`|---|${windowNames.map(() => '---').join('|')}|`);

  for (const audit of required) {
    lines.push(
      `| ${audit.symbol} | ${windowNames.map((name) => audit.eligibility[name]?.status ?? '-').join(' | ')} |`
    );
  }

  lines.push('', 'Notes on partial or unavailable windows:', '');

  for (const audit of required) {
    for (const [name, eligibility] of Object.entries(audit.eligibility)) {
      if (eligibility.status !== 'eligible') {
        lines.push(`- **${audit.symbol} ${name}**: ${eligibility.status}, ${eligibility.note}.`);
      }
    }
  }

  lines.push('', '### Inclusion decisions', '');

  for (const audit of required) {
    const research = protocol.folds.every((fold) => audit.eligibility[`${fold.id}:train`]?.status === 'eligible');

    lines.push(
      `- **${audit.symbol}**: ${
        audit.status !== 'ok'
          ? `EXCLUDED: ${audit.failureReason}`
          : research
            ? 'included in every walk-forward fold, the final shortlist and the holdout.'
            : 'included where eligible; see the window notes above.'
      }${audit.warnings.length ? ` Warnings: ${audit.warnings.join(' ')}` : ''}`
    );
  }

  lines.push('', '## Raw versus processed parity', '');
  lines.push(
    'After every write the processed file is re-read with `loadCsvBacktestData` (src/lib/csv.ts), the loader the optimizer uses, and every session is compared with the values parsed independently from the raw file.',
    ''
  );
  lines.push('| Symbol | Raw file | Raw sha256 | Processed sha256 | Rows | Mismatches |');
  lines.push('|---|---|---|---|---|---|');

  for (const audit of required) {
    const entry = manifest.entries[audit.symbol];

    lines.push(
      `| ${audit.symbol} | \`${entry?.raw?.path ?? '-'}\` | \`${entry?.raw?.sha256.slice(0, 16) ?? '-'}…\` | \`${entry?.processed?.sha256.slice(0, 16) ?? '-'}…\` | ${entry?.parity?.rows ?? '-'} | ${entry?.parity?.mismatches ?? '-'} |`
    );
  }

  lines.push('', '## Transformation', '');
  lines.push(
    '- **Page CSV** (HTTP or inbox): exactly the first row (the header `Date,Open,High,Low,Close,Volume`) is removed. With `;` as the delimiter, every `;` in the data rows becomes `|`; with `,`, rows go through a CSV parser and are re-joined with `|`, so a quoted value can never be split. LF and CRLF endings and a missing final newline are accepted; a repeated header, blank rows or non-numeric fields are rejected.',
    '- **Bulk archive TXT** (used here): the header row `<TICKER>,<PER>,<DATE>,<TIME>,<OPEN>,<HIGH>,<LOW>,<CLOSE>,<VOL>,<OPENINT>` is removed; ticker and period (`D`) are checked; `YYYYMMDD` becomes `YYYY-MM-DD`; TIME and OPENINT are dropped. The source is comma-delimited, so the `;` → `|` replacement does not apply and the rows go through the explicit field mapping instead.',
    '- Output: headerless `YYYY-MM-DD|open|high|low|close|volume`, ascending, numeric text kept verbatim (no rounding), written atomically to `data/stooq/processed/<SYMBOL>/<SYMBOL>-stooq-daily.csv`. Existing files under `data/<SYMBOL>/` are never touched.',
    ''
  );

  lines.push('## Corporate actions and price convention', '');
  lines.push(`Assumption recorded in the manifest: ${adjustmentAssumption()}`, '');

  for (const item of evidence) {
    lines.push(
      `**${item.symbol}** (raw closing prints from \`${item.minuteFile}\` vs Stooq closes, last session of each year through ${protocol.researchEnd}):`,
      ''
    );
    lines.push('| Date | Raw close | Stooq close | Raw / Stooq |', '|---|---|---|---|');

    for (const row of item.rows) {
      lines.push(`| ${row.date} | ${row.rawClose.toFixed(2)} | ${row.stooqClose} | ${row.ratio.toFixed(4)} |`);
    }

    lines.push('', item.conclusion, '');
  }

  lines.push(
    'Implications: back-adjusted prices fold distributions into price, so (1) backtested P&L includes dividends as if reinvested in the price path; the original strategy does not model dividends separately and is applied to these prices unchanged, (2) a trailing stop or dip computed on adjusted prices can differ slightly from one on the prices a broker would show, around ex-dividend dates, and (3) early adjusted prices and volumes are scaled, so dollar-volume figures are approximate. All 21 series come from the same source and convention; nothing is spliced across sources.',
    ''
  );

  lines.push('## Existing repository files compared (research period only)', '');
  lines.push('| Symbol | File | Overlapping sessions ≤ research end | Identical | Differing | Examples |');
  lines.push('|---|---|---|---|---|---|');

  for (const audit of audits) {
    for (const comparison of audit.repoComparison) {
      lines.push(
        `| ${audit.symbol} | \`${comparison.file}\` | ${comparison.overlap} | ${comparison.identical} | ${comparison.differing} | ${comparison.examples.join(', ')} |`
      );
    }
  }

  lines.push('', '## Jumps above 25% (research period)', '');

  const jumpRows = required.flatMap((audit) => audit.jumps.map((jump) => ({ symbol: audit.symbol, ...jump })));

  if (jumpRows.length === 0) {
    lines.push('None.');
  } else {
    lines.push('| Symbol | Date | Close change | Open gap |', '|---|---|---|---|');

    for (const jump of jumpRows) {
      lines.push(
        `| ${jump.symbol} | ${jump.date} | ${(jump.closeChange * 100).toFixed(1)}% | ${(jump.openGap * 100).toFixed(1)}% |`
      );
    }
  }

  lines.push('', '## Missing and extra sessions', '');
  lines.push(
    "Sessions are compared with SPY's dates from the same source. For sessions after the research end, only counts are reported. An *extra* session is a date the symbol has and SPY lacks: 2011-02-17, a regular NYSE session, is missing from SPY and from every series here except SOXX, which only affects pre-2014 history (stress-test and warmup sessions).",
    ''
  );

  for (const audit of required) {
    if (audit.missingSessions.total || audit.extraSessions.total) {
      lines.push(
        `- **${audit.symbol}**: ${audit.missingSessions.total} missing (${audit.missingSessions.research} on or before ${protocol.researchEnd}; examples ${audit.missingSessions.examples.filter((date) => date <= protocol.researchEnd).join(', ') || 'none'}), ${audit.extraSessions.total} extra (${audit.extraSessions.examples.filter((date) => date <= protocol.researchEnd).join(', ') || 'none shown'}).`
      );
    }
  }

  lines.push('', '## Bias and limitations', '');
  lines.push(
    '- **Survivorship and selection**: the 21 targets were chosen in 2026 and are all instruments that exist and are prominent today. Single stocks such as NVDA, META, AMD and AMZN are known long-run winners, so any dip-buying result on them is inflated by hindsight selection.',
    '- **Inception and truncation**: the bulk archive starts most ETFs on 2005-02-25 even where the fund is older, which limits the 2005–2013 stress window. VOO and VOOG (2010), SCHG (2009) and META (2012) have only partial or no stress history. None of this is backfilled.',
    '- **Correlation**: VGT, XLK, QQQ, IGV, VOOG, VUG, SCHG, IWF and the large-cap stocks are heavily overlapping; agreement among them is not independent confirmation.',
    '- **Liquidity**: all 21 are highly liquid in 2014–2023; fills at the close or a stop price are still idealized (see STRATEGY_BASELINE.md).',
    ''
  );

  if (supplemental.length) {
    lines.push('## Supplemental symbols (not part of the required scope)', '');

    for (const audit of supplemental) {
      lines.push(`- ${audit.symbol}: ${audit.status}, ${audit.firstDate ?? '-'}..${audit.lastDate ?? '-'}`);
    }

    lines.push('');
  }

  return `${lines.join('\n')}\n`;
};

export const runDataAudit = async (
  manifest: Manifest,
  symbols: string[],
  protocol: Protocol,
  outDir: string,
  log: (line: string) => void = () => {}
) => {
  const calendarEntry = manifest.entries.SPY;
  let calendar: Set<string> | undefined;
  let calendarDates: string[] = [];

  if (calendarEntry?.status === 'ok' && calendarEntry.processed) {
    calendarDates = (await loadCsvBacktestData('SPY', calendarEntry.processed.path)).map((tick) => toDate(tick.time));
    calendar = new Set(calendarDates);
  }

  const audits: SymbolAudit[] = [];

  for (const symbol of symbols) {
    audits.push(await auditSymbol(symbol, manifest.entries[symbol], calendar, calendarDates, protocol));
    log(`${symbol}: audited`);
  }

  const evidence = await adjustmentEvidence(manifest, protocol.researchEnd);

  await writeJsonAtomic(path.join(outDir, 'data', 'stooq-manifest.json'), manifest);
  await writeJsonAtomic(path.join(outDir, 'data', 'data-audit.json'), {
    generatedAtUtc: new Date().toISOString(),
    protocol: protocol.name,
    calendarReference: calendar ? 'SPY sessions in the same Stooq source' : 'none',
    audits,
    adjustmentEvidence: evidence
  });
  await writeTextAtomic(path.join(outDir, 'DATA_AUDIT.md'), renderDataAudit(manifest, audits, evidence, protocol));

  return audits;
};
