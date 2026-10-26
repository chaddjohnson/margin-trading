// The re-audit of the universe (PROTOCOL.md §4.2): the October 25 study's 64 candidates through its unchanged audit
// function (frozen rules D1–D5) on the current canonical files. The study proceeds only if eligibility, cohorts and
// every file and report hash equal that study's frozen universe record; any difference stops it (the data are never
// repaired). Nothing about strategy results enters.
import fs from 'fs-extra';
import { type SymbolAudit, auditSymbol } from '../d1-robust/audit.ts';
import {
  candidateUniverse,
  legacy,
  log,
  nowIso,
  readJson,
  stageDir,
  study,
  universeFile,
  writeJson
} from './context.ts';
import { protocolFreezeFile } from './context.ts';
import { codeState, requireCommitted } from './freeze.ts';

interface LegacyUniverse {
  eligible: string[];
  late: string[];
  excluded: string[];
  symbols: Record<string, SymbolAudit>;
}

export const runAudit = async () => {
  await requireCommitted();

  if (await fs.pathExists(protocolFreezeFile)) {
    throw new Error(`${protocolFreezeFile} exists: the universe record is frozen and never rewritten`);
  }

  const previous = await readJson<LegacyUniverse>(legacy.universeFile);
  const records: SymbolAudit[] = [];

  for (const symbol of candidateUniverse) {
    const record = await auditSymbol(symbol);

    records.push(record);
    log(`audit ${symbol}: ${record.cohort}${record.reasons.length ? ` — ${record.reasons.join('; ')}` : ''}`);
  }

  const eligible = records
    .filter((record) => record.eligible)
    .map((record) => record.symbol)
    .sort();
  const late = records
    .filter((record) => record.cohort === 'late')
    .map((record) => record.symbol)
    .sort();
  const excluded = records
    .filter((record) => record.cohort === 'excluded')
    .map((record) => record.symbol)
    .sort();
  const mismatches: string[] = [];
  const same = (a: readonly string[], b: readonly string[]) => [...a].sort().join(',') === [...b].sort().join(',');

  if (!same(eligible, previous.eligible)) {
    mismatches.push(`eligible: ${eligible.length} now vs ${previous.eligible.length} frozen`);
  }

  if (!same(late, previous.late) || !same(late, study.expectedLateCohort)) {
    mismatches.push(`late cohort: ${late.join(' ')}`);
  }

  if (!same(excluded, previous.excluded) || !same(excluded, study.expectedExcluded)) {
    mismatches.push(`excluded: ${excluded.join(' ')}`);
  }

  for (const record of records) {
    const old = previous.symbols[record.symbol];

    if (!old) {
      mismatches.push(`${record.symbol}: absent from the frozen record`);
      continue;
    }

    for (const field of [
      'dataSha256',
      'reportSha256',
      'cohort',
      'eligible',
      'sessions',
      'firstDate',
      'lastDate'
    ] as const) {
      if (JSON.stringify(old[field]) !== JSON.stringify(record[field])) {
        mismatches.push(`${record.symbol}.${field}: ${String(old[field])} → ${String(record[field])}`);
      }
    }
  }

  if (eligible.length !== study.expectedEligible) {
    mismatches.push(`expected ${study.expectedEligible} eligible, found ${eligible.length}`);
  }

  if (mismatches.length > 0) {
    await writeJson(stageDir('audit', 'reaudit-mismatch.json'), { generatedAt: nowIso(), mismatches });
    throw new Error(
      `The re-audit differs from the frozen universe (study stopped): ${mismatches.slice(0, 6).join('; ')}`
    );
  }

  const sessions = new Set(records.filter((record) => record.eligible).map((record) => record.sessions));

  await writeJson(universeFile, {
    generatedAt: nowIso(),
    codeState: await codeState(),
    rules: 'the October 25 study frozen rules D1–D5 (src/d1-robust/audit.ts, unchanged)',
    comparedWith: legacy.universeFile,
    identical: true,
    calendar: { first: study.firstSession, last: study.lastCommonSession, sessions: [...sessions][0] },
    eligible,
    late,
    excluded,
    symbols: Object.fromEntries(records.map((record) => [record.symbol, record]))
  });
  log(`re-audit: ${eligible.length} eligible, identical to the frozen record → ${universeFile}`);

  return { eligible, late, excluded };
};
