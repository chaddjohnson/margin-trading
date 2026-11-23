// Priority 4 report-only LOT-LEVEL RISK DIAGNOSTICS (PROTOCOL.md §11, §13) — NON-OFFICIAL (purpose diagnostic), written
// after the protocol freeze; it selects nothing and reads only doors the study's guards allow for diagnostics (doors.ts:
// FULL after the sealed, committed validation; D21/D23 after the earlier interval; D24 after the freeze). It replays the
// NAMED SUBJECTS of one sealed interval / validation record (by default every subject that is not a lane representative
// or a representative's all-OFF projection: the benchmarks, the pooled primaries, the informed finalists and the
// decomposition rows) in full detail on the CPU reference (src/d1-risk-controls-rc3/run.ts runWithStaged), in the
// COMPLETE chronological shared-capital pool (never a sum of standalone books), and reports per subject:
//   check         the replay's net and marked DD against the sealed official (GPU) whole-run figures of the record
//   portfolio     net, realized, open mark, marked / daily DD, interest, costs, turnover, lots, time funded
//   years         the marked net's change per calendar year and the daily DD inside each year (peak reset at 1 January)
//   concentration lot nets sorted: the share of the summed lot nets from the top 1 / 3 / 5 / 10 lots and the net without
//                 them; winners / losers; the largest winners and losers (influential trades)
//   exits         final exit reasons (count, Σ net) and lots by book
//   giveback      the ex-post peak of the winning lots (hindsight, never realizable) and the retained share
//   staged        arms, staged exits, placement exits, staged exits filled below the stop level (gaps), and per armed
//                 lot the hypothetical P&L at the armed level (protection at a level — an identity, never realized P&L)
//                 beside the lot's realized net
//   regimes       Δ marked net and the window DD over 2018-Q4, 2020-02/03, 2022, 2025-04 (when inside the door); 'winning lots' = lots with a positive peak mark (diagnose.ts's definition)
// Usage (repository root):
//   GPU_POLICY_PURPOSE=diagnostic node --no-maglev --expose-gc --experimental-transform-types \
//     --disable-warning=ExperimentalWarning --max-old-space-size=12288 src/gpu-backend/legacyRunner.ts vg-l0ss-lots \
//     tools/vg-l0-staged-stop/lots.ts --record C24 --door FULL --out <json> --md <md> [--all]
import fs from 'node:fs';
import { vOptions } from '../../src/vg-l0-full-joint/nl0.ts';
import { quadOf } from '../../src/vg-l0-full-joint/space.ts';
import type { Door } from '../../src/vg-d1-growth-joint/data.ts';
import type { Lot, PoolResult } from '../../src/vg-d1-growth-joint/pool.ts';
import type { StudyDoor } from '../../src/gpu-backend/doors.ts';
import { runWithStaged, stagedLitesOf, stagedRowsOf, validateStagedFor } from '../../src/d1-risk-controls-rc3/run.ts';
import { benchmarks } from '../../src/vg-l0-risk-envelope-pilot/stages.ts';
import type { CutoffKey } from '../../src/vg-l0-staged-stop/context.ts';
import { intervalFile, openP4Door } from '../../src/vg-l0-staged-stop/doors.ts';
import { decompositionFile, qualificationFile } from '../../src/vg-l0-staged-stop/stages.ts';
import { readSealed } from '../../src/vg-l0-staged-stop/records.ts';
import type { Evidence } from '../../src/vg-l0-staged-stop/qualify.ts';
import { type PCfg, baseOf, expSpace, stagedOf } from '../../src/vg-l0-staged-stop/space.ts';
import { codeDigest, headCommit } from '../../src/vg-l0-staged-stop/records.ts';
import { purposeOf, writeJson } from './common.ts';

const args = process.argv.slice(2);
const opt = (k: string) => (args.includes(`--${k}`) ? args[args.indexOf(`--${k}`) + 1]! : undefined);
const purpose = purposeOf(['diagnostic']);
const cut = opt('record') as CutoffKey;
const doorName = opt('door') as StudyDoor;
const out = opt('out');
const md = opt('md');

if (!cut || !doorName || !out)
  throw new Error('--record <C19|C21|C24> --door <D21|D23|FULL|…> --out <json> [--md <md>] [--all]');

