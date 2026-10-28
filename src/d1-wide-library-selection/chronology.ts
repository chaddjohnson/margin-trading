// The records' chronology (brief §10; PROTOCOL.md §8.2, §11): a report is refused unless every sealed evaluation was
// made from the current sealed SELECTION (same body hash) and the seals its door verified are still the current ones,
// started after that SELECTION and after every nested selection it depends on finished, and every nested selection
// was made from its sealed selection-window evaluation after that evaluation finished. Used by `analyze`, `tables`
// and `verify`; it reads sealed records only.
import fs from 'fs-extra';
import { tripleKeys } from './context.ts';
import { nestedSelectionFile, selectionFile } from './doors.ts';
import { type PhaseKey, evaluationFile, phaseKeys, phaseOf } from './evaluation.ts';
import { readSealed } from './records.ts';

export interface ChronologyCheck {
  name: string;
  pass: boolean;
  detail: string;
}

type Stamped = { bodyHash: string; startedAt: string; finishedAt: string };

const current = async (file: string) => ((await fs.pathExists(file)) ? await readSealed<Stamped>(file) : undefined);

export const chronologyChecks = async (): Promise<ChronologyCheck[]> => {
  const checks: ChronologyCheck[] = [];
  const add = (name: string, pass: boolean, detail = '') => checks.push({ name, pass, detail });

  for (const triple of tripleKeys) {
    const nested = await current(nestedSelectionFile(triple));

    if (!nested) {
      continue;
    }

    const record = nested as Stamped & { selectionWindow: { phase: PhaseKey; bodyHash: string } };
    const window = await current(evaluationFile(record.selectionWindow.phase));

    add(
      `${triple}: made from the current sealed ${record.selectionWindow.phase} evaluation`,
      window?.bodyHash === record.selectionWindow.bodyHash
    );
    add(`${triple}: made after that evaluation finished`, Boolean(window && record.startedAt > window.finishedAt));
  }

  for (const phase of phaseKeys) {
    const evaluation = await current(evaluationFile(phase));

    if (!evaluation) {
      continue;
    }

    const record = evaluation as Stamped & {
      selection: { bodyHash: string };
      door: { seals: { file: string; bodyHash: string }[] };
    };
    const spec = phaseOf(phase);
    const selection = await current(selectionFile(spec.fold));

    add(
      `${phase}: made from the current sealed SELECTION of fold ${spec.fold}`,
      selection?.bodyHash === record.selection.bodyHash
    );
    add(
      `${phase}: started after that SELECTION finished`,
      Boolean(selection && record.startedAt > selection.finishedAt)
    );

    for (const seal of record.door.seals) {
      const now = await current(seal.file);

      add(`${phase}: the seal ${seal.file} its door verified is still current`, now?.bodyHash === seal.bodyHash);
      add(`${phase}: started after ${seal.file} finished`, Boolean(now && record.startedAt > now.finishedAt));
    }

    for (const file of spec.requires) {
      const now = await current(file);

      add(
        `${phase}: started after its prerequisite ${file} finished`,
        Boolean(now && record.startedAt > now.finishedAt)
      );
    }
  }

  return checks;
};

export const requireChronology = async () => {
  const failed = (await chronologyChecks()).filter((check) => !check.pass);

  if (failed.length > 0) {
    throw new Error(
      `the records' chronology cannot be established:\n  ${failed.map((check) => check.name).join('\n  ')}`
    );
  }
};
