// npm run market-events -- update [--offline config/market-events/raw/<snapshot>]
//   Retrieves the VGT and VOOG distribution histories from the issuer (public, no credentials) into a new snapshot
//   under config/market-events/raw/, or reuses a stored one, and rebuilds config/market-events/distributions.csv and
//   its manifest (src/market-events/ledger.ts). Nothing is written unless every check passes.
// npm run market-events -- verify
//   Rebuilds the ledger from the frozen ledger and the manifest's snapshots and requires the same bytes; re-validates
//   it; checks every recorded split (config/market-events/splits.json) against the raw minute data, and lists
//   split-sized overnight moves of every canonical file that no recorded split explains.
import path from 'node:path';
import fs from 'fs-extra';
import type { MarketSession } from '#types';
import {
  canonicalDataFile,
  groupMarketSessions,
  loadCsvMinuteBacktestData,
  readSplits,
  unexplainedSplitGaps
} from '#lib';
import {
  type IssuerEvent,
  type LedgerEtf,
  type LedgerManifest,
  type LedgerRow,
  type SourceSnapshot,
  frozenCoverageEnd,
  frozenLedgerFile,
  frozenLedgerSha256,
  frozenRows,
  issuerEvents,
  issuerUrl,
  ledgerEtfs,
  ledgerFile,
  ledgerHeader,
  manifestFile,
  marketEventsRoot,
  rowLine,
  sha256,
  validateLedger
} from './ledger.ts';

const t1SettlementStart = '2024-05-28';

const sessionsOf = async (symbol: string, dataDir: string) =>
  groupMarketSessions(await loadCsvMinuteBacktestData(symbol, canonicalDataFile(symbol, dataDir)));

// The raw close of the last session before a date.
const closeBefore = (sessions: MarketSession[], date: string) => {
  const index = sessions.findIndex((session) => session.date >= date);
  const session = index > 0 ? sessions[index - 1] : index < 0 ? sessions.at(-1) : undefined;

  if (!session) {
    throw new Error(`no session before ${date}`);
  }

  return session.close;
};

const fetchSnapshot = async (retrievedAt: string) => {
  const dir = path.join(
    marketEventsRoot,
    'raw',
    `vanguard-${retrievedAt.replace(/[-:]/g, '').replace(/\.\d+Z$/, 'Z')}`
  );

  for (const symbol of ledgerEtfs) {
    const response = await fetch(issuerUrl(symbol), {
      headers: { 'User-Agent': 'Mozilla/5.0', Accept: 'application/json' }
    });

    if (!response.ok) {
      throw new Error(`${issuerUrl(symbol)}: HTTP ${response.status}`);
    }

    const text = await response.text();

    JSON.parse(text);
    await fs.outputFile(path.join(dir, `${symbol}.json`), text);
  }

  await fs.writeJson(path.join(dir, 'retrieval.json'), { retrievedAt, urls: ledgerEtfs.map(issuerUrl) }, { spaces: 1 });
  return dir;
};

// The retrieval time of a snapshot: retrieval.json, or the directory name of a snapshot taken before it existed.
const retrievalOf = async (dir: string) => {
  const meta = path.join(dir, 'retrieval.json');

  if (await fs.pathExists(meta)) {
    return ((await fs.readJson(meta)) as { retrievedAt: string }).retrievedAt;
  }

  const match = path.basename(dir).match(/(\d{4})-(\d{2})-(\d{2})T(\d{2})(\d{2})(\d{2})Z$/);

  if (!match) {
    throw new Error(`${dir}: no retrieval.json and no timestamp in its name`);
  }

  return `${match[1]}-${match[2]}-${match[3]}T${match[4]}:${match[5]}:${match[6]}Z`;
};

export interface BuiltLedger {
  text: string;
  rows: LedgerRow[];
  manifest: Omit<LedgerManifest, 'builtAt'>;
}

