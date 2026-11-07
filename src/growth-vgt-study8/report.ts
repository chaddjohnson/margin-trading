// Report tables from the sealed records (report-only; outside the decision digest). Never opens a data door.
import fs from 'fs-extra';
import { frozenSelectionFile, resultFile } from './context.ts';
import { log } from './seal.ts';

export const runReport = async () => {
  const exists = await Promise.all(
    [
      resultFile('search', 'search.json'),
      resultFile('qualify', 'qualification.json'),
      frozenSelectionFile,
      resultFile('validation', 'validation.json')
    ].map((f) => fs.pathExists(f))
  );

  log(`report: sealed records present ${JSON.stringify(exists)}`);
};
