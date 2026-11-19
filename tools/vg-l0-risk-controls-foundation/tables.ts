// Markdown tables from the sealed records (regenerated, not sealed): research/vg-l0-risk-controls-foundation/tables/.
import fs from 'node:fs';
import path from 'node:path';
import { resultsDir, studyDir } from './common.ts';

const read = <T>(f: string) => JSON.parse(fs.readFileSync(path.join(resultsDir, f), 'utf8')) as T;
const out = path.join(studyDir, 'tables');
const money = (x: number) => (x < 0 ? `−$${Math.abs(x).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : `$${x.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
const table = (head: string[], rows: (string | number)[][]) =>
  [`| ${head.join(' | ')} |`, `|${head.map(() => '---').join('|')}|`, ...rows.map((r) => `| ${r.join(' | ')} |`)].join('\n');

fs.mkdirSync(out, { recursive: true });

// ----- the frozen New L0's full funded trade list (G1) -----
interface Lot {
  lot: string;
  book: string;
  kind: string;
  decision: string;
  entry: string;
  entryRaw: number;
  entryPrice: number;
  exits: { t: string; raw: number; reason: string; net: number }[];
  open: boolean;
  net: number;
  interest: number;
  costs: number;
  gross: number;
  mae: number;
}
const g = read<{
  G1: { headline: Record<string, number | string>; counts: Record<string, unknown>; tradeList: Lot[]; door: Record<string, unknown>; tradeListSha256: string; fundingSha256: string; markChangesSha256: string };
  G2: { rows: number; lots: number; equal: boolean };
  G3: Record<string, { equal: boolean; net: number; dd: number; lots: number; signature: string; counts: { lots: number; fundingDecisions: number; refused: number } }> & { sealedC24: { commonFields: number[] } };
}>('gates/g1-g3-new-l0.json');
const lots = g.G1.tradeList;

fs.writeFileSync(
  path.join(out, 'new-l0-full-trades.md'),
  `# New L0 — the full funded trade list (FULL 2016-01-04 → 2026-10-30, legacy controls)\n\nFrom the sealed G1 record \`results/gates/g1-g3-new-l0.json\` (identical under Priority 3's engine and the controlled runner with legacy controls; sha256 of the ledger rows \`${g.G1.tradeListSha256.slice(0, 16)}…\`). Times are UTC; prices raw (entry also after the 5 bps cost); P&L after costs and interest; MAE = the lot's lowest mark. ${lots.length} lots.\n\n${table(
    ['#', 'Book', 'Kind', 'Decision', 'Entry', 'Entry raw', 'Exit', 'Exit raw', 'Exit reason', 'Gross', 'Interest', 'Net', 'MAE'],
    lots.map((l) => [
      l.lot,
      l.book,
      l.kind,
      l.decision.replace('T', ' '),
      l.entry.replace('T', ' '),
      l.entryRaw,
      l.open ? 'open at end' : l.exits[0]!.t.replace('T', ' '),
      l.open ? '—' : l.exits[0]!.raw.toFixed(4),
      l.open ? 'open' : l.exits[0]!.reason,
      money(l.gross),
      money(l.interest),
      money(l.net),
      money(l.mae)
    ])
  )}\n`
);

// ----- parity -----
const g4 = read<{ equal: number; failures: number; rows: { door: string; inc: string; res: string; counts: { lots: number } }[] }>('gates/g4-random-parity.json');
const g5 = read<{ checks: Record<string, number>; failures: string[]; pairs: number }>('gates/g5-invariants-a2.json');
const g5first = read<{ checks: Record<string, number>; failures: string[] }>('gates/g5-invariants.json');
const g0 = read<{ ok: boolean; digests: Record<string, { now: string; sealed: string }> }>('gates/g0-isolation.json');
const g7 = read<{ ok: boolean; preflight: { study: string; ok: boolean; version: string }[]; seals: Record<string, { files: number; ok: number }> }>('gates/g7-frozen-a3.json');

fs.writeFileSync(
  path.join(out, 'gates.md'),
  `# Engineering gates (sealed records in results/gates/)\n\n## G0 isolation\n\n${table(
    ['Evaluation digest', 'Now', 'Sealed', 'Equal'],
    Object.entries(g0.digests).map(([k, v]) => [k, `\`${v.now.slice(0, 16)}…\``, `\`${v.sealed.slice(0, 16)}…\``, v.now === v.sealed ? 'yes' : 'NO'])
  )}\n\n## G1–G3 New L0 legacy parity\n\n${table(
    ['Door', 'Controlled = Priority 3', 'Net', 'Max minute DD', 'Lots', 'Funding decisions (refused)', 'Ledger signature'],
    [
      ['FULL', 'yes (+ the sealed 5B R01 record, every field)', money(Number(g.G1.headline.net)), money(Number(g.G1.headline.minuteDd)), String(g.G1.headline.lots), `${String(g.G1.counts.fundingDecisions)} (${String(g.G1.counts.refused)})`, `\`${String(g.G1.headline.signature)}\``],
      ...(['D19', 'D21', 'D23', 'D24'] as const).map((d) => [
        d,
        g.G3[d]!.equal ? (d === 'D24' ? `yes (+ 5B's sealed C24 centre, ${g.G3.sealedC24.commonFields[0]} fields)` : 'yes') : 'NO',
        money(g.G3[d]!.net),
        money(g.G3[d]!.dd),
        String(g.G3[d]!.lots),
        `${g.G3[d]!.counts.fundingDecisions} (${g.G3[d]!.counts.refused})`,
        `\`${g.G3[d]!.signature}\``
      ])
    ]
  )}\n\nG2: the D24 run's ${g.G2.lots} lots equal 5B's development ledger (${g.G2.rows} rows): ${g.G2.equal ? 'yes' : 'NO'}.\n\n## G4 random-configuration legacy parity\n\n${g4.equal} of ${g4.equal + g4.failures} runs identical (60 configurations × D21, D24; ${g4.rows.reduce((a, r) => a + r.counts.lots, 0).toLocaleString('en-US')} funded lots compared; inclusions ${['V', 'G', 'B'].map((i) => `${i} ${g4.rows.filter((r) => r.inc === i).length}`).join(', ')}).\n\n## G5 non-default invariants (pass counts only; AD7)\n\n${table(
    ['Check', 'Passes (rerun after A2)', 'First run (sealed, A2)'],
    Object.keys(g5.checks).map((k) => [k, String(g5.checks[k]), String(g5first.checks[k] ?? 0)])
  )}\n\nFailures: rerun ${g5.failures.length}; first run ${g5first.failures.length} (all "causality G:VGT", a tool error fixed by amendment A2).\n\n## G7 frozen work\n\nPreflight: ${g7.preflight.filter((p) => p.ok).length} of ${g7.preflight.length} studies pass. Sealed records verify: ${Object.entries(g7.seals).map(([k, v]) => `${k} ${v.ok}/${v.files}`).join(', ')}.\n`
);