// The ledger from the frozen file and one issuer snapshot. Throws on any inconsistency.
export const buildLedger = async (snapshotDir: string, dataDir = 'data'): Promise<BuiltLedger> => {
  const frozenText = await fs.readFile(frozenLedgerFile, 'utf8');

  if (sha256(frozenText) !== frozenLedgerSha256) {
    throw new Error(
      `${frozenLedgerFile} hashes to ${sha256(frozenText)}, not the frozen protocol's ${frozenLedgerSha256}`
    );
  }

  const frozen = frozenRows(frozenText);
  const retrievedAt = await retrievalOf(snapshotDir);
  const sources: SourceSnapshot[] = [];
  const events: IssuerEvent[] = [];

  for (const symbol of ledgerEtfs) {
    const file = path.join(snapshotDir, `${symbol}.json`);
    const text = await fs.readFile(file, 'utf8');
    const own = issuerEvents(symbol, JSON.parse(text));

    sources.push({ symbol, url: issuerUrl(symbol), retrievedAt, file, sha256: sha256(text), events: own.length });
    events.push(...own);
  }

  const crossChecks: LedgerManifest['crossChecks'] = [];
  const added: LedgerRow[] = [];

  for (const symbol of ledgerEtfs) {
    const own = events.filter((event) => event.etf === symbol).sort((a, b) => a.recordDate.localeCompare(b.recordDate));
    const earliest = own[0]!;

    if (earliest.recordDate > frozenCoverageEnd) {
      throw new Error(
        `${symbol}: the issuer history starts ${earliest.recordDate}, after the frozen ledger's coverage ${frozenCoverageEnd}: distributions in between can't be shown complete`
      );
    }

    // The overlap: the same events on the same dates.
    for (const event of own.filter((candidate) => candidate.recordDate <= frozenCoverageEnd)) {
      const row = frozen.find((candidate) => candidate.etf === symbol && candidate.exDate === event.recordDate);

      if (!row) {
        throw new Error(`${symbol}: the issuer's ${event.recordDate} distribution is not in the frozen ledger`);
      }

      if (row.payDate !== event.payableDate) {
        throw new Error(`${symbol} ${event.recordDate}: frozen pay date ${row.payDate}, issuer ${event.payableDate}`);
      }

      crossChecks.push({
        etf: symbol,
        exDate: event.recordDate,
        frozenAmount: row.amount,
        issuerAmount: event.amount,
        relativeDifference: Number(row.amount) / Number(event.amount) - 1
      });
    }

    for (const row of frozen.filter(
      (candidate) => candidate.etf === symbol && candidate.exDate >= earliest.recordDate
    )) {
      if (!own.some((event) => event.recordDate === row.exDate)) {
        throw new Error(`${symbol}: the frozen ledger's ${row.exDate} distribution is not in the issuer history`);
      }
    }

    const sessions = await sessionsOf(symbol, dataDir);

    for (const event of own.filter((candidate) => candidate.recordDate > frozenCoverageEnd)) {
      if (event.recordDate < t1SettlementStart) {
        throw new Error(`${symbol} ${event.recordDate}: before T+1 settlement the ex-date is not the record date`);
      }

      added.push({
        etf: symbol,
        exDate: event.recordDate,
        payDate: event.payableDate,
        amount: event.amount,
        amountMethod: 'issuer',
        exDateMethod: 'issuer record date (ex-date under T+1)',
        payDateMethod: 'issuer payable date',
        closeBefore: String(closeBefore(sessions, event.recordDate)),
        source: `Vanguard ${event.type.toLowerCase()} history ${issuerUrl(symbol)} retrieved ${retrievedAt}`
      });
    }
  }

  const rows = [...frozen, ...added].sort((a, b) => a.exDate.localeCompare(b.exDate) || a.etf.localeCompare(b.etf));
  const through = retrievedAt.slice(0, 10);
  const coverage = Object.fromEntries(
    ledgerEtfs.map((etf) => [
      etf,
      {
        through,
        lastExDate: rows.filter((row) => row.etf === etf).at(-1)!.exDate,
        basis: `the issuer's distribution history as retrieved ${retrievedAt}, joined to the frozen ledger at ${frozenCoverageEnd}`
      }
    ])
  ) as LedgerManifest['coverage'];
  const issues = validateLedger(rows, { VGT: through, VOOG: through });

  if (issues.length > 0) {
    throw new Error(
      `The ledger fails validation:\n${issues.map((issue) => `  ${issue.etf} ${issue.exDate}: ${issue.problem}`).join('\n')}`
    );
  }

  const text = `${[ledgerHeader, ...rows.map(rowLine)].join('\n')}\n`;

  return {
    text,
    rows,
    manifest: {
      schemaVersion: 1,
      ledger: ledgerFile,
      ledgerSha256: sha256(text),
      rows: rows.length,
      frozenLedger: {
        file: frozenLedgerFile,
        sha256: frozenLedgerSha256,
        rows: frozen.length,
        coverageEnd: frozenCoverageEnd
      },
      sources,
      coverage,
      crossChecks
    }
  };
};

