// The one-time sealed holdout (PROTOCOL.md section 8). Refuses to run without a manifest whose hash verifies, whose
// data, decision-code and protocol hashes still match, or for a second time without --rerun-reason (every attempt is
// recorded). Takes the one capability that can build a dataset past the development end, then evaluates only the
// frozen control and nominations of each ticker on the continuous run from the eligibility session, with the
// predeclared sensitivities, and writes the per-ticker artifacts and results/holdout/holdout.json.
import path from 'node:path';
import fs from 'fs-extra';
import type { Trade } from '../d1-refinement/engine.ts';
import type { EvalSpec, Metrics } from '../d1-refinement/evaluate.ts';
import type { IntParams } from '../d1-refinement/families.ts';
import { issueUnlockCapability, sha256File } from '../four-family/data.ts';
import {
  formatDollars,
  frozenCandidatesFile,
  hasFlag,
  log,
  option,
  protocol,
  protocolFile,
  readJson,
  stageDir,
  tickers,
  writeJson,
  writeText
} from './context.ts';
import { type TickerData, holdoutStartIndex, loadFull } from './data.ts';
import { writeDetail } from './detail.ts';
import { cachesFor, evaluateOne, holdoutSpec, segmentOf } from './evaluation.ts';
import { type Manifest, codeHashes, verifyManifestHash } from './freeze.ts';
import { type View, viewOf } from './selection.ts';
import { describe } from './space.ts';

const unlock = issueUnlockCapability();

export const holdoutDir = stageDir('holdout');
export const attemptsFile = path.join(holdoutDir, 'attempts.json');
export const holdoutFile = path.join(holdoutDir, 'holdout.json');

export const verifyManifest = async () => {
  if (!(await fs.pathExists(frozenCandidatesFile))) {
    throw new Error('No manifest: run `npm run multi-etf-d1 -- freeze` first');
  }

  const manifest = await readJson<Manifest>(frozenCandidatesFile);

  if (!verifyManifestHash(manifest)) {
    throw new Error('The manifest hash does not verify');
  }

  for (const [ticker, hash] of Object.entries(manifest.dataHashes)) {
    const file = ticker === protocol.reference.symbol ? protocol.reference.dataFile : protocol.dataFile(ticker);

    if ((await sha256File(file)) !== hash) {
      throw new Error(`${file} changed after the freeze`);
    }
  }

  const current = await codeHashes();

  for (const [file, hash] of Object.entries(manifest.codeHashes)) {
    if (current[file] !== hash) {
      throw new Error(`${file} changed after the freeze`);
    }
  }

  if ((await sha256File(protocolFile)) !== manifest.protocolHash) {
    throw new Error('PROTOCOL.md changed after the freeze; a holdout run now would not be the preregistered one');
  }

  return manifest;
};

export interface SpanningTrade {
  index: number;
  entryDate: string;
  exitDate: string;
  reason: string;
  lifetimeProfit: number;
  markAtDevelopmentEnd: number;
  holdoutPart: number;
  isOpen: boolean;
}

export interface Contender {
  role: string;
  id: string;
  params: IntParams;
  description: string;
}

export interface ContenderResult extends Contender {
  base: Metrics;
  holdout: View & {
    realizedInHoldout: number;
    unrealizedAtEnd: number;
    interestInHoldout: number;
    exposure: number;
    openAtEnd: boolean;
    worstTrade: number;
    worstExcursion: number;
    bestTrade: number;
    tradesEntered: number;
    cohortNet: number;
    cohortWins: number;
    cohortLosses: number;
    heldAtCloseSessions: number;
    sessions: number;
  };
  spanning: SpanningTrade[];
  holdoutYears: Record<string, View>;
  combined: View;
  development: View;
  sensitivities: Record<string, { combined: View; holdout: View; development: View }>;
}