const r2 = (x: number) => Math.round(x * 100) / 100;
const regimes: Record<string, [string, string]> = {
  '2018 Q4': ['2018-10-01', '2018-12-31'],
  '2020-02/03': ['2020-02-01', '2020-03-31'],
  'calendar 2022': ['2022-01-01', '2022-12-31'],
  '2025-04': ['2025-04-01', '2025-04-30']
};

type Row = {
  id: string;
  label: string;
  roles: { arm: string; kind: string }[];
  wholeNet: number;
  wholeDd: number;
  years: Record<string, number> | null;
};
const rec = readSealed<{ door: string; rows: Row[] }>(intervalFile(cut));
const cfgs = new Map<string, PCfg>();

for (const e of readSealed<{ evidence: Evidence[] }>(qualificationFile(cut)).evidence) cfgs.set(e.id, e.cfg as PCfg);
if (cut === 'C24' && fs.existsSync(decompositionFile))
  for (const e of readSealed<{ evidence: Evidence[] }>(decompositionFile).evidence) cfgs.set(e.id, e.cfg as PCfg);
for (const b of benchmarks()) cfgs.set(expSpace.cfgId(b.cfg as PCfg), b.cfg as PCfg);

const subjectKinds = (r: Row) =>
  r.roles.map((x) => x.kind).filter((k) => k !== 'lane representative' && k !== 'representative all-OFF projection');
const subjects = rec.rows.filter((r) => args.includes('--all') || subjectKinds(r).length > 0);

if (rec.door !== doorName) throw new Error(`the record's door is ${rec.door}, not ${doorName}`);

const exitOf = (door: Door, l: Lot) => (l.open ? null : door.dates[l.fills.at(-1)!.s]!);
const reasonOf = (l: Lot) => (l.open ? 'open' : l.fills.at(-1)!.reason);
const lotRow = (door: Door, l: Lot) => ({
  book: l.book,
  entry: door.dates[l.entryS]!,
  exit: exitOf(door, l),
  reason: reasonOf(l),
  principal: r2(l.principal0),
  net: r2(l.net),
  best: r2(l.best),
  worst: r2(l.worst)
});
const windowOf = (door: Door, r: PoolResult, from: string, to: string) => {
  const i0 = door.dates.findIndex((d) => d >= from);
  let i1 = -1;

  for (let i = door.dates.length - 1; i >= 0; i--)
    if (door.dates[i]! <= to) {
      i1 = i;
      break;
    }
  if (i0 < 0 || i1 < i0 || i1 > r.endIndex) return null;

  const start = i0 > 0 ? r.daily[i0 - 1]! : 0;
  let peak = start;
  let dd = 0;

  for (let i = i0; i <= i1; i++) {
    peak = Math.max(peak, r.daily[i]!);
    dd = Math.max(dd, peak - r.daily[i]!);
  }
  return { change: r2(r.daily[i1]! - start), dailyDd: r2(dd) };
};
const yearsOf = (door: Door, r: PoolResult) => {
  const years = [...new Set(door.dates.slice(0, r.endIndex + 1).map((d) => d.slice(0, 4)))];

  return Object.fromEntries(
    years.map((y) => {
      const w = windowOf(door, r, `${y}-01-01`, `${y}-12-31`)!;

      return [y, { net: w.change, dailyDd: w.dailyDd }];
    })
  );
};

