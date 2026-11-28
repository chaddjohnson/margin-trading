// Manual (non-formal) full-history or custom-window replay of a sealed pooled VGT/GDX configuration — N/original, New L0
// or any other subject of src/vg-l0-risk-metrics/subjects.ts — on its established evaluation path (RC 2's
// runWithControls2 on Priority 3's books and pool, the subject's sealed options: one exclusive $100,000 slot, D1 first,
// 5 bps per side, 11% simple interest, the strict minute drawdown of the marked net), with no change of any rule or
// parameter. One continuous causal run from 2016-01-04; nothing is reset at a boundary.
//
//   GPU_POLICY_PURPOSE=cpu-reference npm run manual-eval -- --subject "N/original" --window all [--out DIR]
//   GPU_POLICY_PURPOSE=cpu-reference npm run manual-eval -- --subject "N/original" --window research
//   GPU_POLICY_PURPOSE=cpu-reference npm run manual-eval -- --subject "N/original" --window custom --from 2025-01-02 --to 2026-11-25
//   GPU_POLICY_PURPOSE=cpu-reference npm run manual-eval -- --subject "N/original" --window custom --from 2026-11-02 --to 2026-11-25 --execution continuous
//   GPU_POLICY_PURPOSE=cpu-reference npm run manual-eval -- --list
//
// Windows (src/manual-eval/door.ts): research = Priority 3's FULL door (2016-01-04 → 2026-10-30, the verified byte
// prefix of the sealed evaluations); all = 2016-01-04 → the latest common complete session of both files; custom = any
// [from, to] inside it — isolated by default (a later start runs flat from that session), or with --execution
// continuous one run from 2016-01-04 whose [from, to] is the reporting window R (src/manual-eval/execute.ts; Strategy
// Lab's Portfolios tab uses the same module and defaults to continuous). A window past the research validation end
// (config/research/date-ranges.json) is a MANUAL POST-VALIDATION EVALUATION: never optimization, selection,
// qualification or validation evidence (standard 4.0.0 §1.13). For such a window the tool also replays FULL and proves
// that the longer run equals it through 2026-10-30 decision for decision (report.ts compareTrajectories), then reports:
//   A  the historical research window (through the validation end), with its development and validation parts;
//   B  the newly available period (after the validation end), attributed by marked net;
//   C  the entire window.
// The console report ends with every trade (funded lot) of the reported window — R for a continuous custom run,
// otherwise the whole run — with its entry, exit, net and MAE (the canonical per-lot MAE); --no-trades omits it.
// Outputs (with --out; nothing is written otherwise): summary.json, periods.md, trades.{md,json,csv},
// ledger-post-validation.{json,csv}, funding-post-validation.json, book-states.json. The output names carry the window
// and the data versions.
import fs from 'node:fs';
import path from 'node:path';
import { prefixThroughDate, sha256Prefix, vintageOf } from '../../src/lib/canonicalPrefix.ts';
import { researchRange } from '../../src/lib/researchRanges.ts';
import type { WindowMode } from '../../src/manual-eval/door.ts';
import {
  type ExecutionMode,
  type ManualRunPlan,
  compareTo,
  evaluatePlan,
  openPlanDoor,
  planManualRun,
  researchPlan,
  researchReference
} from '../../src/manual-eval/execute.ts';
import { bookStates, closeOf, periodFunding, periodLedger, r2 } from '../../src/manual-eval/report.ts';
import { formatNewYorkTime } from '../../src/lib/session.ts';
import { canonical, repoRoot, symbols } from '../../src/vg-d1-growth-joint/context.ts';
import { cfgId } from '../../src/vg-l0-full-joint/space.ts';
import { vOptions } from '../../src/vg-l0-full-joint/nl0.ts';
import { replay } from '../../src/vg-l0-risk-metrics/engine.ts';
import { auditSubjects } from '../../src/vg-l0-risk-metrics/subjects.ts';

const argv = process.argv.slice(2);
const opt = (name: string) => {
  const i = argv.indexOf(name);

  return i >= 0 ? argv[i + 1] : undefined;
};
const subjects = auditSubjects();

