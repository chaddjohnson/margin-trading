// Event-level parity of a pooled replay against the archived research ledgers (Priority 6). Used by the parity script
// and the real-data tests; never by the running application.
//
//   Priority 2 / Priority 3 FULL ledgers (`NN-lots.csv`, `NN-funding.csv`, `NN-daily.csv`): every funded lot — entry
//   time, raw and after-cost price, principal, shares, each exit fill (time, partial/final, reason, raw price, shares,
//   repaid principal, net), interest, costs, realized, unrealized, net, status — every funding decision (granted lots,
//   refusals with their occupant) and every session's marked net.
//   5B development ledgers (D24 door, `lots.csv` with JSON exits): every lot entered by 2024-12-31; those closed by then
//   in full (the FULL run is causal, so its prefix is the D24 run); the one open at the D24 end on its entry and the
//   exits it had by then.

import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import type { CandidateEntry, PortfolioPosition } from '../shared/portfolio.ts';
import type { ReplayArtifacts } from './portfolio-bridge.ts';

export interface LedgerComparison {
  ledger: string;
  scope: string;
  compared: string;
  pass: boolean;
  problems: string[];
}

/** RFC 4180 CSV (quoted fields with commas and doubled quotes) → rows keyed by the header. */
export function parseCsvRows(text: string): Record<string, string>[] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i]!;
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') {
        field += '"';
        i++;
      } else if (c === '"') quoted = false;
      else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ',') {
      row.push(field);
      field = '';
    } else if (c === '\n') {
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else if (c !== '\r') field += c;
  }
  if (field || row.length) {
    row.push(field);
    rows.push(row);
  }
  const [head, ...body] = rows;
  return body.filter((r) => r.length > 1).map((r) => Object.fromEntries(head!.map((h, i) => [h, r[i] ?? ''])));
}

const minute = (s: string) => s.replace(' ', 'T').replace(/Z$/, '').slice(0, 16);
const num = (s: string | undefined) => (s === undefined || s === '' ? NaN : Number(s));
const near = (a: number, b: number, tol: number) => Math.abs(a - b) <= tol;

interface ArchivedFill {
  t: string;
  partial: boolean;
  reason: string;
  raw: number;
  shares: number | null;
  repaid: number | null;
  net: number;
}

const FILL_RE = /^(\d{4}-\d\d-\d\d \d\d:\d\dZ) (partial|final) (.+?) @ (\S+) \((\S+) sh, repaid (\S+), net (\S+)\)$/;
const parseFills = (s: string): ArchivedFill[] =>
  s
    ? s.split(' | ').map((x) => {
        const m = FILL_RE.exec(x.trim());
        if (!m) throw new Error(`unparsable archived fill: ${x}`);
        return { t: minute(m[1]!), partial: m[2] === 'partial', reason: m[3]!, raw: num(m[4]), shares: num(m[5]), repaid: num(m[6]), net: num(m[7]) };
      })
    : [];

