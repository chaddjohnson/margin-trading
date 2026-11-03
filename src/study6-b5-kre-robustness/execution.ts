// A8 — execution sensitivity and path diagnostics of frozen B5 (PROTOCOL.md §6.8): each execution setting one at a
// time on frozen B5, the A7 representatives, KRE N1 clip rep 1 and joint N1 clip rep 1 (W29 and W23); on W29 the
// per-year attribution and per-year minute/daily drawdowns, leave-one-year-out (attribution and the path-preserving
// funding blackout), arming-date shifts, isolated flat starts, concentration and the distance to the nearest breach on
// each line. None of these is a holdout; none enters a ranking.
import fs from 'fs-extra';
import { bookOrder, executionSettings, resultFile, years } from './context.ts';
import { openDoor } from './data.ts';
import { type Books, uniqueMask } from './designs.ts';
import {
  Lab,
  type RunSettings,
  baseSettings,
  ceiling,
  drawdownEpisodes,
  lotContributions,
  minuteSeries,
  newYork,
  periodMinuteDrawdown,
  settingsWith,
  summarize
} from './evaluate.ts';
import { log, nowIso, readSealed, writeSealed } from './records.ts';
import { bookSets, frozenB5, jointSets } from './sets.ts';

const five = [...bookOrder];

