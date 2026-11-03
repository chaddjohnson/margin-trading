// The final verdict record (PROTOCOL.md §12.2–12.3), from sealed records only (no data): each experiment's chained label
// from the sealed evaluation, the nominee rule applied to the sealed H picks in the parsimony order, and the statuses.
import fs from 'fs-extra';
import { resultFile } from './context.ts';
import { readSealed, writeSealed } from './records.ts';
import { floorsMet } from './verify.ts';

const parsimony = ['4B', '4C', '4D-A', '4D-B', '4D-C'];

export const runFinal = () => {
  const evaluation = readSealed<{
    rubric: Record<string, { label: string; criteria: Record<string, boolean | null> }>;
  }>(resultFile('evaluation', 'RECORD.json'));
  const hSelection = readSealed<{
    picks: Record<
      string,
      { pick: { evaluation: { minuteDD: number; dailyDD: number; feasible: boolean } } | null; noFill: boolean }
    >;
  }>(resultFile('selections', 'H', 'SELECTION.json'));
  const hSpec = readSealed<{ b5Development: { minuteDrawdown: { maximum: number } } }>(
    resultFile('H', 'SPEC', 'RECORD.json')
  );
  const qualified: string[] = [];
  const reasons: Record<string, string> = {};
  // V2 including H: every window's floors spent and selections sealed
  const completeness = floorsMet(['F20', 'F21', 'F22', 'F23', 'H']);
  const labels = Object.fromEntries(
    Object.entries(evaluation.rubric).map(([stage, verdict]) => [
      stage,
      completeness.ok ? verdict.label : 'invalid/incomplete'
    ])
  );

  for (const stage of parsimony) {
    const label = labels[stage] ?? 'missing';
    const h = hSelection.picks[stage];

    if (label !== 'historically promising but unvalidated') {
      reasons[stage] = `chained label: ${label}`;
      continue;
    }

    if (!h || h.noFill || !h.pick) {
      reasons[stage] = 'the H selection is no-fill';
      continue;
    }

    const e = h.pick.evaluation;
    const e3 = e.minuteDD <= Math.min(35000, hSpec.b5Development.minuteDrawdown.maximum + 5000) && e.dailyDD <= 30000;

    if (!e.feasible || !e3) {
      reasons[stage] = 'the H pick fails H feasibility or E3';
      continue;
    }

    qualified.push(stage);
    reasons[stage] = 'qualifies';
  }

  const file = resultFile('FINAL.json');

  if (fs.existsSync(file)) {
    throw new Error(`refused: ${file} is sealed`);
  }

  return writeSealed(file, {
    stage: 'FINAL',
    evaluationBodyHash: evaluation.bodyHash,
    hSelectionBodyHash: hSelection.bodyHash,
    labels,
    completeness,
    criteria: Object.fromEntries(
      Object.entries(evaluation.rubric).map(([stage, verdict]) => [stage, verdict.criteria])
    ),
    qualified,
    reasons,
    nominee: qualified[0] ?? null,
    statement:
      qualified.length > 0
        ? `${qualified.length} of ${parsimony.length} qualified; nominee ${qualified[0]} (its sealed H pick), for a separately authorised 2024–2025 validation only`
        : 'no nominee'
  });
};