function compareLot(p: PortfolioPosition, a: Record<string, string>, problems: string[], opts: { full: boolean; d1Format: 'p3' | 'p2' }) {
  const at = `lot ${a.lot} (${p.id})`;
  const book = opts.d1Format === 'p3' ? a.component : `${a.family}:VGT`;
  if (book !== p.book) problems.push(`${at}: component ${book} ≠ ${p.book}`);
  const entry = p.fills[0]!;
  if (minute(a.entry!) !== minute(entry.t)) problems.push(`${at}: entry ${a.entry} ≠ ${entry.t}`);
  if (minute(a.decision!) !== minute(p.decisionT)) problems.push(`${at}: decision ${a.decision} ≠ ${p.decisionT}`);
  if (!near(num(a.decisionPrice), p.decisionPrice, 1e-9)) problems.push(`${at}: decision price ${a.decisionPrice} ≠ ${p.decisionPrice}`);
  if (!near(num(a.entryRaw), entry.price, 1e-9)) problems.push(`${at}: entry raw ${a.entryRaw} ≠ ${entry.price}`);
  if (!near(num(a.entryAfterCost), entry.priceAfterCost, 1e-9)) problems.push(`${at}: entry after cost ${a.entryAfterCost} ≠ ${entry.priceAfterCost}`);
  if (!near(num(a.principal), p.principal, 1e-6)) problems.push(`${at}: principal ${a.principal} ≠ ${p.principal}`);
  if (!near(num(a.shares), p.shares, 5e-7)) problems.push(`${at}: shares ${a.shares} ≠ ${p.shares}`);
  if (a.kind !== p.setup) problems.push(`${at}: setup ${a.kind} ≠ ${p.setup}`);
  const fills = parseFills(a.fills ?? '');
  const exits = p.fills.slice(1);
  if (fills.length !== exits.length) problems.push(`${at}: ${fills.length} archived fills ≠ ${exits.length}`);
  fills.forEach((f, i) => {
    const g = exits[i];
    if (!g) return;
    const w = `${at} fill ${i + 1}`;
    if (f.t !== minute(g.t)) problems.push(`${w}: time ${f.t} ≠ ${g.t}`);
    if (f.partial !== (g.kind === 'partial')) problems.push(`${w}: partial ${f.partial} ≠ ${g.kind}`);
    if (f.reason !== g.reason) problems.push(`${w}: reason ${f.reason} ≠ ${g.reason}`);
    if (!near(f.raw, g.price, 1e-9)) problems.push(`${w}: price ${f.raw} ≠ ${g.price}`);
    if (f.shares !== null && !near(f.shares, g.shares, 5e-5)) problems.push(`${w}: shares ${f.shares} ≠ ${g.shares}`);
    if (f.repaid !== null && !near(f.repaid, g.principalRepaid!, 0.005)) problems.push(`${w}: repaid ${f.repaid} ≠ ${g.principalRepaid}`);
    if (!near(f.net, g.fillNet!, 0.0051)) problems.push(`${w}: net ${f.net} ≠ ${g.fillNet}`);
  });
  const status = p.status === 'open' ? 'open' : 'closed';
  if (a.status !== status) problems.push(`${at}: status ${a.status} ≠ ${status}`);
  if (p.partialExits !== fills.filter((f) => f.partial).length) problems.push(`${at}: partial exits differ`);
  for (const [k, got] of [
    ['interest', p.interest],
    ['costs', p.costs],
    ['realized', p.realized],
    ['unrealized', p.unrealized],
    ['net', p.net],
    ['mae', p.mae]
  ] as const)
    if (!near(num(a[k]), got, 0.0051)) problems.push(`${at}: ${k} ${a[k]} ≠ ${got}`);
  // Priority 3's CSV labels an open lot's exit-reason column "open (marked at the last close)"; the position has none.
  const archivedReason = a.exitReason === 'open (marked at the last close)' && p.status === 'open' ? null : a.exitReason || null;
  if (a.exitReason !== undefined && archivedReason !== p.exitReason) problems.push(`${at}: exit reason ${a.exitReason} ≠ ${p.exitReason}`);
}

