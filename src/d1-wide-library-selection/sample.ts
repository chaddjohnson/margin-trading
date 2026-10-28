// The engine-versus-fast parity sample on training windows (PROTOCOL.md §8.1, brief §10.3), after the new searches
// and before any library: for every fold and ETF, a deterministic stratified sample — from the archive (folds A and
// B) the highest-J_s credible row and one hash-chosen row; from the new search one Sobol row and one refinement row
// (hash-chosen) — is re-run on the full N-book engine on the fold's training window and every stored training figure
// (trades, closed, open, net, best, worst, minute and daily drawdown, interest, friction) must agree to the cent.
// Any mismatch fails the stage (no library is built on a known-wrong fast path).
import { createHash } from 'node:crypto';
import fs from 'fs-extra';
import { executeSpec } from '../d1-standalone-opportunity-audit/run.ts';
import { type FoldKey, folds, log, nowIso, resultFile } from './context.ts';
import { readArchiveCandidates } from './archive.ts';
import { type Candidate, byJs } from './candidates.ts';
import { trainingUniverse } from './doors.ts';
import { engineSpec } from './engine.ts';
import { requireCodeFrozen } from './freeze.ts';
import { writeRecord } from './records.ts';
import { readSearchCandidates } from './search.ts';

export const sampleParityFile = (fold: FoldKey) => resultFile('parity', `SAMPLE_PARITY_${fold}.json`);

const pick = (list: readonly Candidate[], label: string) => {
  if (list.length === 0) {
    return undefined;
  }

  const index = createHash('sha256').update(label).digest().readUInt32LE(0) % list.length;

  return list[index];
};

// One fold at a time, after that fold's search and before its libraries (the calendar door orders the folds).
export const runSampleParity = async (fold: FoldKey) => {
  const guard = await requireCodeFrozen();
  const target = sampleParityFile(fold);

  if (await fs.pathExists(target)) {
    throw new Error(`${target} exists: the parity sample is written once`);
  }

  const startedAt = nowIso();
  let doorRecord: unknown;
  const checks: {
    fold: FoldKey;
    symbol: string;
    key: string;
    stratum: string;
    field: string;
    engine: number;
    fast: number;
    pass: boolean;
  }[] = [];

  {
    const spec = folds[fold];
    const { loaded, door } = await trainingUniverse(fold);

    doorRecord = door;
    const archive = spec.sourceWindow ? await readArchiveCandidates(spec.sourceWindow) : [];
    const fresh = await readSearchCandidates(fold);
    const symbols = Object.keys(loaded.universe.instruments).sort();

    for (const symbol of symbols) {
      const mine = archive.filter((c) => c.symbol === symbol);
      const ours = fresh.filter((c) => c.symbol === symbol);
      const sample: [string, Candidate | undefined][] = [
        ['archive top J_s credible', mine.filter((c) => c.credible).sort(byJs)[0]],
        ['archive hash-chosen', pick(mine, `${fold}|${symbol}|archive`)],
        [
          'new Sobol hash-chosen',
          pick(
            ours.filter((c) => c.stage === 'new-sobol'),
            `${fold}|${symbol}|sobol`
          )
        ],
        [
          'new refinement hash-chosen',
          pick(
            ours.filter((c) => c.stage === 'refine'),
            `${fold}|${symbol}|refine`
          )
        ]
      ];

      for (const [stratum, candidate] of sample) {
        if (!candidate) {
          continue;
        }

        const record = executeSpec(
          loaded.universe,
          engineSpec({
            key: `sample:${fold}:${symbol}:${candidate.key}`,
            subject: symbol,
            books: [{ symbol, grid: candidate.grid }]
          })
        );
        const v = record.view;
        const fields: [string, number, number][] = [
          ['trades', v.trades, candidate.trades],
          ['closed', v.closed, candidate.closed],
          ['open', v.open, candidate.open],
          ['net', v.net, candidate.net],
          ['best', v.bestTrade, candidate.best],
          ['worst', v.worstTrade, candidate.worst],
          ['minute DD', v.minuteDrawdown, candidate.dd],
          ['daily DD', v.dailyDrawdown, candidate.ddDaily],
          ['interest', v.interest, candidate.interest],
          ['friction', v.friction, candidate.friction]
        ];

        for (const [field, engine, stored] of fields) {
          const pass = (Number.isNaN(engine) && Number.isNaN(stored)) || Math.abs(engine - stored) <= 0.01;

          checks.push({ fold, symbol, key: candidate.key, stratum, field, engine, fast: stored, pass });
        }
      }
    }

    log(`sample parity ${fold}: ${checks.filter((c) => c.fold === fold).length} checks`);
  }

  const failed = checks.filter((c) => !c.pass);
  const record = await writeRecord(target, {
    stage: 'sample-parity',
    fold,
    door: doorRecord,
    startedAt,
    finishedAt: nowIso(),
    guard,
    vectors: new Set(checks.map((c) => `${c.fold}|${c.symbol}|${c.key}`)).size,
    checks: checks.length,
    failed: failed.length,
    failures: failed,
    strata: ['archive top J_s credible', 'archive hash-chosen', 'new Sobol hash-chosen', 'new refinement hash-chosen']
  });

  if (failed.length > 0) {
    throw new Error(`${failed.length} engine-versus-fast parity check(s) failed (fail closed)`);
  }

  return record;
};
