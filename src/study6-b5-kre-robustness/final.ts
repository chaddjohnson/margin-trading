// The one-time final evaluation (PROTOCOL.md §10.9, §11.3, §11.4), refused unless FROZEN_SELECTION.json verifies: every
// shortlisted configuration and both controls on the continuous full history (W29) and the pinned endpoint (W13);
// periods FULL/DEV/VAL/FX/RECENT and years; the execution sensitivities and arming shifts; the joint N1 confirmation
// sets C1–C3, per-book N1 (C1 labels) and joint N2 (C1 labels); leave-one-year-out; concentration; the worst-drawdown
// trace; a paired stationary block bootstrap of daily mark differences against frozen B5; then the classification of
// the role holders and the go/no-go. `--confirm` re-runs it deterministically into confirmation.json.
import fs from 'fs-extra';
import { stationaryBootstrap } from '../b4-b5-robustness/analysis.ts';
import { Rng, deriveSeed } from '../optimizer/rng.ts';
import { quantile } from '../study5-gdx-b5-three-etf/grid.ts';
import { bookOrder, partB, resultFile, seedOf } from './context.ts';
import { openDoor, readVerifiedSelection } from './data.ts';
import { type Books, design, uniqueMask } from './designs.ts';
import { Lab, ceiling, lotContributions, minuteSeries, newYork, settingsWith } from './evaluate.ts';
import { ownPeriods } from './periods.ts';
import { log, nowIso, writeCsv, writeSealed } from './records.ts';

const five = [...bookOrder];
const { gates } = partB;

interface Entry {
  key: string;
  track: string;
  books: Books;
  searched: string[];
  control: boolean;
}

const nbhd = (lab: Lab, books: Books, perturb: string[], n: number, labels: (string | number)[], scale = 1) => {
  const points = design({ centre: books, perturb, n, labels, mode: 'clip', scale });
  const unique = uniqueMask(points, books);
  const records = points.filter((_point, index) => unique[index]).map((point) => lab.point(point.books));
  const dd = records.map((record) => record.dd);
  const fx = records.map((record) => record.periods.FX ?? NaN);

  return {
    n: points.length,
    unique: records.length,
    share: dd.filter((value) => value < ceiling).length / Math.max(1, dd.length),
    p90: quantile(dd, 0.9),
    ddMedian: quantile(dd, 0.5),
    netMedian: quantile(
      records.map((record) => record.net),
      0.5
    ),
    netP10: quantile(
      records.map((record) => record.net),
      0.1
    ),
    fxMedian: quantile(fx, 0.5),
    fxPositive: fx.filter((value) => value > 0).length / Math.max(1, fx.length)
  };
};

