// Canonical parity of the five pooled candidates (Priority 6): ONE FULL door, each catalog candidate replayed through
// the Strategy Lab bridge (runner/portfolio-bridge.ts, the research engine unchanged), compared with the archived
// targets, the archived compact records and the archived ledgers:
//
//   - headline: full-history marked net, maximum minute drawdown, 2025–2026 marked net (continuous run), development
//     net and drawdown, realized/unrealized, lot count, ledger signature, every field of the archived record;
//   - event level: every funded lot of an archived ledger (entry time and price, principal, shares, each exit fill's
//     time, partial flag, raw price, shares, repaid principal and net, interest, costs, status, open balance) against
//     the bridge's positions; the archived funding log (granted / refused, occupant) against the bridge's refusals;
//     the archived daily marks against the bridge's equity series. FULL ledgers cover the whole run; the 5B
//     development (D24) ledgers cover the lots closed by 2024-12-31 (the run is causal, so its prefix is the D24 run).
//
//   node --experimental-transform-types --max-old-space-size=6144 apps/strategy-lab/scripts/portfolio-parity.ts [--out <file>]
//   npm --prefix apps/strategy-lab run portfolio-parity -- [--out <file>]
//
// From the repository root. Reads canonical data and research records only; writes only the --out file.

import { writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { openFullDoor } from '../../../src/vg-d1-growth-joint/data.ts';
import { frozenSelectionFile } from '../../../src/vg-d1-growth-joint/context.ts';
import { p3 } from '../../../src/vg-d1-growth-diagnostic/context.ts';
import { replayCandidate } from '../runner/portfolio-bridge.ts';
import { readCatalog } from '../runner/portfolio-catalog-read.ts';
import { compareLedgers } from '../runner/portfolio-ledgers.ts';

const repoRoot = join(fileURLToPath(new URL('.', import.meta.url)), '..', '..', '..');
const outArg = process.argv.indexOf('--out');
// a relative --out is where the user typed the command (npm --prefix runs the script from the repository root)
const out = outArg > 0 ? resolve(process.env.INIT_CWD ?? process.cwd(), process.argv[outArg + 1]!) : null;

const t0 = Date.now();
const catalog = readCatalog(repoRoot);
const door = await openFullDoor('Strategy Lab pooled-candidate parity (read-only)', { file: frozenSelectionFile, sha256: p3.frozenSelectionSha256 }, true);
const loadMs = Date.now() - t0;
const results = [];
for (const entry of catalog.candidates) {
  const t = Date.now();
  const a = replayCandidate(door, entry, `PR-${'0'.repeat(64)}`);
  const ledgers = compareLedgers(repoRoot, entry, a);
  const failed = a.metrics.parity.checks.filter((c) => !c.pass);
  const row = {
    id: entry.id,
    name: entry.name,
    replayMs: Date.now() - t,
    status: a.metrics.parity.status === 'verified' && ledgers.every((l) => l.pass) ? 'verified' : 'mismatch',
    full: { net: a.metrics.full.net, minuteDd: a.metrics.full.minuteDd.usd },
    validation: { net: a.metrics.validation.net, resetDd: a.metrics.validation.resetDd.usd },
    development: { net: a.metrics.development.net, minuteDd: a.metrics.development.minuteDd.usd },
    targets: {
      fullNet: entry.targets.fullNet,
      fullMinuteDd: entry.targets.fullMinuteDd,
      validationNet: entry.targets.validationNet,
      developmentNet: entry.targets.developmentNet,
      developmentMinuteDd: entry.targets.developmentMinuteDd
    },
    positions: a.metrics.full.positions,
    openPositions: a.metrics.full.openPositions,
    partialExits: a.metrics.full.partialExits,
    refusedSlotOccupied: a.metrics.refusals.slotOccupied,
    pending: a.metrics.pending,
    events: a.events.length,
    recordChecks: a.metrics.parity.checks.length,
    failedChecks: failed,
    ledgers
  };
  results.push(row);
  console.log(
    `${entry.order}. ${entry.name}: ${row.status} — net ${row.full.net} (target ${entry.targets.fullNet}), minute DD ${row.full.minuteDd} (${entry.targets.fullMinuteDd}), 2025–2026 ${row.validation.net} (${entry.targets.validationNet}); ${row.positions} positions, ${row.partialExits} partial exits, ${row.refusedSlotOccupied} refusals; ${a.metrics.parity.checks.length - failed.length}/${a.metrics.parity.checks.length} record checks; ledgers ${ledgers.map((l) => `${l.ledger}: ${l.pass ? 'pass' : 'FAIL'} (${l.compared})`).join('; ')} [${row.replayMs} ms]`
  );
  for (const f of failed.slice(0, 12)) console.log(`   ✗ ${f.field}: target ${f.target} got ${f.got}`);
  for (const l of ledgers.filter((x) => !x.pass)) for (const p of l.problems.slice(0, 12)) console.log(`   ✗ ${l.ledger}: ${p}`);
}
const report = {
  kind: 'strategy-lab pooled-candidate parity',
  benchmark: catalog.benchmark,
  door: { name: door.name, from: door.from, to: door.to, sessions: door.sessions, data: { VGT: door.sym.VGT.dataSha256, GDX: door.sym.GDX.dataSha256 } },
  catalogEntries: Object.fromEntries(catalog.candidates.map((c) => [c.id, c.entrySha256])),
  loadMs,
  node: process.version,
  results,
  allVerified: results.every((r) => r.status === 'verified'),
  rssMb: Math.round(process.memoryUsage().rss / 2 ** 20)
};
if (out) writeFileSync(out, `${JSON.stringify(report, null, 2)}\n`);
console.log(`${report.allVerified ? 'ALL VERIFIED' : 'MISMATCH'} — door ${loadMs} ms, rss ${report.rssMb} MB`);
if (!report.allVerified) process.exitCode = 1;