if (argv.includes('--list')) {
  for (const s of subjects) console.info(`${s.key.padEnd(14)} ${s.label} — ${s.provenance}`);
  process.exit(0);
}

const key = opt('--subject') ?? 'N/original';
const subject = subjects.find((s) => s.key === key);

if (!subject) throw new Error(`unknown subject '${key}' (--list shows them)`);

// A custom window runs ISOLATED (flat at its first session) unless --execution continuous asks for the continuous run
// from 2016-01-04 with the custom window as its reporting window (src/manual-eval/execute.ts).
const plan = planManualRun(
  {
    mode: (opt('--window') ?? 'all') as WindowMode,
    from: opt('--from'),
    to: opt('--to'),
    execution: opt('--execution') as ExecutionMode | undefined
  },
  'isolated'
);
const window = plan.reporting;
const range = researchRange();
const validationEnd = range.validation.to;
const label = plan.label;
const purpose = `manual evaluation of ${subject.key} (${window.mode} ${window.from} → ${window.to}); report-only, never formal evidence`;
const t0 = Date.now();

const run = async (p: ManualRunPlan) =>
  evaluatePlan(p, await openPlanDoor(p, purpose), (door, boundaries) => replay(door, subject.subject, vOptions, boundaries));

const main = await run(plan);
const full = researchReference(plan) ? await run(researchPlan()) : null;
const trajectory = full ? compareTo(full, main) : null;

if (trajectory && !trajectory.identical) {
  console.error(`the run differs from FULL over their common span: ${trajectory.differences.join('; ')}`);
  process.exitCode = 1;
}

const first = main.door.dates[0]!;
const end = main.door.dates.at(-1)!;
const specs = main.specs;
const periods = main.periods;
const post = specs.find((s) => s.key === 'B');
const ledger = post ? periodLedger(main.L, main.door, post) : [];
const funding = post ? periodFunding(main.r, main.door, post) : [];

// Every trade (funded lot) of the reported window — the reporting window R of a continuous custom run, otherwise the
// whole run C — with its maximum adverse excursion. MAE is the established per-lot measure, the engine's canonical MAE
// (research/vg-l0-risk-metrics/METRIC_SPECIFICATION.md §4): the lowest MARKED P&L of the lot over its life up to the
// window's end (every minute close and session close while it is open: realized fills + shares × price − principal −
// accrued interest, no exit cost on the open shares), or its final net if that is lower; negative = adverse, not
// floored at 0. A lot carried into R keeps its whole life (as the principal loss does). When the window ends at the
// run's end the value is checked against the engine's reconciled canonical MAE.
const tradeSpec = specs.find((s) => s.key === 'R') ?? specs.find((s) => s.key === 'C')!;
const tradeFromT = tradeSpec.after === null ? -Infinity : closeOf(main.door, tradeSpec.after);
const tradeToT = closeOf(main.door, tradeSpec.through);
const sessionOf = (date: string) => main.door.dates.indexOf(date);
const trades = main.L.lots
  .filter((l) => l.entryT <= tradeToT && (l.open ? Infinity : l.fills.at(-1)!.t) > tradeFromT)
  .map((l) => {
    const exitFill = l.open ? undefined : l.fills.at(-1)!;
    const closed = exitFill !== undefined && exitFill.t <= tradeToT;
    const fills = l.fills.filter((f) => f.t <= tradeToT);
    let mae = Infinity;
    let maeT = NaN;
    let maePrice = NaN;
    let lastMark: (typeof l.marks)[number] | undefined;

    for (const k of l.marks) {
      if (k.t > tradeToT) break;
      lastMark = k;
      if (k.pnl < mae) {
        mae = k.pnl;
        maeT = k.t;
        maePrice = k.price;
      }
    }

    const net = closed ? l.net : (lastMark?.pnl ?? 0);

    if (closed && l.net < mae) {
      mae = l.net;
      maeT = exitFill.t;
      maePrice = exitFill.raw;
    }
    if (tradeToT >= main.L.endT && l.canonicalMae !== null) {
      const tol = 1e-6 * Math.max(1, Math.abs(l.canonicalMae));

      if (Math.abs(mae - l.canonicalMae) > tol)
        throw new Error(`lot ${l.id}: MAE ${mae} differs from the engine's canonical MAE ${l.canonicalMae}`);
    }

    const endDate = closed ? exitFill.date : tradeSpec.through;

    return {
      lot: l.id,
      book: l.book,
      symbol: l.symbol,
      kind: l.kind,
      carriedIn: l.entryT <= tradeFromT,
      status: closed ? 'closed' : 'open at the window end',
      entryTime: formatNewYorkTime(l.entryT),
      entryRaw: l.entryRaw,
      entryPrice: l.entryPrice,
      shares: l.shares0,
      principal: l.principal0,
      exitTime: closed ? formatNewYorkTime(exitFill.t) : null,
      exitRaw: closed ? exitFill.raw : null,
      exitPrice: closed ? exitFill.price : null,
      exitReason: closed ? exitFill.reason : null,
      partialExits: fills.filter((f) => f.partial).length,
      sessions: sessionOf(endDate) - sessionOf(l.entryDate) + 1,
      net: r2(net),
      returnPct: r2((100 * net) / l.principal0),
      interest: r2(closed ? l.interest : (lastMark?.interest ?? 0) + fills.reduce((s, f) => s + f.interest, 0)),
      mae: r2(mae),
      maePct: r2((100 * mae) / l.principal0),
      maeTime: Number.isFinite(maeT) ? formatNewYorkTime(maeT) : null,
      maePrice: Number.isFinite(maePrice) ? maePrice : null,
      fills: fills.map((f) => ({
        time: formatNewYorkTime(f.t),
        reason: f.reason,
        partial: f.partial,
        raw: f.raw,
        price: f.price,
        shares: f.shares,
        net: r2(f.net)
      }))
    };
  });