const checkSplits = async (dataDir: string) => {
  const splits = readSplits();
  const lines: string[] = [];
  let failed = false;

  for (const split of splits) {
    const sessions = await sessionsOf(split.symbol, dataDir);
    const index = sessions.findIndex((session) => session.date === split.effectiveDate);

    if (index < 1) {
      lines.push(`SPLIT ${split.symbol} ${split.effectiveDate}: no session on the effective date in the data`);
      failed = true;
      continue;
    }

    const move = (sessions[index]!.open * split.ratio) / sessions[index - 1]!.close;
    const ok = move > 0.9 && move < 1.1;

    failed ||= !ok;
    lines.push(
      `${ok ? 'SPLIT' : 'SPLIT MISMATCH'} ${split.symbol} ${split.ratio}:1 on ${split.effectiveDate}: raw ${sessions[index - 1]!.close} → ${sessions[index]!.open}, adjusted overnight move ${((move - 1) * 100).toFixed(2)}%`
    );
  }

  const symbols = (await fs.readdir(dataDir)).filter(
    (name) => /^[A-Z0-9][A-Z0-9.-]*$/.test(name) && fs.pathExistsSync(canonicalDataFile(name, dataDir))
  );

  for (const symbol of symbols.sort()) {
    for (const gap of unexplainedSplitGaps(await sessionsOf(symbol, dataDir), symbol, splits)) {
      lines.push(
        `UNRECORDED ${symbol} ${gap.date}: ${gap.previousClose} → ${gap.open} (×${gap.ratio.toFixed(4)}), no split recorded; partition runs of ${symbol} across it read raw prices`
      );
    }
  }

  return { lines, failed };
};

export const runMarketEventsCli = async (args: string[], dataDir = 'data') => {
  const [command] = args;

  if (command === 'update') {
    const offline = args.indexOf('--offline');
    const snapshot = offline >= 0 ? args[offline + 1]! : await fetchSnapshot(new Date().toISOString());
    const built = await buildLedger(snapshot, dataDir);
    const manifest: LedgerManifest = { ...built.manifest, builtAt: new Date().toISOString() };

    await fs.outputFile(`${ledgerFile}.tmp`, built.text);
    await fs.rename(`${ledgerFile}.tmp`, ledgerFile);
    await fs.writeJson(manifestFile, manifest, { spaces: 1 });
    console.info(
      `Wrote ${ledgerFile} (${built.rows.length} rows, sha256 ${manifest.ledgerSha256.slice(0, 16)}) from ${snapshot}`
    );

    for (const etf of ledgerEtfs) {
      console.info(
        `  ${etf}: covered through ${manifest.coverage[etf].through}, last ex-date ${manifest.coverage[etf].lastExDate}`
      );
    }

    for (const check of manifest.crossChecks) {
      console.info(
        `  overlap ${check.etf} ${check.exDate}: frozen ${check.frozenAmount}, issuer ${check.issuerAmount} (${(check.relativeDifference * 100).toFixed(3)}%)`
      );
    }

    return true;
  }

  if (command === 'verify') {
    const manifest = (await fs.readJson(manifestFile)) as LedgerManifest;
    const text = await fs.readFile(ledgerFile, 'utf8');
    const problems: string[] = [];

    if (sha256(text) !== manifest.ledgerSha256)
      problems.push(`${ledgerFile} hashes to ${sha256(text)}, not ${manifest.ledgerSha256}`);

    for (const source of manifest.sources) {
      const actual = sha256(await fs.readFile(source.file));

      if (actual !== source.sha256) problems.push(`${source.file} hashes to ${actual}, not ${source.sha256}`);
    }

    const snapshots = [...new Set(manifest.sources.map((source) => path.dirname(source.file)))];

    if (snapshots.length !== 1) problems.push(`the manifest names ${snapshots.length} snapshots, not one`);

    const rebuilt = await buildLedger(snapshots[0]!, dataDir);

    if (rebuilt.text !== text) problems.push(`rebuilding from ${snapshots[0]} gives different bytes`);

    const splits = await checkSplits(dataDir);

    console.info(
      `${ledgerFile}: ${rebuilt.rows.length} rows, sha256 ${sha256(text).slice(0, 16)}; rebuilt from ${snapshots[0]}: ${rebuilt.text === text ? 'identical' : 'DIFFERENT'}`
    );

    for (const etf of ledgerEtfs as readonly LedgerEtf[]) {
      console.info(
        `  ${etf}: covered through ${manifest.coverage[etf].through}, last ex-date ${manifest.coverage[etf].lastExDate}`
      );
    }

    console.info(splits.lines.join('\n'));

    if (splits.failed) problems.push('a recorded split does not match the data');

    for (const problem of problems) console.error(`ERROR: ${problem}`);

    return problems.length === 0;
  }

  throw new Error(`Unknown command '${command ?? ''}'; use update or verify (see src/market-events/cli.ts)`);
};