const holdoutTradeStats = (
  ds: Dataset,
  trades: Trade[],
  outcomes: { profit: number; interest: number; isOpen: boolean }[],
  holdoutStart: number,
  developmentEnd: number,
  rate: number
) => {
  const entered = trades
    .map((trade, index) => ({ trade, outcome: outcomes[index]! }))
    .filter(({ trade }) => trade.entryIndex >= holdoutStart);
  const exitedInHoldout = trades
    .map((trade, index) => ({ trade, outcome: outcomes[index]! }))
    .filter(({ trade, outcome }) => !outcome.isOpen && trade.exitIndex >= holdoutStart);
  const open = trades
    .map((trade, index) => ({ trade, outcome: outcomes[index]! }))
    .find(({ outcome }) => outcome.isOpen);
  const spanning: SpanningTrade[] = [];

  trades.forEach((trade, index) => {
    const outcome = outcomes[index]!;

    if (trade.entryIndex <= developmentEnd && (trade.exitIndex < 0 || trade.exitIndex > developmentEnd)) {
      const interestAtDevEnd =
        trade.investment * rate * ((ds.sTime[developmentEnd]! - trade.entryTimestamp) / (365 * 86400));
      const mark = trade.shares * ds.sClose[developmentEnd]! - trade.investment - interestAtDevEnd;

      spanning.push({
        index: index + 1,
        entryDate: ds.dates[trade.entryIndex]!,
        exitDate: trade.exitIndex < 0 ? '' : ds.dates[trade.exitIndex]!,
        reason: trade.exitIndex < 0 ? 'open' : trade.reason,
        lifetimeProfit: outcome.profit,
        markAtDevelopmentEnd: mark,
        holdoutPart: outcome.profit - mark,
        isOpen: outcome.isOpen
      });
    }
  });

  const cohortProfits = entered.map(({ outcome }) => outcome.profit);

  return {
    realizedInHoldout: exitedInHoldout.reduce((total, { outcome }) => total + outcome.profit, 0),
    unrealizedAtEnd: open ? open.outcome.profit : 0,
    openAtEnd: Boolean(open),
    worstTrade: cohortProfits.length > 0 ? Math.min(...cohortProfits) : 0,
    bestTrade: cohortProfits.length > 0 ? Math.max(...cohortProfits) : 0,
    tradesEntered: entered.length,
    cohortNet: cohortProfits.reduce((total, value) => total + value, 0),
    cohortWins: entered.filter(({ outcome }) => !outcome.isOpen && outcome.profit > 0).length,
    cohortLosses: entered.filter(({ outcome }) => !outcome.isOpen && !(outcome.profit > 0)).length,
    spanning
  };
};

type Dataset = TickerData['ds'];

// The worst minute mark of any trade relative to its entry inside the holdout sessions.
const holdoutWorstExcursion = (ds: Dataset, trades: Trade[], holdoutStart: number, endIndex: number, rate: number) => {
  let worst = 0;

  for (const trade of trades) {
    const last = trade.exitIndex < 0 ? endIndex : trade.exitIndex;

    if (last < holdoutStart) {
      continue;
    }

    for (let s = Math.max(trade.entryIndex, holdoutStart); s <= last; s++) {
      const interest = trade.investment * rate * ((ds.sTime[s]! - trade.entryTimestamp) / (365 * 86400));
      const start = ds.sBarStart[s]!;
      const from = s === trade.entryIndex ? trade.entryBar : 0;
      const to = s === trade.exitIndex ? trade.exitBar : ds.sBarCount[s]!;
      let low = s === trade.exitIndex ? trade.exitPriceObserved : Infinity;

      for (let k = from; k < to; k++) {
        low = Math.min(low, ds.bLow[start + k]!);
      }

      if (Number.isFinite(low)) {
        worst = Math.min(worst, trade.shares * low - trade.investment - interest);
      }
    }
  }

  return worst;
};