const dataProvenance = Object.fromEntries(
  symbols.map((s) => {
    const file = path.join(repoRoot, 'data', s, 'data.csv');
    const bytes = fs.statSync(file).size;
    const whole = sha256Prefix(file, bytes);
    const through = prefixThroughDate(file, validationEnd);

    return [
      s,
      {
        file: path.relative(repoRoot, file),
        bytes,
        sha256: whole,
        latestCompleteSession: window.endpoint.files.find((f) => f.symbol === s)?.latestCompleteSession,
        lastRowUtc: window.endpoint.files.find((f) => f.symbol === s)?.lastRowUtc,
        throughValidationEnd: {
          through: validationEnd,
          bytes: through.bytes,
          sha256: through.sha256,
          rows: through.rows
        },
        priority3FullPin: {
          bytes: canonical[s].bytes,
          sha256: canonical[s].sha256,
          equalsThroughValidationEnd: through.bytes === canonical[s].bytes && through.sha256 === canonical[s].sha256
        },
        vintage: vintageOf(s, whole)?.recorded ?? null,
        doorDataSha256: main.door.sym[s].dataSha256
      }
    ];
  })
);

const summary = {
  kind: 'manual pooled evaluation',
  label,
  generated: new Date().toISOString(),
  subject: {
    key: subject.key,
    label: subject.label,
    provenance: subject.provenance,
    id: subject.cfg ? cfgId(subject.cfg) : null,
    options: vOptions
  },
  window: { ...window, door: main.door.name, sessions: main.door.sessions, first, end },
  execution: {
    mode: plan.execution,
    simulated: main.effective.simulation,
    reporting: main.effective.reporting,
    note:
      plan.execution === 'isolated'
        ? 'isolated: the run starts flat at the first reported session (no state from earlier sessions)'
        : 'continuous: one causal run from the first common session; every period is a change of its marked net'
  },
  researchDateRange: {
    id: range.id,
    development: range.development,
    validation: range.validation,
    file: 'config/research/date-ranges.json'
  },
  dataProvenance,
  engine: {
    net: r2(main.r.rec.net),
    dd: r2(main.r.rec.dd),
    lots: main.r.rec.lots,
    realized: r2(main.r.rec.realized),
    unrealized: r2(main.r.rec.unrealized),
    signature: main.r.rec.signature,
    periods: main.r.rec.periods
  },
  reconciliation: main.reconciliation,
  sealed: subject.target,
  research: full
    ? {
        door: full.door.name,
        net: r2(full.r.rec.net),
        dd: r2(full.r.rec.dd),
        lots: full.r.rec.lots,
        signature: full.r.rec.signature,
        periods: full.r.rec.periods,
        reconciliation: full.reconciliation,
        equalsSealed:
          r2(full.r.rec.net) === subject.target.net &&
          r2(full.r.rec.dd) === subject.target.dd &&
          full.r.rec.lots === subject.target.lots
      }
    : null,
  trajectory,
  periods,
  seconds: (Date.now() - t0) / 1000
};