export const runExecution = async () => {
  const started = Date.now();
  const b5 = frozenB5();
  const events = await readSealed<{ walkthroughs: { representative: { set: string; index: number } }[] }>(
    resultFile('partA', 'A7-events.json')
  );
  const kre1 = bookSets(b5, ['book-clip'], ['KRE']).find((set) => set.rep === 1)!;
  const joint1 = jointSets(b5, ['joint-clip']).find((set) => set.rep === 1)!;
  const allSets = [...bookSets(b5, ['book-clip'], ['KRE']), ...jointSets(b5, ['joint-clip'])];
  const representatives = events.walkthroughs.map((walk) => {
    const set = allSets.find((item) => item.id === walk.representative.set)!;

    return {
      id: `${walk.representative.set}#${walk.representative.index}`,
      books: set.points[walk.representative.index]!.books
    };
  });
  const settingsList: { key: string; settings: RunSettings }[] = [
    { key: 'base', settings: baseSettings },
    ...executionSettings.map((item) => {
      const { key, ...rest } = item;

      return { key, settings: settingsWith(rest) };
    })
  ];
  const windowsOut: Record<string, unknown> = {};

  for (const windowKey of ['W29', 'W23'] as const) {
    const door = await openDoor('diag', five, `A8 execution ${windowKey}`, windowKey);
    const lab = new Lab(door);
    const rows: Record<string, unknown>[] = [];

    for (const { key, settings } of settingsList) {
      const centre = lab.point(b5, settings);
      const kreRecords = kre1.points.map((point) => lab.point(point.books, settings));
      const jointRecords = joint1.points.map((point) => lab.point(point.books, settings));
      const kreSummary = summarize(kreRecords, uniqueMask(kre1.points, b5), centre);
      const jointSummary = summarize(jointRecords, uniqueMask(joint1.points, b5), centre);

      rows.push({
        setting: key,
        centre: {
          net: centre.net,
          dd: centre.dd,
          ddDaily: centre.ddDaily,
          interest: centre.interest,
          costs: centre.costs,
          lots: centre.lots
        },
        representatives: representatives.map((rep) => {
          const record = lab.point(rep.books, settings);

          return { id: rep.id, net: record.net, dd: record.dd };
        }),
        kreN1: {
          share: kreSummary.share,
          p90: kreSummary.ddP90,
          netMedian: kreSummary.netMedian,
          gate: kreSummary.gate
        },
        jointN1: {
          share: jointSummary.share,
          p90: jointSummary.ddP90,
          netMedian: jointSummary.netMedian,
          gate: jointSummary.gate
        }
      });
      log(`A8 ${windowKey} ${key}: centre ${centre.net} / ${centre.dd}; joint share ${jointSummary.share.toFixed(3)}`);
    }

    const out: Record<string, unknown> = { settings: rows };

    if (windowKey === 'W29') {
      const run = lab.replay(b5, baseSettings, true);
      const metrics = lab.metricsOf(run);
      const series = minuteSeries(lab, run, b5);
      const yearRows = years.map((year) => {
        const start = year === 2017 ? '2017-06-15' : `${year}-01-01`;
        const end = `${year}-12-31`;

        return {
          year,
          net: metrics.periods[String(year)],
          minuteDd: periodMinuteDrawdown(series, door.dates, start, end),
          dailyDd: metrics.periodDailyDrawdown[String(year)],
          lotsEntered: lab.ev.lotsOf(run).filter((lot) => lot.entryDate.startsWith(String(year))).length
        };
      });
      const blackout = years.map((year) => {
        const result = lab.replayWithheld(b5, (_symbol, trade) =>
          (door.dates[trade.decisionIndex] ?? '').startsWith(String(year))
        );
        const m = lab.metricsOf(result);

        return {
          year,
          attributionWithoutYear: metrics.net - (metrics.periods[String(year)] ?? 0),
          blackoutNet: m.net,
          blackoutDd: m.minuteDrawdown,
          blackoutDdTrough: m.minuteDrawdownTrough,
          blackoutLots: m.lots
        };
      });
      const shifts = ['2017-12-15', '2018-06-15'].map((armDate) => {
        const record = lab.point(b5, settingsWith({ armDate }));

        return { armDate, net: record.net, dd: record.dd, ddTrough: record.ddTrough, lots: record.lots };
      });
      const isolated = ['2020-01-02', '2022-01-03', '2024-01-02'].map((startDate) => {
        const record = lab.point(b5, settingsWith({ startDate }));

        return {
          startDate,
          net: record.net,
          dd: record.dd,
          ddPeak: record.ddPeak,
          ddTrough: record.ddTrough,
          lots: record.lots
        };
      });
      const lots = lab.ev.lotsOf(run);
      const positive = lots.map((lot) => lot.net).sort((a, b) => b - a);
      const episodes = drawdownEpisodes(series, 5).map((episode) => ({
        peak: newYork(series.points[episode.peakIndex]!.time),
        trough: newYork(series.points[episode.troughIndex]!.time),
        recovery: episode.recoveryIndex >= 0 ? newYork(series.points[episode.recoveryIndex]!.time) : 'not recovered',
        depth: episode.depth,
        lots: lotContributions(series, episode.peakIndex, episode.troughIndex).rows.map((row) => ({
          lot: `${row.symbol} ${newYork(row.entryTime)}`,
          contribution: Math.round(row.contribution * 100) / 100
        }))
      }));
      // Distance from the centre to the first breach along each A3 line (in grid units), both directions.
      const linesFile = resultFile('partA', 'A3', 'W29', 'lines.csv');
      const lineText = (await fs.pathExists(linesFile)) ? await fs.readFile(linesFile, 'utf8') : '';
      const [header, ...lineRows] = lineText.trim().split('\n');
      const columns = (header ?? '').split(',');
      const parsed = lineRows.map((line) =>
        Object.fromEntries(line.split(',').map((cell, index) => [columns[index], cell]))
      );
      const nearest = five.flatMap((symbol) =>
        [...new Set(parsed.filter((row) => row.symbol === symbol).map((row) => row.key))].map((key) => {
          const line = parsed.filter((row) => row.symbol === symbol && row.key === key);
          const breaches = line.filter((row) => Number(row.dd) >= ceiling).map((row) => Number(row.offset));
          const down = breaches.filter((offset) => offset < 0);
          const up = breaches.filter((offset) => offset > 0);

          return {
            symbol,
            key,
            points: line.length,
            breaches: breaches.length,
            nearestBelow: down.length ? Math.max(...down) : null,
            nearestAbove: up.length ? Math.min(...up) : null,
            range: [
              Math.min(...line.map((row) => Number(row.offset))),
              Math.max(...line.map((row) => Number(row.offset)))
            ]
          };
        })
      );

      Object.assign(out, {
        seriesMatchesTracker: series.matchesTracker,
        years: yearRows,
        leaveOneYearOut: blackout,
        armingShifts: shifts,
        isolatedStarts: isolated,
        concentration: {
          net: metrics.net,
          top1: positive.slice(0, 1).reduce((a, b) => a + b, 0) / metrics.net,
          top3: positive.slice(0, 3).reduce((a, b) => a + b, 0) / metrics.net,
          top5: positive.slice(0, 5).reduce((a, b) => a + b, 0) / metrics.net,
          topYear: [...yearRows].sort((a, b) => (b.net ?? 0) - (a.net ?? 0))[0],
          topYearShare: Math.max(...yearRows.map((row) => row.net ?? 0)) / metrics.net
        },
        drawdownEpisodes: episodes,
        nearestBreachOnLines: nearest
      });
    }

    windowsOut[windowKey] = out;
  }

  const record = await writeSealed(resultFile('partA', 'A8-execution.json'), {
    stage: 'A8-execution',
    at: nowIso(),
    representatives: representatives.map((rep) => rep.id),
    windows: windowsOut,
    seconds: (Date.now() - started) / 1000
  });

  log(`A8: ${record.file} ${record.bodyHash.slice(0, 12)}`);
};

export type { Books };