export const runHoldout = async (args: string[]) => {
  const manifest = await verifyManifest();
  const attempts = (await fs.pathExists(attemptsFile)) ? await readJson<Record<string, unknown>[]>(attemptsFile) : [];
  const rerunReason = option(args, 'rerun-reason');
  const minuteCurves = hasFlag(args, 'minute-curves');

  if (attempts.length > 0 && !rerunReason) {
    throw new Error(
      `The holdout already ran ${attempts.length} time(s) on manifest ${(attempts[0] as { manifestHash: string }).manifestHash}; a rerun needs --rerun-reason "<why>" and is reported as such`
    );
  }

  const attempt = {
    attempt: attempts.length + 1,
    startedAt: new Date().toISOString(),
    manifestHash: manifest.manifestHash,
    frozenAt: manifest.frozenAt,
    rerunReason: rerunReason ?? null,
    holdoutCodeHash: await sha256File('src/multi-etf-d1/holdout.ts'),
    nodeVersion: process.version
  };

  await writeJson(attemptsFile, [...attempts, attempt]);
  log(`Holdout attempt ${attempt.attempt} on manifest ${manifest.manifestHash}`);

  const output: Record<string, unknown> = {
    attempt,
    manifestHash: manifest.manifestHash,
    frozenAt: manifest.frozenAt,
    protocolHash: manifest.protocolHash,
    holdout: manifest.settings.holdout,
    tickers: {} as Record<string, unknown>
  };
  const results: Record<
    string,
    {
      ticker: string;
      dataHash: string;
      holdoutStartDate: string;
      holdoutEndDate: string;
      holdoutSessions: number;
      contenders: ContenderResult[];
    }
  > = {};

  for (const ticker of tickers) {
    const entry = manifest.tickers[ticker]!;
    const data = await loadFull(ticker, unlock);
    const { ds } = data;
    const holdoutStart = holdoutStartIndex(ds);

    if (ds.lastDate !== manifest.settings.holdout.commonEndSession) {
      throw new Error(
        `${ticker}: the file ends ${ds.lastDate}, not the frozen common end ${manifest.settings.holdout.commonEndSession}`
      );
    }

    const caches = cachesFor(ds);
    const base = holdoutSpec(data, holdoutStart);
    const sensitivities: Record<string, EvalSpec> = {
      [`${protocol.sensitivityStopFill}-fill`]: holdoutSpec(data, holdoutStart, protocol.sensitivityStopFill),
      ...Object.fromEntries(
        protocol.costSensitivities.map((cost) => [
          `cost-${cost * 10000}bps`,
          holdoutSpec(data, holdoutStart, protocol.stopFill, protocol.marginInterestRate, cost)
        ])
      )
    };
    const contenders: Contender[] = [
      { role: 'control', id: entry.control.id, params: entry.control.params, description: entry.control.description },
      ...entry.nominations.map((nomination) => ({
        role: nomination.role,
        id: nomination.id,
        params: nomination.params,
        description: nomination.description
      }))
    ];
    const contenderResults: ContenderResult[] = [];

    for (const contender of contenders) {
      const { metrics, detail } = evaluateOne(ds, caches, contender.params, base, true);
      const holdoutSegment = segmentOf(metrics, 'holdout')!;
      const stats = holdoutTradeStats(
        ds,
        detail!.trades,
        detail!.accounting.outcomes,
        holdoutStart,
        data.developmentEnd,
        base.marginInterestRate
      );
      const sensitivityResults: ContenderResult['sensitivities'] = {};

      for (const [key, spec] of Object.entries(sensitivities)) {
        const sensitivity = evaluateOne(ds, caches, contender.params, spec).metrics;

        sensitivityResults[key] = {
          combined: viewOf(sensitivity, 'combined'),
          holdout: viewOf(sensitivity, 'holdout'),
          development: viewOf(sensitivity, 'development')
        };
      }

      await writeDetail(
        path.join(holdoutDir, ticker, contender.role),
        ds,
        {
          ticker,
          label: contender.description,
          role: contender.role,
          params: contender.params,
          dataHash: data.dataHash,
          dataFile: data.dataFile
        },
        base,
        metrics,
        detail!,
        data.developmentEnd,
        minuteCurves
      );

      contenderResults.push({
        ...contender,
        base: metrics,
        holdout: {
          ...viewOf(metrics, 'holdout'),
          realizedInHoldout: stats.realizedInHoldout,
          unrealizedAtEnd: stats.unrealizedAtEnd,
          interestInHoldout: holdoutSegment.interest,
          exposure: holdoutSegment.heldAtCloseSessions / holdoutSegment.sessions,
          openAtEnd: stats.openAtEnd,
          worstTrade: stats.worstTrade,
          worstExcursion: holdoutWorstExcursion(
            ds,
            detail!.trades,
            holdoutStart,
            base.endIndex,
            base.marginInterestRate
          ),
          bestTrade: stats.bestTrade,
          tradesEntered: stats.tradesEntered,
          cohortNet: stats.cohortNet,
          cohortWins: stats.cohortWins,
          cohortLosses: stats.cohortLosses,
          heldAtCloseSessions: holdoutSegment.heldAtCloseSessions,
          sessions: holdoutSegment.sessions
        },
        spanning: stats.spanning,
        holdoutYears: Object.fromEntries(['2024', '2025'].map((year) => [year, viewOf(metrics, year)])),
        combined: viewOf(metrics, 'combined'),
        development: viewOf(metrics, 'development'),
        sensitivities: sensitivityResults
      });
      log(
        `${ticker} ${contender.role}: holdout net ${formatDollars(holdoutSegment.net)}, DD ${formatDollars(holdoutSegment.minuteDrawdown)}, ${holdoutSegment.entries} entries; combined ${formatDollars(metrics.net)}`
      );
    }

    results[ticker] = {
      ticker,
      dataHash: data.dataHash,
      holdoutStartDate: ds.dates[holdoutStart]!,
      holdoutEndDate: ds.lastDate,
      holdoutSessions: ds.sessionCount - holdoutStart,
      contenders: contenderResults
    };
  }

  output.tickers = results;
  output.completedAt = new Date().toISOString();
  await writeJson(holdoutFile, output);
  await writeJson(attemptsFile, [...attempts, { ...attempt, completedAt: output.completedAt }]);
  await writeText(path.join(holdoutDir, 'HOLDOUT_TABLES.md'), holdoutTables(manifest, results, attempt));
  log(`Holdout written (attempt ${attempt.attempt}) to ${holdoutFile}`);

  return output;
};

