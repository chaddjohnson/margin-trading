// The study's generated tables (report-only; never selects): read from the sealed search, qualification, frozen
// selection and validation records, plus development-period regime labels computed from the development door
// (VGT's own monthly return and realized volatility; the validation months are labelled from the validation run's
// ledger dates only, never from prices). Output: results/report/REPORT_TABLES.md and JSON/CSV beside it.
import path from 'node:path';
import fs from 'fs-extra';
import { quantile } from '../study8-expanded-regime-d1/stats.ts';
import { frozenSelectionFile, resultFile } from './context.ts';
import { loadDevelopmentSessions } from './data.ts';
import { log, readSealed, recordDoor, writeSealed } from './seal.ts';

type Json = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

const reportDir = resultFile('report');
const n0 = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? Math.round(v).toLocaleString('en-US') : String(v ?? ''));
const n2 = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v.toFixed(2) : String(v ?? ''));
const pct = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? `${(v * 100).toFixed(1)}%` : String(v ?? ''));
const table = (header: string[], rows: unknown[][]) =>
  [`| ${header.join(' | ')} |`, `|${header.map(() => '---').join('|')}|`, ...rows.map((r) => `| ${r.map((c) => String(c ?? '')).join(' | ')} |`)].join('\n');

// Development-period regimes from VGT's own daily closes (development door): per calendar month, the month's return
// (bull ≥ 0 > bear) and its realized volatility tercile (daily close-to-close returns).
const developmentRegimes = async () => {
  const loaded = await loadDevelopmentSessions();

  await recordDoor('development', 'report: development regime labels', loaded.sha256, loaded.lastDate);

  const months = new Map<string, number[]>();
  let previous = NaN;
  const monthStartClose = new Map<string, number>();
  const monthEndClose = new Map<string, number>();

  for (const session of loaded.sessions) {
    const month = session.date.slice(0, 7);

    if (!monthStartClose.has(month)) monthStartClose.set(month, Number.isNaN(previous) ? session.open : previous);
    monthEndClose.set(month, session.close);
    if (!Number.isNaN(previous)) months.set(month, [...(months.get(month) ?? []), Math.log(session.close / previous)]);
    previous = session.close;
  }

  const rows = [...months.entries()].map(([month, rets]) => {
    const mean = rets.reduce((a, b) => a + b, 0) / rets.length;
    const vol = Math.sqrt(rets.reduce((a, b) => a + (b - mean) ** 2, 0) / Math.max(1, rets.length - 1)) * Math.sqrt(252);

    return { month, ret: monthEndClose.get(month)! / monthStartClose.get(month)! - 1, vol };
  });
  const vols = rows.map((r) => r.vol);
  const lo = quantile(vols, 1 / 3);
  const hi = quantile(vols, 2 / 3);

  return Object.fromEntries(
    rows.map((r) => [r.month, { trend: r.ret >= 0 ? 'bull month' : 'bear month', vol: r.vol <= lo ? 'low vol' : r.vol <= hi ? 'mid vol' : 'high vol', ret: r.ret, annualVol: r.vol }])
  ) as Record<string, { trend: string; vol: string; ret: number; annualVol: number }>;
};

const ledgerOf = async (file: string) => {
  const [header, ...lines] = (await fs.readFile(file, 'utf8')).trim().split('\n');
  const cols = header!.split(',');

  return lines.map((line) => {
    const cells = line.match(/("([^"]|"")*"|[^,]*)(,|$)/g)!.map((c) => c.replace(/,$/, '').replace(/^"|"$/g, '').replace(/""/g, '"'));

    return Object.fromEntries(cols.map((c, i) => [c, cells[i]])) as Record<string, string>;
  });
};

