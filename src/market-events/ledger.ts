// The VGT/VOOG distribution ledger of the allocator's --dataset evaluations, config/market-events/distributions.csv,
// and its manifest. The portfolio mode books a distribution on its ex-date for the shares then held (the VOOG/VGT
// core and, by the frozen convention, open VGT lots), pays it on its pay date and reinvests it in the same ETF;
// prices are raw, so the ex-date price drop and the cash offset each other. Nothing else uses distributions (fixed
// mode doesn't; XBI, XRT and KRE distributions are not modelled, as in the frozen protocol).
//
// The ledger is:
// - every row of the frozen protocol's ledger (research/risk-management/vgt-portfolio-margin/data/distributions.csv,
//   ex-dates through protocol.commonEnd 2025-10-13) verbatim, so an evaluation over the frozen period books exactly
//   the frozen distributions; that file and its pinned hash are never changed;
// - then every later distribution from the issuer's own history (Vanguard, investor.vanguard.com/vmf/api/<TICKER>/
//   distribution), kept as retrieved under config/market-events/raw/. Since T+1 settlement (2024-05-28) the ex-date
//   is the record date, which the issuer lists; amounts are per share as paid, so after a split (config/market-events/
//   splits.json) they are per post-split share, and the evaluation multiplies them by the split ratio.
// Coverage is the issuer history's retrieval date: the history lists every distribution with a record date up to it.
// A gap of more than one quarter between distributions, or between the last one and the coverage date, fails
// validation, as do duplicates, non-positive amounts, pay dates before ex-dates and implausible yields.
import { createHash } from 'node:crypto';
import path from 'node:path';
import fs from 'fs-extra';
import { isNewYorkDate, nyseHolidays } from '#lib';

export const marketEventsRoot = 'config/market-events';
export const ledgerFile = path.join(marketEventsRoot, 'distributions.csv');
export const manifestFile = path.join(marketEventsRoot, 'distributions.manifest.json');
export const frozenLedgerFile = 'research/risk-management/vgt-portfolio-margin/data/distributions.csv';
export const frozenLedgerSha256 = '30adf087e7f54927928c12a9d23e198d19336a7e6257df2e9be7e3fc70dba923';
export const frozenCoverageEnd = '2025-10-13';
export const ledgerEtfs = ['VGT', 'VOOG'] as const;
export type LedgerEtf = (typeof ledgerEtfs)[number];

export const issuerUrl = (symbol: string) => `https://investor.vanguard.com/vmf/api/${symbol}/distribution`;

export const ledgerHeader =
  'etf,ex_date,pay_date,amount,amount_method,ex_date_method,pay_date_method,close_before,source';

export interface LedgerRow {
  etf: LedgerEtf;
  exDate: string;
  payDate: string;
  amount: string; // the exact text, so frozen rows stay verbatim
  amountMethod: string;
  exDateMethod: string;
  payDateMethod: string;
  closeBefore: string;
  source: string;
}

export interface IssuerEvent {
  etf: LedgerEtf;
  type: string;
  recordDate: string;
  payableDate: string;
  amount: string;
}

export interface SourceSnapshot {
  symbol: LedgerEtf;
  url: string;
  retrievedAt: string;
  file: string;
  sha256: string;
  events: number;
}

export interface LedgerManifest {
  schemaVersion: 1;
  ledger: string;
  ledgerSha256: string;
  rows: number;
  frozenLedger: { file: string; sha256: string; rows: number; coverageEnd: string };
  sources: SourceSnapshot[];
  coverage: Record<LedgerEtf, { through: string; lastExDate: string; basis: string }>;
  crossChecks: {
    etf: string;
    exDate: string;
    frozenAmount: string;
    issuerAmount: string;
    relativeDifference: number;
  }[];
  builtAt: string;
}

export const sha256 = (text: string | Buffer) => createHash('sha256').update(text).digest('hex');

const day = 86400000;
// One quarter's yield: the ledger's span is 0.099%–0.445% (2016–2026). An amount in the other side of a split's units
// falls far outside, e.g. a post-split VGT amount against a pre-split close is about 0.012%.
const minimumYield = 0.0003;
const maximumYield = 0.012;
const daysBetween = (a: string, b: string) => Math.round((Date.parse(b) - Date.parse(a)) / day);
const isBusinessDay = (date: string) => {
  const weekday = new Date(`${date}T00:00:00Z`).getUTCDay();

  return weekday !== 0 && weekday !== 6 && !nyseHolidays.has(date);
};

export const rowLine = (row: LedgerRow) =>
  [
    row.etf,
    row.exDate,
    row.payDate,
    row.amount,
    row.amountMethod,
    row.exDateMethod,
    row.payDateMethod,
    row.closeBefore,
    row.source
  ].join(',');

export const parseLedger = (text: string, where = ledgerFile): LedgerRow[] => {
  const [header, ...lines] = text.trimEnd().split('\n');

  if (header !== ledgerHeader) {
    throw new Error(`${where}: the header must be ${ledgerHeader}`);
  }

  return lines.map((line, index) => {
    const fields = line.split(',');

    if (fields.length !== 9) {
      throw new Error(`${where}:${index + 2}: expected 9 fields, found ${fields.length}`);
    }

    const [etf, exDate, payDate, amount, amountMethod, exDateMethod, payDateMethod, closeBefore, source] = fields as [
      LedgerEtf,
      ...string[]
    ];

    return {
      etf,
      exDate,
      payDate,
      amount,
      amountMethod,
      exDateMethod,
      payDateMethod,
      closeBefore,
      source
    } as LedgerRow;
  });
};

