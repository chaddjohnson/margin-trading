// Independent recomputation of the principal runs from their exported files (PROTOCOL.md §11.3): nothing here reads
// an engine object. For each run directory it re-derives, from account_ledger.csv, trades.csv, daily.csv and
// margin_requirements.csv:
//
//   inventories    replaying every event's signed share change reproduces the logged VOOG, core VGT and lot shares
//   identity       assets − liabilities = equity at every event and every close, from the logged balances
//   entries        an entry moves no cash and adds principal equal to its purchase (borrowing is not profit)
//   lots           interest = principal × 11% × days / 365, net = proceeds − principal − interest, Σ net = realized
//   dividends      one receivable per ex-date, source and lot; every paid receivable was booked once
//   pool           at every entry the open principal ≤ f × equity at its decision; fixed lots borrow their pool exactly
//   maintenance    each schedule's requirement recomputed from the per-security values of margin_requirements.csv
import path from 'node:path';
import fs from 'fs-extra';
import { parse } from 'csv-parse/sync';
import { log, protocol, stageDir, writeJson } from './context.ts';
import type { Universe } from './data.ts';
import { catalogue, runDir } from './scenarios.ts';

type Row = Record<string, string>;

const read = async (file: string): Promise<Row[]> =>
  (await fs.pathExists(file)) ? parse(await fs.readFile(file), { columns: true }) : [];

const n = (value: string | undefined) => (value === undefined || value === '' ? NaN : Number(value));

export interface LedgerAuditOutcome {
  key: string;
  mode: string;
  events: number;
  closes: number;
  lots: number;
  checks: number;
  failures: string[];
}

const near = (a: number, b: number, absolute: number) =>
  Math.abs(a - b) <= absolute + 1e-9 * Math.max(1, Math.abs(a), Math.abs(b));