const analyse = (door: Door, row: Row) => {
  const c = cfgs.get(row.id);

  if (!c) throw new Error(`${row.label}: no configuration for ${row.id}`);

  const base = baseOf(c);
  const q = quadOf(base);
  const st = validateStagedFor(q, stagedOf(c), vOptions);
  const x = runWithStaged(door, q, base.controls, st, vOptions, true, false, { detail: true, cache: false });
  const r = x.result;
  const lots = r.lots.map((l) => lotRow(door, l));
  const nets = lots.map((l) => l.net).sort((a, b) => b - a);
  const sumLots = nets.reduce((a, v) => a + v, 0);
  const top = (k: number) => nets.slice(0, k).reduce((a, v) => a + v, 0);
  const winners = r.lots.filter((l) => l.best > 0);
  const peak = winners.reduce((a, l) => a + l.best, 0);
  const kept = winners.reduce((a, l) => a + Math.max(0, l.net), 0);
  const reasons: Record<string, { lots: number; net: number }> = {};

  for (const l of lots) {
    reasons[l.reason] ??= { lots: 0, net: 0 };
    reasons[l.reason]!.lots += 1;
    reasons[l.reason]!.net = r2(reasons[l.reason]!.net + l.net);
  }

  const byBook: Record<string, { lots: number; net: number }> = {};

  for (const l of lots) {
    byBook[l.book] ??= { lots: 0, net: 0 };
    byBook[l.book]!.lots += 1;
    byBook[l.book]!.net = r2(byBook[l.book]!.net + l.net);
  }

  const rows = stagedRowsOf(x.books);
  const lotByKey = new Map(r.lots.map((l) => [`${l.book}@${l.entryS}`, l]));
  const armed = Object.entries(rows).flatMap(([book, rs]) =>
    (rs ?? [])
      .filter((s) => s.armedS >= 0)
      .map((s) => {
        const l = lotByKey.get(`${book}@${s.entryS}`);
        const stagedEvents = s.events.filter((e) => e.staged);
        const gaps = stagedEvents.filter((e) => e.raw < e.level - 1e-9);

        return {
          book,
          entry: door.dates[s.entryS]!,
          armed: door.dates[s.armedS]!,
          exit: s.exitS >= 0 ? door.dates[s.exitS]! : null,
          exitReason: s.exitReason,
          placed: s.placed,
          stagedEvents: stagedEvents.length,
          gapEvents: gaps.length,
          worstGapPct: gaps.length ? r2(Math.min(...gaps.map((e) => (100 * (e.raw - e.level)) / e.level))) : 0,
          // the hypothetical gross P&L had the whole lot been sold at the armed level (an identity, never P&L)
          protectedAtArmedLevel: l ? r2(l.principal0 * (s.levelAtArming / s.entryRaw - 1)) : null,
          realizedNet: l ? r2(l.net) : null,
          funded: !!l
        };
      })
  );
  const funded = armed.filter((a) => a.funded);

  return {
    label: row.label,
    id: row.id,
    roles: subjectKinds(row).length ? subjectKinds(row) : row.roles.map((x) => x.kind),
    staged: st,
    check: {
      net: r2(r.net),
      sealedWholeNet: row.wholeNet,
      netEqual: Math.abs(r.net - row.wholeNet) < 0.005,
      markedDd: r2(r.dd.max),
      sealedWholeDd: row.wholeDd,
      ddEqual: Math.abs(r.dd.max - row.wholeDd) < 0.005
    },
    portfolio: {
      net: r2(r.net),
      realized: r2(r.realized),
      openMark: r2(r.unrealized),
      markedDd: r2(r.dd.max),
      dailyDd: r2(r.ddDaily.max),
      interest: r2(r.lots.reduce((a, l) => a + l.interest, 0)),
      costs: r2(r.lots.reduce((a, l) => a + l.costs, 0)),
      turnover: r2(r.lots.reduce((a, l) => a + l.principal0, 0)),
      lots: r.lots.length,
      sessionsHeld: r.sessionsHeld,
      sessions: r.endIndex + 1,
      timeFunded: Math.round((10000 * r.sessionsHeld) / (r.endIndex + 1)) / 10000
    },
    years: yearsOf(door, r),
    concentration: {
      sumLotNets: r2(sumLots),
      winners: nets.filter((v) => v > 0).length,
      losers: nets.filter((v) => v < 0).length,
      grossWin: r2(nets.filter((v) => v > 0).reduce((a, v) => a + v, 0)),
      grossLoss: r2(nets.filter((v) => v < 0).reduce((a, v) => a + v, 0)),
      top: Object.fromEntries(
        [1, 3, 5, 10].map((k) => [
          k,
          {
            sum: r2(top(k)),
            share: sumLots > 0 ? Math.round((10000 * top(k)) / sumLots) / 10000 : null,
            without: r2(sumLots - top(k))
          }
        ])
      ),
      largestWinners: [...lots].sort((a, b) => b.net - a.net).slice(0, 5),
      largestLosers: [...lots].sort((a, b) => a.net - b.net).slice(0, 3)
    },
    exits: { reasons, byBook },
    giveback: {
      winningLots: winners.length,
      exPostPeakProfit: r2(peak),
      retainedPositive: r2(kept),
      giveback: r2(peak - kept),
      retainedShare: peak > 0 ? Math.round((10000 * kept) / peak) / 10000 : null
    },
    staged: st
      ? {
          counters: stagedLitesOf(x.books, st),
          armedLots: armed.length,
          armedFunded: funded.length,
          stagedExitLots: funded.filter((a) => a.stagedEvents > 0).length,
          placementExits: funded.filter((a) => a.placed).length,
          gapExitLots: funded.filter((a) => a.gapEvents > 0).length,
          worstGapPct: funded.length ? Math.min(0, ...funded.map((a) => a.worstGapPct)) : 0,
          protectedAtArmedLevel: r2(funded.reduce((a, s) => a + (s.protectedAtArmedLevel ?? 0), 0)),
          realizedNetOfArmedLots: r2(funded.reduce((a, s) => a + (s.realizedNet ?? 0), 0)),
          armed: funded
        }
      : null,
    regimes: Object.fromEntries(Object.entries(regimes).map(([k, [f, t]]) => [k, windowOf(door, r, f, t)])),
    lots
  };
};