function compareFullLedger(
  repoRoot: string,
  entry: CandidateEntry,
  r: ReplayArtifacts,
  ref: CandidateEntry['ledgers'][number]
): LedgerComparison {
  const problems: string[] = [];
  const format = ref.files.lots.path.includes('/vgt-d1-growth-joint/') ? 'p2' : 'p3';
  const lots = parseCsvRows(readFileSync(join(repoRoot, ref.files.lots.path), 'utf8'));
  if (lots.length !== r.positions.length) problems.push(`${lots.length} archived lots ≠ ${r.positions.length} positions`);
  lots.forEach((a, i) => {
    const p = r.positions[i];
    if (!p) return;
    if (Number(a.lot) !== p.lot) problems.push(`row ${i + 1}: lot ${a.lot} ≠ ${p.lot}`);
    compareLot(p, a, problems, { full: true, d1Format: format });
  });
  let funding = 0;
  if (ref.files.funding) {
    const rows = parseCsvRows(readFileSync(join(repoRoot, ref.files.funding.path), 'utf8'));
    funding = rows.length;
    const refused = r.events.filter((e) => e.kind === 'rejected_signal');
    const archivedRefused = rows.filter((x) => x.outcome === 'refused');
    if (archivedRefused.length !== refused.length) problems.push(`${archivedRefused.length} archived refusals ≠ ${refused.length} refused events`);
    archivedRefused.forEach((x, i) => {
      const e = refused[i];
      if (!e) return;
      const book = format === 'p3' ? x.component : `${x.family}:VGT`;
      if (e.meta?.book !== book) problems.push(`refusal ${i + 1}: book ${book} ≠ ${String(e.meta?.book)}`);
      if (minute(x.decision!) !== minute(e.t)) problems.push(`refusal ${i + 1}: time ${x.decision} ≠ ${e.t}`);
      if (!near(num(x.price), e.price ?? NaN, 1e-9)) problems.push(`refusal ${i + 1}: price ${x.price} ≠ ${e.price}`);
      if (x.reason !== 'slot occupied') problems.push(`refusal ${i + 1}: archived reason ${x.reason}`);
      const occupant = e.values.find((v) => v.key === 'occupant')?.value;
      if (format === 'p3' && x.occupant !== occupant) problems.push(`refusal ${i + 1}: occupant ${x.occupant} ≠ ${String(occupant)}`);
    });
    const archivedGranted = rows.filter((x) => x.outcome === 'granted');
    if (archivedGranted.length !== r.positions.length + r.metrics.pending.length)
      problems.push(`${archivedGranted.length} archived grants ≠ ${r.positions.length} positions + ${r.metrics.pending.length} pending`);
    archivedGranted.forEach((x, i) => {
      const p = r.positions[i];
      if (p && minute(x.decision!) !== minute(p.decisionT)) problems.push(`grant ${i + 1}: decision ${x.decision} ≠ ${p.decisionT}`);
    });
  }
  let daily = 0;
  if (ref.files.daily) {
    const rows = parseCsvRows(readFileSync(join(repoRoot, ref.files.daily.path), 'utf8'));
    daily = rows.length;
    if (rows.length !== r.equity.dates.length) problems.push(`${rows.length} archived daily marks ≠ ${r.equity.dates.length} sessions`);
    let bad = 0;
    rows.forEach((x, i) => {
      if (x.date !== r.equity.dates[i] || !near(num(x.marked), r.equity.marked[i]!, 0.0051)) {
        if (bad++ < 5) problems.push(`daily ${x.date}: marked ${x.marked} ≠ ${r.equity.dates[i]} ${r.equity.marked[i]}`);
      }
    });
    if (bad > 5) problems.push(`… ${bad} daily marks differ in all`);
  }
  return {
    ledger: ref.files.lots.path.replace(/-lots\.csv$/, '-*.csv'),
    scope: ref.scope,
    compared: `${lots.length} lots${funding ? `, ${funding} funding decisions` : ''}${daily ? `, ${daily} daily marks` : ''}`,
    pass: problems.length === 0,
    problems
  };
}

interface DevExit {
  t: string;
  date: string;
  raw: number;
  partial: boolean;
  reason: string;
  net: number;
}