// The frozen protocol's rows, verbatim in the ledger's first eight columns.
export const frozenRows = (text: string): LedgerRow[] =>
  text
    .trimEnd()
    .split('\n')
    .slice(1)
    .map((line) => {
      const [etf, exDate, payDate, amount, amountMethod, exDateMethod, payDateMethod, closeBefore] = line.split(
        ','
      ) as [LedgerEtf, ...string[]];

      return {
        etf,
        exDate,
        payDate,
        amount,
        amountMethod,
        exDateMethod,
        payDateMethod,
        closeBefore,
        source: 'frozen protocol ledger'
      } as LedgerRow;
    });

// The issuer's distributions from a raw response of its API.
export const issuerEvents = (symbol: LedgerEtf, json: unknown): IssuerEvent[] => {
  const items = (json as { divCapGain?: { item?: unknown[] } }).divCapGain?.item;

  if (!Array.isArray(items) || items.length === 0) {
    throw new Error(`${symbol}: the issuer response has no divCapGain.item list`);
  }

  return items.map((raw, index) => {
    const item = raw as Record<string, unknown>;
    const amount = String(item.perShareAmount ?? '').replace(/^\$/, '');
    const recordDate = String(item.recordDate ?? '').slice(0, 10);
    const payableDate = String(item.payableDate ?? '').slice(0, 10);

    if (!/^\d+\.\d+$/.test(amount) || item.isPerShareAmtPct !== false) {
      throw new Error(
        `${symbol} item ${index}: per-share amount ${JSON.stringify(item.perShareAmount)} is not a dollar amount`
      );
    }

    if (!isNewYorkDate(recordDate) || !isNewYorkDate(payableDate)) {
      throw new Error(`${symbol} item ${index}: record or payable date missing`);
    }

    return { etf: symbol, type: String(item.type), recordDate, payableDate, amount };
  });
};

export interface ValidationIssue {
  etf: string;
  exDate: string;
  problem: string;
}

// Every rule of the header; `closes` maps `${etf} ${exDate}` to the raw close of the session before the ex-date.
export const validateLedger = (rows: LedgerRow[], coverage: Record<string, string>): ValidationIssue[] => {
  const issues: ValidationIssue[] = [];

  for (const etf of ledgerEtfs) {
    const own = rows.filter((row) => row.etf === etf);
    const note = (row: LedgerRow, problem: string) => issues.push({ etf, exDate: row.exDate, problem });

    if (own.length === 0) {
      issues.push({ etf, exDate: '', problem: 'no distributions' });
      continue;
    }

    own.forEach((row, index) => {
      const amount = Number(row.amount);
      const closeBefore = Number(row.closeBefore);

      if (!isNewYorkDate(row.exDate) || !isNewYorkDate(row.payDate)) note(row, 'invalid date');
      if (!(amount > 0) || !Number.isFinite(amount)) note(row, `amount ${row.amount} is not positive`);
      if (row.payDate < row.exDate) note(row, `pays ${row.payDate}, before its ex-date`);
      if (daysBetween(row.exDate, row.payDate) > 10)
        note(row, `pays ${row.payDate}, more than 10 days after its ex-date`);
      if (!isBusinessDay(row.exDate)) note(row, 'the ex-date is not an NYSE session');
      if (closeBefore > 0 && !(amount / closeBefore > minimumYield && amount / closeBefore < maximumYield)) {
        note(
          row,
          `yield ${(amount / closeBefore).toFixed(5)} of the prior close ${row.closeBefore} is implausible (split units?)`
        );
      }

      const previous = own[index - 1];

      if (previous && row.exDate <= previous.exDate) note(row, `not after the previous ex-date ${previous.exDate}`);
      if (previous && daysBetween(previous.exDate, row.exDate) > 120) {
        note(
          row,
          `${daysBetween(previous.exDate, row.exDate)} days after the previous distribution: a quarter is missing`
        );
      }
    });

    const through = coverage[etf];
    const last = own.at(-1)!;

    if (!through) {
      issues.push({ etf, exDate: '', problem: 'no coverage date' });
    } else if (daysBetween(last.exDate, through) > 120) {
      issues.push({
        etf,
        exDate: last.exDate,
        problem: `the last distribution is ${daysBetween(last.exDate, through)} days before the coverage date ${through}`
      });
    }
  }

  return issues;
};

export const readManifest = async (): Promise<LedgerManifest> => fs.readJson(manifestFile) as Promise<LedgerManifest>;

// The ledger an evaluation reads, refused unless it hashes to its manifest.
export const readVerifiedLedger = async (file = ledgerFile, manifestPath = manifestFile) => {
  const text = await fs.readFile(file, 'utf8');
  const manifest = (await fs.readJson(manifestPath)) as LedgerManifest;

  if (sha256(text) !== manifest.ledgerSha256) {
    throw new Error(
      `${file} hashes to ${sha256(text)}, not its manifest's ${manifest.ledgerSha256}; run \`npm run market-events -- verify\``
    );
  }

  return { text, rows: parseLedger(text, file), manifest, sha256: manifest.ledgerSha256 };
};
