// Development-only diagnostics (report-only; nothing here selects or reopens a sealed stage): why the intraday region
// fails Study 8's constraints. (a) The rung-1 archive by period length and dip size; (b) the most profitable archive
// configurations of the genuinely intraday region (B ≤ 30, X ≤ 1%) and of every B level, re-evaluated at 0–5 bps per
// side to separate the pre-cost edge from costs; (c) the VGT microstructure scale on 2016–2024 (median 1-minute range,
// Roll's effective-spread estimate from 1-minute closes, median 1-minute dollar volume) behind the cost assumption.
import path from 'node:path';
import zlib from 'node:zlib';
import fs from 'fs-extra';
import { quantile } from '../study8-expanded-regime-d1/stats.ts';
import { resultFile } from './context.ts';
import { loadDevelopmentSessions } from './data.ts';
import { Lab, doorView, settingsWith } from './lab.ts';
import { recordDoor, writeSealed, log } from './seal.ts';
import { describe, gridOf, sobolGrids, valuesOf } from './space.ts';
import { runGrid } from './lab.ts';
import { searchLabel } from './search.ts';

export const runDiagnostics = async () => {
  const loaded = await loadDevelopmentSessions();

  await recordDoor('development', 'report: development-only diagnostics', loaded.sha256, loaded.lastDate);

  const view = doorView('development', loaded.sessions);
  const lab = new Lab(view);
  const text = zlib.gunzipSync(await fs.readFile(resultFile('search', 'search-archive.csv.gz'))).toString('utf8');
  const [, ...lines] = text.trim().split('\n');
  const archive = lines.map((line) => {
    const [id, grid, violation, net, dd, lots, episodes, share, p90, median, p10] = line.split(',');
    const g = gridOf(grid!.split('/').map(Number));

    return {
      id: id!,
      grid: g,
      values: valuesOf(g),
      violation: Number(violation),
      net: Number(net),
      dd: Number(dd),
      lots: Number(lots),
      episodes: Number(episodes),
      share: Number(share),
      p90: Number(p90),
      median: Number(median),
      p10: Number(p10)
    };
  });
  const y = view.y;
  const group = (rows: typeof archive) => ({
    configs: rows.length,
    profitableCentres: rows.filter((r) => r.net > 0).length,
    bestCentreNet: rows.length ? Math.max(...rows.map((r) => r.net)) : NaN,
    medianCentreNet: rows.length
      ? quantile(
          rows.map((r) => r.net),
          0.5
        )
      : NaN,
    bestNbMedianPerYear: rows.length ? Math.max(...rows.map((r) => r.median / y)) : NaN,
    medianLots: rows.length
      ? quantile(
          rows.map((r) => r.lots),
          0.5
        )
      : NaN
  });
  const byB = Object.fromEntries(
    [5, 10, 15, 30, 65, 130].map((b) => [`B${b}`, group(archive.filter((r) => r.values.periodMinutes === b))])
  );
  const xBuckets: [string, number, number][] = [
    ['X < 0.5%', 0, 0.005],
    ['0.5% ≤ X < 1%', 0.005, 0.01],
    ['1% ≤ X < 2%', 0.01, 0.02],
    ['2% ≤ X < 4%', 0.02, 0.04],
    ['X ≥ 4%', 0.04, 1]
  ];
  const byX = Object.fromEntries(
    xBuckets.map(([k, lo, hi]) => [
      k,
      group(archive.filter((r) => r.values.targetPercentChange >= lo && r.values.targetPercentChange < hi))
    ])
  );
  const costCurve = (rows: typeof archive, take: number) =>
    [...rows]
      .sort((a, b) => b.net - a.net)
      .slice(0, take)
      .map((r) => {
        const at = (costBps: number) => lab.point(r.grid, settingsWith({ costBps }));
        const zero = at(0);

        return {
          id: r.id,
          describe: describe(r.grid),
          lots: zero.lots,
          heldDaysPerLot: zero.lots ? Math.round((zero.heldDays / zero.lots) * 1000) / 1000 : NaN,
          grossPerLotBps: zero.lots
            ? Math.round(((zero.net + zero.interest) / zero.lots / 100000) * 1e4 * 100) / 100
            : NaN,
          net: Object.fromEntries([0, 1, 2, 3, 5].map((c) => [`${c}bps`, at(c).net])),
          dd5bps: at(5).dd
        };
      });
  const intraday = archive.filter((r) => r.values.periodMinutes <= 30 && r.values.targetPercentChange < 0.01);
  const costs = {
    intradayRegion: costCurve(intraday, 10),
    bestPerB: Object.fromEntries(
      [5, 10, 15, 30, 65, 130].map((b) => [
        `B${b}`,
        costCurve(
          archive.filter((r) => r.values.periodMinutes === b),
          3
        )
      ])
    )
  };

  // microstructure scale by year (regular-session minutes only)
  const micro: Record<string, unknown> = {};

  for (const year of ['2016', '2017', '2018', '2019', '2020', '2021', '2022', '2023', '2024']) {
    const ranges: number[] = [];
    const dollar: number[] = [];
    let covSum = 0;
    let varCount = 0;

    for (const session of loaded.sessions.filter((s) => s.date.startsWith(year))) {
      let prevChange = NaN;

      session.bars.forEach((bar, i) => {
        ranges.push(((bar.high - bar.low) / bar.close) * 1e4);
        dollar.push(bar.close * bar.volume);

        if (i > 0) {
          const change = Math.log(bar.close / session.bars[i - 1]!.close);

          if (!Number.isNaN(prevChange)) {
            covSum += change * prevChange;
            varCount++;
          }

          prevChange = change;
        }
      });
    }

    const cov = covSum / Math.max(1, varCount);

    micro[year] = {
      medianMinuteRangeBps: Math.round(quantile(ranges, 0.5) * 100) / 100,
      rollSpreadBps: cov < 0 ? Math.round(2 * Math.sqrt(-cov) * 1e4 * 100) / 100 : 0,
      medianMinuteDollarVolume: Math.round(quantile(dollar, 0.5))
    };
  }

  // (d) the unbiased picture: the search's own 8,192-point Sobol screen (same labels, so the same grids), by B and X
  const screen = sobolGrids(8192, searchLabel('screen')).grids.map((grid) => ({
    grid,
    values: valuesOf(grid),
    record: lab.point(grid)
  }));
  const screenGroup = (rows: typeof screen) => ({
    configs: rows.length,
    profitable: rows.filter((r) => r.record.net > 0).length,
    medianNet: rows.length
      ? Math.round(
          quantile(
            rows.map((r) => r.record.net),
            0.5
          )
        )
      : NaN,
    p90Net: rows.length
      ? Math.round(
          quantile(
            rows.map((r) => r.record.net),
            0.9
          )
        )
      : NaN,
    bestNet: rows.length ? Math.round(Math.max(...rows.map((r) => r.record.net))) : NaN,
    medianLots: rows.length
      ? quantile(
          rows.map((r) => r.record.lots),
          0.5
        )
      : NaN,
    medianCosts: rows.length
      ? Math.round(
          quantile(
            rows.map((r) => r.record.costs),
            0.5
          )
        )
      : NaN
  });
  const screenByB = Object.fromEntries(
    [5, 10, 15, 30, 65, 130].map((b) => [`B${b}`, screenGroup(screen.filter((r) => r.values.periodMinutes === b))])
  );
  const screenByX = Object.fromEntries(
    xBuckets.map(([k, lo, hi]) => [
      k,
      screenGroup(screen.filter((r) => r.values.targetPercentChange >= lo && r.values.targetPercentChange < hi))
    ])
  );
  // (e) holding profile of the intraday region's best three: same-session share and median hold
  const holding = [...intraday]
    .sort((a, b) => b.net - a.net)
    .slice(0, 3)
    .map((r) => {
      const lots = runGrid(view, r.grid).lots.filter((lot) => !lot.open);
      const holds = lots.map((lot) => (lot.exitTime - lot.entryTime) / 60);

      return {
        id: r.id,
        describe: describe(r.grid),
        lots: lots.length,
        sameSessionShare: lots.length
          ? lots.filter((lot) => lot.exitSession === lot.entrySession).length / lots.length
          : NaN,
        medianHoldMinutes: holds.length ? quantile(holds, 0.5) : NaN,
        exitReasons: lots.reduce<Record<string, number>>(
          (acc, lot) => ({ ...acc, [lot.exitReason]: (acc[lot.exitReason] ?? 0) + 1 }),
          {}
        )
      };
    });

  const out = resultFile('report', 'diagnostics.json');
  const record = await writeSealed(
    out,
    { stage: 'DEVELOPMENT_DIAGNOSTICS', y, byB, byX, costs, microstructure: micro, screenByB, screenByX, holding },
    { overwrite: true }
  );

  log(`diagnostics written ${path.relative('.', out)} ${record.bodyHash.slice(0, 12)}`);
};