const money = (x: number | null | undefined) =>
  x === null || x === undefined
    ? '—'
    : `$${x.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const rows: [string, (p: (typeof periods)[number]) => string][] = [
  ['Net profit (Δ marked net)', (p) => money(p.net)],
  ['Gross trading P&L (net + interest + costs)', (p) => money(p.grossTradingPnl)],
  ['Margin interest', (p) => money(p.interest)],
  ['Transaction costs', (p) => money(p.costs)],
  ['Realized P&L in the period', (p) => money(p.realizedPnl)],
  ['Unrealized at the start / end', (p) => `${money(p.unrealizedAtStart)} / ${money(p.unrealizedAtEnd)}`],
  [
    'Max marked DD, reset at the period start',
    (p) => `${money(p.drawdownReset.max)} (${p.drawdownReset.peak ?? '—'} → ${p.drawdownReset.trough ?? '—'})`
  ],
  ['Max marked DD from the continuous peak', (p) => `${money(p.drawdownFromContinuousPeak.max)}`],
  ['Max banked-capital DD', (p) => money(p.bankedCapitalDrawdown.max)],
  [
    'Max trade-principal loss',
    (p) =>
      p.maxTradePrincipalLoss
        ? `${money(p.maxTradePrincipalLoss.loss)} (lot ${p.maxTradePrincipalLoss.lot} ${p.maxTradePrincipalLoss.book})`
        : '—'
  ],
  [
    'Lots: active / entered / closed / carried in',
    (p) => `${p.lots.active} / ${p.lots.entered} / ${p.lots.closed} / ${p.lots.carriedIn}`
  ],
  [
    'Win rate (closed lots)',
    (p) => (p.lots.winRate === null ? '—' : `${p.lots.winRate}% (${p.lots.winners} of ${p.lots.closed})`)
  ],
  [
    'Open positions at the end',
    (p) =>
      p.openPositions.length
        ? p.openPositions.map((o) => `lot ${o.lot} ${o.book} ${money(o.markedPnl)}`).join('; ')
        : 'none'
  ]
];
const table = [
  `| Item | ${periods.map((p) => p.key).join(' | ')} |`,
  `|---|${periods.map(() => '---:').join('|')}|`,
  ...rows.map(([name, f]) => `| ${name} | ${periods.map(f).join(' | ')} |`)
].join('\n');
const md = [
  `# ${subject.key}: ${label}`,
  '',
  `Window ${first} → ${end} (${window.mode}; ${main.door.sessions} sessions; common complete endpoint ${window.endpoint.date}, limited by ${window.endpoint.limitedBy.join(', ')}). Research date range ${range.id}: validation ends ${validationEnd}.`,
  ...(window.mode === 'custom'
    ? [
        '',
        plan.execution === 'isolated'
          ? `Execution: isolated — the run starts flat at ${main.effective.reporting.from} (no state from earlier sessions).`
          : `Execution: continuous — one run from ${first}; the reporting window ${main.effective.reporting.from} → ${main.effective.reporting.to} is period R (state carried in).`
      ]
    : []),
  '',
  ...periods.map((p) => `- **${p.key}** — ${p.label}`),
  '',
  table,
  ''
].join('\n');

const price = (x: number | null) =>
  x === null ? '—' : x.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 4 });