const door = await openP4Door(
  doorName,
  'diagnostic',
  `report-only CPU lot-level replays of ${subjects.length} frozen subjects of the ${cut} record (${purpose})`
);
const t0 = Date.now();
const results = subjects.map((s) => analyse(door, s));

writeJson(out, {
  kind: 'Priority 4 report-only CPU lot-level diagnostic (purpose diagnostic; never official evidence; selects nothing)',
  record: cut,
  door: doorName,
  head: headCommit(),
  codeDigest: codeDigest(),
  subjects: results,
  wallSeconds: Math.round((Date.now() - t0) / 100) / 10,
  finished: new Date().toISOString()
});

const bad = results.filter((s) => !s.check.netEqual || !s.check.ddEqual);

console.log(
  `lots ${cut} on ${doorName}: ${results.length} subjects in ${Math.round((Date.now() - t0) / 1000)} s; CPU replay = sealed official whole-run net and DD for ${results.length - bad.length}/${results.length}`
);

if (md) {
  const usd = (v: number | null | undefined) =>
    v === null || v === undefined ? '—' : `${v < 0 ? '−' : ''}$${Math.abs(Math.round(v)).toLocaleString('en-US')}`;
  const pct = (v: number | null | undefined) => (v === null || v === undefined ? '—' : `${(100 * v).toFixed(1)} %`);
  const cell = (v: string) => v.replaceAll(' | ', ' · ').replaceAll('|', '/');
  const table = (head: string[], rows: string[][]) =>
    [
      `| ${head.join(' | ')} |`,
      `|${head.map(() => '---').join('|')}|`,
      ...rows.map((r) => `| ${r.map(cell).join(' | ')} |`)
    ].join('\n');
  const name = (s: (typeof results)[number]) => `${s.label} (${[...new Set(s.roles)].join(', ')})`;
  const years = [...new Set(results.flatMap((s) => Object.keys(s.years)))].sort();
  const reasonsAll = [...new Set(results.flatMap((s) => Object.keys(s.exits.reasons)))].sort();
  const text = [
    `<!-- generated by tools/vg-l0-staged-stop/lots.ts (record ${cut}, door ${doorName}, head ${headCommit().slice(0, 8)}); non-official CPU diagnostics, report-only; complete shared-capital pool -->`,
    '',
    '### Replay check (CPU reference vs the sealed official GPU whole-run figures)',
    '',
    table(
      ['Subject', 'CPU net', 'sealed net', 'CPU marked DD', 'sealed DD', 'equal'],
      results.map((s) => [
        name(s),
        usd(s.check.net),
        usd(s.check.sealedWholeNet),
        usd(s.check.markedDd),
        usd(s.check.sealedWholeDd),
        s.check.netEqual && s.check.ddEqual ? 'yes' : 'NO'
      ])
    ),
    '',
    '### Annual marked net (change of the marked net within each calendar year)',
    '',
    table(
      ['Subject', ...years],
      results.map((s) => [name(s), ...years.map((y) => usd(s.years[y]?.net))])
    ),
    '',
    '### Annual daily drawdown (peak reset on 1 January)',
    '',
    table(
      ['Subject', ...years],
      results.map((s) => [name(s), ...years.map((y) => usd(s.years[y]?.dailyDd))])
    ),
    '',
    '### Portfolio, time funded and turnover',
    '',
    table(
      [
        'Subject',
        'net',
        'realized',
        'open mark',
        'marked DD',
        'daily DD',
        'interest',
        'costs',
        'turnover',
        'lots',
        'time funded'
      ],
      results.map((s) => [
        name(s),
        usd(s.portfolio.net),
        usd(s.portfolio.realized),
        usd(s.portfolio.openMark),
        usd(s.portfolio.markedDd),
        usd(s.portfolio.dailyDd),
        usd(s.portfolio.interest),
        usd(s.portfolio.costs),
        usd(s.portfolio.turnover),
        String(s.portfolio.lots),
        pct(s.portfolio.timeFunded)
      ])
    ),
    '',
    '### Profit concentration (lot nets in the pooled run; share of the summed lot nets)',
    '',
    table(
      [
        'Subject',
        'Σ lot nets',
        'winners / losers',
        'top 1 (share)',
        'top 3 (share)',
        'top 5 (share)',
        'top 10 (share)',
        'without top 1',
        'without top 3',
        'without top 5'
      ],
      results.map((s) => {
        const t = s.concentration.top;

        return [
          name(s),
          usd(s.concentration.sumLotNets),
          `${s.concentration.winners} / ${s.concentration.losers}`,
          ...[1, 3, 5, 10].map((k) => `${usd(t[k]!.sum)} (${pct(t[k]!.share)})`),
          usd(t[1]!.without),
          usd(t[3]!.without),
          usd(t[5]!.without)
        ];
      })
    ),
    '',
    '### Influential trades (the five largest winners and three largest losers per subject)',
    '',
    table(
      ['Subject', 'book', 'entry', 'exit', 'reason', 'principal', 'net', 'best mark (hindsight)', 'worst mark'],
      results.flatMap((s) =>
        [...s.concentration.largestWinners, ...s.concentration.largestLosers].map((l) => [
          s.label,
          l.book,
          l.entry,
          l.exit ?? 'open',
          l.reason,
          usd(l.principal),
          usd(l.net),
          usd(l.best),
          usd(l.worst)
        ])
      )
    ),
    '',
    '### Final exit reasons (lots; Σ net)',
    '',
    table(
      ['Subject', ...reasonsAll],
      results.map((s) => [
        name(s),
        ...reasonsAll.map((k) =>
          s.exits.reasons[k] ? `${s.exits.reasons[k]!.lots} (${usd(s.exits.reasons[k]!.net)})` : '—'
        )
      ])
    ),
    '',
    '### Giveback (hindsight peak of the lots with a positive peak mark — never realizable)',
    '',
    table(
      ['Subject', 'winning lots', 'ex-post peak', 'retained', 'giveback', 'retained share'],
      results.map((s) => [
        name(s),
        String(s.giveback.winningLots),
        usd(s.giveback.exPostPeakProfit),
        usd(s.giveback.retainedPositive),
        usd(s.giveback.giveback),
        pct(s.giveback.retainedShare)
      ])
    ),
    '',
    '### Staged stops: protection at the armed level (hypothetical) vs realized',
    '',
    table(
      [
        'Subject',
        'armed lots (funded)',
        'staged-exit lots',
        'placement exits',
        'gap exits (worst gap)',
        'Σ P&L at the armed level (hypothetical)',
        'Σ realized net of the armed lots'
      ],
      results
        .filter((s) => s.staged)
        .map((s) => [
          name(s),
          String(s.staged!.armedFunded),
          String(s.staged!.stagedExitLots),
          String(s.staged!.placementExits),
          `${s.staged!.gapExitLots} (${s.staged!.worstGapPct.toFixed(2)} %)`,
          usd(s.staged!.protectedAtArmedLevel),
          usd(s.staged!.realizedNetOfArmedLots)
        ])
    ),
    '',
    '### Regime windows (Δ marked net; daily DD inside the window)',
    '',
    table(
      ['Subject', ...Object.keys(regimes)],
      results.map((s) => [
        name(s),
        ...Object.keys(regimes).map((k) =>
          s.regimes[k] ? `${usd(s.regimes[k]!.change)} (DD ${usd(s.regimes[k]!.dailyDd)})` : '—'
        )
      ])
    ),
    ''
  ].join('\n');

  fs.writeFileSync(md, text);
  console.log(`lots: tables → ${md}`);
}
