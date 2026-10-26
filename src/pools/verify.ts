// `npm run pools -- verify`: the regression of every pool that names a frozen benchmark. On the frozen canonical `all`
// (2016-01-04 → 2026-10-13), the pool's runs must equal the frozen controls (research/joint-16-etf-d1/results/controls/
// controls.json, every summary field, at 0/2/5/10 bps, fixed and portfolio under the frozen dividend convention), its
// anchors to the cent, and the frozen per-lot and per-day ledgers of research/portfolio-aware-d1-optimization
// byte for byte. Any difference fails; nothing is written outside evaluations/pools/verify/.
import path from 'node:path';
import crypto from 'node:crypto';
import fs from 'fs-extra';
import { summaryOf } from '../joint-16-etf-d1/figures.ts';
import { toCsv } from '../multi-etf-allocator/metrics.ts';
import type { NRunResult } from '../portfolio-aware-d1/nbook/engine.ts';
import { type LoadedPool, listPoolIds, loadPool } from './load.ts';
import { anchorChecks, dataRecordOf, evaluationsRoot } from './report.ts';
import { type PoolMode, type PoolRunOptions, figuresOf, loadPoolUniverse, runPoolOn } from './run.ts';

const controlsFile = 'research/joint-16-etf-d1/results/controls/controls.json';

const sha256File = async (file: string) =>
  crypto
    .createHash('sha256')
    .update(await fs.readFile(file))
    .digest('hex');

// The frozen evaluation's own CSV mappings (src/portfolio-aware-d1/evaluation.ts runEvaluation).
export const frozenLotsCsv = (result: NRunResult) =>
  toCsv(
    result.lots.map((lot) => ({
      lot: lot.id,
      symbol: lot.symbol,
      trade: lot.trade.id,
      decision: new Date(lot.decisionTime * 1000).toISOString(),
      entry: new Date(lot.entryTime * 1000).toISOString(),
      entry_price: lot.entryPrice,
      exit: lot.exitIndex >= 0 ? new Date(lot.exitTime * 1000).toISOString() : 'open',
      exit_price: lot.exitIndex >= 0 ? lot.exitPrice : lot.exitRawPrice,
      reason: lot.exitReason,
      principal: lot.originalPrincipal,
      interest: lot.interest,
      net: lot.net
    }))
  );

export const frozenDailyCsv = (result: NRunResult) =>
  toCsv(
    result.daily.map((row) => ({
      date: row.date,
      equity: row.equity,
      strategy_mark: row.strategyMark,
      realized: row.realized,
      unrealized: row.unrealized,
      principal: row.principal,
      open_lots: row.openLots,
      owners: row.owners
    }))
  );

const sameValue = (a: unknown, b: unknown): boolean =>
  (typeof a === 'number' && typeof b === 'number' && Number.isNaN(a) && Number.isNaN(b)) ||
  (a === null && typeof b === 'number' && Number.isNaN(b)) ||
  JSON.stringify(a) === JSON.stringify(b);

export const summaryDifferences = (reference: Record<string, unknown>, summary: Record<string, unknown>) =>
  Object.keys(reference)
    .filter((key) => !sameValue(reference[key], summary[key]))
    .map(
      (key) =>
        `${key}: frozen ${JSON.stringify(reference[key])?.slice(0, 80)} vs ${JSON.stringify(summary[key])?.slice(0, 80)}`
    );