export const runReport = async (args: string[]) => {
  void args;

  const search = await readSealed<Json>(resultFile('search', 'search.json'));
  const qualification = await readSealed<Json>(resultFile('qualify', 'qualification.json'));
  const frozen = await readSealed<Json>(frozenSelectionFile);
  const validationFile = resultFile('validation', 'validation.json');
  const validation = (await fs.pathExists(validationFile)) ? await readSealed<Json>(validationFile) : undefined;
  const regimes = await developmentRegimes();
  const out: string[] = [];

  out.push('# Intraday D1 (VGT) — generated tables', '', 'Generated from the sealed records by `npm run intraday-d1 -- report`. Report-only; nothing here selects.', '');

  // search funnel
  const c = search.counts;

  out.push('## Search funnel (development door, Study 8 V-track budget)', '');
  out.push(
    table(
      ['stage', 'value'],
      [
        ['Sobol screen centres', c.screen],
        ['plausible (DD < $35k, net > 0, lots ≥ ⌈C3/2⌉)', c.screenPlausible],
        ['promoted to rung 1', c.promoted],
        ['rung-1 archive (configurations)', c.archive],
        ['rung-1 feasible', c.r1Feasible],
        ['rung 2 evaluated / feasible', `${c.r2} / ${c.r2Feasible}`],
        ['rung 3 evaluated / feasible', `${c.r3} / ${c.r3Feasible}`],
        ['islands run', c.islandsRun],
        ['point evaluations', search.points],
        ['minutes', n2(search.seconds / 60)],
        ['T1 / T2 / T3', `${JSON.stringify(search.triggers.T1.islandsRun)} islands / ${search.triggers.T2.fired ? 'fired' : 'not fired'} / ${search.triggers.T3.fired ? 'fired' : 'not fired'}`]
      ]
    ),
    ''
  );

  // shortlist and qualification
  out.push('## Shortlist and qualification (development door; confirm 3 × 128)', '');
  out.push(
    table(
      ['#', 'pick', 'id', 'parameters', 'centre net', 'nb share', 'nb median/yr', 'nb p10/yr', 'p90 DD', 'qualified', 'failed gates'],
      qualification.candidates.map((cand: Json) => [
        cand.rank,
        cand.pick,
        cand.id,
        cand.describe,
        n0(cand.evidence.centre.net),
        pct(cand.evidence.decisive.nb.share),
        n0(cand.evidence.decisive.nb.medianPerYear),
        n0(cand.evidence.decisive.nb.p10PerYear),
        n0(cand.evidence.decisive.nb.p90Dd),
        cand.qualification.qualified ? 'yes' : 'no',
        cand.qualification.failed.join(', ')
      ])
    ),
    ''
  );
  out.push(
    `B1 (daily D1 primary, session clock, same economics) on the development door: centre net ${n0(qualification.controls.B1.centre.net)}, confirmation share ${pct(qualification.controls.B1.decisive.nb.share)}, median/yr ${n0(qualification.controls.B1.decisive.nb.medianPerYear)}, robust/yr ${n0(qualification.controls.B1.decisive.nb.robustPerYear)}.`,
    '',
    `PBO (report-only, CSCV over the 64 best rung-2 configurations × ${qualification.pbo.blocks?.length ?? 0} half-years): ${n2(qualification.pbo.pbo)}; selection → confirmation Spearman ${n2(qualification.decay.spearman)}.`,
    ''
  );
  out.push('## Frozen ranking', '');
  out.push(
    frozen.ranked.length
      ? table(
          ['rank', 'role', 'id', 'tier', 'confirmation robust/yr', 'B1 robust/yr', 'parameters'],
          frozen.ranked.map((h: Json) => [h.rank, h.role, h.id, h.tier, n0(h.robustPerYear), n0(h.b1RobustPerYear), h.describe])
        )
      : 'No role holder: no shortlist member qualified on the development door.',
    ''
  );

  if (validation) {
    out.push('## Validation (once, 2025-01-02 → 2026-10-30)', '', `Recommendation (pre-registered mapping): **${validation.recommendation}**.`, '');
    out.push(
      table(
        ['candidate', 'status', 'failed', 'DEV net', 'VAL net', '2025', '2026 (partial)', 'whole-run min DD', 'test share', 'test median VAL', 'break-even bps DEV / VAL'],
        validation.candidates.map((v: Json) => [
          `${v.label} ${v.id}`,
          v.status,
          v.gates.failed.join(', '),
          n0(v.centre.periods.DEV),
          n0(v.centre.periods.VAL),
          n0(v.centre.periods['2025']),
          n0(v.centre.periods['2026~partial']),
          n0(v.centre.dd),
          pct(v.evidence.decisive.nb.share),
          n0(v.evidence.decisive.test?.median),
          `${v.breakEvenBps.development.bps} / ${v.breakEvenBps.validation.bps}`
        ])
      ),
      '',
      `B1 (daily D1 primary) on the same run: DEV ${n0(validation.b1.periods.DEV)}, VAL ${n0(validation.b1.periods.VAL)}, 2025 ${n0(validation.b1.periods['2025'])}, 2026 ${n0(validation.b1.periods['2026~partial'])}.`,
      ''
    );

    for (const v of validation.candidates as Json[]) {
      out.push(`### ${v.label} ${v.id}: ${v.describe}`, '');
      out.push(
        table(
          ['year', 'window', 'trades', 'win %', 'avg win', 'avg loss', 'median', 'expectancy', 'gross pre-cost', 'costs', 'financing', 'net (by entry)', 'attributed', 'min DD in yr', 'daily DD in yr', 'PF', 'exposure %', 'worst', 'max loss streak'],
          v.years.map((y: Json) => [y.year, y.window, y.trades, n2(y.winRate), n0(y.avgWin), n0(y.avgLoss), n0(y.medianNet), n0(y.expectancy), n0(y.grossBeforeCosts), n0(y.costs), n0(y.financing), n0(y.net), n0(y.attributedNet), n0(y.minuteDrawdownInYear), n0(y.dailyDrawdownInYear), n2(y.profitFactor), n2(y.exposurePct), n0(y.worstTrade), y.maxConsecutiveLosses])
        ),
        ''
      );
      out.push(
        table(
          ['window', 'trades', 'win %', 'expectancy', 'net (by entry)', 'attributed', 'PF', 'median hold (min)', 'overnight trades', 'stop-level fills'],
          v.windows.map((w: Json) => [w.window, w.trades, n2(w.winRate), n0(w.expectancy), n0(w.net), n0(w.attributedNet), n2(w.profitFactor), n2(w.medianHoldMinutes), w.overnightTrades, w.stopLevelFills])
        ),
        ''
      );
      out.push(
        table(
          ['execution setting', 'DEV net', 'VAL net', 'whole-run min DD'],
          Object.entries(v.sensitivities as Record<string, Json>).map(([k, s]) => [k, n0(s.dev), n0(s.val), n0(s.dd)])
        ),
        '',
        `Pro-rata (exposure-time) interest instead of calendar nights: DEV net ${n0(v.proRataInterest.development.net)}, VAL net ${n0(v.proRataInterest.validation.net)}.`,
        ''
      );

      // regimes (development months by VGT's own trend and volatility tercile)
      const rows = await ledgerOf(v.ledger.file);
      const devRows = rows.filter((r) => r.entry_session! <= '2024-12-31');
      const byRegime = new Map<string, { n: number; net: number }>();

      for (const r of devRows) {
        const reg = regimes[r.entry_session!.slice(0, 7)];

        for (const key of [reg?.trend ?? 'n/a', reg?.vol ?? 'n/a']) {
          const cur = byRegime.get(key) ?? { n: 0, net: 0 };

          byRegime.set(key, { n: cur.n + 1, net: cur.net + Number(r.net) });
        }
      }

      out.push(
        'Development P&L by regime of the entry month (VGT monthly return sign; realized-volatility terciles of 2016–2024 months):',
        '',
        table(
          ['regime', 'trades', 'net', 'expectancy'],
          [...byRegime.entries()].sort().map(([k, s]) => [k, s.n, n0(s.net), n0(s.net / s.n)])
        ),
        '',
        `Frequency (development): ${JSON.stringify(v.frequency.development)}`,
        '',
        `Frequency (validation): ${JSON.stringify(v.frequency.validation)}`,
        '',
        `Concentration (development): ${JSON.stringify(v.concentration.development)}`,
        '',
        `Concentration (validation): ${JSON.stringify(v.concentration.validation)}`,
        ''
      );
    }
  }

  await fs.ensureDir(reportDir);

  const file = path.join(reportDir, 'REPORT_TABLES.md');

  await fs.writeFile(file, `${out.join('\n')}\n`);
  await writeSealed(path.join(reportDir, 'regimes.json'), { stage: 'REPORT_REGIMES', regimes }, { overwrite: true });
  log(`report tables written to ${file}`);
};