export const holdoutTables = (
  manifest: Manifest,
  results: Record<
    string,
    {
      ticker: string;
      holdoutStartDate: string;
      holdoutEndDate: string;
      holdoutSessions: number;
      contenders: ContenderResult[];
    }
  >,
  attempt: { attempt: number; startedAt: string; rerunReason: string | null }
) => {
  const cell = (view: View) =>
    `${formatDollars(view.net)} / DD ${formatDollars(view.minuteDrawdown)} / ${view.entries}e ${view.wins}w ${view.losses}l`;
  const lines = [
    `# Holdout tables (generated ${attempt.startedAt}, attempt ${attempt.attempt}${attempt.rerunReason ? `, rerun: ${attempt.rerunReason}` : ''})`,
    '',
    `Manifest ${manifest.manifestHash} (frozen ${manifest.frozenAt}). Holdout window: first session ${results[tickers[0]]?.holdoutStartDate} through the last common session ${manifest.settings.holdout.commonEndSession} (${results[tickers[0]]?.holdoutSessions} sessions), one continuous run from 2017-06-15 with the state carried across the 2024 boundary. Net = change of the marked equity between the 2023-12-29 close and the ${manifest.settings.holdout.commonEndSession} close; DD = minute-sampled fall from a peak inside the window (peak starting at the window's opening mark).`,
    '',
    '## Fixed comparison: frozen D1 versus the frozen nominations, holdout window',
    '',
    '| Ticker | Role | Parameters | Holdout net | Realized in holdout | Unrealized at end | Interest | Minute DD | Daily DD | Entries | Exits W/L | Exposure | Worst trade (cohort) | Worst excursion | Spanning positions | Dev net (same run) | Combined net |',
    '|---|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|---:|---:|'
  ];

  for (const ticker of tickers) {
    const result = results[ticker];

    if (!result) {
      continue;
    }

    for (const contender of result.contenders) {
      const h = contender.holdout;

      lines.push(
        `| ${ticker} | ${contender.role} | ${contender.description} | ${formatDollars(h.net)} | ${formatDollars(h.realizedInHoldout)} | ${formatDollars(h.unrealizedAtEnd)} | ${formatDollars(h.interestInHoldout)} | ${formatDollars(h.minuteDrawdown)} | ${formatDollars(h.dailyDrawdown)} | ${h.entries}${h.openAtEnd ? ' (1 open)' : ''} | ${h.wins}/${h.losses} | ${(h.exposure * 100).toFixed(0)}% | ${formatDollars(h.worstTrade)} | ${formatDollars(h.worstExcursion)} | ${contender.spanning.length > 0 ? contender.spanning.map((trade) => `${trade.entryDate} → ${trade.exitDate || 'open'}: lifetime ${formatDollars(trade.lifetimeProfit)}, in holdout ${formatDollars(trade.holdoutPart)}`).join('; ') : 'none'} | ${formatDollars(contender.development.net)} | ${formatDollars(contender.combined.net)} |`
      );
    }
  }

  lines.push('');
  lines.push('## Holdout by year');
  lines.push('');
  lines.push('| Ticker | Role | 2024 | 2025 (→ end) |');
  lines.push('|---|---|---|---|');

  for (const ticker of tickers) {
    for (const contender of results[ticker]?.contenders ?? []) {
      lines.push(
        `| ${ticker} | ${contender.role} | ${cell(contender.holdoutYears['2024']!)} | ${cell(contender.holdoutYears['2025']!)} |`
      );
    }
  }

  lines.push('');
  lines.push('## Predeclared sensitivities (holdout window net / DD / entries)');
  lines.push('');

  const keys = Object.keys(results[tickers[0]]?.contenders[0]?.sensitivities ?? {});

  lines.push(`| Ticker | Role | base | ${keys.join(' | ')} |`);
  lines.push(`|---|---|---|${keys.map(() => '---').join('|')}|`);

  for (const ticker of tickers) {
    for (const contender of results[ticker]?.contenders ?? []) {
      lines.push(
        `| ${ticker} | ${contender.role} | ${cell(contender.holdout)} | ${keys.map((key) => cell(contender.sensitivities[key]!.holdout)).join(' | ')} |`
      );
    }
  }

  lines.push('');
  lines.push('## Full horizon (2017-06-15 → end of file, the same continuous run)');
  lines.push('');
  lines.push(
    '| Ticker | Role | Combined net | Combined minute DD | Combined entries | Development net | Holdout net |'
  );
  lines.push('|---|---|---:|---:|---:|---:|---:|');

  for (const ticker of tickers) {
    for (const contender of results[ticker]?.contenders ?? []) {
      lines.push(
        `| ${ticker} | ${contender.role} | ${formatDollars(contender.combined.net)} | ${formatDollars(contender.base.minuteDrawdown)} | ${contender.base.entries} | ${formatDollars(contender.development.net)} | ${formatDollars(contender.holdout.net)} |`
      );
    }
  }

  return lines.join('\n');
};

export const describeContender = describe;
