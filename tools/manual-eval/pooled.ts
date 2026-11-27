// Manual (non-formal) full-history or custom-window replay of a sealed pooled VGT/GDX configuration — N/original, New L0
// or any other subject of src/vg-l0-risk-metrics/subjects.ts — on its established evaluation path (RC 2's
// runWithControls2 on Priority 3's books and pool, the subject's sealed options: one exclusive $100,000 slot, D1 first,
// 5 bps per side, 11% simple interest, the strict minute drawdown of the marked net), with no change of any rule or
// parameter. One continuous causal run from 2016-01-04; nothing is reset at a boundary.
//
//   GPU_POLICY_PURPOSE=cpu-reference npm run manual-eval -- --subject "N/original" --window all [--out DIR]
//   GPU_POLICY_PURPOSE=cpu-reference npm run manual-eval -- --subject "N/original" --window research
//   GPU_POLICY_PURPOSE=cpu-reference npm run manual-eval -- --subject "N/original" --window custom --from 2025-01-02 --to 2026-11-25
//   GPU_POLICY_PURPOSE=cpu-reference npm run manual-eval -- --list
//
// Windows (src/manual-eval/door.ts): research = Priority 3's FULL door (2016-01-04 → 2026-10-30, the verified byte
// prefix of the sealed evaluations); all = 2016-01-04 → the latest common complete session of both files; custom = any
// [from, to] inside it (a later start runs flat from that session). A window past the research validation end
// (config/research/date-ranges.json) is a MANUAL POST-VALIDATION EVALUATION: never optimization, selection,
// qualification or validation evidence (standard 4.0.0 §1.13). For such a window the tool also replays FULL and proves
// that the longer run equals it through 2026-10-30 decision for decision (report.ts compareTrajectories), then reports:
//   A  the historical research window (through the validation end), with its development and validation parts;
//   B  the newly available period (after the validation end), attributed by marked net;
//   C  the entire window.
// Outputs (with --out; nothing is written otherwise): summary.json, periods.md, ledger-post-validation.{json,csv},
// funding-post-validation.json, book-states.json. The output names carry the window and the data versions.
import fs from 'node:fs';
import path from 'node:path';
import { prefixThroughDate, sha256Prefix, vintageOf } from '../../src/lib/canonicalPrefix.ts';
import { researchRange } from '../../src/lib/researchRanges.ts';
import { openManualDoor, resolveManualWindow, type WindowMode } from '../../src/manual-eval/door.ts';
import {
  type PeriodSpec,
  bookStates,
  compareTrajectories,
  periodFunding,
  periodLedger,
  periodMetrics,
  r2
} from '../../src/manual-eval/report.ts';
import { canonical, chronology, repoRoot, symbols } from '../../src/vg-d1-growth-joint/context.ts';
import { cfgId } from '../../src/vg-l0-full-joint/space.ts';
import { vOptions } from '../../src/vg-l0-full-joint/nl0.ts';
import { reconcile, replay, toLedger } from '../../src/vg-l0-risk-metrics/engine.ts';
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

const window = resolveManualWindow({
  mode: (opt('--window') ?? 'all') as WindowMode,
  from: opt('--from'),
  to: opt('--to')
});
const range = researchRange();
const validationEnd = range.validation.to;
const developmentEnd = range.development.to;
const label = window.postValidation
  ? 'MANUAL POST-VALIDATION EVALUATION (not an extension of the formal validation dataset)'
  : 'manual evaluation';
const purpose = `manual evaluation of ${subject.key} (${window.mode} ${window.from} → ${window.to}); report-only, never formal evidence`;
const t0 = Date.now();

const run = async (w: typeof window) => {
  const door = await openManualDoor(w, purpose);
  const boundaries = [developmentEnd, validationEnd].filter((d) => door.dates.includes(d) && d !== door.dates.at(-1));
  const r = replay(door, subject.subject, vOptions, boundaries);
  const L = toLedger(r);

  return { door, r, L, reconciliation: reconcile(r, L), boundaries };
};

const main = await run(window);
const full =
  window.mode !== 'research' && window.to > validationEnd && window.from === chronology.firstSession
    ? await run(resolveManualWindow({ mode: 'research' }))
    : null;
const trajectory = full ? compareTrajectories({ r: full.r, L: full.L }, { r: main.r, L: main.L }) : null;

if (trajectory && !trajectory.identical) {
  console.error(`the run differs from FULL before ${validationEnd}: ${trajectory.differences.join('; ')}`);
  process.exitCode = 1;
}

const first = main.door.dates[0]!;
const end = main.door.dates.at(-1)!;
const has = (d: string) => main.door.dates.includes(d) && d !== end;
const specs: PeriodSpec[] = [];

if (has(validationEnd) || end === validationEnd) {
  specs.push({
    key: 'A',
    label: `historical research window ${first} → ${validationEnd}`,
    after: null,
    through: validationEnd
  });
  if (has(developmentEnd)) {
    specs.push({ key: 'A1', label: `development ${first} → ${developmentEnd}`, after: null, through: developmentEnd });
    specs.push({
      key: 'A2',
      label: `formal validation window (after the ${developmentEnd} close) → ${validationEnd}`,
      after: developmentEnd,
      through: validationEnd
    });
  }
}
if (has(validationEnd))
  specs.push({
    key: 'B',
    label: `newly available period (after the ${validationEnd} close) → ${end}: ${label}`,
    after: validationEnd,
    through: end
  });
specs.push({ key: 'C', label: `entire window ${first} → ${end}`, after: null, through: end });

const periods = specs.map((s) => periodMetrics(main.L, main.door, s));
const post = specs.find((s) => s.key === 'B');
const ledger = post ? periodLedger(main.L, main.door, post) : [];
const funding = post ? periodFunding(main.r, main.door, post) : [];

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
  '',
  ...periods.map((p) => `- **${p.key}** — ${p.label}`),
  '',
  table,
  ''
].join('\n');

console.info(md);
if (trajectory)
  console.info(
    `Trajectory through ${validationEnd} equal to FULL: ${trajectory.identical ? 'yes (decision for decision)' : `NO: ${trajectory.differences.join('; ')}`}`
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