function compareDevLedger(repoRoot: string, r: ReplayArtifacts, ref: CandidateEntry['ledgers'][number]): LedgerComparison {
  const problems: string[] = [];
  const rows = parseCsvRows(readFileSync(join(repoRoot, ref.files.lots.path), 'utf8'));
  const boundary = Date.parse('2025-01-01T05:00:00Z'); // after the 2024-12-31 close in New York
  const entered = r.positions.filter((p) => Date.parse(p.fills[0]!.t) < boundary);
  if (rows.length !== entered.length) problems.push(`${rows.length} archived D24 lots ≠ ${entered.length} positions entered by 2024-12-31`);
  rows.forEach((a, i) => {
    const p = entered[i];
    if (!p) return;
    const at = `lot ${a.lot} (${p.id})`;
    if (Number(a.lot) !== p.lot) problems.push(`${at}: lot number differs`);
    if (a.book !== p.book) problems.push(`${at}: book ${a.book} ≠ ${p.book}`);
    if (a.kind !== p.setup) problems.push(`${at}: setup ${a.kind} ≠ ${p.setup}`);
    const e = p.fills[0]!;
    if (minute(a.entry!) !== minute(e.t)) problems.push(`${at}: entry ${a.entry} ≠ ${e.t}`);
    if (minute(a.decision!) !== minute(p.decisionT)) problems.push(`${at}: decision ${a.decision} ≠ ${p.decisionT}`);
    if (!near(num(a.entryRaw), e.price, 1e-9)) problems.push(`${at}: entry raw ${a.entryRaw} ≠ ${e.price}`);
    if (!near(num(a.entryPrice), e.priceAfterCost, 1e-9)) problems.push(`${at}: entry price ${a.entryPrice} ≠ ${e.priceAfterCost}`);
    if (!near(num(a.principal), p.principal, 1e-6)) problems.push(`${at}: principal ${a.principal} ≠ ${p.principal}`);
    const exits = JSON.parse(a.exits || '[]') as DevExit[];
    const ours = p.fills.slice(1).filter((f) => Date.parse(f.t) < boundary);
    if (exits.length !== ours.length) problems.push(`${at}: ${exits.length} archived exits by 2024-12-31 ≠ ${ours.length}`);
    exits.forEach((x, j) => {
      const g = ours[j];
      if (!g) return;
      if (minute(x.t) !== minute(g.t)) problems.push(`${at} exit ${j + 1}: ${x.t} ≠ ${g.t}`);
      if (x.partial !== (g.kind === 'partial')) problems.push(`${at} exit ${j + 1}: partial differs`);
      if (x.reason !== g.reason) problems.push(`${at} exit ${j + 1}: reason ${x.reason} ≠ ${g.reason}`);
      if (!near(x.raw, g.price, 1e-9)) problems.push(`${at} exit ${j + 1}: price ${x.raw} ≠ ${g.price}`);
      if (!near(x.net, g.fillNet!, 0.0051)) problems.push(`${at} exit ${j + 1}: net ${x.net} ≠ ${g.fillNet}`);
    });
    const archivedOpen = a.open === 'true';
    const closedByBoundary = p.status === 'closed' && Date.parse(p.fills.at(-1)!.t) < boundary;
    if (archivedOpen === closedByBoundary) problems.push(`${at}: open at the D24 end ${archivedOpen} but closed by then ${closedByBoundary}`);
    if (closedByBoundary) {
      if (!near(num(a.net), p.net, 0.0051)) problems.push(`${at}: net ${a.net} ≠ ${p.net}`);
      if (!near(num(a.interest), p.interest, 0.0051)) problems.push(`${at}: interest ${a.interest} ≠ ${p.interest}`);
      if (!near(num(a.costs), p.costs, 0.0051)) problems.push(`${at}: costs ${a.costs} ≠ ${p.costs}`);
    }
  });
  return { ledger: ref.files.lots.path, scope: ref.scope, compared: `${rows.length} lots entered by 2024-12-31`, pass: problems.length === 0, problems };
}

/** Every archived ledger of a catalog entry against the replay. */
export function compareLedgers(repoRoot: string, entry: CandidateEntry, r: ReplayArtifacts): LedgerComparison[] {
  return entry.ledgers.map((ref) =>
    ref.scope === 'full' ? compareFullLedger(repoRoot, entry, r, ref) : compareDevLedger(repoRoot, r, ref)
  );
}
