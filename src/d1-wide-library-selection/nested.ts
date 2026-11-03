// The nested validation selector A4 (PROTOCOL.md §7, §8.3; LIBRARY_SELECTION_RULES.md §4 A4). For a triple, from the
// sealed selection-window evaluation only (T1: phase A, (2020-06-30, 2021-12-31]; T2: phase B-sel, (2021-12-31,
// 2022-12-30]): per pool, ETF and K, the A2(K) library member with the largest selection-window V among members with
// ≥ 1 lot entered in the window and a windowed minute drawdown ≤ $35,000, iff V > 0 (ties: T_nb, then key). Written
// once to results/nested/<T>/SELECTION.json before the evaluation door can open the later window.
import fs from 'fs-extra';
import { type TripleKey, libraryKs, log, nowIso, rules, study, triples } from './context.ts';
import { nestedSelectionFile } from './doors.ts';
import { type PhaseKey, evaluationFile, readFastRows } from './evaluation.ts';
import { readStageRecord, requireCodeFrozen } from './freeze.ts';
import { readSealed, sha256Json, writeRecord } from './records.ts';
import { acrossOf, readMembers, readSelection } from './selection.ts';

export const selectionPhaseOf = (triple: TripleKey): PhaseKey => (triple === 'T1' ? 'A' : 'B-sel');

export interface Pick {
  key: string;
  vSel: number;
  lotsSel: number;
  minuteDdSel: number;
  tnb: number;
  thinEvidence: boolean; // a single selection-window lot
}

export const runNestedSelection = async (tripleKey: TripleKey) => {
  const guard = await requireCodeFrozen();
  const triple = triples[tripleKey];
  const target = nestedSelectionFile(tripleKey);

  if (await fs.pathExists(target)) {
    throw new Error(`${target} exists: ${tripleKey}'s nested selection is sealed`);
  }

  const phase = selectionPhaseOf(tripleKey);
  const evaluation = await readStageRecord<{ bodyHash: string; end: string; starts: string[] }>(evaluationFile(phase));

  if (
    evaluation.end !== triple.selectionEnd ||
    evaluation.starts[0] !== (tripleKey === 'T1' ? '2020-06-30' : '2021-12-31')
  ) {
    throw new Error(`${tripleKey}: the selection-window evaluation ${phase} does not end at ${triple.selectionEnd}`);
  }

  const startedAt = nowIso();
  const selection = await readSelection(triple.fold);
  const fast = await readFastRows(phase);
  const picks: Record<string, Record<string, Record<string, Pick | null>>> = {};
  const eligible: Record<string, Record<string, Record<string, number>>> = {};
  const across: Record<string, Record<string, { symbol: string; key: string; score: number }[]>> = {};

  for (const pool of triple.pools) {
    const members = await readMembers(triple.fold, pool);

    picks[pool] = {};
    eligible[pool] = {};

    for (const [symbol, s] of Object.entries(selection.selections[pool]!)) {
      picks[pool]![symbol] = {};
      eligible[pool]![symbol] = {};

      for (const k of libraryKs) {
        const library = s.arms.A2.library.slice(0, k);
        const candidates = library.flatMap((key) => {
          const row = fast.get(`${symbol}|${key}`)?.[String(study.costBps)];

          if (!row) {
            throw new Error(`${tripleKey} ${pool} ${symbol} ${key}: no selection-window figure`);
          }

          const w = row.windows[0]!;
          const tnb = members[symbol]![key]!.tnb ?? NaN;

          return w.lots >= rules.a4MinLots && w.minuteDd <= rules.a4DdCeiling && w.v > 0
            ? [{ key, vSel: w.v, lotsSel: w.lots, minuteDdSel: w.minuteDd, tnb, thinEvidence: w.lots === 1 }]
            : [];
        });
        const best = [...candidates].sort((a, b) => b.vSel - a.vSel || b.tnb - a.tnb || (a.key < b.key ? -1 : 1))[0];

        picks[pool]![symbol]![String(k)] = best ?? null;
        eligible[pool]![symbol]![String(k)] = candidates.length;
      }
    }

    across[pool] = Object.fromEntries(
      libraryKs.map((k) => [
        String(k),
        acrossOf(
          Object.entries(picks[pool]!).flatMap(([symbol, byK]) => {
            const pick = byK[String(k)];

            return pick ? [{ symbol, key: pick.key, score: pick.vSel }] : [];
          })
        )
      ])
    );
  }

  log(`nested ${tripleKey}: picks from ${phase} sealed ${evaluation.bodyHash.slice(0, 12)}`);

  return writeRecord(target, {
    stage: 'nested-selection',
    triple: tripleKey,
    startedAt,
    finishedAt: nowIso(),
    guard,
    selectionWindow: { phase, record: evaluationFile(phase), bodyHash: evaluation.bodyHash, end: triple.selectionEnd },
    laterWindow: { start: triple.selectionEnd, end: triple.laterEnd, opened: false },
    rule: 'A2(K) library; max selection-window V with ≥ 1 lot entered and windowed minute DD ≤ $35,000; V > 0; ties T_nb, key',
    picks,
    eligible,
    across,
    picksDigest: sha256Json(picks)
  });
};
