// The --phenotype command line, shared by every compatible strategy:
//   npm run app -- <strategy> <symbol> [partition] [start date] [end date] [data file] [output dir] [stop fill]
//     --phenotype <name> [--phenotype-file <path>] [--execution <profile>]
// The partition (training by default, holdout, final or all) or an explicit data file selects the dataset.
// src/app.ts hands a command to `runPhenotypeCli` only when it has a --phenotype or --phenotype-file flag, so
// every other command, and every strategy run without the flag, behaves exactly as before. The positional
// arguments keep their meaning in the strategy file; the two that set phenotype parameters (the trailing buy
// percentage and the intraday loss buffer) are refused alongside a phenotype.
import { expandDatasetArguments } from '#lib';
import { PhenotypeError } from './architectures.ts';
import { executePhenotypeRun, planPhenotypeRun } from './run.ts';
import { phenotypePositionals, positionalArguments } from './strategies.ts';

export { usesPhenotype } from './detect.ts';

export interface PhenotypeArguments {
  positional: string[];
  phenotype: string;
  phenotypeFile?: string;
  execution?: string;
}

const flags = { '--phenotype': 'phenotype', '--phenotype-file': 'phenotypeFile', '--execution': 'execution' } as const;

type FlagName = keyof typeof flags;

const isFlag = (arg: string): arg is FlagName => arg in flags;

export const parsePhenotypeArguments = (args: readonly string[]): PhenotypeArguments => {
  const positionalArgs: string[] = [];
  const values: Partial<Record<(typeof flags)[FlagName], string>> = {};

  for (let index = 0; index < args.length; index++) {
    const arg = args[index]!;

    if (!arg.startsWith('--')) {
      positionalArgs.push(arg);
      continue;
    }

    const [name, inline] = arg.includes('=')
      ? [arg.slice(0, arg.indexOf('=')), arg.slice(arg.indexOf('=') + 1)]
      : [arg];

    if (!isFlag(name!)) {
      throw new PhenotypeError(
        `Unknown option ${name} with --phenotype (options: ${Object.keys(flags).join(', ')}; the strategy's own arguments are positional)`
      );
    }

    const value = inline ?? args[index + 1];

    if (inline === undefined) {
      index++;
    }

    if (value === undefined || value === '' || value.startsWith('--')) {
      throw new PhenotypeError(`${name} needs a value`);
    }

    const key = flags[name];

    if (values[key] !== undefined) {
      throw new PhenotypeError(`${name} is given twice`);
    }

    values[key] = value;
  }

  // A dataset partition after the symbol moves into the data-file slot (src/lib/dataset.ts).
  let positional: string[];

  try {
    positional = expandDatasetArguments(positionalArgs);
  } catch (error) {
    throw new PhenotypeError((error as Error).message);
  }

  if (values.phenotype === undefined) {
    throw new PhenotypeError('--phenotype-file needs --phenotype <name> to pick a phenotype from the file');
  }

  if (positional.length > positionalArguments.length) {
    throw new PhenotypeError(
      `Too many positional arguments (${positional.length}); the strategy takes ${positionalArguments.join(', ')}`
    );
  }

  for (const [index, parameter] of Object.entries(phenotypePositionals)) {
    const value = positional[Number(index)];

    if (value !== undefined && value !== '-' && value !== '') {
      throw new PhenotypeError(
        `Positional argument ${Number(index) + 1} (${parameter} = ${value}) conflicts with --phenotype, which sets ${parameter}; drop it or pass '-'`
      );
    }
  }

  if (positional[0] === undefined || positional[0] === '-') {
    throw new PhenotypeError(
      'A symbol is required with --phenotype: npm run app -- <strategy> <symbol> --phenotype <name>'
    );
  }

  return {
    positional,
    phenotype: values.phenotype,
    phenotypeFile: values.phenotypeFile,
    execution: values.execution
  };
};

export const runPhenotypeCli = async (script: string, args: readonly string[]) => {
  try {
    const parsed = parsePhenotypeArguments(args);
    const [symbol, startDate, endDate, dataFile, outDir, stopFill] = parsed.positional;
    const plan = await planPhenotypeRun({
      script,
      symbol: symbol!,
      phenotype: parsed.phenotype,
      phenotypeFile: parsed.phenotypeFile,
      execution: parsed.execution,
      startDate,
      endDate,
      dataFile,
      outDir,
      stopFill
    });

    await executePhenotypeRun(plan);
  } catch (error) {
    if (error instanceof PhenotypeError) {
      console.error(`❌ Phenotype run refused: ${error.message}`);
      process.exit(1);
    }

    throw error;
  }
};