export const runFinal = async (confirm: boolean) => {
  const started = Date.now();
  const output = resultFile('partB', 'final', confirm ? 'confirmation.json' : 'final.json');

  if (!confirm && (await fs.pathExists(resultFile('partB', 'final', 'final.json')))) {
    throw new Error('the final evaluation already ran (final.json exists); only `final --confirm` may re-run it');
  }

  if (confirm && !(await fs.pathExists(resultFile('partB', 'final', 'final.json')))) {
    throw new Error('nothing to confirm: final.json does not exist');
  }

  const selection = (await readVerifiedSelection()) as unknown as {
    bodyHash: string;
    shortlist: (Entry & { gates: { qualified: boolean; partial: { improves: boolean } } })[];
    controls: { key: string; books: Books }[];
    roles: { role: string; key: string }[];
  };
  const entries: Entry[] = [
    ...selection.controls.map((control) => ({
      key: control.key,
      track: 'control',
      books: control.books,
      searched: [],
      control: true
    })),
    ...selection.shortlist.map((item) => ({ ...item, control: false }))
  ];
  const w29 = await openDoor('final', five, `final evaluation${confirm ? ' (confirmation)' : ''} W29`);
  const w13 = await openDoor('final', five, `final evaluation${confirm ? ' (confirmation)' : ''} W13`, 'W13');
  const lab = new Lab(w29);
  const lab13 = new Lab(w13);
  const c5Run = lab.replay(entries.find((entry) => entry.key === 'C5')!.books);
  const c5Daily = Array.from(c5Run.marks).map((mark, index, marks) =>
    index > 0 && Number.isFinite(marks[index - 1]!) ? mark - marks[index - 1]! : 0
  );
  const rows: Record<string, unknown>[] = [];
  const ledgers: Record<string, unknown>[] = [];

  for (const entry of entries) {
    const symbols = five.filter((symbol) => symbol in entry.books);
    const run = lab.replay(entry.books, undefined, true);
    const metrics = lab.metricsOf(run);
    const periods = ownPeriods(lab, run);
    const years = Object.fromEntries(Object.entries(periods).filter(([key]) => /^\d{4}$/.test(key)));
    const at13 = lab13.point(entry.books);
    const sensitivities = Object.fromEntries(
      partB.finalSensitivities.map((item) => {
        const { key, ...rest } = item;
        const point = lab.point(entry.books, settingsWith(rest));

        return [key, { net: point.net, dd: point.dd }];
      })
    );
    const confirmation = Array.from({ length: partB.confirmation.reps }, (_value, index) => ({
      rep: index + 1,
      ...nbhd(lab, entry.books, symbols, partB.confirmation.n, ['B', 'confirm', index + 1])
    }));
    const perBook = Object.fromEntries(
      symbols.map((symbol) => [
        symbol,
        nbhd(lab, entry.books, [symbol], partB.confirmation.bookN, ['B', 'confirm-book', symbol, 1])
      ])
    );
    const n2 = nbhd(lab, entry.books, symbols, partB.confirmation.n2, ['B', 'confirm-n2', 1], 2);
    const series = minuteSeries(lab, run, entry.books);
    const trace = lotContributions(series, series.peakIndex, series.troughIndex);
    const positive = run.lots.map((lot) => lot.net).sort((a, b) => b - a);
    const daily = Array.from(run.marks).map((mark, index, marks) =>
      index > 0 && Number.isFinite(marks[index - 1]!) ? mark - marks[index - 1]! : 0
    );
    const first = w29.eligibilityIndex;
    const diff = daily.slice(first).map((value, index) => value - c5Daily[first + index]!);
    const boot =
      entry.key === 'C5'
        ? undefined
        : stationaryBootstrap(
            [diff],
            partB.bootstrap.blockLength,
            partB.bootstrap.resamples,
            new Rng(deriveSeed(...seedOf('B', 'bootstrap', entry.key)))
          )[0]!;

    for (const lot of run.full?.lots ?? []) {
      const real = lot as unknown as {
        symbol: string;
        entryTime: number;
        exitTime: number;
        exitReason: string;
        net: number;
        interest: number;
        exitIndex: number;
      };

      ledgers.push({
        config: entry.key,
        symbol: real.symbol,
        entry: newYork(real.entryTime),
        exit: real.exitIndex >= 0 ? newYork(real.exitTime) : 'open',
        exitReason: real.exitReason,
        interest: Math.round(real.interest * 100) / 100,
        net: Math.round(real.net * 100) / 100
      });
    }

    rows.push({
      key: entry.key,
      track: entry.track,
      control: entry.control,
      books: entry.books,
      w29: {
        net: metrics.net,
        dd: metrics.minuteDrawdown,
        ddPeak: newYork(series.points[series.peakIndex]?.time ?? 0),
        ddTrough: newYork(series.points[series.troughIndex]?.time ?? 0),
        ddDaily: metrics.dailyDrawdown,
        interest: metrics.interest,
        costs: metrics.costs,
        lots: metrics.lots,
        open: metrics.lots - run.lots.filter((lot) => !lot.open).length,
        bySymbol: metrics.bySymbol,
        occupancy: metrics.exposure,
        heldDays: metrics.heldDays,
        netPerOccupiedYear: metrics.net / (metrics.heldDays / 365),
        periods,
        seriesMatchesTracker: series.matchesTracker
      },
      w13: { net: at13.net, dd: at13.dd, lots: at13.lots },
      sensitivities,
      confirmation,
      perBook,
      n2,
      leaveOneYearOut: Object.fromEntries(Object.entries(years).map(([year, value]) => [year, metrics.net - value])),
      concentration: {
        top1: positive.slice(0, 1).reduce((a, b) => a + b, 0) / metrics.net,
        top3: positive.slice(0, 3).reduce((a, b) => a + b, 0) / metrics.net,
        largestYear: Math.max(...Object.values(years)),
        largestYearShare: Math.max(...Object.values(years)) / metrics.net
      },
      worstDrawdown: {
        dd: series.maximum,
        lots: trace.rows.map((row) => ({
          lot: `${row.symbol} ${newYork(row.entryTime)}`,
          exit: newYork(row.exitTime),
          exitReason: row.exitReason,
          contribution: Math.round(row.contribution * 100) / 100
        })),
        residual: trace.residual
      },
      bootstrapVsC5: boot
        ? {
            observed: diff.reduce((a, b) => a + b, 0),
            p05: quantile(boot, 0.05),
            p50: quantile(boot, 0.5),
            p95: quantile(boot, 0.95),
            shareAboveZero: boot.filter((value) => value > 0).length / boot.length
          }
        : null
    });
    log(
      `final ${entry.key}: W29 ${metrics.net.toFixed(2)} / ${metrics.minuteDrawdown.toFixed(2)}; C1 share ${confirmation[0]!.share.toFixed(3)} p90 ${Math.round(confirmation[0]!.p90)} (${lab.runs} runs)`
    );
  }

  // §11.3 classification of the role holders; §11.4 go / no-go.
  const classify = (key: string) => {
    const row = rows.find((item) => item.key === key)! as {
      w29: { dd: number; net: number; periods: Record<string, number> };
      confirmation: { share: number; p90: number; fxMedian: number }[];
      concentration: { largestYearShare: number };
    };
    const c1 = row.confirmation[0]!;
    const f = {
      F1: row.w29.dd < ceiling,
      F2: c1.share >= gates.share && c1.p90 < ceiling,
      F3: (row.w29.periods.FX ?? 0) > 0 && c1.fxMedian > 0,
      F4: row.concentration.largestYearShare <= gates.largestYearShare
    };
    const nominated = Object.values(f).every(Boolean);
    const marginal =
      nominated &&
      (c1.share < gates.marginalShare ||
        row.confirmation.slice(1).some((rep) => !(rep.share >= gates.share && rep.p90 < ceiling)));

    return {
      key,
      f,
      nominated,
      marginal,
      status: nominated
        ? marginal
          ? 'research nomination (marginal)'
          : 'research nomination'
        : 'not nominated (failed the retrospective stress)'
    };
  };
  const classification = selection.roles.map((role) => ({ role: role.role, ...classify(role.key) }));
  const nominations = classification.filter((item) => item.nominated);
  const partial = selection.shortlist.filter((item) => item.gates.partial.improves).map((item) => item.key);
  const decision = nominations.length
    ? 'qualified robustness improvement'
    : partial.length
      ? 'partial improvement only'
      : 'no credible improvement';
  const ledgerFile = await writeCsv(
    resultFile('partB', 'final', confirm ? 'lots-confirmation.csv' : 'lots.csv'),
    ledgers
  );
  const record = await writeSealed(output, {
    stage: confirm ? 'final-confirmation' : 'final',
    at: nowIso(),
    selection: selection.bodyHash,
    windows: { W29: w29.dates[w29.lastIndex], W13: w13.dates[w13.lastIndex] },
    rows,
    classification,
    partialImprovers: partial,
    decision,
    ledgerFile,
    runs: lab.runs + lab13.runs,
    seconds: (Date.now() - started) / 1000
  });

  log(
    `final: ${decision}; nominations ${nominations.map((item) => item.key).join(', ') || 'none'}; ${record.file} ${record.bodyHash.slice(0, 12)}`
  );
};