export const verifyPool = async (pool: LoadedPool) => {
  const reference = pool.config.frozenReference as
    { benchmark: string; lotLedgers?: string; newSymbols?: string[] } | undefined;

  if (!reference?.benchmark) {
    return {
      pool: pool.config.id,
      skipped: 'no frozen benchmark',
      checks: [] as { name: string; pass: boolean; detail: string }[]
    };
  }

  const controls = (await fs.readJson(controlsFile)) as {
    all: Record<string, Record<string, { summary: Record<string, unknown> }>>;
  };
  const checks: { name: string; pass: boolean; detail: string }[] = [];
  const sources: Record<string, string> = { [controlsFile]: await sha256File(controlsFile) };
  const pinned = (pool.config.frozenReference as { controlsSha256?: string }).controlsSha256;

  checks.push({
    name: `${controlsFile} hashes to the pool's pinned frozenReference.controlsSha256`,
    pass: pinned !== undefined && pinned === sources[controlsFile],
    detail: pinned === undefined ? 'no pinned hash' : `${sources[controlsFile]!.slice(0, 16)}…`
  });

  for (const mode of ['fixed', 'portfolio'] as PoolMode[]) {
    const base: PoolRunOptions = { mode, dataset: 'all', costBps: 5, dividends: 'frozen' };
    const loaded = await loadPoolUniverse(pool, base);
    const data = dataRecordOf(pool, loaded);

    checks.push({ name: `${mode}: the frozen canonical all`, pass: data.frozenAll, detail: data.frozenAllNote });

    for (const costBps of [0, 2, 5, 10]) {
      const options = { ...base, costBps };
      const result = runPoolOn(pool, loaded, options);
      const summary = summaryOf(result, reference.newSymbols ?? []) as unknown as Record<string, unknown>;
      const frozen = controls.all[reference.benchmark]?.[`${mode}-${costBps}`]?.summary;
      const differences = frozen ? summaryDifferences(frozen, summary) : ['no frozen control'];

      checks.push({
        name: `${mode} ${costBps} bps: every summary field = ${controlsFile} all.${reference.benchmark}.${mode}-${costBps}`,
        pass: differences.length === 0,
        detail:
          differences.slice(0, 3).join('; ') ||
          `${summary.lots as number} lots, net ${(summary.net as number).toFixed(2)}`
      });

      if (reference.lotLedgers) {
        for (const [kind, csv] of [
          ['lots', frozenLotsCsv(result)],
          ['daily', frozenDailyCsv(result)]
        ] as const) {
          const file = path.join(reference.lotLedgers, `${mode}-${costBps}-${kind}.csv`);
          const frozenText = (await fs.pathExists(file)) ? await fs.readFile(file, 'utf8') : undefined;

          if (frozenText !== undefined) {
            sources[file] = await sha256File(file);
          }

          checks.push({
            name: `${mode} ${costBps} bps: ${kind} ledger byte-identical to ${file}`,
            pass: frozenText === csv,
            detail:
              frozenText === undefined
                ? 'frozen file missing'
                : frozenText === csv
                  ? `${csv.split('\n').length - 2} rows`
                  : 'differs'
          });
        }
      }

      if (costBps === 5) {
        const anchors = anchorChecks(pool, options, figuresOf(pool, loaded, result, options), data.frozenAll);

        for (const check of anchors.checks) {
          checks.push({
            name: `${mode} 5 bps anchor: ${check.name}`,
            pass: check.pass,
            detail: `expected ${check.expected}, got ${check.actual}`
          });
        }

        if (!anchors.applicable) {
          checks.push({ name: `${mode} 5 bps anchors`, pass: false, detail: anchors.reason });
        }
      }
    }
  }

  return { pool: pool.config.id, checks, sources };
};

export const runVerify = async (ids?: string[]) => {
  const pools = ids?.length ? ids : await listPoolIds();
  const results = [];

  for (const id of pools) {
    results.push(await verifyPool(await loadPool(id)));
  }

  const failures = results.flatMap((result) =>
    result.checks.filter((check) => !check.pass).map((check) => `${result.pool}: ${check.name} — ${check.detail}`)
  );
  const record = {
    schemaVersion: 1,
    kind: 'pool-verify',
    generatedAt: new Date().toISOString(),
    node: process.version,
    results,
    failures,
    passed: failures.length === 0
  };
  const file = path.join(evaluationsRoot, 'verify', 'verify.json');

  await fs.outputJson(file, record, { spaces: 2 });

  return { record, file };
};