export const auditRun = async (key: string, dir: string): Promise<LedgerAuditOutcome> => {
  const summary = await fs.readJson(path.join(dir, 'summary.json'));
  const mode: string = summary.config.mode;
  const fraction: number = summary.config.fraction;
  const rate: number = summary.config.interest.rate;
  const isSplit = summary.config.policy === 'split';
  const failures: string[] = [];
  let checks = 0;
  const check = (ok: boolean, message: string) => {
    checks++;

    if (!ok && failures.length < 50) {
      failures.push(message);
    }
  };
  const trades = await read(path.join(dir, 'trades.csv'));
  const daily = await read(path.join(dir, 'daily.csv'));

  // Lots: interest, net and the realized total (both modes).
  let realized = 0;

  for (const trade of trades) {
    const principal = n(trade.principal);
    const days = n(trade.hold_days);

    if (summary.config.interest.kind === 'simple') {
      check(
        near(n(trade.interest), (principal * rate * days) / 365, 0.01),
        `${key} lot ${trade.lot_id}: interest ${trade.interest} vs ${(principal * rate * days) / 365}`
      );
    }

    if (trade.is_open === 'false') {
      const proceeds = n(trade.shares) * n(trade.exit_price);

      check(
        near(n(trade.net), proceeds - principal - n(trade.interest), 0.01) || n(trade.repaid_by_core) > 0,
        `${key} lot ${trade.lot_id}: net ${trade.net} vs ${proceeds - principal - n(trade.interest)}`
      );
      realized += n(trade.net);
    }

    if (mode === 'fixed') {
      check(
        near(principal, isSplit ? protocol.splitPrincipal : protocol.fixedPrincipal, 1e-6),
        `${key} lot ${trade.lot_id}: fixed principal ${principal} (compounding?)`
      );
    }
  }

  const lastDaily = daily.at(-1);

  if (lastDaily) {
    check(
      near(n(lastDaily.realized), realized, 0.05),
      `${key}: realized ${lastDaily.realized} vs Σ lot nets ${realized}`
    );
  }

  if (mode === 'fixed') {
    return { key, mode, events: 0, closes: daily.length, lots: trades.length, checks, failures };
  }

  // Inventories and the balance-sheet identity at every event.
  const events = await read(path.join(dir, 'account_ledger.csv'));
  const inventory = { VOOG: 0, VGT: 0 } as Record<string, number>;
  const lotShares = { VGT: 0, XBI: 0, XRT: 0, KRE: 0 } as Record<string, number>;
  const receivables = new Set<string>();
  let previousCash = 0;
  let previousPrincipal = 0;

  for (const event of events) {
    const kind = event.kind!;
    const security = event.security!;
    const shares = n(event.shares);

    if (kind === 'start') {
      inventory.VOOG = n(event.voog_shares);
      inventory.VGT = n(event.vgt_core_shares);
    } else if (kind === 'entry') {
      lotShares[security] = (lotShares[security] ?? 0) + shares;
      check(near(n(event.cash) - previousCash, 0, 1e-6), `${key} ${event.date} entry moved cash`);
      check(
        near(n(event.principal) - previousPrincipal, shares * n(event.price), 0.01),
        `${key} ${event.date} entry principal ${n(event.principal) - previousPrincipal} vs purchase ${shares * n(event.price)}`
      );
    } else if (kind === 'exit' || (kind === 'forced sale' && event.lot_id !== '')) {
      lotShares[security] = (lotShares[security] ?? 0) + shares;
    } else if (['reinvest', 'fund loss', 'rebalance', 'dividend paid', 'forced sale'].includes(kind)) {
      inventory[security] = (inventory[security] ?? 0) + shares;
    } else if (kind === 'ex-date') {
      const id = `${security}:${event.date}:${event.lot_id}`;

      check(!receivables.has(id), `${key} duplicate entitlement ${id}`);
      receivables.add(id);
    }

    check(
      near(inventory.VOOG!, n(event.voog_shares), 1e-6),
      `${key} ${event.date} ${kind}: VOOG ${inventory.VOOG} vs ${event.voog_shares}`
    );
    check(
      near(inventory.VGT!, n(event.vgt_core_shares), 1e-6),
      `${key} ${event.date} ${kind}: core VGT ${inventory.VGT} vs ${event.vgt_core_shares}`
    );

    for (const symbol of ['VGT', 'XBI', 'XRT', 'KRE']) {
      check(
        near(lotShares[symbol]!, n(event[`lot_${symbol.toLowerCase()}`]), 1e-6),
        `${key} ${event.date} ${kind}: ${symbol} lots ${lotShares[symbol]} vs ${event[`lot_${symbol.toLowerCase()}`]}`
      );
    }

    const lmv = n(event.mv_voog) + n(event.mv_vgt) + n(event.mv_xbi) + n(event.mv_xrt) + n(event.mv_kre);
    const equity =
      lmv +
      n(event.receivables) +
      n(event.cash) -
      n(event.principal) -
      n(event.interest_liability) -
      n(event.funding_payable);

    check(near(lmv, n(event.lmv), 0.01), `${key} ${event.date} ${kind}: LMV ${lmv} vs ${event.lmv}`);
    check(near(equity, n(event.equity), 0.01), `${key} ${event.date} ${kind}: equity ${equity} vs ${event.equity}`);
    check(n(event.cash) >= -0.005, `${key} ${event.date} ${kind}: negative cash ${event.cash}`);
    previousCash = n(event.cash);
    previousPrincipal = n(event.principal);
  }

  // Every paid dividend was entitled once.
  const paid = events.filter((event) => event.kind === 'dividend paid').length;

  check(paid <= receivables.size, `${key}: ${paid} payments for ${receivables.size} entitlements`);

  // The identity at every close, from the daily file's own columns.
  for (const row of daily) {
    const lmv = n(row.mv_voog) + n(row.mv_vgt) + n(row.mv_xbi) + n(row.mv_xrt) + n(row.mv_kre);
    const equity =
      lmv + n(row.cash) + n(row.receivables) - n(row.principal) - n(row.interest_liability) - n(row.funding_payable);

    check(near(equity, n(row.equity), 0.01), `${key} ${row.date}: equity ${equity} vs ${row.equity}`);
    check(
      near(n(row.mv_voog), n(row.voog_shares) * n(row.voog_close), 0.01),
      `${key} ${row.date}: VOOG value ${row.mv_voog} vs shares × close`
    );
  }

  // The pool cap at every entry.
  for (const trade of trades) {
    const cap = fraction * n(trade.equity_at_decision);
    const entry = trade.entry_time!;
    const overlapping = trades.filter(
      (other) =>
        other !== trade &&
        (other.entry_time! < entry || (other.entry_time === entry && n(other.lot_id) < n(trade.lot_id))) &&
        (other.is_open === 'true' || other.exit_time! > entry)
    );
    const total = n(trade.principal) + overlapping.reduce((sum, other) => sum + n(other.principal), 0);

    check(total <= cap * (1 + 1e-9) + 0.01, `${key} lot ${trade.lot_id}: open principal ${total} > cap ${cap}`);
  }

  // Maintenance requirements from the per-security values.
  const margin = await read(path.join(dir, 'margin_requirements.csv'));
  const dailyByDate = new Map(daily.map((row) => [row.date!, row]));

  for (const row of margin) {
    const values = dailyByDate.get(row.date!);

    if (!values) {
      continue;
    }

    const mv = {
      VOOG: n(values.mv_voog),
      VGT: n(values.mv_vgt),
      XBI: n(values.mv_xbi),
      XRT: n(values.mv_xrt),
      KRE: n(values.mv_kre)
    };
    const lmv = mv.VOOG + mv.VGT + mv.XBI + mv.XRT + mv.KRE;
    const funded = new Set((values.owners ?? '').split('+').filter(Boolean));
    const expected: Record<string, number> = {
      U35: 0.35 * lmv,
      U50: 0.5 * lmv,
      U60: 0.6 * lmv,
      G50: 0.35 * mv.VOOG + 0.5 * (mv.VGT + mv.XBI + mv.XRT + mv.KRE),
      G60: 0.35 * mv.VOOG + 0.6 * (mv.VGT + mv.XBI + mv.XRT + mv.KRE),
      L50: Object.entries(mv).reduce(
        (total, [security, value]) => total + (funded.has(security) ? 0.5 : 0.35) * value,
        0
      ),
      L60: Object.entries(mv).reduce(
        (total, [security, value]) => total + (funded.has(security) ? 0.6 : 0.35) * value,
        0
      )
    };

    for (const [schedule, value] of Object.entries(expected)) {
      const logged = n(row[`required_${schedule}`]);

      if (!Number.isNaN(logged)) {
        check(near(logged, value, 0.01), `${key} ${row.date}: ${schedule} ${logged} vs recomputed ${value}`);
      }
    }
  }

  return { key, mode, events: events.length, closes: daily.length, lots: trades.length, checks, failures };
};

export const auditLedgers = async (universe: Universe) => {
  void universe;

  const outcomes: LedgerAuditOutcome[] = [];

  for (const spec of catalogue().filter((candidate) => candidate.group === 'principal')) {
    const outcome = await auditRun(spec.key, runDir(spec));

    outcomes.push(outcome);
    log(
      `ledger audit ${spec.key}: ${outcome.checks} checks over ${outcome.events} events, ${outcome.closes} closes, ${outcome.lots} lots; ${outcome.failures.length} failures`
    );

    for (const failure of outcome.failures.slice(0, 5)) {
      log(`  ${failure}`);
    }
  }

  await writeJson(stageDir('audit', 'ledger_audit.json'), outcomes);

  const failed = outcomes.filter((outcome) => outcome.failures.length > 0);

  if (failed.length > 0) {
    throw new Error(`Ledger audit failed for ${failed.map((outcome) => outcome.key).join(', ')}`);
  }

  return outcomes;
};
