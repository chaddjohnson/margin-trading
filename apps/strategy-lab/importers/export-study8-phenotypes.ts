// Exports sealed Study 8 selections as frozen shared-slot pool phenotypes (a `strategy-lab.phenotype-export`
// directory) for the Strategy Lab catalogue. READ-ONLY towards Study 8: it resolves each alias with the unchanged
// Study 8 resolver (src/study8-runners/resolve.ts, which verifies the sealed records and the local hash chain) and
// records the sealed facts — nothing is re-ranked, re-selected or modified.
//
//   node --experimental-transform-types apps/strategy-lab/importers/export-study8-phenotypes.ts \
//     --out <new directory> s8-vg-balanced [more aliases…]
//
// Run from the repository root. Then: npm --prefix apps/strategy-lab run import:phenotypes -- <that directory>

import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { resolveAlias, sealedCostBps, sealedEnd } from '../../../src/study8-runners/resolve.ts';
import type { PhenotypeExport } from '../shared/phenotypes.ts';
import { sealRecord, writePhenotypeExport } from './phenotype-export.ts';

const STUDY = 'research/study8-expanded-regime-d1';
const SEALED = [
  `${STUDY}/FROZEN_SELECTION.json`,
  `${STUDY}/results/test/F24/test.json`,
  `${STUDY}/results/test/F24/test-lots.jsonl.gz`,
  `${STUDY}/results/chain.jsonl`
];
const sha = (file: string) => createHash('sha256').update(readFileSync(file)).digest('hex');

export async function study8PhenotypeExport(aliases: string[], repoRoot: string): Promise<PhenotypeExport> {
  const commit = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: repoRoot, encoding: 'utf8' }).trim();
  const phenotypes = [];
  for (const alias of aliases) {
    const r = await resolveAlias(alias);
    if (r.study8.kind === 'study7' || !r.sealed) throw new Error(`${alias}: not a sealed Study 8 selection`);
    const study8 = r.study8;
    phenotypes.push(
      sealRecord({
        id: `study8-expanded-regime-d1/${alias}`,
        version: 1,
        name: `Study 8 ${alias} — ${r.sealedId}`,
        role: study8.role ?? null,
        rank: r.rank ?? null,
        strategy: { key: 'study8-d1-pool', version: 'pools-engine' },
        executionKind: 'shared-slot pool',
        symbols: Object.keys(r.books).sort(),
        pool: {
          runner: 'study8',
          alias,
          sealedId: r.sealedId,
          config: { file: r.configFile, sha256: sha(resolve(repoRoot, r.configFile)) },
          books: r.books,
          fixedStart: '2016-01-04'
        },
        engine: { version: 'pools-engine', commit },
        execution: {
          notionalUsd: 100_000,
          annualInterestRate: 0.11,
          costBpsPerSide: sealedCostBps,
          stopFill: 'the stop price, or the gapped opening trade',
          capital: 'ONE shared funded $100,000 slot across the books (first executable signal wins, no preemption)'
        },
        data: {
          selectionWindow: { from: '2016-01-04', to: '2024-12-31' },
          testWindows: [{ label: 'F24 one-time test door (sealed)', from: '2025-01-02', to: sealedEnd }],
          exposure:
            'All of 2016-01-04 → 2026-10-29 had been inspected before Study 8 (PROTOCOL.md §3.4); 2025–2026 is EXPOSED. A rerun is an exploratory replay, never an independent holdout.'
        },
        selection: {
          method: 'Study 8 F24 training-only ranking and roles (FROZEN_SELECTION.json); one-time test gates may only veto',
          metrics: {
            sealedNetUsd: r.sealed.net,
            sealedMinuteDrawdownUsd: r.sealed.dd,
            sealedLots: r.sealed.lots,
            track: study8.track ?? null,
            trainingRank: study8.trainingRank ?? null,
            testStatus: study8.testStatus ?? null
          }
        },
        notes: r.spec.note
      })
    );
  }
  return {
    schema: 'strategy-lab.phenotype-export',
    schemaVersion: 1,
    study: {
      id: 'study8-expanded-regime-d1',
      title: 'Study 8 — expanded-regime stability-first D1 reoptimisation (sealed selections)',
      kind: 'sealed-study-selection',
      protocol: { path: `${STUDY}/PROTOCOL.md`, sha256: sha(resolve(repoRoot, `${STUDY}/PROTOCOL.md`)) },
      methodology: 'docs/strategy-lab/STUDY8_METHODOLOGY.md',
      sealedRecords: SEALED.map((path) => ({ path, sha256: sha(resolve(repoRoot, path)) })),
      dataExposure: 'All of 2016-01-04 → 2026-10-29 inspected before the study; 2025–2026 exposed (PROTOCOL.md §3.4).'
    },
    generatedAt: new Date().toISOString(),
    generator: { tool: 'apps/strategy-lab/importers/export-study8-phenotypes.ts', commit },
    phenotypes
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  const i = args.indexOf('--out');
  const out = i >= 0 ? args[i + 1] : undefined;
  const aliases = args.filter((a, k) => a !== '--out' && k !== i + 1);
  if (!out || aliases.length === 0) {
    console.error('usage: export-study8-phenotypes.ts --out <new dir> <alias…>');
    process.exit(2);
  }
  const repoRoot = resolve(import.meta.dirname, '..', '..', '..');
  const exp = await study8PhenotypeExport(aliases, repoRoot);
  console.log(JSON.stringify(writePhenotypeExport(resolve(out), exp), null, 2));
}
