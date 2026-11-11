// The compute ledger (brief: a hard ceiling of 2,000,000 fresh backend simulations in all — pilot, bench, parity,
// centres, neighbours, earlier cutoffs, stresses, fold, diagnostic and validation runs; archive hits counted apart).
// Every job appends its fresh and archive-hit counts when it closes (a resumed job counts only its new evaluations);
// in-process runs append theirs. A job refuses to start unless the ledger plus its frozen worst-case cap stays within
// the ceiling (the resource guard; never a silent overrun).
import fs from 'node:fs';
import path from 'node:path';
import { hardCeiling, ledgerFile } from './context.ts';

export interface LedgerEntry {
  t?: string;
  job: string;
  door: string;
  fresh: number;
  hits: number;
  event?: string;
  kind?: string;
}

// GETF_LEDGER_FILE redirects the ledger (unit tests only).
const file = () => process.env.GETF_LEDGER_FILE ?? ledgerFile;

export const addToLedger = (e: LedgerEntry) => {
  fs.mkdirSync(path.dirname(file()), { recursive: true });
  fs.appendFileSync(file(), `${JSON.stringify({ t: new Date().toISOString(), ...e })}\n`);
};

export const ledgerEntries = (): LedgerEntry[] =>
  fs.existsSync(file())
    ? fs
        .readFileSync(file(), 'utf8')
        .trim()
        .split('\n')
        .filter(Boolean)
        .map((l) => JSON.parse(l) as LedgerEntry)
    : [];

export const ledgerTotal = () => {
  const es = ledgerEntries();

  return { fresh: es.reduce((a, e) => a + e.fresh, 0), hits: es.reduce((a, e) => a + e.hits, 0), entries: es.length };
};

export const assertWithinCeiling = (worstCase: number, what: string) => {
  const used = ledgerTotal().fresh;

  if (used + worstCase > hardCeiling)
    throw new Error(
      `resource guard: ${what} could need ${worstCase} fresh simulations; ${used} are spent of the ${hardCeiling} ceiling`
    );
  return used;
};