// ----- demonstrations -----
interface Demo {
  name: string;
  note: string;
  trades: { trade: number; kind: string; decision: string; gate: string; entry: string | null; entryRaw: number; protectiveLevel: number | null; hold: { effectiveDaysAtExit: number | null; extendedFrom: string | null }; exit: { date: string; raw: number; reason: string } | null; net: number }[];
  events: { type: string; date: string; reason?: string; kind?: string; minutes?: number }[];
}
const demos = read<{ families: Demo[] }>('demonstrations.json').families;

fs.writeFileSync(
  path.join(out, 'demonstrations.md'),
  `# Demonstrations on synthetic paths (correctness, not performance)\n\nFrom \`results/demonstrations.json\` (sealed). Grid: X 10%, Y 1%, trailing stop 5%, hold 5 calendar days, L 3, buffer 2%, P 5%, W 5; $100,000 virtual book; 5 bps per side; 11% interest.\n\n${demos
    .map(
      (d) =>
        `## ${d.name}\n\n${d.note}\n\n${table(
          ['Trade', 'Kind', 'Decision', 'Gate at decision', 'Entry', 'Entry raw', 'Protective level', 'Exit', 'Exit raw', 'Reason', 'Effective hold, at exit or latest (extended from)', 'Net'],
          d.trades.map((t) => [
            String(t.trade),
            t.kind,
            t.decision,
            t.gate,
            t.entry ?? '—',
            String(t.entryRaw),
            t.protectiveLevel === null ? '—' : t.protectiveLevel.toFixed(4),
            t.exit?.date ?? 'open',
            t.exit ? t.exit.raw.toFixed(4) : '—',
            t.exit?.reason ?? 'open',
            `${t.hold.effectiveDaysAtExit === null ? '—' : t.hold.effectiveDaysAtExit === Infinity || String(t.hold.effectiveDaysAtExit) === '__Inf' ? '∞' : t.hold.effectiveDaysAtExit}${t.hold.extendedFrom ? ` (${t.hold.extendedFrom})` : ''}`,
            money(t.net)
          ])
        )}${d.events.length ? `\n\nEvents: ${d.events.map((e) => `${e.date} ${e.type}${e.reason ? ` (${e.reason})` : ''}${e.kind ? ` [${e.kind}, ${e.minutes} min]` : ''}`).join('; ')}.` : ''}\n`
    )
    .join('\n')}`
);
console.log(`tables written to ${path.relative(process.cwd(), out)}`);