const pct = (x: number) => `${x.toFixed(2)}%`;
const tradesMd = [
  `## Trades — ${tradeSpec.key}: ${tradeSpec.label} (${trades.length} ${trades.length === 1 ? 'lot' : 'lots'})`,
  '',
  'Net: the lot\'s net to the window end (realized fills; an open lot at its last mark), interest and costs included. ' +
    'MAE: the lot\'s lowest marked P&L (minute and session closes, accrued interest, no exit cost on open shares) or ' +
    'its final net if lower; negative = adverse; % of the funded principal.' +
    (trades.some((t) => t.carriedIn) ? ' * carried into the window: entry, net and MAE cover its whole life.' : ''),
  '',
  '| Lot | Book | Kind | Entry (ET) | Entry | Exit (ET) | Exit | Exit reason | Sessions | Net | Return | MAE | MAE % | MAE at (ET) |',
  '|---:|---|---|---|---:|---|---:|---|---:|---:|---:|---:|---:|---|',
  ...trades.map((t) =>
    [
      `${t.lot}${t.carriedIn ? '*' : ''}`,
      t.book,
      t.kind,
      t.entryTime,
      price(t.entryRaw),
      t.exitTime ?? 'open',
      price(t.exitRaw),
      t.exitReason === null ? '—' : `${t.exitReason}${t.partialExits ? ` (+${t.partialExits} partial)` : ''}`,
      t.sessions,
      money(t.net),
      pct(t.returnPct),
      money(t.mae),
      pct(t.maePct),
      t.maeTime ?? '—'
    ].join(' | ')
  ).map((row) => `| ${row} |`),
  ''
].join('\n');

console.info(md);
if (!argv.includes('--no-trades')) console.info(tradesMd);
if (trajectory)
  console.info(
    `Trajectory through ${trajectory.comparedThrough.slice(0, 10)} equal to FULL: ${trajectory.identical ? 'yes (decision for decision)' : `NO: ${trajectory.differences.join('; ')}`}`
  );
if (full) console.info(`FULL replay = sealed ${subject.key} figures: ${summary.research!.equalsSealed ? 'yes' : 'NO'}`);

const out = opt('--out');

if (out) {
  const dir = path.resolve(out);
  const csvCell = (v: unknown) =>
    typeof v === 'string' && /[",\n]/.test(v)
      ? `"${v.replaceAll('"', '""')}"`
      : v === null || v === undefined
        ? ''
        : String(v);
  const header = [
    'lot',
    'book',
    'kind',
    'entry',
    'entryRaw',
    'shares',
    'carriedIn',
    'status',
    'exits',
    'valueAtPeriodStart',
    'valueAtPeriodEnd',
    'periodPnl',
    'periodInterest',
    'periodCosts',
    'lotNet',
    'principalLoss',
    'mae'
  ];

  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'summary.json'), `${JSON.stringify(summary, null, 1)}\n`);
  fs.writeFileSync(path.join(dir, 'periods.md'), md);
  fs.writeFileSync(path.join(dir, 'book-states.json'), `${JSON.stringify(bookStates(main.r), null, 1)}\n`);
  fs.writeFileSync(
    path.join(dir, 'trades.json'),
    `${JSON.stringify({ window: tradeSpec, basis: 'MAE = the canonical per-lot MAE (marked basis, whole life to the window end)', trades }, null, 1)}\n`
  );
  fs.writeFileSync(path.join(dir, 'trades.md'), tradesMd);
  const tradeHeader = Object.keys(trades[0] ?? {}).filter((h) => h !== 'fills');

  fs.writeFileSync(
    path.join(dir, 'trades.csv'),
    `${[tradeHeader.join(','), ...trades.map((t) => tradeHeader.map((h) => csvCell((t as Record<string, unknown>)[h])).join(','))].join('\n')}\n`
  );
  if (post) {
    fs.writeFileSync(path.join(dir, 'ledger-post-validation.json'), `${JSON.stringify(ledger, null, 1)}\n`);
    fs.writeFileSync(path.join(dir, 'funding-post-validation.json'), `${JSON.stringify(funding, null, 1)}\n`);
    fs.writeFileSync(
      path.join(dir, 'ledger-post-validation.csv'),
      `${[header.join(','), ...ledger.map((l) => header.map((h) => csvCell(h === 'exits' ? l.exits.map((e) => `${e.time} ${e.reason} ${e.raw}`).join('; ') : (l as Record<string, unknown>)[h])).join(','))].join('\n')}\n`
    );
  }
  console.info(`written: ${dir}`);
}
