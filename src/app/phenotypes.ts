// The phenotype registry utility:
//   npm run app -- phenotypes list              every phenotype file and its phenotypes
//   npm run app -- phenotypes validate          validate every phenotype file and execution profile, and derive
//                                               the injectable module of every compatible strategy (no backtest)
//   npm run app -- phenotypes matrix [file]     the compatibility matrix as Markdown, to the console or a file
// Running a strategy with a phenotype is `npm run app -- <strategy> <symbol> --phenotype <name>`
// (config/phenotypes/README.md).
import fs from 'fs-extra';
import { executionRoot, readExecutionProfile } from '../phenotype/execution.ts';
import { prepareStrategy } from '../phenotype/injection.ts';
import { matrixMarkdown } from '../phenotype/matrix.ts';
import { listPhenotypeFiles } from '../phenotype/phenotypes.ts';
import { compatibleStrategies } from '../phenotype/strategies.ts';

export default async (command = 'list', file?: string) => {
  if (command === 'matrix') {
    if (file) {
      await fs.writeFile(file, matrixMarkdown());
      console.info(`Wrote ${file}`);
    } else {
      console.info(matrixMarkdown());
    }

    return;
  }

  const files = await listPhenotypeFiles();

  if (command === 'list') {
    for (const phenotypeFile of files) {
      console.info(
        `${phenotypeFile.path} (${phenotypeFile.architecture.name} ${phenotypeFile.symbol}, execution ${phenotypeFile.execution})`
      );

      for (const phenotype of Object.values(phenotypeFile.phenotypes)) {
        console.info(
          `  ${phenotype.name}: ${phenotype.parameters.map((parameter) => `${parameter.spec.short} ${parameter.display}`).join(', ')}`
        );
      }
    }

    return;
  }

  if (command === 'validate') {
    const profiles = new Set(files.map((phenotypeFile) => phenotypeFile.execution));

    for (const entry of await fs.readdir(executionRoot)) {
      if (entry.endsWith('.json')) {
        profiles.add(entry.replace(/\.json$/, ''));
      }
    }

    for (const name of profiles) {
      await readExecutionProfile(name);
    }

    for (const entry of compatibleStrategies) {
      await prepareStrategy(entry);
    }

    const count = files.reduce((total, phenotypeFile) => total + Object.keys(phenotypeFile.phenotypes).length, 0);

    console.info(
      `✅ ${count} phenotypes in ${files.length} files, ${profiles.size} execution profiles and ${compatibleStrategies.length} compatible strategies are valid`
    );
    return;
  }

  throw new Error(`Unknown command '${command}': use list, validate or matrix [file]`);
};
